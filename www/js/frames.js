// frame timing (rAF interval + draw cost), gaps > 50 ms while visible count as frame dropouts
export function createFrames() {
  const F = { iv: [], dr: [], all: [], allDr: [], gapsTotal: 0, gapsSince: 0, last: 0 };
  const st = (a) => { if (!a.length) return { mean: null, p95: null }; const s = a.slice().sort((x, y) => x - y); return { mean: a.reduce((x, y) => x + y, 0) / a.length, p95: s[Math.floor(s.length * .95)] }; };
  F.frame = (t, drawMs) => { if (F.last && !document.hidden) { const d = t - F.last; if (d < 1000) { F.iv.push(d); F.all.push(d); if (d > 50) { F.gapsTotal++; F.gapsSince++; } } } F.last = t; F.dr.push(drawMs); F.allDr.push(drawMs);
    if (F.iv.length > 120) F.iv.shift(); if (F.dr.length > 120) F.dr.shift(); if (F.all.length > 20000) F.all.shift(); if (F.allDr.length > 20000) F.allDr.shift(); };
  F.recent = () => { const a = st(F.iv); return { mean: a.mean, p95: a.p95, drawMean: st(F.dr).mean }; };
  F.mark = () => { F.all = []; F.allDr = []; F.gapsSince = 0; };
  F.since = () => { const a = st(F.all); return { mean: a.mean, p95: a.p95, drawMean: st(F.allDr).mean, gaps: F.gapsSince }; };
  document.addEventListener('visibilitychange', () => { F.last = 0; });
  return F;
}
