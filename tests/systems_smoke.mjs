// SYSTEMS headless boot: the page boots with the systems wiring and no errors, saves, relaunches into the same world (same ohms,
// same songs, same beat region), ?fresh=1 starts fresh, and the systems per-tick cost at a normal ohm count. No screenshots.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e) + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const U = `http://127.0.0.1:${port}/`;
await pg.goto(U + '?fresh=1'); await pg.waitForFunction(() => globalThis.JO && JO.systems, null, { timeout: 15000 }); await pg.waitForTimeout(4000);
const a = await pg.evaluate(() => { const S = JO.systems, t = []; for (let k = 0; k < 20; k++) { const t0 = performance.now(); for (let i = 0; i < 50; i++) S.tick(.025); t.push((performance.now() - t0) / 50); } t.sort((x, y) => x - y);
  const d0 = performance.now(); for (let i = 0; i < 60; i++) S.draw(); const dr = (performance.now() - d0) / 60;
  JO.persist.save('test'); return { n: JO.sim.ohms.filter(o => o.scale === 'ohm').length, ids: JO.sim.ohms.filter(o => o.scale === 'ohm').map(o => o.id + ':' + o.seed).sort().join(','), seed: JO.world.seed, beat: JO.music.beat(), med: t[10], p95: t[19], draw: dr, bytes: JO.persist.bytes, err: JO.systems.err || null, perr: JO.persist.err, plants: JO.systems.plants.list.length, ctl: JO.ctl.ms, bank: JO.systems.bank.harmony }; });
console.log(JSON.stringify(a));
ok(a.n >= 7, 'boots with ' + a.n + ' ohms'); ok(!a.err && !a.perr, 'systems / persist run without errors ' + (a.err || '') + (a.perr || '')); ok(a.bytes > 0, 'saved ' + (a.bytes / 1024).toFixed(1) + ' kB'); ok(a.plants > 0, 'plants sown');
ok(a.med < 1, 'systems tick median ' + a.med.toFixed(3) + ' ms, max-of-20-batches ' + a.p95.toFixed(3) + ' ms (normal ohm count; sim budget 5 ms)'); ok(a.draw < 4, 'systems overlay draw ' + a.draw.toFixed(2) + ' ms');
// gestures, synthetic pointers on the canvas: spiral = a new ohm, 3-finger tap = undo it, 4-finger tap = redo, twist = river, 3-finger 2 s hold = dev panel
const g = await pg.evaluate(async () => { const S = JO.systems, c = document.getElementById('c'), sl = ms => new Promise(r => setTimeout(r, ms)), n = () => JO.sim.ohms.filter(o => o.scale === 'ohm' && !o.dead && !o.parked).length;
  let fx = 0, fy = 0; for (let y = 120; y < 700 && !fx; y += 20) for (let x = 120; x < 300; x += 20) { let clear = true; for (let a = 0; a < 6.3; a += .5) if (!S.free(x + Math.cos(a) * 90, y + Math.sin(a) * 90)) clear = false; if (clear) { fx = x; fy = y; break; } }
  const ev = (type, id, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 1, pressure: .5 }));
  const out = { at: [fx, fy], n0: n() }; ev('pointerdown', 1, fx, fy); for (let i = 1; i <= 60; i++) { const a = i * .2, r = 6 + i * 1.1; ev('pointermove', 1, fx + Math.cos(a) * r, fy + Math.sin(a) * r); await sl(8); } ev('pointerup', 1, fx + Math.cos(12) * 72, fy + Math.sin(12) * 72); await sl(150);
  out.n1 = n(); const tap = async k => { for (let i = 0; i < k; i++) ev('pointerdown', 10 + i, fx - 60 + i * 40, fy); await sl(80); for (let i = 0; i < k; i++) ev('pointerup', 10 + i, fx - 60 + i * 40, fy); await sl(150); };
  await tap(3); out.n2 = n(); await tap(4); out.n3 = n();
  ev('pointerdown', 20, fx - 50, fy); ev('pointerdown', 21, fx + 50, fy); for (let i = 1; i <= 20; i++) { const a = i * .08; ev('pointermove', 20, fx - 50 * Math.cos(a), fy - 50 * Math.sin(a)); ev('pointermove', 21, fx + 50 * Math.cos(a), fy + 50 * Math.sin(a)); await sl(10); } ev('pointerup', 20, fx, fy); ev('pointerup', 21, fx, fy); await sl(100); out.daw = !!S.daw.open; S.daw.show && S.daw.show(false); if (S.daw.open) S.daw.open = false;
  const p0 = JO.panel && JO.panel.isOpen ? JO.panel.isOpen() : null; for (let i = 0; i < 3; i++) ev('pointerdown', 30 + i, fx - 60 + i * 40, fy + 40); await sl(2300); out.panel = JO.panel && JO.panel.isOpen ? JO.panel.isOpen() !== p0 : 'n/a'; for (let i = 0; i < 3; i++) ev('pointerup', 30 + i, fx, fy);
  return out; });
