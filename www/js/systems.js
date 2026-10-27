// SYSTEMS TRACK WIRING (PLAN_SYSTEMS.md; SUMMARY.md wins). One call from main.js builds and connects: the undo stack (undo.js), save /
// restore (persist.js), spiral spawn (spawn.js), SONGS (songs.js), the '?' helper (helper.js), the river DAW (daw.js), mouth control
// (mouth.js), walk in an ohm's shoes (walk.js), fusions / colonies (fuse.js), plants (plants.js), the harmony bank (here) and the
// gesture router (gestures.js). Every option is a reversible default in sim.opts.systems (dev panel), never a fixed rule.
import { toScreen, toWorld } from './space.js';
import { cam, setDepth } from './view.js';
import { recipes, toJSON, fromJSON } from './recipe.js';
import { createUndo } from './undo.js';
import { createSpawn } from './spawn.js';
import { createEgg } from './egg.js';
import { createClay } from './clay.js';
import { createSongs } from './songs.js';
import { createHelper } from './helper.js';
import { createDaw } from './daw.js';
import { createGestures } from './gestures.js';
import { createMouth } from './mouth.js';
import { createWalk } from './walk.js';
import { createFuse } from './fuse.js';
import { createPlants } from './plants.js';
import { createTeach } from './teach.js';
import { createSoft } from './softbody.js';
// HARMONY AS CURRENCY (PLAN_SYSTEMS 8 / PLAN_REAL_PLANET 1; audit B8 lists it for the world track - the bank is here so both can use it).
// Earned every bar from music in tune (songs earn more than jams; a song's drift / discord earns nothing and costs a little). The
// planet's discord (mean drift of its playing songs) above `gate` HOLDS BACK the next scale: world / planet code asks bank.canAdvance().
// What harmony is SPENT on is open (Q306): bank.spend(n, what) exists, nothing spends by default.
export const BANK_OPTS = { on: true, song: 1, jam: .3, discordCost: .5, gate: .35 };
export function createBank(songs, autojam, bus, opts = {}) { const O = { ...BANK_OPTS, ...opts }, B = { opts: O, harmony: 0, earned: 0, spent: 0, discord: 0, lastBar: -1, log: [] };
  B.bar = () => { if (!O.on) return 0; let e = 0, dsum = 0, n = 0; for (const G of songs.groups) if (G.state === 'song') { const d = songs.discord(G); dsum += d; n++; e += O.song * G.members.length * (1 - d) - O.discordCost * d * G.members.length; }
    for (const P of autojam.jams || []) if (!(songs.groupOf(P.a) && songs.groupOf(P.a).state === 'song')) e += O.jam * (P.k || 0); B.discord = n ? dsum / n : B.discord * .9; e = Math.max(-1, e); B.harmony = Math.max(0, B.harmony + e); if (e > 0) B.earned += e; return e; };
  B.canAdvance = () => !O.on || B.discord <= O.gate;
  B.spend = (n, what) => { if (B.harmony < n) return false; B.harmony -= n; B.spent += n; B.log.push({ n, what, at: Date.now() }); if (B.log.length > 20) B.log.shift(); bus.post({ type: 'harmony.spend', n, what }); return true; };
  B.save = () => ({ h: B.harmony, e: B.earned, s: B.spent, d: B.discord }); B.load = d => { B.harmony = d.h || 0; B.earned = d.e || 0; B.spent = d.s || 0; B.discord = d.d || 0; };
  return B; }
