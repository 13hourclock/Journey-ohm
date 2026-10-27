// STEP 5 E + F: EFFECTS AS OBJECTS IN THE WORLD, and DRAWN INSTRUMENTS (Wilbow's 3:35 AM Oct 25 picks E #32 and F #5; old softsound items.js /
// shapes.js as the goal). One-finger strokes on bare ground, read on lift AFTER the systems shapes (spiral = new ohm, hook = '?'):
//   closed loop + REST (finger held still >= restMs before lifting) = an EFFECT OBJECT; its shape picks the effect (big = shell/reverb, long =
//     echo crystal, spiky = ember-rock/drive, jagged small = shard/glitch, small round = droplet/chorus or bubble lens, wavy = seed pod/tremolo,
//     straight-sided long = reed tube/comb). Ohms near it play through it: it feeds the influence matrix's item.* sources (world.itemMod /
//     world.itemTouch -> DEFAULT_ROUTES item.bright / rough / space / wobble / touch), so what it does is the matrix's, predictable and editable.
//   closed loop, NO rest, nothing inside = a DRUM (membrane): pitch ~ 1 / sqrt(area). (2+ ohms inside stays the loop-select of herd.)
//   open stroke + REST: straight = a STRING (pitch ~ 1 / length), bent = a BAR (pitch ~ 1 / length^2).
// MOVABLE ENDS (Wilbow 3:19 AM Oct 23 "make endpoints move able. Make length correlate pitch"; App. A P1, carried): a finger on the END of a
//   drawn string / bar drags that end (the other end stays, the shape stretches / turns with it, so the length and the note change); a finger
//   on the RIM of a drawn drum swells or shrinks it (wider = lower). The note re-snaps to the key while you drag with a soft re-strike each
//   time it lands on a new note (<= 5 / s), like frets. A touch that does not move still plays it. Undoable. Limits from the V08 P1 spec
//   (Q113 / Q115 defaults): length 0.3x-3x the drawn length, drum area 0.4x-3x the drawn area. Handles: gestures.js claims them.
// JAM-TUNED STRINGS (Wilbow 2:25 AM Oct 23 "the resulting strings should be representative of available notes in the jam of the currently
//   joined ohms"; V08 D, carried; INSTRUMENT_PALETTE 4.2): a drawn STRING within the jam leash of an ohm that played in the last 2 bars is
//   TIED to the jam. Once per bar (on the downbeat) the tied strings take the jam's CURRENT key: sorted by their physical pitch (longer =
//   lower kept), each gets the nearest scale note STRICTLY ABOVE the previous string's, so no two share a note. Ohms bumping them play
//   those notes. A player tap on a tied string is heard by the moving harmony as a player voice (weight jamFeed .8 of one member, V08 D).
//   A string out of reach of any jam keeps its pitch. Strings on the chord sounding now glow a little. Defaults (mine, from V08 D):
//   leash 3.5 world units (~190 px at the default zoom), 'in a jam' = played in the last 2 bars. Not built: strings made BY joining
//   ohms (the new engine's fused clusters make none; question), the 120 ms glide (one-shot plucks are re-pitched on the next strike),
//   the player's section nudge (no lead section chooser in the new engine; question).
// GROUP STRINGS (Wilbow 3:58 PM Oct 25, Q351 'a'): a fused (stuck-together) group grows a string along each of its links (member centre
//   to member centre; length = link length x groupLenK, so a group at rest sits mid string range). The group's strings are always tied
//   to the jam and are tuned TOGETHER as one set with the same rules (own pitch from length, nearest scale note in cents, push the
//   higher one up on a shared note, re-snap on the downbeat), separately from drawn strings. They sound when the group is stretched and
//   springs back (link > groupPluck x its rest length, then back), and when another ohm bumps them. They come and go with the links
//   (not saved, not undoable on their own; the fuse is). Not end-draggable, not tapped (the line lies under the members). Switch
//   groupStrings (ON). The multiplier and the pluck threshold are my defaults.
// A drawn instrument has its own voice: a palette row of its kind (strings / bars / drums), seeded, never written into any ohm. Pitch snaps to
// the key. It sounds when tapped and when an ohm bumps into it. The world also grows a few effect objects of its own (seeded per world).
// Everything is undoable (3-finger tap) and saved with the world (persist 'things').
import { recipes, makeRecipe, withRow } from './recipe.js';
import { PALETTE } from './instruments.js';
import { analyze } from './stroke.js';
import { toWorld, toScreen } from './space.js';
import { rng } from './rng.js';
import { noLine } from './soft.js';   // v0.0.30 B14: no outlines
// pitch constants (MT 11:33): a mid-size drawing (string 2.5 units long, bar 2 units, drum 1.5 units across; 1 unit = 13% of the short
// screen side) lands mid-range: strings C3-C5 (L 1.25..5), bars C4-C7 (L 1.2..3.4), drums C2-C4 (diameter .75..3)
// Movable-end limits (Music Theory 3:01 PM Oct 25, on 57b2f78): strings .3-3x their drawn length, bars .5-2x, drums .4-3x their drawn
// area; then the end / rim drag's final pitch is held inside strings C3-C5, bars C4-C7, membranes C2-C4 (A440 Hz, snapped to the nearest
// scale note inside the range); a soft re-strike at most every 70 ms per object (none across objects). endPitch applies to end / rim drags.
export const THING_OPTS = { on: true, ends: true, jamTune: true, jamLeash: 3.5, jamBars: 2, jamFeed: .8, handlePx: 16, rimPx: 12, lenLim: [.3, 3], barLim: [.5, 2], areaLim: [.4, 3], restrikeMs: 70, endPitch: { string: [130.81, 523.25], bar: [261.63, 2093.0], membrane: [65.41, 261.63] }, carry: true, carryHoldMs: 900, carryStill: .6, knockV: 3, dropV: 7, takePx: 10, glide: true, glideMs: 120, ringMs: 1500, groupStrings: true, groupLenK: 2.5, groupPluck: 1.15, restMs: 350, max: 24, grown: 4, reach: 1.6, bumpV: .6, absLen: [.47, 23.5], voiceCap: 4, strK: 654, barK: 2960, memK: 196, groundLean: 2,
  range: { string: [65.4, 1046.5], bar: [130.8, 4186], membrane: [32.7, 523.3] } };
