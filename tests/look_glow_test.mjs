// glowEventsOnly: the crack / emissive glow envelope (look.readout().glow -> ground ctx.glow, gl uGlow) is 0 at rest (the world's burst bangs
// on key / om changes and song start / end do not light it), and rises on a big moment (W.moment / st.big) or the place swell. node tests/look_glow_test.mjs [www]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/'); const pw = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; const root = process.argv[2] || 'www';
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(b); }); }).listen(0);
const B = await pw.chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 } }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForTimeout(400);
await pg.evaluate(() => { const c = JO.world.opts.autojam; if (c) c.on = false; window.__g = { mx: 0, bmx: 0, gd: 0, n: 0 };
  const G = JO.render.look.api.ground, d0 = G.draw; G.draw = (c, L, p, st, ctx) => { window.__g.gd = Math.max(window.__g.gd, ctx.glow || 0); return d0(c, L, p, st, ctx); };
  const tick = () => { const s = JO.render.look.readout(), b = JO.render.st.burst || 0; window.__g.mx = Math.max(window.__g.mx, s.glow); window.__g.bmx = Math.max(window.__g.bmx, b); window.__g.n++; requestAnimationFrame(tick); }; tick(); });
await pg.waitForTimeout(10000);
const rest = await pg.evaluate(() => ({ ...window.__g }));
await pg.evaluate(() => { window.__g.mx = 0; window.__g.gd = 0; JO.world.moment(.8, 'climax'); }); await pg.waitForTimeout(600);
const hit = await pg.evaluate(() => ({ ...window.__g }));
await pg.evaluate(() => { const g = JO.render.look.api.gl; if (g && g.O) g.O.glowEventsOnly = false; window.__g.mx = 0; window.__g.bmx = 0; }); await pg.waitForTimeout(8000);
const old = await pg.evaluate(() => ({ ...window.__g }));
console.log(JSON.stringify({ rest, hit, old }));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
ok(rest.n > 100, `frames ran (${rest.n})`);
ok(rest.mx < .02 && rest.gd < .02, `at rest the glow stays dark: max ${rest.mx.toFixed(3)} (ground ctx ${rest.gd.toFixed(3)}) while world bursts (key / om / song bangs) reached ${rest.bmx.toFixed(3)}`);
ok(hit.mx > .4 && hit.gd > .4, `a big moment (W.moment .8 climax) lights it: ${hit.mx.toFixed(2)} (ground ctx ${hit.gd.toFixed(2)})`);
ok(old.bmx < .02 || old.mx > .02, `glowEventsOnly false = the old reading (max ${old.mx.toFixed(3)} at bursts ${old.bmx.toFixed(3)})`);
ok(!errs.length, 'no page errors ' + (errs[0] || ''));
console.log(fails ? `look_glow_test: ${fails} FAILED` : 'look_glow_test: all ok'); await B.close(); srv.close(); process.exit(fails ? 1 : 0);
