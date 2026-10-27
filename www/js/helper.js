// SYSTEMS: THE '?' HELPER (audit B4; old GESTURES.md "Question mark" = hook + dot, then tap anything). Draw the hook and its dot on bare
// ground, then tap anything: an ohm, a jam, a song, the ground. A card shows, without words:
//   WHAT  - the thing itself (its colour, its sound engine as a glyph, its register as a height)
//   DOING - jam (two linked rings), song (a ring with its sections lit up to where it is), asleep, with you, painted in the river
//   WHY   - lines from it to what made it play what it played (its jam partner, its song group, you, the river) from the why-log
//   RELATIONS - three bars per ohm: how much you have watched it, played it, and how much it has jammed (the most of each is marked)
//   GESTURE HINTS - ghost strokes of what you can do right there (tap, hold, drag, pinch on an ohm; spiral, twist, hook, double tap on
//   ground). Dev builds also print a text card (opts.text, on) so the team can read the same facts. Tap again to close.
// The WHY-LOG: every note an ohm plays is tagged by why it was played (song hook / song part / jam answer / your partner's answer /
// painted in the river / your touch); helper.why(o) returns the last ones (also for the river and tests).
import { recipes, octaveOf } from './recipe.js';
import { ENGINES } from './synth.js';
export const HELP_OPTS = { on: true, text: true, log: 24 };
export const reasonOf = ev => ev.inputT ? 'you' : ev.paint ? 'river' : ev.song ? (ev.hook ? 'song.hook' : ev.wrong ? 'song.drift' : 'song.part') : ev.auto ? 'jam' : ev.answer || ev.partner ? 'partner' : ev.loop ? 'singback' : 'other';
export function createHelper(sim, bus, music, sys, opts = {}) { const O = { ...HELP_OPTS, ...opts }, Hp = { opts: O, armed: false, card: null, at: null, stats: new Map(), logs: new Map() };
  const st = o => { let s = Hp.stats.get(o.id); if (!s) Hp.stats.set(o.id, s = { watch: 0, play: 0, jam: 0 }); return s; };
  bus.on('note', ev => { const o = ev.src; if (!o || o.scale !== 'ohm' || ev.kind === 'release') return; if (ev.inputT) st(o).play++;
    let L = Hp.logs.get(o.id); if (!L) Hp.logs.set(o.id, L = []); L.push({ why: reasonOf(ev), deg: ev.deg, b: ev.beat != null ? ev.beat : music.beat(), with: ev.with || null }); if (L.length > O.log) L.shift(); });
  Hp.why = o => (Hp.logs.get(o.id) || []).slice();
  let lastB = -1; Hp.tick = dt => { if (sim.ohm) st(sim.ohm).watch += dt; const bar = Math.floor(music.beat() / 4); if (bar !== lastB) { lastB = bar; for (const P of (sys.autojam && sys.autojam.jams) || []) { st(P.a).jam++; st(P.b).jam++; } if (sim.jam && sim.jam.partner && sim.jam.until > music.beat()) st(sim.jam.partner).jam++; } };
  Hp.arm = (x, y) => { if (!O.on) return; Hp.armed = true; Hp.card = null; Hp.at = { x, y, t: performance.now() }; };
  Hp.close = () => { Hp.armed = false; Hp.card = null; };
  // what is at a screen point: an ohm, a song group, a jam pair, or the ground
  Hp.pick = (x, y) => { if (Hp.card) { Hp.close(); return; } const o = sys.ohmAt ? sys.ohmAt(x, y) : null, w = sys.toW(x, y);
    if (o) Hp.card = facts(o); else { const G = sys.songs ? sys.songs.groups.find(G => G.members.some(m => { const s = sys.toS(m.body.x, m.body.y); return Math.hypot(s.x - x, s.y - y) < 90; })) : null;
      Hp.card = G ? { kind: 'song', G, text: songText(G) } : { kind: 'ground', w, text: ['ground', 'spiral = new ohm', 'twist = river', 'hook + dot = ?', 'double tap = call', '3 taps undo / 4 redo'] }; }
    Hp.card.x = x; Hp.card.y = y; Hp.card.t = performance.now(); bus.post({ type: 'helper.pick', card: Hp.card }); };
  const engineOf = o => { const r = recipes.get(o.recipe), g = r && r.synth.genes; if (!g) return null; let b = null, bv = .4; for (const e of ENGINES) if ((g[e] || 0) > bv) { bv = g[e]; b = e; } return b; };
  const doing = o => { const S = sys.songs, G = S && S.groupOf(o); if (G && G.state === 'song') return { d: 'song', G }; if (o === sim.ohm) return { d: 'you' }; if (sim.jam && sim.jam.partner === o && sim.jam.until > music.beat()) return { d: 'partner' };
    const P = ((sys.autojam && sys.autojam.jams) || []).find(P => P.a === o || P.b === o); if (P) return { d: 'jam', with: P.a === o ? P.b : P.a, k: P.k }; if (o.parked || !o.awake) return { d: 'asleep' }; return { d: 'alone' }; };
  const rel = () => { const all = [...Hp.stats.entries()], top = k => { let b = null, bv = 0; for (const [id, s] of all) if (s[k] > bv) { bv = s[k]; b = id; } return b; }; return { watch: top('watch'), play: top('play'), jam: top('jam') }; };
  const facts = o => { const d = doing(o), log = Hp.why(o), cnt = {}; for (const e of log) cnt[e.why] = (cnt[e.why] || 0) + 1; const s = st(o), r = rel(), rec = recipes.get(o.recipe);
    const text = ['ohm ' + o.id + (o.born ? ' (' + o.born + ')' : ''), 'sound: ' + (engineOf(o) || 'body') + ', octave ' + (rec ? octaveOf(rec) : '?'), 'doing: ' + d.d + (d.G ? ' - ' + d.G.song.name : d.with ? ' with ' + d.with.id : ''),
      'why: ' + (Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(', ') || 'quiet'), 'watched ' + s.watch.toFixed(0) + ' s' + (r.watch === o.id ? ' (most)' : '') + ', played ' + s.play + (r.play === o.id ? ' (most)' : '') + ', jammed ' + s.jam + ' bars' + (r.jam === o.id ? ' (most)' : '')];
    return { kind: 'ohm', o, d, cnt, s, r, text }; };
  const songText = G => [G.song.name + ' (' + G.song.origin + ')', 'form ' + G.song.form.join('') + ' + ending', 'section ' + Math.max(0, G.sec + 1) + '/' + G.song.form.length, 'members ' + G.members.map(m => m.id).join(', '), 'drift ' + (sys.songs.discord(G) * 100).toFixed(0) + '%' + (G.settled ? ', settled loop' : '')];
  const col = { you: '#fff', river: '#7fd8ff', 'song.hook': '#ffd36e', 'song.part': '#e8b65a', 'song.drift': '#ff7a6a', jam: '#9fe0a0', partner: '#c8a0ff', singback: '#c8a0ff', other: '#888' };
  Hp.draw = (g, Wd, Hd) => { const t = performance.now();
    if (Hp.armed && !Hp.card && Hp.at) { const k = .5 + .5 * Math.sin(t / 160); g.fillStyle = 'rgba(255,255,255,' + (.4 + .4 * k) + ')'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('?', Hp.at.x, Hp.at.y - 10); g.textAlign = 'start'; return; }
    const C = Hp.card; if (!C) return; const x = Math.min(Wd - 190, Math.max(10, C.x + 24)), y = Math.min(Hd - 200, Math.max(10, C.y - 90));
    g.fillStyle = 'rgba(10,12,20,.78)'; g.fillRect(x, y, 180, 180); g.strokeStyle = 'rgba(255,255,255,.25)'; g.strokeRect(x, y, 180, 180);
    if (C.kind === 'ohm') { const o = C.o, s = sys.toS(o.body.x, o.body.y);
      // WHY lines: to its jam partner / song members / you, coloured by reason; thickness = how many of its last notes had that reason
      const tgt = C.d.G ? C.d.G.members.filter(m => m !== o) : C.d.with ? [C.d.with] : C.d.d === 'partner' && sim.ohm ? [sim.ohm] : [];
      for (const m of tgt) { const q = sys.toS(m.body.x, m.body.y); g.strokeStyle = C.d.G ? col['song.part'] : col.jam; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(q.x, q.y); g.stroke(); g.setLineDash([]); }
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, s.s * 1.2 + 6, 0, 6.283); g.stroke();
      // WHAT: colour + engine glyph + register
      const rec = recipes.get(o.recipe); g.fillStyle = 'hsl(' + ((rec && rec.hue) || 0) + ',60%,60%)'; g.beginPath(); g.arc(x + 26, y + 26, 14, 0, 6.283); g.fill();
      const ei = ENGINES.indexOf(engineOf(o)); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24, v = ei < 0 ? Math.sin(u * 6.283) : Math.sin(u * 6.283 * (1 + ei % 3)) * (ei & 4 ? Math.sign(Math.sin(u * 12.56)) : 1) * (ei === 7 ? Math.random() : 1); i ? g.lineTo(x + 50 + u * 60, y + 26 - v * 9) : g.moveTo(x + 50, y + 26 - v * 9); } g.stroke();
      const oc = rec ? octaveOf(rec) : 0; g.fillStyle = '#fff'; g.fillRect(x + 122, y + 36 - (oc + 2) * 6, 10, 4);
      // DOING
      const dy = y + 70; g.strokeStyle = '#fff'; g.lineWidth = 2;
      if (C.d.d === 'jam' || C.d.d === 'partner') { g.beginPath(); g.arc(x + 24, dy, 10, 0, 6.283); g.stroke(); g.beginPath(); g.arc(x + 40, dy, 10, 0, 6.283); g.stroke(); }
      else if (C.d.d === 'song') { const G = C.d.G, n = G.song.form.length + 1; g.strokeStyle = col['song.hook']; g.beginPath(); g.arc(x + 32, dy, 13, 0, 6.283); g.stroke(); for (let i = 0; i < n; i++) { g.fillStyle = i <= G.sec ? col['song.hook'] : 'rgba(255,211,110,.3)'; g.fillRect(x + 54 + i * 14, dy - 5, 10, 10); } }
      else if (C.d.d === 'asleep') { g.fillStyle = '#aaa'; g.font = '18px sans-serif'; g.fillText('z z', x + 18, dy + 6); } else { g.beginPath(); g.arc(x + 32, dy, 10, 0, 6.283); g.stroke(); }
      // WHY bars
      let bx = x + 12; for (const [k, n] of Object.entries(C.cnt)) { g.fillStyle = col[k] || '#888'; const w = Math.max(3, n / O.log * 156); g.fillRect(bx, y + 96, w, 10); bx += w + 2; }
      // RELATIONS: watched / played / jammed (a dot marks "the most")
      const ref = (k) => Math.max(1, ...[...Hp.stats.values()].map(s => s[k])); [['watch', '#fff'], ['play', '#7fd8ff'], ['jam', '#9fe0a0']].forEach(([k, c], i) => { g.fillStyle = c; g.fillRect(x + 12, y + 118 + i * 14, 140 * C.s[k] / ref(k), 8); if (C.r[k] === o.id) { g.beginPath(); g.arc(x + 162, y + 122 + i * 14, 4, 0, 6.283); g.fill(); } });
      ghost(g, s.x, s.y, ['tap', 'hold', 'drag', 'pinch'], t); }
    else if (C.kind === 'song') { const G = C.G, L = G.L || []; g.strokeStyle = col['song.hook']; g.lineWidth = 2; L.forEach((B, i) => { g.fillStyle = B.sec === 'end' ? '#fff' : B.sec === G.song.form[0] ? col['song.hook'] : col['song.part']; g.fillRect(x + 10 + i * 160 / L.length, y + 20 + (6 - B.r) * 5, Math.max(1, 160 / L.length - 1), 4); }); }
    else ghost(g, C.x, C.y, ['spiral', 'twist', 'hook', 'double'], t);
    if (O.text) { g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '10px monospace'; C.text.forEach((l, i) => g.fillText(l.slice(0, 32), x + 8, y + (C.kind === 'ohm' ? 172 - (C.text.length - 1 - i) * 11 + 0 : 60 + i * 12))); } };
  // gesture hints: a fingertip dot tracing each gesture's shape in turn
  const ghost = (g, cx, cy, list, t) => { const k = list[Math.floor(t / 1400) % list.length], u = (t % 1400) / 1400; let px = cx, py = cy;
    if (k === 'spiral') { const a = u * 12.56, r = 50 * (1 - u); px = cx + Math.cos(a) * r; py = cy + Math.sin(a) * r; } else if (k === 'twist') { const a = u * 1.6; px = cx + Math.cos(a) * 40; py = cy + Math.sin(a) * 40; g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(cx - Math.cos(a) * 40, cy - Math.sin(a) * 40, 8, 0, 6.283); g.fill(); }
    else if (k === 'hook') { const a = -Math.PI + u * Math.PI * 1.5; px = cx + Math.cos(a) * 26; py = cy - 30 + Math.sin(a) * 26 + (u > .8 ? (u - .8) * 150 : 0); } else if (k === 'drag') { px = cx + u * 70; } else if (k === 'pinch') { px = cx + 30 * (1 - u); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(cx - 30 * (1 - u), cy, 8, 0, 6.283); g.fill(); }
    const pulse = k === 'tap' || k === 'double' ? (u < .2 || (k === 'double' && u > .35 && u < .55) ? 1 : .3) : k === 'hold' ? Math.min(1, u * 2) : .7; g.fillStyle = 'rgba(255,255,255,' + .6 * pulse + ')'; g.beginPath(); g.arc(px, py, 9, 0, 6.283); g.fill(); };
  return Hp; }
