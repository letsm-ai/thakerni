const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');

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
                    // Skip status broadcasts and group messages
                    const jid = message.key.remoteJid || '';
                    if (jid === 'status@broadcast' || jid.endsWith('@g.us') || jid.endsWith('@newsletter')) {
                        continue;
                    }
                    // Process private chat messages (including from self for testing)
                    if (message.message) {
                        await handleIncomingMessage(message);
                    }
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
        const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
        const messageText = message.message.conversation ||
                           message.message.extendedTextMessage?.text || '';
        console.log(`Received from ${phoneNumber}: ${messageText}`);

        if (!messageText.trim()) return;

        // Check for basic help command first
        const text = messageText.toLowerCase().trim();
        if (text === 'help' || text === '?' || text === 'commands') {
            const helpText = `*Letsm AI WhatsApp Bot*\n\nSend me any message and I'll help you with tasks, reminders, scheduling, and more!\n\n*Examples:*\n- Remind me to call Ahmed at 3pm\n- Create a task to review budget\n- What should I do today?\n- Help me plan my week\n\nI understand English and Arabic!`;
            await sendMessage(phoneNumber, helpText);
            return;
        }

        // Forward to AI backend
        try {
            const response = await axios.post(`${FASTAPI_URL}/api/whatsapp/ai`, {
                phone_number: phoneNumber,
                message: messageText
            }, { timeout: 30000 });

            if (response.data && response.data.response) {
                await sendMessage(phoneNumber, response.data.response);
            } else {
                await sendMessage(phoneNumber, "I'm processing your request. Please try again in a moment.");
            }
        } catch (aiError) {
            console.error('AI backend error:', aiError.message);
            // Fallback to basic response
            await sendMessage(phoneNumber, "I'm having trouble connecting to the AI service right now. Send *help* to see available commands.");
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
