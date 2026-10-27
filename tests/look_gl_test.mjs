// look GL materials (PLAN_REAL_PLANET §16.7): compile + light + render headless in Chromium on SwiftShader WebGL (software GL; it
// checks that the shaders compile, link and draw, NOT phone GPU speed). three.js is NOT a repo dependency: set LOOK_THREE=<path to
// three/build/three.module.js> (default: the box's scope copy). Skips cleanly if three or Playwright are missing.
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
const tryReq = (from, m) => { try { return createRequire(from)(m); } catch (e) { return null; } };
const pw = tryReq(import.meta.url, 'playwright') || tryReq('/workspace/softsound/', 'playwright');
const THREE = process.env.LOOK_THREE || '/workspace/softsound_logs/three_scope/node_modules/three/build/three.module.js';
if (!pw || !fs.existsSync(THREE)) { console.log(`look_gl_test: SKIPPED (${!pw ? 'no Playwright' : 'no three at ' + THREE})`); process.exit(0); }
const root = new URL('../', import.meta.url).pathname, tdir = path.dirname(THREE);
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = u.startsWith('/three/') ? path.join(tdir, u.slice(7)) : path.join(root, u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'text/javascript' }); r.end(b); }); });
await new Promise(res => srv.listen(0, '127.0.0.1', res)); const port = srv.address().port;
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), pg = await b.newPage();
const logs = []; pg.on('console', m => logs.push(m.text())); pg.on('pageerror', e => logs.push('pageerror ' + e.message));
await pg.goto(`http://127.0.0.1:${port}/tests/`).catch(() => {}); await pg.setContent('<html><body style="margin:0;background:#000"></body></html>');
const res = await pg.evaluate(async port => { const base = `http://127.0.0.1:${port}`, T = await import(`${base}/three/three.module.js`), { createLook } = await import(`${base}/www/js/look/index.js`), S = await import(`${base}/tests/look_gl_scene.mjs`);
  const out = { webgl2: !!document.createElement('canvas').getContext('webgl2'), kinds: {} }; let t = 10;
  const { createMusic } = await import(`${base}/www/js/music.js`), { createEvents } = await import(`${base}/www/js/events.js`), music = createMusic(() => t), bus = createEvents(music);
  for (const kind of ['system', 'close', 'ground']) { const look = createLook({ sim: { healAt: () => .9 }, music, bus, opts: {} });
    look.frame({ t, W: 412, H: 915, q: 0 }); const cv = document.createElement('canvas'); document.body.appendChild(cv); const sc = S.makeScene(T, look, kind, { canvas: cv });
    sc.tick({ t }); sc.render(); const gl = sc.R.getContext(); const px = new Uint8Array(4 * 412 * 915); gl.readPixels(0, 0, 412, 915, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let lit = 0, sum = 0; const hist = new Set(); for (let i = 0; i < px.length; i += 16) { const v = px[i] + px[i + 1] + px[i + 2]; sum += v; if (v > 60) lit++; hist.add((px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | px[i + 2] >> 4); }
    // time: warm frames then N frames, each ending in a 1 px readback (SwiftShader = CPU; a pessimistic stand-in only)
    const one = new Uint8Array(4); for (let i = 0; i < 3; i++) { t += 1 / 60; sc.tick({ t }); sc.render(); } const t0 = performance.now(), N = 10;
    for (let i = 0; i < N; i++) { t += 1 / 60; look.frame({ t, W: 412, H: 915, q: 0 }); sc.tick({ t }); sc.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one); }
    const ms = (performance.now() - t0) / N, tk0 = performance.now(); for (let i = 0; i < 200; i++) sc.tick({ t }); const tickMs = (performance.now() - tk0) / 200;
    const names = sc.mats.map(x => x.m.name), progs = sc.R.info.programs ? sc.R.info.programs.length : -1;
    const U = sc.mats.find(x => x.m.userData.kind)?.m.userData.u, defs = sc.mats.find(x => x.m.userData.kind)?.m.defines;
    out.kinds[kind] = { errs: sc.errs, glErr: gl.getError(), lit: lit / (px.length / 16), mean: sum / (px.length / 16) / 3, colours: hist.size, ms, tickMs, names, progs, uKeys: U ? Object.keys(U) : [], defines: defs ? Object.keys(defs) : [] };
    sc.R.dispose(); }
  return out; }, port);
await b.close(); srv.close();
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
console.log('look_gl_test: headless Chromium, SwiftShader WebGL (software). Timings are CPU-rendered and NOT a phone GPU number.');
ok(res.webgl2, 'WebGL2 context (SwiftShader)');
for (const [k, r] of Object.entries(res.kinds)) {
  ok(r.errs.length === 0 && r.glErr === 0, `${k}: every look material compiles + links (${r.names.join(', ')}; ${r.progs} programs)${r.errs.length ? '\n' + r.errs.join('\n').slice(0, 1500) : ''}`);
  ok(r.lit > .02 && r.colours > 40, `${k}: draws a lit image (${(r.lit * 100).toFixed(1)}% bright px, ${r.colours} colour buckets, mean ${r.mean.toFixed(0)})`);
  console.log(`     ${k}: ${r.ms.toFixed(1)} ms/frame SwiftShader (whole scene incl. shadows), material tick ${(r.tickMs * 1000).toFixed(0)} us/frame for ${r.names.length} materials`); }
const sk = res.kinds.close.uKeys; ok(['uLightDir', 'uStarPos', 'uStarColor', 'uTime', 'uBeat', 'uPhase', 'uPulse', 'uQ', 'uHarmony', 'uSeed', 'uStyle', 'uPalette', 'uSea', 'uSpin'].every(k => sk.includes(k)), 'planetMat carries every §16 uniform on userData.u');
ok(['LK_H', 'LK_M0', 'LK_M1', 'LK_M2', 'LK_FOLD', 'LK_FRESH'].every(d => res.kinds.close.defines.includes(d)), `attributes auto-detected on first draw (defines ${res.kinds.close.defines.join(' ')})`);
ok(res.kinds.ground.defines.includes('LK_RIVER') && !res.kinds.ground.defines.includes('LK_PLANET'), 'ground: river attribute detected (rivers shade as water)');
if (logs.length) console.log('page console:', logs.slice(0, 8).join(' | ').slice(0, 1200));
console.log(fails ? `${fails} FAILED` : 'all look GL tests passed'); process.exit(fails ? 1 : 0);
