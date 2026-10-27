// LOOK / air (Visuals, BACKGROUND_PLAN 1, 3, 4, 6; Wilbow 10:06 PM Oct 25 "more realistic ... more shaded"): what hangs in the
// planet-ground sky in front of sky.js's gradient and behind the land:
//   sun     a small bright disc (limb-darkened) + a soft bloom, no rays; white by day, warm and larger-looking when low; dimmed by cloud
//   sisters the system's sister planets as small lit discs at the right phase (NO moons); opt sisters, OFF by default (check with Wilbow)
//   clouds  2 baked cloud decks (high thin, low puffy), lit on the sun side and shaded underneath, drifting with the wind; pink at
//           dusk, dark blue at night, grey-violet in rain; the low deck carries soft rain curtains (no screen-wide lines)
//   ranges  3 far mountain ranges behind the land, lighter and bluer with distance (aerial haze), valley mist at their feet,
//           placed at st.farScale (missing = 1)
//   jam     music as LIGHT: a soft glow of the key light colour along the horizon while music plays (x trippy floor .3)
// PERF: every layer is a canvas baked in idle slices (a few rows a frame, O.bakeMs) into a spare canvas and swapped in only when the
// whole bake is done (the previous bake stays up and crossfades out over O.fade s: no half slices, no size pops, no rebake per zoom
// step: zoom only moves / scales the blits). Per frame: sun 1 blit, clouds 2-4, ranges 1, jam 1 = ~5-7 drawImage. No gradients,
// filters, shadowBlur or strings per frame.
// READ-ONLY on the world: world.env {day, cloud, rain, east, seed, opts.weather, inCave}.
import { createNoise } from './noise.js';
const cl = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const AIR_OPTS = {
  sun: true, sunR: .011, bloomR: 9, bloomA: .55,           // disc radius (x H), bloom radius (x disc r), bloom strength
  sisters: false, sisterN: 2,                               // sister planets (no moons): OFF until Wilbow says (T10 moons / rings off)
  clouds: true, cloudRes: .32, cloudFade: 1.2, cloudSpeed: [4, 11], highA: .55, lowA: .92, curtains: true,
  ranges: true, rangeRes: .5, rangeN: 3, rangeH: [.07, .095, .12], rangeHaze: [.72, .55, .38], mist: .55,
  jam: true, jamA: .2, jamH: .34,                          // horizon glow strength, height (x H)
  bakeMs: .5, fade: .8,                                    // in-frame bake budget per frame (ms); the rest runs in the look's idle pump
};
// a periodic (in x) value noise, so the cloud decks tile while they drift
function pnoise(seed) { const N = createNoise(seed >>> 0);
  return (x, y, P, oct) => { let s = 0, a = .5, n = 0, f = 1; for (let i = 0; i < oct; i++) { const ang = x / P * 6.2832, R = P * f / 6.2832; s += a * N.n3(Math.cos(ang) * R * .9, Math.sin(ang) * R * .9, y * f + i * 17.3); n += a; a *= .5; f *= 2.02; } return s / n; }; }
