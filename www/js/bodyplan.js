// BODY PLANS (ported from the first game's body.js / genome.js, v0.3.2; Wilbow 9:24 PM MDT Oct 29 2026: "If soft body physics and unique
// ohms can be a scalable feature, the old game felt better ... I'd like to stylize the ohms more later"). Every ohm gets one of the old
// game's seven plans - blob, shell, serpent, strider, drum-belly, cluster, floater - from its instrument (the palette row's family, drum
// role, envelope, range and body hints) and a second stream of its seed, plus an outline from gene harmonics (bilateral or radial),
// a head bulge, limbs, a tail and the voice's own appendages: a hat bristles with spikes, a snare carries beaded feelers, a pad trails
// fronds, a bass hangs a keel, a kick wears a band, a shell carries plates, a cluster a ring of bubbles, a serpent trailing segments + fins.
// SCALABLE: the outline lives in the same 10-point soft ring (same physics cost); appendages are baked into the ohm's body sprite once
// (no per-frame cost; they squish with the body's affine fit); only serpent segments are drawn per frame, and only for ohms drawn with the
// character look (near / focused ohms, LOD < 2). Far / crowd ohms stay the cheap discs. Never touches sound (shape only, as the old game).
// Switch BODY_PLAN.on (dev 'bodyPlans', ON). Off = the v0.0.30 bodies exactly (round / long / lobed, 0 or 2 legs).
import { rng } from './rng.js';
import { PALETTE } from './palette_data.js';
import { ROLE } from './drums.js';
export const BODY_PLAN = { on: true, harmK: 1, maxK: 1.45, minK: .62, walk: true, stepK: 2.4, swing: .2, lift: .1 };   // walk: live stepping legs on near ohms (O2, Wilbow 10:12 PM Oct 29 'Do all')
export const PLANS = ['blob', 'shell', 'serpent', 'strider', 'drum-belly', 'cluster', 'floater'];
const TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v));
// what the voice looks like (old B.look): drum role, sustain, range
export function voiceLook(rec) { const id = rec && rec.inst && rec.inst.a, row = id ? PALETTE.find(e => e.id === id) : null, role = id ? ROLE[id] : null;
  if (role === 'time') return 'hat'; if (role === 'back') return 'snare'; if (role === 'low') return 'kick'; if (role) return 'drum';
  const env = (row && row.env) || {}; if ((env.att_s || 0) > .15 && (env.sus || 0) > .55) return 'pad';
  const rm = row && row.range_midi; if (rm && rm[1] < 62) return 'bass'; return 'lead'; }
