// SPACE / STAR SYSTEM (world track, v0.0.11 terrain step 2): pinch out past the planet into space. A few seeded planets orbit a star,
// each orbit a whole number of bars (old space.js idea: RS.MULTS periods + Kepler III spacing; read only, rewritten here). Pinch in on a
// planet = land on its steady landing ground (world.js W.land): its home note and tempo land on the next bar.
// Each planet has its own seed: size (circumference C), ridge style (its own home layer), hum note, tempo ratio. The home planet is
// planet 0 and keeps the v0.0.9 world exactly (same seed, same layer).
// Context, no fixed rules (every weight below is a PROPOSAL and in the dev panel):
//   Q41 C  a planet's home note leans toward the nearest om overtone (folded 48-96 Hz); how strongly = context: more in calm healed
//          places, less in busy jams, zero allowed. A leaning, never a lock: the moving harmony still owns chords and degrees.
//   Q300 A (toggle) each planet keeps its own simple multiple of the heartbeat; orbit neighbours drift toward each other's tempo while
//          they jam / heal together (summary activity), continuously.
//   5b A   space plays a soft chord of the planets' home notes, bigger planets lower.
//   12b    how many planets: by seed in [nMin, nMax] (default 2-6).
// Cost: positions are pure functions of the music clock (catch up for free); far planets keep a summary {n, heal, jam} and their ohms
// sleep (o.away -> sim parks them). Drawing (render.js) culls planets off screen.
import { layer } from './world.js';
import { makeRecipe } from './recipe.js';
import { cam } from './view.js';
import { smooth } from './planet.js';
import { rng } from './rng.js';
export const MULTS = [2, 3, 4, 6, 8, 12, 16, 24];        // orbital periods in bars (whole bars: every orbit meets the downbeat)
const TEMPI = [1, 1 / 2, 2, 3 / 2, 2 / 3, 4 / 3, 3 / 4];   // simple multiples of the heartbeat (Q300 A)
const OWN = [1, 3 / 2, 4 / 3, 5 / 4, 9 / 8, 5 / 3, 15 / 8];
const fold = (f, lo = 48, hi = 96) => { while (f >= hi) f /= 2; while (f < lo) f *= 2; return f; };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
export function createSystem(W, sim, bus, music, hash) {
  const S = W.system = { opts: { on: true, nMin: 2, nMax: 6, q300: 'A', lean: 1, chord: .25, travel: true, keepKey: true },
    planets: [], cur: 0, target: null, sys: 0, seed: W.seed, om: music.om, tr: 0, ratio: 1, eo: { x: 0, y: 0 }, v: { sc: 1, s: 0, fx: 0, fy: 0, cx: 0, cy: 0 }, aMax: 1, starR: 1, om0: music.om, spaceAmt: 0 };
  // ---- build: n planets from the world seed ----
  // step 2 (galaxy.js): build(star) builds a NEIGHBOURING system from its own seed (seed tree: galaxy -> system -> planet). No star /
  // the home star = the v0.0.11 home system exactly (its planet 0 is your first home, same seed). A neighbour has no home planet: every
  // planet is seeded from the system, its notes from the system's own om interval and its tempos lean on the system's tempo.
  S.build = star => { const home = !star || star.home, sy = home ? W.seed : star.seed; S.sys = home ? 0 : star.i; S.seed = sy;
    S.ratio = home ? 1 : star.ratio; S.tr = home ? 0 : star.tr; S.om = home ? S.om0 : fold(S.om0 * S.ratio);
    const r = rng(hash(sy, 0x5157)), lo = Math.min(S.opts.nMin, S.opts.nMax), hi = Math.max(S.opts.nMin, S.opts.nMax);
    const n = lo + (hash(sy, 0x5158) % (hi - lo + 1)), ps = []; let mi = -1; const used = [];
    for (let k = 0; k < n; k++) { mi = Math.min(MULTS.length - 1, mi + (k === 0 ? 1 + (r() * 2 | 0) : 1)); used.push(mi); }
    const order = used.map((m, k) => ({ m, k })); const homeSlot = hash(sy, 0x5159) % n;   // which orbit the home planet sits in
    for (let k = 0; k < n; k++) { const isHome = home && k === 0, slot = k === 0 ? homeSlot : (k <= homeSlot ? k - 1 : k);
      const seed = isHome ? W.seed : hash(sy, 0x5100 + k), ps0 = hash(seed, 0x91a7), mult = MULTS[order[slot].m];
      const p = { i: k, seed, C: isHome ? (W.planet.ring || W.planet.C) : 4 + (ps0 % 6), ownR: isHome ? W.planet.ownR : OWN[(ps0 >>> 8) % OWN.length], mult, slot, ph0: r() * TAU,
        tr: isHome ? 0 : S.tr + Math.log2(TEMPI[(hash(seed, 7) >>> 3) % TEMPI.length]), raw: isHome ? S.om0 : fold(S.om * Math.pow(2, r())), note: 0, L: null, walk: 0,
        sum: { n: 0, heal: .5, jam: 0 }, hue: 0, home: isHome };
      ps.push(p); }
    const kmax = Math.cbrt(MULTS[used[used.length - 1]] ** 2);
    S.aMax = .42 * Math.min(W.vw, W.vh) * 64;   // the whole system fits the screen 3 layers out (z = -3)
    for (const p of ps) { p.a = S.aMax * Math.cbrt(p.mult * p.mult) / kmax; p.r = p.C * W.vw / TAU; p.hue = (hash(p.seed, 3) % 360); }
    if (!home) for (const p of ps) { S.noteOf(p); p.note0 = p.note; p.hue = S.hueOf(p); }   // step 2: a neighbour's planets take their colour from their music
    S.starR = Math.min(ps[0].r * 1.6, ps.reduce((m, p) => Math.min(m, p.a), 1e9) * .35);
    S.planets = ps; S.cur = home ? 0 : -1; S.target = null; S.eo.x = S.eo.y = 0; for (const p of ps) S.noteOf(p); return ps; };
  // step 2 (PROPOSAL, galaxy.opts.colour): music colours a neighbour's planets - the planet's note in its system's key on a circle of
  // fifths (a fifth = one step round the wheel), turned by the system's own interval; size moves it a little toward the star's light
  const fifths = f => { const st = 12 * Math.log2(f); return (((st * 7) % 12) + 12) % 12 * 30; };
  S.hueOf = p => { const G = W.galaxy, k = G ? G.opts.colour : 1; if (!k) return hash(p.seed, 3) % 360;
    const mus = (fifths(p.note / S.om) + fifths(S.ratio) * .5 + 200) % 360, own = hash(p.seed, 3) % 360, d = ((own - mus + 540) % 360) - 180; return (mus + d * (1 - k) * .9 + 360) % 360; };
  S.key = k => S.sys * 64 + k;   // where an ohm lives (o.pl): the home system keeps 0..n-1 (saved worlds unchanged)
  // a planet's home layer (lazy): its own ridge style from its seed; the home planet's is world.home
  S.layerOf = p => { if (p.home && !p.L) p.L = W.home; if (!p.L) { const L = layer(hash(p.seed, 0x4000), null, 0); if (!p.home && S.sys) L.hue = p.hue; const Cs = W.sizeOf ? W.sizeOf(p.C) : p.C; L.freqs = L.freqs.map(f => Math.max(1, Math.round(f * Cs)) / Cs); L.C = Cs; L.dent = new Float32Array(W.N); p.L = L; }
    p.L.tempo = Math.pow(2, p.tr); p.L.om = p.note || p.raw; return p.L; };
  // Q41 C: lean toward the nearest om overtone (folded), by context (calm healed up, busy down, 0 allowed)
  S.noteOf = p => { if (p.home) { p.note = S.om0; return p.note; } let best = S.om, bd = 9;
    for (let h = 1; h <= 8; h++) { const o = fold(S.om * h), d = Math.abs(Math.log2(o / p.raw)); if (d < bd) { bd = d; best = o; } }
    const busy = W.planet ? W.planet.busy : 0, lam = .8 * clamp(S.opts.lean * clamp(.25 + .75 * p.sum.heal - .8 * busy));   // max .8: a leaning, never a lock
    p.note = Math.pow(2, Math.log2(p.raw) + lam * (Math.log2(best) - Math.log2(p.raw))); p.lean = lam; return p.note; };
  // ---- positions: pure functions of the music clock (an orbit = mult bars), so far planets catch up for free ----
  S.pos = (p, t, out) => { const an = TAU * music.bar(t) / p.mult + p.ph0; out.x = Math.cos(an) * p.a; out.y = Math.sin(an) * p.a * .9; return out; };
  const tp = { x: 0, y: 0 }, tq = { x: 0, y: 0 }, gs = { x: 0, y: 0 };
  // ---- the view: blend from "focus planet at the anchor" (planet size) to "the star at the centre" (deep space) ----
  S.blendOf = z => S.opts.on && W.opts.planet ? smooth((-z - 1.5) / 1.3) : 0;
  S.view = (Wd, H, A, t) => { const v = S.v, sc = Math.pow(4, cam.z), s = S.blendOf(cam.z), f = S.planets[S.target != null ? S.target : S.cur];
    S.pos(f, t, tp); const px = tp.x + S.eo.x, py = tp.y + S.eo.y;
    const pcx = A.x, pcy = A.y + sc * (W.floorF() * H + f.r);   // where planet.js / render draw the focus planet at planet size
    v.sc = sc; v.s = s; v.fx = px * (1 - s); v.fy = py * (1 - s); v.cx = pcx + (A.x - pcx) * s; v.cy = pcy + (A.y + H * .1 - pcy) * s;
    if (W.galaxy && W.galaxy.shift(sc, gs)) { v.cx += gs.x * s; v.cy += gs.y * s; } return v; };   // step 2: this star's place in the galaxy view (aimed at a neighbour)
  S.screen = (x, y, out) => { const v = S.v; out.x = v.cx + v.sc * (x - v.fx); out.y = v.cy + v.sc * (y - v.fy); return out; };
  // the home planet's draw offset vs its anchored position (render translates the v0.0.9 planet by this)
  S.homeShift = (H, A, t, out) => { const p = S.planets[S.cur]; S.pos(p, t, tq); S.screen(tq.x, tq.y, out); out.x -= A.x; out.y -= A.y + S.v.sc * (W.floorF() * H + p.r); return out; };
  // landing target: the planet nearest the pinch centre (screen px)
  S.aim = (mx, my, t = music.now()) => { let best = null, bd = 1e18; for (const p of S.planets) { S.pos(p, t, tp); S.screen(tp.x, tp.y, tq); const d = Math.hypot(tq.x - mx, tq.y - my) - p.r * S.v.sc; if (d < bd) { bd = d; best = p; } }
    if (best && best.i !== (S.target != null ? S.target : S.cur)) { const f = S.planets[S.target != null ? S.target : S.cur]; S.pos(f, t, tp); S.pos(best, t, tq); S.eo.x += tp.x - tq.x; S.eo.y += tp.y - tq.y; S.target = best.i; } };
  S.unaim = () => { if (S.target == null) return; const t = music.now(); S.pos(S.planets[S.target], t, tp); S.pos(S.planets[S.cur], t, tq); S.eo.x += tp.x - tq.x; S.eo.y += tp.y - tq.y; S.target = null; };
  // ---- summaries + Q300 drift + Q41 notes + the space chord, ~4x a second ----
  const rec = makeRecipe(7004, { name: 'space chord' });
  Object.assign(rec.synth, { family: 'eADD' }); Object.assign(rec.synth.genes, { att: 1, dec: .5, sus: .9, rel: 1, cut: .4, reso: .05, fenv: .05, penv: .3, lfoR: .07, lfoP: .02, lfoF: .25, lfoA: .2, detune: .25, sat: .05, noise: .02, perc: 0, addTilt: .45, addSpread: .25, engMix: .05 });
  rec.mix = { modal: 0, synth: 1 }; rec.fx = []; rec.mods = []; rec.send = .6;
  // v0.0.12: NV planet voices (ids 105..108) + their octave partners (109..112) so the register can follow planet size continuously
  const NV = 4, V = [], vs = []; for (let i = 0; i < NV * 2; i++) { V.push(sim.add({ id: 105 + i, scale: 'world', recipe: rec.id, hue: 0 })); vs.push({ on: false, hz: 0, g: 0 }); }
  // v0.0.12 (fix 2) REGISTER CURVE (PROPOSAL): octaves above/below the planet's note, a smooth function of its size C (no step):
  // -tanh((C - 6.5) / 1.5) -> C 5 about +.76, 6.5 = 0, 8 about -.76, 10 about -.98. A fractional register = an equal-power blend of the
  // two neighbouring octaves (both in tune), so a size in between sits in between.
  S.register = C => -Math.tanh((C - 6.5) / 1.5);
  const voice = (i, hz, g) => { const v = V[i], st = vs[i];
    if (g < .004) { if (st.on) { bus.note({ src: v, kind: 'release' }); st.on = false; } return; }
    if (!st.on || Math.abs(st.hz / hz - 1) > .003) { if (st.on) bus.note({ src: v, kind: 'release' }); bus.note({ src: v, kind: 'sustain', deg: 0, oct: 0, f: hz, vel: .5, sustain: 36000, gainK: g / .16 }); st.on = true; st.hz = hz; st.g = g; return; }
    if (Math.abs(st.g - g) > .003) { bus.note({ src: v, kind: 'level', gain: g }); st.g = g; } };
  let nextT = 0, nextN = 0, sumT = 0;
  S.tick = dt => { const t = music.now();
    if (S.target != null && S.target !== S.cur && cam.z > -1.6) W.land(S.target);   // pinched in far enough on another planet: land
    if (S.target != null && S.target === S.cur && cam.z > -1.2) S.target = null;
    const k = Math.exp(-dt / .45); S.eo.x *= k; S.eo.y *= k; if (Math.abs(S.eo.x) + Math.abs(S.eo.y) < .5) S.eo.x = S.eo.y = 0;
    S.spaceAmt = S.blendOf(cam.z);
    if (t < nextT) return; nextT = t + .25;
    const cur = S.planets[S.cur];
    if (t >= sumT) { sumT = t + 1; let n = 0, jam = 0; for (const o of sim.ohms) { if (o.away) continue; n++; const sg = sim.sig[o.id]; if (sg && sg['sound.level'] > .03) jam++; }
      cur.sum.n = n; cur.sum.jam = clamp((music.jam ? .4 : 0) + jam / 6); cur.sum.heal = W.healAt(0, 0) * .5 + (cur.sum.heal || .5) * .5;
      for (const p of S.planets) if (p !== cur) p.sum.jam *= .97;   // away: their jam fades (ohms asleep); heal is kept
      if (S.opts.q300 === 'A') { const ps = S.planets.slice().sort((a, b) => a.slot - b.slot);
        for (let i = 0; i + 1 < ps.length; i++) { const a = ps[i], b = ps[i + 1], tog = Math.min(a.sum.jam + (a.sum.heal - .5), b.sum.jam + (b.sum.heal - .5));
          if (tog > .05) { const m = .01 * tog * (b.tr - a.tr); a.tr += m; b.tr -= m; } } } }
    if (t >= nextN) { nextN = music.timeOfBeat(Math.ceil(music.beat(t) / 8 + 1e-6) * 8); for (const p of S.planets) S.noteOf(p); }   // notes move every 2 bars, never mid-phrase
    // 5b A: the space chord - planets' home notes, bigger planets lower; nearest NV to the star (inner orbits) when there are more
    const amt = S.opts.on ? S.spaceAmt * S.opts.chord * (W.zl ? W.zl.planetsHeard : 1) * .16 / Math.sqrt(Math.min(NV, S.planets.length)) : 0, ps = S.planets.slice().sort((a, b) => a.slot - b.slot);
    for (let i = 0; i < NV; i++) { const p = ps[i]; if (!p) { voice(i, 100, 0); voice(i + NV, 100, 0); continue; } const x = S.register(p.C), lo = Math.floor(x), fr = x - lo; voice(i, p.note * 2 * Math.pow(2, lo), amt * Math.cos(fr * 1.5708)); voice(i + NV, p.note * 4 * Math.pow(2, lo), amt * Math.sin(fr * 1.5708)); }
    const post = (k2, v) => { const g = sim.sig.global; if (g[k2] != null && Math.abs(g[k2] - v) < 4e-3) return; bus.ctl('global', k2, v); };
    post('space.amt', S.spaceAmt); post('space.planet', S.planets.length > 1 ? S.cur / (S.planets.length - 1) : 0); post('planet.lean', cur.lean || 0); };
  S.build();
  return S;
}
