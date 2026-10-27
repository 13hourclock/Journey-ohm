// LOOK / audio: one visual per st.audio system (Wilbow 12:23 AM "the visualizer connections to the audio engine"; job of 1:03 AM).
// Every visual is LIGHT on real material - soft glows, light waves, glints, a muffle haze - never an outline, never text. EVENT WAVES
// ONLY: a wave starts on an onset (st.audio *.onset / *On rising) and dies out; nothing runs between events (no constant ripples).
// Scaled by st.trippy (missing = 1): brightness floor + (1 - floor) * trippy, colour (saturation) = trippy, so at the start of the game
// (.05) every wave is a faint, near-white glint of light and the colour arrives as the world gets trippy.
// Cost: each wave is ONE blit of a sprite baked once per (shape, pitch-class hue, colour step) - 64/128 px, radial gradients in the
// bake only (no per-frame gradient / filter / shadowBlur); positions are re-projected every frame from world coords (they follow the
// camera). Idle frames: one pass over the st.audio fields (~1 us). Each system behind its own opt: look opts.realLook.audio = false =
// all off, or { notes: false, ... }; look.api.audio.O at run time.
// Drawn in look.post (the ohm canvas, after the ohms), 'lighter' (light adds) except the breakdown shadow and the muffle haze.
// Chord / key changes are the kaleidoscope's (look/kaleido.js morphs its slices on a chord, retints on a key): not repeated here.
import { toScreen } from '../space.js';
export const AUDIO_OPTS = { on: true, max: 28, floor: .35, hold: .07,
  om: true, notes: true, strings: true, bars: true, membranes: true, jam: true, arc: true, trad: true, abilities: true, muffle: true };
