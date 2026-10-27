// v0.0.27 R5.4 special abilities (www/js/abilities.js): rarity (~0.6% each, ABILITIES.md), heritable (two carriers always pass it),
// existing ohms unchanged (a separate gene stream), and each of the 7 wave-1 abilities does its thing vs. the switch off.
// v0.0.28 wave 2 (11-15): conducting, composing, weaving, memory keeping, gravity dancing; old saves get the new genes from the seed.
import { fakeBus, fakeMusic, fakeSim } from './fakes.mjs';
import { createAbilities, abilitiesOf, abilityGenes, inheritAbility, ABILITIES } from '../www/js/abilities.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// 1 rarity
{ const N = 100000, n = {}; let any = 0; for (let i = 0; i < N; i++) { const a = abilitiesOf(abilityGenes((i * 2654435761) >>> 0)); const k = Object.keys(a); if (k.length) any++; for (const x of k) n[x] = (n[x] || 0) + 1; }
  ok(Object.keys(ABILITIES).every(k => n[k] / N > .004 && n[k] / N < .008), '1 each ability is rare, ~0.6% of genomes (' + Object.entries(n).map(([k, v]) => k + ' ' + (v / N * 100).toFixed(2) + '%').join(', ') + ')');
  ok(any / N < .075, `  about 1 in ${Math.round(N / any)} ohms carries one`); }
// 2 strength + heritable
{ const g = abilityGenes(5); g.hear = .99; g.creativity = .99; const a = abilitiesOf(g); ok(a.mimic > .35 && a.mimic <= 1, '2 strength by how far past the thresholds (' + a.mimic.toFixed(2) + ')');
  const g2 = { ...g, hear: .93, creativity: .93 }; ok(abilitiesOf(g2).mimic < a.mimic, '  barely past = weaker');
  let kept = 0; for (let s = 0; s < 200; s++) if (abilitiesOf(inheritAbility(g, { ...abilityGenes(9), hear: .97, creativity: .95 }, s)).mimic) kept++; ok(kept === 200, '  two carriers always pass it on (200/200)');
  let some = 0; for (let s = 0; s < 400; s++) if (abilitiesOf(inheritAbility(g, abilityGenes(77), s)).mimic) some++; ok(some > 40 && some < 160, `  one carrier passes it about 1 in 4 (${some}/400)`); }
const mk = (sw = true, more = {}) => { const sim = fakeSim(6), bus = fakeBus(), music = fakeMusic(); music.hz = (d, o) => 220 * 2 ** ((d * 2 + 12 * (o || 0)) / 12);
  const world = { env: { day: 1, wx: { cloud: 0, wind: 0 } } }, matrix = { noteOffsets: () => ({ 'note.pitch': 1 }) }; sim.ohm = sim.ohms[0];
  for (const o of sim.ohms) o._abK = 'none', o._ab = {};   // nobody carries one unless forced (the fake seeds are fixed)
  const A = createAbilities({ sim, bus, music, world, matrix, ...more }); A.opts.on = sw; return { sim, bus, music, world, matrix, A }; };
const run = (X, bars, each, b0 = 0) => { for (let b = b0; b < b0 + bars * 4; b++) { X.music.b = b; if (each) each(b); X.A.tick(); } };
// 3 echo
for (const sw of [true, false]) { const X = mk(sw), o = X.sim.ohms[1]; X.A.force(o, 'echo', 1); const vx = o.body.vx = 0; o.body.vy = 0; run(X, 4);
  const clicks = X.bus.notes.filter(n => n.ab === 'echo').length; if (sw) ok(clicks >= 2 && X.A.rings.length >= 1 && X.sim.ohms[0].glow > 0, `3 echolocation: ${clicks} clicks in 4 bars, a ring, the nearby ohm glows`); else ok(clicks === 0 && !X.A.rings.length, '  switch off: no clicks, no rings'); }
// 4 pitch
for (const sw of [true, false]) { const X = mk(sw); X.A.force(X.sim.ohms[1], 'pitch', 1); const N = X.matrix.noteOffsets(X.sim.ohms[0], {});
  if (sw) ok(N['note.pitch'] < .5, `4 perfect pitch: a nearby ohm's pitch push 1 -> ${N['note.pitch'].toFixed(2)}`); else ok(N['note.pitch'] === 1, '  switch off: unchanged'); const F = X.matrix.noteOffsets(X.sim.ohms[5], {}); if (sw) ok(F['note.pitch'] === 1, '  far ohm unchanged'); }
// 5 metro
for (const sw of [true, false]) { const X = mk(sw), m = X.sim.ohms[1]; X.A.force(m, 'metro', 1); X.music.b = 0; X.bus.note({ src: m, kind: 'note', deg: 0 }); run(X, 1);
  const ticks = X.bus.notes.filter(n => n.ab === 'metro').length; const ev = { type: 'note', src: X.sim.ohms[0], t: 5.04, lean: 40 }; X.music.b = 10; X.bus.post(ev);
  if (sw) ok(ticks >= 3 && ev.t < 5.04 && ev.t >= 5, `5 living metronome: ${ticks} ticks a bar while it plays; a 40 ms lean pulled to ${(ev.lean).toFixed(1)} ms`); else ok(ticks === 0 && ev.t === 5.04, '  switch off: no ticks, lean kept'); }
