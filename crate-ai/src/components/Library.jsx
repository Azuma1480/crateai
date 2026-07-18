import { useState, useEffect, useCallback } from 'react';
import { getAllTracks, updateTrackGenre, saveTrack, deleteTrack } from '../lib/db.js';
import { toCamelot, keyName } from '../lib/camelot.js';
import { gradientFor } from '../lib/art.js';
import { camelotToKeyMode } from '../lib/rekordbox.js';
import { CAMELOT_KEYS } from './AddRecord.jsx';
import { useT } from '../lib/i18n.js';

const GENRES = [
  'All', 'R&B', 'Korean Indie', 'Japanese City Pop', 'Funk', 'Hip-Hop',
  'Pop', 'Jazz', 'Disco', 'House', 'Lo-fi Hip-Hop',
];

const VIEWS = [
  ['song', 'Song'], ['album', 'Album'], ['artist', 'Artist'],
  ['genre', 'Genre'], ['bpm', 'BPM'], ['key', 'Key'],
];

const byAlpha = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });

// Camelot sort value: 1A,1B,2A,2B, … 12A,12B (低い→高い)
function camelotOrder(code) {
  const m = String(code || '').match(/^(\d{1,2})([AB])$/);
  if (!m) return Infinity;
  return parseInt(m[1], 10) * 2 + (m[2] === 'B' ? 1 : 0);
}

// Vinyl position parts: "A1" → { side: 'A', num: 1 }.
function posParts(pos) {
  const m = String(pos || '').match(/^([A-Za-z]*)\s*(\d*)/);
  return { side: (m?.[1] || '').toUpperCase(), num: m?.[2] ? parseInt(m[2], 10) : 0 };
}

export default function Library({ libraryVersion, setNowPlaying, keyFormat = 'camelot', nowPlaying, onAddRecord }) {
  const t = useT();
  const [tracks, setTracks] = useState([]);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [view, setView] = useState('song');
  const [dir, setDir] = useState('asc');          // bpm/key sort direction
  const [albumSel, setAlbumSel] = useState(null); // album drill-down
  const [artistSel, setArtistSel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllTracks();
      setTracks(all.sort((a, b) => byAlpha(a.title, b.title)));
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

  const handleSaveEdit = async (track, edits) => {
    const { key, mode } = edits.camelotKey ? camelotToKeyMode(edits.camelotKey) : { key: null, mode: null };
    const updated = {
      ...track,
      bpm: edits.bpm ? Math.round(Number(edits.bpm)) : null,
      camelotKey: edits.camelotKey || null,
      key, mode,
      year: edits.year ? Number(edits.year) : null,
      album: edits.album.trim() || null,
      genre: edits.genre || null,
    };
    await saveTrack(updated);
    setTracks((prev) => prev.map((t) => (t.id === track.id ? updated : t)));
  };

  const handleDelete = async (track) => {
    if (!window.confirm(t('deleteConfirm', track.title))) return;
    await deleteTrack(track.id);
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    setExpandedId(null);
  };

  const displayKey = (track) => {
    const cam = track.camelotKey ?? toCamelot(track.key, track.mode);
    if (!cam) return null;
    if (keyFormat === 'camelot') return cam;
    let k = track.key, m = track.mode;
    if (k == null) ({ key: k, mode: m } = camelotToKeyMode(cam));
    return k != null ? keyName(k, m) : cam;
  };

  const switchView = (v) => {
    setView(v); setAlbumSel(null); setArtistSel(null); setExpandedId(null); setDir('asc');
  };

  const rowProps = { nowPlaying, setNowPlaying, expandedId, setExpandedId, displayKey, handleGenreChange, handleSaveEdit, handleDelete };

  return (
    <div className="flex flex-col h-full transition-colors duration-500" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h1 className="font-bold" style={{ fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Library
          </h1>
          {onAddRecord && (
            <button
              onClick={onAddRecord}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 12 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ width: 13, height: 13 }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('register')}
            </button>
          )}
        </div>

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
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* View switcher */}
        <div className="flex gap-1 rounded-xl p-1 mb-2" style={{ background: 'var(--surface2)' }}>
          {VIEWS.map(([v, label]) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className="flex-1 py-1.5 rounded-lg font-semibold transition-all duration-200"
              style={{
                fontSize: 10.5,
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? 'var(--bg)' : 'var(--text-dim)',
              }}
            >
              {label}
            </button>
          ))}
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

      {/* Count + direction toggle */}
      <div className="px-4 py-1 flex-shrink-0 flex items-center justify-between">
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {loading ? 'Loading…' : `${filtered.length} track${filtered.length !== 1 ? 's' : ''}`}
        </p>
        {(view === 'bpm' || view === 'key') && (
          <button
            onClick={() => setDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1 rounded-full px-2.5 py-1"
            style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}
          >
            {view === 'bpm'
              ? (dir === 'asc' ? t('slowToFast') : t('fastToSlow'))
              : (dir === 'asc' ? '1A → 12B' : '12B → 1A')}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} style={{ width: 11, height: 11 }}>
              {dir === 'asc' ? <path d="M12 19V5m-6 6 6-6 6 6" /> : <path d="M12 5v14m6-6-6 6-6-6" />}
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 scroll-area pt-1 pb-4">
        {!loading && filtered.length === 0 && (
          <EmptyState query={query} genre={genre} total={tracks.length} onAddRecord={onAddRecord} />
        )}
        {!loading && filtered.length > 0 && (
          view === 'song' ? <SongView tracks={filtered} {...rowProps} /> :
          view === 'album' ? (
            albumSel
              ? <AlbumDetail tracks={filtered} albumKey={albumSel} onBack={() => setAlbumSel(null)} {...rowProps} />
              : <AlbumGrid tracks={filtered} onSelect={setAlbumSel} />
          ) :
          view === 'artist' ? (
            artistSel
              ? <ArtistDetail tracks={filtered} artist={artistSel} onBack={() => setArtistSel(null)} {...rowProps} />
              : <ArtistList tracks={filtered} onSelect={setArtistSel} />
          ) :
          view === 'genre' ? <GroupedView tracks={filtered} groupOf={(t) => t.genre || '—'} sortGroups={byAlpha} {...rowProps} /> :
          view === 'bpm' ? (
            <GroupedView
              tracks={filtered}
              groupOf={(t) => (t.bpm ? String(t.bpm) : '—')}
              sortGroups={(a, b) => {
                if (a === '—') return 1; if (b === '—') return -1;
                return dir === 'asc' ? Number(a) - Number(b) : Number(b) - Number(a);
              }}
              {...rowProps}
            />
          ) : (
            <GroupedView
              tracks={filtered}
              groupOf={(t) => t.camelotKey ?? toCamelot(t.key, t.mode) ?? '—'}
              sortGroups={(a, b) => {
                if (a === '—') return 1; if (b === '—') return -1;
                return dir === 'asc' ? camelotOrder(a) - camelotOrder(b) : camelotOrder(b) - camelotOrder(a);
              }}
              {...rowProps}
            />
          )
        )}
      </div>
    </div>
  );
}

