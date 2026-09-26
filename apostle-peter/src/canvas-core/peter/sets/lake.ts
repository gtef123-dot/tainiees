// LAKE GENNESARET. The plates for the lake and its shore at several times of day; shots frame them
// with the multiplane camera. Looking south from the Capernaum shore: the far eastern hills flat and
// hazy, Mount Arbel's cliff on the right, basalt houses and boats on the near shore.
import type { Env } from "../../core";
import { hex, mix, css, lerp, scalec } from "../lib/math";
import { plate, paintOver, type Surface } from "../paint/plates";
import { sky, clouds, streaks, ridge, ridgeProfile, lake, pebbles, rock, olive, tree, vgrad, grassTufts } from "../paint/nature";
import { house } from "../paint/architecture";

export type LakeTime = "morning" | "day" | "dawn" | "golden" | "noon" | "night" | "storm";
const SKY: Record<string, { stops: [number, string][]; sun: { x: number; y: number; r: number; color: string; glow: number }; hill: [string, string]; water: [string, string]; skyRefl: string; cloud: [string, string] }> = {
  morning: { stops: [[0, "#8fa6b8"], [0.45, "#c9c6b4"], [0.8, "#efd6a2"], [1, "#f6dfae"]], sun: { x: 520, y: 520, r: 26, color: "#fff1c8", glow: 0.9 }, hill: ["#9a9aa4", "#7d8391"], water: ["#c9c0a4", "#4f6f7e"], skyRefl: "#e8d7ae", cloud: ["#fbe6bd", "#a7a6a8"] },
  golden: { stops: [[0, "#7f9ab0"], [0.5, "#d9c49a"], [0.85, "#f1c982"], [1, "#f3d196"]], sun: { x: 380, y: 560, r: 30, color: "#fff0c0", glow: 1.0 }, hill: ["#a49a98", "#7c7f8a"], water: ["#d6bf8e", "#4d6a78"], skyRefl: "#f0cf92", cloud: ["#ffe2b0", "#9d9aa2"] },
  day: { stops: [[0, "#6f95b8"], [0.6, "#a9c0cf"], [1, "#dcdcc9"]], sun: { x: 300, y: 80, r: 24, color: "#fffaf0", glow: 0.5 }, hill: ["#8e9aa2", "#6f7d86"], water: ["#8fb0bb", "#3d6b7c"], skyRefl: "#c2d3d8", cloud: ["#ffffff", "#b8c2cc"] },
  noon: { stops: [[0, "#6a92b6"], [0.6, "#a6c1d2"], [1, "#e2dfcc"]], sun: { x: 1500, y: 60, r: 24, color: "#fffaf0", glow: 0.45 }, hill: ["#94a0a6", "#768690"], water: ["#95b6c0", "#3a687a"], skyRefl: "#c5d6da", cloud: ["#ffffff", "#bcc6cf"] },
  dawn: { stops: [[0, "#6c7c96"], [0.45, "#b3aab0"], [0.78, "#e9c49c"], [1, "#f4d6a8"]], sun: { x: 1500, y: 560, r: 22, color: "#ffe8bc", glow: 0.85 }, hill: ["#8c8898", "#6e7086"], water: ["#cdb39a", "#46606f"], skyRefl: "#e6c7a0", cloud: ["#f6d2b0", "#8f8ca0"] },
};
SKY.night = { stops: [[0, "#0d1422"], [0.55, "#1c2940"], [0.85, "#2c3c55"], [1, "#35465e"]], sun: { x: 1350, y: 150, r: 16, color: "#e8eef6", glow: 0.35 }, hill: ["#1c2434", "#151b28"], water: ["#34475e", "#0e1624"], skyRefl: "#3a4c64", cloud: ["#4a5a72", "#1a2232"] };
SKY.storm = { stops: [[0, "#141a24"], [0.5, "#26303e"], [0.85, "#3a4452"], [1, "#46505c"]], sun: { x: 1350, y: -200, r: 1, color: "#8090a0", glow: 0 }, hill: ["#20262e", "#181d24"], water: ["#3a4652", "#10161e"], skyRefl: "#46525e", cloud: ["#4a5460", "#1a2028"] };
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
  vgrad(c, 0, HORIZON - 60, w, HORIZON + 30, [[0, css(hex(S.stops[2][1]), 0)], [1, css(hex(S.stops[S.stops.length - 1][1]), 0.55)]]);
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

