// WORLD <-> SCREEN (pure). World units = R px of the layout (R = min(w,h) * .13), origin = the layout rest point (w/2, .36h).
// The camera (sim.cam { x, y, z }, default 0,0,1) belongs to the world track (zoom / pan); everything that maps touches or
// draws ohms goes through here so zoom only has to change the camera.
export const unit = (W, H) => Math.min(W, H) * .13;
export function toScreen(W, H, cam, x, y, out = {}) { const R = unit(W, H) * cam.z; out.x = W / 2 + (x - cam.x) * R; out.y = H * .36 + (y - cam.y) * R; out.s = R; return out; }
export function toWorld(W, H, cam, sx, sy, out = {}) { const R = unit(W, H) * cam.z; out.x = (sx - W / 2) / R + cam.x; out.y = (sy - H * .36) / R + cam.y; out.s = R; return out; }
