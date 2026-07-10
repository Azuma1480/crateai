import { openDB } from 'idb';

const DB_NAME = 'crate-ai';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Tracks store
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('genre', 'genre');
          trackStore.createIndex('albumId', 'albumId');
          trackStore.createIndex('bpm', 'bpm');
        }
        // Albums store
        if (!db.objectStoreNames.contains('albums')) {
          db.createObjectStore('albums', { keyPath: 'id' });
        }
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(key) {
  const db = await getDB();
  const row = await db.get('settings', key);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function getAllSettings() {
  const db = await getDB();
  const all = await db.getAll('settings');
  return Object.fromEntries(all.map((r) => [r.key, r.value]));
}

// ─── Albums ──────────────────────────────────────────────────────────────────

export async function saveAlbum(album) {
  const db = await getDB();
  await db.put('albums', album);
}

export async function getAlbum(id) {
  const db = await getDB();
  return db.get('albums', id);
}

export async function getAllAlbums() {
  const db = await getDB();
  return db.getAll('albums');
}

export async function deleteAlbum(id) {
  const db = await getDB();
  // Delete all tracks for this album
  const tracks = await getTracksByAlbum(id);
  const tx = db.transaction(['albums', 'tracks'], 'readwrite');
  await tx.objectStore('albums').delete(id);
  for (const t of tracks) {
    await tx.objectStore('tracks').delete(t.id);
  }
  await tx.done;
}

// ─── Tracks ──────────────────────────────────────────────────────────────────

export async function saveTrack(track) {
  const db = await getDB();
  await db.put('tracks', track);
}

export async function saveTracks(tracks) {
  const db = await getDB();
  const tx = db.transaction('tracks', 'readwrite');
  for (const t of tracks) {
    await tx.store.put(t);
  }
  await tx.done;
}

export async function getTrack(id) {
  const db = await getDB();
  return db.get('tracks', id);
}

export async function getAllTracks() {
  const db = await getDB();
  return db.getAll('tracks');
}

export async function getTracksByAlbum(albumId) {
  const db = await getDB();
  return db.getAllFromIndex('tracks', 'albumId', albumId);
}

export async function getTracksByGenre(genre) {
  const db = await getDB();
  return db.getAllFromIndex('tracks', 'genre', genre);
}

export async function updateTrackGenre(id, genre) {
  const db = await getDB();
  const track = await db.get('tracks', id);
  if (track) {
    track.genre = genre;
    await db.put('tracks', track);
  }
}

export async function deleteTrack(id) {
  const db = await getDB();
  await db.delete('tracks', id);
}

export async function searchTracks(query) {
  const all = await getAllTracks();
  const q = query.toLowerCase();
  return all.filter(
    (t) =>
      t.title?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.album?.toLowerCase().includes(q)
  );
}
