// v0.0.6 moving harmony + no roles + auto mix: chords move only when someone plays (no drift), every source votes equally,
// keys change only through a pivot chord, pushes work, toggles flip it all off. Generated events only (no audio).
import { createMusic, createHarmony, SEMI } from '../www/js/music.js';
import { createEvents } from '../www/js/events.js';
import { createSim } from '../www/js/sim.js';
import { createJam } from '../www/js/jam.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
let T = 0; const music = createMusic(() => T), bus = createEvents(music), sim = createSim(music, bus); sim.reseed(5); const H = createHarmony(sim, bus, music), jam = createJam(sim, bus, music);
const step = s => { for (let i = 0; i < s * 50; i++) { T += .02; H.tick(); jam.tick(); } };
step(20); ok(H.moves === 0 && music.chord.root === 0 && music.key === 0, 'nobody plays -> harmony holds (no drift)');
const A = sim.ohm, B = { id: 50, scale: 'ohm', recipe: A.recipe, body: {} };
for (let i = 0; i < 4; i++) { bus.note({ src: A, kind: 'note', deg: 3, t: T, jam: 1 }); bus.note({ src: A, kind: 'note', deg: 5, t: T, jam: 1 }); step(2); }
ok(H.moves >= 1 && music.chord.root !== 0, `players move the chord (now ${music.chord.root}, ${H.moves} moves)`);
// equal votes: one ohm hammering 20 notes counts the same as one playing 1
const W = []; for (let i = 0; i < 20; i++) bus.note({ src: A, kind: 'note', deg: 1, t: T, jam: 1 }); bus.note({ src: B, kind: 'note', deg: 4, t: T, jam: 1 });
ok(H.votes.size === 2, 'every source is one vote'); step(8.1);
// key change through a pivot: everyone plays notes of the key a fifth up (F# = semitone 6 above the om is only in that key)
B.home = 7; const k0 = music.key; for (let r = 0; r < 6; r++) { bus.note({ src: B, kind: 'note', deg: 4, t: T, jam: 1 }); step(8.1); if (music.key !== k0) break; }
ok(music.key !== k0 && H.keyMoves >= 1, `an ohm whose home is a fifth up pulls the key there through a shared chord (key ${k0} -> ${music.key}, tonic ${music.tonicHz.toFixed(1)} Hz)`);
// push: the player can push the chord
bus.post({ type: 'harmony.push', chord: 4 }); step(8.1); ok(music.chord.root === 4, `harmony.push chord V -> ${music.chord.root}`);
// toggles
sim.opts.harm.on = false; const m0 = H.moves; bus.note({ src: A, kind: 'note', deg: 2, t: T, jam: 1 }); step(16); ok(H.moves === m0, 'harmony toggle off -> holds');
sim.opts.harm.on = true; sim.opts.harm.keys = false; const kk = music.key; for (let r = 0; r < 4; r++) { for (const d of [0, 1, 2, 3, 4, 5, 6]) bus.note({ src: A, kind: 'note', deg: d + 3, t: T, jam: 1 }); step(8.1); } ok(music.key === kk, 'key-change toggle off -> same key');
// jam answers follow the chord sounding NOW (not a home chord), no roles
const got = []; bus.on('note', e => { if (e.src === jam.partner) got.push(e); }); bus.note({ src: A, kind: 'note', deg: 0, t: T }); bus.note({ src: A, kind: 'note', deg: 1, t: T + .5 }); bus.note({ src: A, kind: 'note', deg: 2, t: T + 1 });
step(10); const ch = music.chord.tones.map(t => ((t % 7) + 7) % 7);
ok(got.length && ch.includes(((got.at(-1).deg % 7) + 7) % 7), `answer resolves into the current chord ${music.chord.root} (deg ${got.length ? got.at(-1).deg : '-'})`);
ok(jam.roles === undefined, 'no lead / role state anywhere in the jam');
// jam-tuned strings (V08 D): a player tap on a tied drawn string counts as a player voice at weight feedW (.8); without feedW a thing never votes
{ const S1 = { id: 'drawn:x', scale: 'thing' }; H.votes.clear(); H.vw.clear(); bus.note({ src: S1, kind: 'note', deg: 2, f: 100, t: T }); ok(!H.votes.has('drawn:x'), 'a drawn thing struck by an ohm does not vote');
  bus.note({ src: S1, kind: 'note', deg: 2, f: 100, t: T, feedW: .8 }); ok(H.votes.has('drawn:x') && H.vw.get('drawn:x') === .8, 'a player tap on a tied string votes at .8 of a member'); H.votes.clear(); H.vw.clear(); }
let t0 = performance.now(); for (let i = 0; i < 2000; i++) H.step(); ok((performance.now() - t0) / 2000 < .05, `harmony step ${((performance.now() - t0) / 2000).toFixed(4)} ms (runs once per 2 bars)`);
console.log(fails ? 'HARM_FAIL' : 'HARM_OK');
