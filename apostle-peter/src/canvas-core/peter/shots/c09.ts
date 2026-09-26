// CLIP 09 — PENTECOST AND THE APOSTLE. «Μετά την Πεντηκοστή, ο Πέτρος γέμισε με τη δύναμη του Αγίου Πνεύματος. Από φοβισμένος άνθρωπος έγινε γενναίος κήρυκας της πίστης. Κήρυξε στα Ιεροσόλυμα και χιλιάδες άνθρωποι πίστεψαν στον Χριστό. Θεράπευσε ασθενείς, στήριξε τους πρώτους χριστιανούς και ταξίδεψε για να διαδώσει το Ευαγγέλιο.»
import type { Env } from "../../core";
import { rng } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose, type Figure } from "../figure/body";
import { PETER_FIG, JOHN_FIG, ANDREW_FIG, JAMES_FIG, THOMAS_FIG, PHILIP_FIG, MATTHEW_FIG } from "../figure/cast";
import { crowd, extra } from "../figure/extras";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { oilLamp, flame } from "../paint/props";
import { hillsWorld } from "../sets/galilee";
import { lakeWorld } from "../sets/lake";
import { ground, card, boardTex, plasterTex, earthTex, grassTex, flagTex, templeWallTex, crowdTex, crowdTopTex, stairs, streetTex, softTex, trees, pebbleTex } from "../sets/stage";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, easeOut, smooth, norm3 } from "../lib/math";
import { fig, boatAt, lookFrom, faceYaw, worldJoint, shadow, keyFrom, dirView, toLocal, waterAt, type Light } from "./kit";

const PC = PETER_FIG.C, HOODED: Figure = { ...PC, costume: { ...PC.costume, hood: 1 } }, PD = PETER_FIG.D;
const DAY = (cam: WCam, amt = 1): Light => ({ ...LIGHTS.romeDay, key: dirView(cam, [-0.5, 0.75, 0.45]), keyAmt: 1.15 * amt, fillAmt: 0.45, rim: dirView(cam, [0.6, 0.3, -0.7]), rimAmt: 0.3 });

