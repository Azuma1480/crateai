import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllTracks } from '../lib/db.js';
import { getSuggestions } from '../lib/suggestions.js';
import { toCamelot, keyName } from '../lib/camelot.js';
import { pitchPercent, shiftKeyByPitch, camelotDelta } from '../lib/kam.js';

export default function LiveMode({
  nowPlaying, setNowPlaying,
  libraryVersion,
  kamOn, setKamOn,
  x2On, setX2On,
  keyFormat,
  includePlayed,
}) {
  const [library, setLibrary] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [playHistory, setPlayHistory] = useState(new Set());
  const searchRef = useRef(null);

  const loadLibrary = useCallback(async () => {
    setLibrary(await getAllTracks());
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary, libraryVersion]);

  useEffect(() => {
    if (!nowPlaying || library.length === 0) { setSuggestions([]); return; }
    const all = getSuggestions(nowPlaying, library, 12, x2On);
    const filtered = includePlayed ? all : all.filter((t) => !playHistory.has(t.id));
    setSuggestions(filtered.slice(0, 8));
  }, [nowPlaying, library, x2On, includePlayed, playHistory]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(
      library.filter((t) =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q)
      ).slice(0, 20)
    );
  }, [searchQuery, library]);

  const handleSelectNowPlaying = (track) => {
    if (nowPlaying) setPlayHistory((h) => new Set([...h, nowPlaying.id]));
    setNowPlaying(track);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleSelectSuggestion = (track) => {
    if (nowPlaying) setPlayHistory((h) => new Set([...h, nowPlaying.id]));
    setNowPlaying(track);
  };

  const displayKey = (camelotKey, spotifyKey, mode) => {
    const cam = camelotKey ?? toCamelot(spotifyKey, mode);
    if (!cam) return '—';
    return keyFormat === 'camelot' ? cam : (keyName(spotifyKey, mode) ?? cam);
  };

  const buildDeltaRow = (sug) => {
    const np = nowPlaying;
    if (!np?.bpm || !sug.bpm) return null;
    const pitch = pitchPercent(np.bpm, sug.bpm);
    const pitchedBpm = Math.round(np.bpm * (1 + pitch / 100));
    const bpmDelta = pitchedBpm - np.bpm;
    const sign = bpmDelta >= 0 ? '+' : '';
    const npCam = np.camelotKey ?? toCamelot(np.key, np.mode);
    const sugCam = sug.camelotKey ?? toCamelot(sug.key, sug.mode);
    let fromKeyDisplay, toKeyDisplay, keyDeltaDisplay;
    if (kamOn && npCam) {
      const shiftedCam = shiftKeyByPitch(npCam, pitch);
      fromKeyDisplay = keyFormat === 'camelot' ? shiftedCam : (keyName(np.key, np.mode) ?? shiftedCam);
      toKeyDisplay   = keyFormat === 'camelot' ? sugCam     : (keyName(sug.key, sug.mode) ?? sugCam);
      const delta = camelotDelta(shiftedCam, sugCam);
      keyDeltaDisplay = delta === 0 ? '±0' : (delta > 0 ? `+${delta}` : `${delta}`);
    } else {
      fromKeyDisplay = displayKey(npCam, np.key, np.mode);
      toKeyDisplay   = displayKey(sugCam, sug.key, sug.mode);
      keyDeltaDisplay = null;
    }
    return { bpmFrom: np.bpm, bpmTo: pitchedBpm, bpmDelta: `${sign}${bpmDelta}`, fromKey: fromKeyDisplay, toKey: toKeyDisplay, keyDelta: keyDeltaDisplay };
  };

  const npCam = nowPlaying ? (nowPlaying.camelotKey ?? toCamelot(nowPlaying.key, nowPlaying.mode)) : null;
  const npKeyDisplay = nowPlaying ? displayKey(npCam, nowPlaying.key, nowPlaying.mode) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── TURNTABLE VISUAL ─────────────────────────────────────────────────── */}
      <TurntableStage kamOn={kamOn} />

      {/* ── NOW PLAYING ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-3">
        <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          Now Playing
        </p>
        {nowPlaying ? (
          <div className="flex items-start gap-3 mt-1.5">
            <ArtThumb track={nowPlaying} size={48} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate" style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.2 }}>
                {nowPlaying.title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {nowPlaying.artist}{nowPlaying.genre ? ` · ${nowPlaying.genre}` : ''}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {nowPlaying.bpm && (
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                    {nowPlaying.bpm} BPM
                  </span>
                )}
                {npKeyDisplay && (
                  <>
                    <span style={{ width: 1, height: 12, background: 'var(--border)', display: 'inline-block' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)' }}>{npKeyDisplay}</span>
                  </>
                )}
              </div>
            </div>
            <button onClick={() => setNowPlaying(null)} style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0, paddingTop: 2 }}>✕</button>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>
            ライブラリから曲を選んでスタート
          </p>
        )}
        <button
          onClick={() => { setShowSearch((v) => !v); setTimeout(() => searchRef.current?.focus(), 50); }}
          className="flex items-center gap-1.5 mt-2"
          style={{ fontSize: 12, color: 'var(--accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          {nowPlaying ? '曲を変える' : 'ライブラリを検索'}
        </button>

        {showSearch && (
          <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex gap-2 p-2">
              <input
                ref={searchRef}
                type="search"
                placeholder="検索…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                キャンセル
              </button>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-dim)' }}>見つからない</p>
              )}
              {searchResults.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectNowPlaying(t)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                  style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <ArtThumb track={t} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{t.title}</p>
                    <p className="truncate" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.artist}</p>
                  </div>
                  {t.bpm && <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{t.bpm}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── KAM / X2 CONTROLS ───────────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
        <ToggleCard name="KAM" sub="Key Adaptation" on={kamOn} onToggle={() => setKamOn(!kamOn)} />
        <ToggleCard name="X2"  sub="±16% BPM Range" on={x2On}  onToggle={() => setX2On(!x2On)} />
      </div>

      {/* ── SUGGEST HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
        <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          Suggestions
        </span>
        {nowPlaying && (
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
            {suggestions.length} tracks
          </span>
        )}
      </div>

      {/* ── SUGGEST LIST ────────────────────────────────────────────────────── */}
      <div className="flex-1 scroll-area px-3 pb-3 flex flex-col gap-0.5">
        {!nowPlaying && (
          <p className="text-center py-8" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            曲をセットするとサジェストが表示される
          </p>
        )}
        {nowPlaying && suggestions.length === 0 && library.length > 0 && (
          <p className="text-center py-8" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            範囲内の曲なし — X2を試してみて
          </p>
        )}
        {nowPlaying && library.length === 0 && (
          <p className="text-center py-8" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            ライブラリが空 — Settingsからインポート
          </p>
        )}
        {suggestions.map((sug, i) => (
          <SuggestItem
            key={sug.id}
            track={sug}
            delta={buildDeltaRow(sug)}
            top={i < 3}
            onSelect={handleSelectSuggestion}
          />
        ))}
      </div>
    </div>
  );
}

