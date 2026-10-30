// SYSTEMS: SONGS ARE SEPARATE FROM JAMS, AND OHMS WORK TOWARD SONGS (Wilbow 8:50 PM Oct 24: "We need something like a library of songs
// for development. The ohms need to be working towards making a song out of a jam. The world reacts in different ways to a song than
// a jam"; 9:18 PM: "I want to separate a jam from a song"; 8:55 PM: "keep each planet as one tradition for now. The ohms should be
// able to make successful song with the theory naturally and be already doing that when you encounter a group of them").
//   JAM  = the live playing (autojam.js pairs, jam.js with you): loose, moving harmony, no form, no ending.
//   SONG = a fixed piece: a chart (chords per bar) in sections, a returning hook, an ending; kept in the song library (notes + rhythm +
//          the members' recipe seeds), replayable, editable in the river (daw.js), and it can become the planet's tradition.
//   A jam becomes a song when a HOOK CATCHES: the same short phrase keeps coming back (and is picked up by another member) after the
//   group has jammed a while. Groups you meet are already playing a song of their planet's tradition; between songs they jam.
//   Each member plays ITS VERSION: learned with some drift (it can learn a song wrong; the true song stays in the library); drift
//   is heard as wrong notes (discord) and shrinks with each play and when you play the hook's notes near them.
//   SETTLED songs become loops (12:46 AM Oct 25): after opts.settle unchanged plays the whole part list is cached and replayed
//   (cheap), fading with distance and merging to one line far away; live again the moment you play, sing or tap near it.
//   Who plays the hook, the answers or the low notes comes from the members' genes and registers in that group (no fixed roles).
//   The world hears it: global streams song.on / song.hook / song.section / song.end / song.discord / jam.toSong (influence matrix
//   sources), events song.start / song.section / song.end / song.caught, and look bursts at a song's start, hook returns and ending.
import { recipes, octaveOf } from './recipe.js';
import { rng } from './rng.js';
import { SOURCES } from './matrix.js';
import { noLine, softPool, softDot } from './soft.js';   // v0.0.30 B7: no outlines
export const SONG_OPTS = { strongSnap: true, on: true, catchN: 3, minBars: 8, slowBars: 24, maxGroup: 4, settle: 2, meet: true, carry: .45, rest: [4, 12], tradPlays: 3, reach: 4,
  sectionBang: .25,
  momentK: .3, cadenceN: 3,
  breakdown: true, bdChance: .25, bdLen: [2, 4], bdMin: 3,
  // v0.0.25 SONGS BECOME A PLACE'S TRADITION (NEW_ENGINE 12.1 #2 + #21, PLAN_REAL_PLANET 18.8, Q149 D "grow from the player's songs"):
  // a song played tradPlays times becomes its planet's tradition (s.trad, unchanged); now that MEANS something there: a resting group on
  // that planet picks one of its traditional songs tradPick of the time (one its members know first) and learns it with the usual drift,
  // and a child born to parents who know a tradition knows it too, a little more drifted (kinDrift + its own genes). Off = v0.0.24 (a label).
  placeTrad: true, tradPick: .4, kinDrift: .08,
  // v0.0.25 smoothness: a song's next bar is no longer sent all at once on the bar line; each note goes out up to spreadLook beats before it
  // sounds, at most spreadMax per control tick unless due (same notes, same times; the bar-line burst that caused a hitch is gone). Off = v0.0.24.
  spread: true, spreadLook: 1, spreadMax: 6 };   // BREAKDOWNS (R3.9, Wilbow 10:44 AM Oct 22 card answer "Yes, add breakdowns"): see bdPick below   // big moments (world 'moment' / st.big): only for a song this present (G.k), cadence only for a group of >= cadenceN   // PROPOSAL (overlay fix): look burst when a song returns to its first section; was .6, which crossed the look's big-event trigger (.3) every few bars -> full-screen pattern. .6 = old
for (const k of ['song.on', 'song.hook', 'song.section', 'song.end', 'song.discord', 'jam.toSong']) if (!SOURCES.includes(k)) SOURCES.push(k);
const hsh = (...a) => { let h = 2166136261; for (const x of a) { h ^= (x | 0) >>> 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return h >>> 0; };
const u01 = (...a) => hsh(...a) / 4294967296;
export const barsOf = s => { const out = []; for (const n of s.form) (s.sec[n] || []).forEach((r, i) => out.push({ r, sec: n, i, first: i === 0 })); (s.end || []).forEach((r, i) => out.push({ r, sec: 'end', i, first: i === 0 })); return out; };
const N = (d, b, len = 1, vel = .7) => ({ d, b, len, vel });
const seq = (ds, lens, vel = .7) => { let b = 0; return ds.map((d, i) => { const n = N(d, b, lens ? lens[i] : 1, vel); b += n.len; return n; }); };
// DEV SONG LIBRARY (public-domain melodies in scale degrees of the current key + charted progressions; degrees 0 = tonic)
export const DEV_SONGS = [
  { id: 'dev.ode', name: 'Ode to Joy (public domain)', origin: 'dev', sec: { A: [0, 4, 0, 4, 0, 4, 0, 0], B: [4, 0, 4, 0, 4, 0, 4, 4] }, form: ['A', 'A', 'B', 'A'], end: [4, 0],
    hook: seq([2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, .5, 2]), hookBars: 4 },
  { id: 'dev.twinkle', name: 'Twinkle (public domain)', origin: 'dev', sec: { A: [0, 3, 3, 0], B: [0, 3, 0, 4] }, form: ['A', 'B', 'B', 'A'], end: [4, 0],
    hook: seq([0, 0, 4, 4, 5, 5, 4], [1, 1, 1, 1, 1, 1, 2]), hookBars: 2 },
  { id: 'dev.frere', name: 'Frère Jacques (public domain)', origin: 'dev', sec: { A: [0, 0, 0, 0], B: [0, 4, 0, 0] }, form: ['A', 'B', 'A'], end: [0],
    hook: seq([0, 1, 2, 0, 0, 1, 2, 0]), hookBars: 2 },
  { id: 'dev.four', name: 'Four chords (I V vi IV)', origin: 'dev', sec: { A: [0, 4, 5, 3, 0, 4, 5, 3], B: [5, 3, 0, 4, 5, 3, 0, 4] }, form: ['A', 'A', 'B', 'A'], end: [3, 4, 0],
    hook: seq([4, 4, 2, 4, 5, 4, 2], [.5, .5, 1, 1, 1, 1, 3]), hookBars: 2 },
  { id: 'dev.blues', name: '12-bar blues (scale degrees)', origin: 'dev', sec: { A: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4] }, form: ['A', 'A', 'A'], end: [0],
    hook: seq([0, 2, 4, 5, 4, 2], [.5, .5, .5, .5, 1, 1]), hookBars: 1 },
  { id: 'dev.canon', name: 'Canon progression', origin: 'dev', sec: { A: [0, 4, 5, 2, 3, 0, 3, 4] }, form: ['A', 'A', 'A', 'A'], end: [0],
    hook: seq([7, 6, 5, 4, 3, 2, 3, 4], [2, 2, 2, 2, 2, 2, 2, 2]), hookBars: 4 }];
