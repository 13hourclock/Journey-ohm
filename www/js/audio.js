// Main-thread audio engine. Ported from /workspace/softsound/www/js/audio.js (one AudioWorkletNode, data: URL module
// loading because blob URLs can fail in Android WebView, context heal/rebuild). Step 1 changes: latencyHint 'interactive'
// (old game used 'balanced'), no ScriptProcessor fallback (NEW_ENGINE 10.3), live params, timing stats.
// The engine knows nothing about ohms: it only plays voice messages built by recipes (recipe.js).
import { DSPFactory } from './dsp.js';
import { InstFactory } from './dsp/inst.js';
import { FXFactory } from './dsp/fx.js';
import { TractFactory } from './dsp/tract.js';

const WORKLET_SRC = `const DSPFactory=${DSPFactory.toString()};
const TractFactory=${TractFactory.toString()};
const InstFactory=${InstFactory.toString()};
const FXFactory=${FXFactory.toString()};
const PERF=(typeof performance!=='undefined'&&performance.now)?()=>performance.now():()=>Date.now();
class JOProc extends AudioWorkletProcessor{constructor(){super();const now=()=>currentTime;now.perf=PERF;this.d=DSPFactory(sampleRate,now,InstFactory,FXFactory);this.n=0;
this.port.onmessage=e=>{const m=e.data;if(Array.isArray(m))for(const x of m)this.d.msg(x);else this.d.msg(m);};}
process(i,o){const out=o[0];const L=out[0],R=out[1]||out[0];this.d.render(L,R,L.length);if(this.n%8===0){this.port.postMessage({lv:this.d.levels(),ct:currentTime});}if(++this.n%48===0){const s=this.d.stats();s.ct=currentTime;s.perfOk=(typeof performance!=='undefined');this.port.postMessage(s);}return true;}}
registerProcessor('jo-proc',JOProc);
class JOTap extends AudioWorkletProcessor{constructor(){super();this.on=0;this.b=new Float32Array(2048);this.w=0;this.port.onmessage=e=>{this.on=e.data.on;this.w=0;};}
process(i){const x=i[0]&&i[0][0];if(this.on&&x){for(let k=0;k<x.length;k++){this.b[this.w++]=x[k];if(this.w===2048){this.port.postMessage(this.b,[this.b.buffer]);this.b=new Float32Array(2048);this.w=0;}}}return true;}}
registerProcessor('jo-tap',JOTap);`;

