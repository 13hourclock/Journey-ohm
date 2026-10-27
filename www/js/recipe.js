// Sound RECIPES: ONE object holds a whole sound - modal body + synth engines and their mix, the insert-FX chain, the
// influence routings (matrix rows), LFOs and the mod envelope. A source (an ohm today; a place, area, group or planet later:
// any owner) REFERENCES a recipe by id. Genes (the seed) give leanings only; everything can be sculpted, saved, loaded and
// shared as one JSON object (store.js). A recipe turns a note event (+ the matrix's note-time offsets) into voice messages.
import { rng } from './rng.js';
import { GENES, ENGINES, fromGenes } from './synth.js';
import { KINDS, makeInsert } from './fxkinds.js';

const FAM = { string: [1, 2, 3, 4, 5, 6, 7, 8], membrane: [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501], bar: [1, 2.756, 5.404, 8.933, 13.344, 18.64, 24.81, 31.87] };
export const KNOBS = {   // modal body (range + what it does, sound-design terms)
  bright: { min: 0, max: 1, label: 'exciter brightness', hint: 'mallet hardness: spectral tilt of the strike, click level and click colour' },
  decay: { min: .1, max: 6, label: 'decay (s)', hint: 'T60-ish ring time of the fundamental' },
  damp: { min: 0, max: 1, label: 'damping', hint: 'frequency-dependent loss: how much faster the upper modes die (metal .. wood/clay)' },
  inharm: { min: 0, max: 1, label: 'inharmonicity', hint: 'stiffness stretch of the partials (string -> bell/bar)' },
  size: { min: 0, max: 1, label: 'body size', hint: 'register of the body (octave of the om) and a longer, darker ring when big' },
};
// synth genes shown as knobs (all genes stay in the recipe; these are the useful handles). ADSR / filter env / pitch env / LFO live here.
export const SYNTH_KNOBS = ['cut', 'reso', 'ftype', 'fenv', 'fdec', 'att', 'dec', 'sus', 'rel', 'curve', 'penv', 'ptime', 'lfoR', 'lfoP', 'lfoF', 'lfoA', 'fmI', 'fmFb', 'wtPos', 'wtScan', 'addTilt', 'pdAmt', 'fold', 'lpg', 'ringR', 'granDens', 'granSize', 'detune', 'sat', 'noise', 'exc', 'res'];
export const FAMILIES = ['auto', 'phys', ...ENGINES.filter(e => e !== 'eNRES')];   // family picker: 'auto' = the seed's leaning
export const FAMNAME = { auto: 'seed leaning', phys: 'physical model', eVA: 'VA / subtractive', eFM: 'FM', eWT: 'wavetable', eADD: 'additive', ePD: 'phase distortion', eFOLD: 'fold + LPG', eRING: 'ring mod', eGRAN: 'granular' };
export const OPTS = { geneMemo: true, breath: true, holdStrikes: true, sizeOctave: true, heart: { on: false, level: .5 }, drone: { on: false, level: .35 }, bgSound: false, jam: { on: true, div: 4, snap: 'context', near: 4, inTune: true, inTime: true },
  harm: { on: true, bars: 2, keys: true, place: 'vote', placeW: .6, nudge: true, nudgeW: 1.2 }, land: { mode: 'context', win: .12, dense: 8 }, tempo: { follow: 'context' }, mix: { on: true },
  sing: { on: true, mode: 'imitate', when: 'beat', latchS: 1.5, loops: 4, drift: 'context', fit: 'context', form: 'context', bends: 'context', voiceSample: 'context', duck: true, duckMode: 'context', duckDb: -12, nearK: .4, phonesK: .3, phonesDb: -3, phones: 'auto', gate: .01 },
  sample: { on: true, chop: 'notes' },
  blend: { on: true, patterns: true, sound: true, soundMax: .35, rate: .08, max: 4, drift: { on: true, step: .02, cap: .25, capXp: .5, xpSongs: 40, songBars: 32, gapBars: 8 }, voice: { on: true, max: .15 }, share: { ctx: true, base: .15 } },   // v0.0.7 share (Q46, PROPOSAL): how much it plays from its brain = base + its matrix brain.learned rows, each bar; off = v0.0.6 fixed share
  brain: { fades: true, idle: 64, fade: .985, retain: false, heardIdleS: 30, heardHalfS: 90, playIdleS: 900, playHalfS: 600, playAdd: .25, playMax: 8, phraseBars: 64, secBars: 4, cap: 2000 },   // v0.0.7 retain (Q52 52C: context decides; OFF by default = current fade). On: example settings (heard fades over minutes, played stays, long parts, cap), every rate scaled by the ohm's matrix brain.keep
  thing: { sound: true },
  autojam: { on: true, near: 2.5, reach: 6, max: 6, droneK: .15, sleepK: .05 }, spectral: { seeds: true, chance: .2 } };   // world options: switchable step-1 proposals + the world's own sources
