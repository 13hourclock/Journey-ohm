// GLOBE WORKER (world track, real planet step 1): builds terrain chunks, cloud maps and far-planet surfaces off the main thread
// (globe_mesh.js on globe.js), so the 3D land never costs the sim or the sound a frame.
// In: {type:'init', P, gen} | {type:'pd', pd} | {type:'chunk', id, f, l, i, j, gen} | {type:'clouds', t, gen} | {type:'bake', id, P}
// Out: {type:'chunk', id, gen, ...arrays} | {type:'clouds', gen, a} | {type:'bake', id, a} (arrays transferred)
import { makeGlobe } from './globe.js';
import { buildChunk, bakeClouds, bakePlanet } from './globe_mesh.js';
let G = null, pd = null, gen = 0;
onmessage = e => { const m = e.data;
  if (m.type === 'init') { G = makeGlobe(m.P); pd = null; gen = m.gen; return; }
  if (m.type === 'pd') { pd = m.pd; return; }
  if (m.type === 'chunk' && G && m.gen === gen) { const c = buildChunk(G, m.f, m.l, m.i, m.j, pd); c.type = 'chunk'; c.id = m.id; c.gen = gen;
    postMessage(c, [c.pos.buffer, c.nrm.buffer, c.aH.buffer, c.m0.buffer, c.m1.buffer, c.aF.buffer]); return; }
  if (m.type === 'clouds' && G && m.gen === gen) { const a = bakeClouds(G, m.t); postMessage({ type: 'clouds', gen, a }, [a.buffer]); return; }
  if (m.type === 'bake') { const a = bakePlanet(makeGlobe(m.P)); postMessage({ type: 'bake', id: m.id, a }, [a.buffer]); } };
