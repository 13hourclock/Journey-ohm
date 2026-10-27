// RARE OHMS (rare.js + raresound.js, PROPOSALS Wilbow 4:12 PM MDT Oct 25 2026): node checks of the pure parts, then the real page.
// 1 rare sound never moves the pitch, a rare look + body; channels wild / gift / teacher. 2 tiers with no cap and their abilities.
// 3 no fade, children's share. 4 seeded personalities and their effects. 5 ground + weather, the next-scale gate, the far reveal.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
import http from 'http'; import fs from 'fs'; import path from 'path';
import { rareSig, rareVoices } from '../www/js/raresound.js';
import { xpFor, tierOf, personaOf } from '../www/js/rare.js';
import { makeRecipe, voicesFor } from '../www/js/recipe.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// ---- node: pure parts ----
const s1 = rareSig(777), s2 = rareSig(777); ok(JSON.stringify(s1) === JSON.stringify(s2) && s1.kinds.length >= 1, `rare signature is the seed's (${s1.kinds.join('+')}, shape ${s1.shape})`);
const kinds = new Set(); for (let i = 1; i < 200; i++) for (const k of rareSig(i * 7919).kinds) kinds.add(k); ok(kinds.size === 3, 'all three signatures occur: ' + [...kinds].join(', '));
let pitchOk = true, colour = 0; for (let i = 1; i < 60; i++) { const rec = makeRecipe(i * 104729, { name: 't' + i }); const ev = { f: 220, vel: .7, dur: 1 };
  const a = voicesFor(rec, ev); rec.rare = rareSig(i * 31337); const b = voicesFor(rec, ev);
  for (let k = 0; k < Math.min(a.length, b.length); k++) { if (a[k].f != null && a[k].f !== b[k].f) pitchOk = false; if (a[k].modes && b[k].modes && a[k].modes[0].f !== b[k].modes[0].f) pitchOk = false; }
  if (JSON.stringify(a) !== JSON.stringify(b)) colour++; }
ok(pitchOk, 'the fundamental never moves: every voice keeps its f and first mode');
ok(colour >= 55, `the rare colour changes the voices (${colour}/59 recipes sound different)`);
ok(xpFor(1) === 8 && tierOf(xpFor(4)) === 4 && tierOf(xpFor(4) - .01) === 3 && tierOf(xpFor(60)) === 60, 'tiers: no cap (tier 60 reachable), each needs a bit more');
const p = personaOf(99, { calm: .4, social: .9 }); ok(JSON.stringify(p) === JSON.stringify(personaOf(99, { calm: .4, social: .9 })) && p.traits.length === 4 && ['calm', 'bold', 'curious', 'social', 'playful'].every(k => p[k] >= 0 && p[k] <= 1), 'personality: seeded, 0..1 axes, four traits: ' + p.traits.join(' '));
ok(personaOf(5, { calm: .84 }).calm < .1 && personaOf(5, { calm: .36 }).calm > .9, 'calm..lively follows the calm body gene');
// ---- browser ----
const { chromium } = require('playwright');
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
await new Promise(r => srv.once('listening', r)); const port = srv.address().port;
const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const pg = await br.newPage({ viewport: { width: 412, height: 915 } });
const errs = []; pg.on('pageerror', e => { errs.push(String(e)); if (process.env.RARE_STACK) console.log(e.stack); }); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(`http://127.0.0.1:${port}/?fresh=1&autostart=1`); await pg.waitForTimeout(2500);
let r = await pg.evaluate(() => { const R = JO.rare, os = JO.sim.ohms; return { has: !!R && !!R.tick, n: os.length, pers: os.every(o => o.personality && o.personality.traits.length === 4), trad: os.every(o => o.tradition && o.tradition.seed != null), tier: os.every(o => o.tier === Math.max(0, o.tier) && o.xp >= 0 && o.tier != null), opts: R && Object.keys(R.opts).slice(0, 5) }; });
ok(r.has && r.pers && r.tier, `every ohm gets a personality + a tier (${r.n} ohms); toggles ${JSON.stringify(r.opts)}`); ok(r.trad, 'o.tradition: the planet\'s tradition (songs fallback until track/traditions)');
// 1: a wild rare ohm at a hidden spot (the env.js event), its sound + look + body
r = await pg.evaluate(() => { const S = JO.sim, f = S.ohm, o = S.spawn(f.body.x + 2.5, f.body.y, 4242001); const lob = [o.g.lobes, o.g.lobeAmt, o.g.aspect].join(); JO.events.post({ type: 'world.life', u: 0, src: o });
  const rec = [...(globalThis.__recipes || [])]; return { id: o.id, rare: o.rarity, kind: o.rareKind, sig: !!o.rareSig, tier: o.tier, start: o.rareStart, trait: o.rareTrait || '', lob, lob2: [o.g.lobes, o.g.lobeAmt, o.g.aspect].join() }; });
