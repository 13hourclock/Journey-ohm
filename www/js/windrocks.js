// OLD GAME v0.4a WIND ROCKS AND REED BEDS (softsound field.js F.onGrid / F.blowGoal; NOTES v0.4 "wind instruments in the land (hollow rocks,
// reed beds sounding in wind; creatures harmonise) + gene-driven creatures that BLOW WIND to play them"). Switch windRocks (OFF: a taste call).
//   Each planet's home ground gets 1-2 hollow rocks and 1-2 reed beds (seeded by the planet; regrown, never saved, as in the old game where
//   they came from the fields). They are scenery: no gesture reads them (old GESTURES.md section 7: tapping or drawing near them is bare ground).
//   They sound in the wind: on a beat, when the wind there (world.env.wind x the spot's exposure, plus a slow gust of its own) is strong
//   enough, a rock gives a low hollow tone (at most every 2 bars), a reed bed a higher breathy one (at most every bar), with a chance that
//   rises with the wind. An ohm whose sound is BLOWN (a palette row of the blown family: flutes, reeds, duduk ...) breathes on one within
//   about 3 units and plays it even in still air; such an ohm (not yours, not held, settled) drifts gently toward the nearest one.
//   Tuned like the old game: only when an ohm is near (silent otherwise), on the chord sounding now (scale degrees of the key), rocks low,
//   reeds high. Plain soft look (soft fills, a glow when they sound, reeds sway with the wind; no outlines); look.windRock / look.windReed
//   (g, q, x, y, s, { glow, wind, t }) restyle them when present (return true = drawn).
//   Not built: wind farmers (old #13, a tended rock rings longer: with symbiosis), regional keys (old C: one key per place here), reeds in water.
import { makeRecipe, withRow, recipes } from './recipe.js';
import { PALETTE } from './instruments.js';
import { rng } from './rng.js';
import { cam } from './view.js';
export const WIND_OPTS = { on: false, rockGap: 2, reedGap: 1, drive: .55, pMax: .75, pK: .4, windK: 1.4, gustK: .5, blowR: 3.2, blowK: .95, nearR: 9,
  seekR: 5, seekStop: 1.4, seekA: .3, seekV: .15, rockRow: 'shakuhachi', reedRow: 'panpipe', rockHz: [98, 262], reedHz: [392, 1047], vel: [.28, .22] };
