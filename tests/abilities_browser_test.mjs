// v0.0.27 R5.4 abilities: the live-app check (boot on the default path, force abilities on a nearby ohm).
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const T0 = Date.now(), root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
await new Promise(r => srv.on('listening', r));
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 } }); const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e) + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const U = `http://127.0.0.1:${port}/`, boot = async q => { await pg.goto(U + q); await pg.waitForFunction(() => globalThis.JO && JO.systems && JO.sim.ohm, null, { timeout: 15000 }); };
// v0.0.27 abilities in the real app (default path): force each wave-1 ability on the ohm nearest you and check it acts, with no page errors.
await boot('?fresh=1'); await pg.waitForTimeout(2500);
const r = await pg.evaluate(async () => { const S = JO.sim, A = JO.systems.abilities, me = S.ohm, sw = JO.systems.switches.filter(s => s.k === 'abilities' || s.k.startsWith('ab_'));
  const near = S.ohms.filter(o => o !== me && o.scale === 'ohm' && o.body).sort((a, b) => Math.hypot(a.body.x - me.body.x, a.body.y - me.body.y) - Math.hypot(b.body.x - me.body.x, b.body.y - me.body.y))[0];
  near.body.x = me.body.x + 2; near.body.y = me.body.y; for (const k of ['echo', 'overtone', 'metro', 'storm', 'pitch', 'mimic', 'dream']) A.force(near, k, 1);
  const notes = []; JO.events.on('note', ev => { if (ev.ab) notes.push(ev.ab); }); const nn = JO.events.note; for (let i = 0; i < 24; i++) { nn({ src: near, kind: 'note', deg: i % 5, vel: .6 }); await new Promise(r => setTimeout(r, 300)); }
  A.force(near, 'conduct', 1); A.force(near, 'gravity', 1);
  // wave 2 (v0.0.28): a second, quiet ohm composes and weaves; run its bars directly (the timing gates are tested in node)
  const q = S.ohms.filter(o => o !== me && o !== near && o.scale === 'ohm' && o.body)[0]; q.body.x = me.body.x - 3; q.body.y = me.body.y; A.force(q, 'compose', 1); A.force(q, 'weave', 1);
  const th0 = JO.systems.things ? JO.systems.things.list.length : (globalThis.JO.things ? JO.things.list.length : -1); const lb = A.lastBar, storm = JO.world.env.wx.storm || 0, rain = JO.world.env.rain;
  A.bar(16 * 1000 - (q.id % 16)); A.bar(16 * 1000 - (q.id % 8) + 8); A.lastBar = lb; JO.world.env.wx.storm = storm;
  const th1 = JO.systems.things ? JO.systems.things.list.length : (globalThis.JO.things ? JO.things.list.length : -1);
  const c = {}; for (const n of notes) c[n] = (c[n] || 0) + 1;
  return { sw: sw.map(s => s.k + '=' + s.get()).join(' '), info: sw[0].info(), c, storm, rain, carriers: A.carriers.length, strings: A.strings, th: [th0, th1], composed: A.composed, cad: A.cadences, conducted: A.conducted, bends: A.bends }; });
console.log(JSON.stringify(r));
ok(/abilities=true/.test(r.sw) && (r.sw.match(/=true/g) || []).length === 13, '1 switches: abilities + 12 abilities, all ON (' + r.sw + ')');
ok((r.c.echo || 0) >= 1 && r.c.overtone >= 6 && r.c.metro >= 4, `2 echo ${r.c.echo}, overtone ${r.c.overtone}, metronome ${r.c.metro} in the live app`);
ok(r.storm > .2, '3 storm singing near you: E.wx.storm ' + r.storm.toFixed(2) + ', rain ' + (r.rain || 0).toFixed(2));
// strings >= 1 (was === 1; v0.0.29): A.strings is cumulative, and the live game's own bar can weave a second one inside the window (flaked ~1 in 12 on master too)
ok(r.strings >= 1 && r.composed >= 1 && (r.c.compose || 0) >= 4, `4 wave 2: a string woven (${r.strings}; things ${r.th.join(' -> ')}), ${r.composed} motif (${r.c.compose || 0} notes), ${r.conducted} notes conducted, ${r.bends} gravity nudges so far`);
// v0.0.28 R5.12 gas giants in the live app: pretend this planet is .8 gas for one bar, then back
const gf = await pg.evaluate(async () => { const G = JO.systems.gasfloat, g0 = G.gasNow; G.gasNow = () => .8; G.bar(); const up = JO.sim.ohms.filter(o => o._gasF).length;
  await new Promise(r => setTimeout(r, 1500)); const risen = JO.sim.ohms.filter(o => o._gasF && o.body.y < o.body.homeY + 1.2).length; G.gasNow = () => 0; G.bar(); const left = JO.sim.ohms.filter(o => o._gasF).length; G.gasNow = g0;
  return { up, risen, left, sw: JO.systems.switches.some(s => s.k === 'gasFloat' && s.get()) }; });
ok(gf.sw && gf.up >= 1 && gf.risen >= 1 && gf.left === 0, `5 gas giant: ${gf.up} ground ohms float (${gf.risen} already up after 1.5 s), all settle back off the giant; switch ON`);
// v0.0.28 R5.5 / R2.10 deaf muffle in the live app: make the driven ohm deaf for 2 s, then hearing again; worklet overruns compared with the 2 s before
const dm = await pg.evaluate(async () => { const A = JO.audio, S = JO.systems.senses, AB = S && JO.systems.switches; const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ov = () => A.last ? A.last.overTot : null;
  const o0 = ov(); await sleep(2000); const o1 = ov(); const ab = JO.systems.abilities, g0 = ab.genes; ab.genes = o => o === JO.sim.ohm ? { ...g0(o), hear: .02 } : g0(o);
  await sleep(2000); const m = A.params.muffle, o2 = ov(); ab.genes = g0; await sleep(500);
  return { m, back: A.params.muffle, before: o1 != null && o0 != null ? o1 - o0 : null, during: o2 != null && o1 != null ? o2 - o1 : null, sw: JO.systems.switches.some(s => s.k === 'deafMuffle' && s.get()), ab: !!ab }; });
ok(dm.sw && dm.m > .7 && dm.back === 0 && (dm.during == null || dm.during <= (dm.before || 0) + 2), `6 deaf muffle: driving a deaf ohm sends muffle ${dm.m && dm.m.toFixed(2)}, hearing again ${dm.back}; worklet overruns ${dm.before} in the 2 s before, ${dm.during} while muffled; switch ON`);
ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
await b.close(); srv.close(); console.log(fails ? 'ABILITIES BROWSER FAIL ' + fails : 'ABILITIES BROWSER OK'); process.exit(fails ? 1 : 0);
