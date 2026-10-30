# Resonance: Pattern Library (PROPOSAL, pending Wilbow's approval)

Written Fri 23 Oct 2026, about 04:05 AM MDT, by the music-theory overseer bot.

> **Status: proposal only.** Nothing in this file is built or approved. Every table, number, colour, glyph and chunk below is waiting on Wilbow's approval. I edited no code or tests and started no builds. MUSIC_THEORY.md covers the audibility audit and the chunk-3 checks. This file builds on its §2, §3 and §5 and does not repeat them.
>
> **Revised 4:12–4:17 AM MDT for Wilbow's 4:12 rule** ("cultures should not be a limit to the possibilities, only add variance … still more prominent than any random stuff"). Every ban or forced choice is now a weight with a default number (§2.0). MUSIC_THEORY.md was revised to match.

**Answer to Wilbow's 3:45 AM ask:** "The notes patterns of many types of music should be available to use and mix and match i havent seen or heard any of that applied."

1. 30 musical traditions become data. Each one is cut into 5 swappable layers: scale, rhythm, ornament, harmony and form.
2. Ohms learn these layers and mix them inside a jam.
3. A jam shows what it is playing through **glyph, colour and sound only**. No names or labels ever appear on screen.
4. The early build chunks (§5) first make the cultures that already exist actually audible, and only then add new ones.

**Hard boundaries of this proposal:**

- **Notes and playing style only.** The library outputs *which notes, when, how loud, how long, and how they slide or decorate*. It never chooses, changes or locks an ohm's instrument or voice. Wilbow rejected the "voice-lock" reading of his instrument principle ("No, that's not quite it") and his details are still pending, so nothing here depends on how voices are locked or derived. See open question Q1.
- **Text-free.** Tradition ids such as `son` or `hindustani` are internal code keys. Players never see them.
- **No themes or presets** (HANDOFF rule 15, DECISIONS A10). A tradition is *knowledge an ohm can carry* and blend with others in continuous amounts. It is never a world theme, an ohm class or a player-picked genre. Q2 is answered by Wilbow's 4:12 rule.
- **Cultures add, never limit** (Wilbow 4:12). A tradition only *raises the weight* of its material on top of the full musical range. Culture material takes a guaranteed majority (60–75%) of choices in a cultured jam. Wild, full-range picks keep a guaranteed 10–15% minority. See §2.0.

---

## 0. Words used here (each explained once, in plain words)

- **Note / pitch:** how high or low a sound is. **Tonic:** the "home" note a tune settles on.
- **Semitone:** the smallest step on a piano (one key to the next). **12-TET** ("12-tone equal temperament"): the piano system of 12 equal semitones per octave.
- **Cents:** a finer ruler for pitch. 100 cents = 1 semitone, 1200 cents = 1 octave.
- **Microtone / quarter-tone:** a pitch *between* piano keys. A quarter-tone is 50 cents, half a semitone. Some traditions need these, so piano notes would sound wrong.
- **Scale:** the set of notes a tune is allowed to use, written here as semitones (or cents) above the tonic.
  - **Mode:** the same notes as a scale but starting from a different home note, which changes the mood.
  - **Pentatonic:** a 5-note scale.
- **Interval:** the distance between two notes. Examples: 3 semitones = minor third (sad-ish), 4 = major third (bright), 7 = perfect fifth (very stable), 6 = tritone (tense).
- **Chord:** several notes at once.
  - **Triad:** a 3-note chord (root, third, fifth).
  - **Seventh chord:** a triad plus one more note 10 or 11 semitones above the root.
  - **Dominant 7 ("dom7"):** semitones 0 4 7 10. The bluesy, wants-to-move chord.
  - **Voicing:** how the chord's notes are spread out and stacked.
- **Progression:** an order of chords. **Cadence:** a progression that ends a phrase, like a musical full stop.
- **Drone:** one or two notes held underneath everything, usually the tonic plus the fifth.
- **Bar:** one repeating unit of time. **Beat:** the pulse you tap your foot to.
- **Step / grid:** a bar cut into equal slots. Rhythms are written as strings, `x` = hit and `.` = silent. A 16-step grid is four beats of four slots.
- **Meter:** how beats are grouped. 4/4 = four even beats. 7/8 = seven fast pulses grouped long-short-short or similar.
- **Syncopation:** hits placed *between* the strong beats. **Swing:** playing pairs of short notes long-short instead of even.
- **Polyrhythm / cross-rhythm:** two different pulses at once, for example 3 against 2.
- **Timeline / bell pattern:** a short, fixed, lopsided rhythm that everyone in a band times themselves against. **Clave** is the Cuban one.
- **Ostinato / riff:** a short pattern repeated over and over.
- **Ornament:** a quick decoration on a note: a slide, a wobble, a tiny extra note before it, and so on.
- **Call and response:** one player plays a phrase and others answer it.
- **Heterophony:** everyone plays the same tune at once, each with their own decorations.
- **Interlocking:** two parts that each leave gaps the other one fills. Together they sound like one fast line.
- **Overtones / harmonics:** the quieter higher pitches inside every sound, at 2×, 3×, 4×… the base frequency.

Words that belong to one tradition (raga, tala, maqam, kotekan, clave and so on) are explained in that tradition's notes in §1.4.

---

## 1. The library (data)

### 1.1 How it plugs into the code we have (read-only survey)

- `trad.js` already has a tradition table `Tr.T` with 14 traditions. It also has these hooks:
  - `Tr.bar` (melody rules);
  - `Tr.drums` (timelines);
  - `Tr.chord` (harmony);
  - `Tr.lean` / `Tr.vote` (who leans where, and how a jam picks);
  - `Tr.HUE` (colours);
  - `Tr.fuseTick` (fusion).
- `tonal.js` `To.CAT` holds the scales. Each one has cents, a family and a weight; `To.pcs24` and `To.agree` measure how much two scales overlap.
- `mind.js` `Mi.METERS` holds the meters as groups of 16th-note steps.
- **Proposal:** the library below becomes one new data file, `www/js/patterns.js` (a constant table). It is loaded once and read by the existing hooks.
  - `Tr.T` turns into a thin view over it, so nothing that works today breaks.
  - New scales are added to `To.CAT` with a **small birth weight (0.3 each; Slendro/Pelog 1.5, per MUSIC_THEORY §3.2c)**. That way every scale is reachable at birth without crowding out the existing mix. Learning adds more on top. (Weight 0 would have made them unreachable except through culture, which contradicts the 4:12 rule.)

### 1.2 The entry format (fixed schema)

Each tradition is one object:

```text
{
  id:      internal key, never shown to players
  grp:     wider family (used for spread and "nearby" mixing)
  scales:  [ { k: key, st: [semitones above tonic], c: [cents] (only if not 12-TET),
               tet: "ok" | "approx" | "micro", per: octave size in cents (1200 unless stated),
               focus: { notes that act as anchors: vadi, ghammaz, shahed, ... } } ]
  meters:  meter keys (existing Mi.METERS keys, or new ones listed in 1.3.3)
  grid:    steps per bar for the cells below (16, 24, 12, 14, 18, 22, 32...)
  cells:   { name: "x..x" rhythm strings on that grid; '|' separates bars of a 2-bar cell }
  motifs:  [ { k, st: [semitones] or c: [cents], note } ]  (negative = below the tonic, 12+ = above)
  iv:      characteristic intervals in semitones (what makes it sound like itself)
  orn:     ornament keys from 1.3.2, strongest first
  harm:    { drone: [cents] } or { prog: [[root semitones, chord type], ...] } or { vamp: ... }
           optional weights (4:12 rule): drone_w (0..1, default .5), chords: { w: 0..1, note }
           A missing or low weight never means "forbidden": the own and wild pools (§2.0) can still add it.
  form:    how it unfolds over many bars, in plain words
  bpm:     [low, high] tempo in beats per minute (beat named if not a quarter note)
  swing:   0..1 amount of long-short (0 = straight); a "triplet" grid replaces swing where marked
  roles:   which existing role (bass, comp, lead, texture, harmony, pulse:time, pulse:colour) plays which cell or motif
  sig:     the 2-bar signature a player should recognise (see section 3)
  glyph, rgb: visual identity (section 3)
}
```

**Checks run on this table** (a scratch Python script outside the repo, run at about 4:04 AM MDT on Fri Oct 23, 2026, over all 30 entries in section 1.4; nothing in the repo was run or built):

1. Every rhythm string, bar by bar (`|` separates bars), is exactly as long as its grid (the entry's `grid`, or the `@N` written on the cell's name), and contains only `x` and `.`.
2. Every scale starts at 0, rises strictly, and stays inside the octave (0–11 semitones).
3. Every cents list has one value per semitone step, rises, and each value is within 50 cents of its 12-TET fallback (`st` × 100).
4. Every motif note (folded into one octave) is in one of that tradition's scales, unless the motif is marked `chrom` (deliberately outside the scale). Cents motifs are checked against the cents scales.

Result: all four checks passed, with 0 failures. The checks prove the data is self-consistent. They do not prove the musicology. Section 1.5 says which facts were checked against outside sources.

### 1.3 Shared vocabularies

#### 1.3.1 Chord types (semitones above the chord's root)

| key | semitones | plain meaning |
|---|---|---|
| maj | 0 4 7 | bright triad |
| min | 0 3 7 | darker triad |
| dim | 0 3 6 | tense, small |
| sus4 | 0 5 7 | open, unresolved |
| pow | 0 7 12 | "power chord", root + fifth only |
| dom7 | 0 4 7 10 | blues and "pull home" chord |
| m7 | 0 3 7 10 | soft minor |
| maj7 | 0 4 7 11 | dreamy major |
| m7b5 | 0 3 6 10 | "half-diminished", the ii of a minor key |
| 7b9 | 0 4 10 13 | tense dominant for minor keys |
| dom9 | 0 4 7 10 14 | funk/jazz dominant |
| m9 | 0 3 7 10 14 | jazz/house minor |
| maj9 | 0 4 7 11 14 | jazz/bossa major |
| 13 | 0 4 10 14 21 | jazz dominant (fifth left out) |
| m6 | 0 3 7 9 | minor with a sweet sixth |

**Proposal:** chords are always built **from semitones** (or cents) using this table. They are never built by stacking every other scale step. That stacking is what causes the blues and pentatonic chord bugs (MUSIC_THEORY §2.1 and §2.6).

#### 1.3.2 Ornaments: playing-style only, as note parameters

Each ornament changes only note pitch, timing, length or loudness. All of them work with the `q.from` slide field already in the note objects, or with extra short notes.

| key | plain meaning | how it is made |
|---|---|---|
| bend | note starts flat and is pushed up (blues "cry") | `from` = −50…−100 cents, slide 60–150 ms |
| fall | note drops off at the end | 2nd tiny note −100…−300 cents, 80 ms, vel ×.5 |
| glide (meend) | slow slide from one scale note to another | `from` = previous scale note, 120–400 ms |
| gamaka (kampita) | the note wobbles strongly between neighbours | alternate the note with its upper scale neighbour, 4–7 per second, 3–6 times. Done as notes, so it works on any voice |
| andolan | slow, gentle sway on one note | ±20–40 cents, 1–2 per second |
| grace (kan) | a tiny note just before the main note | 30–60 ms upper or lower neighbour, vel ×.6 |
| mordent | main–upper–main, fast | 3 notes in the first 1/8 of the note |
| trill | rapid alternation with the upper neighbour | 8–12 per second for the note's length |
| turn | upper–main–lower–main | 4 notes in the first 1/4 of the note |
| cut / tap / roll (Celtic) | a grace above (cut), a grace below (tap), or both around a repeated note (roll) | 25–40 ms grace notes |
| tahrir (Persian) | yodel-like fast flips to the next note up | 3–5 flips at 10–14 per second, on long notes |
| ghost | very quiet "felt more than heard" note | vel ≤ .2, short |
| dead | muted, pitchless-feeling chop | duration ×.25, vel ×.7 |
| antic (anticipation) | the next chord's note arrives one 8th early and is held over the bar line | shift −2 steps, tie |
| echo (dub) | the note repeats, fading | 3 repeats every 3 steps (a dotted 8th), vel ×.6 each |
| rasg (rasgueado) | fast fanned strum | chord notes 15–25 ms apart, 3–5 strokes |
| trem | rapid repeats of one note | 6–12 per second |
| melisma | many notes on one "breath" | a 3–6 note stepwise run inside one beat |
| stacc / legato | short or connected | duration ×.4 / ×1.1 |
| harm (overtone pick) | melody chosen from the harmonic series of the drone note | pitch = f0 × n, n ∈ {6, 8, 9, 10, 12}; kept pure (not snapped to 12-TET) with strong weight .95 |

#### 1.3.3 Meters (existing keys reused; new keys marked NEW)

| key | groups (16th steps) | steps | plain feel |
|---|---|---|---|
| 4/4 | 4 4 4 4 | 16 | even four |
| 3/4 | 4 4 4 | 12 | waltz |
| 2/4 | 4 4 | 8 | quick march, polka, Chinese folk tunes |
| 6/8 | 6 6 | 12 | two lilting beats of three |
| 12/8 | 6 6 6 6 | 24 | four lilting beats of three (Africa, blues ballads) |
| 7/8 | 4 4 6 | 14 | short-short-long (Bulgarian rachenitsa) |
| 9/8 | 4 4 4 6 | 18 | short-short-short-long (Balkan/Turkish aksak) |
| 11/8 | 4 4 6 4 4 | 22 | short-short-long-short-short (kopanitsa) |
| compas | 6 6 4 4 4 | 24 | flamenco 12-count (3+3+2+2+2) |
| rupak / jhaptal / adi | 12 8 8 / 8 12 8 12 / 16 8 8 | 28 / 40 / 32 | Indian talas |
| 4/4t **NEW** | 3 3 3 3 | 12 | four beats each split in three: shuffle, jazz swing, triplet blues |
| 7/8b **NEW** | 6 4 4 | 14 | long-short-short (Macedonian lesnoto) |
| 9/8s **NEW** | 6 6 6 | 18 | three even beats of three (Irish slip jig) |
| 10/8 **NEW** | 6 4 4 6 | 20 | long-short-short-long (Turkish curcuna) |
| free **NEW** | none | none | no bar at all: notes follow breath length (alap, taqsim, avaz, overtone drone). Played as 4/4 at low strictness until the timing engine supports it |
| teen **NEW** | 4 4 4 4 per bar, 4-bar cycle | 16 ×4 | Hindustani teentaal: 16 counts, 1 count = 1 beat |

MUSIC_THEORY §4.2 notes that Q's occupancy map must use the bar's own step count (up to 48). All of these fit within that limit.

### 1.4 The 30 entries

**How to read them:**

