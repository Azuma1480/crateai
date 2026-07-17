import { toCamelot, keyName } from '../lib/camelot.js';

// Compact-only card, used in LiveMode search results
export default function TrackCard({ track, onSelect, selected = false, keyFormat = 'camelot' }) {
  const cam = track.camelotKey ?? toCamelot(track.key, track.mode);
  const keyDisp = keyFormat === 'camelot' ? cam : (keyName(track.key, track.mode) ?? cam);

  return (
    <button
      onClick={() => onSelect && onSelect(track)}
      className="w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors"
      style={{ borderTop: '1px solid var(--border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ width: 38, height: 38, background: 'var(--surface2)', border: '1px solid var(--border)' }}
      >
        {track.cover ? (
          <img src={track.cover} alt={track.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, color: 'var(--text-muted)' }} fill="currentColor">
            <circle cx="12" cy="12" r="10" opacity="0.3" />
            <circle cx="12" cy="12" r="4" opacity="0.5" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate font-medium" style={{ fontSize: 13, color: 'var(--text)' }}>{track.title}</p>
        <p className="truncate" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
          {track.artist}{track.album ? ` · ${track.album}` : ''}
        </p>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {track.bpm && (
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
            {track.bpm}
          </span>
        )}
        {keyDisp && (
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-dim)' }}>{keyDisp}</span>
        )}
      </div>
    </button>
  );
}
