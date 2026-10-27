// CLAY: shape the sound with your hands before it hatches (old game v0.8 R5 / R7, V08_SPEC.md R5 + R7, GESTURES.md sections 4 / 12 / 13;
// approved by Wilbow, audit row "Clay shaping"). Switch 'clay', default OFF = v0.0.29 (a spiral hatches at once, as now).
// When on, a spiral that ENDS WITH A REST (finger still >= 450 ms within 8 px before the lift) leaves a lump of CLAY instead of an ohm.
// A ring around it closes in ~8 s; every touch on the clay resets the ring (cap 20 s from the open). It hatches when the ring closes,
// on a tap on empty space, on a new spiral, when the app goes to the background, or on a two-finger confirm.
// The clay is plastic: every deformation stays (R7.0). Touches that START on the clay (within 1.6 clay radii):
//  first touch picks the excitation family (R7.1): tap = struck | flick a strand out = plucked | rub (4+ reversals over >= .35 R) =
//    bowed | still .2-.5 s then moving = blown | two-finger squeeze (ratio < .88) = voiced. A random voice of that family.
//  shape (R7.2 / R7.6): sharper edges = brighter, points = drive + harder attack, long = nasal, lumpy = gritty, big = low;
//    the shape leans the role: wide = bass, tall = lead, round = pad, spiky = percussion.
//  poke speed = attack (R7.3) | a slow pull from the edge past 1.3 R (>= .6 s) = tail = sustain / release; a quick one = a limb (R7.4)
//  push in from the rim > .3 R = dent = body resonance (R7.5) | gentle stroke = air, scribble (after the first touch) = grit (R7.6)
//  two-finger pinch on the clay = size + register | two fingers starting outside the edge pinching in = pull a point (R7.7)
//  press and hold still > .5 s = FIRE: soft -> ceramic -> metallic bell, inharmonic, glows, stiffer to shape (R7.7)
//  two-finger twist = steps the voice through its family every 30 deg (GESTURES 4) | 3+ taps = the motif rhythm (GESTURES 4)
//  wiggle (3+ reversals inside .35 R over > .4 s) = vibrato (R7.9) | two fingers at the edge pulled out together past 1.6 R = split:
//    an appendage section (cap 5): unison / detune + width, never new ohms (R7.10) | two-finger tap = freeze the ring; a second one
//    confirms the hatch with a rising phrase (R7.8) | after every touch a short phrase plays in the sound so far (R7.15, no words).
//  3-finger tap = undo one shaping step (the normal undo; after the hatch it removes the ohm). Untouched clay = a fully random voice (R7.14).
// Gesture check (GESTURES.md 4 / 12 / 13): only touches that START on the open clay are clay gestures, so nothing else changes while it
// is closed; the clay is not an ohm (no join / mute / chirp / catch / teach on it). A plain spiral (no end rest) is the egg / the spawn.
import { rng } from './rng.js';
import { recipes, makeRecipe, withRow } from './recipe.js';
import { PALETTE } from './instruments.js';
import { noLine, softDot } from './soft.js';   // v0.0.30 no outlines (lnHints)
export const softArc = (g, x, y, r, left, hsl, a) => { const n = Math.max(1, Math.round(28 * left)); for (let i = 0; i < n; i++) { const th = -1.5708 + (i + .5) / 28 * 6.2832; softDot(g, x + Math.cos(th) * r, y + Math.sin(th) * r, 5, hsl, a); } };   // a countdown ring as soft beads (egg + clay)
export const CLAY_OPTS = { on: false, restMs: 450, restPx: 8, ringMs: 8000, capMs: 20000, rPx: 40, reachR: 1.6, tapMs: 250, tapPx: 10, holdMs: 500, fireMs: 2500,
  rubRev: 4, rubSpan: .35, wigRev: 3, wigMs: 400, tailR: 1.3, tailMs: 600, dentR: .3, squeeze: .88, splitR: 1.6, splitCap: 5, twistDeg: 30, motifTaps: 3, patStrength: 4, pts: 48 };
