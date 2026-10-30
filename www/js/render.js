// RENDER: reads the shared world state (body offset / size / motion, glow incl. the sound's own level) + music state (+ the output scope); never touches the sim's logic or the audio engine.
// World track: the world is drawn as layers from world.js through ONE camera (sim.cam, depth in view.js). Every layer uses the same
// drawing block (field + kaleidoscope pattern + terrain ridgelines) at whatever scale the camera puts it, so the zoom is the same at
// every depth: layer floor(z) fills the screen, layer floor(z)+1 opens inside a growing circle around the home anchor and fades in.
// The home layer's front ridgeline IS the physical ground (sim.groundAt, world.js). The ohms come from ohmdraw.js (ohms track).
// LOOK (13A+B+D): realistic light / depth / material and trippy sound-reactive colour + pattern, mixed by world.look.trip (context)
// and world.look.burst (big musical events). The look/ hook (Visuals track) can recolour / add to / replace parts: NOTES_DEV.md.
// Cost: only runs inside rAF (nothing when the screen does not draw). Detail follows the shared quality ladder sim.lod 0..3
// (quality.js): resolution, ridgeline count, pattern detail. No shadowBlur / filters / getImageData.
import { layout, cam, ZK, anchor, ohmVisible } from './view.js';
import { drawOhms } from './ohmdraw.js';
import { BODY_PLAN } from './bodyplan.js';
import { toScreen } from './space.js';
import { createLook } from './look/index.js';
import { noLine, softRing, softDot, bindWorld } from './soft.js';   // v0.0.30 no outlines (GAMEDEV_SPEC part 2 B table)
const QL = [{ dpr: 1.5, rings: 3, ridges: 12, pts: 9, n: 56 }, { dpr: 1.25, rings: 2, ridges: 8, pts: 7, n: 44 }, { dpr: 1, rings: 2, ridges: 5, pts: 5, n: 32 }, { dpr: .75, rings: 1, ridges: 3, pts: 4, n: 24 }];
const QZ = QL.map((q, i) => ({ ...QL[Math.min(3, i + 1)], ridges: q.ridges, rings: q.rings }));   // v0.0.29 zoom fix: zooming = one step lighter except the ridge / ring counts
// v0.0.30 D: an ohm's posture for look.ohm (st.post) from what the sim alone knows; main.js sets R.postOf with the systems' jams / songs / bystanders
export const postOf = o => !o ? undefined : o.parked || o.awake === false ? 'sleep' : (o.glow || 0) > .4 ? 'sing' : o.body && Math.abs(o.body.vx || 0) > .25 ? 'walk' : undefined;
export function createRender(canvas, sim, music, readScope, world, bus) {
  const g = canvas.getContext('2d'); let W = 0, H = 0, dpr = 1, qd = -1;
  const R = { size: () => ({ W, H }), get q() { return Math.max(0, Math.min(3, sim.lod | 0)); } };
  const resize = () => { qd = R.q; dpr = Math.min(QL[qd].dpr, globalThis.devicePixelRatio || 1); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); sim.setView && sim.setView(W, H); world && world.setView(W, H); };
  addEventListener('resize', resize); resize();
  const LC = { sim, music, world, bus, opts: { p1: true } }; let look = {}; try { look = createLook(LC) || {}; } catch (e) { console.warn('look hook failed, default look', e); }
  R.look = look; bindWorld(world);   // v0.0.30: the no-outline switches (soft.js) read this world's opts
  const st = { t: 0, W: 0, H: 0, dpr: 1, q: 0, trip: .25, real: .75, burst: 0, big: 0, pulse: 0, barPhase: 0, level: 0, depth: 0, zoom: 0, cam: sim.cam, A: null };
  let tripL = .25;   // v0.0.30 tripDirect: world.look.trip x the trippy gate (world.tripK), for the palette and the burst bloom
  R.st = st;   // the per-frame state look/ gets: main.js adds st.trippy (trippy.js) and st.audio (audiosig.js); render keeps writing its own fields
  const pal = { hue: 0, spread: 0, sat: 50, light: 1 };
  // the world layers are drawn into a lower-resolution canvas and scaled up (soft light / terrain do not need full resolution;
  // software raster cost scales with pixels). BGS = its scale vs CSS px per quality rung (PROPOSAL).
  // It is its own canvas layer behind the ohms (the browser composites + scales it), redrawn every 2nd frame while the camera is still.
  const BGS = [.6, .5, .45, .4], bgc = document.createElement('canvas'), bg2 = bgc.getContext('2d', { alpha: false }); let c = bg2, bs = 1, fr = 0;
  bgc.id = 'bg'; bgc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none'; canvas.parentNode && canvas.parentNode.insertBefore(bgc, canvas);
  const bgSize = () => { bs = Math.min(dpr, BGS[qd]); const w = Math.max(1, Math.round(W * bs)), h = Math.max(1, Math.round(H * bs)); if (bgc.width !== w || bgc.height !== h) { bgc.width = w; bgc.height = h; } };
  // ---- the one layer block ----
    // terrain: ridgelines back to front. Realistic: aerial perspective (far ridges fade into the sky colour), lit from above.
    // Trippy: saturated rainbow edges that run with time and the notes. The front ridge = the physical ground (world.FRONT).
  const sstep = x => (x = x < 0 ? 0 : x > 1 ? 1 : x, x * x * (3 - 2 * x));
  const RB = new Float32Array(4096), WB = new Float32Array(2048), FY = new Float32Array(2048), FYs = new Float32Array(2048), RGX = .12, RGX2 = .3,   /* v0.0.29 groundFadeWide: the real land fades over bend 0 .. .3 (z 0 .. -.38, ~14 frames of a pinch; sqrt(bend) = about even per zoom step) instead of 0 .. .12 (it went in ~3 frames, f50-52) */ rgQ = []; let rgQn = 0, skK = 1, faK = 1;   // RGX: planet bend over which the real ground fades out (v0.0.29); skK / faK: this frame's sky / far-range share of the zoom (skyHold, R.draw)
  // 1a: the planet's materials on the side view (globe.js lanes): MC = per-sample colour (rgb 0..1 x3), CS/CR = cave surface / roof
  // underside per front sample (NaN = open sky). Colours are the globe palette (rock soil veg sand ice), wet darkens.
  const FY2 = j => FY[j], skyc = [0, 0, 0], MC = new Float32Array(3072), CS = new Float32Array(1024), CR = new Float32Array(1024), mc = [0, 0, 0], h2r = [0, 0, 0];
  const matRGB = (G, m, i, out) => { const P = G.palette, k = 1 / 255; let r = 0, g = 0, b = 0;
    for (let q = 0; q < 4; q++) { const w = m[i + q] * k; r += P[q][0] * w; g += P[q][1] * w; b += P[q][2] * w; }
    const ice = m[i + 5] * k, wet = m[i + 4] * k, sw = 1 - ice - wet; r = r / Math.max(.05, sw); g = g / Math.max(.05, sw); b = b / Math.max(.05, sw);
    const ia = Math.min(1, ice * 1.6); r += (P[4][0] - r) * ia; g += (P[4][1] - g) * ia; b += (P[4][2] - b) * ia; const dk = 1 - .4 * wet; out[0] = r * dk; out[1] = g * dk; out[2] = b * dk; return out; };
  const hsl2 = (h, s, l, out) => { h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    out[0] = f(h + 1 / 3); out[1] = f(h); out[2] = f(h - 1 / 3); return out; };
  const css = (r, g, b, a) => `rgba(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0},${a})`;
  // v0.0.12 LANDMARKS (terrain.js): spires, crystals, geysers, arches on the home front ridge, lit on each bar so they draw you on;
  // off screen but near (< 1.2 widths) a small glint at the screen edge points the way. One short path each.
  // v0.0.14 CRACKS (shape.js 'terrain.crack'): drawn into the home front ridge from its own y buffer; they glow when they ring
  // (Visuals hook: world.shape.cracks() has the same lines + ring times)
  const cracks = (L, A, sc, off, N, t) => { const C = L.shp.C, wa = world.walk, pal = world.place.pal, hue = pal ? pal.ground[0] : L.hue, lnC = noLine('lnCracks'); if (lnC) c.lineJoin = 'round';
    for (const k of L.shp.cracks) { let u = k.u - wa - off; u -= C * Math.round((u - .5) / C); const x0 = A.x + (u - .5) * W * sc; if (x0 < -W * .2 || x0 > W * 1.2) continue;
      const j = Math.max(0, Math.min(N, Math.round(x0 / W * N))), ys = FY[j], span = Math.max(8, (H - ys) * .9), g = t >= k.ring ? Math.exp(-(t - k.ring) * 1.2) : 0;
      c.beginPath(); for (const p of k.pts) { c.moveTo(x0 + p[0] * W * sc, ys + p[1] * span); for (let q = 2; q < p.length; q += 2) c.lineTo(x0 + p[q] * W * sc, ys + p[q + 1] * span); }
      if (lnC) { const w0 = 1 + 2 * k.life * k.len, am = 1 + .6 * k.life; for (let q = 0; q < 3; q++) { c.strokeStyle = `hsla(${hue},25%,10%,${[.07, .1, .14][q] * am})`; c.lineWidth = [3.4, 2, 1][q] * w0; c.stroke(); }   /* v0.0.30 G5 lnCracks: 3 soft passes, peak alpha <= .5 (as look's dustSplit cracks) */
        if (g > .02) for (let q = 0; q < 2; q++) { c.strokeStyle = `hsla(${(hue + 40) % 360},45%,72%,${[.25, .5][q] * g})`; c.lineWidth = [4, 2][q] * (1 + 2.5 * g); c.stroke(); } continue; }
      c.strokeStyle = `hsla(${hue},30%,3%,${.55 + .4 * k.life})`; c.lineWidth = 1 + 2 * k.life * k.len; c.stroke();
      if (g > .02) { c.strokeStyle = `hsla(${(hue + 40) % 360},90%,72%,${g * .8})`; c.lineWidth = 1 + 2.5 * g; c.stroke(); } } c.lineJoin = 'miter'; };
  const marks = (L, T, A, sc, base, amp, off, gy) => { const C = T.C, wa = world.walk, t = st.t, bp = st.barPhase || 0, lit = .45 + .55 * Math.exp(-bp * 5), pal = world.place.pal;
    for (const R of T.regions) { const m = R.lm; if (!m) continue; let u = m.u - wa - off; u -= C * Math.round((u - .5) / C); const x = A.x + (u - .5) * W * sc;
      const hue = pal ? (pal.ground[0] + 180) % 360 : (L.hue + 180) % 360;
      if (x < -60 || x > W + 60) { const dd = x < 0 ? -x : x - W; if (dd > W * 1.2) continue; const ex = x < 0 ? 7 : W - 7, ey = Math.min(base - world.height(L, (ex - A.x) / (W * sc) + .5 + off, t) * amp, gy) - 14;
        c.beginPath(); c.arc(ex, ey, 2.5 + 2 * lit, 0, 6.283); c.fillStyle = `hsla(${hue},90%,75%,${(.25 + .5 * lit) * (1 - dd / (W * 1.2))})`; c.fill(); continue; }
      const y = Math.min(base - world.height(L, u + off, t) * amp, L.shp && L.shp.anyCut ? gy + world.floorCut(u + off) * H * sc : gy), s = m.size * H * sc * .1; c.beginPath();
      if (m.type === 'spire') { c.moveTo(x - s * .22, y + 2); c.lineTo(x - s * .05, y - s * 1.9); c.lineTo(x + s * .08, y - s * 2.3); c.lineTo(x + s * .25, y + 2); }
      else if (m.type === 'crystal') { for (const [dx, k] of [[-.35, .7], [0, 1.2], [.3, .85]]) { const cx = x + dx * s, hh = s * k; c.moveTo(cx, y - hh * 1.4); c.lineTo(cx + s * .16, y - hh * .5); c.lineTo(cx, y + 1); c.lineTo(cx - s * .16, y - hh * .5); c.closePath(); } }
      else if (m.type === 'geyser') { c.moveTo(x - s * .3, y + 2); c.lineTo(x - s * .1, y - s * .25); c.lineTo(x + s * .1, y - s * .25); c.lineTo(x + s * .3, y + 2); c.closePath();
        const jet = s * (.6 + 2.2 * Math.exp(-bp * 3)); for (let k = 0; k < 5; k++) { const ph = (t * .9 + k / 5) % 1, yy = y - s * .25 - ph * jet; c.moveTo(x + s * .14 * (1 - ph), yy); c.arc(x + Math.sin(k * 2.1 + t) * s * .1 * ph, yy, s * (.09 + .1 * ph), 0, 6.283); } }
      else { c.moveTo(x - s, y + 2); c.bezierCurveTo(x - s, y - s * 1.9, x + s, y - s * 1.9, x + s, y + 2); c.lineTo(x + s * .7, y + 2); c.bezierCurveTo(x + s * .7, y - s * 1.35, x - s * .7, y - s * 1.35, x - s * .7, y + 2); c.closePath(); }
      c.fillStyle = `hsla(${hue},${45 + 35 * lit}%,${30 + 35 * lit}%,.92)`; c.fill();
      if (m.type !== 'geyser') { c.fillStyle = `hsla(${hue},90%,80%,${.05 + .1 * lit})`; c.fillRect(x - 1.5, 0, 3, y - s * 2); } } };
  // 1a front ground details (home, flat view): caves (a dark hollow under a rock roof, glowing if the cave glows), the surface band
  // in the land's material colours (grass, sand, snow, rock, mud) along the top, and a rare-life spot's shimmer when you are near one.
  const groundTop = (L, G, A, sc, N, base, amp, off, gm, anyCave, t, f) => { const { pulse } = st, bt = Math.max(2, H * .009 * sc);
    if (anyCave) { const P0 = G.palette[0];
      for (let j0 = 0; j0 <= N; j0++) { if (!(CS[j0] === CS[j0])) continue; let j1 = j0; while (j1 < N && CS[j1 + 1] === CS[j1 + 1]) j1++;
        const k = world.cave || null, xa = j => j / N * W;
        c.beginPath(); for (let j = j0; j <= j1; j++) c.lineTo(xa(j), CR[j]); for (let j = j1; j >= j0; j--) c.lineTo(xa(j), FY2(j)); c.closePath();
        c.fillStyle = 'rgba(4,4,8,.92)'; c.fill();
        c.beginPath(); for (let j = j0; j <= j1; j++) c.lineTo(xa(j), CS[j]); for (let j = j1; j >= j0; j--) c.lineTo(xa(j), CR[j]); c.closePath();
        c.fillStyle = css(P0[0] * .38, P0[1] * .38, P0[2] * .38, .97); c.fill(); if (!noLine('lnRidge')) { c.strokeStyle = css(P0[0] * .7, P0[1] * .7, P0[2] * .7, .7); c.lineWidth = 1; c.stroke(); }   // v0.0.30 B2 lnRidge: no cave-roof rim line
        j0 = j1; } }
    if (gm > .02 && noLine('lnBand')) { const step = 2, a0 = .9 * gm * .7, h = bt * 1.4;   /* v0.0.30 G4 lnBand: the material band as a filled strip fading down (no stroked line) */
      for (let j = 0; j < N; j += step) { const j2 = Math.min(N, j + step), q = 3 * j, ya = CS[j] === CS[j] ? CS[j] : FY2(j), yb = CS[j2] === CS[j2] ? CS[j2] : FY2(j2), x0 = j / N * W, x1 = j2 / N * W, y0 = Math.min(ya, yb);
        const r0 = MC[q] * (.85 + .25 * pulse), g0 = MC[q + 1] * (.85 + .25 * pulse), b0 = MC[q + 2] * (.85 + .25 * pulse), gr = c.createLinearGradient(0, y0, 0, y0 + h);
        gr.addColorStop(0, css(r0, g0, b0, a0)); gr.addColorStop(.45, css(r0, g0, b0, a0 * .6)); gr.addColorStop(1, css(r0, g0, b0, 0));
        c.fillStyle = gr; c.beginPath(); c.moveTo(x0, ya); c.lineTo(x1 + .5, yb); c.lineTo(x1 + .5, yb + h); c.lineTo(x0, ya + h); c.closePath(); c.fill(); } }
    else if (gm > .02) { c.lineWidth = bt; c.lineCap = 'round'; const step = 2;
      for (let j = 0; j < N; j += step) { const j2 = Math.min(N, j + step), q = 3 * j, ya = CS[j] === CS[j] ? CS[j] : FY2(j), yb = CS[j2] === CS[j2] ? CS[j2] : FY2(j2);
        c.strokeStyle = css(MC[q] * (.85 + .25 * pulse), MC[q + 1] * (.85 + .25 * pulse), MC[q + 2] * (.85 + .25 * pulse), .9 * gm); c.beginPath(); c.moveTo(j / N * W, ya + bt * .5); c.lineTo(j2 / N * W, yb + bt * .5); c.stroke(); }
      c.lineCap = 'butt'; }
    const E = world.env, s = E && E.lifeNear; if (s) { let u = s.u - off - world.walk; const C = G.Cs; u = ((u - .5) % C + C * 1.5) % C - C / 2 + .5; const x = A.x + (u - .5) * W * sc;
      if (x > -40 && x < W + 40) { const y = base - world.height(L, u + off, t) * amp, r = (14 + 8 * Math.sin(t * 2.1)) * sc, gr = c.createRadialGradient(x, y - r * .6, 0, x, y - r * .6, r * 2);
        gr.addColorStop(0, `hsla(${(s.seed % 360)},90%,80%,${.35 + .2 * pulse})`); gr.addColorStop(1, `hsla(${(s.seed % 360)},90%,60%,0)`); c.fillStyle = gr; c.fillRect(x - r * 2, y - r * 2.6, r * 4, r * 4); } } };
  // REAL GROUND (Visuals 0e619ab, look.ground mode A): the home front strip handed to the look as world-fixed chunks of the 1a ground
  // data (height, materials, river, moisture, water) so its baked, lit height-field tiles slide with the walk and only rebake when
  // the land (or the screen placement) really changes. Returns false (= the world's own ridge draw runs) on a bent planet, a solid
  // cut, a cave on screen (caves look as they did) or when the look has no tile path. Toggle: world.opts.realGround (default on).
  let rgLast = false, rgNow = false; const GCH = .5, GN0 = 33, GOV = 3, GTOL = 2.5, GWET = 2, GRATE = 1.5, GN = GN0 + 2 * GOV, gch = new Map(), GL0 = { i: 0, depth: 0, scale: 1, haze: 0 };
  const GLS = [GL0], gchs = [gch];   // ridge slices behind the front strip: look slice L.i = ri (1..4), hazed with distance; one chunk map each
  const realGround = (L, G, A, sc, base, amp, off, gy, t, N, ri = 0, f = 1) => { const wk = world.walk, Wp = W * sc, u0 = -A.x / Wp + .5 + off + wk, u1 = (W - A.x) / Wp + .5 + off + wk, c0 = Math.floor(u0 / GCH), c1 = Math.floor(u1 / GCH), foot = ri === 0, hmin = foot ? (base - gy) / amp : -9, ld = foot ? 0 : world.laneD(f), gch = gchs[ri] || (gchs[ri] = new Map()), SL = GLS[ri] || (GLS[ri] = { i: ri, depth: 0, scale: 1, haze: 0 });
    if (!foot) { SL.depth = 1 - f; SL.haze = Math.min(1, (1 - f) * .8); }
    if (c1 - c0 > 6) return false; const E = world.env, sn = E && typeof E.snowLine === 'number' ? E.snowLine : undefined, used = [];
    for (let ci = c0; ci <= c1; ci++) { let P = gch.get(ci); if (!P) { P = { chunk: ci, ver: 0, n: GN, h: new Float32Array(GN), m0: new Float32Array(GN * 4), m1: new Float32Array(GN * 4), m2: new Float32Array(GN * 3), river: new Float32Array(GN), water: new Float32Array(GN), x0: 0, dx: 0, y0: 0, amp: 0, yBot: H }; gch.set(ci, P); if (gch.size > 12) gch.delete(gch.keys().next().value); }
      let ck = Math.round(base) * 7 + Math.round(amp) * 13 + Math.round(Wp * 4) * 17 + (L.seed || 0);
      for (let i = 0; i < GN; i++) { const ux = (ci + (i - GOV) / (GN0 - 1)) * GCH, y = foot ? world.height(L, ux - wk, t) : world.heightBack(L, ux - wk, t, f); if (foot && world.cave) return false; const hr = world.hRaw;
        const hh = Math.max(hmin, hr), lo = G.lane(ld, ux), m = lo.m, q = lo.i; P.h[i] = hh; P.water[i] = (y - hh) * amp > GWET ? y : NaN;   // only water that shows above the ground (> GWET px): puddles at the floor line flickered in and out and rebaked tiles
        P.river[i] = lo.river || 0;
        P.m0[4 * i] = m[q] / 255; P.m0[4 * i + 1] = m[q + 1] / 255; P.m0[4 * i + 2] = m[q + 2] / 255; P.m0[4 * i + 3] = m[q + 3] / 255; P.m1[4 * i] = m[q + 4] / 255; P.m1[4 * i + 1] = m[q + 5] / 255; P.m1[4 * i + 2] = 0; P.m1[4 * i + 3] = 0;
        P.m2[3 * i] = .55; P.m2[3 * i + 1] = lo.moist || .5; P.m2[3 * i + 2] = 0; ck = (ck * 31 + (P.water[i] === P.water[i] ? 7 : 0)) | 0; }
      for (let i = 0; i < GN; i++) P.m2[3 * i + 2] = Math.min(1, Math.abs(P.h[Math.min(GN - 1, i + 1)] - P.h[Math.max(0, i - 1)]) * amp / (2 * Wp * GCH / (GN0 - 1)));
      let dh = 0; if (P.hb) for (let i = 0; i < GN; i++) dh = Math.max(dh, Math.abs(P.h[i] - P.hb[i])); else P.hb = new Float32Array(GN);
      if (ck !== P.ck || (!(dh * amp < GTOL) && !(t - (P.tb || -9) < GRATE))) { P.ck = ck; P.tb = t; P.hb.set(P.h); P.ver = (P.ver + 1) | 0; }   // rebake only for a real change: placement, water, or the land moved > GTOL px (dents from landings, shaping, seasons) and at most every GRATE s per chunk   // the land or its placement changed: a new tile bakes in idle (the last one shows meanwhile)
      P.cx = A.x + (ci * GCH - off - wk - .5) * Wp; P.x0 = P.cx - GOV * Wp * GCH / (GN0 - 1); P.dx = Wp * GCH / (GN0 - 1); P.worldX = (ci * GCH * Wp - GOV * P.dx) - P.x0; P.seed = (L.seed >>> 0) + ri * 7919; P.y0 = base; P.amp = amp; P.yBot = H; if (sn !== undefined) P.snowLine = sn; used.push(P); }
    let ok = true; for (const P of used) { c.save(); c.beginPath(); c.rect(Math.floor(P.cx), 0, Math.ceil(Wp * GCH) + 1, H); c.clip(); if (look.ground(c, SL, P, st) !== true) ok = false; c.restore(); }   // overlap: smoothing sees past the seam; the clip keeps each tile to its own core (no double draw)
    if (!ok) return false; if (!foot) return true;
    for (let j = 0; j <= N; j++) { const x = j / N * W, u = (x - A.x) / Wp + .5 + off + wk, ci = Math.floor(u / GCH), P = gch.get(ci); if (!P) { FY[j] = gy; continue; } const f = (u / GCH - ci) * (GN0 - 1) + GOV, i = Math.min(GN - 2, f | 0), fr = f - i, hb = P.hb, hh = hb[i] + (hb[i + 1] - hb[i]) * fr; FY[j] = Math.min(base - hh * amp, gy); }   // cracks / landmarks sit on it
    R.realGround = (R.realGround || 0) + 1; R.groundChunks = gch; rgNow = true; return true; };
  const ridges = (L, sc, A, Q, bend, p) => { if (L === world.home) { rgLast = rgNow; rgNow = false; }   // the front strip draws last: its result steers the next redraw's ridge lines (the bg canvas redraws every 2nd frame)
 const { t, pulse, trip, real, barPhase: barPh } = st, hue = p.hue, sp = p.spread;
    const nr = Math.min(L.ridges, Q.ridges), rip = world.ripples, F = world.FRONT, gy0 = A.y + world.floorF() * H * sc;
    // PLANET BEND (v0.0.9): the flat ridgeline x maps onto a circle under the ground point; bend 1 = the whole periodic terrain
    // (C home widths) closes into one ring. Rf = ground radius. Near the far side two copies of the terrain crossfade so it is seamless.
    const small = !bend && L.depth !== 0 && sc < .999 && world.bandK && world.opts.zoomBandLimit !== false, Cpx = (world.planet ? world.planet.ring || world.planet.C : 6) * W * sc, Rf = bend > .002 ? Cpx / 6.2832 / bend : 0, Yc = gy0 + Rf, closed = bend > .995;
    const fk = Rf && faK < 1 ? faK + (1 - faK) * (Math.min(1, bend * 2) ** 2 * (3 - 2 * Math.min(1, bend * 2))) : faK;   // v0.0.29 skyHold: far ranges take farScale (1 + farPar (sc - 1)); on the bent planet they reach the full scale by bend .5 (no seam where the ring closes)
    const D = Rf ? Math.min(Math.PI * Rf, Math.max(A.x, W - A.x) * 1.6 + 40) : 0, N = Rf ? (closed ? Q.n * 2 : Math.round(Q.n * 1.5)) : small ? Math.min(Q.n * 2, Math.ceil(Q.n / sc)) : Q.n, span = Rf ? Math.PI * Rf * 2 : 0;
    // the layer below during a zoom is drawn smaller than its own scale (sc ~.25-.9: up to 4 of its widths on screen): more samples (<= 2x; v0.0.23: was 3x, the band limit follows the samples so it stays alias-free)
    // and a band limit (spu = samples per layer unit) so its fine hills + the note ripples do not alias into a big jagged zigzag (r_jam.png)
    const spu = small ? N * sc : 0, rpK = small ? world.bandK(spu, 7.96) : 1;
    const T = L.depth === 0 ? world.terrOf(L) : null, pgW = T && L === world.home && world.place.pal ? (world.opts.placeFade !== false ? sstep((.5 - Math.abs(cam.z)) / .3) : world.place.on ? 1 : 0) : 0, pg = pgW > .001 ? world.place.pal : null,   /* v0.0.29 placeFade: the place's ground palette fades out over |z| .2 .. .5 (off = v0.0.28: it switched off on the sim tick at |z| .5, the land darkened in one frame) */ sea = T && world.hasWater(L) && !Rf, gas = T ? T.style.gas : 0;
    const G = T && L === world.home ? L.globe : null, gm = G && world.opts.globeColors !== false ? real : 0, E = world.env, wk = world.walk;
    if (G && G.warm) G.warm(1);   // build one lane chunk ahead (walking never waits on a whole lane)
    for (let i = 0; i < nr; i++) { const f = nr > 1 ? i / (nr - 1) : 1, rs = f === 1 || fk === 1 ? sc : (1 + fk * (sc - 1)) * (1 - f) + sc * f, base = A.y + (.2 + f * f * (F.base - .2)) * H * rs, amp = H * rs * (1 + f * (F.amp - 1)), off = f * F.off;   // rs: this ridge's scale (front = sc; far = farScale, skyHold)
      if (base > H + amp * .2 || base < -H * 2) continue;
      const gy = A.y + world.floorF() * H * sc, foot = f === 1 && L.depth === 0, fc = foot && L.shp && L.shp.anyCut, ck = foot && !Rf && L.shp && L.shp.cracks.length;   // v0.0.14 solid cut + cracks   // home front ridge = sim.groundAt (steady, clamped to sim's floor); the rest pulses (world.deform)
      if (foot && !Rf && !fc && G && look.ground && world.opts.realGround !== false && realGround(L, G, A, sc, base, amp, off, gy, t, N)) {   // the real ground drew: no fill, ridge stroke, water or top band of ours
        if (ck) cracks(L, A, sc, off, N, t); if (T && L === world.home && T.regions) marks(L, T, A, sc, base, amp, off, gy); continue; }
      if (!foot && !Rf && G && f < 1 && look.ground && world.opts.realGround !== false && world.opts.realGroundBack !== false && world.opts.globeBack !== false && realGround(L, G, A, rs, base, amp, off, gy, t, N, nr - 1 - i, f)) continue;   // back ridges as real land too (lit height-field slices: hills, mountains, haze); off = our flat fills (+ the beat pulse)
      const rgx = world.opts.groundFadeWide !== false ? RGX2 : RGX; let rgA = 0; if (Rf && bend < rgx && G && !fc && look.ground && world.opts.realGround !== false && world.opts.realGroundFade !== false && (foot || (world.opts.realGroundBack !== false && world.opts.globeBack !== false))) { const x = rgx === RGX2 ? Math.sqrt(bend / rgx) : bend / rgx; rgA = 1 - x * x * (3 - 2 * x); if (rgA <= .01) rgA = 0; }
      const ga0 = c.globalAlpha; if (rgA) c.globalAlpha = ga0 * (rgx === RGX2 ? Math.min(1, 2 * (1 - rgA)) : 1 - rgA);   // groundFadeWide: the fill is solid by the half-way point (less sky showing through both half-faded layers: max 12% vs 25%)   // v0.0.29: the bent fill fades IN as the real land (below) fades out: a crossfade, not both at once
      const ovs = !Rf && world.opts.ridgeOverscan !== false, dxo = W / N;   // v0.0.31 H2 ridgeOverscan: the flat fill (+ its water) runs one step past both screen edges, no notch at an edge (the samples stay 0..W, so FY / MC / CS keep their x)
      c.beginPath(); if (!Rf) c.moveTo(ovs ? -dxo : 0, H);
      const back = G && f < 1 && (!Rf || world.opts.realGroundFade !== false) && world.opts.globeBack !== false, wv = sea && (f > .7 || back), cav = foot && G && !Rf && world.opts.caves !== false, mid = N >> 1; let anyCave = false, mr = -1;
      for (let j = 0; j <= N; j++) { const x = Rf ? A.x - D + 2 * D * j / N : j / N * W, u = (x - A.x) / (W * rs) + .5; const h0 = back ? world.heightBack(L, u + off, t, f) : world.height(L, u + off, t, spu), wd = wv ? h0 - world.hRaw : 0; let h = world.deform(L, u, t, h0, pulse, barPh, f);
        if (back && j === mid && world.laneM) { matRGB(G, world.laneM, world.laneI, mc); mr = 1; }
        if (foot) { CS[j] = NaN; const cv = cav ? world.cave : null; if (cv && cv.d > cv.ch) { const yb = base - h * amp; CS[j] = yb - cv.d * L.amp * amp; CR[j] = yb - cv.ch * L.amp * amp; anyCave = true; } }
        if (foot && gm > .02) { const lo = G.lane(0, u + off + wk); matRGB(G, lo.m, lo.i, h2r); MC[3 * j] = h2r[0]; MC[3 * j + 1] = h2r[1]; MC[3 * j + 2] = h2r[2]; }
        if (Rf && Math.abs(x - A.x) > span * .375) { const k = (Math.abs(x - A.x) / (span * .5) - .75) * 2, u2 = u - Math.sign(x - A.x) * span / (W * rs); h = h * (1 - k) + k * world.deform(L, u2, t, back ? world.heightBack(L, u2 + off, t, f) : world.height(L, u2 + off, t), pulse, barPh, f); }
        for (const r of rip) { const age = t - r.t; if (age < 0 || age > 3) continue; const dd = Math.abs(u - r.x) - age * .35; h += r.a * .02 * rpK * Math.exp(-age * 1.6) * Math.exp(-dd * dd * 60) * Math.cos(dd * 50); }
        const y = foot ? Math.min(base - h * amp, fc ? gy + world.floorCut(u + off) * H * sc : gy) : base - h * amp; if (foot) FY[j] = y;
        if (wv) { const dw = wd * amp; WB[2 * j] = y; WB[2 * j + 1] = dw > 0 ? dw : 0; }
        if (Rf) { const th = (x - A.x) / Rf, r = Rf + (gy0 - y) * (1 - .7 * bend * (1 - f)), px = A.x + Math.sin(th) * r, py = Yc - Math.cos(th) * r; c.lineTo(px, py); RB[2 * j] = px; RB[2 * j + 1] = py; } else { if (ovs && j === 0) c.lineTo(-dxo, y); c.lineTo(x, y); if (ovs && j === N) c.lineTo(W + dxo, y); } }
      if (Rf) { if (!closed) c.lineTo(A.x, Yc); } else c.lineTo(ovs ? W + dxo : W, H); c.closePath();
      const fog = (1 - f) * real, cl = gas * (1 - f) * real;   // v0.0.12: region ground colour (palette hook) + a cloud giant's back ridges read as cloud bands
      if (gm > .02 && (mr > 0 || foot)) {   // 1a: the land's own colour (back: the lane's material at mid screen; front: the ground under you), fogged with distance
        if (foot) { const q = 3 * mid; mc[0] = MC[q]; mc[1] = MC[q + 1]; mc[2] = MC[q + 2]; }
        if (pg) { hsl2((pg.ground[0] + fog * 160) % 360, pg.ground[1] * (1 - .5 * fog) + 10 * trip, pg.ground[2] * (.45 + .55 * f) + fog * 14 + cl * 30, h2r); if (pgW < 1) { const r0 = h2r[0], g0 = h2r[1], b0 = h2r[2]; hsl2((hue + sp * .3 + fog * 160) % 360, 30 + 10 * trip, 4 + f * 5 + fog * 14 + cl * 30, h2r); h2r[0] += (r0 - h2r[0]) * pgW; h2r[1] += (g0 - h2r[1]) * pgW; h2r[2] += (b0 - h2r[2]) * pgW; } } else hsl2((hue + sp * .3 + fog * 160) % 360, 30 + 10 * trip, 4 + f * 5 + fog * 14 + cl * 30, h2r);
        const dl = foot ? .42 : .3 + .4 * f, fg = fog * .75, sky = hsl2((hue + 200) % 360, 30, 42, skyc), k = gm * .85;
        c.fillStyle = css(h2r[0] + (((mc[0] * dl) * (1 - fg) + sky[0] * fg) - h2r[0]) * k, h2r[1] + (((mc[1] * dl) * (1 - fg) + sky[1] * fg) - h2r[1]) * k, h2r[2] + (((mc[2] * dl) * (1 - fg) + sky[2] * fg) - h2r[2]) * k, .85 - cl * .35 + .1 * gm * (1 - f));
      } else if (pg && pgW < 1) { hsl2((pg.ground[0] + fog * 160) % 360, pg.ground[1] * (1 - .5 * fog) + 10 * trip, pg.ground[2] * (.45 + .55 * f) + fog * 14 + cl * 30, h2r); const r0 = h2r[0], g0 = h2r[1], b0 = h2r[2]; hsl2((hue + sp * .3 + fog * 160) % 360, 30 + 10 * trip, 4 + f * 5 + fog * 14 + cl * 30, h2r); c.fillStyle = css(h2r[0] + (r0 - h2r[0]) * pgW, h2r[1] + (g0 - h2r[1]) * pgW, h2r[2] + (b0 - h2r[2]) * pgW, .85 - cl * .35);   // placeFade: both palettes mixed
      } else c.fillStyle = pg ? `hsla(${(pg.ground[0] + fog * 160) % 360},${pg.ground[1] * (1 - .5 * fog) + 10 * trip}%,${pg.ground[2] * (.45 + .55 * f) + fog * 14 + cl * 30}%,${.85 - cl * .35})` : `hsla(${(hue + sp * .3 + fog * 160) % 360},${30 + 10 * trip}%,${4 + f * 5 + fog * 14 + cl * 30}%,${.85 - cl * .35})`;
      c.fill();
      if (Rf && world.opts.calmBent !== false) { const mu = Math.min(1, Math.max(st.level || 0, st.burst || 0)), tr = typeof st.trippy === 'number' ? Math.max(0, Math.min(1, st.trippy)) : 1, hz = .6 * (1 - mu * tr);   // H1 calmBent (c): at rest the bent fills are hazed + desaturated 60% toward the air; the hue colour comes back only with music x st.trippy (music = max(ohm level, burst): neutral pick)
        if (hz > .01) { c.fillStyle = `rgba(150,172,200,${hz.toFixed(3)})`; c.fill(); } }
      if (Rf && !closed) { c.beginPath(); c.moveTo(RB[0], RB[1]); for (let j = 1; j <= N; j++) c.lineTo(RB[2 * j], RB[2 * j + 1]); }   // stroke only the ridgeline, not the wedge to the centre
      if (!((rgLast || (G && (!Rf || world.opts.bentNoLines !== false) && look.ground && world.opts.realGround !== false)) && world.opts.realGroundLines !== true) && !(look.ridge && look.ridge(c, L, RB, N, sc, st) === true) && !noLine('lnRidge')) {   // v0.0.30 B2 lnRidge: no crest line on ANY range (look.ridge may paint a soft crest on the current path; off = the v0.0.29 crest where look.ground does not draw)   // v0.0.29 bentNoLines: no ridge outlines on home's bent land either (off = v0.0.28: green crest lines on the flat fills from z -.2)   // no white crests wherever look.ground draws this land (also its not-yet-baked fallback frames)
          // the real ground drew (last frame): no wavy ridge lines over the land
        c.strokeStyle = `hsla(${(hue + f * sp * trip + t * 30 * trip) % 360},${40 + 55 * trip}%,${(55 + 20 * pulse) * (.6 + .4 * trip) + real * 18}%,${(.35 + .5 * f) * (.55 + .45 * trip + .3 * real * f)})`; c.lineWidth = .8 + f * 1.6 + pulse * (.4 + trip); c.stroke(); }
      if (wv) { let any = false; for (let j = 0; j <= N; j++) if (WB[2 * j + 1] > .5) { any = true; break; }   // v0.0.12 seas + pools: the water under the flat line, deeper = denser
        if (any) { c.beginPath(); if (ovs) c.moveTo(-dxo, WB[0]); for (let j = 0; j <= N; j++) c.lineTo(j / N * W, WB[2 * j]); if (ovs) { c.lineTo(W + dxo, WB[2 * N]); c.lineTo(W + dxo, WB[2 * N] + WB[2 * N + 1]); } for (let j = N; j >= 0; j--) c.lineTo(j / N * W, WB[2 * j] + WB[2 * j + 1]); if (ovs) c.lineTo(-dxo, WB[0] + WB[1]); c.closePath();
          const wp = pg ? pg.water : null, sc0 = G && gm > .02 ? G.seaColor : null, wa = .8 * (.55 + .45 * f);
          const sm = world.opts.seaMute !== false, sl = sc0 && sm ? .3 * sc0[0] + .59 * sc0[1] + .11 * sc0[2] : 0, sk = sm ? .5 : 1, sx = (v, k) => sc0 && sm ? sl + (v - sl) * sk : v;   // v0.0.30 B18 seaMute: the sea at half its colour (seed 42's pink band; off = v0.0.29 full colour)
          c.fillStyle = sc0 ? css(sx(sc0[0]) * (1.1 + .5 * pulse) + (1 - f) * .12 * real, sx(sc0[1]) * (1.1 + .5 * pulse) + (1 - f) * .14 * real, sx(sc0[2]) * (1.1 + .5 * pulse) + (1 - f) * .16 * real, wa) : wp ? `hsla(${wp[0]},${sm ? Math.min(30, wp[1] * .5) : wp[1]}%,${wp[2] + 8 * pulse}%,${wa})` : `hsla(200,${sm ? 30 : 60}%,${28 + 8 * pulse}%,${wa})`; c.fill(); } }
      if (foot && G && !Rf) groundTop(L, G, A, sc, N, base, amp, off, gm, anyCave, t, f);
      if (ck) cracks(L, A, sc, off, N, t);
      if (f === 1 && T && !Rf && L === world.home && T.regions) marks(L, T, A, sc, base, amp, off, gy);
      // v0.0.29 zoom fix: as the ground starts to bend into the planet (zooming out of home) the real ground fades out over the bent fills
      // (bend 0..RGX) instead of vanishing on the first bent frame (v0.0.27: the lit land popped to flat fills the moment a zoom out began, and back on at the end of a zoom in)
      if (rgA) { c.globalAlpha = ga0; const q = rgQ[rgQn] || (rgQ[rgQn] = {}); rgQn++; q.a = rgA; q.base = base; q.amp = amp; q.off = off; q.gy = gy; q.ri = foot ? 0 : nr - 1 - i; q.f = f; q.sc = rs; } }
    // ... drawn after ALL the bent strips (back to front, like the flat land), so the bent fills never cover the fading real land
    if (rgQn) { const ga = c.globalAlpha, rn = rgNow; FYs.set(FY); for (let k = 0; k < rgQn; k++) { const q = rgQ[k]; c.globalAlpha = ga * q.a; realGround(L, G, A, q.sc, q.base, q.amp, q.off, q.gy, t, N, q.ri, q.f); } c.globalAlpha = ga; rgNow = rn; FY.set(FYs); rgQn = 0; }
  };
  // THE PLANET (v0.0.9): the home layer's ridgelines bent into a ring at the home scale (ZK^z), plus a thin atmosphere line.
  const drawPlanet = (A, Q) => { const P = world.planet, L = world.home, sc = Math.pow(ZK, cam.z), R0 = (P.ring || P.C) * W * sc / 6.2832;
    if (R0 < 1.5) return; const a0 = c.globalAlpha; c.globalAlpha = Math.min(1, (R0 - 1.5) / 3);
    let p = pal; p.hue = (L.hue + st.t * (4 + tripL * 14 + st.burst * 30)) % 360; p.spread = L.spread * (.4 + .6 * tripL + .5 * st.burst); p.sat = 30 + 55 * tripL;   /* tripL = look.trip under the trippy gate (world.tripK) */ p.light = 1;
    if (look.palette) p = look.palette(L, st) || p;
    if (P.bend > .3) { const gy0 = A.y + world.floorF() * H * sc, Rf = R0 / P.bend; const ra = Rf + H * sc * .06, aa = .22 * (P.bend - .3) * (1 + st.pulse * .5), hh = (p.hue + 200) % 360;
      if (!(look.planetRim && look.planetRim(c, A.x, gy0 + Rf, ra, st) === true)) { if (noLine('lnPlanetRim')) softRing(c, A.x, gy0 + Rf, ra, Math.max(3, H * sc * .05), `${hh},45%,70%`, aa * .8);   // v0.0.30 B3 lnPlanetRim: the bent planet's air is a soft band of light, not a drawn arc
        else { c.beginPath(); c.arc(A.x, gy0 + Rf, ra, 0, 6.2832); c.strokeStyle = `hsla(${hh},70%,70%,${aa})`; c.lineWidth = 1 + 3 * sc + st.pulse; c.stroke(); } } }
    if (bentGk > 0) c.globalAlpha *= 1 - bentGk;   /* v0.0.31 H1 calmBent: the bent ridges fade out as curGlobe's real globe fades in (no lumpy ring past the globe edge) */
    ridges(L, sc, A, R0 < 40 ? QL[3] : R0 < 200 ? (world.opts.zoomSameDetail !== false ? QZ[qd] : QL[Math.min(3, qd + 1)]) : Q, P.bend, p); c.globalAlpha = a0; };
  // SPACE (v0.0.11): star, orbits, the other planets (culled to the screen; cheap discs + a terrain rim from each planet's own layer)
  const sp1 = { x: 0, y: 0 }, sp2 = { x: 0, y: 0 }, PQ = { seed: 0, id: 0, r: 0, style: null }, SL = { x: 0, y: 0 };
  const drawSpace = (A, t) => { const S = world.system, v = S.view(W, H, A, t), s = v.s, sc = v.sc, a0 = c.globalAlpha;
    if (s > .01) { c.fillStyle = `rgba(2,3,10,${.78 * s})`; c.fillRect(0, 0, W, H); }   // the space veil over the bigger layers' light
    const G = world.galaxy; if (G) { G.cx = A.x; G.cy = A.y + H * .1; if (G.amt > .01) { const g0 = performance.now(); G.shown = G.draw(c, W, H, G.cx, G.cy, sc, st.pulse, look); R.galaxyMs = (R.galaxyMs || 0) * .95 + (performance.now() - g0) * .05; } }   // step 2: the neighbouring stars
    S.screen(0, 0, sp1); const sr = Math.max(1.5, S.starR * sc);
    if (s > .01 && sp1.x > -sr * 4 && sp1.x < W + sr * 4 && sp1.y > -sr * 4 && sp1.y < H + sr * 4) { c.globalAlpha = a0 * s;
      if (!(look.star && world.opts.realSpace !== false && look.star(c, sp1.x, sp1.y, sr, st) === true)) {   // Visuals' real star (blackbody, corona), else ours
        const gr = c.createRadialGradient(sp1.x, sp1.y, 0, sp1.x, sp1.y, sr * 4); gr.addColorStop(0, `hsla(45,100%,${88 + 8 * st.pulse}%,1)`); gr.addColorStop(.25, 'hsla(35,95%,60%,.55)'); gr.addColorStop(1, 'hsla(20,90%,40%,0)');
        c.fillStyle = gr; c.fillRect(sp1.x - sr * 4, sp1.y - sr * 4, sr * 8, sr * 8); }
      c.lineWidth = world.opts.orbitThin !== false ? .6 : 1; const lnO = noLine('lnOrbits'); for (const p of S.planets) { const a = p.a * sc; if (a < 3) continue; if (lnO) { const lw0 = c.lineWidth, m = p.i === S.cur ? 1.6 : 1; for (let q = 0; q < 3; q++) { c.lineWidth = [3.5, 2, 1][q]; c.strokeStyle = `hsla(${p.hue},35%,86%,${[.025, .04, .06][q] * m * .45})`; c.beginPath(); c.ellipse(sp1.x, sp1.y, a, a * .9, 0, 0, 6.2832); c.stroke(); } c.lineWidth = lw0; continue; }   /* v0.0.30 G3 lnOrbits: 3 faint passes = a soft band, no hair line (spec alphas x.45: at full spec alpha the band read brighter than the .6 px line) */
      c.strokeStyle = world.opts.orbitThin !== false ? `hsla(${p.hue},35%,86%,${p.i === S.cur ? .16 : .07})` : `hsla(${p.hue},50%,70%,${p.i === S.cur ? .22 : .1})`; c.beginPath(); c.ellipse(sp1.x, sp1.y, a, a * .9, 0, 0, 6.2832); c.stroke(); } }
    for (const p of S.planets) { if (p.i === S.cur) continue; S.pos(p, t, sp2); S.screen(sp2.x, sp2.y, sp2); const r = p.r * sc;
      if (r < .6 || sp2.x < -r - 4 || sp2.x > W + r + 4 || sp2.y < -r - 4 || sp2.y > H + r + 4) continue;   // only visible planets
      const L = S.layerOf(p), al = Math.min(1, (r - .6) / 2) * Math.max(s, Math.min(1, r / 60)); c.globalAlpha = a0 * al;
      if (look.planet && world.opts.realSpace !== false && r >= 2) { const T = world.opts.terrWarm !== false && world.styleOf ? null : world.terrOf ? world.terrOf(L) : null, q = PQ;   /* v0.0.24 (terrWarm): the disc needs only the style */ q.seed = p.seed >>> 0; q.id = S.key(p.i); q.r = r; q.style = T ? T.style : world.opts.terrWarm !== false && world.styleOf ? world.styleOf(L) : null; q.heal = p.sum ? p.sum.heal : undefined;
        st.light = SL; SL.x = sp1.x; SL.y = sp1.y; const ok = look.planet(c, q, sp2.x, sp2.y, r, st) === true; st.light = undefined;   // Visuals' real planet, lit by its star
        if (ok) { if (p.sum.n && r > 3) { const lnS = noLine('lnSpecks'); c.fillStyle = `hsla(${(L.hue + 180) % 360},90%,75%,.9)`; const m = Math.min(8, p.sum.n); for (let j = 0; j < m; j++) { const th = (j / m + p.ph0) * 6.2832; const xx = sp2.x + Math.sin(th) * r * 1.02, yy = sp2.y - Math.cos(th) * r * 1.02; if (lnS && dotS(c, xx, yy, 2.6, sumRgb(Math.round(L.hue + 180) % 360))) continue; c.fillRect(xx - 1, yy - 1, 2, 2); } } continue; } }
      c.beginPath(); if (r < 10) c.arc(sp2.x, sp2.y, r, 0, 6.2832);
      else { const n = r < 40 ? 24 : r < 160 ? 48 : 96; for (let j = 0; j <= n; j++) { const th = j / n * 6.2832, u = th / 6.2832 * (L.C || p.C), h = world.height(L, u, t) / (L.amp + .04), rr = r * (1 + .05 * h); const x = sp2.x + Math.sin(th) * rr, y = sp2.y - Math.cos(th) * rr; j ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }
      const bri = world.opts.orbitThin !== false; c.fillStyle = `hsl(${L.hue},${30 + 20 * L.rough}%,${(bri ? 24 + 14 * L.bright : 8 + 6 * L.bright)}%)`; c.fill(); if (!noLine('lnDiscRim')) { c.strokeStyle = `hsla(${(L.hue + 40) % 360},70%,${(bri ? 72 : 55) + 15 * st.pulse}%,${bri ? .95 : .8})`; c.lineWidth = 1 + Math.min(2, r / 60); c.stroke(); }   // v0.0.30 B17 lnDiscRim: the plain disc (no look.planet / r < 2) has no rim line
      if (p.sum.n && r > 3) { const lnS = noLine('lnSpecks'); c.fillStyle = `hsla(${(L.hue + 180) % 360},90%,75%,.9)`; const m = Math.min(8, p.sum.n); for (let j = 0; j < m; j++) { const th = (j / m + p.ph0) * 6.2832; const xx = sp2.x + Math.sin(th) * r * 1.02, yy = sp2.y - Math.cos(th) * r * 1.02; if (lnS && dotS(c, xx, yy, 2.6, sumRgb(Math.round(L.hue + 180) % 360))) continue; c.fillRect(xx - 1, yy - 1, 2, 2); } } }   // sleeping ohms: a few lights
    c.globalAlpha = a0; };
  // 1a weather + day on the home ground (globe.js at your spot, env.js): night darkens the sky, clouds drift with the wind, rain falls
  // under thick wet cloud. One path / a few fills each: no per-pixel work.
  const skyEnv = (E, A, sc, t, real, pulse, lsky) => { const n = 1 - E.day; if (n > .02 && !lsky) { c.fillStyle = `rgba(2,4,16,${(.55 * n).toFixed(3)})`; c.fillRect(0, 0, W, H); }
    const cc = E.cloud - .25; if (cc > 0 && E.opts.weather && !(lsky && world.opts.skyDefer !== false)) {   /* v0.0.30 F1 skyDefer: look.sky (look/air) drew its own clouds */ const top = A.y - H * .62 * sc, al = Math.min(.5, cc * .9) * (.5 + .5 * real), lt = 30 + 40 * E.day;
      c.fillStyle = `hsla(220,${12 + 10 * (1 - E.rain)}%,${lt - 18 * E.rain}%,${al.toFixed(3)})`; c.beginPath();
      for (let k = 0; k < 6; k++) { const s = W * 1.6, x = ((k * 197 + t * (8 + 30 * Math.abs(E.east)) * Math.sign(E.east || 1)) % s + s) % s - W * .3, y = top + (k % 3) * H * .05 * sc + Math.sin(k * 2.3) * 12, rw = W * (.18 + .08 * (k % 2)) * (.6 + cc), rh = H * .035 * sc * (1 + cc);
        c.moveTo(x + rw, y); c.ellipse(x, y, rw, rh, 0, 0, 6.2832); }
      c.fill(); } };
  const rainEnv = (E, sc, t) => { const n = Math.min(90, (E.rain * 110) | 0), sl = -E.east * 9, ln = H * .03 * (.6 + .4 * sc), sn = E.snow;
    c.strokeStyle = sn ? `rgba(240,245,255,${(.35 + .3 * E.rain).toFixed(3)})` : `rgba(170,190,220,${(.22 + .25 * E.rain).toFixed(3)})`; c.lineWidth = sn ? 2 : 1; c.beginPath();
    for (let k = 0; k < n; k++) { const h1 = ((k * 2654435761) >>> 0) / 4294967296, h2 = ((k * 2246822519) >>> 0) / 4294967296, sp = sn ? .12 : .9, y = ((h2 + t * sp * (.8 + .4 * h1)) % 1) * (H + ln) - ln, x = ((h1 * W - sl * y / ln * (sn ? .4 : 1)) % W + W) % W;
      c.moveTo(x, y); c.lineTo(x + (sn ? 1 : sl), y + (sn ? 1.5 : ln)); }
    if (noLine('lnRain')) { const lw = c.lineWidth, ga = c.globalAlpha; c.lineCap = 'round'; c.globalAlpha = ga * .35; c.lineWidth = 2.2 * lw; c.stroke(); c.globalAlpha = ga * .6; c.lineWidth = lw; c.stroke(); c.globalAlpha = ga; c.lineCap = 'butt'; return; }   /* v0.0.30 G6 lnRain (fallback only, look/air owns rain when it drew the sky): 2 soft passes */
    c.stroke(); };
  const drawLayer = (L, sc, A, Q, noRidges = false, noSky = false) => {   // noSky (H3 zoomSkyOnce): the zoom circle's inner layer draws no sky of its own
    const { t, pulse, level: lvl, trip, real, burst, barPhase: barPh } = st, m = Math.min(W, H);
    let p = pal; p.hue = (L.hue + t * (4 + trip * 14 + burst * 30)) % 360; p.spread = L.spread * (.4 + .6 * trip + .5 * burst); p.sat = 30 + 55 * trip; p.light = 1;
    if (look.palette) p = look.palette(L, st) || p;
    const hue = p.hue, sp = p.spread, sat = p.sat;
    const ss = skK === 1 ? sc : 1 + skK * (sc - 1); st.skyScale = ss; st.farScale = faK === 1 ? sc : 1 + faK * (sc - 1);   // v0.0.29 skyHold: the sky (field, sky gradients, clouds, kaleidoscope) zooms only skyPar as much as the ground (look/ reads st.skyScale / st.farScale)
    // field: a sky-to-ground light (realistic) blended with a radial colour swell (trippy) - one gradient each, cheap
    const lsky = !noSky && L === world.home && L.globe && look.sky && world.opts.lookSky !== false && look.sky(c, st, L, A, sc) === true;   // Visuals' real sky drew: no radial bg / real tint / daySky / night fill of ours (clouds stay)
    if (!lsky && !noSky) { const bg = c.createRadialGradient(A.x, A.y, 0, A.x, A.y, Math.max(W, H) * 1.1 * Math.max(.3, ss)); bg.addColorStop(0, `hsl(${hue},${sat}%,${(10 + 10 * pulse * L.bright + lvl * 8 + burst * 10) * p.light}%)`); bg.addColorStop(.55, `hsl(${(hue + sp * .5) % 360},${sat}%,${5 + 3 * pulse}%)`); bg.addColorStop(1, `hsl(${(hue + sp) % 360},${sat * .8}%,3%)`);
    c.fillStyle = bg; c.fillRect(0, 0, W, H); }
    if (!lsky && !noSky && real > .05) { const sky = c.createLinearGradient(0, A.y - H * ss, 0, A.y + H * .5 * ss); sky.addColorStop(0, `hsla(${(hue + 200) % 360},35%,22%,${.55 * real})`); sky.addColorStop(1, `hsla(${(hue + 30) % 360},30%,6%,0)`); c.fillStyle = sky; c.fillRect(0, 0, W, H); }
    const E0 = !lsky && !noSky && L === world.home && L.globe && world.opts.daySky !== false ? world.env : null;   // a day sky on the planet's ground (blue above, pale at the horizon), with the day/night cycle and the real mix
    if (E0) { const dk = Math.min(1, Math.max(0, E0.day * 1.3 - .05)) * (.45 + .55 * real) * (1 - .35 * burst); if (dk > .02) { const hy = A.y + .25 * H * ss, gs = c.createLinearGradient(0, hy - H * .9 * ss, 0, hy);
      gs.addColorStop(0, `rgba(52,104,186,${dk.toFixed(3)})`); gs.addColorStop(1, `rgba(190,214,236,${dk.toFixed(3)})`); c.fillStyle = gs; c.fillRect(0, 0, W, Math.min(H, hy + H * .5)); } }
    if (!(look.layer && look.layer(c, L, sc, st, 'field') === true) && (trip > .08 || Q.rings > 1)) {
      // kaleidoscope pattern around the anchor: sym petals turning with the bar, breathing on the beat; grows with trip / bursts
      c.globalCompositeOperation = 'lighter'; const rings = Q.rings, n = L.sym * Q.pts, aMul = .2 + .8 * trip + burst;
      for (let k = 0; k < rings; k++) { const rr = m * (.32 + k * .26) * ss * (1 + pulse * .06 * (k + 1) + burst * .25), rot = barPh * 6.283 / L.sym * (k % 2 ? -1 : 1) + L.phase + k, dep = .18 + .3 * L.rough + lvl * .15 + burst * .2;
        if (rr < 2 || rr > Math.max(W, H) * 3) continue; c.beginPath();
        for (let i = 0; i <= n; i++) { const a = i / n * 6.283, w = Math.cos(a * L.sym + rot * L.sym), r = rr * (1 - dep + dep * w * w * (1 + .3 * Math.sin(a * L.sym * 2 - t * 1.3))); const x = A.x + Math.cos(a + rot) * r, y = A.y + Math.sin(a + rot) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.closePath(); c.fillStyle = `hsla(${(hue + k * sp / rings + 180) % 360},90%,55%,${(.05 + .07 * pulse) * aMul})`; c.fill(); if (!noLine('lnKaleido')) { c.strokeStyle = `hsla(${(hue + k * sp / rings) % 360},95%,65%,${Math.min(1, (.3 + .4 * pulse) * aMul)})`; c.lineWidth = 1 + 2 * pulse; c.stroke(); } }   // v0.0.30 B1 lnKaleido: the old petals are fills only
      c.globalCompositeOperation = 'source-over'; }
    // bigger layers become the space around the planet (v0.0.9): their ridges fade out as the planet shows (toggle world.opts.planet)
    const sky = L.depth < 0 && world.planet && world.opts.planet ? world.planet.size : 0;
    // v0.0.9: once home has become the planet, the bigger layers' ground lines fade out - they are the space the planet floats in
    const sk = L.depth < 0 && world.planet && world.opts.planet ? 1 - (1 - sky) * (1 - Math.min(1, world.planet.bend * 1.4)) : sky;
    const E = L === world.home && L.globe ? world.env : null; if (E) skyEnv(E, A, ss, t, real, pulse, lsky);
    const skA = (1 - sk) * (L.depth < 0 ? 1 - bentGk : 1);   // H1 calmBent: the bigger layers' ranges (the brown blobs round the far planet) fade with curGlobe too
    if (!noRidges && sk < .97 && skA > .003) { const ga = c.globalAlpha; if (skA < 1) c.globalAlpha = ga * skA; ridges(L, sc, A, Q, 0, p); c.globalAlpha = ga; }
    if (E && E.rain > .04 && !E.inCave && E.opts.weather && !(lsky && world.opts.skyDefer !== false)) rainEnv(E, world.opts.rainSkyScale !== false ? ss : sc, t);   // v0.0.30 A2 rainSkyScale: the rain streak length follows the sky's own scale (skyHold), not the ground's
    if (look.layer) look.layer(c, L, sc, st, 'over');
  };
  const sp = {}, vis = [], pool = [], byK = (a, b) => a.k - b.k, TINY = 7, LOOKN = [64, 40, 24, 8];   // [3]: lowShapes (BODY_PLAN.low) keeps the baked character look on the nearest 8 at the lowest rung   // PROPOSAL: TINY px; look.ohm on at most LOOKN[q] ohms (most important first)
  const rgbC = new Map(), rgbOf = (h, sa, li) => { const k = (Math.round(h) % 360) * 64 + Math.round(li * 40); let c = rgbC.get(k); if (c) return c;
    const a = sa * Math.min(li, 1 - li), f = n => { const kk = (n + h / 30) % 12; return Math.round(255 * (li - a * Math.max(-1, Math.min(kk - 3, 9 - kk, 1)))); };
    c = [f(0), f(8), f(4)]; rgbC.set(k, c); return c; };
  // ohms on the planet: one speck each at its bent position (fillRect, colour cached per hue), most first up to SPECK[q]
  const SPECK = [400, 250, 150, 80], NODEN = [200, 120, 80, 40], spk = {};
  // v0.0.30 G1 lnSpecks (ON, under noOutlines): the far-zoom ohm specks and a planet's sleeping-ohm lights are round soft dots, not squares.
  // One 32 px soft-dot sprite per colour (cached), drawn with drawImage, so 400 specks cost about what 400 fillRects did. Off = v0.0.29 squares.
  const sprC = new Map(), sprOf = (r, gg, b) => { const k = (r << 16) | (gg << 8) | b; let s = sprC.get(k); if (s) return s; if (typeof document === 'undefined') return null;
    if (sprC.size > 512) sprC.clear(); s = document.createElement('canvas'); s.width = s.height = 32; const x = s.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(.45, `rgba(${r},${gg},${b},.5)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); sprC.set(k, s); return s; };
  const dotS = (gx, x, y, rad, cl) => { const s = sprOf(cl[0], cl[1], cl[2]); if (s) gx.drawImage(s, x - rad, y - rad, rad * 2, rad * 2); return !!s; };
  const SUMC = new Map(), sumRgb = h => { let c = SUMC.get(h); if (!c) { c = rgbOf(h, .9, .75); SUMC.set(h, c); } return c; };
  const specks = (bend, A) => { const P = world.planet, sc = Math.pow(ZK, cam.z), R0 = (P.ring || P.C) * W * sc / 6.2832, Rf = R0 / bend, gy0 = A.y + world.floorF() * H * sc, Yc = gy0 + Rf;
    const n = Math.min(sim.ohms.length, SPECK[qd]), a = Math.min(1, (bend - .05) * 3) * Math.min(1, (R0 - 1.5) / 3); if (a <= 0 || R0 < 1.5) return; g.globalAlpha = a;
    const sz = Math.max(1.5, Math.min(4, 20 * sc)), lnS = noLine('lnSpecks'), nG = look.node && world.opts.nodeCap !== false ? NODEN[qd] : 0; let nd = 0;   // v0.0.31 H5 nodeCap: Visuals' look.node glow dot for the first NODEN[q] specks (1.47 ms / 400 headless), the rest stay the soft dots / squares
    for (let i = 0; i < n; i++) { const q = sim.ohms[i]; if (q.parked) continue; const s = toScreen(W, H, sim.cam, q.body.x, q.body.y, spk), th = (s.x - A.x) / Rf, r = Rf + (gy0 - s.y);
      const x = A.x + Math.sin(th) * r, y = Yc - Math.cos(th) * r; if (nd < nG && look.node(g, x, y, sz, q, st) === true) { nd++; continue; } const cl = rgbOf(q.hue || 0, .7, .62 + Math.min(.2, (q.glow || 0) * .15)); if (lnS && dotS(g, x, y, Math.max(1.8, sz * 1.25), cl)) continue; g.fillStyle = `rgb(${cl[0]},${cl[1]},${cl[2]})`; g.fillRect(x - sz / 2, y - sz / 2, sz, sz); }
    g.globalAlpha = 1; };
  R.draw = () => { const rsz = R.q !== qd; if (rsz) resize(); if (world.planet && world.opts.bendEveryFrame !== false) { world.planet.bend = world.planet.bendOf(cam.z); world.planet.size = world.planet.sizeOf(cam.z); }   // v0.0.29 bendEveryFrame: the planet bend follows this frame's zoom (and the planet size; off = v0.0.28: set on the sim tick, so the ground fade / ohm fade / rim stepped .394 .46 .493 .493 .493 .593)
    { const S = world.system, cu = S ? S.cur : -1; if (cu !== lxCur) { if (lxCur !== null && !rsz && world.opts.landXfade !== false) { if (lxc.width !== bgc.width || lxc.height !== bgc.height) { lxc.width = bgc.width; lxc.height = bgc.height; } lxx.drawImage(bgc, 0, 0); lxT = 1; lxH.x = R.hs ? R.hs.x : 0; lxH.y = R.hs ? R.hs.y : 0; } lxCur = cu; }
      lxK = lxT ? 1 - sstep(lxT++ / 9) : 0; if (lxK <= .003) lxT = 0; }
    { const Dv = world && world.zl && world.zl.dive; bgpOk = false; if (!rsz && Dv && Dv.o && Dv.opts.worldFollow && Dv.opts.followAll !== false && Dv.opts.followPrev !== false && Dv.z > 1e-3 && !(Dv.z >= 1 && Dv.opts.hideWorld)) { if (bgp.width !== bgc.width || bgp.height !== bgc.height) { bgp.width = bgc.width; bgp.height = bgc.height; } bgpx.drawImage(bgc, 0, 0); bgpOk = true; }   // v0.0.29 followPrev: the dive's world copy (follow) takes #bg as composited last frame, copied here before this frame's world draws, so no mid-frame forced raster of #bg (~3 ms headless)
      if (Dv && Dv.o && Dv.z >= 1 && Dv.opts.hideWorld) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); R.dv.t = music.now(); if (!R.dv.st) R.dv.st = { W, H }; return; } }   /* fully inside an ohm: only the inside draws (R.drawDive) */
    const o = sim.ohm, b = o.body, br = sim.breath(o) * (1 - .22 * b.pin + .25 * b.pout + .12 * Math.min(1, b.throb)), L = layout(W, H, o, br), ph = music.phase(), t = music.now();
    const gs = sim.sig.global, pulse = gs['beat.pulse'] != null ? gs['beat.pulse'] : Math.exp(-ph * 6), bp = music.bar(t), lk = world.look;
    st.t = t; st.W = W; st.H = H; st.dpr = dpr; st.q = qd; st.trip = lk.trip; tripL = lk.trip * (world && world.tripK ? world.tripK(st.trippy) : 1); st.real = lk.real; st.burst = lk.burst; st.big = lk.big || 0; st.pulse = pulse; st.barPhase = bp - Math.floor(bp);
    st.level = Math.min(1, (sim.sig[o.id] && sim.sig[o.id]['sound.level']) || 0); st.depth = Math.floor(cam.z); st.zoom = cam.z - st.depth; st.cam = sim.cam; st.place = world ? world.layer(st.depth).trip : 0;   // place = this layer's own trip value (0 real .. 1 trippy)
    const A = st.A = anchor(W, H), d0 = st.depth, f = st.zoom;
    { const WO = world.opts, a0 = typeof WO.skyHandFrom === 'number' ? WO.skyHandFrom : .15, a1 = typeof WO.skyHandTo === 'number' ? WO.skyHandTo : .85, x = Math.max(0, Math.min(1, (-cam.z - a0) / Math.max(.01, a1 - a0))), ak = Math.max(0, Math.min(1, +world.zoomAccentK || 0));
      // v0.0.29 skyHold (Wilbow 12:12 AM Oct 26 "If the pinch zoom includes the sky and the ground it looks too wierd. But keep this effect to be used as an accent"): a pinch scales the ground, ohms + things;
      // the sky moves skyPar (.15) as much and the far ranges farPar (.5). Leaving the ground for the planet (cam.z -skyHandFrom .. -skyHandTo) both blend smoothly up to the full scale.
      // zoomAccent (OFF; nothing turns it on yet) = the whole-picture zoom (v0.0.28): a switch, or world.zoomAccentK 0..1 for an eased accent
      const hk = WO.skyHold !== false && !WO.zoomAccent ? (1 - x * x * (3 - 2 * x)) * (1 - ak) : 0;
      skK = hk ? 1 - hk * (1 - (typeof WO.skyPar === 'number' ? WO.skyPar : .15)) : 1; faK = hk ? 1 - hk * (1 - (typeof WO.farPar === 'number' ? WO.farPar : .5)) : 1; R.skyHk = hk; R.skyK = skK; R.farK = faK; }
    if (look.frame) look.frame(st);
    const moving = cam.active || cam.v !== 0 || f > .001 || lxK > .003 || A.x !== st.ax || A.y !== st.ay; st.ax = A.x; st.ay = A.y;
    if (moving || (++fr & 1)) { bgSize(); c = bg2; c.setTransform(bs, 0, 0, bs, 0, 0);
    const Qz = f > .001 ? (world.opts.zoomSameDetail !== false ? QZ[qd] : QL[Math.min(3, qd + 1)]) : QL[qd];   // v0.0.29: QZ keeps the rest level's ridge + ring COUNT (only the samples per line go one step lighter): the count change re-laid every back ridge (pop at a zoom's start + end)   // two layers on screen while zooming: one detail step lighter each
    const PB = world.planet && world.opts.planet ? world.planet.bend : 0;   // v0.0.9 planet bend 0 flat .. 1 round
    bentGk = 0; { const S = world.system; if (world.opts.calmBent !== false && PB > 0 && cam.z < -.5 && S && S.opts.on && look.planet && world.opts.realSpace !== false && world.opts.curGlobe !== false && S.planets[S.cur].r * Math.pow(ZK, cam.z) >= 2) bentGk = sstep((-cam.z - .6) / .6); }   // H1 calmBent: curGlobe's gk, known before the layers draw
    drawLayer(world.layer(d0), Math.pow(ZK, f), A, Qz);
    if (f > .001) { const rMax = Math.max(Math.hypot(A.x, A.y), Math.hypot(W - A.x, A.y), Math.hypot(A.x, H - A.y), Math.hypot(W - A.x, H - A.y)), rc = rMax * Math.pow(ZK, f - 1) * 1.02;
      const pl = d0 + 1 === 0 && PB > 0;   // zooming out of home with the planet on: home's sky fades, its ground becomes the planet (below)
      const zA = Math.min(1, f * f * (3 - 2 * f) * 1.15) * (pl ? 1 - PB : 1), WO = world.opts;
      // v0.0.31 H3 (Wilbow "pinch looks weird": the mid-pinch dark disc): zoomSkyOnce = while skyHold holds the sky, the inner layer (not home) draws no sky of its own (its opaque dark radial bg was the disc), only its ridges / ground over the one held sky;
      // zoomFeather = the circle's edge is a soft radial fade (opaque to .85 rc, 0 at rc): the inner layer draws on its own canvas, masked, then one blit (only while the edge is on screen)
      if (zA > .01) { const nS = WO.zoomSkyOnce !== false && R.skyHk > 0 && d0 + 1 !== 0, L1 = world.layer(d0 + 1), s1 = Math.pow(ZK, f - 1);
        if (WO.zoomFeather !== false && rc * .85 < rMax) { if (!zfc) { zfc = document.createElement('canvas'); zfx = zfc.getContext('2d'); } if (zfc.width !== bgc.width || zfc.height !== bgc.height) { zfc.width = bgc.width; zfc.height = bgc.height; }
          zfx.setTransform(1, 0, 0, 1, 0, 0); zfx.globalAlpha = 1; zfx.globalCompositeOperation = 'source-over'; zfx.clearRect(0, 0, zfc.width, zfc.height); zfx.setTransform(bs, 0, 0, bs, 0, 0);
          c = zfx; c.save(); c.beginPath(); c.arc(A.x, A.y, rc, 0, 7); c.clip(); drawLayer(L1, s1, A, Qz, pl, nS); c.restore();
          const fm = zfx.createRadialGradient(A.x, A.y, rc * .85, A.x, A.y, rc); fm.addColorStop(0, 'rgba(0,0,0,1)'); fm.addColorStop(1, 'rgba(0,0,0,0)'); zfx.globalAlpha = 1; zfx.globalCompositeOperation = 'destination-in'; zfx.fillStyle = fm; zfx.fillRect(0, 0, W, H); zfx.globalCompositeOperation = 'source-over';
          c = bg2; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = zA; c.drawImage(zfc, 0, 0); c.restore(); }
        else { c.save(); c.beginPath(); c.arc(A.x, A.y, rc, 0, 7); c.clip(); c.globalAlpha = zA; drawLayer(L1, s1, A, Qz, pl, nS); c.restore(); } }
      if (world.opts.noZoomRing === false) { c.strokeStyle = `hsla(${world.layer(d0 + 1).hue},90%,70%,${.25 * (1 - f) * (pl ? 1 - PB : 1)})`; c.lineWidth = 2; c.beginPath(); c.arc(A.x, A.y, rc, 0, 7); c.stroke(); } }   // v0.0.29 noZoomRing: no outline on the zoom circle's edge (off = v0.0.28 ring)
    const SY = world.system && world.system.opts.on && PB > 0 && cam.z < -.5, hs = R.hs || (R.hs = { x: 0, y: 0 });
    const spK = SY && world.opts.spaceFadeIn !== false ? sstep((-cam.z - .5) / .35) : 1;   // v0.0.29 spaceFadeIn: past z -.5 the system (other planets, star, galaxy) and the home planet's shift fade in over .35 of a layer (off = v0.0.28: all popped in on one frame at z -.5)
    if (SY) { const s0 = performance.now(), a0 = c.globalAlpha; c.globalAlpha = a0 * spK; drawSpace(A, t); c.globalAlpha = a0; if (world.zl) world.zl.draw(c); world.system.homeShift(H, A, t, hs); hs.x *= spK; hs.y *= spK; R.spaceMs = (R.spaceMs || 0) * .95 + (performance.now() - s0) * .05; } else { hs.x = hs.y = 0; }
    if (lxK > .003 && world.opts.landShiftEase !== false) { hs.x += (lxH.x - hs.x) * lxK; hs.y += (lxH.y - hs.y) * lxK; }   // v0.0.30 landShiftEase: during landXfade the home shift eases from where the old frame had it, so the new globe starts under the fading snapshot (no faint double globe); off = it jumps
    if (PB > 0 && cam.z < 0) { const S = world.system, rr = (S ? S.planets[S.cur].r : 0) * Math.pow(ZK, cam.z), cx = A.x + hs.x, cy = A.y + hs.y + Math.pow(ZK, cam.z) * (world.floorF() * H) + rr;
      if (!SY || (cx > -rr && cx < W + rr && cy > -rr && cy < H + rr)) { if (hs.x || hs.y) { c.save(); c.translate(hs.x, hs.y); drawPlanet(A, Qz); c.restore(); } else drawPlanet(A, Qz);
        // v0.0.29 curGlobe: the planet you are on keeps Visuals' real globe out in space (as every other planet has), fading to the bent ridges over z -1.2 .. -.6
        // (off = v0.0.28: the flat disc + rim; landing swapped the real globe for it on one frame)
        const gk = S && SY && look.planet && world.opts.realSpace !== false && world.opts.curGlobe !== false && rr >= 2 ? sstep((-cam.z - .6) / .6) : 0;
        if (gk > .01) { const p = S.planets[S.cur], L = world.home, q = PQ, a0 = c.globalAlpha; q.seed = p.seed >>> 0; q.id = S.key(p.i); q.r = rr; q.style = world.styleOf ? world.styleOf(L) : world.terrOf ? (world.terrOf(L) || {}).style : null; q.heal = p.sum ? p.sum.heal : undefined;
          S.screen(0, 0, sp1); st.light = SL; SL.x = sp1.x; SL.y = sp1.y; c.globalAlpha = a0 * gk * spK; look.planet(c, q, cx, cy, rr, st); st.light = undefined; c.globalAlpha = a0; } } }
    // v0.0.29 landXfade: landing on another planet re-makes the layers in its colours on one frame; the last frame before it fades out over 8 frames
    // on top (frames, not seconds: the picture under it keeps zooming, so a long fade would leave a ghost; one image draw while it lasts; off = v0.0.28 hard cut)
    if (lxK > .003) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = lxK; c.drawImage(lxc, 0, 0); c.restore(); }
    // big musical moment: a soft additive colour bloom from the anchor (one gradient)
    if (st.burst > .05) { const rb = Math.max(W, H) * Math.max(.05, .4 + (1 - Math.min(1, st.burst)) * .9), bl = c.createRadialGradient(A.x, A.y, 0, A.x, A.y, rb); bl.addColorStop(0, `hsla(${(world.layer(d0).hue + 180 + t * 40) % 360},95%,60%,${.22 * st.burst * (.4 + tripL)})`); bl.addColorStop(1, 'hsla(0,0%,0%,0)');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = bl; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (R.under) { g.save(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; try { R.under(g); } catch (e) { R.underErr = String(e); } g.restore(); }   // v0.0.25: what sits ON the ground under the ohms (systems' plants): drawn before every ohm, so an ohm is always in front of the plants
    // v0.0.9: as the ground bends into the planet the flat-placed ohms fade and reappear as specks on the curved surface
    const PBo = world.planet && world.opts.planet && cam.z < 0 ? world.planet.bend : 0, ohmK = world.opts.ohmFadeWide !== false ? 1 - sstep(PBo / .65) : 1 - Math.min(1, PBo * 2.2);   // v0.0.29 ohmFadeWide: the flat ohms fade smoothly over bend 0 .. .65 (off = v0.0.28: linear, gone at .45)
    if (PBo > .05) { const hs = R.hs; if (hs && (hs.x || hs.y)) { g.save(); g.translate(hs.x, hs.y); specks(PBo, A); g.restore(); } else specks(PBo, A); }
    if (ohmVisible() && L.R > .5 && ohmK > .01) { g.globalAlpha = Math.max(0, Math.min(1, (.92 - cam.z) / .3, (cam.z + 2.6) / .5)) * ohmK;
      // waveform ring (the real output, drawn around the focus ohm)
      const sc = readScope && readScope(), rr0 = L.Rb * ((o.g ? o.g.r : 1) + .45), sa = .12 + o.ring * .5;
      if (sc && !(look.scope && look.scope(g, o, L.cx, L.cy, rr0, sc, st) === true)) { const nl = noLine('lnScope'); g.beginPath(); const n = 160, rr = rr0; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, s = sc[Math.floor(i / n * (sc.length - 1))] || 0, r = rr * (1 + Math.max(-.4, Math.min(.4, s * 1.6))); const x = L.cx + Math.cos(a) * r, y = L.cy + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        if (nl) { g.closePath(); g.moveTo(L.cx + rr * .55, L.cy); g.arc(L.cx, L.cy, rr * .55, 0, 6.2832, true); const gq = g.createRadialGradient(L.cx, L.cy, rr * .55, L.cx, L.cy, rr * 1.4); gq.addColorStop(0, `hsla(${o.hue},45%,72%,0)`); gq.addColorStop(.5, `hsla(${o.hue},45%,72%,${(sa * .6).toFixed(3)})`); gq.addColorStop(1, `hsla(${o.hue},45%,72%,${(sa * .3).toFixed(3)})`); g.fillStyle = gq; g.fill('evenodd'); }   // v0.0.30 B5 lnScope: the waveform is a soft filled band (shape, no line)
        else { g.strokeStyle = `hsla(${o.hue},80%,75%,${sa})`; g.lineWidth = 1.5; g.stroke(); } }
      // the ohms (ohmdraw.js, ohms track): soft rings, glow from sound, detail from the quality ladder
      // far / tiny ohms (zoomed out: a typical ohm under TINY px) go through look.bodies (1 baked draw each) instead of ohmdraw
      const px = toScreen(W, H, sim.cam, 0, 0, sp).s, tiny = look.bodies && px * .8 < TINY;
      if (!tiny && world.rare && world.rare.draw) world.rare.draw(g, W, H, look, 0);   /* rare ohms (rare.js): aura behind the body */
      if (!tiny) drawOhms(g, sim, W, H, look);
      if (!tiny && world.rare && world.rare.draw) world.rare.draw(g, W, H, look, 1);   /* rare ohms: shimmer in front */
      if ((tiny || (look.ohm && (qd < 3 || BODY_PLAN.low))) && sim.ohms.length) { vis.length = 0;
        for (const q of sim.ohms) { if (q.parked) continue; const s = toScreen(W, H, sim.cam, q.body.x, q.body.y, sp), r = (q.g ? q.g.r : 1) * s.s; if (s.x < -r || s.x > W + r || s.y < -r || s.y > H + r) continue;
          const it = pool[vis.length] || (pool[vis.length] = { x: 0, y: 0, r: 0, rgb: null, glow: 0, o: null, k: 0 }); it.x = s.x; it.y = s.y; it.r = r; it.o = q;
          it.glow = (q.glow || 0) + Math.min(1, (q.look && q.look.glow) || 0) * .6; const dx = s.x - L.cx, dy = s.y - L.cy;
          it.k = q === o ? -1e9 : -it.glow * 1e6 + dx * dx + dy * dy; vis.push(it); }   // focus first, then brightest, then nearest to it (glows are capped per rung)
        vis.sort(byK);
        if (tiny) { for (const it of vis) it.rgb = rgbOf(it.o.hue || 0, .62, .5 + Math.min(.2, it.glow * .15)); look.bodies(g, vis); }
        else { const n = Math.min(vis.length, LOOKN[qd] || 0), pz = world.opts.ohmPost !== false; for (let i = 0; i < n; i++) { const it = vis[i]; if (pz) st.post = (R.postOf || postOf)(it.o); look.ohm(g, it.o, it.x, it.y, it.r, st); } st.post = undefined; } }   /* v0.0.30 D ohmPost: st.post = what this ohm is doing (main.js R.postOf knows jams / songs / bystanders; off = look infers) */   // the rest keep ohmdraw's own shading
      if (sim.herd) sim.herd.draw(g, W, H, toScreen, look);   // v0.0.10 herd marks (only when any exist)
      // scale nodes (play mode)
      if (o.nodesOpen) for (const nd of L.nodes) { const k = o.nodeGlow[nd.deg]; if (noLine('lnNodeText')) { softDot(g, nd.x, nd.y, nd.r * (1.3 + k * .3), `${(o.hue + nd.deg * 51) % 360},40%,${55 + k * 25}%`, .35 + k * .5); if (world.opts.dev) { g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `${Math.round(nd.r * .7)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(nd.deg + 1), nd.x, nd.y); } continue; }   /* v0.0.30 G1 lnNodeText: the degree reads as colour + brightness; the number only with dev (no-text UI) */
        g.beginPath(); g.arc(nd.x, nd.y, nd.r * (1 + k * .25), 0, 7); g.fillStyle = `hsla(${(o.hue + nd.deg * 51) % 360},80%,${35 + k * 40}%,${.55 + k * .4})`; g.fill();
        if (!noLine('lnNodes')) { g.strokeStyle = `hsla(${o.hue},80%,80%,.5)`; g.lineWidth = 1; g.stroke(); } g.fillStyle = 'rgba(255,255,255,.75)';   /* v0.0.30 B6 lnNodes: no rim on the scale nodes (the number stays: it is what you play) */ g.font = `${Math.round(nd.r * .7)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(nd.deg + 1), nd.x, nd.y); }
      g.globalAlpha = 1; }
    R.dv.t = t; R.dv.st = st;   // inside an ohm (dive.js) draws LAST, over the systems + things too: R.drawDive (main.js loop)
    if (look.post) look.post(g, st);
  };
  R.dv = { t: 0, st: null };
  R.inside = () => { const D = world && world.zl && world.zl.dive; return !!(D && D.o && D.z >= 1 && D.opts.hideWorld); };
  // v0.0.24 smooth zoom (dive opts.worldFollow): between the ground and depth 1 the live world frame is scaled by 4^z about the ohm's
  // spot, onto the dive origin, so the world zooms with you into the ohm (one continuous zoom) instead of holding while the inside grows
  const fcv = document.createElement('canvas'), fg = fcv.getContext('2d', { alpha: false }); const bgp = document.createElement('canvas'), bgpx = bgp.getContext('2d', { alpha: false }); let bgpOk = false;
  let zfc = null, zfx = null, bentGk = 0;   // v0.0.31 H3 zoomFeather canvas (made on the first zoom)
  const lxc = document.createElement('canvas'), lxx = lxc.getContext('2d', { alpha: false }); let lxCur = null, lxT = 0, lxK = 0; const lxH = { x: 0, y: 0 };   // v0.0.29 landXfade
  const follow = D => { if (!D.opts.worldFollow || !(D.z > 1e-3) || (D.z >= 1 && D.opts.hideWorld)) return; const a = D.anchor && D.anchor(); if (!a) return; const cv = g.canvas;
    const k = Math.pow(4, Math.min(D.z, 1.5)), cw = cv.width, ch = cv.height, ex = dpr * (D.ox - a.x * k), ey = dpr * (D.oy - a.y * k);   // screen px = src px * k + e
    // only the part of the frame that stays on screen is copied (1/k^2 of it), then drawn once scaled
    const x0 = Math.max(0, Math.floor(-ex / k)), y0 = Math.max(0, Math.floor(-ey / k)), x1 = Math.min(cw, Math.ceil((cw - ex) / k)), y1 = Math.min(ch, Math.ceil((ch - ey) / k)), sw = x1 - x0, sh = y1 - y0;
    if (fcv.width < cw || fcv.height < ch) { fcv.width = cw; fcv.height = ch; }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    if (sw > 0 && sh > 0) { if (D.opts.followAll !== false) {   // v0.0.29: copy what you SEE - the world canvas (#bg, its own lower res) under the ohms - into a freshly cleared
        // buffer. v0.0.27 copied only the ohm canvas into this opaque buffer without clearing it: the world went black and old copies smeared as trails
        const rx = bgc.width / cw, ry = bgc.height / ch; fg.fillStyle = '#05060c'; fg.fillRect(0, 0, sw, sh); fg.imageSmoothingEnabled = true; fg.drawImage(bgpOk ? bgp : bgc, x0 * rx, y0 * ry, sw * rx, sh * ry, 0, 0, sw, sh); }
      fg.drawImage(cv, x0, y0, sw, sh, 0, 0, sw, sh); }
    const dx = x0 * k + ex, dy = y0 * k + ey, dw = sw * k, dh = sh * k;
    if (!(dx <= 0 && dy <= 0 && dx + dw >= cw && dy + dh >= ch)) { g.fillStyle = '#05060c'; g.fillRect(0, 0, cw, ch); }   // an edge of the world shows: dark space beyond it
    if (sw > 0 && sh > 0) { g.imageSmoothingEnabled = true; g.drawImage(fcv, 0, 0, sw, sh, dx, dy, dw, dh); }
    g.restore(); R.followN = (R.followN | 0) + 1; };
  R.drawDive = () => { const D = world && world.zl && world.zl.dive; if (!D || !D.o || !R.dv.st) return; follow(D); g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); D.draw(g, W, H, R.dv.t, look, R.dv.st, readScope && readScope()); g.restore(); };
  R.lookCtx = LC;   // the look's ctx object: main.js adds read-only music / song / jam data (lookfeed.js)
  return R;
}
