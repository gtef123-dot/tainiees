# Style guide — The Apostle Peter

The one style contract for the film. Every shot, character and sound follows it; nobody changes it privately. ◆ marks a decision that is the director's own rather than the brief's.

## The look in one sentence

**A painted film: opaque oil-and-gouache brushwork on a warm toned ground, lit like a 19th-century plein-air painter working in Galilee, with Caravaggio's chiaroscuro for the night, moved by a multiplane camera through layers of air.** ◆

- **Base hand:** anidoodle's *Oil on canvas* (`paintedOil`): lean-to-fat opaque bristle strokes on toned linen, edges found on the lit side and lost in shadow. It is the only hand in the engine whose light model can carry both golden Galilee and a torch-lit night.
- **Historical visual research, public-domain sources only:**
  - Vasily Polenov's Galilee studies (1880s) for the lake, the stone and the light.
  - James Tissot's *Life of Christ* (1886–94, painted after his research trips to Palestine) for costume, architecture and crowds.
  - Caravaggio's *Denial of Saint Peter* (c. 1610) and *Crucifixion of Saint Peter* (1601) for the two dark sequences.
  - These are references for light and fact. Nothing is copied from them.
- **Why not the alternatives:**
  - *Folk-tale storybook* and *Pencil & watercolour* read as a children's book.
  - *Mid-century gouache* is too designed and too flat for "realistic lighting".
  - *Woodcut* and *Sumi-e* would make the film about the medium.

## Honest limits (read this first)

Everything is drawn by code, frame by frame, with no image generation. That buys total consistency: one Peter module, posed in every shot, never redrawn. It also buys the same film on every render. The ceiling is set by what can be painted procedurally:

- **What will be strong:**
  - Light, atmosphere, depth, landscapes and architecture, water, fire, cloth in wind, camera.
  - Silhouettes and posture acting.
  - Hands, which the character rig supports.
  - A score and soundscape synthesized to picture.
- **What will be the hardest part:** close-up faces with nuanced expression (07.5, 08.6, 11.6).
  - They are painted heads built on a planar structure: brow, cheek and jaw planes, lids and mouth as painted accents. They are not photoreal, and not the facial animation of a studio feature.
  - Expression will be carried by lid, brow and mouth shapes plus light and posture.
  - Milestone 2's character sheet is where we find out whether they reach the bar. If they don't, the fallback is to stage the key emotions with slightly wider framing, silhouette and hands, as painters did, rather than ship weak faces.
- **"Cloth physics", "volumetric light", "depth of field"** are painted approximations: layered wind deformation, light shafts and haze between multiplane layers, blur by layer depth. They are not simulations.

## The mark

| | |
|---|---|
| Ground | Warm toned linen (burnt sienna / umber imprimatura), weave multiplied lightly over everything so the whole film sits on one surface |
| Stroke | Flat bristle stroke, streaked by its bristles, two colours per stroke (loaded + picked up), feathered in, broken at the end |
| Order in a frame | Dark masses → mid tones → lights → impasto highlights → dark accents (the oil order) |
| Edges | Found on the lit side, lost in shadow. Characters' contours are slightly crisper than the world, so figures read on a phone |
| Detail | Detail concentrates where the eye should go (faces, hands); peripheries stay broad |
| Motion | Stroke fields are **seeded to surfaces**, so paint moves with the form instead of re-randomising each frame. A very low "living paint" shimmer on twos (every 2nd frame) on the ground only ◆. Nothing fades or scales in except true dissolves and the one fade through sky. |

## Multiplane camera

- Every environment is 5–7 painted depth layers: sky, far hills, mid, near, foreground occluder, plus characters, with haze between the layers (atmospheric perspective).
- The camera moves are push, pull, track, crane, tilt and handheld. Every move has a reason in `shotlist.md`.
- No orbiting, no drone moves, no zooms except the push-ins the brief asks for.
- Handheld is a smooth seeded noise path, deterministic, used only in danger (02.4, 04.3–04.4, 07.1–07.3).
- Slow motion: once only, in 07.4.
- Depth of field is blur by layer distance from the focus plane; rack focus animates the focus plane.

## Palettes

Each sequence has a controlled palette. The film's arc is **gold → darkness → dawn → fire → stone → gold**.

