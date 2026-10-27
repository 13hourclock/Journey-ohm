// THE INFLUENCE MATRIX (B): any source drives any target. A row = { src, dst, amt (-1..1) } and lives in the owner's recipe,
// so one object carries the whole sound. Runs at CONTROL rate on the main thread (one pass per frame per owner); the audio
// thread only receives the results (per-voice DSP stays in the worklet).
// Sources = the latest value of any control stream in the shared state (events.js 'ctl'): touch (position, pressure, degree),
// body physics, the shared clock / key, LFOs and the mod envelope (computed here from the music clock and posted as streams
// too), sound levels coming back from the audio thread; places / other scales later just post their own streams.
// Targets: note-time (modal.*, synth.<gene>, mix.*, note.*) shape each new voice; live (live.*, fx.N.<ctl>, mod.N.amt, lfo.N.rate,
// look.*, body.*) are posted each tick as one 'live' event per owner, only when something changed.
import { recipes, KNOBS, SYNTH_KNOBS } from './recipe.js';
import { controls, KINDS } from './fxkinds.js';
import { INFL_SOURCES } from './influence.js';

export const SOURCES = ['touch.pos', 'touch.pressure', 'note.degree', 'body.pinchIn', 'body.pinchOut', 'body.pull', 'body.motion', 'body.throb', 'sound.level',
  'beat.phase', 'beat.pulse', 'bar.phase', 'key.tonic', 'lfo1', 'lfo2', 'env', ...INFL_SOURCES,
  'world.depth', 'world.zoom', 'world.ground', 'weather.wind', 'weather.rain', 'weather.cloud', 'sky.day', 'ground.cave', 'layer.bright', 'layer.rough', 'layer.timbre', 'layer.tempo',
  'music.busy', 'place.mood', 'planet.tempo', 'tempo.tapped', 'world.size', 'planet.size', 'planet.own', 'space.amt', 'space.planet', 'planet.lean', 'ground.hard', 'ground.hollow', 'ground.wet', 'place.timbre', 'place.bright', 'place.feel', 'place.landmark', 'ground.raised', 'ground.fresh', 'place.season', 'place.weather', 'ground.cut', 'ground.crack', 'ground.crater', 'ground.fold', 'ground.folding', 'ground.sung'];   // v0.0.7: world track globals (world.js posts them); v0.0.9 (additive): planet.js context streams (5a C sources, 5d C blend); v0.0.12 (additive): terrain.js place sources; v0.0.11 (additive): system.js space streams
const LIVE_SYNTH = { cut: ['mul', 3], q: ['add', -1.2], fold: ['add', 1], wtPos: ['add', 1], pdAmt: ['add', 1], sat: ['add', 1], lfoP: ['add', .8], lfoF: ['add', 1.2], lfoA: ['add', .5], noise: ['add', .5], fmIx: ['mul', 2] };
export const TARGETS = [...Object.keys(LIVE_SYNTH).map(k => 'live.' + k), 'live.bend',
  ...[0, 1, 2, 3].flatMap(i => ['mix', 'depth', 'tone', 'div', 'off', 'cents', 'cut', 'res', 'morph', 'hold'].map(c => `fx.${i}.${c}`)),
  ...Object.keys(KNOBS).map(k => 'modal.' + k), ...SYNTH_KNOBS.map(k => 'synth.' + k), 'mix.modal', 'mix.synth', 'note.gain', 'note.pitch', 'note.width',
  ...[0, 1, 2, 3, 4, 5].map(i => `mod.${i}.amt`), 'lfo.0.rate', 'lfo.1.rate', 'look.glow', 'body.throb', 'brain.keep', 'brain.learned'];   // v0.0.7: brain.* = context for its memory (o.brainMod, read by brain.js / jam / autojam)
const NOTE_T = d => d.startsWith('modal.') || d.startsWith('synth.') || d.startsWith('mix.') || d.startsWith('note.');
const shapeF = { sine: x => Math.sin(x * 2 * Math.PI), tri: x => 1 - 4 * Math.abs(((x + .25) % 1) - .5), saw: x => 2 * (x % 1) - 1, square: x => (x % 1) < .5 ? 1 : -1 };

