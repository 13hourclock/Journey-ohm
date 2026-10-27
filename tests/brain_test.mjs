// brain: an open memory store per ohm ({kind, key, data, strength, lastUsed}); any kind; fades only after long unused; saved with the ohm.
import { createMusic } from '../www/js/music.js';
import { createBrain } from '../www/js/brain.js';
import { OPTS } from '../www/js/recipe.js';
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
let T = 0; const music = createMusic(() => T), o = { id: 3, seed: 1234, scale: 'ohm' }, world = { opts: JSON.parse(JSON.stringify(OPTS)), sources: [o] }, R = createBrain(world, music);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const p = R.remember(o, 'pattern', 'a', { rh: [0, 1], iv: [2] }, .5); R.remember(o, 'place', 'pond', { x: 4 }, .2); R.remember(o, 'song', 'x', null, .1);
ok(R.list(o).length === 3 && R.get(o, 'place', 'pond').data.x === 4, 'any kind, no schema change (pattern, place, song)');
const bars = n => { for (let i = 0; i < n; i++) { T += 4 * 60 / music.bpm; R.bar(); } };
bars(10); ok(p.strength === .5, 'used recently -> no fade (no timer changing it)');
bars(12); ok(p.strength < .5, `long unused -> fades (${p.strength.toFixed(3)})`); const s1 = p.strength; R.use(p); bars(10); ok(p.strength === s1, 'played from it -> fresh again');
R.save(); const o2 = { id: 9, seed: 1234, scale: 'ohm' }; world.sources = [o2]; ok(R.get(o2, 'pattern', 'a') && R.get(o2, 'place', 'pond'), 'saved with the ohm: same seed comes back with its brain');
// v0.0.7 retention by use (opts.brain.retain, off by default = the fade above)
ok(world.opts.brain.retain === false, 'retain off by default (current behaviour)');
const c = world.opts.brain; c.retain = true; const o3 = { id: 21, seed: 77, scale: 'ohm' }; world.sources = [o3];
const secs = s => bars(Math.round(s / (4 * 60 / music.bpm)));
const h = R.remember(o3, 'pattern', 'heard', { rh: [0], iv: [] }, 1), pl = R.remember(o3, 'pattern', 'played', { rh: [0], iv: [] }, 1); R.use(pl); R.use(pl);
secs(240); ok(h.strength < .25 && pl.strength >= 1.5, `4 min later: only-heard faded (${h.strength.toFixed(2)}), played kept (${pl.strength.toFixed(2)})`);
o3.brainMod = { keep: 1.5 }; const h2 = R.remember(o3, 'pattern', 'h2', null, 1); secs(120); const kHi = h2.strength; o3.brainMod = { keep: 0 }; const h3 = R.remember(o3, 'pattern', 'h3', null, 1); secs(120);
ok(kHi > h3.strength, `context (brain.keep) sets how long: keep 1.5 -> ${kHi.toFixed(2)}, keep 0 -> ${h3.strength.toFixed(2)} after 2 min`);
// a long part: 32 bars, 4-bar sections, the A section repeats (twice transposed)
const sec = (s0, tr) => [0, .5, 1, 1.5, 2, 3, 3.5].flatMap((x, i) => [0, 4, 8, 12].map(bb => ({ b: s0 + bb + x, d: tr + ((i * 3 + bb) % 9), oct: 0, dur: .5, vel: .7 })));
const notes = [...sec(0, 0), ...sec(16, 0), ...sec(32, 2), ...sec(48, 0).map(n => ({ ...n, d: n.d + 1 })), ...sec(64, 0), ...sec(80, 0), ...sec(96, 2), ...sec(112, 5)].sort((a, b) => a.b - b.b);
let t0 = performance.now(); const ph = R.phrase(o3, notes, .5); const tPh = performance.now() - t0;
const back = R.phraseNotes(ph); ok(back.length === notes.length && back.every((n, i) => Math.abs(n.b - notes[i].b) < 1e-9 && n.d === notes[i].d), `32-bar part stored + read back exactly (${notes.length} notes)`);
const uniq = Object.keys(o3.brain.sec).length; ok(uniq < ph.data.secs.length, `repeated sections stored once: ${ph.data.secs.length} sections -> ${uniq} stored (${R.notes(o3)} notes kept for ${notes.length})`);
ok(o3.brain.sec[Object.keys(o3.brain.sec)[0]].p.length === 8 * o3.brain.sec[Object.keys(o3.brain.sec)[0]].n, '8 bytes per note');
// capacity: fill well past the cap; the weakest, least recently played go first, the repertoire stays
c.cap = 2000; const cap = R.capOf(o3); R.use(ph); R.use(ph);
let lc = 9; const rnd = () => (lc = (lc * 1103515245 + 12345) >>> 0) / 4294967296;
for (let i = 0; i < 80; i++) R.phrase(o3, notes.map(n => ({ ...n, d: Math.floor(rnd() * 14) - 7 })), .1 + (i % 5) * .05);
ok(R.notes(o3) <= cap && R.list(o3, 'phrase').includes(ph), `full: ${R.notes(o3)} notes <= cap ${cap} (gene-scaled), its played part kept`);
// cost: per-bar update for 200 ohms with full brains, memory + save size per ohm
const many = []; for (let i = 0; i < 200; i++) { const x = { id: 100 + i, seed: 500 + i, scale: 'ohm', brain: { e: JSON.parse(JSON.stringify(o3.brain.e)), sec: o3.brain.sec } }; many.push(x); } world.sources = many;
t0 = performance.now(); for (let i = 0; i < 20; i++) { T += 2; R.bar(); } const perBar = (performance.now() - t0) / 20;
const bytes = R.sizeOf(o3);
console.log(`COST per-bar brain update, 200 ohms (${R.list(o3).length} entries each): ${perBar.toFixed(2)} ms; store one 32-bar part: ${tPh.toFixed(2)} ms; one full ohm: ${R.notes(o3)} notes, ~${(bytes / 1024).toFixed(1)} KB saved (packed notes ${Object.values(o3.brain.sec).reduce((a, x) => a + x.p.length, 0)} B)`);
ok(perBar < 2, 'per-bar update stays small');
console.log(fails ? `BRAIN_FAIL ${fails}` : 'BRAIN_OK'); process.exit(fails ? 1 : 0);
