// instruments module test (generated tones only): every ohm its own instrument, a group is varied, every palette row renders finite,
// the matrix still moves every instrument, learned sounds blend in capped, tract voices play + stop, worst-case DSP cost.
import { DSPFactory } from '../www/js/dsp.js';
import { InstFactory } from '../www/js/dsp/inst.js';
import { FXFactory } from '../www/js/dsp/fx.js';
import { makeRecipe, voicesFor, toJSON, fromJSON } from '../www/js/recipe.js';
import { PALETTE, instP, IOPTS } from '../www/js/instruments.js';
import { KINDS, makeInsert, apply as fxApply } from '../www/js/fxkinds.js';
import { createMusic } from '../www/js/music.js';
const SR = 48000, now = () => 0; now.perf = () => performance.now(); let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const L = new Float32Array(128), R = new Float32Array(128);
const render = (d, sec) => { let e = 0, fin = true; for (let b = 0; b < Math.round(sec * SR / 128); b++) { d.render(L, R, 128); for (let i = 0; i < 128; i++) { if (!isFinite(L[i])) fin = false; e += L[i] * L[i]; } } return { e, fin }; };
// 1. a group of 12 consecutive new ohms: mostly different primary instruments, all different blends
const G = []; for (let i = 0; i < 12; i++) G.push(makeRecipe(1000 + i * 31337));
const prim = new Set(G.map(r => r.inst.a)), fam = new Set(G.map(r => PALETTE.find(e => e.id === r.inst.a).family));
ok(prim.size >= 10, `12 ohms -> ${prim.size} different main instruments, ${fam.size} families (${[...fam].join(', ')})`);
ok(fam.size >= 6, 'a group spans at least 6 families');
// 2. continuous: same landmark, different ohm -> different params
const a = G[0], b2 = Object.assign({}, a.inst, { s: a.inst.s + 1 }); const Pa = instP(a.inst), Pb = instP(b2);
ok(Math.abs(Math.log(Pa.cut / Pb.cut)) > .01 && Pa.att !== Pb.att, 'same landmark, different ohm: its own filter + envelope');
// 3. every row renders finite and audible through the worklet DSP
let bad = []; for (const e of PALETTE) { const d = DSPFactory(SR, now, InstFactory, FXFactory), rec = makeRecipe(7, { add: false }); rec.inst = { a: e.id, b: e.id, w: 0, s: 3 };
  for (const m of voicesFor(rec, { f: 220, vel: .8, src: 1, dur: 1 }, {})) d.msg(Object.assign(m, { id: 1 })); const r = render(d, .6); if (!r.fin || r.e < 1e-6) bad.push(e.id); }
ok(!bad.length, `all ${PALETTE.length} palette rows play finite + audible ${bad.join(',')}`);
// 4. the matrix moves every instrument: synth.cut offset changes P.cut; live smod changes output
{ const r = G[1], v0 = voicesFor(r, { f: 220, vel: .7, src: 1 }, {}), v1 = voicesFor(r, { f: 220, vel: .7, src: 1 }, { 'synth.cut': .3 }); const i0 = v0.find(m => m.t === 'inst' && m.P), i1 = v1.find(m => m.t === 'inst' && m.P);
  ok(i0 && i1 && i1.P.cut > i0.P.cut * 1.2, 'matrix synth.cut row opens the instrument filter'); }
{ const run = smod => { const d = DSPFactory(SR, now, InstFactory, FXFactory); const r = G.find(x => !instP(x.inst).tract && instP(x.inst).cut < 2600) || G.find(x => !instP(x.inst).tract);   /* a row whose filter sits in band (a bowed fiddle at 3.3k barely moves with a cut offset; v0.0.18 the percussion gene changed which row came first) */ if (smod) d.msg({ t: 'smod', src: 1, m: { cut: [.25, 0] } }); for (const m of voicesFor(r, { f: 220, vel: .8, src: 1, dur: 1 }, {})) d.msg(Object.assign(m, { id: 1 })); return render(d, .4).e; };
  const e0 = run(false), e1 = run(true); ok(Math.abs(e1 - e0) / e0 > .05, `live matrix (smod cut) changes the sound (${(e1 / e0).toFixed(2)}x energy)`); }
