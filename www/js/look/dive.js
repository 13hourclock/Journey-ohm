// look/dive.js (#12, Visuals): the dive's look hooks. Wilbow: shaded, realistic, no outlines; colour only on the parts that SOUND.
// dive.js (world) calls look.diveBack(g, D, st) first each frame, then look.diveVoice / divePartial / diveWave per piece instead of its
// placeholders. Everything here is a baked sprite (ImageData once per bucket); per frame = drawImage only. No text, no rings.
//   diveBack    the ohm's inside: a dim shaded interior (soft subsurface falloff + slow cell texture), muted by the place's heal
//   diveVoice   a voice part = a shaded body (grey-tinted by the ohm), focus = a touch more key light; sounding = its colour as LIGHT
//   divePartial a partial = a small shaded bead sized by its amplitude; beating partials shimmer; sounding = pitch colour light
//   diveWave    a partial's wave = a soft lit band (wide faint pass + a thin core), grey at rest, pitch-coloured while it sounds
import { createNoise } from './noise.js';
export const DIVE_LOOK = { back: true, voice: true, partial: true, wave: true, sat: .14, glow: .9, res: .25, cell: 6,
  waveRest: 0 };   // v0.0.31 (sweep dive_031 'constant thin wavy strokes'): a lane's wave shows only while its partial sounds (pflash); waveRest = its strength at rest (0 = none; 1 = the v0.0.30 always-on lanes)
