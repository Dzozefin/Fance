// ============================================================
// Backend API Tests
// ============================================================

'use strict';

const request = require('supertest');

// ============================================================
// Mock the entire database module so no real DB is needed
// ============================================================
const mockModes = [
    { id: 1, name: 'Szybkie Trafienia 1min', description: '1 min', type: 'quick_hits', duration_sec: 60, led_interval_ms: 500, target_points: 0, lives: 0, is_custom: 0 },
    { id: 2, name: 'Trening', description: 'Trening', type: 'training', duration_sec: 0, led_interval_ms: 800, target_points: 8, lives: 0, is_custom: 0 },
];

const mockScores = [
    { id: 1, player_name: 'Anna', mode_id: 1, mode_name: 'Szybkie Trafienia 1min', score: 5, duration_ms: 60000, avg_reaction_ms: 320, played_at: '2024-01-01 10:00:00' },
];

const mockRankings = [
    { player_name: 'Anna', mode_name: 'Szybkie Trafienia 1min', best_score: 5, best_reaction_ms: 320, games_played: 1 },
];

jest.mock('../models/database', () => ({
    initialize:     jest.fn().mockResolvedValue(true),
    getAllModes:     jest.fn().mockReturnValue(mockModes),
    getModeById:    jest.fn().mockImplementation((id) => mockModes.find(m => m.id === Number(id)) || undefined),
    createMode:     jest.fn().mockReturnValue({ id: 99, name: 'New Mode', is_custom: 1 }),
    updateMode:     jest.fn().mockReturnValue({ id: 99, name: 'Updated', is_custom: 1 }),
    deleteMode:     jest.fn().mockReturnValue(true),
    getAllScores:    jest.fn().mockReturnValue(mockScores),
    getScoreById:   jest.fn().mockImplementation((id) => mockScores.find(s => s.id === Number(id)) || undefined),
    createScore:    jest.fn().mockReturnValue({ id: 99, score: 5, mode_name: 'Test' }),
    deleteScore:    jest.fn().mockReturnValue(true),
    getTopScores:   jest.fn().mockReturnValue(mockRankings),
    getPlayerStats: jest.fn().mockReturnValue({ games_played: 1, best_score: 5, avg_score: 5, best_reaction_ms: 320, avg_reaction_ms: 320, total_seconds: 60 }),
}));

let app;
beforeAll(() => {
    const { app: a } = require('../server');
    app = a;
});

// ============================================================
// Health Check
// ============================================================
describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.timestamp).toBeDefined();
    });
});

// ============================================================
// Modes API
// ============================================================
describe('GET /api/modes', () => {
    it('returns modes array', async () => {
        const res = await request(app).get('/api/modes');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('modes');
        expect(Array.isArray(res.body.modes)).toBe(true);
        expect(res.body.modes.length).toBeGreaterThan(0);
    });
});

describe('GET /api/modes/:id', () => {
    it('returns a specific mode', async () => {
        const res = await request(app).get('/api/modes/1');
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(1);
    });

    it('returns 404 for non-existent mode', async () => {
        const db = require('../models/database');
        db.getModeById.mockReturnValueOnce(undefined);
        const res = await request(app).get('/api/modes/999');
        expect(res.status).toBe(404);
    });

    it('rejects non-integer id', async () => {
        const res = await request(app).get('/api/modes/abc');
        expect(res.status).toBe(400);
    });
});

