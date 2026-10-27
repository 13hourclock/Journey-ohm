// SYSTEMS: PLANTS GROW FROM THE MUSIC AROUND THEM (PLAN_SYSTEMS 11, audit B13; "The plants growing and flowering should have to do with
// the music around them", 1:35 AM Oct 22). Seeded plants along the ground of each planet (planet seed). Every note an ohm plays near a
// plant feeds it: notes in tune grow the stem and leaves (phi / golden-angle spacing, organic, no stamped shapes); SONGS make it
// FLOWER (a song's notes count more and open buds; a jam only grows green); out-of-tune / drifted notes wilt it a little. Plants
// keep growing while you are away from what was playing near them (persist 'away'). Drawn only: touching a plant = bare ground.
import { rng } from './rng.js';
export const PLANT_OPTS = { on: true, n: 14, reach: 2.2, grow: .012, flower: .05, wilt: .02, max: 1 };
export const PHI = (1 + Math.sqrt(5)) / 2, GOLD = Math.PI * 2 * (1 - 1 / PHI);
export function feed(p, ev, d, O = PLANT_OPTS) { const near = Math.max(0, 1 - d / O.reach); if (!near) return 0; const v = (ev.vel || .6) * near;
  if (ev.wrong) { p.g = Math.max(0, p.g - O.wilt * v); p.f = Math.max(0, p.f - O.wilt * v * 2); return -1; }
  p.g = Math.min(O.max, p.g + O.grow * v * (ev.song ? 1.6 : 1)); if (ev.song && p.g > .35) p.f = Math.min(1, p.f + O.flower * v * (ev.hook ? 1.5 : 1)); p.heard = (p.heard || 0) * .9 + v * (ev.song ? 1 : .5) * .1; return 1; }
export function createPlants(sim, bus, music, world, opts = {}) { const O = { ...PLANT_OPTS, ...opts }, Pl = { opts: O, list: [], seed: null, fed: 0 };
  const sow = seed => { const r = rng((seed ^ 0x9e3779b9) >>> 0), B = sim.bounds; Pl.seed = seed; Pl.list = []; for (let i = 0; i < O.n; i++) { const x = B.x0 + .5 + (i + r() * .8) / O.n * (B.x1 - B.x0 - 1); Pl.list.push({ x, g: .04 + r() * .06, f: 0, hue: 80 + r() * 80, fh: (r() * 360) | 0, lean: (r() - .5) * .4, heard: 0 }); } };
  Pl.sow = sow;
  bus.on('note', ev => { if (!O.on || !ev.src || ev.src.scale !== 'ohm' || ev.kind === 'release' || ev.kind === 'damp' || !ev.src.body) return; const b = ev.src.body; for (const p of Pl.list) { const d = Math.abs(p.x - b.x); if (d < O.reach) { feed(p, ev, d, O); Pl.fed++; } } });
  Pl.tick = () => { const s = world && world.pseed != null ? world.pseed : 1; if (s !== Pl.seed) sow(s); };
  Pl.away = sec => { for (const p of Pl.list) { const k = Math.min(1, sec / 900) * (p.heard || 0) * 4; p.g = Math.min(O.max, p.g + k * .5); if (p.g > .35) p.f = Math.min(1, p.f + k * .3); } };
  Pl.draw = (g, toS) => { if (!O.on) return; const gy = x => sim.groundAt ? sim.groundAt(x) : sim.bounds.ground, t = performance.now() * .001;
    for (const p of Pl.list) { const s = toS(p.x, gy(p.x)), h = (.3 + p.g * 1.6) * s.s, sway = Math.sin(t * .8 + p.x) * .06 + p.lean; if (s.x < -60 || s.x > innerWidth + 60) continue;
      const tx = s.x + Math.sin(sway) * h, ty = s.y - Math.cos(sway) * h; g.strokeStyle = 'hsla(' + p.hue + ',45%,' + (30 + p.g * 25) + '%,.85)'; g.lineWidth = Math.max(1, s.s * .04 * (.5 + p.g)); g.beginPath(); g.moveTo(s.x, s.y); g.quadraticCurveTo(s.x + Math.sin(sway * 2) * h * .3, s.y - h * .5, tx, ty); g.stroke();
      const nl = Math.floor(2 + p.g * 10); g.fillStyle = 'hsla(' + p.hue + ',50%,40%,.8)'; for (let i = 1; i < nl; i++) { const u = i / nl, a = i * GOLD, lx = s.x + (tx - s.x) * u, ly = s.y + (ty - s.y) * u, L = s.s * .12 * (1 - u * .5) * (.4 + p.g); g.beginPath(); g.ellipse(lx + Math.cos(a) * L * .6, ly, L * .5, L * .2, Math.cos(a) * .9, 0, 6.283); g.fill(); }
      if (p.f > .02) { const n = Math.max(3, Math.round(5 + p.f * 8)), R = s.s * .1 * (.3 + p.f); for (let i = 0; i < n; i++) { const a = i * GOLD, rr = R * Math.sqrt((i + .5) / n) * 1.6; g.fillStyle = 'hsla(' + p.fh + ',80%,' + (55 + 15 * p.f) + '%,' + (.4 + .5 * p.f) + ')'; g.beginPath(); g.arc(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr, R * .35, 0, 6.283); g.fill(); } } } };
  Pl.save = () => ({ seed: Pl.seed, p: Pl.list.map(p => [+p.g.toFixed(3), +p.f.toFixed(3), +(p.heard || 0).toFixed(3)]) });
  Pl.load = d => { if (!d) return; sow(d.seed); (d.p || []).forEach((q, i) => { const p = Pl.list[i]; if (p) { p.g = q[0]; p.f = q[1]; p.heard = q[2]; } }); };
  return Pl; }
