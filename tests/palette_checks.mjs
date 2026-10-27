// INSTRUMENT_PALETTE.md section 9: the automatable review checks (generated tones only, one note at a time, no effects).
// Hard gates are marked FAIL; checks that measure something not yet built are reported as INFO with the number.
import { InstFactory } from '../www/js/dsp/inst.js';
import { PALETTE, instP, blendP, placeFor, rowP, setPlace, resetRecent, IOPTS } from '../www/js/instruments.js';
import { makeRecipe, voicesFor } from '../www/js/recipe.js';
import { DSPFactory } from '../www/js/dsp.js';
import { FXFactory } from '../www/js/dsp/fx.js';
const SR = 48000; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; }, info = m => console.log('INFO ' + m);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null, on = k => !ONLY || ONLY.includes(k);
const hz = m => 440 * Math.pow(2, (m - 69) / 12), byId = id => PALETTE.find(e => e.id === id);
function play(P, f, sec = .5, msg = {}) { const I = InstFactory(SR, null); I.msg(Object.assign({ t: 'inst', id: 1, P, f, dur: sec, vel: .8, gain: .2, src: 1 }, msg)); const n = Math.round(SR * sec), x = new Float32Array(n), L = new Float32Array(128), R = new Float32Array(128), W = new Float32Array(128); let k = 0;
  while (k < n) { L.fill(0); R.fill(0); I.render(L, R, W, 128); for (let i = 0; i < 128 && k < n; i++) x[k++] = L[i]; } return x; }
const P0 = id => instP({ a: id, b: id, w: 0, s: 1 });
const pitch = (x, f) => { const T = SR / f, lo = Math.floor(T * .85), hi = Math.ceil(T * 1.15) + 1, N = Math.min(x.length - hi - 1, 8192); if (N < T * 3) return NaN; const ac = l => { let s = 0, q = 0; for (let i = 0; i < N; i++) { s += x[i] * x[i + l]; q += x[i] * x[i] + x[i + l] * x[i + l]; } return 2 * s / (q || 1); };
  const A = []; let bl = lo, bv = -1e9; for (let l = lo - 1; l <= hi + 1; l++) A[l] = ac(l); for (let l = lo; l <= hi; l++) if (A[l] > bv) { bv = A[l]; bl = l; } if (bl <= lo || bl >= hi || bv < .5) return NaN; const a = A[bl - 1], b = A[bl], c = A[bl + 1], d = (a - c) / (2 * (a - 2 * b + c)); return SR / (bl + (isFinite(d) ? d : 0)); };
// inharmonic rows (bars, bells, membranes, FM / ring): the partial that sits on the note (pitch_ratio), by a Hann-windowed spectral peak within +-150 c
const peak = (x, f) => { const N = x.length, w = i => .5 - .5 * Math.cos(2 * Math.PI * i / N), mag = fq => { let re = 0, im = 0; const k = 2 * Math.PI * fq / SR; for (let i = 0; i < N; i++) { const v = x[i] * w(i); re += v * Math.cos(k * i); im += v * Math.sin(k * i); } return Math.hypot(re, im); };
  let bc = 0, bm = -1; const M = {}; for (let c = -150; c <= 150; c += 3) { const m = M[c] = mag(f * Math.pow(2, c / 1200)); if (m > bm) { bm = m; bc = c; } } if (bc <= -150 || bc >= 150) return NaN;
  const a = M[bc - 3], b = bm, d = M[bc + 3], o = (a - d) / (2 * (a - 2 * b + d)); return f * Math.pow(2, (bc + (isFinite(o) ? o * 3 : 0)) / 1200); };
// below 200 Hz (MT 11:33): YIN (harmonic rows) or a long Hann-windowed DFT peak with parabolic interpolation on LOG magnitude (Gaussian
// peak: ~unbiased, 1 c grid) for inharmonic / osc rows; tolerance sustained +-5 c, percussive +-15 c (never looser than the row's own)
const yin = (x, f) => { const T = SR / f, lo = Math.max(2, Math.floor(T * .8)), hi = Math.ceil(T * 1.25) + 2, N = Math.min(x.length - hi - 2, Math.round(SR * .5)); if (N < T * 4) return NaN;
  const d = l => { let s = 0; for (let i = 0; i < N; i++) { const v = x[i] - x[i + l]; s += v * v; } return s; }, D = [], C = []; let run = 0; for (let l = 1; l <= hi + 1; l++) { D[l] = d(l); run += D[l]; C[l] = D[l] * l / (run || 1); }
  let bl = -1; for (let l = lo; l <= hi; l++) if (C[l] < .15 && C[l] <= C[l - 1] && C[l] <= C[l + 1]) { bl = l; break; } if (bl < 0) { let bv = 1e9; for (let l = lo; l <= hi; l++) if (C[l] < bv) { bv = C[l]; bl = l; } if (bv > .5) return NaN; }
  const a = C[bl - 1], b = C[bl], c = C[bl + 1], o = (a - c) / (2 * (a - 2 * b + c)); return SR / (bl + (isFinite(o) ? o : 0)); };
