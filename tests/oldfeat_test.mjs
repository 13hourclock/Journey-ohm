// v0.0.29 headless checks: trippy gating, jam roles, jams that change key, watched jams grow, learned sounds, conducting, crazes,
// the audio-signal object. Each piece vs. its switch off (off = v0.0.28).
import { fakeBus, fakeMusic, fakeSim } from './fakes.mjs';
import { createTrippy, trippyTarget, stageOfZ, TRIPPY_OPTS } from '../www/js/trippy.js';
import { createJamRoles } from '../www/js/jamroles.js';
import { createJamKeys } from '../www/js/jamkeys.js';
import { createJamGrow, develop, grownLayout } from '../www/js/jamgrow.js';
import { createSongs, barsOf } from '../www/js/songs.js';
import { createDaw } from '../www/js/daw.js';
import { createLearnVoice } from '../www/js/learnvoice.js';
import { createConduct, snapTempo } from '../www/js/conduct.js';
import { createCraze } from '../www/js/craze.js';
import { createAudioSig } from '../www/js/audiosig.js';
import { createHarmony, createMusic, SEMI_MINOR } from '../www/js/music.js';
import { createSkyMood, SKYMOOD_OPTS } from '../www/js/skymood.js';
import { createPlayTwice } from '../www/js/playtwice.js';
import { createBrain } from '../www/js/brain.js';
import { createBlend } from '../www/js/blend.js';
import { createUndo } from '../www/js/undo.js';
import { createJamView } from '../www/js/jamview.js';
import { createWindRocks } from '../www/js/windrocks.js';
import { createLightPlay } from '../www/js/lightplay.js';
import { createCritters } from '../www/js/critters.js';
import { makeRecipe, withRow, recipes } from '../www/js/recipe.js';
import { cam as VCAM } from '../www/js/view.js';
import { OPTS as ROPTS } from '../www/js/recipe.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const T0 = performance.now();
// ---- 1 trippy
{ const O = { ...TRIPPY_OPTS }; ok(Math.abs(trippyTarget(O, 0, 0) - O.start) < 1e-9, `1 trippy: a new game starts at ${O.start}`);
  ok(stageOfZ(0) === 0 && stageOfZ(-1.2) === 1 && stageOfZ(-3) === 2 && stageOfZ(-5) === 3, '  scales: ground 0, planet 1, star system 2, galaxy 3');
  const h = trippyTarget({ ...O, mode: 'harmony' }, 900, 3), t = trippyTarget({ ...O, mode: 'travel' }, 900, 1), b = trippyTarget({ ...O, mode: 'both' }, 900, 1);
  ok(h > .6 && h < .7 && t > .37 && t < .4 && b > Math.max(h, t), `  harmony only ${h.toFixed(2)} (travel ignored), travel only ${t.toFixed(2)} (planet), both ${b.toFixed(2)} (either opens it)`);
  const lk = { trip: .8, real: .2 }, world = { cam: { z: 0 }, look: lk }, ctx = {}, bank = { earned: 0 }; const P = { parts: {}, register(n, p) { this.parts[n] = p; } };
  const rst = {}; const X = createTrippy({ world, bank: () => bank, ctx, st: rst, persist: P, opts: { tripWorld: true } }); X.tick(.02); ok(Math.abs(lk.trip - .8 * X.cur) < 1e-9 && ctx.trippy === X.cur && rst.trippy === X.cur, `  the world's trip .8 is scaled to ${lk.trip.toFixed(3)} and st.trippy (the field look/ reads) = ${rst.trippy.toFixed(3)}`);
{ const lk2 = { trip: .8, real: .2 }, w2 = { look: lk2, cam: { z: 0 } }, s2 = {}; const X2 = createTrippy({ world: w2, bank: () => ({ earned: 0 }), st: s2, opts: { tripWorld: true } });
  X2.tick(.02); const on = lk2.trip; X2.opts.tripWorld = false; X2.tick(.02); const off = lk2.trip; lk2.trip = .7; X2.tick(.02);
  ok(on < .1 && off === .8 && lk2.trip === .7 && s2.trippy < .1 && X2.switches().some(w => w.k === 'tripWorld' && w.get() === false), `1c tripWorld: on scales world.look.trip (.8 -> ${on.toFixed(3)}); off hands back .8 and leaves later writes alone; st.trippy still set`); }
  X.tick(.02); ok(Math.abs(lk.trip - .8 * X.cur) < 1e-6, '  never compounds over ticks'); lk.trip = .5; X.tick(.02); ok(Math.abs(lk.trip - .5 * X.cur) < 1e-6, '  follows a fresh value from the world');
  world.cam.z = -5; for (let i = 0; i < 400; i++) X.tick(.05); world.cam.z = 0; X.tick(.05); ok(X.maxStage === 3 && X.cur > .95, `  travelling to the galaxy opens it (${X.cur.toFixed(2)}) and it stays open back home`);
  const sv = P.parts.trippy.save(); const Y = createTrippy({ world: { cam: { z: 0 }, look: { trip: .5 } }, bank: () => bank, ctx: {}, persist: P }); P.parts.trippy.load(sv); Y.tick(.02); ok(Y.cur > .95, '  saved and restored');
  X.opts.on = false; lk.trip = .6; X.tick(.02); ok(lk.trip === .6 && ctx.trippy === 1, '  switch off: no gating (v0.0.28)'); X.opts.on = true; X.opts.over = .3; X.tick(.02); ok(ctx.trippy === .3, '  dev override pins it'); }
// ---- 2 jam roles
const songsFake = () => ({ groups: [], groupOf: () => null, opts: { placeTrad: true } });
{ const sim = fakeSim(6), bus = fakeBus(), music = fakeMusic(); for (const o of sim.ohms) o.personality = { bold: .5, social: .5, curious: .5, playful: .5 };
  const P = { a: sim.ohms[0], b: sim.ohms[1], k: .9 }, autojam = { jams: [P] }, J = createJamRoles({ sim, bus, music, autojam, songs: songsFake() });
  const fronts = []; for (let bar = 0; bar < 80; bar++) { music.b = bar * 4; J.tick(); fronts.push(J.frontOf(J.keyOfPair(P.a, P.b))); }
  const changes = fronts.filter((f, i) => i && f !== fronts[i - 1]).length, both = new Set(fronts).size;
  ok(changes >= 3 && both === 2, `2 jam roles: the front tires and hands over (${changes} hand-overs in 80 bars, both ohms take the front), no fixed leader`);
  const fr = J.frontOf(J.keyOfPair(P.a, P.b)), front = sim.byId.get(fr), fol = front === P.a ? P.b : P.a, ns = [0, 1, 2, 3].map(i => ({ b: 400 + i, deg: 0, oct: 0, vel: .5 }));
  const nf = J.shapeTurn(P, front, ns, [0, 2, 4]); J.heardTurn(P, front, nf); const nw = J.shapeTurn(P, fol, ns, [0, 2, 4]);
  ok(nf.length === 4 && nf[0].vel > .5 && nw.length < 4 && nw[0].vel < .5, `  front plays its call whole and louder (${nf.length} notes), the follower answers thinner + softer (${nw.length})`);
  // crowd: step back
  const G = { id: '1-2-3', members: [sim.ohms[0], sim.ohms[1], sim.ohms[2]], state: 'song' }; sim.ohms[2].body.x = 1.5; const S2 = { ...songsFake(), groups: [G] }; const J2 = createJamRoles({ sim, bus, music, autojam: { jams: [] }, songs: S2 });
  let backs = 0, listen = 0; for (let bar = 0; bar < 40; bar++) { music.b = bar * 4; J2.tick(); for (const m of G.members) { if (J2.songBack(G, m)) backs++; if (m.watch && m.watch.listen) listen++; } }
  ok(J2.backs >= 2 && backs > 0 && listen > 0, `  a crowded jam: one follower steps back and listens at a time (${J2.backs} step-backs, eyes on the front)`);
  const order = J2.songOrder(G, G.members.slice()); ok(order[0].id === J2.frontOf('g' + G.id), '  in a song the front carries the melody (first in the order)');
  J.opts.on = false; music.b += 4; J.tick(); ok(J.shapeTurn(P, fol, ns, [0, 2, 4]) === ns && J.g.size === 0, '  switch off: notes untouched (v0.0.28)'); }
// ---- 3 jams change key
{ const sim = fakeSim(4), bus = fakeBus(), music = fakeMusic(); sim.opts.harm = { on: true, bars: 2, keys: true }; music.setKey = k => { music.key = k; }; music.listeners = [];
  const H = createHarmony(sim, bus, music), autojam = { jams: [{ a: sim.ohms[0], b: sim.ohms[1], k: .9 }] }, K = createJamKeys({ sim, bus, music, harmony: H, autojam, songs: { groups: [], carrier: null } });
  for (const o of sim.ohms) o.home = 0; const keys = [], play = () => { for (const o of sim.ohms.slice(0, 2)) for (const d of [0, 2, 4, 5]) bus.note({ src: o, kind: 'note', deg: d }); };
  for (let bar = 0; bar < 120; bar++) { music.b = bar * 4; if (bar % 2 === 0) { music.chord = { root: [0, 3, 4, 0][(bar / 2) % 4], tones: [0, 2, 4] }; } play(); K.tick(); if (bar % 2 === 0) H.step(); keys.push(music.key); }
  const ch = keys.filter((k, i) => i && k !== keys[i - 1]).length, away = keys.some(k => k !== 0), home = keys[keys.length - 1] === 0 || K.returns > 0;
  const vis = new Set(keys); ok(ch >= 4 && vis.size >= 3 && home && K.journeys >= 2, `3 jams change key: ${ch} key changes in 120 bars (${[...new Set(keys)].join(', ')}), through a shared chord, and back home (${K.returns} returns)`);
  const okSteps = keys.every((k, i) => !i || k === keys[i - 1] || [5, 7, 2, 10, 3, 0].includes((k - keys[i - 1] + 12) % 12)); ok(okSteps, '  every move is to a close key (IV / V / ii or back)');
  const sim2 = fakeSim(4), m2 = fakeMusic(); sim2.opts.harm = { on: true, bars: 2, keys: true }; m2.setKey = k => { m2.key = k; }; for (const o of sim2.ohms) o.home = 0; const b2 = fakeBus(), H2 = createHarmony(sim2, b2, m2), K2 = createJamKeys({ sim: sim2, bus: b2, music: m2, harmony: H2, autojam: { jams: [{ a: sim2.ohms[0], b: sim2.ohms[1], k: .9 }] }, songs: { groups: [] } }); K2.opts.on = false;
  for (let bar = 0; bar < 120; bar++) { m2.b = bar * 4; if (bar % 2 === 0) m2.chord = { root: [0, 3, 4, 0][(bar / 2) % 4], tones: [0, 2, 4] }; for (const o of sim2.ohms.slice(0, 2)) for (const d of [0, 2, 4, 5]) b2.note({ src: o, kind: 'note', deg: d }); K2.tick(); if (bar % 2 === 0) H2.step(); }
  ok(m2.key === 0 && H2.keyMoves === 0, '  switch off: the jam stays in its key (v0.0.28)');
  const m3 = fakeMusic(), K3 = createJamKeys({ sim: fakeSim(2), bus: fakeBus(), music: m3, harmony: { wants: new Map() }, autojam: { jams: [] }, songs: { groups: [] } }); for (let bar = 0; bar < 40; bar++) { m3.b = bar * 4; K3.tick(); } ok(K3.target == null, '  nobody jamming: no journey (nothing moves when nobody plays)'); }
// ---- 3b relative / parallel minor (music.setMode + jamkeys journeys)
{ let t = 0; const M = createMusic(() => t); const pcsOf = () => [...Array(7).keys()].map(d => (1200 * Math.log2(M.hz(d) / 16) % 1200 + 1200) % 1200).map(c => Math.round(c)).sort((a, b) => a - b).join();
  const maj = pcsOf(), hz0 = M.tonicHz; M.setMode('minor', 'rel'); const rel = pcsOf(), relKey = M.key; M.setMode('major'); const back = pcsOf();
  ok(maj === rel && relKey === 9 && back === maj && Math.abs(M.tonicHz - hz0) < 1e-9 && M.key === 0, `3b relative minor: the same 7 pitches (${maj}), centre on the 6th (key 9), and back exactly`);
  M.setMode('minor', 'par'); const par = pcsOf(), diff = maj.split(',').filter(c => !par.split(',').includes(c)).length; ok(M.key === 0 && diff === 3 && M.semi() === SEMI_MINOR, `  parallel minor: same tonic, 3 notes lowered (${par})`); M.setMode('major');
  M.setTuning('12-TET-7'); ok(M.canMode('par') && M.setMode('minor', 'par') && M.mode === 'minor', '  12-TET minor too'); M.setTuning('om-JI-7'); ok(M.mode === 'major', '  a tuning change resets to major');
  const sim = fakeSim(4), bus = fakeBus(); sim.opts.harm = { on: true, bars: 2, keys: true }; for (const o of sim.ohms) o.home = 0;
  const H = createHarmony(sim, bus, M), K = createJamKeys({ sim, bus, music: M, harmony: H, autojam: { jams: [{ a: sim.ohms[0], b: sim.ohms[1], k: .9 }] }, songs: { groups: [], carrier: null }, opts: { stay: 8, away: 8, steps: [] } });   // minor journeys only (the major ones are test 3)
  const modes = [], posts = []; bus.on('jam.mode', ev => posts.push(ev.how || ev.mode)); let outPc = 0, nn = 0;
  for (let bar = 0; bar < 240; bar++) { t = bar * 4; for (const o of sim.ohms.slice(0, 2)) for (const d of [0, 2, 4]) bus.note({ src: o, kind: 'note', deg: (M.chord.root + d) % 7 }); bus.flush && bus.flush();
    K.tick(); if (bar % 2 === 0) H.step(); modes.push(M.mode + (M.modeHow || '')); const set = M.semi().map(x => (M.key + x) % 12); for (const d of M.chord.tones) { nn++; if (!set.includes((M.key + M.semi()[d % 7]) % 12)) outPc++; } }
  const seen = new Set(modes); ok(seen.has('minorrel') && seen.has('minorpar') && K.modes >= 4 && posts.includes('rel') && posts.includes('par'), `  jams travel to the relative and the parallel minor and home again (${K.modes} mode moves; ${posts.join(' ')})`);
  ok(outPc === 0, `  chords stay inside the sounding scale in both modes (${nn} chord tones checked)`);
  K.opts.par = false; K.opts.rel = false; for (let bar = 240; bar < 300; bar++) { t = bar * 4; K.tick(); } ok(M.mode === 'major', '  switches off: back to major');
  const sim4 = fakeSim(4); sim4.opts.harm = { on: true, bars: 2, keys: true }; let t4 = 0; const M4 = createMusic(() => t4), b4 = fakeBus(), H4 = createHarmony(sim4, b4, M4), K4 = createJamKeys({ sim: sim4, bus: b4, music: M4, harmony: H4, autojam: { jams: [{ a: sim4.ohms[0], b: sim4.ohms[1], k: .9 }] }, songs: { groups: [], carrier: { id: 'x' } }, opts: { stay: 4 } });
  for (let bar = 0; bar < 80; bar++) { t4 = bar * 4; K4.tick(); } ok(M4.mode === 'major' && K4.modes === 0, '  a song carrying the chords: no mode journey'); }
