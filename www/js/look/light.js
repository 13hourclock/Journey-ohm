// LOOK / light: ONE key light for the whole scene (direction + colour + ambient) and a cheap fake of real lighting on round
// bodies: a soft terminator (the night side), limb darkening (depth at the edge), a rim light on the lit edge and a small
// highlight. All of it is pre-baked into NEUTRAL overlay sprites per size bucket and light-angle bucket, so per body it is
// 1-2 drawImage calls with no per-frame gradients, whatever the body's colour. A fully baked tinted body sprite is there for
// when the look layer draws a body itself. Every number below is a PARAMETER (materials differ per look option).
import { sizeBucket, rgbKey, unKey } from './sprites.js';
const ANG = 32;   // light-angle buckets (11.25 deg); the key light moves slowly, so rebakes are rare
export const MATERIAL = { ambient: .22, term: .55, termSoft: .5, limb: .35, rim: .55, rimWidth: .14, spec: .35, specSize: .22 };
export function createLight(sprites, opts = {}) {
  const L = { angle: -2.25, elev: .45, color: [255, 244, 228], mat: { ...MATERIAL, ...(opts.material || {}) }, ver: 0 };
  // set the key light (angle in radians, screen space; elev 0 = grazing .. 1 = from the viewer); colour is [r,g,b]
  L.set = ({ angle = L.angle, elev = L.elev, color = L.color, material } = {}) => {
    const a = Math.round(angle / (Math.PI * 2) * ANG), b = Math.round(L.angle / (Math.PI * 2) * ANG);
    if (a !== b || Math.abs(elev - L.elev) > .05 || material) L.ver++;
    L.angle = angle; L.elev = elev; const C = L.color === color ? color.slice() : color, lc = L.color = L.lc || (L.lc = [0, 0, 0]); for (let i = 0; i < 3; i++) lc[i] = Math.min(255, (C[i] >> 5) * 32 + 16);   // in place (no per-frame array)   // 3 bits per channel: a slow colour drift re-bakes the rim a few times per minute, not every frame
    if (material) Object.assign(L.mat, material); };
  const aBucket = () => ((Math.round(L.angle / (Math.PI * 2) * ANG) % ANG) + ANG) % ANG;
  const dir = () => { const a = aBucket() / ANG * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; };
  // neutral shade overlay: black alpha for terminator + limb darkening, white alpha for the highlight. source-over.
  const paintShade = (x, w) => { const R = w / 2, m = L.mat, [dx, dy] = dir(), off = 1 - L.elev;
    x.save(); x.beginPath(); x.arc(R, R, R, 0, Math.PI * 2); x.clip();
    // terminator: lit side clear, far side dark; the boundary shifts with light elevation, softness = termSoft
    const t = x.createLinearGradient(R + dx * R, R + dy * R, R - dx * R, R - dy * R), mid = .5 + .3 * L.elev;
    t.addColorStop(0, 'rgba(0,0,0,0)'); t.addColorStop(Math.max(0, mid - m.termSoft * .5), 'rgba(0,0,0,0)');
    t.addColorStop(Math.min(1, mid + m.termSoft * .5), `rgba(0,0,0,${m.term * (1 - m.ambient)})`); t.addColorStop(1, `rgba(0,0,0,${m.term * (1 - m.ambient)})`);
    x.fillStyle = t; x.fillRect(0, 0, w, w);
    // limb darkening (round depth)
    const l = x.createRadialGradient(R, R, R * .55, R, R, R); l.addColorStop(0, 'rgba(0,0,0,0)'); l.addColorStop(1, `rgba(0,0,0,${m.limb})`); x.fillStyle = l; x.fillRect(0, 0, w, w);
    // highlight toward the light
    if (m.spec > 0) { const hx = R + dx * R * .45 * off, hy = R + dy * R * .45 * off, h = x.createRadialGradient(hx, hy, 0, hx, hy, R * m.specSize * 2.2);
      h.addColorStop(0, `rgba(255,255,255,${m.spec})`); h.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = h; x.fillRect(0, 0, w, w); }
    x.restore(); };
  // rim: a thin bright crescent on the lit edge, baked in the key light's colour bucket. Drawn with 'lighter'.
  const paintRim = ck => (x, w) => { const R = w / 2, m = L.mat, [dx, dy] = dir(), [r, g, b] = unKey(ck);
    const ring = x.createRadialGradient(R, R, R * (1 - m.rimWidth * 1.6), R, R, R); ring.addColorStop(0, `rgba(${r},${g},${b},0)`); ring.addColorStop(.7, `rgba(${r},${g},${b},${m.rim})`); ring.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = ring; x.beginPath(); x.arc(R, R, R, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'destination-in';   // keep only the lit side
    const k = x.createLinearGradient(R + dx * R, R + dy * R, R - dx * R * .2, R - dy * R * .2); k.addColorStop(0, 'rgba(0,0,0,1)'); k.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = k; x.fillRect(0, 0, w, w); x.globalCompositeOperation = 'source-over'; };
  L.shadeSprite = (px, step) => { const R = sizeBucket(px, step); return sprites.get(`s${R}:${aBucket()}:${L.ver}`, R * 2, R * 2, paintShade); };
  L.rimSprite = (px, step) => { const R = sizeBucket(px, step), [r, g, b] = L.color, ck = rgbKey(r, g, b); return sprites.get(`r${R}:${aBucket()}:${ck}:${L.ver}`, R * 2, R * 2, paintRim(ck)); };
  // shade + rim merged into ONE sprite (rim pre-added with 'lighter' at bake time), drawn source-over: one drawImage per ohm
  // instead of two. On a dark-to-mid body this reads the same as an additive rim; separate rimSprite stays for the exact path.
  // ONE scratch canvas for the rim pass of merged bakes (was a new canvas per bake): grown to the largest size, cleared per use
  const SCR = { c: null };
  const scratch = w => { let c = SCR.c; if (!c || c.width < w) c = SCR.c = sprites.make(w, w); const x = c.getContext('2d');
    if (typeof x.reset === 'function') x.reset(); else { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    x.clearRect(0, 0, w, w); return x; };
  const mergedPaint = ck => (x, w) => { paintShade(x, w); const tx = scratch(w); paintRim(ck)(tx, w);
    x.globalCompositeOperation = 'lighter'; x.drawImage(tx.canvas, 0, 0, w, w, 0, 0, w, w); x.globalCompositeOperation = 'source-over'; };
  const LS = { a: -1, c: -1, v: -1, k: [], p: null };   // litSprite keys + painter, rebuilt only when the light bucket changes
  L.litSprite = (px, step) => { const R = sizeBucket(px, step), c = L.color, a = aBucket(), ck = rgbKey(c[0], c[1], c[2]);
    if (a !== LS.a || ck !== LS.c || L.ver !== LS.v) { LS.a = a; LS.c = ck; LS.v = L.ver; LS.k.length = 0; LS.p = mergedPaint(ck); }
    return sprites.get(LS.k[R] || (LS.k[R] = `l${R}:${a}:${ck}:${L.ver}`), R * 2, R * 2, LS.p); };
  // the merged lit sprite at an exact DEVICE radius Rd (drawn 1:1 by the caller): key + painter, so the caller can bake it in idle time
  // keys cached per (angle bucket, colour bucket, ver): no string is built per ohm per frame (GC pressure on the phone)
  const LX = { a: -1, c: -1, v: -1, k: [] };
  L.litExactKey = Rd => { const c = L.color, a = aBucket(), ck = rgbKey(c[0], c[1], c[2]);
    if (a !== LX.a || ck !== LX.c || L.ver !== LX.v) { LX.a = a; LX.c = ck; LX.v = L.ver; LX.k.length = 0; }
    return LX.k[Rd] || (LX.k[Rd] = `lx${Rd}:${a}:${ck}:${L.ver}`); };
  L.litExactPaint = () => { const c = L.color; return mergedPaint(rgbKey(c[0], c[1], c[2])); };
  // full body sprite: flat colour disc + shade + rim, all baked (1 drawImage per body). For bodies the look layer draws itself.
  L.bodySprite = (r, g, b, px, step) => { const R = sizeBucket(px, step), k = rgbKey(r, g, b), lc = L.color, lk = rgbKey(lc[0], lc[1], lc[2]);
    return sprites.get(`b${R}:${k}:${aBucket()}:${lk}:${L.ver}`, R * 2, R * 2, (x, w) => { const [cr, cg, cb] = unKey(k);
      x.fillStyle = `rgb(${cr},${cg},${cb})`; x.beginPath(); x.arc(R, R, R, 0, Math.PI * 2); x.fill(); paintShade(x, w);
      x.globalCompositeOperation = 'lighter'; paintRim(lk)(x, w); x.globalCompositeOperation = 'source-over'; }); };
  // depth cue for far bodies (z 0 = focus .. 1 = far): smaller contrast, hazier, dimmer. Pure numbers; caller applies them.
  L.depth = (z, haze = .6) => { const k = Math.max(0, Math.min(1, z)); return { alpha: 1 - .55 * k * haze, rim: 1 - k, glow: 1 - .4 * k, shade: 1 - .5 * k }; };
  return L;
}
