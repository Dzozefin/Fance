-- ============================================================
-- FANCE - Fencing Scoreboard Database Schema
-- Compatible with: SQLite (ESP32 NVS/SPIFFS), PostgreSQL, MySQL
-- ============================================================

-- ============================================================
-- Game Modes
-- ============================================================
CREATE TABLE IF NOT EXISTS game_modes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    description     TEXT    DEFAULT '',
    type            TEXT    NOT NULL DEFAULT 'quick_hits',
                    -- quick_hits | slow_hits | training | sequential | random
                    -- endurance | blitz | precision | countdown | relay
                    -- survival | reaction | custom
    duration_sec    INTEGER NOT NULL DEFAULT 60,  -- 0 = no limit
    led_interval_ms INTEGER NOT NULL DEFAULT 500, -- LED change interval
    target_points   INTEGER NOT NULL DEFAULT 0,   -- 0 = time-based win
    lives           INTEGER NOT NULL DEFAULT 0,   -- 0 = unlimited
    is_custom       INTEGER NOT NULL DEFAULT 0,   -- 1 = user-created
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
);

-- ============================================================
-- Players
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    created_at  TEXT    DEFAULT (datetime('now'))
);

-- ============================================================
-- Scores / Game History
-- ============================================================
CREATE TABLE IF NOT EXISTS scores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name     TEXT    DEFAULT 'Player',
    mode_id         INTEGER REFERENCES game_modes(id) ON DELETE SET NULL,
    mode_name       TEXT    NOT NULL,
    score           INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER NOT NULL DEFAULT 0,
    avg_reaction_ms INTEGER NOT NULL DEFAULT 0,
    played_at       TEXT    DEFAULT (datetime('now'))
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_scores_played_at ON scores(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_mode_id   ON scores(mode_id);
CREATE INDEX IF NOT EXISTS idx_scores_player    ON scores(player_name);

-- ============================================================
-- Default Game Modes (15 built-in modes)
-- ============================================================
INSERT OR IGNORE INTO game_modes (name, description, type, duration_sec, led_interval_ms, target_points, lives, is_custom) VALUES
    ('Szybkie Trafienia 1min',  '1 minuta - LEDy na przemian, traf jak najszybciej',              'quick_hits',  60,  500,  0, 0, 0),
    ('Szybkie Trafienia 3min',  '3 minuty - LEDy na przemian, zbierz punkty',                     'quick_hits',  180, 500,  0, 0, 0),
    ('Szybkie Trafienia 5min',  '5 minut - LEDy na przemian',                                     'quick_hits',  300, 500,  0, 0, 0),
    ('Wolne Trafienia',         'Zacznij wolno, przyspiesz - LEDy zwiększają tempo',               'slow_hits',   120, 1500, 0, 0, 0),
    ('Trening',                 'Bez limitu czasu - ćwicz trafienia',                              'training',    0,   800,  8, 0, 0),
    ('Sekwencyjne',             'Traf przyciski w kolejności 1-8',                                 'sequential',  60,  600,  8, 0, 0),
    ('Losowe 1min',             'Losowy LED co sekundę - 1 minuta',                               'random',      60,  1000, 0, 0, 0),
    ('Losowe Szybkie',          'Losowy LED co 500ms - maksymalna szybkość',                      'random',      30,  500,  0, 0, 0),
    ('Wytrzymałościowe',        '10 minut - zbierz jak najwięcej punktów',                        'endurance',   600, 800,  0, 0, 0),
    ('Blitz 20s',               '20 sekund intensywne trafienia',                                 'blitz',       20,  300,  0, 0, 0),
    ('Precyzja',                'Traf dokładnie wskazane punkty',                                  'precision',   90,  700,  8, 0, 0),
    ('Odliczanie',              'Zaczynasz od 8 punktów i schodzisz do 1',                        'countdown',   60,  600,  8, 0, 0),
    ('Relay',                   'Trafienia na przemian lewa/prawa strona',                         'relay',       120, 500,  0, 0, 0),
    ('Survival',                '3 życia - nie chyb! Każde pudło = utrata życia',                 'survival',    0,   800,  0, 3, 0),
    ('Test Reakcji',            'Zmierz czas reakcji na losowy sygnał',                           'reaction',    30,  0,    0, 0, 0);
