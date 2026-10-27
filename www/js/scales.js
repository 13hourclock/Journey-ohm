// SCALES (world track): real scales from many musical cultures, as interval sets in 12 notes, grouped by the tradition they come from.
// Planets and regions blend traditions: a planet's mix usually has one leading tradition ("each planet as one tradition for now",
// 8:55 PM Oct 24) and its regions blend toward neighbouring ones ("regions of blending traditions between", 8:56 PM Oct 24);
// "Include theory behind many cultures" (12:18 AM Oct 23). terrain.js holds the mixes.
// Everything is a continuous weight (a region leans, never switches). Names are for reading only; the music uses the 12 weights.
// Quarter-tone maqamat and gamelan tunings are given as their usual 12-note approximations (the engine is 12-note today).
export const TRADITIONS = [
  ['european', [['locrian', [0, 1, 3, 5, 6, 8, 10]], ['phrygian', [0, 1, 3, 5, 7, 8, 10]], ['aeolian', [0, 2, 3, 5, 7, 8, 10]], ['harmonic minor', [0, 2, 3, 5, 7, 8, 11]], ['melodic minor', [0, 2, 3, 5, 7, 9, 11]],
    ['dorian', [0, 2, 3, 5, 7, 9, 10]], ['mixolydian', [0, 2, 4, 5, 7, 9, 10]], ['ionian', [0, 2, 4, 5, 7, 9, 11]], ['lydian', [0, 2, 4, 6, 7, 9, 11]]]],
  ['hindustani', [['todi', [0, 1, 3, 6, 7, 8, 11]], ['bhairavi', [0, 1, 3, 5, 7, 8, 10]], ['bhairav', [0, 1, 4, 5, 7, 8, 11]], ['purvi', [0, 1, 4, 6, 7, 8, 11]], ['marwa', [0, 1, 4, 6, 7, 9, 11]],
    ['asavari', [0, 2, 3, 5, 7, 8, 10]], ['kafi', [0, 2, 3, 5, 7, 9, 10]], ['khamaj', [0, 2, 4, 5, 7, 9, 10]], ['bilawal', [0, 2, 4, 5, 7, 9, 11]], ['yaman', [0, 2, 4, 6, 7, 9, 11]]]],
  ['maqam', [['kurd', [0, 1, 3, 5, 7, 8, 10]], ['hijaz', [0, 1, 4, 5, 7, 8, 10]], ['hijazkar', [0, 1, 4, 5, 7, 8, 11]], ['nahawand', [0, 2, 3, 5, 7, 8, 11]], ['nikriz', [0, 2, 3, 6, 7, 9, 10]],
    ['bayati (12-note)', [0, 1, 3, 5, 7, 8, 10]], ['saba (12-note)', [0, 1, 3, 4, 6, 8, 10]], ['rast (12-note)', [0, 2, 4, 5, 7, 9, 10]], ['ajam', [0, 2, 4, 5, 7, 9, 11]]]],
  ['east asian', [['in', [0, 1, 5, 7, 8]], ['iwato', [0, 1, 5, 6, 10]], ['hirajoshi', [0, 2, 3, 7, 8]], ['kumoi', [0, 2, 3, 7, 9]], ['yu', [0, 3, 5, 7, 10]], ['shang', [0, 2, 5, 7, 10]],
    ['jue', [0, 3, 5, 8, 10]], ['zhi', [0, 2, 5, 7, 9]], ['gong', [0, 2, 4, 7, 9]], ['ryukyu', [0, 4, 5, 7, 11]]]],
  ['gamelan', [['pelog nem (12-note)', [0, 1, 3, 7, 8]], ['pelog barang (12-note)', [0, 2, 3, 7, 9]], ['pelog lima (12-note)', [0, 1, 5, 7, 8]], ['slendro (12-note)', [0, 2, 5, 7, 9]], ['slendro manyura (12-note)', [0, 3, 5, 7, 10]]]],
  ['african', [['minor pentatonic', [0, 3, 5, 7, 10]], ['mbira nyamaropa (12-note)', [0, 2, 3, 5, 7, 9, 10]], ['kora sila ba (12-note)', [0, 2, 4, 5, 7, 9, 10]], ['major pentatonic', [0, 2, 4, 7, 9]], ['ethiopian tizita', [0, 2, 4, 7, 9]], ['ethiopian anchihoye', [0, 1, 5, 6, 9]]]],
  ['blues and jazz', [['altered', [0, 1, 3, 4, 6, 8, 10]], ['blues', [0, 3, 5, 6, 7, 10]], ['dorian bebop', [0, 2, 3, 4, 5, 7, 9, 10]], ['mixolydian bebop', [0, 2, 4, 5, 7, 9, 10, 11]], ['major blues', [0, 2, 3, 4, 7, 9]], ['lydian dominant', [0, 2, 4, 6, 7, 9, 10]],
    ['whole tone', [0, 2, 4, 6, 8, 10]], ['lydian augmented', [0, 2, 4, 6, 8, 9, 11]]]],
  ['eastern european', [['ukrainian dorian', [0, 2, 3, 6, 7, 9, 10]], ['phrygian dominant', [0, 1, 4, 5, 7, 8, 10]], ['double harmonic', [0, 1, 4, 5, 7, 8, 11]], ['hungarian minor', [0, 2, 3, 6, 7, 8, 11]], ['romanian major', [0, 1, 4, 6, 7, 9, 10]], ['hungarian major', [0, 3, 4, 6, 7, 9, 10]]]],
];
// brightness of a scale 0 (dark) .. 1 (bright): the mean position of its notes on the line of fifths around the root
// (b2 -5 .. #4 +6), the measure that orders the diatonic modes Locrian .. Lydian, applied the same way to every tradition
const brOf = iv => { let s = 0; for (const x of iv) s += ((x * 7 + 5) % 12) - 5; return s / iv.length; };
let lo = 1e9, hi = -1e9; for (const [, sc] of TRADITIONS) for (const [, iv] of sc) { const b = brOf(iv); lo = Math.min(lo, b); hi = Math.max(hi, b); }
export const SCALES = []; TRADITIONS.forEach(([tn, sc], ti) => { const list = sc.map(([name, iv]) => ({ name, iv, tr: ti, b: (brOf(iv) - lo) / (hi - lo) })); list.sort((a, b) => a.b - b.b); TRADITIONS[ti].list = list; SCALES.push(...list); });
export const traditionName = i => TRADITIONS[((i % TRADITIONS.length) + TRADITIONS.length) % TRADITIONS.length][0];
// add one leaning (weight q, tradition ti, brightness 0..1) into 12 pitch-class weights above the note `root`
export function voteScale(out12, q, ti, bright, root, width = .16) { const L = TRADITIONS[ti].list; let s = 0; const w = [];
  for (const S of L) { const g = Math.exp(-(((S.b - bright) / width) ** 2)); w.push(g); s += g; }
  for (let k = 0; k < L.length; k++) { const g = q * w[k] / (s || 1); if (g < .004) continue; const iv = L[k].iv;
    for (let j = 0; j < iv.length; j++) out12[(root + iv[j]) % 12] += g * (j === 0 ? 2.5 : iv[j] === 7 ? 1.5 : 1); } }
export const nearestScale = (ti, bright) => { let best = null, bd = 9; for (const S of TRADITIONS[ti].list) { const d = Math.abs(S.b - bright); if (d < bd) { bd = d; best = S; } } return best; };
