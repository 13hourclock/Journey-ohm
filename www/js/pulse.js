// THE WORLD'S OWN SOURCES: an audible heartbeat and an om drone. They are ordinary sources (scale 'world': same building
// blocks as an ohm - a recipe, a body, signals, matrix rows) whose notes are scheduled on the music clock and posted as
// events like any tap. Heartbeat = a soft low double thump on every beat (lub-dub, PROPOSAL); drone = one sustained synth
// voice on the om (re-pitched when the om moves). Levels and on/off are world options (events 'set opt.heart.*').
import { makeRecipe } from './recipe.js';
export function createPulse(world, bus, music) {
  const heartRec = makeRecipe(7001, { name: 'heartbeat' });
  Object.assign(heartRec.modal, { fam: { string: 0, membrane: 1, bar: 0 }, p: { bright: .12, decay: .55, damp: .85, inharm: .05, size: 1 } });
  heartRec.mix = { modal: 1, synth: 0 }; heartRec.fx = []; heartRec.mods = []; heartRec.send = .12;
  const droneRec = makeRecipe(7002, { name: 'om drone' });
  Object.assign(droneRec.synth, { family: 'eADD' }); Object.assign(droneRec.synth.genes, { att: .75, dec: .5, sus: .95, rel: .6, cut: .3, reso: .2, fenv: .3, penv: .5, lfoR: .1, lfoP: .05, lfoF: .25, lfoA: .1, detune: .4, sat: .1, noise: .05, perc: 0, addTilt: .6, addSpread: .2, engMix: .05 });
  droneRec.mix = { modal: 0, synth: 1 }; droneRec.fx = []; droneRec.mods = [{ src: 'lfo1', dst: 'live.cut', amt: .25 }]; droneRec.lfo[0] = { rate: 8, shape: 'sine', depth: 1 }; droneRec.send = .35;
  const heart = world.add({ id: 101, scale: 'world', recipe: heartRec.id, hue: 0 }), drone = world.add({ id: 102, scale: 'world', recipe: droneRec.id, hue: 0 });
  const P = { heart, drone, nextB: null, droneOn: false, droneHz: 0 };
  const O = world.opts;
  P.tick = () => { const t = music.now();
    if (O.heart.on) { const b = Math.ceil(music.beat(t) + 1e-6); if (P.nextB == null || P.nextB < b) P.nextB = b;   // schedule ~250 ms ahead (tolerates a slow control tick) on the beat grid
      const tb = music.timeOfBeat(P.nextB); if (tb - t < .25) { const v = .35 + O.heart.level * .65, g = O.heart.level * 1.6;
        bus.note({ src: heart, kind: 'beat', deg: 0, oct: 0, vel: v, pos: .1, dur: 1, t: tb, gainK: g });
        bus.note({ src: heart, kind: 'beat', deg: 0, oct: 0, vel: v * .7, pos: .2, dur: .8, t: tb + music.spb() * .28, gainK: g * .6 }); P.nextB++; } }
    else P.nextB = null;
    const want = O.drone.on;
    if (want && (!P.droneOn || Math.abs(P.droneHz - music.tonicHz) > .01)) { if (P.droneOn) bus.note({ src: drone, kind: 'release' });
      bus.note({ src: drone, kind: 'sustain', deg: 0, oct: 0, f: music.tonicHz, vel: .7, sustain: 36000, gainK: O.drone.level * 2.2 }); P.droneOn = true; P.droneHz = music.tonicHz; P.droneLvl = O.drone.level; }
    else if (!want && P.droneOn) { bus.note({ src: drone, kind: 'release' }); P.droneOn = false; }
    else if (want && P.droneLvl !== O.drone.level) { P.droneLvl = O.drone.level; bus.note({ src: drone, kind: 'level', gain: .16 * O.drone.level * 2.2 }); } };
  return P;
}
