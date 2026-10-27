// STEP 5 B: DRUMMER OHMS AND DRUM KITS (Wilbow 8:50 PM Oct 23: "Drums should be able to play a mix of sounds through learning from other
// types of drum" / "As in slowly becoming a full kit through experience"; 3:35 AM Oct 25 pick B; restored by the 10:34 roll-back).
// A drummer = an ohm whose own instrument row is a drum row of the palette (INSTRUMENT_PALETTE.md; nothing here edits the palette).
// BIRTH HITS: its own row (it keeps its own gene-blended sound) + up to 2 more, seeded from its seed, in other kit roles. Permanent.
// LEARNED HITS: jamming with another drummer (blend.js per-bar loop -> D.learn) grows a 'kit' brain entry for each of the partner's hits it
// lacks; at strength 1 the hit joins its kit (kept, never fades, saved with the ohm's brain). Missing roles are learned faster.
// PLAYING: each note picks the hit for its place in the place's tradition cycle (CYCLES below: clave, bell, tala, gongan, aksak), and
// where the place has no tradition by the default bar (downbeat = low, 2 & 4 = backbeat, off-beats = time, beat 3 = tom, 16ths = colour);
// a role it doesn't have yet falls back to its own sound, so a young drummer sounds like itself and a seasoned one like a full kit.
// Defaults from his questions: Q209 the body keeps its birth shape; Q210 hatchlings start from their own birth hits only (no inheritance).
import { recipes, withRow } from './recipe.js';
import { rng } from './rng.js';
import { PLACE, percGene } from './instruments.js';
export const DRUM_OPTS = { on: true, rate: .02, cap: 8, birthMax: 3, missingK: 1, haveK: .5, percK: 1 };   // placeholders for MT (rate = ~50 shared bars per hit)
export const ROLE = { kick: 'low', snare: 'back', clap: 'back', shaker_hat: 'time', motion_rattle: 'time', wood_clave: 'time',
  taiko: 'tom', frame_drum: 'tom', talking_drum: 'tom', djembe: 'tom', tabla: 'colour', agogo: 'colour' };
export const ROLES = ['low', 'back', 'time', 'tom', 'colour'];   // a full kit (his "full kit": kick, snare, hat/shaker, tom, colour)
export const isDrumRow = id => ROLE[id] != null;
export function birthHits(rec, O = DRUM_OPTS) { const own = rec && rec.inst && rec.inst.a; if (!isDrumRow(own)) return [];
  const r = rng(((rec.seed * 2654435761) ^ 0x6b17) >>> 0), n = 1 + Math.floor(r() * O.birthMax), out = [own], have = new Set([ROLE[own]]);
  const ids = Object.keys(ROLE); for (let i = 1; i < n; i++) { const c = ids.filter(id => !have.has(ROLE[id])); if (!c.length) break; const id = c[Math.floor(r() * c.length)]; out.push(id); have.add(ROLE[id]); }
  return out; }
export function roleAt(beat) { const p = ((beat % 4) + 4) % 4, q = Math.round(p * 4) / 4, w = Math.round(q) === q;   // quantised to 16ths
  if (w && q === 0) return 'low'; if (w && (q === 1 || q === 3)) return 'back'; if (q % 1 === .5) return 'time'; return w ? 'tom' : 'colour'; }
