// look v0.0.19 follow-up stills: the whole app headless at phone size (412x915 CSS px, dpr 2), unlabelled.
// node tests/look_v019_stills.mjs <www root> <out dir> <prefix> [sky]
//   shots: warm25 (25 s in), day (day cycle held at noon), night (held at night), big (st.big moment forced if the bus allows)
//   'sky': simulate Game Dev's offered wiring — render.js calls look.sky(c, st) first and skips its own sky when it returns true
//   (test-only route rewrite of render.js in the served copy; the repo's render.js is not touched).
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const [root, out, pre, sky] = process.argv.slice(2), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const SKY_REPL = [   // [from, to]: the wiring Game Dev offered, applied to the served render.js only
  ["const bg = c.createRadialGradient(", "const SKY = !!(look.sky && L === world.home && L.globe && look.sky(c, st, L, A, sc) === true); if (world.env) world.env._lookSky = SKY; const bg = c.createRadialGradient("],
  ["c.fillStyle = bg; c.fillRect(0, 0, W, H);", "if (!SKY) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }"],
  ["if (real > .05) { const sky = c.createLinearGradient(", "if (!SKY && real > .05) { const sky = c.createLinearGradient("],
  ["const E0 = L === world.home", "const E0 = !SKY && L === world.home"],
  ["const n = 1 - E.day; if (n > .02)", "const n = 1 - E.day; if (!E._lookSky && n > .02)"]];
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } if (sky && u.endsWith('/render.js')) { let s = b.toString(); for (const [f, t] of SKY_REPL) { if (s.split(f).length !== 2) console.log('WARN sky anchor not unique/missing:', f.slice(0, 40)); s = s.replace(f, t); } b = s; }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const shots = [['warm25', 25000, null], ['day', 20000, 'JO.world.env.opts.day = false'], ['night', 20000, 'const E = JO.world.env, t0 = E.tick; E.tick = (dt, t) => { t0(dt, t); E.day = .02; }']];
for (const [n, ms, ev] of shots) { const pg = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/`); if (ev) { await pg.waitForTimeout(1500); await pg.evaluate(ev).catch(e => errs.push(String(e))); await pg.waitForTimeout(ms - 1500); } else await pg.waitForTimeout(ms);
  const f = path.join(out, `${pre}_${n}.png`); await pg.screenshot({ path: f }); const info = await pg.evaluate(() => { const J = window.JO || {}, lk = (J.render && J.render.look) || null, a = lk && lk.api; return JSON.stringify({ kz: a && a.kz, day: J.world && J.world.env && +J.world.env.day.toFixed(2), sky: a && a.sky && a.sky.stats && a.sky.stats() }); }).catch(e => String(e)); console.log('  state', info); console.log(f, 'errors', errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
await b.close(); srv.close();
