import { makeRecipe } from './recipe.js';
// v0.0.5 C: SINGING TO AN OHM. The mic is just another note source: a 'voice' source (id 3) posts ordinary note events
// (degree in the shared scale, beat time) and the jam listener hears them like any other caller; the ohm you sang to imitates.
// No separate engine: pitch is read at control rate from an AnalyserNode (no audio thread work, nothing recorded or stored).
// Mic opens ONLY while the sing gesture is held (event 'sing' {src, on}); all defaults are PROPOSALS (opts.sing toggles).
export function detectPitch(buf, sr, out = {}) {
  // McLeod-style normalised autocorrelation on a ~12 kHz decimated copy; voice range 70-1000 Hz. Returns {hz, clarity, rms}.
  const k = Math.max(1, Math.round(sr / 12000)), n = Math.floor(buf.length / k), x = detectPitch.x && detectPitch.x.length >= n ? detectPitch.x : (detectPitch.x = new Float32Array(n)), fs = sr / k;
  let e = 0; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < k; j++) s += buf[i * k + j]; x[i] = s / k; e += x[i] * x[i]; }
  out.rms = Math.sqrt(e / n); out.hz = 0; out.clarity = 0; if (out.rms < 1e-4) return out;
  const lo = Math.floor(fs / 1000), hi = Math.min(n >> 1, Math.ceil(fs / 70)), nsdf = detectPitch.nsdf && detectPitch.nsdf.length > hi ? detectPitch.nsdf : (detectPitch.nsdf = new Float32Array(hi + 2));
  let max = 0; for (let t = lo; t <= hi + 1; t++) { let r = 0, m = 0; for (let i = 0; i + t < n; i++) { r += x[i] * x[i + t]; m += x[i] * x[i] + x[i + t] * x[i + t]; } nsdf[t] = m > 0 ? 2 * r / m : 0; if (t <= hi && nsdf[t] > max) max = nsdf[t]; }
  if (max < .5) return out;
  let t = lo; while (t < hi && nsdf[t] > 0) t++;                         // past the first zero crossing
  for (; t < hi; t++) if (nsdf[t] >= .85 * max && nsdf[t] >= nsdf[t - 1] && nsdf[t] >= nsdf[t + 1]) break;
  if (t >= hi) return out;
  const a = nsdf[t - 1], b = nsdf[t], c = nsdf[t + 1], d = a - 2 * b + c, sh = d ? .5 * (a - c) / d : 0;
  out.hz = fs / (t + sh); out.clarity = b; return out;
}
// v0.0.6 D: CHOP. Pure: cuts a recording into slices at the sung-note marks (or every beat), trims trailing silence, pitch-tags
// each slice (detectPitch on its middle), normalises it and fades its edges. Returns [{d: Float32Array, hz}].
export function chop(rec, sr, marks, o = {}) {
  const gate = o.gate || .01, W = Math.round(sr * .01), lead = Math.round(sr * (o.lead == null ? .12 : o.lead)), maxL = Math.round(sr * (o.maxS || 1.5)), out = [];
  let st = o.mode === 'beats' ? Array.from({ length: Math.floor(rec.length / Math.round(sr * o.spb)) }, (_, i) => i * Math.round(sr * o.spb)) : marks.map(m => Math.max(0, m - lead));
  st = st.filter((s, i) => s < rec.length - W && (i === 0 || s - st[i - 1] > W * 4));
  const rms = (a, b) => { let e = 0; for (let i = a; i < b; i++) e += rec[i] * rec[i]; return Math.sqrt(e / Math.max(1, b - a)); };
  for (let i = 0; i < st.length && out.length < (o.max || 16); i++) { let a = st[i], b = Math.min(rec.length, i + 1 < st.length ? st[i + 1] : rec.length, a + maxL);
    while (a + W < b && rms(a, a + W) < gate) a += W;                                    // skip leading silence
    let q = 0, e = a; for (let p = a; p + W <= b; p += W) { if (rms(p, p + W) < gate * .5) { if (++q >= 3) break; } else { q = 0; e = p + W; } }   // stop after 30 ms quiet
    if (e - a < sr * .06) continue;
    const d = rec.slice(a, e); let pk = 0; for (const x of d) pk = Math.max(pk, Math.abs(x)); const k = pk > 0 ? .8 / pk : 1, F = Math.min(Math.round(sr * .008), d.length >> 2);
    for (let j = 0; j < d.length; j++) d[j] *= k * Math.min(1, j / F, (d.length - 1 - j) / F);
    const mid = Math.max(0, (d.length >> 1) - 1024), seg = d.length >= 2048 ? d.subarray(mid, mid + 2048) : d, P = detectPitch(seg, sr);
    out.push({ d, hz: P.clarity > .8 && P.hz ? P.hz : 0 }); }
  return out;
}
export function createSing(world, bus, music, audio) {
  const O = world.opts, S = { active: false, to: null, hz: 0, deg: null, err: '', phones: false, n: 0 };
  S.src = world.add({ id: 3, scale: 'voice', recipe: null, screen: false });
  let stream = null, srcN = null, an = null, buf = null, cand = null, candN = 0, cur = null, quiet = 0, k = 0; const P = {};
  // recording (v0.0.6, PROPOSAL opts.sample): while singing, the mic also streams into a phone-only buffer (max 8 s); on release it
  // is chopped and becomes the 'your voice' recipe the ohm you sang to blends in. Kept in memory only, never saved or sent.
  let tap = null, chunks = [], frames = 0, marks = []; S.slices = 0; S.voiceRec = null;
  const startRec = () => { if (!O.sample || !O.sample.on || !audio.ctx || typeof AudioWorkletNode === 'undefined') return; try { tap = new AudioWorkletNode(audio.ctx, 'jo-tap', { numberOfInputs: 1, numberOfOutputs: 0 }); } catch (e) { tap = null; return; }
    chunks = []; frames = 0; marks = []; tap.port.onmessage = e => { if (frames < audio.ctx.sampleRate * 8) { chunks.push(e.data); frames += e.data.length; } }; srcN.connect(tap); tap.port.postMessage({ on: 1 }); };
  S.finish = (rec, sr) => { const sl = chop(rec, sr, marks, { mode: O.sample.chop, spb: music.spb(), gate: O.sing.gate }).filter(s => s.hz > 0);
    if (!sl.length) return 0; const base = 1000 + ((S.gen = (S.gen || 0) + 1) % 2) * 100;    // two banks: the new one replaces the old
    for (let i = 0; i < 16; i++) audio.setSample && audio.setSample(base + i, i < sl.length ? sl[i].d : null, i < sl.length ? sl[i].hz : 0);
    if (!S.voiceRec) { S.voiceRec = makeRecipe(4711, { name: 'your voice' }); S.voiceRec.mix = { modal: 0, synth: 0 }; }
    S.voiceRec.sample = sl.map((s, i) => [base + i, s.hz]); S.slices = sl.length; S.src.recipe = S.voiceRec.id; return sl.length; };
  const stopRec = () => { if (!tap) return; tap.port.postMessage({ on: 0 }); try { srcN.disconnect(tap); } catch (e) { } tap = null;
    const rec = new Float32Array(frames); let w = 0; for (const c of chunks) { rec.set(c.subarray(0, Math.min(c.length, frames - w)), w); w += c.length; if (w >= frames) break; } chunks = [];
    S.finish(rec, audio.ctx.sampleRate); };
  const nearestDeg = hz => { let best = 0, be = 1e9; for (let d = -21; d <= 35; d++) { const e = Math.abs(Math.log2(hz / music.hz(d, 0))); if (e < be) { be = e; best = d; } } return best; };
  // v0.0.6 dip while singing (Wilbow 8D: depends on context, PROPOSAL opts.sing.duckMode 'context'): only the ohm LISTENING to you
  // dips (duckDb), the closest other ohm dips lightly (duckDb x nearK), everyone else keeps playing; headphones lessen it (phonesK).
  // 'all' = the old whole-mix dip. Applied per note in sound.js (S.dbFor), so it costs nothing per block.
  const pos = o => o.place || o.body || null, dist = (a, b) => { const p = pos(a), q = pos(b); return p && q ? Math.hypot((p.x || 0) - (q.x || 0), (p.y || 0) - (q.y || 0)) : 1e9; };
  S.dbFor = o => { const s = O.sing; if (!S.active || S.listen || !s.duck || s.duckMode === 'all' || o.scale !== 'ohm') return 0; const k = S.phones ? (s.phonesK == null ? .3 : s.phonesK) : 1;
    if (o === S.to) return s.duckDb * k; if (S.near === undefined || S.nearT !== (music.now() * 2 | 0)) { S.nearT = music.now() * 2 | 0; let bd = 1e9; S.near = null; for (const q of world.sources) if (q.scale === 'ohm' && q !== S.to) { const d = dist(q, S.src); if (d < bd) { bd = d; S.near = q; } } }
    return o === S.near ? s.duckDb * (s.nearK == null ? .4 : s.nearK) * k : 0; };
  world.dbFor = S.dbFor;
  const duck = on => { if (!audio.ctx || !audio.out) return; const s = O.sing, db = !on || !s.duck || s.duckMode !== 'all' ? 0 : S.phones ? s.phonesDb : s.duckDb;
    audio.out.gain.setTargetAtTime(Math.pow(10, db / 20), audio.ctx.currentTime, .08); };
  const detectPhones = async () => { const m = O.sing.phones; if (m !== 'auto') return m === 'on';
    try { const ds = await navigator.mediaDevices.enumerateDevices(); return ds.some(d => d.kind === 'audiooutput' && /head|ear|bluetooth|bt|wired|usb|airpod|buds/i.test(d.label)); } catch (e) { return false; } };
  // v0.0.14 (gesture check): opt.listen = the mic only LISTENS (ground shaping with two resting fingers, shape.js T1): no recording into
  // the voice recipe, no sung notes to an ohm (no harmony votes), no ducking; rms + hzNow still update for the ground.
  S.listen = false;
  S.start = async (to, opt) => { if (S.active || !O.sing || !O.sing.on || !audio.ctx || !navigator.mediaDevices) return; S.active = true; S.listen = !!(opt && opt.listen); S.to = to; S.src.place = to.place ? { ...to.place } : { x: 0, y: 0 };
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!S.active) { S.stop(); return; }
      srcN = audio.ctx.createMediaStreamSource(stream); an = audio.ctx.createAnalyser(); an.fftSize = 2048; buf = new Float32Array(an.fftSize); srcN.connect(an);   // analyser only: never to the speakers
      if (!S.listen) startRec();
      S.phones = await detectPhones(); duck(!S.listen); S.err = ''; } catch (e) { S.err = String(e && e.name || e); S.active = false; } };
  S.stop = () => { S.active = false; S.latched = false; S.listen = false; duck(false); if (tap) stopRec(); if (srcN) try { srcN.disconnect(); } catch (e) { } if (stream) for (const t of stream.getTracks()) t.stop(); stream = srcN = an = null; cand = cur = null; candN = 0; S.deg = null; };
  // v0.0.7 (Wilbow 30A 30B 30D): held = mic on while held; AND toggle (PROPOSAL which applies, opts.sing.latchS): a rest shorter than
  // latchS (1.5 s after the mic opened) leaves the mic OPEN; the next rest on an ohm closes it. A longer hold = on only while held.
  S.latched = false;
  bus.on('sing', ev => { const L = O.sing.latchS == null ? 1.5 : O.sing.latchS;
    if (ev.on) { if (S.active && S.listen) S.stop();   // singing to an ohm takes over a listening (ground-shaping) mic
      if (S.active && S.latched) { S.latched = false; S.closing = true; S.stop(); return; } S.closing = false; S.onAt = performance.now(); S.start(ev.src || world.ohm); }
    else { if (S.closing) { S.closing = false; return; } if (S.active && L > 0 && performance.now() - S.onAt < L * 1000 && !S.latched) { S.latched = true; return; } if (!S.latched) S.stop(); } });
  // control-rate: every other tick (~20 Hz). A sung note = the same scale degree on 2 reads in a row; a new note when it changes
  // or after a gap. Each one becomes a note event from the voice source, addressed to the ohm you sang to.
  S.tick = () => { if (!S.active || !an || (k++ & 1)) return; an.getFloatTimeDomainData(buf); detectPitch(buf, audio.ctx.sampleRate, P); S.rms = P.rms; S.hzNow = P.clarity > .8 ? P.hz : S.hzNow; if (S.listen) return;
    if (P.rms < O.sing.gate || P.clarity < .8 || !P.hz) { if (++quiet >= 3) { cur = null; S.cur = null; } candN = 0; S.hz = 0; S.deg = null; return; }
    quiet = 0; S.hz = P.hz; const d = nearestDeg(P.hz); S.deg = d; if (d === cand) candN++; else { cand = d; candN = 1; }
    // v0.0.7 (31, 33): the note keeps its real start time, its length and its slide / bend (cents around its scale note) while it lasts
    const nb = music.beat(); if (S.cur) { const c = S.cur; c.len = nb - c.sungB; if (c.bend.length < 96) c.bend.push([c.len, 1200 * Math.log2(P.hz / music.hz(c.deg, 0))]); }
    if (candN === 2 && d !== cur) { cur = d; S.n++; marks.push(Math.max(0, frames - Math.round(audio.ctx.sampleRate * .05))); S.cur = { src: S.src, to: S.to, kind: 'note', deg: d, oct: 0, vel: Math.min(1, .4 + P.rms * 4), dur: .6, t: music.now(), sungB: music.beat(music.now() - .1), len: .1, bend: [] }; bus.note(S.cur); } };
  return S;
}
