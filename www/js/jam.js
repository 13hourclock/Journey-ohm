// v0.0.4 JAM (B): two ohms trading phrases on the shared clock. No new engine: the partner is an ordinary source
// (same recipe / body / matrix rows / FX chain), it LISTENS through note events on the bus and ANSWERS with note events
// scheduled on the beat grid. Anything that posts notes (a player, another ohm, later a voice or a sample) can be listened to.
// Tension defaults (PROPOSALS 2:01 AM, see PLAN_SOUND_PLAYGROUND.md):
//  - its sound is a context blend of its own gene sound and what it has heard (blend.js; v0.0.6, Wilbow 9D)
//  - no random drift: every choice is a pure function of what it heard (phrase count, notes); nothing changes on its own
// Music (for example; Music Theory's MUSIC_GOOD.md will refine): call and response, answers keep the caller's rhythm, use
// fewer notes, stay in the moving harmony (the chord sounding now, opts.jam.inTune) and on the beat (opts.jam.inTime).
import { makeRecipe, recipes, octaveOf } from './recipe.js';
const nearestTone = (d, tones) => { let best = d, bd = 9; for (let o = -7; o <= 7; o += 7) for (const c of tones) { const t = Math.floor(d / 7) * 7 + c + o, e = Math.abs(t - d); if (e < bd || (e === bd && t < best)) { bd = e; best = t; } } return best; };
export function createJam(world, bus, music) {
  const O = world.opts, J = { partner: null, heard: [], lastB: -1, answers: 0, k: 0, counts: new Float32Array(7), queued: 0 };
  const rec = makeRecipe(world.ohm ? world.ohm.seed * 7 + 13 : 4242, { name: 'jam partner' });
  J.partner = world.add({ id: 2, scale: 'ohm', recipe: rec.id, hue: rec.hue, seed: rec.seed, place: { x: 0, y: 3 }, screen: false, nodeGlow: new Float32Array(7) });
  // NEAR (PROPOSAL 2:09): two ohms jam only when within O.jam.near ohm radii; the player can nudge them together (OHMS track moves
  // `place`; the player's ohm sits at place {0,0} unless it has one)
  const dist = (a, b) => { const p = a.place || { x: 0, y: 0 }, q = b.place || { x: 0, y: 0 }; return Math.hypot(p.x - q.x, p.y - q.y); };
  const near = src => dist(src, J.partner) <= (O.jam.near || 4);
  const on = () => O.jam && O.jam.on;
  // a jam is RUNNING (taps snap to the grid, decided 1:16 AM) from the partner's first answer until 4 bars after the last
  // phrase; before that and after it taps sound instantly (PROPOSAL)
  J.until = -1; const sync = () => { music.jam = on() && music.beat() < J.until ? { div: music.tradDiv || O.jam.div || 4, snap: J.snapK() } : null; };
  // v0.0.7 snap strength from context (24D, PROPOSAL opts.jam.snap 'context' | 'hard' | 'free'): your ohm's genes (tight vs loose feel),
  // the tradition's feel (music.feel when traditions exist, else the ohm's own swing), and how dense the jam is right now
  J.snapK = () => { const m = O.jam.snap || 'context'; if (m === 'hard') return 1; if (m === 'free') return 0; const o = world.ohm, rec = o && recipes.get(o.recipe); if (!rec) return 1;
    const st = style(rec), feel0 = music.feel != null ? music.feel : 1 - 2 * st.swing, feel = music.tradFeel != null ? (feel0 + music.tradFeel) / 2 : feel0, b = music.beat(); let n = 0; for (const x of bus.recent || []) if (x > b - 4) n++;
    return Math.max(0, Math.min(1, .5 * st.tight + .25 * feel + .25 * Math.min(1, n / 16))); };
  // listen: every note any OTHER ohm-scale source plays (taps, nodes) is heard in beat time
  bus.on('note', ev => { const voice = ev.src.scale === 'voice';
    if (ev.jam || (voice ? !(O.sing && O.sing.on) : (!on() || ev.src === J.partner || ev.src.scale !== 'ohm' || !near(ev.src)))) return;
    if (ev.kind !== 'strike' && ev.kind !== 'note') return;
    if (!voice && J.from && J.from.scale === 'voice' && J.heard.length) J.heard.length = 0;   // a new caller starts a new phrase
    const raw = ev.deg == null ? 0 : ev.deg, d = ((raw % 7) + 7) % 7; J.heard.push(voice ? { b: ev.sungB != null ? ev.sungB : ev.beat, d: raw, ev } : { b: ev.beat, d }); J.to = voice ? ev.to : null; if (J.heard.length > (voice ? 64 : 8)) J.heard.shift(); /* v0.0.7 (31): no 8-note cap for your voice */ J.lastB = ev.beat; J.from = ev.src; J.fromOct = ev.oct || 0;
    J.counts[d] += 1; });
  // NO ROLES (Wilbow 2:22 'lead is a freeze', 2:23 '5A 5B 5C 5D' both/and): an ohm just plays back at what it hears (A). What it
  // plays comes from WHAT IT IS (C): its recipe seed/genes set its density, register, rhythm feel and favourite variation, and what
  // it has learned (heard degrees, heard phrase lengths) leans those. A 'part' only EMERGES from the moment (B): crowded register ->
  // it moves an octave away; a busy caller -> it plays sparser, a sparse one -> fuller. Nothing is stored as a role. The mix (D) is
  // sound.js. In tune / in time with the moving harmony + beat (Q4 open): opts.jam.inTune / inTime, both default on (PROPOSAL).
  const style = r => { let s = (r.seed * 2654435761) >>> 0; const u = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const o = { dens: 2 + Math.floor(u() * 5), swing: u() * .5, vary: Math.floor(u() * 3), reach: u() < .5 ? 1 : 2 }; o.tight = u(); return o; };   // tight: v0.0.7 gene, tight vs loose feel
  J.heardLen = 4;
  J.tick = () => { sync(); loopTick(); const tf = O.tempo ? O.tempo.follow : 'context'; music.followDefault = tf === 'all' ? 1 : 0;
    if (J.partner) music.setFollow(J.partner, tf === 'none' ? 0 : tf === 'all' || J.until > music.beat() ? 1 : 0);   // jamming with you -> follows your taps
    if (J.to) music.setFollow(J.to, tf === 'none' ? 0 : 1); if (world.ohm) music.setFollow(world.ohm, 1); if (!J.heard.length || (!on() && !(J.from && J.from.scale === 'voice'))) return; const t = music.now(), b = music.beat(t);
    if (b - J.lastB < 1) return;                                          // the caller rests one beat = the phrase is over
    if (J.from && J.from.scale === 'voice' && J.to) return imitate(J.heard.splice(0), b);
    const ph = J.heard.splice(0), b0 = ph[0].b, chord = (music.chord && music.chord.tones) || [0, 2, 4];
    if (world.dictated && world.dictated(J.partner)) return;   // systems: its painted notes (river) play in place of an answer
    const own = recipes.get(J.partner.recipe), src = J.from && recipes.get(J.from.recipe), st = style(own), inT = O.jam.inTime !== false, inK = O.jam.inTune !== false;
    let start = inT ? Math.ceil(b / 4) * 4 : Math.ceil(b * 2) / 2; if (inT && start - b < .5) start += 4;   // in time: next bar line; loose: next half beat
    J.k = world.blend ? world.blend.bond(J.partner) : 0;   // how much it has played with others lately (context, blend.js)
    J.heardLen += (ph.length - J.heardLen) * J.k;                          // learned: leans toward the phrase lengths it hears
    const want = Math.round(st.dens * (music.trad && music.trad.dens || 1) * (1 - J.k) + J.heardLen * J.k), busy = ph.length >= 5 ? -1 : ph.length <= 2 ? 1 : 0;   // emergent: sparser vs a busy caller
    const cap = Math.max(1, Math.min(6, want + busy)), n = Math.min(cap, ph.length), pick = n === ph.length ? ph : ph.filter((_, i) => i === 0 || i === ph.length - 1 || i % 2 === 0).slice(0, cap);
    const callReg = ph.reduce((a, p) => a + p.d, 0) / ph.length + 7 * (J.fromOct || 0), myOct = octaveOf(own), oct = Math.abs(myOct * 7 - callReg) < 4 ? myOct + (myOct * 7 >= callReg ? 1 : -1) : myOct;   // crowded -> move away
    const ans = J.answers++ + st.vary;
    // learning of the SOUND is the context blend (blend.js): no per-exchange step, no cap, no fixed solo rate
    const dw = music.trad && music.trad.degW, m7 = x => ((x % 7) + 7) % 7, fw = c => dw ? (J.counts[m7(c)] + 1) * dw[m7(c)] : J.counts[m7(c)];   // traditions: focus / pathet degree weights (weights, never limits)
    const fav = chord.reduce((a, c) => fw(c) > fw(a) ? c : a, chord[0]);   // the chord tone it has heard most
    // LEARNED PATTERN (blend.js): the stronger a pattern it picked up, the more answers take its rhythm + melodic steps (deterministic share)
    const lp = world.blend && world.blend.pattern(J.partner), useP = lp && ((J.answers * lp.share) % 1) < lp.share;
    const seq = useP ? lp.rh.slice(0, 6).map((r, i) => ({ b: b0 + r, d: pick[0].d + lp.iv.slice(0, i).reduce((a, x) => a + x, 0) })) : pick; J.usedPattern = !!useP; if (useP) world.blend.played(lp);
    const outN = [];
    seq.forEach((p, i) => { const last = i === seq.length - 1;
      let d = useP ? p.d : ans % 3 === 0 ? p.d + 2 : ans % 3 === 1 ? (2 * pick[0].d - p.d) : p.d;   // learned pattern / echo up a third / mirror / plain echo
      if (inK && i === 0 && !last) d = nearestTone(d, chord);             // strong beat -> a note of the chord sounding now (MUSIC_GOOD #2)
      if (inK && last) d = nearestTone(ans % 2 ? fav : chord[0], chord);
      if (dw && inK && i > 0 && !last) { const w = dw[m7(d)]; if (w < 1 && ((ans * 7 + i * 3) % 10) / 10 < (1 - w) * .7) d += dw[m7(d + 1)] >= dw[m7(d - 1)] ? 1 : -1; }   // a weak degree (pathet) leans to its stronger neighbour, often but not always  // resolve into the CURRENT chord (its root, or the tone it has heard most)
      d = Math.max(-7, Math.min(13, d));
      const rel = (p.b - b0), qb = start + Math.min(3.5, inT ? Math.round(rel * 2) / 2 + (Math.round(rel * 2) % 2 ? st.swing * .17 : 0) : rel);   // its own swing feel
      outN.push({ b: qb, deg: d, oct, last }); });
    // Q350 a (room.js): leave room for the others in rhythm + pitch (its own octave move above stays; register: false here)
    const R = world.room, fitN = R && R.opts.on ? R.fit(J.partner.id, outN, chord, { register: false }) : outN;
    for (const x of fitN) bus.note({ src: J.partner, kind: 'note', jam: 1, deg: x.deg, oct: x.oct, vel: x.last ? .62 : .5, pos: .3, dur: x.last ? 1.4 : .9, pan: .35, t: music.timeOfBeat(x.b), learn: null });
    J.queued += fitN.length; J.until = start + 4 + 16; };
  // SINGING BACK (v0.0.7, Wilbow 31, 32A/C/D, 33A/C/D, 51A/C/E, 34; context shaping = PROPOSALS, opts.sing toggles).
  // The ohm you sang to loops your phrase (opts.sing.loops times), every note at the time offset you sang it (no grid, no note cap),
  // with your slides / bends (J.bendFor -> sound.js pitch bend). Loop 1 starts near YOUR pitch with your melodic shape; each loop it
  // drifts toward its own range (diatonic steps, shape kept). Context = how busy it is around (notes in the last 4 beats):
  // alone with you -> slow drift, busy jam -> fast. Fitting (51A): each note is placed when it plays, against the chord sounding THEN
  // (so chord and key changes are followed; key changes land on bars): long and on-beat notes land on chord tones, the rest stay on
  // the scale; in a busy jam all notes go to chord tones. Form (51C/E): some loops ANSWER instead of echo (first half copies, second
  // half resolves home) - context picks (busy -> every other loop answers). Your voice as a sample (34C/D): the first loops carry
  // some of your recorded voice, fading as it drifts to its own sound. opts.sing.mode 'answer' still uses the jam's answer rules.
  J.loops = []; J.bends = new Map();
  const busyK = () => { const b = music.beat(); let n = 0; for (const x of bus.recent || []) if (x > b - 4) n++; return Math.min(1, n / 16); };
  const ctxOr = (v, ctx) => v === 'context' || v == null ? ctx : v;
  const imitate = (ph, b) => { const to = J.to, own = recipes.get(to.recipe); if (!own) return;
    if (O.sing.mode === 'answer') { const keep = J.partner; J.partner = to; J.heard = ph.map(p => ({ b: p.b, d: ((p.d % 7) + 7) % 7 })); J.from = null; J.lastB = -9; J.tick(); J.partner = keep; return; }
    const b0 = ph[0].b, lastP = ph[ph.length - 1], span = lastP.b - b0 + Math.max(.25, (lastP.ev && lastP.ev.len) || .5), L = Math.max(4, Math.ceil(span / 4) * 4);
    const start = O.sing.when === 'bar' ? Math.ceil(b / 4 + .01) * 4 : Math.ceil(b + .01), busy = busyK();
    const sh = 7 * Math.floor(ph[0].d / 7), T = 7 * octaveOf(own) - sh;   // the old one-shot placement = where the drift ends
    const dr = ctxOr(O.sing.drift, .2 + .6 * busy);
    for (const x of J.loops) if (x.to === to) x.n = 0;                   // a new phrase replaces this ohm's loop
    J.loops.push({ to, own, ph, b0, start, L, i: 0, j: 0, n: O.sing.loops || 4, T, dr, busy });
    J.imitations = (J.imitations || 0) + 1; J.from = null; };
  const voiceRec = () => world.sing && world.sing.voiceRec && world.sing.voiceRec.sample ? world.sing.voiceRec : null;
  const loopTick = () => { if (!J.loops.length) return; const b = music.beat(), chord = (music.chord && music.chord.tones) || [0, 2, 4];
    for (const x of J.loops) { if (world.dictated && world.dictated(x.to)) { x.i = x.n; continue; } while (x.i < x.n) { const p = x.ph[x.j], rel = p.b - x.b0, tb = x.start + x.i * x.L + rel; if (tb > b + .25) break;
        const f = Math.min(1, x.i * x.dr), n = x.ph.length, len = (p.ev && p.ev.len) || .5, last = x.j === n - 1;
        let d = p.d + Math.round(x.T * f);
        const form = ctxOr(O.sing.form, x.busy > .3 && x.i % 2 ? 'answer' : 'echo');
        if (form === 'answer' && n > 1 && x.j >= Math.ceil(n / 2)) { const h = Math.ceil(n / 2), H = 7 * Math.round((p.d + Math.round(x.T * f)) / 7), u = (x.j - h + 1) / (n - h); d = Math.round(d + (H - d) * u); }
        const fit = ctxOr(O.sing.fit, x.busy > .6 ? 'chord' : 'mixed'), onBeat = Math.abs(rel - Math.round(rel)) < .08;
        if (fit === 'chord' || (fit === 'mixed' && (len >= .75 || onBeat || last))) d = nearestTone(d, chord);
        const vk = O.sing.voiceSample === 'off' ? 0 : ctxOr(O.sing.voiceSample, .6 * (1 - f)), vr = vk > 0 ? voiceRec() : null;
        const bk = ctxOr(O.sing.bends, 1 - .5 * x.busy);
        if (bk > 0 && p.ev && p.ev.bend && p.ev.bend.length > 1) J.bends.set(x.to.id, { t0: tb, len, tr: p.ev.bend, k: bk });
        bus.note({ src: x.to, kind: 'note', jam: 1, imit: 1, deg: d, oct: 0, vel: p.ev ? Math.max(.35, Math.min(.75, p.ev.vel)) : .52, pos: .3, dur: Math.max(.3, len * music.spb() * 1.2), t: music.timeOfBeat(tb), learn: vr ? [{ rec: vr.id, k: vk }] : null });
        if (++x.j >= n) { x.j = 0; x.i++; } } }
    J.loops = J.loops.filter(x => x.i < x.n); };
  // pitch bend ratio for an ohm singing your phrase back right now (sound.js multiplies the matrix bend with it)
  J.bendFor = o => { const e = J.bends.get(o.id); if (!e) return 1; const u = music.beat() - e.t0; if (u < 0) return 1; if (u > e.len + .1) { J.bends.delete(o.id); return 1; }
    let c = 0; for (const [t, v] of e.tr) { if (t > u) break; c = v; } return Math.pow(2, Math.max(-200, Math.min(200, c)) * e.k / 1200); };
  J.reset = () => { J.loops = []; J.bends.clear(); J.until = -1; J.heardLen = 4; J.heard.length = 0; J.answers = 0; J.k = 0; J.counts.fill(0); };
  return J;
}
