// look.node (look/index.js, nodeGlow): the far-zoom ohm speck as a soft pitch-coloured glow dot. Real app, headless Chromium 412x915, no audio.
// render.js specks() is world-side: this test calls look.node the way GAMEDEV_SPEC H5 proposes (same x, y, sz, ohm), on the look's own canvas,
// checks it draws, stays muted at rest and fuller with music x trippy, and times 400 calls (SPECK[0]).
// node tests/look_node_test.mjs [www] [png dir]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
let pw = null; try { pw = require('playwright'); } catch (e) { console.log('look_node_test: no Playwright, SKIPPED'); process.exit(0); }
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.argv[2] || new URL('../www/', import.meta.url).pathname, dump = process.argv[3] || null, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
if (dump) fs.mkdirSync(dump, { recursive: true });
const B = await pw.chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0`);
await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm && JO.render && JO.render.look, null, { timeout: 20000 });
await pg.waitForTimeout(1500);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const r = await pg.evaluate(() => { const L = JO.render.look; if (!L.node) return { none: true };
  const mk = () => { const c = document.createElement('canvas'); c.width = 412; c.height = 915; const g = c.getContext('2d'); g.fillStyle = '#0b0d12'; g.fillRect(0, 0, 412, 915); return [c, g]; };
  const ohms = []; for (let i = 0; i < 400; i++) ohms.push({ hue: (i * 37) % 360, glow: i % 9 === 0 ? 1 : 0, x: 30 + (i % 20) * 18, y: 120 + Math.floor(i / 20) * 34 });
  const sat = g => { const d = g.getImageData(0, 0, 412, 915).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); if (mx > 40) { s += mx - mn; n++; } } return { s: n ? s / n : 0, n }; };
  const run = (g, sq) => { let all = true; for (const q of ohms) { if (sq) { g.fillStyle = `hsl(${q.hue},70%,62%)`; g.fillRect(q.x - 2, q.y - 2, 4, 4); } else all = L.node(g, q.x, q.y, 4, q, {}) === true && all; } return all; };
  const [cs, gs] = mk(); run(gs, true); const [c0, g0] = mk(), all = run(g0, false), rest = sat(g0);
  const P = L.api && L.api.place; const old = P ? P.music : 0; const F0 = L.F && L.F.st; if (P) P.music = 1; if (L.F) L.F.st = { ...(F0 || {}), trippy: 1 }; const [c1, g1] = mk(); run(g1, false); const mus = sat(g1); if (P) P.music = old; if (L.F) L.F.st = F0;
  let t0 = performance.now(); for (let k = 0; k < 20; k++) run(g0, false); const ms = (performance.now() - t0) / 20; t0 = performance.now(); for (let k = 0; k < 20; k++) run(gs, true); const msq = (performance.now() - t0) / 20;
  return { all, rest, mus, ms, msq, hasP: !!P, sq: cs.toDataURL(), a: c0.toDataURL(), b: c1.toDataURL() }; });
if (r.none) ok(false, 'look.node exists (nodeGlow on)'); else {
  ok(r.all, 'look.node returns true for every speck (render keeps the square only as fallback)');
  ok(r.rest.n > 400 * 8, `glow dots cover more than a 2x2 square each (${r.rest.n} lit px)`);
  ok(r.ms < 2.5, `400 calls ${r.ms.toFixed(3)} ms, one drawImage each (squares ${r.msq.toFixed(3)} ms; headless software canvas)`);
  ok(r.mus.s > r.rest.s + 5, `muted at rest, colour with music x trippy (chroma ${r.rest.s.toFixed(1)} -> ${r.mus.s.toFixed(1)})`);
  if (dump) for (const k of ['sq', 'a', 'b']) fs.writeFileSync(path.join(dump, `node_${k}.png`), Buffer.from(r[k].split(',')[1], 'base64')); }
ok(errs.length === 0, `no page errors (${errs.length}) ${errs.slice(0, 2).join(' | ')}`);
await B.close(); srv.close(); console.log(fail ? `look_node_test: ${fail} FAIL` : 'look_node_test: all ok'); process.exit(fail ? 1 : 0);
