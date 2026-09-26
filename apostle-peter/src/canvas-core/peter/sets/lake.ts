// LAKE GENNESARET. The plates for the lake and its shore at several times of day; shots frame them
// with the multiplane camera. Looking south from the Capernaum shore: the far eastern hills flat and
// hazy, Mount Arbel's cliff on the right, basalt houses and boats on the near shore.
import type { Env } from "../../core";
import { hex, mix, css, lerp, scalec } from "../lib/math";
import { plate, paintOver, type Surface } from "../paint/plates";
import { sky, clouds, streaks, ridge, ridgeProfile, lake, pebbles, rock, olive, tree, vgrad, grassTufts } from "../paint/nature";
import { house } from "../paint/architecture";

export type LakeTime = "morning" | "day" | "dawn" | "golden" | "noon";
const SKY: Record<LakeTime, { stops: [number, string][]; sun: { x: number; y: number; r: number; color: string; glow: number }; hill: [string, string]; water: [string, string]; skyRefl: string; cloud: [string, string] }> = {
  morning: { stops: [[0, "#8fa6b8"], [0.45, "#c9c6b4"], [0.8, "#efd6a2"], [1, "#f6dfae"]], sun: { x: 520, y: 520, r: 26, color: "#fff1c8", glow: 0.9 }, hill: ["#9a9aa4", "#7d8391"], water: ["#c9c0a4", "#4f6f7e"], skyRefl: "#e8d7ae", cloud: ["#fbe6bd", "#a7a6a8"] },
  golden: { stops: [[0, "#7f9ab0"], [0.5, "#d9c49a"], [0.85, "#f1c982"], [1, "#f3d196"]], sun: { x: 380, y: 560, r: 30, color: "#fff0c0", glow: 1.0 }, hill: ["#a49a98", "#7c7f8a"], water: ["#d6bf8e", "#4d6a78"], skyRefl: "#f0cf92", cloud: ["#ffe2b0", "#9d9aa2"] },
  day: { stops: [[0, "#6f95b8"], [0.6, "#a9c0cf"], [1, "#dcdcc9"]], sun: { x: 300, y: 80, r: 24, color: "#fffaf0", glow: 0.5 }, hill: ["#8e9aa2", "#6f7d86"], water: ["#8fb0bb", "#3d6b7c"], skyRefl: "#c2d3d8", cloud: ["#ffffff", "#b8c2cc"] },
  noon: { stops: [[0, "#6a92b6"], [0.6, "#a6c1d2"], [1, "#e2dfcc"]], sun: { x: 1500, y: 60, r: 24, color: "#fffaf0", glow: 0.45 }, hill: ["#94a0a6", "#768690"], water: ["#95b6c0", "#3a687a"], skyRefl: "#c5d6da", cloud: ["#ffffff", "#bcc6cf"] },
  dawn: { stops: [[0, "#6c7c96"], [0.45, "#b3aab0"], [0.78, "#e9c49c"], [1, "#f4d6a8"]], sun: { x: 1500, y: 560, r: 22, color: "#ffe8bc", glow: 0.85 }, hill: ["#8c8898", "#6e7086"], water: ["#cdb39a", "#46606f"], skyRefl: "#e6c7a0", cloud: ["#f6d2b0", "#8f8ca0"] },
};
export const HORIZON = 520;
const P = (env: Env, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, s: Surface) => void, paint?: Parameters<typeof paintOver>[2]) =>
  plate(env, `${key}@${env.scale}`, w * env.scale, h * env.scale, (s) => { s.ctx.save(); s.ctx.scale(env.scale, env.scale); draw(s.ctx, s); s.ctx.restore(); if (paint) paintOver(env, s, { ...paint, sizes: (paint.sizes ?? [22, 11, 5]).map((v) => Math.max(1.5, v * env.scale)) }); });

// the sky and the far hills, one plate (they never part company)
export const lakeBackdrop = (env: Env, time: LakeTime, w = 2600, h = 760) => P(env, `lake:back:${time}:${w}`, w, h, (c) => {
  const S = SKY[time], cx = (w - 1920) / 2;
  sky(c, w, h, S.stops.map(([t, col]) => [t * (HORIZON + 20) / h, col] as [number, string]).concat([[1, S.stops[S.stops.length - 1][1]]]), { ...S.sun, x: S.sun.x + cx });
  clouds(c, 11, 16, [0, 40, w, HORIZON - 170], { lit: S.cloud[0], shade: S.cloud[1], alpha: time === "day" || time === "noon" ? 0.55 : 0.4, flat: 0.32, size: 110, sunX: S.sun.x + cx });
  streaks(c, 12, 26, [0, HORIZON - 150, w, HORIZON - 20], S.cloud[0], 0.35);
  // far eastern hills (flat-topped), then Arbel's cliff on the right, nearer and darker
  const far = ridgeProfile(21, w, HORIZON - 26, 22, 0.0018);
  const hz = hex(S.stops[2][1]);
  ridge(c, w, HORIZON + 30, far, { top: css(mix(hex(S.hill[0]), hz, 0.6)), bottom: css(mix(hex(S.hill[0]), hz, 0.35)), texture: 0.5, seed: 22, lightFrom: time === "dawn" ? 1 : -1 });
  const arbel = (x: number) => { const X = x - cx - 1560; return HORIZON - 6 - (X > 0 ? Math.min(78, X * 1.1) * (X < 180 ? 1 : Math.max(0, 1 - (X - 180) / 700)) : 0) - (fractalish(x) * 5); };
  ridge(c, w, HORIZON + 30, arbel, { top: css(mix(hex(S.hill[1]), hz, 0.42)), bottom: css(mix(hex(S.hill[1]), hz, 0.3)), texture: 0.8, seed: 23, lightFrom: -1, terraces: 0 });
  vgrad(c, 0, HORIZON - 60, w, HORIZON + 30, [[0, css(hex(S.stops[2][1]), 0)], [1, css(hex(S.stops[3][1]), 0.55)]]);
}, { seed: 31, sizes: [26, 12, 5], flow: (_x, y) => (y < HORIZON - 40 ? 0.02 : null), keepBase: 0.6, alpha: 0.75 });
const fractalish = (x: number) => Math.sin(x * 0.013) * 0.6 + Math.sin(x * 0.031 + 1) * 0.4;

