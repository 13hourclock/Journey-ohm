// dev tool: CPU-profile chosen zoom probe gestures and print what runs in each long main-thread task (> LONG ms)
// node tools/zoom_profile.mjs 'regex' [throttle]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
import { GESTURES, PROBE } from '../tests/zoom_probe_core.mjs';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const pg = await b.newPage({ viewport: { width: 412, height: 860 } });
const cdp = await pg.context().newCDPSession(pg); const TH = +(process.argv[3] || 4); if (TH > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: TH });
await pg.addInitScript(SEED(20261025)); await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0`); await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 }); await pg.waitForTimeout(2500);
const re = new RegExp(process.argv[2]), LONG = +(process.env.LONG || 12); const all = GESTURES; let start = 0; for (let i = 0; i < all.length; i++) if (re.test(all[i].name)) { start = i; break; }
// replay from the last gesture with a z0 up to the target so the state matches the probe
let s0 = start; while (s0 > 0 && all[s0].z0 == null) s0--; const pre = all.slice(s0, start), tgt = all.filter(g => re.test(g.name));
if (pre.length) await pg.evaluate(PROBE, pre);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start');
await pg.evaluate(PROBE, tgt); const { profile: P } = await cdp.send('Profiler.stop');
const byId = new Map(P.nodes.map(n => [n.id, n])); const parent = new Map(); for (const n of P.nodes) for (const c of n.children || []) parent.set(c, n.id);
const name = n => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`;
const idle = n => /^\((idle|program|garbage collector|root)\)$/.test(n.callFrame.functionName);
let task = null; const tasks = []; let t = P.startTime;
for (let i = 0; i < P.samples.length; i++) { t += P.timeDeltas[i]; const n = byId.get(P.samples[i]), dt = (P.timeDeltas[i + 1] || 100) / 1000;
  if (idle(n) && n.callFrame.functionName !== '(garbage collector)') { if (task) { tasks.push(task); task = null; } continue; }
  if (!task) task = { t0: t, ms: 0, inc: new Map() }; task.ms += dt; const seen = new Set(); let id = n.id; while (id != null) { const q = byId.get(id); const k = name(q); if (!seen.has(k)) { seen.add(k); task.inc.set(k, (task.inc.get(k) || 0) + dt); } id = parent.get(id); } }
const long = tasks.filter(x => x.ms > LONG); console.log(`${tasks.length} tasks, ${long.length} over ${LONG} ms (throttle ${TH}x)`);
for (const x of long) { console.log(`-- task ${x.ms.toFixed(1)} ms`); [...x.inc].filter(([k]) => !/^\(root\)|^\(anon\) :0/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log(`   ${v.toFixed(1).padStart(6)} ${k}`)); }
await b.close(); srv.close();
