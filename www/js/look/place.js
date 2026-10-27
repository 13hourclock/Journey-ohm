// LOOK / place (P1, Wilbow 3:12 AM "40A"): ONE place across its states as a single continuous value, never presets.
//   heal 0 = unhealed: real but muted, dusty, cracked (37 A D)   ..   ~.5 developing: sound colour in sky bands + aura tints
//   ..   1 = harmonised: vivid, gold glints, pattern in the space between jamming ohms (38 A), real light still underneath (36 A).
// Big events (38 B, 36 B, 39 A D): the peak opens a brief full-screen pattern that lands on the beat and settles back over 1-4 bars;
// context (heal, development, event strength) stretches it. OPEN POINT 36 (card "B D", then "A B D"): `takeover` = how far a big
// event may cover the real light (0 = never, 1 = fully for a moment); `realFloor` = how much real light the everyday look keeps.
// Pure numbers + cached textures; reads st / music / mix / bus only. Every number here is a PARAMETER.
export const PLACE_OPTS = {
  wHeal: .6,          // heal = wHeal * place heal + (1 - wHeal) * mix.trip
  healRange: [.5, 1], // sim.healAt contract (NOTES_DEV 'Place sources'): .5 .. 1, never below .5 (keeps autojam alive) -> mapped to 0 .. 1 here
  healMissing: .75,   // the ONE safe constant if sim.healAt is missing (raw contract units; = mid / developing)
  tau: 3,             // s, how slowly a place changes state (a place heals over bars, not frames)
  dustK: 1,           // 37 D: how far unhealed goes (0 = no dust/cracks at all)
  dustEnd: .5,        // heal where dust has fully cleared
  colour: [.2, .7],   // heal window where sound colour comes into sky bands + auras (developing)
  vivid: [.55, 1],    // heal window for the harmonised end
  realFloor: .3,      // 36 A: share of real light kept in the everyday look even when fully vivid
  takeover: .85,      // 36 B: max cover of the full-screen pattern at the top of a big event (OPEN POINT, adjustable)
  swellBars: [1, 4],  // 39 A: swell length range in bars; context picks inside it
  swellStretch: 1,    // 39 D: context multiplier on top (e.g. a long jam stretches it)
  trigger: .75,       // peak rising past this opens a swell (also st.burst). Was .3: ordinary play crossed it (world bangs .7-.8 on
                      // om / key / jam lock / life, chord root .25 + cadence .5 stacking, song start) -> a swell ~half the time
  swellGap: 8,        // bars of rest after a swell ends before another may open (a big moment is rare, not a pulse)
  bigTrigger: .2,     // 12:45: a big musical moment (world st.big / bus 'moment', songs only: climax, drop, big cadence) at least this
                      // strong opens the swell. When the world gives that signal the .75 peak/burst rule above is OFF (only its fallback)
  warmBars: 4,        // no swell in the first bars after the look starts (start-up state changes are not musical moments)
  jamBeats: 8,        // an ohm counts as jamming for this many beats after its last jam note
};
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, ss = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export function createPlace(opts = {}) {
  const O = { ...PLACE_OPTS, ...opts };
  const P = { O, heal: null, dust: 1, colour: 0, vivid: 0, swell: 0, sw: null, jamB: new Map(), _t: null, _pk: 0, _b0: null, _end: -1e9, opens: 0, _big: 0, _mo: null, sig: false };
  // jam membership from the bus (read-only): any note with jam:1 (player jam, partner, autojam) marks its source as jamming
  P.listen = (bus, music) => { if (!bus || !bus.on) return; bus.on('note', ev => { if (ev && ev.src && (ev.jam || (music && music.jam && ev.src.scale === 'ohm'))) P.jamB.set(ev.src.id, music ? music.beat() : 0); });
    bus.on('moment', ev => { if (ev && ev.k > 0) { P.sig = true; P._mo = Math.max(P._mo || 0, Math.min(1, +ev.k)); } }); };   // big moment (world.moment)
  P.jamming = (o, beat) => { const b = P.jamB.get(o.id); return b != null && beat - b < O.jamBeats; };
  P.step = (st, mix, music, sim) => { const t = st.t || 0, dt = P._t == null ? 0 : clamp(t - P._t, 0, .25); P._t = t;
    const beat = music ? music.beat(t) : t;
    // place heal: sim.healAt(x, y) at the camera (world units; the place is the layer the camera is in). No fallback chain.
    const cam = st.cam || {}, raw = sim && typeof sim.healAt === 'function' ? +sim.healAt(cam.x || 0, cam.y || 0) : O.healMissing,
      inp = (Number.isFinite(raw) ? raw : O.healMissing) - O.healRange[0]; P.raw = raw;
    const nh = inp / Math.max(1e-6, O.healRange[1] - O.healRange[0]);
    const target = clamp(O.wHeal * clamp(nh) + (1 - O.wHeal) * mix.trip);
    P.heal = P.heal == null || !dt ? (P.heal == null ? target : P.heal) : P.heal + (target - P.heal) * (1 - Math.exp(-dt / O.tau));
    const h = P.heal; P.dust = O.dustK * (1 - ss(0, O.dustEnd, h)); P.colour = ss(O.colour[0], O.colour[1], h); P.vivid = ss(O.vivid[0], O.vivid[1], h);
    // swell: rising edge of the peak (or a world burst) opens it; it LANDS on the next beat and settles back by a bar line
    // 12:45: the swell opens from the world's BIG MOMENT signal (st.big jumps to k and fades ~2 bars; bus 'moment' {kind, k}) when the
    // world has it. Om changes, landings, spawns stay on bang/burst and never open it. Only without that signal: the .75 peak/burst rule.
    const big = typeof st.big === 'number' ? clamp(st.big) : null; if (big != null) P.sig = true;
    const mo = P._mo; P._mo = null; let pk, edge;
    if (P.sig) { const b = big != null ? big : 0, jump = b > O.bigTrigger && b > P._big + .1; pk = Math.max(b, mo || 0); edge = jump || (mo != null && mo > O.bigTrigger); P._big = b; }
    else { pk = Math.max(mix.peak || 0, typeof st.burst === 'number' ? st.burst : 0); edge = pk > O.trigger && P._pk <= O.trigger; }
    if (P._b0 == null) P._b0 = beat;
    const may = !P.sw && beat - P._end >= O.swellGap * 4 && beat - P._b0 >= O.warmBars * 4;   // rest gap + warm-up
    if (may && edge || (P.sw && edge && pk > P.sw.s + .2)) { P.opens++; const s = clamp(pk), ctxK = clamp(.25 * h + .35 * (mix.inputs && mix.inputs.dev || 0) + .4 * s),
        bars = (O.swellBars[0] + (O.swellBars[1] - O.swellBars[0]) * ctxK) * O.swellStretch, land = Math.ceil(beat + .25), end = Math.ceil((land + bars * 4) / 4) * 4;
      P.sw = { b0: beat, land, end, s: Math.max(s, P.sw ? P.sw.s * P.swellAt(beat, P.sw) : 0) }; }
    P._pk = pk; P.swell = P.sw ? P.swellAt(beat, P.sw) * P.sw.s : 0; if (P.sw && beat >= P.sw.end) { P._end = P.sw.end; P.sw = null; }
    { const m = clamp(Math.max(mix.trip || 0, mix.peak || 0)); P.music = P.music == null || !dt ? m : P.music + (m - P.music) * (1 - Math.exp(-dt / .6)); }   // #1 muted rest: how much music is sounding (sky colour as light only while it plays)
    P.cover = P.swell * O.takeover;                               // how much the full-screen pattern covers the real light right now
    P.trip = clamp((1 - O.realFloor) * (.15 * P.colour + .85 * P.vivid) + P.cover * (1 - (1 - O.realFloor) * P.vivid));   // effective trippy share
    return P; };
  P.swellAt = (b, w) => b < w.b0 ? 0 : b < w.land ? ss(w.b0, w.land, b) : b < w.end ? 1 - ss(w.land, w.end, b) : 0;
  return P;
}
// cached textures (each baked once, or once per bar / phrase; 0 per-frame gradients) ------------------------------------------
// dust + crack + grain tile: seeded, baked once per seed (and per size step); drawn as a repeating pattern with alpha = dust
// part (Wilbow 10:06 'no outlines', parent 2:37 AM seed-42 sky cracks): 'all' = the old tile (haze, grain, hard 2-tone crack strokes);
// 'grain' = haze + grain only (laid over the whole background, sky included); 'crack' = the cracks alone on transparent, soft-edged
// (three wide-to-narrow low-alpha passes, no light offset line), laid only below the land line. Same RNG walk in every part, so the
// cracks sit where they always did.
export function paintDust(x, w, seed = 1, part = 'all') { let s = seed >>> 0 || 1; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const gr = part !== 'crack', cr = part !== 'grain';
  if (gr) { x.fillStyle = 'rgba(120,108,92,.55)'; x.fillRect(0, 0, w, w); }                   // dusty haze (warm grey)
  for (let i = 0; i < w * w / 10; i++) { const v = 60 + r() * 120 | 0, a = .12 + r() * .2, px = r() * w, py = r() * w; if (gr) { x.fillStyle = `rgba(${v},${v - 6},${v - 14},${a})`; x.fillRect(px, py, 1, 1); } }   // grain
  if (!cr) return; x.lineCap = 'round'; x.lineJoin = 'round';
  for (let k = 0; k < 5; k++) { let px = r() * w, py = r() * w, a = r() * 6.283; x.beginPath(); x.moveTo(px, py);            // faint cracks (wrap-safe: short)
    for (let j = 0; j < 7; j++) { a += (r() - .5) * 1.4; px += Math.cos(a) * w * .06; py += Math.sin(a) * w * .06; x.lineTo(px, py); }
    const lw = 1 + r();
    if (part === 'all') { x.strokeStyle = 'rgba(30,24,18,.55)'; x.lineWidth = lw; x.stroke(); x.strokeStyle = 'rgba(200,185,160,.18)'; x.lineWidth = .6; x.translate(.8, .8); x.stroke(); x.translate(-.8, -.8); }
    else for (const [m, al] of [[3.4, .07], [2, .1], [1, .14]]) { x.strokeStyle = `rgba(40,32,24,${al})`; x.lineWidth = lw * m; x.stroke(); } } }   // soft: a shaded groove, no hard edge
