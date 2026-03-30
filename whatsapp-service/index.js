const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

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
                    if (!message.key.fromMe && message.message) {
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
        const response = processTaskCommand(phoneNumber, messageText);
        if (response) {
            await sendMessage(phoneNumber, response);
        }
    } catch (error) {
        console.error('Error handling incoming message:', error);
    }
}

function processTaskCommand(phoneNumber, messageText) {
    const text = messageText.toLowerCase().trim();

    if (text === 'help' || text === '?' || text === 'commands') {
        return `*Letsm AI WhatsApp Bot*\n\n*Task Commands:*\n- create task: [description]\n- list tasks\n- complete task [number]\n\n*Reminder Commands:*\n- remind me [description]\n- list reminders\n\nSend help to see this menu`;
    }

    if (text.startsWith('create task:') || text.startsWith('add task:') || text.startsWith('task:')) {
        const taskDesc = messageText.split(':').slice(1).join(':').trim();
        if (taskDesc) return `Task created: *${taskDesc}*\n\nOpen Letsm AI app to manage tasks.`;
        return 'Please provide a task description.\nExample: create task: buy groceries';
    }

    if (text === 'list tasks' || text === 'show tasks' || text === 'my tasks') {
        return `*Your Tasks*\n\nOpen the Letsm AI app to view and manage all tasks.`;
    }

    if (text.startsWith('complete task') || text.startsWith('done task')) {
        const taskNum = text.match(/\d+/);
        if (taskNum) return `Task #${taskNum[0]} marked as complete!`;
        return 'Please specify task number.\nExample: complete task 1';
    }

    if (text.startsWith('remind me')) {
        const reminderText = messageText.substring(9).trim();
        if (reminderText) return `Reminder set: *${reminderText}*\n\nManage reminders in Letsm AI app.`;
        return 'Please provide reminder details.\nExample: remind me to call John at 3pm';
    }

    if (text === 'list reminders' || text === 'show reminders' || text === 'my reminders') {
        return `*Your Reminders*\n\nOpen Letsm AI app to view and manage reminders.`;
    }

    return `Hi! I'm Letsm AI assistant.\n\nSend *help* to see available commands.`;
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
