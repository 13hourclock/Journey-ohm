// headless smoke: page loads without errors, audio worklet runs, tap / hold / node gestures emit events and voices,
// short self-test completes, box-side frame + worklet timings. No screenshots, no audio capture.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 412, height: 860 }, hasTouch: false });
const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const ST = +(process.env.ST || 20);
await pg.goto(`http://127.0.0.1:${port}/?selftest=${ST}${process.env.Q || ""}`); await pg.waitForTimeout(1500);
const st0 = await pg.evaluate(() => ({ ready: JO.audio.ready, err: JO.audio.err, state: JO.audio.ctx && JO.audio.ctx.state, sr: JO.audio.ctx && JO.audio.ctx.sampleRate, stats: !!JO.audio.last }));
ok(st0.ready && st0.state === 'running' && st0.stats, `worklet running (${JSON.stringify(st0)})`);
const geo = await pg.evaluate(() => { const w = innerWidth, h = innerHeight, R = Math.min(w, h) * .13; return { cx: w / 2, cy: h * .36, R }; });
// taps on the ohm
for (let i = 0; i < 6; i++) { await pg.mouse.move(geo.cx + (i - 3) * 5, geo.cy); await pg.mouse.down(); await pg.waitForTimeout(60); await pg.mouse.up(); await pg.waitForTimeout(400); }
let s = await pg.evaluate(() => ({ sent: JO.events.sent, rec: JO.events.records.get(1) && JO.events.records.get(1).events.length, open: JO.sim.ohm.nodesOpen, touch: JO.audio.touchMs.slice() }));
ok(s.sent >= 6 && s.rec >= 6 && !s.open, `6 taps -> ${s.sent} events recorded as song data (${s.rec}), nodes stay closed`);
ok(s.touch.length >= 3, `touch->sound measured for taps: ${s.touch.map(x => x.toFixed(1)).join(', ')} ms (headless, fake output device)`);
// hold opens nodes, then tap each node
await pg.mouse.move(geo.cx, geo.cy); await pg.mouse.down(); await pg.waitForTimeout(600); await pg.mouse.up();
s = await pg.evaluate(() => JO.sim.ohm.nodesOpen); ok(s, 'hold opens the 7 scale nodes');
// count by source: since v0.0.25 song playback (songs.js drain) lands a whole chord of other ohms at once and the wind posts 'level'
// events, so an all-source count in this window is not about the taps (v0.0.28 probe: 5 song notes + 1 wind level in a 450 ms window
// on the pre-abilities commit). Ours must be exactly the 3 taps; others are reported, not limited.
const n0 = await pg.evaluate(() => { const B = JO.events; B._tapWin = { me: 0, other: {} }; if (!B._tapWrap) { B._tapWrap = true; const o = B.note; B.note = ev => { const w = B._tapWin; if (w) { if (ev.src === JO.sim.ohm) w.me++; else { const k = (ev.kind || 'ev') + ':' + (ev.src && ev.src.id); w.other[k] = (w.other[k] || 0) + 1; } } return o(ev); }; } return B.sent; });
// (systems walk.js: with the nodes open, a touch on the LEFT half away from the body is the walking stick and a short tap there closes
// the nodes; the nodes on the right half still play. So tap the right-half nodes: degrees 1, 2, 3.)
const RIGHT = [1, 2, 3]; for (const d of RIGHT) { const a = -Math.PI / 2 + d / 7 * Math.PI * 2; await pg.mouse.click(geo.cx + Math.cos(a) * geo.R * 2.15, geo.cy + Math.sin(a) * geo.R * 2.15); await pg.waitForTimeout(150); }
s = await pg.evaluate(n => { const ev = JO.events.records.get(1).events.slice(-n); const w = JO.events._tapWin; JO.events._tapWin = null; return { n: JO.events.sent, me: w.me, other: w.other, open: JO.sim.ohm.nodesOpen, degs: ev.map(e => e.deg), hz: [0, 1, 2, 3, 4, 5, 6].map(d => JO.music.hz(d, 0).toFixed(1)) }; }, RIGHT.length);
// (exactly our 3 taps from the player ohm, the last 3 of OUR record are 1,2,3; other sources in the window are listed only)
ok(s.me === RIGHT.length && s.degs.join() === RIGHT.join() && s.open, `node taps (right half) play degrees ${s.degs.join(',')}, nodes stay open (${s.me} ours of ${s.n - n0} events; others ${JSON.stringify(s.other)}; om scale Hz ${s.hz.join(' ')})`);
const emp = await pg.evaluate(() => { const w = innerWidth, h = innerHeight, R = Math.min(w, h) * .13; for (let sy = 40; sy < h * .8; sy += 20) for (let sx = 20; sx < w - 20; sx += 20) { if (JO.sim.ohms.every(o => Math.hypot(w / 2 + o.body.x * R - sx, h * .36 + o.body.y * R - sy) > R * 1.6) && Math.hypot(sx - w / 2, sy - h * .36) > R * 3) return [sx, sy]; } return [30, 60]; });
await pg.mouse.click(emp[0], emp[1]); ok(!(await pg.evaluate(() => JO.sim.ohm.nodesOpen)), 'tap empty space closes nodes');
// new seed changes the recipe, ohm keeps referencing a recipe object
const r = await pg.evaluate(() => { const a = JO.sim.ohm.recipe; document.getElementById('dv-new').click(); return [a, JO.sim.ohm.recipe]; }); ok(r[0] !== r[1], `new seed -> new recipe (${r[0]} -> ${r[1]})`);
const v = await pg.evaluate(() => JO.audio.last.act); ok(v >= 0, `voice count reported (${v})`);
// ---- v0.0.2: synth + fx + matrix + world sources + store + physical proposals ----
const pe = (type, id, x, y) => pg.evaluate(([type, id, x, y]) => document.getElementById('c').dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 11 })), [type, id, x, y]);
for (let i = 0; i < 4; i++) { await pg.mouse.click(geo.cx, geo.cy); await pg.waitForTimeout(120); }
let q = await pg.evaluate(() => ({ iact: JO.audio.last.iact, NI: JO.audio.last.NI, fxOn: JO.audio.last.fxOn, fam: JO.sim.ohm && JO.sim.ohm.recipe }));
ok(q.NI === 14 && q.iact >= 1, `synth engine voices play with the modal voice (synth ${q.iact}/${q.NI}, fx slots on ${q.fxOn})`);
// grab: drag the body, it follows; release, it springs back
const gx = geo.cx, gy = geo.cy; await pe('pointerdown', 11, gx, gy); for (let k = 1; k <= 6; k++) { await pe('pointermove', 11, gx + k * 12, gy + k * 6); await pg.waitForTimeout(20); } await pg.waitForTimeout(250);
q = await pg.evaluate(() => ({ x: JO.sim.ohm.body.x, y: JO.sim.ohm.body.y, pull: JO.sim.sig[1]['body.pull'] }));
ok(q.x > .4 && q.pull > .1, `drag moves the body (x ${q.x.toFixed(2)} R, pull ${q.pull && q.pull.toFixed(2)})`);
await pe('pointerup', 11, gx + 72, gy + 36); await pg.waitForTimeout(1500); q = await pg.evaluate(() => JO.sim.ohm.body.x); ok(q > .9, `let go still: the ohm stays where it was put, no spring back (x ${q.toFixed(2)})`);
// track/ohms: THROW - drag fast and let go while moving: it flies on with the finger's speed and calls out; it stays where it lands
const scr = () => pg.evaluate(() => { const w = innerWidth, h = innerHeight, R = Math.min(w, h) * .13, b = JO.sim.ohm.body; return { x: w / 2 + b.x * R, y: h * .36 + b.y * R, bx: b.x }; });
let sp = await scr(); const hits0 = await pg.evaluate(() => JO.events.records.get(1).events.length);
await pe('pointerdown', 11, sp.x, sp.y); for (let k = 1; k <= 5; k++) { await pe('pointermove', 11, sp.x - k * 22, sp.y - k * 4); await pg.waitForTimeout(16); }
const vRel = await pg.evaluate(() => Math.hypot(JO.sim.ohm.body.vx, JO.sim.ohm.body.vy)); await pe('pointerup', 11, sp.x - 110, sp.y - 20);
await pg.waitForTimeout(2500); q = await pg.evaluate(() => ({ x: JO.sim.ohm.body.x, v: Math.hypot(JO.sim.ohm.body.vx, JO.sim.ohm.body.vy), fly: JO.sim.ohm.body.flying, n: JO.events.records.get(1).events.length }));
ok(q.x < sp.bx - 110 / geo.R + .05 && q.v < .5 && !q.fly, `throw: released at ${vRel.toFixed(1)} R/s, flew on (past where the finger let go, or into a neighbour) and came to rest at x ${q.x.toFixed(2)} (speed ${q.v.toFixed(2)})`);
ok(q.n - hits0 >= 2, `throw: strike on touch + a call-out / landing sound (${q.n - hits0} notes)`);
// carry it home slowly (no throw) so the remaining checks find it at the centre
sp = await scr(); await pe('pointerdown', 11, sp.x, sp.y); for (let k = 1; k <= 20; k++) { await pe('pointermove', 11, sp.x + (gx - sp.x) * k / 20, sp.y + (gy - sp.y) * k / 20); await pg.waitForTimeout(30); } await pg.waitForTimeout(600); await pe('pointerup', 11, gx, gy); await pg.waitForTimeout(1500);
q = await scr(); ok(Math.hypot(q.x - gx, q.y - gy) < geo.R * .3, `carried and set down gently: stays put (${(q.x - gx).toFixed(0)}, ${(q.y - gy).toFixed(0)} px from centre)`);
// many ohms: they all exist, ring physics stays finite, the matrix / audio only see awake ones
q = await pg.evaluate(() => ({ n: JO.sim.ohms.length, src: JO.sim.sources.length, extra: JO.sim.sources.filter(s => s.scale !== 'ohm').length, fin: JO.sim.ohms.every(o => isFinite(o.body.x + o.body.y) && o.body.ring.every(isFinite)), ground: JO.sim.ohms.every(o => o.body.y + o.g.r <= Math.max(JO.sim.bounds.ground, JO.sim.groundAt ? JO.sim.groundAt(o.body.x) : 0) + .01)   /* v0.0.14: a crater / crack may dip the floor below bounds.ground */, lod: JO.sim.lod }));
ok(q.n >= 7 && q.fin && q.ground && q.src <= q.n + q.extra, `${q.n} ohms alive, ${q.src} sources awake for matrix/audio, all finite and above ground (quality level ${q.lod})`);
ok(!(await pg.evaluate(() => JO.sim.ohm.nodesOpen)), 'drag did not open the nodes');
// pinch: two fingers on the body
await pe('pointerdown', 11, gx - 30, gy); await pe('pointerdown', 12, gx + 30, gy); for (let k = 1; k <= 5; k++) { await pe('pointermove', 11, gx - 30 + k * 4, gy); await pe('pointermove', 12, gx + 30 - k * 4, gy); await pg.waitForTimeout(20); } await pg.waitForTimeout(300);
q = await pg.evaluate(() => ({ pin: JO.sim.ohm.body.pin, sIn: JO.sim.sig[1]['body.pinchIn'], open: JO.sim.ohm.nodesOpen, ms: JO.matrix.ms }));
ok(q.pin > .2 && q.sIn > .2 && !q.open, `pinching in squeezes the body (pinchIn ${q.sIn && q.sIn.toFixed(2)}), no hold fired`);
await pe('pointerup', 11, gx, gy); await pe('pointerup', 12, gx, gy); await pg.waitForTimeout(800);
q = await pg.evaluate(() => JO.sim.ohm.body.pin); ok(q < .1, `release relaxes the pinch (${q.toFixed(2)})`);
// three fingers: no pinch (reserved for undo)
await pe('pointerdown', 11, gx - 30, gy); await pe('pointerdown', 12, gx + 30, gy); await pe('pointerdown', 13, gx, gy + 20); await pe('pointermove', 11, gx, gy); await pe('pointermove', 12, gx, gy); await pg.waitForTimeout(300);
q = await pg.evaluate(() => JO.sim.ohm.body.pin); ok(q < .1, `3 fingers do not pinch (${q.toFixed(2)})`); for (const id of [11, 12, 13]) await pe('pointerup', id, gx, gy);
// world touch: 4 steady taps on empty space = tap tempo event; hold on empty space = a new ohm grows there
q = await pg.evaluate(() => { globalThis.__tt = []; JO.events.on('tempo.tap', e => { __tt.push(e.bpm); globalThis.__te = { src: typeof e.src === 'string' ? e.src : e.src.id, to: e.to, timing: !!(e.timing && e.timing.beat != null) }; }); globalThis.__tc = 0; JO.events.on('touch', e => { if (e.kind === 'tap') __tc++; }); return JO.sim.ohms.length; });
for (let i = 0; i < 4; i++) { await pe('pointerdown', 21, emp[0], emp[1]); await pg.waitForTimeout(40); await pe('pointerup', 21, emp[0], emp[1]); await pg.waitForTimeout(460); }
let tt = await pg.evaluate(() => ({ bpm: __tt, taps: __tc })); ok(tt.taps === 4 && tt.bpm.length === 1 && tt.bpm[0] > 90 && tt.bpm[0] < 150, `4 taps on empty space -> 4 push waves + one tempo.tap (${tt.bpm.map(b => b.toFixed(0))} BPM)`);
tt = await pg.evaluate(() => __te); ok(tt && tt.src === 'ground' && tt.to.includes(1) && tt.timing, `tempo.tap carries its source (${tt && tt.src}), who hears it (${tt && tt.to}) and timing`);
const dr = await pg.evaluate(() => { const d = JO.sim.things.find(t => t.kind === 'drum'), w = innerWidth, h = innerHeight, R = Math.min(w, h) * .13; return [w / 2 + d.x * R, h * .36 + d.y * R]; });
await pg.evaluate(() => { __tt.length = 0; globalThis.__th = 0; JO.events.on('touch', e => { if (e.kind === 'thing') __th++; }); });
for (let i = 0; i < 4; i++) { await pe('pointerdown', 23, dr[0], dr[1]); await pg.waitForTimeout(40); await pe('pointerup', 23, dr[0], dr[1]); await pg.waitForTimeout(560); }
tt = await pg.evaluate(() => ({ n: __tt.length, bpm: __tt[0], th: __th, src: __te.src })); ok(tt.th === 4 && tt.n === 1 && tt.src === 'drum' && tt.bpm > 80 && tt.bpm < 120, `4 taps on the drum -> one tempo.tap from the drum (${tt.bpm && tt.bpm.toFixed(0)} BPM)`);
await pg.waitForFunction(() => !JO.music.glide, null, { timeout: 20000 }); await pg.evaluate(() => JO.events.set(null, 'music.lock', true));   // tap tempo glides 2 bars and unlocks Om lock (music.js, by design); restore the default the later checks assume
await pe('pointerdown', 22, emp[0], emp[1]); await pg.waitForTimeout(800); await pe('pointerup', 22, emp[0], emp[1]); await pg.waitForTimeout(200);
tt = await pg.evaluate(() => ({ n: JO.sim.ohms.length, hs: JO.sim.opts.holdSpawn })); ok(tt.n === q && tt.hs === false, `hold on empty space no longer grows an ohm by default (a drawn spiral does; hold-spawn is a panel switch, off) (${q} -> ${tt.n})`);
// heartbeat + drone
const h0 = await pg.evaluate(() => { const c = el => el.dispatchEvent(new Event('change')); const W = document.getElementById('dv-w'); const cb = W.querySelectorAll('input[type=checkbox]'); cb[0].checked = true; c(cb[0]); cb[1].checked = true; c(cb[1]); return (JO.events.records.get(101) || { events: [] }).events.length; });
await pg.waitForTimeout(2500);
q = await pg.evaluate(() => ({ hb: (JO.events.records.get(101) || { events: [] }).events.length, dr: JO.sound.sustains.get(102), iact: JO.audio.last.iact, opts: JO.sim.opts }));
ok(q.hb - h0 >= 2 && q.dr && q.dr.length, `heartbeat schedules beat notes (${q.hb - h0} in 2.5 s) and the drone holds voice ${q.dr}`);
// locked BPM = om/64*60 x the planet tradition's simple tempo ratio (traditions.js tempoK, Traditions wave 1 917585d; 1 with traditions' tempo off)
q = await pg.evaluate(() => { JO.events.set(null, 'music.om', 72); const T = JO.traditions.opts, t0 = T.tempo, a = { bpm: JO.music.bpm, k: JO.music.tempoK, lock: JO.music.lock };
  T.tempo = false; JO.music.setTempoK(1); const b = JO.music.bpm; T.tempo = t0; JO.traditions.refresh(); return { ...a, off: b }; }); await pg.waitForTimeout(200);
