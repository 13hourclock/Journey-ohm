// v0.0.7 autojam presence: near jams play, far jams thin out, very far jams drone, farther still rest (no notes)
import { createAutoJam } from '../www/js/autojam.js';
import { makeRecipe, OPTS } from '../www/js/recipe.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const notes = []; const bus = { note: e => notes.push(e) }; let B = 0;
const music = { beat: () => B, timeOfBeat: b => b, chord: { tones: [0, 2, 4] } };
const mk = (id, x) => { const r = makeRecipe(100 + id); return { id, seed: 100 + id, recipe: r.id, scale: 'ohm', body: { x, y: 0 } }; };
const me = mk(1, 0), ohms = [me];
for (const [i, x] of [[2, 1], [3, 2], [4, 12], [5, 13], [6, 30], [7, 31], [8, 200], [9, 201]]) ohms.push(mk(i, x));
const world = { opts: OPTS, ohm: me, ohms, byId: new Map(ohms.map(o => [o.id, o])), neighbors: (o, r) => ohms.filter(p => p !== o && Math.abs(p.body.x - o.body.x) < r) };
const A = createAutoJam(world, bus, music);
const by = id => notes.filter(n => n.src.id === id || n.src.id === id + 1);
for (let bar = 0; bar < 8; bar++) { B = bar * 4; A.tick(); }
const pk = id => (A.jams.find(j => j.a.id === id) || { k: 0 }).k;
ok(!notes.some(n => n.src === me), 'your ohm is never in an autojam');
ok(pk(2) > pk(4) && pk(4) > pk(6) && pk(6) >= pk(8), `presence falls with distance ${[2, 4, 6, 8].map(i => pk(i).toFixed(3))}`);
const near = by(2).filter(n => n.kind === 'note'), mid = by(4).filter(n => n.kind === 'note');
ok(near.length > 0 && near.length >= mid.length, `near jam plays more notes (${near.length} vs ${mid.length})`);
ok(!mid.length || Math.max(...mid.map(n => n.gainK)) < Math.min(...near.map(n => n.gainK)), 'farther jam is quieter');
ok(by(6).filter(n => n.kind === 'note').length === 0 && by(6).filter(n => n.kind === 'sustain').length === 1, 'very far jam = one held drone');
ok(by(8).length === 0, 'farthest jam rests (no notes: its ohms can sleep, zero DSP)');
OPTS.autojam.on = false; notes.length = 0; B = 40; A.tick(); ok(notes.every(n => n.kind === 'release') && notes.length === 1, 'toggle off: drone released, nothing plays'); OPTS.autojam.on = true;
console.log(fail ? 'AUTOJAM_FAIL' : 'AUTOJAM_OK');