// ---- the lake behind a world camera: the horizon follows the tilt, the pan follows the yaw, and in
// a close-up the far plates go soft (depth of field) by crossfading to blurred copies
import { blurInto } from "../paint/plates";
import { type WCam, panOf, wproj } from "../scene";
export const FOCAL = 2000;
export const horizonOf = (cam: WCam, H: number) => (cam.cy ?? H / 2) - Math.tan(cam.tilt) * (cam.focal ?? FOCAL);
const soft = (env: Env, key: string, src: Surface, r: number) => plate(env, `${key}:soft${r}@${env.scale}`, src.w, src.h, (s) => { const b = blurInto(env, src, r * env.scale); s.ctx.drawImage(b.canvas as CanvasImageSource, 0, 0); });
export const lakeWorld = (ctx: CanvasRenderingContext2D, env: Env, cam: WCam, time: LakeTime, o: { blur?: number; mist?: number; t?: number } = {}) => {
  const hy = horizonOf(cam, env.H), px = panOf(cam), x0 = (env.W - 2600) / 2 + px, blur = o.blur ?? 0;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = SKY[time].stops[0][1]; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  const back = lakeBackdrop(env, time), water = lakeWater(env, time);
  const draw = (pl: Surface, dx: number, dy: number, dh: number, a = 1) => { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = a; ctx.drawImage(pl.canvas as CanvasImageSource, dx, dy, pl.w / env.scale, dh); ctx.restore(); };
  const layers: [Surface, number, number][] = [[back, hy - HORIZON, 760], [water, hy - 8, Math.max(60, env.H - hy + 40)]];
  for (const [pl, y, h] of layers) {
    if (blur > 0.01) draw(soft(env, `lake:${time}:${pl === back ? "b" : "w"}`, pl, 28), x0, y, h);
    if (blur < 0.99) draw(pl, x0, y, h, 1 - blur);
  }
  const mist = o.mist ?? 0.25, t = o.t ?? 0;
  if (mist > 0) { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); for (let i = 0; i < 3; i++) { const y = hy + 20 + i * 60 + Math.sin(t * 0.2 + i) * 6; vgrad(ctx, 0, y - 60, env.W, y + 60, [[0, "rgba(246,226,190,0)"], [0.5, `rgba(246,226,190,${mist * (1 - i * 0.28)})`], [1, "rgba(246,226,190,0)"]]); } ctx.restore(); }
};

// the beach under a world camera: the lake beyond, the pebble shore laid so its wet edge sits where
// the camera says the waterline (world z = shoreZ) falls on screen
export const beachWorld = (ctx: CanvasRenderingContext2D, env: Env, cam: WCam, time: LakeTime, shoreZ: number, o: { blur?: number; mist?: number; t?: number; village?: boolean } = {}) => {
  lakeWorld(ctx, env, cam, time, o);
  const ys = wprojY(cam, env, shoreZ), sh = lakeShore(env, time, o.village ? "village" : "beach"), px = panOf(cam, 1400, 600) * 1.2;
  const src = (o.blur ?? 0) > 0.3 ? soft(env, `lake:shore:${time}:${o.village ? "v" : "b"}`, sh, 14) : sh;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.drawImage(src.canvas as CanvasImageSource, (env.W - 2600) / 2 + px, ys - 380, 2600, Math.max(700, env.H - ys + 400)); ctx.restore();
  return ys;
};
// where the waterline z falls on screen (straight ahead of the camera: the shore plate is laid flat)
const wprojY = (cam: WCam, env: Env, z: number) => wproj({ ...cam, shake: 0 }, env, [cam.target[0], 0, z])[1];

