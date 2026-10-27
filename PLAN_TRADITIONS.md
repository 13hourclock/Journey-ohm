# PLAN_TRADITIONS: the first eight traditions (wave 1)

Status: BUILT on track/traditions. The values below are Game Dev's reading of TRADITION_REFERENCE.md (sections 0, 1.1, 1.8, 1.10,
1.13, 1.14, 1.16, 1.21 and 1.27) and were values-checked by Music Theory against d5c408b (15 corrections applied Oct 25 2026; LEAN_K stays 2). Nothing in INSTRUMENT_PALETTE.md changed.

What Wilbow approved:
- 12:35 PM MDT Oct 25: points 1-5, 7 and 8 of the proposal. Point 6 is void: "Javanese" was a typo for Japanese, so Q233 C is
  void and gamelan gets no Javanese/Balinese split.
- 4:04 PM MDT: "A yes, all eight as suggested".
- 4:07 PM MDT: "A yes, the tradition sets the aura palettes and patterns". Visuals is drafting the design, so this track adds data
  hooks only and builds no visuals.
- Q150: one tradition per planet for now. Blending stays in the code but is switched off.
- Q188 A: each tradition has its own tempo and feel.
- Q149 A-D, by context: a tradition can come from the world and its ohms, from wild teacher ohms, be planted by an item or
  stroke, or grow from the player's songs.
- Q16 A+B: the seed lays the traditions out, and the land leans which one shows up.
- Spawn: the equal base spawn stays. The place lean (IOPTS.placeLean, ON) adds the planet tradition's instruments on top.

Shared frame (reference section 0): each jam has one tonic, mode, tempo and cycle, and they are exact. Variety lives only in
ornaments, note choice, density and song choice. Cultures add variety and never limit what plays (point 7): a tradition makes
things more likely, but an ohm can still play anything.

## 1. How it plugs in (www/js/traditions.js)

**Choosing the tradition.** Each planet gets one of the eight.
- The pick is seeded from the planet seed (`world.pseed`). Each tradition starts at weight 1, plus 2 x the terrain's share of the
  matching scales.js tradition group (Q16 B; the 2 is LEAN_K, a value to check). Mapping:
  - european -> western .6, celtic .4
  - hindustani -> hindustani
  - maqam -> maqam
  - east asian -> japan
  - gamelan -> gamelan
  - african -> wafrica
  - blues and jazz -> western .5, wafrica .5
  - eastern european -> maqam .5, western .3, celtic .2
  - techno has no land group, so it is base weight only.
- The same planet always gets the same tradition. Inside the tradition the seed also picks the scale (raga, maqam, mode, pathet),
  the cycle (for example jig or reel) and the tempo band.

**What the tradition sets.** Each part has its own dev toggle under "traditions"; all default ON:
- **tuning:** `music.setTuning('trad.<id>.<scale>')`, new entries in music.js TUNINGS.
  - Every entry keeps 7 slots, so the harmony, jam and song code that thinks in 7 degrees keeps working.
  - A 5-note scale fills the 7 slots by the nearest-note map. The two extra slots double their neighbours, which is how a
    pentatonic player treats fa and ti.
  - `scale.notes` keeps the true cents list for anything that wants it (music.cents() / things.js already read cents).
