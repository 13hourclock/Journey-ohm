// SOUND: the audio side of the event bus. Listens for note / live / recipe / set events and turns them into worklet
// messages; never called directly by input, physics or visuals. Also owns the FX RACK: each owner (any source) gets a run
// of insert slots for its recipe's chain, chained in series inside the worklet (dsp/fx.js 'to').
import { recipes, voicesFor } from './recipe.js';
import { apply as fxApply } from './fxkinds.js';

export function createSound(bus, world, audio, music, matrix) {
  const S = { racks: new Map(), slotsUsed: 0, NS: 8, sustains: new Map() };
  // ---- FX rack ----
  const rackFor = (o, n) => { let r = S.racks.get(o.id); if (r && r.n >= n) return r; const used = new Set(); for (const [id, x] of S.racks) if (id !== o.id) for (let i = 0; i < x.n; i++) used.add(x.head + i);
    for (let h = 0; h + n <= S.NS; h++) { let ok = true; for (let i = 0; i < n; i++) if (used.has(h + i)) ok = false; if (ok) { if (r) for (let i = 0; i < r.n; i++) audio.send({ t: 'fx', slot: r.head + i, off: 1 }); r = { head: h, n, sent: [] }; S.racks.set(o.id, r); return r; } }
    return null; };
  // OHMS (a): an ohm that falls asleep or leaves world.sources gives its FX slots back (checked ~1/s, O(racks))
  S.gcN = 0; S.gc = () => { if ((S.gcN++ % 60) !== 0 || !S.racks.size) return; const live = new Set(); for (const o of world.sources) if (o.awake !== false) live.add(o.id);
    for (const [id, r] of S.racks) if (!live.has(id) && !(S.sustains.get(id) || []).length) { for (let i = 0; i < r.n; i++) audio.send({ t: 'fx', slot: r.head + i, off: 1 }); S.racks.delete(id); } };
  S.head = o => { const r = S.racks.get(o.id), rec = recipes.get(o.recipe); return r && rec && rec.fx.length ? r.head : -1; };
  // send the owner's chain with its effective controls (recipe ctl + the matrix's live offsets); only changed slots are sent
  S.syncFx = (o, live) => { const rec = recipes.get(o.recipe); if (!rec) return; const ch = rec.fx || [], r = rackFor(o, Math.max(1, Math.min(4, ch.length)));
    if (!r) return; const off = (live && live.fx) || {};
    for (let i = 0; i < r.n; i++) { const it = ch[i], slot = r.head + i;
      if (!it || !it.kind) { if (r.sent[i] !== 'off') { audio.send({ t: 'fx', slot, off: 1 }); r.sent[i] = 'off'; } continue; }
      const V = {}; for (const k in it.ctl) V[k] = Math.max(0, Math.min(1, it.ctl[k] + ((off[i] && off[i][k]) || 0)));
      const m = fxApply(music, it, V), to = i + 1 < ch.length && ch[i + 1] && ch[i + 1].kind ? slot + 1 : -1, key = JSON.stringify([m.kind, m.mix, to, m.p, it.ctl]).replace(/"now":[^,}]*/, '');
      if (r.sent[i] !== key) { r.sent[i] = key; audio.send({ t: 'fx', slot, kind: m.kind, p: m.p, mix: m.mix, to }); } } };
  S.lastLive = new Map();
  bus.on('live', ev => { const o = ev.src, L = ev.out; S.lastLive.set(o.id, L);
    audio.send({ t: 'smod', src: o.id, m: L.synth }); audio.send({ t: 'bend', src: o.id, r: L.bend * (world.jam ? world.jam.bendFor(o) : 1) }); S.syncFx(o, L); });
  const resyncAll = () => { for (const o of world.sources) { const r = S.racks.get(o.id); if (r) r.sent = []; S.syncFx(o, S.lastLive.get(o.id)); } };
  bus.on('recipe', ev => { const r = S.racks.get(ev.src.id); if (r) r.sent = []; S.syncFx(ev.src, S.lastLive.get(ev.src.id)); });
  bus.on('set', ev => { if (ev.path.startsWith('recipe.fx') && ev.src) S.syncFx(ev.src, S.lastLive.get(ev.src.id)); });
  music.onChange(resyncAll);   // tempo / om / tuning moved: beat-locked and in-key effects follow
  S.resync = resyncAll;
  S.mixReg = new Map(); S.mixCrowd = 0;
  // ---- notes ----
  bus.on('note', ev => { const o = ev.src, rec = recipes.get(o.recipe); if (!rec || o.scale === 'voice' || (o.muted && ev.kind !== 'release')) return;   // your voice is heard, never replayed as-is
    if (ev.kind === 'release') { const ids = S.sustains.get(o.id) || []; for (const id of ids) audio.send({ t: 'instOff', id }); audio.send({ t: 'instOff', src: o.id }); S.sustains.delete(o.id); return; }
    if (ev.kind === 'damp') { audio.send({ t: 'damp', src: o.id, tau: ev.tau || .08 }); return; }
    if (ev.kind === 'level') { for (const id of S.sustains.get(o.id) || []) audio.send({ t: 'instGain', id, gain: ev.gain }); return; }
    if (!S.racks.has(o.id) && rec.fx.length) S.syncFx(o, S.lastLive.get(o.id));
    ev.f = ev.f || music.hz(ev.deg == null ? 0 : ev.deg, ev.oct || 0);
    const N = matrix.noteOffsets(o, ev), V = { f: ev.f, vel: ev.vel, pos: ev.pos, dur: ev.dur, pan: ev.pan, src: o.id, fx: S.head(o), sustain: ev.sustain };
    const DL = o.scale === 'ohm' && rec.inst && world.blend && world.blend.driftFor ? world.blend.driftFor(o) : null;   // LEARNING DRIFT (MT + Wilbow 10:52): its own sound, moved by the songs it jammed
    const SO = o.scale === 'ohm' && world.soloFor ? world.soloFor(o, ev) : null;   // learnvoice.js: a fully learned sound now and then plays a phrase cleanly on its own (learnSolo, OFF)
    const RV = SO || (o.scale === 'ohm' && world.drums ? world.drums.recFor(o, rec, ev) : rec);   // step 5: a drummer's note plays the kit hit for its place in the bar (drums.js)
    let msgs = voicesFor(RV, V, N, SO ? null : DL); if (ev.lite && msgs.length > 1) { const k = msgs.find(m => m.t === 'inst'); msgs = [k || msgs[0]]; }   /* lite = its INSTRUMENT voice (was msgs[0] = the modal body: far ohms all sounded like bells, Wilbow 11:04) */   // v0.0.7: a far jam plays a lighter voice (autojam presence)
    // v0.0.4 (additive): ev.learn = { rec, k } layers a learned recipe under / over the source's own (gene) sound, same voices + chain
    // v0.0.6: ev.learn may be a LIST [{rec, k}] (context blend, blend.js; OFF by default 2:31): own sound x (1 - sum k), each learned x k. No solo rule (Q10 deferred).
    // (v0.0.4 single {rec, k} still accepted.) With no ev.learn, an ohm's notes take its context blend (world.blend.learnFor).
    let LL = SO ? null : ev.learn || (o.scale === 'ohm' && world.blend ? world.blend.learnFor(o) : null); if (LL && !Array.isArray(LL)) LL = [LL];
    // instruments: a learned partner SOUND blends into the ohm's own instrument (one voice, capped: it generally keeps its sound)
    if (LL && rec.inst) { const lp = [], rest = []; for (const l of LL) { const R = recipes.get(l.rec); if (R && R.inst && R !== rec) lp.push({ inst: R.inst, k: l.k * ((world.opts.blend || {}).soundMax || .35) }); else rest.push(l); }
      if (lp.length) { msgs = voicesFor(RV, V, N, DL ? DL.concat(lp) : lp); if (ev.lite && msgs.length > 1) msgs = [msgs.find(m => m.t === 'inst') || msgs[0]]; } LL = rest.length ? rest : null; }
    if (LL) { { let ks = 0, add = [];
      for (const l of LL) { const R = recipes.get(l.rec); if (!R || l.k <= .02) continue; ks += l.k; for (const m of voicesFor(R, V, N)) { m.gain *= l.k; add.push(m); } }
      if (add.length) { for (const m of msgs) m.gain *= Math.max(0, 1 - ks); msgs = msgs.concat(add); } } }
    // v0.0.6 AUTO MIX (5D, PROPOSAL opts.mix.on): ohms crowding the same register (within ~0.6 octave, sounding in the last 2 s)
    // get a little quieter and pushed apart in the stereo field, so nobody masks anybody. Per NOTE, O(ohms): no per-block work.
    if (o.scale === 'ohm' && world.opts.mix && world.opts.mix.on) { const r = Math.log2(ev.f), t = ev.t || 0; S.mixReg.set(o.id, { r, t }); let c = 0;
      for (const [id, q] of S.mixReg) if (id !== o.id && t - q.t < 2) c += Math.max(0, 1 - Math.abs(q.r - r) / .6);
      if (c > 0) { const g = 1 / (1 + .4 * c), sh = (o.id % 2 ? 1 : -1) * .35 * Math.min(1, c); for (const m of msgs) { m.gain *= g; m.pan = Math.max(-1, Math.min(1, (m.pan || 0) + sh)); } }
      S.mixCrowd = c; }
    { const Dv = o.scale === 'ohm' && world.world && world.world.zl && world.world.zl.dive; if (Dv && Dv.o === o) { const sp = Dv.split(o, msgs, ev); if (sp) msgs = sp; } }   // inside this ohm (dive.js): its sound split into its parts
    if (world.dbFor) { const db = world.dbFor(o); if (db) { const g = Math.pow(10, db / 20); for (const m of msgs) m.gain *= g; } }   // dip while you sing (sing.js)
    if (world.autoFor && o.scale === 'ohm') { const AU = world.autoFor(o, ev.beat); if (AU) for (const m of msgs) { m.gain *= AU.vol; if (m.P && m.P.cut && AU.cutK !== 1) m.P = Object.assign({}, m.P, { cut: Math.max(60, m.P.cut * AU.cutK) }); } }   // Q357: the river's drawn loudness / brightness (daw.js)
    if (N['note.width']) { const w = Math.max(-1, Math.min(1, N['note.width'])) * .5; msgs.forEach((m, i) => { m.pan = Math.max(-1, Math.min(1, (m.pan || 0) + (i % 2 ? w : -w))); }); }   // matrix: stereo width
    const now = music.now(), at = ev.t > now + .004 && audio.ctx ? ev.t - audio.off : null;   // scheduled (beat) events play at their clock time
    msgs.forEach((m, i) => { if (at != null) m.at = at; if (ev.gainK != null) m.gain *= ev.gainK; const id = audio.voice(m, i === 0 && ev.inputT != null ? ev.inputT : null);
      if (ev.kind === 'sustain' && m.t === 'inst') { const a = S.sustains.get(o.id) || []; a.push(id); S.sustains.set(o.id, a); } }); });
  // sound -> world: per-source loudness from the audio thread, posted as control streams stamped in clock time (E)
  S.onLevels = audio.onLevels = (lv, ct) => { const t = ct + audio.off; for (const o of world.sources) { const v = lv[o.id] || 0; bus.ctl(o, 'sound.level', Math.min(1, v), t); } };
  return S;
}
