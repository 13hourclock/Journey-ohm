# look/ — Visuals track foundation (style-neutral)

This is the base layer for Wilbow's look answer **13A+13B+13D**. It sits on a continuous dial between real light/depth/material (0) and trippy, sound-reactive colour (1). The dial is set by context, and a peak envelope adds bigger moments at big musical events. It is not a preset and has no fixed ratio. **No final art is decided here.** Every number is a parameter (`opts`, `MATERIAL`, `MIX_WEIGHTS`, `PALETTE_OPTS`, `RUNGS`, `GLOW_PROFILE`).

Rules: plain Canvas 2D only, with no WebGL, per-frame shadowBlur, canvas filter or per-frame gradients. The look reads world state and music and never writes to them. Every effect has a cheaper rung.

## Files
| file | what |
|---|---|
| `index.js` | `createLook({sim, music, world, bus, makeCanvas?, opts?})`. This is the only thing render.js imports. |
| `sprites.js` | Pre-baked sprite cache. It is an LRU capped by bytes (default 16 MB, about 2 MB in use with 50 ohms) with a bake budget per frame (an over-budget bake returns `null` and the caller takes its cheaper path). Glow is baked once per colour at 32 px and drawn at any size, with a shared white core sprite. |
| `light.js` | One key light (angle, elevation, colour) and a `MATERIAL` (ambient, terminator, limb, rim, spec). It bakes these neutral overlays: `shadeSprite`, `rimSprite`, `litSprite` (shade and rim merged into a single draw) and `bodySprite` (a full body). `depth(z)` returns fade factors. Sprites are re-baked only when the light's angle bucket (1/32) or its 3-bit colour changes. |
| `mix.js` | `trip` runs from 0 (real) to 1 (trippy). It comes from the world's `st.trip` when present. Otherwise it is built from context (place/heal, jam, musical development = note density over about 90 s, and key tension), using `MIX_WEIGHTS`. `peak` is an envelope that rises quickly and decays over about 8 beats. It is triggered by a key change, a jam start, a cadence, `harmony.push`, `world.layer`, `music.om`, or `st.burst`. `mixed = trip + (1-trip)*peak*peakLift`. |
| `palette.js` | Takes key, mode and chord from music, plus the mix. At the real end it uses blackbody light (Kelvin set by mode and mix) and low saturation. At the trippy end it rotates hue in golden-angle steps locked to the beat, eased on the beat phase. Swatches are rebuilt once per bar or on a key/chord/mix-bucket change, and only the rotation runs per frame. |
| `thing.js` | `createThings(...)` behind `look.thing`: the material look for placed things (8 fx materials, membrane, string, bar). The bakes are exact-size and idle-queued. `THING_OPTS` holds the numbers. |
| `quality.js` | `RUNGS[effect][q]` sits on the engine's existing ladder (`render.q` 0..3). `CHEAPER` describes each effect's fallback. |

## Hook API (matches NOTES_DEV "Shared contracts → Look hook", world track)
```js
import { createLook } from './look/index.js';
const look = createLook({ sim, music, world, bus });              // once
// each frame, render.js builds st = { t, W, H, dpr, q, trip, real, burst, pulse, barPhase, level, depth, zoom, cam, A }
look.frame(st);                        // FIRST, before any drawing: rungs, bake budget, mix, palette (per bar), key light colour
look.palette?.(L, st)                  // optional, OFF by default: {hue, spread, sat, light} for a world layer
look.ohm?.(g, o, x, y, r, st)          // after the world draws ohm o at (x,y) radius r (CSS px, dpr transform set): lit+rim (1 draw) + glow (1 draw, cap per rung)
look.bodies(g, items)                  // optional: the look draws bodies itself [{x,y,r,rgb,glow}] (far ohms, jam view); 1-2 draws each
look.post?.(g, st)                     // optional, OFF by default: last; vignette sprite + peak colour wash
look.stats()                           // cache bytes/sprites/hits/bakes, trip, peak, mixed, glows this frame
look.api                               // { sprites, light, mix, palette, rung }: for later look options
```
Every method leaves `globalAlpha = 1` and the composite at `'source-over'` (this is tested). Defaults: `ohm` is on, while `palette` and `post` are off. After a merge the game's colours therefore stay exactly as they are until a look option is picked. Enable with `createLook({..., opts: { palette: true, post: true }})`.

## Cost (50 ohms, r 10–40 CSS px, 412×860 CSS, look work only, 240 frames after 40 warm-up)
`node tests/look_bench.mjs` (node-canvas) · `PW=1 node tests/look_bench.mjs` (headless Chromium, Skia, which is the same rasteriser family as the Android WebView). Gate: `MAX_LOOK=3`.

| rung (dpr) | Chromium look.ohm ×50 | Chromium look.bodies | cairo look.ohm ×50 | per-frame gradients (old way), Chromium / cairo |
|---|---|---|---|---|
| q0 (1.5)  | **2.35 ms** (p95 2.8) | 2.40 | 9.1 | 5.4 / 29.8 |
| q1 (1.25) | **1.46 ms** (p95 1.8) | 1.38 | 5.6 | 4.2 / 22.0 |
| q2 (1.0)  | **0.81 ms** (p95 1.0) | 0.80 | 2.9 | 3.2 / 14.1 |
| q3 (0.75) | **0.01 ms** | 0.24 | 0.23 | 2.4 / 10.1 |

The Chromium timings include a 1 px readback, so queued raster work is counted. Cairo is a pessimistic CPU proxy: even the world's own 50 flat arcs take 1.06 ms in cairo against 0.06 ms in Chromium, so use the Chromium numbers for the budget. The cost is all fill-rate, mostly glow area (radius × scale × dpr)². That is why glow scale and count are the first things each rung cuts. A peak frame adds the white core (q0 only).

## Rungs
| effect | q0 | q1 | q2 | q3 |
|---|---|---|---|---|
| glow | ×1.5 r, max 24, core on peaks | ×1.4, max 20 | ×1.3, max 12 | off |
| shade (terminator, limb, highlight) | on | on | on | off (flat) |
| rim | merged into shade | merged | off | off |
| body (look.bodies) | baked sprite | sprite | sprite | flat arc |
| post | vignette + wash | vignette | off | off |
| sprite buckets / bakes per frame | ½-octave / 6 | ½ / 4 | octave / 2 | octave / 1 |

## Hooks the world track needs
1. Pass `st.trip` / `st.burst` (already in the contract, from `W.lookMix`). Optionally pass `st.place` (0..1 healed/real place) or expose `world.heal`. Without them, mix.js derives the mix itself.
2. Call `look.ohm` in **nearest/brightest-first** order so the per-rung glow cap keeps the important ones.
3. The contract calls `look.ohm` only at q<2. The look has a q2 rung (shade plus small glow, 0.8 ms). Either call it at q2 as well, or keep the contract and treat the q2 rung as unused.
4. Optional: route far or tiny ohms through `look.bodies` (1 baked draw each) instead of world arcs + `look.ohm`.
5. Merge: track/world has a stub `www/js/look/index.js`, so merging gives an add/add conflict. **Take this (Visuals) version.**
6. things.js (Game Dev): call `look.thing(g, th, c.x, c.y, R, { P, glow, chord: ct, now })` in T.draw and skip the outline when it returns true. See "look.thing" under the real look.

