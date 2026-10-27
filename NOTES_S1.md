# Journey Ohm step 1 (0.0.1-s1, vc1), shipped 2026-10-25
APK: dist/JourneyOhm-dev-s1.apk -> Drive 'Resonance overnight' (file id 19nzV-larxoMLsg7aNDYOEjyXqFeTOBDu)
Build: KSP=... bash scripts/build_dev.sh (needs /home/box/node22 for Capacitor CLI 8, SDK platform 36 installed)
Tests: node tests/dsp_bench.mjs ; node tests/pw_smoke.mjs (ST=20 default)
Box: DSP 32 voices 0.151 ms/block = 5.7% budget (node, 48 kHz); headless Chromium frame 16.67 ms mean, draw 0.07 ms, touch->sound median 36 ms (fake output), worklet load mean 1.2%.
Layers: music.js (clock/key/harmony) -> input -> events.js (note events + beat-time records) -> recipe.js voiceFor -> audio.js worklet; sim.js state; render.js reads only.
Proposals: JI 7-degree scale, 4-beat breath + beat throb, strike on touch-down (hold also strikes), body size sets octave, no audible heartbeat/om drone, self-test to localStorage not file.
