// GALAXY LAYER (world track, PLAN_REAL_PLANET step 2, S-A): pinch out past your star and the neighbouring star systems come into view;
// pinch in on one and you travel there (its system is built from its own seed only now), then pinch in on any of its planets to land.
// Seed tree: the galaxy is rooted at your first home (W.seed), each star = hash(galaxy, index), each planet = hash(star, index) (system.js).
// Shape (his 12:03 words: "galaxies are clusters of many systems, model it after how it really is"): a seeded spiral galaxy, laid out
// the way real ones are - a dense central bulge (a bar in some), 2 or 4 logarithmic spiral arms where most stars are, a thinner disc
// between the arms that thins out toward the edge (exponential), open clusters strung along the arms, globular clusters in the halo,
// and the unresolved glow of everything too faint to pick out. Your system sits out in an arm, the way the Sun does (~half way out).
// Arm / young stars are bluer, bulge / globular (old) stars redder, on top of the music tint (a system's tempo). Ohms still live on
// planets: a star is only a place you can travel to; you always land on one of its planets. (No travel between galaxies yet.)
// Music: each system leans its own om interval (the planets' home notes are built on it) and its own tempo (its planets' tempos lean on
// it); the planets are coloured by their notes in that key (system.js hueOf). Landing brings that note + tempo in on the next bar.
// Cost: stars are plain records (position, seed, interval, tempo, colour): n glows per frame, nothing else, and only while you are far
// enough out to see them. A system's planets exist only for the system you are in (plus the ones you visited, kept as they were).
// Every number is a PROPOSAL (dev panel / W.galaxy.opts), never a fixed rule.
import { rng } from './rng.js';
import { smooth } from './planet.js';
import { cam } from './view.js';
export const GALAXY_OPTS = {
  on: true,        // the galaxy layer (off = v0.0.17: one star system)
  n: 1400,         // star systems in your galaxy (your own included); each is a real place with its own seed, built only when you go there
  radius: 150,     // the galaxy's radius, in system radii (S.aMax)
  homeAt: .55,     // your system sits this far out (the Sun: ~.55 of the Milky Way's disc), in an arm
  arms: 0,         // spiral arms (0 = the seed picks 2 or 4)
  scaleLen: .3,    // the disc thins out exponentially with this scale length (x radius)
  bulge: .09,      // the central bulge's size (x radius)
  mix: [.2, .55],  // share of field stars in the bulge, the arms (the rest: the disc between the arms)
  openClusters: 16, // open clusters (6-13 young systems) strung along the arms
  globulars: 6,    // globular clusters (14-23 old systems) in the halo
  gap: 2.4,        // field stars never closer than this to each other (system radii): systems never overlap
  cGap: 1.5,       // in the bulge and in clusters stars crowd closer (still never overlapping: a system's reach is .7)
  musicTint: 1,    // star light leans on its system's tempo (slower redder, faster bluer); population (old / young) tints it too
  haze: true,      // the glow of the stars too faint to pick out, far out
  colour: 1,       // music colours a neighbour's planets (0 = their seed colours)
  enterZ: -3.45,   // pinching in past this depth on an aimed star = you arrive in its system
  aimZ: -3.5,      // pinching in from beyond this depth aims at the star nearest your fingers (nearer = the planets, as before)
  trail: false,    // S-B add-on: ring the stars you have visited (his pick, off until he chooses)
};
const INTERVALS = [3 / 2, 4 / 3, 5 / 4, 6 / 5, 5 / 3, 8 / 5, 9 / 8, 16 / 15, 15 / 8, 7 / 4, 9 / 5, 2 / 1.5];   // a system's om vs the home om
const TEMPI = [1, 3 / 2, 2 / 3, 4 / 3, 3 / 4, 5 / 4, 4 / 5];                                                 // a system's tempo vs the heartbeat
import { softRing } from './soft.js';   // v0.0.30 B19: soft rings
export function createGalaxy(W, S, music, hash) {
  const O = { ...GALAXY_OPTS }, G = W.galaxy = { opts: O, stars: [], cur: 0, target: null, eo: { x: 0, y: 0 }, amt: 0, fresh: false, visits: 0, cache: new Map() };
  // ---- the neighbourhood: seeded star records (no planets) ----
  G.build = () => { const gs = hash(W.seed, 0x6a1a), r = rng(gs), A = S.aMax, Rg = O.radius * A, g = () => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) * 1.732; };
    const m = O.arms || (r() < .55 ? 2 : 4), pitch = (11 + r() * 9) * Math.PI / 180, kk = 1 / Math.tan(pitch), th0 = r() * 6.2832, bar = r() < .6, barA = th0 + .3, rh = O.homeAt * Rg;
    const arm = (rr, a) => th0 + a * 6.2832 / m + Math.log(Math.max(rr, .05 * Rg) / (.1 * Rg)) * kk;   // log spiral: angle grows with ln(radius)
    const disc = () => { for (;;) { const rr = -O.scaleLen * Rg * Math.log(1 - r() * .999); if (rr < Rg && rr > .06 * Rg) return rr; } };   // exponential disc
    const thh = arm(rh, 0), cx = -Math.cos(thh) * rh, cy = -Math.sin(thh) * rh;   // galactic centre, seen from your system (at the origin)
    G.centre = { x: cx, y: cy }; G.shape = { arms: m, pitch: pitch * 180 / Math.PI, bar, radius: Rg, th0 };
    const st = [{ i: 0, seed: W.seed, home: true, x: 0, y: 0, ratio: 1, tr: 0, size: 1, hue: 45, seen: true, pop: 'arm' }];
    const cell = O.cGap * A, grid = new Map(), key = (x, y) => Math.floor(x / cell) + ',' + Math.floor(y / cell);
    const put = q => { const k = key(q.x, q.y); (grid.get(k) || grid.set(k, []).get(k)).push(q); }; put(st[0]);
    const free = (x, y, gap) => { const n = Math.ceil(gap / cell), ix = Math.floor(x / cell), iy = Math.floor(y / cell);
      for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) { const L = grid.get((ix + a) + ',' + (iy + b)); if (L) for (const q of L) if (Math.hypot(q.x - x, q.y - y) < gap) return false; } return true; };
    const add = (x, y, pop, gap, cl) => { if (!free(x, y, gap * A)) return false; const j = st.length, seed = hash(gs, 0x5a00 + j), tr = Math.log2(TEMPI[(seed >>> 5) % TEMPI.length]);
      const age = pop === 'bulge' || pop === 'globular' ? -1 : pop === 'arm' || pop === 'open' ? 1 : 0;   // old stars redder, young bluer
      const q = { i: j, seed, home: false, x, y, ratio: INTERVALS[(seed >>> 9) % INTERVALS.length], tr, size: (.6 + (hash(seed, 2) % 100) / 120) * (age > 0 ? 1.1 : .9),
        hue: 20 + 190 * Math.max(0, Math.min(1, .5 + tr * .9 * O.musicTint + age * .22)) + (hash(seed, 4) % 30), seen: false, pop, cl };
      st.push(q); put(q); return true; };
    const at = (rr, t, pop, gap, cl) => add(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, pop, gap, cl);
    const N = O.n, mix = O.mix, tries = N * 30; let tr = 0;
    // open clusters along the arms, globular clusters in the halo (their members sit close: a cluster is a knot of systems)
    for (let c = 0; c < O.openClusters; c++) { const rr = disc(), a = Math.floor(r() * m), t = arm(rr, a) + g() * .05, ox = cx + Math.cos(t) * rr, oy = cy + Math.sin(t) * rr, k = 6 + Math.floor(r() * 8);
      if (Math.hypot(ox, oy) < 10 * A) continue; for (let e = 0, t2 = 0; e < k && t2 < k * 12; t2++) if (add(ox + g() * 2.6 * A, oy + g() * 2.6 * A, 'open', O.cGap, c)) e++; }
    for (let c = 0; c < O.globulars; c++) { const rr = Rg * (.15 + .75 * r()), t = r() * 6.2832, ox = cx + Math.cos(t) * rr, oy = cy + Math.sin(t) * rr, k = 14 + Math.floor(r() * 10);
      if (Math.hypot(ox, oy) < 10 * A) continue; for (let e = 0, t2 = 0; e < k && t2 < k * 12; t2++) { const rad = 3.2 * A * Math.abs(g()) * .8, u = r() * 6.2832; if (add(ox + Math.cos(u) * rad, oy + Math.sin(u) * rad, 'globular', O.cGap, 100 + c)) e++; } }
    while (st.length < N && tr++ < tries) { const u = r();
      if (u < mix[0]) { let rr = Math.abs(g()) * O.bulge * Rg, t = r() * 6.2832; if (bar) { const bx = Math.cos(t) * rr * 1.8, by = Math.sin(t) * rr * .7; rr = Math.hypot(bx, by); t = Math.atan2(by, bx) + barA; }
        at(rr, t, 'bulge', O.cGap); }                                                                                     // the bulge (a bar in some)
      else if (u < mix[0] + mix[1]) { const rr = disc(), a = Math.floor(r() * m), w = (.05 + .05 * rr / Rg) * Rg; at(rr, arm(rr, a) + g() * w / rr, 'arm', O.gap); }   // the arms
      else at(disc(), r() * 6.2832, 'disc', O.gap); }                                                                     // the disc between them
    G.seed = gs >>> 0;   // v0.0.30 C: the seed look.galaxy bakes from
    G.stars = st; G.cur = 0; G.target = null; G.eo.x = G.eo.y = 0; G.cache.clear(); G.haze = null;
    for (const q of st) { const h = q.hue % 360; q.col0 = `hsl(${h},90%,60%)`; q.core0 = `hsl(${h},80%,88%)`; q.colM = `hsl(${h},25%,60%)`; q.coreM = `hsl(${h},22%,88%)`; q.col = q.colM; q.core = q.coreM; }   // v0.0.30 B19 galaxyMute: muted star colours (off = v0.0.29 90% / 80% saturation)
    G.bins = new Map(); for (const q of st) { const h = Math.round((q.hue % 360) / 15) * 15; (G.bins.get(h) || G.bins.set(h, []).get(h)).push(q); } };   // tiny stars drawn in a few colour batches
  // screen offset of the CURRENT star in the galaxy view (render / system.js S.view add it): the focus is the aimed star while you aim
  const f = () => G.stars[G.target != null ? G.target : G.cur];
  G.shift = (sc, out) => { if (!O.on || !G.stars.length) return false; const c = G.stars[G.cur], q = f(); out.x = sc * (c.x - q.x + G.eo.x); out.y = sc * (c.y - q.y + G.eo.y); return out.x !== 0 || out.y !== 0; };
  G.screenOf = (j, sc, cx, cy, out) => { const q = f(), s = G.stars[j]; out.x = cx + sc * (s.x - q.x + G.eo.x); out.y = cy + sc * (s.y - q.y + G.eo.y); return out; };
  const tq = { x: 0, y: 0 };
  // pinching in far out: aim at the star nearest the fingers (the view glides to centre it; nothing changes until you arrive)
  G.aim = (mx, my, cx, cy) => { if (!O.on) return false; const sc = Math.pow(4, cam.z); let best = null, bd = 1e18;
    for (const s of G.stars) { G.screenOf(s.i, sc, cx, cy, tq); const d = Math.hypot(tq.x - mx, tq.y - my); if (d < bd) { bd = d; best = s; } }
    const q = f(); if (!best || best === q) return true; G.eo.x += best.x - q.x; G.eo.y += best.y - q.y; G.target = best.i === G.cur ? null : best.i; return true; };
  G.unaim = () => { if (G.target == null) return; const q = f(), c = G.stars[G.cur]; G.eo.x += c.x - q.x; G.eo.y += c.y - q.y; G.target = null; };
  // arrive in system j: the one you leave is kept as it was (its planets, their drift and sleeping ohms); j's planets are built from its
  // seed the first time. You arrive on its planet nearest to where you came from (it sits toward you), and its music lands with it.
  G.amtOf = z => O.on ? smooth((-z - 3.1) / .8) : 0;   // how far the galaxy has come in at depth z (zoomlayers.js reads it too)
  G.enter = (j, k) => { const s = G.stars[j]; if (!s || j === G.cur) return; const from = S.planets[S.cur], old = G.stars[G.cur];
    if (from) { from.walk = W.walk; from.L = W.home; }
    G.cache.set(G.cur, { planets: S.planets, aMax: S.aMax, starR: S.starR }); G.prevKey = S.key(S.cur);
    const q = f(); G.eo.x += s.x - q.x; G.eo.y += s.y - q.y; G.cur = j; G.target = null;   // the glide keeps going from where it was
    const c = G.cache.get(j); S.build(s.home ? null : s); if (c) { S.planets = c.planets; S.aMax = c.aMax; S.starR = c.starR; }
    else if (G.onFresh) G.onFresh(s);   // step 2 finish (zoomlayers.js): the galaxy leans a system you arrive in for the first time
    S.cur = -1; S.target = null; S.eo.x = S.eo.y = 0;
    for (const d of [...W.layers.keys()]) if (d < 0 && d >= -3) W.layers.delete(d);   // its space layers come from its own seed
    if (k == null) { const t = music.now(), dx = old.x - s.x, dy = old.y - s.y, p0 = { x: 0, y: 0 }; let bd = -1e18; k = 0;
      for (const p of S.planets) { S.pos(p, t, p0); const d = (p0.x * dx + p0.y * dy) / (p.a || 1); if (d > bd) { bd = d; k = p.i; } } }
    if (!s.seen) { s.seen = true; G.visits++; } W.land(k); G.fresh = true; };
  G.tick = dt => { if (!O.on) return; const k = Math.exp(-dt / .5); G.eo.x *= k; G.eo.y *= k; if (Math.abs(G.eo.x) + Math.abs(G.eo.y) < S.aMax * 1e-3) G.eo.x = G.eo.y = 0;
    G.amt = G.amtOf(cam.z);
    if (G.target != null && G.target !== G.cur && cam.z > O.enterZ) G.enter(G.target);
    if (G.target != null && cam.z > -3) G.target = null; };
  // ---- drawing (render.js calls it under the system, only while the galaxy is in view) ----
  // the unresolved glow (built once per galaxy): every star as a soft dot on a small offscreen canvas, plus the bulge light
  const hazeOf = () => { if (G.haze !== null) return G.haze; G.haze = false; if (typeof document === 'undefined') return false;
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const h = cv.getContext('2d'), Rg = G.shape.radius, k = N / (2.3 * Rg), C = G.centre;
    const bg = h.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, O.bulge * Rg * k * 2.5); bg.addColorStop(0, 'rgba(255,220,170,.55)'); bg.addColorStop(1, 'rgba(255,200,150,0)'); h.fillStyle = bg; h.fillRect(0, 0, N, N);
    h.globalCompositeOperation = 'lighter'; for (const q of G.stars) { h.globalAlpha = .1; h.fillStyle = q.col; h.beginPath(); h.arc(N / 2 + (q.x - C.x) * k, N / 2 + (q.y - C.y) * k, 2.2, 0, 6.2832); h.fill(); }
    const M = 512, dv = document.createElement('canvas'); dv.width = dv.height = M; const d = dv.getContext('2d'), kd = M / (2.3 * Rg); d.globalCompositeOperation = 'lighter';
    for (const q of G.stars) { if (q.home) continue; d.globalAlpha = .85; d.fillStyle = q.core; d.fillRect(M / 2 + (q.x - C.x) * kd - .9, M / 2 + (q.y - C.y) * kd - .9, 1.8, 1.8); }   // the whole galaxy's stars, for the widest views
    G.haze = { cv, k, dv, kd, m: G.mute }; return G.haze; };
  const sp = { x: 0, y: 0 };
  // v0.0.30 GAMEDEV_SPEC part 2: C lookGalaxy - Visuals' baked realistic galaxy (look.galaxy) in place of the haze blit (the haze while it bakes);
  // B19 galaxyMute (muted star colours) + lnGalaxy (and noOutlines): the target / seen / you-are-here rings are soft light, no reach ellipse.
  G.draw = (c, Wd, H, cx, cy, sc, pulse, look) => { if (!O.on || G.amt < .01) return 0; let n = 0; const a0 = c.globalAlpha, A = S.aMax * sc, WO = W.opts || {};
    const mu = WO.galaxyMute !== false; if (mu !== G.mute) { G.mute = mu; for (const q of G.stars) { q.col = mu ? q.colM : q.col0; q.core = mu ? q.coreM : q.core0; } if (G.haze && G.haze.m !== mu) G.haze = null; }
    const nl = WO.noOutlines !== false && WO.lnGalaxy !== false, bc = mu ? 22 : 80;
    c.globalCompositeOperation = 'lighter';
    const hz = O.haze && A < 6 ? hazeOf() : null;   // far out: the galaxy's glow under the stars you can pick out
    if (hz) { const q = f(), C = G.centre, s2 = sc / hz.k, w = hz.cv.width * s2, x = cx + sc * (C.x - q.x + G.eo.x) - w / 2, y = cy + sc * (C.y - q.y + G.eo.y) - w / 2;
      const al = G.amt * Math.min(1, (6 - A) / 4) * .8;
      if (!(look && look.galaxy && WO.lookGalaxy !== false && look.galaxy(c, x + w / 2, y + w / 2, w / 2 / 1.15, G.tilt || 0, G.seed, { amt: al, rot: G.rot || 0 }) === true)) { c.globalAlpha = al; c.drawImage(hz.cv, x, y, w, w); } c.globalCompositeOperation = 'lighter'; }
    const tiny = A < 5;
    if (hz && A < 1.4) { const q = f(), C = G.centre, s2 = sc / hz.kd, w = hz.dv.width * s2; c.globalAlpha = G.amt; n = G.stars.length - 1;   // the whole galaxy: one image (cheap at any star count)
      c.drawImage(hz.dv, cx + sc * (C.x - q.x + G.eo.x) - w / 2, cy + sc * (C.y - q.y + G.eo.y) - w / 2, w, w); }
    else if (tiny) { c.globalAlpha = G.amt * .85; for (const [h, L] of G.bins) { c.fillStyle = `hsl(${h},${bc}%,88%)`; c.beginPath();   // one path per colour batch
        for (const s of L) { if (s.i === G.cur) continue; G.screenOf(s.i, sc, cx, cy, sp); if (sp.x < 0 || sp.x > Wd || sp.y < 0 || sp.y > H) continue; n++; const d = .9 + s.size * .7 + A * .15; c.rect(sp.x - d / 2, sp.y - d / 2, d, d); }
        c.fill(); } }
    if (!(hz && A < 1.4)) for (const s of G.stars) { if (s.i === G.cur || (tiny && s.i !== G.target)) continue; G.screenOf(s.i, sc, cx, cy, sp);
      const r = Math.max(1.4, A * .05 * s.size), R = r * 5;
      if (sp.x < -R || sp.x > Wd + R || sp.y < -R || sp.y > H + R) continue; n++;
      const al = G.amt * (s.i === G.target ? 1 : .8) * Math.min(1.25, s.glow || 1);   /* glow: its planets' heal / jam (zoomlayers.js UP) */ c.globalAlpha = al * .35; c.fillStyle = s.col; c.beginPath(); c.arc(sp.x, sp.y, R * (1 + .08 * pulse + .2 * (s.jam || 0) * pulse) * (s.glow || 1), 0, 6.2832); c.fill();
      c.globalAlpha = Math.min(1, al); c.fillStyle = s.core; c.beginPath(); c.arc(sp.x, sp.y, r, 0, 6.2832); c.fill();
      if (A > 8 && !nl) { c.globalAlpha = al * .12; c.strokeStyle = s.core; c.lineWidth = .6; c.beginPath(); c.ellipse(sp.x, sp.y, A * .7, A * .63, 0, 0, 6.2832); c.stroke(); }   // its system's reach
      if (((O.trail && s.seen) || s.i === G.target) && nl) { c.globalAlpha = 1; (look && look.pulse && WO.lookPulse !== false && look.pulse(c, 'soft', sp.x, sp.y, R * 1.3, 0, { life: 1, s: al * (s.i === G.target ? 2.4 : 1.4) }) === true) || softRing(c, sp.x, sp.y, R * 1.3, Math.max(2, R * .35), '50,60%,80%', al * (s.i === G.target ? .7 : .4)); }   // B19: look.pulse 'soft' first, the soft ring as fallback
      else if ((O.trail && s.seen) || s.i === G.target) { c.globalAlpha = al * (s.i === G.target ? .7 : .4); c.strokeStyle = 'hsl(50,90%,80%)'; c.lineWidth = 1; c.beginPath(); c.arc(sp.x, sp.y, R * 1.3, 0, 6.2832); c.stroke(); } }
    if (tiny && G.cur != null) { const C = G.stars[G.cur]; G.screenOf(C.i, sc, cx, cy, sp); if (nl) { c.globalAlpha = 1; (look && look.pulse && WO.lookPulse !== false && look.pulse(c, 'soft', sp.x, sp.y, 8, 0, { life: 1, s: G.amt * 3 }) === true) || softRing(c, sp.x, sp.y, 6, 2.5, '50,60%,80%', G.amt * .8); } else { c.globalAlpha = G.amt * .8; c.strokeStyle = 'hsl(50,90%,80%)'; c.lineWidth = 1; c.beginPath(); c.arc(sp.x, sp.y, 6, 0, 6.2832); c.stroke(); } }   // you are here
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = a0; return n; };
  G.build();
  return G;
}
