import { useState } from 'react';
import { searchDiscogs, getRelease } from '../lib/discogs.js';
import { searchSpotifyTrack } from '../lib/spotify.js';
import { getSetting, saveAlbum, saveTracks } from '../lib/db.js';
import PhotoImport from './PhotoImport.jsx';

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

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-[#0f0f0f] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          {step !== 'search' && step !== 'done' && (
            <button onClick={reset} className="text-gray-400 p-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                className="w-5 h-5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-100">
            {step === 'search' && 'Add Record'}
            {step === 'results' && 'Pick Album'}
            {step === 'tracklist' && 'Confirm Tracks'}
            {step === 'importing' && 'Importing…'}
            {step === 'done' && 'Done!'}
          </h1>
        </div>
      </div>

      <div className="flex-1 scroll-area p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-xl text-sm text-red-300">
            {error}
          </div>
        )}

        {/* STEP: Search */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-[#1a1a1a] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setMode('discogs')}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'discogs' ? 'bg-violet-600 text-white' : 'text-gray-500'
                }`}
              >
                Discogs
              </button>
              <button
                type="button"
                onClick={() => setMode('photo')}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'photo' ? 'bg-violet-600 text-white' : 'text-gray-500'
                }`}
              >
                Photo
              </button>
            </div>

            {mode === 'photo' ? (
              <PhotoImport onImportComplete={onImportComplete} />
            ) : (
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Search album or artist
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. Marvin Gaye What's Going On"
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:border-violet-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={searching || !query.trim()}
                      className="bg-violet-600 text-white px-4 py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                    >
                      {searching ? (
                        <svg className="w-5 h-5 spin" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth={2}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : 'Search'}
                    </button>
                  </div>
                </div>
                <div className="mt-6 bg-[#1a1a1a] rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">How it works</p>
                  <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
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
          <div className="space-y-2">
            {loadingRelease && (
              <div className="flex items-center justify-center py-12">
                <svg className="w-8 h-8 spin text-violet-400" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            )}
            {!loadingRelease && searchResults.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No results found</p>
            )}
            {!loadingRelease && searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => handlePickRelease(r)}
                className="w-full text-left bg-[#1a1a1a] rounded-xl p-3 flex gap-3 hover:bg-[#222] active:bg-[#1a1a1a] transition-colors"
              >
                <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-[#2a2a2a] overflow-hidden">
                  {r.thumb ? (
                    <img src={r.thumb} alt={r.title} className="w-full h-full object-cover" />
                  ) : (
                    <VinylPlaceholder />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 line-clamp-2 leading-tight">
                    {r.title}
                  </p>
                  {r.year && <p className="text-xs text-gray-500 mt-0.5">{r.year}</p>}
                  {r.format && <p className="text-xs text-gray-600 mt-0.5">{r.format}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP: Tracklist */}
        {step === 'tracklist' && releaseDetail && (
          <div className="space-y-4">
            <div className="flex gap-3 bg-[#1a1a1a] rounded-xl p-3">
              <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-[#2a2a2a] overflow-hidden">
                {releaseDetail.cover ? (
                  <img src={releaseDetail.cover} alt={releaseDetail.title}
                    className="w-full h-full object-cover" />
                ) : (
                  <VinylPlaceholder />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-100 text-sm leading-tight line-clamp-2">
                  {releaseDetail.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{releaseDetail.artist}</p>
                {releaseDetail.year && (
                  <p className="text-xs text-gray-500">{releaseDetail.year}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  {releaseDetail.tracklist.length} tracks
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Set genre for all tracks
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="">— No genre —</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Tracks to import</p>
              <div className="bg-[#1a1a1a] rounded-xl divide-y divide-[#2a2a2a]">
                {releaseDetail.tracklist.map((t, i) => (
                  <div key={i} className="px-3 py-2 flex gap-2">
                    <span className="text-xs text-gray-600 w-6 flex-shrink-0 pt-0.5">
                      {t.position || i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-200 truncate">{t.title}</p>
                      {t.artist !== releaseDetail.artist && (
                        <p className="text-xs text-gray-500 truncate">{t.artist}</p>
                      )}
                    </div>
                    {t.duration && (
                      <span className="ml-auto text-xs text-gray-600 flex-shrink-0 pt-0.5">
                        {t.duration}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleImport}
              className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-semibold text-sm"
            >
              Import {releaseDetail.tracklist.length} tracks
            </button>
          </div>
        )}

        {/* STEP: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 spin text-violet-400" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-mono text-violet-300">
                  {importProgress.done}/{importProgress.total}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">Fetching BPM &amp; key</p>
              <p className="text-gray-500 text-sm mt-1">Searching Spotify for each track&hellip;</p>
            </div>
            {importProgress.total > 0 && (
              <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                <div
                  className="bg-violet-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-violet-900/40 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                className="w-10 h-10 text-violet-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-100">Added to crate!</p>
              <p className="text-gray-500 text-sm mt-1">
                {releaseDetail?.tracklist?.length} tracks from {releaseDetail?.title}
              </p>
            </div>
            <button
              onClick={reset}
              className="bg-violet-600 text-white px-8 py-3 rounded-xl font-medium"
            >
              Add another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VinylPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
      <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600" fill="currentColor">
        <circle cx="12" cy="12" r="10" opacity="0.3" />
        <circle cx="12" cy="12" r="4" opacity="0.5" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    </div>
  );
}

