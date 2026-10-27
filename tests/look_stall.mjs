// first-frame stall check (headless Chromium): the P1 bench states timed from their FIRST frame (look_bench drops 40 warm-up
// frames per state, so a bake on the state change never shows there). Prints the worst frames per state with a per-call split.
// MAX_FIRST=<ms> (default 12) fails when any frame of any state is above it at q0. QS=0,1 to pick rungs.
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
const tryReq = (from, m) => { try { return createRequire(from)(m); } catch (e) { return null; } };
const pw = tryReq(import.meta.url, 'playwright') || tryReq('/workspace/softsound/', 'playwright');
if (!pw) { console.log('look_stall: no Playwright, SKIPPED'); process.exit(0); }
const MAX = +(process.env.MAX_FIRST || 12), QS = (process.env.QS || '0').split(',').map(Number), REPS = +(process.env.REPS || 1);
const root = new URL('../', import.meta.url).pathname;
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(b); }); }).listen(0);
const PRE = !!+(process.env.PRE || 0), FR = +(process.env.FRAMES || 120);   // PRE=1: run look_bench's row bench first in the same page (as look_bench does before P1)
const B = await pw.chromium.launch({ args: ['--enable-precise-memory-info'] }); let bad = 0;
for (let rep = 0; rep < REPS; rep++) { const pg = await B.newPage(); await pg.goto(`http://127.0.0.1:${srv.address().port}/tests/`).catch(() => {}); await pg.setContent('<html><body></body></html>');
  const rows = await pg.evaluate(async ([port, qs, pre, frames]) => { const { stallP1 } = await import(`http://127.0.0.1:${port}/tests/look_stall_core.mjs`), { bench } = await import(`http://127.0.0.1:${port}/tests/look_bench_core.mjs`), { createLook } = await import(`http://127.0.0.1:${port}/www/js/look/index.js`);
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; document.body.appendChild(c); return c; };
    const a = { createLook, mkCanvas: mk, makeCanvas: (w, h) => new OffscreenCanvas(w, h), now: () => performance.now(), flush: g => g.getImageData(0, 0, 1, 1) };
    if (pre) await bench(a);
    return stallP1({ ...a, qs, frames, mem: performance.memory ? () => performance.memory.usedJSHeapSize : null }); }, [srv.address().port, QS, PRE, FR]);
  for (const { q, res } of rows) for (const [m, fr] of Object.entries(res)) { const s = fr.slice().sort((a, z) => z.ms - a.ms), w = s[0], f0 = fr[0];
    const fmt = x => `f${x.f} ${x.ms.toFixed(1)} (frame ${x.frame.toFixed(1)} field ${x.field.toFixed(1)} over ${x.over.toFixed(1)} ohm ${x.ohm.toFixed(1)} post ${x.post.toFixed(1)}; idle ${x.idle.toFixed(1)}; heap ${(x.heap / 1048576).toFixed(1)} MB)`;
    const over = q === 0 && w.ms > MAX; if (over) bad++;
    console.log(`q${q} ${m.padEnd(10)} first ${fmt(f0)} | worst ${fmt(w)} | 2nd ${s[1].ms.toFixed(1)} 3rd ${s[2].ms.toFixed(1)}${over ? '  OVER ' + MAX : ''}`); }
  await pg.close(); }
await B.close(); srv.close();
console.log(bad ? `look_stall: ${bad} state(s) over ${MAX} ms at q0` : `look_stall: every q0 frame (first frames included) <= ${MAX} ms`); process.exit(bad ? 1 : 0);