| Sequence | Clips | Colours |
|---|---|---|
| Galilee | 01–05 | ochre `#C8964A` · deep ochre `#9A6A2E` · Mediterranean blue `#3E6E8E` · lake light `#7FA6B8` · sun-bleached stone `#D9CDB4` · Capernaum basalt `#3B3A38` · olive `#6E7447` / `#4A5234` · natural linen `#E6DCC6` · golden sun `#F2C66D` |
| Transfiguration | 06 | predawn `#1E2A44` / `#3C4E6E` · divine white-gold `#FFF4D6` / `#F7D98A` · bright cloud `#EDEBE4` |
| Passion | 07 | moon blue `#2B3A55` / `#16202F` · desaturated earth `#5A5046` · torch orange `#E07A2F` · flame core `#F2A444` · deep shadow `#0B0E14` |
| Restoration | 08 | dawn gold `#F0C27A` · warm cream `#F3E6CC` · muted blue `#8FA3B5` · charcoal fire `#E8904A` |
| Pentecost | 09 | warm amber `#E3A33E` · firelight `#F28C38` · red-orange highlight `#D9582B` · interior dark `#3A2418` · Jerusalem limestone `#E8D6AE` |
| Rome | 10 | stone grey `#8C8A84` · terracotta `#B5653E` · deep muted red `#7A2E2A` · dusty sunlight `#E3CFA3` |
| Martyrdom | 11 | cool stone `#7D8288` · neutral `#A39E95` · warm late light `#E8B878` · silhouette `#2A2622` |
| Remembrance | 12–13 | gold `#D9A441` · candle `#F7C66A` · parchment `#E9D8B4` · dawn gold `#F0C27A` |

**Costume colours (constant across the film, faded with age):**
- Peter: tunic earth-brown `#7A5A3C`; outer garment muted blue-grey `#5F6F7C`, faded to `#7F8A92` by stage E; belt leather `#5A3B24`.
- Christ: undyed linen tunic `#E3D8C2`; mantle muted madder red-brown `#7E3B32`. It is never icon-bright red and blue. ◆

## Light as the character arc

| Beat | Light |
|---|---|
| Beginning | Golden morning through mist |
| Discipleship | Warm daylight |
| Confession | Late afternoon, soft rim on Peter, not supernatural |
| Transfiguration | Divine white-gold: the one supernatural light; every other source dies |
| Denial | Cold blue darkness, unstable torch and brazier orange, warmth draining with each denial |
| Restoration | Soft sunrise; the charcoal fire again, now warm |
| Pentecost | Warm, powerful, rushing interior light |
| Mission | Bright Mediterranean day |
| Rome | Hard stone-grey sunlight |
| Martyrdom | Quiet late-afternoon light, then bright sky |
| Final image | Dawn again, the opening light returned |

**Christ:**
- No halo in ordinary shots. His authority comes from stillness, composition, the reactions of others, and a subtle warmth in His key light.
- Light becomes symbolic only at the Transfiguration (06.3), and faintly as the look warms in 13.4.

## Peter's camera

| Peter feels | Camera |
|---|---|
| Confident | Slightly below eye level |
| Frightened | Tighter, less stable |
| Broken | More negative space around him |
| Restored | Balanced, symmetrical compositions |
| Preaching | Starts close, widens to reveal the crowd |
| Approaching martyrdom | Extremely calm, locked or imperceptible moves |

## Motifs (plant early, return changed)

- **Water:** livelihood (01–02) → the tear that becomes the lake (08.1) → memory (13.7).
- **Hands:**
  - rope grip (01.1)
  - releasing the net (03.3)
  - the confession gesture (05.4)
  - defensive at the fire (07.2)
  - covering his face (07.6)
  - unclenching (08.5)
  - helping a man rise (09.6)
  - open preaching hands (10.4)
  - offered, then bound with rope (11.1–11.2)
- **The charcoal fire** ◆: the fire where he denies Him (07.2) and the fire where he is restored (08.3), in the same framing (John 18:18, 21:9).
  - Pentecost turns fire into strength (09.2); Rome's lamps echo it (10.4).
- **Walking:**
  - He follows (01.2, 03.4, 04.1).
  - Others follow him (09.5).
  - He walks alone toward Rome and toward death (10.2, 11.3).
  - Two figures walk the shore at the end (13.7).
