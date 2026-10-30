// LOOK / aura (tradAura, v0.0.23): TRADITION AURAS for rare ohms. Every ohm can carry a musical tradition; an ordinary ohm only gets
// a hint of its tradition's colour in its own glow, a RARE ohm a living procedural aura (more complex and brighter), a MASTER /
// teacher the richest and widest one at a much larger scale. Eight patterns, procedural, no stamped symbols (reference: Wilbow's
// preview softsound_previews/journey/traditions/make_dynamic.js, approved 4:10-4:13 PM MDT "make them dynamic and brighter"):
//   folk / hymn   rose-window tracery that breathes with the phrase       raga    lotus rings unfolding over a drone glow + meend glide
//   maqam         8 / 10-fold star lattice, microtone two-colour shimmer   gamelan counter-turning boss rings + gong pulse (ombak)
//   japan         sparse seigaiha / asanoha, empty space, breath brush     wafrica woven kente bands crossing 3 against 2
//   celtic        one unbroken over-under interlace + triskele spirals     techno  stepped squares + scanlines stepping on the kick
// Rare body look (rare_ohms_spec.md point 1: "shimmer, extra glow rings, an unusual body shape"): a sheen sweeping the body,
// extra glow rings baked into the aura, a per-tradition silhouette behind the body in the ohm's own colour.
// DYNAMIC: rotate / unfold / pulse / recolour with the phrase phase, loudness, the beat and each tradition's SIGNATURE event
// (folk phrase end, raga glide, maqam off-scale note, gamelan gong, japan breath (loudness drop), wafrica 2-bar downbeat, celtic
// sustained sound, techno kick). Calm personalities drift slower and steadier, lively ones flicker.
// COST: every layer is BAKED in idle time (look/index.js bakeSlice) per (tradition, tier/level, exact device size, light bucket) as
// a loop of frames over a SEAMLESS loop phase (each loop turns by a whole symmetry period); per frame an ohm costs one 1:1 blit of
// its frame (destination-over: behind every body, over the world), two for the first fadeN ohms (crossfade), + a small shape blit,
// + a sheen blit; at most opts.live ohms draw ONE live vector line (the signature element). READ-ONLY on the world.
import { createSprites } from './sprites.js';
import { blit } from './blit.js';
export const AURA_OPTS = {
  frames: [16, 12, 8, 0], fadeN: [4, 2, 0, 0], live: [2, 1, 0, 0], max: [12, 8, 4, 0],   // per rung: loop frames, crossfaded ohms, live lines, aura ohms (q3 off)
  capBytes: [40 << 20, 24 << 20, 12 << 20, 1 << 20], setBytes: [5 << 20, 3 << 20, 2 << 20, 0], maxD: [400, 320, 256, 0], minRd: 5, jobs: 96, sizeStep: 1.06,   // a set = the loop frames of one (tradition, level, size, light); its frames fit setBytes (min 6)
  alpha: 1, soft: true, softDiv: 3.2, softGlow: .3, bright: .4,   // soft (#9 Wilbow 10:06 'no outlines'): pattern + rings baked as soft light; false = the crisp tracery
   sigK: .85, sigMerge: true, masterScale: 1.12, ringA: .5, shapeA: .92, sheenA: .2, ordTint: .3, rareTint: .45,
  sigDecay: 1.2, afterDecay: 2.5, loudK: 1.2, grow: true,   // grow (option A, Wilbow 5:40 PM MDT "And A"): the aura grows with o.tier / o.xp, hatchling -> master
  way: { on: true, a: .45, k: .8, hit: .85, depth: 2, tau: .25, keep: .15 },   // crowded jam (v0.0.25): a weaker aura that overlaps a stronger one makes way (alpha x a, rings / pattern pulled in to k of the size), one that would stack past `depth` deep hides; the playing / loudest keeps full strength (keep: the leader's hysteresis)
  stage: 1, stageL: [0, 1.3, 1.7, 2],   // build stage (Wilbow 5:40 PM MDT "B: the rich look comes in a later build stage"): 1 simpler (no bloom, no extra outer rings, smaller master), 2, 3 = the full tiers.jpg look; growth runs inside the stage's cap
};
const TAU = Math.PI * 2, BR = 36, S = .86, RARE = 1.15;
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = typeof h === 'string' ? hx(h) : h; return `rgba(${r | 0},${g | 0},${b | 0},${cl(a).toFixed(3)})`; };
const mixh = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const pol = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
const auraR = L => 92 + 22 * Math.min(L, 2) + 8 * .6;   // the reference aura radius (pattern units) at the baked loudness
const rngOf = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
// ---- shared paint helpers (pattern units: body radius BR / S, centre 0,0) ----
const glow = (g, col, a, R, r0 = BR * .9 / S) => { const gr = g.createRadialGradient(0, 0, r0, 0, 0, R); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(.45, rgba(col, a * .38)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R); };
const add = (g, f) => { g.globalCompositeOperation = 'lighter'; f(); g.globalCompositeOperation = 'source-over'; };
// ---------------- 1 folk / hymn: rose window; one colour period per loop (12 lights x 3 colours = 90 deg), the light sweeps once ----------------
function folk(p, P) {
  const N = P.L > 1.6 ? P.Q.fold + 4 : P.Q.fold, per = N % 3 === 0 ? 3 : 4, breath = .9 + .1 * P.loud + .12 * P.sig, rot = P.u * TAU / N * per;
  const glass = per === 3 ? ['#8e2526', '#27346e', '#c9952e'] : ['#8e2526', '#27346e', '#c9952e', mixh('#3a5a6e', P.ohm, .5)];
  const lit = a => { const d = Math.cos(a - (P.u * TAU - Math.PI / 2)); return .35 + .5 * P.loud * (.5 + .5 * d) + .5 * P.sig * Math.pow(.5 + .5 * d, 3) + .25 * P.after; };
  p.lineJoin = 'round';
  const ring = (n, r0, r1, wid, shift) => { for (let i = 0; i < n; i++) {
    const a0 = (i + shift) / n * TAU + rot, a1 = a0 + TAU / n, am = (a0 + a1) / 2, c = glass[i % glass.length], L = lit(am), R0 = r0 * breath, R1 = r1 * breath, Rs = R0 + (R1 - R0) * .62;
    p.beginPath(); p.moveTo(...pol(a0 + .04, R0)); p.lineTo(...pol(a0 + .05, Rs)); p.quadraticCurveTo(...pol(a0 + .1 * wid, R1 * .97), ...pol(am, R1));
    p.quadraticCurveTo(...pol(a1 - .1 * wid, R1 * .97), ...pol(a1 - .05, Rs)); p.lineTo(...pol(a1 - .04, R0)); p.closePath();
    const gr = p.createRadialGradient(0, 0, R0, 0, 0, R1); gr.addColorStop(0, rgba(mixh(c, '#fff3d0', .25 * L), .25 + .45 * L)); gr.addColorStop(1, rgba(c, .1 + .2 * L));
    p.fillStyle = gr; p.fill(); p.strokeStyle = rgba(P.A.fill, .85); p.lineWidth = 2.2; p.stroke(); p.strokeStyle = rgba(P.A.line, .3 + .3 * L); p.lineWidth = .7; p.stroke();
    const [ox, oy] = pol(am, R0 + (R1 - R0) * .45); p.beginPath();
    for (let k = 0; k < 4; k++) { const fx = ox + Math.cos(k * TAU / 4 + am) * 4.5, fy = oy + Math.sin(k * TAU / 4 + am) * 4.5; p.moveTo(fx + 4, fy); p.arc(fx, fy, 4, 0, TAU); }
    p.fillStyle = rgba(P.A.accent, .15 + .35 * L); p.fill(); p.strokeStyle = rgba(P.A.line, .4); p.lineWidth = .7; p.stroke(); } };
  ring(N, 60, 118, 1, 0);
  if (P.L > 1.6) ring(N * 2, 120, 146, .6, .5);   // master: a second tier of tracery
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU - rot, [x, y] = pol(a, 53 * breath); p.beginPath(); p.arc(x, y, 6, 0, TAU); p.fillStyle = rgba(i % 2 ? '#27346e' : '#8e2526', .3 + .3 * lit(a)); p.fill(); p.strokeStyle = rgba(P.A.fill, .7); p.lineWidth = 1.1; p.stroke(); }
  p.strokeStyle = rgba(P.A.line, .5); p.lineWidth = 1.3; for (const r of [47, 60, 120]) { p.beginPath(); p.arc(0, 0, r * breath, 0, TAU); p.stroke(); }
  add(p, () => glow(p, '#e0b050', .12 + .2 * P.sig + .15 * P.after, 150));
}
const folkLive = (p, P) => { const breath = .9 + .1 * P.loud + .12 * P.sig, a0 = P.u * TAU - Math.PI / 2, w = .3 + .5 * P.sig + .2 * P.after, R = 118 * breath;
  p.lineCap = 'round'; p.beginPath(); p.arc(0, 0, R, a0 - w, a0 + w); p.strokeStyle = rgba(P.A.accent, .25 + .3 * P.loud + .4 * P.sig); p.lineWidth = 7; p.stroke(); p.strokeStyle = rgba('#fff6dc', .5 + .4 * P.sig); p.lineWidth = 1.4; p.stroke(); };
// ---------------- 2 raga: drone glow, lotus rings (each turns one petal per loop), meend glide; palette by time of day ----------------
const RAGA_LB = [{ g1: '#3a3f9e', g2: '#c9d0e8', tip: '#e8a8be', base: [60, 64, 150], line: [214, 220, 240], glide: [240, 244, 255], halo: [170, 180, 240] },   // night (as the preview)
  { g1: '#7a3a7e', g2: '#f0c8a0', tip: '#f0a070', base: [120, 50, 110], line: [246, 214, 196], glide: [255, 236, 210], halo: [240, 150, 120] },                 // dusk: rose / amber
  { g1: '#c9822a', g2: '#fff0d0', tip: '#e86a4a', base: [170, 90, 30], line: [110, 60, 30], glide: [255, 250, 235], halo: [230, 140, 60] }];                  // day: saffron, dark-ink lines
