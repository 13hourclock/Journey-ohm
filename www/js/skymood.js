// SKY MOOD (old game list row 56 "day / night and weather change the music's mood"; Wilbow 1:46 AM Oct 26: "a gentle preset (night:
// softer and lower, rain: sparser). It's a taste question, so ready but off"). Switch 'skyMood', default OFF = v0.0.29 (nothing changes).
// When on, the ohms' own music (notes marked auto: autojam, songs, the jam partner) leans with the sky where you stand (world.env):
//  - night (sky.day low): softer (velocity down to 1 - nightVel; velocity also drives brightness on every engine, dsp/inst.js:28, so
//    softer is darker too) and lower (at deep night melody notes above the home octave drop one octave, decided per 2-bar phrase so a
//    line never splits);
//  - rain (weather.rain): sparser (up to rainThin of the off-downbeat notes rest, deterministic per ohm and 16th, so a loop stays a loop).
// Your own notes (taps, inputT) are never touched. Applied once, in the bus (events.js B.shape), before a note is recorded or heard.
export const SKYMOOD_OPTS = { on: false, nightVel: .3, nightLow: .7, rainThin: .45, dayAt: .6 };
const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const h01 = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function skyAmounts(env, O = SKYMOOD_OPTS) { if (!env) return { night: 0, rain: 0 }; const day = env.day == null ? 1 : env.day; return { night: cl((O.dayAt - day) / O.dayAt), rain: cl(env.rain || 0) }; }
export function createSkyMood({ bus, music = null, env = () => null, opts = {} }) {
  const O = { ...SKYMOOD_OPTS, ...opts }, K = { opts: O, softened: 0, lowered: 0, thinned: 0, seen: 0, night: 0, rain: 0 };
  K.shape = ev => { if (!O.on || !ev || !ev.auto || ev.kind !== 'note' || ev.inputT != null) return ev; const a = skyAmounts(env(), O); K.night = a.night; K.rain = a.rain; K.seen++;
    if (!a.night && !a.rain) return ev; const id = (ev.src && ev.src.id) | 0, b = ev.beat != null ? ev.beat : music && ev.t != null ? music.beat(ev.t) : 0;
    if (a.rain > 0 && ((b % 4) + 4) % 4 > .05 && h01(id, Math.round(b * 4)) < a.rain * O.rainThin) { K.thinned++; return null; }
    if (a.night > 0) { if (ev.vel != null) { ev.vel *= 1 - O.nightVel * a.night; K.softened++; }
      if (a.night >= O.nightLow && (ev.oct || 0) >= 1 && h01(id + 7, Math.floor(b / 8)) < (a.night - O.nightLow) / (1 - O.nightLow) + .5) { ev.oct = (ev.oct || 0) - 1; K.lowered++; } }
    return ev; };
  if (bus) bus.shape = K.shape;
  return K;
}
