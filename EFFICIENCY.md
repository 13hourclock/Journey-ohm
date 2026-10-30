# EFFICIENCY: the token-saving protocol for every AI on The Journey Ohm

Wilbow, Oct 30 2026, 12:07 AM MDT: "make sure other instances and AIs use a protocol that preserves tokens through metrics that don't reduce the game development."
Applies to every Claude chat, Grok and any other AI tool (they all start from AGENTS.md). Saving tokens must never mean skipping what the game needs: cut repetition, rework and long reads, not checks that catch real problems.

## Session rules
1. **One task per chat.** Start a new chat for each board item. Kickoff line: *"Attach 13hourclock/Journey-ohm, read BOARD.md and GROK_HANDOFF.md, then: [task]."* Long chats re-read their whole history every turn: start fresh rather than continue.
2. **Read narrowly.** Grep and read the sections you need. Never read docs/WILBOW_VERBATIM.md, docs/DECISIONS.md or SUMMARY.md whole; search them.
3. **Build only DECIDED items** (BOARD.md). Unsure = ask in one line, don't guess. Guessing causes rework, the biggest waste.
4. **Stop rule.** If a fix fails twice, stop and report; no loops. No chasing tool warnings that turn out to be false alarms.

## Session names (Wilbow 12:11 AM Oct 30: reference sessions later instead of relying on summaries)
Every AI session gets an ID: **`JO-<YYYYMMDD>-<NN>-<who>-<item>`** (date it started in MDT, the day's running number, `claude` / `grok`, the main board item), e.g. `JO-20261030-01-claude-O4`.
- Rename the chat to the ID first thing (Wilbow can rename it in the app if the AI can't).
- The ID and the chat's own link go in docs/SESSION_LOG.md; commits carry `Session: <ID>` plus the chat link (Claude commits already end with `Claude-Session: <link>`).
- Need the detail later? Open the session by its link from the log: the full conversation, not a summary.

## Checks: cheapest first, stop when one answers the question
1. Syntax check of touched files (`node --check`).
2. The 1-3 node tests for the area you touched (`node tests/<area>_test.mjs`).
3. Visual or performance change: ONE headless look at **phone speed** (CPU throttle 4x) and lowest detail, not only desktop full detail.
4. Performance comparisons: at most one paired before/after run on a fixed seed. Headless audio numbers are noisy; the phone is the real check.
5. The phone test by Wilbow is the final check: say exactly what to try.

## Accountability (Wilbow 12:14 AM Oct 30: every AI points out its own and others' inefficiencies, suggests fixes, and no heavy token spending happens without disclosure and a note it is held to)
**Cost tiers. Say it before you spend it:**
- **Cheap** (just do it): a syntax check, 1-3 tests, reading a section, one small edit.
- **Medium** (do it, then name it in the report): one headless screenshot or perf run, a multi-file change, one CI build, reading a whole large file.
- **Heavy** (ask Wilbow first, in one line, with the reason and a cheaper alternative): repeated perf or measurement runs, more than one rebuild of the same thing, a second attempt at a failed fix, a large refactor, long background jobs, anything that doesn't serve a DECIDED item or a FIX.
**Every report's efficiency line names:** the medium or heavy actions taken and why; any waste by this AI (rework, a dead end, an unclear question that cost turns); any waste noticed from another AI or an earlier session (with its session ID); and one concrete suggestion.
**On the record:** each session's line in docs/SESSION_LOG.md lists its heavy actions and waste noted (self and others). An AI starting a session reads its tool's last log line first; if it shows waste, it states the fix it will apply, in one line, before working. Facts and fixes, not blame. Wilbow reviews the log; a pattern of waste means smaller tasks or a different tool for that job.

## Reports (every time)
- Short: what changed in player terms, what to try on the phone.
- **Unanswered approvals first**, numbered, each with a recommendation, answerable in one line ("1 merge, 3 keep").
- **Current APK** and how to get it (release page `releases/tag/latest-build`, file `JourneyOhm-b<N>-<date>.apk`; the game's dev button shows `dev · b<N>`).
- **Efficiency line**: any drain noticed this session and its simple fix.

## Wrap-up is automatic (Wilbow 12:09 AM Oct 30: "ensure auto wrap up in case I forget")
Never wait to be told. **Every pull request carries its own wrap-up**, so a chat can end at any moment without losing anything:
1. Append Wilbow's new words from the session, verbatim with MDT times, to docs/WILBOW_VERBATIM.md (decisions also to docs/DECISIONS.md).
2. Move or add the BOARD.md items it touches (new ideas go to DISCUSSION).
3. Approved game changes: a line in the newest SUMMARY.md section.
4. One line in docs/SESSION_LOG.md, plus open questions in the reply.
Also do a full wrap-up without being asked when the chat gets long, a usage warning appears, or Wilbow says "wrap up".
Every new chat **restates its task in one sentence** after reading BOARD.md, before building.
A GitHub check (.github/workflows/board-check.yml) fails any pull request that changes the game (www/, android/, .github/) without touching BOARD.md.

## Memory lives in the repo, not in chats
- Update BOARD.md (and SUMMARY.md for approved changes) in the same pull request as the work.
- Merging to main builds the APK: don't build APKs locally.

## Cheap metrics (one line per session in docs/SESSION_LOG.md)
`session ID | chat link | board items | outcome (merged / waiting / stopped) | rework? (y/n) | turns (about) | heavy actions (what, why) | waste noted (self / others, with fix)`
Rework and turns per item are the numbers to watch; if either climbs, the next session starts with a smaller task or a clarifying question.
