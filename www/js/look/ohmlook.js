// LOOK / ohm character (Wilbow 10:06 PM MDT Oct 25 "more shaded and without any outlines ... the ohms need more character", 11:41 PM "A b and c").
// One module draws an ordinary ohm's whole body in place of ohmdraw's flat blob: shaded skin, a face, posture, legs and a contact shadow.
//   A faces   - eye count from genes (eyes + 1, as the world draws), eye SIZE from social, iris size from hear, lids from calm; catchlights
//               from the key light; gaze toward the partner (or what it watches / where it goes); wakes up (lids open) in a jam, drowsy
//               when unhealed; steadier gaze with xp (young ohms glance about); blinks (per-ohm period).
//   B skin    - dapples / bands / speckles from the ohm's tradition (folk + celtic dapple, gamelan + japan + wafrica bands, raga + maqam +
//               techno speckle), deeper with xp; a newborn (xp 0) is plain. Colour muted by heal (unhealed .12 sat .. healed .36). No outline.
//   C posture - calm ohms squash + settle on the breath, social ohms lean toward the partner, floaters get a far, faint hover shadow,
//               singing (glow) swells the body.
// HOW (smooth, baked): one body sprite per ohm per device radius (rest shape, skin, shading, legs) and one face sprite per lid / gaze
// bucket, both idle-baked through look's OX queue (exact device size). Per frame: the world blob is erased (destination-out, its own ring
// path), the shadow, body and face are 3 drawImage calls with one affine transform = least-squares fit of the live soft-body ring to its
// rest ring (squish / stretch / pinch follow) x the posture. No shadowBlur / filter / gradient per frame. opts.realLook.ohmChar = false = off.
import { hsl2rgb } from './palette.js';
import { TRADITIONS } from './aura.js';
import { shapeK, extentK, appRoom, paintBehind, paintOnSkin, stepSegments, paintSegment, drawWalkLegs, BODY_PLAN } from '../bodyplan.js';   // body plans (old game), switch BODY_PLAN.on
// tune (playtwice 'ohm.tune': a phrase played twice is the ohm's tune): a short warm glow wells up INSIDE the ohm (kept within its
// smallest radius, so never past its skin), shrinks and settles, and as it settles the skin marks (B) deepen a little (tuneDeep per tune taught, o.tune.n, up to 2;
// undo takes o.tune back and the marks with it). One baked 64 px sprite, one drawImage per flashing ohm; nothing when no flash is live.
export const OHM_CHAR = { on: true, face: true, skin: true, posture: true, shadow: true, legs: true, erase: 1.04,
  tune: true, tuneLife: 1.4, tuneRise: .09, tuneA: .62, tuneR: .78, tuneSettle: .55, tuneDeep: .08, tuneMax: 2, tuneCol: [255, 206, 140],
  sat: [.08, .28], lit: [.38, .5], xpFull: 60, blinkMin: 3.2, blinkVar: 3.8, blinkLen: .14,
  squash: .07, settle: .035, lean: .12, swell: .07, shadowA: .45, floatShadowA: .24, minRd: 5, maxRd: 150, gazeStep: .35, settleN: 8, gestSteps: 4, gestLead: .1, gestHold: 16, gestSettleN: 0, shearMin: .08, fullN: [14, 10, 6, 3], maxN: [24, 24, 24, 8], erasepx: 2.4, claim: true, claimN: [22, 20, 14, 3], faceMinPx: 6 };
