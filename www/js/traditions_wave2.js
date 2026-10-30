// TRADITIONS, wave 2 (21 more; docs/TRADITION_REFERENCE.md 1.2-1.7, 1.9, 1.11, 1.12, 1.15, 1.17-1.20, 1.22-1.26, 1.28, 1.29).
// Wilbow 4:59 PM Oct 23 2026 approved jazz, funk, dastgah, makam, samba, rumba, reggae/dub, overtone and Chinese (techno is in wave 1); he later
// asked to expand what was implemented, so the rest of the reference list comes too. Master switch: traditions.opts.wave2 (ON); OFF = wave 1 only,
// exactly as before (planets pick from the original eight). Same recipe shape as wave 1 (traditions.js TRADS), plus three optional fields:
//   sev: true            chords are 7th chords (r, r+2, r+4, r+6 in the scale's 7 slots) - jazz, funk, bossa
//   voicings: { slot: [slots] }  a chord shape for a root slot (absolute slots, any order; wraps above the root) - blues I7 / IV7 / V
//   song.charts: [{ sec: { A: [roots], B: [...] }, form?, end? }]  fixed progressions (scale-degree roots per bar); songs pick one by seed
//   pull: n              tonic pull for drone traditions (overtone: one fundamental, never a chord change in practice)
// Focus degrees are 7-slot indices (as wave 1). For 5-note scales, `fc` lists focus notes in CENTS and is turned into slots here.
// ENGINE LIMITS (flagged, see docs/TRADITIONS_WAVE2.md): chords are built from the 7 scale slots, so non-diatonic chords are approximated -
// blues V7 (no B natural in the blues scale: G Bb F shell), samba VI7 / iv (IV), flamenco III (the G natural is not in phrygian dominant:
// the cadence is iv - II - I), jazz bridge (diatonic stand-ins for ii/IV and V/V). Tumbao anticipation, skank on 2 / 4 and walking bass are
// part behaviours, not data: not built here.
const ET = c => c.map(x => x * 100), JI = [0, 112, 204, 316, 386, 498, 590, 702, 814, 884, 996, 1088], jiOf = s => s.map(x => JI[x]);
const DIA = [0, 200, 400, 500, 700, 900, 1100];
const slots = notes => { if (notes.length === 7) return notes.slice(); let last = 0; return DIA.map(t => { let best = notes[0], bd = 1e9; for (const c of notes) { if (c < last) continue; const d = Math.abs(c - t); if (d < bd) { bd = d; best = c; } } last = best; return best; }); };
// pentatonic focus in cents -> the first slot holding that note
const fc = (cents, focusCents) => { const s = slots(cents); return focusCents.map(c => s.indexOf(c)).filter(i => i >= 0); };
const SC = (name, cents, x = {}) => { const e = { ...x }; if (e.fc) { e.focus = fc(cents, e.fc); delete e.fc; } return [name, cents, e]; };
const MAJ = ET([0, 2, 4, 5, 7, 9, 11]), MIN = ET([0, 2, 3, 5, 7, 8, 10]), DOR = ET([0, 2, 3, 5, 7, 9, 10]), MIX = ET([0, 2, 4, 5, 7, 9, 10]), PHR = ET([0, 1, 3, 5, 7, 8, 10]);

