// CLIP 10 — ROME. «Η παράδοση της Εκκλησίας αναφέρει ότι ο Απόστολος Πέτρος έφτασε μέχρι τη Ρώμη. Εκεί συνέχισε να κηρύττει τον Χριστό, σε μια εποχή δύσκολη και επικίνδυνη για τους χριστιανούς.»
import type { Env } from "../../core";
import { rng } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose, type Figure } from "../figure/body";
import { PETER_FIG } from "../figure/cast";
import { crowd, extra, soldier } from "../figure/extras";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { oilLamp, flame } from "../paint/props";
import { romeWorld, tombTex, insulaTex } from "../sets/rome";
import { ground, card, flagTex, earthTex, grassTex, plasterTex, boardTex, crowdTopTex, trees } from "../sets/stage";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, easeOut, smooth } from "../lib/math";
import { fig, lookFrom, faceYaw, worldJoint, shadow, keyFrom, dirView, helmet, type Light } from "./kit";

const PD = PETER_FIG.D, PE = PETER_FIG.E;
const DUST = (cam: WCam, amt = 1): Light => ({ ...LIGHTS.romeDay, key: dirView(cam, [-0.6, 0.6, 0.3]), keyColor: [1, 0.9, 0.72], keyAmt: 1.1 * amt, fillAmt: 0.45, rim: dirView(cam, [0.5, 0.3, -0.8]), rimColor: [1, 0.88, 0.66], rimAmt: 0.45 });

