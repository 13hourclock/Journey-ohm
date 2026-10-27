// ZOOM FRAME RECORDER (visual defects, not timing): runs the zoom probe gestures (tests/zoom_probe_core.mjs) at phone size + DPR and
// records what you SEE each frame (the #bg world canvas and the #c canvas composited like the browser does), plus per-frame image
// metrics (dark share, sharpness, change vs the last frame). node tools/zoom_frames.mjs <www dir> <out dir>
// env: LAYER=bg|c (one canvas only), DIAG=js expr logged per frame (metrics.json .diag), Q=0..3 (forced quality), THROTTLE=4, ONLY=regex, EVERY=2 (save every Nth frame), PRE=js, DPR=2.625, SCALE=1 (capture px per CSS px)
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
import { GESTURES, PROBE } from '../tests/zoom_probe_core.mjs';
const root = process.argv[2] || new URL('../www/', import.meta.url).pathname, OUT = process.argv[3] || '/workspace/zoomframes/run', TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const SEED = (n = 20261025) => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: +(process.env.DPR || 2.625) });
if (process.env.THROTTLE) { const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE }); }
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(SEED(+(process.env.SEED || 20261025)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0&autostart`); await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 });
if (process.env.Q) await pg.evaluate(q => { JO.quality.forced = q; }, +process.env.Q);
await pg.waitForTimeout(2500);
if (process.env.PRE) await pg.evaluate(process.env.PRE);
if (process.env.DIAG) await pg.evaluate('globalThis.__zdiag = () => (' + process.env.DIAG + ')');
// capture hook: after each probe frame (the app's rAF ran first, so both canvases hold this frame)
await pg.evaluate(({ every, scale, layer }) => { const W = innerWidth, H = innerHeight, cw = Math.round(W * scale), ch = Math.round(H * scale), C = document.createElement('canvas'); C.width = cw; C.height = ch; const x = C.getContext('2d', { willReadFrequently: true });
  const sw = 103, sh = 215, S = document.createElement('canvas'); S.width = sw; S.height = sh; const sx = S.getContext('2d', { willReadFrequently: true }); let prev = null;
  globalThis.__Z = { frames: [], metrics: [], i: 0 };
  globalThis.__zcap = () => { const Z = __Z, bg = document.getElementById('bg'), c = document.getElementById('c');
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.fillStyle = '#05040a'; x.fillRect(0, 0, cw, ch); x.imageSmoothingEnabled = true;
    if (bg && layer !== 'c') x.drawImage(bg, 0, 0, cw, ch); if (layer !== 'bg') x.drawImage(c, 0, 0, cw, ch);
    sx.drawImage(C, 0, 0, sw, sh); const d = sx.getImageData(0, 0, sw, sh).data, n = sw * sh, L = new Float32Array(n); let dark = 0, mean = 0;
    for (let i = 0; i < n; i++) { const l = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11; L[i] = l; mean += l; if (l < 9) dark++; }
    let sharp = 0; for (let y = 1; y < sh - 1; y++) for (let xx = 1; xx < sw - 1; xx++) { const i = y * sw + xx; sharp += Math.abs(4 * L[i] - L[i - 1] - L[i + 1] - L[i - sw] - L[i + sw]); }
    let diff = 0, big = 0; if (prev) for (let i = 0; i < n; i++) { const e = Math.abs(L[i] - prev[i]); diff += e; if (e > 40) big++; }
    // a big near-uniform dark block (empty region): share of 8x8 cells (of the small image) that are all dark
    let cells = 0, darkCells = 0; for (let cy = 0; cy + 8 <= sh; cy += 8) for (let cx = 0; cx + 8 <= sw; cx += 8) { cells++; let all = true; for (let yy = 0; yy < 8 && all; yy++) for (let q = 0; q < 8; q++) if (L[(cy + yy) * sw + cx + q] >= 9) { all = false; break; } if (all) darkCells++; }
    prev = L; const D = JO.world.zl && JO.world.zl.dive;
    Z.metrics.push({ i: Z.i, z: +JO.world.cam.z.toFixed(3), dz: D && D.o ? +D.z.toFixed(3) : 0, mean: +(mean / n).toFixed(1), dark: +(dark / n).toFixed(3), darkCells: +(darkCells / cells).toFixed(3), sharp: +(sharp / n).toFixed(2), diff: +(diff / n).toFixed(2), big: +(big / n).toFixed(3),
      diag: globalThis.__zdiag ? __zdiag() : undefined, dr: JO.frames && JO.frames.dr ? +(JO.frames.dr[JO.frames.dr.length - 1] || 0).toFixed(1) : 0 });
    if (Z.i % every === 0) Z.frames.push([Z.i, createImageBitmap(C)]); Z.i++; };
  globalThis.__zflush = async (k0, k1) => { const out = [], E = document.createElement('canvas'); E.width = cw; E.height = ch; const ex = E.getContext('2d');
    for (const [i, p] of __Z.frames.slice(k0, k1)) { const bm = await p; ex.drawImage(bm, 0, 0); bm.close(); out.push([i, E.toDataURL('image/png')]); } return out; };
}, { every: +(process.env.EVERY || 2), scale: +(process.env.SCALE || 1), layer: process.env.LAYER || 'both' });
const src = PROBE.toString().replace('const raf = () => new Promise(r => requestAnimationFrame(r));', 'const raf = () => new Promise(r => requestAnimationFrame(r)).then(() => globalThis.__zcap && globalThis.__zcap());');
if (src === PROBE.toString()) throw new Error('probe raf hook not found');
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null, GS = GESTURES.filter(g => !only || only.test(g.name)), summary = [];
for (let gi = 0; gi < GESTURES.length; gi++) { const g = GESTURES[gi];
  if (!GS.includes(g)) { if (only && g.z0 == null) {} continue; }
  await pg.evaluate(() => { __Z.frames = []; __Z.metrics = []; __Z.i = 0; });
  const res = await pg.evaluate(`(${src})(${JSON.stringify([g])})`);
  const dir = path.join(OUT, String(gi).padStart(2, '0') + '_' + g.name.replace(/[^a-z0-9]+/gi, '_')); fs.mkdirSync(dir, { recursive: true });
  const nF = await pg.evaluate(() => __Z.frames.length);
  for (let k = 0; k < nF; k += 20) { const part = await pg.evaluate(([a, c]) => __zflush(a, c), [k, k + 20]); for (const [i, u] of part) fs.writeFileSync(path.join(dir, 'f' + String(i).padStart(3, '0') + '.png'), Buffer.from(u.split(',')[1], 'base64')); }
  const M = await pg.evaluate(() => __Z.metrics); fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify(M));
  const setup = g.z0 != null ? 40 : 0; const act = M.slice(setup + 1), dmax = Math.max(0, ...act.map(m => m.diff)), dc = Math.max(0, ...act.map(m => m.darkCells));
  summary.push({ g: g.name, frames: M.length, setup, diffMax: dmax, darkCellsMax: dc, sharpMin: Math.min(...act.map(m => m.sharp)), sharpMax: Math.max(...act.map(m => m.sharp)) });
  console.log(`${g.name.padEnd(34)} frames ${M.length} diffMax ${dmax} darkCellsMax ${dc} sharp ${summary.at(-1).sharpMin}..${summary.at(-1).sharpMax}`); }
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log('page errors', errs.length, errs.slice(0, 3).join(' | '));
await b.close(); srv.close(); process.exit(0);
