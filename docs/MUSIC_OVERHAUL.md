# MUSIC_OVERHAUL.md: from a generative music maker to a game with a DAW and accurate music

**Status: PROPOSAL, nothing built.** Written by Resonance (executor job) on Sat Oct 24 2026, ~9:10 PM MDT. No game code was changed and no APK was built.
Measurements came from a throwaway headless script, `/workspace/softsound_logs/overhaul/measure.js`. Its raw output is in `out_*.json`, `*.log` and `summary.json` in the same folder; it is not a repo test.
Companion docs, not edited here:
- `TRADITION_REFERENCE.md` (Music Theory bot, in progress): real notes and song recipes for each tradition.
- `PATTERN_LIBRARY.md`: data schema; its §2 mix engine is parked.
- `MUSIC_THEORY.md`: earlier bug list.

Wilbow's words this answers (verbatim):
- 8:50 PM: "Let's overhaul the traditions system and let's look at the real notes in the music theory. We need to redo what we are calling music because the cohesiveness is only present sometimes. We need something like a library of songs for development. The ohms need to be working towards making a song out of a jam. The world reacts in different ways to a song than a jam"
- 8:52 PM: "This currently feels like a bad generative music maker. It needs to be a game that has a daw and accurate music creation"
- 8:55 PM (DECIDED): "Let's keep each planet as one tradition for now. The ohms should be able to make successful song with the theory naturally and be already doing that when you encounter a group of them"
- 8:56 PM (LONG-TERM GOAL): "Eventually I want the planets much bigger with regions of blending traditions between but it seems to have been forgotton"

---

## 1. Findings in one screen

1. **Inside one formed jam, the band is already tight in time and mostly in key.**
   - Notes land a median of about 1 ms from the shared 16th grid, and 97–99 % are within 20 ms.
   - Tempo drift between members is 0.
   - About 98 % of notes are in the jam's scale.

   So the "only sometimes cohesive" feeling does **not** come from sloppy per-note timing.
2. **It comes from five things the measurements show clearly.**
   - **a. Too many musics at once.** In a normal crowd, **80 %** of the time two or more sources are audible together (2–3 separate jams, plus solo ohms). Each has its own key and tempo. Solo ohms near a jam land on that jam's grid only **~29–31 %** of the time.
   - **b. Band members disagree about the chord.** Followers hear the chord "by ear" and play their *belief*.
     - They match the bass ohm's actual chord only **72 %** of the time in a 4-ohm band and **51 %** in crowds.
     - Strong-beat notes are chord tones of the *real* chord **86 % / 75 %** of the time, but chord tones of the *player's own belief* **99 %** of the time. The notes obey the wrong chord; it is not bad note choice.
   - **c. No song.** Bar-to-bar melody repetition is **6–10 %**, so there is no hook. Progressions and sections are rolled at random for each jam. There is no form (verse/chorus, AABB, 12-bar, tala cycle and so on) that a listener can learn.
   - **d. Warm-up instead of music.** When ohms meet, the frame forms **~8.6 s** later. Members are silent until they lock. Followers then spend bars converging on chords. You always arrive at a negotiation, never at a song.
   - **e. The score is too lenient.** The jam's own score (`E.score`) averaged **0.90–0.92** even in runs where only half the band agreed on the chord. The game believes it sounds good when it doesn't.
3. **Tradition data is mostly right; the engine misuses it.** Scales and cents were checked against real values for all 24 traditions, and rhythm cells against the real clave, bell, aksak, compás and tala. Most are correct (§4). The wrong music comes from engine code that ignores or bends the data:
   - Blues uses wrong roots and triads instead of the correct 12-bar `dom7` chart already in `St.D`.
   - The tanpura always plays Pa.
   - `H.bind` pulls raga and maqam phrases onto triads.
   - Flamenco compás is phased from beat 1 instead of 12.
   - Overtone silently becomes western without a voiced ohm.
   - There are several more; see §4.
4. **Verdict.** The pieces exist: roles, traditions, a groove, a shared pulse, a DAW river. What is missing is **one shared song that every ohm plays from exactly**. The fix is architectural, not a matter of tuning weights.

---

## 2. How a jam's music is made today (end to end)

1. **Meeting.** `jam.js:40-55` pairs ohms that perceive each other. With `RS.Cohere` on, a conversation immediately calls `Co.form([c,o])` (`cohere.js:20-23`), and `J.form` happens when coherence > `J.TH` .62 after 3 exchanges (`jam.js:8,57-60`).
2. **Frame.** The proposer is the most confident ohm (`Co.pick`).
   - Key and scale (`E.sys`, `tonicC`) come from its **own birth scale**.
   - Swing is clamped to .14, and the groove comes from the drummer's grammar cell.
   - Then `Tr.vote`/`Tr.apply` (`trad.js:37-47`) vote a tradition **per jam**, which can override the scale, meter, cycle and swing.
   - The tradition comes from each ohm's lean, a **planet culture blend** (`trad.js:28-35`, `St.blend`).
3. **Roles.** `Co.roles` assigns melody lead, bass (lowest register), comp/texture and drums, within the caps of 6 tonal / 4 / 3 drums (`cohere.js:12`). The bass becomes `E.prop` and proposes chords. The first drummer becomes `E.pulse`.
4. **Clock.** Every ohm has its **own clock** (`mind.js:28`, tick ~L170-180, 0.16 s lookahead, swing on odd 16ths, jitter `(1-prec)*.008 s` in a jam and .03 s alone). `Co.lock` (`cohere.js:50-57`) converges members onto the pulse ohm's position and bpm, then copies it. Members are silent until locked.
5. **Harmony.** Each ohm has its own brain (`harmony.js`: vocab L38, beliefs by ear L55-65).
   - The proposer builds `E.song` from **random A/B/C sections and K modulations** (L73-96), and `Tr.chord` may override them (`trad.js:59-62`).
   - Followers play the chord they *believe* is sounding.
   - `H.bind` (L102-115) late-fits every note to that belief.
