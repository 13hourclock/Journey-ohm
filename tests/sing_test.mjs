// v0.0.5 sing: pitch detector on SYNTHETIC sines (no recording), mic only after the gesture event, ducking (headphones less),
// the ohm imitates a sung phrase (same degrees + rhythm in its own register), answer mode, and the detector's cost.
import { createMusic } from '../www/js/music.js';
import { createEvents } from '../www/js/events.js';
import { createSim } from '../www/js/sim.js';
import { createJam } from '../www/js/jam.js';
import { createSing, detectPitch } from '../www/js/sing.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sr = 48000, sine = (hz, a = .2) => Float32Array.from({ length: 2048 }, (_, i) => a * Math.sin(2 * Math.PI * hz * i / sr) + .3 * a * Math.sin(4 * Math.PI * hz * i / sr));
for (const hz of [98, 196, 262, 440, 660]) { const r = detectPitch(sine(hz), sr); ok(Math.abs(1200 * Math.log2(r.hz / hz)) < 20, `detects ${hz} Hz -> ${r.hz.toFixed(1)} (clarity ${r.clarity.toFixed(2)})`); }
ok(detectPitch(new Float32Array(2048), sr).hz === 0, 'silence -> no pitch');
const nz = Float32Array.from({ length: 2048 }, () => Math.random() * .2 - .1); ok(detectPitch(nz, sr).clarity < .8, 'noise -> not clear');
let t0 = performance.now(); for (let i = 0; i < 200; i++) detectPitch(sine(200 + i), sr); const ms = (performance.now() - t0) / 200; ok(ms < 1, `detector ${ms.toFixed(3)} ms per read (runs ~20/s only while singing)`);
// app flow with a fake mic + audio graph
let T = 0, gUM = 0, cur = sine(196); const gains = [];
const audio = { ctx: { currentTime: 0, sampleRate: sr, createMediaStreamSource: () => ({ connect() {}, disconnect() {} }), createAnalyser: () => ({ fftSize: 2048, getFloatTimeDomainData: b => b.set(cur) }) },
  out: { gain: { setTargetAtTime: v => gains.push(v) } } };
let label = 'Speaker'; Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { gUM++; return { getTracks: () => [{ stop() {} }] }; }, enumerateDevices: async () => [{ kind: 'audiooutput', label }] } } });
const music = createMusic(() => T), bus = createEvents(music), sim = createSim(music, bus); sim.reseed(5); const jam = createJam(sim, bus, music), sing = createSing(sim, bus, music, audio);
const step = s => { for (let i = 0; i < s * 50; i++) { T += .02; sing.tick(); jam.tick(); } };
step(3); ok(gUM === 0 && !sing.active, 'no gesture -> mic never opened');
const SO = sim.opts.sing; Object.assign(SO, { latchS: 0, loops: 1, fit: 'scale', form: 'echo', drift: 0, voiceSample: 'off' });   // v0.0.7: the v0.0.5 checks run with the old one-shot behaviour
const mine = []; bus.on('note', e => { if (e.src === sim.ohm && e.imit) mine.push(e); });
const voice = []; bus.on('note', e => { if (e.src === sing.src) voice.push(e); });
sim.opts.sing.duckMode = 'all'; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5));
ok(gUM === 1 && sing.active, 'sing gesture -> mic open'); ok(Math.abs(gains.at(-1) - Math.pow(10, -12 / 20)) < 1e-6, 'speaker: game sound ducked -12 dB');
// sing 3 notes: G, A, B-ish over the om (64 Hz) => degrees in the shared scale
for (const hz of [192, 216, 240]) { cur = sine(hz); step(.5); }
cur = new Float32Array(2048); step(.2);
bus.post({ type: 'sing', src: sim.ohm, on: false }); ok(!sing.active && gains.at(-1) === 1, 'release -> mic closed, sound back to full');
ok(voice.length === 3, `sung phrase heard as ${voice.length} notes, degrees ${voice.map(e => e.deg).join(',')}`);
step(3); ok(mine.length === 3, `your ohm imitates with ${mine.length} notes`);
ok(mine.length === 3 && mine.every((e, i) => e.deg - mine[0].deg === voice[i].deg - voice[0].deg), `same contour: ${mine.map(e => e.deg).join(',')}`);
ok(mine.length === 3 && Math.abs((mine[1].beat - mine[0].beat) - (voice[1].sungB - voice[0].sungB)) < 1e-6 && Math.abs(mine[0].beat - Math.round(mine[0].beat)) < 1e-6, 'same rhythm as sung (v0.0.7: real offsets, no grid), starts on a beat');
// headphones: less ducking
label = 'Wired headphones'; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5));
ok(sing.phones && Math.abs(gains.at(-1) - Math.pow(10, -3 / 20)) < 1e-6, 'headphones: ducked only -3 dB'); bus.post({ type: 'sing', src: sim.ohm, on: false });
sim.opts.sing.duck = false; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5)); ok(gains.at(-1) === 1, 'duck switch off: no ducking'); bus.post({ type: 'sing', src: sim.ohm, on: false }); sim.opts.sing.duck = true;
sim.opts.sing.on = false; const g0 = gUM; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5)); ok(gUM === g0, 'singing toggle off: gesture does nothing'); sim.opts.sing.on = true;
// v0.0.6 context dip (Wilbow 8D): only the listening ohm dips, the closest other lightly, the rest keep playing; headphones lessen it
sim.opts.sing.on = true; sim.opts.sing.duck = true; sim.opts.sing.duckMode = 'context'; label = 'Speaker'; const near = { id: 60, scale: 'ohm', place: { x: 1, y: 0 } }, far = { id: 61, scale: 'ohm', place: { x: 30, y: 0 } };
sim.sources.push(near, far); sim.ohm.place = { x: 0, y: 0 }; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5));
ok(gains.at(-1) === 1 && sing.dbFor(sim.ohm) === -12 && Math.abs(sing.dbFor(near) + 4.8) < 1e-6 && sing.dbFor(far) === 0, `context: listener ${sing.dbFor(sim.ohm)} dB, closest ${sing.dbFor(near).toFixed(1)} dB, far ${sing.dbFor(far)} dB, whole mix untouched`);
bus.post({ type: 'sing', src: sim.ohm, on: false }); label = 'Wired headphones'; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5));
ok(Math.abs(sing.dbFor(sim.ohm) + 3.6) < 1e-6, `headphones lessen it (${sing.dbFor(sim.ohm).toFixed(1)} dB)`); bus.post({ type: 'sing', src: sim.ohm, on: false }); ok(sing.dbFor(sim.ohm) === 0, 'stop singing -> no dip');
sim.sources.splice(sim.sources.indexOf(near), 2);
// v0.0.7 (30): a short rest toggles (mic stays open), the next rest closes; a long hold = only while held
SO.latchS = 1.5; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5)); bus.post({ type: 'sing', src: sim.ohm, on: false });
ok(sing.active && sing.latched, 'short rest: mic stays open (toggled)'); bus.post({ type: 'sing', src: sim.ohm, on: true }); ok(!sing.active, 'rest again: mic closes'); bus.post({ type: 'sing', src: sim.ohm, on: false }); ok(!sing.active, '... and lifting after does not reopen it');
SO.latchS = .001; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 10)); bus.post({ type: 'sing', src: sim.ohm, on: false }); ok(!sing.active, 'long hold: mic only while held'); SO.latchS = 0;
// (31) no note cap, sung timing kept (no grid), looped; (32) starts at your pitch, drifts to its own range
const singPhrase = async (hzs, durs) => { mine.length = 0; voice.length = 0; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5));
  hzs.forEach((hz, i) => { cur = sine(hz); step(durs[i % durs.length]); }); cur = new Float32Array(2048); step(.2); bus.post({ type: 'sing', src: sim.ohm, on: false }); };
