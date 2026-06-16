/*
 * ============================================================
 * FANCE - Electronic Fencing Scoreboard
 * Main Arduino Sketch for ESP32-C1-Zero
 *
 * Features:
 *  - 8 LED buttons for scoring
 *  - 15 predefined game modes
 *  - WiFi AP + WebSocket real-time updates
 *  - Embedded web app
 *  - OLED display (SSD1306)
 *  - Buzzer feedback
 *  - NVS storage for custom modes and scores
 *
 * Libraries required (install via Arduino Library Manager):
 *  - Adafruit SSD1306
 *  - Adafruit GFX Library
 *  - ArduinoJson (v6)
 *  - WebSockets by Markus Sattler
 *  - WebServer (built-in ESP32)
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>

#include "config.h"
#include "game_modes.h"
#include "wifi_handler.h"

// ============================================================
// Global Objects
// ============================================================
WebServer           server(SERVER_PORT);
WebSocketsServer    webSocket(WS_PORT);
Adafruit_SSD1306    display(DISPLAY_WIDTH, DISPLAY_HEIGHT, &Wire, -1);
Preferences         prefs;

// ============================================================
// Global State
// ============================================================
GameState       g_state;
CustomGameMode  g_custom_modes[MAX_CUSTOM_MODES];
ScoreRecord     g_scores[50];
uint8_t         g_score_count = 0;

// ============================================================
// Button state tracking
// ============================================================
static bool     btn_led_state[MAX_POINTS]     = {false};
static uint32_t btn_led_last_ms[MAX_POINTS]   = {0};
static bool     btn_ctrl_state[5]             = {false};
static uint32_t btn_ctrl_last_ms[5]           = {0};

static const uint8_t LED_PINS[MAX_POINTS]     = {LED_1, LED_2, LED_3, LED_4, LED_5, LED_6, LED_7, LED_8};
static const uint8_t BTN_PINS[MAX_POINTS]     = {BTN_LED_1, BTN_LED_2, BTN_LED_3, BTN_LED_4,
                                                   BTN_LED_5, BTN_LED_6, BTN_LED_7, BTN_LED_8};
static const uint8_t CTRL_PINS[5]             = {BTN_MODE, BTN_TIME_UP, BTN_TIME_DOWN,
                                                   BTN_START_STOP, BTN_RESET};

// ============================================================
// Timers
// ============================================================
static uint32_t last_game_tick_ms   = 0;
static uint32_t last_display_ms     = 0;
static uint32_t last_ws_broadcast   = 0;
static uint32_t last_led_blink_ms   = 0;

// ============================================================
// Forward declarations
// ============================================================
void initPins();
void initDisplay();
void initGameState();
void gameLoop();
void readButtons();
void handleLedButton(uint8_t index);
void handleModeButton();
void handleTimeButton(bool up);
void handleStartStop();
void handleReset();
void setActiveLed(uint8_t led_num);
void allLedsOff();
void nextRandomLed();
void nextSequentialLed();
void playTone(uint16_t freq, uint32_t dur);
void scorePoint();
void loseLife();
void endGame();
void saveScore();
void updateDisplay();
void displayScore();
void displayModeSelect();
void shuffleLedSequence();

// ============================================================
// Setup
// ============================================================
void setup() {
    Serial.begin(115200);
    Serial.println("\n=== FANCE Fencing Scoreboard ===");

    initPins();
    initDisplay();
    initGameState();

    // Load saved custom modes
    loadCustomModes();

    // Setup WiFi & Web Server
    setupWiFi();
    setupRoutes();
    server.begin();

    // Start WebSocket server
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);

    Serial.println("System ready!");
    Serial.print("Web App: http://");
    Serial.println(WiFi.softAPIP());

    // Startup tone
    playTone(TONE_START_FREQ, TONE_START_DUR);
    delay(100);
    playTone(TONE_START_FREQ * 2, TONE_START_DUR);
}

// ============================================================
// Main Loop
// ============================================================
void loop() {
    server.handleClient();
    webSocket.loop();

    uint32_t now = millis();

    // Read physical buttons
    readButtons();

    // Game logic tick (every 50ms)
    if (now - last_game_tick_ms >= 50) {
        last_game_tick_ms = now;
        if (g_state.game_running) {
            gameLoop();
        }
    }

    // Update display (every 100ms)
    if (now - last_display_ms >= 100) {
        last_display_ms = now;
        updateDisplay();
    }

    // Broadcast WebSocket status (every 500ms when running)
    if (g_state.game_running && now - last_ws_broadcast >= 500) {
        last_ws_broadcast = now;
        broadcastStatus();
    }
}

// ============================================================
// Initialization
// ============================================================
void initPins() {
    // LED button input pins
    for (int i = 0; i < MAX_POINTS; i++) {
        pinMode(BTN_PINS[i], INPUT_PULLUP);
        pinMode(LED_PINS[i], OUTPUT);
        digitalWrite(LED_PINS[i], LOW);
    }
    // Control buttons
    for (int i = 0; i < 5; i++) {
        pinMode(CTRL_PINS[i], INPUT_PULLUP);
    }
    // Buzzer
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
}

void initDisplay() {
    Wire.begin(OLED_SDA, OLED_SCL);
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
        Serial.println("SSD1306 not found - continuing without display");
        return;
    }
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(30, 10);
    display.println("FANCE");
    display.setCursor(15, 28);
    display.println("Szermierka v1.0");
    display.setCursor(10, 46);
    display.println("WiFi: Fance_AP");
    display.display();
    delay(2000);
}

void initGameState() {
    memset(&g_state, 0, sizeof(g_state));
    g_state.current_mode_id     = 0;
    g_state.game_running        = false;
    g_state.game_paused         = false;
    g_state.score               = 0;
    g_state.active_led          = 0;
    g_state.current_interval_ms = PREDEFINED_MODES[0].led_interval_ms;
    g_state.game_duration_ms    = (uint32_t)PREDEFINED_MODES[0].duration_sec * 1000;
    g_state.lives_remaining     = PREDEFINED_MODES[0].lives;
    strlcpy(g_state.mode_name, PREDEFINED_MODES[0].name, 32);
    shuffleLedSequence();

    memset(g_custom_modes, 0, sizeof(g_custom_modes));
}

// ============================================================
// Game Loop (called every 50ms while game is running)
// ============================================================
void gameLoop() {
    uint32_t now = millis();

    // Update elapsed time
    g_state.time_elapsed_ms += 50;

    // Check time limit
    if (g_state.game_duration_ms > 0 && g_state.time_elapsed_ms >= g_state.game_duration_ms) {
        endGame();
        return;
    }

    // Get active mode config
    const GameMode* mode = nullptr;
    GameMode tmpMode;
    if (g_state.current_mode_id < MAX_MODES) {
        mode = &PREDEFINED_MODES[g_state.current_mode_id];
    } else {
        int slot = g_state.current_mode_id - MAX_MODES;
        if (slot >= 0 && slot < MAX_CUSTOM_MODES && g_custom_modes[slot].active) {
            mode = &g_custom_modes[slot].mode;
        }
    }
    if (!mode) return;

    // Handle increasing speed for slow mode
    if (mode->increasing_speed) {
        float progress = (float)g_state.time_elapsed_ms / (float)g_state.game_duration_ms;
        g_state.current_interval_ms = (uint16_t)(mode->led_interval_ms * (1.0f - progress * 0.7f));
        if (g_state.current_interval_ms < 200) g_state.current_interval_ms = 200;
    }

    // LED management based on mode type
    bool needNewLed = (g_state.active_led == 0) ||
                      (now - g_state.led_changed_ms >= g_state.current_interval_ms);

    if (needNewLed) {
        switch (mode->type) {
            case MODE_QUICK_HITS:
            case MODE_SLOW_HITS:
            case MODE_ENDURANCE:
            case MODE_CHALLENGE:
            case MODE_BLITZ:
                nextRandomLed();
                break;
            case MODE_RANDOM:
            case MODE_REACTION:
            case MODE_SURVIVAL:
                nextRandomLed();
                break;
            case MODE_SEQUENTIAL:
            case MODE_COUNTDOWN:
            case MODE_PRECISION:
                nextSequentialLed();
                break;
            case MODE_RELAY:
                // Alternate between left (1-4) and right (5-8)
                {
                    static bool relay_side = false;
                    relay_side = !relay_side;
                    uint8_t base = relay_side ? 0 : 4;
                    uint8_t led = base + (random(0, 4));
                    setActiveLed(led + 1);
                }
                break;
            case MODE_TRAINING:
                nextRandomLed();
                break;
            default:
                nextRandomLed();
                break;
        }
    }
}

// ============================================================
// Button Reading (debounced)
// ============================================================
void readButtons() {
    uint32_t now = millis();

    // Read LED buttons
    for (int i = 0; i < MAX_POINTS; i++) {
        bool pressed = (digitalRead(BTN_PINS[i]) == LOW);
        if (pressed && !btn_led_state[i] && (now - btn_led_last_ms[i]) > DEBOUNCE_MS) {
            btn_led_state[i]   = true;
            btn_led_last_ms[i] = now;
            handleLedButton(i);
        } else if (!pressed) {
            btn_led_state[i] = false;
        }
    }

    // Read control buttons
    bool ctrl_pressed[5];
    for (int i = 0; i < 5; i++) {
        ctrl_pressed[i] = (digitalRead(CTRL_PINS[i]) == LOW);
    }

    // BTN_MODE (index 0)
    if (ctrl_pressed[0] && !btn_ctrl_state[0] && (now - btn_ctrl_last_ms[0]) > DEBOUNCE_MS) {
        btn_ctrl_state[0]   = true;
        btn_ctrl_last_ms[0] = now;
        handleModeButton();
    } else if (!ctrl_pressed[0]) btn_ctrl_state[0] = false;

    // BTN_TIME_UP (index 1)
    if (ctrl_pressed[1] && !btn_ctrl_state[1] && (now - btn_ctrl_last_ms[1]) > DEBOUNCE_MS) {
        btn_ctrl_state[1]   = true;
        btn_ctrl_last_ms[1] = now;
        handleTimeButton(true);
    } else if (!ctrl_pressed[1]) btn_ctrl_state[1] = false;

    // BTN_TIME_DOWN (index 2)
    if (ctrl_pressed[2] && !btn_ctrl_state[2] && (now - btn_ctrl_last_ms[2]) > DEBOUNCE_MS) {
        btn_ctrl_state[2]   = true;
        btn_ctrl_last_ms[2] = now;
        handleTimeButton(false);
    } else if (!ctrl_pressed[2]) btn_ctrl_state[2] = false;

    // BTN_START_STOP (index 3)
    if (ctrl_pressed[3] && !btn_ctrl_state[3] && (now - btn_ctrl_last_ms[3]) > DEBOUNCE_MS) {
        btn_ctrl_state[3]   = true;
        btn_ctrl_last_ms[3] = now;
        handleStartStop();
    } else if (!ctrl_pressed[3]) btn_ctrl_state[3] = false;

    // BTN_RESET (index 4)
    if (ctrl_pressed[4] && !btn_ctrl_state[4] && (now - btn_ctrl_last_ms[4]) > DEBOUNCE_MS) {
        btn_ctrl_state[4]   = true;
        btn_ctrl_last_ms[4] = now;
        handleReset();
    } else if (!ctrl_pressed[4]) btn_ctrl_state[4] = false;
}

// ============================================================
// LED Button Handler - called when player hits a button
// ============================================================
void handleLedButton(uint8_t index) {
    uint8_t btn_num = index + 1; // 1-based

    if (!g_state.game_running) return;

    const GameMode* mode = nullptr;
    if (g_state.current_mode_id < MAX_MODES)
        mode = &PREDEFINED_MODES[g_state.current_mode_id];
    else {
        int slot = g_state.current_mode_id - MAX_MODES;
        if (slot >= 0 && slot < MAX_CUSTOM_MODES && g_custom_modes[slot].active)
            mode = &g_custom_modes[slot].mode;
    }

    if (!mode) return;

    // Reaction mode: hit = measure reaction time
    if (mode->type == MODE_REACTION) {
        if (btn_num == g_state.active_led) {
            uint32_t reaction = millis() - g_state.led_changed_ms;
            g_state.total_reaction_ms += reaction;
            g_state.reaction_count++;
            g_state.score++;
            playTone(TONE_HIT_FREQ, TONE_HIT_DUR);
            g_state.hit_registered[index] = true;
            setActiveLed(0);
        }
        return;
    }

    // Check if correct button was hit
    bool correct_hit = false;
    if (mode->sequential) {
        correct_hit = (btn_num == g_state.led_sequence[g_state.sequence_index]);
    } else {
        correct_hit = (btn_num == g_state.active_led);
    }

    if (correct_hit && !g_state.hit_registered[index]) {
        scorePoint();
        g_state.hit_registered[index] = true;

        // Measure reaction time
        uint32_t reaction = millis() - g_state.led_changed_ms;
        g_state.total_reaction_ms += reaction;
        g_state.reaction_count++;

        // Check win condition
        if (mode->target_points > 0 && g_state.score >= mode->target_points) {
            endGame();
            return;
        }

        // Move to next LED
        if (mode->sequential) {
            nextSequentialLed();
        } else {
            nextRandomLed();
        }
    } else if (!correct_hit && mode->type == MODE_SURVIVAL) {
        loseLife();
    }
}

// ============================================================
// Control Button Handlers
// ============================================================
void handleModeButton() {
    if (g_state.game_running) return;

    // Count total available modes
    uint8_t total = MAX_MODES;
    for (int i = 0; i < MAX_CUSTOM_MODES; i++) {
        if (g_custom_modes[i].active) total++;
    }

    g_state.current_mode_id = (g_state.current_mode_id + 1) % total;
    handleReset();
    playTone(800, 50);

    if (g_state.current_mode_id < MAX_MODES) {
        strlcpy(g_state.mode_name, PREDEFINED_MODES[g_state.current_mode_id].name, 32);
        g_state.game_duration_ms    = (uint32_t)PREDEFINED_MODES[g_state.current_mode_id].duration_sec * 1000;
        g_state.current_interval_ms = PREDEFINED_MODES[g_state.current_mode_id].led_interval_ms;
        g_state.lives_remaining     = PREDEFINED_MODES[g_state.current_mode_id].lives;
    }
    broadcastStatus();
}

void handleTimeButton(bool up) {
    if (g_state.game_running) return;
    uint32_t step = 10000; // 10 seconds
    if (up) {
        if (g_state.game_duration_ms < (uint32_t)MAX_TIME_SEC * 1000)
            g_state.game_duration_ms += step;
    } else {
        if (g_state.game_duration_ms > (uint32_t)MIN_TIME_SEC * 1000)
            g_state.game_duration_ms -= step;
        else
            g_state.game_duration_ms = 0; // No limit
    }
    playTone(600, 50);
    broadcastStatus();
}

void handleStartStop() {
    if (g_state.game_running) {
        g_state.game_paused  = !g_state.game_paused;
        g_state.game_running = !g_state.game_paused;
    } else {
        g_state.game_running = true;
        g_state.game_paused  = false;
        if (g_state.time_elapsed_ms == 0) {
            shuffleLedSequence();
        }
        playTone(TONE_START_FREQ, TONE_START_DUR);
    }
    broadcastStatus();
}

void handleReset() {
    g_state.game_running    = false;
    g_state.game_paused     = false;
    g_state.score           = 0;
    g_state.time_elapsed_ms = 0;
    g_state.active_led      = 0;
    g_state.sequence_index  = 0;
    allLedsOff();
    memset(g_state.hit_registered, 0, sizeof(g_state.hit_registered));
    g_state.total_reaction_ms = 0;
    g_state.reaction_count    = 0;

    if (g_state.current_mode_id < MAX_MODES)
        g_state.lives_remaining = PREDEFINED_MODES[g_state.current_mode_id].lives;

    shuffleLedSequence();
    broadcastStatus();
}

// ============================================================
// Score and Life Management
// ============================================================
void scorePoint() {
    g_state.score++;
    playTone(TONE_HIT_FREQ, TONE_HIT_DUR);
    broadcastStatus();
}

void loseLife() {
    if (g_state.lives_remaining > 0) {
        g_state.lives_remaining--;
        playTone(300, 300); // Low warning tone
        broadcastStatus();
        if (g_state.lives_remaining == 0) {
            endGame();
        }
    }
}

void endGame() {
    g_state.game_running = false;
    allLedsOff();
    saveScore();

    // Victory sequence
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < MAX_POINTS; j++) {
            digitalWrite(LED_PINS[j], HIGH);
        }
        playTone(TONE_WIN_FREQ, TONE_WIN_DUR / 3);
        delay(200);
        for (int j = 0; j < MAX_POINTS; j++) {
            digitalWrite(LED_PINS[j], LOW);
        }
        delay(200);
    }
    broadcastStatus();
}

void saveScore() {
    if (g_score_count >= 50) {
        // Shift scores (drop oldest)
        memmove(&g_scores[0], &g_scores[1], sizeof(ScoreRecord) * 49);
        g_score_count = 49;
    }

    g_scores[g_score_count].timestamp   = (uint32_t)(millis() / 1000);
    g_scores[g_score_count].mode_id     = g_state.current_mode_id;
    strlcpy(g_scores[g_score_count].mode_name, g_state.mode_name, 32);
    g_scores[g_score_count].score       = g_state.score;
    g_scores[g_score_count].duration_ms = g_state.time_elapsed_ms;
    g_scores[g_score_count].avg_reaction_ms = g_state.reaction_count > 0
        ? g_state.total_reaction_ms / g_state.reaction_count : 0;
    g_score_count++;
}

// ============================================================
// LED Control
// ============================================================
void setActiveLed(uint8_t led_num) {
    allLedsOff();
    g_state.active_led    = led_num;
    g_state.led_changed_ms = millis();

    if (led_num > 0 && led_num <= MAX_POINTS) {
        digitalWrite(LED_PINS[led_num - 1], HIGH);
    }
}

void allLedsOff() {
    for (int i = 0; i < MAX_POINTS; i++) {
        digitalWrite(LED_PINS[i], LOW);
    }
    g_state.active_led = 0;
}

void nextRandomLed() {
    uint8_t next;
    uint8_t attempts = 0;
    do {
        next = random(1, MAX_POINTS + 1);
        attempts++;
    } while (next == g_state.active_led && attempts < 10);
    setActiveLed(next);
}

void nextSequentialLed() {
    if (g_state.sequence_index >= MAX_POINTS) {
        g_state.sequence_index = 0;
    }
    setActiveLed(g_state.led_sequence[g_state.sequence_index]);
    g_state.sequence_index++;
}

void shuffleLedSequence() {
    for (int i = 0; i < MAX_POINTS; i++) {
        g_state.led_sequence[i] = i + 1;
    }
    // Fisher-Yates shuffle
    for (int i = MAX_POINTS - 1; i > 0; i--) {
        int j = random(0, i + 1);
        uint8_t tmp = g_state.led_sequence[i];
        g_state.led_sequence[i] = g_state.led_sequence[j];
        g_state.led_sequence[j] = tmp;
    }
}

// ============================================================
// Buzzer
// ============================================================
void playTone(uint16_t freq, uint32_t dur) {
    tone(BUZZER_PIN, freq, dur);
}

// ============================================================
// OLED Display
// ============================================================
void updateDisplay() {
    display.clearDisplay();

    if (!g_state.game_running && g_state.time_elapsed_ms == 0) {
        displayModeSelect();
    } else {
        displayScore();
    }
    display.display();
}

void displayScore() {
    // Line 1: Mode name (truncated)
    display.setTextSize(1);
    display.setCursor(0, 0);
    char shortened[22];
    strlcpy(shortened, g_state.mode_name, 21);
    display.println(shortened);

    // Line 2: Score big
    display.setTextSize(3);
    display.setCursor(10, 14);
    display.print("P:");
    display.print(g_state.score);

    // Line 3: Timer
    display.setTextSize(2);
    uint32_t t_sec = g_state.time_elapsed_ms / 1000;
    uint32_t remaining = 0;
    if (g_state.game_duration_ms > 0) {
        remaining = g_state.game_duration_ms > g_state.time_elapsed_ms
            ? (g_state.game_duration_ms - g_state.time_elapsed_ms) / 1000 : 0;
    } else {
        remaining = t_sec;
    }
    char tbuf[8];
    snprintf(tbuf, sizeof(tbuf), "%02lu:%02lu", remaining / 60, remaining % 60);
    display.setCursor(52, 46);
    display.print(tbuf);

    // Lives (if applicable)
    if (g_state.lives_remaining > 0) {
        display.setTextSize(1);
        display.setCursor(0, 46);
        for (int i = 0; i < g_state.lives_remaining && i < 5; i++) {
            display.print("<3");
        }
    }
}

void displayModeSelect() {
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("-- WYBIERZ TRYB --");

    display.setCursor(0, 14);
    char modeShort[22];
    strlcpy(modeShort, g_state.mode_name, 21);
    display.println(modeShort);

    uint32_t dur_sec = g_state.game_duration_ms / 1000;
    display.setCursor(0, 26);
    if (dur_sec > 0) {
        display.printf("Czas: %lu:%02lu", dur_sec / 60, dur_sec % 60);
    } else {
        display.print("Czas: bez limitu");
    }

    display.setCursor(0, 38);
    display.print("[TRYB] zmien tryb");
    display.setCursor(0, 50);
    display.print("[START] uruchom");
}
