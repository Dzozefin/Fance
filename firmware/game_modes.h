#ifndef GAME_MODES_H
#define GAME_MODES_H

#include <Arduino.h>
#include "config.h"

// ============================================================
// Game Mode Types
// ============================================================
enum ModeType {
    MODE_QUICK_HITS,       // Buttons light alternately, hit as fast as possible
    MODE_SLOW_HITS,        // Buttons light with increasing speed
    MODE_TRAINING,         // No time limit, just score
    MODE_SEQUENTIAL,       // Hit buttons in order
    MODE_RANDOM,           // Random button lights up
    MODE_ENDURANCE,        // Long duration, all 8 points needed
    MODE_SPEED_ROUND,      // Very fast, 30 seconds
    MODE_PRECISION,        // Specific pattern to follow
    MODE_COUNTDOWN,        // Count down from 8 points
    MODE_RELAY,            // Alternating between two sides
    MODE_CHALLENGE,        // Increasing difficulty
    MODE_SURVIVAL,         // Miss = lose a life
    MODE_CUSTOM,           // User-defined
    MODE_BLITZ,            // 20 seconds, all buttons at once
    MODE_REACTION          // Test reaction time
};

// ============================================================
// Game Mode Structure
// ============================================================
struct GameMode {
    uint8_t     id;
    char        name[32];
    char        description[128];
    ModeType    type;
    uint16_t    duration_sec;    // 0 = no limit
    uint8_t     target_points;  // Points needed to win (0 = time-based)
    uint16_t    led_interval_ms; // Base LED change interval
    bool        increasing_speed; // Speed up over time
    bool        random_order;    // Randomize LED order
    bool        sequential;      // Must hit in order
    bool        timed;           // Has time limit
    uint8_t     lives;           // 0 = unlimited
};

// ============================================================
// Predefined Game Modes (15 modes)
// ============================================================
static const GameMode PREDEFINED_MODES[MAX_MODES] = {
    // 0: Quick Hits - 1 minute
    {
        0, "Szybkie Trafienia 1min", "1 minuta - LEDy na przemian, traf jak najszybciej",
        MODE_QUICK_HITS, 60, 0, 500, false, false, false, true, 0
    },
    // 1: Quick Hits - 3 minutes
    {
        1, "Szybkie Trafienia 3min", "3 minuty - LEDy na przemian, zbierz punkty",
        MODE_QUICK_HITS, 180, 0, 500, false, false, false, true, 0
    },
    // 2: Quick Hits - 5 minutes
    {
        2, "Szybkie Trafienia 5min", "5 minut - LEDy na przemian",
        MODE_QUICK_HITS, 300, 0, 500, false, false, false, true, 0
    },
    // 3: Slow Hits with increasing speed
    {
        3, "Wolne Trafienia", "Zacznij wolno, przyspiesz - LEDy zwiększają tempo",
        MODE_SLOW_HITS, 120, 0, 1500, true, false, false, true, 0
    },
    // 4: Training - no time limit
    {
        4, "Trening", "Bez limitu czasu - ćwicz trafienia",
        MODE_TRAINING, 0, 8, 800, false, false, false, false, 0
    },
    // 5: Sequential - hit in order
    {
        5, "Sekwencyjne", "Traf przyciski w kolejności 1-8",
        MODE_SEQUENTIAL, 60, 8, 600, false, false, true, true, 0
    },
    // 6: Random - random button
    {
        6, "Losowe 1min", "Losowy LED co sekundę - 1 minuta",
        MODE_RANDOM, 60, 0, 1000, false, true, false, true, 0
    },
    // 7: Random - fast
    {
        7, "Losowe Szybkie", "Losowy LED co 500ms - maksymalna szybkość",
        MODE_RANDOM, 30, 0, 500, false, true, false, true, 0
    },
    // 8: Endurance - 10 minutes
    {
        8, "Wytrzymałościowe", "10 minut - zbierz jak najwięcej punktów",
        MODE_ENDURANCE, 600, 0, 800, false, false, false, true, 0
    },
    // 9: Speed Round - 20 seconds
    {
        9, "Blitz 20s", "20 sekund intensywne trafienia",
        MODE_BLITZ, 20, 0, 300, false, true, false, true, 0
    },
    // 10: Precision - hit specific pattern
    {
        10, "Precyzja", "Traf dokładnie wskazane punkty",
        MODE_PRECISION, 90, 8, 700, false, false, true, true, 0
    },
    // 11: Countdown - from 8 to 1
    {
        11, "Odliczanie", "Zaczynasz od 8 punktów i schodzisz do 1",
        MODE_COUNTDOWN, 60, 8, 600, false, false, true, true, 0
    },
    // 12: Relay - alternating sides
    {
        12, "Relay", "Trafienia na przemian lewa/prawa strona",
        MODE_RELAY, 120, 0, 500, false, false, false, true, 0
    },
    // 13: Survival - miss = lose life (3 lives)
    {
        13, "Survival", "3 życia - nie chyb! Każde pudło = utrata życia",
        MODE_SURVIVAL, 0, 0, 800, false, true, false, false, 3
    },
    // 14: Reaction test
    {
        14, "Test Reakcji", "Zmierz czas reakcji na losowy sygnał",
        MODE_REACTION, 30, 0, 0, false, true, false, true, 0
    }
};

// ============================================================
// Custom mode storage (up to 10 user-defined modes)
// ============================================================
struct CustomGameMode {
    bool        active;
    GameMode    mode;
};

// ============================================================
// Game State
// ============================================================
struct GameState {
    uint8_t     current_mode_id;
    bool        game_running;
    bool        game_paused;
    uint8_t     score;           // Current score (hits)
    uint8_t     target_points;
    uint8_t     lives_remaining;
    uint32_t    time_elapsed_ms;
    uint32_t    game_duration_ms;
    uint8_t     active_led;      // Currently lit LED (1-8, 0=none)
    uint32_t    led_changed_ms;  // When LED last changed
    uint16_t    current_interval_ms;
    uint8_t     sequence_index; // For sequential modes
    uint8_t     led_sequence[MAX_POINTS]; // Order of LEDs
    bool        hit_registered[MAX_POINTS]; // Which LEDs were hit
    uint32_t    last_hit_time_ms;
    uint32_t    total_reaction_ms; // Sum of reaction times
    uint8_t     reaction_count;
    char        mode_name[32];
};

// ============================================================
// Score Record
// ============================================================
struct ScoreRecord {
    uint32_t    timestamp;
    uint8_t     mode_id;
    char        mode_name[32];
    uint8_t     score;
    uint32_t    duration_ms;
    uint32_t    avg_reaction_ms;
};

#endif // GAME_MODES_H