describe('POST /api/modes', () => {
    it('creates a custom mode successfully', async () => {
        const res = await request(app)
            .post('/api/modes')
            .send({
                name:            'Test Mode',
                description:     'Test description',
                type:            'quick_hits',
                duration_sec:    60,
                led_interval_ms: 500,
                target_points:   0,
                lives:           0,
            });
        expect(res.status).toBe(201);
    });

    it('rejects mode with missing name', async () => {
        const res = await request(app)
            .post('/api/modes')
            .send({
                type:            'quick_hits',
                duration_sec:    60,
                led_interval_ms: 500,
            });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    it('rejects invalid mode type', async () => {
        const res = await request(app)
            .post('/api/modes')
            .send({
                name:            'Bad Type',
                type:            'invalid_type',
                duration_sec:    60,
                led_interval_ms: 500,
            });
        expect(res.status).toBe(400);
    });

    it('rejects duration_sec out of range', async () => {
        const res = await request(app)
            .post('/api/modes')
            .send({
                name:            'Too Long',
                type:            'quick_hits',
                duration_sec:    9999,
                led_interval_ms: 500,
            });
        expect(res.status).toBe(400);
    });
});

describe('PUT /api/modes/:id', () => {
    it('rejects updating a built-in mode', async () => {
        // Mode id 1 is not custom (is_custom = 0)
        const res = await request(app)
            .put('/api/modes/1')
            .send({ name: 'Updated' });
        expect(res.status).toBe(403);
    });

    it('rejects non-integer id', async () => {
        const res = await request(app).put('/api/modes/abc').send({ name: 'x' });
        expect(res.status).toBe(400);
    });
});

describe('DELETE /api/modes/:id', () => {
    it('rejects deleting a built-in mode', async () => {
        const res = await request(app).delete('/api/modes/1');
        expect(res.status).toBe(403);
    });

    it('rejects non-integer id', async () => {
        const res = await request(app).delete('/api/modes/abc');
        expect(res.status).toBe(400);
    });
});

// ============================================================
// Scores API
// ============================================================
describe('GET /api/scores', () => {
    it('returns scores array', async () => {
        const res = await request(app).get('/api/scores');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('scores');
        expect(Array.isArray(res.body.scores)).toBe(true);
    });

    it('accepts limit and offset parameters', async () => {
        const res = await request(app).get('/api/scores?limit=5&offset=0');
        expect(res.status).toBe(200);
    });

    it('rejects invalid limit', async () => {
        const res = await request(app).get('/api/scores?limit=999');
        expect(res.status).toBe(400);
    });
});

describe('POST /api/scores', () => {
    it('creates a score successfully', async () => {
        const res = await request(app)
            .post('/api/scores')
            .send({
                player_name:     'Anna',
                mode_name:       'Szybkie Trafienia 1min',
                score:           5,
                duration_ms:     60000,
                avg_reaction_ms: 320,
            });
        expect(res.status).toBe(201);
    });

    it('uses default player name when not provided', async () => {
        const res = await request(app)
            .post('/api/scores')
            .send({
                mode_name:   'Test',
                score:       3,
                duration_ms: 30000,
            });
        expect(res.status).toBe(201);
    });

    it('rejects score without mode_name', async () => {
        const res = await request(app)
            .post('/api/scores')
            .send({
                score:       5,
                duration_ms: 60000,
            });
        expect(res.status).toBe(400);
    });

    it('rejects negative score', async () => {
        const res = await request(app)
            .post('/api/scores')
            .send({
                mode_name:   'Test',
                score:       -1,
                duration_ms: 60000,
            });
        expect(res.status).toBe(400);
    });
});

describe('DELETE /api/scores/:id', () => {
    it('deletes an existing score', async () => {
        const res = await request(app).delete('/api/scores/1');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('returns 404 for non-existent score', async () => {
        const db = require('../models/database');
        db.deleteScore.mockReturnValueOnce(false);
        const res = await request(app).delete('/api/scores/999');
        expect(res.status).toBe(404);
    });
});

// ============================================================
// Rankings API
// ============================================================
describe('GET /api/rankings', () => {
    it('returns rankings array', async () => {
        const res = await request(app).get('/api/rankings');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('rankings');
        expect(Array.isArray(res.body.rankings)).toBe(true);
    });

    it('accepts limit parameter', async () => {
        const res = await request(app).get('/api/rankings?limit=5');
        expect(res.status).toBe(200);
    });

    it('rejects limit over 100', async () => {
        const res = await request(app).get('/api/rankings?limit=999');
        expect(res.status).toBe(400);
    });
});

describe('GET /api/rankings/player/:name', () => {
    it('returns player stats', async () => {
        const res = await request(app).get('/api/rankings/player/Anna');
        expect(res.status).toBe(200);
        expect(res.body.player).toBe('Anna');
        expect(res.body).toHaveProperty('stats');
    });
});

// ============================================================
// ESP Relay API
// ============================================================
describe('ESP relay endpoints', () => {
    it('POST /api/esp/status accepts status updates', async () => {
        const res = await request(app)
            .post('/api/esp/status')
            .send({ score: 3, game_running: true, mode_name: 'Test' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('GET /api/esp/status returns last status', async () => {
        await request(app)
            .post('/api/esp/status')
            .send({ score: 5, game_running: false, mode_name: 'Test' });
        const res = await request(app).get('/api/esp/status');
        expect(res.status).toBe(200);
    });

    it('POST /api/esp/command queues a command', async () => {
        const res = await request(app)
            .post('/api/esp/command')
            .send({ command: 'start', params: {} });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('POST /api/esp/command rejects missing command', async () => {
        const res = await request(app)
            .post('/api/esp/command')
            .send({ params: {} });
        expect(res.status).toBe(400);
    });

    it('GET /api/esp/command returns and clears commands', async () => {
        await request(app)
            .post('/api/esp/command')
            .send({ command: 'reset' });
        const res = await request(app).get('/api/esp/command');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.commands)).toBe(true);
    });
});

