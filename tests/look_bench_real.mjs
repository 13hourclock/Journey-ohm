// REAL look bench (Visuals, plan §16.7): headless Chromium (Skia) = the gate for the 2D hooks; a rough SwiftShader WebGL frame time for
// the GL materials is printed by tests/look_gl_test.mjs (software GL, not a phone number). Gate: q0 <= MAX_LOOK (3 ms) mean, lower rungs * [1,.8,.6,.3].
// REAL_GATE=0 to report only.
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
import { tableReal } from './look_bench_real_core.mjs';
const MAX = +(process.env.MAX_LOOK || 3), GATE = process.env.REAL_GATE !== '0';
const tryReq = (from, m) => { try { return createRequire(from)(m); } catch (e) { return null; } };
const pw = tryReq(import.meta.url, 'playwright') || tryReq('/workspace/softsound/', 'playwright');
if (!pw) { console.log('look_bench_real: no Playwright, SKIPPED'); process.exit(0); }
const root = new URL('../', import.meta.url).pathname;
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': 'text/javascript' }); r.end(b); }); }).listen(0);
const b = await pw.chromium.launch(), pg = await b.newPage(); await pg.goto(`http://127.0.0.1:${srv.address().port}/tests/`).catch(() => {}); await pg.setContent('<html><body></body></html>');
const ONLY = process.env.REAL_ONLY ? JSON.parse(process.env.REAL_ONLY) : {};   // e.g. REAL_ONLY='{"qs":[0],"kases":["back"]}' (quick look, not the gate)
const rows = await pg.evaluate(async ([port, O]) => { const u = `http://127.0.0.1:${port}`, { benchReal } = await import(`${u}/tests/look_bench_real_core.mjs`), { createLook } = await import(`${u}/www/js/look/index.js`), { bindWorld } = await import(`${u}/www/js/soft.js`); bindWorld({ opts: {} }); const _u = 0;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; document.body.appendChild(c); return c; };
  return benchReal({ createLook, mkCanvas: mk, makeCanvas: (w, h) => new OffscreenCanvas(w, h), now: () => performance.now(), flush: g => g.getImageData(0, 0, 1, 1), ...O }); }, [srv.address().port, ONLY]);
await b.close(); srv.close();
console.log('REAL look, headless Chromium (Skia; 1 px readback per frame), whole look per frame: frame + 50 ohms + star + 2 planets + ground (bakes in idle between frames), ms:');
console.log(tableReal(rows));
const KS = [1, .8, .6, .3]; let bad = 0; for (const r of rows) { const [k, v] = ['calm', 'trip', 'season', 'back', 'rare', 'char'].filter(k => r[k]).map(k => [k, r[k].mean]).sort((a, z) => z[1] - a[1])[0], lim = MAX * KS[r.q]; if (v > lim) bad++; const im = Math.max(0, ...['calm', 'trip', 'season'].filter(k => r[k]).map(k => r[k].idleMs)); console.log(`  q${r.q}: worst ${v.toFixed(2)} ms (${k}) / gate ${lim.toFixed(2)} ${v <= lim ? 'OK' : 'OVER'}   (bakes run in idle time, outside the frame: up to ${im.toFixed(2)} ms/frame of idle)`); }
for (const r of rows) if (r.rare && r.calm) console.log(`  q${r.q}: 10 rare ohms (rare look) cost ${(r.rare.mean - r.calm.mean).toFixed(3)} ms over calm (median ${(r.rare.med - r.calm.med).toFixed(3)})${r.rare.rareStats ? '; per frame ' + ['bodies', 'rings', 'sparks', 'stale', 'miss', 'sync', 'baked'].map(k => `${k} ${((r.rare.rareStats[k] | 0) / (r.rare.rareStats.frames || 1)).toFixed(2)}`).join(' ') : ''}`);
for (const r of rows) if (r.char && r.calm) { const c = r.char.charStats || {}, f = 180 + 60; console.log(`  q${r.q}: 50 character ohms (ohmlook A+B+C) cost ${(r.char.mean - r.calm.mean).toFixed(3)} ms over calm (median ${(r.char.med - r.calm.med).toFixed(3)}); totals bodies ${c.bodies | 0} faces ${c.faces | 0} shadows ${c.shadows | 0} stale ${c.stale | 0} miss ${c.miss | 0} claimed ${c.claimed | 0} unerased ${c.unerased | 0} erased ${c.erased | 0}`); }
console.log(bad ? `look_bench_real: ${bad} rung(s) OVER` : 'look_bench_real: all rungs within budget'); process.exit(bad && GATE ? 1 : 0);
