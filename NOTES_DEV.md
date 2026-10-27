# NOTES_DEV: The Journey Ohm (new engine), the builder's working notes
**STATUS: PENDING WILBOW'S APPROVAL OF Q277 (start the new engine) AND THE STACK QUESTIONS. No game code exists yet.**
Rewritten Sat Oct 24 2026, 10:18 PM MDT to match NEW_ENGINE.md (softsound commit 5ab1fcc). NEW_ENGINE.md and Wilbow's quoted words are authoritative; this file is the builder's checklist.
Missing docs: CONCEPTS.md and GAMEDEV_RESOURCES.md are not on disk yet (Philosophy & Spirituality bot). THREE_MIGRATION.md was folded into NEW_ENGINE §9 and does not exist as a separate file.

## 1. Approval state
- Direction (10:07 PM MDT Oct 24): "Rember complex procedurally generation engine are what i want built not a bunch of patches.  We need to keep what we've built before in mind conceptually but realize that we're are abandoning the product for something better"
- Old game frozen (10:08 PM card, "Stop everything now"; Q293 ANSWERED).
- Role (10:13 PM): "That game dev bot will take you current role and you will oversee the others". This bot is the builder (code, builds, APKs, logging). Resonance oversees.
- NOT approved: Q277 (start), Q278 (app/appId), Q280 (stack), plus everything else in Q258-292 and Q294-296. NEW_ENGINE.md is marked "SCOPING, not approved for build".
- Priority order for every tradeoff (9:55 PM): 1 scale (many ohms and elements), 2 always runs well (9:54 PM "It needs to run well always"), 3 beauty.

## 2. Stack (proposed, Q280)
Capacitor shell + TypeScript (esbuild) + three.js/WebGL2 (ortho 2.5D, instancing, shaders, no Canvas2D in the main path) + our own AudioWorklet DSP (modal pool, inst engines, tract, drums, FDN, limiter; data-URL worklet loading) + Rust/C to WASM only where measured (WASM DSP if the worklet is over 50% on the device; WASM physics if T0/T1 misses the gate). Godot is the fallback if JS CPU limits bite.

## 3. V0 Skeleton (5-7 builder-days), in build order
1. Repo: `git init` /workspace/resonance2 (only after Q277), TS + esbuild, lint/test runner (node headless).
2. Capacitor Android shell: appId per Q278 (proposed `com.lensure.journeyohm`, installed next to Resonance), WebView, signing via KSP, the same release flow as the old game.
3. Seed tree: stable 64-bit hash (splitmix/xxhash as 2x uint32), `seed(child)=hash(seed(parent),kind,index)`, no global RNG, versioned generators.
4. Delta store: keyed by node-path hash, versioned typed components, unknown components kept, migrations (persist.js concepts).
5. Worker plumbing: 1-2 generation workers, transferable typed arrays (SharedArrayBuffer only if cross-origin isolation works in the WebView, which is unverified).
6. U clock in the AudioWorklet: sample-accurate, mirrored to the main thread and workers as (t0, bpm). Default 60 BPM (Q258), F0 default (Q264).
7. three.js renderer: floating origin, gradient sky shader, a planet ring that breathes on the heartbeat.
8. Quality ladder + frame-time EMA (+ EXT_disjoint_timer_query), thermal and battery caps, hidden-app pause.
9. WebGL context-loss recovery (everything re-creatable from CPU state), tested with WEBGL_lose_context in Playwright.
10. PERF harness (headless) + on-device frame-time probe in dev mode (mean, p95, worst, per-system ms over 5 min).
- V0 player view: "A pulsing gradient sky and a planet ring that breathes on the heartbeat."
- V0 gate: empty scene <= 2 ms/frame on the device; context loss recovers in <= 500 ms.

## 4. V1 Vertical slice (20-28 builder-days), the go/no-go point
1. One procedural planet: chunked 2.5D ring terrain (GPU mesh strips, height texture), deformable (height-delta brushes, int8 1/4-res deltas), biome fields, one tradition (Q281).
2. Ohms from genomes (about 240 genes, mutation 0) with tiers T0 full soft body (<= 24, <= 0.12 ms each), T1 skeletal puppet + GPU wobble (<= 300, <= 0.01 ms, promoted to T0 on touch), T2 summary (<= 5,000), plus sleep. ECS typed-array columns, no per-frame allocation.
3. Instanced SDF bodies per body plan, auras (one instanced pass), GPU particles, far ohms as glow points (Q284).
4. Music: per-ohm brains per bar, area ensemble node with jam -> song states (9:18 PM), tradition grammar (TRADITION_REFERENCE), groups already mid-song when found.
5. Harmony: the 8 checks per bar on screen and per minute off screen, h = exp(-err/scale), ratchet (no un-bloom), upward spread; area and planet bloom from one number.
6. Snap-zoom camera: planet -> area -> ohm -> interior -> wavelengths, magnetic detents, ±15% membranes, ~250 ms spring settle, phase-aligned audio morph at the next landing.
7. Audio: focus voices (32-voice modal pool and engines) + a ~20-voice bed engine + up to 16 atom sines, voice budget and stealing, partials posted at 30 Hz.
- V1 player view: "A living planet of 300 ohms jamming toward harmony; healing an area makes it bloom; one continuous zoom from planet to partials."
- V1 gate (reference phone, Q283): 300 ohms, 120 on screen (24 T0 + 96 T1), with plants, bugs and particles; 60 fps; main-thread sim <= 5 ms; render submit <= 4 ms; p95 frame <= 16.6 ms; no frame > 33 ms in a 5-minute run; worklet <= 50%. If it fails: change the tiers or move to WASM physics BEFORE carrying any features over.
- Later stages: V2 scale out (15-20), V3 hands/carried concepts + GESTURES re-check (22-30), V4 music tools/DAW lenses (15-20), V5 journey and beauty (12-18). Total about 90-125 builder-days.

## 5. Perf gates and quality ladder (hard rule: a stage cannot ship without meeting its gate)
- Gates per stage: V0 as above; V1 as above; V2 2,000 ohms/planet, 300 on screen, a streaming hitch of at most 1 frame over 33 ms per minute; V3 the same gate plus gestures 1:1; V4 opening a lens costs <= 2 ms; V5 the ladder holds 60 fps, beauty only above step 0.
- Main-thread generation integration <= 2 ms/frame. Texture memory <= 96 MB (LRU). APK < 6 MB.
- Ladder (step down after 1 s over budget, step up after 5 s under, at most 1 step/s): 1 DPR cap 2 -> 1.5; 2 bloom half-res, then off; 3 DoF off; 4 particles -50%; 5 simpler body shader; 6 T1 cap 96 -> 48; 7 DPR 1 -> 0.75. Throttling trend: step down early. Battery saver: cap at step 2. Hidden: render stops, beds go to a drone or pause. Q295 asks to approve this.
- Fallback: WebGL2 required, WebGL1 emergency path; lite mode for no-WebGL is Q294.
- Measured baseline (box, pessimistic): about 20-25 on-screen ohms at 60 fps today, estimated 10-15 on a phone; the wall is CPU soft-body sim then Canvas2D raster; brains are cheap (1.2 ms at 76 ohms); modal pool 0.15 ms/block (5.6%). Raw data: /workspace/softsound_logs/three_scope/.

## 6. Questions Q258-296: which block V0 / V1
- **Block V0 start:** 277 (start), 280 (stack), 278 (new appId vs replace; decides the Capacitor shell and the signing identity). 283 (reference phone) is needed for the V0 device gate; V0 can be built before it, but not passed.
- **Default-able in V0 (constant only, cheap to change):** 258 (60 BPM universal pulse), 264 (F0), 259 (tempo ratio table), 295 (auto quality, on by default), 294 (WebGL2 required).
- **Block V1 design:** 281 (2.5D planets), 282 (slice scale bar), 283 (reference phone = the gate), 284 (far ohms simpler), 286 (physics up close only), 285 (start out of tune, the baseline curve), 291 (two ways down; V1 zooms ohm -> interior -> wavelengths only), 262 (zoom sound morph), 273/274 (atoms layer shows and plays partials, colours), 270 (never un-bloom ratchet), 263/266/267 (planet keys from one root), 292 (import old genomes or start fresh, decides the genome format compatibility). 287/289 affect V1 camera gestures (DNA by zoom, two-finger pan).
- **Not needed until later:** 260/261 tap tempo and lean (V3), 265, 268/271 ending (V5), 269 chaos knots (V5), 272 respect check (before release), 275 bugs (V2), 276 blend zones (V2), 279 A-U-M flavour (V5), 288 new-universe hold (V2), 290 DAW by zoom (V4), 296 concept check (before V3 is called done; better before V0).
- 293 ANSWERED (old game frozen).

