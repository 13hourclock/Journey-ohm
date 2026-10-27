// INSTRUMENTS: every ohm is its own instrument. The palette (palette_data.js, Music Theory's INSTRUMENT_PALETTE.md rows) gives
// LANDMARKS in one continuous instrument space; an ohm sits between its two nearest landmarks (blend weight from its seed) and adds
// its own spread on every parameter, so there are no fixed categories and no two ohms alike. Its body follows its instrument
// (size from range, round / long / lobed from the row's body lean) so sound and body agree. Pure: instrument -> voice params P
// (the same P fields dsp/inst.js plays, so every matrix live row still moves every instrument); 'voice' rows play the vocal tract.
import { rng } from './rng.js';
import { PALETTE, PALETTE_SRC } from './palette_data.js';
import { EXC } from './synth.js';
import { PALETTE_NORM } from './palette_norm.js';
export { PALETTE, PALETTE_SRC };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, u) => a + (b - a) * u, lg = (a, b, u) => Math.exp(lerp(Math.log(a), Math.log(b), u));
const ENG = { VA: 0, FM: 1, WT: 2, ADD: 3, PD: 4, FOLD: 5, RING: 6, GRAN: 7 }, RESK = ['str', 'tube', 'bar', 'membrane', 'form'];
export const IOPTS = { on: true, blend: .45, spread: 1, voices: true, distinct: true, genes: true, geneWidth: 6, percK: 1.4, placeLean: true };   // placeLean: Wilbow 1:14 PM MDT Oct 25 "A: keep the place lean" (on by default, over the equal base; off = flat 1-in-N for tests)
const byId = new Map(PALETTE.map((e, i) => [e.id, i]));
// ---- one palette row -> voice params P (units as in the format; missing = defaults) ----
export function rowP(e) { const P = {}, x = e.exc || {}, r = e.res || {}, en = e.engine || {}, env = e.env || {}, fl = e.filter || {}, pi = e.pitch || {}, vb = e.vib || {}, te = e.tech || {}, nz = e.noise || {}, md = e.modal || {}, fo = e.formant || {};
  const part = e.part || 'osc';
  let es = EXC.map(k => +x[k] || 0); if (!es.some(v => v > 0)) es = part === 'bow' ? [0, 0, 0, 1, 0, 0] : part === 'blow' || part === 'tube' ? [0, 0, 0, 0, 1, 0] : part === 'voice' ? [0, 0, 0, 0, 0, 1] : [0, 1, 0, 0, 0, 0];
  const es1 = es.reduce((a, b) => a + b, 0); EXC.forEach((k, i) => P[k] = es[i] / es1);
  let rs = RESK.map(k => +r[k] || 0); if (!rs.some(v => v > 0)) rs = part === 'string' || part === 'bow' ? [1, 0, 0, 0, 0] : part === 'tube' || part === 'blow' ? [0, 1, 0, 0, 0] : part === 'modal' ? [0, 0, 1, 0, 0] : [0, 0, 0, 0, 0];
  const rs1 = rs.reduce((a, b) => a + b, 0) || 1; P.str = rs[0] / rs1; P.tube = rs[1] / rs1; P.modal = (rs[2] + rs[3]) / rs1; P.form = rs[4] / rs1;
  const R = md.partials || (rs[3] > rs[2] ? [1, 1.594, 2.136, 2.296] : rs[2] > 0 ? [1, 2.756, 5.404, 8.933] : [1, 2, 3, 4]); P.ratios = R.length > 4 ? R.slice(0, 8) : [0, 1, 2, 3].map(k => R[k] || k + 1);   // bells / gongs / drums: up to 8 modes
  P.mdec = clamp(md.decay_s || 1, .1, 6); P.fmI = 0; P.fmR = 1; P.fmEnvK = 0; P.osc = part === 'osc' && !en.kind ? .8 : P.voc * .5 + P.form * .3;
  P.noise = clamp(nz.amt || 0, 0, .6); P.noiseLP = .05 + Math.pow(clamp(nz.color == null ? .5 : nz.color, 0, 1), 1.5) * .9;
  P.att = clamp(env.att_s == null ? .003 : env.att_s, .0015, 1); P.dec = clamp(env.dec_s || .6, .05, 2.5); P.sus = clamp(env.sus == null ? .3 : env.sus, 0, 1); P.rel = clamp(env.rel_s || .3, .03, 2.5); P.curve = clamp(env.curve || 1, .35, 2.8);
  P.ftype = fl.type === 'bp' ? .5 : fl.type === 'hp' ? .9 : 0; P.cut = clamp(fl.cut_hz || 4000, 180, 10800); P.q = 2 - 1.85 * Math.pow(clamp(fl.reso || .15, 0, 1), 1.3); P.fenv = clamp(fl.env_oct || 0, -1.2, 2.8); P.fdec = clamp(fl.env_dec_s || .25, .02, 1.4);
  P.penv = clamp(pi.env_oct || 0, -.6, .6); P.ptime = clamp(pi.env_s || .02, .005, .4); P.glT = clamp(pi.glide_s || 0, 0, .37);
  P.lfoR = clamp(vb.rate_hz || 5, .3, 8); P.lfoP = clamp((vb.depth_cents || 0) / 100, 0, .6); P.lfoA = clamp(vb.trem || 0, 0, .55); P.lfoF = clamp(vb.filt_oct || 0, 0, 1.2);
  P.trem = clamp(te.repeat || 0, 0, 1); P.techRate = clamp(te.repeat_hz || 10, 6, 18);
  const dc = clamp(e.detune_cents || 0, 0, 25); P.det = Math.pow(2, dc / 1200); P.uni = dc > 2 ? .7 : 0; P.sat = clamp(e.sat || 0, 0, 1); P.width = clamp(e.width == null ? .3 : e.width, 0, 1);
  P.F1 = clamp(fo.f1_hz || 500, 250, 1000); P.F2 = clamp(fo.f2_hz || 1500, 700, 2800);
  P.fb = clamp(.95 + .04 * Math.min(1, P.dec / 2) + (P.bow + P.blow > .3 ? .005 : 0), .9, .996); P.damp = clamp(.25 + .7 * Math.log(P.cut / 180) / Math.log(60), .2, .95);
  P.percK = 0; P.droneK = 0; P.vaShape = 0; P.pwm = 0; P.fmOps = 2; P.fmIx = 1; P.fmFb = 0; P.fmR2 = 2; P.wtPos = 0; P.wtScan = 0; P.addTilt = 1; P.addSpread = 0; P.pdAmt = 0; P.fold = 0; P.lpg = 1; P.ringR = 2.01; P.ringAM = 0; P.granDens = .5; P.granSize = .06;
  P.eng = []; P.nres = 0; P.phys = 1;
  if (en.kind && en.kind !== 'none') { const a = clamp(en.amt == null ? .9 : en.amt, 0, 1);
    if (en.kind === 'NRES') { P.nres = a * 1.3; P.phys = 1 - a * .5; }
    else if (en.kind in ENG) { P.eng = [[ENG[en.kind], a * (en.kind === 'GRAN' ? 1.6 : en.kind === 'RING' ? 1.1 : 1)]]; P.phys = 1 - a; }
    P.pwm = clamp(en.pwm || 0, 0, 1); P.vaShape = P.pwm > .35 ? Math.min(1, (P.pwm - .35) * 2.5) : 0;
    P.fmR = clamp(en.fm_ratio || 1, .25, 12); P.fmIx = clamp(en.fm_index == null ? 1.5 : en.fm_index, 0, 8); P.fmOps = clamp(Math.round(en.fm_ops || 2), 2, 4); P.fmFb = clamp(en.fm_fb || 0, 0, .9); P.fmR2 = clamp(en.fm_ratio2 || P.fmR * 2, .25, 12);
    P.wtPos = clamp(en.wt_pos || 0, 0, 1); P.wtScan = clamp(en.wt_scan || 0, -.4, 1); P.addTilt = clamp(en.add_tilt || 1, .4, 2.6); P.addSpread = clamp(en.add_spread || 0, 0, 1.8); P.pdAmt = clamp(en.pd_amt || 0, 0, 1);
    P.fold = clamp(en.fold || 0, 0, 1); P.lpg = .3 + clamp(en.lpg == null ? .5 : en.lpg, 0, 1) * 2.5; P.ringR = clamp(en.ring_ratio || 2.01, .25, 12); P.ringAM = clamp(en.ring_am != null ? en.ring_am : /partial 1/.test(e.tuning || '') ? .4 : 0, 0, 1);   /* 'perceived partial 1': keep some carrier so the note is heard (flagged to MT) */ P.granDens = clamp(en.gran_dens == null ? .5 : en.gran_dens, 0, 1); P.granSize = clamp(en.gran_size_s || .06, .02, .18); }
  if (!(P.att + P.dec > 0)) P.att = .003;
  if (part === 'voice') { const v = e.voice || {}; P.tract = { vowels: (Array.isArray(v.vowels) ? v.vowels : (v.vowels || 'a o e').split(/\s+/)).filter(Boolean), tense: clamp(v.tense == null ? .6 : v.tense, .2, 1), nasal: clamp(v.nasal || 0, 0, 1), breath: clamp(v.breath == null ? .2 : v.breath, 0, 1), cons: Array.isArray(v.consonants) ? v.consonants.join(' ') : v.consonants || 'm n l d b' }; }
  P.gainK = Math.pow(10, clamp(e.loud_db || 0, -18, 6) / 20) * (NORM[e.id] || 1); P.modalMix = clamp(md.mix || 0, 0, 1);
  P.modalBright = clamp(md.bright == null ? .5 : md.bright, 0, 1); P.modalDamp = clamp(md.damp == null ? .4 : md.damp, 0, 1); P.modalParts = md.partials || null;
  P.pr = clamp(e.pitch_ratio || 1, .25, 8);   // which partial sits on the played note (a bell's nominal over its hum)
  P.detHz = clamp(e.detune_hz != null ? e.detune_hz : e.trad && (e.trad.gamelan || e.trad.bali || e.trad.java) && e.detune_cents ? ((e.range_midi || [60])[0] < 48 ? 4 : 6) : 0, 0, 12);   // ombak: a constant beat in Hz (gamelan rows with only cents: 6 Hz, the middle of the 5-7 Hz check; big low gongs 4 Hz, their 3-5 Hz)
  P.vibD = clamp(vb.delay_s != null ? vb.delay_s : (P.voc + P.bow + P.blow > .4 || part === 'voice') && P.lfoP > 0 ? .3 : 0, 0, 1.5); P.vibRamp = clamp(vb.ramp_s || .3, .02, 1.5);   // delayed vibrato (voices, bows, winds)
  P.smpAny = e.source === 'sample' ? 1 : 0;
  if (P.smpAny) { const tc = e.tech || {}, plain = !(e.engine && e.engine.kind && e.engine.kind !== 'none');   /* slice style: chop = start on one of 4 cuts, reverse, stutter = re-start every 1/repeat_hz s */
    P.smpChop = clamp(tc.chop != null ? tc.chop : plain ? .75 : 0, 0, 1); P.smpRev = clamp(tc.reverse != null ? tc.reverse : plain ? .2 : .15, 0, 1);
    P.smpRep = clamp(tc.repeat || 0, 0, 1); P.smpRepHz = clamp(tc.repeat_hz || 8, 1, 32); }
  return fin(P); }
