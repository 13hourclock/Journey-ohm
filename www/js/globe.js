// GLOBE (world track, real planet step 1): the planet as a real seeded sphere. Pure (no DOM): the main thread uses it for the
// walkable path (the great circle you walk, = sim.groundAt) and the weather at your spot; globe_worker.js uses the same code for the
// terrain chunks, so the ground you walk on and the land you see are one surface.
// Quotes behind it (PLAN_REAL_PLANET.md 2): "procedurally generated planet" (10:13 AM Oct 25), "Actual 3d" (9:49 PM Oct 24),
// "Planets feel large and fully explorable; changes persist", "Wind, water, caves and more", "Environments are blended fields",
// "I also want terrain deformation and a dynamic environment" (9:56 PM Oct 24). Rivers, erosion, snow and shadows ON (10:30 AM Oct 25).
// Heights are in "h units" (the same scale as the old ground: about -1.5 .. 1.5, sea level G.sea); the 3D mesh uses r = 1 + KH*h.
import { makeNoise } from './noise.js';
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const GLOBE_DEF = { rivers: true, erosion: true, snow: true, lakes: true, caves: true, size: 40 };   // size = surface widths per size class (T15 "large")
// per-planet parameters from its seed + terrain style (style = {rock, ocean, ice, gas}, continuous weights)
// amp = the home layer's amplitude: one h unit is 1.8*amp of the screen height on the 2D ground, so the 3D land uses the same
// proportion (KH = radius units per h unit, at a 412x915 phone: 915/412 = 2.22 heights per width)
export function globeParams(seed, style, wet, C, opts = GLOBE_DEF, hue = 0, amp = .06) { const Cs = Math.round(C * (opts.size || 40));
  return { seed: seed >>> 0, style, wet, C, Cs, opts: { ...GLOBE_DEF, ...opts }, hue, amp, KH: 1.8 * amp * 2.22 * (Math.PI * 2 / Cs) }; }