ok(r.rare === 1 && r.kind === 'wild' && r.sig, `a hidden-spot ohm is rare (${r.kind}, ${r.start}${r.trait ? ' ' + r.trait : ''}, tier ${r.tier})`);
ok(r.lob !== r.lob2, `unusual body: lobes/amt/aspect ${r.lob} -> ${r.lob2}`); ok(r.start === 'head' ? r.tier === 2 : !!r.trait, 'a head start (tier 2) or one unique trait');
const rid = r.id;
r = await pg.evaluate(async id => { const o = JO.sim.byId.get(id), C = document.querySelector('canvas'); JO.sim.cam.x = o.body.x; JO.sim.cam.y = o.body.y; await new Promise(q => setTimeout(q, 400));
  let hit = 0; const L = JO.render.look; const was = L.rare; L.rare = () => { hit++; return false; }; await new Promise(q => setTimeout(q, 300)); L.rare = was; return { hit }; }, rid);
ok(r.hit > 0, `look.rare hook is called for the rare ohm (${r.hit} calls in 0.3 s), placeholder drawn otherwise`);
// 2: abilities by tier
r = await pg.evaluate(id => { const R = JO.rare, a = JO.sim.ohms.find(o => o !== JO.sim.ohm && !o.rarity), cap0 = JO.brain.capOf(a); R.addXp(a, 1e3); return { tier: a.tier, cap0, cap1: JO.brain.capOf(a) }; }, rid);
ok(r.tier >= 14 && r.cap1 > r.cap0, `xp 1000 -> tier ${r.tier} (no cap); carries longer songs: note capacity ${r.cap0} -> ${r.cap1}`);
r = await pg.evaluate(() => { const B = JO.brain, os = JO.sim.ohms.filter(o => o !== JO.sim.ohm), A = os.find(o => o.tier >= 14), Bo = os.find(o => o !== A && !o.rarity && o.tier === 0);
  for (let i = 0; i < 6; i++) B.remember(A, 'pattern', 'rt' + i, { rh: [0, 1, 2, 3], iv: [i % 3 + 1, 1, -2], len: 4 }, 1 - i * .1); const before = B.list(Bo, 'pattern').length; JO.systems.teach.teach(A, Bo, true); return { before, after: B.list(Bo, 'pattern').length, x: JO.rare.taughtX }; });
ok(r.after - r.before >= 4 && r.x > 0, `a tier-1+ teacher teaches more patterns (${r.after - r.before} in one lesson, ordinary 2)`);
// 3: never fades; children get a share
r = await pg.evaluate(() => { const R = JO.rare, os = JO.sim.ohms, A = os.find(o => o.tier >= 14), x0 = A.xp; for (let i = 0; i < 50; i++) R.bar(JO.music.beat()); const x1 = A.xp;
  const a = os.find(o => o !== A && o !== JO.sim.ohm), b = os.find(o => o !== A && o !== a && o !== JO.sim.ohm); R.addXp(a, 40); R.addXp(b, 40); const c = JO.systems.teach.breed(a, b); return { x0, x1, cx: c ? c.xp : -1, ax: a.xp, bx: b.xp }; });
ok(r.x1 >= r.x0, `xp never fades (${r.x0.toFixed(1)} -> ${r.x1.toFixed(1)} after 50 bars)`); ok(r.cx > 0, `a child starts with a share of its parents' xp (${r.cx.toFixed(1)})`);
// 4: personality: touch reaction, beat lean, learning speed
r = await pg.evaluate(() => { const os = JO.sim.ohms.filter(o => o !== JO.sim.ohm), o = os[0]; const l = []; for (const q of os) l.push(+q.learnK.toFixed(2));
  const ev = JO.events.note({ src: o, kind: 'note', deg: 0, oct: 0, vel: .01, t: JO.music.now() + .5 }); return { lean: ev.lean, bold: o.personality.bold, l }; });
