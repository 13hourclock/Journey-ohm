// LENSES AND PRISMS (switch lightPlay, OFF): the old game's light field (softsound light.js, R6.5 "lens = clear blob, droplet = prism,
// optics -> pitch"), in the plainest form that fits this game. The clear effect objects (things.js fx) catch the sunlight:
//   a BUBBLE LENS (pit) focuses it into one bright white spot on the ground below it;
//   a DROPLET (cho) or a SHARD CLUSTER (glt) is a prism: it fans the light into a small rainbow on the ground (7 bands, 430-670 nm,
//     wider the higher it hangs).
// The sun comes from above and leans slowly across the day; at night (sky.day < minDay) and under heavy cloud there is no light.
// An ohm standing in a band is LIT: each of its own notes gets a quiet glassy overtone at the light's pitch (old game: an extra mode at
// f = tonic x 2 x 700 / wavelength, folded within two octaves above the note and snapped to the key), louder in a focused spot.
// Pure scenery: no hit test, no gestures (GESTURES.md line 241 / 274). Not saved: it is worked out from the things every tick.
// Look: soft light shafts and ground glows (fills only, no outlines); look.lightBeam(g, beam, x0, y0, x1, y1, s, {I, rgb}) takes over.
// Not built (old game): rays through drawn clear MATERIAL (this game has no material ink), reflections off dense bodies, shadows,
// rainbows from rain streaks and pools, the star gesture's point lights.
import { makeRecipe, withRow, recipes } from './recipe.js';
import { snap } from './things.js';
import { cam } from './view.js';
export const LIGHT_OPTS = { on: false, lens: ['pit'], prism: ['cho', 'glt'], minDay: .3, cloudK: .6, tilt: .35, lensW: .35, lensI: 2, fan: .09, prismI: .8,
  reach: 9, partA: .35, row: 'fm_glass', every: .1 };
const WLS = [430, 470, 510, 550, 590, 630, 670];
export function wlRGB(wl) { let r = 0, g = 0, b = 0; if (wl < 440) { r = (440 - wl) / 60; b = 1; } else if (wl < 490) { g = (wl - 440) / 50; b = 1; } else if (wl < 510) { g = 1; b = (510 - wl) / 20; }
  else if (wl < 580) { r = (wl - 510) / 70; g = 1; } else if (wl < 645) { r = 1; g = (645 - wl) / 65; } else r = 1; return [r * 255 | 0, g * 255 | 0, b * 255 | 0]; }   // Bruton (old music.js)
