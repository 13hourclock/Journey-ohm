// SPECIAL ABILITIES FROM GENE THRESHOLDS (old game R5.4, softsound/ABILITIES.md: "ALL 25 APPROVED by Wilbow (Oct 21 2026)";
// restored by the 10:34 AM Oct 25 rollback, NEW_ENGINE Appendix A1 R5.4 CARRY). The old mechanism, unchanged: an ability emerges
// when 2-3 genes cross thresholds from their tail probabilities (.0775 per gene for 2-gene combos, so ~0.6% of genomes per ability);
// strength = how far past the thresholds (.35..1); heritable because it lives in the genes (each child gene comes whole from one
// parent by a seeded coin, no mutation: two carriers always pass it on). No classes and no text: each one shows only through notes,
// timing, glow and rings. The ability genes are a THIRD stream of the ohm's seed (seed ^ 0xab1e), so no existing ohm's body or
// sound changes. Built here (wave 1, the ones that fit the real planet + the music now; the rest are listed in the gap audit):
//   echo      1 Echolocation: low sight + high hearing. A soft click every 2 bars with a ring; ohms the ring passes glow; it drifts
//               toward the nearest one it found.
//   pitch     2 Perfect pitch: very high hearing + precision. Nearby ohms' matrix pitch push (note.pitch) is pulled back into tune.
//   metro     3 Living metronome: very high rhythmic precision. While it plays it ticks a quiet steady beat, and nearby ohms' ahead /
//               behind lean (rare.js personalities) is pulled toward the beat.
//   mimic     4 Mimicry: high hearing + creativity. A phrase you play near it comes back a bar after you stop, in its own voice.
//   overtone  5 Overtone singing: very pure tone + wide range. Each of its notes carries a quiet 3rd harmonic (two notes at once).
//   dream    19 Dream singing: nocturnal + memory. At night, when it is not playing, it sings a slow low drone every 4 bars.
//   storm    14 Storm singing: loud + atmosphere affinity. Its playing near you brings rain (env.js E.wx.storm).
// Wave 2 (v0.0.28, same rarity model; genes appended at the END of the stream so no wave-1 gene value moves):
//   conduct   9 Conducting: leadership + rhythm. While it plays, nearby ohms' notes swell through each 8-bar phrase and drop back
//               (dynamics), and it closes each phrase with a 5 -> 1 cadence. (The TEMPO part waits on the one-clock question.)
//   compose  10 Composing: creativity + memory. Every 8 bars, when it is quiet and you are near, it invents a short motif; the
//               nearest ohm picks it up 2 bars later and passes it on once more (a motif spreading through the colony).
//   weave    11 Weaving: builder drive + elasticity. Near you, once per weaver, it spins a string (things.js) just above itself;
//               strings next to each other become harps through the existing shapes.
//   memkeep  22 Memory keeping: very long memory. Every 32 bars near you, if no song is playing near, it revives the oldest
//               song in the library (songs.js playNear).
//   gravity  24 Gravity dancing: buoyancy + mass extremes. Moving ohms near it curve around it (a small swirl + pull each beat).
// Switch 'abilities' (ON: approved) + one switch per ability (ON).
import { rng } from './rng.js';
export const AB_GENES = ['sight', 'hear', 'precision', 'creativity', 'memory', 'loud', 'pure', 'range', 'nocturnal', 'atmo', 'lead', 'build', 'elastic', 'buoy', 'mass'];
const T2 = .0775, T1 = .006;   // tail per gene: 2-gene combos, 1-gene ('very high' alone)
export const ABILITIES = {
  echo: [['sight', '<', T2], ['hear', '>', T2]],
  pitch: [['hear', '>', T2], ['precision', '>', T2]],
  metro: [['precision', '>', T1]],
  mimic: [['hear', '>', T2], ['creativity', '>', T2]],
  overtone: [['pure', '>', T2], ['range', '>', T2]],
  dream: [['nocturnal', '>', T2], ['memory', '>', T2]],
  storm: [['loud', '>', T2], ['atmo', '>', T2]],
  conduct: [['lead', '>', T2], ['precision', '>', T2]],
  compose: [['creativity', '>', T2], ['memory', '>', T2]],
  weave: [['build', '>', T2], ['elastic', '>', T2]],
  memkeep: [['memory', '>', T1]],
  gravity: [['buoy', '>', T2], ['mass', '>', T2]] };