const peakLong = (x, f) => { const N = x.length, k0 = 2 * Math.PI / SR, mag = fq => { let re = 0, im = 0; const k = k0 * fq; for (let i = 0; i < N; i++) { const v = x[i] * (.5 - .5 * Math.cos(2 * Math.PI * i / N)); re += v * Math.cos(k * i); im += v * Math.sin(k * i); } return Math.hypot(re, im); };
  let bc = 0, bm = -1; for (let c = -150; c <= 150; c += 6) { const m = mag(f * Math.pow(2, c / 1200)); if (m > bm) { bm = m; bc = c; } } if (bc <= -150 || bc >= 150) return NaN;
  const M = {}; let fc = bc; bm = -1; for (let c = bc - 6; c <= bc + 6; c++) { M[c] = mag(f * Math.pow(2, c / 1200)); if (M[c] > bm) { bm = M[c]; fc = c; } } if (M[fc - 1] == null || M[fc + 1] == null) return f * Math.pow(2, fc / 1200);
  const a = Math.log(M[fc - 1] + 1e-12), b = Math.log(bm + 1e-12), d = Math.log(M[fc + 1] + 1e-12), o = (a - d) / (2 * (a - 2 * b + d)); return f * Math.pow(2, (fc + (isFinite(o) ? o : 0)) / 1200); };
const sustained = e => ((e.env || {}).sus || 0) >= .3;
const LOW = [];
const inharm = e => e.part === 'modal' || (e.pitch_ratio || 1) !== 1 || /FM|RING/.test((e.engine || {}).kind || '');
const rms = x => { let e = 0; for (const v of x) e += v * v; return Math.sqrt(e / x.length); };
const centroid = x => { const N = 2048, s = Math.floor(SR * .06); let num = 0, den = 0; for (let k = 1; k < N / 2; k += 2) { let re = 0, im = 0; for (let i = 0; i < N; i++) { const w = .5 - .5 * Math.cos(2 * Math.PI * i / N), v = (x[s + i] || 0) * w; re += v * Math.cos(2 * Math.PI * k * i / N); im -= v * Math.sin(2 * Math.PI * k * i / N); } const m = Math.hypot(re, im); num += m * k * SR / N; den += m; } return num / (den || 1); };
const envT = x => { let pk = 0, pi = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk) { pk = Math.abs(x[i]); pi = i; } let j = pi; while (j < x.length && Math.abs(x[j]) > pk * .1) j += 64; return { att: pi / SR, dec: (j - pi) / SR }; };
const pitched = e => e.tune_tol_cents != null && e.family !== 'texture' && !/kick|snare|clap|shaker|hat|clave|rattle|rumble|crackle/.test(e.id);
// 1. JSON
if (on(1)) { const ids = PALETTE.map(e => e.id), dup = ids.filter((v, i) => ids.indexOf(v) !== i), miss = PALETTE.flatMap(e => (e.distinct_from || []).filter(d => !ids.includes(d)).map(d => e.id + '->' + d)); let nan = 0; for (const e of PALETTE) { const P = rowP(e); for (const k in P) if (typeof P[k] === 'number' && !isFinite(P[k])) nan++; }
  ok(!dup.length && !miss.length && !nan, `1 JSON: ${PALETTE.length} rows, unique ids ${dup.join(',')}, distinct_from resolves ${miss.join(',')}, every derived value finite`); }
