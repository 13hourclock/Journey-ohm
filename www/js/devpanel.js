// DEV PANEL (dev builds may show text, 9:47 PM Oct 24). Readouts + the controls that have no natural hand movement yet.
// Every edit is posted as an event ('set' / 'recipe' / note) on the music clock; the panel never writes state directly.
import { KNOBS, SYNTH_KNOBS, FAMILIES, FAMNAME, recipes, makeRecipe } from './recipe.js';
import { PALETTE, PALETTE_SRC, IOPTS } from './instruments.js';
import { DRUM_OPTS } from './drums.js';
import { THING_OPTS } from './things.js';
import { ALL_KINDS as KINDS, NAME, controls, makeInsert } from './fxkinds.js';
import { SOURCES, TARGETS } from './matrix.js';
import { TUNINGS } from './music.js';
import { store } from './store.js';
import { newSeed } from './rng.js';
const NN = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], RN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];   // key names relative to the om as C
const fx = (v, d = 1) => v == null || !isFinite(v) ? '-' : v.toFixed(d);
export function createPanel(ctx) {
  const { audio, sim, frames, selftest, music, events: bus, matrix, sound } = ctx;
  const root = document.createElement('div'); root.id = 'dev'; document.body.appendChild(root);
  const tog = document.createElement('button'); tog.id = 'devtog'; tog.textContent = 'dev'; document.body.appendChild(tog);
  let open = false;   // starts CLOSED every launch (tap 'dev' to open)
  const show = () => { root.style.display = open ? 'block' : 'none'; }; show();   // systems: was swallowed by the comment above (show undefined)
  tog.addEventListener('pointerdown', e => { e.stopPropagation(); open = !open; localStorage.setItem('jo.devOpen', open ? '1' : '0'); show(); });
  root.addEventListener('pointerdown', e => e.stopPropagation());
  const sec = (id, title, body) => `<details id="${id}"><summary>${title}</summary>${body}</details>`;
  root.innerHTML = `<div class="sec"><b>Journey Ohm dev 0.0.6</b> <span id="dv-seed"></span></div><pre id="dv-meter" style="font-size:15px;font-weight:bold;margin:2px 0"></pre><pre id="dv-live"></pre>
  <div class="row"><button id="dv-new">new seed</button><button id="dv-test">self-test 60 s</button><button id="dv-stop">silence</button></div>
  ${sec('dv-world', 'world: heartbeat, drone, tempo, om, proposals', '<div id="dv-w"></div>')}
  ${sec('dv-snd', 'sounds: save / load', '<div class="row"><input id="dv-name" placeholder="name" size="12"><button id="dv-save">save</button></div><div class="row"><select id="dv-list"></select><button id="dv-load">load</button></div><pre id="dv-store"></pre>')}
  ${sec('dv-voice', 'voice: family + mix, modal body', '<div id="dv-mix"></div><div id="dv-knobs"></div>')}
  ${sec('dv-syn', 'synth: envelopes, filter, LFO, engine shape (genes)', '<div id="dv-syn-k"></div>')}
  ${sec('dv-fxs', 'effects chain (inserts, in series)', '<div id="dv-chain"></div>')}
  ${sec('dv-mat', 'influence matrix (any source -> any target)', '<div id="dv-rows"></div><div class="row"><button id="dv-addrow">+ row</button></div><div id="dv-lfo"></div>')}
  ${sec('dv-out', 'reverb / limiter', '<div id="dv-fx"></div>')}
  <div class="sec">self-test</div><pre id="dv-test-out"></pre><div class="row"><button id="dv-copy">copy results</button></div>`;
  const $ = id => root.querySelector('#' + id);
  const el = (tag, html, host) => { const e = document.createElement(tag); if (html != null) e.innerHTML = html; if (host) host.appendChild(e); return e; };
  const slider = (host, label, min, max, val, on, hint, step) => { const w = el('label', `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step || (max - min) / 200}" value="${val}"><i></i>`, host); w.title = hint || '';
    const inp = w.querySelector('input'), out = w.querySelector('i'); const set = () => { out.textContent = (+inp.value).toFixed(2); on(+inp.value); }; inp.addEventListener('input', set); out.textContent = (+val).toFixed(2); return inp; };
  const check = (host, label, val, on) => { const w = el('label', `<span>${label}</span><input type="checkbox" ${val ? 'checked' : ''}><i></i>`, host); const c = w.querySelector('input'); c.addEventListener('change', () => on(c.checked)); return c; };
  const select = (host, label, opts, val, on) => { const w = el('label', `<span>${label}</span><select>${opts.map(o => `<option value="${o[0]}" ${o[0] === val ? 'selected' : ''}>${o[1]}</option>`).join('')}</select><i></i>`, host); const s = w.querySelector('select'); s.addEventListener('change', () => on(s.value)); return s; };
  const ohm = () => sim.ohm, rec = () => recipes.get(sim.ohm.recipe), set = (path, v) => bus.set(ohm(), path, v);
  // ---- world ----
  const W = $('dv-w'), O = sim.opts;
  check(W, 'heartbeat on', O.heart.on, v => bus.set(null, 'opt.heart.on', v)); slider(W, 'heartbeat level', 0, 1, O.heart.level, v => bus.set(null, 'opt.heart.level', v));
  check(W, 'om drone on', O.drone.on, v => bus.set(null, 'opt.drone.on', v)); slider(W, 'om drone level', 0, 1, O.drone.level, v => bus.set(null, 'opt.drone.level', v));
  const bpmS = slider(W, 'tempo (BPM)', 30, 180, music.bpm, v => bus.set(null, 'music.bpm', v), 'moves the shared beat; un-ticks the lock', 1);
  slider(W, 'om (Hz)', 32, 128, music.om, v => { bus.set(null, 'music.om', v); if (music.lock) bpmS.value = music.bpm; }, 'home pitch: the jam\'s key moves around it (pivot changes); drone + notes follow', .5);
  const lockC = check(W, 'tie BPM to om (om/64*60), off by default', music.lock, v => { bus.set(null, 'music.lock', v); bpmS.value = music.bpm; });
  bpmS.addEventListener('input', () => { lockC.checked = false; });
  el('div', '<i>step-1 PROPOSALS (defaults on, not decided):</i>', W);
  select(W, 'tuning', Object.keys(TUNINGS).map(k => [k, TUNINGS[k].name]), music.tuning, v => bus.set(null, 'music.tuning', v));
  check(W, 'body size sets the octave', O.sizeOctave, v => bus.set(null, 'opt.sizeOctave', v));
  check(W, 'hold also strikes', O.holdStrikes, v => bus.set(null, 'opt.holdStrikes', v));
  check(W, '4-beat breath swell', O.breath, v => bus.set(null, 'opt.breath', v));
  check(W, 'jam partner (second ohm answers your phrases)', O.jam.on, v => bus.set(null, 'opt.jam.on', v));   // v0.0.4 PROPOSAL, default on
  select(W, 'jam: your taps snap to', [['1', 'beat'], ['2', '1/8'], ['4', '1/16']], String(O.jam.div), v => bus.set(null, 'opt.jam.div', +v));
  select(W, 'jam: snap strength', [['context', 'from context (genes, feel, density)'], ['hard', 'hard grid'], ['free', 'free (no snap)']], O.jam.snap || 'context', v => bus.set(null, 'opt.jam.snap', v));
  slider(W, 'jam range (ohm radii)', 1, 12, O.jam.near, v => bus.set(null, 'opt.jam.near', v), 'two ohms jam only when this close (PROPOSAL)', .5);
  // v0.0.6 (all PROPOSALS, each a toggle): moving harmony, in tune / in time, auto mix, sampling
  check(W, 'jam harmony moves (chords change, shaped by everyone playing)', O.harm.on, v => bus.set(null, 'opt.harm.on', v));
  select(W, 'chord changes every', [['1', '1 bar'], ['2', '2 bars'], ['4', '4 bars']], String(O.harm.bars), v => bus.set(null, 'opt.harm.bars', +v));
  check(W, 'jam can change key (via a shared chord)', O.harm.keys, v => bus.set(null, 'opt.harm.keys', v));
  check(W, 'answers stay in tune with the chord', O.jam.inTune, v => bus.set(null, 'opt.jam.inTune', v));
  check(W, 'answers stay on the beat', O.jam.inTime, v => bus.set(null, 'opt.jam.inTime', v));
  check(W, 'auto mix (crowded ohms: quieter + spread)', O.mix.on, v => bus.set(null, 'opt.mix.on', v));
  { const r = el('div', '', W); r.className = 'row'; for (const [t, p] of [['push key up a fifth', { dir: 1 }], ['push key down a fifth', { dir: -1 }], ['push chord IV', { chord: 3 }], ['push chord V', { chord: 4 }]]) { const b = el('button', t, r); b.addEventListener('click', () => bus.post({ type: 'harmony.push', ...p })); } }
  select(W, 'tap change in a jam lands', [['context', 'by context (on beat now / off beat next bar / dense: phrase end)'], ['bar', 'next bar'], ['now', 'now']], O.land.mode, v => bus.set(null, 'opt.land.mode', v));
  select(W, 'who follows your tempo', [['context', 'ohms jamming with / listening to you'], ['all', 'every ohm'], ['none', 'only your ohm']], O.tempo.follow, v => bus.set(null, 'opt.tempo.follow', v));
  select(W, 'dip while singing', [['context', 'listening ohm + lightly the closest'], ['all', 'whole mix']], O.sing.duckMode, v => bus.set(null, 'opt.sing.duckMode', v));
  slider(W, 'closest ohm dips (x of the listener)', 0, 1, O.sing.nearK, v => bus.set(null, 'opt.sing.nearK', v), '', .05);
  slider(W, 'headphones lessen the dip (x)', 0, 1, O.sing.phonesK, v => bus.set(null, 'opt.sing.phonesK', v), '', .05);
  check(W, 'sampling: record while singing, chop, your ohm reuses it', O.sample.on, v => bus.set(null, 'opt.sample.on', v));
  select(W, 'chop at', [['notes', 'each sung note'], ['beats', 'every beat']], O.sample.chop, v => bus.set(null, 'opt.sample.chop', v));
  check(W, 'ohms learn by context (who they play with, how near, how long)', O.blend.on, v => bus.set(null, 'opt.blend.on', v));
  check(W, 'learn patterns (rhythm, melody, phrasing)', O.blend.patterns, v => bus.set(null, 'opt.blend.patterns', v));
  check(W, 'learns partners\' SOUND (blended in, at most 35%: it keeps its own)', O.blend.sound, v => bus.set(null, 'opt.blend.sound', v));
  slider(W, 'brain: learning per bar together', 0, .3, O.blend.rate, v => bus.set(null, 'opt.blend.rate', v), '', .01);
  // LEARNING DRIFT (MT + Wilbow 10:52, default ON): per song its own sound moves <= 2% toward who it jammed with (time-weighted), no random part
  check(W, 'learning drift: its sound moves toward the instruments it jams with (per song)', O.blend.drift.on, v => bus.set(null, 'opt.blend.drift.on', v));
  slider(W, 'drift per song', 0, .05, O.blend.drift.step, v => bus.set(null, 'opt.blend.drift.step', v), '', .005);
  slider(W, 'drift cap', 0, .5, O.blend.drift.cap, v => bus.set(null, 'opt.blend.drift.cap', v), '', .01);
  slider(W, 'drift cap, very experienced ohm', 0, 1, O.blend.drift.capXp, v => bus.set(null, 'opt.blend.drift.capXp', v), '', .05);
  slider(W, 'songs to be very experienced', 5, 200, O.blend.drift.xpSongs, v => bus.set(null, 'opt.blend.drift.xpSongs', v), '', 5);
  slider(W, 'a song = bars together (max)', 8, 128, O.blend.drift.songBars, v => bus.set(null, 'opt.blend.drift.songBars', v), '', 4);
  // STEP 5: drum kits (drums.js DRUM_OPTS) + drawn things / effect objects (things.js THING_OPTS); direct option objects, defaults = the build
  check(W, 'drummers grow a kit by learning', DRUM_OPTS.on, v => { DRUM_OPTS.on = v; });
  slider(W, 'kit learning per shared bar', 0, .1, DRUM_OPTS.rate, v => { DRUM_OPTS.rate = v; }, '', .005);
  slider(W, 'kit size cap', 3, 12, DRUM_OPTS.cap, v => { DRUM_OPTS.cap = v; }, '', 1);
  check(W, 'drawn instruments + effect objects', THING_OPTS.on, v => { THING_OPTS.on = v; });
  check(W, 'drawn instruments: drag an end / rim to retune', THING_OPTS.ends, v => { THING_OPTS.ends = v; });
  check(W, 'drawn strings near a jam take its notes', THING_OPTS.jamTune, v => { THING_OPTS.jamTune = v; });
  slider(W, 'rest before lifting (ms)', 150, 1000, THING_OPTS.restMs, v => { THING_OPTS.restMs = v; }, '', 25);
  slider(W, 'effect object reach (x its size)', 1, 3, THING_OPTS.reach, v => { THING_OPTS.reach = v; }, '', .1);
  // INSTRUMENT PLACEMENT (instruments.js IOPTS; defaults = INSTRUMENT_PALETTE.md)
  check(W, 'instruments from the palette', IOPTS.on, v => { IOPTS.on = v; });
  check(W, 'placement by genes (2 nearest rows + seeded spread)', IOPTS.genes, v => { IOPTS.genes = v; });
  check(W, 'place lean (tradition + ground tilt over the equal base)', IOPTS.placeLean !== false, v => { IOPTS.placeLean = v; });
  slider(W, 'gene width', 1, 12, IOPTS.geneWidth, v => { IOPTS.geneWidth = v; }, '', .5);
  check(W, 'a group stays varied (avoid neighbours\' instruments)', IOPTS.distinct, v => { IOPTS.distinct = v; });
  slider(W, 'max blend between two rows', .15, 1, IOPTS.blend, v => { IOPTS.blend = v; }, '', .05);
  slider(W, 'seeded spread around a row', 0, 2, IOPTS.spread, v => { IOPTS.spread = v; }, '', .1);
  check(W, 'voice rows sing syllables on the tract', IOPTS.voices, v => { IOPTS.voices = v; });
  check(W, 'ohms jam without you (thinner when far)', O.autojam.on, v => bus.set(null, 'opt.autojam.on', v));
  slider(W, 'jams: full presence within (units)', 2, 20, O.autojam.reach, v => bus.set(null, 'opt.autojam.reach', v), '', .5);
  slider(W, 'jams: below this presence = one drone', 0, .5, O.autojam.droneK, v => bus.set(null, 'opt.autojam.droneK', v), '', .01);
  slider(W, 'jams: below this presence = rest (sleep)', 0, .3, O.autojam.sleepK, v => bus.set(null, 'opt.autojam.sleepK', v), '', .01);
  check(W, 'some new seeds carry the spectral effect', O.spectral.seeds, v => bus.set(null, 'opt.spectral.seeds', v));
  if (O.herd) { const Hh = O.herd;   // v0.0.10 C #7 herd (PROPOSALS)
    check(W, 'herd: call / loop a group / home (PROPOSAL)', Hh.on, v => bus.set(null, 'opt.herd.on', v));
    check(W, 'herd: double tap bare ground calls ohms over', Hh.call, v => bus.set(null, 'opt.herd.call', v));
    select(W, 'herd: fast steady tapping (tempo run) also calls', [['context', 'no: a tempo run stays tempo (PROPOSAL)'], ['always', 'yes: every double tap calls']], Hh.fastTap, v => bus.set(null, 'opt.herd.fastTap', v));
    slider(W, 'herd call: who answers - social gene weight', 0, 1, Hh.w.social, v => bus.set(null, 'opt.herd.w.social', v), '', .05);
    slider(W, 'herd call: closeness weight', 0, 1, Hh.w.near, v => bus.set(null, 'opt.herd.w.near', v), '', .05);
    slider(W, 'herd call: jamming weight', 0, 1, Hh.w.jam, v => bus.set(null, 'opt.herd.w.jam', v), '', .05);
    slider(W, 'herd call: place mood weight', 0, 1, Hh.w.place, v => bus.set(null, 'opt.herd.w.place', v), '', .05);
    slider(W, 'herd call: answers above this score', 0, 1.5, Hh.thresh, v => bus.set(null, 'opt.herd.thresh', v), '', .05);
    slider(W, 'herd call: reach (units)', 1, 20, Hh.reach, v => bus.set(null, 'opt.herd.reach', v), '', .5);
    slider(W, 'herd call: most extra ohms that come', 0, 30, Hh.max, v => bus.set(null, 'opt.herd.max', v), '', 1);
    select(W, 'herd call: arrival', [['beat', 'on a beat (PROPOSAL)'], ['free', 'as soon as it gets there']], Hh.arrive, v => bus.set(null, 'opt.herd.arrive', v));
    check(W, 'herd call: sounds softly as it arrives', Hh.arriveNote, v => bus.set(null, 'opt.herd.arriveNote', v));
    slider(W, 'herd group: clears after (s)', 5, 120, Hh.selT, v => bus.set(null, 'opt.herd.selT', v), '', 1);
    check(W, 'herd home: hold still while dragging sets home', Hh.home.on, v => bus.set(null, 'opt.herd.home.on', v));
    select(W, 'herd home: drift back', [['context', 'by homing gene x place x jamming (PROPOSAL)'], ['drift', 'all drift (by gene)'], ['stay', 'none drift']], Hh.home.pull, v => bus.set(null, 'opt.herd.home.pull', v));
    slider(W, 'herd home: drift strength', 0, 1.5, Hh.home.base, v => bus.set(null, 'opt.herd.home.base', v), '', .05);
    slider(W, 'herd home: still time (s)', .4, 2.5, Hh.home.still, v => bus.set(null, 'opt.herd.home.still', v), '', .1); }
  check(W, 'the drum thing sounds when tapped', O.thing.sound, v => bus.set(null, 'opt.thing.sound', v));
  check(W, 'brain: memories fade when long unused', O.brain.fades, v => bus.set(null, 'opt.brain.fades', v));
  slider(W, 'brain: unused for (beats) before fading', 8, 512, O.brain.idle, v => bus.set(null, 'opt.brain.idle', v), '', 8);
  check(W, 'brain: keep by context (PROPOSAL; heard fades over minutes, played stays, long parts, cap; rates x matrix brain.keep)', O.brain.retain, v => bus.set(null, 'opt.brain.retain', v));
  slider(W, 'brain: note capacity per ohm (x gene .75-1.25)', 200, 8000, O.brain.cap, v => bus.set(null, 'opt.brain.cap', v), '', 100);
  check(W, 'learned share by context (PROPOSAL; base + matrix brain.learned rows)', O.blend.share.ctx, v => bus.set(null, 'opt.blend.share.ctx', v));
  slider(W, 'learned share base', 0, 1, O.blend.share.base, v => bus.set(null, 'opt.blend.share.base', v), '', .05);
  // v0.0.5 singing (all PROPOSALS, each a toggle)
  const SG = O.sing; check(W, 'singing: two-finger still hold on the ohm opens the mic', SG.on, v => bus.set(null, 'opt.sing.on', v));
  select(W, 'your ohm', [['imitate', 'imitates (same notes + rhythm)'], ['answer', 'answers (jam rules)']], SG.mode, v => bus.set(null, 'opt.sing.mode', v));
  slider(W, 'short rest under (s) toggles the mic; longer = only while held', 0, 4, SG.latchS, v => bus.set(null, 'opt.sing.latchS', v), '0 = hold only', .1);
  slider(W, 'sung-back loops', 1, 16, SG.loops, v => bus.set(null, 'opt.sing.loops', v), '', 1);
  const C = (k, label, opts) => select(W, label, [['context', 'context decides'], ...opts], SG[k], v => bus.set(null, 'opt.sing.' + k, ['context', 'off', 'chord', 'mixed', 'scale', 'echo', 'answer'].includes(v) ? v : +v));
  C('drift', 'drift to its own range per loop', [['0.2', 'slow'], ['1', 'at once'], ['0', 'never']]);
  C('fit', 'fit to the chord', [['mixed', 'long + on-beat notes'], ['chord', 'all notes'], ['scale', 'scale only']]);
  C('form', 'echo or answer', [['echo', 'always echo'], ['answer', 'always answer']]);
  C('bends', 'keep your slides / bends', [['1', 'fully'], ['0', 'off']]);
  C('voiceSample', 'your recorded voice in its loops', [['0.5', 'half'], ['off', 'off']]);
  check(W, 'ohm slowly takes a little of your voice (max 15%)', O.blend.voice.on, v => bus.set(null, 'opt.blend.voice.on', v));
  select(W, 'it starts', [['beat', 'on the next beat'], ['bar', 'on the next bar']], SG.when, v => bus.set(null, 'opt.sing.when', v));
  check(W, 'duck game sound while singing', SG.duck, v => bus.set(null, 'opt.sing.duck', v));
  slider(W, 'duck on speaker (dB)', -30, 0, SG.duckDb, v => bus.set(null, 'opt.sing.duckDb', v), '', 1);
  slider(W, 'duck on headphones (dB)', -30, 0, SG.phonesDb, v => bus.set(null, 'opt.sing.phonesDb', v), '', 1);
  select(W, 'headphones', [['auto', 'auto-detect'], ['on', 'yes'], ['off', 'no']], SG.phones, v => bus.set(null, 'opt.sing.phones', v));
  slider(W, 'mic gate (level)', 0, .1, SG.gate, v => bus.set(null, 'opt.sing.gate', v), 'quieter than this = silence', .002);
  { const b = el('button', 'hold to sing (dev)', W); b.addEventListener('pointerdown', () => bus.post({ type: 'sing', src: sim.ohm, on: true }));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => bus.post({ type: 'sing', src: sim.ohm, on: false })); }
  check(W, 'keep sounding when screen is off (off = pause)', O.bgSound, v => bus.set(null, 'opt.bgSound', v));   // default OFF since v0.0.6 (Wilbow 2:16 AM, 1B: screen off = pause)
  // ---- store ----
  const refreshList = () => { $('dv-list').innerHTML = store.list().map(n => `<option>${n}</option>`).join(''); $('dv-store').textContent = `${store.list().length} saved (localStorage 'jo.recipes')`; };
  $('dv-save').addEventListener('click', () => { const n = ($('dv-name').value || rec().name || 'sound').trim(); store.save(n, rec()); set('recipe.name', n); refreshList(); });
  $('dv-load').addEventListener('click', () => { const n = $('dv-list').value; if (!n) return; const r = store.load(n); if (r) bus.post({ type: 'recipe', src: ohm(), rec: r }); });
  refreshList();
  // ---- recipe-dependent sections (rebuilt on recipe events) ----
  const buildRecipe = () => { const r = rec(); if (!r) return;
    const f = r.modal.fam; $('dv-seed').textContent = `${r.name} | seed ${r.seed} | str ${fx(f.string, 2)} mem ${fx(f.membrane, 2)} bar ${fx(f.bar, 2)} | ${r.synth.family === 'auto' ? 'leans ' + (fromLean(r)) : FAMNAME[r.synth.family]}`; $('dv-name').value = r.name;
    const M = $('dv-mix'); M.innerHTML = '';
    select(M, 'synth family', FAMILIES.map(k => [k, FAMNAME[k]]), r.synth.family, v => { set('recipe.synth.family', v); buildRecipe(); });
    // INSTRUMENT (instruments.js): where this ohm sits between two palette landmarks + its own spread. The player can move it.
    if (r.inst) { const L = PALETTE.map(e => [e.id, e.id.replace(/_/g, ' ') + ' (' + e.family + ')']), I = r.inst;
      el('div', `<small>instrument: <b>${I.a.replace(/_/g, ' ')}</b> ${Math.round((1 - I.w) * 100)}% + ${I.b.replace(/_/g, ' ')} ${Math.round(I.w * 100)}% | palette: ${PALETTE_SRC}${r.synth.family !== 'auto' ? ' | OFF while family is not "seed leaning"' : ''}</small>`, M);
      select(M, 'instrument', L, I.a, v => { set('recipe.inst.a', v); buildRecipe(); });
      select(M, 'blended with', L, I.b, v => { set('recipe.inst.b', v); buildRecipe(); });
      slider(M, 'blend', 0, 1, I.w, v => set('recipe.inst.w', v), 'how far toward the second instrument');
      const nb = el('button', 'new spread', M); nb.addEventListener('pointerdown', () => { set('recipe.inst.s', (Math.random() * 1e9) | 0); buildRecipe(); }); }
    slider(M, 'modal body level', 0, 1, r.mix.modal, v => set('recipe.mix.modal', v)); slider(M, 'synth level', 0, 1, r.mix.synth, v => set('recipe.mix.synth', v));
    const K = $('dv-knobs'); K.innerHTML = ''; for (const k in KNOBS) { const Q = KNOBS[k]; slider(K, Q.label, Q.min, Q.max, r.modal.p[k], v => set('recipe.modal.p.' + k, v), Q.hint); }
    const S = $('dv-syn-k'); S.innerHTML = ''; for (const k of SYNTH_KNOBS) slider(S, k, 0, 1, r.synth.genes[k], v => set('recipe.synth.genes.' + k, v), 'gene 0..1 (a leaning)');
    const C = $('dv-chain'); C.innerHTML = '';
    for (let i = 0; i < 4; i++) { const it = r.fx[i], box = el('div', null, C); box.className = 'fxrow';
      select(box, `insert ${i + 1}`, [['', '(none)'], ...KINDS.map(k => [k, NAME[k]])], it ? it.kind : '', v => { const ch = r.fx.slice(0, 4).filter(Boolean); if (!v) ch.splice(i, 1); else if (i < ch.length) ch[i] = makeInsert(v, r.seed + i); else ch.push(makeInsert(v, r.seed + i)); set('recipe.fx', ch); buildRecipe(); });
      if (it) for (const c of controls(it)) slider(box, '  ' + c, 0, 1, it.ctl[c], v => set(`recipe.fx.${i}.ctl.${c}`, v)); if (!it) break; }
    const R = $('dv-rows'); R.innerHTML = '';
    (r.mods || []).forEach((m, i) => { const box = el('div', null, R); box.className = 'fxrow';
      select(box, `row ${i}`, SOURCES.map(s => [s, s]), m.src, v => set(`recipe.mods.${i}.src`, v));
      select(box, '  ->', TARGETS.map(s => [s, s]), m.dst, v => set(`recipe.mods.${i}.dst`, v));
      slider(box, '  amount', -1, 1, m.amt, v => set(`recipe.mods.${i}.amt`, v));
      select(box, '  snap to beat', [['0', 'off'], ['0.25', '1/16'], ['0.5', '1/8'], ['1', '1/4 (beat)'], ['2', 'half'], ['4', 'bar']], String(m.snap || 0), v => set(`recipe.mods.${i}.snap`, +v));
      select(box, '  snap as', [['pulse', 'pulse'], ['hold', 'step (hold)']], m.snapMode || 'pulse', v => set(`recipe.mods.${i}.snapMode`, v));
      const x = el('button', 'remove row', box); x.addEventListener('click', () => { const a = r.mods.slice(); a.splice(i, 1); set('recipe.mods', a); buildRecipe(); }); });
    const L = $('dv-lfo'); L.innerHTML = '';
    r.lfo.forEach((l, i) => { select(L, `LFO ${i + 1} cycle (beats)`, [.25, .5, 1, 2, 4, 8, 16].map(b => [String(b), String(b)]), String(l.rate), v => set(`recipe.lfo.${i}.rate`, +v));
      select(L, `LFO ${i + 1} shape`, ['sine', 'tri', 'saw', 'square'].map(s => [s, s]), l.shape, v => set(`recipe.lfo.${i}.shape`, v)); });
    for (const k of ['a', 'd', 's', 'r']) slider(L, 'mod env ' + k, k === 's' ? 0 : .005, k === 's' ? 1 : 3, r.menv[k], v => set('recipe.menv.' + k, v));
  };
  const fromLean = r => { let best = 'phys', bv = .3; for (const k of FAMILIES.slice(2)) if (r.synth.genes[k] > bv) { bv = r.synth.genes[k]; best = k; } return FAMNAME[best]; };
  $('dv-addrow').addEventListener('click', () => { const a = (rec().mods || []).slice(); a.push({ src: 'lfo2', dst: 'live.cut', amt: .2 }); set('recipe.mods', a); buildRecipe(); });
  bus.on('recipe', ev => { if (ev.src === sim.ohm) setTimeout(buildRecipe, 0); });
  const FXK = { revMix: [0, 2, 1, 'reverb mix'], revFb: [.3, .93, .78, 'reverb size (FDN feedback)'], revDamp: [0, .95, .45, 'reverb damping (HF)'], ceiling: [.2, 1, .7, 'limiter ceiling'], master: [0, 1.5, .8, 'master / limiter drive'] };
  for (const k in FXK) { const [a, b, v, l] = FXK[k]; audio.params[k] = v; slider($('dv-fx'), l, a, b, v, x => audio.setParam(k, x)); }
  buildRecipe();
  $('dv-new').addEventListener('click', () => { sim.reseed(); });
  $('dv-test').addEventListener('click', () => { if (!selftest.start(60)) $('dv-test-out').textContent = audio.ready ? 'already running' : 'touch the screen first (audio starts on touch)'; });
  $('dv-stop').addEventListener('click', () => { audio.send({ t: 'all' }); bus.set(null, 'opt.drone.on', false); bus.set(null, 'opt.heart.on', false); });
  $('dv-copy').addEventListener('click', () => { const s = JSON.stringify(selftest.res, null, 1); try { navigator.clipboard.writeText(s); } catch (e) { } $('dv-test-out').textContent = s; });
  const fmtRes = r => !r ? 'not run yet (runs once, from your first touch)' : `${r.at.slice(0, 24)}  sr ${r.sampleRate} base ${fx(r.baseLatencyMs)} out ${fx(r.outputLatencyMs)} ms
touch->sound med ${fx(r.touchMs.median)} p90 ${fx(r.touchMs.p90)} ms (n ${r.touchMs.n}) ${r.pass.touch == null ? '' : r.pass.touch ? 'OK' : 'OVER'}
frame ${fx(r.frameMs.mean, 2)} p95 ${fx(r.frameMs.p95, 2)} draw ${fx(r.frameMs.drawMean, 2)} ms gaps ${r.frameMs.gaps}
load ${fx(r.load.mean * 100)}% peak ${fx(r.load.peak * 100)}% over-budget blocks ${r.overBudgetBlocks}
ramp ${r.ramp.map(s => s.voices + ':' + fx(s.load * 100, 0) + '%').join(' ')}
voices under 50%: ${r.maxVoicesUnderTarget}  dropouts ${r.pass.dropouts ? 'OK' : 'SOME'}${r.workletPerfClock === false ? '  (coarse ms clock in worklet)' : ''}`;
  selftest.onDone = r => { $('dv-test-out').textContent = fmtRes(r); };
  $('dv-test-out').textContent = fmtRes(selftest.res);
  let lastN = 0, lastT = performance.now(), evRate = 0;
  setInterval(() => { const now = performance.now(); evRate = (bus.total - lastN) / ((now - lastT) / 1000); lastN = bus.total; lastT = now; if (!open) return;
    const s = audio.last, f = frames.recent(), lat = audio.latency(), t = audio.touchMs, tl = t.length ? t[t.length - 1] : null, tm = t.length ? t.slice().sort((a, b) => a - b)[Math.floor(t.length / 2)] : null, c = globalThis.JO && globalThis.JO.ctl;
    const G = globalThis.JO && globalThis.JO.sing, nOhm = sim.sources.filter(o => o.scale === 'ohm' && (o === sim.ohm || o.place)).length;
    $('dv-meter').textContent = `fps ${fx(f.mean ? 1000 / f.mean : null, 0)} | frame ${fx(f.mean, 1)} ms | audio ${s && s.load != null ? fx(s.load * 100, 0) : '-'}% | ohms ${nOhm}${music.jam ? ' | jam' : ''} | key ${NN[music.key]} chord ${RN[((music.chord.root % 7) + 7) % 7]}${G && G.slices ? ' | slices ' + G.slices : ''}${G && G.active ? ` | mic ${G.hz ? fx(G.hz, 0) + ' Hz deg ' + G.deg : '...'}${G.phones ? ' (phones)' : ''}` : ''}${G && G.err ? ' | mic ' + G.err : ''}`;
    $('dv-live').textContent = `touch->sound ${fx(tl)} ms (med ${fx(tm)}, n ${t.length})   out lat ${lat ? fx(lat.base + lat.output) : '-'} ms
frame ${fx(f.mean, 2)} ms  p95 ${fx(f.p95, 2)}  draw ${fx(f.drawMean, 2)}  gaps ${frames.gapsTotal}
worklet load ${s && s.load != null ? fx(s.load * 100) : '-'}%  peak ${s && s.loadPeak != null ? fx(s.loadPeak * 100) : '-'}%  over ${s ? s.overTot : '-'}
voices modal ${s ? s.act : 0}/32 synth ${s ? s.iact : 0}/${s ? s.NI : 14} fx ${s ? s.fxOn : 0}/8  stolen ${s ? s.stolen + '+' + s.istolen : 0} shed ${s ? s.shed : 0}  lim ${s ? fx(s.grDb, 1) : '-'} dB
control tick ${c ? fx(c.ms, 3) : '-'} ms @ ${c ? c.hz : '-'}/s (${c ? c.src : '-'}) (matrix ${fx(matrix.ms, 3)} max ${fx(matrix.msMax, 2)})  events ${fx(evRate, 0)}/s
beat ${fx(music.beat(), 1)}  ${fx(music.bpm, 0)} BPM  om ${fx(music.om, 1)} Hz  ${music.scale.name}  notes ${bus.sent}${audio.err ? '\nAUDIO ERROR ' + audio.err : ''}${audio.ctx ? '' : '\n(touch to start audio)'}${selftest.running ? `\nSELF-TEST ${Math.round(selftest.progress * 100)}%` + (selftest.progress > (selftest.dur - selftest.ramp) / selftest.dur ? ' silent voice ramp' : ' - play normally') : ''}`; }, 250);
  const toggle = v => { open = v == null ? !open : !!v; show(); return open; };   // systems: the 3-finger still hold (gestures.js) opens it too (audit A6)
  return { root, buildRecipe, toggle, isOpen: () => open };
}
