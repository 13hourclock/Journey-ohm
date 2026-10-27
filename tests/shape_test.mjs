// v0.0.13 changeable ground (shape.js): the music raises / settles / heals the ground through clock events, budgets hold,
// far chunks sleep and catch up, what repeats lasts and one-offs fade, the place's leanings follow the changed ground.
import { createShape } from '../www/js/shape.js';
import { makeTerrain } from '../www/js/terrain.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const hash = (a, b) => { let h = Math.imul((a ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ Math.imul((b + 0x632be5ab) >>> 0, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; };
const mk = () => { let t = 0; const subs = {}, evs = [];
  const music = { now: () => t, beat: (x = t) => x / .5, spb: () => .5, timeOfBeat: b => b * .5, nextBeat: () => Math.ceil(t / .5 + 1e-9) * .5, hz: (d, oct = 0) => { const sm = [0, 2, 4, 5, 7, 9, 11], o = Math.floor(d / 7), k = ((d % 7) + 7) % 7; return 220 * Math.pow(2, (sm[k] + 12 * o) / 12 + oct); }, jam: null, chord: { root: 0 }, key: 0 };
  const bus = { note: ev => bus.post(Object.assign({ type: 'note' }, ev)), on: (k, f) => (subs[k] || (subs[k] = [])).push(f), post: ev => { if (ev.t == null) ev.t = t; evs.push(ev); for (const f of subs[ev.type] || []) f(ev); return ev; } };
  const o = { id: 11, seed: 5, scale: 'ohm', body: { x: 1 } }, sim = { sig: { 11: { 'sound.level': 0 } }, ohms: [o], add: v => v };
  const W = { opts: {}, planet: { C: 4 }, home: { depth: 0, seed: 77, C: 4 }, place: {}, uOf: x => x }, glob = {};
  const S = createShape(W, sim, bus, music, hash, (k, v) => { glob[k] = v; });
  const run = (sec, u = 1, fps = 30) => { for (let k = 0; k < sec * fps; k++) { t += 1 / fps; S.tick(t, u, true); } };
  sim._bus = bus; return { S, W, sim, music, o, evs, run, glob, setLevel: v => { sim.sig[11]['sound.level'] = v; } }; };
{ const E = mk(); E.setLevel(.6); E.run(8); const P = E.S.cur;   // 8 s = 4 bars of a loud ohm at u = 1
  const near = E.S.at(P, 1), far = E.S.at(P, 3);
  ok(Math.abs(near) > .02 && Math.abs(far) < 1e-6, `a loud ohm changes the ground near it (${near.toFixed(3)}) and nowhere far (${far.toExponential(1)})`);
  const ch = E.evs.filter(e => e.type === 'terrain.change'); ok(ch.length >= 3 && ch.every(e => Math.abs(E.music.beat(e.t) / 4 - Math.round(E.music.beat(e.t) / 4)) < .02), `changes are events on the bar line (${ch.length})`);
  ok(E.S.written <= E.S.budget, `per-frame write budget holds (${E.S.written}/${E.S.budget})`);
  ok(E.glob['ground.raised'] != null && E.glob['ground.fresh'] != null && E.glob['place.season'] != null, 'matrix sources ground.raised / ground.fresh / place.season / place.weather posted');
  // quiet: a one-off fades (T2 A)
  E.setLevel(0); E.run(120); const after = E.S.at(P, 1); ok(Math.abs(after) < Math.abs(near) * .35, `quiet lets a few bars settle (${near.toFixed(3)} -> ${after.toFixed(3)})`); }
{ const E = mk(); E.setLevel(.7); E.run(60); const P = E.S.cur, v0 = E.S.at(P, 1); E.setLevel(0); E.run(120); const v1 = E.S.at(P, 1);
  let lift = 0; for (let i = 0; i < P.n; i++) lift = Math.max(lift, Math.abs(P.lift[i]));
  ok(lift > .02 && Math.abs(v1) > Math.abs(v0) * .3, `what repeats lasts (lift ${lift.toFixed(3)}, ${v0.toFixed(3)} -> ${v1.toFixed(3)} after a quiet minute)`); }
{ const E = mk(); E.W.opts.shape.T2 = 'C'; E.setLevel(.7); E.run(60); const v0 = Math.abs(E.S.at(E.S.cur, 1)); E.setLevel(0); E.run(240); ok(Math.abs(E.S.at(E.S.cur, 1)) < v0 * .3, 'T2 C: everything fades back to the seed'); }
{ const E = mk(); E.W.opts.shape.T5 = 'off'; E.setLevel(.6); E.run(8); ok(E.S.at(E.S.cur, 1) > 0, 'T5 off: ohms just raise'); }
// T5 A: genes lean an ohm to dig or pile (continuous, no roles)
{ const signs = new Set(); for (let sd = 1; sd < 40; sd++) { const E = mk(); E.o.seed = sd; E.setLevel(.6); E.run(14); signs.add(Math.sign(E.S.at(E.S.cur, 1))); } ok(signs.has(1) && signs.has(-1), 'T5 A: some ohms dig hollows, some pile (by genes)'); }
// heal: tension resolving smooths the ground
{ const E = mk(); E.W.opts.shape.T5 = 'off'; E.W.opts.shape.T4 = 'off'; E.setLevel(.8); E.run(30); const P = E.S.cur; E.setLevel(0);
  const rough = () => { let g = 0; for (let i = 0; i < P.n; i++) g += Math.abs(P.h[i + 1] - P.h[i]); return g; };
  E.music.chord.root = 6; E.run(4); const r0 = rough(); E.music.chord.root = 0; E.run(4.2); const r1 = rough();
  E.W.opts.shape.T3 = 'off'; const E2 = mk(); E2.W.opts.shape.T5 = 'off'; E2.W.opts.shape.T4 = 'off'; E2.W.opts.shape.T3 = 'off'; E2.setLevel(.8); E2.run(30); E2.setLevel(0); E2.music.chord.root = 6; E2.run(4); const P2 = E2.S.cur;
  let a = 0; for (let i = 0; i < P2.n; i++) a += Math.abs(P2.h[i + 1] - P2.h[i]); E2.music.chord.root = 0; E2.run(4.2); let b = 0; for (let i = 0; i < P2.n; i++) b += Math.abs(P2.h[i + 1] - P2.h[i]);
  ok(r1 / r0 < (b / a) - .02, `heals smooth the ground (${(r1 / r0).toFixed(3)} vs ${(b / a).toFixed(3)} without heals)`); ok(E.S.lushAt(P, 1) > .02, `heals green it (lush ${E.S.lushAt(P, 1).toFixed(3)})`); }