ok(q.lock && Math.abs(q.bpm - 67.5 * q.k) < .01 && Math.abs(q.off - 67.5) < .01, `om 72 Hz -> locked BPM ${q.bpm} (= 67.5 x tradition ratio ${q.k}; ${q.off} with tradition tempo off)`);
q = await pg.evaluate(() => { JO.events.set(null, 'music.bpm', 100); return { bpm: JO.music.bpm, lock: JO.music.lock }; }); ok(q.bpm === 100 && !q.lock, 'BPM knob unlocks and sets tempo');
q = await pg.evaluate(() => { const M = JO.music, k = M.key, t = M.tuning; M.setKey(0); M.setTuning('om-JI-7'); const a = M.hz(2) / M.tonicHz; M.setTuning('12-TET-7'); const b = M.hz(2) / M.tonicHz; M.setTuning(t); M.setKey(k); return [a * 100, b * 100]; });   /* v0.0.7: key pinned to the om and tunings set directly inside one call, so a key move by the harmony cannot land mid-check */ /* v0.0.6: the key moves, so compare the third to the current key's root */ ok(Math.abs(q[1] / q[0] - 1.0079) < .001, `JI vs ET third differs by ~14 cents (${q[0].toFixed(2)} vs ${q[1].toFixed(2)})`);
await pg.evaluate(() => { const W = document.getElementById('dv-w'); const cb = W.querySelectorAll('input[type=checkbox]'); cb[0].checked = false; cb[0].dispatchEvent(new Event('change')); cb[1].checked = false; cb[1].dispatchEvent(new Event('change')); }); await pg.waitForTimeout(300);
ok(!(await pg.evaluate(() => JO.pulse.droneOn)), 'drone off releases');
// proposal toggles exist
q = await pg.evaluate(() => { const t = document.getElementById('dv-w').textContent; return ['body size sets the octave', 'hold also strikes', '4-beat breath swell', 'tuning'].every(s => t.includes(s)) && (o => o.includes('om-JI-7') && o.includes('12-TET-7'))([...document.querySelector('#dv-w select').options].map(x => x.value)); });   // + the traditions' trad.* tunings (open-ended TUNINGS table, 917585d) ok(q, 'proposal toggles + JI/ET select in panel');
// FX chain + family + save / load
q = await pg.evaluate(() => { const r = JO.sim.ohm, rec0 = r.recipe; const sel = document.querySelector('#dv-chain select'); sel.value = 'svf'; sel.dispatchEvent(new Event('change'));
  const fam = document.querySelector('#dv-mix select'); fam.value = 'eFM'; fam.dispatchEvent(new Event('change'));
  document.getElementById('dv-name').value = 'smoke1'; document.getElementById('dv-save').click(); document.getElementById('dv-new').click(); const other = JO.sim.ohm.recipe;
  const l = document.getElementById('dv-list'); l.value = 'smoke1'; document.getElementById('dv-load').click();
  const { recipes } = {}; return { other, now: JO.sim.ohm.recipe, saved: JSON.parse(localStorage.getItem('jo.recipes')).smoke1 }; });
