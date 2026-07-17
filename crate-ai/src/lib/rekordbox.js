// Rekordbox XML collection import.
//
// Rekordbox (File → Export Collection in xml format) writes DJ_PLAYLISTS XML
// where each analyzed track is a <TRACK> element inside <COLLECTION>:
//   <TRACK Name="…" Artist="…" Album="…" Year="1979" Genre="…"
//          AverageBpm="112.00" Tonality="Am" TotalTime="248" … />
// AverageBpm and Tonality come from Rekordbox's own analysis, so importing
// this file gives the library accurate BPM + key with no external API.

import { saveTracks } from './db.js';

// Musical key name → Camelot code. Minor = A, Major = B.
// Enharmonics normalized (Db→C#, Eb→D#, Gb→F#, Ab→G#, Bb→A#).
const MINOR_TO_CAMELOT = {
  'A': '8A', 'E': '9A', 'B': '10A', 'F#': '11A', 'C#': '12A', 'G#': '1A',
  'D#': '2A', 'A#': '3A', 'F': '4A', 'C': '5A', 'G': '6A', 'D': '7A',
};
const MAJOR_TO_CAMELOT = {
  'C': '8B', 'G': '9B', 'D': '10B', 'A': '11B', 'E': '12B', 'B': '1B',
  'F#': '2B', 'C#': '3B', 'G#': '4B', 'D#': '5B', 'A#': '6B', 'F': '7B',
};
const ENHARMONIC = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#', 'CB': 'B', 'FB': 'E' };
// Note name → Spotify-style pitch class (for musical-notation display)
const PITCH_CLASS = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };

// Parse a Rekordbox Tonality string ("Am", "F#m", "Db", "Bbm", "Amin", "8A"…)
// into { camelotKey, key, mode } — or nulls if unrecognized.
export function parseTonality(raw) {
  if (!raw) return { camelotKey: null, key: null, mode: null };
  const s = String(raw).trim();

  // Already a Camelot code?
  const cam = s.toUpperCase().match(/^(\d{1,2})([AB])$/);
  if (cam) {
    const n = parseInt(cam[1], 10);
    if (n >= 1 && n <= 12) return { camelotKey: `${n}${cam[2]}`, key: null, mode: cam[2] === 'A' ? 0 : 1 };
  }

  const m = s.match(/^([A-Ga-g])([#b♯♭]?)\s*(m|min|minor|maj|major)?$/i);
  if (!m) return { camelotKey: null, key: null, mode: null };

  let note = m[1].toUpperCase();
  const acc = m[2];
  if (acc === '#' || acc === '♯') note += '#';
  else if (acc === 'b' || acc === '♭') note = ENHARMONIC[(note + 'B').toUpperCase()] ?? note;

  const suffix = (m[3] || '').toLowerCase();
  const isMinor = suffix === 'm' || suffix === 'min' || suffix === 'minor';

  const camelotKey = (isMinor ? MINOR_TO_CAMELOT : MAJOR_TO_CAMELOT)[note] ?? null;
  return {
    camelotKey,
    key: PITCH_CLASS[note] ?? null,
    mode: isMinor ? 0 : 1,
  };
}

// Camelot code → { key, mode } (Spotify-style pitch class + mode), for
// musical-notation display of manually-entered camelot keys.
export function camelotToKeyMode(code) {
  for (const [note, cam] of Object.entries(MINOR_TO_CAMELOT)) {
    if (cam === code) return { key: PITCH_CLASS[note], mode: 0 };
  }
  for (const [note, cam] of Object.entries(MAJOR_TO_CAMELOT)) {
    if (cam === code) return { key: PITCH_CLASS[note], mode: 1 };
  }
  return { key: null, mode: null };
}

const slug = (str) => String(str).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');

// Parse Rekordbox XML text into CrateAI track objects. Throws on malformed XML
// or when no COLLECTION tracks are found.
export function parseRekordboxXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('XMLの解析に失敗しました。Rekordboxの「コレクションをxml形式で書き出す」で作成したファイルか確認してください');
  }
  const nodes = doc.querySelectorAll('COLLECTION > TRACK');
  if (nodes.length === 0) {
    throw new Error('COLLECTION内にトラックが見つかりません。Rekordboxのコレクションxmlか確認してください');
  }

  const tracks = [];
  nodes.forEach((n) => {
    const title = n.getAttribute('Name');
    if (!title) return;
    const artist = n.getAttribute('Artist') || '';
    const album = n.getAttribute('Album') || null;
    const yearRaw = parseInt(n.getAttribute('Year') || '', 10);
    const bpmRaw = parseFloat(n.getAttribute('AverageBpm') || '');
    const { camelotKey, key, mode } = parseTonality(n.getAttribute('Tonality'));
    const totalTime = parseInt(n.getAttribute('TotalTime') || '', 10);

    tracks.push({
      id: `rb_${slug(`${artist}_${album || ''}_${title}`)}`,
      albumId: album ? `rb_album_${slug(`${artist}_${album}`)}` : null,
      title,
      artist,
      album,
      year: Number.isFinite(yearRaw) && yearRaw > 0 ? yearRaw : null,
      genre: n.getAttribute('Genre') || null,
      bpm: Number.isFinite(bpmRaw) && bpmRaw > 0 ? Math.round(bpmRaw) : null,
      camelotKey,
      key,
      mode,
      duration: Number.isFinite(totalTime) && totalTime > 0
        ? `${Math.floor(totalTime / 60)}:${String(totalTime % 60).padStart(2, '0')}`
        : null,
      cover: null,
      source: 'rekordbox',
    });
  });

  if (tracks.length === 0) throw new Error('取り込めるトラックがありません');
  return tracks;
}

// Import a Rekordbox XML File into the library.
// Returns { tracks, withBpm, withKey } counts for the result message.
export async function importRekordboxFile(file) {
  const text = await file.text();
  const tracks = parseRekordboxXml(text);
  await saveTracks(tracks);
  return {
    tracks: tracks.length,
    withBpm: tracks.filter((t) => t.bpm).length,
    withKey: tracks.filter((t) => t.camelotKey).length,
  };
}
