// LOOK / palette: colours from the music (key, chord, mode) and the mix value. Real end: grounded, blackbody-like light and
// muted materials. Trippy end: saturated hues spaced by the golden angle (phi), rotating in steps locked to the beat.
// The per-bar part (base hues, temperatures) is cached and rebuilt only when the bar, key, chord or mix (in .02 steps)
// changes; per frame only the beat rotation is applied (a few multiplies). Every mapping is a PARAMETER, not a theme.
export const GOLDEN = 137.50776405;
// blackbody approximation (Tanner Helland), K 1000..40000 -> [r,g,b] 0..255
export function blackbody(K) { const t = K / 100; let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; }
  else { r = 329.698727446 * Math.pow(t - 60, -.1332047592); g = 288.1221695283 * Math.pow(t - 60, -.0755148492); b = 255; }
  const c = v => v < 0 ? 0 : v > 255 ? 255 : Math.round(v); return [c(r), c(g), c(b)]; }
const hue2c = (p, q, t) => { t = t < 0 ? t + 1 : t > 1 ? t - 1 : t; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };   // no per-call closure
export function hsl2rgb(h, s, l, out = [0, 0, 0]) { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  out[0] = Math.round(hue2c(p, q, h + 1 / 3) * 255); out[1] = Math.round(hue2c(p, q, h) * 255); out[2] = Math.round(hue2c(p, q, h - 1 / 3) * 255); return out; }
export const PALETTE_OPTS = { n: 6, hueOffset: 0, kMin: 2600, kMax: 9000, realSat: .28, realLight: .5, tripSat: .9, tripLight: .58, stepDeg: GOLDEN / 4, ease: 6,
  // v0.0.29 jam keys / minor: colours follow the SOUNDING scale (music.mode / modeHow / semi()). A relative minor keeps its major's
  // hues (same pitches, only the centre moved); any minor reads as a shift in LIGHT: cooler kelvin, deeper (less light, a bit less
  // saturation), never a new set of hues. A key or mode change (pivot chords included) cross-fades over fadeBeats in fadeSteps steps
  // (the live swatches / key light glide every frame; P.ver = palKey for the baked ground / planet tints bumps only per step).
  mode: true, fadeBeats: 4, fadeSteps: 6, minorDeep: .16, minorSat: .18, minorKelvin: .4 };
