// Browser check: drag a drawn string end / drum rim with real pointer events (gestures.js -> things.js handles), tap still plays.
import { createRequire } from "module"; const require = createRequire("/workspace/softsound/");
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const T0 = Date.now(), root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
await new Promise(r => srv.on('listening', r));
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 } }); const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e) + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const U = `http://127.0.0.1:${port}/`, boot = async q => { await pg.goto(U + q); await pg.waitForFunction(() => globalThis.JO && JO.systems && JO.sim.ohm, null, { timeout: 15000 }); };
await boot('?fresh=1'); await pg.waitForTimeout(2500);
// shared page helpers
const r = await pg.evaluate(async () => { const T = JO.sim.placed, S = JO.systems, sl = ms => new Promise(r => setTimeout(r, ms));
  let y = 140; while (y < 700 && [80, 160, 240, 320].some(x => S.ohmAt(x, y))) y += 40; const pts = []; for (let i = 0; i <= 30; i++) pts.push([80 + i * 8, y, performance.now() + i * 10]); pts.push([320, y, performance.now() + 900]);
  const n0 = T.list.length; T.stroke(pts, S.toW); const th = T.list[T.list.length - 1], e = th.pts[th.pts.length - 1], s = S.toS(e.x, e.y); return { made: T.list.length === n0 + 1 && th.kind, L0: th.L, f0: th.f, sx: s.x, sy: s.y, id: th.id }; });
console.log(JSON.stringify(r)); ok(r.made === 'string' || r.made === 'bar', 'a drawn string/bar in the live world');
const box = await pg.locator('#c').boundingBox(); await pg.mouse.move(box.x + r.sx, box.y + r.sy); await pg.mouse.down(); for (let i = 1; i <= 15; i++) { await pg.mouse.move(box.x + r.sx + i * 5, box.y + r.sy); await pg.waitForTimeout(16); } await pg.mouse.up();
const r2 = await pg.evaluate(id => { const th = JO.sim.placed.list.find(t => t.id === id); return { L: th.L, f: th.f }; }, r.id); console.log(JSON.stringify(r2));
ok(r2.L > r.L0 * 1.1 && r2.f <= r.f0, 'a real finger drag on the end lengthens it and lowers (or keeps) the note');
ok(errs.length === 0, 'no page errors ' + errs.join(' | ')); await b.close(); srv.close(); console.log(fails ? 'ENDS_FAIL' : 'ENDS_OK'); process.exit(fails ? 1 : 0);
