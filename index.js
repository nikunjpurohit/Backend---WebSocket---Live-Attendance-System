import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import Redis from 'ioredis';

const app = express();
const port = process.env.PORT || 3000;

// Re-create __dirname syntax needed for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve standard files from current folder
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api', (req, res) => {
    res.send({ message: 'Hello from the HTTP server!' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ----------------------------------------------------
// Redis Setup
// ----------------------------------------------------
// Configure your Redis host/port via env vars or default to localhost:6379
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
};

// Redis requires separate client instances for publishing and subscribing
const pub = new Redis(redisConfig);
const sub = new Redis(redisConfig);

const CHAT_CHANNEL = 'chat_messages';

// Generate a unique ID for this specific server process
const SERVER_ID = `server_${Math.random().toString(36).substring(2, 9)}`;

// Subscribe to the Redis pub/sub channel
sub.subscribe(CHAT_CHANNEL, (err, count) => {
    if (err) {
        console.error('Failed to subscribe to Redis channel:', err);
    } else {
        console.log(`Subscribed to Redis channel '${CHAT_CHANNEL}'.`);
    }
});

// Listen for messages received from Redis
sub.on('message', (channel, message) => {
    if (channel === CHAT_CHANNEL) {
        try {
            const { senderServerId, senderWsId, data } = JSON.parse(message);

            // Broadcast the Redis message to all WebSocket clients connected to THIS server instance
            wss.clients.forEach((client) => {
                // Skip sending if the client is not in OPEN state or if it is the original sender
                if (client.readyState === 1 /* WebSocket.OPEN */ && client.id !== senderWsId) {
                    client.send(data);
                }
            });
        } catch (err) {
            console.error('Error parsing Redis message:', err);
        }
    }
});

// ----------------------------------------------------
// WebSocket Server Logic
// ----------------------------------------------------
wss.on('connection', (ws) => {
    console.log('New client connected!');

    // Attach a unique ID to each socket connection
    ws.id = Math.random().toString(36).substring(2, 9);
    
    ws.send('Welcome! You are now connected via WebSockets.');

    ws.on('message', (message) => {
        const messageStr = message.toString();
        console.log(`[${SERVER_ID}] Received message: ${messageStr}`);

        // Instead of broadcasting directly to local clients, publish to Redis
        const payload = JSON.stringify({
            senderServerId: SERVER_ID,
            senderWsId: ws.id,
            data: messageStr
        });

        pub.publish(CHAT_CHANNEL, payload);
    });

    ws.on('close', () => {
        console.log('Client disconnected.');
    });
});

// Clean up Redis connections on server shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await pub.quit();
    await sub.quit();
    process.exit(0);
});

server.listen(port, () => {
    console.log(`Server [${SERVER_ID}] running on http://localhost:${port}`);
});