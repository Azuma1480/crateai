import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllTracks } from '../lib/db.js';
import { getSuggestions, filterByBpm } from '../lib/suggestions.js';
import { detectBpmFromMic } from '../lib/bpmDetect.js';
import { toCamelot, keyName } from '../lib/camelot.js';
import TrackCard from './TrackCard.jsx';

export default function LiveMode({ nowPlaying, setNowPlaying, libraryVersion }) {
  const [library, setLibrary] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [bpmMode, setBpmMode] = useState(false); // BPM detection mode
  const [bpmDetecting, setBpmDetecting] = useState(false);
  const [bpmProgress, setBpmProgress] = useState(0);
  const [detectedBpm, setDetectedBpm] = useState(null);
  const [bpmCandidates, setBpmCandidates] = useState([]);
  const [error, setError] = useState(null);
  const searchRef = useRef(null);

  // Load library
  const loadLibrary = useCallback(async () => {
    const all = await getAllTracks();
    setLibrary(all);
  }, []);

  useEffect(() => { loadLibrary(); }, [loadLibrary, libraryVersion]);

  // Recompute suggestions when nowPlaying or library changes
  useEffect(() => {
    if (nowPlaying && library.length > 0) {
      const s = getSuggestions(nowPlaying, library, 5);
      setSuggestions(s);
    } else {
      setSuggestions([]);
    }
  }, [nowPlaying, library]);

  // ─── Search within library ─────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = library.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q)
    );
    setSearchResults(results.slice(0, 20));
  }, [searchQuery, library]);

  const handleSelectTrack = (track) => {
    setNowPlaying(track);
    setShowSearch(false);
    setSearchQuery('');
    setBpmMode(false);
    setBpmCandidates([]);
    setDetectedBpm(null);
    setError(null);
  };

  // ─── BPM Detection ────────────────────────────────────────────────────────
  const handleBpmDetect = async () => {
    setError(null);
    setBpmDetecting(true);
    setBpmProgress(0);
    setBpmCandidates([]);
    try {
      const bpm = await detectBpmFromMic((pct) => setBpmProgress(pct));
      setBpmDetecting(false);
      if (!bpm) {
        setError('Could not detect BPM. Try in a quieter environment or search manually.');
        return;
      }
      setDetectedBpm(bpm);
      const candidates = filterByBpm(library, bpm, 5);
      setBpmCandidates(candidates);
    } catch (err) {
      setBpmDetecting(false);
      setError(err.message);
    }
  };

  const camelot = nowPlaying ? toCamelot(nowPlaying.key, nowPlaying.mode) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-[#0f0f0f]">
        <h1 className="text-xl font-bold text-gray-100">Live</h1>
      </div>

      <div className="flex-1 scroll-area px-4 pb-4 space-y-4">
        {/* ── NOW PLAYING ─────────────────────────────────────────────────── */}
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-violet-400 tracking-widest uppercase">
              Now Playing
            </span>
            {nowPlaying && (
              <button
                onClick={() => { setNowPlaying(null); setSuggestions([]); }}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>

          {nowPlaying ? (
            <div className="px-4 pb-4">
              <div className="flex gap-3 items-start">
                <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-[#2a2a2a] overflow-hidden">
                  {nowPlaying.cover ? (
                    <img src={nowPlaying.cover} alt={nowPlaying.album}
                      className="w-full h-full object-cover" />
                  ) : (
                    <VinylIcon />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100 truncate">{nowPlaying.title}</p>
                  <p className="text-sm text-gray-400 truncate">{nowPlaying.artist}</p>
                  <p className="text-xs text-gray-500 truncate">{nowPlaying.album}</p>
                </div>
              </div>
              {/* Track stats */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {nowPlaying.bpm && (
                  <Chip label={`${nowPlaying.bpm} BPM`} accent />
                )}
                {camelot && (
                  <Chip label={camelot} />
                )}
                {nowPlaying.key != null && (
                  <Chip label={keyName(nowPlaying.key, nowPlaying.mode)} />
                )}
                {nowPlaying.genre && (
                  <Chip label={nowPlaying.genre} />
                )}
                {nowPlaying.energy != null && (
                  <Chip label={`Energy ${Math.round(nowPlaying.energy * 100)}%`} />
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-500 mb-3">
                Search your library or detect BPM to find the current track
              </p>
            </div>
          )}

          {/* ── Action buttons ───────────────────────────────────────────── */}
          <div className="border-t border-[#2a2a2a] flex">
            <button
              onClick={() => {
                setShowSearch(true);
                setBpmMode(false);
                setBpmCandidates([]);
                setTimeout(() => searchRef.current?.focus(), 50);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                className="w-4 h-4">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              Search
            </button>
            <div className="w-px bg-[#2a2a2a]" />
            <button
              onClick={() => {
                setBpmMode(true);
                setShowSearch(false);
                setSearchQuery('');
                setError(null);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                className="w-4 h-4">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Detect BPM
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── SEARCH PANEL ────────────────────────────────────────────────── */}
        {showSearch && (
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden fade-in">
            <div className="px-4 pt-3 pb-2 flex gap-2">
              <input
                ref={searchRef}
                type="search"
                placeholder="Search your library…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-violet-500 focus:outline-none"
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                className="text-gray-500 px-2"
              >
                Cancel
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[#2a2a2a]">
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-gray-500 px-4 py-3">No results</p>
              )}
              {searchResults.map((t) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  compact
                  onSelect={handleSelectTrack}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── BPM DETECTION PANEL ─────────────────────────────────────────── */}
        {bpmMode && (
          <div className="bg-[#1a1a1a] rounded-2xl p-4 fade-in space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-200">BPM Detection</p>
              <button
                onClick={() => { setBpmMode(false); setBpmCandidates([]); setDetectedBpm(null); }}
                className="text-gray-500 text-xs"
              >
                ✕
              </button>
            </div>

            {!bpmDetecting && !detectedBpm && (
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-400">
                  Hold your phone near the speaker for 10 seconds
                </p>
                <button
                  onClick={handleBpmDetect}
                  className="w-full bg-violet-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    className="w-5 h-5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  Start listening
                </button>
              </div>
            )}

            {bpmDetecting && (
              <div className="text-center space-y-3">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-violet-600/20 pulse-ring" />
                  <div className="absolute inset-0 rounded-full bg-violet-600/10 pulse-ring"
                    style={{ animationDelay: '0.4s' }} />
                  <div className="w-16 h-16 rounded-full bg-violet-900/40 border-2 border-violet-500 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      className="w-7 h-7 text-violet-400">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-300">Listening… {bpmProgress}%</p>
                <div className="w-full bg-[#2a2a2a] rounded-full h-1.5">
                  <div
                    className="bg-violet-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${bpmProgress}%` }}
                  />
                </div>
              </div>
            )}

            {detectedBpm && !bpmDetecting && (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-violet-400 font-mono">{detectedBpm}</p>
                  <p className="text-sm text-gray-400">BPM detected</p>
                </div>
                {bpmCandidates.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">
                    No tracks in your library match {detectedBpm} ±5 BPM
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      {bpmCandidates.length} match{bpmCandidates.length !== 1 ? 'es' : ''} in your library
                    </p>
                    <div className="divide-y divide-[#2a2a2a] rounded-xl overflow-hidden bg-[#0f0f0f]">
                      {bpmCandidates.slice(0, 10).map((t) => (
                        <TrackCard
                          key={t.id}
                          track={t}
                          compact
                          onSelect={handleSelectTrack}
                        />
                      ))}
                    </div>
                  </>
                )}
                <button
                  onClick={() => { setDetectedBpm(null); setBpmCandidates([]); }}
                  className="w-full text-sm text-gray-400 py-2 border border-[#2a2a2a] rounded-xl"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SUGGESTIONS ─────────────────────────────────────────────────── */}
        {nowPlaying && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 tracking-widest uppercase mb-2">
              Play Next
            </p>
            {suggestions.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">No suggestions yet</p>
                <p className="text-xs text-gray-600 mt-1">
                  Make sure your library has tracks with BPM and key data
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {suggestions.map((track, i) => (
                  <div key={track.id} className="relative">
                    <div className="absolute -left-0 top-3 w-5 h-5 rounded-full bg-violet-900/50 flex items-center justify-center z-10 ml-3">
                      <span className="text-[9px] text-violet-300 font-bold">{i + 1}</span>
                    </div>
                    <div className="pl-2">
                      <TrackCard
                        track={track}
                        showReason
                        onSelect={handleSelectTrack}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!nowPlaying && !showSearch && !bpmMode && library.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Your library is empty</p>
            <p className="text-gray-600 text-xs mt-1">Add records first</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, accent = false }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-mono ${
        accent
          ? 'bg-violet-900/40 text-violet-300'
          : 'bg-[#2a2a2a] text-gray-400'
      }`}
    >
      {label}
    </span>
  );
}

function VinylIcon() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
      <svg viewBox="0 0 24 24" className="w-7 h-7 text-gray-600" fill="currentColor">
        <circle cx="12" cy="12" r="10" opacity="0.3" />
        <circle cx="12" cy="12" r="4" opacity="0.5" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    </div>
  );
}