export const CLAY_FAMILIES = { struck: ['marimba', 'balafon', 'vibraphone', 'mbira', 'santur', 'gender', 'saron', 'glockenspiel', 'steel_pan'],
  plucked: ['harp_pluck', 'koto', 'kora', 'nylon_guitar', 'oud', 'charango', 'guqin', 'sitar'], bowed: ['cello_bow', 'erhu', 'fiddle'],
  blown: ['bansuri', 'shakuhachi', 'ney', 'duduk', 'clarinet_tube', 'panpipe'], voiced: ['choir', 'tract_singer', 'nasal_voice', 'overtone_voice'] };
export const CLAY_FIRE = ['ceramic_bell', 'bronze_bell'];   // fire .33+ = ceramic, .66+ = metallic bell
const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x), TAU = Math.PI * 2, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
// a new state (all numbers; JSON-safe so an undo step is a copy)
export function clayState(seed, O = CLAY_OPTS) { return { seed: seed >>> 0, off: new Array(O.pts).fill(1), k: 1, fam: null, row: null, step: 0, touches: 0, poke: null, tail: 0, dent: 0, fire: 0,
  air: 0, grit: 0, vib: 0, split: 0, taps: [], frozen: false }; }
// plastic deformation of the outline at angle a (radians), amount d (clay radii, + out / - in), width w (radians)
export function deform(S, a, d, w, O = CLAY_OPTS) { const n = S.off.length, st = 1 - .6 * S.fire; for (let i = 0; i < n; i++) { const t = wrap(i / n * TAU - a);
    S.off[i] = Math.max(.4, Math.min(2.4, S.off[i] + d * st * Math.exp(-(t * t) / (w * w)))); } }
// outline numbers: lumpy (0 = round), points (count of sharp tips), sharp, long (elongation 0-1), wide (+ wide / - tall)
export function shapeOf(S) { const o = S.off, n = o.length, m = o.reduce((a, v) => a + v, 0) / n; let v = 0, cx = 0, cy = 0, pts = 0, sharp = 0;
  for (let i = 0; i < n; i++) { v += (o[i] - m) ** 2; const a = i / n * TAU * 2; cx += o[i] * Math.cos(a); cy += o[i] * Math.sin(a);
    const L = o[(i - 1 + n) % n], R = o[(i + 1) % n], curv = 2 * o[i] - L - R; if (o[i] > L && o[i] >= R && curv > .06) { let lo = 9; for (let j = -4; j <= 4; j++) lo = Math.min(lo, o[(i + j + n) % n]); if (o[i] - lo > .25) { pts++; sharp = Math.max(sharp, curv); } } }
  const e2 = Math.hypot(cx, cy) / n / m; return { mean: m, lumpy: Math.sqrt(v / n) / m, points: pts, sharp: cl(sharp / .5), long: cl(e2 * 3), wide: e2 < .05 ? 0 : Math.cos(Math.atan2(cy, cx)) * cl(e2 * 3) }; }
export function roleOf(S) { const h = shapeOf(S); if (h.points >= 3) return 'rhythm'; if (h.wide > .25) return 'bass'; if (h.wide < -.25) return 'lead'; if (h.lumpy < .08 && !h.points) return 'pad'; return null; }
// reversals along the stroke's main axis (legs >= minLeg px) and the span along it
function reversals(pts, minLeg = 4) { let mx = 0, my = 0; for (const q of pts) { mx += q[0]; my += q[1]; } mx /= pts.length; my /= pts.length; let sxx = 0, sxy = 0, syy = 0;
  for (const q of pts) { const dx = q[0] - mx, dy = q[1] - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; } const a = .5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(a), uy = Math.sin(a);
  let rev = 0, dir = 0, leg = 0, lo = 1e9, hi = -1e9; for (let i = 0; i < pts.length; i++) { const p = (pts[i][0] - mx) * ux + (pts[i][1] - my) * uy; lo = Math.min(lo, p); hi = Math.max(hi, p); if (!i) continue;
    const d = p - ((pts[i - 1][0] - mx) * ux + (pts[i - 1][1] - my) * uy), sg = Math.sign(d); if (!sg) continue; if (sg === dir || !dir) { leg += Math.abs(d); dir = sg; } else { if (leg >= minLeg) rev++; leg = Math.abs(d); dir = sg; } }
  return { rev, span: hi - lo }; }