// derived fields the voice code reads (formant coefficients, engine name, percussion genes neutral)
const EN = ['eVA', 'eFM', 'eWT', 'eADD', 'ePD', 'eFOLD', 'eRING', 'eGRAN'];
function fin(P) { P.F1k = Math.min(.9, 2 * Math.sin(Math.PI * P.F1 / 96000)); P.F2k = Math.min(.9, 2 * Math.sin(Math.PI * P.F2 / 96000));
  if (P.complexity == null) { P.complexity = .6; P.perc = 0; P.pitched = 1; P.transient = .5; P.bodyRes = .5; }
  P.engName = P.eng.length ? EN[P.eng[0][0]] : P.nres ? 'eNRES' : 'phys'; return P; }
// per-row loudness evening (measured offline by tools/palette_norm.mjs: RMS of a mid note through the real voice code); missing = 1
export const NORM = Object.assign({}, PALETTE_NORM);
export function setNorm(o) { Object.assign(NORM, o); ROWP.length = 0; }
const ROWP = [];
const rowPAt = i => ROWP[i] || (ROWP[i] = rowP(PALETTE[i]));
// ---- feature vector of a row: where it sits in instrument space (used to find an ohm's neighbouring landmark) ----
const feat = e => { const P = rowPAt(byId.get(e.id)), m = e.range_midi || [48, 84];
  return [Math.log(P.att) / 3, Math.log(P.dec), P.sus * 2, Math.log(P.cut) / 2, (m[0] + m[1]) / 60, P.pluck * 2, P.strike * 2, P.bow * 2, P.blow * 2, P.voc * 2, P.str, P.tube, P.modal, P.form, P.tract ? 3 : 0, ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => P.eng.some(x => x[0] === k) ? 1.5 : 0), P.nres ? 1.5 : 0]; };