// TRADITION CYCLES (TRADITION_REFERENCE.md 1.8 / 1.9 / 1.13 / 1.16 / 1.17-18 / 1.23; MT 11:33): where the place has a tradition, hits are placed by
// that tradition's cycle as role WEIGHTS; the kick-1 / snare-2&4 / hats-off-beat bar above is only the default for the share with no tradition.
// Each cycle: beats (quarter-note beats per cycle), grid (steps per beat), at(step) -> { role: weight }. Blended places blend the weights.
const has = (a, x) => a.includes(x);
export const CYCLES = {
  // Afro-Cuban son clave 3-2, 2 bars = 32 sixteenths: clave strokes 0 6 12 | 20 24 (wood_clave = 'time'); tumbao: low on 6 and 12, no beat 1;
  // conga open tones 12 / 14 (tom); campana on quarters (colour); maracas 8ths (time, light)
  clave: { beats: 8, grid: 4, at: k => { const c = has([0, 6, 12, 20, 24], k), r = {}; if (c) r.time = 1; if (k % 16 === 6 || k % 16 === 12) r.low = .8; if (k % 16 === 12 || k % 16 === 14) r.tom = .7;
    if (k % 4 === 0 && !c) r.colour = .6; if (k % 2 === 0 && !c) r.time = Math.max(r.time || 0, .3); if (!Object.keys(r).length) r.tom = .2; return r; } },
  // West African 12/8 standard bell (gankogui), 24 steps per bar: bell 0 4 8 10 14 18 22 (bell = colour), low drum on the feet 0 6 12 18,
  // rattle (time) on feet + fills, support drums (tom) on the 2nd / 3rd eighth of each beat
  bell: { beats: 4, grid: 6, at: k => { const r = {}; if (has([0, 4, 8, 10, 14, 18, 22], k)) r.colour = 1; if (k % 6 === 0) { r.low = .9; r.time = .5; } if (k % 2 === 0 && k % 6 !== 0) r.tom = .55; if (k % 2) r.time = .3; return r; } },
  // Hindustani teentaal 16 beats: sam (beat 1) = the strongest, bass (low) + back; tali 5 / 13 (back); khali 9 with NO bass (colour);
  // the theka between (tabla = colour / tom), half beats light (time)
  teentaal: { beats: 16, grid: 2, at: k => { const b = k / 2; if (b === 0) return { low: 1.4, back: .5 }; if (b === 4 || b === 12) return { back: .9, low: .4 }; if (b === 8) return { colour: .6 };   // b is 0-based: b 8 = beat 9 (khali), grid 2 -> step 16
    if (b % 1) return { time: .35 }; return b > 8 && b < 12 ? { colour: .6 } : { tom: .5, colour: .45 }; } },
  // Carnatic adi tala 8 beats: sam 1 strongest, claps 5 and 7 (back)
  adi: { beats: 8, grid: 2, at: k => { const b = k / 2; if (b === 0) return { low: 1.4, back: .5 }; if (b === 4 || b === 6) return { back: .9 }; if (b % 1) return { time: .35 }; return { tom: .5, colour: .45 }; } },
  // Javanese gamelan gongan, 16 beats (4 gatra): the GONG at the cycle END (last beat = low, strongest), kenong every 4th beat (tom),
  // kempul / ketuk between (colour), the rest light (time)
  gongan: { beats: 16, grid: 2, at: k => { const b = k / 2; if (b === 15) return { low: 1.5, tom: .4 }; if (b % 4 === 3) return { tom: .9 }; if (b % 2 === 1) return { colour: .6 }; if (b % 1) return { time: .3 }; return { time: .45, colour: .3 }; } },
  // Balkan aksak 7/8 = 2+2+3 eighths (rachenitsa): tapan bass mallet on each group start (low; the long group's start heavier), thin stick on the others (time)
  aksak: { beats: 3.5, grid: 2, at: k => k === 0 ? { low: 1.2 } : k === 2 ? { low: .8 } : k === 4 ? { low: 1, back: .3 } : { time: .7 } },
};
// TRADITIONS wave 1 (PLAN_TRADITIONS.md 2.x, TRADITION_REFERENCE 1.1 / 1.8 / 1.10 / 1.13 / 1.14 / 1.21 / 1.27; values checked by Music Theory).
// mk(beats, grid, { role: [steps] or { step: weight } }, rest): steps listed per role get weight 1 (or the given weight); other steps get `rest`.
const mk = (beats, grid, map, rest = { time: .25 }) => { const n = Math.round(beats * grid), T = Array.from({ length: n }, () => ({}));
  for (const role in map) { const m = map[role]; if (Array.isArray(m)) for (const k of m) T[k % n][role] = 1; else for (const k in m) T[k % n][role] = m[k]; }
  for (const t of T) if (!Object.keys(t).length) Object.assign(t, rest); return { beats, grid, at: k => T[((k % n) + n) % n] }; };
