import { useMemo, useState } from 'react';
import { importLibraryFromJson } from '../lib/importExport.js';

const GENRES = [
  'R&B', 'Korean Indie', 'Japanese City Pop', 'Funk', 'Hip-Hop',
  'Pop', 'Jazz', 'Disco', 'House', 'Lo-fi Hip-Hop',
];

const SAMPLE_TRACKS = `A1 Track Title - Artist 3:45
A2 Another Track 4:12
B1 Last Dance - Featured Artist`;

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('写真の読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

function parseTrackLine(line, index, fallbackArtist) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const durationMatch = trimmed.match(/\b(\d{1,2}:\d{2})\s*$/);
  const duration = durationMatch ? durationMatch[1] : null;
  const withoutDuration = durationMatch
    ? trimmed.slice(0, durationMatch.index).trim()
    : trimmed;

  const parts = withoutDuration.split(/\s+/);
  const first = parts[0] || '';
  const hasPosition = /^[A-H]?\d+\.?$/i.test(first);
  const position = hasPosition ? first.replace(/\.$/, '') : String(index + 1);
  const titleAndArtist = hasPosition ? parts.slice(1).join(' ').trim() : withoutDuration;
  const [titlePart, artistPart] = titleAndArtist.split(/\s+-\s+/, 2);

  return {
    position,
    title: (titlePart || titleAndArtist || `Track ${index + 1}`).trim(),
    artist: (artistPart || fallbackArtist || '').trim(),
    duration,
  };
}

function parseTrackText(text, fallbackArtist) {
  return text
    .split(/\r?\n/)
    .map((line, index) => parseTrackLine(line, index, fallbackArtist))
    .filter(Boolean);
}

export default function PhotoImport({ onImportComplete }) {
  const [photos, setPhotos] = useState([]);
  const [album, setAlbum] = useState({
    title: '',
    artist: '',
    year: '',
    genre: '',
  });
  const [trackText, setTrackText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const tracks = useMemo(
    () => parseTrackText(trackText, album.artist),
    [trackText, album.artist]
  );

  const importData = useMemo(() => {
    const title = album.title.trim();
    const artist = album.artist.trim();
    const cover = photos[0]?.dataUrl || null;

    return {
      albums: [
        {
          id: title && artist ? slugify(`${artist}_${title}`) : undefined,
          title,
          artist,
          year: album.year ? Number(album.year) : undefined,
          genre: album.genre || undefined,
          cover,
          tracks: tracks.map((track) => ({
            ...track,
            artist: track.artist || artist,
            genre: album.genre || undefined,
          })),
        },
      ],
    };
  }, [album, photos, tracks]);

  const canImport = album.title.trim() && album.artist.trim() && tracks.length > 0;

  const handlePhotos = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setError(null);
    try {
      const loaded = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          dataUrl: await fileToDataUrl(file),
        }))
      );
      setPhotos((prev) => [...prev, ...loaded].slice(0, 6));
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleChange = (key, value) => {
    setAlbum((prev) => ({ ...prev, [key]: value }));
    setMessage('');
    setError(null);
  };

  const handleImport = async () => {
    if (!canImport) return;

    setImporting(true);
    setError(null);
    setMessage('');

    try {
      const result = await importLibraryFromJson(importData);
      setMessage(`${result.albums}枚 / ${result.tracks}曲をライブラリに追加しました`);
      onImportComplete?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-gray-100">Photo Builder</p>
            <p className="text-xs text-gray-500 mt-0.5">
              写真を見ながら曲リストを作り、JSON経由で追加します
            </p>
          </div>
          {tracks.length > 0 && (
            <span className="text-xs text-violet-300 bg-violet-900/30 px-2 py-1 rounded-full">
              {tracks.length} tracks
            </span>
          )}
        </div>

        <label className="block">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotos}
            className="hidden"
          />
          <span className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="w-4 h-4">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            レコード写真を追加
          </span>
        </label>

        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <button
                key={`${photo.name}-${index}`}
                type="button"
                onClick={() => setPreviewOpen(photo.dataUrl)}
                className="aspect-square rounded-lg overflow-hidden bg-[#2a2a2a]"
              >
                <img src={photo.dataUrl} alt={photo.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <TextField
            label="Album title"
            value={album.title}
            onChange={(value) => handleChange('title', value)}
            placeholder="e.g. What's Going On"
          />
          <TextField
            label="Artist"
            value={album.artist}
            onChange={(value) => handleChange('artist', value)}
            placeholder="e.g. Marvin Gaye"
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Year"
              value={album.year}
              onChange={(value) => handleChange('year', value.replace(/[^\d]/g, '').slice(0, 4))}
              placeholder="1971"
              inputMode="numeric"
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Genre</label>
              <select
                value={album.genre}
                onChange={(event) => handleChange('genre', event.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:border-violet-500 focus:outline-none"
              >
                <option value="">No genre</option>
                {GENRES.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Track list</label>
          <textarea
            value={trackText}
            onChange={(event) => {
              setTrackText(event.target.value);
              setMessage('');
              setError(null);
            }}
            placeholder={SAMPLE_TRACKS}
            rows={8}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-700 focus:border-violet-500 focus:outline-none font-mono leading-5 resize-none"
          />
          <p className="text-[11px] text-gray-600 mt-1">
            形式: position title - artist duration。artist と duration は省略可。
          </p>
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setPreviewOpen(previewOpen === 'json' ? false : 'json')}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-gray-200">Generated JSON</span>
            <span className="text-xs text-gray-500">{previewOpen === 'json' ? 'Hide' : 'View'}</span>
          </button>
          {previewOpen === 'json' && (
            <pre className="max-h-56 overflow-auto border-t border-[#2a2a2a] p-3 text-[11px] text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(importData, null, 2)}
            </pre>
          )}
        </div>
      )}

      {message && (
        <p className="text-xs text-green-400 bg-green-900/20 border border-green-900/40 rounded-xl px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-300 bg-red-900/30 border border-red-700 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={!canImport || importing}
        className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:bg-[#2a2a2a]"
      >
        {importing ? 'Importing...' : 'Import to Library'}
      </button>

      {previewOpen && previewOpen !== 'json' && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="self-end m-4 p-2 text-gray-300"
            aria-label="Close preview"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="w-6 h-6">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="flex-1 min-h-0 p-4 pt-0">
            <img src={previewOpen} alt="Record preview" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, inputMode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-700 focus:border-violet-500 focus:outline-none"
      />
    </div>
  );
}
