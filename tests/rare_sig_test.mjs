// REGRESSION (v0.0.29, rare.js:68 "o.rareSig of undefined" under load): a hidden-spot ohm the way env.js makes it (spawn, then
// o.wild = true, then 'world.life') must end up rare WITH its signature, and so must a restored save of a wild ohm. Before the fix,
// traditions.js's fallback getter (o.rarity = o.wild ? 1 : 0) made markRare return early, so rareSig was never written.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
import http from 'http'; import fs from 'fs'; import path from 'path';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const { chromium } = require('playwright');
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
await new Promise(r => srv.once('listening', r)); const port = srv.address().port;
const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const pg = await br.newPage({ viewport: { width: 412, height: 915 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(`http://127.0.0.1:${port}/?fresh=1&autostart=1`); await pg.waitForTimeout(2500);
let r = await pg.evaluate(async () => { const S = JO.sim, f = S.ohm, out = [];
  for (let i = 0; i < 6; i++) { const o = S.spawn(f.body.x + 2 + i * .6, f.body.y - 1, 5150001 + i * 7919); if (o) o.wild = true; JO.events.post({ type: 'world.life', u: 0, src: o }); out.push(o); }
  await new Promise(q => setTimeout(q, 1500));
  return { n: out.length, rare: out.filter(o => o.rarity === 1).length, sig: out.filter(o => o.rareSig && o.rareSig.seed != null).length, kind: out.map(o => o.rareKind).join(','), isR: out.filter(o => JO.rare.isRare(o)).length }; });
ok(r.rare === r.n && r.sig === r.n && r.isR === r.n, `env.js order (spawn, o.wild = true, world.life): ${r.sig}/${r.n} rare ohms have rareSig (kinds ${r.kind})`);
r = await pg.evaluate(async () => { const S = JO.sim, f = S.ohm, seed = 6160001; JO.rare.load({ v: 1, ohms: [[seed, 3, 'wild']], open: [] });
  const o = S.spawn(f.body.x - 2, f.body.y - 1, seed); if (o) o.wild = true; await new Promise(q => setTimeout(q, 800)); return { r: o.rarity, sig: !!o.rareSig, kind: o.rareKind }; });
ok(r.r === 1 && r.sig && r.kind === 'wild', `restored save of a wild ohm: rare with rareSig (${JSON.stringify(r)})`);
r = await pg.evaluate(async () => { const S = JO.sim, f = S.ohm, o = S.spawn(f.body.x + 1, f.body.y - 1, 7170001); o.wild = true;   // wild flag but no world.life yet: draw/tick must not crash
  await new Promise(q => setTimeout(q, 800)); return { r: o.rarity, sig: !!o.rareSig, isR: JO.rare.isRare(o) }; });
ok(!r.isR, `o.wild with no world.life: not treated as rare by rare.js until marked (getter rarity ${r.r}, rareSig ${r.sig}), no crash`);
ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
await br.close(); srv.close(); console.log(fails ? `RARE_SIG FAIL ${fails}` : 'RARE_SIG OK'); process.exit(fails ? 1 : 0);