// ONE TRADITION PER PLANET (8:55 PM Oct 24, "for now"): a seeded family of forms, section lengths, chord moves, cadences and rhythm
// cells. PROPOSAL until the music overhaul / instruments track give real traditions; world.tradition(planet) replaces it when present.
export function tradition(seed) { const r = rng(hsh(seed, 0x7ad)), pick = a => a[Math.floor(r() * a.length)];
  const forms = [['A', 'A', 'B', 'A'], ['A', 'B', 'A', 'B'], ['A', 'A', 'B'], ['A', 'B', 'A', 'C'], ['A', 'B']], moves = Array.from({ length: 7 }, () => Array.from({ length: 7 }, () => r()));
  for (let i = 0; i < 7; i++) { moves[i][(i + 3) % 7] += .8; moves[i][(i + 4) % 7] += .9; moves[i][(i + 5) % 7] += .5; moves[i][i] *= .3; }   // fourths / fifths / thirds lean (functional moves)
  const cells = [[1, 1, 1, 1], [.5, .5, 1, 2], [1.5, .5, 2], [1, .5, .5, 2], [.5, .5, .5, .5, 2], [2, 1, 1], [.75, .25, 1, 2]];
  return { seed, form: pick(forms), len: pick([4, 4, 8]), moves, bStart: pick([3, 5, 4]), cad: pick([[4, 0], [3, 4, 0], [3, 0], [1, 4, 0]]), cells: [pick(cells), pick(cells), pick(cells)], hookBars: pick([1, 2, 2]) }; }
const walk = (T, r, start, len, endOn) => { const out = [start]; for (let i = 1; i < len; i++) { const w = T.moves[out[i - 1]]; let t = 0; for (const x of w) t += x; let u = r() * t, k = 0; for (; k < 6; k++) { u -= w[k]; if (u <= 0) break; } out.push(k); }
  if (endOn != null) out[len - 1] = endOn; return out; };
export function songFromTradition(T, seed, name) { const r = rng(hsh(T.seed, seed)), sec = {}; const A = walk(T, r, 0, T.len, 4), B = walk(T, r, T.bStart, T.len, 4), C = walk(T, r, T.bStart === 5 ? 3 : 5, T.len, 0);
  sec.A = A; if (T.form.includes('B')) sec.B = B; if (T.form.includes('C')) sec.C = C;
  // wave 2: a tradition with fixed charts (12-bar blues, ii-V-I, iv-II-I...) plays one of them (picked by the song seed); the hook and cadence as before
  let form = T.form, end = T.cad; if (T.charts && T.charts.length) { const ch = T.charts[Math.floor(r() * T.charts.length)]; for (const k in ch.sec) sec[k] = ch.sec[k].slice(); for (const k of Object.keys(sec)) if (!ch.sec[k]) delete sec[k]; if (ch.form) form = ch.form; if (ch.end) end = ch.end; }
  const tones = [A[0], A[0] + 2, A[0] + 4, A[0] + 7], hook = []; let b = 0, d = tones[Math.floor(r() * 3)];
  for (let bar = 0; bar < T.hookBars; bar++) for (const len of T.cells[bar % T.cells.length]) { hook.push(N(d, b, len, .6 + r() * .3)); b += len; d += r() < .6 ? (r() < .5 ? 1 : -1) : (r() < .5 ? 2 : -2); if (len >= 2) d = tones[Math.floor(r() * 3)]; }
  return { id: 'w.' + T.seed.toString(36) + '.' + seed.toString(36), name: name || 'song ' + seed.toString(36).slice(-4), origin: 'world', planetSeed: T.seed, sec, form: form.slice(), end: end.slice(), hook, hookBars: T.hookBars }; }
