// ZOOM SWEEP (Visuals, parent 11:52 PM MDT): pixel check of the look across a pinch. Real app, headless Chromium 412x915 dpr 1, no audio.
// Pinch ground -> galaxy -> ground (setZoom every rAF, like a finger), then into the focus ohm (dive z 0 -> 3) and back out.
// Screens are sampled while the gesture runs (nothing waits for idle bakes, so a half-baked slice would be caught).
// Flags: blank frames, hard full-width row / full-height column STEPS (the picture changes across a straight cut: a slice seam or an
// unfilled strip; a full-width line a few px thick, such as the dive wave, is not a step: the step must hold ~15 px out on both sides and is not flagged), pops (a frame-to-frame jump far above its
// neighbours). Also reports the character-ohm bake counters over the sweep (rebakes per zoom step must stay ~0).
// node tests/look_zoom_sweep.mjs [www dir] [png dir]   (ZS_GATE=0 to report only)
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
let pw = null; try { pw = require('playwright'); } catch (e) { console.log('look_zoom_sweep: no Playwright, SKIPPED'); process.exit(0); }
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.argv[2] || new URL('../www/', import.meta.url).pathname, dump = process.argv[3] || null, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
if (dump) fs.mkdirSync(dump, { recursive: true });
const B = await pw.chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(SEED(+(process.env.SEED || 20261025)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0`); await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 });
await pg.evaluate(() => { const c = JO.world.opts.autojam; if (c) c.on = false; }); await pg.waitForTimeout(4000);
// the gestures run inside the page on rAF; the test only samples screens while they run
const GEST = {
  out: () => { const w = JO.world, t0 = performance.now(), T = 6000; window.__g = 1; const f = () => { const u = Math.min(1, (performance.now() - t0) / T), e = u * u * (3 - 2 * u); w.setZoom(-5 * e); if (u < 1) requestAnimationFrame(f); else window.__g = 0; }; f(); },
  back: () => { const w = JO.world, t0 = performance.now(), T = 4000; window.__g = 1; const f = () => { const u = Math.min(1, (performance.now() - t0) / T), e = u * u * (3 - 2 * u); w.setZoom(-5 * (1 - e)); if (u < 1) requestAnimationFrame(f); else window.__g = 0; }; f(); },
  close: () => { const w = JO.world, t0 = performance.now(), T = 3000; window.__g = 1; const f = () => { const u = Math.min(1, (performance.now() - t0) / T); w.setZoom(.9 * Math.sin(u * Math.PI)); if (u < 1) requestAnimationFrame(f); else window.__g = 0; }; f(); },
  dive: () => { const w = JO.world, D = w.zl && w.zl.dive, o = JO.sim.ohm; window.__g = 1; if (!D) { window.__g = 0; return; } w.setZoom(0); D.enter(o, innerWidth / 2, innerHeight * .4, 40); D.z = .02; const t0 = performance.now(), T = 7000;
    const f = () => { const u = Math.min(1, (performance.now() - t0) / T), h = 1 - Math.abs(2 * u - 1), e = h * h * (3 - 2 * h); if (!D.o) D.enter(o, innerWidth / 2, innerHeight * .4, 40); D.z = Math.max(.02, 3 * e); D.v = 0; if (u < 1) requestAnimationFrame(f); else { D.z = 0; if (D.leave) D.leave(); window.__g = 0; } }; f(); } };
const ANALYSE = async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const W = im.width, H = im.height, c = new OffscreenCanvas(W, H), x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, W, H).data, L = new Float32Array(W * H); let s = 0, s2 = 0; for (let i = 0; i < W * H; i++) { const v = .3 * d[i * 4] + .59 * d[i * 4 + 1] + .11 * d[i * 4 + 2]; L[i] = v; s += v; s2 += v * v; }
  // median of 6 samples along a row/column strip (a 1-2 px line inside a side does not move it)
  const M6 = (A, o, st) => { const v = [A[o], A[o + st], A[o + 2 * st], A[o + 3 * st], A[o + 4 * st], A[o + 5 * st]].sort((p, q) => p - q); return (v[2] + v[3]) / 2; };
  const mean = s / (W * H), sd = Math.sqrt(Math.max(0, s2 / (W * H) - mean * mean)); const TH = 24, X0 = 2, Y0 = 48 + 18;   // skip the top 40 px (dev button / status) and a 2 px border
  let rowBad = [], colBad = []; for (let y = Y0; y < H - 20; y++) { let n = 0; for (let xx = X0; xx < W - X0; xx++) { const a = M6(L, (y - 7) * W + xx, W), b = M6(L, (y + 2) * W + xx, W), a2 = M6(L, (y - 18) * W + xx, W), b2 = M6(L, (y + 13) * W + xx, W); if (Math.abs(a - b) > TH && (a2 - b2) * Math.sign(a - b) > TH * .6) n++; } if (n / (W - 2 * X0) > .9) rowBad.push(y); }
  for (let xx = X0 + 18; xx < W - 20; xx++) { let n = 0; for (let y = Y0; y < H - 2; y++) { const r = y * W + xx, a = M6(L, r - 7, 1), b = M6(L, r + 2, 1), a2 = M6(L, r - 18, 1), b2 = M6(L, r + 13, 1); if (Math.abs(a - b) > TH && (a2 - b2) * Math.sign(a - b) > TH * .6) n++; } if (n / (H - 2 - Y0) > .9) colBad.push(xx); }
  // a small luminance thumbnail for the frame-to-frame jump
  const th = []; for (let by = 0; by < 23; by++) for (let bx = 0; bx < 10; bx++) { let a = 0, k = 0; for (let y = by * 40; y < Math.min(H, by * 40 + 40); y += 4) for (let xx = bx * 41; xx < Math.min(W, bx * 41 + 41); xx += 4) { a += L[y * W + xx]; k++; } th.push(a / k); }
  return { mean: +mean.toFixed(1), sd: +sd.toFixed(1), rowBad, colBad, th }; };
const frames = []; let shot = 0;
const charStats = () => pg.evaluate(() => { const L = JO.render && JO.render.look, K = L && L.api && L.api.ohmChar; return K ? { ...K.stats } : null; });
for (const g of ['out', 'back', 'close', 'dive']) { const c0 = await charStats(); await pg.evaluate(GEST[g]); let i = 0;
  while (await pg.evaluate(() => window.__g)) { const buf = await pg.screenshot(); const z = await pg.evaluate(() => ({ z: +JO.world.cam.z.toFixed(2), dz: JO.world.zl && JO.world.zl.dive && JO.world.zl.dive.o ? +JO.world.zl.dive.z.toFixed(2) : null }));
    frames.push({ buf, g, i: i++, z: z.z, dz: z.dz }); if (dump) fs.writeFileSync(path.join(dump, `zs_${g}_${String(i - 1).padStart(3, "0")}.png`), buf); shot++; }
  const c1 = await charStats(); if (c0 && c1) console.log(`  ${g}: character ohms over the gesture: bodies ${c1.bodies - c0.bodies} stale-but-shown ${c1.stale - c0.stale} first-sight miss ${c1.miss - c0.miss}`);
  await pg.waitForTimeout(800); }
// analysed after the gestures, so the analysis does not slow the sampling
for (const f of frames) { Object.assign(f, await pg.evaluate(ANALYSE, f.buf.toString('base64'))); f.buf = null; }
let bad = 0; const flag = (f, why) => { bad++; console.log(`FLAG ${f.g} #${f.i} z ${f.z}${f.dz != null ? ' dive ' + f.dz : ''}: ${why}`); };
for (let k = 0; k < frames.length; k++) { const f = frames[k];
  if (f.sd < 3 || f.mean < 2) flag(f, `blank (mean ${f.mean}, sd ${f.sd})`);
  if (f.rowBad.length) flag(f, `hard full-width row edge at y ${f.rowBad.slice(0, 5).join(',')}`);
  if (f.colBad.length) flag(f, `hard full-height column edge at x ${f.colBad.slice(0, 5).join(',')}`); }
const jump = (a, b) => { let s = 0; for (let i = 0; i < a.th.length; i++) s += Math.abs(a.th[i] - b.th[i]); return s / a.th.length; };
for (let k = 1; k < frames.length; k++) { const f = frames[k]; if (f.g !== frames[k - 1].g) continue; f.j = jump(frames[k - 1], f); }
for (let k = 1; k < frames.length; k++) { const f = frames[k]; if (f.j == null) continue; const nb = []; for (let m = k - 4; m <= k + 4; m++) if (m !== k && frames[m] && frames[m].j != null && frames[m].g === f.g) nb.push(frames[m].j); nb.sort((a, b) => a - b);
  const med = nb.length ? nb[nb.length >> 1] : 0; if (f.j > Math.max(14, med * 4)) flag(f, `pop: frame jump ${f.j.toFixed(1)} vs neighbours ${med.toFixed(1)}`); }
for (const g of ['out', 'back', 'close', 'dive']) { const F = frames.filter(f => f.g === g); if (!F.length) continue; const J = F.filter(f => f.j != null).map(f => f.j); console.log(`  ${g}: ${F.length} frames, z ${F[0].z}..${F[F.length - 1].z}${F.some(f => f.dz != null) ? ', dive to ' + Math.max(...F.map(f => f.dz || 0)) : ''}, mean jump ${(J.reduce((a, b) => a + b, 0) / Math.max(1, J.length)).toFixed(1)}, max ${Math.max(0, ...J).toFixed(1)}`); }
console.log(`page errors: ${errs.length}${errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''}`);
console.log(bad ? `look_zoom_sweep: ${bad} flag(s)` : 'look_zoom_sweep: no blank frames, hard bands, seams or pops');
await B.close(); srv.close(); process.exit(bad && process.env.ZS_GATE !== '0' ? 1 : 0);
