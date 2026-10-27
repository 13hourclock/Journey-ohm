// SYSTEMS: MOUTH CONTROL (PLAN_SYSTEMS 7, audit B6). Double tap an ohm's MOUTH (the lower middle of its body) = mouth control on that
// ohm: the mic opens (sing.js, latched) and stays open until you double tap the mouth again (or 20 s of silence). While it is on:
//   - hum / sing to STEER it: higher than the first note you sang = it moves right (and up, if it floats), lower = left (down);
//     louder = faster, silence = it stops. (Default; how the voice maps to motion is a question.)
//   - what you sing is RECORDED into the jam: your sung notes are added to the CURRENT phrase of the jam that ohm is in (autojam
//     memory) only - never to the song chart (B6: "add to the current phrase only"). The recording, chopping and the ohms using
//     your sound (the 'your voice' sample layer, its fx) are the audio track's sing.js / blend.js and are reused as they are.
import { noLine, softRing } from './soft.js';   // v0.0.30 lnHints: no outlines
export const MOUTH_OPTS = { on: true, dblMs: 350, dblPx: 40, quietS: 20, speed: 2.2, phraseMax: 8 };
export const mouthZone = (o, toS) => { const s = toS(o.body.x, o.body.y + o.g.r * .35); return { x: s.x, y: s.y, r: Math.max(26, o.g.r * s.s * .4) }; };
export function steerFrom(hz, hz0, rms, gate = .01) { if (!hz || !hz0 || rms < gate) return 0; const st = 12 * Math.log2(hz / hz0); return Math.max(-1, Math.min(1, st / 5)) * Math.min(1, .35 + rms * 8); }
export function createMouth(sim, bus, music, sing, sys, opts = {}) { const O = { ...MOUTH_OPTS, ...opts }, M = { opts: O, on: false, o: null, hz0: 0, last: null, quiet: 0, added: 0 };
  const zoneHit = (x, y) => { for (const o of sim.ohms) { if (o.parked || o.dead || !o.g) continue; const z = mouthZone(o, sys.toS); if (Math.hypot(x - z.x, y - z.y) < z.r) return o; } return null; };
  M.tap = (x, y) => { if (!O.on) return false; const o = zoneHit(x, y), t = performance.now(), L = M.last; M.last = { x, y, t, o };
    if (!o || !L || L.o !== o || t - L.t > O.dblMs || Math.hypot(x - L.x, y - L.y) > O.dblPx) return false; M.last = null; M.on && M.o === o ? M.stop() : M.start(o); return true; };
  M.start = o => { if (M.on) M.stop(); M.on = true; M.o = o; M.hz0 = 0; M.quiet = 0; bus.post({ type: 'sing', src: o, on: true }); bus.post({ type: 'sing', src: o, on: false }); bus.post({ type: 'mouth', src: o, on: true }); };   // on + quick off = sing.js latches the mic open
  M.stop = () => { if (!M.on) return; const o = M.o; M.on = false; M.o = null; if (sing && sing.active) bus.post({ type: 'sing', src: o, on: true }); bus.post({ type: 'mouth', src: o, on: false }); };   // a second 'on' closes a latched mic
  // your sung notes join the current phrase of the jam the ohm is in
  bus.on('note', ev => { if (!M.on || !sing || ev.src !== sing.src || ev.deg == null) return; const A = sys.autojam; if (!A || !A.mem) return; const P = (A.jams || []).find(P => P.a === M.o || P.b === M.o); if (!P) return;
    const key = Math.min(P.a.id, P.b.id) + '-' + Math.max(P.a.id, P.b.id), ph = (A.mem.get(key) || []).slice(); ph.push(ev.deg); while (ph.length > O.phraseMax) ph.shift(); A.mem.set(key, ph); M.added++; });
  M.tick = dt => { if (!M.on) return; const o = M.o; if (!o || o.dead || !sim.byId.has(o.id)) { M.stop(); return; } if (sing && !sing.active && M.quiet > 1) { M.on = false; M.o = null; return; }
    const hz = sing ? sing.hz : 0, rms = sing ? sing.rms || 0 : 0; if (hz && !M.hz0) M.hz0 = hz; const k = steerFrom(hz, M.hz0, rms); M.quiet = hz ? 0 : M.quiet + dt; if (M.quiet > O.quietS) { M.stop(); return; }
    const b = o.body; if (!k) return; b.vx += (k * O.speed - b.vx) * Math.min(1, dt * 4); if (o.g.float) { b.vy += (-k * O.speed * .6 - b.vy) * Math.min(1, dt * 3); b.homeY = b.y; } b.calm = 0; };
  M.draw = g => { if (!M.on || !M.o || !M.o.g) return; const z = mouthZone(M.o, sys.toS), t = performance.now(); if (noLine('lnHints')) { g.save(); g.translate(z.x, z.y); g.scale(1, .55); softRing(g, 0, 0, z.r * (1 + .15 * Math.sin(t * .008)), Math.max(3, z.r * .12), '330,80%,85%', .6); g.restore(); return; }   /* v0.0.30 lnHints: the sing-to-steer mouth is a soft ring of light */ g.strokeStyle = 'rgba(255,200,230,.75)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(z.x, z.y, z.r * (1 + .15 * Math.sin(t * .008)), z.r * .55, 0, 0, 6.283); g.stroke(); };
  return M; }
