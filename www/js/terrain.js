'use strict';
// TERRAIN (v0.0.12, world track): what each planet's surface is made of, and how the place leans the music.
// Pure functions of the planet's seed (no lore: every value is drawn from the seed, nothing from a story).
//  - STYLE: four continuous weights from the seed (rock, ocean, ice, gas) - one usually leads, the others tint it. A cloud giant (gas)
//    keeps a soft low floor under drifting cloud bands, so ohms still have ground.
//  - FEATURES (rare): craters, cliffs / mesas, terraces; seas and lowland pools on wet planets (a flat water line, ohms float on it).
//  - REGIONS: 3..6 soft areas around the planet, blended by distance (gaussian weights, normalised): no borders anywhere.
//    Each region leans toward its own home note, scale family (brightness), tempo feel, timbre, ground material and colours.
//  - LANDMARKS: spires, crystals, geysers, arches (picked by the style weights), lit on the beat so they draw you toward them.
// SCALE_MUSIC.md 2.1 / 2.4 / 2.6: a region = a mode leaning, weights never a hard switch, blended by distance.
// Real planet step 1: scales come from many musical traditions (scales.js: European modes, Hindustani thaats, maqamat, East Asian
// pentatonics, gamelan, African, blues and jazz, Eastern European), "Include theory behind many cultures" (12:18 AM Oct 23).
// Planets AND regions blend traditions: a planet has a continuous mix (usually one leads, "each planet as one tradition", 8:55 PM Oct 24),
// each region nudges that mix toward neighbouring traditions ("regions of blending traditions between", 8:56 PM Oct 24) and the regions
// blend into each other by distance. Inside each tradition one continuous brightness picks a gaussian over its scales, dark -> bright;
// rough / craggy ground leans darker, smooth / lush brighter (never one scale). The harmony engine reads the result as one quiet extra
// vote (music.js 'harmony.place'). Cultures add variance, never limit: every weight is a leaning (dev toggle 'traditions', off = modes only).
// Large planets (real planet T15): feature loops only visit their own span, regions scale with the planet's size.
import { rng } from './rng.js';
import { TRADITIONS, voteScale, nearestScale } from './scales.js';
export const STYLES = ['rock', 'ocean', 'ice', 'gas'];
export const LANDMARKS = ['spire', 'crystal', 'geyser', 'arch'];
// dark -> bright (SCALE_MUSIC 'mode' = which scale on the tonic); semitones above the region's home note
export const MODES = [['locrian', [0, 1, 3, 5, 6, 8, 10]], ['phrygian', [0, 1, 3, 5, 7, 8, 10]], ['aeolian', [0, 2, 3, 5, 7, 8, 10]], ['dorian', [0, 2, 3, 5, 7, 9, 10]],
  ['mixolydian', [0, 2, 4, 5, 7, 9, 10]], ['ionian', [0, 2, 4, 5, 7, 9, 11]], ['lydian', [0, 2, 4, 6, 7, 9, 11]]];
