// Spotify API client — Client Credentials flow (no user login)
// Docs: https://developer.spotify.com/documentation/web-api

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

// In-memory token cache
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiry - 30000) {
    return cachedToken;
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify auth failed: ${err}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

async function spotifyGet(path, clientId, clientSecret) {
  const token = await getAccessToken(clientId, clientSecret);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired — clear cache and retry once
      cachedToken = null;
      return spotifyGet(path, clientId, clientSecret);
    }
    const err = await res.text();
    throw new Error(`Spotify ${res.status}: ${err}`);
  }
  return res.json();
}

// Search for a track, return best match or null
// Returns { id, title, artist, album, bpm, key, mode, energy, danceability, valence }
export async function searchSpotifyTrack(title, artist, clientId, clientSecret) {
  const q = encodeURIComponent(`track:${title} artist:${artist}`);
  const data = await spotifyGet(
    `/search?q=${q}&type=track&limit=1`,
    clientId,
    clientSecret
  );

  const items = data?.tracks?.items;
  if (!items || items.length === 0) {
    // Fallback: search by title only
    const q2 = encodeURIComponent(title);
    const data2 = await spotifyGet(
      `/search?q=${q2}&type=track&limit=1`,
      clientId,
      clientSecret
    );
    const items2 = data2?.tracks?.items;
    if (!items2 || items2.length === 0) return null;
    return getAudioFeatures(items2[0], clientId, clientSecret);
  }

  return getAudioFeatures(items[0], clientId, clientSecret);
}

async function getAudioFeatures(trackObj, clientId, clientSecret) {
  const { id, name, artists, album } = trackObj;
  try {
    const features = await spotifyGet(
      `/audio-features/${id}`,
      clientId,
      clientSecret
    );
    return {
      spotifyId: id,
      spotifyTitle: name,
      spotifyArtist: artists.map((a) => a.name).join(', '),
      spotifyAlbum: album?.name,
      bpm: features.tempo ? Math.round(features.tempo) : null,
      key: features.key !== -1 ? features.key : null,
      mode: features.mode,
      energy: features.energy,
      danceability: features.danceability,
      valence: features.valence,
    };
  } catch {
    return {
      spotifyId: id,
      spotifyTitle: name,
      spotifyArtist: artists.map((a) => a.name).join(', '),
      bpm: null,
      key: null,
      mode: null,
      energy: null,
    };
  }
}

// Batch fetch audio features for multiple tracks
// Accepts array of { title, artist } objects, returns same array with features filled in
export async function batchFetchFeatures(tracks, clientId, clientSecret) {
  const results = [];
  // Rate limit: process sequentially with small delays
  for (const track of tracks) {
    try {
      const features = await searchSpotifyTrack(
        track.title,
        track.artist,
        clientId,
        clientSecret
      );
      results.push({ ...track, ...(features || {}) });
    } catch (err) {
      console.warn(`Spotify lookup failed for "${track.title}":`, err.message);
      results.push(track);
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 150));
  }
  return results;
}

// Test connectivity
export async function testSpotify(clientId, clientSecret) {
  const token = await getAccessToken(clientId, clientSecret);
  return !!token;
}
