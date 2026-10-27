// v0.0.25 haptics port: the old game's buzz set on new-engine events, 120 ms apart, off switch
let buzz = []; Object.defineProperty(globalThis, 'navigator', { value: { vibrate: ms => { buzz.push(ms); return true; } }, configurable: true });
const { createHaptics } = await import('../www/js/haptics.js'); const { fakeBus } = await import('./fakes.mjs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const bus = fakeBus(), sys = { gestures: { marks: [] } }, H = createHaptics(bus, sys); const wait = ms => new Promise(r => setTimeout(r, ms));
const evs = [['spawn.spiral', {}], ['breed', {}], ['mouth', { on: true }], ['walk.jump', {}], ['terrain.crack', {}], ['moment', { k: 1 }]];
for (const [type, e] of evs) { bus.post({ type, ...e }); await wait(130); }
ok(buzz.length === evs.length && buzz[4] === 28 && buzz[5] === 60, 'one buzz per kind (' + buzz.join(',') + ')');
buzz = []; bus.post({ type: 'moment', k: .3 }); ok(!buzz.length, 'a small moment does not buzz');
await wait(130); bus.post({ type: 'spawn.spiral' }); bus.post({ type: 'spawn.spiral' }); ok(buzz.length === 1, 'at most one buzz per 120 ms');
await wait(130); buzz = []; sys.gestures.marks.push({ type: 'dev.open', t: 5 }); H.tick(); H.tick(); ok(buzz.length === 1, 'the 3-finger dev hold buzzes once');
await wait(130); buzz = []; H.opts.on = false; bus.post({ type: 'breed' }); ok(!buzz.length, 'switch off: no buzz (v0.0.24)');
delete globalThis.navigator; H.opts.on = true; await wait(130); let threw = false; try { bus.post({ type: 'breed' }); } catch (e) { threw = true; } ok(!threw, 'no vibration API: silent no-op');
console.log(fails ? 'HAPTICS_FAIL ' + fails : 'HAPTICS_OK'); process.exit(fails ? 1 : 0);
