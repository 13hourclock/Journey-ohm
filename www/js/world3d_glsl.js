// WORLD 3D shaders (world track, real planet step 1). Uniform names follow the Visuals seam (PLAN_REAL_PLANET 16): uLightDir,
// uStarPos, uStarColor, uTime, uBeat, uPhase, uPulse, uQ, uHarmony, uSeed, uStyle, uPalette[5], uSea, uSpin. Colours are linear RGB.
export const NOISE = `
float hash3(vec3 p){ p = fract(p * 0.3183099 + vec3(.1, .2, .3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
export const TERRAIN_V = `
attribute vec2 aH; attribute vec4 m0; attribute vec4 m1;
varying vec3 vW; varying vec3 vN; varying vec2 vH; varying vec4 vM0; varying vec4 vM1; varying vec4 vS;
uniform mat4 uShadowM;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normal; vH = aH; vM0 = m0; vM1 = m1; vS = uShadowM * w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const TERRAIN_F = NOISE + `
uniform vec3 uLightDir; uniform vec3 uStarColor; uniform vec3 uEye; uniform vec3 uSky; uniform vec3 uHaze; uniform vec3 uSea; uniform vec3 uPalette[5];
uniform vec3 uClipN; uniform float uClipA; uniform float uFogK; uniform float uFogStart; uniform float uTime; uniform float uBeat; uniform float uPhase;
uniform float uPulse; uniform float uQ; uniform float uHarmony; uniform float uSeed; uniform vec4 uStyle; uniform float uSpin; uniform float uFw; uniform float uSnow;
uniform vec4 uOhm[8]; uniform vec3 uOhmC[8]; uniform float uOhmN; uniform sampler2D uShadow; uniform float uShadowOn; uniform float uShadowPx; uniform float uNight;
varying vec3 vW; varying vec3 vN; varying vec2 vH; varying vec4 vM0; varying vec4 vM1; varying vec4 vS;
float shadowAt(){ if (uShadowOn < .5) return 1.0; vec3 s = vS.xyz / vS.w; if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  float b = .0015, k = 0.0; vec2 o = vec2(uShadowPx, 0.0);
  k += step(s.z - b, texture2D(uShadow, s.xy + o.xy).r); k += step(s.z - b, texture2D(uShadow, s.xy - o.xy).r);
  k += step(s.z - b, texture2D(uShadow, s.xy + o.yx).r); k += step(s.z - b, texture2D(uShadow, s.xy - o.yx).r); return k * .25; }
void main(){ vec3 up = normalize(vW); if (dot(up, uClipN) < uClipA) discard;
  vec3 N = normalize(vN), L = uLightDir, V = normalize(uEye - vW);
  float rock = vM0.x, soil = vM0.y, veg = vM0.z, sand = vM0.w, wet = vM1.x, ice = vM1.y, hollow = vM1.z, crack = vM1.w;
  float sum = max(.001, rock + soil + veg + sand + ice);
  vec3 base = (uPalette[0] * rock + uPalette[1] * soil + uPalette[2] * veg + uPalette[3] * sand + uPalette[4] * ice) / sum;
  // detail: grain at 1/8 width and patches at a few widths (so close land is not flat colour)
  vec3 q = vW * uFw; float n1 = vnoise(q * 8.0), n2 = vnoise(q * .9 + 7.0), n3 = vnoise(q * 30.0);
  base *= .78 + .3 * n1 + .16 * n2 + .08 * n3;
  base = mix(base, base * vec3(.85, .95, .7), veg * (n2 - .4) * .6);
  base *= 1.0 - .35 * wet - .5 * hollow; base = mix(base, vec3(.02), crack * .8);
  float steep = 1.0 - clamp(dot(N, up), 0.0, 1.0); base = mix(base, uPalette[0] * (.7 + .3 * n1), smoothstep(.35, .75, steep) * .7);
  float sunUp = dot(up, L), vis = smoothstep(-.08, .06, sunUp), sh = shadowAt();
  float diff = max(dot(N, L), 0.0) * vis * sh;
  vec3 amb = uSky * (.28 + .55 * clamp(sunUp * 2.0 + .25, 0.0, 1.0)) + vec3(.035, .045, .08) * uNight;
  vec3 col = base * (amb + diff * uStarColor * 1.25);
  float wd = vH.y;
  if (wd > .0005) { float k = 1.0 - exp(-wd * 5.0); vec3 Nw = normalize(up + .035 * vec3(vnoise(q * 3.0 + uTime * .3) - .5, vnoise(q * 3.0 + 3.1 - uTime * .25) - .5, vnoise(q * 3.0 + 9.7) - .5));
    vec3 wc = mix(base * .55, uSea, .55 + .45 * k); float fr = pow(1.0 - max(dot(Nw, V), 0.0), 5.0);
    float sp = pow(max(dot(reflect(-L, Nw), V), 0.0), 80.0) * vis * sh;
    col = wc * (amb + max(dot(Nw, L), 0.0) * vis * sh * uStarColor) + sp * uStarColor * 1.6 + fr * uHaze * .6; }
  // ohm lights: each sounding ohm lights the land under it (warm pool, x its own colour)
  for (int i = 0; i < 8; i++) { if (float(i) >= uOhmN) break; vec3 d = vW - uOhm[i].xyz; float r2 = dot(d, d) / (uOhm[i].w * uOhm[i].w);
    col += base * uOhmC[i] * (1.6 / (1.0 + r2 * 6.0)) * max(.2, dot(N, normalize(-d + up * uOhm[i].w * .5))); }
  col *= 1.0 + .1 * uPulse;
  float dist = length(uEye - vW), f = 1.0 - exp(-max(0.0, dist - uFogStart) * uFogK);
  col = mix(col, uHaze, clamp(f, 0.0, .92));
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0); }`;
export const DEPTH_V = `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const DEPTH_F = `void main(){ gl_FragColor = vec4(1.0); }`;
export const SKY_V = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`;
export const SKY_F = NOISE + `
uniform mat4 uInvPV; uniform vec3 uEye; uniform vec3 uLightDir; uniform vec3 uStarColor; uniform vec3 uSky; uniform vec3 uHaze; uniform float uAtmo; uniform float uSpace; uniform float uTime; uniform float uPulse;
varying vec2 vP;
void main(){ vec4 w = uInvPV * vec4(vP, 1.0, 1.0); vec3 dir = normalize(w.xyz / w.w - uEye), up = normalize(uEye), L = uLightDir;
  float e = dot(dir, up), sunUp = dot(up, L), day = smoothstep(-.18, .3, sunUp), set = exp(-abs(sunUp) * 7.0);
  vec3 zen = uSky * (.25 + .85 * day), hor = mix(uHaze, vec3(1.0, .55, .3), set * .55 * smoothstep(-.3, .9, dot(dir, L))) * (.25 + .8 * day);
  vec3 ground = mix(zen, hor, exp(-max(e, 0.0) * 6.0));
  float sd = dot(dir, L); ground += uStarColor * (smoothstep(.9994, .9998, sd) * 4.0 + pow(max(sd, 0.0), 300.0) * .8 + pow(max(sd, 0.0), 12.0) * .12 * day);
  // space: black + the thin lit atmosphere rim around the planet
  float tca = -dot(uEye, dir), b = sqrt(max(dot(uEye, uEye) - tca * tca, 0.0)); vec3 sp = vec3(.004, .005, .012);
  if (tca > 0.0) { float rim = exp(-max(b - 1.0, 0.0) / .035) * step(1.0, b) * uAtmo; vec3 cp = normalize(uEye + dir * tca); float lit = clamp(dot(cp, L) * 1.4 + .35, 0.0, 1.0);
    sp += uSky * rim * lit * 1.4 + vec3(1.0, .5, .3) * rim * exp(-abs(dot(cp, L)) * 6.0) * .3; }
  sp += uStarColor * smoothstep(.9996, .99985, sd) * 3.0;
  vec3 col = mix(ground, sp, uSpace);
  // stars (fade with daylight)
  vec3 sd3 = dir * 220.0; vec3 ci = floor(sd3); float h = hash3(ci); float star = step(.9965, h) * smoothstep(.45, .05, length(fract(sd3) - .5));
  col += vec3(.8, .85, 1.0) * star * (1.0 - day * (1.0 - uSpace)) * (.5 + .5 * hash3(ci + 3.0));
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0); }`;
export const CLOUD_V = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const CLOUD_F = NOISE + `
uniform sampler2D uCloudA; uniform sampler2D uCloudB; uniform float uMix; uniform vec3 uLightDir; uniform vec3 uStarColor; uniform vec3 uSky; uniform vec3 uEye; uniform float uTime; uniform float uAmt; uniform vec3 uClipN; uniform float uClipA;
varying vec3 vW;
void main(){ vec3 d = normalize(vW); if (dot(d, uClipN) < uClipA) discard; vec2 uv = vec2(atan(d.y, d.x) / 6.2831853 + .5, asin(clamp(d.z, -1.0, 1.0)) / 3.14159265 + .5);
  float c = mix(texture2D(uCloudA, uv).r, texture2D(uCloudB, uv).r, uMix);
  float n = vnoise(d * 60.0 + vec3(uTime * .02, 0.0, 0.0)) * .5 + vnoise(d * 160.0 - vec3(0.0, uTime * .03, 0.0)) * .3;
  float a = smoothstep(.35, .8, c + (n - .4) * .35) * uAmt; if (a < .01) discard;
  float sunUp = dot(d, uLightDir), lit = smoothstep(-.12, .2, sunUp);
  vec3 col = mix(uSky * .35 + .06, uStarColor * (.75 + .25 * n), lit) * (.55 + .45 * (1.0 - c * .6));
  float dist = length(uEye - vW); a *= smoothstep(.0, .06, dist);
  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), a * .85); }`;
