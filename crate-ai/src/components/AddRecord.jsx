import { useState } from 'react';
import { searchDiscogs, getRelease } from '../lib/discogs.js';
import { searchSpotifyTrack } from '../lib/spotify.js';
import { getSetting, saveAlbum, saveTracks } from '../lib/db.js';
import { gradientFor } from '../lib/art.js';
import { camelotToKeyMode } from '../lib/rekordbox.js';
import PhotoImport from './PhotoImport.jsx';

export const CAMELOT_KEYS = [
  '1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A',
  '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', '10B', '11B', '12B',
];

const GENRES = [
  'R&B', 'Korean Indie', 'Japanese City Pop', 'Funk', 'Hip-Hop',
  'Pop', 'Jazz', 'Disco', 'House', 'Lo-fi Hip-Hop',
];

const makeTrackId = (albumId, pos, title) =>
  `${albumId}_${pos}_${title}`.replace(/\s+/g, '_').toLowerCase();

export default function AddRecord({ onImportComplete }) {
  const [mode, setMode] = useState('discogs');
  const [step, setStep] = useState('search');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [releaseDetail, setReleaseDetail] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingRelease, setLoadingRelease] = useState(false);

  const reset = () => {
    setStep('search');
    setQuery('');
    setSearchResults([]);
    setSelectedRelease(null);
    setReleaseDetail(null);
    setSelectedGenre('');
    setError(null);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setSearching(true);
    try {
      const token = await getSetting('discogsToken');
      if (!token) throw new Error('Discogs token not set. Go to Settings.');
      const results = await searchDiscogs(query.trim(), token);
      setSearchResults(results);
      setStep('results');
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handlePickRelease = async (release) => {
    setSelectedRelease(release);
    setLoadingRelease(true);
    setError(null);
    try {
      const token = await getSetting('discogsToken');
      const detail = await getRelease(release.id, token);
      setReleaseDetail(detail);
      setStep('tracklist');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRelease(false);
    }
  };

  const handleImport = async () => {
    if (!releaseDetail) return;
    setStep('importing');
    setError(null);

    try {
      const clientId = await getSetting('spotifyClientId');
      const clientSecret = await getSetting('spotifyClientSecret');

      const tracksRaw = releaseDetail.tracklist.map((t) => ({
        id: makeTrackId(releaseDetail.id, t.position, t.title),
        albumId: String(releaseDetail.id),
        title: t.title,
        artist: t.artist,
        album: releaseDetail.title,
        cover: releaseDetail.cover,
        genre: selectedGenre || null,
        position: t.position,
        duration: t.duration,
      }));

      let enrichedTracks = tracksRaw;

      if (clientId && clientSecret) {
        setImportProgress({ done: 0, total: tracksRaw.length });
        const enriched = [];
        for (let i = 0; i < tracksRaw.length; i++) {
          const t = tracksRaw[i];
          try {
            const features = await searchSpotifyTrack(t.title, t.artist, clientId, clientSecret);
            enriched.push({
              ...t,
              bpm: features?.bpm ?? null,
              key: features?.key ?? null,
              mode: features?.mode ?? null,
              energy: features?.energy ?? null,
              danceability: features?.danceability ?? null,
              spotifyId: features?.spotifyId ?? null,
            });
          } catch {
            enriched.push(t);
          }
          setImportProgress({ done: i + 1, total: tracksRaw.length });
          await new Promise((r) => setTimeout(r, 100));
        }
        enrichedTracks = enriched;
      }

      await saveAlbum({
        id: String(releaseDetail.id),
        title: releaseDetail.title,
        artist: releaseDetail.artist,
        year: releaseDetail.year,
        cover: releaseDetail.cover,
        genre: selectedGenre || null,
        importedAt: Date.now(),
      });

      await saveTracks(enrichedTracks);

      setStep('done');
      onImportComplete?.();
    } catch (err) {
      setError(err.message);
      setStep('tracklist');
    }
  };

  const titleFor = {
    search: 'Add Record', results: 'Pick Album', tracklist: 'Confirm Tracks',
    importing: 'Importing…', done: 'Done!',
  };

  return (
    <div className="flex flex-col h-full transition-colors duration-500" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-3">
          {step !== 'search' && step !== 'done' && (
            <button onClick={reset} className="p-1 -ml-1" style={{ color: 'var(--text-dim)' }} aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <h1 className="font-bold" style={{ fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {titleFor[step]}
          </h1>
        </div>
      </div>

      <div className="flex-1 scroll-area px-4 pb-6">
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(242,114,107,0.12)', border: '1px solid rgba(242,114,107,0.4)', color: '#f2726b' }}>
            {error}
          </div>
        )}

        {/* STEP: Search */}
        {step === 'search' && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface2)' }}>
              {[['discogs', 'Discogs'], ['photo', 'Photo'], ['manual', 'Manual']].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{ background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? 'var(--bg)' : 'var(--text-dim)' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'photo' && <PhotoImport onImportComplete={onImportComplete} />}
            {mode === 'manual' && <ManualAdd onImportComplete={onImportComplete} />}
            {mode === 'discogs' && (
              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>
                    Search album or artist
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. Marvin Gaye What's Going On"
                      className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={searching || !query.trim()}
                      className="px-4 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
                      style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                    >
                      {searching ? (
                        <svg className="w-5 h-5 spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : 'Search'}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>How it works</p>
                  <ol style={{ fontSize: 12, color: 'var(--text-dim)', listStyle: 'decimal inside', lineHeight: 1.9 }}>
                    <li>Search Discogs for the album</li>
                    <li>Pick the correct pressing</li>
                    <li>CrateAI fetches BPM &amp; key from Spotify</li>
                    <li>Tracks saved to your local library</li>
                  </ol>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STEP: Results */}
        {step === 'results' && (
          <div className="flex flex-col gap-2">
            {loadingRelease && (
              <div className="flex items-center justify-center py-12">
                <svg className="w-8 h-8 spin" style={{ color: 'var(--accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            )}
            {!loadingRelease && searchResults.length === 0 && (
              <p className="text-center py-8" style={{ color: 'var(--text-dim)', fontSize: 13 }}>No results found</p>
            )}
            {!loadingRelease && searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => handlePickRelease(r)}
                className="w-full text-left rounded-xl p-3 flex gap-3 transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Thumb src={r.thumb} seed={r} size={56} />
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2 font-medium" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}>{r.title}</p>
                  {r.year && <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{r.year}</p>}
                  {r.format && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{r.format}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP: Tracklist */}
        {step === 'tracklist' && releaseDetail && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Thumb src={releaseDetail.cover} seed={releaseDetail} size={64} />
              <div className="min-w-0">
                <p className="font-semibold line-clamp-2" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}>{releaseDetail.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{releaseDetail.artist}</p>
                {releaseDetail.year && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{releaseDetail.year}</p>}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{releaseDetail.tracklist.length} tracks</p>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Set genre for all tracks</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                <option value="">— No genre —</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>Tracks to import</p>
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {releaseDetail.tracklist.map((t, i) => (
                  <div key={i} className="px-3 py-2 flex gap-2" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 24, flexShrink: 0, paddingTop: 2 }}>{t.position || i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontSize: 13, color: 'var(--text)' }}>{t.title}</p>
                      {t.artist !== releaseDetail.artist && (
                        <p className="truncate" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.artist}</p>
                      )}
                    </div>
                    {t.duration && <span className="ml-auto" style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, paddingTop: 2 }}>{t.duration}</span>}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleImport}
              className="w-full py-3.5 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              Import {releaseDetail.tracklist.length} tracks
            </button>
          </div>
        )}

        {/* STEP: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 spin" style={{ color: 'var(--accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)' }}>
                  {importProgress.done}/{importProgress.total}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p style={{ color: 'var(--text)', fontWeight: 500 }}>Fetching BPM &amp; key</p>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>Searching Spotify for each track…</p>
            </div>
            {importProgress.total > 0 && (
              <div className="w-full rounded-full h-1.5" style={{ background: 'var(--surface2)' }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${(importProgress.done / importProgress.total) * 100}%`, background: 'var(--accent)' }} />
              </div>
            )}
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-10 h-10" style={{ color: 'var(--accent)' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="font-bold" style={{ fontSize: 20, color: 'var(--text)' }}>Added to crate!</p>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
                {releaseDetail?.tracklist?.length} tracks from {releaseDetail?.title}
              </p>
            </div>
            <button onClick={reset} className="px-8 py-3 rounded-xl font-medium" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
              Add another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Manual single-track entry — no APIs, guaranteed to work offline ── */
function ManualAdd({ onImportComplete }) {
  const [form, setForm] = useState({ title: '', artist: '', album: '', year: '', bpm: '', camelotKey: '', genre: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setMsg(''); };
  const canSave = form.title.trim() && form.artist.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { key, mode } = form.camelotKey ? camelotToKeyMode(form.camelotKey) : { key: null, mode: null };
      const id = `manual_${`${form.artist}_${form.title}`.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}`;
      await saveTracks([{
        id,
        albumId: null,
        title: form.title.trim(),
        artist: form.artist.trim(),
        album: form.album.trim() || null,
        year: form.year ? Number(form.year) : null,
        genre: form.genre || null,
        bpm: form.bpm ? Math.round(Number(form.bpm)) : null,
        camelotKey: form.camelotKey || null,
        key, mode,
        cover: null,
        source: 'manual',
      }]);
      setMsg(`✓ 「${form.title.trim()}」を登録しました`);
      setForm({ title: '', artist: '', album: '', year: '', bpm: '', camelotKey: '', genre: '' });
      onImportComplete?.();
    } catch (err) {
      setMsg(`エラー: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, props = {}) => (
    <div>
      <label className="block mb-1.5" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</label>
      <input
        type="text"
        value={form[key]}
        onChange={(e) => set(key, props.numeric ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)}
        placeholder={props.placeholder || ''}
        inputMode={props.numeric ? 'decimal' : undefined}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  );

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
        1曲を直接登録します。BPMとキーはサジェストに必要です（後からLibraryで編集もできます）。
      </p>
      {field('Track title *', 'title', { placeholder: 'e.g. Stay With Me' })}
      {field('Artist *', 'artist', { placeholder: 'e.g. Miki Matsubara' })}
      {field('Album', 'album', { placeholder: 'e.g. Pocket Park' })}
      <div className="grid grid-cols-2 gap-2">
        {field('Year', 'year', { placeholder: '1979', numeric: true })}
        {field('BPM', 'bpm', { placeholder: '112', numeric: true })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block mb-1.5" style={{ fontSize: 11, color: 'var(--text-dim)' }}>Key (Camelot)</label>
          <select
            value={form.camelotKey}
            onChange={(e) => set('camelotKey', e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">— なし —</option>
            {CAMELOT_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1.5" style={{ fontSize: 11, color: 'var(--text-dim)' }}>Genre</label>
          <select
            value={form.genre}
            onChange={(e) => set('genre', e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">— なし —</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      {msg && (
        <p style={{ fontSize: 12, color: msg.startsWith('✓') ? '#52d98a' : '#f2726b' }}>{msg}</p>
      )}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
        style={{ background: canSave ? 'var(--accent)' : 'var(--surface2)', color: canSave ? 'var(--bg)' : 'var(--text-muted)' }}
      >
        {saving ? '登録中…' : 'ライブラリに登録'}
      </button>
    </div>
  );
}

function Thumb({ src, seed, size }) {
  return (
    <div
      className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size, background: src ? 'var(--surface2)' : gradientFor(seed || {}) }}
    >
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
    </div>
  );
}
