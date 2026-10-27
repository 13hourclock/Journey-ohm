// LOOK / thing: the REAL material look for placed things (things.js / sim.placed: fx objects, membranes, strings, bars), in place
// of plain outlines. Each thing is baked ONCE per (shape, device size, light/heal/day/trip bucket) into an exact-size sprite in
// idle time (the index.js OX queue) and drawn 1:1 with blit; per frame only the live parts are drawn on top: the fx pulse glow,
// the hit flash, a vibrating wire on a struck string, a ripple on a struck membrane, the chord-tone shimmer on a tied string.
// Until a bake is ready the last bake of that thing is drawn scaled (or a lit vector stand-in on the very first frame).
// Materials (FX names from things.js): shell = nacre + growth spiral, echo crystal = lit facets + inner echo outlines,
// ember-rock = basalt + glowing cracks, shard cluster = glass shards + glitch slice, droplet = water (fresnel rim, caustic, spec),
// seed pod = ribs + seeds, reed tube = cylinder + nodes + open ends, bubble lens = thin-film rim; membrane = taut skin + wooden rim
// + brass tacks; string = wound metal wire + pegs; bar = rosewood/metal with grain + node cords at 22.4%. Shared: shape from the
// thing's own polygon (smoothed), lit body + rim + contact shadow + spec from the ONE scene light; unhealed = muted toward dust,
// night = dim body, emissive parts kept. READ-ONLY on the world. Numbers are parameters (THING_OPTS).
import { rand01 } from './noise.js';
import { blit, devOf } from './blit.js';
export const THING_OPTS = { maxRd: 240, minRd: 4, mute: .72, dust: [150, 138, 122], tripMix: .3, pulse: .16, hitGlow: .6, nightEmit: 1, jobs: 24, swap: 3, outline: false };   // outline false (#8 Wilbow 10:06 PM MDT 'without any outlines'): no 1 px silhouette strokes; the inner rim light is wide and soft
const FXC = { rev: [230, 210, 180], dly: [170, 220, 255], dst: [255, 110, 50], glt: [200, 120, 255], cho: [120, 200, 230], trm: [170, 220, 110], cmb: [210, 190, 120], pit: [220, 240, 255] };
const EMIT = { rev: 0, dly: .55, dst: 1, glt: .35, cho: .2, trm: 0, cmb: 0, pit: .45 };
const cl = v => v < 0 ? 0 : v > 1 ? 1 : v, c255 = v => v < 0 ? 0 : v > 255 ? 255 : v | 0;
const rgb = (c, a = 1) => `rgba(${c255(c[0])},${c255(c[1])},${c255(c[2])},${a < 0 ? 0 : a > 1 ? 1 : +a.toFixed(3)})`;
const mul = (c, k, o = [0, 0, 0]) => { o[0] = c[0] * k[0]; o[1] = c[1] * k[1]; o[2] = c[2] * k[2]; return o; };
const sc = (c, k) => [c[0] * k, c[1] * k, c[2] * k], mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// smoothed path through unit points q (Float32Array x,y pairs, n points); closed = fx / membrane outlines, open = strings / bars
const path = (x, q, n, closed, k = 1, ox = 0, oy = 0) => { x.beginPath(); if (n < 2) { x.arc(ox, oy, k, 0, 6.2832); return; }
  const X = i => q[i * 2] * k + ox, Y = i => q[i * 2 + 1] * k + oy;
  if (closed) { x.moveTo((X(n - 1) + X(0)) / 2, (Y(n - 1) + Y(0)) / 2); for (let i = 0; i < n; i++) { const j = (i + 1) % n; x.quadraticCurveTo(X(i), Y(i), (X(i) + X(j)) / 2, (Y(i) + Y(j)) / 2); } x.closePath(); }
  else { x.moveTo(X(0), Y(0)); for (let i = 1; i < n - 1; i++) x.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2); x.lineTo(X(n - 1), Y(n - 1)); } };
// a point at fraction f of an open polyline's length (+ unit tangent)
const along = (q, n, f) => { let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(q[i * 2] - q[i * 2 - 2], q[i * 2 + 1] - q[i * 2 - 1]); let d = f * L;
  for (let i = 1; i < n; i++) { const dx = q[i * 2] - q[i * 2 - 2], dy = q[i * 2 + 1] - q[i * 2 - 1], s = Math.hypot(dx, dy); if (d <= s || i === n - 1) { const t = s ? Math.min(1, d / s) : 0; return [q[i * 2 - 2] + dx * t, q[i * 2 - 1] + dy * t, s ? dx / s : 1, s ? dy / s : 0]; } d -= s; }
  return [q[0], q[1], 1, 0]; };
