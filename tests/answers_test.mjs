// BUILD ROUND tests for Wilbow's 3:58 / 4:00 / 4:02 PM Oct 25 answers (Q350-Q359), node only. Each block = one answer; prints ANSWERS_OK.
import { fakeBus, fakeMusic, fakeSim } from './fakes.mjs';
import { createRoom } from '../www/js/room.js';
import { createDaw } from '../www/js/daw.js';
import { renderScore, wavOf, createBounce } from '../www/js/bounce.js';
import { createArp, arpGene } from '../www/js/arp.js';
import { createRoles, classify } from '../www/js/roles.js';
import { makeRecipe } from '../www/js/recipe.js';
import { createAutoJam } from '../www/js/autojam.js';
import { createMusic, createHarmony } from '../www/js/music.js';
import { createThings, THING_OPTS } from '../www/js/things.js';
let T = 0; const music = createMusic(() => T);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// ---- Q350 a: leave room in pitch + rhythm (room.js)
{ const bus = fakeBus(), M = fakeMusic(), R = createRoom(bus, M), other = { id: 7, scale: 'ohm' };
  M.b = 8; for (const b of [8, 9, 10, 11]) bus.note({ src: other, kind: 'note', deg: 2, oct: 0, beat: b });   // the other ohm: every beat, on E
  const mine = [0, 1, 2, 3].map(i => ({ b: 12 + i, deg: i === 1 ? 2 : 4, oct: 0 })), fit = R.fit(1, mine);
  ok(fit.length >= 2 && fit.length <= 4, `rhythm: thinned, not muted (${fit.length} of 4 kept)`);
  ok(fit.every(n => Math.round(n.b * 4) % 4 !== 0), 'notes on the steps the other ohm uses move to a free neighbouring 16th (' + fit.map(n => n.b).join() + ')');
  ok(!fit.some(n => n.deg + 7 * n.oct === 2), 'pitch: no note on the pitch the other ohm is sounding');
  const near = [{ b: 12.5, deg: 3, oct: 0 }], f2 = R.fit(1, near); ok(f2[0].oct !== 0, 'register: crowded (others within 4 steps) -> it moves an octave away');
  const busy = createRoom(fakeBus(), M); for (let s = 0; s < 16; s++) busy.ev.push({ id: 7, b: 8 + s / 4, st: s, p: 20 }); const f3 = busy.fit(1, [0, 1, 2, 3].map(i => ({ b: 12 + i, deg: 0, oct: 0 })));
  ok(f3.length === 2 && f3[0].b === 12, `every step taken: half the phrase stays, first note kept (${f3.length})`);
  R.opts.on = false; ok(R.fit(1, mine) === mine, 'switch off: unchanged');
  // autojam turns go through it
  const S = fakeSim(2), bus2 = fakeBus(), M2 = fakeMusic(); S.opts.autojam = { on: true, near: 2.5, reach: 6, max: 6, droneK: .15, sleepK: .05 }; S.room = createRoom(bus2, M2);
  const A = createAutoJam(S, bus2, M2); M2.b = 4; A.bar(); const n1 = bus2.notes.length; M2.b = 8; A.bar(); const n2 = bus2.notes.length - n1;
  ok(n1 > 0 && n2 > 0, `autojam: both turns still play (${n1}, ${n2} notes)`);
  const st = bus2.notes.slice(n1).map(n => n.beat * 4 % 16), prev = new Set(bus2.notes.slice(0, n1).map(n => n.beat * 4 % 16));
  ok(st.filter(s => prev.has(s)).length <= Math.floor(n2 / 2), `autojam: the answer avoids most of the first turn's steps (${st.join()} vs ${[...prev].join()})`); }