/* ── Track row (shared) ─────────────────────────────────────────────────────── */

function TrackRow({ track, compact, ...p }) {
  const isPlaying = p.nowPlaying?.id === track.id;
  const isExpanded = p.expandedId === track.id;
  const keyDisp = p.displayKey(track);
  return (
    <div
      className="mx-3 mb-1.5 rounded-xl overflow-hidden transition-all"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isPlaying ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: isPlaying ? '0 0 10px var(--accent-glow)' : 'none',
      }}
    >
      <button
        onClick={() => p.setExpandedId(isExpanded ? null : track.id)}
        className="w-full text-left flex gap-3 items-center"
        style={{ padding: compact ? '8px 12px' : 12 }}
      >
        <div
          className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ width: compact ? 36 : 44, height: compact ? 36 : 44, background: track.cover ? 'var(--surface2)' : gradientFor(track), border: '1px solid var(--border)' }}
        >
          {track.cover && <img src={track.cover} alt={track.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ fontSize: compact ? 13 : 14, color: 'var(--text)', lineHeight: 1.3 }}>
            {track.title}
          </p>
          <p className="truncate" style={{ fontSize: compact ? 11 : 12, color: 'var(--text-dim)', marginTop: 1 }}>
            {track.artist}{!compact && track.album ? ` · ${track.album}` : ''}
          </p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
          {track.bpm && (
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{track.bpm}</span>
          )}
          {keyDisp && <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-dim)' }}>{keyDisp}</span>}
          {isPlaying && (
            <span style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Playing</span>
          )}
        </div>
      </button>
      {isExpanded && (
        <ExpandedPanel
          track={track}
          setNowPlaying={p.setNowPlaying ? (t) => { p.setNowPlaying(t); p.setExpandedId(null); } : null}
          onGenreChange={p.handleGenreChange}
          onSaveEdit={p.handleSaveEdit}
          onDelete={p.handleDelete}
        />
      )}
    </div>
  );
}

/* ── Song view: pure alphabetical list ──────────────────────────────────────── */

