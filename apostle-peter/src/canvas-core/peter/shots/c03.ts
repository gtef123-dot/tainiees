// CLIP 03 — THE CALL. «Μια μέρα, ο Χριστός τον κάλεσε να Τον ακολουθήσει. Ο Πέτρος άφησε τα δίχτυα του, τη βάρκα του και την προηγούμενη ζωή του, και έγινε μαθητής Του.»
// One beach, one late morning. Peter mends a net on a boulder by the beached boat; Christ comes along
// the shore and stops a few paces off; the look; the net slips from his hands; he follows.
import type { Env } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose, type Figure } from "../figure/body";
import { PETER_FIG, CHRIST_FIG } from "../figure/cast";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { boulderParts, netPileParts, boatGunwale } from "../paint/props";
import { net, drapedNet, rope } from "../paint/cord";
import { shoreWorld } from "../sets/lake";
import { motes, glow } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, easeOut, smooth, norm3 } from "../lib/math";
import { fig, boatAt, onBoat, shadow, worldJoint, inFrame, faceYaw, camYaw, lookFrom, type Light } from "./kit";

// ---- the set: world metres. The lake lies toward -z; the waterline is at z = SHORE. Peter sits facing
// the water; the boat is drawn up on his right; Christ comes along the waterline and stops before him.
const SHORE = -2.2, SEAT: V3 = [0, 0, 0.3], STAND: V3 = [-0.55, 0, -1.25];
const PY = Math.PI + 0.12, BY = -Math.PI / 2, BOAT = onBoat([1.75, 0.12, 1.1], BY, [-4.1, 0, 0]);
// soft late-morning light, the sun high over the lake: behind Christ, in Peter's face
const BACK = { ...LIGHTS.day, key: norm3([-0.3, 0.65, -0.65]), keyAmt: 0.95, fillAmt: 0.55, rim: norm3([-0.4, 0.3, -0.85]), rimColor: [1, 0.95, 0.82] as [number, number, number], rimAmt: 0.7 };
const FRONT = { ...LIGHTS.day, key: norm3([0.3, 0.65, 0.65]), keyAmt: 1.0, fillAmt: 0.5 };
const MANTLED: Figure = { ...PETER_FIG.A, costume: { ...PETER_FIG.A.costume, mantle: "#5f6f7c", mantleLen: 0.42 } };

// Peter seated on the boulder, mending: the needle hand draws the twine up and through, over and over
const seated = (t: number, work: number, look = 0, lookYaw = 0, release = 0): BodyPose => {
  const cyc = Math.sin(t * 3.4) * work, up = Math.max(0, cyc);
  return { root: [0, 0, -0.05], bend: lerp(0.42, 0.1, look) , neck: { pitch: lerp(0.55, -0.12, look), yaw: lookYaw },
    legL: { hip: 1.45, knee: 1.55, out: 0.12 }, legR: { hip: 1.4, knee: 1.5, out: 0.1 },
    armL: { target: [0.1 + 0.02 * release, lerp(0.64, 0.6, release), lerp(0.36, 0.3, release)], pole: [0.8, -0.3, -0.3] },
    armR: { target: [-0.1 - 0.04 * up + 0.02 * release, lerp(0.66 + 0.1 * up, 0.6, release), lerp(0.4 + 0.03 * up, 0.3, release)], pole: [-0.8, -0.3, -0.3] },
    handL: release > 0.3 ? HANDS.release : HANDS.grip, handR: release > 0.3 ? HANDS.release : { curl: 0.7, thumb: 0.8, thumbCurl: 0.6 } };
};
// seated so that the pelvis rests on the boulder's top
const onSeat = (p: BodyPose) => ({ ...grounded(PETER_FIG.A, p, 0), root: [0, -0.4, -0.05] as V3 });
// the net across his thighs and down over his knees, slipping away as `slide` goes 0 -> 1
const lapNet = (slide: number, t: number): V3[][] => drapedNet([0.3, 0, 0], [-0.6, 0, 0], [0, 0, 1], 18, 20, () => 0).map((row, r) => row.map((p, c) => {
  const fv = r / 20, fu = c / 18, v = fv * 1.15 + slide * 0.9, knee = 0.52, fall = Math.max(0, v - 0.42);
  const gx = lerp(p[0], 0, Math.min(0.55, fall * 1.1)), y = v < 0.42 ? knee + 0.05 - 0.03 * Math.sin(Math.PI * fu) : Math.max(0.03, knee + 0.05 - fall * 1.2);
  const z = v < 0.42 ? 0.05 + v : 0.47 + Math.min(0.12, fall * 0.25) + Math.max(0, fall - 0.45) * 0.9;
  return inFrame(SEAT, PY, [gx + 0.025 * Math.sin(t * 0.7 + fu * 3) * (1 - fv), y, z + (fall > 0 ? 0.012 * Math.sin(t + fu * 5) : 0)]);
}));
const boulder = (cam: WCam, env: Env, light: Light = FRONT) => { const p = wplace(cam, env, [SEAT[0], 0, SEAT[2] - 0.05], PY); return boulderParts({ x: p.x, y: p.y, z: p.z, scale: p.scale, yaw: 0, R: p.R, light, w: 0.62, d: 0.55, h: 0.44, seed: 7, color: "#4d4843" }); };
const beachedBoat = (ctx: Ctx2, env: Env, cam: WCam, light: Light = FRONT) => boatAt(ctx, env, cam, BOAT, BY, 0, { light, rock: 0, roll: 0.06, seed: 3 });
const christ = (ctx: Ctx2, env: Env, cam: WCam, t: number, pos: V3, yaw: number, stride: number, light: Light = BACK, paint = 0.5) =>
  fig(ctx, env, cam, CHRIST_FIG, stride > 0.01 ? walk(t * 0.85, stride, { neck: { pitch: 0.05 } }) : { armL: { raise: 0.1, elbow: 0.3 }, armR: { raise: 0.12, elbow: 0.35 }, neck: { pitch: 0.12, yaw: 0.1 } }, pos, yaw, t, { expr: { lid: 0.72, smile: 0.08 }, light, paint, live: 0.35 });

