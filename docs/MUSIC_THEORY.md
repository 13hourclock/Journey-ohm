# Resonance — Music Theory (as built, v0.7 tree, 23 Oct 2026 ~03:50 MDT; revised 4:12–4:17 AM MDT for Wilbow's 4:12 rule)

Written by the music-theory overseer. **Docs only:** no code or tests were changed and no builds were started. The 4:12 revision touched only this file and `PATTERN_LIBRARY.md`.
Anything marked **PROPOSAL** has not been approved by Wilbow.

Source of truth: `www/js/theory.js`, `music.js`, `tonal.js`, `trad.js`, `harmony.js`, `cohere.js`, `mind.js`, `sound.js`.
The pattern library lives in `PATTERN_LIBRARY.md` (same author). This file does **not** repeat it. Its §2.0 holds the full culture-weighting design that §0a summarises here.

---

## 0. Words used here (defined once)

- **Semitone**: one piano key, 100 **cents**. An octave is 1200 cents, which is a frequency ratio of 2:1.
- **12-TET**: the piano's tuning, with 12 equal semitones per octave.
- **Microtone**: any step that isn't a multiple of 100 cents.
- **Quarter tone**: 50 cents. **24-TET** divides the octave into 24 equal steps of 50 cents.
- **Koron** (Persian) / **half-flat** (Arabic): a note lowered by about a quarter tone. In real music it's often 30–60 cents, and 50 is the usual approximation.
- **Scale degree**: the position of a note in a scale (1st, 2nd, …). **Tonic**: the home note.
- **Period**: the interval at which the scale repeats. It's usually an octave of 1200 cents. Bohlen-Pierce uses the **tritave**, a 3:1 ratio of 1902 cents.
- **Chord**: notes sounding together. **Triad**: the scale degrees 1-3-5 of a chord's root. A **7th chord** adds the 7th.
- **Progression**: a sequence of chords. **Cadence**: the ending gesture of a progression.
- **Step / 16th**: the rhythm grid. A 4/4 bar has 16 steps. In the grids below, `x` is a hit and `.` is a rest.
- **Meter**: how a bar's steps are grouped into beats, e.g. 7/8 = 4+4+6 sixteenths.
- **Timeline**: a fixed repeating rhythm that everyone hears as the reference (a bell or clave pattern).
- **Drone**: a sustained tonic (and often the fifth).
- **Jam**: a group of ohms playing together. Its shared settings live in the object `E`.
- **Off-screen cost rule (rule J)**: a rule may run at most once per bar per ohm, read only cached summaries, and do no work per frame or per sample. Every rule below lists its cost.
- **Instrument principle** (Wilbow, Oct 23, 3:38/3:41 AM MDT):
  - An ohm keeps its own instrument and voice, which come from its body.
  - Contact with others changes only **notes and playing style**.
  - Carried items change the voice only in noticeable, predictable ways.
  - Every rule below obeys this: a tradition changes notes, rhythm, roles and ornaments, never the timbre.
- **Weight**: how likely something is to be picked, from 0 to 1. A low weight means "rarely", not "never".
- **Wilbow's 4:12 rule** (Oct 23, 4:12 AM MDT): *"The cultures should not be a limit to the possibilities, only add variance. They should still be more prominent than any random stuff."* Every culture rule below is a **weight**, never a ban. See §0a.

## 0a. Cultures add, never limit (PROPOSAL; implements the 4:12 rule)

