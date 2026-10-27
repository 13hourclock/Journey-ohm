// CLOUD GAS GIANTS WITH FLOATING OHMS (R5.12 first part; NEW_ENGINE Appendix A, R5.12 "Cloud gas giants with floating ohms; void walkers;
// moon settlers" CARRY = approved; v0.0.28). The planets already carry a gas weight (terrain.js STYLES rock / ocean / ice / gas) and ohms
// already hover by gene (genes.js g.float, sim.js homeY spring). On a planet whose blend is mostly gas, ground ohms rise into the cloud:
// each ohm floats when a seeded draw (its own seed) falls under the gas weight x lean, at a seeded height 1..2.6 above the ground.
// Off a gas giant (or switch off) the ones lifted here settle back to their own gene. Never the ohm you drive, never an anchored /
// grabbed / thrown one. Nothing saved: the gene comes back on load and the lift is re-derived on the next bar.
// (Void walkers and moon settlers wait for moons + open space between them: none exist yet.)
import { rng } from './rng.js';
export const GAS_OPTS = { on: true, min: .4, lean: 1.4, lift: [1, 2.6] };
export function gasLift(seed, gas, O = GAS_OPTS) { if (!(gas >= O.min)) return 0; const r = rng(((seed >>> 0) ^ 0x6a51) >>> 0); if (r() >= Math.min(1, gas * O.lean)) return 0; return O.lift[0] + (O.lift[1] - O.lift[0]) * r(); }
export function createGasFloat({ sim, world, music }) {
  const O = { ...GAS_OPTS }, G = { opts: O, lifted: 0, settled: 0, lastBar: -1, gas: 0 };
  G.gasNow = () => { const L = world && world.home, st = L && world.styleOf ? world.styleOf(L) : null; return st && st.gas || 0; };
  const gy = x => sim.groundAt ? sim.groundAt(x) : sim.bounds.ground;
  G.bar = () => { const gas = O.on ? G.gasNow() : 0; G.gas = gas;
    for (const o of sim.ohms || []) { if (o.scale !== 'ohm' || !o.g || !o.body || o.dead) continue; const b = o.body;
      if (o._gasF) { if (gas < O.min || !O.on) { o.g.float = false; o._gasF = false; G.settled++; } continue; }
      if (gas < O.min || o === sim.ohm || o.g.float || o.anchor || b.grab || b.flying) continue;
      const h = gasLift(o.seed, gas, O); if (!h) continue;
      o.g.float = true; o._gasF = true; b.homeY = Math.max(sim.bounds.y0 + o.g.r + .5, gy(b.x) - o.g.r - h); G.lifted++; } };
  G.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar === G.lastBar) return; G.lastBar = bar; G.bar(); };
  return G; }
