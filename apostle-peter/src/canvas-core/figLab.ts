// FIG LAB (dev only): one test per frame, for iterating on bodies, costume and the world camera.
import type { Env } from "./core";
import type { Film } from "./film";
import { renderParts, type Parts } from "./peter/figure/head";
import { figureParts, walk, type BodyPose, type Figure } from "./peter/figure/body";
import { PETER_FIG, CHRIST_FIG, ANDREW_FIG } from "./peter/figure/cast";
import { HANDS, LIGHTS, FACE } from "./peter/figure/acting";
import { boatParts } from "./peter/paint/props";
import { lakeWorld, beachWorld } from "./peter/sets/lake";
import { type WCam, begin, wplace, finish } from "./peter/scene";
import { vgrad } from "./peter/paint/nature";
import type { V3 } from "./peter/lib/math";

const L = LIGHTS.goldenMorning;
const one = (ctx: CanvasRenderingContext2D, env: Env, cam: WCam, f: Figure, pose: BodyPose, pos: V3, yaw: number, expr = FACE.neutral): Parts => {
  const p = wplace(cam, env, pos, yaw);
  return figureParts(ctx, f, pose, { x: p.x, y: p.y, z: p.z, scale: p.scale, yaw: 0, R: p.R, light: L, t: 0, expr });
};
const plain = (ctx: CanvasRenderingContext2D, env: Env) => { begin(ctx, env); ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); vgrad(ctx, 0, 0, env.W, env.H, [[0, "#8fa4b4"], [1, "#d8cdb4"]]); ctx.restore(); };
const TESTS: ((ctx: CanvasRenderingContext2D, env: Env) => void)[] = [
  // 0: the 02.2 MCU
  (ctx, env) => { plain(ctx, env); const cam: WCam = { target: [0, 1.52, 0.3], scale: 980, yaw: -0.45, tilt: 0.02, cy: 520, cx: 1060 };
    renderParts(ctx, [one(ctx, env, cam, PETER_FIG.A, { bend: 0.1, neck: { pitch: 0.2, yaw: -0.25 }, armR: { raise: 0.2, elbow: 0.6 }, armL: { raise: 0.3, elbow: 0.7 } }, [0, 0, 0], 0.15)], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 }); },
  // 1: full body, three figures in 3/4
  (ctx, env) => { plain(ctx, env); const cam: WCam = { target: [0, 0.95, 0], scale: 400, yaw: 0, tilt: 0.05, cy: 560 };
    renderParts(ctx, [one(ctx, env, cam, PETER_FIG.A, { armL: { raise: 0.25, elbow: 0.5 }, armR: { raise: 0.2, elbow: 0.4 } }, [-1.4, 0, 0], 0.5), one(ctx, env, cam, PETER_FIG.B, walk(0.3, 1, {}), [0, 0, 0], -0.4), one(ctx, env, cam, CHRIST_FIG, { armL: { raise: 0.2, elbow: 0.4 }, armR: { raise: 0.5, elbow: 0.9 }, handR: HANDS.offer }, [1.4, 0, 0], -0.9)], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 }); },
  // 2: perspective: boats receding on the lake
  (ctx, env) => { begin(ctx, env); const cam: WCam = { target: [0, 1.4, -8], scale: 48, yaw: 0.05, tilt: 0.05, cy: 470, focal: 2000 };
    beachWorld(ctx, env, cam, "morning", 14, { village: true, mist: 0.2 });
    const b = (pos: V3, yaw: number, seed: number) => { const p = wplace(cam, env, pos, yaw); return boatParts({ x: p.x, y: p.y, scale: p.scale, yaw: 0, R: p.R, z: p.z, light: L, seed, sail: "furled" }); };
    renderParts(ctx, [b([-9, 0, -30], 0.5, 11), b([7, 0, -24], -0.4, 12), b([0, 0, -12], 0.35, 3), one(ctx, env, cam, PETER_FIG.A, { bend: 0.3 }, [-0.8, -0.3, -11.6], 0.2), one(ctx, env, cam, ANDREW_FIG, { bend: 0.3 }, [0.8, -0.3, -11.7], 0.4)], { env, cell: 2, tol: 0.05 * cam.scale, paint: 0.5 }); },
  // 3: the boat ashore, perspective
  (ctx, env) => { begin(ctx, env); const cam: WCam = { target: [0, 0.8, 1.0], scale: 260, yaw: -0.6, tilt: 0.1, cy: 560, focal: 1600 };
    beachWorld(ctx, env, cam, "day", -0.5, {});
    const p = wplace(cam, env, [0, 0.12, -2.0], -Math.PI / 2 + 0.3, { pitch: -0.06 });
    renderParts(ctx, [boatParts({ x: p.x, y: p.y, scale: p.scale, yaw: 0, R: p.R, z: p.z, light: LIGHTS.day, seed: 3, sail: "none" }), one(ctx, env, cam, PETER_FIG.A, { bend: 0.5, armL: { raise: 1.1, elbow: 0.5 }, armR: { raise: 1.0, elbow: 0.5 } }, [0.55, 0, 1.4], -2.3)], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 }); },
];
TESTS.push((ctx, env) => { plain(ctx, env); const cam: WCam = { target: [0, 1.5, 0.3], scale: 980, yaw: -0.45, tilt: 0.02, cy: 520, cx: 1060 };
  renderParts(ctx, [one(ctx, env, cam, PETER_FIG.A, { bend: 0.1, neck: { pitch: 0.2, yaw: -0.25 }, armR: { target: [0.0, 1.62, 0.14], pole: [-0.5, -0.6, -0.3] }, armL: { raise: 0.3, elbow: 0.7 } }, [0, 0, 0], 0.15)], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0 }); });
const draw = (ctx: CanvasRenderingContext2D, f: number, env: Env) => { TESTS[Math.min(TESTS.length - 1, f)](ctx, env); finish(ctx, env, 0, { grain: 0.04, vignette: 0.2 }); };
export const figLab: Film = { meta: { title: "figLab", W: 1920, H: 1080, fps: 30, bpm: 1800, durationFrames: TESTS.length, raster: "cpu" }, assets: { images: {} }, shots: [{ id: "lab", start: 0, end: TESTS.length, draw: draw as never }] };
void lakeWorld;
