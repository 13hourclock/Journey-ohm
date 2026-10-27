// DUST SPLIT (opts.dustSplit, parent 2:37 AM seed-42 sky cracks): in the real game page (seed 42, 412x915) the dust layer lays only
// grain over the sky and its cracks (soft, 3 low-alpha passes, no light offset stroke) only below the land line (FRONT: the floor).
// Gates: the grain tile has no dark crack pixels; the crack tile is soft (peak alpha under the old .55 stroke, wide low-alpha falloff); cracks drawn this frame start at
// or below look.sky's land line; the sky band (y 40..landY-40) has fewer thin dark lines than with dustSplit off; no page errors.
// node tests/look_dust_test.mjs [www] [outDir]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/'); const pw = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; const root = process.argv[2] || 'www', dump = process.argv[3] || null;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); r.end(b); }); }).listen(0);
const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const B = await pw.chromium.launch(); let ok = true; const chk = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) ok = false; };
const run = async split => { const pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.addInitScript(SEED(42)); await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 });
  await pg.evaluate(v => { JO.render.look.opts.dustSplit = v; }, split); await pg.waitForTimeout(3500);
  const png = await pg.screenshot(); if (dump) { fs.mkdirSync(dump, { recursive: true }); fs.writeFileSync(path.join(dump, `dust_${split ? 'on' : 'off'}.png`), png); }
  const r = await pg.evaluate(async b64 => { const F = JO.render.look.F, img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const y1 = Math.max(60, (F.landY | 0) - 40), d = x.getImageData(0, 40, img.width, y1 - 40).data, w = img.width, h = y1 - 40; let thin = 0;
    const L = (i) => .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2];   // a thin dark line: darker than both neighbours 3 px away (either axis) by > 5
    for (let y = 3; y < h - 3; y += 1) for (let X = 3; X < w - 3; X += 1) { const i = (y * w + X) * 4, v = L(i); if ((L(i - 12) - v > 5 && L(i + 12) - v > 5) || (L(i - 12 * w) - v > 5 && L(i + 12 * w) - v > 5)) thin++; }
    return { thin, landY: F.landY, crackY: F.crackY, crackN: F.crackN, n: F.n, place: JO.render.look.stats().place }; }, png.toString('base64'));
  const tiles = split ? await pg.evaluate(async () => { const { paintDust } = await import('/js/look/place.js'); const t = p => { const c = new OffscreenCanvas(192, 192), x = c.getContext('2d'); paintDust(x, 192, 42, p); return x.getImageData(0, 0, 192, 192).data; };
    const g = t('grain'), k = t('crack'); let gDark = 0, kMax = 0, kOn = 0; for (let i = 0; i < g.length; i += 4) { if (g[i + 3] > 40 && g[i] < 50) gDark++; kMax = Math.max(kMax, k[i + 3]); if (k[i + 3] > 8) kOn++; } return { gDark, kMax, kOn }; }) : null;
  await pg.close(); return { ...r, tiles, errs }; };
const on = await run(true), off = await run(false);
console.log(JSON.stringify({ on: { ...on, place: undefined }, off: { thin: off.thin, landY: off.landY } }));
chk(on.place && on.place.dust > .05, `dust is showing at seed 42 (${on.place && on.place.dust.toFixed(2)})`);
chk(on.tiles.gDark === 0, `grain tile has no crack pixels (${on.tiles.gDark})`);
chk(on.tiles.kOn > 300 && on.tiles.kMax <= 130, `crack tile is soft (old hard stroke: 140 + a light offset line): ${on.tiles.kOn} px, max alpha ${on.tiles.kMax}/255`);
chk(on.crackN >= on.n - 2 && on.crackY >= on.landY - .5, `cracks drawn this frame below the land line (crackY ${on.crackY && on.crackY.toFixed(0)} >= landY ${on.landY && on.landY.toFixed(0)})`);
chk(off.crackN === undefined || off.crackN < off.n - 5, 'dustSplit false: the old full tile (no split crack pass)');
chk(on.thin < off.thin * .8, `sky thin dark lines: ${on.thin} with dustSplit vs ${off.thin} without`);
chk(!on.errs.length && !off.errs.length, `no page errors ${[...on.errs, ...off.errs].slice(0, 2).join(' | ')}`);
await B.close(); srv.close(); console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
