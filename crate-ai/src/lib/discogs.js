// Discogs API client
// Docs: https://www.discogs.com/developers/
// Auth: Personal Access Token in Authorization header

const BASE = 'https://api.discogs.com';
const UA = 'CrateAI/1.0 +https://github.com/crate-ai';

async function discogsGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Discogs token=${token}`,
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discogs ${res.status}: ${text}`);
  }
  return res.json();
}

// Search for releases (albums/singles)
// Returns array of { id, title, artist, year, thumb, format, label }
export async function searchDiscogs(query, token, page = 1) {
  const params = new URLSearchParams({
    q: query,
    type: 'release',
    per_page: 20,
    page,
  });
  const data = await discogsGet(`/database/search?${params}`, token);
  return (data.results || []).map((r) => ({
    id: r.id,
    title: r.title,
    artist: (r.artist || (r.artists_sort ? r.artists_sort : null)),
    year: r.year,
    thumb: r.thumb || null,
    cover: r.cover_image || r.thumb || null,
    format: r.format ? r.format.join(', ') : '',
    label: r.label ? r.label[0] : '',
    resourceUrl: r.resource_url,
  }));
}

// Get full release details including tracklist
// Returns { id, title, artist, year, cover, genres, tracklist }
export async function getRelease(releaseId, token) {
  const data = await discogsGet(`/releases/${releaseId}`, token);

  const artist =
    data.artists_sort ||
    (data.artists && data.artists.length > 0
      ? data.artists.map((a) => a.name).join(', ')
      : 'Unknown Artist');

  const tracklist = (data.tracklist || [])
    .filter((t) => t.type_ === 'track' || !t.type_)
    .map((t, i) => ({
      position: t.position || String(i + 1),
      title: t.title,
      duration: t.duration || null,
      // Artist override for compilations
      artist:
        t.artists && t.artists.length > 0
          ? t.artists.map((a) => a.name).join(', ')
          : artist,
    }));

  return {
    id: data.id,
    title: data.title,
    artist,
    year: data.year,
    cover: data.images && data.images.length > 0 ? data.images[0].uri : null,
    genres: data.genres || [],
    styles: data.styles || [],
    label: data.labels && data.labels.length > 0 ? data.labels[0].name : '',
    tracklist,
  };
}

// Simple connectivity test
export async function testDiscogs(token) {
  const data = await discogsGet('/database/search?q=test&per_page=1', token);
  return !!(data && data.results);
}
