// LEAVE + RETURN = THE SAME MUSIC (Wilbow flagged in the old game: coming back to the app gave a regenerated / reset tune). Two ways out:
//   1. backgrounding (screen off / home button: visibilitychange hidden + Capacitor 'pause', then visible + 'resume')
//   2. a full close + relaunch (the page is closed; a new one boots from the save)
// After each, the music must be the SAME: key / bpm / tuning / chord, the song library (ids + notes), each song group's song, state and
// place in the song (section), every jam's remembered phrase, each ohm's instrument + recipe, and what ohms learned (teach epi).
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); let pg = await ctx.newPage();
const errs = [], watch = p => { p.on('pageerror', e => errs.push(String(e) + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); }; watch(pg);
const U = `http://127.0.0.1:${port}/`, boot = async (p, q = '') => { await p.goto(U + q); await p.waitForFunction(() => globalThis.JO && JO.systems, null, { timeout: 15000 }); };
// the music fingerprint, taken inside the page; `beat` separately (it is allowed to move on, the rest is not)
const FP = () => { const { music, systems: S, sim, autojam, harmony } = JO, songs = S.songs, h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619); return (x >>> 0).toString(36); };
  const live = sim.ohms.filter(o => o.scale === 'ohm' && !o.dead).sort((a, b) => a.id - b.id);
  const beat = music.beat(), bar = Math.floor(beat / 4);
  return { beat, f: {
    music: { key: music.key, bpm: +music.bpm.toFixed(3), tuning: JSON.stringify(music.tuning), om: music.om, lock: music.lock, chord: JSON.stringify(music.chord || null) },
    lib: [...songs.lib.values()].map(s => s.id + ':' + h(JSON.stringify({ ...s, plays: 0 }))).sort(),
    groups: songs.groups.map(G => ({ ids: G.members.map(m => m.id).sort((a, b) => a - b).join(','), song: G.song && G.song.id, state: G.state, start: G.start, rest: G.rest, plays: G.plays })).sort((a, b) => a.ids < b.ids ? -1 : 1),
    jamMem: [...autojam.mem.entries()].map(([k, v]) => k + '=' + JSON.stringify(v)).sort(),
    songJams: [...songs.jams.values()].map(J => J.key + ':' + J.bars + ':' + JSON.stringify(J.roots)).sort(),
    ohms: live.map(o => { const r = JO.systems.recipeOf(o); return o.id + ':' + o.seed + ':' + (r ? h(JSON.stringify(r)) + ':' + JSON.stringify(r.inst || null) : '-') + ':home=' + harmony.home(o) + ':bpm=' + (+music.bpmFor(o).toFixed(3)) + ':body=' + (o.g ? ['r', 'calm', 'social', 'hear', 'float', 'eyes', 'legs', 'lobes'].map(k => +(+o.g[k]).toFixed(4)).join(',') : '-'); }),
    epi: live.filter(o => o.epi).map(o => o.id + ':' + JSON.stringify(o.epi)),
    parents: live.filter(o => o.parents).map(o => o.id + ':' + o.parents) },
    sec: songs.groups.filter(G => G.state === 'song').map(G => G.members.map(m => m.id).join(',') + '@' + (bar - G.start)) }; };
const diff = (a, b, p = '') => { const out = []; if (JSON.stringify(a) === JSON.stringify(b)) return out; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out.push(...diff(a[k], b[k], p + '.' + k)); return out; } return [p + ': ' + JSON.stringify(a).slice(0, 160) + ' -> ' + JSON.stringify(b).slice(0, 160)]; };
await boot(pg, '?fresh=1'); await pg.waitForTimeout(3000);
// set the scene: a song playing, a lesson learned, a bred child, jams running
const setup = await pg.evaluate(async () => { const { systems: S, sim } = JO, sl = ms => new Promise(r => setTimeout(r, ms)), live = () => sim.ohms.filter(o => o.scale === 'ohm' && !o.dead && !o.parked);
  const id = [...S.songs.lib.keys()][0]; const G = S.songs.playNear(id); const L = live().filter(o => o !== sim.ohm); const A = L[0], B = L[1], C = L[2];
  S.teach.teach(A, B); S.teach.teach(A, B); S.teach.teach(A, B); const kid = S.teach.breed(A, C);
  await sl(6000); return { song: id, group: G ? G.members.map(m => m.id) : null, playing: S.songs.groups.filter(g => g.state === 'song').length, kid: kid && kid.id, kidGx: !!(kid && kid.gx), jams: JO.autojam.mem.size, epi: B.epi }; });
