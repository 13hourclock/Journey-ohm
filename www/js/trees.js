// JAM TREES (BOARD W2 + first part of W3; Wilbow 12:53 PM MDT Oct 30 2026: "Approved for integration in to the build next pass").
// A jam that holds together grows a tree where it played. The trigger is jamgrow.js: it only posts 'jam.grow' while every member is
// in time and in harmony and you keep watching, so a tree is earned by a musically sound jam, never by noise.
//   SPROUT  the first 'jam.grow' of a jam on this planet plants a tree at the jam (or feeds the tree already standing there).
//   RINGS   every further 'jam.grow' adds a growth ring: the tree gets taller, its trunk thicker and its branching one level deeper.
//           Each ring keeps the colour of the ohms that grew it, so a tree is many colours (oldest at the trunk, newest at the tips).
//           Zoomed in, the trunk shows its rings as a cut, one band per jam (W3 "growth rings being viewable").
//   SONG -> SHAPE  notes played near a tree are counted (scale degrees, where in the bar, who played). At each ring the tree is rebuilt
//           from that record: the strongest intervals pick the split angles (a fifth = 3:2, a third = 5:4 ...), how busy the rhythm was
//           sets 2- or 3-way splits and the segment lengths. Same song = same tree (deterministic from the tree seed + record).
//   BLOOMS  a jam that reaches its top growth level (or a song group that grows) opens blooms: golden-angle (sunflower) seed heads;
//           a very even, consonant jam gets flower-of-life blooms instead. Generated, never stamped.
// Cost: the shape is rebuilt only when a ring is added; drawing is a capped list of lines + dots, fewer at lower quality rungs
// (quality.js) unless the tree is big on screen (the tree you look at keeps its full look). Switch 'jamTrees' (ON); off = no trees.
import { rng } from './rng.js';
export const TREE_OPTS = { on: true, reach: 2.5, merge: 1.4, maxPerPlanet: 12, maxRings: 12, baseH: .7, ringH: .22, maxH: 3.4,
  segCap: [700, 380, 200, 110], bloomLvl: 3, ringsFromZoom: 24 };
export const GOLD = Math.PI * (3 - Math.sqrt(5));
const RATIO = [2, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];   // scale-degree distance -> just ratio (the harmony that splits branches)

// the shape of a tree from its record: pure, deterministic (tests call it directly)
export function buildTree(t, O = TREE_OPTS) {
  const r = rng((t.seed ^ (t.rings.length * 0x9e3779b1)) >>> 0), deg = t.deg, rh = t.rh;
  const order = [...deg.keys()].sort((a, b) => deg[b] - deg[a]), top = order[0];
  const ratios = []; for (const d of order.slice(1, 4)) if (deg[d] > 0) ratios.push(RATIO[(d - top + 7) % 7] || 1.5); if (!ratios.length) ratios.push(1.5, 4 / 3);
  const tot = rh.reduce((a, b) => a + b, 0) || 1, busy = rh.filter(v => v / tot > .03).length;   // how many of the 16 slots carry the groove
  const rhythm = []; for (let i = 0; i < 16; i++) rhythm.push(tot > 1 ? Math.min(1, rh[i] / tot * 6) : (i % 4 === 0 ? 1 : .3));
  const n = t.rings.length, depth = Math.min(8, 3 + n), three = busy >= 9;
  const segs = [], tips = [], hueAt = lvl => { const k = n <= 1 ? 0 : Math.min(n - 1, Math.round(lvl / Math.max(1, depth - 1) * (n - 1))); return t.rings[k].hue; };
  const grow = (x, y, ang, len, d, w) => {
    const lvl = depth - d, x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    segs.push({ x0: x, y0: y, x1: x2, y1: y2, w, lvl, hue: (hueAt(lvl) + lvl * 11 + (r() - .5) * 16 + 360) % 360 });
    if (d <= 1) { tips.push({ x: x2, y: y2, ang, lvl }); return; }
    const ratio = ratios[d % ratios.length], spread = Math.min(1.1, .35 + (ratio - 1) * .9);
    const nb = three && d % 2 === 0 ? 3 : 2;
    for (let k = 0; k < nb; k++) { const u = nb > 1 ? k / (nb - 1) - .5 : 0, beat = rhythm[(d * 3 + k * 5) % 16];
      grow(x2, y2, ang + u * 2 * spread + (r() - .5) * .14, len * (.7 + .2 * beat) * (k === 1 && nb === 3 ? .85 : 1), d - 1, w * .68); } };
  grow(0, 0, -Math.PI / 2, .32, depth, .06 + .025 * n);   // tree units: 1 = full height scale, y up is negative
  segs.sort((a, b) => a.lvl - b.lvl);
  // the flower kind: an even groove on a consonant top interval (octave / fifth / fourth) grows flower-of-life blooms
  const even = busy <= 6 && rhythm[0] + rhythm[4] + rhythm[8] + rhythm[12] > 2.4, cons = ratios[0] === 2 || ratios[0] === 1.5 || ratios[0] === 4 / 3;
  return { segs, tips, kind: even && cons ? 'life' : 'sun', ratios, depth };
}

