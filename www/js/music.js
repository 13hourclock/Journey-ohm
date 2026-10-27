// ONE shared music state: beat, key, scale and harmony. Everything (sources, visuals, effects, mods, the world) READS this;
// nothing keeps its own clock. Scale-agnostic: no ohm, planet or area assumptions here.
// om = 64 Hz home pitch (APPROVED 10:40 PM Oct 24, PROVISIONAL); tempo 60 BPM by default. v0.0.7 (Wilbow 2:44, no lore in the engine):
// tempo and om are separate knobs; 'lock' (ON by default again: rollback 2026-10-25, low C 64 Hz matches the heartbeat, 10:40 PM Oct 24) ties the BPM to the om (om/64*60); a plain toggle. Beat time is
// ANCHORED so a tempo change never jumps the beat count (events are stored in beats). Tuning is switchable (JI proposal / 12-TET).
export const TUNINGS = {   // open-ended table: a later harmony-tools step adds traditions / microtonal sets here, nothing else changes
  'om-JI-7': { name: 'om-JI-7 (proposal)', ratios: [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8] },
  '12-TET-7': { name: 'equal-tempered major', ratios: [0, 2, 4, 5, 7, 9, 11].map(s => Math.pow(2, s / 12)) },
};
const JI12 = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
export const SEMI = [0, 2, 4, 5, 7, 9, 11];
// v0.0.29 MINOR (jamkeys.js relative / parallel minor journeys, old game R3.12): the natural minor's steps, and its pure JI ratios
export const SEMI_MINOR = [0, 2, 3, 5, 7, 8, 10];
export const MINOR_RATIOS = { 'om-JI-7': [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5], '12-TET-7': SEMI_MINOR.map(s => Math.pow(2, s / 12)) };
// v0.0.6 MOVING HARMONY (Wilbow 2:21 / 2:22 AM: one key / one chord / a lead were freezes). Every few bars the chord moves and the
// key can change through a pivot chord (one that belongs to both keys, so the change sounds smooth). EVERY source that plays shapes
// it equally (each one's notes count as one vote, however many it plays), plus pushes ('harmony.push' {chord, key, dir} from the
// player's gesture, OHMS track). Nothing moves when nobody plays (no drift). No lead, no roles. All PROPOSALS: opts.harm toggles.
const PRIOR = [[0, .1, .3, .5, .5, .4, .1], [.3, 0, .1, .2, .6, .2, .2], [.2, .1, 0, .2, .2, .5, .1], [.4, .4, .1, 0, .6, .2, .1], [.6, .2, .2, .3, 0, .4, .1], [.2, .4, .2, .5, .3, 0, .1], [.6, .1, .3, .1, .2, .2, 0]];   // tension -> release (MUSIC_GOOD #3), weak
const pcs = (k, r, SS = SEMI) => [r, r + 2, r + 4].map(t => (k + SS[t % 7] + 12) % 12);
const fitKey = (w, k, SS = SEMI) => { let s = 0; for (const d of SS) s += w[(k + d) % 12]; return s; };
export function createHarmony(world, bus, music) {
  const SS = () => (music.semi ? music.semi() : SEMI), pcsM = (k, r) => pcs(k, r, SS()), fitM = (w, k) => fitKey(w, k, SS());   // v0.0.29: the current mode's steps (major unless a jam is in minor)
  const O = world.opts, H = { votes: new Map(), vw: new Map(), wants: new Map(), push: null, nextB: 0, moves: 0, keyMoves: 0, nudge: new Float32Array(12), nudges: 0, tonicPull: 0 };   // tonicPull: votes toward chord root 0 at each step (traditions.js drone planets, 1.5; 0 = none)
  // what an ohm WANTS: its home key, from what it is (its recipe seed; the player's ohm is at home on the om). PROPOSAL.
  const HOME = [0, 7, 5, 9, 2, 4, 10]; H.home = s => s.home != null ? s.home : s === world.ohm ? 0 : s.recipe != null ? HOME[(((s.seed != null ? s.seed : s.recipe) | 0) % 7 + 7) % 7] : null;
  const vote = (src, pc, w = 1) => { let v = H.votes.get(src.id); if (!v) H.votes.set(src.id, v = new Float32Array(12)); v[pc] += w; if (w !== 1) H.vw.set(src.id, w); };   // vw: a source counted at less than one voice (a tied drawn string, .8)
  bus.on('note', ev => { const s = ev.src; if (!s || ev.deg == null || (ev.kind !== 'note' && ev.kind !== 'strike')) return;
    if (s.scale === 'thing' && ev.feedW > 0) { const pc = (music.key + SS()[((ev.deg % 7) + 7) % 7]) % 12; vote(s, pc, ev.feedW); if (O.harm.nudge !== false) { H.nudge[pc] += 1; H.nudges++; } return; }
    // ^ Q352 b (Wilbow 3:58 PM Oct 25): the same player pluck also STEERS the next chord (H.nudge, below): a nudge, not an override   // a player tap on a jam-tied drawn string (things.js, V08 D)
    if (s.scale !== 'ohm' && s.scale !== 'voice') return;
    vote(s, (music.key + SS()[((ev.deg % 7) + 7) % 7]) % 12); if (s.scale === 'ohm') H.wants.set(s.id, H.home(s)); });
  bus.on('harmony.push', ev => { H.push = ev; });
  // v0.0.12 THE PLACE'S PULL (world track, terrain.js posts 'harmony.place' { w: 12 pitch-class weights } on bar lines): a gentle extra
  // influence, like one quiet voice. opts.harm.place (PROPOSAL, open question): 'vote' (default) = one extra vote of weight opts.harm.placeW
  // (.6 of one player) | 'tie' = only breaks near-ties | 'off'. It never moves the harmony on its own (nothing moves when nobody plays),
  // and it is one voice among the players, so a jam can leave the place's leaning and come back to it.
  bus.on('harmony.place', ev => { H.place = ev; });
  H.step = () => { if (H.hold && H.hold()) { H.votes.clear(); H.vw.clear(); H.wants.clear(); H.push = null; H.nudge.fill(0); return false; }   // systems: a song's chart is carrying the chords
    const k = music.key, cur = music.chord.root, W = new Float32Array(12);
    for (const [id, v] of H.votes) { let t = 0; for (const x of v) t += x; const k = H.vw.has(id) ? H.vw.get(id) : 1; if (t) for (let i = 0; i < 12; i++) W[i] += k * v[i] / t; } H.vw.clear();   // one vote per source
    const n = H.votes.size, P = H.push, wants = [...H.wants.values()].filter(h => h != null); H.votes.clear(); H.wants.clear(); H.push = null; if (!n && !P) return false;
    const PL = H.place, pm = O.harm.place || 'vote'; if (PL && PL.w && pm !== 'off') { let t = 0; for (const x of PL.w) t += x; const g = pm === 'tie' ? .03 : (O.harm.placeW == null ? .6 : O.harm.placeW); if (t) for (let i = 0; i < 12; i++) W[i] += PL.w[i] / t * g; }
    const pull = k2 => { const kk = music.mode === 'minor' && music.modeHow === 'rel' ? (k2 + 3) % 12 : k2; let s = 0; for (const h of wants) s += h === kk ? 1 : 0; return s; };   // homes are major keys: in a relative minor, its relative major   // each player of the moment pulls toward its home
    // key: any key in which the CURRENT chord also exists (pivot) may take over if the votes fit it clearly better
    let nk = k; if (O.harm.keys) { const now = pcsM(k, cur).join(); const LN = H.lean || (() => 0); let best = fitM(W, k) + pull(k) + (P && P.key === k ? 3 : 0) + .6 + LN(k);   // H.lean: a jam's key journey (jamkeys.js)
      for (let k2 = 0; k2 < 12; k2++) { if (k2 === k) continue; let piv = false; for (let r = 0; r < 7; r++) if (pcsM(k2, r).slice().sort().join() === pcsM(k, cur).slice().sort().join()) piv = true; if (!piv) continue;
        const dirB = P && P.dir ? ((k2 - k + 12) % 12 === (P.dir > 0 ? 7 : 5) ? 3 : 0) : 0, s = fitM(W, k2) + pull(k2) + (P && P.key === k2 ? 3 : 0) + dirB + LN(k2); if (s > best) { best = s; nk = k2; } } }
    // re-express the sounding chord in the new key (pivot), then choose the next chord: votes for its notes + a weak tension prior
    let root = cur; if (nk !== k) { const want = pcsM(k, cur).slice().sort().join(); for (let r = 0; r < 7; r++) if (pcsM(nk, r).slice().sort().join() === want) root = r; music.setKey(nk); H.keyMoves++; }
    // Q352 b NUDGE: plucked jam-tied strings since the last move add up to opts.harm.nudgeW (default 1.2, well under a push's 3 and under
    // two players' votes) spread over the chords that contain the plucked notes. Switch opts.harm.nudge (ON). The weight is my default.
    const NZ = H.nudge; let nzT = 0; for (const x of NZ) nzT += x; const nzW = O.harm.nudge !== false && nzT ? (O.harm.nudgeW == null ? 1.2 : O.harm.nudgeW) / nzT : 0;
    let br = root, bs = -1; for (let r = 0; r < 7; r++) { if (r === root) continue; let s = PRIOR[root][r] * .5 + (P && P.chord === r ? 3 : 0) + (r === 0 && H.tonicPull ? H.tonicPull : 0); for (const pc of pcsM(nk, r)) s += W[pc] + NZ[pc] * nzW; if (s > bs) { bs = s; br = r; } }
    NZ.fill(0);
    music.chord = { root: br, tones: [br, br + 2, br + 4] }; H.moves++; for (const f of music.listeners) f(); return true; };
  // moves on bar lines, every opts.harm.bars bars (only while on)
  H.tick = () => { if (!O.harm || !O.harm.on) return; const b = music.beat(), every = 4 * (O.harm.bars || 2); if (!H.nextB) H.nextB = Math.ceil(b / every) * every; if (b >= H.nextB) { H.nextB = Math.floor(b / every) * every + every; H.step(); } };
  return H;
}
export function createMusic(timeSource) {
  const M = {
    om: 64, lock: true, _bpm: 60,
    get bpm() { return M.lock ? M.om / 64 * 60 * (M.tempoK || 1) : M._bpm; },   // tempoK: the planet tradition's simple tempo ratio over the om (traditions.js; 1 = none)
    tonicHz: 64, key: 0,                            // key = semitones above the om (moves in a jam: createHarmony); tonicHz follows it
    tuning: 'om-JI-7', scale: TUNINGS['om-JI-7'],
    chord: { root: 0, tones: [0, 2, 4] },           // the chord sounding NOW (scale degrees of the current key); moves in a jam
    jam: null,                                      // when a jam exists, events quantize to the beat; none yet
    now: () => timeSource(),                        // seconds, continuous musical time
    a: { t: 0, b: 0 },                               // beat anchor: beat(t) = a.b + (t - a.t) / spb
    listeners: [],
  };
  M.spb = () => 60 / M.bpm;
  M.beat = (t = M.now()) => M.a.b + (t - M.a.t) / M.spb();
  M.timeOfBeat = b => M.a.t + (b - M.a.b) * M.spb();
  M.origin = () => M.timeOfBeat(0);                 // virtual time of beat 0 (beat-locked effects use it as their grid origin)
  M.phase = (t = M.now()) => { const b = M.beat(t); return b - Math.floor(b); };
  M.bar = (t = M.now(), beatsPerBar = 4) => M.beat(t) / beatsPerBar;
  M.nextBeat = (t = M.now(), div = 1) => M.timeOfBeat(Math.ceil(M.beat(t) * div - 1e-9) / div);
  const reanchor = fn => { const t = M.now(), b = M.beat(t); fn(); M.a = { t, b }; for (const f of M.listeners) f(); };
  M.setBpm = v => reanchor(() => { M._bpm = Math.max(20, Math.min(240, v)); M.lock = false; });
  M.setOm = v => reanchor(() => { if (M.lock) M.glide = null; M.om = Math.max(32, Math.min(128, v)); M.tonicHz = M.om * keyRatio(M.key); });
  const keyRatio = k => (M.tuning.startsWith('12') ? Math.pow(2, k / 12) : JI12[k]) / (k > 6 ? 2 : 1);   // stay near the om: keys above a tritone sit below it
  M.setKey = k => { M.key = ((k % 12) + 12) % 12; M.tonicHz = M.om * keyRatio(M.key); for (const f of M.listeners) f(); };
  M.setLock = on => reanchor(() => { if (!on) M._bpm = M.bpm; else M.glide = null; M.lock = !!on; });   // OHMS (c): locking cancels a tap-tempo glide
  M.tempoK = 1; M.setTempoK = k => reanchor(() => { M.tempoK = Math.max(.25, Math.min(4, +k || 1)); });   // TRADITIONS (Q188 A): only moves a LOCKED tempo; the beat count never jumps
  M.setTuning = k => { if (!TUNINGS[k]) return; M.tuning = k; M.scale = TUNINGS[k]; M.mode = 'major'; M.modeHow = null; M.tonicHz = M.om * keyRatio(M.key); for (const f of M.listeners) f(); };
  // v0.0.29 MODE (jamkeys.js): 'major' (the tuning's own 7-note set) | 'minor'. how 'rel' = relative minor: the SAME pitches (the
  // tuning's set rotated to its 6th degree, tonic moved to that degree: key + 9), so nothing retunes, only the centre moves; how 'par' =
  // parallel minor: same tonic, 3rd / 6th / 7th lowered (pure JI minor or 12-TET minor). Chord degrees are re-expressed by the caller.
  // Only for 7-note tunings; a tradition tuning that is not 7 notes refuses ('par' needs a minor table: om-JI-7 / 12-TET-7). Not saved:
  // like the key, a reload starts at home in major.
  M.mode = 'major'; M.modeHow = null; M.semi = () => (M.mode === 'minor' ? SEMI_MINOR : SEMI);
  M.canMode = how => { const base = TUNINGS[M.tuning]; if (!base || base.ratios.length !== 7) return false; return how === 'rel' || !!MINOR_RATIOS[M.tuning]; };
  M.setMode = (mode, how = 'rel') => { const base = TUNINGS[M.tuning]; if (!base || base.ratios.length !== 7) return false; if (mode === M.mode && (mode === 'major' || how === M.modeHow)) return true;
    const R = base.ratios, fold = (hz, k) => { const want = M.om * keyRatio(k); let h = hz; while (h > want * Math.SQRT2) h /= 2; while (h < want / Math.SQRT2) h *= 2; return h; };
    if (mode === 'minor' && how === 'rel') { const k2 = (M.key + 9) % 12, hz = fold(M.tonicHz * R[5], k2); M.scale = { name: base.name + ' (relative minor)', ratios: R.map((_, i) => { const j = (i + 5) % 7; return R[j] / R[5] * (j < 5 ? 2 : 1); }) }; M.key = k2; M.tonicHz = hz; }
    else if (mode === 'minor' && how === 'par') { if (!MINOR_RATIOS[M.tuning]) return false; M.scale = { name: base.name + ' (parallel minor)', ratios: MINOR_RATIOS[M.tuning] }; }
    else if (mode === 'major') { if (M.modeHow === 'rel') { const k2 = (M.key + 3) % 12, hz = fold(M.tonicHz / R[5], k2); M.key = k2; M.tonicHz = hz; } M.scale = base; }
    else return false;
    M.mode = mode; M.modeHow = mode === 'minor' ? how : null; for (const f of M.listeners) f(); return true; };
  M.onChange = f => M.listeners.push(f);
  // v0.0.4 tap tempo (event 'tempo.tap' {times: [s,...]} from the OHMS track): BPM = 60 / median interval; glide over 2 bars
  M.glide = null;
  M.tapTempo = times => { if (!times || times.length < 2) return; const iv = []; for (let i = 1; i < times.length; i++) iv.push(times[i] - times[i - 1]);
    iv.sort((a, b) => a - b); if (M.base == null) M.base = M.bpm; const to = Math.max(20, Math.min(240, 60 / iv[iv.length >> 1])), b = M.beat(); M.glide = { from: M.bpm, to, b0: b, b1: b + 8 }; };
  // v0.0.6 WHO FOLLOWS YOUR TEMPO (Wilbow 7A-D, PROPOSAL opts.tempo.follow 'context'): 'tempo.tap' comes from any gesture/source
  // and moves the shared clock; each ohm has a follow weight w (0..1) set from context (jamming with you or listening to you -> 1,
  // others 0 = they keep their own time, the tempo they had before your taps). Read an ohm's tempo with M.bpmFor(src).
  M.follow = new Map(); M.own = new Map(); M.base = null;
  M.setFollow = (src, w) => { if (src) M.follow.set(src.id, Math.max(0, Math.min(1, w))); };
  M.bpmFor = src => { const w = src ? (M.follow.has(src.id) ? M.follow.get(src.id) : M.followDefault) : 1, own = (src && M.own.get(src.id)) || M.base || M.bpm; return own + (M.bpm - own) * w; };
  M.followDefault = 0;
  M.tickGlide = () => { const g = M.glide; if (!g) return; const u = Math.min(1, (M.beat() - g.b0) / (g.b1 - g.b0)); M.setBpm(g.from + (g.to - g.from) * u); if (u >= 1) M.glide = null; };
  // scale as cents (for in-key effects)
  M.cents = () => M.scale.ratios.map(r => 1200 * Math.log2(r));
  // pitch of scale degree d (0-based, may be negative or past the scale length) in octave oct above the om
  M.hz = (d, oct = 0) => { const r = M.scale.ratios, n = r.length, o = Math.floor(d / n), k = ((d % n) + n) % n; return M.tonicHz * r[k] * Math.pow(2, oct + o); };
  // when an event triggered now should sound: immediately unless a jam is running (Wilbow 1:16 AM, tap timing A)
  // v0.0.7 (Wilbow 2:51 '24A 24D', PROPOSAL): inside a jam a tap snaps toward the NEAREST grid line (1/16 by default) with a
  // strength s (0 = free, 1 = hard grid) set from context by jam.js. A tap close to the line is pulled fully; one far off stays loose:
  // pull = clamp((1 - u) / (1 - s)), u = distance to the line / half a grid step. A line just passed = play now (never late).
  M.feel = null;   // a tradition's tightness 0..1 (placeholder: traditions come later; null = use the ohm's own swing)
  // TRADITIONS (traditions.js; all null / 0 when no tradition): tradFeel = the tradition's tightness (jam.js averages it with music.feel),
  // swing = off-grid snap lines sit late by swing x 1/3 step, tradDiv = the jam grid per beat (6 in 12/8), trad = the active tradition object
  M.tradFeel = null; M.swing = 0; M.tradDiv = null; M.trad = null;
  M.when = (t = M.now()) => { const J = M.jam; if (!J) return t; const div = J.div || 1, s = J.snap == null ? 1 : J.snap; if (s <= 0) return t;
    const b = M.beat(t), sw = M.swing > 0 ? M.swing / (3 * div) : 0, gi = Math.round((b - (sw ? sw * .5 : 0)) * div), g = gi / div + (sw && gi % 2 ? sw : 0); if (g <= b + 1e-9) return t; const u = Math.min(1, (g - b) * div * 2), pull = s >= 1 ? 1 : Math.max(0, Math.min(1, (1 - u) / (1 - s)));
    return pull <= 0 ? t : M.timeOfBeat(b + (g - b) * pull); };
  return M;
}
