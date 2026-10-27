# Drawn instruments: line-by-line check against what Wilbow approved (v0.0.26, Oct 25 night)

Source: softsound V08_SPEC.md section P (lines 1188-1404), approved by Wilbow 3:19 AM MDT Oct 23 (Q120-Q129 defaults "yes"),
plus the Music Theory end limits (MT 4.7 tuned-bar ratios, P2 soft limit, endPitch ranges). Code: www/js/things.js (P1-P4),
www/js/shapeplay.js (P5-P7, new), www/js/recipe.js (tuned ratios hook), www/js/autojam.js (P7 hook). Tests: tests/drawn_p_test.mjs
(DRAWN_P_OK, 40+ checks), tests/step5_test.mjs, tests/answers_test.mjs, tests/stroke_test.mjs, tests/shape_test.mjs.

Legend: BUILT (before tonight) / BUILT v0.0.26 (tonight, own switch, ON) / NOT BUILT (why) / SUPERSEDED (by a later approval).

## P1 Drawing and editing
| line | verdict |
|---|---|
| draw a stroke -> string / bar / membrane by shape | BUILT (stroke.js / things.make) |
| drag an end to re-length, rim to resize a drum | BUILT (handleMove, ends switch) |
| relative length limits (lenLim .3-3, barLim .5-2, areaLim .4-3) | BUILT |
| absolute size 24 px .. 1200 px | BUILT v0.0.26: absLen [.47, 23.5] world units, switch absLen |
| pin / attach / free ends of a rod | n/a: no rod physics in this engine (shapes are static); nothing to pin |
| chain strokes into one instrument | NOT BUILT (the spec gives no rule for the joint's sound; left for a taste question) |

## P2 Pitch laws
| line | verdict |
|---|---|
| string f ~ 1/L, bar f ~ 1/L^2, membrane f ~ 1/sqrt(A) | BUILT (pitchFor, strK / barK / memK) |
| snap to the key | BUILT; snaps to the one session key (this engine has one key, not regional keys) |
| soft limit at the ends (MT) | BUILT (range log-compress + endPitch per kind) |
| pinch to bend (b.free) | NOT BUILT: two-finger pinch is the zoom gesture (GESTURES clash, not mine to resolve) |

## P3 Voice and cost
| line | verdict |
|---|---|
| voice per kind | SUPERSEDED by the approved 73-row palette (each shape gets a seeded row of its kind) |
| stroke features lean the voice | NOT BUILT (the palette row decides; no approved mapping from stroke shape to row) |
| at most 4 shape notes ringing at once | BUILT v0.0.26: voiceCap 4 for ohm / bump hits (your taps and end drags always sound), switch shapeCap |

## P4 You play them
| line | verdict |
|---|---|
| tap / strum / bump, restrike guard, ring glow | BUILT |

## P5 Ohms play your shapes - BUILT v0.0.26 (switch shapePlay)
| line | verdict |
|---|---|
| ohm within 300 px of a shape may play it | BUILT (seekU 6 units); drops it when it wanders past 450 px |
| technique by its own instrument: strike / pluck / bow / sing to it / perch | BUILT strike, pluck, bow, sing-to from the palette exc row (scrape counts as strike, blow as bow); perch = n/a (ohms do not sit on shapes in this engine; no attach physics) |
| sing to it: within 30 cents (or an octave) the shape rings back at v .15 | BUILT |
| at most one decision per 4 bars | BUILT |
| on-screen only | BUILT (main.js onScreenW) |
| in a jam: on the grid | BUILT: every hit is scheduled on the shared bar grid (always, not only in a jam) |
| liking + register fit | BUILT: a fixed per-ohm liking (seed hash) x register fit (within ~1.5 octaves of its own range) x kind fit |
| ohms walk to shapes | NOT BUILT: movement is the ohms track's, and holding / moving an ohm touches the GESTURES clash. Asked as a taste question |

## P6 Ensembles - BUILT v0.0.26 (switch ensembles); recognised only when a shape changes (signature checked once a bar)
| # | line | verdict |
|---|---|---|
| 1 | drone rod: string / bar >= 300 px, snap to home / fifth within 50 cents; 2+ bowers hold a drone | BUILT (re-bowed each bar, 4.2 s notes) |
| 2 | marimba row: 3+ bars within 25 degrees, distinct adjacent degrees, ratios [1, 4.0, 9.9] | BUILT (long = low; recipe.js modal.tuned; a bar leaving gets its own pitch + free-bar ratios back). Note: rows whose palette voice uses fixed body modes (oud / nylon guitar / kora) keep those |
| 3 | harp frame: 3+ strings, tuned to chord tones | BUILT (re-laid each bar to the chord sounding now; pickers play it broken; jamTune leaves harp strings alone) |
| 4 | drum circle: 3+ drums within 250 px, parts split by size | BUILT (big = low 1 + 3.5, middle = back beat 2 + 4, small = time on the off-8ths) |
| - | glow together once + a rising sweep when formed | BUILT (gold line 1.6 s + 3+ note sweep) |
| 5, 7-12 | proposed further ensembles | NOT BUILT (proposed, not approved) |

## P7 Shapes lean the ohm jams
| line | verdict |
|---|---|
| per-shape summary of what it has played | BUILT v0.0.26 (onsets, degrees, who played) |
| weight cap .25, 450 px, nearest 8 | BUILT |
| decay halves every 2 bars, gone after 8 | BUILT |
| own members don't count; bumps (wind) count .3 | BUILT |
| melody borrows at most 1 phrase in 3 | BUILT (autojam: the shape's last steps from the chord root, in the jam's register; switch shapeLean) |
| tempo lean <= 8 % / bar, <= 25 % | NOT BUILT: one shared clock locked to the om; leaning one jam's tempo moves the whole world. Taste question |
| baton | n/a (no baton object exists) |

## P8 Tests
Covered by tests/drawn_p_test.mjs (P1 abs length, P3 cap, P5, P6 1-4, P7, bystanders) + the older step5 / answers / stroke / shape tests.