// 2 + 3. pitch per row at lo+5 / middle / hi-5 after 50 ms, within tune_tol_cents (3: same with the exact-sine floor off for string/tube/blow rows)
for (const [k, osc0] of [[2, false], [3, true]]) { if (!on(k)) continue; const bad = [], dead = []; let n = 0;
  for (const e of PALETTE) { if (!pitched(e) || e.part === 'voice' || (osc0 && !['string', 'bow', 'tube', 'blow'].includes(e.part))) continue; const rg = e.range_midi || [48, 84], pr = e.pitch_ratio || 1;
    for (const m of [rg[0] + 5, (rg[0] + rg[1]) / 2, rg[1] - 5]) { const f = hz(m); if (f > 2600) continue; let P = P0(e.id); if (osc0) P = Object.assign({}, P, { osc: 0 }); P = Object.assign({}, P, { lfoP: 0, lfoA: 0, trem: 0, noise: 0, detHz: 0, det: 1 }); /* ombak + unison chorus off: tuning, not the beat (check 8) */ const sk = (P.penv ? P.ptime * 4 : 0) + (P.glT || 0), x = play(P, f, .4 + sk), s = Math.round(SR * (.05 + sk)), seg = x.subarray(s, s + Math.round(Math.max(SR * .08, 14 * SR / f)));
      const spec = inharm(e) || e.modal || e.part === 'osc' || (byId(e.id).engine || {}).add_spread > .05, low = f < 200, xl = low ? play(P, f, 2 + sk) : x, sl = low ? Math.round(SR * ((sustained(e) ? .6 : .3) + sk)) : s;   /* past the onset (sustained .6 s, percussive .3 s): the attack swell / decaying FM index biases a spectral peak */
      const fm = low ? (spec ? peakLong(xl.subarray(sl, sl + Math.round(SR * 1.2)), f) : yin(xl.subarray(sl), f)) : spec ? peak(x.subarray(s, s + Math.round(SR * .3)), f) : pitch(seg, f);   /* the partial on the note, by spectral peak (AC is fooled by stretched / sideband partials); below 200 Hz: YIN / long DFT */ n++; if (!isFinite(fm)) { dead.push(`${e.id}@${f.toFixed(0)}`); continue; } const c = 1200 * Math.log2(fm / f), rt = e.tune_tol_cents || 10, tl = low ? Math.min(rt, sustained(e) ? 5 : 15) : rt; if (low && !osc0) LOW.push(`${e.id}@${f.toFixed(0)}:${c.toFixed(1)}`); if (Math.abs(c) > tl) bad.push(`${e.id}@${f.toFixed(0)}:${c.toFixed(0)}c`); } }
  if (!osc0 && process.env.LOWDBG) info('below 200 Hz: ' + LOW.join(' '));
  (osc0 ? info : m => ok(bad.length <= 3, m))(`${k} pitch${osc0 ? ' (osc floor off)' : ''}: ${n - bad.length - dead.length}/${n} notes within row tolerance; off: ${bad.join(' ') || 'none'}; no clear period (inharmonic/noisy at that note): ${dead.length}`); }
// 4. distinctness: centroid >= 15% or attack / decay 2x apart, same note
if (on(4)) { const seen = new Set(), bad = []; let n = 0; const C = {};
  const feat = id => C[id] || (C[id] = (() => { const x = play(P0(id), 220, 1.2); return Object.assign({ c: centroid(x) }, envT(x)); })());
  for (const e of PALETTE) for (const d of e.distinct_from || []) { const key = [e.id, d].sort().join('|'); if (seen.has(key) || !byId(d)) continue; seen.add(key); n++; const A = feat(e.id), B = feat(d);
    const okk = Math.abs(A.c - B.c) / Math.min(A.c, B.c) >= .15 || Math.max(A.att, B.att) / Math.max(1e-3, Math.min(A.att, B.att)) >= 2 || Math.max(A.dec, B.dec) / Math.max(1e-3, Math.min(A.dec, B.dec)) >= 2; if (!okk) bad.push(key); }
  ok(bad.length <= Math.ceil(n * .1), `4 distinctness: ${n - bad.length}/${n} distinct_from pairs differ (centroid 15% / attack 2x / decay 2x); close: ${bad.join(' ') || 'none'}`); }
// 5. spread over 200 hatched ohms
if (on(5)) { setPlace({}); resetRecent(); const c = {}, fam = new Set(); for (let i = 0; i < 200; i++) { const r = makeRecipe(1 + i * 7919, { add: false }); c[r.inst.a] = (c[r.inst.a] || 0) + 1; fam.add(byId(r.inst.a).family); }
  const top = Math.max(...Object.values(c)) / 200, allF = new Set(PALETTE.map(e => e.family));
  ok(top <= .12 && fam.size === allF.size, `5 spread: 200 ohms -> ${Object.keys(c).length} rows, top row ${(top * 100).toFixed(1)}% (<= 12%), families ${fam.size}/${allF.size}`); }
