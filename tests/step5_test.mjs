// STEP 5 module test: B drummer ohms + drum kits (learned, roles, Q209/Q210 defaults), E effects as world objects (-> influence item.*),
// F drawn instruments (strings / bars / drums, pitch by law + key, tapped and bumped, saved, undoable). Generated data only, no audio.
import { createMusic } from '../www/js/music.js';
import { createBrain } from '../www/js/brain.js';
import { createBlend } from '../www/js/blend.js';
import { OPTS, makeRecipe, voicesFor, recipes, DEFAULT_ROUTES } from '../www/js/recipe.js';
import { PALETTE, percGene, placeFor, isPercRow } from '../www/js/instruments.js';
import { createDrums, birthHits, ROLE, ROLES, roleAt, roleWeights } from '../www/js/drums.js';
import { createThings, THING_OPTS, classify, fxFor, shapeOf, pitchFor, FX, snap, fxWeights, FX_W, pickFx } from '../www/js/things.js';
import { analyze } from '../www/js/stroke.js';
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
let T = 0; const music = createMusic(() => T), notes = [], bus = { on() {}, ctl() {}, note: ev => notes.push(ev) };
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
ok(PALETTE.length === 73, 'palette intact: 73 rows'); ok(Object.keys(ROLE).every(id => PALETTE.some(e => e.id === id)), 'every kit hit is a palette row');
// ---- B: drum kits
const mk = (id, row, seed) => { const r = makeRecipe(seed, { add: true }); r.inst = { a: row, b: row, w: 0, s: 1 }; return { id, seed, scale: 'ohm', recipe: r.id, body: { x: id * .3, y: 0 } }; };
let n1 = 0, n3 = 0, same = true; for (let s = 1; s <= 200; s++) { const r = makeRecipe(9000 + s, { add: true }); r.inst = { a: 'kick', b: 'kick', w: 0, s: 1 }; const h = birthHits(r), h2 = birthHits(r);
  if (h.length === 1) n1++; if (h.length === 3) n3++; if (h[0] !== 'kick' || new Set(h.map(x => ROLE[x])).size !== h.length || h.join() !== h2.join()) same = false; }
ok(same && n1 > 30 && n3 > 30, `birth hits: own row first, 1-3 hits in distinct roles, seeded (1 hit: ${n1}/200, 3 hits: ${n3}/200)`);
let sa = 1; while (birthHits(recipes.get(mk(0, 'kick', sa).recipe)).length !== 1) sa++;
let sb = 1; while (birthHits(recipes.get(mk(0, 'snare', sb).recipe)).length !== 3) sb++;
const A = mk(1, 'kick', sa), Bd = mk(2, 'snare', sb), C = mk(3, 'harp_pluck', 77), Dd = mk(4, 'tabla', sa + 1), Ed = mk(6, 'shaker_hat', sa + 2), Fd = mk(7, 'taiko', sa + 3);
const world = { opts: JSON.parse(JSON.stringify(OPTS)), sources: [A, Bd, C, Dd, Ed, Fd] }, R = createBrain(world, music), B = createBlend(world, bus, music, R), D = createDrums(world, music, R); world.drums = D;
ok(D.isDrummer(A) && D.isDrummer(Bd) && !D.isDrummer(C), 'drummer = an ohm whose own row is a drum row');
ok(D.kit(A).length === 1 && D.kit(C) === null, `a young drummer has its birth kit (${D.kit(A)}); a harp has none`);
const bar = who => { for (const o of who) B.n.set(o, 4); T += 4 * 60 / music.bpm; B.bar(); };
for (let i = 0; i < 20; i++) bar([A, Bd]); ok(D.kit(A).length === 1, 'learning is slow: 20 bars together, no new hit yet');
const f0 = D.fullness(A); for (let i = 0; i < 120; i++) bar([A, Bd]); const kA = D.kit(A);
ok(kA.length >= 3 && Bd.recipe && D.kit(Bd).filter(h => h !== 'snare').every(h => kA.includes(h)) || kA.length >= 3, `jamming grows the kit: ${kA.join(', ')} (from ${D.kit(Bd).join(', ')})`);
ok(kA[0] === 'kick' && D.fullness(A) > f0, `birth hit stays the core; kit fuller (${f0.toFixed(2)} -> ${D.fullness(A).toFixed(2)})`);
ok(R.list(A, 'kit').every(e => e.keep), 'learned hits are kept (never fade)');
ok(!R.list(C, 'kit').length, 'a non-drummer learns no drum hits');
for (let i = 0; i < 2000; i++) bar([A, Bd, Dd, Ed, Fd]); ok(D.kit(A).length <= D.opts.cap, `kit capped at ${D.opts.cap} (${D.kit(A).length})`);
ok(D.fullness(A) === 1, `a seasoned drummer has a full kit (${ROLES.join(' / ')})`);
// playing: hits in their natural place in the bar
ok(roleAt(0) === 'low' && roleAt(1) === 'back' && roleAt(3) === 'back' && roleAt(.5) === 'time' && roleAt(2.5) === 'time' && roleAt(2) === 'tom' && roleAt(1.25) === 'colour' && roleAt(3.75) === 'colour', 'bar roles: 1 = low, 2 & 4 = backbeat, & = time, 3 = tom, 16ths = colour');
// MT item 4: the place's rhythmic tradition places the hits; default bar where there is none; blends blend
{ const top = w => Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
  ok(top(roleWeights(1, {})) === 'back' && top(roleWeights(0, {})) === 'low', 'no tradition: kick on 1, snare on 2 and 4');
  ok(top(roleWeights(0, { hindustani: 1 })) === 'low' && roleWeights(0, { hindustani: 1 }).low > 1 && top(roleWeights(8, { hindustani: 1 })) !== 'low', 'teentaal: strongest hit on sam, khali (beat 9) has no bass');
  ok(top(roleWeights(15, { gamelan: 1 })) === 'low' && roleWeights(15, { gamelan: 1 }).low > (roleWeights(0, { gamelan: 1 }).low || 0) && top(roleWeights(0, { gamelan: 1 })) !== 'low', 'gamelan: the gong at the END of the cycle');
  ok(top(roleWeights(0, { aksak: 1 })) === 'low' && top(roleWeights(1, { aksak: 1 })) === 'low' && top(roleWeights(2, { aksak: 1 })) === 'low' && top(roleWeights(.5, { aksak: 1 })) !== 'low', 'aksak 2+2+3: a low hit opens each group');
  ok([0, 1.5, 3, 5, 6].every(b => roleWeights(b, { cuban: 1 }).time >= 1) && !(roleWeights(1, { cuban: 1 }).time >= 1), 'son clave 3-2: the clave strokes (1, 2&, 4 | 2, 3) carry the time hit');
  const bl = roleWeights(0, { hindustani: .5, funk: .5 }); ok(bl.low > 0 && bl.low < roleWeights(0, { hindustani: 1 }).low, 'a blended place blends the weights'); }
