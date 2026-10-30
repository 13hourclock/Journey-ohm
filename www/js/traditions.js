// TRADITIONS, wave 1 (PLAN_TRADITIONS.md; Wilbow 12:35 PM + 4:04 PM MDT Oct 25 "A yes, all eight as suggested"). ONE tradition per planet (Q150, blending kept but
// OFF), seeded from the planet seed and leaned by the land (Q16 A+B). A tradition sets: tuning (7-slot TUNINGS entries, true cents kept), tempo (a simple
// ratio over the locked om, Q188 A), feel (tightness / swing / jam grid), its rhythm cycle (drums.js CYCLES + the cycle engine), the instrument lean over the
// equal base (instruments.js setPlace, IOPTS.placeLean), a tonic drone where it has no chords, and the song shape (songs.js world.tradition hook).
// Cultures add variety, never limit: nothing here bans a note, an instrument or a rhythm. All values PENDING Music Theory's check.
// Visuals hooks (Wilbow 4:07 PM "the tradition sets the aura palettes and patterns"; Visuals designs, NOTHING drawn here): tradition.auraPalette (roles),
// tradition.auraPattern { kind, fold, density, speed, beatLock, swing, rings: [{ speed }], pulse: { period, phase } } with NEUTRAL placeholders;
// ohm.tradId (string) / ohm.lively, plus fallbacks for rare.js's ohm.tradition (songs-shape object with .id) / ohm.rarity (0|1) / ohm.tier; the look feed's ctx.tradition (lookfeed.js).
import { TUNINGS } from './music.js';
import { CYCLES, cycleInfo, setTradCycle } from './drums.js';
import { PLACE, setPlace } from './instruments.js';
import { WAVE2, WAVE2_IDS, GROUP_MAP2 } from './traditions_wave2.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hsh = (a, b) => { let h = ((a >>> 0) * 2654435761 ^ (b >>> 0) * 40503 ^ 0x7f4a7c15) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
const rnd = s => { let x = s >>> 0 || 1; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296; };
const ET = c => c.map(x => x * 100), JI = [0, 112, 204, 316, 386, 498, 590, 702, 814, 884, 996, 1088];
const jiOf = semis => semis.map(s => JI[s]);
// 5 -> 7 slots: each diatonic degree takes the scale's nearest note (ties lower); the true notes stay in scale.notes
const DIA = [0, 200, 400, 500, 700, 900, 1100];
export function slots7(notes) { if (notes.length === 7) return notes.slice(); let last = 0; return DIA.map(t => { let best = notes[0], bd = 1e9; for (const c of notes) { if (c < last) continue; const d = Math.abs(c - t); if (d < bd) { bd = d; best = c; } } last = best; return best; }); }
// neutral aura placeholders (Visuals fills these in once Wilbow approves their design)
const NEUTRAL_PAL = () => [{ role: 'glow', rgb: [.6, .6, .6] }, { role: 'line', rgb: [.85, .85, .85] }, { role: 'fill', rgb: [.25, .25, .25] }, { role: 'accent', rgb: [.5, .5, .5] }, { role: 'fill', rgb: [.12, .12, .12] }];
// ---- the eight recipes (PLAN_TRADITIONS.md 2.1-2.8) ----
// drone: scale SLOTS (0-based degrees) of the drone chord = tonic + fifth slot; a scale's extra.drone overrides (maqam ghammaz, iwato [0, 3]).
// scales: [name, cents (true notes), extra]; tempos: [name, target BPM, { cycle, swing, tight, div } overrides]; harm 'move' | 'drone'
export const TRADS = [
  { id: 'western', name: 'Western folk / hymn', pal: 'western', aura: 'tracery', harm: 'move', glide: 0, dens: 1,
    scales: [['ionian', ET([0, 2, 4, 5, 7, 9, 11])], ['aeolian', ET([0, 2, 3, 5, 7, 8, 10])], ['dorian', ET([0, 2, 3, 5, 7, 9, 10])]],
    tempos: [['folk', 100, { cycle: 'backbeat' }], ['waltz', 100, { cycle: 'waltz', len: 6 }], ['hymn', 80, { cycle: 'hymn' }]], swing: 0, tight: .7, div: 4,
    song: { form: ['A', 'A', 'B', 'A'], len: 4, bStart: 3, cad: [4, 0], cells: [[1, 1, 1, 1], [.5, .5, 1, 2], [1, 1, 2]], hookBars: 2, moves: 'functional' } },
  { id: 'hindustani', name: 'Hindustani raga', pal: 'hindustani', aura: 'lotus', harm: 'drone', drone: [0, 4], glide: .7, dens: .8,
    scales: [['Yaman', [0, 204, 386, 590, 702, 884, 1088], { tod: .8, focus: [0, 2, 6] }], ['Bhairav', [0, 90, 386, 498, 702, 792, 1088], { tod: .25, focus: [0, 5, 1] }], ['Todi', [0, 90, 294, 590, 702, 792, 1088], { tod: .35, focus: [0, 5, 2] }],
      ['Kafi', [0, 204, 316, 498, 702, 884, 996], { tod: .85, focus: [0, 4] }], ['Bhairavi', [0, 112, 316, 498, 702, 814, 996], { tod: .3, focus: [0, 3] }], ['Khamaj', [0, 204, 386, 498, 702, 884, 996], { tod: .9, focus: [0, 2, 6] }],
      ['Bilawal', [0, 204, 386, 498, 702, 884, 1088], { tod: .4, focus: [0, 5, 2] }], ['Purvi', [0, 112, 386, 590, 702, 814, 1088], { tod: .75, focus: [0, 2, 6] }]],
    tempos: [['vilambit', 50, { cycle: 'teentaal' }], ['madhya', 110, { cycle: 'teentaal' }], ['madhya rupak', 110, { cycle: 'rupak', len: 7 }], ['jhaptal', 110, { cycle: 'jhaptal', len: 5 }], ['drut', 180, { cycle: 'teentaal' }]], swing: 0, tight: .5, div: 4,
    song: { form: ['A', 'B'], len: 4, bStart: 0, cad: [0], cells: [[2, 2], [1.5, .5, 2], [1, 1, 2]], hookBars: 2, moves: 'drone' } },
  { id: 'maqam', name: 'Arabic maqam', pal: 'maqam', aura: 'lattice', harm: 'drone', drone: [0, 4], glide: .4, dens: .9,
    scales: [['Rast', [0, 204, 355, 498, 702, 906, 1055], { focus: [0, 4], drone: [0, 4] }], ['Bayati', [0, 145, 294, 498, 702, 792, 996], { focus: [0, 3], drone: [0, 3] }], ['Hijaz', [0, 112, 386, 498, 702, 792, 996], { focus: [0, 3], drone: [0, 3] }],
      ['Saba', [0, 140, 294, 390, 702, 792, 996], { focus: [0, 2], drone: [0, 2] }], ['Nahawand', [0, 200, 300, 500, 700, 800, 1100], { focus: [0, 4], drone: [0, 4] }]],
    tempos: [['maqsum', 100, { cycle: 'maqsum' }], ['baladi', 96, { cycle: 'baladi' }], ['saidi', 110, { cycle: 'saidi' }]], swing: .1, tight: .6, div: 4,
    song: { form: ['A', 'B', 'A'], len: 4, bStart: 0, cad: [0], cells: [[1, .5, .5, 2], [.5, .5, .5, .5, 2], [1.5, .5, 2]], hookBars: 2, moves: 'drone' } },
  { id: 'gamelan', name: 'Gamelan', pal: 'gamelan', aura: 'rings', harm: 'drone', drone: [0, 4], glide: 0, dens: 1,
    scales: [['slendro', [0, 231, 474, 717, 955]], ['pelog bem', [0, 120, 270, 540, 670, 785, 950], { w: [1, 1, 1, .3, 1, 1, .3] }], ['pelog barang', [0, 120, 270, 540, 670, 785, 950], { w: [.3, 1, 1, .3, 1, 1, 1] }]],
    tempos: [['lancaran', 90, { cycle: 'lancaran' }], ['ketawang', 66, { cycle: 'ketawang' }], ['ladrang', 60, { cycle: 'ladrang', len: 8 }]], swing: 0, tight: .8, div: 4,
    song: { form: ['A', 'A', 'A', 'A'], len: 4, bStart: 0, cad: [0], cells: [[1, 1, 1, 1], [1, 1, 1, 1], [.5, .5, 1, 1, 1]], hookBars: 1, moves: 'drone' } },
  { id: 'japan', name: 'Japanese traditional', pal: 'japan', aura: 'waves', harm: 'drone', drone: [0, 4], glide: .4, dens: .6,
    scales: [['in', [0, 100, 500, 700, 800]], ['yo', [0, 200, 500, 700, 900]], ['hirajoshi', [0, 200, 300, 700, 800]], ['ryukyu', [0, 400, 500, 700, 1100]], ['iwato', [0, 100, 500, 600, 1000], { drone: [0, 3] }]],
    tempos: [['jo-ha-kyu', 70, { cycle: 'ma' }], ['matsuri', 90, { cycle: 'matsuri', tight: .7 }]], swing: 0, tight: .25, div: 4,
    song: { form: ['A', 'B', 'C'], len: 4, bStart: 0, cad: [0], cells: [[2, 2], [3, 1], [1, 1, 2]], hookBars: 2, moves: 'drone' } },
  { id: 'wafrica', name: 'West African drumming', pal: 'wafrica', aura: 'weave', harm: 'move', glide: 0, dens: 1.2,
    scales: [['major pentatonic', ET([0, 2, 4, 7, 9])], ['minor pentatonic', ET([0, 3, 5, 7, 10])]],
    tempos: [['12/8 bell', 120, { cycle: 'bell' }]], swing: 0, tight: .85, div: 6,
    song: { form: ['A', 'A', 'B', 'A'], len: 2, bStart: 3, cad: [4, 0], cells: [[.5, .5, .5, .5, 2], [1, .5, .5, 1, 1], [.5, .5, 1, 2]], hookBars: 1, moves: 'functional' } },
  { id: 'celtic', name: 'Celtic', pal: 'celtic', aura: 'knot', harm: 'move', glide: 0, dens: 1.2,
    scales: [['ionian', jiOf([0, 2, 4, 5, 7, 9, 11])], ['dorian', jiOf([0, 2, 3, 5, 7, 9, 10])], ['mixolydian', jiOf([0, 2, 4, 5, 7, 9, 10])], ['aeolian', jiOf([0, 2, 3, 5, 7, 8, 10])]],
    tempos: [['jig', 116, { cycle: 'jig', div: 6 }], ['reel', 108, { cycle: 'reel', swing: .3, div: 4 }], ['slip jig', 116, { cycle: 'slipjig', div: 3, len: 6 }], ['hornpipe', 76, { cycle: 'hornpipe', swing: 1, div: 4 }]], swing: 0, tight: .7, div: 4,
    song: { form: ['A', 'A', 'B', 'B'], len: 4, bStart: 3, cad: [4, 0], cells: [[.5, .5, .5, .5, .5, .5, 1], [.5, .5, .5, .5, 1, 1], [1, .5, .5, 2]], hookBars: 2, moves: 'functional' } },
  { id: 'techno', name: 'Techno / house', pal: 'techno', aura: 'grid', harm: 'move', glide: 0, dens: 1.1,
    scales: [['aeolian', ET([0, 2, 3, 5, 7, 8, 10])], ['phrygian', ET([0, 1, 3, 5, 7, 8, 10])], ['dorian', ET([0, 2, 3, 5, 7, 9, 10])]],
    tempos: [['techno', 130, { cycle: 'four', tight: 1 }], ['house', 124, { cycle: 'four', swing: .35, tight: .95 }]], swing: 0, tight: 1, div: 4,
    song: { form: ['A', 'A', 'B', 'A'], len: 8, bStart: 3, cad: [3, 0], cells: [[.5, .5, .5, .5, .5, .5, .5, .5], [1, .5, .5, 1, 1], [.75, .25, 1, 2]], hookBars: 1, moves: 'loop' } },
];
TRADS.push(...WAVE2);   // wave 2 (traditions_wave2.js): 21 more, switch opts.wave2
export const TRAD_IDS = TRADS.map(t => t.id);
const W2 = new Set(WAVE2_IDS);
// Music Theory #8 / #9: per-degree WEIGHTS (0-based degrees; weights, never limits): pathet w (gamelan) x focus degrees (raga Sa / vadi /
// samvadi, maqam tonic / ghammaz; each distinct degree x(1+FOCUS_K), a repeat counts once). jam.js reads music.trad.degW (null = all 1). FOCUS_K .5 is my default.
export const FOCUS_K = .5;
export const degWOf = x => { if (!x || (!x.w && !x.focus)) return null; const w = x.w ? x.w.slice() : [1, 1, 1, 1, 1, 1, 1]; if (x.focus) for (const d of new Set(x.focus)) w[d] *= 1 + FOCUS_K; return w; };
export const byTradId = id => TRADS.find(t => t.id === id) || null;
// tuning entries: 'trad.<id>.<scale>' = 7-slot ratios + the true notes (cents); registered once (open-ended TUNINGS table)
for (const T of TRADS) for (const [nm, cents] of T.scales) { const k = 'trad.' + T.id + '.' + nm; if (TUNINGS[k]) continue;
  TUNINGS[k] = { name: T.name + ': ' + nm, ratios: slots7(cents).map(c => Math.pow(2, c / 1200)), notes: cents.slice(), trad: T.id, micro: cents.some(c => Math.abs(c - Math.round(c / 100) * 100) > 15) }; }
