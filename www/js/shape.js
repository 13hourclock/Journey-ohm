// v0.0.13 CHANGEABLE GROUND (Wilbow: "the terrain should be changeable not static", "Destructable/foldable terrain").
// The seed terrain (terrain.js) never changes; on top of it each planet keeps a DIFF of the ground, in chunks of half a home width
// (32 samples). The music changes it, always as events on the music clock (D): at each bar line the last bar's music becomes
// 'terrain.change' events { u, w, amt, kind: raise | smooth | erode, t, dur } that grow in over the bar. Anything else may post them
// too (Visuals, ohms, the player) - the bus is the one way in. Strong jams, swells and sustained notes push and raise the ground;
// quiet lets the fresh part settle; heals (tension resolving) smooth it. What repeats becomes lasting (T2 A), saved per planet to
// IndexedDB so a visited place stays changed. Budgets: only chunks near you are awake (far ones sleep and catch up when you come
// back); at most S.budget diff samples are written per frame and S.statBudget chunk stats recomputed per frame; render draws the
// same ridgeline it always did (W.height adds one table lookup), so nothing new is redrawn.
// Every choice below the plan left open is a PROPOSAL toggle (W.opts.shape, dev panel), defaults = the recommendation.
// v0.0.14 SOLID GROUND: under the surface each planet has a coarse column field (P.cut, 32 columns a width, 16 a chunk; chunked and
// asleep with the rest) = how much solid has been removed under the surface. It lowers the floor locally (W.floorCut, world.js), so
// changes can go below the old flat floor. A HUGE SWELL (strong + sustained, measured against this jam's own recent loudness) cracks
// the ground ('terrain.crack'): the crack's line is tuned to the jam (length = how far the peak stood out, branches = tension,
// jag = how many play, lean = where the loud ones are) and it rings a chord tone of the harmony of that moment (never a fixed key).
// Sustained very strong hits on one spot (strong relative to this jam's hits) leave a CRATER ('terrain.crater'): lasting bowl + rim +
// solid cut, healed slowly by harmony (heals) when T2 A, never when T2 B, fading when T2 C.
// v0.0.15 FOLDS (Wilbow: "Destructable/foldable terrain"): the ground creases along fold lines that bend the surface like a pleat
// (a sharp crease, one slope steeper, a valley tucked under the steep side). SUSTAINED TENSION builds a fold where the held notes
// are (ohm genes lean its direction + sharpness, the jam deepens it); RELEASE relaxes it back toward what it has learned to keep.
// A fold is a lasting diff that obeys T2 (A: builds leave a slowly growing set part, B: all lasts, C: all fades). One way in: the bus
// event 'terrain.fold' { u, w, amt (+ build / - relax fraction), dir (-1..1 skew), sh (0..1 sharpness), t, dur }.
// v0.0.15 SINGING TO THE GROUND (T1 A + T10 A): pitch shapes the ground continuously, every beat - a lower voice makes a wider, lower
// rise, a higher voice a narrower, taller peak; the sung pitch leans gently toward the nearest tone of the current chord (humH) and
// singing in the chord makes it a little rounder + greener.
const SPW = 64, CW = .5, CN = SPW * CW, MAXD = 1.1, REP = 6, CPW = 32, CC = CPW * CW, SPC = SPW / CPW;   // REP: changes on one spot (decaying 3%/bar) before they last
import { makeRecipe } from './recipe.js';
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const SHAPE_DEF = { on: true, T1: 'A', T2: 'A', T3: 'A', T4: 'A', T5: 'A', k: 1, solid: true, str: 1, T6: 'A', T7: 'A', T8: 'A', crackZ: 2, T9: 'A', foldK: 1, T10: 'A', humH: .35 };
export function createShape(W, sim, bus, music, hash, post) {
  const O = W.opts.shape = { ...SHAPE_DEF };
  const S = W.shape = { cur: null, act: [], budget: 256, statBudget: 2, fresh: 0, events: 0, lastEv: null, season: 0, weather: 0, saves: 0, loads: 0, written: 0, bar: -1, awake: 0, db: null, lastP: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1], folds_n: 0, lastFold: null, foldW: 0, cracks: 0, craters: 0, crackT: -1e9, craterT: -1e9, lastCrack: null, lastCrater: null };
  const TEN = [0, .55, .4, .5, .8, .35, .9];
  // ---- one planet's diff ----
  const make = L => { const C = L.C || W.planet.C, n = Math.round(C * SPW), nc = Math.round(C / CW);
    return { key: String(L.seed >>> 0) + ':' + C, C, n, nc, h: new Float32Array(n + 1), lift: new Float32Array(n), temp: new Float32Array(n), rep: new Float32Array(n), rb: new Float32Array(n),
      cut: new Float32Array(Math.round(C * CPW) + 1), fold: new Float32Array(n), folds: [], ncol: Math.round(C * CPW), cracks: [], anyCut: false, cbar: new Int32Array(nc).fill(-1), rough: new Float32Array(nc), lush: new Float32Array(nc), stale: new Uint8Array(nc), touched: new Uint8Array(nc), dirty: false, loaded: false, any: false }; };
  S.of = L => { if (!L || L.depth !== 0) return null; const k = String(L.seed >>> 0) + ':' + (L.C || W.planet.C); let P = L.shp; if (P && P.key === k) return P; P = L.shp = make(L); load(P); return P; };
  // the diff at planet position u (home widths), read by W.height on every ground sample: one interpolated table lookup
  S.at = (P, u) => { const x = ((u % P.C) + P.C) % P.C * SPW, i = x | 0, f = x - i, h = P.h; return h[i] + (h[i + 1] - h[i]) * f; };
  const cval = (P, a, u) => { let x = ((u % P.C) + P.C) % P.C / CW - .5; if (x < 0) x += P.nc; const i = x | 0, f = x - i; return a[i % P.nc] * (1 - f) + a[(i + 1) % P.nc] * f; };
  // v0.0.14: how much solid is cut under planet position u (0..1, coarse columns, interpolated)
  S.cutAt = (P, u) => { const x = ((u % P.C) + P.C) % P.C * CPW, i = x | 0, f = x - i, c = P.cut; return c[i] + (c[i + 1] - c[i]) * f; };
  const addCut = (P, ci, v) => { const c = P.cut; c[ci] = clamp(c[ci] + v); if (ci === 0) c[P.ncol] = c[0]; if (c[ci] > 0) P.anyCut = true; };
  S.roughAt = (P, u) => cval(P, P.rough, u); S.lushAt = (P, u) => cval(P, P.lush, u);
  const du = (P, u, c) => { let d = ((u - c) % P.C + P.C) % P.C; return d > P.C / 2 ? d - P.C : d; };
  const setH = (P, i) => { P.h[i] = P.lift[i] + P.temp[i] + P.fold[i]; if (P.h[i]) P.any = true; if (i === 0) P.h[P.n] = P.h[0]; };
  // ---- events (D): everything that changes the ground arrives as 'terrain.change' on the bus ----
  bus.on('terrain.change', ev => { if (!O.on || !S.cur) return; S.events++; S.lastEv = ev; S.act.push({ u: ev.u, w: Math.max(.03, Math.min(.6, ev.w || .15)), amt: ev.amt || 0, kind: ev.kind || 'raise', t0: ev.t, dur: ev.dur || music.spb() * 4, done: 0, lush: ev.lush || 0 }); if (S.act.length > 48) S.act.shift(); });
  const change = (kind, u, w, amt, beats = 4, lush = 0) => bus.post({ type: 'terrain.change', kind, u, w, amt, lush, t: music.now(), dur: music.spb() * beats });
  // apply part `df` of one change; returns the samples touched
  const apply = (P, a, df) => { const k = O.k, n = P.n, c = a.u, w = a.w, r = Math.ceil(2 * w * SPW), i0 = Math.round(((c % P.C) + P.C) % P.C * SPW);
    const lasting = O.T2 === 'B', s = a.amt * df * k;
    for (let j = -r; j <= r; j++) { const i = ((i0 + j) % n + n) % n, d = j / SPW / w, g = Math.exp(-d * d); if (g < .01) continue;
      if (a.kind === 'smooth') { const h = P.h, av = (h[(i - 6 + n) % n] + h[(i - 3 + n) % n] + h[i] + h[(i + 3) % n] + h[(i + 6) % n]) / 5, q = clamp(s * g * 3), dv = (av - h[i]) * q;
        P.temp[i] += dv * .5; P.lift[i] += dv * .5; P.temp[i] *= 1 - .5 * q; P.lift[i] *= 1 - .15 * q; if (O.T2 !== 'B' && !(i % SPC)) { const ci = i / SPC; P.cut[ci] *= 1 - .05 * q; if (ci === 0) P.cut[P.ncol] = P.cut[0]; } }   // heals: pull toward the local mean and let the fresh part go
      else if (a.kind === 'crater') { const ad = Math.abs(d), bowl = ad < 1 ? 1 - ad * ad : 0, rim = Math.exp(-(((ad - 1.15) / .22) ** 2));   // a bowl with a rim, lasting
        P.lift[i] += s * (-.55 * bowl + .22 * rim); if (bowl && O.solid) addCut(P, (i / SPC) | 0, s * bowl * 1.6 / SPC); P.rb[i] = Math.max(P.rb[i], bowl); }
      else if (a.kind === 'crack') { P.lift[i] -= s * g * .2; if (O.solid) addCut(P, (i / SPC) | 0, s * g * 2.4 / SPC); }   // a narrow fissure into the solid
      else if (a.kind === 'erode') { const nz = ((hash(i, P.n) & 1023) / 1023 - .5) * 1.6; const dv = -s * g * (.6 + nz); if (lasting) P.lift[i] += dv; else P.temp[i] += dv; P.rb[i] = Math.max(P.rb[i], g); }
      else { const dv = s * g; if (lasting) P.lift[i] += dv; else P.temp[i] += dv; P.rb[i] = Math.max(P.rb[i], g); }
      P.lift[i] = clamp(P.lift[i], -MAXD, MAXD); P.temp[i] = clamp(P.temp[i], -MAXD, MAXD); setH(P, i); P.stale[(i / CN) | 0] = 1; P.touched[(i / CN) | 0] = 1; }
    if (a.kind === 'smooth' && O.T2 !== 'B') for (const k of P.cracks) if (Math.abs(du(P, k.u, c)) < w * 1.5) k.life -= .04 * a.amt * df * O.k;   // harmony heals cracks slowly
    if (a.lush) { const ci = (((c % P.C) + P.C) % P.C / CW) | 0; P.lush[ci % P.nc] = clamp(P.lush[ci % P.nc] + a.lush * df); }
    P.dirty = true; return 2 * r + 1; };
  // per-chunk stats the PLACE reads (regions follow the changed ground): rough = how broken the diff is, lush = healed growth
  const stat = (P, ci) => { const a = ci * CN, h = P.h; let g = 0, m = 0; for (let i = a; i < a + CN; i++) { g += Math.abs(h[i + 1] - h[i]); m += Math.abs(h[i]); }
    P.rough[ci] = clamp(g / CN * SPW * .35 + m / CN * .25, 0, .8); P.stale[ci] = 0; };
  // ---- per bar: wake / settle the chunks near you, turn the last bar's music into change events ----
  const lvl = new Map(), sus = new Map(); let loudPrev = 0, tenPrev = 0, tenAcc = 0, hum = null, humB = 0, tBars = 0, tenPrevF = 0;
  bus.on('note', ev => { const s = ev.src; if (s && s.scale === 'ohm' && ev.kind === 'sustain') sus.set(s.id, (sus.get(s.id) || 0) + 1); });
  // ---- v0.0.14 context for the crack + crater (no fixed thresholds where avoidable: measured against THIS jam) ----
  let lm = 0, lv = .01, ln = 0, zPrev = 0, lastCrackBar = -1e9, hm = .4, hv = .02, hN = 0;
  const lastDeg = new Map(), hitBar = new Map(), crSt = new Map(), BK = .2;
  bus.on('note', ev => { const s = ev.src; if (!s || s.scale !== 'ohm') return; if (ev.deg != null) lastDeg.set(s.id, ev.deg);
    if (ev.kind !== 'strike' || !s.body || !S.cur || O.T7 === 'off') return; const v = (ev.vel || 0) * (ev.impact != null ? 1.15 : 1);
    hN++; const d = v - hm; hm += d * .015; hv += (d * d - hv) * .015;   // ~70 hits of memory: what counts as strong follows the jam
    if (hN < 10) return; const sd = Math.sqrt(hv), strong = v >= Math.max(.45, hm + Math.max(.06, 1.4 * sd)); if (!strong) return;
    const b = Math.floor(((W.uOf(s.body.x) % S.cur.C) + S.cur.C) % S.cur.C / BK); hitBar.set(b, (hitBar.get(b) || 0) + v); });
  const pop4 = x => (x & 1) + (x >> 1 & 1) + (x >> 2 & 1) + (x >> 3 & 1);
  // the crack's line, tuned to the jam: a main fissure (length = how far the peak stood out, lean = where the loud ones are),
  // jag = how many play, branches = harmonic tension. Points are (du in widths, depth 0..1 of the way to the screen bottom).
  const crackLine = k => { let x = 0, y = 0, sd = k.seed >>> 0; const rnd = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296;
    const n = 6 + Math.round(k.len * 10), main = [0, 0], br = [];
    for (let i = 1; i <= n; i++) { y += k.len / n; x += k.dir * .006 + (rnd() - .5) * (.004 + .02 * k.jag); main.push(x, y);
      if (i > 1 && i < n - 1 && rnd() < .12 + .4 * k.br) { const b = [x, y]; let bx = x, by = y, sg = rnd() < .5 ? -1 : 1, m = 2 + (rnd() * 3 | 0);
        for (let j = 0; j < m; j++) { bx += sg * (.006 + rnd() * .01); by += k.len / n * (.4 + rnd() * .5); b.push(bx, by); } br.push(b); } }
    k.pts = [main, ...br]; return k; };
  S.cracks = () => S.cur ? S.cur.cracks : [];   // hook for Visuals: [{ u, len, dir, br, jag, deg, oct, life, ring (music time it rang), pts }]
  // the crack's ring: one world voice, modal-heavy (a struck stone body); pitch = a tone of the CURRENT chord, never a fixed key
  let ringV = null; const ringVoice = () => { if (ringV || !sim.add) return ringV; const rec = makeRecipe(7014, { name: 'crack ring' });
    rec.modal.fam = { string: .15, membrane: .15, bar: .7 }; Object.assign(rec.modal.p, { bright: .62, decay: 3.2, damp: .25, inharm: .22, size: .55 });
    rec.mix = { modal: 1, synth: .12 }; rec.fx = []; rec.mods = []; rec.send = .45;
    ringV = sim.add({ id: 121, scale: 'world', recipe: rec.id, hue: 0, name: 'crack' }) || null; return ringV; };
  const pickDeg = (k, os) => { const ch = music.chord || {}, r = ch.root || 0, tones = ch.tones || [r, r + 2, r + 4];
    if (O.T8 === 'B') { let best = null, bl = 0; for (const [o, l] of os) if (l > bl && lastDeg.has(o.id)) { bl = l; best = lastDeg.get(o.id); }   // the chord tone nearest the loudest ohm's note
      if (best != null) { let bt = tones[0], bd = 99; for (const tn of tones) { const d = Math.abs(((best - tn) % 7 + 10.5) % 7 - 3.5); if (d < bd) { bd = d; bt = tn; } } return bt; } }
    return tones[k.len > .75 ? 0 : k.br > .5 ? 2 : 1]; };   // A: the crack's shape picks the chord tone (long = root, branchy = fifth, else third)
  bus.on('terrain.crack', ev => { const P = S.cur; if (!O.on || !P) return; S.cracks_n = (S.cracks_n || 0) + 1; S.lastCrack = ev;
    const k = crackLine({ u: ev.u, len: ev.len, dir: ev.dir, br: ev.br, jag: ev.jag, deg: ev.deg, oct: ev.oct, seed: ev.seed, life: 1, ring: ev.ringT != null ? ev.ringT : ev.t });
    P.cracks.push(k); if (P.cracks.length > 12) P.cracks.shift(); P.dirty = true; S.crackT = k.ring;
    S.act.push({ u: ev.u, w: .03, amt: .5 * ev.len, kind: 'crack', lush: 0, t0: ev.t, dur: music.spb(), done: 0 });
    if (O.T8 !== 'off' && ev.deg != null) { const v = ringVoice(); if (v && bus.note) bus.note({ src: v, kind: 'strike', deg: ev.deg, oct: ev.oct, vel: .45 + .35 * ev.len, t: k.ring, ring: true }); } });
  bus.on('terrain.crater', ev => { const P = S.cur; if (!O.on || !P) return; S.craters_n = (S.craters_n || 0) + 1; S.lastCrater = ev; S.craterT = ev.t;
    S.act.push({ u: ev.u, w: ev.r, amt: ev.amt, kind: 'crater', lush: 0, t0: ev.t, dur: ev.dur || music.spb() * 2, done: 0 }); });
  // ---- v0.0.15 FOLDS: a pleat profile (linear in the fold's amount a, so a change redraws only the difference) ----
  const FMAX = .5, pleat = (d, dir, sh) => { const s = d < 0 ? d * (1 + .6 * dir) : d * (1 - .6 * dir), a = Math.abs(s);
    let f = a < 1 ? Math.pow(1 - a, .6 + 1.4 * (1 - sh)) : 0; const ad = Math.abs(dir); if (ad > 1e-3) { const q = (d - 1.15 * Math.sign(dir)) / .35; f -= .35 * ad * Math.exp(-q * q); } return f; };
  const drawFold = (P, f, da) => { const n = P.n, r = Math.ceil(1.6 * f.w * SPW), i0 = Math.round(((f.u % P.C) + P.C) % P.C * SPW);
    for (let j = -r; j <= r; j++) { const i = ((i0 + j) % n + n) % n, v = pleat(j / SPW / f.w, f.dir, f.sh) * da; if (!v) continue; P.fold[i] += v; setH(P, i); P.stale[(i / CN) | 0] = 1; P.touched[(i / CN) | 0] = 1; }
    P.dirty = true; return 2 * r + 1; };
  S.folds = () => S.cur ? S.cur.folds : [];   // hook for Visuals: [{ u, w, dir, sh, a (now), to (target), set (kept), t0, dur }]
  S.foldAt = (P, u) => { let v = 0; for (const f of P.folds) { const d = du(P, u, f.u) / f.w; if (Math.abs(d) < 1.6) v += f.a * pleat(d, f.dir, f.sh); } return v; };
  bus.on('terrain.fold', ev => { const P = S.cur; if (!O.on || !P || O.T9 === 'off') return; S.lastFold = ev; const now = ev.t != null ? ev.t : music.now(), dur = ev.dur || music.spb() * 4;
    let f = null, bd = 1e9; for (const g of P.folds) { const d = Math.abs(du(P, g.u, ev.u)); if (d < Math.max(.08, g.w * .8) && d < bd) { bd = d; f = g; } }
    if (!f) { if (!(ev.amt > 0)) return; if (P.folds.length >= 8) { let m = 0; for (let k = 1; k < P.folds.length; k++) if (P.folds[k].to < P.folds[m].to) m = k; const old = P.folds.splice(m, 1)[0]; old.to = 0; old.dying = true; P.fdead = (P.fdead || []).concat(old); }
      f = { u: ev.u, w: clamp(ev.w || .15, .05, .35), dir: clamp(ev.dir || 0, -1, 1), sh: clamp(ev.sh != null ? ev.sh : .5), a: 0, ad: 0, to: 0, from: 0, set: 0, t0: now, dur, bar: S.bar }; P.folds.push(f); S.folds_n++; }
    const T2 = O.T2; let to = f.to;
    if (ev.amt > 0) { to = clamp(to + ev.amt, 0, FMAX); f.set = T2 === 'B' ? to : T2 === 'C' ? 0 : Math.min(to, f.set + .3 * ev.amt); }   // A: every build leaves a little that stays
    else { const q = clamp(-ev.amt); to = T2 === 'B' ? to : f.set + (to - f.set) * (1 - q); }   // relax toward what the fold keeps (B keeps all)
    f.from = f.a; f.to = to; f.t0 = now; f.dur = dur; P.dirty = true; });
  const foldTick = (P, t, budget) => { let b = budget; const all = P.fdead && P.fdead.length ? P.folds.concat(P.fdead) : P.folds;
    for (const f of all) { const p = clamp((t - f.t0) / f.dur), e = p * p * (3 - 2 * p); f.a = f.from + (f.to - f.from) * e;
      if (Math.abs(f.a - f.ad) > .002 && b > 0) { b -= drawFold(P, f, f.a - f.ad); f.ad = f.a; } }
    if (P.fdead) for (let k = P.fdead.length - 1; k >= 0; k--) { const f = P.fdead[k]; if (f.to === 0 && f.a < .003) { if (f.ad) { drawFold(P, f, -f.ad); f.ad = 0; } P.fdead.splice(k, 1); } }
    return budget - b; };
  const settle = (P, ci, bars, quiet) => { const a = ci * CN, T2 = O.T2, keep = Math.pow(1 - (.025 + .09 * quiet), bars), rk = Math.pow(.97, bars), lk = Math.pow(.995, bars);
    for (let i = a; i < a + CN; i++) { if (T2 === 'A' && P.rep[i] > REP) { const mv = P.temp[i] * Math.min(1, .2 * bars); P.lift[i] += mv; P.temp[i] -= mv; }   // repeated -> lasting
      else if (T2 === 'B') { P.lift[i] += P.temp[i]; P.temp[i] = 0; }
      P.temp[i] *= keep; if (T2 === 'C') P.lift[i] *= lk; P.rep[i] = P.rep[i] * rk + P.rb[i]; P.rb[i] = 0; if (Math.abs(P.temp[i]) < 1e-4) P.temp[i] = 0; setH(P, i); }
    if (P.anyCut && T2 !== 'B') { const ck = Math.pow(T2 === 'C' ? .985 : .9996, bars); for (let j = ci * CC; j < ci * CC + CC; j++) P.cut[j] *= ck; if (ci === 0) P.cut[P.ncol] = P.cut[0]; }
    P.lush[ci] *= Math.pow(.992, bars); P.stale[ci] = 1; P.cbar[ci] = S.bar; };
  const barTick = (P, u, bar) => { S.bar = bar; const sig = sim.sig || {}; let loud = 0, nOn = 0;
    const os = sim.ohms || []; lvl.clear(); for (const o of os) { if (!o.body || o.parked) continue; const l = (sig[o.id] || {})['sound.level'] || 0; if (l > .03) { lvl.set(o, l); loud += l; nOn++; } }
    const quiet = clamp(1 - loud / .6), jam = clamp((music.jam ? .5 : 0) + nOn / 8);
    // wake + settle the chunks within ~1.25 widths of you; the rest sleep (their cbar says when they last ticked)
    let aw = 0; for (let ci = 0; ci < P.nc; ci++) { const cu = (ci + .5) * CW; if (Math.abs(du(P, cu, u)) > 1.25) continue; aw++; const bars = P.cbar[ci] < 0 ? 1 : Math.min(400, bar - P.cbar[ci]); if (bars > 0) settle(P, ci, bars, quiet); }
    S.awake = aw;
    // the music -> events (only near you: the awake chunks)
    const ev = []; for (const [o, l] of lvl) { const ou = W.uOf(o.body.x); if (Math.abs(du(P, ou, u)) > 1.2) continue;
      const sn = Math.min(3, sus.get(o.id) || 0); let amt = .022 * l * (.5 + jam) * (1 + .4 * sn), w = .1 + .05 * sn, kind = 'raise';
      // T5 ohms reshape by genes + context, no roles: a continuous gene says dig <-> pile; context (a jam) deepens it
      if (O.T5 === 'A' || (O.T5 === 'B' && music.jam)) { const g = (hash(o.seed || o.id, 0x5a9e) & 4095) / 4095, lean = (g - .45) * 2, ctx = music.jam ? 1.3 : 1;
        amt *= (lean < 0 ? .2 + 1.6 * lean : 1 + .6 * lean) * ctx; w *= 1 - .35 * Math.abs(lean); }
      ev.push([amt, ou, w, kind, l]); }
    ev.sort((a, b) => b[4] - a[4]); for (let k = 0; k < Math.min(8, ev.length); k++) change(ev[k][3], ev[k][1], ev[k][2], ev[k][0]);
    // swells: the whole sound rising from last bar raises the ground wide around you
    const sw = loud - loudPrev; loudPrev = loud; if (sw > .12) change('raise', u, .45, .05 * Math.min(1, sw * 2));
    // T3 A: long tension erodes, resolving (harmony coming back) heals = smooths + greens
    const rt = music.chord && music.chord.root, ten = Math.min(1, (TEN[rt] || 0) + (music.key ? .2 : 0)); tenAcc = tenAcc * .8 + ten;
    if (tenPrev >= .45 && ten <= .2 && O.T3 !== 'off') change('smooth', u, .6, .25 + .5 * (tenPrev - ten), 4, .15);
    if (O.T3 === 'A' && tenAcc > 2.6 && loud > .05) { change('erode', u + (hash(bar, 7) % 100 - 50) / 200, .25, .02 * tenAcc / 3); tenAcc *= .6; }
    tenPrev = ten;
    // v0.0.14 CRACK on a HUGE swell: this bar's loudness against the jam's own recent mean + spread (z), sustained (the bar before
    // already stood out), held notes push it; cooldown 8 bars. T6 B = plain absolute (loud > .9 and rising).
    let sn = 0; for (const v of sus.values()) sn += v; const sd = Math.max(.05, Math.sqrt(lv)), z = (loud - lm) / sd, zz = z + .2 * Math.min(4, sn / Math.max(1, nOn));
    const ok = bar - lastCrackBar >= 8, huge = O.T6 === 'A' ? ln >= 8 && loud > .12 && zz >= O.crackZ && zPrev >= 1 && ok : O.T6 === 'B' ? loud > .9 && sw > .1 && ok : false;
    if (huge) { lastCrackBar = bar; let sl = 0, sx = 0; for (const [o, l] of lvl) { const d = du(P, W.uOf(o.body.x), u); if (Math.abs(d) > 1.2) continue; sl += l; sx += l * d; }
      const cu = u + (sl ? sx / sl : 0), len = clamp(.35 + .15 * (zz - O.crackZ), .3, 1), dir = clamp(sl ? sx / sl * 4 : 0, -1, 1), k = { len, br: ten, jag: clamp(nOn / 6), dir };
      const nb = music.nextBeat ? music.nextBeat() : music.now();
      bus.post({ type: 'terrain.crack', u: cu, len, dir, br: k.br, jag: k.jag, deg: pickDeg(k, lvl), oct: len > .75 ? 1 : 2, seed: hash(bar, P.n + 0x14), z: zz, ringT: nb, t: music.now() }); }
    if (ln < 1e4) ln++; { const a = ln < 8 ? 1 / ln : .08, d = loud - lm; lm += d * a; lv += (d * d - lv) * a; } zPrev = z;
    // v0.0.14 CRATER: very strong hits (strong for THIS jam, see the note listener) on one spot in >= 3 of the last 4 bars, enough
    // of them (more players need more), cooldown 16 bars a spot. T7 B = any very strong hit dents a small crater.
    if (O.T7 !== 'off') { const need = 1.8 + .1 * nOn;
      for (const [b, v] of hitBar) if (!crSt.has(b)) crSt.set(b, { h: 0, e: 0, cool: 0, v: 0 });
      for (const [b, st] of crSt) { const v = hitBar.get(b) || 0; st.h = ((st.h << 1) | (v > 0 ? 1 : 0)) & 15; st.e = st.e * .6 + v; st.cool--;
        const bu = (b + .5) * BK; let hit = false, r = 0, amt = 0;
        if (O.T7 === 'A' && pop4(st.h) >= 3 && st.e >= need && st.cool <= 0) { const q = Math.min(3, st.e / need); hit = true; r = .06 + .025 * q; amt = .1 * Math.min(2, q); }
        else if (O.T7 === 'B' && v >= .9 && st.cool <= 0) { hit = true; r = .05; amt = .06; }
        if (hit && Math.abs(du(P, bu, u)) <= 1.25) { st.cool = O.T7 === 'A' ? 16 : 4; st.e = 0; bus.post({ type: 'terrain.crater', u: bu, r, amt, t: music.now(), dur: music.spb() * 2 }); }
        if (!st.h && st.e < .05 && st.cool <= 0) crSt.delete(b); } }
    hitBar.clear();
    // v0.0.15 FOLDS: sustained tension builds a fold where the held notes are; release relaxes the folds near you.
    // T9 A: ohm genes lean the fold's direction + sharpness, context (jam, sustains, how many) deepens it. T9 B: tension only.
    if (O.T9 !== 'off') { tBars = ten >= .4 && loud > .05 ? tBars + 1 : 0;
      for (const f of P.folds) { const bars = Math.max(0, bar - (f.bar == null ? bar : f.bar)); f.bar = bar; if (!bars || Math.abs(du(P, f.u, u)) > 1.25) { if (Math.abs(du(P, f.u, u)) > 1.25) f.bar -= bars; continue; }   // far folds sleep (catch up later)
        if (O.T2 === 'A') f.set *= Math.pow(.9996, bars); else if (O.T2 === 'C') { f.set = 0; const k2 = Math.pow(.97, bars); if (f.to > 1e-3) { f.from = f.a; f.to *= k2; f.t0 = music.now(); f.dur = music.spb() * 4; } } }
      for (let k = P.folds.length - 1; k >= 0; k--) { const f = P.folds[k]; if (f.to < .003 && f.a < .003) { const g = P.folds.splice(k, 1)[0]; g.to = 0; (P.fdead || (P.fdead = [])).push(g); } }
      if (tBars >= 2) { let sl = 0, sx = 0, sdir = 0, ssh = 0, sus2 = 0;
        for (const [o, l] of lvl) { const d = du(P, W.uOf(o.body.x), u); if (Math.abs(d) > 1.2) continue; const sn2 = Math.min(3, sus.get(o.id) || 0), wgt = l * (1 + sn2); sl += wgt; sx += wgt * d; sus2 += sn2;
          const g = hash(o.seed || o.id, 0xf01d); sdir += wgt * (((g & 4095) / 4095) * 2 - 1); ssh += wgt * (((g >>> 12) & 4095) / 4095); }
        if (sl > 0) { const A = O.T9 === 'A', ctx = A ? (.6 + .5 * jam) * (1 + .15 * Math.min(4, sus2 / Math.max(1, nOn))) : 1, sh = A ? ssh / sl : .5;
          const dir = A ? clamp(sdir / sl * 1.5, -1, 1) : ((hash(bar >> 3, P.n) & 1023) / 1023 - .5) * 1.2, fu = u + (A ? sx / sl : 0);
          bus.post({ type: 'terrain.fold', u: fu, w: .1 + .14 * (1 - sh), amt: .035 * ten * ctx * O.foldK * Math.min(2, tBars / 2), dir, sh, t: music.now(), dur: music.spb() * 4 }); } }
      const rel = tenPrevF >= .45 && ten <= .2 ? .35 + .5 * (tenPrevF - ten) : ten < .3 && P.folds.length ? .06 : 0;   // a resolution relaxes a lot, calm bars a little
      if (rel) for (const f of P.folds) if (Math.abs(du(P, f.u, u)) <= 1.25 && f.to > f.set + 1e-3) bus.post({ type: 'terrain.fold', u: f.u, amt: -rel, t: music.now(), dur: music.spb() * (rel > .2 ? 4 : 2) }); }
    tenPrevF = ten;
    // cracks close slowly (T2 A), stay (B) or fade (C); the healing events above wear them too
    if (P.cracks.length) { const dl = O.T2 === 'C' ? .03 : O.T2 === 'A' ? .002 : 0; for (let i = P.cracks.length - 1; i >= 0; i--) { const k = P.cracks[i]; k.life -= dl; if (k.life <= 0) { P.cracks.splice(i, 1); P.dirty = true; } } }
    sus.clear();
    // T4 A: seasons + weather on the music clock, per planet: a slow season (128-320 bars) and weather every 16 bars
    if (O.T4 !== 'off') { const hk = hash(P.n, P.key.length * 977 + (parseInt(P.key) | 0)), per = 128 + hk % 193, ph = (hk >>> 8) % 1000 / 1000;
      S.season = O.T4 === 'A' ? Math.sin((bar / per + ph) * 6.283) : 0; const wq = Math.floor(bar / 16), wf = bar / 16 - wq, wv = k => (hash(wq + k, hk) & 1023) / 1023;
      S.weather = wv(0) + (wv(1) - wv(0)) * wf * wf * (3 - 2 * wf);
      if (S.weather > .7) change('smooth', u, .5, .1 * (S.weather - .7) * 3, 4, .04);           // rain softens
      else if (S.weather < .2 && S.season < 0 && O.T4 === 'A') change('erode', u, .35, .008); }  // dry cold wind scours a little
    else { S.season = 0; S.weather = .5; }
    // T1 A: your voice shapes the ground under two resting fingers (low presses, high lifts, a long note spreads)
    if (hum && O.T1 === 'A' && O.T10 === 'B') { const sg = sim.sing; if (sg && sg.active && sg.listen && hum.mic && (sg.rms || 0) > .008 && sg.hzNow) { humB += 4; const p = clamp((Math.log2(sg.hzNow) - 6.6) / 2.4), lv = clamp((sg.rms || 0) * 8);
        change('raise', hum.u, .07 + Math.min(.4, humB * .02), .06 * lv * (p - .4) * 2.5, 4); } }
    if (P.dirty && bar % 8 === 0) save(P); };
  // T1 A: two fingers resting on bare ground open the mic while held (sing.js); events still land on the clock
  bus.on('shape.touch', ev => { const sg = sim.sing; if (ev.on) { if (O.T1 !== 'A' || !O.on || !S.cur) return; hum = { u: W.uOf(ev.x), lp: null, lv: 0, bt: -1, on: 0 }; humB = 0; if (sg && sg.start && !sg.active) { hum.mic = true; sg.start(sim.ohm, { listen: true }); } }
    else { if (hum && hum.mic && sg && sg.stop && sg.listen) sg.stop(); hum = null; } });   // only stop OUR listening mic, never a sing
  S.humming = () => !!hum;
  // v0.0.15 T10 A: singing to the ground, every beat (events on the clock): pitch (smoothed, log) -> shape. Lower = wider + lower rise,
  // higher = narrower + taller peak; held long = spreads a bit. A: the pitch leans toward the nearest chord tone by humH (gentle, 0 =
  // raw), and singing in the chord adds roundness + green. C: the same without the harmony.
  const humFrame = () => { const sg = sim.sing; if (!sg || !sg.active || !sg.listen || !hum.mic) { hum.on = 0; hum.lv = 0; return; } const lv = (sg.rms || 0) > .008 && sg.hzNow ? clamp(sg.rms * 8) : 0;
    if (lv) { const l2 = Math.log2(sg.hzNow); hum.lp = hum.lp == null ? l2 : hum.lp + (l2 - hum.lp) * .15; } hum.lv += (lv - hum.lv) * .2; hum.on = lv ? 1 : 0; };
  S.humShape = lp => { let p = clamp((lp - 6.6) / 2.4), cons = 0; const H = O.T10 === 'A' ? O.humH : 0;
    if (H > 0 && music.hz) { const ch = music.chord || {}, r = ch.root || 0, tones = ch.tones || [r, r + 2, r + 4]; let bd = 9;
      for (const tn of tones) { const ht = Math.log2(music.hz(tn, 0)); const d = ((lp - ht) % 1 + 1.5) % 1 - .5; if (Math.abs(d) < Math.abs(bd)) bd = d; }
      const x = Math.abs(bd) * 12 / 1.5, win = x < 1 ? 1 - x * x : 0; cons = win; p = clamp((lp - H * bd * win - 6.6) / 2.4); }   // pull fades to 0 by 1.5 semitones: continuous in pitch
    return { p, cons, w: (.34 - .27 * p) * (1 + .25 * H * (cons - .5)), amt: .6 + .8 * p, lush: .05 * H * cons }; };
  const humBeat = () => { if (!hum.lv || hum.lp == null || hum.lv < .02) return; humB++; const m = S.humShape(hum.lp);
    S.humLast = m; bus.post({ type: 'terrain.change', kind: 'raise', u: hum.u, w: m.w * (1 + Math.min(.6, humB * .01)), amt: .016 * hum.lv * m.amt, lush: m.lush, t: music.timeOfBeat(hum.bt), dur: music.spb() }); };
  // ---- per frame: grow the active changes in (budgeted), refresh a few chunk stats (budgeted), the bar tick ----
  S.tick = (t, u, on) => { const P = S.cur = O.on && on ? S.of(W.home) : null; if (!P) return;
    const bt = Math.floor(music.beat(t)), bar = Math.floor(bt / 4); if (bar !== S.bar) barTick(P, u, bar);
    if (hum && O.T1 === 'A' && O.T10 !== 'B') { humFrame(); if (bt !== hum.bt) { hum.bt = bt; humBeat(); } }
    let b = S.budget; for (let k = 0; k < S.act.length && b > 0; k++) { const a = S.act[k], p = clamp((t - a.t0) / a.dur), df = p - a.done; if (df <= 0) continue; b -= apply(P, a, df); a.done = p; }
    if (P.folds.length || (P.fdead && P.fdead.length)) b -= (S.foldW = foldTick(P, t, Math.max(64, b)));
    S.written = S.budget - Math.max(0, b); for (let k = S.act.length - 1; k >= 0; k--) if (S.act[k].done >= 1) S.act.splice(k, 1);
    S.fresh += ((S.act.length ? 1 : 0) - S.fresh) * .02;
    let sb = S.statBudget; for (let ci = 0; ci < P.nc && sb > 0; ci++) if (P.stale[ci]) { stat(P, ci); sb--; }
    const Pl = W.place; Pl.raised = clamp(.5 + S.at(P, u) / (2 * MAXD) * 1.6); Pl.fresh = S.fresh; Pl.season = S.season; Pl.weather = S.weather;
    if (post) { const L = S.lastP, v0 = Pl.raised, v1 = Pl.fresh, v2 = .5 + .5 * S.season, v3 = S.weather;   // post only on a real change (keeps the frame cost flat)
      if (Math.abs(v0 - L[0]) > .002) post('ground.raised', L[0] = v0); if (Math.abs(v1 - L[1]) > .002) post('ground.fresh', L[1] = v1);
      if (Math.abs(v2 - L[2]) > .002) post('place.season', L[2] = v2); if (Math.abs(v3 - L[3]) > .002) post('place.weather', L[3] = v3);
      const v4 = P.anyCut ? S.cutAt(P, u) : 0, v5 = Math.exp(-Math.max(0, t - S.crackT) * .5), v6 = Math.exp(-Math.max(0, t - S.craterT) * .5);   // v0.0.14 ground.cut / ground.crack / ground.crater
      if (Math.abs(v4 - L[4]) > .002) post('ground.cut', L[4] = v4); if (Math.abs(v5 - L[5]) > .002) post('ground.crack', L[5] = v5); if (Math.abs(v6 - L[6]) > .002) post('ground.crater', L[6] = v6);
      // v0.0.15 ground.fold (how folded the ground is at your spot, 0..1), ground.folding (.5 still, up = building, down = relaxing), ground.sung (singing to the ground)
      let v7 = 0, v8 = 0; for (const f of P.folds) { const d = du(P, u, f.u) / f.w; if (Math.abs(d) > 2) continue; const g = Math.exp(-d * d * .7); v7 = Math.max(v7, g * f.a / FMAX); v8 += g * (f.to - f.a); }
      v8 = .5 + .5 * clamp(v8 * 8, -1, 1); const v9 = hum && hum.on ? clamp(hum.lv) : 0;
      if (Math.abs(v7 - L[7]) > .002) post('ground.fold', L[7] = v7); if (Math.abs(v8 - L[8]) > .002) post('ground.folding', L[8] = v8); if (Math.abs(v9 - L[9]) > .002) post('ground.sung', L[9] = v9); } };
  S.reset = () => { const P = S.cur || S.of(W.home); if (!P) return; for (const a of [P.h, P.lift, P.temp, P.rep, P.rb, P.rough, P.lush, P.cut, P.fold]) a.fill(0); P.folds.length = 0; P.fdead = []; P.touched.fill(0); P.any = false; P.anyCut = false; P.cracks.length = 0; S.act.length = 0; P.dirty = true; save(P); };
  // ---- saving: per planet, the chunks that changed (Int16 lift/temp, Uint8 repeat count, lush); about 2-4 KB a planet, <= 64 planets ----
  const idb = () => S.db || (S.db = new Promise(res => { try { if (typeof indexedDB === 'undefined') return res(null); const q = indexedDB.open('jo-world', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('shape'); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch (e) { res(null); } }));
  const save = P => { P.dirty = false; idb().then(db => { if (!db) return; const ch = {}; for (let ci = 0; ci < P.nc; ci++) { const a = ci * CN; let any = P.lush[ci] > .005; for (let j = ci * CC; j < ci * CC + CC && !any; j++) any = P.cut[j] > 1e-4;
      for (let i = a; i < a + CN && !any; i++) any = P.lift[i] !== 0 || P.temp[i] !== 0; if (!any) continue;
      const l = new Int16Array(CN), tp = new Int16Array(CN), r = new Uint8Array(CN); for (let i = 0; i < CN; i++) { l[i] = Math.round(P.lift[a + i] * 16384 / MAXD * 1.9); tp[i] = Math.round(P.temp[a + i] * 16384 / MAXD * 1.9); r[i] = Math.min(255, P.rep[a + i] * 16); }
      const cc = new Int16Array(CC); for (let j = 0; j < CC; j++) cc[j] = Math.round(P.cut[ci * CC + j] * 32767);
      ch[ci] = { l, t: tp, r, lu: P.lush[ci], c: cc }; }
    const fo = P.folds.map(f => ({ u: f.u, w: f.w, dir: f.dir, sh: f.sh, to: f.to, set: f.set }));
    const cr = P.cracks.map(k => ({ u: k.u, len: k.len, dir: k.dir, br: k.br, jag: k.jag, deg: k.deg, oct: k.oct, seed: k.seed, life: k.life }));
    try { const tx = db.transaction('shape', 'readwrite'), st = tx.objectStore('shape'); st.put({ C: P.C, ch, cr, fo, at: Date.now() }, P.key); S.saves++;
      if (S.saves % 16 === 1) { const ks = st.getAllKeys(), vs = st.getAll(); vs.onsuccess = () => { const v = vs.result, k = ks.result; if (!k || v.length <= 64) return; const ord = v.map((x, i) => [x.at || 0, k[i]]).sort((a, b) => a[0] - b[0]); for (let i = 0; i < v.length - 64; i++) st.delete(ord[i][1]); }; } } catch (e) { } }); };
  const load = P => { idb().then(db => { if (!db) return; try { const q = db.transaction('shape').objectStore('shape').get(P.key); q.onsuccess = () => { const v = q.result; P.loaded = true; if (!v || !v.ch) return; S.loads++;
      for (const c in v.ch) { const ci = +c, a = ci * CN, d = v.ch[c]; if (ci >= P.nc || P.touched[ci]) continue; for (let i = 0; i < CN; i++) { P.lift[a + i] = d.l[i] / 16384 * MAXD / 1.9; P.temp[a + i] = d.t[i] / 16384 * MAXD / 1.9; P.rep[a + i] = d.r[i] / 16; setH(P, a + i); }
        P.lush[ci] = d.lu || 0; P.stale[ci] = 1; if (d.c) { for (let j = 0; j < CC; j++) P.cut[ci * CC + j] = d.c[j] / 32767; if (ci === 0) P.cut[P.ncol] = P.cut[0]; P.anyCut = true; } }
      if (v.cr && !P.cracks.length) for (const k of v.cr) P.cracks.push(crackLine(Object.assign({ ring: -1e9 }, k)));
      if (v.fo && !P.folds.length) for (const f of v.fo) P.folds.push({ u: f.u, w: f.w, dir: f.dir, sh: f.sh, a: f.to, ad: 0, to: f.to, from: f.to, set: f.set, t0: -1e9, dur: 1, bar: S.bar }); }; } catch (e) { } }); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden && S.cur && S.cur.dirty) save(S.cur); });
  return S;
}
