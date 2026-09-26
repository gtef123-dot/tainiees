// CLIP 04 — BESIDE JESUS. «Από τότε έζησε κοντά στον Ιησού, άκουσε τη διδασκαλία Του, είδε τα θαύματά Του και έγινε μάρτυρας μεγάλων γεγονότων.»
import type { Env } from "../../core";
import { rng } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose, type Figure } from "../figure/body";
import { PETER_FIG, CHRIST_FIG, ANDREW_FIG, JAMES_FIG, JOHN_FIG, THOMAS_FIG } from "../figure/cast";
import { crowd, extra } from "../figure/extras";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { boatGunwale } from "../paint/props";
import { hillsWorld } from "../sets/galilee";
import { lakeWorld } from "../sets/lake";
import { ground, card, earthTex, grassTex, wheatTex, streetTex, softTex } from "../sets/stage";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, easeOut, smooth, norm3 } from "../lib/math";
import { fig, boatAt, onBoat, shadow, lookFrom, faceYaw, waterAt, splash, lensDrops, worldJoint } from "./kit";

const PETER = PETER_FIG.B;
const WARM = { ...LIGHTS.lateDay, key: norm3([-0.7, 0.45, 0.35]), rim: norm3([0.7, 0.3, -0.6]), rimAmt: 0.6 };

