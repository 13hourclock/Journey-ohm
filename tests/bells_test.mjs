// v0.0.18 bells fix (Wilbow, Oct 25 11:43-11:46 MDT: "why are third of them still bells", "4/7 of mine sound like bells", "an issue in the old game too").
// Root cause (same as the old game's v0.8a9 membrane law): a shared modal body ring outweighing the instrument. In this engine it came back through
// resume (fromJSON kept a pre-palette save's modal-heavy mix), hatchlings (a parent's mix on a different row) and spiral widen (lowered synth level).
// Generated recipes only; no audio is recorded or analysed.
import { makeRecipe, toJSON, fromJSON, recipes } from '../www/js/recipe.js';
import { PALETTE } from '../www/js/palette_data.js';
import { breedRecipe } from '../www/js/teach.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const rowMix = rec => { const f = makeRecipe(1, { add: false }); f.inst = JSON.parse(JSON.stringify(rec.inst)); delete f.mixRow; const j = toJSON(f); return fromJSON(j).mix; };
const modalOf = id => { const e = PALETTE.find(x => x.id === id); return e && !e.tract ? ((e.modal || {}).mix || 0) : 0; };
// 1. an OLD-FORMAT save (v0.0.15 era: no instrument, modal-dominant mix, inharmonic body) resumes as its row, not a bell
let heavy = 0, n = 0;
for (let s = 1; s <= 120; s++) { const o = toJSON(makeRecipe(s * 7919, { add: false })); delete o.inst; delete o.mixRow; o.mix = { modal: .9, synth: .4 }; o.modal.p.inharm = .3;
  const r = fromJSON(o); n++; ok(r.inst && PALETTE.some(e => e.id === r.inst.a), 'old save gets a palette row ' + s); ok(r.mixRow === r.inst.a, 'old save mix re-made for its row ' + s);
  ok(r.mix.synth === 1, 'old save synth level is the row\'s ' + s); const want = Math.max(modalOf(r.inst.a), modalOf(r.inst.b)); ok(r.mix.modal <= want + 1e-9, `old save modal ${r.mix.modal.toFixed(2)} <= row ${want} (${r.inst.a}) ${s}`);
  if (r.mix.modal > .5) heavy++; recipes.delete(r.id); }
console.log(`old-format resume: ${heavy}/${n} ohms modal-heavy (was ~99% before the fix)`); ok(heavy / n < .35, 'old saves no longer modal-heavy');
// 2. a same-version save round-trips unchanged (no drift on every resume)
for (let s = 1; s <= 40; s++) { const a = makeRecipe(s * 104729, { add: false }), b = fromJSON(toJSON(a)); ok(JSON.stringify(a.mix) === JSON.stringify(b.mix) && a.inst.a === b.inst.a, 'round trip ' + s); recipes.delete(b.id); }
// 3. a hatchling's modal body + mix follow ITS row, not a parent's
for (let s = 1; s <= 60; s++) { const A = makeRecipe(s * 31 + 1, { add: false }), B = makeRecipe(s * 977 + 5, { add: false }); const c = fromJSON(breedRecipe(A, B, s * 13 + 3));
  ok(c.mixRow === c.inst.a && c.mix.synth === 1, 'hatchling mix made for its row ' + s); ok(Math.abs(c.mix.modal - rowMix(c).modal) < 1e-9, 'hatchling modal = its row ' + s); recipes.delete(c.id); }
// 4. a non-struck row's blend never carries more modal ring than its struck partner's squared weight
for (let s = 1; s <= 300; s++) { const r = makeRecipe(s * 6007, { add: false }), w = r.inst.a === r.inst.b ? 0 : r.inst.w; const cap = modalOf(r.inst.a) * (1 - w) ** 2 + modalOf(r.inst.b) * w * w; ok(r.mix.modal <= cap + 1e-9, 'blend modal energy-weighted ' + s); }
// 5. MT 12:09: a plucked body rings at its own fixed Hz (oud/guitar 100-250, kora gourd 150-300) at ANY note; struck + bell rows weigh x.6 (not santur)
{ const { withRow, voicesFor, BODY_BAND } = await import('../www/js/recipe.js'); const { placeWeight } = await import('../www/js/instruments.js');
  for (const id of ['oud', 'nylon_guitar', 'kora']) for (const s of [3, 77, 901]) { const rec = withRow(makeRecipe(s * 4441, { add: false }), id); rec.synth.family = 'auto';
    for (const f of [110, 440, 1320]) { const m = voicesFor(rec, { f, vel: .8, dur: 1, src: 1 }, {}).find(v => v.t === 'note'); if (!m) continue; const [lo, hi] = BODY_BAND[id];
      ok(m.modes.every(x => x.f >= lo && x.f <= hi), `${id} body modes in ${lo}-${hi} Hz at a ${f} Hz note`); ok(m.modes.every(x => x.d < .5), `${id} body is a short thump`); } }
  const W = id => placeWeight(PALETTE.find(e => e.id === id), { trad: {}, ground: {} });
  // Wilbow 12:37 PM MDT Oct 25: "Even distribution of instruments.  Equal chance of spawn.  In the final game" -> every instrument weighs 1
  for (const e of PALETTE) ok(W(e.id) === 1, e.id + ' weight 1 (equal chance)');
  ok(placeWeight(PALETTE.find(e => e.id === 'gong'), { trad: { gamelan: 1 }, ground: {} }) > 1.5, 'gamelan places still lean to the gong (placeLean on by default)');
  { const { IOPTS } = await import('../www/js/instruments.js'); ok(IOPTS.placeLean === true, 'place lean is on by default (Wilbow 1:14 PM "A: keep the place lean")'); IOPTS.placeLean = false;
    ok(PALETTE.every(e => placeWeight(e, { trad: { gamelan: 1 }, ground: { ice: 1, cloud: 1 } }) === 1), 'placeLean off: every row weighs 1 (flat 1-in-' + PALETTE.length + ') even at a leaning place'); IOPTS.placeLean = true; } }
console.log(fail ? `BELLS_FAIL ${fail}` : 'BELLS_OK'); process.exit(fail ? 1 : 0);
