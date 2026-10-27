// v0.0.14 gesture conflict check (headless, synthetic touch pointers): two-finger SING (still on an ohm, 0.6 s) and two-finger
// GROUND SHAPING (still on bare ground, 0.6 s, mic listen-only) never trigger each other, nor pinch / zoom / spin / herd call.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) { fails++; if (process.env.DBG) console.log(JSON.stringify(s)); } };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, permissions: ['microphone'] }); const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${port}/?selftest=0`); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const L = window.__ev = []; for (const k of ['sing', 'shape.touch', 'herd.call', 'touch']) JO.events.on(k, ev => L.push({ type: ev.type, kind: ev.kind, on: ev.on, x: ev.x, z: JO.world.cam.z }));
  const c = JO.world.cam; window.__both = 0; setInterval(() => { if (c.shaping && c.zoomGo) window.__both++; }, 5); JO.sim.ohm.body.vx = JO.sim.ohm.body.vy = 0; });
const pe = (type, id, x, y) => pg.evaluate(([type, id, x, y]) => document.getElementById('c').dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 21 })), [type, id, x, y]);
const reset = () => pg.evaluate(() => { window.__ev.length = 0; window.__both = 0; return JO.world.cam.z; });
const evs = () => pg.evaluate(() => ({ ev: window.__ev.slice(), both: window.__both, z: JO.world.cam.z, go: !!JO.world.cam.zoomGo, sing: { active: JO.sing.active, listen: JO.sing.listen } }));
const ohm = () => pg.evaluate(() => { const w = innerWidth, h = innerHeight, R = Math.min(w, h) * .13, o = JO.sim.ohm; return { x: w / 2 + o.body.x * R, y: h * .36 + o.body.y * R, R }; });
const emp = await pg.evaluate(() => { const w = innerWidth, h = innerHeight, R = Math.min(w, h) * .13, far = (x, y) => JO.sim.ohms.every(o => Math.hypot(w / 2 + o.body.x * R - x, h * .36 + o.body.y * R - y) > R * 1.8);
  for (let sy = h * .55; sy < h * .85; sy += 15) for (let sx = 40; sx < w - 120; sx += 15) if (far(sx, sy) && far(sx + 90, sy)) return [sx, sy]; return null; });
