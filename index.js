import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const app = express();
const port = 3000;

// Re-create __dirname syntax needed for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve standard files (like CSS or JS) from the current folder
app.use(express.static(__dirname));

// Explicitly serve your index.html at the root path '/'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Regular Express HTTP route
app.get('/api', (req, res) => {
    res.send({ message: 'Hello from the HTTP server!' });
});

// Create the HTTP server using the Express app
const server = http.createServer(app);

// Attach the WebSocket server to the existing HTTP server
const wss = new WebSocketServer({ server });

// Listen for new client connections
wss.on('connection', (ws) => {
    console.log('New client connected!');
    ws.send('Welcome! You are now connected via WebSockets.');

    // Listen for incoming messages from this specific client
    ws.on('message', (message) => {
        // message is a Buffer by default, convert to string
        console.log(`Received message from client: ${message.toString()}`);
        ws.send(`Server received: ${message.toString()}`);
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client has disconnected.');
    });
});

// Start the unified HTTP & WebSocket server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});