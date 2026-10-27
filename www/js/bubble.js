// CATCH IN A BUBBLE, CARRY, FLICK AWAY WITH RESTORE (old game R5.17 catch / ark, v0.1; GESTURES.md §1 rows "Closed loop around an ohm",
// "Tap | Bubble", "Drag + flick up | Bubble", C7; surface.js Sf.catch / popBubble / takeBubbles / receiveBubbles, read only).
// Wilbow 1:46 AM Oct 26: "catch in a bubble and carry (gesture OFF while the home-hold clash is open)". Switch 'bubbleCatch', default OFF
// = v0.0.30 (a loop round one ohm does nothing, as before). Everything below only happens once an ohm is caught, so OFF = no change.
//   CATCH: a closed loop drawn on bare ground round exactly ONE ohm (not your own), lifted without a rest -> a clear bubble round it.
//          (2+ ohms inside stays herd's loop select; a rested loop stays things.js's effect object; a spiral wins first, as in the old C8.)
//          The caught ohm floats in the bubble: it stops walking and its own music plays softer (bubbleVel), "heard through the skin".
//   TAP the bubble = pop (frees it). DRAG the bubble = carry it about. FLICK it UP (fast AND far, old C7: >= flickV px/ms and >= flickPx)
//          = farewell: the ohm leaves (sim.remove); the 3-finger undo brings it back (restore), redo sends it off again.
//   CARRY: caught ohms come with you when you land on another planet (world.land), like your focus ohm; they arrive in their bubbles
//          next to you, on a clear spot. Not saved: after a reload a caught ohm is simply free where it was.
// GESTURES check (softsound/GESTURES.md, this engine's routing): the bubble is hit first (old "Bubble hit first"), so a tap / drag on a
// caught ohm is the bubble's, never the ohm's (no mute, join, mouth, fuse press, teach start or flick-to-fly on it). OPEN CLASH, why the
// gesture is OFF: the old ark / carry pickup and herd's HOME HOLD (drag an ohm, keep the finger still ~1 s = home, herd.js) are one
// motion; a carried bubble held still would be read as either. Here the bubble's drag is owned (herd never sees it), so a hold while
// carrying does nothing; when the clash is decided the hold can mean "set it down here / home". Also: catch vs herd loop select (2+),
// vs things' rested loop (fx object) and vs the drum membrane (empty loop) are told apart by the count inside and the end rest.
import { analyze } from './stroke.js';
import { shapeOf } from './things.js';
import { endRest } from './clay.js';
import { noLine, softRing, softDot } from './soft.js';
// v0.0.31 note: the old game never saved bubbles (surface.js packChunk skips bubble bodies and caught creatures), so neither do we; the ohm itself stays saved, free.
export const BUBBLE_OPTS = { on: false, restMs: 450, restPx: 8, rK: 1.7, rPad: 10, minR: 30, tapMs: 300, tapPx: 10, flickV: .9, flickPx: 110, bubbleVel: .45, bob: 4, landPx: 70, max: 6 };
const TAU = 6.2832;
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) || 1e-9) + a[0]) c = !c; } return c; };
// a closed loop (the same test as things.js classify), screen points [[x, y, t]...]
export function isLoop(pts, A = analyze(pts)) { if (!A || A.n < 6 || A.len < 60) return false; const sh = shapeOf(pts); return A.closure < .3 && (sh ? sh.sweep > 1.6 * Math.PI && sh.sweep < 2.8 * Math.PI : A.turns > .55 && A.turns < 1.4); }
// the ohms inside a screen loop (toS: world -> screen); returns the list
export function ohmsInLoop(pts, ohms, toS) { const out = []; for (const o of ohms) { if (o.parked || o.dead || !o.body) continue; const s = toS(o.body.x, o.body.y); if (inPoly(pts, s.x, s.y)) out.push(o); } return out; }
export function createBubbles({ sim, bus, undo, toS, toW, world, me = () => sim.ohm }, opts = {}) {
  const O = { ...BUBBLE_OPTS, ...opts }, B = { opts: O, list: new Map(), caught: 0, pops: 0, farewells: 0, carried: 0, drag: null, last: null };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const sR = b => { const o = b.o, s = toS(o.body.x, o.body.y); return Math.max(O.minR, (o.g ? o.g.r : 1) * (s.s || 1) * O.rK + O.rPad); };
  B.has = o => !!o && B.list.has(o.id);
  B.catchOhm = (o, push = true) => { if (!O.on || !o || o.dead || o === me() || B.list.has(o.id) || B.list.size >= O.max) return null;
    const b = { o, x: o.body.x, y: o.body.y, t0: now(), ph: Math.random() * TAU }; B.list.set(o.id, b); o.caught = true; B.caught++; B.last = { k: 'catch', id: o.id };
    if (push && undo) undo.push({ label: 'catch', x: b.x, y: b.y, undo: () => B.free(o, false), redo: () => B.catchOhm(o, false) });
    bus.post({ type: 'bubble.catch', src: o, x: b.x, y: b.y }); return b; };
  B.free = (o, fx = true) => { const b = o && B.list.get(o.id); if (!b) return false; B.list.delete(o.id); o.caught = false; if (o.body) { o.body.vx = 0; o.body.vy = 0; }
    if (fx) { B.pops++; B.last = { k: 'pop', id: o.id }; bus.post({ type: 'bubble.pop', src: o, x: b.x, y: b.y }); } return true; };
  B.farewell = o => { const b = o && B.list.get(o.id); if (!b) return false; const x = b.x, y = b.y; B.free(o, false); if (!sim.remove(o)) return false; B.farewells++; B.last = { k: 'farewell', id: o.id };
    if (undo) undo.push({ label: 'farewell', x, y, undo: () => { sim.unremove(o); o.body.x = x; o.body.y = y; }, redo: () => sim.remove(o) });
    bus.post({ type: 'bubble.farewell', src: o, x, y }); return true; };
  // the loop stroke (gestures.js sim.onStroke, after the spiral): true = caught
  // where every ohm stood when the finger went down (gestures.js down): a walking ohm counts if it was inside at the start OR at the lift
  B.mark = () => { const m = new Map(); for (const o of sim.ohms) { if (o.parked || o.dead || !o.body) continue; const s = toS(o.body.x, o.body.y); m.set(o.id, [s.x, s.y]); } B.marked = m; };
  B.stroke = (pts, A, tEnd) => { if (!O.on || !isLoop(pts, A)) return false; if (tEnd != null && endRest(pts, tEnd, O) >= O.restMs) { B.marked = null; return false; }
    const inside = ohmsInLoop(pts, sim.ohms, toS), M0 = B.marked; B.marked = null;
    if (M0) for (const o of sim.ohms) { if (inside.includes(o) || o.parked || o.dead) continue; const q = M0.get(o.id); if (q && inPoly(pts, q[0], q[1])) inside.push(o); } if (inside.length !== 1 || inside[0] === me() || B.has(inside[0])) return false; return !!B.catchOhm(inside[0]); };
  B.hitAt = (x, y) => { if (!O.on) return null; let best = null, bd = 1e9; for (const b of B.list.values()) { const s = toS(b.x, b.y), d = Math.hypot(x - s.x, y - s.y); if (d < sR(b) && d < bd) { bd = d; best = b; } } return best; };
  // finger plumbing (gestures.js owns the pointer once it starts on a bubble)
  B.down = (b, p) => { B.drag = { b, p, ox: 0, oy: 0, moved: false }; const s = toS(b.x, b.y); B.drag.ox = s.x - p.x0; B.drag.oy = s.y - p.y0; };
  B.move = p => { const d = B.drag; if (!d || d.p !== p) return; if (!d.moved && Math.hypot(p.x - p.x0, p.y - p.y0) < O.tapPx) return; d.moved = true; const w = toW(p.x + d.ox, p.y + d.oy); d.b.x = w.x; d.b.y = w.y; };
  B.up = (p, cancel) => { const d = B.drag; B.drag = null; if (!d || d.p !== p || cancel) return null; const o = d.b.o, dt = now() - p.t0;
    if (!d.moved && dt < O.tapMs * 2) { B.free(o); return { k: 'pop' }; }
    const v = fingerUpV(p); if (v && -v.vy >= O.flickV && p.y0 - p.y >= O.flickPx) { B.farewell(o); return { k: 'farewell' }; }
    return { k: 'carry' }; };
  const fingerUpV = p => { const q = p.pts; if (!q || q.length < 2) return null; const a = q[q.length - 1]; let i = q.length - 2; while (i > 0 && a[2] - q[i][2] < 60) i--; const b = q[i], dt = Math.max(1, a[2] - b[2]); return { vx: (a[0] - b[0]) / dt, vy: (a[1] - b[1]) / dt }; };
  B.fingerV = fingerUpV;
  // the caught ohm's own music plays softer (chained onto the bus shaper; skyMood's stays first)
  const prev = bus.shape; bus.shape = ev => { if (prev) { ev = prev(ev); if (!ev) return null; } if (B.list.size && ev.src && B.list.has(ev.src.id)) ev = { ...ev, vel: (ev.vel == null ? .7 : ev.vel) * O.bubbleVel }; return ev; };
  // carry: caught ohms land with you
  bus.on('world.land', ev => { if (!B.list.size || !world || !world.system) return; const S = world.system, kk = S.key(ev.planet), m = me(), ms = m && m.body ? toS(m.body.x, m.body.y) : null; let k = 0;
    for (const b of B.list.values()) { const o = b.o; o.pl = kk; o.away = false; if (ms) { const w = toW(ms.x + (k % 2 ? 1 : -1) * O.landPx * (1 + (k >> 1)), ms.y - O.landPx * .6); b.x = w.x; b.y = w.y; } k++; B.carried++; }
    B.last = { k: 'carry', n: k }; bus.post({ type: 'bubble.carry', n: k }); });
  const pin = () => { const t = now(); for (const b of B.list.values()) { const o = b.o; if (o.dead) { B.list.delete(o.id); o.caught = false; continue; } const s = toS(b.x, b.y), w = toW(s.x, s.y + Math.sin(t / 700 + b.ph) * O.bob);
      o.body.x = w.x; o.body.y = w.y; o.body.vx = 0; o.body.vy = 0; if ('flying' in o.body) o.body.flying = false; } };
  B.tick = () => { if (B.list.size) pin(); };
  B.draw = g => { if (!B.list.size) return; pin(); g.save(); const soft = noLine('lnHints');
    for (const b of B.list.values()) { const o = b.o, s = toS(o.body.x, o.body.y), R = sR(b);
      const gr = g.createRadialGradient(s.x - R * .35, s.y - R * .4, R * .1, s.x, s.y, R); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(.7, 'rgba(190,225,255,.08)'); gr.addColorStop(1, 'rgba(190,225,255,.22)');
      g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, R, 0, TAU); g.fill();
      if (soft) softRing(g, s.x, s.y, R, 3, '200,80%,88%', .45); else { g.strokeStyle = 'rgba(210,235,255,.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(s.x, s.y, R, 0, TAU); g.stroke(); }
      softDot(g, s.x - R * .4, s.y - R * .45, R * .18, '0,0%,100%', .5); }
    g.restore(); };
  return B; }