## 7. Toolchain status (checked this evening, re-confirmed 10:18 PM MDT)
- JDK 21.0.13 at /home/box/jdk (not on PATH: `export JAVA_HOME=/home/box/jdk PATH=$JAVA_HOME/bin:$PATH`).
- Android SDK /home/box/android: platform android-35, build-tools 34.0.0 + 35.0.0 (zipalign, apksigner), platform-tools, cmdline-tools. ANDROID_HOME/ANDROID_SDK_ROOT must be exported.
- Gradle 8.11.1 cached. Node 20.19.2, npm/npx. Playwright Chromium 1248 cached (SwiftShader). Disk 118 GB free.
- Not installed globally: TypeScript (tsc) and esbuild. three + esbuild exist only in /workspace/softsound_logs/three_scope/node_modules (throwaway). The new repo needs its own package.json: typescript, esbuild, three, @capacitor/{core,cli,android} (pin one major; softsound mixes cli ^7 with core ^8), playwright.
- Signing: /workspace/lightsynth/lensure-upload.jks, alias lensure, cert SHA-256 db171c70...dc7d1f. Password only from env KSP (read, then `unset KSP`; never printed). KSP is NOT set in executor shells; whoever runs the release must provide it. The password is a placeholder (R9.9, OPEN: replace before Play).
- Release flow template: /workspace/softsound_logs/release_b9b.sh (tests -> cap sync -> assembleRelease -> zipalign -p -f 4 -> apksigner v1+v2+v3 -> verify cert + versionCode -> UploadFile to Wilbow's Drive).
- Repo: /workspace/resonance2 holds only this file; NOT a git repo (git init waits for Q277).

## 8. Gaps and conflicts found in NEW_ENGINE.md (for Resonance/Wilbow)
1. Appendix A misses several Oct 23 approvals: names/languages/voices/bands + two-finger-tap full introduction (6:35 PM Oct 23) and the names/intro rules (5:04-5:08 PM); all ohms learn sounds, "Alone, but rarely" solos (6:59 / 7:25 PM); drummers grow a full kit by learning (8:50 PM); learned strands + experience-gradient auras (8:51 / 8:57 PM); song state preserved across background AND close (7:28 PM); mic dip-and-return (6:22 PM); catch anywhere (6:48 PM); jam auras + aura lab (7:57 / 7:58 PM). The A2 note says Oct 23 is covered through R-items and V08_SPEC, but no rows mention these. Also the Oct 24 jam view approval (5:43-5:51 PM, 12 controls + pinch into the jam centre) has no A2 row, and the 9:54-10:07 PM goals (scale, zoom, terrain, pulse, om, title) appear only in the body, not as inventory rows.
2. A5 covers GESTURES.md §1 only. Later gestures are missing: two-finger tap introduction, double-tap mouth control, pinch into the jam centre (jam view), DAW paint gestures, egg strokes, clay/ink/retrace, item take/knock/split, play/listen swap, conducting details.
3. §7.3 is referenced by A5 ("REDESIGN (detent, §7.3)") but does not exist (only §7.1 and §7.2).
4. Mis-tags: A3 "Y. Styles as data, 10 traditions, culture blend, teacher trait + aura, jam novelty learning" -> "GPU shaders (§9)" (should be tradition grammar §6.2 + aura pass); A1 R1.6 "inherited note data" -> "sim tiers + sleep (§8)" (should be genome/brain).
5. Q289 two-finger pan at every depth vs existing two-finger gestures: pinch on a body (tension), pinch on an ohm (squeeze), twist (DAW / cutoff), two-finger still hold (conducting), two-finger tap (introduction), DAW two-finger edits, register pinch. It needs a pan-vs-pinch-vs-twist-vs-hold disambiguation spec and a §13-style conflict check before the V1 camera, not only in V3.
6. Membrane hysteresis vs inspect-zoom controls (envelope nodes, register, vibrato) at the ohm detent: register is read only when settled, but the envelope drag and vibrato strokes also need "settled" rules.
7. Q278 + signing: a new appId reuses the Lensure upload keystore (fine for sideloading; for Play each app gets its own upload key, ask). Old saves and the ark world are unreachable by design (Q292).
8. Capacitor version mismatch in the old package.json (cli ^7.6.9 vs core/android ^8); pin one major in the new repo.
9. The V0 device gate needs on-device numbers back from Wilbow's phone: the probe needs a way out (the diag webhook concept or a Drive upload of the probe log), which is not in the V0 list.

## 9. Concept inventory checklist (mirrored 1:1 from NEW_ENGINE.md Appendix A; [x] = ALREADY OUT before today; tick a row when it has a test or demo note)

#### A1. DECISIONS.md register (Resonance R1–R10)
- [ ] R1.2 [IMPL] Spiral = creature, genome seeded from the stroke. -> **CARRY**
- [ ] R1.3 [IMPL] Mutation rate 0, no random culture drift; only player DNA edits (randomness at creation OK). -> **CARRY**
- [ ] R1.4 [IMPL] DNA zoom below the body to genes; edit by slide/pluck/scramble/transfer; regrow. -> **REDESIGN**
- [ ] R1.5 [IMPL] Learned changes = epigenetic layer; offspring inherit learned changes as DNA (deterministic, not mutation). -> **CARRY**
- [ ] R1.6 [IMPL] Inherited note data: scale-degree melodies, rhythm separate, crossover at phrase boundaries, seams on chord tones. -> **CARRY**
- [ ] R1.7 [IMPL] Genome's main job = the instrument (timbre/texture/technique). -> **CARRY**
- [ ] R1.8 [IMPL] More genetic control from how the spiral is drawn (pressure, wobble, tightness, speed trend, pauses = motif rhythm, height, shape). -> **CARRY**
- [ ] R1.9 [IMPL] Clay shaping window with feedback from the newborn. -> **CARRY**
- [ ] R1.10 [IMPL] Plain spiral = quick randomised ohm, slightly fitted to its birthplace (birthplace lean) ('the plain spiral should generate a quick randomized ohm… -> **CARRY**
- [ ] R1.11 [IMPL] Every new ohm clearly distinct (minimum timbre distance). -> **CARRY**
- [ ] R1.29 [IMPL] Creatures learn from each other when prompted (drawn teach-line) so they harmonise and match rhythm; two out-of-key creatures can't breed. -> **CARRY**
- [ ] R1.30 [IMPL] DNA edits must change values you can see and hear. -> **CARRY**
- [ ] R1.13 [SPEC] Orbit hints: everything available after the spiral orbits the egg, current availability in every tier. -> **CARRY**
- [ ] R1.14 [SPEC] Tier 2 = doubling a glyph makes it stronger. -> **CARRY**
- [ ] R1.15 [SPEC] Stroke feel = vibe: speed sets synced base tempo (calm-frenzy); fast = distortion or double-time short-decay notes; slow = ambient; fast series =… -> **CARRY**
- [ ] R1.16 [SPEC] Tier 3 hidden combos shown as dim, unlabelled orbiters lit when one stroke away. -> **CARRY**
- [ ] R1.17 [SPEC] Glyph marks on ohms, wild ohms and fossils. -> **CARRY**
- [ ] R1.18 [SPEC] Unrecognised egg stroke = small random nudge. -> **CARRY**
- [ ] R1.19 [SPEC] Prompts for the end-of-spiral hold (filling ring + rising tone; orbit hint; guide demo). -> **CARRY**
- [ ] R1.21 [PROP] Birthplace-lean tuning option 1-4 (recommended 3+4). -> **OPEN**
- [ ] R1.22 [PROP] Plain spiral now hatches when the 1.5 s egg window closes instead of v0.6.2's 0.45 s quick spawn. -> **OPEN**
- [x] R1.24 [REJ] Shaky vs smooth line = grit vs purity modifier (T2 #3) (note: v0.3.2-pre spiral wobble->grit reading is older and unaffected). -> **ALREADY OUT**
- [x] R1.26 [REJ] Attribute glyphs drawn over a creature (list items 1-14). -> **ALREADY OUT**
- [x] R1.27 [SUP] Clay window after every spiral (8 s ring). -> **ALREADY OUT**
- [ ] R2.1 [IMPL] Each creature a clearly different instrument built from genes, not presets. -> **CARRY**
- [ ] R2.2 [IMPL] Highly varied, tuneable sounds incl. envelope manipulation by touch (halo, DAW bead edges). -> **REDESIGN**
- [ ] R2.3 [IMPL] Many synth engines (VA, FM, wavetable, additive, PD, fold+LPG, ring/AM, KS/waveguide, wind/reed, modal, membrane, vocal tract, granular,… -> **CARRY**
- [ ] R2.4 [IMPL] Percussion as a gradient gene; specialised drum ohms (kick, snare/clap, hats, toms, full kits). -> **CARRY**
- [ ] R2.5 [IMPL] Much wider palette: drones, wind, shimmer, bowed, mallet, glass, choir, sub, gritty leads, moving pads (23 archetypes). -> **CARRY**
- [ ] R2.6 [IMPL] Vocal tract voice; spoken/handwritten words sung by creatures. -> **CARRY**
- [ ] R2.7 [IMPL] Effects are physical world items ohms seek, carry, wear, trade. -> **CARRY**
- [ ] R2.9 [IMPL] Sound comes from real physics/vibration of the one soft material. -> **CARRY**
- [ ] R2.11 [IMPL] Nine sound-variety/replay ideas (materials, sound depends on the air, roles from genes made continuous, star-type groove, weather/geology, cosmic… -> **REDESIGN**
- [ ] R2.12 [IMPL] Rods sound only on real hits (not constant noise). -> **CARRY**
- [ ] R2.13 [IMPL] Lots of nice colour palettes, with sound correlated to them. -> **CARRY**
- [ ] R2.10 [SPEC] Senses as audio filters while driving an ohm (listener at the ohm, deaf muffle). -> **CARRY**
- [ ] R2.8 [GAP] Player draws a closed shape -> effect item (form + material set the effect). -> **CARRY**
- [ ] R3.1 [IMPL] Real music by default; musicality is the top acceptance criterion. -> **CARRY**
- [ ] R3.2 [IMPL] Real music theory in sound and DNA (scales, harmony, voice leading, counterpoint, rhythm, motif development). -> **CARRY**
- [ ] R3.3 [IMPL] No composer: per-ohm musical minds with highly varied scales/tunings, moods, harmony, rhythm and melody grammar. -> **CARRY**
- [ ] R3.4 [IMPL] Shared rhythm; environment only lightly seeds the starting tempo, never dictates. -> **CARRY**
- [ ] R3.5 [IMPL] Cohesion glue without a composer: consensus key, emergent chord cueing, shared pulse, aligned cadences, bass anchor, register space, one acoustic… -> **CARRY**
- [ ] R3.6 [IMPL] Real song development, audible progression, never the same phrase over and over. -> **CARRY**
- [ ] R3.7 [IMPL] Jams settle into a harmonious arrangement, lock in, keep going, persist while away. -> **REDESIGN**
- [ ] R3.8 [IMPL] Bystanders watch quietly; tap to join, tap a member to mute/unmute. -> **CARRY**
- [ ] R3.9 [IMPL] Breakdowns in long jams. -> **CARRY**
- [ ] R3.10 [IMPL] Song form, rests, tension/release, dynamics. -> **CARRY**
- [ ] R3.11 [IMPL] Day/night moods, day length shapes phrases, audible weather. -> **CARRY**
- [ ] R3.12 [IMPL] Real modulation (pivot chords to IV, V, ii, relative, parallel). -> **CARRY**
- [ ] R3.23 [IMPL] Certain creatures can change the beat. -> **CARRY**
- [ ] R3.24 [IMPL] Roles never stop ohms harmonising (they play together) but ohms can step back and listen to keep balance. -> **CARRY**
- [ ] R3.25 [IMPL] World self-tuning must stay a light influence; ohms keep their traits and knowledge in new environments. -> **CARRY**
- [ ] R3.26 [IMPL] Loops synchronise after creatures go through communication; original DNA kept, offspring get the changed DNA. -> **CARRY**
- [ ] R3.27 [IMPL] Far fewer notes per creature, governed by music theory. -> **CARRY**
- [ ] R3.13 [SPEC] Ohms seek successful jams, learn; permanent experience layer on top of genes; jam outside genetic/environmental range. -> **CARRY**
- [ ] R3.14 [SPEC] Compatibility skill: integrate themselves and others. -> **CARRY**
- [ ] R3.15 [SPEC] Watched, fully matched jams grow longer and more complex; keep old loop; keep what works; explore in small doses; jam band + electronic craft. -> **CARRY**
- [ ] R3.16 [SPEC] Theory from many cultures, each with its own rules. -> **CARRY**
- [ ] R3.17 [GAP] Regional KEYS (approved in the v0.4 stage list); only a <=3% regional tempo lean exists. -> **REDESIGN**
- [ ] R3.18 [NOTE] Experience vs identity; matched-gate threshold tuning; cultures inside one consensus key. -> **OPEN**
- [x] R3.19 [SUP] Central composer engine (v0.3 first plan). -> **ALREADY OUT**
- [x] R3.20 [SUP] v0.2 shared conductor/gate as the source of musicality. -> **ALREADY OUT**
- [x] R3.22 [SUP] 60 s opening recording as the quality gate. -> **ALREADY OUT**
- [ ] R4.2 [IMPL] Lensure-style drawn glyphs reserved for important actions; helper can demo them. -> **CARRY**
- [ ] R4.3 [IMPL] Glyph picks 20 infinity bond, 21 undo hook, 25 guide demo, 26 sky constellation, 27 ghost completion, 28 personal variants. -> **REDESIGN**
- [ ] R4.4 [IMPL] Organic DAW river via two-finger twist; manual pattern editing; colony lanes side by side. -> **REDESIGN**
- [ ] R4.6 [IMPL] Gesture audit fixes C1, C2, C8, C11 (+ bug fixes C7, C9, C13, C18). -> **CARRY**
- [ ] R4.7 [IMPL] Play an ohm by hand (play mode: tap then hold; nodes, appendage tweaks, vocal tube; phrase twice = taught). -> **CARRY**
- [ ] R4.8 [IMPL] Delete: bubble + firm flick, 5 s tap-to-restore. -> **CARRY**
- [ ] R4.9 [IMPL] Teach by demonstration with no new gesture. -> **CARRY**
- [ ] R4.10 [IMPL] Record and share (star loop, 60 s, share sheet). -> **CARRY**
- [ ] R4.14 [PROP] Conducting read as two-handed (baton stays up only while the two fingers stay down). -> **OPEN**
- [x] R4.15 [REJ] Ground spawn glyphs 15-19, lightning 22, arc 23, snap-then-morph 24. -> **ALREADY OUT**
- [x] R4.16 [REJ] Audit items C4, C5, C6, C12, C14, C15, C16, C17, C19 (left unchanged). -> **ALREADY OUT**
- [x] R4.17 [SUP] Two-finger tap undo / three-finger tap redo (v0.1). -> **ALREADY OUT**
- [ ] R5.1 [IMPL] Creatures interact with each other, player creations and environment, gene- and context-driven. -> **CARRY**
- [ ] R5.2 [IMPL] Fusion into clusters, colonies building sounding structures. -> **CARRY**
- [ ] R5.3 [IMPL] Colony relations and non-violent musical duels. -> **CARRY**
- [ ] R5.4 [IMPL] All 25 special abilities from gene thresholds. -> **CARRY**
- [ ] R5.5 [IMPL] Blind/deaf and other senses as gradient genes. -> **CARRY**
- [ ] R5.6 [IMPL] Ohms mostly still, slowly approach a nearby partner; never wander or bounce off screen; stay home watched or not. -> **CARRY**
- [ ] R5.7 [IMPL] Creatures are called 'ohms'. -> **CARRY**
- [ ] R5.8 [IMPL] Behaviours 1-6 + 25 (v0.3); 11 crazes, 14 wind + wind-blowing ohms, 15 water, 16 caves, 21 day length (v0.4). -> **REDESIGN**
- [ ] R5.9 [IMPL] Body plans (blob, shell, serpent, strider, drum-belly, cluster, floater) + functional appendages. -> **CARRY**
- [ ] R5.10 [IMPL] All 8 symbiosis mechanics. -> **CARRY**
- [ ] R5.12 [IMPL] Cloud gas giants with floating ohms; void walkers; moon settlers. -> **CARRY**
- [ ] R5.17 [IMPL] Purpose: collecting specimens + breeding; all six purpose features (catch, ark, breeding, signals, awakening, habitability). -> **CARRY**
- [ ] R5.18 [IMPL] No physics glitches: creatures must not spin or fly away for no reason. -> **CARRY**
- [ ] R5.19 [IMPL] Every planet has a ground (bug: some had none); gas giants later with floating creatures (built v0.6 as cloud worlds with a hidden floor). -> **CARRY**
- [ ] R5.20 [IMPL] Direction: instrument builder + living sound creatures ('A and C'), physical and flexible, not 'a bunch of patches'. -> **CARRY**
- [ ] R5.13 [SPEC] Experience, compatibility, groove keeping (x-ref S3). -> **CARRY**
- [ ] R5.14 [PROP] Rider relationship variety: 7 options (body-plan riders, shared role, earned bond, shared home, ferrying, outgrowing, single-unit off-screen). -> **OPEN**
- [ ] R5.15 [NOTE] Carrier carries its rider to jams elsewhere (conflicts with stay-home). -> **OPEN**
- [x] R5.21 [REJ] Marble machine direction (option B, not picked). -> **ALREADY OUT**
- [x] R5.16 [SUP] Pairing #1 original (rider travels) and #16 original (crowded ohms move away). -> **ALREADY OUT**
- [ ] R6.1 [IMPL] Space setting: procedural galaxy and star systems, continuous zoom galaxy -> planet -> body -> DNA. -> **REDESIGN**
- [ ] R6.2 [IMPL] Big explorable planets; every change persists; time passes while away. -> **REDESIGN**
- [ ] R6.3 [IMPL] Natural life very rare, creatable by the player. -> **CARRY**
- [ ] R6.4 [IMPL] Exploration variety with guaranteed open space. -> **CARRY**
- [ ] R6.5 [IMPL] Lensure's best parts rebuilt inside the physics (lens = clear blob, droplet = prism, optics->pitch). -> **CARRY**
- [ ] R6.6 [IMPL] Biomes = blended continuous fields, never themes; #17 fields change with the music. -> **CARRY**
- [ ] R6.7 [IMPL] Plants grow from nearby music, organic and procedural, sacred-geometry rules, phi/Fibonacci, no symbols. -> **CARRY**
- [ ] R6.8 [IMPL] Caves (acoustics v0.4a, overhang roofs v0.6.1). -> **REDESIGN**
- [ ] R6.9 [IMPL] Visuals and world life: art direction, parallax, sky, critters, rare events, history traces. -> **REDESIGN**
- [ ] R6.10 [IMPL] Water = lightweight height-field pools (no particles); particle density capped per area. -> **REDESIGN**
- [ ] R6.17 [IMPL] No random ugly lines in the background or coming off creatures. -> **CARRY**
- [ ] R6.11 [SPEC] Cave roofs near ohms: build once clear or arch over the ohm. -> **REDESIGN**
- [ ] R6.12 [SPEC] Storm seed 53 root cause (flying ohms). -> **CARRY**
- [ ] R6.13 [SPEC] Random start world on every launch (galaxy, planet type, landing, starting ohms); no auto-load for now. -> **REDESIGN**
- [ ] R6.14 [GAP] Creatures carrying water (dew collectors #14 only carry droplets home). -> **REDESIGN**
- [x] R6.15 [SUP] Lensure assimilation roadmap: UV/IR hidden items, fire/air/earth elements, CA growth as material, fractal zoom into the material, binary/drawn… -> **ALREADY OUT**
- [ ] R7.1 [IMPL] Text-free guide ohm demos gestures with ghost fingertips and waits for the copy. -> **CARRY**
- [ ] R7.2 [SPEC] Helper teaches at least the fundamentals (spiral, 4 tier-1 strokes, hold). -> **CARRY**
- [ ] R7.3 [SPEC] In-game, text-free hints for every new v0.7 feature. -> **CARRY**
- [ ] R7.4 [PROP] Scope question: should older features (DAW twist, DNA zoom, catch, delete, teach, envelope halo) also get in-game hints?. -> **OPEN**
- [ ] R8.1 [IMPL] Persistence with chunk deltas; IndexedDB-first saves. -> **REDESIGN**
- [ ] R8.2 [IMPL] Off-screen ohms on a cheap LOD path. -> **CARRY**
- [ ] R8.3 [IMPL] Lean headless tests, Wilbow phone-tests feel; no separate Lab APK. -> **CARRY**
- [ ] R8.4 [SPEC] Background ohms stay cheap; heavy v0.7 systems on screen only; measure before/after. -> **CARRY**
- [ ] R8.5 [SPEC] Save code kept writing; save/load system designed later. -> **REDESIGN**
- [ ] R8.7 [PROP] Random start never picks the ark, so Wilbow's existing world is unreachable in-game (only via index.html?fixed=1). -> **OPEN**
- [ ] R8.6 [NOTE] A proper save/load system (no menus). -> **OPEN**
- [ ] R9.1 [IMPL] Deliver signed APKs to Wilbow's Google Drive (not tmpfiles). -> **CARRY**
- [ ] R9.2 [IMPL] One app only (no Lab APK). -> **CARRY**
- [ ] R9.3 [IMPL] As much per build as efficient; no tiny patches; be candid about thin spots. -> **CARRY**
- [ ] R9.4 [IMPL] No recordings or recording analysis; no screenshots. -> **CARRY**
- [ ] R9.5 [IMPL] Consult before major feel changes (gestures, looks, core music); never remove a feature he has seen. -> **REDESIGN**
- [ ] R9.7 [IMPL] Build only what he mentions (for the v0.7 list). -> **CARRY**
- [ ] R9.8 [IMPL] Numbered suggestions; explain in player-experience terms; suggestions must not break established systems; keep unaddressed items as notes; don't… -> **CARRY**
- [ ] R9.10 [IMPL] Lossless handoff to a fresh instance (HANDOFF, DECISIONS, START_HERE). -> **CARRY**
- [ ] R9.11 [IMPL] Ship in stages, music first. -> **CARRY**
- [ ] R9.14 [IMPL] Starter brief optimised as a start point on this same Grok Bot system. -> **CARRY**
- [ ] R9.9 [PROP] Phone feedback; keep haptics?; delete 2 old Drive uploads?; replace placeholder signing password before Play release. -> **OPEN**
- [ ] R9.13 [PROP] Detailed synopsis of everything still to build, most efficient order, no loss of quality or detail; research UX in all applicable categories and… -> **OPEN**
- [x] R9.6 [SUP] Autonomy: 'Do whatever you think it needs to accomplish the goals ive talked about' (12:33 PM Oct 22), later narrowed for v0.7 by t205. -> **ALREADY OUT**
- [x] R9.12 [SUP] Wait for the full build rather than a smaller playable build first (later builds shipped in stages, w151). -> **ALREADY OUT**

#### A2. Later approvals and rules from the chronological log (DECISIONS.md, Oct 23–24)
- [ ] 8:13 AM Sat Oct 24 2026: APPROVED voice control (card answer; not 5, the vowel pad). Built on branch v08-voice; shipped in v0.8b6 (vc31). -> **CARRY**
- [ ] 5:29 PM Sat Oct 24 2026: APPROVED: visible distinct per-ohm mouth shaped by voice; double tap mouth opens mouth control; play-mode sounds recorded into the ohm's current jam phrase as an… -> **CARRY**
- [ ] 5:31 PM Sat Oct 24 2026: APPROVED all six; supersedes 5:29 note that 3, 5, 6 were not picked. Branch v08-mouth. -> **CARRY**
- [ ] 7:41 PM Sat Oct 24 2026: APPROVED all six: DAW river shows live played notes (stored tune as faint ghost), chord + tradition scale lattice, role mark + cycle strong beats, note source colours… -> **REDESIGN**
- [ ] 8:44 PM Sat Oct 24 2026: APPROVED: paint notes in DAW river lanes; painted notes dictate what the ohm currently sings/plays and are introduced to the jam. Brainstorm 8:42 ideas card skipped… -> **REDESIGN**
- [ ] 8:45 PM Sat Oct 24 2026: APPROVED (DAW painting): no grid; painted notes are organic moving strokes with glides/bends/swells, in scale, humanised timing. Open: de-grid the pattern lattice… -> **REDESIGN**
- [ ] 8:45 PM Sat Oct 24 2026: APPROVED: pattern lattice editor becomes organic (no grid), all edits kept. v08-dawpaint. -> **CARRY**
- [ ] 8:50 PM Sat Oct 24 2026: APPROVED direction: MUSIC OVERHAUL. Step 1: audit current generation + traditions vs real theory, measure cohesion; step 2: numbered proposal for Wilbow (song library,… -> **CARRY**
- [ ] 8:52 PM Sat Oct 24 2026: DIRECTION for MUSIC OVERHAUL: game + real DAW + accurate music (shared frame, in key/in time, theory-correct parts, song library). Proposal pending; nothing dropped… -> **CARRY (direction)**
- [ ] 8:55 PM Sat Oct 24 2026: APPROVED: one tradition per planet (pause culture blend/fusion, keep code); groups already mid-song, theory-correct, when encountered. Stage 1 of MUSIC OVERHAUL. -> **REDESIGN**
- [ ] 8:56 PM Sat Oct 24 2026: APPROVED LONG-TERM GOAL (not previously recorded): much bigger planets; regions each with a tradition; blending zones between regions. Constraint now:… -> **REDESIGN**
- [ ] 9:15 PM Sat Oct 24 2026: DIRECTION: rethink jams so two meeting ohms aim to make something that sounds good; options offered, awaiting picks. -> **CARRY (direction)**
- [ ] 9:18 PM Sat Oct 24 2026: APPROVED: 9:15 options 1-6 all; jam and song are separate states (jam = loose vamp/drone, roles, call-answer, clash fixing, no form; song = full chart, hook, sections,… -> **CARRY**
- [ ] 9:26 PM Sat Oct 24 2026: DIRECTION: richer ohm music brain; options offered, awaiting picks. -> **CARRY (direction)**
- [ ] 9:31 PM Sat Oct 24 2026: APPROVED: research UI/UX theory and implement for DAW river/painting/pattern editor/jam view; no approved item dropped; gesture changes proposed, not imposed. Branch… -> **REDESIGN**
- [ ] 9:33 PM Sat Oct 24 2026: DIRECTION: fourth-wall 3D effects (bubble popping out); options offered, awaiting picks. -> **CARRY**
- [ ] 9:35 PM Sat Oct 24 2026: APPROVED: fourth-wall 3D effects at key moments/milestones only (options 1,3,4,5,6 as moment effects); partial 3D in device focus. Tilt (option 2) not approved;… -> **CARRY**
- [ ] 9:40 PM Sat Oct 24 2026: BUG FIX approved; v08-voicestuck, release 0.8b11. -> **CARRY (as a test)**
- [ ] 9:41 PM Sat Oct 24 2026: APPROVED: dev-only diagnostic mode (v08-diag). -> **CARRY**
- [ ] 9:41 PM Sat Oct 24 2026: APPROVED: live tag push via webhook routine during voice calls (v08-diag). -> **CARRY**
- [ ] 9:43 PM Sat Oct 24 2026: APPROVED, PRIORITY: ?-then-tap "what is this / why" helper with V08_SPEC O3 relations view (v08-helper) + why-log in diag snapshots. -> **CARRY**
- [ ] 9:45 PM Sat Oct 24 2026: APPROVED: dev mode may use text (helper why-cards, diag summaries); normal play remains text-free. -> **CARRY**
- [ ] 9:47 PM Sat Oct 24 2026: RULE CHANGE: no-words applies as a consideration for the released game, not development; dev mode/builds may use text. -> **CARRY**
- [ ] 9:51 PM Sat Oct 24 2026: APPROVED: three.js WebGL overlay (level 1) for fourth-wall moments + device focus; 3D ohms/full 3D not approved. -> **CARRY**
- [ ] 10:05 PM Sat Oct 24 2026: APPROVED: ground pulse + light environment reaction (v08-pulse). -> **CARRY**

#### A3. V08_SPEC.md sections (all approved for build unless marked)
- [ ] A. Drawn closed shape -> effect item (R2.8) -> **CARRY**
- [ ] B. Ohms carry water (R6.14) -> **REDESIGN**
- [ ] C. Regional keys, LIGHT (R3.17, t145) -> **REDESIGN**
- [ ] D. Jam-tuned strings (Wilbow, 2:25 AM MDT) -> **CARRY**
- [ ] E. Space: variety, smooth zoom, many systems (Wilbow, 2:27 AM MDT) -> **REDESIGN**
- [ ] F. Realistic space look (Wilbow, 2:30 AM MDT) -> **REDESIGN**
- [ ] G. A path of discoveries (Wilbow, 2:32 AM MDT) -> **CARRY**
- [ ] H. Persistence foundation (Wilbow, 2:35 AM MDT). BUILD FIRST: E, F, G, N and O depend on it. -> **REDESIGN**
- [ ] I. In-game hints for everything new (same style as V07 L: no text; each shows at most 3 times, at most one at a… -> **CARRY**
- [ ] J. Gesture check against GESTURES.md (§13 format; done BEFORE building) -> **CARRY**
- [ ] K. Behaviour changes and tests that must change (flagged, not decided) -> **CARRY**
- [ ] L. Build order and the split -> **CARRY**
- [ ] M. Open questions for Wilbow (continuing from 41; each has a default so the build can proceed) -> **CARRY**
- [ ] N. Collecting ohms for a chosen home, and longings (missions) (Wilbow, 2:42, 2:44 and 2:49 AM MDT). Build as… -> **CARRY**
- [ ] N1. Choosing a home zone (the hearth) -> **CARRY**
- [ ] N2. Collecting: catch anywhere, carry through space, settle at home -> **CARRY**
- [ ] N3. The longing generator (procedural missions from what home is missing) -> **CARRY**
- [ ] N4. Showing which ohm and which DNA helps, text-free -> **CARRY**
- [ ] N5. Direction, warmth, pinning and completion -> **CARRY**
- [ ] N6. Mechanics, cost, tests, risks -> **CARRY**
- [ ] N7. Gesture check (§13 format) -> **CARRY**
- [ ] N8. Live generation from current conditions (Wilbow, 2:49 AM MDT) -> **CARRY**
- [ ] N9. Guaranteed possible in this seed -> **CARRY**
- [ ] N10. Rarity and difficulty, shown without text -> **CARRY**
- [ ] N11. Checklist: Wilbow's 2:44 AM design, and where each part is -> **CARRY**
- [ ] O. The '?' guide: relations, rankings and goals (Wilbow, 2:53 and 2:55 AM MDT). Counters and the two-stroke… -> **CARRY**
- [ ] O1. Counters (cheap, saved in H) -> **REDESIGN**
- [ ] O2. Drawing '?': the summon -> **CARRY**
- [ ] O3. The relations view (text-free) -> **CARRY**
- [ ] O4. Context of all procedural generation -> **CARRY**
- [ ] O5. Goals -> **CARRY**
- [ ] O6. Two-stroke glyphs: '?' and the changed undo arrow (Wilbow, 2:55 AM MDT). FLAG: changes an existing gesture. -> **CARRY**
- [ ] O7. Mechanics, cost, tests, risks -> **CARRY**
- [ ] P. Drawn instruments: movable ends, length = pitch, varied voices, ohms and ensembles (Wilbow, 3:19 and 3:20 AM… -> **CARRY**
- [ ] Q. Ohms feel how much room they take in a jam, in time and in the frequency mix (Wilbow, 3:28 AM MDT) -> **CARRY**
- [ ] R. Pieces on purpose: ink, retrace, soft clay (Wilbow, 1:42, 1:44, 1:45 and 1:49 PM MDT Oct 23 2026). Build as… -> **CARRY**
- [ ] R7. Clay timbre stage (Wilbow 1:49 PM + 2:04 PM MDT Oct 23 2026). Build as v0.8b2 (vc26). -> **CARRY**
- [ ] DEV. Hidden developer panel (Wilbow 2:31 PM, approved 2:38 PM MDT; built as v0.8a10, vc25). As built. -> **CARRY**
- [ ] S. Clay that looks like clay, start shapes, hit strength (Wilbow 3:15 PM MDT Oct 23 2026 + Q173). Built as… -> **REDESIGN**
- [ ] T. Play / listen swap and moving ohms (Wilbow 3:32 PM MDT Oct 23 2026). Built as v0.8b4 (vc29), split from 0.8b3. -> **CARRY**
- [ ] U. Items: scope, echo, patches, take / knock / split, 20 new kinds, close-up controls (Wilbow 4:12 PM MDT Oct… -> **CARRY**
- [ ] Y. Styles as data, 10 traditions, culture blend, teacher trait + aura, jam novelty learning (Wilbow DECISIONS… -> **REDESIGN**

#### A4. QUESTIONS_FOR_WILBOW.md answered items
- [ ] Q2 Keep the vibration (haptics)? -> **CARRY**
- [ ] Q6 Should a plain spiral hatch as soon as your next touch starts elsewhere, instead of the 1.5 s egg wait (UX S9)? -> **CARRY**
- [ ] Q7 Should conducting work one-handed, with the baton staying up briefly after you lift (S17)? -> **CARRY**
- [ ] Q8 Should the conducting upstroke also line the beat up to the start of the bar, or only set the tempo? -> **CARRY**
- [ ] Q9 Random starts mean there's no in-game way back to the ark world. Add a way back now, or wait for save and load? -> **REDESIGN**
- [ ] Q11 Should hints cover older features too, or only v0.7's? -> **CARRY**
- [ ] Q13 Should hatchlings inherit their parents' experience? This also decides whether awakening runs in families (vision P4). -> **CARRY**
- [ ] Q26 Effect items from drawing a closed shape (off since v0.4b). Bring them back, perhaps to feed totems (vision P22)? -> **CARRY**
- [ ] Q27 Ohms carrying water? -> **REDESIGN**
- [ ] Q28 Regional keys? -> **REDESIGN**
- [ ] Q30 Persistence: should your collection survive between launches and across new universes before full save and load, or should save… -> **REDESIGN**

#### A5. GESTURES.md §1 gesture rows (every one keeps its meaning; zoom-threshold rows are re-expressed as detents, §7.3)
- [ ] Tap / Ohm: (v0.3.1, C1 option B) After the 300 ms deferral: a jam member → mute / unmute; a bystander or an ohm near a… -> **CARRY (same hit test)**
- [ ] Tap / Motes (within 5 s of a deletion): Restore the deleted ohm exactly -> **CARRY (same hit test)**
- [ ] Tap / Monolith: Hums the home chord. Two taps within one bar modulate the world key. -> **CARRY (same hit test)**
- [ ] Tap / Fossil bones: Plays the extinct motif -> **CARRY (same hit test)**
- [ ] Tap / Bubble: Pops it (frees the caught ohm) -> **CARRY (same hit test)**
- [ ] Tap / Instrument / material body: Strikes it (velocity from tap shortness). (v0.8a4) A thin string with two anchors that is *tied* (a cluster… -> **CARRY (same hit test)**
- [ ] Tap / Air / sky / ground: Ripple + a blip pitched by height. If the press is < 90 ms, fastTouch startles nearby ohms. -> **CARRY (same hit test)**
- [ ] Double tap / Body (not an ohm): Toggles clear/dense material -> **CARRY (same hit test)**
- [ ] Double tap / Fossil: Wakes it (an egg of the extinct lineage) -> **CARRY (same hit test)**
- [ ] Hold (450 ms) / Ohm: Listen/speak: it chirps, then listens to the mic (speech → words; pitch-tracked). Also damps its body.… -> **CARRY (same hit test)**
- [ ] Hold / Instrument body: Damp (mute ringing); undamp on release -> **CARRY (same hit test)**
- [ ] Tap-then-hold / Ohm: Enter play mode -> **CARRY (same hit test)**
- [ ] Drag / Ohm body: Grab and drag (soft joint). Release throws with finger velocity. If it moves > 30 px it leaves its adopted… -> **CARRY (same hit test)**
- [ ] Drag + press into another ohm ~0.5 s / Two ohms: Fuse into a colony -> **CARRY (same hit test)**
- [ ] Drag a fused member far / Colony: Separate it -> **CARRY (same hit test)**
- [ ] Drag-drop an ohm onto an instrument / Ohm → tuned body: Adopt: it plays that instrument in rhythm -> **CARRY (same hit test)**
- [ ] Drag + release fast upward / Object (not an ohm): Into orbit if radial speed ≥ ~0.98·escape (≈1060 px/s on 900 g) -> **CARRY (same hit test)**
- [ ] Drag a rod END (v0.8a5 P1, new) / Drawn rod (role instrument, drawn in ≥ 0.8a5): Moves that end; length → pitch, live. The far end stays put if it is anchored. Release on the ground (< 16… -> **CARRY (same hit test)**
- [ ] Drag a blob RIM (v0.8a5 P1, new) / Drawn blob: Resizes it (area ×(r/r0)², .15–6× the drawn area): bigger = lower (≈ −1 octave at ×4 area). Release = it… -> **CARRY (same hit test)**
- [ ] Stroke that starts just beside a rod end (v0.8a5 P1) / Rod end: Draws a new rod chained onto that end (as starting on the body did) -> **CARRY (same hit test)**
- [ ] Drag + flick up / Bubble (with a caught ohm): Delete the ohm (farewell, motes 5 s). Needs radial speed ≥ 900 and distance ≥ 110 px. A fused cluster refuses. -> **CARRY (same hit test)**
- [ ] Stroke crossing things / Ohms / bodies: Strum: crossed ohms call out, bodies ring -> **CARRY (same hit test)**
- [ ] Line from an ohm's halo to another ohm / Two ohms: Teach (A teaches B its key/tempo/motif) -> **CARRY (same hit test)**
- [ ] Small letters in a halo / Ohm: Write words (handwriting → song words) -> **CARRY (same hit test)**
- [ ] Closed loop around an ohm / Ohm: Catch in a bubble, anywhere (air, ground, half-buried, slope, underside, water, gas float layer, moons).… -> **CARRY (same hit test)**
- [ ] Closed loop around the sky star / Star: Start/stop screen recording (video share) -> **CARRY (same hit test)**
- [ ] Spiral / Open space: Spawn a new ohm (genome from the stroke) -> **CARRY (same hit test)**
- [ ] Wave / Anywhere: Water. (v0.5b, change of effect, same gesture) pours water (n x 60 units) into the nearest terrain low… -> **CARRY (same hit test)**
- [ ] Star shape / Anywhere: A light -> **CARRY (same hit test)**
- [ ] Zigzag / Anywhere: Lightning spark; the struck ohm flees -> **CARRY (same hit test)**
- [ ] Infinity over two ohms / Pair: Bond / unbond -> **CARRY (same hit test)**
- [ ] Hook, then < or > (v0.8a O6: two strokes; was the… / Open ground (not started on an ohm, halo, bubble…: Undo. The hook (the hooked arrow or the '?' hook) is held ~1.2 s, shown faintly with ghost hints of both… -> **CARRY (same hit test)**
- [ ] '?' = hook, then a point under it (v0.8a O6, new) / Open ground; space views (a '?'-shaped pan /…: Calls the guide: it comes to the point (placed just off-screen first if it's far), or re-hatches from its… -> **REDESIGN (detent, §7.3)**
- [ ] Other closed shapes / Anywhere: (v0.8a3) Lifted at once = material blob (as since v0.4b). Closed shape + rest the finger at the end (≥ the… -> **CARRY (same hit test)**
- [ ] Unregistered glyph / Anywhere: Fizzles (ink fades) -> **CARRY (same hit test)**
- [ ] Any other stroke / Anywhere: Material: a rod, or a blob if closed; pins to the ground or attaches to a body at its ends -> **CARRY (same hit test)**
- [ ] Pinch / Empty world: Zoom about the centre. Zooming past .013 goes to the system; past 4.2 near an ohm enters DNA. -> **REDESIGN (detent, §7.3)**
- [ ] Pinch / Instrument body: Tension (pitch). Spreading > 1.65 pops it off / onto the key grid. (v0.8a4) On a tied string the tension… -> **REDESIGN (detent, §7.3)**
- [ ] Pinch / Ohm: Squeeze: it sings, pitch from the squeeze -> **REDESIGN (detent, §7.3)**
- [ ] Pinch spread > 1.8 / Ohm, zoom > 1.6: Enter DNA -> **REDESIGN (detent, §7.3)**
- [ ] Pinch on the inspected ohm (zoom 1.8–4.2) / Ohm: Register: in .4–.85 = up an octave, spread 1.18–1.75 = down -> **REDESIGN (detent, §7.3)**
- [ ] Two-finger twist / Surface: Open the DAW river. Twisting back closes it; while open, a twist transposes. -> **REDESIGN (detent, §7.3)**
- [ ] Two-finger twist / While inspecting: Cutoff/brightness instead of the DAW -> **REDESIGN (detent, §7.3)**
- [ ] Drag an envelope node or bend handle / Inspect zoom: Edits A/D/S/R, curve, filter env -> **REDESIGN (detent, §7.3)**
- [ ] Back-and-forth stroke across the body / Inspect zoom: Vibrato (reversals = depth, speed = rate) -> **REDESIGN (detent, §7.3)**
- [ ] Drag / Zoomed out (z < .35): Pan -> **REDESIGN (detent, §7.3)**
- [ ] 3-finger tap / 4-finger tap (v0.7 C; was 2 / 3) / Anywhere: Undo / redo -> **CARRY (same hit test)**
- [ ] Touch a scale node (limb tips = an octave up); pads for… / Plays the note, held while pressed; velocity…: Pm.hit -> **CARRY (same hit test)**
- [ ] Drag a handle: fin = cutoff, antenna = vibrato, sac =… / Timbre edits (learned/epigenetic): Handle hit -> **CARRY (same hit test)**
- [ ] Throat tube (vocal ohms): along = tongue position, across… / Tract edits: Tube hit -> **CARRY (same hit test)**
- [ ] Play the same phrase twice / It adopts the phrase as its motif:  -> **CARRY (same hit test)**
- [ ] Exit: pinch in (ratio < .7), or a fast swipe away (> 3R… / Leaves play mode: ★ v0.7: a swipe that *starts* on empty screen on the left half is now the stick, so the swipe-exit works… -> **REDESIGN (detent, §7.3)**
- [ ] ★ v0.7 K: thumb on EMPTY screen, left half / Walking stick: a soft glow appears under the…: RS.Walk.claim: never on a node, handle, tube, envelope node or the ohm's body (those stay play mode). The… -> **CARRY (same hit test)**
- [ ] ★ v0.7 K: flick up with the stick thumb (> 1100 px/s, > 35… / Jump (grounded) or rise (floaters, fliers,…: 0.6 s cooldown; only on the stick pointer -> **CARRY (same hit test)**
- [ ] ★ v0.7 K: Android back / Leaves play mode (before any other back action): App.back play-mode case -> **CARRY (same hit test)**
- [ ] System / Tap a body: Chime; on the ark while carrying ohms, lands -> **REDESIGN (detent, §7.3)**
- [ ] System / Double tap a body: Enter the surface -> **REDESIGN (detent, §7.3)**
- [ ] System / Drag a planet: Nudge its orbit (snapped to a rhythmic period) -> **REDESIGN (detent, §7.3)**
- [ ] System / Draw a spiral / wave / star near a world: Seed life / water / light there -> **REDESIGN (detent, §7.3)**
- [ ] System / Pinch: Zoom; deep zoom enters a world; pinching out goes to the galaxy -> **REDESIGN (detent, §7.3)**
- [ ] Galaxy / Tap a star: Chime -> **REDESIGN (detent, §7.3)**
- [ ] Galaxy / Double tap: Enter a system (or, on empty space, fly home) -> **REDESIGN (detent, §7.3)**
- [ ] Galaxy / Drag / pinch: Pan / zoom; deep zoom enters a system -> **REDESIGN (detent, §7.3)**
- [ ] Galaxy / Pinch out at minimum zoom: NEW UNIVERSE (App.newUniverse) -> **REDESIGN (detent, §7.3)**

#### A+ (builder additions: approved items with no row in Appendix A; see §8.1-8.2)
- [ ] Names, languages, voices, bands; two-finger-tap full introduction (6:35 PM Oct 23) with names/intro rules (5:04-5:08 PM Oct 23)
- [ ] All ohms slowly learn extra sounds; birth voice permanent; "Alone, but rarely" clean solos (6:59 / 7:25 PM Oct 23; provisional, re-ask Q182)
- [ ] Drummers grow from 1-3 birth hits toward a full kit by learning (8:50 PM Oct 23)
- [ ] Auras: learned-sound strands, kit fullness, an experience gradient on every ohm; teaching = continuous 0..1 (8:51 / 8:57 PM Oct 23)
- [ ] Jam/teacher auras + aura lab dev sandbox (7:57 / 7:58 PM Oct 23)
- [ ] Song state preserved exactly across backgrounding and full close (7:27-7:28 PM Oct 23)
- [ ] Mic listen: a brief dip, audio returns on release, no dropouts (6:22 / 6:24 PM Oct 23)
- [ ] Catch bubbles anywhere (ground, gas, water, moons) (6:48 PM Oct 23)
- [ ] Jam view: 12 controls (ring/clock/ribbons, lanes/phrases/roles, song/tempo/key, energy/sound/pins), zoom into the jam centre, changes land on the beat + snapping per tradition (5:43-5:51 PM Oct 24)
- [ ] Standing goals 9:54-10:07 PM Oct 24: beauty, always runs well, scale first, terrain deformation + dynamic environment, one scalable world, snap-zoom layers to atoms/wavelengths with cross-layer modulation, bring harmony back, om philosophy, the title "The Journey Ohm"
- [ ] Later-section gestures: double-tap mouth, two-finger tap introduction, pinch into the jam centre, DAW paint/organic editor, egg strokes, clay/ink/retrace, item take/knock/split, play/listen swap, conducting (all from GESTURES.md sections after §1)

## Shared contracts
(Audio track: music.js, sound.js, worklet, recipe, matrix, events.js. Changes stay additive. Any contract change is noted here.)
- **v0.0.3 control clock (main.js):** the control tick runs on the worklet's level messages (audio clock, about 43/s), with a 25 ms timer as backup. It calls `sim.step(dt)`, `pulse.tick()` and `matrix.tick()`. rAF only draws (`render.draw`).
  - World and ohms code must not assume one control step per drawn frame. Physics belongs in `sim.step(dt)`, which must accept dt up to 0.05 s.
- **v0.0.3 matrix rows (additive):** a row can carry `snap` (grid in beats; 0 or missing = off) and `snapMode` (`'pulse'` default, or `'hold'`). Old rows are unchanged.
- **v0.0.3 world option (additive):** `opts.bgSound` (default true) keeps the audio context running while the app is hidden. Read through `audio.keepBg()`.
- The branch is `master` (the "main" the tracks merge into).
- v0.0.4 (jam, additive): source id 2 = jam partner, an ordinary ohm-scale source with `place:{x,y}` (in ohm radii from the player's ohm) and `screen:false`. render.js draws any placed ohm-scale source (WORLD track: feel free to replace the drawing; keep reading `place`). opts.jam = {on, div}. Note events may carry `jam:1` (made by the partner; jam ignores them) and `learn:{rec,k,solo}` (sound.js layers that recipe's voices at gain k, or alone if solo). music.jam is owned by jam.js (non-null only while a jam runs). URL `?nojam` turns the partner off (test hook).
- v0.0.4 r2 (team defaults 2:09, PROPOSALS): **`tempo.tap` { times: [s, ...] }** (music-clock seconds of 4 steady taps on empty ground) - OHMS track emits it; main.js -> music.tapTempo sets BPM = 60/median interval and glides over 2 bars (music.glide). **Tap vs hold changes:** set `bus.tap = 1` around a discrete (tap) edit and during a jam it lands on the next bar line (bus.pending, flushed by the control tick); without the flag (holds, drags, sliders, dev panel) edits are instant. **Near:** opts.jam.near (ohm radii, default 4); jam only between ohm sources whose `place` are within it (no `place` = {0,0}); nudging = moving `place` (OHMS track). **Shared frame:** music.chord = { root, tones } is the ONE chord every ohm reads. **Roles:** jam.roles.lead (a source) traded at phrase ends from what each played. Stick strike = story only, not the engine clock.
- v0.0.5 (sing, additive): **`sing` { src, on }** opens / closes the mic for the ohm `src` (input.js posts it for a two-finger STILL hold on the ohm, 600 ms; OHMS track may move the gesture, keep the event). Source **id 3, scale 'voice'** (no recipe, never drawn or sounded) posts ordinary note events with `to` = the ohm sung to; jam.js hears them and that ohm imitates (note fields `imit:1`, `jam:1`). opts.sing = { on, mode imitate|answer, when beat|bar, duck, duckDb, phonesDb, phones auto|on|off, gate }. sing.js ducks audio.out gain while the mic is open. input.js edit (OHMS territory, additive): pinch waits for a >6% gap change before SING_MS; 3+ fingers end singing. Manifest: RECORD_AUDIO + MODIFY_AUDIO_SETTINGS (Capacitor's WebChromeClient asks at the first sing).

### World track (track/world) - additive
- `view.js` exports `cam` {z, ox, oy, v, dir, active, lockZ}, `ZK` (=4), `camScale()`, `anchor(w,h)`, `toScreen(w,h,x,y)` (home-layer px -> screen px), `ohmVisible()`. `layout()` applies the camera (identical to before at z = 0) and adds `s`; while the ohm is out of view (z > .92 or z < -2.6) it returns `R = 0`, so hit tests miss it.
- `world.js`: `createWorld(sim, bus, music, seed)` -> `sim.world` / `JO.world`. `world.layer(depth)` = the one generic block (lazy, any integer depth, seeded from the world seed and modulated by the neighbour toward home: hue, sym, rough, terrain, `om` = parent om x just ratio, folded 48-96 Hz). `world.height(L, x, t)`, `world.groundAt(x01)`, `world.ripples`, `world.tick(dt)` (called from main's control tick, after `sim.step`), `world.setZoom(z)`, `world.goHome()`, `world.opts {layerKey, snap}`.
- New global ctl streams (matrix sources by name, no SOURCES edit): `world.depth`, `world.zoom` (fraction toward the next layer), `world.ground` (0..1 terrain under the ohm), `layer.bright`, `layer.rough`.
- New event `{type:'world.layer', depth, layer}` when the camera settles in a new layer; with `layerKey` on, a `set music.om` to that layer's om follows on the next bar.
- `zoom.js` (own pointer listeners on the canvas; input.js untouched): two-finger pinch starting off the ohm/nodes = zoom about the midpoint, twist > .4 rad freezes; 1-finger drag on empty world while |z| > .05 = pan; ctrl+wheel = zoom. Plain taps on empty ground are never claimed (they stay with the ohms track, e.g. tap tempo).
- `render.js`: `createRender(canvas, sim, music, readScope, world)` (world optional); exposes `render.q` (0 best..3), `render.qAuto`, `render.setQ(q)`. Max DPR now 1.5 (PROPOSAL, keeps zoom transitions at 60 fps).
- `tests/render_bench.mjs` (ROOT=<www> to bench another checkout, MAX_DRAW=<ms> to gate).

- **World track × ohms reconcile (v0.0.6, replaces the older lines above where they differ):**
  - `sim.cam {x, y, z}` is THE camera (space.js linear scale). view.js `cam` keeps the depth state (`z` in layers, `v`, `dir`, `active`, `lockZ`, `sim` = sim.cam) and always holds `sim.cam.z = 4^cam.z`; `setDepth(z)` keeps the home anchor's pixel offset; `getOff/setOff` read/write that offset. view.js `toScreen` is gone (use space.js).
  - `sim.groundAt(x)` = the home layer's front ridgeline in world y, steady (no beat pulse) and never below `sim.bounds.ground`; render draws exactly that line; `sim.groundDrawn = true`. Things with `auto` sit on it.
  - Gestures: two fingers that BOTH start on empty space (off every ohm, thing and open node) = zoom about the midpoint, moving the midpoint = pan; twist > .4 rad freezes zoom (pan still works). The old one-finger pan is removed (one finger on empty ground = ohms track: tap, 4-tap tempo, current, hold-spawn). Ctrl+wheel = zoom.
  - Render: a separate low-res `<canvas id="bg">` (pointer-events none, under `#c`) holds the world layers; `#c` has alpha and is cleared each frame. bg resolution `BGS = [.6,.5,.45,.4]` x CSS px by rung, redrawn every frame while the camera moves, else every 2nd frame (PROPOSAL).
  - **Request to the ohms track:** input `pick` should skip ohms while `ohmVisible()` is false (deep zoom), so hidden ohms are not grabbed.

### Look hook (world track wires it, Visuals track owns `www/js/look/*`)
- render.js does `import { createLook } from './look/index.js'` once and calls `look = createLook({ sim, music, world, bus })`. Every method below is OPTIONAL; a missing one = the world track's default drawing. Visuals may split look/ into palette.js, materials.js, light.js, effects.js; only `look/index.js` is imported.
- Per drawn frame render builds one read-only state `st` and passes it everywhere: `{ t, W, H, dpr, q, trip, real, burst, pulse, barPhase, level, depth, zoom, cam, A }`
  - `q` = quality rung 0 (full) .. 3 (cheapest), the shared ladder; look code must cut its own cost at the same rungs.
  - `trip` 0..1 = realism-to-trippy balance, a WORLD-STATE value from context (world.js, see below); `real = 1 - trip`.
  - `burst` 0..1 = a big musical event just happened (decays over ~2 bars): bigger psychedelic moment.
  - `pulse` beat pulse 0..1, `barPhase` 0..1, `level` = focus ohm sound level, `depth`/`zoom` = layer depth and fraction, `A` = layer anchor (screen px).
- Methods (g = the 2D context, already in CSS px; leave globalAlpha 1 and composite 'source-over' when you return):
  - `look.frame(st)` once per frame before drawing (cache gradients / palettes here, not per ohm).
  - `look.palette(L, st)` -> `{ hue, spread, sat, light }` colours the default layer drawing uses (L = world layer: hue, spread, sym, rough, bright, depth, seed).
  - `look.layer(g, L, sc, st, pass)` extra pattern / light on a layer; `pass` = `'field'` (after the background), `'over'` (after terrain). `sc` = that layer's on-screen scale. Return `true` from the 'field' pass to replace the default mandala.
  - `look.ohm(g, o, x, y, r, st)` material / light over one ohm after ohmdraw drew it (o = the ohm, r = on-screen radius). Called at q 0..2 (v0.0.7; Visuals has a q2 rung) and only for on-screen ohms, in order focus first, then brightest (o.glow + o.look.glow), then nearest to the focus, so the per-rung glow cap keeps the important ones; keep it O(1).
  - `look.bodies(g, items)` (v0.0.7, Visuals): when zoomed out so far that a typical ohm is under 7 CSS px (PROPOSAL), render skips ohmdraw and hands every on-screen ohm to look.bodies as `{x, y, r, rgb, glow, o}` in the same order.
  - `st.place` (v0.0.7, additive) = the current layer's own trip value 0..1 (the place's character). `st.trip` stays the world's full context value (already includes burst x lookMix.burst); look/mix.js adds its own peak on top, so Visuals may want to keep peakLift small.
  - `look.post(g, st)` screen-space effects last (vignette, colour wash, light leaks). No getImageData / filter / shadowBlur in the per-frame path.
- Budget (v0.0.7, raised from 1.5 ms): the whole look hook may add about 3 ms draw time at q 0 with 50 ohms (Visuals measures 2.35 ms), less at each lower rung; the shared ladder (sim.lod) steps down if the frame goes over, and nothing runs outside rAF (the world keeps playing with the screen off).
- World state behind it (world.js, posted as global ctl streams so the matrix can use them too): `look.trip`, `look.burst`. trip = layer base (the planet / place: its seed) + jam (more ohms playing together) + harmony tension (away from home) + how far the music has developed (note density built up over minutes) - PROPOSAL weights, all in one place in world.js (`W.lookMix`). burst fires on: settling into a new layer, a key change (`set music.om`), `harmony.push`, a jam starting.
- **track/ohms (additive): many ohms.**
  - `sim.ohms` lists every ohm. `sim.ohm` is still the focus ohm (id 1 at start). Event `{type:'focus', src}` changes the focus; holding an ohm sends it.
  - `sim.sources` now lists only the world sources plus **awake** ohms: an ohm is awake if it was touched, sounded or bumped in the last 8 s, and the focus ohm is always awake. The matrix and `sound.onLevels` keep iterating `sim.sources`, so their cost stays flat however many ohms exist. `sim.wake(o)` wakes one.
  - Each ohm has `o.g`, body genes grown from the same seed as its recipe (genes.js), and `o.body.ring`, a Float32Array of 10 soft-ring points stored as dx, dy, dvx, dvy.
- **World units (additive):**
  - `body.x` and `body.y` are now world positions in R px (R = min(w,h) × .13). The origin is the layout rest point. Before, they were offsets from the rest point, and ohm 1 still starts at (0, 0).
  - space.js `toScreen` and `toWorld` convert between world and screen.
  - The world track owns `sim.cam {x, y, z}`, `sim.bounds {x0, x1, y0, ground}`, `sim.groundAt(x)` (returns the ground y; default is a flat `bounds.ground`) and `sim.groundDrawn = true`, which hides render.js's placeholder ground line.
- **New events (additive):**
  - `{type:'spawn', x, y, seed}`: a new ohm grows. Also available as `sim.spawn(x, y)`.
  - `{type:'touch', kind:'tap'|'stir'|'pinch2', x, y, dx, dy, ratio}`: empty-world touches in world units. sim reacts to tap and stir. `pinch2` is posted for the world track's zoom; nothing acts on it yet.
  - `{type:'tempo.tap', times:[4 music-clock s], bpm}`: four steady taps on empty space (intervals .25–1.6 s, within 25% of each other). **The audio track handles it** in music.js.
  - Collision and landing strikes are ordinary `note` events that carry `impact`, the speed in R/s. They are limited to 12 per bar across the world, and their velocity is scaled down by 1/sqrt(awake/4).
- **`sim.neighbors(o, reach)`:** returns the nearby ohms, nearest first. This is for jams, because ohms jam when they are near each other.
- **quality.js (shared ladder):**
  - `JO.quality.level` (mirrored in `sim.lod`) runs from 0 to 3.
  - It steps down after about 1 s over the 16.7 ms frame budget and back up after about 5 s under it. `quality.forced` pins a level.
  - Rungs for ohms:
    - 1: no halos on crowd ohms;
    - 2: crowd ohms drawn as discs;
    - 3: settled sleeping ohms skip their ring physics.
  - Other tracks can add their own cuts at the same levels.
- **view.js:** the nodes open around the ohm where it is now, not around the rest point.
- **Request to the audio track:** sound.js FX racks are never freed. With many ohms, the first ohms to wake take all 8 slots, and later ohms play dry. Proposal: free an owner's rack when it leaves `sim.sources`.
- **track/ohms × v0.0.4/v0.0.5 (additive):**
  - **The jam partner is a full ohm now.** Any ohm-scale source added from outside becomes a full ohm through `sim.add`, including the jam partner, id 2. It gets genes, a soft body, physics, drawing, and you can touch it.
  - **`place` is a live accessor on every ohm.** Reading it returns `{x, y}`, the world position in world units (≈ ohm radii; the origin is where the focus ohm starts). Setting it moves the ohm there.
  - **Nudging decides the jam.** jam.js's "near" check works unchanged, so nudging, throwing or stirring ohms toward each other is what makes them jam.
  - **An ohm added with a `place` is anchored.** It hovers at that spot and doesn't seek partners, but it can still be thrown.
  - **`o.parked`.** sim sets it on id 2 while `opts.jam.on` is false; this is the same rule render.js used on master. A parked ohm is not simulated, drawn or touchable.
  - **Singing works on any ohm.** The gesture is unchanged: two still fingers on an ohm for 0.6 s. `sing.src` is whichever ohm was touched.
  - **Note for the audio track:** a tap-tempo glide calls `music.setBpm` on every tick, so it switches Om lock off. If the player turns Om lock on during the 2-bar glide, the glide undoes it. Proposal: cancel the glide in `setLock(true)` and `setOm` when locked.
- **track/ohms, Wilbow 7A–D and 6A+6D (additive):**
  - **`tempo.tap` fields:** `{ times, bpm, src, x, y, to, timing }`.
    - `src` is `'ground'` (steady taps on empty space) or a thing object (taps on it).
    - `to` holds the ids of the ohms that hear it: the focus ohm, ohms within `opts.jam.near` of it, and ohms whose hearing (2 + 4 × hear) reaches the tap.
    - The audio track decides who follows.
    - Each origin keeps its own 4-tap window.
  - **`sim.things` (proposal, 7B):** tappable world objects `{ id, kind, x, y, r, hit }` in world units.
    - By default there is one `drum` on the ground at the left edge; `auto: true` means it re-places on resize.
    - The world track may move it, replace it or draw it, and setting `sim.thingsDrawn` hides the placeholder.
    - `sim.addThing(t)` adds one.
    - Tapping a thing posts `{type:'touch', kind:'thing', thing, x, y, vel, timing}`. It flashes, nearby ohms wobble, and nothing sounds yet. Proposal: the audio track gives it a sound.
  - **Touch timing (6A, 6D):** every touch event input.js posts (touch tap/thing, focus, spawn, tempo.tap) carries `timing { t, beat, phase, off (beats from the nearest beat), onBeat (off < .12) }`.
    - Discrete touch edits (focus, spawn, tempo.tap) run with `bus.tap` set to that timing object. It is truthy, so v0.0.4's check still works.
    - Opening and closing nodes is view state and stays instant.
- v0.0.6 (D + Wilbow 2:20-2:29 answers, all PROPOSALS with toggles): **roles/lead REMOVED** (the r2 "roles from what each ohm plays" and "one shared chord" lines above are superseded). **`harmony.push` { chord?: degree, key?: semitone, dir?: +1|-1 }** (player gesture, OHMS track) nudges the moving harmony; **music.key** (0..11 semitones over the om, tonicHz follows; `music.setKey`) and **music.chord** {root, tones} now MOVE every opts.harm.bars bars, shaped equally by every source that played (one vote each) + each ohm's home key (`harmony.home(src)`, src.home overrides) + pushes; key changes only through a pivot chord; listeners fire on change. **`tempo.tap` { times, src? }** from any source; `music.setFollow(src, w)` / `music.bpmFor(src)`: ohms not jamming/listening keep their own tempo. **bus.land / opts.land** {mode 'context'|'bar'|'now'}: when a jam tap change lands. **world.dbFor(src)** dip while singing per source (opts.sing.duckMode). **ev.learn** may be a list [{rec,k,solo}]; with none, ohm notes take **world.blend.learnFor(o)** (blend.js: context weights; `blend.touch(o, recId, amt)` is the hook for touched objects). **rec.sample** [[slotId, hz]...] = sampler layer (inst P.smp); audio msg **{t:'smpSet', id, d, hz}**; worklet 'jo-tap' records the mic only while singing, on the phone only. opts.harm / land / tempo / mix / sample / blend; opts.jam.inTune / inTime.
- v0.0.6 additions (Wilbow 2:31-2:36, PROPOSALS with toggles): **brain.js** = each ohm's open memory store, entries `{kind, key, data, strength, lastUsed}` on `o.brain.e`, API `brain.remember(o, kind, key, data, add, max) / get / list(o, kind) / use(entry) / prune / bar / save / forget`; any kind may be added (today 'pattern', 'sound', 'partner', 'player'; e.g. places, songs later). Fades only for entries unused > `opts.brain.idle` beats; saved in localStorage 'jo.brain' by ohm seed. **blend.js** writes the brain from playing together (rate x closeness x togetherness); `blend.pattern(o)` / `played(p)` feed jam answers; `blend.bond(o)` 0..1 scales matrix rows with `bond: 1` (amt x (.3 + .7 bond)); sound absorption only with `opts.blend.sound` (default false); no solo rule. Strikes with `ev.impact` (bumps/throws) never teach the brain. **influence.js** posts ctl streams per awake ohm ~15/s: partner.density/pitch/level/near, touch.speed/x/y, sing.pitch/level, body.squash/speed/impact/wobble, place.x/y, world.terrain (from `world.terrainAt(x, y)` if the WORLD track provides it), item.touch (from `world.itemTouch(o)` placeholder). New matrix target `note.width` (stereo spread). sound.gc frees FX racks of sleeping/removed sources (~1/s). Touch kind 'thing' plays a strike from fixed seed 7777 (`opts.thing.sound`). setLock(true) / setOm while locked cancel the tap glide. tempo.tap `to` hearers follow. landAt uses `bus.tap.onBeat` when the input provides it.

### v0.0.7 contracts (additive)
- fxkinds: `ALL_KINDS = [...KINDS, ...EXTRA]`, EXTRA = ['spc'] (spectral: depth = smear, tone = blur, hold > .5 = freeze; STFT 512/128, 512-sample latency). KINDS unchanged so old seeds sound the same. Matrix target `fx.N.hold`. `opts.spectral {seeds, chance}`: new seeds may carry spc (own rng stream).
- music: `music.jam = {div, snap}`; `music.feel` (null; a tradition's tightness 0..1 when traditions exist). `music.lock` default false (no om->tempo derivation; Wilbow 2:44 no lore in the engine). Recipes no longer carry `parent`.
- autojam.js: `createAutoJam(world, bus, music)`, ticks after jam. Reads `world.ohms, world.neighbors, world.jam, world.wake, world.cam`, optional `world.healAt(x,y)` or `world.harmonyAt(x,y)` (0..1, WORLD track may provide). Notes carry `auto:1, jam:1` (the player jam ignores them) and `lite:1` (sound.js plays one voice). `opts.autojam {on, near, reach, max, droneK, sleepK}`.
- sing (v0.0.7, Wilbow 3:09 answers): voice note events carry `sungB` (beat the note was sung), `len` (beats held), `bend` ([[beatOffset, cents], ...] while held). Two fingers resting still on an ohm open its ears (29A). Mic: rest < `opts.sing.latchS` (1.5 s, PROPOSAL) toggles; longer = on only while held.
- jam (v0.0.7): `J.loops` = [{to, own, ph, b0, start, L, i, j, n, T, dr, busy}] voice loops (no note cap, sung time offsets kept, no grid); `J.bendFor(o)` -> pitch ratio multiplier (sound.js multiplies the matrix bend by it). opts.sing adds `latchS, loops, drift, fit, form, bends, voiceSample` ('context' = busy-ness of the last 4 beats decides; PROPOSAL rules in jam.js).
- blend (v0.0.7): `opts.blend.voice = {on:true, max:.15}` an ohm slowly takes up to 15% of your voice's sound, scaled by time sung to it; partner-sound absorption stays off.

### World track v0.0.8 (additive)
- **Terrain pulse (approved vision "terrain deforms and pulses, environment reacts"; PROPOSAL `world.opts.pulse`, default on).** `world.pulse.amt` (0..1.2) comes from context: .3 + .3 rough + .25 look.trip + .25 look.dev + .4 burst, smoothed over ~.5 s. `world.deform(L, u, t, h, beat, barPhase, f)` adds a beat swell (×(1 + .5·beat·amt)), an om standing wave (its spacing follows music.om/64, breathing with the bar), and the notes' ripples and dents stay as before. The **home front ridge (= sim.groundAt) never deforms**, so ohms keep stable footing. Other layers' front ridges pulse. Posted as the global stream `world.pulse` (0..1).
- **Place sources:** `world.healAt(x, y)`, `world.harmonyAt(x, y)`, `world.terrainAt(x, y)` (x, y = world units, 0..1), also set on `sim` (autojam's and influence's `world`). The place is the layer the camera is in. heal = .5 + .3·(1 − layer.trip) + .2·(music recently played there: note dents), never below .5 so autojam stays alive. harmony = .35 + .45·layer.cons (consonance of its chain of just key ratios to home) + .2·(1 − rough). influence.js already turns `terrainAt` into `world.terrain`. The world track posts per-ohm `place.heal` and `place.harmony` (round robin ≤ 24 ohms per frame, only on change ≥ .01) plus the global `place.harmony`, so any matrix row can use them. PROPOSAL to audio: list `place.heal` and `place.harmony` in INFL_SOURCES for the panel.
- **Layer → layer sound inheritance:** every layer's values come from its own seed, nudged by its parent: key (om × a just ratio, `opts.layerKey`), **tempo** (`L.tempo` = parent × one of [1, 1, 4/3, 3/4, 3/2, 2/3, 5/4, 4/5], clamped .5–2 × home; its own draw, never derived from the om), and **timbre bias** (`L.timbre` 0 dark/rough .. 1 bright/smooth, 60% from the parent). On settling into a layer, key and tempo land on the next bar. The tempo is applied **relatively** (bpm × L.tempo / the current layer's tempo), so your tapped tempo carries through and coming home restores it. It is skipped while music.lock is on (PROPOSAL `world.opts.layerTempo`, default on). Global streams: `layer.timbre` (0..1), `layer.tempo` (L.tempo / 2). PROPOSAL to audio: a default row `layer.timbre → live.cut` so the bias is audible without a recipe edit.
- **No lore (Wilbow 2:44):** world.js, render.js, view.js and zoom.js were audited: nothing derives from the origin story or the stick. All layer values are seed + parent only; the 64 Hz home om is the approved pitch, not lore.
- Matrix (v0.0.7): new targets `brain.keep`, `brain.learned` (summed per ohm into `o.brainMod = {keep, learned}` each matrix tick); new per-ohm influence sources `ohm.playing, jam.busy, gene.memory, gene.curious, player.taught, brain.fit`, plus `place.heal, place.harmony`; world globals `world.depth, world.zoom, world.ground, layer.bright, layer.rough, layer.timbre, layer.tempo` listed in matrix SOURCES. Default rows (PROPOSALS): layer.timbre -> live.cut .25; brain.fit/player.taught/jam.busy/gene.curious/place.harmony -> brain.learned; ohm.playing/gene.memory/jam.busy/place.harmony -> brain.keep.
- Q46 (v0.0.7): `opts.blend.share = {ctx:true, base:.15}`: each bar `o.learnedShare = base + brainMod.learned` (0..1) = how often its answers / autojam turns use learned material; otherwise its own style with the learned bit's last step as an accent. `blend.pattern(o, raw=true)` = old strength share.
- Q52 brain retention (v0.0.7, Wilbow 52C: context decides): `opts.brain.retain` default **false** (= v0.0.6 bar fade). On: entries carry `plays, lastT` (game seconds, `brain.gt`); heard (plays 0) fade after heardIdleS with half-life heardHalfS; played after playIdleS with playHalfS; every time x (.5 + brainMod.keep). `brain.phrase(o, notes, k)` long parts (phraseBars 64, secBars 4), sections packed 8 B/note in `o.brain.sec[hash] = {p: Uint8Array, n, refs}`, phrase entry `data = {bars, secBars, secs:[{h, tr}], n}`; `brain.phraseNotes(e)`; cap `opts.brain.cap` 2000 x (.75..1.25 gene 11), weakest/least-recently-played heard phrases evicted first. `blend.phrase(o)`; autojam plays its next bar. Saves: IndexedDB 'journeyohm'/'brain' keyed by seed (localStorage fallback / old-save import).

## World track v0.0.9 — terrain step 1: the planet (4:15 AM MDT)
- Glossary (Wilbow): an idea wrongly turned into a fixed rule or category is **fudged**. "freeze" only in its literal sense (e.g. the spectral freeze insert). Resonance's own edits for this term change were not on master at 730bfe4 (0 hits for "fudged"), so this line is the only record so far.
- planet.js (new): the home layer IS the planet surface. Home terrain is periodic over `planet.C` home widths (C = 4..9 from the world seed), so walking wraps around. Pinch out past home: the ridgeline bends (bend = smoothstep(-z), round at z=-1); bigger layers' ground lines fade and become the space around it. Pinch in returns home (snap unchanged).
- Walk: at planet size a sideways two-finger drag spins the planet (`world.walkBy`); at home, dragging past the pan limit keeps walking. Only the drag part walks (zoom drift never does).
- Hum (5b A bigger is lower, 5d C blend): two world voices (ids 103/104, eADD recipe 7003): the shared om `oct` octaves down + this planet's own note (seeded ratio, folded into the same octave), crossfaded by `planet.own` (context: place mood up, music busyness down). Gain follows `planet.size` (0 at home, full at planet size, fades by z≈-4).
- Tempo across sizes (5a C): `planet.tempoFor(L)` = weighted blend in log2 space of planet seed, zoom level, place mood, music busyness and the player's tapped tempo, snapped to simple ratios; lands on the next bar (same pendingOm path as before). Toggle `ctxTempo` off = old per-layer seeded ratio.
- PROPOSALS (dev panel, defaults = rec, not decided): planet on, hum on, walk on, context tempo on, hum octaves (2), hum level, each 5a weight, 12c "same home planet every launch" (default OFF = a new random planet each launch; ON saves the seed in localStorage `jo.world.seed`).
- Shared contract (additive): matrix.js SOURCES += music.busy, place.mood, planet.tempo, tempo.tapped, world.size, planet.size, planet.own (global ctl streams posted by planet.js at 10 Hz).
- Cost: render_bench zoom -1.3 0.79 ms (master 0.94), home 0.49 (= master); ohm_bench q0 188-200 / q2 1000-1100 on both master and this branch (boundary noise).

## v0.0.10 - C #7 herd (additive contracts; all PROPOSALS behind opts.herd, dev panel)
- herd.js (new, integrated across OHMS input/sim + audio events): `createHerd(sim, bus, music, brain)` -> sim.herd { sel:Set ids, called:Map, tick(), draw(g,W,H,toScreen), pull(o) }.
- events: `herd.call {x,y,timing}` (double tap bare ground, <320 ms / <34 px; a steady tempo run does not call unless opts.herd.fastTap='always'),
  `herd.select {ids}` (closed loop round 2+ ohms, decided on lift; [] clears; also clears after selT s or a lone ground tap),
  `herd.home {ids,x,y}` (drag + finger still < stillPx for home.still s).
- o.home {x,y}; brain entry kind 'place' key 'home' {x,y} (saved with the ohm; restored on load). homing gene = gene(o, 19), continuous.
- who answers a call: group (else focus) always; others score w.social*g.social + w.near*closeness + w.jam*jamming + w.place*place mood >= thresh, top max.
- called ohms arrive on a beat (music.timeOfBeat) and sound a soft strike there (note.herd = 1). Tick cost O(called + selected) + homed every 4th tick.
- planet hum default octaves 2 -> 1 (still a proposal slider).

## World track v0.0.11 - terrain step 2: space (star system, landing). All PROPOSALS behind world.system.opts (dev panel)
- `system.js` (new): `createSystem(W, sim, bus, music, hash)` -> `world.system`. Planets 0..n-1 (planet 0 = the home planet, the v0.0.9 world, same seed + layer).
  n by seed in [opts.nMin, opts.nMax] (12b proposal, default 2-6). Orbit periods = RS.MULTS bars [2,3,4,6,8,12,16,24] (whole bars), radius ~ cbrt(period^2) (Kepler III).
  Positions = pure functions of music.bar(t) (far planets catch up from the clock; nothing simulated). Per planet: seed, C (size), ownR, own home layer (ridge style), raw hum note, tempo ratio tr (log2).
- Q41 C: note = raw leaned toward the nearest om overtone (folded 48-96 Hz) by lean = 0.8 * opts.lean * context (calm/healed up, busy down; 0 allowed; max .8, never a lock). Re-evaluated every 2 bars.
- Q300 A (toggle opts.q300 'A' | 'fixed'): orbit neighbours' tempo ratios drift toward each other while both jam / heal (continuous).
- 5b A: space chord = up to 4 eADD sustain voices (source ids 105-108, recipe 7004), the planets' notes x2, (v0.0.12: register is now a continuous curve, see below); level = spaceAmt * opts.chord.
- View: blend s = smooth((-z-1.5)/1.3): at s=0 the focus planet sits where v0.0.9 draws it, at s=1 the star is centred. `system.view/screen/pos/homeShift`; render translates the v0.0.9 planet + specks by homeShift.
- Landing: zoom.js aims once per zoom-in gesture (z < -1.5) at the planet nearest the pinch / wheel centre; `world.land(k)` fires when z > -1.6. Bigger layers (d < 0) stay seeded from the system seed (shared space); d >= 0 from `world.pseed` (the planet you are on). Note + tempo land on the next bar (same pendingOm path as layer settles). In space (d < 0) a settle keeps your planet's key (opts.keepKey).
- **sim.js (additive, one line):** `o.parked = (o.id === 2 && !jamOn) || !!o.away`. world sets `o.pl` (planet index) and `o.away` (lives on another planet); away ohms sleep like the parked jam partner. Your focus ohm and herd-selected ohms travel (opts.travel).
- matrix SOURCES (additive): `space.amt`, `space.planet`, `planet.lean`.
- Test: tests/space_test.mjs (browser; real two-finger pinch lands).

## World track v0.0.12 - terrain steps 3+4: what planets are made of, and how the place leans the music. All PROPOSALS (dev panel, world section)
- `terrain.js` (new, pure): `makeTerrain(seed, L, C)` -> `T`, built lazily per depth-0 layer by `world.terrOf(L)` (null when `opts.terrain` is off).
  STYLE `T.style` {rock, ocean, ice, gas} continuous weights (one leads, `T.lead`; the others tint). Gas = a cloud giant: a low soft floor (`T.flat`), its back ridges drawn as cloud bands.
  FEATURES (rare, seeded): craters (`T.craters`, rim + bowl), cliffs / mesas, terraces (smooth steps), all added inside `world.height` so the ground ohms stand on IS the drawn ground.
  WATER: `T.wl` = water line in units of the layer amplitude (-1e9 = dry). `world.height` clamps to it (ohms float on seas / pools); `world.hRaw` = the height under the water (for depth).
  REGIONS `T.regions` (3-6): u, note (semitones above the om), b0 (brightness seed), feel (tempo ratio), tight, timbre, lush, hard, hollow, wet, ground/sky/water HSL, lm (landmark {type, u, size}).
  `T.at(u, out)` = gaussian-weighted blend of all regions at planet position u (normalised, sigma = C / nRegions / 2): **no borders**, every value continuous (tests/terrain_test.mjs checks steps < .03 per 1/200 width).
- **PALETTE CONTRACT for Visuals (look/* unchanged; read-only for you):** `world.place` is updated every frame at home (z ~ 0):
  `{ on, u, region, n, w[8] (region weights), bright 0..1, rough, lush, feel, tight, timbre, hard, hollow, wet, mode (name, read only), style {rock,ocean,ice,gas}, lead, pal, mark, markD }`
  `pal = { ground: [h, s%, l%], sky: [h, s%, l%], water: [h, s%, l%] }` (circular hue means of the nearby regions; re-used arrays, do not keep references across frames if you mutate).
  For any other spot: `T = world.terrOf(world.home); T.at(u, out)` (u = planet position in home widths, `world.placeU()` = the focus ohm's). `out.pal` is filled the same way.
  render.js uses `pal.ground` for the ridge fills and `pal.water` for the seas; sky is exposed only (Visuals' call). Off: `world.opts.terrain = false` -> place.on false, pal null.
- LANDMARKS: spires, crystals, geysers (jet on the bar), arches, on the front ridge; lit on each bar line, a light shaft above, and an edge glint when one is near but off screen (draws you on).
- THE PLACE'S PULL (music.js): on each bar world posts `{type:'harmony.place', w: 12 pitch-class weights, region, bright}` (w null when not on a surface).
  The leaning = per region, its home note + a gaussian (sigma 1.1 rungs) over the diatonic mode ladder locrian..lydian centred at bright*6 (tonic 2.5, fifth 1.5, other tones 1), weighted by the region blend.
  bright = .5 + .9(b0 - .5) + .8(.35 - rough) + .25(lush - .3): rough / craggy ground -> darker families, smooth / lush -> brighter. Continuous weights, never one mode, never a lock.
  H.step adds the normalised vector x `opts.harm.placeW` (default .6 of one player) when `opts.harm.place = 'vote'` (PROPOSAL default, the open question), x .03 when `'tie'` (only breaks ties), nothing when `'off'`. It never plays by itself (the harmony still idles when nobody plays), so a jam can leave the leaning and come back.
  SCALE_MUSIC.md scale families beyond the 7 diatonic modes (maqam / raga / pentatonic families) are not in the engine yet: QUESTION below.
- ARRIVING IN A REGION: when the dominant region changes, `world.region` {region, mode} is posted; with `opts.placeTempo = 'lean'` the tempo leans half way (log2) toward the region's feel, snapped to 2/3..3/2, landing on the NEXT bar via the same pendingOm path as layers (relative to the last region lean; reset on landing). `opts.placeFeel`: `music.feel = tight` each bar (jam.js snap tightness; null off-surface).
- GROUND MATERIAL = matrix place sources (global, posted on bar lines): `ground.hard`, `ground.hollow`, `ground.wet`, `place.timbre`, `place.bright`, `place.feel` (0..1, .5 = no lean), `place.landmark` (1 = standing at one).
  New DEFAULT_ROUTES (recipe.js, copied into new recipes, editable in the matrix): wet -> live.cut -.3, wet -> modal.damp +.2 (wet dulls), hollow -> modal.size +.3, hollow -> modal.decay +.08 (hollows boom), place.timbre -> live.cut +.12.
  `opts.room` (PROPOSAL, on): the shared reverb is the room - hard ground: revFb +.09·hard, revMix x(1+.4·hard) (echoes); wet: revDamp +.35·wet, drier; hollow adds size. Offsets around `audio.params` (base never changed), sent only on change > .01.
- **INPUT FIX (input.js, fix 1):** in deep space (system on, z < -1.5) one-finger ground gestures are gated (`p.space`): the specks are shifted by system.homeShift AND bent onto the planet ring, so mapping the flat hit-tests through it is messy and fragile. Two fingers still zoom / aim / land (zoom.js `free()` returns true there, the same unshifted hit-test fixed). Back near the planet everything works as before.
- **REGISTER (system.js, fix 2):** `S.register(C) = -tanh((C - 6.5) / 1.5)` octaves (C 5 ~ +.76, 8 ~ -.76): each chord note is an equal-power blend of its two neighbouring in-tune octaves (voices 105-108 + partners 109-112), so the octave follows planet size continuously with no detune.
- Tests: tests/terrain_test.mjs (node). Bench gate unchanged.
- PROPOSALS (toggles, defaults = rec): terrain on; harm.place 'vote' (x .6) vs 'tie' vs off; placeTempo 'lean'; placeFeel on; room on.
- QUESTIONS: (a) scale families beyond the diatonic modes (maqam / raga / pentatonic) need engine support: add them as more rungs of the same ladder? (b) should landmarks DO something musical when an ohm reaches one (beyond place.landmark as a source)? (c) placeW .6: quiet enough? (d) gas giants get small pools too (wet tint) - keep or keep them dry?

## World track v0.0.13 - changeable ground (queue item 5) + planet style is one blend. All PROPOSALS (dev panel, world section)
Wilbow: "the terrain should be changeable not static", "Destructable/foldable terrain". Not in this build: the solid grid, cracks, craters (next job).
- **Planet style = one continuous blend** (terrain.js). v0.0.12 picked one lead type and added small tints (type + mixing as an exception);
  now the four weights are a flat Dirichlet draw (normalised exponentials), so rock .6 ice .3 ocean .1 is as likely as any mix. Every
  downstream formula already used the weights. `T.lead` = the largest weight, for reading only; `T.blend()` = 'rock .58 ice .27 ...'
  (the dev panel's `here:` line shows it). terrain_test checks the blend (about 2/3 of planets clearly mixed).
- **shape.js** (new): per planet (key = home layer seed + size), a diff on top of the seed ground: `lift` (lasting) + `temp` (fresh),
  64 samples per home width, in chunks of half a width. `W.height` adds one interpolated lookup (`W.shape.at(L.shp, u)`); nothing else redraws.
- **Events on the clock (D)**: the bus event `terrain.change { kind: raise|smooth|erode, u, w, amt, t, dur, lush }` is the only way in.
  At each bar line the last bar's music becomes events: each loud ohm near you raises the ground under it (level x jam, more and wider
  with sustains); a swell (the whole sound jumping up) raises wide around you; long tension erodes, tension resolving (harmony coming
  back) smooths + greens (`lush`). Changes grow in over the bar. **Anything may post terrain.change** (Visuals, ohms, later the grid).
- **Settle / last**: quiet lets the fresh part settle (faster when quieter); T2 A: a spot changed in about 6+ recent bars turns lasting.
- **Budgets**: chunks within ~1.25 widths of you are awake; far chunks sleep and catch up (settle) when you come back. At most
  `W.shape.budget` (256) diff samples written per frame, `W.shape.statBudget` (2) chunk stats per frame, <= 8 ohm events per bar.
  shape_test: about 9 us a frame with 13 loud ohms.
- **Saved**: IndexedDB `jo-world` / store `shape`, one record per planet: only the changed chunks (Int16 lift/temp, Uint8 repeats, lush),
  about 2-4 KB a planet, newest 64 planets kept. Saved every 8 bars when dirty and when the app goes to the background; loaded when you land.
- **The place follows the ground**: `T.at(u, out, rough0, xr, xl)` takes extra roughness (from the diff's slopes) and lushness (heals),
  so brightness, tightness, timbre, hardness and the harmony vote shift continuously as the ground changes.
- **T4 seasons/weather**: per planet, a season of 128-320 bars and weather every 16 bars on the music clock; the sea line rises and falls
  with the season on wet worlds, rain softens, dry cold wind scours a little.
- **T1 A**: two fingers resting on bare ground (still .6 s) opens the mic while held (input.js -> `shape.touch` -> sing.js start/stop);
  each bar your voice shapes the spot: low presses, high lifts, a long note spreads wider. The ohm you're with hears you as usual.
- **Matrix sources (global)**: `ground.raised` (the ground at your spot vs the seed, .5 = unchanged), `ground.fresh` (change growing now),
  `place.season` (0..1), `place.weather` (0..1). No default routes yet.
- **Hooks for Visuals** (look/* not edited): `W.place.raised / fresh / season / weather` every frame; bus `terrain.change` events
  (u, w, kind, t, dur) for dust / glow where ground moves; `W.shape.cur` = { lift, temp, h, rough[], lush[] per chunk }, `W.shape.at(P, u)`,
  `W.shape.roughAt / lushAt(P, u)`. Suggested: lush -> greener ground tint, fresh -> dust/particles, season -> palette drift.
- **Toggles (W.opts.shape, dev panel 'changeable ground PROPOSALS')**: on; T1 A | off (B drag, C carry not built); T2 A | B all lasts |
  C all fades; T3 A | B only builds | off; T4 A | B weather only | off; T5 A genes + context | B only while jamming | off; speed x; reset button.

## World track v0.0.14 - solid ground, a tuned crack on a huge swell, a crater that stays (queue item 6). All PROPOSALS (dev panel, world section)
Changeable ground (v0.0.13) stays **on by default** (`W.opts.shape.on`, toggle kept). 'Foldable' is item 7 (not here).
- **Solid depth** (shape.js): a coarse column field under the surface, `cut` (0..1 per column, 32 columns per home width, in the same
  half-width chunks, asleep when far like lift/temp). Cut = solid removed below the surface. `W.floorCut(u)` dips the physical floor
  (`sim.groundAt`) and the drawn foot ridge locally; zero cost when nothing was cut (`anyCut`). `W.opts.shape.str` (slider .25-3, default 1
  = v0.0.13 look) scales every ground change, lifts and cuts alike.
- **Crack** (T6 A): at a bar line, a swell that is strong FOR THIS JAM (bar loudness z-score vs the jam's own running mean/sd >= `crackZ`
  (default 2), the bar before already >= 1 sigma (sustained), sustains add to it, loud > .12, >= 8 bars learned, 8-bar cooldown) cracks
  the ground along a line: centre = loudness centroid of the ohms near you, length from the swell size, branches from tension, jag from
  how many ohms play. The crack posts `terrain.crack {u, len, dir, br, jag, deg, oct, seed, z, ringT, t}` and carves cut + a small drop.
  It rings on the next beat (`ringT = music.nextBeat()`): one modal strike voice (recipe 7014, scale 'world', name 'crack') on a
  **chord tone of the current harmony** (T8 A: root for a long crack, 5th/3rd by tension; T8 B: the chord tone nearest the loudest ohm's
  last note). Never a fixed key. T6 B = any very loud jump (absolute, simpler); off.
  Cracks fade over ~500 bars (T2 A), 33 (T2 C) or never (T2 B); 12 kept.
- **Crater** (T7 A): very strong hits FOR THIS JAM (velocity >= max(.45, mean + max(.06, 1.4 sd)) of the jam's own hits; impacts x1.15),
  landing in the same 0.2-width spot in >= 3 of the last 4 bars with enough summed energy (more ohms = more needed) leave a crater:
  bowl + rim in lift, deep cut in solid (radius .06 + .025 x hits). Posts `terrain.crater {u, r, amt, t, dur}`. It **stays**: the cut only
  heals with harmony (the v0.0.13 smooth/heal event wears it, x(1-.05q)), T2 B never heals, T2 C fades by itself. T7 B = any hit >= .9.
  Normal-for-the-jam loud playing never craters (shape_test: a jam that's always this loud doesn't crater; one bar of strong hits doesn't).
- **Events on the clock + matrix sources**: crack/crater are bus events at bar lines (anything may post them, e.g. Visuals or the grid);
  new global sources `ground.cut` (solid removed at your spot), `ground.crack` (1 at a crack, decays), `ground.crater` (craters near you).
- **Hooks for Visuals** (look/* not edited): bus `terrain.crack` / `terrain.crater`; `W.shape.cracks()` = live cracks with `pts` polyline
  (du, depth pairs; main + branches), `life`, `ringT`; `W.floorCut(u)`; `W.shape.cutAt(P, u)`. render.js draws the crack as a dark seam with
  a short glow when it rings (placeholder; Visuals may restyle).
- **Saved**: per changed chunk, `c` (Int16 cut) + the crack list `cr`; v0.0.13 records load fine (no cut).
- **Cost**: shape_test ~10 us a frame with 13 loud ohms (v0.0.13: ~9), cut lookup ~0.04 us.
- **Toggles (dev panel 'solid ground, cracks, craters PROPOSALS')**: solid on/off; strength .25-3; T6 crack A context | B any loud jump | off;
  crackZ 1-4; T7 crater A context | B any very strong hit | off; T8 ring pitch A chord tone by shape | B nearest the loudest ohm.
- Test change: pw_smoke's "above ground" check now allows the floor dip where solid was cut (it compared with the flat bounds.ground).

### Gestures - v0.0.14 conflict check (tests/gesture_test.mjs, headless touch pointers, all pass)
Two-finger SING = two fingers still on an ohm (.6 s, mic records and sings). Two-finger GROUND SHAPING = two fingers still on bare
ground (.6 s, T1 A, mic). Checked both against each other and against pinch, zoom, spin (twist) and herd call:
| Case | Before v0.0.14 | Now |
|---|---|---|
| sing vs shaping | disjoint by hit test (ohm vs bare ground) - OK, but the shaping mic was a full sing: it recorded, sang notes into the ohm and ducked the mix | shaping opens the mic **listen-only** (`sing.start(o, {listen:true})`: no recording, no notes, no duck); a real sing replaces a listening mic; shaping never stops a real sing |
| shaping vs zoom | **conflict**: zoom's dead zone is 8% gap change, shaping ended only on 14 px per finger, so a slow spread could zoom while the mic shaped | zoom's dead zone holds while shaping; shaping ends on a gap change >= 8% (or 14 px), then zoom goes on the next move; a zoom that already went never starts shaping (`cam.shaping` / `cam.zoomGo`); never both (test samples every 5 ms) |
| shaping vs spin (twist) | twist moved the fingers > 14 px, ended shaping - OK | same |
| shaping vs pinch (on an ohm) | disjoint (pinch needs a finger on the ohm) - OK | same; test: pinch on the ohm = squeeze, no sing, no shaping, no zoom |
| two-finger taps vs tap / herd call | **conflict**: the last finger up of a quick two-finger tap counted as a one-finger tap; two of them = herd call | a finger that was ever part of 2+ never taps (`p.multi`); one-finger double tap still calls the herd |
| shaping -> zoom handoff (v0.0.15, Q5) | the spread ended shaping, but zoom started only on the NEXT move (its baseline reset at the go) | the very move that ends shaping already zooms, measured from the dead zone's edge (no jump); a pan go keeps the old reset. gesture_test 2b: shaping ends + z rises on the same move, first step <= later steps, never both flags |
| 3+ fingers | ended sing, not shaping (shaping went on with the mic open) | 3+ ends both (reserved) |
| still on ohm vs zoom | disjoint (zoom needs both fingers free) - OK | same |
- **Perf gate (side by side vs master 0f67e4c, interleaved runs)**: home draw 0.62 / 0.53 / 0.51 ms (master 0.59 / 0.57 / 0.59);
  ohm_bench q0 175 / 200 / 188, q2 950 / 1000 / 1000, halves 50 / 400 (master q0 175 / 188 / 188, q2 900 / 1000 / 1000); look q0 median 2.85
  (6 runs, one 3.10; master also had one 3.05; look/* identical in both trees = noise), q1 2.04-2.30; DSP worst + spectral 45.0 / 42.9 / 42.8%
  (master 46.1 / 43.0 / 42.8%).

## v0.0.15 - folds (creases) + singing to the ground + shaping hands over to zoom (queue item 7)
- **Folds** (T9 A, Wilbow "Destructable/foldable terrain"): a fold is a pleat along a fold line - a sharp crease (the ridge),
  one slope steeper than the other (`dir`, -1..1), a valley tucked under the steep side, sharpness `sh` 0..1 (how pointed the crease).
  Stored as its own diff `P.fold` (h = lift + temp + fold), drawn incrementally inside the per-frame write budget (linear in the amount).
  - **Music drives it**: >= 2 bars of sustained tension (chord tension >= .4, playing) build a fold at the level + sustain weighted
    centroid of the ohms near you; amount = .035 x tension x context x foldK, ramping with how long the tension has lasted.
    Context (T9 A) = the jam (~1.4x deeper in a jam than alone) and how many sustains per ohm. **Ohm genes** (hash(seed, 0xf01d), level weighted) lean the
    direction and sharpness continuously (shape_test: 21 distinct directions -1..1 over 29 seeds). T9 B = tension only (no genes/context).
  - **Release relaxes**: a resolution (tension >= .45 -> <= .2, the same moment as the v0.0.13 heal) relaxes nearby folds by .35 + .5 x
    the drop; calm bars relax a little (.06). Relaxing goes toward what the fold keeps.
  - **Lasting, obeys T2**: A = every build leaves 30% that stays (decays x.9996 a bar - ~0.3 x after 3000 bars); B = everything stays,
    release does nothing; C = nothing stays and folds fade (x.97 a bar). Max 8 folds (the weakest gives way, smoothly). Saved as `fo`.
  - **One way in**: bus `terrain.fold { u, w, amt (+build / -relax fraction), dir, sh, t, dur }` on the bar line; anything may post it.
  - **Matrix sources**: `ground.fold` (how folded at your spot, 0..1), `ground.folding` (.5 still, above = building, below = relaxing),
    `ground.sung` (singing to the ground, level).
  - **Visuals hooks** (look/* untouched): `W.shape.folds()` = live folds `{u, w, dir, sh, a (now), to, set}`, `W.shape.foldAt(P, u)`,
    the bus event.
- **Singing to the ground** (T1 A + T10 A, two resting fingers on bare ground, listen-only mic): every BEAT (on the beat) the smoothed
  sung pitch shapes the ground: lower voice = wider, lower rise (w .34), higher voice = narrower, taller peak (w .07, ~2x the height);
  holding on spreads it a bit. **Follows the harmony gently**: the pitch leans toward the nearest tone of the current chord (humH, default
  .35; the pull fades to 0 by 1.5 semitones, so it is continuous in pitch - shape_test checks no jumps 97-512 Hz); singing in the chord adds
  roundness + green. T10 C = no harmony lean, T10 B = the v0.0.13 per-bar mapping. Silence/no pitch shapes nothing (the last shape fades out within ~0.5 s).
- **Q5 - shaping hands over to zoom straight away**: see the gestures table (zoom.js: on a spread go, zoom applies on that same move from
  the dead zone's edge). `JO.zoom.free(x, y)` exposed for the gesture test (re-picks bare ground; ohms + things wander).
- **Toggles (dev panel 'folds + singing to the ground PROPOSALS (v0.0.15)')**: T9 A/B/off, foldK 0-3, T10 A/C/B, humH 0-1. Status line:
  fold count.
- **Tests**: shape_test +27 (folds: build, bar line, crease shape, matrix, release, kept part lasts, reset, T2 B/C, no-tension, off, genes, context, the event,
  cost; hum: listen mic, every beat on the beat, low/high mapping, rises + ground.sung, silence, stop, harmony lean, current chord,
  continuity, T10 C, T10 B). gesture_test +2 (2b).
- **Perf gate (side by side vs master 54c6aab, 3 interleaved rounds)**: home draw 0.55 / 0.60 / 0.50 ms (master 0.55 / 0.55 / 0.45);
  ohm_bench q0 175 / 200 / 188, q2 1000 / 1000 / 1000 (master 163 / 200 / 188, 1000 / 1000 / 950); look q0 2.82 / 2.79 / 2.90, q1 2.04 /
  2.20 / 2.03 (master 2.88 / 2.81 / 2.76, 2.05 / 2.03 / 2.03); DSP worst + spectral 44.0 / 42.2 / 42.8% (master 43.1 / 42.3 / 45.1%; one
  worst-without-spectral spike 59.7% in round 1, dsp untouched). shape_test frame cost while folding with 14 ohms ~27 us (master's crack +
  crater case ~22 us, same machine).