export function createAir(opts = {}, mk) {
  const O = { ...AIR_OPTS, ...opts }, A = { stats: { bakes: 0, jobs: 0 }, L: {} };
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  // one baked layer: { cur, prev, t0, key, job } ; job = { key, cv, id, row, fn } fills rows of id until done, then swaps
  const layer = name => A.L[name] || (A.L[name] = { cur: null, prev: null, t0: -1e9, key: '', job: null, pend: null });
  const want = (Ly, key, w, h, rowsFn, t) => {   // queue / step a bake; returns the canvas to show (old until the new one is whole)
    if (Ly.key !== key && (!Ly.job || Ly.job.key !== key)) { if (!Ly.job) Ly.job = mkJob(key, w, h, rowsFn); else Ly.pend = { key, w, h, rowsFn }; }
    stepL(Ly, O.bakeMs);
    return Ly.cur; };
  const stepL = (Ly, ms) => { const J = Ly.job; if (!J) return; const t0 = now();
    while (J.row < J.h && now() - t0 < ms) { const y1 = Math.min(J.h, J.row + 2); J.fn(J.id.data, J.w, J.h, J.row, y1); J.row = y1; }
    if (J.row >= J.h) { J.cv.getContext('2d').putImageData(J.id, 0, 0); Ly.prev = Ly.cur; Ly.cur = J.cv; Ly.key = J.key; Ly.t0 = A.t; Ly.job = null; A.stats.bakes++;
      if (Ly.pend) { const p = Ly.pend; Ly.pend = null; if (p.key !== Ly.key) Ly.job = mkJob(p.key, p.w, p.h, p.rowsFn); } } };
  A.pump = ms => { const t0 = now(); for (const k in A.L) { const left = ms - (now() - t0); if (left <= 0) break; stepL(A.L[k], left); } };
  const mkJob = (key, w, h, fn) => { const cv = mk(w, h); A.stats.jobs++; return { key, cv, id: cv.getContext('2d').createImageData(w, h), row: 0, w, h, fn }; };
  const blitL = (c, Ly, t, fade, f) => { const ga = c.globalAlpha, fa = t - Ly.t0 < fade ? Math.max(0, (t - Ly.t0) / fade) : 1;   // the first bake fades in too
    if (fa < 1 && Ly.prev) { f(Ly.prev, ga * (1 - fa)); } if (Ly.cur) f(Ly.cur, ga * fa); c.globalAlpha = ga; };

  // ---- sun -----------------------------------------------------------------------------------------------------------------
  const SUNS = new Map();
  const sunSprite = (rPx, warm) => { const rb = Math.max(3, Math.round(rPx)), wb = Math.round(warm * 6), k = rb * 10 + wb; let cv = SUNS.get(k); if (cv) return cv;
    const R = rb * O.bloomR, n = Math.ceil(R * 2 + 2); cv = mk(n, n); const x = cv.getContext('2d'), id = x.createImageData(n, n), d = id.data, w = wb / 6, c0 = n / 2;
    const dc = [255, 250 - 40 * w, 238 - 110 * w], bc = [255, 236 - 70 * w, 200 - 120 * w];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const dx = i + .5 - c0, dy = j + .5 - c0, rr = Math.hypot(dx, dy), u = rr / rb, o = (j * n + i) * 4;
      let a = 0, r = 0, g = 0, b = 0;
      if (u < 1.04) { const mu = Math.sqrt(Math.max(0, 1 - Math.min(1, u) * Math.min(1, u))), limb = 1 - .45 * (1 - mu), e = cl((1.04 - u) / .08); r = dc[0] * limb; g = dc[1] * limb; b = dc[2] * limb; a = e; }
      const bl = O.bloomA * (.62 * Math.exp(-((u - 1) > 0 ? (u - 1) : 0) / 1.1) + .38 * Math.exp(-u / (O.bloomR * .38))) * (u > 1 ? 1 : 0);
      if (bl > 0) { const ta = a + bl * (1 - a); r = (r * a + bc[0] * bl * (1 - a)) / (ta || 1); g = (g * a + bc[1] * bl * (1 - a)) / (ta || 1); b = (b * a + bc[2] * bl * (1 - a)) / (ta || 1); a = ta; }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255 * cl(a * (1 - sm(R * .8, R, rr))); }
    x.putImageData(id, 0, 0); SUNS.set(k, cv); A.stats.bakes++; if (SUNS.size > 24) SUNS.delete(SUNS.keys().next().value); return cv; };

  // ---- cloud decks ---------------------------------------------------------------------------------------------------------
  // deck tile: period P = 1.5 W; rows from the deck top (hy - topK H) to the horizon; foreshortened toward the horizon (depth z)
  const cloudRows = (k, high) => { const NZ = pnoise(k.seed * 7 + (high ? 3 : 1)), cover = k.cover, rain = k.rain, day = k.day, dk = sm(.18, .62, day), tk = Math.exp(-(((day - .3) / .15) ** 2)), nk = 1 - sm(.04, .34, day), ws = dk + tk + nk + 1e-6;
    const sunC = [255, 244 - 80 * tk, 225 - 130 * tk], lit = [(236 * dk + 250 * tk + 60 * nk) / ws, (238 * dk + 170 * tk + 70 * nk) / ws, (242 * dk + 150 * tk + 96 * nk) / ws], shd = [(150 * dk + 108 * tk + 22 * nk) / ws, (158 * dk + 92 * tk + 28 * nk) / ws, (176 * dk + 122 * tk + 48 * nk) / ws];
    const thr = high ? .64 - .32 * cover : .72 - .46 * cover, sxp = k.sx, mute = k.mute, wet = rain;
    return (d, w, h, y0, y1) => { const P = w;
      for (let y = y0; y < y1; y++) { const v = 1 - y / h, z = 1 / (v + .06), fy = high ? z * 2.6 : z * 2.2;   // v: 1 at the deck top, 0 at the horizon
        const fadeH = sm(0, .22, v) * (high ? sm(1, .7, v) : 1);
        for (let x = 0; x < w; x++) { const o = (y * w + x) * 4, sxk = high ? .26 : .5;
          const PX = high ? 9 : 6; let n = NZ(x / w * PX, fy, PX, high ? 4 : 5) * .5 + .5;
          if (high) n = n * .75 + .25 * (NZ(x / w * 27, fy * 1.6 + 9, 27, 2) * .5 + .5);
          const dens = sm(thr, thr + (high ? .22 : .16), n) * fadeH;
          if (dens <= .003 && !(k.curt && !high)) { d[o + 3] = 0; continue; }
          // light: density toward the sun (screen x side + up) thins the lit side; the underside (toward the horizon row) is shaded
          const ns = NZ((x + sxp * w * .012) / w * PX, fy - .12, PX, 3) * .5 + .5, lt = cl(.55 + 3.2 * (n - ns)), under = high ? 0 : cl(.35 + 1.2 * (n - thr) - .3 * v);
          const L = cl(lt * (1 - .55 * under) * (1 - .45 * wet)), sideK = cl(.5 + .5 * sxp * (x / w * 2 - 1)) * tk;
          let r = shd[0] + (lit[0] - shd[0]) * L, g = shd[1] + (lit[1] - shd[1]) * L, b = shd[2] + (lit[2] - shd[2]) * L;
          if (L > .6 && (dk + tk) > .2) { const s2 = (L - .6) * .9 * (1 - nk) * (1 + sideK); r += (sunC[0] - r) * s2 * .4; g += (sunC[1] - g) * s2 * .4; b += (sunC[2] - b) * s2 * .4; }
          if (wet > .05) { const l = r * .3 + g * .59 + b * .11; r += (l * .92 - r) * wet * .6; g += (l * .9 - g) * wet * .6; b += (l * 1.08 - b) * wet * .6; }   // grey-violet in rain
          if (mute > 0) { const l = r * .3 + g * .59 + b * .11; r += (l - r) * mute; g += (l - g) * mute; b += (l - b) * mute; }
          let a = dens * (high ? O.highA : O.lowA) * (high ? .6 + .4 * cover : 1);
          if (k.curt && !high && v < .55) {   // rain curtains: soft grey veils hanging from the deck to the horizon under the denser cloud
            const col = NZ(x / w * 40, 3.1, 40, 3) * .5 + .5, str = .5 + .5 * NZ(x / w * 260, 7.7 + v * 2, 260, 2), cv = sm(.45, .75, col) * (.75 + .25 * str) * sm(.55, .25, v) * sm(0, .08, v) * rain * .5;
            if (cv > a * .3) { const ca = cv * (1 - a), cr = shd[0] * .9, cg = shd[1] * .9, cb = shd[2] * .95, ta = a + ca; r = (r * a + cr * ca) / (ta || 1); g = (g * a + cg * ca) / (ta || 1); b = (b * a + cb * ca) / (ta || 1); a = ta; } }
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255 * cl(a); } } }; };

  // ---- far ranges ----------------------------------------------------------------------------------------------------------
  const rangeRows = (k) => { const N = createNoise((k.seed * 31 + 5) >>> 0), dk = sm(.18, .62, k.day), tk = Math.exp(-(((k.day - .3) / .15) ** 2)), nk = 1 - sm(.04, .34, k.day), ws = dk + tk + nk + 1e-6;
    const air = [(170 * dk + 178 * tk + 20 * nk) / ws, (190 * dk + 142 * tk + 28 * nk) / ws, (214 * dk + 160 * tk + 52 * nk) / ws], rock = [(92 * dk + 84 * tk + 14 * nk) / ws, (100 * dk + 74 * tk + 18 * nk) / ws, (112 * dk + 92 * tk + 32 * nk) / ws];
    const W = k.w, Hh = k.h, n = O.rangeN, prof = [], hgt = [];
    for (let r = 0; r < n; r++) { const p = new Float32Array(W); for (let x = 0; x < W; x++) { const u = x / W; p[x] = .55 * N.ridged(u * (2.2 + r * 1.3) + r * 7, r * 3.3, .5, 5) + .3 * (N.fbm(u * 1.2 + r, r * 5, 1.5, 3) * .5 + .5) + .15 * Math.sin(u * 3.1 + r * 2); } prof.push(p); hgt.push(O.rangeH[r] / O.rangeH[n - 1]); }
    return (d, w, h, y0, y1) => { const base = h * .82;   // the canvas: range tops above, the mist floor at base, a little below the horizon
      for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; let r = 0, g = 0, b = 0, a = 0;
        for (let ri = 0; ri < n; ri++) { const p = prof[ri], top = base - p[x] * hgt[ri] * base * .95; if (y < top) continue;
          const sl = (p[Math.min(w - 1, x + 1)] - p[Math.max(0, x - 1)]) * w * .02, lsd = cl(.55 + 1.6 * sl * -k.sx) * (1 - .6 * nk), hz = O.rangeHaze[ri] + (1 - O.rangeHaze[ri]) * .35 * k.cloud + .25 * (1 - k.heal) * (1 - O.rangeHaze[ri]);
          const depth = (y - top) / Math.max(1, base - top), mist = O.mist * sm(.35, 1, depth) * (.6 + .4 * (1 - ri / n));
          let cr = rock[0] * (.6 + .55 * lsd), cg = rock[1] * (.6 + .55 * lsd), cb = rock[2] * (.6 + .55 * lsd);
          if (tk > .05) { const s2 = tk * lsd * .35; cr += (250 - cr) * s2 * .5; cg += (170 - cg) * s2 * .35; cb += (120 - cb) * s2 * .2; }
          const hk = cl(hz + mist * (1 - hz)), nr = cr + (air[0] * (1 + .06 * mist) - cr) * hk, ng = cg + (air[1] * (1 + .05 * mist) - cg) * hk, nb2 = cb + (air[2] * (1 + .03 * mist) - cb) * hk;
          const ea = cl((y - top) / 1.6), ta = ea + a * (1 - ea);   // over-composite: a soft near ridge never cuts a hole in the far one
          if (ta > 0) { r = (nr * ea + r * a * (1 - ea)) / ta; g = (ng * ea + g * a * (1 - ea)) / ta; b = (nb2 * ea + b * a * (1 - ea)) / ta; } a = ta; }   // nearer ranges overwrite farther (drawn far to near); the soft 1.6 px top edge = no outline
        if (y >= base) { const t2 = cl((y - base) / (h - base)); r = air[0]; g = air[1]; b = air[2]; a = 1 - t2 * t2; }
        if (k.mute > 0) { const l = r * .3 + g * .59 + b * .11; r += (l - r) * k.mute; g += (l - g) * k.mute; b += (l - b) * k.mute; }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255 * a; } }; };

  // ---- jam glow (one small baked strip per colour bucket, stretched) ------------------------------------------------------------
  const JAMS = new Map(), jamStrip = (rgb) => { const k = ((rgb[0] >> 4) << 8) | ((rgb[1] >> 4) << 4) | (rgb[2] >> 4); let cv = JAMS.get(k); if (cv) return cv;
    cv = mk(64, 32); const x = cv.getContext('2d'), id = x.createImageData(64, 32), d = id.data;
    for (let j = 0; j < 32; j++) for (let i = 0; i < 64; i++) { const u = (i + .5) / 64 * 2 - 1, v = 1 - (j + .5) / 32, o = (j * 64 + i) * 4, a = Math.exp(-v * 3.2) * (.55 + .45 * Math.exp(-u * u * 2.2)) * sm(1, .85, v);
      d[o] = (rgb[0] >> 4) * 17; d[o + 1] = (rgb[1] >> 4) * 17; d[o + 2] = (rgb[2] >> 4) * 17; d[o + 3] = 255 * a; }
    x.putImageData(id, 0, 0); JAMS.set(k, cv); if (JAMS.size > 48) JAMS.delete(JAMS.keys().next().value); return cv; };

  // ---- sisters -------------------------------------------------------------------------------------------------------------
  const SIS = new Map(), sisSprite = (rPx, ph, hue) => { const rb = Math.max(2, Math.round(rPx)), pb = Math.round(ph * 8), k = `${rb}:${pb}:${hue}`; let cv = SIS.get(k); if (cv) return cv;
    const n = rb * 2 + 4; cv = mk(n, n); const x = cv.getContext('2d'), id = x.createImageData(n, n), d = id.data, c0 = n / 2, lx = Math.cos(pb / 8 * Math.PI), lz = Math.sin(pb / 8 * Math.PI), N = createNoise(hue + 11);
    const base = [[196, 176, 150], [160, 178, 196], [190, 160, 140], [176, 184, 170]][hue & 3];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const X = (i + .5 - c0) / rb, Y = (j + .5 - c0) / rb, rr = X * X + Y * Y, o = (j * n + i) * 4; if (rr > 1.06) { d[o + 3] = 0; continue; }
      const Z = Math.sqrt(Math.max(0, 1 - rr)), ll = cl(X * lx + Z * lz * .9 + .02), band = 1 + .12 * N.n3(Y * 3, hue, .5) + .06 * N.n3(X * 2, Y * 9, 1.5);
      d[o] = base[0] * band * (.06 + .94 * ll); d[o + 1] = base[1] * band * (.06 + .94 * ll); d[o + 2] = base[2] * band * (.08 + .92 * ll); d[o + 3] = 255 * cl((1.06 - rr) / .12) * (.15 + .85 * cl(ll * 3)); }
    x.putImageData(id, 0, 0); SIS.set(k, cv); return cv; };

  // draw: X = { W, H, hy (sky horizon), hyF (far-range horizon at farScale), ss (skyScale), fs (farScale), E, sx, day, t, heal, music,
  //   trp, lc [r,g,b] key light, q, seed, cloud, rain }. Returns the number of blits.
  A.draw = (c, X) => { const { W, H, hy, E, t } = X; A.t = t; if (!(W > 0) || hy <= 0) return 0; let nb = 0;
    const day = X.day, dk = sm(.18, .62, day), tk = Math.exp(-(((day - .3) / .15) ** 2)), nk = 1 - sm(.04, .34, day), cloud = X.cloud, rain = X.rain, q = X.q | 0, seed = X.seed | 0;
    const ga = c.globalAlpha, go = c.globalCompositeOperation, sm0 = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true;
    // sisters (night bright, day ghosts)
    if (O.sisters) { for (let i = 0; i < O.sisterN; i++) { const h1 = ((seed * 97 + i * 1013) % 997) / 997, h2 = ((seed * 31 + i * 577) % 991) / 991, px = W * (.12 + .76 * h1), py = hy - H * (.38 + .4 * h2) * X.ss, r = H * (.006 + .01 * ((h1 * 7) % 1)) * X.ss;
      const ph = cl(.5 + .5 * X.sx * (px / W * 2 - 1) + .25 * (h2 - .5)), al = (.22 * dk + .55 * tk + .9 * nk) * (1 - .9 * cloud); if (al < .02 || py < -r) continue;
      c.globalAlpha = ga * al; const sp = sisSprite(r, ph, (seed + i) & 3); c.drawImage(sp, px - sp.width / 2, py - sp.height / 2); nb++; } c.globalAlpha = ga; }
    // sun
    if (O.sun) { const sunV = (day - .3) * .9, sxC = W * (.5 + .42 * X.sx), sy = hy - sunV * .95 * H * 1, r = H * O.sunR * (1 + .25 * tk) * Math.max(.6, Math.min(1.6, X.ss)), vis = (1 - nk) * (1 - .92 * sm(.2, .9, cloud)) * (1 - .7 * rain);
      if (vis > .02 && sy < hy + r * 2 && sy > -r * O.bloomR) { const sp = sunSprite(r, tk); c.globalAlpha = ga * vis; c.drawImage(sp, sxC - sp.width / 2, sy - sp.height / 2); nb++; } c.globalAlpha = ga; }
    // jam light along the horizon (music as LIGHT; under the clouds and the far ranges)
    if (O.jam && X.music > .02 && X.lc) { const a = O.jamA * X.music * (.3 + .7 * X.trp) * (.6 + .4 * X.heal) * (1 - .5 * nk); if (a > .004) { const js = jamStrip([Math.min(255, X.lc[0]) | 0, Math.min(255, X.lc[1]) | 0, Math.min(255, X.lc[2]) | 0]), jh = H * O.jamH * X.ss;
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = ga * a; c.drawImage(js, -W * .1, hy - jh, W * 1.2, jh * 1.05); c.globalCompositeOperation = go; c.globalAlpha = ga; nb++; } }
    // cloud decks
    if (O.clouds && !(E && E.inCave) && cloud > .04) { const bw = Math.max(8, Math.ceil(W * 1.5 * O.cloudRes)), mute = X.mute;
      for (const high of (q >= 2 ? [false] : [true, false])) { const top = high ? .95 : .72, bh = Math.max(8, Math.ceil(H * top * O.cloudRes)), Ly = layer(high ? 'hi' : 'lo');
        const kc = { day: Math.round(day * 16) / 16, sx: Math.round(X.sx * 4) / 4, cover: Math.round(cloud * 6) / 6, rain: Math.round(rain * 4) / 4, seed, mute: Math.round(mute * 8) / 8, curt: O.curtains && rain > .05 };
        const key = `${bw}x${bh}:${kc.day}:${kc.sx}:${kc.cover}:${kc.rain}:${seed}:${kc.mute}:${kc.curt}`, cv = want(Ly, key, bw, bh, cloudRows(kc, high), t); if (!cv) continue;
        const dh = H * top * X.ss, y0 = hy - dh, P = W * 1.5, sp = O.cloudSpeed[high ? 0 : 1] * (E && typeof E.east === 'number' ? (E.east || .3) : .3), off = ((t * sp) % P + P) % P;
        blitL(c, Ly, t, O.cloudFade, (img, al) => { c.globalAlpha = al; for (let x0 = -off; x0 < W; x0 += P) { c.drawImage(img, x0, y0, P, dh); nb++; } }); } }
    // far ranges at farScale (drawn last: they stand in front of the sky, the clouds' foot and the sunset sun)
    if (O.ranges && !(E && E.inCave)) { const rw = Math.max(16, Math.ceil(W * O.rangeRes)), Hr = H * O.rangeH[O.rangeN - 1] * 1.35, rh = Math.max(8, Math.ceil(Hr * O.rangeRes)), Ly = layer('rg');
      const kr = { day: Math.round(day * 16) / 16, sx: Math.round(X.sx * 4) / 4, cloud: Math.round(cloud * 4) / 4, heal: Math.round(X.heal * 4) / 4, seed, mute: Math.round(X.mute * 8) / 8, w: rw, h: rh };
      const key = `${rw}x${rh}:${kr.day}:${kr.sx}:${kr.cloud}:${kr.heal}:${seed}:${kr.mute}`, cv = want(Ly, key, rw, rh, rangeRows(kr), t);
      if (cv) { const fs = Math.max(.4, Math.min(3, X.fs)), dh = Hr * fs, dw = W * Math.max(1, fs), ax = X.ax != null ? X.ax : W / 2, x0 = ax - (ax) * (dw / W), yb = X.hyF + dh * .18 * 0;
        blitL(c, Ly, t, O.fade, (img, al) => { c.globalAlpha = al; c.drawImage(img, x0, yb - dh * .82, dw, dh); nb++; }); } }
    c.globalAlpha = ga; c.globalCompositeOperation = go; c.imageSmoothingEnabled = sm0; return nb; };
  A.busy = () => { for (const k in A.L) if (A.L[k].job) return true; return false; };
  A.opts = O; return A; }
