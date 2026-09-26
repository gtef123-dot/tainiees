// CLIP 07 — THE DENIAL. «Όμως ο Πέτρος γνώρισε και τη δική του μεγάλη πτώση. Τη νύχτα που συνέλαβαν τον Χριστό, φοβήθηκε και Τον αρνήθηκε τρεις φορές. Όταν κατάλαβε τι είχε κάνει, έκλαψε πικρά.»
// The high priest's courtyard at night. World: back wall with the gallery at z = -7 (Christ is held
// there, between guards); the gate in the left wall (x = -7); the charcoal brazier in the middle.
import type { Env } from "../../core";
import { rng } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose, type Figure } from "../figure/body";
import { PETER_FIG, CHRIST_FIG } from "../figure/cast";
import { extra } from "../figure/extras";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { brazier, torch, oilLamp, flame } from "../paint/props";
import { ground, card, flagTex, earthTex, courtTex } from "../sets/stage";
import { glow, motes } from "../paint/camera";
import { type V3, type RGB, lerp, clamp, easeInOut, easeOut, smooth, norm3, mix } from "../lib/math";
import { fig, lookFrom, faceYaw, worldJoint, shadow, keyFrom, dirView, type Light } from "./kit";

const PETER = PETER_FIG.C, B: V3 = [0.3, 0, -0.5], FIRE: V3 = [0.3, 0.85, -0.5], MOON: V3 = [0.45, 0.8, -0.4];
const at = (a: number, r = 0.95): V3 => [B[0] + Math.sin(a) * r, 0, B[2] + Math.cos(a) * r];
const GIRL = extra(701, "woman"), MAN = extra(702, "man"), EXTRAS: [Figure, number][] = [[extra(703, "man"), 2.2], [extra(704, "elder"), 2.9], [extra(705, "man"), 3.7], [extra(706, "man"), -1.9], [MAN, -2.6]];
const GUARD = (seed: number): Figure => { const f = extra(seed, "man"); return { ...f, costume: { ...f.costume, tunic: "#5a3a30", mantle: "#3a3430", mantleLen: 0.5 } }; };
const G1 = GUARD(711), G2 = GUARD(712), GALLERY_Y = 3.2, CHR: V3 = [2.8, GALLERY_Y, -6.4], TORCHES: V3[] = [[1.3, GALLERY_Y + 1.9, -6.95], [4.3, GALLERY_Y + 1.9, -6.95], [-6.9, 2.4, -1.2]];
// fire-lit from the coals (low, warm), rim of the moon (cold); warmth: 1 = full firelight, 0 = drained
const fireLight = (cam: WCam, p: V3, warmth = 1, extraKey?: { pos: V3; amt: number }): Light => {
  const k = keyFrom(cam, [p[0], 1.3, p[2]], extraKey && extraKey.amt > 0.5 ? extraKey.pos : FIRE), kc: RGB = mix([0.55, 0.62, 0.85], [1, 0.58, 0.28], warmth);
  return { ...LIGHTS.torchNight, key: k, keyColor: kc, keyAmt: lerp(0.5, 1.15, warmth) + (extraKey?.amt ?? 0) * 0.5, fill: [0.12, 0.15, 0.28], fillAmt: 0.45, bounce: [0.4, 0.2, 0.1], bounceAmt: 0.3 * warmth, rim: dirView(cam, [-MOON[0], MOON[1], -MOON[2]]), rimColor: [0.5, 0.62, 0.95], rimAmt: 0.55 };
};
// the courtyard: floor, walls, a night wash over the stone only (the figures carry their own light)
const courtyard = (ctx: Ctx2, env: Env, cam: WCam, t: number, wash = 0.72) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const g = ctx.createLinearGradient(0, 0, 0, env.H); g.addColorStop(0, "#070a14"); g.addColorStop(1, "#141a2a"); ctx.fillStyle = g; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  ground(ctx, env, cam, flagTex(env, "#77736c"), { x0: -7, x1: 7, z0: -7, z1: 8, tile: [4, 4] });
  card(ctx, env, cam, courtTex(env, "gallery"), { at: [0, 0, -7], w: 16, h: 7.5, cols: 8 });
  card(ctx, env, cam, courtTex(env, "gate"), { at: [-7, 0, 0], w: 14, h: 6, yaw: Math.PI / 2, cols: 8 });
  card(ctx, env, cam, courtTex(env, "gate"), { at: [7, 0, 0], w: 14, h: 6, yaw: -Math.PI / 2, cols: 8, u0: 1, u1: 0.001 });
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgba(${Math.round(255 * (1 - wash * 0.8))},${Math.round(255 * (1 - wash * 0.72))},${Math.round(255 * (1 - wash * 0.5))},1)`; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  // torchlight on the stone: warm pools that breathe
  for (const [i, p] of TORCHES.entries()) { const s = wproj(cam, env, p), sc = wplace(cam, env, p, 0).scale; if (s[2] / cam.scale > (cam.focal ?? 1e9) / cam.scale * 0.9) continue; glow(ctx, s[0], s[1] + 0.6 * sc, 2.4 * sc, [1, 0.62, 0.3], 0.35 + 0.08 * Math.sin(t * 9 + i * 2)); }
};
const torches = (ctx: Ctx2, env: Env, cam: WCam, t: number) => { for (const [i, p] of TORCHES.entries()) { const s = wproj(cam, env, p), sc = wplace(cam, env, p, 0).scale; if (s[2] / cam.scale > (cam.focal ?? 1e9) / cam.scale * 0.9) continue; torch(ctx, s[0], s[1], 0.45 * sc, t, 30 + i, 0.15); glow(ctx, s[0], s[1] - 0.1 * sc, 0.8 * sc, [1, 0.7, 0.35], 0.5); } };
const fire = (ctx: Ctx2, env: Env, cam: WCam, t: number, blur = 0) => { const s = wproj(cam, env, [B[0], 0, B[2]]), sc = wplace(cam, env, B, 0).scale; glow(ctx, s[0], s[1] - 0.5 * sc, Math.min(900, 1.3 * sc), [1, 0.55, 0.22], 0.4); brazier(ctx, s[0], s[1], 0.8 * sc, t, 71, { flames: 0.45 }); motes(ctx, 79, 14, t, [s[0] - 0.25 * sc, s[1] - 2.2 * sc, s[0] + 0.25 * sc, s[1] - 0.6 * sc], { color: [1, 0.62, 0.25], size: Math.max(1.2, 0.006 * sc), vx: 0, vy: -0.5 * sc, alpha: 0.8, flicker: 3 }); if (blur > 0) glow(ctx, s[0], s[1] - 0.6 * sc, Math.min(500, 0.6 * sc), [1, 0.7, 0.35], 0.3 * blur); };
// Christ on the gallery between the guards: bound, standing; He turns His head toward Peter when `turn`
const gallery = (ctx: Ctx2, env: Env, cam: WCam, t: number, turn: number, warm = 1): Parts[] => {
  const L = (p: V3): Light => ({ ...LIGHTS.torchNight, key: keyFrom(cam, [p[0], p[1] + 1.3, p[2]], TORCHES[p[0] < 2.8 ? 0 : 1]), keyColor: mix([0.6, 0.66, 0.85], [1, 0.62, 0.32], warm), keyAmt: 0.95, fillAmt: 0.35, rim: dirView(cam, [-MOON[0], MOON[1], -MOON[2]]), rimColor: [0.5, 0.62, 0.95], rimAmt: 0.4 });
  const bound: BodyPose = { armL: { target: [0.06, 0.95, 0.22], pole: [0.6, -0.4, -0.5] }, armR: { target: [-0.06, 0.95, 0.22], pole: [-0.6, -0.4, -0.5] }, handL: HANDS.bound, handR: HANDS.bound, neck: { yaw: lerp(-0.7, 0.35, turn), pitch: lerp(0.25, 0.12, turn) } };
  return [fig(ctx, env, cam, CHRIST_FIG, bound, CHR, 0.25, t, { expr: { lid: 0.72, gazeX: lerp(-0.3, 0.1, turn) }, light: L(CHR), live: 0.15, paint: 0.45 }),
    fig(ctx, env, cam, G1, { neck: { yaw: 0.3 } }, [CHR[0] - 0.95, GALLERY_Y, CHR[2] + 0.1], 0.5, t, { light: L([CHR[0] - 0.95, GALLERY_Y, CHR[2]]), live: 0.3, paint: 0.35 }),
    fig(ctx, env, cam, G2, { neck: { yaw: -0.3 }, armR: { raise: 0.2, elbow: 1.2 } }, [CHR[0] + 0.95, GALLERY_Y, CHR[2] + 0.1], -0.2, t, { light: L([CHR[0] + 0.95, GALLERY_Y, CHR[2]]), live: 0.3, paint: 0.35 })];
};
// (anyone standing between the lens and the fire is left out: angles within `clear` of the camera's side)
const warmers = (ctx: Ctx2, env: Env, cam: WCam, t: number, skip: Figure[] = [], warmth = 1, clear = 0): Parts[] => { const ca = Math.atan2(cam.target[0] - Math.sin(cam.yaw) * (cam.focal ?? 0) / cam.scale - B[0], cam.target[2] + Math.cos(cam.yaw) * (cam.focal ?? 0) / cam.scale - B[2]); return EXTRAS.filter(([f, a]) => !skip.includes(f) && (clear === 0 || Math.abs(Math.atan2(Math.sin(a - ca), Math.cos(a - ca))) > clear)).map(([f, a], i) => { const p = at(a, 0.95 + (i % 2) * 0.12); return fig(ctx, env, cam, f, { armL: { target: [0.12, 0.95, 0.42], pole: [0.6, -0.5, -0.4] }, armR: { target: [-0.12, 0.93, 0.42], pole: [-0.6, -0.5, -0.4] }, handL: HANDS.open, handR: HANDS.open, bend: 0.12, neck: { yaw: 0.3 * Math.sin(t * 0.7 + i * 2), pitch: 0.2 } }, p, faceYaw(p, B), t, { light: fireLight(cam, p, warmth), live: 0.35, paint: 0.4 }); }); };

// ---------------------------------------------------------------- 07.1 the courtyard
// black; a torch passes close across the lens and its light reveals the courtyard from a high corner:
// servants and guards round the brazier, and up on the gallery the bound Christ
const s071 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), T = t - s.start / 30, pass = clamp(T / 1.3), reveal = smooth(0.08, 0.45, n);
  const cam = lookFrom([5.6, 4.4, 6.2], [lerp(-0.2, 0.3, n), 1.2, -2.6], 165, { cy: 520, cx: 960, t, shake: 0.1 });
  begin(ctx, env);
  courtyard(ctx, env, cam, t);
  const pp = at(0.55, 1.05), parts: Parts[] = [...warmers(ctx, env, cam, t), fig(ctx, env, cam, PETER, { armL: { target: [0.12, 0.95, 0.42], pole: [0.6, -0.5, -0.4] }, armR: { target: [-0.12, 0.93, 0.42], pole: [-0.6, -0.5, -0.4] }, handL: HANDS.open, handR: HANDS.open, bend: 0.15, neck: { pitch: 0.35 } }, pp, faceYaw(pp, B), t, { light: fireLight(cam, pp), live: 0.3, paint: 0.4 }), fig(ctx, env, cam, GIRL, { armR: { raise: 0.3, elbow: 1.4 }, neck: { yaw: 0.4 } }, at(-0.7, 1.4), faceYaw(at(-0.7, 1.4), B) + 0.6, t, { light: fireLight(cam, at(-0.7, 1.4)), live: 0.3, paint: 0.4 })];
  renderParts(ctx, [...gallery(ctx, env, cam, t, 0)], { env, cell: 2, tol: 0.05 * cam.scale, paint: 0.4 });
  torches(ctx, env, cam, t);
  const far = parts.filter((p) => (p.tris[0]?.z ?? 0) < wproj(cam, env, B)[2]), near = parts.filter((p) => !far.includes(p));
  renderParts(ctx, far, { env, cell: 2, tol: 0.05 * cam.scale, paint: 0.4 }); fire(ctx, env, cam, t); renderParts(ctx, near, { env, cell: 2, tol: 0.05 * cam.scale, paint: 0.4 });
  // the dark, pushed back by the passing torch
  const tx = lerp(env.W + 300, -400, easeInOut(pass)), ty = 700 - 180 * Math.sin(Math.PI * pass);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const dg = ctx.createRadialGradient(tx, ty, 100, tx, ty, 900 + 3000 * reveal); dg.addColorStop(0, "rgba(0,0,0,0)"); dg.addColorStop(0.5, `rgba(0,0,0,${0.85 * (1 - reveal)})`); dg.addColorStop(1, `rgba(0,0,0,${1 - reveal})`); ctx.fillStyle = dg; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  if (pass < 1) { glow(ctx, tx, ty, 900, [1, 0.6, 0.25], 0.8); flame(ctx, tx, ty + 150, 520, t, 77, { n: 7, alpha: 0.9 }); }
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.45, grain: 0.09, gain: [0.9, 0.92, 1.05], gainAmt: 0.15 });
};

// ---------------------------------------------------------------- 07.2 at the fire
// MCU across the coals: Peter edges in among strangers, holds out his hands to the fire, elbows in, eyes
// down. Lit from below by the fire, the moon's cold rim on his shoulder. (07.8 mirrors this at dawn.)
const s072 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), inn = easeOut(clamp(n / 0.45)), hands = smooth(0.3, 0.55, n);
  const P0 = at(0.55, 1.7), P1 = at(0.55, 1.02), pp: V3 = [lerp(P0[0], P1[0], inn), 0, lerp(P0[2], P1[2], inn)];
  const pose: BodyPose = { ...(inn < 0.98 ? walk(t * 0.8, 0.5, {}) : {}), bend: 0.15 * hands, armL: hands > 0.05 ? { target: [0.13, lerp(0.8, 0.98, hands), lerp(0.2, 0.42, hands)], pole: [0.5, -0.6, -0.2] } : { raise: 0.1, elbow: 0.3 }, armR: hands > 0.05 ? { target: [-0.13, lerp(0.78, 0.96, hands), lerp(0.2, 0.42, hands)], pole: [-0.5, -0.6, -0.2] } : { raise: 0.1, elbow: 0.3 }, handL: HANDS.open, handR: HANDS.open, neck: { pitch: 0.38, yaw: -0.1 } };
  const face = worldJoint(PETER, pose, P1, faceYaw(P1, B), "face");
  const eye: V3 = [B[0] + (B[0] - P1[0]) * 1.4, 1.28, B[2] + (B[2] - P1[2]) * 1.4];
  const cam = lookFrom(eye, [face[0], face[1] - 0.14, face[2]], 1300, { cy: 500, cx: 980, t, shake: 0.08 });
  begin(ctx, env);
  courtyard(ctx, env, cam, t, 0.8);
  torches(ctx, env, cam, t);
  const parts = [...warmers(ctx, env, cam, t, [], 1, 0.9), fig(ctx, env, cam, PETER, pose, pp, faceYaw(pp, B), t, { expr: { ...FACE.frightened, lid: 0.5, gazeY: -0.55, browIn: 0.6 }, light: fireLight(cam, pp), live: 0.3 })];
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.55 });
  fire(ctx, env, cam, t, 1);
  motes(ctx, 72, 30, t, [600, 500, 1400, 1080], { color: [1, 0.6, 0.25], size: 2, vx: 0, vy: -90, alpha: 0.7, flicker: 3 });
  finish(ctx, env, s.abs, { bloom: 0.4, vignette: 0.45, grain: 0.09, gain: [1, 0.9, 0.85], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 07.3 three denials
// one unbroken shot tightening from MS to a tight CU: the girl lifts her lamp to his face (a quick
// answer, a small shake of the head); a man points (a harder denial); a third voice (vehement, the
// face breaking up). Each time the warmth drains out of the light.
const s073 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), push = easeInOut(n), d1 = smooth(0.08, 0.18, n), d2 = smooth(0.4, 0.5, n), d3 = smooth(0.7, 0.8, n), warmth = 1 - 0.3 * d1 - 0.3 * d2 - 0.35 * d3;
  const P1 = at(0.55, 1.02), PY = faceYaw(P1, B);
  const shake = 0.18 * Math.sin(t * 18) * (Math.exp(-(((n - 0.2) / 0.04) ** 2)) * 0.6 + Math.exp(-(((n - 0.52) / 0.05) ** 2)) * 1.0 + Math.exp(-(((n - 0.83) / 0.06) ** 2)) * 1.5);
  const pose: BodyPose = { bend: 0.1, twist: -0.1 * d1, armL: { raise: 0.2, elbow: 0.6 + 0.4 * d2 }, armR: { raise: 0.15 + 0.15 * d3, elbow: 0.8 + 0.3 * d3, out: 0.2 }, handR: d3 > 0.5 ? HANDS.defensive : HANDS.relaxed, neck: { yaw: -0.45 * d1 + shake, pitch: 0.05 - 0.1 * d2 } };
  const face = worldJoint(PETER, pose, P1, PY, "face");
  const eye: V3 = [face[0] - 1.1, face[1] - 0.05, face[2] - 1.9];
  const cam = lookFrom([lerp(eye[0], face[0] - 0.45, push), face[1] - 0.04, lerp(eye[2], face[2] - 0.75, push)], [face[0], face[1] - lerp(0.25, 0.03, push), face[2]], lerp(520, 2100, push), { cy: 500, cx: lerp(960, 1000, push), t, shake: 0.08 + 0.1 * d3 });
  begin(ctx, env);
  courtyard(ctx, env, cam, t, 0.8);
  torches(ctx, env, cam, t);
  // the girl and her lamp, lifted toward his face
  const GP = at(-0.2, 1.25), lampUp = d1 * (1 - smooth(0.4, 0.55, n)), lampPos: V3 = [lerp(GP[0], face[0] - 0.35, lampUp * 0.6), lerp(1.0, face[1] - 0.05, lampUp), lerp(GP[2], face[2] - 0.3, lampUp * 0.6)];
  const girl = fig(ctx, env, cam, GIRL, { armR: { target: [lampUp * 0.2 - 0.1, lerp(1.0, 1.35, lampUp), lerp(0.25, 0.55, lampUp)], pole: [-0.5, -0.6, -0.3] }, handR: HANDS.grip, neck: { yaw: 0.2, pitch: -0.1 } }, GP, faceYaw(GP, P1), t, { expr: { ...FACE.confident, gazeX: 0.2 }, light: fireLight(cam, GP, warmth, { pos: lampPos, amt: lampUp }), live: 0.3, paint: 0.45 });
  const MP = at(-1.4, 1.2), point = d2 * (1 - smooth(0.65, 0.75, n));
  const man = fig(ctx, env, cam, MAN, { armR: { raise: lerp(0.2, 1.45, point), out: 0.1, elbow: 0.1 }, handR: point > 0.3 ? HANDS.point : HANDS.relaxed, neck: { yaw: 0.2 } }, MP, faceYaw(MP, P1), t, { expr: FACE.determined, light: fireLight(cam, MP, warmth), live: 0.3, paint: 0.45 });
  const peter = fig(ctx, env, cam, PETER, pose, P1, PY, t, { expr: blendFace(blendFace({ ...FACE.frightened, gazeX: -0.3 * d1 }, { ...FACE.frightened, browIn: 1, knit: 0.7, lid: 1, gazeX: 0.3 }, d2), { ...FACE.crying, tears: 0.3, tremble: 0.8, open: 0.25 }, d3 * 0.7), light: fireLight(cam, P1, warmth, { pos: lampPos, amt: lampUp }), live: 0.2 });
  renderParts(ctx, [...(n < 0.7 ? warmers(ctx, env, cam, t, [MAN], warmth, 0.9) : []), ...(n < 0.55 ? [girl] : []), ...(n > 0.3 && n < 0.8 ? [man] : []), peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.55 });
  if (lampUp > 0.02) { const lp = wproj(cam, env, lampPos), sc = wplace(cam, env, lampPos, 0).scale; glow(ctx, lp[0], lp[1] - 0.05 * sc, 0.9 * sc, [1, 0.72, 0.38], 0.55 * lampUp); oilLamp(ctx, lp[0], lp[1], 0.16 * sc, t, 73); flame(ctx, lp[0] + 0.1 * sc, lp[1] - 0.03 * sc, 0.12 * sc, t, 74, { n: 3 }); }
  fire(ctx, env, cam, t, 1);
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.5, grain: 0.09, gain: [lerp(0.72, 1, warmth), lerp(0.8, 0.9, warmth), lerp(1.08, 0.85, warmth)], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 07.4 the silence
// from where Peter stands, on a long lens: up on the gallery, between the guards, Christ turns and
// looks at him (Luke 22:61). The rooster crows. Cold; He is in a small pool of torchlight.
const s074 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), turn = easeInOut(clamp((n - 0.1) / 0.45));
  const P1 = at(0.55, 1.02), eye: V3 = [P1[0] + 0.1, 1.62, P1[2] + 0.05], face: V3 = [CHR[0], CHR[1] + 1.6, CHR[2]];
  const cam = lookFrom(eye, [face[0] - 0.1, face[1] - 0.35, face[2]], lerp(640, 700, n), { cy: 500, cx: 960, t, shake: 0.05 });
  begin(ctx, env);
  courtyard(ctx, env, cam, t, 0.85);
  const fs = wproj(cam, env, face); glow(ctx, fs[0], fs[1] + 150, 520, [1, 0.62, 0.3], 0.35);
  renderParts(ctx, gallery(ctx, env, cam, t, turn, 0.6), { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.5 });
  torches(ctx, env, cam, t);
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.5, grain: 0.09, gain: [0.75, 0.82, 1.08], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 07.5 his eyes
// ECU: the understanding arrives, and his face breaks
const s075 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), know = smooth(0.1, 0.4, n), br = smooth(0.45, 0.85, n);
  const P1 = at(0.55, 1.02), PY = faceYaw(P1, B) + 0.35, pose: BodyPose = { neck: { pitch: lerp(-0.35, -0.15, br), yaw: 0.25 } };
  const face = worldJoint(PETER, pose, P1, PY, "face"), fwd: V3 = [Math.sin(PY + 0.25), 0, Math.cos(PY + 0.25)];
  const cam = lookFrom([face[0] + fwd[0] * 0.6, face[1] + 0.08, face[2] + fwd[2] * 0.6], [face[0], face[1] + 0.028, face[2]], lerp(6600, 7100, n), { cy: 540, cx: 960, t, shake: 0.06 });
  begin(ctx, env, "#05070c");
  const L: Light = { ...fireLight(cam, P1, 0.3), keyAmt: 1.05, fillAmt: 0.6, rimAmt: 0.6 };
  const peter = fig(ctx, env, cam, PETER, pose, P1, PY, t, { expr: blendFace(blendFace({ ...FACE.frightened, gazeY: 0.3, lid: 0.95 }, { ...FACE.vulnerable, gazeY: 0.25, lid: 0.9, tears: 0.4 }, know), { ...FACE.crying, gazeY: 0.1 }, br), light: L, live: 0.1 });
  renderParts(ctx, [peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  finish(ctx, env, s.abs, { bloom: 0.2, vignette: 0.55, grain: 0.1, gain: [0.72, 0.8, 1.08], gainAmt: 0.25 });
};

// ---------------------------------------------------------------- 07.6 into the dark
// the street outside, static and wide, a lot of dark around him: he pushes out through the gate, stops
// against the wall, and breaks; the shoulders collapse, he covers his face and slides down the wall
const s076 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), out = clamp(n / 0.28), stop = smooth(0.28, 0.36, n), fall = easeInOut(clamp((n - 0.42) / 0.45));
  const cam = lookFrom([6.5, 1.35, 7.5], [-0.8, 1.2, -1.6], 150, { cy: 540, cx: 960, t });
  begin(ctx, env, "#04060b");
  ground(ctx, env, cam, earthTex(env, "#5c5a58"), { x0: -30, x1: 30, z0: -2.1, z1: 20, tile: [3, 3] });
  card(ctx, env, cam, courtTex(env, "gate"), { at: [0, 0, -2.1], w: 14, h: 6, cols: 8 });
  card(ctx, env, cam, courtTex(env, "street"), { at: [-16, 0, -2.1], w: 18, h: 5, cols: 8 });
  card(ctx, env, cam, courtTex(env, "street"), { at: [16, 0, -2.1], w: 18, h: 5, cols: 8 });
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(96,112,160)"; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  // the gate's warm spill from the courtyard, shrinking as the leaf swings to
  const gp = wproj(cam, env, [0.2, 1.3, -2.1]); glow(ctx, gp[0], gp[1], 420, [1, 0.6, 0.28], 0.35 * (1 - smooth(0.3, 0.6, n)));
  const G: V3 = [0.2, 0, -1.7], WALL: V3 = [-2.4, 0, -1.72], pos: V3 = out < 1 ? [lerp(G[0], WALL[0], easeOut(out)), 0, lerp(G[2] - 0.4, WALL[2], out)] : WALL;
  const cover = smooth(0.4, 0.6, n);
  // the hands go to the face wherever the face is (he is sinking down the wall as they do)
  const body: BodyPose = { bend: lerp(0.1, 0.5, stop) + 0.2 * fall, neck: { pitch: lerp(0.2, 0.6, cover) }, legL: { hip: 1.6 * fall, knee: 2.3 * fall }, legR: { hip: 1.5 * fall, knee: 2.2 * fall } };
  const fj = worldJoint(PETER, grounded(PETER, body), [0, 0, 0], 0, "face");
  const base: BodyPose = out < 1 ? walk(t * 1.1, 1.0, { bend: 0.2 }) : { ...body, armL: cover > 0.05 ? { target: [fj[0] + 0.05, lerp(fj[1] - 0.5, fj[1] - 0.02, cover), fj[2] + lerp(0.25, 0.1, cover)], pole: [0.6, -0.4, 0.2] } : { raise: 0.05, elbow: 0.2 }, armR: cover > 0.05 ? { target: [fj[0] - 0.05, lerp(fj[1] - 0.5, fj[1], cover), fj[2] + lerp(0.25, 0.1, cover)], pole: [-0.6, -0.4, 0.2] } : { raise: 0.05, elbow: 0.2 }, handL: HANDS.cover, handR: HANDS.cover };
  const L: Light = { ...LIGHTS.moonNight, key: dirView(cam, [MOON[0], MOON[1], MOON[2] + 0.8]), keyAmt: 0.6, fillAmt: 0.3 };
  const peter = fig(ctx, env, cam, PETER, out < 1 ? base : { ...base, root: grounded(PETER, body).root }, pos, out < 1 ? faceYaw(G, WALL) : 0.1, t, { expr: FACE.crying, light: L, live: 0.4, paint: 0.45 });
  shadow(ctx, env, cam, pos, 0.4, 0.4);
  renderParts(ctx, [peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.45 });
  finish(ctx, env, s.abs, { bloom: 0.2, vignette: 0.55, grain: 0.1, gain: [0.72, 0.8, 1.1], gainAmt: 0.25 });
};

register({ "07.1": s071, "07.2": s072, "07.3": s073, "07.4": s074, "07.5": s075, "07.6": s076 });
void rng; void norm3;
