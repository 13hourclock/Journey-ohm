// LOOK / gl: WebGL (three.js) MATERIAL hooks, PLAN_REAL_PLANET §16.7 (Visuals owns shading inside; Game Dev owns geometry, LOD,
// chunking, workers, the real DirectionalLight from the star with shadows, and the frame budget). Each hook returns a WHOLE
// material, or null so Game Dev's default draws. THREE is passed in: look/* never imports three (nothing vendored).
//   look.planetMat(THREE, p, st)  -> MeshStandardMaterial + onBeforeCompile: the globe's terrain chunks
//   look.groundMat(THREE, st)     -> the same surface shader for the H1 side-view ground mesh (deep LOD, near the camera)
//   look.starMat(THREE, st)       -> ShaderMaterial, additive: the star sphere (limb-darkened blackbody, granulation)
//   proposals (off unless Game Dev calls them): atmoMat (air shell, additive BackSide), cloudMat (cloud shell), waterMat (sea
//   sphere + lake surfaces as REAL water), coronaMat (billboard corona + bloom for the star).
// Contract: uniforms live on material.userData.u (three uniform objects, {value}); material.userData.tick(st) once per frame;
// material.userData.bind(geometry) sets defines from the attributes present (also done automatically on first draw through
// onBeforeRender). Attributes (§16.2/16.7): h, m0=(rock,soil,veg,sand), m1=(wet,ice,hollow,crack), fold, fresh, m2=(temp,moist,slope)
// optional: river (float 0..1, flow strength). Snow line: p.snowLine (per planet, h units at the equator; the shader lowers it
// toward the poles) and st.snowLine (every frame, wins over p.snowLine); both already carry the season, so no extra season shift.
// What drives the specifics (Wilbow's own words, LOOK_PLAN_JOURNEY / ART_DIRECTION / SUMMARY.md):
//   real light, depth and materials + a trippy sound-reactive colour and pattern layer, mixed by context (13A 13D; 36 A: real light
//   always visible underneath); big psychedelic moments only at big musical events, 1-4 bars, landing on the beat (13B, 39 A D);
//   unhealed = real but muted, dusty and cracked; healing = vivid colour over real light (37 A D); NO constant ripples: water moves
//   only on events (t137, T16 stays an off toggle); "Shade rivers as real water and snow as real snow" (Game Dev 10:24);
//   rising / settling / cracks / craters / folds / seasons / weather all show (SUMMARY: the ground changes with the music);
//   planet styles blend with no borders (style weights are continuous, never a type switch).
// READ-ONLY on the world. Every number is a PARAMETER (GL_OPTS).
import { paletteOf, styleOf, atmoColOf } from './planet.js';
import { blackbody } from './palette.js';
export const GL_OPTS = { glowEventsOnly: true, glowFloor: .15, strataF: 7, detailF: 38, detailK: .55, aoK: .65, snowSlope: .55, snowK: 1, riverK: 1, wetDark: .45, dustK: .7, crackGlow: [1.0, .55, .22],
  tripK: .55, tripBands: 7, takeover: .85, oceanInShader: 1, glowK: 1.4, foldK: .35, freshK: .5, seasonK: 1, weatherK: 1, snowLine: 2.0, atmoK: 1, cloudDrift: .004 };
const s2l = v => Math.pow(v / 255, 2.2);
const toLin = c => (Math.max(c[0], c[1], c[2]) <= 1.001 ? c.slice(0, 3) : c.slice(0, 3).map(s2l));
// ---------------------------------------------------------------------------------------------------------------------------
// GLSL shared pieces
export const GLSL_NOISE = /* glsl */`
float lk_h31(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float lk_n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(lk_h31(i), lk_h31(i + vec3(1,0,0)), f.x), mix(lk_h31(i + vec3(0,1,0)), lk_h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(lk_h31(i + vec3(0,0,1)), lk_h31(i + vec3(1,0,1)), f.x), mix(lk_h31(i + vec3(0,1,1)), lk_h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float lk_fbm(vec3 p, int o){ float a = .5, s = 0.; for (int k = 0; k < 6; k++) { if (k >= o) break; s += a * lk_n3(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
vec3 lk_bump(vec3 pos, vec3 n, float hgt){ vec3 sx = dFdx(pos), sy = dFdy(pos), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1);
  vec3 g = sign(det) * (dFdx(hgt) * r1 + dFdy(hgt) * r2); return normalize(abs(det) * n - g); }`;