- **tempo:** `music.tempoK`. With the om lock ON (the default), BPM = om/64 x 60 x tempoK.
  - tempoK is the simple ratio from {1/2, 2/3, 3/4, 1, 5/4, 4/3, 3/2, 5/3, 2, 9/4, 5/2, 3} that lands nearest the tradition's
    target BPM, so the pulse stays tied to the om.
  - With the lock OFF (the player's own tempo), the tradition leaves the tempo alone.
- **feel:**
  - `music.tradFeel`: tightness 0..1, averaged with the region's feel in the jam snap (jam.js).
  - `music.swing`: the off-grid lines of the jam snap move late by swing x 1/3 of a step (music.when).
  - `music.tradDiv`: the jam grid per beat, 6 for 12/8 traditions.
- **cycle:**
  - The rhythm-cycle engine is `cycleInfo(name, beat)` -> { step, steps, pos 0..1, accent 0..1, land }, where land = the sam or
    the gong.
  - Drummer kits read the cycle through drums.js CYCLES / TRAD_CYCLE, which gain the new cycles below.
  - Ohm notes take a light accent from the cycle: vel x (0.85 + 0.3 x accent). This only changes loudness; no note is dropped.
- **lean:** `setPlace({ trad: { <palette id>: 1 } })` over the equal base (instruments.js placeWeight). The palette ids are
  western, hindustani, maqam, gamelan, japan, wafrica, celtic and techno.
- **drone:** on the drone traditions (hindustani, maqam, gamelan, japan) the planet STARTS on the drone chord (scale slots: tonic + fifth slot, `drone` per tradition,
  a scale's own `drone` overrides it: maqam ghammaz, iwato [0, 3]; an octave could be added on top later), and each
  harmony step adds a tonic pull of 1.5 votes toward chord root 0 (`harmony.tonicPull`, opts `tonicPull`). Nothing holds the harmony:
  jams still change chord and key through the normal pivot moves (Wilbow 2:21 AM: "a jam needs to be able to switch keys"; Music Theory #1).
  - A song chart still carries its own chords (the existing hold).
  - Leaving the planet or turning the toggle off gives the moving harmony back.
- **songs:** `world.tradition(planetSeed)`, the hook songs.js already reads. Songs take the tradition's form, section length,
  chord moves, cadence and rhythm cells instead of the seeded stand-in.
- **blend** (Q150): OFF. When on, the region's second tradition adds a 0.35 share to the place lean and the drum cycle mix. It is
  kept in the code but not used.

**Sources (Q149).**
- A, the world and its ohms: built.
- B, wild teacher ohms: every ohm is stamped with `ohm.tradId` at birth, and rare (wild) ohms carry the planet's tradition.
  Teaching a tradition to other ohms is a later step and needs a question.
- C, planted by an item or stroke: `traditions.plant(id)` is the dev hook, wired to a dev-panel select. There is no player gesture
  yet.
- D, grown from the player's songs: the existing `songs.makeTradition` path.

**Data hooks for Visuals.** Neutral placeholders; no visuals are built.
- `tradition.auraPalette`: 5 linear-RGB greys, each with a role (4:12 PM): `[{ role, rgb }]` with roles glow, line, fill, accent,
  fill. `tradition.auraRoles = { glow, line, fill, accent }` gives the first colour of each role.
  Raga planets add `tradition.timeOfDay` (0..1, from the raga's time).
- `tradition.auraPattern = { kind, fold, density, speed, beatLock, swing, rings: [{ speed }], pulse: { period, phase } }`:
  - kind by tradition: western tracery, hindustani lotus, maqam lattice, gamelan rings, japan waves, wafrica weave,
    celtic knot, techno grid
  - beatLock = tightness, swing = swing, speed = target BPM / 180
  - fold 6 and density .5 are neutral
  - rings: 3 rings, each speed .5 (neutral; motion per ring, 4:12 PM)
  - pulse: period = the rhythm cycle's length in beats (4 without a cycle), phase 0
- Per ohm:
  - `ohm.tradId` (id string) and `ohm.tradition` (the songs-shape object, with `.id` / `.name`; master's rare.js owns this getter, traditions.js only falls back to the same shape)
  - `ohm.rarity` (0 | 1) and `ohm.tier` (xp tier): owned by master's rare.js (Rare ohms); traditions.js gives writable fallbacks (wild = 1, tier 0) until rare.js sets them
  - `ohm.lively` (0 calm .. 1 lively, from its calm gene)
- Music feed: `ctx.tradition` in lookfeed.js = { id, name, auraPalette, auraRoles, auraPattern, timeOfDay, glide, micro, offScale,
  cycle { name, step, steps, pos, accent, land } }. The cycle's `land` is the gong / sam position.
  - glide: the meend flag
  - micro: the scale has microtones
  - offScale: the last ohm note was more than 15 cents off 12-TET
  - cycle: the gong / sam cycle position

**Cost.** Per frame the engine is one seed comparison. Real work happens once per bar and once per planet change, plus one
multiply per note.

## 2. The eight recipes

All cents are from the tonic. Tempo is in counted beats per minute. "Feel" = swing / tightness (0 = free, 1 = grid).

### 2.1 Western folk / hymn (`western`)
- Scales: ionian, aeolian, dorian, in 12-TET.
- Tempo: 90-120 (target 100 hymn/folk; hymn planets 80).
- Feel: swing 0, tight .7, grid 4.
- Cycles:
  - backbeat 4/4 (kick 1 & 3, snare 2 & 4, hats on eighths)
  - waltz 3/4 (song len 6 bars of 4 beats = 8 real 3/4 bars)
  - hymn (a downbeat only, no drum kit feel)
- Harmony: moving chords. Songs AABA, 4-bar sections, functional moves (I IV V), cadence V-I.
- Instruments: lean to the `western` palette rows.
- Ohms and songs: plain, singable phrases; the answer keeps the caller's rhythm. Density x1.

### 2.2 Hindustani raga (`hindustani`)
- Scales (the seed picks one raga), each with its time of day:

  | raga | cents | time of day | focus [Sa, vadi, samvadi] (0-based degrees) |
  |---|---|---|---|
  | Yaman | 0 204 386 590 702 884 1088 | .80 (early night) | 0 2 6 |
  | Bhairav | 0 90 386 498 702 792 1088 (flat Re / Dha extra-low) | .25 (dawn) | 0 5 1 |
  | Todi | 0 90 294 590 702 792 1088 | .35 (morning) | 0 5 2 |
  | Kafi | 0 204 316 498 702 884 996 | .85 (night) | 0 4 (Sa listed twice = once) |
  | Bhairavi | 0 112 316 498 702 814 996 | .30 (morning) | 0 3 (Sa listed twice = once) |
  | Khamaj | 0 204 386 498 702 884 996 | .90 (late night) | 0 2 6 |
  | Bilawal | 0 204 386 498 702 884 1088 | .40 (late morning) | 0 5 2 |
  | Purvi | 0 112 386 590 702 814 1088 | .75 (dusk) | 0 2 6 |

  Focus degrees are WEIGHTS, never limits: each distinct degree x1.5 once, a repeat does not stack (`FOCUS_K` .5) in `T.degW`; the jam leans its resolving
  note toward them (jam.js).

- Tuning: just intonation (cents above).
- Tempo laya by seed: vilambit 50, madhya 110, drut 180.
- Feel: swing 0, tight .5 (the alap breathes). Glide (meend) ON.
- Cycles:
  - teentaal 16 (sam 1, tali 5 / 13, khali 9 at colour .6; existing). Grid 2 steps per beat, so khali = step 16 (checked).
  - rupak 7 (sam is khali; tali 4, 6); song len 7 bars = 28 beats = 4 cycles
  - jhaptal 10 (sam 1, tali 3 / 8, khali 6 at colour .6, grid 2: step 10, checked); song len 5 bars = 20 beats = 2 cycles
- Harmony: the tanpura drone chord starts on Sa + Pa (slots [0, 4]); a tonic pull, jams can still move key.
- Song shape: sthayi -> antara (A B), 4-bar sections. Moves stay on I; cadence home (tihai feel on the sam).
- Instruments: `hindustani` rows (sitar, tabla, bansuri, tanpura...).
- Ohms: long held notes, sparser (density x .8), glides between notes, phrases that land on the sam.

### 2.3 Arabic maqam (`maqam`)
- Scales (quarter tones are real cents):

  | maqam | cents | focus [tonic, ghammaz] |
  |---|---|---|
  | Rast | 0 204 355 498 702 906 1055 | 0 4 |
  | Bayati | 0 145 294 498 702 792 996 | 0 3 |
  | Hijaz | 0 112 386 498 702 792 996 | 0 3 |
  | Saba | 0 140 294 390 702 792 996 | 0 2 |
  | Nahawand | 0 200 300 500 700 800 1100 | 0 4 |

- Tempo: 80-120 (target 100).
- Feel: swing .1, tight .6. Glide ON (light).
- Cycles, as iqa' on 16 steps:
  - maqsum: dum 0, 8 / tak 2, 6, 12
  - baladi: dum 0, 2, 8 / tak 6, 12
  - saidi: dum 0, 6, 8 / tak 2, 12
  - Sama'i thaqil 10/8 is held for wave 2.
- Harmony: heterophony over the qarar drone; the drone chord is tonic + ghammaz per maqam (slots: Rast [0, 4], Bayati [0, 3], Hijaz [0, 3], Saba [0, 2], Nahawand [0, 4]). Tonic pull, jams can move key.
- Song shape: A B A, 4-bar sections, cadence home (qafla to the qarar).
- Instruments: `maqam` rows (oud, ney, qanun, darbuka, riq...).
- Ohms: everyone plays the same line with their own ornaments (heterophony). Density x .9.

### 2.4 Gamelan (`gamelan`), one tradition with no Javanese/Balinese split
- Scales:
  - slendro: 0 231 474 717 955 (5 notes, nearest-note map onto 7 slots)
  - pelog bem: 0 120 270 540 670 785 950, weights [1 1 1 .3 1 1 .3]
  - pelog barang: same cents, weights [.3 1 1 .3 1 1 1]
  - Pathet weights lean, never forbid: a weak degree in a jam answer often steps to its stronger neighbour (jam.js).
- Ombak: the palette's existing beating (instruments.js detHz) stays as is.
- Tempo: lancaran is the brisk form, target 90 (ratio 3/2); ketawang 66; ladrang 50-70 (target 60).
- Feel: swing 0, tight .8 (colotomic and exact).
- Cycles (colotomic: gong = low, kenong = tom, kempul = colour, kethuk = time):
  - lancaran 16 (kethuk odd beats, kenong 4/8/12/16, kempul 6/10/14, gong 16)
  - ketawang 16
  - ladrang 32 (song len 8 bars = one 32-beat gongan)
  - kethuk time weight .5
  - The existing gongan stays for places with no tradition.
- Harmony: the drone chord tonic + fifth slot [0, 4] to start, tonic pull; jams can move key.
- Song shape: one gongan repeated (A A A A), 4-bar sections, seleh (goal note) on the 4th beat of each gatra.
- Instruments: `gamelan` rows.
- Ohms: interlocking, even notes that land with the gong. The gong-cycle position is on the feed.

### 2.5 Japanese traditional (`japan`)
- Scales: in 0 100 500 700 800, yo 0 200 500 700 900, hirajoshi 0 200 300 700 800, ryukyu 0 400 500 700 1100,
  iwato 0 100 500 600 1000. Each is 5 notes mapped onto 7 slots.
- Tempo: jo-ha-kyu at 60-80 rising to about 90 (target 70).
- Feel: swing 0, tight .25 (ma: silence and breath). Glide ON (shakuhachi bends).
- Cycles:
  - ma: 8 beats, a stroke on 1 and a light one on 5, the rest open
  - matsuri 2/4 (festival taiko don don doko)
- Harmony: drone chord tonic + fifth slot [0, 4]; iwato [0, 3] (its slot 4 is the 600-cent tritone); tonic pull, jams can move key.
- Song shape: jo -> ha -> kyu (A B C), 4-bar sections.
- Instruments: `japan` rows (koto, shakuhachi, shamisen, taiko...).
- Ohms: few notes with space between (density x .6), heterophony.

### 2.6 West African drumming (`wafrica`)
- Scales: major pentatonic 0 200 400 700 900 and minor pentatonic 0 300 500 700 1000 (12-TET, 5->7 map).
- Tempo: 100-140 dotted-quarter beats (target 120).
- Feel: 12/8, grid 6 per beat, swing 0, tight .85.
- Cycle: bell (existing) = standard bell 0 4 8 10 14 18 22 on 24 steps, feet 0 6 12 18.
- Harmony: moving (pentatonic, slow).
- Song shape: call and response A A B A, 2-bar sections; any drummer's cut-off call can end the song.
- Instruments: `wafrica` rows (djembe, kora, balafon, talking drum, agogo...).
- Ohms: call and response. Dense interlocking (density x 1.2).

### 2.7 Celtic (`celtic`)
- Scales: ionian, dorian, mixolydian, aeolian, in just intonation (to sit on the drone).
- Tunes by seed:
  - jig: 6/8, beat = dotted quarter, 110-125 (target 116)
  - reel: 4/4 counted in 2, beat = half note, 100-115 (target 108)
  - slip jig: 9/8 (target 116)
  - hornpipe: counted in 2, target 76 (ratio 5/4)
- Feel:
  - jig and slip jig: tight .7, grid 6 (jig) or 3 (slip jig, 3 eighths per dotted-quarter beat)
  - reel: swing .3, grid 4
  - hornpipe: swing 1.0 (the dotted 2:1 lilt), grid 4
- Cycles: jig, reel, slipjig, hornpipe.
- Harmony: moving over a tonic + 5th drone feel. AABB; a part is 8 real bars (song len 4 counted bars; slip jig len 6).
- Instruments: `celtic` rows.
- Ohms: running eighth notes with grace notes; the tune is played through 3 times. Density x 1.2.

### 2.8 Techno / house (`techno`)
- Scales: aeolian, phrygian, dorian, in 12-TET.
- Tempo: techno 125-140 (target 130), house 118-128 (target 124), picked by seed.
- Feel: techno swing 0, tight 1; house swing .35, tight .95.
- Cycle: four (kick 0 4 8 12, open hat 2 6 10 14 at .6, clap 4 12).
- Harmony: moving but slow (changes every 8/16/32 bars); house uses i7 | iv7 stabs.
- Song shape: intro, build, main, break, drop, outro (A A B A), 8-bar sections, cadence iv-i.
- Instruments: `techno` rows.
- Ohms: short repeated loops (density x 1.1). The kick is the anchor.

## 3. Ordered build steps (all done in this track)
1. The traditions.js data and pick, plus TUNINGS entries and music.tempoK / swing / tradFeel / tradDiv. No change when they are off.
2. Cycles in drums.js (backbeat, waltz, hymn, rupak, jhaptal, maqsum, baladi, saidi, lancaran, ketawang, ladrang, ma, matsuri,
   jig, reel, slipjig, hornpipe, four) and `cycleInfo`.
3. The engine: apply / undo per planet, accent, drone start chord + tonic pull, songs hook, lean, blend off, ohm stamps, feed.
4. The dev panel: master toggle, per-part toggles, the 8 per-tradition toggles, force/plant select, and a readout.
5. Tests: tests/traditions_test.mjs, plus the existing harmony, songs, tuning, jam and instruments tests, integration_test, and
   render_bench.

## 4. Music Theory values check (done)
Checked against d5c408b; the 15 corrections are applied in sections 2.1-2.8 above. LEAN_K stays 2. Open magnitude of my own:
`FOCUS_K` .5 (each distinct focus degree's weight x1.5; repeats count once, Music Theory follow-up).
