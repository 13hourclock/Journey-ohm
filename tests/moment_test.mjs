// big musical moment signal: world.moment(k, kind) only from real musical peaks (song climax, section drop, big group cadence)
import { createSongs, barsOf } from '../www/js/songs.js';
import { fakeBus, fakeMusic, fakeSim } from './fakes.mjs';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const setup = (meet, o = {}) => { const bus = fakeBus(), M = fakeMusic(), sim = fakeSim(6), H = {}, A = { jams: [], mem: new Map(), presence: () => .9 };
  sim.world.moments = []; sim.world.moment = (k, kind, info) => sim.world.moments.push({ k, kind, info });
  const S = createSongs(sim, bus, M, H, A, { meet, ...o }); sim.held = S.held; return { bus, M, sim, H, A, S }; };
const bar = (E, n) => { for (let i = 0; i < n; i++) { E.M.b = (Math.floor(E.M.b / 4) + 1) * 4 + .01; E.S.tick(); } };
// a met group playing a full song through: drops at the hook's returns, one climax at the final section, a cadence at the end
{ const E = setup(true, { cadenceN: 2 }), [, , c, d] = E.sim.ohms; E.A.jams = [{ a: c, b: d, k: .8 }]; bar(E, 1); const G = E.S.groupOf(c), L = barsOf(G.song);
  const M = E.sim.world.moments; M.length = 0; const ends0 = E.S.ends; bar(E, L.length + 2);
  const kinds = M.map(m => m.kind), secs = L.filter(B => B.first).length;
  ok(E.S.ends > ends0, 'the song played through (' + G.song.name + ', ' + L.length + ' bars, ' + secs + ' sections)');
  ok(M.length > 0 && M.length <= secs + 1, 'moments are rare: ' + M.length + ' for ' + secs + ' sections (' + kinds.join(',') + ')');
  ok(kinds.filter(k => k === 'climax').length <= 1, 'at most one climax per song');
  ok(kinds.includes('cadence'), 'the natural ending of a big enough group is a cadence moment');
  M.length = 0; let n = 0; while (G.state !== 'song' && n++ < 64) bar(E, 1); const s2 = G.song, L2 = barsOf(s2), st = G.start; bar(E, L2.length + 1); const k2 = M.map(m => m.kind);
  ok(k2.includes('climax') || k2.includes('drop'), 'a whole song (' + s2.form.join('') + ') raises its climax / drops: ' + k2.join(','));
  ok(M.length <= L2.filter(B => B.first).length, 'still rare: ' + M.length + ' moments in ' + L2.length + ' bars');
  ok(M.every(m => m.k > 0 && m.k <= 1 && m.info && m.info.group === G && typeof m.info.x === 'number'), 'k in 0..1, with group + position'); }
// a small group (2 < cadenceN 3) ending gives no cadence; a far song (k low) gives no moments
{ const E = setup(true), [, , c, d] = E.sim.ohms; E.A.jams = [{ a: c, b: d, k: .8 }]; bar(E, 1); const G = E.S.groupOf(c), L = barsOf(G.song); E.sim.world.moments.length = 0; bar(E, L.length + 2);
  ok(!E.sim.world.moments.some(m => m.kind === 'cadence'), 'a duo ending is not a big group cadence'); }
{ const E = setup(true, { cadenceN: 2 }); E.A.presence = () => .2; const [, , c, d] = E.sim.ohms; E.A.jams = [{ a: c, b: d, k: .8 }]; bar(E, 1); const G = E.S.groupOf(c);
  if (G) { E.sim.world.moments.length = 0; bar(E, barsOf(G.song).length + 2); } ok(E.sim.world.moments.length === 0, 'a far, faint song raises no moment'); }
// world.js: om changes / bangs never raise look.big (source check: W.bang does not touch big; only W.moment does)
{ const src = (await import('node:fs')).readFileSync(new URL('../www/js/world.js', import.meta.url), 'utf8'), bang = src.match(/W\.bang = k => \{[^\n]*/)[0];
  ok(!/big/.test(bang) && (src.match(/look\.big = /g) || []).length === 1 && /W\.look\.big = Math\.max\(W\.look\.big, k\)/.test(src), 'only W.moment raises look.big (om/key changes, landing, detents, spawns use W.bang)'); }
console.log(fails ? 'MOMENT FAIL ' + fails : 'MOMENT_OK'); process.exit(fails ? 1 : 0);
