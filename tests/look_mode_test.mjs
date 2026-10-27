// look_mode_test: colours follow the SOUNDING scale (v0.0.29 jam keys: music.mode / modeHow / semi(), relative + parallel minor).
// Pure node (no browser): a fake music clock drives look/palette.js and look/kaleido.js through a key change with a pivot chord,
// a relative-minor journey and a parallel-minor journey. Checks: minor = cooler + deeper light with the SAME hues (relative minor
// keeps its major's hue), every change cross-fades over ~a bar in small steps (no jump), the palette rebuilds only a few times
// per change (palKey), mode:false = the old reading, cost per frame.
// node tests/look_mode_test.mjs
import { createPalette } from '../www/js/look/palette.js';
import { createKaleidoSound } from '../www/js/look/kaleido.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const SEMI = [0, 2, 4, 5, 7, 9, 11], SEMI_MINOR = [0, 2, 3, 5, 7, 8, 10], JI = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];
const mk = () => { const M = { key: 0, om: 64, mode: 'major', modeHow: null, chord: { root: 0, tones: [0, 2, 4] }, scale: { ratios: JI }, t: 0 };
  M.semi = () => (M.mode === 'minor' ? SEMI_MINOR : SEMI); M.beat = t => (t == null ? M.t : t) * 2; M.bar = t => M.beat(t) / 4; M.now = () => M.t;
  M.rel = () => { M.key = (M.key + 9) % 12; M.mode = 'minor'; M.modeHow = 'rel'; M.chord = { root: (M.chord.root + 2) % 7, tones: [0, 2, 4].map(x => x + (M.chord.root + 2) % 7) };
    M.scale = { ratios: JI.map((_, i) => { const j = (i + 5) % 7; return JI[j] / JI[5] * (j < 5 ? 2 : 1); }) }; };
  M.par = () => { M.mode = 'minor'; M.modeHow = 'par'; M.scale = { ratios: [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5] }; };
  M.maj = () => { if (M.modeHow === 'rel') { M.key = (M.key + 3) % 12; M.chord = { root: (M.chord.root + 5) % 7, tones: [] }; } M.mode = 'major'; M.modeHow = null; M.scale = { ratios: JI }; };
  return M; };
const lum = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2], avgLum = P => P.real.reduce((a, c) => a + lum(c), 0) / P.real.length;
const hd = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
// run the palette through frames at 60 fps from t0 for `beats` beats; returns trace of hue0 / kelvin / ver
const runP = (P, M, beats, mix = 0) => { const tr = []; const n = Math.round(beats / 2 * 60); for (let i = 0; i < n; i++) { M.t += 1 / 60; P.update({ t: M.t }, { mixed: mix }, M); tr.push({ h: P.hue0, k: P.kelvin, v: P.ver, m: P.minor, L: avgLum(P), b: M.beat() }); } return tr; };
const steps = tr => { let mx = 0, mk2 = 0; for (let i = 1; i < tr.length; i++) { mx = Math.max(mx, hd(tr[i].h, tr[i - 1].h)); mk2 = Math.max(mk2, Math.abs(tr[i].k - tr[i - 1].k)); } return { mx, mk: mk2 }; };
const done = tr => { const e = tr[tr.length - 1]; let i = tr.length - 1; while (i > 0 && hd(tr[i - 1].h, e.h) < 1e-6 && Math.abs(tr[i - 1].m - e.m) < 1e-9) i--; return tr[i].b - tr[0].b; };
// ---- palette ----
{ const M = mk(), P = createPalette(); M.chord = { root: 5, tones: [5, 7, 9] }; runP(P, M, 4); const maj = { h: P.hue0, k: P.kelvin, L: avgLum(P) };
  M.rel(); const tr = runP(P, M, 8), e = tr[tr.length - 1], st = steps(tr), vers = new Set(tr.map(x => x.v)).size, d = done(tr);
  ok(hd(e.h, maj.h) < .01, `relative minor (C major vi -> A minor i) keeps the major's hue: ${maj.h.toFixed(1)} -> ${e.h.toFixed(1)}`);
  ok(e.k > maj.k + 1500 && e.L < maj.L - 3, `minor reads as light: cooler ${maj.k | 0} K -> ${e.k | 0} K, deeper (material lum ${maj.L.toFixed(1)} -> ${e.L.toFixed(1)})`);
  ok(d > 3 && d < 5.5, `the change cross-fades over about a bar: ${d.toFixed(2)} beats`);
  ok(st.mk < 150, `a glide, no jump: biggest kelvin frame step ${st.mk | 0} K of ${(e.k - maj.k) | 0}`);
  ok(vers <= 12, `palette rebuilds (palKey bumps) over 8 beats with a mode change: ${vers - 1} (bars + ${P.fade.n} fade of 6 steps)`);
  M.maj(); const tr2 = runP(P, M, 8), e2 = tr2[tr2.length - 1]; ok(hd(e2.h, maj.h) < .01 && Math.abs(e2.k - maj.k) < 1, 'back to major: the same light as before the journey'); }
{ const M = mk(), P = createPalette(); runP(P, M, 4); const maj = { h: P.hue0, k: P.kelvin, L: avgLum(P) }; M.par(); const tr = runP(P, M, 8), e = tr[tr.length - 1];
  ok(hd(e.h, maj.h) < .01 && e.k > maj.k + 1500 && e.L < maj.L - 3, `parallel minor (same tonic): same hue, cooler ${maj.k | 0} -> ${e.k | 0} K, deeper ${maj.L.toFixed(1)} -> ${e.L.toFixed(1)}`); }
{ const M = mk(), P = createPalette(); M.chord = { root: 4, tones: [4, 6, 8] }; runP(P, M, 4); const h0 = P.hue0;   // pivot: C major V (G) becomes G major I
  M.t += .01; M.key = 7; M.chord = { root: 0, tones: [0, 2, 4] }; const tr = runP(P, M, 8), st = steps(tr), e = tr[tr.length - 1], d = done(tr);
  ok(st.mx < 2 && hd(e.h, h0) > 5, `key change through a pivot chord (C: V = G: I): hue ${h0.toFixed(1)} -> ${e.h.toFixed(1)} in frame steps of <= ${st.mx.toFixed(2)} deg over ${d.toFixed(2)} beats`);
  // a second change while the first still fades: starts from what shows, no jump
  M.key = 2; M.chord = { root: 4, tones: [] }; runP(P, M, 1); M.key = 9; const tr3 = runP(P, M, 8), s3 = steps(tr3); ok(s3.mx < 4, `a change during a fade starts from what shows (max step ${s3.mx.toFixed(1)} deg)`); }
{ const M = mk(), P = createPalette({ mode: false }); M.chord = { root: 5, tones: [] }; runP(P, M, 2); const h = P.hue0; M.rel(); runP(P, M, .1);
  ok(hd(P.hue0, h) > 20 && P.minor === 1, 'mode:false = the old reading (relative minor re-hues at once)'); }
{ const M = mk(), P = createPalette(); runP(P, M, 2); M.par(); const t0 = process.hrtime.bigint(); runP(P, M, 8); const us = Number(process.hrtime.bigint() - t0) / 1e3 / (8 / 2 * 60);
  ok(us < 20, `palette per frame through a fade: ${us.toFixed(2)} us`); }
