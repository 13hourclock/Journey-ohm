// offline: render the worklet DSP (modal voices + ported synth engines + FX inserts + reverb + limiter) and report
// ms per 128-sample block (box-side estimate; phones are slower). Also a sanity check on output bounds.
import { DSPFactory } from '../www/js/dsp.js';
import { InstFactory } from '../www/js/dsp/inst.js';
import { FXFactory } from '../www/js/dsp/fx.js';
import { makeRecipe, voicesFor } from '../www/js/recipe.js';
import { KINDS, ALL_KINDS, makeInsert, apply as fxApply } from '../www/js/fxkinds.js';
import { createMusic } from '../www/js/music.js';
const SR = 48000; const now = () => 0; now.perf = () => performance.now();
const d = DSPFactory(SR, now, InstFactory, FXFactory), L = new Float32Array(128), R = new Float32Array(128); let fails = 0;
const music = createMusic(() => 0);
const rec = makeRecipe(12345); rec.mix = { modal: 1, synth: 1 };
const budget = 128 / SR * 1000, out = [];
const time = (N = 1500) => { for (let i = 0; i < 50; i++) d.render(L, R, 128); const t = performance.now(); for (let i = 0; i < N; i++) d.render(L, R, 128); return (performance.now() - t) / N; };
const line = (lab, ms) => out.push(`${lab}: ${ms.toFixed(4)} ms/block = ${(ms / budget * 100).toFixed(1)}% of budget`);
const reset = () => { d.msg({ t: 'all' }); for (let i = 0; i < 8; i++) d.msg({ t: 'fx', slot: i, off: 1 }); for (let i = 0; i < 300; i++) d.render(L, R, 128); };
let id = 1;
const play = (n, which, extra = {}) => { for (let i = 0; i < n; i++) { const ms = voicesFor(rec, { f: 64 * (2 + i % 7), vel: .8, pos: .3, dur: 20, src: 1, fx: extra.fx ?? -1, sustain: 20 }, {});
  for (const m of ms) if (which === 'both' || m.t === which) { m.id = id++; if (m.t === 'note') m.hold = 1; d.msg(m); } } };
for (const nv of [0, 8, 16, 32]) { reset(); play(nv, 'note'); const ms = time(); const s = d.stats(); line(`${nv} modal voices`, ms); if (s.act !== nv) { fails++; out.push('  FAIL active count ' + s.act); } }
reset(); play(14, 'inst'); line(`14 synth voices (${rec.synth.family}, ${d.stats().iact} active)`, time());
for (const fam of ['eVA', 'eFM', 'eWT', 'eKS', 'eGRAN', 'eADD']) { rec.synth.family = fam; reset(); play(14, 'inst'); line(`  14 synth voices family ${fam}`, time(800)); }
rec.synth.family = 'auto';
// FX: 8 slots, two chains of 4 inserts, cycling through all kinds in groups
const kinds = ALL_KINDS.slice(); let worst = 0, worstK = '';
for (let g = 0; g < kinds.length; g += 8) { reset(); play(8, 'note', { fx: 0 }); const ks = kinds.slice(g, g + 8);
  ks.forEach((k, i) => { const it = makeInsert(k, 7 + i), m = fxApply(music, it, it.ctl); d.msg({ t: 'fx', slot: i, kind: m.kind, p: m.p, mix: m.mix, to: i % 4 === 3 || i === ks.length - 1 ? -1 : i + 1 }); });
  const ms = time(800); line(`  8 modal + FX ${ks.join(',')}`, ms); if (ms > worst) { worst = ms; worstK = ks.join(','); } }
