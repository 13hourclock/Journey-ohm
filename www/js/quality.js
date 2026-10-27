// ADAPTIVE QUALITY LADDER (shared; track/ohms made the first rungs). Reads the frame time (EMA of rAF intervals) and the
// control tick cost; steps DOWN after ~1 s over budget, UP after ~5 s comfortably under, at most one step per second.
// Rungs (level -> what is cheaper):  0 full | 1 no halos on crowd ohms | 2 crowd ohms as flat discs | 3 + sleeping, settled
// ohms skip their soft-ring physics. Any track may read q.level and add its own cuts at the same rungs (Shared contracts).
export function createQuality(sim, budgetMs = 16.7) {
  const q = { level: 0, max: 3, ema: budgetMs * .8, over: 0, under: 0, lastChange: 0, forced: null };
  q.frame = (dtMs, ctlMs, now) => { if (!(dtMs > 0) || dtMs > 250) return q.level; q.ema = q.ema * .9 + dtMs * .1;
    const cost = q.ema + (ctlMs || 0) * .5, dt = dtMs / 1000;
    if (cost > budgetMs * 1.08) { q.over += dt; q.under = 0; } else if (cost < budgetMs * .92) { q.under += dt; q.over = 0; } else { q.over = 0; q.under = 0; }
    if (q.forced == null && now - q.lastChange > 1000) {
      if (q.over > 1 && q.level < q.max) { q.level++; q.over = 0; q.lastChange = now; }
      else if (q.under > 5 && q.level > 0) { q.level--; q.under = 0; q.lastChange = now; } }
    sim.lod = q.forced != null ? q.forced : q.level; return sim.lod; };
  return q;
}
