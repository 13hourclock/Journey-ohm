// look/audio.js: one light visual per st.audio system. Real app, headless Chromium 412x915, no audio.
// st.audio is driven IN THE PAGE ONLY: audiosig's tick is wrapped so the test can fire one event per system (onset = 1, as the bus
// would) and hold the state fields (jam.on, trad step) it needs; trippy.tick is wrapped to pin st.trippy. For each system and trippy
// .05 / 1 it screenshots the wave at a few ages, checks the wave started (stats.by), that its opt turns it off, and times look.post.
// node tests/look_audio_test.mjs [www] [png dir] [systems,comma,separated]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
let pw = null; try { pw = require('playwright'); } catch (e) { console.log('look_audio_test: no Playwright, SKIPPED'); process.exit(0); }
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.argv[2] || new URL('../www/', import.meta.url).pathname, dump = process.argv[3] || null, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const ALL0 = ['om', 'notes', 'strings', 'bars', 'membranes', 'jam', 'arc', 'trad', 'abilities', 'muffle'], ONLY = (process.argv[4] || '').split(',').filter(Boolean); let ALL = ALL0;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
if (dump) fs.mkdirSync(dump, { recursive: true });
const B = await pw.chromium.launch(), pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(SEED(20261026)); await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0`);
await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm && JO.render.st && JO.render.st.audio && JO.render.look && JO.render.look.api && JO.render.look.api.audio, null, { timeout: 20000 });
await pg.evaluate(() => { const c = JO.world.opts.autojam; if (c) c.on = false; }); await pg.waitForTimeout(3500);
ALL = await pg.evaluate(L => L.filter(k => k in JO.render.look.api.audio.O), ALL0); console.log('systems in look/audio.js:', ALL.join(' '));
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
await pg.evaluate(() => { const st = JO.render.st, S = st.audio, T = JO.systems.trippy, t0 = S.tick; window.__trp = .05; window.__hold = null;
  S.tick = () => { t0(); const h = window.__hold; if (h && performance.now() < h.until) h.f(S); };
  const tt = T.tick; T.tick = dt => { tt(dt); st.trippy = window.__trp; }; });
// one event per system (positions: around the focus ohm, as the bus would give a body)
const FIRE = {
  om: 'S.om.heart = 1; S.om.level = .7; S.om.hz = 64 * Math.pow(2, 3 / 12);',
  notes: 'const N = S.notes; N.onset = 1; N.pc = 4; N.level = .8; N.bright = .6; N.damp = .2; N.x = o.body.x; N.y = o.body.y; N.id = o.id;',
  strings: 'const D = S.strings; D.onset = 1; D.pc = 7; D.x = o.body.x + .8; D.y = o.body.y - 1.6;',
  bars: 'const D = S.bars; D.onset = 1; D.pc = 9; D.x = o.body.x - .9; D.y = o.body.y - .6;',
  membranes: 'const D = S.membranes; D.onset = 1; D.pc = 0; D.x = o.body.x; D.y = o.body.y + .5;',
  jam: 'const J = S.jam; J.down = 1; J.frontOn = 1; J.front = o.id; J.growOn = 1; J.pairs = 2; J.chord = 3;',
  arc: 'const R = S.arc; R.sectionOn = 1; R.hookOn = 1; R.progress = .4;',
  trad: 'const T = S.trad; T.crazeOn = 1; T.tradOn = 1;',
  abilities: "const D = S.abilities; D.onset = 1; D.kind = 'echo'; D.x = o.body.x; D.y = o.body.y;",
  muffle: '' };
const HOLD = { jam: 'S.jam.on = true; S.jam.pairs = 2;', trad: "S.trad.id = 'tr1'; S.trad.cycle = 'four'; S.trad.steps = 4; S.trad.step = Math.floor(performance.now() / 350) % 4; S.trad.accent = .8;", muffle: 'S.muffle.amt = .8;' };
const AGES = [120, 380, 800];
const fire = (sys, trp) => pg.evaluate(([sys, trp, f, h]) => { window.__trp = trp; const S = JO.render.st.audio, o = JO.sim.ohm; const A = JO.render.look.api.audio; A.live.length = 0;
  window.__hold = { until: performance.now() + 1400, f: new Function('S', 'o', (h || '') + ';') .bind(null) }; const g = new Function('S', 'o', f); window.__hold.f = (S) => new Function('S', 'o', h || '')(S, o);
  g(S, o); return { ...A.stats.by }; }, [sys, trp, FIRE[sys], HOLD[sys] || '']);
const FOC = await pg.evaluate(() => { const st = JO.render.st, o = JO.sim.ohm, c = st.cam, R = Math.min(st.W, st.H) * .13 * c.z; return { x: st.W / 2 + (o.body.x - c.x) * R, y: st.H * .36 + (o.body.y - c.y) * R, landY: JO.render.look.api.audio && null }; });
if (dump) fs.writeFileSync(path.join(dump, 'focus.json'), JSON.stringify(FOC)); console.log('focus ohm on screen', FOC.x.toFixed(0), FOC.y.toFixed(0));
const strips = {};
for (const sys of ONLY.length ? ONLY : ALL) {
  const before = await pg.evaluate(s => JO.render.look.api.audio.stats.by[s] || 0, sys); const shots = [];
  for (const trp of [.05, 1]) { await pg.evaluate(t => { window.__trp = t; window.__hold = null; }, trp); await pg.waitForTimeout(sys === 'muffle' ? 300 : 1300);
    const b0 = await pg.screenshot(); shots.push(b0); if (dump) fs.writeFileSync(path.join(dump, `av_${sys}_t${trp === 1 ? 100 : '05'}_rest.png`), b0);
    await fire(sys, trp); let el = 0; for (const a of AGES) { await pg.waitForTimeout(a - el); el = a; const b = await pg.screenshot(); shots.push(b); if (dump) fs.writeFileSync(path.join(dump, `av_${sys}_t${trp === 1 ? 100 : '05'}_${a}.png`), b); } }
  const after = await pg.evaluate(s => ({ by: JO.render.look.api.audio.stats.by[s] || 0, live: JO.render.look.api.audio.live.length }), sys);
  ok(sys === 'muffle' || after.by > before, `${sys}: waves started (${after.by - before})`);
  // its opt off: no wave starts
  const off = await pg.evaluate(async ([sys, f]) => { const A = JO.render.look.api.audio; A.O[sys] = false; const n0 = A.stats.by[sys] || 0; new Function('S', 'o', f)(JO.render.st.audio, JO.sim.ohm);
    await new Promise(r => setTimeout(r, 200)); const n1 = A.stats.by[sys] || 0; A.O[sys] = true; return n1 - n0; }, [sys, FIRE[sys]]);
  ok(off === 0, `${sys}: opt realLook.audio.${sys} = false starts nothing`);
}
// light pass alone (deterministic ages): a fresh createAudioLook draws each system's waves over a plain dark-grey frame, trippy .05 / 1
const LP = await pg.evaluate(async ([FIRE, HOLD, sysList]) => { const { createAudioLook } = await import('/js/look/audio.js'); const out = {}, o = JO.sim.ohm, st0 = JO.render.st;
  for (const sys of sysList) { out[sys] = []; for (const trp of [.05, 1]) for (const age of [.08, .3, .6, 1]) {
    const A = createAudioLook({ sim: JO.sim }); const S = JSON.parse(JSON.stringify(st0.audio, (k, v) => typeof v === 'function' ? undefined : v));
    for (const k of ['om', 'notes', 'strings', 'bars', 'membranes', 'abilities']) { const D = S[k]; if (D.onset != null) D.onset = 0; } S.om.heart = 0; for (const k of ['down', 'chordOn', 'keyOn', 'frontOn', 'growOn']) S.jam[k] = 0; for (const k of ['sectionOn', 'hookOn', 'endOn', 'breakdownOn']) S.arc[k] = 0; S.trad.crazeOn = 0; S.trad.tradOn = 0; S.trad.id = null; S.muffle.amt = 0;
    const st = { W: st0.W, H: st0.H, cam: st0.cam, A: st0.A, depth: st0.depth, zoom: st0.zoom, trippy: trp, audio: S }, c = document.createElement('canvas'); c.width = st.W; c.height = st.H; const g = c.getContext('2d');
    A.post(g, st, 560); new Function('S', 'o', (HOLD[sys] || '') + ';' + FIRE[sys])(S, o); g.fillStyle = '#34343c'; g.fillRect(0, 0, c.width, c.height); A.post(g, st, 560);
    for (const w of A.live) w.t0 -= age; g.fillStyle = '#34343c'; g.fillRect(0, 0, c.width, c.height); A.post(g, st, 560); out[sys].push(c.toDataURL('image/png')); } }
  return out; }, [FIRE, HOLD, ONLY.length ? ONLY : ALL]);
if (dump) for (const [sys, L] of Object.entries(LP)) L.forEach((u, i) => fs.writeFileSync(path.join(dump, `lp_${sys}_${i < 4 ? 't05' : 't100'}_${['008', '030', '060', '100'][i % 4]}.png`), Buffer.from(u.split(',')[1], 'base64')));
// cost: look.post's audio part per frame, idle (no waves) and with 8 live waves of each shape (trippy 1)
const cost = await pg.evaluate(() => { const A = JO.render.look.api.audio, st = { ...JO.render.st }, c = document.createElement('canvas'); c.width = 412; c.height = 915; const g = c.getContext('2d'); A.live.length = 0;
  const N = 300; let t0 = performance.now(); for (let i = 0; i < N; i++) A.post(g, st, 560); const idle = (performance.now() - t0) / N;
  const o = JO.sim.ohm, mk = () => { A.live.length = 0; const t = performance.now() / 1000; for (const [shape, w] of [['glow', 3], ['ring', 4], ['streak', 5], ['glint', 3]]) for (let k = 0; k < 2; k++) A.live.push({ sys: 'x', shape, wx: o.body.x + k, wy: o.body.y, w0: w, w1: w, h0: shape === 'streak' ? .4 : null, life: 1e6, a: .3, hb: 4, cs: 4, t0: t }); };
  mk(); A.post(g, st, 560); t0 = performance.now(); for (let i = 0; i < N; i++) A.post(g, st, 560); const busy = (performance.now() - t0) / N; A.live.length = 0; return { idle, busy, bakes: A.stats.bakes }; });
console.log(`cost per frame: idle ${(cost.idle * 1000).toFixed(1)} us, 8 live waves ${(cost.busy * 1000).toFixed(1)} us (${(cost.busy * 1000 / 8).toFixed(1)} us/wave); sprite bakes so far ${cost.bakes}`);
ok(cost.idle < .02, 'idle cost under 0.02 ms');
ok(!errs.length, `no page errors ${errs.slice(0, 2).join(' | ')}`);
await B.close(); srv.close(); console.log(fail ? `look_audio_test: ${fail} FAIL` : 'look_audio_test: all ok'); process.exit(fail ? 1 : 0);
