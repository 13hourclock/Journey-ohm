// RARE SOFT (opts realLook rare RARE_LOOK.soft, parent 2:37 AM 'neutral strokes' review; Wilbow 10:06 'no outlines'): in the real game page (412x915)
// one ohm made rare (star). Its baked glow rings and body are drawn on clean canvases with soft on / off. Gates: soft on by default; the soft rings have
// no crisp line (peak alpha well under the off rings' with a wider low-alpha spread); the soft body has no dark hair-line edge (fewer dark rim pixels
// just outside the off body's silhouette); no page errors; look.legs returns true for a rare ohm only while look.rare owns its body this frame (hide..show). (Legs: soft = tapered fills, checked by eye in look_rare_stills.)
// node tests/look_rare_soft_test.mjs [www]
import { createRequire } from 'module'; const require = createRequire('/workspace/softsound/'); const pw = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; const root = process.argv[2] || 'www';
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); r.end(b); }); });
await new Promise(r => srv.listen(0, r));
const SEED = n => 'let __s = ' + n + ' >>> 0; Math.random = () => { __s = (__s + 0x6D2B79F5) >>> 0; let t = __s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };';
const B = await pw.chromium.launch(); let ok = true; const chk = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) ok = false; };
const pg = await B.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.addInitScript(SEED(7)); await pg.goto(`http://127.0.0.1:${srv.address().port}/`); await pg.waitForFunction(() => globalThis.JO && JO.world && JO.sim.ohm && JO.render.look.api.rare, null, { timeout: 20000 });
await pg.waitForTimeout(1500);
const r = await pg.evaluate(async () => { const J = JO, K = J.render.look.api.rare, O = K.O, o = (J.sim.ohms || []).filter(o => !o.parked)[0];
  J.rare.markRare(o, 'wild'); o.rareSig = Object.assign({}, o.rareSig, { shape: 'star' }); if (o.g) o.g._rare = null;
  const def = O.soft, m = new DOMMatrix(), N = 300, R = 50, wait = () => new Promise(f => setTimeout(f, 120));
  const shot = async (soft, fn) => { O.soft = soft; let d = null; for (let k = 0; k < 12; k++) { const c = new OffscreenCanvas(N, N), g = c.getContext('2d'); const st = { n: 0 }, s0 = g.stroke.bind(g); g.stroke = (...a) => { st.n++; return s0(...a); };
      const did = fn(g); if (did !== false) d = { px: g.getImageData(0, 0, N, N).data, st: st.n }; await wait(); } return d; };
  const ringsOf = async s => shot(s, g => { K.rings(g, o, N / 2, N / 2, R, m); });
  const bodyOf = async s => shot(s, g => K.body(g, o, N / 2, N / 2, R, m, null, 0));
  const ringM = d => { let mx = 0, on = 0; if (!d) return null; for (let i = 3; i < d.px.length; i += 4) { mx = Math.max(mx, d.px[i]); if (d.px[i] > 8) on++; } return { mx, on }; };
  const rOn = ringM(await ringsOf(true)), rOff = ringM(await ringsOf(false));
  const bOn = await bodyOf(true), bOff = await bodyOf(false);
  // dark rim: opaque-ish pixels much darker than the body's mean, with a transparent pixel within 2 px (the silhouette edge)
  const rim = d => { if (!d) return null; const p = d.px, A = i => p[i + 3], Lm = i => .3 * p[i] + .59 * p[i + 1] + .11 * p[i + 2]; let sum = 0, n = 0;
    for (let i = 0; i < p.length; i += 4) if (A(i) > 200) { sum += Lm(i); n++; } const mean = n ? sum / n : 0; let dark = 0;
    for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) { const i = (y * N + x) * 4; if (A(i) < 60 || Lm(i) > mean * .55) continue;
      if (A(i - 8) < 20 || A(i + 8) < 20 || A(i - 8 * N) < 20 || A(i + 8 * N) < 20) dark++; } return { dark, mean: Math.round(mean), n }; };
  const Lk = J.render.look, gL = new OffscreenCanvas(N, N).getContext('2d'); let legs = null;
  if (Lk.legs) { let hid = false; for (let k = 0; k < 10 && !hid; k++) { hid = K.hide(o, R, m, null); if (!hid) await wait(); } const mid = Lk.legs(gL, o); K.show(gL, o, N / 2, N / 2, R, m); legs = { hid, mid, after: Lk.legs(gL, o) }; }
  O.soft = def; return { legs, def, rOn, rOff, bOn: rim(bOn), bOff: rim(bOff), stats: { ...K.stats } }; });
console.log(JSON.stringify(r));
chk(r.def === true, 'RARE_LOOK.soft on by default');
chk(r.rOn && r.rOff && r.rOn.on > 200 && r.rOff.on > 200, `rings drew both ways (${r.rOn && r.rOn.on} / ${r.rOff && r.rOff.on} px)`);
chk(r.rOn && r.rOff && r.rOn.mx < r.rOff.mx * .85, `soft rings: no crisp line (peak alpha ${r.rOn && r.rOn.mx} < off ${r.rOff && r.rOff.mx} x .85)`);
chk(r.bOn && r.bOff && r.bOn.n > 500 && r.bOff.n > 500, `body drew both ways (${r.bOn && r.bOn.n} / ${r.bOff && r.bOff.n} px)`);
chk(r.bOn && r.bOff && r.bOn.dark < r.bOff.dark * .7 + 2, `soft body: no dark hair-line edge (dark rim px ${r.bOn && r.bOn.dark} vs off ${r.bOff && r.bOff.dark})`);
chk(r.legs && r.legs.hid && r.legs.mid === true && r.legs.after === false, `look.legs owns a rare's legs between rare hide / show only (${JSON.stringify(r.legs)})`);
chk(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
await B.close(); srv.close(); console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