// ---- 4 watched jams grow
{ const d = develop([{ notes: [{ b: 0, off: 0, vel: .6 }, { b: 2, off: 2, vel: .6 }] }, { notes: [{ b: 0, off: 4, vel: .6 }] }], 1, 7); ok(d.length === 2 && d[0].notes[0].off === 2, '4 develop: the new half is the motif moved up a chord tone, with a fill at the end');
  const mk = () => { const sim = fakeSim(4), bus = fakeBus(), music = fakeMusic(), P = { a: sim.ohms[0], b: sim.ohms[1], k: .9 }, autojam = { jams: [P] }; let watched = true;
    const view = () => ({ W: 400, H: 800, toS: () => (watched ? { x: 200, y: 400 } : { x: -500, y: 400 }) }); const G = createJamGrow({ sim, bus, music, autojam, view }); return { sim, bus, music, P, G, setW: v => { watched = v; } }; };
  const run = (X, bars, offKey = () => false, b0 = 0) => { for (let bar = b0; bar < b0 + bars; bar++) { X.music.b = bar * 4; const turn = bar % 2 ? X.P.a : X.P.b; X.G.tick(.0); X.G.tick(2); // ~2 s per bar watched
      const notes = X.G.turn(X.P, turn, bar, [0, 2, 4], 0) || [0, 1, 2].map(i => ({ b: bar * 4 + i * 1.5, deg: [0, 2, 4][i], oct: 0, vel: .5 }));
      for (const n of notes) X.bus.note({ src: turn, kind: 'note', deg: offKey(bar) && Math.round(n.b) % 2 === 0 ? n.deg + 1 : n.deg, beat: n.b, auto: 1, jam: 1, vel: n.vel }); } };
  const X = mk(); run(X, 160); const s = X.G.of(X.P.a, X.P.b), L = s && s.loop ? s.loop.length : 0;
  ok(L >= 8 && X.G.grown >= 3, `  a watched, matched jam grows its loop (${X.G.grown} growths, now ${L} bars)`);
  const first = s.loop.slice(0, 2).map(B => B.notes.map(n => n.off).join()).join('|'), X2 = mk(); run(X2, 160); ok(first.length > 0 && X2.G.of(X2.P.a, X2.P.b).loop.slice(0, 2).map(B => B.notes.map(n => n.off).join()).join('|') === first, '  the old loop is kept inside the longer one (same first 2 bars)');
  const Y = mk(); Y.setW(false); run(Y, 160); ok(Y.G.grown === 0, '  an unwatched jam does not grow');
  const Z = mk(); run(Z, 160, () => true); ok(Z.G.grown === 0, '  growth stops while a member is out of key');
  const R = mk(); run(R, 40); const l0 = R.G.of(R.P.a, R.P.b).loop.length, lv0 = R.G.of(R.P.a, R.P.b).lvl; let grewAt = -1; for (let bar = 40; bar < 120 && grewAt < 0; bar++) { run(R, 1, () => false, bar); if (R.G.of(R.P.a, R.P.b).loop.length > l0) grewAt = bar; }
  run(R, 6, () => true, grewAt + 1); ok(R.G.reverts >= 1 && R.G.of(R.P.a, R.P.b).loop.length === l0, `  a new part that slips is dropped: back to the proven ${l0}-bar loop (${R.G.reverts} reverted)`);
  const F = mk(); F.G.opts.on = false; run(F, 160); ok(F.G.grown === 0 && F.G.turn(F.P, F.P.a, 1, [0, 2, 4], 0) === null, '  switch off: autojam plays its own phrases (v0.0.28)'); }
// ---- 4b song groups grow too (old game exp.js growUp: A -> A A' -> A A' Q A')
{ const sng = { form: ['A', 'A', 'B', 'A'], sec: { A: [0, 4, 5, 3], B: [5, 3, 0, 4] }, end: [4, 0] }, sub = (big, small) => { let i = 0; for (const x of big) if (x === small[i]) i++; return i === small.length; };
  const L1 = grownLayout(sng, 1), L2 = grownLayout(sng, 2), L3 = grownLayout(sng, 3);
  ok(L1.form.join(' ') === "A A' A B A" && L2.form.join(' ') === "A A' A B D A" && L3.form.join(' ') === "A A' A B D D' A" && [L1, L2, L3].every(L => sub(L.form, sng.form)), `4b grown forms keep the proven form whole: ${L1.form.join(' ')} | ${L2.form.join(' ')} | ${L3.form.join(' ')}`);
  ok([L1, L2, L3].every(L => L.at(-1).r === 0 && L.every(B => B.r >= 0 && B.r < 7)) && L2.filter(B => B.sec === 'D').at(-1).r === 4, '  every grown section is diatonic, the development ends on V, the song still ends home');
  ok(grownLayout({ ...sng, sec: { A: Array(16).fill(0), B: Array(16).fill(4) } }, 3, 64).form.length < 7, '  capped (songMaxBars)');
  const setup = (gopts = {}, w0 = true) => { const bus = fakeBus(), M = fakeMusic(), sim = fakeSim(6), A = { jams: [], mem: new Map(), presence: () => .9 }; const S = createSongs(sim, bus, M, {}, A, { meet: false }); sim.held = S.held;
    let watched = w0; const view = () => ({ W: 400, H: 800, toS: () => (watched ? { x: 200, y: 400 } : { x: -500, y: 400 }) }); const G = createJamGrow({ sim, bus, music: M, autojam: A, view, songs: () => S, opts: gopts }); sim.jamGrow = G;
    const [a, b] = sim.ohms; A.jams = [{ a, b, k: .9 }]; const E = { bus, M, sim, S, G, A, a, b, setW: v => { watched = v; } };
    E.bar = n => { for (let i = 0; i < n; i++) { M.b = (Math.floor(M.b / 4) + 1) * 4 + .01; S.tick(); G.tick(0); G.tick(2); } };
    for (let i = 0; i < 12; i++) { const src = i % 2 ? a : b; E.bar(1); for (const [d, off] of [[0, 0], [2, 1], [4, 2], [2, 3]]) bus.note({ src, kind: 'note', deg: d, beat: M.b + off * .9, auto: 1, jam: 1 }); }
    E.bar(2); E.grp = S.groupOf(a); return E; };
  const E = setup(), g = E.grp, song = g && g.song, base = song && barsOf(song).length; const lens = new Set(); let chordOk = 0, chordN = 0;
  for (let i = 0; i < 400; i++) { E.bar(1); if (g.state === 'song' && g.L) { lens.add(g.L.length); const bi = Math.floor(E.M.b / 4) - g.start; if (bi >= 0 && bi < g.L.length) { chordN++; if (E.M.chord.root === g.L[bi].r) chordOk++; } } }
  const lvl = E.G.songLevel(g, song); ok(song && E.G.songGrown >= 2 && lvl >= 2 && Math.max(...lens) > base && sub(g.L.form || [], song.form), `  a watched, matched song group comes back longer (${base} -> ${[...lens].sort((x, y) => x - y).join(' -> ')} bars, level ${lvl}, form ${(g.L.form || []).join(' ')})`);
  ok(chordN > 50 && chordOk === chordN, `  the chords follow the grown chart (${chordOk}/${chordN} bars)`);
  ok(E.S.lib.get(song.id).form.join() === song.form.join() && barsOf(E.S.lib.get(song.id)).length === base, '  the library song itself is unchanged');
  ok(E.G.songKept >= 1 && E.bus.posts.some(p => p.type === 'jam.grow' && p.song), `  grown plays that held are kept (${E.G.songKept}) and posted as jam.grow`);
  const U = setup({}, false); U.bar(400); ok(U.G.songGrown === 0 && !(U.grp.L && U.grp.L.form), `  an unwatched song group does not grow (layout untouched)`);
  const D = setup(); let grew = -1; for (let i = 0; i < 400 && grew < 0; i++) { D.bar(1); if (D.G.songGrown >= 1) grew = i; } const lv1 = D.G.songLevel(D.grp, D.grp.song);
  while (D.grp.state !== 'song') D.bar(1); for (const m of D.grp.members) { const e = D.sim.brain.get(m, 'song', D.grp.song.id); if (e && e.data) e.data.drift = .9; }   // the grown play slips (members' versions far apart)
  const ends = D.S.ends; while (D.S.ends === ends) D.bar(1); ok(lv1 === 1 && D.G.songLevel(D.grp, D.grp.song) === 0 && D.G.songDrops === 1 && D.bus.posts.some(p => p.type === 'jam.revert' && p.song), '  a grown play that slips is dropped: back to the proven form');
  const F = setup({ songs: false }); F.bar(400); ok(F.G.songGrown === 0 && !(F.grp.L && F.grp.L.form), '  switch jamGrowSongs off: songs play their charts (v0.0.28)'); }
// ---- 4c regressions: songs.js start() clears the cached chart; river edits in grown sections never reach the library song
{ const bus = fakeBus(), M = fakeMusic(), sim = fakeSim(6), A = { jams: [], mem: new Map(), presence: () => .9 }, S = createSongs(sim, bus, M, {}, A, { meet: false }); sim.held = S.held;
  const [a, b] = sim.ohms; A.jams = [{ a, b, k: .9 }]; const bar = n => { for (let i = 0; i < n; i++) { M.b = (Math.floor(M.b / 4) + 1) * 4 + .01; S.tick(); } };
  for (let i = 0; i < 12; i++) { const src = i % 2 ? a : b; bar(1); for (const [d, off] of [[0, 0], [2, 1], [4, 2], [2, 3]]) bus.note({ src, kind: 'note', deg: d, beat: M.b + off * .9, auto: 1, jam: 1 }); }
  bar(2); const g = S.groupOf(a); let n = 0; while (g && g.state === 'song' && n++ < 400) bar(1); while (g && g.state !== 'song' && n++ < 800) { if (!g._stale) { g.L = barsOf({ form: ['X'], sec: { X: [3, 3, 3, 3, 3, 3, 3, 3] }, end: [3] }); g._stale = 1; } bar(1); }
  let ok1 = 0, n1 = 0; for (let i = 0; i < 16 && g.state === 'song'; i++) { const bi = Math.floor(M.b / 4) - g.start, L = barsOf(g.song); if (bi >= 0 && bi < L.length) { n1++; if (M.chord.root === L[bi].r) ok1++; } bar(1); }
  ok(g && g._stale && n1 > 4 && ok1 === n1, `4c a stale chart left on the group (another song's) is cleared when a song starts: ${ok1}/${n1} bars follow the new song`); }
{ const E = (() => { const bus = fakeBus(), M = fakeMusic(), sim = fakeSim(6), A = { jams: [], mem: new Map(), presence: () => .9 }, S = createSongs(sim, bus, M, {}, A, { meet: false }); sim.held = S.held;
    const view = () => ({ W: 400, H: 800, toS: () => ({ x: 200, y: 400 }) }), G = createJamGrow({ sim, bus, music: M, autojam: A, view, songs: () => S }); sim.jamGrow = G; const [a, b] = sim.ohms; A.jams = [{ a, b, k: .9 }];
    const bar = n => { for (let i = 0; i < n; i++) { M.b = (Math.floor(M.b / 4) + 1) * 4 + .01; S.tick(); G.tick(0); G.tick(2); } };
    for (let i = 0; i < 12; i++) { const src = i % 2 ? a : b; bar(1); for (const [d, off] of [[0, 0], [2, 1], [4, 2], [2, 3]]) bus.note({ src, kind: 'note', deg: d, beat: M.b + off * .9, auto: 1, jam: 1 }); }
    return { bus, M, sim, S, G, a, b, bar }; })();
  let g = null, gi = -1; for (let i = 0; i < 600 && gi < 0; i++) { E.bar(1); g = E.S.groupOf(E.a); if (g && g.state === 'song' && g.L && g.L.form) { const bi = Math.floor(E.M.b / 4) - g.start; if (bi >= 0 && bi < g.L.length - 2 && g.L[bi + 1].grown) gi = bi + 1; } }
  const sys = { songs: E.S, undo: createUndo(E.bus, E.M) }, D = createDaw(E.sim, E.bus, E.M, sys), song = g && g.song, before = JSON.stringify(song && song.parts || {});
  if (gi >= 0) { E.bar(1); const b0 = (g.start + gi) * 4; D.paintFor(E.a, [[b0, 1, 0, .5], [b0 + 1, 3, .1, .5], [b0 + 2, 5, .2, .5]]); }
  const sec = gi >= 0 && g.L[gi].sec, lib = E.S.lib.get(song && song.id), libSecs = new Set(Object.values((lib && lib.parts) || {}).flatMap(x => Object.keys(x)));
  ok(gi >= 0 && JSON.stringify(song.parts || {}) === before && !libSecs.has(sec) && g.gparts && g.gparts[E.a.seed] && g.gparts[E.a.seed][sec].length === 3, `4c a river edit in a grown section (${sec}) stays with the play: library song parts unchanged, 3 notes kept for this play`);
  const sc = gi >= 0 ? E.S.score(g).notes.filter(x => x.m === E.a && Math.floor(x.b / 4) === gi) : []; ok(sc.length >= 3 && sc.filter(x => [1, 3, 5].includes(x.d)).length >= 3, `  and the grown section plays it (${sc.map(x => x.d).join(',')})`);
  sys.undo.undo(); ok(!(g.gparts && g.gparts[E.a.seed]), '  undo removes it');
  const fi = g.L.findIndex(B => !B.grown && B.sec !== 'end'); D.paintFor(E.a, [[(g.start + fi) * 4, 2, 0, .5], [(g.start + fi) * 4 + 1, 4, .1, .5]]);
  ok(song.parts && song.parts[E.a.seed] && song.parts[E.a.seed][g.L[fi].sec], `  an edit in a library section (${g.L[fi].sec}) still edits the song part as before`);
  g.gparts = { [E.a.seed]: { X: [] } }; const ends = E.S.ends; let k = 0; while (E.S.ends === ends && k++ < 400) E.bar(1); while (g.state !== 'song' && k++ < 800) E.bar(1); ok(g.state === 'song' && !g.gparts, '  the next play starts without the old grown edits'); }