// the end rest of a stroke: ms the finger stayed within restPx of the lift point before the lift (tEnd = the lift's timeStamp)
export function endRest(pts, tEnd, O = CLAY_OPTS) { if (!pts || pts.length < 2) return 0; const e = pts[pts.length - 1]; let i = pts.length - 1;
  while (i > 0 && Math.hypot(pts[i - 1][0] - e[0], pts[i - 1][1] - e[1]) <= O.restPx) i--; return Math.max(0, (tEnd != null ? tEnd : e[2] || 0) - (pts[i][2] || 0)); }
// one touch (screen px [x, y, t]; c = clay centre on screen, R = clay radius px; fingers = 1 or 2 point lists) -> what it was
export function readClay(fingers, c, R, O = CLAY_OPTS, first = false) {
  const A = fingers[0], s = A[0], e = A[A.length - 1], dur = Math.max(1, (e[2] || 0) - (s[2] || 0)), rad = q => Math.hypot(q[0] - c.x, q[1] - c.y) / R, ang = q => Math.atan2(q[1] - c.y, q[0] - c.x);
  if (fingers.length >= 2) { const B = fingers[1], s2 = B[0], e2 = B[B.length - 1], d0 = Math.hypot(s2[0] - s[0], s2[1] - s[1]) || 1, d1 = Math.hypot(e2[0] - e[0], e2[1] - e[1]), ratio = d1 / d0;
    const dur2 = Math.max(dur, (e2[2] || 0) - (s2[2] || 0)), mv = Math.max(Math.hypot(e[0] - s[0], e[1] - s[1]), Math.hypot(e2[0] - s2[0], e2[1] - s2[1]));
    if (dur2 < O.tapMs && mv < O.tapPx * 2) return { k: 'tap2' };
    const r0 = (rad(s) + rad(s2)) / 2, r1 = (rad(e) + rad(e2)) / 2, mid = Math.atan2((s[1] + s2[1]) / 2 - c.y, (s[0] + s2[0]) / 2 - c.x);
    if (r0 > .6 && r0 < 1.3 && r1 > O.splitR && ratio > .6 && ratio < 1.6) return { k: 'split', a: mid };
    if (rad(s) > 1 && rad(s2) > 1 && ratio < O.squeeze && !first) return { k: 'point', a: mid, d: cl(1 - ratio) };
    let tw = wrap(Math.atan2(e2[1] - e[1], e2[0] - e[0]) - Math.atan2(s2[1] - s[1], s2[0] - s[0])); const steps = Math.trunc(tw / (O.twistDeg * Math.PI / 180));
    if (steps && ratio > .7 && ratio < 1.4) return { k: 'twist', steps };
    if (first && ratio < O.squeeze) return { k: 'squeeze', ratio };
    return { k: 'pinch', ratio }; }
  let len = 0, mx = 0, still = 0; for (let i = 1; i < A.length; i++) len += Math.hypot(A[i][0] - A[i - 1][0], A[i][1] - A[i - 1][1]);
  for (const q of A) { const d = Math.hypot(q[0] - s[0], q[1] - s[1]); if (d > 6 && !still) still = (q[2] || 0) - (s[2] || 0); mx = Math.max(mx, d); }
  const v = len / R / (dur / 1000), poke = cl((v - 1) / 5);
  const rv = reversals(A), r0 = rad(s), r1 = rad(e);
  if (rv.rev >= O.wigRev && mx >= 4 && rv.span < O.rubSpan * R && dur > O.wigMs) return { k: 'wiggle', poke };
  if (mx < O.tapPx && dur < O.tapMs) return { k: 'tap', poke: .9, t: s[2] || 0 };
  if (mx < O.tapPx && dur >= O.holdMs && rad(s) < 1) return { k: 'fire', f: cl((dur - O.holdMs) / O.fireMs) + .1 };
  if (mx < O.tapPx) return { k: 'press', poke };
  if (rv.rev >= O.rubRev && rv.span >= O.rubSpan * R) return { k: first ? 'rub' : 'grit', poke };
  if (first && still >= 200 && still <= 500) return { k: 'blow', poke };
  if (r0 > .6 && r0 < 1.3 && r1 > O.tailR) return dur >= O.tailMs && v < 3 ? { k: 'tail', a: ang(s), d: cl((r1 - O.tailR) / 1.2) + .2, poke } : { k: 'limb', a: ang(s), poke };
  if (r0 > .6 && r0 < 1.6 && r0 - r1 > O.dentR) return { k: 'dent', a: ang(s), d: cl((r0 - r1) / .8), poke };
  if (r0 >= .6) return { k: 'edge', a: ang(s), d: Math.max(-.6, Math.min(.6, r1 - r0)), poke };
  return { k: 'air', poke: Math.min(poke, .3) }; }
