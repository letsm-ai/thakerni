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
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';

let sock = null;
let qrCode = null;
let isConnected = false;
let connectedUser = null;
let isInitializing = false;
let qrTimestamp = null;
let lastError = null;

async function initWhatsApp() {
    if (isInitializing) {
        console.log('Already initializing, skipping...');
        return;
    }
    isInitializing = true;
    lastError = null;

    try {
        if (sock) {
            try { sock.end(); } catch(e) {}
            sock = null;
        }

        qrCode = null;
        qrTimestamp = null;

        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        const { version } = await fetchLatestBaileysVersion();
        console.log('Using WA version:', version);

        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            browser: ['Letsm AI', 'Chrome', '1.0.0']
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCode = qr;
                qrTimestamp = Date.now();
                console.log('QR Code generated - ready for scanning');
            }

            if (connection === 'close') {
                isConnected = false;
                isInitializing = false;
                connectedUser = null;
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed, statusCode:', statusCode, 'reconnecting:', shouldReconnect);
                
                if (statusCode === 405) {
                    lastError = 'WhatsApp version mismatch. Retrying with latest version...';
                    // Clear auth and retry
                    try { fs.rmSync('auth_info', { recursive: true, force: true }); } catch(e) {}
                    setTimeout(initWhatsApp, 3000);
                } else if (shouldReconnect) {
                    setTimeout(initWhatsApp, 5000);
                } else {
                    try { fs.rmSync('auth_info', { recursive: true, force: true }); } catch(e) {}
                    lastError = 'Logged out. Click Connect to generate a new QR code.';
                }
            } else if (connection === 'open') {
                console.log('WhatsApp connected successfully');
                isConnected = true;
                isInitializing = false;
                qrCode = null;
                qrTimestamp = null;
                lastError = null;
                connectedUser = sock.user;
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const message of messages) {
                    const jid = message.key.remoteJid || '';
                    const fromMe = message.key.fromMe;
                    
                    // Skip status broadcasts, groups, newsletters
                    if (jid === 'status@broadcast' || jid.endsWith('@g.us') || jid.endsWith('@newsletter')) {
                        continue;
                    }
                    
                    // Only respond to owner's own messages (self-chat)
                    // Self-chat appears as: fromMe=true with jid being owner's LID or phone number
                    if (!fromMe || !message.message) {
                        continue;
                    }
                    
                    // Check if this is self-chat (owner's LID or owner's phone number)
                    const ownerNum = connectedUser?.id?.split(':')[0] || '';
                    const ownerLid = connectedUser?.lid?.split(':')[0] || '';
                    const jidBase = jid.split('@')[0].split(':')[0];
                    
                    const isSelfChat = (jidBase === ownerNum) || (ownerLid && jidBase === ownerLid);
                    
                    console.log(`[MSG] jid=${jid} | jidBase=${jidBase} | ownerNum=${ownerNum} | ownerLid=${ownerLid} | isSelfChat=${isSelfChat}`);
                    
                    if (!isSelfChat) {
                        continue;
                    }
                    
                    console.log(`[SELF-CHAT] Processing message from owner`);
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
        // For self-chat: use the owner's phone number, not LID
        const ownerNum = connectedUser?.id?.split(':')[0] || rawJid.replace('@s.whatsapp.net', '').replace('@lid', '');
        const phoneNumber = ownerNum;
        // Reply to the same jid the message came from
        const replyJid = rawJid;
        let messageText = message.message.conversation ||
                           message.message.extendedTextMessage?.text || '';
        
        // Handle voice/audio messages
        const audioMsg = message.message.audioMessage;
        if (audioMsg) {
            console.log(`Received voice message from ${phoneNumber}, transcribing...`);
            try {
                // Download the audio
                const buffer = await downloadMediaMessage(message, 'buffer', {});
                
                // Save to temp file
                const tmpFile = path.join(os.tmpdir(), `wa_voice_${Date.now()}.ogg`);
                fs.writeFileSync(tmpFile, buffer);
                
                // Send to backend for transcription
                const form = new FormData();
                form.append('file', fs.createReadStream(tmpFile), { filename: 'voice.ogg', contentType: 'audio/ogg' });
                
                const transcribeRes = await axios.post(`${FASTAPI_URL}/api/whatsapp/transcribe`, form, {
                    headers: form.getHeaders(),
                    timeout: 30000
                });
                
                // Clean up temp file
                fs.unlinkSync(tmpFile);
                
                if (transcribeRes.data && transcribeRes.data.success && transcribeRes.data.text) {
                    messageText = transcribeRes.data.text;
                    console.log(`Transcribed: ${messageText}`);
                } else {
                    await sendMessage(replyJid, "عذراً، ما قدرت أفهم الرسالة الصوتية. حاول مرة ثانية أو أرسل نص.");
                    return;
                }
            } catch (voiceErr) {
                console.error('Voice transcription error:', voiceErr.message);
                await sendMessage(replyJid, "عذراً، حدث خطأ في معالجة الرسالة الصوتية. أرسل رسالة نصية.");
                return;
            }
        }
        
        console.log(`Received from ${phoneNumber}: ${messageText}`);

        if (!messageText.trim()) return;

        // Check for basic help command first
        const text = messageText.toLowerCase().trim();
        if (text === 'help' || text === '?' || text === 'commands') {
            const helpText = `*Letsm AI WhatsApp Bot*\n\nSend me any message and I'll help you with tasks, reminders, scheduling, and more!\n\n*Examples:*\n- Remind me to call Ahmed at 3pm\n- Create a task to review budget\n- What should I do today?\n- Help me plan my week\n\nI understand English and Arabic!`;
            await sendMessage(replyJid, helpText);
            return;
        }

        // Forward to AI backend
        try {
            const response = await axios.post(`${FASTAPI_URL}/api/whatsapp/ai`, {
                phone_number: phoneNumber,
                message: messageText
            }, { timeout: 30000 });

            if (response.data && response.data.response) {
                await sendMessage(replyJid, response.data.response);
            } else {
                await sendMessage(replyJid, "I'm processing your request. Please try again in a moment.");
            }
        } catch (aiError) {
            console.error('AI backend error:', aiError.message);
            await sendMessage(replyJid, "عذراً، حدث خطأ. حاول مرة ثانية.");
        }
    } catch (error) {
        console.error('Error handling incoming message:', error);
    }
}

