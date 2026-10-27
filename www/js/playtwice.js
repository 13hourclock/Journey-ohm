// PLAY A PHRASE TWICE AND IT TAKES IT AS ITS TUNE (old game playmode.js Pm.teach, R4.7 "phrase twice = taught"; QUESTIONS 217 / review 33
// default "motif only"). Play an ohm by hand (tap its nodes, input.js playNode) and play the same 4..8-note phrase twice in a row: that
// ohm adopts it as its tune. It goes into its brain as its strongest long part ('phrase', played bar by bar by autojam when it uses
// learned material) and its strongest pattern (rhythm + steps, so its answers take its shape), so it keeps coming back to it, passes it on
// through teaching / offspring like any learned pattern, and is saved with the ohm. A flash ('ohm.tune') marks the moment; undo
// (3-finger tap) takes it back. Note: autojam plays a learned PATTERN as a one-bar shape on chord tones (the whole phrase squeezed into a
// bar); the exact tune note for note plays only when brain retention is on (opts.brain.retain, off), as for every long part. Degrees must match exactly; the rhythm is taken from the second pass (quantised to 1/4 beat).
// Switch 'playTwice' (ON); off = v0.0.28 (the brain only learns from you in the usual slow way). Cost: one small array check per tapped note.
export const PLAYTWICE_OPTS = { on: true, minL: 4, maxL: 8, gapBeats: 6, strength: 4, minDistinct: 2 };   // minDistinct: drumming one node over and over teaches nothing
export function createPlayTwice({ sim, bus, music, brain, undo = null, opts = {} }) {
  const O = { ...PLAYTWICE_OPTS, ...opts }, T = { opts: O, buf: new Map(), adopted: 0, last: null };
  const clone = e => (e ? JSON.parse(JSON.stringify(e)) : null);
  T.check = o => { const p = T.buf.get(o.id); if (!p) return null;
    for (let L = O.maxL; L >= O.minL; L--) { if (p.length < 2 * L) continue; const a = p.slice(-2 * L, -L), b = p.slice(-L);
      if (new Set(b.map(n => n.deg)).size >= O.minDistinct && a.every((n, i) => n.deg === b[i].deg && (n.oct || 0) === (b[i].oct || 0))) return { L, pass: b }; } return null; };
  T.adopt = (o, pass) => { if (!brain || !brain.phrase) return false; const b0 = pass[0].b, q = x => Math.round(x * 4) / 4;
    let rel = pass.map(n => ({ b: q(n.b - b0), d: n.deg, oct: n.oct || 0, dur: .25, vel: n.vel == null ? .7 : n.vel }));
    const span = Math.max(4, Math.ceil((rel[rel.length - 1].b + .25) / 4) * 4); rel = rel.concat(rel.map(n => ({ ...n, b: n.b + span })));   // its tune: the phrase twice, as you played it
    const top = k => brain.list(o, k).reduce((m, e) => Math.max(m, e.strength), 0), before = { pat: null, ph: null, tune: o.tune || null };
    const bar0 = rel.slice(0, pass.length), sc = Math.min(1, 3.75 / Math.max(.25, bar0[bar0.length - 1].b)), rh = bar0.map(n => q(n.b * sc)), iv = bar0.slice(1).map((n, i) => n.d - bar0[i].d), pkey = rh.join() + '|' + iv.join();   // its shape in one bar (what autojam answers with by default)
    before.pat = clone(brain.get(o, 'pattern', pkey)); const sum = brain.list(o, 'pattern').reduce((m, e) => m + (e.key === pkey ? 0 : e.strength), 0), s = Math.max(O.strength, sum + 1, top('phrase') + 1);   // taught by hand: at least half of what it plays from memory
    const phs = new Map(brain.list(o, 'phrase').map(e => [e.key, clone(e)])); const pe = brain.phrase(o, rel, s, s); before.ph = pe ? { key: pe.key, old: phs.get(pe.key) || null } : null;
    if (bar0.length >= 2) brain.remember(o, 'pattern', pkey, { rh, iv, len: bar0.length }, s, s);
    o.tune = { deg: pass.map(n => n.deg), at: music.beat(), n: (o.tune && o.tune.n || 0) + 1 }; o.glow = Math.min(1.4, (o.glow || 0) + .6); T.adopted++; T.last = { id: o.id, L: pass.length };
    if (undo && undo.push) undo.push({ label: 'tune', x: o.body && o.body.x, y: o.body && o.body.y, undo: () => {
        if (before.pat) { const e = brain.get(o, 'pattern', pkey); if (e) Object.assign(e, before.pat); } else brain.drop && brain.drop(o, 'pattern', pkey);
        if (before.ph) { if (before.ph.old) { const e = brain.get(o, 'phrase', before.ph.key); if (e) Object.assign(e, before.ph.old); } else if (brain.drop) brain.drop(o, 'phrase', before.ph.key); } o.tune = before.tune; T.adopted = Math.max(0, T.adopted - 1); },
      redo: () => T.adopt(o, pass) });
    if (bus && bus.post) bus.post({ type: 'ohm.tune', src: o, len: pass.length, x: o.body && o.body.x, y: o.body && o.body.y });
    return true; };
  if (bus && bus.on) bus.on('note', ev => { if (!O.on || !ev || ev.auto || ev.inputT == null || ev.deg == null) return; const o = ev.src; if (!o || o.scale !== 'ohm') return;
    const b = ev.beat != null ? ev.beat : music.beat(ev.t); let p = T.buf.get(o.id); if (!p) T.buf.set(o.id, p = []);
    if (p.length && b - p[p.length - 1].b > O.gapBeats) p.length = 0;
    for (const [id, q] of T.buf) if (id !== o.id && q.length) q.length = 0;   // you moved to another ohm: start again there
    p.push({ deg: ev.deg, oct: ev.oct || 0, b, vel: ev.vel }); if (p.length > 2 * O.maxL) p.shift();
    const hit = T.check(o); if (hit && T.adopt(o, hit.pass)) p.length = 0; });
  return T;
}