// tempo: the simple ratio over the locked om nearest the target (the pulse stays tied to the om)
export const TEMPO_K = [1 / 2, 2 / 3, 3 / 4, 1, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3];
export function tempoKFor(om, target) { const base = om / 64 * 60; let best = 1; for (const k of TEMPO_K) if (Math.abs(Math.log2(base * k / target)) < Math.abs(Math.log2(base * best / target))) best = k; return best; }
// Q16 B: the land's scales.js tradition groups (terrain.js T.trad order) -> these eight. LEAN_K = how strongly (PENDING MT / Wilbow)
export const GROUP_MAP = [{ western: .6, celtic: .4 }, { hindustani: 1 }, { maqam: 1 }, { japan: 1 }, { gamelan: 1 }, { wafrica: 1 }, { western: .5, wafrica: .5 }, { maqam: .5, western: .3, celtic: .2 }]
  .map((g, j) => ({ ...g, ...(GROUP_MAP2[j] || {}) }));   // wave 2 leans only count when wave 2 is on (planetTradition skips disabled ids)
export const TRAD_OPTS = { on: true, tuning: true, tempo: true, feel: true, cycle: true, accent: true, accentK: .3, lean: true, drone: true, tonicPull: 1.5, songs: true, blend: false, blendK: .35, leanK: 2, wave2: true, chroma: true,
  enabled: Object.fromEntries(TRAD_IDS.map(id => [id, true])) };
