// SYNTH genes -> voice parameters (main thread). PORTED (copied) from /workspace/softsound/www/js/inst.js RS.Inst.fromGenome:
// all genes are continuous 0..1 leanings, read by NAME here (no genome index table). Dropped from the port: the v0.3.2 drum
// types and drum kits (gene perc above .7 only blends toward a drum-like body via percK), sections (g.sec).
const tri = (x, pos, w) => pos.map(p => Math.max(0, 1 - Math.abs(x - p) * w));
const norm = a => { const s = a.reduce((p, q) => p + q, 0) || 1; return a.map(v => v / s); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const EXC = ['pluck', 'strike', 'scrape', 'bow', 'blow', 'voc'], RES = ['str', 'modal', 'membrane', 'tube', 'form'];
export const ENGINES = ['eVA', 'eFM', 'eWT', 'eADD', 'ePD', 'eFOLD', 'eRING', 'eGRAN', 'eNRES'];
export const GENES = ['exc', 'res', 'fmI', 'fmR', 'inharm', 'noise', 'noiseCol', 'att', 'dec', 'sus', 'rel', 'curve', 'ftype', 'cut', 'reso', 'fenv', 'fdec', 'penv', 'ptime', 'lfoR', 'lfoP', 'lfoF', 'lfoA', 'detune', 'sat', 'formant', 'width', 'complexity', 'perc', 'pitched', 'transient', 'bodyRes',
  'eVA', 'eFM', 'eWT', 'eADD', 'ePD', 'eFOLD', 'eRING', 'eGRAN', 'eNRES', 'engMix', 'pwm', 'fmOps', 'fmFb', 'fmR2', 'wtPos', 'wtScan', 'addTilt', 'addSpread', 'pdAmt', 'fold', 'lpg', 'ringR', 'granDens', 'granSize', 'trem', 'techRate', 'gliss', 'drone'];
  export function fromGenes(g) { const q = k => { const v = g[k]; return v == null || isNaN(v) ? .5 : Math.max(0, Math.min(.9999, v)); }, ex = norm(tri(q('exc'), [0, .2, .4, .6, .8, 1], 4.5)), rs = norm(tri(q('res'), [0, .25, .5, .75, 1], 3.6));
    const P = {}; EXC.forEach((k, i) => P[k] = ex[i]); P.str = rs[0]; const bar = rs[1], mem = rs[2]; P.tube = rs[3]; P.form = rs[4]; P.modal = bar + mem;
    const ih = q('inharm'); const H = [1, 2, 3, 4], B = [1, 2.756, 5.404, 8.933], M2 = [1, 1.594, 2.136, 2.296]; P.ratios = H.map((h, k) => { const bb = h + (B[k] - h) * ih, w = P.modal ? mem / P.modal : 0; return bb * (1 - w) + M2[k] * w; });
    P.fmI = Math.pow(q('fmI'), 2) * 5; P.fmR = [.5, 1, 1, 2, 2, 3, 4, 5, 7][Math.floor(q('fmR') * 8.99)] * (1 + ih * .07); P.fmEnvK = q('fmI') > .5 ? 1 : 0;
    P.osc = Math.min(1, .3 * Math.max(0, q('complexity') - .5) + P.fmI * .15 + P.voc * .5 + (P.form ? .1 : 0));
    P.noise = Math.pow(q('noise'), 2) * .6; P.noiseLP = .05 + Math.pow(q('noiseCol'), 1.5) * .9;
    const percussive = P.pluck + P.strike; P.att = .001 * Math.pow(1000, q('att')) * (1 - .9 * percussive) + .0015; P.dec = .05 + Math.pow(q('dec'), 1.5) * 2.4; P.sus = q('sus') * (1 - .8 * percussive); P.rel = .03 + Math.pow(q('rel'), 1.6) * 2.5; P.curve = Math.pow(2, (q('curve') - .5) * 3);
    P.ftype = q('ftype') < .55 ? q('ftype') * .5 : q('ftype'); P.cut = 180 * Math.pow(60, q('cut')); P.q = 2 - 1.85 * Math.pow(q('reso'), 1.3); P.fenv = (q('fenv') - .3) * 4; P.fdec = .02 + Math.pow(q('fdec'), 1.5) * 1.4;
    P.penv = (q('penv') - .5) * 1.2 * Math.abs(q('penv') - .5) * 2; P.ptime = .005 + Math.pow(q('ptime'), 2) * .4;
    P.lfoR = .3 + Math.pow(q('lfoR'), 1.4) * 8; P.lfoP = Math.pow(q('lfoP'), 1.5) * .6; P.lfoF = Math.pow(q('lfoF'), 2) * 1.2; P.lfoA = Math.pow(q('lfoA'), 2) * .55;
    P.det = Math.pow(2, Math.pow(q('detune'), 2) * 25 / 1200); P.uni = q('detune') > .35 ? .7 : 0; P.sat = Math.pow(q('sat'), 2); P.width = q('width');
    const fs = .7 + q('formant') * .8, F1 = 500 * fs, F2 = 1500 * fs; P.F1k = Math.min(.9, 2 * Math.sin(Math.PI * F1 / 96000)); P.F2k = Math.min(.9, 2 * Math.sin(Math.PI * F2 / 96000)); P.F1 = F1; P.F2 = F2;
    P.mdec = .15 + Math.pow(q('dec'), 1.2) * 2.5 * (1 - mem * .6); P.fb = .95 + .045 * (1 - q('cut') * .3) * (P.bow + P.blow > .3 ? .99 : 1); P.fb = Math.min(.996, P.fb + q('dec') * .04); P.damp = .25 + .7 * q('cut');
    P.complexity = q('complexity');
    // ---- percussiveness (continuous): blend toward physical drum models. bodyRes: wood -> membrane -> metal shell -> bell; pitched: noise/unpitched -> tuned (marimba/kalimba)
    const pk = clamp((q('perc') - .45) / .35, 0, 1), k = pk * pk * (3 - 2 * pk); P.percK = k; P.perc = q('perc'); P.pitched = q('pitched'); P.transient = q('transient'); P.bodyRes = q('bodyRes');
    if (k > 0) { const br = q('bodyRes'), pt = q('pitched'), tr = q('transient'), L = (a2, b2) => a2 + (b2 - a2) * k, mixR = (A, B, u) => A.map((v, i) => v + (B[i] - v) * u);
      const WOOD = [1, 2.76, 5.4, 8.93], MEMB = [1, 1.594, 2.136, 2.296], METAL = [1, 1.483, 1.932, 2.546], BELL = [1, 1.2, 1.5, 2.0], MARIMBA = [1, 3.99, 9.95, 17.5], TABLA = [1, 2, 3, 4];
      let R2 = br < .33 ? mixR(WOOD, MEMB, br / .33) : br < .66 ? mixR(MEMB, METAL, (br - .33) / .33) : mixR(METAL, BELL, (br - .66) / .34); R2 = mixR(R2, br < .5 ? MARIMBA : TABLA, Math.max(0, pt - .6) / .4 * .8);
      P.ratios = mixR(P.ratios, R2, k);
      for (const e of EXC) P[e] = L(P[e], e === 'strike' ? .85 : e === 'scrape' ? (1 - pt) * .15 : 0); P.str = L(P.str, 0); P.tube = L(P.tube, 0); P.form = L(P.form, 0); P.modal = L(P.modal, 1); P.osc = L(P.osc, pt > .7 ? .2 : .05);
      const dec = br < .33 ? .05 + br * .6 : br < .66 ? .25 + (br - .33) * 1.5 : .7 + (br - .66) * 7; P.mdec = L(P.mdec, dec * (.6 + .8 * q('dec'))); P.dec = L(P.dec, dec * .8); P.sus = L(P.sus, 0); P.att = L(P.att, .0008); P.rel = L(P.rel, .04 + dec * .3);
      P.noise = L(P.noise, (1 - pt) * .55 + tr * .1); P.noiseLP = L(P.noiseLP, .2 + q('noiseCol') * .75); P.penv = L(P.penv, br > .2 && br < .55 ? -(.4 + (1 - pt) * .5) : 0); P.ptime = L(P.ptime, .012 + (1 - tr) * .05);
      P.cut = L(P.cut, 1500 + 9000 * (tr * .6 + (1 - pt) * .4)); P.ftype = L(P.ftype, pt < .3 && br > .5 ? .85 : .1); P.q = L(P.q, 1.2); P.lfoP = L(P.lfoP, 0); P.lfoA = L(P.lfoA, 0); P.fenv = L(P.fenv, 1 + tr * 2); P.fdec = L(P.fdec, .03 + (1 - tr) * .1); P.uni = L(P.uni, 0); }
    // ---- v0.3.2 DRUM TYPES: a drummer (perc > .7) is ONE drum voice, read from its genes; each type has its own synthesis character and the
    // remaining genes (dec, noiseCol, cut, sat, inharm) vary voices inside a type
    // ---- synth engines (12:29 steer): sparse gene-weighted blend of at most 2 engines + the physical models; technique genes
    { const E = ENGINES, ws = E.map((e, i) => [i, q(e)]).filter(w => w[1] > .3 && E[w[0]] !== 'eNRES').sort((a2, b2) => b2[1] - a2[1]).slice(0, 2), nr = q('eNRES') > .3 ? q('eNRES') : 0;
      let phys = ws.length || nr ? q('engMix') : 1; phys = Math.max(phys, k * .75); if ((ws.length || nr) && k < .5) phys = Math.min(phys, .07);   /* v0.3.1: the chosen engine IS the sound source (>= ~85 %), the physical body is only colour (drummers stay physical) */
      if (ws.length > 1) ws[1][1] = Math.min(ws[1][1], ws[0][1] * .35);   /* a second engine only colours the first */ const tot = ws.reduce((a2, w) => a2 + w[1], 0) + nr, rest = 1 - phys, EG = { eGRAN: 1.6, eRING: 1.1, eNRES: 1.2 };
      P.eng = ws.map(w => [w[0], rest * w[1] / (tot || 1) * (1.15 - k * .5) * (EG[E[w[0]]] || 1)]); P.nres = rest * nr / (tot || 1) * 1.3; P.phys = phys;
      P.vaShape = q('pwm') > .35 ? Math.min(1, (q('pwm') - .35) * 2.5) : 0; P.pwm = q('pwm');
      P.fmOps = 2 + Math.floor(q('fmOps') * 2.99); P.fmIx = .5 + Math.pow(q('fmI'), 1.3) * 6; P.fmFb = Math.pow(q('fmFb'), 1.5) * .9; P.fmR2 = [.5, 1, 1.414, 2, 3, 3.5, 5, 7.1][Math.floor(q('fmR2') * 7.99)];
      P.wtPos = q('wtPos'); P.wtScan = (q('wtScan') - .3) * 1.4; P.addTilt = .4 + q('addTilt') * 2.2; P.addSpread = Math.pow(q('addSpread'), 2) * 1.8; P.pdAmt = q('pdAmt');
      P.fold = q('fold'); P.lpg = .3 + q('lpg') * 2.5; P.ringR = [.5, 1.5, 2.01, 2.76, 3.3, 4.2, 5.4, 7.1][Math.floor(q('ringR') * 7.99)]; P.ringAM = q('ringR') * 3 % 1;
      P.granDens = q('granDens'); P.granSize = .02 + Math.pow(q('granSize'), 1.4) * .16;
      P.trem = q('trem') > .55 ? (q('trem') - .55) / .45 : 0; P.techRate = 6 + q('techRate') * 12; P.glT = q('gliss') > .3 ? .02 + (q('gliss') - .3) * .5 : 0; P.droneK = q('drone');
      if (ws.length) { const top = E[ws[0][0]]; P.engName = top; } else P.engName = nr ? 'eNRES' : 'phys';
      /* engines with sustained tone need some sustain to be heard when the physical model was percussive */ if (rest > .4 && P.sus < .25 && !k) P.sus = .25 + P.sus; }
  return P; }
