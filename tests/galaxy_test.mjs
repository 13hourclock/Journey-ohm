// step 2 (world track): galaxy layer - several star systems you travel between, browser test
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = new URL('../www/', import.meta.url).pathname, TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const port = srv.address().port; let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2 });
const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
// STEP 2 (world track, PLAN_REAL_PLANET S-A): the galaxy layer - a seeded spiral galaxy of star systems (core, arms, clusters), pinch out to see them, pinch in to travel, land on their planets
await pg.goto(`http://127.0.0.1:${port}/?autostart&fresh=1`); await pg.waitForTimeout(1500);
await pg.evaluate(() => { localStorage.setItem('jo.devOpen', '0'); const d = document.getElementById('dev'); if (d) d.style.display = 'none'; });
const A = await pg.evaluate(() => { const W = JO.world, G = W.galaxy, S = W.system, k = s => s.map(q => [q.seed, q.x.toFixed(3), q.y.toFixed(3), q.ratio, q.tr.toFixed(3)].join()).join(';'), a = k(G.stars); G.build(); const b = k(G.stars);
let gap = 1e9; const cell = new Map(), A0 = S.aMax, K = (x, y) => Math.floor(x / (3 * A0)) + ',' + Math.floor(y / (3 * A0)); for (const p of G.stars) { const k = K(p.x, p.y); (cell.get(k) || cell.set(k, []).get(k)).push(p); }
  for (const p of G.stars) { const ix = Math.floor(p.x / (3 * A0)), iy = Math.floor(p.y / (3 * A0)); for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (const q of cell.get((ix + a) + ',' + (iy + c)) || []) if (q !== p) gap = Math.min(gap, Math.hypot(p.x - q.x, p.y - q.y) / A0); }
  const C = G.centre, Rg = G.shape.radius, rr = s => Math.hypot(s.x - C.x, s.y - C.y) / Rg, dens = (a, b) => G.stars.filter(s => rr(s) >= a && rr(s) < b).length / (b * b - a * a);
  const pops = {}; for (const q of G.stars) pops[q.pop] = (pops[q.pop] || 0) + 1;
  // arm contrast: at mid radii, how many disc+arm stars sit within the inner 30% of the angular gap between arms, vs a flat scatter
  const m = G.shape.arms, kk = 1 / Math.tan(G.shape.pitch * Math.PI / 180); let inArm = 0, tot = 0;
  for (const q of G.stars) { const r = rr(q); if (r < .2 || r > .8 || (q.pop !== 'arm' && q.pop !== 'disc')) continue; tot++; const t = Math.atan2(q.y - C.y, q.x - C.x) - (G.shape.th0 + Math.log(r / .1) * kk), ph = ((t * m / 6.2832) % 1 + 1) % 1; if (ph < .15 || ph > .85) inArm++; }
  const cl = new Set(G.stars.filter(q => q.cl != null).map(q => q.cl)).size;
  return { n: G.stars.length, same: a === b, gap, home: G.stars[0].seed === W.seed && G.stars[0].x === 0 && G.stars[0].home, seeds: new Set(G.stars.map(s => s.seed)).size, ivs: new Set(G.stars.map(s => s.ratio)).size, tps: new Set(G.stars.map(s => s.tr)).size,
    planetsOnlyHere: G.stars.every(s => !s.planets) && G.cache.size === 0, homeOm: S.om === S.om0 && S.om0 > 0, core: dens(0, .1), mid: dens(.4, .6), edge: dens(.8, 1), pops, arm: inArm / tot, cl, homeR: Math.hypot(C.x, C.y) / Rg, near: G.stars.filter(q => q.i && Math.hypot(q.x, q.y) < 14 * A0).length, shape: G.shape }; });

