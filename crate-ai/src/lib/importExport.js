// JSON import for bulk-loading records into the library.
// Lets you prep a track list offline (e.g. from record photos) and drop it
// straight into IndexedDB without going through the Discogs/Spotify flow.
//
// Expected file shape:
// {
//   "albums": [
//     {
//       "id": "optional-stable-id",       // slug generated from title+artist if omitted
//       "title": "Album Title",
//       "artist": "Album Artist",
//       "year": 1975,                      // optional
//       "cover": "https://...",            // optional
//       "genre": "Funk",                   // optional, applied to tracks that don't set their own
//       "tracks": [
//         {
//           "position": "A1",              // optional, defaults to index
//           "title": "Track Title",
//           "artist": "Track Artist",      // optional, defaults to album artist
//           "duration": "3:45",            // optional, "m:ss"
//           "bpm": 120,                    // optional
//           "key": 5,                      // optional, Spotify key 0-11
//           "mode": 1,                     // optional, 1=major 0=minor
//           "genre": "Funk"                // optional, overrides album genre
//         }
//       ]
//     }
//   ]
// }

import { saveAlbum, saveTracks } from './db.js';

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_');
}

const makeAlbumId = (title, artist) => slugify(`${artist}_${title}`);

const makeTrackId = (albumId, pos, title) =>
  `${albumId}_${pos}_${title}`.replace(/\s+/g, '_').toLowerCase();

// Validate the overall shape before touching the DB. Throws with a
// human-readable message on the first problem found.
export function validateImportData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('JSONのルートはオブジェクトである必要があります');
  }
  if (!Array.isArray(data.albums) || data.albums.length === 0) {
    throw new Error('"albums" 配列が見つかりません');
  }
  data.albums.forEach((album, i) => {
    if (!album.title) throw new Error(`albums[${i}]: "title" が必須です`);
    if (!album.artist) throw new Error(`albums[${i}]: "artist" が必須です`);
    if (!Array.isArray(album.tracks) || album.tracks.length === 0) {
      throw new Error(`albums[${i}] (${album.title}): "tracks" 配列が必要です`);
    }
    album.tracks.forEach((t, j) => {
      if (!t.title) {
        throw new Error(`albums[${i}].tracks[${j}]: "title" が必須です`);
      }
    });
  });
  return true;
}

// Import parsed JSON data into the library. Returns { albums, tracks } counts.
export async function importLibraryFromJson(data, onProgress) {
  validateImportData(data);

  let albumCount = 0;
  let trackCount = 0;

  for (const album of data.albums) {
    const albumId = album.id ? String(album.id) : makeAlbumId(album.title, album.artist);

    await saveAlbum({
      id: albumId,
      title: album.title,
      artist: album.artist,
      year: album.year ?? null,
      cover: album.cover ?? null,
      genre: album.genre ?? null,
      importedAt: Date.now(),
    });
    albumCount += 1;

    const tracks = album.tracks.map((t, i) => ({
      id: makeTrackId(albumId, t.position || i + 1, t.title),
      albumId,
      title: t.title,
      artist: t.artist || album.artist,
      album: album.title,
      cover: album.cover ?? null,
      genre: t.genre ?? album.genre ?? null,
      position: t.position || String(i + 1),
      duration: t.duration ?? null,
      bpm: t.bpm ?? null,
      key: t.key ?? null,
      mode: t.mode ?? null,
      energy: t.energy ?? null,
      danceability: t.danceability ?? null,
      spotifyId: t.spotifyId ?? null,
    }));

    await saveTracks(tracks);
    trackCount += tracks.length;

    onProgress?.({ albums: albumCount, tracks: trackCount, total: data.albums.length });
  }

  return { albums: albumCount, tracks: trackCount };
}

// Convenience wrapper: reads a File object (from an <input type="file">) and imports it.
export async function importLibraryFromFile(file, onProgress) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSONの解析に失敗しました。ファイル形式を確認してください');
  }
  return importLibraryFromJson(data, onProgress);
}