// ---------------------------------------------------------------- 04.1 close behind Him
// hip height beside the path, travelling with them through ripe wheat: Christ talking as He walks,
// Peter at His shoulder, head tilted to catch every word; the others strung out behind
const WALK: [Figure, number, number, number][] = [[CHRIST_FIG, 0.9, -0.05, 0], [PETER, 0.05, 0.28, 0.32], [JOHN_FIG, -1.05, -0.2, 0.62], [ANDREW_FIG, -2.1, 0.25, 0.15], [JAMES_FIG, -3.2, -0.15, 0.8], [THOMAS_FIG, -4.3, 0.2, 0.45]];
const s041 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), v = 0.95, lead = v * t;
  const cam: WCam = lookFrom([lead - 1.6 + 0.5 * n, 1.38, 4.8], [lead - 0.2, 1.2, 0], 300, { cy: 540, cx: 980, t, shake: 0.18 });
  begin(ctx, env);
  hillsWorld(ctx, env, { ...cam, pan0: cam.yaw }, "golden", cam.focal, 0.6);
  const x0 = lead - 40, x1 = lead + 40;
  ground(ctx, env, cam, earthTex(env, "#9a8058"), { x0, x1, z0: -60, z1: 12, tile: [3, 3] });
  ground(ctx, env, cam, earthTex(env, "#c2a878"), { x0, x1, z0: -0.9, z1: 0.9, tile: [3, 3] });
  const lit = "#f2d38a", shade = "#8a6a3a", wt = wheatTex(env, lit, shade, "gold");
  // wheat rows behind the path (far to near), each a strip of repeating cards
  const row = (z: number, h: number, blurTex = false, alpha = 1, xa = x0 + 20, xb = x1 - 20) => { const tx = blurTex ? softTex(env, wt, "tex:wheat:gold", 8) : wt, W = 4; for (let X = Math.floor(xa / W) * W; X < xb; X += W) card(ctx, env, cam, tx, { at: [X + W / 2, 0, z], w: W, h, alpha, cols: 3 }); };
  for (const z of [-14, -9, -5.5, -3, -1.4]) row(z, 1.25 + (z % 2) * 0.05);
  const parts: Parts[] = WALK.map(([fg, x, z, ph]) => {
    const pos: V3 = [lead + x, 0, z], talk = fg === CHRIST_FIG;
    const pose = walk(t * 0.95 + ph, 0.95, talk ? { armR: { raise: 0.55 + 0.1 * Math.sin(t * 2.1), elbow: 1.0, out: 0.2 }, neck: { yaw: -0.35, pitch: 0.02 } } : fg === PETER ? { neck: { yaw: 0.25, roll: 0.14, pitch: 0.06 } } : {});
    return fig(ctx, env, cam, fg, pose, pos, Math.PI / 2 - 0.12, t, { expr: talk ? { lid: 0.75, smile: 0.1, open: 0.08 + 0.08 * Math.max(0, Math.sin(t * 7)) } : fg === PETER ? { ...FACE.awe, lid: 0.9, gazeX: 0.25 } : {}, light: WARM, live: 0.4, paint: 0.5 });
  });
  for (const [, x, z] of WALK) shadow(ctx, env, cam, [lead + x + 0.3, 0, z + 0.2], 0.4, 0.3, 1.4, 0.6);
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.55 });
  // the near wheat between us and them, soft, brushing across the frame
  row(2.6, 0.8, true);
  motes(ctx, 91, 60, t, [0, 200, env.W, 900], { color: [1, 0.9, 0.62], size: 1.8, vx: 6, vy: -3, alpha: 0.45, flicker: 2 });
  glow(ctx, 300, 180, 900, [1, 0.88, 0.6], 0.3);
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.28, grain: 0.07, gain: [1, 0.94, 0.8], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 04.2 the teaching
// from behind the crowd on the slope: heads and shoulders against the light, Christ standing below
// with the lake far beyond; Peter at the front edge, in profile, chin on his fist
const SLOPE = 0.2, HILL = crowd(42, 15);
const sitPose = (r: () => number): BodyPose => ({ bend: 0.25 + r() * 0.2, legL: { hip: 1.95 + r() * 0.15, knee: 2.6 + r() * 0.12, out: 0.08 + r() * 0.12 }, legR: { hip: 1.9 + r() * 0.15, knee: 2.62 + r() * 0.12, out: 0.08 + r() * 0.12 }, armL: { raise: 0.55 + r() * 0.3, elbow: 1.1 + r() * 0.4, out: 0.1 }, armR: { raise: 0.5 + r() * 0.3, elbow: 1.2 + r() * 0.4, out: 0.1 }, neck: { pitch: -0.05 + r() * 0.1, yaw: (r() - 0.5) * 0.3 } });
const s042 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), CH: V3 = [0.2, SLOPE * -7, -7];
  const cam = lookFrom([lerp(1.1, 0.8, n), 1.75, 2.4], [0.0, 0.0, -6.5], 175, { cy: 560, cx: 960, t, shake: 0.1 });
  begin(ctx, env);
  hillsWorld(ctx, env, { ...cam, pan0: cam.yaw }, "late", cam.focal);
  ground(ctx, env, cam, grassTex(env), { x0: -40, x1: 40, z0: -60, z1: 8, slope: SLOPE, tile: [3, 3] });
  const r = rng(420), parts: Parts[] = [];
  // the seated crowd in loose rows up the slope, all facing Him
  HILL.forEach((fg, i) => { const row = Math.floor(i / 5), col = i % 5, z = -4.4 + row * 1.35 + (r() - 0.5) * 0.5, x = (col - 2) * 1.35 + (row % 2) * 0.6 + (r() - 0.5) * 0.5; const pos: V3 = [x, SLOPE * z, z]; parts.push(fig(ctx, env, cam, fg, grounded(fg, sitPose(r), SLOPE * z), pos, faceYaw(pos, CH) + (r() - 0.5) * 0.2, t, { light: WARM, live: 0.35, paint: 0.35 })); });
  // Peter at the front edge, side-on, elbow on his knee, chin on his fist
  const PP: V3 = [-1.6, SLOPE * -5.3, -5.3];
  parts.push(fig(ctx, env, cam, PETER, grounded(PETER, { bend: 0.45, legL: { hip: 2.0, knee: 2.6, out: 0.1 }, legR: { hip: 1.7, knee: 2.3, out: 0.4 }, armR: { target: [-0.05, 0.62, 0.35], pole: [-0.4, -0.8, 0] }, armL: { raise: 0.4, elbow: 1.0 }, handR: HANDS.grip, neck: { pitch: -0.25, yaw: 0.45 } }, PP[1]), PP, faceYaw(PP, CH) - 1.1, t, { expr: { ...FACE.awe, lid: 0.9 }, light: WARM, live: 0.25, paint: 0.45 }));
  // Christ standing, one hand open toward them
  parts.push(fig(ctx, env, cam, CHRIST_FIG, { armR: { raise: 0.75 + 0.05 * Math.sin(t * 1.5), out: 0.35, elbow: 0.5 }, handR: HANDS.offer, armL: { raise: 0.15, elbow: 0.4 }, neck: { yaw: 0.15 * Math.sin(t * 0.7), pitch: 0.12 } }, CH, faceYaw(CH, [0, 0, 0]), t, { expr: { lid: 0.72, smile: 0.08, open: 0.06 + 0.06 * Math.max(0, Math.sin(t * 6)) }, light: { ...WARM, rimAmt: 0.9 }, live: 0.4, paint: 0.45 }));
  renderParts(ctx, parts, { env, cell: 2, tol: 0.05 * cam.scale, paint: 0.45 });
  motes(ctx, 92, 40, t, [0, 150, env.W, 700], { color: [1, 0.9, 0.62], size: 1.6, vx: 5, vy: -2, alpha: 0.35, flicker: 2 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.3, grain: 0.07, gain: [1, 0.94, 0.8], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 04.3 the crowd surges
// a basalt village street at midday: people suddenly rush past toward something we do not see;
// Peter, jostled, turns and stares; children weave through the legs
const RUSH = crowd(43, 15, { man: 0.45, woman: 0.3, child: 0.25 });
const s043 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), turn = easeOut(clamp((n - 0.2) / 0.45));
  const noon = { ...LIGHTS.day, key: norm3([-0.3, 0.9, 0.3]), keyAmt: 1.3, fillAmt: 0.35 };
  const cam = lookFrom([-0.4, 1.55, 3.4], [0.35, 1.45, 0], 700, { cy: 520, cx: 900, t, shake: 0.5 });
  begin(ctx, env, "#cfd8dc");
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const g = ctx.createLinearGradient(0, 0, 0, 500); g.addColorStop(0, "#8fb2cf"); g.addColorStop(1, "#dfe4dc"); ctx.fillStyle = g; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  ground(ctx, env, cam, earthTex(env, "#a8966e"), { x0: -30, x1: 30, z0: -8, z1: 12, tile: [3, 3] });
  const st = softTex(env, streetTex(env, "far"), "tex:street:far", 3); for (const X of [-18, -6, 6]) card(ctx, env, cam, st, { at: [X, 0, -4.2], w: 12, h: 4, cols: 6 });
  const parts: Parts[] = [];
  RUSH.forEach((fg, i) => { const r = rng(4300 + i), z = -3.4 + r() * 4.6, sp = 2.4 + r() * 1.4, x = -6 + ((t * sp + r() * 12) % 14); parts.push(fig(ctx, env, cam, fg, walk(t * sp * 0.75 + r(), 1.25, { bend: 0.15, neck: { pitch: -0.05 } }), [x, 0, z], Math.PI / 2 + (r() - 0.5) * 0.3, t, { light: noon, live: 0.3, paint: 0.4 })); });
  const jostle = Math.sin(clamp((n - 0.1) / 0.2) * Math.PI) * 0.12;
  parts.push(fig(ctx, env, cam, PETER, { side: jostle, twist: lerp(0, 0.5, turn), neck: { yaw: lerp(0, 0.6, turn), pitch: 0 }, armL: { raise: 0.2 + jostle, elbow: 0.4, out: 0.2 }, armR: { raise: 0.1, elbow: 0.3 } }, [0, 0, 0], lerp(0.2, 0.9, turn), t, { expr: blendFace(FACE.neutral, { ...FACE.amazed, gazeX: 0.2 }, turn), light: noon, live: 0.3 }));
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.55 });
  motes(ctx, 93, 50, t, [0, 700, env.W, 1080], { color: [0.8, 0.72, 0.58], size: 2.5, vx: 90, vy: -10, alpha: 0.35 });
  finish(ctx, env, s.abs, { bloom: 0.2, vignette: 0.22, grain: 0.07, gain: [1, 0.98, 0.93], gainAmt: 0.1, contrast: 0.08 });
};