ok(A.n >= 1200 && A.seeds === A.n, `${A.n} star systems in your galaxy, each its own seed (${JSON.stringify(A.pops)})`);
ok(A.core > 5 * A.mid && A.mid > 1.5 * A.edge, `dense in the core, thinning to the edge (stars per area: core ${A.core.toFixed(0)}, half way ${A.mid.toFixed(0)}, edge ${A.edge.toFixed(0)})`);
ok(A.arm > .45, `${A.shape.arms} spiral arms (pitch ${A.shape.pitch.toFixed(0)} deg${A.shape.bar ? ', barred' : ''}): ${(A.arm * 100).toFixed(0)}% of disc stars sit in the arms' 30% (flat scatter: 30%)`);
ok(A.cl >= 15, `${A.cl} star clusters (open ones in the arms, globular ones in the halo)`);
ok(Math.abs(A.homeR - .55) < .01, `your system sits out in an arm, ${(A.homeR * 100).toFixed(0)}% of the way out (the Sun: ~55%)`);
ok(A.near >= 8, `${A.near} neighbours within 14 system radii of home`);
ok(A.same, 'the same seed gives the same neighbourhood (seed tree: galaxy from your first home)');
ok(A.home && A.homeOm, 'star 0 is your own system, unchanged (v0.0.17 system, home om)');
ok(A.gap >= 1.5 - 1e-9, `systems never overlap: nearest two stars ${A.gap.toFixed(2)} system radii apart (gate 1.5 in clusters / the core, 2.4 in the field)`);
ok(A.ivs >= 4 && A.tps >= 3, `systems lean their own om intervals (${A.ivs} different) and tempos (${A.tps} different)`);
ok(A.planetsOnlyHere, 'neighbours are star records only: no planets are built until you go there');
// pinch out: z -3 = your system, z -4 = the neighbours come in
const B = await pg.evaluate(async () => { const W = JO.world, G = W.galaxy; W.setZoom(-3); W.cam.lockZ = true; await new Promise(r => setTimeout(r, 400)); const a3 = G.amt;
  W.setZoom(-4); JO.render.galaxyMs = 0; await new Promise(r => setTimeout(r, 1500)); const a4 = G.amt, s4 = G.shown, ms = JO.render.galaxyMs; W.setZoom(-5); await new Promise(r => setTimeout(r, 700)); const s5 = G.shown; W.setZoom(-6); JO.render.galaxyMs = 0; await new Promise(r => setTimeout(r, 1200)); const ms6 = JO.render.galaxyMs; W.setZoom(-7); JO.render.galaxyMs = 0; await new Promise(r => setTimeout(r, 1200)); const s7 = G.shown, ms7 = JO.render.galaxyMs; W.setZoom(-4); await new Promise(r => setTimeout(r, 700)); return { a3, a4, shown: s4, s5, s7, ms6, ms7, ms }; });
ok(B.a3 < .2 && B.a4 > .95, `pinching out fades the neighbours in (z -3 ${B.a3.toFixed(2)}, z -4 ${B.a4.toFixed(2)})`);
ok(B.shown >= 2 && B.s5 >= 6 && B.s7 > 1000, `neighbouring stars on screen: ${B.shown} at z -4, ${B.s5} at z -5, the whole galaxy (${B.s7}) at z -7`);
ok(B.ms6 < .8 && B.ms7 < .1, `galaxy draw far out: ${B.ms6.toFixed(3)} ms at z -6, ${B.ms7.toFixed(3)} ms at z -7 (one image)`);
ok(B.ms < .3, `galaxy draw ${B.ms.toFixed(3)} ms (gate 0.3)`);
// pinch in on a neighbour: aim -> glide -> arrive -> land on its planet nearest you; the music lands with it
const pick = await pg.evaluate(() => { const G = JO.world.galaxy, sc = Math.pow(4, -4), o = { x: 0, y: 0 }; let best = null;
  for (const s of G.stars) { if (!s.i) continue; G.screenOf(s.i, sc, G.cx, G.cy, o); if (o.x > 40 && o.x < 372 && o.y > 60 && o.y < 800) { const d = Math.hypot(o.x - G.cx, o.y - G.cy); if (!best || d < best.d) best = { i: s.i, x: o.x, y: o.y, d }; } }
  JO.__home = { L: JO.world.home, seed: JO.world.pseed, ohm: JO.sim.ohm.id, ids: JO.sim.ohms.filter(q => q !== JO.sim.ohm).map(q => q.id) }; return best; });
ok(!!pick, `a neighbour to aim at (star ${pick && pick.i})`);
const C = await pg.evaluate(async b => { const W = JO.world, G = W.galaxy, S = W.system, Z = JO.zoom; const lands = []; JO.events.on('world.land', e => lands.push(e));
  W.cam.lockZ = false; W.cam.active = true; Z.zoomAbout(-3.95, b.x, b.y); const aimed = G.target; await new Promise(r => setTimeout(r, 300));
  for (let z = -3.95; z <= -3.0; z += .05) { Z.zoomAbout(z, b.x, b.y); await new Promise(r => setTimeout(r, 30)); } W.cam.active = false;
  const st = G.stars[b.i], fold = f => { while (f >= 96) f /= 2; while (f < 48) f *= 2; return f; };
  const r = { aimed, cur: G.cur, sys: S.sys, landed: S.cur, land: lands[0], seedOk: S.seed === st.seed && S.planets.every((p, k) => p.seed !== 0 && !p.home), om: S.om, omOk: Math.abs(S.om - fold(S.om0 * st.ratio)) < 1e-9,
    trOk: S.planets.every(p => Math.abs(p.tr - st.tr) <= 1.01), hue: S.planets.map(p => Math.round(p.hue)), hueOk: S.planets.every(p => Math.abs(p.hue - S.hueOf({ ...p, note: p.note0 })) < 1e-6),
    newHome: W.home !== JO.__home.L, away: JO.sim.ohms.filter(o => JO.__home.ids.includes(o.id)).every(o => o.away), withYou: !JO.sim.ohm.away, n: S.planets.length };
  const p = S.planets[S.cur]; r.note = p.note; await new Promise(res => setTimeout(res, 60000 / JO.music.bpm * 4 + 300)); r.omNow = JO.music.om; return r; }, pick);