// ---- Q351 a: a fused group grows jam-tuned strings together
{ const L = {}, nb = [], bz = { on(t, f) { (L[t] || (L[t] = [])).push(f); }, ctl() {}, post() {}, note(ev) { nb.push(ev); for (const f of L.note || []) f(ev); } };
  const os = [1, 2, 3].map(i => ({ id: i, scale: 'ohm', body: { x: i * .95, y: 0 }, g: { r: .5 } })), sm = { ohms: os, byId: new Map(os.map(o => [o.id, o])), bounds: { w: 40, h: 40 } };
  const fuse = { links: new Set(['1-2', '2-3']), colonyOf: o => [1, 2, 3].includes(o.id) ? [1, 2, 3] : null }, TH = createThings({ sim: sm, bus: bz, music }); TH.fuse = fuse;
  TH.stroke && 0; TH.groupTick(); const gs = TH.list.filter(t => t.link); ok(gs.length === 2 && gs.every(t => t.kind === 'string'), 'a fused group of 3 grows a string along each of its 2 links');
  ok(!TH.save().some(t => t.link), 'group strings are not saved on their own (they follow the fuse)');
  ok(!TH.handleAt(gs[0].pts[0].x, gs[0].pts[0].y) || !TH.handleAt(gs[0].pts[0].x, gs[0].pts[0].y).th || !TH.handleAt(gs[0].pts[0].x, gs[0].pts[0].y).th.link, 'no end handles on group strings');
  T = 200; bz.note({ src: os[0], kind: 'note', deg: 0, t: T }); T += 2.5; TH.onBar(); const cs = music.cents();
  const inKey = f => { const c = 1200 * Math.log2(f / music.tonicHz), r = ((c % 1200) + 1200) % 1200; return cs.some(k => Math.abs(k - r) < .01 || Math.abs(k + 1200 - r) < .01); };
  ok(gs.every(t => t.tied && inKey(t.f)), `tuned to the jam's scale (${gs.map(t => t.f.toFixed(1))} Hz)`);
  ok(Math.abs(gs[0].f - gs[1].f) > 1, 'equal links: the push-up keeps them on different notes (one set)');
  const n0 = nb.length; os[2].body.x = 3 * .95 + .4; TH.groupTick(); os[2].body.x = 3 * .95; TH.groupTick(); ok(nb.length === n0 + 1 && nb[n0].src.id.startsWith('drawn:'), 'stretched and sprung back: the string sounds');
  fuse.links.delete('2-3'); TH.groupTick(); ok(TH.list.filter(t => t.link).length === 1, 'split link: its string goes');
  THING_OPTS.groupStrings = false; TH.groupTick(); ok(!TH.list.some(t => t.link), 'switch off: no group strings'); THING_OPTS.groupStrings = true; }
// ---- Q352 b: a pluck on a jam-tuned string also steers the next chord (a nudge, not an override)
{ const run = (nOhms, nudge) => { const bus = fakeBus(), M = createMusic(() => 0), w = { opts: { harm: { on: true, keys: false, nudge } } }, H = createHarmony(w, bus, M);
    for (let i = 0; i < nOhms; i++) for (const d of [3, 5, 0]) bus.note({ src: { id: 'o' + i, scale: 'ohm' }, kind: 'note', deg: d });   // ohms playing F A C (IV)
    bus.note({ src: { id: 'drawn:t1', scale: 'thing' }, kind: 'note', deg: 1, feedW: .8 });   // the player plucks D on a tied string
    H.step(); return M.chord.root; };
  ok(run(3, false) === 3, 'without the nudge, 3 ohms on IV keep IV even with the pluck heard (old behaviour)');
  ok(run(3, true) === 1, 'with the nudge, the plucked D steers the next chord to ii (D F A), which shares the jam\'s notes');
  ok(run(6, true) === 3, 'a nudge, not an override: 6 ohms firmly on IV keep IV'); }
