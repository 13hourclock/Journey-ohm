// THE SOUND-DRIVEN KALEIDOSCOPE: what the music is doing -> the inputs of the sky kaleidoscope (Wilbow approved 1:56 PM MDT Oct 25).
// This module only LISTENS and READS (bus 'note' / 'ctl' / 'moment', music.chord / key / om / scale / jam / beat) and turns that into
// numbers; index.js bakes and draws them (once per bar, fixed small size, per-ohm rings in the same image). Each mapping has its own
// opt (all on), so each one can be tested and switched alone:
//   chord   : the chord -> number of mirror slices (simple = few calm slices, rich = more, interlocking); a chord change MORPHS from
//             the next beat over one beat (old and new bakes cross-fade), never a jump
//   key     : om + key -> base colours (bright modes warm and clear, dark modes deep and cool); settled harmony = colours meet
//             smoothly, tension = a slight clash at the edges
//   rhythm  : breathes with the bar + a small beat push, ONLY inside a jam or a big moment (never a constant throb); off-beat /
//             syncopated playing nudges the pattern sideways instead of pulsing it
//   ohms    : each ohm that is playing -> its own ring in its colour; bright, sharp timbres = crisp spiky shapes, soft warm ones =
//             rounded blurred shapes; loudness (note vel) = the ring's size and brightness
//   density : more ohms = richer, not louder: one ohm one simple ring, a full jam deep layers (alpha per ring ~ 1/sqrt(n), deeper
//             petals); past the cap the rest merge into one weave
//   arc     : song start = faint and low near the horizon; as the song develops it climbs and fills the sky; song end = it slowly
//             unwinds (turns back, sinks, fades) and returns to the rest veil
//   moment  : a big moment (st.big / bus 'moment') takes the sky briefly and is HELD to the next bar line, then settles over one bar
//   place   : on an unhealed, muted place it stays thin and dusty; colour and depth come with healing
// LOOKFEED (v0.0.21, master www/js/lookfeed.js; read through `feed` = the look ctx, all getters read lazily per frame): music.chord.kind
// ('triad' / 'other'; no 7ths on master - richness still from quality + off-chord notes), music.mode (name -> brightness),
// harmony.tension (ctx.harmony; else ctx.songs.discord of the top song), ohm.timbre { bright, damp } (else ctx.recipeOf(o).modal.p),
// ctx.song { phase, progress } (continuous arc; phase 'end' = the unwind), ctx.jam { on, you, pairs, k }. Every field keeps the old
// FALLBACK when it is absent (null / not a number): third + root table, root table + off-chord notes, src.bright / strike / seed hash,
// bus song.on / song.section / song.end, music.jam. Syncopation stays our own off-beat count (no honest source on master).
// out.feed = which fields came from the lookfeed this frame (READ-ONLY readout for tests).
export const KALEIDO_OPTS = {
  chord: true, key: true, rhythm: true, ohms: true, density: true, arc: true, moment: true, place: true,
  symMin: 5, symMax: 12,     // slices for the simplest / richest chord
  rings: 5,                  // per-ohm rings drawn one by one; more playing ohms merge into one weave ring
  hearBeats: 4,              // an ohm counts as playing for this many beats after its last note, then fades over the same again
  morphBeats: 1,             // a slice-count change cross-fades over this many beats, starting on the next beat
  mode: true,                // v0.0.29 jam keys: colour by the SOUNDING scale (music.mode / modeHow / semi()); a relative minor keeps its
                             // major's hues, minor = cooler + deeper light; false = the old reading (the scale's third, key hue as is)
  keyFadeBeats: 4,           // a key or mode change (pivot chords included) cross-fades the colours over this many beats (~a bar)
};
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hsl = (h, s, l, o) => { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  o[0] = Math.round(f(h + 1 / 3) * 255); o[1] = Math.round(f(h) * 255); o[2] = Math.round(f(h - 1 / 3) * 255); return o; };
const hash01 = v => { let h = 2166136261; const s = String(v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10007) / 10007; };
// chord quality by scale degree in a major-like 7-note scale (I ii iii IV V vi vii°): brightness and tension
const QB = [1, .35, .3, .85, .9, .4, .1], QT = [0, .4, .45, .25, .5, .3, .85];
const DUST = [150, 140, 128];
// mode name (lookfeed music.mode) -> brightness 0 dark .. 1 bright; 'other' / absent -> the old third-of-the-scale fallback
const MODE_B = { lydian: .95, ionian: .85, mixolydian: .7, dorian: .45, aeolian: .3, phrygian: .2, locrian: .1, major: .85, minor: .3 };   // major / minor: music.mode (v0.0.29 jamkeys)
const num = v => typeof v === 'number' && v === v;

