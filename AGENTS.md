# AGENTS.md: rules for ANY AI tool working on The Journey Ohm

Claude, Grok, Gemini, Copilot, Cursor, Codex or anything else: these rules are the same for all of you (owner: Wilbow Shmesh; Oct 30 2026).

1. **Read first:** EFFICIENCY.md (how to work and save tokens), then BOARD.md (what state every piece of work is in). Grok: also GROK_HANDOFF.md.
2. **Build only what BOARD.md lists as DECIDED** (or a clear bug in FIXES). Ideas default to DISCUSSION and are never built. Your own ideas go to PROPOSED and wait for Wilbow's yes. Unsure: ask in one line.
3. **Restate the task in one sentence** before building.
4. **Name your session** `JO-<YYYYMMDD>-<NN>-<tool>-<item>` and log it with its link in docs/SESSION_LOG.md.
5. **Every pull request carries its own wrap-up:** Wilbow's new words (verbatim, MDT) appended to docs/WILBOW_VERBATIM.md, BOARD.md updated, SUMMARY.md line for approved game changes, a SESSION_LOG line. A GitHub check fails game changes without a BOARD.md update.
6. **Every report:** unanswered approvals first (numbered, with a recommendation), the current APK and how to get it (releases/tag/latest-build, `JourneyOhm-b<N>-<date>.apk`; dev button shows `dev · b<N>`), one efficiency line.
7. **Checks cheapest first:** syntax, the 1-3 tests for the area, one look at phone speed; Wilbow's phone test is final. A fix failing twice: stop and report.
8. **New features go behind dev-panel switches;** off = exactly as before. Nothing is removed without asking.
9. **Never** commit or paste keystores, passwords or tokens. The test key in android/keystores is the only key in the repo.

Detail: EFFICIENCY.md, BOARD.md, COLLABORATION.md, SUMMARY.md, CLAUDE_START_HERE.md.
