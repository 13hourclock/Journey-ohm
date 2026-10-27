// GLOBE MESH (world track, real planet step 1): one terrain chunk of the cube-sphere quadtree, built from globe.js. Pure (no DOM):
// globe_worker.js runs it off the main thread; world3d.js falls back to running it in small time slices when workers are missing.
// A chunk = face f (0..5), level l, cell (i, j): 33x33 vertices (35x35 samples so normals are seamless across chunks) + skirts.
// The deepest level's spacing equals shape.js (1/64 of a home width). Attributes follow the Visuals seam (PLAN_REAL_PLANET 16):
//   position (relative to the chunk centre), normal, aH = (h, water depth), m0 = (rock, soil, veg, sand), m1 = (wet, ice, hollow, crack),
//   aF = (fold, fresh). Heights near the walked path carry the path delta band (pd: terrain features + changed ground from world.js), so
//   the land behind the ohms matches the ground they stand on.
export const N = 33, NS = N + 2, NV = N * N + 4 * N;
const FACES = [[[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
const Q = Math.PI / 4;
// direction of face f at cube coords (a, b) in -1..1 (tan warp: near-equal cell sizes)
export const cubeDir = (f, a, b, out) => { const F = FACES[f], x = Math.tan(a * Q), y = Math.tan(b * Q);
  const px = F[0][0] + x * F[1][0] + y * F[2][0], py = F[0][1] + x * F[1][1] + y * F[2][1], pz = F[0][2] + x * F[1][2] + y * F[2][2], l = 1 / Math.hypot(px, py, pz);
  out[0] = px * l; out[1] = py * l; out[2] = pz * l; return out; };
// shared index (grid + skirts), Uint16
export function chunkIndex() { const ix = []; const S = N * N;
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; ix.push(a, c, b, b, c, d); }
  const edge = k => { const e = []; for (let t = 0; t < N; t++) e.push(k === 0 ? t : k === 1 ? (N - 1) * N + t : k === 2 ? t * N : t * N + N - 1); return e; };
  for (let k = 0; k < 4; k++) { const e = edge(k), base = S + k * N; for (let t = 0; t < N - 1; t++) { const a = e[t], b = e[t + 1], c = base + t, d = base + t + 1; ix.push(a, b, c, b, d, c, a, c, b, b, c, d); } }
  return new Uint16Array(ix); }
// pd: { u0, spu, n, dh: Float32Array } path delta in h units over u0 .. u0 + n/spu (wrapping), band = half width in radians
export function buildChunk(G, f, l, i, j, pd) {
  const n2 = 1 << l, a0 = -1 + 2 * i / n2, b0 = -1 + 2 * j / n2, da = 2 / n2 / (N - 1);
  const hs = new Float32Array(NS * NS), wl = new Float32Array(NS * NS), dir = new Float32Array(NS * NS * 3), tmp = [0, 0, 0], s = {}, KH = G.KH, Cs = G.Cs;
  const sv = new Array(N * N), nn = G.n, band = .45 * G.radPerW, uo = {};
  const cd = cubeDir(f, a0 + da * (N - 1) / 2, b0 + da * (N - 1) / 2, [0, 0, 0]);
  let hmin = 1e9, hmax = -1e9;
  for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) { const k = y * NS + x; cubeDir(f, a0 + (x - 1) * da, b0 + (y - 1) * da, tmp); dir[3 * k] = tmp[0]; dir[3 * k + 1] = tmp[1]; dir[3 * k + 2] = tmp[2];
    G.sample(tmp[0], tmp[1], tmp[2], s); let h = s.h;
    if (pd) { const sa = tmp[0] * nn[0] + tmp[1] * nn[1] + tmp[2] * nn[2]; if (sa > -band * 3 && sa < band * 3) { G.uOfDir(tmp[0], tmp[1], tmp[2], uo); let x0 = (uo.u - pd.u0) % Cs; if (x0 < 0) x0 += Cs; x0 *= pd.spu;
      if (x0 < pd.n - 1) { const ii = x0 | 0, fr = x0 - ii, d = pd.dh[ii] * (1 - fr) + pd.dh[ii + 1] * fr, q = uo.a / band; h += d * Math.exp(-q * q); } } }
    hs[k] = h; wl[k] = s.wl; if (x > 0 && y > 0 && x < NS - 1 && y < NS - 1) { sv[(y - 1) * N + x - 1] = { temp: s.temp, moist: s.moist, river: s.river, lake: s.lake }; const top = Math.max(h, s.wl); if (top < hmin) hmin = top; if (top > hmax) hmax = top; } }
  const pos = new Float32Array(NV * 3), nrm = new Int8Array(NV * 3), aH = new Float32Array(NV * 2), m0 = new Uint8Array(NV * 4), m1 = new Uint8Array(NV * 4), aF = new Uint8Array(NV * 2);
  const P = (k, o) => { const r = 1 + KH * Math.max(hs[k], wl[k]); o[0] = dir[3 * k] * r; o[1] = dir[3 * k + 1] * r; o[2] = dir[3 * k + 2] * r; return o; };
  const pl = [0, 0, 0], pr = [0, 0, 0], pu = [0, 0, 0], pdn = [0, 0, 0], m = [0, 0, 0, 0, 0, 0], step = da * Q * (1 + 0) /* radians per cell (approx) */, wpr = Cs / (2 * Math.PI);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = (y + 1) * NS + x + 1, v = y * N + x; P(k, pl);
    pos[3 * v] = pl[0] - cd[0]; pos[3 * v + 1] = pl[1] - cd[1]; pos[3 * v + 2] = pl[2] - cd[2];
    P(k - 1, pl); P(k + 1, pr); P(k - NS, pdn); P(k + NS, pu);
    const ax = pr[0] - pl[0], ay = pr[1] - pl[1], az = pr[2] - pl[2], bx = pu[0] - pdn[0], by = pu[1] - pdn[1], bz = pu[2] - pdn[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const ln = Math.hypot(nx, ny, nz) || 1; nx /= ln; ny /= ln; nz /= ln;
    const dx = dir[3 * k], dy = dir[3 * k + 1], dz = dir[3 * k + 2]; if (nx * dx + ny * dy + nz * dz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    nrm[3 * v] = Math.round(nx * 127); nrm[3 * v + 1] = Math.round(ny * 127); nrm[3 * v + 2] = Math.round(nz * 127);
    // slope in h units per home width (the land's steepness as the 2D ground measures it)
    const gx = (hs[k + 1] - hs[k - 1]), gy = (hs[k + NS] - hs[k - NS]), cell = 2 * step * wpr * (1 / Math.max(.6, Math.cos(Math.abs((x / (N - 1)) * 2 - 1) * Q))), slope = Math.hypot(gx, gy) / cell;
    const sm = sv[v]; sm.h = hs[k]; G.mats(sm, slope, m); const wd = wl[k] - hs[k];
    aH[2 * v] = hs[k]; aH[2 * v + 1] = wd > 0 ? wd : 0;
    m0[4 * v] = m[0] * 255; m0[4 * v + 1] = m[1] * 255; m0[4 * v + 2] = m[2] * 255; m0[4 * v + 3] = m[3] * 255; m1[4 * v] = m[4] * 255; m1[4 * v + 1] = m[5] * 255; }
  // skirts: copies of the edge vertices pushed down (hide cracks between levels)
  const sk = KH * 2.5 + (1 << Math.max(0, 6 - l)) * .002;
  for (let e = 0; e < 4; e++) for (let t = 0; t < N; t++) { const src = e === 0 ? t : e === 1 ? (N - 1) * N + t : e === 2 ? t * N : t * N + N - 1, v = N * N + e * N + t;
    const px = pos[3 * src] + cd[0], py = pos[3 * src + 1] + cd[1], pz = pos[3 * src + 2] + cd[2], r = Math.hypot(px, py, pz), k2 = (r - sk) / r;
    pos[3 * v] = px * k2 - cd[0]; pos[3 * v + 1] = py * k2 - cd[1]; pos[3 * v + 2] = pz * k2 - cd[2];
    for (let q = 0; q < 3; q++) nrm[3 * v + q] = nrm[3 * src + q]; aH[2 * v] = aH[2 * src]; aH[2 * v + 1] = aH[2 * src + 1];
    for (let q = 0; q < 4; q++) { m0[4 * v + q] = m0[4 * src + q]; m1[4 * v + q] = m1[4 * src + q]; } }
  // bounding sphere (relative to the centre)
  let br = 0; for (let v = 0; v < N * N; v++) { const d = Math.hypot(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]); if (d > br) br = d; }
  return { f, l, i, j, cx: cd[0], cy: cd[1], cz: cd[2], br, hmin, hmax, pos, nrm, aH, m0, m1, aF };
}
// equirect bakes (u = longitude atan2(y, x), v = latitude asin(z)), the same mapping the cloud + planet shaders read
const eqDir = (x, y, w, h, o) => { const lon = ((x + .5) / w - .5) * 2 * Math.PI, lat = ((y + .5) / h - .5) * Math.PI, c = Math.cos(lat); o[0] = c * Math.cos(lon); o[1] = c * Math.sin(lon); o[2] = Math.sin(lat); return o; };
export function bakeClouds(G, t, w = 256, h = 128) { const a = new Uint8Array(w * h * 4), d = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { eqDir(x, y, w, h, d); const v = G.cloudAt(d[0], d[1], d[2], t), k = 4 * (y * w + x); a[k] = a[k + 1] = a[k + 2] = Math.round(v * 255); a[k + 3] = 255; } return a; }
// a far planet's surface colour (linear RGB 0..255) from its own globe: materials x palette, water, the same as its chunks would show
export function bakePlanet(G, w = 64, h = 32) { const a = new Uint8Array(w * h * 4), d = [0, 0, 0], s = {}, m = [0, 0, 0, 0, 0, 0], P = G.palette, lin = v => Math.pow(v, 2.2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { eqDir(x, y, w, h, d); G.sample(d[0], d[1], d[2], s); G.mats(s, .3, m); const k = 4 * (y * w + x);
    const sm = m[0] + m[1] + m[2] + m[3] + m[5] || 1; let c = [0, 1, 2].map(i => (P[0][i] * m[0] + P[1][i] * m[1] + P[2][i] * m[2] + P[3][i] * m[3] + P[4][i] * m[5]) / sm);
    if (s.wl > s.h) c = G.seaColor; for (let i = 0; i < 3; i++) a[k + i] = Math.round(Math.min(1, lin(c[i])) * 255); a[k + 3] = 255; } return a; }
