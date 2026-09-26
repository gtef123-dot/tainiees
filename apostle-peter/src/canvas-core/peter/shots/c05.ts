// CLIP 05 — THE CONFESSION. «Ο Πέτρος ξεχώριζε για την αγάπη και τον ενθουσιασμό του. Ήταν εκείνος που ομολόγησε με θάρρος: «Εσύ είσαι ο Χριστός, ο Υιός του Θεού του ζώντος».»
// Caesarea Philippi, late afternoon. World: the cliff stands to the north (z = -14, facing +z); the
// sun is low in the west (-x); Christ sits on a boulder on the west side of the group, so that the
// reverse on Him (05.5) looks into the sinking sun, and the lit cliff bounces a warm rim onto Peter.
import type { Env } from "../../core";
import { rng } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose, type Figure } from "../figure/body";
import { PETER_FIG, CHRIST_FIG, ANDREW_FIG, JAMES_FIG, JOHN_FIG, THOMAS_FIG, PHILIP_FIG, MATTHEW_FIG } from "../figure/cast";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { boulderParts } from "../paint/props";
import { hillsWorld } from "../sets/galilee";
import { ground, card, earthTex, grassTex, cliffTex, softTex, trees } from "../sets/stage";
import type { TreeKind } from "../paint/nature";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, easeOut, smooth, norm3 } from "../lib/math";
import { fig, shadow, lookFrom, faceYaw, worldJoint, type Light } from "./kit";

const PETER = PETER_FIG.B, CHS: V3 = [-3.4, 0.42, -5.2], ROCKC = "#a89a84";
// the group in an arc facing Him (Peter second from the left as seen by Christ)
const GROUP: [Figure, V3][] = [[JOHN_FIG, [-0.9, 0, -6.6]], [PETER, [-0.7, 0, -5.5]], [ANDREW_FIG, [-0.4, 0, -4.4]], [JAMES_FIG, [0.4, 0, -6.0]], [THOMAS_FIG, [0.6, 0, -4.9]], [PHILIP_FIG, [-1.3, 0, -3.6]], [MATTHEW_FIG, [0.3, 0, -3.5]]];
// late sun from the west; view-space keys are set per shot from the camera's yaw
const sunLight = (cam: WCam, amt = 1): Light => { const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), w: V3 = [-0.85, 0.28, 0.1], key = norm3([w[0] * cy + w[2] * sy, w[1], -w[0] * sy + w[2] * cy]); return { ...LIGHTS.lateAfternoon, key, keyAmt: 1.05 * amt, rim: norm3([-key[0], 0.25, -Math.abs(key[2]) - 0.2]), rimColor: [1, 0.8, 0.55], rimAmt: 0.45 }; };
const shade = (l: Light): Light => ({ ...l, keyAmt: l.keyAmt * 0.35, fill: [0.52, 0.56, 0.68], fillAmt: 0.62, bounce: [0.9, 0.62, 0.4], bounceAmt: 0.5 });
// the set, from any camera: the western/southern country behind, the cliff card, rocky ground, boulders
const BOULDERS: [V3, number, number, number][] = [[CHS[0], 1.0, 0.85, 0.42], [-5.5, 1.6, 1.2, 0.9], [2.4, 1.3, 1.0, 0.6], [3.6, 2.2, 1.6, 1.3], [-2.2, 0.9, 0.7, 0.4], [1.6, 0.8, 0.6, 0.35], [-7, 2.6, 2.0, 1.8], [5.5, 1.8, 1.4, 1.0], [-1.8, 1.1, 0.9, 0.7]].map(([x, a, b, c], i) => [[x as number, 0, i === 0 ? CHS[2] : -9 + ((i * 7) % 11) * 1.2] as V3, a as number, b as number, c as number]);
const TREES = (() => { const r = rng(505), out: { at: V3; kind: TreeKind; h: number; seed: number }[] = []; for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 12 + r() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8 + 4; if (z < -12.5) continue; out.push({ at: [x, 0, z], kind: (["oak", "fig", "poplar", "olive"] as const)[i % 4], h: 5 + r() * 7, seed: 600 + i }); } for (let i = 0; i < 6; i++) out.push({ at: [-15 + i * 6 + r() * 2, 0, -12.8], kind: i % 2 ? "fig" : "poplar", h: 6 + r() * 5, seed: 640 + i }); return out; })();
const caesarea = (ctx: Ctx2, env: Env, cam: WCam, t: number, o: { blurBack?: number; cliffBlur?: number; skip?: number } = {}) => {
  hillsWorld(ctx, env, { ...cam, pan0: cam.yaw }, "late", cam.focal, o.blurBack ?? 0);
  ground(ctx, env, cam, grassTex(env, "#8e8a58"), { x0: -60, x1: 60, z0: -14, z1: 40, tile: [3, 3] });
  const cl = (o.cliffBlur ?? 0) > 0.3 ? softTex(env, cliffTex(env, 1), "tex:cliff:1", 6 + Math.round(10 * (o.cliffBlur ?? 0))) : cliffTex(env, 1);
  card(ctx, env, cam, cl, { at: [0, 0, -14], w: 90, h: 30, cols: 16 });
  // the springs make it green: oaks, figs and poplars round the rocks, olives on the slopes beyond
  trees(ctx, env, cam, TREES, -1);
  const parts: Parts[] = BOULDERS.filter((_, i) => i !== o.skip).map(([p, w, d, h], i) => { const q = wplace(cam, env, p, i * 0.7); return boulderParts({ x: q.x, y: q.y, z: q.z, scale: q.scale, yaw: 0, R: q.R, light: shade(sunLight(cam)), w, d, h, seed: 500 + i, color: ROCKC, moss: 0.3 }); });
  renderParts(ctx, parts, { env, cell: 3, tol: 0.05 * cam.scale, paint: 0.4 });
  void t;
};

