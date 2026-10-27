// ROOM IN A JAM (Wilbow 3:58 PM Oct 25, Q350 'a': ohms actively leave room for each other in pitch AND rhythm, on top of jam.js's
// octave move from a crowded register and its sparser answers to a busy caller). Context, never random: it listens to every jam note
// (ohm / voice sources) for the last opts.leaveRoom.bars bars and remembers WHO used which 16th step of the bar and which pitch
// (degree + 7 x octave). A jam phrase (autojam.js turns, jam.js answers) is then THINNED, never muted:
//   rhythm: a note on a step another ohm is using moves to the nearest free neighbouring 16th (+-1 step); if none is free it drops out,
//     but at least half the phrase (and always its first note) stays;
//   pitch: a note on a pitch another ohm is sounding takes the next free chord tone (same register band), else stays;
//   register: if the others sit within 4 scale steps of this ohm's register, it moves an octave away (autojam.js had no octave move).
// Dev panel switch (systems list): opts.leaveRoom.on (ON by default, Q350 a). The values are my defaults.
export const ROOM_OPTS = { on: true, bars: 2, keep: .5, near: 4 };
export function createRoom(bus, music, opts = {}) { const O = Object.assign({}, ROOM_OPTS, opts), R = { opts: O, ev: [], thinned: 0, moved: 0, shifted: 0 };
  const step = b => ((Math.round(b * 4) % 16) + 16) % 16;
  bus.on('note', ev => { const s = ev.src; if (!s || (s.scale !== 'ohm' && s.scale !== 'voice') || ev.deg == null || (ev.kind !== 'note' && ev.kind !== 'strike')) return;
    const b = ev.beat != null ? ev.beat : music.beat(ev.t != null ? ev.t : music.now()); R.ev.push({ id: s.id, b, st: step(b), p: ev.deg + 7 * (ev.oct || 0) }); if (R.ev.length > 512) R.ev.splice(0, 128); });
  const recent = (id, b) => { const lo = b - 4 * O.bars - 4; R.ev = R.ev.filter(e => e.b >= lo - 4); return R.ev.filter(e => e.id !== id && e.b >= lo); };
  // the others' footprint around beat b (default now): steps used, pitches used, mean register
  R.others = (id, b = music.beat()) => { const E = recent(id, b), steps = new Set(), pitches = new Set(); let reg = 0; for (const e of E) { steps.add(e.st); pitches.add(e.p); reg += e.p; }
    return { steps, pitches, reg: E.length ? reg / E.length : null, n: E.length }; };
  // notes: [{ b (absolute beat), deg, oct }] for source id -> thinned copy (same objects order; dropped ones removed)
  R.fit = (id, notes, chord = [0, 2, 4], opt = {}) => { if (!O.on || !notes.length) return notes; const F = R.others(id, notes[0].b); if (!F.n) return notes;
    const out = [], minKeep = Math.max(1, Math.ceil(notes.length * O.keep)), taken = new Set();
    let oShift = 0; if (opt.register !== false && F.reg != null) { const mine = notes.reduce((a, n) => a + n.deg + 7 * (n.oct || 0), 0) / notes.length; if (Math.abs(mine - F.reg) < O.near) { oShift = mine >= F.reg ? 1 : -1; R.shifted++; } }
    notes.forEach((n, i) => { const left = notes.length - i, need = minKeep - out.length; let b = n.b, s = step(b);
      if (F.steps.has(s) || taken.has(s)) { const alt = [1, -1].map(k => b + k / 4).find(x => !F.steps.has(step(x)) && !taken.has(step(x)) && Math.floor(x / 4) === Math.floor(n.b / 4));
        if (alt != null) { b = alt; s = step(b); R.moved++; } else if (i > 0 && left > need) { R.thinned++; return; } }
      taken.add(s); let deg = n.deg, oct = (n.oct || 0) + oShift;
      if (F.pitches.has(deg + 7 * oct)) { const c = chord.map(t => ((t % 7) + 7) % 7), base = 7 * Math.floor(deg / 7); const cand = [...c.map(x => base - 7 + x), ...c.map(x => base + x), ...c.map(x => base + 7 + x)].sort((x, y) => Math.abs(x - deg) - Math.abs(y - deg)); for (const t of cand) if (t !== deg && !F.pitches.has(t + 7 * oct)) { deg = t; break; } }
      out.push({ ...n, b, deg, oct }); });
    return out; };
  return R; }
