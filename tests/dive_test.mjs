// module test (node, no browser): the DIVE (dive.js, layered zoom first slice) - pinch into one ohm and down through its insides.
// Checks: the camera holds (zoom feel untouched outside), the inner layers sit in the one stack (weights sum to 1), the inside IS the
// ohm's actual sound (recipe.voicesFor parts + their real modal modes), the sound splits going in / blends going out, every inner layer
// plays, drags flow UP into the recipe + look, the ohm's state flows DOWN into the view, sideways glide + momentum + magnet, snap + leave.
import { cam } from '../www/js/view.js';
import { createSystem } from '../www/js/system.js';
import { createGalaxy } from '../www/js/galaxy.js';
import { createZoomLayers } from '../www/js/zoomlayers.js';
import { makeRecipe, recipes, voicesFor } from '../www/js/recipe.js';
import { fakeBus, fakeMusic } from './fakes.mjs';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const hash = (a, b) => { let h = Math.imul((a ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ Math.imul((b + 0x632be5ab) >>> 0, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0; };
const bus = fakeBus(), music = fakeMusic(); music.om = 64; music.bar = () => 2; music.jam = 0; music.hz = (d, o) => 220 * Math.pow(2, o || 0);
const setPath = (obj, path, v) => { const k = path.split('.'); let o = obj; for (let i = 0; i < k.length - 1; i++) { if (o[k[i]] == null) o[k[i]] = {}; o = o[k[i]]; } o[k[k.length - 1]] = v; };   /* = sim.js setPath */
bus.set = (src, path, v) => { if (path.startsWith('recipe.')) setPath(recipes.get(src.recipe), path.slice(7), v); else if (path.startsWith('src.')) setPath(src, path.slice(4), v); };
const srcs = new Map(), sim = { ohms: [], sig: { global: {} }, add: s => { srcs.set(s.id, s); return s; } };
const W = { seed: 12345, vw: 412, vh: 915, N: 64, opts: { planet: true }, layers: new Map(), walk: 0, home: { om: 64 }, planet: { ring: 7, C: 7, ownR: 1, busy: 0 }, floorF: () => .6, healAt: () => .7, sizeOf: r => r };
W.land = k => { W.system.cur = k; };
cam.sim = { x: 0, y: 0, z: 1 }; cam.z = 0; cam.active = true;
createSystem(W, sim, bus, music, hash); createGalaxy(W, W.system, music, hash); const K = createZoomLayers(W, sim, bus, music), D = K.dive;
// an ohm with a two-voice recipe (modal body + instrument), at world (0, 0) -> screen (206, 329.4) at 412 x 915
const rec = makeRecipe(4242, { name: 'diver' }); rec.mix.modal = .6; rec.mix.synth = .6; if (rec.synth.family !== 'auto') rec.synth.family = rec.synth.family || 'eADD';
const o = { id: 7, scale: 'ohm', recipe: rec.id, hue: 120, body: { x: 0, y: 0 }, g: { r: 1 }, glow: 0 }; sim.ohms.push(o); sim.sig[7] = { 'sound.level': 0 };
const shapeSnap = () => JSON.stringify([rec.modal.fam, rec.modal.p.damp, rec.mix, rec.shape || null]);
const Wd = 412, Hd = 915, sx = 206, sy = Hd * .36;
ok(['voices', 'partials', 'wave'].every(id => K.get(id)) && K.list[0].id === 'wave' && K.list.findIndex(d => d.id === 'planet') === 3, 'inner layers in the one stack, deepest first: wave, partials, voices, then planet');
// ---- the gesture ----
ok(D.zoom(.1, 20, 800, 0, 0, Wd, Hd) === false && !D.o, 'zooming in over bare ground is the normal zoom (no dive)');
cam.z = -1; ok(D.zoom(-.9, sx, sy, 0, 0, Wd, Hd) === false && !D.o, 'out at planet scale (z -1) a pinch never dives'); cam.z = 0;
ok(D.zoom(-.1, sx, sy, 0, 0, Wd, Hd) === false && !D.o, 'zooming OUT over an ohm never dives');
ok(D.zoom(.2, sx + 30, sy + 10, 0, 0, Wd, Hd) === true && D.o === o, 'spreading two fingers with the midpoint on the ohm = dive into it');
ok(cam.z === 0 && cam.sim.z === 1, 'the world camera holds still while you dive (zoom feel elsewhere untouched)');
ok(bus.posts.some(e => e.type === 'dive.enter' && e.src === o), 'posts dive.enter');
// ---- the actual sound, broken into parts ----
D.f0 = 220; D.analyse(true); const msgs = voicesFor(rec, { f: 220, vel: .7, pos: .35, dur: 1, src: 7, fx: -1 }, {}, null);
ok(D.parts.length === msgs.length && D.parts.length >= 1, `voices = its real voice parts (${D.parts.map(p => p.name).join(' + ')})`);
const body = D.parts.find(p => p.kind === 'body'), bm = msgs.find(m => m.t === 'note');
ok(!body || (body.partials.length === bm.modes.length && body.partials.every(q => bm.modes.some(m => Math.abs(m.f - q.f) < 1e-6))), `the body's partials ARE its modal modes (${body ? body.partials.map(q => Math.round(q.f)).join(' ') : '-'} Hz)`);
ok(D.parts.every(p => p.partials.length <= 16 && p.partials.every((q, k) => k === 0 || q.f >= p.partials[k - 1].f)), 'at most 16 partials per voice, low to high');
// ---- weights at every inner depth ----
let wOK = true; for (const z of [0, .3, 1, 1.5, 2, 2.7, 3]) { D.z = z; const w = K.weights(cam.z); let s = 0; for (const k in w) s += w[k]; if (Math.abs(s - 1) > 1e-9) wOK = false; }
ok(wOK, 'all layer weights still sum to 1 at every dive depth');
D.z = 1; K.weights(); ok(K.focus().id === 'voices', 'dive 1: you are in its voices'); D.z = 2; K.weights(); ok(K.focus().id === 'partials', 'dive 2: its partials'); D.z = 3; K.weights(); ok(K.focus().id === 'wave', 'dive 3: the wave');
// ---- split going in, blend going out ----
const note = z => { D.z = z; const m = voicesFor(rec, { f: 220, vel: .7, pos: .35, dur: 1, src: 7, fx: -1 }, {}, null), g0 = m.map(x => x.gain); const out = D.split(o, m, { f: 220, vel: .7, dur: 1 }); return { out, g0 }; };
D.z = 0; ok(note(0).out === null, 'at the ohm (dive 0) its sound is untouched (blended)');
D.z = 1; cam.active = false; D.tick(.016); cam.active = true; const n1 = note(1), fk = D.parts[D.f[1]].kind;
if (D.parts.length > 1) { const oth = n1.out.filter(m => (m.t === 'note' ? 'body' : 'tone') !== fk && m.t !== (fk === 'body' ? 'note' : 'inst')); ok(n1.out.length === n1.g0.length && oth.every(m => m.gain < .5 * Math.max(...n1.g0)), `dive 1: the focus voice (${fk}) full, the others at rest level (split)`); }
else ok(n1.out.length === 1, 'dive 1: one voice, heard whole');
const n15 = note(1.5), n2 = note(2), modesN = r => r.out.filter(m => m.t === 'note' && m.click === 0).reduce((s, m) => s + m.modes.length, 0);
ok(modesN(n2) > 0 && n2.out.every(m => m.t !== 'note' || m.modes.length <= 8), `dive 2: the focused voice is rebuilt from its partials (${modesN(n2)} sines, <= 8 per dsp voice)`);
ok(modesN(n15) <= modesN(n2), `partials come in from the bottom up (${modesN(n15)} at 1.5 -> ${modesN(n2)} at 2)`);
D.z = 3; cam.active = false; D.tick(.016); cam.active = true; const n3 = note(3), fp = D.parts[D.f[1]].partials[D.f[3]];
const top = n3.out.filter(m => m.t === 'note' && m.click === 0).flatMap(m => m.modes).sort((a, b) => b.a - a.a)[0];
ok(top && fp && Math.abs(top.f - fp.f) < 1e-6, `dive 3: the focused wave lane's partial leads (${top ? Math.round(top.f) : '-'} Hz)`);
const back = note(0); ok(back.out === null, 'zooming back out blends it together again');
// ---- play every inner layer ----
D.z = 1; bus.notes.length = 0; D.play(1, 0, .8); const pe = bus.notes[0]; ok(pe && pe.src === o && pe.dive && pe.dive.part === 0, 'dive 1: tap a voice = the ohm plays through that voice');
const solo = D.split(o, voicesFor(rec, { f: 220, vel: .8, pos: .35, dur: 1, src: 7, fx: -1 }, {}, null), pe); ok(solo.length >= 1 && solo.every(m => (m.t === 'note' ? 'body' : 'x') === (D.parts[0].kind === 'body' ? 'body' : 'x')), 'the tapped voice sounds alone');
D.z = 2; bus.notes.length = 0; D.play(2, 2, .8); const pp = bus.notes[0], solo2 = D.split(o, voicesFor(rec, { f: 220, vel: .8, pos: .35, dur: 1, src: 7, fx: -1 }, {}, null), pp), q2 = D.parts[D.f[1]].partials[2];
ok(!q2 || (solo2.length === 1 && solo2[0].modes.length === 1 && Math.abs(solo2[0].modes[0].f - q2.f) < 1e-6), `dive 2: tap a partial = that sine alone (${q2 ? Math.round(q2.f) : '-'} Hz)`);
D.z = 1; D.W = Wd; D.H = Hd; cam.active = false; D.tick(.016); cam.active = true;
bus.notes.length = 0; const p0 = D.parts[D.f[1]], cx = D.ox + p0.lx * D.scale(1), cy = D.oy + p0.ly * D.scale(1); D.down(cx, cy, .7); D.up(cx, cy, 120);
ok(bus.notes.length === 1 && bus.notes[0].dive.part === D.f[1], 'a real tap (down / up) on the focus voice plays it');
// ---- UP: a vertical drag on a voice / partial changes the ohm ----
const pk = D.parts[D.f[1]], path = pk.kind === 'body' ? 'modal' : 'synth', v0 = rec.mix[path]; D.down(cx, cy, .7); D.move(cx, cy - 60); D.up(cx, cy - 60, 400);
ok(rec.mix[path] > v0, `UP: dragging the ${pk.name} up raises its level in the recipe (mix.${path} ${v0.toFixed(2)} -> ${rec.mix[path].toFixed(2)})`);
D.z = 2; cam.active = false; D.tick(.016); cam.active = true; const q = D.parts[D.f[1]].partials[D.f[2]], o2 = D.origin(2, {}), qx = o2.x + q.lx * D.scale(2), qy = o2.y + q.ly * D.scale(2);
const b0 = rec.modal.p.bright, c0 = rec.synth.genes.cut, h0 = o.hue; await new Promise(r => setTimeout(r, 60)); D.down(qx, qy, .7); D.move(qx, qy - 80); D.up(qx, qy - 80, 400);
ok(rec.modal.p.bright > b0 || rec.synth.genes.cut > c0 || (rec.shape && rec.shape.synth.cut > 0), 'UP: dragging a partial up brightens the voice (modal brightness / filter)');
ok(o.hue !== h0, `UP: ... and the ohm's look follows (hue ${h0} -> ${o.hue.toFixed(1)})`);
ok(D.key !== '' && D.analyse() === D.parts, 'the inside re-reads the changed recipe');
// ---- SHAPE (q360 'C'): sideways on the part / partial in the middle shapes the sound; never pitch; saved with the ohm ----
{ const { toJSON, fromJSON } = await import('../www/js/recipe.js'); const wait = () => new Promise(r => setTimeout(r, 60));
  const pitch = () => { const m = voicesFor(rec, { f: 220, vel: .7, pos: .35, dur: 1, src: 7, fx: -1 }, {}, null); return m.map(v => v.t === 'note' ? v.modes[0].f.toFixed(6) : v.f != null ? (+v.f).toFixed(6) : 'tract').join(','); };
  const pitch0 = pitch(); ok(D.opts.shape === true, 'shape toggle is ON by default');
  D.z = 2; cam.active = false; D.tick(.016); cam.active = true; const pt2 = D.parts[D.f[1]], q = pt2.partials[D.f[2]], o2 = D.origin(2, {}), qx = o2.x + q.lx * D.scale(2), qy = o2.y + q.ly * D.scale(2);
  const d0 = rec.modal.p.damp, r0 = (rec.shape && rec.shape.synth && rec.shape.synth.reso) || 0, n0 = bus.notes.length; await wait(); D.down(qx, qy, .7); D.move(qx + 90, qy); D.up(qx + 90, qy, 400);
  const r1 = (rec.shape && rec.shape.synth && rec.shape.synth.reso) || 0;
  ok(pt2.kind === 'body' ? rec.modal.p.damp > d0 : r1 > r0, `SHAPE depth 2: sideways on the middle partial = how the partials ring (${pt2.kind === 'body' ? `damping ${d0.toFixed(2)} -> ${rec.modal.p.damp.toFixed(2)}` : `resonance ${r0.toFixed(2)} -> ${r1.toFixed(2)}`})`);
  const other = pt2.partials.findIndex((p, k) => k !== D.f[2]); if (other >= 0) { const qo = pt2.partials[other], ox2 = o2.x + qo.lx * D.scale(2), oy2 = o2.y + qo.ly * D.scale(2), keep = shapeSnap(), m0 = bus.notes.length; await wait(); D.down(ox2, oy2, .7); D.move(ox2 + 90, oy2); D.up(ox2 + 90, oy2, 400);
    ok(shapeSnap() === keep, 'SHAPE: sideways from any other partial is still a strum (the recipe is not touched)'); }
  D.z = 1; cam.active = false; D.tick(.016); cam.active = true; const at = i => ({ x: D.ox + D.parts[i].lx * D.scale(1), y: D.oy + D.parts[i].ly * D.scale(1) });
  const bi = D.parts.findIndex(p => p.kind === 'body'), ii = D.parts.findIndex(p => p.kind !== 'body' && p.kind !== 'sample');
  if (bi >= 0) { D.f[1] = bi; const P = at(bi), f = rec.modal.fam, m0 = (f.membrane + 2 * f.bar) / (f.string + f.membrane + f.bar); await wait(); D.down(P.x, P.y, .7); D.move(P.x + 120, P.y); D.up(P.x + 120, P.y, 400); const g = rec.modal.fam, m1 = (g.membrane + 2 * g.bar) / (g.string + g.membrane + g.bar);
    ok(m1 > m0, `SHAPE depth 1: sideways on the body = its material, string -> skin -> bar (${m0.toFixed(2)} -> ${m1.toFixed(2)})`); }
  if (ii >= 0) { D.f[1] = ii; const nm = D.parts[ii].name, nP = D.parts.length, P = at(ii), T0 = Math.max(rec.mix.modal, rec.mix.synth), c0 = rec.mix.synth / (rec.mix.modal + rec.mix.synth); await wait(); D.down(P.x, P.y, .7); D.move(P.x - 120, P.y); D.up(P.x - 120, P.y, 400); const T1 = Math.max(rec.mix.modal, rec.mix.synth), c1 = rec.mix.synth / (rec.mix.modal + rec.mix.synth);
    ok(c1 < c0 && rec.mix.synth > .01 && Math.abs(T1 - T0) < .02 && D.parts.length === nP, `SHAPE depth 1: sideways on the ${nm} = its share of the blend with the body (${Math.round(c0 * 100)}% -> ${Math.round(c1 * 100)}%, the louder level kept, both voices stay)`); }
  ok(pitch() === pitch0, `SHAPE never moves pitch (fundamentals ${pitch0} unchanged)`);
  rec.shape = rec.shape || {}; rec.shape.synth = Object.assign({}, rec.shape.synth, { cut: -.4 }); const lo = voicesFor(rec, { f: 220, vel: .7, pos: .35, dur: 1, src: 7, fx: -1 }, {}, null).find(m => m.t === 'inst' && m.P);
  rec.shape.synth.cut = .4; const hi = voicesFor(rec, { f: 220, vel: .7, pos: .35, dur: 1, src: 7, fx: -1 }, {}, null).find(m => m.t === 'inst' && m.P);
  ok(!lo || (hi.P.cut > lo.P.cut && hi.f === lo.f), `SHAPE: the instrument's filter really moves (${lo ? `${Math.round(lo.P.cut)} -> ${Math.round(hi.P.cut)} Hz` : 'no instrument voice'}), its pitch does not`);
  const back = fromJSON(toJSON(rec)); ok(back.shape && back.shape.synth.cut === .4 && Math.abs(back.modal.fam.bar - rec.modal.fam.bar) < 1e-9 && Math.abs(back.mix.synth - rec.mix.synth) < 1e-9, 'SHAPE: saved with the ohm (recipe save / load keeps shape, body material, blend)');
  D.opts.shape = false; D.z = 2; cam.active = false; D.tick(.016); cam.active = true; { const q = D.parts[D.f[1]].partials[D.f[2]], o2 = D.origin(2, {}), x = o2.x + q.lx * D.scale(2), y = o2.y + q.ly * D.scale(2), keep = shapeSnap(); await wait(); D.down(x, y, .7); D.move(x + 90, y); D.up(x + 90, y, 400);
    ok(shapeSnap() === keep, 'shape toggle off: sideways is a strum again'); } D.opts.shape = true; }
// ---- DOWN: the ohm's state shapes the inside ----
const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
sim.sig[7]['sound.level'] = 0; D.draw(ctx, Wd, Hd, 1); const l0 = D.view.lit; sim.sig[7]['sound.level'] = 1; o.glow = 1; D.draw(ctx, Wd, Hd, 1); const l1 = D.view.lit;
ok(l1 > l0, `DOWN: its sound level + glow light the inside (${l0.toFixed(2)} -> ${l1.toFixed(2)})`);
let calls = 0; D.draw(ctx, Wd, Hd, 1, { diveBack: () => calls++, diveVoice: () => calls++, divePartial: () => calls++, diveWave: () => calls++ }); ok(calls >= 2, `Visuals hooks look.diveBack / diveVoice / divePartial / diveWave are called when present (${calls})`);
// ---- glide: sideways in all directions, momentum, magnet ----
D.z = 2; const ox0 = D.ox, oy0 = D.oy; D.step(0, Wd / 2, Hd / 2, 30, -20); ok(Math.abs(D.ox - ox0 - 30) < 1e-6 && Math.abs(D.oy - oy0 + 20) < 1e-6, 'two fingers moving glide the inside sideways (x and y)');
D.gvx = 400; D.gvy = 0; const ox1 = D.ox; cam.active = false; D.tick(.05); ok(D.ox > ox1, 'the glide keeps going after you let go (momentum)');
for (let i = 0; i < 300; i++) D.tick(.016); const fq = D.parts[D.f[1]].partials[D.f[2]], o3 = D.origin(2, {}), fx = o3.x + fq.lx * D.scale(2), fy = o3.y + fq.ly * D.scale(2);
ok(Math.hypot(fx - Wd / 2, fy - Hd / 2) < 4, `the focus eases to the middle (magnet; ${Math.hypot(fx - Wd / 2, fy - Hd / 2).toFixed(1)} px off)`);
// ---- snap + arrive + leave ----
cam.active = true; D.z = 1.75; D.dir = 1; D.deepest = 1; D.landed = 1; cam.active = false; bus.notes.length = 0; for (let i = 0; i < 200; i++) D.tick(.016);
ok(D.z === 2, `let go heading in: it snaps to the next inner layer (${D.z})`); ok(bus.notes.some(e => e.dive), 'arriving on a new inner layer plays its note through it');
cam.active = true; D.zoom(-1.2, Wd / 2, Hd / 2, 0, 0, Wd, Hd); ok(D.o === o && Math.abs(D.z - .8) < 1e-9, 'pinching out goes back up the inside');
D.zoom(-1, Wd / 2, Hd / 2, 0, 0, Wd, Hd); ok(!D.o && bus.posts.some(e => e.type === 'dive.leave'), 'pinching out past the ohm leaves the dive (back to the normal zoom)');
ok(cam.z === 0, 'the world camera never moved');
cam.active = true; D.zoom(.3, sx, sy, 0, 0, Wd, Hd); D.opts.on = false; D.zoom(.1, sx, sy, 0, 0, Wd, Hd); ok(!D.o, 'toggle off: no dive');
ok(![...srcs.keys()].some(i => i >= 150), 'no new sim sources: the inside plays through the ohm itself');
console.log(fails ? `${fails} FAILED` : 'DIVE OK'); process.exit(fails ? 1 : 0);
