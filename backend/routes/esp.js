// ============================================================
// Routes: ESP32 Communication Relay
// POST /api/esp/status  - ESP32 pushes its status here
// GET  /api/esp/command - ESP32 polls for pending commands
// POST /api/esp/command - App sends command to ESP32
// ============================================================

'use strict';

const express = require('express');
const router = express.Router();

let pendingCommands = [];
let lastEspStatus   = null;

// ESP32 pushes its current status
router.post('/status', (req, res) => {
    lastEspStatus = { ...req.body, received_at: new Date().toISOString() };
    // Auto-save score if game just ended
    if (req.body.game_ended && req.body.score !== undefined) {
        try {
            const db = require('../models/database');
            db.createScore({
                player_name:     req.body.player_name || 'ESP32',
                mode_id:         null,
                mode_name:       req.body.mode_name || 'Unknown',
                score:           req.body.score,
                duration_ms:     req.body.duration_ms || 0,
                avg_reaction_ms: req.body.avg_reaction_ms || 0,
            });
        } catch (e) {
            // Non-fatal
        }
    }
    res.json({ success: true, commands: pendingCommands.splice(0) });
});

// App gets last known ESP32 status
router.get('/status', (req, res) => {
    res.json(lastEspStatus || { status: 'unknown' });
});

// App sends command to ESP32 (ESP32 polls /api/esp/command)
router.post('/command', (req, res) => {
    const { command, params } = req.body;
    if (!command) return res.status(400).json({ error: 'command is required' });
    pendingCommands.push({ command, params: params || {}, queued_at: new Date().toISOString() });
    res.json({ success: true, queued: pendingCommands.length });
});

// ESP32 polls for commands
router.get('/command', (req, res) => {
    res.json({ commands: pendingCommands.splice(0) });
});

module.exports = router;
