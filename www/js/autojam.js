// v0.0.7 OHMS JAM WITHOUT YOU (Wilbow 2:53 '27C 27D', PROPOSAL opts.autojam). Two ohms near each other (not your ohm, not the one jamming
// with you) trade short phrases on the bar grid: one bar each, the answer echoing / mirroring the last phrase (or a learned pattern
// from its brain), always on chord tones of the moving harmony. Context, never random.
// PRESENCE per jam (0..1) = closeness to you (your focus ohm / the view) x the pair's genes (sociable vs shy) x the place (the world
// track's world.healAt / world.harmonyAt(x, y) when it exists, else 1). Presence scales how many notes (density), how many voices
// (below .5 a light voice: the body only, no synth layer) and how loud. Very low presence: one soft held drone note; lower still: the
// jam rests, the ohms fall asleep and cost no DSP. At most opts.autojam.max jams run (highest presence first).
import { recipes, octaveOf } from './recipe.js';
export function createAutoJam(world, bus, music) {
  const O = world.opts, A = { jams: [], lastBar: -1, ms: 0, drones: new Map(), mem: new Map(), pbar: new Map() };
  const gene = (o, salt) => { let s = ((o.seed || o.id) * 2246822519 + salt * 3266489917) >>> 0; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const pos = o => o.body || o.place || { x: 0, y: 0 };
  A.presence = (a, b) => { const c = O.autojam, p = pos(a), q = pos(b), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, f = world.ohm ? pos(world.ohm) : null, cam = world.cam;
    let d = f ? Math.hypot(mx - f.x, my - f.y) : 0; if (cam && cam.x != null) d = Math.min(d, Math.hypot(mx - cam.x, my - cam.y));
    const dk = d <= c.reach ? 1 : c.reach / d, gk = .4 + .6 * (gene(a, 7) + gene(b, 7)) / 2, pf = world.healAt || world.harmonyAt, pk = pf ? Math.max(0, Math.min(1, pf(mx, my))) : 1;
    return dk * gk * pk; };
  // Q350 a (room.js): a turn's notes leave room for the others (thinned / moved, never muted) before they are posted
  const emit = (turn, notes, P, chord) => { if (world.jamRoles) { notes = world.jamRoles.shapeTurn(P, turn, notes, chord); world.jamRoles.heardTurn(P, turn, notes); }   // jam roles (jamroles.js): front / follower / stepped back
    if (world.arp && world.arp.opts.on) notes = world.arp.shape(turn, notes, chord);   // Q356: an arpeggiator plays its turn as a broken chord (arp.js)
    const R = world.room, fit = R && R.opts.on ? R.fit(turn.id, notes, chord) : notes;
    for (const x of fit) bus.note({ src: turn, kind: 'note', deg: x.deg, oct: x.oct, vel: x.vel, arp: x.arp, t: music.timeOfBeat(x.b), beat: x.b, gainK: .4 + .6 * P.k, lite: P.k < .5 ? 1 : 0, auto: 1, jam: 1 }); };
  const stopDrone = o => { if (A.drones.has(o.id)) { bus.note({ src: o, kind: 'release' }); A.drones.delete(o.id); } };
  A.bar = () => { const c = O.autojam; if (!c || !c.on) { for (const id of [...A.drones.keys()]) { const o = world.byId && world.byId.get(id); if (o) stopDrone(o); } A.jams = []; return; }
    const t0 = performance.now(), J = world.jam, busy = new Set([world.ohm]); if (J && J.partner && J.until > music.beat()) busy.add(J.partner);
    const pairs = [], used = new Set(busy);
    // nearest-to-you first, stop after 2 x max candidate pairs or past the rest distance: cost stays flat with many ohms
    const f = world.ohm ? pos(world.ohm) : { x: 0, y: 0 }, far = c.reach / Math.max(.01, c.sleepK), cand = [];
    for (const o of world.ohms || []) { const p = pos(o), d = Math.hypot(p.x - f.x, p.y - f.y); if (d < far) cand.push([d, o]); }
    cand.sort((x, y) => x[0] - y[0]);
    for (const [, o] of cand) { if (pairs.length >= 2 * c.max) break; if (used.has(o) || o.parked || (world.held && world.held(o)) || (world.watching && world.watching(o))) continue; const nb = world.neighbors ? world.neighbors(o, c.near) : []; const p = nb.find(x => !used.has(x) && !(world.held && world.held(x)) && !(world.watching && world.watching(x)));   /* R3.8: a bystander watches quietly (bystand.js) */ if (!p) continue; used.add(o); used.add(p); pairs.push({ a: o, b: p, k: A.presence(o, p) }); }
    pairs.sort((x, y) => y.k - x.k); const bar = Math.floor(music.beat() / 4), b0 = (bar + 1) * 4, chord = (music.chord && music.chord.tones) || [0, 2, 4], live = new Set();
    for (let i = 0; i < pairs.length; i++) { const P = pairs[i]; if (i >= c.max || P.k < c.sleepK) continue;
      const turn = bar % 2 ? P.a : P.b, other = turn === P.a ? P.b : P.a, rec = recipes.get(turn.recipe); if (!rec) continue; live.add(turn.id); live.add(other.id);
      if (P.k < c.droneK) { if (!A.drones.has(P.a.id)) { bus.note({ src: P.a, kind: 'sustain', deg: chord[0], oct: octaveOf(rec) - 1, vel: .3, sustain: 36000, gainK: .5 * P.k / c.droneK, auto: 1, jam: 1, lite: 1 }); A.drones.set(P.a.id, 1); } else if (world.wake) world.wake(P.a); stopDrone(P.b); continue; }
      stopDrone(P.a); stopDrone(P.b);
      // phrase: a learned pattern from its brain, else the reverse of the last phrase it heard in this jam, else up the chord
      const key = Math.min(P.a.id, P.b.id) + '-' + Math.max(P.a.id, P.b.id), last = A.mem.get(key), lp0 = world.blend && world.blend.pattern(turn), steps = [];
      const dn = world.dictated && world.dictated(turn, bar + 1); if (dn) { A.mem.set(key, dn); continue; }
      const gw = world.jamGrow && world.jamGrow.turn(P, turn, bar + 1, chord, octaveOf(rec)); if (gw) { emit(turn, gw, P, chord); A.mem.set(key, gw.map(x => x.deg - chord[0])); continue; }   // a watched jam's grown loop (jamgrow.js)   // systems: painted notes (river) play instead; the partner answers them
      // v0.0.7 (Q46): mostly its own style; learned material by its context share (deterministic per turn), else one learned accent at the end
      const tn = Math.floor(bar / 2), useP = !!lp0 && ((tn * lp0.share) % 1) < lp0.share, lp = useP ? lp0 : null, acc = !useP && lp0 ? lp0.iv.reduce((s2, x) => s2 + x, 0) : null;
      if (useP) world.blend.played(lp0);
      const ph = useP && world.blend.phrase ? world.blend.phrase(turn) : null;   // a long part it knows (opts.brain.retain): play its next bar
      if (ph) { const R = world.brain, all = R.phraseNotes(ph), nb = ph.data.bars || 1, bi = (A.pbar.get(turn.id) || 0) % nb; A.pbar.set(turn.id, bi + 1); if (bi === 0) R.use(ph);
        const ns = all.filter(x => x.b >= bi * 4 && x.b < bi * 4 + 4), keep = Math.max(1, Math.round(ns.length * Math.min(1, P.k * 1.5)));
        emit(turn, ns.slice(0, keep).map(x => ({ b: b0 + (x.b - bi * 4), deg: x.d, oct: octaveOf(rec) + (x.oct || 0), vel: (.25 + .45 * P.k) * (.5 + x.vel * .5) })), P, chord);
        A.mem.set(key, ns.map(x => x.d)); continue; }
      // V08 P7 melody lean (shapeplay.js): a drawn shape played steadily nearby lends its line, at most 1 phrase in 3, in this jam's key and register
      const bor = !useP && world.shapeLean ? world.shapeLean(P, turn, tn) : null;
      if (bor) { const nn = Math.max(2, Math.min(bor.length + 1, Math.round((2 + 4 * gene(turn, 3)) * Math.max(.5, P.k)))); let d = chord[0]; const ob = [];
        for (let j = 0; j < nn; j++) { if (j) d = Math.max(chord[0] - 7, Math.min(chord[0] + 9, d + bor[(j - 1) % bor.length])); ob.push({ b: b0 + Math.round(j * 4 / nn * 4) / 4, deg: d, oct: octaveOf(rec), vel: .25 + .45 * P.k }); }
        emit(turn, ob, P, chord); A.mem.set(key, ob.map(x => x.deg - chord[0])); A.borrowed = (A.borrowed || 0) + 1; continue; }
      const n = Math.max(1, Math.round((2 + 4 * gene(turn, 3)) * P.k));
      const out = []; for (let j = 0; j < n; j++) { const rh = lp ? lp.rh[j % lp.rh.length] : (j * 4 / n), step = lp ? lp.iv.slice(0, j).reduce((s, x) => s + x, 0) : last ? last[(last.length - 1 - j % last.length)] : j; steps.push(step);
        const st2 = acc != null && j === n - 1 && n > 1 ? acc : step, deg = chord[((st2 % 3) + 3) % 3], b = b0 + Math.min(3.75, Math.round(rh * 4) / 4);
        out.push({ b, deg, oct: octaveOf(rec), vel: .25 + .45 * P.k }); }
      emit(turn, out, P, chord); A.mem.set(key, steps); }
    for (const id of [...A.drones.keys()]) if (!live.has(id)) { const o = world.byId && world.byId.get(id); if (o) stopDrone(o); else A.drones.delete(id); }
    A.jams = pairs; A.ms = A.ms * .8 + (performance.now() - t0) * .2; };
  A.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar !== A.lastBar) { A.lastBar = bar; A.bar(); } };
  return A;
}
