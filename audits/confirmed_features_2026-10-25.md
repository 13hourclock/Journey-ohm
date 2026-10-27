# Confirmed features vs code, Sun Oct 25 2026 (systems track, branch track/systems)

Go: Wilbow [pt120u] 2:32 PM MDT: "Start building other past confirmed features and testing integration.  Do not remove feature without checking".
Sources: SUMMARY.md, softsound NEW_ENGINE §12.1 (551-577) + Appendix A (628-938), WILBOW_VERBATIM.md, DECISIONS.md, audits/rollback_2026-10-25.md, PLAN_SYSTEMS / PLAN_INSTRUMENTS / PLAN_REAL_PLANET / PLAN_SOUND_PLAYGROUND.
Left out on purpose (per brief): star systems step 2, the layered zoom (incl. §12.1 #22 molecule/cell spaces), traditions (§12.1 #9; not audited here: missing, queued: builds with the traditions track, approved 12:35, after Wilbow picks the first 6-8), the sky kaleidoscope, the 3D globe / many-ohm scaling.
Status: built / partial / missing / off (= built but off by default). Track: S = systems, W = world/zoom, I = instruments/music, V = Visuals.
file:line is on track/systems after this audit's commits (www/js/ unless noted).

| # | Feature | Status | Where | Source | Track |
|---|---|---|---|---|---|
| 1 | DAW river: paint notes, organic notes, jam view | built | daw.js:1, 36 | §12.1 #1; PLAN_SYSTEMS 1 | S |
| 2 | Brain view (what an ohm knows) | built | daw.js:5 | §12.1 #1 (V4) | S |
| 3 | Songs separate from jams, song library | built | songs.js:1, 58; panel systems.js:83 | §12.1 #2; PLAN_SYSTEMS 2 | S |
| 4 | Your own songs become traditions | missing, queued: builds with the traditions track, approved 12:35, after Wilbow picks the first 6-8 | - | §12.1 #2 | S+W |
| 5 | "?" helper (incl. relations bars) | built | helper.js:6, 15 | §12.1 #3; App. A O | S |
| 6 | Keep everything on exit; time passes while away | built | persist.js:7, 18-19 | §12.1 #4; PLAN_SYSTEMS 4 | S |
| 7 | Spiral = quick random ohm | built | spawn.js:1 | §12.1 #5 | S |
| 8 | Drawn gestures/glyphs as input (hook = ?, teach line, flick) | built | gestures.js:7-21 | §12.1 #5; App. A O2/O6 | S |
| 9 | Undo 3-finger tap / redo 4-finger tap | built | undo.js:4; gestures.js:53-62 | §12.1 #6 | S |
| 10 | Calling and herding (C) | built | herd.js:19 | §12.1 #7 | S |
| 11 | Drummer ohms + kits grown by learning (B) | built | drums.js:1; blend.js:39 | §12.1 #7 | I |
| 12 | Effects as objects (E), drawn instruments (F) | built | things.js:65, 108; fxkinds.js | §12.1 #7; App. A P | I |
| 13 | Drawn instruments: movable ends, length = pitch (App. A P detail) | partial (not verified line by line) | things.js | App. A P | I |
| 14 | Own tone from genes; learned instruments; sculpt; role from play | partial: genes + learned sounds / picked-up instruments built (blend.js, 4da3ae3); sculpt and role from play skipped (Q359-360) | instruments.js:82; recipe.js:3 | §12.1 #8 | I |
| 15 | Carried items modulate sound | built | influence.js:43; recipe.js:62 | §12.1 #8; PLAN_INSTRUMENTS step 12 | I |
| 16 | Sampling + granular from recordings, ohms chop/reuse | built | dsp/inst.js:4, 13, 20-25; devpanel.js:70 | §12.1 #10 | I |
| 17 | Mouth control, recording into a jam, singing to an ohm | built | mouth.js:11; sing.js:37 | §12.1 #11; PLAN_SYSTEMS 7 | S |
| 18 | Harmony as currency (earn) | partial: earned, nothing spends it (Q306) | systems.js:22-29, 85 | §12.1 #12 | S |
| 19 | Discord holds back the next scale up | partial: B.canAdvance() exists, no zoom code calls it | systems.js:28 | §12.1 #12 | W (enforcement point) |
| 20 | Music visuals and auras, experience glow | partial (glow from sound only) | ohmdraw.js:2, 13 | §12.1 #13 | V |
| 21 | Walk in an ohm's shoes | built | walk.js:8 | §12.1 #14; PLAN_SYSTEMS 9 | S |
| 22 | Fusions and colonies | built | fuse.js:10-12 | §12.1 #14; PLAN_SYSTEMS 10 | S |
| 23 | Plants grow from nearby music | built | plants.js:12 | §12.1 #14; PLAN_SYSTEMS 11 | S |
| 24 | Galaxies; planets modulate galaxy; systems playable as instruments | partial (galaxy layer drawn; modulation/playable not found) | galaxy.js:1 | §12.1 #15 | W |
| 25 | Om at low C 64 Hz matched to heartbeat (om->tempo lock) | built, ON again | music.js:4, 52 | §12.1 #16 | I |
| 26 | Heartbeat sound + om drone | off (since v0.0.2, 75bc17b) | recipe.js:21; devpanel.js:42-43 | §12.1 #16 context (heartbeat) | I |
| 27 | Realism: rivers, erosion, snow, shadows, light | built | globe.js:6, 11; world.js:270; env.js:42 | §12.1 #17 | W |
| 28 | Sound suite: song structure, swing, tunings, recipes as seeds, MIDI export | built | songs.js:6, 215; jam.js:24-41; devpanel.js:49; recipe.js | §12.1 #18 | S/I |
| 29 | Sound suite: arpeggiator, automation, polyrhythm tools, audio/stem export | missing; skipped (no gesture or behaviour given beyond approving the categories at 1:12 AM; "no menu"), Q356-358 | - | §12.1 #18 | I |
| 30 | Settled songs become loops, live again when you play/sing | built | songs.js:12, 90 | §12.1 #19; PLAN_SYSTEMS 14 | S |
| 31 | Physical controls (squish, stretch, flick, pinch) + soft bodies | built | softbody.js:5, 13; gestures.js:55 | §12.1 #20; PLAN_SYSTEMS 13 | S |
| 32 | Teaching + offspring; in-key breeding; drift causes discord | built | teach.js:73; blend.js:71 | §12.1 #21; PLAN_SYSTEMS 12 | S |
| 33 | Breakdowns in long songs | built (this task, aa6de7a) | songs.js:23, 159 | DECISIONS R3.9; w184 "Yes, add breakdowns" (10:44 AM Oct 22) | S |
| 34 | Bystanders watch; tap to join, tap a member to mute/unmute | missing (clashes with tap-an-ohm = it sounds) | - | DECISIONS R3.8 (t181) | S (Q338) |
| 35 | Haptics ("keep the haptics") | missing: no vibrate code, no VIBRATE permission in AndroidManifest | - | DECISIONS Q2 / R9.9, answered 2:19 AM Oct 23 | S + build files (Q339) |
| 36 | Plain unrecognised strokes leave glowing ink (~2 s); retrace = piece; clay = soft body | missing (an unrecognised drag is stir + loop select today) | input.js:110-115 | DECISIONS 1:42 / 1:44 / 1:45 PM Oct 23; App. A R, R7 | S+I (Q340) |
| 37 | Drawn closed shape -> effect item | superseded by R4 (retired 1:45 PM Oct 23); effect objects exist via things.js | things.js | App. A A; DECISIONS R4 | I |
| 38 | Collecting ohms for a home (hearth), longings/missions | missing | - | App. A N1-N11 (2:44-2:49 AM) | S/W |
| 39 | A path of discoveries | missing | - | App. A G (2:32 AM) | S/W |
| 40 | In-game hints for everything new (text-free) | partial: ? helper only | helper.js | App. A I; R7.4 | S |
| 41 | Play / listen swap and moving ohms | partial (grab-move built input.js:109; swap not found) | input.js:109 | App. A T (3:32 PM Oct 23) | S |
| 42 | Ohms feel their room in a jam (time + frequency) | partial (correction: jam.js:36-38 already moves an ohm an octave away from a crowded register and plays sparser for a busy caller / fuller for a sparse one; no explicit space sense) - skipped, Q350 | jam.js:36 | App. A Q | I |
| 43 | Jam-tuned strings | partial: drawn strings near a jam built (24209d8); strings built by fusing ohms, the 120 ms glide and the section nudge not built (Q351-353) | things.js jamTune | App. A D (2:25 AM) | I |
| 44 | Items: take / knock / split, 20 new kinds | partial: split built (6756e6e, quick wide spread on a fused cluster); take / knock skipped (no carried items in the new engine, Q354) | fuse.js spreadSplit; gestures.js spreadWatch | App. A U | I |
| 45 | Hidden developer panel | built (starts closed) | devpanel.js:18 | App. A DEV (2:31/2:38 PM) | S |
| 46 | Drawn instruments heard in the app | fixed this task (d6ea9d9: sim.js threw on drawn sources so audio never got their notes) | sim.js:85 | §12.1 #7 F | S |

Counts: 46 rows. built 26 (incl. #33 and #46 done this task), partial 10, missing 9, off 1. Plus #37 superseded.
Systems-owned rows not built: #4 (missing, queued: builds with the traditions track, approved 12:35, after Wilbow picks the first 6-8), #18 spend, #34, #35, #36, #38-41 - see questions.

## Flags: off or changed without his OK (NOT restored; for the parent)
1. #26 heartbeat + om drone OFF since v0.0.2 (75bc17b), recipe.js:21 `heart:{on:false}`, `drone:{on:false}`; §12.1 #16 pairs the om with the heartbeat.
2. Hold-still spawn OFF (systems.js:33 `holdSpawn:false`); plan says spiral first (audit A7), but the old spawn was not his cut.
3. Sound absorption OFF (merge aa2018f; blend.js:65 "partner absorbing OFF").
4. T10 moons and rings, T12 fling travel, T16 water on the beat stay OFF (team proposals; rollback list 16).
5. Haptics: confirmed ("keep the haptics") but no code exists; was in softsound, not carried.
6. R3.8 tap-to-join/mute existed in the old game (Sf.jamTap), not carried.
7. Left-half ground nodes are untappable while the walk stick shows (walk.js stick zone).
Resolved since the rollback list: bf05712 om->tempo lock is ON again (music.js:52); dev panel starts closed (devpanel.js:18).

## Other tracks' gaps (listed only)
- W: #19 call B.canAdvance() at the zoom-up step; #24 galaxy modulation / systems playable; #38-39 shared with S.
- I: #13, #14, #29, #42, #43, #44; #26 decision.
- V: #20 auras / earned visuals.

## Questions (numbered from 338)
338. R3.8 says tap a jam to join and tap a member to mute it, but tapping an ohm already makes it sound. Which gesture should join or mute (for example a long press on a jam member)?
339. Haptics: "keep the haptics" needs the VIBRATE permission in the manifest. What should buzz: notes you play, the beat, the heartbeat, DAW ticks (Q253 default off)?
340. Glowing ink for every plain stroke (1:42 PM Oct 23): today an unrecognised drag stirs the world and does a loop select. Should ink be drawn on top of both, or replace stir?
341. Bank: where is harmony spent (Q306), and should the discord gate block the zoom up to the next scale or just slow it?
342. Heartbeat and om drone have been off since v0.0.2. Turn them on by default?
343. Breakdown defaults are mine, not yours: a 25% chance at each new section after 2 sections, lasting 2-4 bars, needing at least 3 members. OK?
344. Hold-still spawn is off now that the spiral spawns. Keep it off?
345. Place lean is layered on top of your equal-chance pick weights (6c3b8c5). Is that OK? ANSWERED by Wilbow 1:14 PM Oct 25: "A: keep the place lean" (placeLean stays on).
346. Left-half ground nodes cannot be tapped while the walk stick shows. Move the stick or the nodes? DUPLICATE of Q335 (taps on the left nodes); see 335, not filed separately.

## Questions from the build round (2:44 PM Oct 25), numbered from 350
Numbering note: renumbered 3:00 PM Oct 25 (were 347-357; 347-349 are the world track's galaxy questions). 345 above is answered and 346 points to Q335, so neither needs filing.
350. (Room sense, your 3:28 AM Oct 23 "Add ohm awareness of how much relative space it takes up in the jams not timing and frequency mix") Q131 is still open: did "not" mean "in"? Today an ohm in a jam already moves an octave away from a crowded register and plays sparser next to a busy caller. Is that the room sense you meant, or should ohms do more (for example pick rests and register from the whole jam)?
351. (Jam-tuned strings, 2:25 AM Oct 23 "When joining ohms, the resulting strings should be representative of available notes in the jam") Fusing ohms makes no strings in the new engine. Built: drawn strings near a jam take its notes. Should fusing ohms also grow strings?
352. ("pronpt the direction of established clusters") Built: your plucks on a jam-tuned string count toward the jam's harmony at 0.8 of an ohm's vote. Is that enough of a nudge, or should a string steer the next section too?
353. (V08 D 120 ms glide) Notes are one-shot, so a retuned string sounds its new note on the next pluck. Do you want a glide on a string that is still ringing?
354. (Items, 4:06 PM card ideas 1 and 2: take / knock off a carried item) Ohms carry no items in the new engine; effect objects are drawn things in the world. Should ohms carry drawn things first (then take / knock apply), or drop take / knock for now?
355. (Split, built) A quick wide two-finger spread on two ohms of one stuck-together group splits it across the middle; the two sides cannot re-stick for about 4 minutes. 120 px in 350 ms and 4 minutes are V08 defaults, not yours. OK? Slow spreads still just drag; pinch on one ohm (squeeze / DNA) is unchanged.
356. (Arpeggiator, approved in the 1:12 AM suite card) Where should it live with no menu: harp frames whose pluckers arpeggiate (V08), a gene so some ohms play broken chords, or a gesture in the River?
357. (Polyrhythm tools and automation) In the River? Painting uses one finger and two-finger spread is time zoom there. Which gesture should draw automation or set a lane's cycle?
358. (Audio / stem export) What starts it with no menu, and where does it go (Drive folder, Android share)? MIDI export already exists in the developer panel.
359. (Role from play, 1:09 AM card B) jam.js follows your 2:22 "lead is a freeze": parts only emerge in the moment and nothing is stored. Should an ohm now keep a role that grows from what it plays (and shows, per "roles must be visible")?
360. (Sculpt, 1:09 AM card C; playground step 6) Which gesture assigns or sculpts an ohm's sound? Pinch (squeeze / DNA), twist (River) and hold (play mode) are taken, and Q289 is open.

### Undocumented values for Music Theory (my defaults, panel-switchable)
- Drawn strings near a jam: leash 3.5 world units (about 190 px at the default zoom), tied for 2 bars after an ohm plays, your pluck votes at 0.8 (V08 tunable).
- Movable ends (Music Theory 3:01 PM): strings 0.3-3x the drawn length, bars 0.5-2x, drums 0.4-3x the drawn area; after an end/rim drag the note is clamped to strings C3-C5, bars C4-C7, membranes C2-C4 (nearest scale note inside the range); soft re-strike at most every 70 ms per object, no limit across different objects.
- Jam-tuned strings (Music Theory 3:01 PM): each string's pitch comes from its length, snapped in cents to the nearest note of the jam's current scale (maqam microtones included); on a shared note the higher-drawn (shorter) string moves up one scale note; re-snapped on the next downbeat after a key change. Reach 3.5 units, 2-bar hold, 0.8 vote unchanged.

