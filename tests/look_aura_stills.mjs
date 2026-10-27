// tradAura stills: the whole app headless at phone size (412x915 CSS px, dpr 2). Test-only: look.api.aura.on = true and the jam's ohms
// are tagged (o.tradition / o.rarity / o.personality) from the page; nothing in the repo is patched (the flag stays OFF by default).
// node tests/look_aura_stills.mjs <www root> <out dir> <prefix>     SHOTS=jam,night,strip ; AURA=0 for the 'before' (flag off)
//   jam    : 8 ohms jam deep into a song at day, 8 traditions: 4 rare, 1 master, 3 ordinary
//   night  : the same at night;  dusk: at dusk
//   strip  : one rare ohm (ZOOM: the crop around it at 3x) through a phrase: 4 frames one bar apart, + the strip as one png
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const [root, out, pre = 'a'] = process.argv.slice(2), ONLY = process.env.SHOTS ? process.env.SHOTS.split(',') : null, AURA = process.env.AURA !== '0', TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
fs.mkdirSync(out, { recursive: true }); const B = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const SEED = (n = 20261025) => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const TAG = ([on, focus]) => { const J = window.JO, A = J.render.look.api.aura; if (A) A.on = on; const T = ['folk', 'raga', 'maqam', 'gamelan', 'japan', 'wafrica', 'celtic', 'techno'], R = [1, 1, 2, 1, 0, 1, 0, 0];
  (J.sim.ohms || []).slice(0, 8).forEach((o, i) => { const k = (i + focus) % 8; o.tradition = T[k]; o.rarity = R[i]; o.personality = { bold: (i % 3) - 1, playful: ((i * 5) % 3) - 1 }; }); return (J.sim.ohms || []).length; };
const PLAY = (n, jam, songP) => { const J = window.JO, bus = J.events, real = (J.sim.ohms || []).slice(0, n), src = [];
  for (let i = 0; i < n; i++) src.push(real[i] || { id: 9000 + i, hue: (i * 137.5 + 20) % 360, scale: 'ohm' });
  if (songP != null) { bus.ctl('global', 'song.on', 1); bus.ctl('global', 'song.section', songP); }
  let k = 0; window.__kplay = setInterval(() => { k++; for (let i = 0; i < src.length; i++) if ((k + i) % (jam ? 1 : 2) === 0)
    bus.note({ src: src[i], kind: i % 3 === 2 ? 'strike' : 'note', deg: (k + i * 2) % 7, vel: .55 + .4 * ((i * 7 + k) % 5) / 4, dur: i % 3 === 2 ? .1 : .5, jam: jam ? 1 : 0 }); }, 1000 * 60 / ((J.music.bpm || 60) * 2)); };
const HOLD = d => { const E = window.JO.world.env, t0 = E.tick; E.tick = (dt, t) => { t0(dt, t); E.day = d; }; E.day = d; };
const INFO = () => { const J = window.JO, A = J.render.look.api.aura; if (!A) return null; return (J.sim.ohms || []).slice(0, 8).map(o => { const i = A.info(o); return { id: o.id, t: i.tradition, tier: i.tier, x: +(i.x || 0).toFixed(0), y: +(i.y || 0).toFixed(0), r: +(i.r || 0).toFixed(1), loud: +i.loud.toFixed(2), sig: +i.sig.toFixed(2) }; }); };
const shots = [['jam', .55], ['night', .02], ['dusk', .28], ['strip', .55]];
for (const [n, day] of shots) { if (ONLY && !ONLY.includes(n)) continue; const pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(SEED()); await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForTimeout(3000);
  await pg.evaluate(HOLD, day).catch(e => errs.push(String(e))); await pg.evaluate(TAG, [AURA, n === 'strip' ? 0 : 0]).catch(e => errs.push(String(e)));
  await pg.evaluate(([f, a]) => (0, eval)("(" + f + ")")(...a), [PLAY.toString(), [8, 1, .8]]).catch(e => errs.push(String(e)));
  await pg.waitForTimeout(14000);
  if (n !== 'strip') { const f = path.join(out, `${pre}_${n}.png`); await pg.screenshot({ path: f }); console.log(`  ${f}\n    ${JSON.stringify(await pg.evaluate(INFO))}\n    ${await pg.evaluate(() => { const A = window.JO.render.look.api.aura; return A ? JSON.stringify({ ...A.stats, jobs: A.jobs.length, spr: A.sprites.map.size, MB: +(A.sprites.bytes / 1048576).toFixed(1), mode: window.JO.render.look.api.bakeMode }) : 'no aura'; })}`+`${errs.length ? '\n    ERR ' + errs.slice(0, 3).join(' | ') : ''}`); }
  else { const inf = await pg.evaluate(INFO), pick = (inf || []).filter(o => o.tier === 1 && o.r > 0).sort((a, b) => b.r - a.r)[0] || (inf || [])[0]; console.log('    strip ohm', JSON.stringify(pick));
    const bpm = await pg.evaluate(() => window.JO.music.bpm || 60), bar = 4 * 60000 / bpm;
    for (let k = 0; k < 4; k++) { const I = await pg.evaluate(INFO), o = I.find(q => q.id === pick.id) || pick, h = Math.max(60, o.r * 3.4) | 0;
      const f = path.join(out, `${pre}_strip${k}.png`), cx = Math.max(0, Math.min(412 - 2 * h, o.x - h)), cy = Math.max(0, Math.min(915 - 2 * h, o.y - h));
      await pg.screenshot({ path: f, clip: { x: cx, y: cy, width: 2 * h, height: 2 * h } }); console.log(`  ${f} ${JSON.stringify(o)}`); if (k < 3) await pg.waitForTimeout(bar); }
    if (errs.length) console.log('    ERR ' + errs.slice(0, 3).join(' | ')); }
  await pg.close(); }
await B.close(); srv.close();
