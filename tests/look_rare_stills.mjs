// rare look stills (v0.0.24): the whole app headless at phone size (412x915 CSS px, dpr 2). Test-only, from the page: ohms are made rare through
// master's own rare.js (JO.rare.markRare), their rareSig.shape is pinned per shot, tradId / personality come from the real modules.
// node tests/look_rare_stills.mjs <www root> <out dir> <prefix>   SHOTS=star,long,twin,wave,jam,strip,stage1,stage3   RARE=0 -> placeholders (opts.realLook.rare off at runtime)   RARE_OPTS='{"erase":{"long":0}}' -> rare look params at runtime
//   star|long|twin|wave : 5 ohms made rare with that body shape (mixed traditions + kinds), zoomed in, jamming;  jam : 8 ohms, 6 rare (all 4 shapes)
//   from 6 traditions + 2 ordinary, tradAura on;  strip : one rare ohm through a phrase, 4 frames one beat apart + one 4-up png (412x915)
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const [root, out, pre = 'r'] = process.argv.slice(2), ONLY = process.env.SHOTS ? process.env.SHOTS.split(',') : null, RARE = process.env.RARE !== '0', AURA = process.env.AURA !== '0', TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
fs.mkdirSync(out, { recursive: true }); const B = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const SEED = (n = 20261025) => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
// make ohms rare: list of [shape | null, tradId, kind]; returns their ids + world positions
const MAKE = ([list, rare, aura, zoom, ro, stage, gather, parts]) => { const J = window.JO, L = J.render.look, os = (J.sim.ohms || []).filter(o => !o.parked);
  if (parts && J.systems && J.systems.roles) { const P = window.__parts = new Map(); parts.forEach((p, i) => { if (os[i] && p) P.set(os[i].id, p); }); J.systems.roles.of = o => { const p = P.get(o.id); return p ? { part: p, k: .9, scores: null } : null; }; }   // roles pinned (test only) if (L.api.aura) { L.api.aura.on = aura; if (stage) L.api.aura.stage = stage; } if (!rare) L.rare = null;
  if (ro && L.api.rare) for (const k in ro) { const v = ro[k], O = L.api.rare.O; if (v && typeof v === 'object' && O[k] && typeof O[k] === 'object') Object.assign(O[k], v); else O[k] = v; }
  const res = []; list.forEach(([shape, trad, kind, dev], i) => { const o = os[i]; if (!o) return; try { o.tradId = trad; } catch (e) {}
    if (shape) { J.rare.markRare(o, kind); o.rareSig = Object.assign({}, o.rareSig, { shape }); if (o.g) o.g._rare = null; if (dev) try { Object.assign(o, dev); } catch (e) {} } res.push({ id: o.id, shape, trad: o.tradId, kind: o.rareKind, tier: o.tier }); });
  if (gather) { const a = os[0].body, sp = gather * (os[0].g ? os[0].g.r : 20); os.slice(1, list.length).forEach((o, i) => { o.body.x = a.x + ((i % 2) * 2 - 1) * sp * (1 + (i >> 1)) * .8; o.body.y = a.y + (i & 1 ? 1 : -1) * sp * .35; o.body.vx = o.body.vy = 0; });
    window.__fol = setInterval(() => { const c = J.sim.cam, f = os.slice(0, list.length); c.x = f.reduce((s, o) => s + o.body.x, 0) / f.length; c.y = f.reduce((s, o) => s + o.body.y, 0) / f.length; }, 50); }
  if (zoom) { const f0 = os.slice(0, list.length), f1 = f0.filter((o, i) => list[i][0]), f = f1.length ? f1 : f0; /* no rare ohm in the shot: frame them all */ return import('/js/view.js').then(V => { const z = V.cam.z + Math.log(zoom) / Math.log(V.ZK); V.cam.lockZ = true; V.setDepth(z);
    const c = J.sim.cam; c.x = f.reduce((a, o) => a + o.body.x, 0) / f.length; c.y = f.reduce((a, o) => a + o.body.y, 0) / f.length; return res; }); }
  return res; };
const PLAY = (n, songP) => { const J = window.JO, bus = J.events, src = (J.sim.ohms || []).filter(o => !o.parked).slice(0, n);
  if (songP != null) { bus.ctl('global', 'song.on', 1); bus.ctl('global', 'song.section', songP); }
  let k = 0; window.__kplay = setInterval(() => { k++; for (let i = 0; i < src.length; i++) if ((k + i) % 2 === 0)
    bus.note({ src: src[i], kind: i % 3 === 2 ? 'strike' : 'note', deg: (k + i * 2) % 7, vel: .55 + .4 * ((i * 7 + k) % 5) / 4, dur: i % 3 === 2 ? .1 : .5, jam: 1 }); }, 1000 * 60 / ((J.music.bpm || 60) * 2)); };
const WHERE = ids => { const J = window.JO, c = document.querySelector('canvas'), W = innerWidth, H = innerHeight; return (J.sim.ohms || []).filter(o => ids.includes(o.id)).map(o => { const s = o._scr || null;
  return { id: o.id, x: o.sx != null ? o.sx : null, y: o.sy != null ? o.sy : null, r: o.g ? o.g.r : 0, shape: o.rareSig && o.rareSig.shape, tier: o.tier }; }); };