// sleep: far chunks do not tick; they catch up when you come back
{ const E = mk(); E.setLevel(.6); E.run(8); const P = E.S.cur, ci = 2, cb = P.cbar[ci]; E.setLevel(0); E.run(30, 3); ok(P.cbar[ci] === cb && E.S.awake <= 6, `far chunks sleep (${E.S.awake}/${P.nc} awake)`);
  const v0 = E.S.at(P, 1); E.run(2.1, 1); ok(Math.abs(E.S.at(P, 1)) < Math.abs(v0), 'and catch up (settle) when you come back'); }
// regions follow the ground: extra roughness darkens, lushness brightens, continuously
{ const T = makeTerrain(4242, { hue: 100, rough: .5 }, 5), a = {}, b = {}, c = {}; T.at(1, a); T.at(1, b, .5, .3, 0); T.at(1, c, .5, 0, .3);
  ok(b.rough > a.rough && b.bright < a.bright && c.bright > a.bright, `leanings follow the changed ground (bright ${a.bright.toFixed(2)} -> rough ${b.bright.toFixed(2)} / lush ${c.bright.toFixed(2)})`); }
// cost: a busy bar's tick + 60 frames of growth stays small
{ const E = mk(); for (let k = 0; k < 12; k++) E.sim.ohms.push({ id: 100 + k, seed: k, scale: 'ohm', body: { x: .6 + k * .07 } }), E.sim.sig[100 + k] = { 'sound.level': .5 };
  E.setLevel(.6); E.run(2); const a = performance.now(); E.run(20); const ms = (performance.now() - a) / 600; ok(ms < .05, `cost per frame with 13 loud ohms: ${(ms * 1000).toFixed(1)} us`); }
