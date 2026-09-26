# Character bible: The Apostle Peter

The film has one Peter. He is a single module (`src/canvas-core/peter/figure/cast.ts`) posed in every shot. He is never redrawn, never re-described and never generated. The sheet `out/peter_character_sheet.png` is rendered from the same code the film uses (`node pipeline/render.mjs --film peterSheet --frames 0 --outdir out`), so the sheet and the film cannot disagree.

## The rule

**The bones never change. Age, hair, beard, weather and cloth do.**

| Fixed at every age (`PETER_BONES`) | Value | What it reads as |
|---|---|---|
| Face width / jaw / cheek | 1.04 / 1.08 / 1.15 | a broad, square working man's face |
| Brow ridge | 1.25 | heavy brow, deep-set eyes (eye depth 1.2) |
| Nose | length 1.02, width 1.22, bump 1.0, tip 1.15 | broad, once-broken fisherman's nose |
| Eyes | size 0.96, colour `#4a2e1c` | dark brown, a little small under the brow |
| Neck | 1.12 | thick neck, strong shoulders (body bulk 1.12 → 1.0 with age) |
| **The scar** | `browScar: true` | a pale nick through the **left** eyebrow: his mark, visible from 02.2 to 12.2 |
| Hair | tight curls (`hairCurl 1.0`), short | never long; the icon forelock arrives only with age |

Height: 1.72 m (stage A) settling to 1.69 m at 65.

## Five ages

| Stage | Age | Clips (shots) | Hair / beard | Skin | Costume |
|---|---|---|---|---|---|
| **A · Simon** | ~30 | 01.1, 02, 03 | short dark curls `#2a1d15`, low hairline, short beard (0.55) | sun-dark `#a06e54` | knee tunic `#8a6a4a`, short sleeves, no mantle, bare forearms, heavy dirt (0.45) |
| **B · the disciple** | 31–33 | 01.2, 04, 05, 06 | beard fuller (0.70), first recession | `#9d6b52` | long tunic `#7a5a3c`, long sleeves, slate-blue mantle `#5f6f7c` |
| **C · Passion and Resurrection** | 33–34 | 07, 08, 09.1–09.2 | first grey (0.05), tired lines | `#976850` | the same clothes worn darker (`#6e5238`, mantle `#56636f`); hooded in the courtyard and the upper room |
| **D · the missionary** | 40–55 | 09.3–09.9, 10.1 | grey at 30–35 %, temples receding, forelock appears, beard full (0.95) | weathered `#956a55` | mantle faded to `#6f7c86` |
| **E · Rome** | ~65 | 10.2–12.2 (and the icon of 12) | grey curls (`#6e6259`, 72 % grey), high forehead with the icons' forelock, short round grey beard | `#9c7663` | faded tunic `#6e5a48`, pale mantle `#7f8a92` |

The base outfit never changes. It is the same tunic, belt and mantle, **fading and wearing** over 35 years. Those colours are a quiet thread through the film: the mantle is the grey-blue of the lake he left.

## Christ

- **Face:** the same in every appearance (`CHRIST`). A longer oval face, straight narrow nose, calm almond eyes (lid 0.55), dark hair parted in the middle to the shoulders, a fuller forked beard.
- **Costume:** undyed linen tunic `#d2c3a4` and a madder-red mantle `#7e3b32`. That red is the only saturated warm cloth in the film.
- **Staging rules:**
  - His face is **never** in close-up.
  - He is seen from behind (01.2, 03.1, 04.1), at a distance (07.4) or in rim light (06.3, 08.6).
  - His presence is carried by light, posture and Peter's reaction.
  - In 06.3 He is a figure of light. In 13.7 He is one of two far figures on the shore.

## The others

| Who | Where | Distinguishing marks |
|---|---|---|
| **Andrew** (brother) | 01.2, 02 (hauling beside him), 04, 05, 08, 09 | Peter's build but finer; shorter beard, lighter hair `#3a2a1c`; ochre tunic `#9a7b55` |
| **James** | 01.2, 02, 04, 05, 06 Tabor, 08, 09 | long black beard (0.95), olive mantle `#4f5a4a` |
| **John** | 01.2, 02, 04, 05, 06 Tabor, 08, 09, and the second far figure in 13.7 | the youngest: beardless, longer hair (0.35), rust mantle `#8a6e5a` |
| **Paul** | 12.2 | the icons' Paul: high bald crown (hairline 0.62), long dark forked beard (1.6), short (1.62 m) |
| **Philip, Thomas, Matthew** | 01.2, 04, 05 (the others who hesitate), 08, 09 (the upper room) | background disciples with distinct noses, beards and mantles |
| **Crowds** (`extras.ts`) | 04.3, 07, 09.5, 10 | every face drawn from a seed: the same seed is always the same person, and neighbours never match. The mix is 50 % men, 30 % women (always veiled), 12 % elders, 8 % children |
| **Roman soldiers** | 10 (Rome, the street), 11 (the arrest, the corridor, the cross) | beardless; red wool tunic `#8a2e24`, dark cloak, bronze helmet drawn over the head |

## Acting vocabulary

- **Expressions** (`FACE`): neutral, joyful, amazed, confident, frightened, ashamed, crying, peaceful, determined, awe, vulnerable, accepted.
  - They are built from lid, brow, mouth, squint and gaze values and blended over time (`blendFace`).
  - Nothing snaps: every change eases over at least 8 frames.
- **Hands** (`HANDS`) tell the story as much as the face does:

| Hand | Where |
|---|---|
| grip | the rope 01.1, the rail 04.4 |
| release | the net slipping 03.3 |
| open | the confession 05.4 |
| defensive | the denials 07.3 |
| cover | face in his hands 07.6 |
| offer | the teaching 04, the bread at the fire 08, the icon 12.1 |
| bound | 11.2 |
| point | the man by the fire who points him out 07.3 |

- **Light presets** (`LIGHTS`), one per sequence:
  - studio (sheet only)
  - goldenMorning, day, lateAfternoon
  - predawn, glory (Tabor)
  - torchNight (the courtyard), dawn (08)
  - pentecost, romeDay, lamp (the hidden room), lateDay, candle (the feast)
  - moonNight

## Consistency checks

- One module, posed. Age changes only through the stage table above.
- The scar is on the **left** eyebrow in every shot. Check it on the contact sheet at 02.2, 05.4, 07.5, 08.6, 11.6 and 12.1.
- His mantle is grey-blue at every age, and never red. Red belongs to Christ and to the soldiers.
- Christ's face is never shown in close-up.

## Honest limits

The figures are painted 3-D figurines: faceted bodies shaded by a painterly brush pass, with heads built from planes. They hold together in mid shots and wides.

The closest faces are the weakest element, as `style_guide.md` warned: 07.5, 08.6 and 12.1. The eyes and lids read, but not with the subtlety of hand animation. Where a face would carry too much, the film stages the moment with light, posture and hands instead: 07.6, 11.5 and 13.7.
