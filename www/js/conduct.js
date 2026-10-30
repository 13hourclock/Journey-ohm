// CONDUCTING WITH TWO-FINGER GESTURES (old game R4.11 / V07 section B, Wilbow t202 / t205: "a way to command a whole area of observable
// ohms to pay attention and be conducted", "7 yes conducting the upbeat makes sense with an upstroke"; F5 defaults; R4.14 / Q8 open).
//   RAISE    two fingers resting still on bare ground ~0.6 s raise the baton: every ohm in view turns toward you and WAITS (its jam
//            holds) until your first beat.
//   CONDUCT  with the baton up, a THIRD finger's strokes conduct (they do not draw):
//     - down / up beats set the TEMPO from their speed (time between the bottoms of the beats), snapped to synced steps of the current
//       tempo (half, 2/3, 3/4, same, 4/3, 3/2, double, V07 F4); the UPSTROKE marks the upbeat (tempo only, not the bar phase: Q8 open).
//       Sent as the usual 'tempo.tap' to the ohms in view, so the existing follow / glide does the rest (after release the jam keeps
//       the conducted tempo and slowly drifts back if members disagree, F5).
//     - raising your hand makes them LOUDER, lowering it SOFTER (x .5 .. 1.5, eased).
//     - a stroke CUES every ohm it passes THROUGH (not sides): it plays a short phrase on the next beat. Beats count only away from ohms.
//     - a sharp FLICK DOWN cuts them off (silent to the end of the next bar).
//   RELEASE  lifting the two baton fingers (or 8 s without a stroke) lets them go.
// GESTURE CLASH (not decided here, listed for Wilbow): two fingers resting still on bare ground for .6 s is ALREADY "shape the ground
// with your voice" (v0.0.13 T1 A, input.js / shape.js). So the touch binding is behind its own switch 'conductGesture', OFF; when ON
// it takes that hold (no ground shaping), and the 3rd finger landing (which normally ends the shaping) conducts. The engine below is
// on (switch 'conduct') and can be driven by any future gesture. Old game NOTES: built as two resting fingers + a third conducting.
export const CONDUCT_OPTS = { on: true, gesture: false, holdMs: 600, stillPx: 14, idleS: 8, steps: [.5, 2 / 3, .75, 1, 4 / 3, 1.5, 2], minPx: 18, flickV: 2.2, flickMs: 200, volLo: .5, volHi: 1.5 };
export function snapTempo(cur, measured, steps = CONDUCT_OPTS.steps) { const r = measured / Math.max(1, cur); let best = 1, bd = 1e9; for (const s of steps) { const d = Math.abs(Math.log(r / s)); if (d < bd) { bd = d; best = s; } } return cur * best; }
export function createConduct({ sim, bus, music, size, toScreen, opts = {} }) {
  const O = { ...CONDUCT_OPTS, ...opts }, C = { opts: O, up: false, set: new Set(), vol: 1, volT: 1, ict: [], dir: 0, lastY: null, lastT: 0, last: 0, waiting: false, cutTo: -1, cues: 0, beats: 0, cuts: 0, raises: 0, tempos: 0, path: null, at: null };
  const view = () => { const { W, H } = size(); const out = []; if (!W) return out; for (const o of sim.ohms || []) { if (o.parked || o.dead || !o.body || o === sim.ohm) continue; const s = toScreen(W, H, sim.cam, o.body.x, o.body.y); if (s.x > -20 && s.y > -20 && s.x < W + 20 && s.y < H + 20) out.push(o); } return out; };
  const onOhm = (x, y) => { const { W, H } = size(); for (const o of C.set) { const s = toScreen(W, H, sim.cam, o.body.x, o.body.y), r = Math.max(30, ((o.g && o.g.r) || .5) * s.s * 1.15); if (Math.hypot(x - s.x, y - s.y) < r) return o; } return null; };
  C.raise = (wx, wy) => { if (!O.on || C.up) return false; C.up = true; C.raises++; C.set = new Set(view()); C.waiting = true; C.last = performance.now(); C.ict = []; C.at = { x: wx, y: wy };
    for (const o of C.set) { o.watch = { x: wx, y: wy, baton: 1 }; o._cond = 1; } if (bus.post) bus.post({ type: 'conduct.raise', n: C.set.size, x: wx, y: wy }); return true; };
  C.release = why => { if (!C.up) return; C.up = false; C.waiting = false; C.volT = 1; for (const o of C.set) { if (o.watch && o.watch.baton) delete o.watch; delete o._cond; } if (bus.post) bus.post({ type: 'conduct.release', why: why || 'lift' }); C.set.clear(); C.path = null; };
  // the conducting finger (screen px, ms)
  C.down = (x, y, t) => { if (!C.up) return; C.path = [[x, y, t]]; C.lastY = y; C.lastT = t; C.dir = 0; C.last = performance.now(); C.hit = new Set(); };
  C.move = (x, y, t) => { if (!C.up || !C.path) return; const { H } = size(); C.path.push([x, y, t]); if (C.path.length > 64) C.path.shift(); C.last = performance.now();
    C.volT = O.volLo + (O.volHi - O.volLo) * Math.max(0, Math.min(1, 1 - y / Math.max(1, H)));   // hand height = loudness
    const o = onOhm(x, y); if (o && !C.hit.has(o)) { C.hit.add(o); cue(o); }   // a stroke cues the ohms it passes THROUGH
    const dy = y - C.lastY; if (Math.abs(dy) < 3) return; const d = dy > 0 ? 1 : -1;
    if (C.dir === 1 && d === -1 && !o) beat(t, 'down');   // the bottom of a down stroke = the beat (ictus), away from ohms
    else if (C.dir === -1 && d === 1 && !o) beat(t, 'up');   // the top of an upstroke = the upbeat
    C.dir = d; C.lastY = y; C.lastT = t; };
  C.end = (x, y, t) => { if (!C.up || !C.path) return; const p = C.path, a = p[Math.max(0, p.length - 6)], dt = Math.max(1, t - a[2]), vy = (y - a[1]) / dt, tot = t - p[0][2];
    if (vy > O.flickV && tot < O.flickMs * 2 && y - p[0][1] > 40) cut(); C.path = null; };
  const beat = (t, kind) => { C.beats++; if (C.waiting && kind === 'down') { C.waiting = false; if (bus.post) bus.post({ type: 'conduct.start' }); }
    if (kind !== 'down') { C.up1 = t; return; }   // the upbeat: marks the beat to come (tempo only, Q8)
    C.ict.push(t / 1000); if (C.ict.length > 5) C.ict.shift(); if (C.ict.length < 3) return;
    const iv = []; for (let i = 1; i < C.ict.length; i++) iv.push(C.ict[i] - C.ict[i - 1]); const mn = Math.min(...iv), mx = Math.max(...iv); if (mx / mn > 1.35 || mn < .18) return;
    const bpm = 60 / (iv.reduce((s, x) => s + x, 0) / iv.length), to = snapTempo(music.bpm, bpm, O.steps); if (Math.abs(to - music.bpm) < .5) return;
    const sp = 60 / to, n = 4, now = music.now(), times = Array.from({ length: n }, (_, i) => now - (n - 1 - i) * sp);
    bus.post({ type: 'tempo.tap', times, bpm: to, src: 'conduct', to: [...C.set].map(o => o.id), conducted: 1 }); C.tempos++; C.ict = C.ict.slice(-1); };
  const cue = o => { const ch = (music.chord && music.chord.tones) || [0, 2, 4], b = Math.ceil(music.beat() + .01); C.cues++; if (sim.wake) sim.wake(o);
    for (let i = 0; i < 3; i++) bus.note({ src: o, kind: 'note', deg: ch[i % 3], oct: 0, vel: .55 * C.vol, t: music.timeOfBeat(b + i * .5), beat: b + i * .5, jam: 1, cue: 1 }); };
  const cut = () => { C.cuts++; C.cutTo = (Math.floor(music.beat() / 4) + 2) * 4; for (const o of C.set) { bus.note({ src: o, kind: 'release' }); bus.note({ src: o, kind: 'damp', tau: .05 }); } if (bus.post) bus.post({ type: 'conduct.cut' }); };
  // hooks: a conducted ohm waits / is cut off (sim.dictated -> [] = rests), and is louder / softer (sim.autoFor vol)
  C.silent = (o, bar) => C.set.has(o) && ((C.up && C.waiting) || bar * 4 < C.cutTo);
  const d0 = sim.dictated; sim.dictated = (o, bar) => (O.on && C.silent(o, bar) ? [] : d0 ? d0(o, bar) : null);
  const a0 = sim.autoFor; sim.autoFor = (o, beat) => { const A = a0 ? a0(o, beat) : null; if (!O.on || !C.set.has(o) || Math.abs(C.vol - 1) < .01) return A; return { vol: (A ? A.vol : 1) * C.vol, cutK: A ? A.cutK : 1 }; };
  C.tick = dt => { C.vol += (C.volT - C.vol) * Math.min(1, (dt || .02) * 4); if (!C.up && Math.abs(C.vol - 1) < .01) C.vol = 1; if (C.up && performance.now() - C.last > O.idleS * 1000) C.release('idle'); };
  C.armed = false; C.owns = () => O.on && O.gesture && (!O.near || C.armed);   // Oct 28 (#413 A): with O.near set, only a two-finger hold near a jam conducts; elsewhere it shapes the ground   // input.js: with the gesture on, the two-finger still hold raises the baton instead of ground shaping
  // the touch binding (OFF by default: clash above). Window capture, watches only the play canvas; never consumes events.
  C.attach = el => { if (!el || typeof window === 'undefined') return; const P = new Map(); let holdT = 0, baton = null, third = null;
    const free = (x, y) => { const { W, H } = size(); for (const o of sim.ohms || []) { if (!o.body) continue; const s = toScreen(W, H, sim.cam, o.body.x, o.body.y), r = Math.max(36, ((o.g && o.g.r) || .5) * s.s * 1.15); if (Math.hypot(x - s.x, y - s.y) < r) return false; } return true; };
    const toW = (x, y) => { const { W, H } = size(), s = toScreen(W, H, sim.cam, 0, 0), s1 = toScreen(W, H, sim.cam, 1, 0), k = Math.max(1e-6, s1.x - s.x); return { x: (x - s.x) / k, y: (y - s.y) / k }; };
    window.addEventListener('pointerdown', e => { if (e.target !== el || !O.on || !O.gesture) return; P.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
      if (C.up && baton && !baton.includes(e.pointerId) && third == null) { third = e.pointerId; C.down(e.clientX, e.clientY, e.timeStamp); return; }
      clearTimeout(holdT); if (P.size === 2) { const ids = [...P.keys()], ps = ids.map(i => P.get(i)); if (!ps.every(p => free(p.x0, p.y0))) return; C.armed = !O.near || !!O.near((ps[0].x0 + ps[1].x0) / 2, (ps[0].y0 + ps[1].y0) / 2); if (!C.armed) return;
        holdT = setTimeout(() => { if (P.size !== 2 || !ids.every(i => P.has(i))) return; if (ids.some(i => { const p = P.get(i); return Math.hypot(p.x - p.x0, p.y - p.y0) > O.stillPx; })) return;
          const m = toW((ps[0].x + ps[1].x) / 2, (ps[0].y + ps[1].y) / 2); if (C.raise(m.x, m.y)) baton = ids; }, O.holdMs); } }, { capture: true });
    window.addEventListener('pointermove', e => { const p = P.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY; if (e.pointerId === third) C.move(e.clientX, e.clientY, e.timeStamp); }, { capture: true });
    const up = e => { if (!P.has(e.pointerId)) return; P.delete(e.pointerId); if (e.pointerId === third) { C.end(e.clientX, e.clientY, e.timeStamp); third = null; } if (baton && baton.includes(e.pointerId)) { baton = null; third = null; C.release('lift'); } clearTimeout(holdT); };
    window.addEventListener('pointerup', up, { capture: true }); window.addEventListener('pointercancel', up, { capture: true }); };
  return C;
}
