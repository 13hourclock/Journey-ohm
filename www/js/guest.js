// GUEST ACCENT: ohms from other planets play in a host jam with their own tradition's accent (Wilbow 9:37 + 9:39 PM MDT Oct 29 2026:
// "these musical traditions need to encounter each other in the game and interact in a musically sound way. We don't need to calculate all
// those outcomes yet" / "the ohms need to be able to be brought into Jams on other planets, without having to write all the missions").
// Rule (TRADITION_REFERENCE 0.1 shared frame): a jam has ONE tonic, tuning, tempo and cycle, the host planet's, and every member obeys it.
// A guest never changes those. Its home tradition lives only where the reference allows variety (0.4): which degree on WEAK steps, ornaments,
// density. So any pairing of traditions is musically sound by construction and needs no scripted outcome:
//   LEAN     a weak, non-chord note moves (at most 2 scale steps) to the host degree nearest one of its home focus notes (vadi, ghammaz, blue
//            third, pentatonic pillars...), probability opts.lean. Strong beats and chord tones are never touched.
//   ORNAMENT slide traditions (raga, carnatic, maqam, makam, dastgah, overtone, blues, Japanese, Chinese) add a soft grace note a step BELOW
//            just before some notes; cut traditions (celtic, modal, aksak, flamenco, Andean) a grace note a step ABOVE. Host scale notes only.
//   DENSITY  a guest from a sparser tradition rests some weak off-beat notes (deterministic, never a downbeat).
//   MEETING  the first time a guest plays in a jam on a planet: bus 'trad.meet' { host, guest, src } and G.met (host -> guest -> notes):
//            the hook for later outcomes (learning, blending, crazes, new songs) without writing missions.
// Home tradition is saved with the ohm (persist part 'guests'), so a carried ohm stays a guest after a reload.
// Switch 'guestAccent' (ON); off = no change at all (no leaning, no grace notes, no rests, no events).
import { byTradId } from './traditions.js';
export const GUEST_OPTS = { on: true, lean: .45, orn: .5, thin: .6, graceVel: .42, graceBeat: .125, graceDur: .07 };
const SLIDE = new Set(['hindustani', 'carnatic', 'maqam', 'makam', 'dastgah', 'overtone', 'blues', 'japan', 'china']);
const CUT = new Set(['celtic', 'modal', 'aksak', 'flamenco', 'andean']);
const m7 = x => ((x % 7) + 7) % 7;
const hsh = (a, b) => { let h = ((a >>> 0) * 2654435761 ^ (b >>> 0) * 40503) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
const DIA = [0, 200, 400, 500, 700, 900, 1100];
const slots = notes => { if (notes.length === 7) return notes.slice(); let last = 0; return DIA.map(t => { let best = notes[0], bd = 1e9; for (const c of notes) { if (c < last) continue; const d = Math.abs(c - t); if (d < bd) { bd = d; best = c; } } last = best; return best; }); };
export function createGuests({ sim, bus, music, traditions, persist, opts = {} }) {
  const O = Object.assign(GUEST_OPTS, opts), G = { opts: O, met: new Map(), leaned: 0, graces: 0, rested: 0, meets: 0 };
  const hostId = () => traditions && traditions.applied && traditions.cur ? traditions.cur.id : null;
  // the guest's home scale (the one it was born with when known, else one of its tradition's scales by its seed) and its focus pitches in cents
  const homeOf = o => { const id = o._trad; if (!id) return null; if (o._home && o._home.id === id) return o._home; const D = byTradId(id); if (!D) return null;
    let sc = D.scales.find(s => s[0] === o._tradSc) || D.scales[(o.seed >>> 0) % D.scales.length]; const cents = slots(sc[1]), foc = (sc[2] && sc[2].focus) || [0, 4];
    return (o._home = { id, D, focusC: foc.map(i => cents[m7(i)]), dens: D.dens || 1, glide: D.glide || 0 }); };
  // host slots (7 cents values) from the tuning sounding now
  const hostCents = () => { const r = music.scale && music.scale.ratios; return r && r.length ? Array.from(r, x => 1200 * Math.log2(x)) : DIA; };
  const nearestSlot = (c, hc) => { let bi = 0, bd = 1e9; for (let i = 0; i < hc.length; i++) { const d = Math.min(Math.abs(hc[i] - c), 1200 - Math.abs(hc[i] - c)); if (d < bd) { bd = d; bi = i; } } return bi; };
  const meet = (host, o, home) => { let h = G.met.get(host); if (!h) G.met.set(host, h = new Map()); const n = h.get(home.id) || 0; h.set(home.id, n + 1);
    if (!o._met) o._met = new Set(); if (!o._met.has(host)) { o._met.add(host); G.meets++; bus.post({ type: 'trad.meet', host, guest: home.id, src: o }); } };
  const n0 = bus.note; let busy = false;
  bus.note = ev => { if (busy || !O.on || !ev || ev.grace || !ev.src || ev.src.scale !== 'ohm' || ev.deg == null || ev.inputT || (ev.kind !== 'note' && ev.kind !== 'strike')) return n0(ev);
    const o = ev.src, host = hostId(); if (!host || !o._trad || o._trad === host || o === sim.ohm) return n0(ev);
    const home = homeOf(o), H = byTradId(host); if (!home || !H) return n0(ev);
    if (ev.jam) meet(host, o, home);
    const b = ev.beat != null ? ev.beat : music.beat(ev.t), weak = Math.abs(b - Math.round(b)) > .05, ch = music.chord && music.chord.tones ? music.chord.tones.map(m7) : [0, 2, 4], ct = ch.includes(m7(ev.deg)), u = hsh(o.id * 977 + Math.round(b * 48), 0x9e37);
    // DENSITY: a sparser home tradition rests some weak, non-chord notes
    if (weak && !ct && home.dens < (H.dens || 1) * .85 && u < O.thin * (1 - home.dens / (H.dens || 1))) { G.rested++; return null; }
    // LEAN: weak, non-chord notes move toward the host degree nearest a home focus pitch
    if (weak && !ct && hsh(o.id, Math.round(b * 48)) < O.lean) { const hc = hostCents(), tg = new Set(home.focusC.map(c => nearestSlot(c, hc)));
      if (!tg.has(m7(ev.deg))) { for (const k of [1, -1, 2, -2]) if (tg.has(m7(ev.deg + k))) { ev.deg += k; G.leaned++; break; } } }
    // ORNAMENT: a soft grace note a step below (slide traditions) or above (cut traditions), just before the note
    const dir = SLIDE.has(home.id) ? -1 : CUT.has(home.id) ? 1 : 0;
    if (dir && hsh(o.id + 7, Math.round(b * 48)) < O.orn * Math.min(1, .35 + home.glide)) { const spb = music.spb ? music.spb() : .5;
      busy = true; try { n0({ ...ev, deg: ev.deg + dir, vel: (ev.vel || .6) * O.graceVel, dur: O.graceDur, t: ev.t != null ? ev.t - O.graceBeat * spb : undefined, beat: b - O.graceBeat, grace: 1, learn: null }); G.graces++; } finally { busy = false; } }
    return n0(ev); };
  // home tradition saved with each ohm (systems' 'ohms' part restores the ohms first: prio 2)
  if (persist && persist.register) persist.register('guests', { prio: 6, save: () => sim.ohms.filter(o => o.scale === 'ohm' && !o.dead && o._trad).map(o => [o.id, o._trad, o._tradSc || null]),
    load: d => { for (const [id, t, sc] of d || []) { const o = sim.byId.get(id); if (o) { o._trad = t; if (sc) o._tradSc = sc; o._home = null; } } } });
  G.info = () => `${G.meets} meetings, ${G.leaned} leaned, ${G.graces} grace notes, ${G.rested} rests`;
  return G; }