- Ids are internal code keys and never appear on screen (text-free game).
- `st` is in semitones and `c` in cents. In `iv`, a decimal such as `1.5` means one and a half semitones, i.e. a three-quarter-tone step. Negative numbers sit below the tonic and numbers of 12 or more sit above the octave.
- A `|` inside a rhythm string separates bars. `@N` on a cell name means that cell uses an N-step grid instead of the entry's default `grid`.
- Every `prog` is written as `[root in semitones above the tonic, chord type from 1.3.1]`.
- The pop, funk, reggae, house and rock cells are *typical* example patterns, not one canonical pattern. Real players vary them. All other cells are standard reference forms (see 1.5).

**Tradition words, explained once** (roughly in entry order):

1. **Church modes** (`modal`): the seven "white-key" scales, each starting on a different note: Ionian = major, Dorian = minor with a bright 6th, Phrygian = minor with a dark flat 2nd, Lydian = major with a raised 4th, Mixolydian = major with a flat 7th, Aeolian = natural minor, Locrian = diminished. **Plainchant**: unaccompanied, free-flowing melody that moves mostly by step.
2. **Classical:** the **leading tone** is the 7th note, one semitone below home, that "pulls" upward. **Alberti bass**: a broken-chord left hand, low-high-middle-high. **V–I cadence**: the strongest musical full stop.
3. **Blues:** the **12-bar blues** is a fixed 12-bar chord plan (I I I I / IV IV I I / V IV I V). **Blue note**: a note bent between minor and major (between 300 and 400 cents), or a flat 5th. **Shuffle**: a long-short triplet feel. **Backbeat**: snare hits on beats 2 and 4.
4. **Jazz:**
   - **ii–V–I** is the core cadence (e.g. Dm7–G7–Cmaj7).
   - **Walking bass** plays one note per beat and steps toward the next chord.
   - **Comping** is chord stabs placed off the beat.
   - A **rootless voicing** leaves the root to the bass.
   - **Guide tones** are the 3rds and 7ths that carry the harmony.
   - An **enclosure** surrounds a target note from above and below.
   - **Bebop scale**: a scale with one extra passing note so that beats land on chord notes.
5. **Rock/pop:** the **I–V–vi–IV** loop (like C–G–Am–F). **Power chord**: root plus fifth only.
6. **Funk:** **"the One"** means the first beat of every bar is the heaviest landing point. **Ghost notes**: very quiet in-between hits. **Scratch**: a muted, choppy guitar 16th pattern.
7. **Reggae:** **one drop** means the kick and snare land together on beat 3 and beat 1 is left empty. **Skank**: an off-beat chord chop. **Bubble**: an organ pattern that rocks back and forth. **Steppers**: a kick on every beat.
8. **Dub:** reggae stripped to drums and bass, with echo tails and parts dropping in and out.
9. **Son / Afro-Cuban:**
   - **Clave** is a 2-bar timeline: in "3-2", 3 hits come in the first bar and 2 in the second.
   - **Tumbao** is the bass pattern that skips beat 1 and lands *ahead* of the chord (the "anticipated" bass).
   - **Montuno** is a repeated syncopated piano figure.
   - **Coro**: a sung chorus answered by a lead.
10. **Rumba:** **rumba clave** is like son clave but with the third hit one 16th later, which makes it more restless. **Diana**: the opening vocal phrase.
11. **Samba:**
    - **Partido-alto** is a 7-hit, one-bar rhythm from samba guitar and cavaquinho (a small four-string guitar), played forward or reversed.
    - The **surdo** is the big bass drum, playing on beat 2 (and beat 4 in its answer).
    - **Batucada**: a samba drum ensemble.
12. **Bossa nova:** the **bossa clave** is like son clave with the last hit delayed. Chords are soft 7ths and 9ths, and the melody walks down by step.
13. **West African** (`wafrica`):
    - The **standard bell** is the 7-stroke, 12-pulse timeline of the Ewe and of many other peoples.
    - **3 against 2 / 6 against 4**: two pulse streams at once.
    - **Interlocking** parts are two players whose notes fall in each other's gaps.
14. **Hindustani** (North Indian):
    - **Raga**: a scale *plus* rules for how to move in it, which notes to stress, and characteristic phrases.
    - **Vadi / samvadi**: the most and second-most important notes. **Pakad**: the "catch phrase" that identifies the raga.
    - **Sa, Re, Ga, Ma, Pa, Dha, Ni**: the seven note names. Sa = tonic and Pa = fifth.
    - **Tala**: the rhythm cycle. **Teentaal**: 16 counts in 4 groups of 4. **Sam**: count 1, where everything lands. **Khali**: the "empty" wave-hand group (counts 9–12).
    - **Tihai**: a phrase played 3 times so that its last note lands exactly on sam. **Alap**: the slow, unmetred opening.
    - **Meend**: a slow glide. **Andolan**: a gentle sway.
15. **Carnatic** (South Indian):
    - **Melakarta**: the system of 72 parent scales.
    - **Adi tala**: 8 beats grouped 4+2+2.
    - **Gamaka**: the strong note-shaking ornament, which is essential here and not optional.
    - **Konnakol / takadimi**: spoken rhythm syllables (the rhythms only are used; no words).
    - **Korvai**: a long, tihai-like composed ending.
16. **Arabic maqam:**
    - **Maqam**: a mode built from **ajnas** (*jins* = a 3–5 note building block, e.g. "jins hijaz", with its wide 1½-step gap).
    - **Ghammaz**: the note where the second jins starts, and a resting point.
    - **Quarter-tone notes**: E-half-flat and B-half-flat, sitting at about 350 and 1050 cents.
    - **Sayr**: the customary melodic path through a maqam.
    - **Taqsim**: an unmetred improvisation.
    - **Iqa'**: the rhythm cycle, made of **dum** (low) and **tek** (high) strokes. Maqsum, baladi and saidi are common 4/4 iqa'at.
17. **Persian dastgah:**
    - **Dastgah**: a modal system with a repertoire of short pieces called **gusheh**.
    - **Koron**: a note lowered by roughly a quarter tone.
    - **Shahed**: the "witness", or main note.
    - **Owj**: the climax in the high register. **Forud**: the descent back to the tonic.
    - **Avaz**: the free, unmetred section. **Zarb**: the goblet drum. **Reng**: a lively closing dance in 6/8.
    - **Tahrir**: a yodel-like vocal flip.
18. **Turkish makam:**
    - **Koma**: 1/9 of a whole tone, about 22.6 cents, in the 53-division theory. Turkish intervals are counted in komas.
    - **Seyir**: the melodic path (rising, falling, or centred).
    - **Usul**: the rhythm cycle. **Aksak** usul: 9/8 grouped 2+2+2+3. **Curcuna**: 10/8 grouped 3+2+2+3.
19. **Gamelan** (Javanese and Balinese bronze orchestras):
    - **Slendro**: a 5-note scale with nearly equal steps of about 240 cents.
    - **Pelog**: a 7-note scale with uneven steps, played in 5-note subsets (**pathet**).
    - **Balungan**: the skeleton melody.
    - **Colotomy**: gongs marking the ends of phrases (kenong, kempul, and the big gong on the last beat of a cycle).
    - **Kotekan**: two interlocking parts, **polos** (on-beat) and **sangsih** (off-beat), that together make one very fast line.
    - **Irama**: the density level, how many decorating notes fill each skeleton beat.
    - Tunings differ from set to set, so the cents here are typical values, not fixed ones.
20. **Japanese:**
    - **In / miyako-bushi**: a 5-note scale with semitones (0 1 5 7 8), sombre. **Yo**: a 5-note scale without semitones, folk-like.
    - **Hirajoshi, iwato, ryukyu**: koto and Okinawan scales.
    - **Ma**: meaningful silence. **Jo-ha-kyu**: a slow start, a build, then a quick end.
21. **Chinese:** the 5 notes **gong, shang, jue, zhi and yu** (0 2 4 7 9). Each can serve as the home note, which gives 5 modes. **Heterophony** is common: one tune, decorated differently by each player.
22. **Celtic:**
    - **Jig**: 6/8, two groups of three. **Reel**: fast 4/4 in even 8ths. **Slip jig**: 9/8, three groups of three. **Hornpipe**: dotted 4/4.
    - **Cut, tap and roll**: tiny grace notes used to separate repeated notes.
23. **Flamenco:**
    - **Phrygian dominant**: Phrygian with a major 3rd (0 1 4 5 7 8 10), the "Spanish" sound.
    - **Andalusian cadence**: the falling chords iv–♭III–♭II–I (Am–G–F–E).
    - **Compás**: the 12-count rhythm with accents on 3, 6, 8, 10 and 12 (soleá and bulerías), or the shifted seguiriya.
    - **Palmas**: hand claps. **Rasgueado**: a fast fanned strum.
24. **Balkan aksak:** "aksak" is Turkish for "limping". These are meters built from uneven groups of 2 and 3 fast pulses:
    - rachenitsa 7/8 = 2+2+3;
    - lesnoto 7/8 = 3+2+2;
    - daychovo 9/8 = 2+2+2+3;
    - kopanitsa 11/8 = 2+2+3+2+2.
    - **Ukrainian Dorian**: minor with a raised 4th.
25. **Techno:**
    - **Four-on-the-floor**: a kick on every beat.
    - **Off-beat hat**: a hi-hat between the kicks.
    - **Acid line**: a sliding, squelchy bass sequence.
26. **House:** four-on-the-floor plus open off-beat hats and soul/jazz chord **stabs** (m9, dom9).
27. **Drum and bass:** a fast (160–180 bpm) **two-step** break (kick on 1 and on the "and" of 3, snare on 2 and 4) over a slow sub-bass.
28. **Minimalism** (Reich, Glass, Riley):
    - **Phasing**: two players repeat one loop, and one slowly drifts ahead until they line up again one step apart.
    - **Additive process**: a pattern grows one note at a time (1, 1-2, 1-2-3, ...).
29. **Overtone / throat singing** (Tuvan, Mongolian *khöömei*): a low **drone** plus a whistling melody made by picking out single **harmonics** of that drone. The harmonics used are 6, 8, 9, 10 and 12 times the drone frequency, which gives pure, untempered intervals (204 and 386 cents instead of 200 and 400).
30. **Andean:**
    - **Huayno**: a long-short-short dance rhythm.
    - **Bombo**: the bass drum.
    - **Hocket**: two panpipe players alternate the notes of one tune.

Each entry also has a `sig` (the 2-bar signature) and `glyph`/`rgb` fields; these are explained in §3.

