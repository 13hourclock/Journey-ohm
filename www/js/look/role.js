// LOOK / role (v0.0.26, Wilbow 4:02 PM "Show visible role"): look.ohmRole - the part an ohm plays (roles.js: lead / bass / pad / rhythm,
// grown from what it plays, can change, no permanent lead) shown ON THE BODY, no text, no arc:
//   bass   - a deeper, heavier glow low in the body, a slow weighty pulse (2 beats, eased: quick swell, long settle)
//   lead   - a bright crown highlight at the top, light motes flowing upward through the body (one pass per beat)
//   rhythm - a crisp ring + inner flash on each of its hits (bus 'note' hits / glow bumps; the beat grid when it is quiet)
//   pad    - a soft, wide, even glow over the whole body, breathing slowly (4 beats)
// COST (<= .05 ms for 50 ohms): for an ordinary ohm the cue is BAKED INTO the exact-size lit sprite look.ohm already blits (one
// variant per role x level x device radius, shared by every ohm of that size; idle-baked through the OX queue) = no extra drawImage.
// Pulses and the upward flow are a few pre-baked levels / phases. A role change crossfades over ~1 beat (old variant, then the new
// one at alpha w: 2 blits only while it fades). Rare (shaped) ohms and ohms the exact path did not draw get ONE soft 'lighter'
// accent blit from look.ohmRole (shared accent sprites, 1:1), drawn after the rare body + aura so it reads next to auras.
// Every number is a PROPOSAL. opts.realLook.role = false switches it off (roles.js placeholders come back).
import { blit } from './blit.js';
export const ROLE_COL = { lead: [255, 210, 120], bass: [120, 160, 255], pad: [170, 255, 200], rhythm: [255, 130, 130] };
export const ROLE_OPTS = { on: true, fade: 1, poll: 6, bassLv: 6, leadPh: 8, rhyLv: 6, padLv: 3, hitDecay: 7, quietBeats: 2, acc: .85, k0: .55, softRing: true };   // softRing false = the old crisp rhythm ring
const LVN = O => ({ bass: O.bassLv, lead: O.leadPh, rhythm: O.rhyLv, pad: O.padLv });
export function createRoleLook({ sprites, jobs, pend, music, bus, roleOf, opts = {} }) {
  const O = { ...ROLE_OPTS, ...opts }, N = LVN(O), S = new WeakMap(), K = { on: O.on !== false, O, stats: { bakedHits: 0, xfade: 0, xbaked: 0, acc: 0 } };
  const st = o => { let s = S.get(o); if (!s) S.set(o, s = { part: null, k: 0, prev: null, b0: -9, poll: -1, hit: -9, g0: 0, fn: -1, fa: -1 }); return s; };
  // hits: the bus 'note' events of that ohm (kind hit / strike / note), at their scheduled beat
  if (bus && bus.on) bus.on('note', ev => { const o = ev && ev.src; if (!o || typeof o !== 'object') return; const s = S.get(o); if (!s || s.part !== 'rhythm') return;
    if (ev.kind !== 'hit' && ev.kind !== 'strike' && ev.kind !== 'note') return; const b = ev.beat != null ? ev.beat : music && music.beat ? music.beat(ev.t) : null; if (b != null && isFinite(b)) s.hit = Math.max(s.hit, b); });
  const ease = p => p * p * (3 - 2 * p);
  // ---- the cue painters (device px; R = sprite radius = the body radius). clip: inside the disc (lit variant) / open (accent)
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : +a.toFixed(3)})`;
  const radial = (x, cx, cy, r, stops) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); for (const [f, c, a] of stops) g.addColorStop(f, rgba(c, a)); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill(); };
  const ell = (x, cx, cy, r, sx, sy, stops) => { x.save(); x.translate(cx, cy); x.scale(sx, sy); radial(x, 0, 0, r, stops); x.restore(); };
  const paintCue = (x, R, part, lv, acc) => { const C = ROLE_COL[part], n = N[part], p = n > 1 ? lv / (n - 1) : 1, cx = R, cy = R;
    if (part === 'bass') { const W = [60, 90, 200], q = .55 + .45 * p;   // a deep blue weight sitting low in the body (a wide flat ellipse), heavier on the swell
      ell(x, cx, cy + R * .78, R * 1.15, 1, .62, [[0, C, .5 * q], [.4, W, .34 * q], [.75, W, .12 * q], [1, W, 0]]); }
    else if (part === 'lead') { const Wh = [255, 242, 210];   // a bright crown at the top + light rising through the body (3 motes, one pass per beat, on a soft beam)
      ell(x, cx, cy - R * .15, R * .95, .34, 1, [[0, C, .16], [.6, C, .07], [1, C, 0]]);
      ell(x, cx, cy - R * .74, R * .82, 1, .6, [[0, Wh, .8], [.35, C, .45], [1, C, 0]]);
      for (let i = 0; i < 3; i++) { const u = (lv / n + i / 3) % 1, my = cy + R * (.7 - 1.45 * u), mx = cx + Math.sin(i * 2.1 + u * 3) * R * .18, f = Math.sin(Math.PI * u);
        ell(x, mx, my, Math.max(2, R * .24), .7, 1, [[0, Wh, .55 * f], [.45, C, .22 * f], [1, C, 0]]); } }
    else if (part === 'rhythm') { const lw = Math.max(1, R * .07), rr = R * (acc ? .92 : .84) + lw * .2 * p;   // crisp ring (+ inner flash) - bright on the hit, faint at rest
      if (O.softRing !== false) { const e = rr / R, a = .16 + .5 * p, ro = Math.min(1.12, e + .14) * R;   // #7 no outlines: the hit is a soft rim of light just inside the edge (a radial band, no stroke)
        radial(x, cx, cy, ro, [[0, C, .26 * p], [Math.max(.05, (e - .2) * R / ro), C, .06 * p], [e * R / ro, C, a], [1, C, 0]]); return; }
      x.strokeStyle = rgba(C, .18 * p); x.lineWidth = lw * 3.2; x.beginPath(); x.arc(cx, cy, rr, 0, 6.2832); x.stroke();   // its soft bloom
      x.strokeStyle = rgba(C, .22 + .55 * p); x.lineWidth = lw; x.beginPath(); x.arc(cx, cy, rr, 0, 6.2832); x.stroke();
      if (p > .05) { x.strokeStyle = rgba([255, 225, 215], .3 * p); x.lineWidth = Math.max(.75, lw * .45); x.beginPath(); x.arc(cx, cy, rr, 0, 6.2832); x.stroke();
        radial(x, cx, cy, R * .8, [[0, C, .3 * p], [.7, C, .12 * p], [1, C, 0]]); } }
    else { const q = .8 + .2 * p;   // pad: a soft, wide, even veil + the edge glowing softly all round (no one bright spot)
      radial(x, cx, cy, R * (acc ? 1.18 : 1), [[0, C, .24 * q], [.62, C, .24 * q], [.86, C, .3 * q], [1, C, 0]]); } };
  // the lit variant: the plain lit sprite + the cue added inside the disc ('lighter', clipped). Keys + painters per lit key (bk) in one
  // numbered table (no string built per ohm per frame): slot ri*16+lv = role ri at level lv, 64+((ai+1)*5+bi+1)*8+j = crossfade step j a>b
  const RI = { lead: 0, bass: 1, pad: 2, rhythm: 3 }, RN = ['lead', 'bass', 'pad', 'rhythm'], XS = 5, REST = { bass: n => (n - 1) >> 1, lead: () => 0, rhythm: () => 0, pad: n => (n - 1) >> 1 };
  const KT = new Map(), KL = { bk: null, e: null }, entry = bk => { if (KL.bk === bk) return KL.e; let e = KT.get(bk); if (!e) { if (KT.size > 512) KT.clear(); KT.set(bk, e = []); } KL.bk = bk; KL.e = e; return e; };
  const cue = (x, W, list) => { const R = W / 2; x.save(); x.beginPath(); x.arc(R, R, R - .5, 0, 6.2832); x.clip(); x.globalCompositeOperation = 'lighter';
    for (const [part, lv, a] of list) { x.globalAlpha = a; paintCue(x, R, part, lv, false); } x.restore(); };
  const variant = (bk, base, W, i) => { const e = entry(bk), k = e[i] || (e[i] = i < 64 ? `${bk}~${RN[i >> 4]}${i & 15}` : `${bk}~x${i}`); if (sprites.map.has(k)) return sprites.get(k, W, W, null);
    if (!jobs || jobs.length >= 48 || pend.has(k)) return null; const B = base(); let list;
    if (i < 64) list = [[RN[i >> 4], i & 15, 1]]; else { const q = (i - 64) >> 3, j = (i - 64) & 7, ai = Math.floor(q / 5) - 1, bi = q % 5 - 1, w = j / XS; list = [];
      if (ai >= 0) list.push([RN[ai], REST[RN[ai]](N[RN[ai]]), 1 - w]); if (bi >= 0) list.push([RN[bi], REST[RN[bi]](N[RN[bi]]), w]); }
    pend.add(k); jobs.push({ key: k, w: W, paint: (x, w) => { B(x, w); cue(x, w, list); } }); return null; };
  // accent sprites: the open cue painted around a 1.2x margin (R*1.2 = half the sprite) so the pad veil / ring have room
  const ACP = {}, accP = (part, lv) => ACP[part + lv] || (ACP[part + lv] = (x, w) => { const R = w / 2 / 1.2; x.save(); x.translate(w / 2 - R, w / 2 - R); paintCue(x, R, part, lv, true); x.restore(); });
  const AK = new Map(), accKey = (part, lv, Rd) => { const n = (part.charCodeAt(0) * 64 + lv) * 4096 + Rd; let s = AK.get(n); if (!s) { if (AK.size > 4096) AK.clear(); AK.set(n, s = `rc:${part}${lv}:${Rd}`); } return s; };
  const ready = (k, w, paint) => { if (sprites.map.has(k)) return sprites.get(k, w, w, null); if (jobs && jobs.length < 48 && !pend.has(k)) { pend.add(k); jobs.push({ key: k, w, paint }); } return null; };
  // ---- per-ohm state: the part (polled every few frames: roles change at most once a bar), the crossfade, the level now
  K.beat = 0; K.n = 0;
  K.frame = (n, beat) => { K.n = n; K.beat = beat; };
  K.part = o => { if (!K.on) return null; const s = st(o); if (s.poll < 0 || K.n - s.poll >= O.poll || K.n < s.poll) { s.poll = K.n + ((o.id | 0) % O.poll) - O.poll; const r = roleOf ? roleOf(o) : null; set(s, r ? r.part : null, r ? r.k : 0); }
    const gl = o.glow || 0; if (s.part === 'rhythm' && gl - s.g0 > .18) s.hit = Math.max(s.hit, K.beat); s.g0 = gl; return s.part || (s.prev && wOf(s) < 1) ? s : null; };
  const set = (s, part, k) => { s.k = k; if (part === s.part) return; if (K.beat - s.b0 >= O.fade) s.prev = s.part; s.part = part; s.b0 = K.beat; };
  K.note = (o, part, k) => { if (!K.on || !part) return; const s = st(o); if (s.part !== part && s.poll < 0) set(s, part, k == null ? 1 : k); };   // ohmRole tells us the part when no roleOf is wired
  const lvOf = (part, s) => { const n = N[part], b = K.beat;
    if (part === 'bass') { const ph = (b / 2) % 1, v = ph < .2 ? ease(ph / .2) : 1 - ease((ph - .2) / .8); return Math.round(v * (n - 1)); }
    if (part === 'lead') return Math.floor(((b % 1) + 1) % 1 * n) % n;
    if (part === 'rhythm') { let t = b - s.hit; if (!(t >= 0 && t < O.quietBeats)) t = ((b % 1) + 1) % 1; return Math.round(Math.exp(-t * O.hitDecay) * (n - 1)); }
    return Math.round((.5 + .5 * Math.sin(b / 4 * 6.2832)) * (n - 1)); };
  const wOf = s => { const w = (K.beat - s.b0) / O.fade; return w >= 1 || w < 0 ? 1 : w; };
  // ordinary ohm: draw the lit body WITH the cue (replaces look.ohm's plain lit blit). false = not ready (caller draws the plain one)
  K.body = (g, o, s, bk, basePaint, Rd, x, y, m) => { const w = wOf(s), W = Rd * 2, X = x - Rd / m.a, Y = y - Rd / m.a, D = W / m.a;
    const sp = part => { if (!part) return sprites.map.has(bk) ? sprites.get(bk, W, W, null) : null; return variant(bk, basePaint, W, RI[part] * 16 + lvOf(part, s)); };   // null part = the plain lit body (a role appearing / going)
    if (w < 1) { const j = Math.min(XS - 1, Math.max(1, Math.round(ease(w) * XS))), ai = s.prev ? RI[s.prev] + 1 : 0, bi = s.part ? RI[s.part] + 1 : 0,
        mx = variant(bk, basePaint, W, 64 + (ai * 5 + bi) * 8 + j); if (mx) { g.globalAlpha = 1; blit(g, mx, X, Y, D, D, m); s.fn = K.n; K.stats.xbaked++; return true; } }   // the crossfade step, baked: one blit
    const cur = sp(s.part), old = w < 1 ? sp(s.prev) : null; if (!cur && !old) return false;
    g.globalAlpha = 1; if (old) { blit(g, old, X, Y, D, D, m); K.stats.xfade++; } if (cur) { g.globalAlpha = old ? ease(w) : 1; blit(g, cur, X, Y, D, D, m); g.globalAlpha = 1; }
    if (cur && !old) K.stats.bakedHits++; s.fn = K.n; return true; };
  // the accent (rare shaped ohms, or the cue the exact body path did not draw): one 'lighter' blit, 1:1 at the device size
  K.accent = (g, o, s, x, y, r, m) => { if (s.fn === K.n) return true; if (s.fa === K.n) return true; s.fa = K.n; const w = wOf(s), Rd = m ? Math.round(r * m.a) : 0; if (Rd < 3 || Rd > 160) return true;
    const W = Math.round(Rd * 1.2) * 2, a0 = g.globalAlpha, c0 = g.globalCompositeOperation, kk = .55 + .45 * Math.min(1, s.k || 0);
    const one = (part, a) => { if (!part || a < .02) return; const lv = lvOf(part, s), sp = ready(accKey(part, lv, Rd), W, accP(part, lv)); if (!sp) return;
      g.globalAlpha = a; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(sp, Math.round(m.a * x + m.e) - W / 2, Math.round(m.d * y + m.f) - W / 2); g.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); K.stats.acc++; };
    g.globalCompositeOperation = 'lighter'; if (w < 1) one(s.prev, O.acc * kk * (1 - ease(w))); one(s.part, O.acc * kk * ease(w));
    g.globalCompositeOperation = c0; g.globalAlpha = a0; return true; };
  K.state = o => S.get(o) || null;
  return K; }