- **Rope:** the fisherman's rope (01.1) → the rope that binds him (11.2). ◆
- **Wood:** the boat's planks → the cross's rough timber (11.4) → the boat again (13.7).

## Transitions

These are motivated, never decorative:
- the net crossing the lens (01.1)
- sun flare → lake glitter (01.2)
- sun flare → star (05.5)
- white → black → passing torch (06.3 → 07.1)
- tear ripple → dawn lake (08.1)
- face → face (08.6 → 09.1)
- ox cart covers the years (10.1)
- passing column → the hidden room (10.3)
- fade through bright sky (11.6)
- slow dissolves only in the final remembrance (13)

## Typography

- One on-screen text only: **«29 Ιουνίου»** in 12.1.
- It is lettered in a restrained Greek book hand, in the parchment's ink colour, small, and it never animates in as a title card.

## Historical grounding (and what to avoid)

- **Capernaum and Bethsaida** were built of black basalt. The Galilee boats follow the excavated 1st-century Ginosar boat: about 8 m, cedar planks on oak frames, one mast.
- **Nets:**
  - the circular cast net with lead weights (Mt 4:18)
  - the dragnet with floats
  - mending with a wooden netting needle
- **Dress:** knee-length wool or linen tunics, a mantle, a leather belt, sandals. Work tunics are girded up.
- **Jerusalem:** pale limestone ashlar; clay oil lamps; the high priest's courtyard with a charcoal fire; the Temple's southern steps under the Royal Stoa.
- **Rome under Nero (c. 64–67 AD):**
  - insulae, terracotta roofs, the Aqua Claudia, temples on the Capitoline, soldiers in hobnailed caligae
  - the Circus of Nero on the Vatican hill with its Egyptian obelisk
- **Avoid:**
  - the Colosseum and the Arch of Titus (both built after Peter's death)
  - the Mamertine-prison cliché of chains and dungeons
  - catacombs as meeting places (they were burial grounds)
  - Renaissance or medieval architecture in Judea
  - halos in ordinary shots
  - glowing superhero imagery
  - modern objects

## Sound and music

- **Narration is dominant.**
  - The 13 ElevenLabs clips are used untouched, each placed at its exact frame.
  - Music and effects are ducked under the voice by a deterministic sidechain computed from the narration's own envelope. Target about 12 dB under speech, released in the pauses.
  - The final mix is about −16 LUFS integrated, true peak ≤ −1 dBTP.
- **Soundscape:** synthesized in code, per the brief's location lists. Water, rope, wood, gulls, wind, sandals, crowds, fire crackle, footsteps, birds, low air, carts, stone reverb.
  - The martyrdom is stripped to wind, cloth, distant wood and footsteps.
  - No graphic effects.
  - The rooster in 07.4 ◆ ships only if the synthesized crow reads as a rooster at low level. Otherwise it is replaced by a low tonal swell.
- **Score:** original, composed as notes and synthesized. One Peter theme follows his arc:

| State | Clips | Treatment |
|---|---|---|
| Intimate motif | 01–02 | Plucked lyre (harp model), one breath of ney |
| Theme introduced | 03 | Four notes on the cello, D Dorian ◆ |
| Theme expands | 04–05 | Strings in counterpoint, frame drum at walking pace |
| Ethereal expansion | 06 | Divided high strings, wordless voice pad |
| Theme breaks apart | 07 | Sparse low fragments, silence at the realisation |
| Theme returns slowly | 08 | Ney alone, then the cello |
| Full theme, first time | 09 | Tutti, D major ◆ |
| Lower, darker variation | 10 | Low strings and drum, D Aeolian |
| Simplified | 11 | One sustained note opening into a soft major chord |
| Chorale glow | 12 | Warm pads |
| Original form, richer harmony | 13 | Lyre and strings; the opening four notes close the film |

- **New instruments needed:** the engine already has strings, harp, guitar, piano and bells. The **ney** (breath-noise flute), **frame drum** (modal membrane) and **wordless voice pad** (formant-filtered saws) will be added as new synthesized instruments.
- Avoid a constant "ancient Middle Eastern" colour. Modal writing yes; stereotype no.
- You cannot hear what is measured, so one human listens to an 8-second sample before the score is built.
