// LOOK / star (2D; on by default, opts.realLook = false turns it off): ART_DIRECTION 4.4 "Living sun" (his Sheet-2 pick): a sun you could squint at. A limb-darkened
// blackbody disc with baked granulation and a few spots, a darker rim, radial corona streamers from polar fBm, a 3-layer bloom.
// Everything is a cached sprite drawn with drawImage ('lighter' for corona + bloom), so a frame is 4-6 drawImage calls.
// Living, never throbbing (Wilbow via Visuals 10:30): between big moments only very subtle activity (the granulation drifts by
// crossfading baked boil variants over many seconds, a faint slow corona shimmer). NO beat throb. It SWELLS only at big musical
// moments (st.burst, a pulse peak, the P1 place swell), 1-4 bars, landing on the beat and settling back (39 A D): only then does
// the corona wobble (slow writhing of the streamers, never on the beat) and do the limb flares (prominence loops) grow out.
// READ-ONLY. Every number is a PARAMETER (STAR_OPTS).
import { createNoise, rand01, smooth } from './noise.js';
import { blackbody } from './palette.js';
import { blit, devOf } from './blit.js';
export const STAR_OPTS = { maxR: [128, 96, 64, 48], boil: [3, 3, 2, 2], limb: .6, gran: .12, spots: 3, corona: .55, coronaR: 3, bloom: [7, 3.2, 1.6], bloomA: [.10, .22, .45],
  drift: 9, shimmer: .05, settle: 12, firstR: 12, swellGrow: .22, swellBright: .9, kMin: 2400, kMax: 12000,
  wobble: .07, wobbleHz: .35, flares: 3, flareH: .55, flareGrow: .6, flareA: .9 };   // burst-only: corona wobble (rad), prominence loops
const TAU = Math.PI * 2;
export function kelvinOf(p, st) { if (st && st.starK > 0) return st.starK; if (p && p.K > 0) return p.K; const s = (p && p.seed) >>> 0 || 1, u = rand01(s, 0x5a);
  return Math.round(STAR_OPTS.kMin + (STAR_OPTS.kMax - STAR_OPTS.kMin) * u * u); }   // more cool stars than hot ones, like the real sky
// v0.0.23: the disc and corona are painted in ROWS so an idle bake can stop at its slice budget and go on next slice (a whole
// big corona in one idle callback blocked the next zoom frame); paintX() = all rows at once (first sight, small)
const mkID = w => typeof ImageData !== 'undefined' ? new ImageData(w, w) : { width: w, height: w, data: new Uint8ClampedArray(w * w * 4) };
function discRows(w, R, rgb, seed, v, O) { const N = createNoise((seed + v * 977) >>> 0), id = mkID(w), d = id.data, c = w / 2;
  const spots = []; for (let k = 0; k < O.spots; k++) spots.push([(rand01(seed, 300 + k) - .5) * 1.2, (rand01(seed, 310 + k) - .5) * 1.0, .05 + .07 * rand01(seed, 320 + k)]);
  
  let py = 0; return { id, run(tEnd) { for (; py < w; py++) { if (tEnd && (py & 3) === 0 && py && Date.now() > tEnd) return false; for (let px = 0; px < w; px++) { const nx = (px + .5 - c) / R, ny = (py + .5 - c) / R, rr = nx * nx + ny * ny, o = (py * w + px) * 4; if (rr >= 1) { d[o + 3] = 0; continue; }
    const mu = Math.sqrt(1 - rr), ld = 1 - O.limb * (1 - Math.pow(mu, .7)), gz = mu * 3 + v * 1.7;
    let g = 1 + O.gran * (N.fbm(nx * 9, ny * 9, gz, 3) * 1.3 + .5 * Math.abs(N.n3(nx * 26, ny * 26, gz * 2)) - .25);
    for (const s of spots) { const dd = Math.hypot(nx - s[0], ny - s[1]) / s[2]; if (dd < 1.6) g *= 1 - .55 * Math.exp(-dd * dd * 1.8); }
    const warm = 1 - mu;   // the rim is darker AND redder (real limb reddening)
    d[o] = Math.min(255, rgb[0] * ld * g * 1.06 + 40 * (1 - warm)); d[o + 1] = Math.min(255, rgb[1] * ld * g * (1 - .18 * warm) + 30 * (1 - warm)); d[o + 2] = Math.min(255, rgb[2] * ld * g * (1 - .35 * warm) + 25 * (1 - warm));
    d[o + 3] = 255 * Math.min(1, (1 - Math.sqrt(rr)) * R * 1.5); } } return true; } }; }