// ---- kaleido ----
const hueRGB = c => { const [r, g, b] = c.map(x => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
const runK = (K, M, beats) => { const tr = []; const n = Math.round(beats / 2 * 60); for (let i = 0; i < n; i++) { M.t += 1 / 60; const o = K.step({ beat: M.beat(), t: M.t }); const c = o.cols[1]; tr.push({ h: hueRGB(c), L: lum(c), b: M.beat() }); } return tr; };
{ const M = mk(), K = createKaleidoSound({ music: M, bus: null }); M.chord = { root: 5, tones: [5, 7, 9] }; runK(K, M, 12); const a = runK(K, M, .2).pop();
  M.rel(); const tr = runK(K, M, 12), e = tr[tr.length - 1]; let mx = 0; for (let i = 1; i < tr.length; i++) mx = Math.max(mx, hd(tr[i].h, tr[i - 1].h));
  ok(e.L < a.L - 3, `kaleido: relative minor is deeper (lum ${a.L.toFixed(1)} -> ${e.L.toFixed(1)}), hue only leans cooler (${a.h.toFixed(0)} -> ${e.h.toFixed(0)} deg), max frame step ${mx.toFixed(2)} deg`);
  ok(mx < 4, 'kaleido: no colour jump on the mode change'); }
{ const M = mk(), K = createKaleidoSound({ music: M, bus: null }); M.chord = { root: 4, tones: [4, 6, 8] }; runK(K, M, 12);
  M.key = 7; M.chord = { root: 0, tones: [0, 2, 4] }; const tr = runK(K, M, 8); let mx = 0, last = 0; for (let i = 1; i < tr.length; i++) { const d = hd(tr[i].h, tr[i - 1].h); mx = Math.max(mx, d); if (d > .05) last = tr[i].b - tr[0].b; }
  ok(mx < 4 && last > 2.5, `kaleido: pivot key change cross-fades (max frame step ${mx.toFixed(2)} deg, moving for ${last.toFixed(2)} beats)`);
  const K2 = createKaleidoSound({ music: M, bus: null, opts: { mode: false } }); M.key = 0; runK(K2, M, 4); M.key = 7; const t2 = runK(K2, M, .1); ok(hd(t2[0].h, runK(K2, M, 0.04).pop().h) < 1, 'kaleido mode:false still runs'); }
console.log(fails ? `look_mode_test: ${fails} FAILED` : 'look_mode_test: all ok'); process.exit(fails ? 1 : 0);
