// The Journey Ohm - sound playground v0.0.6. Wiring only. How the parts connect:
//   shared world state (sim.js, A) <- reducer of events (events.js, D, music.js clock) <- input / physics / clock / pulse / panel / audio levels
//   matrix.js (B) reads the state's control streams each frame and posts 'live' results; sound.js turns note + live events into
//   worklet messages (modal + synth voices -> per-owner FX chains -> reverb -> limiter); the worklet's per-source levels come back
//   as control streams (E: sound moves bodies and visuals, bodies shape sound). Every source uses the same blocks (C).
import { createMusic, createHarmony } from './music.js';
import { createAudio } from './audio.js';
import { createHaptics } from './haptics.js';
import { createEvents } from './events.js';
import { createSim } from './sim.js';
import { createMatrix } from './matrix.js';
import { createSound } from './sound.js';
import { createPulse } from './pulse.js';
import { createBlend } from './blend.js';
import { createDrums } from './drums.js';
import { createArp } from './arp.js';
import { createBounce } from './bounce.js';
import { createRoles } from './roles.js';
import { createThings } from './things.js';
import { createRare } from './rare.js';   // rare ohms, experience tiers, personalities, big moments (PROPOSALS, Wilbow 4:12 PM Oct 25)
import { createBrain } from './brain.js';
import { createPlayTwice } from './playtwice.js';
import { createSkyMood } from './skymood.js';
import { createBubbles } from './bubble.js';
import { createJamView } from './jamview.js';
import { createWindRocks } from './windrocks.js';
import { createLightPlay } from './lightplay.js';
import { createCritters } from './critters.js';
import { createInfluence } from './influence.js';
import { createJam } from './jam.js';
import { createAutoJam } from './autojam.js';
import { createRoom } from './room.js';
import { createHerd } from './herd.js';
import { createRender, postOf } from './render.js';
import { createInput } from './input.js';
import { createSing } from './sing.js';
import { createFrames } from './frames.js';
import { createSelfTest } from './selftest.js';
import { createPanel } from './devpanel.js';
import { createWorld } from './world.js';
import { createZoom } from './zoom.js';
import { createQuality } from './quality.js';
import { makeRecipe, OPTS as RECIPE_OPTS, fgStats } from './recipe.js';
import { createClock } from './clock.js';
import { createPersist } from './persist.js';
import { createSystems } from './systems.js';
import { createTraditions } from './traditions.js';
import { BODY_PLAN } from './bodyplan.js';
import { createGuests } from './guest.js';
import { createShapePlay } from './shapeplay.js';
import { createBystand } from './bystand.js';
import { createAbilities, ABILITIES } from './abilities.js';
import { createGasFloat } from './gasfloat.js';
import { createSenses } from './senses.js';
import { toScreen } from './space.js';
import { createLookFeed } from './lookfeed.js';
import { createTrippy } from './trippy.js';
import { createJamRoles } from './jamroles.js';
import { createJamKeys } from './jamkeys.js';
import { createJamGrow } from './jamgrow.js';
import { createTrees } from './trees.js';
import { createLearnVoice } from './learnvoice.js';
import { createConduct } from './conduct.js';
import { createCraze } from './craze.js';
import { createAudioSig } from './audiosig.js';

const audio = createAudio();
const clock = createClock(audio);   // SYSTEMS: one clock that never jumps and holds while the app is away (clock.js)
const music = createMusic(clock.now);
audio.off = 0;
const bus = createEvents(music);
const sim = createSim(music, bus);
const matrix = createMatrix(sim, bus, music);
const sound = createSound(bus, sim, audio, music, matrix);
const pulse = createPulse(sim, bus, music);
audio.keepBg = clock.keepBg = () => !!sim.opts.bgSound;   // default OFF (Wilbow 1B, 2:16 AM: screen off pauses); on = the world keeps sounding when the screen is off or the app is in the background
sim.reseed();
const harmony = createHarmony(sim, bus, music);   // v0.0.6: moving chords + keys, shaped equally by everyone who plays
const brain = createBrain(sim, music); sim.brain = brain;   // v0.0.6: each ohm's memory (open store; saved with the ohm)
const blend = createBlend(sim, bus, music, brain); sim.blend = blend;
const drums = createDrums(sim, music, brain); sim.drums = drums;
const arp = createArp(sim, brain); sim.arp = arp;   // Q356: the arpeggio habit (born gene + learned like drum hits)   // step 5 B: drummer ohms grow a kit by learning
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) brain.save(); });   // brain saved with the ohm when the app goes away   // v0.0.6: what each ohm learns by context (patterns; sound absorption off)
const room = createRoom(bus, music); sim.room = room;   // Q350 a: ohms leave room for each other in a jam (room.js)
const jam = createJam(sim, bus, music);   // the jam partner (an ordinary ohm) listens + answers on the beat grid
const sing = createSing(sim, bus, music, audio); sim.sing = sing;   // v0.0.5: the mic as a 'voice' note source (two-finger still hold on the ohm)
const influence = createInfluence(sim, bus, music, sing, blend);
sim.jam = jam; const autojam = createAutoJam(sim, bus, music);   // v0.0.7: ohms jam without you, thinning with distance (27C 27D)   // v0.0.6: many things shape each ohm's synth via the matrix (2:32)
const canvas = document.getElementById('c');
const persist = createPersist(music); const snap = persist.read();   // SYSTEMS: the saved world (null on first launch or ?fresh=1)
const world = createWorld(sim, bus, music, snap && snap.parts.world && snap.parts.world.seed || undefined); sim.world = world;
world.audio = audio;   // v0.0.12 (additive): the place's room (terrain.js ground material) nudges the shared reverb around your base settings   // world track: seeded layered world + one camera (additive)
const herd = createHerd(sim, bus, music, brain); sim.herd = herd;   // v0.0.10 C #7: call / loop a group / home (PROPOSALS, opts.herd)
const render = createRender(canvas, sim, music, () => audio.readScope(), world, bus);
const q0 = new URLSearchParams(location.search);
if (!snap || !snap.parts.ohms) sim.populate(Math.max(0, (q0.has('ohms') ? +q0.get('ohms') : 7) - 1));   // PROPOSAL: start with 7 ohms (incl. the focus ohm); ?ohms=N for tests / benches
const quality = createQuality(sim);
const frames = createFrames();
const selftest = createSelfTest(audio, frames);
const startAudio = async (autoTest = true) => { const before = music.now(); await audio.init(); if (audio.ctx) { audio.off = before - audio.ctx.currentTime; sound.resync(); }   // keep musical time continuous when audio starts
  if (autoTest && !selftest.res && !selftest.running) selftest.start(60); };   // first launch: the 60 s self-test starts with the first touch
