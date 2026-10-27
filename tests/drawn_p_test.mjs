// v0.0.26: V08 section P, the parts checked missing in audits/drawn_instruments_P_check.md (P1 absolute length, P3 voice cap,
// P5 ohms play shapes, P6 ensembles 1-4, P7 melody lean) + bystanders watch a jam (R3.8). Node only; prints DRAWN_P_OK.
import { createMusic } from '../www/js/music.js';
import { createEvents } from '../www/js/events.js';
import { createSim } from '../www/js/sim.js';
import { createThings } from '../www/js/things.js';
import { createShapePlay, techOf } from '../www/js/shapeplay.js';
import { createBystand } from '../www/js/bystand.js';
import { createAutoJam } from '../www/js/autojam.js';
import { createBlend } from '../www/js/blend.js';
import { recipes, voicesFor } from '../www/js/recipe.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
let T = 0; const music = createMusic(() => T), bus = createEvents(music), sim = createSim(music, bus); sim.reseed(5); sim.populate(7, 99);
const notes = []; bus.on('note', e => notes.push(e));
const things = createThings({ sim, bus, music }); let screen = true;
const autojam = createAutoJam(sim, bus, music); sim.opts.autojam.on = false;
const SP = createShapePlay({ sim, bus, music, things, autojam, onScreen: () => screen }); sim.shapeLean = (P, t, n) => SP.borrow(P, t, n);
const step = s => { for (let i = 0; i < s * 50; i++) { T += .02; music.tickGlide(); bus.flush(); things.tick(); SP.tick(); } };
const far = o => { o.body.x = 500 + o.id * 40; o.body.y = 0; o.body.vx = o.body.vy = 0; };
for (const o of sim.ohms) far(o);
const pin = (o, x, y) => { o.body.x = x; o.body.y = y; o.body.vx = o.body.vy = 0; };
// pick ohms whose own instruments strike / pluck / bow / sing (palette row exc) - deterministic seeds
const find = (tech, kind) => { for (let s = 1; s < 4000; s++) { const o = sim.makeOhm(7000 + s, 100 + s); const rec = recipes.get(o.recipe); const tq = techOf(rec); const top = Object.entries(tq).sort((a, b) => b[1] - a[1])[0];
    if (top[0] !== tech || top[1] < .6) continue; return o; } return null; };
const bars = n => step(n * 4 * music.spb());
// ---------- P5 ----------
{ const st = things.make('string', [{ x: -2, y: 0 }, { x: 2, y: 0 }], { seed: 11 }); const o = sim.ohms[5]; pin(o, 0, 1);   /* a kora: it picks */ for (const q of sim.ohms) if (q !== o) far(q);
  let c = null; for (let s = 0; s < 400 && !(c && c.th === st); s++) { o.seed = 3000 + s; c = SP.choose(o); }
  ok(c && c.th === st, `an ohm within 300 px of a string picks it (${c && c.tech}, liking ${c && c.s.toFixed(2)})`);
  const n0 = notes.length; bars(9); const mine = notes.slice(n0).filter(e => e.src === st.src && e.by === o.id);
  ok(mine.length >= 2, `it plays the string on its own (${mine.length} notes, ${SP.stats.decisions} decisions)`);
  const off = mine.map(e => music.beat(e.t)).map(b => Math.abs(b * 2 - Math.round(b * 2))); ok(off.every(x => x < .02), 'every hit lands on the bar grid (8ths)');
  ok(mine.every(e => Math.abs(e.f - st.f) < 1e-6), 'the shape\'s own note (snapped by P2)');
  const dec = new Set(); for (let i = 0; i < 12; i++) { bars(1); if (o.shapeDecB != null) dec.add(o.shapeDecB); } ok([...dec].every(b => b % 4 === 0), 'at most one decision every 4 bars (' + [...dec].join() + ')');
  pin(o, 0, 12); bars(2); const n1 = notes.length; bars(9); ok(!notes.slice(n1).some(e => e.by === o.id), 'beyond 300 px it leaves the string alone');
  pin(o, 0, 1); screen = false; SP.players.clear(); const n2 = notes.length; bars(9); ok(!notes.slice(n2).some(e => e.by === o.id && e.src === st.src), 'off screen: nothing runs'); screen = true;
  SP.opts.on = false; const n3 = notes.length; bars(9); ok(!notes.slice(n3).some(e => e.src === st.src && e.by === o.id), 'switch shapePlay off: ohms leave shapes alone'); SP.opts.on = true;
  // sing to it: a singing ohm's note within 30 cents rings the shape softly
  const p = { o, th: st, tech: 'sing', until: 1e9 }; SP.players.set(o.id, p); const s0 = SP.stats.sung, n4 = notes.length;
  bus.note({ src: o, kind: 'note', f: st.f * 2 * Math.pow(2, 20 / 1200), vel: .5, t: music.now() }); bus.flush();
  const ring = notes.slice(n4).filter(e => e.src === st.src); ok(SP.stats.sung === s0 + 1 && ring.length === 1 && Math.abs(ring[0].vel - .15) < 1e-6, 'sing to it: its note an octave + 20 cents off makes the shape ring back at v .15');
  const s1 = SP.stats.sung; bus.note({ src: o, kind: 'note', f: st.f * Math.pow(2, 60 / 1200), vel: .5, t: music.now() }); bus.flush(); ok(SP.stats.sung === s1, '60 cents off: no ring');
  SP.players.clear(); things.remove(st); far(o); }
