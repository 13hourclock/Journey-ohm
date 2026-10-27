// LOOK / ground (2D; on by default, opts.realLook = false turns it off): the Canvas-2D surface when WebGL is off (PLAN_REAL_PLANET §16).
// A baked HEIGHT FIELD per tile: the ridge row is exactly the data silhouette and the land falls toward the viewer (rolling
// hills in front, ribbed rock at altitude, knolls, a winding river that widens toward you and lies flat at its water level).
// Each column is ray-cast front to back (voxel-space style), lit by the real star: slope light from the field normal, cast
// shadows along x, ambient occlusion, edge-on crests kept quiet (no outline). Cover by material and altitude: snow above the
// snow line (pts.snowLine / st.snowLine, else season-driven), held in gullies and off steep faces, forest showing through;
// bare rock on the steep; grass / forest / sand lower. Far slices get aerial haze.
// Seasons + weather are baked in (key buckets): winter = low snow line, frost, ice on water, cold light; summer = high snow line,
// warm light, lush green; storm = wet, dark, sheened rock under grey haze. Heal (37 A D): unhealed = real but muted, dusty, sparse
// cracks (glow only on big events); healed = vivid. Trippy layer (planet.js tintJob, baked in idle): the palette flows with
// altitude AND real light, with soft light catching the terraces (tripSoft: lit faces only, palette-tinted, no white outline
// strokes; v0.0.19); moves with bar / key / chord; mixed in at trip x takeover (.85, Q36).
// CONTRACT (README "look.ground"): look.ground(c, L, pts, st) -> true if drawn.
//   L = { i (0 front strip, 1-4 slices behind), depth 0..1, scale, haze 0..1, hazeRGB? }
//   pts, mode A (cached, the real path): { chunk, ver, n, h: Float32Array(n) (-1..1), x0, dx (px between samples), y0 (px of h=0),
//          amp (px per unit h, up), yBot?, m0?: Float32Array(4n) rock,soil,veg,sand  m1?: (4n) wet,ice,hollow,crack
//          m2?: (3n) temp,moist,slope  water?: Float32Array(n) water surface h (NaN = none) | river?: Float32Array(n) 0..1 flow strength, snowLine? (h units; else st.snowLine; else ours, seasonal) }
//   pts, mode B (uncached vector fallback): [{x, y}, ...] screen points along the ridge (old drawPlanet ridgelines)
// Tiles: one chunk of one slice at the canvas' own resolution, keyed by (slice, chunk, ver, q, light, heal, haze, season, weather);
// baked in idle time by columns (index.js runs the slices); the last finished version of a chunk keeps drawing meanwhile.
import { createNoise, rand01, smooth, clamp01 } from './noise.js';
import { blit, devOf, m2d } from './blit.js';
import { tintJob } from './planet.js';
import { skyLight } from './sky.js';
// The silhouette of one ground chunk, from its samples: hs = the ridge lightly smoothed (rolling), wl = river valleys flooded to a flat
// water level (no slit), hb = the ridge blurred wider for lower down the face (no creases running down). Game Dev's chunks carry
// `ov` = GOV (3) extra samples past each side of their core (fc5a6b1; render clips each tile to its core), so every kernel reads the
// neighbour's real samples across the seam: the ridge (hs, radius 2) is exactly seamless; the wider face blur / river fill run past
// the overlap and read a straight-line continuation of the edge there instead of a clamped flat (their tails carry ~3% weight, so
// two neighbours agree at the seam to well under a pixel; tests/look_test.mjs checks it). Without an overlap: clamp, as before.
export function ridgeProfile(pts, n, dx, faceBlur = 22) { const h = pts.h, ov = overlapOf(pts, n, dx), R = 7, RB = Math.max(2, Math.round(faceBlur / dx));
  const ext = (A, j) => { if (j >= 0 && j < n) return A[j]; if (!ov) return A[j < 0 ? 0 : n - 1]; const e = j < 0 ? 0 : n - 1, e2 = j < 0 ? 1 : n - 2, s = A[e] - A[e2]; return A[e] + s * (j < 0 ? -j : j - n + 1); };
  const hs = new Float32Array(n), wl = new Float32Array(n).fill(NaN), hb = new Float32Array(n), PAD = R + RB + 2, hsx = new Float32Array(n + 2 * PAD);
  for (let i = -PAD; i < n + PAD; i++) { let a = 0, w = 0; for (let k = -2; k <= 2; k++) { const q = 3 - Math.abs(k); a += ext(h, i + k) * q; w += q; } hsx[i + PAD] = ext(h, i) * .55 + a / w * .45; }
  const HS = j => ov ? (j < -PAD ? hsx[0] : j >= n + PAD ? hsx[n + 2 * PAD - 1] : hsx[j + PAD]) : hsx[Math.max(0, Math.min(n - 1, j)) + PAD];
  for (let i = 0; i < n; i++) hs[i] = hsx[i + PAD];
  if (pts.river) { const rvA = pts.river, lev = new Float32Array(n + 4).fill(NaN);
    for (let i = -2; i < n + 2; i++) { const rv = ext(rvA, i); if (!(rv > .05)) continue; let lo = Infinity, hiL = -Infinity, hiR = -Infinity;
      for (let k = -R; k <= R; k++) { const v = HS(i + k); if (Math.abs(k) <= 1) lo = Math.min(lo, v); if (k < 0) hiL = Math.max(hiL, v); if (k > 0) hiR = Math.max(hiR, v); }
      const f = Math.min(hiL, hiR), lv = lo + (f - lo) * .55 * rv; if (lv > HS(i)) lev[i + 2] = lv; }
    for (let i = 0; i < n; i++) if (lev[i + 2] === lev[i + 2]) { let a = 0, w = 0; for (let k = -2; k <= 2; k++) { const j = i + k; if ((ov || (j >= 0 && j < n)) && lev[j + 2] === lev[j + 2]) { a += lev[j + 2]; w++; } } wl[i] = a / w; } }
  for (let i = 0; i < n; i++) { let a = 0, w = 0; for (let k = -RB; k <= RB; k++) { const q = RB + 1 - Math.abs(k); a += HS(i + k) * q; w += q; } hb[i] = a / w; }
  return { hs, wl, hb, ov }; }
// the chunk's overlap in samples: Game Dev passes cx (core start) with x0 (first sample) GOV samples before it; else pts.ov; else 0
export const overlapOf = (pts, n, dx) => { if (typeof pts.ov === 'number') return pts.ov | 0; if (typeof pts.cx === 'number' && dx > 0) { const o = Math.round((pts.cx - pts.x0) / dx); return o > 0 && 2 * o < n - 1 ? o : 0; } return 0; };
export const GROUND_OPTS = { setSwap: true, setSwapMs: 900, snowLine: .55, seasonSnow: .42, snowBuckets: 40, freshK: .55, weatherK: 1, tileW: 512, relV: 1, spurPx: 64, knollPx: 26, hillPx: 150, rockPx: 22, hazePow: 1.3, dustHue: .3, lightBuckets: 8, lightSwapMs: 4000, res: [1, 1, 1, 1], bakeMs: [1.6, 1.2, .9, .6], spur: .009, spurAmp: .2, knollAmp: .06, rockAmp: .16, warp: 45, meander: 70, faceBlur: 22, hill: .006, hillAmp: .2, depthK: 2.2, depthHaze: .1,
  ambient: .34, slopeLight: .9, ao: .35, strataK: .04, snowSlope: .85, wetDark: .32, dust: [168, 152, 132], dustK: .6, crackK: .85, hazeK: .85, shoreFade: 14, shoreSide: 10, shoreK: .72, seaMist: 26, seaMistA: .9, haze: [150, 170, 200], tripBands: 10, tripLine: .45, tripSoft: true, backDepth: 1.2, maxJobs: 20, coverCut: true, coverPad: 6, coverBin: 24, coverMerge: 1e9, coverTop: 1e9, tripLight: 1.2, takeover: .85, glowBake: true, glowBuckets: 12, glowLag: 2, glow: [255, 170, 90], capBytes: 24 << 20, detailK: 1, detailBump: .55, detailAlb: .22, detailNear: 1.3, crestRim: .2, crestRimPx: 6,
  col: { rock: [116, 108, 100], soil: [96, 76, 58], veg: [66, 100, 46], vegSummer: [58, 108, 40], vegWinter: [112, 100, 72], forest: [38, 62, 34], sand: [196, 176, 132], snow: [236, 240, 248], water: [16, 44, 64], storm: [84, 94, 108] } };
