// SCENE: what every shot shares. A shot is a function of its local frame; this module gives it
// time, the camera, plates at depth, 3D people and props placed on a layer, life (breath, blinks,
// weight shifts), and the finish. Nothing here knows which shot it is in.
import type { Env } from "../core";
import { fractal } from "../core";
import { type Cam, cam0, drawPlate, toScreen, finish, type Grade } from "./paint/camera";
import type { Surface } from "./paint/plates";
import { renderParts, type Parts, type LayerFx, type Expr } from "./figure/head";
import { figureParts, type Figure, type BodyPose, type Place } from "./figure/body";
import { clamp, keys } from "./lib/math";

export type ShotInfo = { id: string; start: number; frames: number; clip: number; abs: number };
export type Ctx2 = CanvasRenderingContext2D;
export type ShotFn = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => void;

// time helpers for a shot of N frames
export const T = (f: number) => f / 30;
export const prog = (f: number, s: ShotInfo) => clamp(f / Math.max(1, s.frames - 1));
export const k = keys;

// begin a frame: black, logical transform
export const begin = (ctx: Ctx2, env: Env, color = "#000") => { ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = color; ctx.fillRect(0, 0, env.W, env.H); };
export const plateAt = (ctx: Ctx2, env: Env, cam: Cam, p: number, pl: Surface, x: number, y: number, alpha = 1, blend?: GlobalCompositeOperation) => drawPlate(ctx, env, cam, p, pl, x, y, alpha, blend);
export { cam0, finish, toScreen, type Cam, type Grade };

// ---- life: nobody stands still. Breath, blinks, a slow shift of weight, the eyes drifting.
export const alive = (t: number, seed: number, amt = 1) => {
  const breath = Math.sin(t * 1.25 + seed) * 0.5 + 0.5;
  // a blink every 2.5-5 s, 0.18 s long
  const period = 2.6 + (seed % 7) * 0.35, ph = (t + seed * 0.37) % period, blink = ph < 0.18 ? Math.sin((ph / 0.18) * Math.PI) : 0;
  return {
    breath,
    blink,
    sway: (fractal(seed, t * 0.25, 0.3, 1, 1, 2) - 0.5) * 0.06 * amt,
    nod: (fractal(seed + 3, t * 0.4, 1.1, 1, 1, 2) - 0.5) * 0.05 * amt,
    turn: (fractal(seed + 7, t * 0.3, 2.3, 1, 1, 2) - 0.5) * 0.08 * amt,
    gx: (fractal(seed + 11, t * 0.5, 0.7, 1, 1, 2) - 0.5) * 0.12 * amt,
    gy: (fractal(seed + 13, t * 0.45, 1.7, 1, 1, 2) - 0.5) * 0.06 * amt,
  };
};
export const liveFace = (e: Expr, t: number, seed: number, amt = 1): Expr => { const a = alive(t, seed, amt); return { ...e, lid: Math.max(0, (e.lid ?? 0.85) * (1 - a.blink * 0.95)), gazeX: (e.gazeX ?? 0) + a.gx, gazeY: (e.gazeY ?? 0) + a.gy }; };
export const livePose = (p: BodyPose, t: number, seed: number, amt = 1): BodyPose => {
  const a = alive(t, seed, amt), nk = p.neck ?? {};
  return { ...p, side: (p.side ?? 0) + a.sway * 0.3, bend: (p.bend ?? 0) + (a.breath - 0.5) * 0.012 * amt, neck: { yaw: (nk.yaw ?? 0) + a.turn, pitch: (nk.pitch ?? 0) + a.nod, roll: nk.roll ?? 0 } };
};

// ---- people and things on a layer: positions are in layer coordinates at parallax p
export type Actor = { fig: Figure; pose: BodyPose; x: number; y: number; p: number; scale: number; yaw: number; expr?: Expr; seed?: number; live?: number; paint?: number; detail?: number };
export const actorParts = (ctx: Ctx2, env: Env, cam: Cam, a: Actor, t: number, light: Place["light"], tilt = 0): Parts => {
  const [sx, sy, s] = toScreen(cam, a.p, env.W, env.H, a.x, a.y), seed = a.seed ?? a.fig.id.seed, live = a.live ?? 1;
  const pose = live > 0 ? livePose(a.pose, t, seed, live) : a.pose, expr = live > 0 ? liveFace(a.expr ?? {}, t, seed, live) : a.expr;
  return figureParts(ctx, a.fig, pose, { x: sx, y: sy, scale: a.scale * s, yaw: a.yaw, tilt, light, t, expr, paint: a.paint, detail: a.detail });
};
// render a group of parts together (they occlude each other) in their own layer
export const renderGroup = (ctx: Ctx2, env: Env, parts: Parts[], scale: number, fx?: LayerFx, paint = 0.6) => renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * scale, paint, fx });

// ---- a world camera for shots built in 3D: it aims at a point, at a scale (px per metre there)
import { type V3, type M3, view, apply, mmul, rotY, rotZ, rotX, sub3 } from "./lib/math";
// focal (px): when set the camera is a true perspective camera standing focal/scale metres from its
// target (a point at the target's depth still maps 1 m -> scale px); unset, it is orthographic.
// Figures and props take WEAK perspective: each is scaled by the depth of its own root.
export type WCam = { target: V3; scale: number; yaw: number; tilt: number; roll?: number; cx?: number; cy?: number; shake?: number; t?: number; pan0?: number; focal?: number };
export const depthK = (c: WCam, vz: number) => { if (!c.focal) return 1; const D = c.focal / c.scale; return D / Math.max(0.06, D - vz); };   // near plane 6 cm
export const panOf = (c: WCam, k = 1000, lim = 320) => Math.max(-lim, Math.min(lim, -(c.yaw - (c.pan0 ?? c.yaw)) * k));
export const wview = (c: WCam): M3 => view(c.yaw, c.tilt, c.roll ?? 0);
export const wproj = (c: WCam, env: Env, p: V3): [number, number, number] => {
  const v = apply(wview(c), sub3(p, c.target)), hx = c.shake ? (fractal(71, (c.t ?? 0) * 0.9, 0.3, 1, 1, 3) - 0.5) * 16 * c.shake : 0, hy = c.shake ? (fractal(76, 0.7, (c.t ?? 0) * 0.9, 1, 1, 3) - 0.5) * 12 * c.shake : 0;
  const k = depthK(c, v[2]);
  return [(c.cx ?? env.W / 2) + v[0] * c.scale * k + hx, (c.cy ?? env.H / 2) - v[1] * c.scale * k + hy, v[2] * c.scale];
};
// the rotation to hand a figure or prop standing at `pos` and turned by `yaw` (plus rock/pitch)
export const wplace = (c: WCam, env: Env, pos: V3, yaw: number, rock: { pitch?: number; roll?: number } = {}) => {
  const [x, y, z] = wproj(c, env, pos), R = mmul(wview(c), mmul(rotY(yaw), mmul(rotX(rock.pitch ?? 0), rotZ(rock.roll ?? 0))));
  return { x, y, z, R, scale: c.scale * depthK(c, z / c.scale) };
};
