import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { lakeBackdrop } from "./peter/sets/lake";
const draw = (ctx: Ctx, _f: number, env: Env) => { ctx.setTransform(1, 0, 0, 1, 0, 0); const p = lakeBackdrop(env, "morning"); ctx.drawImage(p.canvas as CanvasImageSource, 340, 300, 1920, 780, 0, 0, 1920, 780); };
export const plateTest: Film = { meta: { title: "plateTest", W: 1920, H: 780, fps: 30, bpm: 1800, durationFrames: 1, raster: "cpu" }, assets: { images: {} }, shots: [{ id: "t", start: 0, end: 1, draw }] };
