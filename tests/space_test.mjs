// v0.0.11 space (world track): star system + landing, browser test
// headless smoke: page loads without errors, audio worklet runs, tap / hold / node gestures emit events and voices,
// short self-test completes, box-side frame + worklet timings. No screenshots, no audio capture.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2 });
const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
// v0.0.11 SPACE (world track, terrain step 2): star system, whole-bar orbits, per-planet seeds, Q41 lean, Q300 drift, 12b count, landing, sleeping ohms, chord, cost
await pg.goto(`http://127.0.0.1:${port}/?autostart`); await pg.waitForTimeout(1500);
await pg.evaluate(() => { localStorage.setItem('jo.devOpen', '0'); const d = document.getElementById('dev'); if (d) d.style.display = 'none'; });
const A = await pg.evaluate(() => { const W = JO.world, S = W.system, m = JO.music, MU = [2, 3, 4, 6, 8, 12, 16, 24], q = { x: 0, y: 0 }, r = { x: 0, y: 0 }, t = m.now();
  const per = S.planets.map(p => { S.pos(p, t, q); S.pos(p, m.timeOfBeat(m.beat(t) + 4 * p.mult), r); return Math.hypot(q.x - r.x, q.y - r.y) < 1e-6 * p.a + 1e-6; });
  const L1 = S.layerOf(S.planets[1]);
  return { n: S.planets.length, mults: S.planets.map(p => p.mult), whole: S.planets.every(p => MU.includes(p.mult)), per, slots: new Set(S.planets.map(p => p.slot)).size,
    homeSeed: S.planets[0].seed === W.seed, homeL: S.layerOf(S.planets[0]) === W.home, own: S.planets.map(p => [p.C, p.raw.toFixed(1), p.tr.toFixed(2)].join('/')),
    diffL: L1 !== W.home && L1.freqs.join() !== W.home.freqs.join(), aOrder: S.planets.slice().sort((a, b) => a.slot - b.slot).every((p, i, a) => !i || a[i - 1].a < p.a) }; });
ok(A.n >= 2 && A.n <= 6, `12b default: ${A.n} planets in 2..6 by seed`);
ok(A.whole && A.per.every(Boolean), `every orbit is a whole number of bars and returns exactly (${A.mults})`);
ok(A.slots === A.n && A.aOrder, 'one planet per orbit, Kepler spacing (longer period = further out)');
ok(A.homeSeed && A.homeL, 'home planet = v0.0.9 world (same seed, same layer)');
ok(A.diffL && new Set(A.own).size === A.n, `each planet its own seed: size/hum note/tempo differ ${A.own.join(' ')}`);
const Q = await pg.evaluate(() => { const S = JO.world.system, p = S.planets[1], o = S.opts.lean; S.opts.lean = 0; const n0 = S.noteOf(p); S.opts.lean = 1; p.sum.heal = 1; JO.world.planet.busy = 0; const nc = S.noteOf(p), lc = p.lean; JO.world.planet.busy = 1; p.sum.heal = 0; S.noteOf(p); const lb = p.lean; S.opts.lean = o; S.noteOf(p); return { n0, raw: p.raw, nc, lc, lb, om: S.om0 }; });
const ov = f => { let d = 9; for (let h = 1; h <= 8; h++) { let o = Q.om * h; while (o >= 96) o /= 2; while (o < 48) o *= 2; d = Math.min(d, Math.abs(Math.log2(o / f))); } return d; };
ok(Math.abs(Q.n0 - Q.raw) < 1e-9, 'Q41 lean 0 allowed: note stays its own');
ok(Q.lc > Q.lb && Q.lc <= .8 + 1e-9 && ov(Q.nc) <= ov(Q.raw) + 1e-9, `Q41 lean by context: calm/healed ${Q.lc.toFixed(2)} > busy ${Q.lb.toFixed(2)} (a leaning toward an om overtone)`);
// space: view + chord + cost
await pg.evaluate(() => { JO.world.setZoom(-3); JO.world.cam.lockZ = true; JO.render.spaceMs = 0; }); await pg.waitForTimeout(2500);
const B = await pg.evaluate(() => ({ amt: JO.world.system.spaceAmt, ms: JO.render.spaceMs, sus: [105, 106, 107, 108].filter(id => (JO.sound.sustains.get(id) || []).length || (JO.sound.sustains.get(id + 4) || []).length).length, om: JO.music.om }));
ok(B.amt > .95, 'pinch out past the planet = space');
ok(B.sus >= Math.min(2, A.n), `5b space chord: ${B.sus} soft voices on the planets' notes`);
ok(B.ms < .6, `space draw ${B.ms.toFixed(3)} ms (gate 0.6)`);
// v0.0.12 fix 1: in deep space one-finger taps / drags do no ground gesture and grab no ohm (they used to hit the unshifted ohms)
{ const G = await pg.evaluate(async () => { let n = 0; let live = true, kinds = []; JO.events.on('touch', ev => { if (live) { n++; kinds.push(ev.kind); } }); const off = () => { live = false; }; const o = JO.sim.ohm, ids = JO.sim.ohms.map(q => q.id); let grabbed = 0;
    for (const [x, y] of [[206, 700], [140, 720], [270, 720], [206, 560], [100, 640], [320, 640]]) { const el = document.elementFromPoint(x, y) || document.body;
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 31, clientX: x, clientY: y, bubbles: true, isPrimary: true, pointerType: 'touch' }));
      el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 31, clientX: x + 30, clientY: y - 20, bubbles: true, isPrimary: true, pointerType: 'touch' }));
      for (const id of ids) { const sg = JO.sim.sig[id]; if (sg && sg['in.grabX'] != null) grabbed++; }
      el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 31, clientX: x + 30, clientY: y - 20, bubbles: true, isPrimary: true, pointerType: 'touch' })); }
    if (typeof off === 'function') off(); return { n, grabbed, z: JO.world.cam.z, kinds: kinds.join() }; });
  ok(G.n === 0 && G.grabbed === 0, `deep space: one-finger taps/drags make no ground gesture (${G.n}) and grab no ohm (${G.grabbed}) at z ${G.z.toFixed(1)} ${G.kinds}`); }
