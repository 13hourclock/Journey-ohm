// sound-driven kaleidoscope stills: the whole app headless at phone size (412x915 CSS px, dpr 2), unlabelled.
// node tests/look_kaleido_stills.mjs <www root> <out dir> [sky]
//   rest  : nothing played, the world's autojam off (no ohm rings, no beat push)
//   solo  : one ohm plays a note every beat, autojam off (one ring in its colour; song.section .4 = mid arc)
//   jam   : 8 ohms jam (jam: 1) deep into a song (rings merge into the weave past the cap, beat push, sky filled)
//   big   : the jam + a big moment (world.moment -> bus 'moment'), shot while it holds to the bar line
// Notes are posted on the app's own bus (JO.events.note), exactly like an ohm would; nothing in the app is patched
// ('sky' = the same test-only render.js rewrite as look_v019_stills.mjs, so the stills match the look.sky wiring).
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const [root, out, sky] = process.argv.slice(2), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const SKY_REPL = [
  ["const bg = c.createRadialGradient(", "const SKY = !!(look.sky && L === world.home && L.globe && look.sky(c, st, L, A, sc) === true); if (world.env) world.env._lookSky = SKY; const bg = c.createRadialGradient("],
  ["c.fillStyle = bg; c.fillRect(0, 0, W, H);", "if (!SKY) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }"],
  ["if (real > .05) { const sky = c.createLinearGradient(", "if (!SKY && real > .05) { const sky = c.createLinearGradient("],
  ["const E0 = L === world.home", "const E0 = !SKY && L === world.home"],
  ["const n = 1 - E.day; if (n > .02)", "const n = 1 - E.day; if (!E._lookSky && n > .02)"]];
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } if (sky && u.endsWith('/render.js')) { let s = b.toString(); for (const [f, t] of SKY_REPL) { if (s.split(f).length !== 2) console.log('WARN sky anchor not unique/missing:', f.slice(0, 40)); s = s.replace(f, t); } b = s; }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
fs.mkdirSync(out, { recursive: true }); const B = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
// in-page player: n ohms (the sim's own ohms first, then stand-ins with a hue) post notes on the bus every half beat
const PLAY = (n, jam, songP) => { const J = window.JO, bus = J.events, real = (J.sim.ohms || []).slice(0, n), src = [];
  for (let i = 0; i < n; i++) src.push(real[i] || { id: 9000 + i, hue: (i * 137.5 + 20) % 360, scale: 'ohm' });
  if (songP != null) { bus.ctl('global', 'song.on', 1); bus.ctl('global', 'song.section', songP); }
  let k = 0; window.__kplay = setInterval(() => { k++; for (let i = 0; i < src.length; i++) if ((k + i) % (jam ? 1 : 2) === 0)
    bus.note({ src: src[i], kind: i % 3 === 2 ? 'strike' : 'note', deg: (k + i * 2) % 7, vel: .55 + .4 * ((i * 7 + k) % 5) / 4, dur: i % 3 === 2 ? .1 : .5, jam: jam ? 1 : 0 }); }, 1000 * 60 / ((J.music.bpm || 60) * 2)); };
// rest / solo: the world's own autojam is switched off (world.opts.autojam.on = false, a runtime option) so only what we play is heard
const QUIET = () => { const c = window.JO.world.opts.autojam; if (c) c.on = false; };
const shots = [['rest', 18000, null, 0, 1], ['solo', 18000, [1, 0, .4], 0, 1], ['jam', 18000, [8, 1, .8]], ['big', 18000, [8, 1, .8], 3200]];
for (const [n, ms, play, bigAt, quiet] of shots) { const pg = await b0().newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForTimeout(quiet ? 400 : 3000); if (quiet) { await pg.evaluate(QUIET).catch(e => errs.push(String(e))); await pg.waitForTimeout(2600); }
  if (play) await pg.evaluate(([f, a]) => (0, eval)("(" + f + ")")(...a), [PLAY.toString(), play]).catch(e => errs.push(String(e)));
  if (bigAt) { await pg.waitForTimeout(ms - 3000 - bigAt); await pg.evaluate(() => { const J = window.JO; if (J.world.moment) J.world.moment(1, 'climax', {}); else J.events.post({ type: 'moment', k: 1, kind: 'climax' }); }).catch(e => errs.push(String(e))); await pg.waitForTimeout(bigAt); }
  else await pg.waitForTimeout(ms - 3000);
  const f = path.join(out, `${sky ? 'sky_' : ''}${n}.png`); await pg.screenshot({ path: f });
  const info = await pg.evaluate(() => { const a = window.JO.render.look.api, z = a.kz || {}, r = {}; for (const k in z) r[k] = typeof z[k] === 'number' ? +z[k].toFixed(3) : z[k]; return JSON.stringify(r); }).catch(e => String(e));
  console.log(`  ${f}\n    kz ${info}${errs.length ? '\n    ERR ' + errs.slice(0, 3).join(' | ') : ''}`); await pg.close(); }
await B.close(); srv.close();
function b0() { return B; }