const ragaPath = (len, off) => { const pts = []; for (let t = 0; t <= len; t += .01) { const a = -2.4 + t * 4.4 + off, r = 128 - 52 * Math.pow(t, 1.3) + 7 * Math.sin(t * 9); pts.push(pol(a, r)); } return pts; };
const ragaDraw = (p, pts, a, C) => { for (let pass = 0; pass < 2; pass++) { p.beginPath(); for (let i = 0; i < pts.length; i++) i ? p.lineTo(pts[i][0], pts[i][1]) : p.moveTo(pts[i][0], pts[i][1]);
  p.strokeStyle = pass ? rgba(C.glide, a) : rgba(C.halo, a * .35); p.lineWidth = pass ? 1.4 : 6; p.lineCap = 'round'; p.stroke(); } };
function raga(p, P) { const C = RAGA_LB[P.lb] || RAGA_LB[0];
  add(p, () => { glow(p, C.g1, .35 + .15 * P.loud, 150); glow(p, C.g2, .06 + .06 * Math.sin(P.u * TAU * 3) ** 2 + .1 * P.after, 120); });
  const open = cl(.25 + .55 * P.loud + .3 * P.after + .2 * P.sig + .15 * Math.sin(P.u * TAU)), rings = [[10, 58, 16], [14, 80, 20], [20, 104, 22], [28, 128, 20], [36, 148, 16]];
  const nR = Math.min(rings.length, Math.floor(1 + P.L * 2)), sp = P.Q.speed || [1];
  rings.slice(0, nR).forEach(([n, r, len], ri) => { const unf = cl(open * 1.6 - ri * .25); if (unf <= 0) return; const rot = P.u * (ri % 2 ? -1 : 1) * TAU / n * (sp[ri % sp.length] | 0 || 1) + ri * .3;
    for (let i = 0; i < n; i++) { const a = i / n * TAU + rot, w = TAU / n * .42 * unf, ln = len * (.5 + .5 * unf), [x0, y0] = pol(a, r - ln * .5), [x1, y1] = pol(a, r + ln * .7);
      p.beginPath(); p.moveTo(x0, y0); p.quadraticCurveTo(...pol(a - w, r + ln * .1), x1, y1); p.quadraticCurveTo(...pol(a + w, r + ln * .1), x0, y0);
      const gr = p.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, rgba(C.base, .15)); gr.addColorStop(1, rgba(mixh(C.tip, P.ohm, .3), .2 + .3 * unf));
      p.fillStyle = gr; p.fill(); p.strokeStyle = rgba(C.line, .35 + .45 * unf); p.lineWidth = 1; p.stroke(); } });
  p.strokeStyle = rgba(C.line, .2 + .2 * P.loud); p.lineWidth = 3; p.beginPath(); p.arc(0, 0, 50, 0, TAU); p.stroke();   // the drone: never moves
  const off = .4 * Math.sin(P.u * TAU), len = cl(.18 + .3 * P.loud + .6 * P.sig);
  ragaDraw(p, ragaPath(len, off), .6, C); if (P.after > 0) { const e = ragaPath(1, off - .5); ragaDraw(p, e.slice(20), .35 * P.after, C); }
  if (P.L > 1.6) { ragaDraw(p, ragaPath(len * .8, off + Math.PI), .55, C);   // master: a counter glide + a silver bead ring
    for (let i = 0; i < 48; i++) { const [x, y] = pol(i / 48 * TAU, 158); p.fillStyle = rgba(C.line, .25 + .35 * (i % 4 === 0)); p.beginPath(); p.arc(x, y, i % 4 ? .9 : 1.6, 0, TAU); p.fill(); } } }
