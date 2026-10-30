# TRADITION_REFERENCE.md — real-note reference, song recipes, dev song library, jam → song

**Status: PROPOSAL, not approved.** Written by Resonance Music Theory on Sat Oct 24 2026, ~9 PM MDT, for Resonance (the builder) and Wilbow.
Nothing here changes code. It is a docs-only proposal. Wilbow decides; Resonance builds.

Asked for by Wilbow, Oct 24, 8:50 PM MDT (verbatim, relayed): "Let's overhaul the traditions system and let's look at the real notes in the music theory. We need to redo what we are calling music because the cohesiveness is only present sometimes. We need something like a library of songs for development. The ohms need to be working towards making a song out of a jam. The world reacts in different ways to a song than a jam".
Steering 8:52 PM: "This currently feels like a bad generative music maker. It needs to be a game that has a daw and accurate music creation".
Steering 8:55 PM: "Let's keep each planet as one tradition for now. The ohms should be able to make successful song with the theory naturally and be already doing that when you encounter a group of them".

Standing rules this doc keeps (from earlier Wilbow decisions):
1. An ohm's instrument comes from its body and never changes. Contact with a tradition changes only its notes and playing style.
2. Traditions are data. Inside a tradition, the rules are weights, not bans (Wilbow 4:12 AM: "The cultures should not be a limit to the possibilities, only add variance. They should still be more prominent than any random stuff"). The one exception is section 0: the shared frame (key, tuning, tempo, cycle, grid) is exact, because Wilbow asked for "accurate music creation".
3. Adding a new real-world style must stay easy: one data entry plus one recipe, no new code paths.
4. Off-screen work stays cheap: once per bar, from cached summaries, with no note generation.
5. The game is text-free. Names are spoken, never sung.
6. **One tradition per planet, for now.** The blend and fusion material in PATTERN_LIBRARY.md §2 is **parked, not deleted**. "Weights not bans" now means variety *within* the planet's one tradition (other ragas, other palos, other tunes, other densities), not mixing cultures. Later (Wilbow, 8:56 PM MDT Sat Oct 24 2026): blends return on much bigger planets, in border zones between tradition regions, by gradual weights (§6 Q8; SCALE_MUSIC.md §2.6).

