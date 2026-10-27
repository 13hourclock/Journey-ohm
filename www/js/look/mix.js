// LOOK / mix: ONE continuous value, trip 0 (real light, depth, materials) .. 1 (trippy, sound-reactive colour and pattern),
// worked out from context, plus a short PEAK envelope for big musical events (Wilbow 2:37 AM "13A 13B 13D": both/and, bigger
// psychedelic moments at big events, the mix depends on context). No presets, no themes, no fixed ratio: weights are
// Tuning parameters, every input is optional with a safe default, and everything is smoothed.
// READ-ONLY: reads st (render's per-frame state), music and the event bus; never writes world, sim or music state.
export const MIX_WEIGHTS = { place: .25, jam: .25, dev: .3, tension: .2, base: .08 };   // weights (fallback path only)
const FIFTHS = [0, 5, 2, 3, 4, 1, 6, 1, 4, 3, 2, 5];   // steps round the circle of fifths from home, for key semitone 0..11
export function createMix(opts = {}) {
  const O = { w: { ...MIX_WEIGHTS, ...(opts.weights || {}) }, tau: 2.5, devTau: 90, peakBeats: 8, peakLift: .6, attack: .08, ...opts };
  const M = { trip: 0, peak: 0, real: 1, mixed: 0, raw: 0, dev: 0, inputs: {}, _t: null, _key: null, _jam: null, _root: null, _lastB: null, _pend: 0, _tgt: 0 };
  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
  // explicit event hook: anything (render, world, the bus listener below) may report a big moment with a strength 0..1
  M.event = (kind, s = 1) => { M._pend = Math.max(M._pend, clamp(s)); M.inputs.lastEvent = kind; };
  // optional bus listeners: they only record that a big moment happened (cheap, no drawing outside rAF)
  M.listen = bus => { if (!bus || !bus.on) return;
    bus.on('harmony.push', () => M.event('push', .7)); bus.on('world.layer', () => M.event('layer', .8));
    bus.on('set', ev => { if (ev.path === 'music.om') M.event('om', .6); }); };
  // per frame: st = render's state ({ t, trip?, burst?, pulse, ... }); src = { music, sim, bus, world } (all optional)
  M.step = (st = {}, src = {}) => { const mu = src.music, t = st.t != null ? st.t : mu ? mu.now() : 0, dt = M._t == null ? 0 : Math.max(0, Math.min(.25, t - M._t)); M._t = t;
    const beat = mu ? mu.beat(t) : t, dB = M._lastB == null ? 0 : Math.max(0, beat - M._lastB); M._lastB = beat;
    // ---- base: the world's own context value when it exists (st.trip, world.js W.lookMix), else a local fallback ----
    let raw;
    if (typeof st.trip === 'number') raw = st.trip;
    else { const w = O.w, bus = src.bus, wd = src.world || {};
      const jam = mu && mu.jam ? 1 : 0;
      let dens = 0; if (bus && bus.recent) { for (let i = bus.recent.length - 1; i >= 0 && bus.recent[i] > beat - 8; i--) dens++; dens = clamp(dens / 12); }
      M.dev += (dens - M.dev) * (1 - Math.exp(-dt / O.devTau));               // how far the music has developed: builds over minutes
      const tension = mu ? FIFTHS[((mu.key | 0) % 12 + 12) % 12] / 6 : 0;          // away from home
      const place = typeof wd.heal === 'number' ? wd.heal : typeof st.place === 'number' ? st.place : 0;   // place healing / harmony if present
      M.inputs = { jam, dens, dev: M.dev, tension, place };
      raw = w.base + w.jam * jam + w.dev * M.dev + w.tension * tension + w.place * place; }
    M.raw = clamp(raw);
    M.trip += (M.raw - M.trip) * (dt ? 1 - Math.exp(-dt / O.tau) : 1);
    // ---- peak: big musical events (from st.burst, the bus, or detected from the music clock) ----
    if (mu) { const k = mu.key, j = !!mu.jam, r = mu.chord ? mu.chord.root : null;
      if (M._key != null && k !== M._key) M.event('key', 1);
      if (M._jam === false && j) M.event('jam', .8);                            // a jam locking in
      if (M._root != null && r === 0 && (M._root === 4 || M._root === 6)) M.event('cadence', .5);   // V -> I or vii -> I
      M._key = k; M._jam = j; M._root = r; }
    M._tgt = Math.max(M._tgt * Math.exp(-dB / (O.peakBeats / 3)), M._pend, typeof st.burst === 'number' ? st.burst : 0); M._pend = 0;   // held target, ~gone after peakBeats beats
    if (M._tgt > M.peak) M.peak += (M._tgt - M.peak) * (dt ? 1 - Math.exp(-dt / O.attack) : 1); else M.peak = M._tgt;   // quick soft attack, smooth decay
    M.peak = clamp(M.peak);
    M.mixed = clamp(M.trip + (1 - M.trip) * M.peak * O.peakLift); M.real = 1 - M.mixed;
    return M; };
  return M;
}