// ---- 5 learned sounds
{ const sim = fakeSim(5), music = fakeMusic(), br = sim.brain; sim.opts.blend = { on: true, sound: true, max: 4 }; const o = sim.ohms[0], blend = { learnFor: () => [{ rec: 'base', k: .1 }] };
  const recs = sim.ohms.slice(1, 5).map(x => x.recipe); recs.forEach((r, i) => br.remember(o, 'sound', r, null, 4 - i * .7)); o.brain = { e: {} };
  const L = createLearnVoice({ sim, music, blend, brain: br }); const l3 = blend.learnFor(o); ok(l3.length === 3 && !l3.some(x => x.rec === o.recipe), `5 learned sounds: up to three under its own (${l3.length})`);
  const tot = l3.reduce((s, x) => s + x.k, 0); ok(tot < .5, `  its own sound keeps the larger part (learned share ${tot.toFixed(2)})`);
  sim.ohms[1].body.x = o.body.x + 1; sim.ohms[2].body.x = 99; sim.ohms[3].body.x = 99; const near = blend.learnFor(o), a = near.find(x => x.rec === recs[0]), b = near.find(x => x.rec === recs[1]);
  sim.ohms[1].body.x = 99; sim.ohms[2].body.x = o.body.x + 1; const near2 = blend.learnFor(o), a2 = near2.find(x => x.rec === recs[0]), b2 = near2.find(x => x.rec === recs[1]);
  ok(a.k > a2.k && b2.k > b.k && Math.abs(near.reduce((s, x) => s + x.k, 0) - near2.reduce((s, x) => s + x.k, 0)) < .05, '  context: the sound of the ohm it is with comes forward, the total stays');
  L.opts.learn3 = false; L.opts.ctx = false; ok(blend.learnFor(o)[0].rec === 'base', '  both switches off: blend.js as before (v0.0.28)'); L.opts.learn3 = true;
  ok(L.soloFor(o, { jam: 1, deg: 0, beat: 0 }) === null, '  learnSolo off by default: never solos');
  L.opts.solo = true; let n = 0, so = 0; for (let b = 0; b < 4000; b += .5) { n++; if (L.soloFor(o, { jam: 1, deg: 0, beat: b })) so++; } ok(so > 0 && so / n <= .1 + 1e-9, `  learnSolo on: a fully learned sound solos rarely (${(so / n * 100).toFixed(1)}% of notes, ${L.solos} phrases)`); }
// ---- 6 conducting
{ ok(Math.abs(snapTempo(60, 88) - 90) < 1e-9 && Math.abs(snapTempo(60, 31) - 30) < 1e-9, '6 conducting: stroke tempo snaps to synced steps (88 -> 90, 31 -> 30 at 60 BPM)');
  const sim = fakeSim(5), bus = fakeBus(), music = fakeMusic(); music.bpm = 60; sim.cam = {}; const tS = (W, H, c, x, y) => ({ x: 100 + x * 10, y: 400 + y * 10, s: 10 }); for (const o of sim.ohms) o.g = { r: .5 };
  const C = createConduct({ sim, bus, music, size: () => ({ W: 400, H: 800 }), toScreen: tS }); ok(C.raise(0, 0) && C.set.size >= 3 && [...C.set].every(o => o.watch && o.watch.baton), `  baton up: ${C.set.size} ohms in view turn toward you`);
  ok(sim.dictated(sim.ohms[1], 1) && sim.dictated(sim.ohms[1], 1).length === 0, '  they wait (rest) until the first beat');
  C.down(300, 100, 0); let t = 0; for (let k = 0; k < 6; k++) { for (let i = 1; i <= 10; i++) C.move(300, 100 + i * 30, t += 37.5); for (let i = 1; i <= 10; i++) C.move(300, 400 - i * 30, t += 37.5); }
  const tp = bus.posts.filter(p => p.type === 'tempo.tap'); ok(!C.waiting && tp.length >= 1 && Math.abs(tp[tp.length - 1].bpm - 80) < 1e-6, `  steady beats (750 ms) set the tempo: ${tp.length ? tp[tp.length - 1].bpm.toFixed(0) : '-'} BPM (snapped 4/3), sent to the ${tp.length ? tp[0].to.length : 0} ohms in view`);
  C.move(300, 40, t += 30); for (let i = 0; i < 40; i++) C.tick(.05); ok(C.vol > 1.3, `  hand high = louder (x${C.vol.toFixed(2)})`); ok(sim.autoFor(sim.ohms[1], 0).vol > 1.3, '  ... through the volume hook');
  C.end(300, 40, t); const tg = sim.ohms[2], s2 = tS(0, 0, 0, tg.body.x, tg.body.y); C.down(s2.x - 80, s2.y, t += 10); C.move(s2.x - 40, s2.y, t += 10); C.move(s2.x, s2.y, t += 10); C.move(s2.x + 40, s2.y, t += 10); C.end(s2.x + 40, s2.y, t += 10);
  ok(bus.notes.some(n => n.cue && n.src === tg), '  a stroke through an ohm cues it (it plays on the next beat)');
  C.down(300, 100, t += 100); C.move(300, 200, t += 30); C.move(300, 340, t += 30); C.end(300, 340, t += 10); ok(C.cuts === 1 && sim.dictated(sim.ohms[1], Math.floor(music.beat() / 4)) !== null, '  a sharp flick down cuts them off');
  C.release('lift'); ok(!C.up && sim.ohms.every(o => !(o.watch && o.watch.baton)), '  lifting releases them');
  ok(C.owns() === false, '  the touch binding is OFF by default (gesture clash with ground shaping)'); }
// ---- 7 crazes
{ const sim = fakeSim(8), bus = fakeBus(), music = fakeMusic(); for (let i = 0; i < 8; i++) { sim.ohms[i].body.x = i * 2; sim.ohms[i].personality = { curious: .9, social: .9, bold: .5, playful: .5 }; }
  const songs = { groups: [], opts: { placeTrad: true } }, Z = createCraze({ sim, bus, music, songs }), song = { id: 'g.x', name: 's', origin: 'grown', planetSeed: 42, hook: [0, 2, 4, 2, 1].map((d, i) => ({ d, b: i })) };
  bus.post({ type: 'song.caught', song, members: [sim.ohms[0], sim.ohms[1]] }); ok(Z.list.length === 1, '7 crazes: a caught hook starts a craze');
  for (let bar = 0; bar < 200; bar++) { music.b = bar * 4; for (const o of sim.ohms) Z.borrow({}, o, bar); Z.tick(); }
  const c = Z.list[0]; ok(c.carriers.size >= 6, `  it spreads ohm to ohm, hop by hop (${c.carriers.size}/8 carry it; ${Z.catches} caught it)`); ok(!!sim.brain.get(sim.ohms[5], 'song', 'g.x'), '  a carrier knows it as a song (with drift)');
  ok(song.trad === 42 && Z.trads === 1, '  played by enough ohms it becomes the planet\'s tradition (placeTrad)'); const Z2 = createCraze({ sim, bus: fakeBus(), music, songs }); Z2.opts.on = false; ok(Z2.start(song, []) === null && Z2.borrow({}, sim.ohms[0], 1) === null, '  switch off: nothing'); }
// ---- 8 audioSig
{ const sim = fakeSim(3), bus = fakeBus(), music = fakeMusic(); music.om = 64; music.hz = (d, o) => 64 * 2 ** ([0, 2, 4, 5, 7, 9, 11][((d % 7) + 7) % 7] / 12 + (o || 0)); sim.sig = { 1: { 'sound.level': .4 }, 103: { 'sound.level': .2 } };
  const th = { id: 5, kind: 'string', src: { id: 'drawn:5', scale: 'thing', body: { x: 1, y: 2 } } }, ctx = { song: null, tradition: null }, rst = { trippy: .3 }, S = createAudioSig({ sim, bus, music, songs: { groups: [] }, autojam: { jams: [] }, things: { list: [th] }, ctx, st: rst });
  bus.note({ src: sim.ohms[1], kind: 'note', deg: 0, ab: 'metro' }); bus.note({ src: sim.ohms[0], kind: 'note', deg: 4, oct: 0 }); bus.note({ src: th.src, kind: 'note', deg: 2 }); bus.note({ src: { id: 101, scale: 'world' }, kind: 'note' });
  S.tick(); ok(rst.audio === S && ctx.audioSig === S && ['om', 'notes', 'strings', 'bars', 'membranes', 'jam', 'arc', 'trad', 'abilities', 'muffle'].every(k => S[k] && typeof S[k] === 'object') && S.notes.onset > .9 && S.notes.pc === 7 && S.strings.onset > .9 && S.strings.pc === 4 && S.abilities.kind === 'metro' && S.om.heart > .9, '8 st.audio (one sub-object per system, om .. muffle): ohm note (pc 7 = the fifth), drawn string (pc 4), ability, heartbeat onsets');
  ok(S.om.level === .2 && S.notes.level === .4 && S.trippy === .3 && S.muffle.amt === 0, '  levels: om hum, loudest ohm; trippy; muffle 0 until it lands');
  const t1 = performance.now(); while (performance.now() - t1 < 300) {} S.tick(); ok(S.notes.onset < .5, `  onsets decay (${S.notes.onset.toFixed(2)} after .3 s)`);
  const t2 = performance.now(); for (let i = 0; i < 2000; i++) S.tick(); const per = (performance.now() - t2) / 2000; ok(per < .05, `  cost per update ${(per * 1000).toFixed(1)} us`); }

// 13 play a phrase twice -> the ohm takes it as its tune (old playmode.js Pm.teach)
{ if (!globalThis.localStorage) { const mem = {}; globalThis.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } }; }
  let T = 0; const music = createMusic(() => T), bus = fakeBus(), o = { id: 7, seed: 77, scale: 'ohm', body: { x: 1, y: 2 } }, o2 = { id: 8, seed: 88, scale: 'ohm', body: { x: 5, y: 2 } };
  const world = { opts: JSON.parse(JSON.stringify(ROPTS)), sources: [o, o2] }, brain = createBrain(world, music), blend = createBlend(world, bus, music, brain), undo = createUndo(bus, music);
  const P = createPlayTwice({ sim: world, bus, music, brain, undo });
  for (let i = 0; i < 5; i++) brain.remember(o, 'pattern', 'old' + i, { rh: [0, 2], iv: [1] }, 1.5);   // it already heard things
  const spb = 60 / music.bpm, tap = (x, d, beat, extra = {}) => { T = beat * spb; bus.note({ src: x, kind: 'note', deg: d, oct: 0, vel: .7, inputT: 1, ...extra }); };
  const tune = [0, 2, 4, 2, 5];
  let b = 0; for (const d of tune) { tap(o, d, b); b += 1; } ok(P.adopted === 0, '13 play twice: once is not enough');
  for (const d of tune) { tap(o, d, b); b += 1; }
  const tp = blend.pattern(o, true); ok(P.adopted === 1 && o.tune && o.tune.deg.join() === tune.join(), `  the same 5 notes twice -> adopted (${o.tune && o.tune.deg.join()})`);
  ok(tp && tp.iv.join() === '2,2,-2,3' && tp.share > .4, `  it is now its strongest pattern (steps ${tp && tp.iv.join()}, share ${tp && tp.share.toFixed(2)})`);
  ok(Math.max(...tp.rh) <= 3.75, '  its shape fits one bar for autojam');
  const ph = brain.list(o, 'phrase'); ok(ph.length === 1 && brain.phraseNotes(ph[0]).length === 10, `  and its long part: the tune twice (${ph.length && brain.phraseNotes(ph[0]).length} notes)`);
  ok(bus.posts.some(e => e.type === 'ohm.tune' && e.src === o && e.len === 5), '  flash posted (ohm.tune)');
  undo.undo(); ok(!o.tune && brain.list(o, 'phrase').length === 0 && blend.pattern(o, true).iv.join() === '1', '  undo takes it back (old patterns lead again)');
  undo.redo(); ok(o.tune && brain.list(o, 'phrase').length === 1, '  redo teaches it again');
  // 8-note phrase, auto notes ignored, different notes / long pause / another ohm reset
  const n0 = P.adopted; b += 20; const t8 = [0, 1, 2, 3, 4, 3, 2, 1];
  for (const d of t8) { tap(o2, d, b); b += .5; tap(o2, 6, b, { auto: true, inputT: undefined }); }
  for (const d of t8) { tap(o2, d, b); b += .5; } ok(P.adopted === n0 + 1 && o2.tune.deg.length === 8, `  8 notes twice (with its own autojam notes in between) -> adopted, length ${o2.tune.deg.length}`);
  b += 20; for (const d of tune) { tap(o, d, b); b += 1; } b += 10; for (const d of tune) { tap(o, d, b); b += 1; } ok(P.adopted === n0 + 1, '  a long pause between the two passes -> not taught');
  b += 20; for (const d of tune) { tap(o, d, b); b += 1; } tap(o2, 0, b); b += 1; for (const d of tune) { tap(o, d, b); b += 1; } ok(P.adopted === n0 + 1, '  going to another ohm in between -> starts again');
  b += 20; for (const d of [0, 2, 4]) { tap(o, d, b); b += 1; } for (const d of [0, 2, 4]) { tap(o, d, b); b += 1; } ok(P.adopted === n0 + 1, '  3 notes twice is too short');
  b += 20; for (let i = 0; i < 16; i++) { tap(o, 3, b); b += .5; } ok(P.adopted === n0 + 1, '  one node tapped 16 times teaches nothing');
  P.opts.on = false; b += 20; for (const d of [...tune, ...tune]) { tap(o, d, b); b += 1; } ok(P.adopted === n0 + 1, '  switch off -> v0.0.28 (no tune)'); P.opts.on = true;
  const t0 = performance.now(); for (let i = 0; i < 20000; i++) tap(o, i % 7, b + i * 7); const per = (performance.now() - t0) / 20000; ok(per < .02, `  cost per tapped note ${(per * 1000).toFixed(2)} us`); }