export const WAVE2 = [
  // 1.2 classical: minuet, functional, V7, circle-of-fifths sequence in B
  { id: 'classical', name: 'Classical (minuet)', pal: 'western', aura: 'tracery', harm: 'move', glide: 0, dens: .9, voicings: { 4: [4, 6, 1, 3] },
    scales: [SC('major', MAJ, { focus: [0, 4, 2] }), SC('harmonic minor', ET([0, 2, 3, 5, 7, 8, 11]), { focus: [0, 4, 2] })],
    tempos: [['minuet', 115, { cycle: 'waltz' }]], swing: 0, tight: .85, div: 2,
    song: { form: ['A', 'A', 'B', 'B'], len: 8, bStart: 4, cad: [4, 0], cells: [[1, 1, 2], [2, 1, 1], [.5, .5, 1, 2]], hookBars: 1, moves: 'functional',
      charts: [{ sec: { A: [0, 3, 4, 0, 5, 1, 4, 4], B: [4, 0, 3, 6, 2, 5, 4, 0] } }] } },
  // 1.3 modal: Dorian / Mixolydian / Phrygian, i-bVII-IV, AABB, no raised leading tone
  { id: 'modal', name: 'Modal folk', pal: 'celtic', aura: 'knot', harm: 'move', glide: 0, dens: 1,
    scales: [SC('dorian', DOR, { focus: [0, 4, 5] }), SC('mixolydian', MIX, { focus: [0, 4, 6] }), SC('phrygian', PHR, { focus: [0, 4, 1] })],
    tempos: [['reel', 100, { cycle: 'reel', swing: .2 }], ['march', 96, { cycle: 'backbeat' }], ['jig', 104, { cycle: 'jig', div: 6 }]], swing: 0, tight: .7, div: 4,
    song: { form: ['A', 'A', 'B', 'B'], len: 8, bStart: 6, cad: [6, 0], cells: [[.5, .5, .5, .5, 1, 1], [1, 1, 2], [.5, .5, 1, 2]], hookBars: 1, moves: 'functional',
      charts: [{ sec: { A: [0, 0, 6, 6, 0, 3, 6, 0], B: [6, 6, 0, 0, 6, 3, 0, 0] } }] } },
  // 1.4 rock / pop: 4-bar loops, backbeat, verse / chorus / bridge
  { id: 'rockpop', name: 'Rock / pop', pal: 'rockpop', aura: 'tracery', harm: 'move', glide: 0, dens: 1,
    scales: [SC('major', MAJ, { focus: [0, 4, 2] }), SC('minor', MIN, { focus: [0, 4, 2] })],
    tempos: [['rock', 112, { cycle: 'rock' }], ['ballad', 84, { cycle: 'backbeat' }]], swing: 0, tight: .85, div: 4,
    song: { form: ['A', 'B', 'A', 'B', 'C', 'B'], len: 4, bStart: 3, cad: [0], cells: [[1, .5, .5, 2], [.5, .5, .5, .5, 2], [1, 1, 1, 1]], hookBars: 2, moves: 'loop',
      charts: [{ sec: { A: [5, 3, 0, 4], B: [0, 4, 5, 3], C: [3, 4, 5, 4] } }, { sec: { A: [0, 3, 4, 3], B: [0, 6, 3, 0], C: [5, 3, 4, 4] } }] } },
  // 1.5 jazz: 7th chords, ii-V-I, AABA, swing
  { id: 'jazz', name: 'Jazz (swing)', pal: 'jazz', aura: 'tracery', harm: 'move', glide: .1, dens: 1.1, sev: true,
    scales: [SC('major', MAJ, { focus: [0, 4, 2, 6] }), SC('dorian', DOR, { focus: [0, 4, 2, 6] })],
    tempos: [['medium swing', 132, { cycle: 'shuffle' }], ['ballad', 76, { cycle: 'shuffle' }], ['up', 200, { cycle: 'shuffle' }]], swing: 1, tight: .8, div: 4,
    song: { form: ['A', 'A', 'B', 'A'], len: 8, bStart: 3, cad: [1, 4, 0], cells: [[.5, .5, .5, .5, .5, .5, 1], [1.5, .5, 2], [.5, 1, .5, 2]], hookBars: 2, moves: 'functional',
      charts: [{ sec: { A: [0, 5, 1, 4, 0, 5, 1, 4], B: [3, 3, 2, 5, 1, 1, 1, 4] } }, { sec: { A: [0, 0, 1, 4, 2, 5, 1, 4], B: [3, 3, 0, 0, 1, 1, 4, 4] } }] } },
  // 1.6 blues: 12 bars, dominant 7ths on 1 / 4 (V is a shell, flagged), shuffle, AAB lines
  { id: 'blues', name: 'Blues (12-bar)', pal: 'blues', aura: 'tracery', harm: 'move', glide: .35, dens: .9,
    voicings: { 0: [0, 2, 4, 6], 3: [3, 5, 0, 1], 4: [4, 6, 3] },
    scales: [SC('blues (b3 + 3)', [0, 300, 400, 500, 700, 900, 1000], { focus: [0, 4, 2], w: [1, .8, 1, 1, 1, .7, 1] })],
    tempos: [['shuffle', 84, { cycle: 'shuffle' }], ['slow blues', 64, { cycle: 'shuffle' }]], swing: 1, tight: .75, div: 4,
    song: { form: ['A', 'A', 'A'], len: 12, bStart: 3, cad: [0], cells: [[1, .5, .5, 2], [1.5, .5, 1, 1], [.5, .5, 1, 2]], hookBars: 2, moves: 'functional',
      charts: [{ sec: { A: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4] } }, { sec: { A: [0, 3, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4] } }] } },
  // 1.7 funk: the One, 16th interlock, i7 vamp + IV7 bridge
  { id: 'funk', name: 'Funk', pal: 'funk', aura: 'grid', harm: 'move', glide: 0, dens: 1.2, sev: true,
    scales: [SC('dorian', DOR, { focus: [0, 6, 4] }), SC('mixolydian', MIX, { focus: [0, 6, 4] })],
    tempos: [['funk', 104, { cycle: 'funk16' }]], swing: 0, tight: .95, div: 4,
    song: { form: ['A', 'A', 'B', 'A'], len: 4, bStart: 3, cad: [0], cells: [[.25, .5, .25, .5, .5, 1, 1], [.75, .25, .5, .5, 2], [.5, .25, .25, 1, 2]], hookBars: 1, moves: 'loop',
      charts: [{ sec: { A: [0, 0, 0, 0], B: [3, 3, 3, 3] } }] } },
  // 1.9 carnatic: drone Sa-Pa, adi / rupaka, pallavi returns (just intonation, gamaka = glide)
  { id: 'carnatic', name: 'Carnatic raga', pal: 'carnatic', aura: 'lotus', harm: 'drone', drone: [0, 4], glide: .65, dens: .9,
    scales: [SC('Mayamalavagowla', jiOf([0, 1, 4, 5, 7, 8, 11]), { focus: [0, 4, 3] }), SC('Shankarabharanam', jiOf([0, 2, 4, 5, 7, 9, 11]), { focus: [0, 4, 2] }),
      SC('Kalyani', jiOf([0, 2, 4, 6, 7, 9, 11]), { focus: [0, 4, 2] }), SC('Kharaharapriya', jiOf([0, 2, 3, 5, 7, 9, 10]), { focus: [0, 4, 2] }),
      SC('Mohanam', jiOf([0, 2, 4, 7, 9]), { fc: [0, 386, 702] }), SC('Hindolam', jiOf([0, 3, 5, 8, 10]), { fc: [0, 498, 316] })],
    tempos: [['adi', 76, { cycle: 'adi' }], ['rupaka', 84, { cycle: 'rupaka6', len: 6 }]], swing: 0, tight: .6, div: 4,
    song: { form: ['A', 'B', 'A', 'C', 'A'], len: 4, bStart: 0, cad: [0], cells: [[1, 1, 2], [.5, .5, 1, 2], [2, 1, 1]], hookBars: 2, moves: 'drone' } },
  // 1.11 Turkish makam: AEU comma cents, usul aksak semai 10/8 / aksak 9/8, teslim returns, no chords
  { id: 'makam', name: 'Turkish makam', pal: 'makam', aura: 'lattice', harm: 'drone', drone: [0, 4], glide: .45, dens: .9,
    scales: [SC('Rast', [0, 204, 385, 498, 702, 906, 1087], { focus: [0, 4, 6] }), SC('Uşşak', [0, 181, 294, 498, 702, 792, 996], { focus: [0, 3, 1], drone: [0, 3] }),
      SC('Hicaz', [0, 113, 385, 498, 702, 906, 996], { focus: [0, 3, 1], drone: [0, 3] })],
    tempos: [['aksak semai', 85, { cycle: 'semai10' }], ['aksak', 92, { cycle: 'aksak9' }]], swing: 0, tight: .7, div: 2,
    song: { form: ['A', 'B', 'A', 'C', 'A'], len: 4, bStart: 4, cad: [0], cells: [[1, .5, .5, 1, 1], [.5, .5, 1, .5, .5, 1], [1.5, .5, 2]], hookBars: 2, moves: 'drone' } },
  // 1.12 Persian dastgah: koron cents, daramad -> gushe -> owj -> forud, 6/8 reng, no chords
  { id: 'dastgah', name: 'Persian dastgah', pal: 'dastgah', aura: 'lattice', harm: 'drone', drone: [0, 4], glide: .55, dens: .8,
    scales: [SC('Shur', [0, 150, 300, 500, 700, 800, 1000], { focus: [0, 3, 1], drone: [0, 3] }), SC('Segah', [0, 150, 350, 500, 650, 850, 1000], { focus: [0, 2, 3] }),
      SC('Chahargah', [0, 150, 400, 500, 700, 850, 1100], { focus: [0, 4, 2] }), SC('Mahur', ET([0, 2, 4, 5, 7, 9, 11]), { focus: [0, 4, 2] }),
      SC('Homayun', [0, 150, 400, 500, 700, 800, 1000], { focus: [0, 3, 1], drone: [0, 3] })],
    tempos: [['reng', 120, { cycle: 'sixeight', div: 3 }], ['avaz', 66, { cycle: 'ma', tight: .3 }]], swing: 0, tight: .55, div: 4,
    song: { form: ['A', 'B', 'C', 'A'], len: 4, bStart: 2, cad: [1, 0], cells: [[1, .5, .5, 2], [2, 1, 1], [.5, .5, .5, .5, 2]], hookBars: 2, moves: 'drone' } },
  // 1.15 Chinese: anhemitonic pentatonic modes, qi-cheng-zhuan-he, banyan 2/4, heterophony (no chords)
  { id: 'china', name: 'Chinese traditional', pal: 'china', aura: 'waves', harm: 'drone', drone: [0, 4], glide: .35, dens: .9,
    scales: [SC('gong', ET([0, 2, 4, 7, 9]), { fc: [0, 700, 400] }), SC('shang', ET([0, 2, 5, 7, 10]), { fc: [0, 700, 200] }), SC('jue', ET([0, 3, 5, 8, 10]), { fc: [0, 500, 800] }),
      SC('zhi', ET([0, 2, 5, 7, 9]), { fc: [0, 700, 200] }), SC('yu', ET([0, 3, 5, 7, 10]), { fc: [0, 700, 500] })],
    tempos: [['banyan', 76, { cycle: 'banyan' }], ['festive', 100, { cycle: 'banyan', tight: .8 }]], swing: 0, tight: .65, div: 4,
    song: { form: ['A', 'A', 'B', 'A'], len: 2, bStart: 0, cad: [0], cells: [[1, 1, 2], [.5, .5, 1, 2], [1.5, .5, 1, 1]], hookBars: 2, moves: 'drone' } },
  // 1.17 Cuban son: clave 3-2, canto I-V7, montuno vamp, coro
  { id: 'cuban', name: 'Cuban son', pal: 'cuban', aura: 'weave', harm: 'move', glide: 0, dens: 1.1, voicings: { 4: [4, 6, 1, 3] },
    scales: [SC('major', MAJ, { focus: [0, 4, 2] })],
    tempos: [['son', 104, { cycle: 'clave' }]], swing: 0, tight: .9, div: 4,
    song: { form: ['A', 'A', 'B', 'B', 'B', 'B'], len: 8, bStart: 4, cad: [4, 0], cells: [[.5, 1, 1, .5, 1], [1, .5, .5, 2], [.5, .5, 1, 1, 1]], hookBars: 2, moves: 'functional',
      charts: [{ sec: { A: [0, 0, 4, 4, 4, 4, 0, 0], B: [0, 3, 4, 3] } }] } },
  // 1.18 rumba: rumba clave 3-2 (third stroke late), canto, montuno coro; columbia in 12/8
  { id: 'rumba', name: 'Cuban rumba', pal: 'rumba', aura: 'weave', harm: 'move', glide: .1, dens: 1, voicings: { 4: [4, 6, 1, 3] },
    scales: [SC('major', MAJ, { focus: [0, 4, 2] })],
    tempos: [['guaguancó', 104, { cycle: 'rumbaclave' }], ['yambú', 78, { cycle: 'rumbaclave' }], ['columbia', 120, { cycle: 'bell', div: 6 }]], swing: 0, tight: .85, div: 4,
    song: { form: ['A', 'A', 'B', 'B', 'B'], len: 8, bStart: 4, cad: [4, 0], cells: [[1, .5, .5, 2], [.5, 1, .5, 2], [1.5, .5, 1, 1]], hookBars: 2, moves: 'functional',
      charts: [{ sec: { A: [0, 0, 4, 4, 4, 4, 0, 0], B: [0, 4, 0, 4] } }] } },
  // 1.19 samba: surdo on 2 of each 2/4, 4th-16th accent, refrão / verso (VI7 and iv are stand-ins, flagged)
  { id: 'samba', name: 'Brazilian samba', pal: 'samba', aura: 'weave', harm: 'move', glide: 0, dens: 1.2, voicings: { 4: [4, 6, 1, 3] },
    scales: [SC('major', MAJ, { focus: [0, 4, 2] })],
    tempos: [['samba', 100, { cycle: 'samba' }], ['samba-enredo', 132, { cycle: 'samba' }]], swing: .15, tight: .9, div: 4,
    song: { form: ['A', 'B', 'A', 'B', 'A'], len: 8, bStart: 0, cad: [4, 0], cells: [[.75, .25, .5, .5, 2], [.25, .5, .25, 1, 2], [.5, .5, 1, 2]], hookBars: 2, moves: 'functional',
      charts: [{ sec: { A: [0, 5, 1, 4, 0, 5, 1, 4], B: [0, 0, 3, 3, 0, 5, 1, 4] } }] } },
  // 1.20 bossa nova: 7th chords, bass root / 5th on 1 and 3, bossa comp, quiet
  { id: 'bossa', name: 'Bossa nova', pal: 'bossa', aura: 'weave', harm: 'move', glide: .1, dens: .8, sev: true,
    scales: [SC('major', MAJ, { focus: [0, 4, 2, 6] })],
    tempos: [['bossa', 128, { cycle: 'bossa' }]], swing: 0, tight: .8, div: 4,
    song: { form: ['A', 'A', 'B', 'A'], len: 8, bStart: 3, cad: [1, 4, 0], cells: [[2, 1, 1], [1.5, .5, 2], [1, 1, 2]], hookBars: 2, moves: 'functional',
      charts: [{ sec: { A: [0, 5, 1, 4, 2, 5, 1, 4], B: [3, 3, 2, 5, 1, 4, 1, 4] } }] } },
  // 1.22 flamenco: phrygian with a major I, soleá 12-count compás (resolves on count 10), iv - II - I remate (III flagged)
  { id: 'flamenco', name: 'Flamenco', pal: 'flamenco', aura: 'lattice', harm: 'move', glide: .3, dens: 1,
    scales: [SC('phrygian dominant', ET([0, 1, 4, 5, 7, 8, 10]), { focus: [0, 4, 1] })],
    tempos: [['soleá', 150, { cycle: 'solea' }], ['tangos', 112, { cycle: 'backbeat' }]], swing: 0, tight: .9, div: 4,
    song: { form: ['A', 'B', 'A', 'B'], len: 6, bStart: 3, cad: [1, 0], cells: [[.5, .5, .5, .5, 2], [1, .5, .5, 2], [.25, .25, .5, 1, 2]], hookBars: 1, moves: 'functional',
      charts: [{ sec: { A: [3, 1, 0, 3, 1, 0], B: [3, 3, 0, 3, 1, 0] } }] } },
  // 1.23 Balkan aksak: 7/8 2+2+3 and 3+2+2, 9/8, 11/8, tonic drone, A A B B
  { id: 'aksak', name: 'Balkan aksak', pal: 'aksak', aura: 'knot', harm: 'drone', drone: [0, 4], glide: .15, dens: 1.2,
    scales: [SC('hijaz', ET([0, 1, 4, 5, 7, 8, 10]), { focus: [0, 4, 3] }), SC('ukrainian dorian', ET([0, 2, 3, 6, 7, 9, 10]), { focus: [0, 4, 3] }), SC('minor', MIN, { focus: [0, 4, 3] })],
    tempos: [['rachenitsa', 120, { cycle: 'aksak' }], ['lesnoto', 100, { cycle: 'lesnoto' }], ['daychovo', 116, { cycle: 'daychovo' }], ['kopanitsa', 124, { cycle: 'kopanitsa' }]], swing: 0, tight: .85, div: 2,
    song: { form: ['A', 'A', 'B', 'B'], len: 4, bStart: 3, cad: [0], cells: [[.5, .5, .5, .5, 1, 1], [.5, .5, 1, 2], [1, .5, .5, 2]], hookBars: 1, moves: 'drone' } },
  // 1.24 Andean huayno: minor pentatonic feel (aeolian, 2nd and 6th weak), i - III - VII, long-short-short
  { id: 'andean', name: 'Andean huayno', pal: 'andean', aura: 'knot', harm: 'move', glide: .1, dens: 1.1,
    scales: [SC('minor pentatonic', MIN, { focus: [0, 2, 4], w: [1, .2, 1, 1, 1, .2, 1] })],
    tempos: [['huayno', 104, { cycle: 'huayno' }]], swing: 0, tight: .85, div: 4,
    song: { form: ['A', 'A', 'B', 'B'], len: 4, bStart: 2, cad: [2, 0], cells: [[.5, .25, .25, .5, .25, .25, .5, .25, .25, 1], [1, .5, .5, 2], [.5, .25, .25, 1, 2]], hookBars: 2, moves: 'functional',
      charts: [{ sec: { A: [0, 0, 2, 0], B: [2, 6, 2, 0] } }] } },
  // 1.25 overtone singing: harmonics 8-14 of one fundamental, the drone never moves, gallop
  { id: 'overtone', name: 'Overtone singing', pal: 'overtone', aura: 'rings', harm: 'drone', drone: [0, 4], glide: .5, dens: .7, pull: 50,
    scales: [SC('harmonics 8-14', [0, 204, 386, 551, 702, 841, 969], { focus: [0, 2, 4] })],
    tempos: [['gallop', 96, { cycle: 'sixeight', div: 3 }], ['free', 70, { cycle: 'ma', tight: .3 }]], swing: 0, tight: .6, div: 4,
    song: { form: ['A', 'B', 'A', 'B'], len: 4, bStart: 0, cad: [0], cells: [[2, 1, 1], [1, 1, 2], [3, 1]], hookBars: 2, moves: 'drone' } },
  // 1.26 reggae / dub: one drop (beat 3), i - iv loop, bVI - bVII chorus
  { id: 'reggae', name: 'Reggae / dub', pal: 'reggae', aura: 'grid', harm: 'move', glide: 0, dens: .9,
    scales: [SC('minor', MIN, { focus: [0, 4, 2] }), SC('major', MAJ, { focus: [0, 4, 2] })],
    tempos: [['one drop', 74, { cycle: 'onedrop' }], ['steppers', 76, { cycle: 'four' }]], swing: .2, tight: .85, div: 4,
    song: { form: ['A', 'A', 'B', 'A', 'B'], len: 4, bStart: 5, cad: [0], cells: [[1, 1, 2], [.5, .5, 1, 2], [2, 2]], hookBars: 2, moves: 'loop',
      charts: [{ sec: { A: [0, 3, 0, 3], B: [5, 6, 0, 0] } }] } },
  // 1.28 drum and bass: two-step kick / snare, half-time sub, i - i - bVI - bVII
  { id: 'dnb', name: 'Drum and bass', pal: 'dnb', aura: 'grid', harm: 'move', glide: 0, dens: 1.1,
    scales: [SC('minor', MIN, { focus: [0, 4, 2] }), SC('dorian', DOR, { focus: [0, 4, 2] })],
    tempos: [['dnb', 172, { cycle: 'dnb' }]], swing: 0, tight: 1, div: 4,
    song: { form: ['A', 'A', 'B', 'A'], len: 8, bStart: 5, cad: [0], cells: [[2, 2], [1, 1, 2], [.5, .5, 1, 2]], hookBars: 2, moves: 'loop',
      charts: [{ sec: { A: [0, 0, 0, 0, 5, 5, 6, 6], B: [5, 5, 6, 6, 5, 5, 6, 6] } }] } },
  // 1.29 minimal process music: steady 8ths, one cell repeated exactly, tonic -> vi area
  { id: 'minimal', name: 'Minimal (process)', pal: 'minimal', aura: 'grid', harm: 'move', glide: 0, dens: 1.2,
    scales: [SC('major', MAJ, { focus: [0, 4, 2] }), SC('dorian', DOR, { focus: [0, 4, 2] })],
    tempos: [['pulse', 140, { cycle: 'pulse8' }]], swing: 0, tight: 1, div: 2,
    song: { form: ['A', 'A', 'B', 'A'], len: 8, bStart: 5, cad: [0], cells: [[.5, .5, .5, .5, .5, .5, .5, .5], [.5, .5, 1, .5, .5, 1], [.5, .5, .5, .5, 2]], hookBars: 1, moves: 'loop',
      charts: [{ sec: { A: [0, 0, 0, 0, 0, 0, 0, 0], B: [5, 5, 5, 5, 5, 5, 5, 5] } }] } },
];
export const WAVE2_IDS = WAVE2.map(t => t.id);
// the land's scales.js groups (european, hindustani, maqam, east asian, gamelan, african, blues and jazz, eastern european) -> wave 2 leans
export const GROUP_MAP2 = [{ classical: .3, modal: .3, rockpop: .2 }, { carnatic: .6 }, { makam: .5, dastgah: .5, flamenco: .2 }, { china: 1 }, {},
  { cuban: .3, rumba: .2, samba: .3, andean: .1 }, { blues: 1, jazz: 1, funk: .6, bossa: .4, reggae: .3 }, { aksak: 1, flamenco: .3 }];