// landing by a real two-finger pinch centred on planet 1
const P1 = await pg.evaluate(() => { const S = JO.world.system, m = JO.music, q = { x: 0, y: 0 }; S.view(innerWidth, innerHeight, { x: innerWidth / 2, y: innerHeight * .36 }, m.now()); S.pos(S.planets[1], m.now(), q); S.screen(q.x, q.y, q); JO.world.cam.lockZ = false; return q; });
const cx = Math.max(60, Math.min(352, P1.x)), cy = Math.max(60, Math.min(800, P1.y));
const fire = async (type, id, x, y) => pg.evaluate(([type, id, x, y]) => { (document.elementFromPoint(x, y) || document.body).dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, isPrimary: id === 11, pointerType: 'touch' })); }, [type, id, x, y]);
await fire('pointerdown', 11, cx - 20, cy); await fire('pointerdown', 12, cx + 20, cy);
for (let i = 1; i <= 40; i++) { const d = 20 * Math.pow(1.09, i); await fire('pointermove', 11, cx - d, cy); await fire('pointermove', 12, cx + d, cy); await pg.waitForTimeout(16); }
const C0 = await pg.evaluate(() => ({ z: JO.world.cam.z, cur: JO.world.system.cur, tg: JO.world.system.target, om: JO.music.om, note: JO.world.system.planets[1].note, away: JO.sim.ohms.filter(o => o.away).length, parkedAway: JO.sim.ohms.filter(o => o.away && !o.parked).length, focus: JO.sim.ohm.away }));
await fire('pointerup', 11, cx, cy); await fire('pointerup', 12, cx, cy);
ok(C0.cur === 1, `pinch in on a planet lands on it (cur ${C0.cur}, z ${C0.z.toFixed(2)})`);
ok(!C0.focus && C0.parkedAway === 0, `your ohm travels; ${C0.away} ohms left behind sleep (parked)`);
const D = await pg.evaluate(async () => { const m = JO.music; const t0 = m.now(); while (Math.abs(m.om - JO.world.home.om) > .02 && m.now() - t0 < 20) await new Promise(r => setTimeout(r, 50)); const tb = m.beat(); return { om: m.om, home: JO.world.home.om, bar: tb / 4 - Math.floor(tb / 4) }; });
ok(Math.abs(D.om - D.home) < .02 && (D.bar < .2 || D.bar > .97), `home note lands on a bar line (om ${D.om.toFixed(2)}, bar phase ${D.bar.toFixed(2)})`);
const E = await pg.evaluate(() => { const S = JO.world.system; S.opts.nMin = S.opts.nMax = 3; JO.world.land(0); S.build(); const n = S.planets.length; const tr = S.planets.map(p => p.tr); S.opts.q300 = 'fixed'; for (const p of S.planets) p.sum.jam = 1, p.sum.heal = 1; return { n, tr }; });
await pg.waitForTimeout(2500);
const F = await pg.evaluate(() => ({ tr: JO.world.system.planets.map(p => p.tr), away: JO.sim.ohms.filter(o => o.away).length }));
ok(E.n === 3, '12b toggle: count follows the sliders');
ok(F.tr.every((v, i) => v === E.tr[i]) && F.away === 0, 'Q300 fixed: tempos stay put; back home nobody sleeps');
await pg.evaluate(() => { const S = JO.world.system; S.opts.q300 = 'A'; for (const p of S.planets) p.sum.jam = 1, p.sum.heal = 1; }); await pg.waitForTimeout(2500);
const G = await pg.evaluate(() => JO.world.system.planets.map(p => p.tr));
const sp = a => Math.max(...a) - Math.min(...a);
ok(sp(G) < sp(E.tr) || sp(E.tr) < 1e-6, `Q300 A: jamming neighbours drift together (spread ${sp(E.tr).toFixed(3)} -> ${sp(G).toFixed(3)})`);
ok(!errs.length, 'no page errors ' + errs.join(' | '));
console.log(fails ? 'SPACE_FAIL' : 'SPACE_OK'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