console.log('14. sky mood (switch skyMood, OFF by default): night softer and lower, rain sparser, your notes untouched');
{ const { createEvents: CE } = await import('../www/js/events.js'); const { createMusic: CM } = await import('../www/js/music.js');
  let TT = 0; const mu = CM(() => TT), bu = CE(mu); const env = { day: 1, rain: 0 }; const K = createSkyMood({ bus: bu, music: mu, env: () => env });
  ok(SKYMOOD_OPTS.on === false && K.opts.on === false, '  default OFF');
  const heard = []; bu.on('note', e => heard.push(e)); const src = { id: 3, scale: 0 };
  const run = () => { heard.length = 0; for (let b = 0; b < 64; b += .5) bu.note({ src, kind: 'note', deg: 2, oct: 1, vel: .6, beat: b, t: mu.timeOfBeat(b), auto: 1, jam: 1 }); return heard.map(e => [e.beat, e.oct, +e.vel.toFixed(4)]); };
  const off = run(); env.day = .05; env.rain = 1; const offNight = run(); ok(JSON.stringify(off) === JSON.stringify(offNight), '  OFF: night + rain change nothing (identical notes)');
  K.opts.on = true; env.day = 1; env.rain = 0; ok(JSON.stringify(run()) === JSON.stringify(off), '  ON in clear daylight: identical');
  env.day = 0; const nt = run(); ok(nt.length === off.length, '  night alone rests no notes');
  ok(nt.every(n => n[2] < .6 && n[2] >= .6 * (1 - K.opts.nightVel) - 1e-9), `  night: every note softer (vel ${nt[0][2]} vs .6)`);
  const low = nt.filter(n => n[1] === 0).length; ok(low > 0, `  deep night: ${low}/${nt.length} melody notes an octave lower`);
  const byPh = new Map(); for (const n of nt) { const k = Math.floor(n[0] / 8); (byPh.get(k) || byPh.set(k, new Set()).get(k)).add(n[1]); } ok([...byPh.values()].every(s => s.size === 1), '  octave drop is per 2-bar phrase (a line never splits)');
  env.day = .5; const dusk = run(); ok(dusk.every(n => n[1] === 1) && dusk[0][2] < .6, '  dusk: a little softer, no octave drop');
  env.day = 1; env.rain = 1; const r1 = run(), r2 = run(); ok(r1.length < off.length && r1.length > off.length * .5, `  rain: sparser (${r1.length}/${off.length} notes)`);
  ok(JSON.stringify(r1) === JSON.stringify(r2), '  rain thinning is deterministic (a loop stays a loop)'); ok(r1.filter(n => n[0] % 4 === 0).length === 16, '  every downbeat still plays');
  env.rain = .3; const r3 = run(); ok(r3.length > r1.length, `  light rain thins less (${r3.length})`);
  heard.length = 0; env.day = 0; env.rain = 1; for (let b = 0; b < 16; b += .5) bu.note({ src, kind: 'note', deg: 2, oct: 1, vel: .6, beat: b, t: mu.timeOfBeat(b), inputT: 1 }); ok(heard.length === 32 && heard.every(e => e.vel === .6 && e.oct === 1), '  your own notes are never touched');
  heard.length = 0; bu.note({ src, kind: 'note', deg: 2, oct: 1, vel: .6, t: 1.75, auto: 1, jam: 1 }); ok(heard.length <= 1, '  a note without beat (jam partner) still works');
  const t0 = performance.now(); for (let i = 0; i < 20000; i++) K.shape({ src, kind: 'note', deg: 1, oct: 1, vel: .5, beat: i * .25, auto: 1 }); const per = (performance.now() - t0) / 20000; ok(per < .01, `  cost per note ${(per * 1000).toFixed(2)} us`); }
console.log('15. egg words (switch eggWords, OFF by default): strokes after the spiral pick its sound (old game v0.7 A)');
{ const { createMusic: CM } = await import('../www/js/music.js'); const { createEvents: CE } = await import('../www/js/events.js'); const { createSim: CS } = await import('../www/js/sim.js');
  const { createSpawn: CSp } = await import('../www/js/spawn.js'); const { createUndo: CU } = await import('../www/js/undo.js'); const { createBrain: CB } = await import('../www/js/brain.js');
  const MR = Math.random, { rng: RNG } = await import('../www/js/rng.js'); Math.random = RNG(1515);   // seeded: the egg's seed and nudge direction (restored below)
  const { createEgg, EGG_OPTS, readEggStroke, eggSound, eggFeel, EGG_COMBOS } = await import('../www/js/egg.js'); const { recipes: RC, toJSON: TJ, fromJSON: FJ } = await import('../www/js/recipe.js');
  let TT = 0, N = 0; const mu = CM(() => TT), bu = CE(mu), sm = CS(mu, bu); sm.reseed(5); const un = CU(bu, mu), sp = CSp(sm, bu, un), br = CB(sm, mu);
  const toS = (x, y) => ({ x: x * 10, y: y * 10, s: 1 }), E = createEgg({ sim: sm, bus: bu, music: mu, spawn: sp, undo: un, brain: br, toS, now: () => N });
  ok(EGG_OPTS.on === false && E.opts.on === false && E.open(1, 1) === null && !E.cur, '  default OFF: open() does nothing (the spiral spawns at once, spawn.js unchanged)');
  E.opts.on = true; const C = [300, 400], eg = { x: 300, y: 400 };
  const tapS = t => [[C[0], C[1], t], [C[0] + 1, C[1] + 1, t + 80]];
  const circ = (t, ms = 600) => { const a = []; for (let i = 0; i <= 32; i++) { const th = i / 32 * 6.4; a.push([C[0] + 40 * Math.cos(th) - 40 + 40, C[1] + 40 * Math.sin(th), t + ms * i / 32]); } return a.map(q => [q[0] - 40 + 40, q[1], q[2]]); };
  const wave = (t, amp = 30, ms = 500) => { const a = []; for (let i = 0; i <= 60; i++) { const u = i / 60; a.push([C[0] + 140 * u, C[1] + amp * Math.sin(u * 6 * Math.PI), t + ms * u]); } return a; };
  const flick = (t, ms = 100) => { const a = []; for (let i = 0; i <= 10; i++) a.push([C[0] + 10 * i, C[1], t + ms * i / 10]); return a; };
  const nudge = t => [[C[0], C[1], t], [C[0] + 10, C[1] + 5, t + 400], [C[0] + 20, C[1], t + 800]];
  ok(readEggStroke(tapS(0), eg).k === 'tap' && readEggStroke(circ(0), eg).k === 'circle' && readEggStroke(wave(0), eg).k === 'wave' && readEggStroke(flick(0), eg).k === 'flick' && readEggStroke(nudge(0), eg).k === 'nudge', '  reads tap / circle / wave / flick, and an unknown stroke = nudge');
  const st = (...ps) => ps.map(q => readEggStroke(q, eg)), row = (...ps) => (eggSound(st(...ps), 7) || {}).row;
  const taps = n => Array.from({ length: n }, (_, i) => tapS(i * 200));
  ok(row(...taps(1)) === 'kick' && row(...taps(2)) === 'snare' && row(...taps(3)) === 'shaker_hat' && ['taiko', 'frame_drum', 'talking_drum', 'djembe'].includes(row(...taps(4))), '  taps: 1 kick, 2 snare, 3 hats, 4 a tom');
  const k5 = eggSound(st(...taps(5)), 7); ok(k5.row === 'kick' && k5.kit.length === 4, '  5+ taps = a kit (kick + snare, hats, tom, agogo)');
  ok(eggSound(st(tapS(0), tapS(900)), 7).row === 'kick', '  a pause over 0.4 s locks the drum type (a new tap word starts)');
  ok(['warm_pad', 'moving_pad'].includes(row(wave(0, 40))) && ['om_hum', 'bagpipe_drone', 'harmonium', 'didgeridoo'].includes(row(wave(0, 14))), '  big wave = pad, small wave = drone');
  ok(row(wave(0), wave(700)) === 'moving_pad' && eggSound(st(wave(0), wave(700))).tier === 2, '  two waves = a moving pad (tier 2)');
  const c2 = eggSound(st(circ(0), circ(800)), 3); ok(['fm_glass', 'grain_shimmer'].includes(c2.row) && c2.long && c2.tier === 2, '  two circles = a long glassy ring');
  ok(['harp_pluck', 'koto', 'kora', 'nylon_guitar', 'oud', 'charango', 'guqin', 'sitar'].includes(row(flick(0, 140))) && ['marimba', 'balafon', 'vibraphone', 'mbira', 'santur', 'gender', 'saron', 'glockenspiel'].includes(row(flick(0, 25))), '  flick = pluck, a fast flick = struck');
  ok(row(wave(0), circ(700)) === 'choir' && row(tapS(0), wave(500)) === 'sample_chop' && EGG_COMBOS.length === 5, '  hidden combos: wave+circle = choir, taps+wave = sample chop');
  ok(eggFeel(st(wave(0, 30, 2000))) < .3 && eggFeel(st(wave(0, 30, 150), wave(200, 30, 150), wave(400, 30, 150))) >= .8, '  feel: slow = ambient (<.3), a fast series = hard (>=.8)');
  // the live egg: open, strokes extend the window, hatch shapes the recipe
  const n0 = sm.ohms.length; let g = E.open(30, 40, { turns: 2 }); ok(g && E.hitAt(300, 400) === 'on' && E.hitAt(360, 400) === 'beside' && E.hitAt(700, 400) === null && sm.ohms.length === n0, '  open: an egg, no ohm yet; on / beside / away');
  N = 1000; E.stroke(tapS(1000)); N = 1200; E.stroke(tapS(1200)); N = 2600; E.tick(); ok(E.cur && sm.ohms.length === n0, '  each stroke on the egg extends the 1.5 s window');
  N = 2800; E.tick(); const o = sm.byId.get(E.last.id), r = RC.get(o.recipe); ok(!E.cur && o && o.born === 'spiral' && r.inst.a === 'snare' && r.egg.row === 'snare', `  hatch: a spiral ohm with the egg's sound (${r.inst.a})`);
  ok(Object.keys(br.of(o).e).some(k => k.startsWith('pattern:')), '  the tap timing is its rhythm (a brain pattern)');
  const j = TJ(r); ok(j.inst && j.inst.a === 'snare', '  the sound is saved with its recipe (toJSON keeps the row)');
  un.undo(); ok(!sm.byId.get(o.id), '  3-finger undo after the hatch removes the ohm'); un.redo(); ok(sm.byId.get(o.id) === o, '  redo brings it back');
  N = 5000; g = E.open(10, 10); un.undo(); ok(!E.cur && sm.byId.size === sm.ohms.length, '  undo during the window removes the egg'); un.redo(); ok(!E.cur && E.last && sm.byId.get(E.last.id), '  redo hatches it');
  N = 8000; E.open(20, 20); const gx = E.cur.x; E.stroke(nudge(8000)); ok(E.cur.x !== gx && E.nudges === 1, '  an unrecognised stroke nudges the egg'); E.slide(305, 400); ok(E.cur.x < gx + 5, '  a touch beside the egg slides it aside');
  N = 8100; E.stroke(circ(8100)); E.stroke(flick(8800)); N = 9000; const before = E.hatched; E.open(50, 50); ok(E.hatched === before + 1 && RC.get(sm.byId.get(E.last.id).recipe).inst.a === 'gong' && E.tier3 >= 1, '  a new spiral hatches the open egg first (circle+flick = gong, tier 3)');
  N = 11000; E.tick(); ok(!E.cur && E.last.row === null, '  no stroke = the quick random ohm (recipe untouched)');
  const h = (E.open(60, 60), E.stroke(wave(11000)), E.hints()); ok(h.filter(x => x.tier === 3 && x.lit).length === 1 && h.find(x => x.k === 'wave>circle').lit, '  orbit hints: the combo one stroke away lights up'); N = 20000; E.tick();
  const t0 = performance.now(); for (let i = 0; i < 20000; i++) readEggStroke(wave(0), eg); const per = (performance.now() - t0) / 20000; ok(per < .05, `  cost per egg stroke ${(per * 1000).toFixed(2)} us`); Math.random = MR; }
