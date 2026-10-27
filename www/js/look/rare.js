// LOOK / rare (v0.0.24): the real look of a RARE ohm (rare_ohms_spec.md point 1: "shimmer, extra glow rings, an unusual body shape"),
// through master's hook look.rare(g, o, x, y, r, layer, info) (rare.js R.draw: layer 0 behind the body, 1 in front; true = replaces the
// placeholder rings + sparkles). Three parts, BAKED per ohm (own sprite cache, baked in idle time) and drawn 1:1 on device pixels:
//  1 the BODY in its rare shape (star / long / twin / wave, o.rareSig.shape) in our real material + key light. rare.js puts the shape in the
//    soft-body genes, but a 10-point ring smoothed by ohmdraw reads as a blob (a 2-lobe ring is just an oval) and look.ohm's lit sphere
//    painted over it read as a ball. Here: the soft ring is resampled to 40 points and pushed to the shape's real silhouette (star tips,
//    a twin's pinched waist, a travelling wave edge, a tapered long body); ohmdraw's blob is cleared, then the baked body (silhouette in
//    the body colour, lit INSIDE it with the lit sprite stretched along the long axis, twin waist shadow, limb darkening + rim light along
//    the real outline) is blitted, brightened with the ohm's glow, eyes / legs redrawn live. look.ohm calls body() in place of its round
//    shade for every shaped rare ohm, so the body draw never flattens the shape back into a sphere.
//  2 extra glow RINGS (layer 0, behind the body): 2 rings (+1 master / teacher, +1 tier >= travel) that follow the silhouette, soft +
//    thin, additive. With the tradition aura on they ARE the aura's rings: tradition line / accent colours, the tradition's dash
//    rhythm (folk solid, raga long glides, maqam dot-dash, gamelan dots counter-turning, japan sparse, west africa 3 against 2, celtic
//    interlaced, techno), the dashes step on the beat, brightness pulses on the tradition's cycle.
//  3 the SHIMMER: an iridescent sheen sweeping the long axis every few seconds (lively ohms more often; 3 baked band positions
//    cross-faded) + twinkles on the shape's features (star tips, twin lobes, the long ends, wave crests).
// Size steps: the body is baked per 2 device px (breath included), so a few sprites per ohm; the rings per 2 px without breath.
// Real fields (rare.js / traditions.js): o.rarity, o.rareKind, o.rareSig {shape, hueK, kinds, seed}, o.tier, o.xp, o.personality
// {calm (0 calm .. 1 lively), bold, curious, social, playful, traits}, o.tradition / o.tradId, o.glow. Every number is a PARAMETER.
import { RING } from '../genes.js';
import { createSprites, rgbKey } from './sprites.js';
export const RARE_LOOK = {
  on: true,                 // opts.realLook.rare = false -> master's placeholder rings / sparkles (and look.ohm's round shade) come back
  max: [12, 10, 6, 0],      // rare ohms that get the rings per frame, per rung (the body look goes on every shaped rare ohm look.ohm draws)
  pts: 40,                  // silhouette points (baked)
  shape: { star: { k: .3, tip: 2.4, base: .8 }, twin: { k: .4, pinch: .14 }, long: { taper: .06 }, wave: { k: .1, rip: .06, n: 9, speed: .35 } },
  erase: { star: 1, twin: 1, long: 1, wave: 1, none: 1 },   // clear ohmdraw's blob first, per shape (it shows around a silhouette that sits inside it: between star tips, at a twin's waist)
  ext: { star: 1.5, long: 1.45, twin: 1.4, wave: 1.3, none: 1.4 },   // sprite half-size / body radius (the silhouette is fitted inside)
  rings: [1.3, 1.62, 1.95, 2.25], ringA: .62, ringShape: .45, ringW: .05, softW: .2, softA: .2, ringPulse: .35, dashSteps: 4,
  // material (v0.0.25, no ink): a hair-thin hue-dark edge, soft limb darkening inside, a subsurface glow, a soft key rim + a faint back rim
  edge: .22, edgeW: .035, limb: .85, limbW: .6, sss: .3, rim: .4, rimW: .26, back: .18, crease: .3,
  shimmerA: .55, shimmerP: 3.2, sheenN: 5, sparkN: [5, 4, 2, 0], sparkA: .9, glowA: 0,
  sizeStep: 2, sizeK: 1.03, lightN: 12, lightTol: 24, lightTau: 3, waveN: 6,
  capBytes: 24 << 20, jobs: 96, syncBakes: 2,   // own cache; in-frame forced bakes per frame only for an ohm with nothing cached yet
  blend: 'source-over',     // live compositing of rings / sheen / twinkles ('lighter' reads a touch hotter, ~2x the fill cost on Skia raster)
  soft: true,               // parent 2:37 AM 'neutral strokes' review (Wilbow 10:06 'no outlines'): the rare look as light + shade only: the glow rings
                            // lose their crisp thin line (two wide low-alpha passes), the body loses its hair-thin dark edge (limb darkening shapes it),
                            // the legs are tapered shaded fills like look/ohmlook's (no stroke). false = the v0.0.25 rings / edge / stroke legs
  off: {},                  // debug: { rings, erase, sheen, sparks }
};
const TAU = Math.PI * 2, cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const hx = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a > 1 ? 1 : +a.toFixed(3)})`;
const hsl = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
// tradition ring styles: dash pattern (in body radii), direction per ring (alt / poly), dot caps, techno steps twice per beat
const RLOBE = { star: [5, .5], twin: [2, .6], wave: [4, .4], long: null, none: null };
const RS = { folk: { d: null }, raga: { d: [1.6, .5] }, maqam: { d: [.5, .14, .06, .14] }, gamelan: { d: [.02, .2], cap: 1, alt: 1 },
  japan: { d: [.9, 1.1] }, wafrica: { d: [.18, .14], poly: 1 }, celtic: { d: [.7, .22], alt: 1 }, techno: { d: [.3, .1], step: 1 }, none: { d: [1.1, .45], alt: 1 } };
export function createRareLook({ light, sprites: main, makeCanvas, music, sim, aura, opts = {} } = {}) {
  const O = { ...RARE_LOOK, ...opts, shape: { ...RARE_LOOK.shape, ...(opts.shape || {}) }, ext: { ...RARE_LOOK.ext, ...(opts.ext || {}) }, erase: { ...RARE_LOOK.erase, ...(opts.erase || {}) }, off: { ...(opts.off || {}) } };
  const mk = makeCanvas || (main && main.make), SP = createSprites({ makeCanvas: mk, capBytes: O.capBytes, bakesPerFrame: 0 });
  const K = { O, on: O.on !== false, sprites: SP, jobs: [], pend: new Set(), stats: { bodies: 0, rings: 0, sparks: 0, baked: 0, sync: 0, stale: 0, miss: 0 }, aura: aura || null };
  const N = 64, X = new Float32Array(N), Y = new Float32Array(N), CX = new Float32Array(RING), CY = new Float32Array(RING);
  const F = { id: 0, t: 0, beat: 0, q: 0, n: 0, sync: 0, bar: 0, ph: 0, breath: 1, la: 0, lx: -.6, ly: -.8, lc: [255, 244, 228], lk: -1 };
  const now = () => typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000;
  K.frame = (q, lightAngle, lightColor) => { const t = music && music.now ? music.now() : now(); F.t = t; F.q = q | 0; F.n = 0; F.sync = 0; F.id++; if (OUT.length) restoreAll();
    const st = K.stats; st.frames = (st.frames | 0) + 1;
    F.beat = music && music.beat ? music.beat(t) : t * 2;
    const bar = music && music.bar ? music.bar() : F.beat / 4, ph = music && music.phase ? music.phase() : F.beat % 1; F.bar = bar; F.ph = ph;
    F.breath = !sim || !sim.opts || sim.opts.breath ? 1 + .045 * Math.sin(bar * TAU) + .03 * Math.exp(-ph * 9) : 1;   // = sim.breath (ohmdraw scales the ring by it)
    if (typeof lightAngle === 'number') { const n = O.lightN, b = ((Math.round(lightAngle / TAU * n) % n) + n) % n; F.la = b; F.lx = Math.cos(b / n * TAU); F.ly = Math.sin(b / n * TAU); }
    const dt = F.t0 ? Math.min(.2, Math.max(0, t - F.t0)) : 1; F.t0 = t; if (lightColor) { const M = F.lm || (F.lm = [lightColor[0], lightColor[1], lightColor[2]]), k = 1 - Math.exp(-dt / O.lightTau); for (let i = 0; i < 3; i++) M[i] += (lightColor[i] - M[i]) * k; }   // the light's slow mean (it flashes with the beat)
    if (F.lm && (F.lk < 0 || Math.max(Math.abs(F.lm[0] - F.lc[0]), Math.abs(F.lm[1] - F.lc[1]), Math.abs(F.lm[2] - F.lc[2])) > O.lightTol)) { const lightColor = F.lm; F.lc = [lightColor[0], lightColor[1], lightColor[2]]; F.lk = rgbKey(lightColor[0] | 0, lightColor[1] | 0, lightColor[2] | 0); } };   // hysteresis: the light colour jitters with the music (it would re-key every body)
  // ---- who gets the look ----
  K.shaped = o => !!(K.on && o && o.rarity && o.rareSig && o.g && o.body && o.body.ring);
  const glOf = o => (o.glow || 0) + Math.min(1, (o.look && o.look.glow) || 0) * .6;
  const brOf = (o, gk = .04) => { const b = o.body; return F.breath * (1 - .22 * (b.pin || 0) + .25 * (b.pout || 0) + .12 * Math.min(1, b.throb || 0)) * (1 + glOf(o) * gk); };   // ohmdraw's ring scale (the sprite size leaves out the glow swell: it would re-key every frame)
  const persOf = o => { const p = o.personality; if (!p || typeof p !== 'object') return { lively: .5, bold: .5, playful: .5 };
    const n = k => typeof p[k] === 'number' ? p[k] : .5; return { lively: n('calm'), bold: n('bold'), playful: n('playful') }; };
  const levelOf = o => { const t = o.tier | 0; return o.rareKind === 'teacher' || t >= 3 ? 2 : 1; };
  // ring count: the rare look's own (2, +1 master, +1 tier 4); with the tradition aura on, its build stage (aura.js O.stage) caps it:
  // stage 1 = 1 ring (master 2, no accent), stage 2 = 2 (master 3), stage 3 = the full set
  const ringsOf = o => { const A = K.aura, L = levelOf(o), full = 2 + (L >= 2 ? 1 : 0) + ((o.tier | 0) >= 4 ? 1 : 0); if (!A || !A.on) return [full, L];
    const st = A.stage | 0, ms = L >= 2 ? 1 : 0; return [st <= 1 ? 1 + ms : st === 2 ? 2 + ms : full, st <= 1 ? 1 : L]; };   // stage 1: no accent ring
  const kindOf = o => { const k = o.rareSig.shape; return O.shape[k] ? k : 'none'; };
  // ---- the silhouette: soft ring -> n points on the rare shape, around the ring centroid ----
  const gene = (g, a) => 1 + (g.lobeAmt || 0) * Math.cos((g.lobes || 0) * a + (g.lobePh || 0));
  const want = (kind, g, a, t) => { const S = O.shape, ph = g.lobePh || 0;
    if (kind === 'star') { const f = Math.cos(5 * a + ph), s = S.star; return s.base + s.k * 2 * Math.pow((1 + f) / 2, s.tip) + .02; }
    if (kind === 'twin') return 1 + S.twin.k * Math.cos(2 * a + ph) - (S.twin.pinch || 0) * Math.cos(4 * a + 2 * ph);   // two round lobes, a pinched waist
    if (kind === 'wave') { const s = S.wave; return 1 + s.k * Math.cos(4 * a + ph) + s.rip * Math.sin(s.n * a - t * TAU); }
    if (kind === 'long') return 1 + S.long.taper * Math.cos(a + ph + Math.PI / 2);
    return gene(g, a); };
  const C = { mx: 0, my: 0, ax: 1, ay: 0, e1: 1, e2: 1, n: 0, R: 1 };
  // the live centroid of the soft ring (k = px per gene unit)
  const centroid = (o, k) => { const R = o.body.ring; let mx = 0, my = 0; for (let i = 0; i < RING; i++) { mx += R[i * 4]; my += R[i * 4 + 1]; } C.mx = mx / RING * k; C.my = my / RING * k; };
  // fills X, Y (relative to the centroid) at scale k; wt = wave phase (turns); sets the long axis, extents, max radius
  const outline = (o, k, wt) => { const R = o.body.ring, g = o.g, kind = kindOf(o), n = Math.min(N, O.pts | 0 || 40), per = n / RING;
    for (let i = 0; i < RING; i++) { CX[i] = R[i * 4] * k; CY[i] = R[i * 4 + 1] * k; } centroid(o, k); const mx = C.mx, my = C.my;
    for (let j = 0; j < n; j++) { const s = j / per, i1 = Math.floor(s), u = s - i1, i0 = (i1 + RING - 1) % RING, i2 = (i1 + 1) % RING, i3 = (i1 + 2) % RING, j1 = i1 % RING;   // Catmull-Rom through the soft ring
      const u2 = u * u, u3 = u2 * u, b0 = -.5 * u3 + u2 - .5 * u, b1 = 1.5 * u3 - 2.5 * u2 + 1, b2 = -1.5 * u3 + 2 * u2 + .5 * u, b3 = .5 * u3 - .5 * u2;
      const px = b0 * CX[i0] + b1 * CX[j1] + b2 * CX[i2] + b3 * CX[i3] - mx, py = b0 * CY[i0] + b1 * CY[j1] + b2 * CY[i2] + b3 * CY[i3] - my, a = s / RING * TAU, f = want(kind, g, a, wt) / gene(g, a);
      X[j] = px * f; Y[j] = py * f; }
    let sxx = 0, syy = 0, sxy = 0, R2 = 0; for (let j = 0; j < n; j++) { sxx += X[j] * X[j]; syy += Y[j] * Y[j]; sxy += X[j] * Y[j]; const q = X[j] * X[j] + Y[j] * Y[j]; if (q > R2) R2 = q; }
    const th = .5 * Math.atan2(2 * sxy, sxx - syy), ax = Math.cos(th), ay = Math.sin(th); let e1 = 0, e2 = 0;
    for (let j = 0; j < n; j++) { const p = Math.abs(X[j] * ax + Y[j] * ay), q2 = Math.abs(-X[j] * ay + Y[j] * ax); if (p > e1) e1 = p; if (q2 > e2) e2 = q2; }
    C.ax = ax; C.ay = ay; C.e1 = Math.max(e1, 1); C.e2 = Math.max(e2, 1); C.n = n; C.R = Math.sqrt(R2) || 1; return n; };
  const fit = lim => { if (C.R <= lim) return; const f = lim / C.R; for (let j = 0; j < C.n; j++) { X[j] *= f; Y[j] *= f; } C.e1 *= f; C.e2 *= f; C.R = lim; };
  const path = (g, s = 1) => { const n = C.n; g.beginPath(); for (let j = 0; j < n; j++) { const px = X[j] * s, py = Y[j] * s; if (j) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); };
  const ringPath = (g, o, x, y, k) => { const R = o.body.ring; g.beginPath(); const P = i => [x + R[(i % RING) * 4] * k, y + R[(i % RING) * 4 + 1] * k];   // ohmdraw's own body path (to clear it)
    let [x0, y0] = P(RING - 1), [x1, y1] = P(0); g.moveTo((x0 + x1) / 2, (y0 + y1) / 2); for (let i = 0; i < RING; i++) { const [ax, ay] = P(i), [bx, by] = P(i + 1); g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2); } g.closePath(); };
  // the clear: ohmdraw's quadratic ring as a polygon through its curve midpoints + control points (20 lineTo, a hair outside the curve: cheaper to fill)
  const erasePath = (g, o, x, y, k) => { const R = o.body.ring; g.beginPath(); for (let i = 0; i < RING; i++) { const j = (i + 1) % RING, ax = R[i * 4] * k, ay = R[i * 4 + 1] * k, bx = R[j * 4] * k, by = R[j * 4 + 1] * k;
    if (i) g.lineTo(x + ax, y + ay); else g.moveTo(x + ax, y + ay); g.lineTo(x + (ax + bx) / 2, y + (ay + by) / 2); } g.closePath(); };
  // a ring: a smooth echo of the REST shape (genes.js restPoint: aspect + the shape's lobes as one soft cosine, no sharp tips: sharp tips 2x out read as zigzags), not the live soft ring (its squash would be blown up 2x out there), scaled by s
  // around the centre, its shape amplitude eased by amp (outer rings rounder)
  const restPath = (x, o, k, s, amp) => { const g = o.g, kind = kindOf(o), n = Math.min(N, O.pts | 0 || 40), sa = Math.sqrt(g.aspect || 1), R0 = (g.r || 1) * k * s; x.beginPath();
    const ph = g.lobePh || 0, lb = RLOBE[kind]; for (let j = 0; j < n; j++) { const a = j / n * TAU, w = 1 + (lb ? lb[1] * Math.cos(lb[0] * a + ph) : 0) * amp * O.ringShape, px = Math.cos(a) * w * R0 / sa, py = Math.sin(a) * w * R0 * sa; if (j) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath(); };
  // ---- bakes: own cache, queued for idle time (index.js bakeSlice -> K.pump) ----
  const wantJob = (key, w, paint) => { if (SP.map.has(key) || K.pend.has(key) || K.jobs.length >= O.jobs) return; K.pend.add(key); K.jobs.push({ key, w, paint }); };
  // crop (v0.0.25 cost): each baked sprite is cut down to its painted bbox (alpha > 1/255) once, at bake time, into its own small canvas
  // (Skia: a ring / sheen sprite is mostly empty; a source-rect blit of the big one is no faster, a smaller canvas is). CROP = [ox, oy] in the full D.
  const CROP = new WeakMap(), crop = (key, c) => { const x = c && c.getContext && c.getContext('2d'); if (!x || !x.getImageData || O.crop === false) { if (x && x.getImageData) try { x.getImageData(0, 0, 1, 1); } catch (e) { } return c; }
    let d; try { d = x.getImageData(0, 0, c.width, c.height).data; } catch (e) { return c; }
    const w = c.width, h = c.height; let x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) { const o = y * w * 4; for (let i = 0; i < w; i++) if (d[o + i * 4 + 3] > 1) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; y1 = y; } }
    if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; } const cw = x1 - x0 + 1, ch = y1 - y0 + 1; if (cw * ch > .85 * w * h) return c;
    const e = SP.map.get(key), s = mk(cw, ch); s.getContext('2d').drawImage(c, -x0, -y0); CROP.set(s, [x0, y0, w]); if (e && e.c === c) { e.c = s; SP.bytes += cw * ch * 4 - e.b; e.b = cw * ch * 4; } return s; };
  K.pump = (ms, t0 = now() * 1000) => { let n = 0; const T = () => now() * 1000; while (K.jobs.length && T() - t0 < ms && n++ < 64) { const J = K.jobs.shift(); K.pend.delete(J.key); if (SP.map.has(J.key)) continue;
    crop(J.key, SP.get(J.key, J.w, J.w, J.paint, true)); K.stats.baked++; } return T() - t0; };
  K.hasWork = () => K.jobs.length > 0;
  const get = (key, w, paint, sync) => { const c = SP.map.has(key) ? SP.get(key, w, w, null) : null; if (c) return c;
    if (sync && F.sync < O.syncBakes) { F.sync++; K.stats.sync++; K.pend.delete(key); const s = crop(key, SP.get(key, w, w, paint, true)); return s; }
    wantJob(key, w, paint); K.stats.miss++; return null; };
  const TMP = new Map(), tmp = w => { let c = TMP.get(w); if (!c) { if (TMP.size > 8) TMP.clear(); TMP.set(w, c = mk(w, w)); } const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, w); return c; };
  // per ohm: the last good sprites (drawn scaled while a new size / light / phase bakes)
  const E = new WeakMap(), ent = o => { let e = E.get(o); if (!e) E.set(o, e = { b: null, bD: 0, s: [], r: null, rD: 0 }); return e; };
  const blit1 = (g, img, cx, cy, D, m, Dw = D) => { g.setTransform(1, 0, 0, 1, 0, 0); const b = CROP.get(img), W = b ? b[2] : img.width;
    if (Dw === D && W === D) g.drawImage(img, Math.round(m.a * cx + m.e - D / 2) + (b ? b[0] : 0), Math.round(m.d * cy + m.f - D / 2) + (b ? b[1] : 0));
    else { const k = Dw / W; g.drawImage(img, m.a * cx + m.e - Dw / 2 + (b ? b[0] * k : 0), m.d * cy + m.f - Dw / 2 + (b ? b[1] * k : 0), img.width * k, img.height * k); }
    g.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); };
  // ---- tradition (through the aura module when it is on) ----
  const tradOf = o => { const A = K.aura; if (!A || !A.on) return null; const i = A.info(o); return i && i.trad ? i.trad : null; };
  const hueOf = o => ((o.hue || 0) + (o.rareSig.hueK || 0) * 140) % 360;
  const sparkPaint = (x, w) => { x.scale(w / 32, w / 32); const h = 16, gr = x.createRadialGradient(h, h, 0, h, h, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(h, h, h * .45, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.moveTo(h, 0); x.lineTo(h + 1.6, h); x.lineTo(h, 32); x.lineTo(h - 1.6, h); x.closePath(); x.fill(); x.beginPath(); x.moveTo(0, h); x.lineTo(h, h - 1.6); x.lineTo(32, h); x.lineTo(h, h + 1.6); x.closePath(); x.fill(); };
  // twinkle sprites: one shared set, pre-sized per device size (3 % steps), blitted 1:1 at whole pixels (a scaled drawImage costs ~3x)
  const SPK = [], spark = n => SP.get(SPK[n] || (SPK[n] = 'rspark:' + n), n, n, sparkPaint, true);   // (keys only: an evicted canvas is pooled + reused)
  // ---- 2 extra glow rings (layer 0), baked per (ohm, size, tradition, level, dash step) ----
  const ringPaint = (o, Rr, D, tr, L, step, nR) => (x, w) => { const kind = kindOf(o), st = tr ? (RS[tr.id] || RS.none) : RS.none, P = persOf(o);
    outline(o, Rr / (o.g.r || 1), 0); const kp = Rr / (o.g.r || 1) * Math.min(1, (D / 2 - Rr * O.softW * .6 - 2) / ((O.rings[nR - 1] || 2.25) * C.R));
    const lc = tr ? hx(tr.auraPalette.line) : hsl(hueOf(o), 90, 72), ac = tr ? hx(tr.auraPalette.accent) : hsl((hueOf(o) + 40) % 360, 95, 78), R0 = (C.e1 + C.e2) / 2;
    x.setTransform(1, 0, 0, 1, w / 2, w / 2); x.globalCompositeOperation = 'lighter';
    for (let j = 0; j < nR; j++) { const s = O.rings[j], c = j === nR - 1 && L >= 2 ? ac : lc, d = st.d, dir = (st.alt || st.poly) && j % 2 ? -1 : 1;
      if (d) { const unit = R0 * s, per = d.reduce((a, v) => a + v, 0) * unit; x.setLineDash(d.map(v => Math.max(.5, v * unit))); x.lineDashOffset = -dir * per * (step / O.dashSteps) * (st.poly && j % 2 ? 1.5 : 1) * (.7 + .6 * P.lively); } else x.setLineDash([]);
      restPath(x, o, kp, s, 1 / (1 + .55 * j)); x.lineCap = st.cap ? 'round' : 'butt';
      if (O.soft !== false) { x.strokeStyle = rgba(c, O.softA * .9); x.lineWidth = Math.max(4, Rr * O.softW * 1.2); x.stroke();   // soft: a glow band, no crisp line
        x.strokeStyle = rgba(c, O.ringA * .42 * (1 - .16 * j)); x.lineWidth = Math.max(2, Rr * O.ringW * 2.6 * (st.cap ? 1.6 : 1)); x.stroke(); continue; }
      x.strokeStyle = rgba(c, O.softA * 1.4); x.lineWidth = Math.max(2.5, Rr * O.softW); x.stroke();
      x.strokeStyle = rgba(c, O.ringA * (1 - .16 * j)); x.lineWidth = Math.max(1, Rr * O.ringW * (st.cap ? 2.2 : 1)); x.stroke(); } };
  K.rings = (g, o, x, y, r, m) => { if (r < 2 || O.off.rings) return; m = m || (g.getTransform ? g.getTransform() : null); if (!m || m.b || m.c) return;
    const [nR, L] = ringsOf(o), tr = tradOf(o), st = tr ? (RS[tr.id] || RS.none) : RS.none, Q = tr && tr.auraPattern || null, kind = kindOf(o);
    const WY = K.aura && K.aura.on && K.aura.way ? K.aura.way(o) : null; if (WY && WY.a < .02) return;   // the tradition aura's make-way (crowded jam): rings soften + pull in with it
    const Rr = szOf(r * m.a * (WY ? WY.k : 1)), D = 2 * Math.ceil(Rr * O.ext[kind] * (O.rings[nR - 1] || 2.25) + Rr * O.softW * .6 + 2);
    const step = Math.floor(F.beat * (st.step ? 2 : 1)) % O.dashSteps, key = `rr${O.soft !== false ? 's' : ''}:${o.rareSig.seed >>> 0}:${o.hue | 0}:${Rr}:${tr ? tr.id : '-'}:${L}:${nR}:${st.d ? step : 0}`;
    const e = ent(o); let img = get(key, D, ringPaint(o, Rr, D, tr, L, st.d ? step : 0, nR), !e.r), Dw = D; if (img) { e.r = img; e.rD = D; } else if (e.r) { img = e.r; Dw = D; K.stats.stale++; } if (!img) return;
    const per = Q && Q.pulse && Q.pulse.period ? Q.pulse.period : Q && Q.pulse === 'bar' ? 4 : 1, kick = Math.exp(-((F.beat / per) % 1) * (per > 2 ? 4 : 7)), gl = cl(glOf(o) * .6);
    centroid(o, r / (o.g.r || 1)); const g0 = g.globalCompositeOperation, a0 = g.globalAlpha; g.globalCompositeOperation = O.blend; g.globalAlpha = cl((.62 + .25 * gl + O.ringPulse * kick) * (WY ? WY.a : 1));
    blit1(g, img, x + C.mx, y + C.my, D, m, Dw); g.globalCompositeOperation = g0; g.globalAlpha = a0; K.stats.rings++; };
  // ---- 1 the body, baked per (ohm, device size with breath, light bucket, wave phase) ----
  const bodyPaint = (o, Rd, D, lit, wp) => (x, w) => { const kind = kindOf(o), h = w / 2;
    outline(o, Rd / (o.g.r || 1), wp / O.waveN); fit(h - Math.max(2, Rd * O.edgeW * .3) - 1); const ax = C.ax, ay = C.ay, e1 = C.e1 * 1.04, e2 = C.e2 * 1.04;
    x.setTransform(1, 0, 0, 1, h, h); x.fillStyle = `hsl(${o.hue | 0},62%,45%)`; path(x); x.fill();
    x.save(); path(x); x.clip();
    const Re = Math.max(4, Math.min(192, Math.round(Math.max(e1, e2)))); let Lm = lit ? lit(Re) : null; if (!Lm && light && light.litExactPaint) { Lm = tmp(Re * 2); light.litExactPaint()(Lm.getContext('2d'), Re * 2, Re * 2); }
    if (Lm) { x.transform(ax * ax * e1 + ay * ay * e2, ax * ay * (e1 - e2), ax * ay * (e1 - e2), ay * ay * e1 + ax * ax * e2, 0, 0); x.drawImage(Lm, -1, -1, 2, 2); x.setTransform(1, 0, 0, 1, h, h); }   // R S R^T: stretched along the axis, the light stays put
    if (kind === 'twin') { const wd = C.e1 * .32, cg = x.createLinearGradient(-ax * wd, -ay * wd, ax * wd, ay * wd);   // the waist: a soft shadow band across it
      cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(.5, `rgba(0,0,0,${O.crease})`); cg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = cg; x.fillRect(-h, -h, w, w); }
    // limb darkening: an inner shadow along the real outline (the outside, as a hole, casts a blurred hue-dark shadow into the clip), not black ink
    const hu = o.hue | 0, dk = hsl(hu, 55, 12); x.lineJoin = 'round';
    x.save(); x.shadowColor = rgba(dk, O.limb); x.shadowBlur = Math.max(2, Rd * O.limbW); x.beginPath(); x.rect(-2 * w, -2 * w, 4 * w, 4 * w);
    for (let j = C.n - 1; j >= 0; j--) { if (j === C.n - 1) x.moveTo(X[j], Y[j]); else x.lineTo(X[j], Y[j]); } x.closePath(); x.fillStyle = '#000'; x.fill('evenodd'); x.restore();
    // subsurface: light scattered inside the body - a warm hue glow off-centre toward the light, falling off before the limb
    x.globalCompositeOperation = 'lighter'; const ex = C.R, lc = F.lc, sc = hsl(hu, 85, 58), sx = F.lx * ex * .18, sy = F.ly * ex * .18 + ex * .08;
    const sg = x.createRadialGradient(sx, sy, 0, sx, sy, ex * .85); sg.addColorStop(0, rgba(sc, O.sss)); sg.addColorStop(.55, rgba(sc, O.sss * .35)); sg.addColorStop(1, rgba(sc, 0)); x.fillStyle = sg; x.fillRect(-h, -h, w, w);
    // soft key rim (light colour, toward the light) in 2 widths + a faint cool back rim on the other side
    for (const [k, wd] of [[.45, 1], [1, .35]]) { const rg = x.createLinearGradient(F.lx * ex, F.ly * ex, -F.lx * ex * .3, -F.ly * ex * .3);
      rg.addColorStop(0, rgba(lc, O.rim * k)); rg.addColorStop(1, rgba(lc, 0)); path(x); x.strokeStyle = rg; x.lineWidth = Math.max(1.2, Rd * O.rimW * wd); x.stroke(); }
    { const bc = hsl((hu + 200) % 360, 70, 70), bg = x.createLinearGradient(-F.lx * ex, -F.ly * ex, F.lx * ex * .2, F.ly * ex * .2); bg.addColorStop(0, rgba(bc, O.back)); bg.addColorStop(1, rgba(bc, 0));
      path(x); x.strokeStyle = bg; x.lineWidth = Math.max(1, Rd * O.rimW * .5); x.stroke(); }
    x.restore();
    // the silhouette: a hair-thin hue-dark edge on the outside (keeps it clear on bright ground, no ink line)
    if (O.soft !== false) return;   // soft: no edge line (the limb darkening + rims carry the silhouette)
    x.save(); x.setTransform(1, 0, 0, 1, h, h); path(x); x.strokeStyle = rgba(dk, O.edge); x.lineWidth = Math.max(1, Rd * O.edgeW); x.lineJoin = 'round'; x.stroke(); x.restore(); };
  // 3 the sheen at band position j of sheenN (inside the silhouette, additive when drawn)
  const sheenPaint = (o, Rd, D, j, wp) => (x, w) => { const h = w / 2; outline(o, Rd / (o.g.r || 1), wp / O.waveN); fit(h - Math.max(2, Rd * O.edgeW * .3) - 1);
    const ax = C.ax, ay = C.ay, u = -.85 + 1.7 * j / Math.max(1, O.sheenN - 1), cx = ax * C.e1 * u, cy = ay * C.e1 * u, wd = C.e1 * .45, hu = hueOf(o), c1 = hsl((hu + 30 * j) % 360, 100, 82), c2 = hsl((hu + 180) % 360, 100, 85);
    x.setTransform(1, 0, 0, 1, h, h); x.fillStyle = '#fff'; path(x); x.fill(); x.globalCompositeOperation = 'source-in';
    const sh = x.createLinearGradient(cx - ax * wd, cy - ay * wd, cx + ax * wd, cy + ay * wd); sh.addColorStop(0, rgba(c1, 0)); sh.addColorStop(.4, rgba(c1, 1)); sh.addColorStop(.6, rgba(c2, .85)); sh.addColorStop(1, rgba(c2, 0));
    x.fillStyle = sh; x.fillRect(-h, -h, w, w); };
  const FE = new Int16Array(16);
  const feats = (out, max) => { const n = C.n; let c = 0; for (let j = 0; j < n && c < max; j++) { const r0 = X[j] * X[j] + Y[j] * Y[j], a = (j + n - 1) % n, b = (j + 1) % n, ra = X[a] * X[a] + Y[a] * Y[a], rb = X[b] * X[b] + Y[b] * Y[b]; if (r0 >= ra && r0 > rb) out[c++] = j; } return c; };
  // the body sprite for this frame: { img, D, Dw, Rd, wp } (baked; the last good one while a new size / light / phase bakes), or null
  const plan = (o, r, m, lit) => { if (r < 2 || !m || m.b || m.c) return null;
    const kind = kindOf(o), seed = o.rareSig.seed >>> 0;   // the size key leaves out breath / squash (they would re-key it every few frames: ohmdraw's blob is hidden, so nothing to match)
    const Rd = szOf(r * m.a), D = 2 * Math.ceil(Rd * O.ext[kind] + Math.max(2, Rd * O.edgeW * .3) + 1);
    const wp = kind === 'wave' ? ((Math.floor(F.t * O.shape.wave.speed * O.waveN) % O.waveN) + O.waveN) % O.waveN : 0, key = `rb${O.soft !== false ? 's' : ''}:${seed}:${o.hue | 0}:${Rd}:${F.la}:${F.lk}:${wp}`, e = ent(o);
    let img = get(key, D, bodyPaint(o, Rd, D, lit, wp), !e.b), Dw = D; if (img) { e.b = img; e.bD = D; } else if (e.b) { img = e.b; Dw = D; K.stats.stale++; }
    return img ? { img, D, Dw, Rd, wp } : null; };
  const szOf = v => { const q = Math.log(Math.max(4, v)) / Math.log(O.sizeK); return Math.max(4, Math.round(Math.pow(O.sizeK, Math.round(q)))); };   // device radius in sizeK (3 %) steps (zoom)
  // master's hook order (render.js): rare.draw layer 0 -> drawOhms (halo + the soft blob) -> rare.draw layer 1 -> look.ohm. So: at layer 0 the
  // body sprite is fetched and, when there is one, the ohm's soft ring is swapped for a zero ring while drawOhms runs (no blob to clear:
  // nothing of what is behind it gets cut); at layer 1 the ring is put back and the body is drawn. Every layer-0 call has its layer-1 twin
  // (same test, same frame); K.frame puts back any ring still out (an exception in between).
  const ZR = new Float32Array(RING * 4), OUT = [];
  K.hide = (o, r, m, lit) => { const e = ent(o); e.pi = plan(o, r, m, lit); if (!e.pi || O.hideBlob === false || e.ring) return !!e.pi; e.ring = o.body.ring; o.body.ring = ZR; OUT.push(o); return true; };
  K.show = (g, o, x, y, r, m) => { const e = ent(o); if (e.ring) { o.body.ring = e.ring; e.ring = null; } const pi = e.pi; e.pi = null; if (!pi) return false;
    draw(g, o, x, y, r, m, pi, !!(O.hideBlob === false)); e.fr = F.id; return true; };
  const restoreAll = () => { for (const o of OUT) { const e = E.get(o); if (e && e.ring) { o.body.ring = e.ring; e.ring = null; } } OUT.length = 0; };
  K.owns = o => { const e = E.get(o); return !!(e && e.pi); };   // between hide (layer 0) and show (layer 1): this frame's body + legs are ours (look.legs, ohmdraw B10)
  K.drawn = o => { const e = E.get(o); return !!e && e.fr === F.id; };
  // body(g, o, x, y, r, m, lit, lod): look.ohm's path when the hook did not draw it (look.rare off): the blob is there, so it is cleared first
  K.body = (g, o, x, y, r, m, lit, lod = 0) => { const pi = plan(o, r, m, lit); if (!pi) return false; draw(g, o, x, y, r, m, pi, true); return true; };
  const draw = (g, o, x, y, r, m, pi, erase) => { const { img, D, Dw, Rd, wp } = pi, seed = o.rareSig.seed >>> 0, e = ent(o);
    const b = o.body, gl = glOf(o), kind = kindOf(o), P = persOf(o), br = Rd / (r * m.a), rb = r * br, kc = r / (o.g.r || 1) * br, ke = r / (o.g.r || 1) * brOf(o) * 1.03;
    K.stats.bodies++; centroid(o, kc); const cx = x + C.mx, cy = y + C.my, g0 = g.globalCompositeOperation, a0 = g.globalAlpha;
    if (erase && !O.off.erase && O.erase[kind]) { g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out'; erasePath(g, o, x, y, ke); g.fill(); }   // clear ohmdraw's blob (its 10-point oval would show around the silhouette)
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; blit1(g, img, cx, cy, D, m, Dw);
    if (gl > .03 && O.glowA > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = cl(gl * O.glowA); blit1(g, img, cx, cy, D, m, Dw); }   // ohmdraw's glow lightening (45 + gl 22 %) on the baked body: off by default (a 2nd blit; the glow drives the rings + sheen instead)
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // legs + eyes (ohmdraw's, on our body)
    if (o.g.legs && b.ground && O.soft !== false) { const hu = o.hue | 0; for (const sx of [-1, 1]) { const hx = x + sx * rb * .4, hy = y + rb * .74, fx = x + sx * rb * .5, fy = y + rb * 1.02, wt = rb * .07, wb = rb * .05;   // soft: tapered shaded legs + a small foot, no stroke
        g.fillStyle = `hsla(${hu},45%,${sx < 0 === F.lx < 0 ? 36 : 26}%,.95)`; g.beginPath(); g.moveTo(hx - wt, hy); g.lineTo(hx + wt, hy); g.lineTo(fx + wb, fy); g.lineTo(fx - wb, fy); g.closePath(); g.fill();
        g.fillStyle = `hsla(${hu},40%,24%,.95)`; g.beginPath(); g.ellipse(fx + sx * rb * .03, fy, rb * .09, rb * .045, 0, 0, TAU); g.fill(); } }
    else if (o.g.legs && b.ground) { g.strokeStyle = `hsla(${o.hue | 0},50%,30%,.9)`; g.lineWidth = Math.max(1, rb * .1); g.beginPath(); g.moveTo(x - rb * .4, y + rb * .8); g.lineTo(x - rb * .5, y + rb * 1.02); g.moveTo(x + rb * .4, y + rb * .8); g.lineTo(x + rb * .5, y + rb * 1.02); g.stroke(); }
    if (!(K.faceOf && K.faceOf(g, o, x, y, rb, m))) { const p = b.partner, lx = p ? Math.sign(p.body.x - b.x) : Math.sign(b.vx || 0), er = rb * .13; g.fillStyle = 'rgba(10,8,20,.85)'; const ne = (o.g.eyes | 0) + 1; g.beginPath();
      for (let k = 0; k < ne; k++) { const ex = x + (k - (o.g.eyes | 0) / 2) * rb * .38 + lx * rb * .12, ey = y - rb * .25; g.moveTo(ex + er, ey); g.arc(ex, ey, er, 0, TAU); } g.fill(); }
    // 3 shimmer: the sheen sweeps the long axis every shimmerP s (lively ohms more often): 2 neighbour band positions cross-faded
    const T = O.shimmerP * (1.3 - .6 * P.lively), sp = ((F.t / T + (seed % 997) / 997) % 1);
    if (!O.off.sheen && sp < .5 && O.shimmerA > 0) { const p = sp / .5, env = Math.sin(p * Math.PI), fj = p * (O.sheenN - 1), j0 = Math.min(O.sheenN - 1, Math.floor(fj)), j1 = Math.min(O.sheenN - 1, j0 + 1), w1 = fj - j0;
      const j = w1 < .5 ? j0 : j1, s = get(`rs:${seed}:${o.hue | 0}:${Rd}:${j}:${wp}`, D, sheenPaint(o, Rd, D, j, wp), false);
      if (s) { g.globalCompositeOperation = O.blend; g.globalAlpha = cl(O.shimmerA * env * (.7 + .3 * cl(gl))); blit1(g, s, cx, cy, D, m, D); } }
    // twinkles on the shape's features (on the edge)
    const ns = O.off.sparks ? 0 : Math.min(O.sparkN[F.q] | 0, 2 + ((o.rareSig.kinds && o.rareSig.kinds.length) | 0));
    if (ns) { const fk = Rd * 64 + wp; if (e.fk !== fk) { e.fk = fk; outline(o, Rd / (o.g.r || 1), wp / O.waveN); const nf = feats(FE, 16); e.fn = nf; e.fx = e.fx || new Float32Array(16); e.fy = e.fy || new Float32Array(16);
        for (let i = 0; i < nf; i++) { const j = FE[i], L2 = Math.hypot(X[j], Y[j]) || 1, k = 1 + 1.5 * m.a / L2; e.fx[i] = X[j] * k; e.fy[i] = Y[j] * k; } }   // the shape's features (tips / lobes) per body sprite, in device px, just outside the edge
      const nf = e.fn; if (nf) { g.globalCompositeOperation = O.blend; g.setTransform(1, 0, 0, 1, 0, 0); const dcx = m.a * cx + m.e, dcy = m.d * cy + m.f;
      for (let i = 0; i < ns; i++) { const j = (i * 7 + Math.floor(F.t * .5)) % nf, tw = Math.max(0, Math.sin(F.t * (3 + 2 * P.lively) + i * 2.3 + (seed & 15)));
        if (tw < .05) continue; const n = szOf(Math.max(4, r * (.42 + .3 * tw)) * m.a), S = spark(n); if (!S) continue;
        g.globalAlpha = cl(O.sparkA * tw); g.drawImage(S, Math.round(dcx + e.fx[j] - n / 2), Math.round(dcy + e.fy[j] - n / 2)); K.stats.sparks++; } g.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); } }
    g.globalCompositeOperation = g0; g.globalAlpha = a0; };
  // master's hook: layer 0 = the rings (look.ohm draws the body + shimmer), layer 1 = nothing extra (true: no placeholder sparkles)
  K.take = (o, layer) => K.shaped(o);
  K.ringsFor = (g, o, x, y, r, m) => { if (F.n >= (O.max[F.q] | 0)) return; F.n++; K.rings(g, o, x, y, r, m); };   // the first max[q] rare ohms of the frame (the rest: shape + shimmer, no extra rings)
  return K; }
