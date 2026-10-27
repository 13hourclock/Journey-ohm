// SYSTEMS: FUSIONS AND COLONIES (PLAN_SYSTEMS 10, audit B13; "sticking one or more together manually makes them stick together as one
// creature cluster", WV:515; old game GESTURES row "drag + press into another ohm" with its C5 fix). Drag an ohm and keep it pressed
// into another (overlap, nearly still) for 0.9 s = they fuse: soft links hold the cluster together, so it moves as one creature
// (drag one, the rest follow; throw one, the cluster flies) and, sitting together, it always jams / sings as one group. More ohms
// can be pressed on (one cluster, any size). Drag a member far (link stretched > 2.2x) = it comes off. Fuse / separate are undoable.
// SPLIT (Wilbow 4:06 PM Oct 23 "two fingers placed on ohms spread apart splits the group", 4:54 PM card "a quick wide spread splits;
//   slow small moves still squeeze / DNA spread / split-off ohms can rejoin after a while", 4:55 PM "group I meant the ones that are stuck
//   together"; V08 U G6, carried): two fingers that start on two ohms of ONE fused cluster and spread quickly and wide (>= 120 px in
//   <= 350 ms, V08 G6) split the cluster across the spread: members on each side of the middle stay together, the links between
//   the sides go. Slow / small moves are unchanged (drag, tear). Undoable as one step. gestures.js watches the fingers.
// REJOIN (Wilbow 3:58 PM Oct 25, Q355 "yes but they can rejoin if in range"): the split halves can re-stick whenever they are in range
//   again, by the same press as any fuse (drag one into the other, hold still 0.9 s). Fusing always needs that deliberate press, so a
//   split does not snap back on its own. Switches (dev panel): rejoin (ON; off = the old V08 G6 ~4 min no-re-stick wait) and leaveFirst
//   (my proposed smallest guard, OFF: a split pair must first be out of range once - centres > 1.5 x their radii - before it can re-stick).
import { noLine } from './soft.js';   // v0.0.30 B9: no outlines
export const FUSE_OPTS = { on: true, holdS: .9, overlap: .8, still: .8, rest: .95, k: 40, damp: 6, tear: 2.2, spread: true, spreadPx: 120, spreadMs: 350, apartS: 240, rejoin: true, leaveFirst: false, leaveK: 1.5 };
export const linkKey = (a, b) => Math.min(a, b) + '-' + Math.max(a, b);
export function clusters(links) { const adj = new Map(); for (const k of links) { const [a, b] = k.split('-').map(Number); (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); }
  const seen = new Set(), out = []; for (const s of adj.keys()) { if (seen.has(s)) continue; const c = [], st = [s]; seen.add(s); while (st.length) { const x = st.pop(); c.push(x); for (const y of adj.get(x)) if (!seen.has(y)) { seen.add(y); st.push(y); } } out.push(c.sort((a, b) => a - b)); } return out; }