// technique comes from the instrument's exciter (palette exc)
{ const a = find('strike'), b = find('pluck'), c = find('bow'); ok(a && b && c, 'the palette gives strikers, pickers and bowers (exc rows)'); }
// ---------- P6 ----------
const sweeps = () => notes.filter(e => e.by === 'sweep');
{ const s0 = sweeps().length; const bs = [0, 1, 2].map(i => things.make('bar', [{ x: -1 - i * .3, y: i * .9 }, { x: 1 + i * .3, y: i * .9 }], { seed: 20 + i })); bars(1);
  const E = SP.ens.find(e => e.kind === 'row'); ok(E && E.members.length === 3, 'three near-parallel bars become a marimba row');
  const ds = E ? E.members.map(m => SP.degOf(m.f)) : []; ok(ds.length === 3 && ds[1] === ds[0] + 1 && ds[2] === ds[1] + 1, 'distinct adjacent degrees, long = low (' + ds.join() + ')');
  ok(E && E.members.every(m => m.rec.modal.tuned && m.rec.modal.tuned[1] === 4), 'tuned-bar ratios [1, 4, 9.9]');
  { const v = voicesFor(E.members[0].rec, { f: E.members[0].f, vel: .5, dur: .8 }); const fs = (v[0] && v[0].modes || []).map(m => m.f); ok(fs.length >= 2 && Math.abs(fs[1] / fs[0] - 4) < .01, 'the bar really rings at 1 : 4 (' + fs.slice(0, 3).map(x => (x / fs[0]).toFixed(2)) + ')'); }
  bars(1); const sw = sweeps().slice(s0); ok(sw.length === 3 && sw[0].f < sw[1].f && sw[1].f < sw[2].f, 'a new row plays one rising sweep (' + sw.length + ' notes)');
  const own = bs[2].fOwn; bs[2].pts = bs[2].pts.map(q => ({ x: q.x + 30, y: q.y })); bs[2].x += 30; bars(1); ok(!SP.ens.some(e => e.kind === 'row') && !bs[2].rec.modal.tuned && Math.abs(bs[2].f - own) < 1e-9, 'a bar moved away: the row is gone, it gets its own pitch and free-bar ratios back');
  bars(1); ok(sweeps().length === s0 + 3, 'no sweep without a shape change');
  for (const b of bs) things.remove(b); bars(1); }
{ const ss = [0, 1, 2].map(i => things.make('string', [{ x: -1.5 + i * .6, y: -1 }, { x: -1.5 + i * .6, y: 1.2 - i * .3 }], { seed: 30 + i })); bars(1);
  const E = SP.ens.find(e => e.kind === 'harp'); ok(E && E.members.length === 3, 'three near-parallel strings become a harp');
  const ch = music.chord.tones.map(d => ((d % 7) + 7) % 7); ok(E && E.members.every(m => ch.includes(((SP.degOf(m.f) % 7) + 7) % 7)), 'its strings are tuned to the chord sounding now (' + E.members.map(m => SP.degOf(m.f)) + ')');
  music.chord = { root: 3, tones: [3, 5, 7] }; bars(1); const ch2 = [3, 5, 0]; ok(E.members.every(m => ch2.includes(((SP.degOf(m.f) % 7) + 7) % 7)), 'the chord moves: the harp follows at the bar line'); music.chord = { root: 0, tones: [0, 2, 4] };
  for (const s of ss) things.remove(s); bars(1); }
{ const ms = [[0, 0, .9], [2, 0, .6], [1, 1.6, .35]].map(([x, y, r], i) => things.make('membrane', Array.from({ length: 16 }, (_, k) => ({ x: x + r * Math.cos(k / 16 * 6.283), y: y + r * Math.sin(k / 16 * 6.283) })), { seed: 40 + i })); bars(1);
  const E = SP.ens.find(e => e.kind === 'circle'); ok(E && E.members.length === 3, 'three drums round a spot become a drum circle');
  ok(E && E.members.find(m => m.ens.role === 'low') === ms[0] && E.members.find(m => m.ens.role === 'time') === ms[2], 'split by size: the big one low, the small one keeps time');
  const o = sim.ohms[2]; pin(o, 1, .8); SP.players.set(o.id, { o, th: ms[1], tech: 'strike', until: 1e9 }); const n0 = notes.length; bars(3); const hits = notes.slice(n0).filter(e => e.by === o.id);
  const ofRole = r => hits.filter(e => e.src === E.members.find(m => m.ens.role === r).src).map(e => ((music.beat(e.t) % 4) + 4) % 4);
  ok(ofRole('low').length && ofRole('back').length && ofRole('time').length, `a striker shares the beat across the circle (low ${ofRole('low')}, back ${ofRole('back')}, time ${ofRole('time')})`);
  SP.players.clear(); far(o); for (const m of ms) things.remove(m); bars(1); }
{ const st = things.make('string', [{ x: -3.5, y: 0 }, { x: 3.5, y: 0 }], { seed: 50 }); bars(1); const E = SP.ens.find(e => e.kind === 'drone');
  ok(E && E.members[0] === st, 'a string longer than 300 px is a drone rod');
  const c = 1200 * Math.log2(st.f / music.tonicHz), r = ((c % 1200) + 1200) % 1200, fifth = music.cents()[4]; const nr = (v, t) => Math.min(Math.abs(v - t), 1200 - Math.abs(v - t));
  const wasNear = Math.min(nr(((1200 * Math.log2(st.fOwn / music.tonicHz) % 1200) + 1200) % 1200, 0), nr(((1200 * Math.log2(st.fOwn / music.tonicHz) % 1200) + 1200) % 1200, fifth)) <= 50;
  ok(!wasNear || nr(r, 0) < .5 || nr(r, fifth) < .5, 'within 50 cents of home / fifth it snaps there');
  const [a, b] = [sim.ohms[1], sim.ohms[2]]; pin(a, -1, .5); pin(b, 1, .5); SP.players.set(a.id, { o: a, th: st, tech: 'bow', until: 1e9 }); SP.players.set(b.id, { o: b, th: st, tech: 'bow', until: 1e9 }); const n0 = notes.length; bars(2);
  const bw = notes.slice(n0).filter(e => e.src === st.src && e.by !== 'sweep'); ok(bw.length >= 1 && bw.every(e => e.dur >= 4 * music.spb()), `two bowers: one held drone a bar, re-bowed (${bw.length} bows, ${bw[0] && bw[0].dur.toFixed(2)} s)`);
  SP.players.clear(); far(a); far(b); things.remove(st); SP.opts.ens = false; const t2 = things.make('string', [{ x: -3.5, y: 0 }, { x: 3.5, y: 0 }], { seed: 50 }); bars(1); ok(!SP.ens.length && !t2.ens, 'switch ensembles off: nothing groups'); SP.opts.ens = true; things.remove(t2); bars(1); }
