// CLIP 11 — MARTYRDOM. «Τελικά συνελήφθη και μαρτύρησε κατά τον διωγμό του Νέρωνα. Ζήτησε να σταυρωθεί ανάποδα, γιατί θεωρούσε τον εαυτό του ανάξιο να πεθάνει με τον ίδιο τρόπο όπως ο Κύριός του.»
// Handled with restraint: the arrest, the bound hands, the corridor, the beams lying ready, and the
// cross itself only as a silhouette and its shadow at a great distance. No detail of the body.
import type { Env } from "../../core";
import { rng } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose } from "../figure/body";
import { PETER_FIG } from "../figure/cast";
import { soldier } from "../figure/extras";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { torch, flame } from "../paint/props";
import { rope } from "../paint/cord";
import { circusPlate } from "../sets/rome";
import { ground, card, flagTex, earthTex, courtTex, beamsTex } from "../sets/stage";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, smooth } from "../lib/math";
import { fig, lookFrom, faceYaw, worldJoint, shadow, keyFrom, dirView, helmet, toLocal, type Light } from "./kit";
import { lowRoom, lampKey, PSEAT, seated, listeners } from "./c10";

const PE = PETER_FIG.E, S1 = soldier(1201), S2 = soldier(1202), S3 = soldier(1203);
// the wrists held out together in front of him (his own frame)
const wristsOut = (k: number): BodyPose => ({ armL: { target: [0.04, lerp(0.9, 1.08, k), lerp(0.25, 0.42, k)], pole: [0.6, -0.5, -0.2] }, armR: { target: [-0.04, lerp(0.9, 1.08, k), lerp(0.25, 0.42, k)], pole: [-0.6, -0.5, -0.2] }, handL: HANDS.bound, handR: HANDS.bound });

