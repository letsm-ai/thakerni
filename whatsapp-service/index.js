const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8001';
const PORT = process.env.PORT || 3001;

let sock = null;
let qrCode = null;
let isConnected = false;
let connectedUser = null;

// Store user sessions
const userSessions = new Map();

async function initWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Letsm AI', 'Chrome', '1.0.0']
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCode = qr;
                console.log('QR Code generated - scan with WhatsApp');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                isConnected = false;
                connectedUser = null;
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed, reconnecting:', shouldReconnect);

                if (shouldReconnect) {
                    setTimeout(initWhatsApp, 5000);
                }
            } else if (connection === 'open') {
                console.log('WhatsApp connected successfully');
                isConnected = true;
                qrCode = null;
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
        console.error('WhatsApp initialization error:', error);
        setTimeout(initWhatsApp, 10000);
    }
}

async function handleIncomingMessage(message) {
    try {
        const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
        const messageText = message.message.conversation ||
                           message.message.extendedTextMessage?.text || '';

        console.log(`Received from ${phoneNumber}: ${messageText}`);

        // Process task commands
        const response = processTaskCommand(phoneNumber, messageText);

        // Send response back
        if (response) {
            await sendMessage(phoneNumber, response);
        }

    } catch (error) {
        console.error('Error handling incoming message:', error);
    }
}

function processTaskCommand(phoneNumber, messageText) {
    const text = messageText.toLowerCase().trim();

    // Help command
    if (text === 'help' || text === '?' || text === 'commands') {
        return `🤖 *Letsm AI WhatsApp Bot*

📝 *Task Commands:*
• \`create task: [description]\` - Create new task
• \`list tasks\` - Show pending tasks
• \`complete task [number]\` - Complete a task

🔔 *Reminder Commands:*
• \`remind me [description]\` - Set reminder
• \`list reminders\` - Show reminders

❓ *Other:*
• \`help\` - Show this menu

_Example: create task: buy groceries_`;
    }

    // Create task
    if (text.startsWith('create task:') || text.startsWith('add task:') || text.startsWith('task:')) {
        const taskDesc = messageText.split(':').slice(1).join(':').trim();
        if (taskDesc) {
            // Store task (in production, this would call the FastAPI backend)
            return `✅ Task created: *${taskDesc}*\n\n_Open the Letsm AI app to manage your tasks._`;
        }
        return '❌ Please provide a task description.\nExample: `create task: buy groceries`';
    }

    // List tasks
    if (text === 'list tasks' || text === 'show tasks' || text === 'my tasks') {
        return `📋 *Your Tasks*\n\n_To view and manage all your tasks, please open the Letsm AI app._\n\n🔗 Open: letsm.ai/dashboard/tasks`;
    }

    // Complete task
    if (text.startsWith('complete task') || text.startsWith('done task')) {
        const taskNum = text.match(/\d+/);
        if (taskNum) {
            return `✅ Task #${taskNum[0]} marked as complete!\n\n_View all tasks in the Letsm AI app._`;
        }
        return '❌ Please specify task number.\nExample: `complete task 1`';
    }

    // Remind me
    if (text.startsWith('remind me')) {
        const reminderText = messageText.substring(9).trim();
        if (reminderText) {
            return `🔔 Reminder set: *${reminderText}*\n\n_Manage reminders in the Letsm AI app._`;
        }
        return '❌ Please provide reminder details.\nExample: `remind me to call John at 3pm`';
    }

    // List reminders
    if (text === 'list reminders' || text === 'show reminders' || text === 'my reminders') {
        return `🔔 *Your Reminders*\n\n_To view and manage all reminders, please open the Letsm AI app._\n\n🔗 Open: letsm.ai/dashboard/reminders`;
    }

    // Default response
    return `👋 Hi! I'm Letsm AI assistant.\n\nSend \`help\` to see available commands.\n\n_Quick tip: Try \`create task: buy groceries\`_`;
}

async function sendMessage(phoneNumber, text) {
    try {
        if (!sock || !isConnected) {
            throw new Error('WhatsApp not connected');
        }

        const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text });
        console.log(`Sent to ${phoneNumber}: ${text.substring(0, 50)}...`);
        return { success: true };

    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}

// REST API endpoints
app.get('/qr', (req, res) => {
    res.json({ qr: qrCode || null });
});

app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        user: connectedUser ? {
            id: connectedUser.id,
            name: connectedUser.name
        } : null
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
        sock.logout();
        isConnected = false;
        connectedUser = null;
        qrCode = null;
    }
    res.json({ message: 'Disconnected' });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        whatsapp_connected: isConnected,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`WhatsApp service running on port ${PORT}`);
    console.log('Initializing WhatsApp connection...');
    initWhatsApp();
});