// the plan: pure function of the seed + recipe + the body genes already grown (g.float, g.aspect, g.legs)
export function planOf(seed, rec, g) { const r = rng(((seed >>> 0) ^ 0x6b0d1e5) >>> 0), id = rec && rec.inst && rec.inst.a, row = id ? PALETTE.find(e => e.id === id) : null, bh = (row && row.body) || {};
  const f = (rec && rec.modal && rec.modal.fam) || {}, look = voiceLook(rec);
  // genes (old genome.js express, same ranges), leaned by the palette row's body hints
  const P = { look, segments: 1 + Math.floor(r() * 4.99 * (.6 + (f.string || 0) * .6)), radial: r() < .18 + (bh.round || 0) * .25, symN: 3 + Math.floor(r() * 5.99),
    limbs: Math.floor(r() * 3.99) * 2 * (r() > .2 ? 1 : 0), limbLen: .4 + r() * 1.2, harm: [], headBulge: r() * .5, tail: r() > .7 ? .4 + r() * 1 : 0,
    stiff: .35 + r() * .6, pressure: .7 + r() * .45, mass: .5 + r() * 1.3 + (bh.size || .5) * .4, spiky: bh.spiky != null ? bh.spiky : r() };
  for (let k = 0; k < 4; k++) P.harm.push({ a: (r() - .5) * .5 * (k < 2 ? 1 : .6) * (1 + (bh.lobes || 0)), ph: r() * TAU });
  if (P.segments > 3 && r() < .5) P.segments = 3;
  // the plan (old B.choose, same scores)
  const sc = { blob: .5, 'drum-belly': look === 'kick' ? 2 : (P.mass > 1.6 ? .9 : 0), cluster: P.radial && P.symN >= 5 ? 1.2 : 0,
    serpent: !P.radial && P.segments >= 3 ? 1 + (P.segments - 3) * .1 : 0, strider: P.limbs >= 4 && P.limbLen > .95 ? 1.1 : 0,
    shell: P.stiff > .8 && P.pressure > .9 ? 1.15 : 0, floater: g.float && r() < .45 ? 1.3 : 0 };
  let plan = 'blob'; for (const k in sc) if (sc[k] > sc[plan]) plan = k;
  // gentle geometry per plan (shape only)
  if (plan === 'drum-belly') { P.radial = false; P.segments = 1; P.headBulge *= .3; P.harm = P.harm.map(h => ({ a: h.a * .4, ph: h.ph })); }
  else if (plan === 'serpent') { P.radial = false; P.segments = Math.max(3, P.segments); }
  else if (plan === 'strider') P.limbLen = Math.max(P.limbLen, 1.1);
  else if (plan === 'shell') P.harm = P.harm.map(h => ({ a: h.a * .5, ph: h.ph }));
  if (plan !== 'serpent') P.segments = 1;
  const app = [];
  if (plan === 'drum-belly') app.push({ k: 'band' }); if (plan === 'shell') app.push({ k: 'plates', n: 3 }); if (plan === 'serpent') app.push({ k: 'fins' });
  if (plan === 'cluster') app.push({ k: 'bubbles', n: Math.min(7, P.symN) }); if (plan === 'floater') app.push({ k: 'fronds', n: 4, len: 1.3 });
  if (look === 'hat') app.push({ k: 'spikes', n: 7 + Math.round(P.spiky * 4), len: .32 });
  else if (look === 'snare') app.push({ k: 'feelers', n: 2, len: .9, bead: true });
  else if (look === 'pad' && plan !== 'floater') app.push({ k: 'fronds', n: 3, len: g.float ? .9 : .45, side: !g.float });   // a grounded pad's fronds are short and sweep sideways (never through the ground)
  else if (look === 'bass') app.push({ k: 'keel' });
  else if (look === 'kick' && plan !== 'drum-belly') app.push({ k: 'band' });
  if (P.tail > 0 && plan !== 'drum-belly' && plan !== 'serpent') app.push({ k: 'tail', len: P.tail });
  // legs: striders walk on 4-6 long legs, drum-bellies / floaters / clusters / serpents have none, the rest keep the gene's 0 or 2
  const legs = plan === 'strider' ? Math.max(4, P.limbs) : (plan === 'drum-belly' || plan === 'floater' || plan === 'cluster' || plan === 'serpent') ? 0 : g.legs;
  return { plan, look, app, radial: P.radial, symN: P.symN, harm: P.harm, headBulge: P.headBulge, segments: P.segments, segTaper: .62 + r() * .3, legs, legLen: plan === 'strider' ? P.limbLen : 1,
    aspect: plan === 'serpent' ? Math.min(g.aspect, .85) : plan === 'drum-belly' ? .9 + (g.aspect - .6) * .2 : plan === 'shell' ? Math.max(g.aspect, 1.05) : g.aspect }; }
// apply to body genes (genes.js bodyGenes): g.plan + the plan's aspect / legs; off = untouched
export function applyPlan(g, seed, rec) { if (!BODY_PLAN.on) { g.plan = null; return g; } const p = planOf(seed, rec, g); g.plan = p; g.aspect = p.aspect; g.legs = p.legs; g.legLen = p.legLen; g._ext = 0; return g; }
// the outline: radius multiplier at angle a (screen y down; the head is up, bilateral symmetry about the vertical axis)
export function shapeK(g, a) { let k = 1 + (g.lobeAmt || 0) * Math.cos((g.lobes || 0) * a + (g.lobePh || 0)); const p = g.plan; if (!p) return k;
  const u = a + Math.PI / 2;   // 0 at the top
  for (let i = 0; i < p.harm.length; i++) { const h = p.harm[i], m = p.radial ? (i + 1) * p.symN : i + 2; k += h.a * BODY_PLAN.harmK * (p.radial ? Math.cos(m * u + h.ph) : Math.cos(m * u) * (i % 2 ? .6 : 1)); }
  k += p.headBulge * Math.max(0, -Math.sin(a)) * .5;
  return cl(k, BODY_PLAN.minK, BODY_PLAN.maxK); }
