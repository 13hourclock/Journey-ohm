// REAL look bench body (Chromium): per rung, the whole look per frame with the real look on (the default) = look.frame (bakes are NOT
// in the frame: they run in idle time, simulated here by look.api.idle(slice) between frames, outside the timed region) + 50 x look.ohm + look.star + 2 x look.planet (a close one r 150 + a far one r 40, both turning) + look.ground (mode C, 96 samples).
// Cases: 'calm' (no events), 'trip' (mix forced high + a swell; the colour/pattern layer on), 'season' (winter + rain from world.place).
// bake: ms to bake everything cold (flush), and the idle ms per frame spent baking while turning (spin phases, trip tints, seasons).
import { QDPR } from './look_bench_core.mjs';
// 'back' = calm + Game Dev's back ridge slices drawn through look.ground (render.js realGround, world.opts.realGroundBack, v0.0.19):
// 4 slices behind the front strip, 3 chunks each (typed chunk data, yBot = the screen bottom, hazed with depth), each chunk clipped to its core
function backSlices(look, W, H, S0) { const out = [], G = look.api.ground; if (!G || !G.fromSamples) return out;
  for (let ri = 1; ri <= 4; ri++) { const f = 1 - ri / 4.5, SL = { i: ri, depth: 1 - f, scale: 1, haze: Math.min(1, (1 - f) * .8) }, base = H * (.2 + f * f * .35), amp = H * (.6 + .4 * f);
    for (let ci = 0; ci < 3; ci++) { const n = 39, A = []; for (let i = 0; i < n; i++) A.push(S0[(i * 2 + ci * 31 + ri * 17) % S0.length]); const cw = W / 2.4;
      Object.assign(A, { chunk: ci, ver: 1, x0: ci * cw - 3 * cw / 32, dx: cw / 32, y0: base, amp: amp * .35, yBot: H, seed: 77 + ri * 7919, worldX: ci * cw });
      const P = G.fromSamples(A, SL, { W, H }); P.cx = ci * cw; P.cw = cw; out.push([SL, P]); } }
  return out; }
// 'rare' = calm + 10 of the 50 ohms rare (v0.0.24 rare look, look/rare.js): master's fields (rarity, rareKind, tier, rareSig.shape, personality,
// tradId) and a soft body ring like genes.js restPoint (10 points, the rare shape genes), through look.rare(layer 0 + 1) as render.js calls it + look.ohm
const RSH = { star: { lobes: 5, lobeAmt: .2 }, long: { aspect: 1.65, lobeAmt: .05 }, twin: { lobes: 2, lobeAmt: .24 }, wave: { lobes: 4, lobeAmt: .13 } }, TRS = ['western', 'hindustani', 'maqam', 'gamelan', 'japan', 'wafrica', 'celtic', 'techno'];
export function rareOhm(o, i) { const shape = ['star', 'long', 'twin', 'wave'][i % 4], G = { r: o.r, eyes: i % 3, lobes: 0, lobeAmt: 0, lobePh: i * .7, aspect: 1, ...RSH[shape] }, ring = new Float32Array(40);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = G.r * (1 + G.lobeAmt * Math.cos(G.lobes * a + G.lobePh)); ring[k * 4] = rr * Math.cos(a) / Math.sqrt(G.aspect); ring[k * 4 + 1] = rr * Math.sin(a) * Math.sqrt(G.aspect); }
  return Object.assign(o, { g: G, body: { x: 0, y: 0, ring, pin: 0, pout: 0, throb: 0 }, rarity: 1, rareKind: ['wild', 'gift', 'teacher'][i % 3], tier: i % 5, xp: 10 * i, tradId: TRS[i % 8], rareSig: { seed: 7 + i * 131, shape, hueK: (i % 5) / 5, kinds: ['blend'] },
    personality: { calm: (i % 4) / 3, bold: .5, curious: .5, social: .5, playful: (i % 3) / 2, traits: [] } }); }