canvas.addEventListener('pointerdown', () => { if (!audio.ctx) startAudio(); else audio.heal(); }, { capture: true });
createInput(canvas, sim, bus, () => render.size(), null);
const zoom = createZoom(canvas, sim, () => render.size());
const panel = createPanel({ audio, sim, frames, selftest, music, events: bus, matrix, sound, pulse });
world.attachPanel(panel && panel.root || document.getElementById('dev'));
const systems = createSystems({ sim, bus, music, harmony, autojam, world, sing, render, canvas, panel, persist, brain });   // SYSTEMS track: songs, river DAW, save, spawn, undo, helper, mouth, walk, fusions, plants, harmony bank
systems.attachPanel(panel && panel.root || document.getElementById('dev'));
const traditions = createTraditions({ sim, bus, music, harmony, world });   // TRADITIONS wave 1: one per planet (seed + land lean); tuning, tempo, feel, cycle, lean, drone, song shape; aura data hooks only
{ const AB = { on: true }; systems.switches.push({ k: 'audioBudget', label: 'audio budget: when the sound engine gets busy, fewer synth voices play at once and the quietest (far / soft) drop first, so no crackle (off = the old late guard)', get: () => AB.on, set: v => { AB.on = !!v; if (audio.send) audio.send({ t: 'budget', o: { on: AB.on } }); }, info: () => { const L = audio.last || {}; return `load ${((L.lF || 0) * 100).toFixed(0)}%, dropped ${L.idrop || 0}, faded ${L.ibshed || 0}`; } }); }
systems.switches.push({ k: 'ohmVariety', label: 'ohm variety (first game genes): every ohm is born with its own skin pattern (spots, stripes, rings, patches), a second colour, see-through skin or an inner glow for some, and stronger shape differences (off = plain skins until experience, milder shapes)', get: () => BODY_PLAN.variety, set: v => { BODY_PLAN.variety = !!v; for (const o of sim.ohms) if (o.scale === 'ohm' && o.g && sim.regrow) { const f = o.g.float; sim.regrow(o); o.g.float = f; } } });
systems.switches.push({ k: 'lowShapes', label: 'low detail keeps body shapes: when the phone is busy, ohms keep their real outline (not circles), the nearest 4 keep their full baked body, legs and features, and the focus ohm keeps its full look (off = v0.0.30 circles)', get: () => BODY_PLAN.low, set: v => { BODY_PLAN.low = !!v; } });
systems.switches.push({ k: 'walkLegs', label: 'walking legs: near ohms step with their legs as they move (far ohms keep standing legs; off = legs always standing)', get: () => BODY_PLAN.walk, set: v => { BODY_PLAN.walk = !!v; } });
systems.switches.push({ k: 'bodyPlans', label: 'body plans (first game): blob / shell / serpent / strider / drum-belly / cluster / floater from the instrument, gene outlines, legs, tails, spikes, fronds, feelers, keels, bands, plates, bubbles, serpent segments (off = the v0.0.30 round / long / lobed bodies)', get: () => BODY_PLAN.on, set: v => { BODY_PLAN.on = !!v; for (const o of sim.ohms) if (o.scale === 'ohm' && o.g && sim.regrow) { const f = o.g.float; sim.regrow(o); o.g.float = f; } } });
// GUEST ACCENT (Wilbow 9:37 / 9:39 PM Oct 29): ohms carried to another planet keep their home tradition and play its accent inside the host jam's frame
const guests = createGuests({ sim, bus, music, traditions, persist });
systems.switches.push({ k: 'guestAccent', label: 'guest ohms (carried from another planet) keep their home tradition: in a host jam they lean weak notes to their home focus notes, add home ornaments (grace notes) and rest like home - always in the host key, tuning, tempo and cycle', get: () => guests.opts.on, set: v => { guests.opts.on = !!v; }, info: () => guests.info() });
traditions.attachPanel(panel && panel.root || document.getElementById('dev'));
const things = createThings({ sim, bus, music, persist, undo: systems.undo, size: () => render.size(), canvas, render });   // step 5 E + F: effect objects + drawn instruments (after the systems shapes)
things.fuse = systems.fuse;   // Q351: fused groups grow strings (things.js groupTick)
systems.bounce = createBounce(sim, systems, music, audio, bus);   // Q358: render the river's song to a WAV -> share sheet
systems.switches.push({ k: 'bounce', label: 'Q358: river - hold still 0.9 s below the lanes = render the whole song to a file and share it', get: () => systems.bounce.opts.on && systems.daw.opts.bounce, set: v => { systems.bounce.opts.on = v; systems.daw.opts.bounce = v; }, info: () => systems.bounce.busy ? `rendering ${Math.round(systems.bounce.progress * 100)}%` : systems.bounce.last ? (systems.bounce.last.err || `${systems.bounce.last.name} ${systems.bounce.last.sec.toFixed(0)} s via ${systems.bounce.last.via}`) : 'none yet' });
systems.roles = createRoles(sim, bus, music, brain, drums); systems.look = render.look; render.lookCtx.roleOf = o => systems.roles.of(o);   // Q359: each ohm's visible part (lead / bass / pad / rhythm), grown from what it plays, kept in its brain
systems.switches.push({ k: 'roles', label: 'Q359: each ohm shows its part (lead / bass / pad / rhythm), grown from what it plays', get: () => systems.roles.opts.on, set: v => { systems.roles.opts.on = v; }, info: 'once a bar each ohm\'s last 4 bars of notes are judged (hit or pitched, how low, how long, how busy); that part grows, the others fade; shown once heard enough. Saved in the ohm\'s brain. Look hook: look.ohmRole' });
systems.switches.push({ k: 'roleText', label: 'role TEXT labels (lead / bass / pad / rhythm written under each ohm; off: the body cues show the role)', get: () => systems.roles.opts.text, set: v => { systems.roles.opts.text = !!v; }, info: () => 'dev, off by default (v0.0.23)' });
systems.switches.push({ k: 'dawAuto', label: 'Q357: river - drag out from a lane\'s left edge to draw loudness (lower half) / brightness (upper half)', get: () => systems.daw.opts.auto, set: v => { systems.daw.opts.auto = v; }, info: () => `${systems.daw.auto.size} lanes drawn` });
systems.switches.push({ k: 'groupStrings', label: 'Q351: a fused group grows jam-tuned strings along its links', get: () => things.opts.groupStrings, set: v => { things.opts.groupStrings = v; } });
systems.switches.push({ k: 'harmNudge', label: 'Q352: plucking a jam-tuned string nudges the next chord', get: () => sim.opts.harm.nudge !== false, set: v => { sim.opts.harm.nudge = v; }, info: () => `${harmony.nudges} plucks heard` });
// v0.0.25 smoothness + songs as traditions (all on; off = v0.0.24 behaviour)
systems.switches.push({ k: 'aBatch', label: 'smoothness: sound messages of one moment go to the audio thread together', get: () => audio.opts.batch !== false, set: v => { audio.opts.batch = v; }, info: () => `${audio.batches} batches` });
systems.switches.push({ k: 'mSlice', label: 'smoothness: the shaping of many ohms is spread over several ticks (1.5 ms each)', get: () => matrix.opts.slice !== false, set: v => { matrix.opts.slice = v; } });
systems.switches.push({ k: 'sSpread', label: 'smoothness: a song\'s next bar is sent note by note, a beat ahead, not all at the bar line', get: () => systems.songs.opts.spread, set: v => { systems.songs.opts.spread = v; if (!v) systems.songs.flushQ(); } });
systems.switches.push({ k: 'kSplit', label: 'smoothness: the kaleidoscope\'s rings are prepared one at a time in spare moments', get: () => !render.look || !render.look.api.bake || render.look.api.bake.kSplit !== false, set: v => { if (render.look && render.look.api.bake) render.look.api.bake.kSplit = v; } });
systems.switches.push({ k: 'placeTrad', label: 'songs played 3 times become their planet\'s tradition: ohms there pick them up, children inherit them (each a little different)', get: () => systems.songs.opts.placeTrad, set: v => { systems.songs.opts.placeTrad = v; }, info: () => `${systems.songs.tradPicks || 0} picked, ${systems.songs.inherited} inherited` });
const haptics = systems.haptics = createHaptics(bus, systems);   // v0.0.25: the old game's buzzes (Q339 open on what buzzes)
systems.switches.push({ k: 'haptics', label: 'buzz on spawn / birth / mouth / jump / crack / big moments / dev hold (the old game\'s set, 120 ms apart)', get: () => haptics.opts.on, set: v => { haptics.opts.on = v; }, info: () => `${haptics.n} buzzes` });
systems.switches.push({ k: 'glide', label: 'Q353: a ringing string glides to its new note when retuned', get: () => things.opts.glide, set: v => { things.opts.glide = v; } });
systems.switches.push({ k: 'carry', label: 'Q354: ohms carry drawn things (drag an ohm onto one, hold 0.9 s; drag the thing to take it)', get: () => things.opts.carry, set: v => { things.opts.carry = v; }, info: () => `${things.carried} picked up, ${things.drops} let go` });
systems.switches.push({ k: 'arp', label: 'Q356: arpeggio habit (born with it, or learned from arpeggiating ohms and you)', get: () => arp.opts.on, set: v => { arp.opts.on = v; }, info: () => `${sim.ohms.filter(o => arp.is(o)).length} arpeggiate, ${arp.learned} learned` });
systems.switches.push({ k: 'leaveRoom', label: 'Q350: ohms leave room for each other in a jam (pitch + rhythm, thinned not muted)', get: () => room.opts.on, set: v => { room.opts.on = v; }, info: () => `${room.thinned} thinned, ${room.moved} moved, ${room.shifted} octave` });
// v0.0.26 drawn instruments, the rest of V08 section P (audits/drawn_instruments_P_check.md) + bystanders (R3.8); all on = the approved text
const onScreenW = (x, y) => { const { W, H } = render.size(); if (!W || !sim.cam) return true; const c = toScreen(W, H, sim.cam, x, y); return c.x > -40 && c.x < W + 40 && c.y > -40 && c.y < H + 40; };
const shapeplay = createShapePlay({ sim, bus, music, things, autojam, onScreen: onScreenW }); systems.shapeplay = shapeplay; sim.shapeLean = (P, turn, tn) => shapeplay.borrow(P, turn, tn);
const bystand = createBystand({ sim, music, autojam, songs: systems.songs, jam }); systems.bystand = bystand; sim.watching = o => bystand.watching(o); sim.watchers = () => bystand.list();
// v0.0.30 D (GAMEDEV_SPEC): look.ohm's st.post, what each ohm is doing: 'jam' (a song, an auto jam or your partner), 'sleep', 'sing' (glowing), 'listen' (a bystander watching), 'walk' (moving), else none (look infers). Switch: world.opts.ohmPost
render.postOf = o => { const p = postOf(o); if (p === 'sleep') return p; const S = systems.songs, G = S && S.groupOf && S.groupOf(o); if (G && (G.state === 'song' || G.state === 'jam')) return 'jam';
  if (jam.partner === o && jam.until > music.beat()) return 'jam'; const J = autojam.jams; if (J) for (const P of J) if (P.a === o || P.b === o) return 'jam';
  if (p === 'sing') return p; if (bystand.watching(o)) return 'listen'; return p; };
