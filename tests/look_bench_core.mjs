// shared bench body (node-canvas and Chromium): 50 ohm-sized bodies with light (shade + rim) and glow at each quality rung.
// Measures ONLY the look work (look.frame + 50x look.ohm, or look.bodies), separately from the base drawing the world does.
export const QDPR = [1.5, 1.25, 1, .75], BGS = [.6, .5, .45, .4];   // render.js: dpr per rung, background canvas scale per rung   // render.js QL dpr per rung (world track)
export async function bench({ createLook, mkCanvas, makeCanvas, now, frames = 240, warm = 40, N = 50, W = 412, H = 860, flush = null }) {
  let T = 0; const music = { now: () => T, beat: t => (t == null ? T : t), bar: t => (t == null ? T : t) / 4, key: 0, chord: { root: 0 }, scale: { ratios: [1, 9 / 8, 5 / 4] }, jam: { div: 2 } };
  const ohms = []; for (let i = 0; i < N; i++) ohms.push({ id: 10 + i, hue: (i * 137.5) % 360, glow: (i % 7) / 5, look: { glow: (i % 3) / 3 }, r: 10 + (i * 7) % 31, x: 0, y: 0 });
  const out = [];
  for (let q = 0; q < 4; q++) { const dpr = QDPR[q], c = mkCanvas(Math.round(W * dpr), Math.round(H * dpr)), g = c.getContext('2d');
    const look = createLook({ music, makeCanvas, opts: { post: false } }), res = {};
    for (const mode of ['overlay', 'bodies', 'naive']) { const ts = []; let bases = 0;
      for (let f = 0; f < warm + frames; f++) { T += 1 / 60; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H);
        for (let i = 0; i < N; i++) { const o = ohms[i]; o.x = 30 + (i % 7) * 56 + Math.sin(T + i) * 6; o.y = 40 + Math.floor(i / 7) * 110 + Math.cos(T * 1.3 + i) * 6; o.glow = .5 + .5 * Math.sin(T * 3 + i); }
        if (mode !== 'bodies') { const b0 = now(); for (const o of ohms) { g.fillStyle = `hsl(${o.hue},65%,50%)`; g.beginPath(); g.arc(o.x, o.y, o.r, 0, 6.2832); g.fill(); } bases += now() - b0; }   // what the world draws anyway
        if (flush) flush(g);
        const t0 = now();
        if (mode === 'overlay') { look.frame({ t: T, W, H, q }); if (q < 2 || true) for (const o of ohms) look.ohm(g, o, o.x, o.y, o.r, null); }
        else if (mode === 'bodies') { look.frame({ t: T, W, H, q }); look.bodies(g, ohms.map(o => ({ x: o.x, y: o.y, r: o.r, rgb: hsl(o.hue), glow: o.glow }))); }
        else { for (const o of ohms) { const hh = g.createRadialGradient(o.x, o.y, o.r * .3, o.x, o.y, o.r * 2.6); hh.addColorStop(0, `hsla(${o.hue},90%,65%,.5)`); hh.addColorStop(1, 'hsla(0,0%,0%,0)'); g.fillStyle = hh; g.beginPath(); g.arc(o.x, o.y, o.r * 2.6, 0, 7); g.fill();
            const bd = g.createRadialGradient(o.x - o.r * .3, o.y - o.r * .35, o.r * .1, o.x, o.y, o.r); bd.addColorStop(0, `hsla(${o.hue},70%,80%,1)`); bd.addColorStop(1, `hsla(${o.hue},70%,30%,.9)`); g.fillStyle = bd; g.beginPath(); g.arc(o.x, o.y, o.r, 0, 7); g.fill(); } }
        if (flush) flush(g);
        const dt = now() - t0; if (f >= warm) ts.push(dt); }
      ts.sort((a, b) => a - b); res[mode] = { mean: ts.reduce((a, b) => a + b, 0) / ts.length, p95: ts[Math.floor(ts.length * .95)], base: bases / (warm + frames) }; }
    const st = look.stats(); out.push({ q, dpr, ...res, sprites: st.sprites, kb: Math.round(st.bytes / 1024) }); }
  return out;
}
const HC = new Map(); function hsl(h) { let c = HC.get(h); if (c) return c; const s = .65, l = .5, k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))); c = [f(0), f(8), f(4)]; HC.set(h, c); return c; }
export const table = rows => rows.map(r => `q${r.q} (dpr ${r.dpr}): look overlay ${r.overlay.mean.toFixed(2)} ms (p95 ${r.overlay.p95.toFixed(2)}) | look draws bodies ${r.bodies.mean.toFixed(2)} ms (p95 ${r.bodies.p95.toFixed(2)}) | old per-frame gradients ${r.naive.mean.toFixed(2)} ms | world base arcs ${r.overlay.base.toFixed(2)} ms | cache ${r.sprites} sprites ${r.kb} KB`).join('\n');