6. **Notes per bar** (`cohere.js:61-96`, `Co.bar`):
   - bass: root + groove + walk-ups (proposer), or the belief root (others);
   - comp: chord tones;
   - melody: `Mi.genBar0` (`mind.js:82-113`), a random phrase plan, contour and development op, ≤ 6 notes on the 16th grid;
   - drums: `Mi.drumBar`;
   - then `Tr.bar` (`trad.js:66-93`) applies the tradition's rules: drone, colotomy, tumbao, montuno, kotekan, heterophony and so on.
7. **Play.** `Mi.play` (`mind.js:~200-210`) applies the quiet/mute gates, drum voices, accents, vocal attach, learned sound layers, the DawBrain record and the mind log. `Social.gain` is applied **after** `Sf.play` (`mind.js:209`), so it has no effect on the note just played: a bug.
8. **Hearing.** `Co.audible` (`cohere.js:101-102`) lets up to **6** ohms near the camera sound, including solo ohms in their own key and tempo.
9. **Judging.** `harmony.js:173-190` (`barE`) scores key, sync, grid, register, timbre, density and space. After 8 bars ≥ .7 the jam is "settled". `RS.Jam.seedCheck` turns a settled 24-bar form into a **jam seed**, which grows plants (`growth.js:10,107`) and teaches the region its key and bpm (`field.js:29-36`).
10. **Off-screen.** Off-screen jams are not note-generated (good), but they have no song state either. On return the music is re-negotiated, which matches the 7:27 PM bug report: "the song didn't sound the same on return".

**Musical data used:** none from real songs. Everything is genes + rules + the `St.D` tradition tables (scales, meters, cells, motifs, progressions).

---

## 3. Measurements (headless, seeded)

**Method.** `measure.js` uses `tests/node_env.js` at 60 fps.
- It wraps `Mi.play` to record audible notes after an 8 s warm-up, and `H.prop` to record the chords played each bar.
- It samples the scene every 0.5 s.
- Grid error is measured against the **pulse ohm's clock**, allowing for the jam's swing; 32nd-note placements count as intended.
- "In scale" means within 30 cents of a degree of `E.sys`.
- "Strong" means the start of a beat group.

**Scenes:**
- **band:** 1 drummer + 3 tonal ohms, 66 px apart, 30 seeds × 90 s.
- **crowd:** a seeded planet with 10 random genomes 42 px apart, 12 seeds × 90 s.
- **trad:** the band scene with the tradition forced, 24 traditions × 2 seeds × 60 s.

### 3.1 Band and crowd (means; band range in brackets)

| metric | band (30) | crowd (12) | what it means |
|---|---|---|---|
| in-scale notes | 98.1 % [89–100] | 97.3 % | pitch-in-key is fine inside a jam |
| strong-beat chord tone vs **actual** chord | 86.0 % [58–100] | 75.3 % | ¼ of strong beats in crowds clash with the bass's chord |
| strong-beat chord tone vs **own belief** | 99.2 % | 99.4 % | the note choice is right; the chord knowledge is wrong |
| all-note chord tone | 73.8 % | 66.9 % | |
| followers on the same chord as the proposer | 71.7 % [49–97] | 51.1 % [16–74] | **cause 2** |
| onset error vs shared grid, median | 1.2 ms | 1.0 ms | tight |
| onsets within 10 / 20 ms | 96.5 / 97.7 % | 98.7 / 98.8 % | tight |
| tempo difference between members (p90) | 0.00 bpm | 0.01 bpm | no drift once locked |
| members not yet locked (silent) | 1.6 % | 1.7 % | |
| meter mismatch between members | 0 % | 0 % | |
| melody bar repeats (exact or transposed) | 9.7 % [0–50] | 5.6 % | **no hook (cause 3)** |
| 4-bar chord loop repeats | 45.6 % | 48.1 % | loops exist but are re-rolled per jam |
| distinct chords per 82 s | 5.2 | 6.1 | |
| time until first frame | 8.6 s | 8.9 s | **warm-up on arrival (cause 4)** |
| samples with 2+ audible sources | 7.3 % [0–54] | **80.1 %** | **cause 1** |
| separate jams audible at once (max) | 1 | 2.2 | |
| solo notes in the main jam's key | 73.2 % | 97.8 % | |
| solo notes on the main jam's grid (≤20 ms) | 29.0 % | 29.4 % | solo ohms are off-tempo against the jam |
| "settled" share of samples | 79.0 % | 71.7 % | |
| jam's own score `E.score` | 0.92 | 0.90 | too lenient (cause 5) |

### 3.2 Per tradition (band scene, forced tradition, 2 seeds each)

| trad | in-scale | strong chord-tone | follower sync | melody repeat | note |
|---|---|---|---|---|---|
| western | 98.9 | 80.5 | 49 | 30 | |
| hindustani | 99.5 | 89.4 | 80 | 17 | drone; strong beats bound to a triad (H.bind) |
| carnatic | 98.2 | 90.5 | 75 | 20 | |
| maqam | 99.5 | 92.3 | 83 | 24 | |
| gamelan | 100 | 100 | 100 | 6 | balungan is not a repeating melody |
| wafrica | 100 | 92.9 | 47 | 0 | settled only 24 % |
| cuban | 100 | 84.2 | 43 | 3 | |
| bossa | 100 | 86.4 | 48 | 3 | |
| aksak | 99.3 | 87.5 | 75 | 5 | |
| flamenco | 98.9 | 74.0 | 77 | 13 | settled only 24 % |
| japan | 100 | 94.3 | 48 | 4 | |
| blues | 99.6 | 95.9 | 68 | 10 | right *notes*, wrong *chords* (§4.1) |
| celtic | 96.5 | 95.7 | 83 | 15 | no AABB tune |
| andean | 99.5 | 96.9 | 94 | 17 | |
| jazz | **85.3** | **67.6** | **3.5** | 0 | 7th/9th chords vs triad beliefs |
| funk | 91.3 | 85.6 | **0** | 38 | dom9 vamp vs triad beliefs |
| dastgah | 100 | 92.4 | 85 | 4 | |
| makam | 99.6 | 77.2 | 92 | 5 | |
| samba | 96.8 | 94.1 | 18 | 16 | |
| rumba | 100 | 86.1 | 39 | 0 | |
| reggae | 97.7 | **57.2** | 66 | 9 | |
| techno | 100 | 99.2 | 48 | 13 | |
| overtone | (= western) | | | | **forced overtone fell back to western**: no voiced ohm (`trad.js:35`) |
| china | 100 | 88.9 | 67 | 6 | |

