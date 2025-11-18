// --- NODE.JS WEBSOCKET & NOTIFICATION SERVER ---

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

// --- WebSocket Server Setup (for Frontend) ---
// Use 8082 by default to avoid conflicts on development machines
const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 8082;
const server = http.createServer(express());
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('[WebSocket] ✅ Client connected.');

    ws.on('message', (message) => {
        // This POS doesn't expect messages from clients, but you can handle them here if needed.
        console.log(`[WebSocket] Received message: ${message}`);
    });

    ws.on('close', () => {
        console.log('[WebSocket] ❌ Client disconnected.');
    });

    ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
    });
});

server.listen(wsPort, () => {
    console.log(`🚀 WebSocket server is listening on ws://localhost:${wsPort}`);
});

// --- HTTP Notification Server Setup (for PHP Backend) ---
// Use 3010 by default to avoid conflicts with frontend dev server
const httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 3010;
const app = express();
app.use(express.json());
app.use(cors()); // Allow requests from any origin

/**
 * Endpoint for the PHP backend to post M-Pesa callback data.
 * This server will then broadcast it to all connected frontend clients.
 */
app.post('/notify', (req, res) => {
    const paymentUpdate = req.body;
    console.log(`[HTTP /notify] 📩 Received payment update:`, paymentUpdate);

    // Broadcast the update to all connected WebSocket clients
    if (wss.clients.size > 0) {
        wss.clients.forEach((client) => {
            if (client.readyState === require('ws').OPEN) {
                client.send(JSON.stringify(paymentUpdate));
            }
        });
        console.log(`[WebSocket] 📡 Broadcasted update to ${wss.clients.size} client(s).`);
        res.status(200).json({ status: 'success', message: 'Notification broadcasted.' });
    } else {
        console.log('[WebSocket] ⚠️ No clients connected to broadcast to.');
        res.status(200).json({ status: 'warning', message: 'No clients connected.' });
    }
});

app.listen(httpPort, () => {
    console.log(`🚀 HTTP notification server is listening on http://localhost:${httpPort}`);
});