// P1 (opts.p1) bench: the whole look per frame = frame + layer('field') + layer('over') on the background canvas (render.js
// draws it at BGS[q] scale, every other frame when still; timed EVERY frame here) + 50x look.ohm + post. 10 of the 50 ohms jam.
// states: unhealed (heal 0: dust tile), developing (.5: sky bands, tints), harmonised (1: vivid, glints, lace), peak (harmonised +
// a big-event swell, only frames where the swell is above .3 are counted).
export async function benchP1({ createLook, mkCanvas, makeCanvas, now, frames = 240, warm = 40, N = 50, W = 412, H = 860, flush = null }) {
  let T = 0; const subs = {}, bus = { on: (k, f) => (subs[k] || (subs[k] = [])).push(f) }, note = ev => (subs.note || []).forEach(f => f(ev));
  const music = { now: () => T, beat: t => (t == null ? T : t) * 2, bar: t => (t == null ? T : t) / 2, key: 0, chord: { root: 0 }, scale: { ratios: [1, 9 / 8, 5 / 4] }, jam: { div: 2 } };   // 120 BPM
  const ohms = []; for (let i = 0; i < N; i++) ohms.push({ id: 10 + i, hue: (i * 137.5) % 360, glow: .5, look: { glow: .3 }, r: 10 + (i * 7) % 31, x: 0, y: 0, scale: 'ohm' });
  const out = [];
  for (let q = 0; q < 4; q++) { const dpr = QDPR[q], c = mkCanvas(Math.round(W * dpr), Math.round(H * dpr)), g = c.getContext('2d'), bc = mkCanvas(Math.round(W * BGS[q]), Math.round(H * BGS[q])), b = bc.getContext('2d');
    let HEAL = 0; const look = createLook({ sim: { healAt: () => .5 + .5 * HEAL }, music, bus, makeCanvas, opts: { p1: true } }), res = {}, Lw = { hue: 140, spread: 80 };
    for (const [mode, heal] of [['unhealed', 0], ['developing', .5], ['harmonised', 1], ['peak', 1]]) { const ts = []; HEAL = heal;
      for (let f = 0, k = 0; k < frames && f < warm + frames * 30; f++) { T += 1 / 60;
        if (f % 30 === 0) for (let i = 0; i < 10; i++) note({ src: ohms[i], kind: 'note', jam: 1 });
        b.setTransform(BGS[q], 0, 0, BGS[q], 0, 0); b.fillStyle = '#10131a'; b.fillRect(0, 0, W, H);
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        for (let i = 0; i < N; i++) { const o = ohms[i]; o.x = 30 + (i % 7) * 56 + Math.sin(T + i) * 6; o.y = 40 + Math.floor(i / 7) * 110 + Math.cos(T * 1.3 + i) * 6; o.glow = .5 + .5 * Math.sin(T * 3 + i); }
        for (const o of ohms) { g.fillStyle = `hsl(${o.hue},65%,50%)`; g.beginPath(); g.arc(o.x, o.y, o.r, 0, 6.2832); g.fill(); }
        if (flush) { flush(g); flush(b); }
        const st = { t: T, W, H, q, trip: heal, burst: mode === 'peak' && f % 360 === 0 ? 1 : 0, pulse: .5, A: { x: W / 2, y: H * .45 } };
        const t0 = now(); look.frame(st); look.palette(Lw, st); look.layer(b, Lw, 1, st, 'field'); look.layer(b, Lw, 1, st, 'over');
        for (const o of ohms) look.ohm(g, o, o.x, o.y, o.r, st); look.post(g, st);
        if (flush) { flush(g); flush(b); }
        const dt = now() - t0; if (look.api.idle) look.api.idle(2);   // host idle time between frames (real look bakes), outside the timed region
        if (f >= warm && (mode !== 'peak' || look.api.place.swell > .3)) { ts.push(dt); k++; } }
      ts.sort((a, z) => a - z); res[mode] = { mean: ts.reduce((a, z) => a + z, 0) / ts.length, p95: ts[Math.floor(ts.length * .95)], max: ts[ts.length - 1], n: ts.length }; }
    const st = look.stats(); out.push({ q, dpr, ...res, sprites: st.sprites, kb: Math.round(st.bytes / 1024), bakes: st.bakes }); }
  return out;
}
export const tableP1 = rows => rows.map(r => `q${r.q} (dpr ${r.dpr}): ` + ['unhealed', 'developing', 'harmonised', 'peak'].map(m => `${m} ${r[m].mean.toFixed(2)} (p95 ${r[m].p95.toFixed(2)}, max ${r[m].max.toFixed(1)})`).join(' | ') + ` | cache ${r.sprites} sprites ${r.kb} KB`).join('\n');
