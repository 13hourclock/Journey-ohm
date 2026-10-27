// LOOK / planet (2D; on by default, opts.realLook = false turns it off): a real, lit, seeded planet disc for Canvas 2D (system / galaxy views, far and small planets,
// and the fallback when WebGL is off). ART_DIRECTION 4.5 "Living world" (his Sheet-3 pick): day side, a soft dusk line with a warm
// edge, a dark night side, a glowing air rim on the sunward limb, clouds on wet worlds, bands and storms on giants, caps on cold
// worlds, a sun glint on seas. Wilbow: "more realistic space, planets and star systems" / "Less cartoon" (Oct 23), "13A 13B 13D".
// How it stays cheap (never by cutting features):
//   1. per planet ONE equirectangular bake (albedo, height, sea mask, cracks, clouds, temperature, vegetation) from 3D noise on the
//      unit sphere (seamless), progressive (a 64x32 draft first, then full size); every bake is an incremental job run in IDLE time
//      (look.frame schedules it after the frame; nothing bakes inside a draw);
//   2. per (size, spin phase, light, heal, season) a lit disc sprite projected from it. Spin phases are coarse (~8 px of equator per
//      phase) and each pair crossfades, so a turning planet costs one disc bake per phase, pre-baked one phase ahead;
//   3. per frame: 2 drawImage for the disc (crossfade) + 1 additive air-rim sprite (+ the trippy layer and the limb flare only when they show).
// Heal (37 A D / 36 A): unhealed = real but muted, dusty, cracked; healed = vivid colour over the same real light.
// Trippy layer (13A): the music palette over the REAL light and form: the disc bake keeps each pixel's real luminance + a contour
// index (palette-free); a cheap idle job colours it per palette change (bar / key / chord), so the land stays readable at the peak.
// big events (13B / 39 A D) brighten the air and flare the limb in the jam's colours, on the place swell (1-4 bars, on the beat).
// READ-ONLY: reads p and st; never writes them. Every number is a PARAMETER (PLANET_OPTS).
import { createNoise, hash32, rand01, smooth, clamp01 } from './noise.js';
import { blackbody, hsl2rgb } from './palette.js';
import { blit, devOf } from './blit.js';
export const PLANET_OPTS = {
  tex: [[512, 256], [384, 192], [256, 128], [192, 96]],   // equirect bake per rung (lower rungs: resolution only, every feature kept)
  maxR: [320, 256, 192, 160],     // largest baked disc radius per rung, DEVICE px (the rungs already lower the DPR; drawn scaled above it; big close planets go to WebGL)
  bakeMs: [2, 1.5, 1, .6],        // only for bake mode 'frame' (old in-frame budget); normally bakes run in idle slices (index.js bake opts)
  settle: 12, bigRims: 12,                     // frames a planet's device radius must hold before it re-bakes at the exact size (1:1 blit)
  spinPx: 8, spinMax: 96, spinFade: .6,         // a new spin phase every ~spinPx px of equator travel (at most spinMax per turn), crossfaded pairwise
  snowT: .2, seasonSnow: .14, seasonK: 1, seasonBuckets: 4,   // snow line (temperature) and how far the seasons move it (north/south opposite)
  tripLine: .8,                   // contour line strength in the trippy layer
  tripLight: 1.2,                 // how far the real light shifts the trippy colour (shadows run to the next colour)
  lightZ: .25, terminator: .16, twilight: .28, limb: .35, atmo: .9, glint: .5, bump: 2.2, cloudK: 1,
  dust: [176, 160, 138], dustK: .65, crackK: .8, healBuckets: 5, tripBands: 7, flareK: 1,
  edgeAA: true,                   // v0.0.31: the disc edge is pixel-coverage antialiased (a 1 px soft rim; the edge pixels shade as the limb). false = the v0.0.30 hard centre-in-circle edge (stair-stepped left rim)
};
const TAU = Math.PI * 2, LB = 48;   // light-angle buckets
const lin2srgb = c => c.map(v => Math.round(255 * Math.pow(clamp01(v), 1 / 2.2)));
// style weights: p.style if given (Game Dev data), else the same flat Dirichlet idea as terrain.js, from the seed
export function styleOf(p) { if (p.style && typeof p.style.rock === 'number') return p.style;
  const s = p.seed >>> 0, w = [0, 1, 2, 3].map(k => -Math.log(1 - rand01(s, 0x51 + k) * .999999)), t = w.reduce((a, b) => a + b, 0);
  return { rock: w[0] / t, ocean: w[1] / t, ice: w[2] / t, gas: w[3] / t }; }
// a seeded, natural palette (sRGB 0..255) when p.palette is missing: rock, soil, vegetation, sand, accent (+ sea)
export function paletteOf(p) { const s = p.seed >>> 0, r = k => rand01(s, 0x700 + k);
  if (Array.isArray(p.palette) && p.palette.length >= 5) { const P = p.palette.slice(0, 5).map(c => Math.max(...c) <= 1.001 ? lin2srgb(c) : c.map(Math.round));
    const sea = p.seaColor ? (Math.max(...p.seaColor) <= 1.001 ? lin2srgb(p.seaColor) : p.seaColor) : [18, 52, 86];
    return { rock: P[0], soil: P[1], veg: P[2], sand: P[3], acc: P[4], sea, gasA: mixRGB(P[3], [236, 228, 212], .35), gasB: mixRGB(P[1], P[0], .35), gasC: mixRGB(P[4], [60, 30, 20], .35), gasP: mixRGB(P[0], [90, 96, 110], .5) }; }
  const hb = typeof p.hue === 'number' ? p.hue : r(0) * 360;
  return { rock: hsl2rgb(20 + (r(1) - .5) * 50, .12 + .14 * r(2), .32 + .12 * r(3)), soil: hsl2rgb(28 + (r(4) - .5) * 30, .3, .26 + .08 * r(5)),
    veg: hsl2rgb(95 + (r(6) - .5) * 110 + (hb - 180) * .08, .28 + .25 * r(7), .2 + .08 * r(8)), sand: hsl2rgb(38 + (r(9) - .5) * 16, .3 + .15 * r(10), .6 + .1 * r(11)),
    acc: hsl2rgb(hb, .45, .55), sea: hsl2rgb(205 + (r(12) - .5) * 40, .55, .14 + .06 * r(13)), ...gasOf(hb, r) }; }
