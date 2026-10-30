# THE JOURNEY OHM: CURRENT SUMMARY (main reference)

This is the summary Wilbow worked through with Resonance, copied from the Current Summary Page (https://cursor.com/canvas/store-0adb6cb5-b723-4194-8359-5f07727e8ca0/07343028-69f7-42c0-b600-d05d41b5aac6) on Oct 25 2026, 10:36 AM MDT. Every bot and every plan builds from this first, together with WILBOW_VERBATIM.md for the full detail. If a plan disagrees with this, this wins. Don't cut or change its concepts.

---

## Update: music wave 2, guest accent, body plans, walking legs, chromatic chords, status board (Oct 29 2026, Claude)

Approved by Wilbow 10:12 PM MDT Oct 29 ("Do all, keep discussion going"). Merged to main on GitHub (13hourclock/Journey-ohm) as PRs #1-#6. No version bump, no APK from Claude: the GitHub Actions workflow (.github/workflows/apk.yml) builds a debug APK on every push to main. **BOARD.md** is now the status layer: read it first.

### What's new, in play terms (each behind a dev switch; off = as before)
- **Oct 28 decisions now load** (PR #1): the "Go with recs" files had been uploaded to the repo root; moved into www/js. New defaults ON (wind rocks, lenses, sky mood gentle, critters, egg words, jam view, bubble catch with hold-to-set-down, conducting near a jam); clay OFF.
- **21 more traditions** (PR #3, switch traditions: wave 2): jazz, blues, funk, Carnatic, Turkish makam, Persian dastgah, Chinese, Cuban son, rumba, samba, bossa nova, flamenco, Balkan aksak, Andean, overtone, reggae/dub, drum & bass, minimal, classical, modal, rock/pop, from docs/TRADITION_REFERENCE.md: real scales (microtonal where real), 16 new rhythm cycles, fixed chord charts (12-bar blues, ii-V-I AABA, Andalusian cadence...), 7th chords. Planets now pick from 29 (the land leans which).
- **Real chromatic chords** (PR #6, switch chromatic chords): blues V7, flamenco III, samba VI7 sound as the real chords (steps raised / lowered while they play).
- **Guest accent** (PR #3, switch guestAccent): an ohm carried to another planet keeps its home tradition; in a host jam it leans its weak notes to its home focus notes, adds its home grace notes and rests like home, always in the host key / tuning / tempo / cycle. Each first meeting of two traditions posts 'trad.meet' (the hook for later outcomes). Home tradition is saved.
- **Song chord fit** (PR #3, switch strongSnap): a song's melody notes on strong beats move to the bar's chord (the hook was replayed unchanged over new chords). Carrier group on-beat fit 77-87%.
- **Body plans from the first game** (PR #4, switch bodyPlans): blob, shell, serpent, strider, drum-belly, cluster, floater, chosen from the instrument (a hat bristles, a snare has beaded feelers, a pad trails fronds, a bass hangs a keel, a kick wears a band); gene outlines; 0-6 legs; serpent segments near you. Far ohms unchanged.
- **Walking legs** (PR #5, switch walkLegs): near ohms step with their legs as they move.
- **Music reference docs** copied from the first game into docs/: TRADITION_REFERENCE, MUSIC_OVERHAUL, MUSIC_THEORY, PATTERN_LIBRARY, V08_B7_VOICE_THEORY.

### Still discussion (not built): see BOARD.md K1 (how the player changes the key), M4 (several song groups at once), M5 (what happens when traditions meet).

---

## Release: v0.0.30 (versionCode 30) on Drive (Oct 26 2026, about 4:30 AM MDT, Game Dev)

- **APK:** JourneyOhm-v0.0.30.apk, 4,158,238 bytes, sha256 82e135aebe9841fa..., signed with the lensure upload key (cert db171c70...dc7d1f), appId com.lensure.journeyohm, versionCode 30 / 0.0.30. Drive "Resonance overnight": https://drive.google.com/file/d/1En5YUSvaFckmdao7xfoZbYxt1uhy3xNb/view?usp=drivesdk
- **Built from f3e8f6e** (the v0.0.30 sweep master that Visuals passed) + the version bump (9704618 on branch build/v0.0.30, cherry-picked to master as 69bad7f), in a separate worktree. **Anything after f3e8f6e is NOT in this APK**, including 50345f3/3659464 (tripWorld default OFF), 37ecdda (oldfeat_test), 1da9534 (tripDirect) and 55069fa (G1 lnSpecks).
- **Contents:** everything in the sections below up to the v0.0.30 sweep (deaf muffle, visuals merges, oldfeat, GAMEDEV_SPEC section G G1-G9, song fixes, no outlines, tripWorld, and so on).
- **Gates** (gates030.sh, 26 gates): 24 passed on the first run. Two known flakes failed once with load average ~7 and passed on their first retry: abilities_browser_test check 6 (the driven ohm the test restored to was naturally deaf, muffle .825) and muffle_live_test (overruns 0 open vs 6 muffled, all noise).
- The staged APK copies on the box were deleted after Drive confirmed the upload (folder and size).

## Update: master ready for the v0.0.30 sweep: visuals merges, oldfeat, GAMEDEV_SPEC section G (Oct 26 2026, about 4:15 AM MDT, Game Dev)

Final master for Visuals' sweep: b0f85e8 (gated) plus this SUMMARY-only commit on top. No APK, no version bump. look/ was not edited by me; it changed only through the two visuals merges below.

### What's on master now
- Merge 4c5ab9f of track/visuals f09e362: mode colours d310fda, ohm.tune flash dc196bc, smear fix eedac12 (+ look_smear_test), glowEventsOnly f09e362. look/ files in: README.md, gl.js, ground.js, index.js, kaleido.js, ohmlook.js, palette.js. Tests in: look_glow_test, look_mode_test, look_smear_test, look_tune_test.
- oldfeat (fast-forwarded by its worker): a48adf8 ... 9ec6718 (tripWorld, rare crash fix, jam minor keys, song groups grow, playTwice, songs chart fix, skyMood, eggWords, clay, egg/clay under no outlines), c22be9e bubbleCatch (OFF), c64b784 bubble catch fix.
- Merge 50e2048 of track/visuals d4a8662: dustSplit ba67926 (fixes the seed 42 dark sky cracks), RARE_LOOK.soft 99c6b04, look.legs owns rare legs d4a8662, character ohms claim their body f628a99, bench b4d2cdf. look/ files in: README.md, index.js, ohmlook.js, place.js, rare.js. Tests in/changed: look_bench_real(_core), look_claim_test, look_dust_test, look_rare_soft_test.
- GAMEDEV_SPEC section G, world side, each behind its own switch under noOutlines (all default ON, off = as before, dev toggles G1-G9):
  - 67aea12 G1 lnNodeText: nodes are soft dots; the number shows only with dev on. G3 lnOrbits: orbits are 3 soft passes (alpha x.45, a taste call: at the spec's alphas they read brighter than the old line). G4 lnBand: material band is a soft gradient strip. G5 lnCracks: terrain cracks are soft dark passes, ring glow 2 soft passes. G6 lnRain: rain fallback 2 soft round-capped passes.
  - 1e00a1d G2 diveTextDev: dive voice name, Hz labels, partial label and the D.hint line show only with dev on.
  - 99dbdf2 G7 lnRareLegs: rare ohms ask look.legs too (the `!o.rarity &&` guard in ohmdraw.js is gone while the switch is on).
  - ed7f2b0 G8 lnRare: rare placeholder rings are softRing, not dashed arcs.
  - 87a225e G9 lnBeads: when look.group drew, no song beads or playhead on top (look.group gets st.secs / bi / n; skipping the playhead too is a taste call); otherwise section, playhead and jam beads are soft dots.
- b0f85e8 oldfeat jam view (switch jamView, OFF). Its worker had not fast-forwarded it 10 minutes after it was committed, so I fast-forwarded master to it myself (master was its ancestor, nothing to resolve). It has no strokes or text.

### Cost and stills for section G
- zoom_smooth draw p95 (ms), G on / all G off / on again: ground->sky 7.2/7.3/8.7, sky->planet 4.9/3.3/3.8, sky->ground 3.6/3.1/3.7, dive in 7.5/6.7/7.3, dive out 7.1/5.9/6.1, zoom+pan 6.4/8.2/8.0, ohm->voices 7.3/7.0/7.1, voices->ohm 8.8/6.4/8.4. I reran voices->ohm with switches off one at a time, 2 runs each: none off 8.9/7.6, all off 8.3/7.7, lnBand off 7.4/7.4, lnCracks off 7.6/8.8, lnRareLegs off 7.8/7.5. That's noise, not a cost. All runs all smooth, 0 page errors.
- Before/after contact sheet (G off on top, on below): /workspace/shots_zoomfix/g/sheet_g.png; space_cmp.png zooms on the orbits.

### Gates on b0f85e8
- gates030.sh: all 18 node tests ok; pw_smoke, integration, look_bench_real, render_bench, look_rare_cost, zoom_smooth (all smooth), muffle_live (first try) ok. abilities_browser_test failed once on check 6 (deaf muffle, under gate load), then passed 3 out of 3 standalone: a flake.
- look_zoom_sweep (no blank frames, hard bands, seams or pops), look_smear_test, look_rare_soft_test, look_claim_test, look_dust_test, look_glow_test, look_mode_test, look_tune_test, look_galaxy_test, look_pulse_test, look_audio_test: all ok.
- Logs: /workspace/gates_final, /workspace/gates_final.out.

---

## Update: third pass: two song fixes, sky mood, old game TO COME list (Oct 26 2026, from about 1:46 AM MDT, Game Dev)

Go: Wilbow 1:46 AM MDT Oct 26 (fix the two found bugs, skyMood switch default OFF, carry on down TO COME oldest first). Branch track/oldfeat, no version bump, no APK, look/ untouched, master's uncommitted zoom edits untouched. Nothing removed; every new piece has a dev switch. Tuning values (minor weights, growth timings) stay as they are: Wilbow sets them.

### What's new, in play terms
- Fixed: a group that moves on to a different song now plays that song's chords (songs.js start() clears the cached chart). Test 4c.
- Fixed: drawing in the river during a grown section (A' / D / D') keeps the edit for that play only; the library song is never changed by growth. Edits in the song's own sections work as before. Test 4c.
- Sky mood (switch skyMood, OFF: a taste call): with it on, the ohms' own music leans with the sky where you stand. At night they play softer (and so darker); in deep night the tunes above the home octave drop an octave, a whole 2-bar phrase at a time. In rain they rest some of the in-between notes (up to about a third of all notes in a downpour; every downbeat still plays, and a loop stays the same loop). Your own taps are never changed. Dev panel shows night / rain and counts. Test 14.
- Egg words (switch eggWords, OFF: a taste call because the spiral then hatches ~1.5 s later instead of at once): a plain spiral leaves a small egg with a closing ring and little orbiting glyphs. Strokes that START on the egg pick the hatchling's sound: taps = a drummer (1 kick, 2 snare, 3 hats, 4 a tom, 5+ a kick with a kit; your tap timing becomes its rhythm), a wave through it = a pad (big wave) or drone (small), a circle round it = a bell / glass ringer, a flick out of it = a pluck (a fast flick = struck). The same stroke twice = a stronger version (two waves = moving pad, two circles = a long glassy ring, two flicks = a long ring). Fast strokes = harder and brighter, slow ones = soft and ambient. Five hidden pairs (wave then circle = choir, taps then wave = sample chop, flick then wave = bowed cello, circle then flick = gong, circle then taps = agogo); their glyphs glow when you are one stroke away. Each stroke extends the window; no stroke = the quick random ohm as now; an unknown stroke nudges the egg; a touch just beside it slides it aside; a new spiral hatches the open egg first; 3-finger undo removes the egg (or, after it hatched, the ohm). The sound is saved with the ohm. egg.js; test 15 + browser probe 6/7.
- Clay shaping (switch clay, OFF: a taste call, and it shares the spiral with egg words): a spiral that ENDS WITH A REST (finger held still about half a second before lifting) leaves a lump of clay instead of an ohm, with a ring that closes over ~8 s; every touch restarts the ring (20 s at most). The FIRST touch picks the family: a tap = struck (marimba, bells, steel pan...), a flick out from the edge = plucked (harp, koto, sitar...), rubbing = bowed (cello, erhu, fiddle), holding still then moving = blown (flutes, duduk, panpipe), a two-finger squeeze = voiced (choir, singers). Later touches shape it, and you hear a short phrase after each: pull the edge out (a long pull = a longer tone), dent it (more body ring), pull out points (3 or more = it leans to rhythm), a long tail (longer release), hold still to fire it (hold once = ceramic bell, twice = bronze bell, and it gets stiffer), wiggle (vibrato), pinch to grow / shrink it (bigger = lower register), a two-finger twist (detune), cut it in two (a wider, split sound), and 3 taps in a row become its rhythm. A wide shape leans bass, a tall one lead, a round one pad. Two-finger tap = freeze (the ring stops); a second two-finger tap = confirm (a rising phrase, then it hatches). A tap on empty ground also hatches it; so does the ring running out. 3-finger undo takes back one touch. Off = the held spiral hatches at once as before. Test 16, probe 8-9.
- No outlines (v0.0.30): the egg's and the clay's closing rings are beads of soft light, and the egg's hints are soft dots, under the master switch noOutlines and its lnHints switch (off = the stroked rings and glyphs as before). The clay lump and the egg are fills already.

- Catch in a bubble and carry (switch bubbleCatch, OFF: the HOME HOLD clash is open): draw a loop round ONE ohm (not yours) and lift without resting: it floats in a clear bubble, stops walking, and its own music plays softer, as if heard through the skin. Tap the bubble = pop (free). Drag the bubble = carry it about. Flick it up fast and far = farewell: the ohm leaves, and the 3-finger undo brings it back. Caught ohms come with you when you land on another planet and float next to you. A bubble is hit first (a touch on it is never the ohm's). Not saved: after a reload the ohm is just free (checked: the old game never saved bubbles either; surface.js packChunk skips bubble bodies and caught creatures). A walking ohm counts if it was inside the loop when the finger went down OR at the lift. Test 17, probe 10-11. Clashes (GESTURES.md): carry vs herd's home hold (drag, then hold still ~1 s = home): why it is OFF; while carrying, the hold does nothing for now. A loop round 2+ ohms stays herd's loop select, a rested loop stays the effect object, an empty loop stays the drum, a spiral wins first.
- Jam view (switch jamView, OFF: a taste call while the dive clash below is open): spread two fingers wide on the empty middle of a jam (two or more ohms playing together, or a song group) and it opens, the way the old game's v08 jam view did. The camera holds while you spread and the world dims behind a soft veil; the members sit round a ring. On the ring: a tap mutes that member (at once); a slide along it = its volume; a slide in or out = its octave (one per short step, two up or down at most); hold still for about half a second first, then slide = brightness. Outside the ring are its phrase marks, the notes it played in the last bar: tap one = pin that phrase (it keeps playing it over and over in place of new ones; tap again to let go), drag it onto another member = they swap phrases, drag it along = shift it earlier or later in the bar. Inside the ring are small knots for its sound items: slide = that item's amount (never adds or removes an item). Drag one member's body onto another = swap roles (who leads). The middle disc: twist its edge = change key by fifths, slide up / down in it = brighter (major) / darker (relative minor) mood. The clock band round it: go round = tempo (a full turn doubles it, half back halves it; it snaps to x2 and x1/2), slide in / out = swing. In a song group, beads show the sections still to come: drag one along = reorder them, flick one off = drop it (only that group's play of the song changes, never the library song). Two fingers on the middle: pinch in = breakdown (all but the lead and the lowest voice drop out for 4 bars), spread = build back (or, with no breakdown, everyone lifts a little for 4 bars). Pinch in anywhere else = leave. Volume, octave, brightness, pins and role swaps wait for the next bar; key, mood, tempo, swing, sections and breakdown / build wait for the next 4-bar phrase; the clock shows what is waiting. The view has its own undo: 3-finger tap = undo, 4 = redo (an undo of a waiting change cancels it; of a landed one it queues the way back). Edits stay with the jam after you leave. Plain soft look (soft dots and glows, no outlines), with look.jamView... hooks so Visuals can restyle every piece. jamview.js; test 18, probe 12-13.
- Wind rocks and reed beds (switch windRocks, OFF: a taste call), from the old game's v0.4a field: each planet grows 1 or 2 hollow rocks and 1 or 2 reed beds on its ground (the same planet always grows the same ones; gas giants have none; not saved, as in the old game). In the wind they sound on the beat, but only when an ohm is near: rocks a low breathy tone at most every 2 bars, reeds a higher one at most every bar, always on the chord sounding now; more wind = more often and a little louder. An ohm with a blown or wind voice (flutes, duduk, panpipe, accordion...) breathes on one when it stands close, so it plays even in still air, and when it is calm it drifts slowly toward the nearest one. Your own ohm, a held one, and a bubbled one never drift or blow. They sit under the ohms, soft fills only (a rock with a dark hollow, swaying reed stalks, a glow after each sound), with look.windRock / look.windReed hooks for Visuals. Home ground only. windrocks.js; test 19, probe 14. Partial: they are in the home scene, not spread along the planet as you walk; the old game's wind farmers and reeds in water are not built.
- Lenses and prisms (switch lightPlay, OFF: a taste call), from the old game's light.js / R6.5: by day the sun shines through the clear effect objects on the home ground. A bubble lens (pit) focuses it to a bright white spot on the ground below; a droplet (cho) or a shard cluster (glt) fans a 7-band rainbow, violet to red. An ohm standing in the light adds a quiet glass overtone at the light's pitch (red low, violet high, snapped to the key) to its own notes; its note itself is unchanged and your own taps are never touched. A lens spot is louder than a rainbow band. Night = no light, cloud dims it, and the sun leans across the day so the spots move. Soft glows under the ohms, with a look.lightBeam hook for Visuals. PARTIAL: no light on other materials, no reflections or shadows, no rainbows from rain or pools, no lights from star gestures. Scenery, no hit test (GESTURES line 274), so no gesture clash. Test 20, probe 15.
- Critters and rare sky events (switch critters, OFF: a taste call), from the old game's living-ground ideas: on the home ground only, fish swim in the water (by day), fireflies drift at dusk and night, and bird flocks cross when the planet has air (never on gas giants). About once a minute a rare roll can bring a meteor shower (night) or an aurora (thick air, night); a meteor plays a quiet three-note glockenspiel sparkle by 'sky'. Scenery only: no hit test, so no new gestures. They clear on a planet change or a big walk jump, and follow the walk otherwise. Pools are capped (18 critters, 6 streaks); unit cost 0.4 µs per frame. PARTIAL: sky events draw over the far ridges, not behind them (needs a sky hook in render/look), and critters don't react to ohms yet.
### Jam view gesture check (GESTURES.md)
- Pinch zoom: with jamView ON, only a two-finger SPREAD whose middle is on a jam's empty middle (off the members' bodies, no other ohm within its margin) opens the view; the camera holds while it builds. Pinching in there, and every pinch anywhere else, zooms as before (probe 12b). OFF = nothing changes (probe 13).
- Clash, dive (open): the dive takes any spread whose middle is within about 1.3 x an ohm's size + 24 px. Two touching jam members leave no middle outside that reach, so with jamView ON the jam view is asked first: a spread between jam members opens the jam view instead of diving into the nearer one. A spread centred ON a member's body still dives, and once inside a dive the dive keeps it.
- Clash, ground layers: with jamView ON, a deep spread on a jam's middle no longer zooms the camera or opens a ground layer there.
- Inside the view every finger is the view's: no river twist, fuse split, clay, bubble, egg, walk, things, flick, tap or mouth under it. 3 / 4-finger taps use the view's undo; the dev 3-finger hold still works.
- No back button exists in the app yet (V.back() is ready for one).
### Taste questions (added)
- skyMood: on or off by default? Now OFF. Preset: night softens by up to 30% velocity (starts below sky.day .6), deep night (night ≥ .7) drops melody notes an octave; rain rests up to 45% of off-downbeat notes. Should night also slow the tempo or lean minor? Not done.
- eggWords: on or off by default? Now OFF (the plain spiral then waits ~1.5 s; with no stroke it is the same random ohm). Which rows each word picks (pads / drones / ringers / plucks / struck lists in egg.js ROWS), and the five hidden pairs (EGG_COMBOS) are my picks; the hit radius 44 px and window 1.5 s are from the old spec. Not built: the tap preview sound (old F1), a per-ohm tempo from tap speed (speed now shapes timbre, plus double-time for a fast tap series), glyph marks on the hatchling's body (look/, Visuals).
- clay: on or off by default? Now OFF. My picks: the rest that marks a clay spiral (450 ms within 8 px), ring 8 s / cap 20 s, which rows sit in each family, fire = ceramic then bronze bell for every family, the role lean strength (scores 2), untouched clay = a random palette row without samples or textures, a tap away hatches even frozen clay, 3-note previews and a 4-note rising confirm. The split is only detune + width (no separate section voices yet: partial). Clay's look (texture, fire glow) is Visuals'; mine is a plain outline.
- jamView: on or off by default? Now OFF (the dive clash above). My picks: the world keeps running under the veil (the old game froze it); members are shown at ring spots (their bodies do not move); a key twist sets the key straight away on the phrase line (the old game used a 1.5x vote); mood is only major / relative minor; a role swap between two non-leads trades their volume / octave / brightness; a mute and its undo are immediate; breakdown keeps the lead and the lowest voice; build = x1.15 for 4 bars; section beads sit on an inner arc; phrase shift steps 1/4 beat (1/16 after a 0.4 s hold); an item's amount edits the sound recipe (shared by ohms that share it); entry = a spread of about 2x; the veil .62.
- windRocks: on or off by default? Now OFF. My picks (from the old game where it had numbers): 1-2 rocks and 1-2 reeds per planet; rock voice shakuhachi row, reed voice panpipe row; rocks 98-262 Hz, reeds 392-1047 Hz; sounds when drive (wind x the spot's exposure x 1.4, plus a slow gust, plus .95 from a blowing ohm within 3.2) is at least .55, with chance drive x .4 up to .75 (old: same .55 / .4 / .75); an ohm must be within 9 to hear it; a blower drifts from 5 away until 1.4 away. In the real game the wind sat at .1-.4 in the probe, so without a blower they sound now and then, not often. Should they spread along the whole planet as you walk?
- lightPlay: on or off by default? Now OFF. My picks: the lens is the bubble lens (pit), the prisms are the droplet (cho) and the shard cluster (glt); the glass overtone is a separate quiet voice (fm_glass row, ~35% of the note's loudness at most) rather than changing the ohm's own note; no light below day .3; cloud dims by up to 60%; the sun swings about .35 across the day; reach 9 units below the object.
- critters: on or off by default? Now OFF. My picks: the rates (fireflies at dusk and night, birds only with air of .2 or more, about 4% a minute for a meteor shower and 3% for an aurora), the glockenspiel sparkle on meteors, and the pool sizes (18 critters, 6 streaks).
- bubbleCatch: on or off by default? Now OFF until the home-hold clash is decided (my default when it is: a still hold on a carried bubble = set it down there). Picks: through-the-skin volume .45, flick = at least .9 px/ms up AND 110 px (old C7: 900 px/s), bubble size 1.7 x the ohm + 10 px, up to 6 bubbles, carried ones land 70 px beside you. [SUPERSEDED 3:04 AM: "Should bubbles be saved?" is answered: no, as in the old game.] Should a caught ohm also be muffled (darker), not only softer?

### Commits
- [SUPERSEDED by the rebase onto master: 207a0c9 the two song fixes.]
- [SUPERSEDED by the rebase onto master: 6720832 skyMood switch.]
- [SUPERSEDED by the rebase onto master: 3e3544c SUMMARY hashes after the rebase.]
- [SUPERSEDED by the rebase onto master: (this commit) egg words switch.]
- [SUPERSEDED by the rebase onto v0.0.30 master d02d764: 08f90fe the two song fixes.]
- [SUPERSEDED by the rebase onto v0.0.30 master d02d764: fcb8bf0 skyMood switch.]
- [SUPERSEDED by the rebase onto v0.0.30 master d02d764: 02ffb79 SUMMARY hashes after the rebase.]
- [SUPERSEDED by the rebase onto v0.0.30 master d02d764: 298c52c egg words switch.]
- [SUPERSEDED by the rebase onto v0.0.30 master d02d764: (this commit) clay shaping switch.]
- [SUPERSEDED by the rebase onto master 4c5ab9f: 03095b8 the two song fixes.]
- [SUPERSEDED by the rebase onto master 4c5ab9f: 407696c skyMood switch.]
- [SUPERSEDED by the rebase onto master 4c5ab9f: df9d5db SUMMARY hashes after the rebase.]
- [SUPERSEDED by the rebase onto master 4c5ab9f: 52f8380 egg words switch.]
- [SUPERSEDED by the rebase onto master 4c5ab9f: b52fb65 clay shaping switch.]
- [SUPERSEDED by the rebase onto master 4c5ab9f: (this commit) egg and clay follow v0.0.30 no outlines.]
- 48e7f33 the two song fixes.
- dde216d skyMood switch.
- 432c432 SUMMARY hashes after the rebase.
- c806f07 egg words switch.
- 6213538 clay shaping switch.
- a848a07 egg and clay follow v0.0.30 no outlines.
- 9ec6718 SUMMARY hashes after the rebase onto 4c5ab9f.
- c22be9e catch in a bubble and carry switch.
- c64b784 catch checks positions at the stroke's start too.
- b0f85e8 jam view switch (both stages in one commit: it was finished and tested, and was already fast-forwarded to master at 3:51 AM before the 3:54 AM ask to land the minimal stage first, so it was not split).
- [SUPERSEDED by the rebase onto master 37ecdda: (this commit) wind rocks and reed beds switch (was 14fce8f).]
- [SUPERSEDED by the rebase onto master: d5b30ce wind rocks and reed beds switch; it landed as de21c42.]
- [SUPERSEDED: (this commit) lenses and prisms switch; it landed as 34da1f6.]
- de21c42 wind rocks and reed beds switch.
- 34da1f6 lenses and prisms switch.
- (this commit) critters and rare sky events switch; the browser probe now returns the camera home before steps 14-16 (12b left it zoomed in, so those steps had been running off the home ground).

---

## Update: second pass after the v0.0.29 APK: tripWorld, rare crash fix, minor keys for jams, song groups grow, play a phrase twice (Oct 26 2026, from about 1:05 AM MDT, Game Dev)

Not in the v0.0.29 APK (that was built from 53e5c3f); on master after it, for the next build.

Go: Wilbow 1:02 AM MDT Oct 26 (double gating switch, rare.js:68 crash, carry on down the old game list). Branch track/oldfeat, no version bump, no APK, look/ untouched. Nothing removed; every new piece has a dev switch.

### What's new, in play terms
- Trippy: switch tripWorld (ON = as before). trippy.js still scales world.look.trip; when Visuals reads st.trippy and drops the three look/index.js TRP lines (236, 254, 264), they flip tripWorld OFF in the same commit so the gate is applied once.
- Rare ohms no longer crash the game under load (rare.js:68). Cause: traditions.js:140 gives every ohm a fallback rarity (wild = 1); env.js sets o.wild before the ohm is announced, so rare.js thought it was already rare and never gave it its signature sound (rareSig). Restored wild saves did the same. Rare now means rarity AND a signature (R.isRare). Test: rare_sig_test (fails on old master with the same stack).
- Jams can go minor: a jam may now travel to the relative minor (same notes, centred on the 6th) or the parallel minor (same tonic, 3rd / 6th / 7th lowered; pure JI minor in om-JI-7), and comes home on a phrase line. Only in 7-note tunings; not saved (the key never was). Switches jamMinorRel, jamMinorPar (ON). The last three journeys weigh against a repeat, so minor turns come up between the major moves.
- Song groups you watch grow too (the old game grew every jam, songs included). A group playing a song, kept in view and matched (its members' versions close, nobody muted, you not cutting in), comes back next play with a longer form that keeps the proven one whole: A A' (a varied repeat ending on a turnaround), then a development section (the opening chords a fourth up, ending on V) before the last section, then its varied repeat. A grown play that slips is dropped and the group returns to the proven form. The library song is never changed. Switch jamGrowSongs (ON).
- Play a phrase twice and the ohm takes it as its tune (old game playmode). Tap the same 4 to 8 notes on an ohm twice in a row (at least two different notes, no long pause, not switching ohm): it becomes that ohm's strongest learned pattern and long part, so its answers take that shape, it passes it on like any learned pattern, and it is saved with the ohm. A flash cue is posted ('ohm.tune', plus a glow), and undo (3-finger tap) takes it back. Motif only, not added to a current phrase (QUESTIONS 217 default). Switch playTwice (ON).
- Harder hits sound brighter: already in (dsp/inst.js:28 scales brightness with velocity on every engine). Checked, no change.

### For Visuals
- 'ohm.tune' {src, len, x, y} is posted when an ohm adopts a played tune (o.glow is bumped too); a dedicated flash is yours to draw.
- music.mode ('major' / 'minor'), music.modeHow ('rel' / 'par'), music.semi() gives the sounding scale. look/palette.js and kaleido.js still colour by the major SEMI; reading music.semi() would follow the minor.

### Taste questions (added)
- How often should jams turn minor? Now: relative weight .7, parallel .6 against the major moves (V 1, IV .8, ii .6); a mode journey waits for a fitting chord (or 8 bars).
- Parallel minor in JI uses 6/5, 8/5, 9/5. Natural minor only (no harmonic / melodic minor) for now.
- Song growth: attention needed 16 / 24 / 32 s per step, match line (average version drift) .25, cap 64 bars.
- Play twice: 4 to 8 notes, at least 2 different, gap under 6 beats; adopted tune strength = at least half of what it plays from memory. By default autojam plays it as a one-bar shape on chord tones; the exact tune note for note only plays with brain retention on (off). Should a taught tune play exactly by default?
- [SUPERSEDED: built as switch skyMood (OFF) in the third pass, see above] Day / night and weather: sky.day and weather.* are matrix sources but nothing routes them to the music by default (rain ticks and the wind bed are heard). Should night lean slower or minor, or rain darker? Not built.

### Found, not changed
- [SUPERSEDED: fixed in the third pass, see above] songs.js start() never clears G.L (the group's cached chart), so a group that moves to a different song keeps playing the old song's chords. Fixing it changes play, so it is left for Game Dev; groups that have grown get a fresh layout for each song.
- [SUPERSEDED: fixed in the third pass, see above] daw.js:99 writes river edits into s.parts[seed][section]; during a grown play the section can be A' / D / D', which then sits unused in the library song.

### Commits
- [SUPERSEDED: 6b7f780 tripWorld switch; 56aed92 rare.js crash fix; 2247092 minor keys; song groups grow (next commit).]
- [SUPERSEDED (hashes before the rebase onto the v0.0.29 release): 6b7f780 tripWorld switch; 56aed92 rare.js crash fix; 2247092 minor keys; 5a07edd song groups grow; play-twice tune adoption.]
- [SUPERSEDED Oct 26 2026: rebased again] After the rebase onto 972b3c8: b7f16b8 tripWorld switch; 9bf5423 rare.js crash fix; 09eccdf minor keys; f0bd6c4 song groups grow; 6c5d286 play-twice tune adoption; this SUMMARY commit.
- After the rebase onto ba3c768: 45462d4 tripWorld; b4bc347 rare fix; de53a3b minor; 878728a song groups grow; a3c8ff5 play twice; 246c639 SUMMARY.

---

## Update: no outlines + GAMEDEV_SPEC part 2 + section F, on master (Oct 26 2026, about 3:00 AM MDT, Game Dev)

**Not in any APK; no version bump; ships in the next build.** Wilbow: "no outlines anywhere in the project" (10:06 PM Oct 25). Every change is behind a dev-panel switch that defaults ON (`world.opts.X !== false`); the master switch `noOutlines` off gives back all the v0.0.29 strokes.

### Merge
- c5c45a8: track/visuals 2d33924 merged into master; both sides kept. The only look/ changes on master came in through this merge: tests/look_audio_test.mjs (new), tests/look_test.mjs, www/js/look/{README.md, air.js, audio.js, dive.js, ground.js, index.js, ohmlook.js, sky.js}. Game Dev edited no look/ file.

### Commits (on top of c5c45a8)
- d1734b1: soft.js helpers (noLine, softRing, softDot, softPool, ring) and all the switches + dev toggles in world.js.
- dc92673: render side. A1 lookPulse, A2 rainSkyScale, B1 lnKaleido, B2/F4 lnRidge + look.ridge (no crest line on any range, so zoom-out no longer hands over to outlined ridges), B3 lnPlanetRim + look.planetRim, B5 lnScope, B6 lnNodes, B17 lnDiscRim, B18 seaMute, C2 envSeed, D ohmPost, F1 skyDefer, landShiftEase.
- 2228fe1: B7/B9/F6 lnGroups, lnHerd, lnFuse. The gold song circles and jam rings round the bottom row are now a soft pool of light under the members (look.group first, else softPool via destination-over); the section beads and playhead stay.
- ff15299: B10-B14 lookLegs, haloMute (45% sat), lookOhmBody, lnThings. Rare ohms keep their stroke legs.
- 6500604: B19/C galaxyMute (25% sat), lnGalaxy, lookGalaxy (look.galaxy in place of the haze while A < 6).
- 3621e78: B16/F3 lnDive (soft rings, waves and scope in the dive), diveNoName (no "the ohm / its voices / partials of its body / the wave" title). Hz labels and the shaping hint are kept.
- d02d764: lnHints (mouth hint, gesture spawn mark, ensemble line, play-hit ring as soft light).
- B4 portal ring: already off via noZoomRing (136c976). B8, B13, B15: no change, as the spec says. F2: the old kaleido petals still draw only when look.layer('field') returns false, and now with no stroke (lnKaleido). F5, F7, F8: nothing for the world side.

### Taste calls (neutral option)
- (SUPERSEDED Oct 26 ~4:15 AM by section G: node numbers and dive text are now dev only; orbits, band, cracks, rain, rare legs and song beads are soft.) Kept: node labels and fill, dive Hz labels and shaping hint, orbits (thin), the material band, terrain cracks (objects, like plant stems), rain streaks (deferred when look.sky draws), rare auras, dev overlays, the DAW, song section beads, stroke legs on rare ohms.
- Herd and song marks became world-coloured soft light.

### Open, for Visuals (look/ owns it)
- (SUPERSEDED: fixed by Visuals dustSplit ba67926, on master via 50e2048.) **Dark curve lines in the seed 42 sky** come from look/place.js paintDust (lines 72-74): five crack polylines per 192 px dust tile, stroked rgba(30,24,18,.55). The tile is laid over the whole bg as a pattern by look.layerP1 in the 'over' pass (look/index.js:376-383, unhealed place.dust), called from render.js:249. Proposed fix on the look side: a grain-only dust tile, or cracks only below the land line. A world-side clip would also cut the swell sky, so nothing was changed.

### Numbers
- Cost, zoom_smooth draw p95 ms (on run 1 / on run 2 vs off): out ground->sky 7.7/8.4 vs 8.7; sky->planet 5.1/4.1 vs 4.0; in sky->ground 3.5/4.0 vs 3.8; dive into ohm 10.2/8.3 vs 7.4; dive back out 6.7/8.1 vs 7.7; zoom+pan 7.5/8.4 vs 6.9; dive ohm->voices 8.1/9.8 vs 7.9. All within run-to-run noise; on = all smooth, 0 page errors.
- Stills: /workspace/shots_zoomfix/nl/sheet_nl_final.png (top row before = v0.0.29, bottom row after). Shots: s42_day, s42_night, s42_jam, jam, far_night, s42_far, space.

### Checks on d02d764 (clean worktree)
- gates030.sh: 29 of 30 passed (incl. senses, oldfeat, dsp_bench, pw_smoke, integration, zoom_smooth all smooth, look_test all passed). muffle_live failed once (dropouts 0/7/0), then passed twice on re-run; it is flaky at baseline 0696599 too.
- look_zoom_sweep (no blank frames, hard bands, seams or pops), look_galaxy_test, look_pulse_test, look_audio_test: all ok.


## Update: zoom follow-ups on master, after v0.0.29 (Oct 26 2026, about 2:00 AM MDT, Game Dev)

**Not in the v0.0.29 APK; ships in the next build.** All new behaviour is behind dev-panel switches that default ON; each one off gives the v0.0.28/29 behaviour.

### Visuals merge (103408b, 12:54 AM)
- track/visuals 85abe87 merged into master. It brings no outlines (thing.outline false), a softer kaleidoscope, aura, role and horizon, look.pulse, look.galaxy, the sky band, ohm character, and Visuals' sky parallax readers (skyScaleOf/farScaleOf on render's st.skyScale/st.farScale).
- Conflict in look/index.js (kaleido): kept Visuals' skyScaleOf + softEdges, and master's trippy TRP() on aK and on the night veil. The skyHold readers at index.js:217/258/448 were replaced by skyScaleOf.

### Fixes
- **Dive out voices->ohm p95 creep** (7c17663, switch followPrev in dive opts):
  - Cause: followAll read back #bg in the middle of the frame, which forced a synchronous raster flush (~3 ms).
  - Fix: the follow now uses last frame's #bg, copied at the start of render.draw.
  - draw p95 10.9 -> 6.6 ms (ONLY=dive A/B). Full zoom_smooth: all smooth.
- **Land darkening, ground->sky** (136c976). Causes:
  - The planet bend stepped on the sim tick.
  - The place palette flipped off on one frame at round(z) (z -.5).
  - The real ground cut over to flat fills within ~3 frames, around z -.2.
  - Switches:
    - bendEveryFrame: bend + size come from this frame's cam.z, in render.draw.
    - ohmFadeWide: the flat ohms fade over bend 0-.65 (was linear, gone at .45).
    - placeFade: the place palette fades over |z| .2-.5.
    - groundFadeWide: the real ground fades over bend 0-.3 by sqrt(bend), about even per zoom step.
    - spaceFadeIn: the star, other planets and the home planet's shift fade in over z -.5 to -.85 (they used to pop in at -.5).
  - Results, out ground->sky: worst one-frame brightness step 13.6 -> 5.5, frame diff max 16.5 -> 11.0. In sky->ground: 7.2 -> 3.9.
  - Cost: draw p95 out ground->sky 5.6 -> 5.9 ms (interleaved A/B, inside the noise).
- **No outlines, added to the list** (136c976):
  - bentNoLines: no ridge outlines on the bent home land. These were the green ridge lines by z -.2.
  - noZoomRing: no outline on the zoom circle's edge.
- **Landing bang, sky->planet** (c6bd0e5). Causes:
  - On landing (z about -1.59), the target planet's real globe (look.planet) was replaced on one frame by the flat disc + rim.
  - All layers were re-made in the new planet's colours on that same frame.
  - Switches:
    - curGlobe: the planet you are on keeps the real globe in space, fading to the bent ridges over z -1.2 to -.6.
    - landXfade: the last frame before the landing fades out over 8 frames, on top of the new picture. It is frame-based so no ghost lingers while the zoom goes on.
  - Result: landing frame diff 16.9 -> 2.6.
  - Cost: draw p95 in sky->ground 1.2 -> 3.7 ms (the real globe draw).
  - Known: for ~8 frames you see a faint double of the globe while homeShift moves it. [SUPERSEDED: eased by landShiftEase, v0.0.30 dc92673]

### Checks
- zoom_smooth, full, all ON: all smooth, page errors 0.
- pw_smoke: PW_OK, 0 failures, zoom visual checks ok.

### Files
- Changed: render.js, planet.js (P.sizeOf), world.js (dev toggles), dive.js (followPrev).
- No look/ file was changed in these fixes.

### Contact sheets
/workspace/shots_zoomfix/land_darkening_off_on.png and landing_off_on.png.

### Still open (Visuals owns these)
- The partials->ground tile swap (look/ground.js).
- The pale rectangles in the zoom circle.
- The kaleido jump at z about -2.008.
- Ohm re-bakes.
- Faces surviving to q2.

## Update: deaf muffle on master, after v0.0.29 (Oct 26 2026, about 1:50 AM MDT, Game Dev)

**Not in the v0.0.29 APK; ships in the next build.**
- **In player terms:** drive an ohm that is hard of hearing (about 1 in 4 ohms) and you hear the world through its ears, muffled like it's underwater. The highs go first, and the deafest ohms (about 1 in 50) muffle hardest. Swap to a sharp-eared ohm and the sound opens back up over about half a second, with no click.
- **How it works:** senses.js maps the hear gene to deafness, starting below .25 hearing and reaching .85 muffle at zero hearing. The audio worklet runs a master 2-pole low-pass that sweeps from 18 kHz down to 600 Hz. At .85 muffle, 6 kHz drops 29 dB and 150 Hz drops 0.2 dB. At 0 the filter is bypassed bit-exactly. It also publishes sim.muffle.amt, so audiosig's muffle signal for the look is live now.
- **Switch:** deafMuffle (default ON).
- **Speed:** dsp_bench measures the muffle at 1.3 to 9.7 us per block, under 0.4% of the block budget; the gate fails above 20 us. The live worklet A/B (muffle_live_test: 3 cycles of 2 s open and 2 s muffled) shows the same load muffled as open, and no extra dropouts. Headless overrun counts are bursty when the box is busy: on 1 of 6 runs, with load average 5, it measured 34 open vs 51 muffled. So the dropout check is now relative, and dsp_bench is the exact cost guard. The filter state is flushed when it goes near-silent, so long quiet stretches can't produce denormals.
- **Gates:** /workspace/gates030.sh is gates029 plus senses_test, oldfeat_test, dsp_bench and muffle_live_test. All 26 passed on the first run, with no reruns.
- **Commits:** 5a9c2c0 dsp muffle + bench, 18cf57d senses + test, 4182506 main wiring + abilities_browser check 6 + live test.
- **Taste (unnumbered):** what blindness should look like (a look/ effect, not built).

---

## Release: v0.0.29 (versionCode 29) on Drive (Oct 26 2026, about 1:35 AM MDT, Game Dev)

- **APK:** JourneyOhm-v0.0.29.apk, 4,075,519 bytes, sha256 f0df626cdd353f63..., signed with the lensure upload key (cert db171c70...dc7d1f), appId com.lensure.journeyohm. Drive "Resonance overnight": https://drive.google.com/file/d/1EyY3jmW2uwQ47Tl1TRUPmfPRqUN4yV9G/view?usp=drivesdk
- **Built from** 53e5c3f + the version bump (6313008 on branch build/v0.0.29, cherry-picked to master as b9229c2), in a separate worktree so other workers' commits on master could continue. Visuals' zoom sweep passed on 53e5c3f. Later master commits (7c17663 dive followPrev onward) are NOT in this APK.
- **Contents:** everything from the v0.0.28 section below (special abilities wave 2, cloud gas giants, node-taps test fix) plus the v0.0.29 zoom fix + sky hold, trippy gating and audio signals sections above. v0.0.28 was never shipped (number skipped).
- **Gates** (gates029.sh on the worktree): all 22 pass on the first run, no reruns needed; zoom_smooth reports 2 gestures flagged (informational, rc 0).
- The staged APK copies on the box were deleted after Drive confirmed the upload (size and folder).

---

## Update: v0.0.29 zoom fix + sky hold (Oct 26 2026, about 12:55 AM MDT, Game Dev)

Go: Wilbow 11:43 PM "Zooming creates graphics issues" (reproduced on v0.0.27 0817fd9, fixed on master); 12:12 AM "If the pinch zoom includes the sky and the ground it looks too wierd. But keep this effect to be used as an accent".

### Defects fixed (all switches ON, in world.zl.dive.opts / dev panel)
- **Dives went black, ohms left trails** (dive into ohm / back out / ohm->voices). Cause: the dive stopped repainting the world canvas while the camera moved. Fix: followAll (c014116). Frame diff max 40-122 -> 6-12.
- **Land popped to flat fills zooming out of the ground** (ground->sky). Cause: the real ground faded out and the far detail tier switched abruptly. Fix: realGroundFade, zoomSameDetail, heightBack (e0f3532). Diff 27.4->16.6 (q0), 32.5->15.6 (q3), 25.4->12.5 (4x throttle).
- **Hard horizontal kaleidoscope cut in space views** (sky->planet and beyond). Cause: the ground clip line was applied in space too. Fix: kaleidoSpaceWhole (77a3b58, look/index.js:245). Neutral choice: draw it whole in space, so the lower petals now show there.
- **One-frame flash diving partials<->wave**. Cause: the back layer snapped. Fix: backSmooth (d24fd86). Diff 22->9 and 23->3.

### Sky hold (Wilbow 12:12 AM)
- skyHold ON: on the ground pinch the ground, ohms and things scale; the sky moves only 15% (skyPar .15), far ranges 50% (farPar .5). Blends smoothly to full scale between z -.15 and -.85 (skyHandFrom/To) on the way to the planet; no snap (max step .04). Ground->+1 diff 15.4 with hold vs 21.0 off.
- zoomAccent OFF: the old whole-picture zoom, kept as an accent (also world.zoomAccentK 0-1 for a future trigger; nothing triggers it yet).
- render passes st.skyScale / st.farScale to look/; skyHold off is bitwise v0.0.28.

### Checks
- zoom probe: new skyJ (sky snap) limit 0; pw_smoke: zoom visual check (frame-to-frame change and black share per gesture) + sky hold block.
- Gates (gates027.sh on c2d259e): all pass except one pw_smoke run where "dive out partials->ground one pinch" had 11 slow frames under box load; two reruns fully pass (PW_OK). zoom_smooth all smooth, hitch 0, skyJ 0.
- render_bench draw mean home 0.92, zoom .5 1.83, 1.5 1.78, -1.3 2.11 (reruns 1.26-1.84), 3.4 1.46 ms; frame p95 16.7. look_bench_real q0 2.63/3.0, q1 1.72/2.4, q2 1.14/1.8, q3 0.64/0.9.
- 4x throttle: dives' measured draw rose about 4.5 ms with followAll (the forced world repaint is inside the timed section), frame interval unchanged, hitch 0.

### look/ lines changed
index.js:245 (kaleidoSpaceWhole), 217 and 258 (kaleido uses st.skyScale), 448 (look.sky uses st.skyScale). *(Superseded Oct 26 2:00 AM MDT: the 217/258/448 readers were replaced by Visuals' skyScaleOf in the merge 103408b, see the follow-ups section above.)*

### Open
Ground->sky land darkens briefly (frames 64-66); partials->ground tile swap; sky->planet landing bang; pale rectangles inside the zoom circle (pre-existing). *(Superseded Oct 26 2:00 AM MDT: the land darkening is fixed in 136c976 and the landing bang in c6bd0e5. The tile swap and the pale rectangles are with Visuals.)*

### Commits
c014116, e0f3532, 77a3b58, 3d0b29c, d24fd86, 4e3a155, c38434c, c2d259e. Contact sheets: /workspace/shots_zoomfix/.

---

## Update: v0.0.29 work, old game features + trippy gating + audio signals for the look (Oct 26 2026, about 1:45 AM MDT, Game Dev)

Go: Wilbow 12:23 AM MDT Oct 26 "The trippy visuals are obscured for the beginning of the game. The visualizer connections to the audio engine are retroactive to the build time order"; 12:24 AM "Just push the next run. BUT ALSO. INCLUDE OLD GAME FEATURES NOT IMPLEMENTED". Built on track/oldfeat (worktree /workspace/resonance2-wt/oldfeat), gates passed, then fast-forwarded to master. No version bump, no APK in this step. Nothing removed; every piece has a dev switch, off = v0.0.28.

### What's new, in play terms
- **Trippy visuals start hidden** (trippy.js, switch trippy ON): a new game starts at 5% trippy and it opens up as you play. Three switches to try (Wilbow didn't pick): trippyHarmony (opens with the harmony you bring back), trippyTravel (opens with the furthest scale you reach: ground, planet, star system, galaxy), trippyBoth (DEFAULT, either one opens it). It eases, never pops; a dev slider pins it. Visual only (the sound never sees it). Old saves start from what they already reached.
- **Jam roles** (jamroles.js, jamRoles ON): in every jam one ohm is out front and the others follow. The front tires and hands over on a phrase line to the freshest, most eager member (bold / social, experienced). Followers answer thinner and softer, taking the front's rhythm. In a crowded jam the most tired follower steps back and listens (eyes on the front), holding one soft chord tone, so it never stops harmonising (R3.24). No fixed leader ("Lead is a freeze", 2:22 AM Oct 25).
- **Jams change key** (jamkeys.js, jamKeys ON): after about 24 bars at home a jam travels to a close key (V, IV or ii; the members' own home keys choose, seldom the same twice), always through a chord both keys share, and comes home after about 16 bars. You can still push it anywhere; nobody playing = nothing moves.
- **Jams you watch grow** (jamgrow.js, jamGrow ON; V07 E): keep a jam on screen, near the middle, without panning away; while both are in time together and in key, its loop grows 2 -> 4 -> 8 -> 16 bars, keeping the old loop inside the new one (A, A A', A A' B A''). A new part that slips is dropped (back to what worked); every few passes one bar gets a small try (kept if it holds). Growth gives the members experience.
- **Own instrument vs learned sounds** (learnvoice.js): up to three learned sounds (learn3 ON, was two) under the ohm's own birth sound, which always keeps the larger part; a learned sound comes forward while the ohm plays near the one it learned it from (learnCtx ON, Wilbow 9D). The rare clean solo of a fully learned sound is built but OFF (learnSolo, taste).
- **Conducting** (conduct.js, conduct ON; conductGesture OFF): raise the baton and the ohms in view watch you and wait; down / up beats set the tempo (snapped to synced steps, the upstroke is the upbeat), hand height = loudness, a stroke through an ohm cues it, a sharp flick down cuts them off, lifting releases. The touch binding is off because it is the same touch as "shape the ground with your voice" (GESTURES.md row 21).
- **Crazes** (craze.js, craze ON; extends traditions / placeTrad, no second store): when a hook catches, the tune spreads ohm to ohm (curious, social ohms pick it up, a little wrong); once 5 ohms have played it, it is the planet's tradition.

### Field names settled with Visuals (12:53 AM Oct 26; this replaces the lookCtx names below)
- `st.trippy` (0..1; missing = 1 for old callers; a new game starts at .05): set every control tick on render's per-frame state `st`, the same object that carries st.skyScale / st.farScale (render.js exposes it as `render.st`, one added line). Visuals multiplies the kaleido veil and petals, the music colour as light and the sky bands by it in look/. Game Dev computes it and owns the switches + the slider only.
- `st.audio`: the audio-signal object, one sub-object per system: `st.audio.om`, `.notes`, `.strings`, `.bars`, `.membranes`, `.jam`, `.arc` (the song arc; was `.song`), `.trad`, `.abilities`, `.muffle` (+ `.trippy` copy). Fields as listed below. lookCtx.audioSig / lookCtx.trippy remain as read-only copies of the same values.

### For Visuals: lookCtx.audioSig (audiosig.js) [SUPERSEDED 12:53 AM: the name is st.audio; .song is .arc]
One read-only object, `st.audio` (also lookCtx.audioSig and JO.audioSig), updated on the control tick (~40 Hz), every field present from the start. Sections in build order:
- `om` { level, hz, heart, drone }: om hum level (planet hum voices), the om's Hz, heartbeat onset, om drone level
- `notes` { onset, level, pc, deg, oct, rate, bright, damp, id, x, y }: ohm notes; pc = pitch class above the om (0..11); bright / damp = the last noting ohm's timbre
- `strings`, `bars`, `membranes` { onset, pc, rate, id, x, y }: drawn instruments
- `jam` { on, pairs, beat, phase, bar, down, chord, chordOn, key, keyOn, frontOn, front, grow, growOn }: jams and the beat (down = downbeat onset; chord / key changes; front hand-overs; watched-jam loop length)
- `arc` { on, phase, progress, section, sectionOn, hookOn, endOn, breakdownOn, discord }: the song arc
- `trad` { id, cycle, step, steps, accent, crazeOn, tradOn }: traditions (rhythm cycle) + crazes
- `abilities` { onset, kind, rate, x, y }: special abilities (kind = 'echo', 'metro', ...)
- `muffle` { amt }: the deaf muffle, 0 until the muffle filter lands (reads sim.muffle.amt)
- `trippy`: the trippy gate (0..1)
Onsets are 1 on the event and decay (tau .25 s); rate = events per second (about 1 s smoothing). Cost about 2 us per update.

### look/ edits (Visuals owns look/; minimal, listed in full)
look/index.js: line 217 adds `TRP()` (reads ctx.trippy, unset = 1); line 235 the kaleidoscope's `aK = Math.max(bigS, KS.alpha) * TRP()` (veil, lit lines and ohm rings); line 245 the night veil `* TRP()`. Nothing else in look/. [SUPERSEDED 12:53 AM: Visuals owns these lines; their merge (track/visuals 94f11f1) makes TRP read st.trippy and applies it to the veil, petals, music colour as light and sky bands. Game Dev does not edit look/]

### Other code touched (hooks only)
autojam.js (emit: jam roles; turn: grown loop), songs.js (melody order / breakdown lead = the front; a stepped-back member holds a soft chord tone), music.js (H.lean: key journey vote), sound.js (world.soloFor: learned solo voice), input.js (with conductGesture ON the still two-finger hold is the baton), main.js (wiring + switches). render_bench now loads with ?trippy=1 so it still measures the full look.

### Gates (/workspace/gates_oldfeat.sh = gates028 + oldfeat_test + oldfeat_browser_probe)
All pass (pw_smoke, integration, abilities browser, zoom_smooth "all smooth", look_bench_real all rungs within budget: q3 worst 0.66 ms / 0.90). New: oldfeat_test (headless, 50 checks) and oldfeat_browser_probe (the app loads clean, trippy starts at .05, override works).

### Speed
taskprof (idle at home, 20 s, 4x CPU throttle): master 1852 tasks, 43 over 14 ms, worst 39.2 ms; with this work 2050 tasks, 39 over 14 ms, worst 30.2 ms (the hidden kaleidoscope draws less at the start). Per piece: jam roles 0.06 ms a bar, jam grow under 0.01 ms a bar, trippy 0.002 ms a tick, audioSig about 2 us a tick, control tick 0.64 ms total.

### Taste questions (for Resonance to number; defaults are OFF or as built)
- Trippy opening: which way should it open, A with the harmony you bring back, B with how far you travel, C either (default)? And how fast (now roughly half open after 10 minutes at home, a rough estimate from a short run)?
- Conducting gesture: the two-finger still hold is already "shape the ground with your voice". A conducting gets the hold, B ground shaping keeps it and conducting gets another raise, C context (conduct only when a jam is playing in view).
- Learned sound solo ("Alone, but rarely", Q10 / Q182): A a fully learned sound sometimes plays a whole phrase on its own (built, off); B only ever blended.
- Lead: the old jam-band style "a leader passing the lead" is built as a rotating front with no fixed leader. A keep; B no front at all (everyone equal, as v0.0.28).

### Old game list status
Full row-by-row table: audits/oldfeat_2026-10-26.md (IN / PARTIAL / TO COME). Next to build from it: the egg stroke grammar (gesture clash first, GESTURES.md row 22), play-a-phrase-twice adoption, symbols (infinity bond, star), moods.

### Commits
b893dcd trippy gating; 20a635b jam roles + key journeys + watched jams grow; 23f0e9b learned sounds; 64055ed conducting; 469e034 crazes + audioSig; f40fac3 main wiring + tests; plus this SUMMARY / GESTURES / audit commit.

---

## Update: v0.0.28 special abilities wave 2, cloud gas giants, node taps fixed (Oct 25 2026, about 11:55 PM MDT, Game Dev)

Go: Wilbow 9:35 PM "continue building approved features/systems to test unless directed"; 11:18 PM plan: fix the node-taps cause, build the remaining no-taste abilities (ABILITIES.md order), check the reservoir. Questions are held by Resonance (unnumbered). Build held at 11:44 PM so the zoom-graphics fix (Wilbow 11:43 PM) ships in the same APK.

### What's new, in play terms (all switches ON)
- **Conductor** (lead + precision): ohms playing near it swell and soften together over 8-bar phrases, and it closes each phrase with a little cadence (5th then home).
- **Composer** (creativity + memory): when it's quiet and you're close, it makes up a short 4-note tune; a nearby ohm picks the tune up 2 bars later, and it can travel 2 hops.
- **Weaver** (build + elastic): spins a string you can play in the air above itself (one per weaver; saved).
- **Memory keeper** (memory): every 32 bars, if no song is playing near you, it brings back the oldest song from your library.
- **Gravity** (buoy + mass): moving ohms close to it swirl around it and drift in.
- Abilities now: about 1 ohm in 15 carries one (12 of 25 live).
- **Cloud gas giants** (R5.12): on a planet that is mostly gas, most ground ohms float up into the cloud (1 to 2.6 above the ground); off a gas giant they settle back.

### Switches
abilities, ab_echo, ab_pitch, ab_metro, ab_mimic, ab_overtone, ab_dream, ab_storm, ab_conduct, ab_compose, ab_weave, ab_memkeep, ab_gravity, gasFloat: all ON.

### Gates (gates028.sh)
All pass, including pw_smoke node taps (3 of ours out of 8 events in the window) and the new gasfloat_test + abilities_browser check 5. zoom_smooth flags 1 gesture (the zoom fix is in progress separately). [SUPERSEDED Oct 26 12:55 AM MDT: zoom fix landed, zoom_smooth all smooth; see the v0.0.29 zoom fix update above] Speed: taskprof (20 s, 4x throttle) 1617 to 1794 tasks, 51 to 54 over 14 ms, worst about 38 ms (v0.0.27: 1713 / 56 / 39.8). look_bench_real q0 2.42 (gate 3.0) to q3 0.68 (gate 0.9).

### Node taps cause
Not abilities and not a flake: the commit before abilities fails too (11 events). The check counted every note event in a 450 ms window from any source; song-chord drains (songs.js, v0.0.25) and wind level events land there. The test was wrong: it now counts only events whose source is your ohm (exactly 3, degrees 1,2,3) and lists the others.

### Blocked / taste / skipped abilities
Blocked (system missing): 6 light singing, 8 levitation, 9 conducting tempo part, 12 glassmaking, 13 tide calling, 14 storm lightning, 15 seed carrying, 16 phasing, 18 healing, 23 void walking, 25 time stretching. Taste: 7 resonant shatter, 17 symbiosis, 20 colour shifting. Skipped: 21 budding (Wilbow).

### Reservoir
Regional keys in light: NOT covered by the region tradition lean (that only weights instrument choice); deferred with planet regions. Colony duels: taste (no rules). Blind / deaf muffle: approved, next audio wave. Glyph tiers, void walkers, moon settlers: blocked. Details: audits/gap_2026-10-25_night.md.

### Commits
0dc0752 node taps fix; 982e9b1 abilities wave 2; e1ca01a main wiring + browser test; b5cf238 gas giants; 16d2fbb gas giants wiring; 7c3b661 audit.

### APK
Held for the zoom fix (parent 11:44 PM). *(Superseded Oct 26 1:35 AM MDT: v0.0.28 was never shipped; its work ships in v0.0.29, see the release section above.)*

## Update: v0.0.27 special abilities, wave 1 (Oct 25 2026, about 11:20 PM MDT, Game Dev)

Go: Wilbow 9:35 PM "continue building approved features/systems to test unless directed"; 10:40 PM plan: question statuses from Resonance, the integration flake, an audit of the approved-but-unbuilt reservoir (audits/gap_2026-10-25_night.md, new section), then build the most valuable no-taste items. Top of the list: R5.4 special abilities (softsound/ABILITIES.md, "ALL 25 APPROVED by Wilbow (Oct 21 2026)", restored by the 10:34 AM rollback). Built 7 of the 25, the old mechanism unchanged.

### What's new, in play terms (switch 'abilities' ON, plus one switch per ability, all ON)
- About 1 ohm in 25 is born with a special ability, from a rare mix of its genes (each one about 0.6% of ohms). No labels: you notice it by how it sounds and moves. Stronger the further its genes are past the line. Children inherit it: two carriers always pass it on, one carrier about 1 time in 4. Existing ohms don't change (the ability genes are a separate part of the seed).
- Echolocation (ab_echo): an ohm with poor sight and sharp hearing gives a soft click every 2 bars with a faint ring; ohms the ring reaches glow and it drifts toward the nearest.
- Perfect pitch (ab_pitch): ohms near it are pulled back into tune (the matrix pitch push shrinks).
- Living metronome (ab_metro): while it plays it ticks a quiet steady beat, and nearby ohms stop leaning ahead / behind the beat as much.
- Mimicry (ab_mimic): play a phrase near it, stop, and a bar later it plays your phrase back in its own voice.
- Overtone singing (ab_overtone): each of its notes carries a quiet note an octave and a fifth up (two notes at once).
- Dream singing (ab_dream): at night, when it isn't playing, it hums a slow low note every 4 bars.
- Storm singing (ab_storm): when it plays near you, rain comes in; it clears when it stops. (Lightning from ABILITIES.md is not built: no lightning in the engine yet.)

### Speed
Idle at home, 4x CPU throttle, 20 s: worst task 39.8 ms, 56 tasks over 14 ms (in line with v0.0.26; abilities adds no measurable self time). look_bench_real worst frame: q0 2.45 (gate 3.0) | q1 1.94 (2.4) | q2 1.19 (1.8) | q3 0.69 (0.9).

### Gates (gates027.sh = gates026 + abilities_test + abilities_browser_test)
All pass except the known pw_smoke "node taps" flake (another ohm's notes land in the 450 ms window; no ability notes were among them). Integration OK in the gates and 2 direct runs. The live abilities test had one miss in the gates (listened for under 2 bars); it now listens about 3.6 bars, OK 3 of 3. *(Superseded v0.0.28: not a flake. The test counted every note event from every source; song-chord drains (v0.0.25) and wind level events landed in its window. It now counts only your own ohm's events, exactly 3.)*

### Question statuses (from Resonance, 10:40 PM)
394-400 are final; 401 is the next free number. 335-337 are open again (never answered). 372-376, 378, 379, 381-384 are tuning values Game Dev sets behind switches, not questions for Wilbow. 377, 380, 385, 386 are held to ask him. New questions below are unnumbered, for Resonance to number.

### Not built (reasons in the gap audit)
The other 18 abilities; colony duels; symbiosis and water carrying (the fuse / carry gesture clash); blind / deaf genes; creatures changing the beat (one shared clock); catch / ark (the home hold clash); budding (clashes with no-mutation); lens / prism and 3D moments (look/).

### Taste questions (unnumbered, for Resonance to number)
- Which abilities next, and in what order? (18 left, e.g. conducting, composing, healing, memory keeping, colour shifting, time stretching; several need things not built yet: light beams, levitation, phasing, void walking.)
- Echo ring look: a thin pale ring is built (outside look/). Keep it, or have Visuals restyle it?
- Budding (ability 21, approved) with no mutation (R1.3): a lone parent buds an exact clone. A build it that way; B wait (clones could crowd a world).
- Creatures that change the beat (R3.23) vs one shared clock: A never; B only inside your own jam; C a small world-wide lean.

### Build
- v0.0.27 (61da775; features 979bae8, bb37000): https://drive.google.com/file/d/1Lng2RNjKKdUMBSI1-04SVp-xvjfI5XA9/view?usp=drivesdk (signed com.lensure.journeyohm, versionCode 27, cert db171c70...dc7d1f, 4,017,284 bytes)

---

## Update: v0.0.26 your drawn shapes come alive, bystanders watch (Oct 25 2026, about 10:55 PM MDT, Game Dev)

Go: Wilbow 9:31 PM "Continue builds according to plan" and 9:35 PM "continue building approved features/systems to test unless directed". Batch from the 9:56 PM plan: a line-by-line check of the drawn instruments against V08 section P (approved 3:19 AM Oct 23) and the Music Theory end limits, with every gap filled behind a switch; q1-q3 re-profiled; bystanders finished. Full check: audits/drawn_instruments_P_check.md.

### What's new, in play terms (every item has its own dev-panel switch, all ON)
- Ohms play your shapes (shapePlay, P5): an ohm within about 300 px of something you drew may play it, on the beat, in its own way. Pluckers pick strings, drummers strike bars and drums, bowed and blown instruments hold long notes, and singers sing at a shape until it rings back. Each ohm decides once every 4 bars, only on screen, and leaves the shape when it wanders off.
- Ensembles (ensembles, P6 1-4): draw 3+ parallel bars and they become a marimba row (long = low, tuned bar overtones). 3+ parallel strings become a harp tuned to the chord playing now. 3+ drums close together become a drum circle (big = low beat, middle = back beat, small = off-beats). A string or bar of 300 px or more snaps to home or the fifth and becomes a drone rod that 2+ bowers hold. Each new ensemble glows once and plays a rising sweep.
- Shapes lean the jams (shapeLean, P7): nearby ohm jams sometimes borrow (up to 1 phrase in 3) the melody your shapes have been playing. The pull fades within 8 bars of a shape going quiet.
- Quieter crowds on shapes (shapeCap): at most 4 shape notes ring at once from ohms or wind bumps. Your own taps and drags always sound.
- Size limits on drawn shapes (absLen): dragging an end keeps a shape between 24 and 1200 px.
- Bystanders (bystanders, R3.8): ohms near a jam that aren't in it stop, turn their eyes to it, and slowly learn its patterns and sound. Tap to join / mute (Q338) is still open.
- Smoother bar lines (geneMemo): a burst of song notes reuses the same synth answer for the same genes.

### Speed (Playwright headless, 4x CPU throttle profile with 10 drawn shapes + 2 ensembles; look_bench_real)
- Worst control-tick task: q2 62.7 -> 36.2 ms (geneMemo; voicesFor -> fromGenes was about 10 of 45 ms in one song-notes burst). q1 and q3 worst tasks (35-50 ms) are now one-time look bakes / a first ohm sprite upload (look/, not touched) and song-note bursts of about 30 ms.
- look_bench_real worst frame: q0 2.57 (gate 3.0) | q1 1.77 (2.4) | q2 1.16 (1.8) | q3 0.63 (0.9). One parallel run showed q1 2.51 OVER; 3 serial reruns gave 1.77-1.85.
- Rare look: 0.62 ms/frame with tradAura stage 1 on for the bench (tradAura stays OFF in play). Visuals: nothing approved is waiting to be merged.

### Gates (gates026.sh = v0.0.25 gates + drawn_p_test, answers_test, step5_test, autojam_test)
All pass, except the known pw_smoke "node taps" flake and one new intermittent integration failure: "4 a library song replays near you" (no free ohm near you to start the replay; 1 of 5 runs; 3 reruns OK). [SUPERSEDED v0.0.27: cause = the test's random layout (every ohm already in a group, the nearest group just past 2x reach), not bystanders (watching 0); the test now steps next to the nearest group in that case, game rule unchanged (ef3175a)] *(Superseded v0.0.28: not a flake. The test counted every note event from every source; song-chord drains (v0.0.25) and wind level events landed in its window. It now counts only your own ohm's events, exactly 3.)*

### Not built (reasons in the P check)
Chaining strokes into one instrument; pinch to bend a shape (two-finger pinch is the zoom gesture); stroke shape leaning the voice; ensembles 5 and 7-12 (proposed only); tempo lean (one shared clock); ohms walking to shapes; the look/rare.js eyes still look where the ohm is going (look/ is bug fixes only).

### Taste questions (unnumbered, for Resonance to number)
- Shapes leaning the jam's tempo: everything shares one clock locked to the om, so a tempo lean moves the whole world. A no tempo lean; B allow a small world-wide lean; C lean only inside your own jam.
- Should ohms walk over to play your shapes? A yes, slowly; B only ones already nearby (as built); C only when you call them.
- Rare ohms' eyes (look/rare.js) don't turn to a jam they watch yet: A make them turn too (look/ change); B leave as is.
- Rows with no playing style (e.g. sample_chop): A they never play shapes (as built); B they strike; C they pluck.

### Questions numbering
The 7 questions added tonight are labeled "provisional 394-400, Resonance to renumber" (gap audit updated; line in the v0.0.25 section marked superseded). [SUPERSEDED v0.0.27: Resonance confirmed 394-400 as final; next free number 401]

### Build
- v0.0.26 (62bcf73; features b43198f, 08314eb, 5 later commits): https://drive.google.com/file/d/1CxIkFwxnXiWUht4Mq99fNfdQv0Bpypwr/view?usp=drivesdk (signed com.lensure.journeyohm, versionCode 26, cert db171c70...dc7d1f, 4,013,113 bytes)

---

## Update: v0.0.25 smoother music, your songs as traditions, haptics (Oct 25 2026, about 9:50 PM MDT, Game Dev)

Go: Wilbow 9:31 PM "Continue builds according to plan", 9:35 PM "continue building approved features/systems to test unless directed...", 9:36 PM "Make sure summary stays updated". Nothing was removed or turned off. Every new piece has a switch in the dev panel (hold top-left), all ON; OFF gives v0.0.24 behaviour.

Team feedback loops (Wilbow 9:42 PM): see /workspace/resonance2/TEAM_LOOPS.md.

### What's new, in play terms
- Smoother music: the small stutters on bar lines are gone. A song's next bar now goes out note by note a beat ahead instead of all at once (switch sSpread); sound messages from one moment travel together (aBatch); shaping many ohms is spread over several ticks (mSlice); the sky kaleidoscope prepares its rings one at a time in spare moments (kSplit).
- Your own songs become a place's tradition: a song you play 3 times on a planet becomes its tradition. Resting groups there now pick it up about 40% of the time, the members learn it (each a little off), and babies inherit their parents' traditional songs, a little further off again (switch placeTrad).
- Haptics: the phone buzzes like the old game did, on a spawn, a birth, a mouth, a jump, a crack, big moments and the dev-panel hold, never closer than 120 ms (switch haptics; Q339 on what should buzz is still open, this is the old set).

### Speed (Playwright, 4x CPU throttle profile and look_bench_real)
- Worst main-thread task, home idle with songs playing: 90.7 ms -> 46.1 ms (what's left is a one-time dust sprite bake). Kaleidoscope step ~21 ms, was the whole 58 ms raster.
- q0 worst frame 2.37 ms (gate 3.0, was 2.44); worst idle bake slice 7.0 ms (was 11.1).
- All gates pass: pw_smoke (only the known node-taps flake), integration, rare, traditions, dive, gesture, look_test, look_aura_test, systems_test, look_bench_real, render_bench, look_rare_cost, zoom_smooth; new tests place_trad_test, haptics_test. *(Superseded v0.0.28: not a flake. The test counted every note event from every source; song-chord drains (v0.0.25) and wind level events landed in its window. It now counts only your own ohm's events, exactly 3.)*
- answers_test fails 2 checks on v0.0.24 too: it still expects the role TEXT labels that have been off by default since v0.0.23. Not a gate; the test needs updating. [SUPERSEDED v0.0.26: answers_test updated, now expects role text off by default; passes and is a gate]

### Gestures
Nothing new was added and nothing depends on the home hold vs fuse press vs carry pickup clash (GESTURES.md). The dev-hold buzz only reacts to the existing hold.

### Still approved, not built (full list: audits/gap_2026-10-25_night.md)
Spending harmony (held, Q341), tap to join / mute a jam (Q338), glowing ink (Q340), heartbeat and om drone default (Q342), collecting ohms for a home (needs a gesture), the path of discoveries (trail off until you choose), text-free hints, play/listen swap, molecule and cell scales, the drawn-instrument line-by-line check, and two old buzzes (walk heartbeat, water tap) that need systems the new engine doesn't have yet.

### Open questions as of 9:50 PM (checked against QUESTIONS_FOR_WILBOW.md)
338-340, 342-344, 347-349, 361-371, 388-393, plus the harmony half of Q341 (the zoom half is answered: "Slow it and thats all"). New tonight: 394-400 (in the gap audit). Also unmarked in the file but held or already defaulted: 336, 337, 372-376, 378, 379, 381-384. [SUPERSEDED v0.0.26: these 7 are provisional 394-400, Resonance to renumber] [SUPERSEDED v0.0.27 (Resonance 10:40 PM): 394-400 final; 335-337 open again (never answered); 372-376, 378, 379, 381-384 = tuning values Game Dev sets behind switches; 377, 380, 385, 386 held to ask Wilbow]

### Build
- v0.0.25 (5fc9b91; features 0c8f954, 6b3e199): https://drive.google.com/file/d/1HA7IclNkxqV707xnFy_06AH9KuqPCs8L/view?usp=drivesdk (signed com.lensure.journeyohm, cert db171c70...dc7d1f, 4.0 MB)

---

## Update: v0.0.24 smooth zoom at every scale (Oct 25 2026, evening MDT, Game Dev)

Wilbow, 6:26 PM: "make sure we keep that smooth zooming and panning between layers of space scale"; 8:22 PM: "The smooth zoom should apply to zooming into ohms as well as all other scales". Nothing above was removed.

- Every zoom and pan (ground, sky, planet, star system, galaxy, the dive into an ohm, voices, partials, wave, and back out; pans and zoom+pan) now uses the same snap-zoom feel with no screen switch. Every new behaviour is behind a dev-panel switch that is ON (smooth) by default; OFF gives v0.0.23 behaviour.
- camFrame (world.opts): the space camera snap and the dive camera step once per drawn frame instead of on the music control clock, which removes the frames where the zoom stood still (snap judder).
- worldFollow (dive.opts): between the ground and the voices layer the world behind zooms WITH you into the ohm (render.js magnifies the live world frame about the ohm), and the ohm glides back to its spot in the world going out. Removes the jump on leaving and the "world holds still" switch feel. Cost: about 1 ms per frame while diving.
- magnetEase (dive.opts, .3 s): after you let go, the focus magnet eases in instead of tugging at once. gvTau (.05 s): the release speed is a time-weighted average, which stops the stray drift after a two-finger pinch.
- Incremental bakes: sky (look.sky SKY_OPTS inc / bakeMs 1.2 / starsPer 48, world.opts.skyInc) and terrain warming (terrWarm, terrWarmMs 1.5) are spread over idle frames instead of one long frame.
- Probe: tests/zoom_probe_core.mjs now covers 26 gestures (all space layers in and out, three pans, zoom+pan, every dive layer in and out, glides, one-pinch dives) and also checks snap judder ('hitch'). pw_smoke runs it all and checks the switches default ON.
- Kept unchanged: dive sound shaping, rare looks, role cues, tradAura (OFF by default), INSTRUMENT_PALETTE checks.
- APK v0.0.24 (versionCode 24, code 6f66e0e, bump 1b02c15), signed db171c70: https://drive.google.com/file/d/1Bok4dvB6Kn0uIGB1g7ap_7IldBUVZ-1H/view?usp=drivesdk

## Update to master d790f00 (Oct 25 2026, about 5:30 PM MDT, Game Dev)

This section brings the summary up to date. Nothing above was removed; old items now out of date are marked [SUPERSEDED] in place.

### Builds since v0.0.15 (all in the Drive folder "Resonance overnight")
- v0.0.16 (56457d9): an instrument for every ohm (73-row palette, gene-driven), learning drift, far ohms play their own instrument (not bells), sample chop + granular; systems: river DAW, mouth control, walk, fusions/colonies, plants, harmony bank, away-time. [Clarified 9:50 PM: no conflict with v0.0.18. v0.0.16 stopped far ohms falling back to a bell sound; v0.0.18 fixed the other paths that still came out as bells (resume after pause, hatchlings, spiral spawns used a modal bell mix). Both stand.]
- Step 5, after v0.0.16 (bb6d0f4, merged 711bc48): drum kits grown by learning (drums.js), effect objects and drawn instruments (things.js), item modulation sources. Systems r2 (7d2041b): teach line, epigenetics, in-key breeding, soft bodies.
- v0.0.17 (f202e39): step 1a, a real explorable planet on the ground (2D).
- v0.0.18 (9498612): bells root-cause fix, equal instrument chance (Wilbow 12:37 PM "Equal chance of spawn"), overlay/ground fix, zoom perf, big moments, systems round 3, galaxy step 2.
- v0.0.19 (17d8d2a): look items 1-4 (kaleidoscope veil in the sky, terrain that reads as land, back-slice headroom, look.sky).
- v0.0.20 (0b75e2e): sound-driven sky kaleidoscope + lookfeed; look.sky owns the home sky.
- v0.0.21 (b41c8f5): Q350-359 answers, dive shaping, look.thing; registers @capacitor/filesystem + @capacitor/share. https://drive.google.com/file/d/13tHGSsQFN2qBJeohzstgeCOEeqt3yaet/view?usp=drivesdk
- v0.0.22 (51858bb): rare ohms, traditions wave 1, soft zoom resistance, tradAura dev switch. https://drive.google.com/file/d/1X8V1Tt_HgXjyWi9LUyfEzbc3_NjYO3QH/view?usp=drivesdk
- v0.0.23 (2ab90c2): zoom fix (22962bd), Visuals merge (12f9c32), roleText switch (role TEXT labels, off by default), aura stage. https://drive.google.com/file/d/1ZrTtwM-UfYKy-m8uHPdrAEXMgzXAKkCB/view?usp=drivesdk
- On master, not yet in an APK (goes into v0.0.22): rare ohms, traditions wave 1 + corrections, soft zoom resistance. [SUPERSEDED: shipped in v0.0.22 / v0.0.23; latest build is v0.0.24, see the v0.0.24 update above]

### Drawn instruments (was "on hold", now built)
- Step 5 (711bc48): draw strings, membranes and bars that play on touch; physics pitch snapped to the scale in cents (d4f89d3).
- Movable ends + drum rim (315d647, Wilbow 3:19 AM Oct 23): drag retunes to key with a soft re-strike, 0.3-3x / 0.4-3x limits, undo, saved.
- Jam-tuned strings (24209d8): strings near a playing ohm take the jam's key on the downbeat, chord-tone glow.
- Music Theory end limits (37a2f3e): per-kind ranges (strings C3-C5, bars C4-C7, membranes C2-C4), 70 ms re-strike.
- After the 3:58 PM answers: Q351 group strings along fused links (a940a88), Q352 plucks nudge the next chord (8ea1d99), Q353 retuned strings glide over 120 ms (b4724af), Q354 ohms carry drawn things (9e68043).
- Real material look for placed things via look.thing (b875a9a, wired 88e7fc9).

### Q350-359 answers (Wilbow 3:58-4:02 PM), each behind a switch, ON
- Q350 a: ohms leave room for each other in a jam (room.js, d9a7acd).
- Q351 a: fused groups grow jam-tuned strings along links (a940a88).
- Q352 b: a pluck on a jam-tuned string nudges the next chord (8ea1d99).
- Q353 a: retuned ringing strings glide (b4724af).
- Q354 a: ohms carry drawn things: pick up, ride, take, knock off, drop (9e68043).
- Q355: split halves can rejoin in range (rejoin ON; leave-range-first guard OFF) (40d7425).
- Q356 b: arpeggio habit, born or learned (b27c4e0).
- Q357 d: river automation lanes for loudness / brightness (aaab875).
- Q358 a: bounce, hold below the river to render the song to WAV and share (6b2e94c).
- Q359 a: visible roles (lead / bass / pad / rhythm) grow from what each ohm plays; look.ohmRole hook (51d54f9).

### Dive into one ohm, with sound shaping inside
- Layered zoom slice 1 (214fa70, dive.js): voices / partials / wave as inner layers; sound splits going in, blends going out; every layer playable; sideways glide + momentum + focus magnet.
- Dive shaping (ea298a3, q360 'C', switch dive.shape ON): sideways in the middle shapes the sound: depth 1 body material or instrument share, depth 2 damping / filter resonance. Never touches pitch. Saved with the recipe. Dive questions 361-371 are still to ask.

### Star systems and the galaxy
- Space with 2-6 orbiting planets and landing (v0.0.11); zoom layer stack planet / system / galaxy with sound splitting and blending, space layers playable (389f54b).
- Galaxy (5627a9a): a seeded spiral of about 1400 star systems (bulge/bar, 2-4 arms, clusters, haze); pinch in on a star to travel and land; each system's om interval and tempo colour its planets; visited systems kept. Q300 (how planet speeds relate) still open.

### Rare ohms (4428792; 7efbd2e, c847316, d6748c5), dev-panel PROPOSAL toggles ON
- Rare signature sound (two blended palette instruments, stretched overtones, never pitch); rare wild ohms at hidden spots, gifted hatchlings, rare far teachers; own shape via look.rare.
- Endless xp tiers (patterns, song length, ground/weather, next scale); xp never fades, part passes to children.
- Seeded personality (bold/shy, curious/settled, social/loner, playful/serious).
- Harmony gate on the next scale, far reveal. Spec: /workspace/rare_ohms_spec.md.

### Soft zoom resistance for discord (efba024, Wilbow Q341/Q387 4:48 PM "Slow it and thats all")
- While the next scale is closed, zooming out past -1.45 slows more the deeper you push; letting go eases back; push on about 0.55 more and you are through; harmony earned softens it. Hard stop exists only behind its own switch, OFF. No hint visuals.

### Traditions wave 1 (917585d, merged d5c408b; PLAN_TRADITIONS.md)
- Eight traditions, one per planet (seed + land lean, equal base): Hindustani, Gamelan, Japan, Maqam, Celtic, Western, West African (wafrica) and Techno/House (techno). Each has tuning / tempo ratio over the locked om, feel + swing, rhythm cycles (cycle engine), instrument lean, drone and song shape. Dev-panel toggles; neutral aura hooks (tradition.auraPalette, tradition.auraPattern, ohm.tradition / tradId / rarity / tier / lively).
- Music Theory corrections #1 (8fd3890): drone planets no longer hold the harmony; jams can change key and chord; tonic pull 1.5 votes per step.
- Corrections #2-#15 (bb1da73, merged 49616d0): maqam/Bhairav cents (Rast, Bayati, Hijaz, Saba, Bhairav), raga/maqam focus weights, pelog bem/barang, cycle lengths (rupak 7, jhaptal 5, ladrang 8, slip jig 6, waltz 6), lancaran 90, hornpipe in 2 at 76 swing 1, reel .3 / house .35 swing, Celtic dens 1.2, khali .6, kethuk .5, off-beat hats .6.
- Sign-off follow-up (c515300, merged d790f00): focus lists de-duplicated; drones are scale slots tonic + fifth [0,4] (maqam tonic + ghammaz; iwato [0,3]); khali positions verified.
- Wave 2: later, on Wilbow's call.

### Sky kaleidoscope and the visuals hooks
- Kaleidoscope (110119c, 9161401, cfa1a3c): a soft colour veil in the sky at rest, lit lines only at big moments; driven by sound (chord, key, rhythm, timbre, density, song arc) through lookfeed.js (read-only, 37273c6); faint light at night. [UPDATE v0.0.29: in a new game it starts hidden and opens up as you play (trippy.js, switch trippy)]
- Real ground lit by the sky (21bf71b), stall fixes (9615fbc, f102018).
- Hooks: look.sky, look.ground, look.thing (wired), look.diveBack / diveVoice / divePartial / diveWave, look.rare, look.ohmRole, tradition.auraPalette, tradition.auraPattern. Visuals queue: in-game tradition aura, rare body shapes, ohmRole look.

### Puzzles (PROPOSED, not approved; nothing built)
- Wilbow, 5:01 PM Oct 25: "The main Puzzle goals will be creating harmony which spreads between the spacial scales".
- Wilbow, 5:24 PM: puzzles must be procedurally generated from the seed.
- Resonance Game Theory proposed 10 seed-generated ideas (dive shaping, strings, roles, hook, fireflies, teach, sour region, rare spots + soft gate, planets in time, galaxy swell): a shared generator seeds each puzzle from the layer seed, perturbs the solved state by k reversible player moves (so it is always solvable), with k set by depth / distance / tier and the parent layer's harmony. Waiting for Wilbow's pick. Flag: the home hold clashes with fuse press and carry pickup when held over another ohm (GESTURES.md).

---


> [Note, Oct 25 9:50 PM MDT] The block below is the 10:36 AM copy of the Current Summary Page, kept as history. The live Page is https://cursor.com/canvas/store-0adb6cb5-b723-4194-8359-5f07727e8ca0/07343028-69f7-42c0-b600-d05d41b5aac6 ; for what is current, read the Update sections above.

Canvas "The Journey Ohm: Current Summary" (https://cursor.com/canvas/store-0adb6cb5-b723-4194-8359-5f07727e8ca0/07343028-69f7-42c0-b600-d05d41b5aac6):

import { Page, Section, Text, Rows, Callout } from "grok/canvas";

export default function App() {
  return (
    <Page title="The Journey Ohm: Current Summary" summary="Draft 1, written together with Wilbow. The one short page every bot reads first; everything else is archive. Your words are in quotes.">
      <Callout tone="info">Draft for review. Nothing here is decided unless you say so. [SUPERSEDED: this copy is history; see the Update sections at the top]</Callout>
      <Section heading="Latest build: v0.0.15 (has everything) [SUPERSEDED: latest is v0.0.21, see Update to d790f00 above] [SUPERSEDED: latest is v0.0.25, see the top section]">
        <Rows rows={[
          { title: "v0.0.15: folding ground and singing to the ground", detail: "Ready about 6:47 AM MDT, Oct 25. Includes every overnight build (v0.0.9 to v0.0.15). https://drive.google.com/file/d/1oHCKXtijTWBV_l7dIblAbRWCOIIzDkXY/view?usp=drivesdk" },
          { title: "Everything unanswered is a proposal", detail: "Built as dev-panel switches with Game Dev's pick as the default. Change any of them." },
        ]} />
      </Section>
      <Section heading="Overnight, Oct 25">
        <Text>All builds passed their tests with no slowdown. Times are MDT.</Text>
        <Rows rows={[
          { title: "v0.0.8: new look on (about 3:40 AM)", detail: "The P1 look switched on as is (54A). Try: open it and see the new look. https://drive.google.com/file/d/1a2mG7wL8pd6kawVtobABqrJN1xeFL1th/view" },
          { title: "v0.0.9: the ground becomes a planet (about 4:15 AM)", detail: "Pinch out and the ground curves into a round planet you can walk all the way around, with a low om hum. Try: pinch out slowly; listen for the hum; two-finger drag sideways to spin it; tap a tempo then zoom out. https://drive.google.com/file/d/1hSsekk__jTJkjg8c2asYmLxxte1RSKpT/view?usp=drivesdk" },
          { title: "v0.0.10: calling, grouping and homes (about 4:49 AM)", detail: "Double-tap ground to call ohms; draw a loop to group them; drag and hold about 1 s to set a home. Try: call near a jam vs a quiet spot; loop 3 and drag one; set a home, drag far and see who wanders back; restart and homes stay. https://drive.google.com/file/d/1v6MfZ7KcmVvXPKui--xaxZeU4KMmPYse/view?usp=drivesdk" },
          { title: "v0.0.11: space and landing (about 5:06 AM)", detail: "Pinch past your planet into space: a star and 2 to 6 planets orbiting in time with the music, with a soft chord. Pinch in to land. Try: listen in deep space; land on a small planet; loop a herd and fly; press Home. https://drive.google.com/file/d/1x1ndixcrElIjl3Qb4Le3V0UbWWd8uPjW/view?usp=drivesdk" },
          { title: "v0.0.12: planet styles, regions and landmarks (about 5:29 AM)", detail: "Rocky, ocean, icy and cloud worlds, regions that blend with no borders, landmarks that pulse on the bar, and ground that colours the sound. Try: walk across a planet; follow an edge glint; rough vs lush chords; crater, rock and water sounds. https://drive.google.com/file/d/1FuLtuD1R9B2l-CWO4y58PcmmsN5qOo24/view?usp=drivesdk" },
          { title: "v0.0.13: ground that changes with the music (about 5:52 AM)", detail: "Jams raise the ground, calm settles it, repeated spots stay, plus seasons and weather; hum with two fingers on the ground to shape it. Planet styles are now blends (a possible fudge, fixed). Try: jam 6+ bars in one spot; tension then resolve; hum to shape; reopen and changes stay. https://drive.google.com/file/d/15eAq0VGXqgu_kumVGxZ8MRIaySWFaUS9/view?usp=drivesdk" },
          { title: "v0.0.14: cracks and craters (about 6:23 AM)", detail: "A huge swell cracks the ground with a ringing chord note; hammering one spot leaves a crater that harmony fills in. Try: steady 8+ bars then a big swell; hammer a spot for 3 to 4 bars; strength slider. https://drive.google.com/file/d/1sZt8BHkfhH6f4KyEp6SJFyU_T20Q9mgD/view?usp=drivesdk" },
          { title: "v0.0.15: folds and singing to the ground (about 6:47 AM)", detail: "Held tension creases the ground near playing ohms; resolving eases it but part stays. Sing low for wide rises, high for narrow peaks. Try: tense chord 3 to 4 bars, then resolve; hum low and high on the ground; spread fingers to zoom. https://drive.google.com/file/d/1oHCKXtijTWBV_l7dIblAbRWCOIIzDkXY/view?usp=drivesdk" },
        ]} />
      </Section>
      <Section heading="Your answers since 3:22 AM">
        <Rows rows={[
          { title: "Old features to bring next: B C E F (3:35 AM)", detail: "Drum kits, calling and herding ohms, effects as objects in the world, drawn instruments. Calling is built; B, E and F are on hold (\"Return later\", 3:40 AM). [SUPERSEDED: B, E and F were built as step 5 (bb6d0f4, merged 711bc48, in v0.0.16+); see Update to d790f00.]" },
          { title: "54A: new look on (3:36 AM)" },
          { title: "No in-game checklist (3:39 AM)", detail: "What to try goes in chat instead." },
          { title: "C7-1 C: context decides who answers a call (3:39 AM)" },
          { title: "C7-2 A B C: some ohms drift home, some stay, context decides (3:40 AM)" },
          { title: "5a C: tempo across sizes depends on context (3:49 AM)" },
          { title: "Terrain should change, not stay fixed (3:49 AM)" },
          { title: "5b A: bigger is lower (3:50 AM)" },
          { title: "Ground that can break and fold (3:50 AM)" },
          { title: "5c A: zooming into tiny worlds reveals overtones (3:51 AM)" },
          { title: "5d C: one om or each planet's own, by context (3:51 AM)" },
          { title: "\"Fudged\" replaces the old term (3:53 AM)", detail: "Fudged means one of your ideas got turned into a fixed rule or category." },
        ]} />
      </Section>
      <Section heading="Daily check-in, 10 AM Oct 25">
        <Text>Full report, with every question and its options, is on the Resonance Team Daily Report Page. 64 questions are open. Everything unanswered is a proposal. [SUPERSEDED: open list as of 9:50 PM Oct 25 is in the top section]</Text>
        <Rows rows={[
          { title: "Ask first", detail: "63 Game Dev's builder choices, then 12c your planet on each launch, then 324 more ways to shape the ground. After that: 318, 322, 300, 326, 319, 321, 325, 48, 61." },
          { title: "Builder choices you didn't make (63)", detail: "One-finger taps do nothing in deep space. The space chord octave is a smooth curve. Spreading fingers while shaping hands over to zoom. Changeable ground is on by default." },
          { title: "Flags", detail: "Music Theory's 'one shared key, beat and chord at a time' was fudged (your 2:21 AM), so it's dropped. Lighting planets and ground would go over the 3 ms look budget (61). 36 got two answers, so it's asked again (62). A team note at line 1312 of your words log was marked as not yours. A CONCEPTS.md wording fix is proposed only." },
        ]} />
      </Section>
      <Section heading="Open questions">
        <Text>All built ones run as switchable proposals with Game Dev's pick as the default.</Text>
        <Rows rows={[
          { title: "59 to 63: new at the 10 AM check-in", detail: "59 do instruments change each other (merged, likely covered by 9D); 60 the blind-start idea, lore or gameplay; 61 how far the look's real light reaches; 62 trippy takeover strength (36 conflict); 63 Game Dev's four builder choices." },
          { title: "Still open from earlier", detail: "47 to 50 and 53 (memory, tempo-tap followers, throw call-out, drum sound); 297, 301, 303 to 307 (older concept questions); 12b to 12d (planets per system, planet each launch, galaxy)." },
          { title: "300: how planet speeds relate during play", detail: "A own multiple of the heartbeat, neighbours drift together (proposal on); B one shared tempo; C fully independent; D context." },
          { title: "308 to 311 (check-in 55 to 58)", detail: "308 mic latch time; 309 learning long parts overheard; 310 playing back long parts without you; 311 what sets how long memories last." },
          { title: "312 to 317: calling and herding", detail: "312 call weights in the influence system; 313 push wave on a double tap; 314 drag current while drawing a loop; 315 clearing a group; 316 arrival note; 317 does the focused ohm drift home." },
          { title: "318 to 319: space", detail: "318 when landing happens; 319 do ohms left on other planets ever wake." },
          { title: "320 to 323: regions and landmarks", detail: "320 maqam, raga and pentatonic flavours; 321 what reaching a landmark does; 322 how strongly the place pulls the harmony; 323 pools on cloud giants." },
          { title: "324 to 327: changing ground", detail: "324 more ways to shape; 325 hearing the changed ground; 326 how strong the change is; 327 season and weather lengths." },
          { title: "328 to 330: cracks and craters", detail: "328 how long cracks last; 329 which note a crack rings; 330 how hard a crater is to make." },
          { title: "331 to 334: folds and singing", detail: "331 chord lean when singing; 332 how much of a fold stays; 333 overhangs; 334 fold sounds." }, /* [SUPERSEDED: the open list above, 59 to 334, is out of date; see the top section] */
          { title: "On hold: B36, E32, F5", detail: "Drum kits, effects as objects and drawn instruments questions, waiting for you (\"Return later\"). [SUPERSEDED: built in step 5 (711bc48) and extended by the Q350-359 answers; see Update to d790f00.]" },
          { title: "T1 to T5: changing ground (built as proposals)", detail: "T1 how you shape it; T2 what lasts; T3 tension wears, resolving heals; T4 weather and seasons; T5 ohms reshape the ground by genes and context." },
          { title: "D1 to D3: breaking (built as proposals)", detail: "D1 how you break ground; D2 how it heals; D3 how big breaks get." },
          { title: "F1 to F2: folding (built as proposals)", detail: "F1 which kind of fold; F2 folding by touch or voice." },
        ]} />
      </Section>
      <Section heading="What the game is">
        <Rows rows={[
          { title: "A touch-only Android music game where the creatures are ohms", detail: "The new engine (Resonance 2.0) replaces the old game, which is reference only." },
          { title: "\"The goal of the game is to bring harmony back\"", detail: "A lore idea, a spiritual term and a musical term at once (10:02 PM, explained 11:49 PM)." },
        ]} />
      </Section>
      <Section heading="Agreed so far">
        <Rows rows={[
          { title: "Start with the music and visualizer engine", detail: "\"we build it for the music but its to make a game\"." },
          { title: "Sound: synthesis plus some sampling (still discussing)", detail: "\"Some sampling will be necessary\" (12:42 AM). Idea under discussion: Up close each voice plays on its own; farther away, voices merge into ensemble voices and then one background layer. Sampling tools for players are a planned feature too." },
          { title: "One shared music state", detail: "Beat, key and harmony, read by ohms, visuals and the world. You said yes, as a concept." },
          { title: "Harmony counts across the whole world", detail: "\"the engine shouldn't be running the whole games universe at once\"" },
          { title: "Far places stay as you left them", detail: "\"may be regenerated with changes from other locations/scales of size\"" },
          { title: "Effects flow both ways across every scale", detail: "Planet and ohms affect each other. \"parralels but not clones\"" },
          { title: "Every tiny thing has an effect", detail: "\"it scales and has exceptions\". A rare, very experienced ohm \"can change anything\"." },
          { title: "Ohms gain from songs, knowledge and experience", detail: "Jams, playing with the environment, tapping into the planet, hearing the universal beat." },
          { title: "Knowledge passes on through teaching and offspring", detail: "The truth exists as a concept; the traditional song traces back to it and stays in the world. Each ohm's version is skewed by its environment and its own capabilities, so \"ohms can learn a song wrong but the traditional song still exists\". Drift causes discord." },
          { title: "Story and music making together", detail: "Balancing the world back toward its seed may be a key thread of the main story, but \"this game is for creating music not just playing through the story\". Your own songs can become traditions [UPDATE 9:50 PM Oct 25: BUILT in v0.0.25, switch placeTrad, on] too." },
        ]} />
      </Section>
      <Section heading="Decided and being applied">
        <Callout tone="info">"These type of decisions should be added and aapplied through the summary" (1:45 AM). Every bot takes its decisions from this section.</Callout>
        <Rows rows={[
          { title: "New app next to the old game", detail: "The Journey Ohm (dev) installs beside Resonance and leaves it and its saves alone; the sound playground is its first screen (1:16 AM, Q278)." },
          { title: "Tapping an ohm sounds right away", detail: "It snaps to the beat only during a jam. The old 300 ms tap delay is gone (1:16 AM)." },
          { title: "Step 1 built", detail: "One breathing ohm, tap and hold to play, dev panel with live timing (1:29 AM)." },
          { title: "v0.0.2 built: heartbeat and drone, synthesis types, effects, modulation", detail: "One APK (1:56 AM). Next builds come proactively (2:00 AM)." },
          { title: "Ohm controls are physical when possible", detail: "\"Ihm knows should be physic controls when possible\" (1:37 AM). Which physical gestures is still open; for example, squishing, stretching or flicking the ohm's body. The dev panel keeps readouts." },
          { title: "One integrated system, holistic always", detail: "One recipe holds synth, effects and modulation; nothing is ohm-only (1:38–1:40 AM)." },
          { title: "Integration techniques", detail: "Shared world state, one influence matrix, everything on one event clock, same building blocks at every scale, two-way coupling of sound, bodies and visuals (1:43–1:44 AM). Whole-team review comes later as a test run." },
          { title: "Shared state plus events", detail: "The shared state is the data, and every change to it is an event on the beat clock; continuous controls (anything you keep moving) are a steady stream of events. Taps still sound instantly (approved 1:46 AM)." },
        ]} />
      </Section>
      <Section heading="Discussing now (not decided)">
        <Rows rows={[
          { title: "Focus on sound and music making for a while", detail: "\"I want to focus completely on making sound for a while and really flesh out the capabilities of sound creation\" (1:04 AM), \"with that in mind\" of how it ties to the game (1:05 AM). Not sound only: the whole game builds in parallel (2:03 AM)." },
          { title: "All of the sound tools", detail: "Synthesis types (looser tie to ohms than the old game, 1:07–1:09 AM: genes give leanings and tone, instruments are learned or picked up, an ohm's role grows from what it plays, and you can assign or sculpt its sound), modulation (from body and movement), effects (from the environment), sampling (your voice, ohms reshaping it), and sculpting sound by touch (1:05 AM)." },
          { title: "Full sound suite", detail: "Also arranging (sequencer, looper, song structure, swing, polyrhythm, automation), harmony tools (scales, tunings, chords, arpeggiator), mixing and 3D space, sound recipes as seeds that can be bred, resampling, and export as audio, stems or MIDI (1:12 AM)." },
          { title: "Ohms work with samples", detail: "\"Ohms can also listen to the samples and use them, add fx chop them etc\" (1:12 AM), each in its own style and skill." },
          { title: "Physics controls and soft bodies, used strategically; trippy, colorful, psychedelic visuals", detail: "1:04 AM" },
          { title: "Settled songs become loops", detail: "An ohm's song is stored as notes and recorded to a loop once it stops changing (cheap). Group loops merge with distance and fade. Live again the moment you play, sing to or encourage it. Same at every scale (12:46–12:54 AM)." },
          { title: "Molecules are a scale space too", detail: "\"Add molecules as a scale space\" (1:26 AM), a small scale, below the ohms. One idea: there, sound is built up close, with single tones bonding into molecules (timbres and chords), mirroring the larger scales without copying them." },
          { title: "Cells in between", detail: "\"Cells inbetween\" (1:27 AM): a cell scale between molecules and ohms. Not a fixed ladder; see the next row." },
          { title: "Scale spaces: ideas to discuss", detail: "\"These scale discussions are ideas to be discussed\" (1:29 AM). Not a fixed list or order. Ideas raised so far, small to large: below wavelengths, wavelengths, atoms, molecules, cells, organs (inside an ohm), ohm, family or community, jam, area, biome, region, planet, moons and rings, star system, star cluster or nebula, galaxy, galaxy cluster, universe, beyond the universe, and the om. You picked all six additions at 1:28 AM." },
          { title: "Sing to an ohm", detail: "It imitates, others start learning, once resolved you hear the loop, fainter farther away (12:52 AM)." },
          { title: "Reuse the old sound engines", detail: "Instruments, singing voice, drums, mic listener, harmony, jams, traditions, song saving. Enough for about 32 live voices; loops cover the rest. Phone numbers are estimates until tested on your phone." },
        ]} />
      </Section>
      <Section heading="How we work">
        <Rows rows={[
          { title: "Test builds happen proactively", detail: "\"Just build test builds proactively remove the rule of running everything through me. Use my advice to build a game that uses robust succinct efficient systems.\" (2:00 AM). Each build comes to you with what changed and the choices made for you." },
          { title: "The whole game builds in parallel with sound", detail: "\"We can build the game in parralell. You freeze about only building audio\" / \"Don't do that\" (2:03 AM). World and scales, many ohms, physics, visuals and touch are built alongside the sound work, as one system." },
          { title: "Small test builds you can hear and see on your phone", detail: "Several can run in parallel (2:03 AM)." },
          { title: "Your ideas are features to build from, not rules", detail: "Choices the team makes for you are labeled as proposals so you can change them." },
          { title: "Short messages, one question at a time" },
          { title: "The team is flexible", detail: "\"No freezes the team is flexible and can assume necessary roles\" (2:05 AM). Any bot can take on whatever the game needs, including building." },
          { title: "Holistic, always", detail: "\"We're building an integrated system\" and \"A holistic should always be applied\" (1:38–1:40 AM). Every piece is designed as part of the whole: sound, physics, visuals, ohms, world and every scale." },
          { title: "Techniques approved for integration (1:43–1:44 AM)", detail: "One shared world state that sound, physics and visuals read and change; one influence matrix where any source (physics, touch, music, place, other scales) can drive any parameter; everything talks through musical events on one clock; the same building blocks at every scale; two-way coupling (sound moves visuals and bodies, bodies and visuals shape sound). Whole-team review of a build: a test run to come back to." },
          { title: "Watch for misreads: fudging your words or splitting both/and into either/or" },
        ]} />
      </Section>
      <Section heading="Open right now">
        <Rows rows={[
          { title: "How drift works and how a tradition finds its way back", detail: "Proposal on hold after the truth clarification." },
          { title: "A plain-words list of what makes music sound good", detail: "Music Theory, small job, started proactively (2:04 AM)." },
          { title: "124 old-game features marked approved", detail: "You said only the sound ones for now (1:51 AM), back when I had framed the work as sound-only. Now that the whole game builds in parallel (2:03 AM), the rest serve as for-examples too. About 35 of them feed the sound work in six groups: sound quality, instruments, playing by touch, music-making tools, music in the world, running well. Every specific one counts as an example, not a requirement (1:54 AM). Still open: 'Ohm keeps its own instrument' vs learning instruments (proposal: its own tone from its genes, sitting under what it learns). [UPDATE v0.0.29: built as up to three learned sounds under the birth voice, by context (learn3, learnCtx); the clean solo is off (learnSolo)]" },
          { title: "What does \"resolved\" mean for an ohm learning a song?", detail: "Leaning (1:50 AM, open until we can hear it): when it stops changing, or when you or the group accept it; how close it is to the true song shows in how it fits." },
          { title: "Game Dev's step 1 proposals, to judge by ear", detail: "Bigger body plays lower, hold also plays a note, breathing swell, pure (just-intonation) tuning. They're in v0.0.2 as switches in the World section of the panel, not decided (1:48 AM)." },
          { title: "v0.0.2 to try on your phone [SUPERSEDED: latest build is v0.0.25]", detail: "Heartbeat and om drone, saved sound recipes, synth plus body voices, effects, modulation and the routing table. Physical controls are proposals, for example drag, pinch, spread and rim strike. Your self-test numbers would show the phone's margin (ready 1:56 AM)." },
        ]} />
      </Section>
    </Page>
  );
}



---

## Kept pieces (never cut or thin out without Wilbow's OK, including during rollbacks)

- Instrument palette: /workspace/resonance2/INSTRUMENT_PALETTE.md. It has 73 synthesized instruments, the wide variety of sounds he asked for (10:09 AM Oct 25). It was built on track/instruments as 2a2fb0c with 12 automated tests, and there's a backup at /workspace/softsound/INSTRUMENT_PALETTE.backup.md. Wilbow, 10:52 AM Oct 25: "Great make sure this effort doesnt get cut out somehow."
