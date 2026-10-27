// JAMS YOU WATCH GROW (old game R3.15 / V07 section E, Wilbow 12:16 AM MDT Oct 23: "Watched, fully matched jams grow longer and more
// complex; keep old loop; keep what works; explore in small doses"). Built natively on the new engine's ohm jams (autojam.js pairs):
//   ATTENTION  while a jam stays on screen, near the middle, and you are not panning away, it gains attention (seconds). Looking away
//              pauses it (nothing is erased); the jam keeps playing what it has built while you are not watching.
//   GATE       it only GROWS while every playing member is matched: in time (the notes' ahead / behind lean, rare.js, within leanMs) and
//              in harmony (each note on a strong beat is a tone of the chord sounding in that bar). Anyone out = growth pauses.
//   GROWTH     the shared loop grows in phrase steps 2 -> 4 -> 8 -> 16 bars (call + answer first). The OLD loop is kept inside the new one
//              (A -> A A' -> A A' B A''), the new half a development of it: motif moved to the next chord tone, a fill on the last
//              beat, the line turned upside down for B; later levels add subdivisions and passing notes (always on the scale, chord tones
//              on strong beats, so the theory holds and the time never breaks). Degrees are kept against the chord, so it follows the
//              moving harmony (and jamKeys).
//   KEEP WHAT WORKS / EXPLORE  a newly grown half is a TRIAL: if a member falls out while it plays (its first 2 passes) it is dropped and
//              the jam goes back to its proven loop. Every 4 passes one bar gets a small variation (a fill / a neighbour note): kept if the
//              pass stays matched, else reverted.
//   Growth adds experience to the members (rare.js xp). Posts 'jam.grow' { key, len, x, y } / 'jam.revert'.
// Switch 'jamGrow' (ON); off = v0.0.28 (autojam's own phrases). Cost: a few array ops per bar per watched jam.
// SONG GROUPS GROW TOO (the old game grew every jam, songs included: exp.js growUp, A -> A A' -> A A' Q A'). A song group (songs.js, 2-4 ohms
// playing a chart) that you keep watching while it is matched (its members' versions close: songs.discord <= songDrift, nobody muted, you not
// cutting in) gains attention; at the end of a play the next play of that song comes back longer, the proven form kept whole inside it:
//   1: the opening section answered by a varied repeat (A A' ...; A' ends on a turnaround to V, and it is not the hook, so the parts vary)
//   2: + a development section before the final return (the opening chords a fourth up, ending on V)
//   3: + its varied repeat (D D').  Capped at songMaxBars. The library song is never changed (only the group's own layout, songs.js G.L).
// A grown play is a TRIAL: if the group slips while it plays (discord over the line, someone muted / leaving, you cutting in) the growth is
// dropped at its end and the group goes back to the proven form. Growth counts as experience. Switch 'jamGrowSongs' (ON).
export const JAMGROW_OPTS = { on: true, need: [8, 14, 22, 32], maxLvl: 3, centre: .4, panPx: 260, leanMs: 24, trialPasses: 2, exploreEvery: 4, xp: .6,
  songs: true, songNeed: [16, 24, 32], songMaxLvl: 3, songDrift: .25, songMaxBars: 64 };