export function createFuse(sim, bus, undo, opts = {}) { const O = { ...FUSE_OPTS, ...opts }, F = { opts: O, links: new Set(), press: null, made: 0, torn: 0, apart: new Map(), left: new Map(), t: 0, splits: 0 };
  const link = (a, b, on) => { const k = linkKey(a.id, b.id); if (on) F.links.add(k); else F.links.delete(k); bus.post({ type: on ? 'fuse' : 'unfuse', a, b }); };
  F.colonyOf = o => { if (!o) return null; for (const c of clusters(F.links)) if (c.includes(o.id)) return c; return null; };
  F.fuse = (a, b) => { if (F.links.has(linkKey(a.id, b.id))) return false; link(a, b, true); F.made++; if (undo) undo.push({ label: 'fuse', x: a.body.x, y: a.body.y, undo: () => link(a, b, false), redo: () => link(a, b, true) }); return true; };
  F.split = (a, b) => { if (!F.links.has(linkKey(a.id, b.id))) return false; link(a, b, false); F.torn++; if (undo) undo.push({ label: 'separate', x: a.body.x, y: a.body.y, undo: () => link(a, b, true), redo: () => link(a, b, false) }); return true; };
  // quick wide spread on two members: split along the spread axis (ax, ay: direction a -> b in the world; default the line between them)
  F.spreadSplit = (a, b, ax, ay) => { if (!O.on || !O.spread || !a || !b || a === b) return 0; const col = F.colonyOf(a); if (!col || !col.includes(b.id)) return 0;
    if (ax == null) { ax = b.body.x - a.body.x; ay = b.body.y - a.body.y; } const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l;
    const mx = (a.body.x + b.body.x) / 2, my = (a.body.y + b.body.y) / 2, side = new Map(); for (const id of col) { const o = sim.byId.get(id); if (o) side.set(id, (o.body.x - mx) * ax + (o.body.y - my) * ay >= 0); }
    side.set(a.id, false); side.set(b.id, true); const cut = [...F.links].filter(k => { const [i, j] = k.split('-').map(Number); return side.has(i) && side.has(j) && side.get(i) !== side.get(j); });
    if (!cut.length) return 0; const until = F.t + O.apartS; for (const i of col) for (const j of col) if (i < j && side.get(i) !== side.get(j)) { F.apart.set(linkKey(i, j), until); F.left.set(linkKey(i, j), false); }
    const set = on => { for (const k of cut) { const [i, j] = k.split('-').map(Number), x = sim.byId.get(i), y = sim.byId.get(j); if (x && y) link(x, y, on); } };
    set(false); F.torn += cut.length; F.splits++; bus.post({ type: 'fuse.split', a, b, n: cut.length });
    if (undo) undo.push({ label: 'split', x: mx, y: my, undo: () => set(true), redo: () => set(false) }); return cut.length; };
  const apart = (i, j) => { const k = linkKey(i, j);
    if (O.leaveFirst && F.left.get(k) === false) return true;
    if (O.rejoin) return false; const u = F.apart.get(k); if (u == null) return false; if (F.t >= u) { F.apart.delete(k); return false; } return true; };
  F.tick = dt => { if (!O.on) return; const by = sim.byId, h = Math.min(.05, dt); F.t += dt;
    for (const k of [...F.left.keys()]) { const [i, j] = k.split('-').map(Number), a = by.get(i), b = by.get(j); if (!a || !b || Math.hypot(a.body.x - b.body.x, a.body.y - b.body.y) > O.leaveK * (a.g.r + b.g.r)) F.left.delete(k); }   // leaveFirst: out of range once
    // press to fuse: the grabbed ohm, overlapping another, nearly still
    let pr = null; for (const o of sim.ohms) { const b = o.body; if (!b || !b.grab || o.dead) continue; if (Math.hypot(b.vx, b.vy) > O.still) continue;
      for (const q of sim.ohms) { if (q === o || q.dead || !q.g) continue; const d = Math.hypot(q.body.x - b.x, q.body.y - b.y); if (d < O.overlap * (o.g.r + q.g.r) && !F.links.has(linkKey(o.id, q.id)) && !apart(o.id, q.id)) { pr = [o, q]; break; } } if (pr) break; }
    if (pr) { if (F.press && F.press[0] === pr[0] && F.press[1] === pr[1]) { F.press.t += h; if (F.press.t >= O.holdS) { F.fuse(pr[0], pr[1]); F.press = null; } } else { F.press = pr; pr.t = 0; } } else F.press = null;
    // soft links; a grabbed member pulled far tears off
    for (const k of [...F.links]) { const [i, j] = k.split('-').map(Number), a = by.get(i), b = by.get(j); if (!a || !b) continue; const A = a.body, B = b.body, rest = O.rest * (a.g.r + b.g.r), dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-3;
      if (d > O.tear * rest && (A.grab || B.grab)) { F.split(a, b); continue; } const f = (d - rest) * O.k, ux = dx / d, uy = dy / d, rv = (B.vx - A.vx) * ux + (B.vy - A.vy) * uy, ff = (f + rv * O.damp) * h;
      if (!A.grab) { A.vx += ux * ff; A.vy += uy * ff; if (a.g.float) A.homeY = A.y; } if (!B.grab) { B.vx -= ux * ff; B.vy -= uy * ff; if (b.g.float) B.homeY = B.y; } } };
  // v0.0.30 B9 lnFuse (+ noOutlines): a link is a soft ribbon of light (three widening faint passes, round ends, no hard core) and the
  // press-to-fuse progress is a ring of beads; look.link(g, a, b, k) (screen points) paints the link when Visuals add it. Off = the v0.0.29 lines.
  F.draw = (g, toS, look) => { if (!F.links.size) return; const nl = noLine('lnFuse'), lc = g.lineCap;
    if (nl) g.lineCap = 'round'; else { g.strokeStyle = 'rgba(255,230,180,.35)'; g.lineWidth = 3; }
    for (const k of F.links) { const [i, j] = k.split('-').map(Number), a = sim.byId.get(i), b = sim.byId.get(j); if (!a || !b) continue; const p = toS(a.body.x, a.body.y), q = toS(b.body.x, b.body.y);
      if (look && look.link && look.link(g, p, q, 1) === true) continue;
      if (nl) { for (let w = 0; w < 3; w++) { g.strokeStyle = `rgba(255,230,180,${[.06, .08, .1][w]})`; g.lineWidth = [9, 5, 2.5][w]; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); } continue; }
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); }
    g.lineCap = lc;
    if (F.press && F.press.t > .15) { const o = F.press[0], s = toS(o.body.x, o.body.y), rr = o.g.r * s.s * 1.2, pr = Math.min(1, F.press.t / O.holdS);
      if (nl) { const m = Math.max(1, Math.round(pr * 24)); g.fillStyle = 'rgba(255,230,180,.7)'; g.beginPath(); for (let i = 0; i < m; i++) { const a = -1.571 + i / 24 * 6.283, x = s.x + Math.cos(a) * rr, y = s.y + Math.sin(a) * rr; g.moveTo(x + 2, y); g.arc(x, y, 2, 0, 6.283); } g.fill(); }
      else { g.strokeStyle = 'rgba(255,230,180,.8)'; g.beginPath(); g.arc(s.x, s.y, rr, -1.571, -1.571 + 6.283 * F.press.t / O.holdS); g.stroke(); } } };
  F.save = () => [...F.links]; F.load = d => { F.links = new Set((d || []).filter(k => k.split('-').every(i => sim.byId.has(+i)))); };
  return F; }
