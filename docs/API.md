# API.md — Dokumentacja API

## Base URL
- **ESP32 (bezpośrednio):** `http://192.168.4.1`
- **Backend Node.js:** `http://localhost:3001`

---

## ESP32 API

### GET /api/status
Zwraca aktualny stan gry.

**Odpowiedź:**
```json
{
  "score": 3,
  "time_elapsed_sec": 25,
  "game_duration_sec": 60,
  "game_running": true,
  "game_paused": false,
  "active_led": 4,
  "mode_name": "Szybkie Trafienia 1min",
  "mode_id": 0,
  "lives_remaining": 3,
  "lives_total": 0,
  "avg_reaction_ms": 420,
  "hit_leds": [1, 3, 5]
}
```

---

### GET /api/modes
Zwraca listę wszystkich trybów gry.

**Odpowiedź:**
```json
{
  "modes": [
    {
      "id": 0,
      "name": "Szybkie Trafienia 1min",
      "description": "1 minuta - LEDy na przemian",
      "duration_sec": 60,
      "type_name": "Szybkie",
      "lives": 0,
      "custom": false
    }
    // ... 14 więcej trybów
  ]
}
```

---

### POST /api/start
Uruchamia grę.

**Odpowiedź:** `GameStatus`

---

### POST /api/stop
Zatrzymuje grę.

**Odpowiedź:** `GameStatus`

---

### POST /api/reset
Resetuje stan gry.

**Odpowiedź:** `GameStatus`

---

### POST /api/select_mode
Wybiera tryb gry.

**Body:**
```json
{ "mode_id": 3 }
```

**Odpowiedź:**
```json
{ "success": true }
```

---

### GET /api/scores
Zwraca historię wyników zapisaną w ESP32 (ostatnie 50).

**Odpowiedź:**
```json
{
  "scores": [
    {
      "timestamp": 1706000000,
      "mode_id": 0,
      "mode_name": "Szybkie Trafienia 1min",
      "score": 5,
      "duration_ms": 60000,
      "avg_reaction_ms": 380
    }
  ]
}
```

---

### GET /api/custom_modes
Zwraca własne tryby gry.

---

### POST /api/custom_modes
Dodaje nowy własny tryb.

**Body:**
```json
{
  "name": "Mój Tryb",
  "description": "Opis trybu",
  "type": 0,
  "duration_sec": 60,
  "led_interval_ms": 500,
  "target_points": 0,
  "lives": 0
}
```

**Odpowiedź:**
```json
{ "success": true, "slot": 2 }
```

---

### DELETE /api/custom_modes/{id}
Usuwa własny tryb gry.

**Odpowiedź:**
```json
{ "success": true }
```

---

## Backend Node.js API

### GET /api/health
```json
{ "status": "ok", "timestamp": "2024-01-01T10:00:00.000Z" }
```

---

### GET /api/modes
Zwraca wszystkie tryby z bazy danych.

```json
{
  "modes": [...],
  "total": 25
}
```

---

### POST /api/modes
Tworzy nowy własny tryb.

**Body:**
```json
{
  "name": "Mój Tryb",
  "description": "Opis",
  "type": "quick_hits",
  "duration_sec": 60,
  "led_interval_ms": 500,
  "target_points": 0,
  "lives": 0
}
```

**Kody odpowiedzi:**
- `201` — Tryb utworzony
- `400` — Błąd walidacji
- `409` — Tryb o tej nazwie już istnieje

---

### PUT /api/modes/{id}
Aktualizuje własny tryb.

**Kody odpowiedzi:**
- `200` — Zaktualizowano
- `403` — Nie można modyfikować wbudowanych trybów
- `404` — Tryb nie znaleziony

---

### DELETE /api/modes/{id}
Usuwa własny tryb.

**Kody odpowiedzi:**
- `200` — Usunięto
- `403` — Nie można usunąć wbudowanych trybów
- `404` — Tryb nie znaleziony

---

### GET /api/scores
Pobiera historię wyników.

**Query parametry:**
| Parametr | Typ | Opis |
|----------|-----|------|
| `limit` | int (1-200) | Liczba wyników (domyślnie: 50) |
| `offset` | int | Offset dla paginacji |
| `player_name` | string | Filtruj po graczu |
| `mode_id` | int | Filtruj po trybie |

---

### POST /api/scores
Zapisuje wynik gry.

**Body:**
```json
{
  "player_name": "Anna",
  "mode_id": 1,
  "mode_name": "Szybkie Trafienia 1min",
  "score": 5,
  "duration_ms": 60000,
  "avg_reaction_ms": 380
}
```

---

### DELETE /api/scores/{id}
Usuwa wynik.

---

### GET /api/rankings
Pobiera ranking globalny.

**Query parametry:**
| Parametr | Typ | Opis |
|----------|-----|------|
| `limit` | int (1-100) | Liczba pozycji (domyślnie: 10) |
| `mode_id` | int | Filtruj po trybie |

**Odpowiedź:**
```json
{
  "rankings": [
    {
      "player_name": "Anna",
      "mode_name": "Szybkie Trafienia 1min",
      "best_score": 7,
      "best_reaction_ms": 280,
      "games_played": 15
    }
  ]
}
```

---

### GET /api/rankings/player/{name}
Statystyki konkretnego gracza.

**Odpowiedź:**
```json
{
  "player": "Anna",
  "stats": {
    "games_played": 15,
    "best_score": 7,
    "avg_score": 4.5,
    "best_reaction_ms": 280,
    "avg_reaction_ms": 380,
    "total_seconds": 900
  }
}
```

---

### POST /api/esp/status
ESP32 wysyła tutaj swój stan (do synchronizacji z backendem).

**Body:** Taki sam jak odpowiedź `/api/status` z ESP32.

---

### GET /api/esp/status
Ostatni znany stan ESP32.

---

### POST /api/esp/command
Aplikacja wysyła komendę do ESP32.

**Body:**
```json
{
  "command": "start",
  "params": {}
}
```

**Dostępne komendy:** `start`, `stop`, `reset`, `select_mode`

---

### GET /api/esp/command
ESP32 pobiera oczekujące komendy (polling).

**Odpowiedź:**
```json
{
  "commands": [
    {
      "command": "select_mode",
      "params": { "mode_id": 3 },
      "queued_at": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

## WebSocket

### Serwer WebSocket backendu: `ws://localhost:3001/ws`

Wiadomości są wysyłane automatycznie przy zmianie stanu gry.

**Format wiadomości:**
```json
{
  "type": "status_update",
  "score": 3,
  "game_running": true,
  ...
}
```

### Serwer WebSocket ESP32: `ws://192.168.4.1:81/`

ESP32 wysyła status do podłączonych klientów.
Klient może nasłuchiwać na bieżące zmiany bez polling.