ok(!!emp, `found bare ground for two fingers (${emp})`); const [ex, ey] = emp || [60, 600];
const up2 = async (x1, y1, x2, y2) => { await pe('pointerup', 21, x1, y1); await pe('pointerup', 22, x2, y2); await pg.waitForTimeout(400); };
// 1. still on bare ground 0.8 s -> shaping (listen-only mic), no sing event, no zoom
let z0 = await reset(); await pe('pointerdown', 21, ex, ey); await pe('pointerdown', 22, ex + 90, ey); for (let k = 0; k < 8; k++) { await pe('pointermove', 21, ex + (k & 1), ey); await pg.waitForTimeout(100); }
let s = await evs(); const shOn = s.ev.some(e => e.type === 'shape.touch' && e.on && Number.isFinite(e.x));
ok(shOn && !s.ev.some(e => e.type === 'sing') && Math.abs(s.z - z0) < 1e-6, `two still fingers on ground shape it (shape.touch on), no sing, no zoom (z ${s.z.toFixed(3)})`);
ok(!s.sing.active || s.sing.listen, `the ground-shaping mic only listens (active ${s.sing.active}, listen ${s.sing.listen}): no recording, no sung notes, no duck`);
await up2(ex, ey, ex + 90, ey); s = await evs();
ok(s.ev.some(e => e.type === 'shape.touch' && e.on === false) && !s.ev.some(e => e.type === 'touch' && e.kind === 'tap') && !s.ev.some(e => e.type === 'herd.call') && !s.sing.active, 'lifting ends it: mic closed, no tap, no herd call');
// 10. 3 fingers end shaping
await reset(); await pe('pointerdown', 21, ex, ey); await pe('pointerdown', 22, ex + 90, ey); await pg.waitForTimeout(800); await pe('pointerdown', 23, ex + 45, ey - 60); s = await evs();
ok(s.ev.some(e => e.type === 'shape.touch' && e.on === false), 'a third finger ends shaping'); await pe('pointerup', 23, ex + 45, ey - 60); await up2(ex, ey, ex + 90, ey);
// 8. two still fingers on the OHM: sing, never shaping, no zoom
await pg.waitForTimeout(1500); let o = await ohm(); z0 = await reset(); const d = o.R * .35;
await pe('pointerdown', 21, o.x - d, o.y); await pe('pointerdown', 22, o.x + d, o.y); await pg.waitForTimeout(900); s = await evs();
ok(s.ev.some(e => e.type === 'sing' && e.on) && !s.ev.some(e => e.type === 'shape.touch') && Math.abs(s.z - z0) < 1e-6, `two still fingers on the ohm sing (sing on), never shape the ground, no zoom`);
ok(!s.sing.listen, `the sing mic is a real sing (listen ${s.sing.listen}, active ${s.sing.active})`);
await up2(o.x - d, o.y, o.x + d, o.y); await pg.waitForTimeout(1800); await pg.evaluate(() => { if (JO.sing.active) JO.sing.stop(); });
// 9. pinch on the ohm (squeeze) stays a squeeze: no sing, no shaping, no zoom
o = await ohm(); z0 = await reset(); await pe('pointerdown', 21, o.x - d, o.y); await pe('pointerdown', 22, o.x + d, o.y);
for (let k = 1; k <= 6; k++) { await pe('pointermove', 21, o.x - d + k * 3, o.y); await pe('pointermove', 22, o.x + d - k * 3, o.y); await pg.waitForTimeout(20); } await pg.waitForTimeout(700);
s = await evs(); ok(!s.ev.some(e => e.type === 'sing') && !s.ev.some(e => e.type === 'shape.touch') && Math.abs(s.z - z0) < 1e-6, 'a pinch on the ohm squeezes: no sing, no shaping, no zoom');
await up2(o.x, o.y, o.x, o.y);
// 2. shaping, then spread the fingers: shaping ends FIRST, then zoom goes; never both at once
z0 = await reset(); await pe('pointerdown', 21, ex, ey); await pe('pointerdown', 22, ex + 90, ey); await pg.waitForTimeout(800);
for (let k = 1; k <= 12; k++) { await pe('pointermove', 21, ex - k * 3, ey); await pe('pointermove', 22, ex + 90 + k * 3, ey); await pg.waitForTimeout(20); }
s = await evs(); const iOff = s.ev.findIndex(e => e.type === 'shape.touch' && e.on === false);
ok(iOff >= 0 && s.both === 0, `spreading a shaping pair ends the shaping (zoom then takes over, z ${z0.toFixed(2)} -> ${s.z.toFixed(2)}), never both at once (${s.both})`);
await up2(ex, ey, ex + 90, ey); await pg.evaluate(() => { JO.world.cam.z = 0; }); await pg.waitForTimeout(600);
// 3. pinch-zoom first, then hold still: no shaping
z0 = await reset(); await pe('pointerdown', 21, ex, ey); await pe('pointerdown', 22, ex + 90, ey); for (let k = 1; k <= 6; k++) { await pe('pointermove', 21, ex - k * 4, ey); await pe('pointermove', 22, ex + 90 + k * 4, ey); await pg.waitForTimeout(15); }
await pg.waitForTimeout(900); s = await evs(); ok(!s.ev.some(e => e.type === 'shape.touch') && !s.ev.some(e => e.type === 'sing') && s.both === 0, `a zoom that went, then rests, never starts shaping or singing (z ${z0.toFixed(2)} -> ${s.z.toFixed(2)})`);
await up2(ex - 24, ey, ex + 114, ey); await pg.evaluate(() => { JO.world.cam.z = 0; }); await pg.waitForTimeout(600);
// 2b. v0.0.15 (Q5): the spread hands over to zoom STRAIGHT AWAY - the very move that ends shaping already zooms, and with no jump
{ const sp = await pg.evaluate(() => { const w = innerWidth, h = innerHeight, f = JO.zoom.free; for (let sy = h * .55; sy < h * .85; sy += 15) for (let sx = 40; sx < w - 140; sx += 15) if (f(sx, sy) && f(sx + 90, sy) && f(sx + 114, sy) && f(sx, sy - 40) && f(sx + 114, sy - 40)) return [sx, sy]; return null; }) || [ex, ey];   // the ohms + things wander: re-pick bare ground now
z0 = await reset(); const [ex, ey] = sp; await pe('pointerdown', 21, ex, ey); await pe('pointerdown', 22, ex + 90, ey); await pg.waitForTimeout(800);
  { const st = []; for (let k = 1; k <= 6; k++) { await pe('pointermove', 22, ex + 90 + k * 4, ey); st.push(await pg.evaluate(() => ({ sh: JO.world.cam.shaping, go: !!JO.world.cam.zoomGo, z: JO.world.cam.z }))); }
  const i = st.findIndex(q => !q.sh), dz = st.slice(i).map((q, j, a) => j ? q.z - a[j - 1].z : q.z - z0), step = dz.length > 2 ? Math.max(...dz.slice(1)) : 0;
  if (process.env.DBG) console.log(JSON.stringify(st));
  ok(i >= 1 && st[i].go && st[i].z > z0 + 1e-4 && dz[0] <= step * 1.5 + 1e-6, `the move that ends shaping already zooms (move ${i + 1}: z ${z0.toFixed(3)} -> ${st[i].z.toFixed(3)}, first step ${dz[0].toFixed(4)} vs later ${step.toFixed(4)}: no jump)`); }
  s = await evs(); ok(s.both === 0, `still never both at once (${s.both})`);
  await up2(ex, ey, ex + 114, ey); await pg.evaluate(() => { JO.world.cam.z = 0; }); await pg.waitForTimeout(600); }