const rA = recipes.get(A.recipe), at = b => D.recFor(A, rA, { beat: b });
ok(at(0) === rA && ROLE[at(1).inst.a] === 'back' && ROLE[at(.5).inst.a] === 'time' && ROLE[at(2).inst.a] === 'tom' && ROLE[at(2.25).inst.a] === 'colour', `kit note per beat: ${[0, .5, 1, 2, 2.25].map(b => at(b).inst.a).join(' ')}`);
ok(D.recFor(A, rA, { beat: 1, lite: true }) === rA, 'far (lite) notes keep its own sound (cheap)');
const v0 = voicesFor(rA, { f: 60, vel: .7, src: 1 }, {}), v1 = voicesFor(at(1), { f: 200, vel: .7, src: 1 }, {});
ok(v0.length && v1.length && v1.every(m => Object.values(m.P || {}).every(x => typeof x !== 'number' || isFinite(x))) && JSON.stringify(v0.find(m => m.t === 'inst').P) !== JSON.stringify(v1.find(m => m.t === 'inst').P), 'a kit hit is a different voice (finite params)');
const kid = mk(5, 'kick', sa + 999); world.sources.push(kid); ok(!R.list(kid, 'kit').length && D.kit(kid).length <= 3, 'Q210 default: a hatchling starts from its own birth hits only');
// ---- E + F: things
const circ = (cx, cy, r, n = 40, t0 = 0, rest = 0, wob = 0, k = 7) => { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * 6.283; const w = 1 + wob * Math.sin(a * k); p.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w, t0 + i * 16]); } p.push([p[n][0], p[n][1], t0 + n * 16 + rest]); return p; };
const line = (x0, y0, x1, y1, n = 30, rest = 0, bend = 0) => { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; p.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + bend * Math.sin(t * 3.1416), i * 16]); } p.push([x1, y1 + 0, n * 16 + rest]); return p; };
ok(classify(analyze(circ(200, 300, 80)), true, 0, circ(200, 300, 80))?.kind === 'fx', 'closed loop + rest = effect object');
ok(classify(analyze(circ(200, 300, 80)), false, 0, circ(200, 300, 80))?.kind === 'membrane', 'closed loop, no rest, nothing inside = drawn drum');
ok(classify(analyze(circ(200, 300, 80)), false, 2, circ(200, 300, 80)) === null && classify(analyze(circ(200, 300, 80)), true, 3, circ(200, 300, 80)) === null, 'a loop around 2+ ohms stays the herd select');
ok(classify(analyze(line(50, 400, 350, 400)), true)?.kind === 'string', 'straight stroke + rest = string');
ok(classify(analyze(line(50, 400, 350, 400, 30, 0, 90)), true)?.kind === 'bar', 'bent stroke + rest = bar');
ok(classify(analyze(line(50, 400, 350, 400)), false) === null, 'a plain drag (no rest) stays a stir');
const ell = (rx, ry) => { const p = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283; p.push([200 + Math.cos(a) * rx, 300 + Math.sin(a) * ry, i * 16]); } return p; };
const fk = [fxFor(shapeOf(circ(200, 300, 160))), fxFor(shapeOf(circ(200, 300, 40))), fxFor(shapeOf(circ(200, 300, 100, 120, 0, 0, .3, 11))), fxFor(shapeOf(circ(200, 300, 50, 120, 0, 0, .3, 11))), fxFor(shapeOf(ell(150, 70))), fxFor(shapeOf(circ(200, 300, 90, 80, 0, 0, .1, 3)))];
ok(fk.join() === 'rev,pit,dst,glt,dly,trm', `the shape picks the effect: big ${fk[0]}, small ${fk[1]}, spiky ${fk[2]} / small spiky ${fk[3]}, long ${fk[4]}, wavy ${fk[5]}`);
ok(pitchFor('string', 1) > pitchFor('string', 2) * 1.8 && pitchFor('bar', 1) > pitchFor('bar', 2) * 3.5 && pitchFor('membrane', 0, 1) > pitchFor('membrane', 0, 4) * 1.8, 'pitch by law: string 1/L, bar 1/L^2, drum 1/sqrt(area)');
ok(pitchFor('string', .001) < 2000 && pitchFor('string', 1000) > 30, 'soft limit keeps pitch audible');
// MT 11:33 item 5: mid-size drawings land mid-range; snap is to the place's scale in cents
const C3 = 130.8, C4 = 261.6, C5 = 523.3, C7 = 2093, C2 = 65.4, dA = d => Math.PI * (d / 2) ** 2;
ok([1.25, 2.5, 5].every(L => pitchFor('string', L) > C3 * .97 && pitchFor('string', L) < C5 * 1.03) && Math.abs(1200 * Math.log2(pitchFor('string', 2.5) / C4)) < 10, `strings: L 1.25 / 2.5 / 5 units -> ${[1.25, 2.5, 5].map(L => pitchFor('string', L).toFixed(0)).join(' / ')} Hz (C3-C5)`);
ok([1.2, 2, 3.36].every(L => pitchFor('bar', L) > C4 * .97 && pitchFor('bar', L) < C7 * 1.03), `bars: L 1.2 / 2 / 3.36 -> ${[1.2, 2, 3.36].map(L => pitchFor('bar', L).toFixed(0)).join(' / ')} Hz (C4-C7)`);
ok([.75, 1.5, 3].every(d => pitchFor('membrane', 0, dA(d)) > C2 * .97 && pitchFor('membrane', 0, dA(d)) < C4 * 1.03) && Math.abs(pitchFor('membrane', 0, dA(1)) / pitchFor('membrane', 0, dA(2)) - 2) < .01, `drums: diameter .75 / 1.5 / 3 -> ${[.75, 1.5, 3].map(d => pitchFor('membrane', 0, dA(d)).toFixed(0)).join(' / ')} Hz (C2-C4), 1/diameter exactly`);
{ const cs = music.cents(), inScale = f => { const c = ((1200 * Math.log2(f / music.tonicHz)) % 1200 + 1200) % 1200; return cs.concat(1200).some(k => Math.abs(k - c) < .01); }; let good = 0; for (let f = 60; f < 2000; f *= 1.037) if (inScale(snap(f, music)) && Math.abs(1200 * Math.log2(snap(f, music) / f)) <= 600) good++;
  const m5 = { tonicHz: 200, cents: () => [0, 240, 480, 720, 960] }; ok(good > 90 && Math.abs(snap(200 * Math.pow(2, 250 / 1200), m5) - 200 * Math.pow(2, 240 / 1200)) < .01 && Math.abs(snap(200 * Math.pow(2, 1150 / 1200), m5) - 400) < .01, `snap lands on the place's scale in cents (${good} sweep notes; a 5-tone equal scale snaps 250c -> 240c, 1150c -> octave)`); }