// kaleidoscope / lace: n-fold mirrored fine lines in palette colours on transparent; baked per bar or phrase (key: phrase, colours, n)
// k = line strength (alpha + width)
// lw = fixed line width in sprite px (crisp fine lines at the drawn device size; default: scales with w), layers = line layers (3),
// glow = soft wide under-stroke (0 = none). laceGeom/traceLace give the same lines as vectors (full-screen use, no sprite).
export function laceGeom(seed = 1, n = 6) { let s = seed >>> 0 || 1; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const path = []; for (let i = 0; i < 9; i++) path.push([.08 + r() * .9, r() * Math.PI / n]); path.sort((a, b) => a[0] - b[0]); return { n, path, r }; }
// adds the wedges of line layer L whose colour index is ci (of nc) to the current path, centred (cx, cy), radius R, turned by rot
export function traceLace(x, G, cx, cy, R, L, ci, nc, rot = 0) { const n = G.n, path = G.path;
  for (let k = 0; k < n * 2; k++) { if ((L + k) % nc !== ci) continue; const base = Math.floor(k / 2) * 2 * Math.PI / n + rot, sg = k & 1 ? -1 : 1;
    for (let i = 0; i < path.length; i++) { const [f, a] = path[i], rr = R * f * (1 - L * .12), aa = base + sg * a * (1 + L * .3), px = cx + Math.cos(aa) * rr, py = cy + Math.sin(aa) * rr;
      i ? x.lineTo(px, py) : x.moveTo(px, py); } } }
