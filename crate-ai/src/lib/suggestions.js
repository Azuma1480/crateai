import { areCamelotCompatible, camelotCompatibilityLabel, toCamelot } from './camelot.js';

// Generate next-track suggestions based on:
//   1. Camelot wheel key compatibility
//   2. BPM compatibility (±8%)
//   3. Genre match
//   4. Energy level proximity
//
// Returns top N tracks sorted by score, each with a reason string.

export function getSuggestions(nowPlaying, library, limit = 5) {
  if (!nowPlaying || library.length === 0) return [];

  const nowCamelot = toCamelot(nowPlaying.key, nowPlaying.mode);
  const nowBpm = nowPlaying.bpm;
  const nowGenre = nowPlaying.genre;
  const nowEnergy = nowPlaying.energy;

  const scored = library
    .filter((t) => t.id !== nowPlaying.id) // exclude the track itself
    .map((track) => {
      let score = 0;
      const reasons = [];

      const trackCamelot = toCamelot(track.key, track.mode);

      // ── Key compatibility (0–40 pts) ────────────────────────────────────
      const keyLabel = camelotCompatibilityLabel(nowCamelot, trackCamelot);
      if (keyLabel === 'Same key') {
        score += 40;
        reasons.push('Same key');
      } else if (keyLabel) {
        score += 25;
        reasons.push(keyLabel);
      }

      // ── BPM compatibility (0–30 pts) ─────────────────────────────────────
      if (nowBpm && track.bpm) {
        const bpmDiff = Math.abs(nowBpm - track.bpm);
        const bpmPct = bpmDiff / nowBpm;
        const sign = track.bpm > nowBpm ? '+' : '-';
        const diffStr = `${sign}${Math.round(bpmDiff)} BPM`;

        if (bpmDiff < 1) {
          score += 30;
          reasons.push('Same BPM');
        } else if (bpmPct <= 0.04) {
          score += 25;
          reasons.push(diffStr);
        } else if (bpmPct <= 0.08) {
          score += 15;
          reasons.push(diffStr);
        }
        // Outside ±8% = 0 pts, no reason added
      }

      // ── Genre match (0–20 pts) ───────────────────────────────────────────
      if (nowGenre && track.genre && nowGenre === track.genre) {
        score += 20;
        reasons.push(track.genre);
      }

      // ── Energy proximity (0–10 pts) ──────────────────────────────────────
      if (nowEnergy != null && track.energy != null) {
        const diff = Math.abs(nowEnergy - track.energy);
        if (diff < 0.1) {
          score += 10;
        } else if (diff < 0.25) {
          score += 5;
        }
      }

      return { track, score, reasons };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ track, score, reasons }) => ({
    ...track,
    _score: score,
    _reason: reasons.join(' · ') || 'Vibe match',
  }));
}

// Filter library by BPM range (±bpmTolerance)
export function filterByBpm(library, targetBpm, tolerance = 5) {
  if (!targetBpm) return library;
  return library.filter(
    (t) => t.bpm && Math.abs(t.bpm - targetBpm) <= tolerance
  );
}