// MT item 6: effect weights + ground leans
{ const w0 = fxWeights({}), wc = fxWeights({ hollow: 1 }), ww = fxWeights({ water: 1 }), wi = fxWeights({ ice: 1 }), wr = fxWeights({ rock: 1 }), sh = (w, k) => w[k] / Object.values(w).reduce((a, b) => a + b, 0);
  ok(JSON.stringify(w0) === JSON.stringify(FX_W) && FX_W.rev === .25 && FX_W.glt === .05 && Math.abs(Object.values(FX_W).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'default effect weights: reverb .25 ... glitch .05');
  ok(sh(wc, 'rev') > sh(w0, 'rev') && sh(wc, 'cmb') > sh(w0, 'cmb') && sh(ww, 'cho') > sh(w0, 'cho') && sh(ww, 'trm') > sh(w0, 'trm') && sh(wi, 'pit') > sh(w0, 'pit') && sh(wi, 'dly') > sh(w0, 'dly') && sh(wr, 'dst') > sh(w0, 'dst') && sh(wr, 'glt') > sh(w0, 'glt'), 'ground leans: caves/craters reverb+comb, water chorus+tremolo, ice pitch+delay, rock distortion+glitch');
  const cnt = {}; for (let i = 0; i < 20000; i++) { const k = pickFx(w0, (i + .5) / 20000); cnt[k] = (cnt[k] || 0) + 1; } ok(Object.keys(FX_W).every(k => Math.abs(cnt[k] / 20000 - FX_W[k]) < .01), 'weighted pick follows the weights'); }
const ohm = { id: 9, body: { x: 0, y: 0, vx: 0, vy: 0 }, g: { r: .4 } }, sim = { ohms: [ohm], bounds: { x0: -3.8, x1: 3.8, y0: -5.5, ground: 7.5 }, cam: { x: 0, y: 0, z: 1 } };
const U = { done: [], push(a) { this.done.push(a); return a; } }, saved = {}; const persist = { register: (n, p) => { saved[n] = p; } };
const TH = createThings({ sim, bus, music, persist, undo: U }); const toW = (x, y) => ({ x: (x - 200) / 50, y: (y - 300) / 50 });
ok(TH.stroke(circ(200, 300, 50, 40, 0, 500), toW) && TH.list[0].kind === 'fx' && sim.itemMod === TH.itemMod, 'drawn effect object lands in the world (world.itemMod wired)');
const fx0 = TH.list[0].fx, m = sim.itemMod(ohm), F = FX[fx0]; ok(m && ['bright', 'rough', 'space', 'wobble'].some(k => F[k] && m[k] > .5) && sim.itemTouch(ohm) === 1, `an ohm inside the ${F.name} plays through it: ${JSON.stringify(m)}`);
ohm.body.x = 6; ok(!sim.itemMod(ohm), 'far away: no effect'); ohm.body.x = 0;
ok(['item.bright', 'item.rough', 'item.space', 'item.wobble', 'item.touch'].every(s => DEFAULT_ROUTES.some(r => r.src === s)), 'effects go through the influence matrix (item.* routes)');
const nn = notes.length; ok(TH.stroke(line(100, 500, 400, 500, 30, 600), toW) && TH.list[1].kind === 'string' && notes.length === nn + 1, 'drawn string: made + sounds once');
const S = TH.list[1], row = PALETTE.find(e => e.id === S.row); ok(row && (row.res.str || 0) >= .5 && recipes.get(S.src.recipe) && recipes.get(S.src.recipe).inst.a === S.row, `its own voice: ${S.row} (a string row), never an ohm's`);
const hz = new Set(); for (let o = -4; o <= 4; o++) for (let d = 0; d < 7; d++) hz.add(music.hz(d, o).toFixed(3)); ok(hz.has(S.f.toFixed(3)), `pitch in key (${S.f.toFixed(1)} Hz, length ${S.L.toFixed(2)})`);
const vs = voicesFor(recipes.get(S.src.recipe), { f: S.f, vel: .7, src: 1 }, {}); ok(vs.length > 0 && vs.every(v => isFinite(v.gain)), 'drawn instrument voices are finite');
TH.stroke(circ(200, 650, 40, 40, 0, 0), toW); const Mb = TH.list[2]; ok(Mb && Mb.kind === 'membrane' && (PALETTE.find(e => e.id === Mb.row).res.membrane || 0) >= .5, `drawn drum: ${Mb && Mb.row}`);
const hit = TH.hitAt(S.pts[5].x, S.pts[5].y), miss = TH.hitAt(-3, -5); ok(hit === S && !miss, 'tap on a drawn instrument finds it');
// bumping: an ohm crossing the string plays it once per contact
const before = notes.length; ohm.body.x = S.x; ohm.body.y = S.y - 1; ohm.body.vy = 3; for (let i = 0; i < 40; i++) { ohm.body.y += .05; TH.tick(); } ok(notes.length - before === 1, `an ohm bumping the string plays it once (${notes.length - before})`);
const sv = JSON.parse(JSON.stringify(saved.things.save())); const T2 = createThings({ music }); T2.load(sv); ok(T2.list.length === TH.list.length && T2.list.every((t, i) => t.kind === TH.list[i].kind && t.fx === TH.list[i].fx && t.row === TH.list[i].row && Math.abs((t.f || 0) - (TH.list[i].f || 0)) < 1e-6), 'saved with the world and restored the same');
U.done.pop().undo(); ok(TH.list.length === 2, 'undo removes the last drawn thing'); TH.grow(42); const g = TH.list.filter(t => t.grown); TH.grow(42);
ok(g.length === 4 && TH.list.filter(t => t.grown).length === 4 && g.every(t => t.x > -3.8 && t.x < 3.8 && t.y > -5.5 && t.y < 7.5), 'the world grows its own 4 effect objects, in bounds, once');
const T3 = createThings({ music }); T3.grow(42); ok(T3.list.map(t => t.fx).join() === g.map(t => t.fx).join(), 'grown objects are seeded per world');
// cost: 32 ohms x 24 things
const S4 = { ohms: Array.from({ length: 32 }, (_, i) => ({ id: i, body: { x: i % 7 - 3, y: i % 5, vx: 1, vy: 1 }, g: { r: .4 } })), bounds: sim.bounds }, T4 = createThings({ sim: S4, music, bus });
for (let i = 0; i < 24; i++) T4.make(i % 2 ? 'fx' : 'string', Array.from({ length: 24 }, (_, j) => ({ x: (i % 6) - 3 + j * .05, y: (i % 4) * 2 + Math.sin(j) * .2 })), { fx: 'rev', seed: i + 1 });
const t0 = performance.now(); for (let k = 0; k < 200; k++) { T4.tick(); for (const o of S4.ohms) T4.itemMod(o); } const ms = (performance.now() - t0) / 200; ok(ms < 1, `cost: 24 things x 32 ohms = ${ms.toFixed(3)} ms per tick`);
// F+: movable ends (Wilbow 3:19 AM Oct 23 "make endpoints move able. Make length correlate pitch"; V08 P1)
{ const { toScreen, toWorld } = await import('../www/js/space.js'); const W = 400, H = 800, sm = { ohms: [], bounds: sim.bounds, cam: { x: 0, y: 0, z: 1 } }, nb = [], bz = { on() {}, ctl() {}, note: ev => nb.push(ev) }, U5 = { done: [], push(a) { this.done.push(a); return a; } };
  const T5 = createThings({ sim: sm, bus: bz, music, undo: U5, size: () => ({ W, H }) }), sc = (x, y) => toScreen(W, H, sm.cam, x, y), wo = (x, y) => toWorld(W, H, sm.cam, x, y);
  T5.stroke(line(100, 500, 300, 500, 30, 600), toW); const St = T5.list[0], n = St.pts.length, L0 = St.L, f0 = St.f, Fx = { ...St.pts[0] }, e1 = sc(St.pts[n - 1].x, St.pts[n - 1].y), mid = sc(St.x, St.y + 1);
  ok(St.kind === 'string', 'a drawn string to stretch'); const h = T5.handleAt(e1.x + 5, e1.y); ok(h && h.th === St && h.end === 1 && !T5.handleAt(sc(St.x, St.y).x, sc(St.x, St.y).y), 'a finger on the end finds its handle (within 16 px); the middle is not a handle');
  ok(!T5.handleAt(e1.x + 40, e1.y), 'away from the end: no handle');
  T5.handleDown(h, wo(e1.x + 5, e1.y).x, wo(e1.x + 5, e1.y).y); const fs = [St.f]; let k0 = nb.length; for (let i = 1; i <= 30; i++) { const w = wo(e1.x + 5 + i * 3, e1.y); T5.handleMove(h, w.x, w.y); fs.push(St.f); }
  ok(St.L > L0 * 1.2 && St.f < f0 && Math.hypot(St.pts[0].x - Fx.x, St.pts[0].y - Fx.y) < 1e-9, `dragging the end out: the other end stays, longer (${L0.toFixed(2)} -> ${St.L.toFixed(2)}) = lower (${f0.toFixed(1)} -> ${St.f.toFixed(1)} Hz)`);
  ok(fs.every((f, i) => !i || f <= fs[i - 1] + 1e-9), 'the note only falls while it lengthens'); const hz2 = new Set(); for (let o = -5; o <= 5; o++) for (let d = 0; d < 7; d++) hz2.add(music.hz(d, o).toFixed(3)); ok(fs.every(f => hz2.has(f.toFixed(3))), 'every note on the way snaps to the key (frets)');
  const struck = nb.length - k0; ok(struck >= 1 && nb.slice(k0).every(e => e.vel <= .26), `a soft re-strike when it lands on a new note (${struck}, vel .25)`);
  T5.handleMove(h, wo(e1.x + 2000, e1.y).x, wo(e1.x + 2000, e1.y).y); ok(St.L <= 3 * L0 + 1e-6 && St.L > 2.9 * L0, `stretch limit 3x the drawn length (${(St.L / L0).toFixed(2)}x)`);
  T5.handleMove(h, Fx.x + .001, Fx.y); ok(St.L >= .3 * L0 - 1e-6 && St.L < .31 * L0, `shrink limit 0.3x (${(St.L / L0).toFixed(2)}x)`); const fShort = St.f;
  const u0 = U5.done.length; ok(T5.handleUp(h) === 'moved' && U5.done.length === u0 + 1, 'release: one undo step'); const ue = U5.done[u0]; ue.undo(); ok(Math.abs(St.L - L0) < 1e-6 && St.f === f0, 'undo puts the length and the note back'); ue.redo(); ok(St.f === fShort, 'redo');
  const sv = JSON.parse(JSON.stringify(T5.save())), T6 = createThings({ music }); T6.load(sv); ok(Math.abs(T6.list[0].f - St.f) < 1e-6 && Math.abs(T6.list[0].L0 - L0) < 1e-3, 'the new length, and the drawn length its limits key to, are saved');
  const k1 = nb.length, h2 = T5.handleDown(T5.handleAt(sc(St.pts[0].x, St.pts[0].y).x, sc(St.pts[0].x, St.pts[0].y).y)); ok(h2.end === 0 && T5.handleUp(h2) === 'tap' && nb.length === k1 + 1 && U5.done.length === u0 + 1, 'a touch on an end that does not move still plays it, no undo step');
  T5.stroke(line(100, 650, 250, 600, 30, 600), toW); T5.stroke(circ(200, 300, 60, 40, 0, 0), toW); const Mm = T5.list.find(t => t.kind === 'membrane'); ok(Mm, 'a drawn drum');
  const c = sc(Mm.x, Mm.y), R = Mm.r * c.s, hr = T5.handleAt(c.x + R - 3, c.y); ok(hr && hr.rim && hr.th === Mm && !T5.handleAt(c.x, c.y), 'its rim is a handle, its middle is not');
  const A0 = Mm.A, fm0 = Mm.f; T5.handleDown(hr, wo(c.x + R - 3, c.y).x, wo(c.x + R - 3, c.y).y); for (let i = 1; i <= 20; i++) T5.handleMove(hr, wo(c.x + R - 3 + i * 4, c.y).x, wo(c.x + R - 3 + i * 4, c.y).y);
  ok(Mm.A > A0 * 1.3 && Mm.f <= fm0, `swelling the rim: wider (${(Mm.A / A0).toFixed(2)}x) = lower or same (${fm0.toFixed(1)} -> ${Mm.f.toFixed(1)} Hz)`);
  T5.handleMove(hr, Mm.x + 100, Mm.y); ok(Mm.A <= 3 * A0 + 1e-6, `area limit 3x (${(Mm.A / A0).toFixed(2)}x)`); T5.handleMove(hr, Mm.x + .0001, Mm.y); ok(Mm.A >= .4 * A0 - 1e-6, `area limit 0.4x (${(Mm.A / A0).toFixed(2)}x)`); T5.handleUp(hr);
  const fxo = T5.stroke(circ(100, 100, 30, 40, 0, 500), toW) && T5.list.find(t => t.kind === 'fx'); if (fxo) { const cf = sc(fxo.x, fxo.y); ok(!T5.handleAt(cf.x + fxo.r * cf.s - 2, cf.y) || T5.handleAt(cf.x + fxo.r * cf.s - 2, cf.y).th !== fxo, 'effect objects have no handles'); }
  // Music Theory 3:01 PM Oct 25: bars .5-2x, the final pitch held in range per kind, re-strike 70 ms per object
  const EP = THING_OPTS.endPitch, inR = (f, k) => f >= EP[k][0] * .9999 && f <= EP[k][1] * 1.0001; ok(inR(St.f, 'string') && inR(Mm.f, 'membrane'), `after the drags the notes sit in range: string ${St.f.toFixed(1)} Hz (C3-C5), drum ${Mm.f.toFixed(1)} Hz (C2-C4)`);
  T5.stroke(line(100, 760, 300, 760, 30, 600, 90), toW); const Br = T5.list.find(t => t.kind === 'bar'); if (Br) { const bn = Br.pts.length, be = sc(Br.pts[bn - 1].x, Br.pts[bn - 1].y), BL0 = Br.L0, hb = T5.handleDown(T5.handleAt(be.x, be.y), wo(be.x, be.y).x, wo(be.x, be.y).y), bF = Br.pts[0];
    T5.handleMove(hb, wo(be.x + 3000, be.y).x, wo(be.x + 3000, be.y).y); const bMax = Br.L / BL0; ok(bMax <= 2 + 1e-6 && bMax > 1.9 && inR(Br.f, 'bar'), `bars stretch to 2x only (${bMax.toFixed(2)}x), note in C4-C7 (${Br.f.toFixed(1)} Hz)`);
    T5.handleMove(hb, bF.x + .001, bF.y); const bMin = Br.L / BL0; ok(bMin >= .5 - 1e-6 && bMin < .52 && inR(Br.f, 'bar'), `bars shrink to 0.5x only (${bMin.toFixed(2)}x), note in C4-C7 (${Br.f.toFixed(1)} Hz)`); T5.handleUp(hb); } else ok(false, 'a drawn bar to stretch');
  { const hs = T5.handleDown({ th: St, end: 0 }), hm = T5.handleDown({ th: Mm, rim: true });
    const F0 = { ...St.pts[0] }, cm = { x: Mm.x, y: Mm.y }; let dn = Date.now; const t0 = dn(); let tt = t0; Date.now = () => tt;
    const sMove = k => T5.handleMove(hs, F0.x + k * St.L0, F0.y), mMove = k => T5.handleMove(hm, cm.x + k * Mm.r, cm.y);
    sMove(-.8); tt += 1000; const f1 = St.f, c0 = nb.length;
    sMove(-.4); mMove(1.7); const a1 = nb.length - c0, f2 = St.f; tt += 30; sMove(-.8); const a2 = nb.length - c0; tt += 45; sMove(-.4); const a3 = nb.length - c0; Date.now = dn; ok(f1 !== f2, `the test moves land on different notes (${f1.toFixed(1)} / ${f2.toFixed(1)} Hz)`);
    ok(a1 === 2, `two different objects re-strike together, no limit across them (${a1}; string ${St.f.toFixed(1)}, drum ${Mm.f.toFixed(1)} A ${(Mm.A / Mm.A0).toFixed(2)})`); ok(a2 === a1, 'the same string 30 ms later: held back'); ok(a3 === a2 + 1, 'the same string 75 ms later: re-strikes (70 ms per object)'); T5.handleUp(hs); T5.handleUp(hm); }
  THING_OPTS.ends = false; ok(!T5.handleAt(e1.x, e1.y), 'panel switch off: no handles'); THING_OPTS.ends = true; }
// F++: jam-tuned strings (Wilbow 2:25 AM Oct 23; V08 D; INSTRUMENT_PALETTE 4.2)
{ const L = {}, nb = [], bz = { on(t, f) { (L[t] || (L[t] = [])).push(f); }, ctl() {}, note(ev) { nb.push(ev); for (const f of L.note || []) f(ev); } };
  const om = { id: 77, scale: 'ohm', body: { x: 0, y: 0 } }, sm = { ohms: [], bounds: sim.bounds, cam: { x: 0, y: 0, z: 1 } }, T7 = createThings({ sim: sm, bus: bz, music });
  for (const yy of [300, 310, 320]) T7.stroke(line(150, yy, 252 + (yy - 300) * .05, yy, 30, 600), toW);   // three nearly equal strings near the ohm (plain snap would merge them)
  T7.stroke(line(150, 900, 300, 900, 30, 600), toW); const far = T7.list[3], ff0 = far.f; const near3 = T7.list.slice(0, 3);
  ok(near3.every(t => t.kind === 'string') && far.kind === 'string', 'three strings by a jam + one far away');
  ok(new Set(near3.map(t => t.f.toFixed(3))).size < 3, `drawn alone, nearly equal strings share a note (${near3.map(t => t.f.toFixed(1))})`);
  T = 100; bz.note({ src: om, kind: 'note', deg: 0, t: T }); const kOld = music.key; music.setKey(kOld + 2); T += 2.5; T7.onBar();
  const cs = music.cents(), inKey = f => { const c = 1200 * Math.log2(f / music.tonicHz), r = ((c % 1200) + 1200) % 1200; return cs.some(k => Math.abs(k - r) < .01 || Math.abs(k + 1200 - r) < .01); };
  ok(near3.every(t => t.tied && inKey(t.f)), `tied strings take the jam's new key (key ${kOld} -> ${music.key}): ${near3.map(t => t.f.toFixed(1))} Hz`);
  const byLen = near3.slice().sort((a, b) => b.L - a.L); ok(byLen.every((t, i) => !i || t.f > byLen[i - 1].f), 'each a note strictly above the next longer one (longer = lower kept, no shared notes)');
  ok(!far.tied && far.f === ff0, 'a string out of reach of any jam keeps its pitch');
  const n0 = nb.length; T7.play(near3[0], .7, undefined, 'player'); const pe = nb[n0]; ok(pe.feedW === .8 && pe.deg != null && pe.f === near3[0].f, 'a player tap on a tied string is heard by the harmony (deg, weight .8)');
  T7.play(near3[0], .5); ok(nb[n0 + 1].feedW == null, 'an ohm bumping it is not a player voice');
  const fBar = near3.map(t => t.f); music.setKey(kOld + 5); ok(near3.every((t, i) => t.f === fBar[i]) && !T7.onBar(), 'mid-bar key change: nothing moves until the downbeat');
  T += 2.5; T7.onBar(); ok(near3.every(t => inKey(t.f)) && near3.some((t, i) => t.f !== fBar[i]), 'on the next downbeat they retune');
  T += 30; THING_OPTS.jamTune = false; music.setKey(kOld); const fOff = near3.map(t => t.f); T7.onBar(); ok(near3.every((t, i) => t.f === fOff[i]), 'panel switch off: strings stay'); THING_OPTS.jamTune = true;
  T7.onBar(); T += 2.5; T7.onBar(); ok(near3.every(t => !t.tied), 'no ohm played for 2 bars: untied'); music.setKey(kOld); T = 0;
  // Music Theory 3:01 PM Oct 25: each string's own pitch snaps to its nearest note (not rising notes handed out in order), maqam microtones included
  { const mq = [0, 150, 300, 500, 700, 850, 1000], M2 = Object.create(music); M2.cents = () => mq; const T8 = createThings({ sim: sm, bus: bz, music: M2 });
    for (const [y, x2] of [[300, 250], [320, 330], [340, 330.5]]) T8.stroke(line(150, y, x2, y, 30, 600), toW); const s8 = T8.list.slice(0, 3); T = 200; bz.note({ src: om, kind: 'note', deg: 0, t: T }); T += 2.5; T8.onBar();
    const nearest = f => { const c = 1200 * Math.log2(f / M2.tonicHz); let b = 0, bd = 1e9; for (let o = -6; o <= 6; o++) for (const k of mq) { const d = Math.abs(o * 1200 + k - c); if (d < bd) { bd = d; b = o * 1200 + k; } } return b; }, cOf = f => 1200 * Math.log2(f / M2.tonicHz);
    const raw = s8.map(t => pitchFor(t.kind, t.L, t.A)); ok(s8.every(t => t.tied) && Math.abs(cOf(s8[0].f) - nearest(raw[0])) < .01, `a short string far above the others keeps its own nearest note (${s8[0].f.toFixed(1)} Hz), not the next note up from them`);
    const r = ((cOf(s8.map(t => t.f).sort((a, b) => a - b)[0]) % 1200) + 1200) % 1200, all = s8.map(t => ((cOf(t.f) % 1200) + 1200) % 1200); ok(all.every(c => mq.some(k => Math.abs(k - c) < .01)), `every string sits on a maqam note, microtones included (${all.map(c => c.toFixed(0))} cents)`);
    const [lo, hi] = s8[1].L > s8[2].L ? [s8[1], s8[2]] : [s8[2], s8[1]]; ok(Math.abs(cOf(lo.f) - nearest(pitchFor('string', lo.L, 0))) < .01 && hi.f > lo.f, 'two that land on the same note: the lower keeps it, the higher-drawn one goes up to the next scale note');
    T = 0; } }
// MT item 7: the percussion gene
{ const g = Array.from({ length: 2000 }, (_, i) => percGene(i + 1)); ok(g.every(x => x >= 0 && x < 1) && percGene(7) === percGene(7) && g.filter(x => x < .5).length > 900 && g.filter(x => x < .5).length < 1100, 'percussion gene: 0..1, seeded, spread evenly');
  const G = { a: .5, b: .5, c: .5, d: .5 }; let hi = 0, lo = 0; for (let s = 1; s <= 600; s++) { if (isPercRow(PALETTE.find(e => e.id === placeFor(s, { genes: Object.assign({}, G, { perc: .95 }) }).a))) hi++; if (isPercRow(PALETTE.find(e => e.id === placeFor(s, { genes: Object.assign({}, G, { perc: .05 }) }).a))) lo++; }
  ok(hi > lo * 1.3 && lo > 30, `a percussive gene starts nearer struck / membrane rows (${hi} vs ${lo} of 600), the rest still reachable`); }
console.log(fails ? `STEP5_FAIL ${fails}` : 'STEP5_OK'); process.exit(fails ? 1 : 0);
