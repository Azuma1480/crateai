// Deezer public API via JSONP — free, keyless, and usable from the browser
// (Deezer supports output=jsonp, which sidesteps CORS entirely).
// Used to auto-fill BPM when importing a record from Discogs.
// Note: Deezer has no musical-key data; key still comes from Rekordbox
// import or manual entry.

function jsonp(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const cb = `dz_${Math.random().toString(36).slice(2)}`;
    const s = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('Deezer timeout')); }, timeoutMs);
    function cleanup() { delete window[cb]; s.remove(); clearTimeout(timer); }
    window[cb] = (data) => { cleanup(); resolve(data); };
    s.src = `${url}${url.includes('?') ? '&' : '?'}output=jsonp&callback=${cb}`;
    s.onerror = () => { cleanup(); reject(new Error('Deezer request failed')); };
    document.head.appendChild(s);
  });
}

// Look up a track's BPM: search for the best match, then fetch its detail
// (bpm only appears on the /track/{id} endpoint). Returns { bpm } or null.
export async function deezerTrackInfo(title, artist) {
  const q = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
  const search = await jsonp(`https://api.deezer.com/search?q=${q}&limit=1`);
  const hit = search?.data?.[0];
  if (!hit?.id) return null;
  const detail = await jsonp(`https://api.deezer.com/track/${hit.id}`);
  const bpm = detail?.bpm && detail.bpm > 0 ? Math.round(detail.bpm) : null;
  return { bpm };
}
