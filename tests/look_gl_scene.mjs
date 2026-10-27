// Browser-side helpers for the look GL test, bench and previews (NOT shipped): stand-in geometry with the plan §16 attributes
// (h, m0, m1, m2, fold, fresh, river), the way Game Dev's chunks will carry them, so the look materials can be compiled, lit by a
// real DirectionalLight with shadows, timed and photographed headless. Geometry here is only a test stand-in, never a proposal.
import { createNoise } from '../www/js/look/noise.js';
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// a cube-sphere (seam-free) displaced by a ridged + warped relief; attributes from a simple climate model
export function planetGeo(T, p, seg = 64) { const N = createNoise(p.seed >>> 0), st = p.style || { rock: .5, ocean: .4, ice: .1, gas: 0 }, R = p.r || 1, sea = p.sea != null ? p.sea : -.55 + .85 * st.ocean;
  const pos = [], idx = [], H = [], M0 = [], M1 = [], M2 = [], FO = [], FR = []; const faces = [[0, 1, 2], [0, 2, 1], [1, 2, 0], [1, 0, 2], [2, 0, 1], [2, 1, 0]], sg = [1, -1];
  for (let f = 0; f < 6; f++) { const [a, b, c] = faces[f], s = sg[f & 1], base = pos.length / 3;
    for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) { const u = i / seg * 2 - 1, v = j / seg * 2 - 1, P = [0, 0, 0]; P[a] = s; P[b] = u * s; P[c] = v; const l = Math.hypot(...P), x = P[0] / l, y = P[1] / l, z = P[2] / l;
      const w = N.warp(x * 1.6, y * 1.6, z * 1.6, 5, .7), rid = N.ridged(x * 3, y * 3, z * 3, 4), e = w * 2.2 + (rid - .35) * .6 * st.rock;
      const hh = Math.max(-1, Math.min(1, e)), lat = Math.abs(y), temp = Math.max(0, Math.min(1, 1 - lat * 1.05 - Math.max(0, hh) * .5)), moist = .5 + .9 * N.fbm(x * 2 + 9, y * 2, z * 2, 3, 2, .5);
      const land = hh > sea, dh = (land ? hh : sea) * .06 * (1 - st.gas), rr = R * (1 + dh); pos.push(x * rr, y * rr, z * rr);
      const rock = sm(.3, .8, hh) * .8 + .1, veg = land ? sm(.25, .6, temp) * sm(.3, .6, moist) * (1 - sm(.6, .9, hh)) : 0, sand = land ? sm(sea + .08, sea, hh) : .6, soil = .3;
      H.push(hh); M0.push(rock, soil, veg, sand); M1.push(land ? moist * .3 : 1, temp < .12 ? 1 : 0, Math.max(0, -w) * .8, 0); M2.push(temp, moist, Math.min(1, rid * .6)); FO.push(0); FR.push(0); }
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const k = base + j * (seg + 1) + i; idx.push(k, k + 1, k + seg + 1, k + 1, k + seg + 2, k + seg + 1); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  // winding differs per cube face: orient EVERY triangle outward (a global flip left whole faces inside-out: black squares + acne)
  for (let i = 0; i < idx.length; i += 3) { const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3, ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2],
      vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * pos[a] + ny * pos[a + 1] + nz * pos[a + 2] < 0) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } }
  g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('h', new T.Float32BufferAttribute(H, 1)); g.setAttribute('m0', new T.Float32BufferAttribute(M0, 4)); g.setAttribute('m1', new T.Float32BufferAttribute(M1, 4));
  g.setAttribute('m2', new T.Float32BufferAttribute(M2, 3)); g.setAttribute('fold', new T.Float32BufferAttribute(FO, 1)); g.setAttribute('fresh', new T.Float32BufferAttribute(FR, 1)); return g; }
