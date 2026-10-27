// OHM STRESS BENCH (track/ohms): how many ohms fit in one 16.7 ms frame on this box.
// Part 1 (node): sim.step cost alone (physics, soft rings, collisions, partner search) vs ohm count.
// Part 2 (headless Chromium, software canvas = pessimistic vs a phone GPU): sim.step + render.draw per frame, all ohms on
// screen (getImageData forces the canvas to really raster each frame), at quality level 0 (full) and 2 (crowd as discs). Reports the largest count under 16.7 ms and under 8 ms (half
// budget, leaving room for audio + the browser). Usage: node tests/ohm_bench.mjs [--quick]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createSim } from '../www/js/sim.js';
const quick = process.argv.includes('--quick');
// ---- part 1: sim only ----
const music = { t: 0, now() { return this.t; }, phase: () => 0, bar() { return this.t / 2; }, tonicHz: 64, when: t => t, beat: t => t * 2 };
const bus = { subs: {}, records: new Map(), on(t, f) { (this.subs[t] || (this.subs[t] = [])).push(f); }, post(ev) { if (ev.t == null) ev.t = music.now(); for (const f of this.subs[ev.type] || []) f(ev); return ev; },
  note(ev) { ev.type = 'note'; return this.post(ev); }, ctl(src, key, v) { return this.post({ type: 'ctl', src, key, v }); }, set(src, path, v) { return this.post({ type: 'set', src, path, v }); } };
const simMs = n => { bus.subs = {}; const S = createSim(music, bus); S.setView(412, 860); S.reseed(1); S.populate(n - 1, 7);
  for (let i = 0; i < 120; i++) { music.t += 1 / 43; S.step(1 / 43); }   // settle
  const t0 = performance.now(), K = 200; for (let i = 0; i < K; i++) { music.t += 1 / 43; S.step(1 / 43); } return (performance.now() - t0) / K; };
console.log('sim.step (43 Hz control tick, all ohms on one screen-wide ground):');
const simRes = {}; for (const n of [10, 50, 100, 200, 400, 800]) { simRes[n] = simMs(n); console.log(`  ${String(n).padStart(4)} ohms: ${simRes[n].toFixed(3)} ms/step`); }
// ---- part 2: browser frame ----
const { chromium } = require('playwright');
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port, br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 412, height: 860 } });
const frameMs = async (n, lod) => { await pg.goto(`http://127.0.0.1:${port}/?ohms=${n}&fresh=1`); await pg.waitForFunction(() => globalThis.JO && JO.sim.ohms.length > 0);
  return pg.evaluate(async ([lod]) => { JO.quality.forced = lod; JO.sim.lod = lod; await new Promise(r => setTimeout(r, 1500));
    const K = 40; let tot = 0; for (let i = 0; i < K; i++) { const a = performance.now(); JO.sim.step(1 / 60); JO.render.draw(); document.getElementById("c").getContext("2d").getImageData(0, 0, 1, 1); tot += performance.now() - a; await new Promise(r => setTimeout(r, 0)); } return tot / K; }, [lod]); };
const out = { sim: simRes, frame: {} };
for (const lod of [0, 2]) { const rows = []; let n = 25, best16 = 0, best8 = 0, ms;
  while (n <= (quick ? 400 : 3200)) { ms = await frameMs(n, lod); rows.push([n, ms]); if (ms <= 16.7) best16 = n; if (ms <= 8) best8 = n; if (ms > 16.7) break; n *= 2; }
  if (best16 && n <= 3200 && ms > 16.7) { let lo = best16, hi = n; while (hi - lo > lo * .1) { const m = Math.round((lo + hi) / 2), t = await frameMs(m, lod); rows.push([m, t]); if (t <= 16.7) lo = m; else hi = m; if (t <= 8 && m > best8) best8 = m; } best16 = lo; }
  out.frame[lod] = { rows, max16: best16, max8: best8 };
  console.log(`frame (sim.step + draw, all on screen) quality ${lod}: ` + rows.map(([a, b]) => `${a}:${b.toFixed(1)}ms`).join('  ') + `  ->  max ${best16} ohms in 16.7 ms, ${best8} in 8 ms`); }
console.log('OHMBENCH ' + JSON.stringify({ sim: Object.fromEntries(Object.entries(simRes).map(([k, v]) => [k, +v.toFixed(3)])), q0: out.frame[0].max16, q0half: out.frame[0].max8, q2: out.frame[2].max16, q2half: out.frame[2].max8 }));
await br.close(); srv.close();
