// SYSTEMS: THE RIVER (organic DAW) + BRAIN VIEW (audit B2; Wilbow 7:39 / 7:41 PM, 8:44-8:45 PM Oct 24; ported in spirit from the old
// game's daw.js / dawpaint.js / dawbrain.js, rebuilt on this engine). Open with a two-finger TWIST on bare ground; pinch closed or
// twist back to close. "Slightly hidden": nothing on screen until you twist. The music near you flows right to left past a soft
// now-line; each lane is one ohm (your ohm, your partner, the song group nearest you, the nearest jams).
// BRAIN VIEW (the six approved items):
//   1 live notes (beads = what it actually played, a wipe of the last span)   2 the chord it follows (glow under the lane) + the scale
//   (a faint dot lattice)   3 the rhythm cycle (beat ticks on the lane's top edge, bar lines longer)   4 where each note came from (ring
//   colour: song hook gold, song part amber, drift red, jam green, partner violet, your touch white, painted leaf green)   5 which sound
//   played it (bead fill = the ohm's colour; a learned / fused sound would show its source colour)   6 drum hits (strikes / drum-type
//   ohms: thin ticks in a hit row under the lane). A lane in a song also shows the song's sections ahead (the hook bars brighter).
// PAINTING ("paint notes ... they dictate whatever is sung and introduced to the jam"; "instead of a grid make the notes more organic"):
//   a finger drawn along a lane = a freehand ribbon; it becomes notes - time keeps the stroke's own feel with a soft pull to the beat
//   (PULL .5), pitch settles onto the scale, a slope between tones = a glide, a wobble = vibrato, slow / firm = louder - looping in the
//   smallest of 1 / 2 / 4 / 8 bars that holds it, from the next bar. The painted ohm plays it and its jam partner hears it as its phrase
//   (autojam memory). Painting an ohm that is in a SONG edits its part in that section of the song (kept in the library).
//   Rub back and forth across a ribbon = erase. Touch a painted bead and drag = move that note; rest on it 220 ms then drag = paint over.
//   Hold the lane's left edge = mute / unmute that ohm. Two fingers spread / pinch = time zoom (1..16 bars); pinch fully closed = close.
//   Every paint / erase / move / mute goes on the undo stack (3-finger tap / 4-finger tap).
// AUTOMATION (Q357 'd', Wilbow 4:01 PM Oct 25: draw volume or filter over time, in the lane's own rhythm cycle): put a finger on a
//   lane's LEFT EDGE (its colour dot) and DRAG OUT into the lane: the line you draw is a level over time - high in the lane = full,
//   low = quiet / dark. Starting from the UPPER half of the edge draws BRIGHTNESS (the filter, cyan line); from the LOWER half draws
//   LOUDNESS (white line). It loops in the lane's own cycle: a painted ribbon's loop length if it has one, else the smallest of
//   1 / 2 / 4 / 8 bars that holds the line, from the next bar. Draw a flat line along the top to clear it; undo / redo as usual.
//   The left edge held STILL 600 ms is still mute (a drag there used to do nothing, so nothing is taken away). Each note takes the
//   level at its start (a long held note does not ride the curve). Switch opts.daw.auto (ON).
// BOUNCE (Q358 'a', 4:01 PM): HOLD STILL 0.9 s on the empty strip BELOW the lanes = render the whole song in the river to an audio
//   file and open the share sheet (bounce.js). A ring fills while you hold; moving > 12 px or a second finger cancels it. That strip
//   had no touch before. Switch opts.daw.bounce (ON).
import { recipes, octaveOf } from './recipe.js';
import { isRub } from './stroke.js';
import { reasonOf } from './helper.js';
export const DAW_OPTS = { on: true, auto: true, autoPx: 14, bounce: true, PULL: .5, lanes: 6, span: 2, ring: 64, restMs: 220, muteMs: 600 };
const COL = { you: '#ffffff', river: '#96ff78', 'song.hook': '#ffd36e', 'song.part': '#e8b65a', 'song.drift': '#ff7a6a', jam: '#9fe0a0', partner: '#c8a0ff', singback: '#c8a0ff', other: '#777' };
// stroke -> notes (pure; tested headless). pts = [[x, y, t, pressure]] in lane space: x = beats from the loop start, y = degree (float)
export function strokeToNotes(pts, pull = DAW_OPTS.PULL) { if (!pts.length) return { notes: [], bars: 1 }; const notes = []; let cur = null;
  for (let i = 0; i < pts.length; i++) { const [b, d, t, pr] = pts[i], deg = Math.round(d);
    if (!cur || deg !== cur.d) { if (cur) { cur.len = Math.max(.125, b - cur.b0); notes.push(cur); } cur = { b0: b, d: deg, pts: [], vel: 0, n: 0, t0: t }; }
    cur.pts.push([b, d]); const sp = i ? Math.hypot(b - pts[i - 1][0], d - pts[i - 1][1]) / Math.max(1, t - pts[i - 1][2]) * 1000 : 0; cur.vel += Math.max(.35, Math.min(1, .95 - sp * .04 + (pr ? (pr - .5) * .3 : 0))); cur.n++; }
  if (cur) { cur.len = Math.max(.25, pts[pts.length - 1][0] - cur.b0); notes.push(cur); }
  const out = []; for (let i = 0; i < notes.length; i++) { const n = notes[i], qb = Math.round(n.b0 * 2) / 2, b = n.b0 + (qb - n.b0) * pull;
    if (n.len < .12 && out.length) { out[out.length - 1].glide = (out[out.length - 1].glide || 0) + (n.d - out[out.length - 1].d); continue; }   // a quick pass through a tone = part of a glide
    let wob = 0; for (let j = 2; j < n.pts.length; j++) { const a = n.pts[j - 2][1] - n.pts[j - 1][1], c = n.pts[j - 1][1] - n.pts[j][1]; if (a * c < 0 && Math.abs(a) + Math.abs(c) > .25) wob++; }
    const nx = notes[i + 1], slope = nx && Math.abs(nx.d - n.d) <= 2 && nx.b0 - (n.b0 + n.len) < .1 && n.pts.length > 2 && Math.abs(n.pts[n.pts.length - 1][1] - n.d) > .3;
    out.push({ b: Math.max(0, b), d: n.d, len: n.len, vel: n.vel / n.n, glide: slope ? nx.d - n.d : 0, vib: wob >= 2 ? 1 : 0 }); }
  const end = Math.max(...out.map(n => n.b + n.len), .01), bars = [1, 2, 4, 8].find(k => k * 4 >= end - 1e-6) || 8; for (const n of out) n.b = n.b % (bars * 4); return { notes: out, bars }; }
