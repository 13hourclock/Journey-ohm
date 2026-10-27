// shared fakes for the systems module tests (bus, music clock, sim with ohms, brain, autojam pairs)
import { makeRecipe } from '../www/js/recipe.js';
export function fakeBus() { const h = new Map(), B = { notes: [], posts: [], ctls: {} };
  B.on = (t, f) => { if (!h.has(t)) h.set(t, []); h.get(t).push(f); };
  B.post = ev => { B.posts.push(ev); for (const f of h.get(ev.type) || []) f(ev); };
  B.note = ev => { B.notes.push(ev); for (const f of h.get('note') || []) f(ev); };
  B.ctl = (s, k, v) => { B.ctls[k] = v; }; B.set = () => {}; B.tap = null; return B; }
export function fakeMusic() { const M = { b: 0, bpm: 120, key: 0, chord: { root: 0, tones: [0, 2, 4] }, listeners: [] };
  M.beat = t => t == null ? M.b : t * 2; M.timeOfBeat = b => b / 2; M.spb = () => .5; M.now = () => M.b / 2; return M; }
export function fakeSim(n = 6) { const S = { ohms: [], byId: new Map(), ohm: null, opts: { autojam: { near: 2.5, droneK: .15, sleepK: .05, reach: 3 } }, world: { pseed: 777, bangs: [], bang(k) { this.bangs.push(k); } } };
  for (let i = 1; i <= n; i++) { const seed = 1000 + i * 37, rec = makeRecipe(seed, { add: true }); const o = { id: i, seed, scale: 'ohm', recipe: rec.id != null ? rec.id : seed, body: { x: i <= 2 ? i * .8 : i * 5, y: 0 }, awake: true }; S.ohms.push(o); S.byId.set(i, o); }
  S.neighbors = (o, r) => S.ohms.filter(x => x !== o && Math.hypot(x.body.x - o.body.x, x.body.y - o.body.y) < r);
  const mem = new Map(); S.brain = { dirty: false, get: (o, k, key) => mem.get(o.id + k + key) || null, remember: (o, k, key, data, add) => { let e = mem.get(o.id + k + key); if (!e) mem.set(o.id + k + key, e = { kind: k, key, data, strength: 0 }); else if (data) e.data = data; e.strength += add; return e; },
    list: (o, k) => [...mem.entries()].filter(([id, e]) => id.startsWith(o.id + k) && e.kind === k).map(([, e]) => e) };
  return S; }