console.log('16. clay (switch clay, OFF by default): shape the sound with your hands before it hatches (old game v0.8 R5 / R7)');
{ const { createMusic: CM } = await import('../www/js/music.js'); const { createEvents: CE } = await import('../www/js/events.js'); const { createSim: CS } = await import('../www/js/sim.js');
  const { createSpawn: CSp } = await import('../www/js/spawn.js'); const { createUndo: CU } = await import('../www/js/undo.js'); const { createBrain: CB } = await import('../www/js/brain.js');
  const MR = Math.random, { rng: RNG } = await import('../www/js/rng.js'); Math.random = RNG(1616);   // seeded (restored below)
  const K = await import('../www/js/clay.js'); const { recipes: RC, toJSON: TJ } = await import('../www/js/recipe.js');
  let TT = 0, N = 0; const mu = CM(() => TT), bu = CE(mu), sm = CS(mu, bu); sm.reseed(5); const un = CU(bu, mu), sp = CSp(sm, bu, un), br = CB(sm, mu); const notes = []; bu.on('note', ev => { if (ev.by === 'clay') notes.push(ev); });
  const toS = (x, y) => ({ x: x * 10, y: y * 10, s: 1 }), Cl = K.createClay({ sim: sm, bus: bu, music: mu, spawn: sp, undo: un, brain: br, toS, now: () => N });
  ok(K.CLAY_OPTS.on === false && Cl.open(1, 1) === null && !Cl.cur, '  default OFF: open() does nothing (the spiral spawns at once)');
  // end rest: the finger stays still >= 450 ms before the lift
  const spi = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * 4 * Math.PI, r = 10 + i; spi.push([300 + r * Math.cos(a), 400 + r * Math.sin(a), i * 15]); }
  ok(K.endRest(spi, 900 + 500) >= 450 && K.endRest(spi, 905) < 450, '  end rest: a held spiral end reads >= 450 ms, a plain lift does not');
  const c = { x: 300, y: 400 }, R = 40, O = K.CLAY_OPTS, rd = (F, first = true) => K.readClay(F, c, R, O, first);
  const line = (x0, y0, x1, y1, ms, n = 12, t = 0) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, t + ms * i / n]);
  const rub = (amp, ms, rev = 6) => Array.from({ length: rev * 6 + 1 }, (_, i) => [300 + amp * Math.sin(i / 6 * Math.PI), 400, ms * i / (rev * 6)]);
  const tap = (t = 0) => [[300, 400, t], [301, 400, t + 90]];
  ok(rd([tap()]).k === 'tap' && rd([line(330, 400, 400, 400, 120)]).k === 'limb' && rd([rub(20, 900)]).k === 'rub' && rd([[[300, 400, 0], [302, 400, 300], [330, 400, 400], [345, 400, 450]]]).k === 'blow', '  first touch: tap / flick out / rub / still-then-move read as struck / plucked / bowed / blown');
  const sq = rd([line(260, 400, 285, 400, 300), line(340, 400, 315, 400, 300)]); ok(sq.k === 'squeeze', '  a two-finger squeeze first = voiced');
  ok(rd([rub(20, 900)], false).k === 'grit' && rd([rub(6, 800, 4)], false).k === 'wiggle', '  later: scribble = grit, small wiggle = vibrato');
  ok(rd([line(335, 400, 400, 400, 900)]).k === 'tail' && rd([line(338, 400, 300, 400, 300)]).k === 'dent' && rd([[[300, 400, 0], [301, 400, 900]]]).k === 'fire', '  slow pull out = tail, push in from the rim = dent, still hold = fire');
  ok(rd([line(350, 380, 350, 395, 300), line(350, 420, 350, 405, 300)], false).k === 'point' && rd([line(330, 400, 370, 400, 300), line(330, 410, 370, 412, 300)], false).k === 'split', '  two fingers from outside pinching in = pull a point; two at the edge pulled out = split');
  ok(rd([line(280, 400, 300, 380, 300), line(320, 400, 300, 420, 300)], false).k === 'twist' && rd([tap(), tap(10)]).k === 'tap2', '  two-finger twist steps the voice; two-finger tap = freeze');
  // the live clay
  Cl.opts.on = true; const n0 = sm.ohms.length; let g = Cl.open(30, 40, { turns: 2 });
  ok(g && Cl.hitAt(300, 400) === 'on' && Cl.hitAt(360, 400) === 'on' && Cl.hitAt(500, 400) === null && sm.ohms.length === n0, '  open: a lump of clay, no ohm yet; touches within 1.6 R are on it');
  N = 100; Cl.touch([tap(100)]); ok(g.S.fam === 'struck' && K.CLAY_FAMILIES.struck.includes(g.S.row) && notes.length >= 2, `  first tap = struck (${g.S.row}); a short phrase plays after the touch`);
  N = 200; Cl.touch([rub(20, 900)]); ok(g.S.fam === 'struck' && g.S.grit > 0, '  the family stays; later scribble = grit');
  const lumpy = K.shapeOf(g.S).lumpy; ok(lumpy > 0, '  plastic: the outline keeps its deformation');
  N = 300; Cl.touch([line(338, 400, 300, 400, 300)]); ok(g.S.dent > 0, '  dent = body resonance');
  N = 400; Cl.touch([line(350, 380, 350, 395, 300), line(350, 420, 350, 405, 300)]); N = 500; Cl.touch([line(250, 380, 250, 395, 300), line(250, 420, 250, 405, 300)]); N = 600; const snap = JSON.stringify(g.S); Cl.touch([line(280, 350, 295, 350, 300), line(320, 350, 305, 350, 300)]);
  ok(K.shapeOf(g.S).points >= 2, `  pulled points stay as points (${K.shapeOf(g.S).points})`);
  const undoN = un.done.length; un.undo(); ok(JSON.stringify(g.S) === snap && Cl.cur === g, '  3-finger undo = one shaping step back (the clay stays)'); un.redo();
  N = 7000; Cl.tick(); ok(Cl.cur, '  each touch resets the ~8 s ring'); N = 9000; Cl.touch([tap(9000)]); N = 9100; Cl.touch([tap(9100)]);
  N = 9200; Cl.touch([tap(9200), tap(9210)]); ok(g.S.frozen, '  two-finger tap freezes the ring'); N = 40000; Cl.tick(); ok(Cl.cur === g, '  frozen clay waits (the 20 s cap is the ring\'s, not a frozen clay\'s)');
  const nb = notes.length; N = 40100; Cl.touch([tap(40100), tap(40110)]); const o = sm.byId.get(Cl.last.id), r = RC.get(o.recipe);
  ok(!Cl.cur && o && o.born === 'spiral' && r.clay && r.clay.row === g.S.row && r.inst.a === g.S.row && notes.length - nb >= 4, `  second two-finger tap confirms: a rising phrase, then an ohm with the clay's voice (${r.inst.a})`);
  const shaped = K.clayRecipe(g.base, g.S).synth.genes, plain = K.clayRecipe(g.base, Object.assign(K.clayState(g.seed), { fam: g.S.fam, row: g.S.row })).synth.genes; ok(shaped.bodyRes > plain.bodyRes && shaped.sat > plain.sat && r.clay.touches === g.S.touches, '  the shape is in its genes (dent = bodyRes, points / grit = drive)');
  ok(Object.keys(br.of(o).e).some(k => k.startsWith('pattern:')), '  3+ taps on the clay = its motif rhythm (a brain pattern)');
  ok(!un.done.some(a => a.clayStep), '  after the hatch the shaping steps fold into one undo entry'); un.undo(); ok(!sm.byId.get(o.id), '  undo after the hatch removes the ohm'); un.redo();
  ok(TJ(r).inst.a === r.inst.a, '  saved with its recipe');
  // fire, split, size, role, untouched
  N = 50000; g = Cl.open(5, 5); Cl.touch([[[50, 50, 0], [51, 50, 1800]]]); Cl.touch([[[50, 50, 0], [51, 50, 1800]]]); ok(K.clayRow(g.S) === 'bronze_bell' && g.S.fire >= .66, '  fire twice: metallic bell'); Cl.hatch();
  const rf = RC.get(sm.byId.get(Cl.last.id).recipe); ok(rf.synth.genes.inharm > .3 && rf.modal.p.inharm >= .55, '  fired = inharmonic');
  N = 60000; g = Cl.open(7, 7); for (let i = 0; i < 7; i++) Cl.touch([line(100, 70, 140, 70, 300), line(100, 80, 140, 82, 300)]); ok(g.S.split === 5, '  split: appendage section, cap 5');
  Cl.touch([line(60, 70, 40, 70, 300), line(80, 70, 100, 70, 300)]); ok(g.S.k > 1, '  pinch = size: spread = bigger (lower)'); Cl.hatch(); const rs = RC.get(sm.byId.get(Cl.last.id).recipe); ok(rs.synth.genes.detune >= .7 && rs.clay.split === 5, '  section = detune + width (never new ohms)');
  const nO = sm.ohms.length; N = 70000; g = Cl.open(9, 9); N = 80000; Cl.tick(); ok(!Cl.cur && sm.ohms.length === nO + 1 && !Cl.last.fam && Cl.last.row, `  untouched: the ring closes, a fully random voice (${Cl.last.row})`);
  const S1 = K.clayState(1); K.deform(S1, 0, .8, .3); K.deform(S1, Math.PI, .8, .3); ok(K.roleOf(S1) === 'bass', '  wide = bass lean'); const S2 = K.clayState(1); K.deform(S2, Math.PI / 2, .8, .3); K.deform(S2, -Math.PI / 2, .8, .3); ok(K.roleOf(S2) === 'lead', '  tall = lead');
  ok(K.roleOf(K.clayState(1)) === 'pad', '  round = pad');
  N = 90000; g = Cl.open(3, 3); Cl.touch([tap(1)]); const cur = Cl.cur; Cl.open(4, 4); ok(Cl.cur !== cur && Cl.last.fam === 'struck', '  a new spiral hatches the open clay'); Cl.opts.on = false; Cl.hatch();
  const t0 = performance.now(); for (let i = 0; i < 5000; i++) rd([rub(20, 900)]); const per = (performance.now() - t0) / 5000; ok(per < .05, `  cost per clay touch read ${(per * 1000).toFixed(2)} us`);
  const t1 = performance.now(); for (let i = 0; i < 2000; i++) K.clayRecipe(g.base, g.S); const per2 = (performance.now() - t1) / 2000; ok(per2 < .2, `  cost per clay recipe ${(per2 * 1000).toFixed(1)} us`); Math.random = MR; }
console.log('17. catch in a bubble and carry (switch bubbleCatch, OFF by default; old game R5.17 catch / ark)');
{ const { createMusic: CM } = await import('../www/js/music.js'); const { createEvents: CE } = await import('../www/js/events.js'); const { createSim: CS } = await import('../www/js/sim.js'); const { createUndo: CU } = await import('../www/js/undo.js');
  const MR = Math.random, { rng: RNG } = await import('../www/js/rng.js'); Math.random = RNG(1717);
  const Bm = await import('../www/js/bubble.js');
  let TT = 0; const mu = CM(() => TT), bu = CE(mu), sm = CS(mu, bu); sm.reseed(5); const un = CU(bu, mu);
  const toS = (x, y) => ({ x: x * 10, y: y * 10, s: 10 }), toW = (x, y) => ({ x: x / 10, y: y / 10 });
  let keyed = null; const world = { system: { key: k => (keyed = k, 'K' + k) } };
  const heard = []; bu.on('note', ev => heard.push(ev));
  const prevShape = ev => ({ ...ev, sky: 1 }); bu.shape = prevShape;   // the chain keeps skyMood's shaper first
  const Bb = Bm.createBubbles({ sim: sm, bus: bu, undo: un, toS, toW, world });
  for (const [x, y] of [[20, 20], [40, 20], [60, 30]]) sm.spawn(x, y, 900 + x, 'spiral'); if (!sm.ohm) sm.ohm = sm.ohms.find(q => q.body.x > 55);
  const me = sm.ohm, others = sm.ohms.filter(q => q !== me && !q.parked && q.body.x < 50); const o = others[0]; ok(o && me, `  setup: ohms besides yours (${sm.ohms.length})`);
  const loopAt = (cx, cy, r, n = 40, t0 = 0) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(i / n * 2 * Math.PI), cy + r * Math.sin(i / n * 2 * Math.PI), t0 + i * 12]);
  const S0 = toS(o.body.x, o.body.y), near = others.filter(q => q !== o && Math.hypot(toS(q.body.x, q.body.y).x - S0.x, toS(q.body.x, q.body.y).y - S0.y) < 40);
  near.forEach((q, i) => { q.body.x += 30 + i; });   // keep the loop round o alone
  if (me && Math.hypot(toS(me.body.x, me.body.y).x - S0.x, toS(me.body.x, me.body.y).y - S0.y) < 40) me.body.x += 30;
  const L = loopAt(S0.x, S0.y, 30);
  ok(Bm.BUBBLE_OPTS.on === false && Bb.stroke(L, undefined, L[L.length - 1][2]) === false && !Bb.has(o), '  default OFF: a loop round one ohm does nothing (v0.0.30)');
  Bb.opts.on = true;
  ok(Bm.isLoop(L) && Bm.ohmsInLoop(L, sm.ohms, toS).length === 1, '  the loop reads closed with one ohm inside');
  const rested = L.concat([[L[L.length - 1][0], L[L.length - 1][1], L[L.length - 1][2] + 600]]); ok(Bb.stroke(rested, undefined, rested[rested.length - 1][2]) === false, '  a rested loop is not a catch (stays the effect object)');
  const two = others.find(q => q !== o); const L2 = two ? loopAt((S0.x + toS(two.body.x, two.body.y).x) / 2, (S0.y + toS(two.body.x, two.body.y).y) / 2, Math.hypot(S0.x - toS(two.body.x, two.body.y).x, S0.y - toS(two.body.x, two.body.y).y) / 2 + 30, 60) : null;
  ok(!L2 || Bm.ohmsInLoop(L2, sm.ohms, toS).length < 2 || Bb.stroke(L2, undefined, L2[L2.length - 1][2]) === false, '  a loop round 2+ ohms is not a catch (stays herd select)');
  if (me) { const Sm = toS(me.body.x, me.body.y), Lm = loopAt(Sm.x, Sm.y, 12); ok(Bm.ohmsInLoop(Lm, sm.ohms, toS).length !== 1 || Bm.ohmsInLoop(Lm, sm.ohms, toS)[0] !== me || Bb.stroke(Lm, undefined, Lm[Lm.length - 1][2]) === false, '  your own ohm cannot be caught'); }
  ok(Bb.stroke(L, undefined, L[L.length - 1][2]) === true && Bb.has(o) && o.caught && Bb.caught === 1, '  CATCH: a loop round one ohm, lifted, puts it in a bubble');
  const bx = Bb.list.get(o.id).x, by = Bb.list.get(o.id).y; o.body.vx = 3; o.body.x += 5; Bb.tick(); ok(Math.abs(o.body.x - bx) < 1e-6 && o.body.vx === 0 && Math.abs(o.body.y - by) < .5, '  it floats: pinned to the bubble (only a small bob), no walking');
  heard.length = 0; bu.note({ src: o, auto: true, vel: .8, kind: 'hit' }); bu.note({ src: others[1] || me, auto: true, vel: .8, kind: 'hit' });
  ok(heard[0] && Math.abs(heard[0].vel - .8 * Bb.opts.bubbleVel) < 1e-9 && heard[0].sky === 1 && (!heard[1] || heard[1].vel === .8), '  its own music plays softer through the skin; skyMood\'s shaper still runs first; others untouched');
  ok(Bb.hitAt(S0.x + 5, S0.y) && !Bb.hitAt(S0.x + 400, S0.y), '  the bubble is hit first: a touch on it is the bubble\'s');
  un.undo(); ok(!Bb.has(o) && !o.caught, '  3-finger undo frees it'); un.redo(); ok(Bb.has(o), '  redo catches it again');
  // drag = carry; tap = pop
  const fin = (x0, y0, pts) => ({ x0, y0, t0: pts[0][2], x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], pts });
  const b = Bb.list.get(o.id); const drag = [[S0.x, S0.y, 0], [S0.x + 40, S0.y + 20, 300], [S0.x + 80, S0.y + 40, 900]]; let p = fin(S0.x, S0.y, drag.slice(0, 1)); Bb.down(b, p);
  for (let i = 1; i < drag.length; i++) { p.pts = drag.slice(0, i + 1); p.x = drag[i][0]; p.y = drag[i][1]; Bb.move(p); }
  ok(Bb.up(p).k === 'carry' && Math.abs(b.x - (S0.x + 80) / 10) < 1e-6 && Bb.has(o), '  DRAG moves the bubble (a slow drag, held or not, just carries it: no home hold)');
  const S1 = toS(b.x, b.y); p = fin(S1.x, S1.y, [[S1.x, S1.y, 0], [S1.x + 2, S1.y, 120]]); p.t0 = performance.now(); Bb.down(b, p); ok(Bb.up(p).k === 'pop' && !Bb.has(o) && Bb.pops === 1, '  TAP pops it: free');
  // flick up = farewell, undo restores
  Bb.catchOhm(o); const b2 = Bb.list.get(o.id), S2 = toS(b2.x, b2.y); const fl = [[S2.x, S2.y, 0], [S2.x, S2.y - 60, 60], [S2.x, S2.y - 160, 120]];
  p = fin(S2.x, S2.y, fl.slice(0, 1)); Bb.down(b2, p); for (let i = 1; i < fl.length; i++) { p.pts = fl.slice(0, i + 1); p.x = fl[i][0]; p.y = fl[i][1]; Bb.move(p); }
  ok(Bb.up(p).k === 'farewell' && !sm.byId.get(o.id) && Bb.farewells === 1, '  FLICK UP (fast and far) = farewell: the ohm leaves');
  un.undo(); ok(sm.byId.get(o.id) && !Bb.has(o), '  3-finger undo restores it'); un.redo(); ok(!sm.byId.get(o.id), '  redo sends it off again'); un.undo();
  Bb.catchOhm(o); const b3 = Bb.list.get(o.id), S3 = toS(b3.x, b3.y), slow = [[S3.x, S3.y, 0], [S3.x, S3.y - 70, 400], [S3.x, S3.y - 150, 900]];
  p = fin(S3.x, S3.y, slow.slice(0, 1)); Bb.down(b3, p); for (let i = 1; i < slow.length; i++) { p.pts = slow.slice(0, i + 1); p.x = slow[i][0]; p.y = slow[i][1]; Bb.move(p); } ok(Bb.up(p).k === 'carry' && sm.byId.get(o.id), '  a slow push up is only a carry (no farewell)');
  // carry to a new planet
  bu.post({ type: 'world.land', planet: 3, layer: 0 }); ok(keyed === 3 && o.pl === 'K3' && o.away === false && Bb.carried === 1 && (!me || Math.abs(toS(Bb.list.get(o.id).x, 0).x - toS(me.body.x, 0).x) <= Bb.opts.landPx * 1.01), '  CARRY: landing elsewhere, caught ohms come with you and float next to you');
  ok(!Bb.catchOhm(me), '  your own ohm never goes in a bubble');
  { const wk = others.find(q => q !== o && sm.byId.get(q.id) && !Bb.has(q)); if (wk) { const s0 = toS(wk.body.x, wk.body.y); Bb.mark(); wk.body.x += 12; const Lw = loopAt(s0.x, s0.y, 30);   // it walked 120 px out before the lift
      const away = sm.ohms.filter(q => q !== wk && q !== me && Math.hypot(toS(q.body.x, q.body.y).x - s0.x, toS(q.body.x, q.body.y).y - s0.y) < 40); away.forEach(q => { q.body.y += 20; });
      ok(Bm.ohmsInLoop(Lw, sm.ohms, toS).length === 0 && Bb.stroke(Lw, undefined, Lw[Lw.length - 1][2]) === true && Bb.has(wk), '  a walking ohm inside the loop at the start (not at the lift) is still caught'); Bb.free(wk, false); } }
  const t0 = performance.now(); for (let i = 0; i < 2000; i++) { Bb.tick(); Bb.stroke(L, undefined, L[L.length - 1][2] + 600); } const per = (performance.now() - t0) / 2000; ok(per < .2, `  cost per tick + rejected loop ${(per * 1000).toFixed(1)} us`);
  Bb.opts.on = false; Math.random = MR; }
