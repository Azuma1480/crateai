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
