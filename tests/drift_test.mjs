// LEARNING DRIFT (Music Theory + Wilbow 10:52, default ON): per song an ohm's own sound moves <= 2% toward the instruments it jammed with,
// split by time together, capped at 25% rising smoothly to 50% by 40 songs (MT 11:33), no random part, kept in its brain (never fades).
import { createMusic } from '../www/js/music.js';
import { createBrain } from '../www/js/brain.js';
import { createBlend } from '../www/js/blend.js';
import { OPTS, makeRecipe, voicesFor } from '../www/js/recipe.js';
import { instP } from '../www/js/instruments.js';
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
let T = 0; const music = createMusic(() => T), bus = { on() {}, ctl() {} };
const mk = (id, inst) => { const r = makeRecipe(id, { add: true }); r.inst = inst; return { id, seed: 500 + id, scale: 'ohm', recipe: r.id, body: { x: id * .5, y: 0 } }; };
const A = mk(1, { a: 'harp_pluck', b: 'harp_pluck', w: 0, s: 1 }), Bo = mk(2, { a: 'cello_bow', b: 'cello_bow', w: 0, s: 1 }), Co = mk(3, { a: 'saron', b: 'saron', w: 0, s: 1 });
const world = { opts: JSON.parse(JSON.stringify(OPTS)), sources: [A, Bo, Co] }, R = createBrain(world, music), B = createBlend(world, bus, music, R);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const d = world.opts.blend.drift; ok(d && d.on && d.step === .02 && d.cap === .25, 'drift ON by default: 2% per song, 25% cap');
// one song: A plays 24 bars with B, 8 of them also with C
const bar = (who) => { for (const o of who) B.n.set(o, 4); T += 4 * 60 / music.bpm; B.bar(); };
const song = () => { for (let i = 0; i < 24; i++) bar(i < 8 ? [A, Bo, Co] : [A, Bo]); for (let i = 0; i < 8; i++) bar([]); };
song(); const dr = k => (R.get(A, 'drift', k + '|' + k + '|0.00') || { strength: 0 }).strength, b1 = dr('cello_bow'), c1 = dr('saron');
ok(b1 + c1 > .015 && b1 + c1 <= .02 + 1e-9, `one song: total drift ${(b1 + c1).toFixed(4)} (<= 0.02)`);
ok(b1 > c1 * 2.5, `weighted by time together: cello ${b1.toFixed(4)} vs saron ${c1.toFixed(4)} (24 vs 8 bars)`);
const A2 = mk(4, A.recipe && { a: 'harp_pluck', b: 'harp_pluck', w: 0, s: 1 }); A2.seed = 999; world.sources.push(A2);
ok(!R.list(A2, 'drift').length, 'an ohm that jammed with no one does not drift (no random part)');
for (let s = 0; s < 30; s++) song(); let tot = 0; for (const e of R.list(A, 'drift')) tot += e.strength; { const ss = n => { const u = Math.min(1, Math.max(0, (n - 1) / 39)); return .25 + .25 * u * u * (3 - 2 * u); }; ok(tot > ss(29) - .021 && tot <= ss(31) + 1e-9, `cap rises smoothly (MT 11:33: 25% -> 50% by 40 songs, no step): ${tot.toFixed(3)} after 31 songs (curve ${ss(31).toFixed(3)})`); ok(ss(1) === .25 && ss(40) === .5 && [...Array(40).keys()].every(n => ss(n + 2) - ss(n + 1) < .02), 'cap curve: 25% at the start, 50% at 40 songs, no jump between songs'); }
for (let s = 0; s < 40; s++) song(); tot = 0; for (const e of R.list(A, 'drift')) tot += e.strength; ok(tot > .25 && tot <= .5 + 1e-9, `very experienced (71 songs): cap lifted (${tot.toFixed(3)})`);
const n0 = tot; for (let i = 0; i < 4000; i++) { T += 4 * 60 / music.bpm; R.bar(); } tot = 0; for (const e of R.list(A, 'drift')) tot += e.strength; ok(Math.abs(tot - n0) < 1e-9, 'drift never fades (only learning changes it)');
// it reaches the sound: A's instrument params move toward cello, own sound stays the larger part
const rA = (await import('../www/js/recipe.js')).recipes.get(A.recipe), dl = B.driftFor(A), v0 = voicesFor(rA, { f: 220, vel: .7, src: 1 }, {}).find(m => m.t === 'inst'), v1 = voicesFor(rA, { f: 220, vel: .7, src: 1 }, {}, dl).find(m => m.t === 'inst');
const Pc = instP({ a: 'cello_bow', b: 'cello_bow', w: 0, s: 1 }); ok(v0 && v1 && Math.abs(v1.P.bow - Pc.bow) < Math.abs(v0.P.bow - Pc.bow) && v1.P.bow < Pc.bow * .6, `drift moves the sound toward cello (bow ${v0.P.bow.toFixed(2)} -> ${v1.P.bow.toFixed(2)}, cello ${Pc.bow.toFixed(2)})`);
R.save(); const A3 = { ...A, brain: null }; world.sources = [A3]; ok(R.list(A3, 'drift').length >= 2, 'saved with the ohm');
console.log(fails ? `DRIFT_FAIL ${fails}` : 'DRIFT_OK'); process.exit(fails ? 1 : 0);