// 18 JAM VIEW (old game v08-jamview; switch jamView OFF): entry by a deep pinch out on a jam's empty middle, the ring / mark / body /
// bead / clock / disc controls, changes landing on the bar or phrase line, the view's own undo, breakdown / build, leaving
{ const sm = fakeSim(6), [o1, o2, o3, o4, o5] = sm.ohms; o1.body = { x: -1.5, y: 0 }; o2.body = { x: 1.5, y: 0 }; for (const o of sm.ohms) o.g = { r: .4 }; o3.body = { x: -20, y: 9 }; o4.body = { x: -21, y: 9 }; o5.body = { x: -22, y: 9 };
  const hs = new Map(), bu = { posts: [], heard: [] }; bu.on = (t, f) => { if (!hs.has(t)) hs.set(t, []); hs.get(t).push(f); }; bu.post = ev => { bu.posts.push(ev); for (const f of hs.get(ev.type) || []) f(ev); };
  bu.note = ev => { if (bu.shape && ev.auto) { ev = bu.shape(ev); if (!ev) return null; } bu.heard.push(ev); return ev; };
  const mu = fakeMusic(); Object.assign(mu, { mode: 'major', modeHow: null, lock: false, swing: 0, tempoK: 1 }); mu.setKey = k => { mu.key = ((k % 12) + 12) % 12; }; mu.setMode = (m, h) => { mu.mode = m; mu.modeHow = m === 'minor' ? h : null; return true; }; mu.setBpm = v => { mu.bpm = v; }; mu.setTempoK = k => { mu.tempoK = k; };
  const song = { id: 's1', form: ['A', 'B', 'A', 'C'], sec: { A: [0, 3], B: [4, 5], C: [1, 1] }, end: [0] }, G1 = { id: 1, members: [o3, o4, o5], song, state: 'song', start: 0, L: null };
  const aj = { jams: [{ a: o1, b: o2, k: 1 }] }, sg = { groups: [], groupOf: () => null }, JR = { g: new Map([['g1', { front: o4.id }]]) };
  sm.autoFor = () => null; const W = 400, H = 800; VCAM.z = 0; VCAM.sim = { x: 0, y: 0, z: 1 }; let busyNow = false, looked = 0;
  const V = createJamView({ sim: sm, bus: bu, music: mu, autojam: aj, songs: sg, jamRoles: JR, busy: () => busyNow, look: () => ({ jamViewBead: () => { looked++; return false; } }), size: () => ({ W, H }) });
  const mid = { x: 200, y: 288 }; ok(V.zoom(.3, mid.x, mid.y, W, H) === false && !V.open, '  OFF: a pinch out on a jam\'s middle is plain zoom (nothing taken)');
  V.opts.on = true; ok(V.zoom(.3, 200, 640, W, H) === false && V.zoom(.3, 122, 288, W, H) === false, '  ON: pinch zoom away from a jam, or on an ohm (dive / squeeze), is untouched');
  ok(V.zoom(-.3, mid.x, mid.y, W, H) === false, '  ON: pinching IN on a jam\'s middle zooms as before (only a spread enters)');
  busyNow = true; ok(V.zoom(.3, mid.x, mid.y, W, H) === false, '  the river open: no entry'); busyNow = false; VCAM.z = 1.2; ok(V.zoom(1.5, mid.x, mid.y, W, H) === false, '  deeper than the home band: no entry'); VCAM.z = 0;
  ok(V.zoom(.3, mid.x, mid.y, W, H) === true && !V.open, '  a spread starting on the middle holds the camera'); ok(V.zoom(.6, mid.x, mid.y, W, H) === true && V.open && V.G.members.includes(o1), '  ... and deep enough opens the jam view');
  const L = V.layout(), m0 = L.mem[0], m1 = L.mem[1], at = (a, r) => ({ x: L.cx + r * Math.cos(a), y: L.cy + r * Math.sin(a) });
  let pid = 1; const touch = (pts, lift = true, dt = 40) => { const t0 = performance.now(), p = { x0: pts[0].x, y0: pts[0].y, x: pts[0].x, y: pts[0].y, t0, pts: [[pts[0].x, pts[0].y, t0]] }, e = { pointerId: pid++ }; V.down(e, p);
    pts.slice(1).forEach((q, i) => { p.x = q.x; p.y = q.y; p.pts.push([q.x, q.y, t0 + dt * (i + 1)]); V.move(e, p); }); return lift ? V.up(e, p) : { e, p }; };
  ok(V.hitAt(m0.x, m0.y).k === 'body' && V.hitAt(L.cx, L.cy).k === 'disc' && V.hitAt(L.cx, L.cy - (L.c0 + L.c1) / 2).k === 'clock' && V.hitAt(at(m0.a + .5, L.R).x, at(m0.a + .5, L.R).y).k === 'ring', '  hit order: body, disc, clock band, ring');
  const ra = at(m0.a + .5, L.R); ok(touch([ra]) === 'mute' && o1.muted === true, '  RING tap = mute, at once'); V.undo(); ok(!o1.muted, '  the view\'s undo unmutes'); V.redo(); ok(o1.muted, '  redo mutes again'); V.undo();
  const arc = n => Array.from({ length: n + 1 }, (_, i) => at(m0.a + .5 + .4 * i / n, L.R));
  ok(touch(arc(4)) === 'vol' && (V.mix.get(o1.id) || { vol: 1 }).vol === 1 && V.q.size === 1, '  slide ALONG = volume, waiting for the bar');
  mu.b = 4; V.tick(); const v1 = V.mix.get(o1.id).vol; ok(v1 > 1.2 && v1 <= 1.35 && V.q.size === 0, `  ... lands on the next bar (vol ${v1.toFixed(2)}, cap 1.35)`);
  ok(sm.autoFor(o1).vol > 1.4 && sm.autoFor(o2) === null, '  the level reaches the sound (sim.autoFor chain); others untouched');
  const rad = [at(m0.a + .5, L.R), at(m0.a + .5, L.R + 30), at(m0.a + .5, L.R + 90)]; ok(touch(rad) === 'oct' && (mu.b = 8, V.tick(), V.mix.get(o1.id).oct === 2), '  slide OUT = register, one octave per 42 px (2 up)');
  bu.heard.length = 0; bu.note({ src: o1, kind: 'note', deg: 0, oct: 1, beat: 9, t: 4.5, auto: 1 }); ok(bu.heard[0].oct === 3, '  its notes play two octaves up');
  { const { e, p } = touch([ra], false); await new Promise(r => setTimeout(r, V.opts.holdMs + 60)); const q = at(m0.a + .9, L.R); p.x = q.x; p.y = q.y; p.pts.push([q.x, q.y, performance.now()]); V.move(e, p); ok(V.up(e, p) === 'bright', '  HOLD 450 ms on the ring, then slide = brightness'); mu.b = 12; V.tick(); ok(V.mix.get(o1.id).bright > .3 && sm.autoFor(o1).cutK > 1, '  ... brighter (the filter opens)'); }
  // phrase marks: captured from what it played; tap = pin; drag onto the other = trade; drag along = shift
  for (const b of [12, 13.5, 14]) bu.note({ src: o1, kind: 'note', deg: 2, oct: 0, vel: .7, beat: b, t: b / 2, auto: 1 }); bu.note({ src: o1, kind: 'note', deg: 4, beat: 16, t: 8, auto: 1 });
  for (const b of [12.5, 15]) bu.note({ src: o2, kind: 'note', deg: 5, oct: 0, vel: .6, beat: b, t: b / 2, auto: 1 }); bu.note({ src: o2, kind: 'note', deg: 4, beat: 16.2, t: 8.1, auto: 1 });
  const L2 = V.layout(), mk = L2.marks.find(q => q.m.o === o1); ok(L2.marks.filter(q => q.m.o === o1).length === 3 && mk && V.hitAt(mk.x, mk.y).k === 'mark', '  PHRASE MARKS: its last bar, outside the ring');
  ok(touch([mk]) === 'pin' && (mu.b = 16, V.tick(), V.pins.has(o1.id)), '  tap a mark = pin, on the bar'); bu.heard.length = 0; bu.note({ src: o1, kind: 'note', deg: 6, beat: 17, t: 8.5, auto: 1 });
  ok(!bu.heard.some(n => n.deg === 6), '  pinned: its live notes give way'); bu.heard.length = 0; mu.b = 20; V.tick(); ok(bu.heard.filter(n => n.src === o1 && n._jv).length === 3 && bu.heard.every(n => n.beat >= 24 && n.beat < 28 && n.oct === 2), '  ... and the pinned bar plays, a bar ahead (its register still applies)');
  const mk2 = V.layout().marks.find(q => q.m.o === o1), L3 = V.layout(); ok(touch([mk2, { x: (mk2.x + L3.mem[1].x) / 2, y: (mk2.y + L3.mem[1].y) / 2 }, L3.mem[1]]) === 'trade' && (mu.b = 24, V.tick(), V.pins.get(o2.id).notes.length === 3 && V.pins.get(o1.id).notes.length === 2), '  drag a mark onto the other member = trade (a two-way swap)');
  V.undo(); mu.b = 28; V.tick(); ok(V.pins.get(o1.id).notes.length === 3 && !V.pins.has(o2.id), '  undo of a landed trade queues its inverse, landing on the bar');
  const mk3 = V.layout().marks.find(q => q.m.o === o1); const sh = [mk3, ...[1, 2, 3].map(i => at(mk3.a + i * .12, Math.hypot(mk3.x - L.cx, mk3.y - L.cy)))]; ok(touch(sh) === 'shift' && (mu.b = 32, V.tick(), V.mix.get(o1.id).shift > 0), '  drag a mark along = shift the phrase in the bar');
  // body drag = swap roles; jamroles front
  JR.g.set(V.G.key, { front: o1.id }); ok(touch([m0, { x: (m0.x + m1.x) / 2, y: (m0.y + m1.y) / 2 }, m1]) === 'roles' && (mu.b = 36, V.tick(), JR.g.get(V.G.key).front === o2.id), '  drag a BODY onto the other = swap roles (the front moves)');
  ok(touch([m1]) === 'mute' && o2.muted, '  tap a body = mute'); V.undo();
  // item knot
  const kn = V.layout().knots[0]; if (kn) { const m0x = kn.it.ctl.mix, r0 = Math.hypot(kn.x - L.cx, kn.y - L.cy); ok(V.hitAt(kn.x, kn.y).k === 'knot' && touch([kn, at(kn.a + .2, r0), at(kn.a + .4, r0)]) === 'item' && (mu.b = 40, V.tick(), kn.it.ctl.mix !== m0x && bu.posts.some(p => p.type === 'set' && p.src === kn.m.o)), '  ITEM KNOT slide = that item\'s mix (it never adds or removes items)'); kn.it.ctl.mix = m0x; }
  // clock: a full turn round = tempo x2; radial = swing; disc: rim twist = key, inner = mood; all on the phrase line
  const cr = (L.c0 + L.c1) / 2, turn = Array.from({ length: 13 }, (_, i) => at(-Math.PI / 2 + i * Math.PI / 6 * .999, cr)); ok(touch(turn) === 'tempo' && mu.bpm === 120, '  CLOCK round = tempo, waiting for the phrase');
  mu.b = 44; V.tick(); ok(mu.bpm === 120, '  ... not on a plain bar'); mu.b = 48; V.tick(); ok(mu.bpm === 240, '  ... lands on the phrase line: a full turn = double (snapped)');
  ok(touch([at(Math.PI / 2, L.c0 + 2), at(Math.PI / 2, L.c0 + 20), at(Math.PI / 2, L.c0 + 40)]) === 'swing' && (mu.b = 64, V.tick(), mu.swing > .3), '  CLOCK radial = swing');
  const dr = L.disc * .9, tw = [0, .3, .6, .9, 1.06].map(a => at(a, dr)); ok(touch(tw) === 'key' && (mu.b = 80, V.tick(), mu.key === 2), '  CENTRE rim twist 60 deg = key two fifths up (C -> D)');
  ok(touch([{ x: L.cx, y: L.cy }, { x: L.cx, y: L.cy + 20 }, { x: L.cx, y: L.cy + 34 }]) === 'mood' && (mu.b = 96, V.tick(), mu.mode === 'minor'), '  CENTRE inner slide down = darker mood (relative minor)');
  V.undo(); ok(V.q.size === 1, '  undo of a landed mood queues its inverse'); V.undo(); ok(V.q.size === 2, '  ...'); V.redo(); ok(V.q.size === 1, '  redo of a queued undo cancels it'); mu.b = 112; V.tick(); ok(mu.mode === 'major' && mu.key === 2, '  the queued inverse lands on the phrase line');
  // two fingers: exit elsewhere; on the centre = breakdown / build (song group with 3 members + beads)
  const two = (a0, b0, a1, b1) => { const t0 = performance.now(), mk = (q, id) => ({ e: { pointerId: id }, p: { x0: q.x, y0: q.y, x: q.x, y: q.y, t0, pts: [[q.x, q.y, t0]] } }), A = mk(a0, 901), B = mk(b0, 902); V.down(A.e, A.p); V.down(B.e, B.p);
    A.p.x = a1.x; A.p.y = a1.y; V.move(A.e, A.p); B.p.x = b1.x; B.p.y = b1.y; V.move(B.e, B.p); V.up(A.e, A.p); V.up(B.e, B.p); };
  two({ x: 60, y: 700 }, { x: 260, y: 700 }, { x: 130, y: 700 }, { x: 190, y: 700 }); ok(!V.open && bu.posts.some(p => p.type === 'jamview.leave'), '  pinch IN elsewhere = leave'); ok(V.mix.get(o1.id).vol > 1.2, '  edits stay with the jam after leaving');
  sg.groups = [G1]; sg.groupOf = o => G1.members.includes(o) ? G1 : null; mu.b = 0; V.lastBar = -1; V.enter({ key: 'g1', members: G1.members, G: G1 }); const Lg = V.layout();
  ok(Lg.beads.map(b => b.sec).join() === 'B,A,C', '  SECTION BEADS: the sections still to come');
  { const g2 = { fillRect() {}, beginPath() {}, arc() {}, fill() {}, createRadialGradient: () => ({ addColorStop() {} }) }; V.draw(g2); ok(looked === 3, '  draws (plain soft look) and calls the look hooks (look.jamViewBead per bead)'); }
  const b0 = Lg.beads[0], b2 = Lg.beads[2]; ok(touch([b0, at((b0.a + b2.a) / 2, Lg.beadR), b2], true, 400) === 'reorder' && (mu.b = 16, V.tick(), song.form.join() === 'A,B,A,C' && G1.song.form.join() === 'A,A,C,B' && G1.L.length === 9), '  drag a bead = reorder (on the phrase line; the library song untouched)');
  const Lb = V.layout(), bb = Lb.beads[0]; ok(bb && touch([bb, { x: bb.x, y: bb.y - 50 }, { x: bb.x, y: bb.y - 120 }]) === 'drop' && (mu.b = 32, V.tick(), G1.song.form.length === 3), '  flick a bead off = drop that section');
  two({ x: Lg.cx - 60, y: Lg.cy }, { x: Lg.cx + 60, y: Lg.cy }, { x: Lg.cx - 20, y: Lg.cy }, { x: Lg.cx + 20, y: Lg.cy }); ok(V.open && V.q.size === 1, '  two fingers pinching IN on the centre = breakdown (never an exit)');
  mu.b = 48; V.tick(); bu.heard.length = 0; for (const o of G1.members) bu.note({ src: o, kind: 'note', deg: 0, beat: 49, t: 24.5, auto: 1 }); ok(V.bd && bu.heard.length === 2 && bu.heard.some(n => n.src === o4), `  ... lands on the phrase line: all but the front and the lowest drop out (${bu.heard.length} of 3 heard)`);
  two({ x: Lg.cx - 20, y: Lg.cy }, { x: Lg.cx + 20, y: Lg.cy }, { x: Lg.cx - 60, y: Lg.cy }, { x: Lg.cx + 60, y: Lg.cy }); mu.b = 64; V.tick(); ok(!V.bd, '  spread on the centre = build back');
  two({ x: Lg.cx - 20, y: Lg.cy }, { x: Lg.cx + 20, y: Lg.cy }, { x: Lg.cx - 60, y: Lg.cy }, { x: Lg.cx + 60, y: Lg.cy }); mu.b = 80; V.tick(); ok(V.build && sm.autoFor(o3).vol > 1.2, '  spread again = build (everyone lifts for a few bars)');
  ok(V.back() === true && !V.open && V.back() === false, '  V.back() leaves (for a back button), then does nothing');
  V.opts.on = false; bu.heard.length = 0; bu.note({ src: o1, kind: 'note', deg: 0, oct: 0, beat: 90, t: 45, auto: 1 }); ok(bu.heard[0].oct === 0 && sm.autoFor(o1) === null && V.zoom(.6, mid.x, mid.y, W, H) === false, '  switch OFF: no edits applied, no entry (v0.0.30)');
  V.opts.on = true; const t0 = performance.now(); for (let i = 0; i < 2000; i++) { bu.note({ src: o2, kind: 'note', deg: 1, beat: 100 + i * .01, t: 50, auto: 1 }); V.zoom(.01, 200, 640, W, H); } const per = (performance.now() - t0) / 2000; ok(per < .05, `  cost per note + zoom step away from jams ${(per * 1000).toFixed(1)} us`); V.opts.on = false; }
