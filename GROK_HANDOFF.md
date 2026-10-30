# GROK_HANDOFF: read this before working on The Journey Ohm

For Grok (or any AI) picking up work. Written Oct 29 2026 by Claude, at Wilbow's request (10:12 PM MDT, "Do all").

## 0. Message to paste into Grok when Wilbow's usage is back

> Read GROK_HANDOFF.md and BOARD.md in the private GitHub repo 13hourclock/Journey-ohm (Wilbow will add you if you can't open it). Then:
> 1. **Release signing (board T2):** builds should also install over the installs you made with the lensure upload key. Help Wilbow add 4 GitHub Actions secrets to the repo (Settings -> Secrets and variables -> Actions): `KEYSTORE_BASE64` (base64 of lensure-upload.jks), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (lensure), `KEY_PASSWORD`. Never paste the key or the passwords into chat, the repo or any doc; if you have no GitHub access, give Wilbow the steps and let him paste them himself. The workflow already signs a release APK when these exist.
> 2. Catch up: SUMMARY.md (Oct 29 section at the top) and BOARD.md say what changed; build only what BOARD.md lists as DECIDED.
> 3. Report back in short player terms.

## 0b. Signing and versions (Oct 29)
- Every **debug** build is signed with one shared **test key** in the repo (`android/keystores/journeyohm-test.keystore`, standard `android` passwords): builds install over each other on the phone. It is not a release key.
- `versionCode` = 1000 + the GitHub run number (versionName `0.0.30-bN`), so every build is newer than the last, and newer than your v0.0.30 (versionCode 30).
- The newest APK is the only file on the release page `releases/tag/latest-build`, named `JourneyOhm-b<N>-<date>.apk` (N = GitHub run number; `-release.apk` too once the secrets exist). The game's dev button shows `dev · b<N>` (from www/build.json, written by CI). Builds 16+ use the shared test key.

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