/* ── TURNTABLE STAGE ────────────────────────────────────────────────────────── */

function TurntableStage({ kamOn }) {
  const platterRef = useRef(null);
  const vinylRef   = useRef(null);
  const rotRef     = useRef(0);
  const rafRef     = useRef(null);

  // Draw platter (wood grain, top-down)
  useEffect(() => {
    const canvas = platterRef.current;
    if (!canvas) return;
    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, R = size / 2 - 1;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // Base wood tone — warm browns for Retro, cool dark for Modern
    const isDark = kamOn;
    const woodBase  = isDark ? '#0c1a28' : '#2a1a0c';
    const woodLight = isDark ? '#14263a' : '#3d2a14';
    const woodDark  = isDark ? '#081018' : '#1c1008';

    ctx.fillStyle = woodBase;
    ctx.fillRect(0, 0, size, size);

    // Radial wood grain lines (looking down at a cross-cut surface)
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const r0 = R * 0.06;
      const grad = ctx.createLinearGradient(
        cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0,
        cx + Math.cos(angle) * R,  cy + Math.sin(angle) * R
      );
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.3 + Math.random() * 0.2, woodLight + '55');
      grad.addColorStop(0.6 + Math.random() * 0.2, woodDark + '44');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 + Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0);
      ctx.lineTo(cx + Math.cos(angle) * R,  cy + Math.sin(angle) * R);
      ctx.stroke();
    }

    // Annual rings (concentric, subtle)
    const ringCount = 22;
    for (let i = 1; i <= ringCount; i++) {
      const r = R * 0.08 + (R * 0.88) * (i / ringCount);
      const alpha = 0.04 + (i % 3 === 0 ? 0.06 : 0.02);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = i % 4 === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rim highlight
    const rimGrad = ctx.createRadialGradient(cx, cy, R - 8, cx, cy, R);
    rimGrad.addColorStop(0, 'transparent');
    rimGrad.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, size, size);

    // Center spindle
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.032, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#334' : '#554433';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // Outer edge shadow
    const edgeGrad = ctx.createRadialGradient(cx, cy, R - 6, cx, cy, R + 1);
    edgeGrad.addColorStop(0, 'transparent');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = edgeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
    ctx.fill();
  }, [kamOn]);

  // Draw vinyl record (static, will be rotated via CSS)
  useEffect(() => {
    const canvas = vinylRef.current;
    if (!canvas) return;
    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const R = size / 2 - 2;
    const labelR = R * 0.27;
    const leadInR = R * 0.94;
    const leadOutR = labelR + R * 0.04;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // Base — very dark vinyl color
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, size, size);

    // Groove area: concentric rings simulating pressed grooves
    const grooveCount = 120;
    for (let i = 0; i < grooveCount; i++) {
      const t = i / grooveCount;
      const r = leadOutR + (leadInR - leadOutR) * t;
      // Grooves catch light subtly — every few rings is slightly brighter
      const isHighlight = i % 5 === 0;
      const alpha = isHighlight ? 0.055 : 0.022;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = isHighlight ? 0.7 : 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Lead-in groove (outer edge, slightly visible ring)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, leadInR + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.beginPath();
    ctx.arc(cx, cy, labelR, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0a06';
    ctx.fill();
    // Label ring
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label text — CRATE AI
    const accentHex = '#e8a030';
    ctx.fillStyle = accentHex;
    ctx.font = `bold ${Math.round(labelR * 0.22)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('CRATE', cx, cy - labelR * 0.06);
    ctx.font = `${Math.round(labelR * 0.15)}px monospace`;
    ctx.fillStyle = 'rgba(232,160,48,0.5)';
    ctx.fillText('AI', cx, cy + labelR * 0.3);

    // Label center line decoration
    ctx.strokeStyle = 'rgba(232,160,48,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - labelR * 0.5, cy + labelR * 0.08);
    ctx.lineTo(cx + labelR * 0.5, cy + labelR * 0.08);
    ctx.stroke();

    // Center hole
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.022, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();

    ctx.restore();

    // Outer edge
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  // Rotation animation via requestAnimationFrame (CSS animation was inconsistent cross-browser)
  useEffect(() => {
    const vinylEl = vinylRef.current;
    if (!vinylEl) return;
    let last = null;
    const RPM = 33.33;
    const DEG_PER_MS = (RPM * 360) / 60000;

    const tick = (ts) => {
      if (last !== null) rotRef.current += DEG_PER_MS * (ts - last);
      last = ts;
      vinylEl.style.transform = `rotate(${rotRef.current}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="flex-shrink-0 relative flex justify-center overflow-hidden"
      style={{ height: 200 }}
    >
      {/* Platter — full width, bleeds off top */}
      <canvas
        ref={platterRef}
        width={440}
        height={440}
        style={{
          position: 'absolute',
          top: -110,
          width: 'min(calc(100vw + 16px), 446px)',
          height: 'auto',
          borderRadius: '50%',
          boxShadow: '0 12px 60px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.7)',
          transition: 'filter 0.5s ease',
        }}
      />

      {/* Vinyl record — slightly smaller than platter, sits on top */}
      <canvas
        ref={vinylRef}
        width={400}
        height={400}
        style={{
          position: 'absolute',
          top: -90,
          width: 'min(calc(100vw - 8px), 422px)',
          height: 'auto',
          borderRadius: '50%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.95)',
          willChange: 'transform',
        }}
      />

      {/* Light reflection overlay — fixed, doesn't rotate */}
      <div
        style={{
          position: 'absolute',
          top: -90,
          width: 'min(calc(100vw - 8px), 422px)',
          paddingBottom: 'min(calc(100vw - 8px), 422px)',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background: `conic-gradient(
            from 210deg,
            transparent 0deg 50deg,
            rgba(255,255,255,0.05) 50deg 78deg,
            rgba(255,255,255,0.02) 78deg 100deg,
            transparent 100deg 360deg
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Tonearm — top-down, flat */}
      <TonearmSVG />

      {/* Fade-to-bg gradient at bottom of stage */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 70,
          background: 'linear-gradient(to bottom, transparent, var(--bg))',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </div>
  );
}

function TonearmSVG() {
  return (
    <svg
      viewBox="0 0 100 180"
      fill="none"
      style={{
        position: 'absolute',
        right: 0,
        top: -10,
        width: 100,
        height: 180,
        zIndex: 20,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {/* Bearing housing */}
      <circle cx="78" cy="24" r="10" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="78" cy="24" r="5"  fill="var(--surface)"  stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
      <circle cx="78" cy="24" r="2"  fill="#000" />

      {/* Arm tube — thin, metallic */}
      <line x1="78" y1="24" x2="22" y2="148" stroke="#6a5a40" strokeWidth="4" strokeLinecap="round" />
      {/* Arm highlight (top surface) */}
      <line x1="78" y1="24" x2="22" y2="148" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Headshell — flat from above */}
      <path d="M22 148 L12 154 L13 166 L28 168 L30 156 Z"
        fill="var(--surface2)" stroke="var(--border)" strokeWidth="1" />
      {/* Cartridge body */}
      <rect x="15" y="155" width="12" height="7" rx="1"
        fill="#3a3028" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

      {/* Stylus */}
      <line x1="21" y1="168" x2="21" y2="178" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <circle cx="21" cy="178" r="1.5" fill="var(--accent)" opacity="0.6" />

      {/* Anti-skate weight stub */}
      <line x1="78" y1="24" x2="90" y2="18" stroke="#6a5a40" strokeWidth="2" strokeLinecap="round" />
      <circle cx="90" cy="17" r="3" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1" />
    </svg>
  );
}

/* ── Other sub-components ───────────────────────────────────────────────────── */

function ToggleCard({ name, sub, on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex-1 flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-300"
      style={{
        background: on ? 'var(--accent-dim)' : 'var(--surface)',
        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: on ? '0 0 14px var(--accent-glow)' : 'none',
      }}
    >
      <div className="text-left">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: on ? 'var(--accent)' : 'var(--text-dim)' }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
      </div>
      <div
        className="relative flex-shrink-0 rounded-full transition-all duration-300"
        style={{ width: 30, height: 17, background: on ? 'var(--accent)' : 'var(--border)' }}
      >
        <div
          className="absolute rounded-full transition-all duration-300"
          style={{
            top: 2, left: 2, width: 13, height: 13,
            background: on ? '#fff' : 'var(--text-dim)',
            transform: on ? 'translateX(13px)' : 'translateX(0)',
          }}
        />
      </div>
    </button>
  );
}

function SuggestItem({ track, delta, top, onSelect }) {
  return (
    <button
      onClick={() => onSelect(track)}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150"
      style={{
        background: top ? 'var(--accent-dim)' : 'transparent',
        border: `1px solid ${top ? 'var(--border)' : 'transparent'}`,
      }}
      onMouseEnter={(e) => { if (!top) e.currentTarget.style.background = 'var(--surface2)'; }}
      onMouseLeave={(e) => { if (!top) e.currentTarget.style.background = 'transparent'; }}
    >
      <ArtThumb track={track} size={42} />
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{track.title}</p>
        <p className="truncate" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
          {track.artist}{track.genre ? ` · ${track.genre}` : ''}
        </p>
      </div>
      {delta && (
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
          <span style={{ fontFamily: 'monospace', fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            {delta.bpmFrom}→{delta.bpmTo}{' '}
            <span style={{ color: 'var(--accent)', fontSize: 10 }}>{delta.bpmDelta}</span>
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            {delta.fromKey}→{delta.toKey}
            {delta.keyDelta != null && (
              <span style={{ color: 'var(--accent)', fontSize: 10 }}> {delta.keyDelta}</span>
            )}
          </span>
        </div>
      )}
    </button>
  );
}

function ArtThumb({ track, size }) {
  return (
    <div
      className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size, background: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      {track.cover ? (
        <img src={track.cover} alt={track.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <svg viewBox="0 0 24 24" style={{ width: size * 0.5, height: size * 0.5, color: 'var(--text-muted)' }} fill="currentColor">
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <circle cx="12" cy="12" r="4" opacity="0.5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      )}
    </div>
  );
}