// ---- Q353 a: a still-ringing string glides to its new note when retuned
{ const L = {}, nb = [], sends = [], bz = { on(t, f) { (L[t] || (L[t] = [])).push(f); }, ctl() {}, post() {}, note(ev) { nb.push(ev); for (const f of L.note || []) f(ev); } };
  const dn = Date.now; let now = 1e6; Date.now = () => now; const audio = { send: m => sends.push(m) };
  const om = { id: 9, scale: 'ohm', body: { x: 0, y: 0 } }, sm = { ohms: [], byId: new Map(), bounds: { w: 40, h: 40 } }, TH = createThings({ sim: sm, bus: bz, music, audio });
  const st = TH.make('string', [{ x: -1.5, y: .3 }, { x: 1.5, y: .3 }]); T = 400; bz.note({ src: om, kind: 'note', deg: 0, t: T }); T += 2.5; TH.onBar();
  TH.play(st, .6, undefined, 'player'); const f0 = st.f, k0 = music.key; now += 300; music.setKey(k0 + 3); T += 2.5; TH.onBar(); const f1 = st.f;
  ok(f1 !== f0 && TH.glides.has(st), `ringing + key re-snap: a glide starts (${f0.toFixed(1)} -> ${f1.toFixed(1)} Hz)`);
  now += 60; TH.glideTick(); const mid = sends.filter(m => m.t === 'bend').pop(); now += 80; TH.glideTick(); const end = sends.filter(m => m.t === 'bend').pop();
  ok(mid && Math.abs(mid.r - 1) > 1e-3 && Math.abs(mid.r - f1 / f0) > 1e-3, `half way: in between (bend ${mid && mid.r.toFixed(3)})`);
  ok(end && Math.abs(end.r - f1 / f0) < 1e-6 && end.src === st.src.id && !TH.glides.has(st), `after ~120 ms it sits on the new note (bend ${end.r.toFixed(3)} = ${(f1 / f0).toFixed(3)})`);
  const n0 = nb.length; TH.play(st, .6); ok(Math.abs(nb[n0].f * end.r - f1) < 1e-6, 'a pluck while the bend is held still sounds the string\'s own note');
  now += 5000; const n1 = nb.length; TH.play(st, .6); ok(sends.filter(m => m.t === 'bend').pop().r === 1 && nb[n1].f === st.f, 'quiet again: bend back to 1, plain pluck');
  now += 5000; music.setKey(k0); T += 2.5; TH.onBar(); ok(!TH.glides.has(st), 'not ringing (plucked > 1.5 s ago): no glide, it simply retunes');
  THING_OPTS.glide = false; TH.play(st, .6); now += 100; music.setKey(k0 + 3); T += 2.5; TH.onBar(); ok(!TH.glides.has(st), 'switch off: no glide'); THING_OPTS.glide = true; music.setKey(k0); Date.now = dn; }
// ---- Q354 a: ohms carry drawn things (attach / ride / take / knock off / drop)
{ const L = {}, nb = [], posts = [], bz = { on(t, f) { (L[t] || (L[t] = [])).push(f); }, ctl() {}, post(ev) { posts.push(ev); }, note(ev) { nb.push(ev); for (const f of L.note || []) f(ev); } };
  const U = { st: [], push(x) { this.st.push(x); }, undo() { const x = this.st.pop(); if (x) x.undo(); } };
  const a = { id: 1, scale: 'ohm', body: { x: 0, y: 0, vx: 0, vy: 0 }, g: { r: .5 } }, c = { id: 2, scale: 'ohm', body: { x: 10, y: 0, vx: 0, vy: 0 }, g: { r: .5 } };
  const sm = { ohms: [a, c], byId: new Map([[1, a], [2, c]]), bounds: { w: 40, h: 40 } }, TH = createThings({ sim: sm, bus: bz, music, undo: U });
  const st = TH.make('string', [{ x: -1.5, y: .2 }, { x: 1.5, y: .2 }]); const run = (s, f) => { for (let i = 0; i < s * 60; i++) { if (f) f(i); TH.tick(); } };
  run(1.2); ok(st.carry == null, 'an ohm merely resting on a string (not held) does not pick it up');
  a.body.grab = { x: 0, y: 0 }; a.body.vx = 2; run(1.2); ok(st.carry == null, 'dragged across it, moving: no pick-up');
  a.body.vx = 0; run(.5); ok(st.carry == null, 'held still on it 0.5 s: not yet'); run(.6); ok(st.carry === 1, 'held still on it 0.9 s: it picks it up');
  a.body.grab = null; a.body.x = 4; a.body.y = 1; run(.1); ok(Math.abs(st.x - 4) < 1e-6 && st.y < 1 - .5, `it rides above the carrier's head (${st.x.toFixed(2)}, ${st.y.toFixed(2)})`);
  ok(TH.save().find(t => t.id === st.id).carry === 1, 'saved with its carrier'); const T2 = createThings({ sim: sm, music }); T2.load(JSON.parse(JSON.stringify(TH.save()))); ok(T2.list[0].carry === 1, 'restored carried');
  const n0 = nb.length; c.body.x = st.x; c.body.y = st.y - 3; c.body.vx = 0; c.body.vy = 1; run(.05); c.body.y = st.y; c.body.vy = 5; run(.05);
  ok(st.carry == null && nb.length > n0 && TH.marks.some(m => m.type === 'carry.knock'), 'another ohm hitting it fast knocks it off (it sounds)');
  c.body.x = 10; c.body.vy = 0; const kx = st.x; a.body.x = 6; run(.1); ok(st.x === kx, 'knocked off: it stays where it was hit');
  a.body.x = st.x; a.body.y = st.y; a.body.grab = { x: 0, y: 0 }; a.body.vx = 0; a.body.vy = 0; run(1); ok(st.carry === 1, 'picked up again'); a.body.grab = null;
  a.body.vx = 9; run(.05); ok(st.carry == null && TH.marks.some(m => m.type === 'carry.drop'), 'a flick / hard throw of the carrier drops it'); a.body.vx = 0;
  a.body.x = st.x; a.body.y = st.y; a.body.grab = { x: 0, y: 0 }; run(1); a.body.grab = null; ok(st.carry === 1, 'carried once more');
  const tk = TH.take(st, st.x, st.y); TH.takeMove(tk, st.x + 3, st.y + 2); const tx = st.x; run(.1); ok(st.carry == null && st.x === tx, 'taken by dragging it: off the ohm, where the finger put it');
  U.undo(); ok(st.carry === 1, 'undo the take: back on the ohm');
  ok(!!TH.carriedAt(st.x, st.y), 'gestures.js can find a carried thing under a finger');
  THING_OPTS.carry = false; run(.05); ok(st.carry == null, 'switch off: everything carried is let go'); THING_OPTS.carry = true; }