const abDraw = () => { if (!abilities.rings.length) return; const { W, H } = render.size(); if (!W || !sim.cam) return; const g = canvas.getContext('2d'), dpr = canvas.width / W; g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); abilities.draw(g, W, H, (x, y) => toScreen(W, H, sim.cam, x, y), render.look); g.restore(); };
const shapeDraw = () => { if (!things.list.length) return; const { W, H } = render.size(); if (!W || !sim.cam) return; const g = canvas.getContext('2d'), dpr = canvas.width / W; g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0); shapeplay.draw(g, W, H, (x, y) => toScreen(W, H, sim.cam, x, y)); g.restore(); };
systems.switches.push({ k: 'shapePlay', label: 'P5: ohms near a drawn string / bar / drum play it their own way (strike, pick, bow, or sing to it) on the beat', get: () => shapeplay.opts.on, set: v => { shapeplay.opts.on = !!v; }, info: () => `${shapeplay.players.size} playing now, ${shapeplay.stats.hits} hits, ${shapeplay.stats.sung} sung-to rings, ${shapeplay.stats.decisions} decisions` });
systems.switches.push({ k: 'ensembles', label: 'P6: shapes drawn together become an instrument: marimba row, harp, drum circle, drone rod (glow + rising sweep)', get: () => shapeplay.opts.ens, set: v => { shapeplay.opts.ens = !!v; }, info: () => `${shapeplay.ens.map(E => E.kind + ' x' + E.members.length).join(', ') || 'none'}; ${shapeplay.stats.ensembles} formed` });
systems.switches.push({ k: 'shapeLean', label: 'P7: a shape played steadily near an ohm jam lends the jam its melody (at most 1 phrase in 3)', get: () => shapeplay.opts.lean, set: v => { shapeplay.opts.lean = !!v; }, info: () => `${shapeplay.stats.borrowed} phrases borrowed` });
systems.switches.push({ k: 'shapeCap', label: 'P3: at most 4 drawn shapes ring at once from ohms / bumps (your own taps always sound)', get: () => !!things.opts.voiceCap, set: v => { things.opts.voiceCap = v ? 4 : 0; }, info: () => `${things.capped || 0} extra hits skipped` });
systems.switches.push({ k: 'absLen', label: 'P1: a drawn shape stays between 24 and 1200 px long when you drag its ends', get: () => !!things.opts.absLen, set: v => { things.opts.absLen = v ? [.47, 23.5] : null; } });
systems.switches.push({ k: 'geneMemo', label: 'Speed: a burst of song notes reuses the same synth answer for the same genes (smoother bar lines)', get: () => !!RECIPE_OPTS.geneMemo, set: v => { RECIPE_OPTS.geneMemo = !!v; }, info: () => `${fgStats.hit} reused, ${fgStats.miss} worked out` });
systems.switches.push({ k: 'bystanders', label: 'R3.8: ohms near a jam watch quietly (eyes on it, no jamming of their own) and learn its patterns', get: () => bystand.opts.on, set: v => { bystand.opts.on = !!v; }, info: () => `${bystand.stats.watchers} watching now (most ${bystand.stats.maxWatch})` });
const lookFeed = createLookFeed({ ctx: render.lookCtx, music, harmony, songs: systems.songs, jam, autojam, sim, bus, traditions });   // read-only music / song / jam views for the look (Visuals' kaleidoscope); no music change
// v0.0.29 TRIPPY GATING (Wilbow 12:23 AM Oct 26 "The trippy visuals are obscured for the beginning of the game"): trippy.js; look/ reads st.trippy
const trippy = createTrippy({ sim, world, bank: () => systems.bank, persist, ctx: render.lookCtx, st: render.st }); systems.trippy = trippy; world.trippy = trippy; for (const w of trippy.switches()) systems.switches.push(w); trippy.attachPanel(panel && panel.root || document.getElementById('dev'));
// v0.0.27 special abilities from gene thresholds (R5.4, ABILITIES.md all 25 approved; wave 1 = 7 of them). Created BEFORE rare.js so
// rare's ahead / behind lean is set first and the living metronome can pull it back toward the beat.
const abilities = createAbilities({ sim, bus, music, world, matrix, persist, things, songs: systems.songs }); systems.abilities = abilities;
systems.switches.push({ k: 'lookPulse', label: 'no outlines: the echolocation ring is a soft wavefront of light (look.pulse; off = the thin stroke ring)', get: () => abilities.opts.lookPulse !== false, set: v => { abilities.opts.lookPulse = v; } });   // v0.0.30 A1
{ const AB = { echo: '1 echolocation (low sight + high hearing): a click + ring every 2 bars, ohms it finds glow, it drifts toward them', pitch: '2 perfect pitch (hearing + precision): nearby ohms are pulled back into tune',
    metro: '3 living metronome (very high precision): ticks a quiet steady beat while it plays; nearby ohms lean less ahead / behind', mimic: '4 mimicry (hearing + creativity): plays your phrase back a bar after you stop',
    overtone: '5 overtone singing (pure tone + wide range): each note carries a quiet 3rd harmonic', dream: '19 dream singing (nocturnal + memory): a slow low drone at night when it is not playing',
    storm: '14 storm singing (loud + atmosphere): its playing near you brings rain',
    conduct: '9 conducting (leadership + rhythm): while it plays, nearby ohms swell through each 8-bar phrase, closed by a 5 -> 1 cadence (tempo part waits)',
    compose: '10 composing (creativity + memory): invents a short motif near you; the nearest ohms pass it on', weave: '11 weaving (builder + elasticity): spins one string above itself near you',
    memkeep: '22 memory keeping (very long memory): revives the oldest song every 32 bars near you when none is playing', gravity: '24 gravity dancing (buoyancy + mass): moving ohms near it curve around it' };
  systems.switches.push({ k: 'abilities', label: 'R5.4: special abilities from rare gene combinations (about 1 ohm in 15 carries one; heritable, no mutation)', get: () => abilities.opts.on, set: v => { abilities.opts.on = !!v; }, info: () => { const n = abilities.stats(); return `${abilities.carriers.length} carriers (${Object.entries(n).map(([k, v]) => k + ' ' + v).join(', ') || 'none here'})`; } });
  for (const k of Object.keys(ABILITIES)) systems.switches.push({ k: 'ab_' + k, label: 'R5.4 ability ' + AB[k], get: () => abilities.opts[k], set: v => { abilities.opts[k] = !!v; },
    info: () => ({ echo: `${abilities.echoes} pulses`, pitch: `${abilities.pitched} notes pulled into tune`, metro: `${abilities.ticks} ticks, ${abilities.pulled} notes pulled to the beat`, mimic: `${abilities.mimics} phrases played back`, overtone: `${abilities.overtones} harmonics`, dream: `${abilities.drones} drones`, storm: `${abilities.rains} rainy bars`, conduct: `${abilities.conducted} notes shaped, ${abilities.cadences} cadences`, compose: `${abilities.composed} motifs, ${abilities.spread} passed on`, weave: `${abilities.strings} strings`, memkeep: `${abilities.revived} songs revived`, gravity: `${abilities.bends} nudges` })[k] }); }