const SURF_UNIFORMS = /* glsl */`
uniform vec3 uLightDir; uniform vec3 uStarColor; uniform float uTime, uBeat, uPhase, uPulse, uQ, uHarmony, uSeed, uSea, uSpin;
uniform vec4 uStyle; uniform vec3 uPalette[5]; uniform vec3 uSeaColor; uniform vec3 uTripCols[6];
uniform float uSnowData, uHeal, uDust, uVivid, uTrip, uPeak, uSwell, uTakeover, uGlow, uSnowLine, uSnowSlope, uSnowK, uRiverK, uOceanK, uNoiseF, uDetailF, uDetailK, uAO, uStrataF;
uniform float uFoldK, uFreshK, uSeason, uWeather, uWetDark, uDustK, uTripK, uTripBands;
uniform vec3 uDustCol, uAtmoCol, uGlowCol; uniform vec4 uRip[4];`;
const SURF_VARY = /* glsl */`
varying float vH; varying vec4 vM0; varying vec4 vM1; varying vec3 vM2; varying float vFold; varying float vFresh; varying float vRiver; varying vec3 vObj; varying vec3 vObjN; varying vec3 vWPos;`;
const SURF_VERT_DECL = /* glsl */`
#ifdef LK_H
attribute float h;
#endif
#ifdef LK_M0
attribute vec4 m0;
#endif
#ifdef LK_M1
attribute vec4 m1;
#endif
#ifdef LK_M2
attribute vec3 m2;
#endif
#ifdef LK_FOLD
attribute float fold;
#endif
#ifdef LK_FRESH
attribute float fresh;
#endif
#ifdef LK_RIVER
attribute float river;
#endif`;
const SURF_VERT_BODY = /* glsl */`
vObj = position; vObjN = normal; vWPos = (modelMatrix * vec4(position, 1.)).xyz;
#ifdef LK_H
vH = h;
#else
vH = 0.;
#endif
#ifdef LK_M0
vM0 = m0;
#else
vM0 = vec4(-1.);
#endif
#ifdef LK_M1
vM1 = m1;
#else
vM1 = vec4(0.);
#endif
#ifdef LK_M2
vM2 = m2;
#else
vM2 = vec3(-1.);
#endif
#ifdef LK_FOLD
vFold = fold;
#else
vFold = 0.;
#endif
#ifdef LK_FRESH
vFresh = fresh;
#else
vFresh = 0.;
#endif
#ifdef LK_RIVER
vRiver = river;
#else
vRiver = 0.;
#endif`;
// the surface: material blend, strata, snow by slope, wet, sea + rivers as water, heal, seasons, weather, trippy layer
const SURF_FRAG_COMMON = SURF_UNIFORMS + SURF_VARY + GLSL_NOISE + /* glsl */`
float lk_water, lk_snow, lk_wet, lk_ice, lk_rough, lk_hgt, lk_crack, lk_band, lk_bandLine; vec3 lk_bandCol;
vec3 lk_tripCol(float b){ float i = mod(floor(b), 6.), f = fract(b); vec3 c0 = uTripCols[0], c1 = uTripCols[1];
  for (int k = 0; k < 6; k++) { if (float(k) == i) { c0 = uTripCols[k]; c1 = uTripCols[k == 5 ? 0 : k + 1]; } } return mix(c0, c1, smoothstep(.75, 1., f)); }`;