ok(r.lean != null && Math.sign(r.lean || 1e-9) === Math.sign(.5 - r.bold || 1e-9) || Math.abs(r.lean) < 5, `plays ahead / behind the beat by personality (bold ${r.bold.toFixed(2)} -> ${r.lean.toFixed(1)} ms)`);
ok(new Set(r.l).size > 1, 'learning speed differs by curiosity: ' + r.l.join(' '));
// 5: gate, ground, reveal
const prep = () => { const R = JO.rare, f = JO.sim.ohm; f.xp = 0; f.tier = 0; R.open.clear(); R.arrive.clear(); R.through = false; R.held = false; JO.zoom.zoomAbout(-1, 206, 329); R.tick(); };
// soft (default): past zMin each equal finger step moves less, deeper; let go and it RESTS there (v0.0.23: "slow it and that's all";
// the old ease-back is the easeBack switch); push on and you are through
r = await pg.evaluate(async prepS => { const prep = eval('(' + prepS + ')'); const R = JO.rare, cam = R.cam, B = JO.systems.bank; prep();
  const hard0 = R.opts.hard, closed = R.closed, zm = cam.zMin, steps = []; let z = cam.z;
  for (let i = 0; i < 6; i++) { const z0 = cam.z; JO.zoom.zoomAbout(z0 - .1, 206, 329); steps.push(+(z0 - cam.z).toFixed(3)); }
  const zHeld = cam.z, held = R.held; await new Promise(r => setTimeout(r, 1500)); const zBack = cam.z;
  prep(); R.opts.easeBack = true; for (let i = 0; i < 6; i++) JO.zoom.zoomAbout(cam.z - .1, 206, 329); const eHeld = cam.z, eh = R.held; await new Promise(r => setTimeout(r, 1500)); const eBack = cam.z; R.opts.easeBack = false;
  prep(); const e0 = B.earned || 0; B.earned = e0 + 6; R.tick(); const st = R.strength(), closedH = R.closed; for (let i = 0; i < 6; i++) JO.zoom.zoomAbout(cam.z - .1, 206, 329); const zH = cam.z; B.earned = e0;
  prep(); let n = 0; while (!R.through && n < 200) { JO.zoom.zoomAbout(cam.z - .1, 206, 329); n++; } const through = R.through, zT = cam.z; JO.zoom.zoomAbout(cam.z - .3, 206, 329); const zT2 = cam.z;
  await new Promise(r => setTimeout(r, 400)); const zT3 = cam.z; JO.zoom.zoomAbout(-1, 206, 329); await new Promise(r => setTimeout(r, 300));
  // discord: still only slows
  prep(); const d0 = B.discord; B.discord = .9; R.tick(); const disc = R.closed, dz0 = cam.z; JO.zoom.zoomAbout(-1.3, 206, 329); JO.zoom.zoomAbout(-1.5, 206, 329); JO.zoom.zoomAbout(-1.6, 206, 329); const dz = cam.z; B.discord = d0;
  // hard (switch, off by default): a stop at zMin
  prep(); R.opts.hard = true; R.tick(); const hzm = cam.zMin; JO.zoom.zoomAbout(-3, 206, 329); const hz = cam.z; R.opts.hard = hard0; R.tick(); const hzOff = cam.zMin; JO.zoom.zoomAbout(-1, 206, 329);
  B.earned = e0 + 20; R.tick(); const open = R.closed; JO.zoom.zoomAbout(-1.6, 206, 329); const zO = cam.z; B.earned = e0; R.open.clear(); JO.zoom.zoomAbout(-1, 206, 329); await new Promise(r => setTimeout(r, 300)); JO.zoom.zoomAbout(0, 206, 329);
  return { hard0, closed, zm, steps, zHeld, held, zBack, eHeld, eh, eBack, st, closedH, zH, n, through, zT, zT2, zT3, disc, dz, hzm, hz, hzOff, open, zO }; }, prep.toString());
