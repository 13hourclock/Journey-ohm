// headless look bench (Visuals track): headless Chromium (Skia, closer to the Android WebView) by default = the gate; `CAIRO=1` (or no
// Playwright) runs the same body on node-canvas (cairo CPU raster, pessimistic proxy, not gated; skipped if canvas can't load). 50 ohm-sized bodies, light + rim + glow, each quality rung. No screenshots.
// Gate (Game Dev, 2:4x AM Oct 25): all look work <= ~3 ms/frame with 50 ohms on the box. MAX_LOOK=<ms> to fail above it.
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
import { bench, table, benchP1, tableP1 } from './look_bench_core.mjs';
const MAX = +(process.env.MAX_LOOK || 3); let rows, p1;
const tryReq = (from, m) => { try { return createRequire(from)(m); } catch (e) { return null; } };
const pw = tryReq(import.meta.url, 'playwright') || tryReq('/workspace/softsound/', 'playwright');   // repo first; then the box's shared Playwright (same one tests/pw_smoke.mjs uses)
if (process.env.CAIRO || !pw) { const { createCanvas, realCanvas, canvasNote } = await import('./_canvas.mjs');
  if (!realCanvas) { console.log(`look_bench: no Chromium (Playwright) and ${canvasNote}\nSKIPPED (nothing to time).`); process.exit(0); }
  const { createLook } = await import('../www/js/look/index.js');
  rows = await bench({ createLook, mkCanvas: createCanvas, makeCanvas: createCanvas, now: () => performance.now() });
  p1 = await benchP1({ createLook, mkCanvas: createCanvas, makeCanvas: createCanvas, now: () => performance.now() });
  console.log('node-canvas (cairo, CPU raster; a pessimistic proxy, NOT the gate):'); }
else { const { chromium } = pw, root = new URL('../', import.meta.url).pathname;
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(b); }); }).listen(0);
  const b = await chromium.launch(), pg = await b.newPage(); await pg.goto(`http://127.0.0.1:${srv.address().port}/tests/`).catch(() => {});
  await pg.setContent('<html><body></body></html>');
  rows = await pg.evaluate(async port => { const { bench } = await import(`http://127.0.0.1:${port}/tests/look_bench_core.mjs`), { createLook } = await import(`http://127.0.0.1:${port}/www/js/look/index.js`);
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; document.body.appendChild(c); return c; };
    const m = await import(`http://127.0.0.1:${port}/tests/look_bench_core.mjs`), a = { createLook, mkCanvas: mk, makeCanvas: (w, h) => new OffscreenCanvas(w, h), now: () => performance.now(), flush: g => g.getImageData(0, 0, 1, 1) };
    return [await bench(a), await m.benchP1(a)]; }, srv.address().port); [rows, p1] = rows;
  await b.close(); srv.close(); console.log('headless Chromium (Skia; each timing ends with a 1 px readback so queued GPU/raster work is counted):'); }
console.log(table(rows));
console.log('P1 (opts.p1), whole look per frame (frame + palette + layer field/over + 50 ohm + post), ms:'); console.log(tableP1(p1));
// one worst-case number per rung (neutral overlay + every P1 state incl. the peak swell), gated: q0 <= MAX, lower rungs <= MAX * [1, .8, .6, .3]
const KS = [1, .8, .6, .3]; let bad = 0; console.log('WORST CASE per rung (mean ms, any look case):');
for (let q = 0; q < 4; q++) { const r = rows[q], p = p1[q], cs = { 'neutral overlay': r.overlay.mean, 'P1 unhealed': p.unhealed.mean, 'P1 developing': p.developing.mean, 'P1 harmonised': p.harmonised.mean, 'P1 peak': p.peak.mean };
  const [k, v] = Object.entries(cs).sort((a, z) => z[1] - a[1])[0], lim = MAX * KS[q], okq = v <= lim; if (!okq) bad++;
  console.log(`  q${q}: ${v.toFixed(2)} ms (${k}) / gate ${lim.toFixed(2)} ${okq ? 'OK' : 'OVER'}`); }
console.log(bad ? `look_bench: ${bad} rung(s) OVER` : 'look_bench: all rungs within budget'); process.exit(bad && !process.env.CAIRO ? 1 : 0);
