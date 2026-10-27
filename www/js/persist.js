// SYSTEMS: SAVE / RESTORE registry. Any module registers a part { save() -> plain data, load(data, snap), prio, optional };
// one snapshot holds every part. Saved when the app goes to the background (hidden / pagehide / freeze / Capacitor pause),
// every opts.bars bars, and on demand; read SYNCHRONOUSLY at launch (localStorage) so relaunch resumes the world before the
// first frame. ?fresh=1 starts a fresh world (old songsave). Heavy parts marked optional are dropped first if storage is full.
// Brains keep their own store (brain.js); the 'brain' part only triggers brain.save().
export const SAVE_KEY = 'jo.save.v1';
export function createPersist(music, opts = {}) {
  const ls = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
  const P = { parts: [], saves: 0, loads: 0, ms: 0, bytes: 0, at: 0, why: '', err: null, opts: { on: true, resume: true, bars: 8, ...opts }, lastBar: -1, restored: null, key: SAVE_KEY };
  P.register = (name, part) => { P.parts = P.parts.filter(p => p.name !== name); P.parts.push({ name, prio: 0, ...part }); P.parts.sort((a, b) => a.prio - b.prio); return P; };
  P.snapshot = () => { const out = { v: 1, at: Date.now(), beat: music.beat(), parts: {} };
    for (const p of P.parts) if (p.save) { try { const d = p.save(); if (d !== undefined) out.parts[p.name] = d; } catch (e) { P.err = p.name + ': ' + e; } } return out; };
  P.save = (why = 'now') => { if (!P.opts.on) return false; const t0 = performance.now(), snap = P.snapshot(), L = ls(); if (!L) return false; let s = JSON.stringify(snap);
    try { L.setItem(P.key, s); } catch (e) { for (const p of P.parts) if (p.optional) delete snap.parts[p.name]; s = JSON.stringify(snap); try { L.setItem(P.key, s); } catch (e2) { P.err = 'storage full'; return false; } }
    P.saves++; P.bytes = s.length; P.at = Date.now(); P.why = why; P.ms = performance.now() - t0; return true; };
  P.read = () => { const L = ls(); if (!L) return null; try { if (typeof location !== 'undefined' && /[?&]fresh=1/.test(location.search)) { L.removeItem(P.key); return null; } const s = L.getItem(P.key); if (!s) return null; const d = JSON.parse(s); return d && d.v === 1 && d.parts ? d : null; } catch (e) { return null; } };
  P.restore = snap => { if (!snap) return false; for (const p of P.parts) if (p.load && snap.parts[p.name] != null) { try { p.load(snap.parts[p.name], snap); } catch (e) { P.err = p.name + ': ' + e; console.warn('restore', p.name, e); } }
    // time passes while away (PLAN_SYSTEMS 4): the music picks up where it was; slow things (plants, ...) get the seconds you were gone
    P.away = Math.max(0, (Date.now() - (snap.at || Date.now())) / 1000); for (const p of P.parts) if (p.away) { try { p.away(P.away, snap); } catch (e) { P.err = p.name + ' away: ' + e; } }
    P.loads++; P.restored = snap; return true; };
  P.forget = () => { const L = ls(); if (L) try { L.removeItem(P.key); } catch (e) {} };
  // every opts.bars bars, off the control tick when the browser offers idle time
  P.tick = () => { const bar = Math.floor(music.beat() / 4); if (bar === P.lastBar) return; const prev = P.lastBar; P.lastBar = bar;
    if (prev >= 0 && P.opts.bars && bar % P.opts.bars === 0) { const go = () => P.save('bar'); if (globalThis.requestIdleCallback) requestIdleCallback(go, { timeout: 1000 }); else setTimeout(go, 0); } };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (document.hidden) P.save('hidden'); });
    document.addEventListener('freeze', () => P.save('freeze')); document.addEventListener('pause', () => P.save('pause'));   // Capacitor / page lifecycle
    globalThis.addEventListener && globalThis.addEventListener('pagehide', () => P.save('pagehide')); }
  return P;
}
