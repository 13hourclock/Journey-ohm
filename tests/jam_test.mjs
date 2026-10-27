// jam: a phrase from the player is answered on the next bar line, in the scale, resolving on a chord tone; nothing happens without a
// caller (no drift). v0.0.6: the sound blend is by CONTEXT (blend.js): grows with time together x closeness, fades apart. 2:31: it learns PATTERNS (default on); sound absorption is ON by default again (rollback 2026-10-25, capped at 35%); no solo rule.
import { createMusic } from '../www/js/music.js';
import { createEvents } from '../www/js/events.js';
import { createSim } from '../www/js/sim.js';
import { createJam } from '../www/js/jam.js';
import { createBlend } from '../www/js/blend.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
let T = 0; const music = createMusic(() => T), bus = createEvents(music), sim = createSim(music, bus); sim.reseed(5); const jam = createJam(sim, bus, music), blend = createBlend(sim, bus, music); sim.blend = blend;
const ans = []; bus.on('note', e => { if (e.src === jam.partner) ans.push(e); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const step = s => { for (let i = 0; i < s * 50; i++) { T += .02; music.tickGlide(); bus.flush(); blend.tick(); jam.tick(); } };
ok(sim.opts.jam.div === 4 && sim.opts.jam.snap === 'context', 'v0.0.7 default: taps in a jam snap to 1/16, strength from context'); sim.opts.jam.div = 2; sim.opts.jam.snap = 'hard';   // the checks below use the old hard 1/8 grid
step(8); ok(ans.length === 0, 'no caller -> partner silent (no drift)');
ok(music.jam === null, 'no jam yet -> taps instant');
const usedP = [], ps = []; let k = [];
for (let ph = 0; ph < 14; ph++) { const n0 = ans.length;
  for (const d of [0, 2, 4, 3]) { bus.note({ src: sim.ohm, kind: 'note', deg: d, vel: .7, t: T }); step(.5); }
  step(6); const a = ans.slice(n0);
  if (ph === 0) { ok(music.jam && music.jam.div === 2, 'after the first answer the jam runs: taps snap to 1/8'); ok(a.length >= 3 && a.length <= 5, `phrase answered with ${a.length} notes (max 5)`);
    ok(a.every(e => { const u = e.beat * 2 - Math.floor(e.beat * 2 + 1e-6); return u < 1e-6 || u < .18; }) && Math.abs(a[0].beat % 4) < 1e-6, `answer starts on a bar line (beat ${a[0].beat.toFixed(2)}) on the 1/8 grid (+ its own swing)`);
    ok([0, 2, 4].includes(((a[a.length - 1].deg % 7) + 7) % 7), `resolves on chord tone (deg ${a[a.length - 1].deg})`);
    ok([0, 2, 4].includes(((a[0].deg % 7) + 7) % 7), `strong-beat first note is a chord tone (deg ${a[0].deg})`); }
  k.push(blend.share(jam.partner, sim.ohm.recipe)); const lp = blend.pattern(jam.partner, true); ps.push(lp ? lp.share : 0); /* v0.0.7: raw strength share (what it plays = the context share, Q46) */ if (jam.usedPattern) usedP.push(ph); }
ok(k[0] > 0 && k[13] > k[0] && k[13] > .3, `jamming together -> the bond to your ohm (weights for sound, if switched on) grows, no fixed cap: ${k.map(x => x.toFixed(2)).join(' ')}`);
ok(ps[13] > ps[1] && ps[13] > .2, `jamming together -> it learns your phrase as a pattern, growing: ${ps.map(x => x.toFixed(2)).join(' ')}`);
ok(usedP.length >= 1 && usedP.length < 14, `its answers sometimes take the learned pattern (phrases ${usedP.join(',')}), otherwise its own style`);
ok(sim.opts.blend.sound === true && blend.learnFor(jam.partner).length >= 1, 'sound absorption ON by default (rollback 2026-10-25): it blends your sound in, capped'); sim.opts.blend.sound = false; ok(blend.learnFor(jam.partner) === null, 'switch off -> it stays its own sound'); sim.opts.blend.sound = true;
const lonely = sim.sources.find(o => o.scale === 'ohm' && o !== sim.ohm && o !== jam.partner); if (lonely) ok(blend.top(lonely).length === 0, 'an ohm that jams with no one stays itself');
// roles: a sparse caller phrase hands the lead to the partner (traded at the phrase end, from what each played)
const nb = ans.length; bus.note({ src: sim.ohm, kind: 'note', deg: 2, vel: .7, t: T }); step(8); ok(jam.roles === undefined && ans.length > nb, 'no roles: a sparse phrase still gets an answer');
const sup = ans.slice(nb); ok(sup.length >= 1, `answer ${sup.length} notes`);
// tap change lands at the next bar during a jam; a hold change is instant
{ // v0.0.7 snap strength (24A 24D): near the line pulls fully, far off stays loose; free = no snap; hard = always the line
  const J0 = music.jam, at = x => { const t0 = music.timeOfBeat(x); return music.beat(music.when(t0)); }, B0 = Math.ceil(music.beat()) + 8;
  music.jam = { div: 4, snap: .5 }; const near = at(B0 + .23), far = at(B0 + .13), past = at(B0 + .26);
  ok(Math.abs(near - (B0 + .25)) < 1e-6, `tap just before a 1/16 line is pulled onto it (${(near - B0).toFixed(3)})`);
  ok(far > B0 + .13 && far < B0 + .25, `tap far off the line stays loose (${(far - B0).toFixed(3)})`); ok(Math.abs(past - (B0 + .26)) < 1e-6, 'line just passed -> plays now, never late');
  music.jam = { div: 4, snap: 0 }; ok(Math.abs(at(B0 + .23) - (B0 + .23)) < 1e-6, 'free -> no snap'); music.jam = { div: 4, snap: 1 }; ok(Math.abs(at(B0 + .13) - (B0 + .25)) < 1e-6, 'hard -> always the line');
  sim.opts.jam.snap = 'context'; const k = jam.snapK(); ok(k >= 0 && k <= 1, `context strength ${k.toFixed(2)} (genes + feel + density)`); sim.opts.jam.snap = 'hard'; music.jam = J0; }
ok(music.jam, 'jam running'); sim.opts.land.mode = 'bar'; bus.land = sim.opts.land; const sets = []; bus.on('set', e => sets.push(e)); bus.tap = 1; bus.set(null, 'opt.jam.div', 4); bus.tap = 0;
ok(sim.opts.jam.div === 2, 'tap change waits during a jam'); step(4.1); ok(sim.opts.jam.div === 4 && sets.length && Math.abs(music.beat(sets[0].t) % 4) < 1e-6, `tap change landed on a bar line (beat ${sets.length ? music.beat(sets[0].t).toFixed(2) : '-'})`);
bus.set(null, 'opt.jam.near', 5); ok(sim.opts.jam.near === 5, 'hold change instant'); bus.set(null, 'opt.jam.div', 2);
// v0.0.6 context landing (Wilbow 6A+6D): on the beat -> now; off the beat -> next bar; dense jam -> phrase end
sim.opts.land.mode = 'context'; const ob = Math.ceil(music.beat()) + 2; while (music.beat() < ob) step(.01); bus.tap = 1; bus.set(null, 'opt.jam.div', 4); bus.tap = 0; ok(sim.opts.jam.div === 4, 'context: tap on the beat lands now');
step(.25 * 60 / music.bpm); const pb = music.beat(); bus.tap = 1; bus.set(null, 'opt.jam.div', 2); bus.tap = 0; ok(sim.opts.jam.div === 4 && bus.pending.length && !bus.pending[0].phrase, `context: off-beat tap (beat ${pb.toFixed(2)}) waits for the bar`); step(4.1); ok(sim.opts.jam.div === 2, 'and lands');
step(.25 * 60 / music.bpm); for (let i = 0; i < 10; i++) bus.note({ src: sim.ohm, kind: 'note', deg: i % 5, vel: .3 }); step(.25 * 60 / music.bpm); bus.tap = 1; bus.set(null, 'opt.jam.div', 4); bus.tap = 0;
ok(bus.pending.length && bus.pending[0].phrase, 'context: dense jam -> waits for the phrase end'); step(1.5 * 60 / music.bpm); ok(sim.opts.jam.div === 4, 'lands at the first 1-beat gap'); bus.set(null, 'opt.jam.div', 2);
// near: far apart -> no jam; nudged together -> jam
step(30); sim.ohm.place = { x: 20, y: 0 }; const nf = ans.length; bus.note({ src: sim.ohm, kind: 'note', deg: 1, vel: .7, t: T }); step(8); ok(ans.length === nf, 'far apart -> partner does not answer');
sim.ohm.place = { x: 0, y: 1 }; bus.note({ src: sim.ohm, kind: 'note', deg: 1, vel: .7, t: T }); step(8); ok(ans.length > nf, 'nudged together -> partner answers'); delete sim.ohm.place;
// tap tempo: 4 steady taps 0.5 s apart -> 120 BPM, glided over 2 bars
bus.on('tempo.tap', ev => music.tapTempo(ev.times)); jam.tick(); const far = { id: 77 }, b60 = music.bpm; bus.post({ type: 'tempo.tap', times: [T, T + .5, T + 1, T + 1.5] });
step(1); const mid = music.bpm; step(12); ok(b60 === 60 && mid > 60 && mid < 120 && Math.abs(music.bpm - 120) < 1e-6 && !music.glide, `tap tempo glides ${b60} -> ${mid.toFixed(1)} -> ${music.bpm.toFixed(1)} BPM`);
ok(music.bpmFor(sim.ohm) === 120 && music.bpmFor(far) === 60, `your ohm follows your taps (${music.bpmFor(sim.ohm)}); an ohm not jamming/listening keeps its own time (${music.bpmFor(far)})`);
music.setFollow(far, 1); ok(music.bpmFor(far) === 120, 'once it jams / listens with you it follows'); sim.opts.tempo.follow = 'all'; jam.tick(); ok(music.bpmFor({ id: 78 }) === 120, "'every ohm' toggle"); sim.opts.tempo.follow = 'context';
sim.opts.jam.on = false; const n1 = ans.length; bus.note({ src: sim.ohm, kind: 'note', deg: 1, vel: .7, t: T }); step(30); ok(ans.length === n1 && music.jam === null, 'jam off -> no answers, taps instant again');
{ const o = sim.ohms.find(x => x !== sim.ohm && x.brain && blend.pattern(x, true)); if (o) { sim.opts.blend.on = true; o.brainMod = { learned: .5 }; blend.bar(); const a = blend.pattern(o).share; o.brainMod = { learned: 0 }; blend.bar(); const b = blend.pattern(o).share;
  ok(a > b, `Q46: how much it plays from its brain follows context (matrix brain.learned .5 -> ${a.toFixed(2)}, 0 -> ${b.toFixed(2)})`); } else ok(false, 'Q46: no ohm with a learned pattern'); }
console.log(fails ? 'JAM_FAIL' : 'JAM_OK');