// gas giant colours (Jupiter / Saturn-like, not pastel): pale zones, darker rust / ochre belts, a deeper storm colour, a dim polar haze
const gasOf = (hb, r) => { const zh = 34 + (hb - 180) * .22 + (r(14) - .5) * 30;
  return { gasA: hsl2rgb(zh, .2 + .14 * r(15), .72 + .05 * r(16)), gasB: hsl2rgb(zh - 6 + 22 * r(17), .36 + .16 * r(18), .33 + .07 * r(19)),
    gasC: hsl2rgb(zh - 18 + 26 * r(20), .5, .36), gasP: hsl2rgb(zh + 160 * r(21), .1, .38) }; };
const mixRGB = (a, b, t) => [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * t));
// ---------------------------------------------------------------------------------------------------------------------------
// 1. the equirectangular bake (incremental job): rgb albedo, height, sea, crack, cloud, gas band index
export function bakeTexJob(p, w, h) { const S = styleOf(p), P = paletteOf(p), N = createNoise(p.seed >>> 0), s = p.seed >>> 0;
  const n = w * h, T = { w, h, alb: new Uint8ClampedArray(n * 3), hgt: new Float32Array(n), sea: new Uint8Array(n), crack: new Uint8Array(n), cloud: new Uint8Array(n), band: new Float32Array(n), temp: new Uint8Array(n), slope: new Uint8Array(n), veg: new Uint8Array(n), done: false, row: 0, ms: 0, S, P };
  const sea = typeof p.sea === 'number' ? p.sea : -.55 + .85 * S.ocean - .25 * S.gas, gas = smooth(.3, .62, S.gas), cloudCov = typeof p.cloud === 'number' ? p.cloud : clamp01(.12 + .7 * S.ocean + .2 * S.rock * rand01(s, 9)) * (1 - gas);
  T.seaLv = sea; const iceK = S.ice, off = [rand01(s, 1) * 100, rand01(s, 2) * 100, rand01(s, 3) * 100];
  // storms: one or two big long-lived ovals (deep storm colour, spiral inside, dark collar) + several small pale ovals
  const storms = []; for (let k = 0, m = 5 + (rand01(s, 20) * 5 | 0); k < m; k++) { const bigS = k < 1 + (rand01(s, 19) < .35 ? 1 : 0);
    storms.push({ lat: (rand01(s, 21 + k) - .5) * (bigS ? 1.1 : 1.8), lon: rand01(s, 31 + k) * TAU, rad: bigS ? .13 + .1 * rand01(s, 41 + k) : .025 + .035 * rand01(s, 41 + k), dir: k % 2 ? 1 : -1, big: bigS }); }
  const GB = { f: 5.5 + 4 * rand01(s, 7), ph: rand01(s, 8) * 6, amp: [] }; for (let k = 0; k < 40; k++) GB.amp.push(.3 + .7 * Math.pow(rand01(s, 200 + k), .7));   // per-band contrast varies
  const craters = []; for (let k = 0, m = Math.round(14 * (S.rock + .5 * S.ice) * (1 - gas)); k < m; k++) { const z = rand01(s, 60 + k) * 2 - 1, a = rand01(s, 90 + k) * TAU, q = Math.sqrt(1 - z * z); craters.push([q * Math.cos(a), z, q * Math.sin(a), .04 + .12 * rand01(s, 120 + k) ** 2]); }
  const gA = P.gasA || P.sand, gB = P.gasB || P.soil, gC = P.gasC || P.acc, gP = P.gasP || P.rock, mixc = (a, b, t, o, i) => { o[i] = a[0] + (b[0] - a[0]) * t; o[i + 1] = a[1] + (b[1] - a[1]) * t; o[i + 2] = a[2] + (b[2] - a[2]) * t; };
  const tmp = [0, 0, 0], tmp2 = [0, 0, 0];
  T.step = (budget, now) => { const t0 = now();
    while (T.row < h) { const y = T.row, lat = (y + .5) / h * Math.PI - Math.PI / 2, cy = Math.sin(lat), cr = Math.cos(lat);
      for (let x = T.col | 0; x < w; x++) { const lon = (x + .5) / w * TAU, vx = cr * Math.cos(lon), vz = cr * Math.sin(lon), vy = cy, i = y * w + x, j = i * 3;
        const X = vx * 1.7 + off[0], Y = vy * 1.7 + off[1], Z = vz * 1.7 + off[2];
        // relief: warped continents + ridged ranges + craters
        let e = N.warp(X, Y, Z, 5, .7) * 1.9 + (N.ridged(X * 2.2, Y * 2.2, Z * 2.2, 4) - .45) * (.5 + .6 * S.rock + .3 * S.ice);
        let crk = 0; for (const c of craters) { const d = Math.hypot(vx - c[0], vy - c[1], vz - c[2]) / c[3]; if (d < 1.6) { e += d < 1 ? -.35 * (1 - d * d) : 0; e += .22 * Math.exp(-(((d - 1) / .18) ** 2)); } }
        const hh = Math.max(-1, Math.min(1, e)); T.hgt[i] = hh;
        // cracks (unhealed reads them; ice worlds have them anyway as ridged ice lines)
        const cn = Math.abs(N.n3(X * 5 + 11, Y * 5, Z * 5)) + .35 * Math.abs(N.n3(X * 11, Y * 11 + 7, Z * 11)); crk = clamp01(1 - cn * 9); T.crack[i] = crk * 255;
        // climate: temperature from latitude + altitude (cold worlds colder), moisture from noise + sea
        const temp = clamp01(1.05 - Math.abs(cy) * 1.15 - Math.max(0, hh - sea) * .55 - .55 * iceK + .12 * N.fbm(X * 1.3, Y * 1.3, Z * 1.3, 3)),
          moist = clamp01(.45 + .9 * N.fbm(X * 1.1 + 4, Y * 1.1, Z * 1.1 - 3, 4) + .35 * S.ocean - .2 * S.rock); T.temp[i] = temp * 255;
        let r, g, b;
        if (hh < sea) { const dpt = clamp01((sea - hh) * 2.2); T.sea[i] = 255;   // sea: shallows to deep, colour from the planet's own sea
          mixc([P.sea[0] * 1.9 + 20, P.sea[1] * 1.9 + 30, P.sea[2] * 1.5 + 20], P.sea, Math.sqrt(dpt), tmp, 0); r = tmp[0]; g = tmp[1]; b = tmp[2];
          T.slope[i] = 0; T.veg[i] = 0; }   // sea ice is seasonal: applied in the disc from T.temp
        else { const alt = clamp01((hh - sea) / (1 - sea + 1e-3)), slope = clamp01(Math.abs(N.n3(X * 4, Y * 4, Z * 4)) * 2), coast = smooth(.06, 0, alt);
          // biome weights, continuous (never themes): rock by altitude + roughness, vegetation by warmth x moisture, sand at dry coasts, snow by cold
          let wr = .25 + 1.2 * alt * alt + .4 * slope + .6 * S.rock, wv = moist * smooth(.15, .5, temp) * (1 - alt) * 1.6, ws = (coast * .9 + (1 - moist) * smooth(.4, .9, temp) * .7), wd = .35 * (1 - alt);
          const tot = wr + wv + ws + wd; wr /= tot; wv /= tot; ws /= tot; wd /= tot;
          r = P.rock[0] * wr + P.veg[0] * wv + P.sand[0] * ws + P.soil[0] * wd; g = P.rock[1] * wr + P.veg[1] * wv + P.sand[1] * ws + P.soil[1] * wd; b = P.rock[2] * wr + P.veg[2] * wv + P.sand[2] * ws + P.soil[2] * wd;
          const strata = .9 + .1 * Math.sin(hh * 40 + N.n3(X * 3, Y * 3, Z * 3) * 4); r *= strata; g *= strata; b *= strata;
          T.slope[i] = slope * 255; T.veg[i] = wv * 255;   // snow is seasonal: applied in the disc from T.temp (moving snow line)
          if (iceK > .25) { const il = crk * iceK; r -= 60 * il; g -= 35 * il; b -= 10 * il; } }   // ice worlds: blue ridged ice lines
        // gas giant: belts and zones of varied width AND contrast, sheared turbulent edges (eddies strongest where bands meet), fine
        // streaks along the jets, real storms (spiral + collar), darker hazy poles. Colours from the planet's palette (gasA-P).
        if (gas > 0) { let u = lat * GB.f + GB.ph + .9 * N.n3(lat * 2.3, 3.1, 7.7); const edge = Math.abs(Math.cos(u));
          let la = lat + .03 * N.fbm(X * 1.2, Y * 5, Z * 1.2, 3) + .055 * edge * N.fbm(X * 3.2, Y * 15, Z * 3.2, 4);
          for (const st of storms) { const dl = Math.atan2(Math.sin(lon - st.lon), Math.cos(lon - st.lon)), d = Math.hypot(dl * cr * .6, lat - st.lat) / st.rad; if (d < 1.8) la += st.dir * .5 * st.rad * Math.exp(-d * d) * Math.sin(Math.atan2(lat - st.lat, dl) + d * 3); }
          u = la * GB.f + GB.ph + .9 * N.n3(la * 2.3, 3.1, 7.7); const bi = Math.floor(u / Math.PI), amp = GB.amp[((bi % 40) + 40) % 40];
          const bt = clamp01(.5 + .5 * amp * Math.sin(u) + .07 * N.n3(X * 1.5, la * 70, Z * 1.5) + .04 * N.n3(X * 6, la * 150, Z * 6)); T.band[i] = bt;
          mixc(gB, gA, bt, tmp2, 0); const hv = .3 * smooth(.35, .8, N.fbm(X * .7 + 9, la * 4, Z * .7, 3) * .5 + .5) * (1 - bt);   // belts drift toward the deep colour
          tmp2[0] += (gC[0] - tmp2[0]) * hv; tmp2[1] += (gC[1] - tmp2[1]) * hv; tmp2[2] += (gC[2] - tmp2[2]) * hv;
          for (const st of storms) { const dl = Math.atan2(Math.sin(lon - st.lon), Math.cos(lon - st.lon)), d = Math.hypot(dl * cr * .6, lat - st.lat) / st.rad; if (d > 1.3) continue;
            const sw = .5 + .5 * Math.sin(Math.atan2(lat - st.lat, dl * cr * .6) * 2 - d * 9 * st.dir), k = smooth(1.15, .55, d) * (st.big ? .9 : .8), sc = st.big ? gC : gA, sv = st.big ? .8 + .35 * sw * d : 1.05 + .1 * sw;
            tmp2[0] += (sc[0] * sv - tmp2[0]) * k; tmp2[1] += (sc[1] * sv - tmp2[1]) * k; tmp2[2] += (sc[2] * sv - tmp2[2]) * k; const ring = 1 - (st.big ? .28 : .15) * Math.exp(-(((d - 1.05) / .13) ** 2)); tmp2[0] *= ring; tmp2[1] *= ring; tmp2[2] *= ring; }
          const pk = smooth(.95, 1.4, Math.abs(lat)) * .7; tmp2[0] += (gP[0] - tmp2[0]) * pk; tmp2[1] += (gP[1] - tmp2[1]) * pk; tmp2[2] += (gP[2] - tmp2[2]) * pk;
          r += (tmp2[0] - r) * gas; g += (tmp2[1] - g) * gas; b += (tmp2[2] - b) * gas; if (gas > .5) { T.sea[i] = 0; T.veg[i] = 0; T.temp[i] = 255; } }
        else T.band[i] = clamp01(hh * .5 + .5);
        T.alb[j] = r; T.alb[j + 1] = g; T.alb[j + 2] = b;
        // clouds: their own warped fbm, thresholded by cover; swirls near storms
        if (cloudCov > .01) { const cv = N.warp(X * 1.6 + 30, Y * 3.2, Z * 1.6, 5, 1.1) * .5 + .5 + .08 * Math.cos(lat * 6); T.cloud[i] = 255 * smooth(1 - cloudCov * .75, 1.05 - cloudCov * .5, cv); }
        if ((x & 31) === 31 && x < w - 1 && now() - t0 > budget) { T.col = x + 1; T.ms += now() - t0; return false; } }   // v0.0.23: the budget is checked every 32 px (a 512 px row of 3D noise ran ~2 ms desktop / ~10 ms phone past an idle slice)
      T.col = 0; T.row++; if (now() - t0 > budget) break; }
    T.ms += now() - t0; if (T.row >= h) T.done = true; return T.done; };
  return T; }
