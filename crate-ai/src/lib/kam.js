// Key Adaptation Mode: calculates how a record's key shifts when pitch is
// adjusted on a turntable to match a target BPM.
//
// On an SL-1200: pitch up = faster playback = key shifts up by the same ratio.
// Each semitone ≈ 5.9463% pitch change.

const CAMELOT_TO_PITCH_B = {
  '1B': 1, '2B': 8, '3B': 3, '4B': 10, '5B': 5, '6B': 0,
  '7B': 7, '8B': 2, '9B': 9, '10B': 4, '11B': 11, '12B': 6,
};
const CAMELOT_TO_PITCH_A = {
  '1A': 8, '2A': 3, '3A': 10, '4A': 5, '5A': 0, '6A': 7,
  '7A': 2, '8A': 9, '9A': 4, '10A': 11, '11A': 6, '12A': 1,
};
const PITCH_TO_CAMELOT_B = Object.fromEntries(
  Object.entries(CAMELOT_TO_PITCH_B).map(([k, v]) => [v, k])
);
const PITCH_TO_CAMELOT_A = Object.fromEntries(
  Object.entries(CAMELOT_TO_PITCH_A).map(([k, v]) => [v, k])
);

// Returns pitch percentage needed to play `nowBpm` record at `targetBpm`.
export function pitchPercent(nowBpm, targetBpm) {
  if (!nowBpm || !targetBpm) return 0;
  return ((targetBpm - nowBpm) / nowBpm) * 100;
}

// Returns `true` if the pitch% is within the turntable's range.
export function isPitchFeasible(pct, x2 = false) {
  return Math.abs(pct) <= (x2 ? 16 : 8);
}

// Given a Camelot key string (e.g. "8B") and pitch percentage,
// returns the new Camelot key after the pitch shift.
export function shiftKeyByPitch(camelotKey, pitchPct) {
  if (!camelotKey) return camelotKey;
  const type = camelotKey.slice(-1); // 'A' or 'B'
  const map = type === 'B' ? CAMELOT_TO_PITCH_B : CAMELOT_TO_PITCH_A;
  const backMap = type === 'B' ? PITCH_TO_CAMELOT_B : PITCH_TO_CAMELOT_A;

  const pitchClass = map[camelotKey];
  if (pitchClass == null) return camelotKey;

  const semitones = Math.round(pitchPct / 5.9463);
  const newPitchClass = ((pitchClass + semitones) % 12 + 12) % 12;
  return backMap[newPitchClass] ?? camelotKey;
}

// Returns the signed Camelot step delta between two Camelot keys (−6 to +6).
export function camelotDelta(fromKey, toKey) {
  if (!fromKey || !toKey) return 0;
  const a = parseInt(fromKey);
  const b = parseInt(toKey);
  let d = b - a;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d;
}