export function createMatrix(world, bus, music) {
  const X = { ms: 0, msMax: 0, ticks: 0, envT: {} , lastOut: {} };
  bus.on('note', ev => { if (ev.kind !== 'release' && ev.kind !== 'damp' && ev.kind !== 'level') X.envT[ev.src.id] = ev.t; });
  // v0.0.3 BEAT SNAP, any row: row.snap = grid in beats (0 off; for example 1 = quarter notes, .5 = eighths, 4 = one bar).
  // snapMode 'pulse' (default): the row's value strikes on each grid line and decays (for example LFO 1 pulses on quarter notes);
  // 'hold': the value is sampled on the grid line and held until the next one (stepped). Pure function of the clock + one held value.
  const held = new Map();
  const snapV = (o, i, r, v, t) => { const g = +r.snap; if (!g || v == null) return v; const b = music.beat(t) / g, k = Math.floor(b);
    if (r.snapMode === 'hold') { const key = o.id + ':' + i, h = held.get(key); if (!h || h.k !== k) { held.set(key, { k, v }); return v; } return h.v; }
    return v * Math.exp(-(b - k) * 5); };
  const vals = (o, extra) => Object.assign({}, world.sig.global, world.sig[o.id], extra);
  // first pass: rows that steer other rows / LFOs (mod.N.amt, lfo.N.rate) - so the matrix can modulate itself
  // v0.0.6: a row with bond: 1 grows with time together (blend.js bond 0..1): amt x (.3 + .7 bond). Context, not drift.
  const effRows = (rec, V, o) => { const rows = rec.mods || [], bd = o && world.blend ? world.blend.bond(o) : 0, amt = rows.map(r => r.bond ? r.amt * (.3 + .7 * bd) : r.amt), lr = (rec.lfo || []).map(l => l.rate);
    for (const r of rows) { const v = V[r.src]; if (v == null || !r.dst) continue;
      if (r.dst.startsWith('mod.')) { const i = +r.dst.split('.')[1]; if (amt[i] != null) amt[i] = Math.max(-1, Math.min(1, amt[i] + v * r.amt)); }
      else if (r.dst.startsWith('lfo.')) { const i = +r.dst.split('.')[1]; if (lr[i] != null) lr[i] *= Math.pow(2, -2 * v * r.amt); } }
    return { rows, amt, lr }; };
  // control-rate sources owned by the recipe: LFOs (beats per cycle on the music clock) and the mod envelope (re-triggered by each note)
  const ownSources = (o, rec, lr, t) => { const out = {}, b = music.beat(t);
    (rec.lfo || []).forEach((l, i) => { out['lfo' + (i + 1)] = (shapeF[l.shape] || shapeF.sine)(b / Math.max(.0625, lr[i])) * (l.depth == null ? 1 : l.depth); });
    const e = rec.menv, t0 = X.envT[o.id]; let ev = 0; if (e && t0 != null) { const u = t - t0; ev = u < e.a ? u / e.a : u < e.a + e.d ? 1 - (1 - e.s) * (u - e.a) / e.d : u < e.a + e.d + 2 ? e.s * Math.max(0, 1 - (u - e.a - e.d) / Math.max(.01, e.r)) : 0; }
    out.env = ev; return out; };
  // note-time offsets for one new note: { 'modal.bright': +x, 'synth.cut': +x, 'note.pitch': semis, ... }
  X.noteOffsets = (o, ev) => { const rec = recipes.get(o.recipe); if (!rec || !rec.mods) return {};
    const extra = {}; if (ev.pos != null) extra['touch.pos'] = ev.pos; if (ev.vel != null) extra['touch.pressure'] = ev.vel; if (ev.deg != null) extra['note.degree'] = (((ev.deg % 7) + 7) % 7) / 7;
    const V = vals(o, extra), { rows, amt, lr } = effRows(rec, V, o); Object.assign(V, ownSources(o, rec, lr, ev.t)); const N = {};
    rows.forEach((r, i) => { if (!NOTE_T(r.dst || '')) return; const v = snapV(o, i, r, V[r.src], ev.t == null ? music.now() : ev.t); if (v == null) return; N[r.dst] = (N[r.dst] || 0) + v * amt[i] * (r.dst === 'note.pitch' ? 12 : 1); });
    return N; };
  // one control tick for every owner: post the live result + the recipe's own streams (LFO / env) as events
  // v0.0.25 smoothness (X.opts.slice, dev panel): the control tick works through the owners from where it stopped last time and stops when
  // it has used sliceMs, so a crowd never makes one long tick (the bar-line hitch); every owner is still reached within a few ticks
  // (each one keeps its last live values meanwhile). slice off = v0.0.24 (every owner every tick).
  X.opts = { slice: true, sliceMs: 1.5 }; let cur = 0; X.done = 0;
  X.tick = () => { const a = performance.now(), t = music.now(), all = world.sources, n = all.length, sl = X.opts.slice !== false;
    if (cur >= n) cur = 0; let k = 0;
    for (; k < n; k++) { if (sl && k > 0 && performance.now() - a > X.opts.sliceMs) break; const o = all[(cur + k) % n]; X.done++; const rec = recipes.get(o.recipe); if (!rec || !rec.mods) continue;
      const V = vals(o), { rows, amt, lr } = effRows(rec, V, o), own = ownSources(o, rec, lr, t); Object.assign(V, own);
      for (const k in own) bus.ctl(o, k, own[k], t);
      const synth = {}, fx = {}, look = {}, body = {}, brn = {}; let bend = 0;
      rows.forEach((r, i) => { const d = r.dst || ''; if (NOTE_T(d) || d.startsWith('mod.') || d.startsWith('lfo.')) return; const v = snapV(o, i, r, V[r.src], t); if (v == null) return; const x = v * amt[i];
        if (d === 'live.bend') bend += x * 12;
        else if (d.startsWith('live.')) { const k = d.slice(5), m = LIVE_SYNTH[k]; if (m) synth[k] = (synth[k] || 0) + x * m[1]; }
        else if (d.startsWith('fx.')) { const [, si, c] = d.split('.'); (fx[si] || (fx[si] = {}))[c] = (fx[si][c] || 0) + x; }
        else if (d.startsWith('look.')) look[d.slice(5)] = (look[d.slice(5)] || 0) + x;
        else if (d.startsWith('body.')) body[d.slice(5)] = (body[d.slice(5)] || 0) + x;
        else if (d.startsWith('brain.')) brn[d.slice(6)] = (brn[d.slice(6)] || 0) + x; });
      o.brainMod = brn;
      const sm = {}; for (const k in synth) sm[k] = LIVE_SYNTH[k][0] === 'mul' ? [Math.pow(2, synth[k]), 0] : [1, synth[k]];
      const out = { synth: sm, bend: Math.pow(2, bend / 12), fx, look, body };
      const key = JSON.stringify(out, (k, v) => typeof v === 'number' ? Math.round(v * 500) / 500 : v);
      if (X.lastOut[o.id] !== key) { X.lastOut[o.id] = key; bus.post({ type: 'live', src: o, out, t }); } }
    cur = n ? (cur + k) % n : 0;
    const ms = performance.now() - a; X.ms = X.ms * .95 + ms * .05; if (ms > X.msMax) X.msMax = ms; X.ticks++; };
  return X;
}
export { controls, KINDS };
