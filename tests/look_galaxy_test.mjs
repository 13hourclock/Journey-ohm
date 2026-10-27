// #10 look.galaxy checks + a still: false before the bake (and the bake is queued), true after; never half-baked (the image only
// exists once complete); draw cost of one galaxy; a 412x915 still of 3 seeds / tilts over a night sky.  node tests/look_galaxy_test.mjs [www] [out.png]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(process.argv[2] || 'www'), out = process.argv[3] || '/tmp/look_galaxy.png', TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const PORT = srv.address().port, B = await chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 } }); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`http://127.0.0.1:${PORT}/`); await pg.waitForTimeout(2500);
const app = await pg.evaluate(() => { const L = window.JO && window.JO.render && window.JO.render.look; return { hook: !!(L && L.galaxy), api: !!(L && L.api && L.api.galaxy) }; });
ok(app.hook && app.api, 'app: look.galaxy + look.api.galaxy present (ON by default)');
await pg.setContent('<body style="margin:0;background:#000"></body>');
const R = await pg.evaluate(async (P) => { const { createGalaxy } = await import(`http://127.0.0.1:${P}/js/look/galaxy.js`); const GX = createGalaxy({}), r = {};
  const cv = document.createElement('canvas'); cv.width = 412; cv.height = 915; document.body.appendChild(cv); const g = cv.getContext('2d');
  r.before = GX.draw(g, 200, 200, 150, .5, 7); r.queued = GX.jobs.length === 1; GX.pump(2); r.partial = !GX.sets.has(7) && GX.draw(g, 200, 200, 150, .5, 7) === false;
  const t0 = performance.now(); while (GX.jobs.length) GX.pump(4); r.bakeMs = performance.now() - t0; r.after = GX.draw(g, 200, 200, 150, .5, 7);
  [11, 42].forEach(s => GX.bakeNow(s));
  const sky = g.createLinearGradient(0, 0, 0, 915); sky.addColorStop(0, '#04050a'); sky.addColorStop(1, '#0b0d16'); g.fillStyle = sky; g.fillRect(0, 0, 412, 915);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(230,232,240,${.2 + .5 * Math.random()})`; g.fillRect(Math.random() * 412, Math.random() * 915, 1, 1); }
  GX.draw(g, 206, 170, 150, .35, 7, { rot: .4 }); GX.draw(g, 206, 470, 140, 1.05, 11, { rot: -.3 }); GX.draw(g, 206, 760, 120, .0, 42, { music: .8 });
  const c2 = document.createElement('canvas'); c2.width = 412; c2.height = 915; const g2 = c2.getContext('2d'); const t1 = performance.now(); for (let i = 0; i < 200; i++) GX.draw(g2, 206, 470, 140, 1.05, 11); r.drawMs = (performance.now() - t1) / 200;
  g.clearRect(0, 0, 1, 1); r.url = cv.toDataURL('image/png'); return r; }, PORT);
ok(R.before === false && R.queued, 'false before the bake, bake queued');
ok(R.partial, 'no half-baked image while the rows run');
ok(R.after === true, `true once baked (bake ${R.bakeMs.toFixed(0)} ms in idle slices)`);
ok(R.drawMs < .5, `draw ${R.drawMs.toFixed(3)} ms / galaxy (one image)`);
fs.writeFileSync(out, Buffer.from(R.url.split(',')[1], 'base64')); console.log('  still', out);
ok(!errs.length, 'no page errors ' + errs.join(' | '));
await B.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'all ok'); process.exit(fail ? 1 : 0);
