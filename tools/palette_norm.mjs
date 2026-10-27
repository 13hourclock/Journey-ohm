// offline loudness evening for the instrument palette: renders one mid-range note of every landmark through the real worklet DSP
// (generated tones only, nothing recorded) and writes www/js/palette_norm.js (gain per row so all rows sit near one loudness).
// Also prints per-landmark cost of 14 voices (ms / 128-sample block) so heavy rows are visible. Run: node tools/palette_norm.mjs [--write]
import { writeFileSync } from 'fs';
import { DSPFactory } from '../www/js/dsp.js';
import { InstFactory } from '../www/js/dsp/inst.js';
import { FXFactory } from '../www/js/dsp/fx.js';
import { makeRecipe, voicesFor } from '../www/js/recipe.js';
import { PALETTE, setNorm, NORM } from '../www/js/instruments.js';
const SR = 48000, now = () => 0; now.perf = () => performance.now();
const L = new Float32Array(128), R = new Float32Array(128), budget = 128 / SR * 1000;
setNorm(Object.fromEntries(PALETTE.map(e => [e.id, 1])));
const res = {}; let bad = 0;
for (const e of PALETTE) { const d = DSPFactory(SR, now, InstFactory, FXFactory); d.P.ceiling = 10; d.P.master = .25; d.P.revMix = 0;
  const rec = makeRecipe(1, { add: false }); rec.inst = { a: e.id, b: e.id, w: 0, s: 1 }; const rm = e.range_midi || [48, 84], m = Math.round((rm[0] + rm[1]) / 2), f = 440 * Math.pow(2, (m - 69) / 12);
  const mix = rec.mix; const P0 = (e.modal || {}).mix || 0; rec.mix = { modal: e.part === 'voice' ? 0 : P0, synth: 1 };
  for (const v of voicesFor(rec, { f, vel: .7, pos: .35, dur: 1, src: 1, k: 0 }, {})) d.msg(Object.assign(v, { id: 1 }));
  let s2 = 0, n = 0, pk = 0, fin = true, best = 0; for (let b = 0; b < Math.round(1.5 * SR / 128); b++) { d.render(L, R, 128); for (let i = 0; i < 128; i++) { const x = L[i], y = R[i]; if (!isFinite(x) || !isFinite(y)) fin = false; s2 += x * x + y * y; n += 2; pk = Math.max(pk, Math.abs(x)); }
    if (n >= 2 * 4800) { best = Math.max(best, s2 / n); s2 = 0; n = 0; } }
  const rms = Math.sqrt(best) / Math.pow(10, Math.max(-18, Math.min(6, e.loud_db || 0)) / 20); /* level with the row's own loud_db divided out: the norm evens raw level, loud_db then sets the row's intended loudness */ /* loudest 100 ms window (a pluck is judged by its attack, a pad by its body) */ if (!fin || rms < 1e-5) bad++;
  // cost: 14 voices of this row (tract rows: 4)
  const d2 = DSPFactory(SR, now, InstFactory, FXFactory); const nv = e.part === 'voice' ? 4 : 14;
  for (let i = 0; i < nv; i++) for (const v of voicesFor(rec, { f: f * (1 + i % 5 * .25), vel: .8, dur: 20, sustain: 20, src: 1 + i, k: i }, {})) d2.msg(Object.assign(v, { id: 10 + i }));
  for (let i = 0; i < 30; i++) d2.render(L, R, 128); const t = performance.now(); for (let i = 0; i < 400; i++) d2.render(L, R, 128); const ms = (performance.now() - t) / 400;
  res[e.id] = { rms, pk, fin, pct: ms / budget * 100, nv }; rec.mix = mix; }
const rs = Object.values(res).map(r => r.rms).filter(x => x > 1e-5).sort((a, b) => a - b), med = rs[rs.length >> 1];
const norm = {}; for (const id in res) norm[id] = +Math.max(.1, Math.min(8, med / Math.max(1e-5, res[id].rms))).toFixed(3);
for (const id in res) console.log(id.padEnd(16), 'rms', res[id].rms.toFixed(4), 'norm', norm[id], `${res[id].nv}v`, res[id].pct.toFixed(1) + '%', res[id].fin ? '' : 'NONFINITE');
console.log(bad ? `PALETTE_BAD ${bad}` : 'PALETTE_OK');
if (process.argv.includes('--write')) writeFileSync(new URL('../www/js/palette_norm.js', import.meta.url), '// written by tools/palette_norm.mjs (offline loudness evening per palette row; generated tones only)\nexport const PALETTE_NORM = ' + JSON.stringify(norm) + ';\n');
process.exit(bad ? 1 : 0);
