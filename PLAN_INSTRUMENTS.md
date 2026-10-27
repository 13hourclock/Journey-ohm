# PLAN_INSTRUMENTS.md - a wide variety of instruments across ohms (track/instruments)

> **Build from SUMMARY.md first** (Wilbow's Current Summary, /workspace/resonance2/SUMMARY.md). If this plan disagrees with the summary, the summary wins.

Written Sun Oct 25 2026 10:2x AM MDT for Wilbow's 10:09 AM "What happened to a wide variety of sounds?", 10:13 AM "Don't do the
cheapest version", 10:16 AM "Continue with the build whatever makes sense with all ive already said".

## Format for Music Theory (INSTRUMENT_PALETTE.md)

Put ONE fenced block in the file, fence tag `palette`, holding a JSON array (one object per instrument). Prose, tables and the review
checklist can be anywhere else in the file; the game loads only that block. Every number has the unit in its name. Leave a field out =
the engine default. Ranges below are what the engine can do (values outside are clamped).

```
{
  "id": "nylon_pluck",                 // unique, snake_case, never reused
  "name": "nylon-ish pluck",           // dev panel only (the player never sees names)
  "family": "plucked",                 // plucked | bowed | blown | struck | bell | pad | voice | bass | texture | fm | wavetable | granular | other
  "part": "string",                    // main inst.js part: string | tube | modal | osc | bow | blow | voice
  "exc": { "pluck": 1, "strike": 0, "scrape": 0, "bow": 0, "blow": 0, "voc": 0 },        // exciter weights 0..1 (normalised)
  "res": { "str": 1, "tube": 0, "bar": 0, "membrane": 0, "form": 0 },                     // resonator weights 0..1 (normalised)
  "engine": { "kind": "FM", "amt": 0.3,                                                   // none | VA | FM | WT | ADD | PD | FOLD | RING | GRAN; amt 0..1 (share of the sound)
              "fm_ratio": 2, "fm_index": 1.5, "fm_ops": 2, "fm_fb": 0,                    // ratio (x f0), index 0..8, ops 2..4, feedback 0..0.9
              "pwm": 0, "wt_pos": 0, "wt_scan": 0, "add_tilt": 1, "add_spread": 0,        // pwm 0..1 (0 saw .. 1 pulse); wt_pos 0..1; wt_scan -0.4..1; add_tilt 0.4..2.6; add_spread 0..1.8
              "pd_amt": 0, "fold": 0, "lpg": 1, "ring_ratio": 2.01, "gran_dens": 0.5, "gran_size_s": 0.06 },
  "modal": { "mix": 0, "partials": [1, 2.76, 5.4, 8.93], "decay_s": 1.2, "bright": 0.5, "damp": 0.4 },   // struck-body layer: mix 0..1, partial ratios x f0 (4-8), decay 0.1..6 s, bright/damp 0..1
  "env": { "att_s": 0.002, "dec_s": 0.6, "sus": 0, "rel_s": 0.3, "curve": 1 },           // att 0.0015..1 s, dec 0.05..2.5 s, sus 0..1, rel 0.03..2.5 s, curve 0.35 (snappy) .. 2.8 (soft)
  "filter": { "type": "lp", "cut_hz": 3000, "reso": 0.2, "env_oct": 1, "env_dec_s": 0.2 }, // lp | bp | hp; cut 180..10800 Hz; reso 0..1; env -1.2..2.8 octaves; env decay 0.02..1.4 s
  "pitch": { "env_oct": 0, "env_s": 0.02, "glide_s": 0 },                                 // start offset in octaves (-0.6..0.6) falling to 0 over env_s; glide between notes 0..0.37 s
  "vib": { "rate_hz": 5, "depth_cents": 0, "trem": 0, "filt_oct": 0 },                   // vibrato 0.3..8 Hz, depth 0..60 cents; amplitude tremolo 0..0.55; filter wobble 0..1.2 oct
  "tech": { "repeat": 0, "repeat_hz": 10 },                                               // tremolo picking / rolls: 0..1, 6..18 Hz
  "noise": { "amt": 0, "color": 0.5 },                                                    // breath / bow hair / grit 0..0.6, colour 0 dark .. 1 bright
  "sat": 0, "detune_cents": 0, "width": 0.3,                                              // saturation 0..1; unison detune 0..25 cents; stereo width 0..1
  "formant": { "f1_hz": 500, "f2_hz": 1500 },                                             // for form / voice parts (f1 350..900, f2 900..2600)
  "voice": { "vowels": "a o e", "tense": 0.6, "nasal": 0, "breath": 0.2 },                // part 'voice' only (vocal tract): wordless vowel set, tenseness 0..1, nasal 0..1, breathiness 0..1
  "overtones": "odd-heavy, 3rd partial strong",                                           // your words (dev panel / review only)
  "range_midi": [40, 76],                                                                 // playable range; notes outside fold by octaves
  "loud_db": -3,                                                                          // relative loudness -18..0 (the mixer evens families out with this)
  "tune_tol_cents": 5,                                                                    // how far its partials may sit from the chord tone before it reads out of tune
  "body": { "size": 0.4, "float": 0, "round": 0.5, "spiky": 0.1, "wide": 0.3, "lobes": 0.2 },   // which ohm body suggests it (all 0..1; a LEAN, never a lock)
  "distinct_from": ["harp_pluck"]                                                         // the neighbours it must not be confused with (the variety test checks these)
}
```

How the game uses it: every ohm sits at a continuous point in instrument space (its genes + its body). It blends its two nearest palette
instruments (weights by distance) and then adds its own seeded spread on every parameter, so no two ohms are the same and there are no fixed
categories; the palette rows are the landmarks. The matrix still moves every parameter live.

## His words this plan follows (WILBOW_VERBATIM.md, read only)

| # | Feature | His words (MDT) |
|---|---|---|
| W1 | Each ohm a different instrument | "Creatures should be treated as  Different instruments which are trying to communicate through music." (Wed Oct 21 11:59 PM, t132) |
| W2 | No two ohms on the same instrument; much wider timbre | "They are all playing the same instrument often, they should have much more randomized timbre" (Thu Oct 22 2:32 AM, t177) |
| W3 | Many kinds of sound, not only pads | "I really want it to make alot of different types of sounds  not just ambient soundscapes." (Oct 21 7:54 PM, t98) |
| W4 | Textural and tonal variety | "There still needs to be more variety in ohms sounds and initial configurations ... Also focus on a variety of textural and tonal elements" (Oct 22 10:52 AM, t186) |
| W5 | Across ALL engines | "randomized timbre and other attributes across all synthesis engines to create varied sounds" (Oct 23 3:19 AM) |
| W6 | When ohms communicate, their instruments are not changed by each other | "When communication happens between ohms, their instrument should not be affected and changed by eachother." (Oct 23 3:38 AM) |
| W7 | Sound comes from the body | "Ohms have theor sound from theor body and other natural attributes. Items the carry should change that, only modulate in noticeable predictable ways" (Oct 23 3:41 AM) |
| W8 | Voice ohms (vocal tract) | "Id like some creatures to have a vocal synthesis which can create vocal sounding patterns.  Like the web app called pink trombone" (Oct 21 10:40 PM, t128) |
| W9 | Unique voices | "The ohms voices should be unique to make them sound like individuals" (Oct 23 4:50 PM) |
| W10 | Body leans the role, never a lock | KEEP 12 "shape suggests role: wide/heavy = bass, tall/thin = lead, round = pads, spiky = percussion; a lean only" (Oct 23 2:12 PM) - note his 1:07-1:09 AM Oct 25 card: instruments looser from role (D A B C: genes lean, learned, from what it plays, player sculpts) |
| W11 | Harder hits brighter | "Keep 1: harder hits sound brighter for every ohm voice" (Oct 23 3:12 PM) |
| W12 | Engine tweaked by many things | "Its synthesis engine can be tweaked by alot of things" (Oct 25 2:32 AM) |
| W13 | Procedural, not patches | "complex procedurally generation engine are what i want built not a bunch of patches" (Oct 24 10:07 PM) |
| W14 | Not the cheap version | "Don't do the cheapest version." (Oct 25 10:13 AM) |
| W15 | Sampling allowed | "Some sampling will be necessary that rule is inefficient, disregard" (Oct 25 12:42 AM) |
| W16 | Sounds generally stay but can learn and be changed | "Its synthesis engine can be tweaked by alot of things" / "It can learn other sounds too" (Oct 25 2:32 AM); 1:07-1:09 AM card D A B C: genes lean and give tone, instruments are learned or picked up, role grows from what it plays, the player assigns or sculpts |

## Old game (softsound, read only): instrument and voice families
- inst.js v0.3+: one continuous timbre space: exciters pluck / strike / scrape / bow / blow / voiced pulse x resonators waveguide string,
  inverted tube/reed, modal bar / bell / membrane, FM pair, formant pair; + 9 synth engines (VA, FM 2-4 op, wavetable, additive, phase
  distortion, fold+LPG, ring, granular of the world's sound, noise resonator); technique genes (tremolo picking / rolls, glide, drone).
- percussion as a continuous gene (wood -> membrane -> metal -> bell, marimba / tabla ratios); drum kits (drums.js) - build step 5 of PLAN_REAL_PLANET (queued next).
- tract.js + vocal.js: Pink-Trombone-style vocal tract voices (LF glottis, Kelly-Lochbaum tract + nose, wordless syllables, words).
- min timbre distance between ohms ("Sf.distinct", v0.3.1), own engine >= ~85 % of the sound.
- items.js item modulation (echo feeding, ember grit and other carried items): COPIED as item modulation; a carried item modulates the carrier's sound in noticeable, predictable ways (W7). Direct ohm-to-ohm sound borrowing on contact stays out (W6).

## What the new engine has now (master 019eadf)
- dsp/inst.js = the old InstFactory (all exciters, resonators, 9 engines) and a modal 'note' voice; recipe.js makeRecipe gives every
  ohm random genes BUT every note is mostly the modal struck body (mix.modal .75-1) with the synth at .25-.7, and the synth genes are
  uniform randoms that average out -> most ohms sound like a similar mallet / bell. No vocal tract. Pool: 14 synth voices.

## Plan
1. instruments.js: the PALETTE (Music Theory's rows, W1-W5, W13) + a temporary seeded spread until it lands; each ohm's instrument =
   continuous blend of its 2 nearest rows + its own spread (W2, W9, W13); a distinctness pass so neighbours differ (W2).
2. Body leans the choice (size/float/roundness -> bass / lead / pad / percussive), a lean only (W7, W10).
3. Every family through the existing engine: plucked, bowed, blown, struck/mallet, bells, pads, voices, bass, textures, FM, wavetable,
   additive, PD, fold, ring, granular (W3, W5); modal body layer only where the instrument has one (fixes the "all bells" sameness).
4. Voice ohms: port the old vocal tract (tract.js) as its own pooled worklet path, wordless vowel patterns from genes (W8, W9). Words: later.
5. Matrix rows keep working on every instrument (live.* / synth.* / modal.*) (W12); contact alone does not copy a partner's sound (W6).
6. Velocity -> brightness kept on every family (W11).
7. Speed by being smarter (W14 + "many ohms smooth"): per-family fast paths in the voice loop (skip unused parts), shared tables,
   distance LOD (far ohms: fewer partials / cheaper path), voice pool by priority; never fewer families.
8. Dev panel: instrument family spread, palette on/off, per-ohm instrument readout.

9. Learned sounds and instruments (W16): an ohm's own tone from its genes stays underneath; it can learn sounds and pick up instruments (capped, by context), as in track/instruments 4da3ae3.
10. The player assigns or sculpts an ohm's sound (W16, touch sculpting in PLAN_SOUND_PLAYGROUND step 6).
11. Role grows from what it plays (W16); the body only leans it (W10).
12. Item modulation (W7): carried items are modulation sources with matrix rows, noticeable and predictable.
13. Granular from your recordings (`inst.granSamples`, ON): the sample bank as a texture family (W15).
14. Drummer ohms and drum kits, effects as objects, drawn instruments: build step 5 in PLAN_REAL_PLANET (his 3:35 AM picks; "Return later", 3:40 AM).

Team proposal (dev toggle, OFF): P2 `inst.sectionVar`: ohms of the same palette landmark nudged further apart in register.
