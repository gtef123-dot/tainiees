// ACTING. The brief's emotions as face settings, plus hand shapes and lights, shared by the character
// sheet and every shot, so "ashamed" at the fire is the same face as "ashamed" on the sheet.
import type { Expr, Light } from "./head";
import type { Hand } from "./body";
import { norm3, lerp, type RGB } from "../lib/math";

export const FACE: Record<string, Expr> = {
  neutral: { lid: 0.85 },
  joyful: { smile: 0.9, squint: 0.5, open: 0.22, browOut: 0.2, lid: 0.75 },
  amazed: { browIn: 0.75, browOut: 0.85, lid: 1.0, open: 0.35, gazeY: 0.08 },
  confident: { lid: 0.78, smile: 0.12, browIn: -0.25, knit: 0.15 },
  frightened: { browIn: 1, browOut: 0.35, knit: 0.35, lid: 1.0, open: 0.12, gazeX: 0.35, gazeY: -0.05 },
  ashamed: { browIn: 0.6, knit: 0.35, lid: 0.42, gazeY: -0.6, frown: 0.35 },
  crying: { browIn: 1, knit: 0.75, lid: 0.3, squint: 0.65, frown: 0.85, open: 0.18, tears: 1, tremble: 1 },
  peaceful: { lid: 0.55, smile: 0.12, browIn: 0.12 },
  determined: { knit: 0.5, lid: 0.75, frown: 0.12, browIn: -0.3 },
  awe: { browIn: 0.5, browOut: 0.4, lid: 0.95, open: 0.18, gazeY: 0.15 },
  vulnerable: { browIn: 0.8, knit: 0.2, lid: 0.6, gazeY: -0.15, frown: 0.2, tremble: 0.6, tears: 0.6 },
  accepted: { browIn: 0.35, lid: 0.7, smile: 0.18, tears: 0.7 },
};
export const blendFace = (a: Expr, b: Expr, t: number): Expr => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Expr>, out: Expr = {};
  const def: Record<string, number> = { lid: 0.85 };
  for (const k of keys) out[k] = lerp(a[k] ?? def[k] ?? 0, b[k] ?? def[k] ?? 0, t);
  return out;
};
export const HANDS: Record<string, Hand> = {
  relaxed: { curl: 0.38, spread: 0.05 },
  grip: { curl: 0.95, thumb: 0.8, thumbCurl: 0.7, spread: 0.02 },
  open: { curl: 0.08, spread: 0.3, thumb: 0.1, thumbCurl: 0.05 },
  release: { curl: 0.22, spread: 0.18, thumb: 0.2, thumbCurl: 0.1 },
  point: { fingers: [0.02, 0.9, 0.95, 1.0], thumb: 0.7, thumbCurl: 0.6 },
  defensive: { curl: 0.75, spread: 0.03, thumb: 0.6, thumbCurl: 0.5 },
  cover: { curl: 0.28, spread: 0.08, thumb: 0.25, thumbCurl: 0.2 },
  offer: { curl: 0.3, spread: 0.1, thumb: 0.3 },
  bound: { curl: 0.55, spread: 0.02, thumb: 0.5 },
};
// light rigs by the film's light arc (key direction is in view space: -x from the viewer's left)
const L = (key: [number, number, number], keyColor: RGB, keyAmt: number, fill: RGB, fillAmt: number, bounce: RGB, bounceAmt: number, rim?: [number, number, number], rimColor?: RGB, rimAmt = 0): Light =>
  ({ key: norm3(key), keyColor, keyAmt, fill, fillAmt, bounce, bounceAmt, rim: rim ? norm3(rim) : undefined, rimColor, rimAmt });
export const LIGHTS = {
  studio: L([-0.7, 0.55, 0.45], [1.0, 0.88, 0.72], 1.1, [0.45, 0.52, 0.62], 0.35, [0.55, 0.42, 0.3], 0.25, [0.8, 0.3, -0.5], [1, 0.9, 0.75], 0.3),
  goldenMorning: L([-0.8, 0.35, 0.3], [1.0, 0.8, 0.55], 1.15, [0.5, 0.58, 0.7], 0.38, [0.6, 0.5, 0.38], 0.3, [0.85, 0.35, -0.4], [1, 0.85, 0.6], 0.45),
  day: L([-0.55, 0.7, 0.45], [1.0, 0.93, 0.8], 1.15, [0.55, 0.62, 0.72], 0.4, [0.62, 0.55, 0.42], 0.3, [0.7, 0.3, -0.6], [1, 0.95, 0.85], 0.2),
  lateAfternoon: L([0.8, 0.3, 0.2], [1.0, 0.75, 0.48], 1.1, [0.45, 0.5, 0.65], 0.32, [0.62, 0.48, 0.34], 0.3, [0.9, 0.25, -0.4], [1, 0.78, 0.5], 0.7),
  predawn: L([0.3, 0.8, 0.3], [0.55, 0.62, 0.8], 0.45, [0.3, 0.36, 0.5], 0.4, [0.2, 0.2, 0.25], 0.2),
  glory: L([0.15, 0.45, 0.9], [1.0, 0.96, 0.85], 1.5, [0.7, 0.66, 0.55], 0.55, [0.9, 0.82, 0.62], 0.4, [0, 0.3, -1], [1, 0.95, 0.8], 0.8),
  torchNight: L([0.6, 0.1, 0.6], [1.0, 0.55, 0.25], 1.05, [0.18, 0.25, 0.42], 0.35, [0.25, 0.14, 0.08], 0.2, [-0.7, 0.4, -0.5], [0.45, 0.58, 0.85], 0.45),
  moonNight: L([-0.5, 0.7, 0.3], [0.5, 0.6, 0.85], 0.55, [0.14, 0.18, 0.3], 0.35, [0.08, 0.08, 0.1], 0.1, [0.6, 0.3, -0.6], [0.55, 0.65, 0.9], 0.3),
  dawn: L([0.75, 0.2, 0.55], [1.0, 0.78, 0.55], 1.0, [0.52, 0.58, 0.72], 0.42, [0.8, 0.6, 0.42], 0.35, [0.8, 0.2, -0.5], [1, 0.8, 0.55], 0.5),
  pentecost: L([-0.2, 0.6, 0.75], [1.0, 0.7, 0.35], 1.25, [0.45, 0.3, 0.22], 0.35, [0.8, 0.45, 0.2], 0.45, [0.6, 0.2, -0.6], [1, 0.6, 0.3], 0.6),
  romeDay: L([-0.6, 0.75, 0.3], [1.0, 0.94, 0.84], 1.1, [0.52, 0.55, 0.6], 0.42, [0.6, 0.5, 0.42], 0.3, [0.6, 0.3, -0.6], [1, 0.95, 0.9], 0.2),
  lamp: L([0.4, 0.2, 0.8], [1.0, 0.62, 0.3], 1.1, [0.2, 0.16, 0.14], 0.3, [0.35, 0.2, 0.1], 0.25, [-0.6, 0.3, -0.5], [1, 0.7, 0.4], 0.3),
  lateDay: L([0.75, 0.25, 0.35], [1.0, 0.8, 0.55], 1.0, [0.5, 0.52, 0.6], 0.38, [0.6, 0.5, 0.4], 0.3, [0.8, 0.25, -0.5], [1, 0.82, 0.58], 0.55),
  candle: L([0.3, 0.1, 0.9], [1.0, 0.72, 0.4], 1.05, [0.35, 0.28, 0.2], 0.35, [0.6, 0.45, 0.25], 0.3, [-0.5, 0.3, -0.6], [1, 0.85, 0.55], 0.4),
};
