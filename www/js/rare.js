// RARE OHMS (PROPOSALS, Wilbow "yes to all 5", Sun Oct 25 2026 4:12 PM MDT; text: rare_ohms_spec.md). One module, five toggles
// (R.opts, dev panel "rare ohms", all on):
//  rare    (1) rare ohms by ear and eye: an uncommon mix in the seed (raresound.js rareSig) - blended instruments / a rare tuning /
//              extra overtones, shimmer + extra glow rings + an unusual body. Wild ones at the hidden life spots (env.js, already
//              built), the occasional gifted hatchling ('breed'), rare wild teachers on distant planets (they teach whoever is near).
//  xp      (2) experience in tiers, no cap; each tier unlocks: 1 teach more patterns, 2 carry longer songs, 3 change the ground and
//              weather nearby, 4 travel to the next scale, then each keeps deepening. A rare ohm starts with a head start OR one
//              unique trait; a raised ohm can earn every ability, the rare one keeps its signature sound and look.
//  keep    (3) experience never fades; children get a share of their parents' (off: no share, a slow fade).
//  persona (4) seeded traits bold/shy, curious/settled, social/loner, playful/serious (+ calm..lively from the body genes) shape
//              wandering, how often it starts jams, learning speed, touch reaction, ahead / behind the beat; seen only in movement,
//              timing and glow (never a label).
//  moments (5) a high-tier ohm's music changes the ground and weather near you; planet harmony opens the next scale (discord keeps
//              it closed: the bank's canAdvance, read only); each unfound rare wild ohm is heard from far before it is found.
//              While it is closed, zooming out past zMin is a SOFT resistance by default (slows more the further you push, eases
//              back when you let go, push on through 'through' and you are out; harmony earned here softens it). 'hard' (off; Wilbow
//              Q341 4:48 PM: "Slow it and thats all"): a hard stop at zMin instead, never the default.
// Hooks for other tracks: o.rarity (0 | 1), o.rareKind ('wild' | 'gift' | 'teacher'), o.rareSig, o.xp, o.tier, o.personality
// { calm (0 calm .. 1 lively), bold, curious, social, playful, traits: [...] }, o.tradition (the planet's, read defensively).
// Looks: look.rare(g, o, x, y, r, layer, info) draws a rare ohm (layer 0 behind the body, 1 in front); return true to replace the
// placeholder rings + shimmer drawn here. Engine data only: no lore, no labels on screen.
import { rng } from './rng.js';
import { recipes, makeRecipe } from './recipe.js';
import { restPoint, RING } from './genes.js';
import { rareSig, RARE_SOUND } from './raresound.js';
import { tradition as songTradition } from './songs.js';
import { toScreen } from './space.js';
import { noLine, softRing } from './soft.js';   // v0.0.30 G8
import { cam as VC, setDepth } from './view.js';

export const RARE_OPTS = { rare: true, xp: true, keep: true, persona: true, moments: true,
  giftP: .06, teacherTier: 3, headTier: 2, base: 8, share: .25, fade: .005, patternsMax: 6,
  wander: .05, jamLean: .4, learnLean: .5, beatMs: 12, swingMs: 4, touchLean: .7,
  groundTier: 3, near: 8, open: 12, zMin: -1.45, hard: false, through: .55, resist: 4, ease: 6, easeBack: false, minOhms: 2, travelTier: 4, revealFar: 40, revealBars: 2 };

