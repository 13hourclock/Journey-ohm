# GROK_HANDOFF: read this before working on The Journey Ohm

For Grok (or any AI) picking up work. Written Oct 29 2026 by Claude, at Wilbow's request (10:12 PM MDT, "Do all").

## 1. Read BOARD.md first, and follow its rules

Wilbow, 9:57 PM MDT Oct 29: "My main problem has been development happening based on misunderstandings."

**BOARD.md** (repo root) says which category every piece of work is in. In short:
- **Build only what is in DECIDED** (or a clear bug in FIXES). Wilbow moves items into DECIDED himself, in clear words ("build it", "yes, do X", "go").
- **Ideas, brainstorms, "maybe", "what if", "eventually" go to DISCUSSION and are never built.** If you're unsure whether something was decided, ask him; don't guess.
- Your own ideas go to **PROPOSED** and wait for his yes.
- Anything built on your own judgment is marked **(builder's call)** in BUILT, so he can confirm or undo it.
- Every built item gets a dev-panel **switch** (off = exactly as before) and its own **pull request**.
- When you finish something, **update BOARD.md in the same pull request** (move the item, add the PR number).

## 2. Where things are

- Code: GitHub **13hourclock/Journey-ohm**, branch `main`. Every push to main builds a debug APK (Actions tab -> the run -> Artifacts).
- Then, in order: **COLLABORATION.md** (how to work with Wilbow), **SUMMARY.md** (main reference, newest first), **CLAUDE_START_HERE.md** (folder map, how to run, tests, build).
- His exact words: **docs/WILBOW_VERBATIM.md**; decisions: **docs/DECISIONS.md** (both append-only).
- Music reference: **docs/TRADITION_REFERENCE.md** (real scales, cycles, forms for ~30 traditions), docs/MUSIC_OVERHAUL.md (the first game's music diagnosis).
- The first game (concept reference only, don't build on it): GitHub **13hourclock/Resonance**.

## 3. What changed on Oct 29 (all merged; details in SUMMARY.md)

PRs #1-#6: the Oct 28 decisions now load; 21 more traditions (29 in all); real chromatic chords; guest accent (ohms from other planets play their home accent in the host's key); songs' strong beats fit the chord; body plans from the first game; walking legs.

## 4. Working style

- Work on a branch, one pull request per board item, with the board item ID in the title.
- Run the node tests that touch your area (`node tests/<name>_test.mjs`); `tests/wave2_test.mjs` covers traditions wave 2, guest accent and chromatic chords. Known pre-existing failures: tests/look_claim_test; tests/shape_test timing on a busy machine.
- Report to Wilbow in player terms (what he'll see, hear and do), short, MDT times.
- Never commit keystores or passwords.
- If the repo goes private, you'll need access added to keep reading it.
