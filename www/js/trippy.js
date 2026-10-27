// TRIPPY GATING (Wilbow 12:23 AM MDT Oct 26: "The trippy visuals are obscured for the beginning of the game"). ONE number, trippy 0..1,
// that the trippy layers multiply their strength by: render's per-frame state st.trippy (missing = 1 for old callers), which Visuals'
// look/ multiplies the kaleido veil and petals, the music colour as light and the sky bands by (look/ is Visuals'; not edited here), and the realism <-> trippy mix (world.look.trip, which the palette, the trippy tints and render's old kaleidoscope
// read). It is VISUAL only: the 'look.trip' control stream the sound reads is posted before this runs and is left as it was.
// A new game starts near 0 (opts.start) and it grows by one of three dev switches (Wilbow did not pick; all three are there to try):
//   trippyHarmony  grows with the harmony brought back (the harmony bank's earned total, systems.js): 1 - exp(-earned / harmE)
//   trippyTravel   grows with the furthest scale reached: ground 0, planet .35, star system .7, galaxy 1 (kept: never goes back)
//   trippyBoth     (DEFAULT) either opens it: 1 - (1 - harmony)(1 - travel)
// It eases toward its target (tau seconds), so nothing pops. Dev slider 'override' (-0.05 = off) pins it. ?trippy=x pins it too
// (benches / stills). Switch 'trippy' off = no gating (v0.0.28 look). Saved (part 'trippy'); an old save with no part starts from
// what it has already done (its earned harmony and the scale it is on), not from 0.
export const TRIPPY_OPTS = { on: true, mode: 'both', start: .05, harmE: 900, tau: 6, stages: [0, .35, .7, 1], zPlanet: -1, zSystem: -2.5, zGalaxy: -4.5, over: -1, tripWorld: false };
// tripWorld (Game Dev 1:02 AM Oct 26): the world.look.trip scaling below. Default OFF since v0.0.30 (Visuals, Oct 26): look/ reads st.trippy
// itself (look/index.js TRP(): kaleido veil + ohm rings, night veil, place colour / vivid / swell / cover; look/audio.js; look/dive.js), so
// scaling world.look.trip as well would apply trippy twice. ON = the old double scaling (also gates render.js / world.js uses of look.trip).
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export function stageOfZ(z, O = TRIPPY_OPTS) { return z <= O.zGalaxy ? 3 : z <= O.zSystem ? 2 : z <= O.zPlanet ? 1 : 0; }
export function trippyTarget(O, earned, maxStage) { const h = 1 - Math.exp(-Math.max(0, earned || 0) / O.harmE), t = O.stages[Math.max(0, Math.min(3, maxStage | 0))] || 0;
  const g = O.mode === 'harmony' ? h : O.mode === 'travel' ? t : 1 - (1 - h) * (1 - t); return clamp(O.start + (1 - O.start) * g); }
export function createTrippy({ sim, world, bank, persist, ctx, st = null, opts = {} }) {
  const O = { ...TRIPPY_OPTS, ...opts }, T = { opts: O, cur: O.start, target: O.start, maxStage: 0, raw: null, wrote: null, h: 0, t: 0, fresh: true, ms: 0 };
  try { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null; if (q && q.has('trippy')) O.over = clamp(+q.get('trippy')); } catch (e) {}
  const zNow = () => (world && world.cam && typeof world.cam.z === 'number' ? world.cam.z : 0);
  const earned = () => (bank && bank() ? bank().earned || 0 : 0);
  T.value = () => (!O.on ? 1 : O.over >= 0 ? clamp(O.over) : T.cur);
  T.tick = dt => { const a0 = performance.now(); const s = stageOfZ(zNow(), O); if (s > T.maxStage) T.maxStage = s;
    T.target = trippyTarget(O, earned(), T.maxStage); T.h = 1 - Math.exp(-earned() / O.harmE); T.t = O.stages[T.maxStage];
    if (T.fresh) { T.fresh = false; if (T.loaded) T.cur = T.target; }   // a returning world shows what it has opened at once
    T.cur += (T.target - T.cur) * Math.min(1, (dt || 0) / O.tau);
    const v = T.value(); if (st) st.trippy = v; if (ctx) ctx.trippy = v;   // st.trippy = the field look/ reads (Visuals, settled 12:53 AM); ctx.trippy kept as a read-only copy
    const lk = world && world.look; if (lk && typeof lk.trip === 'number') { if (lk.trip !== T.wrote) T.raw = lk.trip;
      if (T.raw != null) { if (O.tripWorld) { lk.trip = T.raw * v; lk.real = 1 - lk.trip; T.wrote = lk.trip; }
        else if (T.wrote != null && lk.trip === T.wrote) { lk.trip = T.raw; lk.real = 1 - lk.trip; T.wrote = null; } } }   // switch turned off: hand the unscaled mix back
    T.ms = T.ms * .95 + (performance.now() - a0) * .05; };
  if (persist && persist.register) persist.register('trippy', { prio: 6, save: () => ({ cur: T.cur, mx: T.maxStage, mode: O.mode }),
    load: d => { if (d && typeof d.cur === 'number') { T.cur = clamp(d.cur); T.maxStage = Math.max(T.maxStage, d.mx | 0); T.loaded = true; } } });
  // an old save (no 'trippy' part) that is already out past the ground / in another star system: count what it has reached
  T.fromOld = () => { const zl = world && world.zl; if (zl && zl.touched && zl.touched.size > 1) T.maxStage = 3; T.maxStage = Math.max(T.maxStage, stageOfZ(zNow(), O)); T.loaded = true; };
  T.switches = () => [
    { k: 'trippy', label: 'trippy visuals start hidden in a new game and open up as you play (off = always full, v0.0.28)', get: () => O.on, set: v => { O.on = !!v; }, info: () => `now ${T.value().toFixed(2)} (target ${T.target.toFixed(2)}; harmony part ${T.h.toFixed(2)}, travel part ${T.t.toFixed(2)}, furthest scale ${['ground', 'planet', 'star system', 'galaxy'][T.maxStage]})` },
    { k: 'tripWorld', label: 'trippy also scales the realism <-> trippy mix (world.look.trip). ON until look/ reads st.trippy, then OFF (else applied twice)', get: () => O.tripWorld, set: v => { O.tripWorld = !!v; } },
    { k: 'trippyHarmony', label: 'trippy opens with the harmony you bring back', get: () => O.mode === 'harmony', set: v => { O.mode = v ? 'harmony' : 'both'; } },
    { k: 'trippyTravel', label: 'trippy opens with the furthest scale you reach (ground, planet, star system, galaxy)', get: () => O.mode === 'travel', set: v => { O.mode = v ? 'travel' : 'both'; } },
    { k: 'trippyBoth', label: 'trippy opens with either one (harmony or travel; default)', get: () => O.mode === 'both', set: v => { if (v) O.mode = 'both'; } }];
  T.attachPanel = root => { if (!root || typeof document === 'undefined') return; const el = document.createElement('details'); el.id = 'dv-trippy'; root.appendChild(el);
    el.innerHTML = `<summary>trippy amount (dev)</summary><label><span>override (left end = off, follows play)</span><input type="range" min="-0.05" max="1" step="0.01" value="${O.over}"><i>${O.over < 0 ? 'off' : O.over}</i></label>`;
    const r = el.querySelector('input'), i = el.querySelector('i'); r.oninput = () => { O.over = +r.value < 0 ? -1 : +r.value; i.textContent = O.over < 0 ? 'off' : O.over.toFixed(2); }; T.panel = el; };
  return T;
}