const sc = [192, 216, 240, 256, 288, 320, 360, 384, 360, 320];
Object.assign(SO, { loops: 3, drift: .5 }); await singPhrase(sc, [.37, .52, .61]); step(40);
ok(voice.length === 10 && mine.length === 30, `10 sung notes -> 3 loops of 10 (${voice.length} sung, ${mine.length} played)`);
const L1 = mine.slice(0, 10), off = (a, i) => a[i].beat - a[0].beat, vo = (i) => voice[i].sungB - voice[0].sungB;
ok(L1.every((e, i) => Math.abs(off(L1, i) - vo(i)) < 1e-6), 'loop notes sit at the time offsets you sang them (no grid)');
ok(L1.every((e, i) => e.deg === voice[i].deg), `loop 1 = your pitch (${L1.map(e => e.deg)})`);
const L3 = mine.slice(20, 30), sh = L3[0].deg - L1[0].deg; ok(sh !== 0 && L3.every((e, i) => e.deg - L1[i].deg === sh), `by loop 3 it moved to its own range, shape kept (shift ${sh})`);
const Lb = mine[10].beat - mine[0].beat; ok(Lb % 4 === 0 && Lb >= 4, `loops repeat every ${Lb} beats (whole bars)`);
// (51A/C) fit + answer
Object.assign(SO, { loops: 1, drift: 0, fit: 'chord' }); await singPhrase([192, 216, 240, 256], [.5]); step(12); const ch = sim.music ? null : null;
ok(mine.length === 4, 'fit chord: 4 notes'); const tones = [0, 2, 4, 6, 1, 3, 5];
Object.assign(SO, { fit: 'scale', form: 'answer' }); await singPhrase([192, 216, 240, 256], [.5]); step(12);
ok(mine.length === 4 && mine[0].deg === voice[0].deg && mine[1].deg === voice[1].deg && ((mine[3].deg % 7) + 7) % 7 === 0, `answer: first half copies, ends home (${mine.map(e => e.deg)})`);
// (33) slides / bends kept: a note sung sliding up within one degree bends the ohm's note
Object.assign(SO, { form: 'echo', bends: 1 }); mine.length = 0; voice.length = 0; bus.post({ type: 'sing', src: sim.ohm, on: true }); await new Promise(r => setTimeout(r, 5));
for (const hz of [190, 192, 194, 196, 198]) { cur = sine(hz); step(.12); } cur = new Float32Array(2048); step(.2); bus.post({ type: 'sing', src: sim.ohm, on: false });
let bmax = 1; for (let i = 0; i < 400; i++) { T += .02; sing.tick(); jam.tick(); bmax = Math.max(bmax, jam.bendFor(sim.ohm)); }
ok(mine.length >= 1 && bmax > 1.005, `your slide is kept as a bend (peak x${bmax.toFixed(3)})`);
Object.assign(SO, { latchS: 1.5, loops: 4, drift: 'context', fit: 'context', form: 'context', bends: 'context', voiceSample: 'context' });
console.log(fails ? 'SING_FAIL' : 'SING_OK');
