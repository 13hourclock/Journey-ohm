// AN OHM'S OWN INSTRUMENT vs THE SOUNDS IT HAS LEARNED (old game, approved Oct 23 2026: "It can learn other sounds too"; all ohms
// slowly learn extra sounds from teachers and jams, LAYERED ON their permanent birth voice, which is never lost or swapped; up to
// three learned sounds; a subtle blend by default; once a sound is FULLY learned it can play cleanly on its own, rarely ("Alone, but
// rarely": about 1 phrase in 8-16, under 10% of its notes, on the beat and in key; provisional, QUESTIONS 182 / Q10 deferred).
// Wilbow 2:29 AM Oct 25 "9D": what it sounds like depends on CONTEXT (who it jams with, what it touches, how long); 2:31 AM "An ohm is
// mostly its own sound but can learn to play in different patterns is maybe the best first step"; 3:41 AM Oct 23: carried items only
// modulate, never replace (untouched here).
// What the new build already had: blend.js learns partners' sounds into the brain and sound.js blends the top TWO under the own sound,
// capped at soundMax (35%) of an instrument voice. This adds, each behind its own switch:
//   learn3   (ON)  up to THREE learned sounds (was two); their shares together are capped at `cap` (.45), so the birth voice always
//                  keeps the larger part (and an instrument voice still takes at most soundMax of each, as before)
//   learnCtx (ON)  context: a learned sound comes forward while the ohm plays with (or near) the one it learned it from, and sits back
//                  otherwise (x ctxNear / x ctxFar, same total cap). Who it is with right now decides, as 9D asks.
//   learnSolo (OFF, taste: Q10 deferred / Q182 provisional) a FULLY learned sound (brain strength >= full x max) plays one phrase
//                  cleanly on its own now and then: 1 phrase in soloEvery (deterministic per ohm + phrase), only in a jam, capped at
//                  soloCap of its notes. The phrase is the ohm's own notes (on the beat, in key); only the voice changes.
// Learned sounds stay in the brain (saved with the ohm). Read-only for the look: lv.of(o) -> [{ rec, k, full }] (aura strands).
import { recipes } from './recipe.js';
export const LEARNV_OPTS = { cap: .45, learn3: true, ctx: true, solo: false, n: 3, ctxNear: 1.5, ctxFar: .6, near: 4, full: .9, soloEvery: 12, soloCap: .1, phraseBeats: 8 };
const u01 = (...a) => { let h = 2166136261; for (const x of a) { h ^= (x | 0) >>> 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return (h >>> 0) / 4294967296; };
export function createLearnVoice({ sim, music, blend, brain, opts = {} }) {
  const O = { ...LEARNV_OPTS, ...opts }, L = { opts: O, solos: 0, soloNotes: 0, notes: new Map(), sn: new Map(), lastCtx: new Map() };
  const base = blend.learnFor;   // blend.js: top 2 by share (sound on), or a little of your voice
  const BO = () => (sim.opts && sim.opts.blend) || {};
  // who taught it each learned sound: the partner ohms whose recipe it is (by id), so context can tell when they are near
  const holders = rec => { const out = []; for (const o of sim.ohms || []) if (o.recipe === rec) out.push(o); return out; };
  L.of = o => { if (!o || !o.brain || !brain) return []; const l = brain.list(o, 'sound'); if (!l.length) return []; let t = 1; for (const e of l) t += e.strength;
    const max = BO().max || 4, out = []; for (const e of l) if (e.key !== o.recipe && recipes.get(e.key)) out.push({ rec: e.key, k: e.strength / t, full: e.strength >= O.full * max });
    out.sort((a, b) => b.k - a.k); return out.slice(0, O.learn3 ? O.n : 2); };
  const near = (o, rec) => { const b = o.body; if (!b) return false; const P = sim.jam && sim.jam.partner; if (P && P.recipe === rec && (o === sim.ohm || P === o)) return true;
    for (const h of holders(rec)) if (h !== o && h.body && Math.hypot(h.body.x - b.x, h.body.y - b.y) < O.near) return true; return false; };
  blend.learnFor = o => { const c = BO(); if (!c.on || !c.sound || (!O.learn3 && !O.ctx)) return base(o);
    const l = L.of(o); if (!l.length) return base(o); let tot = l.reduce((s, x) => s + x.k, 0); if (tot > O.cap) { for (const x of l) x.k *= O.cap / tot; tot = O.cap; }   // the birth voice always keeps the larger part (>= 1 - cap)
    if (O.ctx) { let s2 = 0; for (const x of l) { x.k *= near(o, x.rec) ? O.ctxNear : O.ctxFar; s2 += x.k; } if (s2 > tot && s2 > 0) for (const x of l) x.k *= tot / s2; }   // context moves the parts, never the total
    return l.map(x => ({ rec: x.rec, k: x.k })); };
  // sound.js hook (world.soloFor): the recipe that voices this note instead of the own one, or null
  L.soloFor = (o, ev) => { if (!O.solo || !ev || !ev.jam || ev.deg == null || !o.brain) return null; const id = o.id; L.notes.set(id, (L.notes.get(id) || 0) + 1);
    const b = ev.beat != null ? ev.beat : music.beat(ev.t), ph = Math.floor(b / O.phraseBeats); if (u01(o.seed || id, ph, 0x501) * O.soloEvery >= 1) return null;
    const n = L.notes.get(id), s = L.sn.get(id) || 0; if (s + 1 > O.soloCap * Math.max(n, 1 / O.soloCap)) return null;
    const f = L.of(o).find(x => x.full); if (!f) return null; const R = recipes.get(f.rec); if (!R) return null; L.sn.set(id, s + 1); L.soloNotes++; if (L.lastCtx.get(id) !== ph) { L.lastCtx.set(id, ph); L.solos++; } return R; };
  sim.soloFor = L.soloFor;
  return L;
}
