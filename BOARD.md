# BOARD: what state every piece of work is in

Wilbow, 9:57 PM MDT Oct 29 2026: "Dividing development into categories to maximize efficiency and make sure there's no confusion
generated from discussion and idea making is necessary. My main problem has been development happening based on misunderstandings."

This board is the **status layer** for every AI (Claude, Grok) and person working on The Journey Ohm. Read it before building anything.
The other docs (SUMMARY.md, docs/DECISIONS.md, docs/WILBOW_VERBATIM.md, docs/QUESTIONS_FOR_WILBOW.md) still hold the detail; this board only
says **which category each item is in**.

## The rules

0. **Every AI tool starts from AGENTS.md** and follows EFFICIENCY.md (token-saving protocol: one task per chat, cheapest checks first, short reports with approvals, a line in docs/SESSION_LOG.md).


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
| W3 | World | **Trees grow with play** (rings, thicker, more complex are in W2's first slice; still to build: each ohm's own marks, growth from ohm visits, not only jams). Every jam and ohm interaction makes a tree thicker and more complex; growth rings are viewable; each ohm leaves its own mark (e.g. drummer: rhythmic bark texture, singer: flowing tendrils) | 12:50 PM: "The trees should grow thicker and more complex with ohm interactions and jams"; 12:53 PM: "Growth rings being viewable is great and I like the other ideas. Approved ..." | next pass; switch jamTrees |
| W4 | World | **Exploring a tree** (not built yet; 5:18 PM: "I cant zoom into the tree"). Smooth pinch-zoom by drifting your focus; the closer you get, the finer the detail and the louder that part of the jam; as free as exploring a planet (not a guided replay). A jam is stored as notes + a seed, so look and sound always match | 12:13 PM: "the controls are really smooth so that you can easily pinch and zoom to different things by drifting your focus around"; approved 12:53 PM | next pass; switch jamTrees |
| W5 | Ohms | **Ohms learn at trees.** Bring ohms to a tree; each takes in the jam in its own way and gains experience, and gives growth back | 12:13 PM: "the trees should be a place where you can bring ohms to gather experience"; approved 12:53 PM. Cards ~1:05 PM Oct 30: both; playing along counts more than being near | next pass; switch jamTrees |
| W6 | World | **How trees are drawn:** shapes from growth math (L-systems, golden-angle spirals, fern math) as the backbone; GPU shaders paint them (domain-warp colour flow, reaction-diffusion patterns, kaleidoscope symmetry) and give endless zoom detail; flame fractals only as rare peak blooms, drawn once into a saved image | Cards ~1:05 PM Oct 30: "Yes, that mix" | next pass; switch jamTrees |
| W7 | World | **Pollinated seeds:** blooms pollinated by other trees give a seed mixing both jams' musical DNA; seed editing is deep, like the synth editor | Wilbow 12:15 PM idea; Cards ~1:05 PM Oct 30: "Deep like the synth" | next pass; switch jamTrees |
| I1 | Music / Ohms | **Instruments as their own layer** (sound engines separate from the music logic). Each ohm: its own voice + one instrument slot (sing and play); instruments handed around; skill per instrument family; custom synth instruments count as real ones. See PLAN_INSTRUMENTS.md, INSTRUMENT_PALETTE.md | Wilbow 11:55-11:59 AM; Cards ~1:05 PM Oct 30: approval covers "All of it" | next pass; switch instrumentLayer |
| I2 | Music | **Emergent genres:** custom sounds sorted into families by their sound; sounds that fit none form new families or genres on their own, slowly, after consistent use; early encounters stick to proven music | Wilbow 11:58, 11:59 AM; Cards ~1:05 PM Oct 30: "All of it" | next pass; switch emergentGenres |
| G1 | Gestures | **Zoom without snapping:** zoom is one smooth, continuous movement that rests wherever you let go (no snapping into zones); fits W4's drift-zoom | 5:18 PM: "I dont like how the zooms snaps into different zones."; cards ~5:27 PM Oct 30: "Yes, build G1" | next pass with W4; switch smoothZoom (off = today's snapping) |
| X4 | All | **Soft guardrails:** nothing blocked, but every edit shows its effects before you commit (e.g. a note that would go out of key glows), at note, ohm, jam and planet scale | Wilbow 12:01 PM; Cards ~1:05 PM Oct 30: "All of it" | next pass; switch softGuardrails |