// largest outline radius (cached per genes) - the sprite's room
export function extentK(g) { if (g._ext) return g._ext; let m = 0; for (let i = 0; i < 48; i++) m = Math.max(m, shapeK(g, i / 48 * TAU)); return (g._ext = m); }
// extra room the appendages need around the body, in body radii
export function appRoom(g) { const p = g && g.plan; if (!p) return 0; let e = 0; for (const a of p.app) e = Math.max(e, a.k === 'fronds' ? (a.len || 1) * .9 : a.k === 'feelers' ? a.len * .8 : a.k === 'tail' ? a.len * .75 : a.k === 'spikes' ? a.len : a.k === 'bubbles' ? .35 : a.k === 'keel' ? .4 : a.k === 'fins' ? .3 : 0);
  if (p.legs > 2 || (p.legLen || 1) > 1.05) e = Math.max(e, .26 * (p.legLen || 1) + .1); return e; }
// ---- painting (into the body sprite, device px; H = sprite centre, Rd = body radius in px; C = the look's colours; rgba = its helper) ----
// pt(a) -> [x, y] on the outline at angle a; behind() draws before the body fill, onSkin() inside the clip after the skin marks
export function paintBehind(x, g, H, Rd, C, rgba, pt, ymax, dx) { const p = g.plan; if (!p) return; const sw = (Rd * .07);
  for (const A of p.app) {
    if (A.k === 'spikes') { for (let i = 0; i < A.n; i++) { const a = -Math.PI * .95 + i / (A.n - 1) * Math.PI * .9, [px, py] = pt(a), nx = Math.cos(a), ny = Math.sin(a), L = Rd * A.len * (.75 + .5 * ((i * 7) % 3) / 2), w = Rd * .07;
        const lg = x.createLinearGradient(px, py, px + nx * L, py + ny * L); lg.addColorStop(0, rgba(C.deep, 1)); lg.addColorStop(1, rgba(C.pale, .85)); x.fillStyle = lg;
        x.beginPath(); x.moveTo(px - ny * w, py + nx * w); x.lineTo(px + nx * L, py + ny * L); x.lineTo(px + ny * w, py - nx * w); x.closePath(); x.fill(); } }
    else if (A.k === 'fronds') { for (let i = 0; i < A.n; i++) { const a = A.side ? (i % 2 ? Math.PI * .92 : Math.PI * .08) - (i >> 1) * .35 * (i % 2 ? -1 : 1) : Math.PI * (.25 + .5 * (i + .5) / A.n), [px, py] = pt(a), L = Rd * (A.len || 1) * (.8 + .2 * (i % 2)), bend = A.side ? Math.cos(a) * Rd * .6 : (i - (A.n - 1) / 2) * Rd * .18;
        const lg = x.createLinearGradient(px, py, px + bend, py + L); lg.addColorStop(0, rgba(C.base, .95)); lg.addColorStop(1, rgba(C.pale, 0)); x.strokeStyle = lg; x.lineCap = 'round'; x.lineWidth = sw * 1.4;
        x.beginPath(); x.moveTo(px, py - Rd * .05); x.bezierCurveTo(px + bend * .2, py + L * .35, px + bend * 1.3, py + L * .6, px + bend, py + L); x.stroke(); } }
    else if (A.k === 'feelers') { for (const s of [-1, 1]) { const a = -Math.PI / 2 + s * .45, [px, py] = pt(a), L = Rd * A.len, ex = px + s * L * .55, ey = py - L * .8;
        x.strokeStyle = rgba(C.deep, .9); x.lineCap = 'round'; x.lineWidth = sw * .8; x.beginPath(); x.moveTo(px, py + Rd * .04); x.quadraticCurveTo(px + s * L * .1, py - L * .7, ex, ey); x.stroke();
        if (A.bead) { const gr = x.createRadialGradient(ex - Rd * .03, ey - Rd * .03, 0, ex, ey, Rd * .11); gr.addColorStop(0, rgba(C.pale, 1)); gr.addColorStop(1, rgba(C.dark, 1)); x.fillStyle = gr; x.beginPath(); x.arc(ex, ey, Rd * .09, 0, TAU); x.fill(); } } }
    else if (A.k === 'tail') { const s = dx > 0 ? -1 : 1, [px, py] = pt(s > 0 ? .25 : Math.PI - .25), L = Rd * A.len, lg = x.createLinearGradient(px, py, px + s * L, py); lg.addColorStop(0, rgba(C.base, 1)); lg.addColorStop(1, rgba(C.deep, .2));
      x.fillStyle = lg; x.beginPath(); x.moveTo(px, py - Rd * .16); x.quadraticCurveTo(px + s * L * .6, py - Rd * .3, px + s * L, py - Rd * .42); x.quadraticCurveTo(px + s * L * .55, py + Rd * .02, px, py + Rd * .14); x.closePath(); x.fill(); }
    else if (A.k === 'keel') { const [, by] = pt(Math.PI / 2); const gr = x.createLinearGradient(H, by - Rd * .2, H, by + Rd * .4); gr.addColorStop(0, rgba(C.deep, 1)); gr.addColorStop(1, rgba(C.dark, .5)); x.fillStyle = gr;
      x.beginPath(); x.moveTo(H - Rd * .32, by - Rd * .15); x.quadraticCurveTo(H, by + Rd * .5, H + Rd * .32, by - Rd * .15); x.closePath(); x.fill(); }
    else if (A.k === 'fins') { for (const s of [-1, 1]) { const [px, py] = pt(s > 0 ? -.15 : Math.PI + .15), gr = x.createLinearGradient(px, py, px + s * Rd * .35, py - Rd * .25); gr.addColorStop(0, rgba(C.base, 1)); gr.addColorStop(1, rgba(C.pale, .3)); x.fillStyle = gr;
        x.beginPath(); x.moveTo(px, py - Rd * .14); x.quadraticCurveTo(px + s * Rd * .38, py - Rd * .32, px + s * Rd * .3, py + Rd * .08); x.lineTo(px, py + Rd * .1); x.closePath(); x.fill(); } }
    else if (A.k === 'bubbles') { for (let i = 0; i < A.n; i++) { const a = i / A.n * TAU + .3, [px, py] = pt(a), br = Rd * (.16 + .06 * (i % 3)), cx = px + Math.cos(a) * br * .45, cy = py + Math.sin(a) * br * .45;
        const gr = x.createRadialGradient(cx - br * .3 * dx, cy - br * .3, 0, cx, cy, br); gr.addColorStop(0, rgba(C.pale, 1)); gr.addColorStop(.7, rgba(C.base, 1)); gr.addColorStop(1, rgba(C.deep, 1)); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, br, 0, TAU); x.fill(); } } } }
