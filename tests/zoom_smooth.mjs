// headless zoom + pan smoothness probe (Playwright): node tests/zoom_smooth.mjs [www dir] [json out]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
import { GESTURES, PROBE, analyse, verdict } from './zoom_probe_core.mjs';
const root = process.argv[2] || new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const SEED = (n = 20261025) => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 412, height: 860 } }); if (process.env.THROTTLE) { const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE }); } const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(SEED(+(process.env.SEED || 20261025)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/?fresh=1&selftest=0${process.env.Q || ''}`); await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 }); await pg.waitForTimeout(2500);
if (process.env.PRE) await pg.evaluate(process.env.PRE);
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const res = await pg.evaluate(PROBE, GESTURES.filter(g => !only || only.test(g.name)));
const A = res.map(analyse); let bad = 0;
for (const a of A) { const v = verdict(a); if (v.length) bad++; console.log(`${v.length ? 'FLAG' : 'ok  '} ${a.name.padEnd(22)} z ${a.z0}->${a.zEnd} rest ${a.zRest} follow ${a.follow} jumps ${a.jumps} stalls ${a.stalls} rev ${a.rev} back ${a.back} relJ ${a.relJ} rel0 ${a.rel0}/${a.lastDrive} panMax ${a.panMax} hitch ${a.hitch} skyJ ${a.skyJ}/${a.skyMax} walkJ ${a.walkJ} wf ${a.wf} dt ${a.dtMed}/${a.dtP95}/${a.dtMax} spikes ${a.spikes} draw med ${a.drMed} p95 ${a.drP95} max ${a.drMax} >16ms ${a.slow}${a.closed ? ' [gate closed]' : ''}${a.held ? ' [held]' : ''}${a.dive ? ' [dive]' : ''}${v.length ? '  <- ' + v.join('; ') : ''}`); }
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ A, res }, null, 0));
console.log(`page errors: ${errs.length}${errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''}`); console.log(bad ? `${bad} gestures flagged` : 'all smooth');
await b.close(); srv.close(); process.exit(0);
