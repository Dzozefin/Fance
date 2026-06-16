# ⚔ Fance — Elektroniczna Tablica Szermierki

> Kompletny system tablicy szermierki z obsługą WiFi, aplikacji webowej i mobilnej.

## Funkcjonalność

- **8 przycisków LED** — punkty na tablicy do trafień
- **15 predefiniowanych trybów gry** + możliwość dodawania własnych
- **Licznik czasu** (odliczający / wzrastający)
- **Licznik punktów** (0–8)
- **Buzzer** — dźwiękowe potwierdzenie trafienia
- **Ekran OLED** — wyświetlanie wyników i stanu gry
- **WiFi** — sterowanie z przeglądarki i telefonu
- **Historia wyników i rankingi**

## Struktura projektu

```
Fance/
├── firmware/              # Kod ESP32 (Arduino)
│   ├── fance.ino         # Główny sketch
│   ├── game_modes.h      # Definicje 15 trybów gier
│   ├── wifi_handler.h    # Obsługa WiFi + wbudowana aplikacja web
│   └── config.h          # Konfiguracja pinów i stałych
│
├── backend/              # API (Node.js/Express)
│   ├── server.js         # Serwer HTTP + WebSocket
│   ├── routes/           # Endpointy API
│   │   ├── modes.js      # CRUD dla trybów gry
│   │   ├── scores.js     # Historia wyników
│   │   ├── rankings.js   # Rankingi
│   │   └── esp.js        # Relay komunikacji z ESP32
│   ├── models/
│   │   └── database.js   # Baza danych SQLite (sql.js)
│   ├── tests/
│   │   └── api.test.js   # Testy API (Jest + Supertest)
│   └── package.json
│
├── frontend/             # Aplikacja webowa (React)
│   ├── src/
│   │   ├── App.js        # Dashboard, gra, tryby, wyniki, ranking
│   │   └── index.css     # Style
│   └── package.json
│
├── mobile/               # Aplikacja mobilna (React PWA)
│   ├── src/
│   │   └── App.js        # UI zoptymalizowany dla telefonu
│   ├── public/
│   │   └── manifest.json # PWA manifest (instalacja na telefonie)
│   └── package.json
│
├── database/
│   └── schema.sql        # Schema bazy danych SQLite
│
├── docs/
│   ├── HARDWARE.md       # Schemat elektroniki i lista komponentów
│   ├── SETUP.md          # Przewodnik instalacji
│   └── API.md            # Dokumentacja API
│
└── README.md
```

## Tryby gry (15 wbudowanych)

| # | Nazwa | Czas | Opis |
|---|-------|------|------|
| 1 | Szybkie Trafienia 1min | 1 min | LEDy na przemian, zbierz punkty |
| 2 | Szybkie Trafienia 3min | 3 min | LEDy na przemian |
| 3 | Szybkie Trafienia 5min | 5 min | LEDy na przemian |
| 4 | Wolne Trafienia | 2 min | Wolno → coraz szybciej |
| 5 | Trening | ∞ | Bez limitu czasu |
| 6 | Sekwencyjne | 1 min | Traf w kolejności 1→8 |
| 7 | Losowe 1min | 1 min | Losowy LED co 1s |
| 8 | Losowe Szybkie | 30s | Losowy LED co 500ms |
| 9 | Wytrzymałościowe | 10 min | Zbierz jak najwięcej |
| 10 | Blitz 20s | 20s | Ultra-szybkie 20 sekund |
| 11 | Precyzja | 90s | Traf dokładny wzorzec |
| 12 | Odliczanie | 1 min | Od 8 do 1 |
| 13 | Relay | 2 min | Przemiennie lewa/prawa |
| 14 | Survival | ∞ | 3 życia — nie chyb! |
| 15 | Test Reakcji | 30s | Mierz czas reakcji |

## Szybki start

### 1. Firmware ESP32

```bash
# Otwórz firmware/fance.ino w Arduino IDE
# Zainstaluj biblioteki: Adafruit SSD1306, ArduinoJson v6, WebSockets
# Dostosuj piny w firmware/config.h
# Wgraj do ESP32-C1-Zero
```

### 2. Podłącz się do tablicy

1. Połącz z WiFi: **Fance_AP** (hasło: `fance1234`)
2. Otwórz przeglądarkę: **http://192.168.4.1**
3. Graj! 🎮

### 3. Backend (opcjonalny — dla historii i rankingów)

```bash
cd backend
npm install
npm start
# Dostępne na http://localhost:3001
```

### 4. Frontend webowy (opcjonalny)

```bash
cd frontend
npm install
npm start
# Dostępne na http://localhost:3000
```

### 5. Aplikacja mobilna PWA

```bash
cd mobile
npm install
npm start
# Otwórz na telefonie i dodaj do ekranu głównego
```

## Sprzęt

| Komponent | Opis |
|-----------|------|
| ESP32-C1-Zero | Główny MCU z WiFi |
| 8× Przycisk LED | Punkty na tablicy |
| Ekran OLED 128×64 | Wyświetlacz wyników |
| Buzzer aktywny | Sygnały dźwiękowe |
| 5× Przycisk taktowy | Tryb, czas, start/stop, reset |

Szczegółowy schemat połączeń: [docs/HARDWARE.md](docs/HARDWARE.md)

## API

Pełna dokumentacja API: [docs/API.md](docs/API.md)

Kluczowe endpointy:
- `GET /api/status` — stan gry
- `GET /api/modes` — lista trybów
- `POST /api/start` — start gry
- `POST /api/modes` — dodaj własny tryb
- `GET /api/rankings` — rankingi

## Testy

```bash
cd backend
npm test
# 55 testów ✓
```

## Licencja

MIT License — używaj, modyfikuj i dziel się swobodnie.

---

*Stworzone z ❤️ dla miłośników szermierki*
