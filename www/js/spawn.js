// SYSTEMS: THE PLAIN SPIRAL MAKES A QUICK RANDOM OHM THAT FITS THE ENVIRONMENT (Wilbow 11:13 PM Oct 22: "The plain spiral should
// generate a quick randomized ohm which fits the environment"; audit A7). Draw a spiral on bare ground: an ohm hatches at its centre
// the moment you lift (no wait). Randomized WIDELY: every sound engine can come up (all nine, incl. the noise resonator), sometimes a
// blend of two, wide filter / drive / noise; the environment only LEANS it (fudged: "slight" = pick the best of 4 random candidates
// against the place's brightness / roughness streams, never a fixed preset). Deterministic from the seed, so a saved spiral ohm
// rebuilds the same sound on relaunch. Undo removes it, redo brings it back (undo.js).
import { recipes, makeRecipe } from './recipe.js';
import { ENGINES } from './synth.js';
import { rng, newSeed } from './rng.js';
import { analyze, isSpiral } from './stroke.js';
export const SPAWN_OPTS = { on: true, cands: 4, lean: .25 };
// widen one recipe's sound from its own seed (separate rng stream so the body / modal side of the recipe stays as made)
export function widen(rec, seed) { const r = rng((seed * 13 + 5) >>> 0), g = rec.synth.genes;
  for (const e of ENGINES) g[e] = r() * .15; const e1 = Math.floor(r() * ENGINES.length); g[ENGINES[e1]] = .6 + r() * .4;
  if (r() < .4) { let e2 = Math.floor(r() * ENGINES.length); if (e2 === e1) e2 = (e2 + 1) % ENGINES.length; g[ENGINES[e2]] = .35 + r() * .4; }
  g.cut = .1 + r() * .85; g.sat = r() * r(); g.noise = r() < .25 ? .3 + r() * .5 : r() * .25; g.fmI = r(); g.inharm = r() * r(); g.detune = r() * .6; g.formant = r(); g.complexity = r();
  g.att = r() * r() * .7; g.dec = r(); g.sus = .15 + r() * .75; g.rel = .2 + r() * .7; g.perc = r() < .15 ? .75 + r() * .2 : r() * .45;
  const ms = .25 + r() * .6, mb = .15 + r() * .8; if (!rec.inst) { rec.modal.p.bright = mb; rec.mix.synth = ms; } rec.hue = r() * 360; return rec; }   // a palette ohm keeps its row's mix + modal body (v0.0.18 bells fix: a lowered synth level left the modal ring on top); same rng draws either way
// how a candidate sounds on the place's scales (0 dark/rough .. 1 bright/smooth), compared with the place's streams
export const timbreOf = rec => { const g = rec.synth.genes; return { timbre: .5 * g.cut + .5 * (1 - Math.max(g.sat || 0, g.noise || 0)), bright: (rec.modal.p.bright - .15) / .8 }; };
export function pickSeed(place, r = Math.random, n = SPAWN_OPTS.cands, make) { let best = null, bw = -1, tw = 0; const cs = [];
  for (let i = 0; i < n; i++) { const seed = (r() * 4294967296) >>> 0, t = timbreOf(make(seed)); const d = (place.timbre == null ? 0 : Math.abs(t.timbre - place.timbre)) + (place.bright == null ? 0 : Math.abs(t.bright - place.bright));
    const w = Math.exp(-d / SPAWN_OPTS.lean); cs.push({ seed, w }); tw += w; }
  let u = r() * tw; for (const c of cs) { u -= c.w; if (u <= 0) return c.seed; } return cs[cs.length - 1].seed; }   // weighted, not argmax: the place leans, never decides
export function createSpawn(sim, bus, undo, opts = {}) { const O = { ...SPAWN_OPTS, ...opts }, P = { opts: O, made: 0 };
  const place = () => { const g = sim.sig.global || {}; return { timbre: g['place.timbre'], bright: g['place.bright'] }; };
  // probe what each candidate seed's widened recipe would sound like (not registered)
  P.seedFor = (r = Math.random) => pickSeed(place(), r, O.cands, s => widen(makeRecipe(s, { add: false }), s));
  // the spiral: called from input.js with the stroke's points (screen px) and the world point of its centre
  P.stroke = (pts, wx, wy) => { if (!O.on) return null; const a = analyze(pts); if (!isSpiral(a)) return null; return P.make(wx, wy, a); };
  P.make = (x, y, a) => { const seed = P.seedFor(), o = sim.spawn(x, y, seed, 'spiral'); if (!o) return null; P.made++;
    if (undo) undo.push({ label: 'spawn', x, y, undo: () => sim.remove(o), redo: () => sim.unremove(o) }); bus.post({ type: 'spawn.spiral', src: o, turns: a ? a.turns : 0 }); return o; };
  // a spiral-born ohm (also on restore): widen its recipe from its seed before it sounds
  P.born = o => { if (o.born !== 'spiral') return; const rec = recipes.get(o.recipe); if (!rec || rec.widened) return; widen(rec, o.seed); rec.widened = 1; o.hue = rec.hue; bus.post({ type: 'recipe', src: o, rec }); };
  sim.onBorn = P.born; return P; }
export { newSeed };
