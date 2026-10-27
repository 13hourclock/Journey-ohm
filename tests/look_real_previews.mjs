// REAL look previews (Visuals): headless Chromium stills at phone size 412x915 CSS px, unlabelled. Not a test; run by hand:
//   node tests/look_real_previews.mjs [outDir]      (default /workspace/softsound_previews/journey/real)
// 2D = the look.planet / look.star / look.ground canvas hooks (on by default; Skia raster). GL = the look.*Mat WebGL materials in the
// tests/look_gl_scene.mjs scenes, rendered on SwiftShader (software GL: same shaders, so same pixels as a phone GPU, only slower).
// three.js is NOT a repo dependency: LOOK_THREE=<three.module.js> (default: the box's scope copy); GL shots are skipped without it.
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
const tryReq = (from, m) => { try { return createRequire(from)(m); } catch (e) { return null; } };
const pw = tryReq(import.meta.url, 'playwright') || tryReq('/workspace/softsound/', 'playwright');
if (!pw) { console.log('look_real_previews: no Playwright'); process.exit(0); }
const THREE = process.env.LOOK_THREE || '/workspace/softsound_logs/three_scope/node_modules/three/build/three.module.js', hasGL = fs.existsSync(THREE);
const OUT = process.argv[2] || '/workspace/softsound_previews/journey/real'; fs.mkdirSync(OUT, { recursive: true });
const root = new URL('../', import.meta.url).pathname, tdir = path.dirname(THREE);
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = u.startsWith('/three/') ? path.join(tdir, u.slice(7)) : path.join(root, u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(b); }); });
await new Promise(res => srv.listen(0, '127.0.0.1', res)); const port = srv.address().port;
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), pg = await b.newPage();
const logs = []; pg.on('pageerror', e => logs.push('pageerror ' + e.message));
await pg.goto(`http://127.0.0.1:${port}/tests/`).catch(() => {}); await pg.setContent('<html><body style="margin:0;background:#000"></body></html>');
const RAW = !!process.env.LOOK_PREV_RAW, ONLY = process.env.LOOK_PREV_ONLY || '';
const shots = await pg.evaluate(async ([port, hasGL, RAW, ONLY]) => { const base = `http://127.0.0.1:${port}`, { createLook } = await import(`${base}/www/js/look/index.js`);
  const { createMusic } = await import(`${base}/www/js/music.js`), { createEvents } = await import(`${base}/www/js/events.js`), { createNoise } = await import(`${base}/www/js/look/noise.js`);
  const W = 412, H = 915, out = {}; let t = 10;
  const mkLook = (heal = .9) => { const music = createMusic(() => t), bus = createEvents(music);
    return createLook({ sim: { healAt: () => heal }, music, bus, makeCanvas: (w, h) => new OffscreenCanvas(w, h) }); };   // the defaults: the real look is on
  const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const save = (name, c) => { if (ONLY && !new RegExp(ONLY).test(name)) return; out[name] = { png: c.toDataURL('image/png'), jpg: c.toDataURL('image/jpeg', .9) }; };
  const stars = (g, seed = 7, n = 900, y1 = H) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const x = r() * W, y = r() * y1, b = Math.pow(r(), 4), tk = r(); g.fillStyle = `rgba(${tk < .2 ? 255 : 220},${tk < .2 ? 215 : 228},${tk > .85 ? 255 : 235},${.15 + .85 * b})`; g.fillRect(x, y, b > .6 ? 1.6 : 1, b > .6 ? 1.6 : 1); } };
  // ---------------- 2D ----------------
  const run2d = (look, st, draw, n = 4) => { for (let i = 0; i < n; i++) { t += 1 / 60; const s = { t, W, H, q: 0, ...st }; look.frame(s); draw(s); look.api.flush(); } };
  // the side-view land: three slices (far mountains, mid hills, near rolling land with a wide river valley), Game Dev's sample objects
  const N = createNoise(5);
  const slices = (top, bot, seedK = 0, heal = .9) => { const hgt = bot - top, mk = (i, f) => { const S = [], n = 160;
      for (let k = 0; k < n; k++) { const v = k / (n - 1), x = v * 3 + seedK * 11 + i * 5; let h, riv = 0, rock, veg;
        if (i === 2) { const rg = N.ridged(x * 1.3, 1.7, .3, 5); h = .25 + .95 * rg * (.6 + .4 * N.fbm(x * .4, 4, 1, 2)); rock = .7; veg = .15; }   // far: mountains
        else if (i === 1) { h = .32 + .3 * N.fbm(x * .9, 2.2, .5, 4) + .25 * N.ridged(x * .7, 3, 2, 3); rock = .35; veg = .5; }   // mid: hills with a few peaks
        else { const d = (v - .6) / .11; riv = Math.exp(-d * d * d * d); h = .22 + .2 * N.fbm(x * .8, 5, 1, 4) + .06 * Math.sin(v * 5) - .16 * Math.exp(-d * d * .8); rock = .2; veg = .65; }   // near: rolling, a wide U river valley
        S.push({ h, m: { rock, soil: .3, veg, sand: .15 * riv, wet: .3 * riv, ice: 0 }, temp: .5, moist: .45 + .3 * N.fbm(x * 2, 3, 1, 3) + .3 * riv, river: riv, crack: heal < .3 && k % 23 === 0 ? .7 : 0, hollow: 0, fold: 0, fresh: 0 }); }
      const y0 = [top + hgt * .80, top + hgt * .62, top + hgt * .52][i], amp = [hgt * .34, hgt * .3, hgt * .42][i];
      return Object.assign(S, { x0: 0, dx: W / (n - 1), y0, amp, yBot: bot, chunk: i + 10 * seedK, ver: 1 }); };
    return [2, 1, 0].map(i => ({ L: { i, ver: 1 }, S: mk(i) })); };
  const sky = (g, top, bot, a, b) => { const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, `rgb(${a})`); gr.addColorStop(1, `rgb(${b})`); g.fillStyle = gr; g.fillRect(0, top, W, bot - top); };
  { // (a) system view: star, a gas giant, a rock/ocean world, a dry world
    const look = mkLook(.85), c = canvas(), g = c.getContext('2d'), sx = 300, sy = 170, light = { x: sx, y: sy };
    const P = [[{ seed: 23, id: 2, style: { rock: .05, ocean: 0, ice: .1, gas: .85 }, day: 200 }, 110, 440, 74], [{ seed: 11, id: 1, style: { rock: .45, ocean: .45, ice: .1, gas: 0 }, day: 120 }, 290, 620, 44], [{ seed: 37, id: 3, style: { rock: .6, ocean: 0, ice: .3, gas: 0 }, day: 90 }, 150, 780, 26]];
    run2d(look, { light }, s => { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#010104'; g.fillRect(0, 0, W, H); stars(g); look.star(g, sx, sy, 30, s); for (const [p, x, y, r] of P) look.planet(g, p, x, y, r, s); }, 16);
    save('a_system_2d', c); }
  { // (b) close: rock/ocean (summer north) + gas giant
    const look = mkLook(.9), c = canvas(), g = c.getContext('2d'), light = { x: -260, y: -120 };
    const A = { seed: 101, id: 4, style: { rock: .45, ocean: .5, ice: .05, gas: 0 }, day: 240, snowLine: .55 }, B = { seed: 202, id: 5, style: { rock: 0, ocean: 0, ice: .1, gas: .95 }, tilt: .3, day: 240 };
    run2d(look, { light, season: .5 }, s => { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#010104'; g.fillRect(0, 0, W, H); stars(g, 9, 700); look.planet(g, A, 214, 250, 150, s); look.planet(g, B, 196, 690, 160, s); }, 16);
    save('b_close_2d', c); }
  const rows = [[{ heal: .08 }, [96, 104, 112], [150, 140, 125]], [{ heal: .95, season: .7, weather: .3 }, [62, 118, 204], [176, 206, 232]],
    [{ heal: .9, season: -.9, weather: .92 }, [66, 74, 88], [128, 136, 148]], [{ heal: .95, trip: .9, peak: .9, burst: .8 }, [34, 18, 74], [190, 84, 150]]];
  { // (c) the side-view land, same place, four states: unhealed / summer clear / winter storm / trippy peak
    const c = canvas(), g = c.getContext('2d'), sh = H / rows.length;
    rows.forEach(([st, skyA, skyB], k) => { const look = mkLook(st.heal), top = Math.round(k * sh), bot = Math.round((k + 1) * sh), SL = slices(top, bot, 0, st.heal);
      run2d(look, { ...st, light: { x: 60, y: top - 200 } }, s => { g.save(); g.beginPath(); g.rect(0, top, W, bot - top); g.clip(); sky(g, top, bot, skyA, skyB); for (const { L, S } of SL) look.ground(g, L, S, s); g.restore(); }, 8);
      g.fillStyle = '#000'; g.fillRect(0, bot - 1, W, 1); });
    save('c_ground_2d', c); }
  { // (d) the whole system on the phone: sky with star + planets above, the walkable land below
    const look = mkLook(.9), c = canvas(), g = c.getContext('2d'), light = { x: 320, y: 120 }, SL = slices(430, H, 1);
    const P = [[{ seed: 23, id: 2, style: { rock: .05, ocean: 0, ice: .1, gas: .85 }, day: 200 }, 110, 250, 58], [{ seed: 11, id: 1, style: { rock: .45, ocean: .45, ice: .1, gas: 0 }, day: 120 }, 230, 380, 22]];
    run2d(look, { light, season: .4, weather: .35 }, s => { g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#02030a'); gr.addColorStop(.45, '#0c1830'); gr.addColorStop(.62, '#3b5f8c'); gr.addColorStop(1, '#a9c3dc'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      stars(g, 3, 500, 420); look.star(g, 320, 120, 22, s); for (const [p, x, y, r] of P) look.planet(g, p, x, y, r, s); for (const { L, S } of SL) look.ground(g, L, S, s); }, 16);
    save('d_full_system_2d', c); }
  { // (e) the land with ohms on it (the existing look.ohm over plain ohm discs, as the world draws them)
    const look = mkLook(.9), c = canvas(), g = c.getContext('2d'), SL = slices(300, H, 2), O = [];
    for (let i = 0; i < 14; i++) O.push({ id: 100 + i, hue: (i * 47 + 20) % 360, glow: .35 + .4 * ((i * 5) % 3) / 2, look: { glow: .3 }, r: 9 + (i * 7) % 12 });
    run2d(look, { light: { x: 80, y: -150 }, season: .6, weather: .3 }, s => { g.setTransform(1, 0, 0, 1, 0, 0); sky(g, 0, H, [52, 104, 186], [190, 214, 236]); for (const { L, S } of SL) look.ground(g, L, S, s);
      const nr = SL[2].S; O.forEach((o, i) => { const x = 22 + i * 28.5, k = Math.round(x / nr.dx), y = nr.y0 - nr[Math.min(nr.length - 1, k)].h * nr.amp - o.r - 2;
        g.fillStyle = `hsl(${o.hue},60%,55%)`; g.beginPath(); g.arc(x, y, o.r, 0, Math.PI * 2); g.fill(); look.ohm(g, o, x, y, o.r, s); }); }, 12);
    save('e_ground_ohms_2d', c); }
  { // (f) seasons on the land, full height each: summer / winter (for the contact sheet)
    for (const [nm, st, a, b2] of [['f_summer_2d', { season: .8, weather: .3 }, [52, 110, 200], [180, 208, 236]], ['g_winter_2d', { season: -.9, weather: .4 }, [92, 110, 136], [190, 200, 214]], ['h_storm_2d', { season: -.2, weather: .95 }, [44, 50, 62], [104, 112, 124]], ['i_trip_2d', { trip: .9, peak: .9, burst: .8 }, [34, 18, 74], [190, 84, 150]]]) {
      const look = mkLook(.92), c = canvas(), g = c.getContext('2d'), SL = slices(200, H, 3);
      run2d(look, { ...st, light: { x: 70, y: -160 } }, s => { g.setTransform(1, 0, 0, 1, 0, 0); sky(g, 0, H, a, b2); for (const { L, S } of SL) look.ground(g, L, S, s); }, 10); save(nm, c); } }
  // ---------------- GL ----------------
  if (hasGL) { const T = await import(`${base}/three/three.module.js`), S = await import(`${base}/tests/look_gl_scene.mjs`);
    const gl = (kind, heal, st, n = 3) => { const look = mkLook(heal), cv = canvas(); look.frame({ t, W, H, q: 0, ...st }); const sc = S.makeScene(T, look, kind, { canvas: cv });
      for (let i = 0; i < n; i++) { t += 1 / 60; look.frame({ t, W, H, q: 0, ...st }); sc.tick({ t, ...st }); sc.render(); } const c = canvas(); c.getContext('2d').drawImage(cv, 0, 0); sc.R.dispose(); return c; };
    let c = gl('system', .85, {}); save('a_system_gl', c);
    c = gl('close', .9, {}); save('b_close_gl', c);
    const strips = [['unhealed: muted, dusty, cracked', .08, {}], ['healed, summer, clear', .95, { season: .6, weather: .3 }], ['healed, winter, storm', .9, { season: -.85, weather: .9 }], ['big event: trippy peak', .95, { trip: .9, peak: .9, burst: .8 }]];
    const C = canvas(), G = C.getContext('2d'), sh = H / strips.length;
    strips.forEach(([name, heal, st], k) => { const s = gl('ground', heal, st); if (RAW) save('raw_ground_' + k, s); const top = Math.round(k * sh), hh = Math.round(sh); G.drawImage(s, 0, 250, W, hh, 0, top, W, hh); G.fillStyle = '#000'; G.fillRect(0, top + hh - 1, W, 1); });
    save('c_ground_gl', C); }
  return out; }, [port, hasGL, RAW, ONLY]);
await b.close(); srv.close();
for (const [k, v] of Object.entries(shots)) for (const ext of ['png', 'jpg']) fs.writeFileSync(path.join(OUT, `${k}.${ext}`), Buffer.from(v[ext].split(',')[1], 'base64'));
console.log(`look_real_previews: ${Object.keys(shots).length} stills (png + jpg) -> ${OUT}: ${Object.keys(shots).join(', ')}`); if (logs.length) console.log(logs.join('\n').slice(0, 2000));
