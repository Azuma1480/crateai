import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllTracks, getSetting, setSetting } from '../lib/db.js';
import { getSuggestions } from '../lib/suggestions.js';
import { toCamelot, keyName } from '../lib/camelot.js';
import { pitchPercent, shiftKeyByPitch, camelotDelta } from '../lib/kam.js';
import { gradientFor, buildAlbumArt } from '../lib/art.js';
import { camelotToKeyMode } from '../lib/rekordbox.js';

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
  // Play history: { trackId → lastPlayedAt(ms) }. Persisted so a mid-set
  // refresh doesn't forget what was played.
  const [playHistory, setPlayHistory] = useState({});
  const [clock, setClock] = useState(Date.now());
  const searchRef = useRef(null);

  useEffect(() => {
    getSetting('playHistory').then((v) => {
      if (!v) return;
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) {
          // legacy format (id array) — carry over with "just now" timestamps
          setPlayHistory(Object.fromEntries(parsed.map((id) => [id, Date.now()])));
        } else if (parsed && typeof parsed === 'object') {
          setPlayHistory(parsed);
        }
      } catch { /* corrupt -> fresh */ }
    });
  }, []);

  // Tick every 30s so the elapsed-time badges stay current.
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // A track counts as played the moment it becomes the now-playing record,
  // regardless of how it was selected (suggestion, search, or Library).
  useEffect(() => {
    if (!nowPlaying?.id) return;
    setPlayHistory((h) => {
      const next = { ...h, [nowPlaying.id]: Date.now() };
      setSetting('playHistory', JSON.stringify(next));
      return next;
    });
  }, [nowPlaying?.id]);

  const resetHistory = () => {
    setPlayHistory({});
    setSetting('playHistory', '{}');
  };

  const loadLibrary = useCallback(async () => {
    setLibrary(await getAllTracks());
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary, libraryVersion]);

  useEffect(() => {
    if (!nowPlaying || library.length === 0) { setSuggestions([]); return; }
    const all = getSuggestions(nowPlaying, library, 12, x2On);
    const filtered = includePlayed ? all : all.filter((t) => !(t.id in playHistory));
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
    setNowPlaying(track);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleSelectSuggestion = (track) => {
    setNowPlaying(track);
  };

  const displayKey = (camelotKey, spotifyKey, mode) => {
    const cam = camelotKey ?? toCamelot(spotifyKey, mode);
    if (!cam) return '—';
    if (keyFormat === 'camelot') return cam;
    // Musical notation: derive pitch class from the Camelot code when the
    // track only carries a camelotKey (rekordbox/manual/match-review data).
    let k = spotifyKey, m = mode;
    if (k == null) ({ key: k, mode: m } = camelotToKeyMode(cam));
    return k != null ? keyName(k, m) : cam;
  };

  // Build the current → suggestion transition (BPM + key), with signed deltas.
  const buildDeltaRow = (sug) => {
    const np = nowPlaying;
    if (!np?.bpm || !sug.bpm) return null;
    const pitch = pitchPercent(np.bpm, sug.bpm);
    const bpmFrom = np.bpm;
    const bpmTo = Math.round(sug.bpm);
    const bpmDelta = bpmTo - bpmFrom;

    const npCam = np.camelotKey ?? toCamelot(np.key, np.mode);
    const sugCam = sug.camelotKey ?? toCamelot(sug.key, sug.mode);

    let fromCam = npCam;
    let fromKey;
    if (kamOn && npCam) {
      fromCam = shiftKeyByPitch(npCam, pitch);
      fromKey = keyFormat === 'camelot' ? fromCam : (keyName(np.key, np.mode) ?? fromCam);
    } else {
      fromKey = displayKey(npCam, np.key, np.mode);
    }
    const toKey = displayKey(sugCam, sug.key, sug.mode);
    const keyDelta = (fromCam && sugCam) ? camelotDelta(fromCam, sugCam) : null;

    return { bpmFrom, bpmTo, bpmDelta, fromKey, toKey, keyDelta };
  };

  const npCam = nowPlaying ? (nowPlaying.camelotKey ?? toCamelot(nowPlaying.key, nowPlaying.mode)) : null;
  const npKeyDisplay = nowPlaying ? displayKey(npCam, nowPlaying.key, nowPlaying.mode) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── TURNTABLE + NOW PLAYING (fixed frame — confirmed layout) ──────────── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          height: 219,
          background: 'radial-gradient(ellipse at 20% 80%, #1c1206 0%, #0a0704 55%, #050302 100%)',
        }}
      >
        <TurntableCanvas nowPlaying={nowPlaying} />
        {/* fade into content */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'linear-gradient(to bottom, transparent, var(--bg) 92%)', pointerEvents: 'none', zIndex: 7 }} />

        {/* now-playing: left = song/artist/album, right corner = BPM/key */}
        {nowPlaying ? (
          <div style={{ position: 'absolute', left: 20, right: 16, top: 138, zIndex: 9, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ position: 'relative', minWidth: 0, flex: 1 }}>
              <div style={{ position: 'absolute', left: -20, right: -30, top: -28, bottom: -18, background: 'radial-gradient(ellipse at 30% 55%, rgba(6,4,3,0.62) 0%, rgba(6,4,3,0.28) 55%, rgba(6,4,3,0) 80%)', zIndex: -1 }} />
              <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4, textShadow: '0 1px 5px rgba(0,0,0,0.9)' }}>Now Playing</p>
              <p className="truncate" style={{ fontSize: 22, fontWeight: 700, color: '#fbeecb', letterSpacing: '-0.02em', lineHeight: 1.04, textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>{nowPlaying.title}</p>
              <p className="truncate" style={{ fontSize: 13, color: 'rgba(235,205,140,0.92)', marginTop: 3, textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>{nowPlaying.artist}</p>
              {(nowPlaying.album || nowPlaying.year) && (
                <p className="truncate" style={{ fontSize: 11, color: 'rgba(210,175,115,0.6)', marginTop: 2, textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                  {[nowPlaying.album, nowPlaying.year].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {nowPlaying.bpm && (
                <div style={{ fontSize: 27, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  {nowPlaying.bpm}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', marginLeft: 2 }}> BPM</span>
                </div>
              )}
              {npKeyDisplay && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                  <span style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, color: 'var(--accent)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{npKeyDisplay}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', left: 20, right: 16, top: 150, zIndex: 9 }}>
            <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>Now Playing</p>
            <p style={{ fontSize: 15, color: '#fbeecb', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>ライブラリから曲を選んでスタート</p>
          </div>
        )}
      </div>

      {/* ── KAM / X2 CONTROLS ───────────────────────────────────────────────── */}
      <div className="flex gap-2 px-5 pt-3 pb-2 flex-shrink-0">
        <ToggleCard name="KAM" sub="Key Adapt Mode" on={kamOn} onToggle={() => setKamOn(!kamOn)} />
        <ToggleCard name="X2 Range" sub="±16% BPM" on={x2On} onToggle={() => setX2On(!x2On)} />
      </div>

      {/* ── SUGGEST HEADER (+ search affordance) ─────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pb-1.5 flex-shrink-0">
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          Next Suggestions
        </span>
        <div className="flex items-center gap-3">
        {Object.keys(playHistory).length > 0 && (
          <button
            onClick={resetHistory}
            aria-label="プレイ履歴をリセット"
            title="プレイ履歴をリセット"
            className="flex items-center gap-1"
            style={{ fontSize: 10, color: 'var(--text-dim)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 12, height: 12 }}>
              <path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 9 8 9" />
            </svg>
            リセット
          </button>
        )}
        <button
          onClick={() => { setShowSearch((v) => !v); setTimeout(() => searchRef.current?.focus(), 50); }}
          className="flex items-center gap-1.5"
          style={{ fontSize: 11, color: 'var(--accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          {nowPlaying ? '曲を変える' : 'ライブラリを検索'}
        </button>
        </div>
      </div>

      {/* ── SEARCH PANEL ─────────────────────────────────────────────────────── */}
      {showSearch && (
        <div className="mx-4 mb-2 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} style={{ color: 'var(--text-dim)', fontSize: 12 }}>キャンセル</button>
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

      {/* ── SUGGEST LIST ────────────────────────────────────────────────────── */}
      <div className="flex-1 scroll-area">
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
            rank={i + 1}
            delta={buildDeltaRow(sug)}
            top={i === 0}
            playedAt={playHistory[sug.id] ?? null}
            now={clock}
            onSelect={handleSelectSuggestion}
          />
        ))}
      </div>
    </div>
  );
}

/* ── TURNTABLE CANVAS ───────────────────────────────────────────────────────── */

function TurntableCanvas({ nowPlaying }) {
  const canvasRef = useRef(null);
  const artRef = useRef(null);     // { placeholder: canvas, img: HTMLImageElement|null }
  const rafRef = useRef(null);
  // Render at the element's real width (2x for retina) so circles stay
  // circular on any device width instead of stretching a fixed design.
  const [cssW, setCssW] = useState(390);

  useEffect(() => {
    const measure = () => {
      const w = canvasRef.current?.clientWidth;
      if (w) setCssW(w);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Build / refresh the center-label artwork whenever the track changes.
  useEffect(() => {
    const placeholder = buildAlbumArt(320, nowPlaying);
    artRef.current = { placeholder, img: null };
    if (nowPlaying?.cover) {
      const img = new Image();
      img.onload = () => { if (artRef.current) artRef.current.img = img; };
      img.src = nowPlaying.cover;
    }
  }, [nowPlaying?.id, nowPlaying?.cover]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Record placement (top-down, top-right quarter at lower-left) — matches mock
    const cx = W * 0.15, cy = H * 0.78;
    const VR = 660, LR = 168;

    let angle = 0;
    const RAD_MS = (45 / 60) * (Math.PI * 2) / 1000; // 45 RPM
    let last = null;

    const grainCv = document.createElement('canvas');
    grainCv.width = 120; grainCv.height = 66;
    const gctx = grainCv.getContext('2d');
    const gdata = gctx.createImageData(120, 66);

    const drawGrain = () => {
      for (let i = 0; i < gdata.data.length; i += 4) {
        const v = 128 + (Math.random() - 0.5) * 40;
        gdata.data[i] = v; gdata.data[i + 1] = v; gdata.data[i + 2] = v; gdata.data[i + 3] = 12;
      }
      gctx.putImageData(gdata, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(grainCv, 0, 0, W, H);
      ctx.restore();
    };

    const drawVinyl = (a) => {
      ctx.save();
      ctx.translate(cx, cy);

      const base = ctx.createRadialGradient(0, 0, LR * 0.5, 0, 0, VR);
      base.addColorStop(0, '#0f0b06'); base.addColorStop(0.35, '#0a0704'); base.addColorStop(1, '#040302');
      ctx.fillStyle = base;
      ctx.beginPath(); ctx.arc(0, 0, VR, 0, Math.PI * 2); ctx.fill();

      // grooves
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, VR - 4, 0, Math.PI * 2); ctx.arc(0, 0, LR + 4, 0, Math.PI * 2, true); ctx.clip();
      ctx.strokeStyle = 'rgba(120,90,45,0.14)'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(0, 0, LR + 12, 0, Math.PI * 2); ctx.stroke();
      for (let r = LR + 22; r < VR - 4; r += 2.0) {
        const n = Math.sin(r * 3.0 + 0.3) * 0.4 + Math.cos(r * 1.1) * 0.3;
        const b = Math.max(0, 0.024 + n * 0.018 + (Math.floor(r / 15) % 4 === 0 ? 0.016 : 0));
        ctx.strokeStyle = `rgba(160,120,55,${b})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();

      // golden reflection band
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, VR, 0, Math.PI * 2); ctx.arc(0, 0, LR + 4, 0, Math.PI * 2, true); ctx.clip();
      const gx = VR * 0.55, gy = -VR * 0.35;
      const glow = ctx.createRadialGradient(gx, gy, 20, gx, gy, VR * 0.95);
      glow.addColorStop(0, 'rgba(255,200,90,0.26)'); glow.addColorStop(0.3, 'rgba(230,160,55,0.14)');
      glow.addColorStop(0.7, 'rgba(150,95,30,0.04)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(-VR, -VR, VR * 2, VR * 2);
      ctx.restore();

      // center label = album jacket (spins with the disc)
      ctx.rotate(a);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(0, 0, LR, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(0, 0, LR, 0, Math.PI * 2); ctx.clip();
      const art = artRef.current;
      const src = (art && art.img) || (art && art.placeholder);
      if (src) ctx.drawImage(src, -LR, -LR, LR * 2, LR * 2);
      const jv = ctx.createRadialGradient(0, 0, LR * 0.35, 0, 0, LR);
      jv.addColorStop(0, 'rgba(0,0,0,0)'); jv.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = jv; ctx.fillRect(-LR, -LR, LR * 2, LR * 2);
      ctx.restore();

      ctx.strokeStyle = 'rgba(15,10,5,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, LR, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,150,0.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, LR - 2, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#0a0806'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1; ctx.stroke();

      ctx.restore();
    };

    const drawArm = () => {
      const px = W * 0.92, py = H * 0.06, tx = W * 0.52, ty = H * 0.30;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
      const ag = ctx.createLinearGradient(px, py, tx, ty);
      ag.addColorStop(0, '#e8e6e0'); ag.addColorStop(0.3, '#b8b4a8'); ag.addColorStop(0.5, '#8c8878'); ag.addColorStop(0.75, '#68645a'); ag.addColorStop(1, '#48443c');
      ctx.strokeStyle = ag; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo((px + tx) / 2 + 30, (py + ty) / 2 - 25, tx, ty); ctx.stroke();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.quadraticCurveTo((px + tx) / 2 + 30, (py + ty) / 2 - 29, tx, ty - 4); ctx.stroke();
      ctx.restore();

      const armAng = Math.atan2(ty - (py + (ty - py) * 0.72), tx - (px + (tx - px) * 0.72));
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(armAng);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14;
      const sg = ctx.createLinearGradient(0, -18, 0, 18);
      sg.addColorStop(0, '#4a4842'); sg.addColorStop(0.5, '#2c2a26'); sg.addColorStop(1, '#181614');
      ctx.fillStyle = sg; roundRect(ctx, -16, -16, 56, 32, 5); ctx.fill();
      ctx.fillStyle = '#9c2f1e'; roundRect(ctx, 16, -12, 28, 24, 3); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(210,200,190,0.8)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(40, 8); ctx.lineTo(56, 22); ctx.stroke();
      ctx.fillStyle = 'rgba(255,215,120,0.95)'; ctx.shadowColor = 'rgba(255,190,60,1)'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(56, 22, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16;
      const bg = ctx.createRadialGradient(px - 8, py - 8, 0, px, py, 34);
      bg.addColorStop(0, '#e8e4d8'); bg.addColorStop(0.4, '#a8a294'); bg.addColorStop(1, '#48443c');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(px, py, 32, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#1c1a16'; ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
    };

    const render = () => {
      ctx.clearRect(0, 0, W, H);
      drawVinyl(angle);
      drawArm();
      drawGrain();
    };

    const loop = (t) => {
      if (last !== null) angle += (t - last) * RAD_MS;
      last = t;
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cssW]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(cssW * 2)}
      height={438}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 219 }}
    />
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ── SUB-COMPONENTS ─────────────────────────────────────────────────────────── */

function ToggleCard({ name, sub, on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex-1 flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-300"
      style={{
        background: on ? 'var(--accent-dim)' : 'var(--surface)',
        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: on ? '0 0 14px var(--accent-glow)' : 'none',
      }}
    >
      <div className="text-left">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: on ? 'var(--accent)' : 'var(--text-dim)' }}>{name}</div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>
      </div>
      <div className="relative flex-shrink-0 rounded-full transition-all duration-300" style={{ width: 34, height: 19, background: on ? 'var(--accent)' : 'var(--border)' }}>
        <div className="absolute rounded-full transition-all duration-300" style={{ top: 2, left: 2, width: 15, height: 15, background: '#fff', transform: on ? 'translateX(15px)' : 'translateX(0)', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
      </div>
    </button>
  );
}

function Transition({ label, from, to, delta, kind }) {
  // kind: 'bpm' | 'key' ; delta: signed number (or null)
  const dir = delta == null || delta === 0 ? 'flat' : (delta > 0 ? 'up' : 'down');
  const toColor = dir === 'up' ? '#52d98a' : dir === 'down' ? '#f2726b' : 'rgba(210,185,120,0.7)';
  const deltaStr = delta == null ? null : (delta === 0 ? '±0' : (delta > 0 ? `+${delta}` : `${delta}`));
  const bg = kind === 'bpm' ? 'rgba(232,160,48,0.09)' : 'rgba(100,210,130,0.08)';
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: bg, color: 'rgba(200,175,110,0.45)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {from}<span style={{ opacity: 0.45, margin: '0 1px', fontWeight: 400 }}>→</span>
      <span style={{ color: toColor }}>{to}{deltaStr && <span style={{ fontSize: 8, marginLeft: 3, opacity: 0.9 }}>{deltaStr}</span>}</span>
    </span>
  );
}

// Elapsed time since last played, as HH:MM (hours:minutes, no seconds).
function elapsedHHMM(playedAt, now) {
  const mins = Math.max(0, Math.floor((now - playedAt) / 60000));
  const h = Math.min(99, Math.floor(mins / 60));
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function SuggestItem({ track, rank, delta, top, playedAt, now, onSelect }) {
  const played = playedAt != null;
  return (
    <button
      onClick={() => onSelect(track)}
      className="w-full flex items-center text-left relative"
      style={{
        gap: 10, padding: '7px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.038)',
        background: top ? 'var(--accent-dim)' : 'transparent',
      }}
    >
      {top && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(to bottom, var(--accent), var(--accent))', borderRadius: '0 2px 2px 0' }} />}
      <span style={{ fontSize: 11, fontWeight: 800, color: top ? 'var(--accent)' : 'rgba(200,160,70,0.28)', width: 12, textAlign: 'center', flexShrink: 0 }}>{rank}</span>
      <div className="relative flex-shrink-0">
        <ArtThumb track={track} size={40} />
        {played && (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-md"
            style={{ background: 'rgba(0,0,0,0.55)', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#f2726b', letterSpacing: '0.02em' }}
          >
            {elapsedHHMM(playedAt, now)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center" style={{ gap: 7 }}>
          <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: played ? '#f2726b' : 'var(--text)', minWidth: 0 }}>{track.title}</span>
          {delta && (
            <>
              <Transition kind="bpm" from={delta.bpmFrom} to={delta.bpmTo} delta={delta.bpmDelta} />
              <Transition kind="key" from={delta.fromKey} to={delta.toKey} delta={delta.keyDelta} />
            </>
          )}
        </div>
        <p className="truncate" style={{ fontSize: 10, color: 'rgba(200,175,110,0.4)', marginTop: 2 }}>
          {track.artist}{track.genre ? ` · ${track.genre}` : ''}
        </p>
      </div>
    </button>
  );
}

function ArtThumb({ track, size }) {
  return (
    <div
      className="flex-shrink-0 overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: 6, background: track.cover ? 'var(--surface2)' : gradientFor(track), boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)' }}
    >
      {track.cover ? (
        <img src={track.cover} alt={track.album || track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
    </div>
  );
}
