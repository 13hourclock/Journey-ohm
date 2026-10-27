// DRAWN INSTRUMENTS, the rest of V08 section P (Wilbow 3:19 / 3:20 AM MDT Oct 23; Q120-Q129 defaults "yes"; MT 4.7 bar ratios).
// Checked line by line in audits/drawn_instruments_P_check.md. Each part has its own switch (main.js); defaults = the approved text.
//  P5 OHMS PLAY YOUR SHAPES (opts.on): an on-screen ohm within 300 px (6 world units) of a drawn string / bar / blob decides at most
//     once per 4 bars whether to play it, by its own instrument's exciter (palette row exc: strike / scrape -> strikes, pluck -> picks,
//     bow / blow -> one long bowed note a bar, voc -> sings to it: when its note is within 30 cents of the shape (or an octave) the
//     shape rings back softly, v .15, no strike) x a fixed per-ohm liking (its habit, so you learn who does what) x register fit
//     (the shape within an octave of the ohm's own range). Hits land on the bar grid of the one shared clock; the notes are the
//     shape's own (already snapped to the key by P2). Off screen nothing runs. No walking toward shapes: movement belongs to the
//     ohms track (sim.js / herd.js) and nothing here may hold an ohm (GESTURES clash).
//  P6 ENSEMBLES 1-4 (opts.ens), recognised only when a shape changes (drawn, moved, removed; a signature checked once a bar),
//     shapes within 250 px (5 units): marimba row (3+ bars within 25 degrees of parallel -> distinct adjacent degrees, long = low,
//     tuned-bar ratios [1, 4, 9.9]; a bar leaving the row gets its own pitch and free-bar ratios back), harp frame (3+ near-parallel
//     strings -> the chord sounding now, re-laid each bar; pluck ohms play it broken), drum circle (3+ blobs round a spot ->
//     strikers share the beat by size: big low, middle back beat, small time), drone rod (a string or bar >= 300 px -> its pitch
//     snaps to the home note or fifth when within 50 cents; with 2+ bowing ohms it holds a breathing drone, re-bowed each bar).
//     A new ensemble glows together once and plays one rising sweep across its members.
//  P7 MELODY LEAN (opts.lean): a shape played steadily near an ohm jam (450 px) leans that jam's next phrases toward the shape's
//     line (its last intervals, sung in the jam's key and register): weight .25 cap x activity x closeness, halving every 2 quiet
//     bars, gone after 8; at most 1 phrase in 3 borrows; the jam's own members playing it do not count; bumps count .3.
//     TEMPO LEAN NOT BUILT: this engine has one shared clock locked to the om, so leaning one jam's tempo would move the whole world.
import { noLine, softRing } from './soft.js';   // v0.0.30 lnHints: no outlines
import { recipes, octaveOf } from './recipe.js';
import { PALETTE } from './palette_data.js';
export const SHAPEPLAY_OPTS = { on: true, ens: true, lean: true, seekU: 6, decideBars: 4, maxPer: 3, likeMin: .3, singCents: 30, singV: .15, ensU: 5, par: 25, rodU: 6, droneC: 50,
  leanU: 9, leanCap: .25, leanMax: 1 / 3, bumpW: .3 };
