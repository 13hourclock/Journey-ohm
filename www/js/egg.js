// EGG WORDS: strokes after the spiral pick its sound (old game v0.7 A, V07_SPEC.md A, approved by Wilbow Oct 22-23 2026; audit row
// "Strokes after the spiral pick its sound"). Switch 'eggWords', default OFF = v0.0.29 (a spiral hatches at once, as now).
// When on, a plain spiral leaves an EGG for about 1.5 s (each stroke that STARTS on the egg extends the window); then it hatches.
//  Tier 1 (type), 4 only:  taps on the egg = drummer (1 kick, 2 snare, 3 hats, 4 toms, 5+ a kit; the tap timing is its rhythm; the drum
//    type locks after a 0.4 s pause) | wave through the egg = pad or drone (bigger wave = more movement) | circle around the egg = ringer
//    (bell, glass, shimmer) | flick out of the egg = pluck (or struck, for a fast flick).
//  Tier 2: the same word twice = a stronger version (two circles = a long glassy ring, two waves = a moving pad, two flicks = a long ring).
//  Stroke feel = vibe: fast strokes (and a fast series of strokes) = intensity (drive, brighter, shorter decay); slow, deliberate
//    strokes = ambient and soft (slower attack, darker, no drive).
//  Tier 3: hidden combinations (EGG_COMBOS; dim orbiters that light up when you are one stroke away).
//  No stroke = the quick random ohm that fits the place (spawn.js, unchanged). An unrecognised stroke on the egg nudges it.
// Orbit hints: small glyphs orbit the egg (tier 1 + 2 clear, tier 3 dim), no text. A touch just beside the egg slides it aside; a new
// spiral hatches the open egg first. 3-finger undo during the window removes the egg; after the hatch it removes the ohm.
// Gesture check: GESTURES.md section 13 A (old game) and SUMMARY: only touches that START on the egg during its window are egg words, so
// nothing else changes; the egg is not an ohm (no tap / hold / catch / grab on it). Clay (end-of-spiral hold) is a separate switch.
import { analyze } from './stroke.js';
import { recipes, withRow } from './recipe.js';
import { noLine, softDot } from './soft.js'; import { softArc } from './clay.js';   // v0.0.30 no outlines (lnHints)
export const EGG_OPTS = { on: false, winMs: 1500, hitPx: 44, besidePx: 2.2, tapMs: 350, tapPx: 14, lockMs: 400, nudgePx: 14, slidePx: 40, fast: 1.2, slow: .3, series: 300, patStrength: 4 };
// tier 3: [first word, second word] -> palette row (Wilbow's two examples + three picks; a taste list)
export const EGG_COMBOS = [
  { a: 'wave', b: 'circle', row: 'choir', why: 'wave then circle = choir (his example)' },
  { a: 'tap', b: 'wave', row: 'sample_chop', why: 'taps then wave = rhythmic and textural (his example)' },
  { a: 'flick', b: 'wave', row: 'cello_bow', why: 'a pluck drawn out = bowed' },
  { a: 'circle', b: 'flick', row: 'gong', why: 'a ring struck out = gong' },
  { a: 'circle', b: 'tap', row: 'agogo', why: 'a bell tapped = bell rhythm' }];
const ROWS = { pluck: ['harp_pluck', 'koto', 'kora', 'nylon_guitar', 'oud', 'charango', 'guqin', 'sitar'], struck: ['marimba', 'balafon', 'vibraphone', 'mbira', 'santur', 'gender', 'saron', 'glockenspiel'],
  pad: ['warm_pad', 'moving_pad'], drone: ['om_hum', 'bagpipe_drone', 'harmonium', 'didgeridoo'], ring: ['ceramic_bell', 'bronze_bell', 'ring_bell', 'singing_bowl', 'fm_glass', 'grain_shimmer'], glass: ['fm_glass', 'grain_shimmer'],
  tom: ['taiko', 'frame_drum', 'talking_drum', 'djembe'] };