// ---------- P3 voice cap ----------
{ const ss = Array.from({ length: 7 }, (_, i) => things.make('string', [{ x: 20 + i * 3, y: 0 }, { x: 21 + i * 3, y: 0 }], { seed: 60 + i })); const n0 = notes.length; things.capped = 0;
  for (const s of ss) things.play(s, .4); const got = notes.slice(n0).filter(e => ss.some(s => s.src === e.src)).length;
  ok(got === 4 && things.capped === 3, `at most 4 shapes ring at once from ohms / bumps (${got} sounded, ${things.capped} skipped)`);
  const n1 = notes.length; things.play(ss[6], .5, undefined, 'player'); ok(notes.length === n1 + 1, 'your own tap always sounds');
  things.opts.voiceCap = 0; for (const s of ss) s.hit = 0; const n2 = notes.length; for (const s of ss) things.play(s, .4); ok(notes.length - n2 === 7, 'switch shapeCap off: all 7 sound'); things.opts.voiceCap = 4;
  for (const s of ss) things.remove(s); }
// ---------- P1 absolute length ----------
{ const st = things.make('string', [{ x: 0, y: 0 }, { x: 18, y: 0 }], { seed: 70 }); const h = things.handleDown({ th: st, end: 1 }, 18, 0); things.handleMove(h, 60, 0);
  const L = Math.hypot(st.pts[st.pts.length - 1].x - st.pts[0].x, st.pts[st.pts.length - 1].y - st.pts[0].y); ok(L <= 23.5 + 1e-6, `dragging an end stops at 1200 px (${L.toFixed(2)} units)`);
  things.opts.absLen = null; const h2 = things.handleDown({ th: st, end: 1 }, st.pts[st.pts.length - 1].x, 0); things.handleMove(h2, 60, 0); const L2 = Math.hypot(st.pts[st.pts.length - 1].x - st.pts[0].x, 0); ok(L2 > 23.5, 'switch absLen off: only the relative limit');
  things.opts.absLen = [.47, 23.5]; things.remove(st); }
