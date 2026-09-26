// THE SHOT KIT: the few helpers every clip uses to put people, boats and water in front of a world camera.
import type { Env } from "../../core";
import { rng } from "../../core";
import { type Ctx2, type WCam, wproj, wplace, liveFace, livePose } from "../scene";
import { renderParts, type Parts, type Expr, type LayerFx } from "../figure/head";
import { figureParts, type BodyPose, type Figure } from "../figure/body";
import { LIGHTS, FACE } from "../figure/acting";
import { boatParts } from "../paint/props";
import { type V3, apply, rotY } from "../lib/math";

export type Light = typeof LIGHTS.goldenMorning;
// a posed, breathing, blinking figure standing at pos (world), turned by yaw
export const fig = (ctx: Ctx2, env: Env, cam: WCam, f: Figure, pose: BodyPose, pos: V3, yaw: number, t: number, o: { expr?: Expr; rock?: { roll?: number; pitch?: number }; light?: Light; live?: number; paint?: number; detail?: number } = {}): Parts => {
  const p = wplace(cam, env, pos, yaw, o.rock), live = o.live ?? 0.5, lp = livePose(pose, t, f.id.seed, live);
  return figureParts(ctx, f, lp, { x: p.x, y: p.y, z: p.z, scale: p.scale, yaw: 0, R: p.R, light: o.light ?? LIGHTS.goldenMorning, t, expr: liveFace(o.expr ?? FACE.neutral, t, f.id.seed, live), paint: o.paint, detail: o.detail });
};
// the boat's gentle rock on the water (the same for the boat and everyone standing in it)
export const rockOf = (t: number, seed: number, amt = 1) => ({ roll: Math.sin(t * 1.05 + seed) * 0.022 * amt, pitch: Math.sin(t * 0.8 + seed) * 0.01 * amt });
export const boatAt = (ctx: Ctx2, env: Env, cam: WCam, pos: V3, yaw: number, t: number, o: { light?: Light; seed?: number; sail?: "none" | "furled" | "set"; fill?: number; rock?: number; roll?: number; paint?: number } = {}): Parts => {
  const seed = o.seed ?? 3, r = rockOf(t, seed, o.rock ?? 1), p = wplace(cam, env, pos, yaw, { roll: r.roll + (o.roll ?? 0), pitch: r.pitch });
  void ctx; return boatParts({ x: p.x, y: p.y, scale: p.scale, yaw: 0, R: p.R, z: p.z, light: o.light ?? LIGHTS.goldenMorning, seed, sail: o.sail ?? "none", fill: o.fill, paint: o.paint });
};
// a point given in a boat's own frame (x along the keel to the bow, y up, z to port) -> world
export const onBoat = (boat: V3, yaw: number, local: V3): V3 => { const w = apply(rotY(yaw), local); return [boat[0] + w[0], boat[1] + w[1], boat[2] + w[2]]; };
// the screen height of the water surface at a world point (each thing afloat is cut at its own waterline)
export const waterAt = (cam: WCam, env: Env, p: V3) => wproj(cam, env, [p[0], 0, p[2]])[1];
// render groups far to near, each clipped and reflected at its own waterline
export const afloat = (ctx: Ctx2, env: Env, cam: WCam, groups: { at: V3; parts: Parts[]; fx?: LayerFx; paint?: number }[], t: number, paint = 0.6) => {
  const order = groups.map((g) => ({ g, d: wproj(cam, env, g.at)[2] })).sort((a, b) => a.d - b.d);
  for (const { g } of order) renderParts(ctx, g.parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: g.paint ?? paint, fx: { waterY: waterAt(cam, env, g.at), reflect: t, ...g.fx } });
};
// big soft drops on the lens (a splash toward camera)
export const lensDrops = (ctx: Ctx2, env: Env, amt: number, seed: number) => {
  if (amt <= 0.01) return; const r = rng(seed);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  for (let i = 0; i < 14; i++) { const x = r() * env.W, y = env.H * (0.3 + r() * 0.7), rad = 12 + r() * 60, a = amt * (0.35 + r() * 0.4); const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad); g.addColorStop(0, `rgba(255,250,235,${a * 0.6})`); g.addColorStop(0.7, `rgba(200,215,225,${a * 0.25})`); g.addColorStop(1, `rgba(120,140,150,0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
};
// a splash: a crown of drops thrown up and falling, a spreading ring of foam (s: size in px, age: seconds)
export const splash = (ctx: Ctx2, x: number, y: number, s: number, age: number, seed: number, light: [number, number, number] = [0.95, 0.96, 0.97]) => {
  if (age < 0 || age > 1.6) return; const r = rng(seed), c = (a: number) => `rgba(${Math.round(light[0] * 255)},${Math.round(light[1] * 255)},${Math.round(light[2] * 255)},${a})`;
  ctx.save();
  // the white column and sheet in the first instant
  if (age < 0.5) { const k = age / 0.5, g = ctx.createRadialGradient(x, y - s * 0.2 * k, 1, x, y - s * 0.15, s * 0.35); g.addColorStop(0, c(0.75 * (1 - k))); g.addColorStop(1, c(0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - s * 0.18 * Math.sin(Math.PI * k), s * 0.22 * (0.5 + k), s * 0.3 * Math.sin(Math.PI * Math.min(1, k * 1.3)) + 2, 0, 0, Math.PI * 2); ctx.fill(); }
  for (let i = 0; i < 90; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.4, v = s * (0.5 + r() * 1.1), g = s * 1.6, px = x + Math.cos(a) * v * age * 0.9, py = y + Math.sin(a) * v * age + 0.5 * g * age * age, rad = 0.8 + r() * s * 0.014; if (py > y + 2) continue; ctx.fillStyle = c(0.85 * (1 - age / 1.6)); ctx.beginPath(); ctx.ellipse(px, py, rad, rad * 1.4, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const k of [1, 0.6]) { ctx.strokeStyle = c(0.55 * (1 - age / 1.6) * k); ctx.lineWidth = Math.max(1, s * 0.012 * k); ctx.beginPath(); ctx.ellipse(x, y, s * 0.3 * (0.3 + age * k), s * 0.06 * (0.3 + age * k), 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
};
// a soft contact shadow on the ground under something standing or resting at p (r: radius in metres;
// sx/sz stretch it along the world axes, e.g. a boat's keel)
export const shadow = (ctx: Ctx2, env: Env, cam: WCam, p: V3, r: number, amt = 0.45, sx = 1, sz = 1, floor = 0) => {
  const c = wproj({ ...cam, shake: 0 }, env, [p[0], floor, p[2]]), a = wproj({ ...cam, shake: 0 }, env, [p[0] + r * sx, floor, p[2]]), b = wproj({ ...cam, shake: 0 }, env, [p[0], floor, p[2] + r * sz]);
  const rx = Math.max(2, Math.hypot(a[0] - c[0], a[1] - c[1]), Math.abs(b[0] - c[0])), ry = Math.max(1.5, Math.abs(b[1] - c[1]), Math.abs(a[1] - c[1]));
  ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(30,24,18,${amt})`); g.addColorStop(0.55, `rgba(30,24,18,${amt * 0.55})`); g.addColorStop(1, "rgba(30,24,18,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
};
// a joint of a posed figure standing at pos, turned by yaw, in world space (for aiming cameras, hands, props)
import { joints } from "../figure/body";
export const worldJoint = (f: Figure, pose: BodyPose, pos: V3, yaw: number, name: keyof ReturnType<typeof joints>): V3 => {
  const j = joints(f, pose)[name] as V3, w = apply(rotY(yaw), j); return [pos[0] + w[0], pos[1] + w[1], pos[2] + w[2]];
};
// a point in a figure's own frame (x to its left, y up, z forward) -> world
export const inFrame = (pos: V3, yaw: number, local: V3): V3 => { const w = apply(rotY(yaw), local); return [pos[0] + w[0], pos[1] + w[1], pos[2] + w[2]]; };
// the yaw that turns a figure (or a camera: use camYaw) to face from a toward b
export const faceYaw = (a: V3, b: V3) => Math.atan2(b[0] - a[0], b[2] - a[2]);
export const camYaw = (from: V3, to: V3) => Math.atan2(to[0] - from[0], -(to[2] - from[2]));
// a perspective camera standing at `eye` looking at `at` (scale: px per metre at `at`'s depth)
export const lookFrom = (eye: V3, at: V3, scale: number, o: Partial<WCam> = {}): WCam => {
  const d: V3 = [at[0] - eye[0], at[1] - eye[1], at[2] - eye[2]], dist = Math.hypot(d[0], d[1], d[2]), hz = Math.hypot(d[0], d[2]);
  const yaw = Math.atan2(d[0], -d[2]), tilt = Math.atan2(-d[1], hz);
  return { target: at, scale, yaw, tilt, focal: scale * dist, ...o };
};
// a light at a world position, as a view-space key direction for a figure standing at p
import { wview } from "../scene";
import { norm3 } from "../lib/math";
export const keyFrom = (cam: WCam, p: V3, light: V3): V3 => norm3(apply(wview(cam), [light[0] - p[0], light[1] - p[1], light[2] - p[2]]));
export const dirView = (cam: WCam, d: V3): V3 => norm3(apply(wview(cam), d));
// a world point in a figure's own frame (the inverse of inFrame): for IK targets that must meet something
export const toLocal = (pos: V3, yaw: number, p: V3): V3 => apply(rotY(-yaw), [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]]);
// a bronze helmet (galea) with cheek-pieces and a crest, set on a figure's head as an overlay
import type { Overlay } from "../figure/head";
import { drawCtx } from "../figure/mesh";
export const helmet = (cam: WCam, env: Env, f: Figure, pose: BodyPose, pos: V3, yaw: number, lit = 1): Overlay => {
  const top = worldJoint(f, pose, pos, yaw, "headTop"), face = worldJoint(f, pose, pos, yaw, "face"), c: V3 = [top[0] * 0.55 + face[0] * 0.45, top[1] * 0.6 + face[1] * 0.4 + 0.02, top[2] * 0.55 + face[2] * 0.45];
  const s = wproj(cam, env, c), sc = wplace(cam, env, c, 0).scale, r = 0.135 * sc;
  return { z: s[2] + 0.2 * sc, draw: () => { const g = drawCtx.ctx; if (!g) return; g.save(); const gr = g.createRadialGradient(s[0] - r * 0.35, s[1] - r * 0.5, r * 0.1, s[0], s[1], r * 1.1); gr.addColorStop(0, `rgba(${Math.round(210 * lit)},${Math.round(170 * lit)},${Math.round(100 * lit)},1)`); gr.addColorStop(0.6, `rgba(${Math.round(130 * lit)},${Math.round(95 * lit)},${Math.round(55 * lit)},1)`); gr.addColorStop(1, "rgba(40,28,18,1)"); g.fillStyle = gr; g.beginPath(); g.ellipse(s[0], s[1], r, r * 0.92, 0, Math.PI * 1.05, Math.PI * 1.95 + 0.2); g.lineTo(s[0] + r * 0.95, s[1] + r * 0.2); g.lineTo(s[0] - r * 0.95, s[1] + r * 0.2); g.closePath(); g.fill();
    g.fillStyle = "rgba(60,40,24,1)"; g.fillRect(s[0] - r * 1.05, s[1] + r * 0.1, r * 2.1, r * 0.16); g.fillStyle = "#7a1c16"; g.beginPath(); g.ellipse(s[0], s[1] - r * 0.95, r * 0.9, r * 0.28, 0, Math.PI, 0); g.fill(); g.restore(); } };
};