export function paintOnSkin(x, g, H, Rd, C, rgba, ymax, xmax) { const p = g.plan; if (!p) return;
  for (const A of p.app) {
    if (A.k === 'band') { const yc = H + ymax * .12, bw = Rd * .16, lg = x.createLinearGradient(0, yc - bw, 0, yc + bw); lg.addColorStop(0, rgba(C.dark, 0)); lg.addColorStop(.3, rgba(C.dark, .55)); lg.addColorStop(.5, rgba(C.pale, .35)); lg.addColorStop(.7, rgba(C.dark, .55)); lg.addColorStop(1, rgba(C.dark, 0)); x.fillStyle = lg; x.fillRect(H - xmax * 1.2, yc - bw, xmax * 2.4, bw * 2); }
    else if (A.k === 'plates') { for (let i = 0; i < A.n; i++) { const cx = H + (i - (A.n - 1) / 2) * xmax * .55, cy = H - ymax * .35 + Math.abs(i - (A.n - 1) / 2) * ymax * .12, pr = Rd * .42;
        const gr = x.createRadialGradient(cx, cy - pr * .3, 0, cx, cy, pr); gr.addColorStop(0, rgba(C.pale, .5)); gr.addColorStop(.75, rgba(C.dark, .45)); gr.addColorStop(1, rgba(C.dark, 0)); x.fillStyle = gr; x.beginPath(); x.ellipse(cx, cy, pr, pr * .7, 0, 0, TAU); x.fill(); } } } }