// ---------------------------------------------------------------------------------------------------------------------------
// 2. the lit disc (incremental job) from a finished texture: real colours (heal-muted, seasonal) + the palette-free trippy data
//    (per pixel: real luminance + contour index), coloured later by tintJob only when the trippy layer shows
function discJob(T, R, spin, tilt, L, heal, season, starRGB, O, mk) {
  // fast path (smart, not cheap): everything that does not depend on the spin (the sphere's geometry, the light, limb, dusk line,
  // sea glint, sky fresnel, haze, cloud light, bump basis) is computed ONCE per (R, tilt, light) into a cached table (geoOf); a spin
  // step is then a texture fetch + a few multiply-adds per pixel. Same image as the full maths (bump normal renormalised approx).
  const D = R * 2, cv = mk(D, D), x = cv.getContext('2d'), id = x.createImageData(D, D), d = id.data;
  const S = T.S, w = T.w, h = T.h, sr = starRGB[0] / 255, sg = starRGB[1] / 255, sb = starRGB[2] / 255, atmoK = O.atmoK, gas = smooth(.3, .62, S.gas), muted = 1 - heal, dust = O.dust;
  const ac = atmoColOf(S, T.P), cspin = spin * 1.12 + .03, G = geoOf(R, tilt, L, O), n = G.n, bumpOn = gas < .7, dh = O.bump * (1 - gas), cloudK = O.cloudK, hasCloud = T.cloud.length > 0;
  const dk = O.dustK * muted, crK = O.crackK * muted * (1 - gas), vk = .25 * heal, tw55 = 255 * .55, alb = T.alb, hgt = T.hgt, seaA = T.sea, crA = T.crack, clA = T.cloud, band = T.band, tb = O.tripBands;
  const tmA = T.temp, slA = T.slope, vgA = T.veg, sK = O.seasonK * (gas > .5 ? 0 : 1), sn = (season || 0) * sK, thr0 = O.snowT, sS = O.seasonSnow, snowH = O.snowH != null ? O.snowH : null, seaH = O.seaH != null ? O.seaH : 0;
  const gasLimb = gas > .5 ? .5 * gas : 0, limbK = O.limb, gh = .55 * gas, gHz = [ac[0] * .8 + 30, ac[1] * .8 + 34, ac[2] * .8 + 44];
  const J = { cv, done: false, row: 0, ms: 0, D, bv: new Uint16Array(D * D), lu: new Uint8Array(D * D), ea: new Uint8Array(D * D), tc: null, tk: null, tint: null };
  const bvA = J.bv, luA = J.lu, eaA = J.ea;
  J.step = (budget, now) => { const t0 = now();
    while (J.row < n) { const end = Math.min(n, J.row + 2048);
      for (let k = J.row; k < end; k++) { const o = G.o[k], uf = G.uf[k] + spin, vf = G.vf[k], yi = Math.min(h - 1, Math.floor(vf * h)), row = yi * w, xi = ((Math.floor(uf * w) % w) + w) % w, ti = row + xi;
        let r = alb[ti * 3], g = alb[ti * 3 + 1], b = alb[ti * 3 + 2]; let seaM = seaA[ti] / 255; const hh = hgt[ti];
        // seasons: the hemisphere in winter gets a lower snow line, browner vegetation and sea ice; the other one the reverse
        if (tmA[ti] < 255) { const sh = vf > .5 ? sn : -sn, tp = tmA[ti] / 255, thr = thr0 - sS * sh;
          if (seaM > .5) { const ik = smooth(thr - .07, thr - .17, tp); if (ik > 0) { r += (226 - r) * ik; g += (236 - g) * ik; b += (246 - b) * ik; seaM *= 1 - ik; } }
          else { const vg = vgA[ti] / 255 * sK; if (vg > .02) { if (sh < 0) { const a2 = -sh * vg; r += (r * .25 + 22) * a2; g -= g * .08 * a2; b -= b * .3 * a2; } else { const a2 = sh * vg; r -= r * .12 * a2; g += g * .1 * a2; b -= b * .05 * a2; } }
            let snow = smooth(thr, thr - .14, tp) * (1 - .4 * slA[ti] / 255);
            if (snowH != null) { const la = Math.abs(vf - .5) * 2, line = seaH + (snowH - seaH) * (1 - la * la) - sS * sh * .3 * (snowH - seaH); snow = Math.max(snow * .35, smooth(line - .03, line + .05, hh) * (1 - .35 * slA[ti] / 255)); }   // the data's snow line: falls toward the poles, moves with the season
            if (snow > 0) { r += (238 - r) * snow; g += (242 - g) * snow; b += (250 - b) * snow; } } }
        if (muted > .01) { const lum = r * .3 + g * .59 + b * .11; r += (lum * .55 + dust[0] * .45 - r) * dk; g += (lum * .55 + dust[1] * .45 - g) * dk; b += (lum * .55 + dust[2] * .45 - b) * dk;
          const ck = crA[ti] / 255 * crK * (1 - seaM); r *= 1 - .7 * ck; g *= 1 - .72 * ck; b *= 1 - .75 * ck; }
        else { const lum = r * .3 + g * .59 + b * .11; r += (r - lum) * vk; g += (g - lum) * vk; b += (b - lum) * vk; }
        const ndg = G.ndg[k]; let ndb = ndg;
        if (bumpOn && seaM < .5) { const xp = xi + 1 === w ? 0 : xi + 1, xm = xi === 0 ? w - 1 : xi - 1, yp = yi + 1 < h ? yi + 1 : yi, ym = yi > 0 ? yi - 1 : yi;
          const hu = hgt[row + xp] - hgt[row + xm], hv = hgt[yp * w + xi] - hgt[ym * w + xi], a = dh * hu * G.eL[k], c2 = dh * hv;
          ndb = (ndg - a * G.eDot[k] - c2 * G.nDot[k]) / Math.sqrt(1 + a * a * G.eN[k] + c2 * c2); }
        if (ndb < 0) ndb = 0;
        const mu = G.limb[k], limb = gasLimb ? Math.exp(gasLimb * G.lnmu[k]) : 1 - limbK * (1 - mu) * (1 - mu), lit = G.day[k] * (.35 + .65 * Math.min(1.4, ndb * G.inv[k])) * G.amb[k], L1 = lit * limb, tw = G.tw[k] * atmoK;
        r = r * (L1 * sr + .0132) + tw55 * tw; g = g * (L1 * sg + .0154) + 255 * tw * .26; b = b * (L1 * sb + .022) + 255 * tw * .12;
        if (seaM > .02) { const sp = G.sp[k], fr = G.fr[k]; r += seaM * (255 * sp * sr + ac[0] * fr); g += seaM * (255 * sp * sg + ac[1] * fr); b += seaM * (255 * sp * sb + ac[2] * fr); }
        let cl = 0; if (hasCloud) { const cu = G.uf[k] + cspin, cx = ((Math.floor(cu * w) % w) + w) % w; cl = clA[row + cx] / 255 * cloudK;
          if (cl > .004) { const cli = G.cli[k], cr = 245 * cli * sr + 127.5 * tw, cg = 245 * cli * sg + 63.75 * tw, cb = 250 * cli * sb + 38.25 * tw; r += (cr - r) * cl; g += (cg - g) * cl; b += (cb - b) * cl; } }
        const hz = atmoK * G.hz[k]; r += (ac[0] - r) * hz; g += (ac[1] - g) * hz; b += (ac[2] - b) * hz;
        if (gh > 0) { const q = 1 - mu, gz = gh * q * q * q * smooth(-.25, .4, ndg); r += (gHz[0] * L1 - r) * gz; g += (gHz[1] * L1 - g) * gz; b += (gHz[2] * L1 - b) * gz; }   // giants: high haze at the limb
        const ea = gas > .5 ? smooth(0, .09, mu) : G.ea[k]; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255 * ea;
        const pi = o >> 2, bv = (gas > .5 ? band[ti] * tb : (hh + 1) * tb * .5) + (cl > .5 ? .5 : 0); bvA[pi] = Math.min(65535, Math.max(0, bv * 256)); luA[pi] = Math.min(255, r * .3 + g * .59 + b * .11); eaA[pi] = 255 * ea; }
      J.row = end; if (now() - t0 > budget) break; }
    J.ms += now() - t0;
    if (J.row >= n) { x.putImageData(id, 0, 0); J.done = true; }
    return J.done; };
  return J; }