// ---------------------------------------------------------------- 05.1 eager on the path
// low, ahead of him on the rocky path: Peter strides up toward us and onto a flat rock, laughing,
// then turns and reaches down to haul John up after him
const s051 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), up = easeInOut(clamp(n / 0.5)), turn = easeInOut(clamp((n - 0.5) / 0.22)), reach = smooth(0.62, 0.85, n);
  const ROCK: V3 = [1.2, 0, 2.2], P0: V3 = [1.6, 0, 7.5], pos: V3 = [lerp(P0[0], ROCK[0], up), 0.42 * smooth(0.75, 1, up), lerp(P0[2], ROCK[2], up)];
  const cam = lookFrom([0.4, 0.35, -1.2], [1.0, 1.35, 3.2], 360, { cy: 520, cx: 960, t, shake: 0.25 });
  begin(ctx, env);
  caesarea(ctx, env, cam, t, { blurBack: 0.3 });
  const L = sunLight(cam);
  const q = wplace(cam, env, [ROCK[0], 0, ROCK[2]], 0.3);
  const rock = boulderParts({ x: q.x, y: q.y, z: q.z, scale: q.scale, yaw: 0, R: q.R, light: L, w: 1.3, d: 1.1, h: 0.42, seed: 540, color: ROCKC });
  const yaw = lerp(faceYaw(P0, ROCK), faceYaw(ROCK, [1.8, 0, 4.6]) , turn);
  const pose: BodyPose = up < 1 ? walk(t * 1.2, 1.15, { bend: 0.12, neck: { pitch: -0.1 } }) : { bend: lerp(0, 0.45, reach), legL: { hip: 0.35 * reach, knee: 0.6 * reach }, legR: { hip: -0.1, knee: 0.2 * reach }, armR: { raise: lerp(0.3, 1.1, reach), out: 0.2, elbow: 0.2 }, armL: { raise: lerp(1.9, 0.4, reach), out: lerp(0.6, 0.3, reach), elbow: 0.3 }, handR: HANDS.open, handL: HANDS.open, neck: { pitch: 0.25 * reach, yaw: 0 } };
  const peter = fig(ctx, env, cam, PETER, pose, pos, yaw, t, { expr: FACE.joyful, light: L, live: 0.4 });
  const john = fig(ctx, env, cam, JOHN_FIG, n < 0.5 ? walk(t * 1.1, 1, {}) : { bend: 0.35, legL: { hip: 0.7 * reach, knee: 0.9 * reach }, armR: { raise: lerp(0.4, 2.2, reach), elbow: 0.2, out: 0.1 }, armL: { raise: 0.3, elbow: 0.4 }, handR: HANDS.open, neck: { pitch: -0.4 } }, [lerp(2.0, 1.55, clamp(n * 1.5)), 0, lerp(8.5, 3.6, clamp(n * 1.4))], faceYaw([1.8, 0, 6], ROCK), t, { expr: FACE.joyful, light: L, live: 0.4, paint: 0.5 });
  shadow(ctx, env, cam, [pos[0], 0, pos[2]], 0.4, 0.35);
  renderParts(ctx, [john], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.5 });
  renderParts(ctx, [rock, peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  motes(ctx, 51, 40, t, [0, 200, env.W, 900], { color: [1, 0.86, 0.6], size: 1.8, vx: 6, vy: -3, alpha: 0.4, flicker: 2 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.28, grain: 0.07, gain: [1, 0.93, 0.8], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 05.2 beneath the rock
// wide and low, the cliff filling the sky, glowing; the little group in shade at its foot; Christ,
// seated, looks up at them and asks (implied): the talk stops
const s052 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const cam = lookFrom([lerp(5.2, 4.6, n), 0.45, 9.5], [-1.6, 5.5, -10], 62, { cy: 560, cx: 960, t, shake: 0.08 });
  begin(ctx, env);
  caesarea(ctx, env, cam, t);
  const L = shade(sunLight(cam)), stop = smooth(0.35, 0.55, n);
  const parts: Parts[] = GROUP.map(([fg, p], i) => fig(ctx, env, cam, fg, { neck: { yaw: (1 - stop) * 0.5 * Math.sin(t * 2 + i), pitch: 0 }, armR: { raise: (1 - stop) * 0.4 * Math.max(0, Math.sin(t * 1.6 + i * 2)), elbow: 0.8 } }, p, faceYaw(p, CHS) + (1 - stop) * 0.5 * Math.sin(i * 3.1), t, { light: L, live: 0.3, paint: 0.35 }));
  parts.push(fig(ctx, env, cam, CHRIST_FIG, grounded(CHRIST_FIG, { bend: 0.05, legL: { hip: 1.45, knee: 1.5 }, legR: { hip: 1.3, knee: 1.35 }, armL: { raise: 0.5, elbow: 1.2 }, armR: { raise: 0.45, elbow: 1.2 }, neck: { pitch: -0.1 } }, CHS[1] - 0.45), [CHS[0], 0, CHS[2]], faceYaw(CHS, [-0.3, 0, -5]), t, { light: L, live: 0.3, paint: 0.35 }));
  for (const [, p] of GROUP) shadow(ctx, env, cam, p, 0.35, 0.25);
  renderParts(ctx, parts, { env, cell: 2, tol: 0.05 * cam.scale, paint: 0.35 });
  motes(ctx, 52, 25, t, [0, 100, env.W, 600], { color: [1, 0.86, 0.6], size: 1.5, vx: 4, vy: -2, alpha: 0.3, flicker: 2 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.3, grain: 0.07, gain: [1, 0.93, 0.8], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 05.3 the others hesitate
// eye level, from near Christ: the disciples glance at each other and look down; in the long
// silence Peter steps forward, almost before he knows he has moved, and the low sun finds him
const s053 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), step = easeInOut(clamp((n - 0.62) / 0.3)), look = smooth(0.1, 0.4, n);
  const cam = lookFrom([CHS[0] + 0.5, 1.55, CHS[2] + 0.9], [-0.4, 1.45, -5.0], 330, { cy: 520, cx: 960, t, shake: 0.08 });
  begin(ctx, env);
  caesarea(ctx, env, cam, t, { blurBack: 0.6, cliffBlur: 0.6, skip: 0 });
  const L = sunLight(cam, 0.9), S = shade(L);
  const parts: Parts[] = GROUP.map(([fg, p], i) => {
    if (fg === PETER) { const pp: V3 = [lerp(p[0], p[0] - 0.75, step), 0, lerp(p[2], p[2] + 0.1, step)]; return fig(ctx, env, cam, PETER, step > 0.02 && step < 0.98 ? walk(t * 0.9, 0.7, {}) : {}, pp, faceYaw(pp, CHS), t, { expr: blendFace({ ...FACE.neutral, gazeY: -0.3 * look }, { ...FACE.confident, lid: 0.9 }, step), light: { ...S, keyAmt: lerp(S.keyAmt, L.keyAmt, step), rimAmt: lerp(0.1, 0.8, step) }, live: 0.3, paint: 0.5 }); }
    const glance = Math.sin(t * 1.3 + i * 2.1) * 0.5 * (1 - look);
    return fig(ctx, env, cam, fg, { neck: { yaw: glance, pitch: 0.35 * look }, bend: 0.05 * look }, p, faceYaw(p, CHS), t, { expr: { ...FACE.neutral, gazeY: -0.5 * look, lid: 0.7 }, light: S, live: 0.3, paint: 0.45 });
  });
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.5 });
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.3, grain: 0.07, gain: [1, 0.93, 0.8], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 05.4 «Εσύ είσαι ο Χριστός»
// MCU, slightly below his eyes: he looks straight at Christ; an open hand comes up; the face is
// certain and very still. A soft warm rim from the lit cliff behind.
const s054 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), hand = smooth(0.12, 0.4, n);
  const P: V3 = [-1.45, 0, -5.4], PY = faceYaw(P, CHS);
  const pose: BodyPose = { armR: { raise: lerp(0.15, 0.95, hand), out: lerp(0.1, 0.35, hand), elbow: lerp(0.3, 1.0, hand), twist: 0.4 }, handR: hand > 0.3 ? HANDS.open : HANDS.relaxed, armL: { raise: 0.1, elbow: 0.3 }, neck: { pitch: -0.04 } };
  const face = worldJoint(PETER, pose, P, PY, "face");
  const cam = lookFrom([CHS[0] + 0.7, face[1] - 0.18, CHS[2] + 0.45], [face[0], face[1] - 0.08, face[2]], lerp(1300, 1380, n), { cy: 480, cx: 1000, t, shake: 0.06 });
  begin(ctx, env);
  caesarea(ctx, env, cam, t, { blurBack: 1, cliffBlur: 1, skip: 0 });
  const L = { ...sunLight(cam, 1.0), rimAmt: 0.9, rimColor: [1, 0.78, 0.52] as [number, number, number] };
  const peter = fig(ctx, env, cam, PETER, pose, P, PY, t, { expr: { ...FACE.confident, lid: 0.95, gazeX: 0, gazeY: 0.02, smile: 0.05 }, light: L, live: 0.05 });
  renderParts(ctx, [peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.32, grain: 0.07, gain: [1, 0.93, 0.8], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 05.5 Christ's answer
// MCU on Him, at eye level, into the west: calm, a faint smile. Behind His head the sinking sun flares
// and whitens the frame, then contracts to a single point of light.
const s055 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const pose = grounded(CHRIST_FIG, { bend: 0.05, legL: { hip: 1.45, knee: 1.5 }, legR: { hip: 1.3, knee: 1.35 }, armL: { raise: 0.5, elbow: 1.2 }, armR: { raise: 0.45, elbow: 1.2 }, neck: { pitch: -0.12, yaw: 0 } }, CHS[1] - 0.45);
  const CP: V3 = [CHS[0], 0, CHS[2]], CY = faceYaw(CHS, [-1.4, 0, -5.4]), face = worldJoint(CHRIST_FIG, pose, CP, CY, "face");
  const cam = lookFrom([-1.5, face[1] + 0.05, -5.3], [face[0], face[1] - 0.05, face[2]], lerp(1250, 1330, n), { cy: 490, cx: 960, t, shake: 0.05 });
  begin(ctx, env);
  caesarea(ctx, env, cam, t, { blurBack: 1, skip: 0 });
  const L = { ...sunLight(cam, 0.6), rimAmt: 1.3, rimColor: [1, 0.85, 0.6] as [number, number, number], fill: [0.95, 0.78, 0.6] as [number, number, number], fillAmt: 1.0, bounce: [1, 0.8, 0.6] as [number, number, number], bounceAmt: 0.6 };
  const christ = fig(ctx, env, cam, CHRIST_FIG, pose, CP, CY, t, { expr: { lid: 0.72, smile: lerp(0.06, 0.22, smooth(0.2, 0.6, n)), gazeX: 0, gazeY: 0 }, light: L, live: 0.1 });
  const sx = wproj(cam, env, [face[0] - 0.2, face[1] + 0.15, face[2] - 60])[0], sy = 330, flare = smooth(0.35, 0.62, n) * (1 - smooth(0.7, 0.95, n)), point = smooth(0.8, 1, n);
  glow(ctx, sx, sy, 400 + 1600 * flare, [1, 0.92, 0.72], 0.45 + 0.4 * flare);
  renderParts(ctx, [christ], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  shaft(ctx, sx, sy, sx + 500, sy + 900, 40, 500, [1, 0.9, 0.7], 0.2 * flare);
  // whiten, then gather to a point
  if (flare > 0.01) { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = `rgba(255,248,230,${0.8 * flare * flare})`; ctx.fillRect(0, 0, env.W, env.H); ctx.restore(); }
  glow(ctx, sx, sy, lerp(160, 40, point), [1, 0.98, 0.9], 0.9 * (0.4 + point * 0.6));
  finish(ctx, env, s.abs, { bloom: 0.45, vignette: 0.3, grain: 0.07, gain: [1, 0.93, 0.8], gainAmt: 0.22 });
};

register({ "05.1": s051, "05.2": s052, "05.3": s053, "05.4": s054, "05.5": s055 });
void rng; void easeOut;
