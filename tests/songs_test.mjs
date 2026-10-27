import { createSongs, DEV_SONGS, barsOf, tradition, songFromTradition } from '../www/js/songs.js';
import { fakeBus, fakeMusic, fakeSim } from './fakes.mjs';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const setup = (meet) => { const bus = fakeBus(), M = fakeMusic(), sim = fakeSim(6), H = {}, A = { jams: [], mem: new Map(), presence: () => .9 };
  const S = createSongs(sim, bus, M, H, A, { meet }); sim.held = S.held; return { bus, M, sim, H, A, S }; };
const bar = (E, n) => { for (let i = 0; i < n; i++) { E.M.b = (Math.floor(E.M.b / 4) + 1) * 4 + .01; E.S.tick(); } };
// 1 library
ok(DEV_SONGS.length >= 6 && barsOf(DEV_SONGS[0]).length === 34, 'dev library: 6 songs, Ode to Joy = 34 bars (AABA x8 + 2-bar ending)');
const T1 = tradition(777), T2 = tradition(777); ok(JSON.stringify(songFromTradition(T1, 5)) === JSON.stringify(songFromTradition(T2, 5)), 'planet tradition songs are deterministic per planet + group');
const s5 = songFromTradition(T1, 5); ok(barsOf(s5).at(-1).r === T1.cad.at(-1) && s5.hook.length >= 2, 'tradition song ends on its cadence and has a hook');
// 2 jam -> song when a hook catches (two members pick up the same phrase)
{ const E = setup(false), [a, b] = E.sim.ohms; E.A.jams = [{ a, b, k: .9 }];
  for (let i = 0; i < 12; i++) { const src = i % 2 ? a : b, b0 = (Math.floor(E.M.b / 4) + 1) * 4; bar(E, 1); for (const [d, off] of [[0, 0], [2, 1], [4, 2], [2, 3]]) E.bus.note({ src, kind: 'note', deg: d, beat: E.M.b + off * .9, auto: 1, jam: 1 }); }
  bar(E, 2); const G = E.S.groupOf(a); ok(E.S.caught === 1 && G && G.state === 'song', 'jam turned into a song after the hook caught (' + E.S.caught + ' caught)');
  const grown = [...E.S.lib.values()].find(s => s.origin === 'grown'); ok(grown && grown.hook.length === 4 && grown.form.length >= 2 && grown.end.length >= 1, 'grown song kept in the library with hook, form and ending');
  ok(E.S.held(a) && E.S.held(b) && !E.S.held(E.sim.ohms[3]), 'song members are held out of jam pairing');
  bar(E, 3); const sn = E.bus.notes.filter(n => n.song); ok(sn.length > 0 && sn.every(n => n.src === a || n.src === b), 'song members play their parts (' + sn.length + ' notes)');
  ok(E.H.hold() === true, 'a near song carries the chords (harmony holds)');
  const L = barsOf(grown), bi = Math.floor(E.M.b / 4) - G.start; ok(E.M.chord.root === L[bi].r, 'chord follows the song chart (root ' + E.M.chord.root + ')');
  ok(E.bus.ctls['song.on'] > 0, 'world hears song.on');
  const ends0 = E.S.ends; bar(E, L.length + 2); ok(E.S.ends > ends0 && E.bus.posts.some(p => p.type === 'song.end') && E.sim.world.bangs.some(k => k >= 2), 'song ends with a cadence event + a look burst');
  ok(G.state === 'rest' && !E.S.held(a), 'after the ending the group jams again (rest)');
  bar(E, 14); ok(G.state === 'song' && G.plays >= 1, 'then plays a song again');
  // save / load
  const snap = JSON.parse(JSON.stringify(E.S.save())), E2 = setup(false); E2.S.load(snap); ok(E2.S.lib.has(grown.id) && E2.S.groups.length === 1 && E2.S.groups[0].members.length === 2, 'library + groups survive save/load');
  const mid = E.S.midi('dev.ode'); ok(mid && String.fromCharCode(...mid.slice(0, 4)) === 'MThd' && mid.length > 200, 'MIDI export ' + (mid && mid.length) + ' bytes');
  // drift mends when you play the hook's notes near them
  const s = G.song, before = E.S.discord(G); E.sim.ohm = E.sim.ohms[5]; E.sim.ohm.body = { x: a.body.x, y: .1 }; for (let i = 0; i < 5; i++) E.bus.note({ src: E.sim.ohm, kind: 'note', deg: s.hook[0].d, inputT: 1 });
  ok(G.state !== 'song' || E.S.discord(G) < before, 'playing the hook near a song mends drift (' + before.toFixed(2) + ' -> ' + E.S.discord(G).toFixed(2) + ')'); }