const ROW = new Map(PALETTE.map(e => [e.id, e]));
const hash = (a, b) => { let s = ((a | 0) * 2246822519 + (b | 0) * 3266489917) >>> 0; s = (s ^ (s >>> 15)) >>> 0; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
export const TECHS = ['strike', 'pluck', 'bow', 'sing'];
const KFIT = { membrane: { strike: 1, pluck: 0, bow: 0, sing: 1 }, bar: { strike: 1, pluck: .3, bow: 1, sing: 1 }, string: { strike: .3, pluck: 1, bow: 1, sing: 1 } };
export function techOf(rec) { const row = rec && rec.inst && ROW.get(rec.inst.a), x = (row && row.exc) || { strike: 1 };
  return { strike: (x.strike || 0) + (x.scrape || 0), pluck: x.pluck || 0, bow: (x.bow || 0) + (x.blow || 0), sing: x.voc || 0 }; }
export function createShapePlay({ sim, bus, music, things, autojam, onScreen }) {
  const O = { ...SHAPEPLAY_OPTS }, SP = { opts: O, players: new Map(), q: [], ens: [], sig: '', stats: { decisions: 0, hits: 0, sung: 0, sweeps: 0, borrowed: 0, ensembles: 0 }, sum: new Map(), lastBar: -1 };
  const T = things, TO = T.opts, see = (x, y) => !onScreen || onScreen(x, y);
  const live = th => th.src && !th.link && th.carry == null && th.kind !== 'fx';
  const segD = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1e-9, u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)); return Math.hypot(x - a.x - u * dx, y - a.y - u * dy); };
  const distTo = (th, x, y) => { if (th.kind === 'membrane') return Math.max(0, Math.hypot(x - th.x, y - th.y) - th.r); let m = 1e9; for (let j = 1; j < th.pts.length; j++) m = Math.min(m, segD(x, y, th.pts[j - 1], th.pts[j])); return m; };
  // degrees of the current scale <-> Hz (any tuning: music.cents())
  const degOf = f => { const cs = music.cents(), n = cs.length, c = 1200 * Math.log2(f / music.tonicHz), o = Math.floor(c / 1200), r = c - o * 1200; let bk = 0, bd = 1e9;
    for (let k = 0; k <= n; k++) { const v = k < n ? cs[k] : 1200, d = Math.abs(r - v); if (d < bd) { bd = d; bk = k; } } return o * n + bk; };
  const hzOf = d => music.hz(d, 0);
  SP.degOf = degOf;
  // ---------------- P5: who plays what ----------------
  SP.choose = o => { const rec = recipes.get(o.recipe); if (!rec || !o.body) return null; const tq = techOf(rec), like = hash(o.seed || o.id, 11), oh = music.hz(0, octaveOf(rec));
    let best = null; for (const th of T.list) { if (!live(th)) continue; const d = distTo(th, o.body.x, o.body.y); if (d > O.seekU) continue; if ((SP.count(th)) >= O.maxPer) continue;
      const reg = Math.abs(Math.log2(th.f / oh)) <= 1.5 ? 1 : .5, kf = KFIT[th.kind] || KFIT.bar;
      for (const t of TECHS) { const s = (tq[t] || 0) * kf[t] * like * reg * (1 - .3 * d / O.seekU); if (s > O.likeMin && (!best || s > best.s)) best = { th, tech: t, s }; } }
    return best; };
  SP.count = th => { let n = 0; for (const p of SP.players.values()) if (p.th === th) n++; return n; };
  const decide = bar => { if (bar % O.decideBars) return; for (const [id, p] of SP.players) if (p.until <= bar || !T.list.includes(p.th)) SP.players.delete(id);
    for (const o of sim.ohms || []) { if (o === sim.ohm || o.parked || o.dead || !o.body || SP.players.has(o.id) || (sim.held && sim.held(o)) || (T.carryOf && T.carryOf(o))) continue;
      if (!see(o.body.x, o.body.y)) continue; let near = false; for (const th of T.list) if (live(th) && Math.abs(th.x - o.body.x) < O.seekU + th.r && Math.abs(th.y - o.body.y) < O.seekU + th.r) { near = true; break; } if (!near) continue;
      SP.stats.decisions++; o.shapeDecB = bar; const c = SP.choose(o); if (c) SP.players.set(o.id, { o, th: c.th, tech: c.tech, until: bar + O.decideBars }); } };
  const ensOf = th => th.ens ? SP.ens[th.ens.i] : null;
  const push = (th, b, vel, by, dur) => SP.q.push({ th, b, vel, by, dur });
  // one bar of notes for every player (scheduled for the next bar, sent when due so the shape glows on its hit)
  const schedule = bar => { const b0 = (bar + 1) * 4, chord = (music.chord && music.chord.tones) || [0, 2, 4], circleDone = new Set();
    for (const [id, p] of SP.players) { const o = p.o, th = p.th; if (o.dead || o.parked || !T.list.includes(th) || !see(th.x, th.y)) { SP.players.delete(id); continue; }
      if (distTo(th, o.body.x, o.body.y) > O.seekU * 1.5) { SP.players.delete(id); continue; }   // it wandered off
      const E = ensOf(th), dens = hash(o.seed || o.id, 5);
      if (p.tech === 'sing') continue;   // sings to it: handled on its own notes (below)
      if (p.tech === 'strike') { if (E && E.kind === 'circle') { if (circleDone.has(E)) continue; circleDone.add(E);   // P6 4: the circle shares the beat by size
          for (const m of E.members) { const r = m.ens.role, bs = r === 'low' ? [0, 2.5] : r === 'back' ? [1, 3] : [.5, 1.5, 2.5, 3.5]; for (const x of bs) push(m, b0 + x, r === 'time' ? .32 : .5, o.id); } continue; }
        if (E && E.kind === 'row' && E.members.length) { const ms = E.members; for (let j = 0; j < 4; j++) { const d = chord[(j + bar) % chord.length], m = ms[((d % ms.length) + ms.length) % ms.length]; push(m, b0 + j, .45, o.id); } continue; }   // P6 2: a striker walks the row on chord tones
        for (const x of dens < .5 ? [0, 2] : [0, 1, 2, 3]) push(th, b0 + x, x ? .38 : .5, o.id); continue; }
      if (p.tech === 'pluck') { if (E && E.kind === 'harp') { const ms = E.members; for (let j = 0; j < 8; j++) push(ms[(j + (bar & 1)) % ms.length], b0 + j * .5, .36, o.id); continue; }   // P6 3: broken chord up the harp
        for (const x of dens < .5 ? [0, 1.5, 2.5] : [0, 2]) push(th, b0 + x, .42, o.id); continue; }
      if (p.tech === 'bow') { const bows = E && E.kind === 'drone' ? [...SP.players.values()].filter(q => q.th === th && q.tech === 'bow').length : 1;
        if (E && E.kind === 'drone' && bows >= 2) { if (E.lastBow === bar) continue; E.lastBow = bar; push(th, b0, .34, o.id, 4 * music.spb() * 1.05); continue; }   // P6 1: the drone, re-bowed each bar
        push(th, b0, .3, o.id, 3.5 * music.spb()); } } };
  const flush = () => { if (!SP.q.length) return; const b = music.beat(); SP.q.sort((x, y) => x.b - y.b);
    while (SP.q.length && SP.q[0].b <= b + .08) { const x = SP.q.shift(); if (!T.list.includes(x.th)) continue; T.play(x.th, x.vel, music.timeOfBeat(Math.max(b, x.b)), x.by, x.dur); SP.stats.hits++; } };
  // sing-to: a singing player's own notes make its shape ring back when they match it (30 cents, or an octave)
  if (bus && bus.on) bus.on('note', ev => { const s = ev.src; if (!O.on || !s || s.scale !== 'ohm' || !(ev.kind === 'note' || ev.kind === 'strike')) return; const p = SP.players.get(s.id); if (!p || p.tech !== 'sing') return;
    const rec = recipes.get(s.recipe); const f = ev.f || (ev.deg != null ? music.hz(ev.deg, ev.oct || (rec ? octaveOf(rec) : 0)) : 0); if (!f) return;
    const c = 1200 * Math.log2(f / p.th.f), m = ((c % 1200) + 1200) % 1200, off = Math.min(m, 1200 - m); if (off > O.singCents) return;
    T.play(p.th, O.singV, ev.t, s.id); SP.stats.sung++; });
  // ---------------- P6: ensembles ----------------
  const angOf = th => { const a = th.pts[0], z = th.pts[th.pts.length - 1]; return ((Math.atan2(z.y - a.y, z.x - a.x) * 180 / Math.PI) % 180 + 180) % 180; };
  const angD = (a, b) => { const d = Math.abs(a - b) % 180; return Math.min(d, 180 - d); };
  const sigOf = () => { let s = ''; for (const th of T.list) if (live(th)) s += th.id + ':' + (th.L || 0).toFixed(2) + ':' + (th.A || 0).toFixed(2) + ':' + th.x.toFixed(1) + ',' + th.y.toFixed(1) + ';'; return s; };
  const cluster = (kind, test) => { const xs = T.list.filter(th => live(th) && th.kind === kind && !th.used), out = [];
    for (const a of xs) { if (a.used) continue; const g = xs.filter(b => !b.used && Math.hypot(b.x - a.x, b.y - a.y) <= O.ensU && test(a, b)); if (g.length >= 3) { for (const b of g) b.used = 1; out.push(g); } } return out; };
  const leave = th => { if (th.ens) { if (th.rec && th.rec.modal) delete th.rec.modal.tuned; if (th.fOwn != null && th.f === th.fLaid) th.f = th.fOwn; delete th.ens; delete th.fOwn; delete th.fLaid; }   /* a shape resized meanwhile keeps its new pitch */ };
  SP.recognise = () => { const old = new Set(SP.ens.map(E => E.kind + ':' + E.members.map(m => m.id).sort().join())); for (const th of T.list) { leave(th); delete th.used; } SP.ens = [];
    if (!O.ens) return SP.ens;
    for (const g of cluster('bar', (a, b) => angD(angOf(a), angOf(b)) <= O.par)) SP.ens.push({ kind: 'row', members: g });
    for (const g of cluster('string', (a, b) => angD(angOf(a), angOf(b)) <= O.par)) SP.ens.push({ kind: 'harp', members: g });
    { const xs = T.list.filter(th => live(th) && th.kind === 'membrane'); for (const a of xs) { if (a.used) continue; const g = xs.filter(b => !b.used && Math.hypot(b.x - a.x, b.y - a.y) <= O.ensU * 2); if (g.length < 3) continue;
        const cx = g.reduce((s, b) => s + b.x, 0) / g.length, cy = g.reduce((s, b) => s + b.y, 0) / g.length, inR = g.filter(b => Math.hypot(b.x - cx, b.y - cy) <= O.ensU); if (inR.length >= 3) { for (const b of inR) b.used = 1; SP.ens.push({ kind: 'circle', members: inR }); } } }
    for (const th of T.list) if (live(th) && !th.used && (th.kind === 'string' || th.kind === 'bar') && th.L >= O.rodU) { th.used = 1; SP.ens.push({ kind: 'drone', members: [th] }); }
    for (const th of T.list) delete th.used;
    SP.ens.forEach((E, i) => { for (const m of E.members) { m.fOwn = m.fLaid = m.f; m.ens = { i, kind: E.kind }; } });
    for (const E of SP.ens) { lay(E, true); for (const m of E.members) m.fLaid = m.f; }
    for (const E of SP.ens) { const k = E.kind + ':' + E.members.map(m => m.id).sort().join(); if (!old.has(k)) { SP.stats.ensembles++; sweep(E); } }
    return SP.ens; };
  // lay an ensemble's pitches (row / circle once; harp each bar to the chord sounding now; drone to the home note or fifth)
  const lay = (E, first) => { const ms = E.members;
    if (E.kind === 'row') { if (!first) return; ms.sort((a, b) => b.L - a.L); const d0 = degOf(ms[0].fOwn); ms.forEach((m, j) => { m.f = hzOf(d0 + j); m.rec.modal.tuned = [1, 4, 9.9]; }); return; }
    if (E.kind === 'circle') { if (!first) return; const s = ms.slice().sort((a, b) => b.A - a.A); s.forEach((m, j) => { m.ens.role = j === 0 ? 'low' : j === s.length - 1 ? 'time' : 'back'; }); return; }
    if (E.kind === 'harp') { ms.sort((a, b) => b.L - a.L); const ch = (music.chord && music.chord.tones) || [0, 2, 4], n = music.cents().length, d0 = degOf(ms[0].fOwn);
      const tones = []; for (let o = Math.floor(d0 / n) - 1; tones.length < ms.length + 8 && o < 12; o++) for (const c of ch.slice().sort((a, b) => a - b)) { const d = o * n + (((c % n) + n) % n); if (d >= d0 - 1) tones.push(d); }
      tones.sort((a, b) => a - b); ms.forEach((m, j) => { if (m.f !== m.fLaid) { m.fOwn = m.f; } m.f = m.fLaid = hzOf(tones[j]); }); return; }
    if (E.kind === 'drone') { const m = ms[0], c = 1200 * Math.log2(m.fOwn / music.tonicHz), r = ((c % 1200) + 1200) % 1200, fifth = music.cents()[4 % music.cents().length];
      const near = (v, t) => Math.min(Math.abs(v - t), Math.abs(v - t - 1200), Math.abs(v - t + 1200)); let tgt = null;
      if (near(r, 0) <= O.droneC) tgt = 0; else if (near(r, fifth) <= O.droneC) tgt = fifth;
      if (tgt != null) { let d = tgt - r; if (d > 600) d -= 1200; if (d < -600) d += 1200; m.f = m.fOwn * Math.pow(2, d / 1200); } } };
  const sweep = E => { const ms = E.members.slice().sort((a, b) => a.f - b.f), b = music.beat(); ms.forEach((m, j) => push(m, b + .1 + j * .25, .3, 'sweep')); SP.stats.sweeps++; E.born = Date.now(); };
  // ---------------- P7: what each shape has been playing (updated on its own strikes only) ----------------
  if (bus && bus.on) bus.on('note', ev => { const s = ev.src; if (!O.lean || !s || s.scale !== 'thing' || ev.kind !== 'note' || ev.by === 'sweep' || ev.by === 'drag') return; const th = T.list.find(t => t.src === s); if (!th) return;
    let S = SP.sum.get(th.id); if (!S) SP.sum.set(th.id, S = { on: [], d: [], who: [] }); const b = ev.t != null ? music.beat(ev.t) : music.beat();
    S.on.push(b); S.d.push(degOf(ev.f * (th.bendR || 1))); S.who.push(ev.by); if (S.on.length > 12) { S.on.shift(); S.who.shift(); } if (S.d.length > 8) S.d.shift(); S.last = b; });
  // weight of the shapes heard by a jam pair (nearest 8 within 450 px; its own members' playing never counts)
  SP.leanFor = P => { if (!O.lean || !P || !P.a || !P.a.body) return null; const mx = (P.a.body.x + P.b.body.x) / 2, my = (P.a.body.y + P.b.body.y) / 2, b = music.beat(), bar = Math.floor(b / 4);
    const cand = []; for (const th of T.list) { const S = SP.sum.get(th.id); if (!S || !S.on.length || S.d.length < 3) continue; const d = Math.hypot(th.x - mx, th.y - my); if (d > O.leanU) continue; cand.push([d, th, S]); }
    cand.sort((x, y) => x[0] - y[0]); let W = 0, top = null;
    for (const [d, th, S] of cand.slice(0, 8)) { const quietBars = Math.max(0, (b - S.last) / 4); if (quietBars >= 8) continue;
      let act = 0; for (let i = 0; i < S.on.length; i++) { if (S.on[i] < S.last - 8) continue; const w = S.who[i]; if (w === P.a.id || w === P.b.id) continue; act += w === 'bump' ? O.bumpW : 1; }
      const w = O.leanCap * Math.min(1, act / 8) * (1 - d / O.leanU) * Math.pow(.5, Math.floor(quietBars / 2)); if (w <= 0) continue; W += w; if (!top || w > top.w) top = { w, th, S }; }
    W = Math.min(O.leanCap, W); if (!top || W <= 0) return null; const iv = top.S.d.slice(-4).map((x, i, a) => i ? x - a[i - 1] : 0).slice(1); return { w: W, iv, th: top.th, x: mx, y: my, bar }; };
  // autojam asks once per turn: borrow the shape's line? (follow strength x openness, never more than 1 phrase in 3)
  SP.borrow = (P, turn, tn) => { const L = SP.leanFor(P); if (!L || !L.iv.length) return null; const open = hash(turn.seed || turn.id, 23), f = Math.min(O.leanCap, L.w * (.5 + .5 * open));
    const K = Math.min(O.leanMax, f * 4 / 3); if (((tn * K) % 1) >= K || (turn.lastBorrow != null && tn - turn.lastBorrow < 3)) return null; turn.lastBorrow = tn; SP.stats.borrowed++; SP.pulse = { th: L.th, x: L.x, y: L.y, t: Date.now(), w: L.w }; return L.iv; };
  // ---------------- tick / draw ----------------
  SP.tick = () => { if (!T || !music || !music.beat) return; flush(); const bar = Math.floor(music.beat() / 4); if (bar === SP.lastBar) return; SP.lastBar = bar;
    const sg = O.ens ? sigOf() : ''; if (sg !== SP.sig) { SP.sig = sg; SP.recognise(); } else for (const E of SP.ens) if (E.kind === 'harp') lay(E, false);
    if (!O.ens && SP.ens.length) { for (const th of T.list) leave(th); SP.ens = []; }
    if (!O.on) { SP.players.clear(); SP.q.length = 0; return; } decide(bar); schedule(bar); };
  SP.draw = (g, W, H, toS) => { const now = Date.now(); for (const E of SP.ens) { if (!E.born || now - E.born > 1600) continue; const k = 1 - (now - E.born) / 1600, nl = noLine('lnHints'), lc = g.lineCap; g.strokeStyle = `rgba(255,220,150,${.5 * k})`; g.lineWidth = 2; g.beginPath();
      E.members.forEach((m, j) => { const s = toS(m.x, m.y); if (j) g.lineTo(s.x, s.y); else g.moveTo(s.x, s.y); });
      if (nl) { g.lineCap = 'round'; for (let w = 0; w < 3; w++) { g.strokeStyle = `rgba(255,220,150,${[.08, .1, .12][w] * k})`; g.lineWidth = [9, 5, 2.5][w]; g.stroke(); } g.lineCap = lc; } else g.stroke(); }   // v0.0.30 lnHints: a soft ribbon of light (no hard line)
    const p = SP.pulse; if (p && now - p.t < 900 && T.list.includes(p.th)) { const k = 1 - (now - p.t) / 900, a = toS(p.th.x, p.th.y), b = toS(p.x, p.y), u = 1 - k; g.fillStyle = `rgba(255,240,200,${.6 * k})`; g.beginPath(); g.arc(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, 3, 0, 7); g.fill(); } };
  return SP;
}