// 6. traditions: at a spot with share 1, its top-5 rows >= 2x as often as neutral, >= 25% from rows without that tradition
if (on(6)) { const trads = [...new Set(PALETTE.flatMap(e => Object.keys(e.trad || {})))], bad = [];
  const draw = pl => { setPlace(pl); const c = {}; for (let i = 0; i < 400; i++) { const r = makeRecipe(1 + i * 7919, { add: false }); c[r.inst.a] = (c[r.inst.a] || 0) + 1; } setPlace({}); return c; }; const neu = draw({});
  for (const t of trads) { const top = PALETTE.filter(e => (e.trad || {})[t]).sort((a, b) => b.trad[t] - a.trad[t]).slice(0, 5).map(e => e.id), c = draw({ trad: { [t]: 1 } }), s = ids => ids.reduce((a, id) => a + (c[id] || 0), 0), s0 = ids => ids.reduce((a, id) => a + (neu[id] || 0), 0);
    const ratio = s(top) / Math.max(1, s0(top)), outside = PALETTE.filter(e => !(e.trad || {})[t]).reduce((a, e) => a + (c[e.id] || 0), 0) / 400; if (ratio < 2 || outside < .25) bad.push(`${t}(${ratio.toFixed(1)}x, ${(outside * 100).toFixed(0)}% other)`); }
  ok(bad.length <= Math.ceil(trads.length * .15), `6 traditions: ${trads.length - bad.length}/${trads.length} traditions lean 2x+ and keep 25%+ other rows; short: ${bad.join(' ') || 'none'}`); }
// 8. gamelan ombak: two detuned saron voices beat at 5-7 Hz at both ends of the range (one saron voice with its Hz beat)
if (on(8)) { const e = byId('saron'), rg = e.range_midi || [60, 84], res = []; for (const m of [rg[0] + 2, rg[1] - 2]) { const P = Object.assign({}, P0('saron'), { mdec: 3 }), x = play(P, hz(m), 1.2), env = [], H = 240; for (let i = Math.round(SR * .1); i + H < x.length; i += H) { let e2 = 0; for (let j = 0; j < H; j++) e2 += x[i + j] * x[i + j]; env.push(Math.sqrt(e2 / H)); }
    const lg = env.map(v => Math.log(v + 1e-9)), N = lg.length, xm = (N - 1) / 2, ym = lg.reduce((a, b) => a + b, 0) / N; let sxy = 0, sxx = 0; lg.forEach((y, i) => { sxy += (i - xm) * (y - ym); sxx += (i - xm) ** 2; }); const sl = sxy / sxx; env.forEach((v, i) => { env[i] = lg[i] - ym - sl * (i - xm); }); /* log envelope minus its decay line */ const mu = 0; let best = 0, bh = 0; for (let b = 3; b <= 12; b += .25) { let re = 0, im = 0; env.forEach((v, i) => { const t = i * H / SR; re += (v - mu) * Math.cos(2 * Math.PI * b * t); im += (v - mu) * Math.sin(2 * Math.PI * b * t); }); const m2 = Math.hypot(re, im); if (m2 > best) { best = m2; bh = b; } } res.push(bh); }
  ok(res.every(b => b >= 5 && b <= 7), `8 gamelan ombak: saron beats at ${res.map(b => b.toFixed(2) + ' Hz').join(' / ')} (low / high end)`); }
// 9. loudness: loudest-100 ms RMS at vel .8 (row mid-range, full voice path incl. its modal layer) within 3 dB of loud_db relative to harp_pluck
if (on(9)) { const Lb = new Float32Array(128), Rb = new Float32Array(128), now = () => 0; now.perf = () => 0;
  const lv = id => { const e = byId(id), d = DSPFactory(SR, now, InstFactory, FXFactory); d.P.ceiling = 10; d.P.master = .25; d.P.revMix = 0; const rec = makeRecipe(1, { add: false }); rec.inst = { a: id, b: id, w: 0, s: 1 }; rec.mix = { modal: e.part === 'voice' ? 0 : (e.modal || {}).mix || 0, synth: 1 };
    const rm = e.range_midi || [48, 84]; for (const v of voicesFor(rec, { f: hz(Math.round((rm[0] + rm[1]) / 2)), vel: .8, pos: .35, dur: 1, src: 1, k: 0 }, {})) d.msg(Object.assign(v, { id: 1 }));
    let s2 = 0, n = 0, best = 0; for (let b = 0; b < Math.round(1.5 * SR / 128); b++) { d.render(Lb, Rb, 128); for (let i = 0; i < 128; i++) { s2 += Lb[i] * Lb[i] + Rb[i] * Rb[i]; n += 2; } if (n >= 9600) { best = Math.max(best, s2 / n); s2 = 0; n = 0; } } return 10 * Math.log10(best + 1e-20); };
  const ref = lv('harp_pluck') - (byId('harp_pluck').loud_db || 0), bad = [];
  for (const e of PALETTE) { if (e.use || e.source === 'sample') continue; const d = lv(e.id) - ref - (e.loud_db || 0); if (Math.abs(d) > 3) bad.push(`${e.id}:${d > 0 ? '+' : ''}${d.toFixed(1)}`); }
  ok(bad.length <= 7, `9 loudness vs harp_pluck: ${PALETTE.length - bad.length}/${PALETTE.length} rows within 3 dB of loud_db; off: ${bad.join(' ') || 'none'}`); }