// 3 groups you meet are already playing a song of the planet's tradition
{ const E = setup(true), [, , c, d] = E.sim.ohms; E.A.jams = [{ a: c, b: d, k: .8 }]; bar(E, 1); const G = E.S.groupOf(c);
  ok(G && G.state === 'song' && G.song.origin === 'world' && G.start < Math.floor(E.M.b / 4) + 2, 'met group is already mid-song (' + (G && G.song.name) + ')');
  bar(E, 2); ok(E.bus.notes.some(n => n.song && n.src === c), 'met group plays');
  // settle into a loop after repeated plays, wake on touch
  G.plays = 5; G.touch = -99; const L = barsOf(G.song); bar(E, L.length + 20); ok(G.settled === 1 || G.state === 'rest', 'settled song becomes a loop (settled=' + G.settled + ')');
  E.sim.ohm = E.sim.ohms[0]; E.sim.ohm.body = { x: c.body.x, y: 0 }; E.bus.note({ src: E.sim.ohm, kind: 'note', deg: 0, inputT: 1 }); ok(G.settled === 0, 'touching / playing near wakes the loop');
  let t = 0; for (let i = 0; i < 200; i++) { const t0 = performance.now(); bar(E, 1); t += performance.now() - t0; } ok(t / 200 < 1, 'songs tick per bar ' + (t / 200).toFixed(3) + ' ms'); }
// 4 your taps into a jam ohm go into that jam's current phrase (B6)
{ const E = setup(false), [a, b] = E.sim.ohms; E.A.jams = [{ a, b, k: .9 }]; E.A.mem.set('1-2', [0, 2]); E.bus.note({ src: a, kind: 'note', deg: 5, inputT: 1 }); ok(E.A.mem.get('1-2').join() === '0,2,5', 'your note added to the jam phrase'); }
// 5 BREAKDOWNS (R3.9 "Yes, add breakdowns"): a long song, after >= 2 sections: most members drop out, then build back one by one; never in the ending
{ const run = on => { const bus = fakeBus(), M = fakeMusic(), sim = fakeSim(6); sim.ohms[2].body.x = 2.4; sim.ohms[3].body.x = 3.2; const A = { jams: [], mem: new Map(), presence: () => .9 };
    const S = createSongs(sim, bus, M, {}, A, { meet: true, breakdown: on, bdChance: 1 }); sim.held = S.held; const E = { bus, M, sim, S }; const [a, b] = sim.ohms; A.jams = [{ a, b, k: .9 }];
    const per = new Map(); bus.on && 0; let G = null, bd = null, seen = 0;
    for (let i = 0; i < 70; i++) { const n0 = bus.notes.length; bar(E, 1); G = G || S.groupOf(a); if (G && G.bd && !bd) bd = { ...G.bd, start: G.start }; if (!G || G.state !== 'song') continue;
      for (const n of bus.notes.slice(n0)) if (n.song) { const bi = Math.floor(n.beat / 4); (per.get(bi) || per.set(bi, new Set()).get(bi)).add(n.src.id); } }
    for (const [k, v] of per) per.set(k, v.size);
    return { S, G, bd, per, posts: bus.posts.filter(p => p.type === 'song.breakdown').length, n: G ? G.members.length : 0 }; };
  const R = run(true), b = R.bd; if (process.env.DBG) console.log(b, [...R.per]); ok(R.n >= 3, 'breakdown setup: a group of ' + R.n);
  ok(b && R.posts >= 1 && R.S.bds >= 1, 'a long song calls a breakdown (' + (b ? 'bar ' + b.from + ', ' + b.len + ' bars' : 'none') + ', events ' + R.posts + ')');
  if (b) { const L = barsOf(R.G.song), endAt = L.findIndex(B => B.sec === 'end'), secN = L.slice(0, b.from).filter(B => B.first).length;
    ok(secN >= 2 && b.len >= 2 && b.len <= 4 && b.to < (endAt < 0 ? L.length : endAt), 'after >= 2 sections, 2-4 bars, not in the ending (sections before ' + secN + ')');
    const a0 = b.start + b.from, thin = R.per.get(a0 + 1), full = R.per.get(a0 + b.len), before = R.per.get(a0 - 1);
    ok(thin != null && thin <= 2 && thin >= 1, 'most drop out: ' + thin + ' of ' + R.n + ' play (the anchor + the lead keep it going)');
    ok(full === R.n && before === R.n && R.per.get(a0 + b.len - 1) >= thin, 'they build back in (' + [before, thin, full].join(' -> ') + ' voices)'); }
  const R0 = run(false); ok(R0.posts === 0 && !R0.bd, 'switch off: no breakdowns'); }
console.log(fails ? 'SONGS FAIL ' + fails : 'SONGS OK'); process.exit(fails ? 1 : 0);