function SongView({ tracks, ...p }) {
  const sorted = [...tracks].sort((a, b) => byAlpha(a.title, b.title));
  return sorted.map((t) => <TrackRow key={t.id} track={t} {...p} />);
}

/* ── Album view: 4-column jacket grid + drill-down with vinyl sides ─────────── */

const albumKeyOf = (t) => `${t.artist || ''}::${t.album || '—'}`;

function albumGroups(tracks) {
  const map = new Map();
  for (const t of tracks) {
    const k = albumKeyOf(t);
    if (!map.has(k)) map.set(k, { key: k, album: t.album || '—', artist: t.artist || '', cover: t.cover || null, tracks: [] });
    const g = map.get(k);
    g.tracks.push(t);
    if (!g.cover && t.cover) g.cover = t.cover;
  }
  return [...map.values()].sort((a, b) => byAlpha(a.album, b.album));
}

function AlbumGrid({ tracks, onSelect }) {
  const groups = albumGroups(tracks);
  return (
    <div className="grid grid-cols-4 gap-2 px-3">
      {groups.map((g) => (
        <button key={g.key} onClick={() => onSelect(g.key)} className="text-left">
          <div
            className="w-full aspect-square rounded-lg overflow-hidden"
            style={{ background: g.cover ? 'var(--surface2)' : gradientFor({ id: g.key }), border: '1px solid var(--border)' }}
          >
            {g.cover && <img src={g.cover} alt={g.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <p className="truncate" style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.2 }}>{g.album}</p>
        </button>
      ))}
    </div>
  );
}