// 5. voice ohms: tract plays, follows a live mod, stops on release
{ const vr = makeRecipe(1, { add: false }); vr.inst = { a: 'tract_singer', b: 'choir', w: .2, s: 5 }; const ms = voicesFor(vr, { f: 196, vel: .8, src: 4, dur: 1 }, {});
  ok(ms.length === 1 && ms[0].tract && ms[0].tract.segs.length >= 2, 'a voice ohm sings a syllable on its vocal tract');
  const d = DSPFactory(SR, now, InstFactory, FXFactory); d.msg(Object.assign(ms[0], { id: 1 })); const r1 = render(d, .3); ok(r1.fin && r1.e > 1e-5, 'tract renders finite + audible');
  for (let k = 0; k < 6; k++) d.msg(Object.assign(voicesFor(vr, { f: 196, vel: .8, src: 4, sustain: 20 }, {})[0], { id: 2 })); d.msg({ t: 'instOff', src: 4 }); render(d, 2); const r2 = render(d, .3);
  ok(r2.e < 1e-6, `tract voice stops when its ohm is released (energy ${r2.e.toExponential(1)})`); }
// 6. learned sound: blended in, capped, own sound stays the larger part
{ const r = G[2], o = G[5], P0 = instP(r.inst), v = voicesFor(r, { f: 220, vel: .7, src: 1 }, {}, [{ inst: o.inst, k: 1 }]).find(m => m.t === 'inst' && m.P), Po = instP(o.inst);
  if (v && !P0.tract) { const t = Math.log(v.P.cut / P0.cut) / (Math.log(Po.cut / P0.cut) || 1); ok(t > .05 && t <= .36, `learned sound blends in, capped (${(t * 100).toFixed(0)}% toward partner)`); } else ok(true, 'learned blend skipped (voice ohm)'); }
// 7. saves: an old save without an instrument gets one; a saved one keeps its instrument
{ const s = toJSON(G[3]); const back = fromJSON(JSON.parse(JSON.stringify(s))); ok(back.inst && back.inst.a === G[3].inst.a && back.inst.w === G[3].inst.w, 'saved ohm keeps its instrument');
  delete s.inst; const old = fromJSON(s); ok(!!old.inst, 'an old save gets an instrument'); }
// 8. cost: worst case with the heaviest instruments (32 modal + 14 heavy instrument voices + 4 tract + 8 inserts + 4 spectral)
{ const d = DSPFactory(SR, now, InstFactory, FXFactory), music = createMusic(() => 0), heavy = ['choir', 'grain_shimmer', 'moving_pad', 'organ', 'bagpipe_drone', 'gong', 'ring_bell'];
  let id = 1; const mod = makeRecipe(12345, { add: false }); mod.mix = { modal: 1, synth: 0 };
  for (let i = 0; i < 32; i++) for (const m of voicesFor(mod, { f: 64 * (2 + i % 7), vel: .8, dur: 20, src: 1, fx: 0 }, {})) d.msg(Object.assign(m, { id: id++, hold: 1 }));
  for (let i = 0; i < 14; i++) { const r = makeRecipe(9, { add: false }); r.inst = { a: heavy[i % heavy.length], b: heavy[(i + 3) % heavy.length], w: .3, s: i }; for (const m of voicesFor(r, { f: 110 * (1 + i % 5 * .3), vel: .8, dur: 20, sustain: 20, src: 2 + i, fx: 0 }, {})) d.msg(Object.assign(m, { id: id++ })); }
  for (let i = 0; i < 4; i++) { const r = makeRecipe(9, { add: false }); r.inst = { a: 'tract_singer', b: 'choir', w: .3, s: i }; for (const m of voicesFor(r, { f: 150 + i * 40, vel: .8, sustain: 20, src: 30 + i }, {})) d.msg(Object.assign(m, { id: id++ })); }
  const ks = KINDS.slice(0, 8); ks.forEach((k, i) => { const it = makeInsert(k, i), m = fxApply(music, it, it.ctl); d.msg({ t: 'fx', slot: i, kind: m.kind, p: m.p, mix: m.mix, to: i < 7 ? i + 1 : -1 }); });
  for (let i = 0; i < 4; i++) { const it = makeInsert('spc', 50 + i), m = fxApply(music, it, it.ctl); d.msg({ t: 'fx', slot: 8 + i, kind: m.kind, p: m.p, mix: m.mix, to: -1 }); }
  for (let i = 0; i < 50; i++) d.render(L, R, 128); const t = performance.now(); for (let i = 0; i < 1500; i++) d.render(L, R, 128); const ms = (performance.now() - t) / 1500, pct = ms / (128 / SR * 1000) * 100; const s = d.stats();
  console.log(`INSTR WORST (32 modal + ${s.iact} heavy instrument + ${d.stats().act >= 0 ? 4 : 0} tract + inserts): ${pct.toFixed(1)}% of budget`);
  ok(pct < 44.2 * 1.1, 'instrument worst case within the master DSP gate (44.2% + noise)'); }
console.log(fails ? `INSTRUMENTS_FAIL ${fails}` : 'INSTRUMENTS_OK'); process.exit(fails ? 1 : 0);
