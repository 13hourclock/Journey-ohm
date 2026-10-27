// #9 check: the 8 tradition auras (rare, night) with soft on (top) / soft off (bottom) side by side, one PNG.  node tests/look_aura_soft_sheet.mjs <www> <out.png>
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(process.argv[2] || 'www'), out = process.argv[3] || '/tmp/aura_soft.png', TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const PORT = srv.address().port, B = await chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 } });
await pg.goto(`http://127.0.0.1:${PORT}/`); await pg.setContent('<body style="margin:0;background:#0b0d16"></body>');
const url = await pg.evaluate(async (P) => { const { createAuras, TRADITIONS } = await import(`http://127.0.0.1:${P}/js/look/aura.js`); const mk = (w, h) => new OffscreenCanvas(w, h);
  const cv = document.createElement('canvas'); cv.width = 412; cv.height = 915; const g = cv.getContext('2d'); g.fillStyle = '#121624'; g.fillRect(0, 0, 412, 915);
  [true, false].forEach((soft, row) => { const A = createAuras({ makeCanvas: mk, opts: { on: true, soft } }); TRADITIONS.forEach((t, i) => { const c = A.paintAt({ id: 1000 + i, tradition: t.id, rarity: i === 2 ? 2 : 1 }, 40, .3, 0);
    const x = (i % 4) * 103, y = row * 460 + Math.floor(i / 4) * 200 + 20, s = 100 / c.width; g.drawImage(c, x, y, c.width * s, c.height * s); g.fillStyle = '#889'; g.font = '11px sans-serif'; g.fillText(t.id + (soft ? ' soft' : ' crisp'), x + 4, y + 112); }); });
  return cv.toDataURL('image/png'); }, PORT);
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', out); await B.close(); srv.close();
