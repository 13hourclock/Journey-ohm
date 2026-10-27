// TRADITIONS wave 1 (PLAN_TRADITIONS.md): pick, lean, tuning, tempo ratio, feel, cycles, accent, drone, songs, undo, ohm stamps, aura hooks. node tests/traditions_test.mjs
import { createMusic, createHarmony, TUNINGS } from '../www/js/music.js';
import { createEvents } from '../www/js/events.js';
import { CYCLES, TRAD_CYCLE, cycleInfo, roleWeights } from '../www/js/drums.js';
import { PLACE } from '../www/js/instruments.js';
import { TRADS, TRAD_IDS, TRAD_OPTS, planetTradition, createTraditions, tempoKFor, slots7, degWOf } from '../www/js/traditions.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
let now = 0; const M = createMusic(() => now), bus = createEvents(M), H = {};
const world = { pseed: 1, home: { trad: null }, terrOf: L => L };
const sim = { ohms: [], world };
const ohm = (calm, wild) => ({ scale: 'ohm', g: { calm }, wild, body: { x: 0, y: 0 } });
// 1 the eight, equal base
ok(TRADS.length === 8 && TRAD_IDS.join() === 'western,hindustani,maqam,gamelan,japan,wafrica,celtic,techno', 'eight traditions in order');
const cnt = {}; for (let s = 1; s <= 8000; s++) { const T = planetTradition(s * 7919 + 3, null); cnt[T.id] = (cnt[T.id] || 0) + 1; }
ok(Object.values(cnt).every(n => n > 850 && n < 1150), 'equal base spawn: each ~1/8 with no land lean ' + JSON.stringify(cnt));
const land = new Float32Array(8); land[4] = 1; const cg = {}; for (let s = 1; s <= 4000; s++) { const T = planetTradition(s * 7919 + 3, land); cg[T.id] = (cg[T.id] || 0) + 1; }
ok(cg.gamelan > 1100 && cg.gamelan < 1700 && Object.keys(cg).length === 8, 'gamelan land leans to gamelan (' + cg.gamelan + '/4000) but every tradition still shows up');
ok(JSON.stringify(planetTradition(4242, land)) === JSON.stringify(planetTradition(4242, land)), 'deterministic per planet');
// 2 every recipe is well formed
for (const D of TRADS) { const bad = []; for (const [nm, c] of D.scales) { const t = TUNINGS['trad.' + D.id + '.' + nm]; if (!t || t.ratios.length !== 7 || t.notes.length !== c.length) bad.push(nm); }
  for (const tp of D.tempos) if (tp[2] && tp[2].cycle && !CYCLES[tp[2].cycle]) bad.push(tp[2].cycle);
  for (const c of D.song.cells) if (Math.abs(c.reduce((a, b) => a + b, 0) - 4) > 1e-9) bad.push('cell'); ok(!bad.length, D.name + ': tunings 7-slot, cycles exist, hook cells fill a bar ' + bad.join()); }
ok(slots7([0, 231, 474, 717, 955]).every((c, i, a) => i === 0 || c >= a[i - 1]), 'slendro 5 -> 7 slots stay in order');
ok(TUNINGS['trad.maqam.Rast'].micro && !TUNINGS['trad.western.ionian'].micro, 'maqam flagged microtonal, western not');
ok(tempoKFor(64, 120) === 2 && tempoKFor(64, 50) === 5 / 6 || tempoKFor(64, 50) === 3 / 4, 'tempo ratio picks the nearest simple ratio');
// 3 cycles engine
for (const n of ['backbeat', 'waltz', 'hymn', 'rupak', 'jhaptal', 'maqsum', 'baladi', 'saidi', 'lancaran', 'ketawang', 'ladrang', 'ma', 'matsuri', 'jig', 'reel', 'slipjig', 'hornpipe', 'four', 'clave', 'teentaal', 'gongan'])
  if (!cycleInfo(n, 0)) ok(false, 'cycle ' + n);
