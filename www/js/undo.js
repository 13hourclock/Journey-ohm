// SYSTEMS: ONE undo stack for every track. push({ label, undo(), redo(), x?, y? (world units, where the rewind ripple shows) }).
// 3-finger tap = undo, 4-finger tap = redo (gestures.js), also the hook + '<' / '>' glyph. Actions pushed while an undo/redo
// runs are ignored (the action's own side effects must not stack). Any new action clears the redo side. Not saved across launches.
export function createUndo(bus, music, opts = {}) {
  const U = { done: [], undone: [], max: opts.max || 80, busy: false, marks: [], n: 0 };
  U.push = a => { if (U.busy || !a || !a.undo) return a; a.at = music.now(); U.done.push(a); if (U.done.length > U.max) U.done.shift(); U.undone.length = 0; U.n++; return a; };
  const run = (from, to, fn, type) => { const a = from.pop(); if (!a) { U.marks.push({ type: type + '.none', t: performance.now() }); return null; }
    U.busy = true; try { a[fn](); } catch (e) { console.warn(type, a.label, e); } finally { U.busy = false; } to.push(a);
    U.marks.push({ type, label: a.label, x: a.x, y: a.y, t: performance.now() }); if (U.marks.length > 8) U.marks.shift(); bus.post({ type, label: a.label, x: a.x, y: a.y }); return a; };
  U.undo = () => run(U.done, U.undone, 'undo', 'undo');
  U.redo = () => run(U.undone, U.done, 'redo', 'redo');
  U.peek = () => U.done[U.done.length - 1] || null;
  U.clear = () => { U.done.length = 0; U.undone.length = 0; };
  return U;
}
