// ============================================================
// Database initialization and queries (sql.js - pure JavaScript SQLite)
// Data is persisted to a binary file on disk after each write.
// ============================================================

'use strict';

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'fance.db');

let db  = null;  // sql.js Database instance
let SQL = null;  // sql.js module

// ============================================================
// Internal helpers (synchronous after init)
// ============================================================
function persist() {
    if (!db) return;
    try {
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
        console.error('DB persist error:', e.message);
    }
}

function run(sql, params = []) {
    db.run(sql, params);
    persist();
}

function get(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return undefined;
}

function all(sql, params = []) {
    const results = [];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function lastInsertRowid() {
    const row = get('SELECT last_insert_rowid() AS id');
    return row ? row.id : null;
}

// ============================================================
// Public: initialize (must be called before use)
// Returns a Promise that resolves once the DB is ready.
// ============================================================
async function initialize() {
    if (db) return db;

    const initSqlJs = require('sql.js');
    SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');

    db.run(`
        CREATE TABLE IF NOT EXISTS game_modes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE,
            description TEXT    DEFAULT '',
            type        TEXT    NOT NULL DEFAULT 'quick_hits',
            duration_sec INTEGER NOT NULL DEFAULT 60,
            led_interval_ms INTEGER NOT NULL DEFAULT 500,
            target_points INTEGER NOT NULL DEFAULT 0,
            lives       INTEGER NOT NULL DEFAULT 0,
            is_custom   INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT    DEFAULT (datetime('now')),
            updated_at  TEXT    DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS scores (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name     TEXT    DEFAULT 'Player',
            mode_id         INTEGER REFERENCES game_modes(id) ON DELETE SET NULL,
            mode_name       TEXT    NOT NULL,
            score           INTEGER NOT NULL DEFAULT 0,
            duration_ms     INTEGER NOT NULL DEFAULT 0,
            avg_reaction_ms INTEGER NOT NULL DEFAULT 0,
            played_at       TEXT    DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS players (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE,
            created_at  TEXT    DEFAULT (datetime('now'))
        )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_scores_played_at ON scores(played_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scores_mode_id   ON scores(mode_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scores_player    ON scores(player_name)`);

    const count = get('SELECT COUNT(*) as c FROM game_modes WHERE is_custom = 0');
    if (!count || count.c === 0) {
        seedDefaultModes();
    }

    persist();
    console.log('Database initialized at', DB_PATH);
    return db;
}

// ============================================================
// Seed default modes
// ============================================================
function seedDefaultModes() {
    const modes = [
        { name: 'Szybkie Trafienia 1min', description: '1 minuta - LEDy na przemian', type: 'quick_hits', duration_sec: 60, led_interval_ms: 500, target_points: 0, lives: 0 },
        { name: 'Szybkie Trafienia 3min', description: '3 minuty - LEDy na przemian', type: 'quick_hits', duration_sec: 180, led_interval_ms: 500, target_points: 0, lives: 0 },
        { name: 'Szybkie Trafienia 5min', description: '5 minut - LEDy na przemian', type: 'quick_hits', duration_sec: 300, led_interval_ms: 500, target_points: 0, lives: 0 },
        { name: 'Wolne Trafienia', description: 'Zacznij wolno, przyspiesz - LEDy zwiększają tempo', type: 'slow_hits', duration_sec: 120, led_interval_ms: 1500, target_points: 0, lives: 0 },
        { name: 'Trening', description: 'Bez limitu czasu - ćwicz trafienia', type: 'training', duration_sec: 0, led_interval_ms: 800, target_points: 8, lives: 0 },
        { name: 'Sekwencyjne', description: 'Traf przyciski w kolejności 1-8', type: 'sequential', duration_sec: 60, led_interval_ms: 600, target_points: 8, lives: 0 },
        { name: 'Losowe 1min', description: 'Losowy LED co sekundę - 1 minuta', type: 'random', duration_sec: 60, led_interval_ms: 1000, target_points: 0, lives: 0 },
        { name: 'Losowe Szybkie', description: 'Losowy LED co 500ms - maksymalna szybkość', type: 'random', duration_sec: 30, led_interval_ms: 500, target_points: 0, lives: 0 },
        { name: 'Wytrzymałościowe', description: '10 minut - zbierz jak najwięcej punktów', type: 'endurance', duration_sec: 600, led_interval_ms: 800, target_points: 0, lives: 0 },
        { name: 'Blitz 20s', description: '20 sekund intensywne trafienia', type: 'blitz', duration_sec: 20, led_interval_ms: 300, target_points: 0, lives: 0 },
        { name: 'Precyzja', description: 'Traf dokładnie wskazane punkty', type: 'precision', duration_sec: 90, led_interval_ms: 700, target_points: 8, lives: 0 },
        { name: 'Odliczanie', description: 'Zaczynasz od 8 punktów i schodzisz do 1', type: 'countdown', duration_sec: 60, led_interval_ms: 600, target_points: 8, lives: 0 },
        { name: 'Relay', description: 'Trafienia na przemian lewa/prawa strona', type: 'relay', duration_sec: 120, led_interval_ms: 500, target_points: 0, lives: 0 },
        { name: 'Survival', description: '3 życia - nie chyb! Każde pudło = utrata życia', type: 'survival', duration_sec: 0, led_interval_ms: 800, target_points: 0, lives: 3 },
        { name: 'Test Reakcji', description: 'Zmierz czas reakcji na losowy sygnał', type: 'reaction', duration_sec: 30, led_interval_ms: 0, target_points: 0, lives: 0 },
    ];

    for (const m of modes) {
        db.run(
            `INSERT OR IGNORE INTO game_modes
             (name, description, type, duration_sec, led_interval_ms, target_points, lives, is_custom)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [m.name, m.description, m.type, m.duration_sec, m.led_interval_ms, m.target_points, m.lives]
        );
    }
    persist();
    console.log('Default game modes seeded.');
}

// ============================================================
// Mode Queries
// ============================================================
function getAllModes() {
    return all('SELECT * FROM game_modes ORDER BY is_custom ASC, id ASC');
}

function getModeById(id) {
    return get('SELECT * FROM game_modes WHERE id = ?', [id]);
}

function createMode(data) {
    db.run(
        `INSERT INTO game_modes (name, description, type, duration_sec, led_interval_ms, target_points, lives, is_custom)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [data.name, data.description, data.type, data.duration_sec,
         data.led_interval_ms, data.target_points, data.lives]
    );
    const id = lastInsertRowid();
    persist();
    return getModeById(id);
}

function updateMode(id, data) {
    db.run(
        `UPDATE game_modes SET name=?, description=?, type=?, duration_sec=?,
         led_interval_ms=?, target_points=?, lives=?, updated_at=datetime('now')
         WHERE id=? AND is_custom=1`,
        [data.name, data.description, data.type, data.duration_sec,
         data.led_interval_ms, data.target_points, data.lives, id]
    );
    persist();
    return getModeById(id);
}

function deleteMode(id) {
    db.run('DELETE FROM game_modes WHERE id=? AND is_custom=1', [id]);
    persist();
    // changes() not available in sql.js; check if row still exists
    return !getModeById(id);
}

// ============================================================
// Score Queries
// ============================================================
function getAllScores({ limit = 50, offset = 0, player_name, mode_id } = {}) {
    let query  = 'SELECT * FROM scores WHERE 1=1';
    const params = [];
    if (player_name) { query += ' AND player_name = ?'; params.push(player_name); }
    if (mode_id)     { query += ' AND mode_id = ?';     params.push(mode_id); }
    query += ' ORDER BY played_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return all(query, params);
}

function getScoreById(id) {
    return get('SELECT * FROM scores WHERE id = ?', [id]);
}

function createScore(data) {
    db.run(
        `INSERT INTO scores (player_name, mode_id, mode_name, score, duration_ms, avg_reaction_ms)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.player_name, data.mode_id || null, data.mode_name,
         data.score, data.duration_ms, data.avg_reaction_ms || 0]
    );
    const id = lastInsertRowid();
    persist();
    return getScoreById(id);
}

function deleteScore(id) {
    const exists = getScoreById(id);
    if (!exists) return false;
    db.run('DELETE FROM scores WHERE id=?', [id]);
    persist();
    return true;
}

// ============================================================
// Ranking Queries
// ============================================================
function getTopScores({ limit = 10, mode_id } = {}) {
    let query = `
        SELECT player_name, mode_name, MAX(score) as best_score,
               MIN(avg_reaction_ms) as best_reaction_ms,
               COUNT(*) as games_played
        FROM scores WHERE 1=1
    `;
    const params = [];
    if (mode_id) { query += ' AND mode_id = ?'; params.push(mode_id); }
    query += ' GROUP BY player_name, mode_name ORDER BY best_score DESC LIMIT ?';
    params.push(limit);
    return all(query, params);
}

function getPlayerStats(player_name) {
    return get(
        `SELECT
            COUNT(*)                    AS games_played,
            MAX(score)                  AS best_score,
            AVG(score)                  AS avg_score,
            MIN(avg_reaction_ms)        AS best_reaction_ms,
            AVG(avg_reaction_ms)        AS avg_reaction_ms,
            SUM(duration_ms) / 1000     AS total_seconds
         FROM scores WHERE player_name = ?`,
        [player_name]
    );
}

module.exports = {
    initialize,
    getDb: () => db,
    getAllModes,
    getModeById,
    createMode,
    updateMode,
    deleteMode,
    getAllScores,
    getScoreById,
    createScore,
    deleteScore,
    getTopScores,
    getPlayerStats,
};

