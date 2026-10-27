// FRESH WORLD VARIETY (Wilbow 11:04 "everything still sounds like bells"): the first 12 ohms of a fresh world (sim.makeOhm seeds,
// spawn order) span many palette families, and the modal struck body is NOT the dominant voice: per ohm, energy of the palette
// instrument voice vs the modal 'note' voice, through the worklet DSP (generated tones only).
import { DSPFactory } from '../www/js/dsp.js';
import { InstFactory } from '../www/js/dsp/inst.js';
import { FXFactory } from '../www/js/dsp/fx.js';
import { makeRecipe, voicesFor } from '../www/js/recipe.js';
import { PALETTE } from '../www/js/instruments.js';
const SR = 48000, L = new Float32Array(128), R = new Float32Array(128); let T = 0; const now = () => T;
const energy = msgs => { const d = DSPFactory(SR, now, InstFactory, FXFactory); for (const m of msgs) d.msg(Object.assign({}, m, { id: 1, fx: -1, send: 0 })); let e = 0; for (let b = 0; b < Math.round(.8 * SR / 128); b++) { L.fill(0); R.fill(0); d.render(L, R, 128); for (let i = 0; i < 128; i++) e += L[i] * L[i] + R[i] * R[i]; } return e; };
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const fam = new Map(PALETTE.map(e => [e.id, e.family])), seeds = [];
let s = 12345; for (let i = 0; i < 12; i++) { s = (s * 1103515245 + 12345) >>> 0; seeds.push(s % 100000); }
const rows = [], fams = new Set(); let modalDom = 0, list = [];
for (const sd of seeds) { const rec = makeRecipe(sd); const r = rec.inst ? rec.inst.a : 'NONE'; rows.push(r); fams.add(fam.get(r));
  const ev = { f: 220, vel: .8, src: 1, dur: 1 }, all = voicesFor(rec, ev, {}), eM = energy(all.filter(m => m.t === 'note')), eI = energy(all.filter(m => m.t !== 'note')), sh = eM / (eM + eI + 1e-12);
  if (sh > .5) modalDom++; list.push(`${r}(${fam.get(r)}) modal ${(sh * 100).toFixed(0)}%`); }
console.log('  ' + list.join('\n  '));
ok(rows.every(r => r !== 'NONE'), 'every fresh ohm gets a palette instrument');
ok(new Set(rows).size >= 10, `12 fresh ohms -> ${new Set(rows).size} different rows`);
ok(fams.size >= 7, `12 fresh ohms span ${fams.size} families (${[...fams].join(', ')})`);
const bellish = rows.filter(r => /bell|bowl|gong|glock|vibra|saron|gender|steel_pan|marimba|balafon|crack_ring|ceramic/.test(r)).length;
ok(bellish <= 4, `bell / bar / metal rows: ${bellish}/12 (<= 4)`);
ok(modalDom <= 3, `modal struck body dominates in ${modalDom}/12 ohms (<= 3; bell rows may)`);
console.log(fails ? `VARIETY_FAIL ${fails}` : 'VARIETY_OK'); process.exit(fails ? 1 : 0);
