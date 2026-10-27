// JAMS THAT CHANGE KEY (old game R3.12 "Real modulation (pivot chords to IV, V, ii, relative, parallel)", R3.5 consensus key; NEW_ENGINE
// 6.2 "the jam's frame moves with everyone playing in it: it can switch keys and hold many chords, with no leader"). The shared harmony
// (music.js createHarmony) can already change key through a pivot chord, but every note votes INSIDE the current key, so on its own a
// jam almost never leaves home. This gives a jam a KEY JOURNEY, driven by the players, never by a leader or a timer alone:
//   - after a jam has sat in its home key for `stay` bars of real playing (2+ ohms jamming, no song carrying the chords), the members'
//     own home keys (harmony.wants, from their genes) pick the next key among the close ones (IV = +5, V = +7, ii = +2 as a key of its
//     own; the scale here is one 7-note major set, so relative / parallel minor are mode changes the engine cannot make yet);
//   - the shared harmony gets a LEAN toward that key at each step (well under a player's push), so it only moves when the sounding
//     chord is a pivot that both keys share: the change always lands smoothly on a 2-bar step;
//   - away for `away` bars, it leans HOME again (tension and release: the journey returns to the head); you can still push it anywhere.
// Nothing moves when nobody plays. Posts 'jam.key' { from, to, home } on each change. Switch 'jamKeys' (ON); off = v0.0.28.
// v0.0.29 (Game Dev 1:02 AM: "relative and parallel minor key moves for jams if minor scales exist or can be added cheaply"): music.js
// now has a minor mode (music.setMode). Two more journeys, both in R3.12's list, each its own switch (ON, as described):
//   jamMinorRel  RELATIVE minor ('rel'): the same notes, the centre moves to the 6th (vi becomes i). Made on a phrase line (every 4
//                bars) when the sounding chord is vi, IV or ii (i, VI, iv in the minor), or on the next phrase line after waitBars.
//   jamMinorPar  PARALLEL minor ('par'): same tonic, 3rd / 6th / 7th lowered. Made on a phrase line on I or V (or after waitBars).
// Home again the same way after `away` bars (rel: on i, VI or iv; par: on i or v). Chord degrees are re-expressed so the sounding chord
// keeps its notes ('rel') or its root ('par'). While in minor the shared harmony leans to stay in that key. Off / a song carrying
// the chords / a new home = back to major at once. Posts 'jam.mode' { mode, how, key }. Not saved (like the key).
export const JAMKEY_OPTS = { on: true, stay: 24, away: 16, lean: 3.2, home: 3.6, steps: [7, 5, 2], minJam: 1, rel: true, par: true, relW: .7, parW: .6, waitBars: 8 };
export function createJamKeys({ sim, bus, music, harmony, autojam, songs, opts = {} }) {
  const O = { ...JAMKEY_OPTS, ...opts }, K = { opts: O, home: null, target: null, inKey: 0, lastKey: null, lastBar: -1, changes: 0, journeys: 0, returns: 0, playing: 0, mm: null, modes: 0, wait: 0, hist: [] };
  const jamming = () => { let n = 0; const aj = sim.opts && sim.opts.autojam; for (const P of (autojam && autojam.jams) || []) if (!aj || P.k >= Math.max(aj.droneK || 0, .2)) n++;
    if (songs) for (const G of songs.groups) if (G.state === 'jam' && G.members.length >= 2) n++; return n; };
  const carried = () => !!(songs && songs.carrier) || !!(harmony && harmony.hold && harmony.hold());
  const rec = st => { const i = K.hist.indexOf(st); return i < 0 ? 0 : [.55, .35, .2][i]; };   // the last three journeys weigh against a repeat
  const pickTarget = () => { const w = harmony && harmony.wants ? [...harmony.wants.values()].filter(h => h != null) : [], k = music.key;
    let best = null, bs = -1; O.steps.forEach((st, i) => { const k2 = (k + st) % 12; let s = 1 - i * .2 - rec(st); for (const h of w) if (h === k2) s += 1; if (s > bs) { bs = s; best = k2; } });
    // minor journeys: a member at home on the 6th pulls toward the relative minor; the parallel minor has no home pull (a colour)
    const mo = []; if (O.rel && music.canMode && music.canMode('rel')) mo.push(['rel', O.relW + w.filter(h => h === (k + 9) % 12).length * .5]); if (O.par && music.canMode && music.canMode('par')) mo.push(['par', O.parW]);
    for (const [how, s0] of mo) { const s = s0 - rec(how); if (s > bs) { bs = s; best = { mode: 'minor', how }; } }
    if (best == null) return null; K.lastStep = typeof best === 'object' ? best.how : (best - k + 12) % 12; K.hist.unshift(K.lastStep); K.hist.length = Math.min(K.hist.length, 3); return best; };   // the members' homes choose; a journey seldom repeats the last one
  const goMode = (mode, how) => { const r0 = music.chord.root, wasRel = music.modeHow === 'rel'; if (!music.setMode(mode, how)) return false;
    const r = mode === 'minor' && how === 'rel' ? (r0 + 2) % 7 : mode === 'major' && wasRel ? (r0 + 5) % 7 : r0;   // rel: vi (5) -> i (0); back: i -> vi
    music.chord = { root: r, tones: [r, r + 2, r + 4] }; for (const f of music.listeners || []) f(); K.modes++; K.wait = 0;
    if (bus && bus.post) bus.post({ type: 'jam.mode', mode, how: how || null, key: music.key }); return true; };
  const modeReady = (how, back) => { const r = music.chord.root; if (K.wait >= O.waitBars) return true;
    return how === 'rel' ? (back ? [0, 5, 3].includes(r) : [5, 3, 1].includes(r)) : [0, 4].includes(r); };
  K.toMajor = () => { if (music.mode === 'minor' && K.mm) { goMode('major'); K.mm = null; } };   // the members' homes choose; a journey seldom repeats the last one
  K.bar = bar => { if (!O.on) { K.target = null; K.toMajor(); return; }
    if (K.mm) { if (carried() || (!O.rel && K.mm.how === 'rel') || (!O.par && K.mm.how === 'par') || music.mode !== 'minor') { K.toMajor(); K.mm = null; K.target = null; K.inKey = 0; K.lastKey = music.key; return; }
      K.playing = jamming(); if (K.playing < O.minJam) return; K.inKey++;
      if (K.inKey >= O.away) { if (bar % 4 === 0) { if (modeReady(K.mm.how, true)) { goMode('major'); K.mm = null; K.returns++; K.target = null; K.inKey = 0; K.lastKey = music.key; } else K.wait++; } }
      return; }
    if (K.target && typeof K.target === 'object') { if (carried()) { K.target = null; return; } K.playing = jamming(); if (K.playing < O.minJam) return;
      if (bar % 4 === 0) { if (modeReady(K.target.how, false)) { if (goMode('minor', K.target.how)) { K.mm = { how: K.target.how, key: music.key }; K.inKey = 0; K.lastKey = music.key; } K.target = null; } else K.wait++; }
      return; }
    const k = music.key; if (K.home == null) { K.home = K.lastKey = k; }   // home = the key the world was in when we first heard it (after a restore)
    if (k !== K.lastKey) { if (bus && bus.post) bus.post({ type: 'jam.key', from: K.lastKey, to: k, home: K.home }); K.changes++; if (k === K.home) { K.returns++; K.target = null; } else if (K.target === k) K.target = K.home; K.lastKey = k; K.inKey = 0; }
    K.playing = jamming(); if (K.playing < O.minJam || carried()) return; K.inKey++;
    if (k === K.home && K.target == null && K.inKey >= O.stay) { K.target = pickTarget(); K.journeys++; K.wait = 0; }
    else if (k !== K.home && K.inKey >= O.away) K.target = K.home; };
  // music.js H.step reads this per candidate key: an extra vote weight
  K.lean = k2 => { if (!O.on) return 0; if (K.mm) return k2 === K.mm.key ? O.home : 0;   // in a minor journey: stay in that key until the way home
    if (K.target == null || typeof K.target === 'object' || k2 !== K.target) return 0; return K.target === K.home ? O.home : O.lean; };
  K.setHome = k => { K.toMajor(); K.mm = null; K.home = k; K.target = null; K.inKey = 0; K.lastKey = music.key; };   // a landing / new planet: its key is home
  K.switches = () => [
    { k: 'jamMinorRel', label: 'jams can travel to the relative minor (same notes, the centre moves to the 6th) and back', get: () => O.rel, set: v => { O.rel = !!v; } },
    { k: 'jamMinorPar', label: 'jams can travel to the parallel minor (same home note, 3rd / 6th / 7th lowered) and back', get: () => O.par, set: v => { O.par = !!v; } }];
  if (harmony) harmony.lean = K.lean;
  K.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar !== K.lastBar) { K.lastBar = bar; K.bar(bar); } };
  return K;
}
