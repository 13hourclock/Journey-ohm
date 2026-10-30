# EFFICIENCY: the token-saving protocol for every AI on The Journey Ohm

Wilbow, Oct 30 2026, 12:07 AM MDT: "make sure other instances and AIs use a protocol that preserves tokens through metrics that don't reduce the game development."
Applies to every Claude chat, Grok and any other AI. Saving tokens must never mean skipping what the game needs: cut repetition, rework and long reads, not checks that catch real problems.

## Session rules
1. **One task per chat.** Start a new chat for each board item. Kickoff line: *"Attach 13hourclock/Journey-ohm, read BOARD.md and GROK_HANDOFF.md, then: [task]."* Long chats re-read their whole history every turn: start fresh rather than continue.
2. **Read narrowly.** Grep and read the sections you need. Never read docs/WILBOW_VERBATIM.md, docs/DECISIONS.md or SUMMARY.md whole; search them.
3. **Build only DECIDED items** (BOARD.md). Unsure = ask in one line, don't guess. Guessing causes rework, the biggest waste.
4. **Stop rule.** If a fix fails twice, stop and report; no loops. No chasing tool warnings that turn out to be false alarms.

## Checks: cheapest first, stop when one answers the question
1. Syntax check of touched files (`node --check`).
2. The 1-3 node tests for the area you touched (`node tests/<area>_test.mjs`).
3. Visual or performance change: ONE headless look at **phone speed** (CPU throttle 4x) and lowest detail, not only desktop full detail.
4. Performance comparisons: at most one paired before/after run on a fixed seed. Headless audio numbers are noisy; the phone is the real check.
5. The phone test by Wilbow is the final check: say exactly what to try.

## Reports (every time)
- Short: what changed in player terms, what to try on the phone.
- **Unanswered approvals first**, numbered, each with a recommendation, answerable in one line ("1 merge, 3 keep").
- **Current APK** and how to get it (release page `releases/tag/latest-build`, file `JourneyOhm-b<N>-<date>.apk`; the game's dev button shows `dev · b<N>`).
- **Efficiency line**: any drain noticed this session and its simple fix.

## Memory lives in the repo, not in chats
- Update BOARD.md (and SUMMARY.md for approved changes) in the same pull request as the work.
- Merging to main builds the APK: don't build APKs locally.

## Cheap metrics (one line per session in docs/SESSION_LOG.md)
`date | AI | board item | outcome (merged / waiting / stopped) | rework? (y/n: redid something already "done") | chat turns (about)`
Rework and turns per item are the numbers to watch; if either climbs, the next session starts with a smaller task or a clarifying question.