const WARM = [255, 244, 228];
const hsl = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255)); };
const hash = s => { let h = 7; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
export function createAudioLook({ makeCanvas, opts = {}, sim = null } = {}) {
  const O = { ...AUDIO_OPTS, ...(opts || {}) }, A = { O, cache: new Map(), live: [], stats: { waves: 0, bakes: 0, drawn: 0, by: {} } };
  const mk = makeCanvas || ((w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; });
  const clk = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  // ---- baked sprites: shape x hue bucket (12 = the pitch classes) x colour step (5, from trippy) ----
  //  glow  : radial light, exp-like falloff, no edge          ring : a broad soft band of light (a light wave, not a line)
  //  streak: a long thin shimmer (a string's light)           glint: a hot core with two crossed soft streaks (struck metal)
  //  shade : a soft dark pool (source-over: the breakdown's shadow)
  const SZ = { glow: [64, 64], ring: [128, 128], streak: [128, 16], glint: [64, 64], shade: [64, 64] };
  const sprite = (shape, hb, cs) => { const k = shape + hb + '.' + cs; let c = A.cache.get(k); if (c) return c; const [w, h] = SZ[shape]; c = mk(w, h); const x = c.getContext('2d');
    const s = cs / 4, H = hsl(hb * 30 + 8, .72, .62), C = shape === 'shade' ? [6, 7, 12] : WARM.map((v, i) => Math.round(v + (H[i] - v) * s)), rgba = a => `rgba(${C[0]},${C[1]},${C[2]},${a})`;
    const rad = (cx, cy, r, stops) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); for (const [u, a] of stops) g.addColorStop(u, rgba(a)); return g; };
    if (shape === 'glow' || shape === 'shade') { x.fillStyle = rad(w / 2, h / 2, w / 2, [[0, 1], [.18, .62], [.42, .24], [.7, .06], [1, 0]]); x.fillRect(0, 0, w, h); }
    else if (shape === 'ring') { x.fillStyle = rad(w / 2, h / 2, w / 2, [[0, 0], [.3, .05], [.58, .3], [.8, .75], [.92, .38], [1, 0]]); x.fillRect(0, 0, w, h); }
    else if (shape === 'streak') { x.save(); x.translate(w / 2, h / 2); x.scale(w / h, 1); x.fillStyle = rad(0, 0, h / 2, [[0, .9], [.3, .45], [.65, .1], [1, 0]]); x.fillRect(-h / 2, -h / 2, h, h); x.restore(); }
    else if (shape === 'glint') { for (const [sx, sy] of [[1, .07], [.07, 1]]) { x.save(); x.translate(w / 2, h / 2); x.scale(sx, sy); x.fillStyle = rad(0, 0, w / 2, [[0, .8], [.25, .3], [.6, .06], [1, 0]]); x.fillRect(-w / 2, -w / 2, w, w); x.restore(); }
      x.fillStyle = rad(w / 2, h / 2, w * .2, [[0, 1], [.5, .4], [1, 0]]); x.fillRect(0, 0, w, h); }
    A.cache.set(k, c); A.stats.bakes++; return c; };
  // ---- the waves ----
  // a wave: { sys, shape, wx, wy (world, or null = screen sx, sy), w0, w1, h0, h1 (world units, or px when screen), life, a, hb, cs, op, t0 }
  const add = (sys, w) => { if (A.live.length >= O.max) A.live.shift(); w.sys = sys; w.t0 = clk(); A.live.push(w); A.stats.waves++; A.stats.by[sys] = (A.stats.by[sys] || 0) + 1; return w; };
  const P = {}, PT = {}, rise = (k, v) => { const p = P[k] || 0; P[k] = v; if (!(v > p + 1e-3 && v > .5)) return false; const t = clk(); if (t - (PT[k] || -9) < O.hold) return false; PT[k] = t; return true; };   // an onset field ROSE (they only decay between events) = a new event; O.hold s apart at most
  const cs = () => Math.max(0, Math.min(4, Math.round(A.trp * 4))), I = () => O.floor + (1 - O.floor) * A.trp;
  const pcHue = pc => ((pc | 0) % 12 + 12) % 12;
  const ohmPos = id => { if (!sim || id == null) return null; if (typeof id === 'object') return id.body || null; for (const o of sim.ohms || []) if (o.id === id) return o.body || null; return null; };
  const SYS = [];
  // om: the planet's heartbeat (om.heart) - a slow warm light swell rising off the horizon, pitched to the om (om.hz), as loud as the hum
  SYS.push(['om', (S, st, E) => { const M = S.om; if (!rise('om', M.heart)) return; const W = st.W, H = st.H, hz = M.hz > 0 ? M.hz : 64, hb = pcHue(Math.round(12 * Math.log2(hz / 64)));
    add('om', { shape: 'glow', sx: W / 2, sy: E.landY, w0: W * 1.3, w1: W * 1.9, h0: H * .12, h1: H * .3, life: 1.6, a: (.16 + .3 * Math.min(1, M.level + M.drone * .5)) * I(), hb, cs: cs() }); }]);
  // notes: an ohm sings - a soft flash on its body and a light wave rolling out from it, coloured by the note's pitch class; bright
  // timbres throw the wave further, damped ones fade sooner
  SYS.push(['notes', (S, st, E) => { const N = S.notes; if (!rise('notes', N.onset) || N.x == null) return; const hb = pcHue(N.pc), lv = .55 + .45 * Math.min(1, N.level), br = Math.max(0, Math.min(1, N.bright || 0)), dm = Math.max(0, Math.min(1, N.damp || 0));
    const life = .75 + .45 * br - .35 * dm, c = cs(), k = I() * lv, cut = N.rate > 6 ? .5 : 1;   // a fast run: half-strength waves (light, not glare)
    add('notes', { shape: 'glow', wx: N.x, wy: N.y, w0: 2.6, w1: 3.6, life: .4 + .25 * br, a: .5 * k * cut, hb, cs: c });
    add('notes', { shape: 'ring', wx: N.x, wy: N.y, w0: 1.8, w1: 6 + 4 * br, life, a: .55 * k * cut, hb, cs: c }); }]);
  // strings: a drawn string is plucked - a long shimmer of light lies along it and stretches as it rings out
  SYS.push(['strings', (S, st, E) => { const D = S.strings; if (!rise('strings', D.onset) || D.x == null) return;
    add('strings', { shape: 'streak', wx: D.x, wy: D.y, w0: 5, w1: 9, h0: .6, h1: .35, life: 1.1, a: .5 * I(), hb: pcHue(D.pc), cs: cs() }); }]);
  // bars: a drawn bar is struck - a short hard glint of light, like sun off struck metal
  SYS.push(['bars', (S, st, E) => { const D = S.bars; if (!rise('bars', D.onset) || D.x == null) return;
    add('bars', { shape: 'glint', wx: D.x, wy: D.y, w0: 4.5, w1: 3, life: .5, a: .65 * I(), hb: pcHue(D.pc), cs: cs() }); }]);
  // membranes: a drum is hit - a low, wide, flattened push of pale light along the ground, quick to come and go (a thump in the air)
  SYS.push(['membranes', (S, st, E) => { const D = S.membranes; if (!rise('membranes', D.onset) || D.x == null) return;
    add('membranes', { shape: 'glow', wx: D.x, wy: D.y, w0: 2.5, w1: 9, h0: 1.2, h1: 3.2, life: .65, a: .34 * I(), hb: pcHue(D.pc), cs: Math.max(0, cs() - 2) }); }]);
  // jam: while ohms jam, each downbeat breathes a soft light under the whole jam; a hand-over of the front lights the new lead ohm;
  // a jam that grows a longer loop sends one wide wave across the screen. (Chord / key changes: the kaleidoscope's morph.)
  SYS.push(['jam', (S, st, E) => { const J = S.jam, W = st.W, H = st.H, c = cs(), hb = pcHue(J.chord * 2);
    if (rise('jam.down', J.down) && J.on) add('jam', { shape: 'glow', sx: E.ax, sy: E.landY, w0: W * .7, w1: W * .95, h0: H * .08, h1: H * .14, life: .55, a: (.1 + .05 * Math.min(4, J.pairs)) * I(), hb, cs: c });
    if (rise('jam.front', J.frontOn)) { const b = ohmPos(J.front); if (b) add('jam', { shape: 'glow', wx: b.x, wy: b.y, w0: 3, w1: 4.5, life: .9, a: .4 * I(), hb, cs: c }); }
    if (rise('jam.grow', J.growOn)) add('jam', { shape: 'ring', sx: E.ax, sy: E.ay, w0: W * .2, w1: W * 1.6, life: 1.4, a: .3 * I(), hb, cs: c }); }]);
  // arc: the song's shape - a new section lifts a band of light up off the horizon; the hook flares the high sky; the song's end
  // leaves a long warm afterglow; a breakdown lets a soft shadow pool over the land before the light comes back
  SYS.push(['arc', (S, st, E) => { const R = S.arc, W = st.W, H = st.H, c = cs(), hb = pcHue((R.progress || 0) * 12);
    if (rise('arc.section', R.sectionOn)) add('arc', { shape: 'glow', sx: W / 2, sy: E.landY, sy1: E.landY - H * .18, w0: W * 1.4, w1: W * 2, h0: H * .1, h1: H * .22, life: 2, a: .22 * I(), hb, cs: c });
    if (rise('arc.hook', R.hookOn)) add('arc', { shape: 'glow', sx: W / 2, sy: H * .16, w0: W * .5, w1: W * 1.1, h0: H * .18, h1: H * .3, life: 1.2, a: .26 * I(), hb, cs: c });
    if (rise('arc.end', R.endOn)) add('arc', { shape: 'glow', sx: W / 2, sy: E.landY, w0: W * 2, w1: W * 2.6, h0: H * .5, h1: H * .7, life: 3.2, a: .24 * I(), hb: 1, cs: Math.max(1, c) });
    if (rise('arc.breakdown', R.breakdownOn)) add('arc', { shape: 'shade', op: 'source-over', sx: W / 2, sy: E.landY + H * .1, w0: W * 1.6, w1: W * 2.2, h0: H * .4, h1: H * .55, life: 2.2, a: .32 * I(), hb: 0, cs: 0 }); }]);
  // trad: a tradition's cycle - each accented step taps a small pool of light on the land in time; a craze catching on sends a wave
  // out from the centre; a craze turning into a tradition sends a bigger, slower one and a glow along the horizon
  SYS.push(['trad', (S, st, E) => { const T = S.trad, W = st.W, H = st.H, c = cs(), hb = pcHue(hash(T.cycle || T.id) % 12), key = T.id + ':' + T.step;
    if (T.id != null && T.accent > .05 && key !== P.tradStep) { const st0 = T.steps > 1 ? T.step / (T.steps - 1) : .5; add('trad', { shape: 'glow', sx: W * (.25 + .5 * st0), sy: E.landY + H * .04, w0: W * .22, w1: W * .3, h0: H * .035, h1: H * .05, life: .5, a: .24 * Math.min(1, T.accent) * I(), hb, cs: c }); }
    P.tradStep = key;
    if (rise('trad.craze', T.crazeOn)) add('trad', { shape: 'ring', sx: E.ax, sy: E.ay, w0: W * .1, w1: W * 1.2, life: 1.2, a: .26 * I(), hb, cs: c });
    if (rise('trad.trad', T.tradOn)) { add('trad', { shape: 'ring', sx: E.ax, sy: E.ay, w0: W * .2, w1: W * 2.2, life: 2.2, a: .32 * I(), hb, cs: c });
      add('trad', { shape: 'glow', sx: W / 2, sy: E.landY, w0: W * 1.6, w1: W * 2.2, h0: H * .12, h1: H * .2, life: 2.4, a: .2 * I(), hb, cs: c }); } }]);
  // abilities: an ohm uses its special ability - a bright bloom at the ohm, tinted by the ability (the ring itself is look.pulse's)
  SYS.push(['abilities', (S, st, E) => { const D = S.abilities; if (!rise('abilities', D.onset) || D.x == null) return;
    add('abilities', { shape: 'glow', wx: D.x, wy: D.y, w0: 4.5, w1: 2.8, life: .55, a: .5 * I(), hb: hash(D.kind) % 12, cs: cs() }); }]);
  // muffle: the deaf muffle - while it is on, a cool grey haze settles over everything (sound dulled = light dulled); it lifts as it ends
  SYS.push(['muffle', (S, st, E) => { const m = Math.max(0, Math.min(1, +S.muffle.amt || 0)); E.haze = m > .01 ? m : 0; }]);
  // ---- the frame: read st.audio (rising onsets start waves), then draw the live waves ----
  const tmp = { x: 0, y: 0, s: 1 }, E = { landY: 0, ax: 0, ay: 0, haze: 0 };
  A.post = (g, st, landY) => { if (!O.on || !g || !st || !st.audio) return false; const S = st.audio, W = st.W || 412, H = st.H || 915;
    A.trp = typeof st.trippy === 'number' ? Math.max(0, Math.min(1, st.trippy)) : 1; const a0 = st.A;
    E.ax = a0 ? a0.x : W / 2; E.ay = a0 ? a0.y : H * .45; E.landY = landY != null ? landY : H * .62; E.haze = 0;
    for (const [k, f] of SYS) if (O[k] !== false) f(S, st, E);
    const z = (st.depth || 0) + (st.zoom || 0), ohmA = Math.max(0, Math.min(1, (.92 - z) / .3, (z + 2.6) / .5));   // the ohms' own fade (render.js): world-placed waves go with them
    const now = clk(); let n = 0;
    if (A.live.length || E.haze) { const go = g.globalCompositeOperation, ga = g.globalAlpha;
      if (E.haze) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(.4, E.haze * .3 * I()); g.fillStyle = 'rgb(58,62,70)'; g.fillRect(0, 0, W, H); n++; }
      let j = 0; for (const w of A.live) { const u = (now - w.t0) / w.life; if (u >= 1 || u < 0) continue; A.live[j++] = w;
        const e = 1 - (1 - u) * (1 - u), f = 1 - u, al = w.a * f * f * (w.wx != null ? ohmA : 1); if (al < .004) continue;
        let x, y, ww = w.w0 + (w.w1 - w.w0) * e, hh = w.h0 != null ? w.h0 + (w.h1 - w.h0) * e : ww;
        if (w.wx != null) { if (!st.cam) continue; toScreen(W, H, st.cam, w.wx, w.wy, tmp); x = tmp.x; y = tmp.y; ww *= tmp.s; hh *= tmp.s; ww = Math.min(ww, W * 2.5); hh = Math.min(hh, H * 2.5); if (ww < 1) continue; }
        else { x = w.sx; y = w.sy1 != null ? w.sy + (w.sy1 - w.sy) * e : w.sy; }
        if (x + ww / 2 < 0 || x - ww / 2 > W || y + hh / 2 < 0 || y - hh / 2 > H) continue;
        g.globalCompositeOperation = w.op || 'lighter'; g.globalAlpha = Math.min(1, al); g.drawImage(sprite(w.shape, w.hb, w.cs), x - ww / 2, y - hh / 2, ww, hh); n++; }
      A.live.length = j; g.globalCompositeOperation = go; g.globalAlpha = ga; }
    A.stats.drawn += n; return n > 0; };
  return A; }