// ---------------------------------------------------------------- 11.1 he offers his hands
const s111 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), down = easeInOut(clamp(n / 0.5)), rise = smooth(0.2, 0.45, n), calm = smooth(0.35, 0.55, n) * (1 - smooth(0.62, 0.72, n)), offer = smooth(0.66, 0.9, n);
  const cam = lookFrom([-2.2, 1.55, 3.6], [0.8, 1.1, -1.4], 330, { cy: 520, cx: 960, t, shake: 0.12 });
  lowRoom(ctx, env, cam, t, 0.6);
  const parts: Parts[] = listeners(ctx, env, cam, t, 1);
  // Peter rises from his seat, lifts a hand to still them, then holds out his wrists
  const pose: BodyPose = rise < 0.99 ? seated(PE, { bend: lerp(0.2, 0, rise), legL: { hip: lerp(1.9, 0, rise), knee: lerp(2.55, 0, rise) }, legR: { hip: lerp(1.85, 0, rise), knee: lerp(2.6, 0, rise) } }) : offer > 0.02 ? { ...wristsOut(offer), neck: { pitch: 0.05 } } : { armR: { raise: 1.2 * calm + 0.2, out: 0.3, elbow: 0.5 }, handR: HANDS.open, armL: { raise: 0.2, elbow: 0.4 }, neck: { yaw: -0.4 * calm } };
  parts.push(fig(ctx, env, cam, PE, pose, PSEAT, lerp(0, 0.9, rise), t, { expr: FACE.peaceful, light: lampKey(cam, PSEAT), live: 0.2 }));
  // the soldiers coming down the stair with torches
  [S1, S2].forEach((sd, i) => { const u = clamp(down * 1.2 - i * 0.25), p: V3 = [4.3 - u * 1.2, lerp(2.5, 0, u), lerp(0.1, -1.2, u) - i * 0.6], pw = walk(t * 1.1 + i, 1, { armR: { raise: 1.3, elbow: 1.1, out: 0.2 }, handR: HANDS.grip }); parts.push({ ...fig(ctx, env, cam, sd, pw, p, faceYaw(p, PSEAT), t, { light: { ...LIGHTS.torchNight, key: dirView(cam, [0.4, 0.5, 0.6]) }, live: 0.3, paint: 0.4 }), overlays: [helmet(cam, env, sd, pw, p, faceYaw(p, PSEAT))] }); const hand = worldJoint(sd, pw, p, faceYaw(p, PSEAT), "handR"), q = wproj(cam, env, [hand[0], hand[1] + 0.35, hand[2]]), sc = wplace(cam, env, hand, 0).scale; parts.push({ tris: [], anchors: [], overlays: [{ z: q[2] + 50, draw: () => { torch(ctx, q[0], q[1], 0.45 * sc, t, 1210 + i, 0.1); glow(ctx, q[0], q[1] - 0.1 * sc, 2.2 * sc, [1, 0.6, 0.28], 0.45); } }] }); });
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.45 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.42, grain: 0.08, gain: [1, 0.82, 0.66], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 11.2 bound
// his old fisherman's hands, bound with rope: the rope that ran through them in 01.1
const s112 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), tie = smooth(0, 0.6, n), P: V3 = [0, 0, 0], pose: BodyPose = { ...wristsOut(1), neck: { pitch: 0.3 } };
  const wl = worldJoint(PE, pose, P, 0, "wristL"), wr = worldJoint(PE, pose, P, 0, "wristR"), mid: V3 = [(wl[0] + wr[0]) / 2, (wl[1] + wr[1]) / 2, (wl[2] + wr[2]) / 2];
  const cam = lookFrom([mid[0] + 0.12, mid[1] + 0.14, mid[2] + 0.62], [mid[0], mid[1] - 0.01, mid[2]], lerp(2500, 2700, n), { cy: 560, cx: 960, t, shake: 0.06 });
  begin(ctx, env, "#0c0907");
  const L: Light = { ...LIGHTS.torchNight, key: dirView(cam, [0.6, 0.4, 0.6]), keyAmt: 1.2, fillAmt: 0.35 };
  const P2 = (p: V3) => wproj(cam, env, p);
  // the rope: coil after coil round both wrists as the soldier's hands work, then the knot and its tail
  const coils = Math.floor(1 + 2 * tie), hw = Math.abs(wl[0] - wr[0]) / 2 + 0.028, ropeOv = Array.from({ length: coils }, (_, i) => { const z = mid[2] - 0.02 + i * 0.012, pts: V3[] = []; for (let a = 0; a <= 24; a++) { const q = (a / 24) * Math.PI * 2; pts.push([mid[0] + Math.cos(q) * hw, mid[1] + 0.01 + Math.sin(q) * 0.034, z + Math.sin(q) * 0.004]); } return rope(P2, pts, { width: Math.max(2, 0.008 * cam.scale), color: "#8a7050", t: t + i }); });
  const tail = rope(P2, [[mid[0] + hw * 0.6, mid[1] - 0.02, mid[2] + 0.04], [mid[0] + 0.08, mid[1] - 0.16, mid[2] + 0.1], [mid[0] + 0.04, mid[1] - 0.34, mid[2] + 0.16]], { width: Math.max(2, 0.008 * cam.scale), color: "#8a7050", sag: 0.05 });
  const peter = fig(ctx, env, cam, PE, pose, P, 0, t, { light: L, live: 0.05 });
  renderParts(ctx, [{ ...peter, overlays: [...peter.overlays, ...ropeOv, ...(tie > 0.95 ? [tail] : [])] }], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  glow(ctx, 1500, 300, 900, [1, 0.58, 0.26], 0.3);
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.5, grain: 0.09, gain: [1, 0.84, 0.7], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 11.3 the corridor
// wide and symmetrical down a stone corridor: he walks slowly between guards through bars of light
// falling from narrow slits
const s113 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), z = lerp(-8, -3.5, n);
  const cam = lookFrom([0, 1.5, 4], [0, 1.3, -12], 230, { cy: 540, cx: 960, t });
  begin(ctx, env, "#080706");
  ground(ctx, env, cam, flagTex(env, "#6a6258"), { x0: -2, x1: 2, z0: -40, z1: 6, tile: [4, 4] });
  const w = courtTex(env, "street");
  card(ctx, env, cam, w, { at: [-1.9, 0, -17], w: 46, h: 3.4, yaw: Math.PI / 2, cols: 12 }); card(ctx, env, cam, w, { at: [1.9, 0, -17], w: 46, h: 3.4, yaw: -Math.PI / 2, cols: 12 });
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(92,86,80)"; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  // the slits: bars of late light crossing the corridor from the right
  for (let k = 0; k < 7; k++) { const zz = -2 - k * 4.5, a = wproj(cam, env, [1.9, 3.1, zz]), b = wproj(cam, env, [-0.6, 0, zz + 0.6]); shaft(ctx, a[0], a[1], b[0], b[1], 8, Math.max(20, 60 - k * 6), [1, 0.86, 0.62], 0.35); const fl = wproj(cam, env, [-0.4, 0, zz + 0.5]); glow(ctx, fl[0], fl[1], Math.max(30, 140 - k * 16), [1, 0.85, 0.6], 0.35); }
  const L: Light = { ...LIGHTS.lateDay, keyAmt: 0.6, fillAmt: 0.35, rimAmt: 0.5 };
  const parts: Parts[] = [];
  const addW = (fg: typeof PE, p: V3, ph: number, helm: boolean) => { const pw = fg === PE ? { ...walk(t * 0.6 + ph, 0.6, { bend: 0.08 }), ...wristsOut(1), neck: { pitch: 0.1 } } : walk(t * 0.6 + ph, 0.6, {}); const part = fig(ctx, env, cam, fg, pw, p, 0, t, { light: L, live: 0.3, paint: 0.4 }); parts.push(helm ? { ...part, overlays: [...part.overlays, helmet(cam, env, fg, pw, p, 0, 0.8)] } : part); };
  addW(S3, [0, 0, z - 1.4], 0.4, true); addW(PE, [0, 0, z], 0, false); addW(S1, [-0.6, 0, z + 1.2], 0.3, true); addW(S2, [0.6, 0, z + 1.2], 0.8, true);
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.4 });
  motes(ctx, 1220, 40, t, [600, 200, 1300, 900], { color: [1, 0.9, 0.7], size: 1.6, vx: -6, vy: 3, alpha: 0.4, flicker: 2 });
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.45, grain: 0.08, gain: [1, 0.9, 0.78], gainAmt: 0.18 });
};