const blownRow = id => { const e = id && PALETTE.find(r => r.id === id); return !!e && e.family === 'blown'; };
export function createWindRocks({ sim, bus, music, world, look, caught, opts } = {}) {
  const inBubble = o => !!(caught && caught(o));
  const O = Object.assign({}, WIND_OPTS, opts || {}), R = { opts: O, list: [], seed: null, stats: { rock: 0, reed: 0, blown: 0, seek: 0 } };
  let lastB = null, seekT = 0;
  const home = () => world && world.home && world.home.globe;
  const seedOf = () => { const G = home(); return G && G.P ? G.P.seed >>> 0 : world && world.seed != null ? (world.seed >>> 0) : 1; };
  R.blower = o => { if (o._blowR !== o.recipe) { const rec = recipes.get(o.recipe); o._blowR = o.recipe; o._blow = !!(rec && rec.inst && (blownRow(rec.inst.a) || (rec.inst.w > .5 && blownRow(rec.inst.b)))); } return o._blow; };
  // grow the planet's rocks and reeds (positions as a share of the home ground's width, so a resized view keeps them in place)
  R.grow = seed => { R.seed = seed; R.list.length = 0; const G = home(); if (G && G.P && G.P.style && G.P.style.gas > .5) return R.list;   // a gas giant has no ground for them
    const r = rng((seed * 2654435761 ^ 0x77d1) >>> 0), n = { rock: 1 + (r() < .5 ? 1 : 0), reed: 1 + (r() < .5 ? 1 : 0) }, us = [];
    for (const kind of ['rock', 'reed']) for (let i = 0; i < n[kind]; i++) { let u = 0; for (let k = 0; k < 8; k++) { u = .22 + r() * .7; if (us.every(v => Math.abs(v - u) > .16)) break; } us.push(u);   // left side keeps the drum (sim.js) clear
      const s = (r() * 4294967296) >>> 0, base = makeRecipe(s, { name: 'wind ' + kind, add: false }), rec = withRow(base, kind === 'rock' ? O.rockRow : O.reedRow); recipes.set(rec.id = base.id, rec);
      const q = { kind, k: R.list.length, u, exp: .45 + r() * .55, size: kind === 'rock' ? .5 + r() * .35 : .7 + r() * .5, seed: s, sungB: -99, hit: 0, x: 0, y: 0,
        src: { id: 'wind:' + kind + i, scale: 'thing', seed: s, recipe: rec.id, body: { x: 0, y: 0 } } };
      R.list.push(q); }
    R.place(); return R.list; };
  R.place = () => { const B = sim.bounds; for (const q of R.list) { q.x = B.x0 + q.u * (B.x1 - B.x0); q.y = sim.groundAt ? sim.groundAt(q.x) : B.ground; q.src.body.x = q.x; q.src.body.y = q.y; } };
  const wind = () => { const E = world && world.env; return E ? Math.max(0, +E.wind || 0) : 0; };
  R.driveOf = (q, t, blow) => { const w = wind(), gust = O.gustK * w * Math.pow(Math.max(0, Math.sin(t * .31 + q.k * 1.7)), 2); return q.exp * w * O.windK + gust + (blow ? O.blowK : 0); };
  const fold = (f, lo, hi) => { let x = f; while (x < lo) x *= 2; while (x > hi) x /= 2; return x; };
  // one beat: each rock / reed may sound (returns how many did)
  R.beat = (b, t, at) => { let n = 0; for (const q of R.list) { const gap = (q.kind === 'rock' ? O.rockGap : O.reedGap) * 4; if (b - q.sungB < gap) continue;
      let near = null, bd = O.nearR, blow = null; for (const o of sim.ohms) { if (o.parked || o.dead || !o.body || inBubble(o)) continue; const d = Math.hypot(o.body.x - q.x, o.body.y - q.y); if (d < bd) { bd = d; near = o; } if (d < O.blowR && R.blower(o) && (!blow || d < blow.d)) blow = { o, d }; }
      if (!near) continue; const drive = R.driveOf(q, t, blow); if (drive < O.drive) continue;
      if (rng(((R.seed ^ (q.k * 7919) ^ (b * 104729)) >>> 0) || 1)() > Math.min(O.pMax, drive * O.pK)) continue;
      const tones = (music.chord && music.chord.tones) || [0, 2, 4], deg = tones[((q.k + (b >> 3)) % tones.length + tones.length) % tones.length], rock = q.kind === 'rock';
      const f = fold(music.hz(deg, 0), ...(rock ? O.rockHz : O.reedHz));
      bus.note({ src: q.src, kind: 'note', f, deg, vel: (rock ? O.vel[0] : O.vel[1]) * (1 + .4 * Math.min(1, drive - O.drive)), pos: .3, dur: rock ? 2.2 : 1.1, pan: 0, t: at, lite: false, by: blow ? 'blow' : 'wind' });
      q.sungB = b; q.hit = Date.now(); q.by = blow ? blow.o.id : 0; R.stats[q.kind]++; if (blow) { R.stats.blown++; blow.o.blowT = t; } n++; }
    return n; };
  // a blowing ohm drifts gently toward the nearest rock / reed (horizontal: they sit on the ground)
  R.seek = dt => { for (const o of sim.ohms) { const b = o.body; if (!b || o === sim.ohm || o.parked || o.anchor || inBubble(o) || b.grab || b.flying || !(b.calm > 1.5) || !R.blower(o)) continue;
      let best = null, bd = O.seekR; for (const q of R.list) { const d = Math.abs(q.x - b.x); if (d < bd) { bd = d; best = q; } } if (!best || bd < O.seekStop) continue;
      const s = Math.sign(best.x - b.x); if (Math.abs(b.vx) < O.seekV) { b.vx += s * O.seekA * dt; R.stats.seek++; } } };
  R.tick = dt => { if (!O.on) return; const sd = seedOf(); if (sd !== R.seed) R.grow(sd); if (!R.list.length) return; R.place();
    if (Math.round(cam.z) !== 0) { lastB = null; return; }   // the home ground only (not out in space, not inside a dive layer)
    seekT += dt || 0; if (seekT > .1) { R.seek(seekT); seekT = 0; }
    const bt = music.beat(), b = Math.floor(bt); if (lastB == null) { lastB = b; return; } if (b === lastB) return; lastB = b;
    const t = music.now(), at = t + Math.max(0, (b + 1 - bt)) * music.spb() - music.spb();   // this beat's own time (we are just past it)
    R.beat(b, t, Math.max(t, at)); };
  // soft look: rocks are rounded soft fills with a darker hollow; reeds are thin tapered stalks (fills) that sway with the wind
  R.draw = (g, toS) => { if (!O.on || !R.list.length || Math.round(cam.z) !== 0) return; const L = typeof look === 'function' ? look() : look, now = Date.now(), t = now / 1000, w = wind();
    for (const q of R.list) { const p = toS(q.x, q.y), s = p.s || 50, glow = Math.max(0, 1 - (now - q.hit) / 1500);
      if (L && L[q.kind === 'rock' ? 'windRock' : 'windReed'] && L[q.kind === 'rock' ? 'windRock' : 'windReed'](g, q, p.x, p.y, s, { glow, wind: w, t })) continue;
      g.save();
      if (q.kind === 'rock') { const rw = q.size * s, rh = rw * .62;
        g.fillStyle = `rgba(120,112,104,${.75})`; g.beginPath(); g.ellipse(p.x, p.y - rh * .55, rw, rh, 0, Math.PI, 0); g.lineTo(p.x + rw, p.y); g.lineTo(p.x - rw, p.y); g.fill();
        g.fillStyle = 'rgba(40,36,40,.6)'; g.beginPath(); g.ellipse(p.x + rw * .15, p.y - rh * .5, rw * .2, rh * .26, 0, 0, Math.PI * 2); g.fill();   // the hollow
        if (glow > .01) { const gr = g.createRadialGradient(p.x, p.y - rh * .5, 0, p.x, p.y - rh * .5, rw * 1.6); gr.addColorStop(0, `rgba(255,236,200,${.35 * glow})`); gr.addColorStop(1, 'rgba(255,236,200,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y - rh * .5, rw * 1.6, 0, Math.PI * 2); g.fill(); } }
      else { const n = 7, hw = q.size * s * .5, hh = q.size * s * 1.3;
        for (let i = 0; i < n; i++) { const bx = p.x + (i / (n - 1) - .5) * hw * 2, h = hh * (.7 + .3 * Math.sin(i * 2.3 + q.seed % 5)), sw = (Math.sin(t * (.9 + w) + i * .8) * .5 + .5 + w) * h * .12, wd = Math.max(1.2, s * .035);
          g.fillStyle = `rgba(${150 + 60 * glow | 0},${170 + 40 * glow | 0},${110 + 60 * glow | 0},${.7 + .25 * glow})`; g.beginPath(); g.moveTo(bx - wd, p.y); g.quadraticCurveTo(bx + sw * .4, p.y - h * .5, bx + sw, p.y - h); g.quadraticCurveTo(bx + sw * .4 + wd * .3, p.y - h * .5, bx + wd, p.y); g.fill(); }
        if (glow > .01) { const gr = g.createRadialGradient(p.x, p.y - hh * .6, 0, p.x, p.y - hh * .6, hh); gr.addColorStop(0, `rgba(230,255,210,${.3 * glow})`); gr.addColorStop(1, 'rgba(230,255,210,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y - hh * .6, hh, 0, Math.PI * 2); g.fill(); } }
      g.restore(); } };
  R.info = () => `${R.list.filter(q => q.kind === 'rock').length} rocks ${R.list.filter(q => q.kind === 'reed').length} reeds; sounded rock ${R.stats.rock} reed ${R.stats.reed} (blown ${R.stats.blown}); wind ${wind().toFixed(2)}`;
  return R; }