const SURF_COLOR = /* glsl */`
{ vec3 P = vObj * uNoiseF; vec3 Nr = normalize(vObjN);
  #ifdef LK_PLANET
  float slope = vM2.z >= 0. ? vM2.z : clamp(1. - abs(dot(Nr, normalize(vObj + vec3(1e-5)))), 0., 1.);
  #else
  float slope = vM2.z >= 0. ? vM2.z : clamp(1. - abs(Nr.y), 0., 1.);
  #endif
  float temp = vM2.x >= 0. ? vM2.x : clamp(.6 - vH * .45, 0., 1.);
  vec4 w0 = vM0.x >= 0. ? vM0 : vec4(.25 + .9 * slope, .3, (1. - slope) * smoothstep(.7, .1, vH), smoothstep(-.3, -.6, vH) * .8);
  w0 = max(w0, 0.) + 1e-4; w0 /= dot(w0, vec4(1.));
  // seasons (from the music clock, data-driven): winter cooler and paler, summer warmer and greener; drawn only if the data has them
  float win = clamp(-uSeason, 0., 1.) * uSeasonK_, sum = clamp(uSeason, 0., 1.) * uSeasonK_;
  vec3 veg = uPalette[2] * mix(vec3(1.), vec3(.95, .9, .75), win * .6) * mix(vec3(1.), vec3(.95, 1.08, .9), sum * .4);
  vec3 alb = uPalette[0] * w0.x + uPalette[1] * w0.y + veg * w0.z + uPalette[3] * w0.w;
  // rock strata that follow the relief (warped bands, banded by height), fresh rock lighter + rawer, folds darker in the crease
  float sv = vH * uStrataF + (lk_fbm(P * 2.1, 3) - .5) * 1.4; float band = .5 + .5 * sin(sv * 6.2832);
  alb *= mix(1., mix(.74, 1.14, band), w0.x * .85);
  alb = mix(alb, uPalette[0] * 1.25 + .02, clamp(vFresh, 0., 1.) * uFreshK * .6);
  alb *= 1. - uFoldK * clamp(vFold, 0., 1.) * .5;
  // detail (one height used for both albedo grain and the bump below)
  // screen-space LOD: the grain fades out where it would alias (a small far planet), so it never sparkles or crawls
  float lodF = length(fwidth(P * uDetailF)); lk_hgt = mix(.5, lk_fbm(P * uDetailF, uQ < 1.5 ? 4 : 3), 1. - smoothstep(.04, .25, lodF));   // the top octave is ~8x the base, so fade early
  alb *= .88 + .24 * lk_hgt;
  // wet (data + weather: rain wets everything a little, dry wind dries it)
  float rain = smoothstep(.6, .95, uWeather) * uWeatherK_, dry = smoothstep(.25, .05, uWeather) * uWeatherK_;
  lk_wet = clamp(vM1.x + rain * .55 - dry * .2, 0., 1.); alb *= 1. - uWetDark * lk_wet;
  // snow as REAL snow: from ice data, the snow line (lower in winter, by temperature) and cold; held less on steep faces (by slope)
  lk_ice = vM1.y;
  float line = uSnowData > .5 ? uSnowLine : uSnowLine - win * .9 + sum * .3, cold = smoothstep(.16, .02, temp - win * .3);   // winter brings the snow well down; summer lifts it
  #ifdef LK_PLANET
  { float la = abs(normalize(vObj).y); line -= (uSnowLine + .5) * la * la * 1.1; }   // the snow line comes down toward the poles (latitude)
  #endif
  lk_snow = clamp(max(lk_ice, max(smoothstep(line - .05, line + .08, vH + (lk_hgt - .5) * .12), cold)), 0., 1.) * uSnowK;
  lk_snow *= 1. - smoothstep(uSnowSlope * .6, uSnowSlope * 1.4, slope) * .85;
  vec3 snowC = vec3(.80, .84, .90) * (.93 + .07 * lk_hgt) + vec3(.0, .01, .04) * (1. - lk_hgt);   // a hint of blue in the shade
  alb = mix(alb, snowC, lk_snow);
  // cracks: from the data (crack) + the unhealed state; dark in the albedo, glowing only on events (emissive below)
  float cn = abs(lk_n3(P * 22.) - .5) * 2.;
  lk_crack = clamp(max(vM1.w, uDust * .6) * (1. - smoothstep(.0, .12, cn)), 0., 1.) * (1. - lk_snow * .7);
  alb *= 1. - .75 * lk_crack;
  // water: the sea (below p.sea) and rivers, as real water: dark, depth tinted; spec / fresnel come from the physical light
  float depth = uSea - vH; float aw = fwidth(vH) * .75 + .001, sea = uOceanK * smoothstep(-aw, aw, depth);   // coast anti-aliased by its screen-space width
  float riv = clamp(vRiver * uRiverK, 0., 1.);
  lk_water = max(sea, riv) * (1. - step(.5, lk_ice) * .9);
  vec3 wc = mix(uSeaColor * 1.8 + vec3(.01, .03, .03), uSeaColor * .45, smoothstep(0., .25, depth));
  alb = mix(alb, mix(wc, uSeaColor * 1.3, riv * (1. - sea)), lk_water);
  // gas: banded clouds by latitude with warped storms, blended in by the gas weight (no border between styles)
  #ifdef LK_PLANET
  { float gw = clamp(uStyle.w, 0., 1.); if (gw > .01) { vec3 dn = normalize(vObj); float lat = dn.y + (lk_fbm(dn * 3. + uSeed, 4) - .5) * .25;
    float b = .5 + .5 * sin(lat * 17. + lk_fbm(dn * vec3(1., 6., 1.) * 2. + uSeed + uTime * .002, 3) * 4.);
    vec3 gc = mix(uPalette[4] * .9 + .08, uPalette[3] * 1.1, b); gc *= .85 + .3 * lk_fbm(dn * 9. + uSeed, 3);
    alb = mix(alb, gc, smoothstep(.15, .85, gw)); lk_water *= 1. - smoothstep(.3, .8, gw); } }
  #endif
  // heal: unhealed is real but muted and dusty; healed brings vivid colour over the same light
  float lum = dot(alb, vec3(.2126, .7152, .0722));
  alb = mix(alb, mix(vec3(lum), uDustCol * lum * 2.2, .45), clamp(uDust * uDustK, 0., 1.) * (1. - lk_water * .5));
  alb = max(mix(vec3(lum), alb, 1. + .35 * uVivid), 0.);
  // trippy: contour bands in the music palette, LIT (the real light stays underneath, 36 A); big events take over for a moment
  lk_band = (vH + 1.) * uTripBands * .5 + lk_hgt * .4 + uPhase * 0.; float fb = fract(lk_band);
  lk_bandCol = lk_tripCol(lk_band); lk_bandLine = exp(-pow((fb - .5) / .05, 2.));
  alb = mix(alb, lk_bandCol * .55, clamp(uTrip * uTripK * (1. - lk_water * .4) + uSwell * uTakeover * .35, 0., 1.));
  diffuseColor.rgb = alb;
  lk_rough = mix(.93, .55, lk_wet); lk_rough = mix(lk_rough, .62, lk_snow); lk_rough = mix(lk_rough, .2, step(.5, lk_ice) * (1. - lk_snow * .5)); lk_rough = mix(lk_rough, .05, lk_water); }`;
