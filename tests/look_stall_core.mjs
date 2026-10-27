// first-frame stall probe (P1 bench setup, q0): every frame of each P1 state INCLUDING the warm-up, timed per look call, so the
// frame right after a state change (unhealed -> developing ...) is seen. Shared by tests/look_stall.mjs (Chromium).
import { QDPR, BGS } from './look_bench_core.mjs';
export async function stallP1({ createLook, mkCanvas, makeCanvas, now, frames = 120, N = 50, W = 412, H = 860, flush = null, qs = [0], idle = 2, mem = null }) {
  let T = 0; const subs = {}, bus = { on: (k, f) => (subs[k] || (subs[k] = [])).push(f) }, note = ev => (subs.note || []).forEach(f => f(ev));
  const music = { now: () => T, beat: t => (t == null ? T : t) * 2, bar: t => (t == null ? T : t) / 2, key: 0, chord: { root: 0 }, scale: { ratios: [1, 9 / 8, 5 / 4] }, jam: { div: 2 } };
  const ohms = []; for (let i = 0; i < N; i++) ohms.push({ id: 10 + i, hue: (i * 137.5) % 360, glow: .5, look: { glow: .3 }, r: 10 + (i * 7) % 31, x: 0, y: 0, scale: 'ohm' });
  const out = [];
  for (const q of qs) { const dpr = QDPR[q], c = mkCanvas(Math.round(W * dpr), Math.round(H * dpr)), g = c.getContext('2d'), bc = mkCanvas(Math.round(W * BGS[q]), Math.round(H * BGS[q])), b = bc.getContext('2d');
    let HEAL = 0; const look = createLook({ sim: { healAt: () => .5 + .5 * HEAL }, music, bus, makeCanvas, opts: { p1: true } }), Lw = { hue: 140, spread: 80 }, res = {};
    for (const [mode, heal] of [['unhealed', 0], ['developing', .5], ['harmonised', 1], ['peak', 1]]) { HEAL = heal; const fr = [];
      for (let f = 0; f < frames; f++) { T += 1 / 60;
        if (f % 30 === 0) for (let i = 0; i < 10; i++) note({ src: ohms[i], kind: 'note', jam: 1 });
        b.setTransform(BGS[q], 0, 0, BGS[q], 0, 0); b.fillStyle = '#10131a'; b.fillRect(0, 0, W, H); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        for (let i = 0; i < N; i++) { const o = ohms[i]; o.x = 30 + (i % 7) * 56 + Math.sin(T + i) * 6; o.y = 40 + Math.floor(i / 7) * 110 + Math.cos(T * 1.3 + i) * 6; o.glow = .5 + .5 * Math.sin(T * 3 + i); }
        for (const o of ohms) { g.fillStyle = `hsl(${o.hue},65%,50%)`; g.beginPath(); g.arc(o.x, o.y, o.r, 0, 6.2832); g.fill(); }
        if (flush) { flush(g); flush(b); }
        const st = { t: T, W, H, q, trip: heal, burst: mode === 'peak' && f % 360 === 0 ? 1 : 0, pulse: .5, A: { x: W / 2, y: H * .45 } };
        const h0 = mem ? mem() : 0; const t0 = now(); look.frame(st); look.palette(Lw, st); const t1 = now(); look.layer(b, Lw, 1, st, 'field'); if (flush) flush(b); const t2 = now(); look.layer(b, Lw, 1, st, 'over'); if (flush) flush(b); const t3 = now();
        for (const o of ohms) look.ohm(g, o, o.x, o.y, o.r, st); if (flush) flush(g); const t4 = now(); look.post(g, st); if (flush) { flush(g); flush(b); } const t5 = now();
        let ib = 0; if (look.api.idle) { const i0 = now(); look.api.idle(idle); ib = now() - i0; }
        fr.push({ f, heap: mem ? mem() - h0 : 0, ms: t5 - t0, frame: t1 - t0, field: t2 - t1, over: t3 - t2, ohm: t4 - t3, post: t5 - t4, idle: ib }); }
      res[mode] = fr; }
    out.push({ q, res }); }
  return out;
}
