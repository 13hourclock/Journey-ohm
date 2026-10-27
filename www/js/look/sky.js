// LOOK / sky (v0.0.19): the planet-ground sky as REAL light — a day/night sky with atmosphere: zenith-to-horizon gradient, a pale
// hazy horizon, the sun's glow (Mie forward scatter: tight + white by day, wide + warm at sunrise / sunset), twilight colours on the
// sun's side, stars at night, clouds / rain greying it, seasons shifting it (winter paler and cooler, summer deeper). Colours match
// Game Dev's daySky (render.js v0.0.19: zenith rgb(52,104,186) -> horizon rgb(190,214,236), weighted by world.env.day).
// PERF: baked at 1/4 CSS px into a small canvas, keyed on bucketed inputs (day 48 steps, sun side, cloud, rain, season, size) and
// drawn as ONE smoothed (bilinear) blit; a bucket change crossfades from the last bake over ~0.8 s (no visible steps). Stars: one
// CSS-px canvas per size, blitted ('lighter') only at night. No per-frame gradients or strings.
// READ-ONLY on the world: reads world.env {day, cloud, rain, snow, inCave}, st, the light direction on screen.
import { createNoise } from './noise.js';
const cl = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const SKY_OPTS = {
  res: .25,                       // bake px per CSS px (smooth gradients only: upscaled bilinear)
  zen: [52, 104, 186], hor: [190, 214, 236],          // day (= Game Dev's daySky)
  twZen: [44, 52, 112], twSun: [255, 146, 82], twAway: [176, 128, 150],   // twilight: deep blue overhead, fire on the sun's side, mauve away
  nZen: [4, 7, 20], nHor: [16, 24, 46],               // night
  sunDay: [255, 236, 200], sunTw: [255, 168, 96],     // the sun's glow colour
  haze: .22,                      // extra horizon haze (whitening right above the horizon, by day)
  stars: 260,                     // stars per 412x915 CSS px of sky
  fade: .8,                       // s: crossfade between bakes
  inc: true,                      // v0.0.24: a new bucket bakes a few rows per frame (the old bake stays up), off = the whole bake in one frame
  bakeMs: 1.2,                    // ms per frame for that incremental bake
  mute: .25,                      // Visuals #1 (Wilbow 10:06 'too much color'): the baked sky is greyed this much toward its own brightness (0 = the old sky)
  starsPer: 48,
  band: true,                     // #2 night sky (BACKGROUND_PLAN 2): this galaxy's band (clumpy, dark dust lane, few warm/blue tints, low sat) + one faint nebula, baked at bandRes in idle rows (the old band stays up until the new one is whole), 'lighter' under the stars at night
  heal: true, healMute: .25, healHaze: .16,   // #6 the sky heals: an unhealed world's sky is greyer (mute + healMute) and dustier (haze); healing deepens and clears it (heal bucket in the bake key)
  twilight: true,                 // #7 the earth's shadow + belt of Venus away from the sun at dusk / dawn (bake only)
  bandRes: .25, bandA: .34, bandMs: .8, bandSeed: 7,                   // v0.0.24: stars drawn into the star canvas per frame while it builds (0 = all at once)
};
// skyLight(day): the light the sky puts on the land, from the same day / twilight / night weights as the sky bake (v0.0.21, Visuals):
//   sun  [r,g,b] multiplier of the direct light (day white, dusk warm and lower, night = moonlight: cool and weak)
//   amb  [r,g,b] multiplier of the sky's ambient fill (blue by day, mauve-blue at dusk: the land stays lit by the sky; dim blue at night)
//   hor  [r,g,b] 0..255 the air colour distant land fades into (aerial haze; dark blue at night: far land sinks into the night sky)
//   sky  [r,g,b] 0..255 the sky seen in water (low sky)
export const SKY_LIGHT = { sun: [[1.04, 1, .93], [1, .7, .48], [.3, .34, .48]], amb: [[.92, .98, 1.1], [.74, .66, .86], [.26, .32, .52]],
  hor: [[170, 190, 214], [178, 142, 160], [20, 28, 52]], sky: [[176, 200, 228], [168, 128, 150], [14, 22, 44]] };
