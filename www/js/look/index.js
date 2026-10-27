// LOOK HOOK (Visuals track). render.js imports ONLY createLook() from here (contract: NOTES_DEV.md "Shared contracts" ->
// "Look hook", world track). This is the style-NEUTRAL foundation every look option needs: cached glow sprites, one key light
// with baked shade / rim sprites, the realism<->trippy mix with a peak envelope, a music-driven palette and quality rungs.
// No final art is decided here: every visible number is a parameter in opts. See look/README.md.
// READ-ONLY on the world: reads st, sim, music, world and bus events; never writes them. Nothing draws outside rAF.
import { createSprites, defaultMakeCanvas, rgbKey } from './sprites.js';
import { blit, devOf, m2d } from './blit.js';
import { createLight } from './light.js';
import { createMix } from './mix.js';
import { createPalette, hsl2rgb } from './palette.js';
import { rung } from './quality.js';
import { createPlace, paintDust, paintLace, paintBands, laceGeom, traceLace, PLACE_OPTS } from './place.js';
import { createPlanets, PLANET_OPTS } from './planet.js';
import { createStars, STAR_OPTS } from './star.js';
import { createGround, GROUND_OPTS } from './ground.js';
import { createGL, GL_OPTS } from './gl.js';
import { createSky, skyLight, SKY_OPTS } from './sky.js';
import { createAir, AIR_OPTS } from './air.js';
import { createDiveLook, DIVE_LOOK } from './dive.js';
import { createKaleidoSound, KALEIDO_OPTS } from './kaleido.js';
import { createThings, THING_OPTS } from './thing.js';
import { createAuras, AURA_OPTS, TRADITIONS } from './aura.js';
import { createRareLook, RARE_LOOK } from './rare.js';
import { createRoleLook, ROLE_OPTS } from './role.js';
import { createOhmLook, OHM_CHAR } from './ohmlook.js';
import { opt } from '../soft.js';   // read only: world.opts.lookLegs (does ohmdraw.js call look.legs?)
import { createPulse, PULSE_OPTS } from './pulse.js';
import { createGalaxy, GALAXY_OPTS } from './galaxy.js';
import { createAudioLook, AUDIO_OPTS } from './audio.js';
export { createDiveLook, DIVE_LOOK, createOhmLook, OHM_CHAR, createSprites, createLight, createMix, createPalette, createPlace, createPlanets, createStars, createGround, createGL, createSky, SKY_OPTS, createAir, AIR_OPTS, createKaleidoSound, KALEIDO_OPTS, createThings, THING_OPTS, createAuras, AURA_OPTS, TRADITIONS, createRareLook, RARE_LOOK, rung, PLACE_OPTS, PLANET_OPTS, STAR_OPTS, GROUND_OPTS, GL_OPTS };
export const LOOK_DEFAULTS = {
  p1: false,        // THE ONE OPT-IN FLAG for P1 (place states + big-event pattern): turns on look.palette, look.layer and look.post
                    // with the P1 look. Off until Wilbow has seen it as a proposal. createLook({..., opts: { p1: true }}) or opts.p1 = {PLACE_OPTS overrides}
  trippyGate: true, // Wilbow 12:23 AM Oct 26: trippy layers (kaleido, music colour, sky bands, auras, petals) x st.trippy 0..1 (missing = 1); false = always full
  ohm: true,        // look.ohm: light (shade + rim) + glow over each ohm the world drew
  palette: false,   // look.palette: off until a look option is picked (the world's own layer colours stay)
  post: false,      // look.post: vignette / peak wash, off until a look option is picked
  glowK: 1,         // overall glow strength
  realLook: true,    // the realistic space + ground look (13A 13B 13D, "more realistic space, planets and star systems"): look.planet /
                     // star / ground (2D) + look.planetMat / atmoMat / cloudMat / waterMat / starMat / coronaMat / groundMat (three.js).
                     // ON. The one opt-out: opts.realLook = false. Tuning: opts.realLook = { planet: {PLANET_OPTS}, star: {STAR_OPTS},
                     // ground: {GROUND_OPTS}, gl: {GL_OPTS}, bake: {BAKE_OPTS} } (numbers only, nothing to switch on)
  kaleido: true,     // the SOUND-DRIVEN kaleidoscope (look/kaleido.js): every mapping on. opts.kaleido = { chord, key, rhythm, ohms, density,
                     // arc, moment, place: false to switch one off, + numbers from KALEIDO_OPTS }; opts.kaleido = false = all mappings off
  capBytes: 16 << 20,
  dustSplit: true,   // parent 2:37 AM (seed-42 sky cracks): the dust layer is grain only over the sky; its cracks (soft, no hard strokes) only below the land line. false = the old full-screen crack tile
  restMute: true, softEdges: true,   // #1 (Wilbow 10:06 'too much color'): sky sound bands only while music sounds (false = the old always-on bands)
  calmRim: true,     // v0.0.31 look.planetRim: the bent home planet's air band is a calm, neutral, soft light (no green / hue ring at rest); its colour
                     // comes in only with music (place.music) x st.trippy and the beat pulse. false = render's softRing in the palette hue + 200
  nodeGlow: true,    // v0.0.31 look.node(g, x, y, sz, q, st): a far-zoom ohm speck as a soft glow dot in its pitch colour (muted at rest, fuller with
                     // music x st.trippy and the ohm's own glow) instead of render's square; needs Game Dev's call in specks() (GAMEDEV_SPEC H5). false = squares
  galaxy: true,      // look.galaxy: a baked realistic spiral galaxy (look/galaxy.js, #10); false = the world's own star haze
  pulse: true,       // look.pulse: ability rings as light (look/pulse.js). opts.pulse = false = the world's stroked rings; { echo: 'off' | 'stroke' } (Q405)
  sky: { parallax: true },   // Wilbow 12:12 AM: "if the pinch zoom includes the sky and the ground it looks too weird. But keep this effect as an accent".
                     // ON: the sky layers (sky gradient + night stars, sun, kaleidoscope veil, swell; later clouds / galaxy band) take the view's
                     // st.skyScale and far ranges st.farScale (Game Dev, render st; missing = 1); opts.sky = { parallax: false } = the whole-picture zoom
};
export function createLook(ctx = {}) {
  const { sim, music, world, bus } = ctx, O = { ...LOOK_DEFAULTS, ...(ctx.opts || {}) };
  const sprites = createSprites({ makeCanvas: ctx.makeCanvas || defaultMakeCanvas, capBytes: O.capBytes });
  const light = createLight(sprites, { material: O.material }), mix = createMix(O.mix), pal = createPalette(O.palette === true ? {} : O.palette || {});
  mix.listen(bus); const P1 = !!O.p1, place = createPlace(typeof O.p1 === 'object' ? O.p1 : {}); if (P1) place.listen(bus, music);
  const hueRGB = new Map(), lc = [0, 0, 0];
  const rgbOfHue = (h, sat, lit) => { const k = ((Math.round(h) % 360) + 360) % 360 * 64 + Math.round(sat * 7) * 8 + Math.round(lit * 7); let c = hueRGB.get(k); if (!c) { c = hsl2rgb(h, sat, lit); hueRGB.set(k, c); } return c; };
  const F = { q: 0, glows: 0, R: null, st: null };
  F.jam = []; F.jamN = 0; F.pat = new WeakMap(); F.lace = null; F.big = null; F.bands = null;
  const look = { opts: O, api: { sprites, light, mix, palette: pal, place, rung, kaleidoIn: null, skyScaleOf: null, farScaleOf: null }, F };
  // once per frame, before any drawing: mix, palette, key light colour, rung settings, bake budget
  // the per-rung settings object is built ONCE per (rung, P1 variant) and reused every frame (was a fresh object + spreads per frame)
  const RC = new Map(), rungSet = q => ({ glow: rung('glow', q), shade: rung('shade', q), rim: rung('rim', q), body: rung('body', q), post: rung('post', q), sprite: rung('sprite', q),
    dust: rung('dust', q), bands: rung('bands', q), glint: rung('glint', q), lace: rung('lace', q), swell: rung('swell', q), kaleido: rung('kaleido', q) });
  const rungsOf = (q, big) => { const k = q * 4 + big; let R = RC.get(k); if (R) return R; R = rungSet(q);
    if (P1 && (q === 0 || big)) R.glow = { ...rung('glow', q + (q === 0) + big), core: R.glow.core };   // P1 pays for its layers: q0 ohm glows use the q1 glow size/count (core kept for peaks)
    if (P1 && big) { R.glint = rung('glint', q + 1); R.lace = { ...R.lace, max: 0 }; }   // during the swell the full-screen pattern IS the pattern: pair lace pauses
    RC.set(k, R); return R; };
  look.frame = st => { F.st = st; F.q = st.q | 0; F.glows = 0; F.glints = 0;
    F.R = rungsOf(F.q, 0); F.jamN = 0;
    sprites.beginFrame(F.R.sprite.bakes);
    mix.step(st, { music, sim, bus, world }); pal.update(st, mix, music);
    pal.keyLight(mix.mixed, lc); light.set({ color: lc });
    F.trp = TRP(); if (P1) { place.step(st, mix, music, sim); { const T = F.trp; place.trippy = T; if (T < 1) { place.colour *= .3 + .7 * T; place.vivid *= T; place.swell *= T; place.cover *= T; } }   // trippy gate: the trippy layers scale, the real light stays (music still lights a little)
      F.beat = music ? music.beat(st.t) : st.t || 0; F.bar = Math.floor(F.beat / 4); F.phrase = Math.floor(F.bar / 4);
      // big event: the ladder steps down one rung for the ohms (glow, no core) and the jam extras, so the full-screen pattern is paid for
      F.R = rungsOf(F.q, place.cover > .15 ? 1 : 0); } };   // big event: glow / glint / lace one rung down (see rungsOf)
  // material + light over one ohm the world already drew (o = the ohm, r = on-screen radius). O(1): 2-3 drawImage calls.
  F.trp = 1; const OX = { on: false, jobs: [], pend: new Set() }, AU = { a: null, c: [0, 0, 0], rk: null, ro: null, oc: null };   // AU.a: the tradition auras (aura.js, opts.realLook.tradAura), set below   // real look: exact-size ohm sprites baked in idle time (see bakeSlice)
  // the device transform for a RUN of look.ohm calls on one canvas: render.js calls look.ohm in one tight loop with no transform
  // change in between, so getTransform (a new DOMMatrix each call = 50 objects per frame) is read once per run. Any other look
  // hook (frame, layer, post, planet, star, ground, bodies, palette) ends the run (see the wrap at the end of createLook).
  const OM = { g: null, m: null, mm: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, devOfOhm = g => { if (OM.g !== g) { OM.g = g; OM.m = m2d(devOf(g), OM.mm); } return OM.m; };
  const CXK = [], TH = { hue: 0, sat: 0, light: 0 };   // exact core keys by radius; tintHue output (reused)
  // the lit sprite at device radius Rd for the rare look's shaped body: the exact bake when ready (queued in idle), else the bucket sprite
  const LT = { m: null, step: .5, f: null }, litOf = (m, step) => { if (LT.f && LT.m === m && LT.step === step) return LT.f; LT.m = m; LT.step = step;
    return LT.f = Rd => { const k = light.litExactKey(Rd); if (OX.on && sprites.map.has(k)) return sprites.get(k, Rd * 2, Rd * 2, null);
      if (OX.on && OX.jobs.length < 48 && !OX.pend.has(k)) { OX.pend.add(k); OX.jobs.push({ key: k, w: Rd * 2, paint: light.litExactPaint() }); } return light.litSprite(Rd / (LT.m ? LT.m.a : 1), LT.step); }; };
  const ohm = (g, o, x, y, r, st) => { const R = F.R; if (!R) return; const step = R.sprite.step, A0 = g.globalAlpha, AA = AU.a && AU.a.on ? AU.a : null; let M, cc = null, gl0 = 0;   // M: the device transform, read at most once per ohm (and once per run of ohm calls, see devOfOhm)
    const merged = R.rim.on && R.rim.merged; let RK = AU.rk && AU.rk.shaped(o) ? AU.rk : null;
    const RS = AU.ro && AU.ro.on && !RK ? AU.ro.part(o) : null;   // look.ohmRole (look/role.js): the role cue baked into this lit body sprite
    if (RK && !RK.drawn(o)) { const m = M !== undefined ? M : (M = devOfOhm(g)); if (!RK.body(g, o, x, y, r, m, litOf(m, step), sim ? sim.lod | 0 : 0)) RK = null; }   // rare ohm: its rare shape, lit (look/rare.js; drawn by look.rare layer 1, else here) - never the round shade (false only before its first bake)
    let OC = false; if (!RK && AU.oc && AU.oc.on && o.g && o.body) { const m = M !== undefined ? M : (M = devOfOhm(g)); const gl1 = Math.min(1.5, (o.glow || 0) + Math.min(1, (o.look && o.look.glow) || 0) * .6);   // ohm character (look/ohmlook.js): the whole shaded body + face + posture + shadow
      OC = AU.oc.draw(g, o, x, y, r, m, gl1, o.body.partner ? 1 : 0, sim ? sim.lod | 0 : 0); if (OC && RS) AU.ro.accent(g, o, RS, x, y, r, m); }   // role on the body as light (one soft accent blit)
    if (!RK && !OC && R.shade.on) { let done = false;
      if (merged && OX.on) { const m = M !== undefined ? M : (M = devOfOhm(g)); if (m) { const Rd = Math.round(r * m.a); if (Rd >= 3 && Rd <= 160) { const k = light.litExactKey(Rd);   // real look: the lit sprite at the exact device size, drawn 1:1 (idle-baked; scaled until ready)
        if (RS && AU.ro.body(g, o, RS, k, light.litExactPaint, Rd, x, y, m)) done = true;
        else if (sprites.map.has(k)) { g.globalAlpha = 1; blit(g, sprites.get(k, Rd * 2, Rd * 2, null), x - Rd / m.a, y - Rd / m.a, Rd * 2 / m.a, Rd * 2 / m.a, m); done = true; }
        else if (OX.jobs.length < 48 && !OX.pend.has(k)) { OX.pend.add(k); OX.jobs.push({ key: k, w: Rd * 2, paint: light.litExactPaint() }); } } } }
      if (!done) { const s = merged ? light.litSprite(r, step) : light.shadeSprite(r, step); if (s) { g.globalAlpha = 1; g.drawImage(s, x - r, y - r, r * 2, r * 2); } } }
    g.globalCompositeOperation = 'lighter';
    if (R.rim.on && !merged && !RK) { const s = light.rimSprite(r, step); if (s) { g.globalAlpha = R.rim.alpha; g.drawImage(s, x - r, y - r, r * 2, r * 2); } }
    // P1: during a big event the pattern takes over, so fewer ohm glows (nearest first) pay for it
    if (R.glow.on && F.glows < (P1 ? R.glow.max * (1 - .6 * place.cover) : R.glow.max)) { const gl = Math.min(1.5, (o.glow || 0) + Math.min(1, (o.look && o.look.glow) || 0) * .6),
        t = pal.tintHue(o.hue || 0, mix.mixed, TH), c0 = P1 ? rgbOfHue(t.hue, Math.min(1, .1 + .45 * place.colour + .45 * place.vivid + .3 * place.cover), t.light * (1 - .35 * place.dust)) : rgbOfHue(t.hue, Math.min(1, t.sat + .2), t.light), c = AA ? AA.tint(o, c0, AU.c) : c0, gr = r * R.glow.scale * (1 + .25 * mix.peak),
        a = R.glow.alpha * O.glowK * (.3 + .5 * gl) * (1 + .6 * mix.peak * F.trp) * (.45 + .55 * F.trp) * (P1 ? .5 + .5 * (1 - place.dust) : 1), s = sprites.glow(c[0], c[1], c[2], gr, gl * .5);
      if (s && a > .004) { g.globalAlpha = a > 1 ? 1 : a; let gd = false;
        if (OX.on) { const m = M !== undefined ? M : (M = devOfOhm(g)); if (m) { const Rd = Math.round(gr * m.a * .5) * 2; if (Rd >= 4 && Rd <= 200) {   // real look: exact-size glow (2 device px steps), 1:1 (idle-baked; scaled until ready)
          const ck = rgbKey(c[0], c[1], c[2]), kk = sprites.glowExactKey(ck, Rd);
          if (sprites.map.has(kk)) { blit(g, sprites.get(kk, Rd * 2, Rd * 2, null), x - Rd / m.a, y - Rd / m.a, Rd * 2 / m.a, Rd * 2 / m.a, m); gd = true; }
          else if (OX.jobs.length < 48 && !OX.pend.has(kk)) { OX.pend.add(kk); OX.jobs.push({ key: kk, w: Rd * 2, paint: sprites.glowExactPaint(ck) }); } } } }
        if (!gd) g.drawImage(s, x - gr, y - gr, gr * 2, gr * 2); F.glows++;
        if (R.glow.core && gl > .3 && mix.peak > .15) { const k = sprites.core(), cr = r * .7; g.globalAlpha = Math.min(1, (gl - .3) * mix.peak * O.glowK);   // white-hot core only on big musical moments (peak)
          let cd = false; if (OX.on) { const m = M !== undefined ? M : (M = devOfOhm(g)); if (m) { const Rd = Math.round(cr * m.a), kk = CXK[Rd] || (CXK[Rd] = `cx${Rd}`); if (Rd >= 2 && Rd <= 120) {   // real look: exact-size core, 1:1
            if (sprites.map.has(kk)) { blit(g, sprites.get(kk, Rd * 2, Rd * 2, null), x - Rd / m.a, y - Rd / m.a, Rd * 2 / m.a, Rd * 2 / m.a, m); cd = true; }
            else if (OX.jobs.length < 48 && !OX.pend.has(kk)) { OX.pend.add(kk); OX.jobs.push({ key: kk, w: Rd * 2, paint: sprites.corePaint }); } } } }
          if (!cd) g.drawImage(k, x - cr, y - cr, cr * 2, cr * 2); } }
      if (AA) { cc = c0; gl0 = gl; } }
    if (P1 && place.jamming(o, F.beat)) { if (F.jamN < 8) { const j = F.jam[F.jamN] || (F.jam[F.jamN] = { x: 0, y: 0, r: 0 }); j.x = x; j.y = y; j.r = r; F.jamN++; }
      if (R.glint.on && place.vivid > .05 && F.glints < R.glint.max) { const k = goldSprite(), a = (F.beat % 4) / 4 * 6.2832 + (o.id || 0), gx = x + Math.cos(a) * r * .8, gy = y + Math.sin(a) * r * .8, gr = r * .35;   // a gold glint walks the rim once a bar
        g.globalAlpha = Math.min(1, place.vivid * (.6 + .4 * ((st && st.pulse) || 0))); g.drawImage(k, gx - gr, gy - gr, gr * 2, gr * 2); F.glints++; } }
    if (AA) { const m = M !== undefined ? M : (M = devOfOhm(g)); if (!cc) { cc = rgbOfHue(o.hue || 0, .6, .6); gl0 = Math.min(1.5, (o.glow || 0) + Math.min(1, (o.look && o.look.glow) || 0) * .6); }   // tradAura: shimmer, shape, live line, aura (behind the body, see aura.js)
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = A0 * (.2 + .8 * F.trp); if (!AA.drawnNow(o)) AA.draw(g, o, x, y, r, m, cc, gl0, !!RK); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; };
  const goldSprite = () => sprites.get('gold', 32, 32, (x, w) => { const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.25, 'rgba(255,205,110,.7)'); gr.addColorStop(1, 'rgba(255,190,80,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    x.fillStyle = 'rgba(255,245,215,.8)'; x.fillRect(15.5, 2, 1, 28); x.fillRect(2, 15.5, 28, 1); }, true);
  if (O.ohm) look.ohm = ohm;
  // look.ohmBody / look.legs (world ohmdraw.js v0.0.30 B12 / B10): true = the character look (look/ohmlook.js) claims this ohm's body this
  // frame, so the world skips its plain blob fill and stroke legs and look.ohm skips the erase (see ohmlook.js CLAIM). A legged ohm is
  // claimed only when the world will also ask look.legs (else its stroke legs would show under the character).
  if (O.ohm) { look.ohmBody = (g, o, s, r) => { const OC = AU.oc; if (!OC || !OC.on || !F.R || !F.R.shade.on || (AU.rk && AU.rk.shaped(o))) return false;
      if (o.g && o.g.legs && o.body && o.body.ground && !opt('lookLegs')) return false; const m = devOfOhm(g), cv = g.canvas;
      if (m && cv && m.a > 0 && (s.x < 0 || s.y < 0 || s.x > (cv.width - m.e) / m.a || s.y > (cv.height - m.f) / m.a)) return false;   // centre on screen: render.js culls look.ohm tighter (r, no breath) than ohmdraw (3 r)
      return OC.claim(o, r, m, sim ? sim.lod | 0 : 0); };
    look.legs = (g, o) => !!(AU.oc && AU.oc.claimed(o)) || !!(o.rarity && AU.rk && AU.rk.owns && AU.rk.owns(o)); }   // rares: look.rare draws their legs with the body (G7: ohmdraw:32 drops !o.rarity)
  // draw a whole list of bodies the look layer owns (bench, far ohms, jam view later): batched by composite mode.
  // items: [{x, y, r, rgb:[r,g,b], glow 0..1.5}], all on screen. Rung 3 = flat arcs, no glow.
  look.bodies = (g, items) => { const R = F.R; if (!R) return; const step = R.sprite.step;
    if (R.body.sprite) for (const it of items) { const s = light.bodySprite(it.rgb[0], it.rgb[1], it.rgb[2], it.r, step);
      if (s) g.drawImage(s, it.x - it.r, it.y - it.r, it.r * 2, it.r * 2); else { g.fillStyle = `rgb(${it.rgb[0]},${it.rgb[1]},${it.rgb[2]})`; g.beginPath(); g.arc(it.x, it.y, it.r, 0, 6.2832); g.fill(); } }
    else { for (const it of items) { g.fillStyle = `rgb(${it.rgb[0] & 0xf0},${it.rgb[1] & 0xf0},${it.rgb[2] & 0xf0})`; g.beginPath(); g.arc(it.x, it.y, it.r, 0, 6.2832); g.fill(); } }
    if (R.glow.on) { g.globalCompositeOperation = 'lighter'; let n = 0;
      for (const it of items) { if (n >= R.glow.max) break; const gl = it.glow || 0, gr = it.r * R.glow.scale * (1 + .25 * mix.peak), a = R.glow.alpha * O.glowK * (.3 + .5 * gl) * (1 + .6 * mix.peak), s = sprites.glow(it.rgb[0], it.rgb[1], it.rgb[2], gr, gl * .5);
        if (s && a > .004) { g.globalAlpha = a > 1 ? 1 : a; g.drawImage(s, it.x - gr, it.y - gr, gr * 2, gr * 2); n++; } }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; } };
  // optional (off by default): world layer colours from the music palette
  if (O.palette) look.palette = (L, st) => pal.forLayer(L, mix.mixed);
  // optional (off by default): screen-space vignette (baked once per screen-size bucket) + a short colour wash on peaks
  if (O.post) look.post = (g, st) => { const R = F.R; if (!R || !R.post.on) return; const W = st.W, H = st.H;
    const v = sprites.get(`v${Math.round(W / 64)}x${Math.round(H / 64)}`, 128, 128, (x, w) => { const gr = x.createRadialGradient(64, 64, 30, 64, 64, 92); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); }, true);
    if (R.post.vignette) { g.globalAlpha = .4 + .6 * mix.real; g.drawImage(v, 0, 0, W, H); }
    if (R.post.wash && mix.peak > .02) { const c = pal.color(1); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .12 * mix.peak; g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = 1; };
  // ---- shared by the swell lace and the kaleidoscope: where the sky ends, fine-line width, light direction on screen ----------------
  // skyY: screen y where the land starts for layer scale sc (render.js ridges: the farthest ridge sits at A.y + .2 H sc above the floor
  // at A.y + floorF H sc). Read-only on world; no world -> the anchor line.
  const skyY = (A, sc, H) => world && world.FRONT && typeof world.floorF === 'function' ? A.y + Math.min(.2, world.floorF()) * H * sc : world && typeof world.floorF === 'function' ? A.y + world.floorF() * H * sc * .45 : A.y + H * .15 * sc;
  // SKY / FAR SCALE (Wilbow 12:12 AM, Game Dev's final fields on the frame state st): skyScale = 1 + .15 (scale - 1) and farScale = 1 + .5
  // (scale - 1), both blended up to the full scale at the ground -> planet handoff by Game Dev (skyHold ON / zoomAccent OFF are theirs).
  // Only the home globe layer has a sky; other layers keep their own sc. A missing field = 1 (never sc). opts.sky.parallax false = sc.
  const PARX = () => !(O.sky && O.sky.parallax === false);
  const skyScaleOf = (st, L, sc) => !PARX() || (L && world && world.home && L !== world.home) ? sc : st && typeof st.skyScale === 'number' && st.skyScale > 0 ? st.skyScale : 1;
  const farScaleOf = (st, L, sc) => !PARX() || (L && world && world.home && L !== world.home) ? sc : st && typeof st.farScale === 'number' && st.farScale > 0 ? st.farScale : 1;
  look.api.skyScaleOf = skyScaleOf; look.api.farScaleOf = farScaleOf;   // for the sky / far-range painters (galaxy band, clouds, ranges)
  const pxOf = c => { const m = devOf(c); return m ? 1 / m.a : 1; };   // one device pixel in the canvas' CSS units
  const LOS = [0, 0];   // reused (read at once by the caller)
  const lightOnScreen = st => { const ld = st && st.lightDir; if (Array.isArray(ld) && (ld[0] || ld[1])) { const l = Math.hypot(ld[0], ld[1]) || 1; LOS[0] = ld[0] / l; LOS[1] = -ld[1] / l; } else { LOS[0] = -.45; LOS[1] = -.89; } return LOS; };
  // colour strings are CACHED by (r, g, b, alpha in 1/1000): a gradient rebuilt on a palette slide reuses its stop strings
  const RGBA = new Map();
  const rgba = (c, a) => { const aq = a < 0 ? 0 : a > 1 ? 1000 : Math.round(a * 1000), k = (((c[0] & 255) * 256 + (c[1] & 255)) * 256 + (c[2] & 255)) * 1024 + aq;
    let v = RGBA.get(k); if (v === undefined) { if (RGBA.size > 8192) RGBA.clear(); v = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${aq / 1000})`; RGBA.set(k, v); } return v; };
  const KG = { key: '', G: null }; const geomOf = (seed, n) => { const k = seed + ':' + n; if (KG.key !== k) { KG.key = k; KG.G = laceGeom(seed, n); } return KG.G; };
  // big event, full-screen part (P1 'over' pass, background canvas): the lace as fine VECTOR lines at screen resolution (never an
  // upscaled sprite), in the sky / space only: full above the land line, faded out over the far hills; the land itself only gets a soft
  // tint + light. The beat kick (during the swell only) is a small alpha + radius lift.
  // PERF: the lace is BAKED once per swell (vector, at the background canvas' own device resolution = 1:1, so no upscaling) and only
  // faded at blit time; the beat kick is an alpha lift. The land tint stays a per-frame fill (one rect).
  const SW = { k: [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN], cv: null, x: 0, y: 0, w: 0, h: 0 }, mkL = (w, h) => (ctx.makeCanvas || defaultMakeCanvas)(w, h);
  const swellSky = (c, L, sc, st) => { const GA = c.globalAlpha; const R = F.R, W = st.W, H = st.H, A = st.A || { x: W / 2, y: H * .45 }, sw = place.swell, m = devOf(c), s = m ? m.a : 1;
    const sy = skyY(A, skyScaleOf(st, L, sc), H), fade = H * .14, top = sy + fade * .35, kick = sw * (1 - (F.beat % 1)) ** 2, cs = sw3(), nl = Math.max(1, R.swell.layers | 0);
    const a = Math.min(1, sw * (.35 + .65 * place.O.takeover)) * (.88 + .12 * kick);
    c.globalCompositeOperation = 'lighter';
    if (top > 0) { const x0 = m ? -m.e / s : 0, y0 = m ? -m.f / s : 0, w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(Math.min(H, top) * s)) ;
      const ax = Math.round(A.x / 8) * 8, ay = Math.round(A.y / 8) * 8, tq = Math.round(top / 8) * 8;   // coarse: a moving anchor / zoom shifts the baked layer, rebakes only every 8 px
      const sk = SW.k, gq = R.swell.glow ? 1 : 0;   // numeric key compare (no string per frame)
      if (sk[0] !== place.opens || sk[1] !== F.phrase || sk[2] !== w || sk[3] !== h || sk[4] !== ax || sk[5] !== ay || sk[6] !== tq || sk[7] !== nl || sk[8] !== gq) {
        sk[0] = place.opens; sk[1] = F.phrase; sk[2] = w; sk[3] = h; sk[4] = ax; sk[5] = ay; sk[6] = tq; sk[7] = nl; sk[8] = gq; SW.ax = ax; SW.ay = ay; if (!SW.cv || SW.cv.width !== w || SW.cv.height !== h) SW.cv = mkL(w, h); const g = SW.cv.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.setTransform(s, 0, 0, s, 0, 0);
        const rr = Math.max(Math.max(ax, W - ax), Math.max(ay, H - ay)) * 1.08, G = geomOf((F.phrase * 7919 + 8) >>> 0, 8), px = 1 / s;
        g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
        for (let ci = 0; ci < 3; ci++) { const gr = g.createLinearGradient(0, Math.max(0, tq - fade), 0, tq); gr.addColorStop(0, rgba(cs[ci], 1)); gr.addColorStop(1, rgba(cs[ci], 0)); g.strokeStyle = gr;
          for (let l = 0; l < nl; l++) { g.beginPath(); traceLace(g, G, ax, ay, rr, l, ci, 3); const la = .62 - l * .17;
            if (KSOFT()) { g.globalAlpha = la * .12; g.lineWidth = 7 * px; g.stroke(); g.globalAlpha = la * .3; g.lineWidth = 2.8 * px; g.stroke(); continue; }   // #2: a soft streak of light, no crisp 1 px line
            if (R.swell.glow) { g.globalAlpha = la * .25; g.lineWidth = 3.2 * px; g.stroke(); }
            g.globalAlpha = la; g.lineWidth = 1.15 * px * (1 - l * .15); g.stroke(); } } }
      c.globalAlpha = GA * Math.min(1, a); const dx = A.x - SW.ax, dy = A.y - SW.ay;
      if (m) { c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(SW.cv, Math.round(dx * s), Math.round(dy * s)); c.setTransform(m); }   // whole device px: a 1:1 copy (a sub-pixel anchor offset made it a filtered draw)
      else c.drawImage(SW.cv, 0, 0, w, h, x0 + dx, y0 + dy, w / s, h / s); }
    if (sy < H) { const tc = pal.color(1); c.globalAlpha = GA * .07 * sw * place.O.takeover; if (O.softEdges !== false) { const y0 = Math.max(0, sy - fade * .2), gy = c.createLinearGradient(0, y0, 0, sy + fade); gy.addColorStop(0, rgba(tc, 0)); gy.addColorStop(1, rgba(tc, 1)); c.fillStyle = gy; c.fillRect(0, y0, W, H - y0); } else { c.fillStyle = rgba(tc, 1); c.fillRect(0, Math.max(0, sy), W, H - Math.max(0, sy)); } }   // softEdges: the land tint fades in (no hard line at the horizon)   // land: soft tint + light only
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = GA; };
  // REAL look: the field kaleidoscope (render.js's is skipped: look.layer('field') returns true): L.sym-style petals turning one petal
  // per bar, drawn as a soft colour veil woven into the sky + fine lit lines at big moments, light from the star's side, sky only.
  // SOUND-DRIVEN (Wilbow 1:56 PM MDT Oct 25, look/kaleido.js): the chord sets the slices (morph on the next beat), om + key + mode the
  // colours (tension = edge clash), each playing ohm adds its own ring (its colour, timbre = spiky / rounded, loudness = size +
  // brightness), more ohms = deeper layers then one weave, the song arc lifts it from the horizon to the whole sky and unwinds it at
  // the end, big moments are held to the bar line, an unhealed place keeps it thin and dusty. Breath + beat push only in a jam / big.
  // ringPath e: petal sharpness exponent (2 = the round petal; 4 / 8 = spikier, for bright sharp timbres)
  const RP = new Map(); const ringPath = (sym, n, dep, wq, e = 2) => { const k = sym + ':' + n + ':' + dep + ':' + wq + ':' + e; let p = RP.get(k); if (p) return p;
    if (RP.size > 400) RP.clear(); const ph = wq / 48 * 6.283, pts = new Float32Array((n + 1) * 2);
    for (let i = 0; i <= n; i++) { const a = i / n * 6.283, w = Math.cos(a * sym), ww = e === 2 ? w * w : Math.pow(Math.abs(w), e), r = 1 - dep + dep * ww * (1 + .25 * Math.sin(a * sym * 2 - ph)); pts[i * 2] = Math.cos(a) * r; pts[i * 2 + 1] = Math.sin(a) * r; }
    p = { pts, p2: null }; if (typeof Path2D === 'function') { const q = p.p2 = new Path2D(); for (let i = 0; i <= n; i++) i ? q.lineTo(pts[i * 2], pts[i * 2 + 1]) : q.moveTo(pts[0], pts[1]); q.closePath(); }
    RP.set(k, p); return p; };
  const ringDo = (c, p, fill) => { if (p.p2) return fill ? c.fill(p.p2) : c.stroke(p.p2); const a = p.pts; c.beginPath(); for (let i = 0; i < a.length; i += 2) i ? c.lineTo(a[i], a[i + 1]) : c.moveTo(a[0], a[1]); c.closePath(); fill ? c.fill() : c.stroke(); };
  // PERF: the rings are BAKED once per bar (two layers: even rings turn one way, odd rings the other; + one small ohm-ring image when
  // ohms are playing, baked in the same per-bar bake) at a FIXED resolution that does not depend on the zoom scale (the background
  // canvas' device px per CSS px, capped so a layer is <= KCAP px); per frame each layer is only rotated, scaled (zoom sc x grow /
  // breath / kick / song fill) and faded, then clipped to the sky. A zoom never rebakes. Rebaked on a new bar, a palette / sym /
  // device-scale change, or a coarse step of the petal depth. Small LRU (6 bakes: a chord morph holds two) for a second canvas / rung.
  // The sound state is read ONCE per frame (KS.step) and snapshotted into each bake (colours, rings, clash) so a bar never flickers.
  const KOFF = { chord: false, key: false, rhythm: false, ohms: false, density: false, arc: false, moment: false, place: false };
  const KS = createKaleidoSound({ music, bus, feed: ctx, opts: O.kaleido === false ? KOFF : (O.kaleido && typeof O.kaleido === 'object' ? O.kaleido : {}) }); look.api.ks = KS;
  const KC = [], KCAP = 512, KK = new Float64Array(11); let KT = 0, KST = NaN, KRP = 0;
  const kFind = (kk, cols, nr) => { let E = null; for (let i = 0; i < KC.length && !E; i++) { const e = KC[i], k = e.k; let same = true; for (let j = 0; j < 11; j++) if (k[j] !== kk[j]) { same = false; break; } if (same) E = e; }   // numeric key: no string per frame
    if (E) { E.u = ++KT; return E; }
    if (KC.length < 6) KC.push(E = { L: [null, null], N: [null, null], Oc: null, oR: 0, ob: 1, nOk: false, R: [0, 0], b: [1, 1], Rn: [0, 0], bn: [1, 1], k: new Float64Array(11), u: 0, wq: 0, cols: null, rings: [], weave: null, clash: 0, clashCol: null });
    else { E = KC[0]; for (const e of KC) if (e.u < E.u) E = e; }
    E.k.set(kk); E.u = ++KT; E.nOk = false; E.vOk = false; E.nQ = false; E.gen = (E.gen | 0) + 1; E.fresh = true; E.wq = Math.round(((KST * .6 / 6.283) % 1 + 1) % 1 * 48) % 48;
    E.cols = cols ? cols.map(c => c.slice()) : [0, 1, 2, 3].map(k => pal.color((k * 2 + 1) % 6).slice());   // colours taken once per bar
    E.rings = KS.rings.map(r => ({ ...r, col: r.col.slice() })); E.weave = KS.weave ? { ...KS.weave } : null; E.clash = KS.clash; E.clashCol = KS.clashCol.slice();
    return E; };
  const NL = {};   // skyLight scratch (night veil)
  // FIRST-FRAME / BAR-LINE STALL FIX (v0.0.21): a new bar's ring layers are baked in IDLE time (the real look's bake queue, KQ), never
  // inside the frame, as long as an older baked layer can be shown meanwhile (it is the same pattern a bar late: turn, scale, fade and
  // the sound's alpha are still per frame). With nothing baked yet (the very first kaleidoscope frame, the first big moment's lines) that
  // layer simply comes in one idle slice later (it fades in anyway). Without the real look's queue (no KQ.kick) it bakes in the frame. KV / KN: the last entry with its veil / lines baked (what a frame falls back to).
  const KQ = { jobs: [], kick: null }; let KV = null, KN = null;
  // a canvas' draw calls are only RECORDED until it is used (Chromium defers 2D raster): the first frame that drew a fresh bake paid
  // the whole bake there. One 1 px read of each new layer in the idle job rasterises it there instead.
  const kRaster = (E, lines) => { for (const cv of [...(lines ? E.N : E.L), lines ? null : E.Oc]) if (cv) { const g = cv.getContext('2d'); if (g.getImageData) try { g.getImageData(0, 0, 1, 1); } catch (e) { } } };
  // v0.0.25 smoothness (bug fix, BK.kSplit, default on): the 1 px reads now go one layer per job, so an idle slice that has used its
  // time stops between layers instead of rasterising every layer in one go (the ~13 ms idle task at q0). kSplit false = v0.0.24.
  const kSplitOn = () => { try { return BK.kSplit !== false; } catch (e) { return false; } };
  const kDone = (E, lines) => { if (lines) { E.nOk = true; KN = E; } else { E.vOk = true; KV = E; } };
  const kJob = (E, lines, args) => { const g = E.gen; KQ.jobs.push({ run: () => { if (E.gen !== g) return;
    if (!kSplitOn()) { kBake(E, lines, ...args); kRaster(E, lines); kDone(E, lines); return; }
    const st = []; kSteps = st; try { kBake(E, lines, ...args); } finally { kSteps = null; }
    const js = st.map(f => ({ run: () => { if (E.gen === g) f(); } })); js.push({ run: () => { if (E.gen === g) kDone(E, lines); } }); KQ.jobs.unshift(...js); } }); if (KQ.kick) KQ.kick(); };
  const TRP = () => { if (O.trippyGate === false) return 1; const st0 = F.st, v = st0 && typeof st0.trippy === 'number' ? st0.trippy : 1; return v < 0 ? 0 : v > 1 ? 1 : v; };   // trippy gating (Wilbow 12:23 AM Oct 26; Game Dev trippy.js): st.trippy (Game Dev confirmed), missing = 1; opt trippyGate
  const kaleido = (c, L, sc, st) => { const GA = c.globalAlpha; const K = F.R.kaleido, W = st.W, H = st.H, A = st.A || { x: W / 2, y: H * .45 }, sy = skyY(A, sc, H) + H * .02 * sc, ss = skyScaleOf(st, L, sc), syS = skyY(A, ss, H) + H * .02 * ss;   // sy: the land line (clip, moves with the ground); syS / ss: the sky's own (centre, size)
    if (sy <= 0 || !K) return; const trip = Math.max(0, Math.min(1, (look.api.kaleidoIn && typeof look.api.kaleidoIn.trip === 'number') ? look.api.kaleidoIn.trip : st.trip || 0)), burst = Math.min(1, st.burst || 0), sw = place.swell || 0, m0 = Math.min(W, H), t = st.t || 0, m = devOf(c), s = m ? m.a : 1;
    // INPUT SEAM (v0.0.19): look.api.kaleidoIn = { sym, dev, trip, big, depth } - any number set there REPLACES the derived input
    // (null / undefined = derived: from the sound, look/kaleido.js). The kaleidoscope itself stays whole: petals, rings, veil, lit lines.
    const KI = look.api.kaleidoIn, kin = (f, v) => KI && typeof KI[f] === 'number' && KI[f] === KI[f] ? KI[f] : v;
    const wl = world && world.look, dev = Math.max(0, Math.min(1, kin('dev', wl && typeof wl.dev === 'number' ? wl.dev : mix.dev || 0)));
    const beat = music ? music.beat(t) : t, bar = Math.floor(beat / 4), bp = st.barPhase != null ? st.barPhase : (beat / 4) % 1, ph = bar + bp;
    // a burst lights the lines only past a knee: world.js bangs .25 on EVERY chord-root change (and the chord moves at rest),
    // which held the lit lines at ~.2 (a white star outline round the anchor ohm at rest). Key / om / jam / landing bangs (.7-1) still light them.
    const bK0 = typeof O.kaleidoBurstKnee === 'number' ? O.kaleidoBurstKnee : .35, burstK = burst <= bK0 ? 0 : (burst - bK0) / (1 - bK0);
    const big0 = Math.max(typeof st.big === 'number' ? Math.min(1, Math.max(0, st.big)) : 0, sw, burstK);
    if (t !== KST) { const dt = KST === KST ? Math.max(0, Math.min(.25, t - KST)) : 0; KRP += (((KS.rings.length || KS.weave) ? 1 : 0) - KRP) * Math.min(1, dt * 1.5); KST = t; KS.step({ beat, bp, heal: P1 && typeof place.heal === 'number' ? place.heal : typeof st.heal === 'number' ? st.heal : null, dev, big: big0, sym0: (L && L.sym) | 0 || 6 }); }
    const KO = KS.O, sym = Math.max(2, Math.min(16, Math.round(kin('sym', KS.sym)))), symF = KI && typeof KI.sym === 'number' ? sym : Math.max(2, Math.min(16, KS.symFrom)), mo = symF === sym ? 1 : KS.morph;
    const breath = KS.breath != null ? KS.breath : .035 * (.2 + .8 * dev) * Math.sin(ph * Math.PI), kick = KS.kick != null ? KS.kick : sw * .045 * (1 - (beat % 1)) ** 2;
    const grow = (1 + .1 * trip + .22 * burst + .12 * sw) * (.35 + .65 * KS.fill), los = lightOnScreen(st), lx = los[0], ly = los[1];
    // at rest a soft COLOUR VEIL woven into the sky (soft-light: shifts the sky's hue, never paints over it, no outline); the fine lit
    // lines come up with the big moment (held to the bar line) and are palette-tinted, not white; the song arc / place scale the rest
    const big = Math.min(1, Math.max(0, kin('big', KS.big))), bigS = big < .05 ? 0 : big > .6 ? 1 : ((big - .05) / .55) ** 2 * (3 - 2 * (big - .05) / .55), aK = Math.max(bigS, KS.alpha) * TRP();   /* st.trippy gate (veil, ohm rings); lineA below too */
    const veilA = Math.min(.6, K.veil * (.35 + .9 * dev + .5 * trip) + .5 * bigS) * aK, lineA = Math.min(1, .85 * bigS + K.restLine * dev * trip * KS.alpha) * TRP();
    const dep = Math.max(.02, Math.min(.9, kin('depth', (.16 + .26 * ((L && L.rough) || 0) + .12 * sw + .1 * burst) * KS.depthK))), dq = Math.round(dep * 16) / 16, phase = (L && L.phase) || 0;
    const nr = Math.min(KO.place && KS.heal < .4 ? 2 : 4, K.rings), ringA = (KS.rings.length || KS.weave) ? (.62 + .25 * bigS) * aK * Math.min(1, KRP * 1.5) : 0;
    const cx = A.x + KS.nudge * m0, cy = syS > A.y ? syS - (syS - A.y) * KS.lift : A.y, rot = KS.rot * 6.283;
    const KZ = look.api.kz || (look.api.kz = {}); KZ.big = big; KZ.bigS = bigS; KZ.veilA = veilA; KZ.lineA = lineA; KZ.dev = dev; KZ.trip = trip;   // READ-ONLY readout (stills / tests)
    KZ.sym = sym; KZ.symFrom = symF; KZ.morph = mo; KZ.ringA = ringA; KZ.rings = KS.rings.length; KZ.weave = KS.weave ? KS.weave.n : 0; KZ.lift = KS.lift; KZ.fill = KS.fill; KZ.nudge = KS.nudge; KZ.breath = breath; KZ.kick = kick;
    KZ.tension = KS.tension; KZ.rich = KS.rich; KZ.modeB = KS.modeB; KZ.heal = KS.heal; KZ.arc = KS.arc; KZ.jam = KS.jam; KZ.depth = dq; KZ.ringP = KRP;
    const bs0 = Math.pow(2, Math.round(Math.log2(Math.max(.05, s)) * 4) / 4);   // bake px per CSS px: the canvas device scale (never the zoom sc), quantised
    const kk = KK; kk[0] = bar; kk[1] = bs0; kk[3] = 0; kk[4] = nr; kk[5] = dq; kk[6] = (phase * 100) | 0; kk[7] = m0 | 0; kk[8] = K.glow ? 1 : 0; kk[9] = (lx * 10) | 0; kk[10] = (ly * 10) | 0;
    const Ev = world && world.env, nVeil = Ev && typeof Ev.day === 'number' ? (typeof O.kaleidoNight === 'number' ? O.kaleidoNight : .45) * skyLight(Ev.day, NL).night * TRP() : 0; KZ.nightVeil = nVeil;
    // the whole-sky kaleido in space (depth < 0) is CROSSFADED in / out (fix 1:18 AM Oct 26: it brightened in one jump at the layer
    // change, z ~ -2.008): KWH eases to 1 / 0 over ~.5 s; between, the part below the horizon is drawn at KWH (clipped), above as before
    const wT = O.kaleidoSpaceWhole !== false && L && L.depth < 0 ? 1 : 0; KWH = O.kaleidoSpaceFade === false ? wT : KWH + (wT - KWH) * .09; if (Math.abs(KWH - wT) < .004) KWH = wT; KZ.whole = KWH;
    const whole = KWH >= 1, fh = whole || O.softEdges === false ? 0 : H * .035; let GK = 1;   // softEdges: the petals fade out over the last fh px above the land (3 thin clipped strips), no hard cut
    const drawK = () => {
    // a chord change: the old slice count fades out while the new one fades in (both baked; one beat)
    for (let v = mo < 1 ? 0 : 1; v < 2; v++) { const sv = v ? sym : symF, n = sv * K.pts, vA = v ? mo : 1 - mo; kk[2] = sv; kk[3] = n;
      const E0 = kFind(kk, KS.cols, nr), args = [sv, n, dq, nr, m0, bs0, phase, lx, ly, K];
      if (E0.fresh) { E0.fresh = false; if (KQ.kick) kJob(E0, false, args); else { kBake(E0, false, ...args); E0.vOk = true; KV = E0; } }
      if (lineA > .01 && !E0.nOk && !E0.nQ) { E0.nQ = true; if (KQ.kick) kJob(E0, true, args); else { kBake(E0, true, ...args); E0.nOk = true; KN = E0; } }   // the line layers bake only when a big moment needs them
      const E = E0.vOk ? E0 : KV && KV.vOk ? KV : null; if (!E) continue; E.u = Math.max(E.u, KT); const NE = E0.nOk ? E0 : KN && KN.nOk ? KN : null; if (NE) NE.u = Math.max(NE.u, KT);   // not baked yet: the last baked bar meanwhile
      // PERF: veil (soft-light) + lit layer (lines + veil light + ohm rings; big moments) + the ohm rings ('lighter', one image) at most
      for (let pass = 0; pass < 3; pass++) {
        const a = (pass === 0 ? veilA * (1 - bigS) : pass === 1 ? lineA : NE && lineA > .01 ? (lineA >= .6 * ringA ? 0 : ringA - lineA) : ringA) * vA;   // lit layer on: it carries the rings (>= .6 x ringA)
        if (a < (pass === 2 ? .03 : .004) || (pass === 1 && !NE) || (pass === 2 && !E.Oc)) continue;
        c.globalCompositeOperation = pass === 0 ? K.blend : 'lighter'; c.globalAlpha = GA * GK * Math.min(1, a);
        const nl = pass === 2 ? 1 : Math.min(2, nr), EP = pass === 1 ? NE : E, Ls = pass === 1 ? EP.N : EP.L, RB = pass === 1 ? EP.Rn : EP.R, BB = pass === 1 ? EP.bn : EP.b;
        for (let li = 0; li < nl; li++) { if (li && pass === 0 && KRP > .995) continue; const cv = pass === 2 ? E.Oc : Ls[li], R0 = pass === 2 ? E.oR : RB[li], b0 = pass === 2 ? E.ob : BB[li], f = (grow + breath * (1 + li * .5) + kick) * ss, k = f / b0; if (!cv || R0 * k < 2) continue;
          if (li && pass === 0 && KRP > .005) c.globalAlpha = GA * GK * Math.min(1, a) * (1 - KRP);   // PERF: the ohm rings take the counter-turning veil layer's place (<= 3 draws)
          c.save(); c.translate(cx, cy); c.rotate(rot / sv * (li ? -1 : 1)); c.scale(k, k);
          const h = cv.width / 2; c.drawImage(cv, -h, -h);
          // NIGHT (v0.0.21): soft-light over a near-black sky is invisible; at night the veil is also a faint LIGHT in the sky ('lighter',
          // nightVeil x the night weight of skyLight(day)), the same baked layer, same turn / scale: a glow against the night, not paint
          if (pass === 0 && nVeil > .004) { const ga = c.globalAlpha, go = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, ga * nVeil); c.drawImage(cv, -h, -h); c.globalCompositeOperation = go; c.globalAlpha = ga; }
          c.restore(); } } }
    };
    if (whole) drawK(); else { c.save(); c.beginPath(); c.rect(-W, -H * 4, W * 3, sy - fh + H * 4); c.clip(); drawK(); c.restore();
      for (let j = 0; j < 3 && fh > 0; j++) { const g0 = 1 - (j + .5) / 3; GK = g0 + (1 - g0) * KWH; c.save(); c.beginPath(); c.rect(-W, sy - fh + j * fh / 3, W * 3, fh / 3); c.clip(); drawK(); c.restore(); }
      if (KWH > .004) { GK = KWH; c.save(); c.beginPath(); c.rect(-W, sy, W * 3, H * 4); c.clip(); drawK(); c.restore(); } GK = 1; }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = GA; };
  // bake one bar's ring layers: lines=false -> the soft colour VEIL (nested petal fills, densest inside, no edge stroke, no white;
  // tension adds a slight clash colour at the outer edge) + the OHM RINGS image; lines=true -> the fine lit lines (palette colour,
  // only 20% toward white at the lit side, + a soft glow stroke)
  // v0.0.25 smoothness (bug fix): with the split on, each ring's draws are a step of their own followed by a 1 px read, so the raster
  // of one bar's layers is spread over idle slices (one big layer's read was the ~13 ms idle task at q0). kSteps null = draw now.
  let KWH = 0, kSteps = null; const kRd = g => { if (g.getImageData) try { g.getImageData(0, 0, 1, 1); } catch (e) { } };
  const kDo = (g, f) => { if (kSteps) kSteps.push(() => { f(); kRd(g); }); else f(); };
  const kBake = (E, lines, sym, n, dq, nr, m0, bs0, phase, lx, ly, K) => { const pth = ringPath(sym, n, dq, E.wq), cols = E.cols, Ls = lines ? E.N : E.L;
    for (let li = 0; li < Math.min(2, nr); li++) { const ks = []; for (let k = li; k < nr; k += 2) ks.push(k); const rOf = k => m0 * (.32 + k * .26);
      const Rc = Math.max(rOf(ks[ks.length - 1]) * (1 + dq * .3), lines && !li && (E.rings.length || E.weave) ? kOhmRc(E, m0) : 0), bs = Math.min(bs0, (KCAP - 8) / (2 * Rc)), Dp = Math.max(8, Math.ceil((Rc * bs + 4) * 2)); (lines ? E.Rn : E.R)[li] = Dp / 2; (lines ? E.bn : E.b)[li] = bs;
      let cv = Ls[li]; if (!cv || cv.width !== Dp) cv = Ls[li] = mkL(Dp, Dp); const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, Dp, Dp); g.lineJoin = 'round';
      for (const k of ks) kDo(g, () => { const rr = rOf(k), rot = phase + k, cr = Math.cos(-rot), sr = Math.sin(-rot), ux = lx * cr - ly * sr, uy = lx * sr + ly * cr, col = cols[k], u = bs * rr;
        if (!lines) { const lo = [col[0] * .7, col[1] * .7, col[2] * .7];   // the veil: shade side a little deeper, lit side the full colour (light from the star's side)
          for (let j = 0; j < 5; j++) { const s = 1 - j * .09; g.setTransform(u * s, 0, 0, u * s, Dp / 2, Dp / 2); g.rotate(rot + j * .04);
            const gr = g.createLinearGradient(-ux, -uy, ux, uy); gr.addColorStop(0, rgba(lo, 1)); gr.addColorStop(1, rgba(col, 1)); g.fillStyle = gr; g.globalAlpha = .2; ringDo(g, pth, 1); }
          if (E.clash > .12 && k === ks[ks.length - 1] && K.soft !== false) { g.fillStyle = rgba(E.clashCol, 1); for (let j = 0; j < 2; j++) { g.setTransform(u * (1.03 + j * .03), 0, 0, u * (1.03 + j * .03), Dp / 2, Dp / 2); g.rotate(rot + .5 / sym); g.globalAlpha = .12 * E.clash; ringDo(g, pth, 1); } }   // tension: a clashing bloom just past the edge (no stroke)
          else if (E.clash > .12 && k === ks[ks.length - 1]) { g.setTransform(u, 0, 0, u, Dp / 2, Dp / 2); g.rotate(rot); g.strokeStyle = rgba(E.clashCol, 1); g.globalAlpha = .45 * E.clash; g.lineWidth = 5 / u; ringDo(g, pth, 0); }   // tension: the edge clashes
          return; }
        { const lo = [col[0] * .7, col[1] * .7, col[2] * .7];   // the veil as added light under the lines (~.55 x veil at the full takeover)
          for (let j = 0; j < 5; j++) { const s = 1 - j * .09; g.setTransform(u * s, 0, 0, u * s, Dp / 2, Dp / 2); g.rotate(rot + j * .04);
            const gr = g.createLinearGradient(-ux, -uy, ux, uy); gr.addColorStop(0, rgba(lo, 1)); gr.addColorStop(1, rgba(col, 1)); g.fillStyle = gr; g.globalAlpha = .2 * .38; ringDo(g, pth, 1); } }
        const hi = [col[0] + (255 - col[0]) * .2, col[1] + (255 - col[1]) * .2, col[2] + (255 - col[2]) * .2];
        g.setTransform(u, 0, 0, u, Dp / 2, Dp / 2); g.rotate(rot);
        const gr = g.createLinearGradient(-ux, -uy, ux, uy); gr.addColorStop(0, rgba(col, .25)); gr.addColorStop(.55, rgba(col, .8)); gr.addColorStop(1, rgba(hi, 1)); g.strokeStyle = gr;
        if (K.soft !== false) { g.fillStyle = gr; for (let j = 0; j < 3; j++) { const s = 1.025 - j * .025; g.setTransform(u * s, 0, 0, u * s, Dp / 2, Dp / 2); g.rotate(rot); g.globalAlpha = .045 + .025 * j; ringDo(g, pth, 1); } return; }   // #2: bloom petals, no lines (opts.realLook.kaleido.soft = false: the old lit lines)
        if (K.glow) { g.globalAlpha = .2 / .85; g.lineWidth = 3.2 / u; ringDo(g, pth, 0); }
        g.globalAlpha = 1; g.lineWidth = 1.05 / u; ringDo(g, pth, 0); });
      if (lines && !li && (E.rings.length || E.weave)) kDo(g, () => { g.lineJoin = 'round'; kDrawOhms(g, E, sym, n, dq, m0, E.bn[0], phase, Dp / 2); }); }   // the ohm rings ride the lit layer too (big moments: <= 3 draws)
    if (!lines) kBakeOhms(E, sym, n, dq, m0, bs0, phase); kSteps = null; };
  // the OHM RINGS (one image per bar, all playing ohms): ring i sits a little further out than ring i-1, loudness = size + brightness,
  // bright / sharp timbre = spiky petals with a crisp 1 px edge, soft / warm = round petals, three soft offset fills (blurred), no edge
  const KSOFT = () => !(F.R && F.R.kaleido && F.R.kaleido.soft === false);
  const kRadius = r => .2 + .085 * r.i, kLoud = r => .72 + .5 * r.loud;
  const kOhmRc = (E, m0) => { let Rm = E.weave ? .66 : 0; for (const r of E.rings) Rm = Math.max(Rm, kRadius(r) * kLoud(r)); return m0 * Rm * 1.3; };
  const kBakeOhms = (E, sym, n, dq, m0, bs0, phase) => { if (!E.rings.length && !E.weave) { E.Oc = null; return; }
    const Rc = kOhmRc(E, m0), bs = Math.min(bs0, (KCAP - 8) / (2 * Rc)), Dp = Math.max(8, Math.ceil((Rc * bs + 4) * 2));
    E.oR = Dp / 2; E.ob = bs; let cv = E.Oc; if (!cv || cv.width !== Dp) cv = E.Oc = mkL(Dp, Dp); const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, Dp, Dp); g.lineJoin = 'round';
    kDo(g, () => kDrawOhms(g, E, sym, n, dq, m0, bs, phase, Dp / 2)); };
  const kDrawOhms = (g, E, sym, n, dq, m0, bs, phase, h) => { const R = E.rings, Wv = E.weave;
    for (const r of R) { const u = bs * m0 * kRadius(r) * kLoud(r), e = r.sharp > .66 ? 8 : r.sharp > .4 ? 4 : 2, dp = Math.round(Math.min(.85, dq + .12 + .3 * r.sharp) * 16) / 16, p = ringPath(sym, n, dp, E.wq, e), rot = phase + .9 * r.i + .5 / sym;
      const col = r.col, hi = [col[0] + (255 - col[0]) * .3, col[1] + (255 - col[1]) * .3, col[2] + (255 - col[2]) * .3], aa = Math.min(1, r.a);
      if (KSOFT()) { g.fillStyle = rgba(col, 1); for (let j = 0; j < 3; j++) { const s = 1.06 - j * .06; g.setTransform(u * s, 0, 0, u * s, h, h); g.rotate(rot); g.globalAlpha = .2 * aa; ringDo(g, p, 1); }   // #2: every ohm ring a soft bloom; bright timbre = a brighter, tighter core (no edge line)
        if (e > 2) { g.fillStyle = rgba(hi, 1); g.setTransform(u * .9, 0, 0, u * .9, h, h); g.rotate(rot); g.globalAlpha = .22 * aa * (e > 4 ? 1.3 : 1); ringDo(g, p, 1); } }
      else if (e > 2) { g.setTransform(u, 0, 0, u, h, h); g.rotate(rot); g.fillStyle = rgba(col, 1); g.globalAlpha = .2 * aa; ringDo(g, p, 1);
        g.strokeStyle = rgba(hi, 1); g.globalAlpha = .95 * aa; g.lineWidth = 1.2 / u; ringDo(g, p, 0); }
      else { g.fillStyle = rgba(col, 1); for (let j = 0; j < 3; j++) { const s = 1.06 - j * .06; g.setTransform(u * s, 0, 0, u * s, h, h); g.rotate(rot); g.globalAlpha = .2 * aa; ringDo(g, p, 1); }
        g.setTransform(u, 0, 0, u, h, h); g.rotate(rot); g.strokeStyle = rgba(col, 1); g.globalAlpha = .16 * aa; g.lineWidth = 7 / u; ringDo(g, p, 0); } }
    if (Wv) { const u = bs * m0 * .66, p = ringPath(sym * 2, n * 2, Math.min(.6, dq + .2), E.wq, 2), hi = [Wv.col[0] + (255 - Wv.col[0]) * .25, Wv.col[1] + (255 - Wv.col[1]) * .25, Wv.col[2] + (255 - Wv.col[2]) * .25];   // past the cap: one interlaced weave
      if (KSOFT()) { g.fillStyle = rgba(hi, 1); for (let j = 0; j < 3; j++) { g.setTransform(u * (1 - j * .05), 0, 0, u * (1 - j * .05), h, h); g.rotate(phase + j * 3.1416 / sym / 3); g.globalAlpha = Math.min(1, Wv.a) * .14 * (1 - j * .2); ringDo(g, p, 1); } return; }
      g.strokeStyle = rgba(hi, 1); g.lineWidth = 1.1 / u; for (let j = 0; j < 3; j++) { g.setTransform(u * (1 - j * .05), 0, 0, u * (1 - j * .05), h, h); g.rotate(phase + j * 3.1416 / sym / 3); g.globalAlpha = Math.min(1, Wv.a) * (1 - j * .2); ringDo(g, p, 0); } } };
  // ---- P1 (opts.p1): one place across its states + the big-event pattern. Off by default. ---------------------------
  const S3 = [null, null, null], sw3 = () => { S3[0] = pal.color(0); S3[1] = pal.color(2); S3[2] = pal.color(4); return S3; };   // reused (palette swatches are live arrays)
  const LK = { px: -1, ph: -1, n: -1, gold: -1, k: -1, key: '', paint: null };   // the jam lace key + painter, rebuilt only when an input changes (not per frame)
  const lace = (px, n, gold, k = 1) => { gold = Math.round(gold * 4) / 4;   // colours are taken at bake time: recoloured once per phrase
    if (LK.px !== px || LK.ph !== F.phrase || LK.n !== n || LK.gold !== gold || LK.k !== k) { const ph = F.phrase; LK.px = px; LK.ph = ph; LK.n = n; LK.gold = gold; LK.k = k; LK.key = `lace${px}:${ph}:${n}:${gold}:${k}`;
      LK.paint = (x, w) => { const cs = sw3(); paintLace(x, w, { n, cols: [cs[0], cs[1], cs[2], [255, 214, 120]], seed: (ph * 7919 + n) >>> 0, gold, k }); }; }
    return sprites.get(LK.key, px, px, LK.paint); };
  const bandsGradient = (c, h, cols) => { if (!c.createLinearGradient) return null; const g = c.createLinearGradient(0, 0, 0, h), N = 96, nc = cols.length;   // = paintBands (place.js), sampled every 1/96
    // v0.0.19: the colour glides from band to band (smoothstep) instead of stepping: no hard horizontal edges in the sky
    const BC = F.bc || (F.bc = [0, 0, 0]); for (let i = 0; i <= N; i++) { const f = Math.min(.9999, i / N), u = f * nc * 1.999, i0 = Math.floor(u), fr = u - i0, e = fr * fr * (3 - 2 * fr), c0 = cols[i0 % nc], c1 = cols[(i0 + 1) % nc], a = Math.pow(Math.sin(f * Math.PI * nc * .9), 2) * (1 - f) * .7;
      BC[0] = c0[0] + (c1[0] - c0[0]) * e; BC[1] = c0[1] + (c1[1] - c0[1]) * e; BC[2] = c0[2] + (c1[2] - c0[2]) * e; g.addColorStop(i / N, rgba(BC, a)); }
    return g; };
  if (P1) {
    // a small ring of reused result objects (render.js reads the result at once, per layer): no object per layer per frame
    const PR = [0, 1, 2, 3].map(() => ({ hue: 0, spread: 0, sat: 0, light: 1 })); let pri = 0;
    look.palette = (L, st) => { const p = place, k = p.trip, o = PR[pri = (pri + 1) & 3]; o.hue = (L.hue + (pal.rot || 0) * k * .5 + 360) % 360; o.spread = L.spread * (.2 + .5 * p.colour + .8 * p.vivid + p.cover);
      o.sat = 6 + 26 * p.colour + 55 * p.vivid + 15 * p.cover; o.light = 1 - .3 * p.dust + .25 * p.cover; return o; };
    // field pass (background canvas, ~0.6x res, every other frame): sky sound bands (developing). over pass: dust / crack / grain (unhealed)
    look.layerP1 = (c, L, sc, st, pass) => { const R = F.R; if (!R) return; const GA = c.globalAlpha; const W = st.W, H = st.H;
      if (pass === 'field' && R.bands.on && place.colour > .02) { const cs = sw3(), bk = (Math.floor(F.beat - .5) & 0xffffff) * 8192 + (H | 0);   // rebuilt ONCE PER BEAT, mid-beat (the palette's eased beat step has settled to ~95%), with that moment's colours; was on every coarse colour change of the slide (~every other frame) = 97 colour strings + a gradient per rebuild
        // PERF: the same bands as paintBands' 128 rows, as ONE linear gradient fill (a stretched 4x128 sprite pays the bilinear filter per pixel)
        if (F.bandK !== bk) { F.bandK = bk; F.bandG = bandsGradient(c, H * .62, cs); }
        if (F.bandG) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = GA * Math.min(1, R.bands.a * place.colour * (.5 + .3 * place.vivid + .4 * place.cover) * (O.restMute === false ? 1 : .2 + .8 * (place.music || 0)) * F.trp); c.fillStyle = F.bandG; c.fillRect(0, 0, W, H * .62); c.globalCompositeOperation = 'source-over'; c.globalAlpha = GA; } }
      if (pass === 'over' && R.dust.on && place.dust > .02) { c.globalAlpha = GA * Math.min(1, .75 * place.dust);
        // PERF: the tile is baked at the canvas' device scale and the pattern mapped 1:1 onto device px (a pattern scaled by the
        // background canvas' .4-.6 transform is a filtered fill per pixel); same grain size on screen
        if (R.dust.tex) { const m = devOf(c), ds = m ? m.a : 1, TP = Math.max(16, Math.round(192 * ds)), SP = O.dustSplit !== false, gk = SP ? 'grain' : 'all', dk = `dust:${O.seed || 1}:${TP}:${gk}`, ck = `dust:${O.seed || 1}:${TP}:crack`; let pe = F.pat.get(c);
          const job = (k, part) => { if (!sprites.map.has(k) && !OX.pend.has(k)) { OX.pend.add(k); OX.jobs.push({ key: k, w: TP, paint: (x, w) => { x.save(); x.scale(w / 192, w / 192); paintDust(x, 192, O.seed || 1, part); x.restore(); } }); } };
          // v0.0.21 stall fix: the grain tile bakes in idle time (the real look's queue); until it is there the grain is its flat average
          if ((!pe || pe.ds !== ds || pe.k !== dk) && OX.on && !sprites.map.has(dk)) { job(dk, gk); if (SP) job(ck, 'crack');
            c.globalAlpha = GA * Math.min(1, .3 * place.dust); c.fillStyle = 'rgb(120,108,92)'; c.fillRect(0, 0, W, H); c.globalAlpha = GA; }
          else { const mk = (k, part) => { const tile = sprites.get(k, TP, TP, (x, w) => { x.save(); x.scale(w / 192, w / 192); paintDust(x, 192, O.seed || 1, part); x.restore(); }, true);
              const pt = c.createPattern(tile, 'repeat'); if (pt && m && pt.setTransform && typeof DOMMatrix === 'function') pt.setTransform(new DOMMatrix([1 / ds, 0, 0, 1 / ds, 0, 0])); return pt; };
            if (!pe || pe.ds !== ds || pe.k !== dk) { pe = { ds, k: dk, pt: mk(dk, gk), ct: null }; F.pat.set(c, pe); }
            c.fillStyle = pe.pt; c.fillRect(0, 0, W, H);
            // dustSplit: the cracks only on the ground, below this layer's land line (look.sky's skyY, this frame), with a soft fade-in
            // band at the line (FRONT worlds: the floor line, below the far ridges and the water); no land line known for this layer (not the home ground) = grain only. Look-side: the world's sky is not clipped.
            const ly = SP && F.landN === F.n && (F.landL ? F.landL === L : world && L === world.home) ? Math.max(F.landY, F.floorY || 0) : null;   // FRONT worlds: the ground the ohms stand on (floorF), not the far ridges / sea between
            if (ly !== null && ly < H) { if (!pe.ct && (!OX.on || sprites.map.has(ck))) pe.ct = mk(ck, 'crack'); else if (!pe.ct) job(ck, 'crack');
              if (pe.ct) { const a0 = c.globalAlpha, f = H * .035, y0 = Math.max(0, ly); c.fillStyle = pe.ct; F.crackN = F.n; F.crackY = ly;
                for (let i = 0; i < 4; i++) { const ya = ly + f * i / 4; if (ya + f / 4 <= y0) continue; c.globalAlpha = a0 * (i + .5) / 4; c.fillRect(0, Math.max(y0, ya), W, ya + f / 4 - Math.max(y0, ya)); }
                c.globalAlpha = a0; const yb = Math.max(y0, ly + f); if (yb < H) c.fillRect(0, yb, W, H - yb); } } } }
        else { c.fillStyle = 'rgb(120,108,92)'; c.fillRect(0, 0, W, H); }
        c.globalAlpha = GA; }
      // big event, full-screen part: drawn on the background canvas (BGS scale, ~16-25% of the screen's pixels), under the ohms
      if (pass === 'over' && R.swell.on && R.swell.full && place.swell > .01) swellSky(c, L, sc, st); };
    look.layer = look.layerP1;
    look.post = (g, st) => { const R = F.R; if (!R) return; const W = st.W, H = st.H, A = st.A || { x: W / 2, y: H * .45 };
      // pattern in the space between jamming ohms (38 A): nearest pairs, one lace sprite each, turning with the bar
      if (R.lace.on && F.jamN >= 2 && place.vivid + place.cover > .03) { const s = lace(R.lace.px, 6, place.vivid, 1.6); if (s) { F.lace = s; F.laceK = LK.key; } else if (F.lace && !sprites.map.has(F.laceK)) F.lace = null;   // jam lace: stronger lines (was faint); never draw an evicted (pooled) canvas
        if (F.lace) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, place.vivid * 1.2 + place.cover * .3); let used = 0, n = 0;   // used: bitmask (jamN <= 8)
          for (let i = 0; i < F.jamN && n < R.lace.max; i++) { if (used & (1 << i)) continue; let bj = -1, bd = 1e18; const a = F.jam[i];
            for (let j = i + 1; j < F.jamN; j++) { if (used & (1 << j)) continue; const d = (F.jam[j].x - a.x) ** 2 + (F.jam[j].y - a.y) ** 2; if (d < bd) { bd = d; bj = j; } }
            if (bj < 0) break; used |= (1 << i) | (1 << bj); const b = F.jam[bj], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, rr = Math.min(R.lace.r || 80, Math.sqrt(bd) * .5 + Math.max(a.r, b.r) * 1.2);
            const br = rr * (1 + .08 * Math.sin(F.beat * 3.1416)); g.drawImage(F.lace, mx - br, my - br, br * 2, br * 2); n++; }   // axis-aligned + breathing on the beat (no per-frame rotate: much cheaper raster)
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; } }
      // big event (38 B / 36 B / 39 A D): full-screen pattern that lands on the beat and settles back over 1-4 bars
      if (R.swell.on && place.swell > .01) {
        if (R.swell.wash) { const c = pal.color(1); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .18 * place.swell; g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fillRect(0, 0, W, H); }
        else { if (R.swell.dim || place.O.dim) { g.globalAlpha = Math.min(1, .5 * place.cover); g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H); }
          // post(): a modest, crisp centre burst on the anchor: ONE fine-lined 8-fold lace baked at its exact device size (per phrase) and
          // drawn 1:1; the beat kick is alpha only. (Was 3 thick layers at 256 px scaled up to ~2.6x = a dense woven ball.)
          // its OWN pre-allocated canvas (reused; reallocated only when the size changes), rebaked once per phrase / size / dpr with the
          // phrase's colours (was re-keyed on every palette slide: ~80 big rebakes + canvases per 240 frames of a peak)
          const m = devOf(g), dpr = m ? m.a : 1, rr = Math.min(W, H) * (R.swell.cr || .2), D = Math.max(16, Math.round(rr * 2 * dpr / 8) * 8), BC = F.bc || (F.bc = { cv: null, D: 0, ph: NaN, dpr: 0 });
          if (BC.D !== D || BC.ph !== F.phrase || BC.dpr !== dpr) { BC.D = D; BC.ph = F.phrase; BC.dpr = dpr; if (!BC.cv || BC.cv.width !== D) BC.cv = mkL(D, D);
            const x = BC.cv.getContext('2d'); if (typeof x.reset === 'function') x.reset(); else { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; } x.clearRect(0, 0, D, D);
            paintLace(x, D, { n: 8, cols: sw3().slice(), seed: (F.phrase * 7919 + 8) >>> 0, gold: .5, k: .9, lw: Math.max(1, dpr * .75), layers: 1, glow: 1 }); F.bigC = BC.cv; }
          if (F.bigC) { const kick = (1 - (F.beat % 1)) ** 2, Dc = F.bigC.width / dpr;
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(.8, place.swell * (.3 + .4 * place.O.takeover) * (.85 + .15 * kick)); blit(g, F.bigC, A.x - Dc / 2, A.y - Dc / 2, Dc, Dc, m); } } }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; };
  }
  // ---- REAL SPACE + GROUND (on; opts.realLook = false turns it off). p1 above is untouched. --------------------------------------
  // Same building blocks at every scale ("parralels but not clones"): ground, planet and star all read ONE shared state (mix, place,
  // palette, the music clock); unhealed = real but muted, dusty and cracked, healed = vivid colour over the same real light; the big
  // psychedelic moments are the place swell / st.burst envelope only (1-4 bars, lands on the beat), never a per-beat throb.
  const sub = v => (typeof v === 'object' && v ? v : {}), RL = sub(O.realLook), REAL = O.realLook !== false && O.realLook != null && O.realLook !== 0;
  const mkC = ctx.makeCanvas || defaultMakeCanvas, nowF = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  OX.on = REAL;
  if (REAL && !P1) place.listen(bus, music);   // the heal state drives the materials; P1's own stepping is unchanged
  const planets = REAL ? createPlanets({ sprites, makeCanvas: mkC, opts: sub(RL.planet) }) : null, stars = REAL ? createStars({ sprites, opts: sub(RL.star) }) : null,
    ground = REAL ? createGround({ makeCanvas: mkC, opts: sub(RL.ground) }) : null, sky = REAL ? createSky(sub(RL.sky), mkC) : null, air = REAL && RL.air !== false ? createAir(sub(RL.air), mkC) : null;   // air: sun disc, sister planets, cloud decks + rain curtains, far ranges, jam light (air.js)
  AU.air = air; if (air) look.api.air = air;
  const gl = REAL ? createGL({ mix, place, pal, opts: sub(RL.gl) }) : null;
  const sh = { lit: 1, heal: 1, bright: 1, dust: 0, vivid: 0, colour: 0, trip: 0, peak: 0, swell: 0, season: 0, weather: .5, glow: 0, ms: 0 };   // READ-ONLY readout (two-way coupling: others may read, never a matrix row)
  const tripCols = () => { const out = F.tc || (F.tc = []); for (let i = 0; i < 6; i++) out[i] = pal.color(i).slice(0, 3); return out; };
  const ctxReal = (st, extra) => { const q = F.q, c = gl.ctxOf(st || F.st || {}, null);
    return { q, heal: c.heal, trip: c.trip, swell: c.swell, burst: (st && st.burst) || 0, glow: sh.glow, season: c.seasonOn ? c.season : null, weather: c.seasonOn || (st && st.weather != null) ? c.weather : null,
      tripCols: c.trip > .03 ? tripCols() : null, palKey: pal.ver | 0, flareCol: pal.color(2).slice(0, 3), atmoTint: pal.color(1).slice(0, 3), tint: pal.color(1).slice(0, 3), takeover: gl.O.takeover, ...extra }; };
  // BAKES RUN OUTSIDE THE FRAME. Planet textures, lit discs, trippy tints, air rims and ground tiles are all incremental jobs; they run
  // in idle time (requestIdleCallback with its deadline, else a setTimeout(0) slice after the frame), never inside look.frame or a
  // draw hook. A frame only blits finished bakes; what is not baked yet shows the last finished version (or a lit vector stand-in).
  // bake.mode: 'auto' (idle > timeout > frame), 'idle', 'timeout', 'frame' (old in-frame budget), 'manual' (host calls look.api.idle(ms)).
  const BK = { mode: 'auto', sliceMs: [6, 5, 4, 3], kSplit: true, ...sub(RL.bake) }, hasWork = () => !!(KQ.jobs.length || OX.jobs.length || (planets && planets.jobs.length) || (ground && ground.jobs.length) || (stars && stars.jobs.length) || (AU.a && AU.a.jobs.length) || (AU.rk && AU.rk.jobs.length) || (AU.gx && AU.gx.jobs.length) || (AU.air && AU.air.busy()));
  look.api.bake = BK;   // v0.0.25: the bake options (kSplit) for the dev panel
  const bakeSlice = (ms, q = F.q) => { const t0 = nowF(); let n = 0;
    while (hasWork() && n++ < 64) { const left = ms - (nowF() - t0); if (left <= 0) break;
      if (KQ.jobs.length) { KQ.jobs.shift().run(); continue; }   // the kaleidoscope's next bar first (it is on screen now, a bar late)
      const aj = AU.a && AU.a.on && AU.a.jobs.length, rj = AU.rk && AU.rk.jobs.length, rest = OX.jobs.length || (ground && ground.jobs.length) || (planets && planets.jobs.length) || (stars && stars.jobs.length);
      if (rj || aj) { const sh2 = left * (rest ? .6 : 1) / (rj && aj ? 2 : 1); if (rj) AU.rk.pump(sh2); if (aj) AU.a.pump(sh2); if (!rest) continue; }   // then the rare ohms' bodies / rings and the tradition auras (on screen now: drawn from the last size / a fallback until then), ahead of the ground (it would take every slice)
      while (OX.jobs.length && nowF() - t0 < ms) { const J = OX.jobs.shift(); OX.pend.delete(J.key); if (!sprites.map.has(J.key)) { const c = sprites.get(J.key, J.w, J.w, J.paint, true), x = c && c.getContext && c.getContext('2d'); if (x && x.getImageData) try { x.getImageData(0, 0, 1, 1); } catch (e) { } } }   // v0.0.22: raster the exact sprite HERE (Chromium only records the draw calls until first use: the frame that first drew a fresh glow / lit / core sprite paid its whole raster)
      if (stars.jobs.length) stars.pump(q, left);
      if (planets.jobs.length) planets.pump(q, ground.jobs.length ? left * .6 : left); const l2 = ms - (nowF() - t0); if (ground.jobs.length && l2 > 0) ground.pump(q, l2);
      const l3 = ms - (nowF() - t0); if (AU.a && AU.a.jobs.length && l3 > 0) AU.a.pump(l3);
      const l4 = ms - (nowF() - t0); if (AU.gx && AU.gx.jobs.length && l4 > 0) AU.gx.pump(l4); const l5 = ms - (nowF() - t0); if (AU.air && AU.air.busy() && l5 > 0) AU.air.pump(l5); }   // the galaxy bake (row chunks; swaps in whole)
    const d = nowF() - t0; sh.idleMs = (sh.idleMs || 0) + d; return d; };
  const mode = BK.mode !== 'auto' ? BK.mode : typeof requestIdleCallback === 'function' ? 'idle' : typeof setTimeout === 'function' ? 'timeout' : 'frame';
  let pending = false;
  const kick = () => { if (pending || !hasWork()) return; pending = true; const q = F.q, sl = BK.sliceMs[q] != null ? BK.sliceMs[q] : 4;
    if (mode === 'idle') requestIdleCallback(dl => { pending = false; const ms = Math.min(sl, dl.didTimeout ? sl : dl.timeRemaining() - .5); if (ms > .3) bakeSlice(ms, q); if (hasWork()) kick(); }, { timeout: 250 });
    else setTimeout(() => { pending = false; bakeSlice(sl, q); }, 0); };
  if (REAL) KQ.kick = kick;
  const FS = { heal: undefined, trip: undefined, peak: undefined, burst: undefined, big: undefined, season: undefined, weather: undefined };
  if (REAL) { const frame0 = look.frame;
    look.frame = st => { frame0(st); const t0 = nowF(); F.n = (F.n | 0) + 1; if (AU.ro) AU.ro.frame(F.n, music && music.beat ? music.beat(st.t) : (st.t || 0) * 2); if (AU.oc) AU.oc.frame(F.n, st.t, music && music.beat ? music.beat(st.t) : (st.t || 0) * 2, st.q | 0); ground.frame();
      if (!P1) place.step(st, mix, music, sim);   // P1 already stepped it
      const wp = world && world.place, fs = FS;   // the fields ctxOf reads, in ONE reused object (was a spread copy of st per frame)
      fs.heal = st.heal; fs.trip = st.trip; fs.peak = st.peak; fs.burst = st.burst; fs.big = st.big; fs.season = st.season != null ? st.season : wp && wp.season; fs.weather = st.weather != null ? st.weather : wp && wp.weather;
      const c = gl.ctxOf(fs, null);
      sh.heal = c.heal; sh.dust = c.dust; sh.vivid = c.vivid; sh.colour = place.colour || 0; sh.trip = c.trip; sh.peak = c.peak; sh.swell = c.swell; sh.season = c.season; sh.weather = c.weather;
      sh.glow = c.glow;   // crack glow: big events only (gl.ctxOf, opts.gl.glowEventsOnly ON: the place swell or st.big past glowFloor; 0 at rest)
      const ld = st.lightDir; sh.lit = Array.isArray(ld) ? Math.max(0, Math.min(1, .5 + ld[1] * 1.2)) : typeof st.daylight === 'number' ? st.daylight : 1;   // how lit (sun height; world y up)
      sh.bright = sh.lit * (1 - .45 * sh.dust) * (1 + .35 * sh.vivid) * (1 + .5 * sh.swell) * (1 - .15 * Math.max(0, sh.weather - .6) / .4);
      planets.tick(); ground.tick(); if (AU.a && AU.a.on) AU.a.frame(st, music, world && world.env, F.q); if (AU.rk) AU.rk.frame(F.q, light.angle, light.color);
      if (mode === 'frame') { planets.pump(F.q); ground.pump(F.q); } else if (mode !== 'manual') kick();
      sh.ms = nowF() - t0; };
    look.readout = () => sh;   // {lit, heal, bright, dust, vivid, colour, trip, peak, swell, season, weather, glow}: how lit / healed / bright the place looks
    look.api.planets = planets; look.api.stars = stars; look.api.ground = ground; look.api.sky = sky; look.api.gl = gl; look.api.bakeMode = mode;
    look.api.idle = ms => bakeSlice(ms);   // run bakes for up to ms now (host idle time; 'manual' mode)
    look.api.pending = hasWork;
    look.api.flush = () => { let n = 0; while (hasWork() && n++ < 1e5) bakeSlice(1e9, 0); }; }
  // REAL: the look owns the field kaleidoscope. render.js draws its field + sky gradients BEFORE calling layer('field') (render.js
  // drawLayer: radial bg, then the real>.05 sky gradient, then `if (!(look.layer(...,'field') === true) && ...)` kaleidoscope), so
  // returning true removes only render's kaleidoscope; the sky is kept.
  if (REAL) { const p1 = look.layerP1; look.layer = (c, L, sc, st, pass) => { if (p1) p1(c, L, sc, st, pass); if (pass === 'field' && F.R) { kaleido(c, L, sc, st || F.st); return true; } }; }
  const wst = st => { const wp = world && world.place; return wp && st && st.season == null && wp.season != null ? { ...st, season: wp.season, weather: wp.weather } : st; };
  // 2D hooks: return true when they drew (so render.js skips its own body), false when off / nothing to draw
  if (REAL) { look.planet = (c, p, x, y, r, st) => { if (!F.R || !p) return false; st = wst(st || F.st); const ex = typeof p.heal === 'number' ? { heal: p.heal } : {};
      return planets.draw(c, p, x, y, r, st, ctxReal(st, ex)); };
    look.planetMat = (T, p, st) => gl.planetMat(T, p, st); look.atmoMat = (T, p, st) => gl.atmoMat(T, p, st); look.cloudMat = (T, p, st) => gl.cloudMat(T, p, st); look.waterMat = (T, p, st) => gl.waterMat(T, p, st); }
  // look.planetRim(c, x, y, r, st) (render.js drawPlanet, bend > .3): the planet's air as a calm band of light (calmRim)
  if (REAL && O.calmRim !== false) { const AIR = [150, 172, 200];
    look.planetRim = (c, x, y, r, st) => { if (!F.R || !c || !(r > 2)) return false; st = st || F.st || {}; const H = st.H || (c.canvas && c.canvas.height) || 915;
      const mus = Math.min(1, Math.max(0, place.music || 0)), k = Math.min(1, (mus * .7 + (st.pulse || 0) * .3) * TRP()), col = pal.color(2) || AIR;
      const bd = world && world.planet && typeof world.planet.bend === 'number' ? world.planet.bend : 1, bk = Math.min(1, Math.max(0, (bd - .3) / .25)); if (bk <= .002) return true;   // eases in from bend .3 (render only calls past .3), like softRing's aa
      const w = Math.max(3, Math.min(H * .045, r * .07)), rr = AIR[0] + (col[0] - AIR[0]) * k * .6, gg = AIR[1] + (col[1] - AIR[1]) * k * .6, bb = AIR[2] + (col[2] - AIR[2]) * k * .6, a = (.11 + .1 * k) * bk * bk * (3 - 2 * bk);
      const r0 = Math.max(0, r - w * 1.4), r1 = r + w * 2.2, g = c.createRadialGradient(x, y, r0, x, y, r1), m = (r - r0) / (r1 - r0), cs = `${rr | 0},${gg | 0},${bb | 0}`;
      g.addColorStop(0, `rgba(${cs},0)`); g.addColorStop(m * .8, `rgba(${cs},${(a * .5).toFixed(3)})`); g.addColorStop(m, `rgba(${cs},${a.toFixed(3)})`); g.addColorStop(m + (1 - m) * .45, `rgba(${cs},${(a * .25).toFixed(3)})`); g.addColorStop(1, `rgba(${cs},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r1, 0, 6.2832); c.arc(x, y, r0, 0, 6.2832, true); c.fill(); return true; }; }
  // look.node (nodeGlow): one baked 32 px glow sprite per (hue bucket of 15 deg, colour step); per call = one drawImage
  if (O.nodeGlow !== false) { const NS = new Map(), nrgb = [0, 0, 0];
    const nodeSpr = (hb, cb) => { const key = hb * 8 + cb; let s = NS.get(key); if (s) return s; const D = 32, cv = mkC(D, D), x = cv.getContext('2d'), k = cb / 7;
      hsl2rgb(hb * 15, .18 + .5 * k, .66 + .06 * k, nrgb); const cs = `${nrgb[0]},${nrgb[1]},${nrgb[2]}`, gr = x.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, D / 2);
      gr.addColorStop(0, `rgba(${cs},1)`); gr.addColorStop(.18, `rgba(${cs},.85)`); gr.addColorStop(.45, `rgba(${cs},.28)`); gr.addColorStop(1, `rgba(${cs},0)`); x.fillStyle = gr; x.fillRect(0, 0, D, D); NS.set(key, cv); return cv; };
    look.node = (g, x, y, sz, q, st) => { if (!g || !q) return false; const mus = Math.min(1, Math.max(0, place.music || 0)), gl = Math.min(1, (q.glow || 0) * .6);
      const k = Math.min(1, (mus * .6 + gl) * TRP() + gl * .3), hb = (Math.round(((q.hue || 0) % 360 + 360) % 360 / 15)) % 24, cb = Math.round(k * 7), d = Math.max(4, sz * 2.8) * (1 + .25 * gl);
      g.drawImage(nodeSpr(hb, cb), x - d / 2, y - d / 2, d, d); return true; }; }
  if (REAL) { look.star = (c, x, y, r, st) => { if (!F.R) return false; st = st || F.st; return stars.draw(c, x, y, r, st, ctxReal(st)); };
    look.starMat = (T, st) => gl.starMat(T, st); look.coronaMat = (T, st) => gl.coronaMat(T, st); }
  // look.sky(c, st, L?, A?, sc?) (v0.0.19, offered by Game Dev): the planet-ground sky as real light (sky.js). Call it FIRST in drawLayer
  // for the home globe layer; true = it drew the whole sky (render.js then skips its radial field bg, the real>.05 sky gradient, the
  // daySky gradient and skyEnv's night fill — clouds / rain stay render's). A (anchor) and sc (zoom) place the horizon (skyY, the
  // same line the kaleidoscope clips to); without them: st.A, sc 1. The at-rest kaleidoscope (layer 'field') is then woven into
  // this sky (soft-light veil).
  if (REAL) look.sky = (c, st, L, A, sc) => { if (!F.R || !c) return false; if (sky && world && world.opts) { const v = world.opts.skyInc !== false; sky.opts.inc = v; sky.opts.starsPer = v ? (sky.opts.starsPer || SKY_OPTS.starsPer || 48) : 0; }   /* v0.0.24 dev switch (world.opts.skyInc) */ st = st || F.st; if (!st || !(st.W > 0)) return false; const W = st.W, H = st.H, a = A || st.A || null, s = skyScaleOf(st, L, sc || 1);   // the sky holds still on a pinch (st.skyScale)
    if (a) { F.landY = skyY(a, sc || 1, H); F.landN = F.n; F.landL = L || null; F.floorY = world && world.FRONT && typeof world.floorF === 'function' ? a.y + world.floorF() * H * (sc || 1) : F.landY; }   // the land line this frame (look.pulse dims a wavefront over the land)
    const hy = a ? skyY(a, s, H) : H * .6, E = world && world.env, wp = world && world.place, season = typeof st.season === 'number' ? st.season : wp && typeof wp.season === 'number' ? wp.season : 0;
    const heal = P1 || REAL ? (typeof place.heal === 'number' ? place.heal : 1) : 1; sky.heal = heal;
    const r0 = sky.draw(c, W, H, hy, E, lightOnScreen(st)[0], season, st.t || 0);
    if (air && r0) { const fs = farScaleOf(st, L, sc || 1), wo = E && E.opts && E.opts.weather === false, AX = AU.ax || (AU.ax = {});   // the sky's furniture in front of the gradient, behind the land
      AX.W = W; AX.H = H; AX.hy = hy; AX.hyF = a ? skyY(a, fs, H) : hy; AX.ss = s; AX.fs = fs; AX.E = E; AX.sx = lightOnScreen(st)[0]; AX.day = E && typeof E.day === 'number' ? Math.max(0, Math.min(1, E.day)) : 1; AX.t = st.t || 0;
      AX.heal = heal; AX.music = place.music || 0; AX.trp = F.trp; AX.lc = pal.swatch && pal.swatch[0] || lc; AX.q = F.q; AX.seed = (E && E.seed) || 7; AX.ax = a ? a.x : W / 2;
      AX.cloud = wo ? 0 : Math.max(0, Math.min(1, ((E && E.cloud) || 0) - .15) / .85); AX.rain = wo ? 0 : Math.max(0, Math.min(1, (E && E.rain) || 0)); AX.mute = (sky.opts.mute || 0) + (sky.opts.healMute || 0) * (1 - heal);
      air.draw(c, AX); }
    return r0; };
  // look.diveBack / diveVoice / divePartial / diveWave (look/dive.js, #12): the dive (world dive.js) inside an ohm, shaded and quiet,
  // colour only on the parts that sound (as light, scaled by st.trippy). Each piece behind its own opt (realLook.dive.{back,voice,partial,wave}); realLook.dive = false = all off.
  if (REAL && RL.dive !== false) { const DV = createDiveLook({ makeCanvas: mkC, opts: sub(RL.dive) }); look.api.dive = DV; for (const k of ['diveBack', 'diveVoice', 'divePartial', 'diveWave']) if (DV[k]) look[k] = DV[k]; }
  // look.galaxy(c, cx, cy, R, tilt, seed, st?) (look/galaxy.js, #10): a baked realistic spiral galaxy as one image; true = drawn, false = not baked yet (world draws its own)
  if (REAL && O.galaxy !== false) { const GX = AU.gx = createGalaxy({ makeCanvas: mkC, opts: typeof O.galaxy === 'object' ? O.galaxy : {} }); look.api.galaxy = GX;
    look.galaxy = (c, cx, cy, R, tilt, seed, st) => GX.draw(c, cx, cy, R, tilt, seed, st && st.music != null ? st : { ...(st || {}), music: (place.music || 0) * F.trp }); }
  // look.pulse(g, kind, x, y, r, age, st?) (look/pulse.js): ability rings as light; true = drawn (or hidden by opts), false = the world strokes
  if (REAL && O.pulse !== false) { const PU = AU.pu = createPulse({ opts: typeof O.pulse === 'object' ? O.pulse : {} }); look.api.pulse = PU;
    look.pulse = (g, kind, x, y, r, age, st) => PU.draw(g, kind, x, y, r, age, st, F.landN === F.n ? F.landY : null);
    const o0 = look.ohm; if (o0) look.ohm = (g, o, x, y, r, st) => { const v = o0(g, o, x, y, r, st); if (PU.live.length) PU.ohm(g, o, x, y, r); return v; };
    const f0 = look.frame; look.frame = st => { const v = f0(st); PU.frame(); return v; }; }
  // PERF (v0.0.19, back slices): render.js calls look.ground per chunk per slice (~10-15 calls a frame with realGroundBack): the
  // season-merged st and the real-look context are built ONCE per frame (and per st object), not per call
  const GM = { src: null, n: -1, st: null, ctx: null };
  if (REAL) { look.ground = (c, L, pts, st) => { if (!F.R || !L || !pts) return false; const s0 = st || F.st; if (GM.src !== s0 || GM.n !== F.n) { GM.src = s0; GM.n = F.n; GM.st = wst(s0); const E = world && world.env; GM.ctx = ctxReal(GM.st, { day: E && typeof E.day === 'number' ? E.day : typeof s0.day === 'number' ? s0.day : undefined }); }   // day: the ground is lit by the same sky (skyLight)
    return ground.draw(c, L, pts, GM.st, GM.ctx); };
    look.groundMat = (T, st) => gl.groundMat(T, st); }
  // look.thing(g, t, x, y, r, st): the material look for a placed thing (things.js / sim.placed.list), see README "look.thing".
  // The bake environment (light angle / sky light / heal / trip, bucketed) is built once per frame; bakes go through the OX idle queue.
  const hueOf = c => { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (d < 1e-3) return 0; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return h * 60; };
  // bucket with hysteresis (a value sitting on a bucket edge must not flip the bake key every frame); wrap = cyclic (angle, hue)
  const HY = {}, hyst = (k, v, wrap) => { const p = HY[k]; let d = p == null ? 1 : v - p; if (wrap) d = ((d % wrap) + wrap * 1.5) % wrap - wrap / 2; if (p == null || Math.abs(d) > .8) HY[k] = wrap ? ((Math.round(v) % wrap) + wrap) % wrap : Math.round(v); return HY[k]; };
  const things = REAL && RL.thing !== false ? createThings({ sprites, jobs: OX.jobs, pend: OX.pend, opts: sub(RL.thing) }) : null, TE = { n: -1, lb: '', env: null }, TSKY = {};
  if (things) look.thing = (g, t, x, y, r, st) => { if (!F.R || !g || !t) return false;
    if (TE.n !== F.n || !TE.env) { TE.n = F.n; things.fn = F.n; const s0 = F.st || {}, L = lightOnScreen(s0), E = world && world.env, day = E && typeof E.day === 'number' ? E.day : typeof s0.day === 'number' ? s0.day : 1, c = ctxReal(s0);
      const a = hyst('a', Math.atan2(L[1], L[0]) / 6.2832 * 16, 16), dq = hyst('d', Math.max(0, Math.min(1, day)) * 12), hq = hyst('h', Math.max(0, Math.min(1, c.heal == null ? 1 : c.heal)) * 6), tq = c.trip > .03 && c.tripCols ? hyst('t', Math.min(1, c.trip) * 5) : 0;
      const T1 = tq >= 2 ? c.tripCols[1] : null, tk = T1 ? 1 + hyst('u', hueOf(T1) / 45, 8) : 0, lb = `${a}.${dq}.${hq}.${tq}.${tk}`;   // trip tint = the palette hue in 8 buckets, only from trip .3 up (not pal.ver / the exact colour: the palette re-slides every bar)
      if (lb !== TE.lb) { TE.lb = lb; const k = skyLight(dq / 12, TSKY), an = a / 16 * 6.2832;
        TE.env = { lb, lx: Math.cos(an), ly: Math.sin(an), sun: k.sun.slice(), amb: k.amb.slice(), sun255: k.sun.map(v => Math.min(255, v * 240)), night: k.night, dayLit: k.day, heal: hq / 6, trip: tq / 5, tc: T1 ? hsl2rgb((tk - 1) * 45, .65, .6) : null }; } }
    return things.draw(g, t, x, y, r, st || {}, TE.env); };
  look.api.things = things;
  // tradAura (v0.0.23): tradition auras for rare / master ohms (aura.js). OFF until Wilbow has seen it: opts.realLook.tradAura = true
  // or {AURA_OPTS overrides, grow: true (growth option A)}; at run time look.api.aura.on = true. Needs the real look (exact-size bakes).
  if (REAL) { const TA = RL.tradAura, TO = sub(TA); AU.a = createAuras({ makeCanvas: mkC, opts: { ...TO, on: !!TA } }); look.api.aura = AU.a;
    // rare look (v0.0.24, look/rare.js): master's look.rare hook (rare.js R.draw) - the rare shape in our lit material, extra glow rings tied to the
    // tradition aura, the shimmer. ON with the rare ohms (Wilbow approved all 5 proposals); opts.realLook.rare = false brings the placeholders back.
    if (RL.rare !== false) { AU.rk = createRareLook({ light, sprites, makeCanvas: mkC, music, sim, aura: AU.a, opts: sub(RL.rare) }); AU.a.O.frameRings = false; look.api.rare = AU.rk;
      look.rare = (g, o, x, y, r, layer, info) => { const K = AU.rk; if (!K || !K.take(o, layer)) return false; const m = devOfOhm(g);   // master's hook (rare.js R.draw): true = no placeholder
        if (layer === 0) { const A = AU.a; if (A && A.on && m && !m.b && !m.c) { const gl0 = Math.min(1.5, (o.glow || 0) + Math.min(1, (o.look && o.look.glow) || 0) * .6), a0 = g.globalAlpha;   // v0.0.25: the aura under the body, source-over (before drawOhms)
            A.draw(g, o, x, y, r, m, null, gl0, true, true); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a0; }
          K.ringsFor(g, o, x, y, r, m); K.hide(o, r, m, litOf(m, F.R ? F.R.sprite.step : .5)); } else K.show(g, o, x, y, r, m); return true; };   // 0: rings + the blob hidden from drawOhms; 1: the shaped body + shimmer
    }
    // ohm character (Wilbow 11:41 PM Oct 25 "A b and c"): faces, skin, posture + shaded bodies with no outline (look/ohmlook.js). ON;
    // opts.realLook.ohmChar = false = off, or { face, skin, posture, shadow, legs: false } per piece (OHM_CHAR); look.api.ohmChar.on at run time
    if (RL.ohmChar !== false) { AU.oc = createOhmLook({ sprites, jobs: OX.jobs, pend: OX.pend, light, sim, healOf: o => { const h = sim && sim.healAt && o.body ? sim.healAt(o.body.x, o.body.y) : null; return h != null && isFinite(h) ? (h - .5) * 2 : place.heal; }, opts: sub(RL.ohmChar) }); look.api.ohmChar = AU.oc;
      if (AU.rk) AU.rk.faceOf = (g, o, x, y, rb, m) => AU.oc.on ? AU.oc.face(g, o, x, y, rb, m) : false;
      if (bus && bus.on) bus.on('ohm.tune', ev => { if (ev && ev.src && AU.oc) AU.oc.tune(ev.src); }); }   // a tune taught (playtwice): the warm inner glow (look/ohmlook.js)
    // look.ohmRole (v0.0.26, look/role.js): the part each ohm plays shown on its body (no text); roles.js R.draw calls it after the ohms
    if (RL.role !== false) { AU.ro = createRoleLook({ sprites, jobs: OX.jobs, pend: OX.pend, music, bus, roleOf: o => (ctx.roleOf ? ctx.roleOf(o) : null), opts: sub(RL.role) }); look.api.role = AU.ro;
      const OR = { n: -1, g: null, m: null, mm: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } };
      look.ohmRole = (g, o, part, x, y, r, st) => { const K = AU.ro; if (!K || !K.on || !g || !o) return false; K.note(o, part, st && st.k); const s = K.part(o); if (!s) return true;
        if (OR.n !== F.n || OR.g !== g) { OR.n = F.n; OR.g = g; OR.m = m2d(devOf(g), OR.mm); } return OR.m ? K.accent(g, o, s, x, y, r, OR.m) : true; }; } }
  // look/audio.js (Wilbow 12:23 AM, job of 1:03 AM): one light visual per st.audio system (om, notes, strings, bars, membranes, jam, arc,
  // trad, abilities, muffle), event waves only, scaled by st.trippy. Drawn after whatever look.post already draws. ON;
  // opts.realLook.audio = false = all off, or { notes: false, ... } per system (AUDIO_OPTS); look.api.audio.O at run time
  if (REAL && RL.audio !== false) { const AV = AU.av = createAudioLook({ makeCanvas: mkC, sim, opts: sub(RL.audio) }); look.api.audio = AV; const p0 = look.post;
    look.post = (g, st) => { const v = p0 ? p0(g, st) : undefined; AV.post(g, st, F.landN === F.n ? F.landY : null); return v; }; }
  for (const k of ['frame', 'layer', 'layerP1', 'post', 'bodies', 'planet', 'star', 'ground', 'palette', 'sky', 'thing', 'rare']) { const f = look[k]; if (typeof f === 'function') look[k] = function () { OM.g = null; return f.apply(this, arguments); }; }   // ends an ohm run (devOfOhm)
  look.stats = () => ({ ...sprites.stats, bytes: sprites.bytes, sprites: sprites.map.size, trip: mix.trip, peak: mix.peak, mixed: mix.mixed, glows: F.glows, q: F.q,
    real: REAL ? { planets: planets.stats(), ground: ground.stats(), gl: gl.made, ms: sh.ms, idleMs: sh.idleMs || 0, mode } : null,
    place: P1 || REAL ? { heal: place.heal, dust: place.dust, colour: place.colour, vivid: place.vivid, swell: place.swell, cover: place.cover } : null });
  return look;
}