Caveat: follower sync compares the exact chord object. For jazz and funk part of the near-zero figure is a *representation* mismatch: the proposer plays 7th/9th chords and followers believe triads. That is still a real musical fault, because the comp then plays triads under a 9th chord.

### 3.3 Causes with file:line

1. **Several musics at once.**
   - `cohere.js:101-102` `AUD=6` lets solo ohms and separate frames sound together.
   - A solo ohm keeps its own key and tempo (`mind.js:28`, jitter .03 s alone).
   - Each conversation forms its own frame (`cohere.js:20`).
2. **Chord by ear.**
   - Followers use `H.update/belief` (`harmony.js:55-65`).
   - Non-proposer bass plays its belief root (`cohere.js:~66`).
   - `H.bind` (`harmony.js:102-115`) snaps notes to the belief, so the error is consistent but wrong.
3. **No song identity.**
   - Random sections and modulation per jam: `harmony.js:73-82`.
   - Random phrase plan, contour, devOp and weighted note dice: `mind.js:44-58, 82-113`.
   - No stored form, no hook. The settled snapshot is not a song.
4. **Negotiated start.**
   - The conversation must reach `J.TH` .62 over 3 exchanges (`jam.js:12-21,57-60`).
   - Members are silent until `Co.lock` converges (`cohere.js:50-57`).
   - Off-screen jams keep no song position, so there is nothing to resume.
5. **The tradition is chosen per jam** (`trad.js:37-47` vote) from a blended planet culture (`trad.js:28-35`, `styles.js` `St.blend` pull .12-.32), and can fuse mid-jam (`trad.js:158-159`, `Tr.BRIDGE` .6).
6. **The score is lenient** (`harmony.js:173-190`). Chord-tone cents count as in key, and nothing checks agreement *between* members.
7. **Bugs:**
   - `Social.gain` is applied after the note (`mind.js:209`).
   - `Tr.BLUES` uses degree indices (`trad.js:58`); see §4.

---

## 4. Tradition audit: real theory vs code

The full real-note reference is in `TRADITION_REFERENCE.md`. This section lists what the **code** gets right or wrong.

### 4.1 Wrong (fix before anything else)

| # | tradition | what the code does | what real music does | where |
|---|---|---|---|---|
| E1 | blues | `Tr.BLUES=[0,0,0,0,3,3,0,0,4,3,0,4]` are **scale-degree indices**: degree 3 of Blues hexatonic (0 3 5 6 7 10) is **600 c, a tritone root**, and degree 3 of Major blues (0 2 3 4 7 9) is a **major-3rd root**. Roots are only right in Mixolydian/bebop. | 12-bar: I7 I7 I7 I7, IV7 IV7 I7 I7, V7 IV7 I7 V7 (roots 0 / 500 / 700 cents). **`St.D.blues.harm.prog` already holds exactly this** and is unused. | `trad.js:58,60` |
| E2 | blues | chords are triads stacked in the scale: a **sus4** (0 5 7) on Blues hexatonic, a minor triad on Major blues | dominant 7ths (0 4 7 10) on every chord, with the minor-3rd blue note in the melody only | `tonal.js` `To.chord`, `trad.js:60` |
| E3 | blues, jazz | St.P uses `'4/4'` + swing .12 (blues) | triplet shuffle: off-beat at 2/3 of the beat (`'4/4t'` exists in St.D and is unused by blues St.P) | `styles.js:27` |
| E4 | hindustani | tanpura always plays **Pa** | Pa-less ragas (Marwa, Malkauns) tune to Ni or Ma. `St.D` has `drone_no_pa` / `drone_no_pa_no_ma`, unused | `trad.js:78-79` |
| E5 | maqam, raga, dastgah, makam | drone traditions return a **root triad** as "the chord", so `H.bind` drags pakad/sayr notes onto 1-3-5 and Rast gets a neutral-third "triad" | drone = tonic + fifth (or + fourth); melody notes are free against it | `trad.js:60`, `harmony.js:102-115` (MUSIC_THEORY §2.2-2.3, still open) |
| E6 | flamenco | `compas` meter `[6,6,4,4,4]` groups 3+3+2+2+2 **from beat 1**, so meter accents fall on 1 4 7 9 11, while the accent cell (correct) is on 3 6 8 10 12 | soleá/bulerías count from **12**: 12 1 2 \| 3 4 5 \| 6 7 \| 8 9 \| 10 11, so accents land on 12 3 6 8 10 | `trad.js:17` vs `St.D.flamenco.cells` |
| E7 | overtone | needs a voice-like ohm or silently becomes **western**; measured 2/2 forced runs | a planet of this tradition must still sound like it: drone + harmonic melody on any sustaining voice | `trad.js:35` |
| E8 | cuban | tumbao plays the **current** root on beat 4 | beat 4 **anticipates the next chord's** root, tied over the bar line; the montuno anticipates too | `trad.js:80` (MUSIC_THEORY §2.5, still open) |
| E9 | pentatonic | `To.chord` stacks [0,2,3] for ≤5-note scales: a sus4 on minor pentatonic | minor pent 0-300-700 = degrees [0,1,3]; major pent 0-400-700 = [0,2,3] | `tonal.js` (MUSIC_THEORY §2.6, still open) |
| E10 | jazz, funk, bossa, house | proposer chords are 7th/9th/13th; followers' vocab is triads, so comps clash and sync is 0–4 % | comp plays the chart's voicing (guide tones 3 & 7 at minimum) | `harmony.js:38` vocab vs `St.D.*.harm.prog` |
| E11 | reggae | skank on every off-beat 8th (`..x...x...x...x.`) | one-drop reggae: skank on beats **2 and 4**; off-8th skank is ska/rocksteady | `St.D.reggae.cells.skank` |

### 4.2 Thin or invented (works, but is not the real thing)

