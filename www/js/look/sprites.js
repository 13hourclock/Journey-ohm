// LOOK / sprites: a cache of pre-baked offscreen sprites (glow, shade, rim, bodies). Bake once per (kind, colour bucket,
// size bucket); draw with drawImage, which is the cheap path on Canvas 2D (no per-frame gradients, shadowBlur or filter).
// LRU with a byte cap (w*h*4 per sprite) and a per-frame bake budget so a burst of new colours never causes a hitch.
// Style-neutral: the gradient PROFILE is a parameter; nothing here decides how the game looks.
export const defaultMakeCanvas = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  throw new Error('look/sprites: no canvas factory (pass makeCanvas)');
};
// size buckets: half-octave steps (4, 6, 8, 11, 16, 23, 32, ... 256 px radius). A sprite is drawn scaled to the exact size.
export const sizeBucket = (px, step = .5) => { const s = Math.max(2, Math.min(8, Math.round(Math.log2(Math.max(4, px)) / step) * step)); return Math.round(Math.pow(2, s)); };
// colour bucket: 4 bits per channel (4096 colours); packs to one int for the key
export const rgbKey = (r, g, b) => ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
export const unKey = k => [((k >> 8) & 15) * 17, ((k >> 4) & 15) * 17, (k & 15) * 17];
// glow falloff stops (radius fraction, alpha): a soft gaussian-like profile; PARAMETER, not art
export const GLOW_PROFILE = [[0, 1], [.12, .78], [.28, .42], [.5, .16], [.75, .045], [1, 0]];
export function createSprites({ makeCanvas = defaultMakeCanvas, capBytes = 16 << 20, bakesPerFrame = 6 } = {}) {
  const S = { map: new Map(), bytes: 0, capBytes, bakesPerFrame, bakesLeft: bakesPerFrame, stats: { hits: 0, misses: 0, bakes: 0, evicted: 0, skipped: 0 } };
  S.make = makeCanvas;
  S.beginFrame = (budget = S.bakesPerFrame) => { S.bakesLeft = budget; if (S.limbo.length) { for (let i = 0; i < S.limbo.length; i++) give(S.limbo[i]); S.limbo.length = 0; } };
  // generic: get(key, w, h, paint(ctx, w, h)) -> canvas or null (null = over this frame's bake budget; caller uses its cheaper path)
  // ALLOCATION-FREE hit path (the GC stall on the phone was garbage, not draw time): a hit only stamps a use tick (no Map
  // delete + re-set per draw); eviction picks the oldest tick. Evicted canvases go to a small POOL by size and are reused (ctx.reset)
  // by the next bake of the same size, so a colour drift that re-bakes the same sprite sizes allocates no new canvases.
  S.tick = 0; S.limbo = []; S.pool = new Map(); S.poolBytes = 0; S.poolCap = 4 << 20; S.stats.reused = 0;
  const take = (w, h) => { const a = S.pool.get(w * 65536 + h); if (a && a.length) { const c = a.pop(); S.poolBytes -= w * h * 4; S.stats.reused++; const x = c.getContext('2d'); x.reset(); return c; } return makeCanvas(w, h); };
  const park = c => { if (S.limbo.length < 64) S.limbo.push(c); };   // a canvas evicted this frame may still be drawn this frame: pooled from the next beginFrame
  const give = c => { const b = c.width * c.height * 4; if (S.poolBytes + b > S.poolCap) return; const x = c.getContext && c.getContext('2d'); if (!x || typeof x.reset !== 'function') return;
    const k = c.width * 65536 + c.height; let a = S.pool.get(k); if (!a) S.pool.set(k, a = []); a.push(c); S.poolBytes += b; };
  const evict = () => { while (S.bytes > S.capBytes && S.map.size > 1) { let ok = null, ov = null, ou = Infinity;
      for (const [k, v] of S.map) if (v.u < ou) { ou = v.u; ok = k; ov = v; }
      S.map.delete(ok); S.bytes -= ov.b; S.stats.evicted++; park(ov.c); } };
  S.get = (key, w, h, paint, force = false) => {
    const hit = S.map.get(key);
    if (hit) { hit.u = ++S.tick; S.stats.hits++; return hit.c; }
    S.stats.misses++;
    if (!force && S.bakesLeft <= 0) { S.stats.skipped++; return null; }
    S.bakesLeft--; S.stats.bakes++;
    const c = take(w, h), x = c.getContext('2d'); paint(x, w, h);
    const e = { c, b: w * h * 4, u: ++S.tick }; S.map.set(key, e); S.bytes += e.b;
    if (S.bytes > S.capBytes) evict();
    return c;
  };
  S.clear = () => { S.map.clear(); S.bytes = 0; S.pool.clear(); S.poolBytes = 0; S.limbo.length = 0; };
  // a radial glow sprite in colour rgb (bucketed). Glow is smooth, so it is baked ONCE per colour at a small fixed size
  // (GLOW_BAKE px radius) and drawn scaled to any radius: ~50 keys of 16 KB instead of colour x size x core variants, and a
  // bake is ~0.1 ms instead of several ms. The white-hot core is a separate shared sprite (S.core) so it never multiplies keys.
  const GK = [];   // default-profile glow keys, built once per colour bucket (no per-draw string)
  S.glow = (r, g, b, px, core = 0, profile = GLOW_PROFILE) => {
    const R = S.glowBake, k = rgbKey(r, g, b), key = profile === GLOW_PROFILE ? (GK[k] || (GK[k] = `g:${k}:0`)) : `g:${k}:${profile.id || 1}`;
    return S.get(key, R * 2, R * 2, (x, w) => { const [cr, cg, cb] = unKey(k), gr = x.createRadialGradient(R, R, 0, R, R, R);
      for (const [f, a] of profile) gr.addColorStop(f, `rgba(${cr},${cg},${cb},${a})`);
      x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  };
  S.core = () => S.get('core', S.glowBake * 2, S.glowBake * 2, (x, w) => { const R = w / 2, gr = x.createRadialGradient(R, R, 0, R, R, R);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); }, true);
  S.corePaint = (x, w) => { const R = w / 2, gr = x.createRadialGradient(R, R, 0, R, R, R);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); };
  S.glowBake = 32;
  // (v0.0.19 PERF) the same default-profile glow painted at an exact device size (drawn 1:1: a scaled drawImage costs ~3.5x a 1:1
  // blit in Chromium/Skia); one painter per colour bucket, the key string built once per (colour, size)
  const GXP = [], GXK = new Map();
  S.glowExactPaint = k => GXP[k] || (GXP[k] = (x, w) => { const [cr, cg, cb] = unKey(k), R = w / 2, gr = x.createRadialGradient(R, R, 0, R, R, R);
    for (const [f, a] of GLOW_PROFILE) gr.addColorStop(f, `rgba(${cr},${cg},${cb},${a})`); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  S.glowExactKey = (k, Rd) => { const n = k * 4096 + Rd; let s = GXK.get(n); if (!s) { if (GXK.size > 4096) GXK.clear(); GXK.set(n, s = `gx:${k}:${Rd}`); } return s; };
  // draw helpers (caller sets composite once per batch: 'lighter' for glows)
  S.draw = (g, spr, x, y, rad, alpha = 1) => { if (!spr || alpha <= .004) return false; g.globalAlpha = alpha > 1 ? 1 : alpha; g.drawImage(spr, x - rad, y - rad, rad * 2, rad * 2); return true; };
  return S;
}