// ---- v0.0.14 solid ground, crack on a huge swell, crater that stays ----
const crackRun = (E, quiet = .1, bars = 16) => { E.setLevel(quiet); E.run(bars * 2); E.setLevel(.9); E.run(6); };
{ const E = mk(); E.music.chord = { root: 3, tones: [3, 5, 7] }; crackRun(E); const cr = E.evs.filter(e => e.type === 'terrain.crack');
  ok(cr.length === 1, `a huge sustained swell (vs this jam's own loudness) cracks the ground once (${cr.length}, z ${cr[0] ? cr[0].z.toFixed(1) : '-'})`);
  const k = cr[0] || {}; ok([3, 5, 7].includes(k.deg), `the crack rings a tone of the CURRENT chord (deg ${k.deg} in 3/5/7)`);
  const ring = E.evs.find(e => e.type === 'note' && e.ring); ok(ring && Math.abs(ring.t / .5 - Math.round(ring.t / .5)) < 1e-6 && ring.deg === k.deg, `it rings on the beat as a world voice (t ${ring ? ring.t.toFixed(2) : '-'})`);
  const P = E.S.cur; ok(P.cracks.length === 1 && P.cracks[0].pts.length >= 1 && E.S.cutAt(P, k.u) > .05 && E.S.cutAt(P, k.u + 1.5) < 1e-6, `the crack cuts into the solid at its line (cut ${E.S.cutAt(P, k.u).toFixed(2)}), nowhere far`);
  ok(E.glob['ground.crack'] > .3 && E.glob['ground.cut'] != null, 'matrix sources ground.cut / ground.crack posted');
  E.music.chord = { root: 4, tones: [4, 6, 8] }; crackRun(E, .1, 12); const cr2 = E.evs.filter(e => e.type === 'terrain.crack'); const d2 = cr2[1] ? cr2[1].deg : null;
  ok(cr2.length === 2 && [4, 6, 8].includes(d2), `a later crack follows the new harmony (deg ${d2} in 4/6/8): no fixed key`); }
{ const E = mk(); E.setLevel(.5); E.run(60); ok(!E.evs.some(e => e.type === 'terrain.crack'), 'a steady loud jam never cracks (loud for THIS jam, not loud in absolute)'); }
{ const E = mk(); E.setLevel(.02); E.run(30); E.setLevel(.1); E.run(6); ok(!E.evs.some(e => e.type === 'terrain.crack'), 'a quiet jam rising a bit does not crack (absolute floor)'); }
{ const E = mk(); E.W.opts.shape.T6 = 'off'; crackRun(E); ok(!E.evs.some(e => e.type === 'terrain.crack'), 'T6 off: no cracks'); }
{ const E = mk(); E.W.opts.shape.crackZ = 4; E.setLevel(.3); E.run(32); E.setLevel(.45); E.run(6); const a = E.evs.filter(e => e.type === 'terrain.crack').length;
  const F = mk(); F.W.opts.shape.crackZ = 1; F.setLevel(.3); F.run(32); F.setLevel(.45); F.run(6); const b = F.evs.filter(e => e.type === 'terrain.crack').length; ok(a === 0 && b === 1, `crack sensitivity slider (z 4: ${a}, z 1: ${b})`); }
