// BODY GENES: an ohm's body grows from the SAME seed as its sound recipe (recipe.js), so body and sound always agree
// (E, two-way): the recipe's modal body size sets the body's radius (bigger = lower), its family leaning sets the body plan
// (membrane = round drum belly, string = long, bar = lobed / angular), damping sets how wobbly it is. The rest comes from a
// second stream of the same seed, so every ohm is unique and the same seed always grows the same ohm. Pure, no state.
import { rng } from './rng.js';
export const RING = 10;   // soft-body ring points per ohm (cheap: 10 springs; same block at every scale)
export function bodyGenes(seed, rec) {
  const r = rng((seed ^ 0x5bd1e995) >>> 0), p = rec.modal.p, f = rec.modal.fam;
  const size = p.size;                                   // .3 .. .7
  const g = {
    r: .42 + (size - .3) * .85,                          // radius in world units (R px): .42 .. .76
    aspect: 1 + (f.string - f.membrane) * .35,           // > 1 tall (string), < 1 wide (membrane)
    lobes: f.bar > .4 ? 3 + Math.floor(r() * 3) : 0,     // bar-leaning bodies get 3-5 lobes ...
    lobeAmt: f.bar * .16, lobePh: r() * 6.283,
    soft: .35 + (1 - p.damp) * .5 + r() * .15,           // 0..1: more = wobblier (lower spring, less damping)
    mass: .6 + size * 1.2,
    float: r() < .4,                                     // some ohms hover, the rest sit on the ground
    calm: .35 + r() * .5,                                // how slowly it approaches a partner
    social: .3 + r() * .7,                               // how strongly it wants a partner at all
    hear: .4 + r() * .6,                                 // how far it hears / feels neighbours (reach = 2 + 4 * hear units)
    eyes: 1 + (r() < .3 ? 1 : 0), legs: f.membrane > .45 ? 0 : (r() < .5 ? 2 : 0),   // appendages (drawn only)
  };
  g.k = 170 - g.soft * 110; g.c = 6 - g.soft * 3.2;       // ring spring + damping
  return g;
}
// rest shape of ring point i (offset from centre, world units)
export function restPoint(g, i, out) { const a = i / RING * 6.283, rr = g.r * (1 + g.lobeAmt * Math.cos(g.lobes * a + g.lobePh));
  out[0] = Math.cos(a) * rr / Math.sqrt(g.aspect); out[1] = Math.sin(a) * rr * Math.sqrt(g.aspect); return out; }
