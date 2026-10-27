// LOOK / galaxy (#10, Wilbow 10:06 PM MDT Oct 25 "Galaxies more realistic. There's too much color"): a REAL-looking spiral galaxy,
// baked once per seed in idle time (row chunks into a hidden canvas; the finished image swaps in whole, never half-baked) and drawn
// per frame as ONE image ('lighter', rotated + squashed by the tilt). Bulge (warm, smooth), exponential disc, clumpy log-spiral arms
// with dark dust lanes on their inner edge, sparse pink HII knots and blue-white young clusters (low saturation), a fine star field.
// Music only adds LIGHT: st.music (0..1) lifts the arms a little; the surface colours never change.
// look.galaxy(c, cx, cy, R, tilt, seed, st) -> true when drawn, false while the first bake for that seed runs (world draws its own).
import { createNoise, rand01, hash32 } from './noise.js';
export const GALAXY_OPTS = { on: true, N: 384, rows: 24, arms: 2, pitch: .3, armK: 1.7, dust: .55, bulge: .16, disc: .34, sat: .35, knots: 90, field: 2200, music: .25, maxSets: 3 };
export function createGalaxy({ makeCanvas, opts = {} } = {}) {
  const O = { ...GALAXY_OPTS, ...opts }, GX = { O, sets: new Map(), jobs: [], stats: { drawn: 0, bakes: 0, bakeMs: 0, miss: 0 } };
  const mk = (w, h) => makeCanvas ? makeCanvas(w, h) : (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : null);
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  // one bake job: rows of the density / colour field into a Float32 buffer, then the knots + field stars, then the swap
  const start = seed => { const N = O.N, nz = createNoise(seed >>> 0), buf = new Uint8ClampedArray(N * N * 4), arms = O.arms + (rand01(seed, 1) < .3 ? 1 : 0), pitch = O.pitch * (.65 + .8 * rand01(seed, 2)), bK = .75 + .6 * rand01(seed, 4), dK = .8 + .45 * rand01(seed, 5), ph = rand01(seed, 3) * 6.283, k = 1 / Math.tan(pitch);
    const J = { seed, N, row: 0, buf, done: false, step: null };
    J.step = budget => { const t0 = now(); while (J.row < N && now() - t0 < budget) { const y = J.row++, v = (y + .5) / N * 2 - 1;
        for (let x = 0; x < N; x++) { const u = (x + .5) / N * 2 - 1, r = Math.sqrt(u * u + v * v); const i = (y * N + x) * 4; if (r > 1) { buf[i + 3] = 0; continue; }
          const th = Math.atan2(v, u), lr = Math.log(Math.max(.02, r)), a = th * arms - k * lr * arms + ph;   // log spiral phase
          const ca = .5 + .5 * Math.cos(a), arm = Math.pow(ca, 2.2), lane = Math.pow(.5 + .5 * Math.cos(a + .55), 10);   // lane: just inside each arm
          const cl = .55 + .45 * nz.fbm(u * 6, v * 6, seed % 97, 4), cl2 = Math.max(0, nz.fbm(u * 14 + 3, v * 14, 7, 3));
          const disc = Math.exp(-r / (O.disc * dK)) * (1 - Math.pow(r, 6)), bul = Math.exp(-Math.pow(r / (O.bulge * bK), .7) * 2.2);
          const armL = disc * arm * O.armK * cl * Math.min(1, r * 4) * (.7 + .8 * cl2), dust = 1 - O.dust * lane * Math.min(1, r * 5) * (1 - bul) * (.6 + .4 * cl);
          const L = Math.max(0, (bul * 1.6 + disc * .45 + armL) * dust), blueK = Math.min(1, armL / (L + 1e-4));   // arms bluer, bulge / disc warmer
          let R0 = 255, G0 = 222, B0 = 180; R0 += (205 - R0) * blueK; G0 += (218 - G0) * blueK; B0 += (245 - B0) * blueK;   // warm core -> blue-white arms
          const lum = .3 * R0 + .59 * G0 + .11 * B0; R0 = lum + (R0 - lum) * O.sat * 2; G0 = lum + (G0 - lum) * O.sat * 2; B0 = lum + (B0 - lum) * O.sat * 2;
          const Lc = 1 - Math.exp(-L * 1.4); buf[i] = R0 * Lc; buf[i + 1] = G0 * Lc; buf[i + 2] = B0 * Lc; buf[i + 3] = 255 * Math.min(1, Lc * 1.2); } }
      if (J.row < N) return false;
      const cv = mk(N, N); if (!cv) { J.done = true; return true; } const g = cv.getContext('2d'); g.putImageData(new ImageData(buf, N, N), 0, 0);
      g.globalCompositeOperation = 'lighter';
      for (let q = 0; q < O.field; q++) { const rr = Math.sqrt(rand01(seed, 100 + q)) * .98, aa = rand01(seed, 9000 + q) * 6.283, px = N / 2 * (1 + rr * Math.cos(aa)), py = N / 2 * (1 + rr * Math.sin(aa)), b = rand01(seed, 17000 + q);
        g.globalAlpha = .12 + .4 * b * b; g.fillStyle = b > .8 ? '#dfe6ff' : b > .5 ? '#fff4e6' : '#f2ecdf'; const s = b > .93 ? 1.4 : .8; g.fillRect(px - s / 2, py - s / 2, s, s); }
      for (let q = 0; q < O.knots; q++) { const rr = .18 + .7 * rand01(seed, 30000 + q), lr = Math.log(rr), arm = (hash32(seed, 31000 + q) % arms), th = (k * lr * arms - ph + arm * 6.283 + (rand01(seed, 32000 + q) - .5) * .5) / arms;   // on the arms
        const px = N / 2 * (1 + rr * Math.cos(th)), py = N / 2 * (1 + rr * Math.sin(th)), hot = rand01(seed, 33000 + q) < .55, rad = .8 + 1.6 * rand01(seed, 34000 + q), kA = .18 + .25 * rand01(seed, 35000 + q);
        const gg = g.createRadialGradient(px, py, 0, px, py, rad * 2); gg.addColorStop(0, hot ? `rgba(236,190,200,${kA.toFixed(2)})` : `rgba(205,220,255,${kA.toFixed(2)})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 1; g.fillStyle = gg; g.fillRect(px - rad * 2, py - rad * 2, rad * 4, rad * 4); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      GX.sets.set(seed, { cv, u: 0 }); if (GX.sets.size > O.maxSets) { let ok = null, ou = Infinity; for (const [s, e] of GX.sets) if (e.u < ou) { ou = e.u; ok = s; } GX.sets.delete(ok); }
      J.done = true; GX.stats.bakes++; return true; };
    return J; };
  GX.pump = ms => { const t0 = now(); while (GX.jobs.length && now() - t0 < ms) { const J = GX.jobs[0]; if (J.step(ms - (now() - t0))) GX.jobs.shift(); } GX.stats.bakeMs += now() - t0; return now() - t0; };
  GX.want = seed => { seed = seed >>> 0; if (GX.sets.has(seed) || GX.jobs.some(j => j.seed === seed)) return; GX.jobs.push(start(seed)); };
  GX.bakeNow = seed => { GX.want(seed); while (GX.jobs.length) GX.pump(1e9); };   // tests only
  GX.draw = (c, cx, cy, R, tilt = 0, seed = 1, st) => { if (!O.on || !(R > 1)) return false; seed = seed >>> 0; const E = GX.sets.get(seed); if (!E) { GX.want(seed); GX.stats.miss++; return false; }
    E.u = GX.stats.drawn++; const a0 = c.globalAlpha, op = c.globalCompositeOperation, amt = st && st.amt != null ? st.amt : 1, mus = st && st.music ? st.music : 0, rot = st && st.rot || 0;
    c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(1, Math.max(.12, Math.cos(tilt || 0))); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a0 * Math.min(1, amt * (1 + O.music * mus)); c.drawImage(E.cv, -R, -R, 2 * R, 2 * R); c.restore();
    c.globalAlpha = a0; c.globalCompositeOperation = op; return true; };
  return GX;
}
