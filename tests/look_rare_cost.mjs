// rare-look cost (v0.0.25): only the rare part of the frame, timed on its own (the whole-frame bench's noise is +-0.2 ms, bigger than
// the target). 50 ohms on a 412x860 canvas at q0 (dpr 1.5), headless Chromium (Skia raster); warm-up bakes everything in idle time.
// Timed: look.rare layer 0 + 1 + look.ohm of the 10 rare ohms (+ tradAura on, stage 1)  minus  look.ohm of the same 10 as ordinary ohms;
// + the role cues (look.ohmRole) over all 50 ohms. Median of REP runs of F frames.   node tests/look_rare_cost.mjs   COST_OPTS='{"rare":{"off":{"sparks":1}}}'
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire('/workspace/softsound/'); const pw = require('playwright');
const root = new URL('../', import.meta.url).pathname;
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': 'text/javascript' }); r.end(b); }); }).listen(0);
const b = await pw.chromium.launch(), pg = await b.newPage(); await pg.goto(`http://127.0.0.1:${srv.address().port}/tests/`).catch(() => {}); await pg.setContent('<html><body></body></html>');
const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const X = process.env.COST_OPTS ? JSON.parse(process.env.COST_OPTS) : {}, AURA = process.env.AURA !== '0';
const res = await pg.evaluate(async ([port, X, AURA]) => { const u = `http://127.0.0.1:${port}`, { createLook } = await import(`${u}/www/js/look/index.js`), { rareOhm } = await import(`${u}/tests/look_bench_real_core.mjs`);
  const W = 412, H = 860, dpr = 1.5, c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c); const g = c.getContext('2d'), now = () => performance.now(), flush = () => g.getImageData(0, 0, 1, 1);
  let T = 0; const music = { now: () => T, beat: t => (t == null ? T : t) * 2, bar: t => (t == null ? T : t) / 2, phase: () => (T * 2) % 1, key: 0, chord: { root: 0 }, scale: { ratios: [1, 9 / 8, 5 / 4] }, jam: { div: 2 } };
  const PARTS = ['lead', 'bass', 'pad', 'rhythm'], roles = new Map();
  const mk = () => { const os = []; for (let i = 0; i < 50; i++) os.push({ id: 10 + i, hue: (i * 137.5) % 360, glow: 0, look: { glow: (i % 3) / 3 }, r: 8 + (i * 7) % 18, x: 0, y: 0 }); return os; };
  const ctx = (rare) => ({ music, makeCanvas: (w, h) => new OffscreenCanvas(w, h), world: { place: {} }, roleOf: o => roles.get(o.id) || null, opts: { post: false, realLook: { bake: { mode: 'manual' }, tradAura: AURA ? { stage: 1, ...(X.tradAura || {}) } : false, rare: X.rare || {}, role: X.role != null ? X.role : {} } } });
  const run = (kase, F) => { const os = mk(), RO = kase === 'rare' ? os.map((o, i) => i < 10 ? rareOhm(o, i) : o) : os, look = createLook(ctx(kase === 'rare'));
    if (kase === 'roles') os.forEach((o, i) => roles.set(o.id, { part: PARTS[i % 4], k: .8 })); else roles.clear();
    const DI = g.drawImage, PX = { n: 0, px: 0, f: 0 }; if (kase === 'rare') g.drawImage = function (im, ...a) { if (PX.on) { PX.n++; const w = a.length >= 4 ? a[a.length === 4 ? 2 : 6] : im.width, h = a.length >= 4 ? a[a.length === 4 ? 3 : 7] : im.height; const t = g.getTransform(); PX.px += Math.abs(w * h * t.a * t.d); } return DI.call(this, im, ...a); };
    const ts = []; for (let f = 0; f < 240 + F; f++) { T += 1 / 60; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      for (let i = 0; i < 50; i++) { const o = RO[i]; o.x = 30 + (i % 7) * 56 + Math.sin(T + i) * 6; o.y = 160 + Math.floor(i / 7) * 90 + Math.cos(T * 1.3 + i) * 6; o.glow = .5 + .5 * Math.sin(T * 3 + i); if (kase === 'roles' && f % 30 === 0 && i % 9 === f % 9) roles.set(o.id, { part: PARTS[(i + f / 30) % 4 | 0], k: .8 }); }
      look.frame({ t: T, W, H, q: 0 }); flush(); PX.on = f >= 240; if (PX.on) PX.f++; const t0 = now();
      if (kase === 'rare' && look.rare) for (const L of [0, 1]) for (let i = 0; i < 10; i++) { const o = RO[i]; look.rare(g, o, o.x, o.y, o.r, L, null); }
      const n = kase === 'roles' || kase === 'base50' ? 50 : 10; for (let i = 0; i < n; i++) { const o = RO[i]; look.ohm(g, o, o.x, o.y, o.r, null); }
      if (kase === 'roles' && look.ohmRole) for (let i = 0; i < 50; i++) { const o = RO[i], r = roles.get(o.id); look.ohmRole(g, o, r.part, o.x, o.y, o.r, r); }
      PX.on = false; flush(); const dt = now() - t0; look.api.idle(f < 240 ? 12 : 4); if (f >= 240) ts.push(dt); }
    g.drawImage = DI; ts.sort((a, b) => a - b); return { calls: PX.f ? +(PX.n / PX.f).toFixed(1) : 0, kpx: PX.f ? +(PX.px / PX.f / 1000).toFixed(1) : 0, mean: ts.reduce((a, b) => a + b, 0) / ts.length, med: ts[ts.length >> 1], rk: look.api.rare ? { ...look.api.rare.stats } : null, ro: look.api.role ? { ...look.api.role.stats, sp: { ...look.api.sprites.stats, bytes: look.api.sprites.bytes, n: look.api.sprites.map.size } } : null, au: look.api.aura ? { ...look.api.aura.stats } : null }; };
  const REP = +(X.rep || 5), F = 300, out = { rare: [], base: [], roles: [], base50: [] };
  for (let r = 0; r < REP; r++) for (const k of (r % 2 ? ['base', 'rare', 'roles', 'base50'] : ['rare', 'base', 'base50', 'roles'])) out[k].push(run(k, F));   // the order alternates (the later kase of a pair runs on a warmer / fuller heap)
  const md = a => a.map(x => x.mean).sort((p, q) => p - q)[a.length >> 1];
  const dm = out.roles.map((x, i) => x.mean - out.base50[i].mean).sort((p, q) => p - q);
  return { roleD: dm[dm.length >> 1], roleDs: dm.map(v => +v.toFixed(3)), rare: md(out.rare), base: md(out.base), roles: md(out.roles), base50: md(out.base50), all: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.map(x => +x.mean.toFixed(3))])), rk: out.rare[0].rk, px: [out.rare[0].calls, out.rare[0].kpx], au: out.rare[0].au, ro: out.roles[0].ro }; }, [srv.address().port, X, AURA]);
await b.close(); srv.close();
console.log(`rare look cost, q0 dpr 1.5, 10 rare of 50${AURA ? ', tradAura on (stage 1)' : ''}: rare ${res.rare.toFixed(3)} ms - ordinary ${res.base.toFixed(3)} ms = ${(res.rare - res.base).toFixed(3)} ms/frame`);
console.log(`role cues, 50 ohms: ${res.roles.toFixed(3)} - ${res.base50.toFixed(3)} = ${(res.roles - res.base50).toFixed(3)} ms/frame (means); median of paired per-run diffs ${res.roleD.toFixed(3)} ms ${JSON.stringify(res.roleDs)}`);
console.log('runs', JSON.stringify(res.all)); console.log('rare drawImage calls / frame, device kpx / frame', JSON.stringify(res.px)); console.log('rare stats', JSON.stringify(res.rk)); console.log('aura stats', JSON.stringify(res.au)); console.log('role stats (roles kase)', JSON.stringify(res.ro)); if (errs.length) console.log('ERR', errs.slice(0, 3).join(' | '));