const PAT = { folk: 'dapple', celtic: 'dapple', gamelan: 'band', japan: 'band', wafrica: 'band', raga: 'speckle', maqam: 'speckle', techno: 'speckle' };
const BYN = new Map(); for (const t of TRADITIONS) { BYN.set(t.id, t); for (const n of t.names) BYN.set(n, t); }
const hashS = v => { let h = 2166136261; const s = String(v == null ? '' : v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const cl = v => v < 0 ? 0 : v > 1 ? 1 : v, TAU = Math.PI * 2;
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${cl(a).toFixed(3)})`;
// mulberry32
const rngOf = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export function tradOfOhm(o) { let t = typeof o.tradId === 'string' && o.tradId ? o.tradId : null;
  if (!t) { let tr = null; try { tr = o.tradition; } catch (e) { tr = null; } if (typeof tr === 'string') t = tr; else if (tr && typeof tr === 'object') t = String(tr.id || tr.trad || tr.name || ''); }
  const b = t ? BYN.get(String(t).toLowerCase()) : null; return b || TRADITIONS[hashS(o.id != null ? o.id : o.seed) % 8]; }
// the smooth closed path through the 10 ring points (ohmdraw's quadratic midpoints)
const ringPath = (x, X, Y, n, keep) => { if (!keep) x.beginPath(); x.moveTo((X[n - 1] + X[0]) / 2, (Y[n - 1] + Y[0]) / 2); for (let i = 0; i < n; i++) { const j = (i + 1) % n; x.quadraticCurveTo(X[i], Y[i], (X[i] + X[j]) / 2, (Y[i] + Y[j]) / 2); } x.closePath(); };
export function createOhmLook({ sprites, jobs, pend, light, sim, healOf, opts = {} }) {
  const O = { ...OHM_CHAR, ...opts }, S = new WeakMap(), K = { on: O.on !== false, O, stats: { queued: 0, bodies: 0, faces: 0, shadows: 0, miss: 0, erased: 0, stale: 0, capped: 0 } };
  const PX = new Float32Array(48), PY = new Float32Array(48);
  const lightDir = () => { const a = light ? light.angle : -2.25; return [Math.cos(a), Math.sin(a)]; };
  const aBk = () => ((Math.round((light ? light.angle : -2.25) / TAU * 16) % 16) + 16) % 16;
  const ready = (k, w, paint) => { if (sprites.map.has(k)) return sprites.get(k, w, w, null); if (jobs && jobs.length < 48 && !pend.has(k)) { pend.add(k); jobs.push({ key: k, w, paint }); K.stats.queued++; } return null; };
  const st = o => { let s = S.get(o); if (!s) { const sd = hashS(o.id != null ? o.id : o.seed); S.set(o, s = { sd, trad: null, tn: -1, heal: .75, hn: -1, gz: 0, gzT: 0, sac: 0, open: 1, lean: 0, sw: 0, blink: (sd % 1000) / 1000 * 4 }); } return s; };
  // ---- colours: muted at rest (sat by heal), the tradition tints the marks
  const colsOf = (o, s, hb, db) => { const heal = hb / 3, hue = o.hue || 0, sat = O.sat[0] + (O.sat[1] - O.sat[0]) * heal, lit = O.lit[0] + (O.lit[1] - O.lit[0]) * heal;
    const base = hsl2rgb(hue, sat, lit), th = rgb2hsl(hex(s.trad.ohm || '#888888')), mh = hue + ((((th[0] - hue) % 360) + 540) % 360 - 180) * .45;
    const dark = hsl2rgb(mh, Math.min(.5, sat * 1.25 + .04), lit * .66), pale = hsl2rgb(mh, sat * .8, Math.min(.8, lit * 1.32)), deep = hsl2rgb(hue, sat * .9, lit * .42);
    const irisH = (hue + 160 + 50 * ((o.g && o.g.hear) || .6)) % 360, iris = hsl2rgb(irisH, .22 + .2 * heal, .36), irisD = hsl2rgb(irisH, .25 + .2 * heal, .2);
    return { base, dark, pale, deep, iris, irisD, sat, lit, hue }; };
  // ---- the body sprite (device px): rest shape, skin marks (B), shading (no outline), optional legs
  const bodyPaint = (o, Rd, H, C, kind, depth, legs, bf, bs) => (x, w) => { const g = o.g, rr = Rd / g.r, [dx, dy] = lightDir(), n = g.plan ? 40 : 10, t = [0, 0], rnd = rngOf(st(o).sd ^ 0x9e37);
    for (let i = 0; i < n; i++) { const a = i / n * TAU, r0 = g.r * shapeK(g, a); t[0] = Math.cos(a) * r0 / Math.sqrt(g.aspect); t[1] = Math.sin(a) * r0 * Math.sqrt(g.aspect); PX[i] = H + t[0] * rr; PY[i] = H + t[1] * rr; }
    let ymax = 0, xmax = 0; for (let i = 0; i < n; i++) { ymax = Math.max(ymax, PY[i] - H); xmax = Math.max(xmax, Math.abs(PX[i] - H)); }
    if (bs) { const sy = H + ymax + (legs ? Rd * .26 : 0), rx = xmax * 1.25, ry = xmax * .28, gr = x.createRadialGradient(H, sy, 0, H, sy, rx); gr.addColorStop(0, `rgba(6,5,8,${O.shadowA})`); gr.addColorStop(.45, `rgba(6,5,8,${O.shadowA * .62})`); gr.addColorStop(.8, `rgba(6,5,8,${O.shadowA * .16})`); gr.addColorStop(1, 'rgba(6,5,8,0)');
      x.save(); x.translate(H, sy); x.scale(1, ry / rx); x.translate(-H, -sy); x.fillStyle = gr; x.fillRect(H - rx, sy - rx, rx * 2, rx * 2); x.restore(); }   // the contact shadow baked under a grounded ohm (far tier)
    const pt = a => { const r0 = rr * g.r * shapeK(g, a); return [H + Math.cos(a) * r0 / Math.sqrt(g.aspect), H + Math.sin(a) * r0 * Math.sqrt(g.aspect)]; };
    if (g.plan) paintBehind(x, g, H, Rd, C, rgba, pt, ymax, dx);   // body plan appendages behind the body (spikes, fronds, feelers, tail, keel, fins, bubbles)
    if (legs) { // tapered legs behind the body: hip under the belly, a small rounded foot; shaded (lighter toward the light), no stroke
      const NL = g.plan ? Math.max(2, g.legs | 0) : 2, LL = g.plan ? (g.legLen || 1) : 1, LEGS = []; for (let j = 0; j < NL; j++) { const u = NL === 2 ? (j ? 1 : -1) : -1 + 2 * j / (NL - 1); LEGS.push(u); }
      for (const u of LEGS) { const sx = u < 0 ? -1 : 1, au = Math.abs(u), hx = H + u * Rd * .36, hy = H + ymax * .72, fx = H + u * Rd * (.48 + .25 * (LL - 1)) + sx * au * Rd * .1 * (LL - 1), fy = H + ymax + Rd * .22 * LL, wt = Rd * .085 / Math.sqrt(LL), wb = Rd * .06 / Math.sqrt(LL);
        const lg = x.createLinearGradient(hx - wt, 0, hx + wt, 0); lg.addColorStop(0, rgba(dx < 0 ? C.base : C.deep, 1)); lg.addColorStop(1, rgba(dx < 0 ? C.deep : C.base, 1));
        x.fillStyle = lg; x.beginPath(); x.moveTo(hx - wt, hy); x.lineTo(hx + wt, hy); x.lineTo(fx + wb, fy); x.lineTo(fx - wb, fy); x.closePath(); x.fill();
        const fg = x.createRadialGradient(fx - Rd * .03, fy - Rd * .03, 0, fx, fy, Rd * .11); fg.addColorStop(0, rgba(C.base, 1)); fg.addColorStop(1, rgba(C.deep, 1));
        x.fillStyle = fg; x.beginPath(); x.ellipse(fx + sx * Rd * .03, fy, Rd * .1, Rd * .055, 0, 0, TAU); x.fill(); } }
    x.save(); ringPath(x, PX, PY, n); x.fillStyle = rgba(C.base, 1); x.fill(); x.clip();
    if (g.plan) paintOnSkin(x, g, H, Rd, C, rgba, ymax, xmax);   // body plan marks on the skin (a kick's band, a shell's plates)
    // B: skin marks, soft-edged (radial / linear gradients), deeper with xp
    if (O.skin && depth > .01) { const a = .55 * depth;
      if (kind === 'dapple') { const N = 7 + Math.round(depth * 6); for (let i = 0; i < N; i++) { const px = H + (rnd() * 2 - 1) * xmax * .95, py = H + (rnd() * 1.7 - .95) * ymax, pr = Rd * (.12 + rnd() * .16) * (.8 + .4 * depth), c = rnd() < .7 ? C.dark : C.pale;
          const gr = x.createRadialGradient(px, py, 0, px, py, pr); gr.addColorStop(0, rgba(c, a * .85)); gr.addColorStop(.55, rgba(c, a * .55)); gr.addColorStop(1, rgba(c, 0)); x.fillStyle = gr; x.fillRect(px - pr, py - pr, pr * 2, pr * 2); } }
      else if (kind === 'band') { const N = 3 + Math.round(depth * 2), ph = rnd() * TAU, tilt = (rnd() - .5) * .5; for (let i = 0; i < N; i++) { const yc = H - ymax * .55 + (i + .5) / N * ymax * 1.6, bw = Rd * (.07 + .05 * depth);
          x.save(); x.translate(H, yc); x.rotate(tilt); const lg = x.createLinearGradient(0, -bw * 1.6, 0, bw * 1.6); lg.addColorStop(0, rgba(C.dark, 0)); lg.addColorStop(.5, rgba(C.dark, a * .9)); lg.addColorStop(1, rgba(C.dark, 0)); x.fillStyle = lg;
          x.beginPath(); x.moveTo(-H, -bw * 1.6); for (let k = 0; k <= 12; k++) { const u = -H + k / 12 * 2 * H; x.lineTo(u, -bw * 1.6 + Math.sin(u / Rd * 3 + ph + i) * bw * .6); } for (let k = 12; k >= 0; k--) { const u = -H + k / 12 * 2 * H; x.lineTo(u, bw * 1.6 + Math.sin(u / Rd * 3 + ph + i) * bw * .6); } x.fill(); x.restore(); } }
      else { const N = 18 + Math.round(depth * 26); for (let i = 0; i < N; i++) { const ang = rnd() * TAU, rr2 = Math.sqrt(rnd()), px = H + Math.cos(ang) * rr2 * xmax * .9, py = H + Math.sin(ang) * rr2 * ymax * .9, pr = Math.max(.8, Rd * (.025 + rnd() * .035)), c = rnd() < .75 ? C.dark : C.pale;
          const gr = x.createRadialGradient(px, py, 0, px, py, pr * 1.6); gr.addColorStop(0, rgba(c, a)); gr.addColorStop(.5, rgba(c, a * .7)); gr.addColorStop(1, rgba(c, 0)); x.fillStyle = gr; x.fillRect(px - pr * 2, py - pr * 2, pr * 4, pr * 4); } } }
    // subsurface: a warm lighter glow inside toward the light
    let gr = x.createRadialGradient(H + dx * Rd * .3, H + dy * Rd * .3, 0, H + dx * Rd * .2, H + dy * Rd * .2, Rd * 1.05); gr.addColorStop(0, rgba(C.pale, .42)); gr.addColorStop(.6, rgba(C.pale, .1)); gr.addColorStop(1, rgba(C.pale, 0)); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    // terminator: the far side in shade (soft), deepest at the limb opposite the light
    gr = x.createRadialGradient(H + dx * Rd * .45, H + dy * Rd * .45, Rd * .25, H + dx * Rd * .2, H + dy * Rd * .2, Rd * 1.55); gr.addColorStop(0, 'rgba(12,10,18,0)'); gr.addColorStop(.45, 'rgba(12,10,18,.16)'); gr.addColorStop(.8, 'rgba(12,10,18,.48)'); gr.addColorStop(1, 'rgba(12,10,18,.62)'); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    // ambient occlusion under the belly + a faint warm ground bounce at the very bottom
    gr = x.createLinearGradient(0, H + ymax * .1, 0, H + ymax); gr.addColorStop(0, 'rgba(8,6,12,0)'); gr.addColorStop(.75, 'rgba(8,6,12,.22)'); gr.addColorStop(1, 'rgba(30,22,14,.12)'); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    // limb darkening + rim light, both following the real silhouette (an inner shadow, baked once: shadowBlur here is a bake, not a frame)
    const big = w * 3; x.shadowBlur = Rd * .28; x.shadowColor = 'rgba(6,5,10,.5)'; x.fillStyle = '#000';
    // the casting shape sits far off the canvas and only its shadow is offset back in, so no AA edge pixel of the black fill lands on the body (that was a dotted dark outline)
    const D = big * 4, SX = new Float32Array(n); for (let i = 0; i < n; i++) SX[i] = PX[i] + D; x.shadowOffsetX = -D; x.shadowOffsetY = 0;
    x.beginPath(); x.rect(-big + D, -big, big * 3, big * 3); ringPath(x, SX, PY, n, 1); x.fill('evenodd');
    const lc = light && light.color ? light.color : [255, 244, 228]; x.shadowBlur = Rd * .16; x.shadowColor = rgba([(lc[0] + 255) / 2, (lc[1] + 245) / 2, (lc[2] + 230) / 2], .32); x.shadowOffsetX = -dx * Rd * .1 - D; x.shadowOffsetY = -dy * Rd * .1;
    x.beginPath(); x.rect(-big + D, -big, big * 3, big * 3); ringPath(x, SX, PY, n, 1); x.fill('evenodd'); x.shadowColor = 'rgba(0,0,0,0)'; x.shadowBlur = 0; x.shadowOffsetX = 0; x.shadowOffsetY = 0;
    // a soft specular sheen (wet-skin), small and toward the light
    const sx = H + dx * Rd * .42, sy = H + dy * Rd * .42 * Math.sqrt(g.aspect); gr = x.createRadialGradient(sx, sy, 0, sx, sy, Rd * .3); gr.addColorStop(0, 'rgba(255,250,240,.34)'); gr.addColorStop(.4, 'rgba(255,250,240,.1)'); gr.addColorStop(1, 'rgba(255,250,240,0)'); x.fillStyle = gr; x.fillRect(sx - Rd * .3, sy - Rd * .3, Rd * .6, Rd * .6);
    x.restore();
    if (bf) { x.save(); x.translate(H - bf.FH, H - Rd * .25 * Math.sqrt(g.aspect || 1) - bf.FH); facePaint(o, Rd, bf.FH, C, bf.ne, bf.er, bf.irisK, OPENS[bf.oq], 0)(x, bf.FH * 2); x.restore(); } };   // far tier: the face baked in (resting lids, gaze ahead)
  // ---- the face sprite (device px, square 2*FH, centred on the eye line centre): sockets, eyeballs, irises, catchlights, lids (A)
  const facePaint = (o, Rd, FH, C, ne, er, irisK, open, gz) => (x, w) => { const sp = Math.max(er * 2.25, Rd * .38), [dx, dy] = lightDir();
    for (let e = 0; e < ne; e++) { const ex = FH + (e - (ne - 1) / 2) * sp, ey = FH;
      // socket: a soft ambient-occlusion dip around the eye
      let gr = x.createRadialGradient(ex, ey + er * .1, er * .7, ex, ey + er * .1, er * 1.75); gr.addColorStop(0, 'rgba(10,8,14,.34)'); gr.addColorStop(1, 'rgba(10,8,14,0)'); x.fillStyle = gr; x.beginPath(); x.arc(ex, ey + er * .1, er * 1.75, 0, TAU); x.fill();
      x.save(); x.beginPath(); x.arc(ex, ey, er, 0, TAU); x.clip();
      // eyeball: warm off-white, spherical shade (darker at the bottom and the far side)
      gr = x.createRadialGradient(ex + dx * er * .35, ey + dy * er * .35, er * .1, ex, ey, er * 1.05); gr.addColorStop(0, 'rgb(236,231,222)'); gr.addColorStop(.7, 'rgb(206,200,192)'); gr.addColorStop(1, 'rgb(150,144,140)'); x.fillStyle = gr; x.fillRect(ex - er, ey - er, er * 2, er * 2);
      // iris + pupil, toward the gaze; the limbus darker (a gradient, not a ring)
      const ir = er * irisK, ix = ex + gz * er * .32, iy = ey + er * .05;
      gr = x.createRadialGradient(ix, iy, 0, ix, iy, ir); gr.addColorStop(0, rgba(C.iris, 1)); gr.addColorStop(.72, rgba(C.iris, 1)); gr.addColorStop(1, rgba(C.irisD, 1)); x.fillStyle = gr; x.beginPath(); x.arc(ix, iy, ir, 0, TAU); x.fill();
      gr = x.createRadialGradient(ix, iy, 0, ix, iy, ir * .5); gr.addColorStop(0, 'rgb(8,7,10)'); gr.addColorStop(.8, 'rgb(12,10,14)'); gr.addColorStop(1, 'rgba(12,10,14,0)'); x.fillStyle = gr; x.beginPath(); x.arc(ix, iy, ir * .5, 0, TAU); x.fill();
      // upper lid: skin, its lower edge at the openness; a soft shadow it casts onto the eyeball
      const lidY = ey - er + (1 - open) * er * 2.05;
      gr = x.createLinearGradient(0, lidY - er * .05, 0, lidY + er * .45); gr.addColorStop(0, 'rgba(10,8,14,.42)'); gr.addColorStop(1, 'rgba(10,8,14,0)'); x.fillStyle = gr; x.fillRect(ex - er, lidY, er * 2, er * .5);
      gr = x.createLinearGradient(0, ey - er, 0, lidY + er * .1); gr.addColorStop(0, rgba(C.base, 1)); gr.addColorStop(1, rgba(C.deep, 1)); x.fillStyle = gr;
      x.beginPath(); x.moveTo(ex - er * 1.1, ey - er * 1.1); x.lineTo(ex + er * 1.1, ey - er * 1.1); x.lineTo(ex + er * 1.1, lidY - er * .25); x.quadraticCurveTo(ex, lidY + er * .28, ex - er * 1.1, lidY - er * .25); x.closePath(); x.fill();
      // lower lid: a thin skin crescent (heavier when calm, i.e. open < 1)
      const lo = ey + er * (.98 - .22 * (1 - Math.min(1, open + .25))); x.fillStyle = rgba(C.base, 1); x.beginPath(); x.moveTo(ex - er * 1.1, ey + er * 1.1); x.lineTo(ex + er * 1.1, ey + er * 1.1); x.lineTo(ex + er * 1.1, lo + er * .08); x.quadraticCurveTo(ex, lo - er * .18, ex - er * 1.1, lo + er * .08); x.closePath(); x.fill();
      x.restore();
      // catchlights (only where the eye is open): a main one toward the light, a tiny second one opposite
      if (open > .2) { const cx = ix + dx * ir * .42, cy = iy + dy * ir * .42; if (cy > lidY + er * .1) {
        gr = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1.1, er * .26)); gr.addColorStop(0, 'rgba(255,255,252,.95)'); gr.addColorStop(.5, 'rgba(255,255,252,.6)'); gr.addColorStop(1, 'rgba(255,255,252,0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, Math.max(1.1, er * .26), 0, TAU); x.fill(); }
        const c2x = ix - dx * ir * .45, c2y = iy - dy * ir * .38; if (c2y > lidY + er * .1) { x.fillStyle = 'rgba(255,255,250,.35)'; x.beginPath(); x.arc(c2x, c2y, Math.max(.6, er * .09), 0, TAU); x.fill(); } } } };
  const shadowSprite = () => sprites.get('ohc:shadow', 64, 64, (x, w) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(6,5,8,1)'); gr.addColorStop(.45, 'rgba(6,5,8,.62)'); gr.addColorStop(.8, 'rgba(6,5,8,.16)'); gr.addColorStop(1, 'rgba(6,5,8,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); }, true);
  // ---- per frame
  let FN = 0, T = 0, BEAT = 0, QL = 0, NI = 0, NC = 0; const CL = []; K.frame = (n, t, beat, q) => { for (const o of CL) { const s = S.get(o); if (s.dn !== FN) K.stats.holes = (K.stats.holes | 0) + 1; } CL.length = 0; FN = n; T = t || 0; BEAT = beat || 0; QL = q | 0; NI = 0; NC = 0; };
  const OPENS = [0, .3, .55, .78, 1], openQ = v => { let bi = 0, bd = 9; for (let i = 0; i < 5; i++) { const d = Math.abs(OPENS[i] - v); if (d < bd) { bd = d; bi = i; } } return bi; };
  // state: heal (every 30 frames), lids, gaze, lean, swell (smoothed)
  const update = (o, s, gl, jam, dt) => { const g = o.g, b = o.body;
    if (s.tn < 0 || FN - s.tn > 240 || FN < s.tn) { s.trad = tradOfOhm(o); s.tn = FN; }
    if (s.hn < 0 || FN - s.hn > 30 || FN < s.hn) { s.heal = cl(healOf ? healOf(o) : .75); s.hn = FN; }
    const xp = o.xp || 0, steady = cl(xp / O.xpFull), p = b.partner, w = o.watch, tgt = p && p.body ? Math.sign(p.body.x - b.x) : w ? Math.sign(w.x - b.x) : Math.abs(b.vx || 0) > .05 ? Math.sign(b.vx) : 0;
    // gaze: toward the target; a young ohm glances about (saccades), steadier with xp
    if (T > s.sac) { s.sac = T + .8 + steady * 2.4 + ((s.sd >>> 3) % 100) / 100; s.gzT = (1 - steady) > .25 && ((s.sd + Math.floor(T * 3)) % 3 === 0) ? [-1, 0, 1][(s.sd + Math.floor(T)) % 3] : tgt; }
    if (p) s.gzT = tgt; const kk = Math.min(1, dt * 10); s.gz += (s.gzT - s.gz) * kk;
    // lids: calm = heavier, unhealed = drowsy, jam / singing = awake, blinks
    let op = 1 - .5 * (g.calm - .35); op *= .62 + .38 * s.heal; op = Math.min(1, op + .45 * jam + .25 * Math.min(1, gl));
    const per = O.blinkMin + ((s.sd >>> 5) % 1000) / 1000 * O.blinkVar, ph = (T + s.blink) % per; if (ph < O.blinkLen) op = ph < O.blinkLen * .5 ? 0 : .3;
    s.open = op; const lt = p && p.body ? Math.sign(p.body.x - b.x) * (g.social || .5) : 0; s.lean += (lt - s.lean) * Math.min(1, dt * 3); s.sw += (Math.min(1, gl) - s.sw) * Math.min(1, dt * 6); };
  // CLAIM (perf, parent 2:27 AM Oct 26): world ohmdraw.js asks look.ohmBody(o) before it fills its plain blob (v0.0.30 B12). An ohm drawn
  // with the character look last frame, well inside the rung cap (maxN) and render.js's list (LOOKN 64/40/24: claimN[q] leaves room for a reshuffle), on a rung that draws characters, is claimed:
  // the world skips its blob fill + stroke legs (look.legs) and K.draw skips the destination-out erase (~18 us an ohm on Skia, the biggest
  // single cost of the character look). Same look, same frame order; if the draw then fails, look.ohm's shaded path still paints a body.
  K.claim = (o, r, m, lod) => { if (!K.on || O.claim === false || (!BODY_PLAN.low && (QL >= 3 || (lod | 0) >= 2)) || !m || m.b || m.c || !o || !o.g || !o.body || o.rarity) return false;
    const s = S.get(o); if (!s || s.dn !== FN - 1 || !(s.ci < (O.claimN[Math.min(3, QL)] | 0))) return false; const Rx = Math.round(r * m.a); if (Rx < O.minRd * 1.6 + 1 || Rx > O.maxRd - 1) return false;   // r here carries the world's breath (render.js's r does not): a margin both ways
    if (s.nb !== FN) CL.push(o); s.nb = FN; K.stats.claimed = (K.stats.claimed | 0) + 1; return true; };
  K.claimed = o => { const s = S.get(o); return !!s && s.nb === FN; };
  // the main draw: true = this ohm's body + face are drawn (look.ohm then skips its lit body); false = not ready (old path)
  const DT = { t: -1 };
  K.draw = (g, o, x, y, r, m, gl, jam, lod) => { if (!K.on || !m || m.b || m.c) return false; const G = o.g, b = o.body; if (!G || !b || !b.ring || !b.rest || !(G.r > 0)) return false;
    const Rx = Math.round(r * m.a); if (Rx < O.minRd || Rx > O.maxRd) return false;
    const s = st(o), dt = DT.t < 0 ? 1 / 60 : Math.max(0, Math.min(.1, T - (s.lt == null ? T - 1 / 60 : s.lt))); s.lt = T; update(o, s, gl, jam, dt || 1 / 60);
    // GESTURE (fix 1:18 AM Oct 26): while this ohm's device radius is moving (a zoom / dive gesture) the bake radius is quantised
    // to O.gestSteps steps per octave, rounded UP with a lead, so the sprite on screen is a little larger and drawn DOWN (sharp, never a
    // blurry upscale that then snaps sharp); the exact size is baked only once the radius has held O.gestHold frames
    if (s.rxL !== Rx) { s.rxL = Rx; s.mv = FN; } const moving = O.gestSteps > 0 && s.mv != null && FN - s.mv < O.gestHold && FN >= s.mv;
    const Rd = moving ? Math.min(O.maxRd + 8, Math.round(Math.pow(2, Math.ceil(Math.log2(Rx * (1 + O.gestLead)) * O.gestSteps) / O.gestSteps))) : Rx;
    const tuneN = O.tune !== false && o.tune ? Math.min(O.tuneMax, o.tune.n | 0) : 0, tAge = s.tuT == null ? 1e9 : T - s.tuT;
    if (s.tuK == null) s.tuK = tuneN; else if (s.tuK !== tuneN && (tuneN < s.tuK || !(tAge >= 0 && tAge < O.tuneLife * O.tuneSettle))) s.tuK = tuneN;   // a new tune deepens the marks once the glow has settled in
    const hb = Math.round(s.heal * 3), xp = o.xp || 0, db = xp <= 0 ? 0 : 1 + Math.min(3, Math.floor(xp / O.xpFull * 3)), depth = db / 4 + O.tuneDeep * s.tuK, kind = PAT[s.trad.id] || 'dapple';
    const legs = !!(O.legs && G.legs && b.ground && (lod < 2 || BODY_PLAN.low)), H = Math.ceil(Rd * ((G.plan ? extentK(G) : 1 + (G.lobeAmt || 0)) * Math.max(Math.sqrt(G.aspect || 1), 1 / Math.sqrt(G.aspect || 1)) * 1.04 + Math.max(O.legs && G.legs ? .32 * (G.plan ? (G.legLen || 1) : 1) : .08, appRoom(G)) + .1)) + 2, ab = aBk(), lk = light && light.color ? ((light.color[0] >> 5) << 6 | (light.color[1] >> 5) << 3 | light.color[2] >> 5) : 0;
    // LOD tier: the first O.fullN[q] ohms drawn this frame (render.js draws focus-first) get the live face + live shadow; the rest a body sprite with the face
    // (resting lids, gaze ahead) and the contact shadow baked in = 1 drawImage. Hysteresis so an ohm does not flip tiers every frame.
    // a per-rung cap on character ohms (render.js draws focus-first): an ohm that had the character look last frame keeps it while there is
    // room (cap * 1.3), so the order shuffling with glow never flips an ohm between looks; past the cap the old shaded path draws it.
    const cap = O.maxN[Math.min(3, QL)] | 0; if (!(NC < cap || (s.ch === FN - 1 && NC < cap * 1.3))) { K.stats.capped++; return false; } s.ci = NC; NC++; s.ch = FN;
    const ni = NI++, fn = O.fullN[Math.min(3, QL)] | 0; s.full = s.full ? ni < fn * 1.35 + 1 : ni < fn; const full = s.full || !O.face, grounded0 = !!b.ground || !G.float;
    const ne = (G.eyes | 0) + 1, er = Rd * (.1 + .075 * cl(((G.social || .6) - .3) / .7)), irisK = .48 + .3 * cl(((G.hear || .7) - .4) / .6), FH = Math.ceil(Math.max(er * 2.25, Rd * .38) * (ne - 1) / 2 + er * 1.9) + 1;
    const bf = full || lod >= 3 ? null : { FH, ne, er, irisK, oq: openQ(1 - .3 * (G.calm || .5)) }, bs = !full && O.shadow && grounded0;
    const live = !!(legs && full && BODY_PLAN.walk && (lod < 2 || (BODY_PLAN.low && o === (sim && sim.ohm)))), legsB = legs && !live;   // O2 walking legs: near (full-tier) ohms draw their legs live, so the sprite is baked without them
    const shp = G._rare ? `r${G._rare}` : '', bk = `ohc:${o.id}${shp}${G.plan ? 'p' : ''}:${Rd}:${hb}${db}${s.tuK ? 't' + s.tuK : ''}${ab}:${lk}:${legsB ? 1 : 0}${bf ? 'f' + bf.oq : ''}${bs ? 's' : ''}`;
    let C = s.C; if (!C || s.ck !== hb * 7 + (s.trad.i | 0) * 31 + ((o.hue || 0) | 0) * 1009) { C = s.C = colsOf(o, s, hb, db); s.ck = hb * 7 + (s.trad.i | 0) * 31 + ((o.hue || 0) | 0) * 1009; }
    // ZOOM-SAFE (parent 11:52 PM: never a half bake, never a pop, never a rebake per zoom step): the last COMPLETE body sprite stays on
    // screen, scaled, until the new one is done; a new exact bake is queued only once the device radius has held for O.settleN frames.
    // The very first time an ohm is seen it bakes in-frame within the sprite bake budget (else the old look this one frame).
    if (s.rdL === Rd) s.rdN++; else { s.rdL = Rd; s.rdN = 0; } const settled = s.rdN >= (moving ? O.gestSettleN : O.settleN);
    let img = sprites.map.has(bk) ? sprites.get(bk, H * 2, H * 2, null) : null, iRd = Rd, iH = H;
    if (img) s.last = { img, Rd, H, bf: !!bf, bs }; else {
      if (s.last) { if (settled) ready(bk, H * 2, bodyPaint(o, Rd, H, C, kind, depth, legsB, bf, bs)); img = s.last.img; iRd = s.last.Rd; iH = s.last.H; K.stats.stale++; }
      else { img = sprites.get(bk, H * 2, H * 2, bodyPaint(o, Rd, H, C, kind, depth, legsB, bf, bs)); if (!img) { K.stats.miss++; return false; } s.last = { img, Rd, H, bf: !!bf, bs }; } }
    const hasF = s.last.bf, hasS = s.last.bs;   // what the sprite on screen actually carries (the last complete bake may be the other tier)
    // live breath (as ohmdraw) -> k = CSS px per world unit of the live ring
    const brf = sim && sim.breath ? sim.breath(o) : 1, br = brf * (1 - .22 * (b.pin || 0) + .25 * (b.pout || 0) + .12 * Math.min(1, b.throb || 0)) * (1 + gl * .04), k = r / G.r * br;
    // least-squares affine fit of the live ring to the rest ring (squish / stretch / pinch / tilt)
    const R = b.ring, Q = b.rest; let mrx = 0, mry = 0, mpx = 0, mpy = 0; for (let i = 0; i < 10; i++) { mrx += Q[i * 2]; mry += Q[i * 2 + 1]; mpx += R[i * 4]; mpy += R[i * 4 + 1]; } mrx /= 10; mry /= 10; mpx /= 10; mpy /= 10;
    let a11 = 0, a12 = 0, a21 = 0, a22 = 0, b11 = 0, b12 = 0, b22 = 0, ymx = -1e9; for (let i = 0; i < 10; i++) { const rx = Q[i * 2] - mrx, ry = Q[i * 2 + 1] - mry, px = R[i * 4] - mpx, py = R[i * 4 + 1] - mpy; a11 += px * rx; a12 += px * ry; a21 += py * rx; a22 += py * ry; b11 += rx * rx; b12 += rx * ry; b22 += ry * ry; if (R[i * 4 + 1] > ymx) ymx = R[i * 4 + 1]; }
    const det = b11 * b22 - b12 * b12; if (!(det > 1e-9)) return false; const i11 = b22 / det, i12 = -b12 / det, i22 = b11 / det;
    let M11 = a11 * i11 + a12 * i12, M12 = a11 * i12 + a12 * i22, M21 = a21 * i11 + a22 * i12, M22 = a21 * i12 + a22 * i22; const tx = mpx - (M11 * mrx + M12 * mry), ty = mpy - (M21 * mrx + M22 * mry);
    // C posture about the base (grounded) or the centre (floating)
    const grounded = !!b.ground || !G.float, ax = tx * k, ay = grounded ? ymx * k : ty * k;
    let P11 = 1, P12 = 0, P22 = 1;
    if (O.posture) { const sq = (O.squash * (G.calm || .5) + O.settle * (G.calm || .5) * (.5 + .5 * Math.sin(BEAT * Math.PI / 2 + s.sd % 7))) * (grounded ? 1 : .35), sw = 1 + O.swell * s.sw;
      P11 = (1 + sq * .8) * sw; P22 = (1 - sq) * sw; P12 = -O.lean * s.lean * (1 - sq) * sw; }
    // axis-aligned unless the shear is visible (a sheared drawImage costs ~2x on a CPU raster: the wobble's tiny shear is dropped, a real lean is kept)
    if (O.affine === false || Math.abs(M12) + Math.abs(M21) < O.shearMin) { M12 = 0; M21 = 0; } if (O.affine === false || Math.abs(P12) < O.shearMin * .5) P12 = 0;
    const L = k * G.r / iRd; M11 *= L; M12 *= L; M21 *= L; M22 *= L;
    const T11 = P11 * M11 + P12 * M21, T12 = P11 * M12 + P12 * M22, T21 = P22 * M21, T22 = P22 * M22;
    const ox = tx * k - ax, oy = ty * k - ay, ex = x + ax + P11 * ox + P12 * oy - (T11 + T12) * iH, ey = y + ay + P22 * oy - (T21 + T22) * iH;
    const a0 = g.globalAlpha, c0 = g.globalCompositeOperation;
    // 1 erase the world blob (its own ring at the live size, a hair larger) and its legs
    if (s.nb === FN) K.stats.unerased = (K.stats.unerased | 0) + 1; else if (O.erase > 0) { g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out'; const ke = k * (O.erase + O.erasepx / Math.max(4, r)); g.beginPath(); for (let i = 0; i < 10; i++) { const px = x + R[i * 4] * ke, py = y + R[i * 4 + 1] * ke; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath();   // a straight 10-gon a hair larger than the blob's smooth ring (cheaper than its curves)
    if (G.legs && b.ground && (lod < 2 || BODY_PLAN.low)) { const rr = G.r * k; for (const sx of [-1, 1]) { g.moveTo(x + sx * rr * .33, y + rr * .75); g.lineTo(x + sx * rr * .58, y + rr * .75); g.lineTo(x + sx * rr * .58, y + rr * 1.1); g.lineTo(x + sx * rr * .33, y + rr * 1.1); g.closePath(); } }
    g.fill(); K.stats.erased++; g.globalCompositeOperation = 'source-over'; }
    // 2 contact shadow (grounded: under the feet; floater: on the ground below, smaller + fainter with height)
    if (O.shadow && !(hasS && grounded)) { const sh = shadowSprite(); if (sh) { let rx = 0; for (let i = 0; i < 10; i++) rx = Math.max(rx, Math.abs(R[i * 4] - mpx)); rx *= k * P11;
      if (grounded) { const sy = y + ay + (legs ? G.r * k * .26 : 0); g.globalAlpha = O.shadowA * a0; g.drawImage(sh, x + ax - rx * 1.25, sy - rx * .28, rx * 2.5, rx * .56); K.stats.shadows++; }
      else { const gy = sim && sim.groundAt ? sim.groundAt(b.x) : sim && sim.bounds ? sim.bounds.ground : null; if (gy != null && isFinite(gy)) { const u = r / G.r, h = (gy - b.y) * u - ymx * k; if (h > 0 && h < r * 14) { const f = 1 / (1 + h / (r * 3)), sy = y + (gy - b.y) * u;
        g.globalAlpha = O.floatShadowA * f * a0; g.drawImage(sh, x + ax - rx * 1.2 * f, sy - rx * .24 * f, rx * 2.4 * f, rx * .48 * f); K.stats.shadows++; } } } } }
    // 2a walking legs (O2): live, behind the body, stepping while it moves; the belly depth from the live ring
    if (live) { let ym = 0; for (let i = 0; i < 10; i++) ym = Math.max(ym, R[i * 4 + 1] - mpy); g.globalAlpha = a0; drawWalkLegs(g, G, s, b, x + mpx * k, y + mpy * k, G.r * k, ym * k, C, rgba, dt || 1 / 60); K.stats.walkLegs = (K.stats.walkLegs | 0) + 1; }
    // 2b serpent segments (body plans): a rope behind the head, each a shaded segment sprite, tail first; near ohms only
    if (G.plan && G.plan.segments > 1 && (lod < 2 || BODY_PLAN.low)) { const seg = stepSegments(s, G, b, dt || 1 / 60); if (seg) { const [ldx, ldy] = lightDir(), SR = Math.max(8, Math.round(Rd * .8)), sk = `ohs:${o.id}:${SR}:${hb}:${ab}`;
      const simg = sprites.map.has(sk) ? sprites.get(sk, SR * 2, SR * 2, null) : ready(sk, SR * 2, paintSegment(C, rgba, ldx, ldy)) || (s.segImg && s.segImg.img); if (simg) { s.segImg = { img: simg }; const u = r / G.r * br;
        for (let i = seg.length - 1; i >= 0; i--) { const q = seg[i], qx = x + (q.x - b.x) * u, qy = y + (q.y - b.y) * u, qr = q.r * u; g.globalAlpha = a0; g.drawImage(simg, qx - qr * 1.09, qy - qr * 1.09, qr * 2.18, qr * 2.18); } K.stats.segs = (K.stats.segs | 0) + seg.length; } } }
    // 3 the body, 4 the face (same transform: the face squashes / leans with the body)
    g.globalAlpha = a0; g.setTransform(m.a * T11, m.a * T21, m.a * T12, m.a * T22, m.a * ex + m.e, m.a * ey + m.f); g.drawImage(img, 0, 0); K.stats.bodies++;
    if (O.face && lod < 3 && !hasF && FH * 2 >= O.faceMinPx) { const oq = openQ(s.open), gq = Math.round(s.gz / O.gazeStep);
      const gzb = Math.max(-1, Math.min(1, s.gz)), fk = `ohf:${o.id}${shp}:${Rd}:${hb}:${ab}:${oq}:${Math.max(-3, Math.min(3, gq))}`;
      let fimg = sprites.map.has(fk) ? sprites.get(fk, FH * 2, FH * 2, null) : null, fRd = Rd, fH = FH; const fp = () => facePaint(o, Rd, FH, C, ne, er, irisK, OPENS[oq], Math.max(-3, Math.min(3, gq)) * O.gazeStep);
      if (fimg) s.lastF = { img: fimg, Rd, FH }; else if (s.lastF) { if (settled || s.lastF.Rd === Rd) ready(fk, FH * 2, fp()); fimg = s.lastF.img; fRd = s.lastF.Rd; fH = s.lastF.FH; }   // a lid / gaze step not baked yet: the last face stays until it is
      else { fimg = sprites.get(fk, FH * 2, FH * 2, fp()); if (fimg) s.lastF = { img: fimg, Rd, FH }; }
      if (fimg) { const sc = iRd / fRd, fx = iH + gzb * iRd * .1 - fH * sc, fy = iH - iRd * .25 * Math.sqrt(G.aspect || 1) - fH * sc; if (sc === 1) g.drawImage(fimg, fx, fy); else g.drawImage(fimg, fx, fy, fH * 2 * sc, fH * 2 * sc); K.stats.faces++; } }
    if (O.tune !== false && tAge >= 0 && tAge < O.tuneLife) { const u = tAge / O.tuneLife, rise = cl(tAge / O.tuneRise), a = O.tuneA * rise * (1 - u) * (1 - u), sp = tuneSprite();
      if (sp && a > .004) { const sa = Math.sqrt(G.aspect || 1), rr = iRd * Math.min(sa, 1 / sa) * (1 - (G.lobeAmt || 0)) * (O.tuneR - .3 * u * u * (3 - 2 * u)), cy = iH + iRd * .08 * u;   // it shrinks and sinks a little: settling into the skin; inside the body's smallest radius and fading to 0 at its edge, so it never shows past the skin (no source-atop: a plain blit costs ~25% less)
        g.globalAlpha = a * a0; g.drawImage(sp, iH - rr, cy - rr, rr * 2, rr * 2); K.stats.tunes = (K.stats.tunes | 0) + 1; } }
    g.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); g.globalAlpha = a0; g.globalCompositeOperation = c0; s.dn = FN; return true; };
  // a tune taught (bus 'ohm.tune', wired in look/index.js): starts this ohm's glow on the next frame
  K.tune = o => { if (!o || O.tune === false) return false; const s = st(o); s.tuT = T; return true; };
  const tuneSprite = () => sprites.get(`ohtune:${O.tuneCol.join(',')}`, 64, 64, (x, w) => { const c = O.tuneCol, h = w / 2, gr = x.createRadialGradient(h, h * .92, 0, h, h, h);
    gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(.35, rgba(c, .78)); gr.addColorStop(.7, rgba(c, .3)); gr.addColorStop(1, rgba(c, 0)); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  // the face alone (rare ohms keep their rare body): drawn upright at (x, y) with body radius rb
  K.face = (g, o, x, y, rb, m) => { if (!K.on || !O.face || !m || !o.g) return false; const G = o.g, Rd = Math.round(rb * m.a); if (Rd < O.minRd || Rd > O.maxRd) return false;
    const s = st(o); if (s.lt !== T) { s.lt = T; update(o, s, Math.min(1.5, (o.glow || 0)), o.body && o.body.partner ? 1 : 0, 1 / 60); }
    const hb = Math.round(s.heal * 3); let C = s.C; if (!C) C = s.C = colsOf(o, s, hb, 0);
    const ne = (G.eyes | 0) + 1, er = Rd * (.1 + .075 * cl(((G.social || .6) - .3) / .7)), irisK = .48 + .3 * cl(((G.hear || .7) - .4) / .6), oq = openQ(s.open), gq = Math.max(-3, Math.min(3, Math.round(s.gz / O.gazeStep)));
    const FH = Math.ceil(Math.max(er * 2.25, Rd * .38) * (ne - 1) / 2 + er * 1.9) + 1, fk = `ohf:${o.id}r:${Rd}:${hb}:${aBk()}:${oq}:${gq}`, fp = () => facePaint(o, Rd, FH, C, ne, er, irisK, OPENS[oq], gq * O.gazeStep);
    if (s.frL === Rd) s.frN++; else { s.frL = Rd; s.frN = 0; } let fimg = sprites.map.has(fk) ? sprites.get(fk, FH * 2, FH * 2, null) : null, fH = FH, sc = 1;
    if (fimg) s.lastR = { img: fimg, Rd, FH }; else if (s.lastR) { if (s.frN >= O.settleN || s.lastR.Rd === Rd) ready(fk, FH * 2, fp()); fimg = s.lastR.img; fH = s.lastR.FH; sc = Rd / s.lastR.Rd; }
    else { fimg = sprites.get(fk, FH * 2, FH * 2, fp()); if (fimg) s.lastR = { img: fimg, Rd, FH }; }
    if (!fimg) return false; if (sc !== 1) { const a0 = g.globalAlpha; g.globalAlpha = 1; const W = fH * 2 * sc / m.a; g.drawImage(fimg, x + Math.max(-1, Math.min(1, s.gz)) * rb * .1 - W / 2, y - rb * .25 - W / 2, W, W); g.globalAlpha = a0; return true; } const a0 = g.globalAlpha; g.globalAlpha = 1; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fimg, Math.round(m.a * (x + Math.max(-1, Math.min(1, s.gz)) * rb * .1) + m.e) - FH, Math.round(m.a * (y - rb * .25) + m.f) - FH); g.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); g.globalAlpha = a0; return true; };
  K.state = o => S.get(o) || null;
  return K; }
