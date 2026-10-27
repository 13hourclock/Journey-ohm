// JAM ROLES: WHO IS OUT FRONT AND WHO FOLLOWS (old game R3.24 "Roles never stop ohms harmonising (they play together) but ohms can step
// back and listen to keep balance", Wilbow t144 "Add all, but, Roles shouldn't keep creatures from harmonizing. They are playing
// together. But they do need to be able to also step back and listen to help keep balance"; old NOTES S3 "ensemble parts rotate,
// leadership tires and hands over"; V07 E "a leader passing the lead"; Wilbow 2:22 AM Oct 25 "Lead is a freeze" = no FIXED or built-in
// leader). So nobody owns the front: in every jam (an autojam pair, a song group) one member is OUT FRONT for a while and the others
// follow; whoever is out front TIRES bar by bar and HANDS OVER on a phrase line to the freshest, most eager member (eager = its bold +
// social personality, its experience and what it has learned to say; never the same one twice in a row when another is fresh).
//   front:    plays its calls whole (+ a little louder); in a song it carries the hook and the melody bars
//   follower: answers thinner and a little softer, taking the front's last rhythm (it follows), still on chord tones (harmonising)
//   step back (balance): in a crowded jam (crowd+ members, or a pair with other jams close by) the most tired follower steps back for a
//             phrase: it LISTENS (eyes on the front) and only holds one soft chord tone a bar (it never stops harmonising)
// Hand-overs post 'jam.front' { key, from, to, x, y } (look / sound can react). Switch 'jamRoles' (ON); off = v0.0.28 (fixed by genes).
import { recipes, octaveOf } from './recipe.js';
export const JAMROLE_OPTS = { on: true, phrase: 4, tire: .09, recover: .06, handAt: .7, maxStint: 16, crowd: 3, near: 6, stepBack: true, backBars: 4,
  frontVel: 1.12, followVel: .82, followKeep: .65, holdVel: .3 };
