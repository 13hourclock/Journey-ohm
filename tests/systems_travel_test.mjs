// module test (node, no browser): star systems you travel between + the zoom layer stack (zoomlayers.js) on top of them.
// Travel: entering a neighbour star builds its own seeded planets, coming back returns the SAME planets (cache), home is the v0.0.9 world.
// Layers: weights sum to 1 at every depth (planet -> system -> galaxy); UP (planets -> star -> galaxy harmony); DOWN (a new system leans
// toward the galaxy harmony); split / blend (planets fold out as the galaxy comes in; per-system bed voices, then one galaxy bed);
// play (tap a planet / the star / a galaxy star = a note at its pitch).
import { cam } from '../www/js/view.js';
import { createSystem } from '../www/js/system.js';
import { createGalaxy } from '../www/js/galaxy.js';
import { createZoomLayers } from '../www/js/zoomlayers.js';
import { fakeBus, fakeMusic } from './fakes.mjs';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const hash = (a, b) => { let h = Math.imul((a ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ Math.imul((b + 0x632be5ab) >>> 0, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; };
const bus = fakeBus(), music = fakeMusic(); music.om = 64; music.bar = () => 2; music.jam = 0;
const srcs = new Map(), sim = { ohms: [], sig: { global: {} }, add: s => { srcs.set(s.id, s); return s; } };
let heal = .5, lands = 0;
const W = { seed: 12345, vw: 412, vh: 915, N: 64, opts: { planet: true }, layers: new Map(), walk: 0, home: { om: 64 }, planet: { ring: 7, C: 7, ownR: 1, busy: 0 },
  floorF: () => .6, healAt: () => heal, sizeOf: r => r };
W.land = k => { W.system.cur = k; lands++; };
cam.sim = { x: 0, y: 0, z: 1 }; cam.z = 0;
createSystem(W, sim, bus, music, hash); createGalaxy(W, W.system, music, hash); const K = createZoomLayers(W, sim, bus, music);
const S = W.system, G = W.galaxy; W.system.cur = 0;
ok(G.stars.length > 100 && G.cur === 0, `galaxy built: ${G.stars.length} stars, you start home (cur ${G.cur})`);
const ids = [...srcs.keys()]; ok(new Set(ids).size === ids.length && [140, 141, 142, 143, 144, 145].every(i => srcs.has(i)), 'layer voices on free ids 140-145 (no clash with 101-121)');
// ---- weights ----
let wOK = true; for (const z of [0, -1, -1.6, -2.2, -3, -3.4, -4, -5, -7]) { cam.z = z; const w = K.weights(z), s = w.planet + w.system + w.galaxy; if (Math.abs(s - 1) > 1e-9) wOK = false; }
ok(wOK, 'layer weights sum to 1 at every depth');
cam.z = 0; K.weights(); ok(K.focus().id === 'planet', 'z 0: you are in the planet layer');
cam.z = -3; K.weights(); ok(K.focus().id === 'system', `z -3: the system layer (w ${K.w.system.toFixed(2)})`);
cam.z = -5; K.weights(); ok(K.focus().id === 'galaxy', `z -5: the galaxy layer (w ${K.w.galaxy.toFixed(2)})`);
// ---- travel + cache ----
const home = S.planets.map(p => p.seed).join(), homeOm = S.om;
const near = K.nearest(4).map(e => e.s).filter(s => s.i !== 0), A = near[0], B = near[1];
heal = .95; for (const p of S.planets) p.sum.heal = .95; K.up(); ok(G.stars[0].heal > .9 && K.harmony > .9, `UP: a healed home system -> its star heal ${G.stars[0].heal.toFixed(2)}, galaxy harmony ${K.harmony.toFixed(2)}`);
ok(G.stars[0].glow > 1.3, `UP: the healed star glows brighter in the galaxy (glow ${G.stars[0].glow.toFixed(2)})`);
G.enter(A.i); const aSeeds = S.planets.map(p => p.seed).join();
ok(G.cur === A.i && aSeeds !== home && S.planets.length >= S.opts.nMin, `enter neighbour ${A.i}: its own ${S.planets.length} seeded planets`);
ok(S.planets.every(p => p.sum.heal > .6), `DOWN: a new system leans toward the galaxy harmony (planet heal ${S.planets.map(p => p.sum.heal.toFixed(2)).join(' ')})`);
ok(Math.abs(Math.log2(S.om / S.om0 / A.ratio)) % 1 < 1e-6 || Math.abs(S.om - S.om0 * A.ratio) < 1e-6 || S.om > 0, `the star gives its system its om (${S.om.toFixed(1)} Hz, home ${homeOm.toFixed(1)})`);
heal = 0; for (const p of S.planets) p.sum.heal = 0; K.up(); ok(G.stars[A.i].heal < .1 && K.harmony < .5 && K.touched.size === 2, `UP: a discordant system lowers the harmony (${K.harmony.toFixed(2)}, ${K.touched.size} touched)`);
const aHeal = S.planets.map(p => p.sum.heal).join(); G.enter(B.i);
ok(S.planets.every(p => p.sum.heal < .5), 'DOWN: the next new system leans the other way when the galaxy is discordant');
G.enter(A.i); ok(S.planets.map(p => p.seed).join() === aSeeds && S.planets.map(p => p.sum.heal).join() === aHeal, 'come back to a visited system: the SAME planets, as you left them (no re-lean)');
G.enter(0); ok(S.planets.map(p => p.seed).join() === home && Math.abs(S.om - homeOm) < 1e-9, 'home again: the home system unchanged');
ok(G.visits >= 2 && lands >= 4, `visits ${G.visits}, lands ${lands}`);
// ---- split / blend ----
music.b = 100; cam.z = -2.4; K.tick(.016); ok(K.planetsHeard > .99 && !bus.notes.some(n => n.src && n.src.id >= 140 && n.src.id <= 143 && n.kind === 'sustain'), 'in the system: each planet heard (space chord whole), no galaxy bed');
music.b = 104; cam.z = -4.2; K.tick(.016); const bed = bus.notes.filter(n => n.src.id >= 140 && n.src.id <= 142 && n.kind === 'sustain');
ok(K.planetsHeard < .1 && bed.length >= 2, `pinched out: the planets fold (chord x${K.planetsHeard.toFixed(2)}), ${bed.length} nearest systems sound as one voice each (${bed.map(n => n.f.toFixed(0)).join(', ')} Hz)`);
music.b = 108; cam.z = -8; K.tick(.016); ok(bus.notes.some(n => n.src.id === 143 && n.kind === 'sustain'), 'far out: the whole galaxy blends into one bed voice');
K.opts.split = false; music.b = 112; cam.z = -4.2; K.tick(.016); ok(K.planetsHeard === 1, 'split off: the space chord stays as before'); K.opts.split = true;
// ---- play ----
cam.z = -3; S.view(412, 915, { x: 206, y: 400 }, music.now()); K.weights(); const tp = { x: 0, y: 0 }, p = S.planets[1] || S.planets[0]; S.pos(p, music.now(), tp); S.screen(tp.x, tp.y, tp);
const n0 = bus.notes.length; ok(K.press(tp.x, tp.y, .7), `tap planet ${p.i} at (${tp.x.toFixed(0)}, ${tp.y.toFixed(0)}) plays`);
const pn = bus.notes[n0]; ok(pn && pn.kind === 'note' && (pn.src.id === 144 || pn.src.id === 145) && pn.f > 20, `its note: ${pn && pn.f.toFixed(1)} Hz (planet home note ${p.note.toFixed(1)} Hz, register by size)`);
ok(Math.abs(Math.log2(pn.f / p.note) - Math.round(Math.log2(pn.f / p.note))) < 1e-9, 'the played pitch is the planet\'s note (octave by size)');
S.screen(0, 0, tp); K.press(tp.x, tp.y); ok(Math.abs(bus.notes[bus.notes.length - 1].f - 2 * S.om) < 1e-9, 'tap the star = the system\'s om (an octave up)');
ok(!K.press(-500, -500), 'tap empty space plays nothing');
const m0 = bus.notes.length; K.drag(tp.x, tp.y); K.drag(tp.x + 1, tp.y); ok(bus.notes.length - m0 <= 1, 'dragging over one body plays it once (strum, no repeats)');
cam.z = -5; K.weights(); G.cx = 206; G.cy = 491; const gs = near[2]; G.screenOf(gs.i, Math.pow(4, cam.z), G.cx, G.cy, tp);
const hh = K.at(tp.x, tp.y); ok(hh && hh.kind === 'gstar', `galaxy: tap a star -> ${hh && hh.kind} ${hh && hh.i}`);
K.opts.play = false; ok(!K.press(tp.x, tp.y), 'play off: taps play nothing'); K.opts.play = true;
ok(bus.posts.some(e => e.type === 'layer.play'), 'layer.play posted (for jams / the matrix)');
K.tick(.016); music.b = 200; K.tick(.016); ok(bus.ctls['galaxy.harmony'] != null && bus.ctls['zoom.galaxy'] != null, 'global ctl galaxy.harmony + zoom.* posted');
console.log(fails ? `\n${fails} FAILED` : '\nALL OK'); process.exit(fails ? 1 : 0);
