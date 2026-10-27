// RECIPE STORE: save / load / list whole sounds (one recipe = one JSON object: name, seed, modal body, synth genes + family,
// mix, FX chain, matrix rows, LFOs, mod envelope). CHOICE: localStorage key 'jo.recipes' (WebView storage, survives restarts,
// no extra Capacitor plugin). Swap for @capacitor/filesystem later if recipes should be files the player can share.
import { toJSON, fromJSON } from './recipe.js';
const KEY = 'jo.recipes';
const all = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
export const store = {
  list: () => Object.keys(all()).sort(),
  save: (name, rec) => { const a = all(); const o = toJSON(rec); o.name = name; a[name] = o; localStorage.setItem(KEY, JSON.stringify(a)); return name; },
  load: name => { const o = all()[name]; return o ? fromJSON(o) : null; },
};
