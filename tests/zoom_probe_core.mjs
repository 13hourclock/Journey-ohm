// ZOOM SMOOTHNESS PROBE (core, shared by tests/zoom_smooth.mjs and pw_smoke): drives real two-finger pointer events on the canvas from
// inside the page, once per animation frame, through every scale handoff (ground -> sky -> planet -> system -> galaxy and back, the
// dive into an ohm, a pan), and records per frame: the world depth cam.z, the dive depth, the camera pan offset (home anchor on screen),
// the frame interval + draw cost. analyse() turns that into flags: jumps (a per-frame depth change far above its neighbours), stalls
// (a pinch moving but the view not following), reversals while pinching, spring-back after letting go (rubber band), lost momentum,
// pan jumps and frame spikes.
export const GESTURES = [
  // name, z0 (null = carry on from the last gesture), at: 'bare' | 'centre' | 'ohm', axis, d0 -> d1 (finger distance px), frames, after
  { name: 'out ground->sky', z0: 0, at: 'bare', d0: 300, d1: 75, n: 45, after: 70 },
  { name: 'out sky->planet', z0: null, at: 'bare', d0: 300, d1: 75, n: 45, after: 70 },
  { name: 'out planet->system', z0: null, at: 'centre', d0: 300, d1: 75, n: 45, after: 70 },
  { name: 'out system->galaxy', z0: null, at: 'centre', d0: 300, d1: 75, n: 45, after: 70 },
  { name: 'out galaxy', z0: null, at: 'centre', d0: 300, d1: 75, n: 45, after: 70 },
  { name: 'in galaxy->system', z0: null, at: 'centre', d0: 75, d1: 300, n: 45, after: 70 },
  { name: 'in system->planet', z0: null, at: 'centre', d0: 75, d1: 300, n: 45, after: 70 },
  { name: 'in planet->sky', z0: null, at: 'centre', d0: 75, d1: 300, n: 45, after: 70 },
  { name: 'in sky->ground', z0: null, at: 'bare', d0: 75, d1: 300, n: 45, after: 70 },
  { name: 'in ground->+1 (bare)', z0: 0, at: 'bare', d0: 75, d1: 300, n: 45, after: 70 },
  { name: 'dive into ohm', z0: 0, at: 'ohm', axis: 'v', d0: 150, d1: 600, n: 50, after: 70 },
  { name: 'dive back out', z0: null, at: 'ohm', axis: 'v', d0: 600, d1: 150, n: 50, after: 70 },
  { name: 'pan ground', z0: 0, at: 'bare', d0: 200, d1: 200, pan: [110, 0], n: 40, after: 40 },
  // v0.0.24: every scale, in and out, with pans (Wilbow 8:22 PM Oct 25: "The smooth zoom should apply to zooming into ohms as well as all other scales")
  { name: 'pan sky', z0: -1, at: 'bare', d0: 200, d1: 200, pan: [110, 0], n: 40, after: 40 },
  { name: 'pan planet (spin)', z0: -2, at: 'centre', d0: 200, d1: 200, pan: [110, 0], n: 40, after: 40 },
  { name: 'zoom+pan ground->sky', z0: 0, at: 'bare', d0: 300, d1: 75, pan: [80, 0], n: 45, after: 70 },
  { name: 'dive ohm->voices', z0: 0, at: 'ohm', axis: 'v', d0: 150, d1: 600, n: 50, after: 70 },
  { name: 'dive voices->partials', z0: null, at: 'centre', axis: 'v', d0: 150, d1: 600, n: 50, after: 70 },
  { name: 'dive partials->wave', z0: null, at: 'centre', axis: 'v', d0: 150, d1: 600, n: 50, after: 70 },
  { name: 'dive glide (wave)', z0: null, at: 'centre', axis: 'v', d0: 300, d1: 300, pan: [120, 0], n: 40, after: 60 },
  { name: 'dive out wave->partials', z0: null, at: 'centre', axis: 'v', d0: 600, d1: 150, n: 50, after: 70 },
  { name: 'dive glide (partials)', z0: null, at: 'centre', axis: 'v', d0: 300, d1: 300, pan: [120, 0], n: 40, after: 60 },
  { name: 'dive out partials->voices', z0: null, at: 'centre', axis: 'v', d0: 600, d1: 150, n: 50, after: 70 },
  { name: 'dive out voices->ohm', z0: null, at: 'centre', axis: 'v', d0: 600, d1: 150, n: 50, after: 70 },
  { name: 'dive ohm->partials one pinch', z0: 0, at: 'ohm', axis: 'v', d0: 150, d1: 1200, n: 60, after: 70 },
  { name: 'dive out partials->ground one pinch', z0: null, at: 'centre', axis: 'v', d0: 1200, d1: 150, n: 60, after: 90 },
];
// runs in the page (page.evaluate(PROBE, gestures)); returns one record list per gesture
export const PROBE = async (GS) => {
  const cv = document.getElementById('c'), W = innerWidth, H = innerHeight, w = JO.world, cam = w.cam, sim = JO.sim, unit = Math.min(W, H) * .13;
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const pe = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 41 }));
  const dive = () => w.zl && w.zl.dive;
  const free = (x, y) => !JO.zoom.free || JO.zoom.free(x, y);
  const spot = (g, axis) => { if (g.at === 'centre') return [W / 2, H * .45];
    if (g.at === 'ohm') { const o = sim.ohm, b = o.body; return [W / 2 + (b.x - sim.cam.x) * unit * sim.cam.z, H * .36 + (b.y - sim.cam.y) * unit * sim.cam.z]; }
    const half = Math.max(g.d0, g.d1) / 2; for (let y = 60; y < H - 60; y += 20) { const ok = axis === 'v' ? free(W / 2, y - half) && free(W / 2, y + half) : free(W / 2 - half, y) && free(W / 2 + half, y) && free(W / 2 - g.d1 / 2, y) && free(W / 2 + g.d1 / 2, y) && free(W / 2, y); if (ok) return [W / 2, y]; }
    return [W / 2, 80]; };
  // v0.0.24: what you are looking at on screen: in a dive the dive origin (D.ox / D.oy), right after one the dived ohm's spot in the
  // world (so a jump on leaving the ohm shows up), else the world anchor; walk = the planet spin (the pan on a small planet)
  let lastO = null;
  const read = (t) => { const D = dive(), R = JO.rare, ax = W / 2 - sim.cam.x * unit * sim.cam.z, ay = H * .36 - sim.cam.y * unit * sim.cam.z; if (D && D.o) lastO = D.o;
    const ob = lastO && lastO.body, vx = D && D.o ? D.ox : ob ? W / 2 + (ob.x - sim.cam.x) * unit * sim.cam.z : ax, vy = D && D.o ? D.oy : ob ? H * .36 + (ob.y - sim.cam.y) * unit * sim.cam.z : ay;
    return { t, z: cam.z, dz: D && D.o ? D.z : 0, dv: !!(D && D.o), ax, ay, vx, vy, walk: w.walk || 0, C: w.planet ? w.planet.C : 1, wf: JO.render && JO.render.followN | 0, an: D && D.o && D.anchor ? [+D.anchor().x.toFixed(1), +D.anchor().y.toFixed(1)] : null, dr: JO.frames && JO.frames.dr && JO.frames.dr.length ? JO.frames.dr[JO.frames.dr.length - 1] : 0,
      closed: !!(R && R.closed), held: !!(R && R.held), hk: JO.render && typeof JO.render.skyHk === 'number' ? JO.render.skyHk : null, sk: JO.render && typeof JO.render.skyK === 'number' ? JO.render.skyK : null, fk: JO.render && typeof JO.render.farK === 'number' ? JO.render.farK : null }; };   // v0.0.29 skyHold: how much the sky / far ranges hold still (render.js)
  const out = [];
  for (const g of GS) {
    lastO = null; if (g.z0 != null) { if (w.goHome) w.goHome(); if (g.z0) w.setZoom(g.z0); for (let i = 0; i < 40; i++) await raf(); }
    const axis = g.axis || 'h', [mx, my] = spot(g, axis), rec = [], pan = g.pan || [0, 0];
    const fp = (k) => { const d = g.d0 * Math.pow(g.d1 / g.d0, k), px = mx + pan[0] * k, py = my + pan[1] * k; return axis === 'v' ? [[px, py - d / 2], [px, py + d / 2]] : [[px - d / 2, py], [px + d / 2, py]]; };
    let [a, b] = fp(0); pe('pointerdown', 41, a[0], a[1]); pe('pointerdown', 42, b[0], b[1]); await raf(); rec.push(read(performance.now()));
    for (let i = 1; i <= g.n; i++) { [a, b] = fp(i / g.n); pe('pointermove', 41, a[0], a[1]); pe('pointermove', 42, b[0], b[1]); await raf(); rec.push(read(performance.now())); }
    pe('pointerup', 41, a[0], a[1]); pe('pointerup', 42, b[0], b[1]);
    for (let i = 0; i < g.after; i++) { await raf(); rec.push(read(performance.now())); }
    out.push({ name: g.name, n: g.n, cmd: (Math.log(g.d1 / g.d0) / Math.log(4)) / g.n, pan, at: [mx, my], rec });
  }
  return out;
};
const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
// eff = what you see: the world depth plus the depth inside a dived ohm
export function analyse(G) {
  const r = G.rec, eff = r.map(q => q.z + q.dz), N = G.n, cmd = G.cmd, dir = Math.sign(cmd);
  const d = []; for (let i = 1; i < eff.length; i++) d.push(eff[i] - eff[i - 1]);
  const drive = d.slice(1, N), rel = d.slice(N);   // skip the dead-zone frame
  let jumps = 0, stalls = 0, rev = 0, maxJ = 0;
  for (let i = 0; i < drive.length; i++) { const nb = drive.slice(Math.max(0, i - 3), i).concat(drive.slice(i + 1, i + 4)).map(Math.abs), m = Math.max(med(nb), Math.abs(cmd) * .3);
    const v = Math.abs(drive[i]); if (cmd && v > 2.5 * m && v > .03) { jumps++; maxJ = Math.max(maxJ, v / m); }
    if (cmd && i > 1 && Math.abs(drive[i]) < Math.abs(cmd) * .15) stalls++;
    if (cmd && drive[i] * dir < -.004) rev++; }
  const follow = cmd ? drive.reduce((s, v) => s + v, 0) / (cmd * drive.length) : 0;   // 1 = the view followed the fingers exactly
  const lastDrive = drive.length ? drive.slice(-3).reduce((s, v) => s + v, 0) / 3 : 0;
  let back = 0, fwd = 0, relMax = 0, relJ = 0; for (let i = 0; i < rel.length; i++) { const v = rel[i]; if (v * dir < 0) back -= v * dir; else fwd += v * dir; relMax = Math.max(relMax, Math.abs(v));
    if (i > 0 && Math.abs(v) > .03 && Math.abs(v) > 3 * Math.max(Math.abs(rel[i - 1]), Math.abs(lastDrive) * .5, .004)) relJ++; }
  // release: the first frame after letting go should carry on near the last pinch speed (momentum) or ease, never jump
  const rel0 = rel.length ? rel[0] : 0;
  // pan continuity on what you look at (vx / vy: the dive origin in a dive, the dived ohm just after, else the world anchor)
  const px = q => q.vx != null ? q.vx : q.ax, py = q => q.vy != null ? q.vy : q.ay;
  const pj = []; for (let i = 2; i < r.length; i++) { const dx = Math.hypot(px(r[i]) - px(r[i - 1]), py(r[i]) - py(r[i - 1])); pj.push(dx); }
  const panCmd = Math.hypot(G.pan[0], G.pan[1]) / N; let panJ = 0; if (r.every(q => q.z > -1.5)) for (let i = 1; i < pj.length; i++) { const m = Math.max(med(pj.slice(Math.max(0, i - 4), i + 4)), panCmd * .5, 1); if (pj[i] > 3 * m && pj[i] > 6) panJ++; }
  // the planet spin (walk, wraps every C): same jump rule on its steps
  const wj = []; for (let i = 2; i < r.length; i++) { const C = r[i].C || 1; let d = r[i].walk - r[i - 1].walk; d = ((d % C) + C * 1.5) % C - C / 2; wj.push(Math.abs(d)); }
  let walkJ = 0; for (let i = 1; i < wj.length; i++) { const m = Math.max(med(wj.slice(Math.max(0, i - 4), i + 4)), 1e-4); if (wj[i] > 3 * m && wj[i] > .02) walkJ++; }
  // v0.0.24 snap cadence: after letting go, a drawn frame where the snap did not move between two that did (the camera stepped on the
  // control clock, not per frame: 0 or 2 steps a frame, a judder)
  let hitch = 0; for (let i = N + 2; i < eff.length - 1; i++) { const a = eff[i] - eff[i - 1], b = eff[i - 1] - eff[i - 2], c = eff[i + 1] - eff[i]; if (Math.abs(a) < 1e-6 && Math.abs(b) > .003 && Math.abs(c) > .003) hitch++; }
  // v0.0.29 skyHold handoff: the sky's and far ranges' share of the zoom (render skyK / farK) may only change as fast as the depth
  // explains (<= 3.5 x the depth step: the skyHandFrom..To smoothstep is at most ~2.6 x per layer); a step with no depth change = a snap
  let skyJ = 0, skyMax = 0; for (let i = 1; i < r.length; i++) { const dzz = Math.abs(r[i].z - r[i - 1].z); for (const k of ['sk', 'fk']) { if (r[i][k] == null || r[i - 1][k] == null) continue; const v = Math.abs(r[i][k] - r[i - 1][k]); skyMax = Math.max(skyMax, v); if (v > .01 + 3.5 * dzz) skyJ++; } }
  const dts = []; for (let i = 1; i < r.length; i++) dts.push(r[i].t - r[i - 1].t);
  const dtMed = med(dts), spikes = dts.filter(x => x > Math.max(50, 2.5 * dtMed)).length;
  return { name: G.name, z0: +eff[0].toFixed(3), zEnd: +eff[N].toFixed(3), zRest: +eff[eff.length - 1].toFixed(3), follow: +follow.toFixed(2), jumps, maxJ: +maxJ.toFixed(1), stalls, rev,
    back: +back.toFixed(3), fwd: +fwd.toFixed(3), relJ, relMax: +relMax.toFixed(3), rel0: +rel0.toFixed(4), lastDrive: +lastDrive.toFixed(4), panJ, panMax: +Math.max(0, ...pj).toFixed(1), hitch, walkJ, walkMax: +Math.max(0, ...wj).toFixed(4), wf: (r[r.length - 1].wf | 0) - (r[0].wf | 0),
    dtMed: +dtMed.toFixed(1), dtP95: +pct(dts, .95).toFixed(1), dtMax: +Math.max(...dts).toFixed(1), spikes, drMax: +Math.max(...r.map(q => q.dr || 0)).toFixed(1), drMed: +med(r.map(q => q.dr || 0)).toFixed(1), drP95: +pct(r.map(q => q.dr || 0), .95).toFixed(1), slow: r.filter(q => q.dr > 16).length, closed: r.some(q => q.closed), held: r.some(q => q.held), dive: r.some(q => q.dv), skyJ, skyMax: +skyMax.toFixed(3), skyK: [r[0].sk, r[r.length - 1].sk] };
}
// thresholds (pw_smoke): per gesture
// back .21: the layer snap (world.js) eases to the nearest layer when you let go just past one (up to .2 by design); the v0.0.22
// rubber band was .7. slow / drP95: frames whose draw took > 16 ms, and the 95th-percentile draw ms (v0.0.22 sky->planet: 8 / 24.7)
export const LIMITS = { jumps: 0, rev: 0, back: .21, relJ: 0, panJ: 0, walkJ: 0, hitch: 1, spikes: 3, slow: 3, drP95: 12, skyJ: 0 };
export function verdict(a) { const bad = [];
  if (a.jumps > LIMITS.jumps) bad.push(`jumps ${a.jumps} (x${a.maxJ})`); if (a.rev > LIMITS.rev) bad.push(`reversals ${a.rev}`);
  if (a.back > LIMITS.back) bad.push(`springs back ${a.back} after letting go`); if (a.relJ > LIMITS.relJ) bad.push(`release jumps ${a.relJ}`);
  if (a.panJ > LIMITS.panJ) bad.push(`pan jumps ${a.panJ}`); if (a.walkJ > LIMITS.walkJ) bad.push(`spin jumps ${a.walkJ}`); if (a.hitch > LIMITS.hitch) bad.push(`snap judder ${a.hitch} (frames with no step)`); if (a.spikes > LIMITS.spikes) bad.push(`frame spikes ${a.spikes} (max ${a.dtMax} ms)`);
  if (a.slow > LIMITS.slow) bad.push(`slow frames ${a.slow} (draw max ${a.drMax} ms)`); if (a.drP95 > LIMITS.drP95) bad.push(`draw p95 ${a.drP95} ms`);
  if (a.skyJ > LIMITS.skyJ) bad.push(`sky hold snaps ${a.skyJ} (max step ${a.skyMax})`);
  if (a.stalls > 4 && a.follow < .5 && !a.closed) bad.push(`stalls ${a.stalls} (follow ${a.follow})`);
  return bad; }
