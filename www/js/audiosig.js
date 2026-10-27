// RETROACTIVE VISUAL HOOKS (Wilbow 12:23 AM MDT Oct 26: "The visualizer connections to the audio engine are retroactive to the build
// time order"). ONE read-only object, st.audio (render's per-frame state passed to look/; also lookCtx.audioSig and JO.audioSig), that the look can read every frame to draw from ANY
// sound system already built, in build order. Game Dev exposes; Visuals draws. Nothing here changes the sound.
// Updated on the control tick (~40 Hz) + note events; cheap: no allocation per frame, a fixed set of numbers.
// Conventions: level 0..1 (the audio thread's per-source loudness, sim.sig 'sound.level'); onset 1 on a hit, then decays (tau .25 s);
// pc = pitch class 0..11 above the om (0 = the om's own note); rate = notes per second (smoothed ~1 s); x / y = world position of the
// last one (null if none). Sections, in the order they were built:
//   om        { level, hz, heart, drone }      the om hum (planet.js voices 103/104), heartbeat onset (101), om drone level (102)
//   notes     { onset, level, pc, deg, oct, rate, bright, damp, id, x, y }   ohm notes + the last noting ohm's timbre (recipe bright/damp)
//   strings   { onset, pc, rate, id, x, y }    drawn strings (things.js)
//   bars      { onset, pc, rate, id, x, y }    drawn bars
//   membranes { onset, pc, rate, id, x, y }    drawn drums / membranes
//   jam       { on, pairs, beat, phase, bar, down, chord, chordOn, key, keyOn, frontOn, front, grow, growOn }   jams and the beat:
//             beat = beats (float), phase 0..1 in the beat, down = downbeat onset, chordOn / keyOn = onsets on a chord / key change,
//             frontOn = a jam handed its front over (jamroles.js), grow = largest watched-jam loop (bars), growOn on a growth
//   arc       { on, phase, progress, section, sectionOn, hookOn, endOn, breakdownOn, discord }   the song arc (songs.js)
//   trad      { id, cycle, step, steps, accent, crazeOn, tradOn }   traditions (cycle position, accent strength) + crazes (craze.js)
//   abilities { onset, kind, rate, x, y }      special abilities (the ability of the last ability note: 'echo', 'metro', ...)
//   muffle    { amt }                          the deaf muffle (0 until the muffle filter lands; reads sim.muffle.amt when present)
//   trippy    0..1                             the trippy gate (trippy.js), for convenience
// Every field exists from the start (zeros / null), so look code never has to test for it.
export function createAudioSig({ sim, bus, music, songs, autojam, traditions, things, ctx, st = null, jamRoles, jamGrow }) {
  const mk = () => ({ onset: 0, pc: 0, rate: 0, id: null, x: null, y: null, _n: 0 });
  const S = { t: 0, ver: 1, om: { level: 0, hz: 0, heart: 0, drone: 0 }, notes: Object.assign(mk(), { level: 0, deg: 0, oct: 0, bright: 0, damp: 0 }), strings: mk(), bars: mk(), membranes: mk(),
    jam: { on: false, pairs: 0, beat: 0, phase: 0, bar: 0, down: 0, chord: 0, chordOn: 0, key: 0, keyOn: 0, frontOn: 0, front: null, grow: 0, growOn: 0 },
    arc: { on: false, phase: null, progress: 0, section: null, sectionOn: 0, hookOn: 0, endOn: 0, breakdownOn: 0, discord: 0 },
    trad: { id: null, cycle: null, step: 0, steps: 0, accent: 0, crazeOn: 0, tradOn: 0 }, abilities: { onset: 0, kind: null, rate: 0, x: null, y: null, _n: 0 }, muffle: { amt: 0 }, trippy: 1 };
  const thingOf = new Map(); const kindOf = src => { let th = thingOf.get(src.id); if (th === undefined) { th = (things && things.list || []).find(t => t.src === src || 'drawn:' + t.id === src.id) || null; if (th) thingOf.set(src.id, th); } return th ? th.kind : null; };
  const pcOf = ev => { const f = ev.f || (ev.deg != null && music.hz ? music.hz(ev.deg, ev.oct || 0) : 0), om = music.om || 64; return f > 0 ? ((Math.round(12 * Math.log2(f / om)) % 12) + 12) % 12 : 0; };
  const hit = (D, ev, o) => { D.onset = 1; D._n++; D.pc = pcOf(ev); D.id = o.id; const b = o.body; D.x = b ? b.x : null; D.y = b ? b.y : null; };
  const SL = id => { const g = sim.sig && sim.sig[id]; return g ? g['sound.level'] || 0 : 0; };
  if (bus && bus.on) {
    bus.on('note', ev => { const o = ev && ev.src; if (!o || ev.kind === 'release' || ev.kind === 'damp' || ev.kind === 'level') return;
      if (o.id === 101) { S.om.heart = 1; return; }
      if (ev.ab) { const A = S.abilities; A.onset = 1; A._n++; A.kind = ev.ab; A.x = o.body ? o.body.x : null; A.y = o.body ? o.body.y : null; }
      if (o.scale === 'ohm') { const N = S.notes; hit(N, ev, o); N.deg = ev.deg != null ? ev.deg : N.deg; N.oct = ev.oct || 0; const tb = o.timbre; if (tb) { N.bright = tb.bright || 0; N.damp = tb.damp || 0; } if (ev.hook) S.arc.hookOn = 1; return; }
      if (o.scale === 'thing') { const k = kindOf(o); if (k === 'string') hit(S.strings, ev, o); else if (k === 'bar') hit(S.bars, ev, o); else if (k === 'membrane') hit(S.membranes, ev, o); } });
    bus.on('song.section', () => { S.arc.sectionOn = 1; }); bus.on('song.end', () => { S.arc.endOn = 1; }); bus.on('song.breakdown', () => { S.arc.breakdownOn = 1; });
    bus.on('jam.front', ev => { S.jam.frontOn = 1; S.jam.front = ev.to; }); bus.on('jam.grow', ev => { S.jam.growOn = 1; S.jam.grow = Math.max(S.jam.grow, ev.len || 0); });
    bus.on('craze.catch', () => { S.trad.crazeOn = 1; }); bus.on('craze.trad', () => { S.trad.tradOn = 1; }); }
  let lastChord = null, lastKey = null, lastDown = -1, lastT = 0;
  S.tick = () => { const now = performance.now() / 1000, dt = lastT ? Math.min(.25, now - lastT) : 0; lastT = now; S.t = now; const dk = Math.exp(-dt / .25), rk = Math.min(1, dt);
    for (const D of [S.notes, S.strings, S.bars, S.membranes, S.abilities]) { D.onset *= dk; D.rate += ((dt ? D._n / dt : 0) - D.rate) * rk; D._n = 0; }
    S.om.heart *= dk; for (const k of ['down', 'chordOn', 'keyOn', 'frontOn', 'growOn']) S.jam[k] *= dk; for (const k of ['sectionOn', 'hookOn', 'endOn', 'breakdownOn']) S.arc[k] *= dk; S.trad.crazeOn *= dk; S.trad.tradOn *= dk;
    S.om.level = Math.max(SL(103), SL(104)); S.om.drone = SL(102); S.om.hz = music.om || 0;
    let lv = 0; for (const o of sim.ohms || []) { const v = SL(o.id); if (v > lv) lv = v; } S.notes.level = lv;
    const J = S.jam, b = music.beat(); J.beat = b; J.phase = b - Math.floor(b); const bar = Math.floor(b / 4); J.bar = bar; if (bar !== lastDown) { if (lastDown >= 0) J.down = 1; lastDown = bar; }
    const cr = music.chord ? music.chord.root : 0; if (lastChord != null && cr !== lastChord) J.chordOn = 1; lastChord = cr; J.chord = cr; if (lastKey != null && music.key !== lastKey) J.keyOn = 1; lastKey = music.key; J.key = music.key;
    const P = (autojam && autojam.jams) || []; J.pairs = P.length; J.on = !!music.jam || P.length > 0;
    const sg = ctx && ctx.song; const Sg = S.arc; Sg.on = !!sg; Sg.phase = sg ? sg.phase : null; Sg.progress = sg ? sg.progress : 0; Sg.section = sg ? sg.section : null;
    let dmax = 0; if (songs && songs.discord) for (const G of songs.groups) if (G.state === 'song') dmax = Math.max(dmax, songs.discord(G)); Sg.discord = dmax;
    const tf = ctx && ctx.tradition; const T = S.trad; if (tf) { T.id = tf.id; const c = tf.cycle; T.cycle = c ? c.name : null; T.step = c ? c.step : 0; T.steps = c ? c.steps : 0; T.accent = c ? +c.accent || 0 : 0; } else { T.id = null; T.cycle = null; }
    S.muffle.amt = sim.muffle && typeof sim.muffle.amt === 'number' ? sim.muffle.amt : 0; S.trippy = st && typeof st.trippy === 'number' ? st.trippy : ctx && typeof ctx.trippy === 'number' ? ctx.trippy : 1; };
  if (st) st.audio = S; if (ctx) ctx.audioSig = S;   // st.audio = the name settled with Visuals (12:53 AM); lookCtx.audioSig = the same object
  return S;
}
