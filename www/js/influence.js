// v0.0.6 INFLUENCE SOURCES (Wilbow 2:32: "Its synthesis engine can be tweaked by alot of things"). The ohm's own voice stays its own;
// these streams only feed the influence matrix (matrix.js rows), so anything can shape its synth params. Control rate, ~10/s, per
// AWAKE ohm, O(awake ohms): partners (what they play), you (touch), your singing, its physics, its place in the world, items.
// Posted as ordinary 'ctl' streams; values 0..1 (place.x/y -1..1). No random drift: values come only from these sources.
import { PLACE } from './instruments.js';
const GROUND_K = ['rock', 'crater', 'water', 'ice', 'cloud', 'lush', 'rough'];
export const INFL_SOURCES = ['partner.density', 'partner.pitch', 'partner.level', 'partner.near', 'touch.speed', 'touch.x', 'touch.y',
  'sing.pitch', 'sing.level', 'body.squash', 'body.speed', 'body.impact', 'body.wobble', 'place.x', 'place.y', 'world.terrain', 'item.touch', 'item.bright', 'item.rough', 'item.space', 'item.wobble',
  'ground.rock', 'ground.crater', 'ground.water', 'ground.ice', 'ground.cloud', 'ground.lush', 'ground.rough',
  'place.heal', 'place.harmony',
  'ohm.playing', 'jam.busy', 'gene.memory', 'gene.curious', 'player.taught', 'brain.fit'];   // v0.0.7 (Q46 / Q52): context for what it plays from its brain + how long it keeps things   // v0.0.7: the world's per-place mood (world.healAt / harmonyAt at the ohm)
