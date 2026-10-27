// 60 s SELF-TEST (first launch, starts at the first touch; rerun from the dev panel). Numbers only, no recording.
// 0..50 s: watches frames, worklet load, over-budget audio blocks, frame gaps and touch-to-sound while you play.
// 50..60 s: silent voice ramp: adds held modal voices (gain -80 dB, same DSP cost) 4 at a time up to the 32-voice pool
// and reads the worklet load at each step. Results: shown in the panel, kept in localStorage ('jo.selftest').
// Targets are PROPOSALS (plan step 1); the reference phone (Q283) decides where the gate really sits.
export const TARGETS = { touchMs: 50, frameMs: 16.7, load: .5, voices: 32, dropouts: 0 };
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (a, q) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
export function createSelfTest(audio, frames) {
  const T = { running: false, t0: 0, dur: 60, ramp: 10, res: null, progress: 0 };
  try { T.res = JSON.parse(localStorage.getItem('jo.selftest') || 'null'); } catch (e) { }
  T.start = (dur = 60) => { if (T.running || !audio.ready) return false; T.running = true; T.dur = dur; T.ramp = Math.min(10, dur / 3); T.t0 = performance.now(); T.touch0 = audio.touchMs.length; T.touchSeen = []; T.steps = []; frames.mark();
    audio.touchMs.length = 0; T._tick = setInterval(T.tick, 100); return true; };
  T.tick = () => { const el = (performance.now() - T.t0) / 1000; T.progress = el / T.dur; const rampStart = T.dur - T.ramp;
    if (el >= rampStart) { const stepLen = T.ramp / 9, k = Math.min(8, Math.floor((el - rampStart) / stepLen));
      if (T.steps.length <= k) { T.steps.push({ v: k * 4, t: performance.now() }); if (k > 0) for (let i = 0; i < 4; i++) audio.voice({ modes: Array.from({ length: 8 }, (_, m) => ({ f: 110 * (k + 1) * (m + 1.37), a: .12, d: 30 })), gain: 1e-4, hold: 1, tag: 999, send: .3 }, null); } }
    if (el >= T.dur) T.finish(); };
  T.finish = () => { clearInterval(T._tick); T.running = false; audio.send({ t: 'release', tag: 999 });
    const mon = audio.mon.filter(s => s.wall >= T.t0), rampStart = T.t0 + (T.dur - T.ramp) * 1000, play = mon.filter(s => s.wall < rampStart);
    const steps = T.steps.map((st, i) => { const end = T.steps[i + 1] ? T.steps[i + 1].t : performance.now(), mid = st.t + (end - st.t) / 2, ss = mon.filter(s => s.wall >= mid && s.wall <= end && s.load != null);
      return { voices: st.v, load: ss.length ? ss.reduce((a, s) => a + s.load, 0) / ss.length : null, active: ss.length ? ss[ss.length - 1].act : null }; });
    const f = frames.since(), lat = audio.latency(), touch = audio.touchMs.slice(), loads = play.filter(s => s.load != null).map(s => s.load);
    const r = { at: new Date().toString(), durS: T.dur, ua: navigator.userAgent, sampleRate: lat && lat.sr, baseLatencyMs: lat && lat.base, outputLatencyMs: lat && lat.output, workletPerfClock: mon.length ? !!mon[mon.length - 1].perfOk : null,
      touchMs: { n: touch.length, median: med(touch), p90: pct(touch, .9) }, frameMs: { mean: f.mean, p95: f.p95, drawMean: f.drawMean, gaps: f.gaps }, load: { mean: loads.length ? loads.reduce((a, b) => a + b, 0) / loads.length : null, peak: play.reduce((a, s) => Math.max(a, s.loadPeak || 0), 0) },
      overBudgetBlocks: mon.reduce((a, s) => a + (s.over || 0), 0), ramp: steps };
    const at32 = steps.length ? steps[steps.length - 1] : null; r.maxVoicesUnderTarget = steps.filter(s => s.load != null && s.load < TARGETS.load).reduce((a, s) => Math.max(a, s.voices), 0);
    r.pass = { touch: r.touchMs.median == null ? null : r.touchMs.median < TARGETS.touchMs, frames: f.mean == null ? null : f.mean < TARGETS.frameMs, voices32: at32 && at32.load != null ? at32.load < TARGETS.load : null, dropouts: r.overBudgetBlocks + f.gaps === 0 };
    T.res = r; try { localStorage.setItem('jo.selftest', JSON.stringify(r)); } catch (e) { } if (T.onDone) T.onDone(r); };
  return T;
}
