// look.pulse (look/pulse.js): the echolocation wavefront as light. Real app, headless Chromium 412x915, no audio.
// abilities.js is world-side: this test swaps in, IN THE PAGE ONLY, the one-line call proposed in GAMEDEV_SPEC.md (look.pulse first,
// the stroked ring as the fallback), pushes echo rings at the focus ohm, screenshots the front at a few ages (stroke vs light), and
// times look.pulse per call. node tests/look_pulse_test.mjs [www] [png dir]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
let pw = null; try { pw = require('playwright'); } catch (e) { console.log('look_pulse_test: no Playwright, SKIPPED'); process.exit(0); }
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.argv[2] || new URL('../www/', import.meta.url).pathname, dump = process.argv[3] || null, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
if (dump) fs.mkdirSync(dump, { recursive: true });
const B = await pw.chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(SEED(20261025)); await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0`);
await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm && JO.systems && JO.systems.abilities, null, { timeout: 20000 });
await pg.evaluate(() => { const c = JO.world.opts.autojam; if (c) c.on = false; }); await pg.waitForTimeout(3500);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
// the proposed abilities.js:146-148 body with the one-line look call (stroke = fallback); MODE 'stroke' = the current code
await pg.evaluate(() => { const A = JO.systems.abilities, look = JO.render.look, music = JO.music, reach = 7; window.__mode = 'light';
  A.draw = (g, W, H, toS) => { if (!A.rings.length) return; const t = music.now(); g.save(); g.lineWidth = 1.2;
    A.rings = A.rings.filter(R => t - R.t0 < 1.5); for (const R of A.rings) { const a = t - R.t0; if (a < 0) continue; const c = toS(R.x, R.y), c2 = toS(R.x + reach * a / 1.5, R.y), r = Math.abs(c2.x - c.x);
      if (window.__mode === 'light' && look.pulse && look.pulse(g, 'echo', c.x, c.y, r, a, { s: R.s, life: 1.5 }) === true) continue;
      g.strokeStyle = `rgba(220,235,255,${(.35 * R.s * (1 - a / 1.5)).toFixed(3)})`; g.beginPath(); g.arc(c.x, c.y, Math.max(1, r), 0, 6.2832); g.stroke(); } g.restore(); }; });
const shotAt = async (mode, ages) => { const out = []; for (const age of ages) { await pg.evaluate(([m, age]) => { window.__mode = m; const A = JO.systems.abilities, o = JO.sim.ohm; A.rings.length = 0; A.rings.push({ x: o.body.x, y: o.body.y, t0: JO.music.now() - age, s: 1, src: o.id }); }, [mode, age]);
    await pg.waitForTimeout(60); const b = await pg.screenshot(); out.push(b); if (dump) fs.writeFileSync(path.join(dump, `pulse_${mode}_${String(age).replace('.', '')}.png`), b); } return out; };
await shotAt('stroke', [.3, .7]); await shotAt('light', [.15, .3, .7, 1.1]);
const st = await pg.evaluate(() => ({ ...JO.render.look.api.pulse.stats }));
ok(st.drawn > 0, `look.pulse drew the echo front (${st.drawn} draws, ${st.bakes} sprite bakes, ${st.catches} rim catchlights)`);
ok(st.bakes <= 16, 'sprites baked once (bounded)');
// cost: per call on the real overlay transform, a mid-size front (r 120) and a land crossing
const cost = await pg.evaluate(() => { const L = JO.render.look, c = document.createElement('canvas'); c.width = 412; c.height = 915; const g = c.getContext('2d'); L.pulse(g, 'echo', 206, 400, 120, .3, { s: 1 });
  const N = 400; let t0 = performance.now(); for (let i = 0; i < N; i++) L.pulse(g, 'echo', 206, 300, 40 + (i % 8) * 10, .3, { s: 1 }); const a = (performance.now() - t0) / N;
  t0 = performance.now(); for (let i = 0; i < N; i++) L.pulse(g, 'soft', 206, 300, 40 + (i % 8) * 10, .3, { s: 1 }); const b = (performance.now() - t0) / N; return { echo: a, soft: b }; });
console.log(`cost per ring per frame (CPU raster, small-mid front): echo ${(cost.echo * 1000).toFixed(1)} us, soft ${(cost.soft * 1000).toFixed(1)} us`);
const off = await pg.evaluate(() => { const P = JO.render.look.api.pulse; P.opts.echo = 'off'; const c = document.createElement('canvas').getContext('2d'); const r1 = JO.render.look.pulse(c, 'echo', 10, 10, 50, .2, {}); P.opts.echo = 'stroke'; const r2 = JO.render.look.pulse(c, 'echo', 10, 10, 50, .2, {}); P.opts.echo = 'soft'; return [r1, r2]; });
ok(off[0] === true && off[1] === false, "opts.pulse.echo 'off' hides (true), 'stroke' hands back to the world (false)");
ok(!errs.length, `no page errors ${errs.slice(0, 2).join(' | ')}`);
await B.close(); srv.close(); console.log(fail ? `look_pulse_test: ${fail} FAIL` : 'look_pulse_test: all ok'); process.exit(fail ? 1 : 0);