// ---------------------------------------------------------------- the Via Appia
// the road runs along z; tombs and pines stand along both verges; the city lies toward -z
const TOMBS: [V3, "drum" | "temple" | "stele", number, number][] = (() => { const r = rng(1101), out: [V3, "drum" | "temple" | "stele", number, number][] = []; for (let i = 0; i < 18; i++) { const side = i % 2 ? 1 : -1, z = 20 - i * 7 - r() * 3, k = (["drum", "temple", "stele"] as const)[Math.floor(r() * 3)]; out.push([[side * (5 + r() * 3), 0, z], k, k === "drum" ? 9 : k === "temple" ? 7 : 3, 1100 + i]); } return out; })();
const PINES = (() => { const r = rng(1102), out: { at: V3; kind: "pine" | "cypress"; h: number; seed: number }[] = []; for (let i = 0; i < 16; i++) { const side = i % 2 ? -1 : 1; out.push({ at: [side * (9 + r() * 8), 0, 24 - i * 8 - r() * 4], kind: r() < 0.75 ? "pine" : "cypress", h: 11 + r() * 5, seed: 1120 + i }); } return out; })();
const appia = (ctx: Ctx2, env: Env, cam: WCam, t: number, rise = 0) => {
  begin(ctx, env);
  romeWorld(ctx, env, { ...cam, pan0: cam.yaw }, rise);
  ground(ctx, env, cam, grassTex(env, "#a89a62"), { x0: -80, x1: 80, z0: -150, z1: 40, tile: [3, 3] });
  ground(ctx, env, cam, flagTex(env, "#5c5854", 1024, "#2e2a26"), { x0: -2.1, x1: 2.1, z0: -150, z1: 40, tile: [4, 4] });
  // tombs and pines, far to near, each card turned to face the road's centre line
  const items = [...TOMBS.map(([p, k, h, seed]) => ({ p, draw: () => card(ctx, env, cam, tombTex(env, k, seed), { at: p, w: h * (900 / 700), h, yaw: cam.yaw, cols: 3 }) })), ...PINES.map((q) => ({ p: q.at, draw: () => trees(ctx, env, cam, [q], -1) }))];
  items.sort((a, b) => wproj(cam, env, a.p)[2] - wproj(cam, env, b.p)[2]).forEach((it) => it.draw());
  void t;
};
// an ox cart crossing close in front of the lens: two pale oxen, the yoke, a spoked wheel, a load
const oxCart = (ctx: Ctx2, env: Env, x: number, t: number) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(x, 0);
  const bob = Math.sin(t * 6) * 6;
  ctx.fillStyle = "#6a5440"; ctx.fillRect(-900, 330 + bob, 1150, 420); ctx.fillStyle = "#8a7050"; for (let i = 0; i < 9; i++) ctx.fillRect(-880 + i * 128, 300 + bob, 96, 60);
  ctx.fillStyle = "#a89478"; ctx.beginPath(); ctx.ellipse(-400, 330 + bob, 520, 90, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#2a1e14"; ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(-420, 820, 300, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 10; i++) { const a = i * 0.628 + t * 1.5; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(-420, 820); ctx.lineTo(-420 + Math.cos(a) * 290, 820 + Math.sin(a) * 290); ctx.stroke(); }
  ctx.fillStyle = "#d8ccb4"; ctx.beginPath(); ctx.ellipse(700, 560 + bob, 380, 230, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(1080, 470 + bob, 140, 110, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#b8ac94"; for (const lx of [480, 640, 820, 950]) ctx.fillRect(lx, 700 + bob, 60, 400);
  ctx.fillStyle = "#4a3a2a"; ctx.fillRect(250, 420 + bob, 900, 36);
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, 1); void g;
};
// ---------------------------------------------------------------- 10.1 the road to Rome
const s101 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), cart = smooth(0.6, 1, n);
  const cam = lookFrom([0.6, 1.6, 9], [0, 1.3, -6], 150, { cy: 520, cx: 960, t, shake: 0.08 });
  appia(ctx, env, cam, t);
  const pos: V3 = [0.2, 0, lerp(-9, -2, n)];
  shadow(ctx, env, cam, pos, 0.4, 0.3);
  renderParts(ctx, [fig(ctx, env, cam, PD, walk(t * 0.95, 1, { bend: 0.08 }), pos, 0.02, t, { expr: FACE.determined, light: DUST(cam), live: 0.3, paint: 0.45 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.45 });
  motes(ctx, 1103, 50, t, [0, 300, env.W, 1000], { color: [1, 0.92, 0.75], size: 2, vx: 12, vy: -4, alpha: 0.35, flicker: 2 });
  if (cart > 0) oxCart(ctx, env, lerp(-1500, env.W + 400, cart), t);
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.28, grain: 0.07, gain: [1, 0.94, 0.82], gainAmt: 0.2 });
};
// ---------------------------------------------------------------- 10.2 Rome rises
// the cart clears: the same walk, but he is old now, grey and travel-worn; he walks on past us toward
// the city and the camera rises: the aqueduct striding in, the roofs and temples in the haze
const s102 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), cart = 1 - smooth(0, 0.25, n), up = easeInOut(clamp((n - 0.3) / 0.7));
  const cam = lookFrom([0.8, lerp(1.6, 9, up), lerp(8, 14, up)], [0, lerp(1.4, 2, up), lerp(-6, -60, up)], Math.exp(lerp(Math.log(170), Math.log(30), up)), { cy: 520, cx: 960, t, shake: 0.06 });
  appia(ctx, env, cam, t, up);
  const pos: V3 = [0.25, 0, lerp(5, -6, n)];
  shadow(ctx, env, cam, pos, 0.4, 0.3);
  renderParts(ctx, [fig(ctx, env, cam, PE, walk(t * 0.85, 0.9, { bend: 0.12 }), pos, Math.PI, t, { light: DUST(cam), live: 0.3, paint: 0.45 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.45 });
  motes(ctx, 1104, 50, t, [0, 300, env.W, 1000], { color: [1, 0.92, 0.75], size: 2, vx: 12, vy: -4, alpha: 0.35, flicker: 2 });
  if (cart > 0) oxCart(ctx, env, lerp(env.W + 400, env.W + 1600, 1 - cart), t);
  finish(ctx, env, s.abs, { bloom: 0.32, vignette: 0.26, grain: 0.07, gain: [1, 0.93, 0.8], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 10.3 tiny in the city
// high over a crowded street between tall insulae: carts, soldiers, the crowd; one small grey figure crossing
const STREETERS = crowd(1130, 16, { man: 0.55, woman: 0.3, elder: 0.1, child: 0.05 }), GUARDS = [soldier(1141), soldier(1142), soldier(1143)];
const s103 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const cam = lookFrom([6, 16, 16], [0, 0, -2], 70, { cy: 540, cx: 960, t, shake: 0.04 });
  begin(ctx, env, "#b8a88c");
  ground(ctx, env, cam, flagTex(env, "#9a8c78"), { x0: -40, x1: 40, z0: -40, z1: 40, tile: [4, 4] });
  ground(ctx, env, cam, crowdTopTex(env, 1131), { x0: -40, x1: 40, z0: -6, z1: 5, y: 1.2, tile: [6, 6], alpha: 0.9 });
  card(ctx, env, cam, insulaTex(env, 1132), { at: [0, 0, -7], w: 30, h: 16, cols: 8 }); card(ctx, env, cam, insulaTex(env, 1133), { at: [30, 0, -7], w: 30, h: 16, cols: 8 }); card(ctx, env, cam, insulaTex(env, 1134), { at: [-30, 0, -7], w: 30, h: 16, cols: 8 });
  const L = DUST(cam, 0.9), parts: Parts[] = STREETERS.map((fg, i) => { const r = rng(1150 + i), sp = 0.6 + r() * 0.9, dir = r() < 0.5 ? 1 : -1, x = ((r() * 30 + dir * sp * t) % 30 + 30) % 30 - 15; const p: V3 = [x, 0, -5.5 + r() * 11]; return fig(ctx, env, cam, fg, walk(t * sp + r(), 1, {}), p, dir * Math.PI / 2, t, { light: L, live: 0.2, paint: 0.2, detail: 0 }); });
  GUARDS.forEach((g, i) => { const p: V3 = [lerp(-10, 12, n) - i * 1.1, 0, 2.8 + (i % 2) * 0.6], pose = walk(t * 1.1 + i * 0.3, 1, {}); parts.push({ ...fig(ctx, env, cam, g, pose, p, Math.PI / 2, t, { light: L, live: 0.2, paint: 0.2, detail: 0 }), overlays: [helmet(cam, env, g, pose, p, Math.PI / 2)] }); });
  parts.push(fig(ctx, env, cam, PE, walk(t * 0.8, 0.8, { bend: 0.1 }), [lerp(1.5, -1.0, n), 0, lerp(-5, 4, n)], Math.PI - 0.3, t, { light: L, live: 0.2, paint: 0.25, detail: 1 }));
  renderParts(ctx, parts, { env, cell: 2, tol: 5, paint: 0.25 });
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.3, grain: 0.07, gain: [1, 0.94, 0.86], gainAmt: 0.18, contrast: 0.06 });
};

// ---------------------------------------------------------------- the hidden room
// a low room under an insula, plastered, a wooden stair up to the street door; lamps on the floor
// and in niches; a few dozen people sitting close
export const RLAMPS: V3[] = [[-2.2, 0.6, -1.8], [2.0, 0.6, -1.9], [0.3, 0.15, 0.6], [-3.1, 1.3, 0.8]];
const ROOMERS = crowd(1160, 20, { man: 0.45, woman: 0.4, elder: 0.1, child: 0.05 });
export const lowRoom = (ctx: Ctx2, env: Env, cam: WCam, t: number, tremble = 0) => {
  begin(ctx, env, "#0a0806");
  ground(ctx, env, cam, boardTex(env, "#4a3626"), { x0: -5, x1: 5, z0: -4, z1: 5, tile: [3, 3] });
  const pl = plasterTex(env, "#a89070");
  card(ctx, env, cam, pl, { at: [0, 0, -4], w: 10, h: 2.8, cols: 6 }); card(ctx, env, cam, pl, { at: [-5, 0, 0], w: 9, h: 2.8, yaw: Math.PI / 2, cols: 5 }); card(ctx, env, cam, pl, { at: [5, 0, 0], w: 9, h: 2.8, yaw: -Math.PI / 2, cols: 5 });
  // the stair up to the door (right wall), a line of cold daylight under the door
  for (let i = 0; i < 9; i++) card(ctx, env, cam, boardTex(env, "#3a2a1e"), { at: [4.3, i * 0.28, -2.6 + i * 0.3], w: 1.2, h: 0.28, yaw: 0, cols: 1 });
  const dl = wproj(cam, env, [4.3, 2.55, 0.1]); glow(ctx, dl[0], dl[1], 80, [0.75, 0.82, 1], 0.5);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(120,90,66)"; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  for (const [i, p] of RLAMPS.entries()) { const q = wproj(cam, env, p), sc = wplace(cam, env, p, 0).scale; if (cam.focal && cam.focal / cam.scale - q[2] / cam.scale < 0.25) continue; glow(ctx, q[0], q[1], 1.6 * sc, [1, 0.6, 0.28], 0.4); oilLamp(ctx, q[0], q[1], 0.14 * sc, t, 1170 + i); ctx.save(); ctx.translate(q[0] + 0.1 * sc, q[1] - 0.03 * sc); ctx.rotate(tremble * Math.sin(t * 23 + i) * 0.4); flame(ctx, 0, 0, 0.11 * sc, t, 1171 + i, { n: 3 }); ctx.restore(); }
};
export const lampKey = (cam: WCam, p: V3): Light => ({ ...LIGHTS.lamp, key: keyFrom(cam, [p[0], 1.1, p[2]], RLAMPS[2]), keyAmt: 1.0, fillAmt: 0.35 });
export const PSEAT: V3 = [0, 0, -2.4], seated = (f: Figure, p: BodyPose = {}) => grounded(f, { bend: 0.2, legL: { hip: 1.9, knee: 2.55, out: 0.25 }, legR: { hip: 1.85, knee: 2.6, out: 0.25 }, armL: { raise: 0.55, elbow: 1.1 }, armR: { raise: 0.5, elbow: 1.1 }, neck: { pitch: 0.05 }, ...p });
export const listeners = (ctx: Ctx2, env: Env, cam: WCam, t: number, freeze = 0): Parts[] => ROOMERS.map((fg, i) => { const r = rng(1180 + i), row = Math.floor(i / 6), p: V3 = [((i % 6) - 2.5) * 1.1 + (row % 2) * 0.4 + (r() - 0.5) * 0.3, 0, -0.9 + row * 1.0 + (r() - 0.5) * 0.3]; return fig(ctx, env, cam, fg, seated(fg, { neck: { pitch: 0.08, yaw: lerp((r() - 0.5) * 0.4, 0.9, freeze * (r() < 0.7 ? 1 : 0)) } }), p, faceYaw(p, PSEAT), t, { light: lampKey(cam, p), live: 0.3 * (1 - freeze), paint: 0.35 }); });
const teach = (t: number): BodyPose => seated(PE, { bend: 0.1, armR: { raise: 0.7 + 0.1 * Math.sin(t * 1.2), out: 0.35, elbow: 0.8 }, armL: { raise: 0.6 + 0.1 * Math.sin(t * 1.4 + 1), out: 0.3, elbow: 0.9 }, handR: HANDS.open, handL: HANDS.open, neck: { pitch: 0.05, yaw: 0.2 * Math.sin(t * 0.5) } });

// ---------------------------------------------------------------- 10.4 the hidden gathering
const s104 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const cam = lookFrom([lerp(0.9, 0.6, n), 2.05, 4.2], [0, 0.85, -1.8], 320, { cy: 520, cx: 960, t, shake: 0.05 });
  lowRoom(ctx, env, cam, t);
  const parts = [...listeners(ctx, env, cam, t), fig(ctx, env, cam, PE, teach(t), PSEAT, 0, t, { expr: { ...FACE.peaceful, open: 0.06 + 0.06 * Math.max(0, Math.sin(t * 5)) }, light: lampKey(cam, PSEAT), live: 0.3 })];
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.45 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.42, grain: 0.08, gain: [1, 0.85, 0.7], gainAmt: 0.2 });
};
// ---------------------------------------------------------------- 10.5 footsteps
// a young man by the stair looks up at the door; hobnailed boots in the street; everyone freezes; a
// lamp flame trembles; focus racks from the watcher to Peter, whose eyes lift to the door. Hold.
const WATCH = extra(1190, "youth");
const s105 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), freeze = smooth(0.25, 0.35, n), rack = easeInOut(clamp((n - 0.45) / 0.25)), lift = smooth(0.55, 0.75, n);
  const WP: V3 = [3.2, 0, 0.9], wpose: BodyPose = { neck: { pitch: -0.45, yaw: 0.4 }, armL: { raise: 0.2, elbow: 0.4 }, bend: 0.05 };
  const wface = worldJoint(WATCH, wpose, WP, faceYaw(WP, [4.3, 2.4, -1]), "face");
  const cam = lookFrom([wface[0] - 1.2, wface[1] - 0.05, wface[2] + 1.6], [lerp(wface[0], PSEAT[0], 0.35), lerp(wface[1], 1.0, 0.4), lerp(wface[2], PSEAT[2], 0.35)], 600, { cy: 520, cx: 960, t, shake: 0.04 });
  lowRoom(ctx, env, cam, t, freeze);
  renderParts(ctx, [...listeners(ctx, env, cam, t, freeze), fig(ctx, env, cam, PE, { ...teach(t * (1 - freeze)), neck: { pitch: lerp(0.05, -0.35, lift), yaw: lerp(0, 0.8, lift) } }, PSEAT, 0, t, { expr: blendFace(FACE.peaceful, { ...FACE.peaceful, lid: 0.95, gazeY: 0.3, gazeX: 0.3 }, lift), light: lampKey(cam, PSEAT), live: 0.2 * (1 - freeze) })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.45, fx: { blur: lerp(5, 0, rack) } });
  renderParts(ctx, [fig(ctx, env, cam, WATCH, wpose, WP, faceYaw(WP, [4.3, 2.4, -1]), t, { expr: { ...FACE.frightened, gazeY: 0.4 }, light: lampKey(cam, WP), live: 0.15 * (1 - freeze) })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.55, fx: { blur: lerp(0, 6, rack) } });
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.45, grain: 0.08, gain: [0.95, 0.85, 0.75], gainAmt: 0.2 });
};

register({ "10.1": s101, "10.2": s102, "10.3": s103, "10.4": s104, "10.5": s105 });
void earthTex; void shaft; void easeOut;
