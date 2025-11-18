const WebSocket = require('ws');
const url = process.env.WS_URL || 'ws://localhost:8082';
console.log('Connecting to', url);
const ws = new WebSocket(url);
ws.on('open', () => {
    console.log('Test client connected');
});
ws.on('message', (msg) => {
    console.log('Test client received:', msg.toString());
});
ws.on('close', () => console.log('Test client disconnected'));
ws.on('error', (err) => console.error('Test client error', err));
// keep alive
setInterval(() => {}, 1000);