// serpent segments (per frame, near ohms only): a rope in world units behind the head; returns the segment list
export function stepSegments(s, g, b, dt) { const p = g.plan; if (!p || p.segments < 2) return null; const n = p.segments - 1;
  if (!s.seg || s.seg.length !== n) { s.seg = []; const dir = (b.vx || 0) > 0 ? -1 : 1; for (let i = 0; i < n; i++) s.seg.push({ x: b.x + dir * g.r * (1.15 + i * 1.0), y: b.y + g.r * .1 * (i + 1), r: g.r * Math.pow(p.segTaper, i + 1) }); }
  let px = b.x, py = b.y, pr = g.r; for (let i = 0; i < n; i++) { const q = s.seg[i], gap = (pr + q.r) * .78, dx0 = q.x - px, dy0 = q.y - py, d = Math.hypot(dx0, dy0) || 1;
    if (d > gap) { q.x = px + dx0 / d * gap; q.y = py + dy0 / d * gap; } else if (d < gap * .6) { q.x = px + dx0 / d * gap * .6; q.y = py + dy0 / d * gap * .6; }
    if (b.ground) q.y += (b.y + (g.r - q.r) - q.y) * Math.min(1, dt * 4);   // grounded: the body rests along the ground
    px = q.x; py = q.y; pr = q.r; }
  return s.seg; }
// one shaded segment sprite (no face, no marks): the body's colours, the same soft light
export function paintSegment(C, rgba, dx, dy) { return (x, w) => { const h = w / 2, R = h * .92; x.save(); x.beginPath(); x.ellipse(h, h, R, R * .86, 0, 0, TAU); x.fillStyle = rgba(C.base, 1); x.fill(); x.clip();
  let gr = x.createRadialGradient(h + dx * R * .3, h + dy * R * .3, 0, h + dx * R * .2, h + dy * R * .2, R * 1.05); gr.addColorStop(0, rgba(C.pale, .4)); gr.addColorStop(1, rgba(C.pale, 0)); x.fillStyle = gr; x.fillRect(0, 0, w, w);
  gr = x.createRadialGradient(h + dx * R * .45, h + dy * R * .45, R * .25, h + dx * R * .2, h + dy * R * .2, R * 1.55); gr.addColorStop(0, 'rgba(12,10,18,0)'); gr.addColorStop(.6, 'rgba(12,10,18,.3)'); gr.addColorStop(1, 'rgba(12,10,18,.6)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); x.restore(); }; }

// WALKING LEGS (board O2): near ohms' legs are drawn live and step with a gait while the ohm moves along the ground; far ohms keep the baked
// standing legs. Flat fills only (no gradient per frame). x, y = the body's screen centre, rr = body radius in px, ymaxPx = the belly's depth.
export function legList(g) { const NL = g.plan ? Math.max(2, g.legs | 0) : 2, out = []; for (let j = 0; j < NL; j++) out.push(NL === 2 ? (j ? 1 : -1) : -1 + 2 * j / (NL - 1)); return out; }
export function drawWalkLegs(ctx, g, s, b, x, y, rr, ymaxPx, C, rgba, dt) { const LL = g.plan ? (g.legLen || 1) : 1, sp = Math.abs(b.vx || 0), mv = Math.min(1, sp / .35);
  s.walkMv = (s.walkMv || 0) + (mv - (s.walkMv || 0)) * Math.min(1, dt * 8); s.gait = ((s.gait || 0) + sp * dt * BODY_PLAN.stepK / Math.max(.2, g.r * LL)) % (Math.PI * 2);
  const m = s.walkMv, dir = (b.vx || 0) >= 0 ? 1 : -1, L = legList(g);
  for (let j = 0; j < L.length; j++) { const u = L[j], sx = u < 0 ? -1 : 1, au = Math.abs(u), ph = s.gait + (j % 2 ? Math.PI : 0) + j * .7,
      hx = x + u * rr * .36, hy = y + ymaxPx * .72, fx0 = x + u * rr * (.48 + .25 * (LL - 1)) + sx * au * rr * .1 * (LL - 1), fy0 = y + ymaxPx + rr * .22 * LL,
      fx = fx0 + Math.sin(ph) * rr * BODY_PLAN.swing * LL * m * dir, fy = fy0 - Math.max(0, Math.cos(ph)) * rr * BODY_PLAN.lift * LL * m, wt = rr * .085 / Math.sqrt(LL), wb = rr * .06 / Math.sqrt(LL);
    ctx.fillStyle = rgba(j % 2 ? C.deep : C.base, 1); ctx.beginPath(); ctx.moveTo(hx - wt, hy); ctx.lineTo(hx + wt, hy); ctx.lineTo(fx + wb, fy); ctx.lineTo(fx - wb, fy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(C.deep, 1); ctx.beginPath(); ctx.ellipse(fx + sx * rr * .03, fy, rr * .1, rr * .055, 0, 0, Math.PI * 2); ctx.fill(); } }
