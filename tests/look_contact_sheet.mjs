// contact sheet, no labels: the shipped look on top; the new look below (2D row, then the WebGL row, then the sound-driven
// kaleidoscope row: rest / solo ohm / full jam / big moment, from tests/look_kaleido_stills.mjs, when those stills exist).
// Run after tests/look_real_previews.mjs:  node tests/look_contact_sheet.mjs [outDir]   (headless Chromium, no deps beyond Playwright)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const { chromium } = createRequire('/workspace/softsound/')('playwright');
const P = '/workspace/softsound_previews', out = process.argv[2] || path.join(P, 'journey/real');
const cur = [['02_star_look.png', 'current star'], ['03_planet_shading.png', 'current planet shading'], ['journey/P1_one_place_three_states.png', 'current ground: one place, three states']].map(([f, t]) => [path.join(P, f), t]);
const prop = ['a_system_2d', 'b_close_2d', 'd_full_system_2d', 'c_ground_2d', 'e_ground_ohms_2d', 'f_summer_2d', 'g_winter_2d', 'h_storm_2d', 'i_trip_2d', 'a_system_gl', 'b_close_gl', 'c_ground_gl'].map(f => [path.join(out, f + '.png'), f]).filter(([f]) => fs.existsSync(f))
  .concat(['rest', 'solo', 'jam', 'big'].map(f => [path.join(out, 'kaleido', f + '.png'), 'kaleido_' + f]).filter(([f]) => fs.existsSync(f)));
const url = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const br = await chromium.launch(); const pg = await br.newPage();
const r = await pg.evaluate(async ({ cur, prop }) => {
  const load = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = s; });
  const C = await Promise.all(cur.map(([u]) => load(u))), Pp = await Promise.all(prop.map(([u]) => load(u)));
  const hT = 400, hB = 600, gap = 12, pad = 16, gl = Pp.filter((_, k) => /_gl$/.test(prop[k][1])), kz = Pp.filter((_, k) => /^kaleido_/.test(prop[k][1])), d2 = Pp.filter((_, k) => !/_gl$|^kaleido_/.test(prop[k][1]));
  const wOf = (ims, h) => ims.reduce((a, i) => a + i.width * h / i.height, 0) + gap * Math.max(0, ims.length - 1);
  const W = Math.ceil(Math.max(wOf(C, hT), wOf(d2, hB), wOf(gl, hB), wOf(kz, hB)) + pad * 2), H = pad + hT + gap * 2 + hB + gap + (gl.length ? hB + gap : 0) + (kz.length ? hB + gap : 0) + pad;
  const c = new OffscreenCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#0c0c10'; g.fillRect(0, 0, W, H);
  const row = (ims, y, h) => { let x = pad; for (const i of ims) { const w = i.width * h / i.height; g.drawImage(i, x, y, w, h); x += w + gap; } return y + h; };
  let y = row(C, pad, hT) + gap; g.fillStyle = '#444'; g.fillRect(pad, y, W - pad * 2, 2); y += gap;   // a plain rule: shipped above, new below
  y = row(d2, y, hB) + gap; if (gl.length) y = row(gl, y, hB) + gap; if (kz.length) row(kz, y, hB);
  const enc = async (type, q) => { const b = await c.convertToBlob({ type, quality: q }); const a = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768)); return btoa(s); };
  return { W, H, png: await enc('image/png'), jpg: await enc('image/jpeg', .9) };
}, { cur: cur.map(([f, t]) => [url(f), t]), prop: prop.map(([f, t]) => [url(f), t]) });
await br.close();
fs.writeFileSync(path.join(out, 'contact_sheet.png'), Buffer.from(r.png, 'base64')); fs.writeFileSync(path.join(out, 'contact_sheet.jpg'), Buffer.from(r.jpg, 'base64'));
console.log(`look_contact_sheet: ${r.W}x${r.H} -> ${out}/contact_sheet.{png,jpg}`);
