// screen geometry shared by render and input (pure). Nodes: 7 scale degrees around the ohm, degree 1 at the top, rising clockwise.
// body.x / body.y are world units (R px) from the rest point (space.js); the nodes open around the ohm where it is now (track/ohms).
// World track: ONE camera. sim.cam { x, y, z } (space.js, linear scale) is THE camera every hit test and drawing uses; this file
// keeps the zoom DEPTH state behind it: cam.z = continuous depth (0 = home layer, each +1 = ZK x closer, open-ended both ways),
// and sim.cam.z = ZK^cam.z always. Pan = sim.cam.x / y. The home anchor (where every layer opens) = world origin on screen.
import { toScreen, unit } from './space.js';
export const ZK = 4;
export const cam = { z: 0, v: 0, dir: 0, active: false, lockZ: false, shaping: false, zoomGo: false, sim: { x: 0, y: 0, z: 1 } };
export const bindCam = c => { cam.sim = c; c.z = Math.pow(ZK, cam.z); };
// change depth keeping the home anchor's pixel offset (pan) the same
export const setDepth = z => { const c = cam.sim, s1 = Math.pow(ZK, z), k = c.z / s1; c.x *= k; c.y *= k; c.z = s1; cam.z = z; };
export const camScale = () => cam.sim.z;
const _a = {};
export const anchor = (w, h) => toScreen(w, h, cam.sim, 0, 0, _a);
// anchor pixel offset from the rest point <-> camera
export const getOff = (w, h) => { const s = unit(w, h) * cam.sim.z; return { ox: -cam.sim.x * s, oy: -cam.sim.y * s }; };
export const setOff = (w, h, ox, oy) => { const s = unit(w, h) * cam.sim.z; cam.sim.x = -ox / s; cam.sim.y = -oy / s; };
export const ohmVisible = () => cam.z > -2.6 && cam.z < .92;
const _p = {};
export function layout(w, h, ohm, breath = 1) {
  const b = ohm && ohm.body, a = toScreen(w, h, cam.sim, 0, 0, _p), cx0 = a.x, cy0 = a.y, p = toScreen(w, h, cam.sim, b ? b.x : 0, b ? b.y : 0, _p);
  const R = ohmVisible() ? p.s : 0, cx = p.x, cy = p.y, nodes = [];
  for (let d = 0; d < 7; d++) { const an = -Math.PI / 2 + d / 7 * Math.PI * 2; nodes.push({ deg: d, x: cx + Math.cos(an) * R * 2.15, y: cy + Math.sin(an) * R * 2.15, r: R * .36 }); }
  return { cx, cy, cx0, cy0, R, Rb: R * breath, nodes, s: cam.sim.z };
}