let FEAT = null; const feats = () => FEAT || (FEAT = PALETTE.map(feat));
const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]); return Math.sqrt(s); };
export function nearest(i, k = 0) { const F = feats(), o = []; for (let j = 0; j < F.length; j++) if (j !== i) o.push([dist(F[i], F[j]), j]); o.sort((p, q) => p[0] - q[0]); return o.length ? o[Math.min(k, o.length - 1)][1] : -1; }
// ---- group variety: the last few new ohms' main instruments and families (this session); a new ohm steps along the golden walk
// to the first landmark whose family none of the last 5 used and whose id none of the last 18 used (falls back gracefully) ----
const RECENT = [], RECENT_F = [];
function spreadOut(a0) { const N = PALETTE.length, step = Math.max(1, Math.round(N * .618)); let best = a0, bs = -1;
  for (let k = 0; k < N; k++) { const j = (a0 + k * step) % N, e = PALETTE[j], sc = (RECENT.includes(e.id) ? 0 : 2) + (RECENT_F.includes(e.family) ? 0 : 1);
    if (sc > bs) { bs = sc; best = j; } if (sc === 3) break; }
  RECENT.push(PALETTE[best].id); if (RECENT.length > 18) RECENT.shift(); RECENT_F.push(PALETTE[best].family); if (RECENT_F.length > 5) RECENT_F.shift(); return best; }
