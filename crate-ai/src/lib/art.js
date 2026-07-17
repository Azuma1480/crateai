// Shared artwork helpers — deterministic placeholder jackets for tracks that
// have no cover image, plus a spinning-label album-art builder.

// Deterministic colorful jacket placeholder derived from a track's identity.
// Returns a CSS linear-gradient string.
export function gradientFor(track) {
  const str = String(track?.id ?? track?.title ?? '');
  // FNV-1a hash → well-distributed hue even for short, similar ids
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h >>>= 0;
  const a = h % 360;
  const b = (a + 50 + (h >> 9) % 60) % 360;
  return `linear-gradient(135deg, hsl(${a} 68% 56%), hsl(${b} 72% 46%) 60%, hsl(${(a + 210) % 360} 55% 18%))`;
}

// Placeholder album jacket (city-pop / vaporwave sunset) rendered to a canvas.
// Used as the spinning center label when a track has no cover art.
export function buildAlbumArt(s) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const x = cv.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, s);
  sky.addColorStop(0, '#241246'); sky.addColorStop(0.40, '#7a2a6a');
  sky.addColorStop(0.60, '#e0537a'); sky.addColorStop(0.70, '#ff8a4a'); sky.addColorStop(1, '#2a0e2e');
  x.fillStyle = sky; x.fillRect(0, 0, s, s);
  const cx2 = s * 0.5, cy2 = s * 0.46, hy = s * 0.62;
  x.save();
  x.beginPath(); x.arc(cx2, cy2, s * 0.21, 0, 7); x.clip();
  const sun = x.createLinearGradient(0, cy2 - s * 0.21, 0, cy2 + s * 0.21);
  sun.addColorStop(0, '#ffe870'); sun.addColorStop(0.6, '#ff9a5a'); sun.addColorStop(1, '#ff5a7a');
  x.fillStyle = sun; x.fillRect(0, 0, s, s);
  x.fillStyle = '#2a0e2e';
  for (let i = 0; i < 6; i++) { const yy = cy2 + s * 0.02 + i * s * 0.032; x.fillRect(0, yy, s, s * 0.011 * (1 + i * 0.5)); }
  x.restore();
  x.fillStyle = 'rgba(255,190,130,0.55)'; x.fillRect(0, hy, s, 2);
  x.strokeStyle = 'rgba(255,120,170,0.32)'; x.lineWidth = 1;
  for (let i = -7; i <= 7; i++) { x.beginPath(); x.moveTo(cx2 + i * s * 0.05, hy); x.lineTo(cx2 + i * s * 0.5, s); x.stroke(); }
  for (let j = 1; j < 8; j++) { const yy = hy + (s - hy) * (j * j / 64); x.beginPath(); x.moveTo(0, yy); x.lineTo(s, yy); x.stroke(); }
  return cv;
}