const h32 = (a, b) => { let h = ((a >>> 0) * 2654435761 ^ (b >>> 0) * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return (h ^ (h >>> 13)) >>> 0; };
export const xpFor = (t, base = RARE_OPTS.base) => base * t * (t + 1) / 2;   // xp needed for tier t (uncapped, gently steeper)
export const tierOf = (xp, base = RARE_OPTS.base) => { let t = 0; while (xpFor(t + 1, base) <= xp) t++; return t; };
// a few seeded traits; calm and social lean on the body genes so they agree with how it already moves (genes.js)
export function personaOf(seed, g = {}) { const r = rng(h32(seed, 0x9e75)), cl = x => Math.max(0, Math.min(1, x));
  const p = { calm: cl(1 - ((g.calm != null ? g.calm : .6) - .35) / .5), bold: r(), curious: r(), social: cl(((g.social != null ? g.social : .65) - .3) / .7 * .7 + r() * .3), playful: r() };
  p.traits = [p.bold >= .5 ? 'bold' : 'shy', p.curious >= .5 ? 'curious' : 'settled', p.social >= .5 ? 'social' : 'loner', p.playful >= .5 ? 'playful' : 'serious']; return p; }

export function createRare(ctx) { const { sim, bus, music, world: W, systems, brain, persist, autojam } = ctx;
  const O = { ...RARE_OPTS }, R = { opts: O, saved: new Map(), open: new Set(), arrive: new Map(), lastNote: new Map(), lastBar: -1, nextScan: 0, ms: 0, tiers: 0, reveals: 0, grounds: 0, gifts: 0, taughtX: 0 };
  W.rare = R; R.cam = VC; const now = () => music.now(), beat = () => music.beat();
  const pkey = () => (W.pseed || W.seed || 1) >>> 0, B = () => systems && systems.bank, teach = () => systems && systems.teach;
  const ohms = () => sim.ohms || [];
  // ---- tradition: the planet's (traditions track: world.tradition(planet)), else the songs' seeded one ----
  const tcache = new Map(); R.traditionOf = ps => { try { if (typeof W.tradition === 'function') { const t = W.tradition(ps); if (t) return t; } } catch (e) { }
    let t = tcache.get(ps); if (!t) { try { t = songTradition(ps); } catch (e) { t = null; } tcache.set(ps, t); } return t; };
  // ---- per ohm ----
  const SH = { star: { lobes: 5, lobeAmt: .2 }, long: { aspect: 1.65, lobeAmt: .05 }, twin: { lobes: 2, lobeAmt: .24 }, wave: { lobes: 4, lobeAmt: .13 } };
  const rest = o => { const b = o.body, t = [0, 0]; if (!b || !b.rest) return; for (let i = 0; i < RING; i++) { restPoint(o.g, i, t); b.rest[i * 2] = t[0]; b.rest[i * 2 + 1] = t[1]; } };
  const shapeOn = o => { const g = o.g, s = SH[o.rareSig.shape]; if (!g || !s || g._rare === o.rareSig.seed) return; g._orig = { lobes: g.lobes, lobeAmt: g.lobeAmt, aspect: g.aspect }; Object.assign(g, s); g._rare = o.rareSig.seed; rest(o); };
  const shapeOff = o => { const g = o.g; if (!g || !g._orig) return; Object.assign(g, g._orig); delete g._orig; delete g._rare; rest(o); };
  const sound = (o, on) => { const rec = recipes.get(o.recipe); if (!rec) return; if (on && isRare(o)) { if (!rec.rare || rec.rare.seed !== o.rareSig.seed) rec.rare = o.rareSig; } else if (rec.rare) delete rec.rare; };
  const setXp = (o, x) => { o.xp = Math.max(0, x); const t = tierOf(o.xp, O.base); if (o.tier != null && t > o.tier) { R.tiers++; bus.post({ type: 'rare.tier', src: o, tier: t }); o.glow = Math.min(1.4, (o.glow || 0) + .6); } o.tier = t; };
  R.addXp = (o, n) => { if (!o || o.dead || !O.xp) return; setXp(o, (o.xp || 0) + n); };
  // rare = rarity AND its signature (v0.0.29 fix, rare.js:68 crash under load): traditions.js stamps every ohm on 'spawn' with a FALLBACK
  // getter o.rarity = o.wild ? 1 : 0 (for builds without this file). env.js sets o.wild = true on a hidden-spot spawn BEFORE posting
  // 'world.life', so markRare's old `if (o.rarity) return` saw the getter's 1 and returned without ever writing o.rareSig; the next
  // ensure() / tick / draw then read o.rareSig.seed of undefined. Same for a restored save (sv.kind && !o.rarity). rareSig is the marker now.
  const isRare = o => !!(o && o.rarity && o.rareSig); R.isRare = isRare;
  R.markRare = (o, kind) => { if (!o || isRare(o)) return o; const sig = rareSig(o.seed || o.id); o.rarity = 1; o.rareKind = kind; o.rareSig = sig;
    const r = rng(h32(o.seed || o.id, 0x51a7)); o.rareStart = r() < .5 ? 'head' : 'trait'; if (o.rareStart === 'trait') o.rareTrait = ['teacher', 'weather', 'memory'][Math.floor(r() * 3)];
    const t0 = kind === 'teacher' ? O.teacherTier : o.rareStart === 'head' ? O.headTier : 0; if (t0 && (o.xp || 0) < xpFor(t0, O.base)) setXp(o, xpFor(t0, O.base)); else setXp(o, o.xp || 0);
    if (O.rare) { sound(o, true); shapeOn(o); } bus.post({ type: 'rare.found', src: o, kind, sig }); return o; };
  const ensure = o => { if (o.scale !== 'ohm' || !o.body) return;
    if (!o.personality) { o.personality = personaOf(o.seed || o.id, o.g); Object.defineProperty(o, 'tradition', { configurable: true, enumerable: false, get: () => R.traditionOf(o.planet || pkey()) }); }
    const sv = R.saved.get(o.seed >>> 0); if (sv) { R.saved.delete(o.seed >>> 0); if (sv.xp > (o.xp || 0)) setXp(o, sv.xp); if (sv.kind && !isRare(o)) R.markRare(o, sv.kind); }
    if (o.xp == null) setXp(o, 0);
    o.learnK = O.persona ? 1 + O.learnLean * (o.personality.curious - .5) : 1;
    if (isRare(o)) { if (O.rare) { sound(o, true); if (o.g && o.g._rare !== o.rareSig.seed) shapeOn(o); } else { sound(o, false); shapeOff(o); } } };
  // ---- channels: wild at the hidden spots (teachers when the planet is distant), gifted hatchlings ----
  R.distant = () => { const G = W.galaxy, S = W.system; return !!((G && G.cur) || (S && S.cur >= 2)); };
  bus.on('world.life', ev => { const o = ev.src; if (!o) return; ensure(o); R.markRare(o, R.distant() ? 'teacher' : 'wild'); });
  bus.on('breed', ev => { const c = ev.src; if (!c) return; ensure(c); const rec = recipes.get(c.recipe); if (rec && rec.rare && !isRare(c)) delete rec.rare;   // a child copies a parent's recipe: the rare colour is not inherited
    if (O.keep && O.xp) { const a = ev.a, b = ev.b, m = ((a && a.xp) || 0) / 2 + ((b && b.xp) || 0) / 2; if (m > 0) setXp(c, (c.xp || 0) + O.share * m); }
    if (rng(h32(ev.seed || c.seed, 0x61f7))() < O.giftP) { R.gifts++; R.markRare(c, 'gift'); } });
  // tier 1+: teaches more patterns than an ordinary lesson (teach.js copies TEACH_OPTS.patterns); the rare 'teacher' trait too
  bus.on('teach', ev => { const A = ev.src, Bo = ev.to; if (!O.xp || !A || !Bo || !brain || !brain.list) return; const T = teach(), base = (T && T.opts && T.opts.patterns) || 2;
    const extra = Math.min(O.patternsMax, (A.tier || 0) + (A.rareTrait === 'teacher' && O.rare ? 2 : 0)); if (extra <= 0) return;
    const l = brain.list(A, 'pattern').sort((x, y) => y.strength - x.strength).slice(base, base + extra);
    for (const p of l) { brain.remember(Bo, 'pattern', p.key, JSON.parse(JSON.stringify(p.data)), p.strength * .4); R.taughtX++; } });
  // tier 2+: carries longer songs (brain note capacity)
  if (brain && brain.capOf) { const cap0 = brain.capOf; brain.capOf = o => { const c = cap0(o); if (!O.xp || !o) return c; const t = Math.max(0, (o.tier || 0) - 1) + (o.rareTrait === 'memory' && O.rare ? 2 : 0); return Math.round(c * (1 + .25 * t)); }; }
  // ---- personality: jam lean (autojam presence), ahead / behind the beat (note time, after its beat is booked), touch ----
  if (autojam && autojam.presence) { const pr0 = autojam.presence; autojam.presence = (a, b) => { const k = pr0(a, b); if (!O.persona || !a || !b || !a.personality || !b.personality) return k;
    const m = (a.personality.social + a.personality.playful + b.personality.social + b.personality.playful) / 4; return Math.min(1, k * (1 + O.jamLean * (m - .5) * 2)); }; }
  const post0 = bus.post; bus.post = ev => { if (ev && ev.type === 'note' && O.persona && ev.t != null && ev.src && ev.src.personality && ev.src.scale === 'ohm' && ev.src !== sim.ohm && (ev.kind === 'note' || ev.kind === 'strike')) {
      const p = ev.src.personality; let ms = -(p.bold - .5) * 2 * O.beatMs; if (p.playful > .5) ms += ((h32(ev.src.seed, Math.floor((ev.beat || 0) * 4)) / 4294967296) - .5) * 2 * O.swingMs * p.playful;
      const t = ev.t + ms / 1000, t0 = music.when ? music.when(now()) : now(); ev.t = Math.max(Math.min(ev.t, t0), t); ev.lean = ms; }
    return post0(ev); };
  bus.on('touch', ev => { if (ev.kind !== 'tap' || !O.persona) return; for (const o of ohms()) { if (!o.personality || o === sim.ohm) continue; const dx = o.body.x - ev.x, dy = o.body.y - ev.y, d = Math.hypot(dx, dy) || 1; if (d >= 2.5) continue;
    const a = (1 - d / 2.5) * 1.6, k = (o.personality.bold - .5) * 2; o.body.vx -= dx / d * a * O.touchLean * k; if (k > 0) o.glow = Math.min(1.4, (o.glow || 0) + .25 * k); else o.glow *= 1 + .5 * k; } });
  bus.on('note', ev => { const o = ev.src; if (o && o.scale === 'ohm' && ev.kind !== 'release' && ev.kind !== 'level') R.lastNote.set(o.id, ev.beat != null ? ev.beat : beat()); });
  // ---- moments: the next scale gate (planet harmony; discord holds it: bank.canAdvance, read only) ----
  R.harmony = () => { const b = B(); if (!b) return 0; const k = pkey(); if (!R.arrive.has(k)) R.arrive.set(k, b.earned || 0); return Math.max(0, (b.earned || 0) - R.arrive.get(k)); };
  R.gate = () => { if (!O.moments) return true; const b = B(), k = pkey(), disc = b && b.canAdvance ? !b.canAdvance() : false; if (disc) return false;
    if (ohms().filter(o => o !== sim.ohm && !o.parked && !o.away).length < O.minOhms) return true;   // nobody here to make harmony with: never trapped
    if (R.open.has(k)) return true; const f = sim.ohm; if (R.harmony() >= O.open || (O.xp && f && (f.tier || 0) >= O.travelTier)) { R.open.add(k); bus.post({ type: 'rare.open', planet: k }); return true; } return false; };
  // soft resistance (default): each step out past zMin is divided by 1 + resist * strength * depth past / through; strength = 1 - harmony / open
  R.strength = () => Math.max(0, 1 - R.harmony() / O.open);
  R.through = false;
  // v0.0.23 (Wilbow 6:26 PM: "keep that smooth zooming"): the slowing is a property of the DEPTH, not of how far one pinch has pushed:
  // over the band zMin .. zMin - through the zoom speed dips smoothly to 1 / (1 + resist * strength) and comes back to full at the far
  // edge (speed = 1 - (1 - min) * sin^2(pi * depth past / through): continuous at both edges, no jump when you are through), progress
  // stays between pinches and letting go rests where you are (no spring back; the world snap waits while you are in the band).
  // The old per-pinch resistance + ease back to the planet stays behind opts.easeBack (OFF by default, dev panel).
  const band = p => { const st = R.strength(), fmin = 1 / (1 + O.resist * st), sn = Math.sin(Math.PI * p / O.through); return 1 - (1 - fmin) * sn * sn; };
  const zHoldDepth = z => { const cam = VC, at = O.zMin, end = at - O.through;
    if (!R.closed || !O.moments || O.hard || z >= cam.z || z >= at || cam.z <= end) return z;
    let pos = cam.z; const rest = cam.z - z, n = Math.min(200, Math.max(1, Math.ceil(rest / .01))), h = rest / n;
    for (let i = 0; i < n; i++) pos -= h * (pos >= at || pos <= end ? 1 : band(at - pos));
    if (pos <= end && !R.through) { R.through = true; bus.post({ type: 'rare.through', planet: pkey() }); }
    return pos; };
  const zHoldEase = z => { const cam = VC, at = O.zMin; if (R.closed && O.moments && z < cam.z && z < -1) R.held = true;   /* a zoom out while it is closed: let go and it eases back */
    if (!R.closed || O.hard || R.through || z >= cam.z || z >= at) return z;
    const base = Math.min(cam.z, at); let p = at - base, rest = base - z; const st = R.strength();
    for (let i = 0; i < 4; i++) p += rest / 4 / (1 + O.resist * st * p / O.through);   /* small sub-steps: the slowing grows smoothly with depth */
    if (p >= O.through) { R.through = true; bus.post({ type: 'rare.through', planet: pkey() }); }
    return at - p; };
  VC.zHold = z => O.easeBack ? zHoldEase(z) : zHoldDepth(z);
  const gateTick = () => { const cam = VC; const open = R.gate(); R.closed = !open;
    if (open || !O.hard) { if (cam.zMin === O.zMin) delete cam.zMin; } else cam.zMin = O.zMin;
    if (cam.z > O.zMin + .3) R.through = false; if (cam.z >= -1.02 || R.through || !R.closed) R.held = false;   /* back on the planet: the resistance is there again next time */
    if (!O.easeBack) { const rest = !!(R.closed && O.moments && !O.hard && !(cam.dir > 0) && cam.z < -1.02 && cam.z > O.zMin - O.through); if (rest) cam.noSnap = true; else if (cam.noSnap) delete cam.noSnap; R.held = false; return; }   /* in the band: rest where you let go */
    if (cam.noSnap) delete cam.noSnap;
    if (!R.held || cam.active || cam.lockZ) return;
    /* let go while still held (soft band, the hard wall, or heading out before zMin): the view eases back to the planet instead of springing on out */
    cam.dir = 1; if (!(W.opts && W.opts.snap)) { const dt = Math.min(.05, R.dtE || .016); setDepth(cam.z + (-1 - cam.z) * Math.min(1, O.ease * dt)); } };
  // ---- moments: ground + weather from a high-tier ohm's music near you; the reveal of each unfound rare wild ohm ----
  const sounding = (o, b) => { const l = R.lastNote.get(o.id); return l != null && b - l < 4.5; };
  const ground = b => { const E = W.env, f = sim.ohm; let wc = 0, ww = 0; if (!f || !W.uOf) return;
    for (const o of ohms()) { if (o.parked || o.away || !o.body) continue; const t = (o.tier || 0) + (o.rareTrait === 'weather' && O.rare ? O.groundTier : 0); if (t < O.groundTier || !sounding(o, b)) continue;
      const d = Math.hypot(o.body.x - f.body.x, o.body.y - f.body.y); if (d > O.near) continue; const k = Math.min(1, .5 + .15 * (t - O.groundTier)) * (1 - d / O.near);
      if ((Math.floor(b / 4) + o.id) % 2 === 0) { bus.post({ type: 'terrain.change', kind: 'raise', u: W.uOf(o.body.x), w: Math.min(.6, .1 + .02 * t), amt: .006 * k, lush: .6 + .4 * k, t: music.timeOfBeat ? music.timeOfBeat(b) : now(), dur: music.spb() * 4, src: o, rare: 1 }); R.grounds++; }
      const s = (h32(o.seed, 0xc10d) & 1) ? 1 : -1; wc += s * .18 * k; ww += .12 * k; }
    if (E && E.wx) { E.wx.cloud = Math.max(-.4, Math.min(.4, wc)); E.wx.wind = Math.min(.3, ww); } };
  let VS = null; const revealSrc = () => { if (VS) return VS; VS = sim.add({ id: 131, scale: 'world', recipe: makeRecipe(131, { name: 'rare call' }).id, hue: 0 }); return VS; };
  const reveal = b => { const L = W.home, G = L && L.globe, sp = G && G.lifeSpots; if (!sp || !sp.length || !W.placeU || !(W.env && W.env.opts.life)) return; const u = W.placeU(), C = G.Cs || (W.planet && W.planet.C) || 240;
    for (const s of sp) { if (s.found) continue; let dx = ((s.u - u) % C + C) % C; if (dx > C / 2) dx -= C; const d = Math.abs(dx); if (d > O.revealFar || d < .35) continue;
      const v = revealSrc(), rec = recipes.get(v.recipe), want = s.seed >>> 0; if (!rec._for || rec._for !== want) { const src = makeRecipe(want, { name: 'rare call ' + want, add: false }); for (const k of ['modal', 'synth', 'mix', 'inst', 'hue']) if (src[k] != null) rec[k] = JSON.parse(JSON.stringify(src[k])); rec.fx = []; rec.mods = []; rec.rare = rareSig(want); rec._for = want; }
      const k = 1 - d / O.revealFar, r = rng(h32(want, 0xca11)), n = 3 + Math.floor(r() * 2), b0 = Math.floor(b / 4) * 4 + 4;
      for (let i = 0; i < n; i++) { const bt = b0 + i * (r() < .5 ? .5 : 1); bus.note({ src: v, kind: 'note', deg: Math.floor(r() * 7), oct: r() < .3 ? 1 : 0, vel: .06 + .3 * k * k, t: music.timeOfBeat(bt), beat: bt, dur: .8, pan: Math.max(-.85, Math.min(.85, dx / 8)), gainK: .3 + .7 * k }); }
      R.reveals++; return; } };
  // ---- the tick: a cheap scan; once a bar the experience, teachers, moments ----
  R.tick = () => { const t0 = performance.now(); R.dtE = R.lastT ? (t0 - R.lastT) / 1000 : .016; R.lastT = t0; const b = beat(), bar = Math.floor(b / 4), tn = now();
    if (tn >= R.nextScan) { R.nextScan = tn + .25; for (const o of ohms()) ensure(o); }
    if (O.persona) { const ph = tn; for (const o of ohms()) { const p = o.personality; if (!p || o === sim.ohm || o.parked || o.away || !o.body) continue;
      if (p.calm > .5) o.glow = Math.max(o.glow || 0, .05 * (p.calm - .5) * 2 * (1 + Math.sin(ph * (1.5 + 2 * p.calm) + o.id)) / 2);
      if (p.curious > .55 && !o.body.grab && Math.random() < O.wander * (p.curious - .5) * 2 * .05) o.body.vx += (Math.random() < .5 ? -1 : 1) * (.4 + .8 * p.bold); } }
    if (bar !== R.lastBar) { R.lastBar = bar; R.bar(b); } gateTick(); R.ms = performance.now() - t0; };
  R.bar = b => { const f = sim.ohm, S = systems && systems.songs, J = sim.jam, withYou = J && J.partner && J.until > b ? J.partner : null;
    if (O.xp) { for (const G of (S && S.groups) || []) if (G.state === 'song') { const you = G.members.includes(f); for (const o of G.members) R.addXp(o, you ? 1.5 : 1); }
      for (const P of (autojam && autojam.jams) || []) { R.addXp(P.a, .3 * (P.k || 0)); R.addXp(P.b, .3 * (P.k || 0)); }
      if (withYou) { R.addXp(withYou, 1.5); R.addXp(f, 1); } else if (f && sounding(f, b)) R.addXp(f, .5); }
    if (!O.keep) for (const o of ohms()) if (o.xp > 0) setXp(o, o.xp * (1 - O.fade));
    const T = teach(); if (O.rare && T && T.teach && (Math.floor(b / 4) % 4) === 0) for (const A of ohms()) { if (A.rareKind !== 'teacher' || A.parked || A.away) continue;
      let best = null, bd = 3; for (const o of ohms()) { if (o === A || o.parked || o.away || o.rareKind === 'teacher') continue; const d = Math.hypot(o.body.x - A.body.x, o.body.y - A.body.y); if (d < bd) { bd = d; best = o; } } if (best) T.teach(A, best, true); }
    if (O.moments) { ground(b); if (b - (R.lastReveal || -99) >= O.revealBars * 4 - .01) { R.lastReveal = b; reveal(b); } } else if (W.env && W.env.wx) { W.env.wx.cloud = W.env.wx.wind = 0; } };
  // ---- the placeholder look (Visuals draw the real one through look.rare) ----
  const P = { x: 0, y: 0, s: 1 };
  R.draw = (g, Wd, H, look, layer) => { if (!O.rare) return; const t = now();
    for (const o of ohms()) { if (!isRare(o) || o.parked || !o.body) continue; const s = toScreen(Wd, H, sim.cam, o.body.x, o.body.y, P), r = (o.g ? o.g.r : 1) * s.s; if (s.x < -3 * r || s.x > Wd + 3 * r || s.y < -3 * r || s.y > H + 3 * r || r < 1.5) continue;
      const info = { sig: o.rareSig, tier: o.tier, kind: o.rareKind, personality: o.personality, t, glow: o.glow || 0 };
      if (look && look.rare) { try { if (look.rare(g, o, s.x, s.y, r, layer, info)) continue; } catch (e) { } }
      const hue = ((o.hue || 0) + o.rareSig.hueK * 140) % 360, n = 2 + o.rareSig.kinds.length, br = 1 + Math.min(.6, (o.glow || 0) * .4);
      g.save(); g.globalCompositeOperation = 'lighter';
      if (layer === 0) for (let i = 0; i < n; i++) { const rr = r * (1.3 + .28 * i + .05 * Math.sin(t * 1.7 + i)), a0 = t * (.6 + .25 * i) * (i % 2 ? -1 : 1) + i;
        if (noLine('lnRare')) { softRing(g, s.x, s.y, rr, Math.max(3, r * .12), `${(hue + i * 25) % 360},45%,75%`, (.32 - .05 * i) * br * .6); continue; }   /* v0.0.30 G8 lnRare: the placeholder ring is a full soft ring of light (no dashed arcs) */
        g.strokeStyle = `hsla(${(hue + i * 25) % 360},90%,${70 + 6 * i}%,${(.32 - .05 * i) * br})`; g.lineWidth = Math.max(1, r * (.07 - .01 * i));
        for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(s.x, s.y, rr, a0 + k * 2.094, a0 + k * 2.094 + 1.3 + .4 * Math.sin(t + k)); g.stroke(); } }
      else { const m = 7 + 2 * o.rareSig.kinds.length; for (let k = 0; k < m; k++) { const a = t * (.9 + .1 * (k % 3)) + k * 6.283 / m, rr = r * (1.05 + .5 * ((k * 37 % 10) / 10)), tw = .5 + .5 * Math.sin(t * 5 + k * 1.9);
        g.fillStyle = `hsla(${(hue + k * 11) % 360},100%,88%,${.65 * tw * br})`; g.beginPath(); g.arc(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr, Math.max(1, r * .05 * (.6 + tw)), 0, 6.283); g.fill(); } }
      g.restore(); } };
  // ---- save: per seed (ohms come back by seed), the opened planets ----
  R.save = () => ({ v: 1, ohms: ohms().filter(o => (o.xp || 0) > 0 || isRare(o)).map(o => [o.seed >>> 0, +(o.xp || 0).toFixed(2), isRare(o) ? o.rareKind : 0]), open: [...R.open] });
  R.load = d => { if (!d || d.v !== 1) return; for (const [seed, xp, kind] of d.ohms || []) R.saved.set(seed >>> 0, { xp, kind }); for (const k of d.open || []) R.open.add(k); for (const o of ohms()) ensure(o); };
  if (persist && persist.register) persist.register('rare', { prio: 50, save: () => R.save(), load: d => R.load(d) });
  // ---- dev panel ----
  R.attachPanel = root => { if (!root || typeof document === 'undefined') return; const el = document.createElement('details'); el.id = 'dv-rare'; root.appendChild(el);
    const L = { rare: '1 rare ohms: rare sound + look (wild at hidden spots, gifted hatchlings, teachers on distant planets)', xp: '2 experience tiers, no cap (teach more / longer songs / ground + weather / next scale)', keep: '3 experience never fades; children get a share', persona: '4 personalities shape wandering, jams, learning, touch, timing', moments: '5 big moments: ground + weather, harmony opens the next scale, hear a rare ohm from far', hard: '5 hard stop at the next scale while closed (off: soft resistance - Wilbow Q341: slow it)', easeBack: '5 old soft resistance: per pinch, letting go eases back to the planet (off: the slowing belongs to the depth, rests where you let go)' };
    const render = () => { const f = sim.ohm, n = ohms().filter(o => isRare(o)).length; el.innerHTML = `<summary>rare ohms (PROPOSALS, defaults on)</summary><div>rare here ${n} | you tier ${f ? f.tier || 0 : 0} (xp ${f ? (f.xp || 0).toFixed(1) : 0}) | next scale ${R.closed ? 'closed' : 'open'} (harmony ${R.harmony().toFixed(1)}/${O.open})</div>`;
      for (const k in L) { const l = document.createElement('label'); l.innerHTML = `<span>${L[k]}</span><input type="checkbox" ${O[k] ? 'checked' : ''}><i></i>`; l.querySelector('input').onchange = e => { O[k] = e.target.checked; if (k === 'rare') RARE_SOUND.on = O.rare; for (const o of ohms()) ensure(o); if (k === 'moments' && !O.moments) gateTick(); }; el.appendChild(l); } };
    render(); el.addEventListener('toggle', () => { if (el.open) render(); }); R.panel = el; };
  return R; }
