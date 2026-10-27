// LOOK / pulse: ability rings as LIGHT, not strokes (Wilbow 10:06 PM: "without any outlines across the whole project").
// look.pulse(g, kind, x, y, r, age, st) -> true when drawn (the world keeps its stroked ring as the fallback when false).
//   kind 'echo': the echolocation click (abilities.js, every 2 bars): a soft WAVEFRONT, a thin radial band of light, brightest on its
//                leading edge and trailing off inward, fading with age (1.5 s) and dimmed over the land. Ohms it passes get a brief rim
//                catchlight on the side facing the click (st.hits [{x,y,r,k}] from Game Dev when given, else found from look.ohm's own
//                draws). Event-only: nothing runs between clicks.
//   kind 'soft' (any other ability ring): the same light, symmetric band, no catchlights.
// Cost: one pre-baked sprite blit per ring (two when it crosses the land line), baked once (6 band buckets x 2 kinds, 128 px).
// Opts (look opts.pulse): { on: true, echo: 'soft' | 'stroke' | 'off' } - Q405 asks Wilbow whether to keep the echo ring at all:
// 'off' hides it (returns true, draws nothing), 'stroke' hands it back to the world's stroked ring.
export const PULSE_OPTS = { on: true, echo: 'soft', soft: 'soft', life: 1.5, bandPx: 9, alpha: .34, land: .45, rgb: [214, 228, 246], catchA: .55, catchLife: .35, catchMax: 6 };
const BANDS = [.5, .32, .2, .13, .085, .055, .036];
export function createPulse({ opts = {}, makeCanvas } = {}) {
  const O = { ...PULSE_OPTS, ...(opts || {}) }, P = { opts: O, cache: new Map(), live: [], hitsAt: new Map(), stats: { drawn: 0, catches: 0, bakes: 0 } }, N = 128;
  const mk = makeCanvas || ((w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; });
  // the band profile along the radius u in [0,1] (u = 1 the wavefront): echo = soft outer edge (.025), bright front, long inner tail;
  // soft = symmetric. Radial gradient stops, so the band has no hard edge anywhere (no outline).
  const sprite = (kind, bi) => { const k = kind + bi; let c = P.cache.get(k); if (c) return c; c = mk(N * 2, N * 2); const x = c.getContext('2d'), w = BANDS[bi], [R, G, B] = O.rgb;
    const gr = x.createRadialGradient(N, N, 0, N, N, N), st = (u, a) => gr.addColorStop(Math.max(0, Math.min(1, u)), `rgba(${R},${G},${B},${a})`);
    if (kind === 'echo') { st(0, 0); st(1 - w, 0); st(1 - w * .55, .18); st(1 - w * .22, .55); st(1 - w * .06, 1); st(.985, .6); st(1, 0); }
    else { st(0, 0); st(1 - w, 0); st(1 - w * .5, .7); st(1 - w * .2, .7); st(1, 0); }
    x.fillStyle = gr; x.fillRect(0, 0, N * 2, N * 2); P.cache.set(k, c); P.stats.bakes++; return c; };
  const clk = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;   // own clock: the live fronts expire 0.2 s after their last draw
  const band = r => { const f = O.bandPx * 2.2 / Math.max(1, r); let bi = BANDS.length - 1; for (let i = 0; i < BANDS.length; i++) if (BANDS[i] <= f) { bi = i; break; } return bi; };
  // landY: screen y of the land line (look/index.js records it each frame), null = no land
  P.draw = (g, kind, x, y, r, age, st, landY) => { if (!O.on) return false; const mode = kind === 'echo' ? O.echo : O.soft; if (mode === 'off') return true; if (mode === 'stroke') return false;
    const life = st && typeof st.life === 'number' ? st.life : O.life; if (!(r > 1) || age < 0 || age >= life) return true;
    const s = st && typeof st.s === 'number' ? st.s : 1, fa = 1 - age / life, a = O.alpha * s * fa * fa * (kind === 'echo' ? 1 : .7); if (a < .004) return true;
    const im = sprite(kind === 'echo' ? 'echo' : 'soft', band(r)), go = g.globalCompositeOperation, ga = g.globalAlpha; g.globalCompositeOperation = 'lighter';
    if (landY != null && landY < y + r && landY > y - r) {   // crosses the land: full above, dimmed below (two clipped blits)
      g.save(); g.beginPath(); g.rect(x - r - 1, y - r - 1, 2 * r + 2, landY - (y - r - 1)); g.clip(); g.globalAlpha = Math.min(1, a); g.drawImage(im, x - r, y - r, 2 * r, 2 * r); g.restore();
      g.save(); g.beginPath(); g.rect(x - r - 1, landY, 2 * r + 2, y + r + 1 - landY); g.clip(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a * O.land); g.drawImage(im, x - r, y - r, 2 * r, 2 * r); g.restore(); }
    else { g.globalAlpha = Math.min(1, a * (landY != null && landY <= y - r ? O.land : 1)); g.drawImage(im, x - r, y - r, 2 * r, 2 * r); }
    g.globalCompositeOperation = go; g.globalAlpha = ga; P.stats.drawn++;
    if (kind === 'echo') { const t = clk(); let L = null; for (const q of P.live) if (Math.abs(q.x - x) < .5 && Math.abs(q.y - y) < .5) { L = q; break; }   // the live front (for the catchlights)
      if (!L) { if (P.live.length >= 8) P.live.shift(); P.live.push(L = { x, y, r, w: Math.max(4, r * BANDS[band(r)]), t, n: 0 }); } L.x = x; L.y = y; L.r = r; L.w = Math.max(4, r * BANDS[band(r)]); L.t = t; L.a = fa * s;
      if (st && Array.isArray(st.hits)) for (const h of st.hits) if (h && h.r > 0) P.rim(g, h.x, h.y, h.r, x, y, (h.k == null ? 1 : h.k) * fa * s); }
    return true; };
  // look.ohm calls this per drawn ohm; nothing unless a front is live this frame or last (cheap reject: one distance per live front)
  P.frame = () => { if (!P.live.length) return; const t = clk(); P.live = P.live.filter(q => t - q.t < .2); };
  P.ohm = (g, o, x, y, r) => { if (!P.live.length || !O.on || O.echo !== 'soft') return; for (const q of P.live) { const d = Math.hypot(x - q.x, y - q.y), e = Math.abs(d - q.r) - r; if (e > q.w) continue;
      P.rim(g, x, y, r, q.x, q.y, (1 - Math.max(0, e) / q.w) * q.a); } };
  // the rim catchlight: a soft lit crescent on the side facing the click (two 'lighter' blits of the same small sprite, no stroke)
  const dot = () => { let c = P.cache.get('dot'); if (c) return c; c = mk(64, 64); const x = c.getContext('2d'), [R, G, B] = O.rgb, gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${R},${G},${B},1)`); gr.addColorStop(.35, `rgba(${R},${G},${B},.45)`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); P.cache.set('dot', c); return c; };
  P.rim = (g, x, y, r, cx, cy, k) => { if (!(k > .02) || P.stats.catches >= (P.cap || 1e9)) return; const d = Math.hypot(cx - x, cy - y) || 1, ux = (cx - x) / d, uy = (cy - y) / d, im = dot(), go = g.globalCompositeOperation, ga = g.globalAlpha;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, O.catchA * k); const s = r * .75; g.drawImage(im, x + ux * r * .72 - s / 2, y + uy * r * .72 - s / 2, s, s);
    g.globalAlpha = Math.min(1, O.catchA * k * .5); const s2 = r * 1.2; g.drawImage(im, x + ux * r * .55 - s2 / 2, y + uy * r * .55 - s2 / 2, s2, s2); g.globalCompositeOperation = go; g.globalAlpha = ga; P.stats.catches++; };
  return P; }
