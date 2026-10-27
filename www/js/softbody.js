// SOFT BODIES (PLAN_SYSTEMS 13 "the body is soft and its shape and motion modulate the sound"; SUMMARY "Ohm controls are physical when
// possible ... squishing, stretching or flicking the ohm's body"; Wilbow 455 "some fluid simulation and squishy interactions").
// The engine already has the soft ring (genes.js RING points, sim.js springs), PINCH (two fingers on an ohm squeeze / swell it; held
// still it sings) and THROW (let go of a dragged ohm and it keeps the finger's speed; a hard throw calls out). This adds, on that ring:
//   SQUISH  - drag an ohm INTO the ground or a world edge: the finger goes further than the body can, and the body flattens against it
//             (it also reads as a squeeze, body.pinchIn: the held sound rises and brightens - the existing pinch rows)
//   STRETCH - a dragged ohm lags behind a fast finger: it stretches toward the finger (body.pull rows: deeper first effect); a flying
//             (thrown / flicked) ohm stretches a little along its flight (body.motion: the pitch wavers)
//   FLICK   - a quick short swipe that starts on an ohm (< flickMs, > flickPx, > flickV px/ms) sends it off at the finger's speed with a
//             jelly wobble (body.wobble / body.impact rows); a hard flick calls out like a hard throw
//   PINCH   - the existing two-finger squeeze / swell now also shows on the body (it shrinks / swells on the ring)
// Deformation is a target for the ring points; the ring's own springs bring it back with a wobble when you let go.
export const SOFT_OPTS = { on: true, squish: true, stretch: true, flick: true, pinchShape: true, squishMax: .45, stretchMax: .6, flyStretch: .25, follow: .35, flickMs: 220, flickPx: 24, flickV: .5, flickK: 1 };
// rest point (rx, ry) scaled by sA along unit axis (ax, ay) and by sP across it
export function deform(rx, ry, ax, ay, sA, sP, out = [0, 0]) { const u = rx * ax + ry * ay, v = -rx * ay + ry * ax, U = u * sA, V = v * sP; out[0] = U * ax - V * ay; out[1] = U * ay + V * ax; return out; }
// how squished / stretched a body is this tick. b = body, r = radius, grab = [gx, gy] finger target or null, gY = ground y under it,
// B = world bounds. Returns { sq, sqx, sqy (squish axis), st, stx, sty (stretch axis), pin (pinch scale) }
export function shapeOf(b, r, grab, gY, B, O = SOFT_OPTS) { const S = { sq: 0, sqx: 0, sqy: 1, st: 0, stx: 1, sty: 0, pin: 1 };
  if (grab) { let [gx, gy] = grab;
    if (O.squish) { const dn = (gy - (gY - r)) / r, dl = ((B.x0 + r) - gx) / r, dr = (gx - (B.x1 - r)) / r, m = Math.max(dn, dl, dr);
      if (m > 0) { S.sq = Math.min(O.squishMax, m * .6); if (m === dn) { S.sqx = 0; S.sqy = 1; } else { S.sqx = 1; S.sqy = 0; } } }
    gy = Math.min(gy, gY - r); gx = Math.max(B.x0 + r, Math.min(B.x1 - r, gx));
    if (O.stretch) { const dx = gx - b.x, dy = gy - b.y, d = Math.hypot(dx, dy); if (d > 1e-4) { S.st = Math.min(O.stretchMax, d / r * .8); S.stx = dx / d; S.sty = dy / d; } } }
  else if (O.stretch && b.flying) { const sp = Math.hypot(b.vx, b.vy); if (sp > .5) { S.st = Math.min(O.flyStretch, sp / 14 * O.flyStretch * 1.5); S.stx = b.vx / sp; S.sty = b.vy / sp; } }
  if (O.pinchShape && b.ps) S.pin = Math.max(.6, Math.min(1.4, 1 + b.ps * .5));
  return S; }