// ---- Q356 b + learning: the arpeggio habit (born gene; learned from arpeggiating ohms and the player, like drum hits)
{ const S = fakeSim(0); const mk = (id, want) => { for (let sd = 5000 + id * 101; ; sd++) { const rec = makeRecipe(sd, { add: true }); if ((arpGene(rec.seed != null ? rec.seed : sd) < .3) === want) { const o = { id, seed: sd, scale: 'ohm', recipe: rec.id, body: { x: id, y: 0 } }; S.ohms.push(o); return o; } } };
  const born = mk(1, true), plain = mk(2, false), plain2 = mk(3, false), you = { id: 'you', scale: 'voice' }; S.ohm = null; const A = createArp(S, S.brain);
  ok(A.is(born) && !A.is(plain), 'born with the gene: arpeggiates; without it: not yet');
  let n = 0; let born30 = 0; for (let sd = 1; sd <= 2000; sd++) if (arpGene(sd) < .3) born30++; ok(born30 > 500 && born30 < 700, `about 30% are born with it (${born30}/2000)`);
  for (let i = 0; i < 6; i++) A.learn(plain, born, 1); ok(!A.is(plain) && A.strength(plain) > .4, `jamming with an arpeggiator: the habit grows (${A.strength(plain).toFixed(2)} after 6 bars)`);
  for (let i = 0; i < 8; i++) A.learn(plain, born, 1); ok(A.is(plain), 'after enough bars together it is its own');
  for (let i = 0; i < 20; i++) A.learn(plain2, mk(10 + i, false), 1); ok(!A.is(plain2) && A.strength(plain2) === 0, 'an ohm without the habit teaches nothing');
  const brk = [{ b: 0, d: 0 }, { b: .5, d: 2 }, { b: 1, d: 4 }, { b: 1.5, d: 7 }], blk = [{ b: 0, d: 0 }, { b: 1, d: 1 }, { b: 2, d: 0 }];
  ok(A.detect(brk) && !A.detect(blk), 'a broken chord from the player is recognised; a stepwise tune is not');
  const p3 = mk(40, false); for (let i = 0; i < 5; i++) A.learn(p3, you, 1, blk); ok(A.strength(p3) === 0, 'the player noodling stepwise teaches nothing');
  for (let i = 0; i < 6; i++) A.learn(p3, you, 1, brk); ok(A.strength(p3) > A.strength({ ...p3, id: 'x' }) && A.strength(p3) >= .7, `the player arpeggiating teaches it, faster (${A.strength(p3).toFixed(2)} after 6 bars)`);
  const ph = [0, 1, 2, 3].map(i => ({ b: i * .5, deg: 5, oct: 0, vel: .5 })), sh = A.shape(born, ph, [1, 3, 5]);
  ok(sh.map(x => x.b).join() === ph.map(x => x.b).join() && new Set(sh.map(x => x.deg)).size >= 3 && sh.every(x => [1, 3, 5, 8, 10, 12].includes(x.deg)), `an arpeggiator plays its turn as a broken chord, same rhythm (${sh.map(x => x.deg)})`);
  ok(A.shape(mk(41, false), ph, [1, 3, 5]) === ph, 'a non-arpeggiator plays its turn as before');
  A.opts.on = false; ok(!A.learn(mk(42, false), born, 1) && A.shape(born, ph) === ph, 'switch off: no learning, no broken chords'); }
