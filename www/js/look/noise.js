// LOOK / noise: seeded 3D gradient noise + fBm / ridged / warped, used only at BAKE time (planet textures, ground tiles,
// star granulation), never per frame. The GLSL twin (GLSL_NOISE) is the same idea on the GPU for the WebGL materials.
// Pure functions of the seed: the same planet always bakes the same.
export const hash32 = (a, b = 0) => { let h = (a ^ Math.imul(b + 0x9e3779b9, 0x85ebca6b)) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x7feb352d); h = Math.imul(h ^ (h >>> 15), 0x846ca68b); return (h ^ (h >>> 16)) >>> 0; };
export const rand01 = (seed, k) => hash32(seed >>> 0, k) / 4294967296;
const G = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1], [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1]];
export function createNoise(seed = 1) {
  const p = new Uint8Array(512), gx = new Float32Array(16), gy = new Float32Array(16), gz = new Float32Array(16);
  for (let i = 0; i < 16; i++) { gx[i] = G[i][0]; gy[i] = G[i][1]; gz[i] = G[i][2]; }
  const perm = []; for (let i = 0; i < 256; i++) perm.push(i);
  for (let i = 255; i > 0; i--) { const j = hash32(seed, i) % (i + 1); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  // classic Perlin gradient noise, ~[-1, 1]
  const n3 = (x, y, z) => { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); x -= X; y -= Y; z -= Z; const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const u = fade(x), v = fade(y), w = fade(z), A = p[xi] + yi, AA = p[A] + zi, AB = p[A + 1] + zi, B = p[xi + 1] + yi, BA = p[B] + zi, BB = p[B + 1] + zi;
    const d = (h, a, b, c) => { h &= 15; return gx[h] * a + gy[h] * b + gz[h] * c; }, l = (a, b, t) => a + (b - a) * t;
    return l(l(l(d(p[AA], x, y, z), d(p[BA], x - 1, y, z), u), l(d(p[AB], x, y - 1, z), d(p[BB], x - 1, y - 1, z), u), v),
      l(l(d(p[AA + 1], x, y, z - 1), d(p[BA + 1], x - 1, y, z - 1), u), l(d(p[AB + 1], x, y - 1, z - 1), d(p[BB + 1], x - 1, y - 1, z - 1), u), v), w); };
  const fbm = (x, y, z, oct = 5, lac = 2.03, gain = .5) => { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * n3(x * f, y * f, z * f); n += a; a *= gain; f *= lac; } return s / n; };
  // ridged: sharp crests (mountain ranges), 0..1
  const ridged = (x, y, z, oct = 5) => { let s = 0, a = .5, f = 1, n = 0, w = 1; for (let i = 0; i < oct; i++) { let r = 1 - Math.abs(n3(x * f, y * f, z * f)); r *= r; s += a * r * w; w = Math.min(1, r * 2); n += a; a *= .5; f *= 2.1; } return s / n; };
  // domain-warped fbm: continents with natural, twisted coasts
  const warp = (x, y, z, oct = 5, k = .6) => { const qx = fbm(x + 5.2, y + 1.3, z, 3), qy = fbm(x, y + 9.1, z + 2.8, 3), qz = fbm(x + 3.7, y, z + 7.4, 3); return fbm(x + k * qx, y + k * qy, z + k * qz, oct); };
  return { n3, fbm, ridged, warp };
}
export const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
