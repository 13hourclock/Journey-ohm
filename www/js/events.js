// THE EVENT BUS on the music.js clock (D). Every change in the game is a stamped event; no system calls another directly.
//   note  { src, kind: strike|note|beat|sustain|release|damp, deg, oct, vel, pos, dur, inputT }  - sound events (taps: stamped 'now',
//         quantized only inside a jam: music.when). Recorded per source in BEAT time with the recipe id (the song as data).
//   ctl   { src, key, v }   - control-rate streams: touch / gesture input, body physics, clock (beat, bar, key), LFOs, envelopes,
//         sound levels coming back from the audio thread. The shared world state (A) is just the latest value of each stream.
//   live  { src, out }      - the influence matrix's control-rate result for one owner (synth / effect / mod / look / body targets)
//   set   { src, path, v }  - an edit (panel, store, preset): recipe fields, world options, tempo / om / tuning
//   recipe{ src, rec }      - a source switches to another recipe (load / new seed)
// Delivery is synchronous (a tap reaches the audio engine in the same task), so the clock stamp is the ordering, not a delay.
export function createEvents(music) {
  const B = { subs: {}, n: {}, total: 0, records: new Map(), sent: 0 };
  B.on = (type, fn) => { (B.subs[type] || (B.subs[type] = [])).push(fn); };
  B.post = ev => { if (ev.t == null) ev.t = music.now(); B.total++; B.n[ev.type] = (B.n[ev.type] || 0) + 1;
    const L = B.subs[ev.type]; if (L) for (const fn of L) fn(ev); const A = B.subs['*']; if (A) for (const fn of A) fn(ev); return ev; };
  // convenience: a sound event (tap timing A: now unless a jam quantizes it; a scheduled event keeps its own future t)
  B.note = ev => { if (B.shape && ev.auto) { ev = B.shape(ev); if (!ev) { B.shaped = (B.shaped || 0) + 1; return null; } }   // v0.0.29 skymood.js (switch skyMood, OFF): the sky leans the ohms' own notes
    if (ev.kind === 'note' || ev.kind === 'strike') { const nb = music.beat(); B.recent.push(nb); if (B.recent.length > 64) B.recent.shift(); B.lastNoteB = nb; } ev.type = 'note'; if (ev.t == null) ev.t = music.when(music.now()); ev.beat = music.beat(ev.t);
    if (ev.kind !== 'release' && ev.kind !== 'damp' && ev.kind !== 'level') { let r = B.records.get(ev.src.id); if (!r) { r = { src: ev.src.id, scale: ev.src.scale, events: [] }; B.records.set(ev.src.id, r); }
      r.events.push({ beat: ev.beat, kind: ev.kind, deg: ev.deg, oct: ev.oct, vel: ev.vel, pos: ev.pos, dur: ev.dur, recipe: ev.src.recipe }); if (r.events.length > 512) r.events.shift(); }
    B.sent++; return B.post(ev); };
  B.ctl = (src, key, v, t) => B.post({ type: 'ctl', src, key, v, t });
  // v0.0.4 (PROPOSAL 2:09): during a jam a TAP change (B.tap set by the caller around a discrete edit) lands on the next bar
  // line; a HOLD / continuous change (sliders, drags, matrix) applies at once. Outside a jam every change is instant.
  B.tap = 0; B.pending = [];
  // v0.0.6 (Wilbow 6A+6D, PROPOSAL B.land = opts.land): WHEN a tap change lands depends on context. 'context': a touch ON the beat
  // (within win beats) lands now, an off-beat touch at the next bar, and while the jam is dense (>= dense notes in the last bar) at the
  // phrase end = the first 1-beat gap or the next 4-bar line. 'bar' = always next bar (v0.0.4), 'now' = never wait.
  B.land = { mode: 'context', win: .12, dense: 8 }; B.recent = []; B.lastNoteB = -1e9;
  B.landAt = () => { const L = B.land, b = music.beat(), m = L.mode || 'context'; if (m === 'now') return null; const bar = music.timeOfBeat(Math.ceil(b / 4 - 1e-9) * 4);
    if (m === 'bar') return { t: bar }; while (B.recent.length && B.recent[0] < b - 4) B.recent.shift();
    if (B.recent.length >= L.dense) return { t: music.timeOfBeat(Math.ceil(b / 16 - 1e-9) * 16), phrase: 1 };
    const on = B.tap && typeof B.tap === 'object' && B.tap.onBeat != null ? B.tap.onBeat : Math.abs(b - Math.round(b)) <= L.win;   // OHMS input timing when present
    return on ? null : { t: bar }; };
  B.set = (src, path, v) => { if (B.tap && music.jam) { const w = B.landAt(); if (w) { B.pending.push({ type: 'set', src, path, v, t: w.t, bar: 1, phrase: w.phrase }); return null; } }
    return B.post({ type: 'set', src, path, v }); };
  B.flush = (now = music.now()) => { if (!B.pending.length) return; const gap = music.beat() - B.lastNoteB >= 1; const due = B.pending.filter(e => e.t <= now || (e.phrase && gap)); if (!due.length) return;
    B.pending = B.pending.filter(e => !due.includes(e)); for (const e of due) B.post(e); };
  return B;
}
