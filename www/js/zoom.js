// ZOOM + PAN (world track), separate from input.js so the ohm gestures stay untouched. Checked against GESTURES.md + team defaults:
//   two fingers that start on empty world (neither on any ohm, a thing or an open node) = zoom about the fingers' midpoint, and
//   moving that midpoint pans (input.js only posts these as 'touch' pinch2 and leaves zoom / pan to the world track).
//   8% dead zone: two still fingers never zoom. A twist past ~0.4 rad freezes the zoom (twist is the DAW's, C13).
//   One finger on empty ground stays the ohms track's (tap / 4-tap tempo / current / hold = spawn): this file never acts on it.
//   Pinch on an ohm stays its squeeze; 3+ fingers stay reserved (undo/redo). Desktop: ctrl/trackpad-pinch wheel zooms.
// Zoom is continuous and open-ended: every +1 depth = ZK x closer = one layer deeper, the same at every scale.
import { cam, layout, ZK, setDepth, getOff, setOff } from './view.js';
import { toScreen } from './space.js';
export function createZoom(el, sim, size) {
  const P = new Map(); let pz = null, wheelT = 0, aimed = false; const ts = {};
  const free = (x, y) => { const Dv = sim.world && sim.world.zl && sim.world.zl.dive; if (Dv && Dv.owns()) return true;   // inside an ohm (dive.js) every two fingers zoom / glide
    const { W, H } = size(), o = sim.ohm, L = layout(W, H, o); const S = sim.world && sim.world.system; if (S && S.opts.on && sim.world.cam.z < -1.5) return true;   // v0.0.12: in deep space no finger is on an ohm (input.js gate)
    if (L.R > 0) { for (const q of sim.ohms || [o]) { if (q.parked) continue; const s = toScreen(W, H, sim.cam, q.body.x, q.body.y, ts); if (Math.hypot(x - s.x, y - s.y) < Math.max(36, (q.g ? q.g.r : 1) * s.s * 1.15)) return false; }
      for (const t of sim.things || []) { const s = toScreen(W, H, sim.cam, t.x, t.y, ts); if (Math.hypot(x - s.x, y - s.y) < Math.max(36, t.r * s.s * 1.2)) return false; }
      if (o.nodesOpen) for (const n of L.nodes) if (Math.hypot(n.x - x, n.y - y) < n.r * 1.25) return false; }
    return true; };
  const clampOff = (W, H, ox, oy) => setOff(W, H, Math.max(-W * .38, Math.min(W * .38, ox)), Math.max(-H * .28, Math.min(H * .22, oy)));   // keep the home anchor (where layers open) well on screen
  // zoom to depth z keeping screen point (mx,my) where it is, then move it by (px,py) (pan)
  const zoomAbout = (z, mx, my, px = 0, py = 0) => { const { W, H } = size(), s0 = sim.cam.z, zl = cam.zMin != null ? Math.max(-12, Math.min(cam.z, cam.zMin)) : -12; if (cam.zHold) z = cam.zHold(z); z = Math.max(zl, Math.min(12, z));   /* cam.zHold: soft resistance, cam.zMin: hard stop - the next scale held closed (rare.js, Wilbow 5D) */
    // v0.0.11 SPACE (world.system on, past z -1.5): the view centres on the star / focus planet, so no pan here. Zooming IN aims once per
    // gesture at the planet nearest the fingers' midpoint (landing snaps to it, system.js / world.land); zooming far out (< -2.5) un-aims.
    { const w = sim.world, S = w && w.system; if (S && S.opts.on && w.opts.planet && Math.min(z, cam.z) < -1.5) { const dz = z - cam.z;
      const G = w.galaxy, far = G && G.opts.on && cam.z < G.opts.aimZ; if (G && G.fresh) { G.fresh = false; aimed = false; }   // step 2: far out you aim at a star; arrived, you may aim at its planets
      if (dz > 0 && !aimed && cam.z < -1.5) { aimed = true; if (far) G.aim(mx, my, G.cx, G.cy); else S.aim(mx, my); } else if (dz < 0 && z < -2.5) { S.unaim(); if (G && z < -4.2) G.unaim(); }
      setDepth(z); return; } }
    { const Dv = sim.world && sim.world.zl && sim.world.zl.dive;
      if (sim.jamView && !(Dv && Dv.o) && sim.jamView.zoom(z, mx, my, W, H)) return;   // the jam view (jamview.js, switch jamView OFF): a deep spread on a jam's middle (off the members' bodies) opens it, ahead of the dive's wide reach; already inside a dive the dive keeps it; elsewhere nothing changes
      if (Dv && Dv.zoom(z, mx, my, px, py, W, H)) return; }   // the dive (dive.js): a pinch into an ohm goes inside it; the camera holds
    const k = Math.pow(ZK, z) / s0, o = getOff(W, H), ax = W / 2 + o.ox, ay = H * .36 + o.oy;
    let ox = mx + px - W / 2 - (mx - ax) * k; const oy = my + py - H * .36 - (my - ay) * k; setDepth(z);
    // v0.0.9 WALK (toggle world.opts.walk): at planet size a sideways two-finger drag spins the planet under you instead of panning;
    // at home, dragging past the pan limit keeps walking along the (periodic) ground. Only the drag part walks, never zoom drift.
    const w = sim.world; if (w && w.walkBy && w.opts.walk && px) { const sc = Math.pow(ZK, z) * W;
      if (w.opts.planet && z < -.05 && z > -1.5) { w.walkBy(-px / sc); ox -= px; }
      else { const lim = W * .38, over = ox > lim ? ox - lim : ox < -lim ? ox + lim : 0; if (over && Math.sign(over) === Math.sign(px)) w.walkBy(-Math.sign(px) * Math.min(Math.abs(over), Math.abs(px)) / sc); } }
    clampOff(W, H, ox, oy); };
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  el.addEventListener('pointerdown', e => { P.set(e.pointerId, { x: e.clientX, y: e.clientY, free: free(e.clientX, e.clientY) });
    if (P.size === 2) { const [a, b] = [...P.values()]; if (a.free && b.free) { const m = mid(a, b); aimed = false; pz = { d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), a0: Math.atan2(b.y - a.y, b.x - a.x), z0: cam.z, m, frozen: false, go: false }; cam.active = true; cam.v = 0; } }
    else if (P.size > 2 && pz) { pz = null; cam.active = false; cam.zoomGo = false; } });
  el.addEventListener('pointermove', e => { const p = P.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
    if (!pz || P.size !== 2) return; const [a, b] = [...P.values()], m = mid(a, b); let da = Math.atan2(b.y - a.y, b.x - a.x) - pz.a0; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > .4) pz.frozen = true;
    const dd = Math.hypot(a.x - b.x, a.y - b.y), moved = Math.hypot(m.x - pz.m.x, m.y - pz.m.y);
    if (!pz.go) { const r = dd / pz.d0, spread = Math.abs(r - 1) >= .08; if (cam.shaping ? !spread : (!spread && moved < 14)) return;   // dead zone: still fingers do nothing; while two resting fingers shape the ground only a SPREAD goes (input.js ends shaping on the same move)
      pz.go = true; cam.zoomGo = true; pz.z0 = cam.z; pz.m = m;
      if (!spread) { pz.d0 = dd; return; }   // a pan starts from here
      pz.d0 = pz.d0 * (r > 1 ? 1.08 : .92); }   // v0.0.15 (Q5): a spread hands over to zoom straight away - zoom applies on this same move, measured from the dead zone's edge (no jump)
    const z = pz.frozen ? cam.z : pz.z0 + Math.log(Math.max(1, dd) / pz.d0) / Math.log(ZK), dz = z - cam.z; if (Math.abs(dz) > 1e-4) cam.dir = Math.sign(dz);
    zoomAbout(z, pz.m.x, pz.m.y, m.x - pz.m.x, m.y - pz.m.y); pz.m = m; pz.z0 = cam.z; pz.d0 = Math.max(1, dd); });
  const up = e => { P.delete(e.pointerId); if (pz && P.size < 2) { pz = null; cam.active = false; } if (P.size < 2) cam.zoomGo = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey && !e.altKey) return; e.preventDefault(); const dz = -e.deltaY * .004; cam.dir = Math.sign(dz) || cam.dir; cam.active = true;
    zoomAbout(cam.z + dz, e.clientX, e.clientY); clearTimeout(wheelT); wheelT = setTimeout(() => { cam.active = false; aimed = false; }, 220); }, { passive: false });
  return { zoomAbout, pointers: P, free };   // v0.0.15: free exposed for the gesture test (is a screen point clear of ohms + things)
}