const TR = ['western', 'hindustani', 'maqam', 'gamelan', 'japan', 'wafrica', 'celtic', 'techno'], KD = ['wild', 'gift', 'teacher'];
const SH = {}; for (const s of ['star', 'long', 'twin', 'wave']) SH[s] = { list: [0, 1, 2, 3, 4].map(i => [s, TR[(i * 3 + s.length) % 8], KD[i % 3]]), zoom: 1.7 };
SH.jam = { list: [['star', 'western', 'wild'], ['twin', 'hindustani', 'teacher'], ['long', 'maqam', 'gift'], [null, 'gamelan'], ['wave', 'japan', 'wild'], ['star', 'wafrica', 'gift'], [null, 'celtic'], ['twin', 'techno', 'wild']], zoom: 1.15 };
// stage1 / stage3 (Wilbow 5:40 PM MDT, build stage B + growth A): one tradition (hindustani), the same star body at hatchling (tier 0),
// rare (tier 2, half way) and master (teacher, tier 4), tradAura on at that stage; + <pre>_stages.png = the two side by side
const DEV = [['star', 'hindustani', 'wild', { tier: 0, xp: 0 }], ['star', 'hindustani', 'gift', { tier: 2, xp: 30 }], ['star', 'hindustani', 'teacher', { tier: 4, xp: 160 }]];
SH.stage1 = { list: DEV, zoom: 2, stage: 1, aura: true }; SH.stage3 = { list: DEV, zoom: 2, stage: 3, aura: true };
SH.strip = { list: [['twin', 'gamelan', 'teacher'], ['star', 'celtic', 'wild'], [null, 'western']], zoom: 2.2 };
// body (v0.0.25): a close-up of 3 rare bodies (star techno, twin maqam, long celtic) + an ordinary ohm beside them, the material / light, tradAura on (stage 1)
SH.body = { list: [['star', 'techno', 'wild'], ['twin', 'maqam', 'gift'], [null, 'western'], ['long', 'celtic', 'teacher']], zoom: 2.2, aura: true, gather: 1.8 };
// roles (v0.0.26, look.ohmRole): a jam with mixed roles on the body - 2 of each (lead / bass / pad / rhythm), 2 of them rare, tradAura on;
// rolechg: one ohm (+ a neighbour) zoomed in, lead -> bass: <pre>_rolechg0 before, 1 half a beat into the ~1 beat crossfade, 2 after
SH.roles = { list: [['star', 'western', 'wild'], [null, 'gamelan'], [null, 'celtic'], ['twin', 'maqam', 'gift'], [null, 'japan'], [null, 'western'], [null, 'hindustani'], [null, 'techno']],
  parts: ['lead', 'bass', 'pad', 'rhythm', 'lead', 'bass', 'pad', 'rhythm'], zoom: 1.6, aura: true, gather: 1.8 };
SH.rolechg = { list: [[null, 'western'], [null, 'celtic']], parts: ['lead', 'pad'], zoom: 2.6, gather: 2.2, chg: 'bass' };
const shots = ['star', 'long', 'twin', 'wave', 'jam', 'strip', 'stage1', 'stage3', 'body', 'roles', 'rolechg'];
for (const n of shots) { if (ONLY && !ONLY.includes(n)) continue; const pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }); const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join(' ')));
  await pg.addInitScript(SEED()); await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForTimeout(3000);
  const S = SH[n], made = await pg.evaluate(MAKE, [S.list, RARE, n === 'jam' || n === 'strip' || S.aura ? AURA : false, S.zoom, process.env.RARE_OPTS ? JSON.parse(process.env.RARE_OPTS) : null, S.stage || 0, S.gather || 0, S.parts || null]).catch(e => (errs.push(String(e)), []));
  await pg.evaluate(([f, a]) => (0, eval)("(" + f + ")")(...a), [PLAY.toString(), [S.list.length, .8]]).catch(e => errs.push(String(e)));
  await pg.waitForTimeout(9000);
  const AS = await pg.evaluate(() => { const L = window.JO.render.look, A = L.api.aura, R = L.api.rare; return { idle: L.stats && L.stats().real ? L.stats().real.idleMs : null, mode: L.api.bakeMode, aura: A ? { on: A.on, stage: A.stage, ...A.stats, jobs: A.jobs.length } : null, rare: R ? { ...R.stats } : null }; }).catch(e => String(e)); if (process.env.STATS) console.log('   stats', JSON.stringify(AS));
  if (S.chg) { const bpm = await pg.evaluate(() => window.JO.music.bpm || 60), beat = 60000 / bpm, f3 = [], shot = async k => { const f = path.join(out, `${pre}_${n}${k}.png`); await pg.screenshot({ path: f }); f3.push(f); };
    await shot(0); await pg.evaluate(([p]) => { const J = window.JO, o = (J.sim.ohms || []).filter(o => !o.parked)[0]; window.__parts.set(o.id, p); }, [S.chg]);
    await pg.waitForTimeout(beat * .5); await shot(1); await pg.waitForTimeout(beat * 1.5); await shot(2);
    console.log(`  ${f3.join(' ')}  ${JSON.stringify(made)}${errs.length ? '\n    ERR ' + errs.slice(0, 3).join(' | ') : ''}`); }
  else if (n !== 'strip') { const f = path.join(out, `${pre}_${n}.png`); await pg.screenshot({ path: f }); console.log(`  ${f}  ${JSON.stringify(made)}${errs.length ? '\n    ERR ' + errs.slice(0, 3).join(' | ') : ''}`); }
  else { const bpm = await pg.evaluate(() => window.JO.music.bpm || 60), beat = 60000 / bpm, fs4 = [];
    for (let k = 0; k < 4; k++) { const f = path.join(out, `${pre}_strip${k}.png`); await pg.screenshot({ path: f }); fs4.push(f); if (k < 3) await pg.waitForTimeout(beat); }
    console.log(`  ${fs4.join(' ')}  ${JSON.stringify(made)}${errs.length ? '\n    ERR ' + errs.slice(0, 3).join(' | ') : ''}`); }
  await pg.close(); }
await B.close(); srv.close();
