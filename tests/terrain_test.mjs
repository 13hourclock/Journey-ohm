// v0.0.12 terrain: styles, features, water, regions blend with no borders, leanings are continuous, the place vote is one quiet voice.
import { makeTerrain, MODES, STYLES } from '../www/js/terrain.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const L = { hue: 140, rough: .5 }, lead = {}, P = {}, v = new Float32Array(12);
let wetSeas = 0, dryWater = 0, maxJump = 0, maxBJ = 0, lmTypes = new Set(), craterPl = 0, rbCorr = [], periodic = 0;
for (let s = 1; s <= 300; s++) {
  const C = 4 + (s % 6), T = makeTerrain(s * 2654435761 >>> 0, L, C), T2 = makeTerrain(s * 2654435761 >>> 0, L, C);
  lead[T.lead] = (lead[T.lead] || 0) + 1; if (T.wet > .6 && T.wl > -1e8) wetSeas++; if (T.wet <= .14 && T.wl > -1e8) dryWater++;
  if (T.craters.length) craterPl++; for (const R of T.regions) if (R.lm) lmTypes.add(R.lm.type);
  T.at(1.234, P); const b1 = P.bright; T2.at(1.234, P); if (P.bright !== b1) ok(false, 'deterministic ' + s);
  let pb = null, pw = null; const N = C * 200;
  for (let i = 0; i <= N; i++) { const u = i / 200; T.at(u, P); if (pb != null) { maxBJ = Math.max(maxBJ, Math.abs(P.bright - pb)); maxJump = Math.max(maxJump, Math.abs(P.hard - pw)); } pb = P.bright; pw = P.hard; rbCorr.push([P.rough, P.bright]); }
  T.at(.3, P); const a = P.bright; T.at(.3 + C, P); if (Math.abs(a - P.bright) < 1e-9) periodic++;
  T.at(.7, P); T.vote(P, v); const sum = v.reduce((x, y) => x + y, 0); if (!(sum > 0)) ok(false, 'vote non-empty ' + s);
}
ok(STYLES.every(k => lead[k] > 40), 'all four styles lead some planets ' + JSON.stringify(lead));
{ let mixed = 0, top = 0; for (let s = 1; s <= 300; s++) { const w = Object.values(makeTerrain(s * 7919, L, 6).style).sort((a, b) => b - a); top += w[0]; if (w[0] < .55 && w[1] > .2) mixed++; }
  ok(mixed > 90 && top / 300 < .62, `v0.0.13 styles are one continuous blend (${mixed}/300 clearly mixed, mean top weight ${(top / 300).toFixed(2)})`); }
ok(wetSeas > 30 && dryWater === 0, `seas on wet planets (${wetSeas}), no water on dry ones`);
ok(craterPl > 30 && craterPl < 280, `craters are rare-ish: on ${craterPl}/300 planets`);
ok(lmTypes.size === 4, 'landmark kinds ' + [...lmTypes].join(','));
ok(maxBJ < .03 && maxJump < .03, `regions blend with no borders (max step brightness ${maxBJ.toFixed(4)}, hardness ${maxJump.toFixed(4)} per 1/200 width)`);
ok(periodic === 300, 'the place is periodic around the planet');
// rough -> darker, as a continuous weight (correlation, not a category)
const n = rbCorr.length, mx = rbCorr.reduce((a, p) => a + p[0], 0) / n, my = rbCorr.reduce((a, p) => a + p[1], 0) / n;
let cxy = 0, cx = 0, cy = 0; for (const [x, y] of rbCorr) { cxy += (x - mx) * (y - my); cx += (x - mx) ** 2; cy += (y - my) ** 2; }
const corr = cxy / Math.sqrt(cx * cy); ok(corr < -.2, `rougher ground leans darker (corr ${corr.toFixed(2)})`);
// the vote is a leaning over several modes, never one mode: the bright ladder spreads its weight
{ const T = makeTerrain(777, L, 6); T.at(2, P); P.bright = .5; T.vote(P, v); const nz = [...v].filter(x => x > .05 * Math.max(...v)).length; ok(nz >= 7, `a leaning, not a lock: ${nz} pitch classes weighted`);
  const v1 = [...v]; P.bright = .52; T.vote(P, v); const d = v1.reduce((a, x, i) => a + Math.abs(x - v[i]), 0) / v1.reduce((a, x) => a + x, 0); ok(d < .05, `brightness moves the vote smoothly (${d.toFixed(3)})`); }
// register curve (system.js S.register): continuous in planet size
const reg = C => -Math.tanh((C - 6.5) / 1.5); let mj = 0; for (let C = 3; C < 10; C += .01) mj = Math.max(mj, Math.abs(reg(C + .01) - reg(C)));
ok(mj < .01 && reg(9) < -.8 && reg(4) > .8, 'chord octave by planet size is a continuous curve');
console.log(fail ? `TERRAIN_FAIL ${fail}` : 'TERRAIN_OK'); process.exit(fail ? 1 : 0);