export const resetRecent = () => { RECENT.length = 0; RECENT_F.length = 0; };
// ---- an ohm's place in instrument space, from its seed (golden-ratio walk over the palette: consecutive seeds land far apart) ----
// ---- PLACE (planet track feeds this): tradition shares + ground shares at a spot; both only lean, never ban ----
export const PLACE = { trad: {}, ground: {} };
export function setPlace(p = {}) { PLACE.trad = p.trad || {}; PLACE.ground = p.ground || {}; }
// row weight from the place: w = 1 + 2.5 * sum_t trad[t] * share(t) (INSTRUMENT_PALETTE 4.3) x ground lean (7: ice -> bells/glass, cloud -> air/pads/grains)
const GROUND_LEAN = { ice: e => e.family === 'bell' || /glass|glock|vibra|bowl/.test(e.id), cloud: e => e.family === 'pad' || e.family === 'granular' || e.id === 'wind_air' };
// PICK WEIGHT: flat. Wilbow 12:37 PM MDT Oct 25: "Even distribution of instruments.  Equal chance of spawn.  In the final game".
// Every palette instrument has the same base pick weight (1); the earlier struck/bell x.6-.75 and per-instrument PICK_K values are gone.
// IOPTS.pickK (a number) is kept only as a test/dev hook and is unset by default. Place tradition / ground leans still add on top below.
export const isDrumRow = e => e.family === 'struck' && (((e.res || {}).membrane || 0) >= .7 || e.id === 'wood_clave');
export const isStruckPick = e => ((e.family === 'struck' || e.family === 'bell') && e.id !== 'santur' && !isDrumRow(e)) || e.id === 'ring_bell' || e.id === 'fm_glass' || e.id === 'fm_epiano';
const pickK = () => (IOPTS.pickK == null ? 1 : IOPTS.pickK);
export function placeWeight(e, pl = PLACE) { let w = pickK(e); if (IOPTS.placeLean === false) return w; const t = e.trad || {}; for (const k in pl.trad || {}) w += 2.5 * (t[k] || 0) * pl.trad[k];
  for (const g in pl.ground || {}) if (GROUND_LEAN[g] && GROUND_LEAN[g](e)) w *= 1 + 1.5 * pl.ground[g]; return w; }