const MOVES = kind => { const m = Array.from({ length: 7 }, () => new Array(7).fill(.05));
  for (let i = 0; i < 7; i++) { if (kind === 'drone') { m[i][0] = 3; m[i][4] += .3; } else if (kind === 'loop') { m[i][0] += 1; m[i][3] += 1; m[i][5] += .4; } else { m[i][(i + 3) % 7] += .9; m[i][(i + 4) % 7] += 1; m[i][0] += .5; m[i][i] *= .3; } }
  return m; };
// chord shapes (wave 2): voicings per root slot, or 7th chords; null = the plain triad (wave 1, unchanged)
export const voiceOf = D => { if (!D.voicings && !D.sev) return null; const V = D.voicings || {};
  return r => { const b = ((r % 7) + 7) % 7, o = r - b, v = V[b]; if (v) return v.map(x => (x < b ? x + 7 : x) + o); return D.sev ? [r, r + 2, r + 4, r + 6] : [r, r + 2, r + 4]; }; };
// the planet's tradition: pure function of the planet seed + the land's group shares (+ which traditions are enabled, or a forced / planted id)
export function planetTradition(seed, landTrad, opt = TRAD_OPTS, force = null) { const r = rnd(hsh(seed, 0x7ad1));
  const ids = TRAD_IDS.filter(id => opt.enabled[id] !== false && (opt.wave2 !== false || !W2.has(id))); if (!ids.length) return null;
  const w = {}; for (const id of ids) w[id] = 1; if (landTrad) for (let j = 0; j < GROUP_MAP.length; j++) { const sh = +landTrad[j] || 0; for (const id in GROUP_MAP[j]) if (w[id] != null) w[id] += (opt.leanK || 0) * sh * GROUP_MAP[j][id]; }
  let id = force && w[force] != null ? force : null; const u0 = r(); if (!id) { let tot = 0; for (const k of ids) tot += w[k]; let u = u0 * tot; id = ids[ids.length - 1]; for (const k of ids) { u -= w[k]; if (u <= 0) { id = k; break; } } }
  const D = byTradId(id), sc = D.scales[Math.floor(r() * D.scales.length)], tp = D.tempos[Math.floor(r() * D.tempos.length)], ov = tp[2] || {};
  let second = null; { let bw = -1; for (const k of ids) if (k !== id && w[k] > bw) { bw = w[k]; second = k; } }   // blend partner (used only when opts.blend)
  const swing = ov.swing != null ? ov.swing : D.swing, tight = ov.tight != null ? ov.tight : D.tight, div = ov.div || D.div, cyc = CYCLES[ov.cycle] ? ov.cycle : null, cy = cyc ? CYCLES[cyc] : null;
  const pal = NEUTRAL_PAL(), roles = {}; for (const c of pal) if (!roles[c.role]) roles[c.role] = c.rgb;
  const T = { id, name: D.name, seed: seed >>> 0, scale: sc[0], cents: sc[1].slice(), tuning: 'trad.' + id + '.' + sc[0], micro: TUNINGS['trad.' + id + '.' + sc[0]].micro, tempoName: tp[0], bpm: tp[1],
    swing, tight, div, cycle: cyc, harm: D.harm, glide: D.glide, dens: D.dens, pal: D.pal, second, forced: !!(force && id === force),
    timeOfDay: sc[2] && sc[2].tod != null ? sc[2].tod : null, drone: (sc[2] && sc[2].drone || D.drone || [0, 4]).slice(), focus: sc[2] && sc[2].focus ? sc[2].focus.slice() : null, degW: degWOf(sc[2]),
    auraPalette: pal, auraRoles: roles, pull: D.pull, voice: voiceOf(D), alts: D.alts || null, wave2: W2.has(id),
    auraPattern: { kind: D.aura, fold: 6, density: .5, speed: clamp(tp[1] / 180, .1, 1), beatLock: tight, swing, rings: [{ speed: .5 }, { speed: .5 }, { speed: .5 }], pulse: { period: cy ? cy.beats : 4, phase: 0 } } };
  const S = D.song; T.songShape = { seed: seed >>> 0, id, name: D.name, trad: id, form: S.form.slice(), len: ov.len || S.len, moves: MOVES(S.moves), bStart: S.bStart, cad: S.cad.slice(), cells: S.cells.map(c => c.slice()), hookBars: S.hookBars, charts: S.charts ? S.charts.map(c => ({ ...c, sec: Object.fromEntries(Object.entries(c.sec).map(([k, v]) => [k, v.slice()])) })) : null };
  return T; }
