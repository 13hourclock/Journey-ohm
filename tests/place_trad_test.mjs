// v0.0.25: songs become a place's tradition (SONG_OPTS.placeTrad) + the song note spread (SONG_OPTS.spread)
import { createSongs, DEV_SONGS, barsOf } from '../www/js/songs.js';
import { fakeBus, fakeMusic, fakeSim } from './fakes.mjs';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const setup = o => { const bus = fakeBus(), M = fakeMusic(), sim = fakeSim(6), A = { jams: [], mem: new Map(), presence: () => .9 };
  const S = createSongs(sim, bus, M, {}, A, { meet: false, ...o }); sim.held = S.held; sim.ohm = sim.ohms[0]; sim.ohms[2].body.x = 1.2; return { bus, M, sim, S }; };
// 1 spread: same notes, never late, fewer per tick
const run = spread => { const E = setup({ spread }), per = []; E.S.playNear(DEV_SONGS[0].id); let late = 0;
  for (let i = 0; i < 8 * 4 * 10; i++) { E.M.b += .1; const n0 = E.bus.notes.length; E.S.tick(); const add = E.bus.notes.slice(n0); per.push(add.length); for (const n of add) if (n.beat < E.M.b - .3) late++; }
  E.S.flushQ(); return { notes: E.bus.notes.filter(n => n.song).map(n => n.beat.toFixed(3) + ':' + n.deg + ':' + n.src.id).sort(), max: Math.max(...per), late }; };
const on = run(true), off = run(false);
ok(on.notes.length > 20 && on.notes.length === off.notes.length, `spread on plays the song too (${on.notes.length} vs ${off.notes.length} notes)`);
const offSet = new Set(off.notes); ok(on.notes.filter(x => offSet.has(x)).length >= Math.min(on.notes.length, off.notes.length), 'the same notes at the same beats');
ok(on.late === 0, 'no note goes out after its time (' + on.late + ' late)');
ok(on.max < off.max, `fewer notes in one tick (max ${on.max} vs ${off.max} all at the bar line)`);
// 2 a traditional song of this planet gets picked up by a resting group that never heard it
const trad = place => { const E = setup({ placeTrad: place, tradPick: 1 }); const t = E.S.add({ ...DEV_SONGS[1], id: 'trad1', name: 'Here', origin: 'grown', trad: E.sim.world.pseed, planetSeed: E.sim.world.pseed });
  const G = E.S.playNear(DEV_SONGS[0].id); const L = barsOf(DEV_SONGS[0]).length;
  for (let i = 0; i < (L + 12) * 4 * 4; i++) { E.M.b += .25; E.S.tick(); if (G.song && G.song.id === 'trad1') break; }
  return { E, G, t }; };
{ const { E, G } = trad(true); ok(G.song && G.song.id === 'trad1', 'placeTrad on: the resting group plays the planet\'s tradition next (' + (G.song && G.song.id) + ')');
  ok(G.members.every(m => E.sim.brain.get(m, 'song', 'trad1')), 'every member now knows it (learned with drift)');
  // 3 a child of a parent who knows it knows it too, a little further off
  const p = G.members[0], c = E.sim.ohms[5], pe = E.sim.brain.get(p, 'song', 'trad1');
  E.bus.post({ type: 'breed', src: c, a: p, b: G.members[1] }); const ce = E.sim.brain.get(c, 'song', 'trad1');
  ok(ce && ce.data.drift > pe.data.drift && ce.data.kin === 1, `child inherits the tradition (drift ${pe.data.drift.toFixed(2)} -> ${ce && ce.data.drift.toFixed(2)})`);
  ok(!E.sim.brain.get(c, 'song', DEV_SONGS[0].id) || E.sim.brain.get(c, 'song', DEV_SONGS[0].id).data.kin !== 1, 'a non-tradition song is not inherited'); }
{ const { G } = trad(false); ok(!(G.song && G.song.id === 'trad1'), 'placeTrad off: v0.0.24 (tradition is only a label)'); }
console.log(fails ? 'PLACE_TRAD_FAIL ' + fails : 'PLACE_TRAD_OK'); process.exit(fails ? 1 : 0);
