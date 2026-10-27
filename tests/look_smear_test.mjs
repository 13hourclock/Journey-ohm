// 4b column smears: the crack veins / their glow must not run as vertical streaks down the ground tiles.
// Measures, over every baked ground tile's glow canvas, the mean |dA/dy| / |dA/dx| (a vertical streak has ~0 change down a column).
// usage: node tests/look_smear_test.mjs [www]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/'); const pw = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; const root = process.argv[2] || 'www';
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(b); }); }).listen(0);
const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const B = await pw.chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = [];
pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(SEED(20261025)); await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForTimeout(400);
await pg.evaluate(() => { const c = JO.world.opts.autojam; if (c) c.on = false; const E = JO.world.env, t0 = E.tick; E.tick = (dt, t) => { t0(dt, t); E.day = .55; }; E.day = .55; });
await pg.waitForTimeout(7000);
const R = await pg.evaluate(() => { const G = JO.render.look.api.ground; let sx = 0, sy = 0, n = 0, tiles = 0, ms = 0, bakes = 0;
  for (const J of G.tiles.values()) { if (!J || !J.done || J.tint) continue; tiles++; ms += J.ms || 0; bakes++; if (!J.gc) continue;
    const w = J.gc.width, h = J.gc.height, a = J.gc.getContext('2d').getImageData(0, 0, w, h).data;
    for (let y = 0; y + 1 < h; y++) for (let x = 0; x + 1 < w; x++) { const i = (y * w + x) * 4 + 3, v = a[i]; if (v < 8 && a[i + 4] < 8 && a[i + w * 4] < 8) continue; sx += Math.abs(a[i + 4] - v); sy += Math.abs(a[i + w * 4] - v); n++; } }
  return { tiles, glowPx: n, ratio: sx ? sy / sx : 1, bakeMs: bakes ? ms / bakes : 0 }; });
console.log(JSON.stringify(R));
const fails = []; if (!R.tiles) fails.push('no ground tiles baked'); if (R.glowPx && R.ratio < .45) fails.push('glow veins run down the columns: dy/dx ' + R.ratio.toFixed(2)); if (errs.length) fails.push('page errors: ' + errs[0]);
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'all ok'); await B.close(); srv.close(); process.exit(fails.length ? 1 : 0);