// Keep help command for offline fallback
function getHelpText() {
    return `*Letsm AI WhatsApp Bot*\n\nSend me any message and I'll help you!\n\nSend *help* to see this menu.`;
}

async function sendMessage(phoneNumber, text) {
    try {
        if (!sock || !isConnected) throw new Error('WhatsApp not connected');
        const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text });
        return { success: true };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}

// REST API endpoints
app.get('/qr', (req, res) => {
    const qrAge = qrTimestamp ? (Date.now() - qrTimestamp) / 1000 : null;
    res.json({
        qr: qrCode || null,
        age_seconds: qrAge,
        expired: qrAge ? qrAge > 60 : false
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
    if (isConnected) {
        return res.json({ message: 'Already connected', connected: true });
    }

    try { fs.rmSync('auth_info', { recursive: true, force: true }); } catch(e) {}
    qrCode = null;
    qrTimestamp = null;
    isInitializing = false;
    lastError = null;

    initWhatsApp();

    let waited = 0;
    while (!qrCode && waited < 15000) {
        await new Promise(r => setTimeout(r, 500));
        waited += 500;
    }

    res.json({
        message: qrCode ? 'QR code generated' : 'Initializing connection, poll /qr for updates',
        qr: qrCode || null,
        initializing: isInitializing,
        error: lastError
    });
});

app.post('/send', async (req, res) => {
    const { phone_number, message } = req.body;
    if (!phone_number || !message) {
        return res.status(400).json({ error: 'phone_number and message required' });
    }
    const result = await sendMessage(phone_number, message);
    res.json(result);
});

app.post('/disconnect', (req, res) => {
    if (sock) {
        try { sock.logout(); } catch(e) {}
        isConnected = false;
        connectedUser = null;
        qrCode = null;
        qrTimestamp = null;
        lastError = null;
    }
    res.json({ message: 'Disconnected' });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        whatsapp_connected: isConnected,
        initializing: isInitializing,
        has_qr: !!qrCode,
        error: lastError,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`WhatsApp service running on port ${PORT}`);
    console.log('Initializing WhatsApp connection...');
    initWhatsApp();
});
