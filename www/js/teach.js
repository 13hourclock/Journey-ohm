// TEACHING + OFFSPRING (PLAN_SYSTEMS 12; Wilbow t101 "Creatures can learn from eachother when prompted so that they harmonize and match
// rythm. If introducing 2 that are out of key they cant breed.", t121 "loops should synchronize after ... communication. They should
// still have their original dna, but their offspring will have the changed dna as if epigenetics are at play", t141 "Each creature also
// inherits partial note data"; NEW_ENGINE R1.3 / R1.5 / R1.29: deterministic, no mutation). The old game's design, rebuilt here:
//   TEACH LINE: a one-finger stroke that STARTS in ohm A's halo (just outside its touch circle, opts.halo px) and ENDS on ohm B draws a
//     filament A -> B: B learns A's home key (so they harmonise), A's tempo / tempo-follow and A's strongest rhythm + melody patterns
//     (so their loops match). How much one lesson moves B is B's LEARN gene (from its seed): some ohms need two or three lessons.
//     Undoable (3-finger tap). What B learned lives in an EPIGENETIC layer o.epi; its recipe / seed / genes are never changed.
//   BREEDING: two ohms that keep jamming together (autojam pair, presence >= jamK) for `bars` bars, with a per-pair cooldown and a
//     population cap (a normal count). Out of key (home keys not a unison / 4th / 5th apart, or tempos not 1:1 / 2:1 within 3%) = no
//     child: they flicker and push apart. A child's recipe is a seeded crossover of the parents' recipes (each gene whole from one
//     parent, no mutation), its instrument is instruments.js breedInst, its home key / tempo are what the parents LEARNED (epi) when
//     they learned something (else their own), and it inherits note data: the parents' strongest patterns, and a phrase made of whole
//     sections taken alternately from each parent's strongest phrase.
import { rng } from './rng.js';
import { bodyGenes } from './genes.js';
import { recipes, toJSON, fromJSON } from './recipe.js';
import { breedInst } from './instruments.js';
export const TEACH_OPTS = { on: true, halo: 30, breed: true, bars: 8, jamK: .45, cool: 64, cap: 12, keys: [0, 5, 7], tempoTol: .03, refuse: true, patterns: 2, straight: 1.6, duet: true, fit: true, bodyX: true };
export const keyIv = (a, b) => (((b - a) % 12) + 12) % 12;
// in key = home keys a unison / 4th / 5th apart AND tempos 1:1, 2:1 or 1:2 (within tol). Unknown keys never block.
export function compatible(ka, kb, ta = 1, tb = 1, O = TEACH_OPTS) { if (ka == null || kb == null) return true; if (!O.keys.includes(keyIv(ka, kb))) return false;
  const r = (ta || 1) / (tb || 1); return [1, 2, .5].some(x => Math.abs(r / x - 1) <= O.tempoTol); }
// one seed per (pair, n-th child): order of the parents does not matter
export const pairSeed = (sa, sb, n = 0) => { const lo = Math.min(sa >>> 0, sb >>> 0), hi = Math.max(sa >>> 0, sb >>> 0); return (Math.imul(lo ^ 0x9e3779b9, 2654435761) ^ Math.imul(hi + 0x7f4a7c15, 2246822519) ^ Math.imul(n + 1, 3266489917)) >>> 0 || 1; };
export const learnGene = seed => Math.min(1, .35 + .9 * rng(((seed >>> 0) ^ 0x7ea0c4) >>> 0)());   // how much of a lesson sticks: ~1 in 4 learn in one, the rest need 2-3
const cl = o => JSON.parse(JSON.stringify(o));
// child recipe (plain JSON, fromJSON-able): every gene / part whole from one parent by a seeded coin; ea / eb = what each parent is NOW
// (its home key + tempo after what it learned). Deterministic: same parents + seed = the same child.
export function breedRecipe(A, B, seed, ea = {}, eb = {}) { const r = rng(seed), a = toJSON(A), b = toJSON(B), coin = () => r() < .5 ? a : b;
  const c = cl(coin()); c.seed = seed; c.name = 'child ' + seed; delete c.widened; delete c.mixRow;   // v0.0.18: the child's row sets its own modal body + mix (recipe.js fromJSON)
  c.parents = [a.seed, b.seed];
  const ga = a.synth.genes || {}, gb = b.synth.genes || {}, g = {}; for (const k of new Set([...Object.keys(ga), ...Object.keys(gb)])) { const x = r() < .5 ? ga : gb; g[k] = x[k] != null ? x[k] : (ga[k] != null ? ga[k] : gb[k]); }
  c.synth = Object.assign(cl(c.synth), { genes: g, family: coin().synth.family });
  c.modal = { fam: cl(coin().modal.fam), p: {} }; for (const k of Object.keys(a.modal.p)) c.modal.p[k] = (r() < .5 ? a : b).modal.p[k];
  c.mix = {}; for (const k of Object.keys(a.mix)) c.mix[k] = (r() < .5 ? a : b).mix[k];
  c.fx = cl(coin().fx); c.lfo = cl(coin().lfo); c.menv = cl(coin().menv); c.send = coin().send;
  const h1 = a.hue * Math.PI / 180, h2 = b.hue * Math.PI / 180; c.hue = ((Math.atan2(Math.sin(h1) + Math.sin(h2), Math.cos(h1) + Math.cos(h2)) * 180 / Math.PI) + 360) % 360;
  if (a.inst || b.inst) c.inst = breedInst(a.inst, b.inst, seed);
  const pk = r() < .5, ka = pk ? ea.key : eb.key, kb = pk ? eb.key : ea.key; if (ka != null) c.home = ka; else if (kb != null) c.home = kb; else delete c.home;
  const bp = [ea.bpm, eb.bpm].filter(x => x > 0); if (bp.length) c.bpm = bp.reduce((s, x) => s + x, 0) / bp.length; else delete c.bpm;
  return c; }