const RE_MAJ = [5, 6, 0, 1, 2, 3, 4];   // a relative minor's degree d is its major's degree (d + 5) % 7
export function createPalette(opts = {}) {
  const O = { ...PALETTE_OPTS, ...opts }, P = { ver: 0, bar: null, key: null, root: null, mixQ: null, base: [], real: [], light: [255, 244, 228], kelvin: 5500, hue0: 0, minor: 0, swatch: [],
    fade: { on: false, b0: 0, hF: 0, mF: 0, hT: 0, mT: 0, h: 0, m: 0, q: -1, home: null, mode: null, n: 0 } };
  for (let i = 0; i < O.n; i++) P.swatch.push([0, 0, 0]);
  const hueOf = (key, root) => (((key * 7) % 12) * 30 + root * (360 / 7) * .25 + O.hueOffset + 360) % 360;   // key on the circle of fifths, chord leans it
  const rebuild = (hue0, root, minor, mix, bump = true) => {   // minor: 0 major .. 1 minor (fractional while a mode change cross-fades)
    P.hue0 = (hue0 + 360) % 360;
    P.kelvin = O.kMin + (O.kMax - O.kMin) * (.35 + O.minorKelvin * minor) * (1 - .3 * mix) + root * 90;   // minor = cooler light (.35 -> .75 of the range, as before)
    const deep = O.mode === false ? 1 : 1 - O.minorDeep * minor, sat = O.realSat * (O.mode === false ? 1 : 1 - O.minorSat * minor);
    P.light = blackbody(P.kelvin); P.real = []; P.base = [];
    for (let i = 0; i < O.n; i++) { const h = P.hue0 + i * GOLDEN; P.base.push(h);
      // real end: the hue pulled toward the light's colour, low saturation (materials under one light); minor = a deeper shade of the same
      const c = hsl2rgb(h, sat, O.realLight * deep * (.7 + .3 * ((i * .618) % 1))); P.real.push([(c[0] * 2 + P.light[0] * deep) / 3, (c[1] * 2 + P.light[1] * deep) / 3, (c[2] * 2 + P.light[2] * deep) / 3]); }
    if (bump) P.ver++; };
  const ss = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  // per frame: cheap unless the bar / key / chord / mix bucket changed
  P.update = (st = {}, mix = { mixed: 0 }, music = null) => { const t = st.t || 0, bar = music ? Math.floor(music.bar(t)) : Math.floor(t / 4),
      key = music ? music.key | 0 : 0, root0 = music && music.chord ? music.chord.root : 0, mq = Math.round((mix.mixed || 0) * 50);
    let mode = null, how = null; try { mode = music && music.mode; how = music && music.modeHow; } catch (e) { mode = null; }
    const minor = mode === 'minor' || mode === 'major' ? (mode === 'minor' ? 1 : 0)
      : music && music.scale && music.scale.ratios ? (Math.abs(music.scale.ratios[2] - 1.2) < .03 ? 1 : 0) : 0;   // no music.mode (older engine): the scale's third
    // a relative minor is the same pitches with the centre on the 6th: colour it as its major (home key + 3, degrees re-expressed)
    const rel = O.mode !== false && minor && how === 'rel', home = rel ? (key + 3) % 12 : key, root = rel ? RE_MAJ[((root0 % 7) + 7) % 7] : root0;
    const F = P.fade, hT = hueOf(O.mode === false ? key : home, O.mode === false ? root0 : root), bt = music ? music.beat(t) : t / .5;
    if (O.mode === false || F.home === null) { F.on = false; F.h = hT; F.m = minor; F.home = home; F.mode = minor; }
    else if (home !== F.home || minor !== F.mode) {   // key or mode moved: fade from what shows now to the new light over a bar
      F.hF = F.h; F.mF = F.m; F.b0 = bt; F.on = true; F.q = -1; F.home = home; F.mode = minor; F.n++; }
    if (F.on) { F.hT = hT; F.mT = minor; const u = (bt - F.b0) / Math.max(.25, O.fadeBeats), q = Math.min(O.fadeSteps, Math.max(0, Math.floor(u * O.fadeSteps + 1e-6)));
      if (q >= O.fadeSteps) { F.on = false; F.h = hT; F.m = minor; }
      else { const e = ss(u), d = ((hT - F.hF + 540) % 360) - 180; F.h = F.hF + d * e; F.m = F.mF + (minor - F.mF) * e; if (q !== F.q) { F.q = q; P.bar = null; } } }
    else { F.h = hT; F.m = minor; }
    const step = bar !== P.bar || root !== P.root || mq !== P.mixQ || (!F.on && (F.h !== P.hue0 || F.m !== P.minor));   // a new palKey
    if (step || F.h !== P.hue0 || F.m !== P.minor) { const bump = step; P.bar = bar; P.key = key; P.root = root; P.mixQ = mq; P.minor = F.m; P.mode = minor ? 'minor' : 'major';
      rebuild(F.h, root, F.m, mq / 50, bump); P.hue0 = F.h; }
    // trippy rotation: whole steps on beats with an eased slide, so it is locked to the beat, never drifting
    const b = music ? music.beat(t) : t, ph = b - Math.floor(b), e = 1 - Math.exp(-ph * O.ease), rot = (Math.floor(b) + e) * O.stepDeg, m = mix.mixed || 0;
    P.rot = rot; const tmp = P._tmp || (P._tmp = [0, 0, 0]);
    for (let i = 0; i < O.n; i++) { hsl2rgb(P.base[i] + rot, O.tripSat, O.tripLight, tmp); const r = P.real[i], s = P.swatch[i];
      s[0] = Math.round(r[0] + (tmp[0] - r[0]) * m); s[1] = Math.round(r[1] + (tmp[1] - r[1]) * m); s[2] = Math.round(r[2] + (tmp[2] - r[2]) * m); }
    return P; };
  // swatch i as [r,g,b] (reused arrays; copy if kept), and the key light colour (blackbody at the real end, hue-tinted at the trippy end)
  P.color = i => P.swatch[((i % O.n) + O.n) % O.n];
  P.keyLight = (mix = 0, out = [0, 0, 0]) => { const s = P.swatch[0], k = mix * .5; out[0] = Math.round(P.light[0] + (s[0] - P.light[0]) * k); out[1] = Math.round(P.light[1] + (s[1] - P.light[1]) * k); out[2] = Math.round(P.light[2] + (s[2] - P.light[2]) * k); return out; };
  // tint any hue (e.g. an ohm's own hue) toward the palette by the mix, without losing its identity (roles stay readable)
  P.tintHue = (hue, mix = 0, out = {}) => { out.hue = hue + (P.rot || 0) * mix * .35; out.sat = O.realSat + (O.tripSat - O.realSat) * mix; out.light = O.realLight + (O.tripLight - O.realLight) * mix; return out; };   // out: optional reused object
  // look-hook palette(L, st): nudges the world layer's own colours; the layer keeps its identity
  P.forLayer = (L, mix = 0) => ({ hue: (L.hue + (P.rot || 0) * mix * .5) % 360, spread: L.spread * (.6 + .8 * mix), sat: 35 + 60 * mix, light: .9 + .2 * mix });   // world units: sat in %, light = multiplier (render.js drawLayer)
  return P;
}