// ---- Q357 d: river automation - drag out from a lane's left edge draws loudness (lower half) / brightness (upper half) over the lane's cycle
{ globalThis.innerWidth = 800; globalThis.innerHeight = 600; const S = fakeSim(2), bus3 = fakeBus(), M3 = fakeMusic(); M3.b = 8.2; const und = []; const D = createDaw(S, bus3, M3, { undo: { push: a => und.push(a) } });
  S.ohm = S.ohms[0]; D.show(true); ok(D.lanes.length >= 1, 'river open with a lane');
  const g = { top: 72, lh: 456 / D.lanes.length }, mid = g.top + g.lh / 2, bw = 800 * .62 / 8, nowX = 256; let id = 1;
  const drag = (x0, y0, path) => { const p = { x0, y0, x: x0, y: y0, t0: 0, pts: [] }, e = { pointerId: id++, timeStamp: 0 }; D.down(e, p); for (const [x, y] of path) { p.x = x; p.y = y; e.timeStamp += 16; D.move(e, p); } D.up(e, p); return p; };
  // lower half of the edge, a fall over 4 beats: loud -> quiet
  const xs = [[30, mid + 30]].concat([...Array(30)].map((_, k) => [nowX - 2 * bw + k * (4 * bw / 30), mid - g.lh * .4 + k * (g.lh * .8 / 30)]));
  const p1 = drag(20, mid + 30, xs); ok(p1.mode === 'auto' && D.auto.get(S.ohms[0].id) && D.auto.get(S.ohms[0].id).vol, 'drag out from the lower edge: a loudness curve');
  const C = D.auto.get(S.ohms[0].id).vol, u0 = C.pts[0][0] + .2, u1 = C.pts[C.pts.length - 1][0] - .2, L = C.bars * 4; ok([1, 2].includes(C.bars) && C.from >= 3 && C.from * 4 > M3.b, `loops in the smallest cycle that holds it, from the next bar (${C.bars} bars from bar ${C.from})`);
  const a = D.autoAt(S.ohms[0], C.from * 4 + u0), b = D.autoAt(S.ohms[0], C.from * 4 + u1), c = D.autoAt(S.ohms[0], C.from * 4 + 3 * L + u0); ok(a && b && a.vol > b.vol + .3 && Math.abs(c.vol - a.vol) < 1e-6 && a.cutK === 1, `the level follows the line and repeats every cycle (${a.vol.toFixed(2)} -> ${b.vol.toFixed(2)})`);
  ok(D.autoAt(S.ohms[0], 4) == null, 'nothing changes before it starts');
  drag(20, mid - 30, xs.map(([x, y], k) => [x, k ? 2 * mid - y : y])); const A2 = D.autoAt(S.ohms[0], C.from * 4 + u1); ok(D.auto.get(S.ohms[0].id).bright && A2.cutK > .5 && D.autoAt(S.ohms[0], C.from * 4 + u0).cutK < .2, 'from the upper edge: a brightness (filter) curve, separate from loudness');
  und[und.length - 1].undo(); ok(!D.auto.get(S.ohms[0].id).bright && D.auto.get(S.ohms[0].id).vol, 'undo takes the last line back');
  // hold still on the edge = mute, as before; a paint stroke in the lane = paint, as before
  const e = { pointerId: 99, timeStamp: 0 }, p = { x0: 20, y0: mid, x: 20, y: mid, pts: [] }; D.down(e, p); await new Promise(r => setTimeout(r, 650)); D.up(e, p); ok(S.ohms[0].muted && p.mode === 'done', 'holding the edge still still mutes'); S.ohms[0].muted = false;
  const p3 = drag(300, mid, [...Array(20)].map((_, k) => [300 + k * 10, mid - k])); ok(p3.mode === 'paint' && D.paint.has(S.ohms[0].id), 'drawing in the lane still paints notes');
  drag(20, mid + 30, xs.map(([x, y], k) => [x, k ? g.top + 8 : y])); ok(!D.auto.get(S.ohms[0].id), 'a flat line along the top clears it');
  D.opts.auto = false; const p4 = drag(20, mid + 30, xs); ok(p4.mode !== 'auto' && !D.auto.size && D.autoAt(S.ohms[0], 40) == null, 'switch off: the edge drag does nothing, as before'); D.show(false); }
