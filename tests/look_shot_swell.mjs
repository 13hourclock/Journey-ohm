// Headless still of Game Dev's shots_1a 'ground' situation (412x915, first view on the ground, P1 on) for before/after checks of the
// big-event swell + field kaleidoscope. No desktop, no audio capture: Playwright Chromium page screenshot only.
//   node tests/look_shot_swell.mjs <www root> <out prefix>     e.g. a master export with this worktree's www/js/look copied over it
// Writes <prefix>_play.png (ordinary play at beat ~14, the moment the old trigger had a swell open) and <prefix>_big.png (a forced
// big event, world.bang(1) after the warm-up, captured at the top of the swell). Prints the swell / peak log.
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/');
const { chromium } = require('playwright'); import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.argv[2], out = process.argv[3]; if (!root || !out) { console.log('usage: node tests/look_shot_swell.mjs <www root> <out prefix>'); process.exit(1); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: +(process.env.DPR || 1) });
const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForFunction(() => globalThis.JO && JO.render && JO.render.look && JO.music, null, { timeout: 20000 });
const beat = () => pg.evaluate(() => JO.music.beat());
const info = () => pg.evaluate(() => { const P = JO.render.look.api.place, M = JO.render.look.api.mix; return { beat: +JO.music.beat().toFixed(2), swell: +P.swell.toFixed(2), peak: +M.peak.toFixed(2), burst: +(JO.world.look.burst || 0).toFixed(2) }; });
const until = async b0 => { while (await beat() < b0) await pg.waitForTimeout(40); };
await until(14); const i1 = await info(); await pg.screenshot({ path: `${out}_play.png` });
await until(22); await pg.evaluate(() => JO.world.bang(1));
let top = { swell: 0 }; for (let i = 0; i < 80; i++) { await pg.waitForTimeout(25); const s = await info(); if (s.swell >= top.swell) top = s; else if (top.swell > .3) break; }
const i2 = await info(); await pg.screenshot({ path: `${out}_big.png` });
console.log(JSON.stringify({ play: i1, big: i2, top }), 'errs', errs.slice(0, 3).join(' | ')); await b.close(); srv.close();
