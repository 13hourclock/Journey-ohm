// LOOK / blit: the 1:1 fast path for baked sprites (smart, not cheap). A canvas-2D drawImage that lands a bitmap on whole device
// pixels at its own size is ~10x cheaper on a CPU rasteriser than a scaled or sub-pixel one (headless Chromium: 450 px disc 0.05 ms
// vs 0.5 ms) and is a plain texture copy on a GPU. So a bake made at the drawn DEVICE size is drawn 1:1 here; anything else falls
// back to the normal scaled draw (zooming, swelling, the node stub context). Read-only; restores the transform it changes.
export const devOf = c => { const m = c && c.getTransform ? c.getTransform() : null; return m && !m.b && !m.c && m.a > 0 && m.d > 0 ? m : null; };
export const dprOf = c => { const m = devOf(c); return m ? m.a : 1; };
// plain-number copy of a device transform into a reused object (DOMMatrix getters box a new number per read): m2d(devOf(c), out)
export const m2d = (m, o) => { if (!m) return null; o.a = m.a; o.b = m.b; o.c = m.c; o.d = m.d; o.e = m.e; o.f = m.f; return o; };
// draw img into the CSS rect (x, y, w, h); m = devOf(c) (pass it in to save the call)
export function blit(c, img, x, y, w, h, m = devOf(c)) {
  if (m && Math.abs(img.width - w * m.a) <= 1.01 && Math.abs(img.height - h * m.d) <= 1.01) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(img, Math.round(m.a * x + m.e), Math.round(m.d * y + m.f)); c.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); return 1; }
  c.drawImage(img, x, y, w, h); return 0; }
