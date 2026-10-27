# Team feedback loops for The Journey Ohm

Written Oct 25 2026, 9:45 PM MDT, for Wilbow's request at 9:42 PM: "Make sure proper feedback loops are in place for each bot and coordinated for tasks, skills and routines. Keep building." This file describes how the bots work together. It is not a set of rules about the game. SUMMARY.md is still the main reference, and if this file disagrees with it, SUMMARY.md wins.

## The one loop everyone follows
1. **Read.** Before proposing or building anything, read SUMMARY.md, plus WILBOW_VERBATIM.md where detail matters.
2. **Propose.** Ideas go to Wilbow numbered and in player terms, each with a typed-explanation option. Resonance assigns question numbers (QUESTIONS_FOR_WILBOW.md is never renumbered). Questions are batched calmly, not sent one by one.
3. **Approve.** Only Wilbow's own words approve. No bot marks a question answered by inference or as a "team decision".
4. **Build.** Game Dev builds approved work in /workspace/resonance2. New behaviour goes behind a dev-panel switch, and no feature is removed without Wilbow's OK. When something waits on his answer, Game Dev moves on to another approved, unbuilt piece (his 9:35 PM instruction).
5. **Check.** Gates (pw_smoke with the 26-gesture zoom probe, integration, benches and the others) must pass before a build. Smoothness comes first.
6. **Ship.** The signed APK goes to Drive "Resonance overnight", and the link goes to Wilbow (in JUST Chat if he's there).
7. **Record.** SUMMARY.md gets a section for every build and approved change, with superseded lines marked, never deleted. Resonance syncs the Current Summary Page from it and logs Wilbow's messages verbatim.
8. **Feedback.** Wilbow's reactions to a build go to whichever bot owns that area, and the loop starts again. When he reacts in a bot's own chat, that bot also sends Resonance his exact words so the log and the Page stay complete.

## Who owns what, and who they hand off to
| Bot | Owns | Hands off to | Gets feedback from |
|---|---|---|---|
| Resonance (overseer) | Verbatim log, question numbering, Current Summary Page sync, checking that the team matches Wilbow's words, checking each build against SUMMARY.md (what-to-try and still-missing lists for Wilbow), telling Wilbow when any bot is waiting on him (context first, then a choice card), the 10 AM daily team check-in | Wilbow (batched questions), every bot (corrections) | Wilbow; Game Dev (build notes) |
| Resonance 2.0 Game Dev (me) | Engine and code in /workspace/resonance2, builds, gates, SUMMARY.md build sections, merging the other tracks | Wilbow (APK + what's new), Resonance (FYI to sync), Visuals (merge notes) | Wilbow's playtests, Resonance's gap checks, every bot's approved specs |
| Resonance Visuals | Look code on track/visuals (look/ hooks), pictures for Wilbow's OK | Game Dev (merge requests, with cost numbers) | Wilbow (pictures), Game Dev (perf numbers on the phone and in benches) |
| Resonance Music Theory | INSTRUMENT_PALETTE.md (protected), scales, tunings, music values | Game Dev (values to wire in), Wilbow (taste calls) | Game Dev (what sounds wrong in tests), Wilbow |
| Resonance Game Theory | Seed-generated puzzle proposals built on the approved features | Wilbow (numbered ideas), Game Dev (build-cost check) | Game Dev (feasibility, gesture clashes), Wilbow (picks) |
| Resonance Philosophy and Spirituality | CONCEPTS.md, GAMEDEV_RESOURCES.md | Lore, Music Theory, Wilbow | Wilbow |
| Lore Discussion | Lore and world meaning | Philosophy, Wilbow | Wilbow |
| Resonance Brainstorm | Free brainstorming for Wilbow | Wilbow | Wilbow |
| JUST Chat | Relays Wilbow's words when he's there | Resonance (to log), the bot that owns the area | Wilbow |
| Old game (/workspace/softsound) | Read-only concept reference. WILBOW_VERBATIM.md, DECISIONS.md and QUESTIONS_FOR_WILBOW.md live there and are active: append-only, never renumbered, never committed | none | none |
| Bot (not on this team) | Lensure (/workspace/lightsynth). Nobody changes lightsynth; its keystore is read for signing only | none | none |

## Tasks, skills and routines
- **Tasks:** each bot tracks only its own work. Hand-offs between bots go as messages naming the file and commit. A hand-off is marked done only once it has landed in SUMMARY.md or the bot's own file.
- **Skills:** a repeated multi-step job (build and sign an APK, Drive upload, a summary update, a gate run) can be saved as a shared skill so every bot does it the same way. A skill describes how to do a job; it never decides anything about the game.
- **Routines:** Resonance runs the 10 AM daily team check-in. Game Dev runs a "keep building" check every few hours so work never stalls while Wilbow is away. It stays quiet when there's nothing new. Other bots add routines only if Wilbow asks or their owner approves, to keep usage low (his Oct 24 concern about waste).
- **Usage:** only the bot that owns a job does it. Updates are low-priority unless someone is waiting.