export const ABILITY_OPTS = { on: true, lookPulse: true, echo: true, pitch: true, metro: true, mimic: true, overtone: true, dream: true, storm: true, conduct: true, compose: true, weave: true, memkeep: true, gravity: true,
  near: 6, echoReach: 7, echoBars: 2, echoPull: .6, pitchPull: 1, metroPull: 1, metroVel: .07, mimicMax: 6, mimicQuiet: 1,
  overtoneVel: .3, dreamDay: .3, dreamVel: .12, dreamFar: 14, stormNear: 8, stormRain: .7,
  conductDyn: .25, conductVel: .35, composeBars: 8, composeHops: 2, weaveBars: 16, weaveLen: 1.4, keepBars: 32, gravNear: 4, gravK: .08 };
// founders: the genes from the seed's third stream
export function abilityGenes(seed) { const r = rng(((seed >>> 0) ^ 0xab1e) >>> 0), g = {}; for (const k of AB_GENES) g[k] = r(); return g; }
// which abilities a gene set carries, with strength .35..1 (how far past the thresholds the weakest gene sits)
export function abilitiesOf(g) { const out = {}; if (!g) return out;
  for (const [k, conds] of Object.entries(ABILITIES)) { let e = 1;
    for (const [gene, dir, tail] of conds) { const v = g[gene], x = dir === '>' ? (v - (1 - tail)) / tail : (tail - v) / tail; if (!(x > 0)) { e = -1; break; } e = Math.min(e, x); }
    if (e > 0) out[k] = .35 + .65 * Math.min(1, e); }
  return out; }