const hits = (E, n, vel = .95) => { for (let i = 0; i < n; i++) E.sim._bus.post({ type: 'note', src: E.o, kind: 'strike', vel, impact: vel }); };
const craterRun = (E, bars = 5, per = 3) => { E.setLevel(.3); E.run(.1); for (let i = 0; i < 12; i++) hits(E, 1, .4); for (let b = 0; b < bars; b++) { hits(E, per); E.run(2); } };
{ const E = mk(); craterRun(E); const cr = E.evs.filter(e => e.type === 'terrain.crater'); ok(cr.length >= 1, `sustained very strong hits on one spot leave a crater (${cr.length})`);
  E.run(4); const P = E.S.cur, u = cr[0] ? cr[0].u : 1, h0 = E.S.at(P, u), c0 = E.S.cutAt(P, u); ok(h0 < -.02 && c0 > .05, `the crater is a bowl (${h0.toFixed(3)}) cut into the solid (${c0.toFixed(2)})`);
  E.setLevel(0); E.run(240); const h1 = E.S.at(P, u), c1 = E.S.cutAt(P, u); ok(h1 < h0 * .7 && c1 > c0 * .7, `the crater stays through 2 quiet minutes (T2 A: ${h0.toFixed(3)} -> ${h1.toFixed(3)}, cut ${c0.toFixed(2)} -> ${c1.toFixed(2)})`);
  for (let i = 0; i < 6; i++) { E.sim._bus.post({ type: 'terrain.change', kind: 'smooth', u, w: .6, amt: .6, t: E.music.now(), dur: 2 }); E.run(4); }
  ok(E.S.cutAt(P, u) < c1 * .85, `harmony (heals) slowly fills it (T2 A: cut ${c1.toFixed(2)} -> ${E.S.cutAt(P, u).toFixed(2)})`); }
{ const E = mk(); E.W.opts.shape.T2 = 'B'; craterRun(E); E.run(4); const P = E.S.cur, u = (E.evs.find(e => e.type === 'terrain.crater') || { u: 1 }).u, c0 = E.S.cutAt(P, u);
  for (let i = 0; i < 6; i++) { E.sim._bus.post({ type: 'terrain.change', kind: 'smooth', u, w: .6, amt: .6, t: E.music.now(), dur: 2 }); E.run(4); }
  ok(c0 > .05 && E.S.cutAt(P, u) >= c0 - 1e-6, `T2 B: craters never heal (${c0.toFixed(2)})`); }
{ const E = mk(); E.setLevel(.3); E.run(.1); for (let i = 0; i < 12; i++) hits(E, 1, .4); hits(E, 3); E.run(2); E.run(10); ok(!E.evs.some(e => e.type === 'terrain.crater'), 'one bar of strong hits is not a crater (sustained only)'); }
{ const E = mk(); E.setLevel(.3); E.run(.1); for (let i = 0; i < 80; i++) hits(E, 1, .8); for (let b = 0; b < 5; b++) { hits(E, 3, .8); E.run(2); } ok(!E.evs.some(e => e.type === 'terrain.crater'), 'hits strong in absolute but normal for this jam do not crater (context)'); }
{ const E = mk(); E.W.opts.shape.T7 = 'off'; craterRun(E); ok(!E.evs.some(e => e.type === 'terrain.crater'), 'T7 off: no craters'); }
{ const E = mk(); crackRun(E); craterRun(E); for (let k = 0; k < 12; k++) E.sim.ohms.push({ id: 100 + k, seed: k, scale: 'ohm', body: { x: .6 + k * .07 } }), E.sim.sig[100 + k] = { 'sound.level': .5 };
  const a = performance.now(); E.run(20); const ms = (performance.now() - a) / 600; ok(ms < .05, `cost per frame with cracks, a crater and 13 loud ohms: ${(ms * 1000).toFixed(1)} us`);
  let q = 0; const b = performance.now(); for (let i = 0; i < 1e5; i++) q += E.S.cutAt(E.S.cur, i * 1e-4); const us = (performance.now() - b) / 1e2; ok(us < .5, `cut lookup ${us.toFixed(3)} us`); }