const wt = (a, w) => Object.fromEntries(a.map(k => [k, w]));   // steps -> { step: w }
const odd = (n, g) => Array.from({ length: n }, (_, i) => i * g).filter((_, i) => i % 2 === 0);
Object.assign(CYCLES, {
  backbeat: mk(4, 4, { low: [0, 8], back: [4, 12], time: { 2: .5, 6: .5, 10: .5, 14: .5 } }, { colour: .2 }),          // western 4/4: kick 1 & 3, snare 2 & 4, hats on 8ths
  waltz: mk(3, 2, { low: [0], back: { 2: .7, 4: .7 } }, { time: .3 }),                                                   // western 3/4 oom-pah-pah
  hymn: mk(4, 1, { low: { 0: .8 } }, { time: .15 }),                                                                     // hymn: a downbeat, no kit feel
  rupak: mk(7, 2, { colour: { 0: 1 }, back: [6, 10] }, { tom: .35 }),                                                    // rupak 3+2+2: sam is khali (no bass), tali 4 and 6
  jhaptal: mk(10, 2, { low: { 0: 1.4 }, back: [4, 14], colour: { 10: .6 } }, { tom: .35 }),                            // jhaptal 2+3+2+3: sam 1, tali 3 / 8, khali 6 (grid 2: steps 0, 4 / 14, 10)
  maqsum: mk(4, 4, { low: [0, 8], back: [2, 6, 12] }, { time: .25 }),                                                    // iqa' maqsum: dum 0 8 / tak 2 6 12
  baladi: mk(4, 4, { low: [0, 2, 8], back: [6, 12] }, { time: .25 }),
  saidi: mk(4, 4, { low: [0, 6, 8], back: [2, 12] }, { time: .25 }),
  // colotomic (beats 1-based in the reference -> steps 0-based, grid 1): gong = low, kenong = tom, kempul = colour, kethuk = time
  lancaran: mk(16, 1, { time: wt(odd(16, 1), .5), tom: [3, 7, 11, 15], colour: [5, 9, 13], low: { 15: 1.5 } }, { time: .15 }),
  ketawang: mk(16, 1, { time: wt([1, 5, 9, 13], .5), tom: [7, 15], colour: [11], low: { 15: 1.5 } }, { time: .15 }),
  ladrang: mk(32, 1, { time: wt([1, 5, 9, 13, 17, 21, 25, 29], .5), tom: [7, 15, 23, 31], colour: [11, 19, 27], low: { 31: 1.5 } }, { time: .15 }),
  ma: mk(8, 1, { low: { 0: 1 }, colour: { 4: .5 } }, { time: .08 }),                                                    // Japanese court / shakuhachi: space (ma)
  matsuri: mk(2, 4, { low: [0, 4], tom: { 6: .8, 7: .8 } }, { time: .2 }),                                               // festival taiko: don don doko (2/4)
  jig: mk(2, 3, { low: [0], back: { 3: .8 } }, { time: .45 }),                                                           // 6/8, beat = dotted quarter, eighths = time
  reel: mk(2, 4, { low: [0], back: { 4: .8 } }, { time: .45 }),                                                          // reel counted in 2 (beat = half note), eighths
  slipjig: mk(3, 3, { low: [0], back: { 3: .6, 6: .6 } }, { time: .45 }),                                                // 9/8
  hornpipe: mk(2, 4, { low: [0], back: { 4: .8 } }, { time: .4 }),                                                       // counted in 2; the dotted 2:1 lilt = music.swing 1
  four: mk(4, 4, { low: [0, 4, 8, 12], time: wt([2, 6, 10, 14], .6), back: { 4: .8, 12: .8 } }, { colour: .25 }),               // techno / house four-on-the-floor
});
// palette tradition ids -> cycle (traditions.js points a tradition's id at the planet's chosen cycle; setTradCycle(id, null) restores)
export const TRAD_CYCLE = { cuban: 'clave', son: 'clave', rumba: 'clave', wafrica: 'bell', hindustani: 'teentaal', carnatic: 'adi', gamelan: 'gongan', java: 'gongan', bali: 'gongan', aksak: 'aksak' };
const TC0 = { ...TRAD_CYCLE };
export function setTradCycle(id, name) { if (name && CYCLES[name]) TRAD_CYCLE[id] = name; else if (TC0[id]) TRAD_CYCLE[id] = TC0[id]; else delete TRAD_CYCLE[id]; }
// THE RHYTHM-CYCLE ENGINE: where an absolute beat sits in a cycle. accent = the step's strongest role weight over the cycle's strongest
// (0..1, cached per cycle); land = the step is the cycle's arrival (the sam / the gong: its biggest 'low', else its first step).
const CINFO = new Map();
const cycleTable = name => { let c = CINFO.get(name); if (c) return c; const cy = CYCLES[name]; if (!cy) return null; const n = Math.round(cy.beats * cy.grid), acc = new Float32Array(n);
  let top = 0, land = 0, lw = -1; for (let k = 0; k < n; k++) { const r = cy.at(k); let m = 0; for (const x in r) m = Math.max(m, r[x]); acc[k] = m; top = Math.max(top, m); if ((r.low || 0) > lw) { lw = r.low || 0; land = k; } }
  for (let k = 0; k < n; k++) acc[k] /= top || 1; CINFO.set(name, c = { n, acc, land: lw > 0 ? land : 0, beats: cy.beats, grid: cy.grid }); return c; };