ok(cycleInfo('lancaran', 15).land && cycleInfo('lancaran', 15).accent === 1 && cycleInfo('ladrang', 31).land, 'gamelan cycles land on the gong (last beat)');
ok(cycleInfo('teentaal', 0).land && cycleInfo('jhaptal', 10).land, 'tala cycles land on sam');
// 4 the engine applies and undoes
M.setTuning('om-JI-7'); const bpm0 = M.bpm; world.pseed = 777; const R = createTraditions({ sim, bus, music: M, harmony: H, world });
let T = R.cur; ok(T && R.applied && M.tuning === T.tuning, 'applied ' + T.name + ' (' + T.scale + ', ' + T.tempoName + ')');
ok(Math.abs(M.bpm - bpm0 * tempoKFor(M.om, T.bpm)) < 1e-9 && M.lock, 'tempo = om x simple ratio (' + M.bpm.toFixed(1) + ' BPM), om lock kept');
ok(M.tradFeel === T.tight && M.tradDiv === T.div && M.trad === T, 'feel set');
ok(PLACE.trad[T.pal] === 1 && Object.keys(PLACE.trad).length === 1, 'instrument lean set on ' + T.pal);
ok(world.tradition && world.tradition(777) === T.songShape, 'songs take the tradition shape');
// plant each one: check its parts
for (const id of TRAD_IDS) { R.plant(id); R.tick(); const C = R.cur; ok(C.id === id && M.tuning === C.tuning && (!C.cycle || TRAD_CYCLE[C.pal] === C.cycle) && (C.harm !== 'drone' || H.tonicPull === 1.5) && (C.harm === 'drone' || !H.tonicPull) && !H.hold,
  'plant ' + id + ': ' + C.scale + ', ~' + C.bpm + ' -> ' + M.bpm.toFixed(0) + ' BPM, cycle ' + C.cycle + ', ' + C.harm); }
