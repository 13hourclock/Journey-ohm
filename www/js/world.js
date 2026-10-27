// WORLD (world track): a procedural world from one seed, made of ONE generic block - layer(seed, parent) - repeated at every
// scale. Depth is an open-ended integer (0 = the ohm's home layer, +1 = one scale smaller/inside, -1 = one scale bigger/around);
// layers are grown lazily from their neighbour toward home, so there is no list of scale levels anywhere. Each layer's seed and
// parameters modulate the next one (hue, symmetry, terrain, trip, and the sound: key ratio, tempo ratio, timbre bias).
// Shared state: everything lives in W (read by render, ohms, sound); changes come in as events on the music clock:
//   reads  note events (strike -> terrain ripple + lasting dent), global ctl streams (beat.pulse), sound.level
//   posts  ctl 'global' streams: world.depth, world.zoom (fractional), world.ground (terrain height under the ohm, 0..1),
//          layer.bright, layer.rough, layer.timbre, layer.tempo (/2), world.pulse, place.harmony; per ohm place.heal, place.harmony  (any matrix row can use them as sources: two-way sound <-> world coupling)
//          look.trip (0 realistic .. 1 trippy, from context), look.burst (0..1, a big musical event just happened)
//          'world.layer' event {depth, layer} when the camera settles into a layer; 'set music.om' on the next bar (toggle)
import { rng, newSeed } from './rng.js';
import { cam, setDepth, bindCam } from './view.js';
import { unit } from './space.js';
import { createPlanet } from './planet.js';
import { createSystem } from './system.js';
import { createGalaxy } from './galaxy.js';
import { createZoomLayers } from './zoomlayers.js';
import { makeTerrain, terrainSteps, styleOf } from './terrain.js';
import { createShape } from './shape.js';
import { makeGlobe, globeParams, GLOBE_DEF } from './globe.js';
import { createEnv } from './env.js';
export const K = 4;   // zoom factor between neighbouring layers
const JUST = [1, 3 / 2, 4 / 3, 5 / 4, 6 / 5, 5 / 3, 9 / 8, 8 / 5];   // PROPOSAL: a layer's key is its parent's key times a just ratio
const CONS = [1, .9, .85, .75, .7, .72, .45, .6];                    // how consonant each ratio sounds (feeds harmonyAt)
const TEMPO = [1, 1, 4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5];        // PROPOSAL: a layer's tempo = its parent's x one of these (own draw, never from the om)
const hash = (a, b) => { let h = Math.imul((a ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ Math.imul((b + 0x632be5ab) >>> 0, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; };
const fold = (f, lo = 48, hi = 96) => { while (f >= hi) f /= 2; while (f < lo) f *= 2; return f; };
// THE block: one layer from a seed, nudged by its parent (the neighbour toward home). Pure.
export function layer(seed, parent, depth) {
  const r = rng(seed), p = parent;
  const L = { depth, seed,
    hue: p ? (p.hue + 70 + r() * 140) % 360 : r() * 360,             // neighbours sit apart on the colour wheel
    spread: 40 + r() * 120,                                          // how many hues the layer paints with
    sym: p ? Math.max(3, Math.min(16, Math.round(p.sym * [1, 2, .5, 1.5, 2 / 3][(r() * 5) | 0]))) : 5 + ((r() * 4) | 0),   // symmetry relates harmonically
    rough: Math.min(1, Math.max(0, (p ? p.rough : .5) + (r() - .5) * .6)),
    ridges: 6 + ((r() * 7) | 0), amp: .03 + r() * .06, freq: .8 + r() * 1.7, swirl: (r() - .5) * 2, phase: r() * 100,
    ri: p ? (r() * JUST.length) | 0 : 0 };
  L.ratio = JUST[L.ri]; L.cons = p ? p.cons * .5 + CONS[L.ri] * .5 : 1;
  L.om = p ? fold(p.om * (depth > 0 ? L.ratio : 1 / L.ratio)) : 64;
  // sound inheritance (no lore: every value is drawn from this layer's seed and nudged by its parent, nothing from a story)
  L.tempo = p ? Math.max(.5, Math.min(2, p.tempo * TEMPO[(r() * TEMPO.length) | 0])) : 1;   // x the home tempo
  L.timbre = Math.max(0, Math.min(1, (p ? p.timbre * .6 : .5) + (1 - L.rough) * .25 + r() * .15));   // 0 dark/rough .. 1 bright/smooth
  L.bright = .35 + .65 * (1 - L.rough) * (L.spread / 160);
  L.freqs = [L.freq, L.freq * (1.7 + r() * .6), L.freq * (3 + r())]; L.phs = [r() * 6.28, r() * 6.28, r() * 6.28];
  L.trip = Math.max(0, Math.min(1, p ? p.trip + (r() - .5) * .5 : .15 + r() * .3));   // the place's own realism<->trippy lean (PROPOSAL)
  return L;
}
const SEEDKEY = 'jo.world.seed';
const savedSeed = () => { try { const v = globalThis.localStorage && localStorage.getItem(SEEDKEY); return v && localStorage.getItem(SEEDKEY + '.keep') === '1' ? +v : null; } catch (e) { return null; } };
export function createWorld(sim, bus, music, seed = savedSeed() || newSeed()) {
  const W = { seed, pseed: seed, cam, layers: new Map(), opts: { layerKey: true, layerTempo: true, snap: true, pulse: true, planet: true, hum: true, walk: true, ctxTempo: true, terrain: true, globe: true, globeBack: true, globeColors: true, realGroundFade: true, zoomSameDetail: true, skyHold: true, zoomAccent: false, skyPar: .15, farPar: .5, skyHandFrom: .15, skyHandTo: .85, caves: true, orbitThin: true, terrWarm: true, terrWarmMs: 1.5, skyInc: true, camFrame: true, placeTempo: 'lean', placeFeel: true, room: true, noOutlines: true, rainSkyScale: true, lnRidge: true, lnPlanetRim: true, lnDiscRim: true, lnKaleido: true, lnScope: true, lnNodes: true, lnGroups: true, lnHerd: true, lnFuse: true, lnThings: true, lnGalaxy: true, lnDive: true, lnHints: true, lnNodeText: true, diveTextDev: true, lnOrbits: true, lnBand: true, lnCracks: true, lnRain: true, lnRareLegs: true, lnRare: true, lnBeads: true, lnSpecks: true, tripDirect: true, zoomSkyOnce: true, zoomFeather: true, calmBent: true, ridgeOverscan: true, diveWaveEvent: true, nodeCap: true, haloMute: true, lookOhmBody: true, lookLegs: true, galaxyMute: true, lookGalaxy: true, seaMute: true, envSeed: true, ohmPost: true, landShiftEase: true, skyDefer: true, diveNoName: true }, pulse: { amt: 0 }, curTempo: 1, walk: 0, ripples: [], N: 64, home: null, vw: 412, vh: 860,
    look: { trip: .25, burst: 0, big: 0, real: .75, dev: 0, rate: 0 },
    // PROPOSAL weights: how context sets the realism<->trippy balance (place, jam, harmony tension, how far the music has grown, big moments)
    lookMix: { place: .35, jam: .2, tension: .15, dev: .35, burst: .45 } };
  bindCam(sim.cam);   // sim.cam (space.js) is the one camera; view.js keeps its depth
  W.setView = (w, h) => { W.vw = w; W.vh = h; };
  const ux = x => .5 + x * unit(W.vw, W.vh) / W.vw;   // world x (R units) -> home layer x (0..1 across the home screen)
  // v0.0.11: bigger layers (d < 0) = the shared space (system seed, rooted at the first home); d >= 0 = the planet you are on
  W.layer = d => { let L = W.layers.get(d); if (L) return L; if (d === 0 && W.home) { W.layers.set(0, W.home); return W.home; } const par = d === 0 ? null : d === -1 && W.system ? W.system.planets[0].L || W.layer(0) : W.layer(d > 0 ? d - 1 : d + 1); L = layer(hash(d < 0 ? (d >= -3 && W.system ? W.system.seed : W.seed) : W.pseed, d + 0x4000), par, d);   /* step 2: a system's space layers from its own seed; the galaxy (d <= -4) from the first home */ if (d === 0) L.om = music.om; L.dent = new Float32Array(W.N); W.layers.set(d, L); if (W.layers.size > 64) for (const k of W.layers.keys()) { if (Math.abs(k - Math.round(cam.z)) > 8) { W.layers.delete(k); break; } } return L; };
  // v0.0.9: the home layer is the planet's surface - its terrain repeats every planet.C home widths so walking comes back around
  const roundHome = () => { const C = W.planet.C, L = W.home; L.freqs = L.freqs.map(f => Math.max(1, Math.round(f * C)) / C); L.C = C; L.terr = undefined; };
  // real planet step 1 (PLAN_REAL_PLANET 2, T15 "large"): the surface is GLOBE_DEF.size x the size class widths around (W.planet.C, what
  // you walk), while the size class itself (W.planet.ring) stays what the sound, the system view and the 2D fallback ring use
  W.globeOpts = { ...GLOBE_DEF };
  W.sizeOf = ring => W.opts.globe && W.opts.terrain ? ring * (W.globeOpts.size || 40) : ring;
  W.setRing = ring => { W.planet.ring = ring; W.planet.C = W.sizeOf(ring); };
  W.home = W.layer(0); createPlanet(W, sim, bus, music, hash); W.setRing(W.planet.C); roundHome();
  W.u0 = (L, x) => L.depth === 0 ? x + W.walk : x;   // the walk (spin around the planet) shifts only the home surface
  createSystem(W, sim, bus, music, hash); createGalaxy(W, W.system, music, hash); createZoomLayers(W, sim, bus, music);   // step 2 finish: the layer stack (split / blend sound, modulation both ways, play)
  // v0.0.11 LAND on planet k (system.js decides when): it becomes the home layer; its note + tempo land on the next bar.
  // Your focus ohm (and a herd-selected group, toggle travel) come with you; the ohms living elsewhere sleep (o.away -> sim parks them).
  W.land = k => { const S = W.system, from = S.planets[S.cur], p = S.planets[k]; if (!p || p === from) return;
    if (from) { from.walk = W.walk; from.L = W.home; } S.target = null; const fk = from ? S.key(from.i) : W.galaxy.prevKey, kk = S.key(k);   // step 2: no from = arriving from another system
    S.cur = k; landed = -1; W.regionTempo = 1; const L = S.layerOf(p); W.pseed = p.seed; for (const d of [...W.layers.keys()]) if (d >= 0) W.layers.delete(d); W.home = L; W.layers.set(0, L);
    W.setRing(p.C); W.planet.ownR = p.ownR; W.planet.seed = hash(p.seed, 0x91a7); W.walk = p.walk;
    const sel = sim.herd && sim.herd.sel;
    for (const o of sim.ohms) { if (o.pl == null) o.pl = fk; if (S.opts.travel && (o === sim.ohm || (sel && sel.has(o.id)))) o.pl = kk; o.away = o.pl !== kk; }
    if (sim.ohm) sim.ohm.away = false;
    const at = music.timeOfBeat(Math.ceil(music.beat() / 4 + 1e-6) * 4), tr = tempoOf(L);
    pendingOm = { om: W.opts.layerKey ? S.noteOf(p) : null, bpm: W.opts.layerTempo ? ((pendingOm && pendingOm.bpm) || 1) * tr / W.curTempo : null, at }; if (W.opts.layerTempo) W.curTempo = tr;
    L.om = p.note; settled = null; lastDepth = Math.round(cam.z); W.bang(1); bus.post({ type: 'world.land', planet: k, layer: L, system: S.sys }); };
  W.walkBy = du => { const C = W.planet.C; W.walk = (((W.walk + du) % C) + C) % C; };
  W.restoreLand = (k, sys) => { if (sys && W.galaxy.stars[sys]) W.galaxy.enter(sys, k); else if (k !== W.system.cur) W.land(k); pendingOm = null; };   // systems (restore): land on the saved planet without re-posting its om / tempo over the saved ones
  // terrain height of layer L at x in layer units (0..1 across the home screen width, open-ended), >0 = up
  // v0.0.12: a planet surface (depth 0) also carries its terrain (terrain.js): features, terraces, a cloud giant's soft floor, and a flat
  // water line on wet worlds (W.hRaw = the height under the water, for drawing its depth).
  W.terrOf = L => { if (L.depth !== 0) return null; if (L.terr === undefined) { const J = terrJob && terrJob.L === L && terrJob.C === (L.C || W.planet.C) ? terrJob : null;
      if (J) { let x; do x = J.g.next(); while (!x.done); terrJob = null; L.terr = W.opts.terrain ? x.value : null; }   // a warm-up was half way: finish it (same result)
      else L.terr = W.opts.terrain ? makeTerrain(hash(L.seed, 0x7e11), L, L.C || W.planet.C) : null; } return L.terr; };
  // v0.0.24 (smooth zoom): the style blend alone (cheap, from the seed) for the system view's discs, so a planet coming into view no
  // longer built its whole terrain inside that frame (14-58 ms at 4x throttle); the terrain itself warms up in slices (below).
  W.styleOf = L => { if (L.depth !== 0 || !W.opts.terrain) return null; if (L.terr) return L.terr.style; return L.sty || (L.sty = styleOf(hash(L.seed, 0x7e11))); };
  // TERRAIN WARM-UP (opts.terrWarm, off = built in the frame that first needs it): while the system is in view, each planet's terrain
  // is baked opts.terrWarmMs per tick (aimed planet first), so landing finds it ready. W.terrOf finishes a half-done warm-up at once.
  let terrJob = null;
  const terrWarm = () => { if (!W.opts.terrWarm || !W.opts.terrain || !W.system || !W.system.planets) return; const S = W.system;
    if (terrJob && (terrJob.L.terr !== undefined || (S.target != null && S.planets[S.target] && S.layerOf(S.planets[S.target]) !== terrJob.L && S.layerOf(S.planets[S.target]).terr === undefined && terrJob.n < 4))) terrJob = null;   // done elsewhere, or a just-started one yields to the aimed planet
    if (!terrJob) { if (cam.z > -1.2) return; let L = null; const tg = S.target != null ? S.planets[S.target] : null;
      if (tg && tg.i !== S.cur && S.layerOf(tg).terr === undefined) L = S.layerOf(tg);
      else for (const p of S.planets) { if (p.i === S.cur) continue; const q = S.layerOf(p); if (q.terr === undefined) { L = q; break; } }
      if (!L) return; terrJob = { L, C: L.C || W.planet.C, n: 0, g: terrainSteps(hash(L.seed, 0x7e11), L, L.C || W.planet.C) }; }
    const J = terrJob, t0 = performance.now(); if (J.C !== (J.L.C || W.planet.C)) { terrJob = null; return; }
    while (performance.now() - t0 < W.opts.terrWarmMs) { J.n++; const x = J.g.next(); if (x.done) { J.L.terr = x.value; terrJob = null; break; } } };
  W.terrWarmBusy = () => !!terrJob;
  // real planet step 1: the home layer's surface IS a sphere (globe.js); the 2D ground is its walked great circle (G.pathH), so
  // the land you see in 3D and the ground the ohms stand on are one surface. Off (opts.globe) = the v0.0.12 sines.
  W.globeOf = L => { if (L.depth !== 0 || !W.opts.globe) return null; if (L.globe !== undefined && L.globeC === (L.C || W.planet.C)) return L.globe;
    const T = W.terrOf(L); if (!T) return (L.globe = null);
    const ring = Math.max(1, Math.round((L.C || W.planet.C) / (W.globeOpts.size || 40)));
    L.globeC = L.C || W.planet.C; L.globe = makeGlobe(globeParams(hash(L.seed, 0x610b), T.style, T.wet, ring, W.globeOpts, L.hue, L.amp)); L.globeV = (L.globeV || 0) + 1; return L.globe; };
  // the ground's shape in h units (before the layer amplitude, the note dents and the water): sines or the globe path + terrain features + changed ground
  W.hU = (L, x, t) => { if (L.depth === 0) x += W.walk; return hX(L, x, t); };
  // spu (optional, the renderer's samples per layer unit): band limit for a layer drawn smaller than its own scale (the next layer in
  // during a zoom, ~3.5 widths on screen): each sine fades out below 4 samples per cycle and is gone at 2, so a polyline of the
  // samples can not alias into a jagged zigzag. Absent = the full terrain (the ground, the sim, the tests).
  const bandK = (spu, fq) => { if (!spu) return 1; const k = (spu / fq - 2) * .5; return k >= 1 ? 1 : k <= 0 ? 0 : k * k * (3 - 2 * k); };
  W.bandK = bandK;
  const hX = (L, x, t, spu) => { const T = L.depth === 0 ? (L.terr !== undefined ? L.terr : W.terrOf(L)) : null, G = T && W.opts.globe ? (L.globe !== undefined ? L.globe : W.globeOf(L)) : null;
    let h; if (G) h = G.pathH(x); else { const f = L.freqs, p = L.phs, sw = L.swirl * t * .05; h = Math.sin(x * f[0] * 6.283 + p[0] + sw) * .6 * bandK(spu, f[0]) + Math.sin(x * f[1] * 6.283 + p[1] - sw * 1.7) * .3 * (.4 + L.rough) * bandK(spu, f[1]) + Math.sin(x * f[2] * 6.283 + p[2]) * .15 * L.rough * bandK(spu, f[2]); }
    if (T) { h += T.addAt(x); if (L.shp && L.shp.any && W.opts.shape.on) h += W.shape.at(L.shp, x) * W.opts.shape.str;   // v0.0.13 (x the v0.0.14 strength slider): the planet's changed ground (shape.js)
      const tw = T.twAt(x); if (tw > .01) { const q = h / .28, fl = Math.floor(q), fr = q - fl, sm = fr < .3 ? 0 : fr > .7 ? 1 : (fr - .3) * 2.5; h += tw * ((fl + sm * sm * (3 - 2 * sm)) * .28 - h); } h *= 1 - T.flat; }
    return h; };
  W.hRaw = 0; W.cave = null; W.hasWater = L => { const T = L.depth === 0 ? W.terrOf(L) : null; if (!T) return false; return W.opts.globe && W.globeOf(L) ? true : T.wl > -1e8; };
  W.height = (L, x, t, spu) => { if (L.depth === 0) x += W.walk; const h = hX(L, x, t, spu), T = L.depth === 0 ? L.terr : null, G = T ? L.globe : null;
    const i = ((Math.floor(x * W.N) % W.N) + W.N) % W.N; let y = h * L.amp + L.dent[i] * .04;
    if (G) { // caves (T1 "Caves with roofs"): the walkable floor drops under a rock roof; water from the globe (sea, lakes, rivers) + the season (T4)
      W.cave = null; if (G.caves.length && W.opts.caves !== false) { const cv = G.caveAt(x); if (cv.d > 0) { y -= cv.d * L.amp; W.cave = cv; } }
      const wl0 = G.pathWL(x); W.hRaw = y; if (wl0 > -1e8 && !W.cave) { const wl = (wl0 + .08 * (W.shape ? W.shape.season || 0 : 0) * T.wet) * L.amp; if (y < wl) y = wl; } return y; }
    if (T && T.wl > -1e8) { W.hRaw = y; const wl = T.wl * L.amp; if (y < wl) y = wl; } return y; };
  // 1a DEPTH LAYERS: the home layer's back ridges are the real land behind the path (globe lanes d widths away, across +n), so the
  // mountains, sea and lakes you see behind are the planet's own. f = ridge depth (0 farthest .. 1 front). W.laneM = the material lane
  // sample (Uint8 x6 at W.laneI), W.backWet = that sample is under water. Off (opts.globeBack false) = the old offset copies of the path.
  W.laneD = f => { const g = 1 - f; return Math.round((g * g * 22 + g * 1.5) * 2) / 2; };
  W.laneM = null; W.laneI = 0; W.backWet = false;
  W.heightBack = (L, x, t, f) => { const G = L.depth === 0 && W.opts.globeBack !== false ? L.globe : null; if (!G || f >= 1) { W.laneM = null; return W.height(L, x, t); }
    x += W.walk; const lo = G.lane(W.laneD(f), x), T = L.terr; let y = lo.h * L.amp * (1 - (T ? T.flat : 0)); W.hRaw = y; W.laneM = lo.m; W.laneI = lo.i; W.backWet = false;
    if (lo.wl > -1e8) { const wl = (lo.wl + .08 * (W.shape ? W.shape.season || 0 : 0) * (T ? T.wet : 0)) * L.amp; if (y < wl) { y = wl; W.backWet = true; } } return y; };
  // ground under a home-layer x (0..1): 0..1, posted as world.ground
  W.groundAt = x01 => .5 + W.height(W.home, x01, music.now()) / (2 * (W.home.amp + .04));
  // the PHYSICAL ground = the home layer's front ridgeline (render draws exactly this line): world y under world x
  W.FRONT = { base: .54, amp: 1.8, off: 1.7 };
  // steady (no beat pulse: a moving floor would knock ohms into extra notes) and never below sim's floor (bounds.ground), except where v0.0.14 solid ground was cut (floorCut)
  W.floorF = () => sim.bounds.ground * unit(W.vw, W.vh) / W.vh;
  // v0.0.14 SOLID GROUND: the floor dips locally where solid was cut (cracks, craters, deep digs); fraction of vh, like floorF.
  // u = a front-ridge u BEFORE the walk (render's u + off); 0 when nothing was cut (no lookup on the hot path)
  W.floorCut = u => { const P = W.home.shp, O = W.opts.shape; if (!P || !P.anyCut || !O.on || !O.solid || W.home.depth !== 0) return 0;
    const c = W.shape.cutAt(P, u + W.walk); if (c < 1e-4) return 0; const f = W.floorF(); const v = Math.min(.985 - f, .09 * c * O.str); return v > 0 ? v : 0; };
  sim.groundAt = x => { const u = ux(x) + W.FRONT.off, h = W.height(W.home, u, music.now());
    return Math.min(W.FRONT.base - h * W.FRONT.amp, W.floorF() + W.floorCut(u)) * W.vh / unit(W.vw, W.vh); };
  sim.groundDrawn = true;
  // ---- the place as a source (autojam presence, influence/matrix 'world.terrain', 'place.heal', 'place.harmony') ----
  // x, y = world units (body positions); the place = the layer the camera is in. Pure reads of layer data, 0..1.
  // heal: calm places (low trip) + music recently played there (note dents) heal; never below .5 so autojam stays alive.
  // harmony: how consonant the layer's key is with home (its chain of just ratios) + how smooth its terrain is.
  const dentAt = (L, x01) => { x01 = W.u0(L, x01); return L.dent[((Math.floor(x01 * W.N) % W.N) + W.N) % W.N]; };
  W.tripK = v => { const T = W.trippy; return W.opts.tripDirect === false || !T || T.opts.tripWorld ? 1 : v == null ? T.value() : v; };   // trippy gate for world.look.trip readers (tripDirect)
  W.healAt = (x, y) => { const L = W.layer(Math.round(cam.z)); return Math.min(1, .5 + .3 * (1 - L.trip) + .2 * Math.min(1, Math.abs(dentAt(L, ux(x))) / .75)); };
  W.harmonyAt = (x, y) => { const L = W.layer(Math.round(cam.z)); return Math.min(1, .35 + .45 * L.cons + .2 * (1 - L.rough)); };
  W.terrainAt = (x, y) => Math.max(0, Math.min(1, W.groundAt(ux(x) + W.FRONT.off)));
  sim.healAt = W.healAt; sim.harmonyAt = W.harmonyAt; sim.terrainAt = W.terrainAt;
  // ---- terrain pulse (approved vision: terrain deforms and pulses, environment reacts). Context sets the amount (PROPOSAL, toggle):
  // rougher / trippier places, music that has grown, big moments pulse more. Beat = swell, om = a standing wave whose spacing follows
  // the om, notes = ripples + dents. The home front ridge (the physical ground) never moves, so ohm footing stays stable.
  W.deform = (L, u, t, h, beat, barPh, f) => { const a = W.pulse.amt; if (!a || (f === 1 && L.depth === 0)) return h;
    return h * (1 + beat * .5 * a) + a * .014 * (1 - .5 * f) * Math.sin(u * 12.566 * music.om / 64 + L.phase) * Math.sin(barPh * 6.283 + u * 3); };
  // ---- music -> world: notes leave ripples + slow lasting dents in the layer you are looking at ----
  bus.on('note', ev => { if (ev.kind === 'release' || ev.kind === 'damp' || ev.kind === 'level') return;
    const L = W.layer(Math.round(cam.z)), x = ev.src && ev.src.scale === 'ohm' ? ux(ev.src.body ? ev.src.body.x : 0) : (ev.deg == null ? .5 : ((ev.deg % 7) + 7) % 7 / 7);
    const v = ev.vel == null ? .5 : ev.vel; W.look.notes = (W.look.notes || 0) + 1; W.ripples.push({ x, t: music.now(), a: v, hue: (L.hue + (ev.deg || 0) * 51) % 360 }); if (W.ripples.length > 24) W.ripples.shift();
    const i = ((Math.floor(W.u0(L, x) * W.N) % W.N) + W.N) % W.N; for (let k = -3; k <= 3; k++) { const j = (i + k + W.N) % W.N; L.dent[j] = Math.max(-1.5, Math.min(1.5, L.dent[j] - v * .25 * (1 - Math.abs(k) / 4))); } });
  // ---- zoom state (camera lives in view.js so render and every hit test share it) ----
  W.setZoom = z => { setDepth(z); cam.v = 0; };
  bus.on('harmony.push', () => { W.bang(.5); });
  // BIG MUSICAL MOMENT (12:27): a separate signal from burst, raised ONLY by real musical peaks (songs.js: a song's climax, a section
  // drop, a big group cadence) - never by om/key changes, landing, zoom detents or life spawns. look.big 0..1 (st.big in the look's
  // frame state) jumps to the moment's strength and fades over ~2 bars; each one also posts bus { type: 'moment', kind: 'climax' |
  // 'drop' | 'cadence', k 0..1, x, y, song, group }. Visuals keys the swell to it. Toggle: W.opts.moments (default on).
  W.moment = (k, kind, info) => { if (W.opts.moments === false || !(k > 0)) return; k = Math.min(1, k); W.look.big = Math.max(W.look.big, k);
    bus.post(Object.assign({ type: 'moment', kind, k }, info || {})); };
  W.bang = k => { W.look.burst = Math.max(W.look.burst, Math.min(1, k)); };   // burst is 0..1 (header contract): song start/end asked 1.2 / 2.2
  let settled = null, lastDepth = 0, pendingOm = null, lastKey = music.key, lastRoot = music.chord && music.chord.root, lastOm = music.om, lastJam = !!music.jam, lastB = music.beat();
  const post = (k, v) => { const g = sim.sig.global; if (g[k] != null && Math.abs(g[k] - v) < 2e-3) return; bus.ctl('global', k, v); };
  const tempoOf = L => W.opts.ctxTempo ? W.planet.tempoFor(L) : L.tempo;   // 5a C (context) or the layer's own seeded ratio
  W.uOf = x => ux(x) + W.FRONT.off + W.walk;   // world x -> planet position (home widths)
  createShape(W, sim, bus, music, hash, post); createEnv(W, sim, bus, music, post);
  // v0.0.24 smooth zoom (opts.camFrame): the camera spring (and the dive camera, dive.js D.frame) runs once per DRAWN frame from main.js,
  // not on the ~21-25 ms control clock (which gave 0 or 2 steps in some frames: a judder on every snap); the control tick still covers it when drawing stops
  let frameT = -1e9;
    // directional snap: when no fingers are zooming, the camera springs into the layer you were heading for (PROPOSAL, toggle)
  const camSnap = dt => {
    if (!cam.active && !cam.lockZ && !(W.zl && W.zl.dive && W.zl.dive.o)) { if (W.opts.snap && !cam.noSnap) {   /* cam.noSnap: rare.js, resting in the slow band while the next scale is closed */   /* inside an ohm (dive.js) the camera holds; the dive snaps its own depth */ const target = cam.dir > 0 ? Math.ceil(cam.z - .2) : cam.dir < 0 ? Math.floor(cam.z + .2) : Math.round(cam.z);
        cam.v += ((target - cam.z) * 40 - cam.v * 11) * dt; if (cam.v || cam.z !== target) setDepth(cam.z + cam.v * dt); if (Math.abs(target - cam.z) < 1e-3 && Math.abs(cam.v) < 1e-3) { setDepth(target); cam.v = 0; } }
    } };
  W.frame = dt => { if (W.opts.camFrame === false) return; frameT = performance.now(); dt = Math.min(.05, Math.max(0, dt)); camSnap(dt); if (W.zl && W.zl.dive) W.zl.dive.frame(dt); };
  W.tick = dt => { const t = music.now();
    if (!(W.opts.camFrame !== false && performance.now() - frameT < 120)) camSnap(dt);
    for (const L of W.layers.values()) for (let i = 0; i < W.N; i++) L.dent[i] *= Math.exp(-dt / 25);   // dents relax over ~25 s
    const d = Math.round(cam.z), still = !cam.active && Math.abs(cam.z - d) < .01;
    if (still && d !== lastDepth) { if (settled !== d) { settled = d; const L = W.layer(d); bus.post({ type: 'world.layer', depth: d, layer: L }); W.bang(1);
        const at = music.timeOfBeat(Math.ceil(music.beat(t) / 4 + 1e-6) * 4);
        if (W.opts.layerKey || W.opts.layerTempo) pendingOm = { om: W.opts.layerKey ? (d < 0 && W.opts.planet && W.system.opts.on && W.system.opts.keepKey ? W.home.om : L.om) : null, bpm: W.opts.layerTempo ? ((pendingOm && pendingOm.bpm) || 1) * tempoOf(L) / W.curTempo : null, at }; if (W.opts.layerTempo) W.curTempo = tempoOf(L); } lastDepth = d; }   // key + tempo land on the next bar (MUSIC_GOOD 14); tempo is relative so your taps stay
    if (pendingOm && t >= pendingOm.at) { const P = pendingOm; pendingOm = null;
      if (P.om != null && Math.abs(music.om - P.om) > .01) bus.set(null, 'music.om', P.om);
      if (P.bpm != null && !music.lock && Math.abs(P.bpm - 1) > 1e-3) bus.set(null, 'music.bpm', Math.max(20, Math.min(240, music.bpm * P.bpm))); }
    const L = W.layer(d), o = sim.ohm;
    post('world.depth', d); post('world.zoom', cam.z - Math.floor(cam.z)); post('layer.bright', L.bright); post('layer.rough', L.rough); post('layer.timbre', L.timbre); post('layer.tempo', L.tempo / 2); post('place.harmony', W.harmonyAt(0, 0));
    post('world.ground', Math.max(0, Math.min(1, W.groundAt(ux(o && o.body ? o.body.x : 0) + W.FRONT.off))));
    for (const th of sim.things || []) if (th.auto) th.y = sim.groundAt(th.x) - th.r;   // things sit on the terrain
    lookTick(dt, t, L);
    // v0.0.30 tripDirect (ON): with tripWorld OFF (50345f3) world.look.trip is no longer scaled by trippy, so the pulse, render's palette
    // and burst bloom take the trippy gate themselves (W.tripK: st.trippy / trippy.value()); with tripWorld ON it is already in look.trip (x1, never twice). Off = unscaled.
    const pa = W.opts.pulse ? Math.min(1.2, .3 + .3 * L.rough + .25 * W.look.trip * W.tripK() + .25 * W.look.dev + .4 * W.look.burst) : 0;
    W.pulse.amt += (pa - W.pulse.amt) * Math.min(1, dt * 2); if (!W.opts.pulse && W.pulse.amt < .01) W.pulse.amt = 0; post('world.pulse', W.pulse.amt / 1.2);
    W.planet.tick(dt, L, W.look); W.galaxy.tick(dt); W.system.tick(dt); W.zl.tick(dt);
    if ((++tagN & 15) === 0) { const k = W.system.key(W.system.cur); for (const o of sim.ohms) if (o.pl == null) o.pl = k; }   // new ohms live where they were born
    placeTick(); W.env.tick(dt, t); terrTick(t); terrWarm(); };
  // ---- v0.0.12 THE PLACE (terrain.js): where you are on the planet (your focus ohm's spot) -> W.place, read every frame by render
  // and Visuals (palette hooks, see NOTES_DEV); the music side lands on bar lines: the region's leaning (harmony.place vote), its
  // tempo feel, its ground material (matrix sources ground.hard / ground.hollow / ground.wet) and the shared room (hard ground echoes).
  W.place = { on: false, u: 0, w: null, region: 0, n: 0, bright: .5, rough: .5, lush: 0, feel: 1, tight: .5, timbre: .5, hard: 0, hollow: 0, wet: 0, mode: '', style: null, lead: '', pal: null, mark: null, markD: 9 };
  const vote12 = new Float32Array(12); let placeBar = -1, landed = -1, roomSent = {}, H0 = false;
  W.placeU = () => { const o = sim.ohm; return ux(o && o.body ? o.body.x : 0) + W.FRONT.off + W.walk; };
  const terrTick = t => { const T = W.terrOf(W.home), P = W.place; P.on = !!T && Math.round(cam.z) === 0; if (!T) return;
    const u = P.u = W.placeU(); W.shape.tick(t, u, P.on); const SC = W.shape.cur;
    if (T.wl > -1e8) { if (T.wl0 == null) T.wl0 = T.wl; T.wl = T.wl0 + .08 * W.shape.season * T.wet; }   // T4: the sea rises and falls with the season
    T.at(u, P, W.home.rough, SC ? .9 * W.shape.roughAt(SC, u) : 0, SC ? W.shape.lushAt(SC, u) : 0);   // the leanings follow the changed ground
    P.style = T.style; P.lead = T.lead; P.n = T.regions.length; P.mode = T.mode(P);
    W.env.lean(P);   // 1a: the land under you (material, cave) leans the place's sound
    let md = 9, mk = null; for (const R of T.regions) if (R.lm) { const d = Math.abs(T.du(u, R.lm.u)); if (d < md) { md = d; mk = R.lm; } } P.mark = mk; P.markD = md;
    const lm = Math.max(0, 1 - md / 1.5);
    const bar = Math.floor(music.beat(t) / 4); if (bar === placeBar) return; placeBar = bar;   // the music side lands on the bar line
    if (!P.on) { post('place.landmark', 0); if (H0) { H0 = false; bus.post({ type: 'harmony.place', w: null }); } if (W.opts.placeFeel) music.feel = null; return; }
    H0 = true; bus.post({ type: 'harmony.place', w: T.vote(P, vote12).slice(), region: P.region, bright: P.bright });
    post('ground.hard', P.hard); post('ground.hollow', P.hollow); post('ground.wet', P.wet); post('place.timbre', P.timbre); post('place.bright', P.bright);
    post('place.feel', Math.max(0, Math.min(1, .5 + Math.log2(P.feel) / 2))); post('place.landmark', lm);
    if (W.opts.placeFeel) music.feel = P.tight;
    if (P.region !== landed) { const first = landed < 0; landed = P.region; bus.post({ type: 'world.region', region: P.region, mode: P.mode });
      // PROPOSAL opts.placeTempo 'lean' | 'off': arriving in a region leans the tempo toward its feel (half way in log2, snapped to a shared-downbeat ratio)
      if (!first && W.opts.placeTempo === 'lean' && W.opts.layerTempo && !pendingOm) { const want = Math.pow(2, Math.log2(T.regions[P.region].feel) * .5), SN = [2 / 3, 3 / 4, 4 / 5, 1, 5 / 4, 4 / 3, 3 / 2];
        let best = 1; for (const q of SN) if (Math.abs(Math.log2(q / want)) < Math.abs(Math.log2(best / want))) best = q; const rel = best / (W.regionTempo || 1); W.regionTempo = best;
        if (Math.abs(rel - 1) > 1e-3) pendingOm = { om: null, bpm: rel, at: music.timeOfBeat((bar + 1) * 4) }; } }
    // PROPOSAL opts.room: the ground is the room - hard ground echoes (longer, wetter tail), wet ground dulls it, hollows add size
    const A = W.audio; if (A && A.params && A.send) { const B = A.params, on = W.opts.room, cl = (v, a, b) => Math.max(a, Math.min(b, v));
      const want = { revFb: cl(B.revFb + (on ? .09 * P.hard + .04 * P.hollow - .05 * P.wet : 0), .3, .93), revMix: cl(B.revMix * (on ? 1 + .4 * P.hard + .15 * P.hollow - .2 * P.wet : 1), 0, 2), revDamp: cl(B.revDamp + (on ? .35 * P.wet - .1 * P.hard : 0), 0, .95) };
      for (const k in want) if (roomSent[k] == null || Math.abs(roomSent[k] - want[k]) > .01) { roomSent[k] = want[k]; A.send({ t: 'param', k, v: want[k] }); } } };
  // per-ohm 'place.heal' / 'place.harmony' streams for the matrix, round robin (<= 24 ohms a frame, posted only on change)
  let tagN = 0, rr = 0; const placeTick = () => { const os = sim.ohms || [], n = Math.min(24, os.length);
    for (let k = 0; k < n; k++) { const o = os[rr++ % os.length]; if (!o.body || o.parked) continue; const s = sim.sig[o.id] || {}, h = W.healAt(o.body.x, o.body.y), m = W.harmonyAt(o.body.x, o.body.y);
      if (s['place.heal'] == null || Math.abs(s['place.heal'] - h) > .01) bus.ctl(o, 'place.heal', h); if (s['place.harmony'] == null || Math.abs(s['place.harmony'] - m) > .01) bus.ctl(o, 'place.harmony', m); } };
  // ---- the look's world state (13A+B+D): realism <-> trippy from context, bursts at big musical events ----
  const TEN = [0, .55, .4, .5, .8, .35, .9];   // chord degree -> tension (I .. vii), PROPOSAL
  const lookTick = (dt, t, L) => { const lk = W.look, M = W.lookMix, b = music.beat(t);
    if (music.key !== lastKey) { lastKey = music.key; W.bang(.8); }
    if (music.om !== lastOm) { lastOm = music.om; W.bang(.8); }
    const rt = music.chord && music.chord.root; if (rt !== lastRoot) { lastRoot = rt; W.bang(.25); }
    if (!!music.jam !== lastJam) { lastJam = !!music.jam; if (lastJam) W.bang(.7); }
    lk.burst *= Math.exp(-Math.max(0, b - lastB) / 4); lk.big *= Math.exp(-Math.max(0, b - lastB) / 4); lastB = b;   // fades over ~2 bars
    lk.rate += ((lk.notes || 0) / Math.max(dt, 1e-3) - lk.rate) * Math.min(1, dt / 20); lk.notes = 0;   // notes per second, ~20 s window
    lk.dev += (Math.min(1, lk.rate / 4) - lk.dev) * Math.min(1, dt / 90);   // the music "developing": builds over minutes of playing, ebbs when quiet
    let n = 0; for (const o of sim.ohms || []) { const sg = sim.sig[o.id]; if (sg && sg['sound.level'] > .03) n++; }
    const jam = Math.min(1, (music.jam ? .5 : 0) + n / 8), ten = Math.min(1, (TEN[rt] || 0) + (music.key ? .2 : 0));
    const target = Math.min(1, L.trip * M.place + jam * M.jam + ten * M.tension + lk.dev * M.dev);
    lk.base = (lk.base == null ? target : lk.base + (target - lk.base) * Math.min(1, dt / 2));
    lk.trip = Math.min(1, lk.base + lk.burst * M.burst); lk.real = 1 - lk.trip;
    post('look.trip', lk.trip); post('look.burst', lk.burst); post('look.big', lk.big); };
  W.goHome = () => { if (W.galaxy.cur !== 0) W.galaxy.enter(0, 0); else if (W.system.cur !== 0) W.land(0); cam.dir = 0; setDepth(0); sim.cam.x = sim.cam.y = 0; cam.v = 0; settled = null; lastDepth = 1e9; };
  // dev panel section (dev builds may show text): world proposals as toggles
  W.attachPanel = root => { const host = root && root.querySelector('#dv-w'); if (!host) return; const w = document.createElement('div');
    w.innerHTML = `<i>world PROPOSALS (defaults on, not decided):</i><label><span>zoom layers set the key (next bar)</span><input type="checkbox" ${W.opts.layerKey ? 'checked' : ''}><i></i></label><label><span>zoom snaps into layers</span><input type="checkbox" ${W.opts.snap ? 'checked' : ''}><i></i></label><label><span>zoom layers set the tempo (next bar)</span><input type="checkbox" ${W.opts.layerTempo ? 'checked' : ''}><i></i></label><label><span>terrain pulses with the music (context amount)</span><input type="checkbox" ${W.opts.pulse ? 'checked' : ''}><i></i></label><div class="row"><button>zoom home</button><button>new world seed</button></div>`;
    const cb = w.querySelectorAll('input'), bt = w.querySelectorAll('button'); cb[0].onchange = () => { W.opts.layerKey = cb[0].checked; }; cb[1].onchange = () => { W.opts.snap = cb[1].checked; }; cb[2].onchange = () => { W.opts.layerTempo = cb[2].checked; }; cb[3].onchange = () => { W.opts.pulse = cb[3].checked; };
    bt[0].onclick = () => { W.goHome(); if (W.opts.layerKey) bus.set(null, 'music.om', W.home.om); }; bt[1].onclick = () => { W.seed = newSeed(); const om = W.home.om; W.layers.clear(); W.home = W.layer(0); W.home.om = om; W.pseed = W.seed; W.planet.seed = hash(W.seed, 0x91a7); W.setRing(4 + (W.planet.seed % 6)); roundHome(); W.walk = 0; W.system.build(); W.galaxy.build(); for (const o of sim.ohms) { o.pl = 0; o.away = false; } keepSeed(); }; host.appendChild(w);
    // v0.0.9 planet proposals (toggles; defaults = the recommendation, not decided)
    const w2 = document.createElement('div'), O = W.opts, P = W.planet;
    const tg = (label, k) => { const l = document.createElement('label'); l.innerHTML = `<span>${label}</span><input type="checkbox" ${O[k] ? 'checked' : ''}><i></i>`; l.querySelector('input').onchange = e => { O[k] = e.target.checked; }; w2.appendChild(l); };
    const sl = (label, get, set, lo, hi, step) => { const l = document.createElement('label'); l.innerHTML = `<span>${label}</span><input type="range" min="${lo}" max="${hi}" step="${step}" value="${get()}"><i>${get()}</i>`; const r = l.querySelector('input'); r.oninput = () => { set(+r.value); l.querySelector('i').textContent = r.value; }; w2.appendChild(l); };
    w2.innerHTML = '<i>planet PROPOSALS (v0.0.9, defaults = rec, not decided):</i>';
    tg('pinch out past home: the ground curves into a round planet', 'planet'); tg('planet hum (om, lower when bigger) fades in at planet size', 'hum');
    tg('walk: two-finger drag spins the planet / walks past the edge at home', 'walk'); tg('context sets tempo across sizes (5a C; off = layer seed only)', 'ctxTempo');
    sl('hum: octaves under the om', () => P.hum.oct, v => { P.hum.oct = v; }, 1, 4, 1); sl('hum level', () => P.hum.level, v => { P.hum.level = v; }, 0, 1, .05);
    for (const k of Object.keys(P.mix)) sl(`5a tempo weight: ${k}`, () => P.mix[k], v => { P.mix[k] = v; }, 0, 1, .05);
    const kl = document.createElement('label'); kl.innerHTML = `<span>12c home planet: same one every launch (proposal; off = a new random planet each launch)</span><input type="checkbox" ${keepOn() ? 'checked' : ''}><i></i>`;
    kl.querySelector('input').onchange = e => { try { localStorage.setItem(SEEDKEY + '.keep', e.target.checked ? '1' : '0'); } catch (x) { } keepSeed(); }; w2.appendChild(kl);
    // v0.0.11 space proposals (toggles; defaults = rec, not decided)
    const SO = W.system.opts, h3 = document.createElement('i'); h3.textContent = 'space PROPOSALS (v0.0.11, defaults = rec, not decided):'; w2.appendChild(h3);
    const tgS = (label, k, on = SO[k], set = v => { SO[k] = v; }) => { const l = document.createElement('label'); l.innerHTML = `<span>${label}</span><input type="checkbox" ${on ? 'checked' : ''}><i></i>`; l.querySelector('input').onchange = e => set(e.target.checked); w2.appendChild(l); };
    const rebuild = () => { W.goHome(); W.system.build(); W.galaxy.build(); for (const o of sim.ohms) { o.pl = 0; o.away = false; } };
    tgS('pinch out past the planet into space (star + orbiting planets)', 'on');
    tgS('Q300 A: neighbours drift toward each other\'s tempo when they jam / heal together (off = fixed multiples)', 'q300', SO.q300 === 'A', v => { SO.q300 = v ? 'A' : 'fixed'; });
    tgS('your ohm + herd-selected ohms travel with you when you land', 'travel'); tgS('in space the key stays your planet\'s (the chord plays instead)', 'keepKey');
    sl('12b planets: at least', () => SO.nMin, v => { SO.nMin = v; rebuild(); }, 1, 8, 1); sl('12b planets: at most', () => SO.nMax, v => { SO.nMax = v; rebuild(); }, 1, 8, 1);
    sl('Q41 lean toward an om overtone (x context; 0 = off)', () => SO.lean, v => { SO.lean = v; }, 0, 1, .05); sl('5b space chord level', () => SO.chord, v => { SO.chord = v; }, 0, 1, .05);
    // step 2 finish: the zoom layer stack (zoomlayers.js; PROPOSALS, defaults ON)
    const ZO = W.zl.opts, h3b = document.createElement('i'); h3b.textContent = 'layers PROPOSALS (planet / system / galaxy; defaults ON):'; w2.appendChild(h3b);
    const tgZ = (label, k) => tgS(label, k, ZO[k], v => { ZO[k] = v; });
    tgZ('the layer stack (off = no galaxy bed, no layer play, no cross-layer leaning)', 'on');
    tgZ('one finger plays space: tap / drag planets, the star, galaxy stars', 'play'); tgZ('going out, the planets fold into one voice per system, then one galaxy bed', 'split');
    sl('planets modulate their galaxy (star glow + bed)', () => ZO.up, v => { ZO.up = v; }, 0, 1, .05); sl('the galaxy leans a new system\'s planets', () => ZO.down, v => { ZO.down = v; }, 0, 1, .05);
    sl('galaxy bed level (x space chord)', () => ZO.bed, v => { ZO.bed = v; }, 0, 1.5, .05);
    // the dive (dive.js, layered zoom first slice): every behaviour + number a PROPOSAL
    const DO = W.zl.dive.opts, h3c = document.createElement('i'); h3c.textContent = 'dive PROPOSALS (inside an ohm: voices / partials / wave; defaults ON):'; w2.appendChild(h3c);
    const tgD = (label, k) => tgS(label, k, DO[k], v => { DO[k] = v; if (k === 'on' && !v) W.zl.dive.leave(); });
    tgD('pinch with the midpoint on an ohm = dive inside it (off = the ground layer opens, as before)', 'on'); tgD('the dive snaps to each inner layer (same spring as the zoom)', 'snap');
    tgD('inside, its notes split: the focus part / partial full, the rest quieter + spread', 'split'); tgD('drag up/down on a part inside changes the ohm\'s sound (voice level / brightness)', 'up');
    tgD('... and its look (hue drifts with the brightness)', 'upLook'); tgD('its state (level, glow, heal) shapes the inside', 'down'); tgD('settling on a new inner layer plays its note once', 'arrive'); tgD('PROPOSAL: shape its sound from inside - sideways on the part / partial in the middle = body material, blend, how partials ring (never pitch)', 'shape'); tgD('fully inside, the world under it is not drawn (speed)', 'hideWorld');
    sl('dive: reach (x ohm radius)', () => DO.reach, v => { DO.reach = v; }, .5, 3, .1); sl('dive: parts away from the focus (level)', () => DO.rest, v => { DO.rest = v; }, 0, 1, .05);
    sl('dive: partials (max)', () => DO.partials, v => { DO.partials = v; W.zl.dive.analyse(true); }, 4, 16, 1); sl('dive: glide momentum (s)', () => DO.glideTau, v => { DO.glideTau = v; }, .1, 3, .1);
    sl('dive: focus magnet (1/s, 0 = off)', () => DO.magnet, v => { DO.magnet = v; }, 0, 6, .1); sl('dive: deepest (3 = wave)', () => DO.maxZ, v => { DO.maxZ = v; }, 1, 3.6, .1);
    tgD('smooth zoom: the world zooms WITH you into the ohm and the ohm glides home going out (off = v0.0.23: world holds, jump on leaving)', 'worldFollow'); tgD('smooth zoom scales the whole picture (world + ohms; off = v0.0.27: black world, ohm trails while diving)', 'followAll'); tgD('smooth zoom world layer from last frame (no mid-frame raster; off = this frame, ~3 ms slower while diving)', 'followPrev'); tgD('zoom fix: the inside\'s light stays a soft glow at every depth (off = v0.0.27: a flash diving partials <-> wave)', 'backSmooth');
    sl('smooth zoom: magnet eases in after letting go (s, 0 = at once)', () => DO.magnetEase, v => { DO.magnetEase = v; }, 0, 1, .05); sl('smooth zoom: let-go glide averaged over (s, 0 = v0.0.23 per move)', () => DO.gvTau, v => { DO.gvTau = v; }, 0, .2, .01);
    // v0.0.12 terrain + place proposals (defaults = rec, not decided)
    const h4 = document.createElement('i'); h4.textContent = 'terrain + place PROPOSALS (v0.0.12, defaults = rec, not decided):'; w2.appendChild(h4);
    const HO = sim.opts.harm || {}, rd = document.createElement('i'); w2.appendChild(rd);
    const reTerr = () => { for (const L of W.layers.values()) if (L.depth === 0) L.terr = L.globe = undefined; for (const p of W.system.planets) if (p.L) p.L.terr = p.L.globe = undefined; };
    tg('terrain: per-planet styles, features, water, regions, landmarks (off = v0.0.11 ground)', 'terrain'); w2.lastChild.querySelector('input').addEventListener('change', reTerr);
    tg('smooth zoom: bake planets\' terrain ahead in slices while the system is in view (off = built in the frame that first needs it)', 'terrWarm');
    tg('smooth zoom: the sky re-bakes a few rows a frame, stars build ahead (off = whole bake in one frame)', 'skyInc');
    tg('smooth zoom: the camera snap + dive camera step once per drawn frame (off = on the music control clock, uneven steps)', 'camFrame');
    const se = document.createElement('label'); se.innerHTML = `<span>the place's pull on the harmony (open question)</span><select><option value="vote">one quiet extra vote (rec)</option><option value="tie">only breaks ties</option><option value="off">off</option></select>`;
    const sv = se.querySelector('select'); sv.value = HO.place || 'vote'; sv.onchange = () => bus.set(null, 'opt.harm.place', sv.value); w2.appendChild(se);
    sl('place vote weight (x one player)', () => HO.placeW == null ? .6 : HO.placeW, v => bus.set(null, 'opt.harm.placeW', v), 0, 2, .05);
    const st2 = document.createElement('label'); st2.innerHTML = `<span>arriving in a region leans the tempo toward its feel (next bar)</span><input type="checkbox" ${O.placeTempo === 'lean' ? 'checked' : ''}><i></i>`; st2.querySelector('input').onchange = e => { O.placeTempo = e.target.checked ? 'lean' : 'off'; }; w2.appendChild(st2);
    tg('a region\'s feel sets how tight the jam snaps (music.feel)', 'placeFeel'); tg('the ground is the room: hard echoes, wet dulls, hollows add size (shared reverb)', 'room');
    // real planet step 1a (PROPOSALS, defaults ON per the plan: rivers, erosion, snow, shadows ON; weather T3, rare life T11)
    const h1a = document.createElement('i'); h1a.textContent = 'real planet 1a (the seeded planet on the ground; defaults ON):'; w2.appendChild(h1a);
    tg('the ground is the seeded planet (globe.js; off = the v0.0.12 sines)', 'globe'); w2.lastChild.querySelector('input').addEventListener('change', reTerr);
    tg('the ridges behind are the real land behind the path (mountains, sea, lakes)', 'globeBack'); tg('the land\'s own colours: grass, sand, snow, rock, mud, sea', 'globeColors'); tg('zoom fix: the real ground fades out as the planet starts to bend (off = v0.0.27: it pops to flat fills when a zoom out starts)', 'realGroundFade'); tg('zoom fix: the planet bend follows every frame (off = v0.0.28: sim tick, the land fade stepped)', 'bendEveryFrame'); tg('zoom fix: the ohms fade out slowly as the land bends (off = v0.0.28: gone at a half bend)', 'ohmFadeWide'); tg('zoom fix: the solar system fades in past half a layer out (off = v0.0.28: popped in at z -.5)', 'spaceFadeIn'); tg('zoom fix: the place\'s ground colours fade out as you zoom away (off = v0.0.28: switched off at half a layer)', 'placeFade'); tg('zoom fix: the real land fades out slowly as the ground bends (off = v0.0.28: over 3 frames)', 'groundFadeWide'); tg('no outlines on the bent home land (off = v0.0.28 green crest lines)', 'bentNoLines'); tg('no outline on the zoom circle edge (off = v0.0.28 ring)', 'noZoomRing'); tg('landing: the planet you are on keeps its real globe out in space, fading to the bent ridges near the sky (off = v0.0.28 flat disc)', 'curGlobe'); tg('landing on another planet: the last picture fades out over 8 frames instead of a hard cut', 'landXfade'); tg('zoom fix: zooming keeps the ridge + ring counts of standing still (off = v0.0.27: fewer ridges while zooming, the land re-lays when a zoom starts / ends)', 'zoomSameDetail');
    tg('zoom: a pinch scales the ground, ohms + things; the sky stays nearly still, far ranges in between (off = v0.0.28: the whole picture zooms)', 'skyHold');
    sl('zoom: the sky moves (x the ground)', () => W.opts.skyPar, v => { W.opts.skyPar = v; }, 0, 1, .05); sl('zoom: the far ranges move (x the ground)', () => W.opts.farPar, v => { W.opts.farPar = v; }, 0, 1, .05);
    sl('zoom: going out, the sky joins the zoom from (layers out)', () => W.opts.skyHandFrom, v => { W.opts.skyHandFrom = v; }, 0, 1, .05); sl('... fully by (layers out)', () => W.opts.skyHandTo, v => { W.opts.skyHandTo = v; }, 0, 1.5, .05);
    tg('zoom ACCENT: the whole picture zooms, sky included (OFF; for a special moment, not used anywhere yet)', 'zoomAccent');
    // v0.0.30 GAMEDEV_SPEC part 2: no outlines anywhere + the look hooks (all ON; off = v0.0.29)
    /* v0.0.30 GAMEDEV_SPEC G1-G9 (all ON, under noOutlines) */ tg('no text: scale nodes are soft pitch-coloured light, numbers only with dev (G1)', 'lnNodeText'); tg('no text: dive Hz labels, voice names and the shaping hint only with dev (G2)', 'diveTextDev'); tg('no outlines: orbits are soft bands (G3)', 'lnOrbits'); tg('no outlines: the ground material band is a soft filled strip (G4)', 'lnBand'); tg('no outlines: terrain cracks are soft (G5)', 'lnCracks'); tg('no outlines: rain streaks are soft (fallback only, G6)', 'lnRain'); tg('no outlines: look paints rare ohm legs too (G7)', 'lnRareLegs'); tg('no outlines: rare placeholder rings are soft light (G8)', 'lnRare'); tg('no outlines: song and jam beads are soft, none when look.group drew (G9)', 'lnBeads');
    tg('no outlines: far-zoom ohm specks and planet sleeping-ohm lights are round soft dots, not squares (G1)', 'lnSpecks'); tg('trippy gate on the palette, burst bloom and pulse when tripWorld is off (off = they use the unscaled mix)', 'tripDirect'); tg('pinch: the zoom circle inner layer draws no sky of its own while the sky is held, no dark disc (H3)', 'zoomSkyOnce'); tg('pinch: the zoom circle edge is a soft fade, not a hard cut (H3)', 'zoomFeather'); tg('far planet: bent ridges fade as the real globe shows, hazed and calm at rest (H1)', 'calmBent'); tg('flat ridge fills and water run one step past both screen edges, no edge notch (H2)', 'ridgeOverscan'); tg('dive: the whole-voice wave shows only while the voice sounds, scope line dev only (H4)', 'diveWaveEvent'); tg('far zoom: the first 200/120/80/40 ohm specks are Visuals look.node glow dots (H5)', 'nodeCap'); tg('NO OUTLINES (master): every world-side outline is soft light or a fill (off = all the v0.0.29 strokes)', 'noOutlines'); tg('no outlines: ridge crests and the cave rim (off = the teal crest stroke)', 'lnRidge'); tg('no outlines: the bent planet horizon is a soft atmosphere limb (look.planetRim, else a soft band)', 'lnPlanetRim'); tg('no outlines: the globe / planet disc rim', 'lnDiscRim'); tg('no outlines: the old kaleido petals are fills only', 'lnKaleido'); tg('no outlines: the focus waveform ring is a soft glow band (look.scope, else a filled band)', 'lnScope'); tg('no outlines: node circles are filled (labels stay)', 'lnNodes'); tg('no outlines: jam / song rings are soft light pools (look.group, else soft rings + beads)', 'lnGroups'); tg('no outlines: herd selection + call marks are soft light', 'lnHerd'); tg('no outlines: fused links are soft ribbons (look.link)', 'lnFuse'); tg('no outlines: things have no rim strokes', 'lnThings'); tg('no outlines: galaxy rings are soft light (no reach ellipse)', 'lnGalaxy'); tg('no outlines: inside an ohm, the rings, waves and scope are soft fills', 'lnDive'); tg('no outlines: mouth, gesture, ensemble and play-hit hints are soft light', 'lnHints'); tg('ohm halo at 45% colour (off = 90%)', 'haloMute'); tg('look paints the ohm body first (look.ohmBody; skips the plain disc)', 'lookOhmBody'); tg('look paints shaded legs (look.legs; rare ohms keep the stroke legs)', 'lookLegs'); tg('galaxy stars at low colour (25%; off = 90%)', 'galaxyMute'); tg('look paints the galaxy (look.galaxy; off = the world haze)', 'lookGalaxy'); tg('rain falls at the sky scale, not the ground scale (st.skyScale)', 'rainSkyScale'); tg('the sea at half its colour (mutes the seed 42 pink band)', 'seaMute'); tg('each world has its own night band angle (world.env.seed)', 'envSeed'); tg('look.ohm gets each ohm posture (st.post: sing / listen / walk / sleep / jam)', 'ohmPost'); tg('landing: the home shift eases during the cross-fade (no faint double globe)', 'landShiftEase'); tg('look.sky owns the clouds + rain when it drew the sky (off = ours drawn too)', 'skyDefer'); tg('inside an ohm: no placeholder depth title (the ohm / its voices / partials of its body / the wave)', 'diveNoName');
    tg('caves: the floor drops under a rock roof, and sounds hollow', 'caves'); tg('space: thinner, lighter orbit lines and brighter planets', 'orbitThin');
    const eo = (label, k) => { const l = document.createElement('label'); l.innerHTML = `<span>${label}</span><input type="checkbox" ${W.env.opts[k] ? 'checked' : ''}><i></i>`; l.querySelector('input').onchange = e => { W.env.opts[k] = e.target.checked; }; w2.appendChild(l); };
    eo('weather: wind, drifting clouds, rain/snow under thick wet cloud', 'weather'); eo('the wind is heard (a bed that gusts on bar lines)', 'windSound'); eo('rain ticks on the 16th grid', 'rainSound');
    eo('day and night (a day = a whole number of bars, local to where you stand)', 'day'); eo('rare natural life: a hidden spot wakes one wild ohm, once', 'life');
    eo('caves sound hollow (ground.hollow / ground.cave)', 'caveSound'); eo('the land under you leans the sound (rock hard, wet dull)', 'biomeSound');
    setInterval(() => { const P = W.place; rd.textContent = P.on ? `here: planet ${W.home.terr ? W.home.terr.blend() : '-'}, region ${P.region + 1}/${P.n}, leans ${P.mode} (bright ${P.bright.toFixed(2)}), feel x${P.feel.toFixed(2)}, hard ${P.hard.toFixed(2)} hollow ${P.hollow.toFixed(2)} wet ${P.wet.toFixed(2)}${P.mark ? `, nearest ${P.mark.type} ${P.markD.toFixed(1)} widths` : ''}` : 'here: (not on a planet surface)'; }, 1000);
    // v0.0.13 changeable ground (shape.js) - PROPOSALS, defaults = rec, not decided
    const SO2 = O.shape, SH = W.shape, h5 = document.createElement('i'); h5.textContent = 'changeable ground PROPOSALS (v0.0.13, defaults = rec, not decided):'; w2.appendChild(h5);
    const sel = (label, k, opts) => { const l = document.createElement('label'); l.innerHTML = `<span>${label}</span><select>${opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`; const q = l.querySelector('select'); q.value = SO2[k]; q.onchange = () => { SO2[k] = q.value; }; w2.appendChild(l); };
    const cb2 = document.createElement('label'); cb2.innerHTML = `<span>the music changes the ground (off = the seed ground only)</span><input type="checkbox" ${SO2.on ? 'checked' : ''}><i></i>`; cb2.querySelector('input').onchange = e => { SO2.on = e.target.checked; }; w2.appendChild(cb2);
    sel('T1 how you shape it', 'T1', [['A', 'A: two fingers resting on ground + sing/hum (rec)'], ['off', 'off (B drag / C carry: not built)']]);
    sel('T2 what lasts', 'T2', [['A', 'A: what repeats lasts, one-offs fade (rec)'], ['B', 'B: everything lasts'], ['C', 'C: everything fades to the seed']]);
    sel('T3 music damage', 'T3', [['A', 'A: long tension erodes, resolving heals (rec)'], ['B', 'B: only builds (heals still smooth)'], ['off', 'off: no erosion, no heal smoothing']]);
    sel('T4 weather + seasons', 'T4', [['A', 'A: yes, on the music clock, per planet (rec)'], ['B', 'B: weather only'], ['off', 'off (C later)']]);
    sel('T5 ohms reshape', 'T5', [['A', 'A: by genes + context, no roles (rec)'], ['B', 'B: only while they jam'], ['off', 'off: all ohms just raise']]);
    sl('how fast the ground changes (x)', () => SO2.k, v => { SO2.k = v; }, 0, 4, .25);
    // v0.0.14 solid ground + crack + crater - PROPOSALS, defaults = rec, not decided
    const h6 = document.createElement('i'); h6.textContent = 'solid ground, cracks, craters PROPOSALS (v0.0.14, defaults = rec, not decided):'; w2.appendChild(h6);
    const cb3 = document.createElement('label'); cb3.innerHTML = `<span>solid depth: changes can cut below the surface floor</span><input type="checkbox" ${SO2.solid ? 'checked' : ''}><i></i>`; cb3.querySelector('input').onchange = e => { SO2.solid = e.target.checked; }; w2.appendChild(cb3);
    sl('strength: how big the changes look + how deep they cut (x)', () => SO2.str, v => { SO2.str = v; }, .25, 3, .25);
    sel('T6 what cracks the ground', 'T6', [['A', 'A: a huge swell for THIS jam (z vs its recent loudness, sustained) (rec)'], ['B', 'B: any very loud rising bar (absolute)'], ['off', 'off: no cracks']]);
    sl('T6 crack sensitivity (z: lower cracks sooner)', () => SO2.crackZ, v => { SO2.crackZ = v; }, 1, 4, .25);
    sel('T7 craters', 'T7', [['A', 'A: very strong hits (for this jam) on one spot, 3 of 4 bars (rec)'], ['B', 'B: any very strong hit dents a small one'], ['off', 'off: no craters']]);
    sel('T8 crack ring pitch', 'T8', [['A', 'A: the crack\'s shape picks a tone of the current chord (rec)'], ['B', 'B: the chord tone nearest the loudest ohm\'s note'], ['off', 'off: cracks are silent']]);
    // v0.0.15 folds + singing to the ground - PROPOSALS, defaults = rec, not decided
    const h7 = document.createElement('i'); h7.textContent = 'folds + singing to the ground PROPOSALS (v0.0.15, defaults = rec, not decided):'; w2.appendChild(h7);
    sel('T9 folds (creases, pleats)', 'T9', [['A', 'A: sustained tension builds, release relaxes; ohm genes lean direction + sharpness, the jam deepens (rec)'], ['B', 'B: tension only (no genes / context)'], ['off', 'off: no folds']]);
    sl('T9 how much tension folds (x)', () => SO2.foldK, v => { SO2.foldK = v; }, 0, 3, .25);
    sel('T10 singing to the ground (two resting fingers)', 'T10', [['A', 'A: every beat, low voice = wide low rise, high = narrow tall peak, leans to the chord (rec)'], ['C', 'C: same, no harmony lean'], ['B', 'B: v0.0.13 (per bar, low presses, high lifts)']]);
    sl('T10 how much the sung shape follows the harmony (0 = raw pitch)', () => SO2.humH, v => { SO2.humH = v; }, 0, 1, .05);
    const rb = document.createElement('button'); rb.textContent = 'reset this planet\'s changed ground'; rb.onclick = () => SH.reset(); w2.appendChild(rb);
    const rd2 = document.createElement('i'); w2.appendChild(rd2);
    setInterval(() => { const Pl = W.place, C = SH.cur; rd2.textContent = C ? `ground: ${SH.events} changes, ${SH.act.length} growing, ${SH.awake}/${C.nc} chunks awake, raised ${(Pl.raised || 0).toFixed(2)}, season ${(SH.season || 0).toFixed(2)} weather ${(SH.weather || 0).toFixed(2)}${SH.humming() ? ', shaping with your voice' : ''}, saved ${SH.saves} loaded ${SH.loads}, cracks ${C.cracks.length} (${SH.cracks_n || 0} ever), craters ${SH.craters_n || 0}, folds ${C.folds.length} (${SH.folds_n || 0} ever)${C.anyCut ? `, cut here ${SH.cutAt(C, Pl.u || 0).toFixed(2)}` : ''}` : 'ground: (not on a planet surface)'; }, 1000);
    host.appendChild(w2); };
  const keepOn = () => { try { return localStorage.getItem(SEEDKEY + '.keep') === '1'; } catch (e) { return false; } };
  const keepSeed = () => { try { if (keepOn()) localStorage.setItem(SEEDKEY, String(W.seed)); } catch (e) { } };
  keepSeed();
  return W;
}
