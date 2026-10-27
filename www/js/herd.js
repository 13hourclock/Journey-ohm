// v0.0.10 HERD (C #7, Wilbow 4:15 AM GO; ideas from softsound herd.js 0.8b4, read only): CALL ohms over, LOOP a group, set a HOME.
// Everything here is a PROPOSAL behind opts.herd (dev panel), context decides; no fixed roles ("fudged" = an idea turned into a fixed rule).
//   herd.call {x, y}  (double tap on bare ground): WHO answers = context (C7-1 C): the selected group (or the focus ohm when there is
//                     none) always; other ohms by a score = social gene + closeness + jamming + place mood (weights in opts.herd.w).
//                     Each answering ohm travels so it ARRIVES ON A BEAT (the first beat it can reach at its own pace) and sounds softly there.
//   herd.select {ids} (closed loop drawn round 2+ ohms; decided on lift): dragging a member moves the whole group. Clears after selT s
//                     or a single tap on empty ground.
//   herd.home {ids, x, y} (drag, then keep the finger still ~1 s): that spot is home, kept in the brain as a 'place' memory (saved with it).
//                     HOW MUCH an ohm drifts back (C7-2 A+B+C) = a continuous homing gene x context (place mood, jamming): some drift
//                     gently home, some effectively stay put. Never a homebody / wanderer category.
// Cost: O(called + selected) per tick; home drift visits only ohms that have a home, every 4th tick. Draw: only marks that exist.
import { octaveOf, recipes } from './recipe.js';
import { noLine, softRing } from './soft.js';   // v0.0.30 B9: no outlines
const gene = (o, salt) => { let s = ((o.seed || o.id) * 2246822519 + salt * 3266489917) >>> 0; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const polyHas = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
  if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };   // from softsound herd.js polyHas
export const HERD_OPTS = { on: true, call: true, reach: 6, max: 8, thresh: .5, w: { social: .45, near: .45, jam: .25, place: .15 }, arrive: 'beat', arriveNote: true,
  selT: 20, home: { on: true, pull: 'context', base: .5, still: 1 }, stillPx: 7, fastTap: 'context' };