// ---------------------------------------------------------------- the upper room
// 8 x 6 m, plastered, beams, lamps on stands; the disciples sitting close in the dark
const LAMPS: V3[] = [[-2.2, 1.1, -1.4], [1.9, 1.05, -1.6], [0.2, 1.1, 1.5]];
const ROOMERS: [Figure, V3, number][] = [[JOHN_FIG, [-1.3, 0, -1.1], 0.6], [ANDREW_FIG, [1.4, 0, -1.0], -0.5], [JAMES_FIG, [-1.8, 0, 0.4], 1.3], [THOMAS_FIG, [1.9, 0, 0.5], -1.3], [PHILIP_FIG, [0.4, 0, -1.8], 0.1], [MATTHEW_FIG, [-0.6, 0, 1.8], 2.9], [extra(901, "woman"), [1.1, 0, 1.6], -2.6]];
const room = (ctx: Ctx2, env: Env, cam: WCam, warm: number) => {
  begin(ctx, env, "#0b0907");
  ground(ctx, env, cam, boardTex(env, "#5e4430"), { x0: -4, x1: 4, z0: -3, z1: 3, tile: [3, 3] });
  const pl = plasterTex(env, "#b8a88a", true);
  card(ctx, env, cam, pl, { at: [0, 0, -3], w: 8, h: 3.2, cols: 6 }); card(ctx, env, cam, pl, { at: [-4, 0, 0], w: 6, h: 3.2, yaw: Math.PI / 2, cols: 5 }); card(ctx, env, cam, pl, { at: [4, 0, 0], w: 6, h: 3.2, yaw: -Math.PI / 2, cols: 5 }); card(ctx, env, cam, pl, { at: [0, 0, 3], w: 8, h: 3.2, yaw: Math.PI, cols: 6 });
  // lamp-dark: the room is in shadow except where the lamps (and later the light) reach
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgb(${Math.round(lerp(70, 210, warm))},${Math.round(lerp(58, 150, warm))},${Math.round(lerp(52, 100, warm))})`; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
};
const lamps = (ctx: Ctx2, env: Env, cam: WCam, t: number, bend = 0) => { for (const [i, p] of LAMPS.entries()) { const s = wproj(cam, env, p), sc = wplace(cam, env, p, 0).scale; if (cam.focal && cam.focal / cam.scale - s[2] / cam.scale < 0.2) continue; glow(ctx, s[0], s[1] - 0.05 * sc, 1.2 * sc, [1, 0.62, 0.3], 0.35); oilLamp(ctx, s[0], s[1], 0.14 * sc, t, 90 + i); ctx.save(); ctx.translate(s[0] + 0.1 * sc, s[1] - 0.03 * sc); ctx.rotate(bend * 1.2); flame(ctx, 0, 0, 0.1 * sc * (1 - 0.4 * bend), t * (1 + 3 * bend), 91 + i, { n: 3 }); ctx.restore(); } };
const lampLight = (cam: WCam, p: V3, warm = 0): Light => ({ ...LIGHTS.lamp, key: keyFrom(cam, [p[0], 1.3, p[2]], LAMPS[0]), keyAmt: 0.9, fillAmt: 0.3 + 0.3 * warm, keyColor: [1, 0.66, 0.34] });
const roomers = (ctx: Ctx2, env: Env, cam: WCam, t: number, L: (p: V3) => Light, wind = 0): Parts[] => ROOMERS.map(([f, p, y], i) => fig(ctx, env, cam, f, grounded(f, { bend: 0.35 - 0.25 * wind, legL: { hip: 1.9, knee: 2.55, out: 0.2 }, legR: { hip: 1.85, knee: 2.6, out: 0.2 }, armL: { raise: 0.55 + 0.6 * wind, elbow: 1.2 - 0.6 * wind }, armR: { raise: 0.5 + 0.5 * wind, elbow: 1.1 - 0.5 * wind }, neck: { pitch: 0.35 - 0.5 * wind, yaw: 0.2 * Math.sin(i) } }), p, y, t, { light: L(p), live: 0.3, paint: 0.4, expr: wind > 0.5 ? FACE.awe : { ...FACE.ashamed, gazeY: -0.4 } }));
const PP09: V3 = [0.1, 0, 0.2], PY09 = Math.PI - 0.2;
const seatPose = (lift: number): BodyPose => grounded(PC, { bend: lerp(0.45, 0.08, lift), legL: { hip: 1.9, knee: 2.55, out: 0.2 }, legR: { hip: 1.85, knee: 2.6, out: 0.2 }, armL: { raise: 0.6, elbow: 1.2 }, armR: { raise: 0.55, elbow: 1.2 }, neck: { pitch: lerp(0.35, -0.12, lift) } });

// ---------------------------------------------------------------- 09.1 the frightened man, once more
const s091 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, pose = seatPose(0), face = worldJoint(HOODED, pose, PP09, PY09, "face"), fwd: V3 = [Math.sin(PY09 + 0.25), 0, Math.cos(PY09 + 0.25)];
  const cam = lookFrom([face[0] + fwd[0] * 0.6, face[1] + 0.08, face[2] + fwd[2] * 0.6], [face[0], face[1] + 0.028, face[2]], 6800, { cy: 540, cx: 960, t, shake: 0.05 });
  room(ctx, env, cam, 0);
  const L = { ...lampLight(cam, PP09), keyAmt: 0.75, fillAmt: 0.35 };
  renderParts(ctx, [fig(ctx, env, cam, HOODED, pose, PP09, PY09, t, { expr: { ...FACE.frightened, gazeY: -0.45, lid: 0.55 }, light: L, live: 0.1 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  finish(ctx, env, s.abs, { bloom: 0.2, vignette: 0.55, grain: 0.1, gain: [0.95, 0.85, 0.75], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 09.2 the wind and the light
// a rushing wind: the lamp flames bend flat, mantles lift, his hood is blown back; warm light pours
// across the room and the faces, and fire-like light shines in his eyes. He lifts his head.
const s092 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), wind = smooth(0.08, 0.3, n) * (1 - 0.3 * smooth(0.8, 1, n)), light = smooth(0.2, 0.6, n), lift = smooth(0.45, 0.8, n);
  const pose = seatPose(lift), face = worldJoint(PC, pose, PP09, PY09, "face"), fwd: V3 = [Math.sin(PY09 + 0.4), 0, Math.cos(PY09 + 0.4)];
  const cam = lookFrom([face[0] + fwd[0] * 1.4, face[1] + 0.05 - 0.1 * lift, face[2] + fwd[2] * 1.4], [face[0], face[1] - 0.05, face[2]], lerp(1500, 1650, n), { cy: 500, cx: 960, t, shake: 0.2 + 0.8 * wind * (1 - light * 0.5) });
  room(ctx, env, cam, light);
  // the light sweeps across from the left, warm, with the dust in it
  const sx = lerp(-600, env.W * 0.35, light);
  glow(ctx, sx, 350, 1400, [1, 0.72, 0.38], 0.55 * light);
  shaft(ctx, sx, -100, sx + 900, 1180, 80, 900, [1, 0.75, 0.4], 0.25 * light);
  lamps(ctx, env, cam, t, wind);
  const L: Light = light < 0.02 ? lampLight(cam, PP09) : { ...LIGHTS.pentecost, key: dirView(cam, [-0.8, 0.35, 0.35]), keyAmt: lerp(0.8, 1.5, light), fillAmt: 0.45 + 0.2 * light, rimAmt: 0.6 * light };
  const hood = wind < 0.35;
  const parts = [...roomers(ctx, env, cam, t, (p) => ({ ...L, key: keyFrom(cam, [p[0], 1.1, p[2]], [-3.5, 2.2, 0]) }), wind), fig(ctx, env, cam, hood ? HOODED : PC, pose, PP09, PY09, t, { expr: blendFace({ ...FACE.frightened, gazeY: -0.4 }, { ...FACE.determined, lid: 0.95, gazeX: -0.1, gazeY: 0.05 }, lift), light: L, live: 0.2 })];
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  // the fire-like light in his eyes: two warm catchlights
  const ey = wproj(cam, env, [face[0], face[1] + 0.03, face[2]]); if (lift > 0.3) { glow(ctx, ey[0] - 0.035 * cam.scale, ey[1], 26, [1, 0.75, 0.4], 0.5 * lift); glow(ctx, ey[0] + 0.035 * cam.scale, ey[1], 26, [1, 0.75, 0.4], 0.5 * lift); }
  motes(ctx, 92, 60, t, [0, 0, env.W, env.H], { color: [1, 0.8, 0.5], size: 2.2, vx: 260 * wind, vy: -10, alpha: 0.5 * light, flicker: 2 });
  finish(ctx, env, s.abs, { bloom: 0.3 + 0.2 * light, vignette: 0.45 - 0.15 * light, grain: 0.08, gain: [1, lerp(0.85, 0.82, light), lerp(0.75, 0.6, light)], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 09.3 toward the crowd
// 07.1 turned round: from the dark inside, low behind him, he steps out of the doorway into the blazing
// street and toward the people, instead of hiding among them
const DOOR = (env: Env) => plate2(env);
import { plate } from "../paint/plates";
const plate2 = (env: Env) => plate(env, "tex:doorway", 800, 400, (s) => { const c = s.ctx; c.fillStyle = "#1a140f"; c.fillRect(0, 0, 800, 400); const g = c.createLinearGradient(0, 0, 800, 0); g.addColorStop(0, "rgba(60,44,30,0.6)"); g.addColorStop(0.5, "rgba(20,14,10,0)"); g.addColorStop(1, "rgba(60,44,30,0.6)"); c.fillStyle = g; c.fillRect(0, 0, 800, 400); c.clearRect(330, 130, 140, 270); c.fillStyle = "rgba(255,240,210,0.5)"; c.fillRect(322, 125, 156, 5); });
const s093 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), go = easeInOut(clamp(n / 0.9));
  const cam = lookFrom([0.15, 0.95, 3.2], [0, 1.45, -6], 170, { cy: 520, cx: 960, t, shake: 0.12 });
  begin(ctx, env, "#f4ecd8");
  // outside, overexposed: the street, the houses, a crowd turning toward him
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const sg = ctx.createLinearGradient(0, 0, 0, env.H); sg.addColorStop(0, "#cfe0ea"); sg.addColorStop(0.6, "#f6efdc"); ctx.fillStyle = sg; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  ground(ctx, env, cam, earthTex(env, "#c8b48c"), { x0: -30, x1: 30, z0: -40, z1: 1, tile: [3, 3] });
  card(ctx, env, cam, streetTex(env, "bright", { sun: -1, lit: 1.3 }), { at: [-8, 0, -14], w: 12, h: 4, cols: 5 }); card(ctx, env, cam, streetTex(env, "bright", { sun: -1, lit: 1.3 }), { at: [5, 0, -15], w: 12, h: 4, cols: 5 });
  for (let i = 0; i < 4; i++) card(ctx, env, cam, crowdTex(env, 930 + i, 1), { at: [(i % 2) * 6 - 3, 0, -9 - i * 1.3], w: 20, h: 2, cols: 4 });
  const pos: V3 = [0, 0, lerp(1.4, -3.6, go)], L: Light = { ...DAY({ ...cam } as WCam), key: dirView(cam, [0.2, 0.6, -0.8]), keyAmt: 1.4, rimAmt: 1.2, rim: dirView(cam, [0, 0.4, -1]), rimColor: [1, 0.97, 0.88] };
  renderParts(ctx, [fig(ctx, env, cam, PC, walk(t * 0.9, 1, {}), pos, Math.PI, t, { light: L, live: 0.3 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.5 });
  // the dark doorway around us: a wall with the door cut in it (drawn last: we are inside)
  card(ctx, env, cam, DOOR(env), { at: [0, -0.6, -0.9], w: 8, h: 4, cols: 4 });
  ground(ctx, env, cam, boardTex(env, "#3a2a1e"), { x0: -4, x1: 4, z0: -0.9, z1: 4, tile: [3, 3], alpha: 0.95 });
  glow(ctx, 960, 560, 700, [1, 0.97, 0.88], 0.35);
  finish(ctx, env, s.abs, { bloom: 0.55, vignette: 0.4, grain: 0.07, gain: [1, 0.98, 0.92], gainAmt: 0.1 });
};

// ---------------------------------------------------------------- the southern steps
// the wall of the Temple Mount (z = -20) with the Huldah gates; the great stair from its foot down to the
// plaza; Peter on a landing a third of the way down; the people below him, their backs to us
const PS: V3 = [0, 3.0, -15.5], STEP = { z0: -20, z1: -8, top: 4.5, n: 30 };
const stepY = (z: number) => z < STEP.z0 ? STEP.top : z > STEP.z1 ? 0 : STEP.top * (1 - Math.ceil(((z - STEP.z0) / (STEP.z1 - STEP.z0)) * STEP.n) / STEP.n);
const steps = (ctx: Ctx2, env: Env, cam: WCam, t: number, blur = 0) => {
  begin(ctx, env);
  hillsWorld(ctx, env, { ...cam, pan0: cam.yaw }, "day", cam.focal, blur);
  ground(ctx, env, cam, flagTex(env, "#cbbd9e"), { x0: -60, x1: 60, z0: STEP.z1, z1: 60, tile: [4, 4] });
  const tw = blur > 0.3 ? softTex(env, templeWallTex(env), "tex:temple", 8) : templeWallTex(env);
  card(ctx, env, cam, tw, { at: [0, STEP.top - 3, STEP.z0 - 0.02], w: 90, h: 30, cols: 12 });
  ground(ctx, env, cam, flagTex(env, "#d4c6a6"), { x0: -45, x1: 45, z0: STEP.z0 - 0.02, z1: STEP.z0 + 0.02, y: STEP.top, tile: [4, 4] });
  const tr = flagTex(env, "#d8cbab"), rs = plasterTex(env, "#b4a584");
  stairs(ctx, env, cam, tr, rs, { x0: -30, x1: 30, z0: STEP.z0, z1: STEP.z1, top: STEP.top, n: STEP.n });
  void t;
};
const HEARERS = crowd(95, 26, { man: 0.5, woman: 0.32, elder: 0.12, child: 0.06 });
const hearers = (ctx: Ctx2, env: Env, cam: WCam, t: number, L: Light, kneel = 0): Parts[] => HEARERS.map((f, i) => { const r = rng(9500 + i), z = PS[2] + 2.5 + (i % 7) * 1.1 + r() * 0.5, x = ((i * 1.7) % 11) - 5.5 + r() * 0.6, y = stepY(z), kn = kneel > 0 && r() < 0.3; const p: V3 = [x, y, z]; const pose: BodyPose = kn ? grounded(f, { legL: { hip: 0.2, knee: 1.8 }, legR: { hip: 1.4, knee: 1.5 }, bend: 0.2, neck: { pitch: -0.25 } }, y) : { neck: { pitch: -0.28, yaw: (r() - 0.5) * 0.3 } }; return fig(ctx, env, cam, f, kn ? pose : { ...pose, root: [0, 0, 0] }, kn ? [x, 0, z] : p, faceYaw(p, PS) + (r() - 0.5) * 0.2, t, { light: L, live: 0.3, paint: 0.35 }); });
const preach = (t: number, k = 1): BodyPose => ({ armR: { raise: 0.85 + 0.2 * Math.sin(t * 1.3) * k, out: 0.45, elbow: 0.35 }, handR: HANDS.open, armL: { raise: 0.5 + 0.25 * Math.sin(t * 1.1 + 1) * k, out: 0.35, elbow: 0.5 }, handL: HANDS.open, neck: { pitch: 0.05, yaw: 0.15 * Math.sin(t * 0.6) } });

// ---------------------------------------------------------------- 09.4 preaching
const s094 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), pose = preach(t), face = worldJoint(PC, pose, PS, 0, "face");
  const cam = lookFrom([face[0] + 0.5, face[1] - 0.35, face[2] + 2.2], [face[0], face[1] - 0.18, face[2]], lerp(1100, 1180, n), { cy: 500, cx: 980, t, shake: 0.08 });
  steps(ctx, env, cam, t, 1);
  const L = DAY(cam);
  renderParts(ctx, [fig(ctx, env, cam, PC, pose, PS, 0, t, { expr: { ...FACE.confident, open: 0.08 + 0.1 * Math.max(0, Math.sin(t * 6)), lid: 0.9 }, light: L, live: 0.3 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.28, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 09.5 thousands
// the crane: back and up from Peter until the steps and the plaza are full, thousands, still and
// listening; some kneel
const s095 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), c = easeInOut(n), pose = preach(t, 0.6);
  const eye: V3 = [lerp(1.2, 3, c), lerp(PS[1] + 1.5, 24, c), lerp(PS[2] + 3.2, 38, c)], at: V3 = [lerp(PS[0], 0, c), lerp(PS[1] + 1.3, 4, c), lerp(PS[2], -4, c)];
  const cam = lookFrom(eye, at, Math.exp(lerp(Math.log(420), Math.log(38), c)), { cy: 520, cx: 960, t, shake: 0.05 });
  steps(ctx, env, cam, t);
  const L = DAY(cam);
  // the multitude: painted rows filling the lower steps and the plaza, backs to us, facing him
  ground(ctx, env, cam, crowdTopTex(env, 951), { x0: -40, x1: 40, z0: STEP.z1, z1: 55, y: 1.3, tile: [6, 6] });
  for (let i = 0; i < 10; i++) { const z0 = STEP.z0 + ((i + 13) / STEP.n) * (STEP.z1 - STEP.z0); ground(ctx, env, cam, crowdTopTex(env, 951), { x0: -30, x1: 30, z0, z1: z0 + 0.8, y: STEP.top * (1 - (i + 14) / STEP.n) + 1.3, tile: [6, 6] }); }
  const parts = [...hearers(ctx, env, cam, t, L, 1), fig(ctx, env, cam, PC, pose, PS, 0, t, { expr: FACE.confident, light: L, live: 0.3, paint: 0.5 })];
  renderParts(ctx, parts, { env, cell: 2, tol: 0.04 * cam.scale, paint: 0.45 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.25, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 09.6 he helps a man rise
// at the gate, a lame man sitting against the wall; Peter takes his right hand and lifts him; the
// man's weight comes onto his feet (the healing is in the hands)
const LAME = extra(960, "man");
const s096 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), grip = smooth(0.12, 0.3, n), up = easeInOut(clamp((n - 0.35) / 0.45)), close = easeInOut(clamp((n - 0.28) / 0.3));
  const PP: V3 = [0.3, 0, 1.2], LM: V3 = [-0.35, 0, 0.55], PY = faceYaw(PP, LM), LY = faceYaw(LM, PP);
  const lame: BodyPose = up < 0.02 ? grounded(LAME, { bend: 0.2, legL: { hip: 1.5, knee: 0.5 }, legR: { hip: 1.4, knee: 0.4 }, armL: { raise: 0.2, elbow: 0.4 }, neck: { pitch: -0.25 } }) : grounded(LAME, { bend: lerp(0.35, 0.05, up), legL: { hip: lerp(1.5, 0.05, up), knee: lerp(0.5, 0.05, up) }, legR: { hip: lerp(1.4, 0.1, up), knee: lerp(0.4, 0.1, up) }, neck: { pitch: lerp(-0.3, -0.1, up) } });
  const lr = grounded(LAME, lame).root ?? [0, 0, 0];
  const H: V3 = [lerp(LM[0], PP[0], 0.45), lerp(0.62, 1.12, up) + 0.15 * grip * (1 - up), lerp(LM[2], PP[2], 0.45)];
  const lp = { ...lame, armR: { target: toLocal([LM[0], 0, LM[2]], LY, H), pole: [-0.5, -0.6, -0.2] as V3 }, handR: HANDS.grip };
  const pp: BodyPose = { bend: lerp(0.55, 0.2, up), legL: { hip: 0.3 * (1 - up), knee: 0.5 * (1 - up) }, armR: { target: toLocal(PP, PY, H), pole: [-0.5, -0.6, -0.2] }, handR: HANDS.grip, armL: { raise: 0.35 + 0.3 * up, elbow: 0.8, out: 0.2 }, neck: { pitch: lerp(0.4, 0.15, up) } };
  const med = lookFrom([2.2, 1.3, 3.3], [0, 0.8, 0.8], 330, { cy: 540, cx: 960 }), cu = lookFrom([H[0] - 0.85, H[1] + 0.15, H[2] + 0.85], H, 1500, { cy: 540, cx: 960 });
  const m = (a: number, b: number) => lerp(a, b, close), cam: WCam = { target: [m(med.target[0], cu.target[0]), m(med.target[1], cu.target[1]), m(med.target[2], cu.target[2])], scale: Math.exp(m(Math.log(med.scale), Math.log(cu.scale))), yaw: m(med.yaw, cu.yaw), tilt: m(med.tilt, cu.tilt), focal: Math.exp(m(Math.log(med.focal!), Math.log(cu.focal!))), cy: 540, cx: 960, t, shake: 0.06 };
  begin(ctx, env);
  hillsWorld(ctx, env, { ...cam, pan0: cam.yaw }, "day", cam.focal, close);
  ground(ctx, env, cam, flagTex(env, "#c8b898"), { x0: -30, x1: 30, z0: -2, z1: 20, tile: [4, 4] });
  card(ctx, env, cam, close > 0.5 ? softTex(env, templeWallTex(env), "tex:temple", 8) : templeWallTex(env), { at: [-8, -1.5, -0.6], w: 90, h: 30, cols: 10 });
  const L = DAY(cam);
  renderParts(ctx, [fig(ctx, env, cam, LAME, { ...lp, root: lr }, LM, LY, t, { expr: blendFace({ ...FACE.vulnerable, gazeY: 0.2 }, FACE.amazed, up), light: L, live: 0.3 }), fig(ctx, env, cam, PC, pp, PP, PY, t, { expr: { ...FACE.peaceful, lid: 0.85 }, light: L, live: 0.3 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.3, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 09.7 the first Christians
// a house courtyard in the warm late day: they share bread; Peter breaks a loaf and passes it, then
// steadies an old woman's arm as she rises
const BELIEVERS: [Figure, V3][] = [[extra(970, "woman"), [-1.2, 0, -0.6]], [extra(971, "man"), [1.1, 0, -0.7]], [extra(972, "elder"), [-0.3, 0, -1.3]], [extra(973, "child"), [0.6, 0, -1.2]], [extra(974, "man"), [1.6, 0, 0.3]], [extra(975, "woman"), [-1.8, 0, 0.3]]];
const OLD = extra(976, "elder");
const s097 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), brk = smooth(0.08, 0.3, n), pass = smooth(0.3, 0.5, n), steady = smooth(0.6, 0.8, n);
  const cam = lookFrom([0.4, 1.35, 3.6], [0, 0.9, -0.3], 340, { cy: 540, cx: 960, t, shake: 0.06 });
  begin(ctx, env);
  const L: Light = { ...LIGHTS.lateDay, key: dirView(cam, [0.8, 0.35, 0.35]), rimAmt: 0.6 };
  ground(ctx, env, cam, flagTex(env, "#b8a07c"), { x0: -6, x1: 6, z0: -4, z1: 6, tile: [4, 4] });
  card(ctx, env, cam, plasterTex(env, "#d8c49c"), { at: [0, 0, -4], w: 12, h: 4.8, cols: 6 }); card(ctx, env, cam, plasterTex(env, "#d8c49c"), { at: [-5, 0, 0], w: 8, h: 4.8, yaw: Math.PI / 2, cols: 5 });
  shaft(ctx, 1500, -100, 700, 1100, 100, 700, [1, 0.82, 0.55], 0.18);
  const PP: V3 = [0.1, 0, 0.2], parts: Parts[] = BELIEVERS.map(([fg, p], i) => fig(ctx, env, cam, fg, grounded(fg, { bend: 0.25, legL: { hip: 1.9, knee: 2.55 }, legR: { hip: 1.85, knee: 2.6 }, armL: { raise: 0.5, elbow: 1.1 }, armR: { raise: 0.6 + (i === 1 ? 0.4 * pass : 0), elbow: 1.0 }, neck: { pitch: 0.15, yaw: 0.2 * Math.sin(i + t * 0.5) } }), p, faceYaw(p, PP), t, { light: L, live: 0.35, paint: 0.4, expr: { smile: 0.2, lid: 0.8 } }));
  const OP: V3 = [0.9, 0, 0.9], opose = grounded(OLD, { bend: lerp(0.5, 0.2, steady), legL: { hip: lerp(1.2, 0.2, steady), knee: lerp(1.6, 0.2, steady) }, legR: { hip: lerp(1.1, 0.1, steady), knee: lerp(1.5, 0.1, steady) }, armL: { raise: 0.4, elbow: 0.5 } });
  parts.push(fig(ctx, env, cam, OLD, opose, OP, faceYaw(OP, PP) + 0.6, t, { light: L, live: 0.3, paint: 0.45 }));
  const ppose: BodyPose = steady < 0.05 ? { bend: 0.15, armL: { target: [0.14 + 0.1 * brk, 1.05, 0.35], pole: [0.6, -0.5, -0.3] }, armR: { target: [-0.14 - 0.1 * brk + 0.3 * pass, 1.05 + 0.05 * pass, 0.35 + 0.2 * pass], pole: [-0.6, -0.5, -0.3] }, handL: HANDS.grip, handR: HANDS.grip, neck: { pitch: 0.3 } } : { bend: 0.25, armR: { target: toLocal(PP, faceYaw(PP, OP), [OP[0] - 0.1, 1.0, OP[2] - 0.15]), pole: [-0.6, -0.5, -0.3] }, handR: HANDS.grip, armL: { raise: 0.3, elbow: 0.8 }, neck: { pitch: 0.25 } };
  parts.push(fig(ctx, env, cam, PC, ppose, PP, steady < 0.05 ? 0.35 : faceYaw(PP, OP), t, { expr: { ...FACE.peaceful, smile: 0.25 }, light: L, live: 0.3 }));
  renderParts(ctx, parts, { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.5 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.3, grain: 0.07, gain: [1, 0.92, 0.8], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 09.8 the long road
// very wide: a lone traveller on the coast road, small against the hills and the sea
const s098 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const cam = lookFrom([4, 7, 42], [0, 0.5, -4], 22, { cy: 480, cx: 960, t, pan0: 0 });
  begin(ctx, env);
  lakeWorld(ctx, env, cam, "day", { t, mist: 0.15 });
  ground(ctx, env, cam, pebbleTex(env, 1024), { x0: -140, x1: 140, z0: -12, z1: -9, tile: [2, 2] });
  ground(ctx, env, cam, grassTex(env, "#9a9460"), { x0: -140, x1: 140, z0: -9, z1: 70, tile: [3, 3] });
  ground(ctx, env, cam, earthTex(env, "#cdb68a"), { x0: -140, x1: 140, z0: -5.2, z1: -3.8, tile: [3, 3] });
  trees(ctx, env, cam, [{ at: [-30, 0, 2], kind: "olive", h: 5, seed: 981 }, { at: [22, 0, -1], kind: "olive", h: 4.5, seed: 982 }, { at: [-12, 0, 12], kind: "cypress", h: 9, seed: 983 }, { at: [36, 0, 8], kind: "pine", h: 11, seed: 984 }, { at: [-45, 0, 18], kind: "pine", h: 12, seed: 985 }], -1);
  const pos: V3 = [lerp(-9, 5, n), 0, -4.5];
  renderParts(ctx, [fig(ctx, env, cam, PD, walk(t * 0.9, 1, {}), pos, Math.PI / 2, t, { light: DAY(cam), live: 0.3, paint: 0.2 })], { env, cell: 2, tol: 5, paint: 0.2 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.25, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 09.9 aboard
// from the quay: he steps aboard a small merchant ship; the sail fills
const s099 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), step = easeInOut(clamp((n - 0.1) / 0.35)), fill = smooth(0.45, 0.9, n);
  const cam = lookFrom([4.5, 2.6, 7], [0.3, 2.2, -2.8], 150, { cy: 520, cx: 960, t, shake: 0.06 });
  begin(ctx, env);
  lakeWorld(ctx, env, cam, "day", { t });
  // the quay: a stone platform 1 m above the water along the near side
  ground(ctx, env, cam, flagTex(env, "#bba88a"), { x0: -30, x1: 30, z0: -0.2, z1: 20, y: 1.0, tile: [4, 4] });
  card(ctx, env, cam, streetTex(env, "quay", { sun: -1, lit: 1.1 }), { at: [0, -0.4, -0.2], w: 60, h: 1.4, cols: 8 });
  const L = DAY(cam), SHIP: V3 = [0.5, 0, -3.2], sp = wplace(cam, env, SHIP, 0.05, { roll: Math.sin(t) * 0.02 });
  const ship = { ...boatAt(ctx, env, { ...cam, scale: cam.scale }, SHIP, 0.05, t, { light: L, seed: 7, sail: "set", fill: 0.15 + 0.85 * fill, rock: 0.4 }) };
  void sp;
  const pos: V3 = [lerp(1.8, 0.6, step), lerp(1.0, 0.25, step) + 0.25 * Math.sin(Math.PI * step), lerp(0.8, -2.6, step)];
  const peter = fig(ctx, env, cam, PD, step > 0.02 && step < 0.98 ? walk(t * 1.1, 0.9, {}) : {}, pos, Math.PI + 0.3, t, { light: L, live: 0.3, paint: 0.45 });
  renderParts(ctx, [ship], { env, cell: 2, tol: 0.04 * cam.scale, paint: 0.45, fx: { waterY: waterAt(cam, env, [SHIP[0], 0, SHIP[2] + 1.2]), reflect: t } });
  renderParts(ctx, [peter], { env, cell: 2, tol: 0.04 * cam.scale, paint: 0.5 });
  finish(ctx, env, s.abs, { bloom: 0.3, vignette: 0.25, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

register({ "09.1": s091, "09.2": s092, "09.3": s093, "09.4": s094, "09.5": s095, "09.6": s096, "09.7": s097, "09.8": s098, "09.9": s099 });
void norm3; void easeOut; void shadow;
