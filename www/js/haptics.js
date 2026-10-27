// v0.0.25 HAPTICS PORT (NEW_ENGINE 12.1 "haptics kept as they are"; the old game's set, softsound water.js / mouth.js / egg.js /
// surface.js): short buzzes on the same kinds of moments the old game buzzed on, mapped to new-engine events. One buzz per 120 ms at
// most (as before), no-op where vibration is unavailable (desktop browsers, iOS). Q339 is still open on WHAT should buzz: this is the
// faithful default (the old set), every row a single place below; H.opts.on false = no buzz at all (v0.0.24).
//   spiral spawn        12 ms   (the old egg nudge / word: 6-38 ms)
//   ohm born (breed)    20 ms   (the old hatch: 15-60 ms, by strength)
//   mouth on / off      10 ms   (the old lips / roof consonants: 8-12 ms)
//   jump (walk)         10 ms
//   ground cracks       28 ms   (the old bolt strike)
//   big moment          15-60 ms by strength (only from .5 up, like the old bloom)
//   dev panel 3-finger hold  12 ms (feedback that the hold fired)
export const HAPTIC_OPTS = { on: true, gap: 120 };
export function createHaptics(bus, sys, opts = {}) {
  const O = { ...HAPTIC_OPTS, ...opts }, H = { opts: O, n: 0, last: 0, by: {} };
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  H.buzz = (ms, why = '') => { if (!O.on) return false; const t = Date.now(); if (t - H.last < O.gap) return false; H.last = t; H.n++; H.by[why] = (H.by[why] || 0) + 1;
    try { if (nav && nav.vibrate) nav.vibrate(Math.round(ms)); } catch (e) { } return true; };
  bus.on('spawn.spiral', () => H.buzz(12, 'spawn'));
  bus.on('breed', () => H.buzz(20, 'born'));
  bus.on('mouth', () => H.buzz(10, 'mouth'));
  bus.on('walk.jump', () => H.buzz(10, 'jump'));
  bus.on('terrain.crack', () => H.buzz(28, 'crack'));
  bus.on('moment', ev => { const k = ev.k || 0; if (k >= .5) H.buzz(15 + 45 * Math.min(1, (k - .5) * 2), 'moment'); });
  let seen = 0;   // the gestures keep their last marks; a new dev.open / dev.close mark = the hold fired
  H.tick = () => { const G = sys && sys.gestures; if (!G || !G.marks) return; const m = G.marks[G.marks.length - 1]; if (!m || m.t === seen) return; seen = m.t;
    if (m.type === 'dev.open' || m.type === 'dev.close') H.buzz(12, 'dev'); };
  return H;
}
