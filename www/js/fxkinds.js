// EFFECT KINDS (main thread): an insert = { kind, ctl: { mix, depth, tone, div, off, iv, cents, cut, res, morph }, ch } with every
// control 0..1. apply() turns it into the worklet slot message, reading the SHARED clock and key (beat-locked kinds sit on the
// music.js grid; pitch kinds take in-key steps). PORTED from /workspace/softsound/www/js/fxkinds.js (X.apply, X.CTRL, X.IV, X.TIME,
// names); the old 'item home' / world-seed layer is replaced by plain 0.5 defaults + a seeded character (ch) per insert.
// v0.0.2 adds 'svf' (state-variable filter). Nothing here knows about ohms: any owner (ohm, place, area) can carry a chain.
import { rng } from './rng.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const KINDS = ['svf', 'dst', 'dly', 'cho', 'rev', 'trm', 'cmb', 'pit', 'glt', 'shm', 'frz', 'tap', 'spr', 'wah', 'phs', 'spn', 'vow', 'hrm', 'sub', 'gld', 'sym', 'grn', 'rng', 'wrm', 'rad', 'gat', 'swl', 'dop', 'pmp'];
export const NAME = { svf: 'filter (SVF)', spc: 'spectral (smear / freeze)', rev: 'reverb', dly: 'delay', dst: 'distortion', glt: 'glitch', cho: 'chorus', trm: 'tremolo', cmb: 'comb', pit: 'pitch', shm: 'shimmer', frz: 'freeze', tap: 'tape echo', spr: 'spring', wah: 'auto-wah', phs: 'phaser', spn: 'auto-pan', vow: 'vowel', hrm: 'harmonizer', sub: 'sub octave', gld: 'glide', sym: 'sympathetic', grn: 'granular', rng: 'ring mod', wrm: 'warmth', rad: 'radio', gat: 'gate', swl: 'swell', dop: 'doppler', pmp: 'pump' };
// v0.0.7: 'spc' spectral (smear / blur / freeze) is listed apart so existing seeds keep their sounds; ALL_KINDS = every kind.
export const EXTRA = ['spc'], ALL_KINDS = KINDS.concat(EXTRA);
export const TIME = { dly: 1, tap: 1, gat: 1, trm: 1, wah: 1, phs: 1, spn: 1, pmp: 1, grn: 1, frz: 1, swl: 1, gld: 1, dop: 1, vow: 1 };
export const CTRL = { dly: ['div', 'off', 'tone', 'depth'], tap: ['div', 'off', 'tone', 'depth'], gat: ['div', 'off', 'depth'], trm: ['div', 'off', 'depth'], phs: ['div', 'off', 'depth'], spn: ['div', 'off', 'depth'], pmp: ['div', 'off', 'depth'], dop: ['div', 'off', 'depth'],
  wah: ['div', 'off', 'depth', 'tone'], grn: ['div', 'off', 'depth'], frz: ['div', 'depth', 'tone'], swl: ['div', 'depth'], gld: ['div', 'iv', 'cents'],
  shm: ['cents', 'tone', 'depth'], hrm: ['iv', 'cents'], sub: ['depth', 'tone'], sym: ['cents', 'depth', 'tone'], rng: ['iv', 'cents', 'depth'], pit: ['iv', 'cents'], cmb: ['cents', 'depth'],
  vow: ['depth', 'tone', 'div'], wrm: ['depth', 'tone'], rad: ['depth', 'tone'], spr: ['depth', 'tone'], rev: ['depth', 'tone'], dst: ['depth', 'tone'], cho: ['depth', 'tone'], glt: ['depth'], svf: ['cut', 'res', 'morph'], spc: ['depth', 'tone', 'hold'] };
export const controls = it => ['mix'].concat(CTRL[it.kind] || ['depth']);
const IV = { hrm: [2, 4, -3, 5, 7], rng: [0, 7, 4, 12], pit: [-7, -4, 4, 7, 12, -14], gld: [-1, -2, -4, 1] };
const uDiv = u => Math.pow(2, -2 + 4 * u);     // 1/4 beat .. 4 beats
const DIVS = [.25, 1 / 3, .5, 2 / 3, .75, 1, 1.5, 2, 4];
const snapDiv = b => DIVS.reduce((a, d) => Math.abs(Math.log2(d / b)) < Math.abs(Math.log2(a / b)) ? d : a, 1);
export function makeInsert(kind, seed = 1) { const r = rng(seed * 7 + KINDS.indexOf(kind) * 131);
  return { kind, ctl: { mix: .5, depth: .5, tone: .5, div: .5, off: .5, iv: .1, cents: .5, cut: .55, res: .3, morph: .0, hold: 0 },
    ch: { fb: .3 + r() * .4, spread: r(), pat: [1, 0, r() > .5 ? 1 : 0, 1, 0, 1, r() > .5 ? 1 : 0, 0], vow: Math.floor(r() * 5) } }; }
