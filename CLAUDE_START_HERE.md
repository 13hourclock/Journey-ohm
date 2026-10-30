# CLAUDE_START_HERE (also shipped as HANDOFF.md)

> **First: read BOARD.md** (what is decided, built, proposed or only discussion; build only what is DECIDED) and, for Grok, GROK_HANDOFF.md.

For Claude or any AI coding assistant (or person) picking up **The Journey Ohm** (project name **Resonance 2.0**), owner **Wilbow Shmesh**.
Read this first, then **COLLABORATION.md** (how to work with Wilbow), then **SUMMARY.md** (the main reference).

## 1. What the game is
A touch-only Android music-creature game. You live among soft-bodied creatures called **ohms** on a planet; every touch, drawing and gesture makes sound, ohms jam together, learn songs, carry traditions, and you can zoom smoothly from cells and the ground up through sky, planets, solar systems and galaxies. The whole world shares one musical clock locked to the "om" (the root tone).
- Stack: **Capacitor 8** (Android shell) + plain **ES-module JavaScript** (no bundler, no TypeScript) + **AudioWorklet** synthesis + **canvas 2D** drawing (a little WebGL in `www/js/look/gl.js`, three.js vendored but 3D is not a priority).
- appId `com.lensure.journeyohm`, app name "Journey Ohm (dev)", minSdk 24, targetSdk 36.

## 2. Which zip is which
| Zip | Commit | Meaning |
|---|---|---|
| `JourneyOhm_code_v0.0.30_9704618_2026-10-26.zip` | 9704618 = f3e8f6e + version bump only | **Exactly the source of the v0.0.30 APK** in this package |
| `JourneyOhm_code_latest-master-unreleased_b96edbc_2026-10-26.zip` | b96edbc (master, Oct 26 4:58 AM MDT) | Latest master, **unreleased, no APK**: v0.0.30 + pinch dark-disc fix (H1-H5), visuals merge (sea mist, planet edge AA, rims, node glow), lenses/prisms, wind rocks, critters (new features OFF behind switches). See CHANGELOG.md "Unreleased". |

Start new work from **latest master** unless told otherwise.
**WIP branches exist in the original repo but are NOT in either zip, untested and not on master:** `track/oldfeat` (eb42e7a, relics + old-game features in progress) and `track/balance` (97ffd53, balancedOf step 1). Ask for them if needed; don't assume they work.

## 3. Folder map
```
www/                 the whole game (Capacitor webDir); open www/index.html
  index.html         entry; loads js/main.js
  js/main.js         wiring: creates audio, sim, world, render, input, systems; exposes globalThis.JO for tests
  js/audio.js, dsp.js, dsp/   AudioWorklet engine (fx.js, inst.js, tract.js = voice tract)
  js/synth.js, instruments.js, palette_data.js, palette_norm.js   the 73-instrument palette
  js/music.js, scales.js, clock.js, songs.js, jam*.js, autojam.js, harmony etc.   music + jamming
  js/sim.js, soft.js, softbody.js, ohmdraw.js, brain.js, genes.js, herd.js   ohms (bodies, minds, genes)
  js/world.js, terrain.js, planet.js, globe*.js, system.js, systems.js, galaxy.js, space.js, zoom.js, zoomlayers.js   world + scales + zoom
  js/look/           visuals layer (shading, glow, sky, ground, galaxy, aura...). See js/look/README.md
  js/gestures.js, input.js, stroke.js, shape*.js   touch gestures and drawn shapes
  js/abilities.js, traditions.js, rare.js, critters.js, lightplay.js, windrocks.js ...   systems/features
  js/devpanel.js     the dev panel (switches, knobs, readouts)
  js/selftest.js     in-app 60 s self-test
  js/vendor/         three.min.js (+ LICENSE)
android/             Capacitor Android project (gradle). No signing config inside.
tests/               ~95 node + headless-browser tests and benches (pw_smoke.mjs = main smoke)
tools/               palette import/normalise, zoom profiling helpers
scripts/build_dev.sh original release script (box-specific paths; uses the owner's keystore - write your own)
scripts/run_gates.sh the v0.0.30 gate runner (box-specific paths; shows which tests gate a release)
audits/              feature/gap audits
SUMMARY.md           MAIN REFERENCE (newest first). Wins over every other doc.
GESTURES.md          gesture map + clashes (Resonance 2.0)
TEAM_LOOPS.md        how the old bot team coordinated
INSTRUMENT_PALETTE.md, PLAN_*.md, NOTES_*.md, MUSIC_GOOD.md   plans and dev notes (SUMMARY wins on conflict)
docs/                copied from the older "softsound" project folder:
  WILBOW_VERBATIM.md   Wilbow's exact words (authoritative, append-only)
  DECISIONS.md         decision log (append-only)
  QUESTIONS_FOR_WILBOW.md   numbered questions (never renumber)
  START_HERE.md, NEW_ENGINE.md, CONCEPTS.md, ABILITIES.md   background on the old game + the new engine
  GESTURES_old_game_softsound.md   the OLD game's gesture map (for reference only)
CHANGELOG.md, COLLABORATION.md, CLAUDE_START_HERE.md (this file)
```
Note: many docs cite absolute paths like `/workspace/softsound/...` or `/workspace/resonance2/...` and `WV:<line>` (= line of docs/WILBOW_VERBATIM.md). Those were the original build machine's paths; the files you need are in this zip.

