# BOARD: what state every piece of work is in

Wilbow, 9:57 PM MDT Oct 29 2026: "Dividing development into categories to maximize efficiency and make sure there's no confusion
generated from discussion and idea making is necessary. My main problem has been development happening based on misunderstandings."

This board is the **status layer** for every AI (Claude, Grok) and person working on The Journey Ohm. Read it before building anything.
The other docs (SUMMARY.md, docs/DECISIONS.md, docs/WILBOW_VERBATIM.md, docs/QUESTIONS_FOR_WILBOW.md) still hold the detail; this board only
says **which category each item is in**.

## The rules

1. **Every item is in exactly one category** (below). If you can't tell which, ask Wilbow; don't guess.
2. **Ideas land in DISCUSSION by default.** Talking about something, brainstorming, "maybe", "what if", "eventually" = DISCUSSION. It is never built.
3. **Only Wilbow moves an item to DECIDED**, in clear words ("build it", "yes, do X", "go"). Quote him and the time on the item.
   A builder's own idea, however good, goes to PROPOSED and waits.
4. **Anything built on the builder's own judgment is marked `(builder's call)`** in BUILT, so Wilbow can confirm or undo it.
5. **FIXES** are clear bugs with no taste call (something broken, wrong file, a crash, music theory errors against the reference).
   These may be built without asking, but they're still listed.
6. **Every built item has a switch** (dev panel) and a branch or PR. Off = exactly as before.
7. One line per item: `ID | area | what, in player terms | his words + time, or (builder's call) | switch | branch / PR`.
   Areas: **Music, Ohms, World, Gestures, Tech**.

## 1. DECIDED (build these)

| ID | Area | What | His words | Status |
|---|---|---|---|---|
| (none open) | | | | |

## 2. BUILT (check on the phone, then say keep / change / undo)

| ID | Area | What | Basis | Switch | Branch / PR |
|---|---|---|---|---|---|
| M1 | Music | 21 more traditions: jazz, blues, funk, Carnatic, Turkish makam, Persian dastgah, Chinese, Cuban son, rumba, samba, bossa, flamenco, Balkan aksak, Andean, overtone, reggae/dub, drum & bass, minimal, classical, modal, rock/pop; real scales, cycles and chord charts | 9 approved 4:59 PM Oct 23; "I had encouraged expanding" 9:32 PM Oct 29. The other 12 and every recipe value: (builder's call) from TRADITION_REFERENCE.md | traditions: wave 2 | `music/traditions-wave2` |
| M2 | Music | Guest accent: an ohm carried to another planet keeps its home tradition and, in a host jam, leans weak notes to its home focus notes, adds home grace notes, rests like home; always in the host key / tuning / tempo / cycle. Logs each meeting of two traditions | "traditions need to encounter each other ... musically sound" 9:37 PM, "brought into Jams on other planets, without ... missions" 9:39 PM Oct 29. The three rules: (builder's call) | guestAccent | `music/traditions-wave2` |
| O1 | Ohms | Body plans from the first game: blob, shell, serpent, strider, drum-belly, cluster, floater, from the instrument; gene outlines; 0-6 legs; spikes, fronds, feelers, tail, keel, fins, bubbles, band, plates; serpent segments near you only | "the old game felt better" + "soft body and unique ohms if scalable" 9:24 PM Oct 29; "continue with ... body" 9:47 PM. Mix of plans and how often each appears: (builder's call) | bodyPlans | `ohms/body-plans` |
| M3x | Music | Placeholder visual families for the new traditions (e.g. jazz uses folk's aura) | (builder's call), for Visuals to design | - | `music/traditions-wave2` |

## 3. PROPOSED (waiting for yes / no; not built)

| ID | Area | What | From |
|---|---|---|---|
| O2 | Ohms | Walking legs that move with a gait (legs are still drawn standing) | builder |

## 4. DISCUSSION (ideas and thinking; never built from here)

| ID | Area | Topic | Notes |
|---|---|---|---|
| K1 | Music / Gestures | **How the player changes the key.** Today: your notes are one vote among all ohms; a song's chart ignores you; only the jam view (spread on a jam, twist the disc) changes key. Ideas on the table: home key from the planet; your playing leads the jam you're in; a quick two-finger twist = up / down a fifth on the next phrase; songs transpose with you; drone traditions switch mode instead of key; more control unlocks with experience / teachers. | Wilbow 9:47 PM Oct 29: "Keep the key changes as discussion." |
| M4 | Music | **Several song groups at once.** Only one group (the "carrier") drives the shared chord; on-beat notes fit its chord 77-87%, but other groups nearby play their own charts over it (49-69% fit). Options: nearby groups lock onto one chart; others fade with distance; groups take turns; it stays as texture. | measured Oct 29 |
| M5 | Music | **What happens when traditions meet** (learning each other's accents, blended songs, a craze crossing planets, new hybrid traditions). The hook exists (bus 'trad.meet'); outcomes not designed. | Wilbow 9:37 PM Oct 29: "We don't need to calculate all those outcomes yet" |
| O3 | Ohms | Stylize the ohms further | Wilbow 9:24 PM Oct 29: later, not a priority |
| W1 | World | Pyramids as resonance / synchronization devices found on planets | earlier chat; planet exploration not built |

## 5. FIXES (bugs, no taste call)

| ID | Area | What | Status |
|---|---|---|---|
| F1 | Tech | The Oct 28 "Go with recs" files were uploaded to the repo root, so the game never loaded them | fixed, PR #1 (merge to make it live) |
| F2 | Music | Song melodies replayed over a new chord clashed on strong beats; now nudged to the bar's chord (switch strongSnap) | built, `music/traditions-wave2` |
| F3 | Music | Engine limit: chords come from the 7 scale notes, so blues V7, flamenco's III and samba's VI7 are approximated | open (needs an engine change; ask first) |
| F4 | Tech | tests/look_claim_test fails (already failing before Oct 29); tests/shape_test timing checks fail on a busy machine | open |