// ---- v0.0.15 FOLDS: sustained tension builds a pleat, release relaxes it, lasting by T2, genes lean it, context deepens it ----
const tense = (E, sec, root = 6) => { E.music.chord.root = root; const bars = Math.round(sec / 2); for (let b = 0; b < bars; b++) { for (const o of E.sim.ohms) E.sim._bus.post({ type: 'note', src: o, kind: 'sustain' }); E.run(2); } };
{ const E = mk(); E.setLevel(.5); E.run(2); tense(E, 20); const P = E.S.cur, F = P.folds, fe = E.evs.filter(e => e.type === 'terrain.fold');
  ok(F.length >= 1 && F[0].a > .1, `sustained tension builds a fold (${F.length} fold, a ${F[0] && F[0].a.toFixed(3)})`);
  ok(fe.length >= 3 && fe.every(e => Math.abs(E.music.beat(e.t) / 4 - Math.round(E.music.beat(e.t) / 4)) < .02), `folds are events on the bar line (${fe.length})`);
  const f = F[0], c = E.S.at(P, f.u), sideA = E.S.at(P, f.u - f.w * .6), sideB = E.S.at(P, f.u + f.w * .6);
  ok(c > sideA && c > sideB && Math.abs(E.S.foldAt(P, f.u) - f.a) < .02 && Math.abs(P.fold[Math.round(f.u * 64) % P.n] - f.a) < .03, `a crease: the fold line is the ridge (${c.toFixed(3)} vs ${sideA.toFixed(3)} / ${sideB.toFixed(3)}), drawn = its amount`);
  ok(E.glob['ground.fold'] > .1 && E.glob['ground.folding'] >= .5, `matrix ground.fold ${E.glob['ground.fold'].toFixed(2)}, ground.folding ${E.glob['ground.folding'].toFixed(2)} (building)`);
  const a0 = f.a; E.music.chord.root = 0; E.run(2.05); const mid = E.glob['ground.folding']; E.run(8); const a1 = f.a;
  ok(a1 < a0 * .65 && a1 > .005 && mid < .5, `release relaxes it (${a0.toFixed(3)} -> ${a1.toFixed(3)}, folding ${mid.toFixed(2)}), T2 A keeps a part`);
  E.setLevel(0); E.run(120); ok(f.a > .005 && P.folds.includes(f), `the kept part lasts 2 quiet minutes (${f.a.toFixed(3)})`);
  E.S.reset(); ok(!P.folds.length && P.fold.every(v => v === 0), 'reset clears the folds'); }
{ const E = mk(); E.W.opts.shape.T2 = 'B'; E.setLevel(.5); E.run(2); tense(E, 20); const f = E.S.cur.folds[0], a0 = f.a; E.music.chord.root = 0; E.run(10); ok(f.a >= a0 - 1e-6, `T2 B: folds never relax (${a0.toFixed(3)} -> ${f.a.toFixed(3)})`); }
{ const E = mk(); E.W.opts.shape.T2 = 'C'; E.setLevel(.5); E.run(2); tense(E, 20); E.music.chord.root = 0; E.setLevel(0); E.run(240); const F = E.S.cur.folds; ok(!F.length || F.every(f => f.a < .02), 'T2 C: folds fade away'); }
{ const E = mk(); E.setLevel(.6); E.run(2); for (let b = 0; b < 10; b++) { E.sim._bus.post({ type: 'note', src: E.o, kind: 'sustain' }); E.run(2); } ok(!E.S.cur.folds.length, 'loud + held but no tension: no fold'); }
{ const E = mk(); E.W.opts.shape.T9 = 'off'; E.setLevel(.5); E.run(2); tense(E, 20); ok(!E.S.cur.folds.length && !E.evs.some(e => e.type === 'terrain.fold'), 'T9 off: no folds'); }
{ const dirs = [], shs = []; for (let sd = 1; sd < 30; sd++) { const E = mk(); E.o.seed = sd; E.setLevel(.5); E.run(2); tense(E, 8); const f = E.S.cur.folds[0]; if (f) { dirs.push(f.dir); shs.push(f.sh); } }
  const lo = Math.min(...dirs), hi = Math.max(...dirs), distinct = new Set(dirs.map(d => d.toFixed(2))).size;
  ok(dirs.length > 20 && lo < -.3 && hi > .3 && distinct > 15 && Math.max(...shs) - Math.min(...shs) > .5, `genes lean the fold continuously (dir ${lo.toFixed(2)}..${hi.toFixed(2)}, ${distinct} distinct; sharpness spread ${(Math.max(...shs) - Math.min(...shs)).toFixed(2)})`); }
{ const amt = jam => { const E = mk(); E.music.jam = jam; E.setLevel(.5); E.run(2); tense(E, 8); return E.evs.filter(e => e.type === 'terrain.fold' && e.amt > 0).reduce((a, e) => a + e.amt, 0); };
  const a = amt(null), b = amt({}); ok(b > a * 1.2, `context: a jam deepens folds (${a.toFixed(3)} -> ${b.toFixed(3)})`); }
{ const E = mk(); E.setLevel(.5); E.run(2); tense(E, 12); E.sim._bus.post({ type: 'terrain.fold', u: 2.5, w: .2, amt: .3, dir: .5, sh: .8, t: E.music.now(), dur: 2 }); E.run(3);
  const g = E.S.cur.folds.find(f => Math.abs(f.u - 2.5) < .01); ok(g && g.a > .25, 'anything may post terrain.fold (the one way in)');
  for (let k = 0; k < 13; k++) for (const o of E.sim.ohms) E.sim.ohms.push({ id: 300 + k, seed: 40 + k, scale: 'ohm', body: { x: .5 + k * .1 } }), E.sim.sig[300 + k] = { 'sound.level': .5 }, E.sim.ohms.length = Math.min(E.sim.ohms.length, 14);
  const t0 = performance.now(); tense(E, 20); const ms = (performance.now() - t0) / 300; ok(ms < .05 && E.S.cur.folds.length <= 8 && E.S.written <= E.S.budget + 64, `cost per frame while folding with 14 ohms: ${(ms * 1000).toFixed(1)} us, ${E.S.cur.folds.length} folds (<= 8)`); }