ok(q.saved && q.saved.fx[0].kind === 'svf' && q.saved.synth.family === 'eFM' && q.saved.mods.length > 0 && q.now !== q.other, `save/load round-trips the whole sound (fx ${q.saved && q.saved.fx.map(f => f.kind)}, family ${q.saved && q.saved.synth.family}, ${q.saved && q.saved.mods.length} matrix rows)`);
await pg.mouse.click(geo.cx, geo.cy); await pg.waitForTimeout(300);
q = await pg.evaluate(() => ({ fxOn: JO.audio.last.fxOn, ms: JO.matrix.ms, max: JO.matrix.msMax, ctl: JO.ctl.ms, n: JO.events.n }));
ok(q.fxOn >= 1, `fx chain active (${q.fxOn} slots)`);
console.log('MATRIX ' + JSON.stringify(q));
// let the self-test finish
await pg.waitForFunction(() => JO.selftest.res, null, { timeout: (ST + 15) * 1000 });
const res = await pg.evaluate(() => JO.selftest.res);
ok(res && res.ramp.length >= 8, 'self-test finished with a voice ramp');
console.log('SELFTEST ' + JSON.stringify({ touchMs: res.touchMs, frameMs: res.frameMs, load: res.load, overBudgetBlocks: res.overBudgetBlocks, ramp: res.ramp.map(x => [x.voices, x.load == null ? null : +(x.load * 100).toFixed(2), x.active]), perfClock: res.workletPerfClock, base: res.baseLatencyMs, out: res.outputLatencyMs, sr: res.sampleRate, pass: res.pass }));
await pg.evaluate(() => JO.panel.toggle(true)); await pg.waitForTimeout(1200);   // the live line only updates while the panel is open
// v0.0.22: tradition auras dev switch (#dv-tradaura): OFF by default; on -> a rare ohm gets its aura drawn; off again
q = await pg.evaluate(() => { const l = document.getElementById('dv-tradaura'), A = JO.render.look.api.aura; if (!l || !A) return { l: !!l, A: !!A }; const c = l.querySelector('input'), off0 = !A.on && !c.checked;
  const o = JO.sim.ohm; JO.rare.markRare(o, 'gift'); try { o.tier = 2; o.xp = 30; } catch (e) {} c.checked = true; c.dispatchEvent(new Event('change')); return { l: true, A: true, off0, on: A.on }; });
