// Match Review — verify the old photo-based library against the new
// Discogs-based album detection system.
//
// The old single-file app stored its library in localStorage['ca2_lib'] as an
// array of tracks: { id, title, artist, album, genre, bpm, key, mode, energy,
// position, photo } where `photo` is the official jacket URL saved when the
// record was first identified from the user's photos.
//
// This module groups that data into albums, re-runs each album through the
// new Discogs matcher, and scores how well the old identification and the
// new match agree — so the user can review every record side by side.

import { searchDiscogs } from './discogs.js';

// Parse the old app's export (raw ca2_lib JSON). Accepts either the bare
// array or { lib: [...] } (shape of the old Firebase sync doc).
export function parseOldLibrary(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSONの解析に失敗しました。旧アプリの ca2_lib データか確認してください');
  }
  const arr = Array.isArray(data) ? data : (Array.isArray(data?.lib) ? data.lib : null);
  if (!arr) throw new Error('トラック配列が見つかりません（ca2_lib は配列のはずです）');
  const tracks = arr.filter((t) => t && (t.title || t.album));
  if (tracks.length === 0) throw new Error('取り込めるトラックがありません');
  return tracks;
}

// Group old tracks into albums (artist+album pair). Tracks without an album
// become single-track groups so nothing is silently dropped.
export function groupAlbums(tracks) {
  const map = new Map();
  for (const t of tracks) {
    const key = `${(t.artist || '').toLowerCase()}::${(t.album || t.title || '').toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        artist: t.artist || '',
        album: t.album || t.title || '',
        photo: t.photo || null,
        tracks: [],
      });
    }
    const g = map.get(key);
    g.tracks.push(t);
    if (!g.photo && t.photo) g.photo = t.photo;
  }
  return [...map.values()];
}

// Normalize a string for fuzzy comparison: lowercase, strip punctuation,
// collapse whitespace, drop common noise words.
const NOISE = new Set(['the', 'a', 'an', 'lp', 'ep', 'ost', 'feat', 'remastered', 'edition', 'deluxe']);
function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w));
}

// Token-overlap similarity in [0,1].
export function similarity(a, b) {
  const ta = tokens(a), tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const sb = new Set(tb);
  const hit = ta.filter((w) => sb.has(w)).length;
  return hit / Math.max(ta.length, tb.length);
}

// Score one Discogs result against an old album group.
// Discogs search titles are "Artist - Album".
export function scoreCandidate(group, candidate) {
  const combined = `${group.artist} ${group.album}`;
  const candTitle = candidate.title || '';
  const s1 = similarity(combined, candTitle);
  const s2 = Math.max(
    similarity(group.album, candTitle),
    similarity(group.artist, candidate.artist || candTitle)
  );
  return Math.max(s1, (s1 + s2) / 2);
}

export function verdictFor(score) {
  if (score >= 0.75) return 'match';      // 一致 — green
  if (score >= 0.45) return 'unsure';     // 要確認 — amber
  return 'mismatch';                      // 不一致 — red
}

// Match one album group via the new Discogs system. Returns a review row.
export async function matchAlbumGroup(group, token, searchFn = searchDiscogs) {
  try {
    const results = await searchFn(`${group.artist} ${group.album}`.trim(), token);
    if (!results || results.length === 0) {
      return { group, candidate: null, score: 0, verdict: 'notfound' };
    }
    let best = null, bestScore = -1;
    for (const r of results.slice(0, 8)) {
      const s = scoreCandidate(group, r);
      if (s > bestScore) { best = r; bestScore = s; }
    }
    return { group, candidate: best, score: bestScore, verdict: verdictFor(bestScore) };
  } catch (err) {
    return { group, candidate: null, score: 0, verdict: 'error', error: err.message };
  }
}

// Match all groups sequentially with a delay between requests
// (Discogs allows 60 req/min authenticated — 1.1s keeps us under it).
export async function matchAllAlbums(groups, token, onProgress, searchFn = searchDiscogs) {
  const rows = [];
  for (let i = 0; i < groups.length; i++) {
    const row = await matchAlbumGroup(groups[i], token, searchFn);
    rows.push(row);
    onProgress?.({ done: i + 1, total: groups.length, row });
    if (i < groups.length - 1) await new Promise((r) => setTimeout(r, 1100));
  }
  return rows;
}
