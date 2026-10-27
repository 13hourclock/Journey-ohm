// VISIBLE ROLE (Q359 a, Wilbow 4:01 + 4:02 PM "Show visible role, save where it makes the most sense"): every ohm shows the part it
// plays in the music - lead, bass, pad or rhythm - and that part GROWS from what it actually plays: once a bar we look at the notes
// it played over the last few bars (how low, how long, how busy, pitched or hit) and that bar's verdict strengthens one part a little
// while the others fade a little. The part shows once it has been heard often enough, and gets brighter the surer it is.
// Saved in the ohm's own brain (entry 'part'/'role', kept: never forgotten) so it keeps its part across relaunches and carries
// wherever the brain goes. Every number is a PROPOSAL (W.zl roles.opts, dev panel switch "roles").
// Look hook (Visuals): look.ohmRole(g, o, part, x, y, r, st) - return true to replace the placeholder for that ohm. st = {k, scores}.
// Read-only for the look: lookCtx.roleOf(o) -> { part, k, scores } | null.
// text: the part NAME under the ohm (v0.0.23: off by default, dev switch 'roleText'; the body cues of look.ohmRole show the role)
export const ROLE_OPTS = { on: true, label: true, text: false, bars: 4, minN: 4, hitShare: .5, bassHz: 165, padBeats: 1.5, padPerBar: 3,
  add: 1, fade: .9, max: 8, showAt: 1.5, keep: 1 };
export const PARTS = ['lead', 'bass', 'pad', 'rhythm'];
const COL = { lead: [255, 210, 120], bass: [120, 160, 255], pad: [170, 255, 200], rhythm: [255, 130, 130] };
// one window of notes -> a part (null when too little was played)
export function classify(ns, O = ROLE_OPTS, bars = O.bars) { if (!ns || ns.length < O.minN) return null; let hits = 0, lf = 0, dur = 0;
  for (const n of ns) { if (n.hit) hits++; lf += Math.log2(Math.max(20, n.hz || 220)); dur += n.dur; }
  const N = ns.length, hz = 2 ** (lf / N), d = dur / N, perBar = N / Math.max(1, bars);
  if (hits / N >= O.hitShare) return 'rhythm'; if (hz < O.bassHz) return 'bass'; if (d >= O.padBeats && perBar <= O.padPerBar) return 'pad'; return 'lead'; }
export function createRoles(sim, bus, music, brain, drums, opts = {}) {
  const O = { ...ROLE_OPTS, ...opts }, R = { opts: O, heard: new Map(), lastBar: null, verdicts: 0 };
  const ohms = () => sim.ohms || (sim.things ? sim.things.filter(o => o.g) : []);
  const spb = () => (music.spb ? music.spb() : .5);
  R.hear = ev => { const o = ev && ev.src; if (!O.on || !o || o.scale !== 'ohm' || ev.kind === 'release' || ev.kind === 'damp' || ev.kind === 'level') return;
    if (ev.kind !== 'note' && ev.kind !== 'sustain' && ev.kind !== 'hit' && ev.kind !== 'strike') return;
    const b = ev.beat != null ? ev.beat : music.beat(), hit = ev.kind === 'hit' || ev.kind === 'strike' || ev.drum || ev.deg == null || !!(drums && drums.isDrummer && drums.isDrummer(o));
    let hz = ev.f; if (!hz && ev.deg != null && music.hz) try { hz = music.hz(ev.deg, ev.oct || 0); } catch (e) { hz = 0; }
    const dur = ev.kind === 'sustain' ? 4 : ev.len != null ? ev.len : ev.dur ? ev.dur / spb() : .5;
    let l = R.heard.get(o.id); if (!l) R.heard.set(o.id, l = []); l.push({ b, hz, dur: Math.min(8, dur), hit }); };
  R.entry = o => brain && brain.get ? brain.get(o, 'part', 'role') : null;
  R.scores = o => { const e = R.entry(o); return e && e.data && e.data.scores || null; };
  R.of = o => { const s = R.scores(o); if (!s) return null; let best = null, v = 0; for (const p of PARTS) if ((s[p] || 0) > v) { v = s[p]; best = p; }
    return best && v >= O.showAt ? { part: best, k: Math.min(1, v / O.max), scores: s } : null; };
  // a bar's verdict: the found part grows, the others fade
  R.judge = (o, part) => { const old = R.scores(o) || {}, s = {}; for (const p of PARTS) s[p] = (old[p] || 0) * (p === part ? 1 : O.fade);
    s[part] = Math.min(O.max, s[part] + O.add); const e = brain.remember(o, 'part', 'role', { scores: s }, 0, 0); e.keep = O.keep; R.verdicts++; return s; };
  R.tick = () => { if (!O.on || !brain) return; const bar = Math.floor(music.beat() / 4); if (R.lastBar === null) { R.lastBar = bar; return; } if (bar === R.lastBar) return; R.lastBar = bar;
    const from = bar * 4 - O.bars * 4; for (const [id, l] of R.heard) { while (l.length && l[0].b < from) l.shift(); if (!l.length) { R.heard.delete(id); continue; }
      const o = sim.byId ? sim.byId.get(id) : ohms().find(x => x.id === id); if (!o) { R.heard.delete(id); continue; }
      const part = classify(l, O); if (part) R.judge(o, part); } };
  // placeholder visuals: a small part name under the ohm and a thin arc in that part's colour, brighter the surer it is
  R.draw = (g, toS, look = {}) => { if (!O.on || !O.label) return; for (const o of ohms()) { if (!o.g || o.dead) continue; const r = R.of(o); if (!r) continue;
      const s = toS(o.body.x, o.body.y), rad = o.g.r * s.s; if (s.x < -60 || s.y < -60 || s.x > 1e4 || rad < 3) continue;
      if (look.ohmRole && look.ohmRole(g, o, r.part, s.x, s.y, rad, { k: r.k, scores: r.scores }) === true) continue;
      const c = COL[r.part], a = .25 + .55 * r.k; g.strokeStyle = `rgba(${c},${a * .8})`; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, rad * 1.35 + 3, 2.2, 2.2 + 6.283 * (.15 + .35 * r.k)); g.stroke();
      if (O.text && rad > 6) { g.fillStyle = `rgba(${c},${a})`; g.font = '11px sans-serif'; g.textAlign = 'center'; g.fillText(r.part, s.x, s.y + rad * 1.35 + 15); } } };
  R.unsub = bus && bus.on ? bus.on('note', R.hear) : null;
  return R; }