await pg.waitForTimeout(1500);
const ta = await pg.evaluate(() => { const A = JO.render.look.api.aura, d = A.stats.drawn, c = document.querySelector('#dv-tradaura input'); c.checked = false; c.dispatchEvent(new Event('change')); return { d, offAgain: !A.on }; });
ok(q.l && q.off0 && q.on && ta.d > 0 && ta.offAgain, `tradition auras: dev toggle present, off by default, on draws the aura (${ta.d} ohm(s) with an aura this frame), off again (${JSON.stringify(q)})`);
// v0.0.23: aura stage choice (#dv-aurastage: 1 default / full 3) and the role TEXT labels off by default behind a switch
q = await pg.evaluate(async () => { const l = document.getElementById('dv-aurastage'), A = JO.render.look.api.aura; if (!l || !A) return { l: !!l }; const se = l.querySelector('select'), s0 = A.stage, v0 = se.value;
  const o = JO.sim.ohm; JO.rare.markRare(o, 'gift'); try { o.tier = 2; o.xp = 30; } catch (e) {} const c = document.querySelector('#dv-tradaura input'); c.checked = true; c.dispatchEvent(new Event('change')); se.value = '3'; se.dispatchEvent(new Event('change')); const s3 = A.stage, d0 = A.stats.drawn;
  await new Promise(r => setTimeout(r, 1500)); const d3 = A.stats.drawn, inf = A.info(JO.sim.ohm), i3 = inf.stage, L3 = inf.L, st = JSON.stringify(A.stats); se.value = '1'; se.dispatchEvent(new Event('change')); const s1 = A.stage; c.checked = false; c.dispatchEvent(new Event('change'));
  const R = JO.systems.roles, sw = JO.systems.switches.find(w => w.k === 'roleText'); return { l: true, s0, v0, s3, d3, i3, L3, st, s1, text0: R.opts.text, sw: !!sw }; });