// a child's ability genes: each gene whole from one parent (seeded coin, no mutation; R1.3)
export function inheritAbility(ga, gb, seed) { const r = rng(((seed >>> 0) ^ 0xab1d) >>> 0), c = {}; for (const k of AB_GENES) c[k] = r() < .5 ? ga[k] : gb[k]; return c; }
export function createAbilities({ sim, bus, music, world, matrix, persist, things, songs }) {
  const O = { ...ABILITY_OPTS }, A = { opts: O, kids: new Map(), forced: new Map(), carriers: [], rings: [], phrase: [], echoes: 0, ticks: 0, mimics: 0, overtones: 0, drones: 0, pitched: 0, pulled: 0, rains: 0, conducted: 0, cadences: 0, composed: 0, spread: 0, woven: new Set(), strings: 0, revived: 0, bends: 0, motifs: [], lastBar: -1, lastBeat: -1, lastNote: new Map() };
  const D = (a, b) => Math.hypot(a.body.x - b.body.x, a.body.y - b.body.y);
  A.genes = o => { const k = A.kids.get(o.id); if (!k) return abilityGenes(o.seed >>> 0);
    if (AB_GENES.some(g => k[g] == null)) { const f = abilityGenes(o.seed >>> 0); for (const g of AB_GENES) if (k[g] == null) k[g] = f[g]; } return k; };   // kids saved before a gene existed get it from their own seed
  A.of = o => { if (!o || o.scale !== 'ohm') return null; const key = (o.seed >>> 0) + ':' + (A.kids.has(o.id) ? 'k' : 'f');
    if (o._abK !== key) { o._abK = key; o._ab = abilitiesOf(A.genes(o)); }
    const f = A.forced.get(o.id); return f ? { ...o._ab, ...f } : o._ab; };
  A.has = (o, k) => { if (!O.on || !O[k]) return 0; const a = A.of(o); return a && a[k] || 0; };
  A.force = (o, k, s = 1) => { const f = A.forced.get(o.id) || {}; f[k] = s; A.forced.set(o.id, f); A.scan(); };   // tests / dev only
  const live = () => (sim.ohms || []).filter(o => o.scale === 'ohm' && o.body && !o.dead && !o.away);
  A.scan = () => { A.carriers = []; for (const o of live()) { const a = A.of(o); if (a && Object.keys(a).length) A.carriers.push(o); } };
  const with_ = k => A.carriers.filter(o => A.has(o, k) && !o.parked);
  const sounding = (o, b) => { const l = A.lastNote.get(o.id); return l != null && b - l < 4.5; };
  // children inherit (teach.js 'breed': src = child, a / b = parents, seed)
  bus.on('breed', ev => { if (!ev.src || !ev.a || !ev.b) return; A.kids.set(ev.src.id, inheritAbility(A.genes(ev.a), A.genes(ev.b), ev.seed >>> 0)); ev.src._abK = null; A.scan(); });
  // notes: who is playing; your phrase (mimicry); overtone companions
  bus.on('note', ev => { const s = ev.src; if (!s || ev.ab || (ev.kind !== 'note' && ev.kind !== 'strike')) return; const b = ev.beat != null ? ev.beat : music.beat();
    if (s.scale === 'ohm') A.lastNote.set(s.id, b);
    if (s === sim.ohm && ev.deg != null && !ev.auto) { A.phrase.push({ b, deg: ev.deg, oct: ev.oct || 0, vel: ev.vel || .5, dur: ev.dur || .3 }); if (A.phrase.length > 16) A.phrase.shift(); A.phraseEnd = b; A.echoed = false; }
    const ov = A.has(s, 'overtone'); if (ov && s !== sim.ohm) { const f = ev.f || (music.hz ? music.hz(ev.deg == null ? 0 : ev.deg, ev.oct || 0) : 0); if (f > 0 && f * 3 < 9000) { A.overtones++;
      bus.note({ src: s, kind: 'note', f: f * 3, vel: (ev.vel || .5) * O.overtoneVel * ov, dur: ev.dur, t: ev.t, pan: ev.pan, gainK: ev.gainK, lite: ev.lite, ab: 'overtone' }); } } });
  // timing: a living metronome pulls nearby ohms' ahead / behind lean (rare.js sets ev.lean ms, then calls this) toward the beat
  const post0 = bus.post; bus.post = ev => { if (ev && ev.type === 'note' && O.on && O.metro && ev.lean && ev.src && ev.src.body && A.carriers.length) { let k = 0;
      for (const m of A.carriers) { const s = A.has(m, 'metro'); if (!s || m.parked) continue; const d = m === ev.src ? 0 : D(m, ev.src); if (d < O.near) k = Math.max(k, s * O.metroPull * (1 - d / O.near)); }
      if (k > 0) { const t0 = music.now(); ev.t = Math.max(t0, ev.t - ev.lean / 1000 * Math.min(1, k)); ev.lean *= 1 - Math.min(1, k); A.pulled++; } }
    if (ev && ev.type === 'note' && O.on && O.conduct && !ev.ab && ev.vel != null && ev.src && ev.src.body && ev.src !== sim.ohm && A.carriers.length) { let k = 0;
      for (const m of A.carriers) { const s = A.has(m, 'conduct'); if (!s || m.parked || !sounding(m, music.beat())) continue; const d = m === ev.src ? 0 : D(m, ev.src); if (d < O.near) k = Math.max(k, s * (1 - d / O.near)); }
      if (k > 0) { const ph = (Math.floor(music.beat() / 4) % 8) / 7 * 2 - 1; ev.vel = Math.max(0, ev.vel * (1 + O.conductDyn * k * ph)); A.conducted++; } }
    return post0(ev); };
  // perfect pitch: the matrix's note.pitch push on nearby ohms is pulled back into tune
  if (matrix && matrix.noteOffsets) { const no0 = matrix.noteOffsets; matrix.noteOffsets = (o, ev) => { const N = no0(o, ev); if (!N || !N['note.pitch'] || !O.on || !O.pitch || !o || !o.body || !A.carriers.length) return N;
      let k = 0; for (const m of A.carriers) { const s = A.has(m, 'pitch'); if (!s || m.parked) continue; const d = m === o ? 0 : D(m, o); if (d < O.near) k = Math.max(k, s * O.pitchPull * (1 - d / O.near)); }
      if (k > 0) { N['note.pitch'] *= 1 - Math.min(1, k); A.pitched++; } return N; }; }
  // once a beat: metronome ticks; once a bar: echo pulses, mimicry, dream drones, storms
  A.tick = () => { const nb = music.beat(), beat = Math.floor(nb), bar = Math.floor(nb / 4); if (beat === A.lastBeat) return; A.lastBeat = beat;
    const tB = b => music.timeOfBeat ? music.timeOfBeat(b) : b / 2;
    if (O.on && O.metro) for (const m of with_('metro')) { if (!sounding(m, nb)) continue; const s = A.has(m, 'metro'); A.ticks++;
      bus.note({ src: m, kind: 'strike', deg: 0, oct: 2, vel: O.metroVel * s * (beat % 4 === 0 ? 1.4 : 1), dur: .03, t: tB(beat + 1), beat: beat + 1, ab: 'metro', gainK: .5 }); }
    if (O.on && O.gravity) for (const g of with_('gravity')) { const s = A.has(g, 'gravity');
      for (const p of live()) { if (p === g || p === sim.ohm || p.parked || !p.body || p.body.grab) continue; const dx = g.body.x - p.body.x, dy = g.body.y - p.body.y, d = Math.hypot(dx, dy);
        if (d < .8 || d > O.gravNear || Math.hypot(p.body.vx || 0, p.body.vy || 0) < .05) continue; const k = O.gravK * s * (1 - d / O.gravNear);
        p.body.vx += (dx / d * .4 - dy / d) * k; p.body.vy += (dy / d * .4 + dx / d) * k; A.bends++; } }
    if (bar !== A.lastBar) { A.lastBar = bar; A.bar(bar); } };
  A.bar = bar => { A.scan(); const E = world && world.env, f = sim.ohm, b4 = bar * 4, tB = b => music.timeOfBeat ? music.timeOfBeat(b) : b / 2;
    if (!O.on) { if (E && E.wx) E.wx.storm = 0; return; }
    // echolocation
    if (O.echo) for (const o of with_('echo')) { if ((bar + o.id) % O.echoBars) continue; const s = A.has(o, 'echo'); A.echoes++;
      bus.note({ src: o, kind: 'strike', deg: 4, oct: 3, vel: .1 * s, dur: .02, t: tB(b4 + 4), beat: b4 + 4, ab: 'echo', gainK: .5 });
      A.rings.push({ x: o.body.x, y: o.body.y, t0: tB(b4 + 4), s, src: o.id }); if (A.rings.length > 12) A.rings.shift();
      let best = null, bd = 1e9; for (const p of live()) { if (p === o || p.parked) continue; const d = D(o, p); if (d < O.echoReach) { p.glow = Math.min(1.4, (p.glow || 0) + .15 * s); if (d < bd && d > 1.2) { bd = d; best = p; } } }
      if (best && !sounding(o, b4) && o.body && !o.body.grab) { o.body.vx += (best.body.x - o.body.x) / bd * O.echoPull * s; o.body.vy += (best.body.y - o.body.y) / bd * O.echoPull * s * .3; } }
    // mimicry: your phrase comes back a bar after you stop, in the mimic's voice
    if (O.mimic && f && f.body && A.phrase.length >= 2 && !A.echoed && A.phraseEnd != null && b4 - A.phraseEnd >= 4 * O.mimicQuiet) {
      const ms = with_('mimic').filter(o => o !== f && D(o, f) < O.near).sort((a, b) => D(a, f) - D(b, f)); A.echoed = true;
      if (ms.length) { const m = ms[0], s = A.has(m, 'mimic'), ph = A.phrase.slice(-O.mimicMax), p0 = Math.floor(ph[0].b), at = b4 + 4; A.mimics++;
        for (const n of ph) { const bt = at + (n.b - p0); bus.note({ src: m, kind: 'note', deg: n.deg, oct: n.oct, vel: n.vel * (.5 + .4 * s), dur: n.dur, t: tB(bt), beat: bt, ab: 'mimic' }); }
        m.glow = Math.min(1.4, (m.glow || 0) + .4); A.phrase = []; } }
    // dream singing: at night, a quiet low drone every 4 bars from a dreamer that is not playing
    if (O.dream && bar % 4 === 0 && E && E.day != null && E.day < O.dreamDay) for (const o of with_('dream')) { if (sounding(o, b4) || (f && f.body && D(o, f) > O.dreamFar)) continue;
      const s = A.has(o, 'dream'); A.drones++; bus.note({ src: o, kind: 'note', deg: 0, oct: -1, vel: O.dreamVel * s, dur: (music.spb ? music.spb() : .5) * 15, t: tB(b4 + 4), beat: b4 + 4, ab: 'dream', gainK: .6 }); o.glow = Math.min(1.4, (o.glow || 0) + .2); }
    // storm singing: rain near you while a storm singer plays
    if (E && E.wx) { let k = 0; if (O.storm && f && f.body) for (const o of with_('storm')) { if (!sounding(o, b4)) continue; const d = D(o, f); if (d < O.stormNear) k = Math.max(k, A.has(o, 'storm') * (1 - d / O.stormNear)); }
      const was = E.wx.storm || 0; E.wx.storm = k > 0 ? Math.min(1, O.stormRain * k) : was * .6; if (k > 0) A.rains++; }
    const nearYou = o => f && f.body && o !== f && D(o, f) < O.dreamFar;
    // conducting: the cadence that closes each 8-bar phrase (5 on beat 3, 1 on the next downbeat)
    if (O.conduct && bar % 8 === 7) for (const m of with_('conduct')) { if (!sounding(m, b4)) continue; const s = A.has(m, 'conduct'); A.cadences++;
      bus.note({ src: m, kind: 'note', deg: 4, oct: 0, vel: O.conductVel * s, dur: .5, t: tB(b4 + 2), beat: b4 + 2, ab: 'conduct' });
      bus.note({ src: m, kind: 'note', deg: 0, oct: 0, vel: O.conductVel * s * 1.2, dur: 1, t: tB(b4 + 4), beat: b4 + 4, ab: 'conduct' }); }
    // composing: a new motif, then it travels ohm to ohm
    const playMotif = (o, mo, at, vel) => { for (const n of mo) bus.note({ src: o, kind: 'note', deg: n.deg, oct: n.oct, vel, dur: .4, t: tB(at + n.b), beat: at + n.b, ab: 'compose' }); };
    A.motifs = A.motifs.filter(M => { if (M.at > b4) return true; if (!O.compose) return false; const o = M.who; if (!o || o.dead || o.away || !o.body) return false;
      playMotif(o, M.mo, b4 + 4, .3); A.spread++; o.glow = Math.min(1.4, (o.glow || 0) + .2); (o._motifs || (o._motifs = [])).push(M.id); if (o._motifs.length > 3) o._motifs.shift();
      if (M.hop < O.composeHops) { const nx = live().filter(p => p !== o && p !== f && !p.parked && !M.seen.includes(p.id) && D(p, o) < O.near).sort((a, b) => D(a, o) - D(b, o))[0];
        if (nx) { M.seen.push(nx.id); A.motifs.push({ ...M, who: nx, hop: M.hop + 1, at: b4 + 8 }); } } return false; });
    if (O.compose) for (const o of with_('compose')) { if ((bar + o.id) % O.composeBars || sounding(o, b4) || !nearYou(o)) continue; const s = A.has(o, 'compose'), r = rng(((o.seed >>> 0) ^ (A.composed * 2654435761) ^ 0xc0de) >>> 0);
      const mo = []; for (let i = 0, b = 0; i < 4; i++) { mo.push({ b, deg: Math.floor(r() * 7), oct: r() < .2 ? 1 : 0 }); b += r() < .5 ? .5 : 1; } A.composed++;
      playMotif(o, mo, b4 + 4, .35 * (.6 + .4 * s)); o.glow = Math.min(1.4, (o.glow || 0) + .4); const nx = live().filter(p => p !== o && p !== f && !p.parked && D(p, o) < O.near).sort((a, b) => D(a, o) - D(b, o))[0];
      if (nx && O.composeHops > 0) A.motifs.push({ id: o.id + ':' + A.composed, mo, who: nx, hop: 1, at: b4 + 8, seen: [o.id, nx.id] }); if (A.motifs.length > 8) A.motifs.shift(); }
    // weaving: one string per weaver, near you
    if (O.weave && things && things.make) for (const o of with_('weave')) { if (A.woven.has(o.id) || (bar + o.id) % O.weaveBars || !nearYou(o) || !o.body) continue;
      const L = O.weaveLen * (.7 + .3 * A.has(o, 'weave')), y = o.body.y - 1.3, P = []; for (let i = 0; i <= 4; i++) P.push({ x: o.body.x - L / 2 + L * i / 4, y });
      const th = things.make('string', P, { seed: ((o.seed >>> 0) ^ 0x5717) >>> 0, grown: true }); A.woven.add(o.id); if (th) { A.strings++; o.glow = Math.min(1.4, (o.glow || 0) + .5); } }
    // memory keeping: an old song comes back
    if (O.memkeep && songs && songs.playNear && songs.lib && bar % O.keepBars === O.keepBars / 2) { const ks = with_('memkeep').filter(nearYou);
      const busy = (songs.groups || []).some(G => G.state === 'song' && G.members && G.members.some(m => m.body && f && f.body && D(m, f) < O.near));
      if (ks.length && !busy) { const old = [...songs.lib.values()].sort((a, b) => (a.made || 0) - (b.made || 0))[0]; if (old && songs.playNear(old.id)) { A.revived++; ks[0].glow = Math.min(1.4, (ks[0].glow || 0) + .5); } } } };
  // rings (drawn outside look/: a thin expanding circle, gone in 1.5 s)
  // v0.0.30 A1 (GAMEDEV_SPEC, switch opts.lookPulse, default ON): Visuals' look.pulse paints the echo as a soft wavefront of light (no outline); the stroke stays the fallback
  A.draw = (g, W, H, toS, look) => { if (!A.rings.length) return; const t = music.now(); g.save(); g.lineWidth = 1.2; const lp = O.lookPulse !== false && look && look.pulse;
    A.rings = A.rings.filter(R => t - R.t0 < 1.5); for (const R of A.rings) { const a = t - R.t0; if (a < 0) continue; const c = toS(R.x, R.y), c2 = toS(R.x + O.echoReach * a / 1.5, R.y), r = Math.abs(c2.x - c.x);
      if (lp && look.pulse(g, 'echo', c.x, c.y, Math.max(1, r), a, { s: R.s, life: 1.5, hits: R.hits }) === true) continue;
      g.strokeStyle = `rgba(220,235,255,${(.35 * R.s * (1 - a / 1.5)).toFixed(3)})`; g.beginPath(); g.arc(c.x, c.y, Math.max(1, r), 0, 6.2832); g.stroke(); } g.restore(); };
  A.stats = () => { const n = {}; for (const o of A.carriers) for (const k of Object.keys(A.of(o) || {})) n[k] = (n[k] || 0) + 1; return n; };
  A.save = () => ({ kids: [...A.kids.entries()], woven: [...A.woven] });
  A.load = d => { if (d && d.kids) for (const [id, g] of d.kids) A.kids.set(id, g); if (d && d.woven) for (const id of d.woven) A.woven.add(id); A.scan(); };
  if (persist && persist.register) persist.register('abilities', { prio: 55, save: () => A.save(), load: d => A.load(d) });
  return A; }
