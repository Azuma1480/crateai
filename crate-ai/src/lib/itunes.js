// iTunes Search API — free, no key, CORS-enabled. Used as the zero-setup
// fallback for album matching when no Discogs token/proxy is configured.
// (The legacy prototype already used this API from the browser, so it is
// proven to work from the Pages origin.)

export async function itunesSearchAlbums(query, limit = 8) {
  const params = new URLSearchParams({ term: query, entity: 'album', limit: String(limit) });
  const res = await fetch(`https://itunes.apple.com/search?${params}`);
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    id: `itunes_${r.collectionId}`,
    title: `${r.artistName} - ${r.collectionName}`,
    artist: r.artistName,
    year: r.releaseDate ? new Date(r.releaseDate).getFullYear() : null,
    thumb: r.artworkUrl100 || null,
    cover: r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '600x600') : null,
    format: 'iTunes',
  }));
}

// Fetch the full track list for an iTunes collection id.
export async function itunesAlbumTracks(collectionId) {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${collectionId}&entity=song&limit=200`);
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const data = await res.json();
  const rows = (data.results || []).filter((r) => r.wrapperType === 'track');
  rows.sort((a, b) => (a.discNumber - b.discNumber) || (a.trackNumber - b.trackNumber));
  return rows.map((r) => ({
    title: r.trackName,
    artist: r.artistName,
    position: String(r.trackNumber),
    duration: r.trackTimeMillis
      ? `${Math.floor(r.trackTimeMillis / 60000)}:${String(Math.round((r.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
      : null,
    genre: r.primaryGenreName || null,
  }));
}

// Search iTunes for the album and return the raw best match (with
// collectionId, artwork, year) — or null when nothing plausible is found.
const norm = (s) => String(s).toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => new Set(norm(s).split(' ').filter(Boolean));
const overlap = (a, b) => {
  const ta = tokens(a); const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.min(ta.size, tb.size);
};

export async function itunesFindAlbum(artist, title) {
  const params = new URLSearchParams({ term: `${artist} ${title}`, entity: 'album', limit: '10' });
  const res = await fetch(`https://itunes.apple.com/search?${params}`);
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const data = await res.json();
  let best = null; let bestScore = 0;
  for (const r of data.results || []) {
    const score = overlap(artist, r.artistName) * 0.5 + overlap(title, r.collectionName) * 0.5;
    if (score > bestScore) { best = r; bestScore = score; }
  }
  if (!best || bestScore < 0.6) return null;
  return {
    collectionId: best.collectionId,
    artist: best.artistName,
    title: best.collectionName,
    year: best.releaseDate ? new Date(best.releaseDate).getFullYear() : null,
    cover: best.artworkUrl100 ? best.artworkUrl100.replace('100x100', '600x600') : null,
    genre: best.primaryGenreName || null,
  };
}