```json
[
{
 "id": "classical",
 "grp": "europe",
 "glyph": "two nested arches",
 "rgb": "#FFFFFF",
 "scales": [{"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}, {"k": "harm_minor", "st": [0, 2, 3, 5, 7, 8, 11], "tet": "ok"}, {"k": "mel_minor", "st": [0, 2, 3, 5, 7, 9, 11], "tet": "ok"}],
 "meters": ["4/4", "3/4", "2/4"],
 "grid": 16,
 "cells": {"alberti": "x.x.x.x.x.x.x.x.", "march": "x.......x.......", "waltz_bass@12": "x...........", "waltz_chord@12": "....x...x..."},
 "motifs": [{"k": "alberti", "st": [0, 7, 4, 7], "note": "broken chord low-high-middle-high under the tune"}, {"k": "cadence_2_1", "st": [2, 0], "note": "melody steps down to home over V-I"}, {"k": "leading_tone", "st": [11, 12], "note": "the 'pull' note one semitone under home"}, {"k": "scale_run", "st": [0, 2, 4, 5, 7, 9, 11, 12]}],
 "iv": [7, 5, 4, 3, 11],
 "orn": ["trill", "mordent", "turn", "grace"],
 "harm": {"prog": [[[0, "maj"], [5, "maj"], [7, "dom7"], [0, "maj"]], [[0, "maj"], [9, "min"], [5, "maj"], [7, "dom7"]], [[9, "min"], [2, "min"], [7, "dom7"], [0, "maj"]]], "cadences": {"perfect": [[7, "dom7"], [0, "maj"]], "plagal": [[5, "maj"], [0, "maj"]], "deceptive": [[7, "dom7"], [9, "min"]]}},
 "form": "4- and 8-bar phrases; question phrase ends on V, answer ends on I; counterpoint = two lines moving in opposite directions",
 "bpm": [60, 140],
 "swing": 0,
 "roles": {"bass": "root on beat 1 (march/waltz bass)", "comp": "alberti", "lead": "stepwise tune, cadence_2_1 at phrase ends"},
 "sig": "Alberti broken chord under a tune that ends bar 2 with a V-I full stop and a trill on the penultimate note"
},
{
 "id": "modal",
 "grp": "europe",
 "glyph": "three-step staircase",
 "rgb": "#B0BEC5",
 "scales": [{"k": "ionian", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok", "focus": {"colour": [4, 11]}}, {"k": "dorian", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "ok", "focus": {"colour": [9]}}, {"k": "phrygian", "st": [0, 1, 3, 5, 7, 8, 10], "tet": "ok", "focus": {"colour": [1]}}, {"k": "lydian", "st": [0, 2, 4, 6, 7, 9, 11], "tet": "ok", "focus": {"colour": [6]}}, {"k": "mixolydian", "st": [0, 2, 4, 5, 7, 9, 10], "tet": "ok", "focus": {"colour": [10]}}, {"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok", "focus": {"colour": [8]}}, {"k": "locrian", "st": [0, 1, 3, 5, 6, 8, 10], "tet": "ok", "focus": {"colour": [1, 6]}}],
 "meters": ["4/4", "3/4", "free"],
 "grid": 16,
 "cells": {"chant": "x...x...x...x...", "vamp": "x.......x......."},
 "motifs": [{"k": "dorian_colour", "st": [7, 9, 7, 3, 2, 0], "note": "leans on the raised 6th"}, {"k": "lydian_colour", "st": [4, 6, 7, 6, 4], "note": "leans on the raised 4th"}, {"k": "phrygian_colour", "st": [3, 1, 0], "note": "falls onto home from a semitone above"}],
 "iv": [6, 1, 9, 10],
 "orn": ["glide", "grace"],
 "harm": {"vamp": {"dorian": [[0, "m7"], [5, "maj"]], "mixolydian": [[0, "maj"], [10, "maj"]], "lydian": [[0, "maj"], [2, "maj"]], "phrygian": [[0, "min"], [1, "maj"]], "aeolian": [[0, "min"], [8, "maj"], [10, "maj"]]}, "drone": [0, 700]},
 "form": "two-chord vamp or a drone; the melody keeps returning to the mode's colour note",
 "bpm": [50, 120],
 "swing": 0,
 "roles": {"harmony": "vamp or drone", "lead": "colour motif"},
 "sig": "Two-chord sway in which the one 'odd' note of the mode (raised 6th, raised 4th, flat 2nd...) is played loud on beat 1 of bar 2"
},
{
 "id": "blues",
 "grp": "americas",
 "glyph": "line that bends upward at its end",
 "rgb": "#2962FF",
 "scales": [{"k": "blues", "st": [0, 3, 5, 6, 7, 10], "tet": "ok"}, {"k": "major_blues", "st": [0, 2, 3, 4, 7, 9], "tet": "ok"}, {"k": "minor_pent", "st": [0, 3, 5, 7, 10], "tet": "ok"}],
 "meters": ["4/4t", "12/8"],
 "grid": 12,
 "cells": {"shuffle": "x.xx.xx.xx.x", "boogie_bass": "x.xx.xx.xx.x", "backbeat_4/4t": "...x.....x.."},
 "motifs": [{"k": "lick_down", "st": [10, 7, 6, 5, 3, 0]}, {"k": "boogie", "st": [0, 4, 7, 9, 10, 9, 7, 4], "chrom": true, "note": "bass walks up and down the dom7 chord plus 6th"}, {"k": "call", "st": [7, 10, 7, 5, 3, 0], "note": "2-bar call, answered by the same rhythm a step lower"}, {"k": "blue_third", "st": [3, 4, 0], "chrom": true, "note": "minor 3rd bent up toward major 3rd, then home"}],
 "iv": [3, 6, 10],
 "orn": ["bend", "fall", "grace", "trem"],
 "harm": {"prog": [[[0, "dom7"], [0, "dom7"], [0, "dom7"], [0, "dom7"], [5, "dom7"], [5, "dom7"], [0, "dom7"], [0, "dom7"], [7, "dom7"], [5, "dom7"], [0, "dom7"], [7, "dom7"]]], "quick_change": "bar 2 = IV7"},
 "form": "12-bar cycle; lines are 4 bars: statement, repeat, answer (AAB)",
 "bpm": [60, 130],
 "swing": "triplet",
 "roles": {"bass": "boogie", "comp": "dom7 on shuffle", "lead": "call + bend", "pulse:time": "shuffle"},
 "sig": "Triplet shuffle plus a bent minor-3rd cry into home; all chords are dom7"
},
{
 "id": "jazz",
 "grp": "americas",
 "glyph": "open spiral",
 "rgb": "#6200EA",
 "scales": [{"k": "bebop_dom", "st": [0, 2, 4, 5, 7, 9, 10, 11], "tet": "ok"}, {"k": "dorian", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "ok"}, {"k": "lydian_dom", "st": [0, 2, 4, 6, 7, 9, 10], "tet": "ok"}, {"k": "altered", "st": [0, 1, 3, 4, 6, 8, 10], "tet": "ok"}, {"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}],
 "meters": ["4/4t"],
 "grid": 12,
 "cells": {"ride": "x..x.xx..x.x", "hat_2_4": "...x.....x..", "walk": "x..x..x..x..", "charleston": "x....x......"},
 "motifs": [{"k": "bebop_down", "st": [12, 11, 10, 9, 7, 5, 4, 2, 0]}, {"k": "enclosure", "st": [5, 3, 4], "chrom": true, "note": "circle the target note from above and below"}, {"k": "guide_tones", "st": [5, 5, 4], "note": "3rd of ii -> 7th of V -> 3rd of I (key-relative)"}],
 "iv": [10, 11, 14, 21],
 "orn": ["grace", "fall", "ghost", "bend"],
 "harm": {"prog": [[[2, "m9"], [7, "13"], [0, "maj9"], [0, "maj9"]], [[2, "m7b5"], [7, "7b9"], [0, "m6"], [0, "m6"]]], "subs": {"tritone": "G7 -> Db7 (root +6)"}, "voicing": {"rootless": {"m9": [5, 9, 12, 16], "13": [5, 9, 11, 16], "maj9": [4, 7, 11, 14]}}},
 "form": "ii-V-I cells chained; head - solos - head; walking bass on quarter notes",
 "bpm": [70, 260],
 "swing": "triplet",
 "roles": {"bass": "walk: chord tones on 1 and 3, semitone approach on 4", "comp": "charleston with rootless voicing", "pulse:time": "ride + hat_2_4", "lead": "bebop_down / enclosure"},
 "sig": "Ding-ding-a-ding ride plus walking bass plus a rootless m9 -> 13 -> maj9 change"
},
{
 "id": "rockpop",
 "grp": "americas",
 "glyph": "zigzag bolt",
 "rgb": "#FF1744",
 "scales": [{"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}, {"k": "minor_pent", "st": [0, 3, 5, 7, 10], "tet": "ok"}, {"k": "mixolydian", "st": [0, 2, 4, 5, 7, 9, 10], "tet": "ok"}, {"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"kick": "x.......x.x.....", "snare": "....x.......x...", "hat8": "x.x.x.x.x.x.x.x.", "eighth_bass": "x.x.x.x.x.x.x.x."},
 "motifs": [{"k": "riff", "st": [0, 3, 5, 7, 5, 3, 0, -2]}, {"k": "hook", "st": [4, 4, 2, 0, 2, 4], "note": "short sing-along hook repeated 2x"}],
 "iv": [7, 3, 10],
 "orn": ["bend", "stacc", "dead"],
 "harm": {"prog": [[[0, "maj"], [7, "maj"], [9, "min"], [5, "maj"]], [[9, "min"], [5, "maj"], [0, "maj"], [7, "maj"]], [[0, "pow"], [10, "pow"], [5, "pow"]]]},
 "form": "verse - chorus - verse - chorus - bridge - chorus; 4-bar riff loops",
 "bpm": [90, 160],
 "swing": 0,
 "roles": {"pulse:time": "kick+snare+hat8", "bass": "eighth_bass on roots", "comp": "power chords", "lead": "riff/hook"},
 "sig": "Backbeat (snare on 2 and 4) with driving 8th-note bass and a pentatonic riff"
},
{
 "id": "funk",
 "grp": "americas",
 "glyph": "dot with a burst of rays on one side",
 "rgb": "#FF6D00",
 "scales": [{"k": "dorian", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "ok"}, {"k": "mixolydian", "st": [0, 2, 4, 5, 7, 9, 10], "tet": "ok"}, {"k": "minor_pent", "st": [0, 3, 5, 7, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"kick": "x..x......x.....", "snare": "....x.......x...", "ghosts": ".......x.x.....x", "scratch": "x.xx..x.x.xx..x.", "bass": "x.....xx..x...x."},
 "motifs": [{"k": "bass_pop", "st": [0, 0, 12, 10, 7, 0], "note": "octave pop plus slide into the One"}, {"k": "stab", "st": [10, 7, 3, 0]}],
 "iv": [10, 12, 3],
 "orn": ["ghost", "dead", "stacc", "bend"],
 "harm": {"vamp": [[0, "dom9"]], "alt": [[0, "m7"], [5, "dom9"]]},
 "form": "one-chord vamp for many bars; a 'break' bar where all but drums drop out; everything lands hard on the One",
 "bpm": [90, 120],
 "swing": 0.08,
 "roles": {"pulse:time": "kick+snare+ghosts", "comp": "scratch (dead notes between chord chops)", "bass": "bass_pop", "lead": "stab"},
 "sig": "Huge accent on beat 1 (the One), busy 16th scratch chops, ghost-note snare"
},
{
 "id": "reggae",
 "grp": "americas",
 "glyph": "three dots floating above a baseline",
 "rgb": "#76FF03",
 "scales": [{"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}, {"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}, {"k": "dorian", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"one_drop": "........x.......", "skank": "..x...x...x...x.", "bubble": "..xx..xx..xx..xx", "bass": "..xx..x...xx....", "steppers": "x...x...x...x..."},
 "motifs": [{"k": "bassline", "st": [0, 0, 7, 5, 3, 0], "note": "bass skips beat 1 and leaves space"}],
 "iv": [7, 5],
 "orn": ["stacc", "echo", "glide"],
 "harm": {"prog": [[[0, "maj"], [5, "maj"]], [[0, "min"], [5, "min"]], [[2, "m7"], [7, "maj"]]]},
 "form": "two-chord loops; drum and bass carry the song, chords are only short offbeat chops",
 "bpm": [60, 90],
 "swing": 0.04,
 "roles": {"pulse:time": "one_drop (kick+snare together only on beat 3)", "comp": "skank (very short chord on every 'and')", "texture": "bubble", "bass": "bass"},
 "sig": "Nothing on beat 1; drum hit on beat 3; short chord chops on every off-beat"
},
{
 "id": "dub",
 "grp": "americas",
 "glyph": "dot followed by three shrinking dots",
 "rgb": "#2E7D32",
 "scales": [{"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}, {"k": "minor_pent", "st": [0, 3, 5, 7, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"one_drop": "........x.......", "echo": "x..x..x..x......", "skank_sparse": "......x.......x."},
 "motifs": [{"k": "deep_bass", "st": [0, 7, 0, 10, 0], "note": "long, low, repeated"}],
 "iv": [7, 10],
 "orn": ["echo", "legato"],
 "harm": {"vamp": [[0, "min"]]},
 "form": "a reggae loop with parts dropped out and back in; single hits echo away",
 "bpm": [60, 80],
 "swing": 0,
 "roles": {"bass": "deep_bass, loudest part", "comp": "skank_sparse + echo", "pulse:time": "one_drop"},
 "sig": "A single chop that repeats 3x fading (dotted-8th echo) over a huge slow bass"
},
{
 "id": "son",
 "grp": "afro_latin",
 "glyph": "two short sticks crossing",
 "rgb": "#FF4081",
 "scales": [{"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}, {"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}, {"k": "dorian", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"son_clave_3_2": "x.....x.....x...|....x...x.......", "tumbao_bass": "......x.....x...", "conga_open": "............x.x.", "montuno": "x..x..x.x.x.x.x."},
 "motifs": [{"k": "montuno_figure", "st": [7, 4, 0, 4, 7, 9, 7, 4], "note": "broken chord, chords change one 8th early"}, {"k": "coro", "st": [7, 4, 0, 2, 4]}],
 "iv": [7, 4],
 "orn": ["antic", "grace"],
 "harm": {"prog": [[[0, "maj"], [5, "maj"], [7, "dom7"], [5, "maj"]], [[0, "maj"], [7, "dom7"]]]},
 "form": "song section, then montuno section: a short coro (chorus) repeats and the lead improvises in between (call and response)",
 "bpm": [80, 210],
 "swing": 0,
 "roles": {"pulse:time": "son clave (ANY member plays it when there is no drummer)", "bass": "tumbao: step 6 = 'and' of 2, step 12 = beat 4 = NEXT chord's root, held over the bar line; beat 1 weight .1 (rarely)", "comp": "montuno", "lead": "coro call/answer"},
 "sig": "3-2 son clave (3 hits, then 2) plus a bass that skips beat 1"
},
{
 "id": "rumba",
 "grp": "afro_latin",
 "glyph": "two crossed sticks with a third tilted stroke",
 "rgb": "#AD1457",
 "scales": [{"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}, {"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}],
 "meters": ["4/4", "12/8"],
 "grid": 16,
 "cells": {"rumba_clave_3_2": "x.....x.......x.|....x...x.......", "conga_open": "............x.x."},
 "motifs": [{"k": "diana", "st": [7, 9, 7, 4, 2, 0], "note": "wordless opening vocal-like phrase"}],
 "iv": [7, 4],
 "orn": ["glide", "grace"],
 "harm": {"drone": [0], "prog": [[[0, "maj"], [7, "dom7"]]]},
 "form": "opening phrase (diana) - verse - call and response; drums only, so the melody does the harmony",
 "bpm": [70, 120],
 "swing": 0,
 "roles": {"pulse:time": "rumba clave", "pulse:colour": "conga_open", "lead": "diana + call/response"},
 "sig": "Clave like son, but the 3rd hit is one 8th LATE (step 14), which gives a lurching pull"
},
{
 "id": "samba",
 "grp": "brazil",
 "glyph": "wavy line with one deep dip",
 "rgb": "#FFEA00",
 "scales": [{"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}, {"k": "mixolydian", "st": [0, 2, 4, 5, 7, 9, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"partido_alto": ".x..x.x.x.x..x.x", "partido_alto_reversed": "x.x..x.x.x..x.x.", "surdo": "....x.......x...", "surdo_answer": "x.......x.......", "shaker": "xxxxxxxxxxxxxxxx"},
 "motifs": [{"k": "pa_melody", "st": [7, 4, 4, 7, 9, 7, 4, 0], "note": "tune rides the partido-alto hits; the high hits are steps 1 and 10"}],
 "iv": [7, 9, 4],
 "orn": ["antic", "ghost", "grace"],
 "harm": {"prog": [[[0, "maj"], [9, "dom7"], [2, "m7"], [7, "dom7"]]]},
 "form": "refrain (everyone) - verse (one improviser) - refrain",
 "bpm": [90, 120],
 "swing": 0.06,
 "roles": {"bass": "surdo: deep note on step 4 (strong) answered on step 0", "comp": "partido_alto (the 'high' hits at steps 1 and 10 accented)", "pulse:colour": "shaker, accents on the 4th 16th of each beat", "lead": "pa_melody"},
 "sig": "Partido-alto: off-beat start, 4 on-beat hits in the middle, 2 off-beat hits at the end; low surdo hit on beat 2"
},
{
 "id": "bossa",
 "grp": "brazil",
 "glyph": "gentle S-curve",
 "rgb": "#64FFDA",
 "scales": [{"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}, {"k": "lydian", "st": [0, 2, 4, 6, 7, 9, 11], "tet": "ok"}, {"k": "dorian", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"bossa_clave_3_2": "x..x..x...x..x..", "bass": "x.....x.x.....x.", "comp": "x..x..x...x..x.."},
 "motifs": [{"k": "step_down", "st": [7, 4, 2, 0, 11], "note": "soft, mostly stepwise, falls to the 7th"}],
 "iv": [11, 14, 6],
 "orn": ["legato", "ghost"],
 "harm": {"prog": [[[0, "maj7"], [2, "dom9"], [2, "m7"], [1, "dom7"]], [[2, "m9"], [7, "13"], [0, "maj9"], [0, "maj9"]]]},
 "form": "AABA 8-bar sections; quiet throughout",
 "bpm": [110, 150],
 "swing": 0,
 "roles": {"bass": "root-fifth, dotted (steps 0, 6, 8, 14)", "comp": "bossa clave with maj7/9 chords", "lead": "step_down, soft"},
 "sig": "Soft root-fifth bass plus chord chops on the bossa clave; every chord has a 7th or 9th"
},
{
 "id": "wafrica",
 "grp": "africa",
 "glyph": "bell cone with a dot at its mouth",
 "rgb": "#D84315",
 "scales": [{"k": "major_pent", "st": [0, 2, 4, 7, 9], "tet": "ok"}, {"k": "hexatonic", "st": [0, 2, 4, 5, 7, 9], "tet": "ok"}, {"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "approx"}],
 "meters": ["12/8"],
 "grid": 24,
 "cells": {"standard_bell": "x...x...x.x...x...x...x.", "feet": "x.....x.....x.....x.....", "three": "x.......x.......x.......", "six": "x...x...x...x...x...x..."},
 "motifs": [{"k": "call", "st": [7, 9, 7, 4, 2, 0]}, {"k": "response", "st": [4, 2, 0]}, {"k": "interlock_a", "st": [0, 4, 0, 4], "note": "plays only where interlock_b rests"}, {"k": "interlock_b", "st": [7, 9, 7, 9]}],
 "iv": [2, 5, 7],
 "orn": ["glide", "grace", "trem"],
 "harm": {"drone": [0], "parallel": "melodies doubled in parallel thirds or fourths"},
 "form": "short cycles repeat; call and response; parts enter one by one and interlock; master drum signals changes",
 "bpm": [100, 160],
 "swing": 0,
 "roles": {"pulse:time": "standard_bell (ANY member if no drummer)", "bass": "feet (4 dotted-quarter pulses)", "pulse:colour": "three vs six = 3:2 cross-rhythm", "lead": "call", "harmony": "response by others"},
 "sig": "The 7-stroke 12/8 bell (x.x.xx.x.x.x in 8ths) with low 4-pulse feet beneath"
},
{
 "id": "hindustani",
 "grp": "south_asia",
 "glyph": "teardrop with a long gliding tail",
 "rgb": "#FFAB00",
 "scales": [{"k": "yaman", "st": [0, 2, 4, 6, 7, 9, 11], "tet": "approx", "focus": {"vadi": 4, "samvadi": 11}}, {"k": "bhairav", "st": [0, 1, 4, 5, 7, 8, 11], "tet": "approx", "focus": {"vadi": 8, "samvadi": 1}}, {"k": "kafi", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "approx", "focus": {"vadi": 7, "samvadi": 0}}, {"k": "todi", "st": [0, 1, 3, 6, 7, 8, 11], "tet": "approx", "focus": {"vadi": 8, "samvadi": 3}}, {"k": "bhupali", "st": [0, 2, 4, 7, 9], "tet": "approx", "focus": {"vadi": 4, "samvadi": 9}}, {"k": "marwa", "st": [0, 1, 4, 6, 9, 11], "tet": "approx", "focus": {"vadi": 1, "samvadi": 9, "no_pa": true}}, {"k": "malkauns", "st": [0, 3, 5, 8, 10], "tet": "approx", "focus": {"vadi": 5, "samvadi": 0, "no_pa": true}}, {"k": "darbari", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "approx", "focus": {"vadi": 2, "samvadi": 7, "andolan": [3, 8]}}],
 "meters": ["teen", "rupak", "jhaptal"],
 "grid": 16,
 "cells": {"teen_claps": "x...............|x...............|................|x...............", "teen_wave": "................|................|x...............|................", "tihai_5_1_counts@16": "xxxxx.xxxxx.xxxx|x..............."},
 "motifs": [{"k": "yaman_pakad", "st": [-1, 2, 4, 2, 0]}, {"k": "bhairav_pakad", "st": [4, 5, 8, 8, 7]}, {"k": "todi_phrase", "st": [1, 3, 1, 0, -4, -1, 0]}, {"k": "malkauns_phrase", "st": [5, 8, 10, 8, 5, 3, 5, 3, 0]}, {"k": "bhupali_phrase", "st": [4, 2, 0, -3, 0, 2, 4]}, {"k": "marwa_phrase", "st": [-1, 1, 4, 6, 9, 6, 4, 1]}, {"k": "darbari_phrase", "st": [3, 5, 2, 0, -4, -2, -5], "note": "slow sway (andolan) on the 3 and the -4"}],
 "iv": [1, 6, 11],
 "orn": ["glide", "gamaka", "andolan", "grace"],
 "harm": {"drone": [0, 700], "drone_no_pa": [0, 500], "drone_no_pa_no_ma": [-100, 0], "rule": "Sa+Pa normally; if the raga has no Pa: Sa+Ma when shuddha Ma (500) is in the raga (Malkauns), else Sa + low Ni (-100) (Marwa)", "chords": {"w": 0.1, "note": "weights, not bans (Wilbow 4:12): drone is the strong default; western chords stay possible at low weight, mostly when blended with a chord tradition"}, "drone_w": 0.9},
 "form": "alap (slow, no beat, rising through the raga) -> jor (steady pulse) -> composition in a tala (rhythm cycle) -> fast finish; phrases aim at sam (count 1 of the cycle) and often end with a tihai",
 "bpm": [30, 300],
 "swing": 0,
 "roles": {"harmony": "drone Sa+Pa (Sa+Ma if the raga has no Pa)", "lead": "raga phrases, pakad every 4 bars", "pulse:time": "tala claps/strokes, strongest on sam"},
 "tala": {"teen": {"counts": 16, "sections": [4, 4, 4, 4], "clap": [1, 5, 13], "wave": [9], "sam": 1}, "rupak": {"counts": 7, "sections": [3, 2, 2], "clap": [4, 6], "wave": [1], "sam": 1, "note": "sam falls on the 'wave' section, which is unusual"}, "jhaptal": {"counts": 10, "sections": [2, 3, 2, 3], "clap": [1, 3, 8], "wave": [6], "sam": 1}},
 "tihai": "phrase P played 3x with 2 gaps G so the last note lands on sam: from sam, 3P+2G = cycle+1, e.g. teentaal P=5, G=1 (3*5+2*1 = 17 = next sam)",
 "sig": "Constant tonic+fifth drone, a long slide into the raga's 'catch phrase' (pakad), and a 3x repeated phrase (tihai) that lands on beat 1"
},
{
 "id": "carnatic",
 "grp": "south_asia",
 "glyph": "tight wobbling line along a curve",
 "rgb": "#E040FB",
 "scales": [{"k": "mayamalavagowla", "st": [0, 1, 4, 5, 7, 8, 11], "tet": "approx"}, {"k": "shankarabharanam", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "approx"}, {"k": "kalyani", "st": [0, 2, 4, 6, 7, 9, 11], "tet": "approx"}, {"k": "kharaharapriya", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "approx"}, {"k": "mohanam", "st": [0, 2, 4, 7, 9], "tet": "approx"}, {"k": "hindolam", "st": [0, 3, 5, 8, 10], "tet": "approx"}],
 "meters": ["adi", "rupak"],
 "grid": 32,
 "cells": {"adi_beats": "x...x...x...x...x...x...x...x...", "adi_claps": "x...............x.......x.......", "takadimi_4": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
 "motifs": [{"k": "sarali", "st": [0, 1, 4, 5, 7, 8, 11, 12, 11, 8, 7, 5, 4, 1, 0], "note": "first practice exercise, up and down the scale"}, {"k": "mohanam_phrase", "st": [4, 2, 0, 9, 7, 9, 0]}],
 "iv": [1, 4, 11],
 "orn": ["gamaka", "glide", "grace"],
 "harm": {"drone": [0, 700], "chords": {"w": 0.1, "note": "weights, not bans (Wilbow 4:12): drone is the strong default; western chords stay possible at low weight, mostly when blended with a chord tradition"}, "drone_w": 0.9},
 "form": "composition in a tala; improvised syllable groups of 3, 4, 5 and 7 (ta-ki-ta, ta-ka-di-mi, ta-ka-ta-ki-ta); korvai = a tihai-like phrase that lands on beat 1",
 "bpm": [50, 140],
 "swing": 0,
 "roles": {"harmony": "drone", "lead": "heavy gamaka on almost every long note", "pulse:time": "adi tala: 8 counts = 4 (clap + 3 finger counts) + 2 (clap, wave) + 2 (clap, wave)"},
 "tala": {"adi": {"counts": 8, "sections": [4, 2, 2], "clap": [1, 5, 7], "wave": [6, 8], "finger": [2, 3, 4], "sam": 1}},
 "sig": "Every long note wobbles hard (gamaka) over the drone; groups of 3 and 5 fast notes resolve onto beat 1"
},
{
 "id": "maqam",
 "grp": "west_asia",
 "glyph": "looped arabesque (sideways figure-eight)",
 "rgb": "#00B8D4",
 "scales": [{"k": "rast", "st": [0, 2, 4, 5, 7, 9, 10], "c": [0, 200, 350, 500, 700, 900, 1050], "tet": "micro", "focus": {"ghammaz": 700}, "note": "descending often uses 1000 for the 7th"}, {"k": "bayati", "st": [0, 1, 3, 5, 7, 8, 10], "c": [0, 150, 300, 500, 700, 800, 1000], "tet": "micro", "focus": {"ghammaz": 500}}, {"k": "hijaz", "st": [0, 1, 4, 5, 7, 8, 10], "tet": "ok", "focus": {"ghammaz": 500}, "note": "NEW to To.CAT (12-TET match = Phrygian dominant)"}, {"k": "saba", "st": [0, 1, 3, 4, 7, 8, 10], "c": [0, 150, 300, 400, 700, 800, 1000], "tet": "micro", "focus": {"ghammaz": 300}}],
 "meters": ["4/4", "2/4"],
 "grid": 16,
 "cells": {"maqsum": "x.x...x.x...x...", "maqsum_dum": "x.......x.......", "baladi_dum": "x.x.....x.......", "baladi_tek": "......x.....x...", "saidi_dum": "x.....x.x.......", "saidi_tek": "..x.........x..."},
 "motifs": [{"k": "rast_sayr", "c": [0, 200, 350, 500, 700, 500, 350, 200, 0]}, {"k": "bayati_sayr", "c": [0, 150, 300, 500, 300, 150, 0]}, {"k": "hijaz_sayr", "c": [0, 100, 400, 500, 700, 500, 400, 100, 0]}, {"k": "saba_sayr", "c": [0, 150, 300, 400, 300, 150, 0]}],
 "iv": [1.5, 3.5, 3],
 "orn": ["glide", "trill", "grace", "melisma"],
 "harm": {"drone": [0, 700], "alt_drone": [0, 500], "chords": {"w": 0.1, "note": "weights, not bans (Wilbow 4:12): drone is the strong default; western chords stay possible at low weight, mostly when blended with a chord tradition"}, "drone_w": 0.9},
 "form": "taqsim (free solo, no beat, climbing the maqam via its anchor note) then a metred tune in an iqa (rhythm cycle) played in heterophony",
 "bpm": [70, 140],
 "swing": 0,
 "roles": {"pulse:time": "iqa: dum = low, tek = high", "harmony": "drone tonic+5th (or +4th)", "lead": "sayr (path) stepping up to the ghammaz anchor and back", "texture": "heterophony: everyone plays the tune with own ornaments"},
 "sig": "A quarter-tone 'between the keys' note (e.g. Bayati's 150-cent 2nd) leaned on loudly over a dum-tek maqsum"
},
{
 "id": "dastgah",
 "grp": "west_asia",
 "glyph": "arch rising then falling with a hook at the end",
 "rgb": "#536DFE",
 "scales": [{"k": "shur", "st": [0, 1, 3, 5, 7, 8, 10], "c": [0, 150, 300, 500, 700, 800, 1000], "tet": "micro", "focus": {"shahed": [500, 150]}}, {"k": "segah", "st": [0, 1, 3, 5, 6, 8, 10], "c": [0, 150, 350, 500, 650, 850, 1000], "tet": "micro", "focus": {"centre": 350}}, {"k": "chahargah", "st": [0, 1, 4, 5, 7, 8, 11], "c": [0, 150, 400, 500, 700, 850, 1100], "tet": "micro"}, {"k": "mahur", "st": [0, 2, 4, 5, 7, 9, 11], "c": [0, 200, 400, 500, 700, 900, 1100], "tet": "ok"}, {"k": "homayun", "st": [0, 1, 4, 5, 7, 8, 10], "c": [0, 150, 400, 500, 700, 800, 1000], "tet": "micro"}],
 "meters": ["free", "6/8", "4/4"],
 "grid": 16,
 "cells": {"zarb": "x..x.x..x.x.....", "reng_6/8@12": "x..x.xx..x.."},
 "motifs": [{"k": "shur_forud", "c": [500, 300, 150, 0, -200, 0], "note": "descent home, approached from the 7th below"}, {"k": "owj", "c": [0, 300, 500, 700, 800, 1000, 1200, 1000, 800, 700], "note": "climb to the high point, then turn"}],
 "iv": [1.5, 2.5],
 "orn": ["tahrir", "trill", "grace", "glide"],
 "harm": {"drone": [0, 700], "alt_drone": [0, 500], "chords": {"w": 0.1, "note": "weights, not bans (Wilbow 4:12): drone is the strong default; western chords stay possible at low weight, mostly when blended with a chord tradition"}, "drone_w": 0.9},
 "form": "a chain of gushehs (short modal sections) climbing to a high point (owj), then forud (descent) back to the home mode",
 "bpm": [60, 120],
 "swing": 0,
 "roles": {"lead": "free (avaz) phrases with tahrir yodel flips", "harmony": "drone", "pulse:time": "zarb only when metred"},
 "sig": "Unmetred phrases with fast yodel-like flips (tahrir) on long notes, ending in a descent onto home from below"
},
{
 "id": "makam",
 "grp": "west_asia",
 "glyph": "tulip: a cup on a stem",
 "rgb": "#00897B",
 "scales": [{"k": "rast_tr", "st": [0, 2, 4, 5, 7, 9, 11], "c": [0, 204, 385, 498, 702, 906, 1087], "tet": "micro", "note": "53-comma system: steps 9,8,5,9,9,8,5 commas (1 comma = 22.6 cents)"}, {"k": "ussak", "st": [0, 2, 3, 5, 7, 8, 10], "c": [0, 181, 294, 498, 702, 792, 996], "tet": "micro"}, {"k": "hicaz_tr", "st": [0, 1, 4, 5, 7, 9, 10], "c": [0, 113, 385, 498, 702, 906, 996], "tet": "micro", "note": "lower half certain; upper half varies (Rast or Ussak on the 5th) - confirm"}],
 "meters": ["9/8", "4/4", "10/8"],
 "grid": 18,
 "cells": {"aksak_usul": "x...x...x...x.....", "dum_tek": "x.......x.........", "curcuna_10/8@20": "x.....x...x...x....."},
 "motifs": [{"k": "rast_seyir", "c": [0, 204, 385, 498, 702, 498, 385, 204, 0]}, {"k": "ussak_seyir", "c": [0, 181, 294, 498, 294, 181, 0]}, {"k": "hicaz_seyir", "c": [0, 113, 385, 498, 702, 498, 385, 113, 0]}],
 "iv": [0.9, 1.8, 3.9],
 "orn": ["glide", "trill", "grace", "melisma"],
 "harm": {"drone": [0, 702], "chords": {"w": 0.1, "note": "weights, not bans (Wilbow 4:12): drone is the strong default; western chords stay possible at low weight, mostly when blended with a chord tradition"}, "drone_w": 0.9},
 "form": "taksim (free solo) then pieces in usul (rhythm cycles); seyir = the melodic route (rising or falling) that defines the makam",
 "bpm": [60, 160],
 "swing": 0,
 "roles": {"pulse:time": "usul dum/tek", "lead": "seyir", "texture": "heterophony"},
 "sig": "Limping 9/8 (2+2+2+3) dum-tek with a slightly flat 'koma' note leaned on"
},
{
 "id": "gamelan",
 "grp": "se_asia",
 "glyph": "circle with a raised centre dot (gong boss)",
 "rgb": "#C0A062",
 "scales": [{"k": "slendro", "st": [0, 2, 5, 7, 10], "c": [0, 231, 474, 717, 955], "tet": "micro", "note": "about 5 near-equal steps of ~240 cents"}, {"k": "pelog", "st": [0, 1, 3, 5, 7, 8, 10], "c": [0, 120, 270, 540, 670, 785, 950], "tet": "micro", "note": "unequal; exact cents vary by set"}, {"k": "pelog_bem", "st": [0, 1, 3, 7, 8], "c": [0, 120, 270, 670, 785], "tet": "micro", "note": "5-note subset (degrees 1 2 3 5 6)"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"polos": "x.x.x.x.x.x.x.x.", "sangsih": ".x.x.x.x.x.x.x.x", "balungan": "x...x...x...x...", "kenong": "............x...", "gong_end_of_4_bars": "................|................|................|...............x"},
 "motifs": [{"k": "balungan", "c": [231, 0, 231, 955], "note": "core tune, one note per beat"}, {"k": "polos_line", "c": [0, 231, 0, 231], "note": "on-beat half of kotekan"}, {"k": "sangsih_line", "c": [474, 717, 474, 717], "note": "off-beat half, fills the gaps"}],
 "iv": [2.4, 2.3, 1.2],
 "orn": ["trem"],
 "harm": {"drone": [0], "layers": "core tune slow, elaborations 2x/4x/8x faster (irama), all in the same scale", "drone_w": 0.1},
 "form": "cycles that END on a big gong; colotomy = gong-family punctuation at fixed points (lancaran: 16 beats, ketuk on odd beats, kenong 4/8/12/16, kempul 6/10/14, gong 16)",
 "bpm": [40, 180],
 "swing": 0,
 "roles": {"bass": "balungan (core tune)", "comp": "polos + sangsih = kotekan (interlocking: two players alternate 16ths so they sound like one very fast line)", "pulse:colour": "kenong/gong punctuation", "texture": "elaboration at 4x"},
 "kotekan_rule": "any 2+ members: split by parity (even steps / odd steps); with 1 member play both halves an octave apart; NOT only when exactly 2 (fixes MUSIC_THEORY 2.9)",
 "sig": "A shimmering continuous 16th line made by two ohms alternating, in a non-piano tuning, with a deep gong on the last beat of the cycle"
},
{
 "id": "japan",
 "grp": "east_asia",
 "glyph": "open brush circle with a gap",
 "rgb": "#F8BBD0",
 "scales": [{"k": "in_miyako_bushi", "st": [0, 1, 5, 7, 8], "tet": "ok", "note": "descending form; ascending often uses 10 instead of 8"}, {"k": "yo", "st": [0, 2, 5, 7, 9], "tet": "ok"}, {"k": "hirajoshi", "st": [0, 2, 3, 7, 8], "tet": "ok"}, {"k": "ryukyu", "st": [0, 4, 5, 7, 11], "tet": "ok"}, {"k": "iwato", "st": [0, 1, 5, 6, 10], "tet": "ok"}],
 "meters": ["4/4", "free"],
 "grid": 16,
 "cells": {"ma": "x.....x.........", "koto_pluck": "x...x.x.........", "drum_build": "x.......x...x.xx"},
 "motifs": [{"k": "in_fall", "st": [12, 8, 7, 5, 1, 0]}, {"k": "yo_arch", "st": [0, 2, 5, 7, 9, 7, 5, 2, 0]}],
 "iv": [1, 5, 4],
 "orn": ["glide", "bend", "grace", "legato"],
 "harm": {"drone": [0, 700], "chords": "sparse; often just 4ths and 5ths"},
 "form": "jo-ha-kyu: slow opening -> building middle -> fast short ending; silence (ma) is a deliberate part of the music",
 "bpm": [40, 110],
 "swing": 0,
 "roles": {"lead": "sparse phrases with long rests", "comp": "koto_pluck", "pulse:time": "drum_build only late in a cycle"},
 "sig": "A falling semitone onto home (the In scale's 1->0) followed by a deliberate full beat of silence"
},
{
 "id": "china",
 "grp": "east_asia",
 "glyph": "cloud scroll (double curl)",
 "rgb": "#00C853",
 "scales": [{"k": "gong", "st": [0, 2, 4, 7, 9], "tet": "ok"}, {"k": "shang", "st": [0, 2, 5, 7, 10], "tet": "ok"}, {"k": "jue", "st": [0, 3, 5, 8, 10], "tet": "ok"}, {"k": "zhi", "st": [0, 2, 5, 7, 9], "tet": "ok"}, {"k": "yu", "st": [0, 3, 5, 7, 10], "tet": "ok"}],
 "meters": ["4/4", "2/4"],
 "grid": 16,
 "cells": {"phrase": "x...x.x.x...x...", "woodblock": "x.x.x.x.x.x.x.x."},
 "motifs": [{"k": "gong_arch", "st": [0, 2, 4, 7, 9, 7, 4, 2, 0]}, {"k": "yu_phrase", "st": [0, 3, 5, 7, 5, 3, 0]}],
 "iv": [2, 3, 5, 7],
 "orn": ["glide", "grace", "trem", "bend"],
 "harm": {"drone": [0, 700], "chords": {"w": 0.2, "note": "mainly heterophony and parallel 4ths/5ths (weight .8); western chords weight .2"}},
 "form": "melody-led; phrases often rise and fall in an arch; ensemble plays one tune with personal ornaments",
 "bpm": [50, 130],
 "swing": 0,
 "roles": {"lead": "pentatonic arch with slides", "texture": "heterophony", "pulse:time": "woodblock"},
 "sig": "Five-note (no semitone) arch melody with a slide into its top note"
},
{
 "id": "celtic",
 "grp": "europe",
 "glyph": "triple spiral",
 "rgb": "#AEEA00",
 "scales": [{"k": "ionian", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}, {"k": "dorian", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "ok"}, {"k": "mixolydian", "st": [0, 2, 4, 5, 7, 9, 10], "tet": "ok"}, {"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}],
 "meters": ["6/8", "4/4", "9/8s"],
 "grid": 12,
 "cells": {"jig": "x.x.x.x.x.x.", "jig_accent": "x.....x.....", "reel@16": "x.x.x.x.x.x.x.x.", "reel_accent@16": "x.......x.......", "slip_jig@18": "x.x.x.x.x.x.x.x.x.", "hornpipe@12": "x.xx.xx.xx.x"},
 "motifs": [{"k": "jig_figure", "st": [0, 4, 7, 4, 0, 4, 7, 12]}, {"k": "mixo_turn", "st": [7, 9, 10, 9, 7, 4]}],
 "iv": [7, 5, 10],
 "orn": ["cut", "tap", "roll", "glide"],
 "harm": {"drone": [0, 700], "prog": [[[0, "maj"], [10, "maj"]], [[0, "min"], [10, "maj"], [8, "maj"]]]},
 "form": "tunes of two 8-bar parts, each played twice (AABB); sets of tunes chained without a break",
 "bpm": [100, 130],
 "swing": 0.12,
 "roles": {"harmony": "drone tonic+5th", "lead": "jig/reel running notes with cuts and rolls", "pulse:time": "jig_accent / reel_accent"},
 "sig": "Running 6/8 jig (diddle-dee diddle-dee) with tiny 'cut' grace notes over a tonic+fifth drone"
},
{
 "id": "flamenco",
 "grp": "europe",
 "glyph": "half-fan of five rays",
 "rgb": "#B71C1C",
 "scales": [{"k": "phrygian_dom", "st": [0, 1, 4, 5, 7, 8, 10], "tet": "ok"}, {"k": "phrygian", "st": [0, 1, 3, 5, 7, 8, 10], "tet": "ok", "note": "3 and 4 both used: minor 3rd in melody, major 3rd on the final chord"}],
 "meters": ["compas", "4/4"],
 "grid": 24,
 "cells": {"soleares_bulerias_accents": "....x.....x...x...x...x.", "seguiriya_accents": "x...x...x.....x.....x...", "palmas_all": "x.x.x.x.x.x.x.x.x.x.x.x."},
 "motifs": [{"k": "fall_home", "st": [8, 7, 5, 4, 1, 0]}, {"k": "melisma_cry", "st": [1, 0, 1, 4, 1, 0]}],
 "iv": [1, 3, 4],
 "orn": ["rasg", "melisma", "trill", "grace"],
 "harm": {"prog": [[[5, "min"], [3, "maj"], [1, "maj"], [0, "maj"]]], "note": "Andalusian cadence: iv - bIII - bII - I, ending on a MAJOR chord on the Phrygian home"},
 "form": "12-count compas cycles; strummed falsetas (guitar phrases) alternate with sung letras; endings land on count 10",
 "bpm": [60, 260],
 "swing": 0,
 "roles": {"pulse:time": "palmas with accents on 3, 6, 8, 10, 12", "comp": "rasgueado on accents", "bass": "Andalusian cadence roots", "lead": "fall_home"},
 "sig": "12-count compas (accents 3, 6, 8, 10, 12) and the descending Andalusian cadence"
},
{
 "id": "aksak",
 "grp": "europe",
 "glyph": "long dash then two short dashes, staggered",
 "rgb": "#7E57C2",
 "scales": [{"k": "hijaz", "st": [0, 1, 4, 5, 7, 8, 10], "tet": "ok"}, {"k": "ukr_dorian", "st": [0, 2, 3, 6, 7, 9, 10], "tet": "ok"}, {"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}, {"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}],
 "meters": ["7/8", "7/8b", "9/8", "11/8"],
 "grid": 14,
 "cells": {"rachenitsa_7/8": "x...x...x.....", "lesnoto_7/8b": "x.....x...x...", "daychovo_9/8@18": "x...x...x...x.....", "kopanitsa_11/8@22": "x...x...x.....x...x..."},
 "motifs": [{"k": "hijaz_run", "st": [0, 1, 4, 5, 7, 5, 4, 1, 0]}, {"k": "ukr_turn", "st": [3, 6, 7, 6, 3, 2, 0]}],
 "iv": [1, 3, 6],
 "orn": ["grace", "trill", "mordent", "trem"],
 "harm": {"drone": [0, 700], "prog": [[[0, "maj"], [1, "maj"], [0, "maj"]], [[0, "min"], [10, "maj"], [0, "min"]]]},
 "form": "dance tunes in 2 parts; fast ornamented lines; the long beat of the limp gets the strongest accent",
 "bpm": [100, 200],
 "swing": 0,
 "roles": {"pulse:time": "aksak cell (beats 2,2,3 or 2,2,2,3 or 2,2,3,2,2 eighths)", "lead": "hijaz_run with grace notes", "bass": "one note per (uneven) beat"},
 "sig": "A limping beat you can't tap evenly (short-short-LONG), with fast grace-note runs"
},
{
 "id": "techno",
 "grp": "electronic",
 "glyph": "square-wave line",
 "rgb": "#18FFFF",
 "scales": [{"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}, {"k": "phrygian", "st": [0, 1, 3, 5, 7, 8, 10], "tet": "ok"}, {"k": "minor_pent", "st": [0, 3, 5, 7, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"kick": "x...x...x...x...", "offbeat_hat": "..x...x...x...x.", "clap": "....x.......x...", "hat16": "xxxxxxxxxxxxxxxx", "acid_line": "x.xxx.x.xx.x.xx."},
 "motifs": [{"k": "arp", "st": [0, 3, 7, 10, 7, 3]}, {"k": "one_note", "st": [0, 0, 0, 12, 0, 0, 1, 0], "note": "single-note riff with an octave jump and a semitone rub"}],
 "iv": [1, 12, 7],
 "orn": ["glide", "stacc", "ghost"],
 "harm": {"vamp": [[0, "min"]], "drone": [0]},
 "form": "16- or 32-bar blocks; one layer enters or drops out every block; long build then the kick returns",
 "bpm": [124, 140],
 "swing": 0,
 "roles": {"pulse:time": "kick on every beat (four-on-the-floor)", "pulse:colour": "offbeat_hat", "bass": "acid_line with slides between notes", "lead": "one_note"},
 "sig": "Relentless four-on-the-floor kick plus off-beat hats plus a one-note sliding riff"
},
{
 "id": "house",
 "grp": "electronic",
 "glyph": "roof shape over a dot",
 "rgb": "#FF9E80",
 "scales": [{"k": "dorian", "st": [0, 2, 3, 5, 7, 9, 10], "tet": "ok"}, {"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"kick": "x...x...x...x...", "open_hat": "..x...x...x...x.", "clap": "....x.......x...", "stab": "...x..x....x..x."},
 "motifs": [{"k": "stab_chord", "st": [3, 7, 10, 14], "note": "m9 stab"}, {"k": "bass_bounce", "st": [0, 12, 0, 10, 7]}],
 "iv": [10, 14],
 "orn": ["stacc", "ghost"],
 "harm": {"prog": [[[0, "m9"], [5, "dom9"]], [[2, "m9"], [0, "maj9"]]]},
 "form": "8-bar phrases; chord stabs loop; breakdown without kick then drop",
 "bpm": [118, 128],
 "swing": 0.1,
 "roles": {"pulse:time": "kick+clap", "pulse:colour": "open_hat", "comp": "stab (m9 / dom9)", "bass": "bass_bounce on off-beats"},
 "sig": "Four-on-the-floor with open off-beat hats and syncopated m9 chord stabs"
},
{
 "id": "dnb",
 "grp": "electronic",
 "glyph": "double fast zigzag",
 "rgb": "#EEFF41",
 "scales": [{"k": "aeolian", "st": [0, 2, 3, 5, 7, 8, 10], "tet": "ok"}, {"k": "minor_pent", "st": [0, 3, 5, 7, 10], "tet": "ok"}],
 "meters": ["4/4"],
 "grid": 16,
 "cells": {"kick": "x.........x.....", "snare": "....x.......x...", "hat16": "xxxxxxxxxxxxxxxx", "ghost_snare": ".......x.x....x."},
 "motifs": [{"k": "sub_bass", "st": [0, 0, -2, -4, 0], "note": "long low notes, half the speed of the drums"}],
 "iv": [10, 8, 7],
 "orn": ["ghost", "glide", "legato"],
 "harm": {"vamp": [[0, "min"], [8, "maj"]]},
 "form": "intro - drop - breakdown - drop; drums at double speed over a half-speed bass",
 "bpm": [160, 180],
 "swing": 0,
 "roles": {"pulse:time": "two-step: kick 1 + 'and' of 3, snare 2 and 4", "bass": "sub_bass", "texture": "pads, long notes"},
 "sig": "Very fast skittering two-step break over a slow, deep bass"
},
{
 "id": "minimal",
 "grp": "electronic",
 "glyph": "two overlapping circles slightly offset",
 "rgb": "#9E9E9E",
 "scales": [{"k": "piano_phase", "st": [0, 2, 7, 9, 10], "tet": "ok", "note": "pitch set of Reich's Piano Phase, relative to E"}, {"k": "major", "st": [0, 2, 4, 5, 7, 9, 11], "tet": "ok"}],
 "meters": ["4/4", "3/4"],
 "grid": 12,
 "cells": {"clapping_music": "xxx.xx.x.xx.", "pulse8@16": "x.x.x.x.x.x.x.x."},
 "motifs": [{"k": "piano_phase", "st": [0, 2, 7, 9, 10, 2, 0, 9, 7, 2, 10, 9], "note": "12 fast notes looped"}, {"k": "additive", "st": [0, 4, 7, 4, 0], "note": "play note 1, then 1-2, then 1-2-3 ... (grows by one note each repeat), then shrinks"}],
 "iv": [2, 5, 7],
 "orn": ["stacc"],
 "harm": {"vamp": [[0, "maj"]], "note": "one chord for many bars; change is slow and rare"},
 "form": "phasing: two ohms play the SAME loop, one slightly faster, until it is one step ahead, then they lock again (1 step per 4-8 bars); additive: patterns grow/shrink by one note",
 "bpm": [100, 200],
 "swing": 0,
 "roles": {"lead": "loop A", "comp": "loop A shifted (phase)", "pulse:time": "steady 8ths"},
 "phase_rule": "follower's loop offset += 1 step every N bars (N=4..8); full cycle after grid-length shifts",
 "sig": "Two identical fast loops sliding against each other into new patterns"
},
{
 "id": "overtone",
 "grp": "central_asia",
 "glyph": "nested arcs rising above a flat line",
 "rgb": "#8D6E63",
 "scales": [{"k": "harmonics_8_12", "st": [0, 2, 4, 7], "c": [0, 204, 386, 702], "tet": "micro", "note": "harmonics 8, 9, 10, 12 of the drone (3 octaves up); H6 = -498 below"}],
 "meters": ["free", "6/8"],
 "grid": 12,
 "cells": {"gallop": "x.xx..x.xx..", "drone": "x..........."},
 "motifs": [{"k": "harmonic_tune", "c": [0, 204, 386, 702, 386, 204, 0], "note": "pure (just) intervals - not snapped to 12-TET by default (keep-pure weight .95)"}, {"k": "low_hop", "c": [-498, 0, 204, 0]}],
 "iv": [2.04, 3.86, 7.02],
 "orn": ["harm", "legato"],
 "harm": {"drone": [0], "note": "the drone IS the harmony; melody = which harmonic is picked"},
 "form": "long held drone; melodic harmonics appear over it; horse-gait rhythms in metred songs",
 "bpm": [60, 120],
 "swing": 0,
 "roles": {"harmony": "drone on f0 (100-160 Hz)", "lead": "harmonic_tune (notes = f0 x 8, 9, 10, 12)", "pulse:time": "gallop"},
 "voice_note": "NOTES-ONLY version (any ohm may play a harmonic-series melody over a drone). Whether some ohms can produce real throat-singing timbre depends on the voice principle - open question Q1. Nothing here changes a voice.",
 "sig": "A held low drone with a whistling melody of pure harmonics floating far above it"
},
{
 "id": "andean",
 "grp": "americas",
 "glyph": "stepped terrace zigzag",
 "rgb": "#FF7043",
 "scales": [{"k": "minor_pent", "st": [0, 3, 5, 7, 10], "tet": "ok"}, {"k": "major_pent", "st": [0, 2, 4, 7, 9], "tet": "ok"}],
 "meters": ["4/4", "6/8"],
 "grid": 16,
 "cells": {"huayno": "x.xxx.xxx.xxx.xx", "bombo": "x.......x......."},
 "motifs": [{"k": "huayno_fall", "st": [7, 10, 7, 5, 3, 0, 3, 0]}, {"k": "hocket", "st": [0, 3, 7, 10], "note": "two players alternate notes of one tune (like panpipe pairs)"}],
 "iv": [3, 7, 10],
 "orn": ["grace", "trill", "legato"],
 "harm": {"prog": [[[0, "min"], [3, "maj"], [10, "maj"], [0, "min"]]]},
 "form": "short repeated sections; ends on a characteristic falling cadence to the minor home",
 "bpm": [90, 150],
 "swing": 0,
 "roles": {"pulse:time": "huayno long-short-short", "bass": "bombo", "lead": "huayno_fall with hocket between two ohms"},
 "sig": "Long-short-short huayno pulse with a falling pentatonic tune split between two ohms"
}
]
```