export function makeGlobe(P) {
  const N = makeNoise(P.seed), r = N.rnd, { n3, fbm, ridged } = N, st = P.style, O = P.opts, Cs = P.Cs, TAU = Math.PI * 2;
  const G = { P, Cs, TAU }, fw = Cs / TAU;
  // offsets so each field reads a different part of the noise
  const of = []; for (let i = 0; i < 16; i++) of.push([r() * 200 - 100, r() * 200 - 100, r() * 200 - 100]);
  // spin axis = +z. The walked path = a great circle tilted from the equator (seeded): walking far enough crosses climates.
  const tilt = .5 + r() * .7, az = r() * TAU;
  const n = [Math.sin(tilt) * Math.cos(az), Math.sin(tilt) * Math.sin(az), Math.cos(tilt)];
  let e1 = [-Math.sin(az), Math.cos(az), 0]; const e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
  G.e1 = e1; G.e2 = e2; G.n = n;   // path(θ) = cos θ e1 + sin θ e2; across (+) = toward n (into the screen in the ground view)
  G.axialTilt = r() * .45; G.dayBars = 48 + ((r() * 6) | 0) * 16;   // a day is a whole number of bars (on the music clock)
  const relief = .55 + .6 * st.rock + .45 * st.ice - .35 * st.gas, bias = -.55 * (P.wet - .35) - .15 * st.gas;
  const o = {};
  // the raw surface at unit direction (x,y,z). Writes o.h (h units), o.wl (water surface or -1e9), o.river, o.lake, o.temp, o.moist
  G.sample = (x, y, z, out = o) => {
    const w0 = of[0], w1 = of[1], w2 = of[2], ws = .42;
    const qx = x * 1.25 + ws * n3(x * 1.4 + w0[0], y * 1.4 + w0[1], z * 1.4 + w0[2]), qy = y * 1.25 + ws * n3(x * 1.4 + w1[0], y * 1.4 + w1[1], z * 1.4 + w1[2]), qz = z * 1.25 + ws * n3(x * 1.4 + w2[0], y * 1.4 + w2[1], z * 1.4 + w2[2]);
    const a = of[3], cont = fbm(qx + a[0], qy + a[1], qz + a[2], 5) * 2.1 + bias;
    const b = of[4], hills = fbm(qx * 6 + b[0], qy * 6 + b[1], qz * 6 + b[2], 4) * .3;
    const land = ss(-.05, .45, cont), mm = land * relief;
    const c = of[5], rid = mm > .02 ? ridged(qx * 3.1 + c[0], qy * 3.1 + c[1], qz * 3.1 + c[2], 6) : 0;
    let h = cont * .7 + (rid - .3) * 2.1 * mm + hills * (.45 + .55 * mm);
    // local relief at walking scale (frequencies tied to one home width, fw per radian): the hills and dips of every screen,
    // the same size as the old ground's (its 3 waves summed to about +-1), rougher on rock and in mountains, softer on sea floors
    const d = of[6], k1 = fw * .55, k2 = fw * 1.3, k3 = fw * 3.1, lr = (cont > -.1 ? 1 : .55) * (.7 + .5 * st.rock + .6 * mm - .4 * st.gas);
    h += lr * (n3(x * k1 + d[0], y * k1 + d[1], z * k1 + d[2]) * .95 + n3(x * k2 + d[1], y * k2 + d[2], z * k2 + d[0]) * .45 * (.5 + st.rock) + n3(x * k3 + d[2], y * k3 + d[0], z * k3 + d[1]) * .18 * (.4 + st.rock));
    if (h > 2.2) h = 2.2 + (h - 2.2) * .45;
    if (O.erosion && mm > .02) {   // T8 erosion: dendritic valleys cut into the mountains + softened lowlands
      const e = of[7], v = Math.abs(n3(qx * 5.2 + e[0], qy * 5.2 + e[1], qz * 5.2 + e[2]) + .35 * n3(qx * 13 + e[1], qy * 13 + e[2], qz * 13 + e[0]));
      h -= (1 - ss(0, .2, v)) * mm * .55 * ss(.1, .8, h); }
    h = h * (1 - .7 * st.gas);
    out.river = 0; out.lake = 0; out.wl = -1e9;
    if (O.rivers && P.wet > .08) {   // T7 rivers: channels along noise valleys, deepest where they near the sea
      const f = of[8], rv = Math.abs(n3(qx * 2.3 + f[0], qy * 2.3 + f[1], qz * 2.3 + f[2]) + .12 * n3(qx * 11 + f[1], qy * 11 + f[2], qz * 11 + f[0])), wdt = .03 + .03 * P.wet;
      const k = 1 - ss(0, wdt * 2.6, rv), above = h - G.sea;
      if (k > 0 && above > -.05) { const depth = .22 + .2 * ss(1, 0, above); h -= k * depth * ss(-.05, .15, above); if (rv < wdt * .55) { out.river = 1 - rv / (wdt * .55); out.wl = h + .03 + .02 * out.river; } } }
    if (O.lakes && P.wet > .1) {   // lakes in basins above the sea
      const g = of[9], lb = n3(qx * 3.4 + g[0], qy * 3.4 + g[1], qz * 3.4 + g[2]);
      if (lb > .45 && G.sea > -1e8) { const s = ss(.45, .6, lb), surf = G.sea + .18 + cont * .25; if (surf > G.sea + .1) { h = h * (1 - s) + Math.min(h, surf - .1 - .3 * s) * s; if (h < surf) { out.lake = s; out.wl = Math.max(out.wl, surf); } } } }
    if (G.sea > -1e8 && h < G.sea) out.wl = Math.max(out.wl, G.sea);
    const lat = Math.abs(z), alt = Math.max(0, h - (G.sea > -1e8 ? G.sea : -1)), tn = of[10], mn = of[11];
    out.temp = clamp(1.05 - 1.15 * Math.pow(lat, 1.3) - .28 * alt + .14 * n3(x * 2.2 + tn[0], y * 2.2 + tn[1], z * 2.2 + tn[2]) - .4 * st.ice + .1 * st.rock);
    out.moist = clamp(.45 + .38 * fbm(x * 1.8 + mn[0], y * 1.8 + mn[1], z * 1.8 + mn[2], 3) + .5 * (P.wet - .35) - .12 * Math.max(0, alt - .6) + .25 * out.river + .2 * out.lake);
    out.h = h; return out; };
  // sea level: the height under the wanted fraction of the sphere (wet worlds have seas; dry ones none)
  G.sea = -1e9; { const frac = P.wet > .14 ? clamp(.2 + .7 * P.wet, .15, .8) : 0;
    if (frac > 0) { const hs = [], t = {}, rr = makeNoise(P.seed ^ 0x5ea).rnd; for (let i = 0; i < 1600; i++) { const zz = rr() * 2 - 1, ph = rr() * TAU, s = Math.sqrt(1 - zz * zz); G.sample(s * Math.cos(ph), s * Math.sin(ph), zz, t); hs.push(t.h); }
      hs.sort((a, b) => a - b); G.sea = hs[Math.floor(frac * hs.length)]; } }
  // material weights (continuous, sum 1) from the climate + slope: m0 = rock soil veg sand, m1 = wet ice (hollow crack come from the path)
  G.mats = (s, slope, m) => { const alt = s.h - (G.sea > -1e8 ? G.sea : -3);
    const ice = O.snow ? ss(.3, .1, s.temp) * (1 - ss(.9, 1.4, slope) * .7) : 0;
    const rock = clamp(ss(.5, 1.05, slope) + ss(1.1, 1.8, alt) * .6 + st.rock * .15);
    const sand = clamp((1 - ss(.02, .14, alt)) * (alt > -.4 ? 1 : .4) + ss(.62, .82, s.temp) * ss(.35, .12, s.moist) + st.gas * .2);
    const veg = ss(.28, .55, s.moist) * ss(.12, .32, s.temp) * (1 - ss(.85, 1, s.temp) * .6) * (1 - ss(.7, 1.1, slope)) * (1 - st.gas * .8);
    const wet = clamp(ss(.62, .9, s.moist) * .6 + s.river * .5 + s.lake * .4);
    let soil = .22, sum = rock + soil + veg + sand + wet + ice; const k = 1 / sum;
    m[0] = rock * k; m[1] = soil * k; m[2] = veg * k; m[3] = sand * k; m[4] = wet * k; m[5] = ice * k; return m; };
  // palette: 5 colours (rock, soil, veg, sand, ice) + sea, drawn from the seed, kept within believable ranges
  const hsl = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)]; };
  const rh = (P.hue || 0) + (r() - .5) * 60;
  G.palette = [hsl(20 + (r() - .5) * 50 + st.ice * 160, .1 + .15 * r(), .32 + .12 * r()), hsl(28 + (r() - .5) * 30, .35 + .2 * r(), .22 + .1 * r()),
    hsl((r() < .7 ? 95 + (r() - .5) * 70 : rh) , .35 + .3 * r(), .22 + .12 * r()), hsl(38 + (r() - .5) * 20, .4 + .2 * r(), .55 + .12 * r()), hsl(205 + (r() - .5) * 20, .25, .9)];
  G.seaColor = hsl(200 + (r() - .5) * 50, .55 + .2 * r(), .18 + .08 * r()); G.atmo = clamp(.35 + .5 * r() + .3 * st.gas - .2 * st.rock); G.skyHue = 205 + (r() - .5) * 70;
  G.cloud = clamp(.2 + .6 * P.wet + .3 * st.gas - .1 * st.rock);
  // ---- the walked path ----
  G.dirOf = (u, a, out) => { const th = u / Cs * TAU, c = Math.cos(th), s = Math.sin(th), ca = Math.cos(a), sa = Math.sin(a);
    out[0] = (c * e1[0] + s * e2[0]) * ca + n[0] * sa; out[1] = (c * e1[1] + s * e2[1]) * ca + n[1] * sa; out[2] = (c * e1[2] + s * e2[2]) * ca + n[2] * sa; return out; };
  G.uOfDir = (x, y, z, out) => { const a = Math.asin(clamp(x * n[0] + y * n[1] + z * n[2], -1, 1)), px = x * e1[0] + y * e1[1] + z * e1[2], py = x * e2[0] + y * e2[1] + z * e2[2];
    let th = Math.atan2(py, px); if (th < 0) th += TAU; out.u = th / TAU * Cs; out.a = a; return out; };
  G.radPerW = TAU / Cs; G.KH = P.KH;   // radians per home width
  // path heights, cached lazily in chunks of 4 widths (SPU samples per width)
  const SPU = G.SPU = 32, CH = 4, chunks = new Map(), tmp = [0, 0, 0], ts = {};
  const chunk = ci => { let a = chunks.get(ci); if (a) return a; a = new Float32Array(CH * SPU + 1); const wl = new Float32Array(CH * SPU + 1);
    for (let i = 0; i <= CH * SPU; i++) { G.dirOf(ci * CH + i / SPU, 0, tmp); G.sample(tmp[0], tmp[1], tmp[2], ts); a[i] = ts.h; wl[i] = ts.wl; } a.wl = wl; chunks.set(ci, a); return a; };
  const nch = Math.ceil(Cs / CH);
  const look = (u, w) => { u = ((u % Cs) + Cs) % Cs; const x = u / CH, ci = Math.min(nch - 1, x | 0), a = chunk(ci), f = (u - ci * CH) * SPU, i = Math.min(CH * SPU - 1, f | 0), fr = f - i, arr = w ? a.wl : a; return arr[i] + (arr[i + 1] - arr[i]) * fr; };
  // ---- the land behind the path (1a depth layers): lanes at d widths behind (across +n), coarser (8 samples a width), lazily
  // cached per 4-width chunk. Each sample: height + water surface + its material mix (for the side view colours)
  const lanes = new Map(), LS = 8, mtmp = [0, 0, 0, 0, 0, 0];
  const laneChunk = (d, ci) => { let L = lanes.get(d); if (!L) { L = new Map(); lanes.set(d, L); if (lanes.size > 40) lanes.delete(lanes.keys().next().value); }
    let a = L.get(ci); if (a) return a; const n = CH * LS + 1; a = { h: new Float32Array(n), wl: new Float32Array(n), m: new Uint8Array(n * 6), rv: new Float32Array(n), mo: new Float32Array(n) };
    const an = d * G.radPerW;
    const sv = []; for (let i = 0; i < n; i++) { G.dirOf(ci * CH + i / LS, an, tmp); G.sample(tmp[0], tmp[1], tmp[2], ts); a.h[i] = ts.h; a.wl[i] = ts.wl; a.rv[i] = ts.river || 0; a.mo[i] = ts.moist || 0; sv.push({ h: ts.h, temp: ts.temp, moist: ts.moist, river: ts.river, lake: ts.lake }); }
    for (let i = 0; i < n; i++) { const sl = Math.abs(a.h[Math.min(n - 1, i + 1)] - a.h[Math.max(0, i - 1)]) * LS / 2; G.mats(sv[i], sl, mtmp); for (let k = 0; k < 6; k++) a.m[i * 6 + k] = mtmp[k] * 255; }
    L.set(ci, a); if (L.size > 64) L.delete(L.keys().next().value); return a; };
  const lo = { h: 0, wl: 0, m: null, i: 0, river: 0, moist: 0 };
  // d = widths behind the path (0 = the path itself at the coarse rate); writes lo.h, lo.wl, lo.m (Uint8 x6 at lo.i)
  G.lane = (d, u) => { u = ((u % Cs) + Cs) % Cs; const x = u / CH, ci = Math.min(nch - 1, x | 0), a = laneChunk(d, ci), f = (u - ci * CH) * LS, i = Math.min(CH * LS - 1, f | 0), fr = f - i;
    if (fr > .25 * LS && f > CH * LS * .5) want(d, (ci + 1) % nch); else if (f < CH * LS * .5) want(d, (ci + nch - 1) % nch);
    lo.h = a.h[i] + (a.h[i + 1] - a.h[i]) * fr; lo.wl = a.wl[i] > -1e8 && a.wl[i + 1] > -1e8 ? a.wl[i] + (a.wl[i + 1] - a.wl[i]) * fr : -1e9; lo.m = a.m; lo.i = (fr < .5 ? i : i + 1) * 6; lo.river = a.rv[i] + (a.rv[i + 1] - a.rv[i]) * fr; lo.moist = a.mo[i] + (a.mo[i + 1] - a.mo[i]) * fr; return lo; };   // + river flow / moisture (for look.ground)
  const wq = []; const want = (d, ci) => { const L = lanes.get(d); if (L && L.has(ci)) return; if (wq.length < 24 && !wq.some(w => w[0] === d && w[1] === ci)) wq.push([d, ci]); };
  G.warm = (n = 1) => { while (n-- > 0 && wq.length) { const [d, ci] = wq.shift(); laneChunk(d, ci); } };   // build one queued lane chunk ahead of time (once a frame)
  G.laneCount = () => { let n = 0; for (const L of lanes.values()) n += L.size; return n; };
  G.pathH = u => look(u, false);
  G.pathWL = u => look(u, true);   // water surface over the path (sea, lake or river), -1e9 = dry
  // ---- caves along the path (T1, "16" WV:761, "Caves with roofs"): the walkable floor drops under a rock roof ----
  G.caves = []; if (O.caves) { const nc = Math.round(Cs / 9 * (.35 + st.rock + .7 * st.ice + .2 * (1 - st.gas))), rc = makeNoise(P.seed ^ 0xca7e).rnd;
    for (let k = 0; k < nc; k++) { const len = .6 + rc() * 2.2; G.caves.push({ u: rc() * Cs, len, d: 1.7 + rc() * 1.1, ch: 1.05 + rc() * .55, mouth: .22 + rc() * .2, glow: rc() < .5 ? rc() : 0, hue: rc() * 360 }); } }
  const du = (u, c) => { let d = ((u - c) % Cs + Cs) % Cs; return d > Cs / 2 ? d - Cs : d; };
  G.du = du;
  const cv = { d: 0, ch: 0, k: null, roof: 0 };
  // floor depth below the surface at u (h units), the hollow's height, the cave (or null)
  const cb = new Map(); for (const k of G.caves) { const r = k.len * .5 + k.mouth; for (let q = Math.floor((k.u - r) / 2); q <= Math.floor((k.u + r) / 2); q++) { const kk = ((q % Math.ceil(Cs / 2)) + Math.ceil(Cs / 2)) % Math.ceil(Cs / 2); if (!cb.has(kk)) cb.set(kk, []); cb.get(kk).push(k); } }
  const NB = Math.ceil(Cs / 2), none = [];
  G.caveAt = u => { cv.d = 0; cv.k = null; const uu = ((u % Cs) + Cs) % Cs; for (const k of cb.get(Math.floor(uu / 2) % NB) || none) { const x = Math.abs(du(u, k.u)); if (k.wet === undefined) k.wet = G.pathWL(k.u) > G.pathH(k.u) - .3; if (k.wet) continue; if (x > k.len * .5 + k.mouth) continue; const e = clamp((k.len * .5 + k.mouth - x) / k.mouth), s = e * e * (3 - 2 * e);
      const d = k.d * s; if (d > cv.d) { cv.d = d; cv.ch = k.ch; cv.k = k; } } return cv; };
  // ---- weather (T3): clouds that drift with zonal winds, rain under thick wet cloud; wind at any point ----
  G.windAt = (x, y, z, t, out) => { const lat = z, band = Math.sin(lat * 3.3) * (.6 + .4 * st.gas), wn = of[12];   // trade-wind like bands + gusts
    const g = n3(x * 2 + wn[0] + t * .02, y * 2 + wn[1], z * 2 + wn[2] - t * .015); out.east = band + .5 * g; out.speed = clamp(Math.abs(out.east) * .7 + .35 * Math.abs(g) + .15 * st.gas); return out; };
  G.cloudAt = (x, y, z, t) => { const lat = z, sp = Math.sin(lat * 3.3) * .05 * t, c = Math.cos(sp), s = Math.sin(sp), xr = x * c - y * s, yr = x * s + y * c, cn = of[13];
    const v = fbm(xr * 2.4 + cn[0], yr * 2.4 + cn[1], z * 2.4 + cn[2] + t * .004, 5) * 1.6 + (G.cloud - .5) * 1.2 + .25 * fbm(x * 1.2 + cn[1], y * 1.2 + cn[2], z * 1.2 + cn[0] + t * .002, 2);
    return clamp(v * 1.4 + .1); };
  return G;
}
