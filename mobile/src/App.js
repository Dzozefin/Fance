// ============================================================
// FANCE Mobile PWA - App Component
// Optimised for touch screens and offline use
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ============================================================
// Styles (inline for single-file simplicity)
// ============================================================
const S = {
    app: { minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: 'system-ui, sans-serif', userSelect: 'none' },
    header: { background: 'linear-gradient(135deg,#1a1a3e,#2d2d6b)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #4444ff', position: 'sticky', top: 0, zIndex: 100 },
    title: { fontSize: '1.3rem', fontWeight: 'bold', color: '#88aaff', letterSpacing: '3px' },
    tabs: { display: 'flex', background: '#0d0d22', borderBottom: '1px solid #1a1a35' },
    tab: (active) => ({ flex: 1, padding: '12px 4px', textAlign: 'center', cursor: 'pointer', color: active ? '#88aaff' : '#666', borderBottom: active ? '2px solid #4444ff' : '2px solid transparent', fontSize: '0.75rem', transition: 'all 0.2s' }),
    content: { padding: '16px', maxWidth: '480px', margin: '0 auto' },
    card: { background: '#13132a', border: '1px solid #2a2a5a', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    cardTitle: { color: '#88aaff', fontSize: '1rem', marginBottom: '12px', borderBottom: '1px solid #2a2a5a', paddingBottom: '8px' },
    scoreBig: { fontSize: '5rem', fontWeight: 'bold', color: '#ffdd00', textAlign: 'center', textShadow: '0 0 20px rgba(255,220,0,0.5)', lineHeight: 1 },
    timerBig: { fontSize: '3rem', fontWeight: 'bold', color: '#44ff88', textAlign: 'center', fontFamily: 'monospace', textShadow: '0 0 15px rgba(68,255,136,0.4)', lineHeight: 1 },
    label: { color: '#aaaacc', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', marginTop: '4px' },
    ledGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '12px 0' },
    ledOff: { aspectRatio: '1', borderRadius: '50%', border: '3px solid #333', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#555', cursor: 'pointer', transition: 'all 0.15s' },
    ledActive: { aspectRatio: '1', borderRadius: '50%', border: '3px solid #ffff44', background: '#ffdd00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#000', cursor: 'pointer', boxShadow: '0 0 25px rgba(255,220,0,0.9)' },
    ledHit: { aspectRatio: '1', borderRadius: '50%', border: '3px solid #44ff88', background: '#22cc66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#000', cursor: 'pointer', boxShadow: '0 0 15px rgba(68,255,136,0.7)' },
    btnRow: { display: 'flex', gap: '8px' },
    btnStart: { flex: 1, padding: '14px', border: 'none', borderRadius: '10px', background: '#22cc55', color: '#000', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', touchAction: 'manipulation' },
    btnStop: { flex: 1, padding: '14px', border: 'none', borderRadius: '10px', background: '#cc2233', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', touchAction: 'manipulation' },
    btnReset: { flex: 1, padding: '14px', border: 'none', borderRadius: '10px', background: '#444466', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', touchAction: 'manipulation' },
    modeCard: (sel) => ({ background: sel ? '#1f1f45' : '#1a1a35', border: `1px solid ${sel ? '#88aaff' : '#333366'}`, borderRadius: '8px', padding: '12px', marginBottom: '8px', cursor: 'pointer', touchAction: 'manipulation' }),
    modeName: { fontWeight: 'bold', color: '#ccddff', marginBottom: '4px' },
    modeDesc: { color: '#666699', fontSize: '0.8rem' },
    modeDur: { color: '#44aaff', fontSize: '0.78rem', marginTop: '6px' },
    scoreRow: { padding: '10px 0', borderBottom: '1px solid #1a1a35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    formGroup: { marginBottom: '12px' },
    formLabel: { display: 'block', color: '#aaaacc', fontSize: '0.8rem', marginBottom: '4px' },
    formInput: { width: '100%', padding: '10px 12px', background: '#0d0d22', border: '1px solid #2a2a5a', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', boxSizing: 'border-box' },
    badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', background: color || '#222255', color: '#88aaff', marginLeft: '6px' }),
    wsStatus: { fontSize: '0.7rem', color: '#666' },
    lives: { display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '8px', fontSize: '1.2rem' },
    reaction: { textAlign: 'center', color: '#ffaa44', fontWeight: 'bold', fontSize: '1.2rem', padding: '8px' },
    alert: (type) => ({ padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem', background: type === 'success' ? '#162a1e' : '#2a1616', border: `1px solid ${type === 'success' ? '#33cc66' : '#cc3333'}`, color: type === 'success' ? '#88ffaa' : '#ff8888' }),
    infoBox: { background: '#0d0d22', border: '1px solid #2a2a5a', borderRadius: '8px', padding: '12px', fontSize: '0.82rem', color: '#8888bb', marginTop: '12px' },
};

// ============================================================
// Helpers
// ============================================================
const API = process.env.REACT_APP_API_URL || '';

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function useEspUrl() {
    const [url, setUrl] = useState(() => localStorage.getItem('fance_esp_url') || '');
    const save = (v) => { setUrl(v); localStorage.setItem('fance_esp_url', v); };
    return [url, save];
}

// ============================================================
// Game Tab
// ============================================================
function GameTab({ espUrl }) {
    const [status, setStatus] = useState({
        score: 0, game_running: false, active_led: 0,
        time_elapsed_sec: 0, game_duration_sec: 60,
        mode_name: '-', lives_remaining: 0, lives_total: 0,
        avg_reaction_ms: 0, hit_leds: [],
    });

    const fetchStatus = useCallback(() => {
        const url = espUrl ? `http://${espUrl}/api/status` : `${API}/api/esp/status`;
        axios.get(url)
            .then(r => { if (r.data.score !== undefined) setStatus(r.data); })
            .catch(() => {});
    }, [espUrl]);

    useEffect(() => {
        fetchStatus();
        const id = setInterval(fetchStatus, 1500);
        return () => clearInterval(id);
    }, [fetchStatus]);

    const cmd = (action) => {
        const url = espUrl ? `http://${espUrl}/api/${action}` : `${API}/api/esp/command`;
        if (espUrl) {
            axios.post(url).then(r => { if (r.data.score !== undefined) setStatus(r.data); }).catch(() => {});
        } else {
            axios.post(url, { command: action }).catch(() => {});
        }
    };

    const remaining = status.game_duration_sec > 0
        ? Math.max(0, status.game_duration_sec - status.time_elapsed_sec)
        : status.time_elapsed_sec;

    return (
        <div>
            {/* Score & Timer */}
            <div style={S.card}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
                    <div>
                        <div style={S.scoreBig}>{status.score}</div>
                        <div style={S.label}>Punkty</div>
                    </div>
                    <div>
                        <div style={S.timerBig}>{formatTime(remaining)}</div>
                        <div style={S.label}>{status.game_duration_sec > 0 ? 'Pozostało' : 'Czas'}</div>
                    </div>
                </div>
                {status.lives_total > 0 && (
                    <div style={S.lives}>
                        {Array.from({ length: status.lives_total }, (_, i) => (
                            <span key={i} style={{ opacity: i >= status.lives_remaining ? 0.25 : 1 }}>❤️</span>
                        ))}
                    </div>
                )}
                {status.avg_reaction_ms > 0 && (
                    <div style={S.reaction}>⚡ {status.avg_reaction_ms}ms</div>
                )}
            </div>

            {/* LEDs */}
            <div style={S.card}>
                <div style={S.cardTitle}>💡 Punkty</div>
                <div style={S.ledGrid}>
                    {[1,2,3,4,5,6,7,8].map(n => {
                        const isActive = status.active_led === n;
                        const isHit    = (status.hit_leds || []).includes(n);
                        const style    = isActive ? S.ledActive : isHit ? S.ledHit : S.ledOff;
                        return (
                            <div key={n} style={style} onClick={() => cmd(`hit?btn=${n}`)} role="button" aria-label={`Punkt ${n}`}>
                                {n}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Controls */}
            <div style={S.card}>
                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#88aaff', fontWeight: 'bold' }}>{status.mode_name}</span>
                    <span style={S.badge(status.game_running ? '#224433' : '#332222')}
                          dangerouslySetInnerHTML={{ __html: status.game_running ? '🟢 Gra' : '🔴 Stop' }} />
                </div>
                <div style={S.btnRow}>
                    <button style={S.btnStart} onClick={() => cmd('start')}>▶ START</button>
                    <button style={S.btnStop}  onClick={() => cmd('stop')}>⏸ STOP</button>
                    <button style={S.btnReset} onClick={() => cmd('reset')}>↺</button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Modes Tab
// ============================================================
function ModesTab({ espUrl }) {
    const [modes, setModes] = useState([]);
    const [selected, setSelected] = useState(null);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        const url = espUrl ? `http://${espUrl}/api/modes` : `${API}/api/modes`;
        axios.get(url).then(r => setModes(r.data.modes || [])).catch(() => {});
    }, [espUrl]);

    const selectMode = (m) => {
        setSelected(m.id);
        const url = espUrl ? `http://${espUrl}/api/select_mode` : `${API}/api/esp/command`;
        const body = espUrl ? { mode_id: m.id } : { command: 'select_mode', params: { mode_id: m.id } };
        axios.post(url, body)
            .then(() => { setAlert({ type: 'success', msg: `✓ ${m.name}` }); setTimeout(() => setAlert(null), 2000); })
            .catch(() => setAlert({ type: 'error', msg: 'Błąd połączenia' }));
    };

    return (
        <div>
            {alert && <div style={S.alert(alert.type)}>{alert.msg}</div>}
            <div style={S.card}>
                <div style={S.cardTitle}>📋 Tryby Gry ({modes.length})</div>
                {modes.map(m => (
                    <div key={m.id} style={S.modeCard(selected === m.id)} onClick={() => selectMode(m)}>
                        <div style={S.modeName}>
                            {m.name}
                            {(m.is_custom || m.custom) && <span style={S.badge()}>własny</span>}
                        </div>
                        <div style={S.modeDesc}>{m.description}</div>
                        <div style={S.modeDur}>
                            {m.duration_sec > 0 ? `⏱ ${formatTime(m.duration_sec)}` : '♾ Bez limitu'}
                            {m.lives > 0 && ` · ${m.lives}❤️`}
                        </div>
                    </div>
                ))}
                {modes.length === 0 && <div style={{ color: '#555', textAlign: 'center', padding: '20px' }}>Brak trybów</div>}
            </div>
        </div>
    );
}

// ============================================================
// Scores Tab
// ============================================================
function ScoresTab() {
    const [scores, setScores] = useState([]);

    useEffect(() => {
        axios.get(`${API}/api/scores?limit=30`)
            .then(r => setScores(r.data.scores || []))
            .catch(() => {});
    }, []);

    return (
        <div style={S.card}>
            <div style={S.cardTitle}>🏆 Wyniki</div>
            {scores.length === 0 && <div style={{ color: '#555', textAlign: 'center', padding: '20px' }}>Brak wyników</div>}
            {scores.map(s => (
                <div key={s.id} style={S.scoreRow}>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#ccddff', fontSize: '0.9rem' }}>{s.mode_name}</div>
                        <div style={{ color: '#555577', fontSize: '0.75rem' }}>{s.player_name} · {new Date(s.played_at).toLocaleDateString('pl-PL')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#ffdd00', fontWeight: 'bold', fontSize: '1.2rem' }}>{s.score}</div>
                        <div style={{ color: '#44aaff', fontSize: '0.75rem' }}>{formatTime(Math.floor(s.duration_ms / 1000))}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================
// Add Custom Mode Tab
// ============================================================
function AddModeTab() {
    const [form, setForm] = useState({ name: '', description: '', type: 'quick_hits', duration_sec: 60, led_interval_ms: 500, target_points: 0, lives: 0 });
    const [alert, setAlert] = useState(null);

    const onChange = e => {
        const { name, value, type } = e.target;
        setForm(p => ({ ...p, [name]: type === 'number' ? Number(value) : value }));
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setAlert({ type: 'error', msg: 'Podaj nazwę' }); return; }
        try {
            await axios.post(`${API}/api/modes`, form);
            setAlert({ type: 'success', msg: `✓ Tryb "${form.name}" dodany!` });
            setForm({ name: '', description: '', type: 'quick_hits', duration_sec: 60, led_interval_ms: 500, target_points: 0, lives: 0 });
        } catch (err) {
            setAlert({ type: 'error', msg: err.response?.data?.error || 'Błąd' });
        }
        setTimeout(() => setAlert(null), 4000);
    };

    return (
        <div style={S.card}>
            <div style={S.cardTitle}>➕ Nowy Tryb</div>
            {alert && <div style={S.alert(alert.type)}>{alert.msg}</div>}
            <form onSubmit={submit}>
                <div style={S.formGroup}>
                    <label style={S.formLabel}>Nazwa *</label>
                    <input style={S.formInput} name="name" value={form.name} onChange={onChange} placeholder="Mój Tryb" maxLength={64} required />
                </div>
                <div style={S.formGroup}>
                    <label style={S.formLabel}>Typ</label>
                    <select style={S.formInput} name="type" value={form.type} onChange={onChange}>
                        <option value="quick_hits">Szybkie Trafienia</option>
                        <option value="slow_hits">Wolne z Przyspieszeniem</option>
                        <option value="training">Trening</option>
                        <option value="sequential">Sekwencyjne</option>
                        <option value="random">Losowe</option>
                        <option value="blitz">Blitz</option>
                        <option value="survival">Survival</option>
                        <option value="reaction">Test Reakcji</option>
                        <option value="custom">Własny</option>
                    </select>
                </div>
                <div style={S.formGroup}>
                    <label style={S.formLabel}>Opis</label>
                    <input style={S.formInput} name="description" value={form.description} onChange={onChange} placeholder="Opis trybu..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={S.formGroup}>
                        <label style={S.formLabel}>Czas (s, 0=∞)</label>
                        <input style={S.formInput} name="duration_sec" type="number" value={form.duration_sec} onChange={onChange} min={0} max={600} />
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.formLabel}>Interwał LED (ms)</label>
                        <input style={S.formInput} name="led_interval_ms" type="number" value={form.led_interval_ms} onChange={onChange} min={100} max={10000} />
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.formLabel}>Punkty (0=czas)</label>
                        <input style={S.formInput} name="target_points" type="number" value={form.target_points} onChange={onChange} min={0} max={8} />
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.formLabel}>Życia (0=∞)</label>
                        <input style={S.formInput} name="lives" type="number" value={form.lives} onChange={onChange} min={0} max={10} />
                    </div>
                </div>
                <button type="submit" style={{ ...S.btnStart, width: '100%', marginTop: '4px' }}>➕ Dodaj</button>
            </form>
        </div>
    );
}

// ============================================================
// Settings Tab
// ============================================================
function SettingsTab({ espUrl, setEspUrl }) {
    const [input, setInput] = useState(espUrl || '192.168.4.1');
    const [saved, setSaved] = useState(false);

    const save = () => {
        setEspUrl(input);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div style={S.card}>
            <div style={S.cardTitle}>⚙ Ustawienia</div>
            <div style={S.formGroup}>
                <label style={S.formLabel}>Adres IP ESP32</label>
                <input style={S.formInput} value={input} onChange={e => setInput(e.target.value)} placeholder="192.168.4.1" />
            </div>
            <button style={{ ...S.btnStart, width: '100%' }} onClick={save}>
                {saved ? '✅ Zapisano' : '💾 Zapisz'}
            </button>
            <div style={S.infoBox}>
                <strong style={{ color: '#88aaff' }}>Połączenie z ESP32:</strong><br />
                1. WiFi: <strong style={{ color: '#fff' }}>Fance_AP</strong><br />
                2. Hasło: <strong style={{ color: '#fff' }}>fance1234</strong><br />
                3. Adres: <strong style={{ color: '#fff' }}>192.168.4.1</strong>
            </div>
        </div>
    );
}

// ============================================================
// Main App
// ============================================================
export default function App() {
    const [tab, setTab]       = useState('game');
    const [espUrl, setEspUrl] = useEspUrl();

    const TABS = [
        { id: 'game',    label: '🎮 Gra' },
        { id: 'modes',   label: '📋 Tryby' },
        { id: 'scores',  label: '🏆 Wyniki' },
        { id: 'add',     label: '➕' },
        { id: 'settings',label: '⚙' },
    ];

    const pages = {
        game:     <GameTab    espUrl={espUrl} />,
        modes:    <ModesTab   espUrl={espUrl} />,
        scores:   <ScoresTab />,
        add:      <AddModeTab />,
        settings: <SettingsTab espUrl={espUrl} setEspUrl={setEspUrl} />,
    };

    return (
        <div style={S.app}>
            <div style={S.header}>
                <div style={S.title}>⚔ FANCE</div>
                <div style={S.wsStatus}>{espUrl ? `ESP: ${espUrl}` : 'Backend'}</div>
            </div>
            <div style={S.tabs}>
                {TABS.map(t => (
                    <div key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
                        {t.label}
                    </div>
                ))}
            </div>
            <div style={S.content}>
                {pages[tab]}
            </div>
        </div>
    );
}
