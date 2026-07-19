// Fill in missing artwork / track lists for library albums using the free
// iTunes Search API (keyless, CORS-enabled — works straight from the phone).
// Photo-verified artist/title stay authoritative: we only add cover art,
// year, and tracks, and only replace tracks that are the "（曲リスト未登録）"
// placeholder so verified tracklists are never overwritten.

import { getAllAlbums, getTracksByAlbum, saveAlbum, saveTracks, deleteTrack } from './db.js';
import { itunesFindAlbum, itunesAlbumTracks } from './itunes.js';

const PLACEHOLDER = '（曲リスト未登録）';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const makeTrackId = (albumId, pos, title) =>
  `${albumId}_${pos}_${title}`.replace(/\s+/g, '_').toLowerCase();

// Enrich one album in place. Returns a status string for the UI.
export async function enrichAlbum(album) {
  const tracks = await getTracksByAlbum(album.id);
  const placeholderOnly = tracks.length > 0 && tracks.every((t) => t.title === PLACEHOLDER);
  const needsCover = !album.cover;
  const needsTracks = placeholderOnly || tracks.length === 0;
  if (!needsCover && !needsTracks) return 'skip';

  const hit = await itunesFindAlbum(album.artist, album.title);
  if (!hit) return 'notfound';

  await saveAlbum({
    ...album,
    cover: album.cover || hit.cover,
    year: album.year || hit.year,
  });

  if (needsTracks) {
    const itTracks = await itunesAlbumTracks(hit.collectionId);
    if (itTracks.length > 0) {
      for (const t of tracks) await deleteTrack(t.id);
      await saveTracks(itTracks.map((t, i) => ({
        id: makeTrackId(album.id, t.position || i + 1, t.title),
        albumId: album.id,
        title: t.title,
        artist: t.artist || album.artist,
        album: album.title,
        cover: album.cover || hit.cover,
        genre: album.genre || t.genre || null,
        position: t.position || String(i + 1),
        duration: t.duration ?? null,
        bpm: null, key: null, mode: null,
        energy: null, danceability: null, spotifyId: null,
      })));
    }
  } else if (needsCover && hit.cover) {
    // keep verified tracks, just attach the artwork to them
    await saveTracks(tracks.map((t) => ({ ...t, cover: t.cover || hit.cover })));
  }
  return 'done';
}

// Enrich every album that's missing artwork or has only the placeholder
// track. Rate-limited politely; reports progress via callback.
export async function enrichLibrary(onProgress) {
  const albums = await getAllAlbums();
  let done = 0; let notfound = 0; let skipped = 0;
  for (let i = 0; i < albums.length; i += 1) {
    let status;
    try {
      status = await enrichAlbum(albums[i]);
    } catch {
      status = 'error';
    }
    if (status === 'done') done += 1;
    else if (status === 'skip') skipped += 1;
    else notfound += 1;
    onProgress?.({ current: i + 1, total: albums.length, album: albums[i].title, done, notfound });
    if (status !== 'skip') await delay(350);
  }
  return { done, notfound, skipped, total: albums.length };
}