1. **Raga rules exist for only 4 of 8 ragas** (`trad.js:19-20`: Yaman, Bhairav, Kafi, Todi). Bhupali, Marwa, Malkauns and Darbari get no vadi/samvadi/pakad. Darbari's andolan on komal Ga is not modelled. The Hindustani motifs in `St.D` duplicate `Tr.RAGA`.
2. **No raga form.** There is no alap → jor → jhala (free → pulse → fast). Tintal's sam and khali are claps only, and the tihai is a data cell with no cadence logic.
3. **Maqam sayr is a generic contour by bar.** There is no ghammaz (pivot note), no taqsim → metred piece, and no sama'i 10/8.
4. **Gamelan.** Irama is "double density after 60 s". Pathet subsets are unused. The balungan motif is invented, and kotekan is a generic [0,1,2,1] that needs exactly 2 members (`trad.js:81`).
5. **Japan.** "Ma" is a rest in bar 2 of every 4, which is crude.
6. **Celtic.** There is no AABB 8-bar tune form, although that form *is* Celtic dance music.
7. **Aksak is a rhythm family, not a culture.** Its cells are correct: rachenitsa 2+2+3, lesnoto 3+2+2, daychovo 2+2+2+3, kopanitsa 2+2+3+2+2.
8. **Unused data:**
   - `St.D` progressions for aksak, celtic, andean and rumba;
   - lesnoto 7/8b;
   - the andean cells;
   - the jazz rootless voicings. These are written relative to the **key tonic** and are correct only for ii-V-I in that key.
9. **Minor.**
   - The "partido-alto" comment is under bossa.
   - Overtone has harmonics 8-12 but not 11/13.
   - The gamelan gong falls on the first step of the cycle. This equals the end of the previous gongan, so it's acceptable, but there is no buka (intro) before the first gong.

### 4.3 Correct (checked)

1. **Scales (cents):**
   - western majors/minors;
   - all 8 ragas;
   - Carnatic melas (Mayamalavagowla, Shankarabharanam, Kalyani, Kharaharapriya, Mohanam, Hindolam);
   - Arabic Rast 0 200 350 500 700 900 1050, Bayati, Hijaz, Saba;
   - Turkish AEU Rast 0 204 385 498 702 906 1087, Uşşak, Hicaz;
   - Persian Shur, Segah, Chahargah, Mahur, Homayun;
   - slendro ≈240-c steps, pelog;
   - Japanese in, yo, hirajoshi, ryukyu, iwato;
   - all 5 Chinese modes;
   - blues hexatonic, major blues, minor pentatonic;
   - overtone harmonics 8:9:10:12 = 0 204 386 702.
2. **Cycles and cells:**
   - tintal clap/wave, rupak 3+2+2, jhaptal 2+3+2+3, adi 4+2+2;
   - 12/8 standard bell;
   - son clave 3-2, rumba clave (third stroke late), bossa clave, tumbao placement (beats 2& and 4);
   - maqsum, baladi, saidi;
   - aksak usul 9/8, curcuna 10/8 3+2+2+3;
   - soleá and seguiriya accent cells;
   - huayno, one-drop kick on 3, techno/house four-on-the-floor.
3. **Progressions:** the blues 12-bar (in data), ii-V-I major and minor, the Andalusian cadence iv-III-II-I, bossa I-II7-ii-bII7, Celtic I-bVII and i-bVII-bVI, andean i-III-bVII.

**So:** the data is a good base. The fix is to make the engine play the data **as written** and to add *forms* and *real tunes*.

---

## 5. The reframe: a game with a DAW and accurate music

The core change, in player terms:

> **Every group of ohms is playing a SONG**: one shared, written-down piece with one key, one tempo, one meter or cycle, one chord chart (or drone), a form and a hook. Every ohm plays its own part of that song exactly. You can hear it, see it in the DAW river, change it, join it, arrange it and keep it.

### 5.1 The shared song frame (what every ohm obeys exactly)

`Song` (data, saved, deterministic):
- `id`, `seed`, `region`, `trad` (looked up from the region, never voted);
- `key`: `{ tonicC, scale: name + cents }`. One tuning per song, never mixed.
- `tempo` (bpm) and `meter` or `cycle` (beat groups, e.g. tintal 4+4+4+4, compás 12 from 12, 3-2 clave), plus `swing` as a real ratio (e.g. triplet 2:1);
- `form`: a list of sections, e.g. `[A,A,B,A]`, `12-bar ×N`, `alap, jor, jhala`, `gongan ×irama`;
- `sections[X]`:
  - `bars`;
  - `chords[]` (or `drone: [0,700]`);
  - `hook` (motif in scale degrees + rhythm);
  - `bass`, `comp` and `drum` cells (idiomatic, from the tradition);
  - `cadence`;
- `parts[ohmId]`: role, register, variant, and **edits** (DAW-painted or play-mode-recorded notes);
- `clock`: `{ t0, bar }`. One clock per song: the members' clocks are slaved to it, with no per-ohm drift.
- `name`: seeded syllables from the planet phonetics, spoken, never sung (fits the 0.8b7 names package).

**Rules:**
1. Every note an ohm plays in a song comes from `song + bar + role + variant`, computed deterministically. The DAW river shows the same function's output, so **playback exactly matches what is shown**.
2. Chords are read from the chart, not believed by ear. Followers are never wrong about the chord, which fixes cause 2.
3. Within a song, only *idiomatic* choices vary, and those are seeded:
   - which variant of the bass cell is played;
   - an end-of-phrase fill every 4 or 8 bars;
   - ornaments from the tradition;
   - the hook's variation on its N-th return, chosen from a small set: same, end changed, octave, ornamented, answer phrase.
4. Humanize ≤ 8 ms and velocity ±10 %, **never** off the grid unless the tradition says so (e.g. laid-back reggae, swing ratio).

### 5.2 How genes and traditions map onto it

| source | sets | never changes |
|---|---|---|
| region (→ tradition) | scale family, meter/cycle set, form templates, cells, ornaments, tempo range, drone or chords | — |
| members' genes (median tempo gene, bass ohm's register) | tempo within the tradition range; key tonic (region key first, see `field.js:30` regional keys) | — |
| melody ohm's motif genes | the **hook**: its motif gene is mapped into the song's scale and tradition rhythm | the motif gene itself |
| each ohm's role, register and density genes | which part it plays and how busy (variant 0–3 of the idiomatic cell) | — |
| precision gene | humanize amount within ≤ 8 ms | — |
| birth voice / instrument | the sound it plays with | **never: birth voice kept for life** |
| learned traditions / teachers / learned sounds | extra ornaments and fills; learned sound layers (rarely alone, on beat, in key, as approved) | birth voice |

