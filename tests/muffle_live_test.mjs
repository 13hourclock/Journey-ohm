import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
// v0.0.28 deaf muffle in the LIVE worklet: worklet load + overruns for 3 x (2 s open, 2 s fully muffled by driving a deaf ohm), then back to the driven ohm's own hearing.
const pg = await b.newPage({ viewport: { width: 412, height: 860 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${port}/?selftest=0`); await pg.waitForTimeout(2500);
const R = await pg.evaluate(async () => { const A = JO.audio, sleep = ms => new Promise(r => setTimeout(r, ms)), ab = JO.systems.abilities, g0 = ab.genes;
  const win = async ms => { const n0 = A.mon.length, t0 = A.last ? A.last.overTot : 0; await sleep(ms); const s = A.mon.slice(n0), ld = s.map(x => x.load).filter(x => x != null);
    return { n: s.length, load: ld.length ? ld.reduce((a, b) => a + b, 0) / ld.length : null, peak: Math.max(0, ...s.map(x => x.loadPeak || 0)), over: (A.last ? A.last.overTot : 0) - t0, peakOut: Math.max(0, ...s.map(x => x.peak || 0)) }; };
  await sleep(3000); const ready = A.ready, st = A.ctx && A.ctx.state; const add = (a, w) => { a.n += w.n; a.over += w.over; if (w.load != null) { a.load += w.load; a.k++; } a.peak = Math.max(a.peak, w.peak); a.peakOut = Math.max(a.peakOut, w.peakOut); };
  const z = () => ({ n: 0, over: 0, load: 0, k: 0, peak: 0, peakOut: 0 }), open1 = z(), mu = z(); let m = 0;
  for (let c = 0; c < 3; c++) { add(open1, await win(2000)); ab.genes = o => o === JO.sim.ohm ? { ...g0(o), hear: 0 } : g0(o); add(mu, await win(2000)); m = Math.max(m, A.params.muffle); ab.genes = g0; }
  for (const a of [open1, mu]) a.load = a.k ? a.load / a.k : null; await sleep(300); const nat = JO.systems.senses.target(), back = A.params.muffle || 0; const open2 = await win(1000);
  return { ready, st, open1, mu, open2, m, back, nat }; });
const f = w => `load ${w.load == null ? '-' : (w.load * 100).toFixed(1) + '%'} peak ${(w.peak * 100).toFixed(0)}% overruns ${w.over} out peak ${w.peakOut.toFixed(2)} (${w.n} stats)`;
console.log(`worklet ${R.st}; open: ${f(R.open1)} | muffled ${R.m.toFixed(2)}: ${f(R.mu)} | open again (${R.back}): ${f(R.open2)}`);
ok(R.ready && R.mu.n > 0, 'worklet running with stats');
ok(R.m > .8 && Math.abs(R.back - R.nat) < .011, `muffle reaches the worklet and returns to the driven ohm's own hearing (${R.nat.toFixed(2)})`);
// headless Chromium on a shared box drops blocks in bursts (34 open vs 51 muffled seen with load avg 5); the exact cost guard is dsp_bench's muffle line
ok(R.mu.over <= Math.max(R.open1.over * 2, R.open1.over + 5), `no extra dropouts while muffled (${R.open1.over} / ${R.mu.over} / ${R.open2.over})`);
ok(R.mu.load == null || R.open1.load == null || R.mu.load <= R.open1.load * 1.3 + .03, 'per-block load while muffled within 30% (+3 pts) of open (3 alternating 2 s windows each)');
ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
await b.close(); srv.close(); console.log(fails ? `FAIL ${fails}` : 'MUFFLE_LIVE_OK'); process.exit(fails ? 1 : 0);