// ---------------------------------------------------------------- 03.1 a shadow on the net
// over his hands, low: the needle, the twine, the mesh; soft beyond, the shore. A figure comes along
// the waterline and stops; its shadow slides across the net; focus racks from the hands to Him.
const s031 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), stop = smooth(0.55, 0.72, n);
  const pose = seated(t, 1 - stop);
  const lap = inFrame(SEAT, PY, [0, 0.72, 0.25]), eye = inFrame(SEAT, PY, [0.75, 0.62, 1.55]);
  const cam: WCam = lookFrom(eye, [lap[0], lap[1] + 0.02 * n, lap[2]], lerp(1250, 1330, n), { cx: 940, cy: 560, t, shake: 0.1 });
  begin(ctx, env);
  shoreWorld(ctx, env, cam, "day", SHORE, { blur: 1, t });
  const P = (p: V3) => wproj(cam, env, p);
  const peter = fig(ctx, env, cam, PETER_FIG.A, onSeat(pose), SEAT, PY, t, { expr: FACE.neutral, light: FRONT, live: 0.2 });
  const hand = worldJoint(PETER_FIG.A, onSeat(pose), SEAT, PY, "handR"), dir = inFrame([0, 0, 0], PY, [-0.03, 0.05, 0.11]);
  const needle = rope(P, [hand, [hand[0] + dir[0], hand[1] + dir[1], hand[2] + dir[2]]], { width: Math.max(2, 0.013 * cam.scale), color: "#c4a676", t });
  const twine = rope(P, [hand, inFrame(SEAT, PY, [0.02, 0.585, 0.43])], { width: Math.max(0.8, 0.0022 * cam.scale), color: "#8a7658", sag: 0.1 });
  const mesh = net(P, lapNet(0, t), { width: Math.max(1, 0.0022 * cam.scale), wet: 0.2, t, seed: 31, veil: 0.1, knots: false });
  renderParts(ctx, [boulder(cam, env), { ...peter, overlays: [...peter.overlays, mesh, needle, twine] }], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  // His shadow comes across the net and the hands, from the right, and stays
  const sh = smooth(0.3, 0.58, n);
  if (sh > 0) { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; const x = lerp(env.W + 700, 760, sh), g = ctx.createLinearGradient(x + 260, 120, x - 420, 420); g.addColorStop(0, "rgba(72,82,108,0.5)"); g.addColorStop(0.45, "rgba(72,82,108,0.46)"); g.addColorStop(1, "rgba(72,82,108,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, env.W, env.H); ctx.restore(); }
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.3, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 03.2 the look
// MCU, eye level, just off His eyeline: Peter looks up and holds it. His shadow lies across Peter's chest.
const s032 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), look = easeInOut(clamp(n / 0.3));
  const pose = seated(t, 0, look, 0.12 * look);
  const head = worldJoint(PETER_FIG.A, onSeat(pose), SEAT, PY, "face");
  const eye: V3 = [STAND[0] + 0.25, head[1] + 0.02, STAND[2] - 0.1];
  const cam: WCam = lookFrom(eye, [head[0], head[1] - 0.08, head[2]], lerp(1800, 1900, n), { cy: 500, cx: 1010, t, shake: 0.1 });
  begin(ctx, env);
  shoreWorld(ctx, env, cam, "day", SHORE, { blur: 1, t });
  renderParts(ctx, [beachedBoat(ctx, env, cam)], { env, cell: 3, tol: 0.03 * cam.scale, paint: 0.4, fx: { blur: 9 } });
  const expr = blendFace({ ...FACE.neutral, gazeY: -0.5 }, { ...FACE.awe, gazeX: -0.28, gazeY: 0.2, open: 0.08 }, look);
  const peter = fig(ctx, env, cam, PETER_FIG.A, onSeat(pose), SEAT, PY, t, { expr: { ...expr, lid: n > 0.35 ? 0.95 : expr.lid }, light: FRONT, live: 0.08 });
  renderParts(ctx, [boulder(cam, env)], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 }); renderParts(ctx, [peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 }); /* the rock first: its big facets sorted with his body painted over his chest */
  // the edge of His shadow across the chest and shoulder
  const ch = wproj(cam, env, worldJoint(PETER_FIG.A, onSeat(pose), SEAT, PY, "chest"));
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; const g = ctx.createLinearGradient(ch[0] - 300, ch[1] + 200, ch[0] + 100, ch[1] - 120); g.addColorStop(0, "rgba(80,90,115,0.6)"); g.addColorStop(0.7, "rgba(80,90,115,0.5)"); g.addColorStop(1, "rgba(80,90,115,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, env.W, env.H); /* the whole frame: a rect edge drew a hard line across his chest */ ctx.restore();
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.34, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 03.3 the net slips from his hands
// Christ turns and walks away along the shore; Peter's eyes follow Him, go to the boat, then down;
// the camera tilts down with his gaze; the fingers open and the net slides away into the boat
const s033 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), down = easeInOut(clamp((n - 0.35) / 0.35)), rel = smooth(0.62, 0.85, n), slide = easeInOut(clamp((n - 0.7) / 0.3));
  const look = 1 - down, pose = seated(t, 0, look, lerp(0.25, 0.05, down), rel);
  const head = worldJoint(PETER_FIG.A, onSeat(pose), SEAT, PY, "face"), lap = inFrame(SEAT, PY, [0, 0.6, 0.38]);
  const eye: V3 = [STAND[0] + 0.45, head[1] + 0.02, STAND[2] - 0.05];
  const cam: WCam = lookFrom(eye, [lerp(head[0], lap[0], down), lerp(head[1] - 0.08, lap[1], down), lerp(head[2], lap[2], down)], lerp(1700, 2300, down), { cy: 520, cx: 1000, t, shake: 0.1 });
  begin(ctx, env);
  shoreWorld(ctx, env, cam, "day", SHORE, { blur: 1, t });
  renderParts(ctx, [beachedBoat(ctx, env, cam)], { env, cell: 3, tol: 0.03 * cam.scale, paint: 0.4, fx: { blur: 8 } });
  const P = (p: V3) => wproj(cam, env, p);
  const expr = blendFace({ ...FACE.awe, gazeX: lerp(-0.4, 0.3, smooth(0, 0.3, n)), gazeY: 0.15, lid: 0.95 }, { ...FACE.peaceful, gazeY: -0.55, lid: 0.6 }, down);
  const peter = fig(ctx, env, cam, PETER_FIG.A, onSeat(pose), SEAT, PY, t, { expr, light: FRONT, live: 0.15 });
  const mesh = net(P, lapNet(slide, t), { width: Math.max(1, 0.0022 * cam.scale), wet: 0.2, t, seed: 31, veil: 0.1, knots: false, alpha: 1 - smooth(0.85, 1, slide) });
  renderParts(ctx, [boulder(cam, env), { ...peter, overlays: [...peter.overlays, mesh] }], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.32, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 03.4 the abandoned net
// low in the beached boat, the net in the foreground stirring; Peter steps down onto the shore,
// catches up his mantle from a rock and follows Him along the waterline, growing smaller
const s034 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const eye = onBoat(BOAT, BY, [2.2, 1.12, -0.45]);
  const cam: WCam = lookFrom(eye, [-6.5, 0.75, -1.4], 120, { cy: 520, cx: 960, t, shake: 0.08 });
  begin(ctx, env);
  shoreWorld(ctx, env, cam, "golden", SHORE, { t, mist: 0.1 });
  // Christ already far ahead on the waterline, walking away
  const far: V3 = [lerp(-11, -15, n), 0, SHORE + 0.8];
  const P = (p: V3) => wproj(cam, env, p);
  // Peter: up from the seat, three steps to the rock, stoops for the mantle, then walks on after Him
  const up = smooth(0, 0.12, n), toRock = clamp((n - 0.1) / 0.25), stoop = smooth(0.35, 0.42, n) * (1 - smooth(0.46, 0.55, n)), go = clamp((n - 0.5) / 0.5);
  const ROCK: V3 = [-1.6, 0, -0.2], after: V3 = [lerp(ROCK[0], -7.5, go), 0, lerp(ROCK[2], SHORE + 0.9, go)];
  const pos: V3 = n < 0.5 ? [lerp(SEAT[0], ROCK[0] + 0.35, easeInOut(toRock)), 0, lerp(SEAT[2], ROCK[2] + 0.3, easeInOut(toRock))] : after;
  const stride = n < 0.1 ? 0 : n < 0.35 ? 0.9 : n < 0.5 ? 0 : 1;
  const base: BodyPose = stride > 0 ? walk(t * 0.95, stride, {}) : n < 0.1 ? { bend: lerp(0.4, 0.05, up), legL: { hip: lerp(1.4, 0.2, up), knee: lerp(1.5, 0.2, up) }, legR: { hip: lerp(1.4, 0, up), knee: lerp(1.5, 0.1, up) } } : { bend: 0.9 * stoop, legL: { hip: 0.5 * stoop, knee: 0.7 * stoop }, legR: { hip: 0.3 * stoop, knee: 0.5 * stoop }, armL: { raise: 0.9 * stoop, elbow: 0.3 }, armR: { raise: 0.8 * stoop, elbow: 0.3 } };
  const yaw = n < 0.1 ? PY : n < 0.5 ? faceYaw(SEAT, ROCK) : faceYaw(pos, far);
  const peter = fig(ctx, env, cam, n < 0.46 ? PETER_FIG.A : MANTLED, grounded(PETER_FIG.A, base), pos, yaw, t, { expr: FACE.determined, light: LIGHTS.lateDay, live: 0.3, paint: 0.5 });
  const rock = wplace(cam, env, ROCK, 0.4), mantle = n < 0.44 ? [rope(P, [[ROCK[0] - 0.25, 0.42, ROCK[2]], [ROCK[0], 0.47, ROCK[2] + 0.1], [ROCK[0] + 0.25, 0.4, ROCK[2]]], { width: Math.max(4, 0.08 * rock.scale), color: "#5f6f7c", sag: -0.05 })] : [];
  shadow(ctx, env, cam, pos, 0.35, 0.3); shadow(ctx, env, cam, far, 0.35, 0.25);
  renderParts(ctx, [christ(ctx, env, cam, t, far, faceYaw(far, [far[0] - 5, 0, far[2]]), 1, LIGHTS.lateDay, 0.3)], { env, cell: 2, tol: 5, paint: 0.3, fx: { haze: [0.95, 0.88, 0.72], hazeAmt: 0.15 } });
  renderParts(ctx, [boulderParts({ x: rock.x, y: rock.y, z: rock.z, scale: rock.scale, yaw: 0, R: rock.R, light: LIGHTS.lateDay, w: 0.7, d: 0.6, h: 0.42, seed: 12 }), { ...peter, overlays: [...peter.overlays, ...mantle] }], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.5 });
  // foreground: the inside of the boat, the net piled on the thwart and spilling over the gunwale, lifting in the breeze
  const pile = wplace(cam, env, onBoat(BOAT, BY, [1.9, -0.2, 0.2]), BY);
  const gw = boatGunwale(1.6), drape = net(P, drapedNet(onBoat(BOAT, BY, [2.3, gw + 0.02, 0.9]), onBoat([0, 0, 0], BY, [-0.9, 0, 0]), onBoat([0, 0, 0], BY, [0, 0, -0.8]), 16, 12, (fu, fv) => -0.22 * Math.sin(Math.PI * fv) - 0.08 * Math.sin(fu * 7.3) * fv - 0.05 * Math.sin(t * 1.3 + fu * 4) * fv), { width: Math.max(1, 0.004 * pile.scale), t, seed: 61, veil: 0.18, knots: false });
  renderParts(ctx, [beachedBoat(ctx, env, cam, LIGHTS.lateDay), { ...netPileParts({ x: pile.x, y: pile.y, z: pile.z, scale: pile.scale, yaw: 0, R: pile.R, light: LIGHTS.lateDay, w: 0.9, d: 0.7, h: 0.3, seed: 62 }), overlays: [drape] }], { env, cell: 2, tol: 0.05 * cam.scale, paint: 0.5, fx: { blur: 2.5 } });
  motes(ctx, 81, 26, t, [0, 300, env.W, 700], { color: [1, 0.92, 0.72], size: 2, vx: -12, vy: -2, alpha: 0.35, flicker: 2 });
  finish(ctx, env, s.abs, { bloom: 0.32, vignette: 0.3, grain: 0.07, gain: [1, 0.94, 0.82], gainAmt: 0.18 });
};

register({ "03.1": s031, "03.2": s032, "03.3": s033, "03.4": s034 });
void lerp; void norm3;
