// v0.0.28 R5.12 cloud gas giants: ground ohms float on a mostly-gas planet (seeded, a share by gas weight), settle back elsewhere / off.
import { fakeMusic, fakeSim } from './fakes.mjs';
import { createGasFloat, gasLift, GAS_OPTS } from '../www/js/gasfloat.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const mk = gas => { const sim = fakeSim(12), music = fakeMusic(), st = { gas }; sim.bounds = { x0: -4, x1: 4, y0: -5.5, ground: 7.5 }; sim.ohm = sim.ohms[0];
  for (const o of sim.ohms) { o.g = { float: false, r: .5 }; o.body.y = 7; o.body.vx = 0; o.body.vy = 0; }
  const world = { home: {}, styleOf: () => st }; const G = createGasFloat({ sim, world, music }); return { sim, music, st, G }; };
// 1 deterministic share
{ let n = 0, N = 4000; for (let s = 0; s < N; s++) if (gasLift(s * 7919, .6)) n++; ok(Math.abs(n / N - .84) < .04, `1 on a .6-gas planet about 84% of ground ohms float (${(n / N * 100).toFixed(0)}%)`);
  let m = 0; for (let s = 0; s < N; s++) if (gasLift(s * 7919, .3)) m++; ok(m === 0, '  below .4 gas: none'); ok(gasLift(42, .7) === gasLift(42, .7), '  same seed, same lift'); }
// 2 a gas giant lifts ground ohms (not yours), height within 1..2.6
{ const X = mk(.7); X.G.bar(); const up = X.sim.ohms.filter(o => o._gasF); const hs = up.map(o => 7.5 - .5 - o.body.homeY);
  ok(up.length >= 6 && !X.sim.ohm._gasF && hs.every(h => h >= .99 && h <= 2.61), `2 gas giant: ${up.length}/11 ground ohms float, heights ${Math.min(...hs).toFixed(2)}..${Math.max(...hs).toFixed(2)}, yours untouched`);
  X.st.gas = .1; X.G.bar(); ok(X.sim.ohms.every(o => !o._gasF && !o.g.float), '  leave the gas giant: they settle back to their own gene');
  const Y = mk(.7); Y.sim.ohms[3].g.float = true; Y.sim.ohms[4].anchor = true; Y.sim.ohms[5].body.grab = {}; Y.G.bar(); ok(!Y.sim.ohms[3]._gasF && !Y.sim.ohms[4]._gasF && !Y.sim.ohms[5]._gasF, '  born floaters, anchored and held ohms are left alone'); }
// 3 switch off
{ const X = mk(.7); X.G.opts.on = false; X.G.bar(); ok(X.sim.ohms.every(o => !o._gasF), '3 switch off: nobody lifted'); const Y = mk(.7); Y.G.bar(); Y.G.opts.on = false; Y.G.bar(); ok(Y.sim.ohms.every(o => !o._gasF && !o.g.float), '  turning it off settles the lifted ones'); }
// 4 once per bar
{ const X = mk(.7); let calls = 0; const b0 = X.G.bar; X.G.bar = () => { calls++; b0(); }; for (let i = 0; i < 40; i++) { X.music.b = i * .2; X.G.tick(); } ok(calls === 2, `4 runs once a bar (${calls} in 8 beats)`); }
console.log(fails ? `GASFLOAT FAIL (${fails})` : 'GASFLOAT OK'); process.exit(fails ? 1 : 0);