// ---- the ohm's point in sound space from its GENES (exc / res / engine leanings, size, brightness, decay); rows get the same vector, cached ----
const RES5 = ['str', 'bar', 'membrane', 'tube', 'form'], ENG8 = ['VA', 'FM', 'WT', 'ADD', 'PD', 'FOLD', 'RING', 'GRAN'], GENG = ['eVA', 'eFM', 'eWT', 'eADD', 'ePD', 'eFOLD', 'eRING', 'eGRAN'];
const tri = (x, n) => Array.from({ length: n }, (_, k) => Math.max(0, 1 - Math.abs(x * (n - 1) - k)));
let GV = null; const rowVecs = () => GV || (GV = PALETTE.map((e, i) => { const P = rowPAt(i), r = e.res || {}, rs = RES5.map(k => +r[k] || (k === 'bar' ? +r.modal || 0 : 0)), rsum = rs.reduce((a, b) => a + b, 0) || 1, kind = (e.engine || {}).kind;
  return [...EXC.map(k => P[k]), ...rs.map(v => v / rsum), ...ENG8.map(k => kind === k ? .5 : 0), ((e.body || {}).size == null ? .5 : e.body.size) * .7, Math.log(P.cut / 180) / Math.log(60), Math.min(1, Math.log(P.dec / .05) / Math.log(50)) * .7]; }));
export function geneVec(g = {}) { const q = k => g[k] == null || isNaN(g[k]) ? .5 : Math.max(0, Math.min(1, g[k])), en = GENG.map(k => q(k) > .55 ? .5 : 0);
  return [...tri(q('exc'), 6), ...tri(q('res'), 5), ...en, (1 - q('cut')) * .35 + q('dec') * .35, q('cut'), q('dec') * .7]; }