const degC = (C, d) => { const n = C.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return C[i] + 1200 * o; };
const nearDeg = (C, cents) => { const n = C.length; let best = 0, bd = 1e9; for (let d = -2 * n; d <= 3 * n; d++) { const e = Math.abs(degC(C, d) - cents); if (e < bd) { bd = e; best = d; } } return best; };
const stepRatio = (C, d0, st) => Math.pow(2, (degC(C, d0 + st) - degC(C, d0)) / 1200);
const inKeyHz = (M, lo, hi) => { let h = M.tonicHz; while (h < lo) h *= 2; while (h > hi) h /= 2; return h; };
// V = effective control values (after the mod matrix); returns { kind, p, mix } for the worklet slot
export function apply(M, it, V) { const k = it.kind, ch = it.ch, C = M.cents(), dc = (V.cents - .5) * 200, p = {}, tonic = M.tonicHz;
  let mix = V.mix * 2 > 1 ? 1 + (V.mix - .5) * 1.2 : V.mix * 2; mix = clamp(mix, 0, 1.3);
  if (TIME[k]) { const b = snapDiv(uDiv(V.div)); p.per = clamp(b * M.spb(), .03, 2.8); p.t0 = M.origin(); p.now = M.now(); p.off = V.off - .5; p.beats = b; }
  const dep = V.depth, tn = V.tone, ivStep = () => { const L = IV[k] || [0]; return L[clamp(Math.floor(V.iv * L.length), 0, L.length - 1)]; };
  switch (k) {
    case 'svf': p.cut = V.cut; p.res = V.res * .95; p.morph = V.morph; break;
    case 'spc': p.smear = dep; p.blur = tn; p.hold = V.hold == null ? 0 : V.hold; break;
    case 'dly': p.time = p.per; p.tone = tn; p.fb = clamp(.25 + dep * .55, .1, .8); break;
    case 'tap': p.time = p.per; p.tone = tn; p.fb = clamp(.25 + dep * .5, .1, .78); break;
    case 'trm': p.depth = dep; break;
    case 'cho': p.depth = dep; p.tone = tn; break;
    case 'dst': p.drive = .4 + dep * .5; p.tone = tn; break;
    case 'rev': p.size = dep; p.damp = 1 - tn; break;
    case 'cmb': { const d = nearDeg(C, 1200 * Math.log2(220 / tonic)); p.freq = clamp(tonic * Math.pow(2, (degC(C, d) + dc) / 1200), 40, 2000); p.fb = .5 + dep * .4; break; }
    case 'pit': { const st = ivStep(); p.ratio = Math.pow(2, (degC(C, st) + dc) / 1200); p.semi = 12 * Math.log2(p.ratio); break; }
    case 'glt': p.rep = clamp(.1 + dep * .7, 0, .9); break;
    case 'shm': p.ratio = 2 * Math.pow(2, dc / 1200); p.tone = tn; p.depth = dep; p.fb = ch.fb; p.spread = ch.spread; break;
    case 'hrm': p.step = ivStep(); p.dc = dc; p.spread = ch.spread; p.ratio = stepRatio(C, 0, p.step) * Math.pow(2, dc / 1200); break;
    case 'gld': p.step = ivStep(); p.cents = 0; p.dc = dc; p.semi = 12 * Math.log2(stepRatio(C, 0, p.step)); break;
    case 'sub': p.depth = dep; p.tone = tn; break;
    case 'sym': { const r0 = inKeyHz(M, 70, 140) * Math.pow(2, dc / 1200); p.fr = [r0, r0 * Math.pow(2, degC(C, 4) / 1200), r0 * 2, r0 * Math.pow(2, degC(C, 2) / 1200) * 2]; p.depth = dep; p.tone = tn; break; }
    case 'rng': { const st = ivStep(); p.hz = inKeyHz(M, 200, 800) * Math.pow(2, (degC(C, st) + dc) / 1200); p.depth = dep; break; }
    case 'grn': { const has5 = C.some(x => Math.abs(x - 700) < 30); p.rates = has5 ? [1, 2, .5, 1.5] : [1, 2, .5]; p.depth = dep; p.spread = ch.spread; break; }
    case 'gat': p.pat = ch.pat; p.depth = dep; break;
    case 'vow': p.vow = ch.vow; p.morph = dep * .8; p.tone = tn; break;
    default: p.depth = dep; p.tone = tn; }
  return { kind: k, p, mix }; }
