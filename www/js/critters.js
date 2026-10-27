// OLD GAME v0.5c / v0.6.1 AMBIENT CRITTERS + RARE SKY EVENTS (softsound critters.js, read only there). Switch critters (OFF: a taste call).
//   Visual only, as in the old game: no bodies, no hit test (old GESTURES.md line 274: a tap on a critter is a tap on bare ground), no
//   sound except the meteor shower's one quiet sparkle. One fixed pool (18 critters, 6 meteor streaks), population checked twice a second
//   near the view, seeded by the planet and the half second (the same planet at the same time grows the same ones).
//    fireflies  at night (day < .35) over land, up to 8, blinking on the beat (each on its own quarter of the beat); gone by day (> .5)
//    fish       in the water on the home ground, up to 5, swimming between the bed and the surface; gone where the water gets shallow
//    birds      a flock of 4-6 by day (> .5) on worlds with air (globe atmo > .2), crossing the sky in a V; gone at dusk (< .25)
//    cloud worlds (gas giants) get jellies (up to 4, slow bob, pulse on the beat) and spore motes (small sinking groups) instead
//    rare       checked once a minute at night (day < .3, not on a gas giant): a meteor shower (4%: 9 s of streaks + three soft high
//               in-key notes half a beat apart) or an aurora on worlds with air (> .3; 3%: 40 s of soft ribbons in the top of the sky)
//   They live in the home scene's world units and slide with the walk (the land moves under them); home ground only (cam.z 0).
//   Plain soft look (fills and soft light, no outlines); look.critter(g, q, x, y, s, { beat, t }) and look.skyEvent(g, e, W, H, { t, streaks })
//   restyle them when present (return true = drawn).
//   Not built: the aurora / meteors are drawn over the far ridges (the under-the-ohms layer), not behind them (that needs a sky hook in
//   render.js / look); critters do not react to ohms or music beyond the beat blink (the old game's did not either).
import { makeRecipe, withRow, recipes } from './recipe.js';
import { rng } from './rng.js';
import { cam } from './view.js';
export const CRIT_OPTS = { on: false, max: 18, maxS: 6, check: .5, flyDay: .35, flyGone: .5, birdDay: .5, birdGone: .25, birdAir: .2, rareDay: .3,
  pMeteor: .04, pAurora: .03, auroraAir: .3, meteorDur: 9, auroraDur: 40, sparkle: true, sparkleRow: 'glockenspiel', sparkleVel: .12, span: 1.3 };