Related docs: PATTERN_LIBRARY.md (the data schema, §1.2, and the 30 entries, §1.4), MUSIC_THEORY.md (bugs and audits), MUSIC_OVERHAUL.md (Resonance's own plan; this doc does not edit it).

---

## Contents

0. Shared musical frame (the "DAW" every jam obeys)
1. Per-tradition reference: real notes, ESSENTIAL and DECORATIVE rules, parts for each role, Minimal song recipe
2. Dev song library (dual use: reference parts and test fixtures), fixture format, accuracy metrics
3. How a jam becomes a song: stages, signals, ohm behaviour, "Already mid-song on arrival", world signals, causes of "cohesion only sometimes" (file:line)
4. Confidence flags (values I am not sure of)
5. Sources
6. Open questions for Wilbow

## Words used (plain meanings, explained once)

1. **Cent**: 1/100 of a piano semitone. An octave is 1200 cents. "0, 200, 400" means the tonic, a whole step up, and two whole steps up.
2. **12-TET**: the piano tuning, 12 equal steps of 100 cents.
3. **Period**: the interval after which a scale repeats. Almost always the octave, 1200 cents.
4. **Tonic**: the home note. **Drone**: a note (or tonic plus fifth) held under the whole piece.
5. **Degree**: a scale position counted from the tonic: degree 1 is the tonic, degree 5 is the fifth. In data, degree indexes start at 0.
6. **Vadi / samvadi** (India): the most important note of a raga and its partner, usually a 4th or 5th away.
7. **Ghammaz** (Arabic maqam): the note where the upper part of a maqam starts. It is the second-strongest note, a resting point mid-phrase.
8. **Finalis**: the note a melody must end on. Arabic: *qarar*. Turkish: *karar*. Persian: *forud* note (the "landing").
9. **Jins** (plural **ajnas**): a 3–5 note building block. A maqam is made of a lower jins and an upper jins.
10. **Cycle**: a repeating rhythm frame longer than or different from a bar: a tala (India), an iqa' or usul (Arabic/Turkish), a clave (Cuba), a gongan (Java), a compás (flamenco).
11. **Sam**: beat 1 of a tala, where everything lands. **Khali**: the "empty" (waved, not clapped) part of a tala, roughly halfway.
12. **Clave**: a 2-bar key rhythm in Cuban music. "3-2" means the bar with 3 strokes comes first.
13. **Bell / timeline**: a fixed repeating rhythm (in West Africa, a bell) that everyone else lines up to.
14. **Cadence**: the closing move of a phrase, the musical "full stop" or "comma".
15. **Strong point**: a step in the cycle where notes must be "right" (chord tone, vadi, gong tone).
16. **Step / grid**: the smallest time slot. A 4/4 bar on a 16-step grid has 16 sixteenth-note steps. A 12/8 bar uses 12 (or 24) steps.
17. **Role**: a member's job: **foundation** (bass or drone), **harmony** (comp, chords), **lead** (melody), **pulse** (drums), **colour** (sparse extra notes, fills, echoes).
18. **Hook**: the short melodic idea (motif) that comes back and makes a jam into a recognisable song.
19. **Section**: a named part of a song (A, B, verse, chorus, sthayi, montuno). **Form**: the order of sections.
20. **Heterophony**: several players playing the same melody at once, each with small personal ornaments.
21. **Voice-leading**: how each part moves from one chord to the next (small steps are good, jumps are rarer).
22. **Fixture**: a stored, exact test case that the engine's output is checked against.
23. **Hysteresis**: a gap between the "go up a stage" threshold and the "go back down" threshold, so the state doesn't flicker.

---

## 0. Shared musical frame (the "DAW" every jam obeys)

Wilbow's 8:52 PM steering: "a game that has a daw and accurate music creation". So a jam is no longer a set of ohms each guessing. A jam is a **session** in an invisible DAW (a digital audio workstation: a music program with a timeline, a grid and tracks). Every member plays into that same session.

### 0.1 The frame: one per jam, exact, shared

Each jam holds exactly ONE of each of these. Every member obeys them EXACTLY. There is no per-ohm version.

1. **Tradition**: the planet's one tradition. Fixed for the planet.
2. **Tuning**: the tradition's cents table (section 1), with its period. Everyone plays the same cents. No per-ohm detune of scale degrees.
3. **Tonic** (key): one pitch, set by the place (the planet/region home pitch) and kept for the whole song, unless the tradition's recipe has a key change in it (only western, classical, jazz, rockpop recipes may; raga, maqam, dastgah, makam, gamelan, drone traditions may not).
4. **Mode**: one scale, raga, maqam, dastgah/gusheh, makam, pathet (Javanese mode), or palo. A maqam's own built-in moves to a neighbouring jins (*sayr*, its usual "path") are part of the mode's data, not a key change.
5. **Tempo**: one BPM (beats per minute), chosen from the tradition's range. It moves only when the recipe says so (an Indian *laya* step-up, a gamelan *irama* change, a final slow-down). It is never random drift.
6. **Cycle / meter**: one cycle from the tradition's list (teentaal, son clave 3-2, maqsum, soleá compás, ladrang...). Every member counts the same cycle.
7. **Harmony track**: a chord per bar (or per half-bar) from the recipe, OR a drone (tonic, tonic+fifth, or tonic+fourth). Never both fighting.
8. **Form track**: the list of sections with their lengths, from the recipe.

### 0.2 The song-position clock

1. One clock per jam: **song id/seed → section index → bar in section → beat → step**. Plus **cycle position** when the cycle is longer than a bar (a 16-beat teentaal spans 4 bars of 4/4; a 32-beat ladrang spans 8 bars; a 12-count soleá is one 12-step bar).
2. Section markers live on that clock, like markers on a DAW timeline. Changes happen ONLY at section boundaries or at cycle ends, never mid-cycle.
3. The clock is plain arithmetic: `bar = floor((now − t0) × bpm / 60 / beatsPerBar)`. The seed is stored, never taken from the wall clock (see 3.8, cause 13).

### 0.3 Quantisation: on the grid, in the scale

1. **Time**: every note onset sits on a grid step of the jam's cycle. Allowed exceptions are only feel rules the tradition itself defines, applied *identically to every member*: swing ratio (jazz, blues, celtic hornpipe), the samba 16th "push", the 12/8 bell lilt, *laid-back* reggae. These are data (a timing offset per step), not per-ohm randomness.
2. Optional "human" timing: at most ±5 ms, default OFF. (Today's checker, tests/musicality.js, counts ±12 ms as on-grid. Keep that threshold for the test.)
3. **Pitch**: every pitch is a degree of the jam's mode in the jam's tuning. Allowed exceptions are only microtones and ornaments the tradition defines: meend/andolan (Indian slides and slow oscillation), gamaka (Carnatic), blue-note bends (blues, ~300→400 cents on the 3rd), maqam neutral notes (already in the scale), shakuhachi *meri* bends, flamenco and celtic grace notes. An ornament starts or ends on a scale note.
4. **Out-of-scale chromatic passing notes**: only where a tradition allows them (jazz approach notes, blues, classical chromatic passing tones on weak steps). Never on a strong point.

### 0.4 Where the "wild" ≥10% variance is allowed to live

Earlier Wilbow rule (relayed): the variety ("wild" choices) must stay at 10% or more. That variety lives ONLY in:
1. Ornaments (which, where, how many).
2. Note choice within the scale (which degree on weak steps, which octave, which chord tone).
3. Density (how many notes, rests, fills).
4. Which song from the recipe space (other hook, other section order the tradition allows, other raga of the same time of day).

It NEVER shows up as off-grid timing, out-of-scale pitch, a different cycle, a different tempo, or a different key. That is the core fix for "a bad generative music maker".

### 0.5 Role registers (defaults; a tradition may override in section 1)

MIDI note numbers (60 = middle C). Ohms keep their own instrument (from the body), so an ohm takes the role its instrument's natural range fits best; it transposes by octaves only.

| # | Role | Default range | Default density | Must never |
|---|------|---------------|-----------------|------------|
| 1 | foundation (bass) | 28–55 (E1–G3) | ≤ 1 note per beat, except cells that say otherwise (walking, tumbao, funk) | play a non-chord tone on beat 1 of a chord change; leave the tonic out of a final cadence |
| 2 | foundation (drone) | 36–60 | continuous, re-struck once per cycle at most | move away from tonic/fifth (or tonic/fourth) |
| 3 | harmony (comp) | 48–72 (C3–C5) | the tradition's comp cell | double the lead's melody note in the same octave on a strong step; play a full triad under a drone tradition |
| 4 | lead (melody) | 60–88 (C4–E6) | free, but ≥ 1 beat of rest every 2 bars | land on a non-focus degree at a phrase end |
| 5 | pulse (drums) | unpitched or tuned drums | the tradition's cell, exactly | move the cycle's anchor stroke (sam, clave, bell, gong, backbeat) |
| 6 | colour | 72–96 (C5–C7) or fills | ≤ 25% of steps | play during the lead's long notes in the same register |

### 0.6 Who decides what

1. The **planet** fixes the tradition: tuning, mode family, cycle list, tempo range, recipe set.
2. The **place** (region) fixes the tonic pitch (it already does: tonicC/keyC).
3. The **jam leader** picks, once per song: the exact mode (which raga or maqam), the cycle, the tempo, the recipe and the hook seed. All of it is stored in the song record (section 3.7).
4. **Members** obey the frame and choose only the variance in 0.4.

---

## 1. Per-tradition reference

### 1.0 How to read each block, and the proposed data additions

Each tradition block has the same six parts:
1. **Notes**: tuning in cents, period, tonic/drone, important degrees.
2. **Cycles**: groups and strong points (step numbers on the grid used in PATTERN_LIBRARY cells).
3. **Cadences, phrases, forms.**
4. **ESSENTIAL** (wrong = not that tradition) and **DECORATIVE** (flavour, optional, where the variance lives).
5. **Parts per role**: what each role plays, where, in what range, how it moves, and what it must never do.
6. **Minimal song recipe**: the smallest rule set that gives a correct, complete song by default.

Data: the PATTERN_LIBRARY §1.2 schema (id, grp, scales{k, st, c, tet, per, focus}, meters, grid, cells, motifs, iv, orn, harm{drone/prog/vamp, drone_w, chords.w}, form, bpm, swing, roles, sig, glyph, rgb) stays as it is. This doc proposes **seven additional fields** per tradition, written as compact `data:` lines in each block:

1. `focus` (exists): per scale, the important degree indexes: `[tonic, vadi or ghammaz, samvadi or third focus]`.
2. `fin`: the finalis degree index (where a song must end). Usually 0.
3. `strong`: the strong points of each cycle as step numbers on the cycle's grid. These are where the ESSENTIAL checks happen.
4. `land`: where phrases resolve inside the cycle (sam = 0; soleá = count 10; gongan = last step).
5. `cad`: cadence list: `{at: "phrase"|"section"|"end", bass: degrees, lead: degrees}`.
6. `ess`: the ESSENTIAL rule ids (for the checker, section 2.6).
7. `recipe`: the Minimal song recipe (form, sections, harmony per section, hook rule, intro, ending), in the format in 1.0.1.

#### 1.0.1 Recipe format (one per tradition; JSON-like)

```
recipe: {
  form:   [ {sec:"intro", len:{bars:2}}, {sec:"A", len:{bars:8}}, ... ],   // or len:{cycles:n}
  mode:   { scale:"major", tonic:"place" },                                 // tonic from the place
  cycle:  "4/4",
  harm:   { A:["I","V","I","V", ...], B:[...] } | { drone:[0,7] },          // per bar, per section
  parts:  { foundation:{rule, ex}, harmony:{rule, ex}, lead:{rule, ex}, pulse:{cell}, colour:{rule} },
  hook:   { len:{beats:4..8}, from:"lead signature, snapped to scale + cell rhythm",
            at:["A:bar1","A:bar5"], answer:"colour echoes last 2 notes at bar 4" },
  cad:    { phrase:"half cadence (end on 5)", section:"full cadence on 1", end:"..." },
  intro:  "...", ending: "..."
}
```

Example notation in recipes: degree numbers 1–7 (1 = tonic), `-` = hold, `.` = rest, `|` = bar line, `b3` = flat third, roman numerals = chords (I = major on degree 1, ii = minor on degree 2, V7 = dominant seventh). Rhythm masks: one character per grid step, `x` = onset, `.` = none.

### 1.1 `western` (common-practice tonal: folk-song, hymn, simple classical)

**Notes**
1. Tuning 12-TET, period 1200. Major: 0, 200, 400, 500, 700, 900, 1100. Natural minor: 0, 200, 300, 500, 700, 800, 1000. Harmonic minor: the same with 1100 (raised 7th) used in V chords.
2. Tonic = degree 1. Focus `[0, 4, 2]` (tonic, fifth, third). Leading tone (degree 7, 1100) pulls up to the tonic.

**Cycles**: 4/4 (strong steps 0 and 8, weaker 4 and 12), 3/4 (strong step 0), 6/8 (strong steps 0 and 6 of 12). Phrases are 4 bars; sections 8 bars.

**Cadences, phrases, forms**
1. Full cadence (PAC, "perfect authentic cadence"): V(7) → I, bass 5 → 1, melody ends on 1 on a strong beat.
2. Half cadence: phrase ends on V (melody on 2, 5 or 7).
3. Plagal: IV → I ("amen"). Deceptive: V → vi.
4. Period: 4-bar question ending on a half cadence + 4-bar answer ending on a full cadence.
5. Forms: AABA (4 × 8 bars), verse–chorus, binary AABB, ternary ABA.

**ESSENTIAL**
1. One key per song (or planned key changes at section boundaries only).
2. Strong beats carry chord tones in the melody (≥ 85%).
3. The last phrase of a section ends with V → I and the melody on 1.
4. The leading tone goes up to the tonic in a V → I cadence; the 7th of V7 (degree 4) goes down to 3.
5. Bass plays chord roots on beat 1 of every chord change.

**DECORATIVE**: passing and neighbour notes on weak steps, suspensions (4–3), appoggiaturas, inversions, secondary dominants, arpeggiated comp vs block chords.

**Parts per role**
1. Foundation: root on beat 1; 5th or approach note on beat 3 (4/4); range 28–55. Moves by step or by 4th/5th. Never: a non-root on beat 1 of the final cadence; parallel octaves or fifths with the lead.
2. Harmony: 3–4 note chords in 48–72, held or broken on each beat (`x...x...x...x...` or `x.x.x.x.x.x.x.x.`). Voice-leading: keep common tones, move other voices to the nearest chord tone (≤ 2 semitones). Never: double the leading tone; parallel fifths.
3. Lead: mostly steps, a leap followed by a step back the other way; phrase peaks once; phrase ends at bar 4 (half) and bar 8 (full). Never: end on a non-chord tone; leap a 7th or tritone.
4. Pulse: kick 0, 8; snare/clap 4, 12 (or none for hymn style); hats on 8ths. Never: move the downbeat.
5. Colour: echo the last 2–3 notes of the lead's phrase in the rest that follows (bars 4 and 8), an octave up.

**Minimal song recipe** (32 bars, AABA)
1. Form: intro 2 bars (I–V) → A 8 → A 8 → B 8 → A 8 → ending 2 bars.
2. Mode: major on the place's tonic (minor on dark planets).
3. Cycle: 4/4, 90–120 BPM.
4. Harmony: A = `I | IV | V | I | I | IV | V | I` (bar 4: V for a half cadence variant: `I | IV | I | V | I | IV | V | I`). B = `IV | IV | I | I | ii | ii | V | V`.
5. Parts: foundation `1 - 5 - | 4 - 1 - | ...` (root, fifth); harmony block chords on beats 1 and 3; pulse as above; colour echoes.
6. Hook: 4–8 notes, 1 bar, drawn from the leader's signature tune snapped to the scale and to a 2-bar rhythm mask; stated at A bar 1, repeated at A bar 5 with a changed ending (bar 4 ends on 2 or 5, bar 8 ends on 1). Example: `3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 - 2 2 |` (shape of the Ode to Joy, a public-domain melody).
7. Cadences: A bar 4 half cadence, A bar 8 full cadence, B bar 8 on V (leads back to A).
8. Intro: foundation + pulse 2 bars, or the last 2 bars of A. Ending: repeat the last 2 bars of A, slow down 10% over 2 bars, final I held 1 bar.

data: `focus:[0,4,2] fin:0 strong:{"4/4":[0,8],"3/4":[0],"6/8":[0,6]} land:"bar4:V,bar8:I" ess:["oneKey","strongChordTone85","cadV-I","LTup","rootOnChange"]`

### 1.2 `classical` (PATTERN_LIBRARY id; Baroque/Classical style)

Same notes, cycles and cadences as `western` (1.1), with stricter part-writing.
**ESSENTIAL (on top of 1.1)**
1. No parallel fifths or octaves between any two parts.
2. Four-part range rules: bass 40–62, tenor 48–67, alto 55–74, soprano 60–81.
3. Every phrase ends with a cadence; the final one is a PAC.
4. Sequences (a pattern repeated one step higher or lower) move by the circle of fifths: `I IV vii° iii vi ii V I`.
**DECORATIVE**: trills on the leading tone at cadences, Alberti bass (broken chord low–high–middle–high), ornamented repeats.
**Parts**: foundation = ground bass or Alberti/broken; harmony = inner voices moving by step; lead = periodic phrases; pulse = none (orchestral) or timpani on 1 at cadences; colour = counter-melody in 3rds/6ths with the lead.
**Minimal song recipe**: minuet, 3/4, 100–130 BPM: A 8 bars (ends on V in major), repeat; B 8 bars (starts on V, sequence, ends on I), repeat. Harmony A: `I | IV | V | I | vi | ii | V | I` (bar 8 cadence on V for a modulating A, or I for a closed A). Hook: bar 1 motif, sequenced a step lower in bar 3. Ending: final PAC, last chord held 1 bar.
data: `focus:[0,4,2] fin:0 strong:{"3/4":[0],"4/4":[0,8]} ess:["noParallel58","fourPartRanges","cadEveryPhrase","finalPAC"]`

### 1.3 `modal` (church modes / folk modal: Dorian, Mixolydian, Aeolian, Phrygian)

**Notes**: 12-TET. Dorian 0,200,300,500,700,900,1000. Mixolydian 0,200,400,500,700,900,1000. Phrygian 0,100,300,500,700,800,1000. Aeolian as natural minor.
Chant modes: each has a **final** (finalis) and a **reciting tone** (tenor): mode 1 Dorian final D, reciting A; mode 3 Phrygian E / C; mode 5 Lydian F / C; mode 7 Mixolydian G / D; the plagal modes (2, 4, 6, 8) share the finals with reciting tones F, A, A, C.
**Cadences**: Dorian `IV → i` (major IV is the mode's colour) or `bVII → i`; Mixolydian `bVII → I`; Phrygian `bII → i`. In chant: the melody falls by step to the final.
**ESSENTIAL**: 1. The mode's characteristic degree is present and stressed (Dorian major 6th, Mixolydian b7, Phrygian b2). 2. No V7 → i with a raised leading tone (that turns it into minor/major). 3. Phrases end on the final.
**DECORATIVE**: drone on the final, open fifths, parallel fourths/fifths in the comp (allowed here).
**Parts**: foundation = drone on final+5th or roots of i and bVII; harmony = open fifths or i–bVII–IV; lead = stepwise, reciting tone used as the phrase's resting point; colour = parallel 4ths or 5ths with the lead.
**Minimal song recipe**: AABB, each 8 bars, 4/4 or 6/8, 80–110 BPM. A: `i | i | bVII | bVII | i | IV | bVII | i` (Dorian). B: `bVII | bVII | i | i | bVII | IV | i(V-less) | i`. Hook: 1 bar, uses the characteristic degree. Ending: drone on the final, last phrase falls by step to it.
data: `focus:[0,4,5] fin:0 ess:["charDegree","noRaisedLT","endOnFinal"]`

### 1.4 `rockpop` (PATTERN_LIBRARY id)

**Notes**: 12-TET major or natural minor; also minor pentatonic for riffs (0,300,500,700,1000).
**Cycle**: 4/4, 85–130 BPM. Strong: 0 and 8; backbeat snare 4 and 12.
**Cadences**: loops rather than V–I: `I–V–vi–IV`, `vi–IV–I–V`, `I–IV–V–IV`, `I–bVII–IV–I`. Chorus ends on I; verse often ends on V or IV.
**Form**: intro 4–8 → verse 8–16 → chorus 8 → verse → chorus → bridge 8 → chorus ×2 → outro.
**ESSENTIAL**: 1. Backbeat on 2 and 4. 2. Chord loop of 2 or 4 bars, constant within a section. 3. Sections are multiples of 4 bars. 4. The chorus has the hook and the highest melodic register.
**DECORATIVE**: power chords, sus2/sus4, fills at the 4th or 8th bar of a section, half-time bridge.
**Parts**: foundation = roots in 8ths (`x.x.x.x.x.x.x.x.`) or on kick hits; harmony = strummed/held chords; lead = 1–2 bar phrases, chorus hook repeated ≥ 2 times; pulse = kick 0, 8 (+ 6 or 10), snare 4, 12, hats 8ths; colour = riff fragment between vocal-style phrases.
**Minimal song recipe**: intro 4 (loop, no lead) → V 8 → C 8 → V 8 → C 8 → B 8 (`IV | V | vi | V`) → C 8 → outro 4 (loop, stop on I on beat 1). Verse loop `vi–IV–I–V`, chorus loop `I–V–vi–IV`. Hook: 2 bars, stated at chorus bar 1, repeated at bar 5. Ending: hard stop on beat 1 or fade (no ritard).
data: `focus:[0,4,2] fin:0 strong:{"4/4":[0,8]} back:[4,12] ess:["backbeat","constantLoop","sections4x","chorusHook"]`

### 1.5 `jazz` (swing / bebop era)

**Notes**: 12-TET. Chords are 4-note (7th) chords: maj7, m7, 7 (dominant), m7b5. Extensions 9, 11, 13 allowed. Blue notes and chromatic approach notes allowed on weak steps.
**Cycle**: 4/4 swing, 100–240 BPM. Swing: 8th pairs long–short, about 2:1 at medium tempo, getting more even at fast tempo. Hi-hat (foot) on 2 and 4.
**Cadences**: ii–V–I (`Dm7 G7 Cmaj7` in C). **Guide tones** (the 3rd and 7th of each chord) move by half or whole step: the 7th of ii (C) → the 3rd of V (B); the 7th of V (F) → the 3rd of I (E). Turnaround: `I–vi–ii–V`. Tag ending: the last 4 bars played 3 times, `iii–VI7–ii–V7`, then I.
**Form**: head (the tune) → solos over the same chords (choruses) → head → tag. Tunes are 32-bar AABA or 12-bar blues.
**ESSENTIAL**: 1. Swing feel (identical ratio for all members). 2. 7th chords, with guide tones voice-led by step. 3. Walking bass: one note per beat, chord root on beat 1 of each chord. 4. Ride cymbal "spang-a-lang": beats 1, 2, (swung and-of-2), 3, 4, (and-of-4); hi-hat foot on 2 and 4. 5. Form choruses stay aligned (everyone knows which bar of the 32 they are in).
**DECORATIVE**: tritone substitution (bII7 for V7), altered tensions, chromatic enclosures, comping rhythms (Charleston: beat 1 and the and-of-2), trading fours.
**Parts**
1. Foundation (walking bass): beat 1 = root; beats 2–3 = chord tones or scale steps; beat 4 = approach note a half step above or below the next root. Range 28–55. Never: skip the root on beat 1 of a new chord; play in 8ths (except fills).
2. Harmony (comp): rootless voicings (3, 7, 9 or 7, 3, 13) in 50–70; short stabs, Charleston rhythm. Never: double the bass root low in the register; play on every beat.
3. Lead: 8th-note lines, chord tones on strong beats, approach notes on weak; phrases start off the beat. Never: a sustained avoid note (4th over maj7) on a strong beat.
4. Pulse: ride pattern + hat 2/4 + light kick ("feathering") on all 4 beats.
5. Colour: answer phrases in the lead's rests, quotes of the head.
**Minimal song recipe** (32-bar AABA in a major key)
1. Form: intro 4 (last 4 bars of A) → head AABA → 1 solo chorus → head AABA → tag (last 4 bars ×3) → end.
2. Harmony A: `Imaj7 | vi7 | ii7 | V7 | Imaj7 | vi7 | ii7 V7 | Imaj7`; B (bridge, a key a 4th up): `ii7/IV | V7/IV | IVmaj7 | IVmaj7 | ii7/V | V7/V | ii7 | V7`.
3. Hook: 2 bars in the head, stated at A bar 1 and every A.
4. Cadences: A bars 7–8 ii–V–I; B ends on V7 back into A.
5. Ending: tag, then final Imaj7 (or I6/9) held, bass on the root.
data: `focus:[0,4,2,6] fin:0 swing:0.67 strong:{"4/4":[0,8]} ess:["swingShared","7thGuideTones","walkRootBeat1","ride24","formAligned"]`

### 1.6 `blues` (12-bar blues)

**Notes**: 12-TET frame. Melody uses the blues scale 0, 300, 500, 600, 700, 1000 plus the major 3rd 400 (the "blue third" bends from ~300 up toward 400; bend targets are about 300–350 cents and resolve to 400 over the I chord). **Chords are built on the major scale's 1, 4, 5 as dominant 7ths (I7, IV7, V7)**, NOT on degrees of the blues scale (see 3.8, cause 14).
**Cycle**: 4/4 shuffle (8th triplets, long–short 2:1), or 12/8; 60–120 BPM.
**Form (the 12 bars)**: `I7 | I7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7` ("quick change" variant: bar 2 = IV7). Bars 11–12 are the **turnaround**: back to the start. Lyric/melody shape: AAB (line 1 bars 1–4, repeated over IV in bars 5–8, answer line bars 9–12).
**Cadences**: V7–IV7–I7 (bars 9–11). Final ending: on the last chorus, bar 12 is I7 (or a chromatic walk-down `bII7 → I7`), held.
**ESSENTIAL**: 1. The 12-bar form exactly, with chord changes on bar lines. 2. Dominant 7th chords on 1, 4, 5. 3. Shuffle feel shared by everyone. 4. AAB phrase shape: each 4-bar line has a call (2 bars) and space (2 bars) for a response.
**DECORATIVE**: bends, slides, the b5 passing note, call-and-response fills, stop-time (band hits only beat 1 for 4 bars), the "boogie" bass.
**Parts**
1. Foundation: boogie bass `1 3 5 6 b7 6 5 3` (one note per beat, over each chord's root) or root–5th shuffle. Never: lose the change at bar 5 or 9.
2. Harmony: shuffle comp on 2 and 4 or the "5–6" boogie double-stop.
3. Lead: 2-bar call at bars 1, 5, 9; rest in bars 3–4, 7–8, 11–12 (that's where the colour answers). Ends lines on 1 or the b7/5.
4. Pulse: shuffle ride, snare 2 and 4, kick 1 and 3.
5. Colour: responses in the lead's rests (bars 3–4, 7–8, 11–12).
**Minimal song recipe**: intro (the last 4 bars, 9–12) → 3 choruses of 12 bars (chorus 1 states the hook line, chorus 2 is a solo, chorus 3 repeats the hook line) → ending (bars 11–12 replaced by an ending lick to I7). Hook: 2-bar riff on I, repeated over IV (same shape, moved to the IV chord's notes or kept as-is if it fits), answered in bars 9–10. 70–100 BPM.
data: `focus:[0,4,2] fin:0 swing:0.67 harm:{prog:["I7","I7","I7","I7","IV7","IV7","I7","I7","V7","IV7","I7","V7"]} strong:{"4/4":[0,8]} ess:["12bar","dom7on145","shuffleShared","AAB"]`

### 1.7 `funk`

**Notes**: 12-TET; Dorian or Mixolydian; minor pentatonic for riffs. One chord (a dominant 9th or minor 7th) for long stretches.
**Cycle**: 4/4 on a 16-step grid, 90–115 BPM, straight 16ths (sometimes a light swing on the 16ths).
**Key idea "the One"**: beat 1 of each bar is the heaviest point. Bass and kick hit it together.
**ESSENTIAL**: 1. Everyone hits beat 1 together. 2. Syncopated 16th-note parts that interlock (each part fills holes in the others). 3. Vamp (one or two chords) per section. 4. Snare backbeat on 2 and 4 (steps 4, 12).
**DECORATIVE**: ghost notes (very quiet snare hits), horn stabs, wah, breaks, a bridge to IV9.
**Parts**
1. Foundation: root on step 0 (long), octave pops, rests; example 16-step mask `x..x..x.x.x..x..` with notes `1 . . 1 . . b7 . 1 . 5 . . b3 . .`. Never: miss step 0.
2. Harmony: "scratch" guitar 16ths muted with accents on 2–3 steps per beat, or short stabs on the offbeats (steps 2, 6, 10, 14).
3. Lead: short riffs (1 bar), repeated many times; call-and-response with horns.
4. Pulse: kick 0, (3), 10; snare 4, 12 + ghosts; hats in 16ths.
5. Colour: horn stabs on the "and" of 4 (step 14) at section ends.
**Minimal song recipe**: intro 4 bars (drums + bass) → groove A 16 bars on `I9` → B 8 bars on `IV9` → A 16 → break 4 (drums only) → A 16 → ending: band hits on the One and stops. Hook: 1-bar riff, repeated every bar of A by the lead, answered every 4th bar by colour.
data: `focus:[0,6,4] fin:0 strong:{"4/4":[0]} back:[4,12] ess:["theOne","interlock16","vamp","backbeat"]`

### 1.8 `hindustani` (North Indian raga music)

**Notes**
1. Frame: 12 note positions (svaras: Sa Re Ga Ma Pa Dha Ni; "komal" = flat, "tivra" = sharp Ma). Real intonation is not 12-TET: it is close to just intonation and differs by raga (sources: Jairazbhoy; Levy 1982; Rao & van der Meer). Use 12-TET as the frame plus a per-raga cents adjustment where the table gives one. Flagged in section 4.
2. Period 1200. **Tonic Sa** is fixed for the whole performance. **Drone (tanpura)**: Pa–Sa–Sa–Sa(low), i.e. degrees 5, 8, 8, 1; ragas without Pa use Ma (500) or Ni instead (Marwa: Ni or Dha).
3. The game's 8 ragas (styles.js), with ascent (aroha), descent (avaroha), vadi (main note), samvadi (partner), catch-phrase (pakad), and intonation hints:

| # | Raga | Scale (semitones) | Aroha (ascent) | Avaroha (descent) | Vadi / samvadi | Pakad (catch-phrase) | Intonation hints (cents) |
|---|------|-------------------|----------------|-------------------|----------------|----------------------|--------------------------|
| 1 | Yaman | 0 2 4 6 7 9 11 | N R G M# D N S' (Sa and Pa skipped going up) | S' N D P M# G R S | Ga / Ni | N R G R, N R S; P M# G R S | Ga ≈ 386, Ni ≈ 1088 (just) |
| 2 | Bhairav | 0 1 4 5 7 8 11 | S r G M P d N S' | S' N d P M G r S | dha / re (komal) | G M d d P, G M r r S | komal re and dha a little low, with slow andolan (oscillation) |
| 3 | Kafi | 0 2 3 5 7 9 10 | S R g M P D n S' | S' n D P M g R S | Pa / Sa | S S R R g g M M P | g ≈ 294–316 varies |
| 4 | Miyan ki Todi | 0 1 3 6 7 8 11 | S r g M# d N S' (Pa weak/skipped) | S' N d P M# g r S | dha / ga | d N S r g, r g r S | re and ga low (re ≈ 90, ga ≈ 290) |
| 5 | Bhupali | 0 2 4 7 9 | S R G P D S' | S' D P G R S | Ga / Dha | G R S D(low) S R G, P G D P G | — |
| 6 | Marwa | 0 1 4 6 9 11 (no Pa) | N r G M# D N S' | S' N D M# G r S | re / Dha | D M# G r, G M# D, D r S (Sa weak) | Sa is avoided as a resting note until the very end |
| 7 | Malkauns | 0 3 5 8 10 | S g M d n S' | S' n d M g S | Ma / Sa | M g M d n d M, g M g S | — |
| 8 | Darbari Kanada | 0 2 3 5 7 8 10 | S R g M P d n S' (zig-zag: n S R g, R S) | S' d n P, M P g M R S | Re / Pa | g M R S, d n P, M P g M R S | ga and dha very low with slow andolan |

**Cycles (tala)** — beat numbers, X = sam (clap, strongest), 0 = khali (wave):
1. Teentaal 16 beats = 4+4+4+4. Sam beat 1, claps 5 and 13, khali 9. Theka (the drum's basic words): `Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Dha Tin Tin Ta | Ta Dhin Dhin Dha`.
2. Rupak 7 beats = 3+2+2. Sam = khali on beat 1 (it starts on a wave). Theka `Tin Tin Na | Dhi Na | Dhi Na`.
3. Jhaptal 10 beats = 2+3+2+3. Sam 1, khali 6. Theka `Dhi Na | Dhi Dhi Na | Ti Na | Dhi Dhi Na`.
4. Ektaal 12 beats = 2+2+2+2+2+2 (not in game; listed for later).
On the 16-step grid (4 steps per beat), teentaal = 64 steps = 4 bars of 4/4: strong steps 0 (sam), 16, 48; khali 32.

**Phrases, cadences, forms**
1. **Mukhda**: the composition's opening phrase, which always leads into sam. It is the hook. It comes back after every improvisation.
2. **Tihai**: a phrase played 3 times with two equal gaps so its last note lands exactly on sam. It is the standard section ending and the final ending.
3. Form: **alap** (no pulse; slow exposition from low Sa, note by note, upward) → **jor** (steady pulse, no tala) → **jhala** (fast, repeated drone strings) → **gat/bandish** (composed piece in tala): **sthayi** (first part, low/middle register, around Sa) and **antara** (second part, upper register, touches high Sa'), each returning to the mukhda → improvisations (taans) → faster tempo (drut) → tihai ending on sam.

**ESSENTIAL**
1. Sa never changes. No chords and no modulation.
2. The tala cycle with sam exactly placed; the mukhda and every tihai land on sam.
3. The raga's aroha/avaroha (which notes go up, which come down, which are skipped) and its pakad.
4. Vadi and samvadi are the most heard and the longest-held notes (not the triad 1-3-5).
5. Phrases end on Sa, the vadi or the samvadi, not on a passing note.
**DECORATIVE**: meend (slides), andolan (except where it is part of the raga's identity, as in Darbari and Bhairav: then it is ESSENTIAL), murki (quick turns), taans (fast runs), choice of tala, tempo stage.

**Parts per role**
1. Foundation = drone (tanpura), Pa–Sa–Sa–Sa(low), one pluck per beat, never stops, never changes. Never: a chord or a bass line.
2. Harmony = none. A second melodic instrument may shadow the lead (heterophony) one beat behind, or hold the vadi. Never: a triad or parallel 3rds.
3. Lead: the bandish/mukhda and improvisation in the raga, range 55–84 (low Pa to high Pa). Never: break the aroha/avaroha on strong beats; end on a weak note at sam.
4. Pulse = tabla theka, exactly, with sam stressed (bayan, the bass drum, on sam) and khali without bass strokes. Never: shift sam; play bass strokes in khali.
5. Colour: a second melodic voice answering in sawal-jawab (question and answer), short.

**Minimal song recipe** (about 3–4 minutes)
1. Form: alap 8–16 bars of free pulse (drone + lead, no tabla) → sthayi 4 cycles → antara 2 cycles → sthayi (mukhda) 2 cycles → faster section 4 cycles (tempo × 1.5–2) → tihai → end on sam.
2. Mode: one raga from the 8; Sa = the place's tonic.
3. Cycle: teentaal, vilambit 40–60 BPM (slow) or madhya 90–140 (medium), drut 200+ (fast).
4. Harmony: drone [Sa, Pa] (or Ma/Ni per raga), whole song.
5. Hook (mukhda): 4–8 beats ending on sam, built from the pakad (fixed in data) shaped to end on beat 1; it is the last thing before every sam in the sthayi.
6. Cadences: every cycle returns to sam via the mukhda; section ends = tihai (a 3-beat phrase ×3 with 1-beat gaps = 11 beats, its first note on beat 7 of teentaal so its last note lands on the next sam).
7. Intro: drone alone 2 beats, then alap. Ending: tihai on sam, then drone alone 1 cycle.
data: `focus:{yaman:[0,2,6],bhairav:[0,5,1],kafi:[0,4,0],todi:[0,5,2],bhupali:[0,2,4],marwa:[0,1,4],malkauns:[0,2,0],darbari:[0,1,4]} fin:0 strong:{teen:{sam:1,tali:[5,13],khali:9},rupak:{sam:1,khali:1,tali:[4,6]},jhaptal:{sam:1,tali:[3,8],khali:6}} land:"sam" harm:{drone:[0,7]} ess:["fixedSa","noChords","samExact","aarohAvaroh","vadiStress","tihaiOnSam"]`
(Focus indexes are positions in each raga's own scale list in styles.js. Kafi and Malkauns repeat a degree because vadi/samvadi include Sa.)

### 1.9 `carnatic` (South Indian raga music)

**Notes**
1. 12 positions; svara names with variants: R1 R2 R3, G1 G2 G3, M1 M2, D1 D2 D3, N1 N2 N3 (some share a key: R2 = G1, R3 = G2, D2 = N1, D3 = N2).
2. Game ragas (styles.js): Mayamalavagowla (melakarta, the "parent scale", no. 15: S R1 G3 M1 P D1 N3), Shankarabharanam (no. 29, = major), Kalyani (no. 65, = Lydian), Kharaharapriya (no. 22, = Dorian), Mohanam (S R2 G3 P D2, pentatonic), Hindolam (S G2 M1 D1 N2, pentatonic).
3. Tonic Sa fixed; drone (tambura) Pa–Sa–Sa–Sa.
4. **Gamakas** (shakes, slides and oscillations on specific notes) belong to the raga's identity. For example, in Shankarabharanam the Ga and Ni are sung with gamaka, not as flat 12-TET notes. The game cannot fully model this. Minimum: a fixed oscillation on the raga's gamaka notes, defined per raga (flag, section 4).

**Cycles (tala)**: Adi tala = 8 beats = laghu (4: clap + 3 finger counts) + drutam (2: clap, wave) + drutam (2: clap, wave). Strong: beat 1 (sam), then claps at 5 and 7. **Carnatic Rupaka = 6 beats** (drutam 2 + laghu 4), NOT the Hindustani 7-beat Rupak (see 3.8, cause 16). Misra chapu = 7 beats (3+2+2), khanda chapu = 5 beats (2+3).
**Eduppu**: the composition may start before or after sam (for example half a beat after), but phrases still resolve to sam.

**Forms**: geetham (simplest song, one tempo, no repeats needed), varnam (pallavi, anupallavi, muktayi svaram, charanam with chitta svarams), kriti: **pallavi** (refrain, the hook; repeated with growing variations called sangatis) → **anupallavi** (second section, higher register) → pallavi → **charanam** (verse) → pallavi. Endings: **korvai/mora** (like a tihai: a pattern ×3 landing on sam or on the eduppu).

**ESSENTIAL**: 1. Fixed Sa, drone, no chords. 2. Tala with sam; mora/korvai lands on sam/eduppu. 3. Raga scale and gamakas on the right notes. 4. Pallavi returns after each section.
**DECORATIVE**: kalpana svaram (improvised sargam phrases), sangati count, niraval, tempo doubling (2nd speed).

**Parts per role**
1. Foundation: tambura drone, as Hindustani.
2. Harmony: none (violin shadows the voice in heterophony).
3. Lead: the kriti melody, gamakas fixed per raga. Range 55–84.
4. Pulse: mridangam (two-headed drum) strokes on the tala; sam stressed; korvai at section ends. Ghatam/kanjira double it.
5. Colour: violin echo of the lead's last phrase, one cycle later.

**Minimal song recipe**
1. Form: short alapana 8 bars free (optional) → pallavi 2 cycles (×2, second time with one sangati) → anupallavi 2 cycles → pallavi 1 cycle → charanam 4 cycles → pallavi 1 cycle → mora → end.
2. Mode: one of the 6 ragas; Sa = place tonic.
3. Cycle: Adi tala (8 beats = 2 bars of 4/4), 60–90 BPM.
4. Drone [S, P] throughout.
5. Hook: the pallavi's first line, 1 cycle (8 beats), ending on Sa or Pa at sam.
6. Cadences: each section ends on sam with the pallavi's first note; final mora (3 × a 5-beat phrase with gaps) on sam.
7. Ending: mora → final Sa on sam → drone 1 cycle.
data: `focus:{mayamalavagowla:[0,4,3],shankarabharanam:[0,4,2],kalyani:[0,4,2],kharaharapriya:[0,4,2],mohanam:[0,2,3],hindolam:[0,2,1]} fin:0 strong:{adi:{sam:1,claps:[5,7]},rupaka:{beats:6,sam:1}} harm:{drone:[0,7]} ess:["fixedSa","noChords","samExact","gamakaNotes","pallaviReturns"]`

### 1.10 `maqam` (Arabic maqam music: Egypt, Levant, Iraq)

**Notes** (cents above the tonic; the neutral "half-flat" notes are given as 24-TET values; real intonation varies by region and by maqam: e.g. Rast's 3rd is often a bit higher than 350 in Egypt, Bayati's 2nd is around 145–160; source Marcus 1989, Racy 2003. Flagged.)

| # | Maqam (tonic in Western notation) | Cents | Lower jins + upper jins | Ghammaz | Qarar (finalis) | Path (sayr) |
|---|-----------------------------------|-------|-------------------------|---------|-----------------|-------------|
| 1 | Rast (C) | 0, 200, 350, 500, 700, 900, 1050 (descending often 1000) | Rast on C + Rast on G (up) / Nahawand on G (down) | G (5th, index 4) | C | rise to G, settle there, descend with B-flat, cadence through the lower jins to C |
| 2 | Bayati (D) | 0, 150, 300, 500, 700, 800, 1000 | Bayati on D + Nahawand on G | G (4th, index 3) | D | stress G, sometimes visit Rast on F, descend to D |
| 3 | Hijaz (D) | 0, 100, 400, 500, 700, 800, 1000 (the 2nd ≈ 110 and the 3rd ≈ 390 in practice) | Hijaz on D + Nahawand (or Rast) on G | G (4th, index 3) | D | linger on G, descend with the augmented 2nd |
| 4 | Saba (D) | 0, 150, 300, 400, 700, 800, 1000 | Saba on D + Hijaz on F | F (3rd, index 2) | D | stays low; the 4th (G-flat, 400) never rises to G; ends on D |
| 5 | Nahawand (C) — not in the game yet, needed for "Lamma Bada" | 0, 200, 300, 500, 700, 800, 1100 (descending 1000) | Nahawand on C + Hijaz or Kurd on G | G (5th) | C | — |

Period 1200. Drone: not intrinsic to urban Arabic music (an optional held tonic is acceptable); the iqa' and the heterophonic ensemble are the foundation.

**Cycles (iqa'): dum (low, centre of drum) and tak (high, edge)**, on 16 steps per 4/4 bar:
1. Maqsum 4/4: dum 0, tak 2, tak 6, dum 8, tak 12 (= PATTERN_LIBRARY "maqsum" `x.x...x.x...x...`).
2. Baladi 4/4: dum 0, 2, 8; tak 6, 12.
3. Saidi 4/4: dum 0, 6, 8; tak 2, 12.
4. Sama'i thaqil 10/8: 10 eighth-note beats; dum on 1, tak on 4, dum on 6 and 7, tak on 8 (flagged: confirm with a second source).
5. Wahda 4/4 (slow, mostly a single dum on 1 with taks): flagged, values not given here.

**Phrases and forms**
1. **Qafla**: the cadence: a phrase that descends through the lower jins to the qarar, often after a stop on the ghammaz.
2. **Taqsim**: unmetered solo improvisation that shows the maqam's path. Usually an opening.
3. Metric forms: **sama'i** (4 sections called khana, each followed by a refrain, the taslim; khanas 1–3 in 10/8 sama'i thaqil, khana 4 often in 3/4 or 6/8, then the taslim in 10/8); **bashraf**; **longa** (fast 2/4); **dulab** (short prelude); **muwashshah** (song; e.g. Lamma Bada).

**ESSENTIAL**
1. Maqam intonation: neutral notes (150, 350, 1050) are exact and shared by all; nobody "rounds" them to 12-TET.
2. The ajnas and the ghammaz: phrases rest on the tonic or the ghammaz; the upper jins is explored from the ghammaz.
3. Qafla to the qarar at every section end; the song ends on the qarar.
4. The iqa' cycle with dum on step 0.
5. Heterophony, not chords: no triads (a "Rast chord" with a 350-cent 3rd sounds wrong as harmony).
**DECORATIVE**: trills and slides, short modulation to a neighbour maqam (and back) mid-song, riq (tambourine) fills, tak ornaments (tik, ka).

**Parts per role**
1. Foundation: a held qarar drone (optional), or a low instrument doubling the melody's skeleton notes an octave down, landing on qarar at cadences. Never: a chord, a walking bass, or a different note from the lead at the qafla.
2. Harmony: none. A second melody instrument plays the same tune with its own small ornaments (heterophony: same skeleton notes on the strong steps, freedom on the weak steps).
3. Lead: the tune; range 55–84. Never: a 12-TET 3rd in Rast or 2nd in Bayati.
4. Pulse: darbuka iqa' exactly; riq doubles.
5. Colour: echoes of the lead's last 2 notes in the gaps; a short taqsim phrase between sections.

**Minimal song recipe**
1. Form: taqsim 8 bars free (lead alone over an optional tonic drone) → A (taslim/refrain) 4 bars → B (khana 1) 4 bars → A 4 → C (khana 2, explores the upper jins from the ghammaz) 4 → A 4 → ending.
2. Mode: Rast, Bayati, Hijaz or Saba; qarar = place tonic.
3. Cycle: maqsum 4/4, 80–120 BPM (or sama'i thaqil 10/8 for a sama'i).
4. Harmony: none; optional drone [0].
5. Hook: the refrain A (2 bars, repeated to 4), starts on the tonic or ghammaz, ends with a qafla on the qarar.
6. Cadences: A ends on qarar; B ends on the ghammaz (an "open" ending); C ends on qarar via the lower jins.
7. Intro: taqsim. Ending: A one last time, slowing for the final 2 beats, last note qarar held 1 bar, darbuka hits dum on the final note.
data: `focus:{rast:[0,4,2],bayati:[0,3,1],hijaz:[0,3,1],saba:[0,2,3]} fin:0 strong:{maqsum:[0,8],samai_thaqil:{beats:10,dum:[1,6,7]}} land:"qarar" ess:["neutralExact","ghammazRest","qaflaToQarar","iqaDum0","noTriads"]`

### 1.11 `makam` (Turkish classical makam)

**Notes**: Arel–Ezgi–Uzdilek (AEU) system: the octave has 53 equal "Holdrian commas" (≈ 22.64 cents each). Whole tone 9 commas (≈ 204), small half-step (bakiye) 4 commas (≈ 90), larger (küçük mücennep) 5 (≈ 113), büyük mücennep 8 (≈ 181). AEU is the standard theory; real performance differs (e.g. segâh is often sung lower than AEU). Flagged.

| # | Makam | Cents (AEU) | Commas | Karar (finalis) | Güçlü (dominant) | Leading note |
|---|-------|-------------|--------|-----------------|------------------|--------------|
| 1 | Rast | 0, 204, 385, 498, 702, 906, 1087 | 9 8 5 9 9 8 5 | Rast (G in Turkish notation) | Neva (5th, index 4) | Eviç (1087) rises to the octave |
| 2 | Uşşak | 0, 181, 294, 498, 702, 792, 996 | 8 5 9 9 4 9 9 | Dügah (A) | Neva (4th, index 3) | descends to the karar from Segâh |
| 3 | Hicaz | 0, 113, 385, 498, 702, 906, 996 | 5 12 5 9 9 4 9 | Dügah (A) | Neva (4th, index 3) | the augmented 2nd step (113 → 385) is the colour |

**Cycles (usul)**: strokes düm (low) and tek (high).
1. Aksak 9/8 = 2+2+2+3 (eighth-note counts). Strong: 1; düm on 1 and 6 (flag stroke pattern).
2. Aksak semai 10/8 = 3+2+2+3. Strong: 1 and 6. Used for saz semaisi khanas 1–3.
3. Yürük semai 6/8 = 3+3. Used for the 4th hane (section) of a saz semaisi.
4. Düyek 8/8 = 2+1+2+1+2? (flagged; not needed for the recipe).

**Seyir (melodic path)**: Rast "rises" (starts low around the karar, moves up to the güçlü, ends on the karar). Uşşak and Hicaz start around the güçlü and descend (ineci-çıkıcı).
**Forms**: peşrev and **saz semaisi** (4 hane, each followed by the teslim (refrain); hane 4 in a different usul, usually 6/8 or 3/4), şarkı (song: zemin, nakarat (refrain), meyan (contrast), nakarat), taksim (free improvisation).

**ESSENTIAL**: 1. AEU comma intonation for all members (segâh, eviç, and the Uşşak 2nd are not 12-TET notes). 2. Rests on the güçlü mid-phrase and cadence to the karar. 3. The usul, with düm on its strong points. 4. Teslim/nakarat returns. 5. Heterophony, no chords.
**DECORATIVE**: çarpma (grace strokes), glissando (sürme), taksim length, ney breath accents.

**Parts per role**: as Arabic maqam (1.10): heterophony on oud/tanbur/ney/kemençe, kudüm or bendir playing the usul, optional karar drone.

**Minimal song recipe** (saz semaisi shape)
1. Form: taksim 8 bars → hane 1 (4 bars of 10/8) → teslim (4 bars) → hane 2 (4) → teslim → hane 3 (4, the highest register, at the güçlü) → teslim → hane 4 (4 bars of 6/8, faster) → teslim → end.
2. Mode: Rast, Uşşak or Hicaz on the place tonic.
3. Cycle: aksak semai 10/8, 70–100 BPM (eighth = 140–200).
4. Harmony: none; optional karar drone.
5. Hook: the teslim melody (2 bars, played twice), ending on the karar.
6. Cadences: hanes end on the güçlü or a related note (open); every teslim ends on the karar (closed).
7. Ending: the final teslim, slowing over the last bar; karar held.
data: `focus:{rast_tr:[0,4,6],ussak:[0,3,1],hicaz_tr:[0,3,1]} fin:0 strong:{"9/8":{groups:[2,2,2,3],dum:[1,6]},"10/8":{groups:[3,2,2,3],dum:[1,6]}} ess:["aeuIntonation","guccluRest","usulDum","teslimReturns","noChords"]`

### 1.12 `dastgah` (Persian classical music)

**Notes**: Persian theory uses 12-TET positions plus **koron** (lowered about 40–60 cents, written as a half-flat) and **sori** (raised about 40–60). Farhat (1990) measured intervals: small ≈ 90, neutral ≈ 135–160, large ≈ 204, plus large ≈ 270. Game cents (styles.js) use 150 for the neutral steps. Flagged: actual values depend on the performer and the dastgah.
1. Shur (G): 0, 150, 300, 500, 700, 800, 1000. Shahed (focus/"witness" note) ≈ the tonic area; ist (stopping note) on the 4th; finalis G, approached from the koron 2nd (A-koron → G).
2. Segah (on E-koron): 0, 150, 350, 500, 650, 850, 1000. Shahed and finalis = the tonic (E-koron).
3. Chahargah (C): 0, 150, 400, 500, 700, 850, 1100. Shahed C; finalis C.
4. Mahur (C): 0, 200, 400, 500, 700, 900, 1100 (major-like). Shahed C.
5. Homayun (G): 0, 150, 400, 500, 700, 800, 1000. Shahed and finalis around G/the 4th (flagged).
**Cycles**: avaz (free, unmetered, follows poetry), metric pieces in 6/8 (reng, a dance-like finale) and 2/4 or 4/4 (chaharmezrab: fast ostinato with melody on top; tasnif: composed song).
**Forms**: a performance is a path through the **radif** (the traditional repertoire of short melodic models, **gushe**s): **daramad** (opening gushe, establishes the dastgah) → gushes rising in register → **owj** (the climax, highest point) → **forud** (the descent back to the dastgah's finalis). Typical concert order: pishdaramad (metric prelude) → daramad and avaz → chaharmezrab → tasnif → reng.
**ESSENTIAL**: 1. Koron/sori intonation exact and shared. 2. Each gushe's shahed and ist notes stressed. 3. Every gushe ends with the forud back to the dastgah's finalis. 4. No chords. 5. Free rhythm in avaz; when metric, the cycle is exact.
**DECORATIVE**: tahrir (yodel-like vocal ornament), tekiyeh (grace notes), which gushes are visited, length of the avaz.
**Parts**: foundation = optional held finalis (santur's low strings) or none; harmony = none; lead = santur/tar/kamancheh/ney melody; pulse = tombak only in metric parts (chaharmezrab, tasnif, reng); colour = **javab-e avaz** (the instrumental "answer": repeats the voice's last phrase in the gap after it). That answer practice is ESSENTIAL in vocal-led avaz.
**Minimal song recipe**
1. Form: daramad 8 bars free → chaharmezrab 8 bars in 6/8 (ostinato on the finalis + melody on the shahed) → gushe 2 (one step higher focus) 8 bars free → owj 4 bars (highest register) → forud 4 bars (descent) → reng 8 bars in 6/8 → final forud to the finalis.
2. Mode: Shur, Segah, Chahargah, Mahur or Homayun on the place tonic.
3. Cycle: free for avaz parts (the song clock still counts bars at the song tempo so the whole thing stays on the DAW timeline); 6/8 at 100–140 BPM for metric parts.
4. Harmony: none. Hook: the daramad phrase (4–6 notes from the shahed down to the finalis), returning at each forud.
5. Ending: forud to the finalis, held; tombak hits once.
data: `focus:{shur:[0,3,1],segah:[0,2,3],chahargah:[0,4,2],mahur:[0,4,2],homayun:[0,3,1]} fin:0 strong:{"6/8":[0,6]} ess:["koronExact","shahedStress","forudToFinalis","noChords","javab"]`

### 1.13 `gamelan` (Central Javanese gamelan; Balinese parts noted)

**Notes**
1. Two tuning systems, both with no fixed standard: every gamelan set is tuned by its maker, and the two sets in one gamelan share a pitch (tumbuk).
2. **Slendro**: 5 notes, nearly equal steps (~240 cents; measured sets range ~220–270). Game: 0, 231, 474, 717, 955 for notes 1 2 3 5 6 (ji, ro, lu, mo, nem). Label it "one representative set".
3. **Pelog**: 7 notes, uneven steps. Game: 0, 120, 270, 540, 670, 785, 950 for notes 1–7. Label it "one representative set" (flag). Pieces use 5 of the 7: pelog **bem** (1 2 3 5 6; game `pelog_bem`) and pelog **barang** (2 3 5 6 7; note 7 replaces 1).
4. **Pathet** (mode; it decides which notes are the stable goal notes, mainly for gong and kenong): slendro nem (goal notes 2, 5, 6), sanga (5, 1, 2), manyura (6, 2, 3); pelog lima, nem, barang similar (flag: the goal-note lists are simplified).
5. No drone and no chords. The structure (colotomy) and the balungan carry everything.

**Cycles: colotomic forms** (balungan beats; 1 balungan beat = 1 game beat; 4 beats = 1 **gatra** = 1 bar). Gong strokes **end** each cycle (gongan): the gong hits on its LAST beat. Counted from 1:
1. **Lancaran**, 16 beats (4 bars): kethuk on beats 1, 3, 5, … 15; kenong 4, 8, 12, 16; kempul 6, 10, 14; gong 16.
2. **Ketawang**, 16 beats: kethuk 2, 6, 10, 14; kenong 8, 16; kempul 12; gong 16.
3. **Ladrang**, 32 beats (8 bars): kethuk 2, 6, 10, … 30; kenong 8, 16, 24, 32; kempul 12, 20, 28 (no kempul at 4: the "wela", the empty spot after the gong); gong 32.
On the 16-step grid of the last bar of a lancaran, the gong is step 12 (beat 4), NOT step 0 of the first bar (see 3.8, cause 9).
4. **Irama** (density level): the balungan slows by half and the elaborating instruments (bonang, saron peking, gender) play 2×, 4×, 8× as many notes per balungan beat (irama lancar 1:1, tanggung 1:2, dadi 1:4, wiled 1:8). Changes of irama happen at gong or kenong points, with a tempo change.

**Melody and cadence**: **seleh** = the last note of each gatra, its goal tone. The note on the gong = the seleh of the last gatra. Kenong usually plays the seleh of its gatra. The bonang anticipates and decorates the seleh.
**Forms**: **buka** (solo intro by rebab, bonang or kendhang; ends with the first gong) → gongan repeated (the **ompak**) → second section (**ngelik**, higher register) → back to ompak → **suwuk** (ending: the tempo slows over the last gongan and the piece ends on the gong).
**ESSENTIAL**
1. Colotomy: gong on the last beat of every gongan; kenong, kempul, kethuk exactly where the form says.
2. Seleh on beat 4 of every gatra; the gong tone = the last seleh.
3. The tuning (slendro or pelog) is shared by all, and slendro and pelog never sound together.
4. The kendhang (drum) leads tempo and the buka/suwuk.
5. Tempo or irama change only at gong (or kenong) points.
**DECORATIVE**: bonang patterns (mipil, imbal), gender and gambang elaboration, sindhen (solo singer) phrases, choice of irama.
**Balinese (game `kotekan` cells)**: kotekan is two interlocking parts (polos on the beat, sangsih off the beat) that together make one fast line. It is Balinese (gong kebyar), not Javanese. One tradition per planet means choosing one (question 4).

**Parts per role**
1. Foundation: the colotomic gongs (gong, kempul, kenong). Gong = the gongan's final seleh, very low (36–48). Never: hit the gong on beat 1.
2. Harmony: none. The **balungan** (skeleton melody) on saron/slenthem, one note per beat, in 55–72.
3. Lead: bonang/gender elaborating the balungan at the irama ratio, landing on each seleh. Range 60–84.
4. Pulse: kendhang patterns per form; kethuk on its beats.
5. Colour: saron peking doubling or anticipating the balungan (2 or 4 notes per beat); or a Balinese kotekan pair if the planet is Balinese.

**Minimal song recipe** (ladrang or lancaran)
1. Form: buka 1–2 bars (kendhang + bonang, ends on the gong) → gongan A ×2 (ompak) → gongan B ×1 (ngelik, higher) → A ×1 → suwuk (A slowing, last gong).
2. Mode: slendro manyura (or pelog barang); tonic = the gong tone, from the place.
3. Cycle: lancaran 16 beats (4 bars) at 60–90 BPM, or ladrang 32 beats (8 bars) at 50–70.
4. Harmony: none. The balungan per gatra is the "chord per bar".
5. Hook: the balungan of gongan A (16 or 32 notes; generated by a seleh walk: choose the 4 kenong seleh tones first from the pathet's goal notes (last one = gong tone), then fill each gatra by step toward its seleh).
6. Cadences: every gatra ends on its seleh; every gongan ends on the gong tone.
7. Ending: suwuk: tempo × 0.7 over the last gongan, final gong, then silence (the gong rings out).
data: `focus:{slendro:[4,1,2],pelog:[5,1,2],pelog_bem:[4,1,2]} fin:"gongTone" strong:{lancaran:{beats:16,gong:[16],kenong:[4,8,12,16],kempul:[6,10,14]},ladrang:{beats:32,gong:[32],kenong:[8,16,24,32],kempul:[12,20,28]},ketawang:{beats:16,gong:[16],kenong:[8,16],kempul:[12]}} land:"gatraBeat4" ess:["colotomyExact","gongLastBeat","selehBeat4","oneLaras","iramaAtGong"]`
(Focus index 4 in slendro is note 6 for pathet manyura; adjust per pathet.)

### 1.14 `japan` (Japanese traditional: koto, shakuhachi, folk song)

**Notes** (12-TET positions; game scales):
1. In / miyako-bushi: ascending 0, 100, 500, 700, 1000; descending 0, 100, 500, 700, 800 (game uses the descending form 0,1,5,7,8). Sakura Sakura uses it.
2. Yo (folk, min'yō): 0, 200, 500, 700, 900.
3. Hirajoshi (the standard koto tuning): 0, 200, 300, 700, 800.
4. Ryūkyū (Okinawa): 0, 400, 500, 700, 1100.
5. Iwato: 0, 100, 500, 600, 1000.
**Theory (Koizumi)**: melodies are built from "tetrachords": two fixed **nuclear tones** a 4th apart (for example 0 and 500, 700 and 1200) with one moving note between them. Phrases end on a nuclear tone.
**Cycles**: folk songs mostly 2/4 or 4/4; koto danmono in 2/4; shakuhachi honkyoku (solo) is free rhythm, breath-length phrases.
**Form**: **jo-ha-kyū** (slow opening → gradual build → fast, then a slow close) at every scale: piece, section, phrase. **Danmono** ("pieces in steps"): several dan (sections) of equal length (Rokudan: 6 dan of 104 beats each, the first with 4 extra), each faster than the one before.
**ESSENTIAL**: 1. Pentatonic scale exact, nuclear tones as phrase ends. 2. Heterophony (koto and shakuhachi play versions of the same melody), no chords. 3. **Ma**: silences between phrases are part of the music (not filled). 4. Jo-ha-kyū tempo shape.
**DECORATIVE**: shakuhachi meri/kari bends (pitch shading ~ a semitone), koto pressing (oshide) to raise a string's pitch, pulled ornaments, taiko accents in festival style.
**Parts**: foundation = low koto strings plucked on nuclear tones at phrase ends (no drone); harmony = none (or koto's open-fifth/octave dyads on strong beats); lead = shakuhachi or voice, range 60–88; pulse = none (art music) or taiko on beat 1 + kakegoe-like accents (festival); colour = koto arpeggio "sweep" (sararin) into a section start.
**Minimal song recipe**
1. Form: intro (koto alone, 2 bars, a sweep and the tonic) → A 8 bars (slow) → A' 8 bars (same melody, more ornaments) → B 8 bars (faster, higher) → A 4 bars (slow, return) → end.
2. Mode: in-scale on the place tonic (or yo for folk planets).
3. Cycle: 2/4 (or 4/4), 60–80 BPM growing to ~90 (jo-ha-kyū).
4. Harmony: none.
5. Hook: 2 bars, rising to a nuclear tone and falling back, with a held note at its end followed by ≥ 1 beat of silence (ma).
6. Cadences: every 2-bar phrase ends on a nuclear tone; sections end on the tonic.
7. Ending: slow down 20% over the last 2 bars; final tonic + octave on koto; silence.
data: `focus:{in_miyako_bushi:[0,2,3],yo:[0,2,3],hirajoshi:[0,3,2],ryukyu:[0,2,3],iwato:[0,2,4]} fin:0 strong:{"2/4":[0],"4/4":[0,8]} ess:["pentaExact","nuclearEnds","heterophonyNoChords","ma","joHaKyu"]`

### 1.15 `china` (Chinese traditional: folk song, silk-and-bamboo, guqin)

**Notes**: anhemitonic pentatonic (no half steps). The five tones are gong, shang, jue, zhi, yu (do re mi sol la). A **mode** is named by its final tone: gong mode 0,2,4,7,9; shang 0,2,5,7,10; jue 0,3,5,8,10; zhi 0,2,5,7,9; yu 0,3,5,7,10 (game scales). The extra "bian" tones (biangong, the 7th; bianzhi, the #4/4) appear only as passing notes on weak beats.
**Cycles**: 2/4 and 4/4; **banyan** (ban = strong beat, marked by the clapper; yan = weak). Free rhythm in guqin solo and san ban (free openings).
**Forms**: **qi–cheng–zhuan–he** (four phrases: start, continue, turn (contrast), close). **Yu yao wei** ("fish biting its tail"): the next phrase starts on the note the last one ended on. Silk-and-bamboo (Jiangnan sizhu) builds a piece by playing a short tune slow and ornamented, then progressively faster and plainer.
**ESSENTIAL**: 1. Pentatonic exact; bian tones only weak and passing. 2. Phrases end on the mode's final or its 5th; the song ends on the final. 3. Heterophony (erhu, dizi, pipa, yangqin play versions of one melody), no chords. 4. Four-phrase (or two-phrase) structure.
**DECORATIVE**: slides (erhu), tremolo (pipa), grace notes (dizi), ornamental density, tempo stages.
**Parts**: foundation = low instrument (zhongruan/cello-like) on phrase-final notes and strong beats, or none; harmony = none (a 5th or octave dyad allowed on the final note); lead = dizi/erhu tune, range 60–88; pulse = ban clapper on strong beats, small drum and gong in festive pieces; colour = yangqin/pipa elaborating the same tune at 2× density.
**Minimal song recipe**
1. Form: intro 2 bars (the last phrase, slower) → verse = 4 phrases of 2 bars each (qi, cheng, zhuan, he) → repeat the verse with more ornaments → faster verse (tempo × 1.3) → coda 2 bars.
2. Mode: gong or yu mode on the place tonic.
3. Cycle: 2/4, 60–90 BPM (growing).
4. Harmony: none.
5. Hook: phrase qi (2 bars); cheng repeats its rhythm with a different end; zhuan contrasts (higher register); he = qi's ending landing on the final. Chain with yu yao wei.
6. Cadences: qi ends on the 5th (open), cheng on the 2nd or 5th, zhuan anywhere, he on the final (closed).
7. Ending: slow the last phrase; final tone held; small gong once (festive style).
data: `focus:{gong:[0,3,2],shang:[0,3,1],jue:[0,2,3],zhi:[0,3,1],yu:[0,3,2]} fin:0 strong:{"2/4":[0],"4/4":[0,8]} ess:["pentaExact","bianPassing","finalEnd","heterophonyNoChords","fourPhrase"]`

### 1.16 `wafrica` (West African drumming: Ewe and Akan styles of Ghana, Togo)

**Notes**: songs are mostly pentatonic or hexatonic (game: major pentatonic, hexatonic, major). 12-TET is acceptable as the frame. Choral parts: unison/octaves, or parallel 3rds (Akan) or 4ths (flag).
**Cycles**: 12/8 on 12 eighths (24 steps in the game). **Standard bell (gankogui)**, 7 strokes: eighths 1, 3, 5, 6, 8, 10, 12 (24-grid steps 0, 4, 8, 10, 14, 18, 22). The dancers' 4 main beats ("feet") are eighths 1, 4, 7, 10 (24-grid 0, 6, 12, 18). Rattle (axatse) plays on the feet beats and fills.
**Drums**: support drums (kaganu, kidi, sogo) repeat short patterns that sit in fixed places against the bell; the kagan plays the 2nd and 3rd eighth of each beat (flag); the **master drum** (atsimevu or sogo) improvises and gives **calls** that the support drums answer and that change the dance.
**Form**: song section (cantor's call, chorus answer, over the bell) → drumming section (master drum leads a series of "variations", each started by a call and ended by a cut-off call) → back to the songs. No harmonic progression.
**ESSENTIAL**: 1. The bell pattern exact and never changing. 2. Every other part fixed relative to the bell (same phase every cycle). 3. Call-and-response: the response comes in the same place in the cycle every time. 4. The master drum's cut-off call ends a section on the bell's stroke 1.
**DECORATIVE**: master drum variations, number of responses, chorus harmonies, rattle fills.
**Parts**
1. Foundation: the low drum (sogo/atsimevu low tones) on the feet beats, or bass tones on beats 1 and 7. Never: move against the bell.
2. Harmony: chorus voices in parallel (3rds or 4ths) during responses only.
3. Lead: the cantor's call (2–4 beats), pentatonic, range 60–84; the chorus answer repeats the same phrase or completes it.
4. Pulse: bell (exact), rattle, support drums (exact), master drum (free, but starts and ends calls on bell stroke 1).
5. Colour: master-drum calls and flourishes.
**Minimal song recipe**
1. Form: bell alone 1 cycle → bell + rattle + support drums 2 cycles → song: call (1 cycle) / response (1 cycle) ×4 → master drum section 8 cycles (2 variations of 4) → song again ×2 → cut-off call → final stroke on bell stroke 1.
2. Mode: major pentatonic on the place tonic.
3. Cycle: 12/8 standard bell, 100–140 dotted-quarter BPM.
4. Harmony: none (implied tonic).
5. Hook: the response phrase (1 cycle), same every time.
6. Cadences: responses end on the tonic or the 5th on the 4th foot beat (24-grid step 18) or on stroke 1.
7. Ending: the master drum's cut-off call, everyone hits stroke 1 together, silence.
data: `focus:[0,4,2] fin:0 grid:24 strong:{"12/8":{bell:[0,4,8,10,14,18,22],feet:[0,6,12,18]}} ess:["bellExact","phaseLocked","responseFixed","cutoffOnOne"]`

### 1.17 `cuban` (= PATTERN_LIBRARY `son`; Cuban son)

**Notes**: 12-TET major or minor, functional harmony (I, IV, V7; ii–V–I).
**Cycles**: 2 bars of 4/4 (32 steps). **Son clave 3-2**: steps 0, 6, 12 | 20, 24. **2-3**: 4, 8 | 16, 22, 28.
**Clave direction (ESSENTIAL)**: once set, every part (melody phrasing, montuno, bass) follows it for the whole song; a section boundary may "switch" only by an odd-length bar that the recipe states. Never "cross" the clave.
**Parts and cells**
1. Foundation (**tumbao**): notes on step 6 (the "and" of 2) and step 12 (beat 4), with **no attack on beat 1**; the note on beat 4 is the NEXT chord's root (anticipation), tied over the bar line. Never: play beat 1 (that is the most common mistake).
2. Harmony (**montuno/guajeo** on piano or tres): a 2-bar syncopated 8th-note pattern of chord tones that fits the clave; changes chord on the anticipations (step 14 or 6).
3. Lead: verse melody phrased with the clave (phrases start on the 3-side for 3-2); in the montuno, the improvised **pregón** (lead call) alternates with the **coro** (chorus).
4. Pulse: clave (exact); bongó martillo (8ths, open tone on step 12) during the verse; **campana** (bongo bell) on quarter notes during the montuno; maracas 8ths; congas tumbao (open tones on steps 12 and 14).
5. Colour: trumpet/horn riffs (mambo) between coros.
**Form**: intro (guajeo + clave, 4 bars) → **largo/canto** (verse, 16 bars) → **montuno** (coro 4 bars ↔ pregón 4 bars, repeated 4–8 times) → **mambo** (horn riffs, 8–16 bars) → montuno (coro) → **cierre/coda** (a break: the band plays a short figure aligned to clave, ending on the 3-side's last stroke or beat 1).
**ESSENTIAL**: 1. Clave exact and direction constant. 2. Tumbao anticipation (no beat 1). 3. Montuno pattern aligned to clave. 4. Coro returns unchanged.
**DECORATIVE**: pregón improvisation, bongó fills, horn mambos, ii–V substitutions.
**Minimal song recipe**
1. Form: intro 4 bars → canto 16 (`I | I | V7 | V7 | V7 | V7 | I | I` ×2) → montuno 32 (coro 4 / pregón 4 ×4, vamp `I IV | V7 IV` per 2 bars) → mambo 8 → montuno coro 8 → cierre 2.
2. Mode: major on the place tonic.
3. Cycle: son clave 3-2, 90–120 BPM.
4. Hook: the coro (2 bars, sung twice per 4) over the vamp; its last note lands on step 12 of the 3-side or beat 1.
5. Cadences: canto phrases end V7 → I on the 2-side's bar line.
6. Ending: cierre break, then one final hit on beat 1 (tonic, all instruments).
data: `focus:[0,4,2] fin:0 grid:16 cycleBars:2 strong:{"son3-2":[0,6,12,20,24],"son2-3":[4,8,16,22,28]} ess:["claveExact","claveDirection","tumbaoNoOne","montunoClave","coroFixed"]`

### 1.18 `rumba` (Cuban rumba: guaguancó, yambú, columbia)

**Notes**: voices and drums; melody mostly major (12-TET), implying I and V7; chorus in 3rds.
**Cycles**: **rumba clave 3-2**: steps 0, 6, 14 | 20, 24 (the third stroke is one step later than son clave). Columbia is in 12/8 with the 12/8 bell.
**Drums**: three congas: salidor (low), tres-dos/segundo (middle), quinto (high, improvised lead). The low and middle drums interlock in a fixed "conversation" each clave cycle (flag: the exact strokes per style need a fresh traditional source). Palitos/guagua (sticks on wood) play a fixed timeline.
**Form**: **diana** (lead singer's opening on vocables like "la-la-le-lo") → **canto/decima** (story verse) → **montuno** (coro ↔ lead calls; dancing starts; quinto improvises against the dancers).
**ESSENTIAL**: 1. Rumba clave exact, direction constant. 2. Low/middle drum conversation fixed against clave. 3. Coro repeats unchanged in the montuno. 4. Quinto improvises but starts and ends phrases on clave strokes.
**DECORATIVE**: quinto phrases, diana vocables, decima length.
**Parts**: foundation = low conga open tones (fixed); harmony = chorus in parallel 3rds during the coro; lead = singer (diana/canto/calls), range 55–79; pulse = clave, palitos, segundo; colour = quinto.
**Minimal song recipe**: diana 4 bars (voice + clave) → drums enter 2 bars → canto 16 bars (implied `I | I | V7 | V7 | V7 | V7 | I | I` ×2) → montuno 32 bars (coro 2 / call 2) → ending: coro once more, quinto flourish, final hit on clave stroke 1. Tempo guaguancó 95–115, yambú 70–85, columbia 6/8 at ~120 (dotted quarter). Hook = the coro, 2 bars.
data: `focus:[0,4,2] fin:0 grid:16 cycleBars:2 strong:{"rumba3-2":[0,6,14,20,24]} ess:["claveExact","claveDirection","drumConversation","coroFixed"]`

### 1.19 `samba` (Brazilian samba: samba de roda, batucada, samba-enredo)

**Notes**: 12-TET, major and minor; functional harmony with many secondary dominants: `I | VI7 | ii | V7`, `I | I7 | IV | iv`. The 7-string guitar plays bass runs (baixaria) linking the chords.
**Cycles**: written in 2/4. In the game a 16-step 4/4 bar = two 2/4 bars. Strong low drum on **beat 2 of each 2/4 bar** (steps 4 and 12): the surdo de primeira (lowest drum) is the strong one; the surdo de segunda answers on beat 1 (steps 0, 8). Pandeiro and shaker play every 16th, with the accent on the LAST 16th of each beat (steps 3, 7, 11, 15). Tamborim plays the syncopated "teleco-teco" or partido-alto line (PATTERN_LIBRARY partido-alto `.x..x.x.x.x..x.x`).
**Form**: **refrão** (chorus, sung by everyone, often 8 bars) alternating with **versos** (verses, solo, 16 bars); the bateria (drum section) can drop out for a **breque** (break) and come back together.
**ESSENTIAL**: 1. Surdo low on steps 4 and 12 (beat 2 of each 2/4). 2. 16th-note feel with the 4th-16th accent, shared. 3. Melody syncopated (anticipates beats). 4. Refrão returns unchanged.
**DECORATIVE**: tamborim variations, cuíca (friction drum) squeaks, baixaria runs, repinique calls, the "swing" of the 16ths (a slight push, as a shared feel).
**Parts**: foundation = surdos (+ 7-string bass runs at phrase ends); harmony = cavaquinho chords on the partido-alto rhythm; lead = melody, range 60–84; pulse = surdos, caixa (snare 16ths), pandeiro, tamborim, ganzá; colour = cuíca, repinique calls.
**Minimal song recipe**: intro 2 bars (repinique call, everyone enters on beat 1) → refrão 8 bars `I | VI7 | ii | V7` ×2 → verso 16 bars `I | I7 | IV | iv | I | VI7 | ii | V7` ×2 → refrão 8 → verso 16 → refrão 8 ×2 → breque (1 bar silence after a unison hit) → refrão 8 → final unison hit on beat 1. 90–140 BPM (quarter notes). Hook = the refrão's first 2 bars, starting on an anticipation (step 15 of the bar before).
data: `focus:[0,4,2] fin:0 grid:16 strong:{"2/4x2":{surdo1:[4,12],surdo2:[0,8],pandeiroAccent:[3,7,11,15]}} ess:["surdoBeat2","sixteenthAccent4","syncopatedMelody","refraoFixed"]`

### 1.20 `bossa` (bossa nova)

**Notes**: 12-TET. 7th and 9th chords throughout (maj7, m7, 7, m7b5, 7b9), ii–V–I, chromatic bass and inner-voice motion. Soft dynamics.
**Cycles**: 4/4 at 110–145 BPM (often felt in 2). Bass: root on beat 1 and the 5th on beat 3, each preceded by an 8th pickup (steps 0, 6, 8, 14: `x.....x.x.....x.` — root, then the 5th's lead-in at 6, 5th at 8, root's lead-in at 14). The guitar's chord pattern ("bossa clave") on steps 0, 3, 6, 10, 13 (`x..x..x...x..x..`), 2-bar versions vary (flag).
**Form**: AABA or ABAC, 32 bars; intro 4–8 bars; ending: the last 2–4 bars repeated as a vamp, fading, or a final maj7 on beat 1.
**ESSENTIAL**: 1. 7th chords voice-led by step (guide tones as jazz). 2. Bass root/5th on 1 and 3. 3. The syncopated guitar pattern shared by guitar and rim. 4. Quiet dynamics: no loud accents.
**DECORATIVE**: 9ths and 13ths, chromatic passing chords, brush patterns, flute obbligato.
**Parts**: foundation = bass as above (or the guitar's thumb); harmony = guitar chords (4 notes, 52–70) on the pattern; lead = melody with long notes and stepwise lines, 60–84; pulse = brushes 16ths on snare, rim click on the guitar pattern, kick on 1 and 3; colour = flute/piano answers in the melody's long notes.
**Minimal song recipe**: intro 4 bars (`ii7 | V7 | Imaj7 | V7`) → A 8 (`Imaj7 | vi7 | ii7 | V7 | iii7 | VI7 | ii7 | V7`) → A 8 (last 2 bars `ii7 V7 | Imaj7`) → B 8 (`IVmaj7 | iv7 | iii7 | VI7 | ii7 | V7 | ii7 | V7`) → A 8 → coda: `ii7 | V7 | Imaj7 |` ×3, final Imaj9. Hook: 2 bars (long notes, a step-wise turn), at A bar 1 every time. Generated progressions only (all classic bossa songs are under copyright; chord loops themselves are not).
data: `focus:[0,4,2,6] fin:0 grid:16 strong:{"4/4":[0,8]} bossaComp:[0,3,6,10,13] ess:["7thVoiceLed","bassRoot5on13","bossaPatternShared","soft"]`

### 1.21 `celtic` (Irish and Scottish dance music)

**Notes**: 12-TET (the pipes' tuning differs; flagged). Modes: Ionian (major), Dorian, Mixolydian, Aeolian. Common keys: D, G, A, E Dorian, B minor. Drones (pipes) on the tonic and 5th.
**Tune types (cycles)**:
1. Jig 6/8: two groups of three 8ths; accent on 1 and 4. Dotted-quarter = 110–125.
2. Reel 4/4 (cut time): 8th notes, accents on 1 and 3, a slight lilt. Half note = 100–115.
3. Slip jig 9/8 = 3+3+3. Hornpipe 4/4 with dotted ("swung") 8ths. Polka 2/4.
**Form**: **AABB**: part A (8 bars) played twice, part B (8 bars, usually higher) played twice = 32 bars, the whole tune 3 times. Then a "set" moves on to another tune of the same type. The last bar of each part is a **turn** back to the start. Phrases are 2 + 2 + 4 bars, ending on the tonic (end of each part) or the 5th (middle).
**ESSENTIAL**: 1. The tune type's meter and lilt (jig 3+3, reel 8ths), shared. 2. AABB with 8-bar parts. 3. Melody in unison/heterophony; accompaniment never changes the tune. 4. Each part ends on the tonic (2nd ending) and the tune ends on the tonic.
**DECORATIVE**: cuts (a very short higher grace note), taps, rolls (a 5-note turn around one note), crans, slides; chord choices; bodhrán variations.
**Parts**: foundation = drone (tonic+5th) or bass on the chord root on beats 1 (and 4 in jigs / 3 in reels); harmony = guitar/bouzouki chords, ≤ 2 per bar (I, IV, V, and bVII in modal tunes; Dorian uses i and bVII), DADGAD-style open voicings; lead = fiddle/flute/whistle tune, range 62–86 (D4–D6); pulse = bodhrán: jig `x.xx.x` per half-bar style (8ths, accents 1 and 4), reel 8ths with accents 1, 3 and backbeat lilt; colour = second melody instrument in heterophony (same tune, different ornaments).
**Minimal song recipe**
1. Form: intro (the last 2 bars of B, or 2 "taps" bars) → AABB ×3 → ending (final note of B held, all hit beat 1 of a new bar on the tonic).
2. Mode: D major (Ionian), or E Dorian, on the place tonic.
3. Cycle: jig 6/8 at 115 (dotted quarter) or reel 4/4.
4. Harmony per bar, A: `I | I | IV | V | I | I | IV V | I`; B: `I | IV | I | V | I | IV | V | I` (Dorian: `i | i | bVII | bVII | i | i | bVII | i`).
5. Hook: bar 1 of A (one 6/8 bar = 6 notes), repeated at bar 5; bar 4 ends on the 5th; bar 8 on the tonic. B starts an octave or 5th higher.
6. Ending: last time through, the final B ends on a long tonic; a second set tune is optional.
data: `focus:[0,4,2] fin:0 strong:{"6/8":[0,6],"4/4":[0,8],"9/8":[0,6,12]} ess:["tuneTypeLilt","AABB8","unisonTune","endTonic"]`

### 1.22 `flamenco`

**Notes**: 12-TET frame. The "flamenco mode" = Phrygian with a MAJOR tonic chord (on E: E F G(#) A B C D; the melody uses both G and G#). Game scales: phrygian_dom (0,100,400,500,700,800,1000) and phrygian.
**Cadence (ESSENTIAL)**: the **Andalusian cadence** descends `iv – III – II – I` (on E: Am – G – F – E). The final chord is the major I (E). "Por arriba" = the E position; "por medio" = A Phrygian (Dm – C – Bb – A).
**Compás (cycle; 12 counts)**
1. **Soleá / bulerías**: 12 counts, accents on 3, 6, 8, 10, 12. On a 12-step grid (count 1 = step 0): steps 2, 5, 7, 9, 11. A phrase **resolves on count 10** (the I chord lands there); 11 and 12 lead into the next compás. Bulerías are often counted starting from 12. Count 1 is NOT accented (see 3.8, cause 10).
2. **Seguiriya**: 12 counts grouped 2+2+3+3+2 (accents 1, 3, 5, 8, 11), felt as 5 uneven beats.
3. **Tangos / tientos**: 4/4. **Fandangos / sevillanas**: 3/4 groups (sevillanas = folk; 4 coplas).
**Form**: guitar intro (compás + falseta) → **salida** (singer's wordless opening "ay") → **letra** (verse; each line is 1–2 compases; ends with a **remate**, a closing cadence on count 10) → falseta (guitar melodic interlude) → letra 2 → … → **cierre** (final remate on count 10 with the I chord, everyone stops together).
**ESSENTIAL**: 1. The compás accent pattern, shared and exact. 2. Phrases resolve on count 10. 3. Phrygian with the major I; Andalusian cadence into the I at the end of letras. 4. Palmas (claps) on the accents (or the contratiempo, off-beat claps, as a fixed pattern).
**DECORATIVE**: rasgueado (strummed fan), picado (fast single notes), alzapúa (thumb technique), cante melismas (narrow-range, ornamented), cajón fills, llamada (a call figure ending on 10 that signals a change).
**Parts**: foundation = the guitar's bass (thumb) on chord roots at accented counts; harmony = guitar chords changing only on accented counts (Am on 12/1–2, G/F on 3–6 area, E on 8–10, flag: exact chord placement varies by palo); lead = cante (voice) in a narrow range (≤ a 6th, 57–72), ornamented, phrase ends on count 10; pulse = palmas on accents + cajón; colour = guitar falsetas between letras.
**Minimal song recipe** (soleá)
1. Form: intro 2 compases (rasgueado on the accents, Andalusian cadence) → falseta 2 compases → salida 1 → letra 1: 4 compases → remate 1 → falseta 2 → letra 2: 4 → remate 1 → cierre 1.
2. Mode: Phrygian with major I on the place tonic ("por arriba").
3. Cycle: soleá compás, 120–170 counts per minute (bulerías 200–260).
4. Harmony per compás: counts 12–2 `iv` (Am), 3–5 `III` (G), 6–7 `II` (F), 8–10 `I` (E); letra lines use the same; remate = `II → I` on 10.
5. Hook: a 1-compás vocal/guitar figure that ends on count 10 on the tonic; repeated at the start of each letra.
6. Ending: cierre: everyone hits the I on count 10, then silence.
data: `focus:[0,4,1] fin:0 grid:12 strong:{"compas":[2,5,7,9,11],"seguiriya":[0,2,4,7,10]} land:"count10" harm:{prog:["iv","III","II","I"]} ess:["compasExact","resolve10","phrygianMajorI","andalusianCadence","palmasOnAccents"]`

### 1.23 `aksak` (Balkan "limping" meters: Bulgaria, Macedonia, Serbia)

**Notes**: 12-TET frame. Game scales: Hijaz-like (0,100,400,500,700,800,1000), Ukrainian Dorian (0,200,300,600,700,900,1000), Aeolian, major. Bagpipe (gaida) style has a constant **drone** on the tonic.
**Cycles** (8th-note groups; long group = 3):
1. Rachenitsa 7/8 = 2+2+3. Lesnoto 7/8 = 3+2+2 (game `7/8b`).
2. Daychovo 9/8 = 2+2+2+3.
3. Kopanitsa / gankino 11/8 = 2+2+3+2+2.
Strong points: the first 8th of each group; the long (3) group is the "limp" and the dance's distinctive step.
**Form**: a horo (line-dance tune) is short phrases (2–4 bars) each played twice: A A B B (C C), repeated with variations, often accelerating toward the end.
**ESSENTIAL**: 1. The group pattern exact and unchanging within a tune (a 2+2+3 tune never becomes 3+2+2). 2. Drum (tapan) bass strokes on group starts, with the long group placed right. 3. Melody notes on group starts at phrase starts and ends. 4. Tonic drone (bagpipe style) or tonic-centred harmony.
**DECORATIVE**: fast ornaments (trills, mordents), gadulka/kaval/clarinet runs, accordion chords in wedding-band style, acceleration amount.
**Parts**: foundation = drone on the tonic (gaida) or bass on group starts (tonic, 5th); harmony = none (drone) or i–bVII (minor) / I–bII (Hijaz) changing only at bar lines; lead = kaval/gaida/clarinet, 8th-note runs, 62–88; pulse = tapan: bass mallet on each group's first 8th, thin stick on the other 8ths; colour = second melody in heterophony or answering runs.
**Minimal song recipe**: intro (drone + tapan 2 bars) → A 4 bars ×2 → B 4 bars ×2 → A ×2 → B ×2 (tempo +5%) → ending (A's last bar, then a held tonic on the next group start, tapan hit). Rachenitsa 7/8 at 100–140 (counted per bar, i.e. eighth = 300–400 per minute; game's bpm 100–200 = 8th-group pulses, flag the unit). Hook: A's first bar (7 8ths), repeated; phrases end on the tonic at the start of the long group of the last bar (flag: common, not universal).
data: `focus:[0,4,3] fin:0 strong:{"7/8":{groups:[2,2,3]},"7/8b":{groups:[3,2,2]},"9/8":{groups:[2,2,2,3]},"11/8":{groups:[2,2,3,2,2]}} harm:{drone:[0]} ess:["groupsExact","tapanOnGroups","phraseOnGroupStart","tonicDrone"]`

### 1.24 `andean` (Andean: huayno, sikuri)

**Notes**: 12-TET frame. Minor pentatonic (0,300,500,700,1000) and its relative major pentatonic. Melodies move between the minor tonic and the relative major (III) — a "bimodal" feel. Panpipes (siku) and quena are not tempered (flag).
**Cycles**: **huayno** in 2/4: each beat often long–short–short (8th + two 16ths) in the bass and charango (steps 0, 2, 3 of each beat on a 4-step beat). Bombo drum on beat 1 and the "and" of 2. Sikuri (panpipe bands) in duple time.
**Siku hocket (ESSENTIAL when panpipes lead)**: the scale is split between two players (ira and arka) who alternate notes so that together they make one melody.
**Form**: A (4 bars) ×2, B (4 bars) ×2, repeated; ends with a **fuga** (faster coda on related material) and a final cadence with a repeated tonic.
**ESSENTIAL**: 1. Pentatonic exact. 2. Huayno rhythm (long–short–short) shared by bass and charango. 3. Phrase ends: the A phrase ends on the minor tonic, the B phrase often on III then the tonic. 4. Parallel 4ths/5ths/octaves in wind ensembles (not 3rds).
**DECORATIVE**: quena ornaments (grace notes, breathy attacks), charango tremolo, fuga tempo, bombo variations.
**Parts**: foundation = guitar/bombo bass on beats 1 and 2, tonic or III; harmony = charango strum `i | III | VII | i`; lead = quena/siku, 64–88; pulse = bombo + charango strum; colour = second quena in parallel 4ths or octaves.
**Minimal song recipe**: intro 2 bars (charango strum) → A 4 ×2 (`i | i | III | i`) → B 4 ×2 (`III | VII | III | i`) → A ×2 → fuga: B at tempo ×1.2, ×2 → ending: tonic repeated 3 times on beats, all stop. 2/4 at 90–120. Hook: A's first 2 bars (long–short–short rhythm on a falling pentatonic line).
data: `focus:[0,2,1] fin:0 strong:{"2/4":[0],"4/4":[0,8]} cell:{huayno:"x.xxx.xx"} ess:["pentaExact","huaynoRhythm","phraseEndsTonic","parallel45","sikuHocket"]`

### 1.25 `overtone` (Tuvan / Mongolian throat singing)

**Notes**: **just intonation from the harmonic series** of one fixed drone fundamental. The melody uses harmonics 6–13; cents relative to harmonic 8: H6 −498, H7 −231, H8 0, H9 204, H10 386, H11 551, H12 702, H13 841. The game set (0, 204, 386, 702) = H8, H9, H10, H12. Common melodic set: H6, H8, H9, H10, H12 (and H13 in sygyt).
**Cycles**: free (drone songs) or a 6/8-like **gallop** (long–short–short; game `6/8`) played on the doshpuluur (lute) or igil (fiddle).
**Form**: strophic: instrumental gallop intro → verse (sung, here hummed; the game is text-free) → overtone melody verse (same tune in harmonics) → interlude → repeat → ending on the fundamental, fading.
**ESSENTIAL**: 1. ONE fixed fundamental for the whole song; never a chord change, never a key change. 2. Melody notes are exact harmonics of that fundamental (no 12-TET). 3. The drone is continuous under the melody. 4. Gallop rhythm (if metered) shared.
**DECORATIVE**: style choice (khoomei = mid harmonics, sygyt = whistle-high, kargyraa = deep "undertone" an octave below), nature-sound imitation, vowel shaping.
**Parts**: foundation = the drone fundamental (40–55 for kargyraa, 48–60 khoomei); harmony = none; lead = overtone melody (H6–H13 above the drone, 72–96); pulse = gallop on the lute or drum (steps 0, 4, 6 of a 12-step 6/8 bar — flag); colour = igil drone-fiddle doubling the fundamental and 5th (H3).
**Minimal song recipe**: intro 4 bars (gallop + drone) → verse 8 bars (hummed tune on H6–H10) → overtone verse 8 bars (same tune, H8–H12) → interlude 4 → overtone verse 8 → ending: melody falls to H8, the drone holds 2 bars, fade. Tempo 6/8 at 80–110 (dotted quarter). Hook: verse bar 1–2 (harmonics 8–9–10–9–8 shape).
data: `focus:[0,3,2] fin:0 tuning:{harmonics:[6,7,8,9,10,11,12,13]} harm:{drone:[0]} strong:{"6/8":[0,6]} ess:["oneFundamental","harmonicOnly","droneContinuous","gallopShared"]`

### 1.26 `reggae` and `dub` (`dub` is a variant of `reggae`)

**Notes**: 12-TET; minor or major; 2- or 4-chord loops (`i | iv`, `I | IV`, `i | bVII`).
**Cycles**: 4/4 at 60–90 BPM (counted in quarters). **One drop**: kick and rim/snare together on **beat 3 (step 8)**, nothing on beat 1. Hi-hat 8ths (sometimes swung). **Skank**: guitar/piano short chord on **beats 2 and 4 (steps 4, 12)**; organ **bubble** on the 8th-note offbeats. (Flag: PATTERN_LIBRARY's skank cell `..x...x...x...x.` is on the 8th offbeats, which is a ska/rocksteady upstroke or the organ bubble; for roots one-drop, put the skank on steps 4 and 12. See section 4.)
**Form**: intro (riddim = drum + bass pattern) 4–8 bars → verse 16 → chorus 8 → verse → chorus → (dub section) → outro. **Dub**: the same riddim, with parts muted in and out at 4-bar boundaries, echo delays on the skank and snare (delay time on the grid: a dotted 8th = 3 steps, or 1/4 = 4 steps), and the bass and drums in front.
**ESSENTIAL**: 1. Beat 1 empty in the drums; the drop on beat 3. 2. Skank on 2 and 4, short. 3. Repeating bass riff (1–2 bars) as the identity of the riddim; bass is the lead-level part. 4. Loop constant within a section.
**DECORATIVE**: steppers kick (4-on-the-floor variant), rockers, organ bubble, horn lines, dub echoes and mutes, melodica.
**Parts**: foundation = bass riff, deep (28–48), with rests (leaving space for the drop), often avoids beat 1; harmony = skank (2 and 4) + bubble; lead = melody with long notes, call-and-response with horns, 60–84; pulse = one drop; colour = horns/melodica answers; in dub, echoes of the skank/snare.
**Minimal song recipe**: intro 4 bars (drums + bass) → verse 16 (`i | iv` loop ×8) → chorus 8 (`bVI | bVII | i | i` ×2) → verse 16 → chorus 8 → dub 8 (bass + drums only, echo on the skank) → chorus 8 → outro 4 (fade). 72 BPM. Hook: the bass riff (2 bars) — the true hook of a riddim; the chorus melody (2 bars) is the second hook.
dub variant: same recipe with sections defined by mutes (every 4 bars toggle 1–2 parts), echo throws at section ends, lead mostly absent.
data: `focus:[0,4,2] fin:0 grid:16 strong:{"4/4":{drop:[8],skank:[4,12]}} ess:["emptyOne","dropOn3","skank24","bassRiffIdentity","loopConstant"]`

### 1.27 `techno` and `house` (`house` is a variant of `techno`)

**Notes**: 12-TET; minor, Phrygian or Dorian; one chord or a 2-chord stab loop; techno often atonal noise + one bass note.
**Cycles**: 4/4. Kick on every beat (steps 0, 4, 8, 12); open hat on the offbeats (2, 6, 10, 14); clap/snare on 4 and 12 (optional in techno). Techno 125–140 BPM; house 118–128.
**Form (DJ phrasing)**: everything changes only at 8-, 16- or 32-bar boundaries. Intro 32 bars (drums only, DJ-friendly) → build 16–32 (add bass, stabs) → main 64 → **breakdown** 16–32 (kick out, pad/filter) → **drop** (kick back on beat 1 of a 16-bar phrase) 64 → outro 32 (strip back to drums).
**ESSENTIAL**: 1. Four-on-the-floor kick, exact. 2. Changes only at 8/16/32-bar boundaries. 3. Loops constant within a phrase. 4. The drop lands on beat 1 of a phrase.
**DECORATIVE**: acid bassline (16-step pattern with accents and slides), filter sweeps, percussion layers, risers before drops.
**house**: piano/organ stabs with 7th/9th chords on a 2- or 4-chord loop (`i7 | iv7`, `ii7 | V7sus`), a syncopated bass (16th offbeats, octaves), a wordless vocal hook.
**Parts**: foundation = kick + bass (techno: offbeat 8ths `..x...x...x...x.` or rolling 16ths; house: syncopated with octaves); harmony = stab loop (1–2 bars); lead = a short repeated riff or wordless vocal, 1–2 bars; pulse = kick, hats, clap; colour = risers, percussion fills at 16-bar boundaries.
**Minimal song recipe**: intro 16 (kick + hats) → build 16 (+ bass, + clap) → main 32 (+ stab/riff hook) → breakdown 16 (no kick; stab/pad only; a riser in the last 4 bars) → drop 32 (everything) → outro 16 (remove parts every 4 bars). 128 BPM. Hook: the 1-bar riff/stab loop, introduced at "main" bar 1 and kept.
data: `focus:[0,4,2] fin:0 grid:16 strong:{"4/4":{kick:[0,4,8,12]}} phrase:[8,16,32] ess:["fourFloor","changeAtPhrase","loopConstant","dropOnPhrase1"]`

### 1.28 `dnb` (drum and bass; PATTERN_LIBRARY id)

**Notes**: 12-TET, minor (Aeolian/Dorian), 1–2 chord pads (m9).
**Cycle**: 4/4 at 160–180 BPM. Two-step beat: kick on steps 0 and 10, snare on 4 and 12 (hard), ghost snares and shuffled hats. Sub-bass moves in half-time (one note per 2 beats or longer).
**Form**: intro 32 (drums or pad) → drop 1 (64) → breakdown 32 → drop 2 (64) → outro 32; changes at 16/32-bar boundaries.
**ESSENTIAL**: two-step kick/snare placement; snare on 4 and 12; sections in 16/32 bars; the bass hits on the kick hits.
**DECORATIVE**: break chops (Amen-style breaks are copyrighted recordings; generate drums, do not sample), reese bass, pad swells.
**Minimal song recipe**: intro 16 → drop 32 (`i | i | bVI | bVII` sub-bass, 2 bars per chord) → breakdown 16 (pad only) → drop 32 → outro 16. 172 BPM. Hook: a 2-bar bass phrase.
data: `focus:[0,4,2] fin:0 strong:{"4/4":{kick:[0,10],snare:[4,12]}} ess:["twoStep","snare24","sections16"]`

### 1.29 `minimal` (minimalist process music, Reich/Riley style; PATTERN_LIBRARY id)

**Notes**: 12-TET diatonic, one mode, one harmonic area per long section; pulse in 8ths.
**Cycle**: a repeating **cell** of 6–12 notes (one bar), repeated exactly.
**Process (the form IS the process)**: 1. Additive: add one note to the cell every N repeats. 2. Phasing: a second copy of the cell shifts by one step every N bars until it is back in phase. 3. Layering: parts enter one at a time every 4 or 8 bars.
**ESSENTIAL**: steady pulse; exact repetition; changes only by the stated rule at fixed counts; one mode.
**DECORATIVE**: dynamics swells, register and timbre changes, how long each stage lasts.
**Minimal song recipe**: pulse 2 bars (8ths on the tonic) → cell A ×8 → second voice enters (same cell) ×4 → second voice phases one step every 4 bars until back in phase (one full lap = 12 shifts for a 12-step cell = 48 bars) → harmony area changes (tonic → vi) at the lap's end ×8 → fade out one part every 4 bars. 120–160 BPM. Hook = the cell. (No quoting of Reich or Riley pieces; the technique is free, the pieces are not.)
data: `focus:[0,4,2] fin:0 grid:16 ess:["steadyPulse","exactRepeat","ruleChangesOnly","oneMode"]`

### 1.30 Variants and aliases

1. `dub` = reggae recipe with mutes/echo (1.26). `house` = techno recipe with stabs (1.27).
2. `son` (PATTERN_LIBRARY) = game `cuban` (1.17).
3. `classical`, `modal`, `rockpop`, `dnb`, `minimal` exist in PATTERN_LIBRARY only. They are written here so any planet can take them, but they are not in the game's style list (St.D) yet.

---

## 2. Dev song library (dual use) and fixture format

### 2.1 What it is for

1. **(a) Reference parts**: per role, short parts the ohms can learn or quote (a hook, a bass line, a cycle pattern). A planet's ohms "know" a few of these songs; most songs they make are still new songs generated from the recipe (weights, not bans).
2. **(b) Test fixtures**: exact, checkable facts for each piece (key, tempo range, meter, bar count, chord per bar or drone, cadence notes, rhythm masks). The engine renders the piece (or a recipe-generated song) and a checker compares the result to the fixture (2.6).
3. **Calibration** of the song detector in section 3: every library piece must score as SONG; scrambled versions of it must not.

### 2.2 Public-domain rules for this library

1. **Transcribe fresh.** Make every transcription new, from a public-domain source: a pre-1931 printed score (publications from 1930 and earlier are public domain in the US as of 2026) or the living oral tradition itself. Never copy a modern edition, a modern arrangement, a recording, or a teaching book's transcription. Those carry their own rights (editing, typesetting, performance).
2. **Safe everywhere**: an anonymous traditional melody, or a composer who died before 1926. Life + 100 years is the longest copyright term in force (Mexico), so that rule covers every country.
3. **Safe in the US and most countries, not all**: published before 1931, composer died 1926–1955. These are marked "US/most: yes; life+100 countries: no".
4. **Avoid**: anything by a composer who died after 1955, and every famous modern arrangement of a traditional tune (for example, The Animals' "House of the Rising Sun" arrangement, or Simon & Garfunkel's "Scarborough Fair" counter-melody).
5. **Store only what we need**: melody degrees, rhythm masks, chords and form. Lyrics are not needed (the game is text-free and names are spoken, not sung).
6. Where a tradition is a framework rather than a song list (raga, dastgah, electronic styles), use a **generated exemplar**: a song made by the tradition's Minimal song recipe with a fixed seed, checked by hand once, then frozen as the fixture.

### 2.3 Library: 2–4 pieces per tradition

Columns: piece | what to transcribe (per role) | length | public-domain status (checked Oct 24 2026; "web" = checked on the web today, "known" = from standard reference knowledge).

**western**
1. Ode to Joy (Beethoven, Symphony 9, 1824; died 1827) | melody (16 bars), bass/roots, chords per bar | 16 bars | PD everywhere (known). Example fixture in 2.5.
2. Twinkle Twinkle / "Ah! vous dirai-je, maman" (French traditional, 1761) | melody, I–IV–I–V harmony | 12 bars (ABA, 4+4+4) | PD (known).
3. Frère Jacques (traditional round) | melody; fixture tests canon entries every 2 bars | 8 bars | PD (known).

**classical**
1. Minuet in G, BWV Anh. 114 (Christian Petzold, died 1733) | melody + bass, 2 voices | 32 bars (16 + 16, repeats) | PD (known).
2. Bach chorale harmonisations (J. S. Bach, died 1750; 1784–87 Breitkopf edition) | 4 parts; voice-leading fixture (no parallel 5ths/8ves, cadences at fermatas) | ~12–16 bars each | PD (known). Pick 2 short chorales.
3. Pachelbel Canon in D, the ground bass only (died 1706) | 8-note bass, 2 bars, chords per half-bar | 2 bars repeated | PD (known).

**modal**
1. Scarborough Fair (English traditional; NOT the Simon & Garfunkel arrangement) | Dorian melody | 8 bars (3/4) | traditional melody PD (known).
2. Drunken Sailor (traditional sea shanty) | Dorian melody, `i | bVII` harmony | 8 bars | PD (known).
3. Veni Creator Spiritus (plainchant, 9th c.) | chant melody, final and reciting tone | 1 strophe | PD (known).

**rockpop**: generated exemplars only (2): I–V–vi–IV and vi–IV–I–V verse/chorus songs from the recipe, fixed seeds. Every well-known pop song is under copyright. Chord loops themselves are not protected; specific melodies are.

**jazz**
1. When the Saints Go Marching In (traditional) | 16-bar melody + chords + walking bass | 16 bars | PD (known).
2. Maple Leaf Rag (Scott Joplin 1899, died 1917) | A strain (16 bars): melody + bass + chords (ragtime, pre-swing) | 16 bars | PD (known).
3. Bill Bailey (Hughie Cannon 1902, died 1912) | melody + chords | 32 bars | PD (known).
4. Generated 32-bar AABA swing exemplar (recipe 1.5) with walking bass, rootless comping, ride pattern.

**blues**
1. Generated 12-bar shuffle in two keys (recipe 1.6): melody (AAB), boogie bass, comp, drums | 3 × 12 bars | generated.
2. Joe Turner Blues (traditional; NOT W. C. Handy's 1915 arrangement) | 12-bar melody | 12 bars | traditional PD (known); flag the melody version.
3. St. Louis Blues (W. C. Handy, 1914; died 1958) | AVOID for a global game: PD in the US (published before 1931), not in life+70 countries until 2029 (known).

**funk**: generated exemplars only (2), from recipe 1.7, fixed seeds. All classic funk records are under copyright; don't quote riffs.

**hindustani**: a framework.
1. Generated exemplar: Yaman, teentaal madhya laya: sthayi 4 cycles + antara 2 + tihai, built from aroha/avaroha/pakad (1.8) | lead + tabla theka + drone | ~8 cycles | generated.
2. Generated exemplar: Bhupali in jhaptal | same parts | ~6 cycles | generated.
3. Optional: a traditional bandish taken from V. N. Bhatkhande's *Kramik Pustak Malika* (volumes published from ~1919; Bhatkhande died 1936) | only bandishes printed before 1931, re-notated fresh | flag: check each volume's date and each bandish's composer (some are by Bhatkhande himself).

**carnatic**
1. Sarali varisai (beginner exercises in Mayamalavagowla, Adi tala; traditionally attributed to Purandara Dasa, died 1564) | first 4 exercises; fixture checks the svaras and tala | 4 × 1 cycle | PD (known).
2. Geetham "Sri Gananatha" (Purandara Dasa; raga Malahari, a subset of Mayamalavagowla; Rupaka tala 6 beats) | melody + tala | ~10 cycles | PD (known); flag the tala per source.
3. A Muthuswami Dikshitar **nottuswaram** (died 1835; simple melodies in Shankarabharanam that use Western-style tunes) | melody | 8–16 bars | PD (known); pick one from a pre-1931 printing.

**maqam**
1. Lamma Bada Yatathanna (muwashshah; maqam Nahawand; sama'i thaqil 10/8; text often attributed to Ibn al-Khatib, 1313–1374; melody attributed to Muhammad Abd al-Rahim al-Maslub, attribution disputed; archives list it as traditional) | melody + iqa' | ~16 cycles | PD (web, AMAR Foundation; Wikipedia; W&M archive). It needs Nahawand added to the scales (1.10, row 5). The AMAR Foundation notes early versions (1910, 1924 recordings) differ from today's slow version; transcribe the common skeleton only.
2. Tala' al-Badru 'Alayna (traditional hymn) | melody + maqsum or baladi | 8–16 bars | traditional PD (known); flag the maqam (sung in several).
3. Sama'i Rast by Tatyos Efendi (died 1913; see makam) | the taslim (refrain) only, 4 cycles of 10/8 | PD (web).
4. Generated exemplars: Bayati, Hijaz and Saba taqsim + maqsum song from recipe 1.10.

**makam**
1. Rast Saz Semaisi, Kemani Tatyos Efendi (1858–1913; T.S.M. repertoire no. S.E. 2587; aksak semai 10/8) | teslim + hane 1 (melody, usul) | ~16 cycles | PD (web: Turkish Music Portal, defteriniz.com). Transcribe from a pre-1931 manuscript or from the tradition, not from the modern Üsküdar Mûsiki Cemiyeti edition.
2. A Hammamizade İsmail Dede Efendi work in Hicaz (died 1846) | teslim only | ~8 cycles | PD (known); flag: pick a specific piece and confirm.
3. Üsküdar'a Gider İken / "Kâtibim" (traditional folk song, 2/4) | melody | 16 bars | traditional PD (known); flag the makam label (sources differ).

**dastgah**: a framework.
1. Generated exemplar: Shur daramad → chaharmezrab → forud (recipe 1.12).
2. Generated exemplar: Mahur reng in 6/8.
3. Optional: daramad of Shur from the radif of Mirza Abdollah (died 1918). The radif is traditional, but its published transcriptions (During, Talai and others, 1990s) are copyrighted editions. Do not use them; re-notate fresh from an older source or keep generated exemplars only.

**gamelan**
1. **Ladrang Wilujeng**, slendro manyura (traditional; Central Java). Ompak balungan: `2123 2126 | 33.. 6532 | 5653 2126 | 2123 2126(G)`. Pelog barang version: `2723 2756 | 33.. 6532 | 5653 2756 | 2723 2756(G)`. | balungan + colotomy | 32 beats (8 bars) per gongan; ompak + ngelik | traditional PD (web: Dartmouth gender book PDF; kawruhbasa.com). Flag: notation copied as the bare skeleton only; confirm against a second source.
2. Ketawang Puspawarna (attributed to Mangkunegara IV, died 1881), slendro manyura | balungan + colotomy | 16 beats per gongan | PD (known); flag the balungan source.
3. Lancaran Manyar Sewu (traditional) | balungan + colotomy | 16 beats per gongan | traditional (known); flag: find the balungan in an older source.
4. Generated Balinese kotekan pair (polos + sangsih), only if the planet is Balinese.

**japan**
1. Sakura Sakura (traditional, Edo period; in-scale) | melody + koto accompaniment (fresh) | 14 bars (4/4) | PD (known).
2. Kōjō no Tsuki (Rentarō Taki, 1901; died 1903) | melody | 16 bars | PD (known). Use the original minor-mode version, not Yamada's later 1918 arrangement (Yamada died 1965).
3. Rokudan no Shirabe (attributed to Yatsuhashi Kengyō, died 1685) | dan 1 only: melody + jo-ha-kyū tempo | 108 beats | PD (known).

**china**
1. Mo Li Hua (Jasmine Flower; traditional; first printed in the West by John Barrow, 1804) | melody | 16 bars | PD (known).
2. Fengyang Huagu (Flower Drum of Fengyang; traditional) | melody + drum/gong cell | 16 bars | PD (known).
3. Zizhudiao (Purple Bamboo; traditional Jiangnan) | melody | 16 bars | PD (known); flag the version.

**wafrica**
1. Kye Kye Kule (traditional Ghanaian call-and-response game song) | call + response melody, bell | 8 cycles | PD (known).
2. Obwisana (traditional Ghanaian) | melody | 8 bars | PD (known).
3. Agbekor / Agbadza drum parts (Ewe, traditional) | bell, rattle, kagan, kidi, sogo, master calls | 4 cycles | traditional (known). Transcribe from the tradition; not from published drum books (their transcriptions are copyrighted).

**cuban / son**
1. Son de la Ma Teodora (traditional; its claimed 16th-century origin is disputed) | melody + clave + generated tumbao/montuno | 16 bars | PD (known); flag.
2. Las Alturas de Simpson (Miguel Failde, 1879; died 1921; danzón, the son's ancestor) | A section: melody + bass | 16 bars | PD (known).
3. Generated son montuno (recipe 1.17): canto + montuno, all parts | 48 bars | generated. AVOID Guantanamera (Joseíto Fernández, died 1979) and Chan Chan (Compay Segundo, died 2003).

**rumba**
1. Generated guaguancó (recipe 1.18) with fixed drum conversation | 32 bars | generated.
2. Traditional yambú/guaguancó coros (anonymous) | 2-bar coro only | flag: confirm each coro is anonymous.

**samba**
1. Marinheiro Só (traditional samba de roda, Bahia) | melody + surdo/pandeiro | 16 bars | traditional PD (known). Do not use the famous Caetano Veloso arrangement.
2. Samba Lelê (traditional) | melody | 8 bars | PD (known).
3. Ó Abre Alas (Chiquinha Gonzaga, 1899; died 1935) | melody (marcha-rancho, carnival) | 16 bars | US/most: yes; life+100 countries: no.
4. Generated samba (recipe 1.19).

**bossa**: generated exemplars (2), from recipe 1.20. Every bossa nova song (from 1958 on) is under copyright. Optional older Brazilian source: Ernesto Nazareth, "Odeon" (1909; died 1934) as a melody to re-groove | US/most: yes; life+100 countries: no.

**celtic**
1. The Kesh (jig, G major; traditional) | melody A+B, chords | 32 bars (AABB) | PD (known).
2. Drowsy Maggie (reel, E Dorian; traditional) | melody A+B | 32 bars | PD (known).
3. Morrison's Jig (E Dorian; traditional; named after a 1930s recording artist, but the tune is older) | melody | 32 bars | PD (known); flag.
4. Sí Bheag, Sí Mhór (Turlough O'Carolan, died 1738; 3/4 air) | melody + chords | 32 bars | PD (known).

**flamenco**
1. Generated soleá (recipe 1.22): compás, Andalusian cadence, letra, falseta, cierre | 12 compases | generated.
2. El Vito (Andalusian traditional song) | melody | 16 bars | PD (known).
3. Sevillanas (traditional; one copla) | melody + 3/4 structure | 1 copla | traditional (known); flag: many named sevillanas are modern and copyrighted.

**aksak**
1. Jovano, Jovanke (Macedonian traditional, 7/8 = 3+2+2) | melody + tapan | 16 bars | PD (known).
2. Ajde Jano (Serbian traditional, 7/8 = 3+2+2) | melody + tapan | 16 bars | PD (known).
3. Generated rachenitsa (2+2+3) and kopanitsa (11/8), from recipe 1.23.

**andean**
1. Generated huayno (recipe 1.24) | AABB + fuga | 32 bars | generated.
2. Traditional huayno "Ojos Azules" (Bolivian/Peruvian) | melody | 16 bars | flag: check that no composer is credited.
3. AVOID El Cóndor Pasa (Daniel Alomía Robles, 1913; died 1942; its rights history is disputed) and Valicha (Miguel Ángel Hurtado, 1945).

**overtone**: generated exemplars (2), from recipe 1.25: one drone + gallop, one free. Tuvan traditional songs exist, but most available sources are modern recordings. Flag: re-notate one only if a traditional source is found.

**reggae / dub**
1. Linstead Market (Jamaican traditional mento) | melody, re-set over a one-drop riddim | 16 bars | PD (known).
2. Hill and Gully Rider (Jamaican traditional) | melody | 16 bars | PD (known).
3. Generated riddim (drums + bass riff + skank) and its dub version, from recipe 1.26.

**techno / house / dnb / minimal**: generated exemplars only (2 each), from recipes 1.27–1.29. Don't sample recordings; don't quote Reich or Riley.

### 2.4 Fixture format (JSON-like)

One file per piece: `tests/fixtures/songs/<trad>.<piece>.json`. A proposal; Resonance decides on the final path.

```
{
  "id": "western.ode_to_joy",
  "trad": "western",
  "kind": "pd_transcription" | "generated_exemplar",
  "source": { "what": "Beethoven Sym. 9, IV, theme", "pd": "composer d.1827; transcribed fresh from the 1826 first edition", "seed": null },
  "frame": {
    "tonic": "D", "tuning": "12tet", "scale": "major", "cents": [0,200,400,500,700,900,1100],
    "meter": "4/4", "grid": 16, "cycleBars": 1, "bpm": [100, 130], "swing": 0
  },
  "form": [ {"sec":"A","bars":4}, {"sec":"A'","bars":4}, {"sec":"B","bars":4}, {"sec":"A'","bars":4} ],
  "harm": { "perBar": ["I","V","I","V", "I","V","I","V|I", "V","I","V","I", "I","V","I","V|I"] },   // or "drone":[0,7]
  "parts": {
    "lead":       [ {"bar":0,"s":0,"d":4,"deg":3}, {"bar":0,"s":4,"d":4,"deg":3}, ... ],   // deg = scale degree 1..7, oct = octave offset
    "foundation": [ {"bar":0,"s":0,"d":8,"deg":1}, ... ],
    "pulse":      { "cells": { "kick":"x.......x.......", "snare":"....x.......x..." } }
  },
  "checks": {
    "masks":     [ {"role":"lead","bar":3,"mask":"x.....x.x......."} ],
    "cadences":  [ {"bar":3,"type":"half","leadEnd":2}, {"bar":7,"type":"full","bass":[5,1],"leadEnd":1},
                   {"bar":15,"type":"full","bass":[5,1],"leadEnd":1} ],
    "landings":  [],                                                   // sam / gong / count-10 / clave strokes
    "pcSet":     [0,2,4,5,7,9,11],
    "ess":       ["oneKey","strongChordTone85","cadV-I","rootOnChange"]
  },
  "tol": { "onsetMs": 15, "cents": 10, "chordToneStrong": 0.85, "tempoPct": 1 }
}
```

### 2.5 Three worked fixture examples (the facts, not the full JSON)

1. **western.ode_to_joy** (melody verified against memory; must be re-checked against a PD score when transcribed):
   1. Key D major; 4/4; 100–130 BPM; 16 bars, form A A' B A' (4 + 4 + 4 + 4).
   2. Lead degrees, A: `3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3. 2 2(half) |`; A': same first 3 bars, bar 4 = `2. 1 1(half)`.
   3. Rhythm masks: bars 1–3 `x...x...x...x...`; bar 4 `x.....x.x.......` (dotted quarter, 8th, half).
   4. Cadences: bar 4 = half cadence (lead ends on degree 2 over V); bar 8 = full cadence (lead ends on degree 1, bass 5 → 1); bar 12 ends on degree 5 (low) over V; bar 16 = full cadence.
2. **gamelan.wilujeng_slendro_manyura**:
   1. Laras slendro; pathet manyura; gong tone 6; ladrang = 32 beats (8 bars of 4 beats).
   2. Balungan per gatra (bar): `2123 | 2126 | 33.. | 6532 | 5653 | 2126 | 2123 | 2126`.
   3. Seleh (beat 4 of each bar): 3, 6, (gantung 3), 2, 3, 6, 3, 6. Kenong tones (beats 8, 16, 24, 32): 6, 2, 6, 6. Gong on beat 32 = 6.
   4. Colotomy: kethuk beats 2, 6, 10, … 30; kenong 8, 16, 24, 32; kempul 12, 20, 28; gong 32.
   5. Check: the gong never sounds on beat 1; every bar's beat 4 carries its seleh in the balungan part.
3. **hindustani.yaman_teentaal (generated)**: facts to check: drone [Sa, Pa] continuous; no shuddh Ma (500) at all; Pa and Sa skipped in fast ascents (N R G M# D N); every cycle's sam has the mukhda's last note (Sa, Ga or Ni); khali (beat 9) has no bayan strokes; the tihai's last note is on sam.

### 2.6 Accuracy metrics (computed by a checker on rendered output)

All are proposed for a new `tests/song_fixtures.js` (Resonance writes it). Existing `tests/musicality.js` already measures on-grid % (±12 ms) and in-scale % (±30 cents); these extend it.

| # | Metric | Meaning | Pass |
|---|--------|---------|------|
| 1 | Pitch-class exact | % of fixture notes whose pitch class (degree) matches exactly | 100% for fixtures; ≥ 95% for generated songs vs their own recipe |
| 2 | Tuning error | cents between the played pitch and the tradition's table value | ≤ 10 cents (ornaments excluded) |
| 3 | Onset error | ms between the played onset and its grid step (after the shared feel offset) | p95 ≤ 15 ms; ensemble spread (same step, different members) ≤ 10 ms |
| 4 | Chord tones on strong beats | % of lead + harmony notes on strong steps that belong to the bar's chord (chord traditions only) | ≥ 85% (classical ≥ 90%) |
| 5 | Focus degrees on strong points | drone traditions: % of strong-point lead notes on Sa/vadi/samvadi, tonic/ghammaz, seleh, nuclear tones | ≥ 70% |
| 6 | Cadence lands | at every cadence in `checks.cadences`: the lead ends on the stated degree and the bass on its stated motion | 100% |
| 7 | Final on tonic | the song's last lead + foundation note is the finalis | 100% |
| 8 | Cycle alignment | sam / gong / clave strokes / bell strokes / compás accents / drop: the anchor strokes are exactly on their steps every cycle | 100% |
| 9 | Clave direction | the same direction for the whole song (cuban, rumba) | 100% |
| 10 | Form exact | section boundaries at the bar numbers in `form`; changes only at boundaries | 100% |
| 11 | Tempo | BPM inside the fixture range; drift ≤ 1% except recipe-defined changes | 100% |
| 12 | Register | % of each role's notes inside its range | ≥ 95% |
| 13 | Rhythm mask match | Jaccard similarity of the played onset mask vs the fixture mask, per role per bar (popcount(a AND b) / popcount(a OR b)) | ≥ 0.9 for pulse; ≥ 0.75 for others |
| 14 | ESSENTIAL rules | every `ess` id passes | 100% |

---
## 3. How a jam becomes a song

### 3.1 Song vs jam (plain definitions)

1. A **jam** is ohms playing together inside the shared frame (section 0), each one varying freely within it. It has a key and a pulse, but no fixed hook, no sections and no planned ending.
2. A **song** is a jam that has gained **five things**, all measurable:
   1. a **hook**: a short motif (1–2 bars, or 1 cycle) that comes back recognisably, at the same place in its section;
   2. **sections**: a form (for example verse/chorus, AABB, sthayi/antara, ompak/ngelik, canto/montuno) with boundaries on exact bars, every role changing together at the boundaries;
   3. **cadences**: phrases end on the tradition's landing points (tonic/finalis, seleh, sam, count 10, gong) at regular places;
   4. **roles locked**: each member keeps one role and its part rule (section 0.5) for the whole section;
   5. **an arc**: an intro, a return of the first section, and an ending.
3. Jams are where ohms explore. Songs are where they agree. The world reacts to the two differently (3.6); the exact reactions are Wilbow's call.

### 3.2 Stages

| Stage | What it sounds like | Enters when | Leaves when |
|-------|---------------------|-------------|-------------|
| 1. EXPLORING | frame set (key, tempo, cycle, tradition); members try ideas, density low, no hook | a group forms | rhythm agreement ≥ 0.6 for 4 bars → GROOVING |
| 2. GROOVING | a locked groove; roles taken; still no hook or sections | rhythm ≥ 0.6 | song score ≥ 0.55 for 1 section (or 8 bars) → FORMING; rhythm < 0.45 for 4 bars → EXPLORING |
| 3. FORMING | a hook candidate repeats; the leader starts the recipe's form; first cadences | score ≥ 0.55 | score ≥ 0.75 sustained for 2 sections → SONG; score < 0.45 for 8 bars → GROOVING |
| 4. SONG | full recipe: sections, hook at its place, cadences, intro/ending planned | score ≥ 0.75 over 2 sections | the form's ending section is reached → CODA; score < 0.55 for 8 bars (outside breakdowns) → FORMING |
| 5. CODA (ending) | the recipe's ending (tag ×3, tihai, cierre, gong, fade) | form complete or the group is breaking up | ending done → new song (seed + 1) starts at FORMING, or the group disperses |

**Hysteresis** (a gap between the "enter" and the "leave" thresholds so the stage doesn't flicker): enter SONG at 0.75, leave at 0.55; enter FORMING at 0.55, leave at 0.45. **Minimum dwell**: once in a stage, stay at least 1 section (or 8 bars). **Breakdowns don't count**: during a recipe-defined breakdown, breque, dub mute or alap the score is frozen (the sparse texture is intended).

### 3.3 Per-bar signals (cheap; computed once per bar from what each member played)

The song score is a weighted sum, each part 0–1:

| # | Signal | How (once per bar) | Weight |
|---|--------|--------------------|--------|
| 1 | Rhythm agreement | mean Jaccard similarity of each member's 16-bit onset mask vs its role's cell in the recipe | 0.25 |
| 2 | Pitch agreement | cosine similarity of the bar's pitch-class histogram (weighted by duration) vs the tradition's profile (focus degrees heavy); for chord traditions, % chord tones on strong steps | 0.20 |
| 3 | Hook recurrence | the hook's hash (contour of 4–8 notes + rhythm mask); a match = the lead's bar is within distance 1 of the hook at the bar where the form expects it | 0.25 |
| 4 | Cadence rate | at each phrase end the recipe expects, did lead + foundation land on the landing degree on the landing step? (rolling 4 phrase-ends) | 0.15 |
| 5 | Form regularity | did every role change at the section boundary, and only there? (rolling 2 sections) | 0.15 |

Notes:
1. Timbre variety does NOT count (it does in today's settle score; see 3.8, cause 12).
2. All five use small integers and bitmasks: cost is a few hundred operations per group per bar.
3. Off-screen groups don't compute signals at all; they use the stored stage (3.7).

### 3.4 How ohms work toward a song

1. **The frame is given, not found.** The leader sets the frame at the start (section 0.6), so every member is in the same key, tempo and cycle from bar 1. The work toward a song is about the hook, the form and the cadences, not about agreeing on a key.
2. **The hook seed**: the leader's own signature motif (its creature tune, from its genes) becomes the hook candidate, quantised to the grid and fitted to the mode's degrees. In EXPLORING the leader plays it every 2–4 bars; in FORMING members copy it (heterophony or answer); in SONG it is placed by the recipe.
3. **Roles lock to the recipe** in GROOVING: foundation, harmony, lead, pulse, colour (section 0.5). An ohm's instrument decides which roles it can take (body never changes); a voice for leads, a deep body for foundation, etc.
4. **The leader cues sections**: a fill or a call on the last bar of a section (tihai, llamada, breque, repinique call, kendhang signal). Members change on the next downbeat.
5. **Colour echoes** the hook in its gaps, never on top of it.
6. **Experience**: ohms that have made songs before shorten the dwell (FORMING can last 1 section instead of 2). Young groups take longer, so on arrival you hear them at an earlier stage (3.7).
7. **The ≥10% variance** lives in ornaments, density, and note choice within the mode on weak steps (section 0.4). It never touches the frame, the cycle anchors, the cadence landings, or the hook's place.

### 3.5 How the library seeds and validates songs

1. **Seeding**: each planet's ohms "know" 2–4 library pieces (2.3). When a group's leader knows one, there is a small chance (e.g. 15–25%; tunable) that it seeds the song with that piece's hook and form instead of its own. Most songs remain new.
2. **Recognition**: a song whose hook hash matches a library hook is a "known song" (a world signal, 3.6).
3. **Validation**: the fixture checker (2.6) runs on (a) every library piece rendered by the engine and (b) 20 generated songs per tradition with fixed seeds. Pass = all ESSENTIAL metrics 100% and the others at their thresholds.
4. **Calibration of the song score**: library pieces must reach SONG within their first 2 sections; the same pieces with notes shuffled (same rhythm) must stay below FORMING; random notes in the frame must stay in EXPLORING or GROOVING. If not, retune the weights in 3.3.

### 3.6 World-reaction signals (the reactions themselves are Wilbow's call)

The music system emits these events; the world decides what to do with them:

1. `song.enter` (stage becomes SONG), with tradition, hook hash, group size.
2. `section.boundary` (every section start), with the section name.
3. `hook.return` (each time the hook recurs in place).
4. `cadence.land` (each landing on the tonic/finalis; stronger at section ends).
5. `cycle.land` (sam, gong, clave, count 10, drop), every cycle.
6. `song.coda` and `song.complete` (the ending finished cleanly), with the song's length in bars.
7. `song.known` (a library hook was recognised).
8. `song.break` (SONG dropped back to FORMING: the group fell apart).
9. Jam-only: `jam.groove` (GROOVING reached).

Suggestion only, for Wilbow to decide: the world reacts lightly to a jam (ambient: plants sway with the pulse) and strongly to a song (events tied to the hook, cadences and completion).

### 3.7 Song record; already mid-song on arrival

**The song record** (per group, stored; about 40 bytes):

```
{ seed, trad, recipeId, formIdx, sectionIdx, barInSection, cyclePos, bpm, t0, stage, hookHash, bornAt }
```

1. **Off-screen** groups keep only this record. Nothing is rendered or analysed. Once per bar (or lazily when needed) the position is computed by arithmetic: `bars = floor((now − t0) × bpm / 60 / beatsPerBar)`, then walked through the form's section lengths to get `sectionIdx` and `barInSection`. `cyclePos` = `(beats since t0) mod cycleBeats`.
2. **Stage from age**: a group that formed recently is at an earlier stage. Proposed default: age < 8 bars = EXPLORING, < 16 = GROOVING, < 16 + 2 sections = FORMING, then SONG. (Experienced groups: halve these.) The stage only goes forward off-screen; the game doesn't simulate breakdowns off-screen.
3. **On arrival** (the group comes into hearing range): render starts from the **next beat** of the current position: the right section, the right bar, the right cycle point, the hook in place. Sustained parts (drones, pads, held notes) **fade in** over about one beat, so nothing starts mid-note with a click.
4. **Form ends** off-screen: the next song starts with `seed + 1` (deterministic), the same tradition, maybe another recipe variant.
5. **Newcomers** (an ohm or the player joining): listen for the rest of the current section, then join at the **next section boundary** in a free role. They never change the frame.
6. **Save/restore**: the record is saved; on load, the same song continues from the arithmetic position.
7. **The seed is stored**, never taken from the wall clock (today it is; see 3.8, cause 13).

### 3.8 Causes of "cohesion only sometimes" (file:line, in `www/js/`; the Android asset copies are identical builds)

1. **Three form clocks disagree.** `theory.js:37` and `theory.js:108` define AABA over 16 bars; `jam.js:109` has a separate 24-bar arc (`J.FORM = 24`: build/peak/…); `harmony.js:84–95` makes 4-bar sections that change after 4 repeats. Members can be in different "sections" at the same bar. Fix direction: one form track per song record (3.7).
2. **Western grammar applied to every tradition.** `harmony.js:73` (`H.section`) builds progressions with Western functional rules. `harmony.js:140` (`H.modOk`) allows modulation without checking the tradition, and `harmony.js:36` (`H.mode`) calls any 7-note system "major" or "minor" by its 3rd. So Yaman, Bhairav, makam Rast and Hicaz count as "major" and Kafi and Todi as "minor", and those jams can modulate and get functional chords.
3. **Drone traditions get a full triad.** `trad.js:60` returns `byRoot(0)` (a tonic triad) when `harm === 'drone'`, and `harmony.js:102` (`H.bind`) pulls strong-beat notes onto it. This erases the vadi/samvadi or ghammaz emphasis on strong beats. Drones should be [0, 5th] (and leave strong-beat choice to focus degrees).
4. **Each ohm has its own meter.** `mind.js:21` takes the meter from the ohm's genes; the leader's meter is adopted only conditionally (`jam.js:37`, needs pulse > .7; `cohere.js:54`). `jam.js:130` (`J.beatChange`) cycles through `['4/4','7/8','5/8','3/4','6/8']` regardless of tradition. Members can play different meters at once.
5. **Per-ohm detuned 4th.** `mind.js:17` and `mind.js:35` (`colourC`) shift degree 4 per ohm. Two members can play different 4ths at the same time.
6. **Per-ohm drum micro-timing.** `mind.js:139` adds `m.micro × 4` steps to every drum stroke per ohm. Feel should be a shared per-tradition value (section 0.3), not a per-ohm offset.
7. **Motifs and pakad without rhythm.** `trad.js:97–98` spaces motif notes evenly across the bar (no durations), and the fixed phrases overwrite the hook every 4 or 8 bars, so no hook can stay recognisable.
8. **Random heterophony.** `trad.js:90` shifts the copied lead by a random ±1 degree, so "unison" parts clash on strong beats.
9. **The gong on the wrong beat.** `trad.js:80` sounds the gong at `s: 0` (the first beat), while the styles.js cell (and the tradition) puts it at the END of the gongan (1.13).
10. **Flamenco accent on count 1.** `trad.js:72` accents step 0 when landing. In soleá count 1 is unaccented and phrases resolve on count 10 (1.22).
11. **Only 4 of 8 ragas have rules.** `trad.js:19–20` (`Tr.RAGA`) covers Yaman, Bhairav, Kafi and Todi; Bhupali, Marwa, Malkauns and Darbari (all in styles.js), and all Carnatic ragas, have no arohana/avarohana grammar (1.8, 1.9).
12. **The settle score measures the wrong things.** `harmony.js:172–190` (`H.SETTLE = .7`, `H.DROP = .55`) has no hook, form or cadence measure, and counts timbre diversity toward "settled". Replace with the song score (3.3).
13. **The song seed comes from the wall clock.** `harmony.js:84` seeds `H.song` with `RS.hash(c.born, Math.round(Sf.now()))`, so the same group makes a different song each time the code path runs (and after load). Store the seed (3.7).
14. **Blues chords on blues-scale degrees.** MUSIC_THEORY.md §2.1 records that blues chords are built from blues-scale degrees; they must be I7, IV7, V7 from the major scale (1.6).
15. (Not a cause; checked.) `cohere.js:12` `Co.TON = 4` (at most 4 tonal parts audible) fits the five-role plan.
16. **Carnatic "rupak" is the Hindustani 7-beat cycle.** `styles.js:10` gives carnatic the meters `["adi","rupak"]`, and the rupak defined is the Hindustani 7-beat rupak. Carnatic Rupaka is 6 beats (1.9).

---

## 4. Flags (values I'm not sure of)

1. Real intonation of ragas, maqamat, makams and dastgahs differs from any fixed table (performer and region). The tables are starting points; listen before freezing them.
2. Makam: AEU comma values vs practice (e.g. segâh lower than AEU).
3. Gamelan tunings: every set is unique. The slendro/pelog cents are an average of published measurements, not a standard. Javanese vs Balinese not decided (question 4).
4. Carnatic gamaka modelling is a placeholder.
5. Bossa guitar pattern (0, 3, 6, 10, 13): one common form; many variants.
6. Flamenco: exact chord placement within the soleá compás varies by palo and player.
7. Reggae skank: PATTERN_LIBRARY's 8th-offbeat cell vs one-drop skank on 2 and 4 (1.26). Depends on whether the tempo is counted in half time.
8. Aksak tempo unit: the game's bpm range (100–200) vs the 8th-note pulse.
9. Overtone gallop cell placement (1.25).
10. Andean siku and quena tuning: not tempered.
11. Library items marked "flag" in 2.3: attribution, version or PD status needs checking before transcription. Especially: Lamma Bada's version; St. Louis Blues and Ó Abre Alas (not PD in life+100 countries); Bhatkhande dates; Son de la Ma Teodora's origin; Ojos Azules; Morrison's Jig.
12. Ode to Joy fixture facts were written from memory; check against a PD score.
13. Ladrang Wilujeng balungan: confirm against a second source.

## 5. Sources

1. Ladrang Wilujeng balungan: L. Polansky, gender book, eamusic.dartmouth.edu/~larry/gender_book/08.gender_pieces.pdf; kawruhbasa.com (gending notation).
2. Lamma Bada: AMAR Foundation archive notes; Wikipedia "Lamma Bada Yatathanna"; William & Mary Middle Eastern Music Ensemble archive.
3. Tatyos Efendi, Rast Saz Semaisi: Turkish Music Portal (turkishmusicportal.org); defteriniz.com repertoire listing.
4. Hindustani raga data: V. N. Bhatkhande, *Kramik Pustak Malika* / *Hindustani Sangeet Paddhati*; N. A. Jairazbhoy, *The Rāgs of North Indian Music* (1971); M. Levy, *Intonation in North Indian Music* (1982); S. Rao & W. van der Meer (intonation studies).
5. Carnatic: P. Sambamoorthy, *South Indian Music* (vols. I–VI).
6. Arabic maqam: maqamworld.com (J. Farraj); Farraj & Shumays, *Inside Arabic Music* (2019).
7. Turkish makam: K. Signell, *Makam: Modal Practice in Turkish Art Music* (1977); the AEU system (Arel, Ezgi, Uzdilek).
8. Persian dastgah: H. Farhat, *The Dastgah Concept in Persian Music* (1990); J. During.
9. Gamelan: S. Sumarsam; J. Becker; M. Hood (pathet); Polansky (above).
10. West African: J. H. K. Nketia, *The Music of Africa* (1974); D. Locke (Ewe drumming; cited for facts only, not transcriptions); G. Toussaint, *The Geometry of Musical Rhythm* (bell patterns, clave).
11. Cuban/rumba: Toussaint (clave); C. Washburne; P. Manuel.
12. Flamenco: compás and Andalusian cadence: P. Manuel, "Flamenco Harmony" (1986); standard compás charts.
13. Celtic: Breandán Breathnach, *Ceol Rince na hÉireann* (tune types and forms; facts only).
14. Balkan aksak: T. Rice, *May It Fill Your Soul* (1994); Bartók on "Bulgarian rhythm".
15. Overtone: T. Levin & V. Süzükei, *Where Rivers and Mountains Sing* (2006); the harmonic series (math).
16. Copyright terms: US Copyright Office (pre-1931 publications PD as of Jan 1 2026); WIPO country terms (Mexico life + 100).
17. Existing project docs: PATTERN_LIBRARY.md §1.2, §1.4, §2; MUSIC_THEORY.md §2.1; tests/musicality.js.

## 6. Open questions for Wilbow

Numbering note: Q1–Q11 here are QUESTIONS_FOR_WILBOW.md items 230–240 in the same order (Q1 = 230, Q6 = 235, Q8 = 237, Q11 = 240).

1. **Which planet gets which tradition?** There are about 30 tradition ids; with one per planet, which ones ship first?
2. **Song vs jam reactions**: what should the world do on `song.enter`, `hook.return`, `cadence.land` and `song.complete` (3.6)? Should a jam get any reaction at all?
3. **Known songs**: should ohms sometimes play real library songs (e.g. Ode to Joy, Sakura) in the game, or are library pieces for testing only?
4. **Gamelan planet: Javanese or Balinese?** (Javanese = slow, colotomic, pathet; Balinese = fast, interlocking kotekan, paired detuned tuning.)
5. **Strictness**: is "every member obeys the frame exactly" right even for a young group in EXPLORING, or may young groups be a little out (and the player hears them improve)?
6. **The player as a member**: when the player plays along, are they held to the frame (notes snapped to the scale and grid), or free?
   - Partly answered (8:45 PM MDT Sat Oct 24 2026, Wilbow): "Instead of a grid make the notes more organic and have movement". So painted notes land in key (on the frame's scale) but keep human-feel timing and organic, moving strokes, not a hard grid. Recorded notes still snap to 16ths (QUESTIONS_FOR_WILBOW.md 235). Still open: does the same apply when the player sits in a jam as a member?
7. **Song length**: the recipes give 1–4 minutes. Is that the right size for the game?
8. **Blends**: parked for now. When should they come back (for example, when ohms from two planets meet)?
   - Partly answered (8:56 PM MDT Sat Oct 24 2026, Wilbow): "Eventually I want the planets much bigger with regions of blending traditions between but it seems to have been forgotton". So blends come back on much bigger planets, in the border zones between tradition regions, mixed by weights that change gradually across the zone, never a hard switch (QUESTIONS_FOR_WILBOW.md 237). Still open: when bigger planets arrive, and what happens when ohms from two planets meet. See SCALE_MUSIC.md §2.6.
9. **PD caution**: use only "safe everywhere" pieces (2.2 rule 2), or also "US/most" ones (rule 3)?
10. **Microtones**: are the per-tradition cents tables (maqam, makam, dastgah, raga, gamelan) wanted as exact data, or should every tradition stay on the 12-TET frame with only ornament bends?
11. **Tradition voice in the frame**: should the drone/harmony parts be given to the ohm with the right body when one is present (3.4 rule 3), even if it is not the leader?
