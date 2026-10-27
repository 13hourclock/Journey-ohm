// SYSTEMS: one musical clock that never jumps. The audio clock leads while it runs; the perf clock covers the rest
// (audio off / starting / rebuilt). Switching between them keeps time continuous (offset carried over), and while the app is in
// the background (screen off, app switched away) time HOLDS, so the music carries on from the same spot when you come back
// (old songsave: "backgrounding = carries on as if paused"). With opts.bgSound on (keepBg) time keeps running in the background.
export function createClock(audio) {
  const C = { last: 0, src: null, off: 0, keepBg: () => false, holds: 0 };
  C.now = () => { const ctx = audio.ctx, run = !!(ctx && ctx.state === 'running'), hidden = typeof document !== 'undefined' && document.hidden;
    if (hidden && !C.keepBg()) { if (C.src) C.holds++; C.src = null; return C.last; }
    const key = run ? ctx : 'perf', raw = run ? ctx.currentTime : performance.now() / 1000;
    if (key !== C.src) { C.off = C.last - raw; C.src = key; }
    let t = raw + C.off; if (t < C.last) t = C.last; C.last = t; if (run) audio.off = C.off; return t; };
  C.set = t => { C.last = t; C.src = null; };
  return C;
}
