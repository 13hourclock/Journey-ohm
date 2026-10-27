// ZOOM LAYERS (world track, PLAN_REAL_PLANET step 2 finish): the scale layers as ONE ordered stack - planet -> star system -> galaxy -
// that the later layered-zoom work (molecules / cells / ohm insides below, galaxy clusters / the universe above) extends by adding
// entries with K.add(def), never by rewriting the planet / system / galaxy code. The zoom itself (zoom.js, view.js) is untouched:
// this only reads cam.z.
// A layer def: { id, depth (the zoom depth it is the focus at), weight(z) (0..1, how much you are IN it; all weights sum to 1),
//   sum() ({ heal, jam, n }: what it passes UP), lean(parentSum) (what it takes DOWN), voices(t, w) (its own sound at weight w),
//   hit(x, y) / play(hit, vel) (tap / strum it as an instrument) }.
// His words:
//   "Ohms modulate areas and planets modulate galaxies" (10:00 PM Oct 24, WV:1349), "the same direction both ways" (12:00 AM Oct 25):
//     UP: a system's planets (their heal / jam, from the ohms on them) become its star's record in the galaxy: healed systems shine
//     brighter and sing clearer in the galaxy bed, jamming ones pulse; the galaxy's harmony = the systems you have touched, together.
//     DOWN: a system you arrive in for the first time starts leaning toward the galaxy's harmony (its planets' starting heal, which
//     feeds their Q41 note lean); the star already gives its planets their om interval + tempo (galaxy.js / system.js).
//   "You should be able to play space systems and other scale systems as instruments." (10:39 PM Oct 24, WV:1393): in space one finger
//     plays the layer you are in - tap a planet = its home note (bigger lower, system.js register), the star = its system's om, drag
//     across them = a strum; in the galaxy, tap a star = its system's om. Two fingers still zoom / aim / land exactly as before.
//   Sound "splitting into its parts as you go in and blending as you go out" (the approved layered zoom): in a system you hear each
//     planet (the space chord); pinching out its planets fold into one voice per system - the systems nearest your view; further out
//     the whole galaxy blends into one bed on the home om. Going back in splits them again. Ohms keep their own sound; they live on
//     planets and can travel with you to any system.
// Not here (open, question 341): B.canAdvance / discord gating the zoom up a layer.
// Every number is a PROPOSAL (W.zl.opts, dev panel).
import { noLine, softRing } from './soft.js';   // v0.0.30 lnHints: no outlines
import { cam } from './view.js';
import { makeRecipe } from './recipe.js';
import { smooth } from './planet.js';
import { createDive } from './dive.js';
export const ZL_OPTS = {
  on: true,      // the stack (off = step 2 as built: no galaxy bed, no layer play, no cross-layer leaning)
  up: 1,         // planets modulate their galaxy (star glow + bed level from its planets' heal / jam); 0 = off
  down: 1,       // the galaxy leans a system you arrive in for the first time (its planets' starting heal); 0 = off
  play: true,    // one finger plays the space layer you are in (tap / strum planets, the star, galaxy stars)
  split: true,   // the space chord folds into per-system voices as the galaxy comes in (off = the chord stays as before)
  bed: .5,       // galaxy bed level (x the space chord's level)
  hitPx: 26,     // how near a tap must be to a planet / star (px, at least)
};
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const fold = (f, lo = 48, hi = 96) => { while (f >= hi) f /= 2; while (f < lo) f *= 2; return f; };
export function createZoomLayers(W, sim, bus, music) {
  const S = W.system, G = W.galaxy, O = { ...ZL_OPTS };
  const K = W.zl = { opts: O, list: [], w: {}, harmony: .5, touched: new Set([0]), hits: [], heard: [], planetsHeard: 1 };
  K.add = def => { K.list.push(def); K.list.sort((a, b) => b.depth - a.depth); K.w[def.id] = 0; return def; };   // deepest (smallest) first
  K.get = id => K.list.find(d => d.id === id);
  K.weights = (z = cam.z) => { let left = 1; for (const d of K.list) { const w = left * clamp(d.weight(z)); K.w[d.id] = w; left -= w; } return K.w; };   // each layer takes its share of what the deeper ones leave
  K.focus = () => { let b = null; for (const d of K.list) if (!b || K.w[d.id] > K.w[b.id]) b = d; return b; };
  // ---- the three layers built so far ----
  const tp = { x: 0, y: 0 }, tq = { x: 0, y: 0 };
  K.add({ id: 'planet', depth: 0, weight: z => 1 - S.blendOf(z),   // the ground (ohms, terrain, jams): its sound + play are the rest of the app
    sum: () => { const p = S.planets[S.cur]; return p ? p.sum : { heal: .5, jam: 0, n: 0 }; } });
  K.add({ id: 'system', depth: -3, weight: z => 1 - G.amtOf(z),
    sum: () => { let h = 0, j = 0, n = 0; for (const p of S.planets) { h += p.sum.heal; j = Math.max(j, p.sum.jam); n += p.sum.n; } return { heal: S.planets.length ? h / S.planets.length : .5, jam: j, n }; },
    lean: gs => { const k = O.down * .4 * (gs.heal - .5); if (!k) return; for (const p of S.planets) { p.sum.heal = clamp(.5 + k); S.noteOf(p); } },
    hit: (x, y) => { const t = music.now(), sc = S.v.sc; let best = null, bd = 1e9;
      S.screen(0, 0, tq); const sr = Math.max(O.hitPx, S.starR * sc), ds = Math.hypot(x - tq.x, y - tq.y); if (ds < sr) { best = { kind: 'star', i: -1 }; bd = ds / sr; }
      for (const p of S.planets) { S.pos(p, t, tp); S.screen(tp.x, tp.y, tp); const r = Math.max(O.hitPx, p.r * sc), d = Math.hypot(x - tp.x, y - tp.y); if (d < r && d / r < bd) { bd = d / r; best = { kind: 'planet', i: p.i }; } }
      return best; },
    hz: h => { if (h.kind === 'star') return 2 * S.om; const p = S.planets[h.i], x = S.register(p.C); return p.note * 2 * Math.pow(2, Math.round(x)); } });
  K.add({ id: 'galaxy', depth: -5, weight: () => 1,
    sum: () => ({ heal: K.harmony, jam: 0, n: K.touched.size }),
    hit: (x, y) => { const sc = Math.pow(4, cam.z); let best = null, bd = 1e9; for (const s of G.stars) { G.screenOf(s.i, sc, G.cx || 0, G.cy || 0, tq); const d = Math.hypot(x - tq.x, y - tq.y); if (d < O.hitPx && d < bd) { bd = d; best = { kind: 'gstar', i: s.i }; } } return best; },
    hz: h => { const s = G.stars[h.i]; return 2 * (s.i === G.cur ? S.om : fold(S.om0 * s.ratio)); } });
  // ---- the ohm's insides (dive.js): voices -> partials -> wave, below the planet ----
  K.dive = createDive(W, sim, bus, music, K);
  // ---- UP: planets -> their star -> the galaxy (once a second) ----
  const glowOf = s => { s.glow = 1 + O.up * (.9 * (s.heal - .5) + .25 * s.jam); };
  K.up = () => { const s = G.stars[G.cur], m = K.get('system').sum(); if (!s) return; s.heal = m.heal; s.jam = m.jam; s.n = m.n; glowOf(s); K.touched.add(G.cur);
    let h = 0; for (const i of K.touched) { const q = G.stars[i]; h += q && q.heal != null ? q.heal : .5; } K.harmony = h / K.touched.size; };
  // ---- DOWN: galaxy -> a system you arrive in for the first time (galaxy.js calls this after building it) ----
  G.onFresh = () => { if (O.on && O.down) K.get('system').lean(K.get('galaxy').sum()); };
  // ---- the sound of each layer: split going in, blended going out ----
  const rec = makeRecipe(7006, { name: 'galaxy bed' }); Object.assign(rec.synth, { family: 'eADD' });
  Object.assign(rec.synth.genes, { att: 1, dec: .6, sus: .9, rel: 1.4, cut: .3, reso: .05, fenv: .04, penv: .2, lfoR: .05, lfoP: .02, lfoF: .2, lfoA: .25, detune: .3, sat: .03, noise: .04, perc: 0, addTilt: .55, addSpread: .35, engMix: .05 });
  rec.mix = { modal: 0, synth: 1 }; rec.fx = []; rec.mods = []; rec.send = .7;
  const pr = makeRecipe(7007, { name: 'space bell' }); Object.assign(pr.synth, { family: 'eADD' });
  Object.assign(pr.synth.genes, { att: 0, dec: .55, sus: .15, rel: .9, cut: .55, reso: .08, fenv: .2, penv: .1, lfoR: .1, lfoP: .01, lfoF: .1, lfoA: .1, detune: .15, sat: .05, noise: .01, perc: .5, addTilt: .4, addSpread: .2, engMix: .1 });
  pr.mix = { modal: .55, synth: .45 }; pr.fx = []; pr.mods = []; pr.send = .5;
  const NB = 4, BV = [], bs = []; for (let i = 0; i < NB; i++) { BV.push(sim.add({ id: 140 + i, scale: 'world', recipe: rec.id, hue: 0 })); bs.push({ on: false, hz: 0, g: 0 }); }   // 3 nearest systems + the whole-galaxy bed
  const PV = [sim.add({ id: 144, scale: 'world', recipe: pr.id, hue: 0 }), sim.add({ id: 145, scale: 'world', recipe: pr.id, hue: 0 })]; let pv = 0;
  const voice = (i, hz, g) => { const v = BV[i], st = bs[i];
    if (g < .004) { if (st.on) { bus.note({ src: v, kind: 'release' }); st.on = false; } return; }
    if (!st.on || Math.abs(st.hz / hz - 1) > .003) { if (st.on) bus.note({ src: v, kind: 'release' }); bus.note({ src: v, kind: 'sustain', deg: 0, oct: 0, f: hz, vel: .5, sustain: 36000, gainK: g / .16 }); st.on = true; st.hz = hz; st.g = g; return; }
    if (Math.abs(st.g - g) > .003) { bus.note({ src: v, kind: 'level', gain: g }); st.g = g; } };
  const near = []; let nextT = 0, upT = 0;
  K.nearest = (k = 3) => { const q = G.stars[G.target != null ? G.target : G.cur], vx = q.x - G.eo.x, vy = q.y - G.eo.y; near.length = 0;   // the systems nearest the middle of your view
    for (const s of G.stars) { const d = Math.hypot(s.x - vx, s.y - vy); if (near.length < k || d < near[near.length - 1].d) { near.push({ s, d }); near.sort((a, b) => a.d - b.d); if (near.length > k) near.pop(); } } return near; };
  K.sound = () => { const w = K.w, gal = w.galaxy || 0, A = S.aMax * Math.pow(4, cam.z), far = smooth((4 - A) / 3), base = S.opts.chord * .16;
    K.planetsHeard = O.on && O.split ? 1 - gal : 1; K.heard.length = 0;
    const lv = O.on ? base * O.bed * gal : 0;
    if (lv > .002 && G.stars.length) { const L = K.nearest(3), sw = L.reduce((a, e) => a + Math.exp(-e.d / (8 * S.aMax)), 0) || 1;
      L.forEach((e, i) => { const s = e.s, hz = 2 * (s.i === G.cur ? S.om : fold(S.om0 * s.ratio)), lean = .6 + .8 * (O.up ? (s.heal != null ? s.heal : .5) : .5), g = lv * (1 - far) * lean * Math.exp(-e.d / (8 * S.aMax)) / sw; voice(i, hz, g); if (g > .004) K.heard.push(s.i); });
      voice(3, S.om0, lv * far * (.6 + .8 * K.harmony)); }
    else for (let i = 0; i < NB; i++) voice(i, 100, 0); };
  // ---- play the layer you are in (input.js calls press / drag for a one-finger touch in deep space) ----
  let last = null;
  K.at = (x, y) => { let f = null; for (const d of K.list) if (d.hit && (!f || K.w[d.id] > K.w[f.id])) f = d; if (!O.on || !O.play || !f) return null; /* the playable layer you are most in */ const h = f.hit(x, y); if (h) h.layer = f.id; return h; };
  K.play = (h, vel = .7) => { if (!h) return false; const f = K.get(h.layer), hz = f.hz(h); if (!(hz > 0)) return false;
    const src = PV[pv = (pv + 1) % PV.length]; bus.note({ src, kind: 'note', deg: 0, oct: 0, f: hz, vel: Math.min(1, vel), pos: .3, dur: h.kind === 'planet' ? 1.6 : 2.4 });
    K.hits.push({ ...h, t: performance.now() }); if (K.hits.length > 12) K.hits.shift(); bus.post({ type: 'layer.play', layer: h.layer, kind: h.kind, i: h.i, f: hz }); return true; };
  K.press = (x, y, vel) => { last = K.at(x, y); return K.play(last, vel); };
  K.drag = (x, y, vel) => { const h = K.at(x, y); if (h && (!last || h.kind !== last.kind || h.i !== last.i)) { last = h; return K.play(h, vel); } if (!h) last = null; return false; };
  K.tick = dt => { K.dive.tick(dt); if (!O.on) { K.planetsHeard = 1; for (let i = 0; i < NB; i++) voice(i, 100, 0); return; } K.weights(); const t = music.now();
    if (t >= upT) { upT = t + 1; K.up(); const post = (k, v) => { const g = sim.sig.global; if (g && g[k] != null && Math.abs(g[k] - v) < 4e-3) return; bus.ctl('global', k, v); };
      post('galaxy.harmony', K.harmony); post('zoom.planet', K.w.planet); post('zoom.system', K.w.system); post('zoom.galaxy', K.w.galaxy); }
    if (t >= nextT) { nextT = t + .25; K.sound(); } };
  // ---- a ring where you played (render.js drawSpace calls this last) ----
  K.draw = (c, now = performance.now()) => { if (!K.hits.length) return; const t = music.now(), sc = S.v.sc, gsc = Math.pow(4, cam.z); c.lineWidth = 1.5;
    for (const h of K.hits) { const a = 1 - (now - h.t) / 700; if (a <= 0) continue; let x, y, r;
      if (h.kind === 'star') { S.screen(0, 0, tp); x = tp.x; y = tp.y; r = Math.max(8, S.starR * sc); }
      else if (h.kind === 'planet') { const p = S.planets[h.i]; if (!p) continue; S.pos(p, t, tp); S.screen(tp.x, tp.y, tp); x = tp.x; y = tp.y; r = Math.max(6, p.r * sc); }
      else { G.screenOf(h.i, gsc, G.cx || 0, G.cy || 0, tp); x = tp.x; y = tp.y; r = 6; }
      if (noLine('lnHints')) { c.globalAlpha = 1; softRing(c, x, y, r * (1.2 + (1 - a) * .8), Math.max(2.5, r * .2), '50,70%,82%', a * .8); continue; }   // v0.0.30 lnHints: where you played = a soft ring of light
      c.globalAlpha = a * .8; c.strokeStyle = 'hsl(50,90%,82%)'; c.beginPath(); c.arc(x, y, r * (1.2 + (1 - a) * .8), 0, 6.2832); c.stroke(); }
    c.globalAlpha = 1; while (K.hits.length && now - K.hits[0].t > 700) K.hits.shift(); };
  K.weights();
  return K;
}
