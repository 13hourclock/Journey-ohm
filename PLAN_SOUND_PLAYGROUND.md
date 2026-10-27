# Sound playground: plan only (Game Dev, 1:15 AM MDT Sun Oct 25 2026)

> **Build from SUMMARY.md first** (Wilbow's Current Summary, /workspace/resonance2/SUMMARY.md). If this plan disagrees with the summary, the summary wins.

**Status: PLAN, nothing built.** "Do not build" (10:22 PM Oct 24) stands until Wilbow says go, and then only for one step at a time.
What it's for, in his words: "focus completely on making sound for a while and really flesh out the capabilities of sound creation" (1:04 AM) and "As we prototypes the sound it will be in relation to how we tie it to the game" (1:05 AM). It's a single ohm on the shared 60 BPM beat. He can play it, sculpt it and sing to it. Each step is a signed APK on Drive, and the next step waits until he has heard the last one and says go.

## Step 1: first sound (tiny, about 4–6 builder hours, 1 APK)
On screen: one soft ohm on a dark field, breathing on the 60 BPM heartbeat (glow plus a faint waveform ring, nothing psychedelic yet).
- **Tap the ohm:** it strikes once through the ported exciter x resonator modal voice (a pluck or strike into its modal bank, FDN reverb).
- **Hold the ohm:** play mode with ~7 scale nodes from the om (64 Hz, provisional since 10:43 PM).
- **Dev-only text line (allowed since 9:47 PM):** the live timing numbers below.
- Includes the master limiter (safety only). No other tool is in step 1.
- **Blocked by:** Q278 (new appId next to Resonance, or install over `com.lensure.resonance` and its saves?); tap now vs next beat (not numbered yet; related to Q248 and the old 300 ms ohm-tap delay); his go. Q280 (stack) is assumed to be the recommended Capacitor + JS worklet; three.js isn't needed yet.

**Timing check (light, on his phone):** a 60 s self-test on first launch saves numbers to a file and shows them on screen. No recordings.
1. Touch to sound: event time to audio start, plus the context's output latency, with `latencyHint:'interactive'` (the old game used 'balanced'). Proposed target: under 50 ms.
2. Live voices at 60 fps: add modal voices until frames go past 16.7 ms or the worklet goes past 50% of its block budget. Proposed target: 32 modal and 4 tract voices, as measured on the box (NEW_ENGINE 10.4).
3. Dropouts: count worklet blocks that run over budget, and frame gaps (the micfix check). Target: 0 in 60 s.
Targets are proposals. The reference phone (Q283) decides where the gate sits, and his phone is a stand-in until he answers.

## Later steps: his tool order (1–5), built proactively and in parallel (2:00 and 2:03 AM Oct 25)
| # | Adds (player terms) | Ported / new | Size (builder h) | Depends on |
|---|---|---|---|---|
| 2 | **Synthesis types:** VA/subtractive, FM 2–4 op, wavetable morph, additive, phase distortion, west-coast fold+LPG, ring, granular, all blended with the modal engine. Genes set each ohm's leanings; a spiral grows a new ohm, so he hears what the genes do | Port inst.js (it already has all of these); new: custom wavetables | 4–6 | — |
| 3 | **Modulation:** ADSR, filter and pitch envelopes, LFOs, plus body, movement and touch as mod sources (squeeze, drag and throw speed, wobble) | Port inst.js, EnvEdit, play-mode handles; new: a body/motion mod matrix | ~30 min | Q289 |
| 4 | **Effects:** delay, distortion, SVF filters, chorus, the 28 fx.js kinds, and **spectral** FFT blur/freeze. Effects from the environment come later through effect items | Port fx.js and fxkinds.js; spectral is new (the largest DSP cost) | 4–6 + 5–8 | — |
| 5 | **Sampling:** sing to it (tap-then-hold) and the ohm reshapes his voice. **Ohm-sampler** (1:12 AM "Ohms can also listen to the samples and use them, add fx chop them etc"): the ohm chops and pitches his voice and runs it through FX. Also **(E) resampling**: record anything, including the game's own output | Port listen.js mic worklet, the inst.js granular buffer and record (star loop); new: chop/slice, a voice buffer | ~40 min | Q307 |
| 6 | **Touch sculpting:** shape the sound directly through the body (clay, pinch, tract tube) | Port mold.js, clay timbre, tract.js; new: a direct body-to-spectrum map | ~40 min | Q289; gesture check |
| 7 | **(B) Harmony tools:** scales and tunings (microtonal and ratio based, from the om), chords, an arpeggiator | Port theory.js, tonal.js, trad.js; new: microtonal and arp | ~30 min | — |
| 8 | **(A) Arranging:** sequencer, looper, song structure, quantize and swing, polyrhythm, automation; the song is kept as notes + rhythm + recipe | Port daw.js, dawpaint, songsave; new: looper, automation, polyrhythm | 10–16 | the beat question; "resolved" |
| 9 | **(C) Mixing and 3D space:** levels, spatial placement, ducking (the limiter has been in since step 1) | Port FDN and pan from audio.js; new: HRTF-lite panning, sidechain | 4–6 | needs a 2nd ohm |
| 10 | **(D) Recipes as seeds:** save, share, mutate and breed patches, with offspring inheriting | Port genome.js, dna.js, breeding; new: a patch file plus share | ~30 min | see tension 4 |
| 11 | **(F) Export:** audio, stems, MIDI to Drive or share | New (WAV and MIDI writer, Android share) | 4–6 | — |
| 12 | Freeze to loop when settled, live again on touch, sing or encourage; loops merge into group loops and fade with distance, at every scale (12:46–12:54 AM; SUMMARY.md "Settled songs become loops") | Builds on 8 and 9 (render a recipe to a loop) | ? | "resolved" (not numbered yet) |

## Gestures (checked against GESTURES.md, all existing meanings kept)
1. **Tap ohm:** it sounds. The old 300 ms tap delay (C2) adds directly to latency. It is dropped: "Tapping an ohm sounds right away" (decided 1:16 AM Oct 25).
2. **Hold ohm = play mode; tap-then-hold = listen (mic).** This is the v0.8b4 swap. CONCEPTS 4.5 lists them the other way round, and that should be fixed.
3. **Listening dips game sound to ~6% (micfix).** That clashes with singing *along* to a live ohm and needs his call. Echo from the speaker is a risk.
4. **Pinch on the ohm = squeeze-sing**, but a spread past 1.8 opens DNA. The two-finger twist means the DAW river normally and cutoff while inspecting. Q289 ("two fingers always move the view") conflicts with both. The playground has no camera pan, so this can wait.
5. **Spiral = new ohm.** Step 2 would replace the one ohm rather than add a second. That is new behaviour.
6. **Star loop = record** (E), and **closed shape + rest = effect item** (later environmental FX). Both are reused unchanged. 3-finger tap = undo.

## Tensions to put to him (not decided)
1. "Ohm keeps its instrument for life" (CONCEPTS 3.1, APPROVED; 6:57 PM Oct 23) against his 1:09 AM pick D+A+B+C (instruments learned, picked up, assigned or sculpted).
2. The playground on his phone against the old "one app only, no Lab or sandbox APK" rule. One option is to make it the first screen of The Journey Ohm under Q278.
3. Q307 still says world sounds are "DECIDED" synthesized, but 12:42 AM dropped the no-samples rule and 12:44 AM made it a discussion. Steps 1–4 and 6 are synthesized either way.
4. (D) "mutate and breed" against "Mutation is off… only player DNA edits" (t108). A mutate the player triggers may count as a player edit. That's his call.
5. Q277 is still open (start the new engine). This plan doesn't need it answered, but every step needs his go.

## Next: B–F as one system (plan only, Game Dev, 2:05 AM MDT Sun Oct 25 2026; nothing built)
**A comes first:** he tries v0.0.2 on his phone, then picks. Everything below is a proposal, and every gesture is *for example*.
**One system:** every new thing is a source in the shared world state, with a recipe, a body, signals and matrix rows, all talking through events on the beat clock. A second ohm, his voice, a recording and a thrown body use the same blocks, so the same parts work for one ohm, for two, and for a group later.

| Order | Piece | What it adds (player terms) | Smallest first version he can hear | Builder wall-clock |
|---|---|---|---|---|
| 1 | **F fix gaps** (the base the rest sits on) | The beat never stalls; wobbles and sweeps land on the beat | Heartbeat keeps going when drawing stops; a "snap to beat" switch per matrix row (for example: LFO 1 pulses on quarter notes) | ~20 min (v0.0.3 DONE) |
| 2 | **E physics** (B needs bodies that meet) | The ohm feels alive in the hand | Flick it and it flies, bounces off the edges and drifts home; after a strike it jiggles like jelly, and the jiggle wobbles the sound | ~25 min |
| 3 | **B two ohms jamming** | A partner that answers and learns | A second ohm; play a phrase and it answers on the next bar, in key; over a minute its notes drift toward yours while its own tone stays underneath | ~40 min |
| 4 | **C sing to an ohm** (B's learning, with his voice as the source) | It listens and imitates you | Hold-and-sing (for example) about 4 s; it plays your tune back as notes in its own voice, snapped to the scale | ~35 min |
| 5 | **D sampling** (C's mic path plus a buffer) | It records, chops and reuses sound | It records 2 beats (of you or the game itself), cuts them into 8 slices on the beat and plays them back as a pattern through its effects | ~40 min |
| 6 | **F spectral** (shares D's buffers) | Smear and freeze sound | One "freeze" effect insert | ~30 min |

Estimates are real minutes for Game Dev (2:01 AM: "Why is it taking that long thats insane"); about 3 h for all. Rule change 2:00 AM: build test builds proactively, one at a time. From 2:03 AM, E (physics/throw) moves to the OHMS track; the audio order is F → B → C → D → spectral.

**Phone risks:**
- **Mic and speaker together:** the old game hit "audio stopped coming out" and "dropouts with the mic cintrol" (6:18 / 6:24 PM Oct 23). There is also echo when singing without headphones.
- **CPU:** pitch tracking and FFT run in the worklet, and spectral is the heaviest. Two ohms double the voices.
- **Soft-body physics in JS:** proposed cap of about 16 rim points per body.
- **Memory:** sample buffers, at about 10 MB per minute of stereo.

**Tensions with his words** (to ask him, not decided):
1. **Ducking while singing.** Listening dips game sound to about 6%. That is the old micfix design, not his words, and it fights singing *along* with an ohm. Proposal: duck less with headphones, plus a switch.
2. **His own instrument vs learning.** "The individual ohms keep theor instrument. Its not a rule that each each type can be only one thing or sound" (6:57 PM Oct 23) against learned and imitated sounds in B, C and D. This is still open. Proposal: its gene tone sits under what it learns.
3. **Learned sounds playing solo.** "Alone, but rarely" (7:25 PM Oct 23). Imitations (C) and chops (D) blend by default and play alone only about 1 phrase in 8–16.
4. **Random change.** "No spontaneous mutations till we can get good music out of the base systems" (Oct 21). In B, C and D, change happens only because a partner or the player caused it. No random drift.
5. **Samples.** "Definitely no samples" (11:18 PM) was reversed by "Some sampling will be necessary that rule is inefficient, disregard" (12:42 AM) and "Let's not make definitive rules while discussing like this its disruptive" (12:44 AM). GOAL_AND_FEATURES still lists synthesized-only as DECIDED, which is stale.
6. **Throwing.** In the old game a throw made the ohm leave its adopted instrument (GESTURES row 37). Proposal: don't carry that over. When a learned or imitated song counts as "resolved" also stays open (1:50 AM card: A + C + D, a leaning).

**Defaults for the tensions (PROPOSALS, 2:01 AM; toggles where cheap):**
1. Ducking: duck less with headphones on, plus a switch.
2. The gene tone sits under whatever the ohm learns.
3. Learned sounds blend in and play alone about 1 phrase in 8–16.
4. No random drift: change only from a partner or the player.
5. Throwing never drops an adopted instrument.
6. "Resolved" (his 1:50 AM leaning, open until he hears it) = stops changing OR the player/group accepts it; closeness to the true song shows as how well it fits.

**v0.0.3 (F gaps) built:**
- The control clock (physics, heartbeat, matrix) now runs off the audio clock, with a 25 ms timer as backup; drawing only draws.
- The world keeps sounding with the screen off (proposal, toggle).
- Every matrix row has "snap to beat" (off, 1/16 … bar), either as a pulse or as a step.

**v0.0.4 (B, done):** jam.js = a second ohm (ordinary source id 2) listens to ohm phrases, answers at the next bar after a 1-beat rest (≤5 notes, caller's rhythm, chord tone on the strong beat, resolves to tonic/favourite chord tone), learns the caller's sound (blend +6%/exchange, cap 50%, alone 1 phrase in 12). Taps snap to 1/8 only while a jam runs. Follows MUSIC_GOOD.md #1–5 where cheap; roles/density/bands (#9–12) wait for 3+ ohms.
**v0.0.4 r2 (team defaults 2:09, PROPOSALS):** jam only when near (opts.jam.near), tap changes land on the next bar in a jam / holds instant, loose roles from what each ohm plays (busier phrase leads, support = 3 chord tones an octave lower), one shared key/beat/chord (music.chord), tap-tempo handler (`tempo.tap`, 2-bar glide), dev-panel meter (fps | frame ms | audio % | ohms). Nothing from CONCEPTS §4.2.

**v0.0.5 (C, done):** sing.js = the mic as a 'voice' note source (pitch read ~20/s from an analyser, only while the two-finger still hold lasts; nothing recorded). Sung notes snap to the shared scale; the ohm you sang to imitates (same degrees + rhythm in its own sound/register) from the next beat; ducking -12 dB speaker / -3 dB headphones (tension default 1). All open defaults = toggles, listed as questions in the report.

**v0.0.6 (D, done):** sampling (your sung notes are recorded on the phone only while singing, chopped per note or beat, pitch-tagged, replayed by your ohm at any pitch); moving harmony (chords + pivot key changes, shaped equally by all players, `harmony.push`); no lead/roles - parts emerge from genes, learning and the moment; auto mix; context landing / tempo follow / singing dip / sound blend (Wilbow 6, 7, 8, 9 answers). All toggles. + each ohm has a brain (learned patterns etc., fade only when long unused, saved), many things shape its synth via the matrix, throws only wobble it briefly; ohms track merged.
**v0.0.7 (done):** spectral effect (smear/freeze), jam taps snap by context, ohms jam without you (presence: distance, genes, place), lore removed from the engine (no om->tempo default, no lineage), visuals track merged., singing answers (latch, loops at your timing, drift to its own range, chord fit, answer, bends, 15% voice absorb).

- DROPPED 3:39 AM MDT: in-game checklist (Wilbow: "Actually no checklist for in game"); try-lines go in reports.
- NEXT (waiting for go): turn P1 look on by default (opts.p1:true), per Wilbow 54A 3:36 AM MDT; dab7ff8 already on master.
  - P1 switch: render.js createLook({... opts:{p1:true}}). Also pass jam membership to look (tell Visuals the field name).