// ---- v0.0.15 SINGING TO THE GROUND (T1 A + T10): pitch shapes it every beat; low = wide low rise, high = narrow tall peak ----
const singer = E => { const sg = E.sim.sing = { active: false, listen: false, rms: 0, hzNow: 0, start(o, opt) { this.active = true; this.listen = !!(opt && opt.listen); }, stop() { this.active = false; this.listen = false; } }; return sg; };
const sing = (E, hz, sec, rms = .06) => { const sg = E.sim.sing; sg.rms = rms; sg.hzNow = hz; const n0 = E.evs.length; E.run(sec); return E.evs.slice(n0).filter(e => e.type === 'terrain.change' && e.kind === 'raise' && Math.abs(e.u - 1.5) < 1e-9); };
{ const E = mk(); const sg = singer(E); E.run(.1); E.sim._bus.post({ type: 'shape.touch', on: true, x: 1.5 }); ok(sg.active && sg.listen, 'two resting fingers open a listening mic');
  const lo = sing(E, 110, 4), hi = sing(E, 440, 4);
  ok(lo.length >= 7 && lo.every(e => Math.abs(E.music.beat(e.t) - Math.round(E.music.beat(e.t))) < 1e-6), `singing shapes every beat, on the beat (${lo.length} in 8 beats)`);
  const lw = lo[lo.length - 1].w, hw = hi[hi.length - 1].w, la = lo[lo.length - 1].amt, ha = hi[hi.length - 1].amt;
  ok(lw > hw * 1.8 && ha > la * 1.3, `low voice = wide low rise (w ${lw.toFixed(3)}, amt ${la.toFixed(4)}), high = narrow tall peak (w ${hw.toFixed(3)}, amt ${ha.toFixed(4)})`);
  ok(E.S.at(E.S.cur, 1.5) > .01 && E.glob['ground.sung'] > .1, `the ground rises where you sing (${E.S.at(E.S.cur, 1.5).toFixed(3)}), matrix ground.sung ${E.glob['ground.sung'].toFixed(2)}`);
  sing(E, 220, .5, .001); const q = sing(E, 220, 2, .001); ok(q.length === 0, 'silence (or no pitch) shapes nothing');
  E.sim._bus.post({ type: 'shape.touch', on: false }); ok(!sg.active, 'lifting closes the mic'); const z = sing(E, 220, 2); ok(z.length === 0, 'and the shaping stops'); }
{ const E = mk(); const H = E.W.opts.shape; const lp = Math.log2(233);   // 233 Hz: one semitone above the chord root 220
  H.humH = 0; const raw = E.S.humShape(lp); H.humH = .35; const ld = E.S.humShape(lp), inC = E.S.humShape(Math.log2(220));
  ok(ld.p < raw.p && inC.cons > .99 && ld.cons < inC.cons && inC.lush > 0, `the sung shape leans gently toward the chord (p ${raw.p.toFixed(3)} -> ${ld.p.toFixed(3)}), in the chord = rounder + greener (cons ${inC.cons.toFixed(2)})`);
  E.music.chord.root = 1; const r1 = E.S.humShape(lp); ok(r1.p > raw.p, `it follows the CURRENT chord (chord on degree 2: pulled up instead, p ${r1.p.toFixed(3)})`); E.music.chord.root = 0;
  let maxJ = 0, prev = null; for (let l = 6.6; l < 9; l += .002) { const m = E.S.humShape(l); if (prev) maxJ = Math.max(maxJ, Math.abs(m.w - prev.w), Math.abs(m.amt - prev.amt) / 10); prev = m; }
  ok(maxJ < .004, `continuous in pitch: no jumps anywhere 97-512 Hz (max step ${maxJ.toFixed(4)})`);
  H.T10 = 'C'; const c = E.S.humShape(lp); ok(Math.abs(c.p - raw.p) < 1e-9 && c.lush === 0, 'T10 C: raw pitch, no harmony lean'); }
{ const E = mk(); E.W.opts.shape.T10 = 'B'; singer(E); E.run(.1); E.sim._bus.post({ type: 'shape.touch', on: true, x: 1.5 }); const ev = sing(E, 300, 8); ok(ev.length >= 3 && ev.length <= 5, `T10 B: the v0.0.13 per-bar shaping (${ev.length} in 4 bars)`); }
console.log(fail ? 'SHAPE_FAIL ' + fail : 'SHAPE_OK'); process.exit(fail ? 1 : 0);