// v0.0.28 R5.12 (NEW_ENGINE Appendix A, CARRY): on a mostly-gas planet, ground ohms float up into the cloud (seeded share by gas weight)
// v0.0.28 R5.5 / R2.10 (NEW_ENGINE L715, L671, CARRY): drive a partly deaf ohm (low 'hear' gene) and the whole mix is heard through its ears (master low-pass)
const senses = createSenses({ sim, abilities, audio }); systems.senses = senses;
systems.switches.push({ k: 'deafMuffle', label: 'R5.5/R2.10 senses: drive a partly deaf ohm (about 1 in 4) and you hear the world muffled through its ears', get: () => senses.opts.on, set: v => { senses.opts.on = !!v; senses.tick(); }, info: () => `muffle ${senses.muffle.toFixed(2)} (${senses.changes} changes)` });
const gasfloat = createGasFloat({ sim, world, music }); systems.gasfloat = gasfloat;
systems.switches.push({ k: 'gasFloat', label: 'R5.12 cloud gas giants: on a mostly-gas planet ground ohms float up into the cloud (off = they settle back)', get: () => gasfloat.opts.on, set: v => { gasfloat.opts.on = !!v; gasfloat.lastBar = -1; }, info: () => `gas ${gasfloat.gas.toFixed(2)}, ${gasfloat.lifted} lifted, ${gasfloat.settled} settled` });
const rare = createRare({ sim, bus, music, world, systems, brain, persist, autojam });   // registers its save part before the restore
rare.attachPanel(panel && panel.root || document.getElementById('dev'));
// v0.0.29 OLD GAME FEATURES NOT YET IN (Wilbow 12:24 AM Oct 26 "INCLUDE OLD GAME FEATURES NOT IMPLEMENTED"; the "Old Game Features, In or
// Missing" Page + softsound DECISIONS / V07_SPEC). Each behind its own switch; off = v0.0.28.
const jamRoles = createJamRoles({ sim, bus, music, autojam, songs: systems.songs }); sim.jamRoles = jamRoles; systems.jamRoles = jamRoles;
systems.switches.push({ k: 'jamRoles', label: 'jam roles: one member is out front, the others follow; the front tires and hands over on a phrase line; in a crowd one follower steps back and listens (holds a soft chord tone)', get: () => jamRoles.opts.on, set: v => { jamRoles.opts.on = !!v; }, info: () => `${jamRoles.g.size} jams, ${jamRoles.hand} hand-overs, ${jamRoles.backs} step-backs` });
const jamKeys = createJamKeys({ sim, bus, music, harmony, autojam, songs: systems.songs }); systems.jamKeys = jamKeys;
systems.switches.push({ k: 'jamKeys', label: 'jams change key: after a while at home a jam travels to a close key (V, IV, ii) through a shared chord, and comes home again', get: () => jamKeys.opts.on, set: v => { jamKeys.opts.on = !!v; }, info: () => `home ${jamKeys.home}, now ${music.key}${jamKeys.target != null ? ' -> ' + jamKeys.target : ''}; ${jamKeys.changes} changes, ${jamKeys.journeys} journeys, ${jamKeys.returns} home again` });
systems.switches.push(...jamKeys.switches());   // v0.0.29 relative / parallel minor journeys
const sTmp = { x: 0, y: 0, s: 1 };
const jamGrow = createJamGrow({ sim, bus, music, autojam, rare, songs: () => systems.songs, view: () => { const { W, H } = render.size(); return { W, H, toS: (x, y) => toScreen(W, H, sim.cam, x, y, sTmp) }; } }); sim.jamGrow = jamGrow; systems.jamGrow = jamGrow;
systems.switches.push({ k: 'jamGrow', label: 'jams you watch grow: a jam kept in view, all in time and in key, grows its loop 2 -> 4 -> 8 -> 16 bars keeping the old one; a new part that slips is dropped', get: () => jamGrow.opts.on, set: v => { jamGrow.opts.on = !!v; }, info: () => `${jamGrow.grown} grown, ${jamGrow.reverts} dropped, ${jamGrow.explores} small tries (${jamGrow.kept} kept); longest ${Math.max(0, ...[...jamGrow.j.values()].map(s => s.loop ? s.loop.length : 0))} bars` });
systems.switches.push({ k: 'jamGrowSongs', label: 'song groups you watch grow too (old game): a matched group kept in view comes back with a longer form (A A\' ..., a development section) keeping the proven one; a grown play that slips is dropped', get: () => jamGrow.opts.songs, set: v => { jamGrow.opts.songs = !!v; }, info: () => `${jamGrow.songGrown} grown, ${jamGrow.songKept} kept, ${jamGrow.songDrops} dropped` });
const trees = createTrees({ sim, bus, world, quality }); systems.trees = trees; persist.register('trees', { prio: 6, save: () => trees.save(), load: d => trees.load(d) });   // BOARD W2/W3 jam trees (trees.js)
systems.switches.push({ k: 'jamTrees', label: 'jam trees: a jam that holds together grows a tree where it played, shaped by its song (harmony splits the branches, rhythm sets their lengths); every grown jam adds a ring (taller, thicker, its colours); top-level jams bloom; zoom in to see the rings (off = no trees)', get: () => trees.opts.on, set: v => { trees.opts.on = !!v; }, info: () => `${trees.list.length} trees, ${trees.ringsAdded} rings, ${trees.blooms} blooms` });
const skyMood = createSkyMood({ bus, music, env: () => world.env }); systems.skyMood = skyMood;   // v0.0.29 TASTE: the sky leans the music (OFF)
systems.switches.push({ k: 'skyMood', label: 'TASTE: the sky leans the music: at night the ohms play softer and lower, in rain sparser (gentle preset; your own notes untouched) (off)', get: () => skyMood.opts.on, set: v => { skyMood.opts.on = !!v; }, info: () => `night ${skyMood.night.toFixed(2)} rain ${skyMood.rain.toFixed(2)}, ${skyMood.softened} softer, ${skyMood.lowered} lower, ${skyMood.thinned} rested` });
const playTwice = createPlayTwice({ sim, bus, music, brain, undo: systems.undo }); systems.playTwice = playTwice;   // v0.0.29 old game: play a phrase twice on an ohm and it takes it as its tune
systems.switches.push({ k: 'playTwice', label: 'play a phrase twice on an ohm (same 4-8 notes, twice in a row) and it takes it as its tune: its strongest part, passed on, saved; undo takes it back', get: () => playTwice.opts.on, set: v => { playTwice.opts.on = !!v; }, info: () => playTwice.adopted + ' tunes taught' });
systems.switches.push({ k: 'eggWords', label: 'TASTE: strokes after the spiral pick its sound (egg words, old game v0.7 A): a spiral leaves an egg for 1.5 s; taps = drums, wave = pad / drone, circle = ringer, flick = pluck, twice = stronger, hidden combos; no stroke = the quick random ohm. OFF = the spiral hatches at once', get: () => !!(systems.egg && systems.egg.opts.on), set: v => { if (systems.egg) { systems.egg.opts.on = !!v; if (!v && systems.egg.cur) systems.egg.hatch(); } }, info: () => { const E = systems.egg; return E ? 'hatched ' + E.hatched + ', words ' + E.words + ', nudges ' + E.nudges + ', hidden ' + E.tier3 + (E.last ? ', last ' + (E.last.row || 'random') : '') : 'no egg'; } });
systems.switches.push({ k: 'clay', label: 'TASTE: clay shaping (old game v0.8 R5 / R7): a spiral that ENDS WITH A REST leaves clay for ~8 s (each touch resets the ring, 20 s cap); the first touch picks the family (tap struck, flick plucked, rub bowed, still-then-move blown, squeeze voiced); pull, dent, points, tail, fire (hold), wiggle, pinch, twist, split, taps; two-finger tap freezes / confirms; 3-finger undo = one step. OFF = the spiral hatches at once', get: () => !!(systems.clay && systems.clay.opts.on), set: v => { if (systems.clay) { systems.clay.opts.on = !!v; if (!v && systems.clay.cur) systems.clay.hatch(); } }, info: () => { const C = systems.clay; return C ? 'hatched ' + C.hatched + ', touches ' + C.touches + ', freezes ' + C.frozen + (C.last ? ', last ' + C.last.row + (C.last.fam ? ' (' + C.last.fam + ')' : ' (random)') + (C.last.role ? ' ' + C.last.role : '') : '') : 'no clay'; } });
const bubbles = createBubbles({ sim, bus, undo: systems.undo, toS: systems.toS, toW: systems.toW, world }); systems.bubbles = bubbles;   // after skyMood: it chains onto bus.shape
systems.switches.push({ k: 'bubbleCatch', label: 'old game R5.17 catch / ark: a loop drawn round ONE ohm (no rest) catches it in a bubble (softer, floats); tap = pop, drag = carry, flick up far = farewell (3-finger undo restores); caught ohms land with you on a new planet. OFF while the HOME HOLD clash is open (GESTURES: carry pickup vs herd home hold)', get: () => bubbles.opts.on, set: v => { bubbles.opts.on = !!v; if (!v) for (const b of [...bubbles.list.values()]) bubbles.free(b.o, false); }, info: () => 'caught ' + bubbles.caught + ', in bubbles ' + bubbles.list.size + ', pops ' + bubbles.pops + ', farewells ' + bubbles.farewells + ', carried ' + bubbles.carried });
const jamView = createJamView({ sim, bus, music, autojam, songs: systems.songs, jamRoles, busy: () => !!(systems.daw && systems.daw.open), look: () => render.look, size: () => render.size() }); sim.jamView = jamView; systems.jamview = jamView;   // after bubbles: it chains onto bus.shape and sim.autoFor (daw.js)
const windRocks = createWindRocks({ sim, bus, music, world, look: () => render.look, caught: o => bubbles.has(o) }); systems.wind = windRocks;   // after bubbles: a caught ohm does not blow
systems.switches.push({ k: 'windRocks', label: 'old game v0.4a wind rocks + reed beds: 1-2 hollow rocks and 1-2 reed beds per planet (seeded, not saved; none on gas giants) sound in the wind on the beat when an ohm is near (rocks low, reeds high, on the chord now); a wind / blown-voice ohm breathes on them in still air and drifts toward one. Scenery: no hit test (GESTURES line 241)', get: () => windRocks.opts.on, set: v => { windRocks.opts.on = !!v; }, info: () => windRocks.info() });
const lightPlay = createLightPlay({ sim, bus, music, world, things, look: () => render.look }); systems.light = lightPlay;   // after bubbles + jamView in the bus.shape chain: adds a voice, never changes the note
systems.switches.push({ k: 'lightPlay', label: 'old game light.js / R6.5 lenses + prisms: by day a bubble lens (pit) focuses sunlight to a white spot on the ground below it, a droplet (cho) or shard cluster (glt) fans a 7-band rainbow; an ohm standing in the light adds a quiet glass overtone at the light\'s pitch (snapped to the key) to its own notes. Night = none, cloud dims, the sun leans across the day. Scenery: no hit test (GESTURES line 274)', get: () => lightPlay.opts.on, set: v => { lightPlay.opts.on = !!v; }, info: () => lightPlay.info() });
const critters = createCritters({ sim, bus, music, world, look: () => render.look, size: () => render.size() }); systems.critters = critters;
systems.switches.push({ k: 'critters', label: 'old game v0.5c / v0.6.1 critters + rare sky events (visual only): fireflies at night over land blinking on the beat, fish in the water, a bird flock by day on worlds with air, jellies + spore motes on cloud worlds; rarely at night a meteor shower (one quiet in-key sparkle) or an aurora. Scenery: no hit test (GESTURES line 274)', get: () => critters.opts.on, set: v => { critters.opts.on = !!v; }, info: () => critters.info() });
systems.switches.push({ k: 'jamView', label: 'old game v08 JAM VIEW: pinch out deep on the empty middle of a jam = its own view (ring tap mute, slide along volume, in / out octave, hold then slide brightness; item knots; phrase marks pin / shift / trade; body drag swaps roles; section beads reorder / flick drop; clock tempo / swing; centre twist key, slide mood; two fingers on the centre breakdown / build; pinch in elsewhere leaves). Changes land on the bar or phrase line; 3 / 4-finger taps undo / redo its own history', get: () => jamView.opts.on, set: v => { jamView.opts.on = !!v; if (!v) jamView.leave(); }, info: () => jamView.info() });
const learnVoice = createLearnVoice({ sim, music, blend, brain }); systems.learnVoice = learnVoice;
systems.switches.push({ k: 'learn3', label: 'learned sounds: up to three under the ohm\'s own (birth) sound, which always keeps the larger part', get: () => learnVoice.opts.learn3, set: v => { learnVoice.opts.learn3 = !!v; } });
systems.switches.push({ k: 'learnCtx', label: 'learned sounds by context: one comes forward while the ohm plays near the one it learned it from', get: () => learnVoice.opts.ctx, set: v => { learnVoice.opts.ctx = !!v; } });
systems.switches.push({ k: 'learnSolo', label: 'TASTE (Q10 / Q182): a fully learned sound now and then plays one phrase cleanly on its own (off)', get: () => learnVoice.opts.solo, set: v => { learnVoice.opts.solo = !!v; }, info: () => `${learnVoice.solos} solo phrases` });
const conduct = createConduct({ sim, bus, music, size: () => render.size(), toScreen: (W, H, c, x, y) => toScreen(W, H, c, x, y) }); systems.conduct = conduct; sim.conductOwns = conduct.owns; conduct.attach(canvas);
systems.switches.push({ k: 'conduct', label: 'conducting: baton up = ohms in view watch you and wait; beats set tempo (upstroke = upbeat), hand height = loudness, a stroke through an ohm cues it, flick down = cut off', get: () => conduct.opts.on, set: v => { conduct.opts.on = !!v; if (!v) conduct.release('off'); }, info: () => `${conduct.raises} raised, ${conduct.beats} beats, ${conduct.tempos} tempo changes, ${conduct.cues} cues, ${conduct.cuts} cut-offs` });
systems.switches.push({ k: 'conductGesture', label: 'CLASH: two fingers resting still on bare ground raise the baton (takes that hold from "shape the ground with your voice"; a 3rd finger conducts) (off)', get: () => conduct.opts.gesture, set: v => { conduct.opts.gesture = !!v; } });
// Wilbow Oct 28 2026, 9:28 PM: "Go with recs" (claude/JourneyOhm_decisions_2026-10-28.md). New defaults; every switch still toggles in the dev panel.
{ const D = { windRocks: true, lightPlay: true, skyMood: true, critters: true, eggWords: true, clay: false, jamView: true, bubbleCatch: true, conductGesture: true };
  for (const w of systems.switches) if (w.k in D && w.set) { try { w.set(D[w.k]); } catch (e) { console.warn('default', w.k, e); } }
  Object.assign(skyMood.opts, { nightVel: .15, nightLow: .85, rainThin: .2 });   // #417 "slightly": half the gentle preset
  conduct.opts.near = (x, y) => { const { W, H } = render.size(); for (const X of jamView.groups()) for (const m of X.members) { if (!m.body) continue; const s = toScreen(W, H, sim.cam, m.body.x, m.body.y); if (Math.hypot(x - s.x, y - s.y) < 180) return true; } return false; };   // #413 A
}
const craze = createCraze({ sim, bus, music, songs: systems.songs }); systems.craze = craze;
{ const sl0 = sim.shapeLean; sim.shapeLean = (P, turn, tn) => craze.borrow(P, turn, tn) || (sl0 ? sl0(P, turn, tn) : null); }
systems.switches.push({ k: 'craze', label: 'traditions: a tune that catches spreads ohm to ohm as a craze; once enough ohms play it, it is the place\'s tradition', get: () => craze.opts.on, set: v => { craze.opts.on = !!v; }, info: () => `${craze.list.length} crazes, ${craze.catches} caught it, ${craze.plays} plays, ${craze.trads} became tradition` });
const audioSig = createAudioSig({ sim, bus, music, songs: systems.songs, autojam, traditions, things, ctx: render.lookCtx, st: render.st, jamRoles, jamGrow });
{ const AUx = render.look && render.look.api && render.look.api.aura, host = document.getElementById('dv-w');   // v0.0.22: dev switch for the tradition auras (look/aura.js; OFF by default, opts.realLook.tradAura)
  if (AUx && host) { const l = document.createElement('label'); l.id = 'dv-tradaura'; l.innerHTML = `<span>tradition auras on rare / master ohms (look; dev, off by default)</span><input type="checkbox" ${AUx.on ? 'checked' : ''}><i></i>`;
    l.querySelector('input').onchange = e => { AUx.on = !!e.target.checked; }; host.appendChild(l);
    // v0.0.23: which aura build stage to look at (1 = the simpler stage, default; 3 = the full look) - compare them on the phone
    const sl = document.createElement('label'); sl.id = 'dv-aurastage'; sl.innerHTML = `<span>tradition aura stage (1 simple, default / full = 3)</span><select><option value="1">1</option><option value="3">full (3)</option></select><i></i>`;
    const se = sl.querySelector('select'); se.value = AUx.stage === 3 ? '3' : '1'; se.onchange = e => { AUx.stage = e.target.value === '3' ? 3 : 1; }; host.appendChild(sl); } }