// 6 mimic
for (const sw of [true, false]) { const X = mk(sw), m = X.sim.ohms[1]; X.A.force(m, 'mimic', 1); X.music.b = 1; X.bus.note({ src: X.sim.ohm, kind: 'note', deg: 2 }); X.music.b = 2; X.bus.note({ src: X.sim.ohm, kind: 'note', deg: 4 }); X.music.b = 3; X.bus.note({ src: X.sim.ohm, kind: 'note', deg: 5 });
  for (let b = 4; b < 16; b++) { X.music.b = b; X.A.tick(); } const back = X.bus.notes.filter(n => n.ab === 'mimic');
  if (sw) ok(back.length === 3 && back.every(n => n.src === m) && back.map(n => n.deg).join() === '2,4,5', `6 mimicry: your 3-note phrase comes back from the mimic (${back.map(n => n.deg).join(',')}) at beat ${back[0] && back[0].beat}`); else ok(back.length === 0, '  switch off: no echo'); }
// 7 overtone
for (const sw of [true, false]) { const X = mk(sw), o = X.sim.ohms[1]; X.A.force(o, 'overtone', 1); X.bus.note({ src: o, kind: 'note', deg: 0, vel: .6, t: 1 }); const h = X.bus.notes.filter(n => n.ab === 'overtone');
  if (sw) ok(h.length === 1 && Math.abs(h[0].f - 660) < 1 && h[0].vel < .2, `7 overtone singing: a quiet 3rd harmonic (${h[0] && h[0].f.toFixed(0)} Hz, vel ${h[0] && h[0].vel.toFixed(2)})`); else ok(h.length === 0, '  switch off: none'); }
// 8 dream
for (const sw of [true, false]) { const X = mk(sw), o = X.sim.ohms[1]; X.A.force(o, 'dream', 1); X.world.env.day = .1; run(X, 8); const night = X.bus.notes.filter(n => n.ab === 'dream').length;
  const Y = mk(sw); Y.A.force(Y.sim.ohms[1], 'dream', 1); run(Y, 8); const day = Y.bus.notes.filter(n => n.ab === 'dream').length;
  if (sw) ok(night >= 1 && day === 0, `8 dream singing: ${night} drones over 8 night bars, none by day`); else ok(night === 0, '  switch off: none'); }
// 9 storm
for (const sw of [true, false]) { const X = mk(sw), o = X.sim.ohms[1]; X.A.force(o, 'storm', 1); run(X, 3, b => { if (b % 2 === 0) X.bus.note({ src: o, kind: 'note', deg: 0 }); });
  const st = X.world.env.wx.storm || 0; if (sw) { ok(st > .3, `9 storm singing: playing near you brings rain (E.wx.storm ${st.toFixed(2)})`); run(X, 6, null, 12); ok((X.world.env.wx.storm || 0) < st * .3, '  stops when it stops'); } else ok(st === 0, '  switch off: no rain'); }
// 11 conduct (wave 2): dynamics over the 8-bar phrase + the 5 -> 1 cadence; the player's own notes untouched
for (const sw of [true, false]) { const X = mk(sw), m = X.sim.ohms[1]; X.sim.ohms[2].body.x = 3; X.A.force(m, 'conduct', 1);
  run(X, 8, b => { if (b % 2 === 0) X.bus.note({ src: m, kind: 'note', deg: 2, vel: .5 }); });
  const lo = { type: 'note', src: X.sim.ohms[2], vel: .5 }, hi = { type: 'note', src: X.sim.ohms[2], vel: .5 }, me = { type: 'note', src: X.sim.ohm, vel: .5 };
  X.music.b = 1; X.bus.note({ src: m, kind: 'note', deg: 2 }); X.bus.post(lo); X.music.b = 29; X.bus.note({ src: m, kind: 'note', deg: 2 }); X.bus.post(hi); X.bus.post(me);
  const cad = X.bus.notes.filter(n => n.ab === 'conduct').map(n => n.deg).join();
  if (sw) ok(lo.vel < .45 && hi.vel > .55 && me.vel === .5 && cad === '4,0', `11 conducting: a nearby ohm swells through the phrase (vel .5 -> ${lo.vel.toFixed(2)} at bar 1, ${hi.vel.toFixed(2)} at bar 8), yours untouched; cadence ${cad}`);
  else ok(lo.vel === .5 && hi.vel === .5 && cad === '', '  switch off: no dynamics, no cadence'); }
