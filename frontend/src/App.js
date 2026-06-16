import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

// ============================================================
// Utility: format seconds as MM:SS
// ============================================================
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ============================================================
// useWebSocket hook
// ============================================================
function useWebSocket(onMessage) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const wsUrl = process.env.REACT_APP_WS_URL ||
      (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
      window.location.host + '/ws';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen  = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); } catch (_) {}
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => { wsRef.current && wsRef.current.close(); };
  }, [connect]);

  return connected;
}

// ============================================================
// Pages
// ============================================================

// --- Game Page ---
function GamePage({ espUrl }) {
  const [status, setStatus] = useState({
    score: 0, game_running: false, active_led: 0,
    time_elapsed_sec: 0, game_duration_sec: 60,
    mode_name: 'Brak', lives_remaining: 0, lives_total: 0,
    avg_reaction_ms: 0, hit_leds: [],
  });
  const [selectedMode, setSelectedMode] = useState(null);

  const handleWsMessage = useCallback((msg) => {
    if (msg.score !== undefined) setStatus(msg);
  }, []);
  const wsConnected = useWebSocket(handleWsMessage);

  const fetchStatus = useCallback(() => {
    const url = espUrl ? `http://${espUrl}/api/status` : `${API}/api/esp/status`;
    axios.get(url).then(r => { if (r.data.score !== undefined) setStatus(r.data); }).catch(() => {});
  }, [espUrl]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 2000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const cmd = useCallback((action) => {
    const url = espUrl ? `http://${espUrl}/api/${action}` : `${API}/api/esp/command`;
    if (espUrl) {
      axios.post(url).then(r => { if (r.data.score !== undefined) setStatus(r.data); });
    } else {
      axios.post(url, { command: action }).catch(() => {});
    }
  }, [espUrl]);

  const remaining = status.game_duration_sec > 0
    ? Math.max(0, status.game_duration_sec - status.time_elapsed_sec)
    : status.time_elapsed_sec;

  return (
    <div>
      {/* Scoreboard */}
      <div className="card">
        <h2 className="card-title">📊 Tablica</h2>
        <div className="scoreboard">
          <div>
            <div className="score-value">{status.score}</div>
            <div className="score-label">Punkty</div>
          </div>
          <div>
            <div className="timer-value">{formatTime(remaining)}</div>
            <div className="score-label">{status.game_duration_sec > 0 ? 'Pozostało' : 'Czas gry'}</div>
          </div>
        </div>

        {status.lives_total > 0 && (
          <div className="lives">
            {Array.from({ length: status.lives_total }, (_, i) => (
              <span key={i} className={i >= status.lives_remaining ? 'life-lost' : ''}>❤️</span>
            ))}
          </div>
        )}
        {status.avg_reaction_ms > 0 && (
          <div className="reaction-display">⚡ Śr. reakcja: {status.avg_reaction_ms}ms</div>
        )}
      </div>

      {/* LED Grid */}
      <div className="card">
        <h2 className="card-title">💡 Punkty / LEDy</h2>
        <div className="led-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => {
            const isActive = status.active_led === n;
            const isHit    = status.hit_leds && status.hit_leds.includes(n);
            return (
              <button
                key={n}
                className={`led-button${isActive ? ' active' : ''}${isHit ? ' hit' : ''}`}
                onClick={() => cmd(`hit?btn=${n}`)}
                aria-label={`Punkt ${n}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <h2 className="card-title">🎛 Sterowanie</h2>
        <div style={{ marginBottom: '12px' }}>
          <span className="score-label">Tryb: </span>
          <strong style={{ color: '#88aaff' }}>{status.mode_name}</strong>
          <span
            className={`badge ${status.game_running ? 'badge-running' : 'badge-stopped'}`}
            style={{ marginLeft: '10px' }}
          >
            {status.game_running ? 'Gra trwa' : 'Zatrzymana'}
          </span>
        </div>
        <div className="controls">
          <button className="btn btn-start" onClick={() => cmd('start')}>▶ START</button>
          <button className="btn btn-stop"  onClick={() => cmd('stop')}>⏸ STOP</button>
          <button className="btn btn-reset" onClick={() => cmd('reset')}>↺ RESET</button>
        </div>
        <div className="info-box" style={{ marginTop: '14px' }}>
          <strong>Połączenie WebSocket:</strong>{' '}
          <span style={{ color: wsConnected ? '#44ff88' : '#ff6666' }}>
            {wsConnected ? '🟢 Połączono' : '🔴 Rozłączono (polling aktywny)'}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Modes Page ---
function ModesPage({ espUrl }) {
  const [modes, setModes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetchModes = useCallback(() => {
    const url = espUrl ? `http://${espUrl}/api/modes` : `${API}/api/modes`;
    axios.get(url)
      .then(r => { setModes(r.data.modes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [espUrl]);

  useEffect(() => { fetchModes(); }, [fetchModes]);

  const selectMode = (mode) => {
    setSelected(mode.id);
    const url = espUrl ? `http://${espUrl}/api/select_mode` : `${API}/api/esp/command`;
    const body = espUrl ? { mode_id: mode.id } : { command: 'select_mode', params: { mode_id: mode.id } };
    axios.post(url, body)
      .then(() => { setAlert({ type: 'success', msg: `Wybrano: ${mode.name}` }); setTimeout(() => setAlert(null), 3000); })
      .catch(() => setAlert({ type: 'error', msg: 'Błąd wyboru trybu' }));
  };

  if (loading) return <div className="loading">Ładowanie trybów...</div>;

  return (
    <div>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
      <div className="card">
        <h2 className="card-title">📋 Wybierz Tryb Gry ({modes.length} trybów)</h2>
        <div className="mode-grid">
          {modes.map(m => (
            <div
              key={m.id}
              className={`mode-card${selected === m.id ? ' selected' : ''}`}
              onClick={() => selectMode(m)}
            >
              <div className="mode-name">{m.name}</div>
              <div className="mode-desc">{m.description}</div>
              <div className="mode-meta">
                <span className="mode-dur">
                  {m.duration_sec > 0 ? `⏱ ${formatTime(m.duration_sec)}` : '♾ Bez limitu'}
                </span>
                <span className={`badge ${m.is_custom || m.custom ? 'badge-custom' : 'badge-builtin'}`}>
                  {m.is_custom || m.custom ? 'własny' : 'wbudowany'}
                </span>
                {m.lives > 0 && <span className="badge" style={{ background: '#2a1a1a', color: '#ff8888' }}>{m.lives}❤️</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Scores Page ---
function ScoresPage() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/scores?limit=50`)
      .then(r => { setScores(r.data.scores || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Ładowanie wyników...</div>;

  return (
    <div className="card">
      <h2 className="card-title">🏆 Historia Wyników</h2>
      {scores.length === 0 ? (
        <div className="empty-state">Brak zapisanych wyników</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Gracz</th>
                <th>Tryb</th>
                <th>Punkty</th>
                <th>Czas</th>
                <th>Śr. Reakcja</th>
              </tr>
            </thead>
            <tbody>
              {scores.map(s => (
                <tr key={s.id}>
                  <td>{new Date(s.played_at).toLocaleString('pl-PL')}</td>
                  <td>{s.player_name}</td>
                  <td>{s.mode_name}</td>
                  <td><strong style={{ color: '#ffdd00' }}>{s.score}</strong></td>
                  <td>{formatTime(Math.floor(s.duration_ms / 1000))}</td>
                  <td>{s.avg_reaction_ms > 0 ? `${s.avg_reaction_ms}ms` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Rankings Page ---
function RankingsPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/rankings?limit=20`)
      .then(r => { setRankings(r.data.rankings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Ładowanie rankingów...</div>;

  return (
    <div className="card">
      <h2 className="card-title">🥇 Ranking Globalny</h2>
      {rankings.length === 0 ? (
        <div className="empty-state">Brak danych rankingowych</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Gracz</th>
                <th>Tryb</th>
                <th>Najlepszy Wynik</th>
                <th>Naj. Reakcja</th>
                <th>Gry</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, i) => (
                <tr key={i}>
                  <td><span className="rank-pos">{i + 1}</span></td>
                  <td>{r.player_name}</td>
                  <td>{r.mode_name}</td>
                  <td><strong style={{ color: '#ffdd00' }}>{r.best_score}</strong></td>
                  <td>{r.best_reaction_ms > 0 ? `${r.best_reaction_ms}ms` : '-'}</td>
                  <td>{r.games_played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Custom Mode Form ---
function CustomModePage({ onModeAdded }) {
  const [form, setForm] = useState({
    name: '', description: '', type: 'quick_hits',
    duration_sec: 60, led_interval_ms: 500,
    target_points: 0, lives: 0,
  });
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setAlert({ type: 'error', msg: 'Podaj nazwę trybu' }); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/modes`, form);
      setAlert({ type: 'success', msg: `Tryb "${form.name}" dodany pomyślnie!` });
      setForm({ name: '', description: '', type: 'quick_hits', duration_sec: 60, led_interval_ms: 500, target_points: 0, lives: 0 });
      if (onModeAdded) onModeAdded();
    } catch (err) {
      const msg = err.response?.data?.error || 'Błąd zapisu trybu';
      setAlert({ type: 'error', msg });
    } finally {
      setSubmitting(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">➕ Dodaj Własny Tryb</h2>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-row">
          <div className="form-group">
            <label>Nazwa trybu *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Mój Tryb" maxLength={64} required />
          </div>
          <div className="form-group">
            <label>Typ</label>
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="quick_hits">Szybkie Trafienia</option>
              <option value="slow_hits">Wolne z Przyspieszeniem</option>
              <option value="training">Trening (bez limitu)</option>
              <option value="sequential">Sekwencyjne</option>
              <option value="random">Losowe</option>
              <option value="blitz">Blitz</option>
              <option value="survival">Survival</option>
              <option value="reaction">Test Reakcji</option>
              <option value="custom">Własny</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Opis</label>
          <input name="description" value={form.description} onChange={handleChange} placeholder="Krótki opis..." maxLength={256} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Czas (sekundy, 0 = bez limitu)</label>
            <input name="duration_sec" type="number" value={form.duration_sec} onChange={handleChange} min={0} max={600} />
          </div>
          <div className="form-group">
            <label>Interwał LED (ms)</label>
            <input name="led_interval_ms" type="number" value={form.led_interval_ms} onChange={handleChange} min={100} max={10000} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Punkty docelowe (0 = wg czasu)</label>
            <input name="target_points" type="number" value={form.target_points} onChange={handleChange} min={0} max={8} />
          </div>
          <div className="form-group">
            <label>Życia (0 = nieograniczone)</label>
            <input name="lives" type="number" value={form.lives} onChange={handleChange} min={0} max={10} />
          </div>
        </div>
        <div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ maxWidth: '200px' }}>
            {submitting ? '⏳ Zapisuję...' : '➕ Dodaj Tryb'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Settings Page ---
function SettingsPage({ espUrl, setEspUrl }) {
  const [input, setInput] = useState(espUrl || '192.168.4.1');
  const [saved, setSaved] = useState(false);

  const save = () => {
    setEspUrl(input);
    localStorage.setItem('fance_esp_url', input);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title">⚙ Ustawienia</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Adres IP ESP32 (gdy podłączony do sieci Fance_AP)</label>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="192.168.4.1"
            />
          </div>
          <div>
            <button className="btn btn-primary btn-sm" onClick={save} style={{ marginTop: '4px' }}>
              {saved ? '✅ Zapisano' : '💾 Zapisz'}
            </button>
          </div>
        </div>
        <div className="info-box">
          <strong>Jak się połączyć z ESP32:</strong><br />
          1. Podłącz telefon/komputer do sieci WiFi: <strong>Fance_AP</strong><br />
          2. Hasło: <strong>fance1234</strong><br />
          3. Otwórz przeglądarkę pod adresem: <strong>http://192.168.4.1</strong><br />
          <br />
          <strong>Alternatywnie</strong> (serwer backendowy):<br />
          Wyzeruj pole adresu IP ESP32 i używaj serwera Node.js pod portem 3001.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main App Component
// ============================================================
function App() {
  const [page, setPage] = useState('game');
  const [espUrl, setEspUrl] = useState(
    () => localStorage.getItem('fance_esp_url') || ''
  );

  const nav = (p) => setPage(p);

  const pages = {
    game:     <GamePage espUrl={espUrl} />,
    modes:    <ModesPage espUrl={espUrl} />,
    scores:   <ScoresPage />,
    rankings: <RankingsPage />,
    custom:   <CustomModePage onModeAdded={() => nav('modes')} />,
    settings: <SettingsPage espUrl={espUrl} setEspUrl={setEspUrl} />,
  };

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-logo">⚔ FANCE</div>
        <div className="nav-links">
          {[
            { id: 'game',     label: '🎮 Gra' },
            { id: 'modes',    label: '📋 Tryby' },
            { id: 'scores',   label: '🏆 Wyniki' },
            { id: 'rankings', label: '🥇 Ranking' },
            { id: 'custom',   label: '➕ Własne' },
            { id: 'settings', label: '⚙' },
          ].map(link => (
            <button
              key={link.id}
              className={`nav-link${page === link.id ? ' active' : ''}`}
              onClick={() => nav(link.id)}
            >
              {link.label}
            </button>
          ))}
        </div>
        <div className={`nav-status${espUrl ? ' connected' : ''}`}>
          {espUrl ? `ESP: ${espUrl}` : 'Backend API'}
        </div>
      </nav>
      <main className="main-content">
        {pages[page]}
      </main>
    </div>
  );
}

export default App;