// ---------------------------------------------------------------- 04.4 the storm
// night squall, from inside the heeling boat: the horizon swings, black swells heave past the rail,
// spray bursts over the gunwale onto Peter clinging there; then at once the wind drops, glass-still
const s044 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), calm = smooth(0.72, 0.82, n), storm = 1 - calm, T = t;
  const heel = storm * (0.2 * Math.sin(T * 3.1 + 0.6) + 0.07 * Math.sin(T * 7.3)) + calm * 0.02 * Math.sin(T * 1.2), BOAT: V3 = [0, 0, 0];
  const cam = lookFrom(onBoat(BOAT, 0, [-1.6, 1.3, -0.5]), onBoat(BOAT, 0, [0.6, 0.85, 1.4]), 520, { cy: 540, cx: 960, t, shake: 1.8 * storm, roll: heel });
  begin(ctx, env);
  lakeWorld(ctx, env, cam, calm > 0.5 ? "night" : "storm", { t });
  const hy = wproj(cam, env, [8, 0, 60])[1];
  // the swells: filled dark masses rolling past beyond the rail, their crests torn white
  if (storm > 0.01) { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.translate(env.W / 2, hy); ctx.rotate(-heel); for (let k = 0; k < 5; k++) { const base = 10 + k * 55, ph = T * (1.3 + k * 0.25) + k * 1.7, amp = (40 + k * 22) * storm; ctx.fillStyle = `rgb(${18 + k * 5},${25 + k * 6},${34 + k * 7})`; ctx.beginPath(); ctx.moveTo(-1400, 900); for (let x = -1400; x <= 1400; x += 16) { const w = Math.max(0, Math.sin(x * 0.0035 + ph)); ctx.lineTo(x, base - amp * w ** 2 - 8 * Math.sin(x * 0.02 + ph * 2)); } ctx.lineTo(1400, 900); ctx.closePath(); ctx.fill(); for (let x = -1400; x <= 1400; x += 16) { const w = Math.max(0, Math.sin(x * 0.0035 + ph)); if (w > 0.85) { ctx.fillStyle = `rgba(190,200,210,${0.5 * storm * (w - 0.85) * 6})`; ctx.fillRect(x - 10, base - amp * w ** 2 - 6, 26, 5); } } } ctx.restore(); }
  const light = LIGHTS.moonNight, boat = boatAt(ctx, env, cam, BOAT, 0, t, { light, rock: 0, roll: heel * 0.25, seed: 3 });
  const pp = onBoat(BOAT, 0, [0.7, -0.35, 0.45]);
  const peter = fig(ctx, env, cam, PETER, grounded(PETER, { bend: 0.5 * storm + 0.15, side: -heel * 1.2, legL: { hip: 0.9, knee: 1.4 }, legR: { hip: 0.5, knee: 1.1 }, armL: { target: [0.25, 0.95, 0.35], pole: [0.6, -0.4, -0.4] }, armR: { target: [-0.25, 0.95, 0.4], pole: [-0.6, -0.4, -0.4] }, handL: HANDS.grip, handR: HANDS.grip, neck: { pitch: 0.45 * storm - 0.12 * calm, yaw: 0.25 * calm } }, -0.35), pp, 0.35, t, { expr: storm > 0.5 ? { ...FACE.frightened, squint: 0.7, lid: 0.45 } : { ...FACE.amazed, lid: 1 }, light: { ...light, keyAmt: storm > 0 && Math.abs(T - 0.35) < 0.06 ? 1.6 : light.keyAmt }, live: 0.2 });
  renderParts(ctx, [boat, peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.5, fx: { waterY: waterAt(cam, env, onBoat(BOAT, 0, [0, 0, 1.3])) } });
  if (storm > 0.01) {
    ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    // rain driven sideways, a sheet of spray over the gunwale
    const r = rng(Math.floor(t * 30) + 91); ctx.strokeStyle = `rgba(180,192,210,${0.45 * storm})`; ctx.lineWidth = 1.3; for (let i = 0; i < 300; i++) { const x = r() * env.W, y = r() * env.H, l = 30 + r() * 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l * 0.55, y + l); ctx.stroke(); }
    const gw = wproj(cam, env, onBoat(BOAT, 0, [0.9, boatGunwale(0.9), 1.1])), burst = (T * 1.6) % 1;
    for (let i = 0; i < 160; i++) { const a = -Math.PI / 2 - 0.9 + r() * 0.9, v = 500 + r() * 900, px = gw[0] + (r() - 0.5) * 500 + Math.cos(a) * v * burst, py = gw[1] + Math.sin(a) * v * burst + 900 * burst * burst; ctx.fillStyle = `rgba(200,212,225,${0.7 * storm * (1 - burst)})`; ctx.beginPath(); ctx.arc(px, py, 1.5 + r() * 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    lensDrops(ctx, env, 0.75 * storm, 95 + Math.floor(T * 5));
    const flash = Math.max(0, 1 - Math.abs(T - 0.35) * 14) * storm; if (flash > 0) { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = `rgba(215,228,255,${0.5 * flash})`; ctx.fillRect(0, 0, env.W, env.H); ctx.restore(); }
  }
  finish(ctx, env, s.abs, { bloom: 0.2, vignette: 0.42, grain: 0.09, gain: [0.78, 0.86, 1], gainAmt: 0.3, contrast: 0.1 * storm });
};

