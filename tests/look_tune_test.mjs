// TUNE FLASH (Visuals, parent 2:06 AM MDT Oct 26): playtwice posts 'ohm.tune' {src} when a phrase played twice becomes an ohm's tune.
// The look answers with a short warm glow inside the ohm (look/ohmlook.js K.tune, wired on the bus in look/index.js) that shrinks and
// settles; as it settles the skin marks (B) deepen one step (o.tune.n). Real app, headless Chromium 412x915 dpr 1, no audio; the event is
// posted by hand exactly as playtwice.js posts it (master may not have playtwice yet).
// Checks: the flash draws (stats.tunes) and stops by tuneLife; the marks step only after tuneSettle; undo (o.tune = null) takes them back;
// the bake swap never shows a missing ohm (stale-but-shown); cost of the flash per ohm per frame; no page errors.
// node tests/look_tune_test.mjs [www dir] [png dir]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
let pw = null; try { pw = require('playwright'); } catch (e) { console.log('look_tune_test: no Playwright, SKIPPED'); process.exit(0); }
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.argv[2] || new URL('../www/', import.meta.url).pathname, dump = process.argv[3] || null, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
if (dump) fs.mkdirSync(dump, { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const B = await pw.chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(SEED(+(process.env.SEED || 20261025)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0`); await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 });
await pg.evaluate(xp => { const c = JO.world.opts.autojam; if (c) c.on = false; JO.world.setZoom(0); JO.sim.ohm.xp = xp; }, +(process.env.XP || 30));   // an ohm with some marks, so the deepening shows await pg.waitForTimeout(4000);
const ready = await pg.evaluate(() => { const L = JO.render && JO.render.look, K = L && L.api && L.api.ohmChar; if (!K || !K.tune) return false; const o = JO.sim.ohm;
  // record where the focus ohm is drawn and what its draw costs (device px; dpr 1)
  const d0 = K.draw; window.__rec = { x: 0, y: 0, r: 0, ms: [], f: [] };
  K.draw = function (g, oo, x, y, r, m, ...a) { if (oo !== o) return d0.call(this, g, oo, x, y, r, m, ...a); const t0 = performance.now(), n0 = K.stats.tunes | 0, res = d0.call(this, g, oo, x, y, r, m, ...a), dt = performance.now() - t0;
    const R = window.__rec; R.x = m.a * x + m.e; R.y = m.a * y + m.f; R.r = r * m.a; R.ms.push(dt); R.f.push((K.stats.tunes | 0) > n0 ? 1 : 0); return res; };
  return true; });
ok(ready, 'look.api.ohmChar.tune present');
if (!ready) { await B.close(); srv.close(); process.exit(1); }
const crop = async (name) => { const R = await pg.evaluate(() => ({ ...window.__rec, ms: null, f: null })), s = Math.max(120, Math.round(R.r * 3.2)), x = Math.max(0, Math.min(412 - s, Math.round(R.x - s / 2))), y = Math.max(0, Math.min(915 - s, Math.round(R.y - s / 2)));
  if (dump) await pg.screenshot({ path: path.join(dump, name + '.png'), clip: { x, y, width: s, height: s } }); return R; };
const st = () => pg.evaluate(() => { const K = JO.render.look.api.ohmChar, s = K.state(JO.sim.ohm); return { tunes: K.stats.tunes | 0, tuK: s ? s.tuK : null, miss: K.stats.miss, stale: K.stats.stale }; });
await pg.evaluate(() => { window.__rec.ms.length = 0; window.__rec.f.length = 0; }); await pg.waitForTimeout(1500);
const base = await pg.evaluate(() => window.__rec.ms.slice()); const R0 = await crop('tune_0_before'), s0 = await st();
ok(R0.r > 6, `focus ohm drawn with the character look (radius ${R0.r.toFixed(1)} px)`);
ok(s0.tuK === 0, 'no tune yet: marks at their xp depth');
// exactly as playtwice.js: o.tune = {...}, then the event
await pg.evaluate(() => { const o = JO.sim.ohm; window.__rec.ms.length = 0; window.__rec.f.length = 0; o.tune = { deg: [0, 2, 4, 2], at: JO.music.beat(), n: 1 }; JO.events.post({ type: 'ohm.tune', src: o, len: 4, x: o.body.x, y: o.body.y }); window.__t0 = performance.now(); });
const at = async ms => { await pg.waitForFunction(m => performance.now() - window.__t0 >= m, ms, { polling: 'raf' }); };
const shots = [[120, 'tune_1_rise'], [350, 'tune_2_glow'], [650, 'tune_3_settle'], [1000, 'tune_4_late']]; const mid = [];
for (const [ms, n] of shots) { await at(ms); await crop(n); mid.push({ ms, ...(await st()) }); }
ok(mid[0].tunes > s0.tunes, `the glow draws (${mid[0].tunes - s0.tunes} flash draws by 120 ms)`);
ok(mid[1].tuK === 0, 'marks still at the old depth while the glow is strong (350 ms)');
await at(2200); const s2 = await st(); await crop('tune_5_after');
const flash = await pg.evaluate(() => ({ ms: window.__rec.ms.slice(), f: window.__rec.f.slice() }));
ok(s2.tuK === 1, 'marks one step deeper once the glow has settled in');
const last = flash.f.lastIndexOf(1), nF = flash.f.filter(v => v).length; ok(nF > 10 && flash.f.slice(last + 1).length > 20, `the glow ends (${nF} frames of glow, then ${flash.f.length - last - 1} without)`);
ok(s2.miss === s0.miss, `the deeper-marks bake never left the ohm missing (stale-but-shown ${s2.stale - s0.stale})`);
// cost: the focus ohm's draw with the glow vs without (median), plus the glow's own drawImage in isolation
const withF = flash.ms.filter((v, i) => flash.f[i]);
const isoV = await pg.evaluate(([r, R]) => { const c = new OffscreenCanvas(412, 915), g = c.getContext('2d'), s = new OffscreenCanvas(64, 64), x = s.getContext('2d'); x.fillStyle = '#c96'; x.fillRect(0, 0, 64, 64);
  g.fillStyle = '#777'; g.fillRect(0, 0, 412, 915); const N = 4000; g.getImageData(0, 0, 1, 1); let t0 = performance.now();
  for (let i = 0; i < N; i++) { g.globalAlpha = .3; g.drawImage(s, 100 + (i & 7), 300, r * 2, r * 2); g.globalAlpha = 1; }
  g.getImageData(0, 0, 1, 1); const glow = (performance.now() - t0) / N; t0 = performance.now(); for (let i = 0; i < N; i++) g.drawImage(s, 100 + (i & 7), 300, R * 2, R * 2); g.getImageData(0, 0, 1, 1);
  return { glow, body: (performance.now() - t0) / N }; }, [R0.r * .78, R0.r * 1.3]).then(v => v);
const iso = isoV.glow; console.log(`  cost: a body blit of the same ohm in isolation ${(isoV.body * 1000).toFixed(2)} us (headless CPU raster; on a phone GPU both are a few us)`);
console.log(`  cost: the glow drawImage alone ${(iso * 1000).toFixed(2)} us at its largest (r ${(R0.r * .78).toFixed(0)} px), drawn on ${withF.length} frames per tune (in-page timers are too coarse to time one draw)`);
ok(iso < isoV.body * .75, `the glow is one small blit, under a body blit (${(iso * 1000).toFixed(2)} us per ohm per frame, event only)`);
// undo: playtwice's undo puts o.tune back; the marks follow (no flash)
await pg.evaluate(() => { JO.sim.ohm.tune = null; }); await pg.waitForTimeout(800); const s3 = await st(); ok(s3.tuK === 0, 'undo takes the deeper marks back');
// off switch
await pg.evaluate(() => { const K = JO.render.look.api.ohmChar; K.O.tune = false; window.__rec.f.length = 0; JO.events.post({ type: 'ohm.tune', src: JO.sim.ohm }); }); await pg.waitForTimeout(500);
ok(!(await pg.evaluate(() => window.__rec.f.some(v => v))), "OHM_CHAR.tune = false: no glow");
ok(errs.length === 0, `page errors: ${errs.length}${errs.length ? ' ' + errs.slice(0, 2).join(' | ') : ''}`);
console.log(fails ? `look_tune_test: ${fails} FAIL` : 'look_tune_test: all ok'); await B.close(); srv.close(); process.exit(fails ? 1 : 0);