function paintDisc(x, w, R, rgb, seed, v, O) { const J = discRows(w, R, rgb, seed, v, O); J.run(0); x.putImageData(J.id, 0, 0); }
function coronaRows(w, R, rgb, seed, O) { const N = createNoise(seed ^ 0xc0c0), id = mkID(w), d = id.data, c = w / 2;
  
  let py = 0; return { id, run(tEnd) { for (; py < w; py++) { if (tEnd && (py & 3) === 0 && py && Date.now() > tEnd) return false; for (let px = 0; px < w; px++) { const dx = (px + .5 - c) / R, dy = (py + .5 - c) / R, r = Math.hypot(dx, dy), o = (py * w + px) * 4; if (r < .96) { d[o + 3] = 0; continue; }
    const a = Math.atan2(dy, dx), st = .55 + .9 * Math.max(0, N.fbm(Math.cos(a) * 3, Math.sin(a) * 3, r * .35, 4)) + .5 * Math.pow(Math.abs(Math.cos(a * 2 + N.n3(Math.cos(a), Math.sin(a), 3) * 2)), 6);
    const f = Math.exp(-(r - 1) / .42) * st * (r < 1 ? (r - .96) / .04 : 1), k = Math.min(1, f * O.corona); d[o] = rgb[0]; d[o + 1] = rgb[1] * .96; d[o + 2] = rgb[2] * .92; d[o + 3] = 255 * k; } } return true; } }; }
function paintCorona(x, w, R, rgb, seed, O) { const J = coronaRows(w, R, rgb, seed, O); J.run(0); x.putImageData(J.id, 0, 0); }
// prominence loops on the limb (H-alpha orange-red), baked once per star size: shown and grown only in a burst
function paintFlares(x, w, R, seed, O, hk) { const c = w / 2; x.globalCompositeOperation = 'lighter';
  for (let k = 0; k < O.flares; k++) { const a = rand01(seed, 400 + k) * TAU, sp = .12 + .14 * rand01(seed, 410 + k), hh = R * O.flareH * hk * (.5 + .7 * rand01(seed, 420 + k)), n = 48;
    for (let i = 0; i <= n; i++) { const u = i / n, aa = a + (u - .5) * 2 * sp, lift = Math.sin(u * Math.PI) * hh * (1 + .15 * Math.sin(u * 17 + k)), rr = R * .98 + lift, px = c + Math.cos(aa) * rr, py = c + Math.sin(aa) * rr;
      const br = R * (.035 + .03 * Math.sin(u * Math.PI)), g = x.createRadialGradient(px, py, 0, px, py, br * 2.2); g.addColorStop(0, 'rgba(255,190,140,.55)'); g.addColorStop(.35, 'rgba(255,120,70,.28)'); g.addColorStop(1, 'rgba(255,80,40,0)');
      x.fillStyle = g; x.fillRect(px - br * 2.2, py - br * 2.2, br * 4.4, br * 4.4); } }
  x.globalCompositeOperation = 'source-over'; }
function paintBloom(x, w, rgb) { const c = w / 2, g = x.createRadialGradient(c, c, 0, c, c, c); g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`); g.addColorStop(.15, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.5)`);
  g.addColorStop(.45, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.12)`); g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`); x.fillStyle = g; x.fillRect(0, 0, w, w); }
// the 3 bloom layers summed into ONE sprite (radii O.bloom, alphas O.bloomA, additive like the 3 draws were): one big draw instead of three
function paintBloom3(x, w, rgb, O) { const c = w / 2, B = O.bloom, A = O.bloomA, s = c / B[0]; x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { const R = B[i] * s, g = x.createRadialGradient(c, c, 0, c, c, R), a = A[i]; g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`); g.addColorStop(.15, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * .5})`);
    g.addColorStop(.45, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * .12})`); g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`); x.fillStyle = g; x.beginPath(); x.arc(c, c, R, 0, TAU); x.fill(); }
  x.globalCompositeOperation = 'source-over'; }