const LB = 16;
// (v0.0.22) NEAR-RANGE DETAIL: four small periodic textures (256 x 256 texels, 1 texel = 1 device px at res 2), built once, sampled per
// PIXEL in surface coordinates (world x, and sv = down the surface: u x ZS x .55 - h x amp, so a steep face is textured along its
// height and flat ground is foreshortened). Each holds albedo variation (A) and the height gradient (X, Y) of a micro relief, so the
// detail is LIT by the real light (bumps catch it on their lit side) instead of a flat speckle. rock: ribs, cracks, lichen patches;
// soil: grain + pebbles; grass: tussocks with dark gaps; forest: canopy crowns. Before this every newly visible depth step filled its
// rows with ONE colour: a near face that one step spans 5-40 px read as a texture pulled down the slope (vertical smears).
const DT = 256, DM8 = DT - 1;
function makeDetail(seed) {
  const hsh = (i, j, k) => { let h = (i & DM8) * 374761393 + (j & DM8) * 668265263 + (k + seed) * 2147483647; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y, L, k) => { const c = DT / L, fx = x / c, fy = y / c, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, sx = tx * tx * tx * (tx * (tx * 6 - 15) + 10), sy = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
    const w = q => ((q % L) + L) % L, a = hsh(w(i), w(j), k), b = hsh(w(i + 1), w(j), k), cc = hsh(w(i), w(j + 1), k), d = hsh(w(i + 1), w(j + 1), k);
    return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy; };
  const mats = [
    // rock: ridged ribs at a few scales, thin dark cracks, lichen / weathering patches in the albedo
    (x, y) => { let h = 0, a = 1; for (const L of [8, 16, 32, 64]) { const r = 1 - Math.abs(vn(x, y, L, L) * 2 - 1); h += r * r * a; a *= .5; } const ck = Math.abs(vn(x, y, 16, 91) - .5), cr = ck < .035 ? 1 - ck / .035 : 0;
      return [h - cr * .5, (vn(x, y, 8, 7) - .5) * .8 + (vn(x, y, 32, 8) - .5) * .5 - cr * .9]; },
    // soil: fine grain and pebbles
    (x, y) => { const pb = smooth(.66, .8, vn(x, y, 32, 3)), g = vn(x, y, 64, 4) * .5 + vn(x, y, 128, 5) * .35 + vn(x, y, 16, 6) * .4;
      return [g + pb * .9, (vn(x, y, 16, 9) - .5) * .7 + pb * .35 + (vn(x, y, 128, 10) - .5) * .5]; },
    // grass: tussocks (clumps with dark gaps between), fine blades of speckle
    (x, y) => { const cl = smooth(.35, .7, vn(x, y, 32, 11) * .7 + vn(x, y, 64, 12) * .3), sp = vn(x, y, 128, 13);
      return [cl * 1.1 + sp * .25, (cl - .5) * 1.1 + (sp - .5) * .5 + (vn(x, y, 8, 14) - .5) * .4]; },
    // forest: round canopy crowns, deep shade between
    (x, y) => { const c1 = vn(x, y, 16, 15), c2 = vn(x, y, 32, 16), cr = smooth(.3, .75, c1 * .65 + c2 * .35);
      return [Math.sqrt(cr) * 1.3 + vn(x, y, 64, 17) * .2, (cr - .5) * 1.3 + (vn(x, y, 8, 18) - .5) * .3]; }];
  return mats.map(fn => { const Hh = new Float32Array(DT * DT), Al = new Float32Array(DT * DT);
    for (let y = 0; y < DT; y++) for (let x = 0; x < DT; x++) { const v = fn(x, y); Hh[y * DT + x] = v[0]; Al[y * DT + x] = v[1]; }
    let mx = 1e-6, ma = 1e-6, mean = 0; const gX = new Float32Array(DT * DT), gY = new Float32Array(DT * DT);
    for (let y = 0; y < DT; y++) for (let x = 0; x < DT; x++) { const i = y * DT + x; gX[i] = (Hh[y * DT + ((x + 1) & DM8)] - Hh[y * DT + ((x - 1) & DM8)]) * .5; gY[i] = (Hh[((y + 1) & DM8) * DT + x] - Hh[((y - 1) & DM8) * DT + x]) * .5; mean += Al[i]; }
    mean /= DT * DT; for (let i = 0; i < DT * DT; i++) { mx = Math.max(mx, Math.abs(gX[i]), Math.abs(gY[i])); ma = Math.max(ma, Math.abs(Al[i] - mean)); }
    const A = new Int8Array(DT * DT), X = new Int8Array(DT * DT), Y = new Int8Array(DT * DT);
    for (let i = 0; i < DT * DT; i++) { A[i] = Math.round((Al[i] - mean) / ma * 127); X[i] = Math.round(gX[i] / mx * 127); Y[i] = Math.round(gY[i] / mx * 127); }
    return { A, X, Y }; }); }
