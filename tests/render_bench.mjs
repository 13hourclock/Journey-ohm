// light render-timing check (box, headless Chromium, software raster = pessimistic). Measures draw ms per frame (mean, p95)
// at home zoom and, if the world layer exists, while zooming through layers. ROOT=<www dir> to bench another checkout.
// MAX_DRAW=<ms> fails if the home-zoom draw mean is above it (compare against master's number).
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.env.ROOT || new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2 });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/?autostart&trippy=1`); await pg.waitForTimeout(1500);
await pg.evaluate(() => { localStorage.setItem('jo.devOpen', '0'); const d = document.getElementById('dev'); if (d) d.style.display = 'none'; JO.events.set(null, 'opt.heart.on', true); });
const measure = async (label, setup, arg) => { await pg.evaluate(setup || (() => 0), arg); await pg.waitForTimeout(400); await pg.evaluate(() => { JO.frames.dr.length = 0; JO.frames.iv.length = 0; });
  // keep the ohm playing while measuring (sound -> visuals path active)
  for (let i = 0; i < 6; i++) { await pg.evaluate(() => JO.events.note({ src: JO.sim.ohm, kind: 'strike', deg: null, oct: 2, vel: .8, pos: .3, dur: 1 })); await pg.waitForTimeout(330); }
  const r = await pg.evaluate(() => { const d = JO.frames.dr.slice().sort((a, b) => a - b), iv = JO.frames.iv.slice().sort((a, b) => a - b); return { draw: d.reduce((a, b) => a + b, 0) / d.length, p95: d[Math.floor(d.length * .95)], frameP95: iv[Math.floor(iv.length * .95)], q: JO.render && JO.render.q }; });
  console.log(`${label.padEnd(26)} draw mean ${r.draw.toFixed(2)} ms  p95 ${r.p95.toFixed(2)} ms  frame p95 ${r.frameP95.toFixed(1)} ms${r.q != null ? '  quality ' + r.q : ''}`); return r; };
const home = await measure('home');
const hasWorld = await pg.evaluate(() => !!JO.world);
if (hasWorld) for (const z of [.5, 1.5, -1.3, 3.4]) await measure(`zoom ${z}`, z0 => { JO.world.setZoom(z0); JO.world.cam.lockZ = true; }, z);
console.log(errs.length ? 'FAIL page errors: ' + errs.join(' | ') : 'ok   no page errors');
const max = +process.env.MAX_DRAW; if (max && home.draw > max) { console.log(`FAIL home draw ${home.draw.toFixed(2)} > ${max}`); process.exitCode = 1; }
if (errs.length) process.exitCode = 1;
await b.close(); srv.close();