// ---- Q358 a: bounce - hold still below the river's lanes = render the whole song offline to a WAV, sent to a swappable destination
{ const S = fakeSim(2), M4 = fakeMusic(); M4.hz = (d, o = 0) => 220 * Math.pow(2, d / 7 + o - 2);
  const score = []; for (let bar = 0; bar < 4; bar++) for (let j = 0; j < 4; j++) score.push({ m: S.ohms[j % 2], b: bar * 4 + j, d: (j * 2) % 7, len: .9, vel: .7 });
  const t0 = Date.now(); const r = await renderScore(score, { music: M4, sr: 22050, tail: 1 }); const ms = Date.now() - t0; let pk = 0, e1 = 0, e2 = 0; for (let i = 0; i < r.L.length; i++) { pk = Math.max(pk, Math.abs(r.L[i])); if (i < r.L.length / 2) e1 += r.L[i] * r.L[i]; else e2 += r.L[i] * r.L[i]; }
  ok(Math.abs(r.sec - (15.9 * .5 + 1)) < .05 && pk > .01 && pk <= 1 && e1 > 0 && e2 > 0 && r.notes === 16, `whole score rendered offline: ${r.sec.toFixed(1)} s of audio in ${ms} ms, peak ${pk.toFixed(2)}`);
  const w = new DataView(wavOf(r.L, r.R, r.sr)); ok(w.getUint32(0) === 0x52494646 && w.getUint16(22, true) === 2 && w.getUint32(24, true) === 22050 && w.byteLength === 44 + r.L.length * 4, 'a stereo 16-bit WAV');
  const got = []; const G = { song: { id: 's1', name: 'Test song' }, state: 'song', members: S.ohms }; const sys = { songs: { groups: [G], groupOf: () => G, score: () => ({ notes: score, bars: 4 }) } }, bus4 = fakeBus();
  const Bn = createBounce(S, sys, M4, null, bus4, { sr: 22050, tail: .5 }); Bn.dest = async (blob, name) => { got.push({ size: blob.size, name, type: blob.type }); return { via: 'test' }; };
  globalThis.innerWidth = 800; globalThis.innerHeight = 600; sys.bounce = Bn; const D = createDaw(S, fakeBus(), M4, sys); sys.daw = D; S.ohm = S.ohms[0]; D.show(true);
  const e = { pointerId: 7, timeStamp: 0 }, p = { x0: 400, y0: 560, x: 400, y: 560, pts: [] }; D.down(e, p); ok(p.mode === 'bounce', 'a touch on the strip below the lanes starts the hold');
  await new Promise(r => setTimeout(r, 1000)); D.up(e, p); for (let i = 0; i < 50 && !got.length; i++) await new Promise(r => setTimeout(r, 50));
  ok(got.length === 1 && got[0].type === 'audio/wav' && /test-song\.wav$/i.test(got[0].name) && Bn.last && Bn.last.via === 'test', `held 0.9 s: the song is rendered and handed to the destination (${got[0] && got[0].name}, ${got[0] && (got[0].size / 1e3).toFixed(0)} kB)`);
  const e2_ = { pointerId: 8, timeStamp: 0 }, p2 = { x0: 400, y0: 560, x: 400, y: 560, pts: [] }; D.down(e2_, p2); p2.x = 430; D.move(e2_, p2); await new Promise(r => setTimeout(r, 1000)); D.up(e2_, p2); ok(got.length === 1, 'moving away cancels it');
  const e3 = { pointerId: 9, timeStamp: 0 }, p3 = { x0: 400, y0: 560, x: 400, y: 560, pts: [] }; D.down(e3, p3); await new Promise(r => setTimeout(r, 300)); D.up(e3, p3); await new Promise(r => setTimeout(r, 800)); ok(got.length === 1, 'a short tap does nothing');
  Bn.opts.on = false; const p4 = { x0: 400, y0: 560, x: 400, y: 560, pts: [] }; D.down({ pointerId: 10 }, p4); ok(p4.mode !== 'bounce', 'switch off: the strip is dead again, as before'); D.show(false); }