const u01 = (...a) => { let h = 2166136261; for (const x of a) { h ^= (x | 0) >>> 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return (h >>> 0) / 4294967296; };
const CT = [0, 2, 4];   // chord tones as offsets from the chord root; a motif moves / mirrors in chord-tone steps so strong beats stay chord tones
const ctUp = off => { const o = Math.floor(off / 7), c = off - 7 * o, k = CT.indexOf(c); return k < 0 ? off + 1 : k === 2 ? 7 * (o + 1) : 7 * o + CT[k + 1]; };
const ctMirror = off => { const o = Math.floor(off / 7), c = off - 7 * o, k = CT.indexOf(c); if (k < 0) return -off; const v = -(3 * o + k), o2 = Math.floor(v / 3); return 7 * o2 + CT[v - 3 * o2]; };
export { ctUp, ctMirror };
export function develop(bars, lvl, seed) {   // the new half of a loop from the proven one (chord-relative degrees: 0 = chord root, 2 = third, 4 = fifth)
  const half = bars.length, out = [];
  for (let i = 0; i < half; i++) { const src = bars[i], ns = src.notes.map(n => ({ ...n }));
    if (lvl >= 2 && i < half / 2) { for (const n of ns) n.off = ctMirror(n.off); }   // B: the line upside down, chord tone for chord tone (A A' B A'')
    else if (i === half - 1) { const l = ns[ns.length - 1]; if (l && l.b < 3.5) ns.push({ b: Math.min(3.75, Math.max(l.b + .5, 3.5)), off: l.off + (u01(seed, i) < .5 ? 1 : -1), dOct: l.dOct, vel: l.vel * .8, fill: 1 }); }   // a fill on the last beat
    else for (const n of ns) n.off = ctUp(n.off);   // A': the motif one chord tone up
    if (lvl >= 1) { const add = []; for (let j = 0; j + 1 < ns.length; j++) { const a = ns[j], b = ns[j + 1]; if (b.b - a.b >= 1 && (a.b + .5) % 2 !== 0 && u01(seed, i, j, lvl) < .25 * lvl) add.push({ b: a.b + .5, off: Math.round((a.off + b.off) / 2), dOct: a.dOct, vel: a.vel * .7, pass: 1 }); } ns.push(...add); ns.sort((x, y) => x.b - y.b); }   // subdivisions / passing notes
    out.push({ notes: ns, dev: lvl + 1 }); }
  return out; }
const SEC_NAMES = ["'", 'D', "D'"];
export function grownLayout(s, lvl, maxBars = 64) {   // the song's bars with lvl growth steps; the original form stays whole, in order
  const P = s.form[0], A = s.sec[P] || [], turn = r => (r === 4 ? 1 : 4), extra = {};
  if (lvl >= 1) extra[P + "'"] = A.slice(0, -1).concat(turn(A[A.length - 1]));
  if (lvl >= 2) extra.D = A.map(r => (r + 3) % 7).slice(0, -1).concat(4);
  if (lvl >= 3) extra["D'"] = extra.D.slice().reverse().slice(0, -1).concat(4);
  const form = s.form.slice(); if (lvl >= 1) form.splice(form.indexOf(P) + 1, 0, P + "'");
  if (lvl >= 2) { let at = form.length - 1; if (at < 2) at = form.length; form.splice(at, 0, ...(lvl >= 3 ? ['D', "D'"] : ['D'])); }
  const out = []; for (const n of form) (extra[n] || s.sec[n] || []).forEach((r, i) => out.push({ r, sec: n, i, first: i === 0, grown: extra[n] ? 1 : 0 }));
  (s.end || []).forEach((r, i) => out.push({ r, sec: 'end', i, first: i === 0 }));
  if (out.length > maxBars && lvl > 0) return grownLayout(s, lvl - 1, maxBars);
  out.form = form; return out; }
export function createJamGrow({ sim, bus, music, autojam, view, rare, songs = null, opts = {} }) {
  const O = { ...JAMGROW_OPTS, ...opts }, G = { opts: O, j: new Map(), rec: new Map(), chordAt: new Map(), owner: new Map(), lastBar: -1, grown: 0, reverts: 0, explores: 0, kept: 0, ms: 0 };
  const keyOf = P => Math.min(P.a.id, P.b.id) + '-' + Math.max(P.a.id, P.b.id);
  const st = P => { const k = keyOf(P); let s = G.j.get(k); if (!s) G.j.set(k, s = { key: k, att: 0, lvl: -1, loop: null, start: 0, trial: -1, trialPass: 0, pass: 0, exp: null, seen: 0, last: null, sx: null, sy: null, bad: 0 }); s.P = P; return s; };
  // record what each pair actually played (chord-relative), per bar
  if (bus && bus.on) bus.on('note', ev => { if (!ev || !ev.auto || !ev.jam || ev.song || ev.deg == null) return; const o = ev.src, k = o && G.owner.get(o.id); if (!k) return;
    const b = ev.beat != null ? ev.beat : music.beat(ev.t), bar = Math.floor(b / 4); let R = G.rec.get(k); if (!R) G.rec.set(k, R = []);
    let e = R.find(x => x.bar === bar); if (!e) { R.push(e = { bar, who: o.id, notes: [], root: music.chord ? music.chord.root : 0 }); if (R.length > 6) R.shift(); }   // the chord the jam played this bar against
    e.notes.push({ b: b - bar * 4, deg: ev.deg, oct: ev.oct || 0, vel: ev.vel || .5, ev }); });   // ev kept: rare.js writes its ahead / behind lean onto it
  const chordTones = r => [r, r + 2, r + 4].map(x => ((x % 7) + 7) % 7);
  const matchedBar = e => { if (!e || !e.notes.length) return true; const r = e.root != null ? e.root : G.chordAt.has(e.bar) ? G.chordAt.get(e.bar) : 0, ct = chordTones(r);
    for (const n of e.notes) { if (Math.abs(n.b - Math.round(n.b)) < .01 && (Math.round(n.b) % 2 === 0) && !ct.includes(((n.deg % 7) + 7) % 7)) return false; } return true; };
  const toRel = (e, root) => ({ notes: e.notes.map(n => ({ b: n.b, off: n.deg - root, dOct: 0, vel: n.vel })), dev: 0 });
  // ---- song groups (songs.js): attention, match, grow at the end of a play, trial / drop
  const SG = G.sg = new Map(); G.songGrown = 0; G.songKept = 0; G.songDrops = 0;
  const S_ = () => (typeof songs === 'function' ? songs() : songs);
  const sgOf = g => { let r = SG.get(g); if (!r) SG.set(g, r = { att: 0, lv: {}, trial: null, sx: null, sy: null, watched: false, bad: 0 }); return r; };
  const songMatched = (S, g) => g.members.length >= 2 && !g.members.some(m => m.muted) && S.discord(g) <= O.songDrift && !(g.touch >= g.start);
  const songsOn = () => O.on && O.songs;
  if (bus && bus.on) bus.on('song.end', ev => { const g = ev && ev.group, S = S_(); if (!songsOn() || !g || !S || !g.song) return; const r = sgOf(g), id = g.song.id, lv = r.lv[id] || 0;
    if (r.trial && r.trial.id === id) { const T = r.trial; r.trial = null;
      if (T.fail || !songMatched(S, g)) { r.lv[id] = Math.max(0, lv - 1); G.songDrops++; G.reverts++; r.att = 0; if (bus.post) bus.post({ type: 'jam.revert', key: 'song:' + g.id, song: 1 }); return; }
      G.songKept++; G.kept++; }
    const need = O.songNeed[Math.min(O.songNeed.length - 1, lv)];
    if (lv < O.songMaxLvl && r.att >= need && songMatched(S, g)) { const L = grownLayout(g.song, lv + 1, O.songMaxBars); if ((L.form || []).length <= (grownLayout(g.song, lv, O.songMaxBars).form || []).length) return;   // capped
      r.lv[id] = lv + 1; r.ever = 1; r.trial = { id, fail: 0 }; r.att = 0; G.songGrown++; G.grown++; if (rare && rare.addXp) for (const m of g.members) rare.addXp(m, O.xp);
      const p = g.members[0].body; if (bus.post) bus.post({ type: 'jam.grow', key: 'song:' + g.id, song: 1, len: L.length, lvl: lv + 1, form: L.form.join(' '), x: p.x, y: p.y }); } });
  // songs.js start(): the group's layout for this song (null = untouched, as v0.0.28, until this group has grown once)
  G.songLayout = (g, s) => { if (!songsOn()) return null; const r = SG.get(g); if (!r || !r.ever) return null; const lv = r.lv[s.id] || 0; return grownLayout(s, lv, O.songMaxBars); };
  G.songLevel = (g, s) => { const r = SG.get(g); return r && s ? r.lv[s.id] || 0 : 0; };
  const songBar = () => { const S = S_(); if (!songsOn() || !S || !S.groups) return; for (const [g] of SG) if (!S.groups.includes(g)) SG.delete(g);
    for (const g of S.groups) { if (g.state !== 'song') continue; const r = sgOf(g), ok = songMatched(S, g); r.bad = ok ? 0 : r.bad + 1; if (!ok && r.trial && g.song && r.trial.id === g.song.id) r.trial.fail = 1; } };
  const songAtt = (V, dt) => { const S = S_(); if (!songsOn() || !S || !S.groups) return;
    for (const g of S.groups) { if (g.state !== 'song' || !g.members.length) continue; const r = sgOf(g); let x = 0, y = 0; for (const m of g.members) { x += m.body.x; y += m.body.y; } const p = V.toS(x / g.members.length, y / g.members.length);
      const dc = Math.hypot(p.x - V.W / 2, p.y - V.H / 2), sp = r.sx == null ? 0 : Math.hypot(p.x - r.sx, p.y - r.sy) / Math.max(1e-3, dt); r.sx = p.x; r.sy = p.y;
      r.watched = dc < O.centre * Math.min(V.W, V.H) && sp < O.panPx; if (r.watched && !r.bad) r.att += dt; } };
  // per control tick: attention from the view
  G.tick = dt => { if (!O.on) return; const bar = Math.floor(music.beat() / 4); if (bar !== G.lastBar) { G.lastBar = bar; G.bar(bar); }
    const V = view && view(); if (!V || !V.W) return;
    for (const s of G.j.values()) { const P = s.P; if (!P || !P.a.body || !P.b.body) continue; const p = V.toS((P.a.body.x + P.b.body.x) / 2, (P.a.body.y + P.b.body.y) / 2);
      const dc = Math.hypot(p.x - V.W / 2, p.y - V.H / 2), sp = s.sx == null ? 0 : Math.hypot(p.x - s.sx, p.y - s.sy) / Math.max(1e-3, dt); s.sx = p.x; s.sy = p.y;
      s.watched = dc < O.centre * Math.min(V.W, V.H) && sp < O.panPx; if (s.watched && !s.bad) s.att += dt; }
    songAtt(V, dt); };
  G.bar = bar => { const t0 = performance.now(); G.chordAt.set(bar, music.chord ? music.chord.root : 0); for (const b of G.chordAt.keys()) if (b < bar - 8) G.chordAt.delete(b);
    const aj = sim.opts && sim.opts.autojam; G.owner.clear();
    for (const P of (autojam && autojam.jams) || []) { if (aj && P.k < Math.max(aj.droneK || 0, .2)) continue; const s = st(P); s.seen = bar; G.owner.set(P.a.id, s.key); G.owner.set(P.b.id, s.key);
      const R = G.rec.get(s.key) || [], prev = R.find(x => x.bar === bar - 1), lv = []; for (const e of R) if (e.bar >= bar - 2 && e.bar < bar && !(sim.byId && sim.byId.get(e.who) && sim.byId.get(e.who).muted)) for (const n of e.notes) lv.push((n.ev && n.ev.lean) || 0);
      const tight = !lv.length || Math.max(...lv) - Math.min(...lv) <= O.leanMs, ok = tight && [P.a, P.b].every(m => m.muted || !prev || prev.who !== m.id || matchedBar(prev));   // in time together (ahead / behind spread) + in harmony
      s.bad = ok ? 0 : s.bad + 1;
      if (s.loop) { const idx = ((bar - 1 - s.start) % s.loop.length + s.loop.length) % s.loop.length;
        if (!ok && s.trial >= 0 && idx >= s.trial) { s.loop = s.loop.slice(0, s.trial); s.lvl--; s.trial = -1; G.reverts++; s.att = 0; if (bus.post) bus.post({ type: 'jam.revert', key: s.key }); }   // the new part did not hold: back to what worked
        else if (s.exp && idx === s.exp.i) { if (ok) { G.kept++; } else { s.loop[s.exp.i] = s.exp.old; } s.exp = null; }
        if (idx === s.loop.length - 1) { s.pass++; if (s.trial >= 0 && ok && ++s.trialPass >= O.trialPasses) { s.trial = -1; for (const B of s.loop) B.works = 1; }
          if (s.trial < 0 && s.lvl >= 1 && s.pass % O.exploreEvery === 0) { const i = 1 + Math.floor(u01(P.a.seed, s.pass) * (s.loop.length - 1)), old = s.loop[i], ns = old.notes.map(n => ({ ...n })), l = ns[ns.length - 1];   // a small dose: one bar, a neighbour note or a fill
            if (l) { if (l.b <= 3) ns.push({ b: Math.min(3.75, l.b + .5), off: l.off + 1, dOct: l.dOct, vel: l.vel * .75, fill: 1 }); else l.off += (u01(P.b.seed, s.pass) < .5 ? 1 : -1); s.loop[i] = { notes: ns, dev: old.dev, exp: 1 }; s.exp = { i, old }; G.explores++; } } } }
      const need = O.need[Math.min(O.need.length - 1, s.lvl + 1)];
      if (O.on && ok && s.lvl < O.maxLvl && s.att >= need && s.trial < 0 && !s.exp && (!s.loop || ((bar - s.start) % s.loop.length === 0))) {
        if (!s.loop) { const two = R.filter(x => x.bar >= bar - 2 && x.bar < bar && x.notes.length); if (two.length < 2) continue; s.loop = two.map(e => toRel(e, e.root != null ? e.root : 0)); s.start = bar - ((bar - two[0].bar) % 2); s.lvl = 0; }
        else { const add = develop(s.loop, s.lvl + 1, P.a.seed ^ P.b.seed); s.trial = s.loop.length; s.trialPass = 0; s.loop = s.loop.concat(add); s.lvl++; }
        s.att = 0; G.grown++; if (rare && rare.addXp) { rare.addXp(P.a, O.xp); rare.addXp(P.b, O.xp); }
        if (bus.post) bus.post({ type: 'jam.grow', key: s.key, len: s.loop.length, lvl: s.lvl, x: (P.a.body.x + P.b.body.x) / 2, y: (P.a.body.y + P.b.body.y) / 2 }); } }
    for (const [k, s] of G.j) if (bar - s.seen > 8) { G.j.delete(k); G.rec.delete(k); }
    songBar();
    G.ms = G.ms * .8 + (performance.now() - t0) * .2; };
  // autojam.js hook: this turn's notes from the grown loop (or null = autojam's own phrase)
  G.turn = (P, turn, nextBar, chord, oct) => { if (!O.on) return null; const s = G.j.get(keyOf(P)); if (!s || !s.loop || !s.loop.length) return null;
    const B = s.loop[((nextBar - s.start) % s.loop.length + s.loop.length) % s.loop.length], r = chord[0];
    return B.notes.map(n => ({ b: nextBar * 4 + n.b, deg: r + n.off, oct: oct + (n.dOct || 0), vel: (.25 + .45 * P.k) * (n.vel > 0 ? Math.min(1.2, n.vel / .6) : 1), grown: 1 })); };
  G.of = (a, b) => G.j.get(Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id)) || null;
  return G;
}