console.log(JSON.stringify(setup));
ok(setup.playing > 0, 'a song is playing before leaving (' + setup.playing + ' groups)'); ok(setup.jams > 0, 'jams remembered before leaving (' + setup.jams + ')'); ok(setup.kid != null && setup.kidGx, 'a bred child exists, with body genes from its parents'); ok(setup.epi && setup.epi.key != null, 'an ohm learned a key');
// 1. background: hidden + pause, 2 s away, visible + resume
const inject = p => p.evaluate('window.FPx = ' + FP.toString());
await inject(pg);
const bg = await pg.evaluate(async () => { const sl = ms => new Promise(r => setTimeout(r, ms)), set = v => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => v }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v ? 'hidden' : 'visible' }); };
  const before = FPx(), saves = JO.persist.saves; set(true); document.dispatchEvent(new Event('visibilitychange')); document.dispatchEvent(new Event('pause')); const b0 = JO.music.beat(); await sl(2000); const b1 = JO.music.beat();
  set(false); document.dispatchEvent(new Event('visibilitychange')); document.dispatchEvent(new Event('resume')); await sl(60); const after = FPx(); return { before, after, b0, b1, saved: JO.persist.saves > saves }; });
for (const k of ['before', 'after']) console.log(k, 'beat', bg[k].beat.toFixed(2), 'sec', bg[k].sec.join(' '));
ok(bg.saved, 'backgrounding saves');
ok(Math.abs(bg.b1 - bg.b0) < .05, 'backgrounded: the music holds (beat ' + bg.b0.toFixed(2) + ' -> ' + bg.b1.toFixed(2) + ' over 2 s away)');
let d = diff(bg.before.f, bg.after.f); ok(!d.length, 'resume: the same music (songs, groups + section, jam phrases, instruments, keys, lessons) ' + d.slice(0, 6).join(' | '));
ok(JSON.stringify(bg.before.sec) === JSON.stringify(bg.after.sec), 'resume: the same place in each song ' + bg.before.sec + ' -> ' + bg.after.sec);
ok(bg.after.beat >= bg.before.beat - .01 && bg.after.beat - bg.before.beat < 1, 'resume: picks up at the same beat (' + bg.before.beat.toFixed(2) + ' -> ' + bg.after.beat.toFixed(2) + ')');
// 2. full close + relaunch: go to the background (Android always does before a kill), close the page, boot a new one
const pre = await pg.evaluate(() => { const f = FPx(); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); return f; });
await pg.close(); pg = await ctx.newPage(); watch(pg); await boot(pg);
await inject(pg); const post = await pg.evaluate(() => FPx());
console.log('closed  beat', pre.beat.toFixed(2), 'sec', pre.sec.join(' ')); console.log('relaunch beat', post.beat.toFixed(2), 'sec', post.sec.join(' '));
d = diff(pre.f, post.f); ok(!d.length, 'relaunch: the same music (songs, groups + section, jam phrases, instruments, keys, lessons) ' + d.slice(0, 6).join(' | '));
ok(JSON.stringify(pre.sec) === JSON.stringify(post.sec), 'relaunch: the same place in each song ' + pre.sec + ' -> ' + post.sec);
ok(post.beat >= pre.beat - .01 && post.beat - pre.beat < 1, 'relaunch: picks up at the same beat (' + pre.beat.toFixed(2) + ' -> ' + post.beat.toFixed(2) + ')');
// and it keeps playing the same song after a few seconds (not reset by the first bars)
const later = await pg.evaluate(async () => { await new Promise(r => setTimeout(r, 4000)); return JO.systems.songs.groups.filter(G => G.state === 'song').map(G => G.song && G.song.id); });
ok(later.length && later.every(id => pre.f.groups.some(g => g.song === id)), 'relaunch: still the same song(s) 4 s later ' + later);
// 3. the tune CONTINUES the same way: from one snapshot, the next 2 bars of jam phrases + song places in the original run and in a relaunched
//    run from that snapshot (nothing regenerated from scratch). Same browser profile (the brain's IndexedDB is shared, as on the phone).
const snapA = await pg.evaluate(async () => { JO.persist.save('test'); const s = localStorage.getItem(JO.persist.key), b0 = JO.music.beat(), sl = ms => new Promise(r => setTimeout(r, ms));
  while (JO.music.beat() < (Math.floor(b0 / 4) + 3) * 4 - .5) await sl(50); const f = FPx(); return { s, b0, f }; });
await pg.close(); pg = await ctx.newPage(); watch(pg); await pg.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, ['jo.save.v1', snapA.s]);
await boot(pg); await inject(pg);
const contB = await pg.evaluate(async b0 => { const sl = ms => new Promise(r => setTimeout(r, ms)); while (JO.music.beat() < (Math.floor(b0 / 4) + 3) * 4 - .5) await sl(50); return FPx(); }, snapA.b0);
d = diff(snapA.f.f.jamMem, contB.f.jamMem); ok(!d.length, 'continuation: the next 2 bars of jam phrases are the same as without leaving ' + d.slice(0, 4).join(' | '));
d = diff(snapA.f.f.groups, contB.f.groups); ok(!d.length && JSON.stringify(snapA.f.sec) === JSON.stringify(contB.sec), 'continuation: the songs move on the same way (' + snapA.f.sec + ' / ' + contB.sec + ') ' + d.slice(0, 4).join(' | '));
ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
await b.close(); srv.close(); console.log(fails ? 'RESUME TEST FAIL ' + fails : 'RESUME TEST OK'); process.exit(fails ? 1 : 0);