// phrase crossover at section boundaries: sections taken alternately from each parent (first parent by seed); whole sections only
// BODY GENES FROM THE PARENTS (the old game's child = crossover of the parents' genomes, creature.js C.child; no mutation): the body
// genes that are not set by the (bred) sound recipe each come whole from one parent, a per-gene coin from the child's seed. Size, shape
// family and damping follow the bred recipe (genes.js). soft keeps the recipe's damping part + the chosen parent's own part.
export const BODY_X = ['lobes', 'lobePh', 'soft', 'float', 'calm', 'social', 'hear', 'eyes', 'legs'];
export function inheritBody(ga, gb, seed, child, damp = { a: .5, b: .5, c: .5 }) { const r = rng((seed ^ 0xb0d1) >>> 0), x = {};
  for (const k of BODY_X) { const pa = r() < .5, P = pa ? ga : gb; if (!P || P[k] === undefined) continue;
    if (k === 'soft') x.soft = Math.max(0, Math.min(1, .35 + (1 - damp.c) * .5 + (P.soft - .35 - (1 - (pa ? damp.a : damp.b)) * .5)));
    else if (k === 'lobes') x.lobes = child && !child.lobes ? 0 : (P.lobes || (child ? child.lobes : 0));   // only a bar-leaning body has lobes
    else if (k === 'legs') x.legs = child && child.membraneBody ? 0 : P.legs;   // a drum-belly body has no legs
    else x[k] = P[k]; }
  return x; }
export function crossPhrase(na, nb, seed, secBeats = 16, fit = true) { const first = rng(seed ^ 0x5eed)() < .5, out = [], len = Math.max(...na.map(n => n.b), ...nb.map(n => n.b), 0);
  for (let s = 0; s * secBeats <= len; s++) { const src = (s % 2 === 0) === first ? na : nb; for (const n of src) if (n.b >= s * secBeats && n.b < (s + 1) * secBeats) out.push({ ...n }); }
  out.sort((x, y) => x.b - y.b); return fit ? fitSeams(out, secBeats) : out; }
// SEAMS FITTED (the old game's breeding, mind.js: deterministic, not mutation): a seam note on a strong beat (the last note before a
// section join, the first note after it) moves to the nearest tonic chord tone; each inner section ends on a stable degree or the
// dominant (half cadence); the whole phrase ends on home (authentic cadence). Degrees are 7-step (0 = home, 2/4 = chord tones, 4 = dominant).
const md7 = d => ((d % 7) + 7) % 7, isCT = d => md7(d) === 0 || md7(d) === 2 || md7(d) === 4;
const nearestDeg = (x, ok) => { for (let dd = 0; dd <= 7; dd++) for (const sg of [-1, 1]) { const y = x + sg * dd; if (ok(y)) return y; } return x; };
export function fitSeams(notes, secBeats = 16) { const out = notes.map(n => ({ ...n })); if (out.length < 2) return out; out.fitted = 0;
  const fix = (n, ok) => { if (!n || n.d == null || ok(n.d)) return; n.d = nearestDeg(n.d, ok); out.fitted++; };
  const strong = n => Math.abs(n.b - Math.round(n.b)) < 1e-6 && Math.round(n.b) % 4 === 0, last = out[out.length - 1];
  const secs = new Map(); for (const n of out) { const k = Math.floor(n.b / secBeats); if (!secs.has(k)) secs.set(k, []); secs.get(k).push(n); }
  const ks = [...secs.keys()].sort((a, b) => a - b);
  for (let i = 0; i < ks.length; i++) { const S = secs.get(ks[i]), first = S[0], end = S[S.length - 1];
    if (i > 0 && strong(first)) fix(first, isCT);                                   // seam note after a join
    if (i < ks.length - 1) { if (strong(end)) fix(end, isCT); fix(end, d => isCT(d) || md7(d) === 4); } }   // seam note before a join; half cadence
  fix(last, d => md7(d) === 0);                                                      // authentic cadence
  return out; }
