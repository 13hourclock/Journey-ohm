// LOOK FEED (game dev): read-only views of data master ALREADY has, put where the look (Visuals' look/kaleido.js) can read it.
// Nothing here changes music: no new chords, no new measures that steer sound; every field is derived from existing state on read.
//   music.chord.kind        'triad' when the chord is the usual 3 stacked scale degrees (music.js / songs.js write triads only)
//   music.mode              the scale's mode name from its own ratios ('ionian' .. 'locrian', else 'other'); getter, never stored
//   harmony.tension         0..1 = the strongest playing song's discord (songs.discord: mean drift of its players); null when no song
//   ohm.timbre              { bright, damp } = the ohm's recipe modal.p.bright / .damp (live, read-only); ctx.recipeOf(o) = the live recipe
//   ctx.song                { phase: 'start' | 'develop' | 'end', progress 0..1, id, section } of the strongest playing song, continuous
//                           (bar + beat fraction over the song's bar list); null when no song plays
//   ctx.jam                 { on, you, div, snap, pairs, k } = music.jam (your jam grid) + autojam pairs (count, strongest k)
// Not exposed (no honest source on master): syncopation (no per-bar measure exists; the look keeps its own off-beat count).
import { recipes } from './recipe.js';
import { barsOf } from './songs.js';
const MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'], ION = [2, 2, 1, 2, 2, 2, 1];
const modeOf = sc => { const r = sc && sc.ratios; if (!r || r.length !== 7) return 'other'; const st = r.map(x => Math.round(12 * Math.log2(x))), steps = st.map((v, i) => (i < 6 ? st[i + 1] : 12) - v);
  for (let k = 0; k < 7; k++) if (steps.every((v, i) => v === ION[(i + k) % 7])) return MODES[k]; return 'other'; };
export function createLookFeed({ ctx, music, harmony, songs, jam, autojam, sim, bus, traditions = null }) {
  if (!ctx) return null;
  // TRADITIONS (traditions.js): ctx.tradition = { id, name, auraPalette [{ role, rgb }], auraRoles { glow, line, fill, accent }, auraPattern { kind, fold, density, speed, beatLock,
  //   swing, rings: [{ speed }], pulse: { period, phase } }, timeOfDay (ragas, else null), glide, micro, offScale, cycle { name, step, steps, pos, accent, land } } or null.
  //   Neutral placeholders until Visuals' design is approved; read-only.
  Object.defineProperty(ctx, 'tradition', { configurable: true, enumerable: true, get: () => (traditions && traditions.feed ? traditions.feed() : null) });
  let mSc = null, mName = 'other';
  if (!Object.getOwnPropertyDescriptor(music, 'mode')) Object.defineProperty(music, 'mode', { configurable: true, enumerable: false, get: () => { if (music.scale !== mSc) { mSc = music.scale; mName = modeOf(mSc); } return mName; } });
  const kindOf = () => { const ch = music.chord; if (ch && ch.tones && ch.kind == null) ch.kind = ch.tones.length === 3 && ch.tones[1] - ch.tones[0] === 2 && ch.tones[2] - ch.tones[1] === 2 ? 'triad' : 'other'; };
  if (music.listeners) music.listeners.push(kindOf); kindOf();
  const top = () => { let b = null; for (const G of (songs && songs.groups) || []) if (G.state === 'song' && G.song && (!b || G.k > b.k)) b = G; return b; };
  if (harmony && !Object.getOwnPropertyDescriptor(harmony, 'tension')) Object.defineProperty(harmony, 'tension', { configurable: true, enumerable: false, get: () => { const G = top(); return G && songs.discord ? Math.max(0, Math.min(1, songs.discord(G))) : null; } });
  // ohm.timbre: one reused object per ohm, refreshed from the live recipe on read
  const TB = new WeakMap(); const timbre = o => { if (!o || Object.getOwnPropertyDescriptor(o, 'timbre')) return;
    Object.defineProperty(o, 'timbre', { configurable: true, enumerable: false, get: () => { const r = recipes.get(o.recipe), p = r && r.modal && r.modal.p; if (!p) return null; let t = TB.get(o); if (!t) TB.set(o, t = { bright: 0, damp: 0 }); t.bright = p.bright; t.damp = p.damp; return t; } }); };
  for (const o of (sim && sim.ohms) || []) timbre(o);
  if (bus) { bus.on('note', ev => { if (ev && ev.src && typeof ev.src === 'object') timbre(ev.src); }); bus.on('recipe', ev => { if (ev && ev.src) timbre(ev.src); }); }
  ctx.recipeOf = o => (o && recipes.get(o.recipe)) || null;
  const SG = { phase: 'start', progress: 0, id: null, section: null };
  Object.defineProperty(ctx, 'song', { configurable: true, enumerable: true, get: () => { const G = top(); if (!G) return null; const L = G.L || (G.L = barsOf(G.song)); if (!L.length) return null;
    const x = Math.max(0, Math.min(L.length, music.beat() / 4 - G.start)), bi = Math.min(L.length - 1, x | 0), b = L[bi], firstEnd = L.findIndex((r, i) => i > 0 && r.first);   // start = the first section (up to the next section line)
    SG.progress = x / L.length; SG.id = G.song.id; SG.section = b.sec; SG.phase = b.sec === 'end' ? 'end' : bi < (firstEnd < 0 ? L.length : firstEnd) ? 'start' : 'develop'; return SG; } });
  const JS = { on: false, you: false, div: 0, snap: 0, pairs: 0, k: 0 };
  Object.defineProperty(ctx, 'jam', { configurable: true, enumerable: true, get: () => { const m = music.jam, P = (autojam && autojam.jams) || []; let k = 0; for (const p of P) k = Math.max(k, p.k || 0);
    JS.you = !!m; JS.div = m ? m.div : 0; JS.snap = m ? m.snap : 0; JS.pairs = P.length; JS.k = k; JS.on = JS.you || P.length > 0; return JS; } });
  ctx.harmony = harmony || null; ctx.songs = songs || null;
  return { modeOf, top, tick: kindOf };   // tick once a frame: a chord written without listeners (save / sync) gets its kind too
}