## 4. Run it in a browser
No build step: `www/` is served as-is.
```
npm install                 # Capacitor deps (+ 'canvas' dev dep for node tests; needs build tools/cairo on some OSes)
npx http-server www -p 8080 # or: python3 -m http.server 8080 -d www
```
Open http://localhost:8080 in Chrome at a phone-sized viewport (e.g. 412x860, touch emulation on). Tap once to start audio. Useful URL params: `?autostart`, `?selftest=20` (starts audio + a 20 s self-test), `?ohms=N` (starting ohm count), `?nojam`.
In the console, `JO` exposes everything (JO.audio, JO.sim, JO.music, JO.events, JO.systems...).

## 5. Dev panel and switches
Tap the small **dev** button (top right) to open the panel (starts closed every launch). It has world/sound/voice/synth/fx/matrix sections and the **switches**: every new feature ships behind a switch (`sys.switches` in systems.js, plus `T.switches` in trippy.js, `K.switches` in jamkeys.js and lists added in main.js). Default ON = approved/accepted; OFF = waiting on Wilbow's taste call. Off must always mean "exactly as before". Many visual switches live under the master switch `noOutlines`.

## 6. Tests and smoke
- Node tests: `node tests/<name>_test.mjs` (print `ok`/`FAIL` lines). Release gates list: `scripts/run_gates.sh` (rare, traditions, dive, gesture, look, look_aura, systems, place_trad, haptics, drawn_p, answers, step5, autojam, abilities, gasfloat, senses, oldfeat, dsp_bench; browser: pw_smoke, integration, abilities_browser, look_bench_real, render_bench, look_rare_cost, zoom_smooth, muffle_live).
- **pw_smoke.mjs**: headless Chromium smoke (page loads, worklet runs, taps/hold/node gestures, self-test, zoom/pan smoothness probe with 26 gestures). No screenshots, no audio capture.
- Gotcha: browser tests load Playwright via `createRequire('/workspace/softsound/')` (an old box path). Run `npm i -D playwright && npx playwright install chromium`, then change that path to the repo root (e.g. `createRequire(import.meta.url)`) - about 40 files under tests/ and tools/ do this.
- With a real, working node-canvas installed in the repo (`npm install` gives one), tests/look_test.mjs shows 6 FAILs (`TypeError: ImageData expected` in www/js/look/star.js paintCorona, plus follow-ons); on the original box it ran on a no-op 2D stub and passed. Not a game bug on Android WebView, but worth fixing in the test or star.js.
- pw_smoke's zoom-probe frame-time checks (draw p95 / slow frames) are timing gates and fail on a loaded or slow machine; judge them on an idle machine.
- Known flakes under heavy CPU load: abilities_browser_test check 6, muffle_live_test (pass on retry).

## 7. Build a debug APK
Needs **Node 22** (Capacitor CLI 8), **JDK 17+** (`JAVA_HOME`), Android SDK with platform 36 + build-tools 35 (`ANDROID_HOME`).
```
npm install
npx cap sync android
cd android && ./gradlew assembleDebug     # -> android/app/build/outputs/apk/debug/app-debug.apk (debug-signed, installable)
```
Release: `./gradlew assembleRelease` gives an unsigned APK; zipalign + apksigner it with **your own keystore**. The original keystore and its password are deliberately NOT included and never will be. An APK signed with a different key will not install over Wilbow's current install (uninstall first, or bump appId). Never commit keystores or passwords. Bump `versionCode`/`versionName` in android/app/build.gradle and `version` in package.json together.

## 8. Authoritative docs (in order)
1. Wilbow's own words: docs/WILBOW_VERBATIM.md (+ docs/DECISIONS.md).
2. **SUMMARY.md** - the main reference; if any plan disagrees, SUMMARY wins. Its bottom section "Kept pieces" must never be cut.
3. docs/QUESTIONS_FOR_WILBOW.md - open questions; next free number **422**.
4. GESTURES.md (gesture clashes), docs/ABILITIES.md (ability order), TEAM_LOOPS.md.
5. Everything else is background.

## 9. Security notes for this package
Excluded on purpose: signing keystores (*.jks/*.keystore), the keystore password, the original HANDOFF file holding secrets, env files, the separate "Lensure"/lightsynth project, node_modules, dist/, android build outputs, APKs (the v0.0.30 APK is a separate file in the Drive folder). build_dev.sh and NOTES_DEV.md mention the old keystore path and cert fingerprint only (no password).
