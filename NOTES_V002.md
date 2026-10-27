# Journey Ohm dev v0.0.2: one integrated sound system (pieces E, A, B, D)

com.lensure.journeyohm, versionCode 2, versionName 0.0.2, file JourneyOhm-dev-v0.0.2.apk.

## How the parts connect
input / body physics / clock / heartbeat+drone / dev panel / audio levels → **events on the music.js clock** (events.js) →
**shared world state** (sim.js, the reducer) → **influence matrix** (matrix.js, control rate, reads every source's signals) →
'live' events → **sound.js** → worklet: modal voice + synth engine voice → that owner's FX chain (in series) → reverb → limiter.
Per-source loudness comes back from the worklet as the control stream `sound.level`, which the matrix routes to glow and body throb.

- **A, one shared world state:** sim.js holds every source (ohm, heartbeat, drone), its body, look and signals, plus the
  options. music.js holds beat, key and tuning. Render reads this state; nothing else writes it except the event reducers.
- **B, one general matrix:** rows `{src, dst, amt}` live in the recipe. Any source (touch.pos, touch.pressure, note.degree,
  body.pinchIn/pinchOut/pull/motion/throb, sound.level, beat.phase, beat.pulse, bar.phase, key.tonic, lfo1, lfo2, env) can
  drive any target: at note time (modal.*, synth.<gene>, mix.*, note.gain, note.pitch) or live (live.<synth param>,
  live.bend, fx.N.<control>, mod.N.amt, lfo.N.rate, look.glow, body.throb).
- **C, the same blocks at every scale:** heartbeat and drone are ordinary sources (scale 'world') with a recipe, a body,
  signals and matrix rows. They differ from the ohm only in having no screen body. Recipes and mod sources are generic.
- **D, everything through events:** note / ctl / live / set / recipe events, stamped in music time. Taps are stamped 'now'
  (snapped to the beat only in a jam). Continuous controls are control-rate streams that are posted only when they change.
  Heartbeat notes are scheduled ahead on the beat grid. Per-sample DSP stays in the worklet.
- **E, two-way coupling:** the body's pinch, pull and motion shape the sound through the matrix rows. The sound's level comes
  back to glow and throb the body.

## One recipe = the whole sound
`{id, v:2, name, seed, parent, hue, send, modal:{fam,p}, synth:{genes, family}, mix:{modal,synth}, fx:[inserts],
mods:[rows], lfo:[2], menv:{a,d,s,r}}`. The ohm holds only a recipe id. Save, load and new seed act on this one object.
**Store choice:** localStorage key `jo.recipes` (a name → JSON map; survives restarts; no extra plugin). It could move to
@capacitor/filesystem later if recipes should become shareable files.

## Pieces
- **E:** audible heartbeat (a low double thump on each beat) and om drone (a sustained synth voice on the om), each with
  on/off and a level control. BPM and om (Hz) knobs; BPM is locked to om/64·60 until the BPM knob moves. Save / load / list.
  Load shown in the panel: modal x/32, synth x/14, FX slots x/8, stolen, shed, matrix ms, events/s.
- **A:** the softsound inst.js engines (VA, FM, wavetable, phase distortion, Karplus, granular, additive, ...) are ported
  into the worklet. Each note plays a modal voice plus a synth voice. Panel: family picker ('auto' follows the genes, which
  stay leanings) and modal / synth mix. The additive engine was optimised (tilt weights every 32 samples).
- **B:** fx.js plus fxkinds.js (the old 28 plus a new state-variable filter, svf) as chainable inserts: 8 worklet slots, up
  to 4 in series per owner. Beat-locked kinds follow the tempo; pitch kinds follow the tuning. Spectral FFT is not done.
- **D:** synth amp, filter and pitch envelopes (genes); a mod envelope (menv) and 2 LFOs per recipe, with rates in beats; the
  matrix rows above. Panel: rows with source / target / amount, add and remove.

## Physical controls: PROPOSALS (for example; not requested gestures)
Checked against /workspace/softsound/GESTURES.md: grab on the body and pinch on the ohm were already used there; 3-finger
tap = undo and 4 = redo stay free; two-finger twist is not used.
- Drag the ohm's body (with the nodes closed): it follows your finger on a soft spring and swings back when you let go.
  The default rows map the pull to effect 1's depth and the wobble while it moves to the synth's vibrato depth.
- Two fingers on the body, pinching together: the body shrinks; the pitch bends up a little and the filter opens.
- Two fingers spreading apart: the body swells; the filter closes and effect 1 gets wetter.
- Touch position and pressure on a strike: brighter filter further out; louder with more pressure.
- Sound back to the body: louder sound makes the ohm glow and throb.
All of these are rows in the recipe, so any of them can be re-routed to any other target in the panel.

## Kept from step 1
Tap sounds on touch-down (no quantise unless a jam is on); hold about 0.38 s opens the 7 nodes; node tap and slide; tap empty
space closes the nodes; the open-ended scale tag; events recorded in beat time; the ohm holds only a recipe id.

## Step-1 proposals, default ON, each with a toggle (World section of the dev panel); not decided
- body size sets the octave (toggle "body size sets the octave")
- hold also strikes (toggle "hold also strikes"; off = the hold damps the strike)
- 4-beat breath swell (toggle "4-beat breath swell")
- just-intonation major tuning (select "tuning": om-JI-7 (proposal) or equal-tempered major)

## Known conflicts between A (shared state) and D (events only)
- Physics and clock streams go out as events every frame. That is about 800 ctl events/s with one ohm and the default rows,
  and about 4000/s with 16 sources. Mitigation: post only on change. Measured cost is well under 0.1 ms per frame.
- Worklet levels reach the main thread about 20–40 ms late, so they are stamped in the past (their real clock time).
- Render reads the state directly. That is a read, not a write.
- The self-test's silent voice ramp calls audio directly (it is a dev tool).
- The worklet's load guard (lE) needs a fine clock inside the worklet. With a coarse clock (as in headless Chrome), the guard
  and the load % are coarse.
