# Resonance special abilities (candidate list, started Oct 21 2026)
Abilities emerge when gene combinations cross thresholds. No named classes or text in game. Heritable and rare.
Status: ALL 25 APPROVED by Wilbow (Oct 21 2026) and implemented in v0.1 (www/js/abilities.js). Tests: tests/test_abilities.js (trigger, effect vs control, inheritance, rarity).

## Mechanism
- Each ability is a conjunction of 2-3 gene conditions (gene > or < a threshold). Thresholds come from tail probabilities: 0.0775 per gene for 2-gene combos, 0.182 per gene for 3-gene combos, so each ability shows up in about 0.6% of random genomes. About 14% of random genomes carry at least one.
- A session of about 20 offspring bred from ordinary parents shows about 1 ability on average. Half of all natural-life lineages carry one.
- Strength is how far the genes sit past their thresholds (0.35 to 1). It scales the effect.
- Abilities are heritable because they live in the genes. Two carriers always pass the ability on; a carrier crossed with an ordinary creature passes it on far above the baseline rate.
- There are no classes and no text. Each ability shows itself through the shared systems: physics forces and flags, light sources, notes, and fx.
- With mutation off (RS.MUTATION=false), new abilities appear only through crossover recombination or the player's DNA edits.


- [x] 1. Echolocation: low sight + high hearing. Sends sound pulses shown as rings and finds its way by the echoes.
- [x] 2. Perfect pitch: very high hearing + precision. Its presence pulls nearby creatures into tune.
- [x] 3. Living metronome: very high rhythmic precision. Holds a rock-steady pulse others lock to.
- [x] 4. Mimicry: high hearing + creativity. Copies any sound, including the player's phrases and other worlds' noises.
- [x] 5. Overtone singing: very pure tone + wide range. Sings two notes at once.
- [x] 6. Light singing: high bioluminescence + transparency. Emits beams in its pitch's colour that play optics and crystals.
- [x] 7. Resonant shatter: loud, high, pure. Can crack brittle material at its exact resonant pitch.
- [x] 8. Sound levitation: loudness + precision. Lifts small objects on standing waves.
- [x] 9. Conducting: leadership + rhythm. Leads tempo, dynamics and cadences for a whole colony.
- [x] 10. Composing: creativity + memory. Invents new motifs that spread through cultures.
- [x] 11. Weaving: builder drive + elasticity. Spins strings, which make harps and webs.
- [x] 12. Glassmaking: transparency + material eating. Secretes clear lens material.
- [x] 13. Tide calling: aquatic + rhythm. Moves water in rhythmic waves.
- [x] 14. Storm singing: loudness + atmosphere affinity. Can trigger lightning or rain.
- [x] 15. Seed carrying: vacuum tolerance + fertility. Rides comets to carry life to other worlds.
- [x] 16. Phasing: extreme transparency. Passes through material briefly, with a filtered sound.
- [x] 17. Symbiosis: empathy + small size. Lives inside another creature and boosts its voice or energy.
- [x] 18. Healing: empathy + perfect pitch. Restores dim or fading creatures by harmonising with them.
- [x] 19. Dream singing: nocturnal + memory. Sings slow drones while sleeping.
- [x] 20. Colour shifting: chameleon gene. Changes colour, and so key, to match its surroundings.
- [x] 21. Budding: high fertility + regeneration. Reproduces alone by splitting off a slightly mutated copy.
- [x] 22. Memory keeping: very long memory. Remembers ancestral songs and can revive old styles.
- [x] 23. Void walking: vacuum + gravity tolerance. Crosses open space between moons.
- [x] 24. Gravity dancing: buoyancy + mass extremes. Bends nearby objects' paths.
- [x] 25. Time stretching: rare extreme. Slows or speeds local tempo around itself.