ok(q.l && q.s0 === 1 && q.v0 === '1' && q.s3 === 3 && q.i3 === 3 && q.d3 > 0 && q.s1 === 1, `aura stage dev choice: 1 by default, full (3) draws at stage 3, back to 1 (${JSON.stringify(q)})`);
ok(q.text0 === false && q.sw, 'role text labels off by default, dev switch roleText present (body cues show the role)');
const live = await pg.evaluate(() => { const t = document.getElementById('dv-live').textContent; JO.panel.toggle(false); return t; }); ok(/worklet load/.test(live), 'dev panel live line renders');
ok(errs.length === 0, `no page errors (${errs.join(' | ')})`);
// v0.0.23 ZOOM SMOOTHNESS PROBE (tests/zoom_probe_core.mjs; v0.0.24 adds snap judder 'hitch' and the full dive layer set): real pinches (touch pointers, one step per frame) through every space
// layer out and back in, a dive into the ohm and out, a ground pan; per gesture the camera must follow the fingers with no jumps,
// reversals or spring-back and no hitching frames. Then the discord slowdown (gate forced closed, full strength): only slower,
// it rests where you let go and the next pinch goes on into the star system.
{ const { GESTURES, PROBE, analyse, verdict } = await import('./zoom_probe_core.mjs');
  await pg.goto('about:blank');   // the main smoke page keeps playing otherwise and steals the CPU from the probe page
  const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
  const run = async (pre, only) => { const p2 = await b.newPage({ viewport: { width: 412, height: 860 } }); const e2 = []; p2.on('pageerror', e => e2.push(String(e)));
    await p2.addInitScript(SEED(20261025)); await p2.goto(`http://127.0.0.1:${port}/?fresh=1&selftest=0&autostart`); await p2.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 }); await p2.waitForTimeout(2500);
    const D0 = await p2.evaluate(() => { const w = JO.world, d = w.zl && w.zl.dive; return { camFrame: w.opts.camFrame, skyInc: w.opts.skyInc, terrWarm: w.opts.terrWarm, wf: d && d.opts.worldFollow, me: d && d.opts.magnetEase, gv: d && d.opts.gvTau }; });
    if (pre) await p2.evaluate(pre); const A = (await p2.evaluate(PROBE, GESTURES.filter(g => !only || only.test(g.name)))).map(analyse); await p2.close(); return { A, e2, D0 }; };
  const Z = await run(null, null);
  for (const a of Z.A) { const v = verdict(a); ok(!v.length, `zoom probe ${a.name}: follow ${a.follow} back ${a.back} draw p95 ${a.drP95} ms, >16ms ${a.slow}, dt p95 ${a.dtP95}${v.length ? ' <- ' + v.join(', ') : ''}`); }
  // v0.0.24 smooth-zoom dev switches default to smooth (camera per drawn frame, incremental sky/terrain bakes, world zooms with the dive, eased magnet, time-weighted release speed)
  { const d = Z.D0; ok(d.camFrame === true && d.skyInc === true && d.terrWarm === true && d.wf === true && d.me > 0 && d.gv > 0, `smooth-zoom switches default on (${JSON.stringify(d)})`); }
  ok(Z.e2.length === 0, `zoom probe: no page errors (${Z.e2.slice(0, 2).join(' | ')})`);
  const G = await run('JO.rare.gate=()=>false; JO.rare.strength=()=>1', /^out (ground|sky|planet)/), [g0, g1, g2] = G.A;
  for (const a of G.A) { const v = verdict(a); ok(!v.length, `zoom probe discord ${a.name}: z ${a.z0}->${a.zEnd} rest ${a.zRest} draw p95 ${a.drP95}${v.length ? ' <- ' + v.join(', ') : ''}`); }
  ok(g1 && g1.closed && g1.zEnd > -1.95 && g1.zEnd < -1.4 && Math.abs(g1.zRest - g1.zEnd) < .02 && g1.relJ === 0, `discord slowdown: slower past the planet (${g1 && g1.zEnd}), rests where let go (${g1 && g1.zRest}), no snap`);
  ok(g2 && g2.zEnd < -2.05, `discord slowdown: the next pinch goes on into the star system (${g2 && g2.zEnd})`); }