if (snap) persist.restore(snap);
if (snap && !snap.parts.trippy) trippy.fromOld();   // an old save: count the scale / harmony it already reached
{ const f = sim.ohms && sim.ohms[0]; const T = world.home && world.terrOf ? world.terrOf(world.home) : null, st = T && T.style || {};   // the ground leans the world's effect kinds
  things.grow(world.seed || 1, f ? f.body.x : 0, f ? f.body.y : 0, T ? { hollow: Math.min(1, (T.craters || []).length * .2 + (st.gas || 0) * .3), water: Math.min(1, T.wet || 0), ice: st.ice || 0, rock: st.rock || 0 } : {}); }   // the world's own effect objects (once per world; saved)
// v0.0.3: ONE control clock, not tied to drawing. The worklet's level messages (~every 21 ms, audio clock) drive the tick
// while audio runs; a 25 ms timer covers the rest (audio off / starting). rAF only draws, so the heartbeat, clock streams,
// physics and matrix keep going when the screen stops drawing.
const ctl = { ms: 0, hz: 0, n: 0, src: '' };
let lastT = performance.now();
const tick = src => { const t = performance.now(), dt = (t - lastT) / 1000; if (dt < .012) return; lastT = t; ctl.src = src; ctl.n++;
  const a0 = performance.now(); sim.step(Math.min(.05, dt)); world.tick(Math.min(.05, dt)); trippy.tick(Math.min(.05, dt)); music.tickGlide(); bus.flush(); pulse.tick(); haptics.tick(); sing.tick(); harmony.tick(); if (lookFeed) lookFeed.tick(); blend.tick(); jam.tick(); autojam.tick(); systems.tick(Math.min(.05, dt)); traditions.tick(); things.tick(); shapeplay.tick(); bystand.tick(); jamRoles.tick(); jamKeys.tick(); jamGrow.tick(Math.min(.05, dt)); trees.tick(Math.min(.05, dt)); craze.tick(); conduct.tick(Math.min(.05, dt)); abilities.tick(); gasfloat.tick(); senses.tick(); herd.tick(); rare.tick(); influence.tick(); audioSig.tick(); matrix.tick(); sound.gc(); ctl.ms = ctl.ms * .95 + (performance.now() - a0) * .05; };
