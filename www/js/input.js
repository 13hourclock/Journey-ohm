// INPUT: touch -> events on the music clock (never synth calls, never direct state writes). Touch the WORLD, no menus.
// Kept from step 1: tap an ohm = it sounds right away (strike on touch-down, Wilbow 1:16 AM tap timing A); hold ~0.38 s
// still = the 7 scale nodes open around it; tap or slide over a node = that degree; tap empty space = nodes close.
// track/ohms, checked against /workspace/softsound/GESTURES.md (PROPOSALS where marked):
//   - ANY ohm can be touched: hit-test every ohm (finger-sized target, at least 36 px). Holding one makes it the focus ohm.
//   - drag an ohm: it follows the finger on a soft spring; let go = THROW with the finger's speed (GESTURES: grab / throw).
//     It stays where it lands. A hard throw makes it call out (GESTURES C21). PROPOSAL: a throw never drops its instrument.
//   - two fingers on an ohm, pinching: it squeezes / swells (GESTURES: pinch on ohm = squeeze)          -> stream in.pinch
//   - tap empty ground / air: a soft push wave from the finger, nearby ohms wobble                     -> event 'touch' tap
//   - 4 steady taps on empty space: tap tempo (team default; Wilbow 2:26 "7A-D")                        -> event 'tempo.tap'
//   - tap a drum-like thing in the world: it flashes and nudges nearby ohms; 4 steady taps on it = tap tempo too (PROPOSAL, 7B)
//     tempo.tap carries { times, bpm, src: 'ground' | the thing, x, y, to: [ids of ohms that hear it: the focus ohm, ohms
//     jamming near it, ohms whose hearing reaches the tap] } - the audio track decides who follows (7D: context)
//   - every touch event this file posts carries `timing` { t, beat, phase, off, onBeat } and discrete touch edits run with
//     bus.tap = that timing (truthy), so the audio side can decide whether a change lands now / next bar / next phrase (6A 6D)
//   - drag through empty space: a gentle current nudges the ohms it passes (PROPOSAL; easy to nudge ohms together to jam)
//   - draw a spiral on empty space: a new random ohm hatches at its centre (systems spawn.js; hold-still spawn only with opts.holdSpawn) -> 'spawn'
//   - two fingers on empty space: posted as 'touch' pinch2 (zoom / pan belong to the world track; nothing here acts on it)
//   - two fingers resting STILL on an ohm ~0.6 s: sing to that ohm (v0.0.5, audio track's gesture; kept here, works on ANY ohm)
//     -> event 'sing'. Pinch needs the finger gap to change >6% before then; 3+ fingers end singing.
//   - v0.0.10 HERD (PROPOSALS, herd.js): double tap bare ground = call ('herd.call'); closed loop round 2+ ohms on lift = select
//     ('herd.select'), dragging a member moves the group; drag an ohm + keep still ~1 s = home ('herd.home'). All one finger.
//   Three or more fingers are left alone (GESTURES.md: 3-finger tap = undo, 4 = redo). Two-finger twist is not used (DAW there).
import { layout, cam } from './view.js';
import { toWorld, toScreen } from './space.js';
import { octaveOf, recipes } from './recipe.js';
import { polyHas } from './herd.js';
export const HOLD_MS = 380, SPAWN_MS = 600;
export function createInput(el, world, bus, size, onFirst) {
  const P = new Map(); let first = true, pinch = null, wpinch = null;
  const endShape = () => { if (!wpinch) return; if (wpinch.st) { clearTimeout(wpinch.st); wpinch.st = null; } if (wpinch.shaping) { wpinch.shaping = false; cam.shaping = false; bus.post({ type: 'shape.touch', on: false }); } }; const taps = []; const tw = {}, ts = {};
  const SING_MS = 600, endSing = () => { if (pinch && pinch.sing) { pinch.sing = false; bus.post({ type: 'sing', src: pinch.o, on: false }); } if (pinch && pinch.st) { clearTimeout(pinch.st); pinch.st = null; } };
  const vel = e => (e.pointerType === 'touch' && e.pressure > 0 && e.pressure !== .5 && e.pressure !== 1) ? Math.min(1, .35 + e.pressure * .8) : .75;
  const node = (L, x, y) => { for (const n of L.nodes) if (Math.hypot(n.x - x, n.y - y) < n.r * 1.25) return n; return null; };
  const playNode = (o, n, e) => { const rec = recipes.get(o.recipe); bus.note({ src: o, kind: 'note', deg: n.deg, oct: octaveOf(rec), vel: vel(e), pos: .3, dur: 1.2, inputT: e.timeStamp }); };
  // which ohm is under the finger (focus ohm wins ties; nearest relative to its size otherwise)
  const spaceGate = () => { const S = world.world && world.world.system; return !!(S && S.opts.on && world.world.cam.z < -1.5); };
  const pick = (W, H, x, y) => { let best = null, bs = 1e9; for (const o of world.ohms) { if (o.parked) continue; const s = toScreen(W, H, world.cam, o.body.x, o.body.y, ts), r = Math.max(36, o.g.r * s.s * 1.15), d = Math.hypot(x - s.x, y - s.y);
      if (d < r) { const sc = d / r - (o === world.ohm ? .3 : 0); if (sc < bs) { bs = sc; best = o; best._d = d / (o.g.r * s.s); } } } return best; };
  const endGrab = (o, p) => { p.grab = false; bus.ctl(o, 'in.grabX', null); bus.ctl(o, 'in.grabY', null); };
  const clearHolds = () => { for (const [, q] of P) if (q.hold) { clearTimeout(q.hold); q.hold = null; } };
  // timing of a touch on the music clock (6A 6D: the audio side decides when a change lands from this)
  const timing = e => { const m = world.music, t = m.now() - Math.max(0, performance.now() - e.timeStamp) / 1000, beat = m.beat(t), phase = beat - Math.floor(beat), off = Math.min(phase, 1 - phase);
    return { t, beat, phase, off, onBeat: off < .12 }; };
  const discrete = (e, fn) => { const prev = bus.tap; bus.tap = timing(e); try { fn(); } finally { bus.tap = prev; } };
  // who hears a tempo tap at (x, y): the focus ohm, ohms near it (jamming range), ohms whose hearing reaches the tap point
  const hearers = (x, y) => { const f = world.ohm, near = (world.opts.jam && world.opts.jam.near) || 4, out = [];
    for (const o of world.ohms) { if (o.parked) continue; const b = o.body; if (o === f || Math.hypot(b.x - f.body.x, b.y - f.body.y) <= near || Math.hypot(b.x - x, b.y - y) < 2 + 4 * o.g.hear) out.push(o.id); } return out; };
  // v0.0.10 HERD gestures (PROPOSALS, opts.herd; herd.js): double tap bare ground = call; closed loop round 2+ ohms (decided on lift) = select;
  // drag an ohm then keep the finger still ~1 s = home. A single ground tap still pushes + counts for tempo; it clears a selection only
  // when no second tap follows (so a double tap keeps the group). Fast steady tapping (a tempo run) does not call (opts.herd.fastTap 'context').
  let lastTap = null, clearT = 0; const HO = () => world.opts.herd || {};
  const tapBuf = new Map();   // per tap origin ('ground' or a thing): its own 4-tap window
  const tempoTap = (e, src, x, y) => { const key = typeof src === 'string' ? src : src.id; let taps = tapBuf.get(key); if (!taps) tapBuf.set(key, taps = []);
    for (const [k, b] of tapBuf) if (k !== key) b.length = 0;   // switching origin starts over
    const now = timing(e).t; taps.push(now); if (taps.length > 4) taps.shift();
    if (taps.length < 4) return; const iv = [taps[1] - taps[0], taps[2] - taps[1], taps[3] - taps[2]], mn = Math.min(...iv), mx = Math.max(...iv);
    if (mn > .25 && mx < 1.6 && mx / mn < 1.25) { discrete(e, () => bus.post({ type: 'tempo.tap', times: taps.slice(), bpm: 60 / ((taps[3] - taps[0]) / 3), src, x, y, to: hearers(x, y), timing: bus.tap })); taps.length = 0; } };
  const thingAt = (W, H, x, y) => { if (!world.things) return null; for (const t of world.things) { const s = toScreen(W, H, world.cam, t.x, t.y, ts); if (Math.hypot(x - s.x, y - s.y) < Math.max(36, t.r * s.s * 1.2)) return t; } return null; };
  // a tempo run: the last ground taps were steady (2+ similar gaps) -> a quick tap is tempo, not a call (context, 'fastTap')
  const tempoRun = () => { const b = tapBuf.get('ground'); if (!b || b.length < 3) return false; const n = b.length, g1 = b[n - 1] - b[n - 2], g2 = b[n - 2] - b[n - 3]; return g1 < 1.6 && Math.max(g1, g2) / Math.max(1e-3, Math.min(g1, g2)) < 1.3; };
  const groundTap = (e, p, w, run) => { const h = HO(), now = e.timeStamp; clearTimeout(clearT);
    if (h.on !== false && h.call !== false && lastTap && now - lastTap.t < 320 && Math.hypot(p.x0 - lastTap.x, p.y0 - lastTap.y) < 34 && !(run && h.fastTap !== 'always')) {
      lastTap = null; discrete(e, () => bus.post({ type: 'herd.call', x: w.x, y: w.y, timing: bus.tap })); return; }
    lastTap = { t: now, x: p.x0, y: p.y0 }; clearT = setTimeout(() => { if (world.herd && world.herd.sel.size) bus.post({ type: 'herd.select', ids: [] }); }, 330); };
  // closed loop drawn on empty space: ends near its start (or the path closes on itself near the end); 2+ ohms inside = select
  const loopSelect = (p, e) => { const pts = p.path; if (pts.length < 8) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of pts) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    const ext = Math.max(x1 - x0, y1 - y0), a = pts[0], z = [p.x, p.y]; if (ext < 50 || Math.hypot(z[0] - a[0], z[1] - a[1]) > Math.max(40, ext * .25)) return;
    const { W, H } = size(), ids = []; for (const o of world.ohms) { if (o.parked) continue; const s = toScreen(W, H, world.cam, o.body.x, o.body.y, ts); if (polyHas(pts, s.x, s.y)) ids.push(o.id); }
    if (ids.length >= 2) discrete(e, () => bus.post({ type: 'herd.select', ids, timing: bus.tap })); };
  // home: while dragging an ohm, a finger kept still (< stillPx) for ~home.still s sets home (for its whole group when it is selected)
  const homeWatch = (p, e) => { const h = HO(); if (h.on === false || !h.home || h.home.on === false) return; const px = h.stillPx || 7;
    if (!p.still || Math.hypot(p.x - p.still[0], p.y - p.still[1]) > px) { p.still = [p.x, p.y]; if (p.homeT) clearTimeout(p.homeT);
      p.homeT = setTimeout(() => { p.homeT = null; if (!P.has(e.pointerId) || !p.grab) return; const hs = world.herd, ids = hs && hs.sel.has(p.o.id) ? [...hs.sel] : [p.o.id];
        discrete({ timeStamp: performance.now() }, () => bus.post({ type: 'herd.home', ids, x: p.o.body.x, y: p.o.body.y, timing: bus.tap })); }, (h.home.still || 1) * 1000); } };
  el.addEventListener('pointerdown', e => { e.preventDefault(); if (first) { first = false; onFirst && onFirst(); }
    const { W, H } = size(), x = e.clientX, y = e.clientY, f = world.ohm, L = layout(W, H, f);
    const p = { x0: x, y0: y, x, y, t0: e.timeStamp, hold: null, lastNode: null, o: null, grab: false, bx: 0, by: 0 }; P.set(e.pointerId, p); if (P.size >= 2) for (const q of P.values()) q.multi = true;   // v0.0.14: a finger that was ever part of 2+ never taps
    // v0.0.12 (fix 1): in deep space (system on, past z -1.5) the ohms are specks on the far planet (shifted by system.homeShift and bent
    // onto its ring), so the flat ground mapping would hit where they used to be. One-finger ground gestures (tap / strike / hold /
    // spawn / stir / loop / double-tap call) are off there; two fingers still zoom (zoom.js) to aim and land.
    if (spaceGate()) { p.space = true; return; }
    { const Dv = world.world && world.world.zl && world.world.zl.dive; if (Dv && Dv.owns()) { p.dive = true; if (P.size === 1) Dv.down(x, y, vel(e)); else Dv.cancel(); return; } }   // inside an ohm (dive.js): one finger plays its insides   // one finger here plays the space layer (zoomlayers.js: tap on up, strum on move)
    if (P.size > 2) { if (pinch) { endSing(); bus.ctl(pinch.o, 'in.pinch', 1); pinch = null; } endShape(); wpinch = null; clearHolds(); return; }   // 3+ fingers: reserved
    if (f.nodesOpen) { const n = node(L, x, y); if (n) { p.lastNode = n.deg; playNode(f, n, e); return; } }
    const th = P.size === 1 ? thingAt(W, H, x, y) : null;
    if (th) { p.thing = th; bus.post({ type: 'touch', kind: 'thing', thing: th, x: th.x, y: th.y, vel: vel(e), timing: timing(e) }); tempoTap(e, th, th.x, th.y); return; }   // 7B: tap a drum-like thing
    const o = pick(W, H, x, y);
    if (o) { p.o = o; p.bx = o.body.x; p.by = o.body.y; const rec = recipes.get(o.recipe); bus.note({ src: o, kind: 'strike', deg: null, oct: octaveOf(rec), vel: vel(e), pos: Math.min(1, o._d), dur: 1, inputT: e.timeStamp });
      const onB = [...P.entries()].filter(([, q]) => q.o === o);
      if (P.size === 2 && onB.length === 2) { clearHolds(); for (const [, q] of onB) if (q.grab) endGrab(o, q); pinch = { o, ids: onB.map(([id]) => id), d0: Math.max(20, Math.hypot(onB[0][1].x0 - onB[1][1].x0, onB[0][1].y0 - onB[1][1].y0)) };
        pinch.st = setTimeout(() => { if (!pinch) return; pinch.st = null; pinch.sing = true; bus.ctl(pinch.o, 'in.pinch', 1); bus.post({ type: 'sing', src: pinch.o, on: true }); }, SING_MS); return; }
      p.hold = setTimeout(() => { p.hold = null; if (o !== world.ohm) discrete({ timeStamp: performance.now() }, () => bus.post({ type: 'focus', src: o, timing: bus.tap })); bus.set(o, 'src.nodesOpen', true); if (!world.opts.holdStrikes) bus.note({ src: o, kind: 'damp', tau: .03 }); }, HOLD_MS); return; }
    // empty world
    p.empty = true; if (f.nodesOpen && P.size === 1) bus.set(f, 'src.nodesOpen', false);
    const em = [...P.entries()].filter(([, q]) => q.empty); if (em.length === 2) { clearHolds(); endShape(); const wp = wpinch = { ids: em.map(([id]) => id), d0: Math.max(20, Math.hypot(em[0][1].x0 - em[1][1].x0, em[0][1].y0 - em[1][1].y0)) };
      // v0.0.13 T1 A (PROPOSAL): two fingers RESTING on bare ground (still for .6 s) = shape the ground with your voice (shape.js)
      wp.st = setTimeout(() => { wp.st = null; if (wpinch !== wp || wp.moved || cam.zoomGo || (world.conductOwns && world.conductOwns())) return;   /* conduct.js: with 'conductGesture' ON this hold raises the baton instead (clash, OFF by default) */ const a = P.get(wp.ids[0]), b = P.get(wp.ids[1]); if (!a || !b) return; const { W, H } = size(), c = toWorld(W, H, world.cam, (a.x + b.x) / 2, (a.y + b.y) / 2, tw);
        wp.shaping = true; cam.shaping = true; bus.post({ type: 'shape.touch', on: true, x: c.x, y: c.y }); }, 600); return; }   // v0.0.14: a zoom that already went (cam.zoomGo) is never also a ground shaping
    if (world.opts.holdSpawn !== false) p.hold = setTimeout(() => { p.hold = null; p.spawned = true; const w = toWorld(W, H, world.cam, x, y, tw); discrete({ timeStamp: performance.now() }, () => world.spawn(w.x, w.y)); }, SPAWN_MS); }, { passive: false });
  el.addEventListener('pointermove', e => { const p = P.get(e.pointerId); if (!p) return; const x = e.clientX, y = e.clientY, f = world.ohm, { W, H } = size();
    const px = p.x, py = p.y; p.x = x; p.y = y; const moved = Math.hypot(x - p.x0, y - p.y0);
    if (p.hold && moved > 14) { clearTimeout(p.hold); p.hold = null; }
    if (p.dive) { const Dv = world.world && world.world.zl && world.world.zl.dive; if (Dv && !p.multi && P.size === 1) Dv.move(x, y); return; }
    if (p.space) { const Z = world.world && world.world.zl; if (Z && !p.multi && P.size === 1 && (p.strum || moved > 14)) { p.strum = true; Z.drag(x, y, .55); } return; }   // v0.0.12: a finger that started in deep space does no ground gesture (zoom.js still reads it for pinch)
    if (pinch && pinch.ids.includes(e.pointerId)) { const a = P.get(pinch.ids[0]), b = P.get(pinch.ids[1]); if (a && b) { const r = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0; if (pinch.sing) return; if (pinch.st) { if (Math.abs(r - 1) < .06) return; clearTimeout(pinch.st); pinch.st = null; }
      bus.ctl(pinch.o, 'in.pinch', Math.max(.4, Math.min(2.2, r))); } return; }
    if (wpinch && wpinch.ids.includes(e.pointerId)) { const a = P.get(wpinch.ids[0]), b = P.get(wpinch.ids[1]); if (a && b && !wpinch.moved && (Math.max(Math.hypot(a.x - a.x0, a.y - a.y0), Math.hypot(b.x - b.x0, b.y - b.y0)) > 14 || Math.abs(Math.hypot(a.x - b.x, a.y - b.y) / wpinch.d0 - 1) >= .08)) { wpinch.moved = true; endShape(); }   // v0.0.14: moved OR the gap changed by zoom's own dead zone (8%) = not still
      if (a && b && !wpinch.shaping) { const c = toWorld(W, H, world.cam, (a.x + b.x) / 2, (a.y + b.y) / 2, tw); bus.post({ type: 'touch', kind: 'pinch2', x: c.x, y: c.y, ratio: Math.hypot(a.x - b.x, a.y - b.y) / wpinch.d0 }); } return; }
    if (f.nodesOpen && !p.empty) { const n = node(layout(W, H, f), x, y); if (n && n.deg !== p.lastNode) { p.lastNode = n.deg; playNode(f, n, e); } else if (!n) p.lastNode = null; return; }   // nodes open: the finger plays
    if (p.o && P.size === 1 && (p.grab || moved > 10)) { p.grab = true; homeWatch(p, e); const s = toWorld(W, H, world.cam, 0, 0, tw).s; bus.ctl(p.o, 'in.grabX', p.bx + (x - p.x0) / s); bus.ctl(p.o, 'in.grabY', p.by + (y - p.y0) / s); return; }
    if (p.empty && !p.spawned && moved > 10) { p.stir = true; if (!p.path) p.path = [[p.x0, p.y0, p.t0]]; if (p.path.length < 240) { const l = p.path[p.path.length - 1]; if (Math.abs(x - l[0]) + Math.abs(y - l[1]) > 6) p.path.push([x, y, e.timeStamp]); } const dt = Math.max(8, e.timeStamp - (p.tm || p.t0)) / 1000; p.tm = e.timeStamp; const w = toWorld(W, H, world.cam, x, y, tw), s = w.s;
      bus.post({ type: 'touch', kind: 'stir', x: w.x, y: w.y, dx: Math.max(-6, Math.min(6, (x - px) / s / dt)) * .1, dy: Math.max(-6, Math.min(6, (y - py) / s / dt)) * .1 }); } });
  const up = e => { const p = P.get(e.pointerId); if (!p) return; if (p.hold) clearTimeout(p.hold); if (p.homeT) clearTimeout(p.homeT);
    // systems: a drawn stroke on bare ground is read first as a shape (stroke.js: spiral = new ohm, hook = the '?' helper); else a loop select
    if (p.stir && p.path && P.size === 1 && world.onStroke) { const { W, H } = size(); p.path.push([e.clientX, e.clientY, e.timeStamp]); if (world.onStroke(p.path, (x, y) => toWorld(W, H, world.cam, x, y, tw), e)) p.shape = true; }
    if (p.stir && p.path && !p.shape && P.size === 1 && HO().on !== false) loopSelect(p, e);
    if (p.space && !p.multi && !p.strum && P.size === 1 && e.type === 'pointerup' && e.timeStamp - p.t0 < 450 && world.world && world.world.zl) world.world.zl.press(p.x0, p.y0, .7);   // tap a planet / the star / a galaxy star = play it
    if (p.dive && !p.multi && P.size === 1 && world.world && world.world.zl) world.world.zl.dive.up(e.clientX, e.clientY, e.timeStamp - p.t0);
    if (p.grab) endGrab(p.o, p);
    if (pinch && pinch.ids.includes(e.pointerId)) { endSing(); bus.ctl(pinch.o, 'in.pinch', 1); pinch = null; }
    if (wpinch && wpinch.ids.includes(e.pointerId)) { endShape(); wpinch = null; }
    else if (p.empty && !p.stir && !p.spawned && !p.multi && P.size === 1 && e.type === 'pointerup' && e.timeStamp - p.t0 < 350) { const { W, H } = size(), w = toWorld(W, H, world.cam, p.x0, p.y0, tw);
      bus.post({ type: 'touch', kind: 'tap', x: w.x, y: w.y, timing: timing(e) }); const run = tempoRun(); tempoTap(e, 'ground', w.x, w.y); groundTap(e, p, w, run); }
    P.delete(e.pointerId); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  return { pointers: P };
}