// ---------- P7 melody lean ----------
{ const [a, b, c] = [sim.ohms[1], sim.ohms[2], sim.ohms[3]]; for (const q of sim.ohms) far(q); pin(a, 0, 0); pin(b, 1, 0); const st = things.make('string', [{ x: -1, y: 3 }, { x: 1, y: 3 }], { seed: 80 });
  const P = { a, b, k: 1 }; ok(SP.leanFor(P) === null, 'a silent shape lends nothing');
  const degs = [0, 2, 1, 3, 2, 4, 3, 5]; for (let i = 0; i < 8; i++) { const f0 = st.f; st.f = music.hz(degs[i], 0); things.play(st, .5, undefined, c.id); st.f = f0; st.hit = 0; T += music.spb(); } bus.flush();
  const L = SP.leanFor(P); ok(L && L.w > 0 && L.w <= .25, `played steadily by a nearby ohm: the jam leans toward it (w ${L && L.w.toFixed(3)}, cap .25)`);
  ok(L && L.iv.join() === '2,-1,2', 'it lends the shape\'s last steps (' + (L && L.iv) + ')');
  let n = 0; const turn = { id: a.id, seed: a.seed }; for (let tn = 0; tn < 30; tn++) if (SP.borrow(P, turn, tn)) n++; ok(n >= 1 && n <= 10, `at most 1 phrase in 3 borrows (${n} of 30)`);
  const st2 = things.make('string', [{ x: 30, y: 3 }, { x: 32, y: 3 }], { seed: 81 }); pin(a, 30, 0); pin(b, 31, 0); for (let i = 0; i < 8; i++) { things.play(st2, .5, undefined, i % 2 ? a.id : b.id); st2.hit = 0; T += music.spb(); } bus.flush();
  ok(SP.leanFor(P) === null, 'the jam\'s own members playing a shape do not count');
  pin(a, 0, 0); pin(b, 1, 0); T += 9 * 4 * music.spb(); ok(SP.leanFor(P) === null, 'gone after 8 quiet bars');
  SP.opts.lean = false; ok(SP.leanFor(P) === null, 'switch shapeLean off: no lean'); SP.opts.lean = true; things.remove(st); things.remove(st2); }