const SURF_ROUGH = /* glsl */`roughnessFactor = lk_rough;`;
const SURF_NORMAL = /* glsl */`
{ float k = uDetailK * (1. - lk_water) * (1. - lk_snow * .6);
  #ifdef LK_PLANET
  k *= 1. - smoothstep(.15, .6, uStyle.w);   // gas giants are cloud tops: smooth, no rock grain
  #endif
  float hg = lk_hgt * k * .02 / max(uNoiseF, 1e-4) * 0.0 + lk_hgt * k;
  // event-only ripples on water (T16 'water reacts to music' stays OFF: these come only from real events, uRip, never a constant wave)
  float rp = 0.; for (int i = 0; i < 4; i++) { if (uRip[i].w > .001) { float d = distance(vWPos, uRip[i].xyz); rp += uRip[i].w * sin(d * 9. - uTime * 6.) * exp(-d * 1.2); } }
  hg += rp * lk_water * .25;
  if (k > .001 || abs(rp) > .0001) normal = lk_bump(-vViewPosition, normal, hg * .06); }`;
const SURF_EMISSIVE = /* glsl */`
totalEmissiveRadiance += uGlowCol * lk_crack * uGlow;   // cracks glow only on big events (uGlow is 0 between them)
totalEmissiveRadiance += lk_bandCol * lk_bandLine * (uTrip * .12 + uPeak * .5 + uSwell * uTakeover) * (1. - lk_water * .5);`;
const SURF_AO = /* glsl */`
{ float ao = 1. - uAO * clamp(vM1.z * .8 + clamp(vFold, 0., 1.) * .3, 0., 1.);   // valleys / hollows / creases darken (ambient + a little direct)
  reflectedLight.indirectDiffuse *= ao; reflectedLight.directDiffuse *= mix(1., ao, .35);
  // sea + rivers: sky fresnel on top of the physical GGX glint from the star light; snow gets a soft bright sheen
  vec3 V = normalize(vViewPosition); float fr = pow(1. - clamp(dot(normal, V), 0., 1.), 5.);
  reflectedLight.indirectSpecular += uAtmoCol * fr * lk_water * .35;
  reflectedLight.indirectDiffuse += uAtmoCol * lk_snow * .05; }`;
