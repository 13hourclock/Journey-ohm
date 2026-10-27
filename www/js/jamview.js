// JAM VIEW (old game v08-jamview, /workspace/softsound/GESTURES.md "v08-jamview gesture check", read only). Wilbow 3:04 AM Oct 26 (via
// Game Dev): "keep old features as he described them, not cut down ... the FULL version, in stages". Switch 'jamView', default OFF =
// v0.0.30 (a pinch on a jam's middle zooms the camera as before; nothing below runs).
// ENTER: pinch OUT deep (the fingers spread to about x2, enterDz of zoom depth) with the midpoint on EMPTY space in a jam's middle: no ohm
//   under it (dive.js takes pinches on an ohm first), within max(midPx, midK x the jam's spread) of the jam's centre, at the home depth
//   band (the dive's band), the river closed. While the pinch builds up over a jam's middle the camera holds (as the dive does).
// INSIDE (fingers hit, in priority order: body > section bead > centre disc > clock band > item knot > phrase mark > ring):
//   RING (each member's arc of the big circle): tap = mute (at once); slide ALONG = volume (.3-1.35); slide IN / OUT = register, one
//     octave per 42 px, whole octaves (-2..+2); hold 450 ms still, then slide = brightness. The first 12 px decide the axis.
//   ITEM KNOT (one per sound item on the ring, inside): slide = that item's mix. It only modulates, never adds or removes items.
//   PHRASE MARK (the member's notes of its last bar, outside its ring): tap = pin the phrase (it then repeats as captured); drag along =
//     shift it in the bar (quarter beats; sixteenths after resting 400 ms first); drop it on another member = trade (a two-way swap).
//   BODY: tap = mute. Drag onto another member's spot = swap roles (who is out front, jamroles.js; else their places in the mix).
//   SECTION BEADS (songs only: the sections still to come): drag along = reorder; flick (> 1.1 px/ms or 70 px off the arc) = drop it.
//   CLOCK BAND: slide round = tempo (a full turn doubles; landing near x2 or x1/2 snaps to it); slide radially = swing.
//   CENTRE DISC: twist on its rim (outer 45 %) = key, one step round the circle of fifths per 30 deg; slide up / down on the inner part
//     (30 px) = mood one step brighter (major) or darker (relative minor).
//   TWO FINGERS ON THE CENTRE (midpoint within 1.3 x the clock radius): pinch in (< .8) = breakdown (all but the front and the lowest
//     drop out for bdBars); spread (> 1.25) = build back (a running breakdown ends; else everyone lifts for buildBars).
//   LEAVE: pinch in (< .6) anywhere else (or V.back(), for a back button). Edits stay with the jam's ohms after you leave.
//   3 / 4-finger taps = undo / redo of the VIEW's own history (gestures.js); outside the view the world history is untouched.
// WAITS FOR THE MUSIC: parts, volume, register, brightness, items, trades, pins and roles land on the next bar; key, mood, tempo,
//   swing, sections and breakdowns on the next phrase line (4 bars). Undoing a change that has not landed cancels it; one that has
//   landed queues its inverse for the same boundary. A mute lands at once (as in the world). The front ohm nods the bar before.
// LOOK: the plainest soft placeholder (no outlines: a dim veil, soft rings and dots). Visuals restyle through look hooks:
//   look.jamView(g, V, st) (return true = drawn, nothing else here), or per piece look.jamViewBack(g, V, st),
// zoom.js asks the jam view BEFORE the dive (the dive's reach covers the gap between touching members); a spread centred on a member's body
// still dives, and inside a dive the dive keeps every pinch.
//   look.jamViewMember(g, m, st), look.jamViewMark(g, mark, st), look.jamViewBead(g, bead, st), look.jamViewDisc(g, V, st),
//   look.jamViewClock(g, V, st) (each true = drawn). st = { t, W, H, L (the layout), q (queued changes) }.
// GESTURES (old table + this engine): see the 'jamView' clash table in SUMMARY.md; pinch zoom away from a jam's middle never reaches
// the entry test, a pinch on an ohm still dives / squeezes, and once inside, gestures.js routes every finger here.
import { cam } from './view.js';
import { toScreen } from './space.js';
import { recipes, octaveOf } from './recipe.js';
import { barsOf } from './songs.js';
import { softRing, softDot } from './soft.js';

