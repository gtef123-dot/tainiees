// CLIP 12 — THE FEAST. «Η Εκκλησία τιμά τη μνήμη του στις 29 Ιουνίου, μαζί με τον Απόστολο Παύλο.»
// Out of the white: warm painted light, candles, the grain of parchment, a shaft of June sun; Peter
// still and icon-like on a gold ground, the date lettered quietly; then Paul, and the two embrace.
import type { Env } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, finish } from "../scene";
import { renderParts } from "../figure/head";
import { type BodyPose } from "../figure/body";
import { PETER_FIG, PAUL_FIG } from "../figure/cast";
import { HANDS, LIGHTS, FACE } from "../figure/acting";
import { flame } from "../paint/props";
import { card, ground, goldTex, parchmentTex, boardTex } from "../sets/stage";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, smooth } from "../lib/math";
import { fig, lookFrom, worldJoint, dirView, toLocal, type Light } from "./kit";

const PE = PETER_FIG.E, PP: V3 = [-0.28, 0, 0], PL: V3 = [0.28, 0, 0];
const CANDLES: V3[] = [[-1.1, 0.95, 1.1], [-0.9, 1.1, 1.25], [1.0, 1.0, 1.15], [1.15, 0.9, 1.3]];
const warmLight = (cam: WCam): Light => ({ ...LIGHTS.candle, key: dirView(cam, [-0.5, 0.45, 0.75]), keyAmt: 1.05, fillAmt: 0.55, rim: dirView(cam, [0.6, 0.4, -0.6]), rimColor: [1, 0.9, 0.7], rimAmt: 0.55 });
// the iconographic nimbus: a thin double gold ring behind the head
const nimbus = (ctx: Ctx2, env: Env, cam: WCam, head: V3, a: number) => { const q = wproj(cam, env, [head[0], head[1] + 0.02, head[2] - 0.12]), r = 0.2 * wplace(cam, env, head, 0).scale; ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = a; const g = ctx.createRadialGradient(q[0], q[1], r * 0.7, q[0], q[1], r); g.addColorStop(0, "rgba(240,205,120,0)"); g.addColorStop(0.8, "rgba(240,205,120,0.35)"); g.addColorStop(1, "rgba(200,150,70,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(170,120,50,0.8)"; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
const tableau = (ctx: Ctx2, env: Env, cam: WCam, t: number) => {
  begin(ctx, env, "#2a1c10");
  card(ctx, env, cam, goldTex(env), { at: [0, -0.5, -1.2], w: 6, h: 3.5, cols: 4 });
  ground(ctx, env, cam, boardTex(env, "#4a3020"), { x0: -4, x1: 4, z0: -1.2, z1: 3, tile: [3, 3] });
  // the June sun through a small window, high on the left
  shaft(ctx, 200, -80, 900, 1100, 60, 520, [1, 0.88, 0.6], 0.22);
};
const candles = (ctx: Ctx2, env: Env, cam: WCam, t: number) => { for (const [i, p] of CANDLES.entries()) { const q = wproj(cam, env, p), sc = wplace(cam, env, p, 0).scale; ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#e8dcc0"; ctx.fillRect(q[0] - 0.018 * sc, q[1], 0.036 * sc, 0.5 * sc); ctx.restore(); glow(ctx, q[0], q[1] - 0.03 * sc, 0.5 * sc, [1, 0.72, 0.35], 0.45); ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); flame(ctx, q[0], q[1], 0.07 * sc, t, 1300 + i, { n: 2 }); ctx.restore(); } };
const grain = (ctx: Ctx2, env: Env, amt: number) => { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgba(236,220,188,${amt})`; ctx.fillRect(0, 0, env.W, env.H); ctx.restore(); };

// ---------------------------------------------------------------- 12.1 29 June
const s121 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), clear = smooth(0, 0.3, n), letter = smooth(0.35, 0.6, n);
  const pose: BodyPose = { armR: { raise: 0.75, out: 0.1, elbow: 1.6, twist: 0.3 }, handR: HANDS.offer, armL: { raise: 0.45, elbow: 1.5 }, handL: HANDS.grip, neck: { pitch: 0.04 } };
  const face = worldJoint(PE, pose, [0, 0, 0], 0, "face");
  const cam = lookFrom([0, face[1] - 0.15, 3.1], [0, face[1] - 0.45, 0], lerp(560, 600, n), { cy: 520, cx: 960, t });
  tableau(ctx, env, cam, t);
  nimbus(ctx, env, cam, face, 1);
  renderParts(ctx, [fig(ctx, env, cam, PE, pose, [0, 0, 0], 0, t, { expr: { ...FACE.peaceful, lid: 0.8 }, light: warmLight(cam), live: 0.1 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  candles(ctx, env, cam, t);
  // the date, lettered on a strip of parchment at the foot of the image
  if (letter > 0) { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = letter; ctx.drawImage(parchmentTex(env, "29 Ιουνίου").canvas as CanvasImageSource, 560, 900, 800, 126); ctx.restore(); }
  grain(ctx, env, 0.25);
  motes(ctx, 1310, 40, t, [200, 0, 1100, 1080], { color: [1, 0.9, 0.65], size: 1.8, vx: 4, vy: 6, alpha: 0.4, flicker: 1.5 });
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.35, grain: 0.07, gain: [1, 0.9, 0.74], gainAmt: 0.22, fade: [1, 0.99, 0.96], fadeAmt: 1 - clear });
};

// ---------------------------------------------------------------- 12.2 Peter and Paul
// the pull-back: Paul is beside him; the two apostles embrace, cheek to cheek, the old Byzantine image
const s122 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), back = easeInOut(clamp(n / 0.7)), hug = smooth(0.1, 0.55, n);
  const yP = lerp(0, Math.PI / 2 - 0.35, hug), yL = lerp(0, -Math.PI / 2 + 0.35, hug);
  const pP: V3 = [lerp(-0.55, PP[0], hug), 0, 0], pL: V3 = [lerp(0.55, PL[0], hug), 0, 0];
  const backP = [lerp(pL[0], pL[0] - 0.05, hug), 1.38, pL[2] - 0.12] as V3, backL = [lerp(pP[0], pP[0] + 0.05, hug), 1.38, pP[2] - 0.12] as V3;
  const peterPose: BodyPose = { bend: 0.1 * hug, armR: hug > 0.3 ? { target: toLocal(pP, yP, backP), pole: [-0.5, -0.4, 0.3] } : { raise: 0.3, elbow: 0.6 }, armL: hug > 0.3 ? { target: toLocal(pP, yP, [backP[0], 1.15, backP[2] + 0.1]), pole: [0.5, -0.5, 0.3] } : { raise: 0.3, elbow: 0.6 }, handR: HANDS.open, handL: HANDS.open, neck: { yaw: -0.25 * hug, pitch: 0.05 } };
  const paulPose: BodyPose = { bend: 0.1 * hug, armL: hug > 0.3 ? { target: toLocal(pL, yL, backL), pole: [0.5, -0.4, 0.3] } : { raise: 0.3, elbow: 0.6 }, armR: hug > 0.3 ? { target: toLocal(pL, yL, [backL[0], 1.15, backL[2] + 0.1]), pole: [-0.5, -0.5, 0.3] } : { raise: 0.3, elbow: 0.6 }, handR: HANDS.open, handL: HANDS.open, neck: { yaw: 0.25 * hug, pitch: 0.05 } };
  const cam = lookFrom([0, lerp(1.4, 1.3, back), lerp(3.1, 4.6, back)], [0, lerp(1.1, 0.95, back), 0], Math.exp(lerp(Math.log(600), Math.log(300), back)), { cy: 520, cx: 960, t });
  tableau(ctx, env, cam, t);
  nimbus(ctx, env, cam, worldJoint(PE, peterPose, pP, yP, "face"), 1); nimbus(ctx, env, cam, worldJoint(PAUL_FIG, paulPose, pL, yL, "face"), smooth(0.05, 0.3, n));
  const L = warmLight(cam);
  renderParts(ctx, [fig(ctx, env, cam, PE, peterPose, pP, yP, t, { expr: { ...FACE.peaceful, lid: 0.7, smile: 0.15 }, light: L, live: 0.1 }), fig(ctx, env, cam, PAUL_FIG, paulPose, pL, yL, t, { expr: { ...FACE.peaceful, lid: 0.7, smile: 0.12 }, light: L, live: 0.1 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  candles(ctx, env, cam, t);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 1 - smooth(0.2, 0.5, n); ctx.drawImage(parchmentTex(env, "29 Ιουνίου").canvas as CanvasImageSource, 560, 900, 800, 126); ctx.restore();
  grain(ctx, env, 0.25);
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.35, grain: 0.07, gain: [1, 0.9, 0.74], gainAmt: 0.22 });
};

register({ "12.1": s121, "12.2": s122 });