// v0.0.29 ZOOM VISUAL CHECK (tools/zoom_frames.mjs, the same metrics without the PNGs): the probe's ground / sky / dive gestures at phone
// size + DPR, each frame the two canvases composited as seen and measured at 103x215: no black blowout (v0.0.27: the dive copied only the
// ohm canvas into an uncleared opaque buffer, 64% of the screen went black, the ohms smeared) and no one-frame pops (v0.0.27: the land
// snapped to flat fills when a zoom out began, diff 27; partials <-> wave flashed, diff 22; dives 40-60).
{ const { GESTURES, PROBE } = await import('./zoom_probe_core.mjs');
  const p3 = await b.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2.625 }); const e3 = []; p3.on('pageerror', e => e3.push(String(e)));
  await p3.addInitScript('let __s = 20261025 >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };');
  await p3.goto(`http://127.0.0.1:${port}/?fresh=1&selftest=0&autostart`); await p3.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 }); await p3.waitForTimeout(2500);
  await p3.evaluate(() => { const W = innerWidth, H = innerHeight, C = document.createElement('canvas'); C.width = 103; C.height = 215; const x = C.getContext('2d', { willReadFrequently: true }); let prev = null;
    globalThis.__V = []; globalThis.__vcap = () => { const bg = document.getElementById('bg'), c = document.getElementById('c'); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = '#05040a'; x.fillRect(0, 0, 103, 215);
      if (bg) x.drawImage(bg, 0, 0, 103, 215); x.drawImage(c, 0, 0, 103, 215); const d = x.getImageData(0, 0, 103, 215).data, n = 103 * 215, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
      let diff = 0; if (prev) for (let i = 0; i < n; i++) diff += Math.abs(L[i] - prev[i]); let cells = 0, dk = 0; for (let cy = 0; cy + 8 <= 215; cy += 8) for (let cx = 0; cx + 8 <= 103; cx += 8) { cells++; let all = true; for (let yy = 0; yy < 8 && all; yy++) for (let q = 0; q < 8; q++) if (L[(cy + yy) * 103 + cx + q] >= 9) { all = false; break; } if (all) dk++; }
      prev = L; __V.push({ diff: diff / n, dark: dk / cells }); }; });
  const src = PROBE.toString().replace('const raf = () => new Promise(r => requestAnimationFrame(r));', 'const raf = () => new Promise(r => requestAnimationFrame(r)).then(() => globalThis.__vcap && globalThis.__vcap());');
  ok(src !== PROBE.toString(), 'zoom visual: probe raf hook found');
  for (const g of GESTURES.filter(g => /^(out ground->sky|in sky->ground|zoom\+pan|pan ground|dive)/.test(g.name))) {
    await p3.evaluate(() => { __V.length = 0; }); await p3.evaluate(`(${src})(${JSON.stringify([g])})`);
    const M = (await p3.evaluate(() => __V)).slice((g.z0 != null ? 40 : 0) + 1), dM = Math.max(0, ...M.map(m => m.diff)), kM = Math.max(0, ...M.map(m => m.dark)), dive = /^dive/.test(g.name), lim = dive ? 16 : 24;
    ok(M.length > 10 && dM < lim && kM < .05, `zoom visual ${g.name}: frame-to-frame change max ${dM.toFixed(1)} (< ${lim}), black share max ${kM.toFixed(2)} (< .05)`); }
  ok(e3.length === 0, `zoom visual: no page errors (${e3.slice(0, 2).join(' | ')})`); await p3.close(); }