// a side-view ground strip as a deep heightfield ribbon (x along, y up, z into the view), with a river, fresh rise, a fold, a crack
// a side-view ground as a deep heightfield (x along, y up, z into the view): valleys, a ridge range, a river, a fresh rise, a fold,
// a crack; materials from the REAL slope of the mesh (flats green, cliffs rock, sand at the shore, snow by height / cold)
export function groundGeo(T, { seed = 3, nx = 220, nz = 90, W = 70, D = 60, amp = 3.2, river = true, sea = -.62 } = {}) { const N = createNoise(seed), pos = [], idx = [], H = [], RV = [], FO = [], FR = [], E = [];
  for (let k = 0; k <= nz; k++) for (let i = 0; i <= nx; i++) { const x = (i / nx - .5) * W, z = 6 - k / nz * D, e = N.warp(x * .045, z * .045, 0, 5, .6), rid = N.ridged(x * .07, z * .07, 1, 5),
      back = sm(-4, -40, z), hh = e * 1.1 + (rid - .3) * (.5 + 1.6 * back) + back * .9 - .1, rv = river ? Math.exp(-(((x - 6 - Math.sin(z * .18) * 4) / 1.1) ** 2)) * sm(.5, -.1, hh) : 0;
    pos.push(x, hh * amp - rv * .6, z); H.push(hh - rv * .2); RV.push(rv); E.push(e); FO.push(Math.exp(-(((x - 13) / 1.5) ** 2)) * .8 * sm(0, -8, z)); FR.push(Math.exp(-(((x + 13) / 2.5) ** 2)) * sm(2, -6, z)); }
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { const a = k * (nx + 1) + i; idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const nn = g.attributes.normal.array;
  if (nn[1] < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  const M0 = [], M1 = [], M2 = [], n2 = g.attributes.normal.array;
  for (let v = 0; v < H.length; v++) { const hh = H[v], x = pos[v * 3], slope = Math.min(1, Math.max(0, (1 - n2[v * 3 + 1]) * 3.2)), shore = sm(sea + .25, sea + .02, hh), temp = .8 - Math.max(0, hh) * .32, moist = .45 + .4 * N.fbm(x * .1, pos[v * 3 + 2] * .1, 7, 3, 2, .5) + RV[v] * .3;
    M0.push(.08 + slope * 1.1, .25 + .2 * (1 - slope), (1 - slope) * (1 - shore) * sm(.1, .5, moist) * sm(1.5, .7, hh) * 1.2, shore * (1 - slope));
    M1.push(Math.min(1, RV[v] * .8 + shore * .3 + .05), 0, Math.max(0, -E[v]) * .8, Math.exp(-(((x + 2) / .4) ** 2)) * .8); M2.push(temp, moist, slope); }
  for (const [n, a, s] of [['h', H, 1], ['m0', M0, 4], ['m1', M1, 4], ['m2', M2, 3], ['fold', FO, 1], ['fresh', FR, 1], ['river', RV, 1]]) g.setAttribute(n, new T.Float32BufferAttribute(a, s)); return g; }
// one stand-in scene per kind, lit by a real DirectionalLight from the star (shadows on), drawn with the look's materials.
// kind: 'system' (star + 3 planets), 'close' (rock/ocean planet + gas giant), 'ground' (side strip). Returns { R, scene, cam, mats, tick(st) }.
export function makeScene(T, look, kind, { w = 412, h = 915, canvas } = {}) {
  const R = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false }); R.setSize(w, h, false); R.setPixelRatio(1);
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = T.SRGBColorSpace;
  R.debug.checkShaderErrors = true; const errs = []; R.debug.onShaderError = (gl, prog, vs, fs) => { errs.push((gl.getShaderInfoLog(vs) || '') + (gl.getShaderInfoLog(fs) || '') + (gl.getProgramInfoLog(prog) || '')); };
  const scene = new T.Scene(); scene.background = new T.Color(0x010104); const cam = new T.PerspectiveCamera(kind === 'ground' ? 40 : 36, w / h, .05, 500), mats = [], meshes = [];
  const sun = new T.DirectionalLight(0xffffff, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005; sun.shadow.normalBias = kind === 'ground' ? .05 : .012; sun.shadow.mapSize.set(2048, 2048); scene.add(sun, sun.target);
  scene.add(new T.HemisphereLight(0x8898b0, 0x0a0806, kind === 'ground' ? .35 : .04));
  const add = (geo, m, pos = [0, 0, 0], cast = true) => { if (!m) return null; const me = new T.Mesh(geo, m); me.position.set(...pos); me.castShadow = cast; me.receiveShadow = true; scene.add(me); mats.push({ m, me }); meshes.push(me); return me; };
  const starfield = () => { const g = new T.BufferGeometry(), P = [], C = []; let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2400; i++) { const u = r() * 2 - 1, a = r() * 6.283, k = Math.sqrt(1 - u * u), d = 200; P.push(Math.cos(a) * k * d, u * d, Math.sin(a) * k * d); const b = Math.pow(r(), 3) * .9 + .05, tk = r(); C.push(b * (tk < .2 ? 1 : .8 + .2 * tk), b * .9, b * (tk > .7 ? 1 : .8)); }
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); scene.add(new T.Points(g, new T.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true }))); };
  const planets = [];
  const planet = (p, pos, seg = 64) => { const pm = look.planetMat(T, p, {}); const me = add(planetGeo(T, p, seg), pm, pos); planets.push({ p, me });
    const am = look.atmoMat && look.atmoMat(T, p, {}); if (am) add(new T.SphereGeometry(p.r * 1.06, 64, 32), am, pos, false);
    const S = p.style || {}; if ((S.ocean || 0) + (S.gas || 0) > .2) { const cm = look.cloudMat && look.cloudMat(T, p, {}); if (cm) add(new T.SphereGeometry(p.r * 1.018, 64, 32), cm, pos, false); }
    return me; };
  let starPos = [0, 0, 0], starR = 1;
  const star = (pos, r, K) => { starPos = pos; starR = r; const sm2 = look.starMat && look.starMat(T, { starK: K, star: { seed: 5, K } }); if (sm2) add(new T.SphereGeometry(r, 48, 24), sm2, pos, false);
    const cm = look.coronaMat && look.coronaMat(T, { starK: K, star: { seed: 5 } }); if (cm) { const q = add(new T.PlaneGeometry(r * 8, r * 8), cm, pos, false); q.userData.bill = true; } };
  starfield();
  if (kind === 'system') { star([.35, 1.25, 2.6], .26, 5600); planet({ seed: 11, id: 1, r: .55, style: { rock: .45, ocean: .45, ice: .1, gas: 0 } }, [.6, .2, 0]);
    planet({ seed: 23, id: 2, r: .95, style: { rock: .05, ocean: 0, ice: .1, gas: .85 } }, [-.9, -2.2, -1.5]); planet({ seed: 37, id: 3, r: .28, style: { rock: .6, ocean: 0, ice: .4, gas: 0 } }, [1.1, -.9, 1.2]);
    cam.position.set(.5, .2, 7.6); cam.lookAt(0, -.2, -1); }
  if (kind === 'close') { star([-30, 18, 10], 2.5, 5200); planet({ seed: 101, id: 4, r: 1, style: { rock: .45, ocean: .5, ice: .05, gas: 0 } }, [.15, 1.15, 0], 128);
    planet({ seed: 202, id: 5, r: 1.05, style: { rock: 0, ocean: 0, ice: .1, gas: .95 }, tilt: .3 }, [-.1, -1.35, -.5], 96); cam.position.set(0, 0, 6.2); cam.lookAt(0, 0, 0); }
  if (kind === 'ground') { star([-40, 22, 12], 3, 5000); const gm = look.groundMat(T, {}); add(groundGeo(T, {}), gm, [0, 0, 0]);
    const wm = look.waterMat && look.waterMat(T, null, {}); if (wm) { const wp = new T.Mesh(new T.PlaneGeometry(240, 240), wm); wp.rotation.x = -Math.PI / 2; wp.position.set(0, -.62 * 3.2, -20); wp.receiveShadow = true; scene.add(wp); mats.push({ m: wm, me: wp }); }
    cam.position.set(0, 3.4, 12); cam.lookAt(0, 1.2, -10); scene.background = new T.Color(0x6f8db8); scene.fog = new T.Fog(0x8fa7c8, 30, 110); }
  sun.position.set(...starPos); const tgt = kind === 'ground' ? [0, 0, -10] : [0, 0, 0]; sun.target.position.set(...tgt);
  const sc = sun.shadow.camera; const ss = kind === 'ground' ? 50 : kind === 'close' ? 3.2 : 4.5; sc.left = sc.bottom = -ss; sc.right = sc.top = ss; if (kind === 'ground') sun.shadow.mapSize.set(2048, 2048); sc.near = .1; sc.far = 200; sc.updateProjectionMatrix();
  const tick = (st = {}) => { const L = new T.Vector3(...starPos).sub(new T.Vector3(...tgt)).normalize(), bb = [1, .93, .84];
    const s2 = { lightDir: [L.x, L.y, L.z], starPos, starColor: bb, starR, view: { zoom: 1, layer: 0, pitch: 0 }, q: 0, ...st };
    for (const { m, me } of mats) { if (me.userData.bill) me.quaternion.copy(cam.quaternion);
      if (planets.length && m.userData.kind === 'planet') { const pl = planets.find(x => x.me === me); if (pl) { const d = new T.Vector3(...starPos).sub(me.position).normalize(); s2.lightDir = [d.x, d.y, d.z]; } }
      if (m.userData.tick) m.userData.tick(s2); }
    for (const pl of planets) pl.me.rotation.y = (st.t || 0) * .02 + pl.p.seed * .1; };
  return { R, scene, cam, mats, tick, errs, render: () => R.render(scene, cam) }; }
