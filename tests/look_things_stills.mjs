// look.thing stills: the whole app headless at phone size (412x915 CSS px, dpr 2), unlabelled. node tests/look_things_stills.mjs <www root> <out dir> <prefix>
//   One of every placed-thing kind (8 fx objects, a membrane, a string, a bar) is made with JO.things.make on the app's own sim.placed
//   list at fixed screen spots. things.js is NOT patched in the repo: for the stills its T.draw is replaced AT RUNTIME (test-only) by the
//   README "look.thing" integration (look.thing first, the world's own outline when it returns false). 'before' = the unpatched outlines.
//   before / day / dusk / night : rest, the day cycle held (.55 / .28 / .02); hit: day, every thing held at 120 ms after a strike (re-struck every 16 ms)
//   crop_* : the things band at 2x
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const [root, out, pre = 't'] = process.argv.slice(2), ONLY = process.env.SHOTS ? process.env.SHOTS.split(',') : null, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
fs.mkdirSync(out, { recursive: true }); const B = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const SEED = (n = 20261025) => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const QUIET = () => { const c = window.JO.world.opts.autojam; if (c) c.on = false; };
const HOLD = d => { const E = window.JO.world.env, t0 = E.tick; E.tick = (dt, t) => { t0(dt, t); E.day = d; }; E.day = d; };
const PLACE = async patch => { const J = window.JO, T = J.things, { toWorld, toScreen } = await import('/js/space.js'), { W, H } = J.render.size(), cam = J.sim.cam;
  T.list.length = 0; const FXK = ['rev', 'dly', 'dst', 'glt', 'cho', 'trm', 'cmb', 'pit'], wp = (x, y) => toWorld(W, H, cam, x, y);
  const blob = (cx, cy, r, sq, k) => Array.from({ length: 16 }, (_, j) => { const a = j / 16 * 6.283, w = 1 + .16 * Math.sin(a * (2 + k % 3) + k); const p = wp(cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w * sq); return { x: p.x, y: p.y }; });
  FXK.forEach((fx, i) => T.make('fx', blob(75 + (i % 3) * 131, 290 + Math.floor(i / 3) * 120, fx === 'cmb' ? 52 : 40, fx === 'cmb' ? .32 : .8, i), { fx, seed: 1000 + i * 77 }));
  T.make('membrane', blob(338, 530, 42, .85, 9), { seed: 5 });
  const ln = (x0, y0, x1, y1, bow) => Array.from({ length: 10 }, (_, j) => { const f = j / 9, p = wp(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + Math.sin(f * 3.1416) * bow); return { x: p.x, y: p.y }; });
  T.make('string', ln(40, 640, 372, 625, 10), { seed: 6 }); T.make('bar', ln(80, 700, 330, 712, 0), { seed: 7 });
  if (!patch) return T.list.length; const lk = J.render.look, canvas = document.getElementById('c'), dr0 = T.draw;
  T.draw = () => { if (!lk || !lk.thing) return dr0(); const t0 = performance.now(), g = canvas.getContext('2d'), { W, H } = J.render.size(), dpr = canvas.width / W, now = Date.now(), s = {}, keep = [];
    g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const th of T.list) { const c = toScreen(W, H, J.sim.cam, th.x, th.y, s), R = th.r * c.s; if (c.x + R < -20 || c.x - R > W + 20 || c.y + R < -20 || c.y - R > H + 20) continue;
      const P = th.pts.map(q => { const p = toScreen(W, H, J.sim.cam, q.x, q.y); return [p.x, p.y]; }), glow = th.hit ? Math.max(0, 1 - (now - th.hit) / 400) : 0;
      if (!lk.thing(g, th, c.x, c.y, R, { P, glow, chord: th.tied ? .6 : 0, now })) keep.push(th); }
    g.restore(); const dt = performance.now() - t0; window.__tms = (window.__tms || []); window.__tms.push(dt); { const T = window.JO.render.look.api.things; (window.__tsp = window.__tsp || []); if (dt > 4) window.__tsp.push([+dt.toFixed(1), T.baked - (window.__tb || 0), T.fresh, performance.now() | 0]); window.__tb = T.baked; } if (window.__tms.length > 240) window.__tms.shift(); if (keep.length) { const L = T.list; T.list = keep; try { dr0(); } finally { T.list = L; } } };
  return T.list.length; };
const shots = [['before', .55, 0, 0], ['day', .55, 1, 0], ['dusk', .28, 1, 0], ['night', .02, 1, 0], ['hit', .55, 1, 1]];
for (const [n, day, patch, hit] of shots) { if (ONLY && !ONLY.includes(n)) continue; const pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(SEED()); await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForTimeout(400);
  await pg.evaluate(QUIET).catch(e => errs.push(String(e))); await pg.evaluate(HOLD, day).catch(e => errs.push(String(e))); await pg.waitForTimeout(2600);
  const k = await pg.evaluate(p => (0, eval)('(' + p.f + ')')(p.patch), { f: PLACE.toString(), patch }).catch(e => (errs.push(String(e)), 0));
  await pg.waitForTimeout(3000); const b1 = await pg.evaluate(() => { const T = window.JO.render.look.api.things; return T ? T.baked : 0; }); await pg.waitForTimeout(3000); const b2 = await pg.evaluate(() => { const T = window.JO.render.look.api.things; return T ? T.baked : 0; }); console.log('    bakes in the last 3 s: ' + (b2 - b1) + ', cam ' + JSON.stringify(await pg.evaluate(() => window.JO.sim.cam)));
  if (hit) { await pg.evaluate(() => { window.__hit = setInterval(() => { for (const t of window.JO.things.list) t.hit = Date.now() - 120; }, 16); }); await pg.waitForTimeout(300); }
  const f = path.join(out, `${pre}_${n}.png`); await pg.screenshot({ path: f }); await pg.screenshot({ path: path.join(out, `${pre}_crop_${n}.png`), clip: { x: 0, y: 220, width: 412, height: 520 } });
  const info = await pg.evaluate(() => { const lk = window.JO.render.look, T = lk.api.things; return JSON.stringify({ day: +(window.JO.world.env.day || 0).toFixed(2), heal: +((lk.readout ? lk.readout() : {}).heal || 0).toFixed(2), things: window.JO.things.list.length, draws: T ? T.n : 0, baked: T ? T.baked : 0, fresh: T ? T.fresh : 0, lost: T ? T.lost : 0, thingsMs: window.__tms ? +(window.__tms.reduce((a, b) => a + b, 0) / window.__tms.length).toFixed(3) : null, thingsMsMax: window.__tms ? +Math.max(...window.__tms).toFixed(2) : null, spikes: (window.__tsp || []).slice(-8) }); });
  console.log(`  ${f}  (${k} things)\n    ${info}${errs.length ? '\n    ERR ' + errs.slice(0, 3).join(' | ') : ''}`); await pg.close(); }
await B.close(); srv.close();
