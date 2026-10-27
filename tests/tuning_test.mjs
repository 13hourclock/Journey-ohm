// waveguide tuning test (generated tones only): every waveguide family (plucked string, bowed string, blown tube, reed) alone,
// several loop cutoffs, 55..2000 Hz; the measured pitch (autocorrelation, parabolic peak) must be within 3 cents of the note.
import { InstFactory } from '../www/js/dsp/inst.js';
import { instP, PALETTE } from '../www/js/instruments.js';
const SR = 48000; let fails = 0, worst = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const pitch = (x, f) => { const T = SR / f, lo = Math.floor(T * .9), hi = Math.ceil(T * 1.1) + 1, N = Math.min(x.length - hi - 1, 8192); const ac = l => { let s = 0, q = 0; for (let i = 0; i < N; i++) { s += x[i] * x[i + l]; q += x[i] * x[i] + x[i + l] * x[i + l]; } return 2 * s / (q || 1); };   // normalised (NSDF): a decaying tone does not bias the lag
  let bl = lo, bv = -1e30; const A = []; for (let l = lo - 1; l <= hi + 1; l++) A[l] = ac(l); for (let l = lo; l <= hi; l++) if (A[l] > bv) { bv = A[l]; bl = l; }
  const a = A[bl - 1], b = A[bl], c = A[bl + 1], d = (a - c) / (2 * (a - 2 * b + c)); if (bl <= lo || bl >= hi || bv < .5) return NaN; return SR / (bl + (isFinite(d) ? d : 0)); };   // no clear period (the tone has died away) -> not measured
const FAM = process.env.FAM ? [JSON.parse(process.env.FAM)] : [['plucked string', 'nylon_guitar'], ['bowed string', 'cello_bow'], ['flute (open loop)', 'bansuri', { noiseLP: .1 }], ['closed tube / reed', 'clarinet_tube'], ['reed', 'duduk'], ['bore', 'didgeridoo'], ['flute, full breath (info)', 'bansuri', {}, 8]];
for (const [name, id, px = {}, tol = 3] of FAM) { const rows = [], rg = (PALETTE.find(e => e.id === id) || {}).range_midi || [0, 200];   // notes outside the row's own playing range are info only (marked *)
  for (const damp of [.3, .5, .8]) for (const f of [55, 110, 220, 440, 880, 1320, 2000]) {
    const P = Object.assign({}, instP({ a: id, b: id, w: 0, s: 1 }), { modal: 0, osc: 0, form: 0, eng: [], noise: 0, nres: 0, lfoP: 0, penv: 0, trem: 0, uni: 0, damp, att: .005, sus: 1, dec: .1, rel: .1, smp: null }, px, process.env.PX ? JSON.parse(process.env.PX) : {});
    const I = InstFactory(SR, null); I.msg({ t: 'inst', id: 1, P, f, dur: 2, vel: .8, gain: .2, src: 1 });
    const n = Math.round(SR * .5), x = new Float32Array(n), L = new Float32Array(128), R = new Float32Array(128), W = new Float32Array(128); let k = 0;
    while (k < n) { L.fill(0); R.fill(0); I.render(L, R, W, 128); for (let i = 0; i < 128 && k < n; i++) x[k++] = L[i]; }
    const st = Math.round(Math.max(SR * .02, 6 * SR / f) + (/bow|tube|reed/.test(name) ? SR * .1 : 0)), seg = x.subarray(st, st + Math.round(Math.max(SR * .06, 12 * SR / f))); let e = 0; for (const v of seg) e += v * v;
    let e0 = 0; for (let i = 0; i < st; i++) e0 += x[i] * x[i];
    if (e / seg.length < 1e-10 || e / seg.length < 1e-4 * e0 / st) { rows.push(`${f}Hz/d${damp}:silent`); continue; }
    const c = 1200 * Math.log2(pitch(seg, f) / f); if (!isFinite(c)) { rows.push(`${f}:dead`); continue; } const m = 69 + 12 * Math.log2(f / 440), inR = m >= rg[0] - .5 && m <= rg[1] + .5; rows.push(`${f}${inR ? '' : '*'}:${c >= 0 ? '+' : ''}${c.toFixed(1)}`); if (!inR) continue;
    if (tol === 3) worst = Math.max(worst, Math.abs(c)); if (Math.abs(c) > tol) ok(false, `${name} cutoff ${damp} ${f} Hz: ${c.toFixed(1)} cents`); }
  console.log(`  ${name}: ${rows.join(' ')}`); }
ok(fails === 0, `every waveguide family within 3 cents at 55..2000 Hz inside each row's range (worst ${worst.toFixed(1)} cents)`);
console.log(fails ? `TUNING_FAIL ${fails}` : 'TUNING_OK'); process.exit(fails ? 1 : 0);
