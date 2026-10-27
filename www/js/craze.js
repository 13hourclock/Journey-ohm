// TRADITIONS, EXTENDED: A TUNE CATCHES ON AND SPREADS AS A CRAZE (old game feature "A short tune caught on and spread from ohm to ohm
// as a craze"; Wilbow: knowledge passes on, "ohms can learn a song wrong but the traditional song still exists", drift causes discord;
// your own songs can become traditions, built as placeTrad in v0.0.25). Builds ON the songs / placeTrad system, no second tradition store:
//   - when a hook CATCHES (songs.js 'song.caught': a jam became a song) its hook becomes a craze on that planet;
//   - ohms near anyone playing it HEAR it; a curious / social ohm picks it up (deterministic per ohm + craze), learned with drift like
//     a song (its brain 'song' entry, so songs.js treats it as known), and from then on plays the tune's contour in its own jams now and
//     then (at most 1 phrase in `every`, through autojam's melody-borrow hook, in the jam's key + register) - so it spreads hop by hop;
//   - a craze fades `life` bars after it last found a new ohm (the carriers keep it in memory; it just stops spreading);
//   - when `tradOhms` different ohms have played it, it is the place's TRADITION (s.trad = planet, the same flag placeTrad reads:
//     resting groups there start it, children inherit it a little more drifted).
// Posts 'craze.start' / 'craze.catch' { song, src } / 'craze.trad'. Switch 'craze' (ON).
export const CRAZE_OPTS = { on: true, reach: 4, every: 3, life: 64, pick: .55, tradOhms: 5, max: 3, drift: .12 };
const u01 = (...a) => { let h = 2166136261; for (const x of a) { h ^= (x | 0) >>> 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } return (h >>> 0) / 4294967296; };
const hs = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h; };
export function createCraze({ sim, bus, music, songs, opts = {} }) {
  const O = { ...CRAZE_OPTS, ...opts }, Z = { opts: O, list: [], lastBar: -1, catches: 0, plays: 0, trads: 0, playing: new Map() };
  const steps = s => { const h = (s.hook || []).slice(0, 8); const iv = []; for (let i = 1; i < h.length; i++) iv.push(Math.max(-4, Math.min(4, h[i].d - h[i - 1].d))); return iv.length ? iv : null; };
  Z.start = (s, members) => { if (!O.on || !s || Z.list.some(c => c.song === s)) return null; const iv = steps(s); if (!iv) return null;
    const c = { song: s, iv, id: hs(s.id), carriers: new Set((members || []).map(m => m.id)), players: new Set(), last: Math.floor(music.beat() / 4), born: Math.floor(music.beat() / 4) };
    Z.list.push(c); if (Z.list.length > O.max) Z.list.shift(); if (bus.post) bus.post({ type: 'craze.start', song: s }); return c; };
  if (bus && bus.on) bus.on('song.caught', ev => Z.start(ev.song, ev.members));
  const learn = (o, c) => { const br = sim.brain; if (!br || !br.remember) return; const e = br.get(o, 'song', c.song.id); if (e) return;
    br.remember(o, 'song', c.song.id, { drift: O.drift + .3 * u01(o.seed || o.id, c.id), plays: 0, name: c.song.name, craze: 1 }, 1, 12); };
  // once a bar: who heard a carrier play it (last 2 bars) picks it up
  Z.bar = bar => { if (!O.on) return; for (const c of Z.list) { if (bar - c.last > O.life) continue; const src = []; for (const [id, b] of Z.playing) if (bar - b <= 2 && c.carriers.has(id)) { const o = sim.byId && sim.byId.get(id); if (o && o.body) src.push(o); }
      for (const s of songs ? songs.groups : []) if (s.song === c.song && s.state === 'song') for (const m of s.members) if (m.body) src.push(m);
      if (!src.length) continue;
      for (const o of sim.ohms || []) { if (c.carriers.has(o.id) || o === sim.ohm || o.parked || o.dead || !o.body) continue; if (!src.some(p => Math.hypot(p.body.x - o.body.x, p.body.y - o.body.y) < O.reach)) continue;
        const p = o.personality, want = O.pick * (p ? .5 + .5 * (p.curious + p.social) / 2 : .75); if (u01(o.seed || o.id, c.id, bar) >= want) continue;
        c.carriers.add(o.id); c.last = bar; learn(o, c); Z.catches++; if (bus.post) bus.post({ type: 'craze.catch', song: c.song, src: o }); } }
    for (const [id, b] of Z.playing) if (bar - b > 4) Z.playing.delete(id); };
  // autojam's melody borrow (sim.shapeLean): a carrier plays the craze's contour, at most 1 phrase in `every`
  Z.borrow = (P, turn, tn) => { if (!O.on) return null; for (const c of Z.list) { if (!c.carriers.has(turn.id)) continue; if (u01(turn.seed || turn.id, c.id, tn) * O.every >= 1) continue;
      Z.plays++; Z.playing.set(turn.id, Math.floor(music.beat() / 4)); c.players.add(turn.id);
      if (c.song.trad == null && c.players.size >= O.tradOhms && songs && songs.opts && songs.opts.placeTrad && c.song.origin !== 'dev') { c.song.trad = c.song.planetSeed; Z.trads++; if (bus.post) bus.post({ type: 'craze.trad', song: c.song }); }
      return c.iv; } return null; };
  Z.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar !== Z.lastBar) { Z.lastBar = bar; Z.bar(bar); } };
  return Z;
}
