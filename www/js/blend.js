// v0.0.6 WHAT AN OHM LEARNS (Wilbow 2:29 '9D', 2:31 'mostly its own sound but can learn to play in different patterns', 2:33 '11A 11D'
// + 'the ohms are also a brain'). PROPOSAL, opts.blend. Context, never random or timed: once per bar, for each awake ohm and each source
// it played WITH (a partner ohm, or your voice for the ohm listening to you), entries in its BRAIN (brain.js) grow by
// rate x closeness x togetherness (how much BOTH played):
//  - 'pattern' (default ON): what it heard that bar (rhythm = onsets in the bar, melody = steps between degrees, phrase length);
//    the same pattern again strengthens it. jam.js plays from it: the stronger a pattern, the more answers take its rhythm/contour
//    (its own style otherwise); playing one keeps it fresh.
//  - 'partner' / 'player': who it has played with (cheap; B.bond(o) scales the matrix rows marked 'bond').
//  - 'sound': partners' sounds; blended into its own only when opts.blend.sound is on (default OFF per 2:31). No solo rule (Q10 deferred).
// Throwing / bumps (strikes with ev.impact) never teach the brain or change its sound (Wilbow 2:36).
// Fading is the brain's: entries unused for a long time (opts.brain.idle) weaken. B.touch(o, recId, amt): hook for touched objects.
import { recipes } from './recipe.js';
import { createBrain } from './brain.js';
export function createBlend(world, bus, music, brain) {
  const O = world.opts, R = brain || createBrain(world, music), B = { brain: R, n: new Map(), hits: new Map(), to: new Map(), lastBar: -1 };
  bus.on('note', ev => { const s = ev.src; if (!s || s.recipe == null || ev.imit || ev.impact != null || !(ev.kind === 'note' || ev.kind === 'strike' || ev.kind === 'sustain')) return;
    if (s.scale !== 'ohm' && s.scale !== 'voice') return; B.n.set(s, (B.n.get(s) || 0) + 1); if (ev.to) B.to.set(s, ev.to);
    if (ev.deg != null) { let h = B.hits.get(s); if (!h) B.hits.set(s, h = []); if (h.length < 8) h.push({ b: ev.beat != null ? ev.beat : music.beat(ev.t), d: ev.deg });
      // v0.0.7 long parts: the whole phrase it plays (up to opts.brain.phraseBars), ended by a 2-bar rest
      if (O.brain && O.brain.retain) { const b = ev.sungB != null ? ev.sungB : ev.beat != null ? ev.beat : music.beat(ev.t); let st = B.streams.get(s);
        if (!st || b - st.last > 8) { if (st) B.endPhrase(s, st); st = { b0: Math.floor(b / 4) * 4, last: b, notes: [], who: new Map() }; B.streams.set(s, st); }
        if (b - st.b0 < (O.brain.phraseBars || 64) * 4 && st.notes.length < 4096) st.notes.push({ b: b - st.b0, d: ev.deg, oct: ev.oct || 0, dur: ev.len || ev.dur || .25, vel: ev.vel, bend: ev.bend && ev.bend.length ? 1 : 0 }); st.last = b; } } });
  B.streams = new Map();
  // a finished phrase goes into the brain of every ohm that was listening (heard layer; strength = how much it listened)
  B.endPhrase = (s, st) => { B.streams.delete(s); if (st.notes.length < 4) return; for (const [o, k] of st.who) if (o.brain || R.of(o)) R.phrase(o, st.notes, Math.min(1, k), O.blend.max); };
  const pos = o => o.place || o.body || null;
  B.close = (a, b) => { const p = pos(a), q = pos(b); if (!p || !q || p.x == null || q.x == null) return 1; const d = Math.hypot(p.x - q.x, p.y - q.y), r = (O.jam && O.jam.near) || 4; return d <= r ? 1 : r / d; };
  B.touch = (o, rec, amt = 1) => R.remember(o, 'sound', rec, null, O.blend.rate * amt, O.blend.max);
  const learn = (o, h, k) => { if (!h || h.length < 2) return; const b0 = Math.floor(h[0].b / 4) * 4, rh = h.map(x => Math.round((x.b - b0) * 4) / 4), iv = h.slice(1).map((x, i) => x.d - h[i].d);
    R.remember(o, 'pattern', rh.join() + '|' + iv.join(), { rh, iv, len: h.length }, k, O.blend.max); R.prune(o, 'pattern', 6); };
  B.bar = () => { const c = O.blend; R.bar(); if (!c || !c.on) { B.n.clear(); B.to.clear(); B.hits.clear(); return; } const heard = [...B.n.keys()];
    for (const o of world.sources) { if (o.scale !== 'ohm') continue; const no = B.n.get(o) || 0;
      for (const s of heard) { if (s === o || s.recipe === o.recipe) continue; if (s.scale === 'voice' && O.sample && !O.sample.on) continue;
        const ns = B.n.get(s), tog = s.scale === 'voice' ? (B.to.get(s) === o ? Math.min(1, ns / 4) : 0) : Math.min(1, Math.sqrt(no * ns) / 4);
        if (tog <= 0) continue; const k = c.rate * tog * B.close(o, s);
        R.remember(o, 'sound', s.recipe, null, k, c.max);
        R.remember(o, s.scale === 'voice' || s === world.ohm ? 'player' : 'partner', s.scale === 'voice' || s === world.ohm ? 'you' : s.id, null, k, c.max);
        if (c.drift && c.drift.on && s.recipe != null) songAdd(o, s, tog);
        if (world.drums) world.drums.learn(o, s, tog * B.close(o, s));   // step 5: drummers grow a kit from drummers they play with (drums.js)
        if (world.arp) world.arp.learn(o, s, tog * B.close(o, s), B.hits.get(s));   // Q356: the arpeggio habit spreads the same way (arp.js)
        if (c.patterns) learn(o, B.hits.get(s), k); const st = B.streams.get(s); if (st) st.who.set(o, (st.who.get(o) || 0) + k); } }
    // R3.8 / V07 D: a bystander watching a jam learns its patterns (rhythm, steps) and its phrases without playing (bystand.js)
    if (world.watchers) for (const [o, w] of world.watchers()) for (const s of w.of || []) { if (s === o || !B.n.get(s)) continue; const k = c.rate * (w.k || .5) * Math.min(1, B.n.get(s) / 4) * B.close(o, s);
      if (k <= 0) continue; if (c.patterns) learn(o, B.hits.get(s), k); const st = B.streams.get(s); if (st) st.who.set(o, (st.who.get(o) || 0) + k); B.watched = (B.watched || 0) + 1; }
    if (c.drift && c.drift.on) songTick(c.drift);
    for (const [s, st] of B.streams) if (music.beat() - st.last > 8) B.endPhrase(s, st);
    for (const o of world.sources) if (o.brain) o.bond = bondOf(o);
    // v0.0.7 (Q46): how well its strongest learned bit fits the music right now (chord tones + on the beat) -> source brain.fit;
    // its share of borrowed material = base + matrix brain.learned rows (context), recomputed every bar
    const ch = (music.chord && music.chord.tones) || [0, 2, 4], sh = c.share;
    for (const o of world.sources) { if (o.scale !== 'ohm' || !o.brain) continue; const p = B.pattern(o, true);
      if (p) { let d = ch[0], f = ch.includes(((d % 7) + 7) % 7) ? 1 : 0; for (const x of p.iv) { d += x; if (ch.includes(((d % 7) + 7) % 7)) f++; } const on = p.rh.filter(r => Math.abs(r - Math.round(r)) < .01).length / p.rh.length;
        bus.ctl(o, 'brain.fit', Math.round((.6 * f / (p.iv.length + 1) + .4 * on) * 100) / 100); }
      if (sh && sh.ctx) o.learnedShare = Math.max(0, Math.min(1, (sh.base || 0) + ((o.brainMod && o.brainMod.learned) || 0))); }
    B.n.clear(); B.to.clear(); B.hits.clear(); };
  const sum = (o, kind) => { let t = 1; for (const e of R.list(o, kind)) t += e.strength; return t; };
  // bond = how much it has played with others (0..1), from its brain
  B.bond = o => o.bond || 0;   // cached once per bar (the matrix reads it every frame)
  const bondOf = o => { if (!o.brain) return 0; let t = 0; for (const e of R.list(o)) if (e.kind === 'partner' || e.kind === 'player') t += e.strength; return 1 - 1 / (1 + t); };
  B.share = (o, rec) => { if (!o.brain) return 0; const e = R.get(o, 'sound', rec); return e ? e.strength / sum(o, 'sound') : 0; };
  B.top = o => { if (!o.brain) return []; const t = sum(o, 'sound'), a = []; for (const e of R.list(o, 'sound')) if (recipes.get(e.key)) a.push({ rec: e.key, k: e.strength / t }); a.sort((x, y) => y.k - x.k); return a.slice(0, 2); };
  // strongest learned pattern + its share against the ohm's own style (weight 1); B.played(o) marks it used
  B.pattern = (o, raw) => { if (!o.brain || !O.blend.on || !O.blend.patterns) return null; const l = R.list(o, 'pattern'); if (!l.length) return null; let t = 1, best = l[0]; for (const e of l) { t += e.strength; if (e.strength > best.strength) best = e; }
    const sh = O.blend.share, share = !raw && sh && sh.ctx && o.learnedShare != null ? o.learnedShare : best.strength / t;
    return { rh: best.data.rh, iv: best.data.iv, share, entry: best }; };
  B.played = p => { if (p && p.entry) R.use(p.entry); };
  // v0.0.7: its strongest long part (repertoire first), decoded, or null
  B.phrase = o => { if (!o.brain || !O.blend.on || !O.brain.retain) return null; let best = null, bs = -1; for (const e of R.list(o, 'phrase')) { const sc = e.strength + (e.plays ? 4 : 0); if (sc > bs) { bs = sc; best = e; } } return best; };
  // v0.0.7 (Wilbow 34A/C/D, PROPOSAL opts.blend.voice): with partner absorbing OFF, an ohm still slowly takes on a LITTLE of your
  // voice's sound (up to voice.max, e.g. 15%), scaled by how much you have sung to it (its brain's 'sound' entry for your voice).
  B.learnFor = o => { const c = O.blend; if (!c || !c.on) return null; if (c.sound) { const t = B.top(o); return t.length ? t : null; }
    const v = c.voice, vr = world.sing && world.sing.voiceRec; if (!v || !v.on || !vr || !vr.sample || !o.brain) return null;
    const e = R.get(o, 'sound', vr.id); if (!e) return null; const k = v.max * Math.min(1, e.strength / (c.max || 4)); return k > .005 ? [{ rec: vr.id, k }] : null; };
  B.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar !== B.lastBar) { if (B.lastBar >= 0) B.bar(); B.lastBar = bar; } };
  // LEARNING DRIFT (Music Theory + Wilbow 10:52, default ON, opts.blend.drift). No random part: per SONG an ohm's own sound moves up to
  // step (2%) toward the instruments it jammed with, split by how long each played with it; total drift capped at cap (25%) rising smoothly (smoothstep) to capXp (50%) for
  // very experienced ohms (xpSongs songs). A song = a run of bars playing with others, ended by gapBars without, or every songBars bars.
  // Stored in its brain as 'drift' entries (keep: never fade, saved with the ohm); read per note from a cached list (driftFor).
  const SONG = new Map(), ikey = i => i.a + '|' + i.b + '|' + (+i.w || 0).toFixed(2);
  const songAdd = (o, s, tog) => { const R0 = recipes.get(s.recipe), own = recipes.get(o.recipe); if (!R0 || !R0.inst || !own || !own.inst) return; const k = ikey(R0.inst); if (k === ikey(own.inst)) return;
    let g = SONG.get(o); if (!g) SONG.set(o, g = { bars: 0, gap: 0, m: new Map() }); const e = g.m.get(k) || { inst: R0.inst, t: 0 }; e.t += tog; g.m.set(k, e); g.hit = 1; };
  const songTick = d => { for (const [o, g] of SONG) { if (g.hit) { g.bars++; g.gap = 0; } else g.gap++; g.hit = 0; if (g.gap >= (d.gapBars || 8) || g.bars >= (d.songBars || 32)) { songEnd(o, g, d); SONG.delete(o); } } };
  const songEnd = (o, g, d) => { if (!g.bars || !g.m.size) return; const xp = R.remember(o, 'xp', 'songs', null, 1, 1e9); xp.keep = 1; const c0 = d.cap != null ? d.cap : .25, c1 = d.capXp != null ? d.capXp : .5, u = Math.min(1, Math.max(0, (xp.strength - 1) / Math.max(1, (d.xpSongs || 40) - 1))), cap = c0 + (c1 - c0) * u * u * (3 - 2 * u);   // MT: 25% -> 50% smoothly by xpSongs songs, no step
    let cur = 0; for (const e of R.list(o, 'drift')) cur += e.strength; const room = Math.max(0, cap - cur); if (room <= 0) return;
    let st = 0; for (const e of g.m.values()) st += e.t; const step = Math.min(room, d.step || .02) / Math.max(g.bars, st); for (const [k, e] of g.m) { const add = step * e.t; if (add <= 0) continue; const de = R.remember(o, 'drift', k, { inst: e.inst }, add, cap); de.keep = 1; }
    o.driftL = null; };   // rebuilt on the next note
  B.songEnd = (o, d) => { const g = SONG.get(o); if (g) { songEnd(o, g, d || O.blend.drift || {}); SONG.delete(o); } };   // tests / a jam that stops
  if (bus && bus.on) bus.on('song.end', ev => { const d = O.blend && O.blend.drift; if (!d || !d.on || !ev.group) return; for (const m of ev.group.members || []) B.songEnd(m); });   // a real song ending (songs.js) closes the drift tally too
  B.driftFor = o => { const d = O.blend && O.blend.drift; if (!d || !d.on || !o.brain) return null; if (o.driftL == null || o.driftB !== o.brain) { o.driftB = o.brain; const l = R.list(o, 'drift').filter(e => e.data && e.data.inst && e.strength > .001).map(e => ({ inst: e.data.inst, k: e.strength, cap: d.capXp || .5 })); o.driftL = l.length ? l : 0; } return o.driftL || null; };
  B.reset = () => R.forget();
  return B;
}