export function paintLace(x, w, { n = 6, cols = [[255, 200, 120]], seed = 1, gold = .5, k = 1, lw = 0, layers = 3, glow = 0 } = {}) { const G = laceGeom(seed, n), path = G.path, r = G.r;
  const R = w / 2; x.translate(R, R); x.lineJoin = 'round'; x.lineCap = 'round';
  for (let k2 = 0; k2 < n * 2; k2++) { x.save(); x.rotate(Math.floor(k2 / 2) * 2 * Math.PI / n); if (k2 & 1) x.scale(1, -1);
    for (let L = 0; L < layers; L++) { const c = cols[(L + k2) % cols.length]; x.beginPath(); for (let i = 0; i < path.length; i++) { const [f, a] = path[i], rr = R * f * (1 - L * .12), aa = a * (1 + L * .3);
        i ? x.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr) : x.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
      const al = Math.min(1, (.55 - L * .13) * k), lw0 = lw ? lw * (1 - L * .15) : Math.max(.7, w / 256 * (1.4 - L * .3) * (.6 + .4 * k));
      if (glow > 0) { x.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${al * .22 * glow})`; x.lineWidth = lw0 * 3.5; x.stroke(); }
      x.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${al})`; x.lineWidth = lw0; x.stroke(); }
    x.restore(); }
  if (gold > 0) for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = R * (.35 + .4 * (i % 2)); x.fillStyle = `rgba(255,214,120,${.6 * gold})`; x.beginPath(); x.arc(Math.cos(a) * rr, Math.sin(a) * rr, lw ? Math.max(1, lw * 1.3) : Math.max(1, w / 160), 0, 7); x.fill(); }
  const fade = x.createRadialGradient(0, 0, R * .6, 0, 0, R); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-in'; x.fillStyle = fade; x.fillRect(-R, -R, w, w); x.globalCompositeOperation = 'source-over'; x.setTransform(1, 0, 0, 1, 0, 0); }
// sky sound bands: a 4 x 128 vertical strip in palette colours, baked per bar; drawn stretched over the sky with 'lighter'
export function paintBands(x, w, h, cols) { for (let y = 0; y < h; y++) { const f = y / h, c = cols[Math.floor(f * cols.length * 1.999) % cols.length], a = Math.pow(Math.sin(f * Math.PI * cols.length * .9), 2) * (1 - f) * .7;
  x.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`; x.fillRect(0, y, w, 1); } }