export function createSongs(sim, bus, music, harmony, autojam, opts = {}) {
  const O = { ...SONG_OPTS, ...opts }, S = { opts: O, lib: new Map(), groups: [], jams: new Map(), met: new Set(), lastBar: -1, ms: 0, carrier: null, pushB: -99, starts: 0, caught: 0, ends: 0, sig: {} };
  for (const s of DEV_SONGS) S.lib.set(s.id, { ...s, plays: 0, made: 0 });
  const W = () => sim.world, R = () => sim.brain, pos = o => o.body, near = c => (sim.opts.autojam && sim.opts.autojam[c]) || 0;
  const planetSeed = () => { const w = W(); return (w && w.pseed) || (w && w.seed) || 1; };
  const T = () => { const w = W(), ps = planetSeed(); if (w && w.tradition) return w.tradition(ps); if (!S._t || S._t.seed !== ps) S._t = tradition(ps); return S._t; };
  const groupOf = o => { for (const G of S.groups) if (G.members.includes(o)) return G; return null; };
  S.groupOf = groupOf;
  // Q358: the WHOLE song as a score (every member's part, every bar, river edits included) for the bounce (bounce.js)
  S.score = G => { const L = G.L || (G.L = barsOf(G.song)), notes = []; for (let bi = 0; bi < L.length; bi++) for (const [m, ns] of partsFor(G, bi, L)) for (const n of ns) notes.push({ m, b: bi * 4 + n.b, d: n.d, len: n.len, vel: .75 * (n.vel || .7) }); return { notes, bars: L.length }; };
  // autojam / jam.js ask this: an ohm playing a song is not picked for a jam pair (it is held by its song)
  S.held = o => { const G = groupOf(o); return !!(G && G.state === 'song'); };
  S.add = s => { s.plays = s.plays || 0; s.made = s.made || Date.now(); S.lib.set(s.id, s); bus.post({ type: 'song.lib', song: s }); return s; };
  S.remove = id => { if (!S.lib.has(id)) return false; S.lib.delete(id); for (const G of S.groups) if (G.song && G.song.id === id) end(G, true); return true; };
  S.tradOf = ps => [...S.lib.values()].filter(s => s.trad === ps);
  S.makeTradition = id => { const s = S.lib.get(id); if (s) s.trad = planetSeed(); return s; };
  // knowledge through offspring (O.placeTrad): the child knows its parents' traditional songs, its version a little further off
  S.inherited = 0;
  bus.on('breed', ev => { if (!O.placeTrad) return; const br = R(), c = ev.src; if (!br || !c) return;
    for (const p of [ev.a, ev.b]) { if (!p || p === c) continue; for (const e of br.list(p, 'song')) { const s = S.lib.get(e.key); if (!s || s.trad == null || br.get(c, 'song', s.id)) continue;
      const d = Math.min(.9, (e.data && e.data.drift != null ? e.data.drift : .2) + O.kinDrift * (.5 + u01(c.seed || 1, s.id.length, 0x6b1)));
      br.remember(c, 'song', s.id, { drift: d, plays: 0, name: s.name, kin: 1 }, 1, 12); S.inherited++; } } });
  // ---------- jam -> song: listen for a returning phrase ----------
  const keyOf = (a, b) => Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
  const jamKeyOf = o => { const J = sim.jam; if (J && J.partner && (o === J.partner || o === sim.ohm) && J.until > music.beat()) return 'you';
    for (const P of autojam.jams || []) if (P.a === o || P.b === o) return keyOf(P.a, P.b); return null; };
  const buf = new Map();   // src id -> { bar, notes: [] } (this bar's notes)
  const sigOf = ns => { if (ns.length < 2) return null; const s = ns.slice().sort((a, b) => a.b - b.b), r = s.map(x => Math.round((x.b % 4) * 2)), iv = []; for (let i = 1; i < s.length; i++) iv.push(Math.sign(s[i].d - s[i - 1].d) * Math.min(3, Math.abs(s[i].d - s[i - 1].d)));
    return r.join('.') + '|' + iv.join('.'); };
  const closeBar = (src, B) => { if (!B || !B.notes.length) return; const key = jamKeyOf(src); if (!key) return; let J = S.jams.get(key); const bar = B.bar;
    if (!J) S.jams.set(key, J = { key, bars: 0, first: bar, last: -1, sigs: new Map(), roots: [], prog: 0 }); if (J.last !== bar) { J.bars += J.last < 0 || bar - J.last <= 2 ? 1 : 0; J.last = bar; }
    const sg = sigOf(B.notes); if (!sg) return; let e = J.sigs.get(sg); if (!e) J.sigs.set(sg, e = { n: 0, by: new Set(), notes: null, bars: [], root: 0 });
    e.n++; e.by.add(src.id); e.bars.push(bar); while (e.bars.length && e.bars[0] < bar - 16) { e.bars.shift(); e.n = e.bars.length; }
    if (!e.notes || src !== sim.ohm) { const s0 = Math.floor(B.notes[0].b / 4) * 4; e.notes = B.notes.map(x => N(x.d, Math.max(0, Math.min(3.9, x.b - s0)), x.len || .5, x.vel || .7)); e.root = B.root; }
    J.best = null; let bn = 0; for (const [k, x] of J.sigs) { if (x.bars.length && x.bars[x.bars.length - 1] < bar - 16) { J.sigs.delete(k); continue; } const sc = x.n + (x.by.size > 1 ? 1 : 0); if (sc > bn) { bn = sc; J.best = x; } }
    const shared = J.best && J.best.by.size > 1, ready = J.bars >= O.minBars && (shared || J.bars >= O.slowBars);
    J.prog = Math.min(1, (J.best ? Math.min(1, J.best.n / O.catchN) * .6 : 0) + Math.min(1, J.bars / O.minBars) * .3 + (shared ? .1 : 0));
    if (J.best && J.best.n >= O.catchN && ready) caught(J); };
  bus.on('note', ev => { const s = ev.src; if (!s || s.scale !== 'ohm' && s.scale !== 'voice') return; if (ev.kind !== 'note' && ev.kind !== 'strike') return;
    const b = ev.beat != null ? ev.beat : music.beat(ev.t), bar = Math.floor(b + 1e-6) / 4 | 0;
    // you play / sing near a song group: it comes alive again (a settled loop goes live) and your notes on the hook mend drift
    if (!ev.auto && (s === sim.ohm || s.scale === 'voice' || ev.inputT)) { const p = s.body || (sim.ohm && sim.ohm.body); for (const G of S.groups) if (p && G.state !== 'gone' && dist(G, p) < O.reach * 1.6) { G.settled = 0; G.touch = bar; if (G.state === 'song' && ev.deg != null) mend(G, ev.deg); } }
    // your notes played straight into an ohm that is in a jam go into that jam's current phrase (B6: "just add to its current phrase")
    if (ev.inputT && s.scale === 'ohm' && s !== sim.ohm && ev.deg != null) { const k = jamKeyOf(s); if (k && k !== 'you' && autojam.mem) { const m = autojam.mem.get(k) || []; m.push(ev.deg); while (m.length > 8) m.shift(); autojam.mem.set(k, m); } }
    if (ev.song || ev.deg == null || s.scale === 'voice') return;
    let B = buf.get(s.id); if (!B || B.bar !== bar) { if (B) closeBar(s, B); buf.set(s.id, B = { bar, notes: [], root: music.chord ? music.chord.root : 0 }); }
    if (B.notes.length < 12) B.notes.push({ d: ev.deg, b, len: ev.len || .5, vel: ev.vel || .7 }); });
  bus.on('harmony.push', () => { S.pushB = music.beat(); });
  const dist = (G, p) => { let d = 1e9; for (const m of G.members) d = Math.min(d, Math.hypot(m.body.x - p.x, m.body.y - p.y)); return d; };
  // a hook caught: compose the song around it - the jam's own chords as the first section, a contrasting section from the planet's
  // tradition, the hook returning at each section start, and the tradition's cadence as the ending
  const caught = J => { const t = T(), r = rng(hsh(J.first, J.bars, t.seed)), hk = J.best, ids = J.key === 'you' ? null : J.key.split('-').map(Number);
    const members = ids ? ids.map(i => sim.byId.get(i)).filter(Boolean) : [sim.jam && sim.jam.partner].filter(Boolean); if (!members.length) { S.jams.delete(J.key); return; }
    const roots = J.roots.length >= 4 ? J.roots.slice(-t.len) : walk(t, r, hk.root || 0, t.len, 4); while (roots.length < t.len) roots.push(roots[roots.length - 1]); roots[0] = hk.root || roots[0];
    const ch = t.charts && t.charts.length ? t.charts[Math.floor(r() * t.charts.length)] : null;   // wave 2 charts: the contrasting sections come from the tradition's chart
    const sec = { A: roots, B: ch && ch.sec.B ? ch.sec.B.slice() : walk(t, r, t.bStart, t.len, 4) }; if (t.form.includes('C')) sec.C = ch && ch.sec.C ? ch.sec.C.slice() : walk(t, r, 5, t.len, 0);
    const id = (J.key === 'you' ? 'p.' : 'g.') + Date.now().toString(36) + '.' + J.key.replace('-', '.'), s = S.add({ id, name: (J.key === 'you' ? 'our song ' : 'song ') + id.slice(2, 7), origin: J.key === 'you' ? 'player' : 'grown',
      planetSeed: t.seed, sec, form: t.form.includes('B') ? t.form.slice() : ['A', 'A', 'B', 'A'], end: t.cad.slice(), hook: hk.notes.map(n => ({ ...n })), hookBars: 1, cast: members.map(m => m.seed), from: J.key });
    S.caught++; S.jams.delete(J.key); bus.post({ type: 'song.caught', song: s, members });
    let G = members.map(groupOf).find(Boolean); if (G && G.state === 'song') return; if (!G) G = newGroup(members); start(G, s, 0); };
  // ---------- groups ----------
  const newGroup = members => { const G = { id: members.map(m => m.id).sort((a, b) => a - b).join('-'), members: members.slice(), song: null, state: 'jam', start: 0, rest: 0, plays: 0, settled: 0, cache: null, touch: -99, k: 0, sec: -1, drift0: 0 };
    S.groups.push(G); return G; };
  const start = (G, s, at = 0) => { const bar = Math.floor(music.beat() / 4) + 1, b0 = bar % 2 ? bar + 1 : bar;   // songs start on a 2-bar line (with the harmony steps)
    G.song = s; G.state = 'song'; G.start = b0 - at; G.sec = -1; G.cache = null; G.L = null; G.gparts = null;   // v0.0.29 fix: a fresh chart per play (a group that changed song kept the old song's chords); grown-section river edits live with this play only G.settled = 0; G.same = 0; s.plays = (s.plays || 0); S.starts++;
    if (sim.jamGrow && sim.jamGrow.songLayout) { const gl = sim.jamGrow.songLayout(G, s); if (gl) G.L = gl; }   // jamgrow.js: a watched, matched group's grown form (null = as before)
    for (const m of G.members) learn(m, s, G); const p = G.members[0].body; bus.post({ type: 'song.start', song: s, group: G, x: p.x, y: p.y }); const w = W(); if (w && w.bang && G.k > .3) w.bang(1.2); };
  const end = (G, quiet, done) => { const s = G.song; G.state = 'rest'; G.plays++; if (s) { s.plays = (s.plays || 0) + 1; if (s.plays >= O.tradPlays && s.trad == null && s.origin !== 'dev') s.trad = s.planetSeed; }
    const m0 = G.members[0] || G.last || { seed: 1, body: { x: 0, y: 0 } }, r = rng(hsh(G.plays, m0.seed)), [a, b] = O.rest; G.rest = Math.floor(music.beat() / 4) + a + Math.floor(r() * (b - a + 1)); S.ends++;
    if (!quiet) { const p = m0.body; bus.post({ type: 'song.end', song: s, group: G, x: p.x, y: p.y }); bus.ctl('global', 'song.end', 1); const w = W(); if (w && w.bang && G.k > .2) w.bang(2.2); if (done && w && w.moment && G.k > O.momentK && G.members.length >= O.cadenceN) w.moment(G.k * Math.min(1, .4 + .15 * G.members.length), 'cadence', { song: s, group: G, x: p.x, y: p.y }); } };
  // each member's version: learned with drift from its genes and how much it already knows it; each play pulls it closer
  const learn = (m, s, G) => { const br = R(); if (!br) return; const e = br.get(m, 'song', s.id), d0 = e && e.data ? e.data.drift : (s.cast && s.cast.includes(m.seed) ? .05 : .15 + .35 * u01(m.seed, 11));
    br.remember(m, 'song', s.id, { drift: d0, plays: e && e.data ? e.data.plays : 0, name: s.name }, 1, 12); };
  const driftOf = (m, s) => { const br = R(), e = br && br.get(m, 'song', s.id); return e && e.data ? e.data.drift : .2; };
  const mend = (G, deg) => { const s = G.song; if (!s || !s.hook) return; if (!s.hook.some(n => ((n.d - deg) % 7 + 7) % 7 === 0)) return; const br = R(); if (!br) return;
    for (const m of G.members) { const e = br.get(m, 'song', s.id); if (e && e.data) { e.data.drift = Math.max(0, e.data.drift - .04); br.dirty = true; } } G.settled = 0; };
  S.discord = G => G && G.song ? G.members.reduce((a, m) => a + driftOf(m, G.song), 0) / G.members.length : 0;
  // grow / shrink groups: nearby free ohms join (they learn the song, with drift); members that wander off leave
  const regroup = bar => { const reach = O.reach, live = new Set(sim.ohms);
    for (const G of S.groups) { if (G.members.length) G.last = G.members[0]; G.members = G.members.filter(m => live.has(m) && !m.parked && !m.away && m !== sim.ohm && !m.dead); if (G.members.length > 1) { const c = cen(G); G.members = G.members.filter(m => Math.hypot(m.body.x - c.x, m.body.y - c.y) < reach * 1.5); }
      if (G.members.length < 2 && !(G.song && G.song.origin === 'player' && G.members.length === 1)) { if (G.state === 'song') end(G, false); G.state = 'gone'; } }
    S.groups = S.groups.filter(G => G.state !== 'gone');
    for (const G of S.groups) { if (G.members.length >= O.maxGroup || G.state !== 'song') continue; const c = cen(G);
      for (const o of sim.neighbors ? sim.neighbors(G.members[0], near('near') || 2.5) : []) { if (G.members.length >= O.maxGroup) break; if (o === sim.ohm || (sim.jam && o === sim.jam.partner && sim.jam.until > music.beat()) || groupOf(o) || o.parked || o.away) continue;
        if (Math.hypot(o.body.x - c.x, o.body.y - c.y) < reach) { G.members.push(o); learn(o, G.song, G); G.cache = null; G.settled = 0; bus.post({ type: 'song.join', src: o, group: G }); } } }
    // groups you meet are already playing a song of the planet's tradition (deterministic per pair); new pairs (herded, new ohms) start as jams
    if (O.meet) for (const P of autojam.jams || []) { if (P.k < near('sleepK')) continue; const k = keyOf(P.a, P.b); if (S.met.has(k)) continue; S.met.add(k); if (groupOf(P.a) || groupOf(P.b)) continue;
      if (P.a.wakeT && P.b.wakeT && (P.a.born || P.b.born)) continue;   // a pair with a fresh ohm (spawned by you) starts as a jam
      const t = T(), trad = S.tradOf(t.seed); let s = trad.length ? trad[hsh(P.a.seed, P.b.seed) % trad.length] : null;
      if (!s) { const ws = songFromTradition(t, hsh(P.a.seed, P.b.seed)); s = S.lib.get(ws.id) || S.add(Object.assign(ws, { cast: [P.a.seed, P.b.seed] })); }
      const G = newGroup([P.a, P.b]), total = barsOf(s).length; start(G, s, Math.floor(u01(P.a.seed, P.b.seed) * total * .7)); } };
  const cen = G => { let x = 0, y = 0; for (const m of G.members) { x += m.body.x; y += m.body.y; } return { x: x / G.members.length, y: y / G.members.length }; };
  // ---------- playing ----------
  const gene = (o, salt) => u01(o.seed || o.id, salt);
  const partsFor = (G, bi, L) => { const s = G.song, bars = L[bi], out = new Map(), ms0 = G.members.slice().sort((a, b) => gene(b, 3) - gene(a, 3)), ms = sim.jamRoles ? sim.jamRoles.songOrder(G, ms0) : ms0,   /* jam roles: whoever is out front now carries the melody */ hr = s.sec[s.form[0]][0], hb = s.hookBars || 1;
    const isHook = bars.sec !== 'end' && (bars.sec === s.form[0] || bars.sec === 'A') && bars.i < hb, last = bi === L.length - 1, r = bars.r, tones = [r, r + 2, r + 4];
    // STRONG-BEAT CHORD TONES (TRADITION_REFERENCE 0.5 lead: chord tones on strong beats; switch O.strongSnap, ON): the melody's notes on beats 1 and 3, and its held notes on
    // beats 2 and 4, move at most 2 scale steps to the nearest tone of THIS bar's chord (the hook was written over the first chord; replayed over the next one it clashed).
    // Weak-beat notes, rhythm and contour stay; drone traditions (no chords) are left alone. Off = as before.
    const ctM = (music.tonesOf ? music.tonesOf(r) : tones).map(t => ((t % 7) + 7) % 7), droneT = music.trad && music.trad.harm === 'drone';
    const snap = n => { if (!O.strongSnap || droneT) return n; const bt = Math.round(n.b); if (Math.abs(n.b - bt) > .01 || !(bt % 2 === 0 || (n.len || 0) >= 1)) return n;
      if (ctM.includes(((n.d % 7) + 7) % 7)) return n; for (const k of [-1, 1, -2, 2]) if (ctM.includes((((n.d + k) % 7) + 7) % 7)) return { ...n, d: n.d + k }; return n; };
    const low = G.members.slice().sort((a, b) => octaveOf(recipes.get(a.recipe)) - octaveOf(recipes.get(b.recipe)) || a.seed - b.seed)[0];
    for (const m of G.members) { const ns = [], d = gene(m, 3), mine = bars.grown ? (G.gparts && G.gparts[m.seed] && G.gparts[m.seed][bars.sec]) : (s.parts && s.parts[m.seed] && s.parts[m.seed][bars.sec]);   // grown sections (jamgrow.js) never read / write the library song
      if (mine) { for (const n of mine) if (n.b >= bars.i * 4 && n.b < bars.i * 4 + 4) ns.push({ ...n, b: n.b - bars.i * 4, own: 1 }); out.set(m, ns); continue; }   // edited in the river
      if (last) { ns.push(N(tones[ms.indexOf(m) % 3] + (m === low ? -7 : 0), 0, 3.5, .8)); out.set(m, ns); continue; }   // the ending: everyone lands on the home chord
      const melo = isHook ? ms[0] : ms[bi % Math.min(2, ms.length)];
      if (m === melo) { const src = isHook ? s.hook.filter(n => n.b >= bars.i * 4 && n.b < bars.i * 4 + 4).map(n => ({ ...n, b: n.b - bars.i * 4 })) : s.hook.filter(n => n.b < 4).map(n => ({ ...n, d: n.d + (r - hr) }));
        const drift = driftOf(m, s); src.forEach((n0, i) => { const n = snap(n0); const wrong = u01(m.seed, i, bi, hsh(s.id.length, s.id.charCodeAt(2) || 0)) < drift * .6; ns.push({ ...n, d: n.d + (wrong ? (u01(m.seed, i, 7) < .5 ? 1 : -1) : 0), wrong: wrong ? 1 : 0, hook: isHook ? 1 : 0 }); }); }
      else if (m === low) { ns.push(N(r - 7, 0, 1.8, .55)); if (d > .45) ns.push(N(r - 7 + (d > .75 ? 4 : 0), 2, 1.5, .45)); }
      else { const n = 1 + Math.round(d * 3), lp = sim.blend && sim.blend.pattern ? sim.blend.pattern(m) : null; for (let j = 0; j < n; j++) ns.push(N(tones[(j + (bi & 1)) % 3], lp && lp.rh ? Math.min(3.75, lp.rh[j % lp.rh.length]) : j * 4 / n, .8, .45)); }
      out.set(m, ns); }
    return out; };
  // BREAKDOWNS (R3.9, as the old game did it: harmony.js drop + bdFilter, breakdown_check): in a long song (after >= 2 sections), at a
  // section start, now and then (bdChance, deterministic per group + bar) the lead calls a 2-4 bar breakdown: everyone but the anchor
  // (lowest member) and the lead (the hook player) drops out for the first two bars, then they come back member by member and all land
  // together on the downbeat after it. Never inside the ending. Groups of >= bdMin. A play-time filter, so settled-loop caches stay whole.
  const bdPick = (G, bi, L) => { const s = G.song, sec = L[bi]; if (!O.breakdown || G.bd || !sec.first || sec.sec === 'end' || G.sec < 2 || G.members.length < O.bdMin) return null;
    const endAt = L.findIndex(B => B.sec === 'end'), room = (endAt < 0 ? L.length : endAt) - bi; if (room < O.bdLen[0] + 1) return null;
    if (u01(hsh(G.id.length, G.id.charCodeAt(0) || 0, s.id.charCodeAt(2) || 0), bi, 0xbd) >= O.bdChance) return null;
    const len = Math.min(room - 1, O.bdLen[0] + Math.floor(u01(G.members[0].seed || 1, bi, 0xbe) * (O.bdLen[1] - O.bdLen[0] + 1)));
    const ld0 = G.members.slice().sort((a, b) => gene(b, 3) - gene(a, 3)), lead = (sim.jamRoles ? sim.jamRoles.songOrder(G, ld0) : ld0)[0], low = G.members.slice().sort((a, b) => octaveOf(recipes.get(a.recipe)) - octaveOf(recipes.get(b.recipe)) || a.seed - b.seed)[0];
    const keep = new Set([lead.id, low.id]), out = G.members.filter(m => !keep.has(m.id)).sort((a, b) => gene(a, 5) - gene(b, 5)), back = new Map();
    out.forEach((m, j) => back.set(m.id, bi + Math.min(len, 2 + Math.floor(j * Math.max(0, len - 2) / Math.max(1, out.length)))));   // bars 0-1 thin; back one by one; all in at bi + len
    return { from: bi, len, to: bi + len - 1, keep, back, lead: lead.id }; };
  S.bds = 0;
  const bdOut = (G, m, bi) => { const b = G.bd; return !!(b && bi >= b.from && bi < b.from + b.len && !b.keep.has(m.id) && bi < (b.back.get(m.id) ?? b.from + b.len)); };
  // the spread queue (O.spread): notes wait here until spreadLook beats before they sound; drained every control tick (S.tick)
  S.q = []; S.spreadMaxQ = 0;
  const noteOut = (ev, G) => { if (!O.spread) { bus.note(ev); return; } S.q.push(ev); if (S.q.length > S.spreadMaxQ) S.spreadMaxQ = S.q.length; };
  const drain = () => { if (!S.q.length) return; const now = music.beat(), look = O.spreadLook, due = now + .25; let n = 0;
    if (S.q.length > 1 && !S.qSorted) { S.q.sort((a, b) => a.beat - b.beat); S.qSorted = true; }
    while (S.q.length && S.q[0].beat <= now + look && (n < O.spreadMax || S.q[0].beat <= due)) { bus.note(S.q.shift()); n++; } };
  S.flushQ = () => { while (S.q.length) bus.note(S.q.shift()); };
  const play = (G, bar) => { const s = G.song, L = G.L || (G.L = barsOf(s)), bi = bar - G.start; if (bi < 0) return; if (bi >= L.length) { end(G, false, true); return; }
    const k = G.k, aj = sim.opts.autojam || {}, sleep = aj.sleepK || .05, drone = aj.droneK || .15; if (k < sleep) return;   // far: the song keeps its place, silent
    if (!G.cache || G.cache.length !== L.length) G.cache = new Array(L.length).fill(null);
    let parts = G.settled ? G.cache[bi] : null; if (!parts) { parts = partsFor(G, bi, L); if (G.cache) G.cache[bi] = parts; }
    if (G.bd && bi > G.bd.to) G.bd = null; if (!G.bd) { const b = bdPick(G, bi, L); if (b) { G.bd = b; S.bds++; const p = G.members[0].body; bus.post({ type: 'song.breakdown', song: s, group: G, len: b.len, x: p.x, y: p.y }); } }
    const b0 = bar * 4, merged = k < drone * 2, carrier = merged ? [...parts.keys()].sort((a, b) => parts.get(b).length - parts.get(a).length)[0] : null;
    for (const [m, ns] of parts) { if (merged && m !== carrier) continue; if (sim.dictated && sim.dictated(m, bar)) continue; if (bdOut(G, m, bi)) continue; const rec = recipes.get(m.recipe); if (!rec) continue; const oc = octaveOf(rec);
      if (sim.jamRoles && sim.jamRoles.songBack(G, m)) { const r0 = L[bi].r; noteOut({ src: m, kind: 'note', deg: r0, oct: oc, vel: (.3 + .45 * k) * sim.jamRoles.opts.holdVel, t: music.timeOfBeat(b0), beat: b0, dur: 3 * music.spb(), gainK: .4 + .6 * k, lite: k < .5 ? 1 : 0, auto: 1, jam: 1, song: 1, back: 1 }, G); continue; }   // jam roles: stepped back, listening, one soft chord tone
      for (const n of ns) { const b = b0 + n.b; noteOut({ src: m, kind: 'note', deg: n.d, oct: oc, vel: (.3 + .45 * k) * (n.vel || .7), t: music.timeOfBeat(b), beat: b, dur: n.len ? n.len * music.spb() : undefined, gainK: merged ? .5 * k / drone : .4 + .6 * k, lite: k < .5 ? 1 : 0, auto: 1, jam: 1, song: 1, hook: n.hook, wrong: n.wrong, own: n.own }, G); } }
    const sec = L[bi]; if (sec.first) { G.sec++; bus.post({ type: 'song.section', song: s, group: G, sec: sec.sec, bar: bi }); if (sec.sec === s.form[0] && G.k > .3) { const w = W(); if (w && w.bang) w.bang(O.sectionBang); }
      // big moments: the climax = the last section of the form coming in (the final return), a drop = the hook section coming back
      // after a different one; scaled by how present the song is (G.k) and how many sing it
      const w = W(); if (w && w.moment && G.k > O.momentK) { const p = G.members[0].body, crowd = Math.min(1, .55 + .15 * G.members.length), nx = L.findIndex((B, j) => j > bi && B.first), lastSec = sec.sec !== 'end' && (nx < 0 || L[nx].sec === 'end');
        if (lastSec && G.sec > 2) w.moment(G.k * crowd, 'climax', { song: s, group: G, x: p.x, y: p.y });
        else if (sec.sec === s.form[0] && G.sec > 1 && bi > 0 && L[bi - 1].sec !== sec.sec) w.moment(.8 * G.k * crowd, 'drop', { song: s, group: G, x: p.x, y: p.y }); } } };
  S.tickBar = bar => { const t0 = performance.now(); regroup(bar); const aj = sim.opts.autojam;
    for (const G of S.groups) { G.k = autojam.presence && G.members.length > 1 ? autojam.presence(G.members[0], G.members[1]) : (autojam.presence ? autojam.presence(G.members[0], G.members[0]) : 1); }
    // jam -> song: the root of each bar is part of the jam's chords (first section of a grown song)
    for (const J of S.jams.values()) { if (J.last >= bar - 2) { J.roots.push(music.chord ? music.chord.root : 0); if (J.roots.length > 16) J.roots.shift(); } else if (J.last < bar - 32) S.jams.delete(J.key); }
    // the song carrying the chords: the strongest one near you, unless you moved the harmony yourself in the last 2 bars
    const cands = S.groups.filter(G => G.state === 'song' && G.k >= O.carry).sort((a, b) => b.k - a.k); S.carrier = cands[0] && music.beat() - S.pushB > 8 ? cands[0] : null;
    if (S.carrier) { const G = S.carrier, L = G.L || (G.L = barsOf(G.song)), bi = bar - G.start; if (bi >= 0 && bi < L.length) { const r = L[bi].r; if (!music.chord || music.chord.root !== r) { music.chord = { root: r, tones: music.tonesOf ? music.tonesOf(r) : [r, r + 2, r + 4] }; for (const f of music.listeners) f(); } } }
    for (const G of S.groups) { if (G.state === 'rest' && bar >= G.rest) { const s = pickNext(G); if (s) start(G, s, 0); } }
    S.qSorted = false; if (!O.spread && S.q.length) S.flushQ();
    for (const G of S.groups) if (G.state === 'song') { const was = G.settled; play(G, bar + 1); if (G.state === 'song' && bar + 1 - G.start === 0 && G.plays >= O.settle && bar - G.touch > 16) G.settled = 1; if (was && !G.settled) G.cache = null; }
    // the world hears it (influence matrix sources)
    const top = S.groups.filter(G => G.state === 'song').sort((a, b) => b.k - a.k)[0], jamTop = [...S.jams.values()].sort((a, b) => b.prog - a.prog)[0];
    post('song.on', top ? Math.min(1, top.k) : 0); post('song.section', top && top.L ? Math.max(0, top.sec) / Math.max(1, top.song.form.length) : 0); post('song.discord', top ? S.discord(top) : 0); post('jam.toSong', jamTop ? jamTop.prog : 0);
    const hb = top && top.L ? top.L[bar - top.start] : null; post('song.hook', hb && hb.sec === top.song.form[0] && hb.i < (top.song.hookBars || 1) ? 1 : 0);
    if (S.sig['song.end']) post('song.end', 0); S.ms = S.ms * .8 + (performance.now() - t0) * .2; };
  const pickNext = G => { const br = R(), known = br ? br.list(G.members[0], 'song').map(e => S.lib.get(e.key)).filter(Boolean) : [];
    const J = S.jams.get(keyOf(G.members[0], G.members[1] || G.members[0])); if (J && J.best && J.best.n >= O.catchN) return null;   // a new hook is catching: let it become a song
    if (O.placeTrad) { const here = S.tradOf(planetSeed()); if (here.length && u01(G.plays, G.members[0].seed, 0x7ad) < O.tradPick) {
      const kn = here.filter(s => known.includes(s)), pool = kn.length ? kn : here; S.tradPicks = (S.tradPicks || 0) + 1; return pool[Math.floor(u01(G.plays, G.members[0].seed, 0x7ae) * pool.length) % pool.length]; } }
    if (!known.length) return G.song; const r = u01(G.plays, G.members[0].seed); return r < .6 && G.song && S.lib.has(G.song.id) ? G.song : known[Math.floor(r * known.length) % known.length]; };
  const post = (k, v) => { if (S.sig[k] != null && Math.abs(S.sig[k] - v) < 2e-3) return; S.sig[k] = v; bus.ctl('global', k, v); };
  S.tick = () => { if (!O.on) return; const bar = Math.floor(music.beat() / 4); drain(); if (bar !== S.lastBar) { S.lastBar = bar; for (const [id, B] of buf) if (B.bar < bar) { const s = sim.byId && sim.byId.get(id); if (s) closeBar(s, B); buf.delete(id); } S.tickBar(bar); drain(); } };
  S.carrying = () => !!S.carrier;
  if (harmony) harmony.hold = () => O.on && S.carrying();
  // dev: play a library song with the group nearest your ohm (or make one from the two ohms nearest you)
  S.playNear = id => { const s = S.lib.get(id); if (!s || !sim.ohm) return null; const f = sim.ohm.body; let G = S.groups.slice().sort((a, b) => dist(a, f) - dist(b, f))[0];
    if (!G || dist(G, f) > O.reach * 2) { const nb = (sim.ohms || []).filter(o => o !== sim.ohm && !o.parked && !o.away && !groupOf(o) && !(sim.jam && o === sim.jam.partner)).sort((a, b) => Math.hypot(a.body.x - f.x, a.body.y - f.y) - Math.hypot(b.body.x - f.x, b.body.y - f.y)).slice(0, 2); if (nb.length < 1) return null; G = newGroup(nb); }
    if (G.state === 'song') end(G, true); start(G, s, 0); return G; };
  // persistence
  S.save = () => ({ lib: [...S.lib.values()].filter(s => s.origin !== 'dev' || s.plays || s.trad != null || s.parts).map(s => ({ ...s })), groups: S.groups.map(G => ({ ids: G.members.map(m => m.id), song: G.song && G.song.id, state: G.state, start: G.start, rest: G.rest, plays: G.plays, settled: G.settled })),
    met: [...S.met].slice(-600), jams: [...S.jams.values()].map(J => ({ key: J.key, bars: J.bars, first: J.first, roots: J.roots })) });
  S.load = d => { for (const s of d.lib || []) S.lib.set(s.id, s); S.met = new Set(d.met || []); S.groups = [];
    for (const g of d.groups || []) { const ms = g.ids.map(i => sim.byId.get(i)).filter(Boolean), s = S.lib.get(g.song); if (!ms.length) continue; const G = newGroup(ms); Object.assign(G, { song: s || null, state: s ? g.state : 'rest', start: g.start, rest: g.rest, plays: g.plays, settled: g.settled }); }
    for (const j of d.jams || []) S.jams.set(j.key, { key: j.key, bars: j.bars, first: j.first, last: -1, sigs: new Map(), roots: j.roots || [], prog: 0 }); };
  // a standard MIDI file of a song (dev panel export): one track per member part + the chords
  S.midi = (id, bpm = music.bpm, key = music.key) => { const s = S.lib.get(id); if (!s) return null; const L = barsOf(s), sc = [0, 2, 4, 5, 7, 9, 11], pc = d => 60 + key + Math.floor(d / 7) * 12 + sc[((d % 7) + 7) % 7], ev = [];
    const hb = s.hookBars || 1; L.forEach((B, bi) => { const r = B.r; [r, r + 2, r + 4].forEach(d => ev.push([bi * 4, 1, pc(d - 7), 3.9, 60])); if (B.sec === s.form[0] && B.i < hb) for (const n of s.hook) if (n.b >= B.i * 4 && n.b < B.i * 4 + 4) ev.push([bi * 4 + n.b - B.i * 4, 0, pc(n.d), n.len, 96]); });
    const vl = n => { const o = [n & 127]; while (n >>= 7) o.unshift((n & 127) | 128); return o; }, trk = ch => { const es = []; for (const [b, c, p, len, v] of ev) if (c === ch) { es.push([Math.round(b * 480), 0x90 | c, p, v]); es.push([Math.round((b + len) * 480), 0x80 | c, p, 0]); } es.sort((a, b) => a[0] - b[0] || (a[1] & 0xf0) - (b[1] & 0xf0));
      const out = []; if (ch === 0) { const us = Math.round(60e6 / bpm); out.push(0, 0xff, 0x51, 3, us >> 16 & 255, us >> 8 & 255, us & 255); } let last = 0; for (const [t, st, p, v] of es) { out.push(...vl(t - last), st, p, v); last = t; } out.push(0, 0xff, 0x2f, 0);
      return [0x4d, 0x54, 0x72, 0x6b, out.length >> 24 & 255, out.length >> 16 & 255, out.length >> 8 & 255, out.length & 255, ...out]; };
    return new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 2, 1, 0xe0, ...trk(0), ...trk(1)]); };
  // overlay: jams as loose dotted rings (filling as a hook catches), songs as solid rings with their sections
  // v0.0.30 B7 (GAMEDEV_SPEC part 2; switch world.opts.lnGroups + noOutlines): look.group(g, 'jam'|'song', cx, cy, rr, k, prog, st) paints it when
  // Visuals add it; else (F6) a jam is a faint pale pool of light under the pair with its catch progress as beads, a song a soft gold pool under its members (brighter on the hook); no ring. Off = the stroked rings.
  S.draw = (g, Wd, Hd, toS, look) => { const nl = noLine('lnGroups'), lg = look && look.group, nb = noLine('lnBeads'); for (const P of autojam.jams || []) { if (groupOf(P.a) && groupOf(P.a).state === 'song') continue; const J = S.jams.get(keyOf(P.a, P.b)), a = toS(P.a.body.x, P.a.body.y), b = toS(P.b.body.x, P.b.body.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, rr = Math.hypot(a.x - b.x, a.y - b.y) / 2 + a.s * .9;
      if (P.k < .05 || rr > Wd) continue; if (lg && look.group(g, 'jam', cx, cy, rr, P.k, J ? J.prog : 0, {}) === true) continue;
      if (nl) { softPool(g, cx, cy, rr * 1.1, '207,80%,85%', (.18 + .25 * P.k) * .45); if (J && J.prog > .05 && nb) { const m = Math.max(1, Math.round(J.prog * 24)); for (let i = 0; i < m; i++) { const a = -1.571 + i / 24 * 6.283; softDot(g, cx + Math.cos(a) * (rr + 4), cy + Math.sin(a) * (rr + 4), 3.6, '42,70%,80%', (.3 + .5 * J.prog) * .7); } continue; }   /* v0.0.30 G9 lnBeads: soft jam progress beads */
        if (J && J.prog > .05) { const m = Math.max(1, Math.round(J.prog * 24)); g.fillStyle = 'rgba(255,214,120,' + (.3 + .5 * J.prog) * .8 + ')'; g.beginPath(); for (let i = 0; i < m; i++) { const a = -1.571 + i / 24 * 6.283, x = cx + Math.cos(a) * (rr + 4), y = cy + Math.sin(a) * (rr + 4); g.moveTo(x + 2, y); g.arc(x, y, 2, 0, 6.283); } g.fill(); } continue; }
      g.setLineDash([3, 7]); g.strokeStyle = 'rgba(180,220,255,' + (.18 + .25 * P.k) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, rr, 0, 6.283); g.stroke(); g.setLineDash([]);
      if (J && J.prog > .05) { g.strokeStyle = 'rgba(255,214,120,' + (.3 + .5 * J.prog) + ')'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, rr + 4, -1.571, -1.571 + 6.283 * J.prog); g.stroke(); } }
    const bt = music.beat(); for (const G of S.groups) { if (G.state !== 'song' || G.k < .05) continue; const ps = G.members.map(m => toS(m.body.x, m.body.y)); let cx = 0, cy = 0; for (const p of ps) { cx += p.x; cy += p.y; } cx /= ps.length; cy /= ps.length;
      let rr = 0; for (const p of ps) rr = Math.max(rr, Math.hypot(p.x - cx, p.y - cy) + p.s * .9); if (rr > Wd) continue; const L = G.L || barsOf(G.song), bi = Math.floor(bt / 4) - G.start, f = (bt / 4) % 1, hook = L[bi] && L[bi].sec === G.song.form[0] && L[bi].i < (G.song.hookBars || 1);
      const ga = (.35 + .4 * G.k) * (G.settled ? .6 : 1);
      const gst = { hook, f, settled: !!G.settled }; if (nb) { gst.secs = L.map((b, i) => b.first ? { i, end: b.sec === 'end' } : null).filter(Boolean); gst.bi = bi; gst.n = L.length; }   /* v0.0.30 G9: look.group gets the sections so it can draw them as light */
      const lgD = !!(lg && look.group(g, 'song', cx, cy, rr, G.k, L.length ? Math.max(0, Math.min(1, (bi + f) / L.length)) : 0, gst) === true); if (lgD && nb) continue;   /* G9 lnBeads: look.group drew it, so no beads or playhead on top */
      if (!lgD) { if (nl) softPool(g, cx, cy, rr * 1.15, '39,90%,70%', ga * (hook ? .4 + .2 * (1 - f) : .4));
        else { g.strokeStyle = 'rgba(255,205,110,' + ga + ')'; g.lineWidth = hook ? 3 + 2 * (1 - f) : 2; g.beginPath(); g.arc(cx, cy, rr, 0, 6.283); g.stroke(); } }
      const n = L.length; if (nb) { for (let i = 0; i < n; i++) { const a = -1.571 + i / n * 6.283; if (!L[i].first) continue; softDot(g, cx + Math.cos(a) * (rr + 7), cy + Math.sin(a) * (rr + 7), (L[i].sec === 'end' ? 4 : 2.5) * 1.8, '42,70%,80%', i <= bi ? .55 : .18); }   /* G9 lnBeads: soft section beads */
        if (bi >= 0 && bi < n) { const a = -1.571 + (bi + f) / n * 6.283; softDot(g, cx + Math.cos(a) * (rr + 7), cy + Math.sin(a) * (rr + 7), 4, '0,0%,100%', .8); } continue; }
      for (let i = 0; i < n; i++) { const a = -1.571 + i / n * 6.283; if (!L[i].first) continue; g.fillStyle = i <= bi ? 'rgba(255,225,150,.9)' : 'rgba(255,225,150,.3)'; g.beginPath(); g.arc(cx + Math.cos(a) * (rr + 7), cy + Math.sin(a) * (rr + 7), L[i].sec === 'end' ? 4 : 2.5, 0, 6.283); g.fill(); }
      if (bi >= 0 && bi < n) { const a = -1.571 + (bi + f) / n * 6.283; g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + Math.cos(a) * (rr + 7), cy + Math.sin(a) * (rr + 7), 2, 0, 6.283); g.fill(); } } };
  return S;
}