let DETAIL = null;
const lerp3 = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
export function createGround({ makeCanvas, opts = {}, now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) }) {
  const O = { ...GROUND_OPTS, ...opts, col: { ...GROUND_OPTS.col, ...((opts && opts.col) || {}) } }, tiles = new Map(), last = new Map(), jobs = []; let bytes = 0;
  const G = { O, tiles, jobs, st: { bakes: 0, bakeMs: 0, maxBakeMs: 0, draws: 0, vector: 0, conv: 0, blit1: 0, cut: 0, px: 0, tripBakes: 0, tripMs: 0 } };
  const lightOf = (st, cx, cy) => { let a; if (st && st.light && typeof st.light.x === 'number') a = Math.atan2(st.light.y - cy, st.light.x - cx);
    else if (st && Array.isArray(st.lightDir)) a = Math.atan2(-st.lightDir[1], st.lightDir[0]); else a = -2.25;
    const b = ((Math.round(a / (Math.PI * 2) * LB) % LB) + LB) % LB, an = b / LB * Math.PI * 2; let lx = Math.cos(an), ly = Math.sin(an); if (ly > -.15) { ly = -.15; const n = Math.hypot(lx, ly); lx /= n; ly /= n; } return { b, lx, ly }; };
  // ---- the bake: one tile = one chunk of one slice, column by column ---------------------------------------------------------
  // The land is a small height field H(x, u): u = 0 is the ridge (the data's silhouette, exactly), u = 1 the near foot of the slice.
  // Each column is ray-cast front to back (a voxel-space renderer), so the face below the ridge is real terrain: spurs running down
  // toward the viewer, gullies between them, rolling foothills, a river valley with water lying flat in it. Lit by its own normal
  // with cast shadows along the light; cover by altitude + steepness (+ the data's materials near the ridge).
  function tileJob(L, pts, lt, heal, key, haze, hazeRGB, sky, season, weather, LS, gapF) { if (!DETAIL) DETAIL = makeDetail(7); const n = pts.n | 0, dx = pts.dx, wpx = Math.max(1, Math.round((n - 1) * dx)), res = pts.res || 1;
    // the silhouette: lightly smoothed (rolling), and river valleys flooded to a flat water level (no slit)
    const { hs, wl, hb } = ridgeProfile(pts, n, dx, O.faceBlur);
    let top = Infinity, hMax = -9; for (let i = 0; i < n; i++) { const hh = Math.max(hs[i], wl[i] === wl[i] ? wl[i] : -9, pts.water && pts.water[i] === pts.water[i] ? pts.water[i] : -9), y = pts.y0 - hh * pts.amp; if (y < top) top = y; if (hs[i] > hMax) hMax = hs[i]; }
    // SEA MIST (v0.0.31, seaMist px; 0 = off): where the slice's own crest is under water (a back slice that is open sea) the tile
    // reaches seaMist px higher for a mist rising off the water over the land behind it (see the column loop)
    let rWet = false; if (O.seaMist > 0 && pts.water) for (let i = 0; i < n; i++) if (pts.water[i] > hs[i]) { rWet = true; break; }
    top = Math.floor(top - 3 - (rWet ? O.seaMist : 0)); const bot = Math.ceil(pts.yBot != null ? pts.yBot : pts.y0 + pts.amp * 1.2), W = Math.max(1, Math.round(wpx * res));
    // back slices (L.i > 0, v0.0.19): the land is baked to backDepth x amp below its lowest crest only (the terrain's depth / perspective
    // still runs to yBot; the rows below are hidden behind the nearer slices, drawn as the stretched last row where they show)
    let yLow = -Infinity; if ((L.i | 0) > 0 && pts.yBot != null) for (let i = 0; i < n; i++) { const y = pts.y0 - hs[i] * pts.amp; if (y > yLow) yLow = y; }
    const botC = (L.i | 0) > 0 && pts.yBot != null ? Math.min(bot, Math.ceil(yLow + O.backDepth * pts.amp)) : bot, H = Math.max(1, Math.round((botC - top) * res));
    const cv = makeCanvas(W, H), x = cv.getContext('2d'), id = x.createImageData(W, H), d = id.data, gd = x.createImageData(W, H), ga8 = gd.data;
    const N = createNoise(((pts.seed || 1) * 31 + L.i) >>> 0), C = O.col, muted = 1 - heal, gx0 = (pts.x0 || 0) + (pts.worldX || 0), amp = pts.amp;
    const at = (A, f) => { const i = Math.max(0, Math.min(n - 1.001, f)), i0 = Math.floor(i), t = i - i0; return A[i0] + (A[i0 + 1] - A[i0]) * t; };
    // the silhouette between samples: Catmull-Rom (C1), not linear (v0.0.21): with a straight segment every dx the face's slope, and so
    // its light, was constant per segment and jumped at each sample: vertical stripes dx apart down every slope
    const atC = (A, f) => { const i = Math.max(0, Math.min(n - 1.001, f)), i1 = Math.floor(i), t = i - i1, p1 = A[i1], p2 = A[i1 + 1], p0 = i1 > 0 ? A[i1 - 1] : 2 * p1 - p2, p3 = i1 + 2 < n ? A[i1 + 2] : 2 * p2 - p1;
      return p1 + .5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0))); };
    const chI = (a, s, f, k) => { if (!a) return 0; const i = Math.max(0, Math.min(n - 1.001, f)), i0 = Math.floor(i), t = i - i0; return a[i0 * s + k] + (a[(i0 + 1) * s + k] - a[i0 * s + k]) * t; };
    const win = Math.max(0, -season), sum = Math.max(0, season), storm = smooth(.6, .95, weather) * O.weatherK, dry = smooth(.25, .05, weather) * O.weatherK;
    const snowLine = typeof pts.snowLine === 'number' ? pts.snowLine : O.snowLine - win * O.seasonSnow + sum * O.seasonSnow * .9;   // Game Dev's snow line (h units, already seasonal) as-is; else ours moves with the season
    const vegC = season < 0 ? lerp3(C.veg, C.vegWinter, win, [0, 0, 0]) : lerp3(C.veg, C.vegSummer, sum, [0, 0, 0]);
    const lc = [1 + .07 * sum - .06 * win, 1 + .02 * sum - .01 * win, 1 - .08 * sum + .09 * win].map(v => v * (1 - .38 * storm) * (1 + .06 * dry));
    // world light: x right, y up, z toward the viewer
    const lw = [lt.lx, -lt.ly, .55], lN = Math.hypot(lw[0], lw[1], lw[2]); lw[0] /= lN; lw[1] /= lN; lw[2] /= lN;
    const SUN = LS.sun, AMB = LS.amb, DL = Math.max(1, O.dust[0] * .3 + O.dust[1] * .59 + O.dust[2] * .11), stC = [C.storm[0] * AMB[0], C.storm[1] * AMB[1], C.storm[2] * AMB[2]], air = storm > .02 ? lerp3(hazeRGB, stC, storm, [0, 0, 0]) : hazeRGB, fk = 1 / res;
    // (v0.0.21) DISTANCE, continuous across slices: a slice's ridge (u = 0) lies at its depth; its face comes toward you and meets the
    // next nearer slice's ridge one step closer (gapF: px from this slice's y0 to that slice's y0, read when the bake starts). Haze and
    // the water's sky reflection follow that distance, so neighbouring slices meet without a step (each slice was one flat haze + a
    // sawtooth before: the 'flat bands'). Haze grows with distance (d^hazePow: the near land keeps its colour).
    const li = L.i | 0, dep = typeof L.depth === 'number' ? L.depth : Math.min(1, li * .125), stepD = li > 0 && dep > 0 ? dep / li : 0, kH = dep > 0 ? haze / dep : .8;
    let gapPx = 0; const distOf = u => { if (!stepD) return dep; if (!gapPx) gapPx = Math.max(4, gapF ? gapF() : 40); return Math.max(0, dep - stepD * Math.min(1, u * ZS / gapPx)); };
    const hazeOf = dd => clamp01(O.hazeK * kH * Math.pow(dd, O.hazePow) + storm * .12 * (.3 + dd));
    // relief in PIXELS (v0.0.21): the face noise is in h units x amp (1000-1650 px on the home ground), so a 110 px wide spur stood
    // hundreds of px tall: pillars and spikes. Each term is capped to a height its own width can carry (slopes ~30-40 deg).
    const aSp = Math.min(O.spurAmp, O.spurPx / amp), aKn = Math.min(O.knollAmp, O.knollPx / amp), aHi = Math.min(O.hillAmp, O.hillPx / amp), aRo = Math.min(O.rockAmp, O.rockPx / amp);
    const ZS = Math.max(8, bot - pts.y0 + amp * .4 + 6),   // (v0.0.21) the same for every chunk of a slice (it followed each chunk's own hMax: u, and so the face's fall-off, jumped at chunk seams)
      NZ = Math.max(8, Math.ceil(ZS * res * 1.4)), du = 1 / (NZ - 1), dzW = du * ZS * O.depthK;
    const shDrop = lw[1] / Math.max(.08, Math.abs(lw[0])) / amp, dir = lt.lx > 0 ? -1 : 1;   // shadows fall away from the light: bake columns walking with the light
    const prevH = new Float32Array(NZ), shH = new Float32Array(NZ).fill(-9), Hc = new Float32Array(NZ);
    const bv = new Uint16Array(W * H), lu = new Uint8Array(W * H), ea8 = new Uint8Array(W * H), tmp = [0, 0, 0], cov = [0, 0, 0];
    const J = { cv, gc: null, W, H, top, res, gy0: pts.y0, gamp: pts.amp, gdx: dx, gyB: pts.yBot, col: 0, ms: 0, done: false, key, bv, lu, ea: ea8, b: W * H * 4 * 2 + W * H * 4 };
    // the river winds toward the viewer and widens with nearness: sample the data at f' = rc + (f - rc) / (1 + .9u) + meander(u)
    let rc = -1; if (pts.river) { let mv = .05; for (let i = 0; i < n; i++) if (pts.river[i] > mv) { mv = pts.river[i]; rc = i; } }
    const m0n = N.n3(0, 7.7, L.i), fOf = (f, u) => rc < 0 ? f : rc + (f - rc) / (1 + .9 * u) + (N.n3(u * 2.2, 7.7, L.i) - m0n) * O.meander / dx;
    const NnI = new Float32Array(NZ);
    const CS = 3, NC = Math.ceil((NZ - 1) / CS) + 3, Nn = new Float32Array(NC);
    // (v0.0.21) the noise runs down the face in PIXELS too (v = u x ZS, foreshortened: a feature is about as tall on screen as it is
    // wide, x O.relV): in u units a 110 px spur ran the whole 400-1000 px face, a vertical streak. Now: spurs, knolls and hummocks.
    const vK = O.relV;
    const noiseAt = (gx, u, rocky) => { const v = u * ZS * vK, xw = gx + O.warp * N.fbm(gx * .004, v * .004 + u * .8, 3 + L.i, 2);   // spurs meander down the face; knolls on them
      return aSp * (N.ridged(xw * O.spur, v * O.spur * 1.3 + u * .6, L.i * 5.3, 2) - .42) + aKn * N.n3(gx * .014, v * .014 * 1.4, 19 + L.i) + aHi * N.fbm(gx * O.hill, v * O.hill * 1.3 + u * .8, 11 + L.i, 2) * (.3 + u)
        + (rocky > .02 ? rocky * aRo * (N.ridged(xw * .032, v * .032 * 1.3, 29 + L.i, 2) - .4) : 0); };   // high ground: rock ribs and buttresses
    // (v0.0.22) the water level between samples: linear where both neighbours hold water (NaN = none), else the nearer one. It was read
    // at the ROUNDED sample: the channel cut and the water's edge stepped every dx, a row of teeth hanging under each valley crest
    const lin = (A, fc) => { if (!A) return NaN; const i0 = Math.min(n - 2, Math.floor(fc)), t = fc - i0, a = A[i0], b = A[i0 + 1]; return a === a && b === b ? a + (b - a) * t : t < .5 ? a : b; };
    // SHORE FADE (v0.0.31, shoreFade px; 0 = the old hard edge): the water's far edge (where it meets the land / the slice behind) and
    // its sides (where the data's water ends) reflect the dark shore and fade into the open water over shoreFade / shoreSide px. The
    // flat sea of a back slice met the hazed hill behind it in one hard bright line (seed 42 y~576), and a pool clipped at the screen
    // edge was a pale strip with a stepped side (seed 20261025 bottom right). wSide: samples to the nearest dry sample (chunk ends = open).
    let wSide = null; if (O.shoreFade > 0 && pts.water) { wSide = new Float32Array(n); for (let i = 0; i < n; i++) { if (pts.water[i] !== pts.water[i]) { wSide[i] = 0; continue; } let d = 99; for (let k = 1; k < 12 && k < d; k++) { if (i - k >= 0 && pts.water[i - k] !== pts.water[i - k]) d = k; if (i + k < n && pts.water[i + k] !== pts.water[i + k]) d = Math.min(d, k); } wSide[i] = d - .5; } }
    const shC = [(C.forest[0] + C.soil[0]) * .5, (C.forest[1] + C.soil[1]) * .5, (C.forest[2] + C.soil[2]) * .5], WT = new Float32Array(NZ);
    const heights = (gx, f, out, extra) => {   // H(x, u) for the whole column: the ridge falls toward the viewer, relief grows in below it
      // rocky: C1 along x (v0.0.22): linear, its kink at every sample stepped the rock ribs' light every dx
      const rocky = smooth(.35, .9, atC(hb, f)); for (let k = 0; k < NC; k++) Nn[k] = noiseAt(gx, Math.min(1, k * CS * du), rocky);
      const s0 = atC(hs, f), sb = atC(hb, f);
      for (let iz = 0; iz < NZ; iz++) { const u = iz * du, kf = iz / CS, k0 = kf | 0, t = kf - k0, p0 = Nn[k0 > 0 ? k0 - 1 : 0], p1 = Nn[k0], p2 = Nn[k0 + 1], p3 = Nn[Math.min(NC - 1, k0 + 2)], nn = p1 + .5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0))), s = s0 + (sb - s0) * smooth(0, .06, u);
        const env = 1 - (.45 * Math.min(1, u / .85) + .55 * smooth(0, .85, u)) * .86, wU = smooth(0, .2, u) * (1 - .4 * u), A = .35 + Math.min(1.4, Math.max(0, s + .35));
        let h = s * env + wU * nn * A; const cap = s + u * ZS / amp * .85; if (h > cap) h = cap;
        let wlev = NaN, rv = 0; if (rc >= 0 || pts.water) { const fz = fOf(f, u), fc = Math.max(0, Math.min(n - 1, fz)), wat = lin(pts.water, fc), w0 = lin(wl, fc);
          wlev = wat === wat ? wat : w0; rv = wat === wat ? 1 : pts.river && w0 === w0 ? smooth(.05, .45, at(pts.river, fz)) : 0;
          if (rv > 0) { const ch = wlev - .025 - .02 * u; if (h > ch) h += (ch - h) * rv; } }
        out[iz] = h; if (extra) { extra.w[iz] = wlev; NnI[iz] = nn; } } };
    const Wl = new Float32Array(NZ);
    J.step = (budget) => { const t0 = now();
      while (J.col < W) { const px = dir > 0 ? J.col : W - 1 - J.col, first = J.col === 0; J.col++;
        const f = px * fk / dx, gx = gx0 + px * fk, s = atC(hs, f);
        const rock = chI(pts.m0, 4, f, 0), soil = chI(pts.m0, 4, f, 1), veg = chI(pts.m0, 4, f, 2), sand = chI(pts.m0, 4, f, 3), ice = chI(pts.m1, 4, f, 1), hollow = chI(pts.m1, 4, f, 2), crack = chI(pts.m1, 4, f, 3), wetM = chI(pts.m1, 4, f, 0);
        const has0 = !!pts.m0;
        heights(gx, f, Hc, { w: Wl });
        if (first) heights(gx - dir * fk, f - dir * fk / dx, prevH, null);
        if (O.shoreFade > 0) { let run = false, wt = 0, wv = NaN; for (let iz = 0; iz < NZ; iz++) { const wv2 = Wl[iz], w = wv2 === wv2 && Hc[iz] < wv2;   // each water run's top row (tile px): the far shore
            if (w && !(run && Math.abs(wv2 - wv) * amp < 1.5)) wt = iz === 0 ? -1e9 : (pts.y0 + iz * du * ZS - wv2 * amp - top) * res; run = w; wv = wv2; WT[iz] = w ? wt : 0; } }   // a run from the crest (open sea): the slice behind may be sea too: no shore there, the mist instead
        let mW = false, mr = 0, mg = 0, mb = 0, mbv = 0; let ymin = H, topU = -1, pr = -1, pgc = 0, pb = 0, lastIz = -9, lastSv = 0, qr = 0, qg = 0, qb = 0, qgl = 0;
        for (let iz = NZ - 1; iz >= 0; iz--) { const u = iz * du, h = Hc[iz], wlev = Wl[iz], sh = Math.max(shH[iz] - shDrop * fk, h); shH[iz] = sh;
          const isW = wlev === wlev && h < wlev, hv = isW ? wlev : h, ysF = (pts.y0 + u * ZS - hv * amp - top) * res; if (ysF >= ymin) { prevH[iz] = h; continue; }
          const y1 = ymin, ys = Math.max(0, Math.ceil(ysF)); if (ys >= y1) { prevH[iz] = h; if (lastIz === iz + 1) lastIz = iz; continue; }   // seen, under a px: the surface runs on
          let r, g, b, glow = 0, dR = 0, dD = 0, dV = 0, dF = 0, lit = 0, kSh = 0;
          if (isW) { // WATER lying flat in its valley: the sky in it (more at a grazing angle = further back), a cold deep colour, ripples, a glint
            const dd = distOf(u), refl = Math.min(.92, .22 + .5 * dd + .25 * (1 - u) * (1 - dd)), rp = 1 + .12 * N.n3(gx * .04, u * 80, 41), gl = Math.pow(Math.max(0, -lt.ly), 2) * smooth(.55, 1, N.n3(gx * .03, u * 60, 43) * .5 + .5) * (1 - .7 * storm);
            const wa = (AMB[0] + AMB[1] + AMB[2]) / 3, gk = (SUN[0] + SUN[1] + SUN[2]) / 3;   // deep water lit by the sky's light; the glint by the sun / moon
            r = (C.water[0] * wa + (sky[0] - C.water[0] * wa) * refl) * rp + 150 * gl * gk * SUN[0]; g = (C.water[1] * wa + (sky[1] - C.water[1] * wa) * refl) * rp + 145 * gl * gk * SUN[1]; b = (C.water[2] * wa + (sky[2] - C.water[2] * wa) * refl) * rp + 130 * gl * gk * SUN[2];
            if (wlev - h < .012) { r = r * .7 + C.sand[0] * AMB[0] * .3; g = g * .7 + C.sand[1] * AMB[1] * .3; b = b * .7 + C.sand[2] * AMB[2] * .3; }   // the shallows
            if (O.shoreFade > 0) { const dT = (ysF - WT[iz]) / res, dS = wSide ? Math.max(0, lin(wSide, Math.max(0, Math.min(n - 1, fOf(f, u))))) * dx : 1e9;
              kSh = O.shoreK * Math.max(1 - smooth(0, O.shoreFade, dT), 1 - smooth(0, O.shoreSide, dS)); }
            r *= 1 - .3 * storm; g *= 1 - .25 * storm; b *= 1 - .2 * storm;
            if (win > .3) { const ic = smooth(.3, .9, win) * .7, ir = 150 + 60 * refl; r += (ir * AMB[0] - r) * ic; g += ((ir + 8) * AMB[1] - g) * ic; b += ((ir + 18) * AMB[2] - b) * ic; } }   // winter: the water ices over
          else { const hz2 = iz < NZ - 1 ? Hc[iz + 1] : h, hx = (h - prevH[iz]) * amp / fk * dir, hzv = (hz2 - h) * amp / dzW;
            let nx = -hx, ny = 1, nz = -hzv; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
            const steep = 1 - ny, diff = Math.max(0, nx * lw[0] + ny * lw[1] + nz * lw[2]), shade = smooth(.004, .03, sh - h);
            const tk = has0 ? Math.exp(-u * 8) : 0, alt = h, gul = smooth(-.08, .1, NnI[iz]);   // on a spur (1) / in a gully (0)
            const ao = 1 - O.ao * ((1 - gul) * .5 * smooth(0, .15, u) + hollow * tk * .5);
            const la = O.ambient * (.55 + .45 * ny) * ao, ls = O.slopeLight * diff * (1 - .72 * shade) * (.5 + .5 * smooth(.05, .5, nz)) * ao;   // crests seen edge-on stay quiet (no lit outline)
            // (v0.0.21) lit by the sky's light: sky fill (amb, hemispheric) + the sun / moon on the slope (sun), both from skyLight(day)
            const lr = la * AMB[0] + ls * SUN[0], lg = la * AMB[1] + ls * SUN[1], lb = la * AMB[2] + ls * SUN[2];
            // cover: rock on the steep and the high, grass / forest on the gentle low ground, sand at the water; the data's own mix near the ridge
            let wr = tk * rock + (1 - tk) * (.08 + .9 * smooth(.3, .62, steep) + .5 * smooth(.35, .85, alt)), wv = tk * veg + (1 - tk) * smooth(.8, .15, alt) * (1 - smooth(.25, .55, steep)),
              ws = tk * sand + (1 - tk) * (smooth(-.45, -.75, alt) * .7 + (wlev === wlev ? smooth(.05, .01, h - wlev) * .8 : 0)), wd = tk * soil + (1 - tk) * .14;
            const tot = wr + wv + ws + wd + 1e-6, fo = wv > .1 ? clamp01((.5 + .5 * N.n3(gx * .06, u * 9, 21 + L.i)) * 1.7 - .55) * smooth(.55, .1, alt) * (1 - win * .6) * (1 - steep) : 0;   // forest clumps
            lerp3(vegC, C.forest, fo, tmp);
            cov[0] = (C.rock[0] * wr + tmp[0] * wv + C.sand[0] * ws + C.soil[0] * wd) / tot; cov[1] = (C.rock[1] * wr + tmp[1] * wv + C.sand[1] * ws + C.soil[1] * wd) / tot; cov[2] = (C.rock[2] * wr + tmp[2] * wv + C.sand[2] * ws + C.soil[2] * wd) / tot;
            const rk = wr / tot * smooth(.35, .7, steep); if (rk > .05) { const sv = 1 + O.strataK * rk * Math.sin(h * 60 + gul * 4); cov[0] *= sv; cov[1] *= sv; cov[2] *= sv; }   // faint layering on cliffs only
            // snow: above the (seasonal) snow line, held in the gullies, off the cliffs; ice from the data; frost on cold flats in winter
            const dtl = N.n3(gx * .05, u * 14, 17 + L.i), sl = snowLine + .04 * dtl - .05 * (1 - gul);
            const snow = clamp01(Math.max(ice * tk, smooth(sl - .03, sl + .05, h) * (1 - .8 * smooth(O.snowSlope * .45, O.snowSlope * .85, steep)), win * win * .4 * (1 - smooth(.15, .35, steep)) * smooth(-.6, -.2, h)));
            const snw = snow * (1 - .55 * fo * (1 - steep)); lerp3(cov, C.snow, snw, tmp); r = tmp[0]; g = tmp[1]; b = tmp[2];
            { const tw = (1 - snw) / tot; dR = wr * tw; dV = wv * tw * (1 - fo); dF = wv * tw * fo; dD = (wd + ws) * tw + snw * .2; lit = ls / (la + ls + 1e-6); }   // the per-pixel detail's mix (v0.0.22)
            const grain = 1 + (.04 + .08 * wv / tot) * dtl + (wv / tot) * (.08 + .14 * fo) * (1 - snw) * N.n3(gx * .3, u * ZS * .3, 51 + L.i);   // + canopy / tussock texture
            r *= grain; g *= grain; b *= grain;   // (v0.0.21 fix: this multiply sat inside the comment above, so the cover had no texture)
            const sk = snow * .18 * ny; r *= lr * lc[0] * (1 + sk); g *= lg * lc[1] * (1 + sk); b *= lb * lc[2] * (1 + sk * 1.15);
            const wet = clamp01(Math.max(wetM * tk, storm * .9, wlev === wlev ? smooth(.08, 0, h - wlev) : 0));
            if (wet > .01) { const k = 1 - O.wetDark * wet * (1 - snow * .6); r *= k; g *= k; b *= k * 1.02; const sp2 = storm * Math.pow(diff, 8) * 80 * (1 - snow) * (1 - shade); r += sp2 * SUN[0]; g += sp2 * SUN[1]; b += sp2 * SUN[2] * 1.05; }
            if (dry > .01) { const k = dry * .25 * (1 - snow), l3 = (r * .3 + g * .59 + b * .11) / DL; r += (O.dust[0] * l3 - r) * k; g += (O.dust[1] * l3 - g) * k; b += (O.dust[2] * l3 - b) * k; }   // dust over the lit colour (keeps its shading)
            const mk = Math.max(crack * tk, smooth(.3, .85, muted) * O.crackK), svK = u * ZS * .55 - hv * amp,
              ckv = mk > .02 ? clamp01(mk * (1 - smooth(.2, 1, Math.abs(N.n3(gx * .07, svK * .07, 5)) * 18)) * smooth(.05, .35, N.n3(gx * .012, svK * .012, 6))) : 0;   // (4b) in SURFACE px, both ways: the veins were N(gx, u * 6), ~10x longer down the screen than across: vertical streaks
            if (ckv > .01) { r *= 1 - .7 * ckv; g *= 1 - .72 * ckv; b *= 1 - .75 * ckv; glow = ckv; }
            if (O.crestRim > 0) { const rp0 = u * ZS; if (rp0 < O.crestRimPx * 3) {   // #3 a soft LIT crest rim (no outline): the sky / sun light wrapping over the crest, a gaussian over ~crestRimPx CSS px, lit side and backlight
              const rk2 = O.crestRim * Math.exp(-((rp0 / O.crestRimPx) ** 2)) * (.35 + .65 * Math.max(diff, (1 - Math.abs(lw[1])) * .7)) * (1 - .6 * storm) * (1 - .7 * shade);
              r += (sky[0] * .55 + 120 * SUN[0] - r) * rk2; g += (sky[1] * .55 + 116 * SUN[1] - g) * rk2; b += (sky[2] * .55 + 108 * SUN[2] - b) * rk2; } } }
          if (muted > .01) { const k = O.dustK * muted * .9, l2 = r * .3 + g * .59 + b * .11, lD = l2 / DL, dh = O.dustHue;   // muted, still land: greyed toward the dust's hue AT this pixel's own brightness (light and shade kept; it used to pull every pixel toward one flat dust colour)
            r += (l2 * (1 - dh) + O.dust[0] * lD * dh - r) * k; g += (l2 * (1 - dh) + O.dust[1] * lD * dh - g) * k; b += (l2 * (1 - dh) + O.dust[2] * lD * dh - b) * k; }
          else { const l2 = r * .3 + g * .59 + b * .11, k = .3 * heal - .25 * storm; r += (r - l2) * k; g += (g - l2) * k; b += (b - l2) * k; }
          const dd0 = distOf(u), hz = hazeOf(dd0); if (hz > .005) { r += (air[0] - r) * hz; g += (air[1] - g) * hz; b += (air[2] - b) * hz; }
          if (kSh > .005) { const la = O.ambient * 1.25, hs2 = hz * .75, k = kSh;   // the shore, AFTER the haze: the water meets the land at the land's own (lighter-hazed) tone, not crushed into the haze
            r += (shC[0] * (la * AMB[0] + .22 * SUN[0]) * (1 - hs2) + air[0] * hs2 - r) * k; g += (shC[1] * (la * AMB[1] + .22 * SUN[1]) * (1 - hs2) + air[1] * hs2 - g) * k; b += (shC[2] * (la * AMB[2] + .22 * SUN[2]) * (1 - hs2) + air[2] * hs2 - b) * k; }
          if (iz === 0 && pr >= 0 && !isW) { r = r * .3 + pr * .7; g = g * .3 + pgc * .7; b = b * .3 + pb * .7; }   // the ridge row is seen edge-on: no bright outline
          pr = r; pgc = g; pb = b;
          const bvv = Math.max(0, Math.min(65535, (hv + 2) * O.tripBands * 256));
          // fill the newly visible rows; the top row of the silhouette gets a fractional (antialiased) cover.
          // (v0.0.22) Not one flat colour per depth step any more: where this step continues the surface of the step just below it
          // (contiguous: no hidden ground between), the colour is blended across the rows toward that step's colour (Gouraud down the
          // column), and every pixel gets the lit micro relief of its cover at its own surface point (see makeDetail).
          const yA = ys > 0 && iz === 0 ? ys - 1 : ys, contig = lastIz === iz + 1, span = y1 - ysF, svC = u * ZS * .55 - hv * amp, svP = contig ? lastSv : svC + span / res;
          const dk = isW ? 0 : O.detailK * (1 - hz) * (stepD ? Math.pow(1 - Math.min(1, dd0), 1.5) : 1), tsc = 2 / (li === 0 ? 1 + O.detailNear * u : .8);   // texels per CSS px: features grow toward the viewer
          const kA = O.detailAlb / 127 * dk, kB = O.detailBump * lit / 127 * dk, blx = -lt.lx * kB, bly = -lt.ly * kB, gxT = gx * tsc;
          const D0 = DETAIL[0], D1 = DETAIL[1], D2 = DETAIL[2], D3 = DETAIL[3], uR = dR > .04, uD = dD > .04, uV = dV > .04, uF = dF > .04, any = dk > .01 && (uR || uD || uV || uF);
          const tx0 = Math.floor(gxT), txR = tx0 & DM8, txD = (tx0 + 71) & DM8, txV = (tx0 + 143) & DM8, txF = (tx0 + 197) & DM8;
          for (let yy = yA; yy < y1; yy++) { const o = (yy * W + px) * 4, ii = yy * W + px, ea = yy < ys ? Math.round((ys - ysF) * 255) : 255;
            let R = r, G2 = g, B2 = b; const t = span > 0 ? Math.max(0, Math.min(1, (yy - ysF) / span)) : 0;
            if (contig) { R += (qr - r) * t; G2 += (qg - g) * t; B2 += (qb - b) * t; }
            if (any) { const ty = Math.floor((svC + (svP - svC) * t) * tsc) * DT; let m = 1;
              if (uR) { const i = (ty & (DM8 * DT)) + txR; m += dR * (D0.A[i] * kA + D0.X[i] * blx + D0.Y[i] * bly); }
              if (uD) { const i = ((ty + 59 * DT) & (DM8 * DT)) + txD; m += dD * (D1.A[i] * kA + D1.X[i] * blx + D1.Y[i] * bly); }
              if (uV) { const i = ((ty + 113 * DT) & (DM8 * DT)) + txV; m += dV * (D2.A[i] * kA + D2.X[i] * blx + D2.Y[i] * bly); }
              if (uF) { const i = ((ty + 167 * DT) & (DM8 * DT)) + txF; m += dF * (D3.A[i] * kA + D3.X[i] * blx + D3.Y[i] * bly); }
              R *= m; G2 *= m; B2 *= m; }
            d[o] = R; d[o + 1] = G2; d[o + 2] = B2; d[o + 3] = ea;
            // (4b) the glow is blended down the rows like the colour: one step's glow copied down a tall step's rows was an orange column
            const gw = contig ? glow + (qgl - glow) * t : glow; if (gw > .004) { ga8[o] = O.glow[0]; ga8[o + 1] = O.glow[1]; ga8[o + 2] = O.glow[2]; ga8[o + 3] = gw * 255; }
            bv[ii] = bvv; lu[ii] = Math.min(255, R * .3 + G2 * .59 + B2 * .11); ea8[ii] = ea; }
          if (rWet) { mW = isW; mr = r; mg = g; mb = b; mbv = bvv; }
          qr = r; qg = g; qb = b; qgl = glow; lastIz = iz; lastSv = svC;
          ymin = ys; topU = u; prevH[iz] = h; }
        // SEA MIST (seaMist): the column's top is the open sea at the slice's crest: a mist of the water's own (hazed) colour rises off
        // it over the land behind, fading up over seaMist px (the sea met the hill behind in one hard line: seed 42 y~576)
        if (mW && topU <= 2 * du && ymin > 0) { const dS = wSide ? Math.max(0, lin(wSide, Math.max(0, Math.min(n - 1, fOf(f, 0))))) * dx : 1e9, sk = O.seaMistA * smooth(0, O.shoreSide * 2, dS), L2 = Math.max(1, O.seaMist * res);
          if (sk > .01) for (let yy = ymin - 1, k = 1; yy >= 0 && k <= L2; yy--, k++) { const o = (yy * W + px) * 4, ii = yy * W + px; if (d[o + 3] > 250) break; const a = sk * (1 - smooth(0, 1, k / (L2 + 1))), a0 = d[o + 3] / 255, ao = a + a0 * (1 - a);
            d[o] = (mr * a + d[o] * a0 * (1 - a)) / ao; d[o + 1] = (mg * a + d[o + 1] * a0 * (1 - a)) / ao; d[o + 2] = (mb * a + d[o + 2] * a0 * (1 - a)) / ao; d[o + 3] = ao * 255; bv[ii] = mbv; lu[ii] = Math.min(255, d[o] * .3 + d[o + 1] * .59 + d[o + 2] * .11); ea8[ii] = ao * 255; } }
        if (now() - t0 > budget) break; }
      J.ms += now() - t0; if (J.col >= W) { x.putImageData(id, 0, 0);
        { let r = 0, g = 0, b2 = 0, a = 0; const o = (H - 1) * W * 4; for (let i = 0; i < W; i++) { const k = o + i * 4, w = d[k + 3]; r += d[k] * w; g += d[k + 1] * w; b2 += d[k + 2] * w; a += w; }   // the foot colour (mean of the last row): fills below a short back tile
          J.foot = a > 0 ? `rgb(${Math.round(r / a)},${Math.round(g / a)},${Math.round(b2 / a)})` : null; }
        // the crack glow is sparse: keep only its bounding box, so the 'lighter' pass on big events blits a strip, not the whole tile
        let x0 = W, x1 = -1, y0 = H, y1 = -1; for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (ga8[(yy * W + xx) * 4 + 3] > 2) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
        if (x1 < 0) J.gc = null; else { const gw = x1 - x0 + 1, gh = y1 - y0 + 1; J.gc = makeCanvas(gw, gh); J.gc.getContext('2d').putImageData(gd, -x0, -y0, x0, y0, gw, gh); J.gx = x0; J.gy = y0; J.b = W * H * 4 * 2 + gw * gh * 4; }
        J.done = true; }
      return J.done; };
    return J; }
  // (v0.0.19) a tile still SHOWN for its slot (the stand-in while its rebake runs) is not evicted: evicting it made the slot draw vector
  const shown = J => { for (const v of last.values()) if (v === J) return true; return false; };
  const keep = (k, J) => { tiles.set(k, J); bytes += J.b; for (const [kk, vv] of tiles) { if (bytes <= O.capBytes || tiles.size <= 4) break; if (!vv.done || vv === J || shown(vv) || LT.want.has(kk)) continue; tiles.delete(kk); bytes -= vv.b; for (const [s2, l2] of last) if (l2 === vv) last.delete(s2); } };
  G.tick = () => {};
  // the tile (or its trip tint) + the crack glow at level k, composed into one canvas (idle; rasterised here, not on its first blit)
  const glowJob = (J, bk, k, gb) => ({ glowJ: true, key: `glow:${J.key}:${bk}:${gb}`, step: () => { J.gjob = null; const base = bk === 'c' ? J.cv : J.tc; if (!base || (bk !== 'c' && J.tk !== bk)) return;
    if (!J.gcv) { J.gcv = makeCanvas(J.W, J.H); J.b += J.W * J.H * 4; bytes += J.W * J.H * 4; }
    const x = J.gcv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'copy'; x.globalAlpha = 1; x.drawImage(base, 0, 0);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(1, k); x.drawImage(J.gc, J.gx, J.gy); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if (x.getImageData) try { x.getImageData(0, 0, 1, 1); } catch (e) { } J.gbk = bk; J.gb = gb; } });
  // jobs: tile bakes and trip tints (tints go first); runs whole steps until the slice budget is spent
  G.pump = (q = 0, budget = O.bakeMs[q]) => { const t0 = now();
    while (jobs.length && now() - t0 < budget) { const J = jobs[0], left = Math.max(.05, budget - (now() - t0));
      if (J.glowJ) { J.step(); jobs.shift(); G.st.glowBakes = (G.st.glowBakes | 0) + 1; continue; }
      if (J.tint) { if (J.step(left, now)) { jobs.shift(); G.st.tripBakes++; G.st.tripMs += J.ms; J.of.tint = null; } continue; }
      if (J.step(left)) { jobs.shift(); G.st.bakes++; G.st.bakeMs += J.ms; G.st.maxBakeMs = Math.max(G.st.maxBakeMs, J.ms); if (!J.pre && !last.has(J.slot)) last.set(J.slot, J); } }   // a slot with a tile already swaps in draw (all slots together: SW)
    return now() - t0; };
  G.flush = () => { while (jobs.length) G.pump(0, 1e9); };
  // per-frame COVER (v0.0.19): per slice and per screen-x bin (O.coverBin CSS px), the lowest crest y (CSS px) of that slice in the bin:
  // this frame's (N) and last frame's (L); G.frame() swaps them when any ground drew. NB bins from x = -2 bins.
  const NS = 12, NB = 96, TOPB = new Float64Array(96), covN = new Float64Array(NS * NB).fill(-1e9), covL = new Float64Array(NS * NB).fill(-1e9), aN = new Float64Array(NS).fill(-1e9), aL = new Float64Array(NS).fill(-1e9), y0N = new Float64Array(NS).fill(-1e9), y0L = new Float64Array(NS).fill(-1e9), KM = new WeakMap(), DM = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, CUT = new Float64Array(NB);
  let drewN = false, GMOT = 0; const binOf = x => Math.max(0, Math.min(NB - 1, Math.floor(x / O.coverBin) + 2));
  // SET SWAP (fix 1:18 AM Oct 26, parent's sweep): new tiles for slots that already show one (after a dive, a zoom step, a quality
  // change) swap in all on the same frame once none is still baking (or after O.setSwapMs), like the light buckets: no chunk-by-chunk
  const SW = { pend: 0, ok: true, t0: 0 };
  G.frame = () => { if (SW.pend === 0) { SW.t0 = now(); SW.ok = true; } else SW.ok = now() - SW.t0 > (O.setSwapMs || 900); SW.pend = 0; if (LT.tb !== null && LT.seen > 0 && (LT.miss === 0 || now() - LT.t0 > O.lightSwapMs)) { LT.cb = LT.tb; LT.tb = null; LT.want.clear(); }
    LT.miss = 0; LT.seen = 0; if (!drewN) return; drewN = false;
    // the land's motion last frame (y0 + amp, any slice): a zoom / dive moves the NEARER slices too, so the back slices' cut is padded by it
    GMOT = 0; for (let k = 0; k < NS; k++) if (y0N[k] > -1e8 && y0L[k] > -1e8) GMOT = Math.max(GMOT, Math.abs(y0N[k] - y0L[k]) + Math.abs(aN[k] - aL[k]));
    covL.set(covN); y0L.set(y0N); aL.set(aN); aN.fill(-1e9); covN.fill(-1e9); y0N.fill(-1e9); };
  const dropStale = (slot, key) => { for (let i = jobs.length - 1; i >= 0; i--) { const j = jobs[i]; if (j.tint || j.pre || j.slot !== slot || j.key === key || j.col > 0) continue;
      jobs.splice(i, 1); if (tiles.get(j.key) === j) { tiles.delete(j.key); bytes -= j.b; } } };
  const jobsHas = k => { for (let i = 0; i < jobs.length; i++) if (jobs[i].key === k) return true; return false; };
  // columns xa..xb (CSS) and the top hC CSS px of a tile (1:1 device px when it matches, like blit)
  // PERF: a part of a 1:1 tile is drawn as the WHOLE image under a device-px-snapped clip rect: in Chromium/Skia a drawImage with a
  // source sub-rect leaves the fast 1:1 blit path (measured: half the rows by sub-rect cost as much as the whole tile; by clip, 40%)
  const blitPart = (c, img, x, y, w, h, xa, xb, ya, yb, m) => { if (xb <= xa || yb <= ya) return 0;
    if (xa <= x && xb >= x + w && ya <= y && yb >= y + h) { G.st.px += img.width * img.height; return blit(c, img, x, y, w, h, m); }
    if (m && Math.abs(img.width - w * m.a) <= 1.01 && Math.abs(img.height - h * m.d) <= 1.01) { const dx = Math.round(m.a * x + m.e), dy = Math.round(m.d * y + m.f),
        X0 = Math.max(dx, Math.round(m.a * xa + m.e)), X1 = Math.min(dx + img.width, Math.round(m.a * xb + m.e)), Y0 = Math.max(dy, Math.round(m.d * ya + m.f)), Y1 = Math.min(dy + img.height, Math.round(m.d * yb + m.f));
      if (X1 <= X0 || Y1 <= Y0) return 0; G.st.px += (X1 - X0) * (Y1 - Y0);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(X0, Y0, X1 - X0, Y1 - Y0); c.clip(); c.drawImage(img, dx, dy); c.restore(); return 1; }
    const kx = img.width / w, ky = img.height / h, sx = Math.max(0, Math.floor((xa - x) * kx)), sx1 = Math.min(img.width, Math.ceil((xb - x) * kx)), sw = sx1 - sx,
      sy = Math.max(0, Math.floor((ya - y) * ky)), sy1 = Math.max(sy + 1, Math.min(img.height, Math.ceil((yb - y) * ky))), sh = sy1 - sy;
    if (sw <= 0 || sh <= 0) return 0; G.st.px += sw * sh;
    c.drawImage(img, sx, sy, sw, sh, x + sx / kx, y + sy / ky, sw / kx, sh / ky); return 0; };
  // a flat fill snapped to device px (adjacent parts meet without an antialiased seam)
  const fillSnap = (c, x0, y0, x1, y1, m) => { if (!m) { c.fillRect(x0, y0, x1 - x0, y1 - y0); return; } const X0 = Math.round(m.a * x0 + m.e), X1 = Math.round(m.a * x1 + m.e), Y0 = Math.round(m.d * y0 + m.f), Y1 = Math.round(m.d * y1 + m.f);
    if (X1 <= X0 || Y1 <= Y0) return; c.setTransform(1, 0, 0, 1, 0, 0); c.fillRect(X0, Y0, X1 - X0, Y1 - Y0); c.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); };
  // LIGHT OF THE DAY (v0.0.21): ctx.day (world.env.day 0..1; none = full day) -> skyLight (sky.js): the sun / moon and sky-fill colours
  // and the air colour the far land fades into, baked into the tiles by a light bucket (O.lightBuckets over day .02-.62; full day
  // above, night below). A bucket change does not pop tile by tile: the new bucket's tiles bake in idle while the old ones keep
  // drawing, and ALL slots switch on the same frame once every visible one is ready (or after O.lightSwapMs).
  const LT = { cb: null, tb: null, t0: 0, miss: 0, seen: 0, want: new Set(), cache: new Map() };
  const lightB = day => typeof day === 'number' ? Math.round(clamp01((day - .02) / .6) * O.lightBuckets) : -1;
  const lightS = b => { let v = LT.cache.get(b); if (!v) { v = skyLight(b < 0 ? 1 : .02 + b / O.lightBuckets * .6); LT.cache.set(b, v); } return v; };
  G.light = () => ({ committed: LT.cb, target: LT.tb, want: LT.want.size });
  // ctx = { q, heal, trip, tripCols, palKey, takeover, glow (crack glow envelope, big events only), sky [r,g,b], season -1..1, weather 0..1, day 0..1 }
  G.draw = (c, L, pts, st, ctx = {}) => { if (!pts || !L) return false; G.st.draws++; const q = ctx.q | 0, haze = L.haze != null ? L.haze : Math.min(1, (L.i | 0) * .22);
    const db = lightB(ctx.day); if (LT.cb === null) LT.cb = db; if (db !== LT.cb) { if (LT.tb !== db) { LT.tb = db; LT.t0 = now(); LT.want.clear(); } } else if (LT.tb !== null) { LT.tb = null; LT.want.clear(); }
    const LS = lightS(LT.cb), hazeRGB = L.hazeRGB || (ctx.day != null ? LS.hor : ctx.hazeRGB || O.haze);
    if (Array.isArray(pts) && pts.length && pts[0] && typeof pts[0].h === 'number') pts = fromSamples(pts, L, st);   // mode C: plan §16.4 sample objects
    if (Array.isArray(pts)) return vector(c, L, pts, st, ctx, haze, hazeRGB);
    if (!pts.h || !(pts.n > 1) || !(pts.dx > 0)) return false;
    const lt = lightOf(st, st && st.W ? st.W / 2 : 0, pts.y0), hb = Math.round(clamp01(ctx.heal != null ? ctx.heal : 1) * 4), heal = hb / 4, tripOn = ctx.trip > .03 && ctx.tripCols;
    const sb = ctx.season != null ? Math.round(Math.max(-1, Math.min(1, ctx.season)) * 2) : 0, wt = ctx.weather != null ? ctx.weather : .5, wb = wt > .8 ? 4 : wt > .6 ? 3 : wt < .1 ? 0 : wt < .25 ? 1 : 2;
    const slR = typeof pts.snowLine === 'number' ? pts.snowLine : st && typeof st.snowLine === 'number' ? st.snowLine : null, slB = slR == null ? null : Math.round(slR * O.snowBuckets) / O.snowBuckets;   // p.snowLine / st.snowLine (h units), bucketed: a moving line rebakes in idle only per bucket
    const m = m2d(devOf(c), DM), res = O.res[q] * (m ? m.a : 1), hz20 = Math.round(haze * 20), r64 = Math.round(res * 64);
    // PERF (v0.0.19): the slot / tile key strings are built only when one of their parts changes (memo on the chunk object Game Dev reuses)
    let K = KM.get(pts); if (!K) { K = { li: NaN, ch: NaN, ver: NaN, q: NaN, lb: NaN, hb: NaN, hz: NaN, sb: NaN, wb: NaN, sl: NaN, r: NaN, db: NaN, slot: '', base: '', key: '' }; KM.set(pts, K); }
    if (K.li !== L.i || K.ch !== pts.chunk || K.ver !== (pts.ver | 0) || K.q !== q || K.lb !== lt.b || K.hb !== hb || K.hz !== hz20 || K.sb !== sb || K.wb !== wb || !(K.sl === slB || (K.sl !== K.sl && slB == null)) || K.r !== r64 || K.db !== LT.cb) {
      K.li = L.i; K.ch = pts.chunk; K.ver = pts.ver | 0; K.q = q; K.lb = lt.b; K.hb = hb; K.hz = hz20; K.sb = sb; K.wb = wb; K.sl = slB == null ? NaN : slB; K.r = r64; K.db = LT.cb;
      K.slot = `${L.i}:${pts.chunk}`; K.base = `${K.slot}:${pts.ver | 0}:${q}:${lt.b}:${hb}:${hz20}:${sb}:${wb}:${slB}:${r64}`; K.key = `${K.base}:${LT.cb}`; }
    const slot = K.slot, key = K.key, li0 = L.i | 0;
    // the y0 gap to the next nearer slice (distance haze), read when a bake starts: this frame's, else last frame's, else a guess
    const gapF = () => { const a = li0 > 0 && li0 - 1 < NS ? (y0N[li0 - 1] > -1e8 ? y0N[li0 - 1] : y0L[li0 - 1]) : -1e9; return a > -1e8 ? a - pts.y0 : Math.max(6, ((pts.yBot != null ? pts.yBot : pts.y0 + 200) - pts.y0) * .9 / Math.max(1, li0)); };
    const mk = (k, ls, hz) => { const T = tileJob(L, { ...pts, res, snowLine: slB == null ? undefined : slB }, lt, heal, k, haze, hz, ctx.sky || ls.sky, sb / 2, [.05, .18, .45, .7, .9][wb], ls, gapF); T.slot = slot; return T; };
    let J = tiles.get(key);
    // (v0.0.21) a slot with NOTHING to show (new chunk / slice) queues even when the queue is full, ahead of every rebake (nearer slices
    // first); a queued rebake of this slot that has not started and is now stale (the key moved on: day / season / heal bucket) is
    // dropped. Before, on a fast day cycle every slot rebaked per bucket, the queue sat at maxJobs and new chunks drew as the vector
    // stand-in for seconds (flat slabs).
    if (!J) { const none = !last.get(slot); if ((jobs.length < O.maxJobs || none) && !jobsHas(key)) { J = mk(key, LS, hazeRGB); J.li = li0; dropStale(slot, key); keep(key, J);
      if (none) { J.none = true; let i = 0; while (i < jobs.length && (jobs[i].tint || (jobs[i].none && (jobs[i].li | 0) <= li0) || jobs[i].col > 0)) i++; jobs.splice(i, 0, J); } else jobs.push(J); } J = tiles.get(key); }
    if (LT.tb !== null) { const tk = `${K.base}:${LT.tb}`; let T = tiles.get(tk); LT.seen++; LT.want.add(tk);   // the next light bucket, baked ahead (switched all at once in G.frame)
      if (!T && jobs.length < O.maxJobs && !jobsHas(tk)) { const l2 = lightS(LT.tb); T = mk(tk, l2, L.hazeRGB || l2.hor); T.pre = true; keep(tk, T); jobs.push(T); }
      if (!(T && T.done)) LT.miss++; }
    // (fix v0.0.19, above: a tile is made only when it can queue; before, one made with the queue full sat undone in the cache: vector for ever)
    const L0 = last.get(slot), fresh = J && J.done; if (L0 && L0 !== J && !fresh) SW.pend++;
    const show = fresh && (!L0 || L0 === J || SW.ok || O.setSwap === false) ? J : (L0 || null); if (show && show === J && L0 !== J) last.set(slot, J);
    if (!show) { G.st.vector++; const P = []; for (let i = 0; i < pts.n; i += 2) P.push({ x: pts.x0 + i * pts.dx, y: pts.y0 - pts.h[i] * pts.amp }); return vector(c, L, P, st, ctx, haze, hazeRGB, pts.yBot); }
    // a stale tile (baked for an older zoom: y0 / amp / dx) is drawn mapped onto this frame's geometry, never left at its old place (no gap)
    const kx = show.gdx > 0 ? pts.dx / show.gdx : 1, ka = show.gamp > 0 && pts.amp > 0 ? pts.amp / show.gamp : 1, sTop = show.gy0 != null ? pts.y0 + (show.top - show.gy0) * ka : show.top;
    const ga = c.globalAlpha, x0 = pts.x0, rs = show.res || res, sw = show.W / rs * kx;
    // the nearest slice runs to the screen bottom: its stale tile is stretched so its foot still lands on this frame's yBot (zoom out)
    let sh = show.H / rs * ka; if ((L.i | 0) === 0 && ka !== 1 && pts.yBot != null && show.gyB != null) { const ob = show.top + show.H / rs, nb = pts.yBot + (ob - show.gyB) * ka; if (nb > sTop + 1) sh = nb - sTop; }
    // trippy: the palette look mixed into the real tile at the takeover (bucketed), baked in idle: still ONE blit per frame
    const TB = O.tripBuckets || 12, ab = tripOn ? Math.round(Math.min(1, ctx.trip) * (ctx.takeover != null ? ctx.takeover : O.takeover) * TB) / TB : 0, wk = `${ctx.palKey}:${ab}`;
    if (ab > 0 && show.tk !== wk && !show.tint) { show.tint = tintJob(show, ctx.tripCols, ctx.palKey, O, makeCanvas, ab); show.tint.tint = true; show.tint.of = show; jobs.unshift(show.tint); }
    let img = ab > 0 && show.tc && show.tk != null ? show.tc : show.cv; const li = L.i | 0, tb = sTop + sh, yB = pts.yBot;
    // CRACK GLOW (v0.0.22): the glow on big events is baked INTO a copy of the tile per glow bucket in idle (glowBake), so a frame is
    // still ONE blit. It was a second, 'lighter' blit of the glow canvas, whose bounding box is the whole tile once muted land has its
    // crack veins (618x447 of 618x464 at q0: 0.55 ms a frame in Chromium, the most expensive single draw of a trip frame). Until the
    // bucket's copy lands a copy at most glowLag buckets off is used (the envelope is smooth), else the old two-blit path.
    let gDone = false; const gl = ctx.glow || 0;
    if (gl > .02 && show.gc && O.glowBake) { const GB = O.glowBuckets, gb = Math.max(1, Math.round(Math.min(1, gl) * GB)), bk = img === show.cv ? 'c' : show.tk;
      if ((show.gbk !== bk || show.gb !== gb) && !show.gjob) { show.gjob = glowJob(show, bk, gb / GB, gb); jobs.unshift(show.gjob); }
      if (show.gcv && show.gbk === bk && Math.abs(show.gb - gb) <= O.glowLag) { img = show.gcv; gDone = true; } }
    // COVER CUT (v0.0.19, back slices): per screen-x bin, a back slice is drawn only down to where last frame's nearer slices covered it
    // (their lowest crest in that bin + pad + the slice's own motion); the hidden rows are not filled at all (each back tile was a
    // full-height blit to the screen bottom). Neighbouring bins with a similar cut share one draw (the deeper cut).
    const bot = yB != null && li > 0 ? yB : tb;
    if (li === 0 || !O.coverCut) { G.st.blit1 += blit(c, img, x0, sTop, sw, sh, m); G.st.px += img.width * img.height; if (bot > tb + .5 && show.foot) { c.fillStyle = show.foot; fillSnap(c, x0, tb - .5, x0 + sw, bot, m); } }
    else { const pad = O.coverPad + Math.abs(pts.y0 - (y0L[li] > -1e8 ? y0L[li] : pts.y0)) * 2 + GMOT * (O.coverMotK != null ? O.coverMotK : 3), b0 = binOf(x0), b1 = binOf(x0 + sw - 1e-6);
      for (let b = b0; b <= b1; b++) { let cu = Infinity; for (let k = 0; k < li && k < NS; k++) { const v = covL[k * NB + b]; if (v > -1e8 && v < cu) cu = v; } CUT[b] = Math.min(bot, cu + pad); }
      // and per bin from the top: the slice's own highest crest there (- coverTop px): the clear sky above the land is not blended either.
      // Bins whose cut / top differ by < coverMerge share one draw. MEASURED (headless Chromium, bench 'back'): every extra clipped or
      // sub-rect drawImage costs more than the pixels it saves, so the defaults (1e9) give ONE clipped draw per chunk: back q0 2.4 ms
      // vs 2.75 (24 px bins merged at 14 px) vs 2.94 (sub-rect parts); the knobs stay for a GPU canvas where pixels cost more than calls.
      for (let b = b0; b <= b1; b++) TOPB[b] = Infinity;
      for (let i = 0; i < pts.n; i++) { const b = binOf(pts.x0 + i * pts.dx), y = pts.y0 - pts.h[i] * pts.amp; if (b >= b0 && b <= b1 && y < TOPB[b]) TOPB[b] = y; }
      for (let b = b0; b <= b1; b++) TOPB[b] = TOPB[b] === Infinity ? sTop : Math.max(sTop, TOPB[b] - O.coverTop);
      let any = false; for (let b = b0; b <= b1;) { let e = CUT[b], t0 = TOPB[b], b2 = b + 1; while (b2 <= b1 && Math.abs(CUT[b2] - CUT[b]) < O.coverMerge && Math.abs(TOPB[b2] - TOPB[b]) < O.coverMerge) { if (CUT[b2] > e) e = CUT[b2]; if (TOPB[b2] < t0) t0 = TOPB[b2]; b2++; }
        const xa = Math.max(x0, (b - 2) * O.coverBin), xb = Math.min(x0 + sw, (b2 - 2) * O.coverBin); b = b2; if (xb <= xa) continue;
        const ye = Math.min(tb, e); if (ye > t0) G.st.blit1 += blitPart(c, img, x0, sTop, sw, sh, xa, xb, t0, ye, m);
        if (e > tb + .5) { any = true; if (show.foot) { c.fillStyle = show.foot; fillSnap(c, xa, tb - .5, xb, e, m); } } else if (e < tb) any = true; }   // below a short back tile: its foot colour (a flat fill: the cheapest fill)
      if (any) G.st.cut++; }
    if (li < NS && c.globalAlpha > .99 && c.globalCompositeOperation === 'source-over') { const h = pts.h, a = pts.amp, y0 = pts.y0, o = li * NB; drewN = true; y0N[li] = y0; aN[li] = a;
      for (let i = 0; i + 1 < pts.n; i++) { const xa = pts.x0 + i * pts.dx, ya = y0 - h[i] * a, yb = y0 - h[i + 1] * a, y = ya > yb ? ya : yb, ba = binOf(xa), bb = binOf(xa + pts.dx); for (let b = ba; b <= bb; b++) if (y > covN[o + b]) covN[o + b] = y; } }
    if (!gDone && (ctx.glow || 0) > .02 && show.gc) { const gco = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = ga * Math.min(1, ctx.glow); blit(c, show.gc, x0 + show.gx / rs * kx, sTop + show.gy / rs * ka, show.gc.width / rs * kx, show.gc.height / rs * ka, m); c.globalCompositeOperation = gco; c.globalAlpha = ga; }
    return true; };
  // mode B (and the first frames of mode A): a vector strip that still reads as land: gradient body, slope-lit top faces, snow caps by
  // altitude + slope, haze. No per-pixel work, nothing cached.
  function vector(c, L, P, st, ctx, haze, hazeRGB, yBot) { if (!P.length || !(P.length > 1)) return false; const C = O.col, H = yBot != null ? yBot : (st && st.H) || 915, lt = lightOf(st, (st && st.W || 412) / 2, P[0].y);
    let top = Infinity; for (const p of P) if (p.y < top) top = p.y; const mixH = (col, k = haze * O.hazeK) => col.map((v, i) => Math.round(v + (hazeRGB[i] - v) * k));
    const heal = ctx.heal != null ? ctx.heal : 1, dm = c => { const m = 1 - heal; if (m < .01) return c; const l = c[0] * .3 + c[1] * .59 + c[2] * .11; return c.map((v, i) => v + (l * .5 + O.dust[i] * .5 - v) * m * O.dustK); };
    const a = mixH(dm(C.veg)), b = mixH(dm(C.soil)), d2 = mixH(dm(C.rock.map(v => v * .7)), haze * O.hazeK * .8), g = c.createLinearGradient(0, top, 0, H); g.addColorStop(0, `rgb(${a})`); g.addColorStop(.08, `rgb(${b})`); g.addColorStop(1, `rgb(${d2.map(v => v * .6 | 0)})`);
    c.beginPath(); c.moveTo(P[0].x, H); for (const p of P) c.lineTo(p.x, p.y); c.lineTo(P[P.length - 1].x, H); c.closePath(); c.fillStyle = g; c.fill();
    const ga = c.globalAlpha; c.lineWidth = 2.2; c.lineCap = 'round';
    for (let i = 1; i < P.length; i++) { const p0 = P[i - 1], p1 = P[i], tx = p1.x - p0.x, ty = p1.y - p0.y, l = Math.hypot(tx, ty) || 1, nx = ty / l, ny = -tx / l, face = clamp01(nx * lt.lx + ny * lt.ly), slope = Math.abs(ty) / l;
      const alt = 1 - clamp01((Math.min(p0.y, p1.y) - top) / 60), snow = alt > .7 && slope < O.snowSlope ? 1 : 0, base = snow ? C.snow : C.veg, k = .55 + .7 * face, cc = mixH(dm(base)).map(v => Math.min(255, v * k | 0));
      c.strokeStyle = `rgb(${cc})`; c.globalAlpha = ga * .85; c.beginPath(); c.moveTo(p0.x, p0.y + 1); c.lineTo(p1.x, p1.y + 1); c.stroke(); }
    c.globalAlpha = ga; G.st.vector++; return true; }
  // mode C -> mode A: sample objects {h, m{rock,soil,veg,sand,wet,ice}, hollow, crack, fold, fresh, temp, moist, slope?, river?, water?}.
  // Placement comes from array props (arr.x0/dx/y0/amp/chunk/ver/yBot/snowLine) or L (L.x0 ...), else spans the screen. Converted once
  // per (array, ver): a WeakMap, so an array Game Dev reuses with a bumped ver re-converts and a new array is new.
  const conv = new WeakMap();
  function fromSamples(A, L, st) { const n = A.length, ver = A.ver != null ? A.ver : L.ver != null ? L.ver : 0, hit = conv.get(A); if (hit && hit.ver === ver) return hit;
    const W = (st && st.W) || 412, H = (st && st.H) || 915, pick = (k, d) => (A[k] != null ? A[k] : L[k] != null ? L[k] : d);
    const P = { chunk: pick('chunk', L.i | 0), ver, n, h: new Float32Array(n), x0: pick('x0', 0), dx: pick('dx', W / Math.max(1, n - 1)), y0: pick('y0', H * .72), amp: pick('amp', H * .18), yBot: pick('yBot', undefined),
      snowLine: pick('snowLine', undefined), seed: pick('seed', 1), worldX: pick('worldX', 0), cx: pick('cx', undefined), ov: pick('ov', undefined), m0: new Float32Array(n * 4), m1: new Float32Array(n * 4), m2: null, fold: null, fresh: null, river: null, water: null };
    let any2 = false, anyF = false, anyR = false, anyW = false; for (const s of A) { if (s.temp != null || s.moist != null || s.slope != null) any2 = true; if (s.fold != null || s.fresh != null) anyF = true; if (s.river != null) anyR = true; if (s.water != null) anyW = true; }
    if (any2) P.m2 = new Float32Array(n * 3); if (anyF) { P.fold = new Float32Array(n); P.fresh = new Float32Array(n); } if (anyR) P.river = new Float32Array(n); if (anyW) P.water = new Float32Array(n).fill(NaN);
    for (let i = 0; i < n; i++) { const s = A[i] || {}, m = s.m || {}; P.h[i] = s.h || 0;
      P.m0[i * 4] = m.rock || 0; P.m0[i * 4 + 1] = m.soil || 0; P.m0[i * 4 + 2] = m.veg || 0; P.m0[i * 4 + 3] = m.sand || 0;
      P.m1[i * 4] = m.wet || 0; P.m1[i * 4 + 1] = m.ice || 0; P.m1[i * 4 + 2] = s.hollow || 0; P.m1[i * 4 + 3] = s.crack || 0;
      if (P.m2) { P.m2[i * 3] = s.temp != null ? s.temp : .55; P.m2[i * 3 + 1] = s.moist != null ? s.moist : .5; P.m2[i * 3 + 2] = s.slope != null ? s.slope : 0; }
      if (P.fold) { P.fold[i] = s.fold || 0; P.fresh[i] = s.fresh || 0; } if (P.river) P.river[i] = s.river || 0; if (P.water && s.water != null) P.water[i] = s.water; }
    if (P.m2 && !A.some(s => s && s.slope != null)) for (let i = 0; i < n; i++) P.m2[i * 3 + 2] = Math.min(1, Math.abs((P.h[Math.min(n - 1, i + 1)] - P.h[Math.max(0, i - 1)]) * P.amp / (2 * P.dx)));
    conv.set(A, P); G.st.conv++; return P; }
  G.fromSamples = fromSamples;
  G.stats = () => ({ tiles: tiles.size, tileKB: Math.round(bytes / 1024), jobs: jobs.length, ...G.st });
  return G; }
