// ground + night-veil before/after stills: the whole app headless at phone size (412x915 CSS px, dpr 2), unlabelled.
// node tests/look_ground_stills.mjs <www root> <out dir> <prefix>      (SHOTS=rest,dusk ... to run only some)
//   Math.random is seeded (init script, test-only) so the before / after runs land on the same world and the same ohms.
//   rest       : nothing played, the world's autojam off (as look_kaleido_stills 'rest'); the day cycle held at day (env.day = .55)
//   jam        : 8 ohms jam deep into a song (as look_kaleido_stills 'jam'), held at day
//   night      : rest with the day cycle held at night (world.env.day = .02, as look_v019_stills 'night')
//   night_jam  : the jam at night
//   dusk       : rest held at dusk (env.day = .28: the twilight weight's peak; the front strip must stay lit by the sky)
//   s42_rest   : rest on another world (Math.random seed 42), held at day
//   crop_*     : the land band (y 420..915 CSS px) of rest / jam at 2x, to look at the terrain itself
// Notes are posted on the app's own bus (JO.events.note), exactly like an ohm would; nothing in the repo is patched.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const [root, out, pre = 'g'] = process.argv.slice(2), ONLY = process.env.SHOTS ? process.env.SHOTS.split(',') : null, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
fs.mkdirSync(out, { recursive: true }); const B = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const SEED = (n = 20261025) => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const PLAY = (n, jam, songP) => { const J = window.JO, bus = J.events, real = (J.sim.ohms || []).slice(0, n), src = [];
  for (let i = 0; i < n; i++) src.push(real[i] || { id: 9000 + i, hue: (i * 137.5 + 20) % 360, scale: 'ohm' });
  if (songP != null) { bus.ctl('global', 'song.on', 1); bus.ctl('global', 'song.section', songP); }
  let k = 0; window.__kplay = setInterval(() => { k++; for (let i = 0; i < src.length; i++) if ((k + i) % (jam ? 1 : 2) === 0)
    bus.note({ src: src[i], kind: i % 3 === 2 ? 'strike' : 'note', deg: (k + i * 2) % 7, vel: .55 + .4 * ((i * 7 + k) % 5) / 4, dur: i % 3 === 2 ? .1 : .5, jam: jam ? 1 : 0 }); }, 1000 * 60 / ((J.music.bpm || 60) * 2)); };
const QUIET = () => { const c = window.JO.world.opts.autojam; if (c) c.on = false; };
const HOLD = d => { const E = window.JO.world.env, t0 = E.tick; E.tick = (dt, t) => { t0(dt, t); E.day = d; }; E.day = d; };
const shots = [['rest', 18000, null, 1, .55], ['jam', 18000, [8, 1, .8], 0, .55], ['night', 18000, null, 1, .02], ['night_jam', 18000, [8, 1, .8], 0, .02], ['dusk', 18000, null, 1, .28], ['s42_rest', 18000, null, 1, .55, 42]];
for (const [n, ms, play, quiet, night, seed] of shots) { if (ONLY && !ONLY.includes(n)) continue; const pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(SEED(seed)); await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForTimeout(quiet ? 400 : 3000);
  if (quiet) await pg.evaluate(QUIET).catch(e => errs.push(String(e))); await pg.evaluate(HOLD, night).catch(e => errs.push(String(e)));
  if (quiet) await pg.waitForTimeout(2600);
  if (play) await pg.evaluate(([f, a]) => (0, eval)("(" + f + ")")(...a), [PLAY.toString(), play]).catch(e => errs.push(String(e)));
  await pg.waitForTimeout(ms - 3000);
  const f = path.join(out, `${pre}_${n}.png`); await pg.screenshot({ path: f });
  if (n === 'rest' || n === 'jam' || n === 'dusk') await pg.screenshot({ path: path.join(out, `${pre}_crop_${n}.png`), clip: { x: 0, y: 420, width: 412, height: 495 } });
  const info = await pg.evaluate(() => { const lk = window.JO.render.look, g = lk.api.ground && lk.api.ground.stats(), r = lk.readout ? lk.readout() : {}, z = lk.api.kz || {};
    return JSON.stringify({ day: +(window.JO.world.env.day || 0).toFixed(2), heal: +(r.heal || 0).toFixed(2), trip: +(r.trip || 0).toFixed(2), veilA: z.veilA != null ? +z.veilA.toFixed(3) : null, nightVeil: z.nightVeil != null ? +z.nightVeil.toFixed(3) : null, big: z.big != null ? +z.big.toFixed(2) : null, lineA: z.lineA != null ? +z.lineA.toFixed(2) : null, arc: lk.api.ks ? lk.api.ks.arc : null, songP: lk.api.ks ? +(lk.api.ks.songP || 0).toFixed(2) : null, feed: lk.api.ks ? lk.api.ks.feed : null, tiles: g && g.tiles, bakes: g && g.bakes, maxBakeMs: g && +g.maxBakeMs.toFixed(1), jobs: g && g.jobs }); }).catch(e => String(e));
  console.log(`  ${f}\n    ${info}${errs.length ? '\n    ERR ' + errs.slice(0, 3).join(' | ') : ''}`); await pg.close(); }
await B.close(); srv.close();
