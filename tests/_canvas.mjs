// Canvas for node tests without any path outside the repo: the repo's own node_modules/canvas if it is installed (and its native
// binding loads), else LOOK_CANVAS_DIR=<dir with node_modules/canvas> if set, else a no-op 2D stub so the pure-logic checks still run.
import { createRequire } from 'module';
const tryReq = from => { try { return createRequire(from)('canvas'); } catch (e) { return { err: e.code || e.message.split('\n')[0] }; } };
let mod = tryReq(import.meta.url), how = 'repo node_modules/canvas';
if (mod.err && process.env.LOOK_CANVAS_DIR) { const m2 = tryReq(process.env.LOOK_CANVAS_DIR.replace(/\/?$/, '/')); if (!m2.err) { mod = m2; how = `LOOK_CANVAS_DIR (${process.env.LOOK_CANVAS_DIR})`; } }
export const realCanvas = !mod.err;
const noop = () => {}, grad = { addColorStop: noop };
const stubCtx = cv => { const st = { globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif' }, stack = [];
  const api = { canvas: cv, createRadialGradient: () => grad, createLinearGradient: () => grad, createPattern: () => ({}), measureText: s => ({ width: String(s).length * 6 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    save: () => stack.push({ ...st }), restore: () => { const s = stack.pop(); if (s) Object.assign(st, s); } };
  return new Proxy(st, { get: (t, k) => k in api ? api[k] : k in t ? t[k] : noop, set: (t, k, v) => { t[k] = v; return true; } }); };
const stubCanvas = (w = 1, h = 1) => { const c = { width: w, height: h }; let g; c.getContext = () => g || (g = stubCtx(c)); c.toBuffer = () => Buffer.alloc(0); return c; };
export const createCanvas = realCanvas ? mod.createCanvas : stubCanvas;
export const canvasNote = realCanvas ? `canvas: ${how}` : `canvas: node-canvas not available (${mod.err}); using a no-op 2D stub, so every logic / state check runs but nothing is rasterised (set LOOK_CANVAS_DIR to a dir with a working node_modules/canvas for real pixels)`;