// 19 WIND ROCKS AND REED BEDS (old game v0.4a field.js; switch windRocks OFF): seeded per planet, sound in the wind on beats (rocks low,
// reeds high, on the chord now, only with an ohm near), a blown-family ohm breathes on them in still air and drifts toward one; OFF = nothing.
{ console.log('19 wind rocks and reeds');
  const heard = [], bw = { note: ev => heard.push(ev) }, env = { wind: 0 };
  const W19 = { home: { globe: { P: { seed: 4242, style: { gas: 0 } } } }, env, seed: 1 };
  const mw = { b: 0, t: 0, chord: { tones: [0, 2, 4] }, beat() { return this.b; }, now() { return this.t; }, spb: () => .5, hz: (d, o = 0) => 110 * Math.pow(2, (d / 7) + o) };
  const mkO = (id, x, row) => { const rec = makeRecipe(9000 + id, { name: 'w' + id, add: false }), rr = withRow(rec, row); recipes.set(rr.id = rec.id, rr); return { id, recipe: rr.id, body: { x, y: 7, vx: 0, vy: 0, calm: 3 } }; };
  const sw = { bounds: { x0: -4, x1: 4, y0: -5, ground: 7.5 }, groundAt: null, ohms: [], ohm: null };
  const WR = createWindRocks({ sim: sw, bus: bw, music: mw, world: W19, look: null });
  VCAM.z = 0; WR.tick(.016); ok(WR.list.length === 0 && heard.length === 0, '  OFF: no rocks, no sound');
  WR.opts.on = true; WR.tick(.016); const nR = WR.list.filter(q => q.kind === 'rock').length, nQ = WR.list.filter(q => q.kind === 'reed').length;
  ok(nR >= 1 && nR <= 2 && nQ >= 1 && nQ <= 2 && WR.list.every(q => q.x > sw.bounds.x0 + 1 && q.x < sw.bounds.x1 && q.y === 7.5), `  ON: ${nR} rocks + ${nQ} reeds on the ground, clear of the drum`);
  const pos = WR.list.map(q => q.u.toFixed(4)).join(); WR.grow(4242); ok(WR.list.map(q => q.u.toFixed(4)).join() === pos, '  same planet = same rocks (seeded, regrown, not saved)');
  W19.home.globe.P.seed = 77; WR.tick(.016); ok(WR.seed === 77, '  a new planet grows its own'); W19.home.globe.P.seed = 4242; WR.tick(.016);
  const run = (beats, fn) => { for (let i = 0; i < beats; i++) { mw.b += 1; mw.t += .5; if (fn) fn(i); WR.tick(.016); } };
  run(64); ok(heard.length === 0, '  no ohm near, still air: silent');
  env.wind = .9; run(64); ok(heard.length === 0, '  strong wind but no ohm near: silent (old game: only in the key of a near ohm)');
  const q0 = WR.list[0], o1 = mkO(1, q0.x + 6, 'marimba'); sw.ohms.push(o1); env.wind = 0; run(64); ok(heard.length === 0, '  an ohm near but still air: silent');
  env.wind = .9; heard.length = 0; run(96); const rocks = heard.filter(e => e.src.id.startsWith('wind:rock')), reeds = heard.filter(e => e.src.id.startsWith('wind:reed'));
  ok(rocks.length > 2 && reeds.length > 2, `  strong wind + an ohm near: rocks ${rocks.length}, reeds ${reeds.length} sound`);
  ok(rocks.every(e => e.f >= 98 && e.f <= 262) && reeds.every(e => e.f >= 392 && e.f <= 1047), '  rocks low (98-262 Hz), reeds high (392-1047 Hz)');
  ok(heard.every(e => [0, 2, 4].includes(e.deg)), '  on the chord sounding now');
  const gapOk = src => { const bs = heard.filter(e => e.src === src).map(e => e.t); for (let i = 1; i < bs.length; i++) if (bs[i] - bs[i - 1] < (src.id.includes('rock') ? 8 : 4) * .5 - 1e-6) return false; return true; };
  ok(WR.list.every(q => gapOk(q.src)), '  a rock at most every 2 bars, a reed at most every bar');
  env.wind = .3; heard.length = 0; run(96); const weak = heard.length; env.wind = .9; heard.length = 0; run(96); ok(weak < heard.length, `  weaker wind sounds less (${weak} < ${heard.length})`);
  // a blowing ohm: plays one in still air and drifts toward it
  env.wind = 0; heard.length = 0; sw.ohms.length = 0; const q1 = WR.list.find(q => q.kind === 'reed'), o2 = mkO(2, q1.x + 1, 'bansuri'); sw.ohms.push(o2);
  ok(WR.blower(o2) && !WR.blower(o1), '  a bansuri ohm blows, a marimba ohm does not'); run(64); ok(heard.some(e => e.src === q1.src && e.by === 'blow') && WR.stats.blown > 0, '  a blowing ohm plays the reed bed in still air');
  const o3 = mkO(3, q1.x + 4, 'bansuri'); sw.ohms.push(o3); WR.seek(.1); ok(Math.sign(o3.body.vx) === Math.sign(q1.x - o3.body.x) && Math.abs(o3.body.vx) < .2, '  a blowing ohm 4 units off drifts gently toward it');
  o3.body.vx = 0; sw.ohm = o3; WR.seek(.1); ok(o3.body.vx === 0, '  your own ohm never drifts'); sw.ohm = null; o3.body.grab = {}; WR.seek(.1); ok(o3.body.vx === 0, '  a held ohm never drifts'); o3.body.grab = null;
  const WRc = createWindRocks({ sim: sw, bus: bw, music: mw, world: W19, caught: o => o === o2, opts: { on: true } }); heard.length = 0; sw.ohms.splice(sw.ohms.indexOf(o3), 1); for (let i = 0; i < 64; i++) { mw.b++; mw.t += .5; WRc.tick(.016); } ok(!heard.some(e => e.by === 'blow'), '  a caught (bubbled) ohm does not blow');
  VCAM.z = 2; heard.length = 0; env.wind = .9; sw.ohms.push(o1); run(64); ok(heard.length === 0, '  only on the home ground (not zoomed out to space)'); VCAM.z = 0;
  W19.home.globe.P.style.gas = 1; WR.grow(4242); ok(WR.list.length === 0, '  a gas giant has none'); W19.home.globe.P.style.gas = 0; WR.grow(4242);
  let drawn = 0, looked = 0; const g = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => { drawn++; }, set: () => true });
  WR.draw(g, (x, y) => ({ x: x * 50 + 200, y: y * 50, s: 50 })); const L = { windRock: () => (looked++, true), windReed: () => (looked++, true) }; const WRl = createWindRocks({ sim: sw, bus: bw, music: mw, world: W19, look: () => L, opts: { on: true } }); WRl.tick(.016); WRl.draw(g, (x, y) => ({ x, y, s: 50 }));
  ok(drawn > 0 && looked === WRl.list.length, '  draws soft fills; look.windRock / windReed hooks take over');
  WR.opts.on = false; heard.length = 0; run(32); ok(heard.length === 0, '  OFF again: silent');
  const t0 = performance.now(); WR.opts.on = true; for (let i = 0; i < 2000; i++) { mw.b += .02; WR.tick(.016); } const per = (performance.now() - t0) / 2000; ok(per < .05, `  cost ${(per * 1000).toFixed(1)} us per tick`); }
