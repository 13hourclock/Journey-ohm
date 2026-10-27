// look/ foundation (Visuals track): sprite LRU + memory cap + bake budget, one key light, continuous mix + peak envelope,
// per-bar palette cache, quality rungs, read-only on world/music, hook leaves the context clean. node-canvas, no screenshots.
import { createCanvas, canvasNote, realCanvas } from './_canvas.mjs'; console.log(canvasNote);
import { createMusic } from '../www/js/music.js';
import { createEvents } from '../www/js/events.js';
import { createLook, createSprites, createMix, createPalette, rung } from '../www/js/look/index.js';
import { RUNGS } from '../www/js/look/quality.js';
import { ridgeProfile } from '../www/js/look/ground.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const mk = (w, h) => createCanvas(w, h);
// sprites: cap + LRU + budget
const S = createSprites({ makeCanvas: mk, capBytes: 1 << 20, bakesPerFrame: 1000 });
for (let i = 0; i < 400; i++) S.glow((i * 37) & 255, (i * 91) & 255, (i * 13) & 255, 20 + (i % 5) * 9);
ok(S.bytes <= 1 << 20 && S.stats.evicted > 0, `sprite cache stays under its cap (${(S.bytes / 1024).toFixed(0)} KB of 1024, ${S.stats.evicted} evicted)`);
const a = S.glow(200, 100, 50, 30), h0 = S.stats.hits; S.glow(205, 104, 52, 31); ok(S.stats.hits === h0 + 1 && a, 'nearby colour + size reuse one bucketed sprite');
S.beginFrame(2); let made = 0; for (let i = 0; i < 6; i++) if (S.glow(i * 40, 9, 9, 100 + i * 40)) made++; ok(made === 2 && S.stats.skipped >= 4, `bake budget: 2 per frame (${made} baked, rest skipped to the cheaper path)`);
// rungs: every effect has q0..q3
ok(Object.values(RUNGS).every(r => r.length === 4) && rung('glow', 3).on === 0 && rung('glow', 9).on === 0, 'every effect declares 4 rungs; q3 drops glow');
// music + mix
let T = 0; const music = createMusic(() => T), bus = createEvents(music);
const mix = createMix(); mix.step({}, { music, bus }); let maxD = 0, prev = mix.mixed;
for (let i = 0; i < 600; i++) { T += 1 / 60; if (i % 15 === 0) bus.note({ src: { id: 1, scale: 'ohm' }, kind: 'note', deg: i % 7 }); mix.step({}, { music, bus }); maxD = Math.max(maxD, Math.abs(mix.mixed - prev)); prev = mix.mixed; }
ok(maxD < .02 && mix.trip > 0 && mix.trip < 1, `mix is continuous (max step ${maxD.toFixed(4)}/frame, trip ${mix.trip.toFixed(3)})`);
const p0 = mix.peak; music.setKey(7); T += 1 / 60; mix.step({}, { music, bus }); for (let i = 0; i < 20; i++) { T += 1 / 60; mix.step({}, { music, bus }); }
const pk = mix.peak; for (let i = 0; i < 60 * 12; i++) { T += 1 / 60; mix.step({}, { music, bus }); }
ok(pk > .8 && p0 < .05 && mix.peak < .05, `key change -> peak ${pk.toFixed(2)}, decays to ${mix.peak.toFixed(3)} after ~12 beats`);
const m2 = createMix(); m2.step({ t: 0, trip: .7 }); for (let i = 1; i < 600; i++) m2.step({ t: i / 60, trip: .7, burst: i === 300 ? 1 : 0 });
ok(Math.abs(m2.trip - .7) < .02, `world-provided st.trip is followed (${m2.trip.toFixed(3)})`);
// palette: per-bar cache
const pal = createPalette(); const v0 = pal.ver; T = 100; for (let i = 0; i < 240; i++) { T += 1 / 60; pal.update({ t: T }, { mixed: .3 }, music); }
ok(pal.ver - v0 <= 2, `palette rebuilt ${pal.ver - v0}x in 4 s at 60 BPM (per bar, not per frame)`);
const real = createPalette(); real.update({ t: T }, { mixed: 0 }, music); const tr = createPalette(); tr.update({ t: T }, { mixed: 1 }, music);
const sat = c => (Math.max(...c) - Math.min(...c)) / 255; ok(sat(tr.color(2)) > sat(real.color(2)) + .2, `trippy end is more saturated (${sat(real.color(2)).toFixed(2)} -> ${sat(tr.color(2)).toFixed(2)})`);
// hook: read-only + clean context
const sim = { ohm: { id: 1, hue: 200, glow: .5, look: { glow: .2 } }, sources: [], sig: { global: {} } };
const snap = () => JSON.stringify({ k: music.key, c: music.chord, b: music.bpm, a: music.a, o: sim.ohm, s: sim.sig });
const look = createLook({ sim, music, bus, makeCanvas: mk }); const c = createCanvas(400, 400), g = c.getContext('2d'); const before = snap();
for (let i = 0; i < 30; i++) { T += 1 / 60; look.frame({ t: T, W: 400, H: 400, q: i % 4 }); look.ohm && look.ohm(g, sim.ohm, 200, 200, 40, {}); }
ok(snap() === before, 'look reads world + music only (state unchanged after 30 frames)');
ok(g.globalCompositeOperation === 'source-over' && g.globalAlpha === 1, 'look.ohm leaves composite source-over and alpha 1');
{ const off = createLook({ sim, music, bus, makeCanvas: mk, opts: { realLook: false } });
  ok(!look.palette && (!look.post || !!look.api.audio) && typeof look.layer === 'function' && typeof look.ohm === 'function' && !off.layer && !off.palette && !off.post, 'defaults: ohm light on; palette + post off until a look is picked (post = only the real look\'s audio light, look/audio.js) (P1 behind opts.p1); layer only for the real look\'s own field kaleidoscope');
  const c2 = createCanvas(400, 400), g2 = c2.getContext('2d'); look.frame({ t: T, W: 400, H: 400, q: 0, trip: .6, A: { x: 200, y: 120 } });
  const KL = (g, ...a) => { look.layer(g, ...a); if (look.api.flush) look.api.flush(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 400, 400); return look.layer(g, ...a); };   // v0.0.21: a bar's kaleidoscope layers bake in idle time (flush = the idle slice)
  const own = KL(g2, { sym: 6, phase: 0, rough: .3 }, 1, { t: T, W: 400, H: 400, trip: .6, A: { x: 200, y: 120 } }, 'field'), d = g2.getImageData(0, 0, 400, 400).data;
  let top = 0, bot = 0; for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x += 2) { const v = d[(y * 400 + x) * 4 + 3]; if (y < 150) top += v; else if (y > 220) bot += v; }
  ok(own === true && (!realCanvas || (top > 0 && bot === 0)) && g2.globalCompositeOperation === 'source-over' && g2.globalAlpha === 1, `real look owns the field kaleidoscope (returns true; ${realCanvas ? `drawn in the sky only: sky ${top}, land ${bot}` : 'pixels not checked: no node-canvas, stub ctx'})`); }   // pixel half needs a real canvas (the stub's getImageData is all 0)
  { // v0.0.19 kaleidoscope input seam: look.api.kaleidoIn numbers replace the derived inputs (for the future sound mapping), null = derived
    const g3 = createCanvas(400, 400).getContext('2d'), sky = g => { const d = g.getImageData(0, 0, 400, 150).data; let s = 0; for (let i = 3; i < d.length; i += 8) s += d[i]; return s; };
    const st = { t: T, W: 400, H: 400, trip: .6, A: { x: 200, y: 120 } }, KL = (g, ...a) => { look.layer(g, ...a); if (look.api.flush) look.api.flush(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 400, 400); return look.layer(g, ...a); };
    look.api.kaleidoIn = { big: 1, sym: 8 }; KL(g3, { sym: 6, phase: 0, rough: .3 }, 1, st, 'field'); const kz = Object.assign({}, look.api.kz), a1 = sky(g3);
    look.api.kaleidoIn = null; const g4 = createCanvas(400, 400).getContext('2d'); KL(g4, { sym: 6, phase: 0, rough: .3 }, 1, st, 'field'); const a0 = sky(g4);
    ok(kz.big === 1 && kz.bigS === 1 && look.api.kz.big < 1 && (!realCanvas || a1 > a0), `kaleidoIn seam: big 1 -> bigS ${kz.bigS}, lines ${kz.lineA.toFixed(2)}, ${realCanvas ? `sky alpha ${a1} > derived ${a0}` : 'alpha not checked: no node-canvas, stub ctx'}`); }
{ // v0.0.21 item 1: at rest no lit lines. world.js bangs burst .25 on every chord-root change; that is not a big moment (knee .35)
  const Lb = createLook({ sim, music, bus, makeCanvas: mk }), gb = createCanvas(400, 400).getContext('2d'), run = (b, n, t0) => { let la = 0; for (let i = 0; i < n; i++) { const st = { t: t0 + i * .05, W: 400, H: 400, q: 0, trip: .4, burst: b, A: { x: 200, y: 120 } }; Lb.frame(st); Lb.layer(gb, { sym: 6, phase: 0, rough: .3 }, 1, st, 'field'); la = Math.max(la, Lb.api.kz.lineA); } return la; };
  const rest = run(.25, 80, T), hit = run(.9, 4, T + 4);
  ok(rest < .02 && hit > .3, `kaleido: chord-root burst .25 -> lit lines ${rest.toFixed(3)} (none at rest); a real burst .9 -> ${hit.toFixed(2)}`); }
