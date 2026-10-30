// BOARD W2/W3 jam trees: sprout from a sound jam, a ring per growth, song-shaped (deterministic), blooms at the top level, rings drawn
// when zoomed in, per planet, save / load, switch off = nothing
import { createTrees, buildTree } from '../www/js/trees.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const H = {}; const bus = { on: (t, f) => (H[t] = H[t] || []).push(f), post: e => (H[e.type] || []).forEach(f => f(e)), note: e => (H.note || []).forEach(f => f(e)) };
const mk = (id, x, hue) => ({ id, scale: 'ohm', hue, body: { x, y: 0 } });
const ohms = [mk(1, 0, 20), mk(2, .8, 200), mk(3, 30, 300)];
const sim = { ohms, bounds: { ground: 0, x0: -50, x1: 50 }, groundAt: () => 0 };
const world = { pseed: 7 };
globalThis.innerWidth = 400; globalThis.innerHeight = 800;
const T = createTrees({ sim, bus, world, quality: { level: 0 } });
bus.post({ type: 'jam.grow', key: 'a', lvl: 1, x: .4, y: 0 });
ok(T.list.length === 1 && T.list[0].rings.length === 1, 'a growing jam sprouts one tree with its first ring');
// a jam in C with a strong fifth (degrees 0 and 4), on the beats
for (let i = 0; i < 64; i++) bus.note({ src: ohms[i % 2], kind: 'note', deg: i % 3 ? 0 : 4, beat: i, vel: .6 });
bus.note({ src: ohms[2], kind: 'note', deg: 2, beat: .5, vel: 1 });
ok(T.list[0].deg[0] > 0 && T.list[0].deg[4] > 0 && T.list[0].deg[2] === 0, 'notes near the tree are counted, far ohms are not');
for (let l = 2; l <= 3; l++) bus.post({ type: 'jam.grow', key: 'a', lvl: l, x: .5, y: 0 });
const t = T.list[0];
ok(t.rings.length === 3, 'each growth adds a ring');
ok(t.bloom >= 1, 'top-level growth opens blooms');
const hues = new Set(t.rings.map(r => r.hue)); ok(t.rings.every(r => r.hue >= 0 && r.hue < 360), 'rings carry the colour of the ohms that grew them');
const s1 = buildTree(t), s2 = buildTree(t);
ok(JSON.stringify(s1.segs) === JSON.stringify(s2.segs), 'same song + seed = same tree (deterministic)');
ok(s1.ratios[0] === 1.5, 'the strongest interval (a fifth) sets the first split ratio 3:2');
const small = buildTree({ ...t, rings: t.rings.slice(0, 1) });
ok(s1.segs.length > small.segs.length && s1.segs[0].w > small.segs[0].w, 'more rings = more branches and a thicker trunk');
const t2 = { ...t, deg: Float32Array.from([5, 0, 9, 0, 0, 0, 0]) }; ok(buildTree(t2).ratios[0] !== 1.5, 'a different song changes the shape');
bus.post({ type: 'jam.grow', key: 'b', lvl: 1, x: .9, y: 0 }); ok(T.list.length === 1 && t.rings.length === 4, 'a jam right next to a tree feeds that tree instead of crowding a new one');
world.pseed = 8; bus.post({ type: 'jam.grow', key: 'c', lvl: 1, x: 5, y: 0 }); ok(T.list.length === 2 && T.list[1].ps === 8, 'trees belong to their planet');
// drawing: lines + blooms; rings only when zoomed in
const calls = { line: 0, arc: 0, ellipse: 0 }; const g = { beginPath() {}, moveTo() {}, lineTo() { calls.line++; }, stroke() {}, fill() {}, arc() { calls.arc++; }, ellipse() { calls.ellipse++; }, set strokeStyle(v) {}, set fillStyle(v) {}, set lineWidth(v) {}, set lineCap(v) {} };
world.pseed = 7; t.vis = t.rings.length;
T.draw(g, () => ({ x: 200, y: 700, s: 40 })); ok(calls.line > 20 && calls.arc > 10 && calls.ellipse === 0, 'far: branches and blooms drawn, no ring cut');
calls.ellipse = 0; T.draw(g, () => ({ x: 200, y: 700, s: 900 })); ok(calls.ellipse === t.rings.length, 'zoomed in: the trunk shows one ring per jam');
const lowQ = createTrees({ sim, bus: { on() {} }, world, quality: { level: 3 } }); lowQ.list.push(t); calls.line = 0; lowQ.draw(g, () => ({ x: 200, y: 700, s: 20 })); ok(calls.line <= lowQ.opts.segCap[3], 'a busy phone draws fewer branches');
const saved = JSON.parse(JSON.stringify(T.save())); const T2 = createTrees({ sim, bus: { on() {} }, world }); T2.load(saved);
ok(T2.list.length === 2 && JSON.stringify(buildTree(T2.list[0]).segs) === JSON.stringify(s1.segs.length ? buildTree(t).segs : []), 'save / load keeps every tree and its exact shape');
T.opts.on = false; const n0 = T.list.length; bus.post({ type: 'jam.grow', key: 'z', lvl: 1, x: 20, y: 0 }); calls.line = 0; T.draw(g, () => ({ x: 200, y: 700, s: 40 }));
ok(T.list.length === n0 && calls.line === 0, 'switch off: no new trees, nothing drawn');
console.log(fail ? `${fail} FAILED` : 'all ok'); process.exit(fail ? 1 : 0);
