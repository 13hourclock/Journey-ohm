// SENSES AS GRADIENT GENES, the deaf muffle (v0.0.28; NEW_ENGINE Appendix A: R5.5 L715 "Blind/deaf and other senses as gradient genes",
// R2.10 L671 "Senses as audio filters while driving an ohm (listener at the ohm, deaf muffle)", both CARRY = approved).
// Every ohm already carries a 'hear' gene (0..1) in the abilities gene stream (inherited, also used by echolocation, perfect pitch,
// mimicry). Below SENSE_OPTS.deaf it is partly deaf, a gradient down to fully deaf at 0. While you DRIVE a deaf ohm, the whole mix
// is heard through its ears: a master low-pass (dsp.js P.muffle) from barely dull to underwater (up to .85). Switch to a hearing ohm
// (or turn the switch off) and it opens again over about 30 ms. The worklet does no extra work at muffle 0.
// Blindness (low 'sight') is the same gene stream; what it changes is a visual (look/) call, held, not built here.
export const SENSE_OPTS = { on: true, deaf: .25, max: .85 };
export function deafness(hear, O = SENSE_OPTS) { if (!(hear < O.deaf)) return 0; return Math.min(1, (O.deaf - Math.max(0, hear)) / O.deaf) * O.max; }
export function createSenses({ sim, abilities, audio }) {
  const O = { ...SENSE_OPTS }, S = { opts: O, muffle: 0, sent: 0, changes: 0 };
  S.target = () => { const o = sim.ohm; if (!O.on || !o || !abilities) return 0; const g = abilities.genes(o); return g ? deafness(g.hear, O) : 0; };
  S.tick = () => { const m = S.target(); S.muffle = m; (sim.muffle || (sim.muffle = { amt: 0 })).amt = m;   // sim.muffle.amt: read by audiosig.js (look signals)
    if (Math.abs(m - S.sent) > .01 || (m === 0 && S.sent !== 0)) { S.sent = m; S.changes++; if (audio && audio.setParam) audio.setParam('muffle', m); } };
  return S; }
