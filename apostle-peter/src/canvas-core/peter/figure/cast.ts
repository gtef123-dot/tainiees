// THE CAST. Every face in the film, as measurements. Peter is ONE identity aged in five stages:
// the bones (width, jaw, brow, nose, eyes, the scar through his left eyebrow) never change; only
// hair, beard, grey, weathering and the lines of the face do. See docs/character_bible.md.
import type { Identity } from "./head";

const PETER_BONES = {
  seed: 1701, width: 1.04, jaw: 1.08, chin: 1.0, cheek: 1.15, brow: 1.25,
  noseLen: 1.02, noseWidth: 1.22, noseProj: 1.02, noseBump: 1.0, noseTip: 1.15,
  eyeSize: 0.96, eyeSpacing: 1.02, eyeDepth: 1.2, lidHeavy: 0.35, lipFull: 1.0, mouthWidth: 1.02,
  eyeColor: "#4a2e1c", earSize: 1.05, browScar: true, hairCurl: 1.0, hairLong: 0, beardFork: 0, neck: 1.12,
};
export type Stage = "A" | "B" | "C" | "D" | "E";
export const PETER: Record<Stage, Identity> = {
  // A: Simon the fisherman, about 30. Short dark curls, low hairline, short beard, sun-dark skin.
  A: { ...PETER_BONES, name: "peterA", skin: "#a06e54", hair: "#2a1d15", hairGray: 0, hairline: 0.3, recede: 0.05, forelock: 0, hairVol: 1.0, beard: 1, beardLen: 0.55, beardColor: "#2b1e16", beardGray: 0, mustache: 1, browThick: 1.25, browColor: "#24170f", age: 0.08 },
  // B: the disciple, 31-33. More sun; the beard a little fuller.
  B: { ...PETER_BONES, name: "peterB", skin: "#9d6b52", hair: "#2a1d15", hairGray: 0.02, hairline: 0.31, recede: 0.12, forelock: 0, hairVol: 1.0, beard: 1, beardLen: 0.7, beardColor: "#2b1e16", beardGray: 0.02, mustache: 1, browThick: 1.25, browColor: "#24170f", age: 0.14 },
  // C: Passion and Resurrection, 33-34. Tired; the first lines.
  C: { ...PETER_BONES, name: "peterC", skin: "#976850", hair: "#2b1f18", hairGray: 0.05, hairline: 0.32, recede: 0.2, forelock: 0, hairVol: 0.95, beard: 1, beardLen: 0.78, beardColor: "#2d2019", beardGray: 0.05, mustache: 1, browThick: 1.2, browColor: "#24170f", age: 0.24 },
  // D: the missionary years, 40-55. Fuller beard, weathered, the temples going.
  D: { ...PETER_BONES, name: "peterD", skin: "#956a55", hair: "#3a2c22", hairGray: 0.3, hairline: 0.36, recede: 0.45, forelock: 0.4, hairVol: 0.85, beard: 1, beardLen: 0.95, beardColor: "#3b2d24", beardGray: 0.35, mustache: 1, browThick: 1.15, browColor: "#2c2018", age: 0.5 },
  // E: Rome, about 65. Grey curls, the high forehead with a forelock of the icons, a short round grey beard.
  E: { ...PETER_BONES, name: "peterE", skin: "#9c7663", hair: "#6e6259", hairGray: 0.72, hairline: 0.44, recede: 0.7, forelock: 0.9, hairVol: 0.75, beard: 1, beardLen: 1.0, beardColor: "#7a6d63", beardGray: 0.75, mustache: 1, browThick: 1.05, browColor: "#4d4038", age: 0.85 },
};
// Christ: a longer oval face, a straight narrow nose, calm almond eyes, dark hair parted in the
// middle to the shoulders, a fuller beard. The same in every appearance.
export const CHRIST: Identity = {
  name: "christ", seed: 3301, width: 0.96, jaw: 0.9, chin: 0.95, cheek: 0.95, brow: 0.95,
  noseLen: 1.1, noseWidth: 0.9, noseProj: 1.08, noseBump: 0.1, noseTip: 0.55,
  eyeSize: 1.02, eyeSpacing: 0.98, eyeDepth: 1.0, lidHeavy: 0.55, lipFull: 0.95, mouthWidth: 0.96,
  skin: "#a57b60", hair: "#2e2016", hairGray: 0, hairline: 0.33, recede: 0, forelock: 0, hairVol: 0.9, hairCurl: 0.35, hairLong: 1,
  beard: 1, beardLen: 0.85, beardColor: "#2e2016", beardGray: 0, mustache: 1, beardFork: 0.4,
  browThick: 0.95, browColor: "#2a1d15", browScar: false, age: 0.12, eyeColor: "#3a2618", earSize: 0.95, neck: 1.0,
};
export const ANDREW: Identity = { ...PETER.A, name: "andrew", seed: 1702, width: 0.98, jaw: 0.96, cheek: 1.05, brow: 1.1, noseWidth: 1.05, noseBump: 0.3, noseTip: 0.8, browScar: false, hair: "#3a2a1c", beardColor: "#3a2a1c", beardLen: 0.4, skin: "#a3765c", hairCurl: 0.7, browThick: 1.05, lidHeavy: 0.2, age: 0.06 };
export const JAMES: Identity = { ...PETER.B, name: "james", seed: 1801, width: 0.98, jaw: 1.0, cheek: 1.0, brow: 1.05, noseLen: 1.08, noseWidth: 1.0, noseBump: 0.6, noseTip: 0.7, browScar: false, hair: "#1f1712", beardColor: "#1f1712", beardLen: 0.95, skin: "#9a6b54", hairCurl: 0.5, browThick: 1.1, age: 0.12 };
export const JOHN: Identity = { ...PETER.A, name: "john", seed: 1802, width: 0.95, jaw: 0.88, chin: 0.95, cheek: 0.95, brow: 0.9, noseLen: 0.98, noseWidth: 0.92, noseBump: 0, noseTip: 0.6, eyeSize: 1.04, browScar: false, hair: "#3a2818", hairLong: 0.35, hairVol: 1.0, hairCurl: 0.6, beard: 0, beardLen: 0, mustache: 0, skin: "#aa7d62", browThick: 0.9, age: 0, hairline: 0.31, recede: 0 };
// Paul: the icons' Paul - a high bald crown, a long dark beard.
export const PAUL: Identity = { ...PETER.E, name: "paul", seed: 1901, width: 0.98, jaw: 0.92, chin: 1.0, cheek: 1.0, brow: 1.2, noseLen: 1.12, noseWidth: 0.95, noseBump: 0.8, noseTip: 0.6, eyeSize: 0.95, lidHeavy: 0.5, browScar: false, hair: "#3a2c24", hairGray: 0.3, hairline: 0.62, recede: 1.0, forelock: 0, hairVol: 0.55, beard: 1, beardLen: 1.6, beardColor: "#3b2c22", beardGray: 0.3, beardFork: 0.3, skin: "#a07864", age: 0.7 };

