# The Journey Ohm (Resonance 2.0)

A gesture-driven, procedurally generated musical exploration game for Android by Wilbow Shmesh. Built with Capacitor 8 and plain ES-module JavaScript (no bundler), using AudioWorklet and canvas 2D.

**Start with [HANDOFF.md](HANDOFF.md)**: what the game is, how to run it in a browser, the dev panel and switches, tests, and how to build an APK. Then read **[COLLABORATION.md](COLLABORATION.md)** for how to work with Wilbow.

- Code snapshot: master `b96edbc` (Oct 26 2026), latest master, **unreleased**. The last released build is v0.0.30 (`9704618`, f3e8f6e + version bump). See [CHANGELOG.md](CHANGELOG.md).
- `SUMMARY.md` is the main reference. `docs/` holds copies of the coordination docs (DECISIONS, WILBOW_VERBATIM, QUESTIONS_FOR_WILBOW, ...). DECISIONS and WILBOW_VERBATIM are append-only.
- Release signing: bring your own keystore. No keys or passwords are in this repo; never commit them.
- Quick start: `npm install`, then `npx http-server www -p 8080` and open `http://localhost:8080/?autostart`.