export function createSystems(ctx) { const { sim, bus, music, harmony, autojam, world, sing, render, canvas, panel, persist, brain } = ctx, Wo = world;
  const O = sim.opts.systems = Object.assign({ holdSpawn: false }, sim.opts.systems || {}); sim.opts.holdSpawn = O.holdSpawn;   // the spiral spawns; hold-still spawn off (reversible)
  const size = () => render.size(), ts = {}, tw = {};
  const sys = { O };
  sys.toS = (x, y) => { const { W, H } = size(); return toScreen(W, H, sim.cam, x, y, {}); };
  sys.toW = (x, y) => { const { W, H } = size(); return toWorld(W, H, sim.cam, x, y, {}); };
  sys.ohmAt = (x, y) => { const { W, H } = size(); let best = null, bs = 1e9; for (const o of sim.ohms) { if (o.parked || o.dead || !o.g) continue; const s = toScreen(W, H, sim.cam, o.body.x, o.body.y, ts), r = Math.max(36, o.g.r * s.s * 1.15), d = Math.hypot(x - s.x, y - s.y); if (d < r && d < bs) { bs = d; best = o; } } return best; };
  sys.free = (x, y) => !sys.ohmAt(x, y);
  sys.recipeOf = o => { const r = o && recipes.get(o.recipe); return r ? toJSON(r) : null; };
  sys.depth = () => cam.z; sys.setDepth = z => setDepth(z);
  sys.panel = { toggle: () => panel && panel.toggle ? panel.toggle() : null };
  const undo = sys.undo = createUndo(bus, music);
  sys.spawn = createSpawn(sim, bus, undo);
  sys.egg = createEgg({ sim, bus, music, spawn: sys.spawn, undo, brain, toS: sys.toS });   // egg words (egg.js; switch eggWords, OFF = spiral hatches at once)
  sys.clay = createClay({ sim, bus, music, spawn: sys.spawn, undo, brain, toS: sys.toS });   // clay shaping (clay.js; switch clay, OFF = spiral hatches at once)
  const songs = sys.songs = createSongs(sim, bus, music, harmony, autojam); sys.autojam = autojam;
  sim.held = songs.held;
  sys.helper = createHelper(sim, bus, music, sys);
  sys.daw = createDaw(sim, bus, music, sys);
  sys.mouth = createMouth(sim, bus, music, sing, sys);
  sys.walk = createWalk(sim, bus, music, sys);
  sys.fuse = createFuse(sim, bus, undo);
  sys.plants = createPlants(sim, bus, music, Wo);
  sys.bank = createBank(songs, autojam, bus); Wo.harmonyBank = sys.bank;
  sys.teach = createTeach(sim, bus, music, harmony, autojam, brain, undo, sys);   // teach line + epigenetics + breeding (teach.js)
  sys.soft = createSoft(sim, bus, sys);   // squish / stretch / flick / pinch shape on the soft ring (softbody.js)
  sys.gestures = createGestures(canvas, sim, bus, sys);
  // build-round switches (Wilbow's 3:58 / 4:00 PM Oct 25 answers): { k, label, get, set, info? }; other modules (main.js) add theirs too
  sys.switches = [
    { k: 'frejoin', label: 'split halves can rejoin when in range (Q355; off = the old ~4 min wait)', get: () => sys.fuse.opts.rejoin, set: v => { sys.fuse.opts.rejoin = v; } },
    { k: 'fleave', label: 'split halves must leave range once before re-sticking (proposed guard, OFF)', get: () => sys.fuse.opts.leaveFirst, set: v => { sys.fuse.opts.leaveFirst = v; } }];
  // ---- save / restore parts
  if (persist) { const P = persist;
    P.register('music', { prio: 0, save: () => ({ beat: music.beat(), bpm: music.bpm, om: music.om, key: music.key, tuning: music.tuning, lock: music.lock, chord: music.chord || null }),
      load: d => { if (d.tuning) music.setTuning(d.tuning); if (d.om) music.setOm(d.om); if (d.bpm && d.lock === false) music.setBpm(d.bpm); if (d.lock != null) music.setLock(d.lock);   // setBpm unlocks: lock last (was: a locked tempo came back unlocked)
        if (d.key != null) music.setKey(d.key); if (d.chord) music.chord = d.chord; music.a = { t: music.now(), b: d.beat || 0 }; } });
    P.register('world', { prio: 1, save: () => ({ seed: Wo.seed, cur: Wo.system ? Wo.system.cur : 0, sys: Wo.galaxy ? Wo.galaxy.cur : 0, cam: { x: sim.cam.x, y: sim.cam.y }, z: cam.z }),
      load: d => { if (Wo.restoreLand && d.cur != null && Wo.system) Wo.restoreLand(d.cur, d.sys); if (d.z != null) setDepth(d.z); if (d.cam) { sim.cam.x = d.cam.x; sim.cam.y = d.cam.y; } } });
    P.register('ohms', { prio: 2, save: () => ({ next: sim.ids.next, focus: sim.ohm && sim.ohm.id, list: sim.ohms.filter(o => o.scale === 'ohm' && !o.dead).map(o => ({ id: o.id, seed: o.seed, x: o.body.x, y: o.body.y, fl: o.g ? !!o.g.float : false, born: o.born || null, rec: recipes.get(o.recipe) ? toJSON(recipes.get(o.recipe)) : null })) }),
      load: d => { for (const q of d.list || []) { let o; if (q.id === d.focus) { o = sim.reseed(q.seed); o.body.x = q.x; o.body.y = q.y; } else if (sim.byId.get(q.id)) { o = sim.byId.get(q.id); o.body.x = q.x; o.body.y = q.y; } else { const ev = bus.post({ type: 'spawn', x: q.x, y: q.y, seed: q.seed, id: q.id, born: null }); o = ev.src; if (q.born) o.born = q.born; }
          if (!o) continue; if (q.rec) { const rec = fromJSON(q.rec); bus.post({ type: 'recipe', src: o, rec }); } if (o.g) { o.g.float = q.fl; o.body.homeY = q.y; } } sim.ids.next = d.next || sim.ids.next; } });
    P.register('jam', { prio: 3, save: () => [...(autojam.mem || new Map()).entries()], load: d => { if (autojam.mem) for (const [k, v] of d) autojam.mem.set(k, v); } });
    P.register('songs', { prio: 4, save: () => songs.save(), load: d => songs.load(d) });
    P.register('daw', { prio: 5, save: () => sys.daw.save(), load: d => sys.daw.load(d) });
    P.register('fuse', { prio: 5, save: () => sys.fuse.save(), load: d => sys.fuse.load(d) });
    P.register('plants', { prio: 5, save: () => sys.plants.save(), load: d => sys.plants.load(d), away: s => sys.plants.away(s) });
    P.register('teach', { prio: 3, save: () => sys.teach.save(), load: d => sys.teach.load(d) });
    P.register('bank', { prio: 5, save: () => sys.bank.save(), load: d => sys.bank.load(d) });
    P.register('brain', { prio: 9, save: () => { if (brain && brain.save) brain.save(); return undefined; } }); }
  // ---- per control tick
  let lastBar = -1; sys.tick = dt => { songs.tick(); if (sys.roles) sys.roles.tick(); sys.daw.tick(); sys.helper.tick(dt); sys.mouth.tick(dt); sys.walk.tick(dt); sys.fuse.tick(dt); sys.plants.tick(dt); sys.teach.tick(); sys.soft.tick(); if (sys.egg) sys.egg.tick(); if (sys.clay) sys.clay.tick(); if (sys.bubbles) sys.bubbles.tick(); if (sys.jamview) sys.jamview.tick(); if (sys.wind) sys.wind.tick(dt); if (sys.light) sys.light.tick(dt); if (sys.critters) sys.critters.tick(dt); if (persist) persist.tick();
    const bar = Math.floor(music.beat() / 4); if (bar !== lastBar) { lastBar = bar; sys.bank.bar(); } sim.opts.holdSpawn = O.holdSpawn; };
  // plants grow ON the ground: drawn by render under the ohms (render.under, right after its clear), never over them; without the hook, here as before
  sys.under = g => { sys.plants.draw(g, sys.toS); if (sys.wind) sys.wind.draw(g, sys.toS); if (sys.light) sys.light.draw(g, sys.toS); if (sys.critters) sys.critters.draw(g, sys.toS); }; if (render && !('under' in render && render.under)) render.under = sys.under;
  // ---- overlay, drawn after the world each frame
  sys.draw = () => { const g = canvas.getContext('2d'), { W, H } = size(); if (!W) return; const dpr = canvas.width / W; g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    try { if (!(render && render.under === sys.under)) { sys.plants.draw(g, sys.toS); if (sys.wind) sys.wind.draw(g, sys.toS); if (sys.light) sys.light.draw(g, sys.toS); if (sys.critters) sys.critters.draw(g, sys.toS); } sys.teach.draw(g, sys.toS); sys.fuse.draw(g, sys.toS, sys.look); songs.draw(g, W, H, sys.toS, sys.look); sys.mouth.draw(g); sys.walk.draw(g); sys.helper.draw(g, W, H); if (sys.roles) sys.roles.draw(g, sys.toS, sys.look || {}); sys.daw.draw(g, W, H); if (sys.egg) sys.egg.draw(g, sys.toS); if (sys.clay) sys.clay.draw(g, sys.toS); if (sys.bubbles) sys.bubbles.draw(g); if (sys.jamview) sys.jamview.draw(g); sys.gestures.draw(g); } catch (e) { sys.err = String(e); } g.restore(); };
  // ---- dev panel: the song library and the systems switches
  sys.attachPanel = root => { if (!root || typeof document === 'undefined') return; const el = document.createElement('details'); el.id = 'dv-sys'; root.appendChild(el);
    const render = () => { const rows = [...songs.lib.values()].map(s => `<div class="row" data-id="${s.id}"><span>${s.name} <i>(${s.origin}${s.trad ? ', tradition' : ''}, ${s.plays || 0} plays)</i></span><button data-a="play">play near</button><button data-a="midi">MIDI</button><button data-a="trad">tradition</button><button data-a="del">delete</button></div>`).join('');
      const B = sys.bank; el.innerHTML = `<summary>systems: songs, river, save, harmony (PROPOSALS, defaults on)</summary><i>song library (${songs.lib.size})</i>${rows}
        <div>harmony ${B.harmony.toFixed(1)} (earned ${B.earned.toFixed(1)}, spent ${B.spent.toFixed(1)}) | discord ${B.discord.toFixed(2)} ${B.canAdvance() ? '' : '(holds the next scale)'}</div>
        <div>save: ${persist ? (persist.bytes / 1024).toFixed(1) + ' kB, ' + persist.saves + ' saves, away ' + Math.round(persist.away || 0) + ' s' : 'off'} | undo ${undo.done.length}/${undo.undone.length}</div>
        <label><span>hold still on bare ground also spawns</span><input type="checkbox" data-o="holdSpawn" ${O.holdSpawn ? 'checked' : ''}><i></i></label>
        <label><span>ohms make songs from jams</span><input type="checkbox" data-o="songs" ${songs.opts.on ? 'checked' : ''}><i></i></label>
        <label><span>long songs have breakdowns (most drop out, build back) | ${songs.bds}</span><input type="checkbox" data-o="breakdown" ${songs.opts.breakdown ? 'checked' : ''}><i></i></label>
        <label><span>plants grow from music</span><input type="checkbox" data-o="plants" ${sys.plants.opts.on ? 'checked' : ''}><i></i></label>
        <label><span>harmony bank (discord holds the next scale)</span><input type="checkbox" data-o="bank" ${sys.bank.opts.on ? 'checked' : ''}><i></i></label>
        <label><span>teach line (A teaches B) | taught ${sys.teach.taught}</span><input type="checkbox" data-o="teach" ${sys.teach.opts.on ? 'checked' : ''}><i></i></label>
        <label><span>ohms that keep jamming breed (in key only) | born ${sys.teach.born}, refused ${sys.teach.refused}</span><input type="checkbox" data-o="breed" ${sys.teach.opts.breed ? 'checked' : ''}><i></i></label>
        <label><span>out of key: rough duet when they refuse</span><input type="checkbox" data-o="duet" ${sys.teach.opts.duet ? 'checked' : ''}><i></i></label>
        <label><span>child's phrase: seams fitted + cadences</span><input type="checkbox" data-o="fit" ${sys.teach.opts.fit ? 'checked' : ''}><i></i></label>
        <label><span>child's body genes from its parents</span><input type="checkbox" data-o="bodyX" ${sys.teach.opts.bodyX ? 'checked' : ''}><i></i></label>
        <label><span>soft bodies: squish / stretch / pinch shape</span><input type="checkbox" data-o="soft" ${sys.soft.opts.on ? 'checked' : ''}><i></i></label>
        <label><span>flick an ohm to send it flying | ${sys.soft.flicks} flicks</span><input type="checkbox" data-o="flick" ${sys.soft.opts.flick ? 'checked' : ''}><i></i></label>
        <label><span>quick wide 2-finger spread on a fused cluster splits it | ${sys.fuse.splits} splits</span><input type="checkbox" data-o="fsplit" ${sys.fuse.opts.spread ? 'checked' : ''}><i></i></label>
        ${sys.switches.map(w => `<label><span>${w.label}${w.info ? ' | ' + (typeof w.info === 'function' ? w.info() : w.info) : ''}</span><input type="checkbox" data-o="${w.k}" ${w.get() ? 'checked' : ''}><i></i></label>`).join('')}
        <div class="row"><button data-a="save">save now</button><button data-a="fresh">fresh world on next launch</button><button data-a="refresh">refresh list</button></div>`; };
    el.addEventListener('toggle', () => { if (el.open) render(); });
    el.addEventListener('change', e => { const k = e.target.dataset.o, v = e.target.checked; if (k === 'holdSpawn') O.holdSpawn = v; else if (k === 'fsplit') sys.fuse.opts.spread = v; else if (k === 'songs') songs.opts.on = v; else if (k === 'breakdown') songs.opts.breakdown = v; else if (k === 'plants') sys.plants.opts.on = v; else if (k === 'bank') sys.bank.opts.on = v; else if (k === 'teach') sys.teach.opts.on = v; else if (k === 'breed') sys.teach.opts.breed = v; else if (k === 'duet' || k === 'fit' || k === 'bodyX') sys.teach.opts[k] = v; else if (k === 'soft') sys.soft.opts.on = v; else if (k === 'flick') sys.soft.opts.flick = v; else { const w = sys.switches.find(x => x.k === k); if (w) w.set(v); } });
    el.addEventListener('click', e => { const a = e.target.dataset && e.target.dataset.a; if (!a) return; const row = e.target.closest('[data-id]'), id = row ? +row.dataset.id || row.dataset.id : null;
      if (a === 'play') songs.playNear(id); else if (a === 'trad') songs.makeTradition(id); else if (a === 'del') songs.remove(id);
      else if (a === 'midi') { const b = songs.midi(id); if (b) { const s = songs.lib.get(id), u = URL.createObjectURL(new Blob([b], { type: 'audio/midi' })), l = document.createElement('a'); l.href = u; l.download = (s ? s.name : 'song').replace(/[^\w-]+/g, '_') + '.mid'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); } }
      else if (a === 'save' && persist) persist.save('panel'); else if (a === 'fresh' && persist) persist.forget(); render(); }); };
  return sys; }
