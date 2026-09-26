// CLIP 06 — THE TRANSFIGURATION. «Ήταν επίσης παρών στη Μεταμόρφωση του Κυρίου, μαζί με τον Ιάκωβο και τον Ιωάννη, βλέποντας τη θεία δόξα του Χριστού πάνω στο όρος Θαβώρ.»
import type { Env } from "../../core";
import { rng } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose } from "../figure/body";
import { PETER_FIG, CHRIST_FIG, JAMES_FIG, JOHN_FIG } from "../figure/cast";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { hillsWorld, thistles } from "../sets/galilee";
import { taborPlate, TABOR, TABOR_PATH } from "../sets/tabor";
import { ground, grassTex, trees } from "../sets/stage";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, smooth, norm3 } from "../lib/math";
import { fig, lookFrom, faceYaw, worldJoint, shadow, type Light } from "./kit";

const PETER = PETER_FIG.B;
const COLD: Light = { ...LIGHTS.predawn, key: norm3([0.5, 0.5, -0.7]), keyColor: [0.62, 0.66, 0.85], keyAmt: 0.55, fill: [0.3, 0.34, 0.48], fillAmt: 0.55, rim: norm3([0.6, 0.3, -0.7]), rimColor: [0.75, 0.78, 0.95], rimAmt: 0.6 };

// ---------------------------------------------------------------- 06.1 Tabor before dawn
// the lone dome from the plain; four specks climbing the switchbacks; wind in the grass before us
const s061 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), pl = taborPlate(env), k = 1920 / 2150, push = lerp(1, 1.06, easeInOut(n));
  begin(ctx, env);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(960, 560); ctx.scale(k * push, k * push); ctx.translate(-TABOR.peakX, -760);
  ctx.drawImage(pl.canvas as CanvasImageSource, 0, 0, TABOR.w, TABOR.h);
  // the four climbers: dark specks with a warm glint of the lead lamp? no lamp: only the pale path betrays them
  const along = (u: number) => { const L = TABOR_PATH.length - 1, i = Math.min(L - 1, Math.floor(u * L)), f2 = u * L - i, a = TABOR_PATH[i], b = TABOR_PATH[i + 1]; return [a[0] + (b[0] - a[0]) * f2, a[1] + (b[1] - a[1]) * f2]; };
  for (let i = 0; i < 4; i++) { const u = clamp(0.44 + n * 0.05 - i * 0.012), [x, y] = along(u), bob = Math.abs(Math.sin(t * 6 + i)) * 0.6; ctx.fillStyle = i === 0 ? "#cfc8c0" : "#0c0e12"; ctx.beginPath(); ctx.ellipse(x, y - 3.2 - bob, 1.3, 3.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, y - 7.2 - bob, 1.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // wind moving the grass and a branch of oak across the near foreground
  const th = thistles(env, "predawn" as never);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const sway = Math.sin(t * 1.7) * 14 + Math.sin(t * 3.1) * 6; ctx.translate(sway, 0); ctx.transform(1, 0, Math.sin(t * 1.7) * 0.05, 1, 0, 0); ctx.globalAlpha = 0.95; ctx.drawImage(th.canvas as CanvasImageSource, -300, env.H - 420, 3000, 520); ctx.restore();
  motes(ctx, 61, 20, t, [0, 0, env.W, 600], { color: [0.85, 0.88, 1], size: 1.2, vx: 20, vy: 2, alpha: 0.25, flicker: 3 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.35, grain: 0.08, gain: [0.8, 0.86, 1.05], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 06.2 three climb behind Him
// from behind and below on the path: silhouettes against the paling sky; wind whips the mantles;
// Peter labouring, John light on his feet, James steady; Christ ahead
const SL = 0.32;
const s062 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), v = 0.55, a = v * t;
  const ez = 2.0 - a * 0.9, tz = -5.8 - a, cam = lookFrom([0.6, -SL * ez + 0.45, ez], [0.1, -SL * tz + 1.3, tz], 190, { cy: 560, cx: 960, t, shake: 0.35 });
  begin(ctx, env);
  hillsWorld(ctx, env, { ...cam, pan0: cam.yaw }, "predawn", cam.focal);
  ground(ctx, env, cam, grassTex(env, "#4a4c42"), { x0: -30, x1: 30, z0: -60, z1: 8, slope: -SL, tile: [3, 3] });
  trees(ctx, env, cam, [{ at: [-4.5, SL * 6, -6] as V3, kind: "oak" as const, h: 5.5, seed: 661 }, { at: [5, SL * 9, -9] as V3, kind: "oak" as const, h: 6, seed: 662 }, { at: [-6, SL * 14, -14] as V3, kind: "oak" as const, h: 7, seed: 663 }, { at: [3.5, -SL * -1, 1] as V3, kind: "oak" as const, h: 4.5, seed: 664 }].map((q) => ({ ...q, at: [q.at[0], -SL * q.at[2], q.at[2]] as V3 })), -1, 1, 0.72);
  const climb = (fg: typeof PETER, z0: number, x: number, ph: number, labour: number) => { const z = z0 - a, pos: V3 = [x, -SL * z, z]; return fig(ctx, env, cam, fg, walk(t * 0.75 + ph, 0.8, { bend: 0.28 + labour * 0.15, neck: { pitch: -0.25 - labour * 0.1 } }), pos, Math.PI + 0.05, t, { light: COLD, live: 0.3 + labour * 0.4, paint: 0.4 }); };
  const parts: Parts[] = [climb(CHRIST_FIG, -8.2, 0.1, 0, 0), climb(JOHN_FIG, -6.3, -0.4, 0.4, 0), climb(JAMES_FIG, -5.0, 0.5, 0.7, 0.1), climb(PETER, -3.6, 0.1, 0.2, 1)];
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.4 });
  motes(ctx, 62, 40, t, [0, 0, env.W, env.H], { color: [0.8, 0.84, 0.95], size: 1.6, vx: 60, vy: 4, alpha: 0.3, flicker: 3 });
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.38, grain: 0.08, gain: [0.8, 0.86, 1.05], gainAmt: 0.25, contrast: 0.05 });
};