export function createAudio() {
  const A = { samples: null, ctx: null, node: null, ready: false, err: null, last: null, mon: [], pending: new Map(), early: [], touchMs: [], nextId: 1, heals: { resume: 0, rebuild: 0 }, params: {}, onStats: null };
  A.init = async () => { if (A.ctx) { if (A.ctx.state !== 'running') { try { await A.ctx.resume(); } catch (e) { } } return; } await A.build(); };
  A.build = async () => {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) { A.err = 'no WebAudio'; return; }
    let c; try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { c = new AC(); }
    A.ctx = c; A.out = c.createGain(); A.out.connect(c.destination);
    A.scope = c.createAnalyser(); A.scope.fftSize = 1024; A.scope.smoothingTimeConstant = 0; A.out.connect(A.scope); A.scopeBuf = new Float32Array(A.scope.fftSize);
    c.onstatechange = () => { if (c !== A.ctx) return; if (c.state === 'closed') A.rebuild('closed'); else if (c.state !== 'running' && !document.hidden) A.heal(); };
    try { if (!c.audioWorklet) throw new Error('no AudioWorklet');
      const url = 'data:application/javascript;base64,' + btoa(unescape(encodeURIComponent(WORKLET_SRC)));
      await c.audioWorklet.addModule(url);
      A.node = new AudioWorkletNode(c, 'jo-proc', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
      A.node.port.onmessage = e => { if (e.data.lv) { if (A.onLevels) A.onLevels(e.data.lv, e.data.ct); } else A._stats(e.data); };
    } catch (e) { A.err = String(e && e.message || e); return; }
    A.node.connect(A.out); A.ready = true; A.lastStatT = performance.now();
    for (const k in A.params) A.send({ t: 'param', k, v: A.params[k] });
    for (const [id, s] of A.samples) A.send({ t: 'smpSet', id, d: s.d, hz: s.hz });   // a rebuilt renderer gets the sample bank back
    if (A.early.length) { A.send(A.early.splice(0)); }   // the very first tap (sent while the worklet was still loading) still sounds; not timed   // a rebuilt renderer gets the live knob values back
    try { await c.resume(); } catch (e) { }
  };
  A.heal = () => { const c = A.ctx; if (!c || c.state === 'running') return; A.heals.resume++; try { const p = c.resume(); if (p && p.catch) p.catch(() => { }); } catch (e) { } };
  A.rebuild = async () => { if (A._rb) return; A._rb = true; A.heals.rebuild++; A.ready = false; try { if (A.ctx && A.ctx.state !== 'closed') A.ctx.close(); } catch (e) { } A.ctx = null; try { await A.build(); } catch (e) { A.err = String(e); } A._rb = false; };
  setInterval(() => { if (!A.ready || document.hidden) return; if (A.ctx.state !== 'running') A.heal(); else if (performance.now() - A.lastStatT > 6000) { A.lastStatT = performance.now(); A.rebuild(); } }, 1000);
  document.addEventListener('visibilitychange', () => { if (!A.ctx) return; if (document.hidden) { if (!(A.keepBg && A.keepBg())) try { A.ctx.suspend(); } catch (e) { } } else A.heal(); });   // v0.0.3: optional keep-playing when hidden

  // context time -> performance.now() time at which that sample reaches the speaker (getOutputTimestamp includes output latency)
  A.ctxToPerf = ct => { const c = A.ctx; if (!c) return null;
    if (c.getOutputTimestamp) { const ts = c.getOutputTimestamp(); if (ts && ts.performanceTime > 0) return ts.performanceTime + (ct - ts.contextTime) * 1000; }
    return performance.now() + (ct - c.currentTime) * 1000 + ((c.baseLatency || 0) + (c.outputLatency || 0)) * 1000; };
  A.latency = () => A.ctx ? { base: (A.ctx.baseLatency || 0) * 1000, output: (A.ctx.outputLatency || 0) * 1000, sr: A.ctx.sampleRate } : null;
  A._stats = s => { s.wall = performance.now(); A.lastStatT = s.wall;
    for (const a of s.acks || []) { const t0 = A.pending.get(a.id); if (t0 == null) continue; A.pending.delete(a.id); const heard = A.ctxToPerf(a.ct); if (heard != null) { A.touchMs.push(heard - t0); if (A.touchMs.length > 50) A.touchMs.shift(); } }
    if (A.pending.size > 64) A.pending.clear();
    A.last = s; A.mon.push(s); if (A.mon.length > 400) A.mon.shift(); if (A.onStats) A.onStats(s); };
  // v0.0.25 smoothness (A.opts.batch, dev panel): every message sent in one task goes to the worklet as ONE postMessage at the end of
  // that task (a microtask), in order - the worklet already takes arrays. Was one postMessage per message: a control tick with many
  // live / note messages paid the per-message cost dozens of times (the hitch when a song or a new voice set starts). Off = v0.0.24.
  A.opts = { batch: true }; A.q = []; A.batches = 0;
  A.flush = () => { if (!A.q.length) return; const q = A.q; A.q = []; A.batches++; if (A.ready && A.node) A.node.port.postMessage(q.length === 1 ? q[0] : q); };
  A.send = m => { if (!A.ready) return; if (A.opts.batch === false) { A.node.port.postMessage(m); return; }
    if (!A.q.length) queueMicrotask(A.flush); if (Array.isArray(m)) { for (const x of m) A.q.push(x); } else A.q.push(m); };
  // v0.0.6 sample bank (in memory on the phone only; never saved or sent anywhere)
  A.samples = new Map(); A.setSample = (id, d, hz) => { if (d) A.samples.set(id, { d, hz }); else A.samples.delete(id); A.send({ t: 'smpSet', id, d, hz }); };
  // play one voice message now. inputT = performance-time of the touch that caused it (for touch-to-sound timing), or null
  A.voice = (msg, inputT) => { if (!A.ready) { if (A.ctx && A.early.length < 8) { msg.t = msg.t || 'note'; msg.id = A.nextId++; A.early.push(msg); } return 0; } msg.t = msg.t || 'note'; msg.id = A.nextId++; if (inputT != null) { msg.ack = 1; A.pending.set(msg.id, inputT); } A.send(msg); return msg.id; };
  A.setParam = (k, v) => { A.params[k] = v; A.send({ t: 'param', k, v }); };
  A.readScope = () => { if (!A.scope) return null; A.scope.getFloatTimeDomainData(A.scopeBuf); return A.scopeBuf; };
  return A;
}
