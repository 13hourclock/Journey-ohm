> **Build from /workspace/resonance2/SUMMARY.md first** (Wilbow's Current Summary). If this doc disagrees with the summary, the summary wins.

> Real constraints: sign APKs with the keystore password from the KSP env var; never touch /workspace/lightsynth; APKs go only to the Drive folder 'Resonance overnight'; never delete Drive files without Wilbow's OK; no desktop screenshots; no audio recording; never run /workspace/audit gen.py or wv.py; WILBOW_VERBATIM.md and DECISIONS.md are append-only and never committed; never renumber QUESTIONS_FOR_WILBOW.md.

Then read GOAL_AND_FEATURES.md (his goals and every feature he has suggested).


> **UPDATE Oct 24 2026, 10:07–10:13 PM MDT:** Wilbow is abandoning this product for a NEW procedural-generation engine, Resonance 2.0, titled *The Journey Ohm*. Everything here is now a CONCEPT REFERENCE only, and all old-game builds were stopped at 10:08 PM. The builder is now the **Resonance 2.0 Game Dev** bot (/workspace/resonance2). The **Resonance** bot is the overseer. Read NEW_ENGINE.md, SCALE_MUSIC.md, CONCEPTS.md and GAMEDEV_RESOURCES.md, and the 10:00–10:13 PM entries in DECISIONS.md.

# START HERE: Wilbow's projects, for a new Grok Bot instance
Written Fri Oct 23 2026, ~1:20 AM MDT; updated ~1:45 AM MDT (full verbatim transcript recovered). Same box as the old bot: every path below works as-is.

## Kickoff
- Wilbow pastes this one line into the new bot:
  `Read /workspace/softsound/START_HERE.md and continue my projects`
- First-run checklist (do in order):
  1. Read this file to the end.
  2. Read `/workspace/softsound/HANDOFF.md` (rules, built list, waiting list, spec gaps).
  3. Skim `/workspace/softsound/DECISIONS.md`: audit gaps at the top, status tables, then the system you will touch. It is authoritative (exact quotes under every item).
  3a. Do NOT read `/workspace/softsound/WILBOW_VERBATIM.md` up front (Wilbow, 2:09 AM Oct 23: keep the important parts to save effort). It is a backup archive: search it with `rg` only when a detail is in doubt.
  3b. Read `/workspace/softsound/THEMES.md` (what he keeps asking for, ranked).
  4. Read `/workspace/softsound/V07_SPEC.md` (current build spec), `OPEN_NOTES.md`, `GESTURES.md` (§13 = v0.7 gesture check).
  5. Read the END of `/workspace/softsound/NOTES.md` (section `## v0.7 (vc15)`) to see build state.
  6. Lensure only if asked: `/workspace/lightsynth/HANDOFF_LENSURE.md` (paused project).
  7. Save the facts below with `UpdateMemory` (one fact per entry, exact sentences). A new bot does NOT inherit the old bot's private memory; only `shared_profile` and `shared_journal` carry over.
  8. Check the in-flight v0.7 build (section "In-flight state").
  9. Send Wilbow one short message: build state + a numbered list of the next work + the "not yet put to Wilbow" questions from HANDOFF.md.

## Facts to save with UpdateMemory (one sentence each)
1. Wilbow Shmesh's main project is Resonance, an Android gesture-only musical life sim at /workspace/softsound (appId com.lensure.resonance), and its authoritative records are /workspace/softsound/DECISIONS.md and HANDOFF.md.
2. Wilbow's second project is Lensure at /workspace/lightsynth (appId com.lensure.app, v3.6 vc18), which is paused and must never be modified during Resonance work.
3. Resonance creatures are called "ohms", and each ohm is a gene-built, clearly distinct instrument with its own musical mind; there is no central composer.
4. Resonance has no menus, buttons or text UI; everything is in-world gestures, and new features are explained with text-free in-game hints and the guide ohm. (Wilbow, 9:47 PM Oct 24 2026: the no-words rule is a consideration for the RELEASED game experience, not a crucial rule for development. Dev mode and dev builds may use text.)
10. Resonance mutation is off (RS.MUTATION=false): no random drift, only player DNA edits; randomness at creation is fine.
11. Resonance ohms stay near home whether watched or not, particle density stays capped, and background ohms must stay computationally cheap.
12. Resonance must never use themes, presets, genres or fixed roles; biomes are blended fields and the environment only lightly influences sound.
13. Resonance is one app only; Wilbow does not want a separate Lab or sandbox APK.
14. Wilbow prefers large builds with as much per build as is efficient, and candid notes on thin spots.
15. Do not make or analyse audio recordings and take no screenshots; use lean headless tests and let Wilbow phone-test the feel.
16. Deliver signed APKs to Wilbow's Google Drive with the UploadFile tool (user-Google-drive connector), never tmpfiles.
17. Resonance and Lensure APKs are signed with /workspace/lightsynth/lensure-upload.jks alias lensure; its password is a placeholder that must be replaced before any Play Store release.
18. The Resonance test suite is /workspace/softsound/tests/runser.sh (serial, about 36 test files; a crash counts as a failure).
19. Report all times to Wilbow in MDT (America/Denver).
21. Resonance's roadmap Page is canvas 537d9336-cb72-4705-b175-70a79233c55d in store store-0adb6cb5-b723-4194-8359-5f07727e8ca0.
23. Wilbow's Oct 23 1:10 AM vision for Resonance (Pokemon-style collecting, sandbox and Noita-style exploration, Ableton-style music making, endless exploration, music as the focus) is proposed and awaits his design approval in /workspace/softsound/VISION_PROPOSAL.md.
24. Resonance must not port Lensure features; the two are separate projects that may be built into each other later.

## Projects at a glance
| Project | Path | State |
|---|---|---|
| Resonance | `/workspace/softsound` | v0.6.2 delivered; v0.7 (vc15) in build |
| Lensure | `/workspace/lightsynth` | v3.6 (vc18) shipped Oct 19; paused (Oct 21: "not very playable") |
| Lumen | `/workspace/lightsynth-alt` | retired (merged into Lensure v3.1) |

## Files (Resonance, `/workspace/softsound`)
- `START_HERE.md`: this file.
- `HANDOFF.md`: standing rules, built list, v0.7 summary, waiting on Wilbow, approved-not-built, spec gaps.
- `DECISIONS.md`: authoritative. Audit gaps, status tables per system (S1-S10) with exact quotes, Lensure L-items, message index (Appendix A), the 27 compaction-lost turns as paraphrase (Appendix B).
- `WILBOW_VERBATIM.md`: every Wilbow message (229 entries), exact wording, MDT time, project tag, outcome.
- `THEMES.md`: his recurring themes ranked, with quotes.
- `VISION_PROPOSAL.md`: design proposal for the t230 vision (draft; not approved).
- `V07_SPEC.md`: v0.7 spec, sections A-L. Do not edit while a build runs from it.
- `OPEN_NOTES.md`: notes and pending choices.
- `GESTURES.md`: every gesture + conflict checks.
- `NOTES.md`: the build log, newest at the end.
- `PAIRINGS_ORIGINAL.md` / `PAIRINGS.md`, `ABILITIES.md`.
- Code: `www/js/*.js` (modules listed per system in DECISIONS.md). Android: `android/`. APKs: `dist/`.
- v0.6.2 source snapshot: `/workspace/softsound_v062_src`.

## How to work here
- Box: one shared Linux machine; the old bot's files, tools and installs are all here. Desktops are per agent.
- Build env (reinstall if the box reset): JDK 21 at `/home/box/jdk`, Android SDK build-tools 35 (`/home/box/android/build-tools/35.0.0/apksigner`), `npm ci`, Playwright Chromium. NOTES.md 23:41 entry lists what was reinstalled.
- Build flow (see NOTES.md v0.6.2 entries): tests/runser.sh green -> `cap sync` -> `assembleRelease` -> zipalign -p 4 -> apksigner (v1+v2+v3) -> check cert SHA-256 `db171c70…dc7d1f` and versionCode -> upload.
- Delivery: `UploadFile` to Wilbow's Google Drive (user-Google-drive connector). Upload once; give him the Drive link. Never delete Drive files without his OK.
- Roadmap Page: canvas `537d9336-cb72-4705-b175-70a79233c55d` in store `store-0adb6cb5-b723-4194-8359-5f07727e8ca0`. A new bot may not be able to edit it (other bot's store). Try `ReadCanvas`; if you can't edit it, create your own Page with `WriteCanvas` and link the old one.
- Messages to Wilbow: MDT times; no screenshots; plain player-experience language.
- Records: Wilbow's messages are appended to WILBOW_VERBATIM.md and DECISIONS.md (append-only, never committed). Never run /workspace/audit gen.py or wv.py.

## In-flight state (v0.7, vc15)
- The old bot was building v0.7 from `V07_SPEC.md` in `/workspace/softsound`. It may still be running when you start.
- Log: `NOTES.md`, section `## v0.7 (vc15) from V07_SPEC.md A–F (started 00:18 MDT)`, one timestamped line per step.
- Done as of 01:04 AM MDT Oct 23: C undo/redo (00:19), I random start (00:37), H.1 hold ring (00:44), A egg grammar (00:46), H.3 storm seeds 17/53 (00:51), B conducting (01:01), H.4 cave roofs (01:04).
- Still to do then: D experience + D2 compatibility, E watched jams grow, F tuning, G cultures, J background cost check, L hints for each feature, K walk in shoes (last), full suite, build, sign, upload.
- How to tell it finished:
  1. The end of the NOTES.md v0.7 log has a build line (`badging com.lensure.resonance vc15 / 0.7`), a full-suite line, and an "uploaded ... Resonance-v0.7.apk" line with a Drive link.
  2. `dist/Resonance-v0.7.apk` exists.
  3. A file named `Resonance-v0.7.apk` is in Wilbow's Drive (search with the user-Google-drive connector).
- Is it still running? Check `ps aux | rg -i "gradle|node|playwright|runser"` and whether NOTES.md changed in the last ~15 minutes (`ls -l --time-style=+%H:%M NOTES.md`).
- To resume (only when it is clearly stopped): read the last log lines, continue from the next unchecked step, don't redo finished steps, run `tests/runser.sh` before building, keep `/workspace/softsound_v062_src` as the rollback snapshot. Raise HANDOFF.md's "Not yet put to Wilbow" questions with the delivery.

## Open questions for Wilbow (short form; details in HANDOFF.md)
1. Phone feedback on v0.6.2 / v0.7.
2. Keep the haptics?
3. Delete old Drive uploads `1YTls1lhBFMy8yk1qoyM4Sd22tisUONGA` and `1iTPtS8y-IReyqF8GSdRrW7aDukZiwqNM`?
4. Birthplace-lean option (1-4, recommended 3+4).
5. Rider variety (7 options).
6. Plain spiral now waits ~1.5 s (egg window): OK?
7. Conducting needs two hands: OK?
8. His old ark world is unreachable with random start: OK until save/load?
9. Hints for older features too?
10. Do hatchlings inherit experience?
11. Still want the approved-but-unbuilt items (drawn effect items, carrying water, regional keys kept light per t145)? (Lensure ports are NOT wanted: vc3.)
13. The t230 vision (Pokemon-style collecting, sandbox/Noita exploration, Ableton-style music making, endless exploration, music first): approve a design from VISION_PROPOSAL.md before any build.
14. t226-t229: the synopsis of everything still to build, in efficient order, with UX research applied.
12. Replace the placeholder signing password before any Play release.

## Known limits of this handoff
- 27 message numbers were lost to context compaction before the transcript was saved (t45-t51, t82, t110-t111, t122-t125, t138-t140, t171-t176, t221-t223). They exist only as reconstructed paraphrase (WILBOW_VERBATIM.md "Missing numbers"; DECISIONS.md Appendix B). Every other message t0-t230 is verbatim.
- Voice-call entries vc1-vc3 are the call channel's paraphrase, with a few of his words quoted.
