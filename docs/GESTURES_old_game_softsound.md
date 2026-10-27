# Resonance: gesture conflict audit + decisions (v0.3.1)

Audit first, then Wilbow's decisions. **Approved and built:** C1 (option B), C2 + C3, C7, C8, C9, C11, C13, C18. **Not approved, unchanged:** C4, C5, C6, C12, C14, C15, C16, C17, C19. **Kept as designed:** C10, C20, C21. The decision for each row is in the table's last column and in section 3. Tables in sections 0–1 describe v0.3 behaviour; the rows changed in v0.3.1 are marked **(v0.3.1)**.
Source: `www/js/app.js` (the recogniser and the per-level handlers `H.surface`, `H.daw`, `H.dna`, `H.system`, `H.galaxy`), plus the modules named below.

## 0. How the recogniser decides (app.js, `pointerdown` / `pointermove` / `end`)

| Primitive | Rule (exact thresholds) |
|---|---|
| **Tap** | One finger, moved < 10 px, lifted within 300 ms, never more than one finger down. Fires `up(tap)`, then `tap()` **immediately** on lift. There is no wait for a possible double tap, except in the DAW, which waits 260 ms. **(v0.3.1)** A tap **on an ohm** is deferred 300 ms (`App.ohmTap`); a hold, tap-then-hold or a second tap cancels it; a second tap on the same ohm within 320 ms is ignored. Taps elsewhere still fire immediately. |
| **Double tap** | A second tap within 320 ms and 34 px of the first. Both taps still fire `tap()` first; the second also fires `doubleTap()`. |
| **Hold** | One finger, moved < 10 px, still down at 450 ms. Calls `hold(on)`, then `hold(off)` on lift. |
| **Tap-then-hold** | A press within 420 ms and 40 px of the previous tap, then held to 450 ms. Calls `tapHold()`, and plain `hold` is skipped if `tapHold()` claims it. |
| **Drag / stroke** | Moved ≥ 10 px. On the surface, `down()` picks a mode: `grabPending` if on a body or bubble, otherwise `ink`. `grabPending` becomes a **grab** after 8 screen px; if the grab fails it becomes ink. When zoomed out (cam.z < .35), any drag is a **pan**. |
| **Two fingers** | `two('start' / 'move' / 'end')` with ratio, rotation (`dAng`) and pan. A **twist** fires once \|dAng\| > 1.3 rad with ratio .7–1.45. While inspecting, a lower threshold applies (\|dAng\| > .22 rad, ratio .8–1.25), and the twist becomes the *cutoff* edit. |
| **Multi-finger tap** | **(v0.7 C)** All fingers up within 400 ms, moved < 30 px. **Three fingers = undo, four or more = redo.** A two-finger tap does nothing now. Works at every level. (Before v0.7: 2 = undo, 3+ = redo.) |
| **Android back / browser back** | `App.back()`: closes the DAW, leaves DNA, goes from surface to system, and from system to galaxy. ★ v0.7: in play mode it leaves play mode first. |

## 1. Every gesture

### World / surface (`H.surface` + `surface.js`)