// ---- the engine: applies the planet's tradition, undoes it cleanly when off ----
export function createTraditions({ sim, bus, music, harmony, world, opts = {} }) {
  const O = Object.assign(TRAD_OPTS, opts), R = { opts: O, cur: null, plantedBy: new Map(), last: { offScale: false, micro: false }, applied: false };
  const prev = { tuning: null }; let key = '', bar = -1;
  const landOf = () => { const W = world || sim.world, T = W && W.home && W.terrOf ? W.terrOf(W.home) : null; return T && T.trad ? T.trad : null; };
  const pseed = () => { const W = world || sim.world; return (W && (W.pseed || W.seed)) || 1; };
  // drone planets never HOLD the harmony (Wilbow 2:21 AM: a jam needs to be able to switch keys; Music Theory #1): a tonic pull of
  // O.tonicPull votes toward chord root 0 at each harmony step (music.js H.step, H.tonicPull), normal pivot key moves stay on
  const setPull = v => { if (harmony) harmony.tonicPull = v; };
  const undo = () => { if (!R.applied) return; R.applied = false; const T = R.cur;
    setPull(0); if (prev.tuning && music.tuning && music.tuning.startsWith('trad.')) music.setTuning(prev.tuning); prev.tuning = null;
    if (music.tempoK !== 1) music.setTempoK(1); music.tradFeel = null; music.swing = 0; music.tradDiv = null; music.trad = null;
    if (T) setTradCycle(T.pal, null); if (T && T.second) setTradCycle(T.second, null);
    setPlace({ trad: {}, ground: PLACE.ground }); const W = world || sim.world; if (W && W.tradition === R.songHook) delete W.tradition; };
  R.songHook = ps => R.cur && R.cur.songShape && (R.cur.seed === (ps >>> 0) || !ps) ? R.cur.songShape : (R.cur && R.cur.songShape);
  const apply = T => { undo(); R.cur = T; if (!T || !O.on) return; R.applied = true;
    if (O.tuning) { if (!prev.tuning) prev.tuning = music.tuning && music.tuning.startsWith('trad.') ? 'om-JI-7' : music.tuning; music.setTuning(T.tuning); }
    if (O.tempo && music.lock) music.setTempoK(tempoKFor(music.om, T.bpm));
    if (O.feel) { music.tradFeel = T.tight; music.swing = T.swing; music.tradDiv = T.div; }
    music.trad = T;
    if (O.cycle && T.cycle) { setTradCycle(T.pal, T.cycle); }
    const tr = {}; if (O.lean || O.cycle) tr[T.pal] = 1; if (O.blend && T.second) { tr[T.second] = O.blendK; tr[T.pal] = 1 - O.blendK; const D2 = byTradId(T.second); if (O.cycle && D2) setTradCycle(D2.pal, (D2.tempos[0][2] || {}).cycle); }
    setPlace({ trad: tr, ground: PLACE.ground });
    if (O.drone && T.harm === 'drone') { setPull(T.pull != null ? T.pull : O.tonicPull); if (music.chord) music.chord = { root: 0, tones: (T.drone || [0, 4]).slice(), kind: 'drone' }; }   // the starting chord only; jams move on from it
    const W = world || sim.world; if (W && O.songs && (!W.tradition || W.tradition === R.songHook)) W.tradition = R.songHook;
    for (const o of sim.ohms || []) stamp(o);
    if (bus) bus.post({ type: 'tradition', trad: T }); };
  // which tradition is here: forced / planted (Q149 C) beats the seed; key = everything the choice depends on
  R.force = null; R.plant = id => { R.force = id && byTradId(id) ? id : null; R.plantedBy.set(pseed(), R.force); key = ''; return R.force; };
  R.refresh = () => { key = ''; R.tick(); };
  let lastPs = null; R.tick = () => { const ps0 = pseed(); if (ps0 === lastPs && key) { if (!R.applied) return; const b = Math.floor(music.beat() / 4); if (b === bar) return; bar = b;
      if (O.tempo && music.lock) { const k2 = tempoKFor(music.om, R.cur.bpm); if (k2 !== music.tempoK) music.setTempoK(k2); } return; } lastPs = ps0;
    const ps = ps0, f = R.plantedBy.has(ps) ? R.plantedBy.get(ps) : null, k = ps + '|' + O.on + '|' + f + '|' + O.leanK + '|' + TRAD_IDS.map(id => O.enabled[id] ? 1 : 0).join('') + [O.tuning, O.tempo, O.feel, O.cycle, O.lean, O.drone, O.songs, O.blend, O.wave2].map(Number).join('');
    if (k !== key) { key = k; if (!O.on) { undo(); R.cur = null; return; } apply(planetTradition(ps, landOf(), O, f)); return; }
    if (!R.applied) return; const b = Math.floor(music.beat() / 4); if (b === bar) return; bar = b;   // once a bar: a re-lock / om change re-fits the tempo ratio
    if (O.tempo && music.lock) { const k2 = tempoKFor(music.om, R.cur.bpm); if (k2 !== music.tempoK) music.setTempoK(k2); } };
  // Q149 B + Visuals: every ohm carries a tradition (its birth planet's), rare (wild) ohms carry the planet's tradition; rarity / tier / lively
  // master's rare.js (Rare ohms) owns o.rarity (0|1) / o.tier (xp tier) / o.tradition (the planet's songs-shape object) when present:
  // these are fallbacks only, same types, and any write turns them into plain values (rare.js assigns them).
  const own = (o, k, get) => { if (!Object.getOwnPropertyDescriptor(o, k)) Object.defineProperty(o, k, { configurable: true, enumerable: false, get, set: v => { Object.defineProperty(o, k, { value: v, writable: true, configurable: true, enumerable: true }); } }); };
  const tshape = new Map(), shapeOf = id => { if (!id) return null; if (R.cur && R.cur.id === id) return R.cur.songShape; let t = tshape.get(id); if (!t) { const d = byTradId(id); t = { id, trad: id, name: d ? d.name : id }; tshape.set(id, t); } return t; };
  const stamp = o => { if (!o || o.scale !== 'ohm') return; if (o._trad == null && R.cur) { o._trad = R.cur.id; if (o._tradSc == null) o._tradSc = R.cur.scale; }
    if (!Object.getOwnPropertyDescriptor(o, 'tradId')) Object.defineProperty(o, 'tradId', { configurable: true, enumerable: false, get: () => o._trad || (R.cur && R.cur.id) || null, set: v => { o._trad = v; } });
    own(o, 'tradition', () => shapeOf(o.tradId)); own(o, 'rarity', () => o.wild ? 1 : 0); own(o, 'tier', () => 0);
    if (!Object.getOwnPropertyDescriptor(o, 'lively')) Object.defineProperty(o, 'lively', { configurable: true, enumerable: false, get: () => o.g && o.g.calm != null ? clamp(1 - (o.g.calm - .35) / .5, 0, 1) : .5 }); };
  R.stamp = stamp;
  if (bus) { bus.on('spawn', ev => stamp(ev.src)); bus.on('respawn', ev => stamp(ev.src)); bus.on('world.life', ev => { if (ev.src && R.cur) { stamp(ev.src); ev.src._trad = R.cur.id; } });
    bus.on('note', ev => { if (!R.applied || !ev.src || ev.src.scale !== 'ohm' || ev.deg == null) return; const c = music.scale && music.scale.ratios; if (!c) return; const n = c.length, d = ((ev.deg % n) + n) % n, ce = 1200 * Math.log2(c[d]);
      R.last.offScale = Math.abs(ce - Math.round(ce / 100) * 100) > 15; }); }
  // the cycle accent: one multiply on an ohm note's loudness (never drops a note)
  const CI = {}; R.cycleNow = (b = music.beat()) => R.applied && R.cur && R.cur.cycle ? cycleInfo(R.cur.cycle, b, CI) : null;
  // F3 CHROMATIC CHORDS (switch opts.chroma): while a chord with alterations sounds (the song's own bar chord when the note carries one, else the
  // chord now), every pitched note on an altered step is raised / lowered (ev.alt cents; sound.js applies it). Off = diatonic stand-ins as before.
  if (bus && bus.note) { const n1 = bus.note; bus.note = ev => { const T = R.cur; if (R.applied && O.chroma && T && T.alts && ev && ev.deg != null && ev.kind !== 'release' && !ev.inputT) {
      const r = ev.root != null ? ev.root : music.chord ? music.chord.root : null, a = r != null ? T.alts[((r % 7) + 7) % 7] : null, c = a ? a[((ev.deg % 7) + 7) % 7] : 0; if (c) { ev.alt = (ev.alt || 0) + c; R.altered = (R.altered | 0) + 1; } }
    return n1(ev); }; }
  if (bus && bus.note) { const n0 = bus.note; bus.note = ev => { if (R.applied && O.accent && R.cur && R.cur.cycle && ev && ev.src && ev.src.scale === 'ohm' && ev.vel != null && (ev.kind === 'note' || ev.kind === 'strike')) {
      const ci = cycleInfo(R.cur.cycle, music.beat(ev.t != null ? ev.t : music.when(music.now())), CI); if (ci) ev.vel = Math.min(1, ev.vel * (1 - O.accentK / 2 + O.accentK * ci.accent)); } return n0(ev); }; }
  // read-only feed for the look (lookfeed.js ctx.tradition): one reused object
  const FD = { id: null, name: null, auraPalette: null, auraRoles: null, auraPattern: null, timeOfDay: null, glide: 0, micro: false, offScale: false, cycle: null };
  R.feed = () => { const T = R.applied ? R.cur : null; if (!T) return null; FD.id = T.id; FD.name = T.name; FD.auraPalette = T.auraPalette; FD.auraRoles = T.auraRoles; FD.auraPattern = T.auraPattern; FD.timeOfDay = T.timeOfDay;
    FD.glide = T.glide; FD.micro = T.micro; FD.offScale = R.last.offScale; FD.cycle = R.cycleNow(); return FD; };
  // ---- dev panel (world section): master + per-part toggles, the eight, plant / force, readout ----
  R.attachPanel = root => { const host = root && root.querySelector && root.querySelector('#dv-w'); if (!host || typeof document === 'undefined') return; const w = document.createElement('div');
    const ck = (label, get, set) => { const l = document.createElement('label'); l.innerHTML = `<span>${label}</span><input type="checkbox" ${get() ? 'checked' : ''}><i></i>`; l.querySelector('input').onchange = e => { set(e.target.checked); R.refresh(); }; w.appendChild(l); };
    const h = document.createElement('i'); h.textContent = 'traditions wave 1 (one per planet; values pending Music Theory):'; w.appendChild(h);
    ck('traditions: the planet\'s tradition plays (off = no tradition)', () => O.on, v => { O.on = v; });
    ck('  its tuning (ragas, maqamat, slendro / pelog in real cents)', () => O.tuning, v => { O.tuning = v; });
    ck('  its tempo (simple ratio over the locked om)', () => O.tempo, v => { O.tempo = v; });
    ck('  its feel (tightness, swing, 12/8 grid)', () => O.feel, v => { O.feel = v; });
    ck('  its rhythm cycle (drum kits)', () => O.cycle, v => { O.cycle = v; });
    ck('  cycle accents on ohm notes', () => O.accent, v => { O.accent = v; });
    ck('  instrument lean over the equal base', () => O.lean, v => { O.lean = v; });
    ck('  drone traditions hold the tonic (raga, maqam, gamelan, Japanese)', () => O.drone, v => { O.drone = v; });
    ck('  songs take its shape', () => O.songs, v => { O.songs = v; });
    ck('  blend a neighbouring tradition (Q150: later; off)', () => O.blend, v => { O.blend = v; });
    ck('  chromatic chords: blues V7, flamenco III, samba VI7 raise / lower scale steps while they sound (off = diatonic stand-ins)', () => O.chroma !== false, v => { O.chroma = v; });
    ck('  wave 2: 21 more traditions (jazz, blues, funk, carnatic, makam, dastgah, Chinese, son, rumba, samba, bossa, flamenco, aksak, Andean, overtone, reggae, dnb, minimal, classical, modal, rock/pop; off = the first eight only)', () => O.wave2 !== false, v => { O.wave2 = v; });
    for (const T of TRADS) ck('  ' + T.name, () => O.enabled[T.id] !== false, v => { O.enabled[T.id] = v; });
    const sl = document.createElement('label'); sl.innerHTML = `<span>plant a tradition on this planet (dev, Q149 C)</span><select><option value="">from the seed + land</option>${TRADS.map(T => `<option value="${T.id}">${T.name}</option>`).join('')}</select>`;
    sl.querySelector('select').onchange = e => { R.plant(e.target.value || null); R.refresh(); }; w.appendChild(sl);
    const rd = document.createElement('pre'); w.appendChild(rd); host.appendChild(w);
    setInterval(() => { const T = R.applied ? R.cur : null, ci = R.cycleNow(); rd.textContent = T ? `tradition: ${T.name} (${T.scale}, ${T.tempoName} ~${T.bpm} -> ${music.bpm.toFixed(0)} BPM x${music.tempoK.toFixed(2)}, ${T.cycle || '-'} ${ci ? (ci.step + 1) + '/' + ci.steps + (ci.land ? ' LAND' : '') : ''})` : 'tradition: none'; }, 500); };
  R.tick();
  return R; }