// v0.0.29 skyHold (Wilbow: "If the pinch zoom includes the sky and the ground it looks too wierd. But keep this effect to be used as an accent"):
// a ground pinch scales the ground, the sky moves only skyPar (.15) of it and far ranges farPar (.5); going out to the planet the sky blends up to the full zoom
// (no snap: the probe's skyJ); zoomAccent (OFF) and skyHold off both give the v0.0.28 whole-picture zoom
{ const { GESTURES, PROBE, analyse } = await import('./zoom_probe_core.mjs');
  const p4 = await b.newPage({ viewport: { width: 412, height: 860 } }); const e4 = []; p4.on('pageerror', e => e4.push(String(e)));
  await p4.goto(`http://127.0.0.1:${port}/?fresh=1&selftest=0&autostart`); await p4.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm, null, { timeout: 20000 }); await p4.waitForTimeout(1500);
  const run = async (names, pre) => { if (pre) await p4.evaluate(pre); return (await p4.evaluate(PROBE, GESTURES.filter(g => names.includes(g.name)))); };
  const O0 = await p4.evaluate(() => { const O = JO.world.opts; return { skyHold: O.skyHold, zoomAccent: O.zoomAccent, skyPar: O.skyPar, farPar: O.farPar }; });
  ok(O0.skyHold === true && O0.zoomAccent === false && O0.skyPar === .15 && O0.farPar === .5, `sky hold: switches default skyHold ON, zoomAccent OFF, skyPar .15, farPar .5 (${JSON.stringify(O0)})`);
  let R = await run(['in ground->+1 (bare)', 'out ground->sky', 'out sky->planet']);
  const gr = R.find(r => r.name === 'in ground->+1 (bare)').rec.filter(q => q.z >= 0 && q.sk != null), hd = gr.filter(q => Math.abs(q.sk - .15) < .005 && Math.abs(q.fk - .5) < .005);
  ok(gr.length > 10 && hd.length === gr.length, `sky hold: ground pinch holds the sky (skyK .15, farK .5) on ${hd.length}/${gr.length} frames`);
  const pl = R.flatMap(r => r.rec).filter(q => q.z <= -.86 && q.sk != null), full = pl.filter(q => q.sk === 1 && q.fk === 1);
  ok(pl.length > 5 && full.length === pl.length, `sky hold: past the hand-off (z <= -.85) the sky zooms fully on ${full.length}/${pl.length} frames`);
  const A = R.map(analyse); ok(A.every(a => a.skyJ === 0), `sky hold: hand-off without a snap (max skyK step ${Math.max(...A.map(a => a.skyMax))}, ${A.map(a => a.skyJ).join('/')} snaps)`);
  R = await run(['in ground->+1 (bare)'], () => { JO.world.opts.zoomAccent = true; }); let ac = R[0].rec.filter(q => q.sk != null);
  ok(ac.length > 10 && ac.every(q => q.sk === 1 && q.fk === 1 && q.hk === 0), `sky hold: zoomAccent ON = the whole picture zooms (skyK 1 on ${ac.filter(q => q.sk === 1).length}/${ac.length})`);
  R = await run(['in ground->+1 (bare)'], () => { JO.world.opts.zoomAccent = false; JO.world.opts.skyHold = false; }); ac = R[0].rec.filter(q => q.sk != null);
  ok(ac.length > 10 && ac.every(q => q.sk === 1 && q.fk === 1), `sky hold: skyHold off = v0.0.28 zoom (skyK 1 on ${ac.filter(q => q.sk === 1).length}/${ac.length})`);
  await p4.evaluate(() => { JO.world.opts.skyHold = true; }); ok(e4.length === 0, `sky hold: no page errors (${e4.slice(0, 2).join(' | ')})`); await p4.close(); }
await b.close(); srv.close(); console.log(fails ? `FAIL ${fails}` : 'PW_OK');