1. **Additive.** A tradition raises the odds and the loudness of its own scales, rhythms, ornaments, chords and forms. It sits on top of the full musical range and never removes, forbids or caps a scale, note, meter, rhythm, ornament, chord or key change.
2. **Accuracy uses strong weights, not bans.** To keep a raga recognisable, its own notes, its drone pair and its tagged phrases get weight ~.9. Anything else stays possible at low weight.
3. **Prominence.** Each choice (pitch, onset, ornament, chord/drone, key change) in a jam comes from three pools:
   - **culture** (the jam's traditions): **C = 0.60 + 0.15 × strength**, i.e. 60–75%, default ≈ 68%. This applies when the culture strength is ≥ .25; below that, C = 2 × strength.
   - **wild** (anything in the full range): a guaranteed **15%**, never below 10%.
   - **own** (the ohm's normal, culture-free engine): the rest, 10–25%.
4. **Loudness tilt:** culture notes ×1.15 velocity; wild notes ×0.85 and preferably on weak steps (a preference, not a rule).
5. **Signature every 2 bars:** a full signature pattern sounds in every 2-bar window, played by any member, at velocity ≥ .6 (×1.3 the first time).
6. **No western-only fallback.** A jam with no culture lean plays the full-range engine. Western traditions are ordinary cultures.
7. **Cost (rule J):** once per bar per audible jam, three small cumulative-weight tables are built from cached summaries (about 100 multiply-adds). Each note then costs one random number plus one lookup. Nothing runs off-screen.

---

## 1. What is implemented now (v0.7 tree; NOT on the phone, see §3)

### 1.1 Scales and tunings (`tonal.js` CAT, `music.js` RS.SCALES)

Scales are lists of cents, chosen per ohm from its gene `g[96]`. The pick is weighted (`tonal.js:29` fromGene). Weight shares are below; the total weight is 118.75.

| family | weight share | examples (cents) | tuning |
|---|---|---|---|
| diatonic | 27% | Ionian 0 200 400 500 700 900 1100; Dorian 0 200 300 500 700 900 1000 | 12-TET |
| harmonic / melodic minor | 19% | harmonic minor 0 200 300 500 700 800 1100 | 12-TET |
| pentatonic | 13% | major pentatonic 0 200 400 700 900 | 12-TET |
| japanese | 7.6% | In 0 100 500 700 800; Hirajoshi 0 200 300 700 800 | 12-TET is fine |
| blues + bebop | 8.4% | blues 0 300 500 600 700 1000 | 12-TET; blue notes are bent ornaments |
| raga | 4.8% | Yaman 0 200 400 600 700 900 1100; Bhairav 0 100 400 500 700 800 1100; Todi 0 100 300 600 700 800 1100; Kafi 0 200 300 500 700 900 1000 | 12-TET is acceptable; real shruti differ by ±5–20 cents |
| maqam + 24-TET | 5.1% | Rast 0 200 350 500 700 900 1050; Bayati 0 150 300 500 700 800 1000; Saba 0 150 300 400 700 800 1000 | **microtonal, required** |
| just | 3.4% | 5-limit: 0 204 386 498 702 884 1088 | ratios |
| 19-TET | 1.7% | steps of 63.2 cents | |
| Bohlen-Pierce | 0.3% | λ mode in a 1902-cent period | |
| Slendro / Pelog | **0%** (`trad.js` adds them with weight 0) | slendro: 5 steps of ~240 cents; pelog: an unequal 7-note set | microtonal, required |

All the cents values were checked and are correct.
**Cost:** chosen once at birth. Pitch is computed once per note, from cents.

### 1.2 Key, tonic, regional key

- A note is `tonicHz · 2^(cents/1200)`.
- When a jam forms, every member takes the leader's scale `E.sys` (`cohere.js:16,20`). It returns to its own scale when it leaves (`cohere.js:21`).
- `music.js` M.snap and `sound.js` S.tune snap player and world sounds to the **session** key, not the jam key. V08 C/D fixes this.
- **Cost:** once per jam formation, plus once per sounded note.

### 1.3 Harmony (`theory.js`, `harmony.js`)

- **Chords** are stacked thirds on the scale. Each ohm has its own vocabulary of chords.
- **Song plan:** AABA sections. Harmony uses cadences (V–I, IV–I, deceptive V–vi), secondary dominants (V/x) and pivot-chord modulation (section 'K').
- **Voice leading:** move each voice to the nearest chord tone.
- **Binding at play time** (`H.bind`, `harmony.js:102`; called from `mind.js:176`):
  - on strong beats, a non-chord tone is moved to the nearest chord tone;
  - when an ohm is unsure (`conf < .45`), strong and long notes go to the root or fifth;
  - the lead's last note in a bar steps into the next chord.
- **Cost:** chord choice once per bar. Binding is O(chord size) per note, which is not per frame.

### 1.4 Rhythm and meter (`theory.js` METERS, `trad.js:13` extras)

Meters as groups of 16ths:
- 4/4 = 4+4+4+4
- 3/4 = 4+4+4
- 2/4 = 4+4
- 6/8 = 6+6
- 5/8 = 6+4
- 7/8 = 4+4+6
- 12/8 = 6+6+6+6 (24 steps)
- 9/8 = 4+4+4+6
- 11/8 = 4+4+4+4+6
- rupak = 12+8+8 (28 steps; the 7 beats are 3+2+2)
- jhaptal = 8+12+8+12 (40 steps; the 10 beats are 2+3+2+3)
- adi = 16+8+8 (32 steps; the 8 beats are 4+2+2)
- compás = 12 beats, accents on 3 6 8 10 12

Also implemented: Euclidean rhythms (k hits spread as evenly as possible over n steps), polyrhythm, hemiola, syncopation, motif development.
`music.js` barDur is always 4 beats (error E7).
**Cost:** once per bar.

### 1.5 Traditions (`trad.js`, v0.7 G)

At formation a jam votes for **one tradition** (`trad.js:41–42`). The tradition then rewrites each member's bar once per bar (`trad.js:64`, hooked at `mind.js:118`). The rules:

| tradition | scale | meter / cycle | harmony | rhythm rule | melody rule |
|---|---|---|---|---|---|
| hindustani | raga | 4/4 ×4 (teental), rupak, jhaptal | drone | landing on *sam* (beat 1 of the cycle) | aroha/avaroha skips, longest note → vadi/samvadi, pakad every 8 bars, gamaka slides 45% |
| carnatic | raga | adi | drone | sam | gamaka 80% |
| maqam | maqam / 24-TET | 4/4 | drone | iqa' low/back | sayr (a 4-bar climb through registers), heterophony |
| gamelan | slendro/pelog (unreachable, weight 0) | 4/4 ×4 | drone | colotomy (gong/kenong), drums on the frame | kotekan between 2 comps |
| wafrica | pentatonic | 12/8 | – | bell `x.x.xx.x.x.x` (on 24 steps: 0 4 8 10 14 18 22), 3:2 cross-rhythm | call and response |
| cuban | diatonic | 4/4 ×2 | – | son clave 3-2 | tumbao bass, montuno |
| bossa | Ionian/Lydian/Dorian | 4/4 ×2 | – | bossa bass/comp | – |
| aksak | minor family | 7/8, 9/8, 11/8 | – | meter only | – |
| flamenco | Phrygian | compás | Andalusian iv–III–II–I | accents 3 6 8 10 12 | – |
| japan | japanese | 4/4, 3/4 | – | – | *ma* (a silent bar every 4), heterophony |
| blues | blues/bebop/Mixolydian | 12-bar | I I I I IV IV I I V IV I V | swing .12 | blue-note bends |
| celtic | Dorian/Mixolydian | 6/8, 4/4 | drone | – | – |
| andean | minor pentatonic/Aeolian | 4/4 | drone | – | – |

**Cost:** vote once per jam; `Tr.bar` once per member per bar on cached `E` data. This complies with rule J.

### 1.6 Physical pitch (`sound.js` S.physics)

| object | law | effect | status |
|---|---|---|---|
| string | f₀ ∝ (1/L)·√T (Mersenne) | half the length = up an octave | ✔ |
| bar | f₀ ∝ h/L² (Euler-Bernoulli) | half the length = up two octaves | ✔ |
| tine | coefficient .16 = (1.875/4.730)² | | ✔ |
| membrane | f₀ ∝ (1/R)·√T | | ✔ |

Overtone ratios:
- Bar, free-free: 1, 2.756, 5.404, 8.933, 13.34 ✔
- Cantilever: 1, 6.267, 17.55, 34.39 ✔
- Membrane (Bessel): 1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501 ✔

Pitch is clamped to 28–4200 Hz. **Cost:** once per shape edit.

---

## 2. Errors in the current implementation (numbered)

1. **Blues uses triads.** `Tr.BLUES` plus `byRoot` (`trad.js:57–59`) builds I/IV/V triads. Blues needs dominant 7ths, I7 IV7 V7: semitones 0 4 7 10 on 1, 4 and 5 (C7 = C E G B♭). As built it sounds like a plain major song.
2. **Maqam and raga "drone" is a full triad.**
   - `Tr.chord`'s drone (`trad.js:59`) returns the root chord, so `H.bind` forces strong beats onto 1-3-5.
   - In Rast, that triad is 0/350/700, a neutral third, which makes it a harmonised chord.
   - Both traditions are mostly drone-based. **Fix (4:12 rule):** the drone defaults to Sa+Pa / tonic+fifth (0 and 700 cents) with strong weight .9. For ragas that avoid Pa, use Sa+Ma (500) when the raga has plain Ma (Malkauns), else Sa + low Ni (−100) (Marwa). Western chords stay possible at low weight (.1 of the culture share), and more often when blended with a chordal tradition.
3. **`H.bind` erases tradition melodies** (`harmony.js:106–109`, run on every note at `mind.js:176`).
   - Pakad (a raga's signature phrase), sayr and kotekan notes that land on strong beats get pulled onto chord tones.
   - When the jam is unsure, they collapse to root/fifth.
   - Fix (4:12 rule): notes tagged `vadi/sam/pakad/kotekan/het/resp` keep their pitch through bind with probability .9 (a strong weight, not an exemption). In drone traditions, untagged notes bind to {tonic, fifth} with weight .8 and to the full chord with weight .2.
4. **The tanpura always plays Pa** (`trad.js:74–75`). That's wrong for Pa-less ragas. It's minor because the CAT has none today.
5. **The tumbao plays the current root on beat 4** (`trad.js:77`). A real tumbao *anticipates* the next chord's root on beat 4 (step 12), tied over the bar line. A montuno also anticipates.
6. **Pentatonic chord stacking** (`tonal.js` To.chord [0,2,3] for ≤5-note scales). On minor pentatonic (0 300 500 700 1000), degrees 0-2-3 give 0-500-700, which is a sus4, not a minor chord. Use 0-1-3 (0 300 700) for minor pentatonic and 0-2-3 (0 400 700) for major pentatonic.
7. **barDur is always 4 beats** (`music.js`). Anything timed by barDur drifts in 3/4, 7/8, 12/8 and so on. Use the meter's steps/4.
8. **Wrong cross-rhythm comment** (`trad.js:102–103`). The code puts slaps every 4 steps and bass every 6 steps over 24, which is 6 against 4 = **3:2**. The comment's ratio is off.
9. **Kotekan only works with exactly 2 eligible members** (`trad.js:81`), and gamelan can never be chosen by scale (Slendro/Pelog have weight 0, `trad.js` CAT add). The gamelan world tradition then forces a *diatonic* scale on gamelan, because `sysFor` keeps `own`: `names` filtering only applies if a candidate exists. **Gamelan sounds western.** Fix (4:12 rule): Slendro/Pelog birth weight 1.5; inside a gamelan jam's culture share they get weight .9 (other scales are still reachable through the own and wild pools); kotekan for any 2+ members.
10. **Missing traditions that V07 G names:** rumba clave, samba partido-alto, overtone/throat singing, jazz ii-V-I, and Persian dastgah. These are chunk 4.
11. **The bossa bass** plays root–fifth on steps 0/6/8/14. That's correct (dotted-quarter feel). Not an error, but bossa comp needs 7th/9th chords, not triads (see §5.4).
12. **Clamped-bar factor 1.2** (`sound.js`) has no physical basis. A clamped-clamped bar has the same fundamental as a free-free one, and a pinned-pinned bar is ×0.44. Harmless.
13. **Egg tempo ratios** (`egg.js:16`) are .5 .75 1 1.5 2. V07 F.4 also lists 2/3 and 4/3. The code's set is musically safer, because 4/3 only lines up every 3 beats. Update the spec, not the code.

---

## 3. AUDIBILITY AUDIT — why Wilbow hears no cultures

> Wilbow: "The notes patterns of many types of music should be available to use and mix and match i havent seen or heard any of that applied."

### 3.1 Cause 1 (decisive): it isn't on his phone

- He has **v0.6.2**. `dist/` holds only `Resonance-v0.6.2.apk` (00:09).
- The v0.6.2 source snapshot `/workspace/softsound_v062_src/www/js` has **no `trad.js`, `exp.js`, `egg.js` or `conduct.js`**.
- v0.7 (`android/app/build.gradle:10–11`, versionCode 15, "0.7") loads `trad.js` (`www/index.html:10`), but it has not been built for upload. NOTES.md has no v0.7 upload line; the latest entry is the suite fixes at 03:23.
- **Player terms:** every culture feature he asked for so far is unreleased. Nothing he did could have produced it.
- **Makes it audible:** ship v0.7.

### 3.2 Cause 2: most jams pick "western", and each world has only one exotic option

- `Tr.lean` (`trad.js:38–39`):
  - an ohm leans toward a tradition only if its birth scale is in a special family: about 28% of ohms (raga, maqam, japanese, blues/bebop, Phrygian dominant);
  - otherwise there's a 20% chance of the world's **single** tradition (`Tr.world`, `trad.js:37`);
  - that makes about 43% non-western, split across up to 6 traditions.
- `Tr.vote` (`trad.js:41`): the leader's vote counts double, and ties go to the first key inserted.
- In a typical world, a jam lands on a given culture only about 5–14% of the time. Most jams are western.
- **Player terms:** you'd have to watch many jams to meet one culture, and you can't ask for one.
- **Makes it audible (PROPOSAL):**
  - (a) give each world 2–3 home traditions and a 50% chance of using them;
  - (b) let the player *choose or carry* a culture: an item or egg stroke that plants a tradition, so mixing becomes a player action;
  - (c) give Slendro/Pelog a real weight (e.g. 1.5 each), and give every newly added scale a small birth weight (~0.3) rather than 0, so nothing is reachable *only* through culture;
  - (d) no western-only default: western traditions are ordinary cultures, and a lean-free jam plays the full-range engine (4:12 rule).

### 3.3 Cause 3: when a culture is chosen, it is mostly ornament and role-gated

What the code actually does once a tradition wins:

- **Landing accent:** ×1.25 velocity on the first note of a cycle (`trad.js:70`). Barely audible.
- **Gamaka / blue notes:** a slide of at least 70 ms from a neighbour, on 30–80% of long notes (`trad.js:96–98`). Subtle on plucked voices.
- **Pakad:** once every 8 bars (`trad.js:91`).
- **Timelines** (bell, clave): only for drummers in `pulse:time / pulse:colour / pulse:all` (`trad.js:101,104`), at 50–70% of the drummer's level. **A jam with no drummer has no clave and no bell.**
- **Drone:** only for `comp / texture / harmony` roles (`trad.js:74`), at velocity .2.
- **Kotekan:** only if exactly 2 eligible members (`trad.js:81`).
- **Celtic and andean:** only a drone plus landing. Nearly indistinguishable from western.
- **Aksak:** only a meter change.
- **Swing:** forced to ≤ .04 for everything except blues (`trad.js:47`). That flattens bossa and celtic lilt.
- **Player terms:** the "culture" is a faint seasoning on top of the same western song engine. The notes, chords and drum kit still sound like the default jam.
- **Makes it audible (PROPOSAL):**
  - (a) a tradition **weights at least three things toward itself at once** (culture share 60–75%, §0a): scale, meter/timeline, and a signature pattern that **any** member plays when no drummer is present. For example, the lowest tonal ohm plays the clave or bell on its own instrument as short notes (notes and style only, which respects the instrument principle);
  - (b) raise the drone to velocity ~.35 and keep it constant;
  - (c) gamaka glide of at least 120 ms on 60% of long notes;
  - (d) pakad every 4 bars, and always in the first bar of a cycle.

### 3.4 Cause 4: things that override or erase it

1. `H.bind` re-snaps tradition notes onto chord tones at play time (§2.3, `harmony.js:106–109`).
2. The drone chord is a triad (§2.2).
3. Harmony section 'K' (pivot modulation) skips `Tr.chord` (`harmony.js:94`), so traditions get western modulations.
4. Breakdown bars skip the whole tradition (`mind.js:118`). That's intended.
5. Scale override: the jam scale *is* changed to the tradition's (`trad.js:47`, before join, `cohere.js:16`). But for `cuban` and `gamelan` the leader's own diatonic scale is kept (§2.9).
6. Session-key snap: player strokes and world sounds still snap to the session key (`music.js` M.snap, `sound.js` S.tune). So the player's notes clash with a maqam jam. V08 D fixes this.
7. The visual cue is a faint ripple, only when the leader is in view (`trad.js:111`). Nothing says "this is a raga".

- **Player terms:** even a chosen raga is pushed back toward a western chord, and the screen never says what's happening.
- **Makes it audible:**
  - tagged tradition notes keep their pitch through `H.bind` with probability .9 (strong weight, not an exemption);
  - the drone is tonic+fifth with weight .9 (chords .1);
  - 'K' modulation weight ×0.15 in drone traditions: rare, never impossible;
  - the tradition's scale gets ~.9 of the culture share, instead of replacing the jam scale wholesale (item 5);
  - a glyph + colour per culture on the jam ring and its signature motif made louder the first time it plays (PROPOSAL; the game is text-free, so no names on screen; the existing `tradN` hint counter can gate the first-time emphasis).

### 3.5 Cause 5: one tradition per jam, no mixing

- Fusion needs every member to have experience ≥ .6 of the other tradition, plus 4 matched settled bars (`trad.js:118–120`). That almost never happens in a session.
- **Player terms:** "mix and match" never happens.
- **Makes it audible (PROPOSAL):** a two-ohm jam whose members lean different ways fuses *immediately*: one supplies the rhythm and the other the scale/melody, e.g. a maqam scale over a son clave. Rule J cost: one vote at formation.

### 3.6 Cause 6: solo ohms never show a culture

- `Tr.bar` only runs inside a jam (`mind.js:118`, `m.E && m.E.trad`).
- **Makes it audible (PROPOSAL):** a solo ohm with any culture lean (western traditions included) plays its tradition's melody rules (gamaka, pakad, ma) alone. Cost: once per bar, cached lean.

---

## 4. Short checks on chunk 3 (V08 D, P, Q). Fix these before building.

1. **P2 octave folding breaks "longer = lower, always"** (`V08_SPEC.md` P2, ~l.1200–1240).
   - Folding into E1–C7 (41.2–2093 Hz) makes a very long rod jump *up* an octave.
   - Fix: a monotonic soft limit instead of folding. Below 41.2 Hz use `f' = 41.2·(f/41.2)^0.3`; above 2093 Hz use `f' = 2093·(f/2093)^0.3`. Then snap to the key. Order is always preserved.
   - Cost: once per edit.
2. **Q's "at most 16 slots" breaks tradition meters** (`V08_SPEC.md` Q, ~l.1390).
   - Bars are 18, 22, 24, 28, 32 and 40 steps long.
   - Use the bar's own step count, up to 48; for 12/8, use 24 slots so triplets exist.
   - Cost: still one 7×N table per bar.
3. **D snapping can put two strings on the same note** (`V08_SPEC.md` D, ~l.120–140).
   - Nearest-degree snapping is monotonic but can merge neighbours.
   - Rule: sort the strings by raw pitch, then give each the nearest degree that is **strictly above** the previous string's degree.
   - Cost: once per chord change.
4. **Q's octave move in non-octave scales** must move by `sys.period`: 1902 cents in Bohlen-Pierce, not 1200. Otherwise the note leaves the scale.
5. **Q's octave move vs the instrument principle:** keep the move within the ohm's body range (the size-derived f₀ ± its gene range). Register comes from the body.
6. **Q's wording:** "drummers interlock like hocket or kotekan". Kotekan and hocket are *melodic* interlocks. For drums say "West African interlocking parts". The code's kotekan is melodic, which is correct.
7. **P's marimba row (PROPOSAL):**
   - Free-free bar overtones (2.756, 5.404) clash in chords.
   - Real marimbas undercut the bar so that partial 2 = 4.0× (two octaves); xylophones use 3.0×.
   - Use ratios [1, 4.0, 9.9] for a "tuned bar" ensemble.
   - Cost: a constant table.
8. **D/C regional key and P5/P7 borrowing** change notes only. They are consistent with the instrument principle. `C.adopt` must not copy instrument genes; spec C copies only key, tempo and motif, which is OK.

---

## 5. Chunk 4 rules (approved at 3:12 AM as traditions; the details are PROPOSALS)

### 5.1 Persian dastgah (24-TET required; koron = −50 cents ≈ a quarter-tone flat)

| dastgah | cents | notes |
|---|---|---|
| Shur | 0 150 300 500 700 800 1000 | 2nd koron. The *shahed* (focal note) is the 4th or 2nd. Ends on the tonic, often approached from below via the 7th (1000 → 1200). |
| Segah | 0 150 350 500 650 850 1000 | Several korons. Its centre is the 3rd degree. |
| Chahargah | 0 150 400 500 700 850 1100 | Two "augmented 2nd" gaps of ~250 cents. |
| Mahur | 0 200 400 500 700 900 1100 | Like major, so 12-TET is fine. |
| Homayun | 0 150 400 500 700 800 1000 | |

Rules:
- **Harmony:** a drone on the tonic+fifth or tonic+4th, with strong weight .9. Chords stay possible at low weight (.1), more often when blended with a chordal tradition. Tagged notes keep their pitch through `H.bind` with probability .9.
- **Melody:** a *gusheh* order (a short sequence of modal sections), climbing to a high point (*owj*), then a *forud*: a descent back to the tonic of Shur.
- **Rhythm:** mostly free (*avaz*). For a metred tune use 6/8 or 4/4 *zarb* patterns:
  `x..x.x..x.x.....` (16)
- **Cost:** once per bar.

### 5.2 Rumba clave and samba partido-alto (12-TET; rhythm only)

Son clave 3-2 (existing, correct):
```
x.....x.....x...|....x...x.......
```
Rumba clave 3-2. The 3rd stroke of the 3-side is one 8th later.

Counted in 8th notes over a two-bar cycle (16 eighths):
- son 0 3 6 | 10 12
- rumba 0 3 7 | 10 12

On a 32-sixteenth two-bar grid:
```
son   3-2:  x.....x.....x...|....x...x.......   (0 6 12 | 20 24)
rumba 3-2:  x.....x.......x.|....x...x.......   (0 6 14 | 20 24)
```
The code's son clave is correct (`trad.js:25`: [[0,6,12],[4,8]]). Rumba is usually slower, with a 6/8 feel.

Samba partido-alto (one bar, 16ths; the common guitar/agogô shape):
```
partido-alto:  .x..x.x.x.x..x.x   (steps 1 4 6 8 10 13 15, 7 hits; matches PATTERN_LIBRARY.md, sourced; reversed form x.x..x.x.x..x.x.)
surdo:         ....x.......x...   (2 and 4; beat 2 is the strong low "marcação")
tamborim:      x.xx.x.xx.x.x.xx   (teleco-teco variant)
```
The surdo's accent goes on **beat 2** (step 4), not beat 1. Samba swing places the 16ths unevenly, at about 0, 0.27, 0.52, 0.78 of a beat; a swing of ~.06 is close.

### 5.3 Overtone / throat singing (Tuvan khöömei style; harmonics, not 12-TET)

- A drone fundamental f₀ at 100–160 Hz, plus a whistle tone selected from **harmonics 6–12** (f₀×6 … f₀×12).
- Melodies move between harmonics 8, 9, 10 and 12. In cents above 3 octaves they sit at 0, 204, 386 and 702: pure just intervals. Keep them pure (not snapped to 12-TET) with strong weight .95; snap the drone instead.
- Pentatonic melodies are natural here (H6 8 9 10 12 = sol do re mi sol).
- **Instrument principle:** this is a *note pattern and playing style* that any ohm may play on its own voice (a harmonic-series melody over a drone). Nothing here changes timbre. Whether any ohm can actually *sound* like throat singing is a voice question, left open (PATTERN_LIBRARY Q1).
- **Cost:** pick a harmonic once per note.

### 5.4 Jazz ii–V–I with extensions (12-TET is fine)

Chord tones in semitones above each root:

| chord | semitones | C major |
|---|---|---|
| m9 | 0 3 7 10 14 | Dm9 = D F A C E |
| 13 | 0 4 10 14 21 (5th omitted) | G13 = G B F A E |
| maj9 | 0 4 7 11 14 | Cmaj9 = C E G B D |

- **Rootless voicings** (piano/pad, root left to the bass), in semitones above middle C. Common tones are held and each voice moves by 1–2 semitones:
  - Dm9 = F A C E (5 9 12 16)
  - G13 = F A B E (5 9 11 16)
  - Cmaj9 = E G B D (4 7 11 14)
- **Minor ii–V–i:** Dm7♭5 (0 3 6 10) – G7♭9 (0 4 10 13) – Cm(maj7)/Cm6.
- **Tritone substitution:** D♭7 for G7.
- **Bass:** a walking line on quarter notes, using chord tones on beats 1 and 3 and approach notes a semitone below on beat 4.
- **Rhythm:** swing about .12–.18. Comp on the "and" of 2 and on 4: `....x.x.....x...` (Charleston: `x.....x.........`).
- **Cost:** chords once per bar, voicing once per change.

---

## 6. Where 12-TET is fine vs where microtones are required

- **Fine:** western, blues (bends are ornaments: ~30–50 cents up from ♭3 toward 3), cuban, bossa, samba, jazz, celtic, andean, japanese, flamenco, aksak.
- **Approximation OK:** Hindustani/Carnatic ragas (real shruti ±10–20 cents, e.g. Darbari's slow ♭3 oscillation).
- **Required:**
  - maqam (half-flats ≈ −50, e.g. Rast's 3rd at 350, Bayati's 2nd at 150);
  - dastgah (koron ≈ −50);
  - gamelan (slendro ~240-cent steps; pelog unequal: ≈ 0 120 270 540 670 785 950, which varies by set);
  - overtone singing (pure harmonics);
  - Bohlen-Pierce;
  - 19-TET.
- **Cost:** all of these are cents tables, so there's no extra runtime cost.
