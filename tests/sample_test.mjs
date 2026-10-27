// v0.0.6 sampling: chop a GENERATED buffer (sine tones, never a recording) at note marks / beats, pitch-tag the slices, play them
// back through the inst sampler layer at other pitches, and time 16 sampled voices against the audio budget.
import { chop, detectPitch } from '../www/js/sing.js';
import { DSPFactory } from '../www/js/dsp.js';
import { InstFactory } from '../www/js/dsp/inst.js';
import { FXFactory } from '../www/js/dsp/fx.js';
import { makeRecipe, voicesFor } from '../www/js/recipe.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const SR = 48000, tones = [220, 330, 440], buf = new Float32Array(SR * 2), marks = [];
tones.forEach((f, i) => { const s0 = Math.round(SR * (.1 + i * .6)); marks.push(s0 + Math.round(SR * .05)); for (let j = 0; j < SR * .4; j++) buf[s0 + j] = .4 * Math.sin(2 * Math.PI * f * j / SR); });
const sl = chop(buf, SR, marks, {});
ok(sl.length === 3, `3 sung notes -> ${sl.length} slices`);
ok(sl.every((s, i) => Math.abs(s.hz / tones[i] - 1) < .03), `slices pitch-tagged ${sl.map(s => s.hz.toFixed(0)).join('/')} Hz`);
ok(sl.every(s => s.d.length < SR * .55 && Math.max(...s.d.map(Math.abs)) <= .81), 'each slice trimmed at the silence and normalised');
const sb = chop(buf, SR, [], { mode: 'beats', spb: .5 }); ok(sb.length >= 2 && sb.length <= 4, `chop every beat -> ${sb.length} slices (silent beats dropped)`);
const now = () => 0; now.perf = () => performance.now();
const d = DSPFactory(SR, now, InstFactory, FXFactory), L = new Float32Array(128), R = new Float32Array(128);
sl.forEach((s, i) => d.msg({ t: 'smpSet', id: 1000 + i, d: s.d, hz: s.hz }));
const rec = makeRecipe(4711, { name: 'your voice' }); rec.mix = { modal: 0, synth: 0 }; rec.sample = sl.map((s, i) => [1000 + i, s.hz]);
const ms = voicesFor(rec, { f: 300, vel: .8, pos: .3, dur: 2, src: 3, fx: -1 }, {}); const im = ms.find(m => m.P && m.P.smp);
ok(!!im, 'a voice recipe with samples makes a sampler voice');
let id = 1; im.id = id++; d.msg(im); let e = 0; const cap = new Float32Array(60 * 128); for (let b = 0; b < 60; b++) { d.render(L, R, 128); for (let i = 0; i < 128; i++) { e += L[i] * L[i]; cap[b * 128 + i] = L[i]; } }
const pr = detectPitch(cap.subarray(2048, 4096), SR), hz = pr && pr.hz ? pr.hz : pr || 0; ok(e > .01, `sampler sounds (energy ${e.toFixed(2)})`); ok(Math.abs(hz / 300 - 1) < .12, `played at the asked pitch: ~${hz.toFixed(0)} Hz for 300`);
d.msg({ t: 'all' }); for (let i = 0; i < 300; i++) d.render(L, R, 128);
for (let i = 0; i < 16; i++) for (const m of voicesFor(rec, { f: 150 + 40 * i, vel: .8, pos: .3, dur: 20, src: 3, fx: -1, sustain: 20 }, {})) { m.id = id++; d.msg(m); }
for (let i = 0; i < 50; i++) d.render(L, R, 128); const t = performance.now(); for (let i = 0; i < 1500; i++) d.render(L, R, 128); const blk = (performance.now() - t) / 1500;
console.log(`16 sampled voices: ${blk.toFixed(4)} ms/block = ${(blk / (128 / SR * 1000) * 100).toFixed(1)}% of budget`); ok(blk / (128 / SR * 1000) < .5, '16 sampled voices under half the audio budget');
console.log(fails ? 'SAMPLE_FAIL' : 'SAMPLE_OK');