// effect kinds' default weights (MT 11:33) for the world's own effect objects; the ground leans them (caves / craters -> reverb + comb,
// water -> chorus + tremolo, ice -> pitch + delay, rough / rock -> distortion + glitch)
export const FX_W = { rev: .25, dly: .18, cho: .14, trm: .12, pit: .10, cmb: .08, dst: .08, glt: .05 };
export const FX_LEAN = { hollow: ['rev', 'cmb'], water: ['cho', 'trm'], ice: ['pit', 'dly'], rock: ['dst', 'glt'] };
export function fxWeights(ground = {}, O = THING_OPTS) { const w = Object.assign({}, FX_W); for (const g in FX_LEAN) { const sh = Math.max(0, Math.min(1, +ground[g] || 0)); for (const k of FX_LEAN[g]) w[k] *= 1 + O.groundLean * sh; } return w; }
export function pickFx(w, u) { let t = 0; for (const k in w) t += w[k]; let x = u * t; for (const k in w) { x -= w[k]; if (x <= 0) return k; } return 'rev'; }
export const FX = { rev: { name: 'shell', space: 1, col: [230, 210, 180] }, dly: { name: 'echo crystal', space: .7, wobble: .2, col: [170, 220, 255] },
  dst: { name: 'ember-rock', rough: 1, col: [255, 110, 50] }, glt: { name: 'shard cluster', rough: .5, wobble: .5, col: [200, 120, 255] },
  cho: { name: 'droplet', wobble: .7, bright: .3, col: [120, 200, 230] }, trm: { name: 'seed pod', wobble: 1, col: [170, 220, 110] },
  cmb: { name: 'reed tube', bright: .7, rough: .3, col: [210, 190, 120] }, pit: { name: 'bubble lens', bright: 1, space: .3, col: [220, 240, 255] } };
export const FXK = Object.keys(FX);
// which palette rows a drawn kind may take (by its resonator)
const rowsFor = kind => PALETTE.filter(e => { const r = e.res || {}; if (e.part === 'tract') return false;
  return kind === 'string' ? (r.str || 0) >= .5 : kind === 'bar' ? (r.bar || 0) >= .5 : (r.membrane || 0) >= .5; }).map(e => e.id);
// classify a finished stroke (screen-space analyze()); rest = the finger was still before lifting; inside = ohms inside a closed loop
// shape measures from the raw points (screen px): sweep = angle swept around the centre, cv / wig = how much and how often the radius wobbles,
// el = elongation (covariance axes), ext = size
export function shapeOf(raw) { const p = raw.filter((q, i) => !i || Math.abs(q[0] - raw[i - 1][0]) + Math.abs(q[1] - raw[i - 1][1]) > .5), n = p.length; if (n < 3) return null;
  let cx = 0, cy = 0; for (const q of p) { cx += q[0]; cy += q[1]; } cx /= n; cy /= n; let sxx = 0, syy = 0, sxy = 0, R = 0, sw = 0; const r = [];
  for (let i = 0; i < n; i++) { const dx = p[i][0] - cx, dy = p[i][1] - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; r.push(Math.hypot(dx, dy)); R += r[i];
    if (i) { let d = Math.atan2(dy, dx) - Math.atan2(p[i - 1][1] - cy, p[i - 1][0] - cx); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; sw += d; } }
  R /= n; let v = 0, wig = 0, ps = 0; for (let i = 0; i < n; i++) { const e = r[i] - R; v += e * e; const sg = Math.abs(e) > R * .03 ? Math.sign(e) : 0; if (sg && ps && sg !== ps) wig++; if (sg) ps = sg; }
  const tr = (sxx + syy) / n, det = (sxx * syy - sxy * sxy) / n / n, l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = Math.max(1e-6, tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det)));
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  return { sweep: Math.abs(sw), cv: Math.sqrt(v / n) / Math.max(1e-6, R), wig, el: Math.sqrt(l1 / l2), ext: Math.max(x1 - x0, y1 - y0) }; }
export function classify(A, rest, inside = 0, raw) { if (!A || A.n < 6 || A.len < 60) return null; const sh = raw ? shapeOf(raw) : null;
  const closed = A.closure < .3 && (sh ? sh.sweep > 1.6 * Math.PI && sh.sweep < 2.8 * Math.PI : A.turns > .55 && A.turns < 1.4);
  if (closed) { if (inside >= 2) return null; if (rest) return { kind: 'fx', fx: sh ? fxFor(sh) : 'rev' }; return inside ? null : { kind: 'membrane' }; }
  if (!rest || A.turns > .7) return null; const straight = A.ext / Math.max(1, A.len) > .9; return { kind: straight ? 'string' : 'bar' }; }
export function fxFor(S) { if (S.cv > .1 && S.wig >= 8) return S.ext > 150 ? 'dst' : 'glt'; if (S.el > 2.6) return 'cmb'; if (S.el > 1.8) return 'dly';
  if (S.cv > .06 && S.wig >= 4) return 'trm'; if (S.ext > 260) return 'rev'; return S.ext < 120 ? 'pit' : 'cho'; }
