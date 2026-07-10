// Camelot Wheel — harmonic key compatibility for DJs
//
// Spotify key: 0=C, 1=C#/Db, 2=D, 3=D#/Eb, 4=E, 5=F,
//              6=F#/Gb, 7=G, 8=G#/Ab, 9=A, 10=A#/Bb, 11=B
// Spotify mode: 1=major, 0=minor

// Map Spotify (key, mode) → Camelot code e.g. "8A", "5B"
// Major = B suffix, Minor = A suffix
const CAMELOT_MAP = {
  // Minor (A) — mode 0
  '0_0': '5A',  // C minor
  '1_0': '12A', // C# minor
  '2_0': '7A',  // D minor
  '3_0': '2A',  // Eb minor
  '4_0': '9A',  // E minor
  '5_0': '4A',  // F minor
  '6_0': '11A', // F# minor
  '7_0': '6A',  // G minor
  '8_0': '1A',  // Ab minor
  '9_0': '8A',  // A minor
  '10_0': '3A', // Bb minor
  '11_0': '10A',// B minor
  // Major (B) — mode 1
  '0_1': '8B',  // C major
  '1_1': '3B',  // C# major
  '2_1': '10B', // D major
  '3_1': '5B',  // Eb major
  '4_1': '12B', // E major
  '5_1': '7B',  // F major
  '6_1': '2B',  // F# major
  '7_1': '9B',  // G major
  '8_1': '4B',  // Ab major
  '9_1': '11B', // A major
  '10_1': '6B', // Bb major
  '11_1': '1B', // B major
};

export function toCamelot(spotifyKey, spotifyMode) {
  if (spotifyKey == null || spotifyMode == null) return null;
  return CAMELOT_MAP[`${spotifyKey}_${spotifyMode}`] || null;
}

// Parse camelot code into { number, letter }
function parseCamelot(code) {
  if (!code) return null;
  const match = code.match(/^(\d+)([AB])$/);
  if (!match) return null;
  return { number: parseInt(match[1], 10), letter: match[2] };
}

// Check if two Camelot codes are compatible
// Compatible = same code, ±1 number (same letter), or same number different letter
export function areCamelotCompatible(codeA, codeB) {
  if (!codeA || !codeB) return false;
  if (codeA === codeB) return true;

  const a = parseCamelot(codeA);
  const b = parseCamelot(codeB);
  if (!a || !b) return false;

  // Same letter, adjacent number (wrap 12↔1)
  if (a.letter === b.letter) {
    const diff = Math.abs(a.number - b.number);
    return diff === 1 || diff === 11; // 11 = wrap (1 and 12)
  }

  // Same number, different letter (relative major/minor)
  if (a.number === b.number) return true;

  return false;
}

// Return a human-readable compatibility label
export function camelotCompatibilityLabel(codeA, codeB) {
  if (!codeA || !codeB) return null;
  if (codeA === codeB) return 'Same key';

  const a = parseCamelot(codeA);
  const b = parseCamelot(codeB);
  if (!a || !b) return null;

  if (a.letter === b.letter) {
    const diff = Math.abs(a.number - b.number);
    if (diff === 1 || diff === 11) return 'Adjacent key';
  }
  if (a.number === b.number && a.letter !== b.letter) {
    return b.letter === 'B' ? 'Relative major' : 'Relative minor';
  }

  return null;
}

// Key name for display
const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function keyName(spotifyKey, spotifyMode) {
  if (spotifyKey == null) return '—';
  const note = KEY_NAMES[spotifyKey] || '?';
  const mode = spotifyMode === 1 ? 'maj' : 'min';
  return `${note} ${mode}`;
}