// the trippy look of one finished disc / tile for one palette (incremental job): palette colour at the REAL luminance (form and light
// stay readable) + contour lines; colours rotate through the contours with the palette (bar / key / chord) = sound-reactive pattern.
// mixA: the takeover (trip x .85, bucketed) is mixed into the real pixels here, so a trippy frame blits ONE sprite, same as a calm one.
export function tintJob(J, cols, palKey, O, mk, mixA = 1) { const W = J.W || J.D, H = J.H || J.D, tc = J.tc || (J.tc = mk(W, H)), tx = tc.getContext('2d'), id = tx.createImageData(W, H), d = id.data, nc = cols.length, off = (palKey | 0) % nc;
  const C = cols.map(c => [c[0], c[1], c[2], Math.max(28, c[0] * .3 + c[1] * .59 + c[2] * .11)]), lineK = O.tripLine != null ? O.tripLine : .8, soft = !!O.tripSoft;
  const tk = `${palKey}:${mixA}`, T = { done: false, row: 0, ms: 0, palKey, tk }; let src = null;
  T.step = (budget, now) => { const t0 = now(); if (!src && mixA < 1) src = J.cv.getContext('2d').getImageData(0, 0, W, H).data; const ia = 1 - mixA;
    while (T.row < H) { const y1 = Math.min(H, T.row + 16);
      for (let i = T.row * W, e = y1 * W; i < e; i++) { const a = J.ea[i]; if (!a) continue; const Lr = J.lu[i] / 255, bv0 = J.bv[i] / 256, bv = bv0 + (O.tripLight != null ? O.tripLight : 1.2) * (Lr - .5), bi = Math.floor(bv), f = bv - bi, c0 = C[(((bi + off) % nc) + nc) % nc], c1 = C[(((bi + 1 + off) % nc) + nc) % nc], t = f * f * (3 - 2 * f);   // colour flows continuously with altitude AND light (no flat bands)
        const fb = bv0 - Math.floor(bv0), tl = 255 * (.04 + 1.15 * Lr), cr = c0[0] + (c1[0] - c0[0]) * t, cg = c0[1] + (c1[1] - c0[1]) * t, cb = c0[2] + (c1[2] - c0[2]) * t, cl = c0[3] + (c1[3] - c0[3]) * t, sc = Math.min(3, tl / cl);
        const o = i * 4; let R, G, B;
        if (soft) { const fl = (fb - .5) / .11, ln = lineK * Math.exp(-fl * fl) * Lr * Lr;   // soft: light catching the terraces (lit faces only, palette-tinted, no white, no outline)
          R = cr * sc; G = cg * sc; B = cb * sc; R += (c1[0] * .5 + R * .5) * ln; G += (c1[1] * .5 + G * .5) * ln; B += (c1[2] * .5 + B * .5) * ln; }
        else { const fl = (fb - .5) / .03, ln = lineK * Math.exp(-fl * fl) * (.25 + Lr);
          R = cr * sc + (c1[0] * .6 + 100) * ln; G = cg * sc + (c1[1] * .6 + 100) * ln; B = cb * sc + (c1[2] * .6 + 100) * ln; }
        if (src) { R = src[o] * ia + R * mixA; G = src[o + 1] * ia + G * mixA; B = src[o + 2] * ia + B * mixA; } d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = src ? src[o + 3] : a; }
      T.row = y1; if (now() - t0 > budget) break; }
    T.ms += now() - t0; if (T.row >= H) { tx.putImageData(id, 0, 0); J.tk = tk; T.done = true; } return T.done; };
  return T; }