// the shore seen from ANY direction: the lake plates, then a pebble beach lying in true perspective
// from the waterline (world z = shoreZ) toward the viewer, a wet band, and the foam line
import { ground, groundLine, pebbleTex, bandTex, softTex, earthTex, waterTex } from "./stage";
import { wplace } from "../scene";
const LIGHTC: Record<LakeTime, [string, number]> = { morning: ["#f0c890", 0.16], golden: ["#f0b870", 0.2], day: ["#fff4e0", 0.05], noon: ["#fffaf0", 0.04], dawn: ["#f2b88a", 0.18], night: ["#1a2840", 0.62], storm: ["#1e2632", 0.55] };
// looking inland from the water's edge: the hills of Korazim behind, Capernaum's basalt houses along
// the top of the beach (horizon at HORIZON like the lake plate, so the two share every camera rule)
export const landBackdrop = (env: Env, time: LakeTime, w = 2600, h = 760) => P(env, `lake:land2:${time}:${w}`, w, h, (c) => {
  const S = SKY[time], cx = (w - 1920) / 2, night = time === "night" || time === "storm", sun = time === "dawn" ? 1 : -1;
  sky(c, w, h, S.stops.map(([t, col]) => [t * (HORIZON + 20) / h, col] as [number, string]).concat([[1, S.stops[S.stops.length - 1][1]]]));
  clouds(c, 13, 14, [0, 40, w, HORIZON - 220], { lit: S.cloud[0], shade: S.cloud[1], alpha: night ? 0.3 : 0.5, flat: 0.34, size: 120 });
  const hz = hex(S.stops[S.stops.length - 1][1]), hillA = hex(night ? "#1e2636" : "#8d8f7e"), hillB = hex(night ? "#171d2a" : "#6f7658");
  ridge(c, w, h, ridgeProfile(41, w, HORIZON - 150, 40, 0.0015), { top: css(mix(hillA, hz, 0.45)), bottom: css(mix(hillA, hz, 0.3)), texture: 0.6, seed: 42, lightFrom: sun as -1 | 1, terraces: 6, shrubs: 200, shrubColor: night ? "#1a2230" : "#6a7050" });
  ridge(c, w, h, ridgeProfile(43, w, HORIZON - 70, 50, 0.0022), { top: css(mix(hillB, hz, 0.25)), bottom: css(scalec(hillB, 0.9)), texture: 0.9, seed: 44, lightFrom: sun as -1 | 1, terraces: 10, shrubs: 500, shrubColor: night ? "#141a24" : "#5a6440" });
  for (let k = 0; k < 18; k++) { const x = (k / 18) * w + ((k * 53) % 70), y = HORIZON - 40 + ((k * 37) % 30); olive(c, x, y, 30 + ((k * 7) % 18), 700 + k, { light: sun }); }
  // the village: basalt courtyard houses, flat roofs of beams and mud, a few palms
  const mat = night ? "basalt" : "basalt";
  for (let k = 0; k < 16; k++) { const x = -60 + k * 170 + ((k * 41) % 60), hw = 110 + ((k * 29) % 70), hh = 60 + ((k * 17) % 40); house(c, x, HORIZON + 22, hw, hh, 30 + ((k * 13) % 25), { mat, roof: "flat", sunSide: sun as -1 | 1, lit: night ? 0.25 : 0.85, door: k % 3 === 0 ? 1 : 0, windows: 1, seed: 480 + k, stair: k % 5 === 2 }); if (k % 4 === 1) tree(c, x + hw + 20, HORIZON + 20, 120, 900 + k, { kind: "palm", light: sun }); }
  c.fillStyle = night ? "#1a2030" : "#8a8466"; c.fillRect(0, HORIZON + 18, w, h - HORIZON - 18);
  grassTufts(c, 45, 120, [0, HORIZON + 5, w, HORIZON + 30], night ? "#20283a" : "#7a7650", 12);
  vgrad(c, 0, HORIZON - 200, w, HORIZON + 30, [[0, css(hz, 0)], [1, css(hz, night ? 0.1 : 0.3)]]);
  void cx;
}, { seed: 46, sizes: [22, 11, 5], flow: (_x, y) => (y < HORIZON - 250 ? 0.02 : null), keepBase: 0.6, alpha: 0.75 });
export const landWorld = (ctx: CanvasRenderingContext2D, env: Env, cam: WCam, time: LakeTime, o: { blur?: number } = {}) => {
  const hy = horizonOf(cam, env.H), px = panOf(cam), x0 = (env.W - 2600) / 2 + px, blur = o.blur ?? 0;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = SKY[time].stops[0][1]; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  const back = landBackdrop(env, time);
  const draw = (pl: Surface, a = 1) => { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = a; ctx.drawImage(pl.canvas as CanvasImageSource, x0, hy - HORIZON, pl.w / env.scale, 760); ctx.restore(); };
  if (blur > 0.01) draw(soft(env, `lake:land:${time}`, back, 28));
  if (blur < 0.99) draw(back, 1 - blur);
};
export const shoreWorld = (ctx: CanvasRenderingContext2D, env: Env, cam: WCam, time: LakeTime, shoreZ: number, o: { blur?: number; mist?: number; t?: number; span?: number } = {}) => {
  const inland = Math.cos(cam.yaw) < 0;
  if (inland) landWorld(ctx, env, cam, time, o); else lakeWorld(ctx, env, cam, time, o);
  if (inland) { const W = SKY[time].water; ground(ctx, env, cam, waterTex(env, W[1], SKY[time].skyRefl, time), { x0: cam.target[0] - 80, x1: cam.target[0] + 80, z0: -300, z1: shoreZ + 0.3, tile: [6, 6] }); }
  const t = o.t ?? 0, x0 = cam.target[0] - (o.span ?? 40), x1 = cam.target[0] + (o.span ?? 40), blur = o.blur ?? 0;
  let peb: Surface = pebbleTex(env, 1024); if (blur > 0.3) peb = softTex(env, peb, "tex:pebbles:1024", Math.round(6 + 14 * blur));
  ground(ctx, env, cam, peb, { x0, x1, z0: shoreZ - 0.05, z1: shoreZ + (inland ? 32 : 60), tile: [2, 2] });
  const [lc, la] = LIGHTC[time];
  const tint = plate(env, `tex:solid:${lc}`, 4, 4, (s) => { s.ctx.fillStyle = lc; s.ctx.fillRect(0, 0, 4, 4); });
  ground(ctx, env, cam, tint, { x0, x1, z0: shoreZ - 0.05, z1: shoreZ + (inland ? 34 : 60), alpha: la });
  // wet pebbles near the water, darker and glossy
  ground(ctx, env, cam, bandTex(env, [0.12, 0.13, 0.15], "wet"), { x0, x1, z0: shoreZ - 0.3, z1: shoreZ + 1.6, alpha: 0.75 });
  // the lap of the water: two foam lines breathing in and out
  for (let k = 0; k < 2; k++) {
    const ph = t * 0.55 + k * 0.5, reach = 0.25 * Math.sin(ph * Math.PI * 2) + 0.15, pts: V3[] = [];
    for (let x = x0; x <= x1; x += 0.25) pts.push([x, 0.005, shoreZ + reach * (1 - k * 0.4) + 0.07 * Math.sin(x * 1.7 + k * 3) + 0.04 * Math.sin(x * 4.3 + t)]);
    const w = Math.max(1, 0.035 * wplace(cam, env, [cam.target[0], 0, shoreZ], 0).scale);
    groundLine(ctx, env, cam, pts, { color: time === "night" || time === "storm" ? "#9aa8b8" : "#f4f1e8", width: w, alpha: 0.55 - k * 0.2 });
  }
};
import type { V3 } from "../lib/math";