const FIRST = { tap: 'struck', limb: 'plucked', rub: 'bowed', blow: 'blown', squeeze: 'voiced' };
// apply one read touch to the state (pure on S; returns S)
export function applyClay(S, w, O = CLAY_OPTS) { const r = rng((S.seed ^ (S.touches * 2654435761)) >>> 0); S.touches++;
  if (!S.fam && FIRST[w.k]) { S.fam = FIRST[w.k]; const L = CLAY_FAMILIES[S.fam]; S.row = L[Math.floor(r() * L.length)]; }
  if (w.poke != null) S.poke = w.poke;
  switch (w.k) {
    case 'tap': S.taps.push(w.t); deform(S, r() * TAU, -.04, .5, O); break;
    case 'fire': S.fire = cl(S.fire + w.f); break;
    case 'rub': case 'grit': S.grit = cl(S.grit + .3); for (let i = 0; i < 3; i++) deform(S, r() * TAU, (r() - .5) * .3, .2, O); break;
    case 'wiggle': S.vib = cl(S.vib + .35); break;
    case 'blow': case 'air': S.air = cl(S.air + .2); break;
    case 'tail': S.tail = cl(Math.max(S.tail, w.d)); deform(S, w.a, .5 + .4 * w.d, .45, O); break;
    case 'limb': deform(S, w.a, .55, .14, O); break;
    case 'dent': S.dent = cl(S.dent + w.d * .6); deform(S, w.a, -.25 - .3 * w.d, .35, O); break;
    case 'edge': deform(S, w.a, w.d, .5, O); break;
    case 'point': deform(S, w.a, .4 + .5 * w.d, .1, O); break;
    case 'split': S.split = Math.min(O.splitCap, S.split + 1); deform(S, w.a, .35, .2, O); break;
    case 'twist': if (S.fam) { const L = CLAY_FAMILIES[S.fam], i = Math.max(0, L.indexOf(S.row)); S.row = L[((i + w.steps) % L.length + L.length) % L.length]; } S.step += w.steps; break;
    case 'squeeze': case 'pinch': S.k = Math.max(.6, Math.min(1.6, S.k * Math.sqrt(Math.max(.3, w.ratio))))   /* spread = bigger (lower), pinch closed = smaller (higher) */; break;
  } return S; }
// the row the clay plays now (fire overrides to ceramic / metallic bell; untouched = any palette row)
export function clayRow(S) { if (S.fire >= .66) return CLAY_FIRE[1]; if (S.fire >= .33) return CLAY_FIRE[0]; if (S.row) return S.row;
  const all = PALETTE.filter(e => e.id && !/^(sample_|wind_air|water_drop|fire_crackle|earth_rumble|motion_rattle)/.test(e.id)); return all[S.seed % all.length].id; }