// autojam takes the borrowed line (fixed rhythm, the shape's steps)
{ const [a, b, c] = [sim.ohms[1], sim.ohms[2], sim.ohms[3]]; for (const q of sim.ohms) far(q); sim.ohm = sim.ohms[0]; pin(sim.ohm, 0, -2); pin(a, 0, 0); pin(b, 1.2, 0);
  const st = things.make('string', [{ x: -1, y: 3 }, { x: 1, y: 3 }], { seed: 82 }); sim.opts.autojam.on = true; let got = 0;
  for (let k = 0; k < 24; k++) { for (let i = 0; i < 4; i++) { const f0 = st.f; st.f = music.hz([0, 2, 4, 2][i], 0); things.play(st, .5, undefined, c.id); st.f = f0; st.hit = 0; T += music.spb(); bus.flush(); } const b0 = autojam.borrowed || 0; autojam.bar(); if ((autojam.borrowed || 0) > b0) got++; }
  ok(got >= 1 && got <= 9, `an ohm jam nearby borrows the shape's line now and then (${got} of 24 turns)`); sim.opts.autojam.on = false; things.remove(st); }
// ---------- bystanders ----------
{ const blend = createBlend(sim, bus, music); sim.blend = blend; const BY = createBystand({ sim, music, autojam, songs: null, jam: null }); sim.watching = o => BY.watching(o); sim.watchers = () => BY.list();
  const [a, b, w] = [sim.ohms[1], sim.ohms[2], sim.ohms[4]]; for (const q of sim.ohms) far(q); sim.ohm = sim.ohms[0]; pin(sim.ohm, 0, -2); pin(a, 0, 0); pin(b, 1.2, 0); pin(w, 3.5, 0); sim.opts.autojam.on = true;
  sim.opts.blend.on = true; sim.opts.blend.patterns = true; const before = (sim.brain || blend.brain).list(w, 'pattern').length; let wn = 0, jn = 0; bus.on('note', e => { if (e.auto && e.src === w) wn++; if (e.auto && (e.src === a || e.src === b)) jn++; });
  for (let k = 0; k < 16; k++) { autojam.bar(); BY.bar(k); T += 4 * music.spb(); bus.flush(); blend.bar(); }
  ok(jn > 0, `the pair jams (${jn} notes)`); ok(BY.watching(w) && w.watch, 'the ohm next to it is a bystander (eyes on the jam)');
  ok(wn === 0, `it watches quietly: ${wn} notes of its own`);
  const after = blend.brain.list(w, 'pattern').length; ok(after > before, `it learns the jam's patterns (${before} -> ${after})`);
  BY.opts.on = false; BY.bar(99); ok(!BY.watching(w) && !w.watch, 'switch bystanders off: nobody watches'); sim.opts.autojam.on = false; }
console.log(fails ? 'DRAWN_P_FAIL ' + fails : 'DRAWN_P_OK'); process.exit(fails ? 1 : 0);
