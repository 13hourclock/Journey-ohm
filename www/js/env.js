// ENV (real planet step 1a): the living ground around you, read from the seeded globe (globe.js) at your spot.
// Weather (T3, "I also want terrain deformation and a dynamic environment", 9:56 PM Oct 24): wind, cloud and rain at your spot;
// the wind is heard (a noise bed that swells in gusts on the bar line) and rain ticks on the 16th grid ("Keep effects rhythmically
// synced", 4:09 PM Oct 23). Day and night (a day is G.dayBars bars on the music clock, local to where you stand).
// Caves sound hollow (ground.hollow / ground.cave feed the room and the ohms' bodies). The land's own material
// (rock, soil, veg, sand, wet, ice) leans the place's sound (ground.hard / ground.wet).
// Rare natural life (T11, "make life very very rare to encounter naturally but creatable", 7:40 PM Oct 21): a planet has 0-3 hidden
// spots; walking onto one wakes one wild ohm, once. Creating ohms is unchanged (you make them).
// Matrix sources posted: weather.wind, weather.rain, weather.cloud, sky.day, ground.cave. All toggles live in W.env.opts.
import { makeRecipe } from './recipe.js';
import { rng } from './rng.js';
import { cam } from './view.js';
export function createEnv(W, sim, bus, music, post) {
  const E = W.env = { wx: { cloud: 0, wind: 0 }, opts: { weather: true, windSound: true, rainSound: true, day: true, life: true, caveSound: true, biomeSound: true },
    wind: 0, east: 0, cloud: 0, rain: 0, day: 1, cave: 0, inCave: false, m: [0, 0, 0, 0, 0, 0], lifeNear: null, found: 0 };
  Object.defineProperty(E, 'seed', { get: () => W.opts.envSeed !== false ? W.seed : undefined, enumerable: false });   // v0.0.30 C2 envSeed: look.sky's night band reads world.env.seed, so each world gets its own band angle (off = look's fixed seed)
  const cl = v => v < 0 ? 0 : v > 1 ? 1 : v, d = [0, 0, 0], wo = { east: 0, speed: 0 };
  // two world voices (ids 113, 114): the wind bed and the rain ticks (ordinary voices, so the room and mix treat them like any sound)
  const rw = makeRecipe(7113, { name: 'wind' }); Object.assign(rw.synth, { family: 'eVA' });
  Object.assign(rw.synth.genes, { att: .95, dec: .6, sus: 1, rel: .9, cut: .3, reso: .35, fenv: 0, penv: 0, lfoR: .2, lfoP: 0, lfoF: .45, lfoA: .1, noise: 1, noiseCol: .35, perc: 0, sat: 0, detune: 0 });
  rw.mix = { modal: 0, synth: 1 }; rw.fx = []; rw.mods = []; rw.send = .6;
  const rr = makeRecipe(7114, { name: 'rain' }); Object.assign(rr.synth, { family: 'eVA' });
  Object.assign(rr.synth.genes, { att: 0, dec: .05, sus: 0, rel: .06, cut: .8, reso: .2, fenv: .3, penv: 0, noise: 1, noiseCol: .8, perc: .7, sat: 0 });
  rr.mix = { modal: .3, synth: .7 }; rr.fx = []; rr.mods = []; rr.send = .5;
  const VW = sim.add({ id: 113, scale: 'world', recipe: rw.id, hue: 0 }), VR = sim.add({ id: 114, scale: 'world', recipe: rr.id, hue: 0 });
  const ws = { on: false, g: 0 }; let next16 = -1, nextT = 0, gust = 0, gustBar = -1;
  const wind = g => { if (g < .004) { if (ws.on) { bus.note({ src: VW, kind: 'release' }); ws.on = false; } return; }
    if (!ws.on) { bus.note({ src: VW, kind: 'sustain', deg: 0, oct: 0, f: music.om * 2, vel: .5, sustain: 36000, gainK: g / .1 }); ws.on = true; ws.g = g; return; }
    if (Math.abs(ws.g - g) > .003) { bus.note({ src: VW, kind: 'level', gain: g }); ws.g = g; } };
  // rare life spots (per globe, from its seed): 0..3, placed on dry land when first approached
  const spotsOf = G => { if (G.lifeSpots) return G.lifeSpots; const r = rng(((G.P && G.P.seed) || 1) ^ 0x11fe), Cs = G.Cs || 240, n = r() < .4 ? 0 : r() < .7 ? 1 : r() < .85 ? 2 : 3;
    G.lifeSpots = []; for (let k = 0; k < n; k++) G.lifeSpots.push({ u: r() * Cs, seed: (r() * 4294967296) >>> 0, found: false }); return G.lifeSpots; };
  const du = (a, b, C) => { let x = ((a - b) % C + C) % C; return x > C / 2 ? x - C : x; };
  E.tick = (dt, t) => { const L = W.home, G = L && L.globe, on = !!G && Math.round(cam.z) === 0;
    if (!G) { wind(0); return; }
    const u = W.placeU(), Cs = G.Cs || W.planet.C; G.dirOf(u, 0, d);
    // weather at your spot (cloudAt is a few noise octaves: one sample a frame)
    if (E.opts.weather) { G.windAt(d[0], d[1], d[2], t, wo); E.east += (wo.east - E.east) * Math.min(1, dt * 2); E.wind += (wo.speed + E.wx.wind - E.wind) * Math.min(1, dt * 2);
      const cc = G.cloudAt(d[0], d[1], d[2], t); E.cloud += (cc + E.wx.cloud - E.cloud) * Math.min(1, dt * 2);
      const mo = G.lane(0, u), wetM = mo.m[mo.i + 4] / 255, iceM = mo.m[mo.i + 5] / 255;
      for (let k = 0; k < 6; k++) E.m[k] += (mo.m[mo.i + k] / 255 - E.m[k]) * Math.min(1, dt * 3);
      const rn = Math.max(cl((E.cloud - .55) * 3) * (.4 + .6 * cl(wetM * 2 + (L.terr ? L.terr.wet : 0) * .5)), cl(E.wx.storm || 0));   // v0.0.27: + a storm singer's rain (abilities.js)
      E.rain += (rn - E.rain) * Math.min(1, dt); E.snow = iceM > .3; }
    else { E.wind *= .95; E.rain *= .95; E.cloud *= .95; }
    // day: a whole number of bars per day, the sun's angle depends on where you stand
    const bars = music.beat(t) / 4, ph = bars / (G.dayBars || 64) + u / Cs + .25;
    E.day = E.opts.day ? cl(.5 + .7 * Math.cos(ph * 6.2832)) : 1;
    // caves: you (your focus ohm) are under a roof
    const cv = G.caveAt(u); E.inCave = cv.d > 0 && cv.ch < cv.d && W.opts.caves !== false; E.cave += ((E.inCave ? cl((cv.d - cv.ch) * 1.5 + .4) : 0) - E.cave) * Math.min(1, dt * 3);
    // rare life: walking onto a hidden spot wakes one wild ohm (once)
    E.lifeNear = null; if (E.opts.life && on) for (const s of spotsOf(G)) { if (s.found) continue; const x = du(s.u, u, Cs);
      if (Math.abs(x) < 4) { if (s.dry === undefined) s.dry = !(G.pathWL(s.u) > G.pathH(s.u) - .1); if (!s.dry) { s.found = true; continue; } E.lifeNear = s; E.lifeX = x; }
      if (Math.abs(x) < .35 && sim.spawn) { s.found = true; E.found++; const B = sim.bounds, sx = Math.max(B.x0 + .6, Math.min(B.x1 - .6, (sim.ohm && sim.ohm.body ? sim.ohm.body.x : 0) + (x >= 0 ? 1.2 : -1.2)));
        const o = sim.spawn(sx, (sim.groundAt ? sim.groundAt(sx) : B.ground) - 1, s.seed); if (o) o.wild = true; bus.post({ type: 'world.life', u: s.u, src: o }); W.bang && W.bang(.8); } }
    if (t < nextT) return; nextT = t + .1;
    post('weather.wind', E.wind); post('weather.rain', E.rain); post('weather.cloud', E.cloud); post('sky.day', E.day); post('ground.cave', E.cave);
    // the wind is heard: a bed that swells into a gust on some bar lines (the gust's size from the wind field)
    const bar = Math.floor(bars); if (bar !== gustBar) { gustBar = bar; gust = Math.max(gust, ((bar * 2654435761) >>> 0) / 4294967296 < E.wind * .6 ? .6 + .4 * E.wind : 0); }
    gust *= .82; const sh = E.inCave ? .35 : 1;
    wind(on && E.opts.windSound && E.opts.weather ? .05 * sh * cl(E.wind * 1.2 - .1) * (1 + 1.4 * gust) : 0);
    // rain ticks on the 16th grid (scheduled on the music clock), density = rain; none under a roof
    const b16 = Math.floor(music.beat(t) * 4) + 1; if (b16 !== next16) { next16 = b16;
      if (on && E.opts.rainSound && E.rain > .05 && !E.inCave) { const h = ((b16 * 2246822519) >>> 0) / 4294967296; if (h < E.rain * .8) bus.note({ src: VR, f: music.om * (8 + ((h * 1e4) | 0) % 5), vel: .15 + .25 * E.rain, dur: .04, t: music.timeOfBeat(b16 / 4), pan: h * 2 - 1 }); } } };
  // the place's sound leans with the land under you (used by world.js terrTick after the regions' own leanings)
  E.lean = P => { if (!W.home.globe) return; if (E.opts.biomeSound) { const m = E.m; P.hard = cl(P.hard * .6 + .4 * cl(m[0] * 1.4 + m[5] * .8)); P.wet = cl(P.wet * .6 + .4 * cl(m[4] * 1.5 + E.rain * .5)); }
    if (E.opts.caveSound) P.hollow = cl(Math.max(P.hollow, E.cave)); };
  return E;
}