// a recipe shaped by the clay (base = the seed's recipe; keeps base.id)
export function clayRecipe(base, S) { let r; try { r = withRow(base, clayRow(S)); } catch (e) { r = Object.assign({}, base); } r.id = base.id;
  r.synth = { ...base.synth, genes: { ...base.synth.genes } }; r.modal = { ...r.modal, p: { ...r.modal.p } }; const G = r.synth.genes, n = (k, v) => { G[k] = cl(v); }, g = k => G[k] == null ? .5 : G[k], h = shapeOf(S), pk = Math.min(4, h.points) / 4;
  n('cut', g('cut') + .3 * h.sharp + .15 * pk - .1 * (S.k - 1)); n('sat', g('sat') + .35 * pk + .3 * S.grit + .2 * h.lumpy); n('fold', g('fold') + .25 * pk + .2 * S.grit); n('transient', g('transient') + .35 * pk);
  n('formant', g('formant') + .4 * h.long); n('noise', g('noise') + .25 * cl(h.lumpy * 3) + .3 * S.air + .15 * S.grit); if (S.air) n('noiseCol', g('noiseCol') + .2 * S.air);
  if (pk) n('att', g('att') * (1 - .5 * pk)); if (S.poke != null) { const tgt = .8 + (.04 - .8) * S.poke; n('att', g('att') + .6 * (tgt - g('att'))); }
  if (S.tail) { n('sus', Math.max(g('sus'), .4 + .5 * S.tail)); n('rel', Math.max(g('rel'), .5 + .45 * S.tail)); }
  if (S.dent) { n('bodyRes', g('bodyRes') + .5 * S.dent); n('reso', g('reso') + .35 * S.dent); }
  if (S.fire) { n('inharm', g('inharm') + .6 * S.fire); r.modal.p.inharm = Math.max(r.modal.p.inharm || 0, .15 + .6 * S.fire); r.modal.p.damp = (r.modal.p.damp == null ? .5 : r.modal.p.damp) * (1 - .6 * S.fire);
    r.modal.p.decay = Math.min(6, (r.modal.p.decay || 1) * (1 + 1.5 * S.fire)); r.mix = { ...r.mix, modal: Math.min(1, (r.mix && r.mix.modal || 0) + .3 * S.fire) }; }
  if (S.vib) { n('lfoP', Math.max(g('lfoP'), .2 + .3 * S.vib)); n('lfoR', Math.max(g('lfoR'), .4)); }
  if (S.split) { n('detune', g('detune') + .15 * S.split); n('width', g('width') + .15 * S.split); }
  const role = roleOf(S); if (role === 'bass') r.modal.p.size = Math.max(r.modal.p.size, .8); else if (role === 'lead') r.modal.p.size = Math.min(r.modal.p.size, .35);
  else if (role === 'pad') { n('att', Math.max(g('att'), .35)); n('sus', Math.max(g('sus'), .6)); } else if (role === 'rhythm') { n('dec', g('dec') * .6); n('sus', g('sus') * .3); n('perc', g('perc') + .3); }
  if (S.k !== 1) r.modal.p.size = cl(r.modal.p.size + (S.k - 1) * .5);   // big = low (sizeOctave), small = high
  r.clay = { row: clayRow(S), fam: S.fam, role, fire: +S.fire.toFixed(2), split: S.split, touches: S.touches }; return r; }