export function createKaleidoSound({ music, bus, opts, feed } = {}) {
  const O = { ...KALEIDO_OPTS, ...(opts || {}) };
  const OH = new Map(), NT = [];   // playing ohms by id; the last notes (beat, pc, off-beat, in chord)
  const S = { songOn: 0, songP: 0, discord: null, endB: -1e9, jamB: -1e9, momK: 0, momB: -1e9, symT: null, symFrom: null, mB: -1e9, sig: null,
    lift: 1, fill: 1, rot: 0, lb: null, kf: null, nudge: 0, held: 0, holdTill: -1e9, holdK: 0, modeB: .6, tens: 0, offK: 0, cols: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], endId: null };
  const FD = { kind: false, mode: false, tension: false, timbre: false, song: false, jam: false };
  const fget = k => { try { return feed ? feed[k] : null; } catch (e) { return null; } };   // lookfeed getters: never let one throw into the frame
  const out = { sym: 6, symFrom: 6, morph: 1, cols: S.cols, clash: 0, clashCol: [0, 0, 0], breath: 0, kick: 0, nudge: 0, rings: [], weave: null, lift: 1, fill: 1, rot: 0,
    alpha: 1, big: 0, heal: 1, depthK: 1, playing: 0, jam: 0, rich: 0, tension: 0, modeB: .6, off: 0, songP: 0, arc: 'rest', feed: FD, O };
  const modeOf = () => { try { const m = music && music.mode; return m === 'minor' || m === 'major' ? m : null; } catch (e) { return null; } };
  const semis = () => { if (O.mode !== false && modeOf() === 'minor' && typeof music.semi === 'function') { try { const s = music.semi(); if (s && s.length) return s; } catch (e) { /* fall through */ } }
    const r = music && music.scale && music.scale.ratios; return r && r.length ? r.map(x => Math.round(12 * Math.log2(x)) % 12) : [0, 2, 4, 5, 7, 9, 11]; };
  const pcOf = d => { const s = semis(), n = s.length; return ((((music && music.key) | 0) + s[((d % n) + n) % n]) % 12 + 12) % 12; };
  const chordPcs = () => { const ch = music && music.chord; return ch && ch.tones ? ch.tones.map(pcOf) : [pcOf(0), pcOf(2), pcOf(4)]; };
  const beatNow = t => music && typeof music.beat === 'function' ? music.beat(t) : 0;
  // timbre 0 (soft, warm) .. 1 (bright, sharp): lookfeed ohm.timbre { bright, damp } (recipe modal.p: bright .3-.8 = mallet hardness,
  // damp .2-.8 = upper modes die faster = warmer), else ctx.recipeOf(o).modal.p, else src.bright, else a stable per-ohm seed hash
  const tbOf = p => clamp(.75 * ss(.3, .8, p.bright) + .25 * (num(p.damp) ? 1 - ss(.2, .8, p.damp) : .5));
  const timbreOf = src => { let t = null; try { t = src.timbre; } catch (e) { t = null; } if (t && num(t.bright)) { FD.timbre = true; return tbOf(t); }
    const ro = feed && typeof feed.recipeOf === 'function' ? (() => { try { return feed.recipeOf(src); } catch (e) { return null; } })() : null, rp = ro && ro.modal && ro.modal.p;
    if (rp && num(rp.bright)) { FD.timbre = true; return tbOf(rp); }
    FD.timbre = false;
    if (typeof src.bright === 'number') return clamp(src.bright); return hash01(src.seed != null ? src.seed : src.id); };
  const colOf = src => { const c = src.color || src.rgb; if (Array.isArray(c) && c.length >= 3) return [c[0], c[1], c[2]]; return hsl(typeof src.hue === 'number' ? src.hue : hash01(src.id) * 360, .72, .6, [0, 0, 0]); };
  if (bus && bus.on) {
    bus.on('note', ev => { if (!ev || !ev.src || (ev.kind !== 'note' && ev.kind !== 'strike')) return;
      const b = typeof ev.beat === 'number' ? ev.beat : beatNow(ev.t), id = ev.src.id != null ? ev.src.id : ev.src;
      let o = OH.get(id); if (!o) { if (OH.size > 64) { let old = null; for (const [k, v] of OH) if (!old || v.b < old[1].b) old = [k, v]; OH.delete(old[0]); } OH.set(id, o = { src: ev.src, b, vel: 0, sharp: timbreOf(ev.src), col: colOf(ev.src), hit: 0 }); }
      const v = typeof ev.vel === 'number' ? clamp(ev.vel) : .5; o.vel = Math.max(v, o.vel * .7); o.b = b; if (o.src !== ev.src || (feed && feed.recipeOf)) o.sharp = timbreOf(ev.src); o.src = ev.src;
      o.hit = o.hit * .8 + .2 * (ev.kind === 'strike' || (typeof ev.dur === 'number' && ev.dur < .5) ? 1 : 0);   // short / struck notes read sharper
      if (ev.jam) S.jamB = b;
      const fr = ((b % 1) + 1) % 1, pc = ev.deg != null ? pcOf(ev.deg) : -1; NT.push({ b, pc, off: fr > .2 && fr < .8 ? 1 : 0 }); if (NT.length > 48) NT.shift(); });
    bus.on('ctl', ev => { if (!ev || ev.src !== 'global') return; const v = +ev.v || 0;
      if (ev.key === 'song.on') { if (v > .05 && S.songOn <= .05) S.songP = 0; S.songOn = v; }
      else if (ev.key === 'song.section') S.songP = Math.max(S.songP, clamp(v));
      else if (ev.key === 'song.discord') S.discord = clamp(v);
      else if (ev.key === 'song.end' && v > 0) { const nb = beatNow(); if (nb - S.endB > 16) S.endB = nb; } });   // the lookfeed 'end' phase may have started it already
    bus.on('moment', ev => { if (ev && ev.k > 0) { S.momK = Math.max(S.momK, clamp(+ev.k)); S.momB = beatNow(ev.t); } });
  }
  // once per frame: e = { beat, bar, bp (bar phase), dt (beats since last call; derived when absent), heal (0..1 or null), dev, big (raw), sym0 (L.sym) }
  out.step = e => { const b = e.beat, B = O.hearBeats, dB = S.lb == null ? 0 : clamp(b - S.lb, 0, 2); S.lb = b; const k = 1 - Math.exp(-dB / 2);   // ease ~2 beats
    // ---- moment: held to the next bar line, then one bar to settle ----
    const bigIn = Math.max(clamp(e.big || 0), b - S.momB < 8 ? S.momK * clamp(1 - (b - S.momB) / 8) : 0);
    if (O.moment) { if (bigIn > S.held + .02) { S.held = bigIn; S.holdK = bigIn; S.holdTill = Math.ceil(b / 4 + .125) * 4; }
      else if (b <= S.holdTill) S.held = Math.max(S.holdK, bigIn); else S.held = Math.max(bigIn, S.holdK * clamp(1 - (b - S.holdTill) / 4)); out.big = S.held; }
    else out.big = bigIn;
    // ---- place ----
    const heal = O.place && typeof e.heal === 'number' ? clamp(e.heal) : 1; out.heal = heal;
    // ---- who is playing ----
    const R = out.rings; R.length = 0; let wN = 0, wK = 0; const wC = [0, 0, 0]; const ps = [];
    for (const o of OH.values()) { const age = b - o.b, f = age < B ? 1 : clamp(1 - (age - B) / B); if (f <= 0 || age < -1) continue; ps.push({ o, f }); }
    ps.sort((x, y) => y.o.vel * y.f - x.o.vel * x.f); out.playing = ps.length;
    const J = fget('jam'), jOk = !!J && typeof J.on === 'boolean'; FD.jam = jOk;   // lookfeed ctx.jam: your grid = full, autojam pairs by their strength
    const jF = jOk ? (J.on ? (J.you ? 1 : clamp(.55 + .45 * (num(J.k) ? J.k : 0) + .1 * (J.pairs | 0))) : 0) : music && music.jam ? 1 : 0;
    const jamK = Math.max(jF, clamp(1 - (b - S.jamB - B) / B), ps.length >= 3 ? ss(2, 4, ps.length) : 0); out.jam = jamK;
    if (O.ohms) { const cap = O.density ? O.rings : Math.max(O.rings, 8), n = ps.length, dens = O.density ? 1 / Math.sqrt(Math.max(1, Math.min(n, cap))) : 1;
      for (let i = 0; i < n; i++) { const { o, f } = ps[i], loud = clamp(o.vel * f), sharp = clamp(o.sharp * .75 + o.hit * .35), col = o.col;
        const c = heal < 1 ? [col[0] + (DUST[0] - col[0]) * (1 - heal) * .7, col[1] + (DUST[1] - col[1]) * (1 - heal) * .7, col[2] + (DUST[2] - col[2]) * (1 - heal) * .7] : col;
        if (i < cap) R.push({ id: o.src.id, col: c, loud, a: (.3 + .7 * loud) * dens * f, sharp, i });
        else if (O.density) { wN++; wK += loud * f; wC[0] += c[0]; wC[1] += c[1]; wC[2] += c[2]; } } }
    out.weave = wN ? { n: wN, col: [wC[0] / wN, wC[1] / wN, wC[2] / wN], a: Math.min(.8, .25 + .12 * wN) * clamp(wK / wN + .3) / Math.sqrt(O.rings) } : null;
    out.depthK = (O.density ? 1 + .45 * ss(1, 6, ps.length) : 1) * (.55 + .45 * heal);
    // ---- harmony: chord richness, mode brightness, tension (fallbacks: see the head) ----
    while (NT.length && NT[0].b < b - 4) NT.shift();
    const ch = music && music.chord, root0 = ch ? ((ch.root % 7) + 7) % 7 : 0, mnr = O.mode !== false && modeOf() === 'minor', root = mnr ? (root0 + 5) % 7 : root0, cp = chordPcs(), sc = semis(), inKey = new Set(sc.map((s, i) => pcOf(i)));
    let ext = 0, offc = 0, offb = 0; const seen = new Set();
    for (const x of NT) { offb += x.off; if (x.pc < 0) continue; if (!cp.includes(x.pc)) { offc++; if (inKey.has(x.pc)) seen.add(x.pc); } }
    ext = seen.size; const nn = NT.length;
    const kind = ch && typeof ch.kind === 'string' ? ch.kind : null; FD.kind = !!kind;   // lookfeed chord.kind: 'other' = not stacked thirds (sus / cluster): a little richer
    const rich = clamp((ch && ch.tones ? ch.tones.length - 3 : 0) / 3 + (kind === 'other' ? .18 : 0) + ext / 4 * .7 + (QB[root] < .5 ? .12 : 0) + (root === 6 ? .15 : 0));
    let mode = null; try { mode = music && music.mode; } catch (e) { mode = null; } const mB = typeof mode === 'string' ? MODE_B[mode] : undefined; FD.mode = mB != null;
    const third = sc.length >= 3 ? sc[2] : 4, modeT = clamp(.5 * (mB != null ? mB : third >= 4 ? .75 : .25) + .5 * QB[root]);
    const Hm = fget('harmony'); let tz = null; try { tz = Hm ? Hm.tension : null; } catch (e) { tz = null; }
    if (!num(tz)) { const Sg = fget('songs'); try { if (Sg && typeof Sg.discord === 'function' && Sg.groups) { let G = null; for (const g of Sg.groups) if (g.state === 'song' && g.song && (!G || g.k > G.k)) G = g; if (G) tz = Sg.discord(G); } } catch (e) { tz = null; } }
    FD.tension = num(tz);
    const tensT = clamp(num(tz) ? tz : S.discord != null && S.songOn > .05 ? S.discord : QT[root] * .7 + (nn ? offc / nn : 0) * .6);
    S.modeB += (modeT - S.modeB) * k; S.tens += (tensT - S.tens) * k; out.rich = rich; out.modeB = S.modeB; out.tension = S.tens;
    // ---- chord -> slices (target re-chosen on a chord change or a new bar; the morph starts on the NEXT beat) ----
    const sym0 = Math.max(2, Math.min(16, Math.round(e.sym0 || 6)));
    if (O.chord) { const sig = (ch ? root * 16 + (ch.tones ? ch.tones.length : 3) : 0) * 1000 + Math.floor(b / 4), symT = Math.round(O.symMin + rich * (O.symMax - O.symMin));
      if (S.symT == null) { S.symT = S.symFrom = symT; }
      else if (sig !== S.sig && symT !== S.symT) { const m = clamp((b - S.mB) / O.morphBeats); S.symFrom = m < .5 ? S.symFrom : S.symT; S.symT = symT; S.mB = Math.floor(b) + 1; }
      S.sig = sig; out.sym = S.symT; out.symFrom = S.symFrom; out.morph = ss(0, 1, (b - S.mB) / O.morphBeats); }
    else { out.sym = out.symFrom = sym0; out.morph = 1; }
    // ---- key + om -> colours; tension -> an edge clash ----
    if (O.key) { const key0 = (music && music.key) | 0, om = music && music.om ? music.om : 64;
      let how = null; try { how = music && music.modeHow; } catch (e) { how = null; }
      const key = mnr && how === 'rel' ? (key0 + 3) % 12 : key0;   // relative minor = the same pitches: its major's hue
      let h0 = ((key * 7) % 12) * 30 + clamp(Math.log2(om / 32) / 2) * 50;   // circle of fifths: neighbouring keys sit near each other
      if (O.mode !== false) { const KF = S.kf || (S.kf = { key, mnr, from: h0, h: h0, b0: -1e9 });   // a key / mode change: the hue cross-fades over ~a bar
        if (key !== KF.key || mnr !== KF.mnr) { KF.from = KF.h; KF.b0 = b; KF.key = key; KF.mnr = mnr; }
        const u = ss(0, 1, (b - KF.b0) / Math.max(.25, O.keyFadeBeats)), d = ((h0 - KF.from + 540) % 360) - 180; KF.h = u >= 1 ? h0 : KF.from + d * u; h0 = KF.h; }
      const warm = 38, cool = 232, mb = S.modeB, pull = .45, tgt = mb >= .5 ? warm : cool, d = ((tgt - h0 + 540) % 360) - 180; h0 += d * pull * Math.abs(mb - .5) * 2;
      const sat = (.45 + .4 * mb) * (.35 + .65 * heal), lit = .36 + .26 * mb, spread = 16 + 22 * (1 - S.tens);
      for (let i = 0; i < 4; i++) hsl(h0 + spread * (i - 1.5), sat, lit, S.cols[i]);
      out.clash = S.tens; hsl(h0 + 150, sat, lit, out.clashCol);
      if (heal < 1) for (const c of S.cols) for (let j = 0; j < 3; j++) c[j] += (DUST[j] - c[j]) * (1 - heal) * .55; }
    else out.clash = 0;
    out.cols = O.key ? S.cols : null;
    // ---- rhythm: bar breath + beat push only in a jam / big moment; syncopation nudges sideways ----
    const live = Math.max(jamK, out.big), offK = nn >= 3 ? offb / nn : 0; S.offK += (offK - S.offK) * k; out.off = S.offK;
    if (O.rhythm) { const bp = e.bp != null ? e.bp : (b / 4) % 1, fb = ((b % 1) + 1) % 1, sy = ss(.2, .6, S.offK);
      out.breath = live * .04 * (.5 - .5 * Math.cos(bp * 6.283)); out.kick = live * .028 * (1 - fb) ** 3 * (1 - sy);
      const side = (Math.floor(b / 4) & 1) ? 1 : -1; S.nudge += (side * .045 * sy * (.4 + .6 * live) - S.nudge) * (1 - Math.exp(-dB / 1.5)); out.nudge = S.nudge; }
    else { out.breath = null; out.kick = null; out.nudge = 0; }
    // ---- song arc ----
    let lift = 1, fill = 1, spin = 1, alpha = 1, arc = 'rest';
    const SG = fget('song'), sOk = !!SG && num(SG.progress); FD.song = sOk;   // lookfeed ctx.song: continuous progress; phase 'end' starts the unwind once per song
    if (sOk && SG.phase === 'end' && S.endId !== SG.id) { S.endId = SG.id; S.endB = b; }
    if (O.arc) { const sinceEnd = b - S.endB;
      if (sinceEnd >= 0 && sinceEnd < 16) { const u = sinceEnd / 16; arc = 'end'; spin = u < .5 ? -.6 : -.6 + 1.6 * ss(.5, 1, u); lift = .3 + .7 * ss(.55, 1, u); fill = .35 + .65 * ss(.55, 1, u); alpha = .45 + .55 * Math.abs(1 - 2 * u); }
      else if (sOk ? SG.phase !== 'end' : S.songOn > .05) { const p = clamp(sOk ? SG.progress : S.songP); arc = 'song'; lift = .12 + .88 * ss(0, .6, p); fill = .3 + .7 * ss(0, .75, p); alpha = .45 + .55 * ss(0, .5, p); } }
    S.lift += (lift - S.lift) * k; S.fill += (fill - S.fill) * k; out.lift = S.lift; out.fill = S.fill; out.alpha = alpha * (O.place ? .5 + .5 * heal : 1); out.arc = arc; out.songP = sOk ? SG.progress : S.songP;
    S.rot += dB / 4 * spin; out.rot = S.rot;   // in petals: one petal per bar at rest (seamless: the pattern is sym-fold symmetric)
    return out; };
  out.reset = () => { OH.clear(); NT.length = 0; S.symT = null; S.held = 0; S.holdK = 0; S.lb = null; };
  return out;
}