// the spin-independent half of a lit disc, per (R, tilt, light): a few MB at the biggest rung, LRU of 6
const GEO = new Map();
function geoOf(R, tilt, L, O) { const key = `${R}:${tilt.toFixed(3)}:${L.map(v => v.toFixed(3)).join(',')}:${O.terminator}:${O.limb}:${O.twilight}:${O.glint}:${O.edgeAA !== false}`; let G = GEO.get(key);
  const AA = O.edgeAA !== false, rIn = AA ? Math.pow((R + .5) / R, 2) : 1;   // edgeAA: pixels whose centre is up to .5 px outside get coverage alpha (inside the bake box: px < D)
  if (G) { GEO.delete(key); GEO.set(key, G); return G; }
  const D = R * 2, ca = Math.cos(tilt), sa = Math.sin(tilt), [lx, ly, lz] = L, hz0 = lz + 1, hn = Math.hypot(lx, ly, hz0), Hx = lx / hn, Hy = ly / hn, Hz = hz0 / hn;
  let n = 0; for (let py = 0; py < D; py++) for (let px = 0; px < D; px++) { const nx = (px + .5 - R) / R, ny = (py + .5 - R) / R; if (nx * nx + ny * ny < rIn) n++; }
  const F = () => new Float32Array(n); G = { n, o: new Uint32Array(n), uf: F(), vf: F(), ndg: F(), inv: F(), day: F(), amb: F(), limb: F(), tw: F(), sp: F(), fr: F(), cli: F(), hz: F(), ea: F(), eL: F(), eDot: F(), nDot: F(), eN: F(), lnmu: F() };
  let k = 0;
  for (let py = 0; py < D; py++) for (let px = 0; px < D; px++) { let nx = (px + .5 - R) / R, ny = (py + .5 - R) / R, rr = nx * nx + ny * ny; if (rr >= rIn) continue;
    const cov = AA ? Math.max(0, Math.min(1, R - Math.sqrt(rr) * R + .5)) : 1; if (AA && rr > .9999) { const q = Math.sqrt(.9999 / rr); nx *= q; ny *= q; rr = .9999; }   // edge pixels shade as the limb itself
    const mu = Math.sqrt(1 - rr), qx = nx * ca + ny * sa, qy = -nx * sa + ny * ca, lat = Math.asin(Math.max(-1, Math.min(1, -qy))), lon0 = Math.atan2(mu, qx);
    const ndg = nx * lx + ny * ly + mu * lz, day = smooth(-O.terminator * .5, O.terminator, ndg), cl = Math.max(.15, Math.cos(lat));
    const ex = -Math.sin(lon0) * ca, ey = -Math.sin(lon0) * sa, ez = Math.cos(lon0), nxx = ny * ez - mu * ey, nyy = mu * ex - nx * ez, nzz = nx * ey - ny * ex;
    G.o[k] = (py * D + px) * 4; G.uf[k] = lon0 / TAU; G.vf[k] = Math.max(0, (lat + Math.PI / 2) / Math.PI); G.ndg[k] = ndg; G.inv[k] = 1 / Math.max(.08, ndg + .08);
    G.day[k] = day; G.amb[k] = Math.min(1, ndg * 1.6 + .25); G.limb[k] = mu; G.lnmu[k] = Math.log(Math.max(1e-6, mu)); const tq = (ndg - .02) / .09; G.tw[k] = Math.exp(-tq * tq) * O.twilight;
    G.sp[k] = Math.pow(Math.max(0, nx * Hx + ny * Hy + mu * Hz), 90) * O.glint * 2.4 * day; G.fr[k] = Math.pow(1 - mu, 5) * .5 * day;
    G.cli[k] = smooth(-.12, .35, ndg); G.hz[k] = Math.pow(1 - mu, 2.2) * .85 * smooth(-.2, .5, ndg); G.ea[k] = AA ? cov : mu < .03 ? mu / .03 : 1;
    G.eL[k] = 1 / cl; G.eDot[k] = ex * lx + ey * ly + ez * lz; G.nDot[k] = nxx * lx + nyy * ly + nzz * lz; G.eN[k] = 1; k++; }
  G.vlat = true; GEO.set(key, G); while (GEO.size > 6) GEO.delete(GEO.keys().next().value); return G; }
