#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// FANCE - Electronic Fencing Scoreboard
// Hardware: ESP32-C1-Zero
// ============================================================

// --- WiFi Configuration ---
#define WIFI_SSID        "Fance_AP"
#define WIFI_PASSWORD    "fance1234"
#define WIFI_AP_MODE     true   // true = Access Point, false = Station mode
#define WIFI_STA_SSID    ""     // Set your home WiFi SSID for station mode
#define WIFI_STA_PASS    ""     // Set your home WiFi password

// --- Pin Definitions ---
// 8 LED Buttons (point buttons)
#define BTN_LED_1   2
#define BTN_LED_2   3
#define BTN_LED_3   4
#define BTN_LED_4   5
#define BTN_LED_5   6
#define BTN_LED_6   7
#define BTN_LED_7   8
#define BTN_LED_8   9

// LED output pins (same as buttons or separate)
#define LED_1   10
#define LED_2   11
#define LED_3   12
#define LED_4   13
#define LED_5   14
#define LED_6   15
#define LED_7   16
#define LED_8   17

// Control buttons
#define BTN_MODE        18   // Cycle through game modes
#define BTN_TIME_UP     19   // Increase time
#define BTN_TIME_DOWN   20   // Decrease time
#define BTN_START_STOP  21   // Start/stop game
#define BTN_RESET       22   // Reset game

// Buzzer
#define BUZZER_PIN   23

// I2C for OLED display (SSD1306 128x64)
#define OLED_SDA    4   // Adjust based on your wiring
#define OLED_SCL    5   // Adjust based on your wiring
#define OLED_ADDR   0x3C

// --- Game Constants ---
#define MAX_POINTS          8
#define MAX_MODES           15
#define MAX_CUSTOM_MODES    10
#define DEFAULT_TIME_SEC    60   // Default game time in seconds
#define MIN_TIME_SEC        10
#define MAX_TIME_SEC        600  // 10 minutes

// --- Buzzer Tones ---
#define TONE_HIT_FREQ       1000
#define TONE_HIT_DUR        100
#define TONE_WIN_FREQ       2000
#define TONE_WIN_DUR        500
#define TONE_START_FREQ     800
#define TONE_START_DUR      200
#define TONE_TIMEOUT_FREQ   400
#define TONE_TIMEOUT_DUR    800

// --- Storage ---
#define PREFERENCES_NS  "fance"   // NVS namespace

// --- Server ---
#define SERVER_PORT     80
#define WS_PORT         81

// --- Debounce ---
#define DEBOUNCE_MS     50

// --- Display ---
#define DISPLAY_WIDTH   128
#define DISPLAY_HEIGHT  64

#endif // CONFIG_H
