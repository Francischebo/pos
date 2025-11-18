const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// WebSocket server
const wss = new WebSocketServer({ port: 8081 });
console.log('WebSocket server listening on ws://localhost:8081');

wss.on('connection', (ws) => {
    console.log('Client connected to WS');
    ws.send(JSON.stringify({ type: 'connected', message: 'Welcome cashier client' }));
});

// HTTP endpoint to receive notifications from PHP backend
app.post('/notify', (req, res) => {
    try {
        const data = req.body; // Expect { checkoutRequestID, merchantRequestID, phone, amount, status, ... }
        // Broadcast to all connected clients
        const payload = JSON.stringify({ type: 'mpesa_payment', data });
        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send(payload);
            }
        });
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.listen(3001, () => {
    console.log('Notifier HTTP server running on http://localhost:3001');
});