// pitch by the physical law of the kind (world units), soft-limited, then snapped to the key (music.hz)
export function pitchFor(kind, L, area, O = THING_OPTS) { const D = 2 * Math.sqrt(Math.max(.002, area) / Math.PI);   // physics: string 1/L, bar 1/L^2, membrane 1/diameter
  let f = kind === 'string' ? O.strK / Math.max(.1, L) : kind === 'bar' ? O.barK / Math.max(.05, L * L) : O.memK / Math.max(.05, D);
  const rg = O.range[kind === 'string' || kind === 'bar' ? kind : 'membrane'], lo = Math.log(rg[0]) - .35, hi = Math.log(rg[1]) + .35, x = Math.log(f);   // soft limit half an octave past the range
  if (x > hi) f = Math.exp(hi + (1 - Math.exp(-(x - hi))) * .3); if (x < lo) f = Math.exp(lo - (1 - Math.exp(-(lo - x))) * .3); return f; }
// snap to the PLACE's scale in cents (music.cents(): the jam's tuning, any number of notes, not 12-TET) around its tonic
export function snap(f, music) { if (!music || !music.tonicHz) return f; const cs = music.cents ? music.cents() : [0], c = 1200 * Math.log2(f / music.tonicHz), oc = Math.floor(c / 1200), r = c - oc * 1200;
  let best = 0, bd = 1e9; for (const k of [...cs, 1200]) { const d = Math.abs(k - r); if (d < bd) { bd = d; best = k; } } return music.tonicHz * Math.pow(2, (oc * 1200 + best) / 1200); }
// snap to the nearest note of music.cents() that lies inside [lo, hi] Hz (falls back to a plain clamp with no scale)
export function snapIn(f, music, lo, hi) { const x = Math.max(lo, Math.min(hi, f)); if (!music || !music.tonicHz) return x; const cs = music.cents ? music.cents() : [0], t = music.tonicHz;
  let best = x, bd = 1e9; for (let o = Math.floor(Math.log2(lo / t)) - 1; o <= Math.ceil(Math.log2(hi / t)) + 1; o++) for (const k of cs) { const h = t * Math.pow(2, o + k / 1200); if (h < lo * .9999 || h > hi * 1.0001) continue; const d = Math.abs(Math.log2(h / x)); if (d < bd) { bd = d; best = h; } }
  return best; }