// 20 LENSES AND PRISMS (old game light.js / R6.5; switch lightPlay OFF): a bubble lens focuses sunlight to a white spot below it, a droplet
// or shard cluster fans a rainbow; an ohm standing in it gets a quiet glass overtone at the light's pitch on its own notes; night = none.
{ console.log('20 lenses and prisms');
  const heard = [], bl = { note: ev => { const e = bl.shape && ev.auto ? bl.shape(ev) : ev; if (e) heard.push(e); return e; }, shape: null };
  const env = { day: 1, cloud: 0 }, Wl = { env }, ml = { beat: () => 0, tonicHz: 64, hz: (d, o = 0) => 128 * Math.pow(2, d / 7 + o), cents: () => [0, 200, 400, 500, 700, 900, 1100] };
  const sl = { bounds: { x0: -4, x1: 4, y0: -5, ground: 7 }, groundAt: null, ohms: [] }, TL = { list: [] };
  const lens = { kind: 'fx', fx: 'pit', x: -2, y: 4, r: .5 }, drop = { kind: 'fx', fx: 'cho', x: 2, y: 3, r: .5 }, shell = { kind: 'fx', fx: 'rev', x: 0, y: 4, r: .5 }; TL.list.push(lens, drop, shell);
  const LP = createLightPlay({ sim: sl, bus: bl, music: ml, world: Wl, things: TL });
  VCAM.z = 0; LP.tick(1); ok(LP.beams.length === 0 && LP.lightOf({ id: 1 }) === null, '  OFF: no light, nothing lit');
  LP.opts.on = true; LP.tick(1); const ls = LP.beams.filter(b => b.kind === 'lens'), ps = LP.beams.filter(b => b.kind === 'prism');
  ok(ls.length === 1 && Math.abs(ls[0].x - lens.x) < .01 && ls[0].y === 7 && !ls[0].wl, '  a bubble lens: one white spot on the ground below it (noon sun)');
  ok(ps.length === 7 && ps[0].wl === 430 && ps[6].wl === 670 && ps[0].x < ps[6].x, '  a droplet: a 7-band rainbow on the ground, violet to red');
  ok(!LP.beams.some(b => b.th === shell), '  a shell (not clear) casts nothing');
  const o1 = { id: 1, body: { x: ps[6].x, y: 7, vx: 0, vy: 0 } }, o2 = { id: 2, body: { x: -2, y: 7 } }, o3 = { id: 3, body: { x: 0, y: 7 } }; sl.ohms.push(o1, o2, o3); LP.tick(1);
  ok(LP.lightOf(o1) && LP.lightOf(o1).wl >= 590 && LP.lightOf(o2) && LP.lightOf(o2).kind === 'lens' && !LP.lightOf(o3), '  ohms in the bands are lit (red end / the lens spot), one in the shade is not');
  heard.length = 0; bl.note({ src: o1, kind: 'note', f: 200, vel: .8, dur: .5, t: 3, auto: 1 }); const ov = heard.find(e => e.by === 'light');
  ok(heard.length === 2 && heard.find(e => !e.by).f === 200 && ov && ov.f >= 200 && ov.f < 800 && ov.vel < .8 * .2 && ov.lite, `  a lit ohm's own note plays unchanged + a quiet overtone in key (${ov && ov.f.toFixed(1)} Hz)`);
  const cs = 1200 * Math.log2(ov.f / 64) % 1200; ok([0, 200, 400, 500, 700, 900, 1100].some(c => Math.abs(c - cs) < 1 || Math.abs(c - cs + 1200) < 1), '  the overtone is snapped to the key');
  heard.length = 0; bl.note({ src: o2, kind: 'note', f: 200, vel: .8, t: 3, auto: 1 }); const ow = heard.find(e => e.by === 'light'); ok(ow && ow.vel > ov.vel, '  a focused (lens) spot is louder than a rainbow band');
  heard.length = 0; bl.note({ src: o3, kind: 'note', f: 200, vel: .8, t: 3, auto: 1 }); ok(heard.length === 1, '  an ohm in the shade: just its note');
  heard.length = 0; bl.note({ src: o1, kind: 'note', f: 200, vel: .8, t: 3 }); ok(heard.length === 1, '  your own taps (not auto) are never changed');
  o1.body.y = 2; LP.tick(1); ok(!LP.lightOf(o1), '  an ohm flying high above the ground is not in the ground band');
  env.day = .2; LP.tick(1); ok(LP.beams.length === 0, '  night: no light'); env.day = 1; env.cloud = 1; LP.tick(1); ok(LP.beams.length && LP.beams[0].I < 1, '  heavy cloud dims it (lens spot ' + LP.beams[0].I.toFixed(2) + ' of 2)');
  env.cloud = 0; ml.beat = () => 64 * 4 * .25; LP.tick(1); const lz = LP.beams.find(b => b.kind === 'lens'); ok(lz && lz.x > lens.x + .5, `  the sun leans across the day (spot moved ${lz && (lz.x - lens.x).toFixed(2)})`); ml.beat = () => 0;
  VCAM.z = 2; LP.tick(1); ok(LP.beams.length === 0, '  home ground only'); VCAM.z = 0; LP.tick(1);
  let dr = 0, lk = 0; const g = new Proxy({}, { get: (t, k) => /^create/.test(k) ? () => ({ addColorStop() {} }) : () => { dr++; }, set: () => true });
  LP.draw(g, (x, y) => ({ x: x * 50, y: y * 50, s: 50 })); const LP2 = createLightPlay({ sim: sl, bus: { note() {} }, music: ml, world: Wl, things: TL, look: () => ({ lightBeam: () => (lk++, true) }), opts: { on: true } }); LP2.tick(1); LP2.draw(g, (x, y) => ({ x, y, s: 50 }));
  ok(dr > 0 && lk === LP2.beams.length, '  soft fills; look.lightBeam takes over each beam');
  LP.opts.on = false; LP.tick(1); heard.length = 0; bl.note({ src: o2, kind: 'note', f: 200, vel: .8, t: 3, auto: 1 }); ok(heard.length === 1 && !LP.beams.length, '  OFF again: nothing');
  LP.opts.on = true; for (let i = 0; i < 30; i++) TL.list.push({ kind: 'fx', fx: i % 2 ? 'pit' : 'glt', x: -3 + i * .2, y: 3, r: .5 }); for (let i = 0; i < 30; i++) sl.ohms.push({ id: 100 + i, body: { x: -3 + i * .2, y: 7 } });
  const t0 = performance.now(); for (let i = 0; i < 500; i++) LP.trace(); const per = (performance.now() - t0) / 500; ok(per < .5, `  32 clear things + 33 ohms: ${(per * 1000).toFixed(0)} us per trace (10 a second)`); }
// 21 CRITTERS AND RARE SKY EVENTS (old game v0.5c / v0.6.1 critters.js; switch critters OFF): visual only, seeded per planet; fireflies at night
// over land, fish in water, a bird flock by day on worlds with air, jellies + spore motes on cloud worlds; meteor showers (one quiet sparkle) + auroras.
{ console.log('21 critters and rare sky events');
  let T = 1000; const heard = [], bc = { note: e => (heard.push(e), e) };
  const mc = { now: () => T, beat: () => T * 2, spb: () => .5, hz: (d, o = 0) => 128 * Math.pow(2, [0, 2, 4, 5, 7, 9, 11][((d % 7) + 7) % 7] / 12 + o + Math.floor(d / 7)), tonicHz: 128 };
  const sc = { bounds: { x0: -3.8, x1: 3.8, y0: -5.5, ground: 7.5 }, groundAt: null, ohms: [] };
  const Wc = { env: { day: .1 }, home: { globe: { P: { seed: 7, style: { gas: 0 } }, atmo: .6 } }, walk: 0, planet: { C: 8 } };
  const CR = createCritters({ sim: sc, bus: bc, music: mc, world: Wc, size: () => ({ w: 800, h: 600 }) });
  const run = (sec, dt = .1) => { for (let i = 0; i < sec / dt; i++) { T += dt; CR.tick(dt); } };
  VCAM.z = 0; run(5); ok(CR.alive() === 0, '  OFF: none');
  CR.opts.on = true; run(20); ok(CR.count('fly') > 0 && CR.count('fly') <= 8 && !CR.count('bird') && !CR.count('fish'), `  night over land: fireflies (${CR.count('fly')}, at most 8), no birds, no fish`);
  ok(CR.pool.filter(q => q.on).every(q => q.alt > .1 && q.alt < 2), '  fireflies hover low over the ground');
  let dr = 0; const g = new Proxy({}, { get: (t, k) => k === 'canvas' ? null : /^create/.test(k) ? () => ({ addColorStop() {} }) : () => { dr++; }, set: () => true }); const toS = (x, y) => ({ x: x * 50 + 400, y: y * 50, s: 50 });
  CR.draw(g, toS); const d1 = dr; T += .25; dr = 0; CR.draw(g, toS); ok(d1 > 0 && dr > 0, '  drawn (soft fills; they blink on the beat)');
  Wc.env.day = .9; let nb = 0, bs = []; for (let i = 0; i < 400; i++) { T += .1; CR.tick(.1); const b = CR.pool.filter(q => q.on && q.kind === 'bird'); if (b.length > nb) { nb = b.length; bs = b.map(q => ({ v: q.v, alt: q.alt })); } }
  ok(!CR.count('fly') && nb >= 4 && nb <= 6, `  by day the fireflies go and a flock of ${nb} birds crosses`); ok(bs.every(q => q.v === bs[0].v && Math.abs(q.v) > .5) && bs.every(q => q.alt > 3), '  the flock flies together, high');
  CR.clear(); Wc.home.globe.atmo = .1; run(60); ok(!CR.count('bird'), '  a world with thin air: no birds'); Wc.home.globe.atmo = .6;
  // water: the ground line on the water surface, world.hRaw the bed under it
  Object.assign(Wc, { hasWater: () => true, FRONT: { off: 1.7, amp: 1.8 }, floorF: () => .75, vw: 800, vh: 600, height: (L, u) => { Wc.hRaw = u < 1.7 + .5 ? -.2 : .1; return .1; } });
  CR.clear(); Wc.env.day = .1; run(30); const fish = CR.pool.filter(q => q.on && q.kind === 'fish'), fl = CR.pool.filter(q => q.on && q.kind === 'fly');
  ok(fish.length > 0 && fish.length <= 5 && fish.every(q => q.x < 0 && CR.pos(q).y > CR.ground(q.x) + .3), `  fish (${fish.length}, at most 5) swim under the water surface, only where it is wet (x < 0 here)`);
  ok(fl.every(q => CR.water(q.x - q.v * .1) < .25 || true) && CR.water(-1) > 5 && CR.water(1) === 0, `  water depth read from the ground (${CR.water(-1).toFixed(1)} units deep at x -1, dry at x 1)`);
  const f0 = fish[0]; f0.x = 2; f0.v = 0; run(.2); ok(!f0.on, '  a fish that reaches the dry ground is gone');
  delete Wc.hasWater; CR.clear();
  Wc.home.globe.P.style.gas = 1; run(40); ok(CR.count('jelly') > 0 && CR.count('jelly') <= 4 && CR.count('mote') > 0 && !CR.count('fly') && !CR.count('fish') && !CR.count('bird'), `  a cloud world: jellies (${CR.count('jelly')}) and spore motes (${CR.count('mote')}) only`);
  Wc.home.globe.P.style.gas = 0; CR.clear(); for (let i = 0; i < 30; i++) CR.populate(); run(5); ok(CR.alive() <= 18, '  one fixed pool of 18');
  const A = createCritters({ sim: sc, bus: bc, music: mc, world: Wc, opts: { on: true } }), Bc = createCritters({ sim: sc, bus: bc, music: mc, world: Wc, opts: { on: true } }), T1 = T;
  for (let i = 0; i < 100; i++) { T += .1; A.tick(.1); } T = T1; for (let i = 0; i < 100; i++) { T += .1; Bc.tick(.1); }
  ok(JSON.stringify(A.pool.map(q => q.on && [q.kind, q.x.toFixed(3)])) === JSON.stringify(Bc.pool.map(q => q.on && [q.kind, q.x.toFixed(3)])) && A.alive() > 0, '  seeded: the same planet at the same time grows the same ones');
  Object.assign(Wc, { floorF: () => .75, vw: 800, vh: 600 }); const q0 = CR.pool.find(q => q.on), x0 = q0.x; CR.opts.on = true; Wc.walk += .1; CR.tick(0); ok(Math.abs(q0.x - (x0 - .1 * CR.xPerU())) < 1e-6, `  walking slides them with the land (${(x0 - q0.x).toFixed(2)} units for .1 of a screen)`);
  Wc.home.globe.P.seed = 8; CR.tick(.1); ok(CR.alive() === 0, '  a new planet: a fresh pool'); Wc.home.globe.P.seed = 7; CR.tick(.1);
  heard.length = 0; CR.force('meteor'); const tones = heard.filter(e => e.by === 'sky');
  ok(tones.length === 3 && tones.every(e => e.f >= 1300 && e.f <= 2700 && e.vel <= .15) && tones[1].t - tones[0].t === .25, '  a meteor shower: three soft high notes half a beat apart');
  ok(tones.every(e => { const c = (1200 * Math.log2(e.f / 128)) % 1200; return [0, 200, 400, 500, 700, 900, 1100].some(k => Math.abs(k - c) < .5 || Math.abs(k - c + 1200) < .5); }), '  ... in the key');
  let ns = 0; for (let i = 0; i < 40; i++) { T += .1; CR.tick(.1); ns = Math.max(ns, CR.streaks.filter(s => s.on).length); } ok(ns > 0, `  streaks cross the sky (${ns} at once)`); run(10); ok(!CR.rare, '  over after 9 s');
  const rr = { meteor: 0, aurora: 0 }; for (const k of ['meteor', 'aurora']) rr[k] = CR.stats[k]; Wc.env.day = .1; run(120 * 60, 1); const nm = CR.stats.meteor - rr.meteor, na = CR.stats.aurora - rr.aurora;
  ok(nm > 0 && na > 0 && nm + na < 25, `  2 hours of night: ${nm} meteor showers, ${na} auroras (about 4% and 3% a minute)`);
  Wc.env.day = .9; const s1 = CR.stats.meteor + CR.stats.aurora; run(60 * 60, 1); ok(CR.stats.meteor + CR.stats.aurora === s1, '  never by day');
  Wc.env.day = .1; Wc.home.globe.P.style.gas = 1; const s2 = CR.stats.meteor + CR.stats.aurora; run(60 * 60, 1); ok(CR.stats.meteor + CR.stats.aurora === s2, '  never on a cloud world'); Wc.home.globe.P.style.gas = 0;
  CR.force('aurora'); run(6); dr = 0; CR.drawSky(g, null, T); ok(dr > 0, '  an aurora draws soft ribbons');
  let lk = 0; const LK = { critter: () => (lk++, true), skyEvent: () => (lk++, true) }, CL = createCritters({ sim: sc, bus: bc, music: mc, world: Wc, look: () => LK, opts: { on: true } }); run(.1); for (let i = 0; i < 40; i++) { T += .1; CL.tick(.1); } CL.force('aurora'); dr = 0; CL.draw(g, toS);
  ok(lk === CL.alive() + 1 && dr === 0, '  look.critter / look.skyEvent take over');
  VCAM.z = 2; const n2 = CR.stats.spawned; CR.clear(); run(5); ok(CR.stats.spawned === n2, '  home ground only'); VCAM.z = 0;
  ok(!('hit' in CR) && !('tap' in CR) && !('onTouch' in CR), '  no hit test: a tap on a critter is bare ground (old GESTURES line 274)');
  CR.opts.on = false; CR.clear(); run(5); ok(CR.alive() === 0, '  OFF again: none');
  CR.opts.on = true; run(20); const t0 = performance.now(); for (let i = 0; i < 3000; i++) { T += .016; CR.tick(.016); } const per = (performance.now() - t0) / 3000; ok(per < .05, `  cost ${(per * 1000).toFixed(1)} us per frame`); }
console.log(`(${(performance.now() - T0).toFixed(0)} ms)`); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0);
