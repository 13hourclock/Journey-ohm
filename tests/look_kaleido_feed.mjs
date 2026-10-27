// lookfeed -> kaleido (v0.0.21): every lookfeed field is read when present, and the old fallback stays when it is absent.
// node tests/look_kaleido_feed.mjs [wwwDir]
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const www = path.resolve(process.argv[2] || 'www');
const { createKaleidoSound } = await import(pathToFileURL(path.join(www, 'js/look/kaleido.js')).href);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const mkBus = () => { const H = {}; return { on: (k, f) => (H[k] || (H[k] = [])).push(f), emit: (k, e) => (H[k] || []).forEach(f => f(e)) }; };
const ION = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8], AEO = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5];
const mkMusic = (o = {}) => ({ key: 0, om: 64, scale: { ratios: ION }, chord: { root: 0, tones: [0, 2, 4] }, jam: null, beat: t => t * 2, ...o });
const run = (music, feed, beats = 24, bus = mkBus(), pre) => { const K = createKaleidoSound({ music, bus, feed }); let r; for (let b = 0; b <= beats; b += .25) { if (pre) pre(b, bus); r = K.step({ beat: b, bp: (b / 4) % 1, dev: .5, big: 0, sym0: 6 }); } return r; };
// mode: the feed name wins over the scale's third
{ const a = run(mkMusic({ mode: 'locrian' }), {}), b = run(mkMusic({ mode: 'lydian' }), {}), c = run(mkMusic(), {});
  ok(a.feed.mode && b.feed.mode && !c.feed.mode, 'mode read from music.mode (fallback flagged when absent)'); ok(b.modeB > c.modeB && c.modeB > a.modeB, `mode brightness lydian ${b.modeB.toFixed(2)} > fallback ${c.modeB.toFixed(2)} > locrian ${a.modeB.toFixed(2)}`); }
// tension: harmony.tension, then ctx.songs.discord, then the root table
{ const hi = run(mkMusic(), { harmony: { tension: .9 } }), lo = run(mkMusic(), { harmony: { tension: .05 } }), fb = run(mkMusic(), { harmony: { tension: null } });
  ok(hi.feed.tension && lo.feed.tension && !fb.feed.tension, 'tension read from harmony.tension; null -> fallback'); ok(hi.tension > .8 && lo.tension < .1, `tension ${hi.tension.toFixed(2)} / ${lo.tension.toFixed(2)}`);
  const G = { state: 'song', song: {}, k: 1 }, sg = run(mkMusic(), { harmony: { tension: null }, songs: { groups: [G], discord: () => .7 } });
  ok(sg.feed.tension && Math.abs(sg.tension - .7) < .05, `ctx.songs.discord fallback ${sg.tension.toFixed(2)}`); }
// chord.kind: 'other' is richer than 'triad'; absent = fallback
{ const t = run(mkMusic({ chord: { root: 0, tones: [0, 2, 4], kind: 'triad' } }), {}), o = run(mkMusic({ chord: { root: 0, tones: [0, 3, 4], kind: 'other' } }), {}), n = run(mkMusic(), {});
  ok(t.feed.kind && o.feed.kind && !n.feed.kind, 'chord.kind read'); ok(o.rich > t.rich, `rich other ${o.rich.toFixed(2)} > triad ${t.rich.toFixed(2)}`); }
// timbre: ohm.timbre { bright, damp }, then ctx.recipeOf(o), then the seed hash
{ const note = (src) => (b, bus) => { if (b % 1 === 0) bus.emit('note', { kind: 'note', src, beat: b, vel: .8, dur: 1 }); };
  const sh = run(mkMusic(), {}, 8, mkBus(), note({ id: 1, timbre: { bright: .8, damp: .2 } })), so = run(mkMusic(), {}, 8, mkBus(), note({ id: 2, timbre: { bright: .3, damp: .8 } }));
  ok(sh.feed.timbre && sh.rings[0].sharp > .66 && so.rings[0].sharp < .4, `ohm.timbre sharp ${sh.rings[0].sharp.toFixed(2)} / soft ${so.rings[0].sharp.toFixed(2)}`);
  const rc = run(mkMusic(), { recipeOf: () => ({ modal: { p: { bright: .8, damp: .2 } } }) }, 8, mkBus(), note({ id: 3, recipe: 1 }));
  ok(rc.feed.timbre && rc.rings[0].sharp > .66, `ctx.recipeOf timbre ${rc.rings[0].sharp.toFixed(2)}`);
  const fb = run(mkMusic(), {}, 8, mkBus(), note({ id: 4, seed: 7 })); ok(!fb.feed.timbre && fb.rings.length === 1, 'no timbre -> seed-hash fallback'); }
// song: continuous progress drives the arc; 'end' starts the unwind
{ const s1 = run(mkMusic(), { song: { phase: 'develop', progress: .5, id: 1 } }); ok(s1.feed.song && s1.arc === 'song' && Math.abs(s1.songP - .5) < 1e-9, `ctx.song develop -> arc ${s1.arc}`);
  const s2 = run(mkMusic(), { song: { phase: 'end', progress: .95, id: 1 } }, 8); ok(s2.arc === 'end', `ctx.song end -> arc ${s2.arc}`);
  const s3 = run(mkMusic(), { song: null }); ok(!s3.feed.song && s3.arc === 'rest', 'no song -> rest (bus fallback)'); }
// jam: ctx.jam
{ const j = run(mkMusic(), { jam: { on: true, you: false, pairs: 1, k: .8, div: 0, snap: 0 } }), n = run(mkMusic(), { jam: { on: false, you: false, pairs: 0, k: 0 } }), f = run(mkMusic({ jam: { div: 4 } }), {});
  ok(j.feed.jam && j.jam > .9 && n.jam === 0 && !f.feed.jam && f.jam === 1, `ctx.jam ${j.jam.toFixed(2)} / off ${n.jam} / music.jam fallback ${f.jam}`); }
// a throwing getter never breaks the frame
{ const bad = {}; Object.defineProperty(bad, 'song', { get: () => { throw new Error('x'); } }); let r = null; try { r = run(mkMusic(), bad); } catch (e) { r = null; } ok(r && r.arc === 'rest', 'throwing lookfeed getter -> fallback'); }
console.log(fail ? `${fail} FAILED` : 'all ok'); process.exit(fail ? 1 : 0);
