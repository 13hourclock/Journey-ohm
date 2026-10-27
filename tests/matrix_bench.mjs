// offline: cost of the control tick (world physics + clock streams + influence matrix) with N sources, all default rows
import { createMusic } from '../www/js/music.js';
import { createEvents } from '../www/js/events.js';
import { createSim } from '../www/js/sim.js';
import { createMatrix } from '../www/js/matrix.js';
import { makeRecipe, DEFAULT_ROUTES } from '../www/js/recipe.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
let T = 0; const music = createMusic(() => T), bus = createEvents(music), sim = createSim(music, bus), X = createMatrix(sim, bus, music); sim.reseed(1);
let lives = 0; bus.on('live', () => lives++);
const run = (label, frames = 2000) => { const n0 = bus.total; lives = 0; const t = performance.now(); for (let i = 0; i < frames; i++) { T += 1 / 60; sim.bus = bus; bus.ctl(sim.ohm, 'in.pinch', 1 - .3 * Math.sin(i / 20)); sim.step(1 / 60); X.tick(); }
  const ms = (performance.now() - t) / frames; console.log(`${label}: ${ms.toFixed(4)} ms/frame (matrix alone EMA ${X.ms.toFixed(4)} ms), events ${((bus.total - n0) / frames * 60).toFixed(0)}/s, live ${(lives / frames * 60).toFixed(0)}/s`); return ms; };
run('1 ohm, ' + DEFAULT_ROUTES.length + ' rows');
for (let k = 0; k < 15; k++) { const r = makeRecipe(100 + k); sim.add({ id: 200 + k, scale: 'ohm', recipe: r.id, hue: 0 }); }
run('16 sources x ' + DEFAULT_ROUTES.length + ' rows');
for (const o of sim.sources) { const r = (await import('../www/js/recipe.js')).recipes.get(o.recipe); for (let j = 0; j < 20; j++) r.mods.push({ src: 'lfo2', dst: 'fx.0.tone', amt: .1 }); }
const ms = run('16 sources x ' + (DEFAULT_ROUTES.length + 20) + ' rows');
console.log(ms < 2 ? 'MATRIX_OK' : 'MATRIX_SLOW');
// v0.0.3 beat snap: a 'pulse' row peaks on the grid line and decays; a 'hold' row steps once per grid cell
{ const rec = (await import('../www/js/recipe.js')).recipes.get(sim.ohm.recipe); rec.mods = [{ src: 'key.tonic', dst: 'look.glow', amt: 1, snap: 1 }, { src: 'lfo1', dst: 'body.throb', amt: 1, snap: 1, snapMode: 'hold' }];
  const g = [], th = new Set(); T = Math.ceil(T) + 1e-4; sim.step(0); for (let i = 0; i < 60; i++) { sim.step(1 / 60); X.tick(); g.push(sim.ohm.look.glow); th.add(sim.ohm.body.throb.toFixed(4)); T += 1 / 60; }
  console.log(`snap pulse: start ${g[1].toFixed(3)} end ${g[58].toFixed(3)}; hold distinct values in 1 beat: ${th.size}`); console.log(th.size <= 2 && g[1] > 3 * g[58] ? 'SNAP_OK' : 'SNAP_BAD'); }