function AlbumDetail({ tracks, albumKey, onBack, ...p }) {
  const g = albumGroups(tracks).find((x) => x.key === albumKey);
  if (!g) return null;
  // Split by vinyl side (leading letter of position). No letters → flat list.
  const sides = new Map();
  for (const t of g.tracks) {
    const side = posParts(t.position).side || '—';
    if (!sides.has(side)) sides.set(side, []);
    sides.get(side).push(t);
  }
  const sideNames = [...sides.keys()].sort(byAlpha);
  const flat = sideNames.length === 1 && sideNames[0] === '—';
  return (
    <div>
      <div className="flex items-center gap-3 px-4 pb-3">
        <button onClick={onBack} className="p-1 -ml-1" style={{ color: 'var(--text-dim)' }} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div
          className="flex-shrink-0 rounded-lg overflow-hidden"
          style={{ width: 52, height: 52, background: g.cover ? 'var(--surface2)' : gradientFor({ id: g.key }), border: '1px solid var(--border)' }}
        >
          {g.cover && <img src={g.cover} alt={g.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate" style={{ fontSize: 15, color: 'var(--text)' }}>{g.album}</p>
          <p className="truncate" style={{ fontSize: 12, color: 'var(--text-dim)' }}>{g.artist} · {g.tracks.length}曲</p>
        </div>
      </div>
      {flat ? (
        [...g.tracks].sort((a, b) => posParts(a.position).num - posParts(b.position).num).map((t) => <TrackRow key={t.id} track={t} compact {...p} />)
      ) : (
        sideNames.map((side) => (
          <div key={side}>
            <SectionHeader label={side === '—' ? 'Other' : `${side} Side`} />
            {sides.get(side).sort((a, b) => posParts(a.position).num - posParts(b.position).num).map((t) => (
              <TrackRow key={t.id} track={t} compact {...p} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

/* ── Artist view: alphabetical artists → albums with songs ──────────────────── */

function ArtistList({ tracks, onSelect }) {
  const map = new Map();
  for (const t of tracks) {
    const a = t.artist || '—';
    map.set(a, (map.get(a) || 0) + 1);
  }
  const artists = [...map.entries()].sort((a, b) => byAlpha(a[0], b[0]));
  return artists.map(([name, count]) => (
    <button
      key={name}
      onClick={() => onSelect(name)}
      className="w-full flex items-center justify-between text-left mx-3 mb-1.5 rounded-xl px-4 py-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: 'calc(100% - 24px)' }}
    >
      <span className="truncate font-medium" style={{ fontSize: 14, color: 'var(--text)' }}>{name}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{count}曲 ›</span>
    </button>
  ));
}

function ArtistDetail({ tracks, artist, onBack, ...p }) {
  const mine = tracks.filter((t) => (t.artist || '—') === artist);
  const albums = new Map();
  for (const t of mine) {
    const al = t.album || '—';
    if (!albums.has(al)) albums.set(al, []);
    albums.get(al).push(t);
  }
  const names = [...albums.keys()].sort(byAlpha);
  return (
    <div>
      <div className="flex items-center gap-2 px-4 pb-3">
        <button onClick={onBack} className="p-1 -ml-1" style={{ color: 'var(--text-dim)' }} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className="font-semibold truncate" style={{ fontSize: 16, color: 'var(--text)' }}>{artist}</p>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{mine.length}曲</span>
      </div>
      {names.map((al) => (
        <div key={al}>
          <SectionHeader label={al} />
          {albums.get(al)
            .sort((a, b) => posParts(a.position).num - posParts(b.position).num || byAlpha(a.title, b.title))
            .map((t) => <TrackRow key={t.id} track={t} compact {...p} />)}
        </div>
      ))}
    </div>
  );
}

/* ── Grouped view (Genre / BPM / Key) ───────────────────────────────────────── */

function GroupedView({ tracks, groupOf, sortGroups, ...p }) {
  const map = new Map();
  for (const t of tracks) {
    const g = groupOf(t);
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(t);
  }
  const names = [...map.keys()].sort(sortGroups);
  return names.map((name) => (
    <div key={name}>
      <SectionHeader label={name} />
      {map.get(name).sort((a, b) => byAlpha(a.title, b.title)).map((t) => (
        <TrackRow key={t.id} track={t} compact {...p} />
      ))}
    </div>
  ));
}

function SectionHeader({ label }) {
  return (
    <div className="px-4 pt-2 pb-1.5 flex items-center gap-2">
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{label}</span>
      <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
    </div>
  );
}

/* ── Expanded panel (play / genre / edit / delete) ──────────────────────────── */

function ExpandedPanel({ track, setNowPlaying, onGenreChange, onSaveEdit, onDelete }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState({
    bpm: track.bpm ?? '',
    camelotKey: track.camelotKey ?? toCamelot(track.key, track.mode) ?? '',
    year: track.year ?? '',
    album: track.album ?? '',
    genre: track.genre ?? '',
  });
  const set = (k, v) => setEdits((p) => ({ ...p, [k]: v }));

  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' };

  if (editing) {
    return (
      <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block mb-1" style={{ fontSize: 10, color: 'var(--text-dim)' }}>BPM</label>
            <input
              type="text" inputMode="decimal" value={edits.bpm}
              onChange={(e) => set('bpm', e.target.value.replace(/[^\d.]/g, ''))}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none" style={inputStyle}
            />
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 10, color: 'var(--text-dim)' }}>Key</label>
            <select
              value={edits.camelotKey} onChange={(e) => set('camelotKey', e.target.value)}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none" style={inputStyle}
            >
              <option value="">—</option>
              {CAMELOT_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 10, color: 'var(--text-dim)' }}>Year</label>
            <input
              type="text" inputMode="numeric" value={edits.year}
              onChange={(e) => set('year', e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none" style={inputStyle}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block mb-1" style={{ fontSize: 10, color: 'var(--text-dim)' }}>Album</label>
            <input
              type="text" value={edits.album} onChange={(e) => set('album', e.target.value)}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none" style={inputStyle}
            />
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 10, color: 'var(--text-dim)' }}>Genre</label>
            <select
              value={edits.genre} onChange={(e) => set('genre', e.target.value)}
              className="w-full text-xs rounded-lg px-2 py-1.5 outline-none" style={inputStyle}
            >
              <option value="">—</option>
              {GENRES.slice(1).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => { await onSaveEdit(track, edits); setEditing(false); }}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            {t('save')}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: 'var(--surface2)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 flex gap-2 items-center" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      {setNowPlaying && (
        <button
          onClick={() => setNowPlaying(track)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
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
        onChange={(e) => onGenreChange(track.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none min-w-0"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
      >
        <option value="">— Set genre —</option>
        {GENRES.slice(1).map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <button
        onClick={() => setEditing(true)}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold flex-shrink-0"
        style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
      >
        {t('edit')}
      </button>
      <button
        onClick={() => onDelete(track)}
        className="rounded-lg px-2.5 py-1.5 text-xs flex-shrink-0"
        style={{ background: 'rgba(242,114,107,0.1)', color: '#f2726b', border: '1px solid rgba(242,114,107,0.35)' }}
        aria-label="Delete track"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

function EmptyState({ query, genre, total, onAddRecord }) {
  const t = useT();
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
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
        <p style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{t('crateEmpty')}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          {t('crateEmptySub')}
        </p>
        {onAddRecord && (
          <button
            onClick={onAddRecord}
            className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--bg)', fontSize: 14 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('addRecordBtn')}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-32 text-center px-6">
      <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{t('noMatch')}</p>
    </div>
  );
}
