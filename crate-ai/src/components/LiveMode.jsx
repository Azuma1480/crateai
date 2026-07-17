import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllTracks } from '../lib/db.js';
import { getSuggestions } from '../lib/suggestions.js';
import { toCamelot, keyName } from '../lib/camelot.js';
import { pitchPercent, isPitchFeasible, shiftKeyByPitch, camelotDelta } from '../lib/kam.js';

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
    const all = await getAllTracks();
    setLibrary(all);
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary, libraryVersion]);

  // Recompute suggestions
  useEffect(() => {
    if (!nowPlaying || library.length === 0) { setSuggestions([]); return; }
    const all = getSuggestions(nowPlaying, library, 12, x2On);
    const filtered = includePlayed
      ? all
      : all.filter((t) => !playHistory.has(t.id));
    setSuggestions(filtered.slice(0, 8));
  }, [nowPlaying, library, x2On, includePlayed, playHistory]);

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(
      library
        .filter((t) =>
          t.title?.toLowerCase().includes(q) ||
          t.artist?.toLowerCase().includes(q) ||
          t.album?.toLowerCase().includes(q)
        )
        .slice(0, 20)
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

  // Key display helpers
  const displayKey = (camelotKey, spotifyKey, mode) => {
    const cam = camelotKey ?? toCamelot(spotifyKey, mode);
    if (!cam) return '—';
    return keyFormat === 'camelot' ? cam : keyName(spotifyKey, mode) ?? cam;
  };

  // For a suggestion, compute the BPM/key delta rows
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

    return {
      bpmFrom: np.bpm,
      bpmTo: pitchedBpm,
      bpmDelta: `${sign}${bpmDelta}`,
      fromKey: fromKeyDisplay,
      toKey: toKeyDisplay,
      keyDelta: keyDeltaDisplay,
    };
  };

  const npCam = nowPlaying ? (nowPlaying.camelotKey ?? toCamelot(nowPlaying.key, nowPlaying.mode)) : null;
  const npKeyDisplay = nowPlaying ? displayKey(npCam, nowPlaying.key, nowPlaying.mode) : null;

  return (
    <div
      className="flex flex-col h-full overflow-hidden transition-colors duration-500"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── VINYL STAGE ─────────────────────────────────────────────────────── */}
      <div className="relative flex justify-center flex-shrink-0" style={{ height: 190 }}>

        {/* Wood platter — bleeds off top */}
        <div
          className="absolute rounded-full"
          style={{
            top: -50, width: 270, height: 270,
            background: `conic-gradient(
              from 0deg,
              var(--surface2) 0deg 14deg, var(--surface) 14deg 30deg,
              var(--surface2) 30deg 44deg, var(--surface) 44deg 60deg,
              var(--surface2) 60deg 72deg, var(--surface) 72deg 88deg,
              var(--surface2) 88deg 100deg, var(--surface) 100deg 116deg,
              var(--surface2) 116deg 130deg, var(--surface) 130deg 144deg,
              var(--surface2) 144deg 160deg, var(--surface) 160deg 174deg,
              var(--surface2) 174deg 188deg, var(--surface) 188deg 204deg,
              var(--surface2) 204deg 218deg, var(--surface) 218deg 234deg,
              var(--surface2) 234deg 248deg, var(--surface) 248deg 264deg,
              var(--surface2) 264deg 278deg, var(--surface) 278deg 294deg,
              var(--surface2) 294deg 308deg, var(--surface) 308deg 324deg,
              var(--surface2) 324deg 338deg, var(--surface) 338deg 354deg,
              var(--surface2) 354deg 360deg
            )`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.85), inset 0 0 30px rgba(0,0,0,0.45)',
            transition: 'background var(--t)',
          }}
        >
          <div
            className="absolute rounded-full"
            style={{ inset: 7, border: '2px solid rgba(0,0,0,0.45)', boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)' }}
          />
        </div>

        {/* Vinyl record — oversized, overflows platter bottom */}
        <div
          className="absolute vinyl-record rounded-full"
          style={{
            top: -62, width: 256, height: 256,
            background: `
              radial-gradient(circle at 50% 50%, #0a0a0a 0%, #0a0a0a 17%, transparent 17%),
              repeating-radial-gradient(
                circle at 50% 50%,
                #0a0a0a 0px, #111 1px, #080808 2px, #101010 3px, #090909 4px
              )
            `,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 14px 60px rgba(0,0,0,0.95)',
          }}
        >
          {/* Label */}
          <div
            className="absolute rounded-full flex flex-col items-center justify-center gap-1"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 72, height: 72,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.9 }}>
              CRATE
            </span>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#000', border: '1px solid var(--border)' }} />
            <span style={{ fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.9 }}>
              AI
            </span>
          </div>
          {/* Sheen */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `conic-gradient(
                from 200deg,
                transparent 0deg 55deg,
                rgba(255,255,255,0.045) 55deg 90deg,
                transparent 90deg 360deg
              )`,
            }}
          />
        </div>

        {/* Tonearm */}
        <svg
          viewBox="0 0 90 170"
          fill="none"
          className="absolute"
          style={{ top: 0, right: 28, width: 90, height: 170, overflow: 'visible', zIndex: 5, pointerEvents: 'none' }}
        >
          <circle cx="68" cy="22" r="9" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5" />
          <circle cx="68" cy="22" r="3.5" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
          <line x1="68" y1="22" x2="20" y2="138"
            stroke="var(--tonearm, #8a7050)" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="68" y1="22" x2="20" y2="138"
            stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 20 138 L 9 148 L 11 160 L 25 160 L 27 148 Z"
            fill="var(--surface2)" stroke="var(--border)" strokeWidth="1" />
          <line x1="18" y1="160" x2="17" y2="170" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      </div>

      {/* ── NOW PLAYING ──────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 pb-3"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, var(--bg) 32%)`,
          marginTop: -36,
        }}
      >
        <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          Now Playing
        </p>

        {nowPlaying ? (
          <div className="flex items-start gap-3 mt-1.5">
            <ArtThumb track={nowPlaying} size={48} />
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold truncate"
                style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.2 }}
              >
                {nowPlaying.title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                {nowPlaying.artist}
                {nowPlaying.genre ? ` · ${nowPlaying.genre}` : ''}
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
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)' }}>
                      {npKeyDisplay}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setNowPlaying(null)}
              style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0, paddingTop: 2 }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 6 }}>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Search your library to set the track you&apos;re playing
            </p>
          </div>
        )}

        <button
          onClick={() => { setShowSearch((v) => !v); setTimeout(() => searchRef.current?.focus(), 50); }}
          className="flex items-center gap-1.5 mt-2.5"
          style={{ fontSize: 12, color: 'var(--accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          {nowPlaying ? 'Change track' : 'Search library'}
        </button>

        {showSearch && (
          <div
            className="mt-2 rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex gap-2 p-2">
              <input
                ref={searchRef}
                type="search"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                style={{ color: 'var(--text-dim)', fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="px-4 py-3" style={{ fontSize: 13, color: 'var(--text-dim)' }}>No results</p>
              )}
              {searchResults.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectNowPlaying(t)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                  style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <ArtThumb track={t} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{t.title}</p>
                    <p className="truncate" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.artist}</p>
                  </div>
                  {t.bpm && (
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                      {t.bpm}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── KAM / X2 CONTROLS ───────────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
        <ToggleCard
          name="KAM"
          sub="Key Adaptation"
          on={kamOn}
          onToggle={() => setKamOn(!kamOn)}
        />
        <ToggleCard
          name="X2"
          sub="±16% BPM Range"
          on={x2On}
          onToggle={() => setX2On(!x2On)}
        />
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
            Set a track above to see suggestions
          </p>
        )}
        {nowPlaying && suggestions.length === 0 && library.length > 0 && (
          <p className="text-center py-8" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            No compatible tracks in range — try enabling X2
          </p>
        )}
        {nowPlaying && library.length === 0 && (
          <p className="text-center py-8" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Your library is empty — import tracks in Settings
          </p>
        )}
        {suggestions.map((sug, i) => {
          const delta = buildDeltaRow(sug);
          const isTop = i < 3;
          return (
            <SuggestItem
              key={sug.id}
              track={sug}
              delta={delta}
              top={isTop}
              onSelect={handleSelectSuggestion}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

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
      <Pill on={on} />
    </button>
  );
}

function Pill({ on }) {
  return (
    <div
      className="relative flex-shrink-0 rounded-full transition-all duration-300"
      style={{
        width: 30, height: 17,
        background: on ? 'var(--accent)' : 'var(--border)',
      }}
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
        <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
          {track.title}
        </p>
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
      style={{
        width: size, height: size,
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
      }}
    >
      {track.cover ? (
        <img src={track.cover} alt={track.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <svg viewBox="0 0 24 24" style={{ width: size * 0.5, height: size * 0.5, color: 'var(--text-muted)' }}
          fill="currentColor">
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <circle cx="12" cy="12" r="4" opacity="0.5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      )}
    </div>
  );
}
