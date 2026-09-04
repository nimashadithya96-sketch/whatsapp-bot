const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ==========================================
// CONFIGURATIONS & STATE
// ==========================================
const SOURCE_GROUP = '120363403992185882@g.us';
const DESTINATION_GROUP = '120363429095796308@g.us';

let isBotActive = true; 
let connectionStatus = 'DISCONNECTED';

// ==========================================
// WHATSAPP CLIENT SETUP
// ==========================================
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'adil-whatsapp-bot'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('📱 QR Code received, scan it using your phone:');
    connectionStatus = 'QR_READY';
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('🔐 WhatsApp authenticated successfully!');
    connectionStatus = 'AUTHENTICATED';
});

client.on('ready', () => {
    console.log('✅ WhatsApp connected and READY!');
    connectionStatus = 'CONNECTED';
});

client.on('auth_failure', (msg) => {
    console.log('❌ Authentication failed:', msg);
    connectionStatus = 'AUTH_FAILED';
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp disconnected:', reason);
    connectionStatus = 'DISCONNECTED';
});

// ==========================================
// MESSAGE FORWARDING LOGIC
// ==========================================
client.on('message', async (message) => {
    if (!isBotActive) return;

    try {
        if (message.from !== SOURCE_GROUP) return;
        if (message.type !== 'chat') return;

        const text = (message.body || '').trim();
        if (!text) return;

        const hasCoinPair = /coin\s*pair\s*:/i.test(text);
        if (!hasCoinPair) return;

        const hasExchange = /exchange\s*:/i.test(text);
        const hasSignalType = /signal\s*type/i.test(text);
        const hasEntry = /entry\s*:/i.test(text);
        const hasStopLoss = /stop\s*loss\s*:/i.test(text);

        const signalFields = [
            hasExchange,
            hasSignalType,
            hasEntry,
            hasStopLoss
        ].filter(Boolean).length;

        if (signalFields < 2) return;

        console.log('🎯 SIGNAL DETECTED! Forwarding...');
        await client.sendMessage(DESTINATION_GROUP, text);
        console.log('✅ Signal forwarded successfully!');

    } catch (error) {
        console.log('❌ Forwarding error:', error);
    }
});

client.initialize();

// ==========================================
// WEB DASHBOARD
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Signal Bot Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 40px; }
                .card { background: #1e293b; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); max-width: 400px; width: 100%; }
                h2 { color: #38bdf8; margin-bottom: 20px; }
                .status { font-size: 16px; margin: 15px 0; font-weight: bold; }
                .btn { padding: 12px 25px; font-size: 16px; border: none; border-radius: 6px; cursor: pointer; color: white; margin: 10px; font-weight: bold; width: 120px; }
                .btn-on { background: #22c55e; }
                .btn-off { background: #ef4444; }
                .btn:hover { opacity: 0.9; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>🤖 Signal Bot Control</h2>
                <p class="status">Bot State: <span style="color: ${isBotActive ? '#22c55e' : '#ef4444'}">${isBotActive ? 'ACTIVE (ON)' : 'INACTIVE (OFF)'}</span></p>
                <p class="status">Connection: <span style="color: #38bdf8">${connectionStatus}</span></p>
                <div>
                    <button class="btn btn-on" onclick="toggle('on')">TURN ON</button>
                    <button class="btn btn-off" onclick="toggle('off')">TURN OFF</button>
                </div>
            </div>
            <script>
                async function toggle(action) {
                    const res = await fetch('/api/' + action, { method: 'POST' });
                    const data = await res.json();
                    alert(data.message);
                    location.reload();
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/api/on', (req, res) => {
    isBotActive = true;
    console.log('🟢 Bot turned ON via Web');
    res.json({ success: true, message: 'Bot turned ON!' });
});

app.post('/api/off', (req, res) => {
    isBotActive = false;
    console.log('🔴 Bot turned OFF via Web');
    res.json({ success: true, message: 'Bot turned OFF!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});