export function createTrees({ sim, bus, world, quality }, opts = {}) {
  const O = { ...TREE_OPTS, ...opts }, T = { opts: O, list: [], sprouted: 0, ringsAdded: 0, blooms: 0, notes: 0 };
  const ps = () => (world && world.pseed != null ? world.pseed : 1);
  const here = () => { const p = ps(); return T.list.filter(t => t.ps === p); };
  const newTree = (key, x) => ({ key, x, ps: ps(), seed: (Math.random() * 4294967296) >>> 0, rings: [], deg: new Float32Array(7), rh: new Float32Array(16),
    ohms: {}, bloom: 0, vis: 0, shape: null });
  const nearHue = (x, fall) => { let sx = 0, sy = 0, w = 0; for (const o of sim.ohms) { if (o.scale !== 'ohm' || !o.body || o.hue == null) continue; const d = Math.abs(o.body.x - x); if (d > O.reach) continue; const a = o.hue * Math.PI / 180, k = 1 - d / O.reach; sx += Math.cos(a) * k; sy += Math.sin(a) * k; w += k; }
    return w ? ((Math.atan2(sy, sx) * 180 / Math.PI) + 360) % 360 : fall; };
  bus.on('jam.grow', ev => { if (!O.on || ev.x == null) return;
    const list = here(); let t = list.find(q => q.key === ev.key) || list.find(q => Math.abs(q.x - ev.x) < O.merge);
    if (!t) { if (list.length >= O.maxPerPlanet) return; t = newTree(ev.key, ev.x); T.list.push(t); T.sprouted++; }
    t.key = ev.key;
    if (t.rings.length < O.maxRings) { t.rings.push({ hue: Math.round(nearHue(t.x, t.rings.length ? t.rings[t.rings.length - 1].hue : 120)), lvl: ev.lvl || 1, song: ev.song ? 1 : 0 }); T.ringsAdded++; }
    if ((ev.lvl || 0) >= O.bloomLvl || (ev.song && (ev.lvl || 0) >= 2)) { t.bloom = Math.min(4, t.bloom + 1); T.blooms++; }
    t.shape = null; });
  bus.on('note', ev => { if (!O.on || !T.list.length) return; const o = ev.src; if (!o || o.scale !== 'ohm' || !o.body || ev.kind === 'release' || ev.kind === 'damp' || ev.kind === 'level') return;
    const p = ps(); for (const t of T.list) { if (t.ps !== p || Math.abs(t.x - o.body.x) > O.reach) continue;
      const v = ev.vel || .5; if (ev.deg != null) t.deg[((ev.deg % 7) + 7) % 7] += v; if (ev.beat != null) t.rh[Math.floor(((ev.beat % 4) + 4) % 4 * 4) % 16] += v;
      const m = t.ohms[o.id] || (t.ohms[o.id] = { hue: o.hue != null ? o.hue : 0, n: 0 }); m.n += v; T.notes++; } });
  T.tick = dt => { for (const t of T.list) { const want = t.rings.length; t.vis += (want - t.vis) * Math.min(1, (dt || .016) * .8); } };

  T.draw = (g, toS) => { if (!O.on || !T.list.length) return; const p = ps(), now = performance.now() * .001, ql = quality ? Math.min(3, quality.level | 0) : 0;
    const gy = x => sim.groundAt ? sim.groundAt(x) : sim.bounds.ground;
    for (const t of T.list) { if (t.ps !== p || !t.rings.length) continue;
      const base = toS(t.x, gy(t.x)); if (base.x < -400 || base.x > innerWidth + 400) continue;
      if (!t.shape) t.shape = buildTree(t, O);
      const grownH = Math.min(O.maxH, O.baseH + O.ringH * Math.max(0, t.vis - 1)) * Math.min(1, t.vis), Hp = grownH * base.s * 3.1;
      if (Hp < 2) continue;
      const big = Hp > Math.min(innerWidth, innerHeight) * .45, cap = big ? O.segCap[0] : O.segCap[ql];   // the tree you look at keeps its full look
      const sway = Math.sin(now * .6 + t.x) * .015, S = t.shape, ca = Math.cos(sway), sa = Math.sin(sway);
      const P = (x, y) => ({ x: base.x + (x * ca - y * sa) * Hp, y: base.y + (x * sa + y * ca) * Hp });
      g.lineCap = 'round';
      const n = Math.min(cap, S.segs.length);
      for (let i = 0; i < n; i++) { const s = S.segs[i], a = P(s.x0, s.y0), b = P(s.x1, s.y1), w = Math.max(.6, s.w * Hp * .5);
        g.strokeStyle = 'hsla(' + (s.hue | 0) + ',' + (40 + s.lvl * 5) + '%,' + (32 + s.lvl * 6) + '%,.92)'; g.lineWidth = w; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      if (t.bloom > 0 && n >= S.segs.length * .6) drawBlooms(g, t, S, P, Hp, now, ql, big);
      const tw = S.segs[0].w * Hp * .5;
      if (tw > O.ringsFromZoom) drawRings(g, t, base, tw); } };

  function drawBlooms(g, t, S, P, Hp, now, ql, big) {
    const hues = Object.values(t.ohms).sort((a, b) => b.n - a.n).slice(0, 4).map(m => m.hue); if (!hues.length) hues.push(t.rings[t.rings.length - 1].hue);
    const every = Math.max(1, Math.round(S.tips.length / (6 + t.bloom * 7))), R0 = Hp * .045 * (.8 + t.bloom * .15);
    const pulse = 1 + Math.sin(now * 2 + t.x) * .04;
    for (let i = 0, k = 0; i < S.tips.length; i += every, k++) { const tp = P(S.tips[i].x, S.tips[i].y), hue = hues[k % hues.length], R = R0 * (.6 + ((k * 7) % 5) * .12) * pulse;
      if (S.kind === 'life') { g.lineWidth = Math.max(.6, R * .08); for (let j = 0; j < 7; j++) { const a = j * Math.PI / 3, cx = tp.x + (j ? Math.cos(a) * R * .5 : 0), cy = tp.y + (j ? Math.sin(a) * R * .5 : 0);
          g.strokeStyle = 'hsla(' + ((hue + j * 8) % 360) + ',70%,72%,.85)'; g.beginPath(); g.arc(cx, cy, R * .5, 0, 6.283); g.stroke(); } continue; }
      const seeds = Math.max(8, Math.round((big ? 60 : 34 - ql * 6) * (R / (R0 + 1e-6)))), ang = GOLD + (t.seed % 7) * .0015;
      for (let j = 0; j < seeds; j++) { const f = j / seeds, rr = R * Math.sqrt(f), a = j * ang, d = Math.max(.6, R * .07 * (.5 + f));
        g.fillStyle = 'hsla(' + ((hue + f * 40) % 360) + ',' + (80 - f * 25) + '%,' + (70 - f * 12) + '%,.9)'; g.beginPath(); g.arc(tp.x + Math.cos(a) * rr, tp.y + Math.sin(a) * rr, d, 0, 6.283); g.fill(); } } }

  function drawRings(g, t, base, tw) {   // the trunk's cut, one band per jam, oldest in the middle (W3)
    const n = t.rings.length, rx = tw * 1.25, ry = rx * .38, cy = base.y + ry * .2;
    for (let i = n - 1; i >= 0; i--) { const f = (i + 1) / n; g.fillStyle = 'hsla(' + t.rings[i].hue + ',45%,' + (26 + (i % 2) * 10) + '%,.95)'; g.beginPath(); g.ellipse(base.x, cy, rx * f, ry * f, 0, 0, 6.283); g.fill(); } }

  T.save = () => ({ v: 1, t: T.list.slice(-60).map(t => ({ k: t.key, x: +t.x.toFixed(2), p: t.ps, s: t.seed, r: t.rings.map(q => [q.hue, q.lvl, q.song]), d: [...t.deg].map(v => +v.toFixed(1)), h: [...t.rh].map(v => +v.toFixed(1)),
    o: Object.entries(t.ohms).slice(0, 12).map(([id, m]) => [id, m.hue, +m.n.toFixed(1)]), b: t.bloom })) });
  T.load = d => { if (!d || !d.t) return; T.list = d.t.map(q => ({ key: q.k, x: q.x, ps: q.p, seed: q.s >>> 0, rings: (q.r || []).map(a => ({ hue: a[0], lvl: a[1], song: a[2] })), deg: Float32Array.from(q.d || new Array(7).fill(0)),
    rh: Float32Array.from(q.h || new Array(16).fill(0)), ohms: Object.fromEntries((q.o || []).map(a => [a[0], { hue: a[1], n: a[2] }])), bloom: q.b || 0, vis: (q.r || []).length, shape: null })); };
  return T;
}
