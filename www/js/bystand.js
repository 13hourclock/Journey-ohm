// BYSTANDERS WATCH A JAM (Wilbow R3.8, DECISIONS:268 "Bystanders watch quietly"; V07 section D: bystanders LEARN from the jam's
// tempo, feel and motifs). Once a bar: every live ohm jam (autojam pairs that are awake, song groups that are playing, your jam)
// has a circle of opts.reach (7 world units, about 360 px on a phone). An ohm inside it that is not in the jam (not yours, not
// parked) becomes a bystander for 2 bars: it does not start or join an autonomous jam (autojam skips it), its eyes turn to the jam
// (ohmdraw.js), and its brain learns the jam's patterns and phrases at opts.learn x the normal rate (blend.js), so later it plays
// a little of what it watched. NOT BUILT here: tap a bystander to join / tap a member to mute (Q338 open). The tempo of what it
// learns is the one shared clock's (nothing per-ohm). Switch bystanders (ON).
export const BYSTAND_OPTS = { on: true, reach: 7, learn: .5, bars: 2 };
export function createBystand({ sim, music, autojam, songs, jam }) {
  const O = { ...BYSTAND_OPTS }, B = { opts: O, w: new Map(), lastBar: -1, stats: { watchers: 0, maxWatch: 0 } };
  B.jams = () => { const out = [], ac = sim.opts && sim.opts.autojam;
    if (autojam && ac) autojam.jams.forEach((P, i) => { if (i < ac.max && P.k >= ac.sleepK && P.a.body && P.b.body) out.push([P.a, P.b]); });
    if (songs) for (const G of songs.groups) if ((G.state === 'song' || G.state === 'jam') && G.members.length >= 2 && G.members.every(m => m.body)) out.push(G.members);
    if (jam && jam.partner && jam.until > music.beat() && sim.ohm && sim.ohm.body && jam.partner.body) out.push([sim.ohm, jam.partner]);
    return out; };
  B.bar = bar => { const until = bar + O.bars; for (const [o, w] of B.w) if (w.until <= bar || o.dead || o.parked) { B.w.delete(o); delete o.watch; }
    if (!O.on) { for (const o of B.w.keys()) delete o.watch; B.w.clear(); return; }
    const J = B.jams(), mem = new Set(); for (const g of J) for (const m of g) mem.add(m);
    for (const g of J) { let x = 0, y = 0; for (const m of g) { x += m.body.x; y += m.body.y; } x /= g.length; y /= g.length;
      for (const o of sim.ohms || []) { if (mem.has(o) || o === sim.ohm || o.parked || o.dead || !o.body) continue; const d = Math.hypot(o.body.x - x, o.body.y - y); if (d > O.reach) continue;
        const cur = B.w.get(o); if (cur && cur.until > bar && cur.d < d) continue; const w = { x, y, of: g, k: O.learn, until, d }; B.w.set(o, w); o.watch = w; } }
    for (const o of mem) if (B.w.has(o)) { B.w.delete(o); delete o.watch; }   // joined a jam: no longer watching
    B.stats.watchers = B.w.size; B.stats.maxWatch = Math.max(B.stats.maxWatch, B.w.size); };
  B.watching = o => O.on && B.w.has(o);
  B.list = () => B.w;
  B.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar !== B.lastBar) { B.lastBar = bar; B.bar(bar); } };
  return B;
}
