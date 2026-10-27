# PLAN_SYSTEMS.md (build plan: player systems)

> **Build from SUMMARY.md first** (Wilbow's Current Summary, /workspace/resonance2/SUMMARY.md). If this plan disagrees with the summary, the summary wins.

Written Sun Oct 25 2026 for the rollback (Wilbow, 10:34 AM MDT: "go back to the plan where you build from what we've discussed thoroughly roll back recent cuts"). These are features he discussed that had dropped out of the active plans. Every item is a thing to build, not an option. Branch: track/systems. Quotes are from /workspace/softsound/WILBOW_VERBATIM.md and audits/team_vs_wilbow_2026-10-25.md.

## Build list

1. **The DAW: a river of time and a brain view.** Songs shown as a river you can scrub, paint notes into and arrange; the brain view shows what each ohm knows and plays. Reuse the old daw.js, dawpaint, songsave (PLAN_SOUND_PLAYGROUND step 8 is the arranging core). (Audit B2.)
2. **Songs are separate from jams.** A jam is the live playing; a song is what it becomes. Ohms work toward songs; songs are kept as notes + rhythm + recipe in a song library you can open, replay and edit. Songs can become a place's tradition. (B3.)
3. **The ? helper.** A small help button that explains what you are looking at and what you can do there, in player words. (B4.)
4. **Keep everything when you leave.** The world, the ohms, the music and the song you were in are saved and carry on when you come back; time passes while away. (B5.)
5. **Spawning by the spiral, and drawn gestures.** "The plain spiral should generate a quick randomized ohm which fits the environment" (11:13 PM Oct 22). Lay the foundation for drawn gestures and glyphs like Lensure ("draw many gestures like in lensure", 1:20 AM Oct 22): shapes that make blobs, ohms that interact with drawn shapes, gestures kept for spawns, big changes and attribute edits. The current hold-still spawn (input.js) stays as a secondary way until the spiral is in. (A7, B12.)
6. **Undo and redo.** Three-finger tap undoes, four-finger tap redoes. (B7.)
7. **Mouth control, recording and singing into a jam.** Sing or hum to steer an ohm; record your sounds into the jam; ohms can listen to and use the samples, chop them and add fx (1:12 AM Oct 25). Reuses the mic listener (listen.js). (B6.)
8. **Harmony as currency, and discord holds back the next scale.** "Harmony as a currency and usable resource should be baked in" (10:41 PM Oct 24). What it is spent on is open (Q306). (B8.)
9. **Walk in an ohm's shoes.** Tap an ohm, take control and move it with a joystick ("a way to command each ohm after clicking so you can walk in its shoes with joystick", 12:43 AM Oct 23). (B13.)
10. **Fusions and colonies.** "Sticking one or more together manually makes them stick together as one creature cluster" (WV:515). (B13.)
11. **Plants grow from the music around them** ("The plants growing and flowering should have to do with the music around them", 1:35 AM Oct 22). (B13.)
12. **Teaching, offspring and drift.** Ohms pass songs and sounds on by teaching and offspring; each version drifts with its environment and abilities; drift can cause discord that you help resolve.
13. **Physical ohm controls and soft bodies.** Squish, stretch, flick, pinch and throw ohms; the body is soft and its shape and motion modulate the sound.
14. **Settled songs become loops** (12:46–12:54 AM Oct 25): a settled song freezes to a loop, comes alive again on touch, singing or encouragement; loops merge into group loops and fade with distance at every scale. (PLAN_SOUND_PLAYGROUND step 12.)
15. **Learned instruments, player sculpting, role from play, item modulation**: in PLAN_INSTRUMENTS steps 9–14.

## Open questions that do not block building

Harmony spending (Q306); memory and tempo-tap followers (47–50); the galaxy timing (12d). Build with a sensible default behind a switch and ask him through the usual question list.