## Tests
`node tests/look_test.mjs` uses node-canvas and the real music/events. It checks: cache cap and LRU, bucket reuse, bake budget, the 4 rungs, a continuous mix, the peak on a key change, following the world's trip, palette rebuilt per bar rather than per frame, the trippy end being more saturated, read-only behaviour, ctx state restored, and defaults.

## P1: one place across its states (`opts.p1`, OFF by default)

One opt-in flag: `createLook({ ..., opts: { p1: true } })` (or `p1: { ...PLACE_OPTS overrides }`) turns on `look.palette`, `look.layer`
and `look.post` together. Off = the game looks exactly as before. Logic in `place.js`; no presets.
- Heal: `sim.healAt(cam.x, cam.y)` (NOTES_DEV 'Place sources' contract, .5..1) mapped through `healRange` [.5, 1] to 0..1, blended with
  mix.trip (`wHeal` .6), smoothed (`tau` 3 s). If `sim.healAt` is missing: the one constant `healMissing` (.75 raw = mid). No other fallbacks.
- Unhealed (37 A D): muted, desaturated palette, dimmer glows, cached dust/crack/grain tile on the background layer; light stays real.
- Developing: sound colour comes into sky bands (baked per bar) and aura tints.
- Harmonised (36 A): vivid, gold glints on jamming ohms, lace between nearest jamming pairs (38 A; jam from bus `jam` notes), baked per phrase.
- Big event (36 B, 38 B, 39 A D): peak/burst opens a swell that lands on the next beat and settles on a bar line after 1-4 bars (x context,
  `swellStretch`). Full-screen pattern on the background layer + a centre burst in post(). While it plays the ladder steps the ohms down one rung
  (glow, glints) and pair lace pauses: the event pays for itself.
- Swell gating (v0.0.18 fix): opens only when peak/burst crosses `trigger` .75 (was .3: ordinary key/om/chord/jam/push bangs kept it
  on ~50-70% of play), at least `swellGap` 8 bars after the last one and `warmBars` 4 bars after start. The full-screen lace is fine VECTOR
  lines (1 px + soft glow) in the sky only, faded out over the far hills; the land only gets a soft additive tint. Centre burst: modest, 1:1.
- Kaleidoscope takeover (real look): `look.layer(c, L, sc, st, 'field')` returns true, so render.js skips its own kaleidoscope (its sky
  gradient is drawn before and stays). Ours: L.sym petals turning with the bar, growing with trip/burst, breathing with development (1 breath
  / 2 bars), per-beat kick only inside a swell; lit fine lines ('lighter', never dark), palette colours, clipped above the ridge line.
- OPEN POINT (36: card "B D", follow-up "A B D"): `takeover` (.85) = how far a big event takes over; `dim: true` darkens under it.
- P1 at q0 uses the q1 glow size/count (core kept for peaks).
- Bench = headless Chromium by default (the gate; `node tests/look_bench.mjs`), one worst case per rung gated at 3 x [1, .8, .6, .3] ms.
  `CAIRO=1` runs node-canvas as a pessimistic proxy (not gated). Tests use the repo's node_modules/canvas, else `LOOK_CANVAS_DIR`, else a no-op
  stub (all logic checks still run).
- Chromium worst case per rung (ms): q0 2.83, q1 2.02, q2 1.58, q3 0.14.

## The real look: space, planets, star systems and ground (ON by default; one opt-out: `opts.realLook = false`)

Wilbow: "more realistic space, planets and star systems", "Less cartoon looking graphics", 13A/B/D; round 2: "DO WHAT WORKS".
Real light, depth and materials sit underneath; the trippy sound-reactive layer is mixed over them by context, with big takeovers
only on big events (1-4 bars, landing on the beat). There are no per-feature flags. Tuning (numbers only):
`opts.realLook = { planet: {PLANET_OPTS}, star: {STAR_OPTS}, ground: {GROUND_OPTS}, gl: {GL_OPTS}, bake: {mode, sliceMs} }`.
Missing fields never throw; every input has a default.

### 2D hooks (Canvas 2D, call after `look.frame(st)`; each returns false when it did not draw so the world's own draw runs)
```js
look.planet(g, p, x, y, r, st)   // p = {seed, id, r, style:{rock,ocean,ice,gas}, tilt?, heal?, snowLine?}; st.light = {x,y} (the star, CSS px)
look.star(g, x, y, r, st)        // blackbody disc, granulation, hot core, corona; corona wobble + limb flares ONLY on a burst (no beat throb)
look.ground(g, L, pts, st)       // mode C: pts = sample arrays {x0, dx, y0, amp, yBot, chunk, ver, h[], river[], moist[], crack[], snowLine? ...}
look.thing(g, t, x, y, r, st)    // a placed thing (things.js / sim.placed.list), material look in place of the outline; see "look.thing" below
look.readout()                   // READ-ONLY {lit, heal, bright, dust, vivid, colour, trip, peak, swell, season, weather, glow} (unchanged)
look.api.idle(ms)                // optional: run bakes now (host idle time); otherwise requestIdleCallback / setTimeout slices
```
`st` extras read (never written): `heal`, `season` (-1 winter..1 summer), `weather` (0 dry..1 storm), `trip`, `peak`, `burst`, `snowLine`.

2D ground: a baked height field (ridge = exactly the data silhouette, falling toward the viewer), ray-cast per column with real
slope light, cast shadows along x and ambient occlusion: ribbed rock at altitude, rolling hills, a winding river that widens toward
you. Summer / winter / storm differ by the snow line, frost, ice on water, wet ground and haze. Bakes run in idle time; a frame blits
one finished tile per slice. The trippy peak (takeover .85, Q36, adjustable) is baked into the tile: the palette flows continuously
with altitude AND the real light (shadows run to the next colour), with thin contour lines; it moves with bar / key / chord.

### look.thing: placed things (things.js / sim.placed effect objects, drawn instruments)
```js
look.thing(g, t, x, y, r, st) -> boolean
// g  : the Canvas 2D context, in CSS px (things.js T.draw's setTransform(dpr, 0, 0, dpr, 0, 0)). Left exactly as it was found.
// t  : one entry of sim.placed.list / things.list: {id, kind: 'fx'|'membrane'|'string'|'bar', fx?: 'rev'|'dly'|'dst'|'glt'|'cho'|'trm'|'cmb'|'pit',
//      seed, tied?, ...}. Read only. kind + fx pick the material; seed fixes its details (cracks, ribs, shards).
// x, y : the thing's centre on screen (CSS px) = toScreen(W, H, sim.cam, t.x, t.y)
// r  : its screen radius (CSS px) = t.r * toScreen(...).s
// st : per-call draw state (every field optional except P):
//      { P:     [[x, y], ...]  t.pts in screen CSS px (the outline for fx / membrane, the polyline for string / bar). REQUIRED,
//        glow:  0..1           hit flash (things.js: 1 - (now - t.hit) / 400),
//        chord: 0..1           chord-tone shimmer for a tied string (things.js `ct`),
//        now:   ms             clock for the fx pulse and the string vibration (Date.now()) }
// returns true when it drew the thing (skip the outline), false when it did not (no look.frame yet, real look off, no P, r <= 0).
```
Light, day and heal are not passed in. They come from the frame: the light is `lightOnScreen(look.frame st)`, the sky colour is
`skyLight(world.env.day)`, and heal and trip come from the same context as the ground. All of them are bucketed with hysteresis, so a
thing rebakes only when the light really moves: 16 light angles, 12 day steps, 6 heal steps, 5 trip steps, and 8 palette hues from
trip .3 up. Off with `opts.realLook = { thing: false }`. Tuning is `opts.realLook.thing = {THING_OPTS}`.