export function createTeach(sim, bus, music, harmony, autojam, brain, undo, sys, opts = {}) {
  const O = { ...TEACH_OPTS, ...opts }, T = { opts: O, pairs: new Map(), cool: new Map(), kids: new Map(), waves: [], taught: 0, born: 0, refused: 0, lastBar: -1 };
  const live = () => sim.ohms.filter(o => o.scale === 'ohm' && !o.dead && !o.parked), pk = (a, b) => a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id, now = () => performance.now();
  // an ohm's home key: what it learned (epi) > what it was born with (a bred recipe's home) > the engine's own (music.js, from its seed).
  const base = harmony && harmony.home; if (harmony && base) harmony.home = s => { if (!s) return null; if (s.epi && s.epi.key != null) return s.epi.key;
    const rec = s.recipe != null ? recipes.get(s.recipe) : null; if (rec && typeof rec.home === 'number') return rec.home;
    return base(s); };
  T.keyOf = o => harmony && harmony.home ? harmony.home(o) : null;
  T.bpmOf = o => music.bpmFor ? music.bpmFor(o) : music.bpm;
  const tempo = (o, src) => { const own = music.own, fol = music.follow, was = { own: own && own.has(o.id) ? own.get(o.id) : undefined, fol: fol && fol.has(o.id) ? fol.get(o.id) : undefined };
    if (own) { if (own.has(src.id)) own.set(o.id, own.get(src.id)); else own.delete(o.id); } if (fol) { if (fol.has(src.id)) fol.set(o.id, fol.get(src.id)); else fol.delete(o.id); } return was; };
  const untempo = (o, w) => { if (music.own) { if (w.own === undefined) music.own.delete(o.id); else music.own.set(o.id, w.own); } if (music.follow) { if (w.fol === undefined) music.follow.delete(o.id); else music.follow.set(o.id, w.fol); } };
  const dropEntry = (o, e) => { if (!brain || !o.brain) return; for (const id in o.brain.e) if (o.brain.e[id] === e) { delete o.brain.e[id]; brain.dirty = true; } };
  // one lesson A -> B
  T.teach = (A, B, quiet) => { if (!O.on || !A || !B || A === B || A.dead || B.dead) return null; const prev = B.epi ? cl(B.epi) : null, e = B.epi || (B.epi = { acc: 0 }), rate = learnGene(B.seed || B.id) * (B.learnK > 0 ? B.learnK : 1);   /* learnK: personality learning speed (rare.js, Wilbow 4A) */
    e.acc = Math.min(1, (e.acc || 0) + rate); e.from = A.id; e.n = (e.n || 0) + 1; const added = []; let was = null;
    if (brain && brain.list) { const l = brain.list(A, 'pattern').sort((x, y) => y.strength - x.strength).slice(0, O.patterns); for (const p of l) { const had = brain.get(B, 'pattern', p.key); const en = brain.remember(B, 'pattern', p.key, cl(p.data), p.strength * rate); if (!had) added.push(en); } }
    if (e.acc >= 1) { e.key = T.keyOf(A); was = tempo(B, A); e.bpm = T.bpmOf(A); }
    T.taught++; T.waves.push({ a: A, b: B, t: now(), learned: e.acc >= 1 }); bus.post({ type: 'teach', src: A, to: B, acc: e.acc, key: e.key });
    if (!quiet && undo) undo.push({ label: 'teach', undo: () => { B.epi = prev; for (const en of added) dropEntry(B, en); if (was) untempo(B, was); }, redo: () => T.teach(A, B, true) });
    return e; };
  // the teach line from the gesture router: pts in screen px; returns true when it was one
  // which ohm's halo (just outside its touch circle) a screen point is in - looked up when the finger goes DOWN (the stroke stirs ohms)
  T.haloAt = (x, y) => { if (!O.on || !sys.toS) return null; let A = null, bd = 1e9; for (const o of live()) { if (!o.g) continue; const q = sys.toS(o.body.x, o.body.y), R = Math.max(36, o.g.r * q.s * 1.15), d = Math.hypot(x - q.x, y - q.y); if (d >= R && d <= R + O.halo && d - R < bd) { bd = d - R; A = o; } } return A; };
  T.stroke = (pts, A0) => { if (!O.on || !pts || pts.length < 3 || !sys.toS) return false; const s = pts[0], z = pts[pts.length - 1], A = A0 && !A0.dead ? A0 : T.haloAt(s[0], s[1]);
    if (!A) return false; let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (L > O.straight * Math.hypot(z[0] - s[0], z[1] - s[1])) return false;   // a line, not a loop / spiral / scribble
    const B = sys.ohmAt(z[0], z[1]); if (!B || B === A) return false; T.teach(A, B); return true; };
  // incompatible: a flicker and a push apart
  T.refuse = (a, b) => { T.refused++; const dx = b.body.x - a.body.x, d = Math.abs(dx) || 1, nx = dx / d; a.body.vx -= nx * 2.5; b.body.vx += nx * 2.5; a.glow = b.glow = 1.4; a.flicker = b.flicker = now();
    if (sim.kick) { sim.kick(a, nx, 0, 1.2, false); sim.kick(b, -nx, 0, 1.2, false); } T.waves.push({ a, b, t: now(), clash: true }); if (O.duet) T.duet(a, b); bus.post({ type: 'breed.refuse', src: a, to: b }); };
  // the old game's ROUGH DISSONANT DUET (surface.js Sf.clash): each ohm sounds its own home note with a partial 6% above it, the second
  // ohm 3% sharp, short (.6 s) and quiet, through its own voice. At most once per pair every 2 s.
  T.clashT = new Map(); T.duets = 0;
  T.duet = (a, b) => { const k = pk(a, b), t = now(); if (t - (T.clashT.get(k) || -1e9) < 2000) return; T.clashT.set(k, t); if (!bus.note || !music.tonicHz) return; T.duets++;
    const hzOf = o => { const h = T.keyOf(o); return music.tonicHz * Math.pow(2, ((((h == null ? 0 : h) - (music.key || 0)) % 12 + 12) % 12) / 12); };
    for (const [o, f] of [[a, hzOf(a)], [b, hzOf(b) * 1.03]]) for (const [ff, v] of [[f, .35], [f * 1.06, .28]]) bus.note({ src: o, kind: 'note', f: ff, vel: v, dur: .6, gainK: .6, clash: 1 }); };
  // a child between two parents (deterministic from the pair and how many children it already had)
  T.breed = (a, b) => { const ra = recipes.get(a.recipe), rb = recipes.get(b.recipe); if (!ra || !rb) return null; const k = pk(a, b), n = T.kids.get(k) || 0, seed = pairSeed(a.seed, b.seed, n);
    const cj = breedRecipe(ra, rb, seed, { key: T.keyOf(a), bpm: a.epi && a.epi.bpm }, { key: T.keyOf(b), bpm: b.epi && b.epi.bpm });
    const o = sim.spawn((a.body.x + b.body.x) / 2, Math.min(a.body.y, b.body.y) - .4, seed, 'breed'); if (!o) return null; T.kids.set(k, n + 1);
    const rec = fromJSON(cj); if (O.bodyX && a.g && b.g) { const ch = bodyGenes(seed, rec); ch.membraneBody = rec.modal.fam.membrane > .45; o.gx = inheritBody(a.g, b.g, seed, ch, { a: ra.modal.p.damp, b: rb.modal.p.damp, c: rec.modal.p.damp }); } bus.post({ type: 'recipe', src: o, rec }); o.parents = [a.id, b.id]; if (rec.bpm && music.own) music.own.set(o.id, rec.bpm); T.inherit(a, b, o, seed);
    T.born++; T.waves.push({ a, b, c: o, t: now(), birth: true }); bus.post({ type: 'breed', src: o, a, b, seed }); return o; };
  T.inherit = (a, b, o, seed) => { if (!brain || !brain.list) return; const top = x => brain.list(x, 'pattern').sort((p, q) => q.strength - p.strength), la = top(a), lb = top(b);
    for (let i = 0; i < 2; i++) for (const p of [la[i], lb[i]]) if (p) brain.remember(o, 'pattern', p.key, cl(p.data), Math.min(1, p.strength * .5));
    const ph = x => brain.list(x, 'phrase').sort((p, q) => q.strength - p.strength)[0], pa = ph(a), pb = ph(b);
    if ((pa || pb) && brain.phraseNotes && brain.phrase) { const na = brain.phraseNotes(pa), nb = brain.phraseNotes(pb), sb = ((pa || pb).data.secBars || 4) * 4, notes = crossPhrase(na, nb, seed, sb, O.fit); if (notes.length >= 4) brain.phrase(o, notes, .5); } };
  // once per bar: pairs that keep jamming become parents (or refuse each other)
  T.bar = () => { const bar = Math.floor(music.beat() / 4); if (bar === T.lastBar) return; T.lastBar = bar; if (!O.on || !O.breed) return; const seen = new Set();
    for (const P of autojam.jams || []) { const a = P.a, b = P.b; if (!a || !b || !a.body || !b.body || a.dead || b.dead || (P.k || 0) < O.jamK) continue; const k = pk(a, b); seen.add(k); const n = (T.pairs.get(k) || 0) + 1; T.pairs.set(k, n);
      if (n < O.bars || (T.cool.get(k) || -1e9) > bar) continue; T.cool.set(k, bar + O.cool); T.pairs.set(k, 0);
      if (!compatible(T.keyOf(a), T.keyOf(b), T.bpmOf(a), T.bpmOf(b), O)) { if (O.refuse) T.refuse(a, b); continue; }
      if (live().length >= O.cap) continue; T.breed(a, b); }
    for (const k of [...T.pairs.keys()]) if (!seen.has(k)) T.pairs.delete(k); };
  T.tick = () => { T.bar(); };
  // the filament: a line A -> B with a pulse running along it (the old 'event wave'); a birth: both parents -> the child
  T.draw = (g, toS) => { const t = now(); T.waves = T.waves.filter(w => t - w.t < (w.clash ? 1000 : 1800)); for (const w of T.waves) { if (w.clash) { if (!w.a.body || !w.b.body) continue; const s = toS(w.a.body.x, w.a.body.y), e = toS(w.b.body.x, w.b.body.y), A = 1 - (t - w.t) / 1000;
      g.globalAlpha = A * (.3 + .25 * Math.sin(t * .04)); g.strokeStyle = 'rgb(255,80,60)'; g.lineWidth = 1.5; g.beginPath(); for (let k = 0; k <= 8; k++) { const u = k / 8, x = s.x + (e.x - s.x) * u + (k % 2 ? 6 : -6), y = s.y + (e.y - s.y) * u + (k % 2 ? -6 : 6); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); continue; } const k = (t - w.t) / 1800, ends = w.birth ? [[w.a, w.c], [w.b, w.c]] : [[w.a, w.b]];
    for (const [p, q] of ends) { if (!p.body || !q.body) continue; const s = toS(p.body.x, p.body.y), e = toS(q.body.x, q.body.y); g.globalAlpha = (1 - k) * .8; g.strokeStyle = w.birth ? '#ffe9a8' : w.learned ? '#bff' : '#cde'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(e.x, e.y); g.stroke(); const f = Math.min(1, k * 1.6); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x + (e.x - s.x) * f, s.y + (e.y - s.y) * f, 4 + 3 * (1 - k), 0, 6.283); g.fill(); } } g.globalAlpha = 1; };
  T.save = () => ({ epi: live().filter(o => o.epi).map(o => [o.id, o.epi]), par: live().filter(o => o.parents).map(o => [o.id, o.parents]), gx: live().filter(o => o.gx).map(o => [o.id, o.gx]), cool: [...T.cool], kids: [...T.kids], own: live().filter(o => music.own && music.own.has(o.id)).map(o => [o.id, music.own.get(o.id), music.follow && music.follow.get(o.id)]) });
  T.load = d => { for (const [id, e] of d.epi || []) { const o = sim.byId.get(id); if (o) o.epi = e; } for (const [id, p] of d.par || []) { const o = sim.byId.get(id); if (o) o.parents = p; }
    for (const [id, x] of d.gx || []) { const o = sim.byId.get(id); if (o && o.g) { o.gx = x; if (sim.regrow) sim.regrow(o); } }
    T.cool = new Map(d.cool || []); T.kids = new Map(d.kids || []); for (const [id, b, f] of d.own || []) { if (music.own) music.own.set(id, b); if (f != null && music.follow) music.follow.set(id, f); } };
  return T; }
