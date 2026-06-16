// ============================================================
// Routes: Rankings
// ============================================================

'use strict';

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const db = require('../models/database');

const router = express.Router();

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
}

// GET /api/rankings - global top scores
router.get('/',
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('mode_id').optional().isInt({ min: 1 }),
    handleValidation,
    (req, res) => {
        try {
            const options = {
                limit:   Number(req.query.limit) || 10,
                mode_id: req.query.mode_id ? Number(req.query.mode_id) : undefined,
            };
            const rankings = db.getTopScores(options);
            res.json({ rankings, total: rankings.length });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// GET /api/rankings/player/:name - player stats
router.get('/player/:name',
    param('name').isString().trim().isLength({ min: 1, max: 64 }),
    handleValidation,
    (req, res) => {
        try {
            const stats = db.getPlayerStats(req.params.name);
            res.json({ player: req.params.name, stats });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

module.exports = router;