console.log(JSON.stringify(g));
// teach line (just outside A -> onto B) and a flick (quick swipe from an ohm), synthetic pointers; soft body cost while one is squished
const tf = await pg.evaluate(async () => { const S = JO.systems, sim = JO.sim, c = document.getElementById('c'), sl = ms => new Promise(r => setTimeout(r, ms)), out = {};
  const ev = (type, id, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, pressure: .5 }));
  const live = sim.ohms.filter(o => o.scale === 'ohm' && !o.dead && !o.parked && o.g), at = o => S.toS(o.body.x, o.body.y), R = o => Math.max(36, o.g.r * at(o).s * 1.15);
  let pair = null; for (const A of live) for (const B of live) { if (A === B || pair) continue; const a = at(A), b = at(B), d = Math.hypot(b.x - a.x, b.y - a.y); if (d < R(A) + R(B) + 60 || d > 380) continue;
    const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d, sx = a.x - ux * (R(A) + 15), sy = a.y - uy * (R(A) + 15); if (sx < 10 || sy < 10 || sx > innerWidth - 10 || sy > innerHeight - 10 || S.ohmAt(sx, sy)) continue; pair = { A, B, sx, sy, b }; }
  if (pair) { const { A, B, sx, sy, b } = pair, t0 = S.teach.taught; out.RA = R(A); ev('pointerdown', 41, sx, sy); for (let i = 1; i <= 24; i++) { ev('pointermove', 41, sx + (b.x - sx) * i / 24, sy + (b.y - sy) * i / 24); await sl(12); } ev('pointerup', 41, b.x, b.y); await sl(80);
    out.taught = S.teach.taught - t0; out.toB = !!B.epi; out.n = sim.ohms.length; } else out.taught = 'no pair';
  const F = live.find(o => { const a = at(o); return a.x > 80 && a.x < innerWidth - 80 && a.y > 120; }); if (F) { const a = at(F), f0 = S.soft.flicks; ev('pointerdown', 42, a.x, a.y); for (let i = 1; i <= 5; i++) { ev('pointermove', 42, a.x + i * 16, a.y - i * 10); await sl(16); } ev('pointerup', 42, a.x + 80, a.y - 50); await sl(50);
    out.flicked = S.soft.flicks - f0; out.flying = !!F.body.flying; out.vx = F.body.vx; }
  // squish: hold an ohm 2 units below the ground, run ticks, time the soft pass
  const H = live[1]; JO.sim.sig[H.id]['in.grabX'] = H.body.x; JO.sim.sig[H.id]['in.grabY'] = JO.sim.groundAt(H.body.x) + 1; S.soft.tick(); const t1 = performance.now(); for (let i = 0; i < 200; i++) S.soft.tick(); out.softMs = (performance.now() - t1) / 200; out.squish = S.soft.squish;
  JO.sim.sig[H.id]['in.grabX'] = NaN; JO.sim.sig[H.id]['in.grabY'] = NaN; return out; });
console.log(JSON.stringify(tf));
ok(tf.taught === 1 && tf.toB, 'a line from just outside one ohm onto another = a lesson (teach.js)'); ok(tf.flicked === 1, 'a quick swipe from an ohm flicks it (vx ' + (tf.vx || 0).toFixed(1) + ')');
ok(tf.squish > .2, 'an ohm held into the ground squishes (' + (tf.squish || 0).toFixed(2) + ')'); ok(tf.softMs < .5, 'soft body pass ' + (tf.softMs || 0).toFixed(3) + ' ms (normal ohm count)');
const a2 = await pg.evaluate(() => { JO.persist.save('test2'); return { ids: JO.sim.ohms.filter(o => o.scale === 'ohm').map(o => o.id + ':' + o.seed).sort().join(','), beat: JO.music.beat() }; }); a.ids = a2.ids; a.beat = a2.beat;
ok(g.n1 === g.n0 + 1, 'spiral on bare ground spawns an ohm (' + g.n0 + ' -> ' + g.n1 + ')'); ok(g.n2 === g.n0, '3-finger tap undoes it'); ok(g.n3 === g.n1, '4-finger tap redoes it'); ok(g.daw, 'two-finger twist opens the river'); ok(g.panel === true, '3 fingers held 2 s toggles the dev panel');
await pg.goto(U); await pg.waitForFunction(() => globalThis.JO && JO.systems, null, { timeout: 15000 }); await pg.waitForTimeout(500);
const r = await pg.evaluate(() => ({ ids: JO.sim.ohms.filter(o => o.scale === 'ohm').map(o => o.id + ':' + o.seed).sort().join(','), seed: JO.world.seed, beat: JO.music.beat(), away: JO.persist.away, err: JO.persist.err }));
console.log(JSON.stringify(r));
ok(r.ids === a.ids, 'relaunch: the same ohms (ids + seeds)'); ok(r.seed === a.seed, 'relaunch: the same world seed'); ok(r.beat >= a.beat - .01 && r.beat < a.beat + 16, 'relaunch: the music picks up where it was (beat ' + a.beat.toFixed(1) + ' -> ' + r.beat.toFixed(1) + ')'); ok(!r.err, 'restore without errors ' + (r.err || ''));
await pg.goto(U + '?fresh=1'); await pg.waitForFunction(() => globalThis.JO && JO.systems, null, { timeout: 15000 });
const f = await pg.evaluate(() => JO.music.beat()); ok(f < a.beat, '?fresh=1 starts fresh');
ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
await b.close(); srv.close(); console.log(fails ? 'SYSTEMS SMOKE FAIL ' + fails : 'SYSTEMS SMOKE OK'); process.exit(fails ? 1 : 0);
