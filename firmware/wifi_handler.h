#ifndef WIFI_HANDLER_H
#define WIFI_HANDLER_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "config.h"
#include "game_modes.h"

// ============================================================
// WiFi & Web Server Handler for ESP32-C1-Zero
// ============================================================

extern WebServer    server;
extern WebSocketsServer webSocket;
extern GameState    g_state;
extern CustomGameMode g_custom_modes[MAX_CUSTOM_MODES];
extern ScoreRecord  g_scores[50];
extern uint8_t      g_score_count;
extern Preferences  prefs;

// Forward declarations
void handleRoot();
void handleGetStatus();
void handleGetModes();
void handleStartGame();
void handleStopGame();
void handleResetGame();
void handleGetScores();
void handleAddCustomMode();
void handleDeleteCustomMode();
void handleNotFound();
void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length);
void broadcastStatus();
String buildStatusJson();
String buildModesJson();
String buildScoresJson();

// ============================================================
// Embedded HTML/JS for Web App (served directly from ESP32)
// ============================================================
static const char PROGMEM INDEX_HTML[] = R"rawliteral(
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fance - Tablica Szermierki</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0a0a1a; color: #fff; min-height: 100vh; }
  .header { background: linear-gradient(135deg, #1a1a3e, #2d2d6b); padding: 20px; text-align: center; border-bottom: 2px solid #4444ff; }
  .header h1 { font-size: 2rem; color: #88aaff; letter-spacing: 3px; }
  .header p { color: #aaaacc; margin-top: 5px; }
  .container { max-width: 900px; margin: 0 auto; padding: 20px; }
  .card { background: #13132a; border: 1px solid #2a2a5a; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .card h2 { color: #88aaff; margin-bottom: 15px; font-size: 1.2rem; border-bottom: 1px solid #2a2a5a; padding-bottom: 10px; }
  .scoreboard { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center; }
  .score-val { font-size: 5rem; font-weight: bold; color: #ffdd00; text-shadow: 0 0 20px rgba(255,220,0,0.5); }
  .score-label { color: #aaaacc; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; }
  .timer { font-size: 3.5rem; font-weight: bold; color: #44ff88; font-family: monospace; text-shadow: 0 0 15px rgba(68,255,136,0.4); }
  .leds { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
  .led-btn { width: 100%; aspect-ratio: 1; border-radius: 50%; border: 3px solid #333; background: #1a1a2e; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; color: #666; }
  .led-btn.active { background: #ffdd00; border-color: #ffff00; color: #000; box-shadow: 0 0 25px rgba(255,220,0,0.8); }
  .led-btn.hit { background: #44ff88; border-color: #00ff66; color: #000; box-shadow: 0 0 20px rgba(68,255,136,0.7); }
  .controls { display: flex; gap: 10px; flex-wrap: wrap; }
  .btn { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; transition: all 0.2s; flex: 1; min-width: 100px; }
  .btn-start { background: #22cc55; color: #000; }
  .btn-start:hover { background: #33ff66; box-shadow: 0 0 15px rgba(34,204,85,0.5); }
  .btn-stop { background: #cc2233; color: #fff; }
  .btn-stop:hover { background: #ff3344; box-shadow: 0 0 15px rgba(204,34,51,0.5); }
  .btn-reset { background: #555577; color: #fff; }
  .btn-reset:hover { background: #7777aa; }
  .mode-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
  .mode-card { background: #1a1a35; border: 1px solid #333366; border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s; }
  .mode-card:hover, .mode-card.selected { border-color: #4444ff; background: #1f1f45; box-shadow: 0 0 10px rgba(68,68,255,0.3); }
  .mode-card.selected { border-color: #88aaff; }
  .mode-name { font-weight: bold; color: #ccddff; margin-bottom: 5px; font-size: 0.9rem; }
  .mode-desc { color: #666699; font-size: 0.75rem; }
  .mode-dur { color: #44aaff; font-size: 0.75rem; margin-top: 5px; }
  .scores-table { width: 100%; border-collapse: collapse; }
  .scores-table th { background: #1a1a45; color: #88aaff; padding: 8px 12px; text-align: left; font-size: 0.85rem; }
  .scores-table td { padding: 8px 12px; border-bottom: 1px solid #1a1a35; font-size: 0.85rem; color: #ccccdd; }
  .scores-table tr:hover td { background: #13132a; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
  .status-running { background: #224433; color: #44ff88; }
  .status-stopped { background: #332222; color: #ff6666; }
  .custom-form { display: grid; gap: 12px; }
  .custom-form label { color: #aaaacc; font-size: 0.85rem; }
  .custom-form input, .custom-form select { width: 100%; padding: 8px 12px; background: #0d0d22; border: 1px solid #333366; border-radius: 6px; color: #fff; font-size: 0.9rem; }
  .custom-form input:focus, .custom-form select:focus { outline: none; border-color: #4444ff; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .lives-container { display: flex; gap: 8px; margin: 5px 0; }
  .life { font-size: 1.5rem; }
  .life.lost { filter: grayscale(1); opacity: 0.3; }
  .section-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #2a2a5a; }
  .tab { padding: 10px 20px; cursor: pointer; color: #888; border-bottom: 2px solid transparent; transition: all 0.2s; }
  .tab.active { color: #88aaff; border-bottom-color: #88aaff; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .reaction-time { font-size: 2rem; color: #ffaa44; text-align: center; padding: 10px; font-weight: bold; }
  .mode-type-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; background: #222255; color: #6688ff; display: inline-block; margin-top: 4px; }
  @media (max-width: 600px) {
    .form-row { grid-template-columns: 1fr; }
    .leds { grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .scoreboard { grid-template-columns: 1fr 1fr; }
  }
  .ws-status { position: fixed; bottom: 10px; right: 10px; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; background: #333; color: #aaa; }
  .ws-status.connected { background: #224433; color: #44ff88; }
</style>
</head>
<body>
<div class="header">
  <h1>⚔ FANCE</h1>
  <p>Elektroniczna Tablica Szermierki</p>
</div>

<div class="container">
  <div class="section-tabs">
    <div class="tab active" onclick="showTab('game')">🎮 Gra</div>
    <div class="tab" onclick="showTab('modes')">📋 Tryby</div>
    <div class="tab" onclick="showTab('scores')">🏆 Wyniki</div>
    <div class="tab" onclick="showTab('custom')">⚙ Własne</div>
  </div>

  <!-- GAME TAB -->
  <div id="tab-game" class="tab-content active">
    <div class="card">
      <h2>📊 Tablica</h2>
      <div class="scoreboard">
        <div>
          <div class="score-val" id="score-display">0</div>
          <div class="score-label">Punkty</div>
        </div>
        <div>
          <div class="timer" id="timer-display">00:00</div>
          <div class="score-label">Czas</div>
        </div>
      </div>
      <div class="lives-container" id="lives-container" style="display:none; justify-content:center; margin-top:10px;"></div>
      <div class="reaction-time" id="reaction-display" style="display:none;"></div>
    </div>

    <div class="card">
      <h2>💡 LEDy</h2>
      <div class="leds" id="leds-grid">
        <div class="led-btn" id="led-1" onclick="hitButton(1)">1</div>
        <div class="led-btn" id="led-2" onclick="hitButton(2)">2</div>
        <div class="led-btn" id="led-3" onclick="hitButton(3)">3</div>
        <div class="led-btn" id="led-4" onclick="hitButton(4)">4</div>
        <div class="led-btn" id="led-5" onclick="hitButton(5)">5</div>
        <div class="led-btn" id="led-6" onclick="hitButton(6)">6</div>
        <div class="led-btn" id="led-7" onclick="hitButton(7)">7</div>
        <div class="led-btn" id="led-8" onclick="hitButton(8)">8</div>
      </div>
    </div>

    <div class="card">
      <h2>🎛 Sterowanie</h2>
      <div style="margin-bottom: 12px;">
        <span class="score-label">Aktualny tryb: </span>
        <span id="mode-name" style="color:#88aaff; font-weight:bold;">Szybkie Trafienia 1min</span>
        <span id="game-status" class="status-badge status-stopped" style="margin-left:10px;">Zatrzymana</span>
      </div>
      <div class="controls">
        <button class="btn btn-start" onclick="startGame()">▶ START</button>
        <button class="btn btn-stop" onclick="stopGame()">⏸ STOP</button>
        <button class="btn btn-reset" onclick="resetGame()">↺ RESET</button>
      </div>
    </div>
  </div>

  <!-- MODES TAB -->
  <div id="tab-modes" class="tab-content">
    <div class="card">
      <h2>📋 Wybierz Tryb Gry</h2>
      <div class="mode-grid" id="modes-grid"></div>
    </div>
  </div>

  <!-- SCORES TAB -->
  <div id="tab-scores" class="tab-content">
    <div class="card">
      <h2>🏆 Historia Wyników</h2>
      <table class="scores-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tryb</th>
            <th>Punkty</th>
            <th>Czas</th>
            <th>Śr. Reakcja</th>
          </tr>
        </thead>
        <tbody id="scores-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- CUSTOM MODES TAB -->
  <div id="tab-custom" class="tab-content">
    <div class="card">
      <h2>⚙ Dodaj Własny Tryb</h2>
      <div class="custom-form">
        <div class="form-row">
          <div>
            <label>Nazwa trybu</label>
            <input type="text" id="c-name" placeholder="Mój Tryb" maxlength="31">
          </div>
          <div>
            <label>Typ</label>
            <select id="c-type">
              <option value="0">Szybkie Trafienia</option>
              <option value="1">Wolne z Przyspieszeniem</option>
              <option value="2">Trening (bez limitu)</option>
              <option value="3">Sekwencyjne</option>
              <option value="4">Losowe</option>
              <option value="11">Survival</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div>
            <label>Czas (sekundy, 0 = bez limitu)</label>
            <input type="number" id="c-duration" min="0" max="600" value="60">
          </div>
          <div>
            <label>Interwał LED (ms)</label>
            <input type="number" id="c-interval" min="100" max="5000" value="500">
          </div>
        </div>
        <div class="form-row">
          <div>
            <label>Punkty docelowe (0 = wg czasu)</label>
            <input type="number" id="c-points" min="0" max="8" value="0">
          </div>
          <div>
            <label>Życia (0 = nieograniczone)</label>
            <input type="number" id="c-lives" min="0" max="10" value="0">
          </div>
        </div>
        <div>
          <label>Opis</label>
          <input type="text" id="c-desc" placeholder="Krótki opis trybu" maxlength="127">
        </div>
        <button class="btn btn-start" onclick="addCustomMode()" style="max-width:200px;">➕ Dodaj Tryb</button>
      </div>
    </div>
    <div class="card">
      <h2>📝 Własne Tryby</h2>
      <div id="custom-modes-list"></div>
    </div>
  </div>
</div>

<div class="ws-status" id="ws-status">⚡ Łączenie...</div>

<script>
let ws = null;
let selectedMode = 0;
let statusInterval = null;
let allModes = [];

function initWS() {
  ws = new WebSocket('ws://' + location.hostname + ':81/');
  ws.onopen = () => {
    document.getElementById('ws-status').textContent = '🟢 Połączono';
    document.getElementById('ws-status').className = 'ws-status connected';
    clearInterval(statusInterval);
  };
  ws.onclose = () => {
    document.getElementById('ws-status').textContent = '🔴 Rozłączono';
    document.getElementById('ws-status').className = 'ws-status';
    setTimeout(initWS, 3000);
    statusInterval = setInterval(fetchStatus, 2000);
  };
  ws.onerror = () => {
    statusInterval = setInterval(fetchStatus, 2000);
  };
  ws.onmessage = (e) => {
    try { updateUI(JSON.parse(e.data)); } catch(ex) {}
  };
}

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
  if (name === 'scores') fetchScores();
  if (name === 'modes') renderModes();
  if (name === 'custom') fetchCustomModes();
}

function updateUI(data) {
  if (!data) return;
  document.getElementById('score-display').textContent = data.score || 0;
  const t = data.time_elapsed_sec || 0;
  const dur = data.game_duration_sec || 0;
  const remaining = dur > 0 ? Math.max(0, dur - t) : t;
  document.getElementById('timer-display').textContent = formatTime(dur > 0 ? remaining : t);
  document.getElementById('mode-name').textContent = data.mode_name || 'Brak';
  const statusEl = document.getElementById('game-status');
  if (data.game_running) {
    statusEl.textContent = 'Gra';
    statusEl.className = 'status-badge status-running';
  } else {
    statusEl.textContent = 'Zatrzymana';
    statusEl.className = 'status-badge status-stopped';
  }
  // Update LEDs
  for (let i = 1; i <= 8; i++) {
    const el = document.getElementById('led-' + i);
    el.className = 'led-btn';
    if (data.active_led === i) el.classList.add('active');
    if (data.hit_leds && data.hit_leds.includes(i)) el.classList.add('hit');
  }
  // Lives
  const livesContainer = document.getElementById('lives-container');
  if (data.lives_total > 0) {
    livesContainer.style.display = 'flex';
    livesContainer.innerHTML = '';
    for (let i = 0; i < data.lives_total; i++) {
      const l = document.createElement('span');
      l.className = 'life' + (i >= data.lives_remaining ? ' lost' : '');
      l.textContent = '❤️';
      livesContainer.appendChild(l);
    }
  } else {
    livesContainer.style.display = 'none';
  }
  // Reaction time
  if (data.avg_reaction_ms > 0) {
    const reEl = document.getElementById('reaction-display');
    reEl.style.display = 'block';
    reEl.textContent = '⚡ Śr. reakcja: ' + data.avg_reaction_ms + 'ms';
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return m + ':' + s;
}

function fetchStatus() {
  fetch('/api/status').then(r => r.json()).then(updateUI).catch(() => {});
}

function fetchModes() {
  fetch('/api/modes').then(r => r.json()).then(data => {
    allModes = data.modes || [];
    renderModes();
  }).catch(() => {});
}

function renderModes() {
  if (!allModes.length) { fetchModes(); return; }
  const grid = document.getElementById('modes-grid');
  grid.innerHTML = '';
  allModes.forEach(m => {
    const d = document.createElement('div');
    d.className = 'mode-card' + (m.id === selectedMode ? ' selected' : '');
    d.onclick = () => selectMode(m.id);
    d.innerHTML = `<div class="mode-name">${m.name}</div>
      <div class="mode-desc">${m.description}</div>
      <div class="mode-dur">${m.duration_sec > 0 ? '⏱ ' + formatTime(m.duration_sec) : '♾ Bez limitu'}</div>
      <span class="mode-type-badge">${m.type_name}</span>`;
    grid.appendChild(d);
  });
}

function selectMode(id) {
  selectedMode = id;
  fetch('/api/select_mode', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({mode_id: id})
  }).then(() => { renderModes(); showTab_direct('game'); });
}

function showTab_direct(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector('.tab').classList.add('active');
}

function startGame() {
  fetch('/api/start', {method:'POST'}).then(r => r.json()).then(updateUI);
}
function stopGame() {
  fetch('/api/stop', {method:'POST'}).then(r => r.json()).then(updateUI);
}
function resetGame() {
  fetch('/api/reset', {method:'POST'}).then(r => r.json()).then(updateUI);
}
function hitButton(n) {
  fetch('/api/hit', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({button: n})
  }).then(r => r.json()).then(updateUI);
}

function fetchScores() {
  fetch('/api/scores').then(r => r.json()).then(data => {
    const tbody = document.getElementById('scores-tbody');
    tbody.innerHTML = '';
    const scores = (data.scores || []).reverse();
    scores.forEach(s => {
      const tr = document.createElement('tr');
      const d = new Date(s.timestamp * 1000);
      tr.innerHTML = `<td>${d.toLocaleDateString('pl-PL')} ${d.toLocaleTimeString('pl-PL')}</td>
        <td>${s.mode_name}</td>
        <td>${s.score}</td>
        <td>${formatTime(Math.floor(s.duration_ms/1000))}</td>
        <td>${s.avg_reaction_ms > 0 ? s.avg_reaction_ms+'ms' : '-'}</td>`;
      tbody.appendChild(tr);
    });
    if (!scores.length) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#666;padding:20px;">Brak wyników</td></tr>';
  });
}

function addCustomMode() {
  const mode = {
    name: document.getElementById('c-name').value.trim(),
    description: document.getElementById('c-desc').value.trim(),
    type: parseInt(document.getElementById('c-type').value),
    duration_sec: parseInt(document.getElementById('c-duration').value),
    led_interval_ms: parseInt(document.getElementById('c-interval').value),
    target_points: parseInt(document.getElementById('c-points').value),
    lives: parseInt(document.getElementById('c-lives').value)
  };
  if (!mode.name) { alert('Podaj nazwę trybu'); return; }
  fetch('/api/custom_modes', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(mode)
  }).then(r => r.json()).then(d => {
    if (d.success) { alert('Tryb dodany!'); fetchCustomModes(); fetchModes(); }
    else alert('Błąd: ' + (d.error || 'Nieznany'));
  });
}

function fetchCustomModes() {
  fetch('/api/custom_modes').then(r => r.json()).then(data => {
    const list = document.getElementById('custom-modes-list');
    list.innerHTML = '';
    const modes = data.custom_modes || [];
    if (!modes.length) { list.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">Brak własnych trybów</p>'; return; }
    modes.forEach(m => {
      const d = document.createElement('div');
      d.className = 'mode-card';
      d.style.display = 'flex';
      d.style.justifyContent = 'space-between';
      d.style.alignItems = 'center';
      d.innerHTML = `<div>
        <div class="mode-name">${m.name}</div>
        <div class="mode-desc">${m.description}</div>
        <div class="mode-dur">${m.duration_sec > 0 ? '⏱ ' + formatTime(m.duration_sec) : '♾'}</div>
      </div>
      <button onclick="deleteCustomMode(${m.id})" style="background:#cc2233;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;">🗑</button>`;
      list.appendChild(d);
    });
  });
}

function deleteCustomMode(id) {
  if (!confirm('Usunąć ten tryb?')) return;
  fetch('/api/custom_modes/' + id, {method:'DELETE'})
    .then(r => r.json())
    .then(d => { if (d.success) { fetchCustomModes(); fetchModes(); } });
}

window.onload = () => {
  fetchModes();
  fetchStatus();
  initWS();
};
</script>
</body>
</html>
)rawliteral";

// ============================================================
// WiFi Handler Implementation (inline functions)
// ============================================================

inline void setupWiFi() {
    if (WIFI_AP_MODE) {
        WiFi.softAP(WIFI_SSID, WIFI_PASSWORD);
        Serial.print("AP IP: ");
        Serial.println(WiFi.softAPIP());
    } else {
        WiFi.begin(WIFI_STA_SSID, WIFI_STA_PASS);
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            attempts++;
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.print("WiFi IP: ");
            Serial.println(WiFi.localIP());
        } else {
            // Fallback to AP mode
            WiFi.softAP(WIFI_SSID, WIFI_PASSWORD);
        }
    }
}

inline void setupRoutes() {
    server.on("/", HTTP_GET, handleRoot);
    server.on("/api/status",        HTTP_GET,    handleGetStatus);
    server.on("/api/modes",         HTTP_GET,    handleGetModes);
    server.on("/api/start",         HTTP_POST,   handleStartGame);
    server.on("/api/stop",          HTTP_POST,   handleStopGame);
    server.on("/api/reset",         HTTP_POST,   handleResetGame);
    server.on("/api/scores",        HTTP_GET,    handleGetScores);
    server.on("/api/custom_modes",  HTTP_GET,    handleGetCustomModes);
    server.on("/api/custom_modes",  HTTP_POST,   handleAddCustomMode);
    server.on("/api/select_mode",   HTTP_POST,   handleSelectMode);
    server.onNotFound(handleNotFound);

    // DELETE for custom modes
    server.on("/api/custom_modes/0", HTTP_DELETE, []() { handleDeleteCustomMode(0); });
    server.on("/api/custom_modes/1", HTTP_DELETE, []() { handleDeleteCustomMode(1); });
    server.on("/api/custom_modes/2", HTTP_DELETE, []() { handleDeleteCustomMode(2); });
    server.on("/api/custom_modes/3", HTTP_DELETE, []() { handleDeleteCustomMode(3); });
    server.on("/api/custom_modes/4", HTTP_DELETE, []() { handleDeleteCustomMode(4); });
    server.on("/api/custom_modes/5", HTTP_DELETE, []() { handleDeleteCustomMode(5); });
    server.on("/api/custom_modes/6", HTTP_DELETE, []() { handleDeleteCustomMode(6); });
    server.on("/api/custom_modes/7", HTTP_DELETE, []() { handleDeleteCustomMode(7); });
    server.on("/api/custom_modes/8", HTTP_DELETE, []() { handleDeleteCustomMode(8); });
    server.on("/api/custom_modes/9", HTTP_DELETE, []() { handleDeleteCustomMode(9); });

    // Hit endpoint (for web testing)
    server.on("/api/hit", HTTP_POST, []() {
        if (!server.hasArg("plain")) { server.send(400, "application/json", "{\"error\":\"no body\"}"); return; }
        StaticJsonDocument<64> doc;
        if (deserializeJson(doc, server.arg("plain")) != DeserializationError::Ok) {
            server.send(400, "application/json", "{\"error\":\"json parse\"}"); return;
        }
        // Handled by main loop via WebSocket or polled
        server.send(200, "application/json", buildStatusJson());
    });
}

inline void handleRoot() {
    server.send_P(200, "text/html", INDEX_HTML);
}

inline void handleGetStatus() {
    server.send(200, "application/json", buildStatusJson());
}

inline void handleGetModes() {
    server.send(200, "application/json", buildModesJson());
}

inline void handleStartGame() {
    g_state.game_running = true;
    g_state.game_paused  = false;
    broadcastStatus();
    server.send(200, "application/json", buildStatusJson());
}

inline void handleStopGame() {
    g_state.game_running = false;
    broadcastStatus();
    server.send(200, "application/json", buildStatusJson());
}

inline void handleResetGame() {
    g_state.game_running    = false;
    g_state.game_paused     = false;
    g_state.score           = 0;
    g_state.time_elapsed_ms = 0;
    g_state.active_led      = 0;
    g_state.sequence_index  = 0;
    g_state.lives_remaining = PREDEFINED_MODES[g_state.current_mode_id < MAX_MODES ? g_state.current_mode_id : 0].lives;
    memset(g_state.hit_registered, 0, sizeof(g_state.hit_registered));
    g_state.total_reaction_ms = 0;
    g_state.reaction_count    = 0;
    broadcastStatus();
    server.send(200, "application/json", buildStatusJson());
}

inline void handleGetScores() {
    server.send(200, "application/json", buildScoresJson());
}

inline void handleGetCustomModes() {
    StaticJsonDocument<4096> doc;
    JsonArray arr = doc.createNestedArray("custom_modes");
    for (int i = 0; i < MAX_CUSTOM_MODES; i++) {
        if (g_custom_modes[i].active) {
            JsonObject m = arr.createNestedObject();
            m["id"]           = MAX_MODES + i;
            m["name"]         = g_custom_modes[i].mode.name;
            m["description"]  = g_custom_modes[i].mode.description;
            m["duration_sec"] = g_custom_modes[i].mode.duration_sec;
        }
    }
    String out;
    serializeJson(doc, out);
    server.send(200, "application/json", out);
}

inline void handleAddCustomMode() {
    if (!server.hasArg("plain")) { server.send(400, "application/json", "{\"error\":\"no body\"}"); return; }
    StaticJsonDocument<512> doc;
    if (deserializeJson(doc, server.arg("plain")) != DeserializationError::Ok) {
        server.send(400, "application/json", "{\"error\":\"parse error\"}"); return;
    }
    // Find free slot
    int slot = -1;
    for (int i = 0; i < MAX_CUSTOM_MODES; i++) {
        if (!g_custom_modes[i].active) { slot = i; break; }
    }
    if (slot < 0) { server.send(400, "application/json", "{\"error\":\"no free slots\"}"); return; }

    g_custom_modes[slot].active = true;
    g_custom_modes[slot].mode.id = MAX_MODES + slot;
    strlcpy(g_custom_modes[slot].mode.name,        doc["name"]        | "Custom", 32);
    strlcpy(g_custom_modes[slot].mode.description, doc["description"] | "", 128);
    g_custom_modes[slot].mode.type            = (ModeType)(int)(doc["type"] | 0);
    g_custom_modes[slot].mode.duration_sec    = doc["duration_sec"]    | 60;
    g_custom_modes[slot].mode.led_interval_ms = doc["led_interval_ms"] | 500;
    g_custom_modes[slot].mode.target_points   = doc["target_points"]   | 0;
    g_custom_modes[slot].mode.lives           = doc["lives"]           | 0;
    g_custom_modes[slot].mode.timed           = g_custom_modes[slot].mode.duration_sec > 0;
    g_custom_modes[slot].mode.random_order    = (g_custom_modes[slot].mode.type == MODE_RANDOM);
    g_custom_modes[slot].mode.sequential      = (g_custom_modes[slot].mode.type == MODE_SEQUENTIAL);

    // Persist to NVS
    prefs.begin(PREFERENCES_NS, false);
    String key = "cm_" + String(slot);
    prefs.putString(key.c_str(), server.arg("plain"));
    prefs.end();

    server.send(200, "application/json", "{\"success\":true,\"slot\":" + String(slot) + "}");
}

inline void handleDeleteCustomMode(int id) {
    int slot = id - MAX_MODES;
    if (slot < 0 || slot >= MAX_CUSTOM_MODES) {
        server.send(400, "application/json", "{\"error\":\"invalid id\"}"); return;
    }
    g_custom_modes[slot].active = false;
    prefs.begin(PREFERENCES_NS, false);
    String key = "cm_" + String(slot);
    prefs.remove(key.c_str());
    prefs.end();
    server.send(200, "application/json", "{\"success\":true}");
}

inline void handleSelectMode(void) {
    if (!server.hasArg("plain")) { server.send(400, "application/json", "{\"error\":\"no body\"}"); return; }
    StaticJsonDocument<64> doc;
    if (deserializeJson(doc, server.arg("plain")) != DeserializationError::Ok) {
        server.send(400, "application/json", "{\"error\":\"parse\"}"); return;
    }
    uint8_t modeId = doc["mode_id"] | 0;
    g_state.current_mode_id = modeId;
    g_state.game_running    = false;
    g_state.score           = 0;
    g_state.time_elapsed_ms = 0;
    g_state.active_led      = 0;
    if (modeId < MAX_MODES) {
        g_state.game_duration_ms    = (uint32_t)PREDEFINED_MODES[modeId].duration_sec * 1000;
        g_state.lives_remaining     = PREDEFINED_MODES[modeId].lives;
        g_state.current_interval_ms = PREDEFINED_MODES[modeId].led_interval_ms;
        strlcpy(g_state.mode_name, PREDEFINED_MODES[modeId].name, 32);
    } else {
        int slot = modeId - MAX_MODES;
        if (slot >= 0 && slot < MAX_CUSTOM_MODES && g_custom_modes[slot].active) {
            g_state.game_duration_ms    = (uint32_t)g_custom_modes[slot].mode.duration_sec * 1000;
            g_state.lives_remaining     = g_custom_modes[slot].mode.lives;
            g_state.current_interval_ms = g_custom_modes[slot].mode.led_interval_ms;
            strlcpy(g_state.mode_name, g_custom_modes[slot].mode.name, 32);
        }
    }
    server.send(200, "application/json", "{\"success\":true}");
}

inline void handleNotFound() {
    server.send(404, "application/json", "{\"error\":\"not found\"}");
}

inline void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    if (type == WStype_CONNECTED) {
        // Send current status on connect
        String json = buildStatusJson();
        webSocket.sendTXT(num, json);
    }
}

inline void broadcastStatus() {
    String json = buildStatusJson();
    webSocket.broadcastTXT(json);
}

static const char* modeTypeName(ModeType t) {
    switch (t) {
        case MODE_QUICK_HITS:  return "Szybkie";
        case MODE_SLOW_HITS:   return "Wolne";
        case MODE_TRAINING:    return "Trening";
        case MODE_SEQUENTIAL:  return "Sekwencja";
        case MODE_RANDOM:      return "Losowe";
        case MODE_ENDURANCE:   return "Wytrzymałość";
        case MODE_SPEED_ROUND: return "Blitz";
        case MODE_PRECISION:   return "Precyzja";
        case MODE_COUNTDOWN:   return "Odliczanie";
        case MODE_RELAY:       return "Relay";
        case MODE_CHALLENGE:   return "Wyzwanie";
        case MODE_SURVIVAL:    return "Survival";
        case MODE_CUSTOM:      return "Własny";
        case MODE_BLITZ:       return "Blitz";
        case MODE_REACTION:    return "Reakcja";
        default:               return "Inny";
    }
}

inline String buildStatusJson() {
    StaticJsonDocument<512> doc;
    doc["score"]            = g_state.score;
    doc["time_elapsed_sec"] = g_state.time_elapsed_ms / 1000;
    doc["game_duration_sec"]= g_state.game_duration_ms / 1000;
    doc["game_running"]     = g_state.game_running;
    doc["game_paused"]      = g_state.game_paused;
    doc["active_led"]       = g_state.active_led;
    doc["mode_name"]        = g_state.mode_name;
    doc["mode_id"]          = g_state.current_mode_id;
    doc["lives_remaining"]  = g_state.lives_remaining;

    uint8_t totalLives = 0;
    if (g_state.current_mode_id < MAX_MODES)
        totalLives = PREDEFINED_MODES[g_state.current_mode_id].lives;
    else {
        int slot = g_state.current_mode_id - MAX_MODES;
        if (slot >= 0 && slot < MAX_CUSTOM_MODES && g_custom_modes[slot].active)
            totalLives = g_custom_modes[slot].mode.lives;
    }
    doc["lives_total"] = totalLives;
    doc["avg_reaction_ms"] = g_state.reaction_count > 0
        ? g_state.total_reaction_ms / g_state.reaction_count : 0;

    JsonArray hits = doc.createNestedArray("hit_leds");
    for (int i = 0; i < MAX_POINTS; i++) {
        if (g_state.hit_registered[i]) hits.add(i + 1);
    }
    String out;
    serializeJson(doc, out);
    return out;
}

inline String buildModesJson() {
    DynamicJsonDocument doc(4096);
    JsonArray arr = doc.createNestedArray("modes");

    for (int i = 0; i < MAX_MODES; i++) {
        JsonObject m = arr.createNestedObject();
        m["id"]           = PREDEFINED_MODES[i].id;
        m["name"]         = PREDEFINED_MODES[i].name;
        m["description"]  = PREDEFINED_MODES[i].description;
        m["duration_sec"] = PREDEFINED_MODES[i].duration_sec;
        m["type_name"]    = modeTypeName(PREDEFINED_MODES[i].type);
        m["lives"]        = PREDEFINED_MODES[i].lives;
        m["custom"]       = false;
    }
    for (int i = 0; i < MAX_CUSTOM_MODES; i++) {
        if (g_custom_modes[i].active) {
            JsonObject m = arr.createNestedObject();
            m["id"]           = MAX_MODES + i;
            m["name"]         = g_custom_modes[i].mode.name;
            m["description"]  = g_custom_modes[i].mode.description;
            m["duration_sec"] = g_custom_modes[i].mode.duration_sec;
            m["type_name"]    = modeTypeName(g_custom_modes[i].mode.type);
            m["lives"]        = g_custom_modes[i].mode.lives;
            m["custom"]       = true;
        }
    }
    String out;
    serializeJson(doc, out);
    return out;
}

inline String buildScoresJson() {
    DynamicJsonDocument doc(8192);
    JsonArray arr = doc.createNestedArray("scores");
    for (int i = 0; i < g_score_count; i++) {
        JsonObject s = arr.createNestedObject();
        s["timestamp"]      = g_scores[i].timestamp;
        s["mode_id"]        = g_scores[i].mode_id;
        s["mode_name"]      = g_scores[i].mode_name;
        s["score"]          = g_scores[i].score;
        s["duration_ms"]    = g_scores[i].duration_ms;
        s["avg_reaction_ms"]= g_scores[i].avg_reaction_ms;
    }
    String out;
    serializeJson(doc, out);
    return out;
}

inline void loadCustomModes() {
    prefs.begin(PREFERENCES_NS, true);
    for (int i = 0; i < MAX_CUSTOM_MODES; i++) {
        String key = "cm_" + String(i);
        if (prefs.isKey(key.c_str())) {
            String json = prefs.getString(key.c_str(), "");
            if (json.length() > 0) {
                StaticJsonDocument<512> doc;
                if (deserializeJson(doc, json) == DeserializationError::Ok) {
                    g_custom_modes[i].active = true;
                    g_custom_modes[i].mode.id = MAX_MODES + i;
                    strlcpy(g_custom_modes[i].mode.name,        doc["name"]        | "Custom", 32);
                    strlcpy(g_custom_modes[i].mode.description, doc["description"] | "", 128);
                    g_custom_modes[i].mode.type            = (ModeType)(int)(doc["type"] | 0);
                    g_custom_modes[i].mode.duration_sec    = doc["duration_sec"]    | 60;
                    g_custom_modes[i].mode.led_interval_ms = doc["led_interval_ms"] | 500;
                    g_custom_modes[i].mode.target_points   = doc["target_points"]   | 0;
                    g_custom_modes[i].mode.lives           = doc["lives"]           | 0;
                    g_custom_modes[i].mode.timed           = g_custom_modes[i].mode.duration_sec > 0;
                }
            }
        }
    }
    prefs.end();
}

#endif // WIFI_HANDLER_H
