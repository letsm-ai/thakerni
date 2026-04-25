const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001'; // Same container in production

let sock = null;
let qrCode = null;
let isConnected = false;
let connectedUser = null;
let isInitializing = false;
let qrTimestamp = null;
let lastError = null;

// Cache for linking codes: { code: { user_id, expires } }
const linkingCodes = new Map();

async function initWhatsApp() {
    if (isInitializing) {
        console.log('Already initializing, skipping...');
        return;
    }
    isInitializing = true;

    try {
        const { version } = await fetchLatestBaileysVersion();
        console.log('Using WA version:', version);

        const authDir = path.join(__dirname, 'auth_info');
        if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
        const { state, saveCreds } = await useMultiFileAuthState(authDir);

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            browser: ['Letsm AI', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 250,
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                qrCode = qr;
                qrTimestamp = Date.now();
                console.log('New QR code received');
            }
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                isConnected = false;
                isInitializing = false;
                if (shouldReconnect) {
                    console.log('Connection lost, reconnecting...');
                    setTimeout(initWhatsApp, 5000);
                } else {
                    console.log('Logged out, clearing auth...');
                    const authDir = path.join(__dirname, 'auth_info');
                    if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true });
                }
            }
            if (connection === 'open') {
                console.log('WhatsApp connected successfully');
                isConnected = true;
                isInitializing = false;
                qrCode = null;
                qrTimestamp = null;
                lastError = null;
                connectedUser = sock.user;
            }
        });

        // Handle ALL incoming messages from any user
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const message of messages) {
                    const jid = message.key.remoteJid || '';

                    // Skip status broadcasts, groups, newsletters
                    if (jid === 'status@broadcast' || jid.endsWith('@g.us') || jid.endsWith('@newsletter')) {
                        continue;
                    }

                    // Only process messages FROM others (not from the bot itself)
                    if (message.key.fromMe || !message.message) {
                        continue;
                    }

                    console.log(`[INCOMING] from jid=${jid}`);
                    await handleIncomingMessage(message);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('WhatsApp initialization error:', error.message);
        lastError = error.message;
        isInitializing = false;
        setTimeout(initWhatsApp, 10000);
    }
}

async function handleIncomingMessage(message) {
    try {
        const rawJid = message.key.remoteJid;
        // Extract phone number from jid (handle both @s.whatsapp.net and @lid)
        const senderNumber = rawJid.replace('@s.whatsapp.net', '').replace('@lid', '').split(':')[0];
        const replyJid = rawJid;

        let messageText = message.message.conversation ||
                           message.message.extendedTextMessage?.text || '';

        // Handle voice/audio messages
        const audioMsg = message.message.audioMessage;
        if (audioMsg) {
            console.log(`[VOICE] from ${senderNumber}, transcribing...`);
            try {
                const buffer = await downloadMediaMessage(message, 'buffer', {});
                const tmpFile = path.join(os.tmpdir(), `wa_voice_${Date.now()}.ogg`);
                fs.writeFileSync(tmpFile, buffer);

                const form = new FormData();
                form.append('file', fs.createReadStream(tmpFile), { filename: 'voice.ogg', contentType: 'audio/ogg' });

                const transcribeRes = await axios.post(`${FASTAPI_URL}/api/whatsapp/transcribe`, form, {
                    headers: form.getHeaders(),
                    timeout: 30000
                });

                fs.unlinkSync(tmpFile);

                if (transcribeRes.data?.success && transcribeRes.data?.text) {
                    messageText = transcribeRes.data.text;
                    console.log(`[VOICE] Transcribed: ${messageText}`);
                } else {
                    await sendMessage(replyJid, "عذراً، ما قدرت أفهم الرسالة الصوتية. حاول مرة ثانية أو أرسل نص. 🎤");
                    return;
                }
            } catch (voiceErr) {
                console.error('[VOICE] Error:', voiceErr.message);
                await sendMessage(replyJid, "عذراً، حدث خطأ في معالجة الرسالة الصوتية. أرسل رسالة نصية.");
                return;
            }
        }

        if (!messageText.trim()) return;
        console.log(`[MSG] from ${senderNumber}: ${messageText}`);

        // Check if this is a linking code
        const trimmed = messageText.trim();
        if (trimmed.startsWith('LINK-') && trimmed.length <= 15) {
            await handleLinkingCode(senderNumber, replyJid, trimmed);
            return;
        }

        // Forward to AI backend (backend handles user verification & rate limits)
        try {
            const response = await axios.post(`${FASTAPI_URL}/api/whatsapp/ai`, {
                phone_number: senderNumber,
                message: messageText
            }, { timeout: 30000 });

            if (response.data?.response) {
                await sendMessage(replyJid, response.data.response);
            }
            if (response.data?.blocked) {
                // User not registered or rate limited - backend handled the message
                return;
            }
        } catch (aiError) {
            console.error('[AI] Error:', aiError.message);
            await sendMessage(replyJid, "عذراً، حدث خطأ. حاول مرة ثانية. 🔄");
        }
    } catch (error) {
        console.error('[ERROR] handleIncomingMessage:', error);
    }
}