export function createThings({ sprites, jobs, pend, opts = {} } = {}) {
  const O = { ...THING_OPTS, ...opts }, TH = { O, n: 0, baked: 0, fresh: 0, lost: 0, held: 0, fn: 0, sf: -1, sw: 0 }, MEMO = new WeakMap();
  // per-thing memo: unit points (relative to the given centre / radius), shape hash, last finished sprite
  const memo = t => { let M = MEMO.get(t); if (!M) { M = { q: new Float32Array(48), n: 0, h: 0, src: null, last: null, lastRd: 0, lastS: 0, key: '' }; MEMO.set(t, M); } return M; };
  const shape = (M, t, P, x, y, r) => { const n = Math.min(24, P ? P.length : 0); let h = 2166136261 ^ (t.kind || '').length ^ ((t.seed | 0) * 31);
    for (let i = 0; i < n; i++) { const a = (P[i][0] - x) / r, b = (P[i][1] - y) / r; M.q[i * 2] = a; M.q[i * 2 + 1] = b; h = Math.imul(h ^ Math.round(a * 64), 16777619); h = Math.imul(h ^ Math.round(b * 64), 16777619); }
    M.n = n; M.h = (h ^ (t.fx ? t.fx.charCodeAt(0) * 7 + t.fx.charCodeAt(2) : 0)) >>> 0; };
  // the bake environment: light direction (screen), sun / ambient colour (skyLight), heal, trip colour, emissive boost at night
  const envOf = (e, base) => { const m = O.mute * (1 - cl(e.heal)), lum = (base[0] * .3 + base[1] * .59 + base[2] * .11);
    let b = mixc(base, mixc([lum, lum, lum], O.dust, .5), m); if (e.tc && e.trip > .03) b = mixc(b, e.tc, cl(e.trip) * O.tripMix);
    return { b, lit: mul(b, [e.amb[0] * .5 + e.sun[0] * .72, e.amb[1] * .5 + e.sun[1] * .72, e.amb[2] * .5 + e.sun[2] * .72]), shd: mul(b, sc(e.amb, .34)), mute: m }; };
  // shared body: contact shadow, lit gradient fill, thickness shade + lit rim inside the clip, spec
  const body = (x, q, n, e, C, u, o = {}) => { const lx = e.lx, ly = e.ly;
    x.save(); x.globalAlpha = .28 * (1 - e.night * .5); path(x, q, n, true, 1, -lx * .07, -ly * .07 + .05); x.fillStyle = 'rgb(10,8,12)'; x.filter = `blur(${Math.max(1, .06 / u) | 0}px)`; x.fill(); x.restore();
    path(x, q, n, true); const g = x.createLinearGradient(lx, ly, -lx, -ly); g.addColorStop(0, rgb(C.lit, o.a == null ? 1 : o.a)); g.addColorStop(.55, rgb(mixc(C.lit, C.shd, .55), o.a == null ? 1 : o.a)); g.addColorStop(1, rgb(C.shd, o.a == null ? 1 : o.a)); x.fillStyle = g; x.fill(); };
  const rim = (x, q, n, e, C, u, w = .16, spec = .5) => { const lx = e.lx, ly = e.ly; x.save(); path(x, q, n, true); x.clip();
    x.lineWidth = w; x.strokeStyle = 'rgba(0,0,0,.35)'; path(x, q, n, true, 1, lx * w * .45, ly * w * .45); x.stroke();
    x.lineWidth = O.outline ? Math.max(u * 1.2, w * .25) : Math.max(u * 3, w * .6); x.strokeStyle = rgb(mixc(C.lit, [255, 255, 255], .45), (O.outline ? .55 : .26) * (1 - e.night * .6));   // #8 no rims: a wide soft inner rim light, not a 1 px line
    path(x, q, n, true, 1, -lx * w * .2, -ly * w * .2); x.stroke(); x.restore();
    if (spec > 0) { const hx = lx * .42, hy = ly * .42, s = x.createRadialGradient(hx, hy, 0, hx, hy, .34); s.addColorStop(0, rgb(mixc(e.sun255, [255, 255, 255], .4), spec * (1 - e.night * .7))); s.addColorStop(1, 'rgba(255,255,255,0)');
      x.save(); path(x, q, n, true); x.clip(); x.fillStyle = s; x.fillRect(-1.5, -1.5, 3, 3); x.restore(); }
    if (O.outline) { x.lineWidth = u * 1; x.strokeStyle = rgb(sc(C.shd, .6), .7); path(x, q, n, true); x.stroke(); } };
  const clip = (x, q, n, f) => { x.save(); path(x, q, n, true); x.clip(); f(); x.restore(); };
  const emitK = e => .35 + .65 * Math.max(e.night, 1 - e.dayLit) * O.nightEmit;
  const PAINT = {
    rev(x, q, n, e, C, u, sd) { body(x, q, n, e, C, u); clip(x, q, n, () => {   // shell: nacre, growth spiral from a focus, radial ribs, iridescent sheen
      const fx = (rand01(sd, 1) - .5) * .5, fy = .25 + rand01(sd, 2) * .3; x.lineWidth = u * 1.1; x.strokeStyle = rgb(sc(C.shd, .7), .45);
      for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(fx, fy, .18 + k * .17, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); }
      x.strokeStyle = rgb(C.lit, .35); for (let k = 0; k < 9; k++) { const a = Math.PI * (1.05 + k * .1); x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + Math.cos(a) * 1.6, fy + Math.sin(a) * 1.6); x.stroke(); }
      const ir = x.createLinearGradient(-1, -1, 1, 1); ir.addColorStop(0, 'rgba(255,170,210,.0)'); ir.addColorStop(.35, 'rgba(255,170,210,.16)'); ir.addColorStop(.55, 'rgba(150,230,255,.16)'); ir.addColorStop(.75, 'rgba(255,230,150,.14)'); ir.addColorStop(1, 'rgba(255,255,255,0)');
      x.globalAlpha = 1 - C.mute * .8; x.fillStyle = ir; x.fillRect(-1.5, -1.5, 3, 3); }); rim(x, q, n, e, C, u, .14, .6); },
    dly(x, q, n, e, C, u, sd) {   // echo crystal: flat-lit facets fanned from an off-centre apex, bright edges, inner echo outlines, core glow
      body(x, q, n, e, C, u, { a: .55 }); const ax = e.lx * .18, ay = e.ly * .18, st = Math.max(2, Math.round(n / 7));
      clip(x, q, n, () => { for (let i = 0; i < n; i += st) { const j = Math.min(n, i + st) % n, x0 = q[i * 2] * 1.3, y0 = q[i * 2 + 1] * 1.3, x1 = q[j * 2] * 1.3, y1 = q[j * 2 + 1] * 1.3;
        const mx = (x0 + x1) / 2 - ax, my = (y0 + y1) / 2 - ay, l = Math.hypot(mx, my) || 1, d = cl(.5 + .5 * (mx * e.lx + my * e.ly) / l);
        x.beginPath(); x.moveTo(ax, ay); x.lineTo(x0, y0); x.lineTo(x1, y1); x.closePath(); x.fillStyle = rgb(mixc(C.shd, mixc(C.lit, [255, 255, 255], .3), d), .5); x.fill();
        x.lineWidth = u * 1; x.strokeStyle = rgb(mixc(C.lit, [255, 255, 255], .6), .55 * (1 - e.night * .4)); x.stroke(); }
        x.lineWidth = u * 1; for (const k of [.72, .48, .26]) { x.strokeStyle = rgb(mixc(C.b, [255, 255, 255], .5), .32 * k + .1); path(x, q, n, true, k, ax * (1 - k), ay * (1 - k)); x.stroke(); }
        const cg = x.createRadialGradient(ax * .5, ay * .5, 0, ax * .5, ay * .5, .7); cg.addColorStop(0, rgb(mixc(C.b, [255, 255, 255], .5), .55 * emitK(e) * (1 - C.mute * .6))); cg.addColorStop(1, rgb(C.b, 0)); x.fillStyle = cg; x.fillRect(-1.5, -1.5, 3, 3); });
      rim(x, q, n, e, C, u, .1, .7); },
    dst(x, q, n, e, C, u, sd) {   // ember-rock: dark basalt, pitted speckle, glowing cracks (emissive: kept at night)
      const B = { ...C, lit: mul([86, 76, 72], [e.amb[0] * .5 + e.sun[0] * .72, e.amb[1] * .5 + e.sun[1] * .72, e.amb[2] * .5 + e.sun[2] * .72]), shd: mul([40, 34, 34], sc(e.amb, .5)) };
      body(x, q, n, e, B, u); clip(x, q, n, () => { for (let i = 0; i < 90; i++) { const a = rand01(sd, 10 + i) * 2 - 1, b = rand01(sd, 200 + i) * 2 - 1, s = (.02 + rand01(sd, 400 + i) * .05);
        x.fillStyle = rand01(sd, 600 + i) > .5 ? 'rgba(0,0,0,.28)' : rgb(B.lit, .3); x.beginPath(); x.arc(a, b, s, 0, 6.2832); x.fill(); }
        const ek = emitK(e) * (1 - C.mute * .7), hot = mixc(C.b, [255, 220, 120], .35); x.lineCap = 'round';
        for (let c = 0; c < 4; c++) { let px = (rand01(sd, 900 + c) - .5) * .3, py = (rand01(sd, 950 + c) - .5) * .3, a = rand01(sd, 980 + c) * 6.28; x.beginPath(); x.moveTo(px, py);
          for (let s = 0; s < 6; s++) { a += (rand01(sd, 1000 + c * 10 + s) - .5) * 1.4; px += Math.cos(a) * .2; py += Math.sin(a) * .2; x.lineTo(px, py); }
          x.strokeStyle = rgb(C.b, .35 * ek); x.lineWidth = u * 4; x.stroke(); x.strokeStyle = rgb(hot, .9 * ek); x.lineWidth = u * 1.3; x.stroke(); } });
      rim(x, q, n, e, B, u, .18, .25); },
    glt(x, q, n, e, C, u, sd) {   // shard cluster: glass shards from a base, each flat-lit, bright edges; a glitch slice
      body(x, q, n, e, C, u, { a: .3 }); clip(x, q, n, () => { const by = .7, N = 7;
        for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + (i / (N - 1) - .5) * 1.9 + (rand01(sd, 30 + i) - .5) * .3, L = 1.1 + rand01(sd, 50 + i) * .7, w = .12 + rand01(sd, 70 + i) * .12, bx = (i / (N - 1) - .5) * .9;
          const tx = bx + Math.cos(a) * L, ty = by + Math.sin(a) * L, nx = -Math.sin(a), ny = Math.cos(a);
          for (const sgn of [1, -1]) { const d = cl(.5 + .5 * sgn * (nx * e.lx + ny * e.ly)); x.beginPath(); x.moveTo(bx, by); x.lineTo(tx, ty); x.lineTo(bx + nx * w * sgn, by + ny * w * sgn); x.closePath();
            x.fillStyle = rgb(mixc(C.shd, mixc(C.lit, [255, 255, 255], .35), d), .78); x.fill(); }
          x.beginPath(); x.moveTo(bx, by); x.lineTo(tx, ty); x.lineWidth = u * 1; x.strokeStyle = rgb([255, 255, 255], .55 * (1 - e.night * .5)); x.stroke(); }
        const ek = emitK(e) * (1 - C.mute * .7), cg = x.createRadialGradient(0, .3, 0, 0, .3, .8); cg.addColorStop(0, rgb(C.b, .35 * ek)); cg.addColorStop(1, rgb(C.b, 0)); x.fillStyle = cg; x.fillRect(-1.5, -1.5, 3, 3); });
      rim(x, q, n, e, C, u, .08, .5);
      const W = x.canvas.width, H = x.canvas.height, y0 = (H * (.35 + rand01(sd, 90) * .3)) | 0, h = Math.max(2, H * .05 | 0); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = .7; x.drawImage(x.canvas, 0, y0, W, h, Math.round(W * .03), y0, W, h); x.restore(); },
    cho(x, q, n, e, C, u, sd) {   // droplet: water — faint body, fresnel rim, caustic on the far side, sharp spec + a small second one
      const lx = e.lx, ly = e.ly; x.save(); x.globalAlpha = .22; path(x, q, n, true, 1, -lx * .06, .08); x.fillStyle = 'rgb(10,20,30)'; x.filter = `blur(${Math.max(1, .06 / u) | 0}px)`; x.fill(); x.restore();
      clip(x, q, n, () => { const g = x.createRadialGradient(0, 0, .2, 0, 0, 1.05); g.addColorStop(0, rgb(C.lit, .25)); g.addColorStop(.75, rgb(mixc(C.lit, C.shd, .4), .45)); g.addColorStop(1, rgb(C.shd, .85)); x.fillStyle = g; x.fillRect(-1.5, -1.5, 3, 3);
        const c = x.createRadialGradient(-lx * .5, -ly * .5, 0, -lx * .5, -ly * .5, .55); c.addColorStop(0, rgb(mixc(C.lit, [255, 255, 255], .5), .55 * (1 - e.night * .5))); c.addColorStop(1, rgb(C.lit, 0)); x.fillStyle = c; x.fillRect(-1.5, -1.5, 3, 3);
        x.strokeStyle = rgb(mixc(C.lit, [255, 255, 255], .3), .3); x.lineWidth = .08; path(x, q, n, true, .9, -lx * .05, -ly * .05); x.stroke(); });
      if (O.outline) { x.lineWidth = u * 1; x.strokeStyle = rgb(mixc(C.lit, [255, 255, 255], .5), .5); path(x, q, n, true); x.stroke(); }
      const s = x.createRadialGradient(lx * .42, ly * .42, 0, lx * .42, ly * .42, .2); s.addColorStop(0, `rgba(255,255,255,${.95 * (1 - e.night * .6)})`); s.addColorStop(.35, `rgba(255,255,255,${.4 * (1 - e.night * .6)})`); s.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = s; x.fillRect(-1.5, -1.5, 3, 3); x.fillStyle = `rgba(255,255,255,${.5 * (1 - e.night * .6)})`; x.beginPath(); x.arc(-lx * .35 + ly * .2, -ly * .35 - lx * .2, .05, 0, 6.2832); x.fill(); },
    trm(x, q, n, e, C, u, sd) {   // seed pod: organic body, meridian ribs, seeds glimpsed on the lit side, a stem nub
      body(x, q, n, e, C, u); clip(x, q, n, () => { x.lineWidth = u * 1.4;
        for (const k of [.2, .45, .7]) { x.save(); x.scale(k, 1); x.strokeStyle = rgb(sc(C.shd, .7), .5); path(x, q, n, true); x.stroke(); x.restore(); x.save(); x.scale(k, 1); x.translate(-e.lx * .03 / k, 0); x.strokeStyle = rgb(C.lit, .3); path(x, q, n, true); x.stroke(); x.restore(); }
        for (let i = 0; i < 9; i++) { const a = rand01(sd, 300 + i) * 6.28, d = .25 + rand01(sd, 320 + i) * .35, sx = e.lx * .25 + Math.cos(a) * d * .6, sy = e.ly * .25 + Math.sin(a) * d;
          x.fillStyle = rgb(mixc(C.shd, [60, 40, 20], .5), .45); x.beginPath(); x.ellipse(sx, sy, .07, .045, a, 0, 6.2832); x.fill(); } });
      rim(x, q, n, e, C, u, .18, .45);
      let ty = 0, tx = 0; for (let i = 0; i < n; i++) if (q[i * 2 + 1] < ty) { ty = q[i * 2 + 1]; tx = q[i * 2]; }
      x.strokeStyle = rgb(mixc(C.shd, [90, 70, 40], .5), .9); x.lineWidth = u * 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(tx, ty + .02); x.quadraticCurveTo(tx + .08, ty - .12, tx + .16, ty - .16); x.stroke(); },
    cmb(x, q, n, e, C, u, sd) {   // reed tube: cylinder shading across the long axis, nodes, dark open ends
      let ax = 1, ay = 0, best = 0; for (let i = 0; i < n; i++) { const d = q[i * 2] * q[i * 2] + q[i * 2 + 1] * q[i * 2 + 1]; if (d > best) { best = d; ax = q[i * 2]; ay = q[i * 2 + 1]; } }
      const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l; const nx = -ay, ny = ax, side = nx * e.lx + ny * e.ly >= 0 ? 1 : -1;
      x.save(); x.globalAlpha = .26 * (1 - e.night * .5); path(x, q, n, true, 1, -e.lx * .07, -e.ly * .07 + .05); x.fillStyle = 'rgb(10,8,12)'; x.filter = `blur(${Math.max(1, .06 / u) | 0}px)`; x.fill(); x.restore();
      path(x, q, n, true); const g = x.createLinearGradient(nx * side, ny * side, -nx * side, -ny * side); g.addColorStop(0, rgb(C.shd)); g.addColorStop(.18, rgb(C.lit)); g.addColorStop(.32, rgb(mixc(C.lit, [255, 255, 255], .25))); g.addColorStop(.6, rgb(mixc(C.lit, C.shd, .5))); g.addColorStop(1, rgb(sc(C.shd, .8))); x.fillStyle = g; x.fill();
      clip(x, q, n, () => { x.lineWidth = u * 1; x.strokeStyle = rgb(sc(C.shd, .8), .35); for (let k = -6; k <= 6; k++) { const o = k * .06; x.beginPath(); x.moveTo(-ax * 1.5 + nx * o, -ay * 1.5 + ny * o); x.lineTo(ax * 1.5 + nx * o, ay * 1.5 + ny * o); x.stroke(); }
        for (const f of [-.5, .1, .62]) { x.lineWidth = u * 2.4; x.strokeStyle = rgb(sc(C.shd, .75), .8); x.beginPath(); x.moveTo(ax * f - nx * 1.2, ay * f - ny * 1.2); x.lineTo(ax * f + nx * 1.2, ay * f + ny * 1.2); x.stroke();
          x.lineWidth = u * 1; x.strokeStyle = rgb(C.lit, .55); x.beginPath(); x.moveTo(ax * (f + .03) - nx * 1.2, ay * (f + .03) - ny * 1.2); x.lineTo(ax * (f + .03) + nx * 1.2, ay * (f + .03) + ny * 1.2); x.stroke(); }
        for (const s of [1, -1]) { x.fillStyle = 'rgba(20,14,8,.75)'; x.beginPath(); x.ellipse(ax * .93 * s, ay * .93 * s, .08, .22, Math.atan2(ay, ax), 0, 6.2832); x.fill(); } });
      if (O.outline) { x.lineWidth = u * 1; x.strokeStyle = rgb(sc(C.shd, .6), .7); path(x, q, n, true); x.stroke(); } },
    pit(x, q, n, e, C, u, sd) {   // bubble lens: nearly clear, thin-film rim (shifting hues), window spec + a small one
      clip(x, q, n, () => { const g = x.createRadialGradient(0, 0, .5, 0, 0, 1.05); g.addColorStop(0, rgb(C.lit, .05)); g.addColorStop(.8, rgb(C.lit, .12)); g.addColorStop(1, rgb(C.lit, .35)); x.fillStyle = g; x.fillRect(-1.5, -1.5, 3, 3);
        const ek = (1 - C.mute * .7), f = x.createLinearGradient(-1, -1, 1, 1); f.addColorStop(0, `rgba(255,120,200,${.6 * ek})`); f.addColorStop(.3, `rgba(255,230,120,${.55 * ek})`); f.addColorStop(.55, `rgba(120,255,200,${.55 * ek})`); f.addColorStop(.8, `rgba(120,160,255,${.6 * ek})`); f.addColorStop(1, `rgba(255,120,200,${.6 * ek})`);
        x.lineWidth = .12; x.strokeStyle = f; path(x, q, n, true, .97); x.stroke(); x.lineWidth = .05; x.globalAlpha = .5; path(x, q, n, true, .86); x.stroke(); x.globalAlpha = 1;
        const lx = e.lx, ly = e.ly; x.fillStyle = `rgba(255,255,255,${.55 * (1 - e.night * .6)})`; x.save(); x.translate(lx * .45, ly * .45); x.rotate(Math.atan2(ly, lx) + Math.PI / 2); x.beginPath(); x.ellipse(0, 0, .22, .08, 0, 0, 6.2832); x.fill(); x.restore();
        x.fillStyle = `rgba(255,255,255,${.35 * (1 - e.night * .6)})`; x.beginPath(); x.arc(-lx * .5, -ly * .5, .06, 0, 6.2832); x.fill(); });
      if (O.outline) { x.lineWidth = u * 1; x.strokeStyle = rgb(mixc(C.lit, [255, 255, 255], .5), .6); path(x, q, n, true); x.stroke(); } },
    membrane(x, q, n, e, C, u, sd) {   // taut skin (lighter centre, fibre), wooden rim band, brass tacks
      const skin = { ...C, lit: mul(C.b, [e.amb[0] * .55 + e.sun[0] * .75, e.amb[1] * .55 + e.sun[1] * .75, e.amb[2] * .55 + e.sun[2] * .75]) }; body(x, q, n, e, skin, u);
      clip(x, q, n, () => { const g = x.createRadialGradient(e.lx * .2, e.ly * .2, 0, 0, 0, 1); g.addColorStop(0, rgb([255, 250, 235], .35 * (1 - e.night * .6))); g.addColorStop(.7, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(-1.5, -1.5, 3, 3);
        x.lineWidth = u * .8; for (let i = 0; i < 40; i++) { const a = rand01(sd, 500 + i) * 6.28, px = (rand01(sd, 540 + i) - .5) * 1.6, py = (rand01(sd, 580 + i) - .5) * 1.6; x.strokeStyle = rgb(sc(C.shd, .8), .12); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * .25, py + Math.sin(a) * .25); x.stroke(); } });
      const wood = mul([150, 96, 58], [e.amb[0] * .5 + e.sun[0] * .72, e.amb[1] * .5 + e.sun[1] * .72, e.amb[2] * .5 + e.sun[2] * .72]), rw = Math.max(u * 4, .1);
      x.lineJoin = 'round'; x.lineWidth = rw + u * 2; x.strokeStyle = rgb(sc(wood, .35)); path(x, q, n, true); x.stroke();
      const wg = x.createLinearGradient(e.lx, e.ly, -e.lx, -e.ly); wg.addColorStop(0, rgb(mixc(wood, [255, 230, 190], .25))); wg.addColorStop(1, rgb(sc(wood, .45))); x.lineWidth = rw; x.strokeStyle = wg; x.stroke();
      x.lineWidth = u * 1; x.strokeStyle = rgb(mixc(wood, [255, 240, 210], .5), .5 * (1 - e.night * .6)); path(x, q, n, true, 1, -e.lx * rw * .25, -e.ly * rw * .25); x.stroke();
      const brass = mul([214, 176, 92], [e.amb[0] * .5 + e.sun[0] * .8, e.amb[1] * .5 + e.sun[1] * .8, e.amb[2] * .5 + e.sun[2] * .8]);
      for (let i = 0; i < n; i += 2) { const px = q[i * 2], py = q[i * 2 + 1], s = Math.max(u * 1.6, .035); x.fillStyle = rgb(sc(brass, .55)); x.beginPath(); x.arc(px, py, s, 0, 6.2832); x.fill(); x.fillStyle = rgb(mixc(brass, [255, 255, 255], .4)); x.beginPath(); x.arc(px + e.lx * s * .35, py + e.ly * s * .35, s * .45, 0, 6.2832); x.fill(); } },
    string(x, q, n, e, C, u, sd) {   // wound metal wire: soft shadow, dark core, light winding, spec line toward the light; brass pegs
      const steel = mixc([196, 200, 210], C.b, .25), lit = mul(steel, [e.amb[0] * .45 + e.sun[0] * .8, e.amb[1] * .45 + e.sun[1] * .8, e.amb[2] * .45 + e.sun[2] * .8]), w = u * 2.2; x.lineCap = 'round'; x.lineJoin = 'round';
      x.save(); x.globalAlpha = .3 * (1 - e.night * .5); x.filter = `blur(${Math.max(1, u * 2 / u * .6) | 0}px)`; x.lineWidth = w * 1.2; x.strokeStyle = 'rgb(10,8,12)'; path(x, q, n, false, 1, -e.lx * u * 4, -e.ly * u * 4 + u * 3); x.stroke(); x.restore();
      x.lineWidth = w + u; x.strokeStyle = rgb(sc(lit, .35)); path(x, q, n, false); x.stroke(); x.lineWidth = w; x.strokeStyle = rgb(lit); x.stroke();
      x.setLineDash([u * 1, u * 1.2]); x.lineWidth = w * .9; x.strokeStyle = rgb(sc(lit, .6), .6); x.stroke(); x.setLineDash([]);
      x.lineWidth = Math.max(u * .7, w * .3); x.strokeStyle = rgb(mixc(lit, [255, 255, 255], .6), .85 * (1 - e.night * .5)); path(x, q, n, false, 1, e.lx * w * .25, e.ly * w * .25); x.stroke();
      const brass = mul([214, 176, 92], [e.amb[0] * .5 + e.sun[0] * .8, e.amb[1] * .5 + e.sun[1] * .8, e.amb[2] * .5 + e.sun[2] * .8]);
      for (const i of [0, n - 1]) { const px = q[i * 2], py = q[i * 2 + 1], s = u * 4.5; const g = x.createRadialGradient(px + e.lx * s * .4, py + e.ly * s * .4, 0, px, py, s); g.addColorStop(0, rgb(mixc(brass, [255, 255, 255], .4))); g.addColorStop(.6, rgb(brass)); g.addColorStop(1, rgb(sc(brass, .45)));
        x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.arc(px - e.lx * u * 2, py - e.ly * u * 2 + u * 2, s, 0, 6.2832); x.fill(); x.fillStyle = g; x.beginPath(); x.arc(px, py, s, 0, 6.2832); x.fill(); x.fillStyle = 'rgba(20,14,8,.8)'; x.beginPath(); x.arc(px, py, s * .3, 0, 6.2832); x.fill(); } },
    bar(x, q, n, e, C, u, sd) {   // tone bar: rosewood (or the fx colour tinted) with grain, shadow, lit top edge, node cords at 22.4% / 77.6%
      const wood = mixc([150, 78, 52], C.b, .25), lit = mul(wood, [e.amb[0] * .5 + e.sun[0] * .75, e.amb[1] * .5 + e.sun[1] * .75, e.amb[2] * .5 + e.sun[2] * .75]), w = u * 7; x.lineCap = 'butt'; x.lineJoin = 'round';
      x.save(); x.globalAlpha = .3 * (1 - e.night * .5); x.filter = 'blur(2px)'; x.lineWidth = w; x.strokeStyle = 'rgb(10,8,12)'; path(x, q, n, false, 1, -e.lx * u * 4, -e.ly * u * 4 + u * 4); x.stroke(); x.restore();
      x.lineWidth = w + u * 1.5; x.strokeStyle = rgb(sc(lit, .35)); path(x, q, n, false); x.stroke(); x.lineWidth = w; x.strokeStyle = rgb(lit); x.stroke();
      for (let k = 0; k < 4; k++) { const o = (k - 1.5) * w * .22 + (rand01(sd, 700 + k) - .5) * u; x.lineWidth = u * .8; x.strokeStyle = rgb(sc(lit, .62), .55); path(x, q, n, false, 1, -0 + o * .0, o); x.stroke(); }
      x.lineWidth = u * 1.6; x.strokeStyle = rgb(mixc(lit, [255, 235, 200], .45), .7 * (1 - e.night * .5)); path(x, q, n, false, 1, e.lx * w * .32, e.ly * w * .32); x.stroke();
      x.lineWidth = u * 1.6; x.strokeStyle = rgb(sc(lit, .4), .6); path(x, q, n, false, 1, -e.lx * w * .38, -e.ly * w * .38); x.stroke();
      for (const f of [.224, .776]) { const [px, py, tx, ty] = along(q, n, f), nx = -ty * w * .75, ny = tx * w * .75; x.lineWidth = u * 2; x.strokeStyle = 'rgba(28,20,14,.9)'; x.beginPath(); x.moveTo(px - nx, py - ny); x.lineTo(px + nx, py + ny); x.stroke();
        x.lineWidth = u * .8; x.strokeStyle = rgb([230, 220, 200], .5 * (1 - e.night * .5)); x.beginPath(); x.moveTo(px - nx + tx * u, py - ny + ty * u); x.lineTo(px + nx + tx * u, py + ny + ty * u); x.stroke(); } },
  };
  // paint a bake: device square w = 2S, unit = Rd device px, centre at S
  const paintOf = (kind, fx, q, n, e, base, sd, Rd, S, dpr) => (x, w) => { x.save(); x.setTransform(Rd, 0, 0, Rd, S, S); const u = dpr / Rd, C = envOf(e, base);
    const f = PAINT[kind === 'fx' ? (PAINT[fx] ? fx : 'rev') : kind] || PAINT.rev; f(x, q, n, e, C, u, sd >>> 0); x.restore(); TH.baked++;
    if (x.getImageData) try { x.getImageData(S | 0, S | 0, 1, 1); } catch (er) { } };   // force the deferred raster NOW (idle), not on the first blit in a frame
  // lit vector stand-in (first frame only, until the bake lands): gradient body + rim, or a lit stroke for strings / bars
  const vector = (g, t, P, e, base, x, y, r) => { const C = envOf(e, base); g.save(); g.beginPath();
    if (t.kind === 'string' || t.kind === 'bar') { for (let i = 0; i < P.length; i++) i ? g.lineTo(P[i][0], P[i][1]) : g.moveTo(P[i][0], P[i][1]); g.lineCap = 'round'; g.lineWidth = t.kind === 'bar' ? 7 : 2.2; g.strokeStyle = rgb(C.lit); g.stroke(); }
    else { for (let i = 0; i < P.length; i++) i ? g.lineTo(P[i][0], P[i][1]) : g.moveTo(P[i][0], P[i][1]); g.closePath(); const gr = g.createLinearGradient(x + e.lx * r, y + e.ly * r, x - e.lx * r, y - e.ly * r); gr.addColorStop(0, rgb(C.lit)); gr.addColorStop(1, rgb(C.shd)); g.fillStyle = gr; g.fill(); g.lineWidth = 1; g.strokeStyle = rgb(sc(C.shd, .6)); g.stroke(); }
    g.restore(); };
  // the frame-varying parts (cheap vector / glow sprite): fx pulse + hit glow, string vibration, membrane ripple, chord shimmer
  const live = (g, t, P, e, base, x, y, r, s) => { const glow = cl(s.glow || 0), now = s.now || 0, K = t.kind, emit = K === 'fx' ? (EMIT[t.fx] || 0) : 0, m = 1 - O.mute * (1 - cl(e.heal)) * .8;
    const pu = K === 'fx' ? .5 + .5 * Math.sin(now / 900 + (t.seed % 100)) : 0, a = (O.pulse * pu * (.4 + emit * emitK(e)) + O.hitGlow * glow) * m;
    if (a > .01 && sprites && sprites.glow) { const gr = r * (K === 'string' || K === 'bar' ? 1.1 : 1.7), sp = sprites.glow(base[0], base[1], base[2], gr, .5); if (sp) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a); g.drawImage(sp, x - gr, y - gr, gr * 2, gr * 2); g.restore(); } }
    if (K === 'string' && P.length > 1 && (glow > .01 || (t.tied && s.chord > .01))) { const n = P.length, ax = P[n - 1][0] - P[0][0], ay = P[n - 1][1] - P[0][1], l = Math.hypot(ax, ay) || 1, nx = -ay / l, ny = ax / l;
      g.save(); g.lineCap = 'round'; for (const ph of [0, Math.PI]) { g.beginPath(); for (let i = 0; i < n; i++) { const f = i / (n - 1), d = (glow * 3.5 * Math.sin(now / 16 + ph) + (s.chord || 0) * .8 * Math.sin(now / 40 + ph)) * Math.sin(Math.PI * f); i ? g.lineTo(P[i][0] + nx * d, P[i][1] + ny * d) : g.moveTo(P[i][0] + nx * d, P[i][1] + ny * d); }
        g.lineWidth = 1.6; g.strokeStyle = rgb(mixc([230, 236, 255], base, .3), (.35 * glow + .25 * (s.chord || 0)) * m); g.stroke(); } g.restore(); }
    if (K === 'membrane' && glow > .02 && P.length > 2) { const k = 1 - glow * .75; g.save(); g.beginPath(); for (let i = 0; i < P.length; i++) { const px = x + (P[i][0] - x) * k, py = y + (P[i][1] - y) * k; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); g.lineWidth = 2; g.strokeStyle = `rgba(255,248,230,${.45 * glow * m})`; g.stroke(); g.restore(); } };
  // look.thing core. env: {lx, ly, sun, amb, sun255, night, dayLit, heal, trip, tc, lb (light bucket key)}
  TH.draw = (g, t, x, y, r, s, env) => { if (!t || !(r > 0) || !isFinite(x) || !isFinite(y)) return false; TH.n++;
    const P = s.P, base = (t.kind === 'fx' && FXC[t.fx]) || (t.kind === 'membrane' ? [236, 222, 196] : t.kind === 'string' ? [200, 205, 215] : [150, 78, 52]);
    if (!P || P.length < 2) return false;
    const M = memo(t), mm = devOf(g), dpr = mm ? mm.a : 1; if (M.src !== P || M.sx !== x || M.sy !== y || M.sr !== r) { shape(M, t, P, x, y, r); M.src = P; M.sx = x; M.sy = y; M.sr = r; }
    const Rd0 = Math.round(r * dpr / 2) * 2, Rd = Math.max(O.minRd, Math.min(O.maxRd, Rd0)), lineK = t.kind === 'string' || t.kind === 'bar', S = Math.ceil(Rd * 1.25 + dpr * (lineK ? 10 : 6)), key = `th:${M.h}:${t.kind}:${Rd}:${S}:${env.lb}`;
    let img = sprites.map.has(key) ? sprites.get(key, 2 * S, 2 * S, null) : null;
    if (img && M.last && img !== M.last && M.lastRd > 0) { if (TH.fn !== TH.sf) { TH.sf = TH.fn; TH.sw = 0; } if (TH.sw >= O.swap) { TH.held++; img = null; } else TH.sw++; }   // at most O.swap new sprites go on screen per frame (first-use upload spread)
    if (!img && !pend.has(key) && !sprites.map.has(key)) { if (M.key === key) TH.lost++; else TH.fresh++; } M.key = key;
    if (img) { M.last = img; M.lastRd = Rd; M.lastS = S; } else if (jobs && !pend.has(key) && !sprites.map.has(key) && jobs.length < 48 + O.jobs) { pend.add(key); const q = M.q.slice(0, M.n * 2); jobs.push({ key, w: 2 * S, paint: paintOf(t.kind, t.fx, q, M.n, env, base, t.seed | 0, Rd, S, dpr) }); }
    if (img && Rd === Rd0) blit(g, img, x - S / dpr, y - S / dpr, 2 * S / dpr, 2 * S / dpr, mm);
    else if (img || M.last) { const im = img || M.last, k = r / (img ? Rd : M.lastRd), SS = img ? S : M.lastS; g.drawImage(im, x - SS * k, y - SS * k, 2 * SS * k, 2 * SS * k); }
    else vector(g, t, P, env, base, x, y, r);
    live(g, t, P, env, base, x, y, r, s); return true; };
  return TH;
}