export function createLightPlay(d = {}) { const { sim, bus, music, world, things, look } = d; const O = Object.assign({}, LIGHT_OPTS, d.opts || {});
  const L = { opts: O, beams: [], lit: new Map(), stats: { lit: 0, notes: 0 }, ms: 0 }; let acc = 1e9;
  const base = makeRecipe(31337, { name: 'light', add: false }), rec = withRow(base, O.row); recipes.set(rec.id = base.id, rec);
  L.src = { id: 'light:glass', scale: 'thing', seed: 31337, recipe: rec.id, body: { x: 0, y: 0 } };
  L.sunI = () => { const E = world && world.env; if (!E) return 1; const day = E.day == null ? 1 : E.day; if (day < O.minDay) return 0; return Math.max(0, Math.min(1, (day - O.minDay) / (1 - O.minDay) * 1.4)) * (1 - O.cloudK * Math.max(0, Math.min(1, E.cloud || 0))); };
  L.tiltA = () => O.tilt * Math.sin(((music.beat ? music.beat() : 0) / 4 / ((world && world.dayBars) || 64)) * 6.2832);   // the sun leans across the day
  L.wlHz = wl => (music.tonicHz || 220) * 2 * (700 / wl);
  const ground = x => sim.groundAt ? sim.groundAt(x) : sim.bounds.ground;
  L.trace = () => { L.beams.length = 0; L.lit.clear(); const I = L.sunI(); if (!(I > .02) || !things || !things.list) return L.beams; const a = L.tiltA(), tn = Math.tan(a);
    for (const th of things.list) { if (th.kind !== 'fx') continue; const lens = O.lens.includes(th.fx), pr = O.prism.includes(th.fx); if (!lens && !pr) continue;
      const gy = ground(th.x), drop = gy - th.y; if (!(drop > .05) || drop > O.reach) continue; const xc = th.x + tn * drop, w0 = Math.min(th.r || .5, 1.2) * 1.6;
      if (lens) L.beams.push({ th, kind: 'lens', x0: th.x, y0: th.y, w0, x: xc, y: gy, w: O.lensW, I: I * O.lensI, wl: null });
      else { const bw = Math.max(.06, O.fan * drop * .5); for (let k = 0; k < WLS.length; k++) L.beams.push({ th, kind: 'prism', x0: th.x, y0: th.y, w0: w0 / WLS.length, x: xc + (k - 3) * bw, y: gy, w: bw, I: I * O.prismI, wl: WLS[k] }); } }
    for (const o of sim.ohms || []) { const b = o.body; if (!b || o.parked || o.dead) continue; const rr = (o.r || .5) * .7; let best = null;
      for (const B of L.beams) if (Math.abs(b.x - B.x) < B.w / 2 + rr && Math.abs(ground(b.x) - b.y) < 2.5 && (!best || B.I > best.I)) best = B;
      if (best) L.lit.set(o.id, { I: best.I, wl: best.wl || 550, kind: best.kind }); }
    L.stats.lit = L.lit.size; return L.beams; };
  L.lightOf = o => (O.on && o && L.lit.get(o.id)) || null;
  L.overtone = (f0, wl) => { let lf = L.wlHz(wl); if (!(lf > 0 && isFinite(lf)) || !(f0 > 0 && isFinite(f0))) return 0; lf = f0 * Math.pow(2, ((Math.log2(lf / f0) % 2) + 2) % 2); return snap(lf, music); };
  // the ohms' own notes: a lit one adds the light's overtone (a separate quiet glass voice, never changes the note itself)
  const prev = bus.shape; bus.shape = ev => { if (prev) { ev = prev(ev); if (!ev) return null; } if (!O.on || !L.lit.size || !ev || !ev.src) return ev; const li = L.lit.get(ev.src.id); if (!li) return ev;
    const f0 = ev.f || (music.hz ? music.hz(ev.deg || 0, ev.oct || 0) : 0), f = L.overtone(f0, li.wl); if (f) { L.src.body.x = ev.src.body ? ev.src.body.x : 0; L.src.body.y = ev.src.body ? ev.src.body.y : 0;
      bus.note({ src: L.src, kind: 'note', f, vel: (ev.vel == null ? .7 : ev.vel) * O.partA * Math.min(1, li.I * .6) * .5, pos: .3, dur: (ev.dur || .6) * 1.4, pan: ev.pan || 0, t: ev.t, lite: true, by: 'light' }); L.stats.notes++; }
    return ev; };
  L.tick = dt => { if (!O.on) { if (L.beams.length) { L.beams.length = 0; L.lit.clear(); } return; } if (Math.round(cam.z) !== 0) { L.beams.length = 0; L.lit.clear(); return; }
    acc += dt || 0; if (acc < O.every) return; acc = 0; const t0 = performance.now(); L.trace(); L.ms = performance.now() - t0; };
  L.draw = (g, toS) => { if (!O.on || !L.beams.length || Math.round(cam.z) !== 0) return; const LK = typeof look === 'function' ? look() : look;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const B of L.beams) { const p0 = toS(B.x0, B.y0), p1 = toS(B.x, B.y), s = p1.s || 50, rgb = B.wl ? wlRGB(B.wl) : [255, 250, 235], al = Math.min(1, B.I) * (B.kind === 'lens' ? .22 : .16);
      if (LK && LK.lightBeam && LK.lightBeam(g, B, p0.x, p0.y, p1.x, p1.y, s, { I: B.I, rgb })) continue;
      const a0 = B.w0 * s / 2, a1 = B.w * s / 2, gr = g.createLinearGradient(p0.x, p0.y, p1.x, p1.y); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${al})`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(p0.x - a0, p0.y); g.lineTo(p0.x + a0, p0.y); g.lineTo(p1.x + a1, p1.y); g.lineTo(p1.x - a1, p1.y); g.closePath(); g.fill();
      const rg = g.createRadialGradient(p1.x, p1.y, 0, p1.x, p1.y, a1 * 1.6 + 2); rg.addColorStop(0, `rgba(${rgb},${al * 2.2})`); rg.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = rg;
      g.beginPath(); g.ellipse(p1.x, p1.y, a1 * 1.6 + 2, (a1 * 1.6 + 2) * .35, 0, 0, Math.PI * 2); g.fill(); }
    g.restore(); };
  L.info = () => `${L.beams.filter(b => b.kind === 'lens').length} lens spots, ${L.beams.filter(b => b.kind === 'prism').length / 7 | 0} rainbows; lit ohms ${L.lit.size}; overtones ${L.stats.notes}; sun ${L.sunI().toFixed(2)}; ${L.ms.toFixed(2)} ms`;
  return L; }
