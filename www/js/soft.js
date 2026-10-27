// v0.0.30 NO OUTLINES (Wilbow 10:06 PM Oct 25: "no outlines anywhere in the project"; GAMEDEV_SPEC part 2, B table).
// World-side soft light in place of stroked rings, for when look/ (Visuals) has no hook for the site or returns false.
//   noLine(k[, world]): the master switch world.opts.noOutlines AND the site's own switch world.opts[k] (both default ON).
//     world: bound once by render.js (bindWorld), so systems' overlays (songs, herd, fuse, things, galaxy, dive) share the switches; no world = the old strokes.
//   softRing(g, x, y, r, w, hsl, a): a ring of light of radius r, half-width w, as a radial gradient (no hard edge anywhere).
//     hsl = 'H,S%,L%' (string), a = peak alpha. One gradient fill of the ring's bounding square.
//   softDot(g, x, y, r, hsl, a): a soft disc of light (peak at the centre, 0 at r).
//   ring(g, look, x, y, r, age, st, hsl, a, w): look.pulse(g, 'soft', ...) first, else softRing; true when either drew.
let WD = null; export const bindWorld = w => { WD = w || null; };
export const opt = k => !!(WD && WD.opts) && WD.opts[k] !== false;   // a bound-world switch (default ON once a world is bound)
export const noLine = (k, world = WD) => !!(world && world.opts) && world.opts.noOutlines !== false && world.opts[k] !== false;
export function softRing(g, x, y, r, w, hsl, a) { if (!(r > .5) || !(a > .003)) return; const R0 = Math.max(0, r - w), R1 = r + w;
  const gr = g.createRadialGradient(x, y, R0, x, y, R1); gr.addColorStop(0, `hsla(${hsl},0)`); gr.addColorStop(.5, `hsla(${hsl},${a.toFixed(3)})`); gr.addColorStop(1, `hsla(${hsl},0)`);
  const fs = g.fillStyle; g.fillStyle = gr; g.beginPath(); g.arc(x, y, R1, 0, 6.2832); if (R0 > 0) g.arc(x, y, R0, 6.2832, 0, true); g.fill('evenodd'); g.fillStyle = fs; }
export function softDot(g, x, y, r, hsl, a) { if (!(r > .3) || !(a > .003)) return; const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `hsla(${hsl},${a.toFixed(3)})`); gr.addColorStop(.45, `hsla(${hsl},${(a * .45).toFixed(3)})`); gr.addColorStop(1, `hsla(${hsl},0)`);
  const fs = g.fillStyle; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); g.fillStyle = fs; }
//   softPool(g, x, y, r, hsl, a): a soft pool of light drawn BEHIND what is already on g (destination-over), so it sits under the ohms (B7 / F6).
export function softPool(g, x, y, r, hsl, a) { const op = g.globalCompositeOperation; g.globalCompositeOperation = 'destination-over'; softDot(g, x, y, r, hsl, a); g.globalCompositeOperation = op; }
export function ring(g, look, x, y, r, age, st, hsl, a, w) { if (look && look.pulse && look.pulse(g, 'soft', x, y, r, age, st) === true) return true;
  softRing(g, x, y, r, w || Math.max(2, r * .12), hsl, a); return true; }
