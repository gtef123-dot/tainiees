// EXTRAS: the crowds. Every face and costume is drawn from a seed, so the same seed is always the same
// person (a man in a crowd in 04.3 can be seen again in the teaching), and no two neighbours match.
import { rng } from "../../core";
import type { Identity } from "./head";
import type { Figure } from "./body";
import { PETER } from "./cast";

export type ExtraKind = "man" | "woman" | "elder" | "child" | "youth";
const TUNICS = ["#8a7458", "#9c8a6a", "#6e5c48", "#b3a07c", "#7a6a5a", "#a08060", "#857a66", "#c2b08e", "#6a5a4c"];
const MANTLES = ["#6b5a4a", "#5a6470", "#7a5a48", "#8c7c62", "#4f5a52", "#9a8870", "#6a4e3e", "#806c58", "#5e5448"];
const WOMEN = ["#8a5a50", "#6a6a7a", "#a89070", "#7c6048", "#94786a", "#5f6878", "#a4846a"];
const SKINS = ["#a06e54", "#9a6a52", "#a87a60", "#946650", "#b0826a", "#8e624c", "#a4745a"];
const HAIRS = ["#2a1d15", "#1f1712", "#3a2a1c", "#2e2016", "#4a3626", "#241a13"];
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];

export const extraId = (seed: number, kind: ExtraKind): Identity => {
  const r = rng(seed * 7919 + 13), v = (k = 0.12) => 1 + (r() - 0.5) * 2 * k, old = kind === "elder", fem = kind === "woman", young = kind === "child" || kind === "youth";
  const hair = pick(r, HAIRS), gray = old ? 0.55 + r() * 0.35 : r() * 0.08;
  return {
    ...PETER.B, name: `extra${seed}`, seed: 5000 + seed,
    width: v(0.08) * (fem ? 0.95 : 1), jaw: v(0.12) * (fem || young ? 0.88 : 1), chin: v(0.1), cheek: v(0.12), brow: v(0.15) * (fem || young ? 0.85 : 1),
    noseLen: v(0.1), noseWidth: v(0.15) * (fem ? 0.88 : 1), noseProj: v(0.1), noseBump: r() * (fem ? 0.2 : 0.9), noseTip: 0.5 + r() * 0.6,
    eyeSize: v(0.08) * (young ? 1.06 : 1), eyeSpacing: v(0.06), eyeDepth: v(0.15), lidHeavy: r() * 0.6, lipFull: v(0.15) * (fem ? 1.08 : 1), mouthWidth: v(0.08),
    skin: pick(r, SKINS), hair, hairGray: gray, hairline: 0.3 + r() * 0.05 + (old ? 0.1 : 0), recede: fem || young ? 0 : old ? 0.4 + r() * 0.5 : r() * 0.3, forelock: 0,
    hairVol: 0.9 + r() * 0.2, hairCurl: r(), hairLong: fem ? 1 : young ? r() * 0.3 : r() * 0.25,
    beard: fem || kind === "child" ? 0 : kind === "youth" ? r() * 0.3 : 0.7 + r() * 0.3, beardLen: old ? 0.8 + r() * 0.4 : 0.3 + r() * 0.6, beardColor: hair, beardGray: gray, mustache: fem || kind === "child" ? 0 : 1, beardFork: r() * 0.3,
    browThick: fem ? 0.75 : v(0.2), browColor: hair, browScar: false, age: old ? 0.75 + r() * 0.2 : young ? 0 : 0.1 + r() * 0.35, eyeColor: pick(r, ["#3a2618", "#4a2e1c", "#2e2016", "#5a4028"]), earSize: v(0.1), neck: fem || young ? 0.92 : v(0.1),
  };
};
export const extra = (seed: number, kind: ExtraKind): Figure => {
  const r = rng(seed * 104729 + 7), fem = kind === "woman", child = kind === "child";
  const tunic = fem ? pick(r, WOMEN) : pick(r, TUNICS), mantle = fem ? pick(r, [...WOMEN, ...MANTLES]) : r() < 0.6 ? pick(r, MANTLES) : undefined;
  return {
    id: extraId(seed, kind), height: child ? 1.15 + r() * 0.2 : fem ? 1.55 + r() * 0.08 : kind === "youth" ? 1.62 + r() * 0.08 : 1.64 + r() * 0.12, bulk: child ? 0.8 : 0.92 + r() * 0.2,
    costume: { tunic, tunicLen: fem ? 0.06 : child ? 0.3 : 0.25 + r() * 0.2, sleeves: fem || r() < 0.6 ? "long" : "short", mantle: fem ? mantle : mantle, mantleLen: fem ? 0.2 : 0.35 + r() * 0.1, hood: fem ? 1 : 0, belt: pick(r, ["#4a3322", "#5a4632", "#3d2c1f", "#6a5438"]), sandal: "#5a3d27", dirt: 0.3 + r() * 0.3 },
  };
};
// a crowd: `n` people with a mix of kinds (seeded)
export const crowd = (seed: number, n: number, mix: Partial<Record<ExtraKind, number>> = { man: 0.5, woman: 0.3, elder: 0.12, child: 0.08 }): Figure[] => {
  const r = rng(seed), kinds = Object.entries(mix) as [ExtraKind, number][], tot = kinds.reduce((s, [, w]) => s + w, 0);
  return Array.from({ length: n }, (_, i) => { let x = r() * tot, k: ExtraKind = kinds[0][0]; for (const [kk, w] of kinds) { if (x < w) { k = kk; break; } x -= w; } return extra(seed * 100 + i, k); });
};
// a Roman soldier: red wool tunic, a dark cloak, the bronze helmet drawn by helmetOverlay
export const soldier = (seed: number): Figure => { const f = extra(seed, "man"); return { ...f, id: { ...f.id, beard: 0, mustache: 0, hairLong: 0, hairVol: 0.8 }, height: 1.7 + (seed % 5) * 0.02, bulk: 1.08, costume: { tunic: "#8a2e24", tunicLen: 0.52, sleeves: "short", mantle: "#4a3a30", mantleLen: 0.62, belt: "#3a2a1c", sandal: "#3a2a1c", dirt: 0.25 } }; };