// air colour: blue-ish for rock / ocean worlds, paler for ice, the band colour for giants (tinted later by the palette)
export function atmoColOf(S, P) { const b = [110, 160, 255], ice = [190, 220, 255], gas = P.gasA || [230, 200, 160];
  return [0, 1, 2].map(k => b[k] * (S.rock + S.ocean) + ice[k] * S.ice + gas[k] * S.gas); }
// 3. air rim (outside + just inside the limb), forward-scattered toward the star, warm at the terminator. Baked per bucket.
// the rim split by colour so a palette change never re-bakes it: contribution = A*side*col + A*term*T (T = the warm terminator
// scatter). m1 = white with alpha A*side (tinted at draw time: copy + 'source-in' fill, ~0.3 ms, only when the colour key moves),
// m2 = T with alpha A*term (the earlier single-colour paintAtmo formula, split).
function maskRows(d1, d2, D, R, L, atmo, y0, y1) { const c = D / 2, l2 = Math.hypot(L[0], L[1]) || 1, ux = L[0] / l2, uy = L[1] / l2, th = .06 + .1 * atmo, sz = Math.sqrt(1 - Math.min(1, L[2] * L[2])), e = c / R;   // e: the sprite edge in radii; the glow is windowed to 0 before it (no box edge)
  for (let py = y0; py < y1; py++) for (let px = 0; px < D; px++) { const dx = (px + .5 - c) / R, dy = (py + .5 - c) / R, rr = Math.hypot(dx, dy), o = (py * D + px) * 4;
    const out = (rr >= 1 ? Math.exp(-(rr - 1) / th) : Math.pow(rr, 10) * .9) * (1 - smooth(e - .14, e, rr)); if (out < .004) { d1[o + 3] = 0; d2[o + 3] = 0; continue; }
    const fw = (dx * ux + dy * uy) / (rr || 1), side = smooth(-.45, .7, fw * sz + L[2] * .6), tq = (fw + .05) / .3, term = Math.exp(-tq * tq) * (1 - L[2]), A = Math.min(1, out * (side + .25 * term) * atmo);
    d1[o] = d1[o + 1] = d1[o + 2] = 255; d1[o + 3] = 255 * A * side; d2[o] = 230; d2[o + 1] = 120; d2[o + 2] = 60; d2[o + 3] = 255 * Math.min(1, A * term); } }
function maskJob(w, R, L, atmo, mk) { const c1 = mk(w, w), c2 = mk(w, w); let i1 = null, i2 = null;
  const J = { c1, c2, done: false, row: 0, ms: 0, w };
  J.step = (budget, now) => { const t0 = now(); if (!i1) { i1 = c1.getContext('2d').createImageData(w, w); i2 = c2.getContext('2d').createImageData(w, w); }
    while (J.row < w) { const y1 = Math.min(w, J.row + 8); maskRows(i1.data, i2.data, w, R, L, atmo, J.row, y1); J.row = y1; if (now() - t0 > budget) break; }
    J.ms += now() - t0; if (J.row >= w) { c1.getContext('2d').putImageData(i1, 0, 0); c2.getContext('2d').putImageData(i2, 0, 0); i1 = i2 = null; J.done = true; } return J.done; };
  return J; }