let nextId = 1;
import { IOPTS, placeFor, instP, blendP, syllable, PALETTE } from './instruments.js';
import { rareVoices } from './raresound.js';   /* rare ohms (rare.js): a rare recipe's colour, never its pitch */
export const recipes = new Map();
// INSTRUMENTS (instruments.js): a fresh ohm gets its own place in instrument space; body + mix follow it so sound and body agree
export function instrumentize(rec, opt = {}) { if (!IOPTS.on) return rec; rec.inst = placeFor(rec.seed, Object.assign({ track: !opt.name && opt.add !== false, genes: rec.synth && rec.synth.genes }, opt)); return applyInst(rec); }
// step 5: the same row -> body / mix shaping for any instrument (a drummer's kit hit, a drawn instrument). withRow = a derived recipe that plays one row.
// FIXED BODY MODES (MT 12:09 Oct 25): a plucked instrument's wooden body / gourd resonates at its OWN frequencies, not ratios of the note, so a
// high note no longer drags bell overtones up with it. Band per row (Hz); 4 modes seeded per ohm inside the band. Same mode count = same DSP cost.
export const BODY_BAND = { oud: [100, 250], nylon_guitar: [100, 250], kora: [150, 300] };
export function bodyModes(id, s) { const B = BODY_BAND[id]; if (!B) return null; const q = rng(((s >>> 0) ^ 0xb0d7) >>> 0), out = [];
  for (let k = 0; k < 4; k++) out.push(B[0] * Math.pow(B[1] / B[0], (k + .15 + q() * .7) / 4)); return out; }
export function withRow(rec, id) { const r = Object.assign({}, rec, { inst: { a: id, b: id, w: 0, s: rec.inst ? rec.inst.s : 1, src: rec.inst && rec.inst.src }, modal: Object.assign({}, rec.modal, { p: Object.assign({}, rec.modal.p) }), mix: Object.assign({}, rec.mix) }); return applyInst(r); }
function applyInst(rec) { const P = instP(rec.inst); if (!P) return rec;
  const row = PALETTE.find(e => e.id === rec.inst.a) || {}, md = row.modal || {}, res = row.res || {}, rm = row.range_midi || [48, 84], b = row.body || {};
  const st = (res.str || 0) + .05, me = (res.membrane || 0) + .05, ba = (res.bar || 0) + (res.tube || 0) * .3 + .05, t = st + me + ba;
  rec.modal.fam = { string: st / t, membrane: me / t, bar: ba / t };
  const mid = (rm[0] + rm[1]) / 2; rec.modal.p.size = b.size != null ? Math.max(.3, Math.min(.7, .3 + b.size * .4)) : Math.max(.3, Math.min(.7, .7 - (mid - 36) / 60 * .4));
  if (md.bright != null) rec.modal.p.bright = .3 + md.bright * .5; if (md.damp != null) rec.modal.p.damp = .2 + md.damp * .6; if (md.decay_s) rec.modal.p.decay = Math.max(BODY_BAND[row.id] ? .1 : .8, Math.min(3.4, md.decay_s));   /* a plucked body keeps MT's short thump (.08-.12 s); others keep the .8 s floor */
  if (st / t > .6) rec.modal.p.inharm = Math.min(rec.modal.p.inharm, .03);   // a string row's body modes stay harmonic (a random 0-.35 stretch rang like a bell under oud / kora / guitar)
  // a BLEND of two rows: each row's modal body counts by its weight SQUARED (energy, not amplitude: the modal layer runs ~3x the instrument
  // voice's gain, so a linear 40% struck partner made a duduk ring like a bell); a pure row (w = 0) is exactly the row's value
  const rA = PALETTE.find(e => e.id === rec.inst.a), rB = PALETTE.find(e => e.id === rec.inst.b), w = rec.inst.a === rec.inst.b ? 0 : Math.max(0, Math.min(1, rec.inst.w || 0)), mm = e => e ? Math.max(0, Math.min(1, (e.modal || {}).mix || 0)) : 0;
  const modal = rA && rB ? mm(rA) * (1 - w) * (1 - w) + mm(rB) * w * w : P.modalMix;
  rec.mix = { modal: P.tract ? 0 : Math.max(0, Math.min(1, modal)), synth: 1 }; rec.mixRow = rec.inst.a; return rec; }
