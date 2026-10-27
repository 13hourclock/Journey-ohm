// ARPEGGIO HABIT (Wilbow 3:58 PM Oct 25, Q356 'b' + "and from learning"): some ohms are BORN arpeggiators (an arpeggio gene from the
// recipe seed: gene < opts.arp.born, ~30% by default); an ohm without it can PICK IT UP the way drummers pick up kit hits (drums.js
// D.learn): blend.js's per-bar loop calls A.learn(o, s, togetherness x closeness) for every pair that played together, and when s
// arpeggiates - an ohm with the habit, or the PLAYER (your ohm / your voice) playing a broken chord that bar (>= 3 notes, >= 3 pitches,
// stepping by thirds / fourths) - an 'arp' brain entry grows; at strength 1 the habit is its own (kept, saved with its brain). The
// player teaches faster (playerK). An arpeggiating ohm plays its jam turns (autojam.js) as broken chords: the phrase's rhythm, its
// pitches replaced by the chord's tones walked up, down or up-and-down (its gene) across two octaves. Switch opts.arp.on (ON).
// Rates and shares are my defaults. No harp frames, no River gesture (not asked).
import { recipes } from './recipe.js';
export const ARP_OPTS = { on: true, born: .3, rate: .08, playerK: 1.5 };
export const arpGene = seed => { let h = ((seed >>> 0) * 2246822519 ^ 0x5bd1e995) >>> 0; h = Math.imul(h ^ (h >>> 15), 2654435761) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function createArp(world, brain, opts = {}) { const O = Object.assign({}, ARP_OPTS, opts), A = { opts: O, learned: 0 };
  const seedOf = o => { const r = recipes.get(o.recipe); return r && r.seed != null ? r.seed : o.seed != null ? o.seed : null; };
  A.born = o => { const s = seedOf(o); return s != null && arpGene(s) < O.born; };
  A.strength = o => { if (!brain || !brain.get) return 0; const e = brain.get(o, 'arp', 'arp'); return e ? e.strength : 0; };
  A.is = o => !!o && o.scale === 'ohm' && (A.born(o) || A.strength(o) >= 1);
  A.dir = o => { const s = seedOf(o); const g = s != null ? arpGene((s ^ 0xa5a5) >>> 0) : 0; return g < .45 ? 'up' : g < .75 ? 'down' : 'updown'; };
  // does this bar's notes (blend.js B.hits: [{ b, d }]) sound like a broken chord?
  A.detect = h => { if (!h || h.length < 3) return false; const n = h.slice().sort((a, b) => a.b - b.b); if (new Set(n.map(x => x.d)).size < 3) return false; let good = 0;
    for (let i = 1; i < n.length; i++) { const iv = Math.abs(n[i].d - n[i - 1].d); if (iv === 2 || iv === 3) good++; } return good >= Math.max(2, .75 * (n.length - 1)); };
  const isPlayer = s => s.scale === 'voice' || s === world.ohm;
  A.learn = (o, s, k, hits) => { if (!O.on || !brain || k <= 0 || !o || o.scale !== 'ohm' || A.is(o)) return false;
    const teaches = isPlayer(s) ? A.detect(hits) : A.is(s); if (!teaches) return false;
    const e = brain.remember(o, 'arp', 'arp', null, O.rate * k * (isPlayer(s) ? O.playerK : 1), 1); if (e) e.keep = 1; if (e && e.strength >= 1) { A.learned++; return true; } return false; };
  // a turn's notes [{ b, deg, oct, vel }] -> the same rhythm on the chord's tones (two octaves), in the ohm's direction
  A.shape = (o, notes, chord = [0, 2, 4]) => { if (!O.on || !A.is(o) || !notes.length) return notes; const c = chord.slice(0, 3), tones = [...c, ...c.map(t => t + 7)], d = A.dir(o), m = tones.length;
    const seq = d === 'up' ? tones : d === 'down' ? tones.slice().reverse() : [...tones, ...tones.slice(1, -1).reverse()];
    return notes.map((n, i) => { const t = seq[i % seq.length]; return { ...n, deg: t, oct: (n.oct || 0), arp: 1 }; }); };
  return A; }