// the same 3-layer sum as ONE live radial gradient (profile sampled at the stops): a fill costs about a 1:1 blit on a CPU rasteriser and
// half a scaled sprite, and takes any colour/size for free
const BLOOM_T = [0, .03, .07, .12, .2, .3, .45, .62, .8, 1];
function bloomGrad(c, x, y, br, rgb, O) { const g = c.createRadialGradient(x, y, 0, x, y, br), B = O.bloom, A = O.bloomA, [r0, g0, b0] = rgb;
  const prof = u => { let s = 0; for (let i = 0; i < 3; i++) { const v = u * B[0] / B[i]; if (v >= 1) continue; s += A[i] * (v < .15 ? 1 - v / .15 * .5 : v < .45 ? .5 - (v - .15) / .3 * .38 : .12 * (1 - (v - .45) / .55)); } return Math.min(1, s); };
  for (const u of BLOOM_T) g.addColorStop(u, `rgba(${r0},${g0},${b0},${prof(u).toFixed(4)})`); return g; }
export function createStars({ sprites, opts = {} }) { const O = { ...STAR_OPTS, ...opts }, S = { O, stab: new Map(), st: { blit1: 0, bloomBakes: 0 }, jobs: [], lastBloom: new Map() };
  // the exact-size bloom for a new colour (the trippy tint moves with the palette) is baked in idle time; the last one shows meanwhile
  S.pump = (q, budget) => { const t0 = Date.now(); while (S.jobs.length) { const J = S.jobs.shift(); if (!sprites.map.has(J.key) && (!J.need || sprites.map.has(J.need))) { if (J.rows) { J.r = J.r || J.rows(); if (!J.r.run(t0 + budget)) { S.jobs.unshift(J); break; } const id = J.r.id; sprites.get(J.key, J.bw, J.bw, xx => xx.putImageData(id, 0, 0), true); } else sprites.get(J.key, J.bw, J.bw, J.paint, true); S.st.bloomBakes++; } if (Date.now() - t0 > budget) break; } };
  // v0.0.23 (zoom stutter): a corona / disc sprite at a size not baked yet is queued as an idle job and the last one baked for this
  // star (same slot) is drawn scaled meanwhile; only a star with nothing baked at all bakes inside the frame (once). Zooming walks the
  // size buckets and a settle re-bakes at the exact size: those bakes were painted inside the frame (corona ~ms each on a phone).
  // First sight (nothing baked for this star yet): a small cheap copy (radius <= O.firstR) is baked in the frame and shown scaled
  // until the real size is idle-baked (a few frames), instead of painting a big corona + disc inside one frame (35 ms seen).
  const lastS = new Map(), sprIdle = (slot, mk, Rt) => { const [key, w, paint, rows] = mk(Rt); if (sprites.map.has(key)) { const c = sprites.get(key, w, w, null); const le = lastS.get(slot); if (!le || le.c !== c) lastS.set(slot, { k: key, c }); return c; }
    const le = lastS.get(slot); let fb = le && sprites.map.has(le.k) ? le.c : null;
    if (!fb) { const Rl = Math.min(Rt, O.firstR), [k2, w2, p2] = Rl < Rt ? mk(Rl) : [key, w, paint]; fb = sprites.get(k2, w2, w2, p2); if (fb) lastS.set(slot, { k: k2, c: fb }); if (k2 === key) return fb; }
    if (!S.jobs.some(J => J.key === key)) S.jobs.push({ key, bw: w, paint, rows }); return fb; };
  // ctx = { q, swell 0..1 (already the 1-4 bar big-moment envelope, 0 between big moments), trip, tint [r,g,b] (palette, trippy end) }
  S.draw = (c, x, y, r, st, ctx = {}) => { if (!(r > 0) || !isFinite(x) || !isFinite(y)) return false; const q = ctx.q | 0, t = (st && st.t) || 0;
    const p = (st && st.star) || ctx.star || null, seed = (p && p.seed) >>> 0 || (st && st.starSeed) >>> 0 || 1, K = kelvinOf(p, st);
    const Kb = Math.round(K / 250) * 250, base = blackbody(Kb), tr = Math.min(1, (ctx.trip || 0) * .4), tint = ctx.tint, rgb = tint && tr > .01 ? base.map((v, k) => Math.round((v + (tint[k] - v) * tr) / 16) * 16) : base;
    // a star that holds its size is baked at its exact DEVICE radius and blitted 1:1 (bloom, corona and disc); zooming uses buckets
    const m = devOf(c), dpr = m ? m.a : 1, Rd = Math.round(r * dpr), sk = S.stab.get(seed);
    if (!sk) S.stab.set(seed, { Rd, n: O.settle }); else if (sk.Rd !== Rd) { sk.Rd = Rd; sk.n = 0; } else sk.n++;
    const exact = !!m && Rd >= 4 && Rd <= O.maxR[q] && (!sk || sk.n >= O.settle);
    const R = exact ? Rd : Math.min(O.maxR[q], Math.max(4, Math.pow(2, Math.round(Math.log2(r * dpr) * 2) / 2) | 0)), w = R * 2 + 2, nb = O.boil[q];
    const sw = Math.max(0, Math.min(1, ctx.swell || 0)), still = exact && sw < .01, grow = 1 + O.swellGrow * sw, bright = 1 + O.swellBright * sw, ga = c.globalAlpha, gco = c.globalCompositeOperation, rk = rgb.join(',');
    // bloom (3 layers, one cached gradient sprite scaled) and corona under the disc, additive
    // the trippy tint and the swell live in the bloom (a live gradient: any colour, any size, no bake); disc + corona stay the real
    // blackbody colour, baked once and blitted 1:1
    c.globalCompositeOperation = 'lighter'; const bk = base.join(',');
    const bw = Math.round(2 * O.bloom[0] * Rd), bkey = `sbloom3:${rk}:${bw}`, lbe = S.lastBloom.get(seed), lb = lbe && sprites.map.has(lbe.k) ? lbe.c : null;   // never an evicted (pooled, maybe repainted) canvas
    let bx = exact ? (sprites.map.has(bkey) ? sprites.get(bkey, bw, bw, null) : null) : null;   // a swell brightens the bloom, never resizes it (1:1 always)
    if (exact && !bx) { if (!S.jobs.some(J => J.key === bkey)) S.jobs.push({ key: bkey, bw, paint: (xx, ww) => paintBloom3(xx, ww, rgb, O) }); if (lb && lb.width === bw) bx = lb; }
    if (exact && rgb === base && !bx && !lb) bx = sprites.get(bkey, bw, bw, (xx, ww) => paintBloom3(xx, ww, rgb, O));   // the real colour: bake at once (one time)
    if (bx) { const le = S.lastBloom.get(seed); if (!le || le.c !== bx) S.lastBloom.set(seed, { c: bx, k: bx === lb ? lbe.k : bkey }); const br = bw / (2 * dpr); c.globalAlpha = Math.min(1, ga * bright); S.st.blit1 += blit(c, bx, x - br, y - br, br * 2, br * 2, m); }
    else { const br = r * O.bloom[0] * grow; c.globalAlpha = Math.min(1, ga * bright); c.fillStyle = bloomGrad(c, x, y, br, rgb, O); c.beginPath(); c.arc(x, y, br, 0, TAU); c.fill(); }   // swelling or tinted: live
    const CR = exact ? R : Math.min(R, 96), cw = Math.ceil(CR * 2 * O.coronaR), cok = `scor:${seed}:${CR}:${bk}`, co = sprIdle('c' + seed, R2 => { const w2 = Math.ceil(R2 * 2 * O.coronaR); return [`scor:${seed}:${R2}:${bk}`, w2, (xx, ww) => paintCorona(xx, ww, R2, base, seed, O), () => coronaRows(w2, R2, base, seed, O)]; }, CR);
    if (co) { const shim = 1 + O.shimmer * Math.sin(t * .37 + seed) * Math.sin(t * .23 + 1.3), cr = exact ? cw / (2 * dpr) : r * O.coronaR * grow; c.globalAlpha = Math.min(1, ga * shim * (.85 + .5 * sw));
      const corW = i => { if (i === 2) return co; const kk = `scorw:${seed}:${CR}:${bk}:${i}`; if (sprites.map.has(kk)) return sprites.get(kk, cw, cw, null);
        if (!S.jobs.some(J => J.key === kk)) S.jobs.push({ key: kk, bw: cw, need: cok, paint: (xx, ww) => { xx.translate(ww / 2, ww / 2); xx.rotate((i - 2) / 2 * O.wobble); xx.drawImage(co, -ww / 2, -ww / 2); } }); return null; };
      if (sw > .01) {   // BIG MOMENT ONLY: the streamers writhe (two copies turning against each other, slow, not on the beat) and the flares grow out
        const wa = O.wobble * sw, ph = t * TAU * O.wobbleHz + seed, sm = c.getTransform();
        // the streamers writhe: the corona baked at 5 turn angles (-wobble..+wobble, idle-baked), two neighbours crossfaded 1:1
        const ca = Math.min(1, ga * shim * (.85 + .5 * sw)), wv = Math.max(-1, Math.min(1, (Math.sin(ph) + Math.sin(ph * 1.37 + 1) * .5) / 1.5 * Math.min(1, sw * 2))), wf = (wv + 1) * 2, w0 = Math.min(3, Math.floor(wf)), wt = wf - w0;
        const cv0 = corW(w0), cv1 = corW(w0 + 1); if (cv0 && cv1) { const xt = Math.max(0, Math.min(1, (wt - .3) / .4));   // one blit most of the time: crossfade only in the middle of a step
          if (xt < 1) { c.globalAlpha = ca * (xt > 0 ? 1 - xt : 1); blit(c, cv0, x - cr, y - cr, cr * 2, cr * 2, m); } if (xt > 0) { c.globalAlpha = ca * xt; blit(c, cv1, x - cr, y - cr, cr * 2, cr * 2, m); } }
        else blit(c, co, x - cr, y - cr, cr * 2, cr * 2, m);
        // flares grow: 6 baked growth stages (loop height x 1/6 .. 1, feet stay on the limb), the nearest one shown (one 1:1 blit)
        const si = Math.max(0, Math.min(5, Math.round(sw * 6) - 1)), fk = exact ? cw / (2 * dpr) : r * O.coronaR, fl = sprites.get(`sflare:${seed}:${CR}:${si}`, cw, cw, (xx, ww) => paintFlares(xx, ww, CR, seed, O, (si + 1) / 6), true);
        if (fl) { c.globalAlpha = Math.min(1, ga * O.flareA * Math.min(1, sw * 3)); S.st.blit1 += blit(c, fl, x - fk, y - fk, fk * 2, fk * 2, m); } }
      else blit(c, co, x - cr, y - cr, cr * 2, cr * 2, m); }   // between big moments: the shimmer is alpha only (1:1 blit)
    // disc: the granulation drifts by crossfading the baked boil variants slowly (O.drift seconds per variant), no beat at all
    c.globalCompositeOperation = gco; const ph = t / O.drift, v0 = Math.floor(ph) % nb, v1 = (v0 + 1) % nb, f = smooth(0, 1, ph - Math.floor(ph));
    const d0 = sprIdle('d' + seed + ':' + v0, R2 => [`sdisc:${seed}:${R2}:${bk}:${v0}`, R2 * 2 + 2, (xx, ww) => paintDisc(xx, ww, R2, base, seed, v0, O), () => discRows(R2 * 2 + 2, R2, base, seed, v0, O)], R), d1 = f > .02 ? sprIdle('d' + seed + ':' + v1, R2 => [`sdisc:${seed}:${R2}:${bk}:${v1}`, R2 * 2 + 2, (xx, ww) => paintDisc(xx, ww, R2, base, seed, v1, O), () => discRows(R2 * 2 + 2, R2, base, seed, v1, O)], R) : null;
    const k = exact ? w / (2 * dpr) : r * w / (R * 2);
    if (d0) { c.globalAlpha = ga; S.st.blit1 += blit(c, d0, x - k, y - k, k * 2, k * 2, m); } else { c.fillStyle = `rgb(${bk})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    if (d1) { c.globalAlpha = ga * f; blit(c, d1, x - k, y - k, k * 2, k * 2, m); }
    if (sw > .01) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, ga * .5 * sw);   // a hot overexposed core only in a swell
      if (exact) {   // 6 growth stages baked at the exact device size (idle), one 1:1 blit
        const si = Math.max(0, Math.min(5, Math.round(sw * 6) - 1)), hw = Math.round(2 * 1.25 * (1 + O.swellGrow * (si + 1) / 6) * Rd), hk = `shot:${rk}:${hw}`;
        const hs = sprites.map.has(hk) ? sprites.get(hk, hw, hw, null) : null; if (hs) S.st.blit1 += blit(c, hs, x - hw / (2 * dpr), y - hw / (2 * dpr), hw / dpr, hw / dpr, m);
        else if (!S.jobs.some(J => J.key === hk)) S.jobs.push({ key: hk, bw: hw, paint: (xx, ww) => paintBloom(xx, ww, rgb) }); }
      else { const br = r * 1.25 * grow, bl = sprites.get(`sbloom:${rk}`, 128, 128, (xx, ww) => paintBloom(xx, ww, rgb), true); c.drawImage(bl, x - br, y - br, br * 2, br * 2); } }
    c.globalCompositeOperation = gco; c.globalAlpha = ga; return true; };
  return S; }