export function createDaw(sim, bus, music, sys, opts = {}) { const O = { ...DAW_OPTS, ...opts }, D = { opts: O, auto: new Map(), open: false, span: O.span, paint: new Map(), rings: new Map(), lanes: [], touch: new Map(), stats: { strokes: 0, erased: 0, moved: 0, notes: 0 } };
  const ringOf = o => { let r = D.rings.get(o.id); if (!r) D.rings.set(o.id, r = []); return r; };
  bus.on('note', ev => { const o = ev.src; if (!o || o.scale !== 'ohm' || ev.kind === 'release' || ev.kind === 'damp') return; const r = ringOf(o); r.push({ b: ev.beat != null ? ev.beat : music.beat(), d: ev.deg, hit: ev.deg == null || ev.kind === 'strike', why: reasonOf(ev), vel: ev.vel || .6 }); if (r.length > O.ring) r.shift(); });
  // ---- dictation: painted ohms play their ribbon from its first bar; the jam hears it as the phrase (autojam memory)
  sim.dictated = (o, bar) => { if (!o) return null; const P = D.paint.get(o.id); if (!P || !O.on) return null; if (bar == null) bar = Math.floor(music.beat() / 4); if (bar < P.from) return null; const k = (bar - P.from) % P.bars;
    const ns = P.notes.filter(n => n.b >= k * 4 && n.b < k * 4 + 4); return ns.length ? ns.map(n => n.d) : [P.notes[0].d]; };
  let lastBar = -1; D.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar === lastBar) return; lastBar = bar; const nb = bar + 1;
    for (const [id, P] of D.paint) { const o = sim.byId.get(id); if (!o || nb < P.from || o.dead) continue; const k = (nb - P.from) % P.bars, rec = recipes.get(o.recipe); if (!rec) continue; const oc = octaveOf(rec), tr = [];
      for (const n of P.notes) { if (n.b < k * 4 || n.b >= k * 4 + 4) continue; const b = nb * 4 + n.b - k * 4; bus.note({ src: o, kind: 'note', deg: n.d, oct: oc, vel: n.vel, t: music.timeOfBeat(b), beat: b, dur: n.len * music.spb(), paint: 1, auto: 1 });
        const u = n.b - k * 4; if (n.glide) { tr.push([u, 0], [u + n.len * .5, 0], [u + n.len * .95, n.glide * 100]); } else if (n.vib) { for (let j = 0; j < n.len * 4; j++) tr.push([u + j / 4, j % 2 ? 30 : -30]); tr.push([u + n.len, 0]); } else tr.push([u, 0]); D.stats.notes++; }
      if (tr.length > 1 && sim.jam && sim.jam.bends) sim.jam.bends.set(o.id, { t0: nb * 4, len: 4, tr, k: 1 }); } };
  // ---- lanes: your ohm, your partner, the nearest song group, the nearest jams
  const pickLanes = () => { const out = [], add = o => { if (o && !out.includes(o) && !o.dead && out.length < O.lanes) out.push(o); }; add(sim.ohm); if (sim.jam && sim.jam.partner && sim.jam.until > music.beat()) add(sim.jam.partner);
    const f = sim.ohm ? sim.ohm.body : { x: 0, y: 0 }, d = o => Math.hypot(o.body.x - f.x, o.body.y - f.y), S = sys.songs;
    if (S) { const G = S.groups.filter(G => G.state === 'song').sort((a, b) => Math.min(...a.members.map(d)) - Math.min(...b.members.map(d)))[0]; if (G) G.members.forEach(add); }
    for (const P of ((sys.autojam && sys.autojam.jams) || []).slice().sort((a, b) => b.k - a.k)) { add(P.a); add(P.b); }
    for (const id of D.paint.keys()) add(sim.byId.get(id)); return out; };
  D.show = (on, x, y) => { D.open = !!on && O.on; if (D.open) { D.lanes = pickLanes(); D.openT = performance.now(); } else D.touch.clear(); bus.post({ type: 'daw', open: D.open }); };
  // ---- geometry: the river flows right -> left; the now line sits at 32 % of the width; lanes wave gently (organic, no grid)
  const geo = () => { const Wd = innerWidth, Hd = innerHeight, n = Math.max(1, D.lanes.length), top = Hd * .12, lh = Hd * .76 / n; return { Wd, Hd, n, top, lh, nowX: Wd * .32, bw: Wd * .62 / (D.span * 4) }; };
  const wave = (i, x, t) => Math.sin(x * .006 + t * .0007 + i * 1.7) * 5;
  const laneAt = y => { const g = geo(); const i = Math.floor((y - g.top) / g.lh); return i >= 0 && i < D.lanes.length ? i : -1; };
  const toLane = (i, x, y) => { const g = geo(), mid = g.top + (i + .5) * g.lh, d = 7 - (y - mid) / (g.lh / 15); return { b: music.beat() + (x - g.nowX) / g.bw, d: Math.max(-7, Math.min(21, d)) }; };
  const beadXY = (i, b, d) => { const g = geo(), x = g.nowX + (b - music.beat()) * g.bw, mid = g.top + (i + .5) * g.lh; return { x, y: mid - (d - 7) * (g.lh / 15) + wave(i, x, performance.now()) }; };
  const paintedAt = (i, x, y) => { const o = D.lanes[i], P = o && D.paint.get(o.id); if (!P) return null; const bt = music.beat(); for (const n of P.notes) for (let rep = -1; rep <= 2; rep++) { const cyc = Math.floor((bt / 4 - P.from) / P.bars) + rep, b = (P.from + cyc * P.bars) * 4 + n.b, q = beadXY(i, b, n.d); if (Math.hypot(q.x - x, q.y - y) < 18) return { P, n, o }; } return null; };
  // ---- touches (from gestures.js while open)
  D.down = (e, p) => { const g = geo(), i = laneAt(p.y0); p.lane = i; p.lp = [];
    if (D.touch.size === 1) { const [q] = D.touch.values(); D.two = { a: q, b: p, d0: Math.max(20, Math.hypot(q.x - p.x0, q.y - p.y0)), span0: D.span, a0: Math.atan2(p.y0 - q.y, p.x0 - q.x) }; if (q.mode === 'paint') q.mode = null; if (q.mode === 'bounce') { clearTimeout(q.holdT); q.mode = null; } }
    D.touch.set(e.pointerId, p); if (D.two) return;
    if (i < 0 && p.y0 > g.top + g.n * g.lh && O.bounce && sys.bounce && sys.bounce.opts.on) { p.mode = 'bounce'; p.holdT0 = performance.now(); p.holdT = setTimeout(() => { if (p.mode !== 'bounce' || Math.hypot(p.x - p.x0, p.y - p.y0) > 12) return; p.mode = 'done'; bus.post({ type: 'daw.bounce' }); sys.bounce.run(); }, sys.bounce.opts.holdMs); return; }   // Q358
    if (i < 0) return;
    if (p.x0 < 44) { p.mode = 'label'; p.side = p.y0 < g.top + (i + .5) * g.lh ? 'bright' : 'vol'; p.muteT = setTimeout(() => { const o = D.lanes[i]; if (!o) return; const was = !!o.muted; o.muted = !was; if (!was) bus.note({ src: o, kind: 'release' }); push({ label: 'mute', undo: () => { o.muted = was; }, redo: () => { o.muted = !was; } }); p.mode = 'done'; }, O.muteMs); return; }
    const hit = paintedAt(i, p.x0, p.y0); if (hit) { p.mode = 'bead'; p.hit = hit; p.b0 = hit.n.b; p.d0 = hit.n.d; p.restT = setTimeout(() => { if (Math.hypot(p.x - p.x0, p.y - p.y0) < 8) p.mode = 'paint'; }, O.restMs); return; }
    p.mode = 'paint'; };
  D.move = (e, p) => { const T = D.two; if (T && (T.a === p || T.b === p)) { const r = Math.hypot(T.a.x - T.b.x, T.a.y - T.b.y) / T.d0; D.span = Math.max(1, Math.min(16, T.span0 / r)); let da = Math.atan2(T.b.y - T.a.y, T.b.x - T.a.x) - T.a0; da = Math.atan2(Math.sin(da), Math.cos(da)); T.r = r; T.da = da; return; }
    if (p.mode === 'bead' && Math.hypot(p.x - p.x0, p.y - p.y0) > 8) { clearTimeout(p.restT); const g = geo(), n = p.hit.n; n.b = Math.max(0, Math.min(p.hit.P.bars * 4 - .01, p.b0 + (p.x - p.x0) / g.bw)); n.d = Math.round(p.d0 - (p.y - p.y0) / (g.lh / 15)); p.moved = true; }
    if (p.mode === 'paint' && p.lane >= 0) { const L = toLane(p.lane, p.x, p.y); p.lp.push([L.b, L.d, e.timeStamp, e.pressure || .5]); }
    if (p.mode === 'bounce' && Math.hypot(p.x - p.x0, p.y - p.y0) > 12) { clearTimeout(p.holdT); p.mode = null; }
    if (p.mode === 'label' && Math.hypot(p.x - p.x0, p.y - p.y0) > 14) { clearTimeout(p.muteT); if (O.auto && p.lane >= 0 && Math.hypot(p.x - p.x0, p.y - p.y0) > O.autoPx) { p.mode = 'auto'; p.ap = []; } }
    if (p.mode === 'auto' && p.x >= 44) p.ap.push(levelAt(p.lane, p.x, p.y)); };   // the line starts once the finger leaves the edge
  D.up = (e, p) => { D.touch.delete(e.pointerId); clearTimeout(p.muteT); clearTimeout(p.restT); clearTimeout(p.holdT); const T = D.two;
    if (T && (T.a === p || T.b === p)) { D.two = null; if (T.r != null && T.r < .45 || T.da != null && Math.abs(T.da) > 1.3) D.show(false); return; }
    if (p.mode === 'auto') { const o = D.lanes[p.lane]; if (o && p.ap && p.ap.length >= 2) setAuto(o, p.side, p.ap); return; }
    if (p.mode === 'bead' && p.moved) { const n = p.hit.n, b1 = n.b, d1 = n.d, b0 = p.b0, d0 = p.d0; D.stats.moved++; push({ label: 'move note', undo: () => { n.b = b0; n.d = d0; }, redo: () => { n.b = b1; n.d = d1; } }); return; }
    if (p.mode !== 'paint' || p.lane < 0 || !p.lp || p.lp.length < 2) return; const o = D.lanes[p.lane]; if (!o) return;
    if (isRub(p.pts, performance.now() - p.t0)) { erase(o); return; }
    paint(o, p.lp); };
  const push = a => { if (sys.undo) sys.undo.push(a); };
  const erase = o => { const S = sys.songs, G = S && S.groupOf(o); if (G && G.state === 'song' && G.song.parts && G.song.parts[o.seed]) { const s = G.song, old = s.parts[o.seed]; delete s.parts[o.seed]; G.cache = null; push({ label: 'erase part', undo: () => { s.parts[o.seed] = old; G.cache = null; }, redo: () => { delete s.parts[o.seed]; G.cache = null; } }); D.stats.erased++; return; }
    const old = D.paint.get(o.id); if (!old) return; D.paint.delete(o.id); D.stats.erased++; push({ label: 'erase', undo: () => D.paint.set(o.id, old), redo: () => D.paint.delete(o.id) }); };
  // paint: absolute beats -> a loop starting at the bar the stroke begins in (dictating from the next bar), or a song part edit
  const paint = (o, lp) => { const bt = music.beat(), b0 = Math.floor(Math.min(...lp.map(q => q[0])) / 4) * 4, rel = lp.map(([b, d, t, pr]) => [b - b0, d, t, pr]), { notes, bars } = strokeToNotes(rel, O.PULL); if (!notes.length) return; D.stats.strokes++;
    const S = sys.songs, G = S && S.groupOf(o);
    if (G && G.state === 'song') { const s = G.song, L = G.L, bi = Math.floor(b0 / 4) - G.start, B = L && L[Math.max(0, Math.min(L.length - 1, bi))]; if (B && B.sec !== 'end' && B.grown) { const gp = G.gparts = G.gparts || {}, old = gp[o.seed] ? JSON.parse(JSON.stringify(gp[o.seed])) : null;   // v0.0.29 fix: a grown section (A' / D / D', jamgrow.js) is not in the library song: the edit stays with this play
      const sec = (gp[o.seed] = gp[o.seed] || {})[B.sec] = (gp[o.seed][B.sec] || []).filter(n => n.b < B.i * 4 || n.b >= (B.i + bars) * 4); for (const n of notes) sec.push({ ...n, b: n.b + B.i * 4 }); G.cache = null; G.settled = 0; D.stats.grownEdits = (D.stats.grownEdits || 0) + 1;
      const now = JSON.parse(JSON.stringify(gp[o.seed])); push({ label: 'edit grown part', undo: () => { if (G.gparts !== gp) return; if (old) gp[o.seed] = old; else delete gp[o.seed]; G.cache = null; }, redo: () => { if (G.gparts !== gp) return; gp[o.seed] = JSON.parse(JSON.stringify(now)); G.cache = null; } }); bus.post({ type: 'daw.part', src: o, song: s, sec: B.sec, grown: 1 }); return; }
      if (B && B.sec !== 'end') { s.parts = s.parts || {}; const old = s.parts[o.seed] ? JSON.parse(JSON.stringify(s.parts[o.seed])) : null;
      const sec = (s.parts[o.seed] = s.parts[o.seed] || {})[B.sec] = (s.parts[o.seed][B.sec] || []).filter(n => n.b < B.i * 4 || n.b >= (B.i + bars) * 4); for (const n of notes) sec.push({ ...n, b: n.b + B.i * 4 }); G.cache = null; G.settled = 0;
      const now = JSON.parse(JSON.stringify(s.parts[o.seed])); push({ label: 'edit song part', undo: () => { if (old) s.parts[o.seed] = old; else delete s.parts[o.seed]; G.cache = null; }, redo: () => { s.parts[o.seed] = JSON.parse(JSON.stringify(now)); G.cache = null; } }); bus.post({ type: 'daw.part', src: o, song: s, sec: B.sec }); return; } }
    const old = D.paint.get(o.id), from = Math.max(Math.floor(bt / 4) + 1, b0 / 4), P = { notes, bars, from: from - ((from - b0 / 4) % bars + bars) % bars };   // keep the stroke's bar phase in the loop
    if (P.from + P.bars <= Math.floor(bt / 4) + 1) P.from = Math.floor(bt / 4) + 1;
    D.paint.set(o.id, P); bus.post({ type: 'daw.paint', src: o, notes: notes.length, bars }); push({ label: 'paint', undo: () => { if (old) D.paint.set(o.id, old); else D.paint.delete(o.id); }, redo: () => D.paint.set(o.id, P) }); };
  D.cancel = id => { const p = D.touch.get(id); if (p) { clearTimeout(p.muteT); clearTimeout(p.restT); clearTimeout(p.holdT); p.mode = null; } D.touch.delete(id); D.two = null; };
  // ---- automation (Q357): a drawn level curve per lane, looping in the lane's cycle
  const levelAt = (i, x, y) => { const g = geo(), y0 = g.top + i * g.lh; return [music.beat() + (x - g.nowX) / g.bw, Math.max(0, Math.min(1, 1 - (y - y0 - 6) / (g.lh - 12)))]; };
  const setAuto = (o, side, ap) => { const bt = music.beat(), pts = ap.slice().sort((a, b) => a[0] - b[0]), b0 = Math.floor(pts[0][0] / 4) * 4, P = D.paint.get(o.id), span = pts[pts.length - 1][0] - b0;
    const bars = P ? P.bars : [1, 2, 4, 8].find(k => k * 4 >= span - 1e-6) || 8, rel = []; for (const [b, l] of pts) { const u = Math.min(bars * 4 - 1e-3, b - b0); if (!rel.length || u - rel[rel.length - 1][0] > .06) rel.push([u, l]); }
    const cur = D.auto.get(o.id) || {}, old = cur[side] || null, from0 = Math.max(Math.floor(bt / 4) + 1, b0 / 4), from = from0 - ((from0 - b0 / 4) % bars + bars) % bars, C = rel.every(q => q[1] > .95) ? null : { pts: rel, bars, from };
    const put = v => { const a = D.auto.get(o.id) || {}; if (v) a[side] = v; else delete a[side]; if (a.vol || a.bright) D.auto.set(o.id, a); else D.auto.delete(o.id); };
    put(C); D.stats.auto = (D.stats.auto || 0) + 1; bus.post({ type: 'daw.auto', src: o, side, cleared: !C, bars }); push({ label: C ? 'draw ' + side : 'clear ' + side, undo: () => put(old), redo: () => put(C) }); return C; };
  // level of a curve at a beat: linear between drawn points, wrapping across the loop's end
  const curveAt = (C, beat) => { if (!C || beat < C.from * 4) return null; const L = C.bars * 4, u = ((beat - C.from * 4) % L + L) % L, p = C.pts; if (p.length === 1) return p[0][1];
    let j = p.length - 1; for (let k = 0; k < p.length; k++) if (p[k][0] <= u) j = k; else break;
    const a = p[j], b = p[(j + 1) % p.length], ua = u < a[0] ? u + L : u, bb = j + 1 < p.length ? b[0] : b[0] + L, ub = u < a[0] ? bb : bb; const t = (ua - a[0]) / Math.max(1e-6, ub - a[0]); return a[1] + (b[1] - a[1]) * Math.max(0, Math.min(1, t)); };
  // a note at this beat: { vol (gain x), cutK (filter cutoff x) } or null
  D.autoAt = (o, beat) => { if (!O.on || !O.auto || !o) return null; const a = D.auto.get(o.id); if (!a) return null; const v = curveAt(a.vol, beat), c = curveAt(a.bright, beat); if (v == null && c == null) return null;
    return { vol: v == null ? 1 : v * v, cutK: c == null ? 1 : Math.pow(2, (c - 1) * 5) }; };
  sim.autoFor = (o, beat) => D.autoAt(o, beat == null ? music.beat() : beat);
  D.autoFor = (o, side, ap) => setAuto(o, side, ap); D.curveAt = curveAt;
  D.paintFor = (o, lp) => paint(o, lp); D.eraseFor = o => erase(o);
  // ---- draw (only while open)
  D.draw = (g, Wd, Hd) => { if (!D.open) return; const G0 = geo(), t = performance.now(), bt = music.beat(), a = Math.min(1, (t - D.openT) / 250); if (performance.now() % 1000 < 20) D.lanes = pickLanes();
    g.fillStyle = 'rgba(6,10,18,' + .82 * a + ')'; g.fillRect(0, 0, Wd, Hd); g.globalAlpha = a; const ch = music.chord || { root: 0 }, S = sys.songs;
    D.lanes.forEach((o, i) => { const mid = G0.top + (i + .5) * G0.lh, rec = recipes.get(o.recipe), hue = rec ? rec.hue : 0, sp = G0.lh / 15;
      // 2 chord glow + scale lattice
      g.fillStyle = 'hsla(' + (ch.root * 51) % 360 + ',50%,50%,.12)'; g.fillRect(0, mid - (ch.root - 7) * sp - sp * 2, Wd, sp * 4);
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let d = 0; d <= 14; d++) for (let x = 50; x < Wd; x += 26) { const y = mid - (d - 7) * sp + wave(i, x, t); g.fillRect(x + (d % 2) * 13, y, 2, 2); }
      // 3 rhythm cycle on the top edge
      const y0 = G0.top + i * G0.lh + 3; g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; for (let b = Math.ceil(bt - G0.nowX / G0.bw); b < bt + (Wd - G0.nowX) / G0.bw; b++) { const x = G0.nowX + (b - bt) * G0.bw; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + (b % 4 === 0 ? 10 : 4)); g.stroke(); }
      // song sections ahead
      const Gs = S && S.groupOf(o); if (Gs && Gs.state === 'song' && Gs.L) { Gs.L.forEach((B, bi) => { const x = G0.nowX + ((Gs.start + bi) * 4 - bt) * G0.bw; if (x > Wd || x + 4 * G0.bw < 0) return; const hk = B.sec === Gs.song.form[0] && B.i < (Gs.song.hookBars || 1); g.fillStyle = B.sec === 'end' ? 'rgba(255,255,255,.18)' : hk ? 'rgba(255,211,110,.22)' : 'rgba(232,182,90,.08)'; g.fillRect(x + 1, G0.top + i * G0.lh + 14, 4 * G0.bw - 2, G0.lh - 18); }); }
      // painted ribbon (leaf green), repeating
      const P = D.paint.get(o.id); if (P) { g.strokeStyle = COL.river; g.lineWidth = 3; for (let c = -1; c <= 3; c++) { const cyc = Math.floor((bt / 4 - P.from) / P.bars) + c; if (cyc < 0 && c < 0) continue; g.beginPath(); P.notes.forEach((n, j) => { const q = beadXY(i, (P.from + cyc * P.bars) * 4 + n.b, n.d); j ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.stroke();
        for (const n of P.notes) { const q = beadXY(i, (P.from + cyc * P.bars) * 4 + n.b, n.d); g.fillStyle = COL.river; g.beginPath(); g.arc(q.x, q.y, 4 + n.vel * 3, 0, 6.283); g.fill(); } } }
      // automation curves (Q357): loudness white, brightness cyan, repeating in the lane's cycle
      const AU = D.auto.get(o.id); if (AU) for (const side of ['vol', 'bright']) { const C = AU[side]; if (!C) continue; g.strokeStyle = side === 'vol' ? 'rgba(255,255,255,.7)' : 'rgba(110,220,255,.8)'; g.lineWidth = 2; g.beginPath(); let st = 0;
        for (let x = 0; x < Wd; x += 6) { const b = bt + (x - G0.nowX) / G0.bw, l = curveAt(C, b); if (l == null) { st = 0; continue; } const y = G0.top + i * G0.lh + 6 + (1 - l) * (G0.lh - 12); st++ ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      // 1 live notes + 4 origins + 5 sound + 6 hits
      for (const n of ringOf(o)) { if (n.hit) { const x = G0.nowX + (n.b - bt) * G0.bw; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x, G0.top + (i + 1) * G0.lh - 9, 2, 7); continue; } const q = beadXY(i, n.b, n.d); if (q.x < -10 || q.x > Wd + 10) continue;
        g.fillStyle = 'hsl(' + hue + ',60%,' + (45 + n.vel * 25) + '%)'; g.beginPath(); g.arc(q.x, q.y, 3 + n.vel * 4, 0, 6.283); g.fill(); g.strokeStyle = COL[n.why] || COL.other; g.lineWidth = 2; g.stroke(); }
      // label edge: the ohm's colour; muted = hollow
      g.fillStyle = 'hsl(' + hue + ',60%,55%)'; g.strokeStyle = g.fillStyle; g.beginPath(); g.arc(22, mid, 12, 0, 6.283); o.muted ? g.stroke() : g.fill(); if (o === sim.ohm) { g.strokeStyle = '#fff'; g.beginPath(); g.arc(22, mid, 16, 0, 6.283); g.stroke(); } });
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); for (let y = G0.top; y < G0.top + G0.n * G0.lh; y += 6) g.lineTo(G0.nowX + Math.sin(y * .05 + t * .002) * 2, y); g.stroke();
    for (const p of D.touch.values()) if (p.mode === 'bounce' && sys.bounce) { const k = Math.min(1, (performance.now() - p.holdT0) / sys.bounce.opts.holdMs); g.strokeStyle = '#ffd36e'; g.lineWidth = 3; g.beginPath(); g.arc(p.x0, p.y0, 26, -1.571, -1.571 + k * 6.283); g.stroke(); }   // Q358 hold ring
    if (sys.bounce && (sys.bounce.busy || sys.bounce.last && performance.now() - (sys.bounce.lastT || 0) < 3000)) { const B = sys.bounce; g.fillStyle = 'rgba(255,211,110,.85)'; g.font = '14px sans-serif'; g.fillText(B.busy ? 'rendering the song ' + Math.round(B.progress * 100) + '%' : B.last.err ? 'could not render: ' + B.last.err : 'song rendered: ' + B.last.name, 16, G0.top + G0.n * G0.lh + 30); }
    for (const p of D.touch.values()) if (p.mode === 'auto' && p.ap && p.ap.length > 1) { const y0 = G0.top + p.lane * G0.lh; g.strokeStyle = p.side === 'vol' ? '#fff' : '#6edcff'; g.lineWidth = 4; g.beginPath(); p.ap.forEach((q, j) => { const x = G0.nowX + (q[0] - bt) * G0.bw, y = y0 + 6 + (1 - q[1]) * (G0.lh - 12); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
    for (const p of D.touch.values()) if (p.mode === 'paint' && p.lp && p.lp.length > 1) { g.strokeStyle = COL.river; g.lineWidth = 6; g.globalAlpha = .6 * a; g.beginPath(); p.lp.forEach((q, j) => { const r = beadXY(p.lane, q[0], q[1]); j ? g.lineTo(r.x, r.y) : g.moveTo(r.x, r.y); }); g.stroke(); g.globalAlpha = a; }
    g.globalAlpha = 1; };
  D.save = () => ({ paint: [...D.paint.entries()], span: D.span, auto: [...D.auto.entries()] });
  D.load = d => { D.paint = new Map((d.paint || []).filter(([id]) => sim.byId.has(id))); D.span = d.span || O.span; D.auto = new Map((d.auto || []).filter(([id]) => sim.byId.has(id))); };
  return D; }
