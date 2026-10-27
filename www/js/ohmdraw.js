// OHM DRAWING (track/ohms): every ohm, from the shared state only. Soft ring -> smooth closed curve; lean, squash and wobble come
// from the physics, glow from sound. Detail follows the quality ladder (sim.lod): 0 full, 1 no halos except the focus ohm,
// 2+ crowd ohms as flat discs. No allocation per ohm beyond Canvas gradients for the halo / focus body.
import { toScreen } from './space.js';
import { RING } from './genes.js';
import { opt } from './soft.js';   // v0.0.30 B10-B12 switches (world.opts haloMute / lookOhmBody / lookLegs)
const P = {}, X = new Float32Array(RING), Y = new Float32Array(RING);
// v0.0.30 GAMEDEV_SPEC part 2: B11 haloMute - the halo at 45% saturation (off = 90%: too much colour, Wilbow 10:06 PM); B12 look.ohmBody(g, o, s, r, br)
// paints the body when Visuals add it (the plain fill is skipped; eyes / legs still drawn here); B10 look.legs(g, o, s, r) paints the legs (off / absent = the stroke legs; rare ohms always keep the stroke legs).
export function drawOhms(g, sim, W, H, look) {
  const lod = sim.lod, f = sim.ohm, hs = opt('haloMute') ? 45 : 90, lb = look && look.ohmBody && opt('lookOhmBody'), ll = look && look.legs && opt('lookLegs');
  // things (placeholder look until the world track draws them: sim.thingsDrawn) - a drum = a short barrel with a skin that flashes
  if (!sim.thingsDrawn) for (const t of sim.things) { const s = toScreen(W, H, sim.cam, t.x, t.y, P), r = t.r * s.s, k = t.hit || 0;
    g.fillStyle = `hsla(30,35%,${22 + k * 25}%,1)`; g.fillRect(s.x - r, s.y - r * .55, r * 2, r * 1.3);
    g.beginPath(); g.ellipse(s.x, s.y - r * .55, r, r * .32 * (1 - k * .3), 0, 0, 7); g.fillStyle = `hsla(40,40%,${55 + k * 35}%,1)`; g.fill(); }
  for (const o of sim.ohms) { if (o.parked) continue; const b = o.body, s = toScreen(W, H, sim.cam, b.x, b.y, P), u = s.s, gl = o.glow + Math.min(1, o.look.glow || 0) * .6;
    const br = sim.breath(o) * (1 - .22 * b.pin + .25 * b.pout + .12 * Math.min(1, b.throb)) * (1 + gl * .04), r = o.g.r * u * br, focus = o === f;
    if (s.x < -r * 3 || s.x > W + r * 3 || s.y < -r * 3 || s.y > H + r * 3) continue;
    if (lod < 1 || focus) { const hr = r * (2 + gl), halo = g.createRadialGradient(s.x, s.y, r * .3, s.x, s.y, hr); halo.addColorStop(0, `hsla(${o.hue},${hs}%,65%,${(focus ? .25 : .12) + gl * .3})`); halo.addColorStop(1, 'hsla(0,0%,0%,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(s.x, s.y, hr, 0, 7); g.fill(); }
    if (lod >= 2 && !focus) { g.fillStyle = `hsl(${o.hue},60%,${42 + gl * 25}%)`; g.beginPath(); g.arc(s.x, s.y, r, 0, 7); g.fill(); continue; }
    if (lb && look.ohmBody(g, o, s, r, br) === true) { /* Visuals' body */ } else {
    const R = b.ring, k = u * br; for (let i = 0; i < RING; i++) { X[i] = s.x + R[i * 4] * k; Y[i] = s.y + R[i * 4 + 1] * k; }
    g.beginPath(); g.moveTo((X[RING - 1] + X[0]) / 2, (Y[RING - 1] + Y[0]) / 2);
    for (let i = 0; i < RING; i++) { const j = (i + 1) % RING; g.quadraticCurveTo(X[i], Y[i], (X[i] + X[j]) / 2, (Y[i] + Y[j]) / 2); }
    if (focus || lod < 1) { const bg = g.createRadialGradient(s.x - r * .3, s.y - r * .35, r * .1, s.x, s.y, r * 1.1); bg.addColorStop(0, `hsla(${o.hue},70%,${78 + gl * 15}%,1)`); bg.addColorStop(.7, `hsla(${o.hue},65%,${45 + gl * 20}%,1)`); bg.addColorStop(1, `hsla(${o.hue},70%,30%,.9)`); g.fillStyle = bg; }
    else g.fillStyle = `hsl(${o.hue},62%,${45 + gl * 22}%)`;
    g.fill(); }
    if (lod < 2) { // eyes (appendages from genes): look toward the partner, or the way it moves
      const p = b.partner, w = o.watch, lx = p ? Math.sign(p.body.x - b.x) : w ? Math.sign(w.x - b.x) : Math.sign(b.vx), er = r * .13;   // a bystander looks at the jam it watches (bystand.js)
      g.fillStyle = 'rgba(10,8,20,.85)'; for (let e = 0; e < o.g.eyes + 1; e++) { const ex = s.x + (e - o.g.eyes / 2) * r * .38 + lx * r * .12, ey = s.y - r * .25; g.beginPath(); g.arc(ex, ey, er, 0, 7); g.fill(); }
      if (o.g.legs && b.ground && !(ll && (!o.rarity || opt('lnRareLegs') && opt('noOutlines')) && look.legs(g, o, s, r) === true)) { g.strokeStyle = `hsla(${o.hue},50%,30%,.9)`; g.lineWidth = Math.max(1, r * .1); g.beginPath(); g.moveTo(s.x - r * .4, s.y + r * .8); g.lineTo(s.x - r * .5, s.y + r * 1.02); g.moveTo(s.x + r * .4, s.y + r * .8); g.lineTo(s.x + r * .5, s.y + r * 1.02); g.stroke(); } } }
}