### 5.3 Making successful songs by default (Stage 1, DECIDED)

1. **The song generator** is `RS.SongGen.make(region, members, seed)`. It picks a **form template** for the region's tradition and fills it from tradition data plus genes, using only real material:
   - blues: the 12-bar dom7 chart, shuffle, boogie or walking bass, call-response melody with the hook as the "call";
   - western/celtic: AABB 8-bar tune, I-IV-V-I or I-bVII; western also verse/chorus (8+8) with I-vi-IV-V or I-IV-V-I;
   - hindustani: raga + tala, with alap (no pulse, drone, vadi focus) → jor (pulse) → gat in tintal/rupak/jhaptal; pakad as the hook; a tihai to close each cycle group;
   - carnatic: raga + adi tala, with a varnam/kriti-like pallavi (the hook) → anupallavi → charanam;
   - maqam: taqsim (free, sayr climbing to the ghammaz) → metred piece (maqsum, or sama'i 10/8) → return to the tonic;
   - dastgah: avaz (free) → gusheh climb to owj → forud;
   - makam: taksim → peşrev-like sections, with usul 9/8 or 10/8;
   - gamelan: buka → gongan with balungan (a real or original 8-16-beat skeleton), colotomic gong/kenong/kempul, kotekan interlock; irama changes at section boundaries, not on a timer;
   - cuban/rumba/samba/bossa: clave-locked; son montuno = largo → montuno vamp with tumbao **anticipation**, coro hook; bossa from a real form (AABA 32);
   - flamenco: palo by compás (soleá or bulerías counted from 12); Andalusian cadence; falsetas between letra sections;
   - jazz: AABA 32 or 12-bar blues; ii-V-I; walking bass on roots with approach tones; rootless comp; head → solos → head;
   - funk/house/techno: vamp with an 8-16-bar arrangement (drop, build, breakdown) by layer;
   - wafrica: 12/8 bell + interlocking call/response cycles;
   - japan, china, andean, overtone, aksak, reggae: per `TRADITION_REFERENCE.md` recipes.
2. **Groups you meet are already mid-song.**
   - When a group exists in the world (planet seeding, an off-screen jam), it **owns a song** with `clock.t0` in the past.
   - When you arrive, the bar is computed (`bar = floor((now - t0) / barDur)`), and the form position, section and hook occurrence follow from it.
   - Notes start on the next beat, already mid-song. There is no negotiation, no 8.6 s wait and no silent locking.
3. **Off-screen cost is O(1) per group.** A song off-screen is `{songId, t0, bpm, edits-hash}`. There is no note generation and no ticking; position is computed only when needed. Optionally there is one bar-counter tick per 4 bars for world effects (growth, region key), the same cost as today's once-per-bar summaries.
4. **Save/restore.** Song state is seed + t0 + edits, so backgrounding and close/reopen restore *exactly the same song at the right bar*. This fixes the 7:27 PM bug report as a side effect.
5. **Solo ohms near a song** either listen (quiet sway, no notes) or hum in **the song's** key on its grid at low volume. A solo ohm never sounds in its own key over a song. Far from songs, solo ohms play their own key, as today.
6. **Mix.**
   - One **featured** song: the nearest, or the one you're looking at.
   - Other songs are ducked and low-passed by distance, and at most 1 other song is faintly audible.
   - This replaces `AUD=6` mixed sources (fixes cause 1, 80 % → target < 5 %).

### 5.4 How the player changes, joins and arranges a song

- **Join.**
  - An ohm you bring (tap-join, as today) gets a part for its role on the **next bar line**, already correct. There is no lock-converge silence.
  - If the roles are full, it doubles an existing part an octave away, or plays the hook in a call-response slot.
  - The tradition's caps still apply (6 tonal / 4 / 3 drums).
- **Play mode.** Notes you play are quantized to the song's grid and snapped to the scale. A strong-beat note that clashes is nudged to the nearest chord tone (a strong weight, not a ban; tradition-tagged notes keep their pitch). Mouth-control recordings (approved 5:29 PM) are added to that ohm's part in the current section.
- **DAW river** (approved items kept):
  - Shows the **song chart**: chords/drone, scale lattice, the role mark and cycle (approved 7:41 PM items 1–6), plus a ghost of the coming bars.
  - Painting stays organic-looking (approved 8:44–8:45 PM): strokes wobble and glow and keep their glides and bends. **Underneath, each stroke is stored as exact notes**: start on the song grid (with a tradition swing ratio), length, pitch as a scale degree (cents exact), velocity from stroke pressure and width.
  - What plays is exactly what is stored. See Stage 3.
- **Jam view → song view** (the 5:43 PM brainstorm item). Grab a section to repeat or reorder it, drag an ohm onto a part, slide tempo within the tradition's range, tap tempo (approved 3:29 PM). Key changes only through the tradition's own idiom (gusheh step, AABA bridge, modulation to IV in jazz).
- **Keep a song.** A finished form cycle you took part in can be **kept**: it is given its spoken name and saved with its edits, and you can replay it anywhere (see §8).

---

## 6. Jam → song: a convergence path, for player-made groups

Wilbow (8:55) wants groups in the world to be already mid-song. **Jams therefore become the player's thing.** A jam is what happens when the player makes a *new* group: recruits from different songs, newly hatched ohms, drawn instruments, or breaking a song apart. That jam converges into a song as progression:

1. **Pulse.** It agrees on tempo and meter/cycle. Visual: the beat rings align.
2. **Key.** It agrees on tonic + scale from the region's tradition. Visual: the scale lattice in the river stops shimmering and shows one set of notes.
3. **Chart.** The bass ohm picks a progression/drone from the tradition's templates, and everyone reads it.
4. **Hook.** The melody ohm's motif is mapped into the scale. When it repeats in the same place twice, it is the hook.
5. **Form.** The second section arrives and returns (A → B → A, or alap → jor, or taqsim → metred, or irama level change).
6. **The song moment.** The first time the form completes, there is a **visible and audible moment**: a full-cadence hit by the whole band on the downbeat, a bloom through the auras (fits the approved "earned visuals + bloom"), and the drum ohm's fill. From then on it is a Song (it gets a name).

**Size of each step.** Each step takes a few bars; a full song takes ~1–2 minutes of play. Each step is shown text-free in the river (rings align → lattice settles → chord ribbon becomes one colour → the hook glows when it returns → the section shape closes into a loop).

**Inside a jam, before it becomes a song**, the existing per-ohm beliefs and learning (`harmony.js` brains) are still used. That is where "listening by ear" lives. Once it is a song, the chart is the truth.

---

## 7. How the world reacts: song vs jam (text-free)

| | jam (converging) | song (complete form) |
|---|---|---|
| plants (`growth.js`) | lean toward the jam, wobbly, unfinished buds | a full form cycle **plants** a song seed; growth follows the form (A sections = trunk, B = branches, cadences = flowers) |
| region (`field.js:29-36`) | not learned | the region learns the song's key and tempo; a song played many times becomes the region's **anthem** (world voices hum its hook) |
| creatures and critters | look and drift toward it | gather, dance on the song's cycle, call its hook back at cadences |
| light and fields | flicker with the beat | fields lock to the form: colour changes per section, brighten at the hook, pulse on the sam/gong/downbeat |
| other ohms | ignore it, or join to help converge | wander in and **listen**; ohms that hear a song often can play its hook later (learning) |
| sky and weather | — | the end of a song cycle can trigger the region's signature event (e.g. aurora, rain on cymbals), seeded per world |

**Cost.** Reactions are driven by song events (section change, hook return, cadence, form complete) emitted once per bar from the bar counter, never per note. Off-screen songs emit only "form complete" (once per form) to growth and the region.

---

## 8. Remembering, naming and replaying songs

1. A completed song is **remembered** by the band (each member stores the song id) and by the player.
2. **Name:** spoken from the planet's phonetics, with the 0.8b7 names engine as the source. It is never displayed as text.
3. **Replay:** a song-stone or song-shell glyph (text-free) appears where the song was born. Touch it to hear the song from bar 1 (an exact replay from seed + edits). Carry it to put its chart into another group: they learn it (in the destination region's tradition only if it's the same tradition; see §11 for borders).
4. **Export** (dev first, player later): MIDI per part and a WAV render of N bars via an OfflineAudioContext on device. It is a file share, so it needs Wilbow's go-ahead per platform.
5. **Teachers:** an ohm that knows many songs carries them; that feeds the existing experience/aura (songs known = a new aura layer, consistent with the approved aura mappings).

---

## 9. Dev song library and dev-panel player

**Purpose.** Real, correct reference music to test the engine against, so "does it sound like the tradition" becomes a check, not a feeling.

1. **Format** (`www/data/songs/*.json`, or one `songs.js`):
   - `{ id, trad, title_dev, source: "traditional / public domain / original", key, scale_cents, tempo, meter|cycle, swing, form: [...] }`;
   - `sections`: `{ bars, chords|drone, melody: [[startStep, lenSteps, degree, vel]...], bass, comp, drums }`;
   - `hook: {section, bars}`.

   This is the same schema as the `Song` in §5.1, so a library song can be loaded into a band directly.
2. **Content: 2–3 per tradition, only traditional/public-domain or original.** Candidates (all traditional or public domain):
   - western: "Twinkle" / "Ode to Joy" melody;
   - celtic: "The Kesh" jig, AABB;
   - blues: an original 12-bar in the classic shape;
   - jazz: an original AABA over ii-V-I (standards are under copyright, so originals only);
   - bossa: an original over I-II7-ii-bII7;
   - son: an original montuno, clave 3-2;
   - flamenco: soleá compás + Andalusian falseta (original);
   - hindustani: Yaman alap/gat outline using the traditional pakad; Bhupali sargam gat;
   - carnatic: Mayamalavagowla sarali varisai (traditional exercise);
   - maqam: Rast/Bayati sayr outline + an original maqsum tune;
   - makam: a traditional Uşşak seyir outline;
   - dastgah: a Shur forud outline;
   - gamelan: a traditional-style lancaran or ladrang balungan (pathet-correct; outline only);
   - japan: "Sakura Sakura" (traditional, in-scale);
   - china: "Mo Li Hua" (Jasmine, traditional), gong mode;
   - andean: "El Cóndor Pasa" melody is **not** PD in all regions, so use an original huayno;
   - wafrica: an original bell + call/response;
   - reggae, funk, techno, house: original vamps;
   - overtone: an original harmonic tune on harmonics 6–12;
   - aksak: a traditional rachenitsa outline.

   `TRADITION_REFERENCE.md` §2 already proposes fixture details. Merge the two lists when built, and flag any title whose PD status is uncertain.
3. **Dev-panel player** (hidden dev panel, like the aura lab):
   - pick a tradition → song → section;
   - play it on chosen ohm voices in a sandbox that never touches the save;
   - an A/B toggle: library song vs generator song for the same tradition;
   - a mute/solo per part;
   - shows the river.
4. **Tests use the library as fixtures** (§10).

---

## 10. Cohesion score test (`tests/cohesion.js`, replaces "settled ≥ .7" as the bar)

These measures are computed from played notes. They are the same as §3 plus the new song checks. The test runs 24 traditions × 20 seeds × 60 s in a band scene and a crowd scene. Gate values:

| check | gate |
|---|---|
| in tuning: note within 5 c of a song-scale degree (cents exact) | ≥ 99.5 % |
| strong-beat chord/drone tone, bass | ≥ 98 % |
| strong-beat chord/drone tone, melody (tagged appoggiaturas and tradition notes exempt) | ≥ 85 % |
| all members on the chart chord | 100 % (shared chart) |
| onset error vs song grid (with swing ratio), untagged notes | median ≤ 3 ms, 99 % ≤ 10 ms |
| tempo difference between members | 0 |
| audible sources: featured song + ≤ 1 ducked | ≥ 95 % of samples |
| time from arrival to first note of a world group | ≤ 1 beat |
| hook returns per form cycle | ≥ 2 |
| melody bar repetition | 30–70 % (a song repeats, but not forever; t177 "not blurting out the same song over and over") |
| idiom checks per tradition | blues I7/IV7/V7 at bars 1/5/9; clave never crossed; tala sam on cycle start; gong at gongan end; compás accents 12 3 6 8 10; tumbao anticipates; drone traditions have no triad binding |
| determinism | same seed + edits gives the same note-list hash; a save/restore round-trip gives the same hash |
| DAW match | river note list == played note list (hash) |
| off-screen cost | 200 off-screen songs advanced 10 min < 2 ms total |
| library check | each library song played through the engine reproduces its own notes exactly |

---

## 11. Bigger planets, regions and blend zones (long-term goal, Stage 7)

1. **Region-ready now** (part of Stage 1, small):
   - `Sf.regions = [{ id, trad, key, tempoRange, bounds }]`, with `RS.Region.at(Sf, x, y)`. For now a planet = one region, whose `trad` = the planet's dominant culture from the seed.
   - Songs store `region`, and all tradition lookups go through `Region.at`, never through a vote.
   - The existing area store (`field.js:29-36` `regionKey`/`regionBpm` by area) becomes per-region data.
   - When planets grow, only the region list changes.
2. **Big planets.** Several regions, each with one tradition (seeded, with a galaxy family feel). The approved 2:58 PM "planet = seeded blend of cultures, sometimes one real culture dominant" returns **geographically**: the blend is the *map* of regions, one of them dominant by area.
3. **Blend zones** (the borders), with songs kept accurate:
   - **a. One frame owner.** Every song still has **one** key, **one** tuning, **one** meter/cycle. In a border zone the frame comes from the region with the higher weight at the song's birth point (with hysteresis, so it doesn't flip).
   - **b. Borrow by layer, safest first.** The neighbour's influence `w` rises from 0 to at most .5 toward the border, and borrows in this order:
     1. instruments and timbre (who lives there; birth voices never change);
     2. ornaments mapped into the host scale (gamaka-style slides on a western melody, flamenco melisma on a maqam phrase);
     3. rhythm cells **that fit the host cycle** (a clave over 4/4 yes; an aksak 7/8 cell only where the host meter has the same grouping);
     4. form elements (call/response, a taqsim-style free intro before a metred song);
     5. harmony style (drone under chords, or chords over a drone) at low weight.
   - **c. Never mix tunings in one song.** A borrowed motif is re-mapped to the nearest degree of the host scale. Better still, border songs prefer a **bridge scale** that both traditions share:
     - maqam Hijaz ↔ flamenco Phrygian dominant (same notes);
     - Yaman ↔ Lydian;
     - Kafi ↔ Dorian;
     - Bhupali ↔ major pentatonic ↔ Chinese gong mode;
     - Turkish Hicaz ↔ Arabic Hijaz (re-tuned to the host's commas);
     - pelog subsets ↔ Japanese in;
     - celtic Mixolydian ↔ blues Mixolydian;
     - son ↔ bossa (major, clave family).
   - **d. Parked code returns here.** `Tr.fuseTick` / `Tr.BRIDGE` (fusion bridges) and the `PATTERN_LIBRARY.md` §2 compatibility score become the border mechanism: they decide *which layers* can be borrowed between the two neighbours, and how much.
   - **e. Songs travel.** A song carried across a border keeps its frame (it is that song). Groups across the border can learn it, but they play it in their own instruments and ornaments: a cover, not a fusion.

---

## 12. Keep / rework / retire (every affected approved item)

| approved item | decision | how it is preserved |
|---|---|---|
| R3.16 / V07 G: many cultures with their own rules; 10 new traditions (4:59 PM Oct 23) | **KEEP**, corrected | data fixed per §4, plus forms and the library |
| 4:12 AM rule "cultures add variance, never limit; more prominent than random" | **KEEP** | the tradition defines the frame; variety is *within* it (other ragas, palos, tunes, variants) |
| 2:58 PM planet culture blend (`St.blend`) | **PARK** (code kept, flag off; planet uses its dominant culture) | returns as the region map in Stage 7 |
| galaxy family feel | **KEEP** | it biases which single tradition each planet/region gets |
| generated cultures (`g:`), distinct from real ones | **PARK as planet traditions** (a `g:` is itself a mix of 2 cultures, `styles.js:101`) | **decision needed:** either freeze a `g:` as its own fixed single tradition, or park it until blend zones |
| fusion bridges (`Tr.fuseTick`, `Tr.BRIDGE`) | **PARK** | revived as the border-zone mechanism (§11) |
| tradition voting per jam (`Tr.vote`) | **PARK** | replaced by the region lookup; kept for Stage 7 border songs (choosing the frame owner) |
| ohms' own scale families (birth scale, `sysOwn`) | **PARK for playing**; keep as identity | the ohm keeps its birth scale as data (aura, speech accent, solo playing far from songs); inside a song it plays the song's scale (as `Co.join` already does) |
| per-ohm clocks + `Co.lock` | **RETIRE inside songs**; keep for solo ohms and player-made jams (convergence step 1) | one clock per song |
| belief-by-ear chords, `H.bind`, learned 4-bar loops | **REWORK** | used only in player-made jams (convergence) and for learning songs; learned loops become remembered songs |
| random A/B/C sections + K modulation (`harmony.js:73-82`) | **RETIRE** | replaced by the tradition form templates; modulation only where idiomatic |
| `Mi.genBar0` phrase dice | **REWORK** | becomes the motif-variation engine: hook + seeded variation set |
| teachers, experience, auras (all approved layers) | **KEEP** | plus a "songs known" layer; teachers teach songs and ornaments |
| learned sounds (blend; alone rarely, on beat, in key), drummers growing a full kit | **KEEP** | unaffected: sound only |
| birth voice for life; instruments don't change each other; mutation off | **KEEP** | the song changes notes only, never timbre |
| no central composer / no lead cues | **KEEP, reframed. Needs Wilbow's OK.** | see §13 |
| jam seeds (24-bar settled form → plants) | **REWORK** | the song seed comes from a completed form cycle (§7) |
| regional keys and bpm (v0.6.1, v0.8a4) | **KEEP**, extended | they become region records (tradition + key + tempo range) |
| effects synced to the beat and in key (4:09–4:10 PM) | **KEEP** | locked to the song clock |
| song preservation on background and close (7:27 PM) | **SOLVED by design** | seed + t0 + edits |
| DAW river six items (7:41 PM) | **KEEP** | the river shows the chart |
| DAW painting: organic, no grid (8:44–8:45 PM); organic pattern editor | **KEEP the look**; accurate underneath | strokes stored as exact notes; the grid is never drawn |
| mouth control: recordings added to the ohm's phrase (5:29 PM) | **KEEP** | quantized into the ohm's part |
| jam view (5:43 PM brainstorm) | **REWORK** into the song view | sections, parts, tempo, tap tempo |
| tap tempo (3:29 PM) | **KEEP** | sets the song tempo |
| music-visual ideas (3:47 PM, discussion only) | unchanged (still discussion only) | the song events (§7) give them clean triggers |

---

## 13. Conflicts with Wilbow's rules (flagged, not resolved here)

1. **"No central composer / no lead cues."**
   - A shared song chart looks like a composer.
   - Proposed framing: the song is an **agreement the band made**, seeded from all members' genes and the region. Each ohm reads its own part. No ohm conducts or cues live, and nothing outside the band writes it.
   - The player can edit it, as the player already can with painting.
   - **Ask Wilbow:** is a shared written song acceptable under this rule?
2. **"Organic, no grid" painting vs "accurate music creation".** The proposal keeps both: the look stays organic and the storage and playback are exact. **Ask:** should painted strokes snap 100 % by default, with an "expressive" toggle that allows ±20 ms?
3. **Repetition vs t177 ("not blurting out the same song over and over").** Songs must repeat to be songs. The gate keeps repetition at 30–70 % and uses form plus variation, and the world gives many different songs.
4. **Generated cultures (`g:`) under one tradition per planet.** Decision needed (§12).
5. **Overtone needs voiced ohms.** Either guarantee voiced ohms on overtone planets, or let any sustaining voice play harmonic melodies.

---

## 14. Options (numbered, in player terms, with rough size) and staged plan

Sizes:
- **S** ≈ under a day of build;
- **M** ≈ 1–3 days;
- **L** ≈ a week or more.

Stages run smallest high-impact first. Stage 1 is the DECIDED one.

### Stage 1: Living songs, one tradition per region (DECIDED)
1. **One tradition per planet, region-ready** (S). Each planet is one region with one tradition, which every group looks up. Blend, fusion, voting and own scale families are parked behind flags, with the code kept.
2. **Groups are already mid-song** (M). Every group in the world owns a song with a past start time; you arrive mid-form, and notes start on the next beat. Off-screen = a bar counter only.
3. **One song clock and one chart per group** (M). Everyone plays from the same chart on one clock, so no wrong chords or drift. Retires the per-ohm clocks and the chord-by-ear inside songs.
4. **The song generator with tradition forms** (L). Real forms and idiomatic parts for all 24 traditions: blues 12-bar, AABB, alap-jor-gat, taqsim → metred, gongan + irama, clave-locked son and so on; hook from the melody ohm's genes.
5. **One featured song in the mix** (S). Hear the song you're near; others are faint, and solo ohms don't sing over it in another key.
6. **Exact restore** (S, falls out of 2–3). Background or close and come back to the same song at the right bar.
7. **Cohesion test, first version** (S). The §10 gates for in-tuning, chart agreement, onset, sources, arrival latency and determinism.

### Stage 2: Correct traditions (real notes)
8. **Fix the wrong data/engine errors E1–E11** (M): blues dom7 chart + shuffle, tanpura per raga, drone not triad, compás from 12, tumbao anticipation, pentatonic chords, comp voicings, reggae skank, overtone without voiced ohms.
9. **Fill the thin traditions** (M): rules for all 8 ragas, maqam ghammaz + sama'i, gamelan pathet + real kotekan, celtic AABB, Japanese ma, unused progressions wired in.

### Stage 3: The DAW as the main creation tool
10. **Accurate under organic painting** (M). Strokes become exact notes (grid, length, scale degree, velocity), and what you see is what plays. Coordinate with the v08-dawpaint job: it should store strokes in this note format.
11. **Edit notes** (M): move, stretch, re-pitch and change velocity by touch, text-free; snap to grid and scale.
12. **Per-ohm parts and sections** (M): a lane per ohm and section blocks you can repeat, reorder and copy.
13. **Song view** (M): the jam-view brainstorm becomes the song view: drag ohms onto parts, set tempo, change section.

### Stage 4: Dev song library
14. **Library as data** (M): 2–3 traditional, public-domain or original songs per tradition, in the song format.
15. **Dev-panel player** (S): play any library song on any ohms; A/B against the generator; mute/solo parts.
16. **Library fixtures in the cohesion test** (S).

### Stage 5: Jam → song progression (player-made groups)
17. **Convergence steps** (M): pulse → key → chart → hook → form, each shown in the river and aura.
18. **The song moment** (S): a cadence hit, a bloom and a fill when the form first completes; the song gets its name.
19. **Remember, name, replay** (M): spoken names; song-stones to replay exactly; carry a song to another band.
20. **Export** (S, dev first): MIDI/WAV render. Sharing a file needs Wilbow's go-ahead.

### Stage 6: World reacts to songs vs jams
21. **Song-driven world** (M): growth follows the form, the region learns its anthem, critters dance on the cycle, fields lock to sections, and a song-cycle sky event. Event-driven, once per bar.

### Stage 7: Big planets, regions, blend zones (long-term goal)
22. **Bigger planets with several tradition regions** (L).
23. **Border songs** (L): one frame owner, layer borrowing, bridge scales, never mixed tunings; revives fusion bridges and the culture blend geographically.
24. **Songs travel and get covered across regions** (M).

**Quick bug fixes that can ship any time** (S): `Social.gain` before `Sf.play` (`mind.js:209`); E1 `Tr.BLUES` → use `St.D.blues.harm.prog`.

---

## 15. Off-screen cost summary

| thing | off-screen cost |
|---|---|
| song state | 4 numbers per group; position computed on demand |
| world reactions | ≤ 1 event per form cycle per song (growth, region) |
| notes | none; generated only for the featured song (+1 ducked), within the 0.16 s lookahead |
| song generator | once per group at creation (or on player edit), cached |
| regions | a lookup by area index (already exists in `field.js`) |
