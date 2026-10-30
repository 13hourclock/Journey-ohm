// TRADITIONS wave 2 (traditions_wave2.js) + GUEST ACCENT (guest.js). node tests/wave2_test.mjs
import { createMusic, createHarmony, TUNINGS } from '../www/js/music.js';
import { createEvents } from '../www/js/events.js';
import { CYCLES, cycleInfo } from '../www/js/drums.js';
import { TRADS, TRAD_IDS, TRAD_OPTS, planetTradition, createTraditions, byTradId } from '../www/js/traditions.js';
import { WAVE2_IDS } from '../www/js/traditions_wave2.js';
import { songFromTradition, barsOf } from '../www/js/songs.js';
import { createGuests } from '../www/js/guest.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// 1 the list
ok(WAVE2_IDS.length === 21 && TRAD_IDS.length === 29 && new Set(TRAD_IDS).size === 29, '21 more traditions, 29 in all, ids unique');
for (const id of ['jazz', 'funk', 'dastgah', 'makam', 'samba', 'rumba', 'reggae', 'overtone', 'china', 'blues', 'carnatic', 'cuban', 'bossa', 'flamenco', 'aksak', 'andean', 'dnb', 'minimal', 'classical', 'modal', 'rockpop'])
  if (!byTradId(id)) ok(false, 'missing ' + id);
// 2 every new recipe is well formed: 7-slot tunings, cycles exist, cells fill a bar, chart roots in 0..6, focus slots in 0..6
for (const id of WAVE2_IDS) { const D = byTradId(id), bad = [];
  for (const [nm, c, x] of D.scales) { const t = TUNINGS['trad.' + id + '.' + nm]; if (!t || t.ratios.length !== 7) bad.push('tuning ' + nm); if (x && x.focus && x.focus.some(f => f < 0 || f > 6)) bad.push('focus ' + nm); if (x && x.focus && !x.focus.length) bad.push('empty focus ' + nm); }
  for (const tp of D.tempos) if (tp[2] && tp[2].cycle && !CYCLES[tp[2].cycle]) bad.push('cycle ' + tp[2].cycle);
  for (const c of D.song.cells) if (Math.abs(c.reduce((a, b) => a + b, 0) - 4) > 1e-9) bad.push('cell');
  for (const ch of D.song.charts || []) for (const k in ch.sec) if (ch.sec[k].some(r => r < 0 || r > 6 || r !== Math.floor(r))) bad.push('chart ' + k);
  ok(!bad.length, D.name + ' well formed ' + bad.join()); }
// 3 picking: wave 2 on = all 29 show up about equally; off = only the first eight
const cnt = {}; for (let s = 1; s <= 29000; s++) { const T = planetTradition(s * 7919 + 3, null); cnt[T.id] = (cnt[T.id] || 0) + 1; }
ok(Object.keys(cnt).length === 29 && Object.values(cnt).every(n => n > 800 && n < 1200), 'wave 2 on: each ~1/29');
const c8 = {}; for (let s = 1; s <= 4000; s++) { const T = planetTradition(s * 7919 + 3, null, { ...TRAD_OPTS, wave2: false }); c8[T.id] = 1; }
ok(Object.keys(c8).sort().join() === TRAD_IDS.slice(0, 8).sort().join(), 'wave 2 off: only the first eight');
const land = new Float32Array(8); land[6] = 1; const cj = {}; for (let s = 1; s <= 6000; s++) { const T = planetTradition(s * 7919 + 3, land); cj[T.id] = (cj[T.id] || 0) + 1; }
ok(cj.blues > 6000 / 29 * 1.8 && cj.jazz > 6000 / 29 * 1.8, 'blues-and-jazz land leans to blues (' + cj.blues + ') and jazz (' + cj.jazz + ')');
// 4 chord shapes
const T = id => planetTradition(5, null, TRAD_OPTS, id);
ok(T('western').voice === null && T('hindustani').voice === null, 'wave 1 keeps the plain triad (no voice)');
ok(JSON.stringify(T('jazz').voice(1)) === '[1,3,5,7]' && JSON.stringify(T('jazz').voice(8)) === '[8,10,12,14]', 'jazz: 7th chords (ii7 = 1 3 5 7)');
const bl = T('blues'), bc = TUNINGS[bl.tuning].notes;
const pcs = r => bl.voice(r).map(d => bc[((d % 7) + 7) % 7]);
ok(JSON.stringify(pcs(0)) === '[0,400,700,1000]' && JSON.stringify(pcs(3)) === '[500,900,0,300]', 'blues I7 = C E G Bb, IV7 = F A C Eb (dominant 7ths)');
const M = createMusic(() => 0); M.trad = bl; ok(JSON.stringify(M.tonesOf(3)) === '[3,5,7,8]', 'music.tonesOf follows the tradition'); M.trad = T('western'); ok(JSON.stringify(M.tonesOf(3)) === '[3,5,7]', 'music.tonesOf: plain triad otherwise');
// 5 charts: songs play the tradition's chart
const sb = songFromTradition(bl.songShape, 11); ok(sb.sec.A.length === 12 && [sb.sec.A.join(), '0,3,0,0,3,3,0,0,4,3,0,4'].includes('0,0,0,0,3,3,0,0,4,3,0,4') && (sb.sec.A.join() === '0,0,0,0,3,3,0,0,4,3,0,4' || sb.sec.A.join() === '0,3,0,0,3,3,0,0,4,3,0,4'), 'blues song = a 12-bar chart: ' + sb.sec.A.join(' '));
ok(sb.form.join() === 'A,A,A' && barsOf(sb).length === 37, 'blues: three choruses + ending (' + barsOf(sb).length + ' bars)');
const sj = songFromTradition(T('jazz').songShape, 3); ok(sj.form.join() === 'A,A,B,A' && sj.sec.A.length === 8 && sj.sec.B.length === 8, 'jazz: 32-bar AABA');
const sf = songFromTradition(T('flamenco').songShape, 3); ok(sf.sec.A.join() === '3,1,0,3,1,0', 'flamenco: iv - II - I per compás');
const sw = songFromTradition(T('western').songShape, 3), sw2 = songFromTradition(T('western').songShape, 3); ok(JSON.stringify(sw) === JSON.stringify(sw2) && !T('western').songShape.charts, 'wave 1 songs unchanged (random walk, deterministic)');
// 6 cycles
ok(cycleInfo('solea', 9).land && cycleInfo('solea', 2).accent === cycleInfo('solea', 5).accent, 'soleá lands on count 10, accents on 3 / 6');
ok(cycleInfo('onedrop', 2).land && !cycleInfo('onedrop', 0).land, 'one drop lands on beat 3, beat 1 empty');
ok(cycleInfo('semai10', 0).land && cycleInfo('semai10', 0).steps === 10, 'aksak semai 10/8');
for (const n of ['shuffle', 'rock', 'funk16', 'rumbaclave', 'samba', 'bossa', 'lesnoto', 'daychovo', 'kopanitsa', 'aksak9', 'sixeight', 'huayno', 'dnb', 'banyan', 'rupaka6', 'pulse8']) if (!cycleInfo(n, 0)) ok(false, 'cycle ' + n);
// 7 overtone: one fundamental (the pull holds the tonic)
{ const world = { pseed: 9, home: { trad: null }, terrOf: L => L }, sim = { ohms: [], world }, M2 = createMusic(() => 0), b2 = createEvents(M2), H2 = createHarmony(world, b2, M2);
  const R = createTraditions({ sim, bus: b2, music: M2, harmony: H2, world }); R.plant('overtone'); R.refresh(); ok(R.cur.id === 'overtone' && H2.tonicPull === 50, 'overtone: tonic pull 50 (the drone never moves)');
  R.plant('jazz'); R.refresh(); ok(H2.tonicPull === 0 && M2.trad.voice, 'jazz: no pull, 7th voicing on'); }
