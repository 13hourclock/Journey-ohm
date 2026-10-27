// BOUNCE THE SONG (Q358 'a', Wilbow 4:01 PM Oct 25; destination 4:02 PM): a River gesture renders the WHOLE SONG to an audio file.
//   Gesture (daw.js): inside the river, HOLD STILL 0.9 s on the empty strip BELOW the lanes -> the song in the river (the song group of
//   the first lane that is in a song, else the song group nearest your ohm) is rendered from its first bar to its ending.
//   Render: OFFLINE, faster than real time, on the same DSP code the audio worklet runs (dsp.js + dsp/inst.js + dsp/fx.js), fed the
//   song's full score (songs.js S.score: every member's part for every bar - edited river parts included), each note through its
//   ohm's own recipe (recipe.js voicesFor) at the song's tempo, + a reverb tail. 16-bit stereo WAV. Work is sliced so the app stays alive.
//   Destination = ONE swappable step, B.dest(blob, name): default = write the file to the app CACHE (Capacitor Filesystem) and open
//   the ANDROID SHARE SHEET (Capacitor Share) so you pick where it goes; on the web (or without the plugins) = a browser download.
//   Swap with B.dest = async (blob, name) => {...}.
//   Not in the bounce (my defaults, listed as questions): per-ohm effect racks, live influence modulation, breakdowns, river
//   automation curves. Switch opts.bounce.on (ON).
import { DSPFactory } from './dsp.js';
import { InstFactory } from './dsp/inst.js';
import { FXFactory } from './dsp/fx.js';
import { recipes, voicesFor, octaveOf } from './recipe.js';
export const BOUNCE_OPTS = { on: true, sr: 44100, tail: 2.5, slice: .5, holdMs: 900, block: 128 };
// 16-bit PCM WAV (stereo)
export function wavOf(L, R, sr) { const n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf), s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, n * 4, true); let o = 44; for (let i = 0; i < n; i++) { const a = Math.max(-1, Math.min(1, L[i])), b = Math.max(-1, Math.min(1, R[i])); v.setInt16(o, a * 32767, true); v.setInt16(o + 2, b * 32767, true); o += 4; } return buf; }
// score = [{ m (ohm), b (beats from the song start), d (degree), len (beats), vel }] -> { L, R, sr, sec }
export async function renderScore(score, { music, samples = null, sr = BOUNCE_OPTS.sr, tail = BOUNCE_OPTS.tail, slice = BOUNCE_OPTS.slice, block = BOUNCE_OPTS.block, onProgress = null, yieldFn = () => new Promise(r => setTimeout(r, 0)) } = {}) {
  const spb = music.spb(), ns = score.filter(n => n.m && recipes.get(n.m.recipe)).slice().sort((a, b) => a.b - b.b), end = ns.reduce((e, n) => Math.max(e, (n.b + (n.len || 1)) * spb), 0), sec = end + tail, total = Math.ceil(sec * sr);
  let t = 0; const NOW = () => t; NOW.perf = null; const D = DSPFactory(sr, NOW, InstFactory, FXFactory), L = new Float32Array(total), R = new Float32Array(total);
  if (samples) for (const [id, s] of samples) D.msg({ t: 'smpSet', id, d: s.d, hz: s.hz });
  let k = 0, id = 1, nextYield = slice * sr;
  for (let i = 0; i < total; i += block) { const n = Math.min(block, total - i); t = i / sr; const lim = (i + n) / sr;
    while (k < ns.length && ns[k].b * spb < lim) { const x = ns[k++], rec = recipes.get(x.m.recipe), oc = octaveOf(rec);
      for (const m of voicesFor(rec, { f: music.hz(x.d, (x.oct || 0) + oc), vel: x.vel == null ? .7 : x.vel, dur: x.len ? x.len * spb : undefined, src: x.m.id, fx: -1 }, {})) { m.t = m.t || 'note'; m.id = id++; m.fx = -1; D.msg(m); } }
    D.render(L.subarray(i, i + n), R.subarray(i, i + n), n);
    if (i >= nextYield) { nextYield += slice * sr; if (onProgress) onProgress(i / total); await yieldFn(); } }
  return { L, R, sr, sec, notes: ns.length }; }
// ---- destinations (swappable)
export const webDownload = async (blob, name) => { const d = globalThis.document; if (!d) return { via: 'none' }; const u = URL.createObjectURL(blob), a = d.createElement('a'); a.href = u; a.download = name; d.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); return { via: 'download' }; };
const b64Of = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(blob); });
export const shareDest = async (blob, name) => { const C = globalThis.Capacitor, native = C && C.isNativePlatform && C.isNativePlatform(), plug = k => C && ((C.Plugins && C.Plugins[k]) || (C.registerPlugin ? C.registerPlugin(k) : null));
  if (native) { try { const FS = plug('Filesystem'), SH = plug('Share'); if (FS && SH) { const w = await FS.writeFile({ path: name, data: await b64Of(blob), directory: 'CACHE' }); await SH.share({ title: name, files: [w.uri] }); return { via: 'share', uri: w.uri }; } } catch (e) { if (/cancel/i.test(String(e && e.message))) return { via: 'share', cancelled: true }; } }
  return webDownload(blob, name); };
export function createBounce(sim, sys, music, audio, bus, opts = {}) { const O = Object.assign({}, BOUNCE_OPTS, opts), B = { opts: O, busy: false, progress: 0, done: 0, last: null, dest: shareDest };
  // the song in the river: first lane in a song, else the song group nearest your ohm
  B.songNear = () => { const S = sys.songs; if (!S) return null; const D = sys.daw; for (const o of (D && D.lanes) || []) { const G = S.groupOf(o); if (G && G.state === 'song') return G; }
    const f = sim.ohm ? sim.ohm.body : { x: 0, y: 0 }, d = G => Math.min(...G.members.map(o => Math.hypot(o.body.x - f.x, o.body.y - f.y))); return S.groups.filter(G => G.state === 'song' && G.members.length).sort((a, b) => d(a) - d(b))[0] || null; };
  B.run = async (G = B.songNear()) => { if (!O.on || B.busy) return null; if (!G || !sys.songs || !sys.songs.score) { bus.post({ type: 'bounce.none' }); return null; }
    B.busy = true; B.progress = 0; bus.post({ type: 'bounce.start', song: G.song });
    try { const sc = sys.songs.score(G), r = await renderScore(sc.notes, { music, samples: audio && audio.samples, sr: O.sr, tail: O.tail, slice: O.slice, onProgress: p => { B.progress = p; } });
      const name = 'journey-ohm-' + String(G.song.name || G.song.id || 'song').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40) + '.wav', blob = new Blob([wavOf(r.L, r.R, r.sr)], { type: 'audio/wav' });
      B.progress = 1; const where = await B.dest(blob, name); B.done++; B.lastT = performance.now(); B.last = { name, sec: r.sec, notes: r.notes, bytes: blob.size, via: where && where.via }; bus.post({ type: 'bounce.done', ...B.last }); return B.last; }
    catch (e) { B.lastT = performance.now(); B.last = { err: String(e && e.message || e) }; bus.post({ type: 'bounce.fail', err: B.last.err }); return null; } finally { B.busy = false; } };
  return B; }
