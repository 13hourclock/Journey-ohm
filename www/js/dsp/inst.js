// PORTED (copied) from /workspace/softsound/www/js/inst.js InstFactory (v0.8b9): pooled synth voices on the audio thread.
// Engines blended by recipe: physical models (pluck/strike/scrape/bow/blow/voiced x string/tube/modal/formant) plus
// VA/subtractive (polyBLEP saw/pulse, PWM), FM (2-4 ops, feedback), wavetable (pos + scan), additive (tilt, spread), phase distortion,
// wavefolder + low-pass gate, ring mod, granular (from the world's own recent sound), noise resonator. Per voice: ADSR amp env with curve,
// SVF (lp/bp/hp morph) with filter env + LFO, pitch env, vibrato, tremolo, unison detune, saturation, stereo width.
// Journey Ohm changes: export; v.src per voice; live per-source modulation ('smod': multiplies / offsets P fields of the
// voices of one source, applied to new voices of that source too) and 'bend' (pitch multiplier) - the mod matrix's live targets.
// Self-contained: stringified into the worklet.
import { TractFactory } from './tract.js';
export function InstFactory(SR, FX) {
  // vocal tract voices (tract.js; in the worklet TractFactory is a sibling const): an instrument whose part is 'voice' plays here
  const TR = typeof TractFactory === 'function' ? TractFactory(SR, FX) : null;
  // GB: the world's own recent sound (mono, 2 s), the granular engine's source; written by feed() from the final mix
  const GBN = SR * 2, GB = new Float32Array(GBN); let gbw = 0, gbE = 0; const feed = (L, R, n) => { for (let i = 0; i < n; i++) { const v = (L[i] + R[i]) * .5; GB[gbw] = v; gbw = (gbw + 1) % GBN; gbE += (v * v - gbE) * .0005; } };
  const blep = (t, dt) => t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0;
  const LNK = [0, 0, Math.log(2), Math.log(3), Math.log(4), Math.log(5), Math.log(6), Math.log(7), Math.log(8)];
  const NI = 14, TAU = Math.PI * 2, TL = 4096, SIN = new Float32Array(TL + 1); for (let i = 0; i <= TL; i++) SIN[i] = Math.sin(TAU * i / TL);
  const sn = p => { p -= Math.floor(p); const x = p * TL, i = x | 0; return SIN[i] + (SIN[i + 1] - SIN[i]) * (x - i); };   // phase in cycles
  let ns = 77; const noise = () => { ns = (ns * 1664525 + 1013904223) >>> 0; return ns / 2147483648 - 1; };
  const DLN = Math.ceil(SR / 25) + 4, V = []; let stolen = 0; const SB = {};   // v0.0.6 sample bank: id -> {d, hz} (your chopped voice)
  for (let i = 0; i < NI; i++) V.push({ on: 0, id: 0, dl: new Float32Array(DLN), dw: 0, lp: 0, P: null, t: 0, f: 220, rel: 0, relT: 0, envA: 0, envF: 0, ph: 0, ph2: 0, mph: 0, lfo: 0, s1: 0, s2: 0, m: new Float64Array(16), nz: 0, f1a: 0, f1b: 0, f2a: 0, f2b: 0, gain: .1, pl: .7, pr: .7, send: .3, fade: 1, fading: 0, next: null, relLvl: 0, p2: 0, p3: 0, p4: 0, fbS: 0, lpg: 0, gr: [{ a: 0, l: 1, p: 0, r: 1, on: 0 }, { a: 0, l: 1, p: 0, r: 1, on: 0 }], gT: 0, fx: -1, glide: 1, wtS: 0 });
  function setup(v, n) { const P = n.P; v.on = 1; v.id = n.id; v.P = P; v.P0 = Object.assign({}, P); v.src = n.src || 0; v.bend = SMB[v.src] || 1; applySM(v, SM[v.src]); v.t = 0; v.f = n.f; v.dur = Math.max(.02, n.dur || .3) * SR; v.rel = 0; v.envA = 0; v.envF = 0; v.ph = 0; v.ph2 = .25; v.mph = 0; v.lfo = (n.id * .137) % 1; v.s1 = v.s2 = 0; v.lp = 0; v.nz = 0; v.fade = 1; v.fading = 0; v.relLvl = 0; v.p2 = v.p3 = v.p4 = 0; v.fbS = 0; v.lpg = 0; v.gT = 0; v.gr[0].on = v.gr[1].on = 0; v.fx = n.fx == null ? -1 : n.fx; v.awC = 0; v.glide = n.from > 20 && P.glT ? n.from / n.f : 1;
    v.sb = null; v.sp = 0; if (P.smp || P.smpAny) { let be = 1e9; for (const s of (P.smp || Object.keys(SB).map(k => [k]))) { const b = SB[s[0]]; if (!b) continue; const e = Math.abs(Math.log2(n.f / b.hz)); if (e < be) { be = e; v.sb = b; } } }   // the slice nearest the note
    v.sFb = 0; v.sph = 0; if (v.sb) { const Ls = v.sb.d.length, h = (k) => { const x = Math.sin((n.src || 0) * 12.9898 + n.f * 78.233 + k * 37.719) * 43758.5453; return x - Math.floor(x); };   /* seeded per note: same ohm + note -> same cut */
      v.sRev = (P.smpRev || 0) > h(1) ? 1 : 0; v.s0 = Math.floor(h(2) * 4) / 4 * Ls * (P.smpChop || 0); if (v.sRev) v.s0 = Ls - 2 - v.s0; v.sp = v.s0; v.sStut = (P.smpRep || 0) > h(3) ? Math.round(SR / (P.smpRepHz || 8)) : 0; v.sT = 0; v.sF = 1; }
    else if (P.smpAny && !(P.osc > .02) && !(P.eGRAN > .02)) v.sFb = 1;   /* no slice recorded yet: a soft tone instead of silence */
    v.dl.fill(0); v.dw = 0; v.xa = v.xb = 0; v.m.fill(0); v.f1a = v.f1b = v.f2a = v.f2b = 0; v.vel = n.vel == null ? .8 : n.vel; v.gain = (n.gain == null ? .12 : n.gain) * (.35 + .65 * v.vel);
    { const u0 = Math.max(0, Math.min(1, v.vel)), u = P.velB != null ? .6 + (u0 - .6) * P.velB : u0; v.cutM = Math.pow(2, 1.7 * (u - .6)); v.ixM = .55 + .75 * u; v.wtO = .25 * (u - .6); v.tiltM = 1.35 - .6 * u; v.pdM = .6 + .65 * u; v.foldM = .5 + .85 * u; v.ringAM = Math.max(0, Math.min(1, P.ringAM * (1.25 - .5 * u))); v.grM = .4 + 1.3 * u; v.abM = .6 + .9 * u; v.satM = .75 + .5 * u; v.modM = .6 + .8 * u; }   /* v0.8b3 Q173a: a harder hit is BRIGHTER on every engine, not just louder (per-note constants: no per-sample cost) */
    const pan = Math.max(-1, Math.min(1, n.pan || 0)); v.pl = Math.cos((pan + 1) * Math.PI / 4); v.pr = Math.sin((pan + 1) * Math.PI / 4); v.send = n.send == null ? .3 : n.send;
    // modal bank coefficients (ratios blend harmonic -> bar/bell -> membrane by genes; set once per note)
    const R = P.ratios, pr = P.pr || 1, nm = Math.min(8, R.length); v.mc = []; for (let k = 0; k < nm; k++) { const fr = Math.min(n.f * R[k] / pr, SR * .45), r = Math.exp(-1 / (Math.max(.02, P.mdec * (1 - Math.min(k, 4) * .18)) * SR)); v.mc.push({ c: 2 * r * Math.cos(TAU * fr / SR), r2: r * r, g: (1 - r) * (k ? .55 / k * v.modM : 1), gs: Math.sin(TAU * fr / SR) * (k ? .55 / k * v.modM : 1) });   /* gs: strike gain (unit-ish ring per hammer pulse at any decay) */ }
    // excitation burst for plucks/strikes into the waveguide
    const L = Math.max(2, Math.min(DLN - 2, SR / (n.f * (P.tube > P.str ? 2 : 1)))); v.L = L; let lpN = 0; const ab = Math.min(1, P.noiseLP * v.abM); for (let i = 0; i < Math.min(DLN, Math.ceil(L)); i++) { lpN += (noise() - lpN) * ab; v.dl[i] = (P.pluck * lpN + P.strike * (i < L * .5 ? Math.sin(Math.PI * i / (L * .5)) : 0)) * .9; } v.dw = Math.ceil(L) % DLN; }
  function note(n) { let free = null; for (const v of V) if (!v.on && !v.next) { free = v; break; } if (!free) { let best = null, be = 1e9; for (const v of V) { if (v.fading) continue; const e = v.envA * (v.rel ? .3 : 1); if (e < be) { be = e; best = v; } } if (!best) return false; best.fading = 1 / (SR * .05); best.next = n; stolen++; return true; } setup(free, n); return true; }
  const SM = {}, SMB = {};   // live mods per source: SM[src] = { key: [mul, add] }, SMB[src] = pitch bend ratio
  function applySM(v, m) { if (!m) return; const P = v.P, P0 = v.P0; for (const k in m) if (typeof P0[k] === 'number') P[k] = P0[k] * m[k][0] + m[k][1]; }
  function msg(d) { if (d.t === 'smpSet') { if (d.d) SB[d.id] = { d: d.d, hz: d.hz }; else delete SB[d.id]; return; }
    if (d.t === 'smod') { SM[d.src] = d.m; if (TR) TR.mod(d.src, d.m); for (const v of V) if (v.on && v.src === d.src) { v.P = Object.assign(v.P, v.P0); applySM(v, d.m); } return; }
    if (d.t === 'bend') { SMB[d.src] = d.r; if (TR) TR.bend(d.src, d.r); for (const v of V) if (v.on && v.src === d.src) v.bend = d.r; return; }
    if (d.t === 'instGain') { for (const v of V) if (v.on && v.id === d.id) v.gain = d.gain * (.35 + .65 * v.vel); return; }
    if (d.t === 'instOff') { if (d.src != null && TR) TR.off(d.src); for (const v of V) if (v.on && v.id === d.id && !v.rel) v.dur = Math.min(v.dur, v.t); return; }
    if (d.t === 'instAll') { for (const v of V) if (v.on) v.fading = 1 / (SR * .1); if (TR) for (const v of TR.V) if (v.on) v.fading = 1 / (SR * .1); return; }
    if (d.t === 'inst') { if (d.tract) { if (TR) TR.msg(Object.assign({}, d.tract, { key: d.src || 0, src: d.src || 0, fx: d.fx, gain: d.gain, pan: d.pan, send: d.send })); } else note(d); } else if (d.t === 'instShed') { let o = null; for (const v of V) if (v.on && !v.rel && v.t < v.dur && (!o || v.t > o.t)) o = v; if (o) o.dur = o.t; } else if (d.t === 'instOff') { for (const v of V) if (v.on && v.id === d.id && !v.rel) v.dur = v.t; } }
  function render(L, R, wet, n) { let act = TR ? TR.render(L, R, wet, n) : 0;
    for (const v of V) { if (!v.on) { if (v.next) { const nn = v.next; v.next = null; setup(v, nn); } else continue; } act++; const P = v.P, dl = v.dl;
      const aT = P.att * SR, dT = P.dec * SR, rT = P.rel * SR, sus = P.sus, cu = P.curve, fdT = P.fdec * SR, lfoInc = P.lfoR / SR, g = v.gain, fb = P.fb * (P.tube > P.str ? -1 : 1), damp = P.damp;
      const wDL = P.str + P.tube, wM = P.modal, wO = P.osc, wF = P.form, bowE = P.bow, blowE = P.blow, scrE = P.scrape, vocE = P.voc, nAmt = P.noise, ab = Math.min(1, P.noiseLP * v.abM);
      const phys = P.phys == null ? 1 : P.phys, eng = P.eng || [], nres = P.nres || 0, trem = P.trem || 0, tPer = trem > .12 && v.dur > SR * 2 / P.techRate ? Math.round(SR / P.techRate) : 0, glK = P.glT ? Math.exp(-1 / (P.glT * SR)) : 0, FXB = v.fx >= 0 && FX ? FX.bus(v.fx) : null;
      let ph = v.ph, ph2 = v.ph2, mph = v.mph, lfo = v.lfo, s1 = v.s1, s2 = v.s2, lp = v.lp, nz = v.nz, envA = v.envA, fade = v.fade;
      // FAST PATHS (same sound): the FM osc pair only when something hears it; decaying envelopes as running products (no exp per
      // sample); pitch-env pow only while it moves; filter coefficient at control rate (every 4 samples)
      const vD = (P.vibD || 0) * SR, vR = Math.max(1, (P.vibRamp || .3) * SR), obk = P.detHz > 0 && wM > .02, sLn = Math.max(6, Math.round(SR * (.0003 + .0017 * (1 - (P.modalBright == null ? .5 : P.modalBright))))), sAm = 2 / sLn,   /* strike: a half-sine hammer pulse (harder = shorter = brighter) that reaches the low modes; was a Nyquist-rate click */ uniW = Math.min(1, wO * phys + eng.reduce((a, E) => a + E[1], 0)), obP = TAU * (P.detHz || 0) / SR;   // delayed vibrato; ombak beating for single-voice (modal) rows
      const needO = wO * phys > .005 || wF > .02 || P.uni > 0 || vocE > .005, dF = Math.exp(-1 / fdT), pT = P.ptime * SR, dP = Math.exp(-1 / pT), pv = P.penv, lP = P.lfoP;
      // waveguide TUNING: loop length = period (string) or half period (inverted tube) MINUS the loop filter's phase delay at f0
      // (one-pole lowpass y += (x - y) * damp: tau = atan2((1-d) sin w, 1 - (1-d) cos w) / w samples). Pitch follows bend + pitch env.
      // TUBES use a symmetric 3-tap loss filter (g, 1-2g, g): the same 1-sample delay at EVERY harmonic, so an overblown, saturated
      // (square-ish) tube stays in tune; strings keep the one-pole (their tau at f0 is subtracted below).
      const tubeL = P.tube > P.str, linL = tubeL || P.blow > .3, tg = .25 * Math.min(1, Math.max(0, (1 - damp) / .7)); let xa = v.xa || 0, xb = v.xb || 0;
      const wgK = SR / (P.tube > P.str ? 2 : 1); let tauD = linL ? 1 : 0; if (wDL > .02 && !linL) { const w0 = TAU * Math.min(v.f * v.bend, SR * .45) / SR, a = 1 - damp; tauD = Math.atan2(a * Math.sin(w0), 1 - a * Math.cos(w0)) / w0; }
      let eF = v.t ? Math.exp(-v.t / fdT) : 1, eP = v.t ? Math.exp(-v.t / pT) : 1, Fc = 0, o1 = 0, o2 = 0;
      for (let i = 0; i < n; i++) { const t = v.t++;
        // envelopes (amp ADSR with curve; filter AD)
        if (!v.rel && t >= v.dur) { v.rel = 1; v.relT = t; v.relLvl = envA; }
        if (v.rel) { const u = (t - v.relT) / rT; envA = u >= 1 ? 0 : v.relLvl * Math.pow(1 - u, cu); }
        else if (t < aT) envA = Math.pow(t / aT, 1 / cu); else if (t < aT + dT) envA = 1 - (1 - sus) * Math.pow((t - aT) / dT, 1 / cu); else envA = sus;
        const envF = eF; eF *= dF; lfo += lfoInc; const lf = sn(lfo);
        if (v.glide !== 1) { v.glide = 1 + (v.glide - 1) * glK; if (Math.abs(v.glide - 1) < 1e-4) v.glide = 1; }
        const pe = (pv || lP ? Math.pow(2, pv * eP + (vD && t < vD + vR ? (t < vD ? 0 : (t - vD) / vR) : 1) * lP * lf / 12) : 1) * v.glide; eP *= dP; const f = v.f * pe * v.bend;
        const tu = tPer ? (t % tPer) : t, tk = tPer ? .45 + .55 * Math.exp(-tu / tPer * 4) : 1;   /* tremolo picking / rolls: re-articulate at the technique rate */
        // exciters (continuous ones follow the amp envelope)
        nz += (noise() - nz) * ab; const cont = envA * (bowE * ((ph % 1) * 2 - 1) * .5 + blowE * nz * 1.4 + scrE * nz * (noise() > .6 ? 2 : .3)) + vocE * envA * (Math.pow(sn(ph), 9) * .8) + (tPer && tu < 48 && t > tPer ? (P.pluck + P.strike) * noise() * .9 : 0);
        // waveguide (string: +feedback; tube/reed: inverted feedback + reed nonlinearity)
        let wg = 0; if (wDL > .02) { const Lc = Math.max(2, Math.min(DLN - 3, wgK / f - tauD)), rp = v.dw - Lc + DLN * 2, i0 = Math.floor(rp) % DLN, fr = rp - Math.floor(rp), xm = dl[(i0 + DLN - 1) % DLN], x0 = dl[i0], x1 = dl[(i0 + 1) % DLN], x2 = dl[(i0 + 2) % DLN], x = x0 + fr * (x1 - xm) * .5 + fr * fr * (xm - 2.5 * x0 + 2 * x1 - .5 * x2) + fr * fr * fr * (1.5 * (x0 - x1) + .5 * (x2 - xm)); /* cubic read: flatter phase than linear at high notes */ if (linL) { lp = tg * (x + xb) + (1 - 2 * tg) * xa; xb = xa; xa = x; } else lp += (x - lp) * damp; let y = lp * fb + cont * .25; if (fb < 0) y = Math.tanh(y * 1.6) * .8; dl[v.dw] = y; v.dw = (v.dw + 1) % DLN; wg = x; }
        // modal bank (bar/bell/membrane), driven by the exciters + the initial strike
        let md = 0; if (wM * phys > .02 || nres > .02) { const ex = cont + nres * nz * envA * 1.6, st = tu < sLn ? (P.strike + P.pluck) * Math.sin(Math.PI * tu / sLn) * sAm : 0; const mc = v.mc, vm = v.m; for (let k = 0; k < mc.length; k++) { const m = mc[k], y = m.c * vm[k] - m.r2 * vm[k + 8] + ex * m.g + st * m.gs; vm[k + 8] = vm[k]; vm[k] = y; md += y; } if (obk) md *= 1 - .45 * (1 - Math.cos(obP * t)); md *= 2.5; }
        // FM operator pair (+ detuned unison), and its formant-filtered version
        ph += f / SR; ph2 += (f * P.det + (P.detHz || 0)) / SR; mph += f * P.fmR / SR; const ix = P.fmI * (.25 + .75 * (P.fmEnvK ? envF : 1));
        if (needO) { o1 = sn(ph + ix * sn(mph) / TAU * 1.0); o2 = P.uni > 0 ? sn(ph2 + ix * sn(mph * 1.003) / TAU) : 0; } const osc = o1 + o2 * P.uni;
        let fm = 0; if (wF > .02) { const src = osc + nz * .4 + vocE * Math.pow(sn(ph), 9); const a1 = P.F1k, a2 = P.F2k; v.f1a += a1 * (src - v.f1a - v.f1b * 1.6); v.f1b += a1 * v.f1a; v.f2a += a2 * (src - v.f2a - v.f2b * 1.3); v.f2b += a2 * v.f2a; fm = (v.f1a * 1.2 + v.f2a * .8); }
        let x = phys * (wDL * wg * 1.6 + wM * md + wO * osc * .55 + wF * fm) + nAmt * nz * envA * 1.5 + nres * md * .8;
        if (v.sb) { const d = v.sb.d, p = v.sp, i0 = p | 0; if (i0 >= 0 && i0 + 1 < d.length) { x += (d[i0] + (d[i0 + 1] - d[i0]) * (p - i0)) * 2.2 * v.sF; v.sp += (v.sRev ? -1 : 1) * f / v.sb.hz; } if (v.sF < 1) v.sF += 1 / 48;
          if (v.sStut && ++v.sT >= v.sStut) { v.sT = 0; v.sp = v.s0; v.sF = 0; } }   /* sample layer: the slice re-pitched to the note, chopped / reversed / stuttered */
        else if (v.sFb) { v.sph += f / SR; if (v.sph >= 1) v.sph -= 1; x += Math.sin(TAU * v.sph) * .3 + Math.sin(2 * TAU * v.sph) * .08; }
        // ---- synth engines (at most two per voice, chosen + weighted by genes) ----
        for (let e = 0; e < eng.length; e++) { const E = eng[e], ew = E[1]; let y = 0; const fr = ph - Math.floor(ph), dt = f / SR;
          switch (E[0]) {
            case 0: { /* virtual analog: saw <-> PWM pulse (polyBLEP) */ const pw = .5 - P.pwm * .42 * (.6 + .4 * lf); const saw = 2 * fr - 1 - blep(fr, dt); let fq = fr + (1 - pw); fq -= Math.floor(fq); const pu = (fr < pw ? 1 : -1) + blep(fr, dt) - blep(fq, dt); y = saw * (1 - P.vaShape) + pu * P.vaShape; break; }
            case 1: { /* FM 2-4 operators: op3 (self-feedback) -> op2 -> carrier, op4 parallel */ const ix = P.fmIx * v.ixM * (.3 + .7 * envF); v.p2 += f * P.fmR / SR; let m2 = 0; if (P.fmOps > 2) { v.p3 += f * P.fmR2 / SR; const o3 = sn(v.p3 + P.fmFb * v.fbS); v.fbS = o3; m2 = o3 * ix * .5; } const o2 = sn(v.p2 + m2 / TAU * 2); let m1 = o2 * ix; if (P.fmOps > 3) { v.p4 += f * (P.fmR2 * .5 + .5) * 1.002 / SR; m1 += sn(v.p4) * ix * .4; } y = sn(ph + m1 / TAU * 2); break; }
            case 2: { /* wavetable morph sine -> tri -> saw -> square -> formant, scanned by the env + LFO */ const pos = Math.max(0, Math.min(3.999, (P.wtPos + v.wtO + P.wtScan * (envF - .5) + P.wtScan * .25 * lf) * 4)), k0 = pos | 0, u = pos - k0; const sh = k => k === 0 ? sn(fr) : k === 1 ? 1 - 4 * Math.abs(fr - .5) : k === 2 ? 2 * fr - 1 - blep(fr, dt) : k === 3 ? (fr < .5 ? 1 : -1) : sn(fr * 3.02) * (1 - fr); y = sh(k0) * (1 - u) + sh(k0 + 1) * u; break; }
            case 3: { /* additive: 8 partials, spectral tilt (opens with the env) + inharmonic spread */ if (!v.aw) v.aw = new Float32Array(9); if ((v.awC = (v.awC || 0) - 1) <= 0) { v.awC = 32; const tl = P.addTilt * v.tiltM * (1.2 - .7 * envF); for (let k = 1; k <= 8; k++) v.aw[k] = Math.exp(-tl * LNK[k]); }   /* tilt weights refreshed every 32 samples (was a pow per partial per sample) */
              for (let k = 1; k <= 8; k++) { const kr = k * (1 + P.addSpread * (k - 1) * .045); if (f * kr > SR * .45) break; y += sn(ph * kr) * v.aw[k]; } y *= .55; break; }
            case 4: { /* phase distortion (CZ): warped phase cosine, resonant with depth */ const d = .5 - Math.min(1, P.pdAmt * v.pdM) * .46 * (.35 + .65 * envF), w = fr < d ? .5 * fr / d : .5 + .5 * (fr - d) / (1 - d); y = -sn(w + .25); break; }
            case 5: { /* west coast: wavefolder into a low-pass gate (vactrol-ish: brightness + level follow the env) */ const b0 = sn(fr) * .8 + (1 - 4 * Math.abs(fr - .5)) * .2, xf = b0 * (1 + P.fold * v.foldM * 7 * (.25 + .75 * envF)); const fo = sn(xf * .25); v.lpg += (fo - v.lpg) * (.015 + .85 * Math.pow(envA, P.lpg)); y = v.lpg; break; }
            case 6: { /* ring / AM against an (often inharmonic) modulator */ const mo = sn(ph * P.ringR + .1); const cc = sn(fr); y = cc * (v.ringAM * (.5 + .5 * mo) + (1 - v.ringAM) * mo); break; }
            case 7: { /* granular: grains of the world's own recent sound, pitched to the note */ const gl = P.granSize * SR; if (--v.gT <= 0) { const g2 = v.gr[v.gr[0].a >= v.gr[0].l ? 0 : 1]; g2.on = 1; g2.a = 0; g2.l = gl; g2.r = Math.max(.25, Math.min(4, f / 261.6)); g2.p = (gbw - SR * (.05 + Math.abs(noise()) * 1.4) - gl * g2.r + GBN * 4) % GBN; if (v.sb) { const Ls = v.sb.d.length; g2.r = Math.max(.125, Math.min(8, f / v.sb.hz)) * ((P.smpRev || 0) > Math.abs(noise()) ? -1 : 1); const span = gl * Math.abs(g2.r); g2.p = Math.min(Ls - 2, span + Math.abs(noise()) * Math.max(0, Ls - 2 - 2 * span)); } v.gT = gl / (1 + P.granDens * 5); }
              if (v.sb) { const d = v.sb.d, Ls = d.length; for (const g2 of v.gr) { if (!g2.on || g2.a >= g2.l) continue; const pp = g2.p + g2.a * g2.r, i0 = pp | 0; if (i0 >= 0 && i0 + 1 < Ls) y += (d[i0] + (d[i0 + 1] - d[i0]) * (pp - i0)) * (.5 - .5 * sn(g2.a / g2.l + .25)) * 1.6; g2.a++; } break; }   /* grains of a recorded bank slice (sample_grain), some reversed */
              for (const g2 of v.gr) { if (!g2.on || g2.a >= g2.l) continue; const pp = (g2.p + g2.a * g2.r) % GBN, i0 = pp | 0, s0 = GB[i0] + (GB[(i0 + 1) % GBN] - GB[i0]) * (pp - i0); y += s0 * (.5 - .5 * sn(g2.a / g2.l + .25)) * 6; g2.a++; }
              const lvl = Math.sqrt(gbE); y = y / Math.max(.02, lvl * 6) * .5 * Math.min(1, lvl * 40) + sn(fr) * .22 * (1 - Math.min(1, lvl * 40)) + sn(fr * 2.01) * .08 * v.grM + sn(fr * 3.02) * .05 * (v.grM - .4); break; }   /* silent world -> a soft tone instead of nothing */
          }
          x += y * ew * .9; }
        x *= tk;
        // SVF (Chamberlin, 2x oversampled) with lp/bp/hp morph, filter envelope + LFO
        if ((i & 3) === 0) { const fc = Math.min(SR * .2, P.cut * v.cutM * Math.pow(2, P.fenv * envF + P.lfoF * lf)); Fc = 2 * Math.sin(Math.PI * fc / (SR * 2)); } const F = Fc, q = P.q;
        for (let os = 0; os < 2; os++) { const hp = x - s1 - q * s2; s2 += F * hp; s1 += F * s2; v.hp = hp; }
        const lpo = s1, bpo = s2, hpo = v.hp, ft = P.ftype; let y = ft < .5 ? lpo * (1 - ft * 2) + bpo * ft * 2 : bpo * (2 - ft * 2) + hpo * (ft * 2 - 1);
        if (P.sat > .02) y = Math.tanh(y * (1 + P.sat * v.satM * 5)) / (1 + P.sat * 1.5);
        y *= envA * g * (1 - P.lfoA * (.5 + .5 * lf));
        if (v.fading) { fade -= v.fading; if (fade < 0) fade = 0; } y *= fade;
        const w = P.width * (o2 * P.uni * .3) * uniW;   /* unison side only as strong as the osc / engine layers it widens (a bar or string row has none) */ if (FXB) { FXB.L[i] += y * v.pl + w * envA * g; FXB.R[i] += y * v.pr - w * envA * g; } else { L[i] += y * v.pl + w * envA * g; R[i] += y * v.pr - w * envA * g; wet[i] += y * v.send; } }
      v.ph = ph % 1e3; v.ph2 = ph2 % 1e3; v.mph = mph % 1e3; v.lfo = lfo % 1e3; v.s1 = s1; v.s2 = s2; v.lp = lp; v.xa = xa; v.xb = xb; v.nz = nz; v.envA = envA; v.fade = fade;
      if (fade <= 0 || (v.rel && envA < 1e-4) || !isFinite(s1)) { v.on = 0; v.fading = 0; }
    } return act; }
  function lv(o) { for (const v of V) if (v.on) o[v.src] = (o[v.src] || 0) + v.envA * v.gain * v.fade * 3; if (TR) TR.lv(o); }
  // AUDIO BUDGET (board F8; dsp.js decides the cap from load): fewer simultaneous synth voices when the worklet is busy; the QUIETEST sound loses,
  // the new note or a playing one (far / soft ohms drop first, near and loud ones keep playing). Released voices fade (no click).
  let dropped = 0, budgetShed = 0;
  function budget(cap, gain) { let act = 0, q = null, qe = 1e9; for (const v of V) if (v.on && !v.rel && !v.fading) { act++; const e = (v.gain || .1) * (v.envA || .001); if (e < qe) { qe = e; q = v; } }
    if (act < cap) return true; if (q && (gain || .1) * .5 <= qe) { dropped++; return false; }   // the new note is the quietest: skip it
    while (act >= cap && q) { q.dur = q.t; budgetShed++; act--; q = null; qe = 1e9; for (const v of V) if (v.on && !v.rel && !v.fading && v.t < v.dur) { const e = (v.gain || .1) * (v.envA || .001); if (e < qe) { qe = e; q = v; } } } return true; }
  return { render, msg, feed, lv, budget, stats: () => ({ act: V.reduce((a, v) => a + v.on, 0), stolen, dropped, budgetShed, tract: TR ? TR.stats().act : 0 }), NI };
}