const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x), pick = (a, s) => a[((s >>> 0) % a.length)];
// one stroke that started on the egg (screen px, [x, y, t ms]) -> a word
export function readEggStroke(pts, egg, O = EGG_OPTS) { const s = pts[0], e = pts[pts.length - 1], dur = Math.max(1, (e[2] || 0) - (s[2] || 0)); let len = 0, mx = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); for (const q of pts) mx = Math.max(mx, Math.hypot(q[0] - s[0], q[1] - s[1]));
  const v = len / dur; if (mx < O.tapPx && dur < O.tapMs) return { k: 'tap', v: 0, dur, t: s[2] || 0 };
  const A = analyze(pts), chord = Math.hypot(e[0] - s[0], e[1] - s[1]), out = egg ? Math.hypot(e[0] - egg.x, e[1] - egg.y) : chord;
  if (A.turns >= .75 && A.ext >= 30) return { k: 'circle', v, dur, size: A.ext, t: s[2] || 0 };
  // wave: side-to-side reversals across the stroke's own direction
  const ux = (e[0] - s[0]) / (chord || 1), uy = (e[1] - s[1]) / (chord || 1); let rev = 0, dir = 0, leg = 0, amp = 0;
  if (chord > 30) for (let i = 1; i < pts.length; i++) { const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], perp = -dx * uy + dy * ux, sg = Math.sign(perp); amp = Math.max(amp, Math.abs(-(pts[i][0] - s[0]) * uy + (pts[i][1] - s[1]) * ux));
    if (!sg) continue; if (sg === dir || !dir) { leg += Math.abs(perp); dir = sg; } else { if (leg >= 8) rev++; leg = Math.abs(perp); dir = sg; } }
  if (rev >= 2 && amp >= 8) return { k: 'wave', v, dur, amp, t: s[2] || 0 };
  if (chord > 40 && len < chord * 1.4 && out > O.hitPx * 1.4 && dur < 450) return { k: 'flick', v, dur, t: s[2] || 0 };
  return { k: 'nudge', v, dur, t: s[2] || 0 }; }
// group the stroke list into words: taps within lockMs merge into one 'tap' word (count + timing)
export function wordsOf(strokes, O = EGG_OPTS) { const W = []; for (const s of strokes) { if (s.k === 'nudge') continue; const L = W[W.length - 1];
    if (s.k === 'tap' && L && L.k === 'tap' && s.t - L.times[L.times.length - 1] <= O.lockMs) { L.n++; L.times.push(s.t); continue; }
    W.push(s.k === 'tap' ? { k: 'tap', n: 1, times: [s.t] } : { ...s }); } return W; }
// what the egg would hatch right now: { row, tier, kit, why }
export function eggSound(strokes, seed = 1, O = EGG_OPTS) { const W = wordsOf(strokes, O); if (!W.length) return null; const L = W[W.length - 1], P = W[W.length - 2];
  if (P && P.k !== L.k) { const c = EGG_COMBOS.find(c => c.a === P.k && c.b === L.k); if (c) return { row: c.row, tier: 3, why: c.why, words: W }; }
  const dbl = !!(P && P.k === L.k && L.k !== 'tap');
  if (L.k === 'tap') { const n = L.n; if (n >= 5) return { row: 'kick', tier: 1, kit: ['snare', 'shaker_hat', pick(ROWS.tom, seed), 'agogo'], why: n + ' taps = a kit', words: W, taps: L };
    return { row: n === 1 ? 'kick' : n === 2 ? 'snare' : n === 3 ? 'shaker_hat' : pick(ROWS.tom, seed), tier: 1, why: n + ' taps', words: W, taps: L }; }
  if (L.k === 'wave') return dbl ? { row: 'moving_pad', tier: 2, why: 'two waves = a moving pad', words: W, amp: L.amp } : { row: L.amp >= 28 ? pick(ROWS.pad, seed) : pick(ROWS.drone, seed), tier: 1, why: 'wave = pad or drone', words: W, amp: L.amp };
  if (L.k === 'circle') return dbl ? { row: pick(ROWS.glass, seed), tier: 2, why: 'two circles = a long glassy ring', words: W, long: 1 } : { row: pick(ROWS.ring, seed), tier: 1, why: 'circle = ringer', words: W };
  if (L.k === 'flick') { const fast = L.v >= 2 * O.fast; return { row: pick(fast ? ROWS.struck : ROWS.pluck, seed), tier: dbl ? 2 : 1, why: dbl ? 'two flicks = a long ring' : fast ? 'fast flick = struck' : 'flick = pluck', words: W, long: dbl ? 1 : 0 }; }
  return null; }
// stroke feel: 0 = slow and deliberate (ambient), 1 = fast / a fast series (hard)
export function eggFeel(strokes, O = EGG_OPTS) { const m = strokes.filter(s => s.k !== 'tap' && s.v > 0); let k = m.length ? m.reduce((a, s) => a + s.v, 0) / m.length : null;
  const gaps = []; for (let i = 1; i < strokes.length; i++) gaps.push(strokes[i].t - (strokes[i - 1].t + (strokes[i - 1].dur || 0)));
  let f = k == null ? .5 : cl((k - O.slow) / (O.fast * 2 - O.slow)); if (gaps.length >= 2 && gaps.reduce((a, g) => a + g, 0) / gaps.length < O.series) f = cl(f + .25); return f; }