// the target ring (offsets from the centre) for a shape: squish (keeps area roughly: flatter + wider), then stretch, then pinch
export function targetRing(rest, n, S, out) { const t = [0, 0];
  for (let i = 0; i < n; i++) { let x = rest[i * 2], y = rest[i * 2 + 1];
    if (S.sq) { deform(x, y, S.sqx, S.sqy, 1 - S.sq, 1 + S.sq * .7, t); x = t[0]; y = t[1]; }
    if (S.st) { deform(x, y, S.stx, S.sty, 1 + S.st, 1 / Math.sqrt(1 + S.st), t); x = t[0]; y = t[1]; }
    out[i * 2] = x * S.pin; out[i * 2 + 1] = y * S.pin; } return out; }
// finger velocity (px/ms) over the last ~60 ms of a stroke [[x, y, t], ...]
export function fingerVel(pts) { const z = pts[pts.length - 1]; let i = pts.length - 1; while (i > 0 && z[2] - pts[i - 1][2] < 60) i--; const a = pts[Math.max(0, i - (i === pts.length - 1 ? 1 : 0))], dt = Math.max(1, z[2] - a[2]); return [(z[0] - a[0]) / dt, (z[1] - a[1]) / dt]; }
export function isFlick(p, t1, O = SOFT_OPTS) { const d = Math.hypot(p.x - p.x0, p.y - p.y0), dt = Math.max(1, t1 - p.t0); return O.flick && dt < O.flickMs && d > O.flickPx && d / dt > O.flickV; }
export function createSoft(sim, bus, sys, opts = {}) { const O = { ...SOFT_OPTS, ...opts }, F = { opts: O, flicks: 0, squish: 0, stretch: 0, ms: 0 }; const tgt = new Float32Array(64), pend = new Map();
  const gY = x => sim.groundAt ? sim.groundAt(x) : sim.bounds.ground;
  F.tick = () => { if (!O.on) return; const t0 = performance.now(); let sqM = 0, stM = 0;
    for (const o of sim.ohms) { if (o.scale !== 'ohm' || o.parked || o.dead || !o.g || !o.body.ring) continue; const b = o.body, sg = sim.sig && sim.sig[o.id], gx = sg && sg['in.grabX'], gy = sg && sg['in.grabY'], held = gx != null && gx === gx && gy != null;
      const pv = pend.get(o); if (pv && !held) { pend.delete(o); b.vx = pv[0]; b.vy = pv[1]; b.flying = true; b.calm = 0; }
      const S = shapeOf(b, o.g.r, held ? [gx, gy] : null, gY(b.x), sim.bounds, O); if (!S.sq && S.st < .01 && Math.abs(S.pin - 1) < .01) { b.soft = 0; continue; }
      const n = b.rest.length / 2; targetRing(b.rest, n, S, tgt); const R = b.ring, k = O.follow;
      for (let i = 0; i < n; i++) { R[i * 4] += (tgt[i * 2] - R[i * 4]) * k; R[i * 4 + 1] += (tgt[i * 2 + 1] - R[i * 4 + 1]) * k; }
      if (S.sq > 0) b.ps = Math.min(b.ps || 0, -S.sq);   // squished = squeezed: the pinch-in sound rows answer
      b.soft = Math.max(S.sq, S.st); if (S.sq > sqM) sqM = S.sq; if (S.st > stM) stM = S.st; }
    F.squish = sqM; F.stretch = stM; F.ms = F.ms * .9 + (performance.now() - t0) * .1; };
  // a flick: vx, vy in px/ms on screen -> world speed (the engine caps it); applied now and again as soon as the finger's grab lets go
  F.flick = (o, vx, vy) => { if (!O.on || !O.flick || !o || !o.body) return false; const q = sys.toS(o.body.x, o.body.y), s = q.s || 1, wx = vx * 1000 / s * O.flickK, wy = vy * 1000 / s * O.flickK;
    o.body.vx = wx; o.body.vy = wy; pend.set(o, [wx, wy]); const sp = Math.hypot(wx, wy) || 1; if (sim.kick) sim.kick(o, -wx / sp, -wy / sp, Math.min(3, sp * .25), false);
    F.flicks++; bus.post({ type: 'flick', src: o, vx: wx, vy: wy }); return true; };
  return F; }
