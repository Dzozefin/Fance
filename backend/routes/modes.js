// ============================================================
// Routes: Game Modes
// ============================================================

'use strict';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../models/database');

const router = express.Router();

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
}

// GET /api/modes - list all modes
router.get('/', (req, res) => {
    try {
        const modes = db.getAllModes();
        res.json({ modes, total: modes.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/modes/:id
router.get('/:id',
    param('id').isInt({ min: 1 }),
    handleValidation,
    (req, res) => {
        try {
            const mode = db.getModeById(Number(req.params.id));
            if (!mode) return res.status(404).json({ error: 'Mode not found' });
            res.json(mode);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// POST /api/modes - create custom mode
router.post('/',
    body('name').isString().trim().isLength({ min: 1, max: 64 }),
    body('description').optional().isString().trim().isLength({ max: 256 }),
    body('type').isString().isIn(['quick_hits','slow_hits','training','sequential','random',
                                   'endurance','blitz','precision','countdown','relay','survival','reaction','custom']),
    body('duration_sec').isInt({ min: 0, max: 600 }),
    body('led_interval_ms').isInt({ min: 100, max: 10000 }),
    body('target_points').optional().isInt({ min: 0, max: 8 }),
    body('lives').optional().isInt({ min: 0, max: 10 }),
    handleValidation,
    (req, res) => {
        try {
            const data = {
                name:           req.body.name,
                description:    req.body.description || '',
                type:           req.body.type,
                duration_sec:   req.body.duration_sec,
                led_interval_ms:req.body.led_interval_ms,
                target_points:  req.body.target_points || 0,
                lives:          req.body.lives || 0,
            };
            const mode = db.createMode(data);
            res.status(201).json(mode);
        } catch (err) {
            if (err.message && err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'A mode with this name already exists' });
            }
            res.status(500).json({ error: err.message });
        }
    }
);

// PUT /api/modes/:id - update custom mode
router.put('/:id',
    param('id').isInt({ min: 1 }),
    body('name').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('description').optional().isString().trim().isLength({ max: 256 }),
    body('type').optional().isString(),
    body('duration_sec').optional().isInt({ min: 0, max: 600 }),
    body('led_interval_ms').optional().isInt({ min: 100, max: 10000 }),
    body('target_points').optional().isInt({ min: 0, max: 8 }),
    body('lives').optional().isInt({ min: 0, max: 10 }),
    handleValidation,
    (req, res) => {
        try {
            const existing = db.getModeById(Number(req.params.id));
            if (!existing) return res.status(404).json({ error: 'Mode not found' });
            if (!existing.is_custom) return res.status(403).json({ error: 'Cannot modify built-in modes' });

            const data = {
                name:           req.body.name            || existing.name,
                description:    req.body.description     ?? existing.description,
                type:           req.body.type            || existing.type,
                duration_sec:   req.body.duration_sec    ?? existing.duration_sec,
                led_interval_ms:req.body.led_interval_ms ?? existing.led_interval_ms,
                target_points:  req.body.target_points   ?? existing.target_points,
                lives:          req.body.lives           ?? existing.lives,
            };
            const updated = db.updateMode(Number(req.params.id), data);
            res.json(updated);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// DELETE /api/modes/:id - delete custom mode
router.delete('/:id',
    param('id').isInt({ min: 1 }),
    handleValidation,
    (req, res) => {
        try {
            const existing = db.getModeById(Number(req.params.id));
            if (!existing) return res.status(404).json({ error: 'Mode not found' });
            if (!existing.is_custom) return res.status(403).json({ error: 'Cannot delete built-in modes' });

            const deleted = db.deleteMode(Number(req.params.id));
            if (!deleted) return res.status(404).json({ error: 'Mode not found' });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

module.exports = router;