const ragaLive = (p, P) => { const C = RAGA_LB[P.lb] || RAGA_LB[0], len = cl(.18 + .3 * P.loud + .6 * Math.max(P.sig, P.glide)), pts = ragaPath(len, .4 * Math.sin(P.u * TAU)); ragaDraw(p, pts, .95, C);
  if (P.sig > .3) { const [x, y] = pts[pts.length - 1], gr = p.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, `rgba(255,255,255,${(.9 * P.sig).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); p.fillStyle = gr; p.fillRect(x - 14, y - 14, 28, 28); } };
// ---------------- 3 maqam: star lattice turning 90 deg per loop, the light travelling out in square rings, microtone shimmer ----------------
const star8 = (x, y, R) => { const pts = []; for (let k = 0; k < 8; k++) pts.push([x + Math.cos(k * TAU / 8 + TAU / 16) * R, y + Math.sin(k * TAU / 8 + TAU / 16) * R]); return pts; };
function maqam(p, P) {
  p.fillStyle = rgba(P.A.fill, .38); p.beginPath(); p.arc(0, 0, 170, 0, TAU); p.fill();
  const d = P.L > 1.6 ? P.Q.density * 32 / 38 : P.Q.density, rot = P.u * TAU / 4, cells = [];
  p.save(); p.rotate(rot); for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) cells.push([i * d, j * d, i, j]);
  for (const [x, y, i, j] of cells) { const wave = .5 + .5 * Math.cos(Math.max(Math.abs(i), Math.abs(j)) * 1.1 - P.u * TAU * 2), lit = .3 + .5 * P.loud * wave + .5 * P.sig * ((i + j) & 1 ? .3 : 1);
    const s = star8(x, y, d * .42); p.beginPath(); for (let k = 0; k < 8; k++) { const q = s[(k * 3) % 8]; k ? p.lineTo(...q) : p.moveTo(...q); } p.closePath();
    p.fillStyle = rgba(mixh(P.A.glow, P.ohm, .25), .25 + .45 * lit); p.fill('evenodd'); p.beginPath(); p.arc(x, y, d * .1, 0, TAU); p.fillStyle = rgba(P.A.accent, .4 + .5 * lit); p.fill(); }
  const strap = (w, col, dr) => { p.save(); p.rotate(dr); p.strokeStyle = col; p.lineWidth = w; p.lineJoin = 'miter';
    p.beginPath(); for (const [x, y] of cells) { const s = star8(x, y, d * .71); for (let k = 0; k <= 8; k++) { const q = s[(k * 3) % 8]; k ? p.lineTo(...q) : p.moveTo(...q); } } p.stroke(); p.restore(); };
  const sh = .02 * P.sig + .004 * P.loud;   // microtone shimmer: the strapwork splits a quarter step into turquoise / gold ghosts
  if (sh > .005) add(p, () => { strap(2.2, `rgba(60,220,210,${(.75 * P.sig + .12).toFixed(3)})`, sh); strap(2.2, `rgba(245,205,110,${(.75 * P.sig + .12).toFixed(3)})`, -sh); });
  strap(4, rgba(mixh(P.A.fill, '#000000', .5), .8), 0); strap(2.4, rgba(P.A.line, .5 + .25 * P.loud), 0); strap(.7, 'rgba(200,160,80,.85)', 0); p.restore();
  if (P.L > 1.6) { for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - rot * 2; p.beginPath();   // master: an outer 10-fold rosette band (turns 180 deg = 5 periods per loop)
      for (let s = 0; s <= 10; s++) { const q = pol(a + (s * 3 % 10) / 10 * TAU * .1, 132 + (s % 2 ? 7 : -7)); s ? p.lineTo(...q) : p.moveTo(...q); } p.strokeStyle = rgba(P.A.line, .6); p.lineWidth = 1.2; p.stroke(); }
    p.strokeStyle = rgba(P.A.accent, .6); for (const r of [124, 140]) { p.beginPath(); p.arc(0, 0, r, 0, TAU); p.stroke(); } }
  add(p, () => glow(p, P.A.accent, .1 + .25 * P.after, 140)); }
const maqamLive = (p, P) => { const s = Math.max(P.sig, P.off), sh = .03 * s + .006 * P.loud, a = .12 + .7 * s; if (a < .14) return; const rot = P.u * TAU / 4;
  p.lineJoin = 'miter'; for (const [col, dr] of [['60,220,210', sh], ['245,205,110', -sh]]) { const st = star8(0, 0, 150); p.beginPath(); for (let k = 0; k <= 8; k++) { const q = st[(k * 3) % 8]; const c = Math.cos(rot + dr), n = Math.sin(rot + dr); k ? p.lineTo(q[0] * c - q[1] * n, q[0] * n + q[1] * c) : p.moveTo(q[0] * c - q[1] * n, q[0] * n + q[1] * c); }
    p.strokeStyle = `rgba(${col},${a.toFixed(3)})`; p.lineWidth = 1.6; p.stroke(); } };
// ---------------- 4 gamelan: boss rings turning against each other (2 / 3 bosses per loop), gong ring with ombak ----------------
function gamelan(p, P) {
  add(p, () => glow(p, P.A.glow, .35 + .15 * P.loud, 160)); p.fillStyle = rgba(P.A.fill, .45); p.beginPath(); p.arc(0, 0, 96, 0, TAU); p.arc(0, 0, 70, 0, TAU, true); p.fill();
  const boss = (x, y, r) => { const gr = p.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r); gr.addColorStop(0, '#f6dc8c'); gr.addColorStop(.45, '#b9822f'); gr.addColorStop(1, '#4a2c12'); p.fillStyle = gr; p.beginPath(); p.arc(x, y, r, 0, TAU); p.fill(); p.strokeStyle = 'rgba(80,150,130,.55)'; p.lineWidth = .8; p.stroke(); };
  const ring = (n, r, sz, phase, dir, k) => { const rot = dir * P.u * TAU / n * k;
    for (let i = 0; i < n; i++) { const a = (i + phase) / n * TAU + rot;
      for (let q = 1; q <= 4; q++) { p.strokeStyle = `rgba(214,170,80,${((.06 + .14 * P.loud) / q).toFixed(3)})`; p.lineWidth = sz * 1.6 / (1 + q * .3); p.beginPath(); p.arc(0, 0, r, a - dir * .07 * q, a - dir * .07 * (q - 1), dir < 0); p.stroke(); }
      const [x, y] = pol(a, r); boss(x, y, sz); } };
  const sp = P.Q.speed || [2, 2, 3]; ring(14, 63, 4.4, 0, 1, sp[0]); ring(14, 104, 5.4, .5, -1, sp[1]); if (P.L > 1.6) ring(22, 140, 4.2, .25, 1, sp[2]);   // master: a third interlocking voice
  gong(p, P, 84 + 26 * P.sig + 40 * P.after, .35 + .3 * P.loud + .6 * P.sig + .3 * P.after, 72);
  p.strokeStyle = 'rgba(70,150,130,.45)'; p.lineWidth = 1; for (const r of [120, 124]) { p.beginPath(); p.arc(0, 0, r, 0, TAU); p.stroke(); } }
const gong = (p, P, gr0, gA, N) => add(p, () => { const col = mixh('#ffd678', P.ohm, .2);
  for (let s = 0; s < N; s++) { const a0 = s / N * TAU, omb = .55 + .45 * Math.cos(a0 * 2 + P.u * TAU * 3);
    for (const [w, a] of [[12, .07], [5, .2], [1.6, .9]]) { p.strokeStyle = rgba(col, a * gA * omb); p.lineWidth = w * (1 + P.sig); p.beginPath(); p.arc(0, 0, gr0, a0, a0 + TAU / N + .01); p.stroke(); } }
  if (P.L > 1.6) { p.strokeStyle = 'rgba(255,214,120,.5)'; p.lineWidth = 1.2; p.beginPath(); p.arc(0, 0, gr0 + 12, 0, TAU); p.stroke(); } });
const gamelanLive = (p, P) => { const g = Math.max(P.sig, P.gong); if (g < .04 && P.after < .04) return; gong(p, { ...P, sig: g, L: 0 }, 84 + 30 * g + 40 * P.after, .2 + .8 * g + .3 * P.after, 12); };
// ---------------- 5 japan: seigaiha drifting (whole wave periods per loop), asanoha (master), breath brush, empty space ----------------
function japan(p, P, H) {
  add(p, () => glow(p, mixh('#e8b7c0', P.ohm, .3), .1 + .1 * P.loud + .1 * P.after, 150));
  const s = 15, fade = (w, fx, fy, R, a) => { w.globalCompositeOperation = 'destination-in'; const fg = w.createRadialGradient(fx, fy, 0, fx, fy, R);
    fg.addColorStop(0, `rgba(0,0,0,${a})`); fg.addColorStop(.55, `rgba(0,0,0,${a * .5})`); fg.addColorStop(1, 'rgba(0,0,0,0)'); w.fillStyle = fg; w.fillRect(-200, -200, 400, 400); w.globalCompositeOperation = 'source-over'; };
  { const [wc, w] = H.sub(); for (let row = 0; row < 34; row++) for (let col = -4; col < 22; col++) {
      const x = col * s * 2 + (row % 2 ? s : 0) - 160 + P.u * s * (row % 2 ? 4 : 2), y = row * s * .5 - 136;
      for (let k = 3; k >= 1; k--) { w.beginPath(); w.arc(x, y, s * k / 3, Math.PI, 0); w.closePath(); if (k === 3) { w.fillStyle = 'rgba(18,26,56,.7)'; w.fill(); } w.strokeStyle = k === 1 ? 'rgba(200,205,215,.45)' : rgba(P.A.line, .65); w.lineWidth = 1.1; w.stroke(); } }
    fade(w, -90 + 10 * Math.sin(P.u * TAU), 55, 70 + 30 * P.loud + 20 * P.after, .9); H.put(p, wc); }
  if (P.L > 1.6) { const [wc, w] = H.sub(); w.strokeStyle = 'rgba(200,200,210,.55)'; w.lineWidth = .8; const h = 18;   // master: asanoha whispering in the opposite corner
    for (let i = -12; i < 10; i++) for (let j = -12; j < 10; j++) { const x = i * h * 1.732 + (j & 1) * h * .866, y = j * h * 1.5; if (Math.hypot(x - 85, y + 70) > 110) continue;
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + TAU / 12; w.beginPath(); w.moveTo(x, y); w.lineTo(x + Math.cos(a) * h, y + Math.sin(a) * h); w.lineTo(x + Math.cos(a + TAU / 6) * h, y + Math.sin(a + TAU / 6) * h); w.stroke(); } }
    fade(w, 85, -70, 75, .8); H.put(p, wc); }
  brush(p, P, 30, 1);
  p.strokeStyle = 'rgba(110,130,70,.5)'; p.lineWidth = 1; p.beginPath(); const m0 = Math.PI * (.1 + .15 * (1 + Math.sin(P.u * TAU))); p.arc(0, 0, 56, m0, m0 + Math.PI * .4); p.stroke(); }
const brush = (p, P, strands, seal) => {   // the breath trail: a dry ink-brush stroke whose length follows the phrase; long on the signature, diffusing after
  const len = cl(.2 + .35 * P.loud + .55 * P.sig + .3 * P.after), start = -2.1 + .4 * Math.sin(P.u * TAU), rnd = rngOf(3), pts = [];
  for (let t = 0; t <= len; t += .01) pts.push([...pol(start + t * 2.6, 98 + 10 * Math.sin(t * 3)), Math.sin(Math.PI * Math.pow(t / len, .6))]);
  const bw = 7 + 6 * P.sig + 8 * P.after, ink = P.lb === 2 ? '60,58,70' : '175,175,185';
  for (let h = 0; h < strands; h++) { const o = (h / (strands - 1) - .5), dry = rnd(); p.beginPath();
    for (let i = 0; i < pts.length; i++) { const [x, y, w] = pts[i]; if (dry > .8 && i > pts.length * .6 && i < pts.length * .75) { p.moveTo(x, y); continue; } const ox = o * bw * w; i ? p.lineTo(x + ox * .4, y + ox) : p.moveTo(x, y); }
    p.strokeStyle = `rgba(${ink},${((.08 + rnd() * .14) * (1 - .4 * P.after) * (30 / strands) ** .5).toFixed(3)})`; p.lineWidth = 1.1; p.stroke(); }
  if (seal && pts.length > 2) { const [rx, ry] = pts[2]; p.fillStyle = `rgba(200,50,60,${(.5 + .3 * P.loud).toFixed(3)})`; p.beginPath(); p.arc(rx, ry, 2.6, 0, TAU); p.fill(); } };
const japanLive = (p, P) => brush(p, { ...P, sig: Math.max(P.sig, P.breath || 0) }, 10, 0);
// ---------------- 6 West African: dot rings + kente bands, 3 bands slide 3 block periods while 2 slide 2 per loop ----------------
const KENTE = o => [['#c8961f', '#1d6233', '#c8961f', '#8e2a1f', '#141210'], ['#8e2a1f', '#c8961f', '#141210', '#1d6233', mixh('#c8961f', o, .35)]];
function kBand(p, ang, off, w, pal, slide, hit) { p.save(); p.rotate(ang); p.translate(0, off); p.globalAlpha = .85; p.fillStyle = '#111'; p.fillRect(-200, -w / 2 - 1, 400, w + 2);
  const blk = w * .8; let k = 0;
  for (let x = -200 + (slide % (blk * 5)) - blk * 5; x < 200; x += blk, k++) { p.fillStyle = pal[((k % 5) + 5) % 5]; p.fillRect(x, -w / 2, blk - 1, w);
    if (k % 2) { p.fillStyle = 'rgba(0,0,0,.55)'; for (let s = -w / 2 + 2; s < w / 2; s += 3) p.fillRect(x, s, blk - 1, 1); } else { p.fillStyle = pal[(k + 2) % 5]; for (let s = 0; s < 3; s++) p.fillRect(x + blk * .2, -w / 2 + w * (s + .5) / 3.5, blk * .6, 1.4); } }
  p.fillStyle = 'rgba(255,240,200,.18)'; for (let s = -w / 2; s < w / 2; s += 2) p.fillRect(-200, s, 400, .5);
  if (hit > 0) add(p, () => { p.fillStyle = `rgba(255,225,160,${(.22 * cl(hit)).toFixed(3)})`; p.fillRect(-200, -w / 2, 400, w); });
  p.globalAlpha = 1; p.restore(); }
const WA = P => { const blk5 = 13 * .8 * 5; return { a3: .32 + .12 * Math.sin(P.u * TAU) + .12 * P.sig, a2: -.82 - .15 * Math.sin(P.u * TAU + 1) - .2 * P.sig, s3: P.u * blk5 * 3 + 30 * P.sig, s2: -P.u * blk5 * 2 - 30 * P.sig }; };
function westAfrica(p, P) {
  p.fillStyle = rgba(P.A.fill, .45); p.beginPath(); p.arc(0, 0, 170, 0, TAU); p.fill();
  for (let r = 58, ri = 0; r < 160; r += P.Q.density, ri++) { const n = Math.floor(r * TAU / 9), rot = (ri % 2 ? 1 : -1) * P.u * TAU / n * 3;
    p.fillStyle = rgba(P.A.line, .4 + .25 * P.after + .2 * P.loud * (ri % 3 === 0));
    for (let i = 0; i < n; i++) { const a = i / n * TAU + rot, [x, y] = pol(a, r); if (ri % 2) p.fillRect(x - 1, y - 1, 2.2, 2.2); else { p.save(); p.translate(x, y); p.rotate(a); p.fillRect(-.7, -3, 1.4, 6); p.restore(); } } }
  const K = KENTE(P.ohm), W = WA(P);
  for (let i = 0; i < 3; i++) kBand(p, W.a3, -64 + i * 64, 13, K[0], W.s3, .6 * P.sig * (i !== 1));
  for (let i = 0; i < 2; i++) kBand(p, W.a2, -40 + i * 80, 13, K[1], W.s2, .6 * P.sig * (i === 0));
  if (P.L > 1.6) { for (let i = 0; i < 40; i++) { const a = i / 40 * TAU + .06 * Math.sin(P.u * TAU); p.beginPath(); p.arc(0, 0, 128, a, a + TAU / 40 - .01); p.strokeStyle = K[i % 2][(i >> 1) % 5]; p.lineWidth = 9; p.stroke(); }   // master: a woven ring band
    p.strokeStyle = rgba(P.A.line, .7); p.lineWidth = 1; for (const r of [123, 133]) { p.beginPath(); p.arc(0, 0, r, 0, TAU); p.stroke(); } }
  p.globalCompositeOperation = 'destination-out'; p.beginPath(); p.arc(0, 0, BR + 6, 0, TAU); p.fill(); p.globalCompositeOperation = 'source-over';
  p.strokeStyle = rgba(P.A.line, .7); p.lineWidth = 1.2; p.beginPath(); p.arc(0, 0, BR + 7, 0, TAU); p.stroke();
  add(p, () => glow(p, P.A.glow, .08 + .22 * P.after, 150)); }
const westAfricaLive = (p, P) => { const k = P.kick * P.loud + .6 * P.sig; if (k < .05) return; const W = WA(P), b = P.beat || 0, i3 = Math.floor(b) % 3, i2 = Math.floor(b / 1.5) % 2;   // 3 against 2: the 3-set flashes per beat, the 2-set per dotted beat
  add(p, () => { for (const [ang, off, a] of [[W.a3, -64 + i3 * 64, k], [W.a2, -40 + i2 * 80, k * .8]]) { p.save(); p.rotate(ang); p.fillStyle = `rgba(255,225,160,${(.3 * cl(a)).toFixed(3)})`; p.fillRect(-160, off - 6.5, 320, 13); p.restore(); } }); };
// ---------------- 7 Celtic: one unbroken over-under line (5-fold: turns 72 deg per loop), flowing light, triskele spirals ----------------
const KN = 600, KC = new Map();
const knot = (R0, A) => { const k = R0.toFixed(1) + ':' + A; let K = KC.get(k); if (K) return K; const P = []; for (let i = 0; i < KN; i++) { const t = i / KN * 2 * TAU, r = R0 + A * Math.cos(2.5 * t); P.push([Math.cos(t) * r, Math.sin(t) * r]); }
  const N = KN, ev = [], seg = (i, j) => { const a = P[i], b = P[(i + 1) % N], c = P[j], d = P[(j + 1) % N], den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]); if (!den) return false;
    const u = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den, v = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den; return u >= 0 && u < 1 && v >= 0 && v < 1; };
  for (let i = 0; i < N; i++) for (let j = i + 3; j < N; j++) { if (i === 0 && j > N - 3) continue; if (seg(i, j)) ev.push(i, j); }
  ev.sort((a, b) => a - b); K = { P, over: ev.filter((_, k) => k % 2 === 0) }; if (KC.size > 32) KC.clear(); KC.set(k, K); return K; };
const kPath = (p, K, a, b) => { p.beginPath(); for (let k = a; k <= b; k++) { const q = K.P[((k % KN) + KN) % KN]; k === a ? p.moveTo(q[0], q[1]) : p.lineTo(q[0], q[1]); } };
const kFlow = (p, K, pos, len, wid, col) => { for (let k = Math.floor(pos); k < pos + len; k += 3) { const f = Math.sin(Math.PI * (k - pos) / len); if (f <= 0) continue; kPath(p, K, k, k + 3); p.strokeStyle = rgba(col, .95 * f); p.lineWidth = wid * .9; p.stroke(); } };
function celtic(p, P) {
  add(p, () => { glow(p, P.A.glow, .3 + .15 * P.loud, 160); glow(p, '#7a5a8a', .08 + .12 * P.after, 130); });
  const breathe = 1 + .05 * P.loud + .06 * P.sig, flowC = mixh('#fff0c0', P.ohm, .15);
  const draw = (R0, A, rot, wid, flowPos) => { const K = knot(R0, A); p.save(); p.rotate(rot);
    const band = (a, b) => { p.lineCap = 'butt'; p.lineJoin = 'round'; kPath(p, K, a, b); p.strokeStyle = 'rgba(30,22,16,.95)'; p.lineWidth = wid + 3.5; p.stroke(); p.strokeStyle = P.A.line; p.lineWidth = wid; p.stroke();
      p.strokeStyle = 'rgba(160,40,35,.9)'; p.lineWidth = 1.1; p.stroke(); };
    band(0, KN); const fl = KN * (.08 + .12 * P.loud + .5 * P.sig + .25 * P.after); kFlow(p, K, flowPos, fl, wid, flowC); for (const t of K.over) band(t - 9, t + 9);
    p.restore(); };
  draw(84 * breathe, 26, P.u * TAU / 5, 5.5, P.u * KN * 1.4);   // 72 deg + the light 1.4 laps = the same picture (the 5-fold knot maps index i -> i + 0.6 KN)
  if (P.L > 1.6) draw(134, 12, -P.u * TAU / 5, 3.5, P.u * KN * 1.4 + KN / 2);
  const spiral = (x, y, r, rot) => { p.beginPath(); for (let t = 0; t < 3.2 * Math.PI; t += .08) { const rr = r * t / (3.2 * Math.PI), qx = x + Math.cos(t + rot) * rr, qy = y + Math.sin(t + rot) * rr; t ? p.lineTo(qx, qy) : p.moveTo(qx, qy); }
    p.strokeStyle = rgba(P.A.accent, .6 + .35 * P.after); p.lineWidth = 1.6; p.stroke(); };
  const nS = P.L > 1.6 ? 6 : 3, spin = P.u * TAU / 3, sR = 6 + 3 * P.after;
  for (let k = 0; k < nS; k++) { const a = k / nS * TAU - Math.PI / 2, [x, y] = pol(a, P.L > 1.6 ? 160 : 128); for (let s = 0; s < 3; s++) spiral(x + Math.cos(a + s * TAU / 3 + spin) * 5, y + Math.sin(a + s * TAU / 3 + spin) * 5, sR, s * TAU / 3 + a + spin); }
  p.strokeStyle = 'rgba(120,130,135,.5)'; p.lineWidth = 1; p.beginPath(); p.arc(0, 0, 50, 0, TAU); p.stroke(); }
const celticLive = (p, P) => { const s = Math.max(P.sig, P.after * .6); if (s < .04) return; const K = knot(84 * (1 + .05 * P.loud + .06 * P.sig), 26); p.save(); p.rotate(P.u * TAU / 5); p.lineCap = 'round';
  kFlow(p, K, P.u * KN * 1.4 + KN * .3, KN * (.1 + .4 * s), 5.5, mixh('#fffbe8', P.ohm, .1)); p.restore(); };
// ---------------- 8 techno / house: stepped squares, one step per bar (12 discrete steps per loop, no crossfade), scanlines ----------------
function techno(p, P) {
  p.fillStyle = rgba(P.A.fill, .8); p.beginPath(); p.arc(0, 0, 175, 0, TAU); p.fill();
  const base = ['#8a3dff', '#ff2fa8', '#22e0ff', '#8a3dff', '#ff8a1e', '#ffffff', '#22e0ff', '#ff2fa8', mixh('#8a3dff', P.ohm, .4), '#ff8a1e', '#22e0ff', '#ff2fa8'];
  const n = P.L > 1.6 ? 12 : 8, kick = P.sig, step = 10, shift = Math.floor(P.u * 12 + 1e-6) % 12, hue = cl(P.after + .15);
  p.lineJoin = 'miter'; p.lineCap = 'butt';
  const soft = P.stage === 1, lw = soft ? .55 : 1;   // v0.0.25 stage 1: neon glow, not hard strokes - thinner lines that each carry a blurred glow of their own colour (baked: no frame cost)
  for (let i = 0; i < n; i++) { const h = 50 + i * step + kick * step * .9, ci = (i + shift) % 12; p.save(); p.rotate(((i + shift) % 2) ? Math.PI / 4 : 0);
    const sc = mixh(base[ci], i % 2 ? '#ff2fa8' : '#22e0ff', hue * .5); p.strokeStyle = sc; p.lineWidth = ((ci === 5 ? 1 : 2.2) + (i === 0 ? 2 * P.sig : 0)) * lw; p.globalAlpha = cl((.55 + .4 * P.loud + .3 * P.sig) * (soft ? .8 : 1));
    if (soft) { p.shadowColor = sc; p.shadowBlur = 12 * Math.abs(p.getTransform().a); p.lineJoin = 'round'; }
    const nn = h * .22; p.beginPath(); p.moveTo(-h + nn, -h); p.lineTo(h - nn, -h); p.lineTo(h - nn, -h + nn); p.lineTo(h, -h + nn); p.lineTo(h, h - nn); p.lineTo(h - nn, h - nn); p.lineTo(h - nn, h); p.lineTo(-h + nn, h); p.lineTo(-h + nn, h - nn); p.lineTo(-h, h - nn); p.lineTo(-h, -h + nn); p.lineTo(-h + nn, -h + nn); p.closePath(); p.stroke(); p.restore(); }
  p.globalAlpha = 1; p.fillStyle = soft ? 'rgba(0,0,0,.22)' : 'rgba(0,0,0,.45)'; for (let y = -180; y < 180; y += 3) p.fillRect(-180, y, 360, 1);
  if (P.L > 1.6) for (let i = 0; i < 16; i++) { const on = (i + shift) % 4 === 0, [x, y] = pol(i / 16 * TAU, 158); p.fillStyle = on ? 'rgba(255,255,255,.9)' : 'rgba(138,61,255,.6)'; p.fillRect(x - 3, y - 3, 6, 6); }
  technoBars(p, P, 0); }
const technoBars = (p, P, k) => { const bar = 20 + 30 * P.loud + 30 * k; p.fillStyle = 'rgba(34,224,255,.85)'; p.fillRect(-70 - bar, -1, bar, 2); p.fillRect(70, -1, bar, 2); p.fillStyle = 'rgba(255,138,30,.9)'; p.fillRect(-1, -72 - bar * .6, 2, bar * .6); };
const technoLive = (p, P) => { const k = P.kick * P.loud + P.sig; if (k < .05) return; technoBars(p, P, k); if (P.sig > .05) { p.fillStyle = `rgba(255,255,255,${(.12 * P.sig).toFixed(3)})`; p.fillRect(-60, -60, 120, 120); } };
// ---------------- the unusual body shapes (silhouette behind the body, in the ohm's own colour; e = how far past the body) ----------------
const SHAPE = {
  scallop: (p, e) => { p.arc(0, 0, 1, 0, TAU); for (let i = 0; i < 12; i++) { const [x, y] = pol(i / 12 * TAU, 1 + e - .17); p.moveTo(x + .17, y); p.arc(x, y, .17, 0, TAU); } },
  petal: (p, e) => { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, w = TAU / 10 * .55; p.moveTo(...pol(a - w, .82)); p.quadraticCurveTo(...pol(a - w * .4, 1 + e * .8), ...pol(a, 1 + e)); p.quadraticCurveTo(...pol(a + w * .4, 1 + e * .8), ...pol(a + w, .82)); p.closePath(); } p.moveTo(1, 0); p.arc(0, 0, 1, 0, TAU); },
  star8: (p, e) => { for (let k = 0; k < 16; k++) { const q = pol(k / 16 * TAU, k % 2 ? 1 + e : .92); k ? p.lineTo(...q) : p.moveTo(...q); } p.closePath(); },
  knobs: (p, e) => { p.arc(0, 0, 1, 0, TAU); for (let i = 0; i < 8; i++) { const [x, y] = pol(i / 8 * TAU + TAU / 16, 1 + e - .13); p.moveTo(x + .13, y); p.arc(x, y, .13, 0, TAU); } },
  wave: (p, e) => { for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, d = Math.cos(a + Math.PI * .75), r = 1 + e * Math.pow(Math.max(0, d), 6) * (1 + .3 * Math.sin(a * 3)); const q = pol(a, r); i ? p.lineTo(...q) : p.moveTo(...q); } p.closePath(); },
  notch: (p, e) => { for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, r = (i >> 1) % 2 ? 1 + e * .7 : .96; p.lineTo(...pol(a, r)); p.lineTo(...pol(a + TAU / 48, r)); } p.closePath(); },
  triquetra: (p, e) => { p.arc(0, 0, 1, 0, TAU); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU - Math.PI / 2, [x, y] = pol(a, .5 + e * .5), r = .5 + e * .5; p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); } },
  stepped: (p, e) => { const h = .9 + e * .5, n = h * .3; p.moveTo(-h + n, -h); p.lineTo(h - n, -h); p.lineTo(h - n, -h + n); p.lineTo(h, -h + n); p.lineTo(h, h - n); p.lineTo(h - n, h - n); p.lineTo(h - n, h); p.lineTo(-h + n, h); p.lineTo(-h + n, h - n); p.lineTo(-h, h - n); p.lineTo(-h, -h + n); p.lineTo(-h + n, -h + n); p.closePath(); p.moveTo(1, 0); p.arc(0, 0, 1, 0, TAU); },
};
// ---------------- the traditions (auraPalette / auraPattern are the per-tradition fields; an ohm's tradition object may override any) ----------------
// auraPattern: kind, fold, density, speed (per ring, whole symmetry steps per loop), loopBeats, pulse ('beat' | 'bar' | 'phrase'), beatLock 0..1
// (how much the alpha pulses on the beat), swing (offbeat delay, beats), calm 0..1 (calm traditions drift: no flicker), live (the live line), sig (signature)
export const TRADITIONS = [
  { id: 'folk', names: ['folk', 'hymn', 'western', 'folk & hymn', 'western folk', 'classical', 'rockpop', 'blues', 'jazz', 'bossa' /* wave 2 placeholder family (Visuals to design) */], ohm: '#d98a6a', bl: .7, paint: folk, live: folkLive, shape: 'scallop',
    auraPalette: { glow: '#d9a441', line: '#ecdcb4', fill: '#241a12', accent: '#f0cf7a' }, auraPattern: { kind: 'rose', fold: 12, density: 1, speed: [1], loopBeats: 64, pulse: 'phrase', beatLock: .15, swing: 0, calm: .7, sig: 'phrase' } },
  { id: 'raga', names: ['raga', 'hindustani', 'indian', 'carnatic'], ohm: '#9a7ad8', bl: 1, paint: raga, live: ragaLive, shape: 'petal',
    auraPalette: { glow: '#4a50b0', line: '#d6dcf0', fill: '#1a1c48', accent: '#e8a8be' }, auraPattern: { kind: 'lotus', fold: 10, density: 1, speed: [1, 1, 1, 1, 1], loopBeats: 32, pulse: 'phrase', beatLock: 0, swing: 0, calm: 1, sig: 'glide' } },
  { id: 'maqam', names: ['maqam', 'arabic', 'persian', 'dastgah', 'turkish', 'makam', 'flamenco' /* wave 2 placeholder family (Visuals to design) */], ohm: '#4fb0b8', bl: .35, paint: maqam, live: maqamLive, shape: 'star8',
    auraPalette: { glow: '#2fa6a0', line: '#e8e2d2', fill: '#1d3f8f', accent: '#e8c47a' }, auraPattern: { kind: 'lattice', fold: 8, density: 38, speed: [1], loopBeats: 64, pulse: 'bar', beatLock: .2, swing: 0, calm: .5, sig: 'offScale' } },
  { id: 'gamelan', names: ['gamelan', 'javanese', 'balinese', 'indonesian', 'overtone' /* wave 2 placeholder family (Visuals to design) */], ohm: '#d8a040', bl: 1, paint: gamelan, live: gamelanLive, shape: 'knobs',
    auraPalette: { glow: '#7a1f1a', line: '#d6aa50', fill: '#0c0808', accent: '#ffd678' }, auraPattern: { kind: 'bosses', fold: 14, density: 1, speed: [2, 2, 3], loopBeats: 16, pulse: 'beat', beatLock: .5, swing: 0, calm: .3, sig: 'gong' } },
  { id: 'japan', names: ['japan', 'japanese', 'gagaku', 'shakuhachi', 'koto', 'china' /* wave 2 placeholder family (Visuals to design) */], ohm: '#d8a8b8', bl: 1, paint: japan, live: japanLive, shape: 'wave',
    auraPalette: { glow: '#6a7aa8', line: '#506eaa', fill: '#121a38', accent: '#c8323c' }, auraPattern: { kind: 'seigaiha', fold: 6, density: 15, speed: [1], loopBeats: 64, pulse: 'phrase', beatLock: 0, swing: 0, calm: 1, sig: 'breath' } },
  { id: 'wafrica', names: ['wafrica', 'west african', 'african', 'kente', 'djembe', 'ewe', 'cuban', 'rumba', 'samba', 'reggae' /* wave 2 placeholder family (Visuals to design) */], ohm: '#e08a3a', bl: .55, paint: westAfrica, live: westAfricaLive, shape: 'notch',
    auraPalette: { glow: '#e0a51c', line: '#e8dcbe', fill: '#8a5a24', accent: '#c8961f' }, auraPattern: { kind: 'kente', fold: 3, density: 12, speed: [3, 2], loopBeats: 32, pulse: 'beat', beatLock: .6, swing: .12, calm: 0, sig: 'downbeat2' } },
  { id: 'celtic', names: ['celtic', 'irish', 'scottish', 'breton', 'gaelic', 'modal', 'aksak', 'andean' /* wave 2 placeholder family (Visuals to design) */], ohm: '#7fbf8a', bl: 1, paint: celtic, live: celticLive, shape: 'triquetra',
    auraPalette: { glow: '#4f6b3a', line: '#b58a35', fill: '#1e1610', accent: '#dcb95f' }, auraPattern: { kind: 'interlace', fold: 5, density: 1, speed: [1, -1], loopBeats: 64, pulse: 'bar', beatLock: .1, swing: 0, calm: .6, sig: 'sustain' } },
  { id: 'techno', names: ['techno', 'house', 'electronic', 'edm', 'trance', 'dnb', 'minimal', 'funk' /* wave 2 placeholder family (Visuals to design) */], ohm: '#c070e0', bl: 1, paint: techno, live: technoLive, shape: 'stepped', frames: 12, discrete: true,
    auraPalette: { glow: '#8a3dff', line: '#22e0ff', fill: '#04020a', accent: '#ff8a1e' }, auraPattern: { kind: 'steps', fold: 4, density: 10, speed: [1], loopBeats: 48, pulse: 'beat', beatLock: 1, swing: 0, calm: 0, sig: 'kick' } },
];
const BY = new Map(); TRADITIONS.forEach((t, i) => { t.i = i; BY.set(t.id, t); for (const n of t.names) BY.set(n, t); });
const hashId = v => { let h = 2166136261; const s = String(v == null ? '' : v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const growL = g => { const x = cl(g); return x < 1 / 3 ? .6 + .9 * x : x < 2 / 3 ? .9 + 1.35 * (x - 1 / 3) : 1.35 + 1.95 * (x - 2 / 3); };   // option A: hatchling .6, young .9, seasoned 1.35, master 2
const LB = ['n', 'd', 'y'];
export function createAuras({ makeCanvas, opts = {} } = {}) {
  const O = { ...AURA_OPTS, ...opts }, sprites = createSprites({ makeCanvas, capBytes: O.capBytes[0], bakesPerFrame: 0 });
  const A = { O, sprites, jobs: [], pend: new Set(), on: !!O.on, grow: !!O.grow, stage: Math.max(1, Math.min(3, Math.round(+O.stage) || 1)), stats: { drawn: 0, blits: 0, fades: 0, live: 0, fallback: 0, bakes: 0, bakeMs: 0 } }, ST = new WeakMap(), SETS = new Map(), KIND = new Map();
  const F = { t: 0, beat: 0, q: 0, lb: 0, n: 0, live: 0, fade: 0, dt: 0, kick: 0, kb: 0 };
  // ---- an ohm's tradition, tier, level, personality (resolved once, re-read if the fields change) ----
  // real fields (master 4428792): o.tradId (traditions.js id string: western / hindustani / maqam / ...), o.tradition (rare.js: the planet's
  // songs-shape object {id, trad, name}); traditions.js auraPalette is a NEUTRAL placeholder ARRAY (Visuals designs the palettes), so only an
  // object palette {glow, line, ...} overrides ours
  const tradOf = o => { const t = typeof o.tradId === 'string' && o.tradId ? o.tradId : o.tradition && typeof o.tradition === 'object' && !o.tradition.auraPalette && (o.tradition.id || o.tradition.trad) ? String(o.tradition.id || o.tradition.trad) : o.tradition; let base = null, ov = null;
    if (typeof t === 'string') base = BY.get(t.toLowerCase()) || null; else if (typeof t === 'number') base = TRADITIONS[((t | 0) % 8 + 8) % 8]; else if (t && typeof t === 'object') { ov = t; base = BY.get(String(t.id || t.name || '').toLowerCase()) || null; }
    if (!base) base = TRADITIONS[hashId(o.id != null ? o.id : o.seed) % 8];   // test ohms / untagged: a STABLE hash picks one
    const objP = ov && ov.auraPalette && typeof ov.auraPalette === 'object' && !Array.isArray(ov.auraPalette) && (ov.auraPalette.glow || ov.auraPalette.line), objQ = ov && ov.auraPattern && typeof ov.auraPattern === 'object' && ov.auraPattern.loopBeats;
    if (!objP && !objQ) return base; if (!objQ) ov = { auraPalette: ov.auraPalette }; else if (!objP) ov = { auraPattern: ov.auraPattern };
    return { ...base, auraPalette: { ...base.auraPalette, ...(ov.auraPalette || {}) }, auraPattern: { ...base.auraPattern, ...(ov.auraPattern || {}) }, custom: hashId(JSON.stringify([ov.auraPalette, ov.auraPattern])) % 9973 }; };
  // tier: master rare.js gives o.rarity 0|1 + o.rareKind ('wild' | 'gift' | 'teacher') + o.tier (experience): teacher or tier >= teacherTier (3) = master look
  const tierOf = o => { const v = o.rarity != null ? o.rarity : o.rare === true ? 1 : o.teacher || o.master ? 2 : 0;
    if (v === 1 && (o.rareKind === 'teacher' || (typeof o.tier === 'number' && o.tier >= 3))) return 2;
    if (typeof v === 'number') return v >= 1.6 ? 2 : v >= .5 ? 1 : 0; if (typeof v === 'string') return /master|teacher|legend/i.test(v) ? 2 : /rare|gift|wild/i.test(v) ? 1 : 0;
    if (v && typeof v === 'object') return tierOf({ rarity: v.tier != null ? v.tier : v.level }); return 0; };
  // personality: master rare.js {calm (0 calm .. 1 lively), bold, curious, social, playful (0..1), traits} -> -1 calm .. 1 lively; older -1..1 trait objects still read
  const persOf = o => { const p = o.personality; if (typeof p === 'number') return cl(p, -1, 1);
    if (p && typeof p === 'object' && typeof p.calm === 'number') { const n = k => typeof p[k] === 'number' ? p[k] - .5 : 0; return cl((p.calm - .5) * 1.5 + .5 * n('playful') + .3 * n('bold') + .2 * n('social'), -1, 1); }
    if (p && typeof p === 'object') { const g = k => typeof p[k] === 'number' ? p[k] : 0;   // spec point 4 traits: bold/shy, curious/settled, social/loner, playful/serious (-1..1)
      return cl((g('bold') + g('playful') + .5 * g('curious') + .5 * g('social')) / 2.2 + (typeof p.lively === 'number' ? p.lively : 0), -1, 1); } return 0; };
  const stateOf = o => { let s = ST.get(o); const sig = o.tradId || o.tradition, rar = o.rarity, pe = o.personality, gr = o.growth;
    if (!s || s.ft !== sig || s.fr !== rar || s.fp !== pe || s.fg !== gr || s.frr !== o.rare || s.fk !== o.rareKind || s.fti !== o.tier) { if (!s) s = { loud: 0, sig: 0, after: 0, glide: 0, off: 0, gongE: 0, breath: 0, pitch: null, t: -1, sus: 0, lastPh: -1, lastBar: -1, lastG: -1, peakL: 0 }; s.fk = o.rareKind; s.fti = o.tier; const tr = tradOf(o), tier = tierOf(o);
      s = Object.assign(s, { ft: sig, fr: rar, fp: pe, fg: gr, frr: o.rare, tr, tier, pers: persOf(o), ph0: (hashId(o.id) % 997) / 997 });
      ST.set(o, s); } return s; };
  // growth (option A): o.growth 0..1, else from the real experience: o.tier (+ the way to the next tier from o.xp, xpFor = 8 t (t+1) / 2), tier 4 = full
  const growthOf = o => { if (typeof o.growth === 'number') return o.growth; if (typeof o.tier !== 'number') return null; const t = o.tier, x0 = 4 * t * (t + 1), x1 = 4 * (t + 1) * (t + 2), f = typeof o.xp === 'number' ? cl((o.xp - x0) / Math.max(1, x1 - x0)) : 0; return cl((t + f) / 4); };
  const levelOf = (o, s) => { if (s.tier === 0) return 0; const gw = A.grow ? growthOf(o) : null, L = gw != null ? Math.max(s.tier === 2 ? 1.6 : .6, growL(gw)) : s.tier === 2 ? 2 : RARE; return Math.min(L, O.stageL[A.stage] || 2); };   // capped by the build stage
  const lvlKey = L => L >= 1.6 ? 'm' : A.grow ? 'g' + Math.round(L * 4) : 'r';
  // ---- per frame ----
  A.frame = (st, music, env, q) => { const t = st && typeof st.t === 'number' ? st.t : music && music.now ? music.now() : 0; F.dt = F.t ? cl(t - F.t, 0, .1) : 1 / 60; F.t = t;
    F.beat = music && music.beat ? music.beat(t) : t * 2; F.q = q | 0; F.n = 0; F.live = 0; F.fade = 0;
    const d = env && typeof env.day === 'number' ? env.day : 1; F.lb = d < .14 ? 0 : d < .42 ? 1 : 2; if (env && env.inCave) F.lb = 0;
    const cap = O.capBytes[F.q] != null ? O.capBytes[F.q] : O.capBytes[0]; if (sprites.capBytes !== cap) { sprites.capBytes = cap; }
    makeWay();
    const bf = F.beat % 1; F.kick = Math.exp(-bf * 7); A.stats.drawn = 0; A.stats.hidden = 0; A.stats.blits = 0; A.stats.fades = 0; A.stats.live = 0; A.stats.fallback = 0; };
  // ---- crowded jam: who makes way (from the auras drawn last frame: centre, reach, loudness); strongest first, each placed aura's disc
  // (pulled in when it yields) counts toward the depth at a spot ----
  const CUR = [], PL = [];
  const makeWay = () => { const W = O.way, list = CUR.slice(); CUR.length = 0; if (!W || !W.on) { for (const s of list) { s.mwT = 0; s.mhT = 0; } return; }
    for (const s of list) s.pr = s.loud + .25 * s.sig + (s.lead ? W.keep : 0) + (s.tier === 2 ? .05 : 0);
    list.sort((a, b) => b.pr - a.pr || (a.ph0 - b.ph0)); PL.length = 0;
    for (const s of list) { let n = 0, nk = 0; for (const p of PL) { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < W.hit * (p.ar * p.ak + s.ar)) n++; if (d < W.hit * (p.ar * p.ak + s.ar * W.k)) nk++; }
      s.lead = n === 0; s.mwT = n ? 1 : 0; s.mhT = nk >= W.depth ? 1 : 0; s.ak = n ? W.k : 1; if (!s.mhT) PL.push(s); } };
  const ease = (v, t, dt, tau) => v + (t - v) * (1 - Math.exp(-dt / Math.max(.01, tau)));
  // yield of an ohm this frame { a: alpha factor, k: size factor } (rare.js rings use it too, the same easing)
  A.way = o => { const s = ST.get(o); if (!s || !O.way || !O.way.on) return null; const w = s.mw || 0, h = s.mh || 0; return { a: (1 - (1 - O.way.a) * w) * (1 - h), k: w > .5 ? O.way.k : 1, w, h }; };
  A.info = o => { const s = stateOf(o); return { stage: A.stage, trad: s.tr, tradition: s.tr.id, tier: s.tier, L: levelOf(o, s), pers: s.pers, loud: s.loud, sig: s.sig, after: s.after, glide: s.glide, offScale: s.off, gong: s.gongE, x: s.x, y: s.y, r: s.r, seen: s.fn }; };
  // ordinary ohms (and the glow of every ohm with a tradition): a hint of the tradition's colour in its own glow
  A.tint = (o, c, out) => { const s = stateOf(o), g = s.tr.rgb || (s.tr.rgb = hx(s.tr.auraPalette.glow)), k = s.tier ? O.rareTint : O.ordTint; out[0] = c[0] + (g[0] - c[0]) * k; out[1] = c[1] + (g[1] - c[1]) * k; out[2] = c[2] + (g[2] - c[2]) * k; return out; };
  // ---- envelopes from the ohm's notes (o.glow bumps on every note; o.pitch = last note Hz) + the music flags ----
  const env = (o, s, gl) => { const dt = F.dt, Q = s.tr.auraPattern, m = o.music || o;
    const loud = cl(gl / O.loudK); s.loud += (loud - s.loud) * cl(dt * (loud > s.loud ? 14 : 3));
    let trig = 0; const ph = (F.beat / 16) % 1, bar = Math.floor(F.beat / 4);
    if (Q.sig === 'phrase') { if (s.lastPh >= 0 && ph < s.lastPh && s.loud > .15) trig = 1; }
    else if (Q.sig === 'downbeat2') { if (s.lastBar >= 0 && bar !== s.lastBar && bar % 2 === 0 && s.loud > .15) trig = 1; }
    else if (Q.sig === 'kick') { if (F.kb !== Math.floor(F.beat) && s.loud > .2 && Math.floor(F.beat) !== s.lastB) { trig = .55; s.lastB = Math.floor(F.beat); } }
    else if (Q.sig === 'sustain') { s.sus = s.loud > .5 ? s.sus + dt : 0; if (s.sus > 2) { trig = 1; s.sus = -4; } }
    else if (Q.sig === 'breath') { s.peakL = Math.max(s.loud, s.peakL - dt * .15); if (s.peakL > .5 && s.loud < s.peakL - .32) { trig = 1; s.breath = 1; s.peakL = s.loud; } }
    // music flags: o.glide / o.offScale / o.gongPhase (or o.music.{..}); fallback from the notes themselves
    const f = typeof o.pitch === 'number' && o.pitch > 0 ? o.pitch : null;
    if (typeof m.glide === 'number' || typeof m.glide === 'boolean') s.glide = Math.max(s.glide, +m.glide);
    else if (f && s.pitch && f !== s.pitch) { const st = Math.abs(12 * Math.log2(f / s.pitch)); if (st > .05 && st < 3) s.glide = 1; }
    if (typeof m.offScale === 'number' || typeof m.offScale === 'boolean') s.off = Math.max(s.off, +m.offScale);
    else if (f && f !== s.pitch) { const c = 1200 * Math.log2(f / 440), dc = Math.abs(c - 100 * Math.round(c / 100)); if (dc > 25) s.off = 1; }
    s.pitch = f;
    const gp = typeof m.gongPhase === 'number' ? m.gongPhase % 1 : (F.beat / 32) % 1; if (s.lastG >= 0 && gp < s.lastG - .5) s.gongE = 1; s.lastG = gp;
    if (Q.sig === 'glide' && s.glide > .9 && !s.gl0) trig = 1; s.gl0 = s.glide > .9;
    if (Q.sig === 'offScale' && s.off > .9 && !s.of0) trig = 1; s.of0 = s.off > .9;
    if (Q.sig === 'gong' && s.gongE > .9 && !s.go0) trig = 1; s.go0 = s.gongE > .9;
    if (trig) { s.sig = Math.max(s.sig, trig); s.after = Math.max(s.after, trig * .9); }
    const kd = Math.exp(-dt / O.sigDecay * (Q.sig === 'kick' ? 5 : 1)), ad = Math.exp(-dt / O.afterDecay);
    s.sig *= kd; s.after *= ad; s.glide *= Math.exp(-dt / .8); s.off *= Math.exp(-dt / .8); s.gongE *= Math.exp(-dt / 1.6); s.breath *= Math.exp(-dt / 1.5);
    s.lastPh = ph; s.lastBar = bar; s.t = F.t; };
  // ---- the frame set of one (tradition, level, device size, light bucket) ----
  const NFof = (tr, D) => { const n = Math.min(tr.frames || 99, (O.frames[F.q] | 0) || 8, Math.max(6, Math.floor((O.setBytes[F.q] || (2 << 20)) / (D * D * 4)))); return tr.discrete ? n & ~1 : n; };
  const setOf = (s, L, Rd) => { const tr = s.tr, lk = lvlKey(L), k0 = Rd * S / BR * (L >= 1.6 ? O.masterScale : 1), Rp = auraR(L) + (L >= 1.6 ? 16 / S : 0), maxD = O.maxD[F.q] || 256, Dw = 2 * Math.ceil(Rp * k0) + 2, D = Math.min(maxD, Dw), k = k0 * D / Dw;
    const NF = NFof(tr, D), key = `${tr.i}${tr.custom ? 'c' + tr.custom : ''}${lk}s${A.stage}${LB[F.lb]}${Rd}:${NF}`; let S0 = SETS.get(key); if (S0) return S0;
    S0 = { key, tr, L, lk, Rd, NF, D, k, kd: k0, lb: F.lb, frames: [], kind: `${tr.i}${tr.custom ? 'c' + tr.custom : ''}${lk}s${A.stage}${LB[F.lb]}:${NF}`, ready: 0 };
    for (let i = 0; i < NF; i++) S0.frames.push(key + 'f' + i);
    SETS.set(key, S0); if (SETS.size > 256) { for (const k2 of SETS.keys()) { SETS.delete(k2); if (SETS.size <= 192) break; } }
    let K = KIND.get(S0.kind); if (!K) KIND.set(S0.kind, K = []); if (K.indexOf(S0) < 0) { K.push(S0); if (K.length > 12) K.shift(); } return S0; };
  const sub = (D, k) => () => { const c = sprites.make(D, D), x = c.getContext('2d'); x.setTransform(k, 0, 0, k, D / 2, D / 2); return [c, x]; };
  const put = (p, c) => { p.save(); p.setTransform(1, 0, 0, 1, 0, 0); p.drawImage(c, 0, 0); p.restore(); };
  // one frame: glow (tradition colour), the pattern masked to the aura disc + bloom, the extra glow rings, the master halo, light bucket
  const paintFrame = (S0, i, uo) => (x, w) => { const t0 = now(), tr = S0.tr, L = S0.L, D = S0.D, k = S0.k, R = auraR(L), pa = cl((L - .35) / .6);
    const P = { u: uo != null ? uo : i / S0.NF, L, loud: .6, beat: 0, sig: 0, after: 0, ohm: tr.ohm, lb: S0.lb, A: tr.auraPalette, Q: tr.auraPattern, glide: 0, off: 0, gong: 0, kick: 0, stage: A.stage };
    const pc = sprites.make(D, D), p = pc.getContext('2d'); p.setTransform(k, 0, 0, k, D / 2, D / 2);
    tr.paint(p, P, { sub: sub(D, k), put });
    p.globalCompositeOperation = 'destination-in'; const gm = p.createRadialGradient(0, 0, 0, 0, 0, R); gm.addColorStop(0, 'rgba(0,0,0,1)'); gm.addColorStop(.8, 'rgba(0,0,0,.95)'); gm.addColorStop(1, 'rgba(0,0,0,0)'); p.fillStyle = gm; p.fillRect(-R, -R, 2 * R, 2 * R);
    p.globalCompositeOperation = 'source-over';
    x.setTransform(k, 0, 0, k, D / 2, D / 2); const dayK = S0.lb === 2 ? .55 : S0.lb === 1 ? .8 : 1, gcol = mixh(tr.ohm, tr.auraPalette.glow, .55);
    glow(x, gcol, (.2 + .18 * P.loud + .12 * cl(L - .3) + .15 * P.sig + .1 * P.after) * dayK, R);
    let pv = pc; if (O.soft !== false && D >= 16) { const dh = Math.max(8, Math.round(D / O.softDiv)), ch = sprites.make(dh, dh), qh = ch.getContext('2d'); qh.imageSmoothingEnabled = true; qh.drawImage(pc, 0, 0, dh, dh);   // #9 no outlines: the pattern as soft light (a bake-time down / up-scale: the tracery glows, no crisp 1 px line)
      const cs = sprites.make(D, D), qs = cs.getContext('2d'); qs.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in qs) qs.imageSmoothingQuality = 'high'; qs.drawImage(ch, 0, 0, D, D);
      if (O.softGlow > 0) { const dq = Math.max(4, dh >> 2), cq = sprites.make(dq, dq), qq = cq.getContext('2d'); qq.imageSmoothingEnabled = true; qq.drawImage(ch, 0, 0, dq, dq); qs.globalCompositeOperation = 'lighter'; qs.globalAlpha = O.softGlow; qs.drawImage(cq, 0, 0, D, D); qs.globalAlpha = 1; qs.globalCompositeOperation = 'source-over'; }   // + a wide glow so the tracery reads as light
      pv = cs; }
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = pa * (S0.lb === 2 ? 1 : .92); x.drawImage(pv, 0, 0); x.globalAlpha = 1;
    if (O.bright > 0) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = cl(O.bright * pa * dayK); x.drawImage(pv, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }   // brighter (Wilbow 4:13 PM MDT "make them dynamic and brighter")
    const ba = (tr.bl || 1) * (.12 + .22 * P.loud + .25 * P.sig + .12 * P.after) * cl(L - .4, 0, 1.6) * dayK * (A.stage === 1 ? 0 : A.stage === 2 ? .5 : 1);   // stage 1: no bloom layer   // bloom: down / up-scaled copy, additive
    if (ba > 0 && D >= 24) { const d1 = Math.max(4, D >> 2), d2 = Math.max(2, Math.round(D / 10)), c1 = sprites.make(d1, d1), q1 = c1.getContext('2d'), c2 = sprites.make(d2, d2), q2 = c2.getContext('2d');
      q1.drawImage(pc, 0, 0, d1, d1); q2.drawImage(c1, 0, 0, d2, d2); x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true; x.globalAlpha = cl(ba); x.drawImage(c1, 0, 0, D, D); x.globalAlpha = cl(ba * .8); x.drawImage(c2, 0, 0, D, D); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    // spec point 1 "extra glow rings": soft bright rings at 1.22 / 1.5 (/ 1.8 master) body radii, in the tradition's line colour
    x.setTransform(k, 0, 0, k, D / 2, D / 2); x.globalCompositeOperation = 'lighter'; const rb = BR / S, lc = tr.auraPalette.line, rings = O.frameRings === false ? [] : A.stage === 1 ? [1.22] : L >= 1.6 ? [1.22, 1.5, 1.8] : [1.22, 1.5];   // frameRings false: the rare look draws them live, on the real silhouette
    for (let j = 0; j < rings.length; j++) { const rr = rb * rings[j] * (1 + .04 * P.sig); x.beginPath(); x.arc(0, 0, rr, 0, TAU); x.strokeStyle = rgba(lc, O.ringA * .25 * dayK); x.lineWidth = 7; x.stroke(); if (O.soft !== false) { x.strokeStyle = rgba(lc, O.ringA * (.3 - .06 * j)); x.lineWidth = 4.5; x.stroke(); continue; } x.strokeStyle = rgba(lc, O.ringA * (.9 - .2 * j)); x.lineWidth = 1.2; x.stroke(); }
    if (L > 1.6) glow(x, mixh(gcol, '#ffffff', .3), (.12 + .1 * P.loud) * dayK, R + 16 / S, BR / S);   // master: a white-warm halo past the pattern
    x.globalCompositeOperation = 'source-over';
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(0, 0, rb * .9, 0, TAU); x.fill(); x.globalCompositeOperation = 'source-over';   // no aura under the body (the signature pass is additive)
    if (S0.lb === 2) { x.globalCompositeOperation = 'destination-over'; x.beginPath(); x.arc(0, 0, R * .98, 0, TAU); const sh = x.createRadialGradient(0, 0, rb, 0, 0, R); sh.addColorStop(0, 'rgba(10,12,24,.28)'); sh.addColorStop(.7, 'rgba(10,12,24,.16)'); sh.addColorStop(1, 'rgba(10,12,24,0)'); x.fillStyle = sh; x.fill(); x.globalCompositeOperation = 'source-over'; }   // by day: a faint dusk under the pattern so it reads on a bright sky
    x.setTransform(1, 0, 0, 1, 0, 0); A.stats.bakes++; A.stats.bakeMs += now() - t0; };
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  const want = (key, w, paint) => { if (sprites.map.has(key) || A.pend.has(key) || A.jobs.length >= O.jobs) return; A.pend.add(key); A.jobs.push({ key, w, paint }); };
  const queueSet = (S0, fi) => { const NF = S0.NF; for (let j = 0; j < NF; j++) { const i = (fi + j) % NF; want(S0.frames[i], S0.D, paintFrame(S0, i)); } };
  A.pump = (ms, t0 = now()) => { let n = 0; while (A.jobs.length && now() - t0 < ms && n++ < 64) { const J = A.jobs.shift(); A.pend.delete(J.key); if (sprites.map.has(J.key)) continue;
    const c = sprites.get(J.key, J.w, J.w, J.paint, true), x = c && c.getContext && c.getContext('2d'); if (x && x.getImageData) try { x.getImageData(0, 0, 1, 1); } catch (e) { } } return now() - t0; };
  A.hasWork = () => A.jobs.length > 0;
  // test / tooling: bake one aura frame at loop phase u (0..1) straight to a canvas (not cached). tests/look_aura_test.mjs checks u=0 vs u=1 (seamless loop)
  A.paintAt = (o, Rd, u, lb = 0) => { const s = stateOf(o), L = levelOf(o, s), q0 = F.q, lb0 = F.lb; F.lb = lb; const S1 = setOf(s, L, Rd), c = makeCanvas(S1.D, S1.D); paintFrame(S1, 0, u)(c.getContext('2d'), S1.D); F.q = q0; F.lb = lb0; return c; };
  // ---- small per-ohm sprites: the body silhouette (ohm colour) and the sheen ----
  const shapeKey = (tr, tier, Rd, ck) => `b${tr.i}${tier}:${Rd}:${ck}`, sheenKey = (Rd, i) => `h${Rd}:${i}`;
  const paintShape = (tr, tier, Rd, rgb) => (x, w) => { const e = tier === 2 ? .3 : .18; x.setTransform(Rd, 0, 0, Rd, w / 2, w / 2); x.beginPath(); SHAPE[tr.shape](x, e);
    const g = x.createRadialGradient(-.3, -.35, .1, 0, 0, 1 + e); g.addColorStop(0, rgba(rgb.map(v => v + (255 - v) * .35), 1)); g.addColorStop(.7, rgba(rgb, 1)); g.addColorStop(1, rgba(rgb.map(v => v * .45), 1));
    x.fillStyle = g; x.fill('nonzero'); x.lineWidth = 1.2 / Rd; x.strokeStyle = rgba(hx(tr.auraPalette.line), .55); x.stroke(); x.setTransform(1, 0, 0, 1, 0, 0); };
  const NSH = 16, paintSheen = (Rd, i) => (x, w) => { const R = w / 2, s = -1.5 + 3 * i / (NSH - 1), a = -.6, cx = R + Math.cos(a) * s * R, cy = R + Math.sin(a) * s * R, nx = -Math.sin(a), ny = Math.cos(a);
    const g = x.createLinearGradient(cx - Math.cos(a) * R * .35, cy - Math.sin(a) * R * .35, cx + Math.cos(a) * R * .35, cy + Math.sin(a) * R * .35); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.beginPath(); x.arc(R, R, R * .97, 0, TAU); x.fillStyle = g; x.fill(); void nx; void ny; };
  // ---- draw: called by look.ohm for each ohm (after its glow), g in CSS px under the device transform m ----
  // noBody: the rare look (look/rare.js) owns the body (shape + shimmer): skip the sheen + the tradition silhouette here
  // under (v0.0.25): drawn BEFORE the body (look.rare layer 0) with source-over (Skia: dst-over ~2x the fill cost) - frames, signature, then
  // the live line on top; look.ohm then skips this ohm (A.drawnNow). Without it (rare look off / an unshaped rare ohm): dst-over behind the body.
  A.drawnNow = o => { const s = ST.get(o); return !!s && s.df === F.t; };
  A.draw = (g, o, x, y, r, m, c, gl, noBody, under) => { const s = stateOf(o); if (s.df === F.t) return; if (under) s.df = F.t; env(o, s, gl); s.x = x; s.y = y; s.r = r; s.fn = F.t; if (!A.on || !s.tier || !m) return; const q = F.q, max = O.max[q] | 0; if (F.n >= max) return;
    const L = levelOf(o, s); if (L < .35) return; const Rx = r * m.a; if (Rx < O.minRd || !(O.maxD[q] > 0)) return; F.n++;
    if (s.wf !== F.t) { s.wf = F.t; const tau = O.way ? O.way.tau : .25; s.mw = ease(s.mw || 0, s.mwT || 0, F.dt, tau); s.mh = ease(s.mh || 0, s.mhT || 0, F.dt, tau); }   // make way (crowded jam), eased
    const wk = O.way && O.way.on && (s.mw || 0) > .5 ? O.way.k : 1, wa = O.way && O.way.on ? (1 - (1 - O.way.a) * (s.mw || 0)) * (1 - (s.mh || 0)) : 1;
    const lq = Math.log(Rx * wk) / Math.log(O.sizeStep); if (s.bi == null || Math.abs(lq - s.bi) > .8) s.bi = Math.round(lq); const Rd = Math.round(Math.pow(O.sizeStep, s.bi));   // shared geometric size buckets + hysteresis: a pulsing / moving ohm keeps ONE baked set (drawn 1:1, within +-5% of its size)
    const tr = s.tr, Q = tr.auraPattern, S0 = setOf(s, L, Rd), calm = cl(Q.calm + .5 * Math.max(0, -s.pers)), spd = (1 + .25 * s.pers) * (1 - .15 * calm);
    const u = (((F.beat * spd) / Q.loopBeats + s.ph0) % 1 + 1) % 1, f = u * S0.NF, fi = Math.floor(f) % S0.NF, fr = f - Math.floor(f);
    const bf = ((F.beat + (Q.swing && (Math.floor(F.beat * 2) & 1) ? Q.swing : 0)) % 1 + 1) % 1, kick = Q.pulse === 'beat' ? Math.exp(-bf * 7) : Q.pulse === 'bar' ? Math.exp(-((F.beat / 4) % 1) * 5) : Math.exp(-((F.beat / 16) % 1) * 4);
    const lively = cl(s.pers * .8 + (1 - Q.calm) * .4), flick = 1 + .1 * lively * (Math.sin(F.t * 23.7 + s.ph0 * 40) * Math.sin(F.t * 9.1 + s.ph0 * 13));
    const tierK = L >= 1.6 ? 1.15 : 1, a0 = g.globalAlpha, aw = cl(O.alpha * tierK * cl(.45 + .55 * s.loud + .3 * s.sig + .4 * s.after) * (1 + .35 * Q.beatLock * kick * (.4 + .6 * s.loud)) * flick * (S0.lb === 2 ? 1.1 : 1)) * a0 * wa;
    s.ar = S0.D / 2 / m.a / wk; CUR.push(s); if (wa < .02) { A.stats.hidden = (A.stats.hidden | 0) + 1; return; }   // reach at full size (the make-way pass shrinks it); hidden: made way (3rd deep)
    const gcO = g.globalCompositeOperation, BEH = under ? 'source-over' : 'destination-over'; A.stats.drawn++;
    // 1 shimmer: a sheen sweeping the body (source-atop: only on what is drawn there), every ~3.2 s, lively ohms more often
    const sp = ((F.t / (3.2 - 1.2 * lively) + s.ph0) % 1), si = Math.round(sp / .55 * (NSH - 1));
    if (!noBody && sp < .55 && O.sheenA > 0) { const k = sheenKey(Rd, si), sc = sprites.map.has(k) ? sprites.get(k, Rd * 2, Rd * 2, null) : (want(k, Rd * 2, paintSheen(Rd, si)), null);
      if (sc) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = O.sheenA * (.6 + .4 * s.loud + .5 * s.sig) * a0; blit(g, sc, x - Rd / m.a, y - Rd / m.a, Rd * 2 / m.a, Rd * 2 / m.a, m); A.stats.blits++; } }
    g.globalCompositeOperation = BEH;
    // 2 the unusual body shape (behind the body, the ohm's own colour)
    if (!noBody) { const e = s.tier === 2 ? .3 : .18, w = 2 * Math.ceil(Rd * (1 + e)) + 4, ck = ((c[0] >> 4) << 8) | ((c[1] >> 4) << 4) | (c[2] >> 4), k = shapeKey(tr, s.tier, Rd, ck);
      const sc = sprites.map.has(k) ? sprites.get(k, w, w, null) : (want(k, w, paintShape(tr, s.tier, Rd, [((ck >> 8) & 15) * 17, ((ck >> 4) & 15) * 17, (ck & 15) * 17])), null);
      if (sc) { g.globalAlpha = O.shapeA * a0; blit(g, sc, x - w / 2 / m.a, y - w / 2 / m.a, w / m.a, w / m.a, m); A.stats.blits++; } }
    // 3 the live line (first opts.live ohms only): the signature element at the real loudness / event
    const live = () => { if (F.live < (O.live[q] | 0) && tr.live) { F.live++; A.stats.live++; const kc = S0.kd / m.a; g.save(); g.translate(x, y); g.scale(kc, kc); g.globalAlpha = cl(aw * 1.1);
      tr.live(g, { u, L, loud: s.loud, sig: s.sig, after: s.after, beat: F.beat, kick, glide: s.glide, off: s.off, gong: s.gongE, breath: s.breath, ohm: tr.ohm, lb: S0.lb, A: tr.auraPalette, Q }); g.restore(); g.globalCompositeOperation = BEH; } };
    if (!under) live();
    // 4 the aura frames (1:1), crossfaded for the first fadeN ohms, the signature frames over them while the event lasts
    const fade = !tr.discrete && F.fade < (O.fadeN[q] | 0) && fr > .04 && fr < .96, sw = cl(Math.max(s.sig, s.after * .5));
    if (fade) F.fade++;
    const D = S0.D, dx = x - D / 2 / m.a, dy = y - D / 2 / m.a, dw = D / m.a;
    const one = (i, a) => { if (a < .004) return true; const k = S0.frames[i]; if (sprites.map.has(k)) { g.globalAlpha = cl(a); blit(g, sprites.get(k, D, D, null), dx, dy, dw, dw, m); A.stats.blits++; return true; } queueSet(S0, i); return false; };
    const base = aw; let ok = true, ni = tr.discrete ? fi : Math.round(f) % S0.NF;
    let sa = sw > .02 ? O.sigK * sw * a0 * wa : 0;
    if (fade) { ok = one(fi, base * (1 - fr)) && one((fi + 1) % S0.NF, base * fr); A.stats.fades++; }
    else if (O.sigMerge && sa > 0 && under) { const a1 = Math.min(1, base + sa); ok = one(ni, a1); sa -= a1 - base; }   // sigMerge (v0.0.25 cost): the signature folded into the frame's own alpha (one blit; only the overflow past 1 goes additive)
    else ok = one(ni, base);
    if (ok && sa > .004 && sprites.map.has(S0.frames[ni])) { g.globalCompositeOperation = 'lighter'; one(ni, sa); g.globalCompositeOperation = BEH; }   // the signature: the same frame again, additive (the body hole keeps it off the body)
    if (!ok) { const K = KIND.get(S0.kind); let best = null, bd = 1e9;   // not baked yet at this size: the nearest baked size, scaled (only until the bake lands)
      if (K) for (const S1 of K) { if (S1 === S0) continue; const kk = S1.frames[Math.round(u * S1.NF) % S1.NF]; if (!sprites.map.has(kk)) continue; const d = Math.abs(S1.Rd - Rd); if (d < bd) { bd = d; best = kk; } }
      if (best) { g.globalAlpha = cl(base); const im = sprites.get(best, 0, 0, null), ds = im.width * Rd / Math.max(1, (K.find(S1 => S1.frames.includes(best)) || S0).Rd) / m.a; g.drawImage(im, x - ds / 2, y - ds / 2, ds, ds); A.stats.fallback++; } }
    if (under) { g.globalCompositeOperation = 'source-over'; live(); }
    g.globalCompositeOperation = gcO; g.globalAlpha = a0; };
  return A; }