## 2. BUILT (check on the phone, then say keep / change / undo)

| ID | Area | What | Basis | Switch | PR |
|---|---|---|---|---|---|
| W2 | World | Jam trees, first slice: a jam that grows (jamgrow: in time, in harmony, watched) plants a tree there; the notes played near it shape it (strongest interval = split angle, groove = 2/3-way splits and lengths); every grown jam adds a ring (taller, thicker, one level deeper, its ohms' colours, colour shifting trunk -> tips); top-level jams bloom (sunflower seed heads; even + consonant jams: flower-of-life); zoom in to see the ring cut at the base (first part of W3). Per planet, saved. Look: docs/concepts/jam_trees/ingame_first_slice.png | approved 12:53 PM Oct 30, "start the build" 1:07 PM; tree size, colours, bloom kinds: (builder's call) | jamTrees | trees/w2-jam-trees |
| O2 | Ohms | Walking legs: near ohms step with their legs as they move; far ohms keep standing legs | KEPT 8:33 AM Oct 30 | walkLegs | #5 (merged) |
| F3 | Music | Real chromatic chords: blues V7 (G B D F), flamenco III (the true Andalusian iv-III-II-I), samba VI7 (A C# E G). Still stand-ins: samba iv, the jazz bridge | approved 10:12 PM Oct 29 "Do all"; which chords and charts: (builder's call) | traditions: chromatic chords | #6 (merged) |

| O4 | Ohms | First game's variety: every ohm born with its own skin pattern (spots, stripes, rings, patches or plain), a second colour, see-through skin or an inner glow for some, and stronger shape differences; muted colours | Wilbow 10:52 PM Oct 29 'never having nearly as much diversity', 11:08 PM 'All ok'; pattern mix and strengths: (builder's call) | ohmVariety | #11 (merged, approved 8:33 AM Oct 30) |

## 2b. KEPT (approved after building; Wilbow 10:12 PM Oct 29 "Do all")

| ID | Area | What | Switch | PR |
|---|---|---|---|---|
| M1 | Music | 21 more traditions (all recipe values kept) | traditions: wave 2 | #3 |
| M2 | Music | Guest accent (its three rules kept) | guestAccent | #3 |
| F2 | Music | Song melodies' strong beats fit the bar's chord | strongSnap | #3 |
| O1 | Ohms | Body plans from the first game (plan mix kept) | bodyPlans | #4 |
| M3x | Music | Placeholder visual families for the new traditions, until Visuals designs them | - | #3 |
| F1 | Tech | Oct 28 "Go with recs" files moved where the game loads them | - | #1 |

## 3. PROPOSED (waiting for yes / no; not built)

| ID | Area | What | From |
|---|---|---|---|
| (none open) | | | |

## 4. DISCUSSION (ideas and thinking; never built from here)