// ---------------------------------------------------------------------------------------------------------------------------
export function createGL({ mix, place, pal, opts = {}, readHeal } = {}) { const O = { ...GL_OPTS, ...opts }, G = { O, made: 0 };
  const tripCols = () => { const out = []; for (let i = 0; i < 6; i++) out.push(toLin(pal ? pal.color(i) : [200, 120, 220])); return out; };
  // shared per-frame state (the same numbers every material and the 2D hooks read)
  const ctxOf = (st = {}, p = null) => { const pl = place || {}, heal = p && typeof p.heal === 'number' ? p.heal : st.heal != null ? st.heal : readHeal ? readHeal() : pl.heal != null ? pl.heal : 1;
    const dust = p && typeof p.heal === 'number' ? Math.max(0, 1 - p.heal / .5) : pl.dust != null ? pl.dust : Math.max(0, 1 - heal / .5), vivid = pl.vivid != null ? pl.vivid : Math.max(0, (heal - .55) / .45);
    const trip = st.trip != null ? st.trip : mix ? mix.mixed : 0, peak = st.peak != null ? st.peak : mix ? mix.peak : st.burst || 0, swell = Math.max(pl.swell || 0, st.burst || 0);
    const seasonOn = st.season != null || (pl.season != null), season = st.season != null ? st.season : pl.season || 0, weather = st.weather != null ? st.weather : pl.weather != null ? pl.weather : .5;
    // the crack / emissive GLOW envelope. glowEventsOnly (Wilbow: waves only for events, no constant ripples): only a BIG MOMENT lights it:
    // the place swell (opened by one) or the world's st.big itself (songs.js climax / drop / big cadence, fades ~2 bars) past glowFloor.
    // st.burst is NOT read: the world bangs it on every key / om change and song start / end (every few seconds with nothing played,
    // .2-1), which kept the veins glowing at rest. Off: the old max(swell, peak > .3).
    const big = st.big || 0, fl = O.glowFloor, glow = O.glowEventsOnly !== false ? Math.max(pl.swell || 0, big > fl ? Math.min(1, (big - fl) / (1 - fl)) : 0)
      : Math.max(swell, peak > .3 ? (peak - .3) / .7 : 0);
    return { heal, dust, vivid, trip, peak, swell, season, weather, seasonOn, glow }; };
  G.ctxOf = ctxOf;
  const U = (T, p, st) => { const P = p ? paletteOf(p) : null, S = p ? styleOf(p) : { rock: .4, ocean: .3, ice: .1, gas: .2 }, pals = p && Array.isArray(p.palette) && p.palette.length >= 5 ? p.palette.slice(0, 5).map(toLin) : P ? [P.rock, P.soil, P.veg, P.sand, P.acc].map(toLin) : [[.18, .16, .14], [.12, .08, .05], [.05, .1, .03], [.5, .42, .28], [.4, .3, .5]];
    const sea = p ? (typeof p.sea === 'number' ? p.sea : -.55 + .85 * S.ocean - .25 * S.gas) : (st && typeof st.sea === 'number' ? st.sea : -10);
    const v = x => ({ value: x }), V3 = a => new T.Vector3(a[0], a[1], a[2]);
    return { uLightDir: v(V3([.5, .6, .62])), uStarPos: v(V3([0, 0, 0])), uStarColor: v(V3([1, .96, .9])), uStarR: v(1), uTime: v(0), uBeat: v(0), uPhase: v(0), uPulse: v(0), uQ: v(0), uHarmony: v(0),
      uSeed: v(p ? (p.seed >>> 0) % 4096 : 1), uStyle: v(new T.Vector4(S.rock, S.ocean, S.ice, S.gas)), uPalette: v(pals.map(V3)), uSea: v(sea), uSpin: v(p && p.spin || 0),
      uSeaColor: v(V3(p && p.seaColor ? toLin(p.seaColor) : toLin(P ? P.sea : [18, 52, 86]))), uTripCols: v(tripCols().map(V3)),
      uHeal: v(1), uDust: v(0), uVivid: v(0), uTrip: v(0), uPeak: v(0), uSwell: v(0), uTakeover: v(O.takeover), uGlow: v(0), uSnowLine: v(p && typeof p.snowLine === 'number' ? p.snowLine : O.snowLine), uSnowData: v(p && typeof p.snowLine === 'number' ? 1 : 0),
      uSnowSlope: v(O.snowSlope), uSnowK: v(O.snowK), uRiverK: v(O.riverK), uOceanK: v(p ? O.oceanInShader : 0), uNoiseF: v(p && p.r ? 1 / p.r : (O.groundNoiseF || .05)), uDetailF: v(O.detailF), uDetailK: v(O.detailK),
      uAO: v(O.aoK), uStrataF: v(O.strataF), uFoldK: v(O.foldK), uFreshK: v(O.freshK), uSeason: v(0), uWeather: v(.5), uSeasonK_: v(0), uWeatherK_: v(0), uWetDark: v(O.wetDark), uDustK: v(O.dustK), uTripK: v(O.tripK), uTripBands: v(O.tripBands),
      uDustCol: v(V3([.36, .3, .24])), uAtmoCol: v(V3(toLin(atmoColOf(S, P || { gasA: [230, 200, 160] })))), uGlowCol: v(V3(O.crackGlow)), uRip: v([0, 1, 2, 3].map(() => new T.Vector4(0, 0, 0, 0))) }; };
  // per-frame uniform update shared by all materials
  const tickU = (u, st = {}, p = null) => { const c = ctxOf(st, p), set = (k, x) => { if (u[k]) u[k].value = x; };
    if (Array.isArray(st.lightDir) && u.uLightDir) u.uLightDir.value.set(st.lightDir[0], st.lightDir[1], st.lightDir[2]);
    if (Array.isArray(st.starPos) && u.uStarPos) u.uStarPos.value.set(st.starPos[0], st.starPos[1], st.starPos[2]);
    if (Array.isArray(st.starColor) && u.uStarColor) u.uStarColor.value.set(st.starColor[0], st.starColor[1], st.starColor[2]);
    set('uTime', st.t || 0); set('uBeat', st.beat || 0); set('uPhase', st.phase || 0); set('uPulse', st.pulse || 0); set('uQ', st.q || 0); set('uHarmony', st.harmony != null ? st.harmony : c.heal);
    if (st.starR != null) set('uStarR', st.starR); if (p && typeof p.spin === 'number') set('uSpin', p.spin);
    if (typeof st.snowLine === 'number') { set('uSnowLine', st.snowLine); set('uSnowData', 1); }
    set('uHeal', c.heal); set('uDust', c.dust); set('uVivid', c.vivid); set('uTrip', c.trip); set('uPeak', c.peak); set('uSwell', c.swell);
    set('uGlow', O.glowK * c.glow);   // cracks glow only on big events (glowEventsOnly: see ctxOf)
    set('uSeason', c.season); set('uWeather', c.weather); set('uSeasonK_', c.seasonOn ? O.seasonK : 0); set('uWeatherK_', c.seasonOn || st.weather != null ? O.weatherK : 0);
    if (u.uTripCols && pal) { const tc = u.uTripCols.value; for (let i = 0; i < 6; i++) { const l = toLin(pal.color(i)); tc[i].set(l[0], l[1], l[2]); } }
    if (u.uRip) { const R = st.ripples || []; for (let i = 0; i < 4; i++) { const r = R[i], v = u.uRip.value[i]; if (r) { const age = (st.t || 0) - (r.t0 || 0), a = (r.amp || 1) * Math.exp(-age * 1.5); v.set(r.x || 0, r.y || 0, r.z || 0, a > .002 ? a : 0); } else v.w = 0; } }
    return c; };
  G.tickU = tickU;
  // the shared surface material (planet chunks and ground mesh)
  const surface = (T, p, st, kind) => { const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: 0 }), u = U(T, p, st);
    m.name = `look.${kind}`; m.defines = m.defines || {}; if (kind === 'planet') m.defines.LK_PLANET = ''; m.userData.u = u; m.userData.kind = kind; m.userData.p = p;
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + SURF_VARY + SURF_VERT_DECL).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SURF_VERT_BODY);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSeasonK_, uWeatherK_;\n' + SURF_FRAG_COMMON)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + SURF_COLOR).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + SURF_ROUGH)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + SURF_NORMAL).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + SURF_EMISSIVE)
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + SURF_AO); };
    let bound = false; const keyOf = () => Object.keys(m.defines).filter(k => k.startsWith('LK_')).sort().join(',');
    m.customProgramCacheKey = () => `look.surface:${keyOf()}`;
    m.userData.bind = g => { const A = g && g.attributes ? g.attributes : {}; for (const [d, a] of [['LK_H', 'h'], ['LK_M0', 'm0'], ['LK_M1', 'm1'], ['LK_M2', 'm2'], ['LK_FOLD', 'fold'], ['LK_FRESH', 'fresh'], ['LK_RIVER', 'river']]) { if (A[a]) m.defines[d] = ''; else delete m.defines[d]; }
      bound = true; m.needsUpdate = true; return m; };
    m.onBeforeRender = (r, s, c, g) => { if (!bound) m.userData.bind(g); };
    m.userData.tick = st2 => tickU(u, st2 || {}, p); G.made++; return m; };
  G.planetMat = (T, p, st) => (T && T.MeshStandardMaterial && p ? surface(T, p, st, 'planet') : null);
  G.groundMat = (T, st) => (T && T.MeshStandardMaterial ? surface(T, st && st.planet || null, st, 'ground') : null);
  // ---- star: a sphere you could squint at. HDR emission (>1) so Game Dev's bloom (if any) catches it ----------------------------
  G.starMat = (T, st = {}) => { if (!T || !T.ShaderMaterial) return null; const K = st.starK || (st.star && st.star.K) || 5800, bb = blackbody(K).map(s2l), v = x => ({ value: x });
    const u = { uStarColor: v(new T.Vector3(...(Array.isArray(st.starColor) ? st.starColor : bb))), uTime: v(0), uSwell: v(0), uTrip: v(0), uTint: v(new T.Vector3(1, 1, 1)), uSeed: v(((st.star && st.star.seed) >>> 0 || 1) % 997), uLimb: v(.6), uGran: v(.12), uBright: v(2.2) };
    const m = new T.ShaderMaterial({ uniforms: u, blending: T.AdditiveBlending, transparent: true, depthWrite: true,
      vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: GLSL_NOISE + /* glsl */`
uniform vec3 uStarColor, uTint; uniform float uTime, uSwell, uTrip, uSeed, uLimb, uGran, uBright; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){ float mu = clamp(dot(normalize(vN), normalize(vV)), 0., 1.); vec3 p = normalize(vP) * 9. + uSeed;
  // granulation drifts slowly (living, never a beat throb); limb darker and redder (real limb darkening + reddening)
  float g = 1. + uGran * ((lk_fbm(p + vec3(0., 0., uTime * .03), 4) - .5) * 2.2 + (lk_n3(p * 3.1 - uTime * .05) - .5));
  float ld = 1. - uLimb * (1. - pow(mu, .7)); vec3 col = uStarColor * ld * g * vec3(1., 1. - .18 * (1. - mu), 1. - .35 * (1. - mu));
  col = mix(col, uTint * ld, uTrip * .35);
  gl_FragColor = vec4(col * uBright * (1. + .9 * uSwell), 1.); }` });
    m.name = 'look.star'; m.userData.u = u;
    m.userData.tick = (s = {}) => { const c = ctxOf(s); u.uTime.value = s.t || 0; u.uSwell.value = c.swell; u.uTrip.value = c.trip; if (Array.isArray(s.starColor)) u.uStarColor.value.set(...s.starColor); if (pal) u.uTint.value.set(...toLin(pal.color(1))); };
    G.made++; return m; };
  // ---- proposals: atmosphere shell, clouds, water, corona -----------------------------------------------------------------
  G.atmoMat = (T, p, st = {}) => { if (!T || !T.ShaderMaterial || !p) return null; const S = styleOf(p), P = paletteOf(p), v = x => ({ value: x });
    const u = { uLightDir: v(new T.Vector3(.5, .6, .62)), uAtmoCol: v(new T.Vector3(...toLin(atmoColOf(S, P)))), uAtmo: v(typeof p.atmo === 'number' ? p.atmo : .9 * (1 - .5 * S.gas) + .15), uBurst: v(0), uSwell: v(0), uTrip: v(0), uFlare: v(new T.Vector3(1, .6, .3)), uK: v(O.atmoK) };
    const m = new T.ShaderMaterial({ uniforms: u, side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`varying vec3 vWN; varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`uniform vec3 uLightDir, uAtmoCol, uFlare; uniform float uAtmo, uBurst, uSwell, uTrip, uK; varying vec3 vWN; varying vec3 vWP;
void main(){ vec3 V = normalize(cameraPosition - vWP), N = normalize(vWN); float rim = pow(clamp(1. - abs(dot(N, V)), 0., 1.), 3.);
  float d = dot(-N, normalize(uLightDir)); float sun = smoothstep(-.35, .6, d), term = exp(-pow((d + .05) / .25, 2.));
  vec3 col = uAtmoCol * sun + vec3(1., .45, .22) * term * .9;   // forward scatter on the day limb + the warm dusk band
  col = mix(col, uFlare * 1.6, clamp(uSwell * .8, 0., 1.));     // big events: the limb flares in the jam's colours
  gl_FragColor = vec4(col * rim * uAtmo * uK * (1. + .8 * uBurst + .6 * uSwell), 1.); }` });
    m.name = 'look.atmo'; m.userData.u = u; m.userData.tick = (s = {}) => { const c = ctxOf(s, p); if (Array.isArray(s.lightDir)) u.uLightDir.value.set(...s.lightDir); u.uBurst.value = s.burst || 0; u.uSwell.value = c.swell; u.uTrip.value = c.trip; if (pal) u.uFlare.value.set(...toLin(pal.color(2))); };
    G.made++; return m; };
  G.cloudMat = (T, p, st = {}) => { if (!T || !T.MeshStandardMaterial || !p) return null; const S = styleOf(p), cov = typeof p.cloud === 'number' ? p.cloud : Math.min(1, .12 + .7 * S.ocean), v = x => ({ value: x });
    const u = { uTime: v(0), uCover: v(cov), uSeed: v((p.seed >>> 0) % 997), uDrift: v(O.cloudDrift), uWeather: v(.5), uWK: v(0) };
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, depthWrite: false });
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCP = normalize(position);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCP; uniform float uTime, uCover, uSeed, uDrift, uWeather, uWK;\n' + GLSL_NOISE)
        .replace('#include <color_fragment>', `#include <color_fragment>
  { float a = uTime * uDrift; vec3 q = vec3(vCP.x * cos(a) - vCP.z * sin(a), vCP.y, vCP.x * sin(a) + vCP.z * cos(a)) * 3. + uSeed;
    q += (vec3(lk_fbm(q, 3), lk_fbm(q + 5.2, 3), lk_fbm(q + 9.7, 3)) - .5) * 1.4; float c = lk_fbm(q * vec3(1., 2., 1.), 5);
    float cov = clamp(uCover + uWK * (smoothstep(.6, .95, uWeather) * .35 - smoothstep(.25, .05, uWeather) * .25), 0., 1.);
    diffuseColor.a *= smoothstep(1. - cov * .75, 1.05 - cov * .5, c + .5 * 0.); diffuseColor.rgb = vec3(.92) - .25 * smoothstep(.6, 1., uWeather) * uWK; }`); };
    m.customProgramCacheKey = () => 'look.cloud'; m.name = 'look.cloud'; m.userData.u = u;
    m.userData.tick = (s = {}) => { const c = ctxOf(s, p); u.uTime.value = s.t || 0; u.uWeather.value = c.weather; u.uWK.value = c.seasonOn || s.weather != null ? 1 : 0; }; G.made++; return m; };
  G.waterMat = (T, p, st = {}) => { if (!T || !T.MeshPhysicalMaterial) return null; const P = p ? paletteOf(p) : null, sc = toLin(p && p.seaColor ? p.seaColor : P ? P.sea : [18, 52, 86]), v = x => ({ value: x });
    const u = { uTime: v(0), uRip: v([0, 1, 2, 3].map(() => new T.Vector4(0, 0, 0, 0))), uSky: v(new T.Vector3(.25, .4, .7)), uDust: v(0) };
    const m = new T.MeshPhysicalMaterial({ color: new T.Color(sc[0], sc[1], sc[2]), roughness: .06, metalness: 0, clearcoat: .6, clearcoatRoughness: .05, transparent: true, opacity: .92 });
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWW = (modelMatrix * vec4(position, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW; uniform float uTime, uDust; uniform vec4 uRip[4]; uniform vec3 uSky;\n' + GLSL_NOISE)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { float rp = 0.; for (int i = 0; i < 4; i++) { if (uRip[i].w > .001) { float d = distance(vWW, uRip[i].xyz); rp += uRip[i].w * sin(d * 9. - uTime * 6.) * exp(-d * 1.2); } }
    if (abs(rp) > .0001) normal = lk_bump(-vViewPosition, normal, rp * .02); }`)   // still water; rings only from real events
        .replace('#include <aomap_fragment>', `#include <aomap_fragment>
  { vec3 V = normalize(vViewPosition); float fr = pow(1. - clamp(dot(normal, V), 0., 1.), 5.); reflectedLight.indirectSpecular += uSky * fr * .6;
    reflectedLight.directDiffuse *= 1. - .3 * uDust; }`); };
    m.customProgramCacheKey = () => 'look.water'; m.name = 'look.water'; m.userData.u = u;
    m.userData.tick = (s = {}) => { const c = ctxOf(s, p); u.uTime.value = s.t || 0; u.uDust.value = c.dust; const R = s.ripples || []; for (let i = 0; i < 4; i++) { const r = R[i], vv = u.uRip.value[i]; if (r) { const a = (r.amp || 1) * Math.exp(-((s.t || 0) - (r.t0 || 0)) * 1.5); vv.set(r.x || 0, r.y || 0, r.z || 0, a > .002 ? a : 0); } else vv.w = 0; } };
    G.made++; return m; };
  G.coronaMat = (T, st = {}) => { if (!T || !T.ShaderMaterial) return null; const K = st.starK || 5800, bb = blackbody(K).map(s2l), v = x => ({ value: x });
    const u = { uCol: v(new T.Vector3(...bb)), uTime: v(0), uSwell: v(0), uSeed: v(((st.star && st.star.seed) >>> 0 || 1) % 997) };
    const m = new T.ShaderMaterial({ uniforms: u, blending: T.AdditiveBlending, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,   // a quad facing the camera, 8 star radii wide
      fragmentShader: GLSL_NOISE + /* glsl */`uniform vec3 uCol; uniform float uTime, uSwell, uSeed; varying vec2 vUv;
void main(){ float r = length(vUv) * 4., a = atan(vUv.y, vUv.x); if (r < .98) discard;
  float st = .55 + .9 * max(0., lk_fbm(vec3(cos(a) * 3., sin(a) * 3., r * .35 + uSeed), 4) - .3) + .5 * pow(abs(cos(a * 2.)), 6.);
  float sh = 1. + .05 * sin(uTime * .37 + uSeed) * sin(uTime * .23 + 1.3);   // faint slow shimmer; no beat
  float g = (1. + .22 * uSwell); float c = exp(-(r / g - 1.) / .42) * st * .55 * sh + .25 * exp(-r / (1.6 * g)) + .1 * exp(-r / (3.2 * g));
  c *= 1. - smoothstep(.6, 1., length(vUv));   // fades to exactly 0 inside the quad: no visible edge (blends have no borders)
  gl_FragColor = vec4(uCol * c * (1. + .9 * uSwell), 1.); }` });
    m.name = 'look.corona'; m.userData.u = u; m.userData.tick = (s = {}) => { const c = ctxOf(s); u.uTime.value = s.t || 0; u.uSwell.value = c.swell; }; G.made++; return m; };
  return G; }
