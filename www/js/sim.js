// WORLD STATE (A): the one shared state that sound, physics and visuals all read. It changes ONLY through events on the
// music clock (events.js): this file is the reducer for those events plus the soft-body physics, whose results are posted
// back as control streams. Same building blocks at every scale (C): every source - ohms, the world's heartbeat and om
// drone now; places, groups, planets later - is { id, scale, recipe, body, look } with the same signals, matrix rows and FX chain.
// OHMS (track/ohms): many ohms live at once (S.ohms). Each grows its body from its recipe seed (genes.js), has a cheap
// soft-body ring (10 springs), sits on the ground or hovers, and only moves when a partner draws it or the player moves it
// (PROPOSAL: no random drift). Bumps make sounds (strike notes scaled by impact), notes make bodies wobble: E both ways.
// Cost stays flat with many ohms: only AWAKE ohms (touched / sounding in the last ~8 s, plus the focus ohm) are in
// S.sources, which is what the matrix and the audio levels iterate; sleeping ohms keep their physics but no control streams.
import { makeRecipe, recipes, OPTS, octaveOf } from './recipe.js';
import { newSeed, rng } from './rng.js';
import { bodyGenes, restPoint, RING } from './genes.js';

const mkBody = () => ({ x: 0, y: 0, vx: 0, vy: 0, pin: 0, pout: 0, pv: 0, ps: 0, throb: 0, grab: null, pinch: 1, pull: 0 });
const SLEEP_S = 8, GRAV = 16, MAXV = 14, CALL_V = 9;   // CALL_V ~500 px/s on a phone: a hard throw makes the ohm call out (GESTURES C21)
export function createSim(music, bus) {
  const S = { sources: [], byId: new Map(), ohms: [], ohm: null, sig: { global: {} }, opts: OPTS, music, lod: 0, stats: { ms: 0, awake: 0, hits: 0 } };
  // world frame (world units = R px of the layout; origin = the layout's rest point). Set from the screen by setView; the world
  // track may own these (Shared contracts): S.bounds, S.groundAt(x) -> ground y, S.cam { x, y, z }.
  // F11 (Wilbow 5:18 PM Oct 30 "The ohms are getting piled up in the view area and bouncing off eachother"): the ground strip is
  // one screen wide, so once the ground ohms' widths add up past it they stack and shove forever (14 ohms: 13.7 units of bodies on a
  // 7.7 unit floor, never calm). S.crowd ON: soft resting contacts (slow touches don't bounce, ring or strike) and, while the floor is
  // more than opts.full taken, the newest ground ohms hover in a band above it until room comes back. OFF = exactly as before.
  S.crowd = { on: true, full: .8, free: .65, slow: .8, lifted: 0, fill: 0 };
  S.bounds = { x0: -3.8, x1: 3.8, y0: -5.5, ground: 7.5 }; S.groundAt = null; S.cam = { x: 0, y: 0, z: 1 };
  const groundY = x => S.groundAt ? S.groundAt(x) : S.bounds.ground;
  S.setView = (W, H) => { const R = Math.min(W, H) * .13, cx0 = W / 2, cy0 = H * .36; S.bounds.x0 = -cx0 / R; S.bounds.x1 = (W - cx0) / R; S.bounds.y0 = -cy0 / R; S.bounds.ground = (H * .9 - cy0) / R;
    const d = S.things.find(t => t.id === 'drum'); if (!d) S.addThing({ id: 'drum', kind: 'drum', x: S.bounds.x0 + .75, y: S.bounds.ground - .4, r: .42, auto: true });
    else if (d.auto) { d.x = S.bounds.x0 + .75; d.y = S.bounds.ground - .4; } };
  const rebuild = () => { S.sources = [...S.byId.values()].filter(s => s.scale !== 'ohm' || s.awake); S.stats.awake = S.sources.length; };
  const add = src => { src.body = src.body || mkBody(); src.look = src.look || { glow: 0 }; src.glow = src.glow || 0; src.ring = 0; S.byId.set(src.id, src); S.sig[src.id] = S.sig[src.id] || {};
    if (src.scale === 'ohm' && !S.ohms.includes(src)) { S.ohms.push(src); asOhm(src); } if (src.scale !== 'ohm') src.awake = true; rebuild(); return src; };
  // every ohm-scale source added from outside (e.g. the jam partner, audio track) becomes a full ohm: genes, soft body, physics.
  // `place` (Shared contracts v0.0.4, ohm radii ~ world units) is a live view of its world position: reading it gives { x, y },
  // setting it moves the ohm there (that is how a nudge / a test moves it). An ohm added WITH a place stays anchored there
  // (hovers, never wanders toward a partner) unless you throw it.
  const asOhm = o => { const p0 = o.place; if (!o.g && o.recipe != null && recipes.get(o.recipe)) { grow(o, p0 ? p0.x : 0, p0 ? p0.y : 0); if (p0) { o.g.float = true; o.anchor = true; } }
    o.awake = o.awake || false; o.wakeT = o.wakeT || 0; o.nodeGlow = o.nodeGlow || new Float32Array(7);
    Object.defineProperty(o, 'place', { configurable: true, enumerable: false, get() { return { x: o.body.x, y: o.body.y }; },
      set(v) { if (!v) return; const b = o.body; b.x = v.x; b.y = v.y; b.homeY = v.y; b.vx = b.vy = 0; b.flying = false; } }); };
  S.add = add;
  const grow = (o, x, y) => { const rec = recipes.get(o.recipe), g = o.g = bodyGenes(o.seed, rec), b = o.body; if (o.gx) { Object.assign(g, o.gx); g.k = 170 - g.soft * 110; g.c = 6 - g.soft * 3.2; }   // o.gx: genes inherited from parents (teach.js)
    b.ring = b.ring || new Float32Array(RING * 4); b.rest = new Float32Array(RING * 2); const t = [0, 0];
    for (let i = 0; i < RING; i++) { restPoint(g, i, t); b.rest[i * 2] = t[0]; b.rest[i * 2 + 1] = t[1]; b.ring[i * 4] = t[0]; b.ring[i * 4 + 1] = t[1]; }
    if (x != null) { b.x = x; b.y = y; } b.homeY = b.y; b.flying = false; b.lastHit = -9; b.calm = 0; return o; };
  S.makeOhm = (seed, id = 1) => { const rec = makeRecipe(seed); return { id, scale: 'ohm', seed, recipe: rec.id, hue: rec.hue, nodesOpen: false, nodeGlow: new Float32Array(7), screen: true, body: mkBody(), awake: false, wakeT: 0 }; };
  // new seed for the focus ohm (keeps its place and id); the first call creates ohm 1 at the rest point (a hovering ohm)
  S.regrow = o => { if (o && o.body && o.g) grow(o); return o; };   // rebuild the body from its genes (+ inherited o.gx), keeping its place
  S.reseed = (seed = newSeed()) => { const old = S.ohm, o = S.makeOhm(seed, old ? old.id : 1);
    if (old) { o.nodesOpen = old.nodesOpen; o.body = old.body; o.look = old.look; S.ohms[S.ohms.indexOf(old)] = o; }
    S.ohm = add(o); grow(o, old ? o.body.x : 0, old ? o.body.y : 0); if (!old) o.g.float = true; else o.g.float = old.g.float;
    wake(o); bus.post({ type: 'recipe', src: o, rec: recipes.get(o.recipe) }); return o; };
  let nextId = 1001;
  // a new ohm grows at (x, y) world units (seeded; same seed = same ohm). Posted as an event so it is on the clock.
  S.spawn = (x, y, seed = newSeed(), born) => bus.post({ type: 'spawn', x, y, seed, born, timing: bus.tap || null }).src;
  bus.on('spawn', ev => { const id = ev.id || nextId++; if (id >= nextId) nextId = id + 1; const o = add(S.makeOhm(ev.seed, id)); if (ev.born) { o.born = ev.born; if (S.onBorn) S.onBorn(o); } grow(o, ev.x, ev.y); o.body.homeY = ev.y; o.wakeT = music.now(); ev.src = o; });   // systems: ev.id = restored ohm keeps its id
  // systems (undo / restore): take an ohm out of the world and put the same object back; ids carry on across saves
  S.remove = o => { if (!o || o === S.ohm || !S.byId.has(o.id)) return false; bus.note({ src: o, kind: 'release' }); o.dead = true; o.awake = false; S.byId.delete(o.id); const i = S.ohms.indexOf(o); if (i >= 0) S.ohms.splice(i, 1); rebuild(); bus.post({ type: 'despawn', src: o }); return true; };
  S.unremove = o => { if (!o || S.byId.has(o.id)) return false; o.dead = false; add(o); wake(o); bus.post({ type: 'respawn', src: o }); return true; };
  S.ids = { get next() { return nextId; }, set next(v) { nextId = Math.max(nextId, v | 0); } };
  // PROPOSAL: the world starts with a few ohms around the focus ohm (count from ?ohms=N, default 7 incl. the focus ohm)
  S.populate = (n, seed = newSeed()) => { const r = rng(seed), B = S.bounds;
    for (let i = 0; i < n; i++) { const x = B.x0 + .8 + (i + .5) / n * (B.x1 - B.x0 - 1.6), fl = r() < .35 && Math.abs(x) > 1.8, y = fl ? B.y0 + 1 + r() * Math.max(.5, -B.y0 - 2.4) : groundY(x) - 1;
      const o = S.spawn(x, y, (r() * 4294967296) >>> 0); o.g.float = fl; } };
  // THINGS (PROPOSAL, 7B): tappable world objects in the shared state, e.g. a drum-like thing that sets the beat when tapped
  // steadily. The world track may place / draw / replace them (sim.things, sim.thingsDrawn); default: one drum on the ground at
  // the left edge. { id, kind, x, y, r, hit } in world units; 'hit' is a 0..1 flash the drawing reads.
  S.things = []; S.addThing = t => { t.hit = 0; S.things.push(t); return t; };
  S.get = id => S.byId.get(typeof id === 'object' ? id.id : id);
  const wake = o => { if (!o || o.scale !== 'ohm') return; o.wakeT = music.now(); if (!o.awake) { o.awake = true; rebuild(); } };
  S.wake = wake;
  // neighbours within reach (world units), nearest first - for jams (audio track): two ohms near each other may jam
  S.neighbors = (o, reach = 2.5) => { const out = []; for (const p of S.ohms) if (p !== o && !p.parked) { const d = Math.hypot(p.body.x - o.body.x, p.body.y - o.body.y) - p.g.r - o.g.r; if (d < reach) out.push([d, p]); } return out.sort((a, b) => a[0] - b[0]).map(a => a[1]); };
  // ---- soft-body helpers ----
  const kick = (o, nx, ny, amt, radial) => { const R = o.body.ring, rs = o.body.rest; o.body.calm = 0;
    for (let i = 0; i < RING; i++) { const dx = rs[i * 2], dy = rs[i * 2 + 1], l = Math.hypot(dx, dy) || 1;
      if (radial) { R[i * 4 + 2] += dx / l * amt; R[i * 4 + 3] += dy / l * amt; } else { const f = (dx * nx + dy * ny) / l; if (f > .2) { R[i * 4 + 2] -= nx * amt * f; R[i * 4 + 3] -= ny * amt * f; } } } };
  S.kick = kick;
  // impact -> sound (E: bodies shape sound). Harder = louder + brighter (strike pos toward the rim). Rate-limited per ohm and per
  // bar for the whole world (MUSIC_GOOD 11: more ohms = each plays less; 12: loudness normalised by crowd size)
  let barN = 0, barK = -1;
  const hit = (o, v, t) => { const b = o.body; if (t - b.lastHit < .18) return; const bk = Math.floor(music.bar(t)); if (bk !== barK) { barK = bk; barN = 0; } if (barN >= 12) return;
    b.lastHit = t; barN++; S.stats.hits++; const rec = recipes.get(o.recipe); if (!rec) return; wake(o);
    bus.note({ src: o, kind: 'strike', deg: null, oct: octaveOf(rec), vel: Math.min(1, .15 + v / 10) / Math.sqrt(Math.max(1, S.stats.awake / 4)), pos: Math.min(1, .2 + v / 12), dur: 1, impact: v }); };
  // ---- reducers ----
  bus.on('note', ev => { const o = ev.src; if (!o.body) return;
    if (ev.kind === 'strike' || ev.kind === 'beat') { o.glow = Math.min(1.4, o.glow + .5 + ev.vel * .6); o.ring = 1; }
    else if (ev.deg != null && o.nodeGlow) { o.nodeGlow[((ev.deg % 7) + 7) % 7] = 1; o.glow = Math.min(1.4, o.glow + .25); }
    if (ev.f) o.pitch = ev.f;
    if (ev.vel != null && ev.kind !== 'release' && S.sig[o.id]) { const g = S.sig[o.id]; g['touch.pressure'] = ev.vel; if (ev.pos != null) g['touch.pos'] = ev.pos; if (ev.deg != null) g['note.degree'] = (((ev.deg % 7) + 7) % 7) / 7; }
    // sound moves bodies: the sounding ohm pulses, ohms that hear it (within 2 + 4 * hear) wobble a little
    if (o.scale === 'ohm' && o.g && ev.kind !== 'release' && ev.kind !== 'damp' && ev.kind !== 'level') { wake(o); const v = ev.vel || .5; kick(o, 0, 0, v * 1.6 * o.g.r, true);
      for (const p of S.ohms) if (p !== o) { const d = Math.hypot(p.body.x - o.body.x, p.body.y - o.body.y), reach = 2 + 4 * p.g.hear; if (d < reach) kick(p, 0, 0, v * .5 * p.g.hear * (1 - d / reach), true); } } });
  bus.on('ctl', ev => { const id = ev.src === 'global' ? 'global' : ev.src.id, g = S.sig[id] || (S.sig[id] = {});
    if (ev.key === 'sound.level') { const p = g[ev.key] || 0; g[ev.key] = ev.v > p ? ev.v : p * .85 + ev.v * .15; } else g[ev.key] = ev.v;
    if (ev.key[0] === 'i' && ev.key.startsWith('in.') && ev.src !== 'global') wake(ev.src); });
  bus.on('live', ev => { const o = ev.src, L = ev.out.look || {}, B = ev.out.body || {}; o.look.glow = L.glow || 0; o.body.throb = B.throb || 0; });
  // focus: the ohm you hold / play becomes the one the panel edits and the nodes open around (others close their nodes)
  bus.on('focus', ev => { const o = ev.src; if (!o || o === S.ohm) return; if (S.ohm) S.ohm.nodesOpen = false; S.ohm = o; wake(o); bus.post({ type: 'recipe', src: o, rec: recipes.get(o.recipe) }); });
  // world touch (empty ground / air): a soft push wave from (x, y); stir: a drag through empty space nudges ohms along it
  bus.on('touch', ev => { if (ev.kind === 'tap') for (const o of S.ohms) { const dx = o.body.x - ev.x, dy = o.body.y - ev.y, d = Math.hypot(dx, dy) || 1; if (d < 2.5) { const a = (1 - d / 2.5) * 1.6; o.body.vx += dx / d * a; o.body.vy += dy / d * a * .5; kick(o, -dx / d, -dy / d, a, false); } }
    else if (ev.kind === 'thing' && ev.thing) { ev.thing.hit = 1; for (const o of S.ohms) { const dx = o.body.x - ev.thing.x, d = Math.abs(dx) + Math.abs(o.body.y - ev.thing.y); if (d < 3) kick(o, 0, 0, (1 - d / 3) * .8, true); } }
    else if (ev.kind === 'stir') for (const o of S.ohms) { const d = Math.hypot(o.body.x - ev.x, o.body.y - ev.y); if (d < 1.6 + o.g.r) { const a = 1 - d / (1.6 + o.g.r + 1e-6); o.body.vx += ev.dx * a * .9; o.body.vy += ev.dy * a * .9; o.body.calm = 0; } } });
  const setPath = (obj, path, v) => { const k = path.split('.'); let o = obj; for (let i = 0; i < k.length - 1; i++) { if (o[k[i]] == null) o[k[i]] = {}; o = o[k[i]]; } o[k[k.length - 1]] = v; };
  bus.on('set', ev => { const p = ev.path;
    if (p.startsWith('recipe.')) { const rec = recipes.get(ev.src.recipe); if (rec) setPath(rec, p.slice(7), ev.v); }
    else if (p.startsWith('opt.')) setPath(S.opts, p.slice(4), ev.v);
    else if (p === 'music.bpm') music.setBpm(ev.v); else if (p === 'music.om') music.setOm(ev.v); else if (p === 'music.lock') music.setLock(ev.v); else if (p === 'music.tuning') music.setTuning(ev.v);
    else if (p.startsWith('src.')) setPath(ev.src, p.slice(4), ev.v); });
  bus.on('recipe', ev => { const o = ev.src; o.recipe = ev.rec.id; o.hue = ev.rec.hue; if (o.seed != null) o.seed = ev.rec.seed; if (o.scale === 'ohm' && o.g) { const fl = o.g.float; grow(o); if (!o.gx) o.g.float = fl; } });
  // ---- control tick: physics + clock streams, posted as events (called by the control clock, not per drawn frame) ----
  const last = {}; const post = (src, key, v) => { const id = src === 'global' ? 'global' : src.id, k = id + key; if (last[k] != null && Math.abs(last[k] - v) < 2e-3) return; last[k] = v; bus.ctl(src, key, v); };
  const order = []; let tickN = 0;
  const physics = (o, h, t) => { const b = o.body, g = o.g, sg = S.sig[o.id], gx = sg['in.grabX'], gy = sg['in.grabY'], held = gx != null && gx === gx, B = S.bounds;
    const vx0 = b.vx, vy0 = b.vy;
    if (held) { if (!b.grab) { b.grab = { x: b.x, y: b.y }; b.flying = false; } b.vx += ((gx - b.x) * 260 - b.vx * 22) * h; b.vy += ((gy - b.y) * 260 - b.vy * 22) * h; b.calm = 0; }
    else { if (b.grab) { b.grab = null; const sp = Math.hypot(b.vx, b.vy); if (sp > 1.2) b.flying = true; else b.homeY = b.y; if (sp > CALL_V) hit(o, sp * .8, t); }   // PROPOSAL (OHMS C21, a sound event only; changes nothing lasting): a hard throw calls out. THROW: let go and it keeps the finger's speed
      const fl = g.float || o.lift;   // F11: a lifted ohm hovers like a floater until the floor has room
      if (fl && !b.flying) { b.vy += ((b.homeY - b.y) * 3 - b.vy * 2.2) * h; } else if (!fl) b.vy += GRAV * h;
      const drag = fl ? 1.4 : .25; b.vx *= Math.exp(-h * drag); if (fl) b.vy *= Math.exp(-h * drag);
      // calm partner seek (PROPOSAL): settled ohms drift slowly toward their partner and stop at a comfortable distance
      const p = b.partner; if (p && o !== S.ohm && !o.anchor && !b.flying && b.calm > 1.5) { const dx = p.body.x - b.x, dy = p.body.y - b.y, d = Math.hypot(dx, dy) || 1, want = (g.r + p.g.r) * 1.25;
        if (d > want * 1.05) { const vmax = .1 + .25 * (1 - g.calm), a = g.social * 1.2; if (Math.abs(b.vx) < vmax) b.vx += dx / d * a * h; if (g.float && !o.lift && Math.abs(b.vy) < vmax) { b.vy += dy / d * a * h; b.homeY = b.y; } } } }
    const sp2 = b.vx * b.vx + b.vy * b.vy; if (sp2 > MAXV * MAXV) { const k = MAXV / Math.sqrt(sp2); b.vx *= k; b.vy *= k; }
    b.x += b.vx * h; b.y += b.vy * h;
    // world edges + ground (soft bounce; harder landings sound)
    const r = g.r; if (b.x < B.x0 + r) { b.x = B.x0 + r; if (b.vx < 0) { if (-b.vx > 2.5) hit(o, -b.vx, t); kick(o, -1, 0, -b.vx * .5, false); b.vx *= -.35; } }
    if (b.x > B.x1 - r) { b.x = B.x1 - r; if (b.vx > 0) { if (b.vx > 2.5) hit(o, b.vx, t); kick(o, 1, 0, b.vx * .5, false); b.vx *= -.35; } }
    if (b.y < B.y0 + r) { b.y = B.y0 + r; if (b.vy < 0) b.vy *= -.35; }
    const gyy = groundY(b.x); b.ground = false; if (b.y > gyy - r) { b.y = gyy - r; b.ground = true; if (b.vy > 0) { if (b.vy > 2.5) hit(o, b.vy, t); kick(o, 0, 1, b.vy * .55, false); b.vy *= -.22; } b.vx *= Math.exp(-h * 7); }
    if (b.flying && Math.hypot(b.vx, b.vy) < .3) { b.flying = false; b.homeY = b.y; }   // where a thrown ohm comes to rest is its new place
    // pinch spring (two fingers): squeezed below 1, spread above 1
    const pt = sg['in.pinch'] == null ? 1 : sg['in.pinch']; b.pv += ((pt - b.ps - 1) * 180 - b.pv * 14) * h; b.ps += b.pv * h;
    // soft ring: each point springs to its rest offset + to its neighbours' average, and lags the centre's acceleration (jelly)
    let ax = (b.vx - vx0) / h, ay = (b.vy - vy0) / h; const am = Math.hypot(ax, ay); if (am > 80) { ax *= 80 / am; ay *= 80 / am; }
    if (S.lod >= 3 && !o.awake && b.calm > 3) return;
    const R = b.ring, rs = b.rest, K = g.k, C = g.c; let e = 0;
    for (let i = 0; i < RING; i++) { const j = i * 4, pi = ((i + RING - 1) % RING) * 4, ni = ((i + 1) % RING) * 4;
      const fx = (rs[i * 2] - R[j]) * K + ((R[pi] + R[ni]) * .5 - R[j]) * 40 - R[j + 2] * C - ax * .5, fy = (rs[i * 2 + 1] - R[j + 1]) * K + ((R[pi + 1] + R[ni + 1]) * .5 - R[j + 1]) * 40 - R[j + 3] * C - ay * .5;
      R[j + 2] += fx * h; R[j + 3] += fy * h; R[j] += R[j + 2] * h; R[j + 1] += R[j + 3] * h;
      if (b.y + R[j + 1] > gyy) { R[j + 1] = gyy - b.y; if (R[j + 3] > 0) R[j + 3] = 0; }   // squash on the ground
      e += Math.abs(R[j + 2]) + Math.abs(R[j + 3]); }
    b.wob = e / RING; };
  const collide = t => { const O = S.ohms, n = O.length; if (order.length !== n) { order.length = 0; for (const o of O) order.push(o); }
    for (let i = 1; i < n; i++) { const o = order[i], x = o.body.x; let j = i - 1; while (j >= 0 && order[j].body.x > x) { order[j + 1] = order[j]; j--; } order[j + 1] = o; }   // nearly sorted: ~O(n)
    for (let i = 0; i < n; i++) { const a = order[i], A = a.body; for (let j = i + 1; j < n; j++) { const c = order[j]; if (a.parked || c.parked) continue; const Cb = c.body, rr = a.g.r + c.g.r, dx = Cb.x - A.x; if (dx > rr + .4) { if (dx > 1.6) break; continue; }
      const dy = Cb.y - A.y, d2 = dx * dx + dy * dy; if (d2 >= rr * rr) continue; const d = Math.sqrt(d2) || 1e-3, nx = dx / d, ny = dy / d, ov = rr - d, ia = 1 / a.g.mass, ic = 1 / c.g.mass, s = ov / (ia + ic) * .8;
      A.x -= nx * s * ia; A.y -= ny * s * ia; Cb.x += nx * s * ic; Cb.y += ny * s * ic;
      const vn = (Cb.vx - A.vx) * nx + (Cb.vy - A.vy) * ny, soft = S.crowd.on && -vn < S.crowd.slow;
      if (soft) { if (vn < 0) { const jj = -vn / (ia + ic); A.vx -= nx * jj * ia; A.vy -= ny * jj * ia; Cb.vx += nx * jj * ic; Cb.vy += ny * jj * ic; }   // F11: a slow touch just stops (no bounce, no ring, no strike)
        if (!A.grab && !Cb.grab) { const tx = -ny, ty = nx, vt = (Cb.vx - A.vx) * tx + (Cb.vy - A.vy) * ty, f = vt * .25 / (ia + ic); A.vx += tx * f * ia; A.vy += ty * f * ia; Cb.vx -= tx * f * ic; Cb.vy -= ty * f * ic; } continue; }   // and rubs to rest instead of sliding round each other
      if (vn < 0) { const jj = -1.3 * vn / (ia + ic); A.vx -= nx * jj * ia; A.vy -= ny * jj * ia; Cb.vx += nx * jj * ic; Cb.vy += ny * jj * ic;
        kick(a, nx, ny, -vn * .5, false); kick(c, -nx, -ny, -vn * .5, false); if (-vn > 1.8) { hit(a, -vn, t); hit(c, -vn, t); } } } } };
  const crowdTick = () => { const C = S.crowd, B = S.bounds, floor = Math.max(1, B.x1 - B.x0), O = S.ohms;
    if (!C.on) { if (C.lifted) for (const o of O) if (o.lift) { o.lift = false; o.body.homeY = o.body.y; } C.lifted = 0; return; }
    let w = 0, lw = 0; const lifted = [], ground = []; for (const o of O) { if (o.parked || o.dead || !o.g || o.g.float) continue; if (o.lift) { lifted.push(o); lw += 2 * o.g.r; } else { w += 2 * o.g.r; if (o !== S.ohm && !o.anchor && !o.body.grab) ground.push(o); } }
    C.fill = w / floor;
    if (C.fill > C.full && ground.length) { ground.sort((a, b) => b.id - a.id); const o = ground[0], b = o.body; o.lift = true; b.homeY = groundY(b.x) - o.g.r - 1.4 - (lifted.length % 3) * 1.1; b.vy -= 2; b.calm = 0; }   // the newest ground ohm rises into the hover band
    else if (lifted.length) { lifted.sort((a, b) => a.id - b.id); const o = lifted[0]; if ((w + 2 * o.g.r) / floor < C.free && !o.body.grab) { o.lift = false; o.body.calm = 0; } }   // room again: the oldest lifted ohm settles back down
    C.lifted = O.filter(o => o.lift).length; };
  S.step = dt => { const a0 = performance.now(), t = music.now(), ph = music.phase(t);
    post('global', 'beat.phase', ph); post('global', 'beat.pulse', Math.exp(-ph * 6)); post('global', 'bar.phase', (music.bar(t) % 1 + 1) % 1); post('global', 'key.tonic', (music.tonicHz - 32) / 96);
    for (const o of S.sources) if (o.scale !== 'ohm') { o.glow *= Math.exp(-dt * 2.2); o.ring *= Math.exp(-dt * 3); }
    const n = Math.max(1, Math.ceil(dt / .017)), h = dt / n, O = S.ohms; tickN++;
    const jamOn = !!(S.opts.jam && S.opts.jam.on); for (const o of O) o.parked = (o.id === 2 && !jamOn) || !!o.away;   // the jam partner sits out while jam is off; v0.0.11 (world, additive): ohms living on another planet sleep (o.away)
    for (let k = 0; k < n; k++) { for (const o of O) if (!o.parked) physics(o, h, t); collide(t); }
    if (tickN % 30 === 0) crowdTick();
    for (const th of S.things) th.hit *= Math.exp(-dt * 5);
    let sleepy = false;
    for (let i = 0; i < O.length; i++) { const o = O[i], b = o.body;
      o.glow *= Math.exp(-dt * 2.2); o.ring *= Math.exp(-dt * 3); for (let q = 0; q < 7; q++) o.nodeGlow[q] *= Math.exp(-dt * 3);
      b.calm = Math.hypot(b.vx, b.vy) < .25 && !b.grab ? b.calm + dt : 0;
      if ((tickN + i) % 50 === 0) { let best = null, bd = 2 + 4 * o.g.hear; for (const p of O) if (p !== o && !p.parked) { const d = Math.hypot(p.body.x - b.x, p.body.y - b.y); if (d < bd) { bd = d; best = p; } } b.partner = best; }
      b.pin = Math.max(0, Math.min(1, -b.ps / .45)); b.pout = Math.max(0, Math.min(1, b.ps / .6));
      b.pull = b.grab ? Math.min(1, Math.hypot(b.x - b.grab.x, b.y - b.grab.y)) : b.pull * Math.exp(-dt * 3);
      if (!o.awake) continue;
      if (o !== S.ohm && !b.grab && t - o.wakeT > SLEEP_S) { o.awake = false; sleepy = true; continue; }
      post(o, 'body.pinchIn', b.pin); post(o, 'body.pinchOut', b.pout); post(o, 'body.pull', b.pull); post(o, 'body.motion', Math.min(1, Math.hypot(b.vx, b.vy) / 6)); }
    if (sleepy) rebuild();
    S.stats.ms = S.stats.ms * .9 + (performance.now() - a0) * .1; };
  // breathing reads the shared clock: a slow breath over one 4-beat bar plus a small throb on every beat (switchable PROPOSAL)
  S.breath = o => { if (!S.opts.breath) return 1; const bar = music.bar(), ph = music.phase(); return 1 + .045 * Math.sin(bar * Math.PI * 2) + .03 * Math.exp(-ph * 9); };
  return S;
}