// 12 compose: a motif near you, passed on by the nearest ohm
for (const sw of [true, false]) { const X = mk(sw), c = X.sim.ohms[1]; X.sim.ohms[2].body.x = 3; X.A.force(c, 'compose', 1); run(X, 24);
  const own = X.bus.notes.filter(n => n.ab === 'compose' && n.src === c), pass = X.bus.notes.filter(n => n.ab === 'compose' && n.src === X.sim.ohms[2]);
  if (sw) ok(own.length >= 4 && pass.length >= 4 && pass.slice(0, 4).map(n => n.deg).join() === own.slice(0, 4).map(n => n.deg).join() && X.bus.notes.every(n => n.ab !== 'compose' || n.src !== X.sim.ohm),
    `12 composing: a motif (${own.slice(0, 4).map(n => n.deg).join(',')}) and the nearest ohm plays it back 2 bars later (${pass.slice(0, 4).map(n => n.deg).join(',')}); never from your ohm`);
  else ok(own.length + pass.length === 0, '  switch off: none'); }
// 13 weave: one string per weaver, above it, kept through save / load
for (const sw of [true, false]) { const made = [], things = { make: (k, P, e) => { made.push({ k, P, e }); return { id: 't' + made.length }; } }, X = mk(sw, { things }), w = X.sim.ohms[1]; X.A.force(w, 'weave', 1); run(X, 40);
  if (sw) { const P = made[0] && made[0].P; ok(made.length === 1 && made[0].k === 'string' && P.every(q => q.y < w.body.y) && Math.hypot(P[4].x - P[0].x, 0) > .9 && made[0].e.grown, `13 weaving: one string spun above the weaver in 40 bars (length ${P && (P[4].x - P[0].x).toFixed(2)})`);
    const Y = mk(true, { things }); Y.A.force(Y.sim.ohms[1], 'weave', 1); Y.A.load(JSON.parse(JSON.stringify(X.A.save()))); run(Y, 40); ok(made.length === 1, '  a weaver spins only once, also after save / load'); }
  else ok(made.length === 0, '  switch off: none'); }
// 14 memkeep: the oldest song comes back when none plays near you
for (const sw of [true, false]) { const played = [], songs = { lib: new Map([['new', { id: 'new', made: 5 }], ['old', { id: 'old', made: 1 }]]), groups: [], playNear: id => { played.push(id); return {}; } };
  const X = mk(sw, { songs }); X.A.force(X.sim.ohms[1], 'memkeep', 1); run(X, 40);
  const busy = { ...songs, groups: [{ state: 'song', members: [X.sim.ohms[1]] }] }, Y = mk(sw, { songs: busy }); Y.A.force(Y.sim.ohms[1], 'memkeep', 1); run(Y, 40);
  if (sw) ok(played.join() === 'old', `14 memory keeping: the oldest song revived once in 40 bars (${played.join()}), not while a song plays near you`); else ok(played.length === 0, '  switch off: none'); }
// 15 gravity: a moving ohm near it curves; still and far ones do not
for (const sw of [true, false]) { const X = mk(sw), g = X.sim.ohms[1], p = X.sim.ohms[2], q = X.sim.ohms[3]; X.A.force(g, 'gravity', 1); p.body.x = 3; p.body.y = 0; p.body.vx = .5; p.body.vy = 0; q.body.vx = .5; q.body.vy = 0; run(X, 1);
  if (sw) ok(Math.abs(p.body.vy) > .05 && q.body.vy === 0 && !X.sim.ohm.body.vy, `15 gravity dancing: a passing ohm's path bends (vy 0 -> ${p.body.vy.toFixed(3)}), a far one does not, yours is left alone`);
  else ok(p.body.vy === 0, '  switch off: no bend'); }
// 10 existing ohms unchanged + persistence
{ const X = mk(true); X.sim.ohms[2]._abK = null; const a0 = abilityGenes(X.sim.ohms[2].seed); ok(JSON.stringify(X.A.genes(X.sim.ohms[2])) === JSON.stringify(a0) && X.sim.ohms[2].seed === 1000 + 3 * 37, '10 ability genes are a separate stream (seed, body, sound unchanged)');
  const p = X.sim.ohms[1], q = X.sim.ohms[2], kid = { id: 1001, seed: 4242, scale: 'ohm', body: { x: 0, y: 0 } }; X.bus.post({ type: 'breed', src: kid, a: p, b: q, seed: 4242 }); const s = X.A.save();
  const old = { ...X.A.genes(kid) }; delete old.mass; const Z = mk(true); Z.A.load({ kids: [[1001, old]] }); ok(Z.A.genes(kid).mass === abilityGenes(4242).mass && Z.A.genes(kid).hear === old.hear, '  a child saved before a gene existed gets it from its own seed');
  const Y = mk(true); Y.A.load(JSON.parse(JSON.stringify(s))); ok(JSON.stringify(Y.A.genes(kid)) === JSON.stringify(X.A.genes(kid)) && JSON.stringify(X.A.genes(kid)) !== JSON.stringify(abilityGenes(4242)), '  a child keeps its inherited genes through save / load'); }
console.log(fails ? `ABILITIES FAIL (${fails})` : 'ABILITIES OK'); process.exit(fails ? 1 : 0);
