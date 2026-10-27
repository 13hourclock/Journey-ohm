// Articulatory vocal tract voices (pooled, audio thread). PORTED (copied) from /workspace/softsound .../js/tract.js (old game, v0.8b7),
// structure after Pink Trombone by Neil Thapen (MIT licence, https://dood.al/pinktrombone): LF-model glottal source (tenseness,
// aspiration, jitter) into a Kelly-Lochbaum oral tract with a nasal side tract, tongue/lip shaping, constriction turbulence and bursts.
// One waveguide step per sample, tract length scales with body size. Journey Ohm changes: export; voices carry src + fx (insert bus);
// the matrix's live mods reach it (SM[src].cut -> brightness / tenseness, bend -> pitch); FX passed in. Self-contained: stringified.
export function TractFactory(SR, FX) {
  const NT = 4, TAU = Math.PI * 2, BLADE = 10 / 44, TIP = 32 / 44, LIP = 39 / 44, NOSEX = 17 / 44;
  let ns = 991; const noise = () => { ns = (ns * 1664525 + 1013904223) >>> 0; return ns / 2147483648 - 1; };
  const V = []; let stolen = 0;
  function alloc(v, len) { const n = Math.max(12, Math.min(40, Math.round(22 * len * SR / 48000))); if (v.n === n) return; v.n = n; const A = k => new Float32Array(k);
    v.d = A(n); v.dT = A(n); v.R = A(n); v.L = A(n); v.jR = A(n + 1); v.jL = A(n + 1); v.ref = A(n + 1); v.Ar = A(n);
    const nn = Math.max(6, Math.round(n * 28 / 44)); v.nn = nn; v.nd = A(nn); v.nR = A(nn); v.nL = A(nn); v.njR = A(nn + 1); v.njL = A(nn + 1); v.nref = A(nn + 1); v.nA = A(nn);
    for (let i = 0; i < nn; i++) { let d = 2 * (i / nn); d = d < 1 ? .4 + 1.6 * d : .5 + 1.5 * (2 - d); v.nd[i] = Math.min(d, 1.9); } v.nose = Math.round(NOSEX * n); }
  for (let i = 0; i < NT; i++) { const v = { on: 0, key: -1, n: 0, segs: [], si: 0, st: 0, f0: 150, f0T: 150, glideK: .999, tense: .6, tenseT: .6, inten: 0, intT: 0, gain: .1, pl: .7, pr: .7, send: .3,
      tu: .55, td: 2.6, tuT: .55, tdT: 2.6, lip: 1, lipT: 1, cx: 0, cd: 3, cdT: 3, cdR: 3, man: 0, vel: .01, velT: .01, tauK: .02, nasal: 0, burst: 0, wt: 0, wl: 1 / 150, lf: null, fade: 1, fading: 0, silent: 0, bp1: 0, bp2: 0, ap1: 0, ap2: 0, out: 0, vibP: 0, jit: 0, lvl: 0 };
    alloc(v, 1); lfSetup(v); V.push(v); }
  // ---- LF glottal waveform (Fant/Liljencrants), parameterised by tenseness (Rd)
  function lfSetup(v) { let Rd = 3 * (1 - v.tense); Rd = Math.max(.5, Math.min(2.7, Rd)); const Ra = -.01 + .048 * Rd, Rk = .224 + .118 * Rd, Rg = (Rk / 4) * (.5 + 1.2 * Rk) / (.11 * Rd - Ra * (.5 + 1.2 * Rk));
    const Ta = Ra, Tp = 1 / (2 * Rg), Te = Tp + Tp * Rk, eps = 1 / Ta, shift = Math.exp(-eps * (1 - Te)), Delta = 1 - shift;
    let rhs = (1 / eps) * (shift - 1) + (1 - Te) * shift; rhs /= Delta; const lower = -(Te - Tp) / 2 + rhs, upper = -lower, om = Math.PI / Tp, s = Math.sin(om * Te);
    const y = -Math.PI * s * upper / (Tp * 2), z = Math.log(y), alpha = z / (Tp / 2 - Te), E0 = -1 / (s * Math.exp(alpha * Te)); v.lf = { Te, eps, shift, Delta, om, alpha, E0 }; }
  function lfAt(v, t) { const p = v.lf; if (t > p.Te) return (-Math.exp(-p.eps * (t - p.Te)) + p.shift) / p.Delta; return p.E0 * Math.exp(p.alpha * t) * Math.sin(p.om * t); }
  // ---- geometry: rest shape + tongue + lips + constriction -> target diameters
  function shape(v) { const n = v.n, fd = 2 + (v.td - 2) / 1.5;
    for (let i = 0; i < n; i++) { const x = (i + .5) / n; let d = x < 6.5 / 44 ? .6 : x < 12 / 44 ? 1.1 : 1.5;
      if (x >= BLADE && x < LIP) { const t = 1.1 * Math.PI * (v.tu - x) / (TIP - BLADE); let cv = (1.5 - fd + 1.7) * Math.cos(t); d = Math.max(.05, 1.5 - cv); }
      if (x >= LIP) d = 1.5 * v.lip;
      if (v.cdR < 2.9) { const w = 2.2 / n + .03, dx = Math.abs(x - v.cx); if (dx < w * 2) { const sh = dx < w ? 0 : (dx - w) / w; const cd = v.cdR + (d - v.cdR) * sh * sh; if (cd < d) d = Math.max(0, cd); } }
      v.dT[i] = d; } }
  function reflections(v) { const n = v.n, d = v.d, A = v.Ar; for (let i = 0; i < n; i++) A[i] = d[i] * d[i];
    for (let i = 1; i < n; i++) v.ref[i] = A[i] === 0 ? .999 : (A[i - 1] - A[i]) / (A[i - 1] + A[i]);
    v.nd[0] = v.vel; for (let i = 0; i < v.nn; i++) v.nA[i] = v.nd[i] * v.nd[i]; for (let i = 1; i < v.nn; i++) v.nref[i] = (v.nA[i - 1] - v.nA[i]) / (v.nA[i - 1] + v.nA[i]);
    const j = v.nose, sum = A[j] + A[j + 1] + v.nA[0]; v.rL = (2 * A[j] - sum) / sum; v.rR = (2 * A[j + 1] - sum) / sum; v.rN = (2 * v.nA[0] - sum) / sum; }
  // ---- articulation timeline: called every block
  function articulate(v, n) {
    while (v.si < v.segs.length && v.st >= v.segs[v.si].dur * SR) { const s = v.segs[v.si]; v.st -= s.dur * SR; v.si++; if (s.c && s.c.man === 1) v.burst = 1; }   // a stop releasing = burst
    const s = v.segs[v.si], Lv = v.live; const ag = Lv ? .014 : v.tauK;
    if (Lv) { v.f0T = Lv.f0; v.tuT = Lv.tu; v.tdT = Lv.td; v.lipT = Lv.lip; v.intT = Lv.vo; v.velT = Lv.vel; v.cx = Lv.cx; v.cdT = Lv.cd; v.man = Lv.man; }   /* v08-voice: the big mouth drives this voice directly (no segments) */
    else if (!s) { v.intT = 0; v.cdT = 3; v.velT = .01 + v.nasal * .05; }
    else { if (s.f0) { v.f0T = s.f0; } if (s.v) { v.tuT = s.v[0]; v.tdT = s.v[1]; v.lipT = s.v[2]; }
      if (s.c) { v.cx = s.c.x; v.cdT = s.c.d; v.man = s.c.man; v.intT = s.c.vo ? 1 : 0; v.velT = s.c.man === 3 ? .45 : .01; if (s.c.lip != null) v.lipT = s.c.lip; }
      else { v.cdT = 3; v.man = 0; v.intT = s.rest ? 0 : 1; v.velT = .01 + v.nasal * .08; } }
    v.st += n;
    const k = 1 - Math.exp(-n / (SR * ag)), kc = 1 - Math.exp(-n / (SR * Math.min(ag, .008)));
    v.tu += (v.tuT - v.tu) * k; v.td += (v.tdT - v.td) * k; v.lip += (v.lipT - v.lip) * kc; v.cdR += (v.cdT - v.cdR) * kc; v.vel += (v.velT - v.vel) * k; v.tense += (v.tenseT - v.tense) * k;
    shape(v); const kd = 1 - Math.exp(-n / (SR * .004)); for (let i = 0; i < v.n; i++) v.d[i] += (v.dT[i] - v.d[i]) * kd; reflections(v); }
  function stepTract(v, glot, turb) { const n = v.n, R = v.R, L = v.L, jR = v.jR, jL = v.jL, ref = v.ref;
    jR[0] = L[0] * .75 + glot; jL[n] = R[n - 1] * -.85;
    for (let i = 1; i < n; i++) { const w = ref[i] * (R[i - 1] + L[i]); jR[i] = R[i - 1] - w; jL[i] = L[i] + w; }
    const j = v.nose, nL0 = v.nL[0]; jL[j] = v.rL * R[j - 1] + (1 + v.rL) * (nL0 + L[j]); jR[j] = v.rR * L[j] + (1 + v.rR) * (R[j - 1] + nL0); v.njR[0] = v.rN * nL0 + (1 + v.rN) * (L[j] + R[j - 1]);
    for (let i = 0; i < n; i++) { R[i] = jR[i] * .999; L[i] = jL[i + 1] * .999; }
    if (turb) { const i = Math.min(n - 2, Math.max(1, Math.round(v.cx * n))); R[i] += turb * .5; L[i] += turb * .5; }
    const nn = v.nn, nR = v.nR, nLa = v.nL, njR = v.njR, njL = v.njL, nref = v.nref; njL[nn] = nR[nn - 1] * -.85;
    for (let i = 1; i < nn; i++) { const w = nref[i] * (nR[i - 1] + nLa[i]); njR[i] = nR[i - 1] - w; njL[i] = nLa[i] + w; }
    for (let i = 0; i < nn; i++) { nR[i] = njR[i] * .975; nLa[i] = njL[i + 1] * .975; }   /* soft, lossy nasal cavity: nasal murmur is quieter than vowels */
    return R[n - 1] + nR[nn - 1]; }
  function render(L, R, wet, n) { let act = 0;
    for (const v of V) { if (!v.on) continue; act++; articulate(v, n);
      const gk = v.glideK, cdr = v.cdR, man = v.man, thin = Math.max(0, Math.min(1, 8 * (.7 - cdr))), open = Math.max(0, Math.min(1, 30 * (cdr - .05)));
      const fric = (man === 2 || (man === 1 && (!v.live || v.cdT > cdr))) ? thin * open : man === 4 ? thin * open * .3 : 0; let burst = v.burst; const bd = Math.exp(-1 / (.009 * SR));
      const ik = 1 - Math.exp(-1 / (SR * .012)), FXB = v.fx >= 0 && FX ? FX.bus(v.fx) : null, cm = SM[v.src], cutM = cm && cm.cut ? Math.max(.25, Math.min(4, cm.cut[0] + cm.cut[1] / 3000)) : 1, brK = Math.min(1, .6 * cutM), brM = Math.max(0, Math.min(1, (cutM - 1) * .5)); let lpb = v.lpb || 0; const bnd = SMB[v.src] || 1; let peak = 0; const tq = Math.pow(v.tense, .25), asq = (1 - Math.sqrt(v.tense)) * .18;
      for (let i = 0; i < n; i++) {
        v.f0 = v.f0T * bnd + (v.f0 - v.f0T * bnd) * gk; v.vibP += TAU * 5.2 / SR; v.inten += (v.intT - v.inten) * ik;
        v.wt += 1 / SR; if (v.wt > v.wl) { v.wt -= v.wl; v.jit = (noise() * .006 + Math.sin(v.vibP) * .006); v.wl = 1 / (v.f0 * (1 + v.jit)); lfSetup(v); }
        const ph = v.wt / v.wl, lf = lfAt(v, ph) * v.inten * tq;
        const asp = noise() * asq * (v.inten * (.1 + .2 * (ph < .5 ? Math.sin(TAU * ph) : 0)) + .02);
        // turbulence: band-passed noise at the constriction (fricatives), plus the release burst of stops
        const wn = noise(); v.bp1 += (wn - v.bp1) * .55; v.bp2 += (v.bp1 - v.bp2) * .55; const bn = v.bp1 - v.bp2 * .9;
        const turb = bn * (fric * .55 + burst * .9); burst *= bd;
        const o = stepTract(v, lf + asp, turb) * .35; const s = o * v.gain * v.fade;
        if (v.fading) { v.fade -= v.fading; if (v.fade <= 0) { v.fade = 0; } }
        lpb += (s - lpb) * brK; const so = lpb + (s - lpb) * brM; if (FXB) { FXB.L[i] += so * v.pl; FXB.R[i] += so * v.pr; } else { L[i] += so * v.pl; R[i] += so * v.pr; wet[i] += so * v.send; } const a = so < 0 ? -so : so; if (a > peak) peak = a; }
      v.lpb = lpb;
      v.burst = burst; v.lvl = peak;
      if (!v.live && v.si >= v.segs.length && v.inten < .002 && burst < .001) { v.silent += n; if (v.silent > SR * .12) v.on = 0; } else v.silent = 0;
      if (v.fade <= 0) { v.on = 0; v.fading = 0; if (v.next) { const m = v.next; v.next = null; if (m._live) liveOn(v, m); else start(v, m); } } }
    return act; }
  function start(v, m) { const fresh = !v.on || v.key !== m.key; alloc(v, m.len || 1); if (fresh) { v.R.fill(0); v.L.fill(0); v.nR.fill(0); v.nL.fill(0); v.f0 = m.f0; v.inten = 0; v.segs = []; v.si = 0; v.st = 0; v.wt = 0; v.wl = 1 / m.f0; v.tu = .5; v.td = 2.6; v.cdR = 3; }
    else { v.segs = v.segs.slice(v.si); v.si = 0; }   // legato: same creature keeps its tract and glides
    v.on = 1; v.key = m.key; v.src = m.src || 0; v.fx = m.fx == null ? -1 : m.fx; v.fade = 1; v.fading = 0; v.silent = 0; v.gain = m.gain || .1; const pan = Math.max(-1, Math.min(1, m.pan || 0)); v.pl = Math.cos((pan + 1) * Math.PI / 4); v.pr = Math.sin((pan + 1) * Math.PI / 4); v.send = m.send == null ? .3 : m.send;
    v.tenseT = m.tense == null ? .6 : m.tense; if (fresh) v.tense = v.tenseT; v.nasal = m.nasal || 0; v.tauK = .045 - .033 * (m.agil == null ? .5 : m.agil); v.glideK = Math.exp(-1 / (SR * (.02 + .05 * (1 - (m.agil == null ? .5 : m.agil)))));
    for (const s of m.segs) v.segs.push(s); if (!v.segs.length || !v.segs[0].f0) v.f0T = m.f0; if (fresh) lfSetup(v); }
  // v08-voice live mode: {t:'tract', live:'on'|'set'|'off', key, f0, gain, pan, tu, td, lip, vo, vel, cx, cd, man, burst}. A live voice is never stolen, ignores
  // segment messages with its key, and takes a voice at once (a free one, else the quietest: a 10 ms fade then it is ours).
  const LIVEK = ['f0', 'tu', 'td', 'lip', 'vo', 'vel', 'cx', 'cd', 'man'];
  function liveSet(v, m) { for (const k of LIVEK) if (m[k] != null) v.live[k] = m[k]; if (m.gain != null) v.gain = m.gain; if (m.burst) v.burst = 1; }
  function liveOn(v, m) { const fresh = !v.on || v.key !== m.key; v.next = null; start(v, { key: m.key, f0: m.f0 || 150, gain: m.gain, pan: m.pan, send: m.send, len: m.len, tense: m.tense, nasal: 0, agil: 1, segs: [] });
    v.live = { f0: m.f0 || 150, tu: .5, td: 2.6, lip: 1, vo: 0, vel: .01, cx: .8, cd: 3, man: 0 }; if (fresh) { v.tu = .5; v.td = 2.6; } liveSet(v, m); v.glideK = Math.exp(-1 / (SR * .022)); }
  function live(m) { let v = V.find(x => x.live && x.key === m.key); const w = !v && V.find(x => x.next && x.next._live && x.next.key === m.key);
    if (w) { if (m.live === 'off') w.next = null; else { Object.assign(w.next, m, { _live: 1 }); } return true; }   /* still fading out the stolen voice: keep the newest targets */
    if (m.live === 'off') { if (v) { v.live = null; v.segs = []; v.si = 0; } return !!v; }
    if (v) { if (m.live === 'on') liveOn(v, m); else liveSet(v, m); return true; } if (m.live !== 'on') return false;
    v = V.find(x => x.on && x.key === m.key && !x.fading) || V.find(x => !x.on && !x.next); if (v) { liveOn(v, m); return true; }
    let best = null; for (const x of V) if (!x.live && (!best || x.lvl < best.lvl)) best = x; if (!best) return false;
    best.fading = 1 / (SR * .01); best.next = Object.assign({}, m, { _live: 1 }); best.live = null; stolen++; return true; }
  function msg(m) { if (m.live) return live(m);
    let v = V.find(x => x.on && x.key === m.key && !x.fading); if (v) { if (v.live) return true; start(v, m); return true; }   /* v08-voice: the played ohm's own segment notes don't disturb its live mouth */
    v = V.find(x => !x.on && !x.next); if (v) { start(v, m); return true; }
    let best = null; for (const x of V) if (!x.fading && !x.live && (!best || x.lvl < best.lvl)) best = x; if (!best) return false; best.fading = 1 / (SR * .05); best.next = m; stolen++; return true; }
  const SM = {}, SMB = {};   /* live matrix mods per source (same messages as the synth voices) */
  const mod = (src, m) => { SM[src] = m; }, bend = (src, r) => { SMB[src] = r; };
  function lv(o) { for (const v of V) if (v.on) o[v.src] = (o[v.src] || 0) + (v.lvl || 0) * 3; }
  function off(src) { for (const v of V) if (v.on && v.src === src && !v.live) { v.segs = []; v.si = 0; } }
  return { msg, render, NT, mod, bend, lv, off, stats: () => ({ act: V.filter(v => v.on).length, stolen }), V };
}