export const JV_OPTS = { on: false, enterDz: .5, nearPx: 30, memberK: .9, midPx: 70, midK: .9, zMin: -.6, zMax: .92, gapMs: 350,
  rimK: .34, cyK: .48, bodyR: 22, ringW: 24, axisPx: 12, holdMs: 450, tapMs: 300, tapPx: 10,
  volMin: .3, volMax: 1.35, volPx: 160, octPx: 42, octMin: -2, octMax: 2, brightPx: 120, knotPx: 120,
  shiftQ: .25, shiftFine: .0625, shiftPx: 16, fineMs: 400, flickV: 1.1, flickPx: 70,
  fifthRad: Math.PI / 6, keyRimK: .45, moodPx: 30, swingMax: .66, swingPx: 90, tempoSnap: .06,
  bdIn: .8, bdOut: 1.25, exitIn: .6, centreK: 1.3, twistRad: .6, phraseBars: 4, bdBars: 4, buildBars: 4, buildVol: 1.15, veil: .62 };

export function createJamView({ sim, bus, music, autojam, songs, jamRoles, busy = () => false, look = () => null, size = () => ({ W: 0, H: 0 }), opts = {} }) {
  const O = { ...JV_OPTS, ...opts }, now = () => performance.now(), TQ = { x: 0, y: 0, s: 1 };
  const V = { opts: O, open: false, G: null, acc: 0, zt: 0, mix: new Map(), pins: new Map(), cap: new Map(), q: new Set(), done: [], undone: [], bd: null, build: null,
    fingers: new Map(), pinch: null, stats: { enters: 0, leaves: 0, landed: 0, mutes: 0 }, lastBar: -1 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const mixOf = o => { let m = V.mix.get(o.id); if (!m) V.mix.set(o.id, m = { vol: 1, oct: 0, bright: 0, shift: 0 }); return m; };
  // ---- the jams (the same rule as jamroles.js: awake autojam pairs not in a song group, and song / jam groups of 2+) ----
  V.groups = () => { const out = [], aj = sim.opts && sim.opts.autojam;
    if (autojam) for (const P of autojam.jams || []) { if (aj && P.k < aj.sleepK) continue; if (songs && songs.groupOf && (songs.groupOf(P.a) || songs.groupOf(P.b))) continue; out.push({ key: 'p' + Math.min(P.a.id, P.b.id) + '-' + Math.max(P.a.id, P.b.id), members: [P.a, P.b], P }); }
    if (songs) for (const G of songs.groups || []) if (G.members.length >= 2) out.push({ key: 'g' + G.id, members: G.members, G });
    return out; };
  const scr = (W, H, x, y) => toScreen(W, H, cam.sim || sim.cam, x, y, TQ);
  V.jamAt = (mx, my, W, H) => { const gs = V.groups(), inJam = new Set(); for (const X of gs) for (const m of X.members) inJam.add(m);
    for (const q of sim.ohms || []) { if (q.parked || !q.body) continue; const s = scr(W, H, q.body.x, q.body.y), br = (q.g ? q.g.r : 1) * s.s, r = inJam.has(q) ? br * O.memberK : Math.max(O.nearPx, br * 1.1); if (Math.hypot(mx - s.x, my - s.y) < r) return null; }   // a jam member only blocks its body (two touching ohms still have a middle); any other ohm keeps a margin
    let best = null, bd = 1e9; for (const X of gs) { const ps = X.members.filter(m => m.body).map(m => { const s = scr(W, H, m.body.x, m.body.y); return { x: s.x, y: s.y }; }); if (ps.length < 2) continue;
      const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cy = ps.reduce((a, p) => a + p.y, 0) / ps.length, spread = Math.max(...ps.map(p => Math.hypot(p.x - cx, p.y - cy))), d = Math.hypot(mx - cx, my - cy);
      if (d <= Math.max(O.midPx, O.midK * spread) && d < bd) { bd = d; best = X; } }
    return best; };
  // zoom.js hands each zoom step here after the dive; true = taken (the camera holds)
  V.zoom = (z, mx, my, W, H) => { if (!O.on) { if (V.open) V.leave(); return false; } if (V.open) return true; const t = now(), dz = z - cam.z; if (t - V.zt > O.gapMs) V.acc = 0; V.zt = t;
    if (!(dz > 0) || cam.z < O.zMin || cam.z >= O.zMax || busy()) { V.acc = 0; return false; }
    const X = V.jamAt(mx, my, W, H); if (!X) { V.acc = 0; return false; }
    V.acc += dz; if (V.acc >= O.enterDz) V.enter(X); return true; };
  V.enter = X => { V.open = true; V.G = X; V.acc = 0; V.fingers.clear(); V.pinch = null; V.stats.enters++; V.lastBar = Math.floor(music.beat() / 4); bus.post({ type: 'jamview.enter', key: X.key }); };
  V.leave = () => { if (!V.open) return; const key = V.G && V.G.key; V.open = false; V.fingers.clear(); V.pinch = null; V.stats.leaves++; bus.post({ type: 'jamview.leave', key }); };
  V.forget = id => { V.fingers.delete(id); if (V.fingers.size < 2) V.pinch = null; };
  V.back = () => { if (!V.open) return false; V.leave(); return true; };
  const live = () => { const X = V.G; if (!X) return []; if (X.G) return X.G.members.filter(m => !m.dead); return X.members.filter(m => !m.dead && (sim.ohms || []).includes(m)); };
  // ---- layout (screen) ----
  V.layout = () => { const { W, H } = size(), R = Math.min(W, H) * O.rimK, cx = W / 2, cy = H * O.cyK, ms = live(), n = Math.max(1, ms.length), half = Math.PI / n;
    const mem = ms.map((o, i) => { const a = -Math.PI / 2 + 2 * Math.PI * i / n; return { o, i, a, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
    const L = { W, H, cx, cy, R, half, mem, disc: R * .24, c0: R * .34, c1: R * .48, beadR: R * .68, marks: [], knots: [], beads: [] };
    for (const m of mem) { const cp = V.pins.get(m.o.id), notes = cp ? cp.notes : (V.cap.get(m.o.id) || {}).notes || [], sh = mixOf(m.o).shift;
      notes.forEach((nt, j) => { const a = m.a + (((nt.b + sh) % 4 + 4) % 4 / 4 - .5) * half * 1.6, r = R + O.ringW + 12; L.marks.push({ m, j, nt, a, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); });
      const rec = recipes.get(m.o.recipe), fx = (rec && rec.fx) || []; fx.forEach((it, j) => { if (!it || !it.kind) return; const a = m.a + (j - (fx.length - 1) / 2) * half * .35, r = R - O.ringW - 8; L.knots.push({ m, j, it, a, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); }); }
    const up = upcoming(); up.forEach((s, j) => { const a = -Math.PI * .85 + (j + .5) / up.length * Math.PI * .7; L.beads.push({ j, sec: s, a, x: cx + L.beadR * Math.cos(a), y: cy + L.beadR * Math.sin(a) }); });
    return L; };
  // the song's sections still to come (only a song group playing a plain chart: a grown layout keeps its own form)
  const songPos = () => { const G = V.G && V.G.G; if (!G || !G.song || G.state !== 'song') return null; const L = G.L || barsOf(G.song); if (L.some(B => B.grown)) return null;
    const bi = Math.floor(music.beat() / 4) - G.start; let fi = -1; for (let j = 0; j <= Math.min(bi, L.length - 1); j++) if (L[j].first && L[j].sec !== 'end') fi++; return { G, fi: Math.max(0, fi) }; };
  const upcoming = () => { const p = songPos(); return p ? p.G.song.form.slice(p.fi + 1) : []; };
  // ---- hit test, in the old priority order ----
  V.hitAt = (x, y, L = V.layout()) => { const near = (q, r) => Math.hypot(x - q.x, y - q.y) < r;
    for (const m of L.mem) if (near(m, O.bodyR)) return { k: 'body', m };
    for (const b of L.beads) if (near(b, 16)) return { k: 'bead', b };
    const d = Math.hypot(x - L.cx, y - L.cy), a = Math.atan2(y - L.cy, x - L.cx);
    if (d < L.disc) return { k: 'disc', rim: d > L.disc * (1 - O.keyRimK) };
    if (d >= L.c0 && d <= L.c1) return { k: 'clock' };
    for (const kn of L.knots) if (near(kn, 12)) return { k: 'knot', kn };
    for (const mk of L.marks) if (near(mk, 12)) return { k: 'mark', mk };
    if (Math.abs(d - L.R) < O.ringW + 6) for (const m of L.mem) if (Math.abs(wrapA(a - m.a)) <= L.half) return { k: 'ring', m };
    return null; };
  // ---- changes that wait for the music, with the view's own history ----
  const change = (label, at, apply, revert) => { const e = { label, at, apply, revert, landed: false, pending: null }; V.done.push(e); V.undone.length = 0;
    if (at === 'now') { apply(); e.landed = true; } else { e.pending = 'apply'; V.q.add(e); } return e; };
  V.undo = () => { const e = V.done.pop(); if (!e) return false; V.undone.push(e);
    if (e.pending === 'apply') { e.pending = null; V.q.delete(e); } else if (e.landed) { if (e.at === 'now') { e.revert(); e.landed = false; } else { e.pending = 'revert'; V.q.add(e); } } return true; };
  V.redo = () => { const e = V.undone.pop(); if (!e) return false; V.done.push(e);
    if (e.pending === 'revert') { e.pending = null; V.q.delete(e); } else if (!e.landed) { if (e.at === 'now') { e.apply(); e.landed = true; } else { e.pending = 'apply'; V.q.add(e); } } return true; };
  const land = kind => { for (const e of [...V.q]) if (e.at === kind || (kind === 'phrase' && e.at === 'bar')) { V.q.delete(e); const p = e.pending; e.pending = null; if (p === 'apply') { e.apply(); e.landed = true; } else if (p === 'revert') { e.revert(); e.landed = false; } V.stats.landed++; } };
  V.tick = () => { if (!O.on) return; const bar = Math.floor(music.beat() / 4); if (bar === V.lastBar) return; V.lastBar = bar;
    if (V.bd && bar >= V.bd.until) V.bd = null; if (V.build && bar >= V.build.until) V.build = null;
    land(bar % O.phraseBars === 0 ? 'phrase' : 'bar');
    if (V.q.size && V.open && V.G) bus.post({ type: 'jamview.nod', key: V.G.key });
    for (const [id, P] of V.pins) { const o = (sim.ohms || []).find(q => q.id === id); if (!o || o.dead) continue; const sh = (V.mix.get(id) || {}).shift || 0;   // a pinned phrase plays its captured bar, one bar ahead
      for (const n of P.notes) { const b = (bar + 1) * 4 + ((n.b + sh) % 4 + 4) % 4; bus.note({ src: o, kind: 'note', deg: n.deg, oct: n.oct, vel: n.vel, t: music.timeOfBeat(b), beat: b, auto: 1, jam: 1, _jv: 1 }); } } };
  // ---- the sound side: ohms' own notes (bus.shape chain) and their level / brightness (sim.autoFor chain) ----
  const keepIds = () => V.bd ? V.bd.keep : null;
  const prevShape = bus.shape; bus.shape = ev => { if (prevShape) { ev = prevShape(ev); if (!ev) return null; } if (!O.on || !ev.src) return ev; const id = ev.src.id, isN = ev.kind === 'note';
    if (!ev._jv && isN && ev.beat != null && V.open && V.G && live().includes(ev.src)) { const bar = Math.floor(ev.beat / 4); let c = V.cap.get(id); if (!c || c.bar !== bar) { if (c && c.cur && c.cur.length) c.notes = c.cur; c = { bar, cur: [], notes: c ? c.notes : [] }; V.cap.set(id, c); } if (c.cur.length < 16) c.cur.push({ b: ev.beat - bar * 4, deg: ev.deg, oct: ev.oct || 0, vel: ev.vel == null ? .7 : ev.vel }); }
    if (!ev._jv && isN && V.pins.has(id)) return null;   // pinned: the captured phrase plays instead
    const K = keepIds(); if (K && isN && V.bd.ids.has(id) && !K.has(id)) return null;   // breakdown: out for now
    const m = V.mix.get(id); if (!m || (!m.oct && !m.shift) || (ev.kind !== 'note' && ev.kind !== 'sustain')) return ev;
    const o2 = { ...ev, oct: (ev.oct || 0) + m.oct }; if (m.shift && !ev._jv && ev.beat != null) { o2.beat = ev.beat + m.shift; o2.t = music.timeOfBeat(o2.beat); } return o2; };
  const wrapAuto = () => { const prev = sim.autoFor; if (prev && prev._jv) return; const f = (o, beat) => { const a = prev ? prev(o, beat) : null; if (!O.on || !o) return a; const m = V.mix.get(o.id), bk = V.build && V.build.ids.has(o.id) ? O.buildVol : 1;
      const vol = (m ? m.vol : 1) * bk, cutK = m && m.bright ? Math.pow(2, m.bright * 2) : 1; if (vol === 1 && cutK === 1) return a; return { vol: (a ? a.vol : 1) * vol * vol, cutK: (a ? a.cutK : 1) * cutK }; }; f._jv = 1; f.prev = prev; sim.autoFor = f; };
  wrapAuto(); V.rewrap = wrapAuto;
  // ---- the edits ----
  const setMix = (o, k, v, label) => { const m = mixOf(o), was = m[k]; if (was === v) return null; return change(label, 'bar', () => { mixOf(o)[k] = v; }, () => { mixOf(o)[k] = was; }); };
  V.mute = o => { const was = !!o.muted; V.stats.mutes++; return change('mute', 'now', () => { o.muted = !was; if (!was) bus.note({ src: o, kind: 'release' }); }, () => { o.muted = was; }); };
  V.setVol = (o, v) => setMix(o, 'vol', clamp(v, O.volMin, O.volMax), 'volume');
  V.setOct = (o, v) => setMix(o, 'oct', clamp(Math.round(v), O.octMin, O.octMax), 'register');
  V.setBright = (o, v) => setMix(o, 'bright', clamp(v, -1, 1), 'brightness');
  V.setShift = (o, v) => setMix(o, 'shift', ((v % 4) + 4) % 4, 'shift');
  V.setItem = (o, j, v) => { const rec = recipes.get(o.recipe), it = rec && rec.fx && rec.fx[j]; if (!it) return null; const was = it.ctl.mix, to = clamp(v, 0, 1); if (was === to) return null; const put = x => { it.ctl.mix = x; bus.post({ type: 'set', path: 'recipe.fx.' + j + '.mix', src: o }); };
    return change('item', 'bar', () => put(to), () => put(was)); };
  const capNotes = o => { const c = V.cap.get(o.id); return c ? (c.notes && c.notes.length ? c.notes : c.cur || []).map(n => ({ ...n })) : []; };
  V.pin = o => { const had = V.pins.get(o.id), notes = had ? null : capNotes(o); if (!had && !notes.length) return null;
    return change(had ? 'unpin' : 'pin', 'bar', () => { if (had) V.pins.delete(o.id); else V.pins.set(o.id, { notes }); }, () => { if (had) V.pins.set(o.id, had); else V.pins.delete(o.id); }); };
  V.trade = (a, b) => { if (a === b) return null; const pa = V.pins.get(a.id), pb = V.pins.get(b.id), na = pa ? pa.notes : capNotes(a), nb = pb ? pb.notes : capNotes(b); if (!na.length && !nb.length) return null;
    return change('trade', 'bar', () => { V.pins.set(a.id, { notes: nb.map(n => ({ ...n })) }); V.pins.set(b.id, { notes: na.map(n => ({ ...n })) }); }, () => { if (pa) V.pins.set(a.id, pa); else V.pins.delete(a.id); if (pb) V.pins.set(b.id, pb); else V.pins.delete(b.id); }); };
  V.swapRoles = (a, b) => { if (a === b || !V.G) return null; const s = jamRoles && jamRoles.g && jamRoles.g.get(V.G.key);
    if (s && (s.front === a.id || s.front === b.id)) { const was = s.front, to = was === a.id ? b.id : a.id; return change('roles', 'bar', () => { s.front = to; s.since = V.lastBar; }, () => { s.front = was; }); }
    const ma = { ...mixOf(a) }, mb = { ...mixOf(b) }, pick = m => ({ vol: m.vol, oct: m.oct, bright: m.bright });   // neither out front: they trade places in the mix (level, register, brightness)
    return change('roles', 'bar', () => { Object.assign(mixOf(a), pick(mb)); Object.assign(mixOf(b), pick(ma)); }, () => { Object.assign(mixOf(a), pick(ma)); Object.assign(mixOf(b), pick(mb)); }); };
  V.setKey = steps => { if (!steps) return null; const was = music.key, to = (((was + 7 * steps) % 12) + 12) % 12; return change('key', 'phrase', () => music.setKey(to), () => music.setKey(was)); };
  V.setMood = dir => { const was = music.mode, how = music.modeHow, to = dir > 0 ? 'major' : 'minor'; if (was === to) return null; return change('mood', 'phrase', () => music.setMode(to, 'rel'), () => music.setMode(was, how || 'rel')); };
  V.setTempo = k => { if (!(k > 0) || Math.abs(Math.log2(k)) < .01) return null; const lock = music.lock, b0 = music.bpm, t0 = music.tempoK || 1;
    return change('tempo', 'phrase', () => { if (lock) music.setTempoK(t0 * k); else music.setBpm(b0 * k); }, () => { if (lock) music.setTempoK(t0); else music.setBpm(b0); }); };
  V.setSwing = v => { const was = music.swing || 0, to = clamp(v, 0, O.swingMax); if (Math.abs(was - to) < .01) return null; return change('swing', 'phrase', () => { music.swing = to; }, () => { music.swing = was; }); };
  V.setForm = up2 => { const p = songPos(); if (!p) return null; const G = p.G, s0 = G.song, f0 = s0.form, f1 = f0.slice(0, p.fi + 1).concat(up2); if (f1.join() === f0.join()) return null;
    const put = f => { const q = songPos(); if (!q || q.G !== G) return; G.song = { ...G.song, form: f.slice() }; G.L = barsOf(G.song); G.cache = null; };
    return change('sections', 'phrase', () => put(f1), () => put(f0)); };
  V.breakdown = () => { const ms = live(); if (ms.length < 2 || V.bd) return null; const s = jamRoles && jamRoles.g && V.G && jamRoles.g.get(V.G.key), front = s && s.front != null ? s.front : ms[0].id;
    const low = ms.slice().sort((a, b) => (octaveOf(recipes.get(a.recipe) || {}) || 0) - (octaveOf(recipes.get(b.recipe) || {}) || 0) || (a.seed || 0) - (b.seed || 0))[0];
    const keep = new Set([front, low.id]), ids = new Set(ms.map(m => m.id)); return change('breakdown', 'phrase', () => { V.bd = { keep, ids, until: V.lastBar + O.bdBars }; V.build = null; }, () => { V.bd = null; }); };
  V.buildUp = () => { const ms = live(); if (!ms.length) return null; if (V.bd) { const was = V.bd; return change('build', 'phrase', () => { V.bd = null; }, () => { V.bd = was; }); }
    const ids = new Set(ms.map(m => m.id)); return change('build', 'phrase', () => { V.build = { ids, until: V.lastBar + O.buildBars }; }, () => { V.build = null; }); };
  // ---- fingers (gestures.js routes every canvas touch here while the view is open) ----
  V.down = (e, p) => { const id = e.pointerId, L = V.layout(); V.fingers.set(id, p);
    if (V.fingers.size === 2) { for (const q of V.fingers.values()) if (q.jv) { q.jv.cancel = true; clearTimeout(q.jv.hold); }
      const [a, b] = [...V.fingers.values()], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; V.pinch = { d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), a0: Math.atan2(b.y - a.y, b.x - a.x), centre: Math.hypot(mx - L.cx, my - L.cy) < O.centreK * L.c1, twisted: false, r: 1 }; p.jv = { cancel: true }; return; }
    if (V.fingers.size > 2) { V.pinch = null; p.jv = { cancel: true }; for (const q of V.fingers.values()) if (q.jv) q.jv.cancel = true; return; }
    const h = V.hitAt(p.x0, p.y0, L), J = p.jv = { h, L, axis: null, mode: null, t0: now(), rest: false };
    if (h && h.k === 'ring') J.hold = setTimeout(() => { if (!J.cancel && Math.hypot(p.x - p.x0, p.y - p.y0) < O.axisPx) J.mode = 'bright'; }, O.holdMs);
    if (h && h.k === 'mark') J.fineT = setTimeout(() => { if (Math.hypot(p.x - p.x0, p.y - p.y0) < 6) J.rest = true; }, O.fineMs); };
  const polar = (L, x, y) => ({ d: Math.hypot(x - L.cx, y - L.cy), a: Math.atan2(y - L.cy, x - L.cx) });
  V.move = (e, p) => { const T = V.pinch; if (T && V.fingers.size === 2) { const [a, b] = [...V.fingers.values()]; T.r = Math.hypot(a.x - b.x, a.y - b.y) / T.d0; if (Math.abs(wrapA(Math.atan2(b.y - a.y, b.x - a.x) - T.a0)) > O.twistRad) T.twisted = true; return; }
    const J = p.jv; if (!J || J.cancel || !J.h) return; const L = J.L, P0 = polar(L, p.x0, p.y0), P1 = polar(L, p.x, p.y);
    J.da = wrapA(P1.a - P0.a); J.dr = P1.d - P0.d; J.along = J.da * P0.d;   // px along the circle and radially
    if (!J.axis && Math.hypot(p.x - p.x0, p.y - p.y0) >= O.axisPx) { clearTimeout(J.hold); J.axis = Math.abs(J.along) >= Math.abs(J.dr) ? 'along' : 'radial'; }
    if (J.h.k === 'disc' && J.h.rim) { J.turn = (J.turn || 0) + wrapA(P1.a - (J.lastA == null ? P0.a : J.lastA)); J.lastA = P1.a; }
    if (J.h.k === 'clock') { J.turn = (J.turn || 0) + wrapA(P1.a - (J.lastA == null ? P0.a : J.lastA)); J.lastA = P1.a; }
    const n = p.pts.length; if (n > 2) { const q = p.pts[Math.max(0, n - 4)], r = p.pts[n - 1], dt = Math.max(1, r[2] - q[2]); J.v = Math.hypot(r[0] - q[0], r[1] - q[1]) / dt; } };
  const memberAt = (L, x, y) => { for (const m of L.mem) if (Math.hypot(x - m.x, y - m.y) < O.bodyR * 1.6) return m; return null; };
  V.up = (e, p, cancel) => { const id = e.pointerId; V.fingers.delete(id); const T = V.pinch;
    if (T) { if (V.fingers.size < 2) { V.pinch = null; if (!cancel && !T.twisted) { if (T.centre) { if (T.r < O.bdIn) V.breakdown(); else if (T.r > O.bdOut) V.buildUp(); } else if (T.r < O.exitIn) V.leave(); } for (const q of V.fingers.values()) q.jv = { cancel: true }; } return null; }
    const J = p.jv; if (!J) return null; clearTimeout(J.hold); clearTimeout(J.fineT); if (J.cancel || cancel || !J.h) return null;
    const h = J.h, L = J.L, moved = Math.hypot(p.x - p.x0, p.y - p.y0), tap = moved < O.tapPx && now() - J.t0 < O.tapMs, o = h.m ? h.m.o : null;
    if (h.k === 'body') { if (moved < O.tapPx) return V.mute(o) && 'mute'; const t = memberAt(L, p.x, p.y); return t && t.o !== o && V.swapRoles(o, t.o) ? 'roles' : null; }
    if (h.k === 'ring') { if (tap) return V.mute(o) && 'mute'; if (J.mode === 'bright') return V.setBright(o, mixOf(o).bright + (J.along || 0) / O.brightPx) && 'bright';
      if (J.axis === 'along') return V.setVol(o, mixOf(o).vol + J.along / O.volPx) && 'vol'; if (J.axis === 'radial') return V.setOct(o, mixOf(o).oct + Math.round(J.dr / O.octPx)) && 'oct'; return null; }
    if (h.k === 'knot') { const it = h.kn.it; return J.axis ? V.setItem(h.kn.m.o, h.kn.j, it.ctl.mix + (J.along || 0) / O.knotPx) && 'item' : null; }
    if (h.k === 'mark') { const mo = h.mk.m.o; if (tap) return V.pin(mo) && 'pin'; const t = memberAt(L, p.x, p.y); if (t && t.o !== mo) return V.trade(mo, t.o) && 'trade';
      const st = J.rest ? O.shiftFine : O.shiftQ, ds = Math.round((J.along || 0) / O.shiftPx) * st; return ds ? V.setShift(mo, mixOf(mo).shift + ds) && 'shift' : null; }
    if (h.k === 'bead') { const up = upcoming(), j = h.b.j, P1 = polar(L, p.x, p.y); if (!up.length) return null;
      if ((J.v || 0) > O.flickV || Math.abs(P1.d - L.beadR) > O.flickPx) { const u2 = up.slice(); u2.splice(j, 1); return V.setForm(u2) && 'drop'; }
      let k = 0, bd = 1e9; L.beads.forEach((b, i) => { const d = Math.abs(wrapA(P1.a - b.a)); if (d < bd) { bd = d; k = i; } }); if (k === j) return null; const u2 = up.slice(), [s] = u2.splice(j, 1); u2.splice(k, 0, s); return V.setForm(u2) && 'reorder'; }
    if (h.k === 'clock') { if (J.axis === 'radial') return V.setSwing((music.swing || 0) + J.dr / O.swingPx) && 'swing';
      if (J.axis === 'along') { let k = Math.pow(2, (J.turn || 0) / (2 * Math.PI)); const l = Math.log2(k); if (Math.abs(l - 1) < O.tempoSnap) k = 2; else if (Math.abs(l + 1) < O.tempoSnap) k = .5; return V.setTempo(k) && 'tempo'; } return null; }
    if (h.k === 'disc') { if (h.rim) { const st = Math.round((J.turn || 0) / O.fifthRad); return st ? V.setKey(st) && 'key' : null; } const st = Math.round(-(p.y - p.y0) / O.moodPx); return st ? V.setMood(st) && 'mood' : null; }
    return null; };
  // ---- the plainest soft look (no outlines); look hooks restyle any piece ----
  V.draw = g => { if (!O.on || !V.open) return; const lk = look() || {}, L = V.layout(), t = now() / 1000, st = { t, W: L.W, H: L.H, L, q: V.q.size };
    if (lk.jamView && lk.jamView(g, V, st) === true) return;
    if (!(lk.jamViewBack && lk.jamViewBack(g, V, st) === true)) { const fs = g.fillStyle; g.fillStyle = `rgba(6,8,14,${O.veil})`; g.fillRect(0, 0, L.W, L.H); g.fillStyle = fs; softRing(g, L.cx, L.cy, L.R, O.ringW, '210,30%,80%', .10); }
    if (!(lk.jamViewClock && lk.jamViewClock(g, V, st) === true)) { const bt = music.beat(), ph = (bt / (4 * O.phraseBars)) % 1; softRing(g, L.cx, L.cy, (L.c0 + L.c1) / 2, (L.c1 - L.c0) / 2, '45,40%,80%', .08 + .04 * (music.swing || 0));
      for (let i = 0; i < O.phraseBars; i++) { const a = -Math.PI / 2 + i / O.phraseBars * 2 * Math.PI, r = (L.c0 + L.c1) / 2; softDot(g, L.cx + r * Math.cos(a), L.cy + r * Math.sin(a), 7, '45,60%,85%', .35); if (V.q.size) softRing(g, L.cx + r * Math.cos(a), L.cy + r * Math.sin(a), 11, 3, '45,70%,80%', .3); }
      const a = -Math.PI / 2 + ph * 2 * Math.PI, r = (L.c0 + L.c1) / 2; softDot(g, L.cx + r * Math.cos(a), L.cy + r * Math.sin(a), 9, '45,80%,92%', .7); }
    if (!(lk.jamViewDisc && lk.jamViewDisc(g, V, st) === true)) { softDot(g, L.cx, L.cy, L.disc, (music.mode === 'minor' ? '230,35%,55%' : '40,45%,70%'), .45); const a = -Math.PI / 2 + (music.key * 7 % 12) / 12 * 2 * Math.PI; softDot(g, L.cx + L.disc * .8 * Math.cos(a), L.cy + L.disc * .8 * Math.sin(a), 6, '0,0%,100%', .7); }
    for (const b of L.beads) if (!(lk.jamViewBead && lk.jamViewBead(g, b, st) === true)) softDot(g, b.x, b.y, 12, b.sec === 'B' ? '190,50%,70%' : b.sec === 'C' ? '300,40%,70%' : '50,50%,75%', .6);
    const s = V.G && jamRoles && jamRoles.g && jamRoles.g.get(V.G.key), nod = V.q.size ? Math.sin(t * 9) * 3 : 0;
    for (const m of L.mem) { const o = m.o, mx = V.mix.get(o.id) || { vol: 1, oct: 0, bright: 0 }, hue = Math.round(o.hue || 0), front = s && s.front === o.id, MS = { ...st, front, mute: !!o.muted, mix: mx, pinned: V.pins.has(o.id) };
      if (lk.jamViewMember && lk.jamViewMember(g, m, MS) === true) continue;
      const a0 = o.muted ? .12 : .25 + .2 * (mx.vol - .3); softRing(g, m.x, m.y, O.ringW * (1 + .15 * mx.oct), 6, `${hue},55%,${60 + 15 * mx.bright}%`, a0);
      softDot(g, m.x, m.y + (front ? nod : 0), O.bodyR, `${hue},60%,${o.muted ? 35 : 65}%`, o.muted ? .35 : .9); if (V.pins.has(o.id)) softRing(g, m.x, m.y, O.bodyR + 6, 2, '0,0%,100%', .45); }
    for (const kn of L.knots) softDot(g, kn.x, kn.y, 5 + 5 * kn.it.ctl.mix, '170,40%,75%', .55);
    for (const mk of L.marks) if (!(lk.jamViewMark && lk.jamViewMark(g, mk, st) === true)) softDot(g, mk.x, mk.y, 4 + 5 * (mk.nt.vel || .6), `${Math.round(mk.m.o.hue || 0)},50%,80%`, V.pins.has(mk.m.o.id) ? .9 : .55); };
  V.info = () => `${V.open ? 'open (' + (V.G && V.G.key) + ')' : 'closed'} | enters ${V.stats.enters}, landed ${V.stats.landed}, queued ${V.q.size}, history ${V.done.length}/${V.undone.length}, pins ${V.pins.size}`;
  return V;
}
