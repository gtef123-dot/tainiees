// CLIP 01 — THE APOSTLE. «Ο Άγιος Πέτρος ήταν ένας από τους δώδεκα μαθητές του Χριστού και ένας από τους κορυφαίους Αποστόλους.»
import type { Env } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, liveFace, livePose, finish } from "../scene";
import { renderParts } from "../figure/head";
import { figureParts, joints, walk, type BodyPose, type Figure } from "../figure/body";
import { PETER_FIG, CHRIST_FIG, ANDREW_FIG, JAMES_FIG, JOHN_FIG, THOMAS_FIG, PHILIP_FIG } from "../figure/cast";
import { HANDS, LIGHTS, FACE } from "../figure/acting";
import { boatParts, boatGunwale } from "../paint/props";
import { rope, net, hangingNet } from "../paint/cord";
import { lakeWorld } from "../sets/lake";
import { hillsWorld, ridgeTop, thistles } from "../sets/galilee";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, smooth, norm3, add3 } from "../lib/math";

// ---------------------------------------------------------------- 01.1 the hand and the rope
const s011 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), light = LIGHTS.goldenMorning;
  // Simon stands on the boat's floor near the port gunwale, facing out, hauling the net in hand over hand
  const F: V3 = [-0.6, -0.3, 0.52], period = 1.9, ph = (t / period) % 1, cyc = Math.sin(ph * Math.PI * 2);
  const reach = (k: number) => [lerp(0.08, -0.05, k), lerp(0.98, 1.3, k), lerp(0.52, 0.22, k)] as V3;
  const kl = 0.5 + 0.5 * cyc, kr = 0.5 - 0.5 * cyc;
  const pose: BodyPose = { bend: 0.34 - 0.12 * Math.abs(cyc), twist: 0.08 * cyc, neck: { pitch: 0.35, yaw: -0.05 * cyc },
    armL: { target: add3(reach(kl), [0.1, 0, 0]), pole: [0.6, -0.4, -0.5] }, armR: { target: add3(reach(kr), [-0.1, 0, 0]), pole: [-0.6, -0.4, -0.5] }, handL: HANDS.grip, handR: HANDS.grip };
  const live = livePose(pose, t, 17, 0.4), J = joints(PETER_FIG.A, live);
  const handL = add3(F, J.handL), handR = add3(F, J.handR);
  // the camera starts on the hand and rises and pulls back until the whole man and boat are seen
  const u = easeInOut(clamp((n - 0.1) / 0.85)), lg = (a: number, b: number) => Math.exp(lerp(Math.log(a), Math.log(b), u));
  const low = handR[1] < handL[1] ? handR : handL;
  const mid = Math.sin(Math.PI * u);
  const cam: WCam = { target: [lerp(low[0], -0.55, u), lerp(low[1] - 0.05, 0.62, u), lerp(low[2] + 0.05, 0.55, u)], scale: lg(1900, 175), yaw: lerp(0.18, 0.32, u), tilt: lerp(-0.34, 0.13, u), cy: 520 + 150 * mid, cx: 1010 - 50 * u, t, shake: 0.15, pan0: 0.25 };
  begin(ctx, env);
  lakeWorld(ctx, env, cam, "morning", { blur: clamp((cam.scale - 380) / 1100), mist: lerp(0.15, 0.32, u), t });
  const P = (p: V3) => wproj(cam, env, p);
  const rock = Math.sin(t * 1.05) * 0.025, bp = wplace(cam, env, [0, 0, 0], 0, { roll: rock });
  const boat = boatParts({ x: bp.x, y: bp.y, scale: bp.scale, yaw: 0, R: bp.R, z: bp.z, light, seed: 3, sail: "none" });
  const fp = wplace(cam, env, F, 0, { roll: rock * 0.5 });
  const simon = figureParts(ctx, PETER_FIG.A, live, { x: fp.x, y: fp.y, z: fp.z, scale: fp.scale, yaw: 0, R: fp.R, light, t, expr: liveFace(FACE.determined, t, 17, 0.5) });
  // the rope: out of the water, over the gunwale, through both fists, down to its coil
  const G: V3 = [-0.55, boatGunwale(-0.55) + 0.03, 1.13], W: V3 = [-0.4, -0.05, 2.4], C: V3 = [-1.0, -0.22, 0.25];
  const top = handL[1] > handR[1] ? handL : handR;
  const rw = Math.max(1.2, 0.022 * cam.scale);
  const line = rope(P, [W, G, low, top, C], { width: rw, sag: 0.03, wet: 0.8, t: t * 0.6, drip: 0.35, seed: 5 });
  const hn = net(P, hangingNet(add3(G, [-0.35, -0.02, 0.05]), add3(G, [0.35, -0.02, 0.1]), 0.75, 9, 7, t, 0.03).map((row) => row.map((q, j) => [q[0], q[1], q[2] + 0.05 + 0.25 * (q[1] < G[1] - 0.2 ? 1 : 0) * (j / 9)] as V3)), { width: Math.max(0.7, 0.0045 * cam.scale), wet: 1, t, seed: 9, color: "#5a4632" });
  const waterY = P([0, 0, 1.15])[1];
  renderParts(ctx, [boat, { ...simon, overlays: [...simon.overlays, line, hn] }], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.68, fx: { waterY, reflect: t } });
  // water streaming from the knots, light in the drops
  motes(ctx, 11, 40, t, [P(G)[0] - 0.4 * cam.scale, P(G)[1], P(G)[0] + 0.4 * cam.scale, P(G)[1] + 0.9 * cam.scale], { color: [0.95, 0.93, 0.86], size: Math.max(0.8, cam.scale * 0.002), vx: 0, vy: 0.9 * cam.scale, alpha: 0.5 });
  glow(ctx, env.W * 0.28, env.H * 0.46, env.W * 0.5, [1, 0.86, 0.58], 0.18);
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.3, grain: 0.07, gain: [1, 0.95, 0.85], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 01.2 hero: behind Christ
const WALKERS: [Figure, number, number, number][] = [[CHRIST_FIG, 2.1, 0.05, 0.0], [PETER_FIG.B, 0.95, 0.38, 0.35], [JOHN_FIG, -0.3, -0.25, 0.6], [ANDREW_FIG, -1.45, 0.3, 0.15], [JAMES_FIG, -2.6, -0.2, 0.8], [THOMAS_FIG, -3.8, 0.25, 0.45], [PHILIP_FIG, -5.0, -0.1, 0.9]];
const s012 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), speed = 1.05;
  const light = { ...LIGHTS.lateAfternoon, key: norm3([-0.35, 0.45, -0.82]), keyAmt: 0.95, fill: [0.5, 0.52, 0.62] as [number, number, number], fillAmt: 0.42, rim: norm3([-0.5, 0.35, -0.8]), rimColor: [1, 0.86, 0.58] as [number, number, number], rimAmt: 1.1 };
  const cam: WCam = { target: [0.2 + speed * 0.85 * t, 1.15, 0], scale: 250, yaw: 0.62, tilt: -0.045, cy: 470, t, shake: 0.12 };
  begin(ctx, env);
  const hy = hillsWorld(ctx, env, cam, "backlit");
  const tx = cam.target[0] * cam.scale;
  const rt = ridgeTop(env, "backlit");
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.drawImage(rt.canvas as CanvasImageSource, -440 - ((tx * 0.9) % 400), 690, 2800, 500); ctx.restore();
  // the walkers, back to front, each on their own step
  const parts = WALKERS.map(([fig, x0, z, off]) => {
    const pos: V3 = [x0 + speed * t, 0, z], pose = walk(t * 0.92 + off, 1, { neck: { pitch: 0.02 } }), live = livePose(pose, t, fig.id.seed, 0.4);
    const wp = wplace(cam, env, pos, Math.PI / 2 - 0.25);
    return figureParts(ctx, fig, live, { x: wp.x, y: wp.y, z: wp.z, scale: wp.scale, yaw: 0, R: wp.R, light, t, expr: liveFace(fig === CHRIST_FIG ? { lid: 0.7 } : fig === PETER_FIG.B ? FACE.awe : {}, t, fig.id.seed, 0.6) });
  });
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.55 });
  // the sun clears the ridge: the flare grows, dust lights up, long light across the figures
  const sunX = 900 - cam.yaw * 1000 + 0 - 180 * n, sunY = hy - 130, fl = smooth(0.15, 0.85, n);
  shaft(ctx, sunX, sunY, sunX + 900, sunY + 700, 30, 380, [1, 0.88, 0.62], 0.16 * fl);
  motes(ctx, 21, 90, t, [0, 300, env.W, 900], { color: [1, 0.9, 0.65], size: 1.6, vx: 8, vy: -4, alpha: 0.45 * fl, flicker: 2 });
  glow(ctx, sunX, sunY, 900 * (0.4 + fl), [1, 0.9, 0.66], 0.55 * fl);
  glow(ctx, sunX, sunY, 120, [1, 0.97, 0.88], 0.9 * fl);
  const th = thistles(env, "backlit");
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 0.95; ctx.drawImage(th.canvas as CanvasImageSource, -((tx * 1.6) % 1000) - 100, env.H - 500, 3200, 600); ctx.restore();
  // flare fills the frame at the end: the cut lands on the lake's glitter
  const out = smooth(0.85, 1, n);
  finish(ctx, env, s.abs, { bloom: 0.38, vignette: 0.26, grain: 0.07, gain: [1, 0.94, 0.82], gainAmt: 0.2, fade: [1, 0.95, 0.82], fadeAmt: out * 0.85 });
};

register({ "01.1": s011, "01.2": s012 });