async function handleLinkingCode(senderNumber, replyJid, code) {
    console.log(`[LINK] Attempting to link ${senderNumber} with code ${code}`);
    try {
        const response = await axios.post(`${FASTAPI_URL}/api/whatsapp/verify-link`, {
            phone_number: senderNumber,
            code: code
        }, { timeout: 10000 });

        if (response.data?.success) {
            await sendMessage(replyJid, `✅ *تم الربط بنجاح!*\n\nمرحباً ${response.data.user_name || ''}! أنا مساعدك الذكي Letsm AI.\n\nأرسل لي أي رسالة نصية أو صوتية وسأساعدك. 🚀\n\nجرّب:\n- "ذكرني اتصل بأحمد الساعة 3"\n- "أنشئ مهمة مراجعة التقرير"\n- أو أي سؤال!`);
        } else {
            await sendMessage(replyJid, `❌ *كود غير صالح أو منتهي.*\n\nتأكد من الكود في تطبيق Letsm AI وحاول مرة ثانية.`);
        }
    } catch (err) {
        console.error('[LINK] Error:', err.message);
        await sendMessage(replyJid, `❌ حدث خطأ. حاول مرة ثانية.`);
    }
}

async function sendMessage(jid, text) {
    try {
        if (!sock || !isConnected) throw new Error('WhatsApp not connected');
        const targetJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
        await sock.sendMessage(targetJid, { text });
        return { success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}

// ── REST API ──

app.get('/qr', (req, res) => {
    const qrAge = qrTimestamp ? (Date.now() - qrTimestamp) / 1000 : null;
    res.json({
        qr: qrCode,
        timestamp: qrTimestamp,
        age_seconds: qrAge,
        message: qrCode ? 'Scan this QR code with WhatsApp on the BOT phone' : 'No QR code available'
    });
});

app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        initializing: isInitializing,
        has_qr: !!qrCode,
        error: lastError,
        user: connectedUser ? { id: connectedUser.id, name: connectedUser.name } : null
    });
});

app.post('/connect', async (req, res) => {
    try {
        if (isConnected) return res.json({ success: true, message: 'Already connected' });
        await initWhatsApp();
        res.json({ success: true, message: 'Connecting...' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
            sock = null;
        }
        isConnected = false;
        connectedUser = null;
        const authDir = path.join(__dirname, 'auth_info');
        if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true });
        res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/send', async (req, res) => {
    const { phone, message: msgText } = req.body;
    if (!phone || !msgText) return res.status(400).json({ error: 'phone and message required' });
    const result = await sendMessage(phone, msgText);
    res.json(result);
});

app.listen(PORT, () => {
    console.log(`WhatsApp service running on port ${PORT}`);
    initWhatsApp();
});