// P1 (opts.p1): one continuous place state, swells that land on the beat, jam lace, clean ctx
{ let HEAL = 0; const simH = { ...sim, healAt: () => .5 + .5 * HEAL };   // sim.healAt contract: .5 .. 1
  const L1 = createLook({ sim: simH, music, bus, makeCanvas: mk, opts: { p1: true } }), Pl = L1.api.place;
  ok(typeof L1.palette === 'function' && typeof L1.layer === 'function' && typeof L1.post === 'function', 'opts.p1 turns on palette + layer + post together (one flag)');
  let maxS = 0, pv = null, lo = null, hi = null; T = 200;
  for (let i = 0; i < 60 * 40; i++) { T += 1 / 60; const heal = Math.min(1, i / (60 * 30)); HEAL = heal; L1.frame({ t: T, W: 400, H: 400, q: 0, trip: heal });
    const v = Pl.dust + Pl.vivid + Pl.colour; if (pv != null) maxS = Math.max(maxS, Math.abs(v - pv)); pv = v; if (i === 60) lo = { ...Pl }; }
  hi = { ...Pl };
  ok(lo.dust > .8 && lo.vivid < .05 && hi.dust < .05 && hi.vivid > .8 && hi.colour > .9 && maxS < .02, `place state is continuous: unhealed dust ${lo.dust.toFixed(2)} vivid ${lo.vivid.toFixed(2)} -> harmonised dust ${hi.dust.toFixed(2)} vivid ${hi.vivid.toFixed(2)} (max step ${maxS.toFixed(4)})`);
  const pal1 = L1.palette({ hue: 100, spread: 60 }, {}); ok(pal1.sat > 50 && pal1.light > .9, `harmonised palette is vivid in world units (sat ${pal1.sat.toFixed(0)}%, light x${pal1.light.toFixed(2)})`);
  // swell: a burst mid-beat; its top lands on the next beat and it settles back by a bar line, 1-4 bars (x stretch)
  const swellRun = stretch => { HEAL = .8; const Lx = createLook({ sim: simH, music, bus, makeCanvas: mk, opts: { p1: { swellStretch: stretch, warmBars: 0 } } }), P = Lx.api.place; let t = 300.37, top = 0, topB = 0, endB = null;
    for (let i = 0; i < 60 * 40; i++) { t += 1 / 60; Lx.frame({ t, W: 400, H: 400, q: 0, trip: .8, burst: i === 0 ? 1 : 0 }); const b = music.beat(t); if (P.swell > top) { top = P.swell; topB = b; } if (endB == null && i > 5 && P.swell === 0) endB = b; }
    return { top, topB, endB, b0: music.beat(300.37 + 1 / 60) }; };
  const s1 = swellRun(1), s2 = swellRun(2), len1 = (s1.endB - s1.b0) / 4, len2 = (s2.endB - s2.b0) / 4;
  ok(s1.top > .8 && Math.abs(s1.topB - Math.round(s1.topB)) < .05 && len1 >= .9 && len1 <= 4.6 && Math.abs(s1.endB / 4 - Math.round(s1.endB / 4)) < .02, `big event swell lands on beat ${s1.topB.toFixed(2)}, settles by bar line (beat ${s1.endB.toFixed(2)}), ${len1.toFixed(1)} bars`);
  ok(len2 > len1 * 1.4, `context can stretch the swell (${len1.toFixed(1)} -> ${len2.toFixed(1)} bars at swellStretch 2)`);
  // only big moments open a swell: ordinary events (cadence .5, world chord-root .25, jam lock .7) do not; after a swell there is a rest gap
  { HEAL = .8; const Lg = createLook({ sim: simH, music, bus, makeCanvas: mk, opts: { p1: true } }), P = Lg.api.place; let t = 500, on = 0, n = 0;
    const run = (secs, burstAt) => { for (let i = 0; i < secs * 60; i++) { t += 1 / 60; const b = burstAt.find(x => Math.abs(x[0] - i / 60) < .5 / 60); Lg.frame({ t, W: 400, H: 400, q: 0, trip: .4, burst: b ? b[1] : 0 }); n++; if (P.swell > .01) on++; } };
    run(8, [[1, 1]]); const warmOpen = P.opens;                       // first bars: warm-up, no swell even for a strong burst
    run(30, [[2, .5], [6, .7], [10, .25], [14, .6], [20, .7]]); const ordOpen = P.opens - warmOpen;
    run(4, [[1, 1]]); const big = P.opens - warmOpen - ordOpen; let o1 = P.opens; while (P.swell > 0 || P.sw) run(1, []);
    run(6, [[1, 1]]); const gapBlocked = P.opens === o1; run(30, []); o1 = P.opens; run(4, [[1, 1]]);
    ok(warmOpen === 0 && ordOpen === 0 && big === 1 && gapBlocked && P.opens === o1 + 1, `swells only at big moments: warm-up ${warmOpen}, ordinary events ${ordOpen}, big burst ${big}, inside the rest gap ${gapBlocked ? 'blocked' : 'OPENED'}, after it ${P.opens - o1}`); }
  // 12:45 big-moment signal: when the world gives st.big / bus 'moment', ONLY that opens the swell (bursts from om changes, landings,
  // spawns do not); the .75 peak/burst rule above is just the fallback for a world without the signal
  { HEAL = .8; const Lm = createLook({ sim: simH, music, bus, makeCanvas: mk, opts: { p1: { warmBars: 0 } } }), P = Lm.api.place; let t = 900, big = 0;
    const run = (secs, ev) => { for (let i = 0; i < secs * 60; i++) { t += 1 / 60; const e = ev.find(x => Math.abs(x[0] - i / 60) < .5 / 60); if (e && e[2]) big = e[1];
      Lm.frame({ t, W: 400, H: 400, q: 0, trip: .4, burst: e && !e[2] ? e[1] : 0, big }); big *= Math.exp(-1 / 60 / 2); } };
    run(6, [[1, 1], [3, .9]]); const burstOpen = P.opens;            // strong bursts (om change / landing) with the signal present: no swell
    run(4, [[1, .8, 1]]); const bigOpen = P.opens - burstOpen; while (P.swell > 0 || P.sw) run(1, []); run(40, []);
    const o2 = P.opens; bus.post({ type: 'moment', kind: 'climax', k: .9 }); run(2, []); if (bus.flush) bus.flush(); run(2, []);
    ok(burstOpen === 0 && bigOpen === 1 && P.opens === o2 + 1, `swell opens from the big moment only: bursts ${burstOpen}, st.big ${bigOpen}, bus 'moment' ${P.opens - o2}`); }
  // ground chunks overlap GOV = 3 samples each side (render fc5a6b1): two neighbours' ridge agrees exactly at the seam, the wider face blur
  // and river fill to well under the old clamped seams (px at amp 165)
  { const f = x => .3 * Math.sin(x * .05) + .15 * Math.sin(x * .23 + 1) + .08 * Math.sin(x * .71), seam = ov => { let r = 0, fb = 0;
      const prof = ci => { const n = 33 + 2 * ov, h = new Float32Array(n); for (let i = 0; i < n; i++) h[i] = f(ci * 32 + i - ov); return ridgeProfile({ h, x0: 0, cx: ov * 6.4 }, n, 6.4, 22); };
      for (let ci = 0; ci < 30; ci++) { const A = prof(ci), B = prof(ci + 1); r = Math.max(r, Math.abs(A.hs[ov + 32] - B.hs[ov]) * 165); fb = Math.max(fb, Math.abs(A.hb[ov + 32] - B.hb[ov]) * 165); } return [r, fb]; };
    const [r0, f0] = seam(0), [r3, f3] = seam(3);
    ok(r3 < .01 && f3 < 1.5 && f0 > 3 * f3 && r0 > 1, `ground seams with the 3-sample overlap: ridge ${r3.toFixed(3)} px (clamped ${r0.toFixed(1)}), face ${f3.toFixed(2)} px (clamped ${f0.toFixed(1)})`); }
  // jam lace: two ohms that sent jam notes get collected for the between-ohms pattern
  const oA = { id: 11, hue: 30, glow: .5 }, oB = { id: 12, hue: 200, glow: .5 }; bus.note({ src: oA, kind: 'note', jam: 1, deg: 0 }); bus.note({ src: oB, kind: 'note', jam: 1, deg: 2 });
  HEAL = 1; T += 1 / 60; L1.frame({ t: T, W: 400, H: 400, q: 0, trip: 1 }); L1.ohm(g, oA, 120, 200, 30, {}); L1.ohm(g, oB, 280, 200, 30, {}); L1.ohm(g, sim.ohm, 200, 330, 30, {});
  ok(L1.F.jamN === 2, `jamming ohms found from bus jam notes (${L1.F.jamN} of 3)`);
  L1.layer(g, { hue: 100, spread: 60 }, 1, { W: 400, H: 400 }, 'field'); L1.layer(g, { hue: 100, spread: 60 }, 1, { W: 400, H: 400 }, 'over'); L1.post(g, { W: 400, H: 400, A: { x: 200, y: 200 } });
  ok(g.globalCompositeOperation === 'source-over' && g.globalAlpha === 1 && snap() === before, 'P1 layer + post leave ctx clean and world/music unchanged');
  const Lm = createLook({ sim: {}, music, bus, makeCanvas: mk, opts: { p1: true } }); for (let i = 0; i < 600; i++) { T += 1 / 60; Lm.frame({ t: T, W: 400, H: 400, q: 0, trip: .5, heal: 0, place: 0 }); }
  ok(Math.abs(Lm.api.place.heal - .5) < .02, `no sim.healAt -> one safe constant (heal ${Lm.api.place.heal.toFixed(2)}); st.heal / st.place are ignored (no fallback chain)`); }
