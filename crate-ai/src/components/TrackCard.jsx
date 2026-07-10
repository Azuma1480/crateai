import { toCamelot, keyName } from '../lib/camelot.js';

const GENRES = [
  'R&B', 'Korean Indie', 'Japanese City Pop', 'Funk', 'Hip-Hop',
  'Pop', 'Jazz', 'Disco', 'House', 'Lo-fi Hip-Hop',
];

export default function TrackCard({
  track,
  onSelect,
  onGenreChange,
  selected = false,
  showReason = false,
  compact = false,
}) {
  const camelot = toCamelot(track.key, track.mode);
  const keyLabel = keyName(track.key, track.mode);

  if (compact) {
    return (
      <button
        onClick={() => onSelect && onSelect(track)}
        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
          selected
            ? 'bg-violet-900/40 border-l-2 border-violet-400'
            : 'hover:bg-white/5 active:bg-white/10'
        }`}
      >
        {/* Album art */}
        <div className="w-10 h-10 rounded bg-[#2a2a2a] flex-shrink-0 overflow-hidden">
          {track.cover ? (
            <img src={track.cover} alt={track.album} className="w-full h-full object-cover" />
          ) : (
            <VinylIcon />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100 truncate">{track.title}</p>
          <p className="text-xs text-gray-400 truncate">
            {track.artist}
            {track.album && ` · ${track.album}`}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          {track.bpm && (
            <p className="text-xs font-mono text-violet-400">{track.bpm}</p>
          )}
          {camelot && (
            <p className="text-[10px] text-gray-500">{camelot}</p>
          )}
        </div>
      </button>
    );
  }

  return (
    <div
      className={`bg-[#1a1a1a] rounded-xl mx-3 mb-2 overflow-hidden fade-in ${
        selected ? 'ring-1 ring-violet-500' : ''
      }`}
    >
      <button
        onClick={() => onSelect && onSelect(track)}
        className="w-full text-left p-3 flex gap-3"
      >
        {/* Album art */}
        <div className="w-12 h-12 rounded-lg bg-[#2a2a2a] flex-shrink-0 overflow-hidden">
          {track.cover ? (
            <img src={track.cover} alt={track.album} className="w-full h-full object-cover" />
          ) : (
            <VinylIcon />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-100 text-sm leading-tight truncate">
            {track.title}
          </p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {track.artist}
          </p>
          {track.album && (
            <p className="text-xs text-gray-500 truncate">{track.album}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {track.bpm && (
            <span className="text-xs font-mono text-violet-400 bg-violet-900/30 px-1.5 py-0.5 rounded">
              {track.bpm} BPM
            </span>
          )}
          {camelot && (
            <span className="text-[10px] text-gray-400 bg-[#2a2a2a] px-1.5 py-0.5 rounded font-mono">
              {camelot}
            </span>
          )}
        </div>
      </button>

      {/* Reason badge (Live mode) */}
      {showReason && track._reason && (
        <div className="px-3 pb-2">
          <span className="text-[10px] text-violet-300 bg-violet-900/20 px-2 py-0.5 rounded-full">
            {track._reason}
          </span>
        </div>
      )}

      {/* Genre selector */}
      {onGenreChange && (
        <div className="px-3 pb-3">
          <select
            value={track.genre || ''}
            onChange={(e) => onGenreChange(track.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs bg-[#0f0f0f] border border-[#2a2a2a] text-gray-400 rounded-lg px-2 py-1.5 focus:border-violet-500 focus:outline-none"
          >
            <option value="">— Set genre —</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function VinylIcon() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-600" fill="currentColor">
        <circle cx="12" cy="12" r="10" opacity="0.4" />
        <circle cx="12" cy="12" r="4" opacity="0.6" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    </div>
  );
}