const segD = (px, py, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l)); return Math.hypot(px - a.x - t * dx, py - a.y - t * dy); };
const polyHas = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
const area = P => { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j].x + P[i].x) * (P[j].y - P[i].y); return Math.abs(s / 2); };
const plen = P => { let s = 0; for (let i = 1; i < P.length; i++) s += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y); return s; };
const thin = (P, n = 24) => P.length <= n ? P : Array.from({ length: n }, (_, i) => P[Math.round(i * (P.length - 1) / (n - 1))]);
export function createThings(d = {}) { const { sim, bus, music, persist, undo, size, canvas } = d; let audio = d.audio; const O = Object.assign(THING_OPTS, d.opts || {});
  const T = { opts: O, list: [], n: 0, marks: [] };
  const center = P => { let x = 0, y = 0; for (const q of P) { x += q.x; y += q.y; } return { x: x / P.length, y: y / P.length }; };
  // build a thing from world points (also used by load / tests)
  T.make = (kind, P, extra = {}) => { if (!extra.group && T.list.filter(t => !t.link).length >= O.max) { T.marks.push({ type: 'full', t: Date.now() }); return null; } P = thin(P.map(q => ({ x: +q.x, y: +q.y }))); const c = center(P);
    const th = { id: extra.id || ('t' + (++T.n) + '_' + Math.floor((extra.seed || Math.random() * 1e9) % 1e6)), kind, pts: P, x: c.x, y: c.y, seed: extra.seed >>> 0 || ((Math.random() * 4294967296) >>> 0), grown: !!extra.grown };
    let r = 0; for (const q of P) r = Math.max(r, Math.hypot(q.x - c.x, q.y - c.y)); th.r = Math.max(.4, r);
    if (kind === 'fx') th.fx = FX[extra.fx] ? extra.fx : 'rev';
    else { const rows = rowsFor(kind), rr = rng(th.seed); th.row = extra.row && PALETTE.some(e => e.id === extra.row) ? extra.row : rows[Math.floor(rr() * rows.length)] || 'kick';
      th.L = kind === 'membrane' ? 0 : plen(P) * (extra.group ? O.groupLenK : 1); if (extra.group) th.link = extra.group; th.A = kind === 'membrane' ? area(P) : 0; th.L0 = +extra.L0 || th.L; th.A0 = +extra.A0 || th.A; const raw = pitchFor(kind, th.L, th.A, O), lim = O.endPitch && O.endPitch[kind], moved = Math.abs(th.L - th.L0) > 1e-4 || Math.abs(th.A - th.A0) > 1e-4;
      th.f = lim && moved ? snapIn(raw, music, lim[0], lim[1]) : snap(raw, music);   // a loaded end-moved one keeps its held range
      const base = makeRecipe(th.seed, { name: 'drawn ' + kind, add: false }); th.rec = withRow(base, th.row); recipes.set(th.rec.id = base.id, th.rec);
      th.src = { id: 'drawn:' + th.id, scale: 'thing', seed: th.seed, recipe: th.rec.id, body: { x: c.x, y: c.y } }; }
    T.list.push(th); return th; };
  T.remove = th => { const i = T.list.indexOf(th); if (i >= 0) T.list.splice(i, 1); };
  T.add = (kind, P, extra) => { const th = T.make(kind, P, extra); if (th && undo) undo.push({ label: kind === 'fx' ? FX[th.fx].name : 'drawn ' + kind, x: th.x, y: th.y, undo: () => T.remove(th), redo: () => { if (!T.list.includes(th)) T.list.push(th); } }); return th; };
  // the stroke hook (chained after the systems shapes in main.js)
  T.stroke = (pts, toW) => { if (!O.on || !pts || pts.length < 6) return false; const A = analyze(pts), n = pts.length, rest = (pts[n - 1][2] || 0) - (pts[n - 2][2] || 0) >= O.restMs;
    const W = pts.map(q => toW(q[0], q[1])), inside = sim && sim.ohms ? sim.ohms.filter(o => !o.parked && polyHas(W, o.body.x, o.body.y)).length : 0;
    const c = classify(A, rest, inside, pts); if (!c) return false; const th = T.add(c.kind, W, { fx: c.fx }); if (!th) return false; if (th.src) T.play(th, .6); T.marks.push({ type: c.kind, x: A.cx, y: A.cy, t: Date.now() }); return true; };
  // sounding a drawn instrument
  // V08 P3 cost (Q120): at most O.voiceCap drawn shapes ring at once from ohms / bumps (your own taps always sound; ohm notes are never taken)
  T.ringing = (now = Date.now()) => { let n = 0; for (const t of T.list) if (t.src && now - (t.hit || 0) < O.ringMs) n++; return n; };
  T.play = (th, vel = .6, at, who, dur) => { if (!bus || !th.src || !music) return;
    if (O.voiceCap && who !== 'player' && who !== 'drag' && Date.now() - (th.hit || 0) >= O.ringMs && T.ringing() >= O.voiceCap) { T.capped = (T.capped || 0) + 1; return; }
    if (th.bendR && th.bendR !== 1 && !T.glides.has(th) && Date.now() - (th.hit || 0) > O.ringMs) { th.bendR = 1; if (audio) audio.send({ t: 'bend', src: th.src.id, r: 1 }); }   // quiet: bend back to 1
    const fs = th.f / (th.bendR || 1); th.fHit = fs;   // Q353: sent so it sounds th.f under a held glide bend
    const ev = { src: th.src, kind: 'note', f: fs, vel: Math.max(.05, Math.min(1, vel)), pos: .3, dur: dur || .8, pan: 0, t: at != null ? at : music.now(), lite: false, by: who == null ? 'bump' : who };   // by: who played it (P7 shape summary, shapeplay.js)
    if (who === 'player' && th.tied && O.jamFeed > 0 && th.deg != null) { ev.deg = th.deg; ev.feedW = O.jamFeed; }   // heard by the moving harmony as a player voice (music.js)
    bus.note(ev); th.hit = Date.now(); };
  // ---- jam-tuned strings (once per bar)
  const lastPlayed = new Map(); let tBar = -1;
  if (bus && bus.on) bus.on('note', ev => { const s = ev.src; if (s && s.scale === 'ohm' && s.body && music && music.beat) lastPlayed.set(s.id, { b: music.beat(), s }); });
  T.jamTune = () => { if (!O.on || !O.jamTune || !music || !music.cents || !music.tonicHz) return 0; const b = music.beat ? music.beat() : 0, cs = music.cents(), n = cs.length, tied = [];
    for (const [id, e] of lastPlayed) if (e.b < b - 4 * O.jamBars) lastPlayed.delete(id);
    const groups = new Map(); for (const th of T.list) { if (!th.link || !th.src) continue; th.tied = true; const c = T.fuse && T.fuse.colonyOf ? T.fuse.colonyOf({ id: +th.link.split('-')[0] }) : null, gk = c ? c.join() : th.link; (groups.get(gk) || groups.set(gk, []).get(gk)).push(th); }
    for (const th of T.list) { if (th.kind !== 'string' || !th.src || th.link || th.ens) continue;   /* a harp frame's strings are tuned by shapeplay.js (P6 3) */ let t = false; for (const e of lastPlayed.values()) if (Math.hypot(e.s.body.x - th.x, e.s.body.y - th.y) <= O.jamLeash + th.r) { t = true; break; }
      th.tied = t; if (t) tied.push(th); }
    if (!tied.length && !groups.size) return 0; const g = f => { const c = 1200 * Math.log2(f / music.tonicHz); let best = 0, bd = 1e9; for (let o = Math.floor(c / 1200) - 1; o <= Math.floor(c / 1200) + 1; o++) for (let k = 0; k < n; k++) { const d = Math.abs(o * 1200 + cs[k] - c); if (d < bd) { bd = d; best = o * n + k; } } return best; };
    const hzOf = d => { const o = Math.floor(d / n), k = d - o * n; return music.tonicHz * Math.pow(2, (o * 1200 + cs[k]) / 1200); };
    // Music Theory 3:01 PM Oct 25: each string's OWN physical pitch (from its length) snaps in cents to the nearest note of the jam's scale
    // (any number of notes, so maqam microtones are included); only when two land on the same note (or below a lower one) is the higher-
    // drawn one pushed up to the next scale note, so the order still rises. A key change re-snaps on the next downbeat (onBar).
    let moved = 0; const tune = set => { set.forEach(th => { th.raw = pitchFor(th.kind, th.L, th.A, O); }); set.sort((a, b) => a.raw - b.raw || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); let prev = -1e9;
      for (const th of set) { const d = Math.max(g(th.raw), prev + 1); prev = d; const f = hzOf(d); if (Math.abs(Math.log(f / th.f)) > 1e-4) { moved++; T.retuned(th, th.f, f); } th.f = f; th.deg = n === 7 ? d : null; } };
    if (tied.length) tune(tied); for (const set of groups.values()) tune(set);   // Q351: each fused group's strings are one set
    return moved; };
  // GLIDE (Wilbow 3:58 PM Oct 25, Q353 'a'): a string still ringing (plucked < ringMs ago) that is retuned - the downbeat re-snap to a
  // new key, or its end dragged to a new note - slides to the new note over glideMs (120 ms, a quick finger slide) instead of jumping.
  // How: the sounding voices of that string get a pitch bend ramp (audio 'bend' per source, the matrix's live target); the next pluck
  // is sent at f / bend so it lands on the right note under the held bend, and the bend goes back to 1 once the string is quiet.
  // The end-drag re-strikes (one per new note, 70 ms per object) stay as they were. Switch glide (ON). Times are my defaults.
  T.glides = new Map(); T.setAudio = a => { audio = a; };
  T.retuned = (th, f0, f1) => { if (!O.glide || !audio || !audio.send || th.kind !== 'string' || !th.hit || Date.now() - th.hit > O.ringMs || !(f0 > 0) || !(f1 > 0)) return;
    const g = T.glides.get(th) || { r: th.bendR || 1 }, base = th.fHit || f0 / (th.bendR || 1); g.from = g.r; g.to = f1 / base; g.t0 = Date.now(); T.glides.set(th, g); };
  T.glideTick = () => { const now = Date.now(); for (const [th, g] of T.glides) { const u = Math.min(1, (now - g.t0) / Math.max(1, O.glideMs)), e = u * u * (3 - 2 * u);
      g.r = g.from * Math.pow(g.to / g.from, e); th.bendR = g.r; if (audio) audio.send({ t: 'bend', src: th.src.id, r: g.r }); if (u >= 1) T.glides.delete(th); } };
  // Q351 group strings follow the fuse links (T.fuse = systems.fuse, set in main.js)
  const hk = k => { let h = 2166136261; for (const c of k) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  T.groupTick = () => { const F = T.fuse; if (!F || !sim || !sim.byId) return; const want = O.on && O.groupStrings ? F.links : new Set();
    for (const th of [...T.list]) if (th.link && !want.has(th.link)) T.remove(th);
    for (const k of want) { const [i, j] = k.split('-').map(Number), a = sim.byId.get(i), b = sim.byId.get(j); if (!a || !b || !a.body || !b.body) continue; const P = [{ x: a.body.x, y: a.body.y }, { x: b.body.x, y: b.body.y }];
      let th = T.list.find(t => t.link === k); if (!th) { th = T.make('string', P, { group: k, seed: hk('g' + k) }); if (th) th.d0 = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y) || 1; continue; }
      th.pts = P; const d = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y); th.x = (P[0].x + P[1].x) / 2; th.y = (P[0].y + P[1].y) / 2; th.r = Math.max(.4, d / 2); th.src.body.x = th.x; th.src.body.y = th.y;
      if (d > O.groupPluck * th.d0) th.armed = Math.max(th.armed || 0, d / th.d0); else if (th.armed && d < 1.05 * th.d0) { T.play(th, Math.min(.8, .25 + (th.armed - 1) * 1.5)); th.armed = 0; } } };
  T.onBar = () => { const bar = music && music.beat ? Math.floor(music.beat() / 4) : 0; if (bar === tBar) return false; tBar = bar; T.jamTune(); return true; };
  T.hitAt = (x, y, pad = .3) => { for (let i = T.list.length - 1; i >= 0; i--) { const th = T.list[i]; if (!th.src || th.link) continue; const P = th.pts;
      if (th.kind === 'membrane' ? polyHas(P, x, y) : P.some((q, j) => j && segD(x, y, P[j - 1], q) < pad)) return th; } return null; };
  const dist = (th, x, y) => { if (th.kind === 'fx' || th.kind === 'membrane') return Math.max(0, Math.hypot(x - th.x, y - th.y) - th.r); let m = 1e9; for (let j = 1; j < th.pts.length; j++) m = Math.min(m, segD(x, y, th.pts[j - 1], th.pts[j])); return m; };
  // ---- movable ends / rims (screen px in, world out). h = { th, end: 0 | 1 } or { th, rim: true }
  const scr = (x, y) => { const { W, H } = size(); return toScreen(W, H, sim.cam, x, y); };
  T.handleAt = (sx, sy) => { if (!O.on || !O.ends || !size || !sim || !sim.cam) return null;
    for (let i = T.list.length - 1; i >= 0; i--) { const th = T.list[i]; if (!th.src || th.link) continue;
      if (th.kind === 'membrane') { const c = scr(th.x, th.y), R = th.r * c.s, d = Math.hypot(sx - c.x, sy - c.y), band = Math.max(O.rimPx, R * .25); if (d <= R + O.rimPx * .5 && d >= R - band) return { th, rim: true }; continue; }
      const n = th.pts.length; for (const end of [0, 1]) { const q = th.pts[end ? n - 1 : 0], c = scr(q.x, q.y); if (Math.hypot(sx - c.x, sy - c.y) <= O.handlePx) return { th, end }; } }
    return null; };
  const relay = th => { const c = center(th.pts); th.x = c.x; th.y = c.y; let r = 0; for (const q of th.pts) r = Math.max(r, Math.hypot(q.x - c.x, q.y - c.y)); th.r = Math.max(.4, r);
    if (th.kind === 'membrane') th.A = area(th.pts); else th.L = plen(th.pts); th.src.body.x = c.x; th.src.body.y = c.y;
    const raw = pitchFor(th.kind, th.L, th.A, O), lim = O.endPitch && O.endPitch[th.kind], f = lim ? snapIn(raw, music, lim[0], lim[1]) : snap(raw, music), nw = Math.abs(Math.log(f / th.f)) > .01; if (nw) T.retuned(th, th.f, f); th.f = f; return nw; };
  T.handleDown = (h, wx, wy) => { h.p0 = h.th.pts.map(q => ({ x: q.x, y: q.y })); h.moved = false; h.lastHit = 0; h.w0 = wx != null ? { x: wx, y: wy } : null; return h; };   // w0 = where the finger went down (no jump on the first move)
  T.handleMove = (h, wx, wy) => { const th = h.th, P0 = h.p0; if (!P0) T.handleDown(h); h.moved = true; let k;
    if (h.rim) { const c = center(h.p0), d0 = Math.max(1e-3, h.w0 ? Math.hypot(h.w0.x - c.x, h.w0.y - c.y) : Math.sqrt(area(h.p0) / Math.PI)), d = Math.hypot(wx - c.x, wy - c.y), A0 = th.A0 || area(h.p0);
      k = Math.max(Math.sqrt(O.areaLim[0] * A0 / area(h.p0)), Math.min(Math.sqrt(O.areaLim[1] * A0 / area(h.p0)), d / d0));
      th.pts = h.p0.map(q => ({ x: c.x + (q.x - c.x) * k, y: c.y + (q.y - c.y) * k })); }
    else { const n = h.p0.length, F = h.p0[h.end ? 0 : n - 1], M = h.p0[h.end ? n - 1 : 0], ax = M.x - F.x, ay = M.y - F.y, a0 = Math.hypot(ax, ay) || 1e-3;
      let bx = wx - F.x + (h.w0 ? M.x - h.w0.x : 0), by = wy - F.y + (h.w0 ? M.y - h.w0.y : 0); const L0 = th.L0 || plen(h.p0), Lp = plen(h.p0), b = Math.hypot(bx, by) || 1e-3, lim = th.kind === 'bar' && O.barLim ? O.barLim : O.lenLim, sc0 = Math.max(lim[0] * L0 / Lp, Math.min(lim[1] * L0 / Lp, b / a0)), sc = O.absLen ? Math.max(O.absLen[0] / Lp, Math.min(O.absLen[1] / Lp, sc0)) : sc0;   // V08 P1: never shorter than 24 px or longer than 1200 px (.47-23.5 world units)
      const cs = (ax * bx + ay * by) / (a0 * b), sn = (ax * by - ay * bx) / (a0 * b);   // rotate + scale about the fixed end (keeps a bar's bend)
      th.pts = h.p0.map(q => { const dx = q.x - F.x, dy = q.y - F.y; return { x: F.x + (dx * cs - dy * sn) * sc, y: F.y + (dx * sn + dy * cs) * sc }; }); }
    const nw = relay(th), t = Date.now(); if (nw && t - (th.reHit || 0) >= O.restrikeMs) { th.reHit = t; T.play(th, .25, undefined, 'drag'); } return th.f; };   // per object: other objects are never held back
  T.handleUp = h => { const th = h.th; if (!h.moved) { T.play(th, .7, undefined, 'player'); return 'tap'; } const before = h.p0, after = th.pts.map(q => ({ x: q.x, y: q.y }));
    if (undo) undo.push({ label: th.kind === 'membrane' ? 'drum size' : 'drawn ' + th.kind + ' length', x: th.x, y: th.y, undo: () => { th.pts = before.map(q => ({ ...q })); relay(th); }, redo: () => { th.pts = after.map(q => ({ ...q })); relay(th); } });
    return 'moved'; };
  // effects as objects -> the influence matrix's item.* sources (influence.js reads world.itemMod / world.itemTouch)
  T.itemMod = o => { const b = o.body; if (!b) return null; let m = null; for (const th of T.list) { if (th.kind !== 'fx') continue; const dd = Math.hypot(b.x - th.x, b.y - th.y), reach = th.r * O.reach;
      if (dd >= reach) continue; const k = dd <= th.r ? 1 : 1 - (dd - th.r) / (reach - th.r), F = FX[th.fx]; m = m || { bright: 0, rough: 0, space: 0, wobble: 0 };
      for (const q of ['bright', 'rough', 'space', 'wobble']) if (F[q]) m[q] = Math.min(1, m[q] + F[q] * k); } return m; };
  T.itemTouch = o => { const b = o.body; if (!b) return 0; let t = 0; for (const th of T.list) if (dist(th, b.x, b.y) < ((o.g && o.g.r) || .5)) t = 1; return t; };
  // ohms bumping drawn instruments play them (once per contact, velocity from speed)
  const contact = new Map(); let tk = 0;
  // CARRYING (Wilbow 3:58 PM Oct 25, Q354 'a'): ohms carry drawn things (strings, bars, drums, effect objects).
  //   attach: drag an ohm onto a drawn thing and hold it there, nearly still, for carryHoldMs (0.9 s, the same press as the fuse; if
  //     the ohm is also pressed into another ohm the fuse wins). One thing per ohm.
  //   ride: the thing sits just above its carrier's head and goes where it goes (wander, drag, throw); it still plays (tap, bumps).
  //   take: drag the carried thing itself (one finger on it, moved > takePx) - it comes off and goes where you let go; a still touch
  //     on it is the old tap (it plays). gestures.js claims that touch.
  //   knock off: another ohm hitting it faster than knockV knocks it off (it sounds), left where it was hit.
  //   drop: a carrier moving faster than dropV (a flick or a hard throw) lets go; it stays where it was. A carrier that leaves drops it.
  //   Saved with the world (th.carry = the ohm's id); attach / take are undoable. Switch carry (ON). Thresholds are my defaults.
  T.carried = 0; T.drops = 0; const press = new Map();
  const ext = th => { if (th.kind === 'fx') return { h: th.r, cx: th.x, cy: th.y }; let lo = 1e9, hi = -1e9, l = 1e9, r = -1e9; for (const q of th.pts) { lo = Math.min(lo, q.y); hi = Math.max(hi, q.y); l = Math.min(l, q.x); r = Math.max(r, q.x); } return { h: Math.max(.1, (hi - lo) / 2), cx: (l + r) / 2, cy: (lo + hi) / 2 }; };
  const moveBy = (th, dx, dy) => { for (const q of th.pts) { q.x += dx; q.y += dy; } th.x += dx; th.y += dy; if (th.src && th.src.body) { th.src.body.x = th.x; th.src.body.y = th.y; } };
  T.moveBy = moveBy;
  T.detach = (th, why = 'drop') => { if (th.carry == null) return; th.carry = null; T.drops++; T.marks.push({ type: 'carry.' + why, t: Date.now(), x: th.x, y: th.y }); if (bus && bus.post) bus.post({ type: 'thing.carry', th, on: false, why }); };
  T.attach = (th, o) => { const before = th.pts.map(q => ({ ...q })); th.carry = o.id; T.carried++; T.marks.push({ type: 'carry.on', t: Date.now(), x: th.x, y: th.y }); if (bus && bus.post) bus.post({ type: 'thing.carry', th, on: true, who: o.id });
    if (undo) undo.push({ label: 'carry', x: th.x, y: th.y, undo: () => { th.carry = null; const c = center(before); moveBy(th, c.x - center(th.pts).x, c.y - center(th.pts).y); }, redo: () => { th.carry = o.id; } }); };
  T.carryOf = o => T.list.find(t => t.carry === o.id) || null;
  T.carriedAt = (x, y) => { const th = T.hitAt(x, y); return th && th.carry != null ? th : null; };
  T.take = (th, wx, wy) => { const before = th.pts.map(q => ({ ...q })), who = th.carry; T.detach(th, 'take'); const tk = { th, before, who, w0: { x: wx, y: wy }, c0: { x: th.x, y: th.y } };
    if (undo) undo.push({ label: 'take', x: th.x, y: th.y, undo: () => { th.pts = before.map(q => ({ ...q })); const c = center(th.pts); th.x = c.x; th.y = c.y; th.carry = who; }, redo: () => { th.carry = null; } }); return tk; };
  T.takeMove = (tk, wx, wy) => { const th = tk.th, tx = tk.c0.x + (wx - tk.w0.x), ty = tk.c0.y + (wy - tk.w0.y); moveBy(th, tx - th.x, ty - th.y); };
  T.carryTick = dt => { if (!O.carry) { for (const th of T.list) if (th.carry != null) T.detach(th, 'off'); press.clear(); return; }
    for (const th of T.list) { if (th.carry == null) continue; const o = sim.byId ? sim.byId.get(th.carry) : sim.ohms.find(x => x.id === th.carry); if (!o || o.dead || o.parked || !o.body) { T.detach(th, 'drop'); continue; }
      const b = o.body, r = (o.g && o.g.r) || .5; if (Math.hypot(b.vx || 0, b.vy || 0) > O.dropV) { T.detach(th, 'drop'); continue; }
      const e = ext(th); moveBy(th, b.x - e.cx, b.y - r - e.h - .08 - e.cy); }
    for (const o of sim.ohms) { const b = o.body; if (!b || !b.grab || o.dead || o.parked || T.carryOf(o)) { press.delete(o.id); continue; } const r = (o.g && o.g.r) || .5;
      if (Math.hypot(b.vx || 0, b.vy || 0) > O.carryStill || sim.ohms.some(x => x !== o && x.body && !x.dead && Math.hypot(x.body.x - b.x, x.body.y - b.y) < .8 * (r + ((x.g && x.g.r) || .5)))) { press.delete(o.id); continue; }   // moving, or pressed into an ohm (the fuse's)
      let hit = null; for (let i = T.list.length - 1; i >= 0; i--) { const th = T.list[i]; if (th.link || th.carry != null) continue; if (Math.abs(b.x - th.x) < th.r + r + 1 && Math.abs(b.y - th.y) < th.r + r + 1 && dist(th, b.x, b.y) < r) { hit = th; break; } }
      const pr = press.get(o.id); if (!hit) { press.delete(o.id); continue; } if (!pr || pr.th !== hit) { press.set(o.id, { th: hit, t: 0 }); continue; }
      pr.t += dt; o.carryPress = Math.min(1, pr.t * 1000 / O.carryHoldMs); if (pr.t * 1000 >= O.carryHoldMs) { press.delete(o.id); o.carryPress = 0; T.attach(hit, o); } } };
  T.tick = () => { if (T.glides.size) T.glideTick(); if (!O.on || !sim || !sim.ohms || ++tk % 2) return; T.groupTick(); T.carryTick(1 / 30); T.onBar(); for (const th of T.list) { if (!th.src) continue; const mem = th.link ? th.link.split('-').map(Number) : null; for (const o of sim.ohms) { if (o.parked || (mem && mem.includes(o.id)) || o.id === th.carry) continue; const b = o.body, key = th.id + '|' + o.id, r = (o.g && o.g.r) || .5;
      const near = Math.abs(b.x - th.x) < th.r + r + 1 && Math.abs(b.y - th.y) < th.r + r + 1 && dist(th, b.x, b.y) < r + .1, was = contact.get(key);
      if (near && !was) { const v = Math.hypot(b.vx || 0, b.vy || 0); if (v > O.bumpV) T.play(th, .25 + Math.min(.7, v / 8)); if (th.carry != null && O.carry && v > O.knockV) T.detach(th, 'knock'); } if (near) contact.set(key, 1); else if (was) contact.delete(key); } } };
  // the world's own effect objects: a few, seeded by the world seed, around where you start
  T.grow = (seed, cx = 0, cy = 0, ground = {}) => { const FW = fxWeights(ground, O); if (T.list.some(t => t.grown)) return; const r = rng(((seed || 1) * 2246822519 ^ 0xe5) >>> 0);
    for (let i = 0; i < O.grown; i++) { const B = (sim && sim.bounds) || { x0: -3.8, x1: 3.8, y0: -5.5, ground: 7.5 }, x = B.x0 + .8 + r() * (B.x1 - B.x0 - 1.6), y = B.y0 + 1 + r() * (B.ground - B.y0 - 2.5), rad = .45 + r() * .5, fx = pickFx(FW, r()), P = [];
      for (let j = 0; j < 14; j++) { const t = j / 14 * 6.283, w = 1 + .18 * Math.sin(t * (2 + (i % 3)) + r()); P.push({ x: x + Math.cos(t) * rad * w, y: y + Math.sin(t) * rad * w * .8 }); }
      T.make('fx', P, { fx, seed: (r() * 4294967296) >>> 0, grown: true }); } };
  T.save = () => T.list.filter(t => !t.link).map(t => ({ id: t.id, kind: t.kind, pts: t.pts.map(q => [+q.x.toFixed(3), +q.y.toFixed(3)]), seed: t.seed, fx: t.fx, row: t.row, grown: t.grown ? 1 : 0, carry: t.carry != null ? t.carry : undefined, L0: t.L0 ? +t.L0.toFixed(3) : undefined, A0: t.A0 ? +t.A0.toFixed(3) : undefined }));
  T.load = arr => { T.list.length = 0; for (const t of arr || []) T.make(t.kind, t.pts.map(q => ({ x: q[0], y: q[1] })), { id: t.id, seed: t.seed, fx: t.fx, row: t.row, grown: t.grown, L0: t.L0, A0: t.A0 }); for (const t of arr || []) if (t.carry != null) { const th = T.list.find(x => x.id === t.id); if (th) th.carry = t.carry; } };
  if (persist && persist.register) persist.register('things', { save: () => T.save(), load: data => T.load(data), optional: true });
  if (sim) { sim.itemMod = T.itemMod; sim.itemTouch = T.itemTouch; sim.placed = T;   // NOT sim.things (that is the shared tappable-things list, sim.js)
    const prev = sim.onStroke; sim.onStroke = (pts, toW, e) => (prev && prev(pts, toW, e)) || T.stroke(pts, toW); }
  if (bus) bus.on('touch', ev => { if (ev.kind !== 'tap' || ev.x == null) return; const th = T.hitAt(ev.x, ev.y); if (th) T.play(th, .7, undefined, 'player'); });
  // drawing (screen overlay, cheap: <= 24 outlines); objects you can see and find again
  T.draw = () => { if (!canvas || !size || !T.list.length) return; const g = canvas.getContext('2d'), { W, H } = size(); if (!W || !sim.cam) return; const dpr = canvas.width / W, now = Date.now(), s = {};
    g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineCap = g.lineJoin = 'round'; const nl = noLine('lnThings');   // v0.0.30 B14 lnThings: the fallback fx zone / membrane are fills (a second, denser fill instead of the rim); strings + bars are lines by nature, kept
    for (const th of T.list) { const c = toScreen(W, H, sim.cam, th.x, th.y, s), R = th.r * c.s; if (c.x + R < -20 || c.x - R > W + 20 || c.y + R < -20 || c.y - R > H + 20) continue;
      const P = th.pts.map(q => { const p = toScreen(W, H, sim.cam, q.x, q.y); return [p.x, p.y]; }), glow = th.hit ? Math.max(0, 1 - (now - th.hit) / 400) : 0;
      const ct = th.tied && th.deg != null && music && music.chord && music.chord.tones.some(t => ((t - th.deg) % 7 + 7) % 7 === 0) ? .15 : 0;   // a tied string on the chord sounding now
      const look = d.look || (d.render && d.render.look);   // the real look (look/thing.js, Visuals): material in place of the outline; opts.realLook.thing = false opts out
      if (look && look.thing && look.thing(g, th, c.x, c.y, R, { P, glow, chord: ct, now })) continue;
      g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
      if (th.kind === 'fx') { const C = FX[th.fx].col, pu = .5 + .5 * Math.sin(now / 700 + th.seed % 7); g.closePath(); g.fillStyle = `rgba(${C[0]},${C[1]},${C[2]},${.12 + .08 * pu})`; g.fill(); if (nl) { g.fillStyle = `rgba(${C[0]},${C[1]},${C[2]},${.1 + .06 * pu})`; g.fill(); } else { g.strokeStyle = `rgba(${C[0]},${C[1]},${C[2]},.75)`; g.lineWidth = 2; g.stroke(); } }
      else if (th.kind === 'membrane') { g.closePath(); g.fillStyle = `rgba(240,225,200,${.18 + .4 * glow})`; g.fill(); if (nl) { g.fillStyle = `rgba(250,240,220,${.12 + .2 * glow})`; g.fill(); } else { g.strokeStyle = 'rgba(250,240,220,.85)'; g.lineWidth = 3; g.stroke(); } }
      else {
        g.strokeStyle = `rgba(255,245,225,${Math.min(1, .7 + ct + .3 * glow)})`; g.lineWidth = th.kind === 'bar' ? 6 : 1.6 + 2 * glow; g.stroke(); } }
    g.restore(); };
  return T; }
