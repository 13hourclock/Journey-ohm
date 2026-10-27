// NOISE (world track, real planet step 1): seeded 3D simplex noise + fBm / ridged sums. Pure (no DOM), shared by the main thread
// (the walkable path) and globe_worker.js (terrain chunks, planet bakes, weather), so both see exactly the same planet.
const G3 = 1 / 6, F3 = 1 / 3;
const GR = new Float32Array([1,1,0, -1,1,0, 1,-1,0, -1,-1,0, 1,0,1, -1,0,1, 1,0,-1, -1,0,-1, 0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1]);
export function makeNoise(seed) {
  let s = (seed >>> 0) || 1; const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm = new Uint8Array(512); for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm[i] = (perm[i] % 12) * 3; }
  // 3D simplex, range about -1..1
  const n3 = (x, y, z) => {
    const sk = (x + y + z) * F3, i = Math.floor(x + sk), j = Math.floor(y + sk), k = Math.floor(z + sk), t = (i + j + k) * G3;
    const x0 = x - i + t, y0 = y - j + t, z0 = z - k + t; let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } }
    else { if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3, x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3, x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255; let n = 0, tt, g;
    tt = .6 - x0 * x0 - y0 * y0 - z0 * z0; if (tt > 0) { g = pm[ii + perm[jj + perm[kk]]]; tt *= tt; n += tt * tt * (GR[g] * x0 + GR[g + 1] * y0 + GR[g + 2] * z0); }
    tt = .6 - x1 * x1 - y1 * y1 - z1 * z1; if (tt > 0) { g = pm[ii + i1 + perm[jj + j1 + perm[kk + k1]]]; tt *= tt; n += tt * tt * (GR[g] * x1 + GR[g + 1] * y1 + GR[g + 2] * z1); }
    tt = .6 - x2 * x2 - y2 * y2 - z2 * z2; if (tt > 0) { g = pm[ii + i2 + perm[jj + j2 + perm[kk + k2]]]; tt *= tt; n += tt * tt * (GR[g] * x2 + GR[g + 1] * y2 + GR[g + 2] * z2); }
    tt = .6 - x3 * x3 - y3 * y3 - z3 * z3; if (tt > 0) { g = pm[ii + 1 + perm[jj + 1 + perm[kk + 1]]]; tt *= tt; n += tt * tt * (GR[g] * x3 + GR[g + 1] * y3 + GR[g + 2] * z3); }
    return 32 * n; };
  const fbm = (x, y, z, oct, lac = 2.03, gain = .5) => { let a = 1, f = 1, s = 0, w = 0; for (let o = 0; o < oct; o++) { s += a * n3(x * f, y * f, z * f); w += a; a *= gain; f *= lac; } return s / w; };
  // ridged multifractal: sharp crests, each octave weighted by the one before (mountain chains, not bumps)
  const ridged = (x, y, z, oct, lac = 2.1, gain = .5) => { let a = 1, f = 1, s = 0, w = 0, prev = 1; for (let o = 0; o < oct; o++) { let v = 1 - Math.abs(n3(x * f, y * f, z * f)); v *= v; s += v * a * prev; w += a; prev = Math.min(1, v * 1.6); a *= gain; f *= lac; } return s / w; };
  return { n3, fbm, ridged, rnd: r };
}