// worst case: 32 modal + 14 synth + 8 inserts
reset(); play(32, 'note', { fx: 0 }); play(14, 'inst', { fx: 0 }); kinds.slice(0, 8).forEach((k, i) => { const it = makeInsert(k, i), m = fxApply(music, it, it.ctl); d.msg({ t: 'fx', slot: i, kind: m.kind, p: m.p, mix: m.mix, to: i < 7 ? i + 1 : -1 }); });
const s = d.stats(); line(`WORST 32 modal + 14 synth + 8 inserts (act ${s.act}, iact ${s.iact}, fx ${s.fxOn})`, time());
// v0.0.7 spectral: worst case with 4 spectral inserts in the chain, and freeze holds the sound after the input stops
reset(); play(32, 'note', { fx: 0 }); play(14, 'inst', { fx: 0 }); for (let i = 0; i < 8; i++) { const k = i < 4 ? 'spc' : KINDS[i], it = makeInsert(k, i), m = fxApply(music, it, it.ctl); d.msg({ t: 'fx', slot: i, kind: m.kind, p: m.p, mix: m.mix, to: i < 7 ? i + 1 : -1 }); }
line('WORST + 4 spectral inserts (32 modal + 14 synth + 8 inserts)', time());
{ reset(); play(4, 'note', { fx: 0 }); const it = makeInsert('spc', 1); it.ctl.mix = 1; let m = fxApply(music, it, it.ctl); d.msg({ t: 'fx', slot: 0, kind: m.kind, p: m.p, mix: m.mix, to: -1 });
  for (let i = 0; i < 100; i++) d.render(L, R, 128); it.ctl.hold = 1; m = fxApply(music, it, it.ctl); d.msg({ t: 'fx', slot: 0, set: m.p }); for (let i = 0; i < 40; i++) d.render(L, R, 128);
  d.msg({ t: 'fx', slot: 1, off: 1 }); for (let i = 0; i < 4; i++) d.msg({ t: 'damp', src: 1, tau: .01 }); let e = 0, bad2 = 0; for (let i = 0; i < 300; i++) { d.render(L, R, 128); for (let j = 0; j < 128; j++) { e += L[j] * L[j]; if (!isFinite(L[j])) bad2++; } }
  out.push(`spectral freeze: energy held ${e.toFixed(3)} over 0.9 s after the input was damped, non-finite ${bad2}`); if (bad2 || !(e > 1e-4)) fails++; }
// sanity: loud strikes into the chain stay finite and under the ceiling
reset(); for (let i = 0; i < 32; i++) { const ms = voicesFor(rec, { f: 64 * (1 + i), vel: 1, pos: .9, dur: 1, src: 1, fx: -1 }, {}); for (const m of ms) { m.id = id++; d.msg(m); } }
let pk = 0, bad = 0; for (let i = 0; i < 600; i++) { d.render(L, R, 128); for (let j = 0; j < 128; j++) { if (!isFinite(L[j]) || !isFinite(R[j])) bad++; pk = Math.max(pk, Math.abs(L[j]), Math.abs(R[j])); } }
out.push(`32 loud strikes (modal + synth): peak ${pk.toFixed(3)}, non-finite samples ${bad}`); if (bad || pk > 1) fails++;
// scheduled message ('at') waits in the queue
reset(); d.msg({ t: 'note', id: 9999, at: 5, ...voicesFor(rec, { f: 200, vel: .8, pos: .3, dur: 1, src: 1, fx: -1 }, {})[0] }); d.render(L, R, 128); const q = d.stats(); out.push(`scheduled note queued: ${q.queued} (active ${q.act})`); if (q.queued !== 1 || q.act !== 0) fails++;
// v0.0.28 deaf muffle: 32 modal voices bypassed vs fully muffled (2-pole master low-pass, swept per sample); must stay under 0.02 ms/block extra
{ reset(); play(32, 'note'); d.msg({ t: 'param', k: 'muffle', v: 0 }); for (let i = 0; i < 100; i++) d.render(L, R, 128); const off = time(); d.msg({ t: 'param', k: 'muffle', v: 1 }); const on = time(); d.msg({ t: 'param', k: 'muffle', v: 0 }); for (let i = 0; i < 100; i++) d.render(L, R, 128);
  const extra = on - off; line('32 modal voices, deaf muffle ON', on); out.push(`  deaf muffle costs ${(extra * 1000).toFixed(1)} us/block (bypassed: 0)`); if (extra > .02) { fails++; out.push('  FAIL muffle cost'); } }
console.log(out.join('\n')); console.log(fails ? `FAIL ${fails}` : 'DSP_OK');
