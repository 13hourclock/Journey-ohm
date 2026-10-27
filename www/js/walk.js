// SYSTEMS: WALK IN AN OHM'S SHOES (PLAN_SYSTEMS 9, audit B13; Wilbow 12:43 AM Oct 23; old game v0.7 K). Hold your ohm still until its
// nodes open (the existing 'take it' hold), then a thumb on EMPTY screen in the LEFT half (> 1.25 radius from the body) is a walking
// stick: a soft glow under the thumb; drag = the ohm walks / floats that way with its own muscles; a quick flick up = jump (grounded)
// or rise (floaters). Its notes keep playing as usual (nodes on the right still play). Nodes closing (tap empty ground) = done.
// A stick touch that lifts without moving is a plain tap on empty ground (the nodes close, as before).
export const WALK_OPTS = { on: true, speed: 3.2, dead: 10, range: 70, jumpV: 7.5, flickPx: 35, flickV: 1.1 };
export function stickVec(dx, dy, range = WALK_OPTS.range, dead = WALK_OPTS.dead) { const d = Math.hypot(dx, dy); if (d < dead) return { x: 0, y: 0 }; const k = Math.min(1, (d - dead) / (range - dead)) / d; return { x: dx * k, y: dy * k }; }
export function createWalk(sim, bus, music, sys, opts = {}) { const O = { ...WALK_OPTS, ...opts }, K = { opts: O, p: null, v: { x: 0, y: 0 }, jumps: 0, cool: 0 };
  K.claim = (x, y) => { const o = sim.ohm; if (!O.on || !o || !o.nodesOpen || x > innerWidth / 2) return false; const s = sys.toS(o.body.x, o.body.y); return Math.hypot(x - s.x, y - s.y) > Math.max(48, o.g.r * s.s * 1.25); };
  K.down = p => { K.p = p; K.v.x = K.v.y = 0; };
  K.move = p => { if (p !== K.p) return; K.v = stickVec(p.x - p.x0, p.y - p.y0, O.range, O.dead); const n = p.pts.length; if (n > 3) { const a = p.pts[n - 4], b = p.pts[n - 1], dt = Math.max(1, b[2] - a[2]), vy = (b[1] - a[1]) / dt;
      if (vy < -O.flickV && a[1] - b[1] > O.flickPx * .5 && p.y0 - p.y > O.flickPx && K.cool <= 0) K.jump(); } };
  K.jump = () => { const o = sim.ohm, b = o && o.body; if (!b) return; if (o.g.float) { b.vy = -O.jumpV * .6; b.homeY = b.y - 1.2; } else if (b.ground) b.vy = -O.jumpV; else return; b.calm = 0; K.jumps++; K.cool = .6; bus.post({ type: 'walk.jump', src: o }); };
  K.up = p => { if (p !== K.p) return; K.p = null; K.v.x = K.v.y = 0; if (Math.hypot(p.x - p.x0, p.y - p.y0) < 10 && performance.now() - p.t0 < 400 && sim.ohm) { sim.ohm.nodesOpen = false; bus.post({ type: 'touch', kind: 'tap', x: p.x, y: p.y }); } };
  K.tick = dt => { K.cool -= dt; const o = sim.ohm; if (!o || !K.p) return; if (!o.nodesOpen) { K.p = null; return; } const b = o.body; b.vx += (K.v.x * O.speed - b.vx) * Math.min(1, dt * 6); if (o.g.float) { b.vy += (K.v.y * O.speed - b.vy) * Math.min(1, dt * 5); b.homeY = b.y; } b.calm = 0; };
  K.draw = g => { const p = K.p; if (!p) return; const gr = g.createRadialGradient(p.x0, p.y0, 4, p.x0, p.y0, O.range); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x0, p.y0, O.range, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(p.x0 + K.v.x * O.range, p.y0 + K.v.y * O.range, 16, 0, 6.283); g.fill(); };
  return K; }