const clamp01 = v => Math.max(0, Math.min(.9999, v));
// PROPOSAL (bot choice, not requested): the routings a fresh recipe starts with, i.e. which hand movements on the soft body
// change the sound. All are ordinary matrix rows: editable or removable in the panel.
export const DEFAULT_ROUTES = [
  // items change an ohm's sound in noticeable, predictable ways (Wilbow 3:41 AM Oct 23 / 2:32 AM): same item kind -> same move on any instrument
  { src: 'item.bright', dst: 'live.cut', amt: .6 },         // a bright item: its filter opens clearly
  { src: 'item.rough', dst: 'live.sat', amt: .5 },          // a rough item: drive ...
  { src: 'item.rough', dst: 'live.fold', amt: .3 },         //   ... and folded edges
  { src: 'item.space', dst: 'fx.0.mix', amt: .5 },          // a spacious item: more of its effect
  { src: 'item.wobble', dst: 'live.lfoP', amt: .3 },        // a wobbly item: vibrato
  { src: 'item.touch', dst: 'note.gain', amt: .15 },        // touching any item: a little louder
  // ground colours the sound (INSTRUMENT_PALETTE.md: rock, crater, water, ice, cloud, lush); the instrument stays underneath
  { src: 'ground.rock', dst: 'live.cut', amt: .3 },         // rock: harder, brighter
  { src: 'ground.crater', dst: 'live.cut', amt: .3 },       // crater: the same hard edge
  { src: 'ground.crater', dst: 'fx.0.mix', amt: .2 },       //   ... ringing in the bowl
  { src: 'ground.water', dst: 'fx.0.mix', amt: .3 },        // water: wetter ...
  { src: 'ground.water', dst: 'live.lfoP', amt: .1 },       //   ... and a slight waver
  { src: 'ground.ice', dst: 'live.cut', amt: .4 },          // ice: glassy bright ...
  { src: 'ground.ice', dst: 'fx.0.mix', amt: .25 },         //   ... with a cold tail
  { src: 'ground.cloud', dst: 'fx.0.mix', amt: .35 },       // cloud: soft and far ...
  { src: 'ground.cloud', dst: 'live.cut', amt: -.2 },       //   ... darker
  { src: 'ground.lush', dst: 'fx.0.mix', amt: .15 },        // lush: a little warmer room
  { src: 'ground.rough', dst: 'live.sat', amt: .35 },       // rough ground: grit
  { src: 'body.pinchIn', dst: 'live.bend', amt: .35 },      // two fingers pinching the body together: the held sound rises in pitch
  { src: 'body.pinchIn', dst: 'live.cut', amt: .5 },        //   ... and gets brighter
  { src: 'body.pinchOut', dst: 'live.cut', amt: -.45 },     // two fingers spreading on the body: darker ...
  { src: 'body.pinchOut', dst: 'fx.0.mix', amt: .4 },       //   ... and more of the first effect
  { src: 'body.motion', dst: 'live.lfoP', amt: .2 },        // dragging / tossing it: while it moves, the pitch wavers a little (temporary; Wilbow 2:36 'just for affect')
  { src: 'body.pull', dst: 'fx.0.depth', amt: .45 },        // how far the body is pulled off centre: deeper first effect
  { src: 'touch.pos', dst: 'synth.cut', amt: .35 },         // where you tap: nearer the rim = brighter synth layer
  { src: 'touch.pressure', dst: 'note.gain', amt: .3 },     // pressing harder (if the screen reports pressure) = louder
  // v0.0.6 (Wilbow 2:32, PROPOSALS): the world shapes its synth, its own voice stays. bond rows grow with time together.
  { src: 'body.squash', dst: 'live.cut', amt: .2 },         // squashed body: the filter opens a little (live, back when it relaxes)
  { src: 'body.impact', dst: 'live.bend', amt: .06 },       // a landing / bump: a tiny pitch wobble that decays within about a beat
  { src: 'partner.density', dst: 'live.sat', amt: .25, bond: 1 },   // a busy partner: a little drive
  { src: 'partner.near', dst: 'note.width', amt: .6, bond: 1 },     // close to a partner: wider stereo
  { src: 'body.wobble', dst: 'live.lfoA', amt: .1 },        // still wobbling after a bump: a slight tremble while it settles
  { src: 'sing.level', dst: 'fx.0.mix', amt: .25 },
  // v0.0.7 PROPOSALS (Wilbow Q46 46B/C/D, Q52 52C: context decides). brain.learned = how much of what it plays comes from its brain
  // (its own style is the rest); brain.keep = how long its memories last when opts.brain.retain is on. Modest; edit or remove like any row.
  { src: 'brain.fit', dst: 'brain.learned', amt: .25 },     // a learned bit that fits the chord + beat right now gets played more
  { src: 'player.taught', dst: 'brain.learned', amt: .2 },  // you just taught it: it plays that back more
  { src: 'jam.busy', dst: 'brain.learned', amt: .1 },       // a busy jam: a bit more borrowed material
  { src: 'gene.curious', dst: 'brain.learned', amt: .1 },   // curious ohms borrow more
  { src: 'place.harmony', dst: 'brain.learned', amt: .05 },
  { src: 'ohm.playing', dst: 'brain.keep', amt: .4 },       // what it is playing now stays
  { src: 'gene.memory', dst: 'brain.keep', amt: .3 },       // a memory gene
  { src: 'jam.busy', dst: 'brain.keep', amt: .15 },
  { src: 'place.harmony', dst: 'brain.keep', amt: .15 },
  { src: 'layer.timbre', dst: 'live.cut', amt: .25 },
  // v0.0.12 PROPOSAL: ground material colours the sound (terrain.js posts ground.hard / ground.hollow / ground.wet / place.timbre;
  // hard ground's echo = the shared room, terrain.js opts.room). Wet ground dulls, hollows boom (a bigger, longer body).
  { src: 'ground.wet', dst: 'live.cut', amt: -.3 },
  { src: 'ground.wet', dst: 'modal.damp', amt: .2 },
  { src: 'ground.hollow', dst: 'modal.size', amt: .3 },
  { src: 'ground.hollow', dst: 'modal.decay', amt: .08 },
  { src: 'place.timbre', dst: 'live.cut', amt: .12 },        // v0.0.7 PROPOSAL: each world inside a world sounds different (bright smooth places open the filter)         // you singing to it: more of its first effect
  { src: 'env', dst: 'live.fold', amt: .15 },
  { src: 'lfo1', dst: 'fx.0.tone', amt: .12 },
  { src: 'sound.level', dst: 'look.glow', amt: .9 },        // two-way coupling: the sound makes the body glow ...
  { src: 'sound.level', dst: 'body.throb', amt: .6 },       //   ... and swell (sound moves the body)
];
export function makeRecipe(seed, opt = {}) {
  const r = rng(seed), w = [r(), r(), r()], s = w[0] + w[1] + w[2];
  const genes = {}; for (const k of GENES) genes[k] = r();
  for (const e of ENGINES) genes[e] = r() * .3;                  // engines: one gene leaning (or none = physical)
  const lean = r(); if (lean > .2) genes[ENGINES[Math.floor(r() * 8)]] = .6 + r() * .35;
  genes.perc = r() * .5; genes.sus = .3 + r() * .5; genes.att = r() * .45; genes.rel = .3 + r() * .5; genes.cut = .35 + r() * .45;
  const fx = []; const nfx = 1 + Math.floor(r() * 2); const common = ['svf', 'dly', 'cho', 'dst', 'phs', 'tap', 'shm', 'wah', 'trm'];
  for (let i = 0; i < nfx; i++) { const k = r() < .7 ? common[Math.floor(r() * common.length)] : KINDS[Math.floor(r() * KINDS.length)]; if (!fx.some(x => x.kind === k)) fx.push(makeInsert(k, seed + i)); }
  // v0.0.7 PROPOSAL opts.spectral: some seeds also carry the spectral insert (own rng stream, so every other gene stays as before)
  if (OPTS.spectral && OPTS.spectral.seeds && fx.length < 4 && rng(seed * 31 + 17)() < OPTS.spectral.chance) fx.push(makeInsert('spc', seed + 9));
  const rec = { id: nextId++, v: 2, name: opt.name || 'seed ' + seed, seed, hue: r() * 360, send: .22 + r() * .2,
    modal: { fam: { string: w[0] / s, membrane: w[1] / s, bar: w[2] / s }, p: { bright: .3 + r() * .5, decay: .8 + r() * 2.6, damp: .2 + r() * .6, inharm: r() * .35, size: .3 + r() * .4 } },
    synth: { genes, family: 'auto' },
    mix: { modal: .75 + r() * .25, synth: .25 + r() * .45 },
    fx,
    mods: DEFAULT_ROUTES.map(m => ({ ...m })),
    lfo: [{ rate: [.5, 1, 2, 4][Math.floor(r() * 4)], shape: 'sine', depth: 1 }, { rate: 8, shape: 'tri', depth: 1 }],   // rate in BEATS per cycle (music clock)
    menv: { a: .01, d: .4, s: .2, r: .6 } };
  instrumentize(rec, opt);
  if (opt.add !== false) recipes.set(rec.id, rec); return rec;
}
// ONE object in, ONE object out: the saved form is the recipe itself minus runtime ids
export const toJSON = rec => { const o = JSON.parse(JSON.stringify(rec)); delete o.id; return o; };
// RESUME (v0.0.18 bells fix, Wilbow 11:43-11:46 Oct 25 "why are third of them still bells", "4/7 of mine"): the modal body layer + the mix
// belong to the palette row. Before, Object.assign(base, saved) MUTATED base, so 'rec.mix = base.mix' restored the SAVED mix: every world
// saved before the palette (modal .75-1 at 3x the instrument's gain, random inharmonic stretch) resumed as ringing modal bells, and a
// hatchling kept a parent's mix for a different row. Now the fresh row values are taken before the merge, and the row's modal body + mix
// are re-applied whenever the saved mix was not made for this row (old save, bred child, row left the palette).
export const fromJSON = o => { const base = makeRecipe(o.seed || 1, { add: false }), fresh = base.inst ? { inst: Object.assign({}, base.inst) } : null;
  const rec = Object.assign(base, JSON.parse(JSON.stringify(o)), { id: nextId++ }); if (!rec.modal || !rec.modal.p) rec.modal = { fam: { string: 1, membrane: 0, bar: 0 }, p: { bright: .5, decay: 1, damp: .5, inharm: 0, size: .5 } };
  if (fresh && (!o.inst || !PALETTE.some(e => e.id === o.inst.a))) rec.inst = fresh.inst;   /* no instrument yet, or its landmark left the palette */
  if (rec.inst && IOPTS.on && o.mixRow !== rec.inst.a) applyInst(rec);   /* the saved mix was not made for this row: the row's modal body + mix */
  recipes.set(rec.id, rec); return rec; };
