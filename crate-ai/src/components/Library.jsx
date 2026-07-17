import { useState, useEffect, useCallback } from 'react';
import { getAllTracks, updateTrackGenre } from '../lib/db.js';
import { toCamelot, keyName } from '../lib/camelot.js';

const GENRES = [
  'All', 'R&B', 'Korean Indie', 'Japanese City Pop', 'Funk', 'Hip-Hop',
  'Pop', 'Jazz', 'Disco', 'House', 'Lo-fi Hip-Hop',
];

export default function Library({ libraryVersion, setNowPlaying, keyFormat = 'camelot', nowPlaying }) {
  const [tracks, setTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllTracks();
      setTracks(all.sort((a, b) => (a.title || '').localeCompare(b.title || '')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, libraryVersion]);

  const filtered = tracks.filter((t) => {
    const matchGenre = genre === 'All' || t.genre === genre;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      t.title?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.album?.toLowerCase().includes(q);
    return matchGenre && matchQuery;
  });

  const handleGenreChange = async (id, newGenre) => {
    await updateTrackGenre(id, newGenre);
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, genre: newGenre } : t)));
  };

  const displayKey = (track) => {
    const cam = track.camelotKey ?? toCamelot(track.key, track.mode);
    if (!cam) return null;
    return keyFormat === 'camelot' ? cam : (keyName(track.key, track.mode) ?? cam);
  };

  return (
    <div className="flex flex-col h-full transition-colors duration-500" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0" style={{ background: 'var(--bg)' }}>
        <h1 className="font-bold" style={{ fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 12 }}>
          Library
        </h1>

        {/* Search */}
        <div className="relative mb-2">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-dim)' }}
            fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search tracks, artists, albums…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Genre filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className="flex-shrink-0 text-xs px-3 py-1 rounded-full transition-all duration-200"
              style={{
                background: genre === g ? 'var(--accent)' : 'var(--surface)',
                color: genre === g ? 'var(--bg)' : 'var(--text-dim)',
                border: `1px solid ${genre === g ? 'var(--accent)' : 'var(--border)'}`,
                fontWeight: genre === g ? 600 : 400,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Track count */}
      <div className="px-4 py-1 flex-shrink-0">
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {loading ? 'Loading…' : `${filtered.length} track${filtered.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 scroll-area pt-1 pb-4">
        {!loading && filtered.length === 0 && (
          <EmptyState query={query} genre={genre} total={tracks.length} />
        )}
        {filtered.map((track) => {
          const isPlaying = nowPlaying?.id === track.id;
          const isExpanded = expandedId === track.id;
          const keyDisp = displayKey(track);

          return (
            <div
              key={track.id}
              className="mx-3 mb-1.5 rounded-xl overflow-hidden transition-all"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${isPlaying ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: isPlaying ? '0 0 10px var(--accent-glow)' : 'none',
              }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : track.id)}
                className="w-full text-left p-3 flex gap-3 items-start"
              >
                {/* Art */}
                <div
                  className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ width: 44, height: 44, background: 'var(--surface2)', border: '1px solid var(--border)' }}
                >
                  {track.cover ? (
                    <img src={track.cover} alt={track.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, color: 'var(--text-muted)' }} fill="currentColor">
                      <circle cx="12" cy="12" r="10" opacity="0.3" />
                      <circle cx="12" cy="12" r="4" opacity="0.5" />
                      <circle cx="12" cy="12" r="1.5" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}>
                    {track.title}
                  </p>
                  <p className="truncate" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ''}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {track.bpm && (
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                      {track.bpm}
                    </span>
                  )}
                  {keyDisp && (
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-dim)' }}>
                      {keyDisp}
                    </span>
                  )}
                  {isPlaying && (
                    <span style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Playing
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded: play + genre */}
              {isExpanded && (
                <div className="px-3 pb-3 flex gap-2 items-center" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {setNowPlaying && (
                    <button
                      onClick={() => { setNowPlaying(track); setExpandedId(null); }}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 10, height: 10 }}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Play Now
                    </button>
                  )}
                  <select
                    value={track.genre || ''}
                    onChange={(e) => handleGenreChange(track.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-dim)',
                    }}
                  >
                    <option value="">— Set genre —</option>
                    {GENRES.slice(1).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ query, genre, total }) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--surface)' }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 32, height: 32, color: 'var(--text-muted)' }} fill="currentColor">
            <circle cx="12" cy="12" r="10" opacity="0.3" />
            <circle cx="12" cy="12" r="4" opacity="0.5" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
        </div>
        <p style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Your crate is empty</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Import records via Settings → Import Library
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-32 text-center px-6">
      <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No tracks match your search</p>
    </div>
  );
}
