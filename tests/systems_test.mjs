// SYSTEMS module tests (node, no browser): river DAW stroke -> notes, mouth steering, walk stick, spiral-spawn seed lean, undo,
// save / restore + time away, fusions (press to fuse, pull to separate), plants fed by music, harmony bank gate.
import { strokeToNotes } from '../www/js/daw.js';
import { steerFrom } from '../www/js/mouth.js';
import { stickVec } from '../www/js/walk.js';
import { pickSeed } from '../www/js/spawn.js';
import { createUndo } from '../www/js/undo.js';
import { createPersist } from '../www/js/persist.js';
import { createFuse, clusters, linkKey } from '../www/js/fuse.js';
import { feed, PLANT_OPTS } from '../www/js/plants.js';
import { createBank } from '../www/js/systems.js';
import { fakeBus, fakeMusic, fakeSim } from './fakes.mjs';
import { keyIv, compatible, pairSeed, breedRecipe, crossPhrase, learnGene, createTeach, fitSeams, inheritBody, BODY_X } from '../www/js/teach.js';
import { bodyGenes } from '../www/js/genes.js';
import { deform, shapeOf, targetRing, isFlick, fingerVel } from '../www/js/softbody.js';
import { makeRecipe, recipes, toJSON } from '../www/js/recipe.js';
import { breedInst } from '../www/js/instruments.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// river DAW: a flat drag = one held note; steps = notes; a wobble = vibrato; length picks the loop size
const flat = Array.from({ length: 20 }, (_, i) => [i * .1, 2, i * 30, .5]); let r = strokeToNotes(flat);
ok(r.notes.length === 1 && r.notes[0].d === 2 && r.bars === 1, 'flat stroke = one held note, 1 bar');
const steps = []; for (let k = 0; k < 4; k++) for (let i = 0; i < 6; i++) steps.push([k * 1 + i * .15, k, (k * 6 + i) * 30, .5]); r = strokeToNotes(steps);
ok(r.notes.map(n => n.d).join() === '0,1,2,3', 'stepped stroke = 4 notes 0 1 2 3 (' + r.notes.map(n => n.d).join() + ')');
ok(r.notes.every(n => Math.abs(n.b * 2 - Math.round(n.b * 2)) < .26), 'notes pulled half way to the half beat grid (PULL .5)');
const wob = Array.from({ length: 30 }, (_, i) => [i * .1, 1 + (i % 2 ? .3 : -.3), i * 30, .5]); r = strokeToNotes(wob); ok(r.notes.some(n => n.vib), 'wobbly stroke = vibrato');
ok(strokeToNotes(Array.from({ length: 30 }, (_, i) => [i * .5, 0, i * 30, .5])).bars === 4, '15 beats long = a 4 bar loop');
ok(strokeToNotes([]).notes.length === 0, 'empty stroke = nothing');
// mouth: higher than your first note = forward / up, lower = back, quiet = nothing
ok(steerFrom(440 * 2 ** (5 / 12), 440, .1) > .9, 'sing 5 semitones up = full steer one way'); ok(steerFrom(440 / 2 ** (3 / 12), 440, .1) < -.4, 'sing lower = steer the other way'); ok(steerFrom(500, 440, .001) === 0, 'quiet = no steer');
// walk stick
ok(stickVec(5, 0).x === 0, 'stick dead zone'); const sv = stickVec(200, 0); ok(Math.abs(sv.x - 1) < 1e-9, 'stick full at range (' + sv.x + ')'); ok(Math.abs(stickVec(0, -40).y + (30 / 60)) < 1e-9, 'stick half way = half speed');
// spiral spawn: the place leans the seed, never decides
let seq = 1; const rr = () => { seq = (seq * 16807) % 2147483647; return seq / 2147483647; };
const make = s => ({ synth: { genes: { cut: (s % 1000) / 1000, sat: 0, noise: 0 } }, modal: { p: { bright: .5 } } });
let lo = 0; for (let i = 0; i < 400; i++) { const s = pickSeed({ timbre: .1 }, rr, 4, make); if ((s % 1000) / 1000 < .5) lo++; } ok(lo > 220 && lo < 400, 'a dark place leans spawns dark (' + lo + '/400), still some bright');
// undo
{ const M = fakeMusic(), U = createUndo(fakeBus(), M); let v = 0; U.push({ label: 'a', undo: () => v--, redo: () => v++ }); v++; U.undo(); ok(v === 0, 'undo'); U.redo(); ok(v === 1, 'redo'); U.undo(); U.push({ label: 'b', undo: () => { }, redo: () => { } }); ok(U.undone.length === 0, 'a new action clears redo'); }
// save / restore + time passes while away
{ const store = new Map(); globalThis.localStorage = { getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  const M = fakeMusic(); M.b = 37; const P = createPersist(M); let st = { a: 5 }, gotAway = 0, order = []; P.register('x', { prio: 1, save: () => st, load: d => { order.push('x'); st = d; } });
  P.register('y', { prio: 0, save: () => 1, load: () => order.push('y'), away: s => gotAway = s }); P.save('t'); const snap = P.read(); snap.at -= 3600e3; st = null;
  const P2 = createPersist(M); P2.register('x', { prio: 1, load: d => { order.push('x'); st = d; } }); P2.register('y', { prio: 0, load: () => order.push('y'), away: s => gotAway = s }); P2.restore(snap);
  ok(st && st.a === 5, 'restore brings the part back'); ok(order.join() === 'y,x', 'parts restore in priority order'); ok(Math.abs(gotAway - 3600) < 5, 'away seconds reach slow parts (' + gotAway.toFixed(0) + ' s)'); }
// fusions
{ const bus = fakeBus(), U = createUndo(bus, fakeMusic()), mk = (id, x) => ({ id, scale: 'ohm', g: { r: .5 }, body: { x, y: 0, vx: 0, vy: 0, grab: null } });
  const a = mk(1, 0), b = mk(2, .6), c = mk(3, 5), sim = { ohms: [a, b, c], byId: new Map([[1, a], [2, b], [3, c]]) }, F = createFuse(sim, bus, U);
  a.body.grab = { id: 1 }; for (let i = 0; i < 10; i++) F.tick(.05); ok(F.links.size === 0, 'pressing less than 0.9 s does not fuse');
  for (let i = 0; i < 12; i++) F.tick(.05); ok(F.links.has(linkKey(1, 2)), 'drag + press into another ohm 0.9 s = fused');
  a.body.grab = null; b.body.x = 3; for (let i = 0; i < 20; i++) { F.tick(.02); b.body.x += b.body.vx * .02; a.body.x += a.body.vx * .02; } ok(Math.abs(b.body.x - a.body.x) < 3, 'the link pulls the cluster back together');
  b.body.grab = { id: 2 }; b.body.vx = b.body.vy = 0; a.body.vx = 0; b.body.x = a.body.x + 3; F.tick(.02); ok(F.links.size === 0, 'drag a member far = it comes off');
  U.undo(); ok(F.links.size === 1, 'undo the separation'); ok(clusters(new Set(['1-2', '2-3', '5-6'])).length === 2, 'clusters of links'); }
// split a fused cluster with a quick wide spread (fuse.js spreadSplit; Wilbow 4:06 / 4:54 / 4:55 PM Oct 23; V08 U G6)
{ const bus = fakeBus(), U = createUndo(bus, fakeMusic()), mk = (id, x, y = 0) => ({ id, scale: 'ohm', g: { r: .5 }, body: { x, y, vx: 0, vy: 0, grab: null } });
  const os = [mk(1, 0), mk(2, .9), mk(3, 1.8), mk(4, 2.7), mk(9, 8)], sim = { ohms: os, byId: new Map(os.map(o => [o.id, o])) }, F = createFuse(sim, bus, U), [a, b, c, d, e] = os;
  F.fuse(a, b); F.fuse(b, c); F.fuse(c, d); ok(F.colonyOf(a).length === 4, 'a 4-ohm cluster');
  ok(F.spreadSplit(a, e) === 0 && F.spreadSplit(a, a) === 0, 'not one cluster (or one ohm): nothing splits');
  const n = F.spreadSplit(b, c, 1, 0); ok(n === 1 && F.colonyOf(a).join() === '1,2' && F.colonyOf(d).join() === '3,4', `spread on 2 and 3 along x: the cluster splits across the middle into {1,2} and {3,4} (${n} link cut)`);
  for (let i = 0; i < 30; i++) F.tick(.05); ok(!F.links.has(linkKey(2, 3)), 'after the split nothing re-sticks on its own (no press)');
  b.body.grab = { id: 1 }; b.body.x = c.body.x; for (let i = 0; i < 30; i++) F.tick(.05); ok(F.links.has(linkKey(2, 3)), 'Q355: pressed back together in range, the halves rejoin right away (no 4 min wait)'); b.body.grab = null;
  F.links.delete(linkKey(2, 3)); F.opts.rejoin = false; F.apart.set(linkKey(2, 3), F.t + F.opts.apartS); F.press = null; b.body.grab = { id: 1 }; for (let i = 0; i < 30; i++) F.tick(.05); ok(!F.links.has(linkKey(2, 3)), 'rejoin switch off: the old ~4 min wait still works');
  F.t += F.opts.apartS; F.press = null; for (let i = 0; i < 30; i++) F.tick(.05); ok(F.links.has(linkKey(2, 3)), 'rejoin off: after ~4 min they can fuse again'); b.body.grab = null; F.opts.rejoin = true;
  F.links.delete(linkKey(2, 3)); F.opts.leaveFirst = true; F.left.set(linkKey(2, 3), false); F.press = null; b.body.grab = { id: 1 }; for (let i = 0; i < 30; i++) F.tick(.05); ok(!F.links.has(linkKey(2, 3)), 'leaveFirst guard on: still in range after the split = no re-stick yet');
  b.body.x = c.body.x + 3; F.tick(.05); b.body.x = c.body.x; F.press = null; for (let i = 0; i < 30; i++) F.tick(.05); ok(F.links.has(linkKey(2, 3)), 'leaveFirst guard: out of range once, then pressed back = rejoined'); b.body.grab = null; F.opts.leaveFirst = false;
  b.body.x = .9; c.body.x = 1.8;
  F.links = new Set([linkKey(1, 2), linkKey(2, 3), linkKey(3, 4)]); b.body.x = .9; c.body.x = 1.8; F.spreadSplit(a, d, 1, 0); ok(F.colonyOf(a).join() === '1,2' && F.colonyOf(d).join() === '3,4', 'fingers on the two ends: members split by which side of the middle they sit');
  const L = F.links.size; U.undo(); ok(F.links.size === L + 1, 'undo the split as one step');
  F.opts.spread = false; ok(F.spreadSplit(a, b, 1, 0) === 0, 'panel switch off: no split'); F.opts.spread = true; }
// plants
{ const p = { g: .2, f: 0 }; for (let i = 0; i < 40; i++) feed(p, { vel: .8 }, .2); ok(p.g > .2 && p.f === 0, 'jam notes grow green, no flowers'); for (let i = 0; i < 40; i++) feed(p, { vel: .8, song: 1 }, .2); ok(p.f > 0, 'song notes make it flower');
  const g0 = p.g; for (let i = 0; i < 10; i++) feed(p, { vel: .8, wrong: 1 }, .2); ok(p.g < g0, 'out-of-tune notes wilt it'); ok(feed(p, { vel: 1 }, PLANT_OPTS.reach + 1) === 0, 'notes far away do nothing'); }
// harmony bank
{ const G = { state: 'song', members: [1, 2] }, songs = { groups: [G], groupOf: () => G, discord: () => .1 }, B = createBank(songs, { jams: [] }, fakeBus());
  for (let i = 0; i < 4; i++) B.bar(); ok(B.harmony > 6, 'songs in tune earn harmony (' + B.harmony.toFixed(1) + ')'); ok(B.canAdvance(), 'low discord: the next scale is open');
  songs.discord = () => .8; B.bar(); ok(!B.canAdvance(), 'discord holds back the next scale'); ok(B.spend(1, 'test') && !B.spend(1e6, 'x'), 'spend only what you have'); }
// teaching + offspring (teach.js)
{ ok(keyIv(0, 7) === 7 && keyIv(7, 0) === 5 && keyIv(11, 1) === 2, 'key interval mod 12');
  ok(compatible(0, 7) && compatible(2, 9) && compatible(0, 5) && compatible(4, 4), 'unison / 4th / 5th apart are in key');
  ok(!compatible(0, 1) && !compatible(0, 6) && !compatible(0, 2), 'a 2nd / tritone apart are out of key: no breeding');
  ok(compatible(0, 0, 120, 60) && !compatible(0, 0, 120, 90), 'tempos 1:1 / 2:1 breed, 4:3 does not');
  ok(pairSeed(11, 22, 0) === pairSeed(22, 11, 0) && pairSeed(11, 22, 0) !== pairSeed(11, 22, 1), 'child seed: order-free, the n-th child differs');
  const A = makeRecipe(4242), B = makeRecipe(9191), a0 = JSON.stringify(toJSON(A)), b0 = JSON.stringify(toJSON(B));
  const c1 = breedRecipe(A, B, 777, { key: 7 }, { key: 0 }), c2 = breedRecipe(A, B, 777, { key: 7 }, { key: 0 });
  ok(JSON.stringify(c1) === JSON.stringify(c2), 'breeding is deterministic (same parents + seed = same child)');
  ok(JSON.stringify(toJSON(A)) === a0 && JSON.stringify(toJSON(B)) === b0, 'parents are not changed by breeding');
  const ga = A.synth.genes, gb = B.synth.genes; ok(Object.keys(c1.synth.genes).every(k => c1.synth.genes[k] === ga[k] || c1.synth.genes[k] === gb[k]), 'no mutation: every gene is one parent\'s');
  ok(Object.keys(c1.mix).every(k => c1.mix[k] === A.mix[k] || c1.mix[k] === B.mix[k]) && Object.keys(c1.modal.p).every(k => c1.modal.p[k] === A.modal.p[k] || c1.modal.p[k] === B.modal.p[k]), 'mix + body sound genes each from one parent');
  ok(JSON.stringify(c1.inst) === JSON.stringify(breedInst(A.inst, B.inst, 777)), 'the instrument is instruments.js breedInst');
  ok(c1.home === 7 || c1.home === 0, 'the child\'s home key is a parent\'s (learned) key (' + c1.home + ')');
  let both = new Set(); for (let sd = 1; sd < 40; sd++) both.add(breedRecipe(A, B, sd, { key: 7 }, { key: 0 }).home); ok(both.size === 2, 'either parent can pass its key');
  const na = [0, 4, 8, 16, 20, 32].map(b => ({ b, d: 1, n: 'a' })), nb = [0, 2, 17, 18, 33].map(b => ({ b, d: 1, n: 'b' })), x = crossPhrase(na, nb, 5);
  const secs = new Map(); for (const n of x) { const k = Math.floor(n.b / 16); if (!secs.has(k)) secs.set(k, new Set()); secs.get(k).add(n.n); } ok([...secs.values()].every(v => v.size === 1) && new Set([...secs.values()].map(v => [...v][0])).size === 2, 'inherited phrase: whole sections taken alternately from each parent');
  ok(JSON.stringify(crossPhrase(na, nb, 5)) === JSON.stringify(x), 'phrase crossover is deterministic');
  // a lesson + resistance
  const sim = fakeSim(6), bus = fakeBus(), music = Object.assign(fakeMusic(), { own: new Map(), follow: new Map(), bpmFor: () => 120 }), homes = { 1: 7, 2: 0, 3: 1, 4: 7, 5: 0, 6: 0 };
  const harmony = { home: s => homes[s.id] }, U = createUndo(bus, music), sys = { toS: (x, y) => ({ x, y, s: 1 }), ohmAt: () => null };
  sim.spawn = (x, y, seed, born) => { const o = { id: 100 + sim.ohms.length, seed, scale: 'ohm', body: { x, y, vx: 0, vy: 0 }, born }; sim.ohms.push(o); sim.byId.set(o.id, o); return o; };
  bus.on('recipe', ev => { ev.src.recipe = ev.rec.id; ev.src.seed = ev.rec.seed; }); const aj = { jams: [] }, T = createTeach(sim, bus, music, harmony, aj, sim.brain, U, sys, { cool: 4, bars: 3 }); const [o1, o2, o3] = sim.ohms;
  sim.brain.remember(o1, 'pattern', 'p1', { rh: [1, 0, 1, 0], iv: [0, 2], len: 4 }, .9); sim.brain.remember(o1, 'pattern', 'p2', { rh: [1, 1, 0, 0], iv: [0, 4], len: 4 }, .5);
  let n = 0; while (!(o2.epi && o2.epi.key != null) && n < 6) { T.teach(o1, o2); n++; } ok(o2.epi.key === 7 && harmony.home(o2) === 7, 'teach line: B learns A\'s key in ' + n + ' lesson(s) (learn gene ' + learnGene(o2.seed).toFixed(2) + ')');
  ok(sim.brain.get(o2, 'pattern', 'p1') && sim.brain.get(o2, 'pattern', 'p2'), 'B learns A\'s strongest rhythm / melody patterns'); ok(o2.seed === 1000 + 2 * 37, 'B\'s own DNA (seed) is unchanged');
  let multi = 0; for (let sd = 1; sd < 200; sd++) if (Math.ceil(1 / learnGene(sd)) > 1) multi++; ok(multi > 20 && multi < 190, 'some ohms resist: ' + multi + '/199 need more than one lesson');
  U.undo(); ok(n > 1 ? o2.epi && o2.epi.key == null && o2.epi.acc < 1 : !o2.epi, 'undo takes the last lesson back'); U.redo(); ok(o2.epi && o2.epi.key === 7, 'redo gives it again');
  // breeding gate: out-of-key pair refuses, in-key pair breeds after `bars` bars of jamming
  for (const [x, y] of [[o1, o2]]) { x.epi = { key: 7, acc: 1 }; y.epi = { key: 7, acc: 1 }; } o1.body.vx = o3.body.vx = 0; o3.body.vx = 0;
  aj.jams = [{ a: o1, b: o3, k: .8 }]; const nb0 = sim.ohms.length; for (let i = 0; i < 4; i++) { music.b += 4; T.bar(); } ok(sim.ohms.length === nb0 && T.refused === 1 && bus.posts.some(e => e.type === 'breed.refuse'), 'out of key (7 vs 1): no child, they refuse each other');
  aj.jams = [{ a: o1, b: o2, k: .8 }]; for (let i = 0; i < 4; i++) { music.b += 4; T.bar(); } const kid = sim.ohms[sim.ohms.length - 1];
  ok(sim.ohms.length === nb0 + 1 && kid.parents && kid.parents.join() === '1,2', 'in key: after 3 bars of jamming a child is born between them');
  const kr = recipes.get(kid.recipe); ok(kr && kr.home === 7 && kid.seed === pairSeed(o1.seed, o2.seed, 0), 'the child carries the learned key (epigenetics) and the pair seed');
  ok(sim.brain.list(kid, 'pattern').length > 0, 'the child inherits note data (patterns)');
  const sv = JSON.parse(JSON.stringify(T.save())); o2.epi = null; T.load(sv); ok(o2.epi && o2.epi.key === 7, 'lessons are saved + restored');
  // the rough dissonant duet (old game Sf.clash) when an out-of-key pair refuses
  music.tonicHz = 220; music.key = 0; const n0 = bus.notes.length; T.clashT.clear(); T.duet(o1, o3); const dn = bus.notes.slice(n0).filter(e => e.clash);
  ok(dn.length === 4 && dn.filter(e => e.src === o1).length === 2 && dn.every(e => e.dur === .6), 'out of key: a short duet, each ohm its own note + a rough partial');
  const fa = dn.filter(e => e.src === o1).map(e => e.f).sort((x, y) => x - y), fb = dn.filter(e => e.src === o3).map(e => e.f).sort((x, y) => x - y);
  ok(Math.abs(fa[1] / fa[0] - 1.06) < 1e-9 && Math.abs(fb[1] / fb[0] - 1.06) < 1e-9, 'each voice has its partial 6% above (rough)');
  T.duet(o1, o3); ok(bus.notes.length === n0 + 4, 'no second duet for the same pair within 2 s'); }
// seams fitted + cadences (old game mind.js breeding)
{ const notes = [{ b: 0, d: 0 }, { b: 6, d: 1 }, { b: 12, d: 3 }, { b: 16, d: 5 }, { b: 22, d: 1 }, { b: 28, d: 6 }], f = fitSeams(notes, 16), md = d => ((d % 7) + 7) % 7;
  ok(md(f[2].d) === 0 || md(f[2].d) === 2 || md(f[2].d) === 4, 'the note before a section join (strong beat) moves to a chord tone (' + f[2].d + ')');
  ok([0, 2, 4].includes(md(f[3].d)), 'the note after a join (strong beat) moves to a chord tone (' + f[3].d + ')');
  ok(md(f[5].d) === 0, 'the phrase ends home (authentic cadence) (' + f[5].d + ')'); ok(f[1].d === 1 && f[4].d === 1, 'notes away from the seams are kept');
  ok(notes[2].d === 3 && JSON.stringify(fitSeams(notes, 16)) === JSON.stringify(f), 'fitting is deterministic and leaves the source alone');
  const half = fitSeams([{ b: 0, d: 0 }, { b: 13, d: 1 }, { b: 16, d: 2 }, { b: 30, d: 0 }], 16); ok([0, 2, 4].includes(md(half[1].d)), 'an inner section ends stable or on the dominant (half cadence) (' + half[1].d + ')'); }
// body genes from the parents (old game C.child crossover, no mutation)
{ const ra = makeRecipe(101), rb = makeRecipe(202), ga = bodyGenes(101, ra), gb = bodyGenes(202, rb), ch = bodyGenes(303, ra), dm = { a: ra.modal.p.damp, b: rb.modal.p.damp, c: ra.modal.p.damp };
  const x = inheritBody(ga, gb, 303, ch, dm); ok(['calm', 'social', 'hear', 'float', 'eyes', 'lobePh'].every(k => x[k] === ga[k] || x[k] === gb[k]), 'each body gene comes whole from one parent');
  let fromA = 0, fromB = 0; for (let sd = 1; sd < 60; sd++) { const y = inheritBody(ga, gb, sd, ch, dm); if (y.calm === ga.calm) fromA++; else if (y.calm === gb.calm) fromB++; } ok(fromA > 5 && fromB > 5, 'either parent can pass a body gene (' + fromA + '/' + fromB + ')');
  ok(JSON.stringify(inheritBody(ga, gb, 303, ch, dm)) === JSON.stringify(x), 'deterministic (no mutation)'); ok(x.soft >= 0 && x.soft <= 1, 'soft stays in range'); }
// soft bodies (softbody.js)
{ const o = deform(1, 0, 1, 0, 2, .5); ok(Math.abs(o[0] - 2) < 1e-9 && Math.abs(o[1]) < 1e-9, 'deform scales along the axis'); const p = deform(0, 1, 1, 0, 2, .5); ok(Math.abs(p[1] - .5) < 1e-9, 'and across it');
  const B = { x0: -10, x1: 10, y0: -10 }, b = { x: 0, y: -1, vx: 0, vy: 0 };
  let S = shapeOf(b, 1, [0, 1], 0, B); ok(S.sq > 0 && S.sqy === 1, 'pressed into the ground: squished flat (' + S.sq.toFixed(2) + ')'); const ring = new Float32Array(4), rest = new Float32Array([0, 1, 1, 0]); targetRing(rest, 2, S, ring); ok(ring[1] < 1 && ring[2] > 1, 'flatter + wider');
  S = shapeOf(b, 1, [10.5, -1], 0, B); ok(S.sq > 0 && S.sqx === 1, 'pushed past a world edge: squished against it');
  S = shapeOf(b, 1, [0, -3], 0, B); ok(S.st > .5 && S.sty < -.9 && !S.sq, 'a fast finger: stretched toward it');
  S = shapeOf({ x: 0, y: -3, vx: 10, vy: 0, flying: true }, 1, null, 0, B); ok(S.st > 0 && S.st <= .25 && S.stx === 1, 'flying: a little stretch along the flight');
  S = shapeOf({ x: 0, y: -3, vx: 0, vy: 0, ps: -.4 }, 1, null, 0, B); ok(S.pin < 1 && !S.st && !S.sq, 'pinched: shrinks');
  for (let k = 0; k < 30; k++) { S = shapeOf(b, 1, [Math.sin(k) * 50, Math.cos(k) * 50], 0, B); if (S.sq > .45 + 1e-9 || S.st > .6 + 1e-9) fails++; } ok(true, 'squish / stretch stay within their caps');
  ok(isFlick({ x0: 0, y0: 0, x: 60, y: 0, t0: 0 }, 100) && !isFlick({ x0: 0, y0: 0, x: 60, y: 0, t0: 0 }, 400) && !isFlick({ x0: 0, y0: 0, x: 10, y: 0, t0: 0 }, 50), 'flick: quick + far enough; a slow drag or a tap is not');
  const v = fingerVel([[0, 0, 0], [10, 0, 50], [40, 0, 80], [80, 0, 100]]); ok(v[0] > 1 && v[0] < 2 && v[1] === 0, 'flick speed from the last ~60 ms (' + v[0].toFixed(2) + ' px/ms)'); }
console.log(fails ? 'SYSTEMS FAIL ' + fails : 'SYSTEMS OK'); process.exit(fails ? 1 : 0);