const onLv = sound.onLevels; audio.onLevels = (lv, ct) => { onLv(lv, ct); tick('audio'); };
setInterval(() => { if (performance.now() - lastT > 30) tick('timer'); }, 25);
setInterval(() => { ctl.hz = ctl.n; ctl.n = 0; }, 1000);
let lastF = 0, camT = 0; const loop = t => { if (world.frame) world.frame(camT ? (t - camT) / 1000 : .016); camT = t;   /* v0.0.24: the camera springs per drawn frame (world.opts.camFrame) */ const a = performance.now(); render.draw(); if (!render.inside()) { systems.draw(); things.draw(); shapeDraw(); abDraw(); } render.drawDive(); frames.frame(t, performance.now() - a); if (lastF) quality.frame(t - lastF, ctl.ms, t); lastF = t; requestAnimationFrame(loop); };
requestAnimationFrame(loop);
bus.on('tempo.tap', ev => { music.tapTempo(ev.times, ev.src); const tf = sim.opts.tempo ? sim.opts.tempo.follow : 'context';   // ohms that HEAR the tap follow it (input.js 'to')
  if (ev.to && tf !== 'none') for (const id of ev.to) { const o = sim.byId && sim.byId.get(id); if (o) music.setFollow(o, 1); } });
// OHMS (b), PROPOSAL opts.thing.sound: the drum-like tempo thing sounds when tapped: a short low strike from its own fixed seed
const thingSrc = { id: 'thing', scale: 'thing', seed: 7777, recipe: makeRecipe(7777).id };
bus.on('touch', ev => { if (ev.kind !== 'thing' || !sim.opts.thing || !sim.opts.thing.sound) return; bus.note({ src: thingSrc, kind: 'strike', deg: 0, oct: 0, vel: .3 + .5 * Math.min(1, ev.vel || .5), pos: .15, t: music.now() }); });   // any gesture / source may send it (Wilbow 7A-D)
bus.land = sim.opts.land;   // when a tap change lands in a jam (Wilbow 6A+6D, proposal)   // OHMS track emits it (4 steady taps on empty ground)
const q = new URLSearchParams(location.search);
if (q.has('nojam')) sim.opts.jam.on = false;   // test hook: compare timings without the partner
if (q.has('autostart') || q.has('selftest')) startAudio(false).then(() => { if (q.has('selftest')) { selftest.res = null; setTimeout(() => selftest.start(+q.get('selftest') || 60), 300); } });
globalThis.JO = { guests, things, drums, audio, music, sim, events: bus, matrix, sound, pulse, frames, selftest, ctl, panel, jam, sing, harmony, blend, brain, influence, autojam, world, render, zoom, quality, systems, persist, clock, rare, traditions, trippy, jamRoles, jamKeys, jamGrow, trees, learnVoice, conduct, craze, audioSig };