export function createInfluence(world, bus, music, sing, blend) {
  const I = { n: 0, play: new Map(), dens: new Map(), pitch: new Map(), imp: new Map(), grab: new Map(), ms: 0 };
  bus.on('note', ev => { const s = ev.src; if (!s || s.scale !== 'ohm') return; if (ev.impact == null && (ev.kind === 'note' || ev.kind === 'strike' || ev.kind === 'sustain')) {
      I.dens.set(s.id, (I.dens.get(s.id) || 0) + 1); if (ev.f || ev.deg != null) I.pitch.set(s.id, ev.f ? Math.log2(ev.f) : null); }
    if (ev.impact != null) I.imp.set(s.id, Math.min(1, (I.imp.get(s.id) || 0) + ev.impact / 12)); });   // body.impact decays back in about a beat
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const gene = (o, salt) => { let s = ((o.seed || o.id) * 2246822519 + salt * 3266489917) >>> 0; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  I.tick = () => { if ((I.n++ & 3) !== 0) return; const a = performance.now(), dt = .1, sig = world.sig, nb = music.beat(), rc = bus.recent || [];
    let busy = 0; for (let i = rc.length - 1; i >= 0 && nb - rc[i] < 4; i--) busy++; busy = c01(busy / 16);
    for (const o of world.sources) { if (o.scale !== 'ohm' || !o.body) continue; const b = o.body, s = sig[o.id] || {}, post = (k, v) => { if (v == null || v !== v) return; if (s[k] == null || Math.abs(s[k] - v) > 2e-3) bus.ctl(o, k, v); };
      // partners: the nearest ohm it can hear (b.partner from sim, else the jam partner)
      const p = b.partner || null; if (p) { post('partner.density', c01((I.dens.get(p.id) || 0) / 4)); const lp = I.pitch.get(p.id); if (lp != null) post('partner.pitch', c01((lp - 5) / 5));
        post('partner.level', c01((sig[p.id] || {})['sound.level'] || 0)); post('partner.near', blend ? blend.close(o, p) : 1); } else { post('partner.density', 0); post('partner.near', 0); }
      // you: touch speed / position while held (in.grabX/Y from input.js)
      const gx = s['in.grabX'], gy = s['in.grabY']; if (gx != null && gx === gx) { const g = I.grab.get(o.id); if (g) post('touch.speed', c01(Math.hypot(gx - g[0], gy - g[1]) / dt / 8)); I.grab.set(o.id, [gx, gy]); post('touch.x', Math.tanh(gx - b.x)); post('touch.y', Math.tanh(gy - b.y)); }
      else if (I.grab.delete(o.id)) post('touch.speed', 0);
      // your singing -> the ohm listening to you
      if (sing && sing.active && sing.to === o) { post('sing.pitch', sing.hzNow ? c01((Math.log2(sing.hzNow) - 6) / 4) : null); post('sing.level', c01((sing.rms || 0) * 8)); } else if (s['sing.level']) post('sing.level', 0);
      // physics: squash (pinch spring), speed, impact (decays), wobble (ring off its rest shape)
      post('body.squash', c01(Math.abs(b.ps || 0) / .5)); post('body.speed', c01(Math.hypot(b.vx || 0, b.vy || 0) / 6));
      const im = (I.imp.get(o.id) || 0) * .7; I.imp.set(o.id, im < .01 ? 0 : im); post('body.impact', im);
      if (b.ring && b.rest) { let e = 0; for (let i = 0; i < b.rest.length / 2; i++) { const dx = b.ring[i * 4] - b.rest[i * 2], dy = b.ring[i * 4 + 1] - b.rest[i * 2 + 1]; e += dx * dx + dy * dy; } post('body.wobble', c01(Math.sqrt(e) * 2)); }
      // place + world (the world track's terrain value when it lands: world.terrainAt(x, y) -> 0..1)
      post('place.x', Math.tanh((b.x || 0) / 20)); post('place.y', Math.tanh((b.y || 0) / 20)); if (world.terrainAt) post('world.terrain', c01(world.terrainAt(b.x, b.y)));
      // v0.0.7 brain context: what it is doing (its own playing), the jam around (notes in the last 4 beats), genes, you teaching it
      { const pv = (I.play.get(o.id) || 0) * .85 + (I.dens.get(o.id) || 0); I.play.set(o.id, pv); post('ohm.playing', c01(pv / 4)); }
      post('jam.busy', busy); post('gene.memory', gene(o, 13)); post('gene.curious', gene(o, 17));
      { const R = world.brain, e = R && o.brain ? R.get(o, 'player', 'you') : null; post('player.taught', e ? c01(Math.min(1, e.strength) * (1 - (R.gt - (e.lastT || 0)) / 60)) : 0); }
      if (world.healAt) post('place.heal', c01(world.healAt(b.x, b.y))); if (world.harmonyAt) post('place.harmony', c01(world.harmonyAt(b.x, b.y)));
      // items: placeholder until items exist (world.itemTouch(o) -> 0..1)
      if (world.itemTouch) post('item.touch', c01(world.itemTouch(o)));
      // item modulation: an item touching / held by / near this ohm reports what it does to sound (world.itemMod(o) -> { bright, rough,
      // space, wobble } 0..1, from whatever the items track builds). Each is an ordinary matrix source with default rows (recipe.js
      // ITEM_ROUTES) so an item changes an ohm's sound the same, recognisable way every time; the ohm's own instrument stays underneath.
      if (world.itemMod) { const m = world.itemMod(o) || {}; post('item.bright', c01(m.bright || 0)); post('item.rough', c01(m.rough || 0)); post('item.space', c01(m.space || 0)); post('item.wobble', c01(m.wobble || 0)); }
      // ground colour: what the ohm stands on (planet track: world.groundMix(o) -> { rock, crater, water, ice, cloud, lush, rough } shares 0..1;
      // without it, the place-wide mix given to instruments.js setPlace({ ground })). Ordinary matrix sources with default rows (recipe.js).
      { const g = (world.groundMix && world.groundMix(o)) || PLACE.ground || {}; for (const k of GROUND_K) post('ground.' + k, c01(g[k] || 0)); } }
    I.dens.clear(); I.ms = I.ms * .9 + (performance.now() - a) * .1; };
  return I;
}
