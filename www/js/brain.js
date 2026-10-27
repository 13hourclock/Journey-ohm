// v0.0.6 THE OHM'S BRAIN (Wilbow 2:33-2:34: "11A 11D" + "the ohms are also a brain that stores other information aside from what
// they are like"). An ohm has two sides: WHAT IT'S LIKE (genes + synth engine, shaped live through the matrix) and A BRAIN: an open,
// generic memory store. Entries are { kind, key, data, strength, lastUsed (beat) }; any new kind can be added without a schema change.
// Kinds today, for example: 'pattern', 'phrase' (v0.0.7: a long part, sections stored once), 'sound', 'partner', 'player'. Not a fixed list.
// v0.0.7 RETENTION BY USE (Wilbow 3:18 "remember complicated music that it's playing but not everything ever played"; PROPOSAL
// opts.brain.retain, toggle; off = the v0.0.6 bar-based fade). Two layers in the same store:
//   HEARD  (e.plays == 0): only heard. Unused for heardIdleS game seconds, it fades with a half-life of heardHalfS (a few minutes).
//   PLAYING (e.plays > 0): its repertoire. Every time it plays / returns to it (R.use) it gets stronger; it only starts to fade after
//   playIdleS game seconds unplayed (e.g. 15 min), then slowly (playHalfS). Game time = audio-clock time while the world runs.
// Long parts: R.phrase(o, notes, k) stores up to opts.brain.phraseBars bars, cut into sections of secBars; a section is packed at 8 bytes
// per note and stored ONCE per ohm (shared by every phrase that repeats it; a transposed repeat = the same section + a degree offset).
// Capacity: about opts.brain.cap notes per ohm (x .75..1.25 by gene); when full the weakest, least recently played phrase goes first.
// Saved with the ohm in IndexedDB ('journeyohm' / 'brain', keyed by the ohm's seed); localStorage only as a fallback / old-save import.
const KEY = 'jo.brain', DB = 'journeyohm', ST = 'brain', Q = 48;   // Q = time steps per beat in packed notes (16ths and triplets exact)
const gene = (o, salt) => { let s = ((o.seed || o.id) * 2246822519 + salt * 3266489917) >>> 0; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const unb64 = s => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
// one note = 8 bytes: time (uint16, 1/48 beat from section start), degree (int8, relative to the section's first note), octave (int8),
// duration (uint16, 1/48 beat), velocity (uint8, 0..255), flags (uint8: 1 = bend / slide kept)
export const packNotes = (ns, t0, base) => { const u = new Uint8Array(ns.length * 8), v = new DataView(u.buffer);
  ns.forEach((n, i) => { const j = i * 8; v.setUint16(j, Math.max(0, Math.min(65535, Math.round((n.b - t0) * Q))), true); v.setInt8(j + 2, Math.max(-128, Math.min(127, (n.d | 0) - base)));
    v.setInt8(j + 3, n.oct | 0); v.setUint16(j + 4, Math.max(1, Math.min(65535, Math.round((n.dur || .25) * Q))), true); v.setUint8(j + 6, Math.round(Math.max(0, Math.min(1, n.vel == null ? .6 : n.vel)) * 255)); v.setUint8(j + 7, n.bend ? 1 : 0); });
  return u; };
export const unpackNotes = (u, t0 = 0, base = 0) => { const v = new DataView(u.buffer, u.byteOffset, u.byteLength), out = [];
  for (let j = 0; j + 8 <= u.length; j += 8) out.push({ b: t0 + v.getUint16(j, true) / Q, d: base + v.getInt8(j + 2), oct: v.getInt8(j + 3), dur: v.getUint16(j + 4, true) / Q, vel: v.getUint8(j + 6) / 255, bend: v.getUint8(j + 7) & 1 });
  return out; };
const hashU = u => { let h = 2166136261; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '.' + u.length; };
export function createBrain(world, music) {
  const ALL = () => { const a = world.sources || [], o = world.ohms; if (!o || !o.length) return a; const s = new Set(o); for (const x of a) s.add(x); return [...s]; };   // systems: every ohm, asleep too (was: awake only), plus other sources
  const O = world.opts, R = { dirty: false, lastSave: 0, gt: 0, lastNow: null, ms: 0, db: null, loaded: false };
  const idb = typeof indexedDB !== 'undefined' ? indexedDB : null;
  let saved = null; const disk = () => { if (saved) return saved; saved = {}; try { const d = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || '{}'); for (const id in d) saved[id] = fromLS(d[id]); } catch (e) {} return saved; };
  const fromLS = r => { if (r && r.sec) for (const h in r.sec) if (typeof r.sec[h].p === 'string') r.sec[h].p = unb64(r.sec[h].p); return r; };
  const toLS = b => { const sec = {}; for (const h in b.sec || {}) sec[h] = { p: b64(b.sec[h].p), n: b.sec[h].n, refs: b.sec[h].refs }; return { e: b.e, sec }; };
  const idOf = o => { const s = o.seed != null ? o.seed : o.id; return String(s); };
  const fresh = () => ({ e: {}, sec: {} });
  R.of = o => { if (!o.brain) { const d = disk()[idOf(o)]; o.brain = d && d.e ? { e: d.e, sec: d.sec || {} } : fresh(); if (!d && idb && !R.loaded) o.brainPending = 1; } if (!o.brain.sec) o.brain.sec = {}; return o.brain; };
  // IndexedDB: load every saved brain once at start (async); an ohm whose brain was created before the load finished adopts its save
  if (idb) { try { const rq = idb.open(DB, 1); rq.onupgradeneeded = () => rq.result.createObjectStore(ST); rq.onerror = () => { R.loaded = true; };
    rq.onsuccess = () => { R.db = rq.result; const tx = R.db.transaction(ST, 'readonly'), s = tx.objectStore(ST), ks = s.getAllKeys(), vs = s.getAll();
      tx.oncomplete = () => { const d = disk(); ks.result.forEach((k, i) => { d[String(k)] = vs.result[i]; }); R.loaded = true;
        for (const o of ALL()) if (o.brainPending) { o.brainPending = 0; const r = d[idOf(o)]; if (r && r.e && !Object.keys(o.brain.e).length) o.brain = { e: r.e, sec: r.sec || {} }; } }; }; } catch (e) { R.loaded = true; } }
  const k2 = (kind, key) => kind + ':' + key;
  const C = () => O.brain || {};
  // remember: create or strengthen (add) an entry; data replaces only when given. New entries are HEARD (plays 0).
  R.remember = (o, kind, key, data, add = 0, max = 4) => { const b = R.of(o).e, id = k2(kind, key), now = music.beat(); let e = b[id];
    if (!e) e = b[id] = { kind, key, data: data == null ? null : data, strength: 0, lastUsed: now, lastT: R.gt, plays: 0 }; else if (data != null) e.data = data;
    e.strength = Math.min(Math.max(max, e.strength), e.strength + add); e.lastUsed = now; e.lastT = R.gt; R.dirty = true; return e; };
  R.get = (o, kind, key) => R.of(o).e[k2(kind, key)] || null;
  R.list = (o, kind) => { const out = []; for (const id in R.of(o).e) { const e = o.brain.e[id]; if (!kind || e.kind === kind) out.push(e); } return out; };
  // it PLAYED from this memory: fresh again, and (retain) it joins / strengthens its repertoire
  R.use = e => { if (!e) return; e.lastUsed = music.beat(); e.lastT = R.gt; const c = C(); if (c.retain) { e.plays = (e.plays || 0) + 1; e.strength = Math.min(c.playMax || 8, e.strength + (c.playAdd || .25)); } R.dirty = true; };
  const dropEntry = (o, e) => { const b = o.brain; if (e.kind === 'phrase' && e.data && e.data.secs) for (const s of e.data.secs) { const x = b.sec[s.h]; if (x && --x.refs <= 0) delete b.sec[s.h]; } delete b.e[k2(e.kind, e.key)]; };
  R.drop = (o, kind, key) => { const e = R.get(o, kind, key); if (e) { dropEntry(o, e); R.dirty = true; } return !!e; };   // v0.0.29 (playtwice.js undo)
  R.prune = (o, kind, n) => { const l = R.list(o, kind); if (l.length <= n) return; l.sort((a, b) => b.strength - a.strength); for (const e of l.slice(n)) dropEntry(o, e); };
  R.notes = o => { let n = 0; for (const h in R.of(o).sec) n += o.brain.sec[h].n; return n; };
  R.capOf = o => Math.round((C().cap || 2000) * (.75 + .5 * gene(o, 11)));
  // LONG PARTS: notes = [{b (beats from the phrase start), d (scale degree), oct, dur, vel, bend}], k = how strongly it took it in
  R.phrase = (o, notes, k = .2, max = 4) => { const c = C(), sb = (c.secBars || 4) * 4, bars = Math.min(c.phraseBars || 64, Math.ceil(((notes.length ? notes[notes.length - 1].b : 0) + 1e-6) / 4) || 1);
    const br = R.of(o), secs = []; let n = 0;
    for (let s0 = 0; s0 < bars * 4; s0 += sb) { const ns = notes.filter(x => x.b >= s0 && x.b < s0 + sb && x.b < bars * 4); if (!ns.length) { secs.push({ h: '', tr: 0 }); continue; }
      const base = ns[0].d | 0, u = packNotes(ns, s0, base), h = hashU(u); if (!br.sec[h]) br.sec[h] = { p: u, n: ns.length, refs: 0 }; secs.push({ h, tr: base }); n += ns.length; }
    const key = secs.map(s => s.h + (s.tr ? '+' + s.tr : '')).join('/'); let e = br.e[k2('phrase', key)];
    if (!e) { for (const s of secs) if (s.h) br.sec[s.h].refs++; e = R.remember(o, 'phrase', key, { bars, secBars: sb / 4, secs, n }, k, max); } else R.remember(o, 'phrase', key, null, k, max);
    R.fit(o); return br.e[k2('phrase', key)] || null; };
  R.phraseNotes = e => { if (!e || !e.data || !e.data.secs) return []; let br = null; for (const o of ALL()) if (o.brain && o.brain.e[k2('phrase', e.key)] === e) { br = o.brain; break; }
    if (!br) return []; const out = [], sb = (e.data.secBars || 4) * 4; e.data.secs.forEach((s, i) => { const x = s.h && br.sec[s.h]; if (x) for (const n of unpackNotes(x.p, i * sb, s.tr)) out.push(n); }); return out; };
  // full: drop the weakest, least recently played phrases first (heard before repertoire)
  R.fit = o => { const cap = R.capOf(o); let n = R.notes(o); if (n <= cap) return; const l = R.list(o, 'phrase').sort((a, b) => ((a.plays ? 1 : 0) - (b.plays ? 1 : 0)) || (a.strength - b.strength) || (a.lastT - b.lastT));
    for (const e of l) { if (n <= cap) break; dropEntry(o, e); n = R.notes(o); } };
  // fade: once per bar
  R.bar = () => { const c = C(), t0 = performance.now(), now = music.beat(), tn = music.now(); const dt = R.lastNow == null ? 0 : Math.max(0, Math.min(8, tn - R.lastNow)); R.lastNow = tn; R.gt += dt;
    if (c.fades) for (const o of ALL()) { if (!o.brain) continue; const b = o.brain.e;
      const kp = .5 + Math.max(0, (o.brainMod && o.brainMod.keep) || 0);   // context (matrix brain.keep) stretches / shortens every retention time
      for (const id in b) { const e = b[id]; if (e.keep) continue; let f = 1;   /* keep: learned sound drift + experience never fade */
        if (!c.retain) { if (now - e.lastUsed > c.idle) f = c.fade; }
        else if (!e.plays) { if (R.gt - (e.lastT || 0) > (c.heardIdleS || 30) * kp) f = Math.pow(.5, dt / ((c.heardHalfS || 90) * kp)); }
        else if (R.gt - (e.lastT || 0) > (c.playIdleS || 900) * kp) f = Math.pow(.5, dt / ((c.playHalfS || 600) * kp));
        if (f < 1) { e.strength *= f; R.dirty = true; if (e.strength < .01) dropEntry(o, e); } } }
    R.ms = R.ms * .8 + (performance.now() - t0) * .2;
    if (R.dirty && now - R.lastSave > 64) R.save(); };
  R.sizeOf = o => { const b = R.of(o); let s = JSON.stringify(b.e).length; for (const h in b.sec) s += b.sec[h].p.length + 24; return s; };   // save bytes (IndexedDB stores the packed notes as raw bytes)
  R.save = () => { const d = disk(), put = [];
    for (const o of ALL()) if (o.brain && o.scale === 'ohm' && !o.brainPending) { const r = { e: o.brain.e, sec: o.brain.sec }; d[idOf(o)] = r; put.push([idOf(o), r]); }
    if (R.db) { try { const tx = R.db.transaction(ST, 'readwrite'), s = tx.objectStore(ST); for (const [k, r] of put) s.put(r, k); tx.oncomplete = () => { try { localStorage.removeItem(KEY); } catch (e) {} }; } catch (e) {} }
    else if (typeof localStorage !== 'undefined') { const out = {}; for (const id in d) out[id] = toLS(d[id]); try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) {} }
    R.dirty = false; R.lastSave = music.beat(); };
  R.forget = () => { saved = {}; for (const o of ALL()) o.brain = fresh(); try { localStorage.removeItem(KEY); } catch (e) {} if (R.db) { try { R.db.transaction(ST, 'readwrite').objectStore(ST).clear(); } catch (e) {} } };   // dev panel 'forget all'
  return R;
}