// ---- REAL space + ground hooks: ON by default; the one opt-out is opts.realLook = false ------------------------------------------
{ const REALK = ['planet', 'star', 'ground', 'planetMat', 'groundMat', 'starMat', 'atmoMat', 'cloudMat', 'waterMat', 'coronaMat', 'readout'];
  const def = createLook({ sim: {}, music, bus, makeCanvas: mk });
  ok(REALK.every(k => typeof def[k] === 'function') && def.stats().real && def.stats().real.mode, `real hooks are ON by default (all ${REALK.length} hooks; bake mode ${def.stats().real && def.stats().real.mode})`);
  const off = createLook({ sim: {}, music, bus, makeCanvas: mk, opts: { realLook: false } });
  ok(!off.planet && !off.star && !off.ground && !off.planetMat && !off.groundMat && !off.starMat && !off.readout && off.stats().real === null, 'opts.realLook = false turns all real hooks off (the one opt-out)');
  const tun = createLook({ sim: {}, music, bus, makeCanvas: mk, opts: { realLook: { star: { flares: 5 }, bake: { mode: 'manual' } } } });
  ok(tun.api.stars.O.flares === 5 && tun.api.bakeMode === 'manual' && typeof tun.planet === 'function', 'opts.realLook = {...} tunes and stays on');
  let thr0 = null; try { const bare = createLook({ sim: {}, music, bus, makeCanvas: mk }); bare.frame({ t: 1, W: 412, H: 915 }); bare.planet(createCanvas(10, 10).getContext('2d'), {}, 5, 5, 4); bare.star(createCanvas(10, 10).getContext('2d'), 5, 5, 3); bare.ground(createCanvas(10, 10).getContext('2d'), {}, {}, undefined); bare.api.flush(); } catch (e) { thr0 = e; }
  ok(!thr0, `defaults: no throw when music / world / st fields are missing${thr0 ? ': ' + thr0.stack.split('\n').slice(0, 3).join(' | ') : ''}`);
  const sim2 = { healAt: () => .4, ohm: { id: 1 } }, world2 = { place: { season: -.6, weather: .85 } };
  const L = createLook({ sim: sim2, music, bus, world: world2, makeCanvas: mk });
  
  const c = createCanvas(412, 915), g = c.getContext('2d'); const before = JSON.stringify({ w: world2, k: music.key, b: music.bpm });
  ok(L.planet(g, { seed: 7, r: 60 }, 100, 100, 60, {}) === false, 'look.planet returns false before the first look.frame (nothing to draw with)');
  for (let i = 0; i < 20; i++) { T += 1 / 60; L.frame({ t: T, W: 412, H: 915, q: i % 4, lightDir: [.4, .6, .7] }); }
  const n = 64, h = new Float32Array(n).map((_, i) => .3 + .25 * Math.sin(i * .3)), pts = { chunk: 3, ver: 1, n, h, x0: 0, dx: 412 / (n - 1), y0: 700, amp: 160 };
  const samples = Array.from({ length: n }, (_, i) => ({ h: h[i], m: { rock: .4, soil: .3, veg: .3, sand: 0, wet: .1, ice: 0 }, hollow: 0, crack: i % 9 === 0 ? .6 : 0, fold: 0, fresh: 0, temp: .5, moist: .5 }));
  let threw = null, r = {}; try {
    r.p = L.planet(g, { seed: 7, r: 60, style: { rock: .5, ocean: .4, ice: .1, gas: 0 } }, 100, 100, 60, {}); r.p2 = L.planet(g, { seed: 9 }, 300, 100, 40, undefined);
    r.s = L.star(g, 200, 300, 50, { t: T }); r.s2 = L.star(g, 200, 300, 50);
    r.ga = L.ground(g, { i: 0 }, pts, { t: T, W: 412, H: 915 }); r.gb = L.ground(g, { i: 1, haze: .4 }, [{ x: 0, y: 700 }, { x: 200, y: 650 }, { x: 412, y: 690 }], {}); r.gc = L.ground(g, { i: 2, chunk: 4 }, samples, {});
    r.gn = L.ground(g, { i: 0 }, {}, {}); r.pn = L.planet(g, null, 0, 0, 10, {}); r.sz = L.star(g, 0, 0, 0, {});
    L.api.flush(); r.ga2 = L.ground(g, { i: 0 }, pts, { t: T, W: 412, H: 915 }); L.planet(g, { seed: 7, r: 60 }, 100, 100, 60, {});
  } catch (e) { threw = e; }
  ok(!threw, `real 2D hooks do not throw on missing fields${threw ? ': ' + threw.stack.split('\n').slice(0, 3).join(' | ') : ''}`);
  ok(r.p && r.p2 && r.s && r.s2 && r.ga && r.gb && r.gc && r.ga2, 'planet / star / ground (modes A, B, C) return true when they drew');
  ok(r.gn === false && r.pn === false && r.sz === false, 'hooks return false (nothing drawn) on empty input');
  ok(g.globalCompositeOperation === 'source-over' && g.globalAlpha === 1, 'real hooks leave composite source-over and alpha 1');
  ok(JSON.stringify({ w: world2, k: music.key, b: music.bpm }) === before, 'real hooks read world + music only (unchanged)');
  const ro = L.readout(); ok(['lit', 'heal', 'bright', 'dust', 'vivid', 'trip', 'peak', 'swell', 'season', 'weather', 'glow'].every(k => typeof ro[k] === 'number' && Number.isFinite(ro[k])), `look.readout() exposes read-only shading state (heal ${ro.heal.toFixed(2)}, lit ${ro.lit.toFixed(2)}, bright ${ro.bright.toFixed(2)}, season ${ro.season}, weather ${ro.weather})`);
  ok(Math.abs(ro.season + .6) < 1e-6 && Math.abs(ro.weather - .85) < 1e-6, 'season + weather come from world.place when the data has them');
  // Game Dev's confirmed names: river (0..1 flow), p.snowLine (planet, h units at the equator), st.snowLine (every frame)
  { let thrN = null, kA = 0, kB = 0; try { const rv = new Float32Array(n).map((_, i) => i > 28 && i < 36 ? .8 : 0);
      L.ground(g, { i: 5 }, { ...pts, chunk: 9, river: rv }, { t: T, W: 412, H: 915, snowLine: .4 }); L.ground(g, { i: 5 }, { ...pts, chunk: 9, river: rv }, { t: T, W: 412, H: 915, snowLine: .2 });
      kA = L.api.ground.jobs.length; L.planet(g, { seed: 7, r: 60, snowLine: .3 }, 100, 100, 60, {}); L.api.flush(); L.planet(g, { seed: 7, r: 60, snowLine: .3 }, 100, 100, 60, {}); kB = L.stats().real.planets.discBakes; } catch (e) { thrN = e; }
    ok(!thrN && kA >= 2 && kB > 0, `confirmed names: river, st.snowLine (a new line queues a new tile: ${kA} jobs) and p.snowLine are read without throwing${thrN ? ': ' + thrN.message : ''}`); }
  const C = L.api.ground.fromSamples(samples, { i: 2, chunk: 4 }, { W: 412, H: 915 }); ok(C.n === n && C.m0.length === n * 4 && C.m1[9 * 4 + 3] > .5 && C.m2 && C.h[5] === h[5], 'mode C: plan §16.4 samples convert to mode A arrays (m0, m1, m2, crack)');
  // the GL hooks without THREE: null (Game Dev's default draws), no throw
  let gt = null; try { gt = [L.planetMat(null, { seed: 1 }), L.groundMat(undefined, {}), L.starMat({}, {})]; } catch (e) { gt = e; }
  ok(Array.isArray(gt) && gt.every(m => m === null), '*Mat hooks return null without THREE (never throw)');
  // the star never throbs on the beat: swell envelope comes only from big events
  const ctxA = L.api.gl.ctxOf({ t: 1, beat: .99, pulse: 1 }), ctxB = L.api.gl.ctxOf({ t: 1, beat: .01, pulse: 0 }); ok(ctxA.swell === ctxB.swell, 'beat / pulse alone do not move the swell envelope (no beat throb)');
  const st = L.stats(); ok(st.real && st.real.planets && st.real.ground && st.real.planets.texBakes >= 1, `stats().real reports bakes (planet tex ${st.real.planets.texBakes}, disc ${st.real.planets.discBakes}, ground tiles ${st.real.ground.bakes})`); }
{ // SOUND-DRIVEN KALEIDOSCOPE (Wilbow 1:56 PM MDT Oct 25): each mapping on its own opt, all on by default; each tested alone
  const { createKaleidoSound, KALEIDO_OPTS } = await import('../www/js/look/kaleido.js');
  ok(['chord', 'key', 'rhythm', 'ohms', 'density', 'arc', 'moment', 'place'].every(k => KALEIDO_OPTS[k] === true), 'kaleido: all 8 sound mappings on by default');
  const rig = (o = {}) => { let t = 1000; const mu = createMusic(() => t), b = createEvents(mu), K = createKaleidoSound({ music: mu, bus: b, opts: o });
    const R = { mu, b, K, get t() { return t; }, set t(v) { t = v; }, step: (e = {}) => K.step({ beat: mu.beat(t), heal: 1, dev: .5, big: 0, sym0: 6, ...e }),
      run: (beats, e, each) => { for (let i = 0; i < beats * 30; i++) { t += 1 / 30; if (each) each(i); R.step(typeof e === 'function' ? e() : e); } return K; },
      note: (src, x = {}) => b.note({ src, kind: 'note', deg: 0, vel: .6, ...x }) }; return R; };
  const o1 = { id: 1, hue: 20, seed: 3, scale: 'ohm' }, ohms = [...Array(8)].map((_, i) => ({ id: 10 + i, hue: i * 45, seed: i * 7 + 1, scale: 'ohm' }));
  // chord -> slices: a simple tonic triad vs a diminished chord with extension notes; a change morphs from the NEXT beat over one beat
  { const r = rig(); r.mu.chord = { root: 0, tones: [0, 2, 4] }; r.run(4); const s0 = r.K.sym;
    r.mu.chord = { root: 6, tones: [6, 8, 10] }; const b0 = r.mu.beat(r.t); r.run(.05, {}, i => { if (i % 2 === 0) r.note(o1, { deg: [1, 3, 5][i % 3] }); }); const sNow = r.K.sym, mNow = r.K.morph;
    let mid = null, early = 0; const nb = Math.floor(b0 + 1 / 30) + 1; r.run(2.5, {}, () => { const bb = r.mu.beat(r.t); if (bb < nb - .02) early = Math.max(early, r.K.morph); if (mid == null && bb > nb + .4) mid = r.K.morph; });
    ok(sNow > s0 && mNow === 0 && early === 0 && mid > 0 && mid < 1 && r.K.morph === 1, `kaleido.chord: tonic ${s0} slices -> dim chord ${sNow}; morph waits for the next beat (${mNow}), mid-beat ${mid && mid.toFixed(2)}, then 1`);
    const off = rig({ chord: false }); off.mu.chord = { root: 6, tones: [6, 8, 10] }; off.run(2, { sym0: 7 }); ok(off.K.sym === 7 && off.K.morph === 1, `kaleido.chord off: slices = L.sym (${off.K.sym})`); }
  // key + om -> colours: another key moves the hue; a dark chord (vi) is deeper than the tonic; tension adds the clash edge
  { const r = rig(); r.run(8); const c0 = r.K.cols[0].slice(), lum = c => c[0] * .3 + c[1] * .59 + c[2] * .11, l0 = lum(r.K.cols[1]);
    r.mu.setKey(5); r.run(8); const c1 = r.K.cols[0].slice(); r.mu.setKey(0); r.mu.chord = { root: 5, tones: [5, 7, 9] }; r.run(12); const l1 = lum(r.K.cols[1]);
    r.mu.chord = { root: 6, tones: [6, 8, 10] }; r.run(12); const cl = r.K.clash;
    ok(Math.hypot(c0[0] - c1[0], c0[1] - c1[1], c0[2] - c1[2]) > 30 && l1 < l0 && cl > .3, `kaleido.key: key 0 -> 5 moves the colours, vi chord darker (${l0.toFixed(0)} -> ${l1.toFixed(0)}), vii° clashes ${cl.toFixed(2)}`);
    const off = rig({ key: false }); off.run(2); ok(off.K.cols === null && off.K.clash === 0, 'kaleido.key off: palette colours, no clash'); }
  // rhythm: no breath / push at rest; breath with the bar + beat push in a jam; off-beat playing nudges sideways instead
  { const r = rig(); r.run(8); const rest = Math.abs(r.K.breath) + Math.abs(r.K.kick); let br = 0, kk = 0, nd = 0;
    r.run(8, {}, i => { if (i % 30 === 0) r.note(ohms[i / 30 % 3], { jam: 1 }); br = Math.max(br, r.K.breath); kk = Math.max(kk, r.K.kick); });
    const s = rig(); s.run(2); s.run(12, {}, i => { if (i % 30 === 15) s.note(ohms[0], { jam: 1 }); nd = Math.max(nd, Math.abs(s.K.nudge)); });
    let ks = 0; s.run(2, {}, () => { ks = Math.max(ks, s.K.kick); });
    ok(rest === 0 && br > .02 && kk > .01 && nd > .01 && ks < kk * .5, `kaleido.rhythm: rest 0, jam breath ${br.toFixed(3)} + push ${kk.toFixed(3)}, off-beat nudge ${nd.toFixed(3)} with push ${ks.toFixed(3)}`);
    const off = rig({ rhythm: false }); off.run(2); ok(off.K.breath === null && off.K.nudge === 0, 'kaleido.rhythm off: the old slow breath (look decides)'); }
  // ohms: each playing ohm a ring in its colour; loud = bigger, bright (strike / short notes) = sharper; silence fades them out
  { const r = rig(); r.note(o1, { vel: .9, kind: 'strike', dur: .2 }); r.note(ohms[0], { vel: .3, dur: 2 }); r.run(.2); const R = r.K.rings.slice();
    const a = R.find(x => x.id === 1), b2 = R.find(x => x.id === 10); r.run(12); const after = r.K.rings.length;
    ok(R.length === 2 && a.loud > b2.loud && Math.abs(a.col[0] - 255) < 60 && after === 0, `kaleido.ohms: 2 rings (loud ${a.loud.toFixed(2)} > ${b2.loud.toFixed(2)}, sharp ${a.sharp.toFixed(2)} / ${b2.sharp.toFixed(2)}), gone after silence`);
    const off = rig({ ohms: false }); off.note(o1); off.run(.2); ok(off.K.rings.length === 0, 'kaleido.ohms off: no rings'); }
  // density: richer not louder - per-ring alpha falls with n, deeper petals, past the cap one weave
  { const r = rig(); r.note(o1); r.run(.1); const a1 = r.K.rings[0].a, d1 = r.K.depthK; for (const o of ohms) r.note(o, { vel: .6 }); r.run(.1);
    const n = r.K.rings.length, w = r.K.weave, an = r.K.rings[0].a;
    ok(n === KALEIDO_OPTS.rings && w && w.n === 8 + 1 - n && an < a1 && r.K.depthK > d1, `kaleido.density: 9 ohms -> ${n} rings + weave of ${w && w.n}, ring alpha ${a1.toFixed(2)} -> ${an.toFixed(2)}, depth x${d1.toFixed(2)} -> x${r.K.depthK.toFixed(2)}`);
    const off = rig({ density: false }); for (const o of ohms) off.note(o); off.run(.1); ok(off.K.rings.length === 8 && !off.K.weave, `kaleido.density off: ${off.K.rings.length} rings, no weave`); }
  // arc: song start low + faint, develops into the sky, end unwinds (turns back) and returns
  { const r = rig(); r.run(4); r.b.ctl('global', 'song.on', 1); r.b.ctl('global', 'song.section', 0); r.run(8); const lo = r.K.lift, a0 = r.K.alpha, rot0 = r.K.rot;
    r.b.ctl('global', 'song.section', .8); r.run(10); const hi = r.K.lift, fi = r.K.fill; r.b.ctl('global', 'song.on', 0); r.b.ctl('global', 'song.end', 1); r.run(4); const arc = r.K.arc, back = r.K.rot;
    r.run(4); const rotE = r.K.rot; r.run(20); const fin = r.K.lift;
    ok(lo < .35 && a0 < .8 && hi > .8 && fi > .8 && arc === 'end' && rotE < back && fin > .9, `kaleido.arc: start lift ${lo.toFixed(2)} alpha ${a0.toFixed(2)}, developed ${hi.toFixed(2)}, end unwinds (${back.toFixed(2)} -> ${rotE.toFixed(2)}), rest ${fin.toFixed(2)}`);
    const off = rig({ arc: false }); off.b.ctl('global', 'song.on', 1); off.run(8); ok(off.K.lift === 1 && off.K.arc === 'rest', 'kaleido.arc off: no lift'); }
  // moment: held to the next bar line, settled over one bar
  { const r = rig(); r.run(4.5); const bb = r.mu.beat(r.t); r.b.post({ type: 'moment', kind: 'climax', k: 1 }); r.run(.1); const line = Math.ceil(bb / 4 + .125) * 4; let atLine = 0, after = 1;
    r.run(10, {}, () => { const x = r.mu.beat(r.t); if (x < line - .05) atLine = r.K.big; if (x > line + 4.2 && after === 1) after = r.K.big; });
    ok(atLine > .95 && after < .5, `kaleido.moment: held ${atLine.toFixed(2)} until the bar line, ${after.toFixed(2)} a bar later`);
    const off = rig({ moment: false }); off.run(1, { big: .8 }); off.run(.2, { big: .1 }); ok(Math.abs(off.K.big - .1) < .01, 'kaleido.moment off: raw big'); }
  // place: unhealed = thin + dusty, healed = colour + depth
  { const u = rig(); u.note(o1); u.run(6, { heal: 0 }); const h = rig(); h.note(o1); h.run(6, { heal: 1 }); const sat = c => Math.max(...c) - Math.min(...c);
    ok(u.K.alpha < h.K.alpha && u.K.depthK < h.K.depthK && sat(u.K.cols[0]) < sat(h.K.cols[0]), `kaleido.place: unhealed alpha ${u.K.alpha.toFixed(2)} depth x${u.K.depthK.toFixed(2)} sat ${sat(u.K.cols[0])} < healed ${h.K.alpha.toFixed(2)} x${h.K.depthK.toFixed(2)} ${sat(h.K.cols[0])}`);
    const off = rig({ place: false }); off.run(2, { heal: 0 }); ok(off.K.heal === 1, 'kaleido.place off: heal ignored'); }
  // in the look: playing ohms add the ring image (one extra draw), all off = the v0.0.19 kaleidoscope
  { let t = 2000; const mu = createMusic(() => t), b = createEvents(mu), Lk = createLook({ sim: {}, music: mu, bus: b, makeCanvas: mk }), Lo = createLook({ sim: {}, music: mu, bus: b, makeCanvas: mk, opts: { kaleido: false } });
    const g = createCanvas(412, 915).getContext('2d'); const st = () => ({ t, W: 412, H: 915, q: 0, trip: .3, A: { x: 206, y: 400 } });
    for (let i = 0; i < 60; i++) { t += 1 / 30; if (i % 10 === 0) for (const o of ohms.slice(0, 3)) b.note({ src: o, kind: 'note', deg: i % 7, vel: .7, jam: 1 }); for (const L of [Lk, Lo]) { L.frame(st()); L.layer(g, { sym: 6, phase: 0, rough: .3 }, 1, st(), 'field'); } }
    ok(Lk.api.kz.rings === 3 && Lk.api.kz.ringA > 0 && Lo.api.kz.rings === 0 && Lo.api.kz.ringA === 0 && Lo.api.kz.sym === 6, `look: 3 playing ohms -> ${Lk.api.kz.rings} rings (alpha ${Lk.api.kz.ringA.toFixed(2)}, ${Lk.api.kz.sym} slices); opts.kaleido false -> ${Lo.api.kz.rings} rings, L.sym ${Lo.api.kz.sym}`); }
}
// look.thing(g, t, x, y, r, st): every placed-thing kind gets a lit material sprite (idle-baked, 1:1), stable keys (no rebake
// on a repeat frame), unhealed = muted, realLook off / realLook.thing off = no hook (the world's outlines stay)
{ const blob = (cx, cy, r, n, sq = 1) => Array.from({ length: n }, (_, i) => { const a = i / n * 6.2832; return [cx + Math.cos(a) * r * (1 + .12 * Math.sin(a * 3)), cy + Math.sin(a) * r * sq]; });
  const line = (x0, y0, x1, y1, n = 8) => Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1) + Math.sin(i / (n - 1) * 3.14) * 6]);
  const kinds = [...['rev', 'dly', 'dst', 'glt', 'cho', 'trm', 'cmb', 'pit'].map((fx, i) => ({ kind: 'fx', fx, seed: 11 + i, tied: false, hit: 0 })), { kind: 'membrane', seed: 3 }, { kind: 'string', seed: 4, tied: true }, { kind: 'bar', seed: 5 }];
  const shape = t => t.kind === 'string' ? line(140, 200, 270, 190) : t.kind === 'bar' ? line(150, 210, 260, 215, 6) : blob(206, 200, 40, 20, t.fx === 'cmb' ? .35 : 1);
  // 412x400 CSS at dpr 2: the canvas was 412x400 DEVICE px, so only CSS y < 200 was on it and the bar (y 210-218) fell off it
  const draw = (L, heal, t) => { const c = createCanvas(824, 800), g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); L.frame({ t: 5, W: 412, H: 400, q: 0, heal, trip: 0 });
    const P = shape(t), x = 206, y = 200, r = Math.max(...P.map(p => Math.hypot(p[0] - x, p[1] - y))); const a = L.thing(g, t, x, y, r, { P, glow: 0, chord: 0, now: 1000 }); return { a, c, g, P, x, y, r }; };
  const Lt = createLook({ sim: {}, music, bus, makeCanvas: mk, opts: { realLook: { bake: { mode: 'manual' } } } }); let allTrue = true, lit = 0, sats = [];
  for (const t of kinds) { const d0 = draw(Lt, 1, t); allTrue = allTrue && d0.a === true; Lt.api.flush(); const d = draw(Lt, 1, t);
    if (realCanvas) { const im = d.g.getImageData(0, 0, 824, 800).data; let n = 0, s = 0; for (let i = 0; i < im.length; i += 4) if (im[i + 3] > 40) { n++; s += Math.max(im[i], im[i + 1], im[i + 2]) - Math.min(im[i], im[i + 1], im[i + 2]); } if (n > 200) lit++; sats.push(n ? s / n : 0); } }
  ok(allTrue && (!realCanvas || lit === kinds.length), `look.thing: all ${kinds.length} kinds drawn (fx x8, membrane, string, bar)${realCanvas ? `, ${lit} with real pixels` : ''}`);
  const b0 = Lt.api.things.baked; for (const t of kinds) draw(Lt, 1, t); Lt.api.flush(); ok(Lt.api.things.baked === b0, `look.thing: repeat frame = no rebake (${Lt.api.things.baked - b0} new)`);
  if (realCanvas) { const t = kinds[0], Lu = createLook({ sim: {}, music, bus, makeCanvas: mk, opts: { realLook: { bake: { mode: 'manual' } } } }); draw(Lu, 0, t); Lu.api.flush(); const u = draw(Lu, 0, t), h = draw(Lt, 1, t);
    const sat = d => { const im = d.g.getImageData(0, 0, 412, 400).data; let n = 0, s = 0; for (let i = 0; i < im.length; i += 4) if (im[i + 3] > 40) { n++; s += Math.max(im[i], im[i + 1], im[i + 2]) - Math.min(im[i], im[i + 1], im[i + 2]); } return s / (n || 1); };
    const su = sat(u), shh = sat(h); ok(su < shh, `look.thing: unhealed shell muted (sat ${su.toFixed(1)} < healed ${shh.toFixed(1)})`); }
  const Lo = createLook({ sim: {}, music, bus, makeCanvas: mk, opts: { realLook: false } }), Ln = createLook({ sim: {}, music, bus, makeCanvas: mk, opts: { realLook: { thing: false } } });
  ok(!Lo.thing && !Ln.thing, 'look.thing: absent with realLook off or realLook.thing = false');
  const Lc = createLook({ sim: {}, music, bus, makeCanvas: mk }), c = createCanvas(412, 400), g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); Lc.frame({ t: 5, W: 412, H: 400, q: 0 });
  const tr0 = JSON.stringify(g.getTransform()); for (const t of kinds) Lc.thing(g, t, 206, 200, 40, { P: shape(t), glow: .8, chord: .5, now: 1234 }); ok(JSON.stringify(g.getTransform()) === tr0 && g.globalAlpha === 1 && g.globalCompositeOperation === 'source-over', 'look.thing: context left clean (transform, alpha, composite), struck (glow .8) + chord');
  ok(Lc.thing(g, kinds[0], 206, 200, 40, {}) === false && Lc.thing(g, kinds[0], 206, 200, 0, { P: shape(kinds[0]) }) === false, 'look.thing: no points / r 0 -> false (world draws its own)'); }
console.log(fails ? `${fails} FAILED` : 'all look tests passed'); process.exit(fails ? 1 : 0);
