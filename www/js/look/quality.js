// LOOK / quality: look rungs mapped onto the engine's EXISTING ladder, render.q 0 (best) .. 3 (cheapest) (render.js QL, world
// track; steps down after ~1 s of slow frames, up after ~5 s of fast ones). Every effect lists what it does at each rung and
// its cheaper fallback, so stepping down always has somewhere to go. Numbers are PARAMETERS.
export const RUNGS = {
  //            q0 (full)                          q1                                 q2                               q3 (cheapest)
  glow:   [{ on: 1, scale: 1.5, alpha: .55, max: 24, core: 1 }, { on: 1, scale: 1.4, alpha: .5, max: 20, core: 0 }, { on: 1, scale: 1.3, alpha: .4, max: 12, core: 0 }, { on: 0 }],   // cheaper: smaller, fewer, then off
  shade:  [{ on: 1 }, { on: 1 }, { on: 1 }, { on: 0 }],                                       // terminator + limb + highlight sprite; cheaper: off (flat body)
  rim:    [{ on: 1, merged: 1, alpha: 1 }, { on: 1, merged: 1, alpha: 1 }, { on: 0 }, { on: 0 }],   // merged = baked into the shade sprite (1 draw); merged:0 = separate additive rim (exact, +1 draw)                    // cheaper: folded into shade only
  body:   [{ sprite: 1 }, { sprite: 1 }, { sprite: 1 }, { sprite: 0 }],                        // full baked body; cheaper: one flat arc
  post:   [{ on: 1, vignette: 1, wash: 1 }, { on: 1, vignette: 1, wash: 0 }, { on: 0 }, { on: 0 }],
  // P1 place look (opts.p1 only) ------------------------------------------------------------------------------------
  dust:   [{ on: 1, tex: 1 }, { on: 1, tex: 1 }, { on: 1, tex: 0 }, { on: 0 }],                  // grain/crack tile pattern; cheaper: flat dusty haze fill, then off
  bands:  [{ on: 1, a: 1 }, { on: 1, a: 1 }, { on: 1, a: .7 }, { on: 0 }],                         // baked strip per bar, stretched over the sky
  glint:  [{ on: 1, max: 12 }, { on: 1, max: 8 }, { on: 0 }, { on: 0 }],                            // gold glints on jamming ohms
  lace:   [{ on: 1, max: 3, px: 256, r: 80 }, { on: 1, max: 3, px: 192, r: 70 }, { on: 1, max: 1, px: 128, r: 56 }, { on: 0 }],   // pattern between jamming ohms, baked per phrase
  swell:  [{ on: 1, full: 1, dim: 0, layers: 2, glow: 1, cr: .2 }, { on: 1, full: 1, dim: 0, layers: 1, glow: 1, cr: .2 }, { on: 1, full: 0, dim: 0, layers: 1, glow: 0, cr: .3 }, { on: 1, wash: 1 }],   // big-event pattern: full = sky-only vector lace (fine lines, layers, soft glow), cr = centre burst radius (x min(W, H), baked at device size); q3 = flat colour wash
  kaleido: [{ rings: 3, pts: 28, glow: 1, veil: .25, restLine: .1, blend: 'soft-light' }, { rings: 3, pts: 20, glow: 1, veil: .25, restLine: .1, blend: 'soft-light' }, { rings: 2, pts: 14, glow: 0, veil: .25, restLine: .1, blend: 'soft-light' }, { rings: 1, pts: 10, glow: 0, veil: .25, restLine: .1, blend: 'soft-light' }],   // veil: rest strength of the colour veil (grows with development / trip, up on big); restLine: line alpha at full development x trip without a big moment   // real look: the field kaleidoscope (replaces render.js's), sky only; cheaper: fewer rings / points, no glow stroke
  sprite: [{ step: .5, bakes: 6 }, { step: .5, bakes: 4 }, { step: 1, bakes: 2 }, { step: 1, bakes: 1 }],   // size-bucket step + bakes per frame
};
export const CHEAPER = { kaleido: 'fewer rings and petal points, no glow stroke',  glow: 'smaller radius, fewer glows (nearest first), then off', shade: 'off = flat body', rim: 'merged into the shade sprite (one draw), then off; shade keeps the depth', body: 'flat filled arc', post: 'colour wash off, then all off', dust: 'flat dusty haze fill (no tile), then off', bands: 'dimmer, then off (world sky stays)', glint: 'off', lace: 'fewer + smaller sprites, then off', swell: 'full-screen pattern on the background canvas + sharp centre burst in post (dim only if opts.p1.dim), then a smaller centred pattern, then a flat colour wash', sprite: 'coarser size buckets (octave steps), fewer bakes per frame' };
export const rung = (effect, q = 0) => { const r = RUNGS[effect]; return r[Math.max(0, Math.min(r.length - 1, q | 0))]; };
