// v0.0.28 R5.5 / R2.10 deaf muffle: the gene gradient, the switch, and the worklet filter (offline DSP render).
import { DSPFactory } from '../www/js/dsp.js';
import { InstFactory } from '../www/js/dsp/inst.js';
import { FXFactory } from '../www/js/dsp/fx.js';
import { createSenses, deafness, SENSE_OPTS } from '../www/js/senses.js';
import { abilityGenes } from '../www/js/abilities.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// 1 gradient
ok(deafness(.5) === 0 && deafness(.25) === 0 && Math.abs(deafness(0) - .85) < 1e-9 && Math.abs(deafness(.125) - .425) < 1e-9, '1 deafness: none at hear >= .25, half at .125, .85 at 0');
{ let n = 0; for (let s = 1; s <= 4000; s++) if (deafness(abilityGenes(s * 7919).hear) > 0) n++; ok(Math.abs(n / 4000 - .25) < .03, `  about 1 ohm in 4 is partly deaf (${(n / 40).toFixed(0)}%)`); }
// 2 driving: muffle follows the driven ohm, sent once per change, switch off opens it
{ const sent = []; const audio = { setParam: (k, v) => sent.push([k, v]) }; const deaf = { id: 1, seed: 1 }, fine = { id: 2, seed: 2 };
  const gen = { 1: { hear: .05 }, 2: { hear: .8 } }; const sim = { ohm: deaf }; const S = createSenses({ sim, abilities: { genes: o => gen[o.id] }, audio });
  S.tick(); S.tick(); ok(sim.muffle && Math.abs(sim.muffle.amt - .68) < 1e-9, '  sim.muffle.amt published for the look signals (audiosig)'); ok(sent.length === 1 && sent[0][0] === 'muffle' && Math.abs(sent[0][1] - .68) < 1e-9, `2 driving a deaf ohm (hear .05): muffle ${sent[0] && sent[0][1].toFixed(2)}, sent once`);
  sim.ohm = fine; S.tick(); ok(sent.length === 2 && sent[1][1] === 0, '  switch to a hearing ohm: opens (0)');
  sim.ohm = deaf; S.tick(); S.opts.on = false; S.tick(); ok(sent.length === 4 && sent[3][1] === 0, '  switch off: opens');
  sim.ohm = null; S.opts.on = true; S.tick(); ok(S.muffle === 0, '  no driven ohm: none'); }
// 3 worklet filter: bit-exact bypass at 0, high frequencies cut when muffled, low ones kept, smooth ramp, back to bypass
{ const SR = 48000, now = () => 0; const mk = () => DSPFactory(SR, now, InstFactory, FXFactory);
  const run = (d, f, blocks, pre) => { const L = new Float32Array(128), R = new Float32Array(128); let e = 0, jump = 0, last = 0, t = 0;
    d.msg({ t: 'note', id: 1, modes: [{ f, d: 30, a: .3 }], gain: .5, hold: 1, send: 0, att: .001 });
    for (let b = 0; b < blocks; b++) { if (pre) pre(d, b); d.render(L, R, 128);
      for (let i = 0; i < 128; i++) { if (b > blocks / 2) e += L[i] * L[i]; if (b >= 30) jump = Math.max(jump, Math.abs(L[i] - last)); last = L[i]; } } return { rms: Math.sqrt(e / (blocks / 2 * 128)), jump }; };
  const a = mk(), b = mk(); b.msg({ t: 'param', k: 'muffle', v: 0 }); const A0 = run(a, 6000, 60), B0 = run(b, 6000, 60); ok(A0.rms === B0.rms, `3 muffle 0 is bit-exact bypass (rms ${A0.rms.toFixed(4)})`);
  const hi = mk(); hi.msg({ t: 'param', k: 'muffle', v: .85 }); const H = run(hi, 6000, 60); const lo = mk(); lo.msg({ t: 'param', k: 'muffle', v: .85 }); const Lw = run(lo, 150, 200); const L0 = run(mk(), 150, 200);
  ok(H.rms < A0.rms * .1 && Lw.rms > L0.rms * .9, `  muffle .85: 6 kHz down ${(20 * Math.log10(H.rms / A0.rms)).toFixed(1)} dB, 150 Hz ${(20 * Math.log10(Lw.rms / L0.rms)).toFixed(1)} dB`);
  const r = mk(); const R1 = run(r, 300, 120, (d, k) => { if (k === 30) d.msg({ t: 'param', k: 'muffle', v: 1 }); if (k === 80) d.msg({ t: 'param', k: 'muffle', v: 0 }); });
  const R0 = run(mk(), 300, 120); ok(R1.jump <= R0.jump * 1.01, `  ramps on and off with no click (largest sample step ${R1.jump.toFixed(5)} vs ${R0.jump.toFixed(5)} unmuffled)`); }
console.log(fails ? `SENSES FAIL (${fails})` : 'SENSES OK'); process.exit(fails ? 1 : 0);
