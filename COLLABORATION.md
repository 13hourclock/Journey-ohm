# COLLABORATION: how to keep building The Journey Ohm with Wilbow

For Claude, any other AI, or any person picking this up. Linked from HANDOFF.md / CLAUDE_START_HERE.md. This file replaces tools/collaboration_template.md (tools/release_package.sh copies it into every release package).

## 1. Wilbow's words are the authority
- **docs/WILBOW_VERBATIM.md** holds his exact words; **docs/DECISIONS.md** holds what was decided from them. Both are **append-only**: add new entries at the end with date, time (MDT) and source; never edit or delete old lines. Mark paraphrases as paraphrases.
- When anything (a plan, a test, another doc, your own memory) disagrees with his words, his words win.

## 2. SUMMARY.md is the main reference
- Every approved change goes into SUMMARY.md (newest section at the top, dated, with commit ids and what changed in play terms).
- Never delete a line that is out of date: **mark it superseded** (e.g. `~~old~~ superseded by <date/section>`) so the history stays readable.
- The "Kept pieces" section at the bottom is never cut or thinned out without his OK, including during rollbacks.
- Read SUMMARY.md before starting any task, and check finished work against it.

## 3. Ideas are concepts, not rigid rules
- His ideas are concepts and features: read each one for its **goal** (what it should feel like to play) and build toward that, rather than treating his wording as a literal spec.
- **Nothing is decided without him.** Where there is a choice of taste or direction, build a proposal (behind a switch, OFF) and bring it to him in **player terms**: what you'd see, hear and do, not code names.
- Build from the thorough discussions; don't cut concepts.

## 4. Questions
- All questions live in **QUESTIONS_FOR_WILBOW.md** (docs/ copy in packages), numbered and appended. **Never renumber.** While the Resonance coordinator bot is running, it assigns the numbers: send it your questions rather than numbering them yourself. The next free number is **422**; update the "Next free number" line when you add some.
- Each question: one or two lines of context first, then **lettered options** (A, B, C...) plus room for him to explain in his own words. He often answers like "A b and c", so make options combinable where that makes sense.
- Batch questions calmly; **no flood**. Ask only what blocks you, and keep building approved work while a question waits.

## 5. Features and switches
- New features go **behind dev-panel switches**. ON = approved; OFF = waiting on his taste call. Off must mean exactly the old behaviour.
- **Nothing is removed without checking with him** ("Do not remove feature without checking").
- No stacked process rules; "do what works".

## 6. Priorities
1. **Smooth zooming and panning between every scale** (cells, ground, sky, planet, system, galaxy). Never ship a regression here; zoom_smooth / pw_smoke gate it.
2. The **full 73-instrument palette**, never cut; instruments **spawn equally**, with a lean toward the place (local tradition/terrain).
3. Shaded look with no outlines, more character in the ohms, detail at every world scale, galaxies more realistic and less colour-saturated.
4. **3D is not the top priority**.

## 7. Release package format
Each release goes to Wilbow's Google Drive folder **"Resonance overnight"**, in a subfolder named `JourneyOhm vX.Y.Z package YYYY-MM-DD`, containing:
1. the signed APK (`JourneyOhm-vX.Y.Z.apk`),
2. the source zip of the exact commit the APK was built from (plus a "latest master, unreleased" zip if master has moved),
3. HANDOFF.md (this onboarding guide, updated),
4. recent headless screenshots / contact sheets of the game (rendered to file headlessly; no desktop screenshots),
5. CHANGELOG.md (from SUMMARY.md release sections + git log),
6. the coordination docs: SUMMARY.md, TEAM_LOOPS.md, DECISIONS.md, WILBOW_VERBATIM.md, QUESTIONS_FOR_WILBOW.md.
The package is built by `tools/release_package.sh <version> <commit> <signed-apk> [<prev>]` (it also leak-scans the source zip); the bare APK goes in the folder as well. Bump versionCode/versionName every release. Run the gates (scripts/run_gates.sh list) before shipping. Never delete his Drive files without his OK.

## 8. Keys and secrets
- **Bring your own keystore.** The original signing key and password are not shared. Note: a differently signed APK won't install over his current one.
- **Never commit secrets** (keystores, passwords, tokens, env files) and never print them in logs or messages. Pass signing passwords via environment variables only.

## 9. How to talk to him
- Short, plain updates. Answer his questions plainly. No walls of text and no flood of questions.
- Times in MDT (America/Denver).

## 10. How to hand back after a piece of work
Push your work to a branch (not straight to master), add a SUMMARY.md entry (what, why, switches, tests run), and send a note naming the branch and tip hash, with:
1. **What changed** - in player terms, with version/commit.
2. **What to try** - a few concrete things to do on the phone to feel the change.
3. **What's still missing** - approved items not built yet, known bugs.
4. **Open questions** - numbered (from 422 on), lettered options, context first.
Plus the Drive link if there is a new build.

## 11. Current status (Oct 27 2026)
Game building is **paused by Wilbow**. Packaging, docs and uploads are fine; don't build APKs or change game code until he restarts it.