// ---- Q359 a: visible role - each ohm's part grows from what it plays, kept in its brain, drawn as a placeholder + look.ohmRole hook
{ const S = fakeSim(4), bus = fakeBus(), M = fakeMusic(); M.hz = (d, o = 0) => 220 * Math.pow(2, d / 7 + o); const [o1, o2, o3, o4] = S.ohms;
  const R = createRoles(S, bus, M, S.brain, null); const seen = [];
  const bar = n => { for (let b = n * 4; b < n * 4 + 4; b++) { M.b = b;
      bus.note({ src: o1, kind: 'note', deg: 0, oct: -1, beat: b, dur: .4 });                                   // low, steady: bass
      for (const q of [0, .5]) bus.note({ src: o2, kind: 'note', deg: (b * 2 + q * 4) % 7, oct: 1, beat: b + q, dur: .2 });   // high, busy, short: lead
      if (b % 2 === 0) bus.note({ src: o3, kind: 'note', deg: 2, oct: 0, beat: b, len: 2 });                     // long + sparse: pad
      bus.note({ src: o4, kind: 'hit', beat: b }); }                                                            // hits: rhythm
    M.b = n * 4 + 4; R.tick(); seen.push(R.of(o1)); };
  R.tick(); bar(0); bar(1); ok(seen[1] === null || seen[0] === null, 'too little heard: no part shown yet');
  for (let n = 2; n < 8; n++) bar(n);
  const parts = [o1, o2, o3, o4].map(o => R.of(o) && R.of(o).part); ok(parts.join() === 'bass,lead,pad,rhythm', 'each ohm shows the part it actually plays: ' + parts.join());
  ok(R.of(o1).k > 0 && R.of(o1).k <= 1 && R.of(o2).k >= (seen[2] ? seen[2].k : 0), 'the part grows surer as it keeps playing it (k ' + R.of(o1).k.toFixed(2) + ')');
  const e = S.brain.get(o1, 'part', 'role'); ok(e && e.keep && e.data.scores.bass > e.data.scores.lead, "saved in the ohm's own brain (entry part/role, kept - never forgotten)");
  const R2 = createRoles(S, fakeBus(), M, S.brain, null); ok(R2.of(o3).part === 'pad', 'after a relaunch (same brain) it keeps its part before playing a note');
  for (let n = 8; n < 20; n++) { for (let b = n * 4; b < n * 4 + 4; b++) { M.b = b; for (const q of [0, .5]) bus.note({ src: o1, kind: 'note', deg: 3, oct: 1, beat: b + q, dur: .2 }); } M.b = n * 4 + 4; R.tick(); }
  ok(R.of(o1).part === 'lead', 'an ohm that changes what it plays changes its part, slowly (bass -> lead after a few bars)');
  ok(classify([{ hz: 300, dur: .5 }], R.opts) === null, 'one note says nothing');
  const calls = []; const g = { arc() {}, beginPath() {}, stroke() {}, fillText(t) { calls.push(t); }, set strokeStyle(v) {}, set fillStyle(v) {}, set lineWidth(v) {}, set font(v) {}, set textAlign(v) {} };
  for (const o of S.ohms) o.g = { r: 10 }; const toS = (x, y) => ({ x: 100 + x * 10, y: 100, s: 1 });
  ok(R.opts.text === false, 'v0.0.23: role TEXT labels are off by default (switch roleText; the body cues show the role)');
  R.draw(g, toS, {}); ok(calls.length === 0, 'default: no part names written under the ohms (' + calls.join() + ')');
  { const hk = []; R.draw(g, toS, { ohmRole: (g_, o, part) => { hk.push(part); return false; } }); ok(hk.length === 4 && calls.length === 0, 'default: look.ohmRole still sees every ohm\'s part (' + hk.join() + ')'); }
  R.opts.text = true;   // switch roleText on: the old placeholder text checks
  calls.length = 0; R.draw(g, toS, {}); ok(calls.length === 4 && calls.includes('pad'), 'roleText on: each ohm\'s part written under it (' + calls.join() + ')');
  const hook = []; calls.length = 0; R.draw(g, toS, { ohmRole: (g_, o, part, x, y, r, st) => { hook.push(part); return o === o2; } }); ok(hook.length === 4 && calls.length === 3, 'look.ohmRole sees every ohm\'s part and can replace the placeholder');
  R.opts.on = false; const before = R.verdicts; calls.length = 0; R.draw(g, toS, {}); M.b += 8; R.tick(); ok(!calls.length && R.verdicts === before, 'switch off: nothing shown, nothing judged'); }
console.log(fails ? 'ANSWERS_FAIL ' + fails : 'ANSWERS_OK'); process.exit(fails ? 1 : 0);