// 'char' = calm with every ohm a full genome + body ring/rest (look/ohmlook.js: A face, B skin, C posture; legs on half, xp 0..98, all 8 traditions)
const TR2 = ['folk', 'raga', 'maqam', 'gamelan', 'japan', 'wafrica', 'celtic', 'techno'];
export function charOhm(o, i) { const G = { r: o.r, eyes: 1 + (i % 2), legs: i % 2 ? 2 : 0, lobes: 2 + (i % 4), lobeAmt: .04 + (i % 5) * .03, lobePh: i * .9, aspect: .85 + (i % 6) * .08, calm: .35 + (i % 6) * .1, social: .3 + (i % 8) * .09, hear: .4 + (i % 7) * .09, float: i % 5 === 0 ? 1 : 0 }, ring = new Float32Array(40), rest = new Float32Array(20);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = G.r * (1 + G.lobeAmt * Math.cos(G.lobes * a + G.lobePh)); rest[k * 2] = rr * Math.cos(a) / Math.sqrt(G.aspect); rest[k * 2 + 1] = rr * Math.sin(a) * Math.sqrt(G.aspect); ring[k * 4] = rest[k * 2]; ring[k * 4 + 1] = rest[k * 2 + 1]; }
  return Object.assign(o, { g: G, body: { x: 0, y: 0, vx: 0, ring, rest, ground: !G.float, pin: 0, pout: 0, throb: 0 }, xp: (i * 37) % 99, tradId: TR2[i % 8] }); }