### 1.5 What was checked against outside sources, and what is uncertain

**Checked and agreed with:**

1. Son clave 3-2, rumba clave 3-2 (32 steps: 0 6 14 | 20 24), the surdo, the bossa clave, the standard bell (0 4 8 10 14 18 22 on 24), the jazz chord spellings and rootless voicings, the dastgah cents, and the overtone cents (H8/9/10/12 = 0/204/386/702). All of these match MUSIC_THEORY.md §5 and the code's existing values.
2. Every rhythm string was turned into step numbers by script and compared with the written step lists, for example techno kick 0 4 8 12, DnB kick 0 10 and snare 4 12, and Clapping Music `xxx.xx.x.xx.`.
3. **MUSIC_THEORY.md §2 bugs confirmed from the data side.** These are the ones the library would otherwise trip over:
   1. Blues chords must be dom7 (0 4 7 10), not stacked triads (the blues entry's `harm`).
   2. Minor-pentatonic chords must be 0 300 700, and major-pentatonic 0 400 700. Chord table 1.3.1 builds chords from semitones, so this bug cannot recur.
   3. The tumbao lands on step 12 with the *next* chord's root (the son entry, `tumbao_bass` = `......x.....x...`).
   4. Bar length must follow the meter's step count. Many entries use 12-, 14-, 18-, 20-, 22- and 24-step bars.
   5. Raga drones default to Sa+Pa (0, 700). Ragas without Pa default to Sa+Ma (0, 500) when they contain plain Ma (Malkauns), and Sa + low Ni (−100, 0) otherwise (Marwa, whose Ma is raised). These are strong weights (.9), not bans. The bug is that the tanpura *always* plays Pa.
   6. The cross-rhythm in the wafrica entry is 6 against 4 in a 24-step bar, which is 3:2 per half bar.

**Partido-alto: resolved.**

1. An earlier MUSIC_THEORY.md §5.2 draft had `.x..x.x..x..x.x.`, which has 6 hits and a second half shifted by one 16th.
2. Two sources agree on the correct pattern:
   - The Wikimedia Commons notation image "Partido_Alto.png" (one bar of 16ths) has hits on steps **1 4 6 8 10 13 15**, with the high pitches on steps 1 and 10.
   - Vurkaç's analysis describes the same 3-2 shape: 4 on-beat hits in one half and 3 off-beat hits in the other.
3. So the correct forms are `.x..x.x.x.x..x.x` (forward) and `x.x..x.x.x..x.x.` (reversed). The reversed form matches the accent descriptions in Dohearty's samba-guitar lessons.
4. MUSIC_THEORY.md §5.2 now reads `.x..x.x.x.x..x.x`, so **both docs agree**.

**Uncertain (flagged in the data):**

1. **Gamelan cents** vary from one orchestra to another. The slendro and pelog values here are typical ones.
2. **Turkish Hicaz upper half:** the upper tetrachord (the top four notes) varies in practice, so these values need confirming (Q12).
3. **Segah koron cents:** players differ by ±20 cents.
4. **Rock, funk, reggae and house cells** are typical patterns, not canonical ones.
5. **Removed and not adopted:** a rumba "palitos" (stick) pattern I could not verify was removed. The §5 tamborim pattern (marked unverified there) is not used.

---
## 2. Mix and match (proposal)

### 2.0 Wilbow's 4:12 rule: cultures add variance, they never limit (governs everything below)

> Wilbow, 4:12 AM MDT Oct 23: "The cultures should not be a limit to the possibilities, only add variance. They should still be more prominent than any random stuff."

**1. Additive, never subtractive.**

- A culture (tradition) is a **weighting layer on top of the full musical range**. It raises the odds and the loudness of its own scales, rhythms, ornaments, chords and forms.
- It never removes, forbids or caps anything an ohm could otherwise play: no scale, note, meter, rhythm, ornament, chord or key change.
- Every rule in this file that sounds like "only", "no" or "never" about musical content is written as a weight with a default number. Where accuracy needs protecting (for example, keeping a raga recognisable), that is a **strong weight** (≥ .9), labelled as such, never a ban.
- The library's few true "nevers" are not about musical content:
  - no text on screen;
  - no change to an ohm's voice or instrument;
  - no work per frame for off-screen ohms;
  - data-format checks.

**2. Prominence: culture beats random.** Every musical choice in a jam draws from three pools:

| pool | what it holds | default share in a cultured jam |
|---|---|---|
| **culture** | the blend's donors (§2.1): their scales and focus notes, cells, motifs, ornaments, harmony and form | **C = 0.60 + 0.15 × strength**: 60–75%, default **≈ 68%** at strength .5 |
| **own** | what the ohm would play with no culture at all: its birth scale, the normal song engine, western harmony | 1 − C − W: 10–25% |
| **wild** | anything in the full range: any 12-TET or quarter-tone pitch the jam's tuning allows, any step, any ornament or chord type | **W = 15% (guaranteed floor, never below 10%)** |

- **Choices** are: the pitch of each note, the onset steps of each part, which ornament (if any) a note gets, the chord or drone of each bar, and whether a key change happens.
- **Strength** is the jam's culture strength (0–1), from members' leans (§2.3). A jam counts as **cultured** when strength ≥ .25. Below that, C = 2 × strength (0–50%), W stays at 15%, and own takes the rest. A lean-free jam is therefore simply the full-range engine. There is **no western-only fallback**; western traditions (`classical`, `modal`, `rockpop`) are cultures like any other.
- **Loudness tilt:**
  - culture-pool notes get velocity ×1.15;
  - wild notes get ×0.85, and onset weight ×2 on weak steps (so they mostly sound like passing colour, but are never forced there);
  - with the shares above, culture material makes up at least about 70% of the *sound energy* in a cultured jam.
- **The signature recurs:** at least one full signature cell (`sig`) in **every 2-bar window**, at velocity ≥ .6, played by any member (no drummer needed). A first meeting gives ×1.3 for 2 bars. This *adds* notes; it never removes the other pools' notes.
- **Strong weights for accuracy** (inside the culture pool):
  - a raga's or maqam's own notes get weight .9; other notes in the culture pool get .1;
  - tagged notes (pakad, vadi, sam, kotekan, heterophony, response) keep their pitch through `H.bind` with probability .9;
  - the drone keeps the tonic + fifth with weight .9 (tonic + 4th, or tonic + low Ni for Pa-less ragas).
- **Cost:** once per bar per audible jam, from cached summaries.
  1. Build three small cumulative-weight tables: 24 pitch bins, ≤ 48 onset steps, about 20 ornaments.
  2. Mix them with the shares above.
  3. Each note then costs one random number plus one table lookup.

  That is about 100 multiply-adds per bar per jam, under 0.01 ms. Off-screen jams: nothing (§4).

**What Wilbow hears:** a raga jam is unmistakably a raga about 2 out of 3 notes, with its drone and catch-phrase. Every few bars something from outside slips in: a western chord under it, a blues bend, an odd off-beat, a note from another culture. Those moments are quieter and rarer than the culture, but never impossible.

### 2.1 Five swappable layers

A jam's music is described by a **blend**: for each of the 5 layers, which tradition (the *donor*) supplies it.

| layer | what it decides | what it reads from the entry |
|---|---|---|
| **scale** | which notes are allowed, the tuning (cents), and which notes act as anchors | `scales`, `focus`, `motifs`, `iv` |
| **rhythm** | meter, timeline, the part rhythms and swing | `meters`, `grid`, `cells`, `swing`, `bpm` |
| **ornament** | how notes are decorated | `orn` (a blend may hold weights from up to 3 donors) |
| **harmony** | drone, chord loop or vamp | `harm` |
| **form** | cycle length, phrase plan, and where everyone lands (sam, gong, clave, the One) | `form`, `tala`, `tihai`, `phase_rule` |

**Rules that keep blends musical:**

All of these are **weights inside the culture pool** (§2.0). The own and wild pools still keep their 25–40% share.

1. **Microtonal scale donor** (`tet: "micro"`): within the harmony layer, drone weight .85 and chord weight .15. When a chord is picked, its notes are nudged to the nearest scale cents with weight .8. Most of the time you hear a drone, which suits quarter-tone scales; now and then you hear a "wrong-but-interesting" chord.
2. **Scale donor with 5 or fewer notes:** chord notes that are in the scale get weight .85, others .15. When fewer than 3 in-scale chord notes exist, power chords (root + fifth) get weight .7 and the full chord .3.
3. **Form:** landing points (sam, gong, clave turn) come from the rhythm donor with weight .75 and from the other donors .25.
4. **Ornaments:** donors' ornaments get their table weights. Any other ornament can still appear through the wild pool.
5. **Tempo:** picked inside the overlap of the donors' `bpm` ranges (allowing half or double time) with weight .8. Outside the overlap, the rhythm donor's range gets .2.
6. **Range:** every note is folded into the playing ohm's own range (MUSIC_THEORY §4.5). This is a body limit, not a culture limit, so it stays as it is.

**Examples of what a player hears:**

1. Maqam scale + son rhythm: Arabic quarter-tone melodies over a clave.
2. Raga scale + techno rhythm: a raga line over a four-on-the-floor kick, with the drone kept.
3. Gamelan scale + minimalist form: slendro loops that phase against each other.
4. Blues scale + aksak rhythm: blues licks in a limping 7/8.

### 2.2 Cheap compatibility score

The score is computed **once when the game loads**, for all 435 pairs of the 30 traditions. It is then kept as a table (a 30×30 Float32Array of about 3.6 KB).

```text
pitch(A,B) = 0.5 × overlap(primary scale A, primary scale B)
           + 0.5 × best overlap over any scale pair
             where overlap = |shared| / |all| of the two note sets on the 24-step quarter-tone grid (To.pcs24)
meter(A,B) = 1   same steps and same grouping
             0.8 same steps, different grouping (12/8 vs compás)
             0.7 one bar length divides the other (16 vs 32)
             0.5 3:2 or 4:3 relation (16 vs 24, 12 vs 16), or either is free time
             0.2 anything else (14 vs 16)
tempo(A,B) = overlap ÷ union of the bpm ranges, best of ×½, ×1, ×2
score      = 0.5 pitch + 0.3 meter + 0.2 tempo + 0.1 if same wider family (grp), capped at 1
```

**Real values from the library** (scratch script, 4:04 AM MDT):

| pair | pitch | meter | tempo | family | **score** |
|---|---|---|---|---|---|
| samba + bossa | 1.00 | 1.00 | 0.17 | +.10 | **0.93** |
| blues + jazz | 0.56 | 1.00 | 0.74 | +.10 | **0.83** |
| techno + house | 0.75 | 1.00 | 0.18 | +.10 | **0.81** |
| hindustani + carnatic | 0.70 | 0.70 | 0.67 | +.10 | **0.79** |
| maqam + son | 0.65 | 1.00 | 0.43 | 0 | **0.71** |
| overtone + china | 0.80 | 0.50 | 0.75 | 0 | **0.70** |
| dastgah + maqam | 0.64 | 0.50 | 0.62 | +.10 | **0.69** |
| son + wafrica | 0.86 | 0.50 | 0.46 | 0 | **0.67** |
| maqam + flamenco | 0.64 | 0.50 | 0.55 | 0 | **0.58** |
| japan + gamelan | 0.34 | 1.00 | 0.56 | 0 | **0.58** |
| blues + hindustani | 0.57 | 0.50 | 0.52 | 0 | **0.54** |
| celtic + andean | 0.52 | 0.50 | 0.50 | 0 | **0.51** |
| gamelan + classical | 0.20 | 1.00 | 0.57 | 0 | **0.51** |
| aksak + techno | 0.78 | 0.20 | 0.16 | 0 | **0.48** |

Across all 435 pairs the scores range from 0.29 to 1.00 (median 0.64). 34 pairs fall below 0.45 and 140 are at or above 0.7.

**What the score controls.** It never forbids a mix; it sets **how deep** the mix goes:

| score | blend depth | what you hear |
|---|---|---|
| ≥ 0.70 | **full**: each layer's culture share split about 50/50 between the donors | a smooth fusion (blues + jazz) |
| 0.45 – 0.70 | **split**: per layer 80/20. One donor leads rhythm and form, the other leads scale and ornaments | clearly two cultures, one on top of the other (maqam over clave) |
| < 0.45 | **guest**: per layer 90/10 toward the main donor, plus the guest's signature once per cycle | a "visitor" moment (a gamelan kotekan burst in a techno jam) |

No pair is ever blocked; low scores only shrink the guest's weight (Wilbow 4:12 rule; Q9 answered).

### 2.3 How a jam settles on a blend

1. **At formation (once):** each member votes on each layer. A vote's weight is the member's lean toward a tradition × its leadership gene (145) × a layer affinity:
   - rhythm votes count more from ohms with high syncopation and meter genes;
   - scale votes count more from ohms with high mode and microtone genes.

   Each layer's **lead donor** is the tradition with the most weight (the others keep their depth-table share, §2.2), with ties broken by a seeded hash rather than list order. That fixes the bias toward the first-listed (western) tradition noted in MUSIC_THEORY §3.2.
2. **Depth check:** the score between the scale donor and the rhythm donor sets full, split or guest depth (2.2).
3. **Two-ohm jams with different leans fuse immediately** (MUSIC_THEORY §3.5): one ohm gives rhythm, the other gives scale. No waiting for the fusion bridge.
4. **Re-evaluation happens only at the end of a cycle**, and at most once every 4 bars.
   - Only **one layer** may change at a time.
   - A challenger must beat the current donor by **25%** (hysteresis, so the jam doesn't flip-flop).
   - The existing `matchBars ≥ 4` and `BRIDGE ≥ .6` conditions for fusion are kept.
5. **Up to 3 named donors per jam** (a cost limit on the cached summary, not a musical one). Leans toward any further traditions are added to the wild pool's weights, so their material can still surface.
6. **New members** add their votes at the next re-evaluation, not mid-bar.
7. **A player's touch** counts as one strong vote toward the tradition of the ohm being touched. Wilbow decides whether a player can *plant* a tradition (Q4).

### 2.4 How traditions spread (teaching and culture)

These rules use systems that already exist: `exp.tx`, the per-tradition experience with 35% inheritance, and the slow `Ex.TICK`.

1. **Learning by playing:** each bar an ohm plays a layer from donor t, its `tx[t]` grows by `0.002 × learnRate gene (157)`. This is applied in bulk on `Ex.TICK`, not every frame.
2. **Teaching:** when the donor ohm has `tx[t] ≥ 0.6`, its jam partners learn ×2. Ohms with a high mimic gene (77) learn a further ×1.5.
3. **Inheritance:** children start with 35% of each parent's `tx` (existing rule).
4. **Regional culture:** each world region keeps a 30-number "local taste" vector.
   - When a jam settles there, its donors gain +0.05 in that vector.
   - The vector decays by 1% per minute of play.
   - Newborns there start with a small lean toward the local taste, scaled by the conformity gene (158).
5. **Curiosity:** ohms with a high curiosity gene (64) give a bonus to traditions they have *heard* nearby but rarely played.
6. **Forgetting:** unused `tx` decays slowly. The decay is slower when the memory gene is high.
7. **Home traditions per world** (MUSIC_THEORY §3.2a): each new world gets 2–3 home traditions. 50% of first-generation ohms lean toward one of them, so worlds don't all start out western.

Lean vector (cached per ohm and recomputed only on learning ticks):

```text
lean[t] = normalise( geneAffinity[t] + 1.5·tx[t] + conformity·region[t] + curiosity·heardNotPlayed[t] )
```

Only the **top 4** leans are stored per ohm (sparse), which keeps memory small.

### 2.5 Gene bias

1. When the library loads, each tradition gets a **feature vector** computed from its own data:
   - swing;
   - syncopation (the share of hits that fall off the beat in its signature cell);
   - microtonality;
   - ornament density;
   - odd meter;
   - tempo centre;
   - drone-ness;
   - chord complexity (average notes per chord);
   - leap size (average motif interval);
   - repetition.
2. When an ohm is born, its genes are mapped onto the same 10 axes:

   | axis | gene(s) |
   |---|---|
   | swing | 105 |
   | syncopation | 104 |
   | microtonality | the microtone and tuning genes |
   | ornament density | 126 |
   | odd meter | 102 |
   | tempo | the tempo gene |
   | drone-ness | patience |
   | chord complexity | consonance tolerance |
   | leap size | step/leap |
   | repetition | the inverse of creativity (144) |

   `geneAffinity[t] = exp(−distance² / 0.5)`, normalised. It is computed once and cached.
3. The **mode gene (96)** adds a bonus to traditions whose scales contain the ohm's birth scale (the existing `Tr.FAM` path).
4. **Creativity (144)** lowers the guest/split thresholds for that ohm's votes, so creative ohms push for deeper mixes. **Conformity (158)** raises them.

What a player notices: ohms with high swing genes drift toward blues, jazz and Celtic. Ohms with high odd-meter genes drift toward aksak, flamenco and Carnatic. Ohms with high ornament genes drift toward raga, maqam and dastgah.

### 2.6 The voice never changes

1. The library's only output is **note events** with these fields: start step, duration, scale degree or cents, velocity, slide source (`from`), and tags (`sig`, `pakad`, `vadi`, `sam`, `kotekan`, `het`, `resp`). `H.bind` keeps a tagged note's pitch with probability .9; this is a strong weight, not an exemption (MUSIC_THEORY §2.3).
2. It **never reads or writes** instrument, voice, timbre or body fields.
3. Proposed automated test: run `Trad.bar` for every tradition and blend, then assert that every ohm's instrument and voice fields are deep-equal before and after.
4. Because Wilbow's exact meaning of the instrument principle is pending (Q1), this section claims only "the library doesn't touch voices". It doesn't assume how voices are chosen.
5. Overtone singing is therefore included **as a note pattern** (a harmonic-series melody over a drone) that any ohm can play. Whether some bodies can also *sound* like throat singing is a voice question (Q1).

---

## 3. What players see and hear: glyph, colour, signature

**Text-free:** no names, labels or letters anywhere. Identity comes from three things only:

1. A **glyph**: a 1–3 stroke line shape drawn in light on the jam ring.
2. A **colour**: bold, saturated defaults, replacing the current pastel `Tr.HUE`.
3. A **signature**: a 2-bar musical fingerprint.

**On screen:**

1. **Single-tradition jam:** its glyph sits at the top of the jam ring and the ring takes its colour.
2. **Mixed jam:**
   - the ring's lower half shows the rhythm donor's colour (the "floor");
   - the upper half shows the scale donor's colour;
   - ornament donors appear as small sparks of their colour;
   - up to 3 glyphs are spaced around the ring.
3. **Solo ohm:** while playing a tradition's phrase, a faint glyph tint shows on its halo (MUSIC_THEORY §3.6).
4. **Fading:** the glyph starts at 90% opacity the first 3 times a player sees that tradition, then settles at 60%. It never drops below 40%. Today's `tradN` fade goes down to about .25, which is too faint.
5. Glyphs avoid religious and political symbols.

**Signature rule (2 bars, bold by default):**

1. When a jam adopts a tradition's layer, and for the first time a player meets that tradition (gated by `tradN`), the next 2 bars play the `sig` prominently:
   - the signature timeline is played by **any** member, even when no drummer is present (MUSIC_THEORY §3.3a), in that member's own voice;
   - the lead plays the signature motif;
   - the drone sits at velocity .35;
   - other parts thin out. Q protects the signature notes.
2. **After those 2 bars:**
   - the timeline continues at velocity ≥ .6;
   - the motif returns every 4 bars and on bar 1 of each cycle;
   - long notes get ornaments of at least 120 ms on 60% of them (MUSIC_THEORY §3.3b–d).

**Colour-blind safety:** 30 colours cannot all be told apart, so identity rests on **glyph + signature**. Colour is a third cue. On-device and colour-blind checks are part of chunk C8.

| # | internal key (never shown) | glyph (drawn in light, no letters) | colour | signature a player should recognise within 2 bars |
|---|---|---|---|---|
| 1 | `classical` | two nested arches | `#FFFFFF` | Alberti broken chord under a tune that ends bar 2 with a V-I full stop and a trill on the penultimate note |
| 2 | `modal` | three-step staircase | `#B0BEC5` | Two-chord sway in which the one 'odd' note of the mode (raised 6th, raised 4th, flat 2nd...) is played loud on beat 1 of bar 2 |
| 3 | `blues` | line that bends upward at its end | `#2962FF` | Triplet shuffle plus a bent minor-3rd cry into home; all chords are dom7 |
| 4 | `jazz` | open spiral | `#6200EA` | Ding-ding-a-ding ride plus walking bass plus a rootless m9 -> 13 -> maj9 change |
| 5 | `rockpop` | zigzag bolt | `#FF1744` | Backbeat (snare on 2 and 4) with driving 8th-note bass and a pentatonic riff |
| 6 | `funk` | dot with a burst of rays on one side | `#FF6D00` | Huge accent on beat 1 (the One), busy 16th scratch chops, ghost-note snare |
| 7 | `reggae` | three dots floating above a baseline | `#76FF03` | Nothing on beat 1; drum hit on beat 3; short chord chops on every off-beat |
| 8 | `dub` | dot followed by three shrinking dots | `#2E7D32` | A single chop that repeats 3x fading (dotted-8th echo) over a huge slow bass |
| 9 | `son` | two short sticks crossing | `#FF4081` | 3-2 son clave (3 hits, then 2) plus a bass that skips beat 1 |
| 10 | `rumba` | two crossed sticks with a third tilted stroke | `#AD1457` | Clave like son, but the 3rd hit is one 8th LATE (step 14), which gives a lurching pull |
| 11 | `samba` | wavy line with one deep dip | `#FFEA00` | Partido-alto: off-beat start, 4 on-beat hits in the middle, 2 off-beat hits at the end; low surdo hit on beat 2 |
| 12 | `bossa` | gentle S-curve | `#64FFDA` | Soft root-fifth bass plus chord chops on the bossa clave; every chord has a 7th or 9th |
| 13 | `wafrica` | bell cone with a dot at its mouth | `#D84315` | The 7-stroke 12/8 bell (x.x.xx.x.x.x in 8ths) with low 4-pulse feet beneath |
| 14 | `hindustani` | teardrop with a long gliding tail | `#FFAB00` | Constant tonic+fifth drone, a long slide into the raga's 'catch phrase' (pakad), and a 3x repeated phrase (tihai) that lands on beat 1 |
| 15 | `carnatic` | tight wobbling line along a curve | `#E040FB` | Every long note wobbles hard (gamaka) over the drone; groups of 3 and 5 fast notes resolve onto beat 1 |
| 16 | `maqam` | looped arabesque (sideways figure-eight) | `#00B8D4` | A quarter-tone 'between the keys' note (e.g. Bayati's 150-cent 2nd) leaned on loudly over a dum-tek maqsum |
| 17 | `dastgah` | arch rising then falling with a hook at the end | `#536DFE` | Unmetred phrases with fast yodel-like flips (tahrir) on long notes, ending in a descent onto home from below |
| 18 | `makam` | tulip: a cup on a stem | `#00897B` | Limping 9/8 (2+2+2+3) dum-tek with a slightly flat 'koma' note leaned on |
| 19 | `gamelan` | circle with a raised centre dot (gong boss) | `#C0A062` | A shimmering continuous 16th line made by two ohms alternating, in a non-piano tuning, with a deep gong on the last beat of the cycle |
| 20 | `japan` | open brush circle with a gap | `#F8BBD0` | A falling semitone onto home (the In scale's 1->0) followed by a deliberate full beat of silence |
| 21 | `china` | cloud scroll (double curl) | `#00C853` | Five-note (no semitone) arch melody with a slide into its top note |
| 22 | `celtic` | triple spiral | `#AEEA00` | Running 6/8 jig (diddle-dee diddle-dee) with tiny 'cut' grace notes over a tonic+fifth drone |
| 23 | `flamenco` | half-fan of five rays | `#B71C1C` | 12-count compas (accents 3, 6, 8, 10, 12) and the descending Andalusian cadence |
| 24 | `aksak` | long dash then two short dashes, staggered | `#7E57C2` | A limping beat you can't tap evenly (short-short-LONG), with fast grace-note runs |
| 25 | `techno` | square-wave line | `#18FFFF` | Relentless four-on-the-floor kick plus off-beat hats plus a one-note sliding riff |
| 26 | `house` | roof shape over a dot | `#FF9E80` | Four-on-the-floor with open off-beat hats and syncopated m9 chord stabs |
| 27 | `dnb` | double fast zigzag | `#EEFF41` | Very fast skittering two-step break over a slow, deep bass |
| 28 | `minimal` | two overlapping circles slightly offset | `#9E9E9E` | Two identical fast loops sliding against each other into new patterns |
| 29 | `overtone` | nested arcs rising above a flat line | `#8D6E63` | A held low drone with a whistling melody of pure harmonics floating far above it |
| 30 | `andean` | stepped terrace zigzag | `#FF7043` | Long-short-short huayno pulse with a falling pentatonic tune split between two ohms |

---

## 4. Cost (proposal, with estimates to be confirmed on device)

**Rule:** tables load once. Choices are made at most once per bar, from cached summaries. Nothing runs per frame for anything off-screen.

| item | when | estimate |
|---|---|---|
| Library table (30 entries) | parsed once at load | 36 KB of compact JSON. Parsing took 0.5 ms on the box, so assume about 2–5 ms on a mid-range phone. As live JS objects, about 150 KB |
| Pre-parsed cells (rhythm strings → step lists) | once at load | about 200 cells, under 10 KB |
| Compatibility table, 30×30 | once at load | Float32Array, 3.6 KB, under 1 ms to build |
| Feature vectors, 30 × 10 | once at load | 1.2 KB |
| Note sets (`pcs24` bitmasks) per scale | once at load | about 90 scales × 4 bytes |
| Per-ohm lean (top 4 traditions) | on learning ticks only | 32 bytes per ohm, so 16 KB for 500 ohms |
| Per-ohm `tx` (experience) | already exists | unchanged, about 30 numbers at most |
| Region taste vectors | on jam-settle events only | 30 floats per region |
| Per jam: blend object | at formation, and at most once per 4 bars | 5 ids + 3 ornament weights |
| Per jam per bar: note generation | only for **audible** jams | at most 48 steps × members + ornaments, roughly 50–300 simple operations. Under 0.05 ms per jam per bar, and under 0.5 ms per bar for 10 audible jams. A bar lasts 1–4 s |
| Per frame: drawing | only for **on-screen** jams | at most 3 glyph paths + 3 arcs, about 10 canvas calls per jam |
| Off-screen ohms | — | **no** note generation, **no** drawing. Learning and spread are applied in bulk on the existing slow `Ex.TICK` |
| Microtones | per note | none extra: notes already carry cents |
| Per jam per bar: prominence weight tables (§2.0) | once per bar, only for **audible** jams, from the cached blend + lean summaries | 3 cumulative tables (24 pitch bins, ≤ 48 steps, ~20 ornaments), about 100 multiply-adds, under 0.01 ms. Then 1 random number + 1 lookup per note. Off-screen: nothing |

The total new steady-state cost is under 1% of a 16 ms frame budget. Chunk D6 is a performance test that proves (or disproves) this.

---

## 5. Build chunks (early chunks fix what exists first)

Each chunk lists **what the player hears/sees** and **one automated test**. The order is a proposal, and every chunk waits on Wilbow's go-ahead. Chunks touch only notes and playing style.

### Phase A: make the cultures that already exist audible (MUSIC_THEORY §2 bugs + §3 audit)

1. **A0: Ship v0.7 to Wilbow's phone** (MUSIC_THEORY §3.1). He still has v0.6.2, so he has heard none of the current tradition work.
   - Hear: whatever v0.7 already does.
   - Test: the installed build reports version 0.7.x.
   - Needs Wilbow and the build bot, not this file.
2. **Dependency, Q slots by meter** (MUSIC_THEORY §4.2): the occupancy map uses the bar's own step count, up to 48. Without this, 12/8, compás and aksak notes get culled.
   - Test: a 24-step bar keeps all 24 slots.
3. **A1: Blues on dominant 7ths** (§2.1).
   - Hear: the 12-bar blues finally sounds bluesy: gritty and unresolved, not "nursery".
   - Test: across 12 bars, chord roots are `0 0 0 0 5 5 0 0 7 5 0 7` and every chord contains root + 10 semitones.
4. **A2: Pentatonic chords** (§2.6).
   - Hear: the pentatonic jams (China, Japan yo, Andean, blues) stop clashing.
   - Test: the minor-pentatonic tonic chord equals 0 300 700 cents; the major-pentatonic one equals 0 400 700.
5. **A3: Drone = tonic + fifth, with the tanpura's Pa fixed** (§2.2, §2.4).
   - Hear: raga jams get a real tanpura hum most of the time, instead of a western chord every bar.
   - Test (over 400 bars): at least 85% of drone notes are the tradition's default pair: {0, 700}; Malkauns {0, 500}; Marwa {−100, 0}. In Pa-less ragas, 700 appears in under 5% of drone notes (it is still allowed, at low weight).
6. **A4: Protect tradition notes from H.bind** (§2.3, §3.4).
   - Hear: the raga catch-phrase and the gamelan interlock stop being "corrected" into western notes.
   - Test (over 400 bars): 85–95% of notes tagged pakad/vadi/sam/kotekan keep their pitch through bind (strong weight .9, not an exemption), while untagged notes are still bound as now.
7. **A5: Tumbao anticipation** (§2.5).
   - Hear: the Cuban bass pushes forward and the son groove appears.
   - Test: the bass hits fall on steps 6 and 12, the note on step 12 equals the *next* bar's chord root, and nothing falls on step 0.
8. **A6: Bar length follows the meter** (§2.7).
   - Hear: 7/8, 9/8 and 12/8 stop stretching to 4/4 length, so the limp and the lilt appear.
   - Test: `barDur == steps/4 × 60/bpm` for every meter key (7/8 at 120 bpm = 1.75 s).
9. **A7: Cross-rhythm correct and labelled** (§2.8).
   - Hear: West African 3-against-2 is clearly audible.
   - Test: in a 24-step bar, the two streams have 6 and 4 onsets, coinciding only on steps 0 and 12.
10. **A8: Gamelan selection and kotekan** (§2.9, §3.2c). Slendro/Pelog birth weight 1.5. Inside a gamelan jam's culture share, slendro/pelog get weight .9 (other scales stay reachable through the own and wild pools). Kotekan works for any 2+ members.
   - Hear: gamelan jams actually sound like bronze gamelan tuning, with shimmering interlock.
   - Test (over 400 bars): in a gamelan jam at least 55% of all notes come from slendro/pelog, and when kotekan plays, the polos+sangsih union fills all 16 steps with no overlap.
11. **A9: The "three things" rule and a timeline without a drummer** (§3.3a).
   - Hear: every tradition *weights* at least three things toward itself (scale, meter/timeline and signature), so they sound different from each other even in tiny jams.
   - Test: for each tradition, a 3-ohm jam with no pulse role still emits the timeline onsets.
12. **A10: Bold defaults** (§3.3b–d): drone velocity .35, ornaments of at least 120 ms on 60% of long notes, the pakad every 4 bars and on cycle bar 1, and swing set per tradition (no .04 cap).
    - Hear: ragas sound sung, blues and jazz swing.
    - Test: statistics over 200 bars match these numbers ±10%.
13. **A11: Home traditions per world, with a fair tie-break** (§3.2a).
    - Hear: about half of new worlds start somewhere other than western.
    - Test: over 1000 simulated worlds, the non-western share is at least 45%, and the tie-break doesn't depend on list order.
14. **A12: Rare key changes in drone traditions** (§3.4). Key-change ('K') weight ×0.15 when the culture pool leads with a drone tradition.
    - Hear: ragas and maqams stay rooted almost always. A rare key change can still happen, more often when blended with a chordal culture.
    - Test (over 2000 bars): the 'K' rate in drone-tradition jams is 0.1–0.2× the rate in western jams, and not zero.
15. **A12b: Prominence shares and the 2-bar signature** (§2.0, Wilbow's 4:12 rule).
    - Hear: every cultured jam is clearly its culture, with occasional quieter outside notes.
    - Test (over 400 bars, strength .5):
      - culture-pool share of notes is 60–75%;
      - wild share is ≥ 12%;
      - every 2-bar window contains a full `sig` cell at velocity ≥ .6;
      - mean velocity of culture notes ≥ 1.1× the others;
      - a lean-free jam never forces any tradition (culture share 0).
16. **A13: Solo ohms play their tradition's melody rules** (§3.6).
    - Hear: a lone ohm hums its culture.
    - Test: a solo ohm with a lean toward t emits t's motif at least once in 8 bars.
17. **A14: Glyph + colour on the jam ring, plus a bold first signature** (§3.4 and §3 here).
    - See/hear: a bright shape and colour on each jam, and its 2-bar fingerprint the first time.
    - Test: the trad draw path calls no text API (`fillText`/`strokeText` are never called), and the first-time signature velocity is at least 1.3× normal.
18. **A15: Two-ohm jams fuse immediately** (§3.5).
    - Hear: a duet of two cultures is instantly a fusion.
    - Test: two ohms with different leans have scale donor ≠ rhythm donor by bar 2.

### Phase B: the library and the chunk-4 traditions

1. **B1: `patterns.js` data, loader and validator.** `Tr.T` becomes a view over it.
   - Hear: nothing changes yet.
   - Tests:
     - a golden test: the same seed gives identical bars before and after;
     - the 4 data checks of §1.2.
2. **B2: Rumba clave and partido-alto** (corrected grid, §1.5).
   - Hear: Cuban rumba and Brazilian samba-guitar grooves.
   - Test: onsets equal the cell strings.
3. **B3: Jazz ii–V–I** with 7th/9th/13th chords, rootless voicings, walking bass and swing of .12–.18. This also fixes bossa's chords (§2.11).
   - Hear: real jazz and bossa harmony.
   - Test: each voice moves at most 2 semitones between chords; walking bass on beat 4 is 1–2 semitones from the next root.
4. **B4: Dastgah** in cents, with forud endings.
   - Hear: Persian melodies with their koron notes.
   - Test: every note is within 5 cents of the table, and phrases end on the tonic approached from above.
5. **B5: Harmonic-series melody** (overtone, notes only).
   - Hear: a whistling melody floating over a drone.
   - Test: at least 90% of lead notes have frequency ÷ drone f0 ∈ {6, 8, 9, 10, 12} within 1 cent (kept pure, strong weight .95).

### Phase C: the mix engine

1. **C1: Layered `Trad.bar`** (the blend object).
   - Hear: mixed jams such as maqam over clave.
   - Test (over 400 bars): with blend {scale: maqam, rhythm: son}, at least 55% of notes are in the maqam's note set, at least one note is outside it (the wild pool exists), and the son clave sounds in every 2-bar window.
2. **C2: Compatibility table at load.**
   - Hear: nothing directly.
   - Test: the table is symmetric, has a diagonal of 1, all values are in 0..1, and the sample values in §2.2 match within ±.01.
3. **C3: Jam settling with hysteresis.**
   - Hear: mixes that evolve slowly instead of flickering.
   - Test: over a 200-bar simulation there is at most 1 layer change per 4 bars and no A→B→A flip within 8 bars.
4. **C4: Gene bias.**
   - Hear: swingy ohms gravitate toward blues and jazz.
   - Test: the high-swing-gene ohm's top-5 affinities include blues, jazz or celtic, deterministically.
5. **C5: Spread, teaching and region.**
   - Hear: a culture travels across the world over a session.
   - Test: in a 30-minute headless simulation, a tradition seeded in one region reaches a neighbouring one, and unused experience decays.
6. **C6: Voice contract test** (§2.6).
   - Test: instrument and voice fields are deep-equal before and after every tradition and blend.
7. **C7: Signature and glyph pass for blends** (split rings, sparks).
   - See: mixed jams visibly show two colours.
   - Test: the ring arcs use the scale and rhythm donors' colours.
8. **C8: On-device readability check** with Wilbow, including colour-blind simulation screenshots.
   - Test: an automated simulated-deuteranopia contrast check between glyph and background (at least 3:1).

### Phase D: the rest of the library, in batches

Each batch is data plus one signature test per tradition: the first 2 bars contain its `sig` cell onsets and motif intervals.

1. **D1:** rock/pop, funk, reggae, dub, techno, house, drum and bass.
2. **D2:** expanded Arabic maqam (hijaz and saba), Turkish makam (koma cents), flamenco seguiriya.
3. **D3:** more Hindustani ragas, the teentaal 4-bar cycle and real tihai, plus Carnatic adi and korvai.
   - Test: the last note of a tihai lands exactly on sam.
4. **D4:** Japanese, Chinese, Celtic (jig, reel, slip jig and the new meters), Andean hocket, and the aksak 7/8b, 9/8s and 10/8 meters.
5. **D5:** minimalism, phasing and additive process.
   - Test: after grid-length × N bars the follower is back in phase.
6. **D6: Performance budget.**
   - Test: 300 ohms and 12 jams for 1 headless minute. Tradition code uses under 1% of frame time, and the work counter for off-screen ohms stays at 0 per frame.

---

## 6. Open questions for Wilbow

1. **Q1, voice principle.** You rejected the "voice-lock" reading. This library touches notes and playing style only.
   - Is that the right boundary?
   - Do drum stroke hints (muted vs ringing hits) count as "voice" or as "style"?
   - Can any ohm ever *sound* like throat singing, or only play harmonic-series melodies?
2. **Q2, the no-genres rule.** *Answered by Wilbow's 4:12 rule:* traditions are learnable vocabularies that blend continuously and only add weight. They are never themes, classes or limits.
3. **Q3, partido-alto.** *Answered:* MUSIC_THEORY.md §5.2 now reads `.x..x.x.x.x..x.x`, so both docs agree (§1.5).
4. **Q4, planting.** Should players be able to plant a tradition, for example with an item or an egg stroke? If so, with which gesture?
5. **Q5, boldness.** Is a loud first-time 2-bar signature, plus a glyph that never fades below 40%, too much or just right?
6. **Q6, glyph shapes.** Are any to avoid? The triple spiral (Celtic) and the brush circle (Japan) carry cultural or spiritual meaning for some people.
7. **Q7, colours.** Is it OK that glyph + sound carry identity and colour is only a third cue, since 30 colours can't all be told apart?
8. **Q8, microtones vs your touches.** Until player strokes snap to the session key (V08 D), your touches may clash with quarter-tone jams. Is that acceptable for now?
9. **Q9, low-compatibility mixes.** *Answered by Wilbow's 4:12 rule:* never blocked. Low scores only shrink the guest's weight (90/10 split, §2.2).
10. **Q10, spread speed.** Should a culture cross the world in minutes or over many sessions?
11. **Q11, chords on drone traditions.** *Answered by Wilbow's 4:12 rule:* allowed at low weight (.1 inside the culture share). Blending with a chordal tradition raises it, and the own and wild pools can add more.
12. **Q12, uncertain tunings.** Are the Turkish Hicaz upper half, the gamelan cents and the Segah koron values OK as typical values?
13. **Q13, build order.** Is A → B → C → D right, or do you want some new traditions (Phase D) before the mix engine?
14. **Q14, default culture.** *Answered by Wilbow's 4:12 rule:* there is no western-only fallback. A lean-free ohm plays the full-range engine, and western traditions are ordinary cultures.
15. **Q15, shipping.** Can v0.7 go onto your phone now (A0), so you can hear Phase A as it lands?
16. **Q16, prominence numbers.** Are these right?
    - Culture share is 60–75% (default ≈ 68%), with a guaranteed wild floor of 15% (never below 10%).
    - Culture notes are ×1.15 louder and wild notes ×0.85.
    - A full signature plays every 2 bars.
    - Should the culture be bolder (e.g. 80%) or looser?
17. **Q17, wild quarter tones.** In a 12-TET culture (e.g. blues, house), may the wild pool include quarter tones (my default: yes, at half the weight of 12-TET notes)? Or should wild notes stay within the jam's tuning?
18. **Q18, strong weights.** Is ".9" the right strength for accuracy protections (raga notes, drone pair, tagged notes kept through bind)? Or should some go even higher (e.g. .97) so a raga almost never wobbles?
