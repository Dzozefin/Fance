# SETUP.md — Przewodnik instalacji i konfiguracji

## Spis treści
1. [Wymagania wstępne](#wymagania-wstępne)
2. [Firmware ESP32](#firmware-esp32)
3. [Backend (Node.js)](#backend-nodejs)
4. [Frontend (React)](#frontend-react)
5. [Aplikacja mobilna (PWA)](#aplikacja-mobilna-pwa)
6. [Pierwsze uruchomienie](#pierwsze-uruchomienie)
7. [Połączenie WiFi](#połączenie-wifi)
8. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Wymagania wstępne

### Sprzęt
- ESP32-C1-Zero (lub kompatybilny ESP32)
- Komputer z Arduino IDE lub PlatformIO
- Kabel USB-C

### Oprogramowanie
- [Arduino IDE 2.x](https://www.arduino.cc/en/software) lub [VSCode + PlatformIO](https://platformio.org/)
- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)

---

## Firmware ESP32

### 1. Zainstaluj Arduino IDE
Pobierz i zainstaluj Arduino IDE 2.x ze strony arduino.cc.

### 2. Dodaj wsparcie dla ESP32
W Arduino IDE: `File` → `Preferences` → `Additional Boards Manager URLs`:
```
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

Potem: `Tools` → `Board Manager` → wyszukaj "esp32" → zainstaluj.

### 3. Zainstaluj biblioteki
W Arduino IDE: `Tools` → `Manage Libraries`:
- `Adafruit SSD1306` (wersja 2.5+)
- `Adafruit GFX Library`
- `ArduinoJson` (wersja 6.x)
- `WebSockets` (by Markus Sattler)

### 4. Konfiguracja pinów
Edytuj plik `firmware/config.h` i dostosuj numery pinów do swojego połączenia:
```cpp
#define BTN_LED_1   2    // Zmień na faktyczny pin GPIO
#define LED_1       10   // Jeśli LED jest na osobnym pinie
// ... itd.
```

### 5. Konfiguracja WiFi
W `firmware/config.h`:
```cpp
// Tryb Access Point (domyślny - ESP32 tworzy własną sieć)
#define WIFI_AP_MODE  true
#define WIFI_SSID     "Fance_AP"
#define WIFI_PASSWORD "fance1234"

// LUB: Tryb Station (połącz do domowej sieci)
#define WIFI_AP_MODE    false
#define WIFI_STA_SSID   "TwojaSiec"
#define WIFI_STA_PASS   "TwojeHaslo"
```

### 6. Wgraj firmware
1. Otwórz `firmware/fance.ino` w Arduino IDE
2. Wybierz płytkę: `Tools` → `Board` → ESP32-C1-Zero (lub Generic ESP32-C1)
3. Wybierz port: `Tools` → `Port`
4. Kliknij `Upload` (→)

### 7. Sprawdź działanie
Otwórz `Tools` → `Serial Monitor` (115200 baud).
Powinieneś zobaczyć:
```
=== FANCE Fencing Scoreboard ===
AP IP: 192.168.4.1
System ready!
Web App: http://192.168.4.1
```

---

## Backend (Node.js)

### 1. Zainstaluj zależności
```bash
cd backend
npm install
```

### 2. Uruchom serwer
```bash
npm start
```
Serwer uruchomi się na `http://localhost:3001`.

### 3. Uruchom w trybie deweloperskim (z auto-reload)
```bash
npm run dev
```

### 4. Testy
```bash
npm test
```

### 5. Konfiguracja środowiska (opcjonalnie)
Utwórz plik `.env` w folderze `backend/`:
```
PORT=3001
```

---

## Frontend (React)

### 1. Zainstaluj zależności
```bash
cd frontend
npm install
```

### 2. Uruchom w trybie deweloperskim
```bash
npm start
```
Aplikacja otworzy się na `http://localhost:3000`.

### 3. Zbuduj wersję produkcyjną
```bash
npm run build
```
Pliki zostaną umieszczone w `frontend/build/`.
Backend Node.js automatycznie serwuje te pliki.

### 4. Konfiguracja API
Jeśli backend działa na innym porcie/serwerze, utwórz plik `frontend/.env`:
```
REACT_APP_API_URL=http://twoj-serwer:3001
REACT_APP_WS_URL=ws://twoj-serwer:3001/ws
```

---

## Aplikacja mobilna (PWA)

### 1. Zainstaluj zależności
```bash
cd mobile
npm install
```

### 2. Uruchom w trybie deweloperskim
```bash
npm start
```

### 3. Zbuduj wersję produkcyjną
```bash
npm run build
```

### 4. Instalacja jako aplikacja na telefonie
Otwórz w Chrome na Android / Safari na iOS:
- `http://192.168.4.1` (gdy podłączony do ESP32 AP)
- lub `http://twoj-serwer:3001` (przez backend)

**Android Chrome**: menu → "Dodaj do ekranu głównego"
**iOS Safari**: przycisk udostępniania → "Dodaj do ekranu głównego"

---

## Pierwsze uruchomienie

### Krok 1: Wgraj firmware do ESP32
Jak opisano powyżej.

### Krok 2: Podłącz się do sieci WiFi ESP32
- Sieć: `Fance_AP`
- Hasło: `fance1234`

### Krok 3: Otwórz interfejs webowy
W przeglądarce: `http://192.168.4.1`

Zobaczysz panel do sterowania tablicą bezpośrednio z ESP32.

### Krok 4 (opcjonalnie): Uruchom backend dla historii/rankingów
```bash
cd backend && npm install && npm start
```

### Krok 5 (opcjonalnie): Uruchom frontend webowy
```bash
cd frontend && npm install && npm start
```

---

## Połączenie WiFi

### Tryb Access Point (domyślny)
```
Telefon/Komputer ─── WiFi ──→ ESP32 (192.168.4.1)
```
- ESP32 tworzy własną sieć "Fance_AP"
- Nie potrzebujesz routera
- Wszystkie urządzenia muszą być w sieci "Fance_AP"
- Brak dostępu do internetu przez tę sieć

### Tryb Station (z routerem)
```
ESP32 ─── WiFi ──→ Router ──→ Telefon/Komputer
                            ──→ Internet
                            ──→ Serwer backendowy
```
- ESP32 łączy się z Twoją siecią domową
- Wszystkie urządzenia mogą komunikować się normalnie
- Wymaga zmiany `WIFI_AP_MODE = false` w config.h

---

## Rozwiązywanie problemów

### ESP32 nie jest widoczny w sieci WiFi
- Sprawdź, czy firmware został poprawnie wgrany
- Otwórz Serial Monitor i sprawdź IP
- Upewnij się, że `WIFI_SSID` i `WIFI_PASSWORD` są poprawne

### Wyświetlacz OLED nie działa
- Sprawdź połączenie SDA/SCL
- Sprawdź adres I2C (0x3C lub 0x3D)
- Uruchom przykład `i2c_scanner.ino` by znaleźć adres

### Przyciski nie reagują
- Sprawdź pin `INPUT_PULLUP`
- Sprawdź debouncowanie (DEBOUNCE_MS w config.h)
- Upewnij się, że przyciski są podłączone do GND

### Backend nie uruchamia się
```bash
cd backend
rm -rf node_modules
npm install
npm start
```

### Serwer WebSocket nie łączy się
- Sprawdź, czy port 81 (ESP32) lub odpowiedni port backendu jest dostępny
- Sprawdź firewall
- Aplikacja automatycznie przełączy się na polling HTTP

### Błąd kompilacji Arduino
Upewnij się, że zainstalowałeś wszystkie biblioteki:
- Adafruit SSD1306
- Adafruit GFX Library
- ArduinoJson (v6)
- WebSockets by Markus Sattler