export const PLANET_V = `varying vec3 vN; varying vec3 vD; uniform mat4 uRot; void main(){ vN = normal; vD = (uRot * vec4(normal, 0.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const PLANET_F = `
uniform sampler2D uTex; uniform vec3 uLightDir; uniform vec3 uStarColor; uniform vec3 uSky; uniform float uAtmo; uniform float uPulse; uniform float uHas;
varying vec3 vN; varying vec3 vD;
void main(){ vec3 n = normalize(vN), d = normalize(vD); vec2 uv = vec2(atan(d.y, d.x) / 6.2831853 + .5, asin(clamp(d.z, -1.0, 1.0)) / 3.14159265 + .5);
  vec3 base = uHas > .5 ? texture2D(uTex, uv).rgb : vec3(.2); float l = max(dot(n, uLightDir), 0.0);
  vec3 col = base * (uStarColor * l * 1.2 + uSky * .06 + .015); float rim = pow(1.0 - max(n.z, 0.0), 3.0) * uAtmo; col += uSky * rim * (.25 + l) * .8;
  col *= 1.0 + .08 * uPulse; gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0); }`;
export const SPECK_V = `attribute vec3 aC; attribute float aS; varying vec3 vC; uniform float uPx; void main(){ vC = aC; vec4 m = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aS * uPx; gl_Position = projectionMatrix * m; }`;
export const SPECK_F = `varying vec3 vC; uniform float uA; void main(){ vec2 p = gl_PointCoord - .5; float r = dot(p, p); if (r > .25) discard; gl_FragColor = vec4(vC, uA * (1.0 - r * 3.0)); }`;
