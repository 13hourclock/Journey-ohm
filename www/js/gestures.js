// SYSTEMS GESTURES (resolutions in /GESTURES.md of track/systems). A window CAPTURE router that only looks at touches on the play
// canvas (#c; the dev panel's own controls are never touched). It adds, without taking any existing gesture:
//   3-finger tap = undo, 4-finger tap = redo (all fingers up within 400 ms, none moved 30 px; Wilbow, audit B7)
//   3 fingers held still 2 s = dev panel open / close, with a filling ring (moving 30 px, a 4th finger or lifting early cancels; the old
//     game's hidden dev gesture, audit A6)
//   two-finger TWIST on bare ground = open the river (the DAW, daw.js); twist back / pinch closed inside it = close
//   one-finger drawn shapes on bare ground (via input.js world.onStroke): SPIRAL = a new random ohm (spawn.js); HOOK = the start of the
//     '?' glyph: within 1.6 s draw the DOT under it = '?' (then tap anything; helper.js), or '<' / '>' after the hook = undo / redo
//   a straight line from just outside ohm A to ohm B = A TEACHES B (teach.js); a quick flick of an ohm = it flies (softbody.js)
//   double tap an ohm's MOUTH = mouth control (mouth.js; the taps still sound the ohm); thumb on the empty LEFT half while your ohm's
//     nodes are open = the walking stick (walk.js)
// While the river or the helper is up, touches on the canvas go to them first (and not to the world underneath).
import { noLine, softRing } from './soft.js';   // v0.0.30 lnHints: no outlines
import { analyze, isSpiral, isHook, inDot, arrowDir } from './stroke.js';
import { endRest } from './clay.js';
import { isFlick, fingerVel } from './softbody.js';
export const GEST_OPTS = { tapMs: 400, tapPx: 30, devHoldMs: 2000, hookWaitMs: 1600, twistRad: 1.3 };
export function createGestures(el, sim, bus, sys, opts = {}) { const O = { ...GEST_OPTS, ...opts }, G = { opts: O, pend: null, multi: null, twist: null, marks: [], second: null };
  const P = new Map(), mine = e => e.target === el, now = () => performance.now();
  // quick wide two-finger spread on two ohms of one fused cluster = split it (fuse.js; Wilbow 4:06 / 4:54 / 4:55 PM Oct 23). Watch only:
  // the fingers keep doing what they do (each drags its ohm); slow or small spreads never split.
  const spreadWatch = () => { const [a, b] = [...P.values()], FO = sys.fuse.opts; if (!a.ohm || !b.ohm || a.ohm === b.ohm || !FO.spread) return; const t = now() - Math.max(a.t0, b.t0); if (t > FO.spreadMs) { G.splitDone = true; return; }
    const d0 = Math.hypot(b.x0 - a.x0, b.y0 - a.y0), d = Math.hypot(b.x - a.x, b.y - a.y); if (d - d0 < FO.spreadPx) return; G.splitDone = true;
    const wa = sys.toW(a.x, a.y), wb = sys.toW(b.x, b.y); if (sys.fuse.spreadSplit(a.ohm, b.ohm, wb.x - wa.x, wb.y - wa.y)) mark('split', (a.x + b.x) / 2, (a.y + b.y) / 2); };
  const stop = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
  const mark = (type, x, y) => { G.marks.push({ type, x, y, t: now() }); if (G.marks.length > 12) G.marks.shift(); };
  // drawn shapes from input.js (single finger on bare ground, on lift)
  sim.onStroke = (pts, toW, e) => { if (sys.teach && sys.teach.stroke(pts, G.teachA)) { mark('teach', pts[pts.length - 1][0], pts[pts.length - 1][1]); return true; }   // teach line A -> B (teach.js), before the shapes
    const a = analyze(pts);
    if (sys.spawn && isSpiral(a)) { const w = toW(a.cx, a.cy);
      if (sys.clay && sys.clay.opts.on && e && endRest(pts, e.timeStamp, sys.clay.opts) >= sys.clay.opts.restMs) { if (sys.clay.open(w.x, w.y, a)) { mark('clay', a.cx, a.cy); return true; } }   // clay (clay.js): a spiral that ends with a rest
      if (sys.egg && sys.egg.opts.on) { if (sys.egg.open(w.x, w.y, a)) { mark('egg', a.cx, a.cy); return true; } }   // egg words (egg.js): strokes on the egg pick its sound
      const o = sys.spawn.make(w.x, w.y, a); if (o) { mark('spawn', a.cx, a.cy); return true; } }
    if (sys.bubbles && sys.bubbles.opts.on && sys.bubbles.stroke(pts, a, e ? e.timeStamp : null)) { mark('catch', a.cx, a.cy); return true; }   // catch (bubble.js): a loop round one ohm, no rest
    if (isHook(a)) { G.pend = { a, t: now(), pts: pts.slice() }; mark('hook', a.cx, a.cy); return true; }
    return false; };
  const down = e => { if (!mine(e)) return; const x = e.clientX, y = e.clientY, p = { x0: x, y0: y, x, y, t0: now(), pts: [[x, y, e.timeStamp]], own: false };
    if (sys.bubbles && sys.bubbles.opts.on && !P.size) sys.bubbles.mark();   // the catch checks ohm positions at the stroke's start too (they walk)
    G.splitDone = false; if (sys.fuse && sys.fuse.links.size && sys.ohmAt) p.ohm = sys.ohmAt(x, y);   // fused-cluster split watch (fuse.js spreadSplit)
    P.set(e.pointerId, p); const inDaw = sys.daw && sys.daw.open, JV = sys.jamview && sys.jamview.open ? sys.jamview : null;
    if (JV) { p.ohm = null; G.splitDone = true; if (P.size >= 3) { for (const q of P.values()) q.own = 'multi'; JV.down(e, p); } else { p.own = 'jam'; JV.down(e, p); return stop(e); } }   // the jam view (jamview.js) takes every finger; 3 / 4 = its own undo / redo
    if (inDaw && P.size >= 3) { for (const [id, q] of P) if (q.own === 'daw') { q.own = 'multi'; sys.daw.cancel && sys.daw.cancel(id); } p.own = 'multi'; }   // 3 / 4 fingers inside the river = undo / redo there too
    else if (inDaw) { p.own = 'daw'; sys.daw.down(e, p); return stop(e); }
    if (!inDaw && sys.helper && sys.helper.armed) { p.own = 'helper'; sys.helper.pick(x, y); return stop(e); }
    if (!inDaw && G.pend && now() - G.pend.t < O.hookWaitMs && P.size === 1) { p.own = 'second'; return stop(e); }
    if (!inDaw && sys.clay && sys.clay.cur && (P.size === 1 ? sys.clay.hitAt(x, y) === 'on' : P.size === 2 && [...P.values()].some(q => q.own === 'clay'))) { p.own = 'clay'; sys.clay.down(e.pointerId, p); return stop(e); }
    if (!inDaw && sys.bubbles && sys.bubbles.list.size && P.size === 1) { const b = sys.bubbles.hitAt(x, y); if (b) { p.own = 'bubble'; sys.bubbles.down(b, p); return stop(e); } }   // a bubble is hit first (bubble.js): tap = pop, drag = carry, flick up = farewell   // a touch that starts on the open clay shapes it (a second finger joins the clay touch)
    if (!inDaw && P.size === 1 && sys.egg && sys.egg.cur) { const h = sys.egg.hitAt(x, y); if (h === 'on') { p.own = 'egg'; return stop(e); } if (h === 'beside') sys.egg.slide(x, y); }   // a stroke that starts on the open egg is an egg word; beside it = the egg slides aside (egg.js)
    if (!inDaw && P.size === 1 && sys.walk && sys.walk.claim(x, y)) { p.own = 'walk'; sys.walk.down(p); return stop(e); }   // the walking stick (walk.js)
    if (!inDaw && P.size === 1 && sim.placed && sim.placed.handleAt && !(sim.ohm && sim.ohm.nodesOpen) && !sys.ohmAt(x, y)) { const h = sim.placed.handleAt(x, y); if (h) { p.own = 'end'; const w = sys.toW(x, y); p.h = sim.placed.handleDown(h, w.x, w.y); return stop(e); } }   // the end / rim of a drawn instrument (things.js); ohms and open nodes keep priority
    if (!inDaw && P.size === 1 && sim.placed && sim.placed.carriedAt && sim.placed.opts.carry && !(sim.ohm && sim.ohm.nodesOpen) && !sys.ohmAt(x, y)) { const w = sys.toW(x, y), th = sim.placed.carriedAt(w.x, w.y); if (th) { p.own = 'take'; p.th = th; p.tk = null; return stop(e); } }   // Q354: a carried thing (things.js): drag = take it, still = the old tap
    G.pend = null; G.teachA = P.size === 1 && sys.teach ? sys.teach.haloAt(x, y) : null;   // a teach line may start here (teach.js)
    if (P.size === 3 && !G.multi) { const ps = [...P.values()]; G.multi = { n: 3, t0: now(), moved: false, ps, fired: false, cx: ps.reduce((s, q) => s + q.x, 0) / 3, cy: ps.reduce((s, q) => s + q.y, 0) / 3 };
      G.multi.hold = setTimeout(() => { const m = G.multi; if (!m || m.moved || m.n !== 3 || P.size !== 3) return; m.fired = true; const open = sys.panel && sys.panel.toggle ? sys.panel.toggle() : null; mark(open ? 'dev.open' : 'dev.close', m.cx, m.cy); bus.post({ type: 'dev.toggle', open }); }, O.devHoldMs); }
    else if (G.multi && P.size > G.multi.n) { G.multi.n = P.size; clearTimeout(G.multi.hold); G.multi.ps = [...P.values()]; }
    if (P.size === 2 && !G.multi) { const [a, b] = [...P.values()]; const free = sys.free ? sys.free(a.x0, a.y0) && sys.free(b.x0, b.y0) : true;
      G.twist = free && !a.own && !b.own ? { a0: Math.atan2(b.y - a.y, b.x - a.x), d0: Math.hypot(b.x - a.x, b.y - a.y), z0: sys.depth ? sys.depth() : null, ids: [...P.keys()] } : null; } else if (P.size > 2) G.twist = null;
    if (p.own === 'multi') return stop(e); };
  const move = e => { const p = P.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY; if (p.pts.length < 400) p.pts.push([p.x, p.y, e.timeStamp]);
    if (P.size === 2 && sys.fuse && !G.splitDone) spreadWatch();
    if (p.own === 'bubble') { if (sys.bubbles) sys.bubbles.move(p); return stop(e); }
    if (p.own === 'jam') { sys.jamview.move(e, p); return stop(e); } if (!p.own && sys.jamview && sys.jamview.open) p.own = 'jamhold';   // the pinch that opened the view: its moves stop here, its lift still reaches zoom / input
    if (p.own === 'jamhold') return stop(e);
    if (p.own === 'daw') { sys.daw.move(e, p); return stop(e); } if (p.own === 'walk') { sys.walk.move(p); return stop(e); }
    if (p.own === 'end') { if (Math.hypot(p.x - p.x0, p.y - p.y0) >= 6 || p.h.moved) { const w = sys.toW(p.x, p.y); sim.placed.handleMove(p.h, w.x, w.y); } return stop(e); }
    if (p.own === 'take') { const w = sys.toW(p.x, p.y); if (!p.tk && Math.hypot(p.x - p.x0, p.y - p.y0) >= (sim.placed.opts.takePx || 10)) { const w0 = sys.toW(p.x0, p.y0); p.tk = sim.placed.take(p.th, w0.x, w0.y); mark('take', p.x, p.y); } if (p.tk) sim.placed.takeMove(p.tk, w.x, w.y); return stop(e); }
    if (G.multi && p.own === 'multi' && Math.hypot(p.x - p.x0, p.y - p.y0) >= O.tapPx) { G.multi.moved = true; clearTimeout(G.multi.hold); } if (p.own) return stop(e);
    if (G.multi && Math.hypot(p.x - p.x0, p.y - p.y0) >= O.tapPx) { G.multi.moved = true; clearTimeout(G.multi.hold); }
    const T = G.twist; if (T && P.size === 2) { const a = P.get(T.ids[0]), b = P.get(T.ids[1]); if (a && b && sys.daw) { let d = Math.atan2(b.y - a.y, b.x - a.x) - T.a0; d = Math.atan2(Math.sin(d), Math.cos(d)); const r = Math.hypot(b.x - a.x, b.y - a.y) / T.d0;
      if (Math.abs(d) > O.twistRad && r > .7 && r < 1.45) { G.twist = null; if (T.z0 != null && sys.setDepth) sys.setDepth(T.z0); sys.daw.show(true, (a.x + b.x) / 2, (a.y + b.y) / 2); mark('daw', (a.x + b.x) / 2, (a.y + b.y) / 2); } } } };
  const up = e => { const p = P.get(e.pointerId); if (!p) return; P.delete(e.pointerId); if (sys.jamview && p.own !== 'jam') sys.jamview.forget(e.pointerId); if (e.pointerId != null && P.size < 2) G.twist = null;
    if (p.own === 'daw') { sys.daw.up(e, p); return stop(e); }
    if (p.own === 'jam') { const w = sys.jamview.up(e, p, e.type === 'pointercancel'); if (w) mark('jam.' + w, p.x, p.y); return stop(e); } if (p.own === 'jamhold') return;
    if (p.own === 'bubble') { if (sys.bubbles) { const w = sys.bubbles.up(p, e.type === 'pointercancel'); if (w) mark('bubble.' + w.k, p.x, p.y); } return stop(e); }
    if (p.own === 'clay' && !G.multi) { if (sys.clay) { const w = sys.clay.up(e.pointerId, p, e.type === 'pointercancel'); if (w) mark('clay.' + w.k, p.x, p.y); } return stop(e); }
    if (p.own === 'clay' && G.multi && sys.clay) sys.clay.cancel();   // a third finger: the 3-finger undo, not a clay touch
    if (p.own === 'egg' && !G.multi) { if (e.type !== 'pointercancel' && sys.egg) sys.egg.stroke(p.pts); return stop(e); }
    if (p.own === 'helper') return stop(e); if (p.own === 'walk') { sys.walk.up(p); return stop(e); }
    if (p.own === 'end') { const r = sim.placed.handleUp(p.h); mark(r === 'tap' ? 'thing' : 'resize', p.x, p.y); return stop(e); }
    if (p.own === 'take') { if (!p.tk && e.type !== 'pointercancel') { sim.placed.play(p.th, .7, undefined, 'player'); mark('thing', p.x, p.y); } else mark('put', p.x, p.y); return stop(e); }
    if (p.own === 'second') { const pend = G.pend; G.pend = null; stop(e); if (!pend) return; const a = analyze(p.pts), short = a.len < 24;
      if (short && inDot(pend.a, p.x, p.y)) { if (sys.helper) sys.helper.arm(p.x, p.y); mark('help', p.x, p.y); return; }
      const dir = arrowDir(a); if (dir && sys.undo) { if (dir === '<') sys.undo.undo(); else sys.undo.redo(); mark(dir === '<' ? 'undo' : 'redo', a.cx, a.cy); }
      return; }
    const m = G.multi; if (m) { if (!P.size) { G.multi = null; clearTimeout(m.hold); const UU = sys.jamview && sys.jamview.open ? sys.jamview : sys.undo; if (!m.moved && !m.fired && now() - m.t0 < O.tapMs && UU) { if (m.n === 3) UU.undo(); else if (m.n === 4) UU.redo(); mark(m.n === 3 ? 'undo' : 'redo', m.cx, m.cy); } }
      else if (!m.fired) { clearTimeout(m.hold); m.lifted = true; } if (p.own === 'multi' || p.own === 'egg' || p.own === 'clay') stop(e); return; }
    if (!p.own && !P.size && sys.soft && isFlick(p, now(), sys.soft.opts)) { const o = sys.ohmAt(p.x0, p.y0); if (o) { const [vx, vy] = fingerVel(p.pts); if (sys.soft.flick(o, vx, vy)) mark('flick', p.x, p.y); return; } }   // flick an ohm (softbody.js)
    if (!p.own && !P.size && now() - p.t0 < O.tapMs && Math.hypot(p.x - p.x0, p.y - p.y0) < 12 && sys.clay && sys.clay.cur && !sys.ohmAt(p.x, p.y)) { sys.clay.hatch(); mark('clay.hatch', p.x, p.y); }   // a tap on empty space hatches the open clay
    if (!p.own && !P.size && now() - p.t0 < O.tapMs && Math.hypot(p.x - p.x0, p.y - p.y0) < 12 && sys.mouth) sys.mouth.tap(p.x, p.y);   // a plain tap still reaches the world; two on an ohm's mouth = mouth control (mouth.js)
  };
  window.addEventListener('pointerdown', down, true); window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);
  // hints drawn over the world: the hook waiting for its dot, the dev-hold ring filling, and a short glyph for each undo / redo / spawn
  G.draw = g => { const t = now();
    if (G.pend) { const k = 1 - (t - G.pend.t) / O.hookWaitMs; if (k <= 0) G.pend = null; else { const pts = G.pend.pts; g.strokeStyle = 'rgba(255,240,200,' + .6 * k + ')'; g.lineWidth = 3; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); } }
    const m = G.multi; if (m && m.n === 3 && !m.moved && !m.fired && !m.lifted) { const f = Math.min(1, (t - m.t0) / O.devHoldMs); if (f > .15) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4; g.beginPath(); g.arc(m.cx, m.cy, 46, -1.571, -1.571 + 6.283 * f); g.stroke(); } }
    for (const k of G.marks) { const a = (t - k.t) / 700; if (a > 1) continue; g.globalAlpha = 1 - a; g.strokeStyle = '#fff'; g.lineWidth = 3; const r = 18 + 30 * a; g.beginPath();
      if (k.type === 'undo') { g.moveTo(k.x + r * .5, k.y - r * .6); g.lineTo(k.x - r * .5, k.y); g.lineTo(k.x + r * .5, k.y + r * .6); } else if (k.type === 'redo') { g.moveTo(k.x - r * .5, k.y - r * .6); g.lineTo(k.x + r * .5, k.y); g.lineTo(k.x - r * .5, k.y + r * .6); }
      else if (noLine('lnHints')) { g.globalAlpha = 1; softRing(g, k.x, k.y, r, 5, '0,0%,100%', .6 * (1 - a)); continue; } else g.arc(k.x, k.y, r, 0, 6.283); g.stroke(); g.globalAlpha = 1; }   // v0.0.30 lnHints: the spawn / nothing-to-undo mark is a soft ripple
    if (sys.undo) for (const k of sys.undo.marks.splice(0)) if (k.type.endsWith('.none')) G.marks.push({ type: 'none', x: innerWidth / 2, y: innerHeight * .5, t: k.t }); };
  G.destroy = () => { window.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true); };
  return G; }