// 4. a small still-ish spread under zoom's 8% dead zone: still counts as still (shaping), zoom does not go
{ const sp = await pg.evaluate(() => { const w = innerWidth, h = innerHeight, f = JO.zoom.free; for (let sy = h * .55; sy < h * .85; sy += 15) for (let sx = 40; sx < w - 140; sx += 15) if (f(sx, sy) && f(sx + 90, sy) && f(sx + 114, sy) && f(sx, sy - 40) && f(sx + 114, sy - 40)) return [sx, sy]; return null; }) || [ex, ey];   // as in 2b: the ohms + things wander, so re-pick bare ground now
z0 = await reset(); const [ex, ey] = sp; await pe('pointerdown', 21, ex, ey); await pe('pointerdown', 22, ex + 90, ey); await pe('pointermove', 22, ex + 94, ey); await pg.waitForTimeout(800);
s = await evs(); ok(s.ev.some(e => e.type === 'shape.touch' && e.on) && !s.go && Math.abs(s.z - z0) < 2e-3, 'a tiny wobble (< 8%) is still: shaping, no zoom (zoom not going; z ' + (s.z - z0).toExponential(1) + ' = the camera still easing from the last step, not a pinch)');
for (let k = 1; k <= 3; k++) { await pe('pointermove', 22, ex + 94 + k * 2, ey); await pg.waitForTimeout(20); }   // 7% then 8.9% spread, each finger < 14 px
s = await evs(); ok(s.ev.some(e => e.type === 'shape.touch' && e.on === false) && s.both === 0, 'a spread past zoom\'s 8% ends shaping before zoom can go (the old overlap)');
await up2(ex, ey, ex + 100, ey); await pg.evaluate(() => { JO.world.cam.z = 0; }); await pg.waitForTimeout(600); }
// 5. twist / spin a shaping pair: ends shaping
await reset(); await pe('pointerdown', 21, ex, ey); await pe('pointerdown', 22, ex + 90, ey); await pg.waitForTimeout(800);
for (let k = 1; k <= 8; k++) { const a = k * .08; await pe('pointermove', 21, ex + 45 - 45 * Math.cos(a), ey - 45 * Math.sin(a)); await pe('pointermove', 22, ex + 45 + 45 * Math.cos(a), ey + 45 * Math.sin(a)); await pg.waitForTimeout(20); }
s = await evs(); ok(s.ev.some(e => e.type === 'shape.touch' && e.on === false) && s.both === 0, 'twisting (spin) a shaping pair ends the shaping');
await up2(ex, ey, ex + 90, ey); await pg.evaluate(() => { JO.world.cam.z = 0; }); await pg.waitForTimeout(600);
// 6. two quick two-finger taps on ground: no tap, no herd call
await reset(); for (let r = 0; r < 2; r++) { await pe('pointerdown', 21, ex, ey); await pe('pointerdown', 22, ex + 90, ey); await pg.waitForTimeout(60); await pe('pointerup', 21, ex, ey); await pe('pointerup', 22, ex + 90, ey); await pg.waitForTimeout(150); }
await pg.waitForTimeout(400); s = await evs(); ok(!s.ev.some(e => e.type === 'herd.call') && !s.ev.some(e => e.type === 'touch' && e.kind === 'tap') && !s.ev.some(e => e.type === 'shape.touch'), 'two quick two-finger ground taps: no tap, no herd call (was: the last finger up tapped)');
// 7. one-finger double tap still calls the herd
await reset(); for (let r = 0; r < 2; r++) { await pe('pointerdown', 21, ex, ey); await pg.waitForTimeout(40); await pe('pointerup', 21, ex, ey); await pg.waitForTimeout(120); }
await pg.waitForTimeout(400); s = await evs(); ok(s.ev.some(e => e.type === 'herd.call'), 'a one-finger double tap still calls the herd');
ok(errs.length === 0, `no page errors (${errs.slice(0, 3).join(' | ')})`);
await b.close(); srv.close(); console.log(fails ? 'GESTURE_FAIL ' + fails : 'GESTURE_OK'); process.exit(fails ? 1 : 0);