| Gesture | Target / context | What it does | Code | Disambiguation |
|---|---|---|---|---|
| Tap | **Ohm** | **(v0.3.1, C1 option B)** After the 300 ms deferral: a **jam member → mute / unmute**; a **bystander or an ohm near a jam (< 420 px) → asks to join** (accepted if the jam has room, else a 'full' cue); a **lone ohm** → the old chirp. v0.3 behaviour: **Chirp**: a small hop impulse (`C.impulse` −120·strength), `creatureCall(c,'play')` (it sings back), and a ripple. Returns 'chirp'. | `Sf.tap` | Hit test `Sf.hit`: bubble > creature body/limb > body. A shorter press gives more strength. |
| Tap | Motes (within 5 s of a deletion) | **Restore** the deleted ohm exactly | `Farewell.tap` (checked first in `Sf.tap`) | Motes only |
| Tap | Monolith | Hums the home chord. **Two taps within one bar modulate the world key.** | `Events.tapped` | `b.meta.monolith` |
| Tap | Fossil bones | Plays the extinct motif | `Events.tapped` | `b.meta.fossil` |
| Tap | Bubble | Pops it (frees the caught ohm) | `Sf.popBubble` | Bubble hit first |
| Tap | Instrument / material body | Strikes it (velocity from tap shortness). **(v0.8a4)** A thin string with two anchors that is *tied* (a cluster or woven string, or one drawn within ~190 px of a jam member) sounds in the jam's notes and the jam hears it as one more voice | `Sf.strikeBody`, `Jam.tieTune`, `Jam.tieHeard` | |
| Tap | Air / sky / ground | Ripple + a blip pitched by height. **If the press is < 90 ms, `fastTouch` startles nearby ohms.** | `Sf.tap`, `Sf.fastTouch` | Press duration |
| Double tap | Body (not an ohm) | Toggles clear/dense material | `Sf.doubleTap` | Ohms are ignored; the first tap still strikes **(v0.8a5)** On a drawn shape it also changes its own voice blend (clear = more voice, dense = less). |
| Double tap | Fossil | Wakes it (an egg of the extinct lineage) | `Events.doubleTapped` | |
| Hold (450 ms) | **Ohm** | **Listen/speak**: it chirps, then listens to the mic (speech → words; pitch-tracked). Also damps its body. Speech ends on release. **micfix:** the game sound dips (to ~6%) while it listens and fades back in (~0.3 s) on release; listening also ends on a second finger / cancel, on backgrounding, or if the mic is granted after the finger lifted. Plain mic (no echo cancel / noise suppression / AGC), first 0.4 s skipped so the chirp is not heard. | `Sf.hold` → `RS.Listen.start/end` | Moved < 10 px |
| Hold | Instrument body | Damp (mute ringing); undamp on release | `Sf.hold` | |
| **Tap-then-hold** | **Ohm** | **Enter play mode** | `H.surface.tapHold` → `RS.Play.enter` | A tap within 420 ms / 40 px, then a hold |
| Drag | Ohm body | Grab and drag (soft joint). Release **throws** with finger velocity. If it moves > 30 px it **leaves its adopted instrument** (`C.release`). A throw > 500 px/s makes it call out. | `Sf.grabStart/Move/End` | 8 px world·zoom to start a grab |
| Drag + press into another ohm ~0.5 s | Two ohms | **Fuse** into a colony | `grabStep` → `K.fuse` | Overlap < 0.95·(r1+r2) held 0.5 s |
| Drag a fused member far | Colony | **Separate** it | `colony.js` (link stretched > 2.2·rest + 26) | Must be the grabbed member |
| Drag-drop an ohm onto an instrument | Ohm → tuned body | **Adopt**: it plays that instrument in rhythm | `Sf.checkDrops` → `C.adopt` | Dropped and touching within 2.5 s |
| Drag + release fast upward | Object (not an ohm) | **Into orbit** if radial speed ≥ ~0.98·escape (≈1060 px/s on 900 g) | `Orbit.thrown` | Not creatures, limbs, eggs or water |
| **Drag a rod END** (v0.8a5 P1, new) | Drawn rod (role instrument, drawn in ≥ 0.8a5) | **Moves that end; length → pitch, live.** The far end stays put if it is anchored. Release on the ground (< 16 px) = pinned there; on another body (< 8 px; not an ohm, bubble or limb) = attached; in the air = free end. **Never a throw, never orbit, never delete**: an end release has zero velocity. While dragging it retunes continuously; a soft click marks each new scale degree (≤ 5/s; none for free-pitch shapes). | `app.js down` → `Shapes.handleAt` → `grabPending`; `Shapes.start/tick/end` (wrapping `Sf.grabStart/Move/End`) | Handle = within max(16 px/zoom, radius + 4) of an end and < ⅓ of the length. Anywhere else on the rod = the old grab/throw. Ohms and bubbles under the finger win. Off in play mode / baton. |
| **Drag a blob RIM** (v0.8a5 P1, new) | Drawn blob | **Resizes it** (area ×(r/r0)², .15–6× the drawn area): bigger = lower (≈ −1 octave at ×4 area). Release = it keeps the new size. | `Shapes.start` rim mode | The outer max(R/4, 12 px/zoom) band of the rim. The inside = the old grab/throw. |
| Stroke that starts **just beside** a rod end (v0.8a5 P1) | Rod end | Draws a new rod **chained onto that end** (as starting on the body did) | `Sf.stroke` `startB`/`endB` fall back to `Sf.endNear` | 16–24 px from the end (inside 16 px = end drag). Same for a stroke that ends beside an end. |
| Drag + flick up | **Bubble** (with a caught ohm) | **Delete** the ohm (farewell, motes 5 s). Needs radial speed ≥ 900 and distance ≥ 110 px. A fused cluster refuses. | `Farewell.flick` | Speed **and** distance |
| Stroke crossing things | Ohms / bodies | **Strum**: crossed ohms call out, bodies ring | `Sf.inkMove` | Live during the ink stroke; if anything was crossed, the stroke ends as 'strum' and draws no material |
| Line from an ohm's **halo** to another ohm | Two ohms | **Teach** (A teaches B its key/tempo/motif) | `Sf.stroke` (teach branch) | Start in the halo ring r·0.9 … r+30, end on another ohm |
| Small letters in a halo | Ohm | **Write words** (handwriting → song words) | `Sf.writeTarget` / `writeStroke` + `ink.js` | Size/position heuristic near the halo |
| Closed loop around an ohm | Ohm | **Catch** in a bubble, **anywhere** (air, ground, half-buried, slope, underside, water, gas float layer, moons). With several ohms inside, the one nearest the loop's centre. | `Sf.stroke` → `Sf.catch` | closure < .22 and length > 90. **(catch-anywhere fix, Wilbow 6:48 PM MDT Oct 23)** A loop round an ohm beats strum and teach even when it clips things on the way (the ohm's own legs, its instrument, a neighbour, a plant, a crystal) or ends on a neighbour; a line across an ohm is still a strum. A fresh bubble cannot be popped by a playful neighbour's bump for 1 s. |
| Closed loop around the **sky star** | Star | **Start/stop screen recording** (video share) | `Sf.stroke` → `App.toggleRecord` | The loop contains the star |
| Spiral | Open space | **Spawn a new ohm** (genome from the stroke) | `classify` → `Genome.fromStroke` | Must **not** be closed (the closure test runs first) |
| Wave | Anywhere | Water. **(v0.5b, change of effect, same gesture)** pours water (n x 60 units) into the nearest terrain low point, or starts a new pool there; no water particles. Undo / redo remove / re-add that water. | `classify` 'wave' → `RS.Water.pour` | |
| Star shape | Anywhere | A light | `classify` 'star' | |
| Zigzag | Anywhere | Lightning spark; the struck ohm **flees** | `classify` 'zigzag' | Under CALM, flee is now a flinch only |
| **Infinity** over two ohms | Pair | **Bond / unbond** | `Symbols.early` → `SY.bond` | Early recogniser, score ≤ 2.6, margin ≥ .2, and the loops pass over 2 ohms |
| **Hook, then `<` or `>`** (v0.8a O6: two strokes; was the one-stroke hooked arrow) | Open ground (not started on an ohm, halo, bubble or the egg) | **Undo**. The hook (the hooked arrow or the '?' hook) is held ~1.2 s, shown faintly with ghost hints of both finishes; a 2-segment arrowhead `<` or `>` (15-80 % of the hook's size, its tip within .4 x size of either hook end) within 1.2 s = undo (both directions, Q100). **A lone hook becomes a normal material rod when the window ends (Q103).** Any other second input: the hook fades and that input routes as normal at once. | `Symbols.early` → `SY.hold`; second stroke `SY.second` (top of `Sf.stroke`); timer `SY.holdTick` in `Sf.step` | Never held: closed (catch loops), spirals (> 1.25 turns), flicks (< 40 px, < 250 ms or ≥ 900 px/s), strums, the baton, play mode, DAW. `SY.UNDO_GROUND` retired. **0.8a8: held DURING the egg lessons too** (Wilbow 11:41: '?' must work from the first touches), so hook + `<` also undoes there; strokes ON the egg still go to the egg. Hooks are read in the VIEW frame (`SY.toView`, the camera's turn round the planet undone), so 'under' always means the screen's down |
| **'?' = hook, then a point under it** (v0.8a O6, new) | Open ground; space views (a '?'-shaped pan / stroke, then a tap on empty space) | **Calls the guide**: it comes to the point (placed just off-screen first if it's far), or re-hatches from its seed if deleted / caught (same genome; lessons not restarted). In the galaxy / system view the camera eases back (300 ms) and a guide sprite flies in and sings. The relations view comes in v0.8c (chunk 9). | `SY.tap` (app surface tap) / `SY.second` (a stroke < 12 px) → `Guide.summon`; space: `App.qArm` / `App.qPoint` | The point: a tap (< 10 px) or a stroke < 12 px, below the hook's lowest point by ≤ .6 x its height and within .35 x its width of the tail. It is consumed (no double tap / fly-home). A point on a star / system / body is a normal tap **0.8a8:** every world has a guide from launch and after a reload (`Guide.ensure`, 1.5 s in, re-hatches if missing); a called guide GLIDES (200 px/s + 0.8 x distance, ≤ 900 px/s: ~1-2 s from off-screen) and hovers at the point 2.5 s (touches on it there are guide touches) |
| Other closed shapes | Anywhere | **(v0.8a3) Lifted at once = material blob** (as since v0.4b). **Closed shape + rest the finger at the end (≥ the clay hold, ~0.5 s) = effect item** (`Items.fromShape`, made: 'player'): the end-hold ring turns warm and fills, a soft three-note chime; the item is a **modulation insert** for the ohms that carry / stand near it (reverb, echo, grit, glitch, chorus, tremolo, comb, pitch shift), never a new instrument. Undo / redo take it back / restore it (body and record). **Cap 4** player items: a 5th rested shape is a blob with a grey 'full' ring (nothing removed). Player embers never add permanent grit. | `Sf.stroke` (`opt.endHold >= Sf.CLAY_HOLD`) → `Items.fromShape` | After the catch loop / record star, the spiral (clay) and the glyph offer: a loop around an ohm still catches, a spiral + rest is still clay, a registered glyph + rest is still the glyph |
| Unregistered glyph | Anywhere | Fizzles (ink fades) | `Symbols.offer` | |
| Any other stroke | Anywhere | **Material**: a rod, or a blob if closed; pins to the ground or attaches to a body at its ends | `Sf.stroke` freeform | Fallback |
| Pinch | Empty world | Zoom about the centre. Zooming past .013 goes to the **system**; past 4.2 near an ohm enters **DNA**. | `H.surface.two` | |
| Pinch | Instrument body | **Tension** (pitch). Spreading > 1.65 **pops it off / onto the key grid**. **(v0.8a4)** On a tied string the tension steps it through the jam's notes (keeping the strings in order); popped off the grid it is untied and plays its raw pitch | `Sf.pinch` | Starts on the body |
| Pinch | **Ohm** | **Squeeze**: it sings, pitch from the squeeze | `Sf.pinch` (creature) | |
| Pinch spread > 1.8 | Ohm, zoom > 1.6 | Enter **DNA** | `H.surface.two` end | |
| Pinch on the inspected ohm (zoom 1.8–4.2) | Ohm | **Register**: in .4–.85 = up an octave, spread 1.18–1.75 = down | `EnvEdit.register` | \|dAng\| < .3 |
| Two-finger twist | Surface | **Open the DAW river.** Twisting back closes it; while open, a twist transposes. | `App.twist` | \|dAng\| > 1.3 rad |
| Two-finger twist | While inspecting | **Cutoff/brightness** instead of the DAW | `EnvEdit.twist` | \|dAng\| > .22, ratio .8–1.25 |
| Drag an envelope node or bend handle | Inspect zoom | Edits A/D/S/R, curve, filter env | `EnvEdit.hit/drag` | < 20 px of a node (nodes sit outside the body) |
| Back-and-forth stroke across the body | Inspect zoom | **Vibrato** (reversals = depth, speed = rate) | `EnvEdit.strokeVibrato` | Inside 2.4·r + 20, ≥ 6 points |
| Drag | Zoomed out (z < .35) | Pan | `H.surface.down` | |
| 3-finger tap / 4-finger tap (v0.7 C; was 2 / 3) | Anywhere | Undo / redo | `end()` | < 400 ms, < 30 px |

### Play mode (`playmode.js`, entered by tap-then-hold on an ohm)

| Gesture | What it does | Disambiguation |
|---|---|---|
| Touch a scale node (limb tips = an octave up); pads for drummers | Plays the note, held while pressed; velocity from position | `Pm.hit` |
| Drag a handle: fin = cutoff, antenna = vibrato, sac = formant/send (radial) + glottal glide (vertical), horn = register, strings = detune; halo = amp env, its inner node = filter env | Timbre edits (learned/epigenetic) | Handle hit |
| Throat tube (vocal ohms): along = tongue position, across = diameter, lip node, throat node = tense/breathy, nose flap = velum, shake = vocal vibrato | Tract edits | Tube hit |
| Play the same phrase twice | It adopts the phrase as its motif | |
| **Exit**: pinch in (ratio < .7), or a fast swipe away (> 3R out at > 10R/s) | Leaves play mode | ★ v0.7: a swipe that *starts* on empty screen on the left half is now the stick, so the swipe-exit works from the right half, from the ohm or a node. Pinch and Android back work everywhere. |
| ★ **v0.7 K: thumb on EMPTY screen, left half** | **Walking stick**: a soft glow appears under the thumb; drag = the ohm walks / swims / floats / flies that way with its own muscles | `RS.Walk.claim`: never on a node, handle, tube, envelope node or the ohm's body (those stay play mode). The stick pointer is kept out of the gesture recogniser, so the other hand plays nodes at the same time |
| ★ **v0.7 K: flick up with the stick thumb** (> 1100 px/s, > 35 px) | Jump (grounded) or rise (floaters, fliers, swimmers in water) | 0.6 s cooldown; only on the stick pointer |
| ★ **v0.7 K: Android back** | Leaves play mode (before any other back action) | `App.back` play-mode case |

### DAW river (`daw.js`, opened by a twist)

| Gesture | What it does |
|---|---|
| Tap a bead | Audition (in an open pattern: remove) |
| Tap a lane | Open its pattern lattice (in a pattern: add a note). A braided colony lane unbraids. |
| Double tap a lane | Solo / unsolo (single taps wait 260 ms so they don't also fire) |
| **Hold a lane** | **Mute / unmute (mix mute)** |
| Drag a bead vertically / horizontally | Pitch (≥ 9 steps = free pitch) / time |
| Drag a bead's front / tail edge | Attack / release (writes genes) |
| Drag a lane's top/bottom edge | Timbre |
| Fast swipe across beads | Select; then drag the group = shift, or drop on another lane = copy |
| Closed loop drawn on a lane | Loop that region |
| Draw on an empty lane | **(v08-dawpaint)** On an ohm lane (an ohm, colony or instrument with a music brain): **paint** a living ribbon of notes that the ohm plays from the next bar (see v08-dawpaint below). On a lane without a brain (env / star): write notes (in key), as before |
| Two fingers on a bead / lane / empty river | Length+velocity / volume+braid / tempo |
| Twist | Transpose (30° = 1 semitone); twisting back closes the river |

#### ★ v08-dawbrain: the river shows the ohm's music brain (`dawbrain.js`, display only: no new gestures)

| What you see on an ohm lane | Gestures there |
|---|---|
| **Live beads**: the notes the ohm really played (after the crowd cap, so what you heard), wiping in over the last 32 steps | **Read-only, not a handle**: a finger on a live-only spot finds the lane under it, so a tap there opens the pattern lattice exactly as on an empty lane (unchanged v0.6 behaviour) |
| **Ghost** (the stored tune) at .3 behind the live beads, white outline | Every existing bead gesture still edits the stored tune; the ghost goes full while dragged / selected and lights up for 1.4 s after any edit so the change is visible |
| Chord glow (the chord being followed), scale lattice dots at strong beats, tonic lines | None. In the open pattern lattice the live layer hides and the stored tune is full, so add / remove / drag work as before |
| Cycle ticks on the lane's top edge, landing diamond (sam / gong / clave / compás), accent dots | None |
| Role mark (lead / bass / comp / drums), origin ring colour, sound tint (birth voice vs learned sound), drummer kit rows | None |

Checked: tap bead, tap lane, double tap, hold, bead drags, edge drags, swipe-select, loop draw, draw-on-lane, two-finger, twist all hit-test the stored tune only (`D.beadAt` never sees live beads); pw_dawbrain 15/15, test_daw 44/44.

### DNA (`dna.js`, entered by pinch-spread or deep zoom on an ohm)

| Gesture | What it does |
|---|---|
| Tap a rung | Pluck (hear the gene); on the motif stave (genes 107–122) plays the motif |
| Horizontal drag on a rung | Slide its value |
| Vertical drag | Scroll |
| **Fast horizontal swipe across the helix (< 260 ms, > 1.6·amp)** | **Scramble the region (player mutation)** |
| Pinch | Amplify a gene; **pinch in < .55 = exit** |

### System and galaxy

| Level | Gesture | What it does |
|---|---|---|
| System | Tap a body | Chime; on the ark while carrying ohms, **lands** |
| System | Double tap a body | Enter the surface |
| System | Drag a planet | Nudge its orbit (snapped to a rhythmic period) |
| System | Draw a spiral / wave / star near a world | Seed life / water / light there |
| System | Pinch | Zoom; deep zoom enters a world; pinching out goes to the galaxy |
| Galaxy | Tap a star | Chime |
| Galaxy | Double tap | Enter a system (or, on empty space, fly home) |
| Galaxy | Drag / pinch | Pan / zoom; deep zoom enters a system |
| Galaxy | **Pinch out at minimum zoom** | **NEW UNIVERSE** (`App.newUniverse`) |

### Speech, handwriting, the new request

- **Speech:** hold an ohm (see above). **Handwriting:** small letters in a halo (above), plus in play mode / DAW word lanes.
- **(v0.3.1) Tap a bystander = join, tap a jam member = mute.** Bound with C1 option B and the C2/C3 deferral.

## 2. Conflicts (known or likely) and proposed fixes

"Changes used?" means it changes something Wilbow has already used on the phone.

| # | Conflict | Severity | Proposed fix | Changes used? |
|---|---|---|---|---|

Decision column for each row: see section 3 (decision table).
| **C1** | **A single tap on an ohm is already taken: it chirps** (hop impulse + `creatureCall('play')` + ripple). The new join/mute would replace or overlap it. | High | Option A: tap = join/mute and **drop the chirp** (the ohm can blink its glow as feedback instead). Option B: keep the chirp on lone ohms (no jam nearby) and make tap = join/mute only for ohms in or near a jam. | **Yes** (tap-to-chirp) |
| **C2** | **Tap-then-hold (play mode) always fires a tap first** (taps fire on lift without waiting). With join/mute bound, entering play mode would also toggle join/mute. The same happens today: entering play mode makes the ohm chirp first. | High | Delay a single tap **on an ohm** by about 300 ms (like the DAW's 260 ms), and cancel it if a hold or double tap follows. Cost: about 0.3 s of feedback latency on ohm taps only. | Slightly (tap latency) |
| C3 | **Double tap on an ohm** does nothing (`Sf.doubleTap` ignores creatures), but both taps chirp. With join/mute, a double tap would join and then immediately mute. | Med | Same deferral as C2. Ignore a second tap on the same ohm within 320 ms. | No |
| C4 | **Hold on an ohm = listen (microphone)**, while tap-then-hold = play mode. A hold that lands within 420 ms / 40 px of any earlier tap (even one on the ground nearby) enters play mode instead of listening. | Med | Require the earlier tap to be on the **same ohm** for tapHold. | Slightly |
| C5 | **Dragging an ohm through a crowd fuses it** if it rests pressed against another ohm for 0.5 s. Jam members now stand close and bob, so this is more likely. | Med | Raise fusion to 0.9 s with overlap < 0.8·(r1+r2), and only when the dragged ohm is nearly still (slow speed) while pressed. | Slightly (fusion takes longer) |
| C6 | **Moving an ohm by drag (> 30 px) silently unadopts its instrument** (`C.release`), and dropping it near a tuned body re-adopts. Accidental when tidying ohms. | Low | Unadopt only on a throw (> 500 px/s), or when it is dropped > 150 px away. | Slightly |
| **C7** | **Bubble flick: delete vs orbit.** `grabEnd` checks delete first (≥ 900 px/s **and** ≥ 110 px). A bubble grab has no `grab.c`, so a fast, **short** upward flick (< 110 px but ≥ escape speed, ~1060 px/s) is passed to `Orbit.thrown` and can put the **bubble with the ohm inside into orbit**. | **High** (likely bug) | Exclude bubbles (`meta.role === 'bubble'`) from orbit. | No (bug fix) |
| C8 | **Loop vs infinity vs spiral vs record:** <br>• An infinity not over exactly two ohms falls through and, if closed, **catches** one ohm. <br>• A tight spiral whose end lands near its start (closure < .22) is read as a **catch / item** instead of a spawn. <br>• Any loop that encloses the **sky star** starts **screen recording**. | Med | • Infinity: if the recogniser is confident but there aren't two ohms, fizzle instead of catching. <br>• Run spiral classification **before** the closure test when turns ≥ 1.5. <br>• Record: require the loop to be small and drawn around the star itself (radius < 2× the star's screen size). | Slightly (edge cases) |
| C9 | **Undo hook vs material:** a hooked line meant as material can **undo**. Undo also has the 3-finger tap (v0.7; was the 2-finger tap). **Resolved in v0.8a2 (O6):** undo needs a second stroke (`<` / `>`), so a lone hook is a material rod (after a 1.2 s wait). | Low | Keep it, but require a stricter score for the hook (≤ 2.0) when it starts on the ground. | No |
| C10 | **Teach line vs material rod vs halo handwriting:** a stroke starting in a halo and ending on another ohm always teaches, even if it was meant as a rod. Small strokes in a halo may be read as letters. | Low | Keep (it is the designed priority). Show a filament preview while drawing. | No |
| C11 | **Strum during any ink stroke:** drawing material across a jam makes the crossed ohms call out and cancels the material. | Med | Ohms in a settled jam don't strum-call; they just glow. | Slightly |
| C12 | **Fast tap in the air (< 90 ms) startles ohms** (`fastTouch`). This is easy to trigger by accident near a jam. | Med | Ignore `fastTouch` for ohms in a jam, or raise the cut to < 60 ms plus requiring it within 120 px. | Slightly |
| C13 | **Twist vs pinch zoom:** the zoom follows the fingers until the 1.3 rad twist threshold, so a twist also zooms a little. While inspecting, a pinch with > .22 rad of rotation becomes a **cutoff edit instead of a register change**. | Med | Freeze zoom once \|dAng\| > .4. While inspecting, require \|dAng\| > .35 **and** ratio .9–1.12 for cutoff. | Slightly |
| C14 | **Quick pinch start vs 2-finger-tap undo:** two fingers touching and lifting within 320 ms with < 22 px of movement undo. A hesitant pinch can undo. | Low-Med | Require both fingers to touch within 80 ms of each other, and movement < 14 px. | Slightly |
| **C15** | **Accidental DNA entry:** pinch spread > 1.8 on an ohm (zoom > 1.6), **or** just zooming past 4.2 near an ohm, opens DNA. In inspect range, the register spread (1.18–1.75) is adjacent to the DNA threshold (> 1.8). | Med | Only enter DNA by deliberate deep zoom (> 4.2) with an ohm centred, and remove the spread-on-ohm entry. Or widen the gap: register ≤ 1.6, DNA ≥ 2.0. | **Yes** if the spread entry is removed |
| C16 | **DNA fast swipe = scramble (mutation)**, which is close to a fast horizontal slide on a rung. | Med | Require two quick swipes, or a swipe longer than 2.5·amp. Mutation stays player-only, as now. | Slightly |
| **C17** | **Galaxy: pinch out at minimum zoom = NEW UNIVERSE.** This is destructive-feeling and easy to trigger while zooming out. | **High** | Require a held pinch-out (≥ 1 s) at minimum zoom with a visible warp building up, and allow cancelling. | Slightly |
| C18 | **Two different "mutes":** DAW hold-lane = mix mute (`Sf.mix`) vs the new jam tap-mute. | Med | Make them **the same state** (`c.muted`), shown both in the DAW lane and in the world. | No (unifies) |
| C19 | **Monolith: two taps within one bar modulate the world key.** A double tap on a monolith is easy and changes the whole world's key. | Low | Keep it, but require taps on two different beats with ≥ 0.25 bar between them. | Slightly |
| C20 | **Zigzag lightning makes a struck ohm flee.** Under CALM movement this is now only a flinch. | Low | Keep the flinch. | No (already changed in v0.3.1: flee is a flinch; flagged) |
| C21 | **Throwing an ohm > 500 px/s makes it call out.** This is a player-caused sound, so it bypasses the ONE_SOURCE gate by design. | Low | Keep it. | No |

## 3. Decisions (Wilbow) and what was built in v0.3.1

| # | Decision | Implementation | Test |
|---|---|---|---|
| C1 | **Option B** | `Sf.jamTap` (surface.js): member → `RS.Harm.mute` (toggle, saved as `c.muted`); bystander or within 420 px of a jam → `RS.Harm.invite` (join, or 'full' cue); otherwise `null` → old chirp (`Sf.tap`). | harm_check (tap mute/unmute, tap to join, lone ohm still chirps), pw_tap |
| C2 | **Approved** (v0.8b4: tap-then-hold now = listen, plain hold = play; the 300 ms deferral is kept) | app.js `App.ohmTap`: single tap on an ohm waits 300 ms, then `App.ohmTapFire`. `down` / `hold(on)` / `tapHold` / a non-tap `up` cancel it (`App.ohmTapCancel`). Tap-then-hold enters play mode **without** muting or chirping. | pw_tap (tap-hold → play mode, no mute) |
| C3 | **Approved** | A second tap on the same ohm within 320 ms is ignored (`lastTap 'ohmDouble'`), and the pending first tap is cancelled, so a double tap does nothing. | pw_tap (double tap = no change) |
| C4 | Not approved | Unchanged until v0.8b4. **v0.8b4 (Wilbow, Oct 23 2026 3:32 PM MDT) swaps the two:** plain hold on an ohm = play, tap-then-hold = listen. See the v0.8b4 section. | pw_tap C2 / C4 / C4b / C4c |
| C5 | Not approved | Unchanged. | — |
| C6 | Not approved | Unchanged. | — |
| C7 | **Approved (bug fix)** | Bubbles (`meta.role === 'bubble'`) are excluded from `Orbit.thrown`. | No dedicated test (code change only; pw_app 31/31 unchanged) |
| C8 | **Approved (bug fix)** | A confident infinity without exactly two ohms now fizzles (bloom, `{k:'fizzle'}`) instead of catching. A spiral with ≥ 1.5 turns is classified as a spawn before the closure test. Recording needs the loop to be tight around the sky star (loop radius < 2 × star radius, `Sf.starR`). | harm_check (C8 fizzle), symbols_check 9/9 |
| C9 | **Approved** | The undo hook needs score ≤ 2.0 (`SY.UNDO_GROUND`) when the stroke starts on or below the ground (ground − 14 px). **Superseded in v0.8a2:** `SY.UNDO_GROUND` is retired; undo is now two strokes (hook + `<` / `>`), see the §1 row and §13 below. | No dedicated test; symbols_check 9/9 still passes |
| C10 | Keep as designed | Unchanged. | — |
| C11 | **Approved** | Ohms (body or limb) in a **settled** jam crossed by an ink line glow (cue 'glow') instead of strum-calling, and don't cancel the material stroke. | harm_check (C11) |
| C12 | Not approved | Unchanged. | — |
| C13 | **Approved** | Zoom freezes once \|dAng\| > .4 (`two.noZoom`). While inspecting, cutoff needs \|dAng\| > .35 **and** ratio .9–1.12. | No dedicated test; env_check 5/5 + pw_app 31/31 still pass |
| C14 | Not approved | Unchanged. | — |
| C15 | Not approved | Unchanged. | — |
| C16 | Not approved | Unchanged. | — |
| C17 | Not approved | Unchanged (pinch out at minimum galaxy zoom still makes a new universe). | — |
| C18 | **Approved** | DAW lane mute on an ohm lane calls `RS.Harm.mute`: one state (`c.muted`), mirrored into `Sf.mix`, shown as a dimmed ohm in the world and as a muted lane in the DAW. | test_daw mute, harm_check (DAW mix mirrors tap mute) |
| C19 | Not approved | Unchanged. | — |
| C20 | Keep | Unchanged (lightning = flinch, already flagged). | — |
| C21 | Keep | Unchanged. | — |

**Player-visible changes from these decisions (check-in flags):** an ohm tap now answers ~0.3 s later; tapping a jam member mutes it (tap again to unmute); tapping near a jam asks that ohm to join; double tap on an ohm does nothing; ink across a settled jam no longer strums it.

**Other single-tap uses on an ohm (unchanged):** play-mode node taps (play mode only); tap on motes restores a deleted ohm (checked first).

## 4. Shaping window (clay) — v0.3.2-pre, steering 3 (`mold.js`)

A spiral leaves a clay lump (`Sf.clay`, not a physics body) with a ring that closes over ~8 s (`Mold.WIN`); every touch on the clay
resets the ring, total cap ~20 s (`Mold.CAP`). It hatches when the ring closes, on a tap on empty space, or when a new spiral is drawn.

| Gesture (must START on the clay) | Effect |
|---|---|
| Edge push / pull | Outline + timbre: round = pure, long = nasal (formant), lumpy = gritty, big = low |
| Drag a strand out | Adds a limb |
| Pinch | Size + register (in = smaller/higher, spread = bigger/lower) |
| Two-finger twist | Steps through voice families (`Mold.STEP` = 30 deg), soft click per step |
| Scribble (>= 4 reversals) | Roughness (fold, noise, sat, texture, less purity) |
| Taps (>= 3) | Motif rhythm: gaps relative to the median -> genes 115-122, rhythm phrase plays back |
| After every touch | Short phrase + jiggle; colour and glow track the sound |

**Conflict rules**
1. Existing gestures are replaced only when the finger(s) START on the clay; anywhere else everything behaves as before (zoom, DAW twist, ink, grab...).
2. A tap on the clay never triggers join, mute or chirp (and is not a double tap / tap-hold prefix).
3. Play mode, catch, teach, DNA entry and listen (hold) ignore the clay.
4. Three-finger tap (v0.7; was two-finger) = undo one shaping step; after the hatch one undo removes the spawn (as before).
5. Ink never strums the clay.
6. A new spiral hatches the current clay first.
7. Backgrounding (visibilitychange hidden, pagehide, leaving the surface) hatches the clay; a saved clay is restored and keeps its window.

Tests: tests/pw_clay.js (browser) and tests/mold_check.js (headless).

**v0.3.2 (vc6): no new gestures.** Two existing clay gestures gained meaning, checked against every row above and sections 1-3:
- Drag a strand out: the strand now lands exactly under the finger (limb phase gene 56 solved for the newest strand) and its tip shows
  what it becomes: down = leg (foot), up = feeler (bead), sides = fin / arm (serpents and floaters: fins / tentacles). The hatched ohm's
  physical limbs sit at the same angles. Same gesture, same start condition (must start on the clay) -> no conflict.
- Edge push / pull: a long SIDEWAYS pull (|pull| > .45 R, within ~30 deg of horizontal) also adds a body segment (toward a serpent);
  a hard sideways push removes one. Same gesture, only a bigger effect -> no conflict; undo (three-finger tap since v0.7) reverts it like any step.
- Body plans themselves are read from genes, never from a gesture. Spiral, wave, zigzag recognition: see NOTES v0.3.2 (jitter-tolerant spiral).


## 5. v0.4a (vc7, Oct 22 2026) — environment fields: no new gestures
Checked against every row above and sections 1-4. Nothing new is read from touch:
- Rocks, reeds, caves and pools are scenery made by the fields (not bodies): tapping, drawing or inking near them behaves exactly as on bare ground.
- Wind tones on rocks and reeds come from the wind field and from wind-blowing ohms (a gene), never from a swipe; a fast swipe is still a flick / ink as in section 1.
- Bolts strike charged ground on their own (weather); there is still no tap-to-strike.
- Light / curiosity seeking only happens while an ohm is unwatched; zooming in on an ohm (watching it) makes it hold still, as before.

## 6. v0.4b (vc8, Oct 22 2026) — attraction objects and symbiosis: no new gestures
Checked against every row above and sections 1-5. Nothing new is read from touch:
- A spiral with 2+ turns is now always a spiral (a spawn), even if the ink crosses an ohm: it is tested before the strum. A strum is still a line across an ohm; nothing else changes (row 6 of the clay rules: a new spiral hatches the current clay first).
- Closed shapes still make blobs; player-drawn items stay off. World items are found, carried and made by ohms. **(v0.8a3)** A closed shape with the end rest now makes an effect item (row above); lifted at once it is still a blob.
- Pair bonds, nests, crazes, farmed rocks / reeds and dew carrying are ohm-to-ohm behaviour with drawn signs only; tapping or drawing near a nest, sprout or droplet behaves exactly as on bare ground.


## 7. v0.5a (vc9, Oct 22 2026) — growth engine, plants, jam seeds: no new gestures
Checked against every row above and sections 1-6. Nothing new is read from touch:
- Plants, jam plants, carried seeds and history traces are drawn only; tapping, holding or drawing on or near a plant behaves exactly as on bare ground (no hit-test reads them). Plants grow only from sound the ohms make (and notes you play through the existing gestures).
- The seed trip is ohm behaviour: a carrier walks 60-120 px from home and returns home; grabbing / catching a carrier pauses the trip, as with any other walk.
- The echo-twin fix (twins echo inside back-and-forth turns) is ohm behaviour only.

## 8. v0.5b (vc10, Oct 22 2026) — height-field water, ohms stay home: no new gestures
Checked against every row above and sections 1-7. Nothing new is read from touch:
- **Wave stroke: change of effect, not a new gesture.** It used to spawn particle water; it now adds water to the nearest low point (a pool fills up to a level), or makes a new pool. Undo (2-finger tap; a 3-finger tap since v0.7) takes that water back out; redo pours it again.
- Taps, strikes and bolts near a pool ripple its surface (the existing tap / strike, no new hit-test; a tap on a pool still does what a tap on air / ground did, plus the ripple). Notes played near a pool ripple it too.
- Rain, geyser spray and the dew droplet are visuals only; rain raises the nearest pool and the ground moisture. **(v0.8a3)** The dew droplet now carries real water (taken from the pool, poured at home as a small puddle that soaks away); it is still not touchable. Grabbing a carrier (the existing grab) spills its droplet where it is.
- Pairing upgrades (#4 fine-tuning, #9 plant hum, #10 root resonance, #13 farm drone, #14 damp ground) and the seed fix are ohm behaviour only, with drawn signs (a dotted root link).
- Haptics (output only, nothing read): a light 8 ms tick when a tap ripples a pool, a 28 ms thump for a bolt in view.
- Record and share (star loop) and teach-by-demonstration were NOT added in this build: no gesture changes.

## 9. v0.5c (vc11, Oct 22 2026): sky, terrain, critters, record/share, pairings. No new gestures
I checked this build against every row above and sections 1-8. Nothing new is read from touch:
- **Star-loop recording (row 47): same gesture, two changes in what happens.**
  - It now stops by itself after 60 s. A thin white countdown arc on the red ring shows the time left; the arc is drawn only and cannot be touched.
  - A finished clip goes to the Android share sheet with just the file. Cancelling the sheet now does nothing (before, it fell through to a download).
  - A second star loop still stops the recording early, as before.
- Critters (fireflies, fish, bird flocks), meteor showers and auroras are visuals only. No hit-test reads them, so a tap or stroke on them acts on what is underneath.
- Parallax ridges, horizon haze, the dawn/dusk glow and terrain strata are background drawing only.
- Pairings #2 (rubato and drum variations), #3 (joint breath voice), #7 (cluster chord host) and #11 (onward seed carrying) are ohm behaviour only, shown with drawn link signs.
- A quake now only bobs ohms (a smaller kick). This changes no gesture.

## 10. v0.6 (vc12, Oct 22 2026): leftovers, pairings near home, cloud worlds. No new gestures
I checked this build against every row above and sections 1-9. Nothing new is read from touch:
- **Teach-by-demonstration was not added.** It would need a "watch me" gesture. Tap-hold already plays an ohm, and a drag already moves or throws one, so any demonstration gesture would clash with one of them. It stays open.
- Arrivals (bubbles carried here, seeds planted from orbit, the camera landing at any angle) only choose a clear, dry spot. Bubbles are still caught and released the same way.
- Void walkers and moon settlers leave and arrive off-screen only. Nothing is tapped or dragged to send them.
- Pairings #1, #5, #6, #12, #15 and #16 are ohm behaviour only. Their bond signs and dust specks are drawn only, and no hit-test reads them.
- **Cloud worlds (gas giants never visited before v0.6):** the same gestures apply. A drag picks up and throws an ohm as before. Ohms float inside the cloud, and a dropped or thrown ohm drifts back to its home height. Tapping the cloud deck acts like tapping open air. A giant visited before v0.6 keeps its solid ground.

## 11. v0.6.1 (vc13, Oct 22 2026): teach by demonstration with no new gesture; real caves. No new gestures
I checked this build against every row above and sections 1-10. Nothing new is read from touch.
- **Teach by demonstration: built on the existing tap-to-strike gesture, with no "watch me" gesture.**
  - How it works: tap a phrase of 4 or more notes on the world's instruments near an ohm. The ohm answers it (call and response, as before). Play the **same** phrase again as your next phrase, within about 4 bars, and that ohm adopts it as its motif. A short 'learned' glow shows on the ohm.
  - "The same phrase" means the same notes in the same order, with the rhythm matching to within a 16th note.
  - The motif can be undone with the undo tap (three fingers since v0.7), and it is inherited the way a play-mode motif is. Genes don't change.
  - **Conflict analysis:**
    - *Tap on an instrument (strike):* unchanged. Every strike sounds exactly as before. Teaching is a consequence of repeating a phrase, not a different touch.
    - *Call and response (3+ strikes in a bar):* unchanged. Both phrases are still answered. A 3-note call never teaches, because teaching needs 4 or more notes.
    - *Play mode teach (tap-hold on an ohm, play its nodes twice):* separate. Play-mode notes are not world strikes, so they don't feed this, and world strikes don't feed play mode.
    - *Tap on an ohm, tap-hold to listen, drag, grab and throw:* not involved. Only strikes on instruments count.
    - *Accidental teaching:* it needs the same 4+ note phrase twice in a row, near the same ohm. Undo covers a mistake.
    - The earlier blocker (section 10: a "watch me" gesture would clash with tap-hold or drag) no longer applies, because no watch gesture exists. Proximity and repetition are the signal.
- **Cave overhangs:** the roof is scenery. A tap or drag on it acts like a tap or drag on the ground: Sf.hit ignores it, so it can't be grabbed or struck. Ohms and thrown objects bump into it.
- Cloud-world additions: the aerial kits are ohm body parts, so they are touched like any ohm part. Cloud critters and the glowing floor haze are drawing only, and no hit-test reads them. Hanging cloud plants are touched the same way as plants on the ground.
- Regional bias, the storm fixes and the slot-reuse fix are behaviour only.
- Shipped as Resonance-v0.6.1.apk (vc13) with no new gestures. The gesture table in sections 1–10 still stands.

## 12. v0.6.2 (vc14, Oct 22 2026): quick spawn, clay by an end-of-spiral hold

- **Spiral** (unchanged recognition, `readStroke` unchanged): lifting right away hatches the ohm **at once** with a 0.45 s bloom.
- **Spiral + rest**: if the finger stays within ~8 screen px for **≥ 450 ms** at the end of the spiral before lifting (`App.endStill`, `Sf.CLAY_HOLD`), the spiral becomes the existing **clay window** (section 4, all its rules unchanged).
- Conflict check (against sections 0–11):
  - *Hold (450 ms) / listen / damp* and *tap-then-hold (play mode)*: the hold timer arms once per touch at 450 ms and fires only if the finger has moved < 10 px since the touch **started**. A spiral has moved far by then, so neither can fire at its end. Play mode still needs a **new** touch after a tap. No conflict.
  - *Ink shapes* (line/strum, wave, star, zigzag, loop catch, star-loop record, halo letters, teach line, vibrato while inspecting): the end rest is only read after the stroke has classified as a spiral (2+ turn spirals still win over a strum as in v0.4b). Every other stroke ignores it. No conflict.
  - *Grab/drag/throw* starts on a body (grab mode, not ink), so resting at the end of a drag is unchanged (incl. C5 fusion, which is drag-only).
  - *Clay rules 1–7* unchanged. A new spiral still hatches the current clay first, whether it hatches at once or rests into a new clay.
- Verdict: no conflict; the hold is kept.

## 13. v0.7 (vc15, Oct 23 2026): undo/redo remap, egg stroke grammar, conducting — gesture check (done BEFORE building)

New gestures checked against sections 0–12:

**C. Three-finger tap = undo, four-finger tap = redo (two-finger tap no longer undoes).**
- *Pinch / zoom / twist / DAW twist / cutoff twist / clay two-finger shaping*: all two-finger; a 2-finger tap is now inert, which removes old conflict **C14** (a hesitant pinch could undo). Better than before.
- *Old 3-finger redo* moves to 4 fingers. Small movement allowed (< 30 px, < 400 ms, F).
- *Clay rule 4* (2-finger tap undoes one shaping step) becomes a 3-finger tap: the clay `two.clay` path no longer needs a tap test. No conflict.
- Hooked-arrow undo glyph unchanged.

**A. Egg stroke grammar (1.5 s window after a plain spiral).**
- The egg only exists between a plain spiral and its hatch. A touch is routed to the egg ONLY if it STARTS within the egg's hit radius (moderate: about 44 screen px) during the window. Everything else behaves exactly as before.
- *Tap on the egg* vs *tap on empty space / ohm tap deferral / double tap / motes*: the egg is not an ohm or body, so a tap there used to land on 'air' (a ripple). Now it is a drum tap. The tap and double-tap that follow are swallowed (like clay taps). No conflict.
- *Hold on the egg* (450 ms): ignored; the egg can't be grabbed or held (spec). *Tap-then-hold* on the egg: swallowed, so play mode can't open on it.
- *Circle around the egg* vs *closed-loop catch / star-loop record*: the circle starts ON the egg, so it is egg-routed and never reaches `Sf.stroke` → it can't catch (spec). A loop that starts OFF the egg is a normal stroke (catch etc.) — the egg is never caught.
- *Wave through the egg* vs *water pour wave*: same rule — starts on the egg = egg word; starts elsewhere = water pour as before.
- *Flick out of the egg* vs *grab/throw*: the egg isn't a body, so grab can't start on it.
- *Strum / halo / teach / glyphs (infinity, undo hook)* starting on the egg: they become egg words or a nudge during the window. After the hatch (≤ ~1.5 s after the last egg stroke) all are as before.
- *Clay (end-of-spiral hold)*: unchanged; a held spiral makes clay, not an egg.
- *New spiral next to the egg*: hatches the old egg at once and slides it aside (F), like a new spiral hatches clay.
- *Three/four-finger undo during the window*: undo removes the egg (nothing hatched yet); after the hatch it removes the ohm.
- Verdict: no conflict. **Behaviour change to flag:** the plain spiral now hatches when the egg window closes (≈1.5 s after the spiral or the last egg stroke) instead of v0.6.2's 0.45 s quick spawn — required by spec A.

**B. Conducting: two fingers held still ~0.6 s on open ground raise the baton.**
- *Pinch / zoom / twist*: need movement (zoom moves the fingers apart; twist needs > 1.3 rad). The baton needs both fingers within ~12 px for 0.6 s, so a pinch can't raise it, and once raised the camera is frozen (restored to where it was at the touch).
- *Two-finger tap*: inert since C. *3/4-finger undo/redo*: need all fingers up within 400 ms; a baton is ≥ 600 ms, so no overlap.
- *Clay two-finger shaping*: fingers that start on the clay shape it; the baton is never raised there. *Pinching an ohm/body (register, DNA)*: a baton can't start on an ohm, body or the egg ("open ground").
- *One-finger strokes while the baton is up* (another finger, e.g. the other hand): conduct instead of drawing, so no ink shape (catch, pour, spiral...) can fire by accident. This is the one deliberate override, and only while the two fingers stay down.
- Release: lifting the two baton fingers, or ~6 s with no conducting stroke.
- *Interpretation to flag:* "lifting releases" is read literally: the baton stays up while the two fingers stay down, so conducting is a two-handed gesture on the phone (two fingers of one hand hold, one finger of the other conducts).
- Verdict: no conflict.
- *As built (01:01 MDT):* also never raised while inspecting an ohm (its 2-finger register/cutoff gestures), while pinching a body, recording, in the DAW or in play mode. While the baton is up, 3/4-finger taps can't undo/redo, and lifting a baton finger ends everything (no stray pinch-end). L hint: a faint ring fills between the resting fingers from ~0.15 s; once up, a ghost fingertip beats down-UP until the first stroke and then sweeps through the ohms once. Browser check pw_v07 B 7/7 (pinch still zooms; resting on an ohm raises nothing).

### v0.7 D / D2 / D3 / F1 / F2 / E: gesture check (02:01 MDT)
- *D/D2 (experience, hosted joins)*: no gesture at all; runs on its own. No conflict.
- *D3 (roam / hold)*: reads touches and the camera only; it adds no gesture. Zoomed out with no touches for a while = ROAM. A tap that doesn't move the camera counts as directing (HOLD); a pan or a zoom never does, so looking around doesn't pin the ohms. No conflict.
- *F1 (egg tap preview)*: the same egg taps as before; each one now also plays a sound. No conflict.
- *F2 (touch beside the egg)*: a touch landing 1-2.2x the egg's hit radius away (not on it) slides the egg aside. A touch on the egg is still a tap (F1), and a touch farther out is ordinary ground, so the ranges don't overlap. Least intrusive reading: it only applies while an egg is open. Verdict: no conflict.
- *E (watched jams grow)*: "watching" = keeping the jam centred on screen (the same J.watched test as before). No new gesture. No conflict.

### v0.7 G / inheritance / L for older features: gesture check (02:27 MDT)
- *G (traditions, fusion)*: musical only, with no gesture. The L ripple is a visual with no input. No conflict.
- *Inheritance (Wilbow 2:19)*: happens at hatch. No gesture. No conflict.
- *L for older features*: ghost fingertips only show gestures that are already in this table: tap a jam member, conduct, drop on an instrument, fuse, pinch-squeeze, hold-listen, double-tap the fossil, monolith taps, and twist. They take no input and draw over nothing interactive. No new gesture and no conflict.
- *Correction*: the "Other closed shapes -> effect item" row was out of date. Drawing effect items has been off since v0.4b (closed shapes make a material blob). Row fixed above.

### v0.7 K walk in an ohm's shoes: gesture check (02:34 MDT)
- *Entry*: unchanged (tap-then-hold an ohm). No conflict.
- *Stick (left half, empty screen, play mode only)*: conflicts checked against the play-mode table. Nodes, handles, tubes, envelope nodes and the ohm's own body all win, because the stick is only claimed where `Pm.hit` / `EnvEdit.hit` find nothing and > 1.25R from the body. **Flag (least intrusive resolution):** the fast swipe-away exit used to work from anywhere; it is now unavailable only when it *starts* on empty left-half screen (that touch is the stick). It still works from the right half, the ohm and nodes; pinch-in and Android back always exit. Outside play mode nothing changes (drawing, flicks etc. on the left side are untouched).
- *Flick up = jump*: only on the stick pointer, so it can't be confused with the exit swipe (a different pointer) or with node play.
- *Two hands*: the stick pointer is not in the recogniser's pointer map, so stick + node play on the right never reads as a two-finger pinch / twist / baton. A second finger alone still pinches out as before.
- *Android back*: **flag**: in play mode, back now leaves play mode instead of going to the system view (least intrusive: one more back press reaches the system view as before).
- *Guide*: the guide's text-free tap-then-hold ghost (once) and the ghost thumb (first 3 entries) take no input. No conflict.
- One ohm is driven at a time; the side-on view is the existing camera.

### v0.8a2 (vc17, chunk 2): two-stroke glyphs (V08_SPEC O6) — gesture check (05:14 MDT)
| Gesture | Before | Now | Conflicts checked | Verdict |
|---|---|---|---|---|
| Hook + `<` / `>` = undo; hook + point = '?' (calls the guide); lone hook = rod after 1.2 s | One-stroke hooked arrow = undo (C9 stricter on the ground) | Two strokes (Wilbow 2:55 AM; Q99-Q105 defaults; lone hook = rod, 3:12 / Q103) | *Catch loop / record star*: closed, never held. *Spiral / clay*: > 1.25 turns, never held. *Flick*: small / short / fast hooks are not held. *Strum* (crosses ohms), *halo* / *ohm* / *bubble* starts, *egg* strokes and egg lessons, *baton*, *play mode*, *walk*, *DAW*: never held. *Infinity*: still one stroke. *3-finger undo / 4-finger redo*: unchanged; either one cancels a waiting hook. *Material*: a hook-shaped rod now appears 1.2 s late (the trade-off Wilbow chose); any other stroke during the wait routes at once. *Tap during the wait*: under the hook = '?', elsewhere a normal tap (the hook fades). *Space*: a '?' pan + a tap on empty space is consumed (no double-tap fly-home); a tap on a star / system / body is normal. | No conflict beyond the accepted 1.2 s rod delay |
| Undo lesson / '?' hint (guide ghosts, no text) | The guide traced the one-stroke hook | It traces the hook, then the arrowhead; a ghost '?' + its point shows at most 3 times (last old-gesture hint) | Ghosts take no input. **Flag:** the 3-finger tap still completes the undo lesson (v0.7 behaviour kept) | No conflict |

## 14. v0.8a3 (vc18, chunk 3 A+B, Oct 23 2026): effect items by a rested closed shape; water carrying — gesture check
| Gesture | Before | Now | Conflicts checked | Verdict |
|---|---|---|---|---|
| Closed shape + end rest (≥ CLAY_HOLD, the existing end-hold ring) = effect item | Closed shape = blob (rest ignored) | Rested = player effect item (warm ring, chime); lifted = blob; cap 4 (5th = blob + grey 'full' ring) | *Catch loop* (around an ohm) and *record star*: routed first, rest ignored, unchanged. *Spiral + rest* = clay: the spiral test runs first, unchanged. *Registered glyph + rest* (infinity): the glyph offer runs first, unchanged. *Hook* (two-stroke glyphs): open shapes, unaffected. *Strum*, *halo / ohm / bubble / egg starts*, *baton*, *play mode*, *walk*, *DAW*: never reach the closed-shape path. *Material*: lifted closed shapes still blob; open strokes still rods. *3-finger undo / 4-finger redo*: take back / restore the item. **Flag:** a player who naturally pauses at the end of a closed doodle (≥ ~0.5 s) will make an item instead of a blob. | No conflict; accidental-rest risk flagged |
| Water carrying (dew trips move real water) | Droplet visual only | Same trip; it takes water from the pool and pours a puddle at home; off screen a once-a-minute per-area tally | No touch input read. Grabbing a carrier (existing grab) spills its droplet where it is. Puddles ripple on taps like any pool (existing). | No new gesture |
| Guide hint 'loopRest' (ghost loop + warm ring + glow) | – | Old-gesture hint after 3 blobs, until the first item | Ghosts take no input | No conflict |

## 15. v0.8a4 (vc19, chunk 3 C+D, Oct 23 2026): light regional keys; jam-tuned strings — gesture check
| Gesture | Before | Now | Conflicts checked | Verdict |
|---|---|---|---|---|
| C: regional keys | – | Settled jams teach their area a key (tonic blends; the scale changes only after two jams agree). Wind rocks, reeds and farm drones near an ohm that is not in a jam use it; about 1 in 5 new births there (spiral, clay, egg, wild) start in it. Existing ohms are never retuned | No touch input read | No new gesture |
| Tap / strum a tied string | Strikes it in the session key | Same strike, but in the jam's key, a distinct note per string, in the strings' physical order; the string glows in the jam colour (chord tones pulse, recent notes brighten); the jam hears it (weight .8) and may nudge its next section (15 %, at most once per 4 bars) | *Tap jam member = mute* and *tap near jam = join*: hit-test hits the ohm first, unchanged. *Strum* (drag across strings): the same strike path, unchanged. *Monolith / fossil / bubble* taps: checked first, unchanged. *Duel/answer*: the player phrase is now read in the lead's jam key. | No conflict |
| Pinch a tied string | Tension = pitch, snapped to the session key | Tension still = pitch; the string re-snaps to the nearest free jam note when its raw pitch moves > 25 cents | *Pinch empty world = zoom*, *pinch ohm = register/DNA*: different start targets, unchanged | No conflict |
| Grid pop (spread > 1.65) | Free pitch | Free pitch = **untied** (ignores the jam) | Same gesture | No conflict |
| Guide hint 'tieStr' | – | A tap dot on an on-screen tied string, until the player first plays one | Ghosts take no input | No conflict |
- *Flag (Q48):* pinch on a tied string now steps through the jam's notes instead of the session scale, and the grid pop now also unties it. Same gestures with a meaning added (behaviour change).
- *Note:* the nudge shows through the lead's existing cues (swell / drop / nod). No separate "member nods at the player" sign was added.
- *Flag:* a tied string that is ringing when the key changes re-sounds softly at its new note (the voice engine has no pitch glide).


## v0.8a5 (chunk 3c, V08_SPEC P part 1) gesture check

- **New:** drag a rod end, drag a blob rim, and chaining a stroke onto an end from 16–24 px. Checked against every row above.
- **Conflicts resolved:** (1) Grab/throw/orbit of an object: only from the middle now when the touch is in an end handle (an end grab used to throw; now it never throws, flies to orbit or deletes). (2) A stroke from beside an end: unchanged meaning (chain), wider catch. (3) Tap / hold / double tap / pinch / strum on a drawn shape: unchanged; they now also sound its own seeded voice on top of the modal ring (on screen, pool permitting).
- **Not affected:** ohms (grab, adopt, fuse), bubbles, clay hold on closed shapes, symbols, play mode (end/rim drags are off in play mode and while a baton is held). Old saved shapes (no drawn flag) keep the old behaviour.

## v0.8a6 (chunk 3c, V08_SPEC P part 2) gesture check

- **New player gestures:** none. P5 to P7 are ohm behaviour (ohms play drawn shapes, ensembles, jam pull). I re-checked every row above against them.
- **Strike / tap a drawn shape near a jam:** same gesture as before. The only addition is that a steady rhythm from you now leans a nearby on-screen jam toward your tempo (at most a 25% pull, 8% per bar, 450 px reach). Tapping in time with the jam still counts as playing with it (D9).
- **Draw 3 parallel bars, 3 strings in a frame, 3 blobs or a 300 px rod:** same stroke gesture. Recognising an ensemble adds a glow and one soft rising sweep, and retunes the members (row: adjacent scale steps; harp: chord tones; drone: tonic or fifth). This is a meaning added to an existing gesture, not a new gesture.
- **Baton:** while the baton is up, shapes have no pull on the jam, and the pull resumes 2 bars after it is lowered. Conducting is unchanged.
- **Blob rim (fix from v0.8a5):** the rim handle never reaches the inner 60% of a blob, so a centre grab on a small blob is still the old grab, throw or orbit. Only shapes drawn since v0.8a5 have handles.
- *Flag:* ohms that play a shape do so in the **shape's** voice (Wilbow 3:38/3:41). Their own instrument is never changed, and nothing is voice-locked.

## v0.8a7 (chunk 3d, V08_SPEC Q "room in the jam") gesture check

- **New player gestures:** none (Q.8). Q only changes which notes jam members play, when they play them and in which octave. I re-checked every row above: tap, strum, pinch, hold, baton, catch, teach, drag, drop-adopt, DAW holds and pinches, and P's rod/rim/chain drags all keep their meaning.
- **Strike strings / play a drawn shape near a jam:** same gesture. Your notes now count as a guest voice in the jam's map, so on-screen ohms leave room in that octave and those beats (they never push you, and your shape is never changed).
- **Baton:** wins over Q. While it is up, conducted ohms make no room-moves and a cued ohm is never thinned; moves resume the bar after it is lowered.
- **Mute / DAW mix:** a muted ohm counts as empty; mix settings win over Q.
- *Flag:* Q never touches an instrument (Wilbow 3:38/3:41): no timbre swap, no voice lock, no RS.Voice.freeze. Only notes, timing and register move.

## v0.8a9 (inspect-zoom controls always on screen) gesture check

- **New player gestures:** none. The inspect controls are the same as before: drag the A, D, S and R nodes, drag the bend handles, drag the filter node, twist for cutoff, pinch for register, and rub for vibrato. They have new placement and new feedback only. I re-checked every row above, plus C13 and C15.
- **Placement:** the ring is now laid out in screen pixels inside a safe band. The band is the viewport minus 28 px at the sides (Android back-gesture insets), 30 px at the top and 58 px at the bottom (gesture bar and thumb reach). How it fits:
  - The bands tighten first.
  - On a big ohm, the ring then tucks in over the body.
  - As a last resort, it all scales down.

  Every handle and its 44 px touch circle stays on screen (v08s_view: 2,880 cases; pw_inspect at 360x640, 412x915 and 915x412).
- **Camera:** while inspecting with **no finger down**, the camera eases the ohm to the band's centre. It never moves under a finger, so panning, pinch zoom and grabs are unaffected.
- **Pick:**
  - An ohm too near an edge to fit its controls is not inspected until it comes in.
  - Once inspected, an ohm stays inspected while it is within 170 px of the middle (hysteresis, so the halo doesn't flicker between neighbours).
  - The zoom range is still 1.8–4.2.
- **Touch targets:** the hit radius went from 20 to 22 px (44 px targets). *Flag:* handle hits are tested before every other surface gesture (as before). On a big ohm, the ring now sits over the body, so a touch within 22 px of a node edits that node instead of grabbing or inking the body there. A touch anywhere else on the body behaves as before.
- **C13 (twist vs pinch, approved):** thresholds unchanged (zoom freezes at |dAng| > .4; cutoff needs |dAng| > .35 with ratio .9–1.12). New: a brightness halo plus a value arc while twisting, and a preview note at most every 0.32 s.
- **C15 (accidental DNA, not approved):** thresholds unchanged (register spread 1.18–1.75, DNA > 1.8). New feedback only:
  - During a pinch on the inspected ohm, the 5-step register ladder (in the ring's gap) lights the step the pinch would take and plays a one-time pitch preview of it.
  - Past 1.8, the ladder dims and the body gets a green-cyan rim, so you can see that letting go opens DNA and back off.
- **Feedback (no text):**
  - The touched handle glows and shows its value as an arc (time) plus a fill line (level or amount).
  - The envelope curve updates live as you drag.
  - Vibrato shows as a wobble on the body rim and on the curve.
  - A preview note plays at most every 0.26 s while dragging.
  - Ghost-finger hints (drag a node, twist, pinch) show for the first 3 inspect entries, about 7 s each, and only while nothing is touched. Ghosts take no input.

## v0.8b1 (V08_SPEC R: ink, retrace, soft clay) gesture check
Every change below was checked against the gesture table above. Recognisers run in the same order as before; only the **fallback** (a stroke nothing recognises) changed, plus two new touches.
- **R1 ink (fallback changed):** a plain unrecognised stroke no longer makes material. It leaves warm glowing ink that fades in about 2 s and leaves nothing.
  - Recognised strokes are unchanged and come first: held hook / glyph second strokes, early glyphs, teach, write, strum, record loop, catch loop, spiral (clay, egg, ohm), wave, star, zigzag.
  - *Flag:* a lone hook used to become a rod after the glyph window (Q103). Now it becomes ink for one more window and then fades, unless you retrace it (supersedes Q103).
- **R2 retrace (new):** draw over the ink again, in either direction, and it becomes a piece in exactly the drawn shape. The match needs a mean distance under ~18 screen px (scaled with zoom) and coverage over 70% of the ink.
  - Open strokes become a rod, string or bar (V08 P: handles, length = pitch, random voice). Closed loops become a soft, squishy blob that keeps its outline.
  - The retrace check runs **first**, before the held-hook second stroke. A retrace is never a "?" point or an undo arrow, because those are short marks that can't cover 70% of a hook.
  - *Conflict check:* a loop around an ohm still catches, both the first time and when retraced (catch keeps priority).
  - *Conflict check:* strumming over existing bodies is unchanged, because the ink itself isn't a body.
  - *Conflict check:* two similar strokes drawn on purpose (e.g. two strings side by side) are more than 18 px apart, so they stay separate inks. Draw them further apart than a finger's width.
  - Hint: for the first 4 inks, the ink pulses while it can be retraced (no text).
- **R3 windows:** 1.2 s after an open stroke, 2.5 s after a closed loop. A hook gets the glyph window (1.2 s) and then the ink window (1.2 s).
- **R4 pieces:** the "closed shape + rest = effect item" gesture is **retired** (the warm ring on a rested loop and its guide hint are gone; a rested loop is ink like any other).
  - Retraced pieces are carried by ohms, at most 6 at a time. A carried piece modulates the carrier's own sound and never replaces it.
  - No new player gesture.
  - Undo removes the piece; redo brings it back.
- **R5 clay (no gesture changes):** the lump is a real soft body now. Every section 4 clay gesture is the same, with the same thresholds and the same genome edits:
  - edge push / pull; strand = limb; pinch; twist; scribble; taps = rhythm; three-finger undo; hatch on ring, tap-away, new spiral or background.
  - What's new is only the physical response. The rim follows your finger while you drag and springs back. A tap squashes it. A pinch overshoots and settles.
- **R5 blobs (one new touch):** a **scribble inside a drawn blob** (4+ direction reversals, at least 80% of the stroke within 1.3 × the blob's radius) roughens it.
  - You'll see a rough rim. It sounds grittier and shorter. Undo reverts it.
  - *Conflict check vs strum:* a strum is a line *across* the blob (mostly outside it, few reversals), so it stays a strum.
  - *Conflict check vs clay scribble:* the clay isn't a body (it's checked first, from touch-down), so there's no overlap.
  - The blob's sound follows its current shape: stretched = brighter and more nasal, lumpy or rough = grittier and shorter.
  - Rim drag (push / pull) and pinch are unchanged.
- **Not added (R7, being brainstormed):** no new clay timbre controls, section or role choices, or clay gestures.

## v0.8b2 (V08_SPEC R7: clay timbre stage) gesture check
Every new clay touch was checked against the table above, section 4 (clay rules 1-7) and the v0.8b1 check. All of them start on the
clay (rule 1) except the outside point-pinch, which starts just outside its edge and only while clay exists.
- **First touch picks a way of playing (no new gesture):** the first tap / flick / rub / press-drag / squeeze on fresh clay also
  picks the excitation family. Same gestures and genome edits as section 4; a later touch never changes the family; twist still steps voices.
- **New: still hold inside the clay > 0.5 s = fire** (soft -> ceramic -> metal while held). *Conflict check vs listen hold (450 ms):*
  the listen hold and tap-then-hold already ignore the clay (rule 3), so a hold on the clay was free. Any move > 8 px cancels the fire.
  *Flag:* press-drag (blown) is still 0.2-0.5 s then moving, right under the fire time.
- **New: two-finger tap on the clay (< 250 ms, < 30 px)** = freeze the ring; a second one = confirm and hatch.
  *Conflict check vs the multi-finger tap row:* the 3-finger undo / 4-finger redo are unchanged; a two-finger tap elsewhere still
  only shows the hint (the hint is skipped when the two fingers started on the clay). Frozen clay ignores tap-away; spiral,
  background and save still hatch it (rule 6 and 7 hold).
- **New: two fingers on the rim moving out together past 1.6 R = split off a section lump** (cap 5). *Conflict check vs pinch and
  twist:* the clay pinch starts across the middle; a split starts on the rim band with a close finger pair and a ratio near 1; a
  twist (|dAng| > 1.3) still wins. Lumps stay on the ohm; 3-finger undo takes one back.
- **New: two fingers just outside the edge closing or pulling out = a point.** *Conflict check vs world pinch zoom:* only while the
  clay exists, both fingers start outside 1.05 R, less than 1.4 R apart, midpoint within 2.4 R; otherwise zoom as before. *Flag:* a split started slightly outside reads as a point.
- **Changed meanings of existing touches:** a slow thick pull from the edge = tail (sustain) instead of a limb (Q169 open; quick pulls are
  still limbs); a push in from the rim leaves a dent (body resonance); a small held wiggle = vibrato (not a scribble).
- **Not affected:** play mode, DAW, DNA, catch, teach, ink / retrace (they ignore the clay); hatched ohms are touched exactly as before.

## v0.8a10 (hidden dev panel) gesture check
- **New: three fingers held still for 2.0 s = open / close the dev panel** (`app.js` pointerdown at `P.size === 3` -> `RS.Dev.holdStart`; cancelled by any finger moving >= 30 px, by a 4th finger, or by lifting before 2.0 s; a ring fills at the fingers' centre while they rest; a short vibration when it toggles).
  - vs **3-finger tap = undo** (< 400 ms, < 30 px): no conflict. The tap lifts long before 2.0 s, so the hold is cancelled and undo runs as before; a completed hold marks the lift consumed (`multi.dev`), and its 2 s duration already fails the 400 ms tap test.
  - vs **4-finger tap = redo**: a 4th finger cancels the hold; redo unchanged.
  - vs **baton** (two fingers still 0.6 s, then a third finger conducts): the hold needs all three fingers down within 350 ms of the first. If two fingers rest long enough to raise the baton, the third finger conducts as before (the baton path returns before the hold code). While three fingers rest, `batonOk` already refuses (`P.size !== 2`).
  - vs **clay** (fingers that start on the clay twist / pinch it): three still fingers do not twist or pinch; the hold works over clay too. The clay 3-finger undo is the tap, unchanged.
  - vs **pinch zoom / twist** (two fingers): still fingers make no zoom; any real pinch / twist moves a finger > 30 px and cancels the hold.
  - vs **inspect pinch / register ladder**: same as pinch (movement cancels the hold).
  - Every level (surface, system, galaxy, DNA, DAW, play mode): the recogniser is level-independent. In play mode the walking-stick finger is kept out of the recogniser, so three other fingers still work.
- **While the panel is open: a one-finger tap identifies** (`RS.Dev.identify`). The level's `down` is deferred for that finger: a tap (< 10 px, < 300 ms) never reaches the game (no play / join / mute / pop / listen, no double tap); a drag past 10 px or a 450 ms hold replays the deferred `down` and continues normally (strokes, grabs, pans, play mode still work).
- The panel itself is DOM text (top-left, at most 46 % wide / 52 % tall); touches on it scroll it and never reach the canvas. The lower and right parts of the screen stay free for the closing hold.
- Never hinted by the guide; no ghost.

## v0.8b3 (clay look, start shapes, hit strength) gesture check
- **No new gesture.** Every touch from the v0.8b1 / v0.8b2 sections keeps its meaning; checked against the table, section 4 (clay rules 1-7) and the v0.8b2 check.
- **Changed feedback only:** a tap or poke inside the clay now leaves a finger print that stays (max 8, a dent mark only past half the radius, so a tap in the middle never changes the voice). vs **first touch picks the family** and **fire hold**: the print is added after the stage reads the touch, so the family / fire logic is unchanged (v08u U-checks pass).
- **Start shape:** the clay is born already shaped (lobes, points, dents). The rim-band tests (split, outside point-pinch, push-in dent) use the clay radius and the live outline, so they follow the new shape; the outside pinch still needs both fingers outside 1.05 R of the centre. *Flag:* on a long lobe the "outside" band is further out than the visible edge on the short sides.
- **Pressure (Q173):** on phones that report real pressure, a harder press = a stronger hit on an ohm or in play mode (blended 50/50 with speed there). Mouse and phones that report a constant 0 / .5 / 1 use tap / swipe speed exactly as before. No timing changes, so no conflicts with holds, double taps or the dev hold.
- **Hatched ohm:** looks like the clay you made; grabbing, tapping, catching and the walking stick use the same body (one segment), so nothing new to learn.

## v0.8b4 (vc29, Oct 23 2026): play / listen swap and moving ohms — gesture check (done before the tests)
Wilbow, 3:32 PM MDT: "hold = play, tap-then-hold = listen" and a way to move ohms (call, tap tempo, group select, home).

**New / changed touches**
- **Plain HOLD on an ohm = PLAY mode.** A 'hands' ring shows from ~200 ms; play mode opens at 450 ms (the old hold timer). The ohm tap is still deferred 300 ms, so no chirp / join / mute fires first (C2 unchanged).
- **TAP-THEN-HOLD on the same ohm = LISTEN.** An 'ear' ring fills for ~1.2 s, then the microphone listen starts (`App.earCommit` -> `Sf.hold(on)`). During the ring: slide **up** > 30 px = play mode instead (`lastEar 'up-play'`); slide sideways / down > 10 px = cancel (`'slide'`); lift early = nothing at all (`'lift'`: no chirp, join, mute, grab). The longer ring is what keeps a hesitant tap-tap-hold from opening the mic by accident.
- **CALL: double tap on bare ground** (no body, no ohm, zoom >= .35, not in play mode) = the selected group, or else the last ohm you touched (within ~60 s, if it is still around), walks there (sunflower spread, walk help ~55 px/s, the jam lets go). The call lasts 30 s, then they wander as before.
- **TAP TEMPO: 3+ more taps within 50 px of a fresh call spot** (gaps < 2.5 s) set the called ohms' tempo (folded into 60–180 bpm, `Conduct.setTempo` + their own bpm).
- **GROUP SELECT: a closed loop around 2+ ohms**, or a loop around 1 ohm whose end **rests** (>= the clay hold), selects them (soft rings). Drag any member = the group moves with it. An empty-ground tap (340 ms later, so a double tap can still call) or 20 s clears it.
- **HOME: after a drag, keep the finger still 1 s** = home there (for the whole group when dragging a member), or **hold the called spot** after a call = home there for the called ohms. A soft marker shows for ~2.4 s. Ohms wander and jam as before but drift home; more than 150 px away they leave a jam / partner and walk back (hysteresis to 60 px). Off-screen: the same steer code at the existing LOD rate, no new per-frame work (idle `Herd.tick` ~0.15 µs). Home is saved with the ohm; the off-screen pairing home shift (`Pairs.shiftHome`) never moves a player-set home.

**Checked against every row above**
| Existing gesture | Result |
|---|---|
| C2 tap deferral / C3 double tap on an ohm | Unchanged: a double tap on an ohm still does nothing; the call needs bare ground. |
| C4 (old: hold = listen) | **Retired by request**: a plain hold is now play. *Flag:* players used to hold-to-listen will open play mode. |
| Damp hold on other bodies, clay fire hold, egg holds, end-of-spiral clay hold | Unchanged: the ohm check runs only when the finger starts on an ohm; the clay / egg paths run first. |
| Catch loop (one ohm) | Unchanged for a quick loop around one ohm. **Changed:** a loop around 2+ ohms now selects instead of catching one (headless W1/W2). |
| Record-star loop | Keeps priority over select and catch (W4). |
| Retrace (R3) | A retraced loop never selects (`opt.retraced`). |
| Rested closed shape (R4) | Retired earlier; the rest after a loop around one ohm is now select (v08_check A5 updated: it used to stay a catch). No clash with the clay spiral + rest: a spiral is classified first and needs no ohm inside. |
| Ground taps (ripple, `Social.groundTap` rhythm cells) | **Conflict, accepted:** taps within 50 px of a call spot during the next ~30 s are tempo taps (no ripple, no rhythm cell), and a double tap there doesn't re-call. Elsewhere unchanged. |
| Double tap on a body (clear / dense glass, events) | Unchanged: the call needs no body under the finger. |
| Hold on a called spot | **Conflict, accepted:** within 60 px of a fresh call spot, a hold sets home and beats an ohm's play / listen (the ohms are standing on the spot). |
| Grab / throw | A plain grab is unchanged. A member of a selection drags its group. **Flag:** two selected ohms dragged together can press-fuse if the dragged one is pushed into the other; the drop-still home is skipped while fusing. |
| Jam | **Behaviour change:** a called jam member leaves the jam to come. |
| Walking stick / play mode | Play mode ignores call, tempo and select (all gated on `!App.play`). |
| Dev panel (3-finger hold) / 3-finger undo / 4-finger redo | Multi-finger clears the ear ring and the hold ring; unchanged. |
| Guide ghosts | The 'listen' ghost now shows tap-then-hold; the 'walk / play' ghost shows a plain hold. |

Tests: `tests/v08w_check.js` (headless, 21 checks), `tests/pw_tap.js` (C2, C4, C4b, C4c, H1, H2).

**Fixes after the first b4 suite (Oct 24 2026), checked against the rows above**
- **Ear ring timing (pw_tap C4c).** The ear ring shows from touch-down, but its rules (slide up = play, slide sideways / down = cancel, small moves swallowed) only started at the 450 ms hold timer, so sliding up early on the visible ring grabbed and dragged the ohm instead of playing. Now the ear rules start after a **150 ms rest** (`App.EAR_REST`); the listen still commits at ~1.2 s. Before 150 ms a tap-then-flick is still a normal grab / throw (no change for quick throws). Hold on the called spot still wins at 450 ms (it clears the ear). *Flag for Wilbow:* a tap followed within 420 ms by a slow (> 150 ms rest) upward drag of an ohm now opens play mode instead of dragging it; a sideways or downward drag still drags.
- **Tempo taps on a called ohm (pw_tap H2 path).** The first called ohm walks to the exact call spot, so tempo taps there landed on it and muted / chirped it instead of setting the tempo. Now a tap within 50 px of a fresh call spot is a tempo tap **also when it lands on one of the called ohms** (matches the accepted row "taps within 50 px of a call spot during the next ~30 s are tempo taps"). Taps on any other ohm, or on a called ohm away from the spot, are unchanged (deferred join / mute / chirp).
- No other gesture changed. The clay colour fix (B10) is visual only.

## v0.8 micfix (branch v08-micfix, Oct 23 2026)
- No new gesture. Hold-to-listen on an ohm (row 34) keeps its trigger (450 ms, < 10 px) and cancel rules; only what you hear changes: an intended dip while listening, sound back within ~0.5 s of release (soft fade-in), and a touch anywhere revives stopped sound. No conflicts changed.

## v0.8b5 (vc30, Oct 23 2026): item take / knock, group split, item close-up — gesture check (done before the tests)
New gestures: **G1** drag a carried item away = take it; **G2** flick a carried item = knock it off (it lands 40–120 px away); **G6** (revised per Wilbow 4:54 / 4:55 PM) two fingers that start on two different ohms FUSED together (one colony) and spread QUICKLY and WIDELY (separation grows >= 120 px within 350 ms; `IE.SPREAD_PX` / `IE.SPREAD_MS`) = unfuse: the colony links crossing the spread axis break, and the two sides won't re-fuse with each other for 4 min (`Colony.REFUSE` 240 s game time; in memory only), then fuse normally. Jams, style clusters and herds are never split by G6. The existing 'drag a fused member far = separate' stays. Item close-up controls (44 px targets, ring of sectors around a zoomed-in item) open on their own when you zoom in on one item.

| Existing gesture | b5 outcome |
|---|---|
| Grab / drag an ohm | **Conflict, resolved by radius:** a finger that starts inside a carried item's radius (max(r, 6/zoom) px) moves the item, not the ohm (`App.ohmAt` returns null there). Outside the radius, a drag is an ohm drag as before. |
| Throw (fast release of a grabbed ohm) | No clash: G2 is decided only in the item-pending mode (≥ 24 px, ≥ 650 px/s within 260 ms). A slower drag becomes G1 take, which turns into a normal grab of the item. |
| Bubble flick (900 px/s) / orbit swipe | No clash: those start on a bubble or bare ground; G2 starts only on a carried item. |
| C6 hold-to-fuse / hands hold (play) / tap-then-hold (listen) | **Conflict, resolved by radius:** a hold or tap on the item itself is consumed by the item modes (a tap does nothing; a hold does nothing). Play / listen need a finger on the ohm's body outside the item. |
| Pinch zoom / spread zoom | **No freeze:** a G6 candidate (two fingers starting on two different fused ohms, neither inspected) still zooms / squeezes normally from the first frame. Only if the spread is quick and wide (>= 120 px in <= 350 ms) does it unfuse; the camera is put back where it was at the start and the squeeze is ended at ratio 1. A twist (> 0.4 rad), a slow spread or a small one stays the normal gesture. Everywhere else pinch / spread is unchanged. |
| Squeeze (two fingers on one ohm) / DNA spread | Unchanged on a single ohm, and unchanged on fused ohms for slow / small moves. **Flag:** a fast, wide DNA spread (> 1.8) that starts on two fused ohms unfuses them instead (DNA view needs a slower spread there). |
| Inspect zoom / EnvEdit ring | Item close-up and the EnvEdit ring are exclusive: the inspected ohm wins; item close-up opens only when no ohm is inspected. |
| Jam / call (T2) / existing avoids | Not touched: G6 no longer splits jams, so no new jam avoid. Existing permanent avoids stay as they are. |
| Group select drag (T3) / press-fuse / drag-far separate | Herds unchanged. Press-fuse (hold a grabbed ohm squished into another 0.5 s) skips a pair that was unfused in the last 4 min (no 'merging' build-up). Dragging a fused member far still separates it, as before. |
| Multi-finger (3-finger undo / dev hold / 4-finger redo) | Unchanged: the 3rd finger cancels any item mode (`itemAct` cleared). |

## v0.8 songsave (branch v08-songsave, Oct 23 2026): leaving and coming back
| Gesture / event | Where | Result |
|---|---|---|
| **Switch to another app, then come back** | anywhere | The song carries on **as if paused**: same jams, parts, section and bar grid. Nothing jumps or bursts on return. |
| **Close the app (or the OS kills it), then launch again** | anywhere | **Launch now resumes** the world you left, with the same song, song time, camera and effect items. It is no longer a fresh random world (v0.7 I). If the last save was cut short, the world reopens from its plain save. |
| Launch with `?fresh=1` / `?fixed=1` (tests) | URL | Fresh random start (v0.7 I) / the fixed ark start, never a resume. |

## v0.8b6 (vc31, Oct 23 2026): styles, traditions, culture blend, teacher aura, jam learning — gesture check
No new gesture and no changed gesture. The aura is drawn behind the bodies and takes no touches (hit tests are unchanged: `App.ohmAt` still uses the body radius, not the aura radius); gifted motes and lineage ghosts are look-only. Checked against every row above: tap, hold (play), tap-then-hold (listen), grab / throw, call, tempo, select loop, home, fuse, items G1 / G2 / G6, pinch / spread, inspect, multi-finger: all unchanged.
## v0.8 micfix (branch v08-micfix, Oct 23 2026)
- No new gesture. Hold-to-listen on an ohm (row 34) keeps its trigger (450 ms, < 10 px) and cancel rules; only what you hear changes: an intended dip while listening, sound back within ~0.5 s of release (soft fade-in), and a touch anywhere revives stopped sound. No conflicts changed.

## v08-voice gesture check (branch v08-voice, Oct 24 2026), done BEFORE building
Wilbow, 8:13 AM MDT: the big mouth view (1), live tongue (2), consonants (3), pitch arc (4) and teach by singing (6). Option 5, the vowel pad, was not picked and is not built.

**New touches**
- **Open: DOUBLE TAP THE THROAT TUBE in play mode** (vocal ohms only, where the tube is drawn). A large, soft cross-section of the ohm's mouth glows over the ohm, with a pitch arc curving down its left side.
- **Inside the mouth** (screen-space panel; these pointers are kept out of the gesture recogniser, like the walking stick):
  - **Tongue / cavity: touch and drag.** Left/right = tongue back/front, up/down = tongue high/low. Lip rounding follows the nearest vowels, so the back-high corner gives a rounded /u/. It sings while you touch.
  - **Roof of the mouth: tap** = a stop at that place: back = k, middle = t. **Rub** (move > 8 px while down) = a fricative at that place: front = s, further back = sh. It is voiceless while rubbing.
  - **Lips: tap** = p. **Hold them closed while voiced** = m (the velum opens).
  - **Pitch arc: a second finger** slides along it to set the pitch, snapped to the ohm's scale in the world key (the same `Mind.hz` as the play-mode nodes). The voice sounds while the arc finger is down. If no arc finger has touched since the tongue finger landed, it sounds while the tongue finger is down, at the ohm's current note. Lifting the voicing finger stops the voice.
  - **Teach by singing:** sing the same 4–8 note phrase twice. The ohm adopts it through the same "phrase twice" path as the nodes (the `learned` glow, `undoPush 'motif'`). Its syllables are kept with it and sung in jams.
  - **Three-finger tap = undo, four-finger tap = redo** (the v0.7 C rule, counted by the mouth itself).
- **Close:** tap outside the mouth and the arc, Android back (it closes the mouth first, then a second back leaves play mode), or any existing play-mode exit (pinch-in can't start inside the view, see below).

**Checked against every existing gesture**
| Existing gesture | Result |
|---|---|
| Double tap a body = clear/dense (`Sf.doubleTap`) | **Changed only on the tube in play mode.** A play-mode double tap that hits the tube opens the mouth and does nothing else. Elsewhere in play mode and outside play mode it is unchanged. Before, in play mode, a double tap on the tube over a body toggled that body's clear/dense by accident. |
| Double tap on an ohm = nothing (C3, `'ohmDouble'`) | Unchanged off the tube. The tube check runs first, only in play mode, only when `Play.hit` says `tract`. The pending ohm tap is cancelled the same way. |
| Double tap on bare ground = CALL (v0.8b4) | Unchanged: the call is already gated on `!App.play`, and the tube isn't bare ground. |
| Double tap in space = fly home; system/galaxy double taps | Unchanged (other levels; the mouth only exists on the surface in play mode). |
| DAW double tap a lane (solo) | Unchanged (DAW level). |
| Single tap / drag on the tube (tract edits, `Pm.tract`) | **Conflict, accepted:** the first tap of the double tap still lands as a tube tap. A tap without movement makes no tract edit, but `Pm.up` plays the usual short preview note and adds that degree to the play-mode phrase. Both taps do, so a double tap gives two soft notes, and then the mouth opens. No edit is made, so there is nothing to undo. |
| Hold (450 ms) = play mode; tap-then-hold = listen (v0.8b4) | Unchanged: `ohmAt` is null in play mode, so no ear or hands ring. Inside the mouth, holds are just held tongue/roof/lips/arc touches. |
| Shake on the tube = vocal vibrato | Unchanged on the small tube. Inside the mouth a fast back-and-forth on the tongue is just tongue movement (vibrato comes from the ohm's learned `c.voice.vib`). |
| Play-mode node / appendage / envelope-node taps and drags | Unchanged while the mouth is closed. While it is open, every touch is the mouth's, so nodes under the panel can't be hit by accident. Close the mouth to play nodes again. |
| Walking stick (thumb on empty left half) | **Paused while the mouth is open:** the mouth claims touches first, and the left half is mostly arc and panel. An empty-screen touch outside the panel is "tap outside = close". *Flag for Wilbow:* should the stick stay available on the free strip? Default: no, so a stray thumb can't walk the ohm away mid-song. |
| Three-finger tap = undo, four-finger tap = redo | **Kept inside the mouth.** The mouth counts its own fingers: three or more down at once cancels the current sounds (no stray k/t/p), and lifting within 400 ms with < 30 px movement runs `App.undo` / `App.redo`. Two fingers (tongue + arc) can never trigger them. |
| Dev panel (three-finger still hold, 2 s) | **Not available inside the mouth** (those pointers never reach the recogniser). Close the mouth first. *Flag (minor):* the dev panel can't be opened from inside the view. |
| Two fingers: pinch zoom / pinch-in exit / twist = DAW / conductor baton | **Can't fire inside the mouth:** the pointers never reach `two`. A tongue + arc pair is the normal way to sing. Pinch-in can't leave play mode from inside the view: tap outside, or use back, first. |
| Ink / strokes / grab / throw / orbit / glyphs | Can't fire inside the mouth (the pointers are captured). Play mode already blocks most of them. |
| Ohm tap deferral (chirp / join / mute) | The double tap that opens the mouth cancels it. Inside the mouth no ohm taps happen. |
| Swipe exit (fast swipe away) | Only from outside the view. A swipe that starts outside the panel is "outside" and closes the view only if it is a tap (< 12 px, < 300 ms). Swipes do nothing there. |
| Android back | **Changed order:** back closes the mouth first, then leaves play mode on the next back. |
| Guide ghosts | No new ghost (the brief adds none). *Flag:* the mouth is only discoverable by double tapping the tube. |

**Decisions for Wilbow (defaults chosen, nothing else changed)**
1. Walking stick while the mouth is open: paused (default) or allowed on the free strip.
2. Back: closes the mouth first (default) or leaves play mode at once.
3. Quiet-voiced ohms: the mouth voice is scaled by the ohm's tract amount with a floor, gain = loud · .17 · (.3 + .7·amt). A barely-voiced ohm still sings at 30% of a full singer, so it sounds quieter and more instrument-like (the instrument-for-life rule). The alternative is a fixed loudness in the view.
4. A sung phrase is matched on pitches only (like the nodes). Its syllables come from the second singing. The alternative is to also require the same vowels both times.
5. (found while building) Teaching needs at least 2 different pitches among the last 8 sung notes. Exploring vowels on one note never teaches a flat motif. The alternative is to allow one-note motifs (rhythm/vowel only).
6. (found while building) The first two taps of the tube double tap still play their usual preview notes before the mouth opens. The alternative is to delay the tube's tap sound by the double-tap window (it would make every tube tap ~0.3 s late).
7. (found while building) When the pitch finger moves within 0.15 s of a note starting, that note is retargeted instead of a new note being recorded. This lets the tongue finger land a moment before the pitch finger without teaching a stray note. The alternative is strict note-per-change recording.

## v08-mouth gesture check (branch v08-mouth, Oct 24 2026)
Wilbow, 5:27 PM MDT: "Give each ohm a distinct mouth that can be found easier". 5:29 PM: "Double tap the mouth to enter mouth control allow recording of sounds played in play mode to go into that ohms current jam. Not completely override it, just add to its current phrase". 5:31 PM: all six mouth options were picked (always visible, gene-shaped, moves when singing, glows in play mode with a bigger target, a tiny closed mouth on non-vocal ohms, a one-time ghost).

**What you see**
- Every ohm has a mouth on the front of its head, on the side it faces. It is always drawn on screen. Off-screen ohms and ohms below about 1.4 px of mouth at the current zoom skip it.
- The voice genes shape it: width, curve (smile or frown), parted lips, round lips, a nose mark for nasal voices, and a cupid's bow for agile voices. No two ohms look alike. When the ohm learns a different voice, the mouth changes with it.
- **Vocal** ohms are singers (sung words, or tract gene ≥ .5) or ohms with a real throat (tract amount ≥ .2) that are not drummers. Their mouth opens and shapes each vowel they sing: wide for "ah", narrow for "ee", round for "oo". It closes on p/b/m/f/v/w and hums slightly open on notes with no syllable.
- **Non-vocal** ohms (drummers, instruments with hardly any throat) wear a tiny closed mouth that never moves.
- In play mode a vocal ohm's mouth glows softly with a slow pulse.

**New touches**
- **Play mode: DOUBLE TAP THE MOUTH = open the big mouth** (v08-voice mouth control). The target is at least the mouth's width × 1.6, at least 0.45 of the head radius, and at least 30 screen px, so it is bigger than the tube. Double tapping the throat tube still works too.
- **Play mode, non-vocal ohm: double tap the mouth = nothing new.** It falls through to the existing C3 `'ohmDouble'` (nothing happens), so a drummer's mouth is not a second gesture.
- **Recording (no new touch):** the notes you play in play mode are added to that ohm's jam phrase when you leave play mode. That includes node taps, appendage notes and notes sung in the big mouth. It never replaces the phrase. See the defaults below.
- **Ghost hint (one time, no text):** the first time play mode opens on a vocal ohm *after the tutorial*, a ghost fingertip double taps the mouth (guide 'dtap' dot style, ~2.6 s, after 0.9 s). It is saved with the guide state (`mouthHint`), so it never shows again, even after a reload. Opening the mouth hides it at once.

**Checked against every existing gesture**
| Existing gesture | Result |
|---|---|
| Play-mode double tap on a body (`Sf.doubleTap`, clear/dense) | **Changed only on a vocal mouth in play mode** (as the tube already was): it opens the big mouth and does nothing else. |
| Double tap on an ohm = nothing (C3, `'ohmDouble'`) | Unchanged off the mouth and tube, and on a non-vocal mouth (verified: lastTap stays `'ohmDouble'`). The mouth check runs first, only in play mode, only for vocal ohms. |
| Double tap on bare ground = CALL (v0.8b4) | Unchanged: CALL is gated on `!App.play`, and the mouth only takes double taps in play mode. |
| Throat tube taps / drags (`Pm.tract`), tube double tap | Unchanged. The tube double tap still opens the mouth for any ohm that has a tube. A tube tap preview is not recorded (previews are excluded). |
| Play-mode note-node taps | **Recorded** (that is the feature). |
| Limb-tip note nodes that lie under the mouth | **Conflict, accepted:** the taps of a mouth double tap can land on a limb-tip node and sound it, the same as the v08-voice tube Decision 6. Those notes are **not recorded**: opening the mouth drops anything recorded in the last 0.6 s. A deliberate single tap there still plays and records that note. |
| Ohm tap deferral (chirp / join / mute) | The mouth double tap cancels the pending tap (through `ohmTapCancel`, as for the tube). |
| Walking stick, pinch, twist, undo/redo fingers, swipe exit | Unchanged (the mouth adds no new gesture outside the double tap). |
| Android back | Unchanged from v08-voice: it closes the big mouth first, then leaves play mode. Leaving play mode adds the recorded notes. |
| Teach a motif ("phrase twice") | Unchanged and wins: a phrase you play twice is taught as before and is **not** also added. |
| Guide ghosts / tutorial | The mouth ghost never shows during the tutorial, so it can't overlap the tutorial's play-mode ghosts. It waits for the first play mode after the tutorial. |

**Recording defaults (in player terms)**
1. What you play is added when you leave play mode (back, pinch-in or swipe). It is not added live.
2. It keeps your most recent 8 notes from the last 4 bars you played.
3. They loop every 1, 2 or 4 bars, whichever fits how long you played.
4. Each note snaps to the nearest 16th and is stored as a scale step, so it follows the jam's key when the key changes.
5. A newer note on the same 16th replaces the older one.
6. An ohm holds at most 8 added notes (the oldest go first).
7. The ohm's own notes win any clash (an added note within half a 16th of its own note is skipped).
8. At most 4 added notes play per bar, a little softer (×0.85).
9. Added notes only play in bars where the ohm already plays something. They are silent in breakdown bars, while the ohm rests or listens, and while you are playing it (play mode already silences its own jam notes).
10. A phrase you play twice is taught as the motif (as before) instead of being added.
11. Notes sung in the big mouth are added too, with their pitch.
12. The taps that open the big mouth are not recorded.
13. Undo (three-finger tap) removes the last addition.
14. Additions are saved (world save and song save) and come back after a reload.
15. The mouth ghost shows once ever, after the tutorial.

**Decisions for Wilbow (defaults chosen)**
1. Vocal threshold: a throat amount of .2 (or a singer gene/words), and drummers never. Lower makes more ohms vocal; higher makes fewer.
2. The tube double tap still opens the big mouth for low-throat ohms whose small mouth is non-vocal. Default: kept as before. The alternative is to restrict the big mouth to vocal ohms everywhere.
3. A single tap on a limb-tip node under the mouth plays and records that note. The alternative is to let the mouth swallow single taps (the node would become unreachable there).
4. Additions apply when you leave play mode, not live, because play mode silences the ohm's own jam notes. The alternative is to hear them live while playing.
5. Teaching beats adding when you repeat a phrase. The alternative is to do both.

## v08-jamview gesture check (branch v08-jamview, Oct 24 2026)
Wilbow, 5:43–5:51 PM MDT: a new text-free view that shows the jam clearly and lets you grab and change it with taps and slides. Controls 4–12 and theory rules A–G are approved. The look (orrery / mandala / constellation) is NOT picked: this build draws the plainest working look (`JV.LOOKS.plain`), and a look can be swapped in through `JV.look`.

**New touches**
- **Enter: pinch out deep (camera z > 4.2) with the pinch centre on EMPTY space in a jam's middle.** "Empty" means no ohm within 30 world units of the pinch centre, and the centre is within max(70, 0.9 × the jam's spread) of the jam's centre. The world freezes into a cached, dimmed bitmap, the camera eases in for 0.6 s, and the members glide to their spots on the rim (real bodies).
- **Inside the view** (its own handler set, `App.handlers.jamview`). What a finger hits, in priority order: ohm body > section bead > key/mood disc > clock band > item knot > phrase mark > ring.
  - **Ring:** tap = mute (as in the world). Slide along = volume (capped .3–1.35). Slide in/out = register, one octave per 42 px, whole octaves only, within the ohm's range. Hold 450 ms still, then slide = brightness.
  - **Item knot** on a ring: slide = that item's amount (FXK mix). It modulates only and never adds or removes items.
  - **Phrase mark:** tap = pin the phrase. Drag along = shift the chunk within the bar (snapped to the tradition; coarse, fine after 0.4 s still). Drop it on another ohm = trade (a swap).
  - **Ohm body:** tap = mute. Drag it to another ohm's spot = swap roles (only the part changes, the instrument stays).
  - **Section beads** (outer arc): drag = reorder; flick (> 1.1 px/ms or 70 px off the arc) = drop that section.
  - **Clock band:** slide round = tempo (a full turn = double; landing near ×2 or ×½ = instant half/double time). A radial lean = swing.
  - **Centre disc:** a rim twist = key, one click round the circle of fifths per 30°. A vertical slide on the inner part (30 px) = one step brighter or darker in mood.
  - **Two fingers on the centre:** pinch in (< .8) = breakdown; spread (> 1.25) = build back.
- **Leave:** pinch in (< .6) anywhere but the centre, or Android back. The camera returns to where you were (z ≤ 2.5), and edits stay with the jam (they are saved with the song).
- Every change waits for the next musical boundary: the next bar for parts, volume, register, brightness, trades, pins and roles; the phrase end for key, mood, tempo ramps, sections and breakdowns. The lead ohm nods one bar ahead (only when on screen), and queued changes show as rings on the clock's phrase pips.

**Checked against every existing gesture**
| Existing gesture | Result |
|---|---|
| Pinch out deep on an ohm = DNA (z > 4.2, `creatureAt(…, 30)`) | **Unchanged and wins.** The original surface `two` runs first; the jam entry is only tried after it, and only when no ohm is within 30 of the pinch centre. Pinches that start on a body (`pinchB`: squeeze / DNA spread / envelope register) never enter. Checked in pw_jamview (DNA still opens on an ohm). |
| Pinch zoom / pinch-in to system (`toSystem` at z ≤ .013) | Unchanged outside the view. Entry needs ratio > 1 and z > 4.2, so it can't fire while zooming out. Inside the view, two fingers never move the frozen camera. |
| Unfuse spread (G6, two fingers on two fused ohms) | Unchanged: it starts on ohms (not empty space), and `App.split` is handled before the zoom. |
| Twist = DAW / envelope twist (cut) | Gated to `level === 'surface'`, so it does nothing in the view. A big two-finger twist in the view marks the gesture "twisted", and that pinch is ignored (no breakdown, no exit). Entry needs the DAW closed. |
| Conductor baton (two still fingers) | `batonOk` needs the surface level, so it can't arm in the view. |
| Clay two-finger | `clayTwo` needs the surface level, so it is off in the view. |
| Double tap on bare ground = CALL (v0.8b4); ohm double tap; fly home | **Off in the view** (`doubleTap` is a no-op there). Two quick taps on a ring = mute and unmute. |
| Single tap on an ohm = chirp / join / mute (deferred) | In the view a body or ring tap mutes at once (`H.mute`). There is no chirp or join there. |
| Hold 450 ms = play mode; tap-then-hold = listen | **Changed in the view only:** a hold on a ring arms brightness. Hold on a body does nothing, and play mode can't start from the view. Entry also needs play mode off. |
| Walking stick (play mode, left thumb) | Not reachable: it needs play mode on the surface level. |
| Big mouth (tube or mouth double tap, play mode; v0.8b7) | Not reachable: both need play mode, and the view can't be entered from play mode. In the view a double tap on an ohm's drawn mouth is just two body taps (mute, unmute). |
| Play-mode recording into the jam phrase (v0.8b7) | Unchanged. Added notes come out of `Mind.genBar` (the mouthlook merge) *before* the jam view's hook, so in the view they show as ordinary marks, and volume, register, brightness, trades and pins all apply to them. A pinned phrase plays exactly as captured (additions included if they were in it). World undo (3 fingers) still removes the last addition, but only outside the view. Inside the view, 3 fingers undo the view's own last change. |
| Three-finger tap = undo, four = redo | **Kept, with their own history.** In the view `App.undo` / `App.redo` use the view's stack. Undoing a change that hasn't landed cancels it; one that has landed queues its inverse for the same kind of boundary. Outside the view the world history is untouched. Checked in pw_jamview. |
| Dev panel (three-finger still hold, 2 s) | Unchanged (global recogniser). |
| Ink / strokes / grab / throw / orbit / glyphs / items | Off in the view: its handler set has none of them. |
| DAW river and baton | Unchanged; nothing removed. The DAW handler takes priority only when the DAW is open, and entry needs it closed. |
| Swipe exit / space flick | Off in the view (a one-finger drag on empty view space does nothing). |
| Android back | **New first step:** in the view, back leaves to the world. The next back does what it did before. |
| Guide ghosts | No new ghost. *Flag:* the view is only found by pinching into a jam's middle. |

**Conflicts inside the view and how they resolve**
1. Breakdown pinch vs exit pinch: a pinch whose centre starts within 1.3 × the clock radius is a breakdown/build gesture and never exits. Exit needs the pinch elsewhere and ratio < .6.
2. Phrase mark vs ring: a finger on a note mark is the phrase (tap = pin, drag = shift/trade), not the ring (mute/volume). Between marks the ring wins. Marks are drawn on the ring, so this is visible.
3. Along vs in/out on a ring: the first 12 px of movement decides the axis (tangential = volume, radial = register), and the axis is then fixed for that touch.
4. Ring hold vs ring slide: a hold only counts if the finger moved < 12 px in 450 ms. After that the slide is brightness, not volume.
5. Key twist vs mood slide: the outer 45 % of the disc is the key rim, and the inner part is mood.
6. Tempo vs swing on the clock band: the same 12 px axis rule (round = tempo, radial = swing).
7. Body drag (role swap) vs phrase drop (trade): the drag source decides (body = role, mark = trade). Both drop on a body spot.

**Decisions for Wilbow (defaults chosen)**: see the v08-jamview report. Main ones: the look (plain placeholder); a dropped phrase is a two-way swap; a drum moved to lead becomes a lead drum (+18 % accents and a pickup every 4th bar), and the old lead takes 'comp'; the key vote is a 1.5× vote (more with repeated nudges) against the members' stubbornness; tihai realign only protects sam (a full tihai re-cadence isn't built).

## v08-dawpaint gesture check (branch v08-dawpaint, Oct 24 2026)

Wilbow, 8:44 PM MDT: "I think we should be able to paint notes in the daw river.  The notes should dictate whatever is being currently sung and introduced to the jam". 8:45 PM: "Instead of a grid make the notes more organic and have movement". Card: "Yes, make the pattern editor organic too".

**New gestures (DAW river open, no pattern open, on an ohm lane)**
| Gesture | Where | What it does | Code |
|---|---|---|---|
| **Paint**: drag a finger along the lane | Starts on empty lane (or on a live-only bead; live beads are not handles) | Draws a living ribbon. When the finger lifts it becomes notes that the ohm plays (or sings, with its syllables) **from the next bar boundary**, in place of what it would have improvised over that stretch. The notes go into the jam phrase too. Height = pitch, settling onto the ohm's scale tones (quarter tones included where its scale has them). A smooth slope = connected notes that **glide**. A quick jump = a clean step. A wobble = **vibrato**. A slow or pressed stroke = **louder**. Timing gets a soft pull toward the beat, not a hard snap. The phrase loops over 1, 2, 4 or 8 bars. Painting over an earlier painted stretch replaces it. | `daw.js` D.down/move/up → `dawpaint.js` DP.paint |
| **Paint on a drummer's kit row** | A drummer lane's low / back / time / fill / colour row | Paints **that hit** (kick-like on the low row, and so on). A hit is placed at the start, at each bump in the line, and every 4 steps along a flat line. Only those hits give way; the rest of the kit keeps playing. | DP.hits, DP.hitFor |
| **Rest, then paint** | On a stored bead or bead edge | Rest the finger ≥ 220 ms, then drag = paint over the bead (the bead stays). | `DP.REST` |
| **Rub** (3+ quick back-and-forth turns of ≥ 10 px) | Across painted ribbons | Erases the painted notes under the rub. | DP.rub, DP.erase |
| Three-finger tap / four-finger tap | Anywhere | Undo / redo one stroke, erase or replace (one step each, mixed in with the other DAW edits). | doUndo / doRedo, `u.paint` |

**Checked against every DAW river gesture (GESTURES.md table above)**
| Existing gesture | Result |
|---|---|
| Tap a lane → open its pattern | **Unchanged.** Paint needs ≥ 10 px of movement, so a tap (< 10 px) still opens the pattern. |
| Tap a bead → audition / remove | Unchanged (same rule). |
| Double tap → solo | Unchanged (taps). |
| Hold a lane (450 ms) → mute | **Unchanged and wins.** A held finger never paints, even if it then drags (`info.held`). |
| Drag a bead → pitch / time; drag its front / tail edge → attack / release | **Kept for quick drags.** A drag that starts on a stored bead or edge within 220 ms is the old edit. **Resolution: rest-then-drag** (≥ 220 ms, < 450 ms) paints instead. |
| Fast swipe across beads → select (then group shift / copy) | **Kept.** A drag the brain reads as a select stays a select, even after a rest. |
| Closed loop on a lane → loop region | **Kept.** A painted path that closes on itself (and isn't a rub) is the loop region, as before. |
| Draw on an empty lane → write notes | **Replaced by paint on ohm lanes** (the lanes with a brain, where painted notes can dictate). Lanes without a brain (env / star) still write notes. |
| Drag a lane's top / bottom edge → timbre | **Kept.** A drag starting in the lane's edge band is timbre, never paint. |
| Two fingers (length / velocity, volume / braid, tempo) | Kept. A second finger cancels the live paint preview (`DP.end`); nothing is painted. |
| Twist → transpose / close | Kept (two fingers). Painted notes are scale degrees, so a transpose carries them along. |
| Pinch closed → leave the pattern | Kept. |
| Inside an open pattern | **No painting there.** Every pattern gesture is unchanged (see below). |
| Surface / jam view / play mode | Not reachable: the DAW handler only runs while the river is open. |

**The pattern editor, de-gridded (same gestures, new look)**
There are no row lines, column lines or box any more. Each stored note is a swaying, breathing leaf shape. A chord is a soft tendril joining its tones. The loop end is a glowing frond that sways. Every edit is hit-tested exactly as before (`D.patS` / `D.patDeg` are unchanged), so the gestures work the same:
| Gesture in the open pattern | What it does |
|---|---|
| Tap an empty spot / a leaf | Add a note there (in key) / remove that note |
| Drag a leaf up-down / sideways; drag its front / tail edge | Pitch / time; attack / release |
| Drag the glowing frond at the loop end | Loop length |
| Fast horizontal swipe through the middle | Invert |
| Fast vertical swipe through the middle | Retrograde |
| Vertical swipe on one moment (< 16 px sideways) | Stack a chord |
| Drag from the left margin | Slide a whole row (one pitch) in time |
| Fast swipe across leaves | Select (then group shift / copy) |
| Pinch closed | Leave the pattern |

**The look (text-free, no grid)**
- Painted notes are a leaf-green ribbon `[150,255,120]`, distinct from the brain's cyan / magenta / amber. A bud marks where each note starts and glows white while the ohm plays it. The live ring marks painted notes in the same green.
- Ribbons sway (about 2 px) and breathe (18 % thickness). The part just played swells.
- While you paint, and on any lane that holds painted notes, the brain's dot lattice and tonic lines hide, so there is no grid there.

**Conflicts and how they resolve**
1. Paint vs bead move / edge drag: the old edit wins for a quick drag, and paint wins after a rest of ≥ 220 ms (rest-then-drag).
2. Paint vs hold-mute: the hold wins at 450 ms if the finger moved < 10 px. A held finger never paints.
3. Paint vs swipe-select: select wins (a fast swipe from a bead).
4. Paint vs loop draw: a closed path is the loop region. A rub (3+ turns) is erase.
5. Paint vs lane-edge timbre: the edge band wins.
6. Paint vs tap: < 10 px of movement is a tap.
7. Paint vs the pattern editor: there is no paint while a pattern is open.
8. Paint vs two fingers: the second finger cancels the stroke.

**Defaults (in player terms)**
1. Painted notes keep dictating until you paint over them, rub them out, or undo.
2. A stroke loops every 1, 2, 4 or 8 bars, whichever fits its length.
3. The ohm keeps its own accents and swing on painted notes, but doesn't change their pitches (no chord-bending, no ornaments).
4. Beat pull is 50 %, and 70 % near the tradition's beats.
5. A slope of ¾ step or more between neighbouring notes glides.
6. Sway is about 2 px and breathing 18 %.
7. Breakdowns, mute, quiet bystanders and play mode still lay out.
8. The crowd cap still applies (painted notes are not 'manual').
9. Rest 220 ms on a bead before dragging to paint over it.
10. At most 6 strokes and 48 notes per ohm.

Checked: dawpaint_check (headless) and pw_dawpaint (real CDP touches), plus test_daw, dawbrain_check, pw_dawbrain, songsave_check, mouth_check and perf_j.
