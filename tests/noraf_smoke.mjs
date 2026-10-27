// v0.0.3: with drawing stopped (rAF never fires), the control clock, heartbeat and matrix keep running off the audio clock.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const pg = await b.newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(() => { window.requestAnimationFrame = () => 0; });
await pg.goto(`http://127.0.0.1:${srv.address().port}/?autostart`); await pg.waitForTimeout(1200);
await pg.evaluate(() => JO.events.set(null, 'opt.heart.on', true));
const n0 = await pg.evaluate(() => JO.events.n.note || 0); await pg.waitForTimeout(3000);
const r = await pg.evaluate(n0 => ({ notes: (JO.events.n.note || 0) - n0, hz: JO.ctl.hz, src: JO.ctl.src, live: JO.events.n.live, bpm: JO.music.bpm }), n0);
console.log(JSON.stringify(r), errs.join(' | '));
console.log(r.notes >= 4 && r.hz > 20 && r.src === 'audio' && !errs.length ? 'NORAF_OK' : 'NORAF_FAIL'); await b.close(); srv.close();