ok(C.aimed === pick.i, 'pinching in far out aims at the star nearest your fingers');
ok(C.cur === pick.i && C.sys === pick.i && C.landed >= 0 && C.land && C.land.system === pick.i, `you arrive in its system and land on its planet ${C.landed} (of ${C.n})`);
ok(C.seedOk, "its planets come from its own seed (none is your home)");
ok(C.omOk && C.trOk, `its music: om ${C.om.toFixed(1)} Hz = your om x its interval; planet tempos lean on its tempo`);
ok(C.hueOk && new Set(C.hue).size === C.n, `its planets are coloured by their notes in its key (${C.hue.join(' ')})`);
ok(C.newHome && C.away && C.withYou, 'the ground is its planet; your ohm came with you, the ohms at home sleep');
ok(Math.abs(Math.log2(C.omNow / C.note)) < .01, `its planet's note lands on the next bar (${C.omNow.toFixed(1)} Hz)`);
// land on another of its planets (the v0.0.11 landing, inside the new system)
const D = await pg.evaluate(async () => { const W = JO.world, S = W.system, Z = JO.zoom; if (S.planets.length < 2) return { skip: true };
  W.setZoom(-3); await new Promise(r => setTimeout(r, 200)); const o = S.planets.find(p => p.i !== S.cur), q = { x: 0, y: 0 }; S.pos(o, JO.music.now(), q); S.screen(q.x, q.y, q);
  W.cam.active = true; JO.world.galaxy.fresh = true; for (let z = -3; z <= -1.2; z += .05) { Z.zoomAbout(z, q.x, q.y); await new Promise(r => setTimeout(r, 25)); } W.cam.active = false;
  await new Promise(r => setTimeout(r, 300)); return { want: o.i, cur: S.cur, sys: S.sys }; });
ok(D.skip || (D.cur === D.want && D.sys === pick.i), `pinch in on another of its planets lands there (${D.skip ? 'one planet' : D.want})`);
// home: the home button takes you back; your world is exactly as you left it; going back again finds the neighbour as you left it
const E = await pg.evaluate(async i => { const W = JO.world, G = W.galaxy, S = W.system; const keep = S.planets; W.goHome(); await new Promise(r => setTimeout(r, 300));
  const r = { cur: G.cur, sys: S.sys, home: W.home === JO.__home.L, seed: W.pseed === JO.__home.seed, awake: JO.sim.ohms.filter(o => JO.__home.ids.includes(o.id)).every(o => !o.away), p0: S.planets[0].seed === W.seed && S.planets[0].home };
  G.enter(i); r.same = S.planets === keep; const snap = JO.persist.snapshot(); r.saved = snap.parts.world.sys; W.goHome(); await new Promise(q => setTimeout(q, 200)); JO.persist.restore(snap); await new Promise(q => setTimeout(q, 200)); r.restored = G.cur; r.restoredSame = S.planets === keep; W.goHome(); await new Promise(q => setTimeout(q, 200)); r.back = G.cur; return r; }, pick.i);
ok(E.cur === 0 && E.sys === 0 && E.home && E.seed && E.p0, 'home button: back in your own system on your own planet (same ground, same seed)');
ok(E.awake, 'the ohms at home wake when you come back');
ok(E.same, 'a system you visited stays as you left it (its planets are kept, not rebuilt)');
ok(E.saved === pick.i && E.restored === pick.i && E.restoredSame && E.back === 0, `save/restore: the app reopens in the system you were in (saved ${E.saved}, restored ${E.restored})`);
// smooth: frame cost while the galaxy is in view vs at home
const F = await pg.evaluate(async () => { const W = JO.world, f = JO.frames; const m = async z => { W.setZoom(z); W.cam.lockZ = true; await new Promise(r => setTimeout(r, 600)); const t0 = performance.now(); let n = 0, worst = 0, last = t0;
    await new Promise(res => { const step = () => { const t = performance.now(); worst = Math.max(worst, t - last); last = t; n++; if (t - t0 < 2000) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); return { fps: n / 2, worst }; };
  return { home: await m(0), gal: await m(-4.5) }; });
ok(F.gal.fps >= F.home.fps * .85, `smooth: ${F.gal.fps.toFixed(0)} fps in the galaxy view vs ${F.home.fps.toFixed(0)} at home`);
ok(!errs.length, 'no page errors ' + errs.join(' | '));
console.log(fails ? 'GALAXY_FAIL' : 'GALAXY_OK'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