// ---------------------------------------------------------------- 11.4 the cross
// in the yard he sees the plain wooden beams lying ready; he lowers his eyes, then looks upward
const s114 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), low = smooth(0.2, 0.4, n), up = smooth(0.62, 0.85, n), pov = smooth(0.42, 0.46, n) * (1 - smooth(0.6, 0.64, n));
  const P: V3 = [0, 0, 1.5], pose: BodyPose = { ...wristsOut(1), neck: { pitch: lerp(0, 0.6, low) * (1 - up) - 0.55 * up } }, face = worldJoint(PE, pose, P, Math.PI, "face");
  const L: Light = { ...LIGHTS.lateDay, key: dirView(lookFrom([0, 1.5, -1], face, 1000), [0.7, 0.5, 0.4]), keyAmt: 1.0, rimAmt: 0.7 };
  begin(ctx, env);
  if (pov < 0.5) {
    const cam = lookFrom([face[0] + 0.3, face[1] - 0.12, face[2] - 1.6], [face[0], face[1] - 0.05, face[2]], lerp(1200, 1280, n), { cy: 480, cx: 960, t, shake: 0.05 });
    ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const g = ctx.createLinearGradient(0, 0, 0, env.H); g.addColorStop(0, "#8aa2bc"); g.addColorStop(1, "#e8cfa4"); ctx.fillStyle = g; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
    card(ctx, env, cam, courtTex(env, "gate"), { at: [0, 0, 8], w: 14, h: 6, yaw: Math.PI, cols: 6 });
    ground(ctx, env, cam, earthTex(env, "#b09a78"), { x0: -20, x1: 20, z0: -20, z1: 8, tile: [3, 3] });
    renderParts(ctx, [fig(ctx, env, cam, PE, pose, P, Math.PI, t, { expr: blendFace(blendFace(FACE.neutral, { ...FACE.ashamed, gazeY: -0.6, lid: 0.5 }, low * (1 - up)), { ...FACE.peaceful, gazeY: 0.5, lid: 0.9 }, up), light: L, live: 0.15 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  } else {
    // what he sees: the beams lying on the packed earth
    const cam = lookFrom([face[0], face[1], face[2]], [0, 0, -1.8], 260, { cy: 540, cx: 960, t, shake: 0.08 });
    ground(ctx, env, cam, earthTex(env, "#b09a78"), { x0: -20, x1: 20, z0: -20, z1: 8, tile: [3, 3] });
    ground(ctx, env, cam, beamsTex(env), { x0: -2.5, x1: 2.5, z0: -3.3, z1: -0.3 });
  }
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.35, grain: 0.07, gain: [1, 0.9, 0.78], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 11.5 in silhouette
// very far across the sand of the Circus, against the low sun: by the obelisk, small figures haul a tall
// timber upright. Its long shadow lies toward us across the sand: the crossbar low, near the foot.
const s115 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), up = easeInOut(clamp(n / 0.8)), pl = circusPlate(env);
  begin(ctx, env);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const k = 1080 / 960; ctx.translate(960, 540); ctx.scale(k, k); ctx.translate(-1200, -610); ctx.drawImage(pl.canvas as CanvasImageSource, 0, 0, 2400, 1100);
  // the timber rising from the diagonal to upright; its shadow stretched toward us, the bar low
  const bx = 1180, by = 745, L = 190, a = lerp(-1.1, 0, up), tx = bx + Math.sin(a) * L, ty = by - Math.cos(a) * L;
  ctx.strokeStyle = "#241a14"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
  const cb = 0.24, cx = bx + Math.sin(a) * L * cb, cy = by - Math.cos(a) * L * cb; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 34, cy - Math.sin(a) * 34); ctx.lineTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34); ctx.stroke();
  ctx.fillStyle = "rgba(60,40,28,0.5)"; ctx.save(); ctx.translate(bx, by + 4); ctx.transform(1, 0, -1.6 * up, 0.35, 0, 0); ctx.fillRect(-4, -L * up, 8, L * up); ctx.fillRect(-34, -L * up * cb - 4, 68, 7); ctx.restore();
  // the men on the ropes, leaning back
  ctx.strokeStyle = "#241a14"; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const mx = bx + 60 + i * 38, my = by + 2, lean = 0.3 + 0.1 * Math.sin(t * 2 + i); ctx.fillStyle = "#241a14"; ctx.beginPath(); ctx.ellipse(mx - lean * 8, my - 14, 4, 12, -lean, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(mx - lean * 14, my - 29, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(mx - lean * 12, my - 20); ctx.lineTo(tx + 10, ty + 6); ctx.stroke(); }
  ctx.restore();
  motes(ctx, 1230, 30, t, [0, 400, env.W, 900], { color: [1, 0.85, 0.6], size: 1.8, vx: 10, vy: -2, alpha: 0.35, flicker: 2 });
  finish(ctx, env, s.abs, { bloom: 0.4, vignette: 0.35, grain: 0.08, gain: [1, 0.88, 0.72], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 11.6 peace
// close on the old man in the wind: a flicker of fear, then his face settles into peace; on «όπως ο
// Κύριός του» he looks up, and the sky fills the frame with light
const s116 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), fear = smooth(0.05, 0.15, n) * (1 - smooth(0.25, 0.4, n)), peace = smooth(0.3, 0.5, n), up = easeInOut(clamp((n - 0.55) / 0.3)), white = smooth(0.72, 1, n);
  const P: V3 = [0, 0, 0], pose: BodyPose = { neck: { pitch: lerp(0.05, -0.45, up), roll: 0.04 * Math.sin(t * 1.3) }, bend: -0.05 * up }, face = worldJoint(PE, pose, P, 0, "face");
  const cam = lookFrom([face[0] + 0.25, face[1] - 0.05, face[2] + 1.2], [face[0], face[1] - 0.12 + 0.06 * up, face[2]], lerp(1050, 1150, n), { cy: 500, cx: 960, t, shake: 0.06 });
  begin(ctx, env);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const g = ctx.createLinearGradient(0, 0, 0, env.H); g.addColorStop(0, "#9ab2cc"); g.addColorStop(0.7, "#e6d2ac"); g.addColorStop(1, "#c8a880"); ctx.fillStyle = g; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  const L: Light = { ...LIGHTS.lateDay, key: dirView(cam, [0.75, 0.35, 0.55]), keyAmt: 1.05, fillAmt: 0.5 + 0.3 * up, rimAmt: 0.8 };
  renderParts(ctx, [fig(ctx, env, cam, PE, pose, P, 0, t, { expr: blendFace(blendFace(FACE.neutral, { ...FACE.frightened, lid: 0.9 }, fear), { ...FACE.peaceful, gazeY: 0.55 * up, lid: 0.85 }, peace), light: L, live: 0.5 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  // the wind: dust and seed-down blowing across; then the light
  motes(ctx, 1240, 40, t, [0, 0, env.W, env.H], { color: [1, 0.95, 0.85], size: 2, vx: 180, vy: -20, alpha: 0.35 * (1 - white), flicker: 2 });
  glow(ctx, env.W * 0.55, -100, 1400, [1, 0.97, 0.9], 0.5 * up);
  if (white > 0) { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = `rgba(255,252,244,${white})`; ctx.fillRect(0, 0, env.W, env.H); ctx.restore(); }
  finish(ctx, env, s.abs, { bloom: 0.35 + 0.3 * up, vignette: 0.3 * (1 - white), grain: 0.06, gain: [1, 0.93, 0.84], gainAmt: 0.15 * (1 - white) });
};

register({ "11.1": s111, "11.2": s112, "11.3": s113, "11.4": s114, "11.5": s115, "11.6": s116 });
void rng; void flame; void toLocal; void grounded; void keyFrom; void shadow;