export function cycleInfo(name, beat, out = {}) { const c = cycleTable(name); if (!c) return null; const pos = ((beat % c.beats) + c.beats) % c.beats, step = Math.round(pos * c.grid) % c.n;
  out.name = name; out.step = step; out.steps = c.n; out.pos = pos / c.beats; out.beats = c.beats; out.accent = c.acc[step]; out.land = step === c.land; return out; }
// role weights at an absolute beat for a place's tradition shares ({ trad: share }); shares without a cycle (and 1 - sum) use the default bar
export function roleWeights(beat, trad = PLACE.trad) { const out = {}; let tot = 0; const add = (r, w) => { for (const k in r) out[k] = (out[k] || 0) + r[k] * w; };
  for (const t in trad || {}) { const sh = Math.max(0, +trad[t] || 0), cy = CYCLES[TRAD_CYCLE[t]]; if (!sh || !cy) continue; const pos = ((beat % cy.beats) + cy.beats) % cy.beats, k = Math.round(pos * cy.grid) % Math.round(cy.beats * cy.grid); tot += sh; add(cy.at(k), sh); }
  if (tot > 1) for (const k in out) out[k] /= tot; const rest = Math.max(0, 1 - tot); if (rest > 0) add({ [roleAt(beat)]: 1 }, rest); return out; }
// the hit for a note: the highest-weighted role the kit has (at least .35 of the top weight there), else null (= its own sound)
export function pickRole(wts, haveRole) { let top = 0; for (const k in wts) top = Math.max(top, wts[k]); let best = null, bw = 0; for (const k in wts) if (haveRole(k) && wts[k] >= .35 * top && wts[k] > bw) { bw = wts[k]; best = k; } return best; }
export function createDrums(world, music, brain, opts = {}) { const O = Object.assign(DRUM_OPTS, opts), D = { opts: O }, DER = new Map();
  const recOf = o => recipes.get(o.recipe);
  D.isDrummer = o => { const r = recOf(o); return !!(r && r.inst && isDrumRow(r.inst.a)); };
  // the kit: birth hits + learned hits (cached; rebuilt when its brain changes or it learns)
  D.kit = o => { const r = recOf(o); if (!r || !r.inst || !isDrumRow(r.inst.a)) return null; if (o.kitL && o.kitB === o.brain && o.kitR === r) return o.kitL;
    const k = birthHits(r, O); if (brain && o.brain) for (const e of brain.list(o, 'kit')) if (e.strength >= 1 && !k.includes(e.key) && k.length < O.cap) k.push(e.key);
    o.kitL = k; o.kitB = o.brain; o.kitR = r; return k; };
  D.fullness = o => { const k = D.kit(o); if (!k) return 0; const s = new Set(k.map(id => ROLE[id])); return s.size / ROLES.length; };   // 0..1, for auras / UI
  // learning: called once a bar for each pair that played together (blend.js); k = rate-free togetherness x closeness (0..1)
  D.learn = (o, s, k) => { if (!O.on || !brain || k <= 0) return; const mine = D.kit(o), theirs = D.kit(s); if (!mine || !theirs || mine.length >= O.cap) return;
    const r0 = recOf(o), pg = r0 && r0.seed != null ? percGene(r0.seed) : .5, pk = 1 + (O.percK || 0) * (pg - .5);   // percussion gene: a percussive ohm learns kit hits faster
    const have = new Set(mine.map(id => ROLE[id])); let grew = false;
    for (const id of theirs) { if (mine.includes(id)) continue; const e = brain.remember(o, 'kit', id, null, O.rate * pk * k * (have.has(ROLE[id]) ? O.haveK : O.missingK), 1); e.keep = 1; if (e.strength >= 1) grew = true; }
    if (grew) o.kitL = null; };
  // the recipe a note plays: its own (single-hit kit or a role it lacks / its own row) or the derived recipe of a kit hit
  D.recFor = (o, rec, ev) => { if (!O.on || !rec || !rec.inst || !isDrumRow(rec.inst.a) || ev.lite) return rec; const k = D.kit(o); if (!k || k.length < 2) return rec;
    const role = pickRole(roleWeights(ev.beat != null ? ev.beat : music.beat(ev.t), O.trad || PLACE.trad), r => k.some(h => ROLE[h] === r)); let id = null; if (role) for (const h of k) if (ROLE[h] === role) { id = h; break; }
    if (!id || id === rec.inst.a) return rec; const key = rec.id + '|' + id; let R = DER.get(key); if (!R) { R = withRow(rec, id); DER.set(key, R); if (DER.size > 256) DER.delete(DER.keys().next().value); } return R; };
  return D; }