export function skyLight(day, out = {}) { const d = typeof day === 'number' ? cl(day) : 1, dk = sm(.18, .62, d), tk = Math.exp(-(((d - .3) / .15) ** 2)), nk = 1 - sm(.04, .34, d), w = dk + tk + nk + 1e-6;
  for (const k of ['sun', 'amb', 'hor', 'sky']) { const A = SKY_LIGHT[k], o = out[k] || (out[k] = [0, 0, 0]); for (let i = 0; i < 3; i++) o[i] = (A[0][i] * dk + A[1][i] * tk + A[2][i] * nk) / w; }
  out.day = d; out.night = nk / w; out.dusk = tk / w; return out; }
export function createSky(opts = {}, mk) {
  const O = { ...SKY_OPTS, ...opts }, S = { cv: null, k: '', prev: null, pk: '', t0: -1e9, star: null, sk: '', bakes: 0, kk: new Float64Array(8), pkk: new Float64Array(8), tmp: null };
  S.heal = 1; const keyOf = (kk, W, H, day, sx, cloud, rain, season) => { kk[0] = W | 0; kk[1] = H | 0; kk[2] = Math.round(day * 48); kk[3] = Math.round(sx * 8); kk[4] = Math.round(cloud * 6); kk[5] = Math.round(rain * 4); kk[6] = Math.round(season * 2); kk[7] = Math.round(cl(S.heal) * 4); };   // kk[7]: the heal bucket (#6 the sky heals)
  const same = (a, b) => { for (let i = 0; i < 8; i++) if (a[i] !== b[i]) return false; return true; };
  // bake: rows from the zenith (top) to just below the horizon. Layout: the canvas spans [hy - 1.45 H, hy + .1 H] in CSS px
  // v0.0.24 (smooth zoom): rows y0..y1 of a bake into image data d (J.seed carries the dither across slices), so a new bucket can bake
  // a few rows per frame (O.inc) while the last bake stays on screen: the frame that crossed a day bucket, or the first sky frame
  // after a dive / a space view, no longer paid the whole bake (15-18 ms at 4x CPU throttle).
  function bakeRows(d, bw, bh, kk, y0, y1, J) { const W = kk[0], H = kk[1], day = kk[2] / 48, sx = kk[3] / 8, cloud = kk[4] / 6, rain = kk[5] / 4, season = kk[6] / 2, heal = O.heal === false ? 1 : kk[7] / 4, mute = O.mute + O.healMute * (1 - heal), hazeX = O.healHaze * (1 - heal);
    const span = 1.55 * H, hyB = 1.45 * H;
    const dk = sm(.18, .62, day), tk = Math.exp(-(((day - .3) / .15) ** 2)), nk = 1 - sm(.04, .34, day), wsum = dk + tk + nk + 1e-6;
    const sunV = (day - .3) * .9, sxC = W * (.5 + .42 * sx), gr = .1 + .22 * tk, wint = Math.max(0, -season), summ = Math.max(0, season);
    const sunC = [O.sunDay[0] + (O.sunTw[0] - O.sunDay[0]) * tk, O.sunDay[1] + (O.sunTw[1] - O.sunDay[1]) * tk, O.sunDay[2] + (O.sunTw[2] - O.sunDay[2]) * tk], sunK = (.55 * dk + 1.1 * tk) * (1 - .75 * cloud) * (1 - nk);
    let seed = J.seed;
    for (let py = y0; py < y1; py++) { const yC = (py + .5) / bh * span, v = (hyB - yC) / (H * .95), va = v < 0 ? 0 : v, g = Math.pow(cl(va), .55), hz = Math.exp(-va / .07);
      for (let px = 0; px < bw; px++) { const xC = (px + .5) / bw * W, side = cl(1 - Math.abs(xC - sxC) / (W * 1.1));
        let r = 0, gg = 0, b = 0;
        // day
        r += dk * (O.hor[0] + (O.zen[0] - O.hor[0]) * g); gg += dk * (O.hor[1] + (O.zen[1] - O.hor[1]) * g); b += dk * (O.hor[2] + (O.zen[2] - O.hor[2]) * g);
        // twilight: the horizon colour leans to fire on the sun's side
        if (tk > .01) { const h0 = O.twAway[0] + (O.twSun[0] - O.twAway[0]) * side * side, h1 = O.twAway[1] + (O.twSun[1] - O.twAway[1]) * side * side, h2 = O.twAway[2] + (O.twSun[2] - O.twAway[2]) * side * side, g2 = Math.pow(cl(va), .4);
          r += tk * (h0 + (O.twZen[0] - h0) * g2); gg += tk * (h1 + (O.twZen[1] - h1) * g2); b += tk * (h2 + (O.twZen[2] - h2) * g2); }
        if (nk > .01) { const g3 = Math.pow(cl(va), .7); r += nk * (O.nHor[0] + (O.nZen[0] - O.nHor[0]) * g3); gg += nk * (O.nHor[1] + (O.nZen[1] - O.nHor[1]) * g3); b += nk * (O.nHor[2] + (O.nZen[2] - O.nHor[2]) * g3); }
        r /= wsum; gg /= wsum; b /= wsum;
        // horizon haze (by day): the air is whiter where you look through more of it
        // #7 real twilight: on the side away from the sun the earth's shadow (a cool blue band on the horizon) under the belt of Venus (pink)
        if (tk > .01 && O.twilight !== false) { const aw = tk * (1 - side) * (1 - side), es = aw * .45 * Math.exp(-va / .045), bv = aw * .4 * Math.exp(-(((va - .11) / .06) ** 2));
          r += (62 - r) * es; gg += (72 - gg) * es; b += (112 - b) * es; r += (216 - r) * bv; gg += (156 - gg) * bv; b += (172 - b) * bv; }
        const hzk = (O.haze + hazeX) * hz * (dk + .5 * tk) + hazeX * .35 * (dk + .5 * tk) * (1 - g);   // + an unhealed world's dusty haze (#6) r += (235 - r) * hzk; gg += (240 - gg) * hzk; b += (245 - b) * hzk;
        // the sun's glow: forward scatter around the sun (tight core + wide halo), wider and warmer when it is low
        if (sunK > .01) { const dx = (xC - sxC) / H, dy = (v - sunV) * .95, dd = dx * dx + dy * dy, gl = sunK * (.65 * Math.exp(-dd / (gr * gr * .12)) + .35 * Math.exp(-dd / (gr * gr * 1.6)));
          r += (sunC[0] - r) * cl(gl); gg += (sunC[1] - gg) * cl(gl); b += (sunC[2] - b) * cl(gl); }
        // seasons: winter paler / cooler, summer deeper
        if (wint > 0) { const k = .18 * wint; r += (205 - r) * k; gg += (215 - gg) * k; b += (232 - b) * k; }
        if (summ > 0) { const k = .1 * summ * (dk + tk); r *= 1 - k * .6; gg *= 1 - k * .2; b *= 1 + k * .05; }
        // weather: cloud cover greys the sky, rain darkens it
        if (cloud > .05) { const l = (r * .3 + gg * .59 + b * .11) * (1 - .35 * rain), k = .7 * cloud; r += (l - r) * k; gg += (l - gg) * k; b += (l * 1.04 - b) * k; }
        if (mute > 0) { const l = r * .3 + gg * .59 + b * .11, k = Math.min(1, mute); r += (l - r) * k; gg += (l - gg) * k; b += (l - b) * k; }
        seed = (seed * 1664525 + 1013904223) >>> 0; const dn = (seed / 4294967296 - .5) * 1.2;   // dither: no banding after the upscale
        const o = (py * bw + px) * 4; d[o] = r + dn; d[o + 1] = gg + dn; d[o + 2] = b + dn; d[o + 3] = 255; } }
    J.seed = seed; }
  function bake(cv, kk) { const x = cv.getContext('2d'), id = x.createImageData(cv.width, cv.height); bakeRows(id.data, cv.width, cv.height, kk, 0, cv.height, { seed: 12345 }); x.putImageData(id, 0, 0); S.bakes++; }
  // the incremental job: { kk, cv, id, row, seed }; it finishes before a newer key starts (a flickering bucket can never starve it)
  const nowS = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  const stepJob = J => { const t0 = nowS(), bw = J.cv.width, bh = J.cv.height; let n = 0;
    while (J.row < bh) { const y1 = Math.min(bh, J.row + 8); bakeRows(J.id.data, bw, bh, J.kk, J.row, y1, J); J.row = y1; if (++n > 400 || nowS() - t0 > O.bakeMs) break; }
    return J.row >= bh; };
  // stars: one CSS-px canvas per size; v0.0.24: built O.starsPer stars a frame (same sequence, so the finished canvas is the same as the
  // one-shot build) - the first night frame no longer paid all of them at once
  function stars(W, H) { const k = `${W | 0}x${H | 0}`;
    if (S.sk !== k) { S.sk = k; const w = Math.max(1, W | 0), h = Math.max(1, (H * 1.45) | 0), cv = S.star && S.star.width === w && S.star.height === h ? S.star : mk(w, h), x = cv.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h); S.star = cv; S.sb = { s: 99991, i: 0, n: Math.round(O.stars * w * h / (412 * 915)), w, h }; }
    const B = S.sb; if (!B || B.i >= B.n) return S.star;
    const x = S.star.getContext('2d'), rnd = () => (B.s = (B.s * 1664525 + 1013904223) >>> 0) / 4294967296, end = O.starsPer > 0 ? Math.min(B.n, B.i + O.starsPer) : B.n;
    for (; B.i < end; B.i++) { const px = rnd() * B.w, py = rnd() * B.h, m = Math.pow(rnd(), 3), t = rnd(), a = .25 + .75 * m, sz = .6 + 1.1 * m;
      x.fillStyle = t < .2 ? `rgba(255,220,190,${a})` : t < .45 ? `rgba(200,215,255,${a})` : `rgba(240,242,255,${a})`; x.fillRect(px, py, sz, sz);
      if (m > .7) { x.globalAlpha = .18 * m; x.beginPath(); x.arc(px + sz / 2, py + sz / 2, sz * 2.4, 0, 6.2832); x.fill(); x.globalAlpha = 1; } }
    return S.star; }
  // the galaxy band: rows of an ImageData a frame (O.bandMs), swapped in whole when complete (never half-baked)
  function band(W, H, seed) { const bw = Math.max(4, Math.ceil(W * O.bandRes)), bh = Math.max(4, Math.ceil(H * 1.45 * O.bandRes)), k = `${bw}x${bh}:${seed}`;
    if (S.bandK !== k && (!S.bj || S.bj.k !== k)) { const N = createNoise(seed >>> 0), r = i => ((Math.imul(seed + i * 977, 2654435761) >>> 0) / 4294967296);
      const ang = -.35 + .7 * r(1) + (r(2) < .5 ? 0 : Math.PI / 2 - .2), ux = Math.cos(ang), uy = Math.sin(ang), ox = .3 + .4 * r(3), oy = .25 + .3 * r(4), nb = { x: .2 + .6 * r(5), y: .15 + .4 * r(6), s: .07 + .05 * r(7) };
      S.bj = { k, bw, bh, N, ux, uy, ox, oy, nb, row: 0, id: new ImageData(bw, bh), seed }; }
    const J = S.bj; if (J) { const t0 = performance.now(), A = J.bw / J.bh, d8 = J.id.data;
      while (J.row < J.bh && performance.now() - t0 < O.bandMs) { const y = J.row++, v = y / J.bh;
        for (let x = 0; x < J.bw; x++) { const u = x / J.bw, px = (u - J.ox) * A, py = v - J.oy, d = px * -J.uy + py * J.ux, al = px * J.ux + py * J.uy;   // d: across the band, al: along
          const w = .085 * (1 + .35 * J.N.fbm(al * 3, 1.7, 3, 3)), cl1 = .5 + .5 * J.N.fbm(px * 9, py * 9, J.seed % 89, 4), cl2 = .5 + .5 * J.N.fbm(px * 22 + 5, py * 22, 3, 3);
          const core = Math.exp(-((d / w) ** 2)), lane = 1 - .75 * Math.exp(-(((d - w * .12 * Math.sin(al * 5)) / (w * .2)) ** 2)) * sm(.35, .7, cl2), b = core * (.12 + 1.3 * cl1 * cl1 * cl1) * lane * (.75 + .25 * Math.sin(al * 2.3 + 1));
          const nx = (u - J.nb.x) * A, ny = v - J.nb.y, nbv = Math.exp(-(nx * nx + ny * ny) / (J.nb.s * J.nb.s)) * (.4 + .6 * cl2) * .3;
          const i = (y * J.bw + x) * 4, L = Math.min(1, b), warm = sm(.2, .9, core);
          d8[i] = 205 + 30 * warm + 25 * nbv; d8[i + 1] = 208 + 14 * warm - 30 * nbv; d8[i + 2] = 222 - 12 * warm - 10 * nbv; d8[i + 3] = 255 * Math.min(1, L * .9 + nbv); } }
      if (J.row >= J.bh) { const cv = S.bandCv && S.bandCv.width === J.bw && S.bandCv.height === J.bh && S.bandCv !== S.bandOld ? S.bandCv : mk(J.bw, J.bh); cv.getContext('2d').putImageData(J.id, 0, 0); S.bandOld = S.bandCv; S.bandCv = cv; S.bandK = J.k; S.bj = null; } }
    return S.bandCv || null; }
  // draw: c the canvas, W H its CSS size, hy the horizon (CSS px), E world.env (or null), sx -1..1 the sun's side, season -1..1, t seconds
  S.draw = (c, W, H, hy, E, sx, season, t) => { const day = E && typeof E.day === 'number' ? cl(E.day) : 1, cloud = E && E.opts && E.opts.weather === false ? 0 : cl(E ? (E.cloud || 0) - .2 : 0) / .8, rain = cl(E ? E.rain || 0 : 0);
    const kk = S.kk; keyOf(kk, W, H, day, Math.max(-1, Math.min(1, sx)), cl(cloud), rain, Math.max(-1, Math.min(1, season || 0)));
    const bw = Math.max(4, Math.ceil(W * O.res)), bh = Math.max(4, Math.ceil(H * 1.55 * O.res));
    const sized = S.cv && S.cv.width === bw && S.cv.height === bh;
    if (O.inc && sized && (S.job || !same(kk, S.pkk))) {   // v0.0.24: a few rows a frame into the spare canvas, then the usual crossfade
      if (!S.job) { const tp = S.prev, cv = tp && tp !== S.cv && tp.width === bw && tp.height === bh ? tp : mk(bw, bh); S.job = { kk: Float64Array.from(kk), cv, id: cv.getContext('2d').createImageData(bw, bh), row: 0, seed: 12345 }; }
      const J = S.job; if (stepJob(J)) { J.cv.getContext('2d').putImageData(J.id, 0, 0); S.bakes++; S.prev = S.cv; S.cv = J.cv; S.t0 = t; S.pkk.set(J.kk); S.job = null; } }
    else if (!S.cv || !same(kk, S.pkk)) { S.job = null; if (S.cv) { const tp = S.prev; S.prev = S.cv; S.cv = tp && tp.width === bw && tp.height === bh ? tp : null; S.t0 = t; }   // crossfade from the last bake
      if (!S.cv) S.cv = mk(bw, bh); bake(S.cv, kk); S.pkk.set(kk); }
    const top = hy - 1.45 * H, ga = c.globalAlpha, sm0 = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in c) c.imageSmoothingQuality = 'low';
    if (top > 0) { c.drawImage(S.cv, 0, 0, S.cv.width, 1, 0, 0, W, top + 1); }   // zoomed out: the zenith row stretched above
    const fa = S.prev && t - S.t0 < O.fade ? (t - S.t0) / O.fade : 1;
    if (fa < 1) { c.drawImage(S.prev, 0, top, W, H * 1.55); c.globalAlpha = ga * Math.max(0, fa); }
    c.drawImage(S.cv, 0, top, W, H * 1.55); c.globalAlpha = ga;
    if (hy + .1 * H < H) { c.drawImage(S.cv, 0, S.cv.height - 1, S.cv.width, 1, 0, hy + .1 * H - 1, W, H - hy - .1 * H + 1); }   // below: the horizon row (land covers it)
    const nk = (1 - sm(.04, .34, day)) * (1 - cl(cloud * 1.3)) * (E && E.inCave ? 0 : 1);
    if (O.band && (nk <= .02 || S.bj)) band(W, H, (E && E.seed) || O.bandSeed);   // warm the band by day too
    if (nk <= .02 && O.starsPer > 0 && (!S.sb || S.sb.i < S.sb.n || S.sb.w !== Math.max(1, W | 0) || S.sb.h !== Math.max(1, (H * 1.45) | 0))) stars(W, H);   // v0.0.24: warm the star canvas by day
    if (nk > .02) { const sc = stars(W, H), go = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = ga * nk * (.85 + .15 * Math.sin(t * .7));
      const ch = Math.min(sc.height, hy) | 0; const bc = O.band ? S.bandCv : null; if (bc && ch > 0) { c.globalAlpha = ga * nk * O.bandA; c.drawImage(bc, 0, 0, bc.width, Math.max(1, ch * bc.height / (H * 1.45)), 0, 0, W, ch); c.globalAlpha = ga * nk * (.85 + .15 * Math.sin(t * .7)); }
      if (ch > 0) c.drawImage(sc, 0, 0, sc.width, ch, 0, 0, W, ch); c.globalCompositeOperation = go; c.globalAlpha = ga; }
    c.imageSmoothingEnabled = sm0; return true; };
  S.opts = O; S.stats = () => ({ bakes: S.bakes, job: !!S.job });
  return S; }