// ---- an ohm's place in instrument space: gene tone (w = exp(-d^2/.18*) x place weight), seeded draw so uniform genes do not average out;
// 70% of starts sit near ONE row, 30% between two (INSTRUMENT_PALETTE 6.2-6.3). Without genes: golden-ratio walk from the seed. ----
// PERCUSSION GENE (MT 11:33; PLAN_REAL_PLANET 11 B "percussion as a continuous gene"): 0..1 from the seed. It leans where an ohm STARTS in
// the palette (struck + membrane rows weigh x (1 - percK/2 .. 1 + percK/2) around .5) and how fast a drummer learns kit hits (drums.js);
// the palette row still sets the sound.
export const percGene = seed => { let h = ((seed >>> 0) * 2654435761 ^ 0x9e3779b9) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const isPercRow = e => e.family === 'struck' || ((e.res || {}).membrane || 0) >= .5;
export function placeFor(seed, opt = {}) { const r = rng(((seed * 2654435761) ^ 0x1f2e3d4c) >>> 0), N = PALETTE.length, pl = opt.place || PLACE;
  let a = Math.floor(((seed * .6180339887) % 1 + 1) % 1 * N) % N, b2 = -1;
  if (opt.genes && IOPTS.genes !== false) { const pg = opt.genes.perc != null ? opt.genes.perc : percGene(seed), gv = geneVec(opt.genes), RV = rowVecs(), sc = RV.map((v, j) => Math.exp(-(dist(gv, v) ** 2) / (.18 * IOPTS.geneWidth)) * placeWeight(PALETTE[j], pl) * (PALETTE[j].use ? .25 : 1) * (isPercRow(PALETTE[j]) ? 1 + (IOPTS.percK || 0) * (pg - .5) : 1));
    const tot = sc.reduce((x, y) => x + y, 0); let u = r() * tot; a = N - 1; for (let j = 0; j < N; j++) { u -= sc[j]; if (u <= 0) { a = j; break; } }
    let bs = -1; for (let j = 0; j < N; j++) if (j !== a && sc[j] > bs) { bs = sc[j]; b2 = j; } }   // second-best row = the blend partner
  else if (opt.lean) { const l = opt.lean; let best = a, bs = -1e9; for (let k = 0; k < 4; k++) { const j = (a + k * 7) % N, b = PALETTE[j].body || {}; const s = -Math.abs((b.size == null ? .5 : b.size) - (l.size == null ? .5 : l.size)) - r() * .3; if (s > bs) { bs = s; best = j; } } a = best; }
  const a0 = a; if (IOPTS.distinct && opt.track) a = spreadOut(a);   // a group stays varied: a new ohm avoids the instruments + families its recent neighbours got
  const b = a === a0 && b2 >= 0 ? b2 : nearest(a, Math.floor(r() * 3)), w = r() < .7 ? r() * .08 : .15 + r() * (IOPTS.blend - .15);   // 70% near one row, 30% between two
  return { a: PALETTE[a].id, b: b >= 0 ? PALETTE[b].id : PALETTE[a].id, w, s: Math.floor(r() * 1e9), src: PALETTE_SRC }; }
// ---- player ASSIGNS a row (becomes the new starting point; its own spread is kept) and BREEDING (a child = blend of two parents + seeded spread) ----
export function assignInst(inst, id, w = 0) { return { a: id, b: (inst && inst.a) || id, w, s: inst ? inst.s : 1, src: PALETTE_SRC }; }
export function breedInst(A, B, seed) { const r = rng(((seed * 2246822519) ^ 0x51ed27) >>> 0); if (!A || !B) return A || B; const fa = r() < .5;
  return { a: fa ? A.a : B.a, b: fa ? B.a : A.a, w: Math.min(.5, .2 + r() * .3), s: Math.floor(r() * 1e9), src: PALETTE_SRC }; }
// ---- the ohm's own instrument: blend of its two landmarks + its own spread on every parameter ----
const LOGK = ['att', 'dec', 'rel', 'cut', 'mdec', 'fdec', 'ptime', 'lfoR', 'techRate', 'F1', 'F2', 'fmR', 'fmR2', 'ringR', 'granSize', 'curve', 'q'];
export function blendP(A, B, w) { const P = {}; for (const k in A) { const x = A[k], y = B[k];
    if (typeof x === 'number' && typeof y === 'number') P[k] = LOGK.includes(k) && x > 0 && y > 0 ? lg(x, y, w) : lerp(x, y, w); else P[k] = x; }
  P.ratios = Array.from({ length: Math.max(A.ratios.length, B.ratios.length) }, (_, k) => lg(A.ratios[k] || B.ratios[k], B.ratios[k] || A.ratios[k], w)); P.eng = A.eng.map(e => [e[0], e[1] * (1 - w)]); for (const e of B.eng) { const f = P.eng.find(x => x[0] === e[0]); if (f) f[1] += e[1] * w; else P.eng.push([e[0], e[1] * w]); }
  P.eng = P.eng.filter(e => e[1] > .02).sort((p, q) => q[1] - p[1]).slice(0, 2); P.tract = A.tract || (w > .5 ? B.tract : null); return P; }
const CACHE = new Map();
export function instP(inst) { const key = inst.a + '|' + inst.b + '|' + inst.w.toFixed(3) + '|' + inst.s + '|' + IOPTS.spread; let P = CACHE.get(key); if (P) return P;
  const ia = byId.get(inst.a), ib = byId.get(inst.b); if (ia == null) return null; P = blendP(rowPAt(ia), rowPAt(ib == null ? ia : ib), inst.w);
  const r = rng(inst.s >>> 0), sp = IOPTS.spread, j = (k, oct) => { P[k] *= Math.pow(2, (r() * 2 - 1) * oct * sp); };
  j('cut', .6); j('att', .5); j('dec', .45); j('rel', .4); j('mdec', .4); j('lfoR', .4); j('F1', .15); j('F2', .15); j('fdec', .4);
  P.fenv = clamp(P.fenv + (r() - .5) * .8 * sp, -1.2, 2.8); P.sat = clamp(P.sat + r() * .15 * sp, 0, 1); P.width = clamp(P.width + (r() - .5) * .4 * sp, 0, 1); P.noise = clamp(P.noise + (r() - .3) * .05 * sp, 0, .6);
  P.lfoP = clamp(P.lfoP * (.6 + r() * .8), 0, .6); P.wtPos = clamp(P.wtPos + (r() - .5) * .3 * sp, 0, 1); P.fmIx = clamp(P.fmIx * Math.pow(2, (r() - .5) * .8 * sp), 0, 8); P.fold = clamp(P.fold + (r() - .5) * .3 * sp, 0, 1); P.pdAmt = clamp(P.pdAmt + (r() - .5) * .3 * sp, 0, 1);
  P.addTilt = clamp(P.addTilt * Math.pow(2, (r() - .5) * .6 * sp), .4, 2.6); P.ratios = P.ratios.map((v, k) => k ? v * Math.pow(2, (r() - .5) * .03 * sp) : v);
  P.q = clamp(P.q * Math.pow(2, (r() - .5) * .4 * sp), .15, 2); P.damp = clamp(.25 + .7 * Math.log(P.cut / 180) / Math.log(60), .2, .95);
  if (P.tract) { const t = P.tract; P.tract = Object.assign({}, t, { tense: clamp(t.tense + (r() - .5) * .25 * sp, .2, 1), len: .8 + r() * .5, agil: r(), vowels: t.vowels.slice().sort(() => r() - .5) }); }
  fin(P); if (CACHE.size > 400) CACHE.clear(); CACHE.set(key, P); return P; }
// ---- wordless sung syllables for a 'voice' instrument (tract segments: tongue position / diameter / lips + a consonant onset) ----
const VOW = { a: [.3, 3.1, 1], o: [.28, 2.4, .55], u: [.33, 2.05, .3], e: [.55, 2.6, 1], i: [.64, 2.05, .9], y: [.62, 2.1, .4], ae: [.48, 3, 1], r: [.45, 2.3, .6], n: [.6, 2.3, .15] };   // r: bunched 'r' colour (overtone singing); n: a held nasal hum
const CON = { m: { x: .95, d: 0, man: 3, vo: 1, lip: 0 }, n: { x: .78, d: 0, man: 3, vo: 1 }, l: { x: .75, d: .6, man: 4, vo: 1 }, d: { x: .78, d: 0, man: 1, vo: 1 }, b: { x: .95, d: 0, man: 1, vo: 1, lip: 0 }, w: { x: .95, d: .5, man: 4, vo: 1, lip: .3 }, h: null };
export function syllable(P, f0, dur, k) { const t = P.tract, vs = t.vowels, v = VOW[vs[k % vs.length]] || VOW.a, segs = [], cons = (t.cons || '').split(/\s+/).filter(c => CON[c]);
  if (cons.length && k % 3 !== 2) segs.push({ dur: .045, f0, c: CON[cons[k % cons.length]] });
  if (vs.length > 1 && dur > .5) { const v2 = VOW[vs[(k + 1) % vs.length]] || v; segs.push({ dur: dur * .55, f0, v: v.slice() }, { dur: dur * .45, f0, v: v2.slice() }); }
  else segs.push({ dur: Math.max(.08, dur), f0, v: v.slice() });
  segs.push({ dur: .06, rest: 1 }); return { f0, segs, tense: t.tense, nasal: t.nasal, agil: t.agil, len: t.len }; }