// family picker: sets the engine genes (genes stay leanings; the picker is an explicit override)
export function genesFor(rec) { const g = Object.assign({}, rec.synth.genes), f = rec.synth.family;
  if (f && f !== 'auto') { for (const e of ENGINES) g[e] = .1; if (f === 'phys') g.engMix = 1; else { g[f] = .95; g.engMix = .05; } } return g; }
function ratios(m) { const f = m.fam, out = [], B = Math.pow(m.p.inharm, 2) * .02;
  for (let k = 0; k < 8; k++) { const lr = f.string * Math.log(FAM.string[k]) + f.membrane * Math.log(FAM.membrane[k]) + f.bar * Math.log(FAM.bar[k]); const r = Math.exp(lr); out.push(r * Math.sqrt(1 + B * r * r)); }
  return out; }
// register from body size: 0 -> 2 octaves above the om, 1 -> the om itself (switchable proposal)
export const octaveOf = rec => OPTS.sizeOctave ? Math.round((1 - rec.modal.p.size) * 2) + 1 : 2;
// SHAPE (dive.js, q360 'C'): rec.shape.synth = { cut, reso } offsets (-.5 .. .5) a player sets from inside the ohm. Only these keys are read,
// so shaping can never move pitch (no penv / ptime / lfoP / glide / note.pitch here).
const SHAPE_SYNTH = ['cut', 'reso'];
const shapeN = (s, N) => { let o = N; for (const k of SHAPE_SYNTH) { const v = s[k]; if (typeof v === 'number' && v === v && v !== 0) { if (o === N) o = Object.assign({}, N); o['synth.' + k] = (o['synth.' + k] || 0) + Math.max(-.5, Math.min(.5, v)); } } return o; };
// ev: { f, vel, pos (0 centre .. 1 rim), dur, pan, src, fx (insert-chain head slot or -1) }; N = note-time matrix offsets { 'modal.bright': +x, ... }
// returns 0..2 voice messages (modal body and/or synth voice); pure, no audio calls
// learn: [{ inst, k }] = sounds it has picked up from partners (blend.js), blended INTO its own instrument (one voice, own sound stays the larger part)
// v0.0.26 (switch geneMemo): fromGenes is pure, and a burst of song notes asked it the same genes again and again (q1-q3 profile:
// voicesFor -> fromGenes ~10 of 45 ms in one control tick at 4x throttle). Same genes -> the same answer, copied so no caller shares it.
const FGM = new Map(); export const fgStats = { hit: 0, miss: 0 };
const fromG = g => { if (!OPTS.geneMemo) return fromGenes(g); let s = ''; for (const k in g) s += k + (typeof g[k] === 'number' ? g[k].toFixed(5) : g[k]) + ',';
  let P = FGM.get(s); if (P) fgStats.hit++; else { fgStats.miss++; P = fromGenes(g); if (FGM.size > 400) FGM.clear(); FGM.set(s, P); }
  return Object.assign({}, P); };
