// RARE OHMS, sound (PROPOSAL, Wilbow 4:12 PM MDT Oct 25 2026, point 1: "It sounds like nothing ordinary (two instruments
// blended, a rare tuning, extra overtones)"). A rare ohm's recipe carries rec.rare = rareSig(seed); voicesFor (recipe.js)
// hands its voice messages here. The note's pitch (f0, the fundamental) is NEVER changed: only the colour around it.
import { rng } from './rng.js';
import { PALETTE, instP, blendP } from './instruments.js';

export const RARE_SOUND = { on: true, blendK: .45, stretchMax: .07, overK: 1 };

// the uncommon mix in a seed: which signature (blend / tuning / overtones, sometimes two) and its numbers; deterministic
export function rareSig(seed) { const r = rng(((seed >>> 0) * 2654435761 ^ 0x7a2e51) >>> 0), kinds = ['blend', 'tuning', 'overtones'];
  const main = kinds[Math.floor(r() * 3)], second = r() < .45 ? kinds[(kinds.indexOf(main) + 1 + Math.floor(r() * 2)) % 3] : null;
  const has = k => main === k || second === k, sig = { seed: seed >>> 0, main, kinds: second ? [main, second] : [main] };
  sig.inst2 = has('blend') ? Math.floor(r() * PALETTE.length) : -1; sig.blend = .3 + r() * .35;
  sig.stretch = has('tuning') ? (r() < .5 ? -1 : 1) * (.035 + r() * .045) : 0;
  sig.over = has('overtones') ? [0, 1, 2].map(() => ({ r: 3.2 + r() * 6.5, a: .05 + r() * .07 })) : [];
  sig.shape = ['star', 'long', 'twin', 'wave'][Math.floor(r() * 4)]; sig.hueK = r(); return sig; }

const other = (sig, own) => { if (sig.inst2 < 0) return null; let i = sig.inst2 % PALETTE.length; const fam = (PALETTE.find(e => e.id === own) || {}).family;
  for (let k = 0; k < PALETTE.length; k++) { const e = PALETTE[(i + k) % PALETTE.length]; if (e.id !== own && e.family !== fam) return e.id; } return null; };

// voice messages in, the rare colour applied: second instrument blended into the instrument voice, upper partials stretched
// (the first mode, the fundamental, stays where it is), a few extra high inharmonic overtones on the body
export function rareVoices(rec, out, f0) { const sig = rec.rare; if (!sig || !RARE_SOUND.on || !out.length) return out; let done = 0;
  for (const m of out) {
    if (m.t === 'inst' && m.P && rec.inst) { const id2 = other(sig, rec.inst.a); if (id2) { const P2 = instP({ a: id2, b: id2, w: 0, s: rec.inst.s || 1 }); if (P2) done++; m.P = Object.assign(blendP(m.P, P2, Math.min(.6, sig.blend * RARE_SOUND.blendK / .45)), { tract: m.P.tract, gainK: m.P.gainK }); } }
    if (m.t === 'note' && m.modes && m.modes.length) { const b = m.modes[0].f, s = Math.max(-RARE_SOUND.stretchMax, Math.min(RARE_SOUND.stretchMax, sig.stretch));
      if (s && m.modes.length > 1) done++; if (s) for (let k = 1; k < m.modes.length; k++) { const q = m.modes[k].f / b; if (q > 1) m.modes[k].f = b * Math.pow(q, 1 + s); }
      if (sig.over.length) { done++; let add = 0; for (const o of sig.over) { const f = f0 * o.r; if (f < 15000) { m.modes.push({ f, a: o.a * RARE_SOUND.overK, d: (m.modes[0].d || 1) * .5 }); add += o.a * RARE_SOUND.overK; } }
        const n = 1 + add; for (const x of m.modes) x.a /= n; } } }
  const body = out.some(m => m.t === 'note'), over = sig.over.length && !body ? sig.over : !done ? [{ r: 4.37, a: .07 }, { r: 6.91, a: .05 }] : [];   /* no body layer for its overtones, or its signature could not touch these voices: a faint shimmer of overtones still marks it */
  if (over.length) { const src = out[0], modes = over.filter(o => f0 * o.r < 15000).map(o => ({ f: f0 * o.r, a: o.a, d: .6 }));
    if (modes.length) out.push({ t: 'note', modes, gain: .05 * RARE_SOUND.overK, click: 0, clickT: .004, clp: .1, att: .004, pan: src.pan || 0, send: src.send, src: src.src || 0, fx: src.fx, hold: 0, tag: 0 }); }
  return out; }
