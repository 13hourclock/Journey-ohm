# CHANGELOG: The Journey Ohm (Resonance 2.0)

Built 2026-10-26 from SUMMARY.md (release and update sections, newest first) and git log. SUMMARY.md is the full record; this is the short version.

## Unreleased: master b96edbc (after v0.0.30, no APK yet)

- b96edbc H5 nodeCap: far-zoom specks use look.node glow for the first [200,120,80,40][q], rest soft dots/squares, switch default ON
- 37f4c79 H4 diveWaveEvent: dive whole-voice wave alpha x smooth(max flash/.2) (shows only while it sounds), scope line dev only, switch default ON
- 47f3e82 H2 ridgeOverscan: flat ridge fills + water run one step past both screen edges (samples unchanged), switch default ON
- 48fffdb H1 calmBent: bent ridges + bigger layers' ranges fade by (1-gk) as curGlobe shows; at rest the bent fills haze 60% toward the air [150,172,200] (colour back with music x st.trippy), switch default ON
- dcd6334 H3 zoomSkyOnce + zoomFeather: no dark disc mid-pinch (inner layer draws no own sky while skyHold holds it; soft circle edge via masked offscreen blit), switches default ON
- 6fe1a02 look.planetRim: ease in from bend .3 (like softRing's aa), no pop when render starts calling it
- 0eba46f look README: v0.0.31 sweep fixes (seaMist/shoreFade, edgeAA, calmRim planetRim, nodeGlow look.node, dive waveRest)
- 63142d0 critters and rare sky events switch (OFF); probe returns camera home before 14-16
- fb4d29c look/dive: waveRest 0 - partial wave lanes are event-only (show while the partial sounds); 1 = v0.0.30 constant lanes
- 4b62261 look: look.planetRim (calmRim, neutral air band; colour only with music x trippy) + look.node (nodeGlow, soft pitch-coloured glow dots for far-zoom specks; call in GAMEDEV_SPEC H5) + tests/look_node_test
- f4faf71 look/planet: edgeAA - anti-aliased disc edge (coverage alpha + clamped rim normal), fixes the jagged left rim; false = v0.0.30 hard edge
- 34da1f6 lenses + prisms (switch lightPlay, OFF): old game light.js / R6.5; by day a bubble lens (pit) focuses a white spot on the ground, a droplet (cho) / shard cluster (glt) fans a 7-band rainbow; an ohm in the light
- de21c42 wind rocks + reed beds (switch windRocks, OFF): old game v0.4a field; 1-2 seeded rocks / reeds per planet sound in the wind on the beat with an ohm near (rocks low every 2 bars at most, reeds high every bar at 
- cc3628c look/ground: sea mist off open-sea crests (seaMist) + soft shore fade on water edges (shoreFade/shoreSide/shoreK): seed 42 y~576 hard cut, right-edge notch, seed 20261025 pale bottom-right strip
- 55069fa v0.0.30 G1 lnSpecks (ON, under noOutlines): far-zoom ohm specks and planets' sleeping-ohm lights are round soft dots (one cached 32 px sprite per colour, drawImage), not squares; off = v0.0.29 squares
- 1da9534 v0.0.30 tripDirect (ON): with tripWorld OFF, render's palette + burst bloom and world's pulse take the trippy gate themselves (world.tripK = st.trippy / trippy.value(); x1 when tripWorld is ON, so never twice);
- 37ecdda tests/oldfeat_test: checks 1, 1c, never compounds, follows a fresh value pass opts { tripWorld: true } (default OFF since 50345f3)
- 50345f3 trippy: tripWorld default OFF (Visuals, v0.0.30 sweep): look/ reads st.trippy itself (index.js TRP, audio.js, dive.js), so scaling world.look.trip too applied trippy twice; comment updated. Stills /tmp/sw30_tri

Merges: 098bc6c Merge track/visuals 6fe1a02: ground seaMist/shoreFade, planet edgeAA, calmRim planetRim + nodeGlow look.node, dive waveRest, planetRim ease-in, 3659464 Merge track/visuals 50345f3: tripWorld default OFF (look/ reads st.trippy itself)

WIP branches NOT on master and untested: track/oldfeat (eb42e7a, relics + oldfeat), track/balance (97ffd53, balancedOf step 1).

### Release: v0.0.30 (versionCode 30) on Drive (Oct 26 2026, about 4:30 AM MDT, Game Dev)

- **APK:** JourneyOhm-v0.0.30.apk, 4,158,238 bytes, sha256 82e135aebe9841fa..., signed with the lensure upload key (cert db171c70...dc7d1f), appId com.lensure.journeyohm, versionCode 30 / 0.0.30. Drive "Resonance overnight": https://drive.google.com/file/d/1En5YUSvaFckmdao7xfoZbYxt1uhy3xNb/view?usp=drivesdk
- **Built from f3e8f6e** (the v0.0.30 sweep master that Visuals passed) + the version bump (9704618 on branch build/v0.0.30, cherry-picked to master as 69bad7f), in a separate worktree. **Anything after f3e8f6e is NOT in this APK**, including 50345f3/3659464 (tripWorld default OFF), 37ecdda (oldfeat_test), 1da9534 (tripDirect) and 55069fa (G1 lnSpecks).
- **Contents:** everything in the sections below up to the v0.0.30 sweep (deaf muffle, visuals merges, oldfeat, GAMEDEV_SPEC section G G1-G9, song fixes, no outlines, tripWorld, and so on).
- **Gates** (gates030.sh, 26 gates): 24 passed on the first run. Two known flakes failed once with load average ~7 and passed on their first retry: abilities_browser_test check 6 (the driven ohm the test restored to was naturally deaf, muffle .825) and muffle_live_test (overruns 0 open vs 6 muffled, all noise).
- The staged APK copies on the box were deleted after Drive confirmed the upload (folder and size).

### Update: master ready for the v0.0.30 sweep: visuals merges, oldfeat, GAMEDEV_SPEC section G (Oct 26 2026, about 4:15 AM MDT, Game Dev)


**What's on master now**
- Merge 4c5ab9f of track/visuals f09e362: mode colours d310fda, ohm.tune flash dc196bc, smear fix eedac12 (+ look_smear_test), glowEventsOnly f09e362. look/ files in: README.md, gl.js, ground.js, index.js, kaleido.js, ohmlook.js, palette.js. Tests in: look_glow_test, look_mode_test, look_smear_test, look_tune_test.
- oldfeat (fast-forwarded by its worker): a48adf8 ... 9ec6718 (tripWorld, rare crash fix, jam minor keys, song groups grow, playTwice, songs chart fix, skyMood, eggWords, clay, egg/clay under no outlines), c22be9e bubbleCatch (OFF), c64b784 bubble catch fix.
- Merge 50e2048 of track/visuals d4a8662: dustSplit ba67926 (fixes the seed 42 dark sky cracks), RARE_LOOK.soft 99c6b04, look.legs owns rare legs d4a8662, character ohms claim their body f628a99, bench b4d2cdf. look/ files in: README.md, index.js, ohmlook.js, place.js, rare.js. Tests in/changed: look_bench_real(_core), look_claim_test, look_dust_test, look_rare_soft_test.
- GAMEDEV_SPEC section G, world side, each behind its own switch under noOutlines (all default ON, off = as before, dev toggles G1-G9):
- b0f85e8 oldfeat jam view (switch jamView, OFF). Its worker had not fast-forwarded it 10 minutes after it was committed, so I fast-forwarded master to it myself (master was its ancestor, nothing to resolve). It has no strokes or text.

**Cost and stills for section G**
- zoom_smooth draw p95 (ms), G on / all G off / on again: ground->sky 7.2/7.3/8.7, sky->planet 4.9/3.3/3.8, sky->ground 3.6/3.1/3.7, dive in 7.5/6.7/7.3, dive out 7.1/5.9/6.1, zoom+pan 6.4/8.2/8.0, ohm->voices 7.3/7.0/7.1, voices->ohm 8.8/6.4/8.4. I reran voices->ohm with switches off one at a time, 2 runs each: none off 8.9/7.6, all off 8.3/7.7, lnBand off 7.4/7.4, lnCracks off 7.6/8.8, lnRareLeg...
- Before/after contact sheet (G off on top, on below): /workspace/shots_zoomfix/g/sheet_g.png; space_cmp.png zooms on the orbits.

**Gates on b0f85e8**
- gates030.sh: all 18 node tests ok; pw_smoke, integration, look_bench_real, render_bench, look_rare_cost, zoom_smooth (all smooth), muffle_live (first try) ok. abilities_browser_test failed once on check 6 (deaf muffle, under gate load), then passed 3 out of 3 standalone: a flake.
- look_zoom_sweep (no blank frames, hard bands, seams or pops), look_smear_test, look_rare_soft_test, look_claim_test, look_dust_test, look_glow_test, look_mode_test, look_tune_test, look_galaxy_test, look_pulse_test, look_audio_test: all ok.
- Logs: /workspace/gates_final, /workspace/gates_final.out.

### Update: third pass: two song fixes, sky mood, old game TO COME list (Oct 26 2026, from about 1:46 AM MDT, Game Dev)


**What's new, in play terms**
- Fixed: a group that moves on to a different song now plays that song's chords (songs.js start() clears the cached chart). Test 4c.
- Fixed: drawing in the river during a grown section (A' / D / D') keeps the edit for that play only; the library song is never changed by growth. Edits in the song's own sections work as before. Test 4c.
- Sky mood (switch skyMood, OFF: a taste call): with it on, the ohms' own music leans with the sky where you stand. At night they play softer (and so darker); in deep night the tunes above the home octave drop an octave, a whole 2-bar phrase at a time. In rain they rest some of the in-between notes (up to about a third of all notes in a downpour; every downbeat still plays, and a loop stays the sa...
- Egg words (switch eggWords, OFF: a taste call because the spiral then hatches ~1.5 s later instead of at once): a plain spiral leaves a small egg with a closing ring and little orbiting glyphs. Strokes that START on the egg pick the hatchling's sound: taps = a drummer (1 kick, 2 snare, 3 hats, 4 a tom, 5+ a kick with a kit; your tap timing becomes its rhythm), a wave through it = a pad (big wave...
- Clay shaping (switch clay, OFF: a taste call, and it shares the spiral with egg words): a spiral that ENDS WITH A REST (finger held still about half a second before lifting) leaves a lump of clay instead of an ohm, with a ring that closes over ~8 s; every touch restarts the ring (20 s at most). The FIRST touch picks the family: a tap = struck (marimba, bells, steel pan...), a flick out from the ...
- No outlines (v0.0.30): the egg's and the clay's closing rings are beads of soft light, and the egg's hints are soft dots, under the master switch noOutlines and its lnHints switch (off = the stroked rings and glyphs as before). The clay lump and the egg are fills already.
- Catch in a bubble and carry (switch bubbleCatch, OFF: the HOME HOLD clash is open): draw a loop round ONE ohm (not yours) and lift without resting: it floats in a clear bubble, stops walking, and its own music plays softer, as if heard through the skin. Tap the bubble = pop (free). Drag the bubble = carry it about. Flick it up fast and far = farewell: the ohm leaves, and the 3-finger undo brings...
- Jam view (switch jamView, OFF: a taste call while the dive clash below is open): spread two fingers wide on the empty middle of a jam (two or more ohms playing together, or a song group) and it opens, the way the old game's v08 jam view did. The camera holds while you spread and the world dims behind a soft veil; the members sit round a ring. On the ring: a tap mutes that member (at once); a sli...
- Wind rocks and reed beds (switch windRocks, OFF: a taste call), from the old game's v0.4a field: each planet grows 1 or 2 hollow rocks and 1 or 2 reed beds on its ground (the same planet always grows the same ones; gas giants have none; not saved, as in the old game). In the wind they sound on the beat, but only when an ohm is near: rocks a low breathy tone at most every 2 bars, reeds a higher o...
- Lenses and prisms (switch lightPlay, OFF: a taste call), from the old game's light.js / R6.5: by day the sun shines through the clear effect objects on the home ground. A bubble lens (pit) focuses it to a bright white spot on the ground below; a droplet (cho) or a shard cluster (glt) fans a 7-band rainbow, violet to red. An ohm standing in the light adds a quiet glass overtone at the light's pit...
- Critters and rare sky events (switch critters, OFF: a taste call), from the old game's living-ground ideas: on the home ground only, fish swim in the water (by day), fireflies drift at dusk and night, and bird flocks cross when the planet has air (never on gas giants). About once a minute a rare roll can bring a meteor shower (night) or an aurora (thick air, night); a meteor plays a quiet three-...

**Jam view gesture check (GESTURES.md)**
- Pinch zoom: with jamView ON, only a two-finger SPREAD whose middle is on a jam's empty middle (off the members' bodies, no other ohm within its margin) opens the view; the camera holds while it builds. Pinching in there, and every pinch anywhere else, zooms as before (probe 12b). OFF = nothing changes (probe 13).
- (more in SUMMARY.md)

### Update: second pass after the v0.0.29 APK: tripWorld, rare crash fix, minor keys for jams, song groups grow, play a phrase twice (Oct 26 2026, from about 1:05 AM MDT, Game Dev)


**What's new, in play terms**
- Trippy: switch tripWorld (ON = as before). trippy.js still scales world.look.trip; when Visuals reads st.trippy and drops the three look/index.js TRP lines (236, 254, 264), they flip tripWorld OFF in the same commit so the gate is applied once.
- Rare ohms no longer crash the game under load (rare.js:68). Cause: traditions.js:140 gives every ohm a fallback rarity (wild = 1); env.js sets o.wild before the ohm is announced, so rare.js thought it was already rare and never gave it its signature sound (rareSig). Restored wild saves did the same. Rare now means rarity AND a signature (R.isRare). Test: rare_sig_test (fails on old master with t...
- Jams can go minor: a jam may now travel to the relative minor (same notes, centred on the 6th) or the parallel minor (same tonic, 3rd / 6th / 7th lowered; pure JI minor in om-JI-7), and comes home on a phrase line. Only in 7-note tunings; not saved (the key never was). Switches jamMinorRel, jamMinorPar (ON). The last three journeys weigh against a repeat, so minor turns come up between the major...
- Song groups you watch grow too (the old game grew every jam, songs included). A group playing a song, kept in view and matched (its members' versions close, nobody muted, you not cutting in), comes back next play with a longer form that keeps the proven one whole: A A' (a varied repeat ending on a turnaround), then a development section (the opening chords a fourth up, ending on V) before the la...
- Play a phrase twice and the ohm takes it as its tune (old game playmode). Tap the same 4 to 8 notes on an ohm twice in a row (at least two different notes, no long pause, not switching ohm): it becomes that ohm's strongest learned pattern and long part, so its answers take that shape, it passes it on like any learned pattern, and it is saved with the ohm. A flash cue is posted ('ohm.tune', plus ...
- Harder hits sound brighter: already in (dsp/inst.js:28 scales brightness with velocity on every engine). Checked, no change.

**For Visuals**
- 'ohm.tune' {src, len, x, y} is posted when an ohm adopts a played tune (o.glow is bumped too); a dedicated flash is yours to draw.
- music.mode ('major' / 'minor'), music.modeHow ('rel' / 'par'), music.semi() gives the sounding scale. look/palette.js and kaleido.js still colour by the major SEMI; reading music.semi() would follow the minor.

**Taste questions (added)**
- How often should jams turn minor? Now: relative weight .7, parallel .6 against the major moves (V 1, IV .8, ii .6); a mode journey waits for a fitting chord (or 8 bars).
- Parallel minor in JI uses 6/5, 8/5, 9/5. Natural minor only (no harmonic / melodic minor) for now.
- Song growth: attention needed 16 / 24 / 32 s per step, match line (average version drift) .25, cap 64 bars.
- Play twice: 4 to 8 notes, at least 2 different, gap under 6 beats; adopted tune strength = at least half of what it plays from memory. By default autojam plays it as a one-bar shape on chord tones; the exact tune note for note only plays with brain retention on (off). Should a taught tune play exactly by default?
- (more in SUMMARY.md)

### Update: no outlines + GAMEDEV_SPEC part 2 + section F, on master (Oct 26 2026, about 3:00 AM MDT, Game Dev)


**Merge**
- c5c45a8: track/visuals 2d33924 merged into master; both sides kept. The only look/ changes on master came in through this merge: tests/look_audio_test.mjs (new), tests/look_test.mjs, www/js/look/{README.md, air.js, audio.js, dive.js, ground.js, index.js, ohmlook.js, sky.js}. Game Dev edited no look/ file.

**Commits (on top of c5c45a8)**
- d1734b1: soft.js helpers (noLine, softRing, softDot, softPool, ring) and all the switches + dev toggles in world.js.
- dc92673: render side. A1 lookPulse, A2 rainSkyScale, B1 lnKaleido, B2/F4 lnRidge + look.ridge (no crest line on any range, so zoom-out no longer hands over to outlined ridges), B3 lnPlanetRim + look.planetRim, B5 lnScope, B6 lnNodes, B17 lnDiscRim, B18 seaMute, C2 envSeed, D ohmPost, F1 skyDefer, landShiftEase.
- 2228fe1: B7/B9/F6 lnGroups, lnHerd, lnFuse. The gold song circles and jam rings round the bottom row are now a soft pool of light under the members (look.group first, else softPool via destination-over); the section beads and playhead stay.
- ff15299: B10-B14 lookLegs, haloMute (45% sat), lookOhmBody, lnThings. Rare ohms keep their stroke legs.
- 6500604: B19/C galaxyMute (25% sat), lnGalaxy, lookGalaxy (look.galaxy in place of the haze while A < 6).
- 3621e78: B16/F3 lnDive (soft rings, waves and scope in the dive), diveNoName (no "the ohm / its voices / partials of its body / the wave" title). Hz labels and the shaping hint are kept.
- d02d764: lnHints (mouth hint, gesture spawn mark, ensemble line, play-hit ring as soft light).
- B4 portal ring: already off via noZoomRing (136c976). B8, B13, B15: no change, as the spec says. F2: the old kaleido petals still draw only when look.layer('field') returns false, and now with no stroke (lnKaleido). F5, F7, F8: nothing for the world side.

**Taste calls (neutral option)**
- (SUPERSEDED Oct 26 ~4:15 AM by section G: node numbers and dive text are now dev only; orbits, band, cracks, rain, rare legs and song beads are soft.) Kept: node labels and fill, dive Hz labels and shaping hint, orbits (thin), the material band, terrain cracks (objects, like plant stems), rain streaks (deferred when look.sky draws), rare auras, dev overlays, the DAW, song section beads, stroke l...
- Herd and song marks became world-coloured soft light.

**Open, for Visuals (look/ owns it)**
- (SUPERSEDED: fixed by Visuals dustSplit ba67926, on master via 50e2048.) **Dark curve lines in the seed 42 sky** come from look/place.js paintDust (lines 72-74): five crack polylines per 192 px dust tile, stroked rgba(30,24,18,.55). The tile is laid over the whole bg as a pattern by look.layerP1 in the 'over' pass (look/index.js:376-383, unhealed place.dust), called from render.js:249. Proposed ...
- (more in SUMMARY.md)

### Update: zoom follow-ups on master, after v0.0.29 (Oct 26 2026, about 2:00 AM MDT, Game Dev)


**Visuals merge (103408b, 12:54 AM)**
- track/visuals 85abe87 merged into master. It brings no outlines (thing.outline false), a softer kaleidoscope, aura, role and horizon, look.pulse, look.galaxy, the sky band, ohm character, and Visuals' sky parallax readers (skyScaleOf/farScaleOf on render's st.skyScale/st.farScale).
- Conflict in look/index.js (kaleido): kept Visuals' skyScaleOf + softEdges, and master's trippy TRP() on aK and on the night veil. The skyHold readers at index.js:217/258/448 were replaced by skyScaleOf.

**Fixes**
- **Dive out voices->ohm p95 creep** (7c17663, switch followPrev in dive opts):
- **Land darkening, ground->sky** (136c976). Causes:
- **No outlines, added to the list** (136c976):
- **Landing bang, sky->planet** (c6bd0e5). Causes:

**Checks**
- zoom_smooth, full, all ON: all smooth, page errors 0.
- pw_smoke: PW_OK, 0 failures, zoom visual checks ok.

**Files**
- Changed: render.js, planet.js (P.sizeOf), world.js (dev toggles), dive.js (followPrev).
- No look/ file was changed in these fixes.

**Contact sheets**

**Still open (Visuals owns these)**
- The partials->ground tile swap (look/ground.js).
- The pale rectangles in the zoom circle.
- (more in SUMMARY.md)

### Update: deaf muffle on master, after v0.0.29 (Oct 26 2026, about 1:50 AM MDT, Game Dev)

- **In player terms:** drive an ohm that is hard of hearing (about 1 in 4 ohms) and you hear the world through its ears, muffled like it's underwater. The highs go first, and the deafest ohms (about 1 in 50) muffle hardest. Swap to a sharp-eared ohm and the sound opens back up over about half a second, with no click.
- **How it works:** senses.js maps the hear gene to deafness, starting below .25 hearing and reaching .85 muffle at zero hearing. The audio worklet runs a master 2-pole low-pass that sweeps from 18 kHz down to 600 Hz. At .85 muffle, 6 kHz drops 29 dB and 150 Hz drops 0.2 dB. At 0 the filter is bypassed bit-exactly. It also publishes sim.muffle.amt, so audiosig's muffle signal for the look is live ...
- **Switch:** deafMuffle (default ON).
- **Speed:** dsp_bench measures the muffle at 1.3 to 9.7 us per block, under 0.4% of the block budget; the gate fails above 20 us. The live worklet A/B (muffle_live_test: 3 cycles of 2 s open and 2 s muffled) shows the same load muffled as open, and no extra dropouts. Headless overrun counts are bursty when the box is busy: on 1 of 6 runs, with load average 5, it measured 34 open vs 51 muffled. So...
- **Gates:** /workspace/gates030.sh is gates029 plus senses_test, oldfeat_test, dsp_bench and muffle_live_test. All 26 passed on the first run, with no reruns.
- **Commits:** 5a9c2c0 dsp muffle + bench, 18cf57d senses + test, 4182506 main wiring + abilities_browser check 6 + live test.
- **Taste (unnumbered):** what blindness should look like (a look/ effect, not built).

### Release: v0.0.29 (versionCode 29) on Drive (Oct 26 2026, about 1:35 AM MDT, Game Dev)

- **APK:** JourneyOhm-v0.0.29.apk, 4,075,519 bytes, sha256 f0df626cdd353f63..., signed with the lensure upload key (cert db171c70...dc7d1f), appId com.lensure.journeyohm. Drive "Resonance overnight": https://drive.google.com/file/d/1EyY3jmW2uwQ47Tl1TRUPmfPRqUN4yV9G/view?usp=drivesdk
- **Built from** 53e5c3f + the version bump (6313008 on branch build/v0.0.29, cherry-picked to master as b9229c2), in a separate worktree so other workers' commits on master could continue. Visuals' zoom sweep passed on 53e5c3f. Later master commits (7c17663 dive followPrev onward) are NOT in this APK.
- **Contents:** everything from the v0.0.28 section below (special abilities wave 2, cloud gas giants, node-taps test fix) plus the v0.0.29 zoom fix + sky hold, trippy gating and audio signals sections above. v0.0.28 was never shipped (number skipped).
- **Gates** (gates029.sh on the worktree): all 22 pass on the first run, no reruns needed; zoom_smooth reports 2 gestures flagged (informational, rc 0).
- The staged APK copies on the box were deleted after Drive confirmed the upload (size and folder).

### Update: v0.0.29 zoom fix + sky hold (Oct 26 2026, about 12:55 AM MDT, Game Dev)


**Defects fixed (all switches ON, in world.zl.dive.opts / dev panel)**
- **Dives went black, ohms left trails** (dive into ohm / back out / ohm->voices). Cause: the dive stopped repainting the world canvas while the camera moved. Fix: followAll (c014116). Frame diff max 40-122 -> 6-12.
- **Land popped to flat fills zooming out of the ground** (ground->sky). Cause: the real ground faded out and the far detail tier switched abruptly. Fix: realGroundFade, zoomSameDetail, heightBack (e0f3532). Diff 27.4->16.6 (q0), 32.5->15.6 (q3), 25.4->12.5 (4x throttle).
- **Hard horizontal kaleidoscope cut in space views** (sky->planet and beyond). Cause: the ground clip line was applied in space too. Fix: kaleidoSpaceWhole (77a3b58, look/index.js:245). Neutral choice: draw it whole in space, so the lower petals now show there.
- **One-frame flash diving partials<->wave**. Cause: the back layer snapped. Fix: backSmooth (d24fd86). Diff 22->9 and 23->3.

**Sky hold (Wilbow 12:12 AM)**
- skyHold ON: on the ground pinch the ground, ohms and things scale; the sky moves only 15% (skyPar .15), far ranges 50% (farPar .5). Blends smoothly to full scale between z -.15 and -.85 (skyHandFrom/To) on the way to the planet; no snap (max step .04). Ground->+1 diff 15.4 with hold vs 21.0 off.
- zoomAccent OFF: the old whole-picture zoom, kept as an accent (also world.zoomAccentK 0-1 for a future trigger; nothing triggers it yet).
- render passes st.skyScale / st.farScale to look/; skyHold off is bitwise v0.0.28.

**Checks**
- zoom probe: new skyJ (sky snap) limit 0; pw_smoke: zoom visual check (frame-to-frame change and black share per gesture) + sky hold block.
- Gates (gates027.sh on c2d259e): all pass except one pw_smoke run where "dive out partials->ground one pinch" had 11 slow frames under box load; two reruns fully pass (PW_OK). zoom_smooth all smooth, hitch 0, skyJ 0.
- render_bench draw mean home 0.92, zoom .5 1.83, 1.5 1.78, -1.3 2.11 (reruns 1.26-1.84), 3.4 1.46 ms; frame p95 16.7. look_bench_real q0 2.63/3.0, q1 1.72/2.4, q2 1.14/1.8, q3 0.64/0.9.
- 4x throttle: dives' measured draw rose about 4.5 ms with followAll (the forced world repaint is inside the timed section), frame interval unchanged, hitch 0.

**look/ lines changed**

**Open**

**Commits**

### Update: v0.0.29 work, old game features + trippy gating + audio signals for the look (Oct 26 2026, about 1:45 AM MDT, Game Dev)


**What's new, in play terms**
- **Trippy visuals start hidden** (trippy.js, switch trippy ON): a new game starts at 5% trippy and it opens up as you play. Three switches to try (Wilbow didn't pick): trippyHarmony (opens with the harmony you bring back), trippyTravel (opens with the furthest scale you reach: ground, planet, star system, galaxy), trippyBoth (DEFAULT, either one opens it). It eases, never pops; a dev slider pins ...
- **Jam roles** (jamroles.js, jamRoles ON): in every jam one ohm is out front and the others follow. The front tires and hands over on a phrase line to the freshest, most eager member (bold / social, experienced). Followers answer thinner and softer, taking the front's rhythm. In a crowded jam the most tired follower steps back and listens (eyes on the front), holding one soft chord tone, so it ne...
- **Jams change key** (jamkeys.js, jamKeys ON): after about 24 bars at home a jam travels to a close key (V, IV or ii; the members' own home keys choose, seldom the same twice), always through a chord both keys share, and comes home after about 16 bars. You can still push it anywhere; nobody playing = nothing moves.
- **Jams you watch grow** (jamgrow.js, jamGrow ON; V07 E): keep a jam on screen, near the middle, without panning away; while both are in time together and in key, its loop grows 2 -> 4 -> 8 -> 16 bars, keeping the old loop inside the new one (A, A A', A A' B A''). A new part that slips is dropped (back to what worked); every few passes one bar gets a small try (kept if it holds). Growth gives the...
- **Own instrument vs learned sounds** (learnvoice.js): up to three learned sounds (learn3 ON, was two) under the ohm's own birth sound, which always keeps the larger part; a learned sound comes forward while the ohm plays near the one it learned it from (learnCtx ON, Wilbow 9D). The rare clean solo of a fully learned sound is built but OFF (learnSolo, taste).
- **Conducting** (conduct.js, conduct ON; conductGesture OFF): raise the baton and the ohms in view watch you and wait; down / up beats set the tempo (snapped to synced steps, the upstroke is the upbeat), hand height = loudness, a stroke through an ohm cues it, a sharp flick down cuts them off, lifting releases. The touch binding is off because it is the same touch as "shape the ground with your v...
- **Crazes** (craze.js, craze ON; extends traditions / placeTrad, no second store): when a hook catches, the tune spreads ohm to ohm (curious, social ohms pick it up, a little wrong); once 5 ohms have played it, it is the planet's tradition.

**Field names settled with Visuals (12:53 AM Oct 26; this replaces the lookCtx names below)**
- `st.trippy` (0..1; missing = 1 for old callers; a new game starts at .05): set every control tick on render's per-frame state `st`, the same object that carries st.skyScale / st.farScale (render.js exposes it as `render.st`, one added line). Visuals multiplies the kaleido veil and petals, the music colour as light and the sky bands by it in look/. Game Dev computes it and owns the switches + the...
- `st.audio`: the audio-signal object, one sub-object per system: `st.audio.om`, `.notes`, `.strings`, `.bars`, `.membranes`, `.jam`, `.arc` (the song arc; was `.song`), `.trad`, `.abilities`, `.muffle` (+ `.trippy` copy). Fields as listed below. lookCtx.audioSig / lookCtx.trippy remain as read-only copies of the same values.

**For Visuals: lookCtx.audioSig (audiosig.js) [SUPERSEDED 12:53 AM: the name is st.audio; .song is .arc]**
- `om` { level, hz, heart, drone }: om hum level (planet hum voices), the om's Hz, heartbeat onset, om drone level
- `notes` { onset, level, pc, deg, oct, rate, bright, damp, id, x, y }: ohm notes; pc = pitch class above the om (0..11); bright / damp = the last noting ohm's timbre
- `strings`, `bars`, `membranes` { onset, pc, rate, id, x, y }: drawn instruments
- (more in SUMMARY.md)

### Update: v0.0.28 special abilities wave 2, cloud gas giants, node taps fixed (Oct 25 2026, about 11:55 PM MDT, Game Dev)


**What's new, in play terms (all switches ON)**
- **Conductor** (lead + precision): ohms playing near it swell and soften together over 8-bar phrases, and it closes each phrase with a little cadence (5th then home).
- **Composer** (creativity + memory): when it's quiet and you're close, it makes up a short 4-note tune; a nearby ohm picks the tune up 2 bars later, and it can travel 2 hops.
- **Weaver** (build + elastic): spins a string you can play in the air above itself (one per weaver; saved).
- **Memory keeper** (memory): every 32 bars, if no song is playing near you, it brings back the oldest song from your library.
- **Gravity** (buoy + mass): moving ohms close to it swirl around it and drift in.
- Abilities now: about 1 ohm in 15 carries one (12 of 25 live).
- **Cloud gas giants** (R5.12): on a planet that is mostly gas, most ground ohms float up into the cloud (1 to 2.6 above the ground); off a gas giant they settle back.

**Switches**

**Gates (gates028.sh)**

**Node taps cause**

**Blocked / taste / skipped abilities**

**Reservoir**

**Commits**

**APK**

### Update: v0.0.27 special abilities, wave 1 (Oct 25 2026, about 11:20 PM MDT, Game Dev)


**What's new, in play terms (switch 'abilities' ON, plus one switch per ability, all ON)**
- About 1 ohm in 25 is born with a special ability, from a rare mix of its genes (each one about 0.6% of ohms). No labels: you notice it by how it sounds and moves. Stronger the further its genes are past the line. Children inherit it: two carriers always pass it on, one carrier about 1 time in 4. Existing ohms don't change (the ability genes are a separate part of the seed).
- Echolocation (ab_echo): an ohm with poor sight and sharp hearing gives a soft click every 2 bars with a faint ring; ohms the ring reaches glow and it drifts toward the nearest.
- Perfect pitch (ab_pitch): ohms near it are pulled back into tune (the matrix pitch push shrinks).
- Living metronome (ab_metro): while it plays it ticks a quiet steady beat, and nearby ohms stop leaning ahead / behind the beat as much.
- Mimicry (ab_mimic): play a phrase near it, stop, and a bar later it plays your phrase back in its own voice.
- Overtone singing (ab_overtone): each of its notes carries a quiet note an octave and a fifth up (two notes at once).
- Dream singing (ab_dream): at night, when it isn't playing, it hums a slow low note every 4 bars.
- Storm singing (ab_storm): when it plays near you, rain comes in; it clears when it stops. (Lightning from ABILITIES.md is not built: no lightning in the engine yet.)

**Speed**

**Gates (gates027.sh = gates026 + abilities_test + abilities_browser_test)**

**Question statuses (from Resonance, 10:40 PM)**

**Not built (reasons in the gap audit)**

**Taste questions (unnumbered, for Resonance to number)**
- Which abilities next, and in what order? (18 left, e.g. conducting, composing, healing, memory keeping, colour shifting, time stretching; several need things not built yet: light beams, levitation, phasing, void walking.)
- Echo ring look: a thin pale ring is built (outside look/). Keep it, or have Visuals restyle it?
- Budding (ability 21, approved) with no mutation (R1.3): a lone parent buds an exact clone. A build it that way; B wait (clones could crowd a world).
- Creatures that change the beat (R3.23) vs one shared clock: A never; B only inside your own jam; C a small world-wide lean.
- (more in SUMMARY.md)

### Update: v0.0.26 your drawn shapes come alive, bystanders watch (Oct 25 2026, about 10:55 PM MDT, Game Dev)


**What's new, in play terms (every item has its own dev-panel switch, all ON)**
- Ohms play your shapes (shapePlay, P5): an ohm within about 300 px of something you drew may play it, on the beat, in its own way. Pluckers pick strings, drummers strike bars and drums, bowed and blown instruments hold long notes, and singers sing at a shape until it rings back. Each ohm decides once every 4 bars, only on screen, and leaves the shape when it wanders off.
- Ensembles (ensembles, P6 1-4): draw 3+ parallel bars and they become a marimba row (long = low, tuned bar overtones). 3+ parallel strings become a harp tuned to the chord playing now. 3+ drums close together become a drum circle (big = low beat, middle = back beat, small = off-beats). A string or bar of 300 px or more snaps to home or the fifth and becomes a drone rod that 2+ bowers hold. Each n...
- Shapes lean the jams (shapeLean, P7): nearby ohm jams sometimes borrow (up to 1 phrase in 3) the melody your shapes have been playing. The pull fades within 8 bars of a shape going quiet.
- Quieter crowds on shapes (shapeCap): at most 4 shape notes ring at once from ohms or wind bumps. Your own taps and drags always sound.
- Size limits on drawn shapes (absLen): dragging an end keeps a shape between 24 and 1200 px.
- Bystanders (bystanders, R3.8): ohms near a jam that aren't in it stop, turn their eyes to it, and slowly learn its patterns and sound. Tap to join / mute (Q338) is still open.
- Smoother bar lines (geneMemo): a burst of song notes reuses the same synth answer for the same genes.

**Speed (Playwright headless, 4x CPU throttle profile with 10 drawn shapes + 2 ensembles; look_bench_real)**
- Worst control-tick task: q2 62.7 -> 36.2 ms (geneMemo; voicesFor -> fromGenes was about 10 of 45 ms in one song-notes burst). q1 and q3 worst tasks (35-50 ms) are now one-time look bakes / a first ohm sprite upload (look/, not touched) and song-note bursts of about 30 ms.
- look_bench_real worst frame: q0 2.57 (gate 3.0) | q1 1.77 (2.4) | q2 1.16 (1.8) | q3 0.63 (0.9). One parallel run showed q1 2.51 OVER; 3 serial reruns gave 1.77-1.85.
- Rare look: 0.62 ms/frame with tradAura stage 1 on for the bench (tradAura stays OFF in play). Visuals: nothing approved is waiting to be merged.

**Gates (gates026.sh = v0.0.25 gates + drawn_p_test, answers_test, step5_test, autojam_test)**

**Not built (reasons in the P check)**

**Taste questions (unnumbered, for Resonance to number)**
- Shapes leaning the jam's tempo: everything shares one clock locked to the om, so a tempo lean moves the whole world. A no tempo lean; B allow a small world-wide lean; C lean only inside your own jam.
- Should ohms walk over to play your shapes? A yes, slowly; B only ones already nearby (as built); C only when you call them.
- (more in SUMMARY.md)

### Update: v0.0.25 smoother music, your songs as traditions, haptics (Oct 25 2026, about 9:50 PM MDT, Game Dev)


**What's new, in play terms**
- Smoother music: the small stutters on bar lines are gone. A song's next bar now goes out note by note a beat ahead instead of all at once (switch sSpread); sound messages from one moment travel together (aBatch); shaping many ohms is spread over several ticks (mSlice); the sky kaleidoscope prepares its rings one at a time in spare moments (kSplit).
- Your own songs become a place's tradition: a song you play 3 times on a planet becomes its tradition. Resting groups there now pick it up about 40% of the time, the members learn it (each a little off), and babies inherit their parents' traditional songs, a little further off again (switch placeTrad).
- Haptics: the phone buzzes like the old game did, on a spawn, a birth, a mouth, a jump, a crack, big moments and the dev-panel hold, never closer than 120 ms (switch haptics; Q339 on what should buzz is still open, this is the old set).

**Speed (Playwright, 4x CPU throttle profile and look_bench_real)**
- Worst main-thread task, home idle with songs playing: 90.7 ms -> 46.1 ms (what's left is a one-time dust sprite bake). Kaleidoscope step ~21 ms, was the whole 58 ms raster.
- q0 worst frame 2.37 ms (gate 3.0, was 2.44); worst idle bake slice 7.0 ms (was 11.1).
- All gates pass: pw_smoke (only the known node-taps flake), integration, rare, traditions, dive, gesture, look_test, look_aura_test, systems_test, look_bench_real, render_bench, look_rare_cost, zoom_smooth; new tests place_trad_test, haptics_test. *(Superseded v0.0.28: not a flake. The test counted every note event from every source; song-chord drains (v0.0.25) and wind level events landed in its...
- answers_test fails 2 checks on v0.0.24 too: it still expects the role TEXT labels that have been off by default since v0.0.23. Not a gate; the test needs updating. [SUPERSEDED v0.0.26: answers_test updated, now expects role text off by default; passes and is a gate]

**Gestures**

**Still approved, not built (full list: audits/gap_2026-10-25_night.md)**

**Open questions as of 9:50 PM (checked against QUESTIONS_FOR_WILBOW.md)**

**Build**
- v0.0.25 (5fc9b91; features 0c8f954, 6b3e199): https://drive.google.com/file/d/1HA7IclNkxqV707xnFy_06AH9KuqPCs8L/view?usp=drivesdk (signed com.lensure.journeyohm, cert db171c70...dc7d1f, 4.0 MB)

### Update: v0.0.24 smooth zoom at every scale (Oct 25 2026, evening MDT, Game Dev)

- Every zoom and pan (ground, sky, planet, star system, galaxy, the dive into an ohm, voices, partials, wave, and back out; pans and zoom+pan) now uses the same snap-zoom feel with no screen switch. Every new behaviour is behind a dev-panel switch that is ON (smooth) by default; OFF gives v0.0.23 behaviour.
- camFrame (world.opts): the space camera snap and the dive camera step once per drawn frame instead of on the music control clock, which removes the frames where the zoom stood still (snap judder).
- worldFollow (dive.opts): between the ground and the voices layer the world behind zooms WITH you into the ohm (render.js magnifies the live world frame about the ohm), and the ohm glides back to its spot in the world going out. Removes the jump on leaving and the "world holds still" switch feel. Cost: about 1 ms per frame while diving.
- magnetEase (dive.opts, .3 s): after you let go, the focus magnet eases in instead of tugging at once. gvTau (.05 s): the release speed is a time-weighted average, which stops the stray drift after a two-finger pinch.
- Incremental bakes: sky (look.sky SKY_OPTS inc / bakeMs 1.2 / starsPer 48, world.opts.skyInc) and terrain warming (terrWarm, terrWarmMs 1.5) are spread over idle frames instead of one long frame.
- Probe: tests/zoom_probe_core.mjs now covers 26 gestures (all space layers in and out, three pans, zoom+pan, every dive layer in and out, glides, one-pinch dives) and also checks snap judder ('hitch'). pw_smoke runs it all and checks the switches default ON.
- Kept unchanged: dive sound shaping, rare looks, role cues, tradAura (OFF by default), INSTRUMENT_PALETTE checks.
- APK v0.0.24 (versionCode 24, code 6f66e0e, bump 1b02c15), signed db171c70: https://drive.google.com/file/d/1Bok4dvB6Kn0uIGB1g7ap_7IldBUVZ-1H/view?usp=drivesdk

### Update to master d790f00 (Oct 25 2026, about 5:30 PM MDT, Game Dev)


**Builds since v0.0.15 (all in the Drive folder "Resonance overnight")**
- v0.0.16 (56457d9): an instrument for every ohm (73-row palette, gene-driven), learning drift, far ohms play their own instrument (not bells), sample chop + granular; systems: river DAW, mouth control, walk, fusions/colonies, plants, harmony bank, away-time. [Clarified 9:50 PM: no conflict with v0.0.18. v0.0.16 stopped far ohms falling back to a bell sound; v0.0.18 fixed the other paths that stil...
- Step 5, after v0.0.16 (bb6d0f4, merged 711bc48): drum kits grown by learning (drums.js), effect objects and drawn instruments (things.js), item modulation sources. Systems r2 (7d2041b): teach line, epigenetics, in-key breeding, soft bodies.
- v0.0.17 (f202e39): step 1a, a real explorable planet on the ground (2D).
- v0.0.18 (9498612): bells root-cause fix, equal instrument chance (Wilbow 12:37 PM "Equal chance of spawn"), overlay/ground fix, zoom perf, big moments, systems round 3, galaxy step 2.
- v0.0.19 (17d8d2a): look items 1-4 (kaleidoscope veil in the sky, terrain that reads as land, back-slice headroom, look.sky).
- v0.0.20 (0b75e2e): sound-driven sky kaleidoscope + lookfeed; look.sky owns the home sky.
- v0.0.21 (b41c8f5): Q350-359 answers, dive shaping, look.thing; registers @capacitor/filesystem + @capacitor/share. https://drive.google.com/file/d/13tHGSsQFN2qBJeohzstgeCOEeqt3yaet/view?usp=drivesdk
- v0.0.22 (51858bb): rare ohms, traditions wave 1, soft zoom resistance, tradAura dev switch. https://drive.google.com/file/d/1X8V1Tt_HgXjyWi9LUyfEzbc3_NjYO3QH/view?usp=drivesdk
- v0.0.23 (2ab90c2): zoom fix (22962bd), Visuals merge (12f9c32), roleText switch (role TEXT labels, off by default), aura stage. https://drive.google.com/file/d/1ZrTtwM-UfYKy-m8uHPdrAEXMgzXAKkCB/view?usp=drivesdk
- On master, not yet in an APK (goes into v0.0.22): rare ohms, traditions wave 1 + corrections, soft zoom resistance. [SUPERSEDED: shipped in v0.0.22 / v0.0.23; latest build is v0.0.24, see the v0.0.24 update above]

**Drawn instruments (was "on hold", now built)**
- Step 5 (711bc48): draw strings, membranes and bars that play on touch; physics pitch snapped to the scale in cents (d4f89d3).
- Movable ends + drum rim (315d647, Wilbow 3:19 AM Oct 23): drag retunes to key with a soft re-strike, 0.3-3x / 0.4-3x limits, undo, saved.
- (more in SUMMARY.md)

## Version bump commits (git)

- 69bad7f 2026-10-26 04:15 v0.0.30 (versionCode 30)
- 9704618 2026-10-26 04:15 v0.0.30 (versionCode 30)
- b9229c2 2026-10-26 01:19 v0.0.29 (versionCode 29)
- 6313008 2026-10-26 01:19 v0.0.29 (versionCode 29)
- 228b747 2026-10-26 00:05 v0.0.28 (versionCode 28)
- 61da775 2026-10-25 23:17 v0.0.27 (versionCode 27)
- 1b02c15 2026-10-25 20:57 bump v0.0.24 (versionCode 24)
- 2ab90c2 2026-10-25 19:01 bump v0.0.23 (versionCode 23)
- b41c8f5 2026-10-25 16:24 v0.0.21 (versionCode 21); cap sync registers @capacitor/filesystem + @capacitor/share
- 17d8d2a 2026-10-25 13:16 v0.0.19 (versionCode 19)

Times are MDT (UTC-6). Earlier history (v0.0.1 to v0.0.22) is in SUMMARY.md section 'Update to master d790f00' and docs/DECISIONS.md.