| ID | Area | Topic | Notes |
|---|---|---|---|
| K1 | Music / Gestures | **How the player changes the key.** Today: your notes are one vote among all ohms; a song's chart ignores you; only the jam view (spread on a jam, twist the disc) changes key. Ideas on the table: home key from the planet; your playing leads the jam you're in; a quick two-finger twist = up / down a fifth on the next phrase; songs transpose with you; drone traditions switch mode instead of key; more control unlocks with experience / teachers. | Wilbow 9:47 PM Oct 29: "Keep the key changes as discussion." |
| M4 | Music | **Several song groups at once.** Only one group (the "carrier") drives the shared chord; on-beat notes fit its chord 77-87%, but other groups nearby play their own charts over it (49-69% fit). Options: nearby groups lock onto one chart; others fade with distance; groups take turns; it stays as texture. | measured Oct 29 |
| M5 | Music | **What happens when traditions meet** (learning each other's accents, blended songs, a craze crossing planets, new hybrid traditions). The hook exists (bus 'trad.meet'); outcomes not designed. | Wilbow 9:37 PM Oct 29: "We don't need to calculate all those outcomes yet" |
| O3 | Ohms | **Ohms need more character** (more than O4's variety) | Wilbow 9:24 PM Oct 29: later, not a priority. Wilbow 5:18 PM Oct 30: "The ohms still dont have the visual difference amount i want.  They need to have more character." -> direction to pick |
| W1 | World | Pyramids as resonance / synchronization devices found on planets; idea Oct 30: trees power pyramids, linked pyramids join planets (unity across the universe) | earlier chat; planet exploration not built |
| X1 | All | **Work in passes** (Wilbow 11:43 PM Oct 29: "everything currently visible in the game a place holder ... needs done in passes"): Pass 0 placeholder, 1 works, 2 connected (feeds and reacts to other systems), 3 styled. Every system moves one pass at a time, each with his OK. | keep discussing (11:45 PM: "keep the other ideas in discussion for a while") |
| X2 | All | **Explore before building**: one-page idea sheets per connection (options + sketches, nothing built until he picks); prototype scenes behind dev switches (one app); one full slice first (e.g. sound -> visuals through every pass) to set the pattern | keep discussing |
| X3 | All | **System map** (built 11:45 PM Oct 29, exploration only): every system, its pass, and every connection marked connected / thin / placeholder / missing. Page: https://claude.ai/artifact/JtEN4zwcirU6ptx589VjmD ; copy: docs/SYSTEM_MAP.html | for choosing what to explore next |

## 5. FIXES (bugs, no taste call)

| ID | Area | What | Status |
|---|---|---|---|
| F5 | Music | Samba iv and the jazz bridge (ii/IV, V/V) are still diatonic stand-ins (F3 covers blues V7, flamenco III, samba VI7) | open (ask first) |
| F6 | Tech | The automatic APK build failed on every run since Oct 27 (Android SDK setup step); runner pinned to ubuntu-24.04, preinstalled SDK used | fixed, PR #8 |
| F7 | Ohms | On a busy phone every ohm became a plain circle (the lowest detail rung skipped all body shapes); now ohms keep their real outline, the nearest 4 keep their full body, legs and features, the focus ohm keeps walking legs | fixed, PR #9, switch lowShapes |
| F8 | Music | Audio static on the phone: crackles come from bursts (many ohms starting notes in the same instant at bar lines; single audio blocks spiked to 4-9x their time budget), worse on busy planets; present before Oct 29 too. Now: note starts spread over a few ms (at most 3 per audio block), and when busy, fewer synth voices at once with the quietest (far / soft) dropping first; your own taps are never dropped. At 4x CPU slowdown: 45% fewer missed audio deadlines (853 -> 477 over 6 paired runs) | improved, PR #10, switch audioBudget; not gone: needs a phone check |
| F9 | Tech | Every GitHub build had a new random signing key, so each one needed an uninstall; now one shared test key signs every debug build and the version number goes up each build, so new builds install as updates | fixed, PR #13 (one last uninstall after it) |
| F10 | Tech | APK versions were confusing: two names for the same file, the same file name every build, no build number in the game. Now one file per build named JourneyOhm-b<N>-<date>.apk on the release page, and the dev button shows `dev · b<N>` | fixed, PR #15 |
| F11 | Ohms | Ohms piled up and bounced off each other (Wilbow 5:18 PM Oct 30). Cause: the ground is one screen wide (7.7 units), so a grown world's ground ohms don't fit (14 ohms: 13.7 units of bodies) and shove forever. Now: slow touches between ohms stop softly (no bounce, ring or strike sound), and while the floor is over 80% taken the newest ground ohms hover in a band above it, settling back when there is room (hover band and thresholds: builder's call). 14-ohm world at 4x CPU: contacts 15 -> 4-5, jostle speed 0.25 -> 0.02 (same as a calm 8-ohm world) | fixed, switch crowdCalm; phone check |
| F12 | Ohms | Can't pick ohms up any more (Wilbow 5:29 PM Oct 30). Not reproduced headless: press + drag grabs in a fresh world, a 14-ohm world and zoomed in. Suspect: a pinch near a tree went into an ohm (dive), where one finger plays the inside instead of grabbing | open: waiting for what he sees
| F4 | Tech | tests/look_claim_test fails (already failing before Oct 29); tests/shape_test timing checks fail on a busy machine | open |

## 6. Housekeeping

| ID | What | Status |
|---|---|---|
| T2 | Release signing with the lensure key (builds also update over Grok's old installs; needed for the Play Store) | for Grok when usage is back: see GROK_HANDOFF.md section 0 |
| H2 | Auto wrap-up: every pull request carries its board update, Wilbow's words and a session-log line; GitHub board check flags game changes without a board update | done, PR #17 |
| H1 | Make the GitHub repo private | Wilbow to do it (Claude cannot change repo settings): Settings -> Danger Zone -> Change visibility. Grok loses access to a private repo unless added. |