export async function benchReal({ createLook, mkCanvas, makeCanvas, now, frames = 180, warm = 60, N = 50, W = 412, H = 860, flush = null, idle = [6, 5, 4, 3], qs = [0, 1, 2, 3], kases = ['calm', 'trip', 'season', 'back', 'rare', 'char'], realLook = {}, nRare = 10 }) {
  let T = 0; const music = { now: () => T, beat: t => (t == null ? T : t) * 2, bar: t => (t == null ? T : t) / 2, key: 0, chord: { root: 0 }, scale: { ratios: [1, 9 / 8, 5 / 4] }, jam: { div: 2 } };
  const ohms = []; for (let i = 0; i < N; i++) ohms.push({ id: 10 + i, hue: (i * 137.5) % 360, glow: (i % 7) / 5, look: { glow: (i % 3) / 3 }, r: 8 + (i * 7) % 18, x: 0, y: 0 });
  const P1 = { seed: 101, id: 4, style: { rock: .45, ocean: .5, ice: .05, gas: 0 }, day: 60 }, P2 = { seed: 202, id: 5, style: { rock: 0, ocean: 0, ice: .1, gas: .9 }, day: 60 };
  const S = []; for (let i = 0; i < 96; i++) { const u = i / 95, h = .45 + .25 * Math.sin(u * 7.1) + .12 * Math.sin(u * 23 + 1) + .05 * Math.sin(u * 61); S.push({ h, m: { rock: .3 + .3 * (h > .6), soil: .3, veg: .4 * (h < .6), sand: .1, wet: .2, ice: 0 }, hollow: .2 * (h < .4), crack: i === 40 ? .8 : 0, temp: .55, moist: .5, fold: i > 70 && i < 78 ? .6 : 0, fresh: i < 10 ? .5 : 0, river: i === 30 || i === 31 ? 1 : 0 }); }
  const out = [];
  for (const q of qs) { const dpr = QDPR[q], c = mkCanvas(Math.round(W * dpr), Math.round(H * dpr)), g = c.getContext('2d'), res = {};
    for (const kase of kases) { const world = { place: kase === 'season' ? { season: -.8, weather: .85 } : {} };
      const RO = kase === 'rare' ? ohms.map((o, i) => i < nRare ? rareOhm({ ...o }, i) : o) : kase === 'char' ? ohms.map((o, i) => charOhm({ ...o }, i)) : ohms;
      const look = createLook({ music, makeCanvas, world, opts: { post: false, realLook: { bake: { mode: 'manual' }, ...realLook } } });
      const L = { i: 0, ver: 1 }, BK = kase === 'back' ? backSlices(look, W, H, S) : null, st = () => ({ t: T, W, H, q, ...(kase === 'trip' ? { trip: .9, burst: .8 } : {}) });
      look.frame({ t: T, W, H, q }); const cold = [now()]; look.planet(g, P1, 270, 300, 150, st()); look.planet(g, P2, 80, 160, 40, st()); look.star(g, 330, 90, 26, st()); look.ground(g, L, S, st()); if (BK) for (const [SL, P] of BK) look.ground(g, SL, P, st()); look.api.flush(); cold.push(now());
      const ts = [], pumps = [], idles = [];
      for (let f = 0; f < warm + frames; f++) { T += 1 / 60; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H);
        for (let i = 0; i < N; i++) { const o = RO[i]; o.x = 30 + (i % 7) * 56 + Math.sin(T + i) * 6; o.y = 380 + Math.floor(i / 7) * 50 + Math.cos(T * 1.3 + i) * 6; o.glow = .5 + .5 * Math.sin(T * 3 + i);
          if (o.body && o.body.rest) { const b = o.body, w = Math.sin(T * 2.1 + i) * .06; b.x = o.x; b.y = o.y; b.vx = Math.cos(T + i); for (let k = 0; k < 10; k++) { b.ring[k * 4] = b.rest[k * 2] * (1 + w); b.ring[k * 4 + 1] = b.rest[k * 2 + 1] * (1 - w); } } }
        if (flush) flush(g); const t0 = now(); look.frame(st()); const t1 = now();
        look.star(g, 330, 90, 26, null); look.planet(g, P2, 80, 160, 40, null); look.planet(g, P1, 270, 300, 150, null); look.ground(g, L, S, null); if (BK) for (const [SL, P] of BK) { g.save(); g.beginPath(); g.rect(Math.floor(P.cx), 0, Math.ceil(P.cw) + 1, H); g.clip(); look.ground(g, SL, P, null); g.restore(); }
        if (kase === 'rare' && look.rare) for (const L of [0, 1]) for (let i = 0; i < nRare; i++) { const o = RO[i]; look.rare(g, o, o.x, o.y, o.r, L, null); }
        if (look.ohmBody) for (const o of RO) if (o.body) look.ohmBody(g, o, o, o.r, 1);   // as world ohmdraw.js asks before its blob fill (a claimed body = no blob, no erase)
        for (const o of RO) look.ohm(g, o, o.x, o.y, o.r, null);
        if (flush) flush(g); const dt = now() - t0; const i0 = now(); look.api.idle(idle[q]); const di = now() - i0; if (f >= warm) { ts.push(dt); pumps.push(t1 - t0); idles.push(di); } }
      ts.sort((a, b) => a - b); const r = look.stats().real;
      res[kase] = { mean: ts.reduce((a, b) => a + b, 0) / ts.length, med: ts[ts.length >> 1], p95: ts[Math.floor(ts.length * .95)], max: ts[ts.length - 1], frameMs: pumps.reduce((a, b) => a + b, 0) / pumps.length, idleMs: idles.reduce((a, b) => a + b, 0) / idles.length, idleMax: Math.max(...idles), coldMs: cold[1] - cold[0],
        texMs: r.planets.texMs, discMs: r.planets.discMs, discBakes: r.planets.discBakes, groundBakeMs: r.ground.bakeMs, groundBakes: r.ground.bakes, maxGroundBake: r.ground.maxBakeMs, groundVec: r.ground.vector, groundDraws: r.ground.draws, groundCut: r.ground.cut | 0, groundPx: r.ground.px | 0, rareStats: look.api.rare ? { ...look.api.rare.stats } : null, charStats: look.api.ohmChar ? { ...look.api.ohmChar.stats } : null }; }
    out.push({ q, dpr, ...res }); }
  return out; }
export const tableReal = rows => rows.map(r => `q${r.q} (dpr ${r.dpr}): ` + ['calm', 'trip', 'season', 'back', 'rare', 'char'].filter(k => r[k]).map(k => `${k} ${r[k].mean.toFixed(2)} (p95 ${r[k].p95.toFixed(2)}, max ${r[k].max.toFixed(1)}; frame ${r[k].frameMs.toFixed(2)}, idle bake ${r[k].idleMs.toFixed(2)}/${r[k].idleMax.toFixed(1)}; ground draws ${r[k].groundDraws} vector ${r[k].groundVec} cut ${r[k].groundCut} Mpx ${(r[k].groundPx / 1e6).toFixed(1)} bakes ${r[k].groundBakes})`).join(' | ')
  + (!r.calm ? '' : `\n      bake: cold flush ${r.calm.coldMs.toFixed(0)} ms (planet tex ${r.calm.texMs.toFixed(0)} + ${r.calm.discBakes} discs ${r.calm.discMs.toFixed(0)} ms; ground ${r.calm.groundBakes} tiles ${r.calm.groundBakeMs.toFixed(0)} ms, worst tile ${r.calm.maxGroundBake.toFixed(1)} ms)`)).join('\n');
