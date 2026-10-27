// SYSTEMS: pure one-finger stroke shapes (no DOM; node-tested). Screen pixels, y down, so a positive turn = clockwise on screen.
//   spiral : >= 1.5 turns with a steady radius trend (in or out); classified BEFORE any closed-loop test (old GESTURES.md)
//   hook   : the top of a '?': curls clockwise ~0.7..2 turns of pi, open, ends below where it started, then the finger lifts
//   arrow  : '<' or '>' (one sharp corner, the tip points left or right), the second stroke after a hook = undo / redo
//   rub    : 3+ quick back-and-forth reversals (river erase)
export function resample(pts, step = 6) { if (!pts.length) return []; const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) { const a = out[out.length - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = d; if (acc >= step) out.push(b); }
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]); return out; }
export function analyze(raw) { const p = resample(raw, 6), n = p.length; const A = { n, len: 0, turn: 0, turnAbs: 0, w: 0, h: 0, ext: 0, closure: 1, radCorr: 0, start: raw[0], end: raw[raw.length - 1], dur: 0, maxCorner: 0, corner: null };
  if (n < 2) return A; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, cx = 0, cy = 0;
  for (const q of p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); cx += q[0]; cy += q[1]; }
  cx /= n; cy /= n; A.w = x1 - x0; A.h = y1 - y0; A.ext = Math.max(A.w, A.h); A.cx = cx; A.cy = cy; A.box = [x0, y0, x1, y1];
  let pa = null; for (let i = 1; i < n; i++) { const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1]; A.len += Math.hypot(dx, dy); const a = Math.atan2(dy, dx);
    if (pa != null) { let d = a - pa; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; A.turn += d; A.turnAbs += Math.abs(d); } pa = a; }
  A.turns = Math.abs(A.turn) / (2 * Math.PI); A.closure = Math.hypot(A.end[0] - A.start[0], A.end[1] - A.start[1]) / Math.max(1, A.ext); A.dur = (A.end[2] || 0) - (A.start[2] || 0);
  // radius trend: correlation of the distance from the centre with progress along the stroke (spiral in or out = strong)
  let sr = 0, si = 0, sri = 0, srr = 0, sii = 0; for (let i = 0; i < n; i++) { const r = Math.hypot(p[i][0] - cx, p[i][1] - cy); sr += r; si += i; sri += r * i; srr += r * r; sii += i * i; }
  const cov = sri / n - sr / n * si / n, vr = srr / n - (sr / n) ** 2, vi = sii / n - (si / n) ** 2; A.radCorr = vr > 1e-6 && vi > 1e-6 ? cov / Math.sqrt(vr * vi) : 0;
  // sharpest corner (for '<' '>'): the angle between the chords 4 points back and 4 points ahead
  for (let i = 2; i < n - 2; i++) { const k = Math.min(4, i, n - 1 - i), a = p[i - k], b = p[i], c = p[i + k]; const u = Math.atan2(b[1] - a[1], b[0] - a[0]), v = Math.atan2(c[1] - b[1], c[0] - b[0]); let d = Math.abs(v - u); if (d > Math.PI) d = 2 * Math.PI - d; if (d > A.maxCorner) { A.maxCorner = d; A.corner = b; } }
  return A; }
export const isSpiral = A => A.turns >= 1.5 && A.len >= 140 && A.ext >= 50 && Math.abs(A.radCorr) >= .4;
export const isHook = A => A.turn > Math.PI * .7 && A.turn < Math.PI * 2.1 && A.turns < 1.2 && A.closure > .35 && A.h >= 34 && A.h >= A.w * .7 && A.len >= 70 && A.len <= 900 && A.end[1] > A.start[1] + A.h * .3;
// where the dot of the '?' goes: below the hook's end, within about a hook height
export const dotZone = A => ({ x: A.end[0], y: A.end[1] + A.h * .45, r: Math.max(46, A.h * .75) });
export const inDot = (A, x, y) => { const z = dotZone(A); return Math.hypot(x - z.x, y - z.y) < z.r && y > A.end[1] - 8; };
export const arrowDir = A => { if (A.len < 30 || A.len > 420 || A.maxCorner < 1.2 || !A.corner || A.turns > .8) return null; const tx = A.corner[0], lo = Math.min(A.start[0], A.end[0]), hi = Math.max(A.start[0], A.end[0]);
  if (Math.abs(A.end[1] - A.start[1]) < A.h * .35) return null; if (tx < lo - 8) return '<'; if (tx > hi + 8) return '>'; return null; };
export const nearHook = (A, x, y) => { const [x0, y0, x1, y1] = A.box, m = Math.max(60, A.h); return x > x0 - m && x < x1 + m && y > y0 - m * .5 && y < y1 + m * 1.2; };
export function reversals(raw, minLeg = 10) { let dir = 0, leg = 0, n = 0, axis = null; const p = resample(raw, 4);
  for (let i = 1; i < p.length; i++) { const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1]; if (!axis) { if (Math.hypot(dx, dy) > 3) axis = Math.abs(dx) >= Math.abs(dy) ? 0 : 1; else continue; }
    const v = axis ? dy : dx, s = Math.sign(v); if (!s) continue; if (s === dir || !dir) { leg += Math.abs(v); dir = s; } else { if (leg >= minLeg) n++; leg = Math.abs(v); dir = s; } } return n; }
export const isRub = (raw, dur) => reversals(raw) >= 3 && (dur == null || dur < 1600);