export function createEgg({ sim, bus, music, spawn, undo, brain, toS = null, now = () => performance.now(), opts = {} }) {
  const O = { ...EGG_OPTS, ...opts }, E = { opts: O, cur: null, hatched: 0, words: 0, nudges: 0, tier3: 0, last: null };
  E.open = (x, y, a) => { if (!O.on) return null; if (E.cur) E.hatch(); const t = now(); E.cur = { x, y, a, t0: t, until: t + O.winMs, strokes: [], seed: spawn.seedFor(), o: null };
    const egg = E.cur; if (undo) undo.push({ label: 'egg', x, y, undo: () => { if (egg.o) sim.remove(egg.o); else if (E.cur === egg) { E.cur = null; bus.post({ type: 'egg.gone', x, y }); } }, redo: () => { if (egg.o) sim.unremove(egg.o); else { E.cur = egg; E.hatch(); } } });
    bus.post({ type: 'egg.open', x, y }); return egg; };
  // where a screen touch lands: 'on' the egg, 'beside' it (slides it aside), or null
  E.hitAt = (sx, sy) => { const g = E.cur; if (!g || !O.on || !toS) return null; const s = toS(g.x, g.y), d = Math.hypot(sx - s.x, sy - s.y); return d < O.hitPx ? 'on' : d < O.hitPx * O.besidePx ? 'beside' : null; };
  E.slide = (sx, sy) => { const g = E.cur; if (!g || !toS) return; const s = toS(g.x, g.y), dx = s.x - sx, dy = s.y - sy, d = Math.hypot(dx, dy) || 1, k = O.slidePx / d / Math.max(.05, s.s || 1); g.x += dx * k; g.y += dy * k; bus.post({ type: 'egg.slide', x: g.x, y: g.y }); };
  E.stroke = pts => { const g = E.cur; if (!g) return null; const s0 = toS ? toS(g.x, g.y) : null, w = readEggStroke(pts, s0, O); g.strokes.push(w); g.until = now() + O.winMs;
    if (w.k === 'nudge') { E.nudges++; const r = (g.strokes.length * 2654435761 ^ g.seed) >>> 0, a = (r % 628) / 100; g.x += Math.cos(a) * O.nudgePx; g.y += Math.sin(a) * O.nudgePx; } else E.words++;
    const S = eggSound(g.strokes, g.seed, O); g.now = S; bus.post({ type: 'egg.word', k: w.k, x: g.x, y: g.y, k1: eggFeel(g.strokes, O), sound: S ? S.row : null, tier: S ? S.tier : 0 }); return w; };
  // what the orbit hints show right now: tier 1 + 2 clear, tier 3 dim unless one stroke away
  E.hints = () => { const g = E.cur; if (!g) return []; const W = wordsOf(g.strokes, O), L = W[W.length - 1], h = ['tap', 'wave', 'circle', 'flick'].map(k => ({ k, tier: 1, lit: 1 }));
    if (L && L.k !== 'tap') h.push({ k: L.k, tier: 2, lit: 1 }); for (const c of EGG_COMBOS) h.push({ k: c.a + '>' + c.b, tier: 3, lit: L && L.k === c.a ? 1 : 0 }); return h; };
  E.tick = () => { const g = E.cur; if (g && now() >= g.until) E.hatch(); };
  E.hatch = () => { const g = E.cur; if (!g) return null; E.cur = null; const o = sim.spawn(g.x, g.y, g.seed, 'spiral'); if (!o) return null; g.o = o; E.hatched++; spawn.made++;
    const S = eggSound(g.strokes, g.seed, O), f = eggFeel(g.strokes, O); if (S) E.shape(o, S, f, g); E.last = { id: o.id, row: S ? S.row : null, tier: S ? S.tier : 0, feel: f };
    bus.post({ type: 'spawn.spiral', src: o, turns: g.a ? g.a.turns : 0, egg: S ? S.row : null }); return o; };
  // give the hatchling the egg's sound (saved with its recipe, like any recipe)
  E.shape = (o, S, f, g) => { const rec = recipes.get(o.recipe); if (!rec) return; let r = rec; try { r = withRow(rec, S.row); } catch (e) { return; } r.id = rec.id; r.synth = { ...rec.synth, genes: { ...rec.synth.genes } };
    const G = r.synth.genes, n = (k, v) => { G[k] = cl(v); };
    if (f >= .6) { const k = (f - .6) / .4; n('sat', (G.sat || 0) + .5 * k); n('cut', (G.cut || .5) + .3 * k); n('dec', (G.dec || .5) * (1 - .5 * k)); n('att', (G.att || 0) * (1 - k)); }
    else if (f <= .3) { const k = (.3 - f) / .3; n('att', (G.att || 0) + .3 * k); n('cut', (G.cut || .5) * (1 - .3 * k)); n('sat', (G.sat || 0) * (1 - .7 * k)); }
    if (S.amp != null) { const m = cl(S.amp / 80); n('lfoA', Math.max(G.lfoA || 0, .2 + .6 * m)); n('lfoR', Math.max(G.lfoR || 0, .2 + .5 * m)); }
    if (S.long) { n('rel', Math.max(G.rel || 0, .85)); n('dec', Math.max(G.dec || 0, .85)); }
    if (S.tier === 3) E.tier3++; r.egg = { row: S.row, tier: S.tier, feel: +f.toFixed(2) }; recipes.set(r.id, r); bus.post({ type: 'recipe', src: o, rec: r });
    if (brain && S.kit) for (const id of S.kit) { const e = brain.remember(o, 'kit', id, null, 1, 1); if (e) e.keep = 1; } o.kitL = null;
    if (brain && S.taps && S.taps.n >= 2 && music) { const spb = music.spb(), t0 = S.taps.times[0]; let rh = S.taps.times.map(t => Math.round((t - t0) / 1000 / spb * 4) / 4); const span = rh[rh.length - 1];
      if (span > 3.75) rh = rh.map(b => Math.round(b * 3.75 / span * 4) / 4); if (f >= .8) rh = rh.map(b => b / 2);   // a fast series: double-time
      rh = [...new Set(rh)]; if (rh.length >= 2) brain.remember(o, 'pattern', rh.join() + '|' + rh.slice(1).map(() => 0).join(), { rh, iv: rh.slice(1).map(() => 0), len: rh.length }, O.patStrength, O.patStrength); } };
  // overlay: the egg + its orbit hints (no text); Visuals can replace this with their own look (events egg.open / egg.word / egg.gone)
  E.draw = (g2, toS2) => { const g = E.cur; if (!g || !O.on) return; const s = toS2(g.x, g.y), t = now(), left = cl((g.until - t) / O.winMs), wob = Math.sin(t / 90) * (g.strokes.length ? 2 : 1);
    g2.save(); g2.globalAlpha = .85; g2.fillStyle = '#f4ead2'; g2.beginPath(); g2.ellipse(s.x, s.y + wob, 14, 18, 0, 0, 6.2832); g2.fill(); const soft = noLine('lnHints'); if (soft) { g2.globalAlpha = 1; softArc(g2, s.x, s.y, 26, left, '0,0%,100%', .55); } else { g2.strokeStyle = 'rgba(255,255,255,.7)'; g2.lineWidth = 2; g2.beginPath(); g2.arc(s.x, s.y, 26, -1.5708, -1.5708 + 6.2832 * left); g2.stroke(); }   // v0.0.30 no outlines: soft beads
    const H = E.hints(), R = 34 + 30 * left; H.forEach((h, i) => { const a = t / 1400 + i * 6.2832 / H.length, x = s.x + Math.cos(a) * R, y = s.y + Math.sin(a) * R * .8; g2.globalAlpha = h.tier === 3 ? (h.lit ? .8 : .18) : .7 * (.4 + .6 * left);
      if (soft) { softDot(g2, x, y, h.k.startsWith('tap') ? 5 : 8, h.tier === 2 ? '40,100%,74%' : h.tier === 3 ? '270,100%,81%' : '0,0%,100%', .9); return; }   // no outlines: each hint a soft dot (size: tap small, others larger)
      g2.strokeStyle = h.tier === 2 ? '#ffd27a' : h.tier === 3 ? '#c8a0ff' : '#fff'; g2.lineWidth = 1.5; g2.beginPath(); const k = h.k.split('>')[0];
      if (k === 'tap') { g2.arc(x, y, 2.5, 0, 6.2832); } else if (k === 'circle') { g2.arc(x, y, 5, 0, 6.2832); } else if (k === 'wave') { g2.moveTo(x - 6, y); g2.quadraticCurveTo(x - 3, y - 5, x, y); g2.quadraticCurveTo(x + 3, y + 5, x + 6, y); } else { g2.moveTo(x - 5, y + 4); g2.lineTo(x + 5, y - 4); g2.lineTo(x + 1, y - 4); }
      g2.stroke(); if (h.tier === 2) { g2.beginPath(); g2.arc(x, y, 8, 0, 6.2832); g2.stroke(); } }); g2.restore(); };
  return E; }
