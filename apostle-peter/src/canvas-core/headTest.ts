import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { renderParts } from "./peter/figure/head";
import { figureParts, walk } from "./peter/figure/body";
import { PETER_FIG, ANDREW_FIG } from "./peter/figure/cast";
import { HANDS, LIGHTS, FACE } from "./peter/figure/acting";
import { lakeBackdrop, lakeWater, lakeShore } from "./peter/sets/lake";
import { cam0, drawPlate, finish, applyLayer, toScreen, glow } from "./peter/paint/camera";
import { boatParts } from "./peter/paint/props";
import { vgrad } from "./peter/paint/nature";

const draw = (ctx: Ctx, f: number, env: Env) => {
  const t = f / 30, cam = { ...cam0(), t };
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, env.W, env.H);
  drawPlate(ctx, env, cam, 0.1, lakeBackdrop(env, "morning"), -340, 0);
  drawPlate(ctx, env, cam, 0.4, lakeWater(env, "morning"), -340, 510);
  drawPlate(ctx, env, cam, 0.85, lakeShore(env, "morning", "village"), -340, 530);
  // Simon's boat and Simon hauling
  const light = LIGHTS.goldenMorning, bx = 900, by = 780, sc = 95, rockA = Math.sin(t * 1.1) * 0.03;
  const [sx, sy, ss] = toScreen(cam, 0.8, env.W, env.H, bx, by);
  ctx.save(); applyLayer(ctx, env, cam, 0); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const tilt = 0.22, boat = boatParts({ x: sx, y: sy, scale: sc * ss, yaw: 0.62, pitch: tilt, roll: rockA, light, seed: 3, sail: "none" });
  const simon = figureParts(ctx, PETER_FIG.A, { armL: { raise: 1.1, elbow: 0.7, out: 0.15 }, armR: { raise: 0.9, elbow: 0.8 }, handL: HANDS.grip, handR: HANDS.grip, bend: 0.3 }, { x: sx - 40 * ss, y: sy + 0.32 * sc * ss, scale: sc * ss, yaw: -0.9, tilt, light, expr: FACE.determined });
  renderParts(ctx, [boat, simon], { env, cell: 2, tol: 5, paint: 0.5, fx: { waterY: sy + 0.02 * sc * ss, reflect: t } });
  ctx.restore();
  // mist lying on the water
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  for (let i = 0; i < 3; i++) { const y = 540 + i * 70 + Math.sin(t * 0.2 + i) * 6; vgrad(ctx, 0, y - 60, env.W, y + 60, [[0, "rgba(246,226,190,0)"], [0.5, `rgba(246,226,190,${0.28 - i * 0.07})`], [1, "rgba(246,226,190,0)"]]); }
  glow(ctx, 520, 520, 700, [1, 0.88, 0.62], 0.25);
  ctx.restore();
  finish(ctx, env, f, { bloom: 0.3, vignette: 0.28, grain: 0.07, gain: [1, 0.95, 0.86], gainAmt: 0.25 });
  void walk; void ANDREW_FIG;
};
export const headTest: Film = { meta: { title: "headTest", W: 1920, H: 1080, fps: 30, bpm: 1800, durationFrames: 1, raster: "cpu" }, assets: { images: {} }, shots: [{ id: "t", start: 0, end: 1, draw }] };