// ---- figures: body + costume per stage. The base outfit never changes, it only fades and wears.
import type { Figure } from "./body";
export const PETER_FIG: Record<Stage, Figure> = {
  A: { id: PETER.A, height: 1.72, bulk: 1.12, costume: { tunic: "#8a6a4a", tunicLen: 0.5, sleeves: "short", belt: "#4a3322", sandal: "#5a3d27", dirt: 0.45 } },
  B: { id: PETER.B, height: 1.72, bulk: 1.1, costume: { tunic: "#7a5a3c", tunicLen: 0.3, sleeves: "long", mantle: "#5f6f7c", mantleLen: 0.42, belt: "#4a3322", sandal: "#5a3d27", dirt: 0.35 } },
  C: { id: PETER.C, height: 1.72, bulk: 1.08, costume: { tunic: "#6e5238", tunicLen: 0.3, sleeves: "long", mantle: "#56636f", mantleLen: 0.42, belt: "#43301f", sandal: "#4f3624", dirt: 0.5 } },
  D: { id: PETER.D, height: 1.71, bulk: 1.05, costume: { tunic: "#75593f", tunicLen: 0.3, sleeves: "long", mantle: "#6f7c86", mantleLen: 0.4, belt: "#4a3322", sandal: "#5a3d27", dirt: 0.55 } },
  E: { id: PETER.E, height: 1.69, bulk: 1.0, costume: { tunic: "#6e5a48", tunicLen: 0.28, sleeves: "long", mantle: "#7f8a92", mantleLen: 0.38, belt: "#4a3a2c", sandal: "#5a4533", dirt: 0.55 } },
};
export const CHRIST_FIG: Figure = { id: CHRIST, height: 1.76, bulk: 0.95, costume: { tunic: "#d2c3a4", tunicLen: 0.1, sleeves: "long", mantle: "#7e3b32", mantleLen: 0.2, belt: "#8a7456", sandal: "#6a4a30", dirt: 0.2 } };
export const ANDREW_FIG: Figure = { id: ANDREW, height: 1.7, bulk: 0.98, costume: { tunic: "#9a7b55", tunicLen: 0.5, sleeves: "short", belt: "#4a3322", sandal: "#5a3d27", dirt: 0.45 } };
export const JAMES_FIG: Figure = { id: JAMES, height: 1.74, bulk: 1.0, costume: { tunic: "#6b5a48", tunicLen: 0.3, sleeves: "long", mantle: "#4f5a4a", mantleLen: 0.42, belt: "#3d2c1f", dirt: 0.35 } };
export const JOHN_FIG: Figure = { id: JOHN, height: 1.68, bulk: 0.9, costume: { tunic: "#a08a6a", tunicLen: 0.3, sleeves: "long", mantle: "#8a6e5a", mantleLen: 0.45, belt: "#4a3322", dirt: 0.3 } };
export const PAUL_FIG: Figure = { id: PAUL, height: 1.62, bulk: 0.95, costume: { tunic: "#6a5a4a", tunicLen: 0.25, sleeves: "long", mantle: "#8a6a50", mantleLen: 0.35, belt: "#3d2c1f", dirt: 0.4 } };