const NOTE = [0, 7, 5, 9, 2, 4, 10, 3];                 // a region's home note: semitones above the om, near ones on the circle of fifths first
const FEEL = [1, 1, 4 / 3, 3 / 4, 3 / 2, 2 / 3];        // a region's tempo lean (snapped ratios, SCALE_MUSIC 1.3)
const SPU = 128;                                        // feature table samples per home width
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const sstep = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
// v0.0.24 (smooth zoom): the same build as resumable steps (a generator: it yields between pieces of work, the result is identical),
// so world.js can bake a planet's terrain a slice per frame before you get there (W.terrWarm) instead of in the frame that first needs it.
export function makeTerrain(seed, L, C, opts = {}) { const g = terrainSteps(seed, L, C, opts); let x; do x = g.next(); while (!x.done); return x.value; }
// the style blend alone (the first draws of the same seed: equal to makeTerrain(...).style), for the system view's planet discs
export function styleOf(seed) { const r = rng(seed), sw = STYLES.map(() => -Math.log(1 - r() * .999999)), ss = sw.reduce((a, b) => a + b, 0), st = {}; STYLES.forEach((k, i) => { st[k] = sw[i] / ss; }); return st; }
export function* terrainSteps(seed, L, C, opts = {}) {
  // v0.0.13: the style is ONE continuous blend of weights (e.g. rock .6 ice .3 ocean .1), never a type picked first with tints added:
  // a flat Dirichlet draw (normalised exponentials) - any mix is as likely as any other. T.lead = the largest weight, for reading only.
  const r = rng(seed), sw = STYLES.map(() => -Math.log(1 - r() * .999999)), ss = sw.reduce((a, b) => a + b, 0);
  const st = {}; STYLES.forEach((k, i) => { st[k] = sw[i] / ss; });
  let lead = 0; for (let k = 1; k < 4; k++) if (sw[k] > sw[lead]) lead = k;
  const T = { seed, C, style: st, lead: STYLES[lead], n: Math.max(16, Math.round(C * SPU)) };
  T.blend = () => STYLES.map(k => [k, st[k]]).sort((a, b) => b[1] - a[1]).filter(e => e[1] >= .02).map(e => `${e[0]} ${e[1].toFixed(2).slice(1)}`).join(' ');
  T.wet = clamp(st.ocean * 1.25 + st.rock * .15 * r() + st.gas * .1);
  T.wl = T.wet > .14 ? (-1.05 + 1.45 * T.wet) : -1e9;   // water line, in units of the layer amplitude (seas > ~.6 wet, pools below)
  T.flat = .55 * st.gas;                                // a cloud giant's floor is low and soft
  const add = T.add = new Float32Array(T.n + 1), tw = T.tw = new Float32Array(T.n + 1), cr = T.crag = new Float32Array(T.n + 1);
  const du = (u, c) => { let d = ((u - c) % C + C) % C; return d > C / 2 ? d - C : d; };
  const each = f => { for (let i = 0; i <= T.n; i++) f(i, i / T.n * C); };
  // only the samples within rad widths of c (wrapping), u passed as c + d so du() stays exact
  const near = (c, rad, f) => { const n = T.n, i0 = Math.floor((c - rad) / C * n), i1 = Math.ceil((c + rad) / C * n);
    for (let j = i0; j <= i1; j++) { const i = ((j % n) + n) % n; f(i, i / n * C); if (i === 0) f(n, C); } };
  // craters (rare: about one per two widths on a rocky world)
  const nCr = Math.floor(C * (st.rock * .55 + st.ice * .2) * (.4 + r() * .6)); T.craters = [];
  for (let k = 0; k < nCr; k++) { const c = r() * C, rad = .04 + r() * .09, dp = .5 + r() * .7; T.craters.push({ u: c, rad });
    near(c, rad * 2, (i, u) => { const d = Math.abs(du(u, c)) / rad; if (d > 2) return; add[i] += (d < 1 ? -dp * (1 - d * d) : 0) + .38 * dp * Math.exp(-(((d - 1) / .22) ** 2)); cr[i] += Math.exp(-d * d) * .8; }); if ((k & 7) === 7) yield 1; }
  yield 1;
  // cliffs / mesas: a raised (or sunk) plateau with steep edges
  const nCl = Math.floor(C * (st.rock * .4 + st.ice * .45) * (.3 + r() * .5));
  for (let k = 0; k < nCl; k++) { const c = r() * C, w = .12 + r() * .3, hgt = (.45 + r() * .55) * (r() < .75 ? 1 : -1), e = .006 + r() * .01;
    near(c, w + .1, (i, u) => { const d = du(u, c); if (Math.abs(d) > w + .1) return; add[i] += hgt * (sstep((d + w) / e) - sstep((d - w) / e)); cr[i] += Math.exp(-(((Math.abs(d) - w) / .03) ** 2)); }); if ((k & 3) === 3) yield 1; }
  yield 1;
  // terraced country (rare patches)
  const nTe = Math.floor(C * (st.rock * .3 + st.ice * .15 + st.ocean * .1) * r() + (r() < .3 ? 1 : 0));
  for (let k = 0; k < nTe; k++) { const c = r() * C, w = .3 + r() * .5; near(c, w * 4, (i, u) => { const d = du(u, c) / w; tw[i] = Math.max(tw[i], Math.exp(-d * d) * .85); cr[i] += Math.exp(-d * d) * .3; }); yield 1; }
  for (let i = 0; i <= T.n; i++) cr[i] = clamp(cr[i]);
  // the PLACE reads a softened copy (about a fifth of a width): walking past a cliff edge shifts the leaning, never flips it
  const blur = function* (a, rad) { const n = T.n, o = new Float32Array(n + 1), tmp = new Float32Array(n), nx = new Float32Array(n); for (let i = 0; i < n; i++) tmp[i] = a[i];
    for (let pass = 0; pass < 3; pass++) { let acc = 0; for (let j = -rad; j <= rad; j++) acc += tmp[(j + n) % n];
      for (let i = 0; i < n; i++) { nx[i] = acc / (2 * rad + 1); acc += tmp[(i + rad + 1) % n] - tmp[(i - rad + n) % n]; if ((i & 8191) === 8191) yield 1; } tmp.set(nx); yield 1; }
    for (let i = 0; i < n; i++) o[i] = tmp[i]; o[n] = o[0]; return o; };
  const ho = new Float32Array(T.n + 1); for (const c of T.craters) near(c.u, (c.rad + .1) * 3, (i, u) => { const d = Math.abs(du(u, c.u)) / (c.rad + .1); if (d < 3) ho[i] += Math.exp(-d * d); });
  yield 1; const crS = yield* blur(cr, Math.round(SPU * .07)); const hoS = yield* blur(ho, Math.round(SPU * .05)); yield 1;
  // regions (soft, blended; never a border)
  // the planet's tradition mix: one usually leads, a neighbour or two tint it (peaked Dirichlet draw, continuous)
  const NT = TRADITIONS.length, r2 = rng(seed ^ 0x7a2d), tw0 = TRADITIONS.map(() => Math.pow(-Math.log(1 - r2() * .999999), 2.2)), ts0 = tw0.reduce((a, b) => a + b, 0);
  T.trad = tw0.map(x => x / ts0); T.tradLead = T.trad.indexOf(Math.max(...T.trad)); T.traditions = opts.traditions !== false;
  const nR = (C > 12 ? Math.max(6, Math.round(C / (6 + 4 * r()))) : 3) + ((r() * 4) | 0); T.regions = [];
  for (let k = 0; k < nR; k++) { const c = (k + (r() - .5) * .5) / nR * C, hueG = (L.hue + (r() - .5) * 80 + 360) % 360;
    const R = { u: c, note: NOTE[(r() * NOTE.length) | 0], b0: r(), feel: FEEL[(r() * FEEL.length) | 0], tight: r(), timbre: r(), lush: clamp(r() * (1 - st.ice * .6) * (1 - st.gas * .4) + st.ocean * .25),
      hard: clamp(st.rock * .7 + st.ice * .6 + r() * .25), hollow: clamp(st.gas * .5 + r() * .35 + (k % 2 ? .1 : 0)), wet: clamp(T.wet * (.5 + r() * .7)),
      trad: (() => { const w = T.trad.slice(), nb = (r2() * NT) | 0, k2 = .15 + .5 * r2(); for (let j = 0; j < NT; j++) w[j] *= 1 - k2; w[nb] += k2; return w; })(),   // leans toward a neighbouring tradition
      ground: [hueG, 22 + 30 * r() + 20 * st.ice, 10 + 14 * r() + 22 * st.ice], sky: [(hueG + 150 + r() * 60) % 360, 30 + 40 * r(), 8 + 10 * r() + 14 * st.gas], water: [(190 + (r() - .5) * 70 + 360) % 360, 45 + 30 * r(), 22 + 14 * r()], lm: null };
    if (r() < .75) { const wt = [st.rock + .3 * st.gas, st.ice + .2 * st.rock, st.ocean + .3 * st.ice + .2 * T.wet, .6 * st.rock + .6 * st.gas]; let s = wt.reduce((a, b) => a + b, 0) * r(), ti = 0; while (ti < 3 && (s -= wt[ti]) > 0) ti++;
      R.lm = { type: LANDMARKS[ti], u: (c + (r() - .5) * C / nR * .4 + C) % C, size: .6 + r() * .6, k }; }
    T.regions.push(R); }
  T.sig = C / nR * .5;   // region blend width
  T.du = du;
  // the place at planet position u: writes the blend into out (re-used object, no allocation)
  T.at = (u, out, rough0 = L.rough, xr = 0, xl = 0) => { const Rs = T.regions, w = out.w && out.w.length >= Rs.length ? out.w : (out.w = new Float32Array(Math.max(8, Rs.length))); let s = 0;
    for (let k = 0; k < Rs.length; k++) { const d = du(u, Rs[k].u) / T.sig; s += w[k] = d > 4 || d < -4 ? 0 : Math.exp(-d * d); }
    const crag = look(crS, u), rough = clamp(.45 * rough0 + 1.2 * crag + xr); let b = 0, lf = 0, ti = 0, ft = 0, h = 0, ho = 0, we = 0, lu = 0, gx = 0, gy = 0, kx = 0, ky = 0, wx = 0, wy = 0, gs = 0, gl = 0, ks = 0, kl = 0, ws = 0, wlt = 0, best = 0;
    for (let k = 0; k < Rs.length; k++) { const R = Rs[k], q = w[k] /= s || 1; if (q > w[best]) best = k;
      b += q * R.b0; lf += q * Math.log2(R.feel); ti += q * R.timbre; ft += q * R.tight; h += q * R.hard; ho += q * R.hollow; we += q * R.wet; lu += q * R.lush;
      const A = R.ground[0] * .01745, B = R.sky[0] * .01745, Cw = R.water[0] * .01745; gx += q * Math.cos(A); gy += q * Math.sin(A); kx += q * Math.cos(B); ky += q * Math.sin(B); wx += q * Math.cos(Cw); wy += q * Math.sin(Cw);
      gs += q * R.ground[1]; gl += q * R.ground[2]; ks += q * R.sky[1]; kl += q * R.sky[2]; ws += q * R.water[1]; wlt += q * R.water[2]; }
    const tr = out.trad || (out.trad = new Float32Array(NT)); tr.fill(0); for (let k = 0; k < Rs.length; k++) { const q = w[k]; if (q < .01) continue; for (let j = 0; j < NT; j++) tr[j] += q * Rs[k].trad[j]; }
    let tb = 0; for (let j = 1; j < NT; j++) if (tr[j] > tr[tb]) tb = j; out.tradLead = tb;
    lu = clamp(lu + xl); out.n = Rs.length; out.region = best; out.rough = rough; out.lush = lu;
    out.bright = clamp(.5 + .9 * (b - .5) + .8 * (.35 - rough) + .25 * (lu - .3));   // rough / craggy -> darker families; smooth / lush -> brighter (continuous)
    out.feel = Math.pow(2, lf); out.tight = clamp(.3 + .4 * ft + .3 * (1 - rough) - .2 * st.gas); out.timbre = clamp(.5 * ti + .5 * (1 - rough));
    out.hard = clamp(h * (.6 + .5 * rough)); out.hollow = clamp(ho + .7 * look(hoS, u)); out.wet = clamp(we + (T.wl > -1e8 ? .25 * T.wet : 0));
    const pal = out.pal || (out.pal = { ground: [0, 0, 0], sky: [0, 0, 0], water: [0, 0, 0] }), deg = (x, y) => (Math.atan2(y, x) / .01745 + 360) % 360;
    pal.ground[0] = deg(gx, gy); pal.ground[1] = gs; pal.ground[2] = gl; pal.sky[0] = deg(kx, ky); pal.sky[1] = ks; pal.sky[2] = kl; pal.water[0] = deg(wx, wy); pal.water[1] = ws; pal.water[2] = wlt;
    return out; };
  const look = (a, u) => { const x = ((u % C) + C) % C / C * T.n, i = x | 0, f = x - i; return a[i] + (a[i + 1] - a[i]) * f; };
  T.addAt = u => look(add, u); T.twAt = u => look(tw, u); T.cragAt = u => look(cr, u);
  T.craterAt = u => { let m = 0; for (const c of T.craters) { const d = Math.abs(du(u, c.u)) / c.rad; if (d < 1.5) m = Math.max(m, 1 - d / 1.5); } return m; };
  // a region's leaning as 12 pitch-class weights above the om: its home note, a gaussian over the dark -> bright mode ladder
  T.vote = (pl, out12) => { out12.fill(0); const Rs = T.regions;
    if (T.traditions) { for (let k = 0; k < Rs.length; k++) { const q = pl.w[k]; if (q < .02) continue; const tr = Rs[k].trad;
        for (let j = 0; j < NT; j++) if (tr[j] > .03) voteScale(out12, q * tr[j], j, clamp(pl.bright), Rs[k].note); } return out12; }
    for (let k = 0; k < Rs.length; k++) { const q = pl.w[k]; if (q < .02) continue; const c = pl.bright * 6;
      for (let m = 0; m < MODES.length; m++) { const g = q * Math.exp(-(((m - c) / 1.1) ** 2)); if (g < .005) continue; const iv = MODES[m][1];
        for (let j = 0; j < iv.length; j++) out12[(Rs[k].note + iv[j]) % 12] += g * (j === 0 ? 2.5 : iv[j] === 7 ? 1.5 : 1); } }
    return out12; };
  T.mode = pl => { if (!T.traditions || !pl.trad) return MODES[Math.round(clamp(pl.bright) * 6)][0]; const S = nearestScale(pl.tradLead, clamp(pl.bright)); return `${TRADITIONS[pl.tradLead][0]} ${S.name}`; };
  T.tradName = () => TRADITIONS[T.tradLead][0];   // the nearest mode name, for reading only (the music uses the weights)
  return T;
}