// accent: cycle weight scales loudness, never drops
R.plant('techno'); R.tick(); const o = ohm(.5); sim.ohms.push(o); R.stamp(o); const seen = []; bus.on('note', ev => seen.push(ev));
const b0 = Math.ceil(M.beat()) + 8; const e1 = { src: o, kind: 'note', deg: 0, vel: .5, t: M.timeOfBeat(b0) }, e2 = { src: o, kind: 'note', deg: 0, vel: .5, t: M.timeOfBeat(b0 + .25) };
bus.note(e1); bus.note(e2); bus.flush && bus.flush(); ok(e1.vel > e2.vel && e2.vel > 0, 'cycle accent: downbeat louder than offbeat (' + e1.vel.toFixed(2) + ' / ' + e2.vel.toFixed(2) + ')');
// ohm stamps
const w = ohm(.35, true); sim.ohms.push(w); bus.post({ type: 'world.life', src: w, u: 0 }); bus.flush && bus.flush();
ok(o.tradId === 'techno' && o.tradition && o.tradition.id === 'techno' && o.rarity === 0 && o.tier === 0 && w.tradId === 'techno' && w.tradition.id === 'techno' && w.rarity === 1, 'ohms carry tradition / rarity / tier (rare.js shapes); the wild ohm carries the planet tradition');
{ const q = { scale: 'ohm', g: { calm: .5 } }; R.stamp(q); q.rarity = 1; q.tier = 3; ok(q.rarity === 1 && q.tier === 3, 'rare.js can write rarity / tier over the fallbacks'); }
ok(Math.abs(w.lively - 1) < 1e-9 && Math.abs(o.lively - .7) < 1e-9, 'lively 0..1 from calm');
// aura hooks (neutral)
const F = R.feed(); ok(F && F.auraPalette.length >= 4 && F.auraPalette.length <= 6 && ['glow', 'line', 'fill', 'accent'].every(k => F.auraRoles[k] && F.auraRoles[k].length === 3), 'aura palette: 4-6 linear RGB with glow / line / fill / accent roles');
const P = F.auraPattern; ok(P.kind === 'grid' && P.fold && P.density != null && P.speed > 0 && P.beatLock === R.cur.tight && P.rings.length && P.rings[0].speed != null && P.pulse.period === 4 && P.pulse.phase === 0, 'aura pattern fields incl. rings[] and pulse');
ok(F.cycle && F.cycle.name === 'four' && typeof F.offScale === 'boolean', 'feed: cycle position + off-scale flag');
const kinds = TRAD_IDS.map(id => planetTradition(5, null, TRAD_OPTS, id).auraPattern.kind).join(); ok(kinds === 'tracery,lotus,lattice,rings,waves,weave,knot,grid', 'pattern kinds ' + kinds);
ok(planetTradition(5, null, TRAD_OPTS, 'hindustani').timeOfDay != null && planetTradition(5, null, TRAD_OPTS, 'western').timeOfDay == null, 'ragas carry timeOfDay');
// toggles + undo
TRAD_OPTS.enabled.techno = false; R.plant(null); for (let s = 1; s < 60; s++) { world.pseed = s; R.tick(); if (R.cur.id === 'techno') { ok(false, 'disabled tradition picked'); break; } } TRAD_OPTS.enabled.techno = true;
world.pseed = 9; R.refresh(); TRAD_OPTS.on = false; R.refresh(); ok(!R.applied && M.tuning === 'om-JI-7' && M.tempoK === 1 && M.tradFeel == null && M.swing === 0 && !world.tradition && !Object.keys(PLACE.trad).length && TRAD_CYCLE.wafrica === 'bell' && !H.tonicPull, 'master off restores everything');
ok(Math.abs(M.bpm - bpm0) < 1e-9, 'tempo back to the om');
TRAD_OPTS.on = true; R.refresh(); ok(R.applied, 'back on');
// swing in the snap grid
M.jam = { div: 4, snap: 1 }; M.swing = 0; const tb = M.timeOfBeat(Math.floor(M.beat()) + 2.24); const s0 = M.beat(M.when(tb)); M.swing = .5; const s1 = M.beat(M.when(tb)); M.jam = null; M.swing = 0;
ok(Math.abs(s0 % 1 - .25) < 1e-6 && s1 % 1 > .25, 'swing moves off-beat snap lines late (' + (s0 % 1).toFixed(3) + ' -> ' + (s1 % 1).toFixed(3) + ')');
// Music Theory #2-#15 values
{ const sc = (t, n) => TRADS.find(d => d.id === t).scales.find(x => x[0] === n), tp = (t, n) => TRADS.find(d => d.id === t).tempos.find(x => x[0] === n), D = id => TRADS.find(d => d.id === id);
  ok(sc('maqam', 'Rast')[1].join() === '0,204,355,498,702,906,1055' && sc('maqam', 'Bayati')[1].join() === '0,145,294,498,702,792,996' && sc('maqam', 'Hijaz')[1].join() === '0,112,386,498,702,792,996'
    && sc('maqam', 'Saba')[1].join() === '0,140,294,390,702,792,996' && sc('maqam', 'Nahawand')[1].join() === '0,200,300,500,700,800,1100' && sc('hindustani', 'Bhairav')[1].join() === '0,90,386,498,702,792,1088', 'maqamat + Bhairav cents (#3-#7)');
  ok(D('hindustani').drone.join() === '0,4' && D('gamelan').drone.join() === '0,4' && D('maqam').drone.join() === '0,4' && D('japan').drone.join() === '0,4', 'per-tradition drone = tonic + fifth SLOT (#2, follow-up 3)');
  ok([['Rast', '0,4'], ['Bayati', '0,3'], ['Hijaz', '0,3'], ['Saba', '0,2'], ['Nahawand', '0,4']].every(([n, d]) => sc('maqam', n)[2].drone.join() === d) && sc('japan', 'iwato')[2].drone.join() === '0,3', 'per-scale drone: maqam ghammaz, iwato [0,3] (no tritone)');
  for (const id of ['maqam', 'japan', 'hindustani']) for (let s0 = 1; s0 < 40; s0++) { const t = planetTradition(s0, null, TRAD_OPTS, id); const x = sc(id, t.scale)[2]; if (t.drone.join() !== ((x && x.drone) || D(id).drone).join()) { ok(false, 'planet drone ' + id + ' ' + t.scale); break; } }
  ok(degWOf({ focus: [0, 4, 0] }).join() === degWOf({ focus: [0, 4] }).join() && degWOf({ focus: [0, 4, 0] })[0] === 1.5, 'focus de-duplicated: a repeat counts once (x1.5, not x2.25)');
  ok(sc('hindustani', 'Kafi')[2].focus.join() === '0,4' && sc('hindustani', 'Bhairavi')[2].focus.join() === '0,3', 'Kafi [0,4], Bhairavi [0,3]');
  ok(CYCLES.teentaal.grid === 2 && CYCLES.teentaal.at((9 - 1) * 2).colour === .6 && !CYCLES.teentaal.at(16).low && CYCLES.jhaptal.grid === 2 && CYCLES.jhaptal.at((6 - 1) * 2).colour === .6 && !CYCLES.jhaptal.at(10).low, 'khali on beat 9 (teentaal) / beat 6 (jhaptal), counted from 1, no bass');
  const yam = planetTradition(3, null, TRAD_OPTS, 'hindustani'); ok(yam.drone && yam.focus && yam.degW && yam.degW[yam.focus[0]] > 1 && Math.min(...yam.degW) >= 1, 'raga focus = weights only (' + yam.scale + ' ' + yam.focus + ')');
  ok(sc('hindustani', 'Bhairav')[2].focus.join() === '0,5,1' && sc('maqam', 'Saba')[2].focus.join() === '0,2', 'focus degrees (#8)');
  ok(sc('gamelan', 'pelog bem')[2].w.join() === '1,1,1,0.3,1,1,0.3' && sc('gamelan', 'pelog barang')[2].w.join() === '0.3,1,1,0.3,1,1,1' && TUNINGS['trad.gamelan.pelog barang'] && !sc('gamelan', 'pelog'), 'pelog bem / barang (#9)');
  ok(tp('hindustani', 'madhya rupak')[2].len === 7 && tp('hindustani', 'jhaptal')[2].len === 5 && tp('gamelan', 'ladrang')[2].len === 8 && tp('western', 'waltz')[2].len === 6 && D('celtic').song.len === 4 && tp('celtic', 'slip jig')[2].len === 6, 'song lengths land on sam / gong (#10-#12)');
  for (const [t, n, cyc] of [['hindustani', 'madhya rupak', 'rupak'], ['hindustani', 'jhaptal', 'jhaptal'], ['gamelan', 'ladrang', 'ladrang'], ['western', 'waltz', 'waltz'], ['celtic', 'slip jig', 'slipjig']]) { const L = tp(t, n)[2].len * 4; ok(L % CYCLES[cyc].beats === 0, n + ': ' + L + ' beats = ' + L / CYCLES[cyc].beats + ' cycles'); }
  ok(tp('gamelan', 'lancaran')[1] === 90 && tempoKFor(64, 90) === 3 / 2 && tp('celtic', 'hornpipe')[1] === 76 && tempoKFor(64, 76) === 5 / 4 && tp('celtic', 'hornpipe')[2].swing === 1 && CYCLES.hornpipe.beats === 2 && CYCLES.hornpipe.grid === 4, 'lancaran 3/2, hornpipe in 2 at 5/4 with the 2:1 lilt (#11, #13)');
  ok(tp('celtic', 'reel')[2].swing === .3 && tp('techno', 'house')[2].swing === .35 && !tp('techno', 'techno')[2].swing && D('celtic').dens === 1.2, 'swing + celtic density (#14, #15)');
  ok(CYCLES.teentaal.at(16).colour === .6 && CYCLES.jhaptal.at(10).colour === .6 && CYCLES.lancaran.at(0).time === .5 && CYCLES.ketawang.at(1).time === .5 && CYCLES.ladrang.at(29).time === .5 && CYCLES.four.at(2).time === .6, 'khali .6, kethuk .5, techno hats .6 (#15)');
  M.jam = { div: 4, snap: 1 }; M.swing = 1; const b2 = Math.floor(M.beat()) + 2; const sw = M.beat(M.when(M.timeOfBeat(b2 + .24))) - b2; M.jam = null; M.swing = 0; ok(Math.abs(sw - 1 / 3) < 1e-6, 'swing 1: the off 16th sits at 1/3 = dotted 2:1 (' + sw.toFixed(3) + ')'); }