const cl = v => v < 0 ? 0 : v > 1 ? 1 : v, sm = x => { x = cl(x); return x * x * (3 - 2 * x); };
const hsl = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; };
export function createDiveLook({ makeCanvas, opts = {} } = {}) {
  const O = { ...DIVE_LOOK, ...opts }, mk = makeCanvas, N = createNoise(4242), C = new Map(), V = { D: null, trp: 1 };
  const cache = (k, f) => { let v = C.get(k); if (!v) { v = f(); C.set(k, v); if (C.size > 160) C.delete(C.keys().next().value); } return v; };
  const bake = (w, h, px) => { const cv = mk(w, h), x = cv.getContext('2d'), id = x.createImageData(w, h); px(id.data, w, h); x.putImageData(id, 0, 0); return cv; };
  // the interior: a disc (or a screen tile) of dim tissue, the ohm's hue at low saturation, a soft subsurface rim, slow cells
  const interior = (hb, hl, disc) => cache(`in${hb}:${hl}:${disc}`, () => { const n = disc ? 160 : 128, base = hsl(hb * 15, O.sat * (.5 + .5 * hl / 4), .16), deep = hsl(hb * 15 + 25, O.sat * .6, .05);
    return bake(n, n, (d, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const o = (j * w + i) * 4, u = i / w, v = j / h, X = u * 2 - 1, Y = v * 2 - 1, rr = X * X + Y * Y;
      const cell = N.ridged ? N.ridged(u * O.cell, v * O.cell, .3, 3) : .5, fb = N.fbm(u * 3, v * 3, 2, 3) * .5 + .5, sss = disc ? sm(1.05 - rr) : 1, lit = cl(.55 + .3 * (fb - .5) + .25 * (cell - .5) - .25 * (X + Y) * .5);
      const k = disc ? (.35 + .65 * sss) * lit : lit; d[o] = deep[0] + (base[0] - deep[0]) * k * 1.4; d[o + 1] = deep[1] + (base[1] - deep[1]) * k * 1.4; d[o + 2] = deep[2] + (base[2] - deep[2]) * k * 1.4; d[o + 3] = disc ? 255 * cl((1 - rr) / .06) : 255; } }); });
  // a shaded body: lit from the upper left, soft terminator, a faint wet spec; tint = muted ohm hue (no edge line: alpha falls off over 2 px)
  const body = (rb, hb, kind) => cache(`b${rb}:${hb}:${kind}`, () => { const n = rb * 2 + 4, c0 = n / 2, tint = hsl(hb * 15 + kind * 40, O.sat * 1.4, .42);
    return bake(n, n, (d) => { for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const X = (i + .5 - c0) / rb, Y = (j + .5 - c0) / rb, rr = X * X + Y * Y, o = (j * n + i) * 4; if (rr > 1.04) { d[o + 3] = 0; continue; }
      const Z = Math.sqrt(Math.max(0, 1 - rr)), ll = cl(-.5 * X - .55 * Y + .67 * Z), amb = .16 + .1 * Z, sp = Math.pow(cl(-.35 * X - .4 * Y + .85 * Z), 28) * .35, gr = 1 + .06 * N.n3(X * 4, Y * 4, kind);
      for (let c = 0; c < 3; c++) d[o + c] = Math.min(255, tint[c] * (amb + .95 * ll) * gr + 255 * sp); d[o + 3] = 255 * cl((1.04 - rr) / (2.2 / rb)); } }); });
  // light: a soft additive bloom (drawn 'lighter'), one per colour bucket
  const light = (hb) => cache(`l${hb}`, () => { const n = 64, c = hsl(hb * 15, .7, .55); return bake(n, n, (d) => { for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const X = (i + .5) / n * 2 - 1, Y = (j + .5) / n * 2 - 1, rr = X * X + Y * Y, o = (j * n + i) * 4, a = Math.exp(-rr * 4.5) * cl(1 - rr);
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255 * a; } }); });
  const rB = r => r < 6 ? Math.max(2, Math.round(r)) : r < 40 ? Math.round(r / 2) * 2 : Math.min(160, Math.round(r / 8) * 8);
  const trp = st => { const v = st && typeof st.trippy === 'number' ? st.trippy : 1; return v < 0 ? 0 : v > 1 ? 1 : v; };
  const pitchHue = f => (300 - 260 * cl(Math.log2(f / 55) / 7)) % 360;
  const L = { opts: O, stats: { draws: 0 } };
  L.diveBack = (g, D, st) => { V.D = D; V.trp = trp(st); if (!O.back || !D || !D.o) return false; const z = D.z, back = sm(z / .9); if (back <= .01) return true;
    const hue = D.o.hue || 0, hb = Math.round(hue / 15) % 24, heal = D.view ? D.view.heal : .6, hl = Math.round(cl(heal) * 4), lev = D.view ? D.view.lev : .3, W = D.W, H = D.H, R = D.r0 * Math.pow(4, z), ga = g.globalAlpha;
    g.imageSmoothingEnabled = true;
    // the surround: the ohm's deep shade over the whole screen at the fade (as the placeholder's fill): the world behind is swapped
    // around z 1.3 (it popped through around the disc, sweep 1:18 AM); the disc's own rim falls off into it, no edge
    if (O.surround !== false) { const d = hsl(hb * 15 + 25, O.sat * .6, .045); g.globalAlpha = ga * back; g.fillStyle = `rgb(${d[0] | 0},${d[1] | 0},${d[2] | 0})`; g.fillRect(0, 0, W, H); }
    { const cv = interior(hb, hl, 1); g.globalAlpha = ga * back; g.drawImage(cv, D.ox - R * 1.03, D.oy - R * 1.03, R * 2.06, R * 2.06); }   // one disc at every depth (no tile seams); the canvas clips a huge one
    if (lev > .05) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga * back * lev * .18 * (.5 + .5 * V.trp); const s = Math.min(W, H) * 1.3; g.drawImage(light(hb), W / 2 - s / 2, H * .42 - s / 2, s, s); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = ga; L.stats.draws++; return true; };
  const fade1 = z => sm((z - .25) / .6) * (1 - .75 * sm(z - 1.3)), fade2 = z => sm((z - 1.2) / .6) * (1 - sm((z - 2.3) / .6)), fade3 = z => sm((z - 2.2) / .6);
  const KIND = { body: 0, voice: 1, sample: 2 };
  L.diveVoice = O.voice ? (g, p, x, y, r, st) => { const D = V.D; if (!D || !D.o) return false; const a1 = fade1(D.z), foc = p.i === D.f[1], fl = (D.flash && D.flash[p.kind]) || 0, hue = D.o.hue || 0, kd = KIND[p.kind] != null ? KIND[p.kind] : 3, ga = g.globalAlpha;
    const rb = rB(r * (1 + .06 * fl)), sp = body(rb, Math.round(hue / 15) % 24, kd), s = r * (1 + .06 * fl) / rb; g.globalAlpha = ga * a1 * (foc ? 1 : .55); g.drawImage(sp, x - sp.width * s / 2, y - sp.height * s / 2, sp.width * s, sp.height * s);
    if (fl > .02) { const hh = (hue + (kd === 0 ? 0 : kd === 1 ? 60 : kd === 2 ? 200 : 120)) % 360, R2 = r * 2.4; g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga * a1 * fl * O.glow * (.45 + .55 * V.trp); g.drawImage(light(Math.round(hh / 15) % 24), x - R2, y - R2, R2 * 2, R2 * 2); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = ga; return true; } : null;
  L.divePartial = O.partial ? (g, q, x, y, r, st) => { const D = V.D; if (!D || !D.o) return false; const a2 = fade2(D.z), k = q.k | 0, foc = k === D.f[2], fl = (D.pflash && D.pflash[k]) || 0, t = (st && st.t) || 0, sh = q.beat ? .7 + .3 * Math.sin(t * 6.2832 * Math.min(12, q.beat)) : 1, ga = g.globalAlpha;
    const rr = r * (1 + .2 * fl), rb = rB(rr), sp = body(rb, Math.round((D.o.hue || 0) / 15) % 24, 5), s = rr / rb; g.globalAlpha = ga * a2 * (foc ? 1 : .6) * sh; g.drawImage(sp, x - sp.width * s / 2, y - sp.height * s / 2, sp.width * s, sp.height * s);
    if (fl > .02) { const R2 = rr * 3; g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga * a2 * fl * O.glow * (.45 + .55 * V.trp) * sh; g.drawImage(light(Math.round(pitchHue(q.f) / 15) % 24), x - R2, y - R2, R2 * 2, R2 * 2); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = ga; return true; } : null;
  L.diveWave = O.wave ? (g, q, y0, amp, st) => { const D = V.D; if (!D || !D.o) return false; const a3 = fade3(D.z), k = q.k | 0, foc = k === D.f[3], fl = (D.pflash && D.pflash[k]) || 0, t = (st && st.t) || 0, W = D.W, ga = g.globalAlpha;
    const wr = typeof O.waveRest === 'number' ? cl(O.waveRest) : 1, ev = wr + (1 - wr) * sm(fl / .2); if (ev < .004) return true;   // event-only: nothing at rest (the world's placeholder lane is not drawn either)
    const pt = D.parts[D.f[1]], fl0 = pt && pt.partials.length ? pt.partials[0].f : q.f, lam = W * .55 * fl0 / q.f * Math.pow(4, D.z - 3), sh = q.beat ? .7 + .3 * Math.sin(t * 6.2832 * Math.min(12, q.beat)) : 1, nP = Math.abs(y0 - D.H / 2) < Math.min(W, D.H) * .35 ? 96 : 32;
    const grey = 150 + 40 * (foc ? 1 : 0), hc = hsl(pitchHue(q.f), .55, .62), m = fl * (.45 + .55 * V.trp), col = [grey + (hc[0] - grey) * m, grey + (hc[1] - grey) * m, grey + (hc[2] - grey) * m].map(v => v | 0);
    g.beginPath(); for (let i = 0; i <= nP; i++) { const x = i / nP * W, v = Math.sin((x - D.ox) / Math.max(4, lam) * 6.2832 - t * (1 + k * .15)) * Math.cos(t * 2 + k) * (1 + .4 * fl); i ? g.lineTo(x, y0 + v * amp) : g.moveTo(x, y0 + v * amp); }
    g.strokeStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalAlpha = ga * a3 * ev * (foc ? .16 : .07) * sh; g.lineWidth = foc ? 9 : 5; g.stroke();   // the soft body of the band
    g.globalAlpha = ga * a3 * ev * (foc ? .85 : .35) * sh; g.lineWidth = foc ? 1.8 : 1; g.stroke();   // its lit core
    g.globalAlpha = ga; return true; } : null;
  return L; }