**Wiring (Game Dev, things.js T.draw, not done on this track):** in the per-thing loop, after `P` and `glow` are computed, add
`if (look && look.thing && look.thing(g, th, c.x, c.y, R, { P, glow, chord: ct, now })) continue;` before the outline code. Here
`look` = `render.look`, passed into createThings or read as `JO.render.look`, and `ct` = the chord-tone value things.js already has
for tied strings (0 if none). `tests/look_things_stills.mjs` makes exactly this replacement at runtime for its stills.

Per call, a ready thing costs one 1:1 blit. On top of that it draws its live parts: an additive pulse or hit glow, and for a
struck string the vibrating wire (two strokes), or for a struck membrane a ripple. A new shape, size or light bucket bakes ONE
exact-size sprite in idle time through the shared OX queue, up to 240 device px radius; bigger draws are scaled. Each bake is rasterised in idle time (1 px readback), and at most `swap` (3) new sprites go
on screen per frame, so a light step that rebakes every thing never lands in one frame: 11 things measured 0.09–0.11 ms mean, 0.6 ms max
per frame in headless Chromium at dpr 2, against 13.9 ms spikes without these two steps. Until a bake is ready the
last bake of that thing is drawn scaled; on the very first frame a lit vector stand-in is drawn instead. Materials: shell (nacre +
growth spiral + sheen), echo crystal (lit facets + inner echo outlines + core glow), ember-rock (basalt + glowing cracks, kept at
night), shard cluster (glass shards + a glitch slice), droplet (fresnel rim, caustic, spec), seed pod (ribs, seeds, stem), reed
tube (cylinder, nodes, open ends), bubble lens (thin-film rim), membrane (taut skin, wooden rim, brass tacks), string (wound wire,
spec, pegs), bar (rosewood grain, node cords at 22.4 % / 77.6 %). Every material gets a contact shadow, and its spec and rim come
from the one scene light. Unhealed things are muted toward dust (core concept, as the ground). At night the lit parts dim but the
emissive parts (cracks, crystal core, film) keep their light.

v0.0.21 ground (real land, not bands / pillars):
- Lit by the sky: `skyLight(day)` (sky.js; the sky bake's own day / twilight / night weights) gives the sun / moon colour, the sky's
  ambient fill and the air colour. The ground reads `ctx.day` (world.env.day, passed by index.js; none = full day). Dusk keeps the land
  lit by the sky's mauve fill and a low warm sun; night is weak cool moonlight and the far land sinks into the night air (render's night
  fill is skipped under look.sky, so the ground darkens itself). Light buckets (`lightBuckets` 8 over day .02-.62) are part of the tile
  key; a bucket change bakes the new tiles in idle while the old ones draw, and every slot switches on the same frame (or after `lightSwapMs`).
- Relief is capped in PIXELS per term (`spurPx` 64, `knollPx` 26, `hillPx` 150, `rockPx` 22) and runs down the face in pixels too
  (`relV`): it was in h units x amp (1000-1650 px) and u units, so a 110 px spur stood hundreds of px tall: the front-strip pillars.
