// ============================================================
// Routes: Scores
// ============================================================

'use strict';

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../models/database');

const router = express.Router();

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
}

// GET /api/scores - list scores with optional filters
router.get('/',
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
    query('player_name').optional().isString().trim(),
    query('mode_id').optional().isInt({ min: 1 }),
    handleValidation,
    (req, res) => {
        try {
            const options = {
                limit:       Number(req.query.limit)  || 50,
                offset:      Number(req.query.offset) || 0,
                player_name: req.query.player_name    || undefined,
                mode_id:     req.query.mode_id        ? Number(req.query.mode_id) : undefined,
            };
            const scores = db.getAllScores(options);
            res.json({ scores, total: scores.length });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// GET /api/scores/:id
router.get('/:id',
    param('id').isInt({ min: 1 }),
    handleValidation,
    (req, res) => {
        try {
            const score = db.getScoreById(Number(req.params.id));
            if (!score) return res.status(404).json({ error: 'Score not found' });
            res.json(score);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// POST /api/scores - record a new score
router.post('/',
    body('player_name').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('mode_id').optional().isInt({ min: 1 }),
    body('mode_name').isString().trim().isLength({ min: 1, max: 64 }),
    body('score').isInt({ min: 0 }),
    body('duration_ms').isInt({ min: 0 }),
    body('avg_reaction_ms').optional().isInt({ min: 0 }),
    handleValidation,
    (req, res) => {
        try {
            const data = {
                player_name:     req.body.player_name    || 'Player',
                mode_id:         req.body.mode_id        || null,
                mode_name:       req.body.mode_name,
                score:           req.body.score,
                duration_ms:     req.body.duration_ms,
                avg_reaction_ms: req.body.avg_reaction_ms || 0,
            };
            const record = db.createScore(data);
            res.status(201).json(record);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// DELETE /api/scores/:id
router.delete('/:id',
    param('id').isInt({ min: 1 }),
    handleValidation,
    (req, res) => {
        try {
            const deleted = db.deleteScore(Number(req.params.id));
            if (!deleted) return res.status(404).json({ error: 'Score not found' });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

module.exports = router;