// Music Theory #1: a jam on a raga (drone) planet CAN change key (no hold; a 1.5-vote tonic pull, pivot key moves stay on)
{ let t2 = 0; const M2 = createMusic(() => t2), bus2 = createEvents(M2), w2 = { pseed: 5, home: { trad: null }, terrOf: L => L, opts: { harm: { on: true, keys: true, bars: 1 } } };
  const H2 = createHarmony(w2, bus2, M2), R2 = createTraditions({ sim: { ohms: [], world: w2 }, bus: bus2, music: M2, harmony: H2, world: w2 }); R2.plant('hindustani'); R2.tick();
  const k0 = M2.key, c0 = M2.chord.root; ok(R2.cur.id === 'hindustani' && H2.tonicPull === 1.5 && (!H2.hold || !H2.hold()) && c0 === 0, 'raga planet: drone start chord, tonic pull 1.5, no hold');
  const ps = [1, 2, 3].map(i => ({ id: 900 + i, scale: 'ohm', home: (k0 + 7) % 12 }));
  for (const o of ps) for (const d of [4, 6, 1, 5]) bus2.note({ src: o, kind: 'note', deg: d, oct: 0, vel: .5, dur: .5 });
  const moved = H2.step(); ok(moved && M2.key === (k0 + 7) % 12 && H2.keyMoves === 1, 'a jam on a raga planet changes key (' + k0 + ' -> ' + M2.key + ', chord ' + M2.chord.root + ')');
  for (const o of ps) for (const d of [0, 2, 4]) bus2.note({ src: o, kind: 'note', deg: d, oct: 0, vel: .5, dur: .5 }); H2.step(); ok(H2.moves === 2, 'and the chord keeps moving'); TRAD_OPTS.on = false; R2.refresh(); TRAD_OPTS.on = true; ok(H2.tonicPull === 0, 'off: no tonic pull'); }
console.log(fails ? fails + ' FAIL' : 'all ok'); process.exit(fails ? 1 : 0);