// 11. clay firing: ceramic_bell -> bronze_bell blend moves monotonically (decay rises, damp falls)
if (on(11)) { const A = P0('ceramic_bell'), B = P0('bronze_bell'), ws = [0, .25, .5, .75, 1], ps = ws.map(w => blendP(A, B, w)); let mono = true; for (let i = 1; i < ps.length; i++) { if (ps[i].mdec < ps[i - 1].mdec - 1e-9 || ps[i].modalDamp > ps[i - 1].modalDamp + 1e-9) mono = false; }
  ok(mono, `11 clay firing: decay ${ps.map(p => p.mdec.toFixed(2)).join('>')}, damp ${ps.map(p => p.modalDamp.toFixed(2)).join('>')}`); }
// 12. learning: a learned row at full strength (capped blend) leaves the ohm nearest its own row
if (on(12)) { let kept = 0; const n = 30; for (let i = 0; i < n; i++) { const r = makeRecipe(50 + i * 104729, { add: false }), own = instP(r.inst), other = PALETTE[(i * 17) % PALETTE.length].id; const L = blendP(own, P0(other), IOPTS.learnMax || .35);
    const d = (p, q) => Math.abs(Math.log(p.cut / q.cut)) + Math.abs(Math.log(p.dec / q.dec)) + Math.abs(Math.log(p.att / q.att)) + Math.abs(p.sus - q.sus); if (d(L, own) <= d(L, P0(other))) kept++; }
  ok(kept === n, `12 learning: after full learning ${kept}/${n} ohms still sit nearer their own tone`); }
// 13. latency: first non-silent sample within att_s + 1 ms
if (on(13)) { const bad = []; for (const e of PALETTE) { const P = P0(e.id), x = play(P, 220, .3), lim = Math.round(SR * (P.att + .001)) + 128; let i = 0; while (i < x.length && Math.abs(x[i]) < 1e-5) i++; if (i > lim) bad.push(`${e.id}:${(i / SR * 1000).toFixed(0)}ms`); }
  ok(!bad.length, `13 latency: every row sounds within att + 1 ms (+1 block) ${bad.join(' ')}`); }
// 15. samples: a sung slice (generated tone standing in for a voice) played at 3 notes lands within 15 cents
if (on(15)) { const sl = new Float32Array(SR); for (let i = 0; i < SR; i++) sl[i] = Math.sin(2 * Math.PI * 220 * i / SR) * .5 + Math.sin(4 * Math.PI * 220 * i / SR) * .2; const res = [];
  for (const f of [165, 220, 330]) { const I = InstFactory(SR, null); I.msg({ t: 'smpSet', id: 'test_slice', d: sl, hz: 220 }); I.msg({ t: 'inst', id: 1, P: P0('sample_chop'), f, dur: .5, vel: .8, gain: .2, src: 1 }); const n = Math.round(SR * .4), x = new Float32Array(n), L = new Float32Array(128), R = new Float32Array(128), W = new Float32Array(128); let k = 0; while (k < n) { L.fill(0); R.fill(0); I.render(L, R, W, 128); for (let i = 0; i < 128 && k < n; i++) x[k++] = L[i]; }
    const fm = pitch(x.subarray(Math.round(SR * .1), Math.round(SR * .3)), f); res.push(1200 * Math.log2(fm / f)); }
  ok(res.every(c => Math.abs(c) <= 15), `15 samples: sung slice at 165/220/330 Hz -> ${res.map(c => isFinite(c) ? c.toFixed(1) + 'c' : 'none').join(' ')}`); }
info('10 cost (palette calls per frame) + 14 voice budget are covered by instruments_test (cached choices, worst-case DSP) and dsp_bench');
console.log(fails ? `PALETTE_CHECKS_FAIL ${fails}` : 'PALETTE_CHECKS_OK'); process.exit(fails ? 1 : 0);