const u01 = (...a) => { let h = 2166136261; for (const x of a) { h ^= (x | 0) >>> 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return (h >>> 0) / 4294967296; };
export function createJamRoles({ sim, bus, music, autojam, songs, opts = {} }) {
  const O = { ...JAMROLE_OPTS, ...opts }, J = { opts: O, g: new Map(), hand: 0, backs: 0, lastBar: -1, ms: 0 };
  const geneK = o => u01(o.seed || o.id, 3);   // songs.js's own melody gene: the first front is who played the melody before (no change at the start)
  const eager = o => { const p = o.personality; return .45 * geneK(o) + (p ? .2 * p.bold + .15 * p.social : .175) + .1 * Math.min(1, (o.xp || 0) / 40) + .1 * Math.min(1, ((sim.blend && sim.blend.pattern && sim.blend.pattern(o, true)) || { share: 0 }).share * 2); };
  const st = (key, members) => { let s = J.g.get(key); if (!s) { const f = members.slice().sort((a, b) => geneK(b) - geneK(a))[0]; J.g.set(key, s = { key, front: f ? f.id : null, since: J.lastBar, fat: new Map(), back: null, backTo: -1, prev: null, seen: J.lastBar }); } s.seen = J.lastBar; return s; };
  const groups = () => { const out = [], aj = sim.opts && sim.opts.autojam;
    if (autojam) for (const P of autojam.jams || []) { if (aj && P.k < aj.sleepK) continue; if (songs && songs.groupOf && (songs.groupOf(P.a) || songs.groupOf(P.b))) continue; out.push({ key: 'p' + Math.min(P.a.id, P.b.id) + '-' + Math.max(P.a.id, P.b.id), members: [P.a, P.b], P }); }
    if (songs) for (const G of songs.groups) if (G.members.length >= 2) out.push({ key: 'g' + G.id, members: G.members, G });
    return out; };
  const cen = ms => { let x = 0, y = 0, n = 0; for (const m of ms) if (m.body) { x += m.body.x; y += m.body.y; n++; } return n ? { x: x / n, y: y / n } : { x: 0, y: 0 }; };
  // once a bar: the front tires, the others rest; on a phrase line a tired (or long) front hands over; crowded jams send one follower back
  J.bar = bar => { if (!O.on) { for (const s of J.g.values()) if (s.back) unback(s); J.g.clear(); return; } const t0 = performance.now(); const all = groups();
    for (const X of all) { const s = st(X.key, X.members), ids = new Set(X.members.map(m => m.id)); if (!ids.has(s.front)) { s.front = X.members.slice().sort((a, b) => eager(b) - eager(a))[0].id; s.since = bar; }
      for (const m of X.members) { const f = s.fat.get(m.id) || 0; s.fat.set(m.id, Math.max(0, Math.min(1, m.id === s.front ? f + O.tire : f - O.recover))); }
      const stint = bar - s.since;
      if (bar % O.phrase === 0 && stint >= O.phrase && ((s.fat.get(s.front) || 0) >= O.handAt || stint >= O.maxStint)) {
        let best = null, bs = -1; for (const m of X.members) { if (m.id === s.front) continue; const sc = eager(m) * (1 - (s.fat.get(m.id) || 0)) * (m.id === s.prev ? .7 : 1); if (sc > bs) { bs = sc; best = m; } }
        if (best) { const from = s.front; s.prev = from; s.front = best.id; s.since = bar; J.hand++; const c = cen(X.members); if (X.G) X.G.cache = null; if (bus && bus.post) bus.post({ type: 'jam.front', key: X.key, from, to: best.id, x: c.x, y: c.y }); } }
      // balance: step back and listen
      if (s.back && bar >= s.backTo) unback(s);
      if (O.stepBack && !s.back && bar % O.phrase === 0) { const crowd = X.members.length >= O.crowd || (X.P && othersNear(X, all) >= 2);
        if (crowd) { const fr = X.members.find(m => m.id === s.front), low = lowest(X.members); let tired = null, tf = -1; for (const m of X.members) { if (m.id === s.front || (X.members.length >= 3 && m === low)) continue; const f = s.fat.get(m.id) || 0; const sc = f + .3 * (1 - eager(m)); if (sc > tf) { tf = sc; tired = m; } }
          if (tired && fr && fr.body) { s.back = tired; s.backTo = bar + O.backBars; tired.watch = { x: fr.body.x, y: fr.body.y, listen: 1 }; tired._jrBack = 1; J.backs++; } } } }
    for (const [k, s] of J.g) if (s.seen < bar - 8) { if (s.back) unback(s); J.g.delete(k); }
    J.ms = J.ms * .8 + (performance.now() - t0) * .2; };
  const unback = s => { const o = s.back; if (o && o._jrBack) { delete o._jrBack; if (o.watch && o.watch.listen) delete o.watch; } s.back = null; };
  const oc = m => { const r = recipes.get(m.recipe); return r ? octaveOf(r) : 0; }, lowest = ms => { let b = null; for (const m of ms) if (!b || oc(m) < oc(b) || (oc(m) === oc(b) && m.seed < b.seed)) b = m; return b; };   // songs.js's anchor (lowest register)
  const othersNear = (X, all) => { const c = cen(X.members); let n = 0; for (const Y of all) if (Y !== X) { const d = cen(Y.members); if (Math.hypot(d.x - c.x, d.y - c.y) < O.near) n++; } return n; };
  J.keyOfPair = (a, b) => 'p' + Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
  J.frontOf = key => { const s = J.g.get(key); return s ? s.front : null; };
  J.isBack = o => !!(O.on && o && o._jrBack);
  // autojam hook (autojam.js emit): shape one turn's notes by the turn's role
  J.shapeTurn = (P, turn, notes, chord) => { if (!O.on || !notes || !notes.length) return notes; const s = J.g.get(J.keyOfPair(P.a, P.b)); if (!s) return notes;
    if (s.back === turn) return [{ b: notes[0].b - (notes[0].b % 4), deg: chord[0], oct: notes[0].oct, vel: O.holdVel, hold: 1 }];   // stepped back: one soft chord tone (still harmonising)
    if (turn.id === s.front) return notes.map(n => ({ ...n, vel: Math.min(1, n.vel * O.frontVel) }));
    const keep = Math.max(1, Math.round(notes.length * O.followKeep)), fr = s.lastFront; const out = notes.slice(0, keep).map((n, i) => ({ ...n, vel: n.vel * O.followVel, b: fr && fr[i] != null ? n.b - (n.b % 4) + fr[i] : n.b }));
    return out; };
  J.heardTurn = (P, turn, notes) => { const s = J.g.get(J.keyOfPair(P.a, P.b)); if (s && turn.id === s.front && notes && notes.length) s.lastFront = notes.map(n => n.b % 4); };
  // songs hook (songs.js partsFor): the melody order of a group = front first, then the others as before (by gene)
  J.songOrder = (G, ms) => { if (!O.on) return ms; const s = J.g.get('g' + G.id); if (!s) return ms; const f = ms.find(m => m.id === s.front); return f ? [f, ...ms.filter(m => m !== f)] : ms; };
  J.songBack = (G, m) => { if (!O.on) return false; const s = J.g.get('g' + G.id); return !!(s && s.back === m); };
  J.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar !== J.lastBar) { J.lastBar = bar; J.bar(bar); } };
  return J;
}