console.log('     soft steps', JSON.stringify(r.steps), 'held', r.zHeld.toFixed(3), 'back', r.zBack.toFixed(3), 'half harmony', r.zH.toFixed(3), 'through after', r.n, 'steps at', r.zT.toFixed(2));
ok(r.hard0 === false && r.closed && r.zm == null, 'closed on arrival, soft by default (no hard stop set)');
ok(r.steps[0] > r.steps[r.steps.length - 1] && r.steps[r.steps.length - 1] < .1 && r.steps[r.steps.length - 1] > 0 && r.zHeld < -1.45, `past -1.45 the zoom slows progressively but still moves (${r.zHeld.toFixed(3)})`);
ok(Math.abs(r.zBack - r.zHeld) < .02, `let go and it rests where you let go, no spring back (${r.zHeld.toFixed(3)} -> ${r.zBack.toFixed(3)})`);
ok(r.eh && r.eHeld < -1.3 && r.eBack > -1.06, `easeBack switch (off by default): let go and it eases back to the planet as before (${r.eHeld.toFixed(3)} -> ${r.eBack.toFixed(3)})`);
ok(r.closedH && r.st < 1 && r.zH < r.zHeld, `harmony lowers the resistance (strength ${r.st.toFixed(2)}, same pinch reaches ${r.zH.toFixed(3)})`);
ok(r.through && r.zT2 < r.zT - .25 && r.zT3 < -1.9, `push on and you are through to the next scale (${r.n} steps, then free: ${r.zT2.toFixed(2)}, stays ${r.zT3.toFixed(2)})`);
ok(r.disc && r.dz < -1.45 && r.dz > -1.6, `discord only slows it (closed, the pinch to -1.6 reaches ${r.dz.toFixed(3)})`);
ok(r.hzm === -1.45 && r.hz >= -1.4501 && r.hzOff == null, `hard-stop switch (off by default) stops at ${r.hz.toFixed(2)}; off again clears it`);
ok(!r.open && r.zO <= -1.599, `planet harmony opens it: the zoom is free (${r.zO.toFixed(2)})`);
r = await pg.evaluate(() => { const R = JO.rare, f = JO.sim.ohm, o = JO.sim.ohms.find(q => q.tier >= 14); o.body.x = f.body.x + 1; const b = JO.music.beat(); R.lastNote.set(o.id, b); const g0 = R.grounds; R.bar(b); R.bar(b + 4);
  return { g: R.grounds - g0, wx: JSON.stringify(JO.world.env.wx) }; });
ok(r.g > 0, `a high-tier ohm's music changes the ground near you (${r.g} terrain events) and weather ${r.wx}`);
r = await pg.evaluate(() => { const R = JO.rare, G = JO.world.home && JO.world.home.globe; if (!G) return { skip: 1 }; const u = JO.world.placeU(); G.lifeSpots = (G.lifeSpots || []).concat([{ u: u + 12, seed: 99173, found: false }]); const n0 = R.reveals, s0 = JO.events.sent; R.lastReveal = -99; R.bar(JO.music.beat()); return { n: R.reveals - n0, s: JO.events.sent - s0 }; });
ok(r.skip || (r.n === 1 && r.s >= 3), `an unfound rare ohm 12 widths away is heard first (${r.n} call, ${r.s} notes)`);
// toggles + save
r = await pg.evaluate(id => { const R = JO.rare, o = JO.sim.byId.get(id), sh = () => [o.g.lobes, o.g.lobeAmt, o.g.aspect].join(), lb = sh(), rec = () => !!JO.sim.recipes; R.opts.rare = false; R.nextScan = 0; R.tick(); const off = [sh() !== lb]; R.opts.rare = true; R.nextScan = 0; R.tick(); off.push(sh() === lb);
  R.opts.moments = false; R.open.clear(); R.tick(); const zm = R.cam.zMin, zc = R.closed; R.opts.moments = true; const s = R.save(); return { off, zm, zc, s: s.ohms.length, rareSaved: s.ohms.some(x => x[2] === 'wild') }; }, rid);
ok(r.off[0] && r.off[1], 'toggle 1 off restores the body, on brings the rare look back'); ok(r.zm == null && !r.zc, 'toggle 5 off: the next scale is free as before');
ok(r.s > 0 && r.rareSaved, `saved per seed (${r.s} ohms with xp / rarity)`);
ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await br.close(); srv.close(); console.log(fails ? `RARE FAIL ${fails}` : 'RARE OK'); process.exit(fails ? 1 : 0);
