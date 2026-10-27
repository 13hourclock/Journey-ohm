// DIVE (world track, the approved layered zoom, first slice): pinch INTO one ohm and keep going down through its insides.
// His words (Wilbow 12:08 PM Oct 25, JUST Chat, approved): one smooth zoom + a sideways glide in all directions with the same big
// smooth feel; going in splits the sound into its parts, going out blends it together; every layer is playable; changes flow both
// ways; full detail only near the focus; ohms can go to every scale (home = planets). Docs: NEW_ENGINE (ohm -> its organs /
// resonators = the real modal modes -> wavelengths = the real synthesis state), SCALE_MUSIC 4 (partials by body type, up to 16
// sines, bottom up, tap a partial = solo it, near-miss partials shimmer at the beat rate).
// The inside is the ohm's ACTUAL sound: recipe.voicesFor() of its current note, the same messages sound.js sends.
//   depth 1 VOICES   = its voice parts (the modal body, the instrument / tract voice, a sample layer)
//   depth 2 PARTIALS = the focused voice's partials (the modal body's real modes; an instrument voice's harmonics under its filter)
//   depth 3 WAVE     = each partial as its own wave, one lane each (the focused lane alone, the whole voice's wave behind it)
// Gesture: two fingers that start on bare ground around an ohm (a pinch ON it stays its squeeze) and spread with their midpoint on /
// near it = dive (zoom.js hands the zoom here; the world camera holds still, so the existing zoom feel is untouched everywhere else).
// Same feel: the same log scale (each +1 = 4x closer), the same directional snap spring. Pinching back out past the ohm = normal zoom.
// Inside: one finger plays (tap a part = it alone, drag across = strum, drag up / down ON a part = its level / brightness, flows UP),
// two fingers zoom deeper / out and glide sideways (momentum), the focus = what is nearest the middle.
// DOWN: the ohm's own state (its sound level, glow, the place's heal) shapes what you see inside; its notes flash the parts.
// Every number + every behaviour beyond his words is a PROPOSAL (W.zl.dive.opts, dev panel). Visuals hooks (look/*, Visuals track):
//   look.diveBack(g, D, st), look.diveVoice(g, part, x, y, r, st), look.divePartial(g, partial, x, y, r, st), look.diveWave(g, lane, y0, amp, st)
//   (each optional: when present it draws that piece instead of the placeholder here).
import { cam } from './view.js';
import { toScreen } from './space.js';
import { recipes, voicesFor, octaveOf } from './recipe.js';
import { smooth } from './planet.js';
import { noLine, softRing } from './soft.js';   // v0.0.30 B16: no outlines
export const DIVE_OPTS = {
  on: true,        // pinch into an ohm (off = zoom over an ohm opens the ground layer as before)
  reach: 1.3,      // the pinch midpoint must be within reach x the ohm's radius (+ reachPx) to dive into it
  reachPx: 24,
  maxZ: 3.4,       // deepest (3 = the wave)
  snap: true,      // the same directional snap spring as the world zoom, per inner layer
  glideTau: .9,    // sideways glide momentum (s to fall to 1/e)
  magnet: 2.2,     // the focus eases to the middle when you let go (1/s; 0 = off)
  split: true,     // inside, its own notes split: the focus part / partial full, the rest quieter + spread by where they sit
  rest: .2,        // level of the parts away from the focus (full detail only near the focus)
  partials: 16,    // up to 16 partials (SCALE_MUSIC 4)
  up: true,        // drags inside change the ohm's recipe (voice level = recipe.mix, partial tilt = modal brightness / filter)
  upLook: true,    // ... and its look (hue drifts with the brightness you give it, at most +-24 deg)
  down: true,      // its state shapes the inside (level, glow, heal)
  arrive: true,    // settling on a new inner layer plays its note once, through that layer
  shape: true,     // PROPOSAL (q360 'C'): the inside is where you shape its sound - a sideways drag on the part / partial in the middle shapes
                   //   what it is (depth 1: the body's material string / skin / bar, the instrument's share of the blend; depth 2: how the partials
                   //   ring - damping / resonance); up / down stays level / brightness. Saved with the ohm (recipe). Never pitch. Off = sideways is a strum.
  hideWorld: true, // fully inside (depth >= 1) the world under it is not drawn at all (it is covered; saves the frame)
  magnetEase: .3,  // v0.0.24 smooth zoom: after you let go the magnet ramps in over this many s (and fades in as a glide slows) instead of tugging at once; 0 = v0.0.23
  gvTau: .05,      // v0.0.24 smooth zoom: the glide speed you let go with is a time-weighted average (s), so a pinch's two fingers, which
                   //   move one at a time, no longer leave a stray drift after letting go; 0 = the v0.0.23 per-move average
  worldFollow: true, // v0.0.24 smooth zoom: between the ground and depth 1 the world behind zooms WITH the dive (render.js scales the live
                   //   frame about the ohm), and going back out the ohm glides back to where it stands in the world, so the last frame of the
                   //   dive is the world itself (no freeze while the inside grows, no jump on leaving). Off = the v0.0.23 held world.
  followAll: true, // v0.0.29 zoom fix: that follow zoom scales the whole picture (the world canvas + the ohms, a fresh copy each frame); off = the
                   //   v0.0.27 copy of the ohm canvas only (world black behind the ohms, ohms smeared into trails while diving in / out)
  followPrev: true, // v0.0.29 perf: followAll's world layer is last frame's #bg (copied at the start of render.draw) instead of this frame's
                   //   half-drawn one, so the copy doesn't force a mid-frame raster (dive draw p95 10.9 -> 6.6 ms headless); off = same-frame copy
  backSmooth: true, // v0.0.29 zoom fix: the inside's light stays the radial glow at every depth (off = v0.0.27: it snapped to a flat brighter fill at R > 1.6 x screen, a one-frame flash at depth ~2.64 diving partials <-> wave)
};
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const NAMES = { body: 'body', voice: 'voice', tone: 'tone', sample: 'sample' };
const shapeKey = rec => { const f = rec.modal.fam || {}, s = (rec.shape && rec.shape.synth) || {}; return [f.string, f.membrane, f.bar, rec.modal.p.damp, s.cut, s.reso].map(v => (+v || 0).toFixed(3)).join(','); };
const famPos = f => { const t = (f.string || 0) + (f.membrane || 0) + (f.bar || 0) || 1; return ((f.membrane || 0) + 2 * (f.bar || 0)) / t; };   // 0 string .. 1 skin .. 2 bar
const famAt = m => ({ string: Math.max(0, 1 - m), membrane: Math.max(0, 1 - Math.abs(m - 1)), bar: Math.max(0, m - 1) });   // the three body shapes all share mode 1 = 1 x f0 (pitch stays)
export function createDive(W, sim, bus, music, K) {
  const O = { ...DIVE_OPTS };
  const D = { opts: O, o: null, z: 0, v: 0, dir: 0, ox: 0, oy: 0, r0: 40, gvx: 0, gvy: 0, f0: 0, parts: [], f: [0, 0, 0, 0], free: [true, true, true, true],
    flash: {}, pflash: new Float32Array(16), base: {}, hue0: 0, W: 412, H: 915, key: '', lastT: 0, gest: null, stats: { enters: 0, plays: 0, edits: 0, splits: 0 } };
  const U = () => Math.min(D.W, D.H);
  // ---- the ohm's actual sound, broken into parts ----
  const kindOf = m => m.t === 'note' ? 'body' : m.tract ? 'voice' : m.P && m.P.smp ? 'sample' : 'tone';
  const harmonics = (m, f0, n) => { const cut = m.P && m.P.cut > 0 ? m.P.cut : 2500, out = [];   // an instrument voice: its harmonics under its own filter
    for (let k = 1; k <= n; k++) { const f = f0 * k; if (f > 16000) break; out.push({ f, a: 1 / Math.pow(k, 1.1) / (1 + Math.pow(f / cut, 2)), d: .6 + 1.2 / k }); } return out; };
  D.analyse = (force = false) => { const o = D.o; if (!o) return D.parts; const rec = recipes.get(o.recipe); if (!rec) return D.parts;
    if (!(D.f0 > 0)) D.f0 = music.hz(0, octaveOf(rec));
    const key = o.recipe + ':' + D.f0.toFixed(2) + ':' + rec.mix.modal.toFixed(3) + ':' + rec.mix.synth.toFixed(3) + ':' + rec.modal.p.bright.toFixed(3) + ':' + (rec.synth.genes.cut || 0).toFixed(3) + ':' + shapeKey(rec);
    if (!force && key === D.key) return D.parts; D.key = key;
    const msgs = voicesFor(rec, { f: D.f0, vel: .7, pos: .35, dur: 1, src: o.id, fx: -1 }, {}, null), n = msgs.length, R = n > 1 ? .26 : 0;
    D.parts = msgs.map((m, i) => { const kind = kindOf(m), an = -Math.PI / 2 + i / Math.max(1, n) * Math.PI * 2;
      let ps = kind === 'body' ? m.modes.map(q => ({ f: q.f, a: q.a, d: q.d })) : harmonics(m, D.f0, O.partials); ps.sort((a, b) => a.f - b.f); ps = ps.slice(0, O.partials);
      const amax = ps.reduce((s, q) => Math.max(s, q.a), 0) || 1, flo = ps.length ? ps[0].f : D.f0;
      ps.forEach((q, k) => { q.k = k; q.an = q.a / amax; const oct = Math.log2(q.f / flo), ang = -Math.PI / 2 + oct * Math.PI * 2, rr = .07 + .1 * oct; q.lx = Math.cos(ang) * rr; q.ly = Math.sin(ang) * rr; q.ly3 = k * .15; });
      for (const q of ps) { q.beat = 0; for (const p of ps) if (p !== q) { const df = Math.abs(p.f - q.f); if (df > .3 && df < 14 && df / q.f < .04) q.beat = Math.max(q.beat, df); } }   // near-miss partials shimmer at their beat rate
      return { i, kind, name: NAMES[kind], gain: m.gain, lx: Math.cos(an) * R, ly: Math.sin(an) * R, partials: ps }; });
    return D.parts; };
  // ---- the three inner layers, in the one stack (zoomlayers.js): deepest first ----
  const lw = n => D.o ? clamp(D.z - (n - 1)) : 0;
  D.ws = () => { const w3 = lw(3), w2 = lw(2) * (1 - w3), w1 = lw(1) * (1 - w3 - w2); return { voices: w1, partials: w2, wave: w3 }; };   // = K.weights for the inner three
  const sum = () => { const o = D.o; return { heal: W.healAt ? W.healAt(0, 0) : .5, jam: o ? Math.min(1, o.glow || 0) : 0, n: D.parts.length }; };
  K.add({ id: 'voices', depth: 1, weight: () => lw(1), sum });
  K.add({ id: 'partials', depth: 2, weight: () => lw(2), sum });
  K.add({ id: 'wave', depth: 3, weight: () => lw(3), sum });
  // ---- geometry: level n sits at scale 4^(z - n), around the focus of the level above ----
  const P = { x: 0, y: 0 };
  D.scale = n => U() * Math.pow(4, D.z - n);
  D.origin = (n, out = P) => { let x = D.ox, y = D.oy; const pt = D.parts[D.f[1]];
    if (n >= 2 && pt) { const s = D.scale(1); x += pt.lx * s; y += pt.ly * s; }
    if (n >= 3 && pt) { const q = pt.partials[D.f[2]]; if (q) { const s = D.scale(2); x += q.lx * s; y += q.ly * s; } }
    out.x = x; out.y = y; return out; };
  const items = n => { if (n === 1) return D.parts; const pt = D.parts[D.f[1]]; return pt ? pt.partials : []; };
  const posOf = (n, it, out) => { const o = D.origin(n, out), s = D.scale(n); if (n === 3) { const pt = D.parts[D.f[1]], q0 = pt && pt.partials[D.f[2]]; out.y = o.y + (it.ly3 - (q0 ? q0.ly3 : 0)) * s; return out; }
    out.x = o.x + it.lx * s; out.y = o.y + it.ly * s; return out; };
  const radOf = (n, it) => { const s = D.scale(n); return n === 1 ? .11 * s : n === 2 ? (.02 + .03 * Math.sqrt(it.an)) * s : .06 * s; };
  const tq = { x: 0, y: 0 };
  const nearest = (n, x, y, lim) => { let b = -1, bd = lim; const L = items(n); for (let i = 0; i < L.length; i++) { posOf(n, L[i], tq); const d = n === 3 ? Math.abs(tq.y - y) : Math.hypot(tq.x - x, tq.y - y); if (d < bd) { bd = d; b = i; } } return b; };
  D.level = () => clamp(Math.round(D.z), 1, 3);
  const refocus = () => { const cx = D.W / 2, cy = D.H / 2; for (let n = 1; n <= 3; n++) { D.free[n] = D.z < n + .5; if (!D.free[n]) continue;
      const i = nearest(n, cx, cy, 1e9); if (i >= 0 && i !== D.f[n]) D.f[n] = i; } };
  // ---- enter / leave ----
  D.owns = () => !!(D.o && O.on && D.z > .35);
  D.enter = (o, sx, sy, r0) => { D.o = o; D.z = 0; D.v = 0; D.ox = sx; D.oy = sy; D.r0 = Math.max(12, r0); D.gvx = D.gvy = 0; D.f = [0, 0, 0, 0]; D.base = {}; D.hue0 = o.hue || 0;
    D.f0 = 0; D.key = ''; D.analyse(true); D.stats.enters++; bus.post({ type: 'dive.enter', src: o }); };
  D.leave = () => { if (!D.o) return; const o = D.o; D.o = null; D.z = 0; D.v = 0; D.parts = []; bus.post({ type: 'dive.leave', src: o }); };
  // zoom.js hands every zoom step here first; true = taken (the world camera does not move)
  D.zoom = (z, mx, my, px, py, Wd, Hd) => { if (!O.on) { if (D.o) D.leave(); return false; } D.W = Wd; D.H = Hd; const dz = z - cam.z;
    if (!D.o) { if (!(dz > 0) || cam.z < -.6 || cam.z >= .92) return false;
      let best = null, bd = 1e9; for (const q of sim.ohms || []) { if (q.parked) continue; const s = toScreen(Wd, Hd, cam.sim || sim.cam, q.body.x, q.body.y, tq), r = (q.g ? q.g.r : 1) * s.s, d = Math.hypot(mx - s.x, my - s.y);
        if (d < r * O.reach + O.reachPx && d / r < bd) { bd = d / r; best = { q, x: s.x, y: s.y, r }; } }
      if (!best) return false; D.enter(best.q, best.x, best.y, best.r); }
    D.step(dz, mx, my, px, py); if (D.z <= 0 && dz < 0) D.leave(); return true; };
  // where the ohm stands in the world on screen now (world follow: the world frame is scaled about this point onto D.ox / D.oy)
  const AQ = { x: 0, y: 0, s: 1 }; D.anchor = () => D.o && D.o.body ? toScreen(D.W || W.vw, D.H || W.vh, cam.sim || sim.cam, D.o.body.x, D.o.body.y, AQ) : null;
  // going out below depth 1 the origin eases back onto the ohm's spot in the world: the gap closes in proportion to the depth left, so
  // it is exactly closed at depth 0 (mirror of the pull to the middle going in)
  const homeBack = z0 => { if (!O.worldFollow || !(D.z < z0) || z0 <= 0 || D.z >= 1) return false; const a = D.anchor(); if (!a) return false; const f = Math.min(1, (z0 - D.z) / z0); D.ox += (a.x - D.ox) * f; D.oy += (a.y - D.oy) * f; return true; };
  D.step = (dz, mx, my, px = 0, py = 0) => { const z1 = clamp(D.z + dz, 0, O.maxZ), k = Math.pow(4, z1 - D.z); if (Math.abs(dz) > 1e-4) D.dir = Math.sign(dz);
    const zPrev = D.z; D.ox = mx + px + (D.ox - mx) * k; D.oy = my + py + (D.oy - my) * k; D.z = z1;   // zoom about the fingers' midpoint, then glide with it
    if (dz > 0) { const n = Math.min(3, Math.floor(D.z + .5)), it = n === 0 ? null : items(n)[D.f[n]]; if (n === 0 || it) { if (n === 0) { tq.x = D.ox; tq.y = D.oy; } else posOf(n, it, tq); const a = Math.min(1, dz * 1.1); D.ox += (D.W / 2 - tq.x) * a; D.oy += (D.H / 2 - tq.y) * a; } }   // going in, what you dive into comes to the middle
    const t = performance.now() / 1000; if (O.gvTau > 0) { const dt = Math.max(1e-3, t - (D.lastT || t - .016)), w = 1 - Math.exp(-dt / O.gvTau); D.lastT = t; D.gvx += (px / dt - D.gvx) * w; D.gvy += (py / dt - D.gvy) * w; }   // time-weighted: the two fingers' separate moves cancel
    else { const dt = Math.max(.008, t - (D.lastT || t - .016)); D.lastT = t; D.gvx = D.gvx * .6 + .4 * px / dt; D.gvy = D.gvy * .6 + .4 * py / dt; } D.v = 0; if (!homeBack(zPrev)) clampO(); };
  const clampO = () => { const n = Math.max(1, D.level()), u = U() * 1.4, o = D.origin(n, tq), dx = o.x - D.W / 2, dy = o.y - D.H / 2, sx = Math.max(-u, Math.min(u, dx)) - dx, sy = Math.max(-u, Math.min(u, dy)) - dy; D.ox += sx; D.oy += sy; };
  // ---- tick: snap, glide momentum, magnet, flashes, the layer stack's posts ----
  let postT = 0;
  D.tick = dt => { if (!D.o) return; if (cam.active) D.magK = 0; if (!O.on || D.o.parked || (sim.ohms && !sim.ohms.includes(D.o))) { D.leave(); return; }
    if (!(performance.now() - (D.frameT || -1e9) < 120)) D.cam(dt);   // v0.0.24 (world.opts.camFrame): the drawing loop moves the dive camera each frame; this control tick only covers when it stops
    if (D.z < .5) D.deepest = 0;
    D.analyse(); refocus(); const fd = Math.exp(-dt * 3); for (const k in D.flash) D.flash[k] *= fd; for (let i = 0; i < 16; i++) D.pflash[i] *= fd;
    const t = music.now(); if (t >= postT) { postT = t + .1; const g = sim.sig.global, put = (k, v) => { if (g && g[k] != null && Math.abs(g[k] - v) < 4e-3) return; bus.ctl('global', k, v); };
      put('dive.depth', D.z); const WS = D.ws(); put('zoom.voices', WS.voices); put('zoom.partials', WS.partials); put('zoom.wave', WS.wave); } };
  // the dive camera: snap, glide momentum, magnet (control tick, or each drawn frame with world.opts.camFrame: D.frame)
  D.frame = dt => { if (!D.o) return; D.frameT = performance.now(); D.cam(dt); };
  D.cam = dt => { if (!D.o) return;
    if (!cam.active) { if (O.snap) { const tg = D.dir > 0 ? Math.ceil(D.z - .2) : D.dir < 0 ? Math.floor(D.z + .2) : Math.round(D.z), T = clamp(tg, 0, Math.floor(O.maxZ)), z0 = D.z;
        D.v += ((T - D.z) * 40 - D.v * 11) * dt; const z1 = Math.abs(T - D.z) < 1e-3 && Math.abs(D.v) < 1e-3 ? T : D.z + D.v * dt; if (z1 === T) D.v = 0; const k = Math.pow(4, z1 - z0), cx = D.W / 2, cy = D.H / 2;
        D.ox = cx + (D.ox - cx) * k; D.oy = cy + (D.oy - cy) * k; D.z = z1; const hb = homeBack(z0); if (hb) D.gvx = D.gvy = 0;   // world follow: glide home, no drift
        if (D.z <= 1e-3 && T === 0) { D.leave(); return; }
        const L = Math.round(D.z); if (Math.abs(D.z - L) < .01 && L !== D.landed) { D.landed = L; if (L >= 1) bus.post({ type: 'dive.layer', depth: L, src: D.o }); if (O.arrive && L >= 1 && L > (D.deepest || 0)) D.play(L, -1, .55); D.deepest = Math.max(D.deepest || 0, L); } }
      const e = Math.exp(-dt / Math.max(.05, O.glideTau)); D.ox += D.gvx * dt; D.oy += D.gvy * dt; D.gvx *= e; D.gvy *= e;
      const gs = Math.hypot(D.gvx, D.gvy), out0 = O.worldFollow && D.z < 1 && D.dir < 0;   // world follow going out: the ohm glides home (homeBack), no pull to the middle
      D.magK = O.magnetEase > 0 ? Math.min(1, (D.magK || 0) + dt / O.magnetEase) : 1;   // v0.0.24 the magnet eases in after you let go (no sudden tug)
      if (O.magnet > 0 && gs < 60 && !out0) { const n = Math.min(3, Math.round(D.z)), it = n >= 1 ? items(n)[D.f[n]] : null; if (n === 0) { tq.x = D.ox; tq.y = D.oy; } else if (it) posOf(n, it, tq); else { tq.x = D.W / 2; tq.y = D.H / 2; }
        const a = Math.min(1, dt * O.magnet) * D.magK * (O.magnetEase > 0 ? Math.min(1, (60 - gs) / 30) : 1); D.ox += (D.W / 2 - (n === 3 ? D.W / 2 : tq.x)) * a; D.oy += (D.H / 2 - tq.y) * a; }
      if (!(O.worldFollow && D.z < 1 && D.dir < 0)) clampO(); } };
  // ---- the sound split (sound.js calls this for every note of an ohm, after its own mix) ----
  const tone = (m, modes, gain) => ({ t: 'note', modes, gain, click: 0, clickT: .004, clp: .1, att: .003, pan: m.pan || 0, send: m.send, src: m.src, fx: m.fx, hold: 0, tag: m.tag || 0 });
  const partialMsgs = (m, ps, ampOf, gain, dur) => { const out = []; let cur = [];   // the voice rebuilt from its partials (dsp: 8 modes per voice)
    const tot = ps.reduce((s, q) => s + q.a * ampOf(q), 0) || 1;
    for (const q of ps) { const a = q.a * ampOf(q); if (a < 1e-4) continue; cur.push({ f: q.f, a: a / tot, d: Math.max(.08, q.d * dur) }); if (cur.length === 8) { out.push(tone(m, cur, gain)); cur = []; } }
    if (cur.length) out.push(tone(m, cur, gain)); return out; };
  D.split = (o, msgs, ev) => { if (!D.o || o !== D.o || !O.on || !msgs.length) return null; if (ev.f > 0 && !ev.dive) D.f0 = ev.f;
    const parts = D.analyse(), dv = ev.dive, WS = D.ws(), wv = WS.voices + WS.partials + WS.wave, wp = WS.partials + WS.wave, ww = WS.wave;
    const r = ev.f > 0 && D.f0 > 0 ? ev.f / D.f0 : 1, scaled = ps => r === 1 ? ps : ps.map(q => ({ ...q, f: q.f * r }));
    if (dv) { const pk = dv.part != null ? parts[dv.part] : null; let out = pk ? msgs.filter(m => kindOf(m) === pk.kind) : msgs;   // played inside: just that part / that partial
      if (pk && dv.partial != null) { const m = out[0] || msgs[0], q = pk.partials[dv.partial]; if (q) out = partialMsgs(m, scaled([q]), () => 1, (m.gain || .2) * .9, ev.dur || 1); D.pflash[dv.partial] = 1; }
      if (pk) D.flash[pk.kind] = 1; D.stats.plays++; return out.length ? out : msgs; }
    for (const p of parts) D.flash[p.kind] = Math.max(D.flash[p.kind] || 0, ev.vel || .6);
    if (!O.split || wv + wp < .01) return null; D.stats.splits++;
    const fk = parts[D.f[1]] ? parts[D.f[1]].kind : null, cx = D.W / 2, out = [];
    for (const m of msgs) { const kd = kindOf(m), p = parts.find(q => q.kind === kd), foc = kd === fk;
      if (p) { posOf(1, p, tq); m.pan = clamp((m.pan || 0) * (1 - wv) + wv * clamp((tq.x - cx) / (D.W * .6), -1, 1) * .8, -1, 1); }
      m.gain *= foc ? 1 : 1 - (1 - O.rest) * wv;
      if (foc && p && wp > .01) { const n = Math.max(1, Math.ceil(p.partials.length * clamp(WS.partials * 1.25 + ww))), fp = ww > .5 ? D.f[3] : D.f[2];   // partials come in one at a time from the bottom, then all together
        const ampOf = q => q.k >= n ? 0 : q.k === fp ? 1 : 1 - (1 - O.rest) * Math.max(WS.partials, ww) * (ww > .01 ? 1.2 : .8);
        for (const t of partialMsgs(m, scaled(p.partials), q => Math.max(0, ampOf(q)), m.gain * wp, ev.dur || 1)) out.push(t); m.gain *= 1 - wp; D.pflash[fp] = Math.max(D.pflash[fp] || 0, ev.vel || .6); }
      if (m.gain > 1e-4) out.push(m); }
    return out; };
  // ---- play + edit inside (input.js routes one finger here while you are inside) ----
  D.play = (n, i, vel = .7) => { const o = D.o; if (!o) return false; const ev = { src: o, kind: 'note', f: D.f0 || undefined, vel: clamp(vel, .05, 1), pos: .35, dur: n >= 2 ? 1.6 : 1.2, dive: {} };
    if (n >= 1 && i >= 0) { if (n === 1) ev.dive.part = i; else { ev.dive.part = D.f[1]; ev.dive.partial = i; } }
    else if (n >= 2) { ev.dive.part = D.f[1]; ev.dive.partial = D.f[n === 3 ? 3 : 2]; } else if (n === 1) ev.dive.part = D.f[1];
    bus.note(ev); bus.post({ type: 'layer.play', layer: n === 1 ? 'voices' : n === 2 ? 'partials' : 'wave', kind: 'dive', i, f: D.f0 }); return true; };
  D.hit = (x, y) => { const n = D.level(), L = items(n); let b = -1, bd = 1e9; for (let i = 0; i < L.length; i++) { posOf(n, L[i], tq); const r = Math.max(22, radOf(n, L[i]) * 1.3), d = n === 3 ? Math.abs(y - tq.y) : Math.hypot(x - tq.x, y - tq.y); if (d < r && d < bd) { bd = d; b = i; } } return b < 0 ? null : { n, i: b }; };
  D.down = (x, y, vel = .7) => { const h = D.hit(x, y); D.gest = { x0: x, y0: y, h, last: h ? h.n * 100 + h.i : -1, edit: false, strum: false, vel, v0: null }; };
  const editStart = h => { const rec = recipes.get(D.o.recipe), pt = h.n === 1 ? D.parts[h.i] : D.parts[D.f[1]]; if (!rec || !pt) return null;
    if (h.n === 1) return pt.kind === 'body' ? { path: 'recipe.mix.modal', v: rec.mix.modal } : pt.kind === 'sample' ? null : { path: 'recipe.mix.synth', v: rec.mix.synth };
    if (h.n === 2) return pt.kind === 'body' ? { path: 'recipe.modal.p.bright', v: rec.modal.p.bright } : O.shape ? sh(rec, 'cut') : { path: 'recipe.synth.genes.cut', v: rec.synth.genes.cut == null ? .5 : rec.synth.genes.cut };
    return null; };
  // SHAPE (O.shape): an instrument voice's filter is shaped through rec.shape.synth (offsets voicesFor adds as matrix synth.* rows, so a palette
  // instrument hears it too; genes.cut alone only reaches the generic engines). Only cut / reso exist there: nothing that moves pitch.
  const sh = (rec, k) => ({ path: 'recipe.shape.synth.' + k, v: (rec.shape && rec.shape.synth && rec.shape.synth[k]) || 0, lo: -.5, hi: .5 });
  const shapeStart = h => { const rec = recipes.get(D.o.recipe), pt = h.n === 1 ? D.parts[h.i] : D.parts[D.f[1]]; if (!rec || !pt || h.i !== D.f[h.n]) return null;   // only the part / partial in the middle
    if (h.n === 1 && pt.kind === 'body') return { path: 'recipe.modal.fam', v: famPos(rec.modal.fam || {}), lo: 0, hi: 2, k: 2, hint: m => m < .5 ? 'body: string' : m < 1.5 ? 'body: skin' : 'body: bar', set: m => bus.set(D.o, 'recipe.modal.fam', famAt(m)) };
    if (h.n === 1 && pt.kind !== 'sample') { const L = Math.max(.05, rec.mix.modal, rec.mix.synth), c = rec.mix.synth >= rec.mix.modal ? 1 - rec.mix.modal / (2 * L) : rec.mix.synth / (2 * L);   // the instrument's share of the blend: .5 = both at the louder level; the louder level is kept
      return { path: 'recipe.mix', v: clamp(c, .08, .92), lo: .08, hi: .92, hint: c2 => `${pt.name} ${Math.round(c2 * 100)}% / body ${Math.round((1 - c2) * 100)}%`,   /* .08 .. .92: neither voice leaves the inside */
        set: c2 => { bus.set(D.o, 'recipe.mix.synth', L * Math.min(1, 2 * c2)); bus.set(D.o, 'recipe.mix.modal', L * Math.min(1, 2 * (1 - c2))); } }; }
    if (h.n === 2) return pt.kind === 'body' ? { path: 'recipe.modal.p.damp', v: rec.modal.p.damp, hint: v => v < .35 ? 'rings even (metal)' : v < .7 ? 'upper partials fade' : 'upper partials die fast (wood)' }
      : Object.assign(sh(rec, 'reso'), { hint: v => v > .15 ? 'resonant edge' : v < -.15 ? 'smooth edge' : 'edge' });
    return null; };
  let setT = 0;
  D.move = (x, y) => { const g = D.gest; if (!g) return; const dx = x - g.x0, dy = y - g.y0;
    if (!g.edit && !g.strum && Math.hypot(dx, dy) > 14) { if (O.up && g.h && g.h.n <= 2 && Math.abs(dy) > Math.abs(dx) * 1.4) { g.v0 = editStart(g.h); g.edit = !!g.v0; }
      else if (O.shape && g.h && g.h.n <= 2 && Math.abs(dx) > Math.abs(dy) * 1.4) { g.v0 = shapeStart(g.h); g.edit = !!g.v0; if (g.edit) { g.v0.x = true; D.stats.shapes = (D.stats.shapes || 0) + 1; } }   /* sideways from the middle one = shape; from anywhere else = strum */
      if (!g.edit) g.strum = true; }
    if (g.edit) { const E = g.v0, v = clamp(E.x ? E.v + dx * (E.k || 1) / (U() * .45) : E.v - dy / (U() * .45), E.lo == null ? 0 : E.lo, E.hi == null ? 1 : E.hi), now = performance.now(); if (now - setT < 50) return; setT = now;
      if (D.base[E.path] == null) D.base[E.path] = E.v; if (E.set) E.set(v); else bus.set(D.o, E.path, v); D.stats.edits++; D.hint = E.hint ? E.hint(v) : '';
      if (O.upLook && /bright|cut/.test(g.v0.path)) bus.set(D.o, 'src.hue', ((D.hue0 + clamp((v - D.base[g.v0.path]) * 48, -24, 24)) % 360 + 360) % 360);   // brighter = warmer
      if (now - (g.pt || 0) > 220) { g.pt = now; D.analyse(true); D.play(g.h.n, g.h.n === 1 ? g.h.i : -1, .5); } bus.post({ type: 'dive.edit', src: D.o, path: g.v0.path, v }); return; }
    if (g.strum) { const h = D.hit(x, y), id = h ? h.n * 100 + h.i : -1; if (h && id !== g.last) { D.play(h.n, h.i, .55); } g.last = id; } };
  D.up = (x, y, ms = 0) => { const g = D.gest; D.gest = null; if (!g) return; if (!g.edit && !g.strum && ms < 450) { if (g.h) { if (g.h.n === 1) D.f[1] = g.h.i; D.play(g.h.n, g.h.i, g.vel); } else D.play(D.level(), -1, g.vel * .8); }
    if (g.edit) { D.analyse(true); D.hint = ''; } };
  D.cancel = () => { D.gest = null; D.hint = ''; };
  // ---- placeholder visuals (render.js calls this last, over everything; look.dive* replace pieces) ----
  // v0.0.30 B16 lnDive (+ noOutlines): the placeholder inside has no outlines - the membrane and the focused voice get soft rings of light, the
  // partials' spectrum is bars, the pitch spiral beads, standing waves + wave lanes + the scope filled shapes (light under the wave). Off = v0.0.29 strokes.
  D.draw = (g, Wd, Hd, t, look = {}, st = {}, scope = null) => { if (!D.o) return; D.W = Wd; D.H = Hd; const o = D.o, hue = o.hue || 0, z = D.z, u = U(), nl = noLine('lnDive'), dvT = !noLine('diveTextDev') || !!(W.opts || {}).dev;   /* v0.0.30 G2 diveTextDev: dive text (voice names, Hz, partial labels, shaping hint) only with dev */
    const lev = O.down ? Math.min(1, (sim.sig[o.id] && sim.sig[o.id]['sound.level']) || 0) : .3, glow = O.down ? Math.min(1, (o.glow || 0) + ((o.look && o.look.glow) || 0) * .5) : 0, heal = O.down && W.healAt ? W.healAt(0, 0) : .6;
    const sat = 35 + 50 * heal, lit = .55 + .3 * lev + .2 * glow, back = smooth(z / .9);
    D.view = { lev, glow, heal, sat, lit };
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;   /* the world may leave 'lighter' set: the inside paints over it */
    if (look.diveBack) look.diveBack(g, D, st); else if (back > .01) {   // the ohm's inside: its colour, lit by its own sound
      const R = D.r0 * Math.pow(4, z); if (R > (O.backSmooth !== false ? 1e9 : 1.6) * Math.max(Wd, Hd)) { g.fillStyle = `hsla(${hue},${sat}%,${14 + 10 * lit}%,${back})`; g.fillRect(0, 0, Wd, Hd); } else { const gr = g.createRadialGradient(D.ox, D.oy, 0, D.ox, D.oy, Math.max(R, 1));
      gr.addColorStop(0, `hsla(${hue},${sat}%,${14 + 10 * lit}%,${back})`); gr.addColorStop(.85, `hsla(${(hue + 30) % 360},${sat}%,${6 + 6 * lit}%,${back})`); gr.addColorStop(1, `hsla(${(hue + 40) % 360},${sat * .7}%,4%,${back})`);
      g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd); if (nl) softRing(g, D.ox, D.oy, R, Math.max(3, R * .04), `${hue},45%,70%`, .4 * (1 - smooth(z - .6))); else { g.strokeStyle = `hsla(${hue},80%,70%,${.5 * (1 - smooth(z - .6))})`; g.lineWidth = 2; g.beginPath(); g.arc(D.ox, D.oy, R, 0, 6.2832); g.stroke(); } } }
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    // depth 1: its voices
    const a1 = smooth((z - .25) / .6) * (1 - .75 * smooth(z - 1.3));
    if (a1 > .01) for (const p of D.parts) { posOf(1, p, tq); const r = radOf(1, p), foc = p.i === D.f[1], fl = D.flash[p.kind] || 0, x = tq.x, y = tq.y;
      if (x < -r || x > Wd + r || y < -r || y > Hd + r) continue;
      if (look.diveVoice) { look.diveVoice(g, p, x, y, r, st); continue; }
      const h2 = (hue + (p.kind === 'body' ? 0 : p.kind === 'voice' ? 60 : p.kind === 'sample' ? 200 : 120)) % 360;
      g.globalAlpha = a1 * (foc ? 1 : .45); g.fillStyle = `hsla(${h2},${sat}%,${30 + 30 * lit + 20 * fl}%,.85)`; g.beginPath(); g.arc(x, y, r * (1 + .12 * fl + .05 * lev), 0, 6.2832); g.fill();
      if (foc) { if (nl) softRing(g, x, y, r * (1 + .12 * fl + .05 * lev), Math.max(3, r * .1), `${h2},60%,85%`, .7); else { g.strokeStyle = `hsla(${h2},90%,85%,.9)`; g.lineWidth = 2; g.stroke(); } g.fillStyle = 'rgba(255,255,255,.9)'; if (z < 1.6 && dvT) { g.font = `${Math.min(22, Math.max(11, Math.round(r * .32)))}px sans-serif`; g.fillText(p.name, x, Math.max(Hd * .1, y - r * 1.25)); } }
      const ps = p.partials; if (ps.length && (foc || r > 30)) { if (nl) { g.fillStyle = `hsla(${h2},60%,88%,${foc ? .7 : .35})`; for (let k = 0; k < ps.length; k++) { const xx = x - r * .6 + r * 1.2 * k / Math.max(1, ps.length - 1), hh = r * .6 * ps[k].an; g.fillRect(xx - .8, y + r * .3 - hh, 1.6, hh); } continue; }
        g.strokeStyle = `hsla(${h2},90%,88%,${foc ? .8 : .4})`; g.lineWidth = 1.2; g.beginPath();   // a hint of what is inside it: its partials as a tiny spectrum
        for (let k = 0; k < ps.length; k++) { const xx = x - r * .6 + r * 1.2 * k / Math.max(1, ps.length - 1), hh = r * .6 * ps[k].an; g.moveTo(xx, y + r * .3); g.lineTo(xx, y + r * .3 - hh); } g.stroke(); } }
    // depth 2: the focused voice's partials on a pitch spiral (one turn = one octave)
    const a2 = smooth((z - 1.2) / .6) * (1 - smooth((z - 2.3) / .6)), pt = D.parts[D.f[1]];
    if (a2 > .01 && pt) { const ps = pt.partials, s2 = D.scale(2), o2 = D.origin(2, { x: 0, y: 0 }), nIn = Math.max(1, Math.ceil(ps.length * clamp((z - 1.2) / .8)));
      g.globalAlpha = a2 * .35; g.strokeStyle = `hsla(${hue},40%,70%,.6)`; g.fillStyle = `hsla(${hue},40%,70%,.5)`; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 80; i++) { const oc = i / 80 * 4.2, an = -Math.PI / 2 + oc * Math.PI * 2, rr = (.07 + .1 * oc) * s2; const x = o2.x + Math.cos(an) * rr, y = o2.y + Math.sin(an) * rr; if (nl) { g.moveTo(x + 1.3, y); g.arc(x, y, 1.3, 0, 6.2832); } else i ? g.lineTo(x, y) : g.moveTo(x, y); } if (nl) g.fill(); else g.stroke();
      for (let k = 0; k < Math.min(nIn, ps.length); k++) { const q = ps[k]; posOf(2, q, tq); const r = radOf(2, q), x = tq.x, y = tq.y; if (x < -r || x > Wd + r || y < -r || y > Hd + r) continue;
        const foc = k === D.f[2], near = Math.hypot(x - Wd / 2, y - Hd / 2) < u * .45, fl = D.pflash[k] || 0, sh = q.beat ? .5 + .5 * Math.sin(t * 6.2832 * Math.min(12, q.beat)) : 1;
        if (look.divePartial) { look.divePartial(g, q, x, y, r, st); continue; }
        const ph = (300 - 260 * clamp(Math.log2(q.f / 55) / 7)) % 360;   // pitch colour: low red .. high violet
        g.globalAlpha = a2 * (foc ? 1 : near ? .7 : .35) * (.6 + .4 * sh); g.fillStyle = `hsla(${ph},${sat}%,${35 + 30 * lit + 25 * fl}%,.9)`; g.beginPath(); g.arc(x, y, r * (1 + .3 * fl), 0, 6.2832); g.fill();
        if (near) { const nb = Math.min(24, q.k + 1) * 2; g.strokeStyle = `hsla(${ph},90%,85%,.7)`; g.lineWidth = 1.2; g.beginPath();   // full detail near the focus: its standing wave (k+1 lobes)
          for (let i = 0; i <= 48; i++) { const an = i / 48 * 6.2832, rr = r * (1.5 + .25 * Math.sin(an * nb / 2 + t * 3) * (q.an * .7 + .3)); i ? g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr) : g.moveTo(x + rr, y); }
          if (nl) { g.closePath(); g.moveTo(x + r * 1.05, y); g.arc(x, y, r * 1.05, 0, 6.2832, true); g.fillStyle = `hsla(${ph},60%,85%,.3)`; g.fill('evenodd'); } else g.stroke();
          if (dvT) { g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `${foc ? 12 : 10}px sans-serif`; g.fillText(Math.round(q.f) + ' Hz', x, y + r * 1.5 + 12); } } } }
    // depth 3: every partial as its own wave lane (the focused lane full, the whole voice's wave behind)
    const a3 = smooth((z - 2.2) / .6);
    if (a3 > .01 && pt) { const ps = pt.partials, s3 = D.scale(3), fl0 = ps.length ? ps[0].f : 100, lam0 = Wd * .55;
      const wE = (W.opts || {}).diveWaveEvent !== false; let ev = 1; if (wE) { let mf = pt.kind != null ? D.flash[pt.kind] || 0 : 0; for (let i = 0; i < ps.length && i < 16; i++) mf = Math.max(mf, D.pflash[i] || 0); ev = smooth(mf / .2); }   // v0.0.31 H4 diveWaveEvent: the whole-voice wave shows only while the voice sounds (its partials' flash), the scope line is dev only (off = always on)
      g.globalAlpha = a3 * .35 * ev; g.strokeStyle = `hsla(${hue},60%,75%,.8)`; g.lineWidth = 2; g.beginPath();
      const fillTo = (y0, col) => { g.lineTo(Wd, y0); g.lineTo(0, y0); g.closePath(); g.fillStyle = col; g.fill(); };   // nl: the light between the wave and its rest line
      if (ev > .01) for (let i = 0; i <= 60; i++) { const x = i / 60 * Wd; let v = 0; for (const q of ps) v += q.an * Math.sin((x - D.ox) / lam0 * 6.2832 * q.f / fl0 - t * 1.3); i ? g.lineTo(x, Hd / 2 + v * u * .05) : g.moveTo(x, Hd / 2 + v * u * .05); } if (ev > .01) { if (nl) fillTo(Hd / 2, `hsla(${hue},45%,75%,.5)`); else g.stroke(); }
      if (scope && O.down && (!wE || dvT)) { g.globalAlpha = a3 * .25; g.beginPath(); for (let i = 0; i <= 100; i++) { const s = scope[Math.floor(i / 100 * (scope.length - 1))] || 0; i ? g.lineTo(i / 100 * Wd, Hd * .88 + s * u * .3) : g.moveTo(0, Hd * .88 + s * u * .3); } if (nl) fillTo(Hd * .88, `hsla(${hue},45%,75%,.6)`); else g.stroke(); }   // the real output, for reference
      for (let k = 0; k < ps.length; k++) { const q = ps[k]; posOf(3, q, tq); const y0 = tq.y, amp = (.015 + .05 * q.an) * s3; if (y0 < -amp || y0 > Hd + amp) continue;
        if (look.diveWave) { look.diveWave(g, q, y0, amp, st); continue; }
        const foc = k === D.f[3], nP = Math.abs(y0 - Hd / 2) < u * .35 ? 140 : 40, ph = (300 - 260 * clamp(Math.log2(q.f / 55) / 7)) % 360, lam = lam0 * fl0 / q.f * Math.pow(4, z - 3), sh = q.beat ? .7 + .3 * Math.sin(t * 6.2832 * Math.min(12, q.beat)) : 1, fl = D.pflash[k] || 0;
        g.globalAlpha = a3 * (foc ? 1 : .4) * sh; g.strokeStyle = `hsla(${ph},${sat}%,${50 + 25 * lit + 20 * fl}%,1)`; g.lineWidth = foc ? 2.5 : 1.2; g.beginPath();
        for (let i = 0; i <= nP; i++) { const x = i / nP * Wd, v = Math.sin((x - D.ox) / Math.max(4, lam) * 6.2832 - t * (1 + q.k * .15)) * Math.cos(t * 2 + q.k) * (1 + .4 * fl); i ? g.lineTo(x, y0 + v * amp) : g.moveTo(x, y0 + v * amp); }
        if (nl) { g.globalAlpha *= foc ? .55 : .45; fillTo(y0, g.strokeStyle); } else g.stroke();
        if (foc && dvT) { g.globalAlpha = a3; g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '12px sans-serif'; g.fillText(`partial ${q.k + 1} · ${Math.round(q.f)} Hz`, Wd / 2, y0 - amp - 12); } } }
    g.globalAlpha = Math.min(1, back) * .8; g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '12px sans-serif';
    const nm = ['the ohm', 'its voices', 'partials of its ' + (pt ? pt.name : 'voice'), 'the wave'][Math.min(3, Math.round(z))]; if (back > .3 && (W.opts || {}).diveNoName === false) g.fillText(nm, Wd / 2, Hd * .06);   /* v0.0.30 F3 diveNoName (ON): no 'the ohm' / 'its voices' / 'partials of its body' / 'the wave' placeholder title; off = shown */
    if (D.hint && back > .3 && dvT) g.fillText(D.hint, Wd / 2, Hd * .06 + 18);   // what a shaping drag is doing, in words (v0.0.30 G2 diveTextDev: dev only)
    g.restore(); g.restore(); g.globalAlpha = 1; };
  return D;
}
