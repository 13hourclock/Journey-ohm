// PLANET (world track, v0.0.9 terrain step 1): the home layer is the surface of a round, seamless planet.
// Pinch out past home: the ground ridgelines bend (render.js) until, one layer out, the home terrain closes into a ring = the planet.
// The home terrain is periodic around it (W.planet.C home-screen widths), so walking (W.walk) far enough comes back around.
// Rewritten for the new engine from the old planet.js idea (a seamless periodic heightfield around a circle); no ark, no start
// shore, no story. Everything below is a PROPOSAL and a toggle (W.opts / W.planet.mix):
//   hum (5b A, bigger is lower): a quiet held voice a few octaves under the om that fades in with the planet's size on screen.
//   5d C (one om vs the planet's own om, by context): two hum voices crossfaded by context - the shared om and the planet's own
//        note (an om overtone, octave folded; 41C: how strongly it leans depends on context).
//   5a C (context sets tempo across sizes): busyness, place mood, the planet's seed, your tapped tempo and the zoom level each post
//        a stream (matrix sources) and together pick the tempo ratio a size lands on, at the next bar (world.js applies it).
import { makeRecipe } from './recipe.js';
import { cam } from './view.js';
const OWN = [1, 3 / 2, 4 / 3, 5 / 4, 9 / 8, 5 / 3, 15 / 8];   // om overtones (folded) a planet's own note can lean to (41C, PROPOSAL)
const SNAP = [.5, 2 / 3, 3 / 4, 4 / 5, 1, 5 / 4, 4 / 3, 3 / 2, 2];   // tempo ratios that keep shared downbeats (SCALE_MUSIC 1.3)
const fold = (f, lo, hi) => { while (f >= hi) f /= 2; while (f < lo) f *= 2; return f; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export function createPlanet(W, sim, bus, music, hash) {
  const s = hash(W.seed, 0x91a7);
  const P = W.planet = { seed: s, C: 4 + (s % 6),                   // circumference in home-screen widths (seeded, PROPOSAL)
    ownR: OWN[(s >>> 8) % OWN.length], bend: 0, size: 0, own: 0, humHz: 0, busy: 0, mood: .5, lastTap: -1e9,
    mix: { busy: .7, mood: .35, seed: 1, tapped: .6, zoom: .5 },     // 5a C weights (PROPOSAL)
    hum: { oct: 1, level: .3 } };                                   // 5b A: octaves under the om, loudness (PROPOSAL)
  // bend 0 (flat home) .. 1 (round planet, one layer out). Only zooming OUT bends.
  P.bendOf = z => W.opts.planet ? smooth(-z) : 0;
  P.sizeOf = z => smooth((-z - .15) / .85) * smooth((z + 4) / 1.5);   // on screen as a planet: from just past home to ~4 layers out (render.js also sets bend / size per frame)
  bus.on('tempo.tap', () => { P.lastTap = music.now(); });
  // ---- 5a C: the tempo ratio a size lands on (log2 space, snapped to shared-downbeat ratios) ----
  P.tempoFor = L => { const M = P.mix, d = L.depth, t = music.now();
    let x = M.seed * Math.log2(L.tempo);                                      // the place's own seeded tempo lean
    x += M.zoom * (d < 0 ? -.5 : d > 0 ? .25 : 0) * Math.min(2, Math.abs(d)) / 2;   // the zoom level: bigger leans slower, tinier faster
    x += M.mood * (.5 - P.mood) * .6;                                         // calm places lean slower, restless ones faster
    x *= 1 - M.busy * P.busy;                                                 // a busy jam keeps its tempo steadier
    if (t - P.lastTap < 30) x *= 1 - M.tapped;                                // you tapped a tempo lately: sizes respect it more
    const r = Math.pow(2, x); let best = 1; for (const q of SNAP) if (Math.abs(Math.log2(q / r)) < Math.abs(Math.log2(best / r))) best = q; return best; };
  // ---- the hum: two world sources (shared om + the planet's own note), ordinary voices on the music clock ----
  const rec = makeRecipe(7003, { name: 'planet hum' });
  Object.assign(rec.synth, { family: 'eADD' }); Object.assign(rec.synth.genes, { att: .9, dec: .5, sus: .95, rel: .8, cut: .45, reso: .1, fenv: .1, penv: .5, lfoR: .05, lfoP: .03, lfoF: .2, lfoA: .15, detune: .3, sat: .15, noise: .03, perc: 0, addTilt: .35, addSpread: .3, engMix: .05 });
  rec.mix = { modal: 0, synth: 1 }; rec.fx = []; rec.mods = []; rec.send = .5;
  const V = [sim.add({ id: 103, scale: 'world', recipe: rec.id, hue: 0 }), sim.add({ id: 104, scale: 'world', recipe: rec.id, hue: 0 })];
  const st = [{ on: false, hz: 0, g: 0 }, { on: false, hz: 0, g: 0 }]; let nextT = 0;
  const voice = (i, hz, g) => { const v = V[i], S = st[i];
    if (g < .004) { if (S.on) { bus.note({ src: v, kind: 'release' }); S.on = false; } return; }
    if (!S.on || Math.abs(S.hz / hz - 1) > .003) { if (S.on) bus.note({ src: v, kind: 'release' }); bus.note({ src: v, kind: 'sustain', deg: 0, oct: 0, f: hz, vel: .6, sustain: 36000, gainK: g / .16 }); S.on = true; S.hz = hz; S.g = g; return; }
    if (Math.abs(S.g - g) > .003) { bus.note({ src: v, kind: 'level', gain: g }); S.g = g; } };
  P.tick = (dt, L, look) => { const t = music.now();
    P.bend = P.bendOf(cam.z); P.size = P.sizeOf(cam.z);   // on screen as a planet: from just past home to ~4 layers out
    P.busy += (clamp(look.rate / 4) - P.busy) * Math.min(1, dt / 4);
    P.mood = clamp(.6 * (1 - L.trip) + .4 * (W.healAt(0, 0) - .5) * 2);
    // 5d C: share of the planet's own note vs the shared om (calm, healed planets sing their own; busy jams share one om)
    P.own = clamp(.2 + .45 * P.mood - .45 * P.busy);
    if (t < nextT) return; nextT = t + .1;                          // level steps 10x a second (small steps, no zipper)
    const on = W.opts.planet && W.opts.hum, lv = on ? P.hum.level * P.size * .16 : 0, base = music.om / Math.pow(2, P.hum.oct);
    P.humHz = base;
    voice(0, base, lv * (1 - P.own)); voice(1, fold(base * P.ownR, base * .75, base * 1.5), lv * P.own * .8);
    const post = (k, v) => { const g = sim.sig.global; if (g[k] != null && Math.abs(g[k] - v) < 4e-3) return; bus.ctl('global', k, v); };
    post('music.busy', P.busy); post('place.mood', P.mood); post('planet.tempo', P.tempoFor(W.home) / 2); post('tempo.tapped', t - P.lastTap < 30 ? 1 : 0);
    post('world.size', clamp(-cam.z / 4)); post('planet.size', P.size); post('planet.own', P.own); };
  return P;
}