// the water, with the sun's path and morning mist lying on it
export const lakeWater = (env: Env, time: LakeTime, w = 2600, h = 700) => P(env, `lake:water:${time}:${w}`, w, h, (c) => {
  const S = SKY[time], cx = (w - 1920) / 2;
  lake(c, w, 0, h, { far: S.water[0], near: S.water[1], sky: S.skyRefl, seed: 41, wavelets: 1400, glitter: { x: S.sun.x + cx, w: 260, color: "#fff4d2", a: time === "day" || time === "noon" ? 0.35 : 0.75 } });
  // the far hills reflected, very faint
  vgrad(c, 0, 0, w, 40, [[0, css(hex(S.hill[0]), 0.45)], [1, css(hex(S.hill[0]), 0)]]);
}, { seed: 42, sizes: [20, 9, 4], flow: () => 0.0, keepBase: 0.55, alpha: 0.7, lenK: 3.4 });

// the Capernaum shore: basalt houses, a wall, an olive or two, boats drawn up, nets drying
export const lakeShore = (env: Env, time: LakeTime, variant: "village" | "beach" | "empty", w = 2600, h = 700) => P(env, `lake:shore:${time}:${variant}:${w}`, w, h, (c) => {
  const S = SKY[time], sun = time === "dawn" ? 1 : -1, lit = time === "day" || time === "noon" ? 1 : 0.85;
  // the shoreline: an irregular wet edge with a foam line, then the beach rising to the village
  const edge = (x: number) => 380 + Math.sin(x * 0.004) * 14 + Math.sin(x * 0.013 + 2) * 6;
  c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 8) c.lineTo(x, edge(x)); c.lineTo(w, h); c.closePath();
  const bg = c.createLinearGradient(0, 360, 0, h); bg.addColorStop(0, "#5c554c"); bg.addColorStop(0.4, "#4a4540"); bg.addColorStop(1, "#3a3632"); c.fillStyle = bg; c.fill();
  c.save(); c.clip(); pebbles(c, 51, 2600, [0, 360, w, h], ["#3a3632", "#4a4540", "#5b554d", "#7a6f60"], { light: sun, wet: 0.6 }); c.restore();
  c.strokeStyle = "rgba(90,84,76,0.9)"; c.lineWidth = 10; c.beginPath(); for (let x = 0; x <= w; x += 8) (x ? c.lineTo(x, edge(x) + 3) : c.moveTo(x, edge(x) + 3)); c.stroke();
  c.strokeStyle = "rgba(245,236,214,0.55)"; c.lineWidth = 2.5; c.beginPath(); for (let x = 0; x <= w; x += 8) (x ? c.lineTo(x, edge(x) - 1 + Math.sin(x * 0.05) * 1.5) : c.moveTo(x, edge(x))); c.stroke();
  if (variant === "village") {
    const vg = (x: number) => 318 + Math.sin(x * 0.006) * 8;
    c.beginPath(); c.moveTo(1250, 400); for (let x = 1250; x <= w; x += 10) c.lineTo(x, vg(x) + Math.max(0, (1400 - x)) * 0.4); c.lineTo(w, 400); c.closePath(); c.fillStyle = "#5a5046"; c.fill();
    for (let i = 0; i < 9; i++) house(c, 1480 + i * 118 + (i % 3) * 16, 322 + (i % 2) * 14, 88 + (i % 3) * 28, 64 + (i % 4) * 14, 40, { mat: "basalt", roof: "flat", sunSide: sun as 1 | -1, lit, door: i % 2 ? 1 : 0, windows: 1, seed: 100 + i, stair: i === 3 });
    olive(c, 1420, 330, 150, 7, { light: sun }); olive(c, 2330, 318, 120, 8, { light: sun }); tree(c, 1990, 300, 160, 9, { kind: "palm" });
    grassTufts(c, 52, 50, [1250, 330, w, 395], "#7c7a52", 16);
  }
  void S; void scalec; void lerp; void rock;
}, { seed: 53, sizes: [16, 8, 4], keepBase: 0.6, alpha: 0.75 });