// 8 GUEST ACCENT: a blues ohm in a raga jam leans, ornaments and rests, always in the host scale; off = nothing changes
{ let t = 0; const world = { pseed: 1, home: { trad: null }, terrOf: L => L }, sim = { ohms: [], world, byId: new Map(), ohm: null }, M3 = createMusic(() => t), b3 = createEvents(M3), H3 = createHarmony(world, b3, M3);
  const R = createTraditions({ sim, bus: b3, music: M3, harmony: H3, world }); R.plant('hindustani'); R.refresh();
  const host = { id: 1, seed: 1, scale: 'ohm', g: { calm: .5 }, body: { x: 0, y: 0 } }, guest = { id: 2, seed: 2, scale: 'ohm', g: { calm: .5 }, body: { x: 0, y: 0 } };
  R.stamp(host); guest._trad = 'blues'; guest._tradSc = 'blues (b3 + 3)'; R.stamp(guest); sim.ohms.push(host, guest); sim.byId.set(1, host); sim.byId.set(2, guest);
  ok(host.tradId === 'hindustani' && guest.tradId === 'blues', 'guest keeps its home tradition when stamped on another planet');
  const parts = []; const persist = { register: (n, p) => parts.push([n, p]) };
  const G = createGuests({ sim, bus: b3, music: M3, traditions: R, persist }); const out = []; b3.on('note', ev => out.push(ev)); const meets = []; b3.on('trad.meet', ev => meets.push(ev));
  M3.chord = { root: 0, tones: [0, 2, 4] };
  const play = (src, n) => { out.length = 0; for (let i = 0; i < n; i++) b3.note({ src, kind: 'note', deg: 1 + (i % 2) * 2, oct: 0, vel: .6, beat: i * .5 + .5, t: M3.timeOfBeat(i * .5 + .5), auto: 1, jam: 1 }); return out.slice(); };
  const hn = play(host, 200); ok(hn.length === 200 && hn.every((e, i) => e.deg === 1 + (i % 2) * 2), 'host ohm: untouched');
  const gn = play(guest, 200), grace = gn.filter(e => e.grace), main = gn.filter(e => !e.grace);
  ok(G.meets === 1 && meets.length === 1 && meets[0].host === 'hindustani' && meets[0].guest === 'blues', 'first jam note = one meeting event (hindustani hosts blues)');
  ok(grace.length > 10 && grace.every(e => e.vel < .3), 'slide tradition adds soft grace notes (' + grace.length + ')');
  ok(G.leaned > 0, 'weak non-chord notes lean to home focus (' + G.leaned + ')');
  ok(main.every(e => Number.isInteger(e.deg)), 'every guest note is a host scale degree');
  const strong = main.filter(e => Math.abs(e.beat - Math.round(e.beat)) < .05); ok(strong.length && strong.every(e => e.deg === 3), 'strong beats never changed (' + strong.length + ')');
  ok(parts.length === 1 && JSON.stringify(parts[0][1].save()).includes('"blues"'), 'home tradition saved');
  host._trad = null; parts[0][1].load([[1, 'celtic', 'jig']]); ok(host._trad === 'celtic', 'home tradition restored');
  G.opts.on = false; const off = play(guest, 50); ok(off.length === 50 && off.every((e, i) => e.deg === 1 + (i % 2) * 2 && !e.grace), 'switch off: guest plays exactly as before'); G.opts.on = true; }
console.log(fails ? fails + ' FAIL' : 'WAVE2 OK'); process.exit(fails ? 1 : 0);