export function voicesFor(rec, ev, N = {}, learn = null) {
  if (rec.shape && rec.shape.synth) N = shapeN(rec.shape.synth, N);   /* dive shaping (dive.js O.shape): saved filter offsets, the same path as matrix synth.* rows */
  const IP = rec.inst && IOPTS.on && rec.synth.family === 'auto' ? instP(rec.inst) : null;   /* palette row: its loudness (loud_db x norm) scales the modal layer too */
  const out = [], mixM = Math.max(0, Math.min(1, rec.mix.modal + (N['mix.modal'] || 0))), mixS = Math.max(0, Math.min(1, rec.mix.synth + (N['mix.synth'] || 0)));
  const gainK = Math.max(0, 1 + (N['note.gain'] || 0)), f0 = ev.f * Math.pow(2, (N['note.pitch'] || 0) / 12), fx = ev.fx == null ? -1 : ev.fx;
  if (mixM > .01) { const p = {}; for (const k in KNOBS) p[k] = Math.max(KNOBS[k].min, Math.min(KNOBS[k].max, rec.modal.p[k] + (N['modal.' + k] || 0) * (KNOBS[k].max - KNOBS[k].min)));
    const hard = Math.max(0, Math.min(1, p.bright * (.6 + .6 * ev.vel))), u = ev.pos == null ? .35 : ev.pos;
    const rs = rec.modal.tuned || ratios({ fam: rec.modal.fam, p }), modes = [];   /* V08 P6 2: a marimba-row bar rings tuned-bar ratios [1, 4, 9.9] (MT 4.7; shapeplay.js) */ const lossExp = .25 + p.damp * 1.6, tilt = 1.7 - hard * 1.4, dScale = 1 + p.size * .6;
    const bm = IP && rec.inst ? bodyModes(rec.inst.a, rec.inst.s || rec.seed || 1) : null;
    if (bm) for (let k = 0; k < bm.length; k++) { const r = bm[k] / bm[0], pos = k === 0 ? 1 - u * u * .6 : .25 + .75 * Math.abs(Math.cos((k + 1) * Math.PI * u * .5));   // fixed body: Hz, not x f0
      modes.push({ f: bm[k], a: pos / Math.pow(r, tilt * .6), d: p.decay * dScale * (ev.dur || 1) / Math.pow(r, lossExp * .6) }); }
    else
    for (let k = 0; k < Math.min(8, rs.length); k++) { const r = rs[k], fk = f0 * r; if (fk > 16000) break;
      const pos = k === 0 ? 1 - u * u * .6 : .25 + .75 * Math.abs(Math.cos((k + 1) * Math.PI * u * .5));   // strike point: rim excites upper modes
      modes.push({ f: fk, a: pos / Math.pow(r, tilt * .6), d: p.decay * dScale * (ev.dur || 1) / Math.pow(r, lossExp * .6) }); }
    const sum = modes.reduce((s, m) => s + m.a, 0) || 1; for (const m of modes) m.a /= sum;
    out.push({ t: 'note', modes, gain: .5 * (.25 + .75 * ev.vel) * mixM * gainK * (IP && IP.gainK || 1), click: hard * .18, clickT: .002 + (1 - hard) * .006, clp: .08 + hard * .6, att: .001 + (1 - hard) * .004, pan: ev.pan || 0, send: rec.send, src: ev.src || 0, fx, hold: ev.hold ? 1 : 0, tag: ev.tag || 0 }); }
  if (IP && mixS > .01) { let P = Object.assign({}, IP); if (learn) for (const l of learn) { const LP = instP(l.inst); if (LP && l.k > .01) P = Object.assign(blendP(P, LP, Math.min(l.cap || OPTS.blend.soundMax || .35, l.k)), { tract: P.tract, gainK: P.gainK }); } const dK = Object.keys(N).filter(k => k.startsWith('synth.'));
    if (dK.length) { const g = genesFor(rec), g1 = Object.assign({}, g); for (const k of dK) { const gk = k.slice(6); if (gk in g1) g1[gk] = clamp01(g1[gk] + N[k]); }   // matrix synth.* rows: the same move the gene would make, applied to the instrument
      const A = fromG(g), B = fromG(g1); for (const k in B) if (typeof B[k] === 'number' && typeof P[k] === 'number' && B[k] !== A[k]) P[k] = A[k] > 0 && B[k] > 0 && /^(att|dec|rel|cut|fdec|mdec|lfoR|q)$/.test(k) ? P[k] * B[k] / A[k] : P[k] + B[k] - A[k]; }
    const gain = .16 * mixS * gainK * (P.gainK || 1);
    if (P.tract && IOPTS.voices) { const k = (ev.k == null ? Math.floor(f0 * 7) : ev.k), dur = Math.max(.12, ev.sustain || (ev.dur || 1) * .5), sy = syllable(P, f0, dur, k);
      out.push({ t: 'inst', tract: sy, gain: gain * 2.2 * (.4 + .6 * ev.vel), pan: ev.pan || 0, send: rec.send, fx, src: ev.src || 0 }); }
    else { const dur = ev.sustain || Math.max(.08, (P.att + P.dec) * (ev.dur || 1) * (P.sus > .2 ? 1.6 : 1));
      out.push({ t: 'inst', P, f: f0, dur, vel: ev.vel, gain, pan: ev.pan || 0, send: rec.send, fx, src: ev.src || 0 }); } }
  else if (mixS > .01) { const g = genesFor(rec); for (const k in N) if (k.startsWith('synth.')) { const gk = k.slice(6); if (gk in g) g[gk] = clamp01(g[gk] + N[k]); }
    const P = fromG(g); const dur = ev.sustain || Math.max(.08, (P.att + P.dec) * (ev.dur || 1) * (P.sus > .2 ? 1.6 : 1));
    out.push({ t: 'inst', P, f: f0, dur, vel: ev.vel, gain: .16 * mixS * gainK, pan: ev.pan || 0, send: rec.send, fx, src: ev.src || 0 }); }
  // v0.0.6 SAMPLE layer: a recipe may carry chopped slices (rec.sample = [[bankId, hz], ...]); the instrument voice plays the slice
  // nearest the note, re-pitched, through the recipe's own filter + FX (no separate sampler system)
  if (rec.sample && rec.sample.length) { const P = Object.assign({}, fromG(genesFor(rec)), { smp: rec.sample, phys: 0, eng: [], nres: 0, noise: 0, att: .004, dec: .1, sus: .95, rel: .12, penv: 0, lfoP: 0, lfoA: 0, trem: 0, glT: 0, cut: 9000, fenv: 0, sat: 0 });
    out.push({ t: 'inst', P, f: f0, dur: Math.max(.15, ev.sustain || (ev.dur || .8) * .9), vel: ev.vel, gain: .22 * gainK, pan: ev.pan || 0, send: rec.send, fx, src: ev.src || 0 }); }
  return rec.rare ? rareVoices(rec, out, f0) : out;
}