// ---------------------------------------------------------------- 06.3 the light
// the summit: close on Peter in the wind; the wind stops, the grass goes still; a light begins about
// Christ, off to our left, and swells to white-gold; every other light goes. Peter's eyes widen, his
// breathing slows. At last we turn with his gaze and see Him standing in it.
const s063 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), still = smooth(0.12, 0.22, n), g = smooth(0.2, 0.7, n), turn = easeInOut(clamp((n - 0.7) / 0.25));
  const P: V3 = [0.6, 0, 1.2], C: V3 = [-1.2, 0, -1.4], PY = faceYaw(P, C) + 0.25;
  const pose: BodyPose = { bend: -0.05, neck: { pitch: -0.18 * g, yaw: -0.1 }, armL: { raise: 0.15 + 0.25 * g, elbow: 0.5, out: 0.15 }, armR: { raise: 0.1 + 0.3 * g, elbow: 0.4, out: 0.2 }, handL: HANDS.open, handR: HANDS.open };
  const face = worldJoint(PETER, pose, P, PY, "face");
  const toC = [C[0] - face[0], C[2] - face[2]], tl = Math.hypot(toC[0], toC[1]), ca = Math.cos(0.55), sa = Math.sin(0.55), dx = (toC[0] * ca - toC[1] * sa) / tl, dz = (toC[0] * sa + toC[1] * ca) / tl;
  const faceCam = lookFrom([face[0] + dx * 1.5, face[1] - 0.06, face[2] + dz * 1.5], [face[0], face[1] - 0.04, face[2]], 1250, { cy: 470, cx: 900, t, shake: 0.12 * (1 - still) });
  const wide = lookFrom([P[0] + 1.3, 1.5, P[2] + 3.0], [C[0], 1.25, C[2]], 250, { cy: 520, cx: 1000, t });
  const cam: WCam = turn < 0.01 ? faceCam : { target: [lerp(faceCam.target[0], wide.target[0], turn), lerp(faceCam.target[1], wide.target[1], turn), lerp(faceCam.target[2], wide.target[2], turn)], scale: Math.exp(lerp(Math.log(faceCam.scale), Math.log(wide.scale), turn)), yaw: lerp(faceCam.yaw, wide.yaw, turn), tilt: lerp(faceCam.tilt, wide.tilt, turn), focal: Math.exp(lerp(Math.log(faceCam.focal!), Math.log(wide.focal!), turn)), cy: lerp(470, 520, turn), cx: lerp(1100, 1000, turn), t };
  begin(ctx, env);
  hillsWorld(ctx, env, { ...cam, pan0: cam.yaw }, "predawn", cam.focal, 0.7);
  // every other light goes: the world darkens toward a deep blue-black as He brightens
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = `rgba(6,8,16,${0.55 * g})`; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  ground(ctx, env, cam, grassTex(env, "#4a4c42"), { x0: -30, x1: 30, z0: -40, z1: 10, tile: [3, 3] });
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = `rgba(6,8,16,${0.45 * g})`; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  const cs = wproj(cam, env, [C[0], 1.2, C[2]]);
  // while He is still out of frame His light spills in from His side
  if (cs[0] < -100 || cs[0] > env.W + 100) glow(ctx, cs[0] < 0 ? -200 : env.W + 200, 420, 1500, [1, 0.94, 0.78], 0.6 * g);
  glow(ctx, cs[0], cs[1], 300 + 1500 * g, [1, 0.94, 0.78], 0.15 + 0.75 * g);
  // Christ: white as the light, the garments whitened
  const glory: Light = { ...LIGHTS.glory, keyAmt: 1.2 + g, fillAmt: 0.9 + g, fill: [1, 0.96, 0.86], rimAmt: 1.2 };
  const christ = fig(ctx, env, cam, { ...CHRIST_FIG, costume: { ...CHRIST_FIG.costume, tunic: "#fbf6ea", mantle: "#f2eadc" } }, { armL: { raise: 0.3 + 0.3 * g, out: 0.3, elbow: 0.3 }, armR: { raise: 0.3 + 0.3 * g, out: 0.3, elbow: 0.3 }, handL: HANDS.open, handR: HANDS.open, neck: { pitch: -0.15 } }, C, faceYaw(C, P), t, { expr: { lid: 0.7, smile: 0.1 }, light: glory, live: 0.2, paint: 0.3 });
  renderParts(ctx, [christ], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.3, fx: { tint: [1, 0.97, 0.9], tintAmt: 0.25 + 0.5 * g } });
  shaft(ctx, cs[0], cs[1], cs[0] - 700, cs[1] + 900, 60, 700, [1, 0.94, 0.8], 0.2 * g);
  // Peter: lit by Him alone (the key comes from where Christ stands), eyes widening
  const kx = C[0] - P[0], kz = C[2] - P[2], cyw = Math.cos(cam.yaw), syw = Math.sin(cam.yaw), key = norm3([kx * cyw + kz * syw, 0.35, -kx * syw + kz * cyw]);
  const plight: Light = g < 0.02 ? COLD : { ...COLD, key, keyColor: [1, 0.93, 0.78], keyAmt: lerp(0.55, 1.6, g), fill: [0.55, 0.52, 0.5], fillAmt: lerp(0.55, 0.3, g), rimAmt: 0.2 };
  const peter = fig(ctx, env, cam, PETER, pose, P, PY, t, { expr: blendFace({ ...FACE.neutral, lid: 0.8 }, { ...FACE.awe, lid: 1.0, open: 0.16, gazeX: -0.35 }, g), light: plight, live: lerp(0.5, 0.05, still) });
  renderParts(ctx, [peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  // wind: drifting seeds until it stops
  motes(ctx, 63, 40, t, [0, 0, env.W, env.H], { color: [0.85, 0.88, 1], size: 1.6, vx: 80 * (1 - still), vy: 3, alpha: 0.35 * (1 - still), flicker: 3 });
  motes(ctx, 64, 50, t, [cs[0] - 600, cs[1] - 500, cs[0] + 600, cs[1] + 500], { color: [1, 0.95, 0.8], size: 2, vx: 0, vy: -6, alpha: 0.5 * g, flicker: 1.5 });
  finish(ctx, env, s.abs, { bloom: 0.3 + 0.4 * g, vignette: 0.4, grain: 0.08, gain: [lerp(0.8, 1.05, g), lerp(0.86, 1.0, g), lerp(1.05, 0.9, g)], gainAmt: 0.25 });
};

register({ "06.1": s061, "06.2": s062, "06.3": s063 });
void rng; void shadow; void grounded;
