// CLAIM (ohmlook.js): in the real game page the character look claims its ohms' bodies through world ohmdraw.js's look.ohmBody / look.legs
// hooks, so the world skips the blob fill + stroke legs and look.ohm skips the destination-out erase. Gate: every claimed ohm is drawn the
// same frame (no hole) at rest and through zoom out / back / close, claims happen, no page errors. node tests/look_claim_test.mjs [www] [dumpDir]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/'); const pw = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; const root = process.argv[2] || 'www', dump = process.argv[3] || null;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(b); }); }).listen(0);
const B = await pw.chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0`); await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 });
await pg.evaluate(() => { const c = JO.world.opts.autojam; if (c) c.on = false; }); await pg.waitForTimeout(3000);
const stats = () => pg.evaluate(() => { const K = JO.render.look.api.ohmChar; return { claimed: K.stats.claimed | 0, holes: K.stats.holes | 0, unerased: K.stats.unerased | 0, erased: K.stats.erased | 0, bodies: K.stats.bodies | 0, opt: JO.world.opts.lookOhmBody !== false && JO.world.opts.lookLegs !== false }; });
const d = (a, b) => ({ holes: b.holes - a.holes, claimed: b.claimed - a.claimed, unerased: b.unerased - a.unerased, erased: b.erased - a.erased, bodies: b.bodies - a.bodies });
const GEST = {
  rest: () => { window.__g = 1; setTimeout(() => { window.__g = 0; }, 4000); },
  out: () => { const w = JO.world, t0 = performance.now(), T = 5000; window.__g = 1; const f = () => { const u = Math.min(1, (performance.now() - t0) / T), e = u * u * (3 - 2 * u); w.setZoom(-5 * e); if (u < 1) requestAnimationFrame(f); else window.__g = 0; }; f(); },
  back: () => { const w = JO.world, t0 = performance.now(), T = 4000; window.__g = 1; const f = () => { const u = Math.min(1, (performance.now() - t0) / T), e = u * u * (3 - 2 * u); w.setZoom(-5 * (1 - e)); if (u < 1) requestAnimationFrame(f); else window.__g = 0; }; f(); },
  close: () => { const w = JO.world, t0 = performance.now(), T = 3000; window.__g = 1; const f = () => { const u = Math.min(1, (performance.now() - t0) / T); w.setZoom(.9 * Math.sin(u * Math.PI)); if (u < 1) requestAnimationFrame(f); else window.__g = 0; }; f(); } };
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }; let all = 0;
for (const g of ['rest', 'out', 'back', 'close']) { const a = await stats(); await pg.evaluate(GEST[g]); await pg.waitForFunction(() => !window.__g, null, { timeout: 20000 }); await pg.waitForTimeout(300); const b = await stats(), x = d(a, b);
  console.log(g, JSON.stringify(x)); ok(x.holes === 0, `${g}: every claimed ohm drawn the same frame (claimed ${x.claimed}, drawn unerased ${x.unerased}, holes ${x.holes})`); all += x.claimed;
  if (g === 'rest') { ok(b.opt, 'world opts lookOhmBody + lookLegs on (default)'); ok(x.bodies > 0 && x.claimed > x.bodies * .5, `rest: most character bodies claimed (${x.claimed} of ${x.bodies}; erased ${x.erased})`); } }
if (dump) { fs.mkdirSync(dump, { recursive: true }); await pg.evaluate(() => JO.world.setZoom(.5)); await pg.waitForTimeout(1500);
  for (const on of [true, false]) { await pg.evaluate(v => { JO.render.look.api.ohmChar.O.claim = v; }, on); await pg.waitForTimeout(500); await pg.screenshot({ path: path.join(dump, `claim_${on ? 'on' : 'off'}.png`) }); } }
ok(all > 0, `claims happened (${all})`); ok(!errs.length, 'no page errors ' + (errs[0] || ''));
console.log(fails ? `look_claim_test: ${fails} FAILED` : 'look_claim_test: all ok'); await B.close(); srv.close(); process.exit(fails ? 1 : 0);