// tint a mask pair into scratch canvas s (reused): the colour part tinted, plus the terminator part, premultiplied by 'lighter'
function tintRim(s, J, col) { const x = s.getContext('2d'); x.globalCompositeOperation = 'copy'; x.globalAlpha = 1; x.drawImage(J.c1, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; x.fillRect(0, 0, s.width, s.height);
  x.globalCompositeOperation = 'lighter'; x.drawImage(J.c2, 0, 0); x.globalCompositeOperation = 'source-over'; }
// ---------------------------------------------------------------------------------------------------------------------------
export function createPlanets({ sprites, makeCanvas, opts = {}, now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) }) {
  const O = { ...PLANET_OPTS, ...opts }, texs = new Map(), discs = new Map(), jobs = [], st8 = { texMs: 0, discMs: 0, discBakes: 0, texBakes: 0, draws: 0, dropped: 0, blit1: 0, rimMs: 0, rimBakes: 0, tints: 0, tripMs: 0, tripBakes: 0 };
  const bucketR = (r, q) => { const s = Math.max(2, Math.min(8, Math.round(Math.log2(Math.max(4, r)) * 2) / 2)); return Math.min(O.maxR[q], Math.round(Math.pow(2, s))); };
  // texture per planet seed: draft (64x32) first, then the rung's full size; both are idle jobs (the draft first in the queue)
  const texOf = (p, q) => { const k = p.seed >>> 0; let e = texs.get(k); if (!e) { e = { draft: bakeTexJob(p, 64, 32), full: null, q: -1 }; texs.set(k, e); jobs.unshift({ kind: 'tex', j: e.draft }); }
    const [w, h] = O.tex[q]; if (!e.full || (e.full.w !== w && e.full.done && e.q > q)) { e.full = bakeTexJob(p, w, h); e.q = q; jobs.push({ kind: 'tex', j: e.full }); }
    return e.full.done ? e.full : e.draft.done ? e.draft : null; };
  // lit disc per (seed, R, spin step, light bucket, heal bucket, season bucket); LRU through its own byte cap
  const capBytes = O.capBytes || (24 << 20); let bytes = 0;
  const keep = (k, v) => { discs.set(k, v); bytes += v.b; for (const [kk, vv] of discs) { if (bytes <= capBytes || discs.size <= 2) break; if (vv.busy || vv.want >= P.fno - 1) continue; discs.delete(kk); bytes -= vv.b; } };
  const lightOf = (p, x, y, r, st) => { let lx, ly, lz;
    if (st && st.light && typeof st.light.x === 'number') { lx = st.light.x - x; ly = st.light.y - y; const d = Math.hypot(lx, ly) || 1; lx /= d; ly /= d; lz = O.lightZ; }
    else if (typeof p.lightAng === 'number') { lx = Math.cos(p.lightAng); ly = Math.sin(p.lightAng); lz = O.lightZ; }
    else if (st && Array.isArray(st.lightDir)) { lx = st.lightDir[0]; ly = -st.lightDir[1]; lz = st.lightDir[2]; }
    else { lx = Math.cos(-2.25); ly = Math.sin(-2.25); lz = O.lightZ; }
    const a = Math.round(Math.atan2(ly, lx) / TAU * LB), zb = Math.round(Math.max(-.9, Math.min(.9, lz)) * 5);
    const an = a / LB * TAU, zz = zb / 5, k = Math.sqrt(1 - zz * zz); return { key: `${(a % LB + LB) % LB}:${zb}`, L: [Math.cos(an) * k, Math.sin(an) * k, zz] }; };
  const big = new Map(), P = { O, st: st8, texs, discs, jobs, fno: 0, stab: new Map(), big };
  const done = J => { if (J.kind === 'tex') { st8.texMs += J.j.ms; st8.texBakes++; } else if (J.kind === 'spr') { st8.rimMs += J.j.ms; st8.rimBakes++; } else if (J.kind === 'tint') { st8.tripMs += J.j.ms; st8.tripBakes++; J.e.tintJ = null; }
    else { st8.discMs += J.j.ms; st8.discBakes++; J.e.ready = true; J.e.busy = false; const l = P.last.get(J.e.seed); if (!l || !l.ready || l.want <= J.e.want) P.last.set(J.e.seed, J.e); } };
  // once per frame (look.frame): drop UNSTARTED disc / tint / rim jobs nobody asked for lately (a turning planet moved past them)
  P.tick = () => { P.fno++;
    for (let i = jobs.length - 1; i >= 0; i--) { const J = jobs[i]; if ((J.kind === 'disc' || J.kind === 'tint') && J.e.want < P.fno - 2 && !(J.j.row > 0)) { jobs.splice(i, 1);
        if (J.kind === 'disc') { if (discs.get(J.e.k) === J.e) { discs.delete(J.e.k); bytes -= J.e.b; } } else J.e.tintJ = null; st8.dropped++; }
      else if (J.kind === 'spr' && J.j.want < P.fno - 30 && !(J.j.row > 0)) { jobs.splice(i, 1); for (const [k, v] of big) if (v === J.j) big.delete(k); } } };
  // run bake jobs for up to budget ms (idle slices; or inside the frame in bake mode 'frame')
  P.pump = (q = 0, budget = O.bakeMs[q]) => { const t0 = now();
    while (jobs.length && now() - t0 < budget) { const J = jobs[0], b = budget - (now() - t0); if (J.j.step(b, now)) { jobs.shift(); done(J); } } return now() - t0; };
  P.flush = () => { while (jobs.length) P.pump(0, 1e9); };
  // draw. ctx = { q, heal, trip, swell, tripCols, flareCol, burst, starRGB, palKey, season, takeover }. Never bakes: only blits.
  P.draw = (c, p, x, y, r, st, ctx) => { if (!p || !(r > 0) || !isFinite(x) || !isFinite(y)) return false; const q = ctx.q | 0; st8.draws++;
    // size: a planet that holds still on screen is baked at its exact DEVICE radius and blitted 1:1 (crisp + ~10x cheaper on a CPU
    // rasteriser); while it zooms it uses the power-of-root-2 buckets, scaled, and settles back to exact after O.settle frames
    const m = devOf(c), dpr = m ? m.a : 1, Rd = Math.round(r * dpr), seed = p.seed >>> 0, sk = P.stab.get(seed);
    if (!sk) P.stab.set(seed, { Rd, n: O.settle }); else if (sk.Rd !== Rd) { sk.Rd = Rd; sk.n = 0; } else sk.n++;
    const exact = !!m && Rd >= 8 && Rd <= O.maxR[q] && (!sk || sk.n >= O.settle), rr = exact ? Rd / dpr : r;
    const T = texOf(p, q), R = exact ? Rd : bucketR(r * dpr, q), lt = lightOf(p, x, y, r, st);
    const ga = c.globalAlpha, gco = c.globalCompositeOperation;
    const fallback = () => { const a = T ? T.P.rock : paletteOf(p).rock, g = c.createRadialGradient(x + lt.L[0] * r * .4, y + lt.L[1] * r * .4, r * .1, x, y, r); g.addColorStop(0, `rgb(${a[0]},${a[1]},${a[2]})`); g.addColorStop(1, 'rgb(4,5,8)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
    if (!T) { fallback(); return true; }   // first frames of a never-seen planet: a lit stand-in in its mean colour (never missing)
    const S = T.S, day = typeof p.day === 'number' && p.day > 0 ? p.day : 60 + 240 * rand01(seed, 77), spin = typeof p.spin === 'number' ? p.spin : ((st && st.t) || 0) / day + rand01(seed, 78);
    const nS = Math.max(24, Math.min(O.spinMax, Math.round(TAU * R / O.spinPx))), sf = (spin % 1 + 1) % 1 * nS, si = Math.floor(sf), fw = O.spinFade != null ? O.spinFade : .6, fr = Math.max(0, (sf - si - (1 - fw)) / fw);   // each step holds, then crossfades over the last spinFade of it (second blit only then)
    const tilt = typeof p.tilt === 'number' ? p.tilt : (rand01(seed, 79) - .5) * .7, hb = Math.round(clamp01(ctx.heal) * (O.healBuckets - 1)), heal = hb / (O.healBuckets - 1);
    const sb = ctx.season == null ? 0 : Math.round(Math.max(-1, Math.min(1, ctx.season)) * O.seasonBuckets), season = sb / O.seasonBuckets;
    const TB = O.tripBuckets || 12, ab = ctx.tripCols ? Math.round(Math.min(1, ctx.trip || 0) * (ctx.takeover != null ? ctx.takeover : .85) * TB) / TB : 0, wantTrip = ab > 0, wk = `${ctx.palKey}:${ab}`;
    const snR = typeof p.snowLine === 'number' ? p.snowLine : null, snB = snR == null ? null : Math.round(snR * 40) / 40;   // Game Dev's per-planet snow line (h units at the equator)
    const keyOf = s => `${seed}:${T.w}:${R}:${s}:${lt.key}:${hb}:${sb}:${(ctx.starKey || 0)}:${snB}`;
    const get = (s, make = true) => { s = ((s % nS) + nS) % nS; const k = keyOf(s); let e = discs.get(k); if (e) { discs.delete(k); discs.set(k, e); e.want = P.fno; return e; } if (!make) return null;
      e = { k, seed, want: P.fno, ready: false, busy: true, b: R * R * 4 * 8, j: null, tintJ: null }; e.j = discJob(T, R, s / nS, tilt, lt.L, heal, season, ctx.starRGB || [255, 246, 236], { ...O, atmoK: typeof p.atmo === 'number' ? p.atmo : O.atmo * (1 - .6 * S.gas) + .2, snowH: snB, seaH: T.seaLv }, makeCanvas);
      keep(k, e); jobs.push({ kind: 'disc', j: e.j, e }); return e; };
    const cur = get(si), nxt = get(si + 1);
    if (cur.ready && nxt.ready) get(si + 2);   // pre-bake one phase ahead: the crossfade never waits
    // trippy colour per disc: re-coloured (idle job) when the palette moves; the previous colouring keeps showing meanwhile
    const tint = e => { if (!wantTrip || !e || !e.ready) return null; if (e.j.tk !== wk && !e.tintJ) { e.tintJ = tintJob(e.j, ctx.tripCols, ctx.palKey, O, makeCanvas, ab); jobs.unshift({ kind: 'tint', j: e.tintJ, e }); }
      return e.j.tk != null ? e.j.tc : null; };
    const img = e => (wantTrip && tint(e)) || e.j.cv;   // trippy: the mixed sprite (one blit), else the real disc
    // show: the current phase crossfaded into the next; while a phase bakes, the last finished one keeps showing
    const A = cur.ready ? cur : P.last.get(seed), B = A === cur && nxt.ready && fr > .02 ? nxt : null; if (cur.ready) P.last.set(seed, cur);
    if (A && A.ready) { st8.blit1 += blit(c, img(A), x - rr, y - rr, rr * 2, rr * 2, m); if (B) { const ib = img(B); if (!wantTrip || ib !== B.j.cv || img(A) === A.j.cv) { c.globalAlpha = ga * fr; blit(c, ib, x - rr, y - rr, rr * 2, rr * 2, m); c.globalAlpha = ga; } } }
    else fallback();
    // air rim (+ big-event brightening, + the limb flare in the jam's colours)
    const atmo = (typeof p.atmo === 'number' ? p.atmo : O.atmo * (1 - .5 * S.gas) + .15), ac = atmoColOf(S, T.P), tn = ctx.atmoTint || null, col = tn ? ac.map((v, k) => v + (tn[k] - v) * Math.min(.6, ctx.trip * .6)) : ac;
    const sw = ctx.swell || 0, fc = sw > .02 && ctx.flareCol ? ctx.flareCol : null, col2 = fc ? col.map((v, k) => v + (fc[k] - v) * Math.min(.75, sw * O.flareK * .6)) : col;   // big event: the limb flares in the jam's colour (same rim, one blit)
    const AR = Math.min(R, 128), aw = Math.ceil(AR * 2 * 1.35), cq = col2.map(v => (v >> 5) * 32 + 16), am = Math.min(1.5, atmo);
    // rim masks per (light key, size, strength): baked as idle jobs (exact size for a settled planet, else the bucket size); the last
    // finished pair keeps showing meanwhile. The colour is applied by tintRim into a per-planet scratch only when its key changes.
    const rim = (key, slot, LL, cc, a) => { const ew = exact ? Math.round(R * 2.7) : aw, rR = exact ? R : AR, k2 = `${key}:${ew}`; let J = big.get(k2);
      if (!J) { J = maskJob(ew, rR, LL, a, makeCanvas); J.want = P.fno; big.set(k2, J); jobs.push({ kind: 'spr', j: J });
        while (big.size > O.bigRims) { const k0 = big.keys().next().value, J0 = big.get(k0); if (!J0.done) break; big.delete(k0); } }
      else { J.want = P.fno; big.delete(k2); big.set(k2, J); }
      const l = P.lastRim.get(slot); let use = J.done ? J : l && l.J ? l.J : null; if (!use) return null;
      let sc = l && l.cv.width === use.w ? l : null; if (!sc) { sc = { cv: makeCanvas(use.w, use.w), J: null, ck: '' }; P.lastRim.set(slot, sc); }
      const ck2 = cc.join(','); if (sc.J !== use || sc.ck !== ck2) { tintRim(sc.cv, use, cc); sc.J = use; sc.ck = ck2; st8.tints++; }
      return sc.cv; };
    const as = rim(`patmo:${lt.key}:${Math.round(atmo * 8)}`, `a${seed}`, lt.L, cq, am);
    if (as) {
      const kk = rr * 1.35; c.globalCompositeOperation = 'lighter'; c.globalAlpha = ga * Math.min(1, .85 * (1 + .8 * (ctx.burst || 0) + .9 * sw)); st8.blit1 += blit(c, as, x - kk, y - kk, kk * 2, kk * 2, m);
      c.globalCompositeOperation = gco; c.globalAlpha = ga; }
    return true; };
  P.last = new Map(); P.lastRim = new Map();
  P.stats = () => ({ textures: texs.size, discs: discs.size, discKB: Math.round(bytes / 1024), jobs: jobs.length, ...st8 });
  return P; }
