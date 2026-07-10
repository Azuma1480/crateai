import { useState, useEffect, useCallback } from 'react';
import { getAllTracks, updateTrackGenre } from '../lib/db.js';
import TrackCard from './TrackCard.jsx';

const GENRES = [
  'All', 'R&B', 'Korean Indie', 'Japanese City Pop', 'Funk', 'Hip-Hop',
  'Pop', 'Jazz', 'Disco', 'House', 'Lo-fi Hip-Hop',
];

export default function Library({ libraryVersion }) {
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
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, genre: newGenre } : t))
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 bg-[#0f0f0f]">
        <h1 className="text-xl font-bold text-gray-100 mb-3">Library</h1>

        {/* Search */}
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search tracks, artists, albums…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Genre filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`flex-shrink-0 text-xs px-3 py-1 rounded-full transition-colors ${
                genre === g
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Track count */}
      <div className="px-4 py-1">
        <p className="text-xs text-gray-500">
          {loading ? 'Loading…' : `${filtered.length} track${filtered.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 scroll-area pt-1 pb-2">
        {!loading && filtered.length === 0 && (
          <EmptyState query={query} genre={genre} total={tracks.length} />
        )}
        {filtered.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            selected={expandedId === track.id}
            onSelect={(t) => setExpandedId(expandedId === t.id ? null : t.id)}
            onGenreChange={expandedId === track.id ? handleGenreChange : null}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ query, genre, total }) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600" fill="currentColor">
            <circle cx="12" cy="12" r="10" opacity="0.3" />
            <circle cx="12" cy="12" r="4" opacity="0.5" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
        </div>
        <p className="text-gray-400 font-medium">Your crate is empty</p>
        <p className="text-gray-600 text-sm mt-1">Add records from the Add Record tab</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-32 text-center px-6">
      <p className="text-gray-500 text-sm">No tracks match your search</p>
    </div>
  );
}
