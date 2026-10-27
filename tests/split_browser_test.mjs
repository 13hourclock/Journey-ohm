// Browser check: a quick wide two-finger spread (real touch events) on two ohms of one fused cluster splits it; a slow small one does not.
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
const cdp = await ctx.newCDPSession(pg), box = await pg.locator('#c').boundingBox();
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x: box.x + x, y: box.y + y, id: i + 1 })) });
const setup = () => pg.evaluate(() => { const S = JO.systems, F = S.fuse, os = JO.sim.ohms.filter(o => !o.dead && o.g && o.body).slice(0, 2); if (os.length < 2) return null;
  F.links.clear(); F.apart.clear(); const c = S.toW(206, 450), [a, b] = os; for (const [o, dx] of [[a, -1], [b, 1]]) { o.body.x = c.x + dx * (o.g.r + .1); o.body.y = c.y; o.body.vx = o.body.vy = 0; }
  F.fuse(a, b); const sa = S.toS(a.body.x, a.body.y), sb = S.toS(b.body.x, b.body.y); return { a: a.id, b: b.id, ax: sa.x, ay: sa.y, bx: sb.x, by: sb.y, hitA: S.ohmAt(sa.x, sa.y) === a, hitB: S.ohmAt(sb.x, sb.y) === b, s0: F.splits }; });
const state = q => pg.evaluate(q => { const F = JO.systems.fuse; return { linked: F.links.has(Math.min(q.a, q.b) + '-' + Math.max(q.a, q.b)), splits: F.splits }; }, q);
const spread = async (q, px, ms, steps) => { await touch('touchStart', [[q.ax, q.ay], [q.bx, q.by]]); for (let i = 1; i <= steps; i++) { const k = i / steps * px / 2; await touch('touchMove', [[q.ax - k, q.ay], [q.bx + k, q.by]]); await pg.waitForTimeout(ms / steps); } await touch('touchEnd', []); await pg.waitForTimeout(100); };
// slow small spread first: no split (still a drag)
let q = await setup(); console.log(JSON.stringify(q)); ok(q && q.hitA && q.hitB, 'two fused ohms under the two fingers');
await spread(q, 40, 900, 12); let s = await state(q); ok(s.splits === q.s0, 'slow small spread: no split');
q = await setup(); await spread(q, 180, 160, 6); s = await state(q); console.log(JSON.stringify(s)); ok(!s.linked && s.splits === q.s0 + 1, 'quick wide spread (180 px in ~160 ms): the cluster splits');
await pg.evaluate(() => { JO.systems.fuse.opts.spread = false; }); q = await setup(); await spread(q, 180, 160, 6); s = await state(q); ok(s.splits === q.s0, 'panel switch off: no split');
ok(errs.length === 0, 'no page errors ' + errs.join(' | ')); await b.close(); srv.close(); console.log(fails ? 'SPLIT_FAIL' : 'SPLIT_OK'); process.exit(fails ? 1 : 0);