const TAU = Math.PI * 2;
const hash = (...a) => { let h = 2166136261 >>> 0; for (const v of a) { h ^= (v * 2654435761) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; } return (h ^ (h >>> 13)) >>> 0 || 1; };
export function createCritters({ sim, bus, music, world, look, size, opts } = {}) {
  const O = Object.assign({}, CRIT_OPTS, opts || {}), C = { opts: O, pool: [], streaks: [], rare: null, seed: null, stats: { spawned: 0, meteor: 0, aurora: 0, sparkle: 0 } };
  for (let i = 0; i < O.max; i++) C.pool.push({ on: false }); for (let i = 0; i < O.maxS; i++) C.streaks.push({ on: false });
  let chk = 0, seq = 0, lastMin = null, lastWalk = null, src = null;
  const now = () => music.now ? music.now() : Date.now() / 1000;
  const G = () => world && world.home && world.home.globe;
  C.gas = () => { const g = G(); return !!(g && g.P && g.P.style && g.P.style.gas > .5); };
  C.air = () => { const g = G(); return g && typeof g.atmo === 'number' ? g.atmo : .5; };
  C.day = () => { const E = world && world.env; return E && typeof E.day === 'number' ? E.day : 1; };
  const seedOf = () => { const g = G(); return g && g.P ? g.P.seed >>> 0 : world && world.seed != null ? world.seed >>> 0 : 1; };
  const B = () => sim.bounds;
  C.ground = x => sim.groundAt ? sim.groundAt(x) : B().ground;
  // water depth (world units) at x on the home ground: the ground line sits on the water surface where it is wet; world.hRaw is the bed under it
  C.water = x => { if (!world || !world.home || !world.hasWater || !world.height || !world.hasWater(world.home)) return 0; try {
      const k = C.xPerU(); if (!k) return 0; const u = .5 + x / k + (world.FRONT ? world.FRONT.off : 0), h = world.height(world.home, u, now()), raw = world.hRaw;
      const d = (h - raw) * (world.FRONT ? world.FRONT.amp : 1) * C.yPerH(); return d > 0 ? d : 0; } catch (e) { return 0; } };
  C.xPerU = () => { const f = world && world.floorF ? world.floorF() : 0; return f > 0 && world.vh ? B().ground / f * (world.vw / world.vh) : 0; };   // world x units per home-layer u
  C.yPerH = () => { const f = world && world.floorF ? world.floorF() : 0; return f > 0 ? B().ground / f : 1; };   // world y units per fraction of vh
  const free = () => C.pool.find(q => !q.on);
  C.count = k => { let n = 0; for (const q of C.pool) if (q.on && q.kind === k) n++; return n; };
  C.alive = () => C.pool.filter(q => q.on).length;
  const spawn = (kind, x, alt, o = {}) => { const q = free(); if (!q) return null; const r = rng(hash(C.seed, ++seq, 0xc417)); const t = now();
    Object.assign(q, { on: true, kind, x, alt, a0: alt, v: o.v != null ? o.v : (r() - .5) * .6, ph: r() * TAU, t0: t, life: o.life || 20 + r() * 25, k: seq, flock: o.flock || 0 }); C.stats.spawned++; return q; };
  C.clear = why => { C.stats.clears = (C.stats.clears || 0) + 1; C.stats.why = why || ''; for (const q of C.pool) q.on = false; for (const s of C.streaks) s.on = false; C.rare = null; };
  // the walk: the land slides under them (critters keep their place in the land)
  const follow = () => { const w = world ? world.walk || 0 : 0; if (lastWalk == null) { lastWalk = w; return; } let du = w - lastWalk; lastWalk = w; if (!du) return;
    const Cp = world.planet && world.planet.C; if (Cp && Math.abs(du) > Cp / 2) du -= Math.sign(du) * Cp; const k = C.xPerU(); if (!k) return; if (Math.abs(du * k) > 40) { C.clear('jump'); return; }
    for (const q of C.pool) if (q.on) q.x -= du * k; };
  // move + retire (every frame)
  C.move = dt => { const t = now(), day = C.day(), b = B(), span = (b.x1 - b.x0) * O.span;
    for (const q of C.pool) { if (!q.on) continue; q.x += q.v * dt;
      if (q.kind === 'fly') q.alt = Math.max(.12, q.a0 + Math.sin(t * .9 + q.ph) * .28);
      else if (q.kind === 'fish') { const d = C.water(q.x); if (d < .2) { q.on = false; continue; } q.alt = -(d * q.a0 + Math.sin(t * .7 + q.ph) * Math.min(.12, d * .15)); }
      else if (q.kind === 'bird') q.alt = q.a0 + Math.sin(t * .5 + q.ph) * .2;
      else if (q.kind === 'jelly') q.alt = q.a0 + Math.sin(t * .4 + q.ph) * .44;
      else if (q.kind === 'mote') q.alt = Math.max(.6, q.alt - dt * (.08 + (q.k % 3) * .04));
      if (Math.abs(q.x - (b.x0 + b.x1) / 2) > span || t - q.t0 > q.life || (q.kind === 'fly' && day > O.flyGone) || (q.kind === 'bird' && day < O.birdGone)) q.on = false; } };
  // population near the view (twice a second, seeded)
  C.populate = () => { const t = now(), day = C.day(), b = B(), r = rng(hash(C.seed, Math.floor(t * 2), 0xc2)), x = b.x0 + r() * (b.x1 - b.x0), w = b.x1 - b.x0;
    if (C.gas()) { if (C.count('jelly') < 4 && r() < .35) spawn('jelly', x, 1.6 + r() * 6, { v: (r() - .5) * .32, life: 30 + r() * 30 });
      if (C.count('mote') < 9 && r() < .6) { const n = 2 + Math.floor(r() * 3), a0 = 2.4 + r() * 6; for (let k = 0; k < n; k++) spawn('mote', x + (k - n / 2) * .28, a0 + k * .18, { v: (r() - .5) * .2, life: 18 + r() * 14 }); } return; }
    const wet = C.water(x) > .25;
    if (day < O.flyDay && !wet && C.count('fly') < 8 && r() < .7) spawn('fly', x, .36 + r() * 1.2, { v: (r() - .5) * .48 });
    if (wet && C.count('fish') < 5 && r() < .5) spawn('fish', x, .25 + r() * .5, { v: (r() < .5 ? -1 : 1) * (.28 + r() * .36) });   // a0 = depth fraction between the surface and the bed
    if (day > O.birdDay && C.air() > O.birdAir && C.count('bird') === 0 && r() < .08) { const dir = r() < .5 ? -1 : 1, x0 = (b.x0 + b.x1) / 2 - dir * w * .62, n = 4 + Math.floor(r() * 3), a = 4 + r() * 1.2;
      for (let k = 0; k < n; k++) { const row = Math.ceil(k / 2), side = k % 2 ? 1 : -1; spawn('bird', x0 - dir * row * .28 + side * .06 * row, a + row * .16, { v: dir * 1.1, life: 30, flock: 1 }); } } };
  // rare sky events: checked once a minute at night, seeded per planet; C.force(kind) for tests
  C.force = k => { const t = now(); C.rare = { k, t0: t, dur: k === 'meteor' ? O.meteorDur : O.auroraDur, next: t }; C.stats[k]++; if (k === 'meteor') C.sparkle(); return C.rare; };
  C.rareTick = () => { const t = now(), day = C.day();
    if (!C.rare) { const m = Math.floor(t / 60); if (m !== lastMin) { const first = lastMin == null; lastMin = m; if (!first && day < O.rareDay && !C.gas()) { const u = rng(hash(C.seed, m, 0x5a7e))(); if (u < O.pMeteor) C.force('meteor'); else if (u < O.pMeteor + O.pAurora && C.air() > O.auroraAir) C.force('aurora'); } } }
    const e = C.rare; for (const s of C.streaks) if (s.on && t - s.t0 > s.life) s.on = false; if (!e) return; if (t > e.t0 + e.dur) { C.rare = null; return; }
    if (e.k === 'meteor' && t >= e.next) { const r = rng(hash(C.seed, Math.floor(t * 10), 0x57)); e.next = t + .35 + r() * .5; const s = C.streaks.find(q => !q.on);
      if (s) Object.assign(s, { on: true, x: .15 + r() * .9, y: r() * .3, vx: -(.5 + r() * .4), vy: .35 + r() * .25, t0: t, life: .6 + r() * .5 }); } };
  // the shower's one quiet sparkle: three soft high in-key notes (degrees 4, 2, 0), half a beat apart
  C.sparkle = () => { if (!O.sparkle || !bus || !music.hz) return 0; if (!src) { const s = hash(C.seed || 1, 0x5b); const base = makeRecipe(s, { name: 'meteor sparkle', add: false }), rec = withRow(base, O.sparkleRow); recipes.set(rec.id = base.id, rec); src = { id: 'sky:meteor', scale: 'thing', seed: s, recipe: rec.id, body: { x: 0, y: B().y0 } }; }
    const t = now() + .05, spb = music.spb ? music.spb() : .5; let n = 0; for (let k = 0; k < 3; k++) { let f = music.hz([4, 2, 0][k], 0); while (f < 1300) f *= 2; while (f > 2700) f /= 2;
      bus.note({ src, kind: 'note', f, deg: [4, 2, 0][k], vel: O.sparkleVel, pos: .2, dur: .9, pan: 0, t: t + k * spb * .5, lite: true, by: 'sky' }); n++; } C.stats.sparkle++; return n; };
  C.tick = dt => { if (!O.on) return; const sd = seedOf(); if (sd !== C.seed) { C.seed = sd; C.clear('planet'); src = null; lastWalk = null; }
    if (Math.round(cam.z) !== 0) return; follow(); C.move(dt || 0); C.rareTick(); const t = now(); if (t < chk) return; chk = t + O.check; C.populate(); };
  const L = () => typeof look === 'function' ? look() : look;
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  C.pos = q => { const gy = C.ground(q.x); return { x: q.x, y: q.kind === 'jelly' || q.kind === 'mote' ? B().ground - q.alt : gy - q.alt }; };
  // world-space critters (under the ohms): tiny soft shapes
  C.draw = (g, toS) => { if (!O.on || Math.round(cam.z) !== 0) return; const lk = L(), t = now(), bf = (music.beat ? music.beat() : t * 2) % 1;
    C.drawSky(g, lk, t);
    for (const q of C.pool) { if (!q.on) continue; const w = C.pos(q), p = toS(w.x, w.y), s = (p.s || 50) / 50, sg = q.v >= 0 ? 1 : -1;
      if (lk && lk.critter && lk.critter(g, q, p.x, p.y, p.s || 50, { beat: bf, t })) continue; g.save();
      if (q.kind === 'fly') { const gl = Math.max(.15, 1 - ((bf + (q.k % 4) * .25) % 1) * 2.5); g.fillStyle = rgba([230, 255, 140], .25 + .7 * gl); g.beginPath(); g.arc(p.x, p.y, (1.6 + gl * 1.4) * s, 0, TAU); g.fill();
        if (gl > .6) { g.fillStyle = rgba([230, 255, 140], .12 * gl); g.beginPath(); g.arc(p.x, p.y, 7 * s, 0, TAU); g.fill(); } }
      else if (q.kind === 'fish') { const c = [255, 200, 120], wg = Math.sin(t * 8 + q.ph) * 1.5 * s; g.fillStyle = rgba(c, .5); g.beginPath(); g.ellipse(p.x, p.y, 6 * s, 2.6 * s, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(p.x - sg * 5 * s, p.y); g.lineTo(p.x - sg * 10 * s, p.y - 3 * s - wg); g.lineTo(p.x - sg * 10 * s, p.y + 3 * s - wg); g.closePath(); g.fill(); }
      else if (q.kind === 'jelly') { const c = [190, 170, 255], pu = .5 + .5 * Math.sin(t * 2.2 + q.ph), bb = Math.max(0, 1 - bf * 3), r = (5 + pu * 1.5) * s;
        g.fillStyle = rgba(c, .22 + .25 * bb); g.beginPath(); g.ellipse(p.x, p.y, r, r * .7, 0, Math.PI, TAU); g.fill();
        g.fillStyle = rgba(c, .18); for (const o of [-3, 0, 3]) { const L2 = (11 + pu * 3) * s, sw = Math.sin(t * 1.7 + o) * 2 * s; g.beginPath(); g.moveTo(p.x + o * s - .6, p.y); g.quadraticCurveTo(p.x + o * s + sw, p.y + L2 * .5, p.x + o * s, p.y + L2); g.quadraticCurveTo(p.x + o * s + sw + 1.2, p.y + L2 * .5, p.x + o * s + .6, p.y); g.fill(); } }
      else if (q.kind === 'mote') { const c = [255, 220, 170], gl = .5 + .5 * Math.sin(t * 1.3 + q.ph); g.fillStyle = rgba(c, .25 + .35 * gl); g.beginPath(); g.arc(p.x, p.y, (1.3 + gl) * s, 0, TAU); g.fill(); }
      else { const f = Math.sin(t * 9 + q.ph) * 3.5 * s; g.fillStyle = 'rgba(40,38,52,.6)';   // a bird: two thin filled wings (no stroke)
        for (const d of [-1, 1]) { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + d * 5 * s, p.y - f - .9 * s); g.lineTo(p.x + d * 5.4 * s, p.y - f + .5 * s); g.lineTo(p.x, p.y + 1.2 * s); g.closePath(); g.fill(); } }
      g.restore(); } };
  // screen-space sky: aurora ribbons (soft filled bands) and meteor streaks (tapered fills)
  C.drawSky = (g, lk, t) => { const e = C.rare, live = C.streaks.some(s => s.on); if (!e && !live) return; const sz = size ? size() : null, W = sz ? sz.w || sz.W || sz[0] : g.canvas ? g.canvas.clientWidth || g.canvas.width : 800, H = sz ? sz.h || sz.H || sz[1] : g.canvas ? g.canvas.clientHeight || g.canvas.height : 600;
    if (lk && lk.skyEvent && lk.skyEvent(g, e, W, H, { t, streaks: C.streaks })) return; const day = C.day(); g.save(); g.globalCompositeOperation = 'lighter';
    if (e && e.k === 'aurora') { const a = Math.max(0, Math.min(1, (t - e.t0) / 5, (e.t0 + e.dur - t) / 6)) * Math.max(0, 1 - day * 2.5);
      for (let Lr = 0; Lr < 3; Lr++) { const y0 = H * (.1 + Lr * .065), col = Lr === 1 ? [150, 110, 255] : [90, 240, 170], ys = []; for (let k = 0; k <= 32; k++) ys.push(y0 + Math.sin(k * .45 + t * (.3 + Lr * .13) + Lr * 2) * 18 + Math.sin(k * .17 - t * .2) * 10);
        for (const [hw, al] of [[11, .05], [4.5, .08], [1.3, .14]]) { g.fillStyle = rgba(col, al * a * (Lr === 1 ? .7 : 1)); g.beginPath(); for (let k = 0; k <= 32; k++) g.lineTo(k / 32 * W, ys[k] - hw); for (let k = 32; k >= 0; k--) g.lineTo(k / 32 * W, ys[k] + hw + 22 * (k % 2)); g.closePath(); g.fill(); } } }
    for (const s of C.streaks) if (s.on) { const u = (t - s.t0) / s.life, x = (s.x + s.vx * u * .5) * W, y = (s.y + s.vy * u * .5) * H, al = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
      const nx = -s.vy, ny = s.vx, nl = Math.hypot(nx, ny) || 1; g.fillStyle = rgba([255, 245, 225], .7 * al); g.beginPath(); g.moveTo(x + nx / nl * .9, y + ny / nl * .9); g.lineTo(x - s.vx * 60, y - s.vy * 60); g.lineTo(x - nx / nl * .9, y - ny / nl * .9); g.closePath(); g.fill(); }
    g.restore(); };
  C.info = () => { const n = {}; for (const q of C.pool) if (q.on) n[q.kind] = (n[q.kind] || 0) + 1; return `${Object.entries(n).map(([k, v]) => v + ' ' + k).join(' ') || 'none'} now; day ${C.day().toFixed(2)} air ${C.air().toFixed(2)}${C.gas() ? ' (cloud world)' : ''}; rare ${C.rare ? C.rare.k : '-'} (meteor ${C.stats.meteor} aurora ${C.stats.aurora}); spawned ${C.stats.spawned}`; };
  return C; }