export function createHerd(sim, bus, music, brain) {
  const O = () => sim.opts.herd || HERD_OPTS, H = { sel: new Set(), selAt: 0, called: new Map(), homed: [], marks: [], n: 0, ms: 0, jamB: new Map() };
  if (!sim.opts.herd) sim.opts.herd = JSON.parse(JSON.stringify(HERD_OPTS));
  const byId = id => sim.byId ? sim.byId.get(id) : sim.ohms.find(o => o.id === id);
  bus.on('note', ev => { if (ev.jam && ev.src && ev.src.scale === 'ohm') H.jamB.set(ev.src.id, music.beat()); });
  const jamming = o => { const b = H.jamB.get(o.id); return b != null && music.beat() - b < 8 ? 1 : 0; };
  const place = (x, y) => { const w = sim.world; const f = w && (w.harmonyAt || w.healAt); return f ? clamp(f(x, y)) : .5; };
  H.homingGene = o => gene(o, 19);   // continuous, 0..1 (new gene salt 19)
  // ---- call ----
  bus.on('herd.call', ev => { const c = O(); if (!c.on || !c.call) return; const w = c.w, out = []; const grp = H.sel.size ? [...H.sel].map(byId).filter(Boolean) : [sim.ohm];
    for (const o of sim.ohms) { if (o.parked) continue; const b = o.body, d = Math.hypot(b.x - ev.x, b.y - ev.y); let s;
      if (grp.includes(o)) s = 9; else { if (d > c.reach) continue; s = w.social * (o.g.social || .5) + w.near * (1 - d / c.reach) + w.jam * jamming(o) + w.place * place(b.x, b.y); }
      if (s >= c.thresh) out.push([s, o, d]); }
    out.sort((a, b) => b[0] - a[0]); const nowB = music.beat(), spb = music.spb();
    for (let i = 0; i < out.length && i < Math.max(grp.length, c.max); i++) { const [, o, d] = out[i], k = i - grp.length, off = k < 0 ? 0 : .35 * (1 + (k % 6)) * (k % 2 ? 1 : -1);   // a little room each
      const speed = 1.2 + 2.2 * (1 - (o.g.calm || .5)), travel = d / speed, beat = Math.ceil(nowB + Math.max(.5, travel / spb));
      const x = ev.x + off * Math.max(1, o.g.r * 2), y = o.g.float ? ev.y - .2 : o.body.y;
      H.called.set(o.id, { o, x, y, beat: c.arrive === 'beat' ? beat : nowB + travel / spb, t: c.arrive === 'beat' ? music.timeOfBeat(beat) : music.now() + travel });
      if (sim.wake) sim.wake(o); o.body.flying = false; }
    H.marks.push({ x: ev.x, y: ev.y, t: music.now(), k: 'call' }); H.n++; });
  // ---- select ----
  bus.on('herd.select', ev => { H.sel.clear(); for (const id of ev.ids || []) H.sel.add(id); H.selAt = music.now(); });
  // ---- home ----
  bus.on('herd.home', ev => { const c = O(); if (!c.on || !c.home.on) return;
    for (const id of ev.ids || []) { const o = byId(id); if (!o) continue; const x = o.body.x, y = o.body.y; o.homePos = { x, y };
      if (!H.homed.includes(o)) H.homed.push(o); if (brain) brain.remember(o, 'place', 'home', { x, y }, 1); }
    H.marks.push({ x: ev.x, y: ev.y, t: music.now(), k: 'home' }); });
  // homes come back from the brain (saved with the ohm); checked once per ohm, and again once the brain store has loaded
  let chkN = 0, chkLoaded = false; const restore = () => { if (!brain) return; for (const o of sim.ohms) { if (o.home != null && typeof o.home === 'object') { o.homePos = o.home; delete o.home; }   // older builds kept the place in o.home (the key field)
    if (o.homePos || (o._homeChk && !(brain.loaded && !chkLoaded))) continue; o._homeChk = 1;
      const e = brain.get(o, 'place', 'home'); if (e && e.data) { o.homePos = { x: e.data.x, y: e.data.y }; if (!H.homed.includes(o)) H.homed.push(o); } } if (brain.loaded) chkLoaded = true; chkN = sim.ohms.length; };
  // how strongly this ohm drifts home right now: homing gene x context (place mood: a harmonious place holds it; jamming holds it)
  H.pull = o => { const c = O().home, m = c.pull || 'context'; if (m === 'stay') return 0; const gk = H.homingGene(o); if (m === 'drift') return c.base * (.5 + gk);
    const here = place(o.body.x, o.body.y); return clamp(c.base * (gk * 1.6 - .3) * (1 - .6 * here * (1 - gk)) * (1 - .7 * jamming(o)), 0, 1.5); };
  let held = null, hx = 0, hy = 0, tk = 0;
  H.tick = () => { const t0 = performance.now(), c = O(); if (!c.on) return; const now = music.now(), B = music.beat(); tk++;
    if (chkN !== sim.ohms.length || (brain && brain.loaded && !chkLoaded)) restore();
    // called ohms: steer so they reach the spot at their beat; on arrival they settle (and sound softly on that beat)
    for (const [id, a] of H.called) { const o = a.o, b = o.body; if (o.dead || (sim.sig[o.id] && sim.sig[o.id]['in.grabX'] != null)) { H.called.delete(id); continue; }
      const left = a.t - now, dx = a.x - b.x, dy = a.y - b.y;
      if (left <= .02 || (Math.abs(dx) < .05 && (!o.g.float || Math.abs(dy) < .05) && left < .2)) { b.vx *= .2; if (o.g.float) { b.vy *= .2; b.homeY = b.y; } b.calm = 0; H.called.delete(id);
        if (c.arriveNote) bus.note({ src: o, kind: 'strike', deg: null, oct: octaveOf(recipes.get(o.recipe)), vel: .32, pos: .4, dur: .6, t: Math.max(now, a.t), herd: 1 }); continue; }
      const sp = Math.min(6, Math.abs(dx) / Math.max(.06, left)); b.vx = Math.sign(dx) * sp; if (o.g.float) { b.vy = clamp(dy / Math.max(.06, left), -6, 6); b.homeY = a.y; } b.calm = 0; }
    // group drag: the held member's movement moves the others
    if (H.sel.size) { if (now - H.selAt > c.selT) H.sel.clear(); else { let h = null; for (const id of H.sel) { const o = byId(id); if (o && sim.sig[o.id] && sim.sig[o.id]['in.grabX'] != null) { h = o; break; } }
      if (h) { if (held === h) { const dx = h.body.x - hx, dy = h.body.y - hy; for (const id of H.sel) { const o = byId(id); if (!o || o === h) continue; o.body.x += dx; o.body.y += dy; o.body.homeY = (o.body.homeY || o.body.y) + dy; o.body.calm = 0; } }
        held = h; hx = h.body.x; hy = h.body.y; H.selAt = now; } else held = null; } }
    // home drift (every 4th tick, only ohms with a home)
    if (c.home.on && (tk & 3) === 0) for (const o of H.homed) { if (!o.homePos || H.called.has(o.id) || o === sim.ohm) continue; const b = o.body; if (b.flying || b.grab || b.calm < 2) continue;
      const dx = o.homePos.x - b.x, dy = o.homePos.y - b.y, d = Math.hypot(dx, dy); if (d < 1 + o.g.r) continue; const k = H.pull(o); if (k < .05) continue;
      const vmax = .08 + .22 * k; if (Math.abs(b.vx) < vmax) b.vx += dx / d * k * .6 * .1; if (o.g.float && Math.abs(b.vy) < vmax) { b.vy += dy / d * k * .6 * .1; b.homeY = b.y; } }
    if (H.marks.length && now - H.marks[0].t > 2.4) H.marks.shift();
    H.ms = performance.now() - t0; };
  // draw: only what exists (selection rings, fading call / home marks, the focus ohm's home dot); nothing when idle
  const sp = {};
  H.draw = (g, W, H2, toScreen, look) => { if (!H.sel.size && !H.marks.length && !H.called.size && !(sim.ohm && sim.ohm.homePos)) return; const cam = sim.cam, now = music.now();
    g.save(); g.lineWidth = 2; const nl = noLine('lnHerd');   // v0.0.30 B9 lnHerd: selection = a soft ring of light in the ohm's hue, call / home marks = soft ripples (off = stroked rings)
    for (const id of H.sel) { const o = byId(id); if (!o) continue; const s = toScreen(W, H2, cam, o.body.x, o.body.y, sp), r = o.g.r * s.s * 1.35 + 4; if (nl) { if (!(look && look.pulse && look.pulse(g, 'soft', s.x, s.y, r + 3, 0, { life: 1, s: 1.6 }) === true)) softRing(g, s.x, s.y, r, 4, `${o.hue || 0},55%,80%`, .5); continue; }   /* B9: look.pulse 'soft' first */ g.strokeStyle = `hsla(${o.hue || 0},70%,80%,.55)`; g.beginPath(); g.arc(s.x, s.y, r, 0, 6.2832); g.stroke(); }
    for (const m of H.marks) { const a = 1 - (now - m.t) / 2.4; if (a <= 0) continue; const s = toScreen(W, H2, cam, m.x, m.y, sp); if (nl) { softRing(g, s.x, s.y, 10 + (1 - a) * 30, 4 + 4 * (1 - a), m.k === 'home' ? '39,100%,80%' : '205,80%,85%', a * .7); continue; } g.strokeStyle = m.k === 'home' ? `rgba(255,220,150,${a * .8})` : `rgba(200,230,255,${a * .7})`;
      g.beginPath(); g.arc(s.x, s.y, 10 + (1 - a) * 30, 0, 6.2832); g.stroke(); }
    const f = sim.ohm; if (f && f.homePos) { const s = toScreen(W, H2, cam, f.homePos.x, f.homePos.y, sp); g.fillStyle = 'rgba(255,220,150,.35)'; g.beginPath(); g.arc(s.x, s.y, 4, 0, 6.2832); g.fill(); }
    g.restore(); };
  return H;
}
