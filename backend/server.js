// ============================================================
// FANCE Backend - Node.js/Express API Server
// Manages scores, game modes, rankings and ESP32 communication
// ============================================================

'use strict';

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const path       = require('path');
const http       = require('http');
const { WebSocketServer } = require('ws');
const rateLimit  = require('express-rate-limit');

const db         = require('./models/database');
const modesRouter   = require('./routes/modes');
const scoresRouter  = require('./routes/scores');
const rankingsRouter = require('./routes/rankings');
const espRouter     = require('./routes/esp');

const app  = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// Middleware
// ============================================================
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting for API routes (100 req / 15 min per IP)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// General rate limiter for all other routes (300 req / 15 min per IP)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(generalLimiter);

// Serve frontend build (production)
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuild));

// ============================================================
// API Routes
// ============================================================
app.use('/api/modes',    modesRouter);
app.use('/api/scores',   scoresRouter);
app.use('/api/rankings', rankingsRouter);
app.use('/api/esp',      espRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback for SPA
app.get('*', (req, res) => {
    const indexFile = path.join(frontendBuild, 'index.html');
    res.sendFile(indexFile, (err) => {
        if (err) res.status(200).json({ message: 'Fance API Server', version: '1.0.0' });
    });
});

// ============================================================
// WebSocket Server (for real-time ESP32 relay)
// ============================================================
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', message: 'Fance WebSocket' }));

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            // Relay messages from ESP32 to all browser clients
            broadcast(msg, ws);
        } catch (e) {
            // ignore
        }
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
});

function broadcast(data, exclude = null) {
    const msg = JSON.stringify(data);
    for (const client of clients) {
        if (client !== exclude && client.readyState === 1) {
            client.send(msg);
        }
    }
}

// Export for testing
app.broadcast = broadcast;

// ============================================================
// Start Server
// ============================================================
if (require.main === module) {
    db.initialize().then(() => {
        httpServer.listen(PORT, () => {
            console.log(`🤺 Fance Backend running on port ${PORT}`);
            console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
            console.log(`📊 API available at http://localhost:${PORT}/api`);
        });
    }).catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
}

module.exports = { app, httpServer };