- The silhouette is Catmull-Rom between samples (linear gave each dx segment one flat slope: vertical light stripes), and a slice's
  ZS is the same for every chunk (it followed the chunk's hMax: the face fall-off jumped at chunk seams).
- Distance haze is continuous: a slice's face runs from its depth to the next nearer slice's depth (y0 gap), haze = hazeK x d^hazePow,
  no per-slice flat haze step; water reflects more sky with distance.
- Muted (unhealed) land greys toward the dust hue at its OWN brightness (shading kept: muted land is still land); the cover grain is
  applied (its multiply sat inside a comment); trip bands follow altitude only (no per-slice offset band).

v0.0.22 ground (near range: no smears down the slope):
- The cause: each newly visible depth step of the column ray-cast filled ALL its rows with one colour. Where a near or steep face
  spans 5-40 px per step, that one sample was copied straight down: vertical streaks, as if the texture were pulled down the slope.
- Now a step that continues the surface of the step below it (no hidden ground between) blends its rows toward that step's colour
  (Gouraud down the column), and every pixel gets the LIT micro relief of its cover: four 256x256 periodic detail textures built once
  (`makeDetail`: rock ribs + cracks + lichen, soil grain + pebbles, grass tussocks, forest crowns), each albedo + height gradient,
  sampled in surface coordinates (world x; sv = u x ZS x .55 - h x amp: steep faces textured along their height, flat ground
  foreshortened), lit by the real light (`detailBump` .55, only where the sun reaches) plus albedo (`detailAlb` .22), features
  growing toward the viewer (`detailNear` 1.3), fading with distance and haze, off on water. `detailK` (1) scales it all; 0 = before.
- The water level / channel is read linearly between samples (it was read at the rounded sample: the channel stepped every dx) and
  the rock ribs' rockiness is Catmull-Rom (linear put a light step every dx).
- Bake cost is unchanged within noise (look_bench_real bakeMs); the per-pixel work is a few table reads.

v0.0.22 frame cost (look_bench_real q0 margin, nothing cut):
- Ohm sprites (OX bakeSlice) are rasterised in idle: Chromium defers a fresh canvas's raster to its first use, so a 1 px read right
  after the bake moves that cost out of the frame (the kRaster / paintOf pattern). Trippy hue churn no longer pays it mid-frame.
- Crack glow (big events): the ground tile + its 'lighter' crack-glow layer are composed in idle into one canvas per glow bucket
  (`glowBake` true, `glowBuckets` 12 over glow 0..1, `glowLag` 2 buckets tolerated while the next one bakes), so a glowing tile is ONE
  1:1 blit instead of the tile + a tile-sized additive blit (the glow layer's bbox is the whole tile on muted land). Same pixels:
  baked vs live max diff 3/255 (bucket rounding). Memory: one extra tile canvas per glowing tile. `glowBake: false` = the old path.
- 4b column smears (crack veins): the vein noise runs in SURFACE px both ways (`gx`, `u*ZS*.55 - h*amp`), not `(gx, u*6)`, which
  stretched every vein ~10x down the screen; the vein glow is blended down a step's rows like the colour (one step's glow copied
  down a tall step was an orange column). Bake only (~+1 ms of a ~29 ms tile bake, noise); frames unchanged. `tests/look_smear_test.mjs`:
  glow dy/dx 0.13 before -> 0.62 after (gate .45).
- Glow on events only (`opts.gl.glowEventsOnly`, default ON; `glowFloor` .15): the crack / emissive glow envelope (`look.readout().glow`,
- Character ohms claim their body (`opts.realLook.ohmChar.claim`, default ON; `claimN` [22, 20, 14, 0] per rung): world ohmdraw.js asks `look.ohmBody(o)` before its blob fill (v0.0.30 B12) and `look.legs(o)` before its stroke legs (B10). An ohm drawn with the character look last frame, within `claimN[q]` of the rung cap, is claimed: the world skips the blob + legs and ohmlook skips the destination-out erase (the single biggest cost of the look, ~18 us an ohm on Skia). A legged ohm is claimed only while world.opts.lookLegs is on; rare ohms never. If the draw then fails, look.ohm's shaded path still paints a body (tests/look_claim_test.mjs: 0 holes at rest and through zoom out / back / close). Eye + gaze sprites were already cached by quantised lids (5) and gaze (7 steps); faces under `faceMinPx` (6 device px) are skipped; faces stay on q0..q2.
- Dust split (`opts.dustSplit`, default ON): the place's dust layer is grain only over the whole background, sky included; its cracks are a separate soft tile (three wide-to-narrow low-alpha passes, no light offset line) laid only below the land line look.sky set this frame for this layer (FRONT worlds: the floor line `A.y + floorF·H·sc`, so not over the far ridges or the sea), with a 3.5%·H fade-in band. A layer with no known land line gets grain only. It is look-side; the world's sky is not clipped. Both tiles bake in idle time. `false` = the old full-screen crack tile. Gate: tests/look_dust_test.mjs (seed 42). Still: softsound_previews/journey/shade/sky_cracks_before_after.png.
- Rare soft (`RARE_LOOK.soft` / `opts.realLook.rare.soft`, default ON): the rare look is light + shade only. The baked glow rings lose their crisp thin line (a wide low-alpha band + a medium band), the body loses its hair-thin dark edge (limb darkening + rims carry the silhouette), and grounded rare legs are tapered shaded fills with a foot, not strokes. Cache keys carry `s` (`rrs:` / `rbs:`) so no off tiles are reused. false = the v0.0.25 rings / edge / stroke legs. Gate: `tests/look_rare_soft_test.mjs` (peak ring alpha 74 vs 142 off; dark rim px 35 vs 189).
  ground `ctx.glow`, gl `uGlow`) = max(place swell, st.big past the floor), so 0 at rest. It was max(swell, peak) with swell = max(place
  swell, st.burst), and the world bangs st.burst on every key / om change and song start / end (every few s with nothing played), so the
  veins sat at .2-.8. OFF = the old reading. `tests/look_glow_test.mjs`. (`c.swell` itself, the brightness / atmo swell, still reads burst.)
- Result (two runs): q0 calm 1.44/1.50, trip 1.94/1.94 (was 2.62), season 1.45/1.37, back 2.50/2.51 (was 2.98 worst).
- Measured, not changed (render.js): each back chunk is clipped at a CSS-integer x; at dpr 1.5 that is a half device pixel, so Skia
  uses an antialiased clip mask and every clipped blit costs ~2x (micro bench 0.06 vs 0.14 ms for a 300x600 blit). Snapping that
  clip rect to device pixels (bench copy only) gives back 1.94 vs 2.55 ms.

### WebGL hooks (three.js is passed in; look/* never imports or vendors it)
```js
look.planetMat(THREE, p, st)  look.groundMat(THREE, st)  look.starMat(THREE, st)          // -> material or null
look.atmoMat(THREE, p, st)  look.cloudMat(THREE, p, st)  look.waterMat(THREE, p, st)  look.coronaMat(THREE, st)
// every material: material.userData.u (uniforms), material.userData.tick(st) once per frame, userData.bind(geometry)
```
### Attributes and fields for Game Dev (all optional; missing ones fall back to defaults)
| name | where | type | meaning |
|---|---|---|---|
| `h` | mesh attribute | float | height (h units) |
| `m0` | mesh attribute | vec4 | rock, soil, veg, sand (0..1) |
| `m1` | mesh attribute | vec4 | wet, ice, hollow, crack (0..1) |
| `m2` | mesh attribute | vec3 | temp, moist, slope (0..1; slope < 0 = derive it) |
| `fold`, `fresh` | mesh attribute | float | fold strength, freshly made ground |
| `river` | mesh attribute | float | flow strength 0..1 (confirmed) |
| `p.snowLine` | planet object | number | per planet, h units at the equator; the shader lowers it toward the poles (confirmed) |
| `st.snowLine` | frame state | number | every frame; wins over `p.snowLine`; already carries the season (confirmed) |
| `p.sea`, `p.atmo`, `p.palette`, `p.spin`, `p.tilt` | planet object | number / array | sea level, air amount, colours, turn, tilt |
| `st.lightDir`, `st.starPos`, `st.starColor`, `st.starR` | frame state | arrays / number | the physical light |

Lit by Game Dev's real `DirectionalLight` with shadows (PCFShadowMap tested). The surface grain fades by screen-space size
(`fwidth`) so small far planets never sparkle; coasts are anti-aliased by their own screen width. Gas giants suppress the rock bump.
The corona billboard fades to 0 before the quad edge.

### Cost design ("be smart, not cheap": bake, cache, sprites; features are never cut)
- Everything expensive is baked OUTSIDE the frame (idle time): planet textures, lit discs, trip tints, ground tiles, exact-size
  ohm / core sprites. A frame only blits finished bakes at exact device px (`blit.js`: 1:1 when the size matches). What is not baked
  yet shows the last finished version.
- Planet spin uses a coarse step with a crossfade. Lower rungs only lower the resolution.
- Colour-split rim masks are baked once and tinted at draw time, so a palette change never forces a rebake.

### Benches and previews
- `node tests/look_bench_real.mjs`: the whole look per frame on headless Chromium per rung (bakes in idle between frames, outside
  the timed region), gated at 3 x [1, .8, .6, .3] ms. `REAL_GATE=0` reports only.
- `node tests/look_gl_test.mjs`: the GL hooks compile and draw in SwiftShader with shadows on, attributes are auto-detected,
  and the uniforms tick.
- `node tests/look_real_previews.mjs [outDir]` writes unlabelled 412x915 stills (`LOOK_PREV_ONLY=regex`, `LOOK_PREV_RAW=1`).
  `node tests/look_contact_sheet.mjs [outDir]` builds `contact_sheet.png`: the shipped look on top, the new look below.
- `tests/look_gl_scene.mjs` holds TEST-ONLY stand-in geometry (a cube-sphere and a terrain strip), not Game Dev's meshes.

### Perf (P1 field pass)
- Kaleidoscope: two ring layers (even / odd rings) baked at a FIXED, capped resolution (<= 512 px per side, scale bucketed to 1/4 octaves of the canvas' device scale, never the zoom), keyed by bar + layer look, held in an LRU of 4 entries. The zoom (`sc`) and the grow / breath / kick are applied only at blit, as a smoothed (bilinear) rotate+scale, so zooming never rebakes and the layers never evict each other. No nearest-pixel blit (it looked stepped).
- Bands: one vertical gradient fill (96 stops, same colours as the old per-band paint), rebuilt once per beat (mid-beat, after the palette's eased step has settled) + height.
- Allocation (the q0 'developing' GC stall, pre-existing): the stall was V8 major GCs driven by sprite-cache churn — the lit key colour and glow tints follow the palette, so ~280-500 exact-lit / glow / burst sprites were baked per 240 frames, each a NEW OffscreenCanvas (external memory). Now: cache hits are allocation-free (LRU by tick stamp, no Map delete+set); evicted canvases go through a one-frame limbo into a 4 MB pool keyed by size and are reused via `ctx.reset()`; the swell burst has ONE pre-allocated canvas, rebaked once per phrase with that phrase's colours (look change: burst colours no longer slide within a phrase); keys are numeric or cached per size (no per-frame strings); `look.palette`, tintHue, light colour, lightOnScreen, rung tweaks and the per-frame ctx fields reuse objects; the device transform is read once per run of `look.ohm` calls as plain numbers (DOMMatrix getters box). q0 developing allocation went from ~24 to ~9 KB/frame; what is left is mostly boxed doubles passed to drawImage (young-gen, cheap).
- Swell lace: drawn once per swell (keyed on place.opens + phrase + size + anchor quantised to 8 px), only faded at blit; the blit is offset by whole device pixels so it stays a 1:1 copy.
- Dust: the grain tile is baked at the background canvas' device scale and the pattern mapped 1:1 onto device pixels (a scaled pattern is a filtered fill per pixel).

### Big moment (swell trigger)
- When the world sends one, the swell opens from `st.big` (a jump above `place.O.bigTrigger` = .2) or a bus `moment` event (`k` > .2). Once either has been seen, the music-peak rule is ignored, so om changes, landings and spawns cannot open it. Without a signal, the old rule (music peak / burst crossing `trigger`, .75) is the fallback.

### Ground ridge (chunk overlap)
- Ground tiles carry GOV = 3 samples of overlap per side (`pts.ov`, or `(cx - x0) / dx`). `ridgeProfile()` smooths the river fill and face blur across the overlap (linear extrapolation beyond it), so neighbouring chunks agree at the seam (ridge < .01 px, face < 1.5 px in look_test). Without overlap it clamps as before.

### Sky (v0.0.19): `look.sky(c, st, L?, A?, sc?)` → true when it drew
- `sky.js`: a real day / night sky (zenith → horizon gradient, horizon haze, the sun's glow tight + white by day and wide + warm at
  sunrise / sunset, twilight colours on the sun's side, stars at night, cloud / rain greying, season shifting). Day colours = Game Dev's
  daySky (zenith rgb(52,104,186) → horizon rgb(190,214,236)), weighted by `world.env.day`.
- Baked at 1/4 CSS px into a small canvas keyed on bucketed inputs (day in 48 steps, sun side, cloud, rain, season, size), drawn as ONE
  smoothed blit; a bucket change crossfades over ~0.8 s. Stars: one CSS-px canvas per size, only at night. No per-frame gradients.
- WIRING REQUEST for render.js (Game Dev): call `look.sky(c, st, L, A, sc)` FIRST in drawLayer for the home layer; on true skip the radial
  field bg, the `real > .05` sky gradient, daySky and skyEnv's night fill; keep the clouds / rain. Tuning: `opts.realLook.sky = {SKY_OPTS}`.
- The at-rest kaleidoscope is woven into this sky (soft-light veil, below).

### Kaleidoscope (v0.0.19): at rest a colour veil, whole at big moments, ready for the sound mapping
- At rest: a soft colour VEIL (5 nested petal fills per ring, soft-light: it shifts the sky's hue, no outline, no white). The fine
  lit lines come up with the big moment (`st.big` / swell / burst), palette-tinted (20 % toward white on the lit side at most).
- The kaleidoscope is NOT reduced to decoration: petals, rings, symmetry, depth, bar rotation, breath and kick are all still there.
- INPUT SEAM: `look.api.kaleidoIn = { sym, dev, trip, big, depth }` — any number set there replaces the derived input (null = derived).
  `look.api.kz` is a READ-ONLY readout of what was drawn (big, bigS, veilA, lineA, dev, trip).
- PERF: at most 2 passes per frame (veil soft-light, lit layer 'lighter'); the big-moment veil light is baked into the lit layer, so the
  full takeover costs one pass, as before.

**Rest = no lines (v0.0.21).** The lit line layer comes only from `st.big`, a place swell, or a burst past a knee (`opts.kaleidoBurstKnee`, .35):
world.js `lookTick` calls `W.bang(.25)` on every chord-root change, and the chord moves at rest, so `st.burst` sat at .1–.25 and held the
lines at ~.2 (a white zig-zag star round the anchor ohm). Key / om / jam start / landing / life bangs (.7–1) still light them.

### Perf notes (v0.0.19 headroom: back slices on)
- Headless Chromium (software Skia): a 1:1 drawImage is ~3.5x cheaper than a scaled one; a drawImage with a SOURCE SUB-RECT leaves the
  fast path (half the rows cost as much as the whole tile); composite-op toggles and distinct images are ~free. Frame cost is raster
  in the flush, not JS.
- Ground back slices: baked only `backDepth` (1.2) x amp below their lowest crest, the rest is a flat foot colour fill; a per-frame
  COVER CUT clips each back chunk to where last frame's nearer slices hide it (one clipped 1:1 draw per chunk; per-bin parts measured
  slower: `coverMerge` / `coverTop` stay as knobs).
- Tile cache bugs fixed: tiles created while the bake queue was full were never queued (drawn as vector forever: `maxJobs` + create
  only when queueable); a tile still shown as the stand-in during its rebake could be evicted (vector flashes).
- Ohm glows: exact-size 1:1 sprites (idle-baked per colour bucket and 2 device px size step), scaled sprite until ready.
- `look.ground` builds the season-merged st and real context once per frame, not per chunk call.
- Bench `back` case (render.js realGroundBack slices) + `REAL_ONLY='{"qs":[0],"kases":["calm","back"],"realLook":{...}}'` for quick runs.
- First-frame / state-change stalls (v0.0.21, `node tests/look_stall.mjs`, Chromium, gate 12 ms on EVERY q0 frame, first frames included;
  env `PRE=1` pre-warms, `QS=0,1`, `REPS`, `FRAMES`): (1) the kaleidoscope veil / line bakes per bar (KC entry change) ran in-frame
  (6-40 ms field spikes, 56 ms worst). They now go on the idle queue (first in line, generation-checked so a reused entry never gets a stale
  bake) and the last baked bar keeps drawing until the new one is ready; with no idle queue (look_test stub) they bake in-frame as before.
  (2) Chromium rasterises a 2D canvas lazily on its first use, so a fresh bake cost its raster on the first frame that drew it: every
  idle bake now ends with a 1 px `getImageData` to force that raster in idle. (3) The P1 dust pattern tile baked in-frame on first use
  (8-10 ms): it is idle-queued, a flat dust tint draws until it is ready. Worst q0 frame 56 -> ~6.5 ms.

### Sound → kaleidoscope (`look/kaleido.js`; ON by default, `opts.kaleido = false` turns every mapping off)
The kaleidoscope is driven by what is heard. `look/kaleido.js` only LISTENS (bus `note` / `ctl` / `moment`) and READS master state
(`music.chord / key / om / scale / jam / beat`); index.js bakes and draws. Each mapping has its own opt
(`opts.kaleido = { chord, key, rhythm, ohms, density, arc, moment, place }`, all true; `KALEIDO_OPTS` has the tuning numbers).

| opt | heard | seen |
|---|---|---|
| `chord` | chord (root, tones, quality, extensions) | slice count 5..12, re-chosen per chord; the morph starts on the NEXT beat and crossfades over one beat |
| `key` | om + key, mode | warm / clear (major) vs deep / cool (minor) colours; tension = a clash colour at the outer edge, spread colours |
| `rhythm` | beat, jam, syncopation | bar breath + beat push only in a jam or a big moment (none at rest); off-beat notes nudge it sideways per bar |
| `ohms` | each playing ohm | its own ring in its colour; timbre → spiky (bright / short) or rounded (soft); loudness → size + brightness |
| `density` | how many play | richer, not louder (ring alpha ~1/√n, deeper petals); past `rings` (5) the rest merge into one weave ring |
| `arc` | song.on / section / end | low and faint near the horizon → fills the sky → unwinds (spins back, sinks) over 16 beats after song.end |
| `moment` | `st.big` / bus `moment` | takes the sky; HELD to the next bar line, then settles over one bar |
| `place` | place heal | unhealed = thin (≤ 2 rings) and dusty (desaturated, fainter) |

- Off semantics: each opt off falls back to the v0.0.19 behaviour for that aspect only (e.g. `rhythm:false` = the old slow breath,
  `key:false` = the palette colours, `chord:false` = `L.sym`, `density:false` = 8 rings, no weave).
- Baked once per bar at a fixed small size (≤ 512 px), the per-ohm rings in that same bake. DEVIATION: the ohm rings are a separate
  small image of that bake, not drawn into the veil image: the veil is soft-light, so rings drawn into it would never read as light.
- PERF: while ohms play, the rings take the counter-turning veil layer's place (crossfaded in ~1 s), and in a big moment they are
  also baked into the lit layer, which carries them once its alpha is ≥ .6 x the ring alpha (else the ring image adds the rest):
  rest = 2 veil draws; jam = veil + rings; big moment = 2 lit (+ the fading veil). look_bench P1 q0 2.31-2.40 ms (gate 3.0),
  q1 1.87-2.03, q2 1.46-1.49, q3 0.43 (3 sequential runs).
- `look.api.ks` = the sound state; `look.api.kz` adds sym, symFrom, morph, ringA, rings, weave, lift, fill, nudge, breath, kick,
  tension, rich, modeB, heal, arc, jam, depth, ringP.
- Stills: `node tests/look_kaleido_stills.mjs www <out>` (rest / solo / jam / big at 412x915, dpr 2; notes posted on the app's bus).

#### Lookfeed fields read (v0.0.21; master `www/js/lookfeed.js`, via the look ctx as `feed`; each keeps its fallback when absent)
| field | used for | fallback (null / not a number / getter throws) |
|---|---|---|
| `music.chord.kind` | `'other'` (not stacked thirds) +.18 richness; no 7ths on master (a music question for Wilbow) | quality + off-chord notes |
| `music.mode` | mode name → brightness (lydian .95 … locrian .1), half of `modeB` | the scale's third + chord quality |
| `harmony.tension` (`ctx.harmony`) | tension = edge clash, colour spread | `ctx.songs.discord(top song)`, then bus `song.discord`, then root table + off-chord notes |
| `ohm.timbre { bright, damp }` | sharp = .75·sm(.3,.8,bright) + .25·(1 − sm(.2,.8,damp)), refreshed every note | `ctx.recipeOf(o).modal.p`, then `src.bright`, then a seed hash |
| `ctx.song { phase, progress }` | continuous arc (lift / fill / alpha from progress); phase `'end'` starts the unwind once per song id | bus `song.on` / `song.section` / `song.end` |
| `ctx.jam { on, you, pairs, k }` | your grid = 1, autojam pairs = .55 + .45·k + .1·pairs | `music.jam` + note `jam` flags |

Syncopation stays our own off-beat count (no honest source on master). `look.api.ks.feed` = which fields came from the lookfeed
this frame (READ-ONLY). Test: `node tests/look_kaleido_feed.mjs`.

#### Night veil (v0.0.21)
Soft-light over a near-black sky does nothing, so at night the veil is also a faint LIGHT in the sky: the same baked veil layer
(same turn / scale / clip to the sky) drawn once more with 'lighter' at veilA × `opts.kaleidoNight` (.45) × the night weight of
`skyLight(world.env.day)`. Day: weight 0 (unchanged). Big moments: the veil pass fades with bigS as before (the lit lines carry it).
`look.api.kz.nightVeil` = the factor used. Cost: one extra draw per veil layer at night only.

### Tradition auras (v0.0.23, `look/aura.js`; OFF by default: `opts.realLook.tradAura = true | {…knobs}`)
Rare / master ohms get a procedural tradition aura behind the body; ordinary ohms only get a hint of the tradition colour in
their glow (`ordTint` .3; rare `rareTint` .45). Eight patterns, all drawn from code (no stamped symbols): folk rose window ·
raga lotus + drone glow (night / dusk / day palettes, curling glide) · maqam 8/10-fold star lattice + microtone two-colour shimmer ·
gamelan counter-turning boss rings + gong pulse · Japanese seigaiha / asanoha with empty space + breath brush trail · West African
woven bands crossing 3 against 2 · Celtic unbroken over-under interlace + spirals · techno stepped squares + scanlines on the kick.
Rare body looks follow rare_ohms_spec.md point 1 only: shimmer (a sheen sweep, source-atop), extra glow rings (1.22 / 1.5, master
+1.8 body radii), an unusual body shape (a silhouette in the ohm's own colour drawn just behind the body; ohmdraw owns the body).
Master / teacher: richest and widest (×`masterScale`, an extra ring + a halo). Growth option A (`tradAura.grow`): level from
`o.growth` via `growL` (hatchling .6 … master 2).
- Fields read: `ohm.tradition` (id / alias string, index, or an object `{id, auraPalette, auraPattern}` overriding the table),
  `ohm.rarity` (number, 'rare' / 'master' / 'teacher', `{tier}`), `o.rare`, `o.teacher` / `o.master`, `ohm.personality` (number or
  `{bold, playful, curious, social, lively}`), music flags `o.glide`, `o.offScale`, `o.gongPhase` (or under `o.music`).
  `TRADITIONS[i].auraPalette {glow, line, fill, accent}`, `.auraPattern {kind, fold, density, speed[per ring], loopBeats, pulse,
  beatLock, swing, calm, sig}`.
- Fallbacks: no tradition → a stable hash of `o.id` picks one; no flags → glide = a pitch move under 3 semitones, offScale = a note
  > 25 cents off 12-TET, gongPhase = (beat / 32) % 1; loudness = the ohm's glow envelope.
- Dynamics: each pattern loops seamlessly over `loopBeats` (each ring turns a whole symmetry step), speed by personality (calm ohms
  drift, lively ones flicker), pulse on beat / bar / phrase × beatLock (+swing), brightness by loudness, and a signature event per
  tradition (phrase, glide, offScale, gong, breath, downbeat-2, sustain, kick) that lights an additive pass + afterglow.
- Cost model: frames baked in idle slices per (tradition, tier, light bucket, size bucket `sizeStep` 1.06 with hysteresis), NF from a
  per-set byte budget (`setBytes`), cache `capBytes` 40 / 24 / 12 / 1 MB by q. Per frame: 1:1 blits only (dst-over), crossfade for the
  first `fadeN`, 1–2 live lines (`live`), `max` ohms per q. `look.api.aura` (info, stats, paintAt for tests).
- Measured (tests/look_aura_test.mjs, software Chromium, 10 rare incl. 3 master, r 26–34 CSS px, dpr 2, all baked): default
  ≈2.8 ms/frame; sheen off ≈2.4; no fades / live ≈1.8; lean (no sheen / fades / live, maxD 256) ≈1.2. The ≤0.15 ms target is
  not met in software raster (fill-rate bound: ~1–1.5 ns per device px blitted); expected far lower on a GPU canvas — re-measure on device.

### Rare look (v0.0.24, `look/rare.js`; ON: `opts.realLook.rare = false | {…knobs}`; rare_ohms_spec.md point 1)
Master's rare shapes (`o.rareSig.shape` star / long / twin / wave, from `o.body.ring` — genes.js restPoint) come through in the real
body material + light: a baked lit silhouette (edge, rim, crease, eyes from the stable ring), never flattened to a sphere. Shimmer
(sheen sweep, source-atop), twinkles, and extra glow rings that echo the shape softly (`RLOBE` cosine lobes × `ringShape`).
- Hook (render.js calls it around drawOhms): `look.rare(g, o, x, y, r, layer, info)` → `true` for a shaped rare ohm it handled.
  Layer 0: the extra rings (first `max[q]` per frame) and hides drawOhms' round blob for this ohm (swaps `o.body.ring` for a zero
  ring; restored at layer 1 or by the next `look.frame`). Layer 1: restores the ring and draws the shaped lit body + shimmer +
  twinkles. `look.ohm` falls back to the same body (with a blob erase) when the hook did not draw that ohm this frame.
- Knobs: `max` per q, `rings`, `ringA`, `ringShape`, `shimmerA`, `sparkN`, `sizeK` (sprite size step, no breath in the key),
  `lightTol` / `lightTau` (smoothed light colour, re-key only past the tolerance), `capBytes`, `syncBakes`, `hideBlob` (false = keep
  the blob and erase instead), `off: {rings, sparks, sheen, erase}`.
- With `tradAura` on, rings follow the build stage: stage 1 → 1 ring (+1 master), stage 2 → 2 (+1), stage 3 → full.
- Tradition aura build stage (Wilbow 5:40 PM MDT): `tradAura.stage` 1 (default, simpler: no bloom, one frame ring, no extra outer
  rings, level cap 1.3 = smaller master) · 2 (cap 1.7, half bloom) · 3 (full tiers.jpg / dynamic_strips.jpg). `tradAura.grow`
  default true (option A): the level grows with `o.tier` / `o.xp`, hatchling → master, inside the stage cap. tradAura itself stays OFF.
- Bakes: rare and aura jobs share the idle slice with ground / planets / stars (`bakeSlice`), so neither starves.
- Bench (tests/look_bench_real.mjs, headless Skia, q0 dpr 1.5, 10 rare of 50): ≈0.2–0.5 ms over calm (noise ±0.1–0.3; one outlier
  run 5.6 ms during cold bakes); the 0.15 ms target is met only at q3. Stills: tests/look_rare_stills.mjs.
- Fixed (v0.0.25): ground vegetation stalks drew over ohms (pre-existing, 6c0983e) - systems' plants now draw through render.under, right after the main canvas clear, before every ohm.
- Crowded jam (v0.0.25, fa47470; `tradAura.way {on, a .45, k .8, hit .85, depth 2, tau .25, keep .15}`): where rare auras overlap they
  make way - the playing / loudest (priority loud + .25 sig, +keep for the current leader) keeps full strength; a weaker one that
  overlaps it softens (×`a`) and pulls its pattern + rare rings in (×`k`, a smaller size bucket); one that would stack `depth`+1 deep
  hides. Eased over `tau` s. Patterns never stack more than ~2 deep, and pulled-in / hidden auras blit fewer pixels. `look.api.aura.way(o)`.
- Less cartoon (v0.0.25): the rare body has no ink outline - a hair-thin hue-dark edge (`edge` .22, `edgeW` .035) keeps the
  silhouette clear; inside: the ohm's own light shading, an inner-shadow limb darkening (`limb`, `limbW`), a subsurface hue glow
  toward the light (`sss`), a soft key rim in the light colour (`rim`, `rimW`) and a faint cool back rim (`back`). All baked into the
  body sprite (no frame cost). Techno aura at stage 1: thinner neon squares, each with its own blurred glow, lighter scanlines.
- Cost (v0.0.25, tests/look_rare_cost.mjs: only the rare part timed, 10 rare of 50, q0 dpr 1.5, headless Skia raster, median of 5×300
  frames): tradAura on (stage 1) 0.923 → **0.60 ms**; aura off 0.433 → **0.30 ms**. What changed (no feature cut):
  aura under the body (rare layer 0, source-over instead of destination-over: Skia dst-over ≈2× the fill cost; look.ohm skips it,
  `aura.drawnNow`); signature folded into the frame alpha (`tradAura.sigMerge`, only the overflow past 1 goes additive); every rare
  sprite cropped to its painted bbox at bake time into its own small canvas (`rare.crop`; a source-rect blit of the big one is no
  faster) - 385 → 216 device kpx/frame; twinkles from ONE shared sprite set pre-sized per device size, blitted 1:1 at whole pixels,
  their feature points cached per body sprite (no per-frame outline). Shared bakes: the aura frames (pattern + frame ring) per
  (tradition, level, stage, light bucket, size); the twinkles; the rare rings + sheen stay per ohm (they echo its own genes / clip
  to its own silhouette). What is left at q0 (aura on): aura frames ≈0.15, crossfade (4 ohms) ≈0.09, live lines (2) ≈0.10, rings
  ≈0.07, twinkles ≈0.05, sheen ≈0.02, body ≈0.13. 0.15 ms is not reachable here with every feature on: the aura frames alone
  are ~255 device kpx at α<1 (~0.6 ns/px). Re-measure on a phone (GPU raster) before deciding cuts (fadeN / live / max per rung).
- tests/rare_test.mjs page-error flake: not reproduced in 14 runs (8 serial, 6 in parallel under load); the test uses fixed waits
  (2.5 s boot, 300-1500 ms zoom waits), so a load-timed race is the likely cause. RARE_STACK=1 prints the stack if it recurs.

### `look.ohmRole(g, o, part, x, y, r, st)`: the role on the body, no text (`look/role.js`, ON; opt-out `opts.realLook.role = false`)
Roles come from what an ohm plays right now (`lookCtx.roleOf`, i.e. `systems.roles.of`) and can change; nothing is a permanent lead.
- **bass**: a deep, heavy blue glow low in the body; slow 2-beat swell.
- **lead**: a bright crown at the top, a soft upward beam and three motes rising each beat.
- **rhythm**: a crisp ring plus inner flash on each hit (bus `note` from the ohm, or a glow jump), decaying ~0.3 beat; on the beat grid when quiet.
- **pad**: a soft, wide, even veil across the whole body, 4-beat breathing.
- A role change crossfades over `fade` beats (default 1).
- Ordinary ohms: the cue is baked into the lit body sprite (levels × roles, plus pre-baked crossfade steps), so it stays at one blit. Rare ohms and anything not baked yet get one 1:1 `lighter` blit of a shared cue sprite from `ohmRole` after the body, so the cue reads on rare shapes and next to auras.
- Cost (tests/look_rare_cost.mjs, 50 ohms, q0 dpr 1.5, 10 paired runs): about 0.04 ms/frame (means). Memory: the lit-variant sprites push the pool to about 16 MB (1090 sprites, 0 evicted in the bench). Watch this on low-RAM phones.
- Tuning: `opts.realLook.role = { fade, poll, bassLv, leadPh, rhyLv, padLv, hitDecay, quietBeats, acc, k0 }` (see `ROLE_OPTS`).

## look/audio.js: one visual per st.audio system

Wilbow, 12:23 AM Oct 26: "The visualizer connections to the audio engine...". This is the job from 1:03 AM.

- **Systems.** One light visual per st.audio system, oldest first: om, notes, strings, bars, membranes, jam, arc, trad, abilities, muffle. The player-terms list is in `softsound_previews/journey/audio/AUDIO_VISUALS.md`.
- **Event waves only.** A wave starts when an onset field (`*.onset`, `*On`, `om.heart`, `jam.down`, a new trad step) rises, and it dies out within 0.4 to 3.2 s. Nothing runs between events. The muffle haze is the one exception: it is a state rather than an event, so it shows only while `muffle.amt > 0`.
- **Light, not lines.** Each wave is one blit of a sprite baked once per (shape, pitch-class hue, colour step), using `'lighter'` blending. The breakdown shadow and the muffle haze use source-over. There are no outlines, no text, and no per-frame gradient, filter or shadowBlur.
- **Trippy scaling.** Brightness is `floor + (1 - floor) * st.trippy` (floor .35). Colour saturation is `st.trippy` in 5 steps, so at the start of the game (.05) a wave is near-white light.
- **Positions.** Waves placed in the world use st.audio's x, y (world units, re-projected every frame with space.js toScreen) and fade with the ohms' own zoom fade. Waves tied to the screen sit on the land line or the anchor.
- **Opts.** `opts.realLook.audio = false` turns everything off. To turn off one system, use `{ <system>: false }`. Other tunables are `floor`, `max` (live waves, 28) and `hold` (min seconds between two waves of one kind, .07). At run time use `look.api.audio.O`.
- **Hook.** It is drawn in look.post, after whatever look.post already draws (the ohm canvas, over the ohms).
- **Cost.** Headless 412x915: an idle frame (no waves) takes about 1 to 3 us; each live wave takes about 2.5 us.
- **Test.** `node tests/look_audio_test.mjs [www] [png dir] [systems]` fires one event per system in the page and makes the stills. It checks that waves start, that each opt turns its system off, and the cost.

## Mode-aware colour (v0.0.29 jam keys: relative or parallel minor)

- **What it reads.** look/palette.js and look/kaleido.js colour by the sounding scale: `music.mode`, `music.modeHow` and `music.semi()`. An engine without these falls back to the third of `music.scale` (the old reading).
- **Relative minor.** It has the same pitches as its major, so it keeps the major's hues: home key = key + 3, and the degrees are re-expressed.
- **Any minor** reads as a shift in light, not new hues:
  - palette: cooler kelvin (.35 to .75 of the range), materials about 16% deeper and slightly less saturated
  - kaleido: chord quality is read from the minor's own degrees (i, ii°, III and so on)
- **Crossfade.** A key or mode change, including one through a pivot chord, crossfades over about a bar:
  - palette `fadeBeats` 4; kaleido `keyFadeBeats` 4
  - live swatches and key light glide every frame
  - baked ground and planet tints (palKey) step only `fadeSteps` (6) times
  - a second change during a fade starts from the colours already showing
- **Opts.** `opts.palette.mode` / `opts.kaleido.mode` = false brings back the old reading. Test: `node tests/look_mode_test.mjs`.

## Tune flash (`ohm.tune`)

When playtwice teaches an ohm its tune it posts `ohm.tune {src}`. look/index.js subscribes (defensive: nothing happens on a build without
playtwice) and calls `look.api.ohmChar.tune(o)`. The ohm's character draw then adds one small blit for `tuneLife` (1.4 s): a warm
(`tuneCol` 255,206,140) radial glow inside the body's smallest radius, rising in 90 ms, shrinking and sinking a little as it fades
(settling into the skin). Once the glow is past `tuneSettle` (55%) the skin marks (B) bake one step deeper: depth += `tuneDeep` (.08) per
tune taught (`o.tune.n`, max `tuneMax` 2), so the change lands under the glow and the old sprite stays on screen until the new bake is
done (no pop). Undo (o.tune put back) takes the marks back. Cost: nothing when no flash is live; during a flash one 64 px sprite blit
(~12 us headless CPU raster at r 27 px, under a body blit's ~28 us). `OHM_CHAR.tune = false` turns it off. Only character-look ohms (the
ohm scale) show it; rare ohms and the close / cell scales do not. Test: tests/look_tune_test.mjs (real app, synthetic event).

## v0.0.31 sweep fixes (each behind its own opt, ON; false = the v0.0.30 look)
- **Ground** (`GROUND_OPTS`, look/ground.js): `seaMist` (26 px) / `seaMistA` (.9) put a soft haze off open-sea crests, so a back hill fades into the sea instead of cutting (seed 42 y≈576). `shoreFade` (14) / `shoreSide` (10) / `shoreK` (.72) add a soft shore fade on water edges, which removes the right-edge notch and the seed 20261025 pale bottom-right strip. 0 = off.
- **Planet** (`PLANET_OPTS.edgeAA`, look/planet.js): an anti-aliased disc edge. Pixel coverage goes into the edge alpha and the rim normal is clamped, which fixes the jagged left rim. false = the hard edge.
- **`look.planetRim(c, x, cy, r, st)`** (`calmRim`, look/index.js): the bent-planet rim as a calm neutral air band (radial gradient annulus). It takes colour only with music × st.trippy and the pulse. render.js already calls it (drawPlanet); false = render's softRing.
- **`look.node(g, x, y, sz, ohm, st)`** (`nodeGlow`): a far-zoom ohm speck as a soft glow dot in its pitch colour (ohm.hue). It is muted at rest and fuller with music × trippy and the ohm's glow. Sprites are baked once (24 hue × 8 colour steps, 32 px) and each call is one drawImage (~3.7 us headless). It needs the call in render.js specks() (GAMEDEV_SPEC H5); until then the squares stay. Test: tests/look_node_test.mjs.
- **Dive waves** (`DIVE_LOOK.waveRest`, look/dive.js): a partial's wave lane shows only while that partial sounds (pflash), and at rest nothing is drawn. 1 = the always-on lanes. The whole-voice filled wave and the scope line are world-side (GAMEDEV_SPEC H4).