// ---------------------------------------------------------------- 04.5 who is this man?
// in the stillness, from across the boat at eye level: Peter's astonished glance to Andrew beside
// him, then back toward the bow where Christ stands (off frame), and he does not blink; the sea glassy
// behind him and the first warm glow along the far hills
const s045 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), BOAT: V3 = [0, 0, 0], toA = smooth(0.1, 0.24, n) * (1 - smooth(0.42, 0.56, n)), toC = smooth(0.48, 0.64, n);
  const pp = onBoat(BOAT, 0, [0.35, 0.1, 0.45]), PY = Math.PI / 2 + 0.95;
  const pose: BodyPose = grounded(PETER, { bend: 0.12, legL: { hip: 1.45, knee: 1.55 }, legR: { hip: 1.4, knee: 1.5 }, armL: { raise: 0.3, elbow: 1.0 }, armR: { raise: 0.35, elbow: 1.1 }, neck: { yaw: lerp(0, -0.75, toA) * (1 - toC) + lerp(0, 0.55, toC), pitch: -0.06 } }, 0.1);
  const face = worldJoint(PETER, pose, pp, PY, "face");
  const cam = lookFrom([face[0] + 0.2, face[1] + 0.25, face[2] - 1.35], [face[0], face[1] - 0.03, face[2]], lerp(1450, 1560, n), { cy: 470, cx: 900, t, shake: 0.06 });
  begin(ctx, env);
  lakeWorld(ctx, env, cam, "night", { t, mist: 0.12, blur: 0.85 });
  const hy = wproj(cam, env, [0, 0, 400])[1];
  glow(ctx, 1500, hy, 1100, [1, 0.72, 0.45], 0.3 * smooth(0.15, 1, n));
  const light = { ...LIGHTS.moonNight, key: norm3([0.45, 0.55, 0.7]), keyColor: [0.68, 0.78, 1.0] as [number, number, number], keyAmt: 1.15, fillAmt: 0.5, rim: norm3([-0.75, 0.15, -0.6]), rimColor: [1, 0.72, 0.45] as [number, number, number], rimAmt: 0.25 + 0.5 * smooth(0.2, 1, n) };
  const boat = boatAt(ctx, env, cam, BOAT, 0, t, { light, rock: 0.25, seed: 3 });
  const andrew = fig(ctx, env, cam, ANDREW_FIG, grounded(ANDREW_FIG, { bend: 0.15, legL: { hip: 1.45, knee: 1.55 }, legR: { hip: 1.4, knee: 1.5 }, neck: { yaw: 0.4 * (1 - toC), pitch: -0.05 } }, 0.1), onBoat(BOAT, 0, [-0.75, 0.1, 0.6]), Math.PI / 2 + 0.4, t, { expr: FACE.amazed, light, live: 0.3, paint: 0.4 });
  renderParts(ctx, [boat, andrew], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.45, fx: { blur: 3.5 } });
  const peter = fig(ctx, env, cam, PETER, pose, pp, PY, t, { expr: { ...FACE.amazed, gazeX: -0.45 * toA * (1 - toC) + 0.3 * toC, gazeY: 0.05, lid: 1.0, open: 0.1 }, light, live: 0.04 });
  renderParts(ctx, [peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.38, grain: 0.08, gain: [0.82, 0.9, 1.05], gainAmt: 0.25 });
};

register({ "04.1": s041, "04.2": s042, "04.3": s043, "04.4": s044, "04.5": s045 });
void boatGunwale; void extra; void shaft; void easeInOut;