export function createClay({ sim, bus, music, spawn, undo, brain, toS = null, now = () => performance.now(), opts = {} }) {
  const O = { ...CLAY_OPTS, ...opts }, C = { opts: O, cur: null, hatched: 0, touches: 0, frozen: 0, last: null, fingers: new Map() };
  const preview = (c, rise) => { if (!bus || !music || !c.base) return; const rec = clayRecipe(c.base, c.S); recipes.set(rec.id, rec); c.rec = rec;
    const t = music.now ? music.now() : 0, hz = (d, o) => music.hz ? music.hz(d, o) : 220 * 2 ** (d / 7), oc = rec.modal && rec.modal.p ? Math.round((1 - rec.modal.p.size) * 2) + 1 : 2, deg = rise ? [0, 2, 4, 7] : [0, 4, 2];
    deg.forEach((d, i) => bus.note({ src: c.src, kind: 'note', f: hz(d, oc), vel: .5, pos: .3, dur: .35, pan: 0, t: t + .02 + i * .14, lite: false, by: 'clay' })); };
  C.open = (x, y, a) => { if (!O.on) return null; if (C.cur) C.hatch(); const t = now(), seed = spawn && spawn.seedFor ? spawn.seedFor() : (Math.random() * 2 ** 31) >>> 0;
    const base = makeRecipe(seed, { name: 'clay', add: false }), c = { x, y, a, t0: t, until: t + O.ringMs, S: clayState(seed, O), seed, base, o: null, steps: [], src: { id: 'clay:' + seed, scale: 'thing', seed, recipe: base.id, body: { x, y } } };
    recipes.set(base.id, base); C.cur = c;
    if (undo) undo.push({ label: 'clay', x, y, undo: () => { if (c.o) sim.remove(c.o); else if (C.cur === c) { C.cur = null; C.fingers.clear(); bus.post({ type: 'clay.gone', x, y }); } }, redo: () => { if (c.o) sim.unremove(c.o); else { C.cur = c; C.hatch(); } } });
    bus.post({ type: 'clay.open', x, y }); return c; };
  C.radius = () => { const c = C.cur; return c ? O.rPx * c.S.k : 0; };
  C.hitAt = (sx, sy) => { const c = C.cur; if (!c || !O.on || !toS) return null; const s = toS(c.x, c.y), d = Math.hypot(sx - s.x, sy - s.y), R = C.radius(), m = Math.max(...c.S.off); return d < R * Math.max(O.reachR, m * 1.15) ? 'on' : null; };
  // pointer plumbing from gestures.js: fingers that start on the clay; the touch is read when the last one lifts
  C.down = (id, p) => { C.fingers.set(id, p); };
  C.cancel = () => { C.fingers.clear(); };
  C.up = (id, p, cancel) => { if (!C.fingers.has(id)) return null; C.fingers.get(id).done = true; if (cancel) { C.fingers.clear(); return null; } if ([...C.fingers.values()].some(q => !q.done)) return null;
    const F = [...C.fingers.values()].map(q => q.pts); C.fingers.clear(); return C.touch(F); };
  C.touch = F => { const c = C.cur; if (!c || !F.length) return null; const s = toS ? toS(c.x, c.y) : { x: 0, y: 0 }, w = readClay(F, s, C.radius(), O, !c.S.touches);
    if (w.k === 'tap2') { if (c.S.frozen) { C.hatch(true); return w; } c.S.frozen = true; C.frozen++; bus.post({ type: 'clay.freeze', x: c.x, y: c.y }); preview(c); return w; }
    const before = JSON.stringify(c.S), S = c.S; applyClay(S, w, O); C.touches++; const t = now(); c.until = Math.min(c.t0 + O.capMs, t + O.ringMs);
    if (undo) { const step = { label: 'clay ' + w.k, x: c.x, y: c.y, clayStep: c, undo: () => { if (C.cur === c) c.S = JSON.parse(before); }, redo: () => { if (C.cur === c) applyClay(c.S, w, O); } }; undo.push(step); }
    if (brain && music && S.taps.length >= O.motifTaps) c.motif = S.taps.slice(-8);
    bus.post({ type: 'clay.touch', k: w.k, x: c.x, y: c.y, fam: S.fam, row: clayRow(S) }); preview(c); return w; };
  C.tick = () => { const c = C.cur; if (c && !c.S.frozen && now() >= c.until) C.hatch(); };
  C.hatch = rise => { const c = C.cur; if (!c) return null; C.cur = null; C.fingers.clear();
    if (undo && undo.done) for (let i = undo.done.length - 1; i >= 0; i--) if (undo.done[i].clayStep === c) undo.done.splice(i, 1);   // the shaping steps fold into the one 'clay' entry (undo = remove the ohm)
    if (rise) preview(c, true); const o = sim.spawn(c.x, c.y, c.seed, 'spiral'); if (!o) return null; c.o = o; C.hatched++; if (spawn) spawn.made++;
    const rec = recipes.get(o.recipe); if (rec) { const r = clayRecipe(rec, c.S); recipes.set(r.id, r); bus.post({ type: 'recipe', src: o, rec: r }); }
    const role = roleOf(c.S); if (brain && role) { const e = brain.remember(o, 'part', 'role', { scores: { [role]: 2 } }, 0, 0); if (e) e.keep = 1; }
    if (brain && music && c.motif && c.motif.length >= O.motifTaps) { const spb = music.spb(), t0 = c.motif[0]; let rh = c.motif.map(t => Math.round((t - t0) / 1000 / spb * 4) / 4); const span = rh[rh.length - 1];
      if (span > 3.75) rh = rh.map(b => Math.round(b * 3.75 / span * 4) / 4); rh = [...new Set(rh)]; if (rh.length >= 2) brain.remember(o, 'pattern', rh.join() + '|' + rh.slice(1).map(() => 0).join(), { rh, iv: rh.slice(1).map(() => 0), len: rh.length }, O.patStrength, O.patStrength); }
    C.last = { id: o.id, row: clayRow(c.S), fam: c.S.fam, role, touches: c.S.touches }; const bid = c.base.id; if (bid !== o.recipe) setTimeout(() => recipes.delete(bid), 2500);
    bus.post({ type: 'spawn.spiral', src: o, turns: c.a ? c.a.turns : 0, clay: C.last.row }); return o; };
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => { if (document.hidden && C.cur) C.hatch(); });
  // overlay: the clay lump (its plastic outline), fire glow, the closing ring (frozen = a still ring), no text. Visuals can replace it (clay.* events)
  C.draw = (g2, toS2) => { const c = C.cur; if (!c || !O.on) return; const s = toS2(c.x, c.y), t = now(), R = C.radius(), S = c.S, n = S.off.length, left = S.frozen ? 1 : cl((c.until - t) / O.ringMs);
    g2.save(); const f = S.fire, col = f > .66 ? [235, 225, 200] : f > .33 ? [230, 200, 170] : [190, 140, 105]; g2.fillStyle = `rgb(${col.join(',')})`; g2.globalAlpha = .9;
    if (f) { g2.shadowColor = `rgba(255,${Math.round(160 + 80 * f)},90,${.4 + .5 * f})`; g2.shadowBlur = 8 + 24 * f; }
    g2.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, r = R * S.off[i % n] * (1 + .015 * Math.sin(t / 120 + i)); const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r; i ? g2.lineTo(x, y) : g2.moveTo(x, y); } g2.closePath(); g2.fill();
    g2.shadowBlur = 0; for (let k = 0; k < S.split; k++) { const a = -1.5708 + (k + 1) * TAU / (S.split + 1); g2.beginPath(); g2.arc(s.x + Math.cos(a) * R * 1.35, s.y + Math.sin(a) * R * 1.35, 5, 0, TAU); g2.fill(); }
    if (noLine('lnHints')) { g2.globalAlpha = 1; softArc(g2, s.x, s.y, R * 1.6 + 6, left, S.frozen ? '210,100%,83%' : '0,0%,100%', .55); g2.restore(); return; }   // v0.0.30 no outlines: the ring as beads of soft light
    g2.globalAlpha = .75; g2.strokeStyle = S.frozen ? 'rgba(170,210,255,.9)' : 'rgba(255,255,255,.7)'; g2.lineWidth = 2; g2.beginPath(); g2.arc(s.x, s.y, R * 1.6 + 6, -1.5708, -1.5708 + TAU * left); g2.stroke(); g2.restore(); };
  return C; }
