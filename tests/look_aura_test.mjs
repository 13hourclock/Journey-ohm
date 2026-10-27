// tradAura (v0.0.23) checks: flag OFF by default in the app, the 8 traditions' fields, the fallbacks (stable hash, rarity forms,
// music flags from the notes), seamless loops (frame u=0 == u=1, u=.5 differs), ordinary ohms get no aura, and the per-frame cost
// of 10 rare ohms on a 412x915 dpr-2 canvas (all baked, q0).        node tests/look_aura_test.mjs [wwwDir]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(process.argv[2] || 'www'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const PORT = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const B = await chromium.launch();
// 1 the app: the flag is off by default, the module is there, no errors
{ const pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${PORT}/`); await pg.waitForTimeout(3000);
  const r = await pg.evaluate(() => { const A = window.JO && window.JO.render.look.api.aura; return A ? { on: A.on, drawn: A.stats.drawn, spr: A.sprites.map.size } : null; });
  ok(r && r.on === false, `app: tradAura present and OFF by default ${JSON.stringify(r)}`); ok(r && r.spr === 0, 'app: nothing baked while off');
  ok(errs.length === 0, `app: no page errors ${errs.slice(0, 2).join(' | ')}`); await pg.close(); }
// 2 the module in a blank page
const pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 }), errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`http://127.0.0.1:${PORT}/__blank`).catch(() => {}); await pg.setContent('<html><body style="margin:0"><canvas id=c width=824 height=1830></canvas></body></html>');
await pg.addScriptTag({ type: 'module', content: `
import { createAuras, TRADITIONS, AURA_OPTS } from 'http://127.0.0.1:${PORT}/js/look/aura.js';
const R = {}, mk = (w, h) => new OffscreenCanvas(w, h), HEX = /^#[0-9a-f]{6}$/i;
R.optsOff = !AURA_OPTS.on; R.n = TRADITIONS.length;
R.fields = TRADITIONS.every(t => t.auraPalette && ['glow', 'line', 'fill', 'accent'].every(k => HEX.test(t.auraPalette[k])) && t.auraPattern && ['kind', 'fold', 'density', 'speed', 'loopBeats', 'pulse', 'beatLock', 'swing'].every(k => t.auraPattern[k] != null) && typeof t.paint === 'function');
const A = createAuras({ makeCanvas: mk, opts: { on: true } }), A2 = createAuras({ makeCanvas: mk, opts: { on: true } });
const seen = new Set(); let stable = true; for (let i = 0; i < 200; i++) { const a = A.info({ id: i }).tradition, b = A2.info({ id: i }).tradition; seen.add(a); if (a !== b) stable = false; }
R.hash = { stable, all8: seen.size === 8 };
R.tiers = [{ rarity: 'rare' }, { rarity: 'master' }, { rarity: { tier: 2 } }, { rare: true }, { teacher: true }, { rarity: 0 }, {}].map((o, i) => A.info({ id: 500 + i, ...o }).tier);
R.trad = [A.info({ id: 1, tradition: 'Raga' }).tradition, A.info({ id: 1, tradition: 3 }).tradition, A.info({ id: 1, tradition: { id: 'celtic', auraPalette: { glow: '#ff0000' } } }).tradition];
// music flags from the notes (no fields): a 1-semitone pitch move = glide; a quarter-tone = offScale; explicit fields win
const music = { beat: t => t * 2 }; let T = 1; const step = () => { T += 1 / 60; A.frame({ t: T }, music, { day: .02 }, 0); };
const m = { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }, cv = new OffscreenCanvas(824, 1830), g = cv.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0);
const og = { id: 77, tradition: 'raga', rarity: 1, pitch: 440 }; step(); A.draw(g, og, 100, 100, 30, m, [200, 200, 200], .6); og.pitch = 466.16; step(); A.draw(g, og, 100, 100, 30, m, [200, 200, 200], .6);
const om = { id: 78, tradition: 'maqam', rarity: 1, pitch: 440 }; step(); A.draw(g, om, 100, 100, 30, m, [200, 200, 200], .6); om.pitch = 452.9; step(); A.draw(g, om, 100, 100, 30, m, [200, 200, 200], .6);
const of = { id: 79, tradition: 'gamelan', rarity: 1, glide: true, offScale: 0 }; step(); A.draw(g, of, 100, 100, 30, m, [200, 200, 200], .6);
R.flags = { glide: A.info(og).glide > .9, sigGlide: A.info(og).sig > .5, off: A.info(om).off > .9 || A.info(om).offScale > .9, sigOff: A.info(om).sig > .5, field: A.info(of).glide > .9 && A.info(of).offScale < .1 };
// ordinary ohms: no aura sprite drawn
A.stats.drawn = 0; step(); A.draw(g, { id: 90, tradition: 'folk', rarity: 0 }, 100, 100, 30, m, [200, 200, 200], .6); R.ordinary = A.stats.drawn;
// seamless loop: u=0 vs u=1 per tradition (rare, night + day), and u=.5 differs
const px = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data, dif = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
R.loop = []; for (const t of TRADITIONS) for (const lb of [0, 2]) { const o = { id: 1000 + t.i, tradition: t.id, rarity: 1 }; const a = px(A.paintAt(o, 60, 0, lb)), b = px(A.paintAt(o, 60, 1, lb)), c = px(A.paintAt(o, 60, .5, lb)); R.loop.push([t.id, lb, +dif(a, b).toFixed(3), +dif(a, c).toFixed(2)]); }
// cost: 10 rare ohms (3 master), r 26..34 CSS px, all frames baked; mean ms per frame of A.draw over 240 frames
const cost = async (opts, label) => { const A3 = createAuras({ makeCanvas: mk, opts: { on: true, ...opts } }); const os = []; for (let i = 0; i < 10; i++) os.push({ id: 2000 + i, tradition: TRADITIONS[i % 8].id, rarity: i < 3 ? 2 : 1, personality: (i % 3) - 1 });
  const at = i => [60 + (i % 3) * 140, 140 + Math.floor(i / 3) * 190, 26 + (i % 5) * 2]; let t = 1;
  const fr = () => { t += 1 / 60; A3.frame({ t }, music, { day: .5 }, 0); os.forEach((o, i) => { const [x, y, r] = at(i); A3.draw(g, o, x, y, r, m, [180, 160, 220], .7); }); };
  for (let w = 0; w < 400; w++) { fr(); A3.pump(1e9); g.clearRect(-1e4, -1e4, 2e4, 2e4); } await new Promise(r => setTimeout(r, 0));
  const t0 = performance.now(), N = 240; for (let k = 0; k < N; k++) { fr(); if (k % 60 === 59) { g.getImageData(0, 0, 1, 1); } } g.getImageData(0, 0, 1, 1); const ms = (performance.now() - t0) / N;
  A3.pump(1e9); return { label, ms: +ms.toFixed(3), ...A3.stats, MB: +(A3.sprites.bytes / 1048576).toFixed(1), jobs: A3.jobs.length }; };
// crowded jam (v0.0.25): 3 rare auras on one spot, one loud: it keeps full strength, the next makes way (softer, pulled in), the third hides; apart = all full
{ const W = createAuras({ makeCanvas: mk, opts: { on: true } }), os = [0, 1, 2].map(i => ({ id: 300 + i, tradition: 'folk', rarity: 1 })), gl = [1.2, .1, .1]; let t = 1;
  const run = (sp, n) => { for (let f = 0; f < n; f++) { t += 1 / 60; W.frame({ t }, music, { day: .02 }, 0); os.forEach((o, i) => W.draw(g, o, 200 + sp * i, 300, 20, m, [200, 200, 200], gl[i])); } return os.map(o => W.way(o)); };
  const a = run(10, 90), b = run(400, 90); R.way = { lead: a[0], yield: a[1], hide: a[2], apart: b.map(w => +w.a.toFixed(2)) }; }
R.cost = [await cost({}, 'default'), await cost({ sheenA: 0 }, 'no sheen'), await cost({ fadeN: [0, 0, 0, 0], live: [0, 0, 0, 0] }, 'no fades/live'), await cost({ sheenA: 0, fadeN: [0, 0, 0, 0], live: [0, 0, 0, 0], maxD: [256, 256, 256, 0] }, 'lean')];
window.__R = R;` });
await pg.waitForFunction(() => window.__R, null, { timeout: 180000 }); const R = await pg.evaluate(() => window.__R);
ok(R.optsOff, 'AURA_OPTS has no on:true'); ok(R.n === 8 && R.fields, '8 traditions with auraPalette {glow,line,fill,accent} + auraPattern fields');
ok(R.hash.stable && R.hash.all8, `stable hash fallback picks all 8 traditions ${JSON.stringify(R.hash)}`);
ok(JSON.stringify(R.tiers) === '[1,2,2,1,2,0,0]', `rarity forms -> tier ${JSON.stringify(R.tiers)}`); ok(JSON.stringify(R.trad) === '["raga","gamelan","celtic"]', `tradition forms ${JSON.stringify(R.trad)}`);
ok(R.flags.glide && R.flags.sigGlide, `glide from the notes + raga signature ${JSON.stringify(R.flags)}`); ok(R.flags.off && R.flags.sigOff, 'offScale from the notes + maqam signature'); ok(R.flags.field, 'explicit o.glide / o.offScale fields win');
ok(R.ordinary === 0, 'ordinary ohm: no aura sprite');
ok(R.way && R.way.lead.a > .98 && R.way.lead.k === 1 && R.way.yield.a < .5 && R.way.yield.a > .3 && R.way.yield.k < 1 && R.way.hide.a < .05 && R.way.apart.every(a => a > .98), `crowded jam: the loud aura keeps full strength, the next makes way (softer, pulled in), a 3rd deep hides, apart all full ${JSON.stringify(R.way)}`);
for (const [t, lb, d01, d05] of R.loop) ok(d01 < .6 && d05 > d01 * 3 + .3, `seamless loop ${t} ${lb ? 'day' : 'night'}: |u0-u1| ${d01}, |u0-u.5| ${d05}`);
for (const c of R.cost) console.log(`     cost 10 rare (${c.label}): ${c.ms} ms/frame  blits ${c.blits} fades ${c.fades} live ${c.live} fallback ${c.fallback} MB ${c.MB} jobs ${c.jobs}`);
ok(R.cost[0].fallback === 0 && R.cost[0].jobs === 0, 'cost run fully baked');
ok(errs.length === 0, `no page errors ${errs.slice(0, 3).join(' | ')}`);
await B.close(); srv.close(); console.log(fail ? `${fail} FAILED` : 'all ok'); process.exit(fail ? 1 : 0);
