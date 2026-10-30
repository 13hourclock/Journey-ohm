// DSP core for the audio thread. PORTED (copied, then trimmed) from /workspace/softsound/www/js/audio.js DSPFactory:
// fixed pool of modal voices (exciter = phasor impulse + filtered noise click, resonator = up to 8 damped complex
// oscillators), shared 4-line FDN reverb with pre-delay, gentle safety limiter. Changes vs the old engine:
//  - tract / inst / fx inserts removed for step 1 (they plug back in here in later steps)
//  - live params: reverb mix, reverb size (feedback), reverb damping, limiter ceiling, master
//  - click colour per note (exciter brightness), 'hold' voices (sustain, used only by the silent self-test ramp)
//  - per-block render timing (worklet load %), over-budget block count, note acks for touch-to-sound timing
// v0.0.2: ONE audio graph for every source: modal voices (this file) + synth voices (dsp/inst.js) -> per-owner insert chains
// (dsp/fx.js) -> shared FDN reverb -> limiter. Notes may carry 'at' (context time) and are queued until then (beat-scheduled
// sources: heartbeat now, jams later). Must stay self-contained: it is stringified into the worklet module
// (InstFactory / FXFactory are passed in so the same code runs in node tests and in the worklet).
export function DSPFactory(SR, NOW, InstFactory, FXFactory) {
  const FX = FXFactory(SR), INST = InstFactory(SR, FX), Q = [];
  const NV = 32, NM = 8, TAU = Math.PI * 2;
  const V = []; for (let i = 0; i < NV; i++) V.push({ on: 0, id: 0, src: 0, re: new Float32Array(NM), im: new Float32Array(NM), cr: new Float32Array(NM), ci: new Float32Array(NM), nm: 0,
    env: 0, att: 1, fade: 1, fading: 0, next: null, pl: .7, pr: .7, send: .3, click: 0, clickD: 0, clp: .35, lp: 0, freq: new Float32Array(NM), dec: new Float32Array(NM), age: 0, prio: 1, hold: 0, tag: 0, fx: -1 });
  const DL = [1557, 1617, 1491, 1422].map(n => Math.round(n * SR / 44100)), dl = DL.map(n => new Float32Array(n)), dp = [0, 0, 0, 0], lpz = [0, 0, 0, 0];
  const pre = new Float32Array(Math.round(.021 * SR)); let pp = 0;
  let wetB = new Float32Array(128); const o = [0, 0, 0, 0];
  const P = { revMix: 1, revFb: .78, revDamp: .45, ceiling: .7, master: .8, muffle: 0 };
  // v0.0.28 R2.10 deaf muffle (P.muffle 0..1): 2-pole low-pass on the master, 18 kHz (0) down to 600 Hz (1), smoothed per block with the
  // cutoff swept per sample (no zipper). Fully bypassed (no per-sample work) when muffle is 0 and settled.
  let mz = 0, mL1 = 0, mL2 = 0, mR1 = 0, mR2 = 0; const mco = m => 1 - Math.exp(-2 * Math.PI * 18000 * Math.pow(600 / 18000, m) / SR);
  let env = 0, gr = 1, grMin = 1, frames = 0, peak = 0, ns = 12345, stolen = 0, notes = 0;
  let busy = 0, busyMax = 0, blocks = 0, over = 0, overTot = 0, lE = 0, lF = 0, shed = 0, BUD = { on: true, lo: .45, hi: .85, min: 3, per: 3 }, starts = 0, spread = 0; const DF = [], acks = [];   // per: note starts per audio block (bursts at bar lines spread over a few ms)   // lF: fast load (budget); BUD: audio budget (F8), 'budget' message toggles   // lE: smoothed load; above .7 new synth notes first release the oldest synth voice (load guard)
  const noise = () => { ns = (ns * 1664525 + 1013904223) >>> 0; return ns / 2147483648 - 1; };
  function setup(v, n) { v.on = 1; v.id = n.id; v.src = n.src || 0; v.e0 = n.gain == null ? .3 : n.gain; v.nm = Math.min(NM, n.modes.length); v.age = 0; v.fade = 1; v.fading = 0; v.prio = n.prio || 1; v.hold = n.hold ? 1 : 0; v.tag = n.tag || 0; v.fx = n.fx == null ? -1 : n.fx;
    const pan = Math.max(-1, Math.min(1, n.pan || 0)); v.pl = Math.cos((pan + 1) * Math.PI / 4); v.pr = Math.sin((pan + 1) * Math.PI / 4); v.send = n.send == null ? .3 : n.send;
    v.att = Math.max(1, (n.att || .002) * SR); v.env = 0; v.click = (n.click || 0) * (n.gain || 1); v.clickD = Math.exp(-1 / (Math.max(.0005, n.clickT || .004) * SR)); v.clp = n.clp || .35; v.lp = 0;
    for (let k = 0; k < v.nm; k++) { const m = n.modes[k], f = Math.min(m.f, SR * .45); v.freq[k] = f; v.dec[k] = Math.exp(-1 / (Math.max(.01, m.d) * SR)); const w = TAU * f / SR; v.cr[k] = Math.cos(w) * v.dec[k]; v.ci[k] = Math.sin(w) * v.dec[k]; v.re[k] = (m.a || 0) * (n.gain || 1); v.im[k] = 0; }
    if (n.ack) acks.push({ id: n.id, ct: NOW() }); notes++; }
  function energy(v) { let e = 0; for (let k = 0; k < v.nm; k++) e += v.re[k] * v.re[k] + v.im[k] * v.im[k]; return e * v.fade * v.fade; }
  function note(n) { let free = null; for (const v of V) if (!v.on && !v.next) { free = v; break; }
    if (!free) { let best = null, be = 1e9; for (const v of V) { if (v.fading) continue; const e = energy(v) * v.prio * (v.hold ? 1e-6 : 1); if (e < be) { be = e; best = v; } }
      if (!best) { for (const v of V) if (v.fading && !v.next) { best = v; break; } } if (!best) return false;
      best.fading = 1 / (SR * (.06 + .06 * Math.min(1, be * 10))); best.next = n; stolen++; return true; }
    setup(free, n); return true; }
  function msg(d) {
    if (d.at != null && d.at > NOW() + .003) { Q.push(d); return; }
    if (BUD.on && (d.t === 'note' || (d.t === 'inst' && !d.tract)) && !d.ack) { if (starts >= BUD.per) { DF.push(d); spread++; return; } starts++; }   // F8 burst spread: past `per` starts this block, wait for the next (about 3 ms)
    if (d.t === 'note') note(d);
    else if (d.t === 'budget') { Object.assign(BUD, d.o || {}); }
    else if (d.t === 'inst') { if (BUD.on && !d.tract && INST.budget) { const l = Math.max(lE, lF * .85), cap = l < BUD.lo ? INST.NI : Math.max(BUD.min, Math.round(INST.NI - (l - BUD.lo) / (BUD.hi - BUD.lo) * (INST.NI - BUD.min))); if (!INST.budget(cap, d.ack ? 1e9 : d.gain)) return; }   // the player's own touch (acked) is never the one dropped: it makes room instead
      else if (lE > .7 && INST.stats().act >= 4) { INST.msg({ t: 'instShed' }); shed++; } INST.msg(d); if (d.ack) acks.push({ id: d.id, ct: NOW() }); notes++; }
    else if (d.t === 'fx') FX.msg(d);
    else if (d.t === 'smpSet' || d.t === 'smod' || d.t === 'bend' || d.t === 'instGain' || d.t === 'instOff') INST.msg(d);
    else if (d.t === 'param') { if (d.k in P) P[d.k] = d.v; }
    else if (d.t === 'damp') { INST.msg({ t: 'instOff', src: d.src }); const dd = Math.exp(-1 / (Math.max(.005, d.tau) * SR)); for (const v of V) if (v.on && (d.src == null || v.src === d.src)) for (let k = 0; k < v.nm; k++) if (dd < v.dec[k]) { const s = dd / v.dec[k]; v.dec[k] = dd; v.cr[k] *= s; v.ci[k] *= s; } }
    else if (d.t === 'release') { for (const v of V) if (v.on && v.tag === d.tag) v.fading = 1 / (SR * .05); }
    else if (d.t === 'all') { Q.length = 0; DF.length = 0; for (const v of V) if (v.on) v.fading = 1 / (SR * .1); INST.msg({ t: 'instAll' }); } }
  function render(L, R, n) { const t0 = NOW.perf ? NOW.perf() : 0; starts = 0; if (DF.length) { const k = Math.min(DF.length, BUD.per); for (const d of DF.splice(0, k)) msg(d); }
    if (Q.length) { const lim = NOW() + n / SR; for (let i = Q.length - 1; i >= 0; i--) if (Q[i].at <= lim) { const d = Q[i]; Q.splice(i, 1); d.at = null; msg(d); } }
    for (let i = 0; i < n; i++) { L[i] = 0; R[i] = 0; }
    if (wetB.length < n) wetB = new Float32Array(n); const wet = wetB; wet.fill(0, 0, n); let act = 0;
    for (const v of V) { if (!v.on) { if (v.next) { const nn = v.next; v.next = null; setup(v, nn); } else continue; } act++;
      const nm = v.nm, re = v.re, im = v.im, cr = v.cr, ci = v.ci; let e = v.env; const ai = 1 / v.att; let fade = v.fade, click = v.click, lp = v.lp; const pl = v.pl, pr = v.pr, sd = v.send, clp = v.clp, FB = v.fx >= 0 ? FX.bus(v.fx) : null;
      for (let i = 0; i < n; i++) { let s = 0;
        for (let k = 0; k < nm; k++) { const a = re[k], b = im[k]; re[k] = a * cr[k] - b * ci[k]; im[k] = a * ci[k] + b * cr[k]; s += im[k]; }
        if (e < 1) { e += ai; if (e > 1) e = 1; }
        if (click > 1e-5) { lp += (noise() * click - lp) * clp; s += lp; click *= v.clickD; }
        if (v.fading) { fade -= v.fading; if (fade <= 0) fade = 0; }
        s *= e * fade; if (FB) { FB.L[i] += s * pl; FB.R[i] += s * pr; } else { L[i] += s * pl; R[i] += s * pr; wet[i] += s * sd; } }
      v.env = e; v.fade = fade; v.click = click; v.lp = lp; v.age += n;
      if (fade <= 0) { v.on = 0; v.fading = 0; }
      else if (v.hold) { for (let k = 0; k < nm; k++) { const m = Math.hypot(re[k], im[k]); if (m < 1e-5 && m > 0) { re[k] *= 1e-4 / m; im[k] *= 1e-4 / m; } } }
      else if ((v.age & 1023) < n && energy(v) < 1e-9 && click < 1e-6 && e >= 1) { v.on = 0; v.fading = 0; } }
    const iact = INST.render(L, R, wet, n); FX.render(L, R, wet, n);
    const fb = P.revFb, dmp = 1 - P.revDamp, mix = P.revMix;
    for (let i = 0; i < n; i++) { const x = pre[pp]; pre[pp] = wet[i]; pp = (pp + 1) % pre.length;
      for (let j = 0; j < 4; j++) { o[j] = dl[j][dp[j]]; lpz[j] += (o[j] - lpz[j]) * dmp; o[j] = lpz[j]; }
      const sum = (o[0] + o[1] + o[2] + o[3]) * .5;
      for (let j = 0; j < 4; j++) { dl[j][dp[j]] = (o[j] - sum) * fb + x * .35; dp[j] = (dp[j] + 1) % DL[j]; }
      L[i] += (o[0] + o[2]) * .5 * mix; R[i] += (o[1] + o[3]) * .5 * mix; }
    const mt = P.muffle > 0 ? Math.min(1, P.muffle) : 0;
    if (mt > 0 || mz > 0) { const m0 = mz; mz += (mt - mz) * .08; if (mt === 0 && mz < 1e-3) mz = 0; let c = mco(m0); const dc = (mco(mz) - c) / n;
      for (let i = 0; i < n; i++) { c += dc; mL1 += (L[i] - mL1) * c; mL2 += (mL1 - mL2) * c; L[i] = mL2; mR1 += (R[i] - mR1) * c; mR2 += (mR1 - mR2) * c; R[i] = mR2; }
      if (Math.abs(mL1) + Math.abs(mL2) + Math.abs(mR1) + Math.abs(mR2) < 1e-18) mL1 = mL2 = mR1 = mR2 = 0; }   // flush near-silent state: no denormals in long quiet stretches
    else if (mL2 !== 0 || mR2 !== 0) { mL1 = mL2 = mR1 = mR2 = 0; }
    const rel = Math.exp(-1 / (.4 * SR)), ce = P.ceiling, ma = P.master;
    for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])) * ma; env = a > env ? a : env * rel + a * (1 - rel); const tg = env > ce ? ce / env : 1; gr = tg < gr ? tg : gr + (tg - gr) * .0005; if (gr < grMin) grMin = gr;
      let l = L[i] * ma * gr, r = R[i] * ma * gr; l = Math.tanh(l * 1.1) / 1.1; r = Math.tanh(r * 1.1) / 1.1; L[i] = l; R[i] = r; const al = l < 0 ? -l : l, ar = r < 0 ? -r : r, pk = al > ar ? al : ar; if (pk > peak) peak = pk; }
    frames += n; INST.feed(L, R, n);
    if (NOW.perf) { const dt = NOW.perf() - t0, bud = n / SR * 1000; busy += dt; if (dt > busyMax) busyMax = dt; blocks++; lE += (dt / bud - lE) * .02; lF += (dt / bud - lF) * .15; if (dt > bud) { over++; overTot++; } }
    return act; }
  function stats() { const bud = 128 / SR * 1000, is = INST.stats(), s = { iact: is.act, shed, lE, istolen: is.stolen, idrop: is.dropped || 0, spread, defer: DF.length, ibshed: is.budgetShed || 0, lF, bud: BUD.on, NI: INST.NI, fxOn: FX.stats().filter(Boolean).length, queued: Q.length, frames, peak, grDb: 20 * Math.log10(grMin), act: V.reduce((a, v) => a + v.on, 0), stolen, notes, load: blocks ? busy / blocks / bud : null, loadPeak: blocks ? busyMax / bud : null, over, overTot, acks: acks.splice(0) };
    peak = 0; grMin = gr; busy = 0; busyMax = 0; blocks = 0; over = 0; return s; }
  // per-source loudness (0..~1): modal ring energy + synth envelopes. Read every few blocks, posted as control events by the host.
  function levels() { const o = {}; for (const v of V) if (v.on) o[v.src] = (o[v.src] || 0) + Math.sqrt(energy(v)) * v.e0 * 4; INST.lv(o); return o; }
  return { render, msg, stats, levels, NV, NM, P };
}
