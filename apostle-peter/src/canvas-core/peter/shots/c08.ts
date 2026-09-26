// CLIP 08 — RESTORATION. «Η μετάνοιά του όμως ήταν αληθινή. Μετά την Ανάσταση, ο Χριστός δεν τον απέρριψε. Αντίθετα, τον αποκατέστησε με αγάπη, ρωτώντας τον τρεις φορές: «Με αγαπάς;»»
// The shore at dawn (John 21). World: the waterline at z = SHORE, the lake toward -z, the sun rising
// to the east (+x, the right of a lakeward camera). The fire of coals on the pebbles; two rocks by the
// water where they sit: Peter on the left facing the sunrise, Christ on the right, backlit.
import type { Env } from "../../core";
import { rng } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, wplace, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { walk, grounded, type BodyPose, type Figure } from "../figure/body";
import { PETER_FIG, CHRIST_FIG, ANDREW_FIG, JAMES_FIG, JOHN_FIG, THOMAS_FIG } from "../figure/cast";
import { extra } from "../figure/extras";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { boulderParts, coalBed } from "../paint/props";
import { lakeWorld, shoreWorld } from "../sets/lake";
import { ground, groundLine, flagTex } from "../sets/stage";
import { glow, motes, shaft } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, easeOut, smooth, norm3 } from "../lib/math";
import { fig, boatAt, onBoat, afloat, lookFrom, faceYaw, worldJoint, shadow, waterAt, splash, lensDrops, keyFrom, dirView, toLocal, type Light } from "./kit";

const SHORE = -2, PETER = PETER_FIG.C, WET: Figure = { ...PETER_FIG.C, costume: { ...PETER_FIG.C.costume, wet: 1, dirt: 0.2 } };
const FIRE: V3 = [2.2, 0, 1.4], RP: V3 = [-2.45, 0, -1.05], RC: V3 = [-1.15, 0, -1.05];
const dawnLight = (cam: WCam, amt = 1): Light => ({ ...LIGHTS.dawn, key: dirView(cam, [0.85, 0.22, -0.35]), keyAmt: 1.0 * amt, rim: dirView(cam, [0.6, 0.25, -0.75]), rimAmt: 0.7 });
const fireKey = (cam: WCam, p: V3, amt: number): Light => ({ ...dawnLight(cam), key: keyFrom(cam, [p[0], 1.2, p[2]], [FIRE[0], 0.3, FIRE[2]]), keyColor: [1, 0.72, 0.42], keyAmt: 0.9 * amt + 0.4, fillAmt: 0.5 });
const coals = (ctx: Ctx2, env: Env, cam: WCam, t: number, fish = true) => { const s = wproj(cam, env, FIRE), sc = wplace(cam, env, FIRE, 0).scale; glow(ctx, s[0], s[1] - 0.2 * sc, Math.min(800, 1.0 * sc), [1, 0.6, 0.28], 0.35); coalBed(ctx, s[0], s[1], 0.8 * sc, t, 81, { fish, flames: 0.8 }); };
// the seven in the boat: Peter among them until he goes over the side
const CREW: [Figure, V3, number][] = [[JOHN_FIG, [0.9, -0.3, 0.4], 0.2], [ANDREW_FIG, [-0.2, -0.3, -0.4], -0.3], [JAMES_FIG, [-1.3, -0.3, 0.3], 0.4], [THOMAS_FIG, [1.9, -0.3, -0.3], 0.1], [extra(801, "man"), [-2.2, -0.3, -0.35], -0.2], [extra(802, "man"), [2.6, -0.3, 0.3], 0.3]];
const crew = (ctx: Ctx2, env: Env, cam: WCam, t: number, boat: V3, by: number, L: Light, paint = 0.35): Parts[] => CREW.map(([f, p, y], i) => fig(ctx, env, cam, f, { bend: 0.3 + 0.15 * Math.sin(t * 1.3 + i), armL: { raise: 0.8, elbow: 0.6 }, armR: { raise: 0.7, elbow: 0.7 }, handL: HANDS.grip, handR: HANDS.grip, neck: { yaw: 0.6 * Math.sin(i), pitch: -0.1 } }, onBoat(boat, by, p), by + Math.PI / 2 + y, t, { light: L, live: 0.3, paint }));

// ---------------------------------------------------------------- 08.1 the tear becomes the lake
// close and low over a gutter in the night street: tears fall into the standing water; rings spread
// across the moon in it... and the rings go on spreading, now on the lake at dawn: the boat offshore,
// seven men hauling empty nets, mist on the water, and on the shore a small fire with a figure beside it
const s081 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), T = t, dis = smooth(0.4, 0.56, n);
  const drops = [0.25, 0.95, 1.55];
  // A: the gutter at night
  if (dis < 1) {
    const cam = lookFrom([0.05, 0.55, 0.45], [0, 0, -0.05], 1500, { cy: 520, cx: 960, t });
    begin(ctx, env, "#05070c");
    ground(ctx, env, cam, flagTex(env, "#5a5854"), { x0: -3, x1: 3, z0: -3, z1: 1, tile: [4, 4] });
    ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgb(70,84,130)"; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
    const c = wproj(cam, env, [0, 0, -0.05]), sc = wplace(cam, env, [0, 0, -0.05], 0).scale;
    ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    const pg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], 0.32 * sc); pg.addColorStop(0, "rgba(28,36,58,0.95)"); pg.addColorStop(0.85, "rgba(22,28,46,0.9)"); pg.addColorStop(1, "rgba(22,28,46,0)"); ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(c[0], c[1], 0.34 * sc, 0.24 * sc, 0.1, 0, Math.PI * 2); ctx.fill();
    const mx = c[0] + 0.06 * sc, my = c[1] - 0.05 * sc, wob = 1 + 0.08 * Math.sin(T * 9); const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 0.05 * sc); mg.addColorStop(0, "rgba(235,240,255,0.95)"); mg.addColorStop(1, "rgba(200,215,255,0)"); ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(mx, my, 0.05 * sc * wob, 0.035 * sc / wob, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    for (const d of drops) { const age = T - d; if (age > -0.35 && age < 0) { const y = lerp(-80, c[1], (age + 0.35) / 0.35); ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "rgba(220,230,255,0.9)"; ctx.beginPath(); ctx.ellipse(c[0] + 0.02 * sc, y, 3, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } if (age >= 0) for (let k = 0; k < 3; k++) { const rr = (age * 0.22 - k * 0.04); if (rr <= 0 || rr > 0.35) continue; ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.strokeStyle = `rgba(190,205,240,${0.6 * (1 - rr / 0.35)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c[0] + 0.02 * sc, c[1], rr * sc, rr * sc * 0.7, 0.1, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }
    finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.55, grain: 0.09, gain: [0.72, 0.8, 1.1], gainAmt: 0.2 });
    if (dis <= 0) return;
  }
  // B: the lake at dawn, from low on the water beyond the boat, looking in to the shore
  const cam: WCam = lookFrom([0.5, 0.35, -34], [-1.5, 1.2, SHORE + 2], 34, { cy: 560, cx: 960, t, shake: 0.08, pan0: Math.PI });
  const lk = `c08layer:${ctx.canvas.width}`; let layer = env.cache.get(lk) as ReturnType<typeof env.canvas> | undefined; if (!layer) { layer = env.canvas(ctx.canvas.width, ctx.canvas.height); env.cache.set(lk, layer); } const lc = layer.ctx as CanvasRenderingContext2D;
  begin(lc, env);
  shoreWorld(lc, env, cam, "dawn", SHORE, { t, mist: 0.35 });
  const L = dawnLight(cam, 0.9), BOAT: V3 = [2.5, 0, -24];
  afloat(lc, env, cam, [{ at: BOAT, parts: [boatAt(lc, env, cam, BOAT, 0.25, t, { light: L, seed: 3 }), ...crew(lc, env, cam, t, BOAT, 0.25, L)] }], t, 0.35);
  coals(lc, env, cam, t, false);
  { const fp = wproj(cam, env, [FIRE[0], 0.1, FIRE[2]]); glow(lc, fp[0], fp[1], 70, [1, 0.6, 0.25], 0.8); glow(lc, fp[0], fp[1], 18, [1, 0.85, 0.6], 0.9); motes(lc, 86, 12, t, [fp[0] - 10, fp[1] - 120, fp[0] + 30, fp[1]], { color: [0.8, 0.78, 0.76], size: 5, vx: 6, vy: -25, alpha: 0.25, blend: "source-over" }); }
  renderParts(lc, [fig(lc, env, cam, CHRIST_FIG, { armL: { raise: 0.1 }, armR: { raise: 0.15 } }, [FIRE[0] - 0.9, 0, FIRE[2] - 0.3], Math.PI + 0.2, t, { light: L, live: 0.3, paint: 0.3 })], { env, cell: 2, tol: 5, paint: 0.3, fx: { haze: [0.95, 0.85, 0.75], hazeAmt: 0.25 } });
  // the rings go on spreading, now on the lake, right before us
  for (let k = 0; k < 4; k++) { const rr = ((T - 1.55) * 0.9 - k * 0.3); if (rr <= 0) continue; const pts: V3[] = []; for (let a = 0; a <= 64; a++) pts.push([0.5 + Math.cos((a / 64) * Math.PI * 2) * rr, 0.01, -31.5 + Math.sin((a / 64) * Math.PI * 2) * rr]); groundLine(lc, env, cam, pts, { color: "#ffe6c4", width: 2, alpha: 0.5 * Math.max(0, 1 - rr / 6) }); }
  glow(lc, env.W * 0.85, 480, 800, [1, 0.78, 0.5], 0.35);
  finish(lc, env, s.abs, { bloom: 0.35, vignette: 0.3, grain: 0.07, gain: [1, 0.92, 0.82], gainAmt: 0.2 });
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = dis; ctx.drawImage(layer.canvas as CanvasImageSource, 0, 0); ctx.restore();
};

// ---------------------------------------------------------------- 08.2 he jumps in
// at the waterline, low, into the dawn: Peter comes wading hard toward us out of the sun, the mantle
// thrown round him, the water gold with spray (the echo of 02.5, now running to Him)
const s082 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const cam = lookFrom([-0.6, 0.45, SHORE + 1.2], [-0.2, 0.9, -8], 150, { cy: 560, cx: 960, t, shake: 0.5 });
  begin(ctx, env);
  shoreWorld(ctx, env, cam, "dawn", SHORE, { t, mist: 0.2 });
  const L = { ...dawnLight(cam), rimAmt: 1.3 }, BOAT: V3 = [1.5, 0, -26];
  afloat(ctx, env, cam, [{ at: BOAT, parts: [boatAt(ctx, env, cam, BOAT, 0.25, t, { light: L, seed: 3 }), ...crew(ctx, env, cam, t, BOAT, 0.25, L, 0.3)] }], t, 0.3);
  const z = lerp(-10, -4.2, easeOut(n)), depth = lerp(0.85, 0.45, n), pos: V3 = [-0.2 + 0.2 * Math.sin(t * 2), -depth, z];
  const pose = walk(t * 1.35, 1.35, { bend: 0.3, neck: { pitch: -0.15 }, armL: { raise: 0.5 + 0.4 * Math.sin(t * 8.5), out: 0.4, elbow: 0.5 }, armR: { raise: 0.5 - 0.4 * Math.sin(t * 8.5), out: 0.4, elbow: 0.5 } });
  renderParts(ctx, [fig(ctx, env, cam, WET, pose, pos, Math.PI * 0 + 0.05, t, { expr: { ...FACE.determined, open: 0.2, lid: 0.9 }, light: L, live: 0.2 })], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.5, fx: { waterY: waterAt(cam, env, pos), reflect: t } });
  const w = wproj(cam, env, [pos[0], 0, pos[2]]); for (let k = 0; k < 3; k++) splash(ctx, w[0] + (k - 1) * 40, w[1], 260, (t * 1.8 + k * 0.33) % 1.2, 820 + k + Math.floor(t * 1.8), [1, 0.86, 0.6]);
  lensDrops(ctx, env, 0.3 + 0.3 * n, 83 + Math.floor(t * 3));
  glow(ctx, env.W * 0.8, 470, 900, [1, 0.8, 0.5], 0.4);
  finish(ctx, env, s.abs, { bloom: 0.4, vignette: 0.3, grain: 0.07, gain: [1, 0.9, 0.78], gainAmt: 0.22 });
};

// ---------------------------------------------------------------- 08.3 at the fire again
// the framing of 07.2, now in the warmth of dawn: Peter, dripping, a little apart from the coals where
// Christ turns fish; Christ holds out bread; he takes it without raising his eyes
const s083 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), offer = smooth(0.2, 0.45, n), take = smooth(0.55, 0.72, n);
  const PP: V3 = [FIRE[0] + 0.35, 0, FIRE[2] + 1.05], CP: V3 = [FIRE[0] - 0.45, 0, FIRE[2] + 0.2], PY = faceYaw(PP, FIRE) - 0.4, CY = faceYaw(CP, PP);
  const M: V3 = [lerp(CP[0], PP[0], 0.55), lerp(0.75, 1.02, offer), lerp(CP[2], PP[2], 0.55)];
  const cBody: BodyPose = grounded(CHRIST_FIG, { bend: 0.35, legL: { hip: 1.9, knee: 2.5 }, legR: { hip: 1.5, knee: 2.2 }, armL: { raise: 0.6, elbow: 1.0 }, neck: { pitch: -0.25 } });
  const cHand = toLocal(CP, CY, M);
  const pose: BodyPose = { bend: 0.12, neck: { pitch: 0.42, yaw: -0.15 }, armL: { raise: 0.15, elbow: 0.5 }, armR: take > 0.02 ? { target: toLocal(PP, PY, [M[0] + 0.02, M[1] + 0.02, M[2] + 0.02]).map((v, i) => i === 1 ? lerp(0.8, v, take) : v) as V3, pole: [-0.6, -0.5, -0.3] } : { raise: 0.1, elbow: 0.4 }, handR: take > 0.6 ? HANDS.grip : HANDS.open };
  const face = worldJoint(WET, pose, PP, PY, "face");
  const cam = lookFrom([FIRE[0] - 0.55, 1.15, FIRE[2] - 0.95], [lerp(face[0], M[0], 0.35), face[1] - 0.3, lerp(face[2], M[2], 0.35)], 900, { cy: 500, cx: 960, t, shake: 0.06 });
  begin(ctx, env);
  shoreWorld(ctx, env, cam, "dawn", SHORE, { t, blur: 1 });
  const cPose: BodyPose = { ...cBody, armR: { target: cHand, pole: [-0.6, -0.4, -0.3] }, handR: HANDS.offer };
  const christF = fig(ctx, env, cam, CHRIST_FIG, cPose, CP, CY, t, { expr: { lid: 0.75, smile: 0.14, gazeX: 0.1 }, light: fireKey(cam, CP, 1), live: 0.3, paint: 0.45 });
  const peter = fig(ctx, env, cam, WET, pose, PP, PY, t, { expr: { ...FACE.ashamed, gazeY: -0.5 }, light: fireKey(cam, PP, 1), live: 0.3 });
  // the bread between them
  const bread = { tris: [], anchors: [], overlays: [{ z: wproj(cam, env, M)[2] + 5, draw: () => { const q = wproj(cam, env, [M[0], M[1] + 0.03, M[2]]), sc = wplace(cam, env, M, 0).scale; ctx.save(); ctx.fillStyle = "#b08654"; ctx.beginPath(); ctx.ellipse(q[0], q[1], 0.09 * sc, 0.045 * sc, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(255,220,160,0.5)"; ctx.beginPath(); ctx.ellipse(q[0] - 0.02 * sc, q[1] - 0.015 * sc, 0.05 * sc, 0.015 * sc, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }] } as Parts;
  renderParts(ctx, [christF, peter, bread], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.55 });
  coals(ctx, env, cam, t);
  motes(ctx, 84, 20, t, [500, 600, 1400, 1080], { color: [1, 0.65, 0.3], size: 2, vx: 0, vy: -80, alpha: 0.6, flicker: 3 });
  const fs = wproj(cam, env, face); motes(ctx, 85, 10, t, [fs[0] - 180, fs[1] + 40, fs[0] + 180, fs[1] + 600], { color: [0.9, 0.93, 1], size: 2, vx: 0, vy: 400, alpha: 0.5 });
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.35, grain: 0.07, gain: [1, 0.9, 0.8], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 08.4 - 08.6 the three questions
// apart from the others, on two rocks at the water's edge; the lake and the coming sun behind them
const seatP = (clench: number, lift: number, look: number): BodyPose => ({ bend: lerp(0.45, 0.12, look), legL: { hip: 1.45, knee: 1.55 }, legR: { hip: 1.4, knee: 1.5 }, armL: { target: [0.13, 0.6, 0.38], pole: [0.8, -0.3, -0.3] }, armR: { target: [-0.13, 0.6, 0.38], pole: [-0.8, -0.3, -0.3] }, handL: clench > 0.5 ? HANDS.grip : HANDS.relaxed, handR: clench > 0.5 ? HANDS.grip : HANDS.relaxed, neck: { pitch: lerp(0.5, -0.02, Math.max(lift * 0.5, look)), yaw: 0.05 } });
const seatC = (lean: number): BodyPose => ({ bend: 0.15 + 0.1 * lean, legL: { hip: 1.45, knee: 1.55 }, legR: { hip: 1.35, knee: 1.45 }, armL: { raise: 0.55, elbow: 1.2 }, armR: { raise: 0.5 + 0.2 * lean, elbow: 1.1 }, handR: HANDS.relaxed, neck: { pitch: 0.08, yaw: 0 } });
const rocks = (ctx: Ctx2, env: Env, cam: WCam, L: Light) => [RP, RC].map((p, i) => { const q = wplace(cam, env, [p[0], 0, p[2] - 0.02], 0.3 + i); return boulderParts({ x: q.x, y: q.y, z: q.z, scale: q.scale, yaw: 0, R: q.R, light: L, w: 0.66, d: 0.55, h: 0.44, seed: 830 + i, color: "#4f4a45" }); });
const onRock = (f: Figure, p: BodyPose) => ({ ...grounded(f, p, 0), root: [0, -0.4, -0.05] as V3 });
const scene08 = (ctx: Ctx2, env: Env, cam: WCam, t: number, sun: number, blur = 0) => { shoreWorld(ctx, env, cam, "dawn", SHORE, { t, blur, mist: 0.15 }); const hs = wproj(cam, env, [80, 0, -300]); glow(ctx, hs[0], hs[1], 700 + 400 * sun, [1, 0.78, 0.48], 0.3 + 0.35 * sun); shaft(ctx, hs[0], hs[1], hs[0] - 400, hs[1] + 500, 20, 260, [1, 0.8, 0.5], 0.12 * sun); };
const s084 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), turn = smooth(0.1, 0.3, n);
  const cam = lookFrom([-1.8, 1.02, 2.4], [-1.8, 0.92, -1.05], 480, { cy: 540, cx: 960, t, shake: 0.05 });
  begin(ctx, env);
  scene08(ctx, env, cam, t, 0.2);
  const L = dawnLight(cam), PY = faceYaw(RP, RC), CY = faceYaw(RC, RP);
  const peter = fig(ctx, env, cam, PETER, onRock(PETER, seatP(1, 0, 0)), RP, PY - 0.35, t, { expr: { ...FACE.ashamed, gazeY: -0.6 }, light: L, live: 0.25 });
  const christ = fig(ctx, env, cam, CHRIST_FIG, onRock(CHRIST_FIG, { ...seatC(turn), neck: { yaw: lerp(0.4, 0, turn), pitch: 0.08 } }), RC, CY + 0.2, t, { expr: { lid: 0.75, smile: 0.06, open: 0.05 * Math.max(0, Math.sin(t * 6)) * smooth(0.3, 0.4, n) }, light: { ...L, rimAmt: 1.0 }, live: 0.2 });
  renderParts(ctx, [...rocks(ctx, env, cam, L), peter, christ], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.55 });
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.32, grain: 0.07, gain: [1, 0.9, 0.8], gainAmt: 0.2 });
};
const s085 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), lift = smooth(0.15, 0.6, n), un = smooth(0.4, 0.85, n);
  const pose = onRock(PETER, seatP(1 - un, lift, 0)), PY = faceYaw(RP, RC) - 0.35, face = worldJoint(PETER, pose, RP, PY, "face");
  const cam = lookFrom([RP[0] + 0.85, face[1] + 0.02, RP[2] - 1.25], [face[0], face[1] - 0.05, face[2]], lerp(1250, 1350, n), { cy: 480, cx: 900, t, shake: 0.05 });
  begin(ctx, env);
  scene08(ctx, env, cam, t, 0.5, 1);
  const L = dawnLight(cam);
  const peter = fig(ctx, env, cam, PETER, pose, RP, PY, t, { expr: blendFace({ ...FACE.ashamed, gazeY: -0.6 }, { ...FACE.vulnerable, gazeY: -0.2 }, lift), light: L, live: 0.15 });
  renderParts(ctx, [...rocks(ctx, env, cam, L), peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  finish(ctx, env, s.abs, { bloom: 0.35, vignette: 0.35, grain: 0.07, gain: [1, 0.9, 0.8], gainAmt: 0.2 });
};
const s086 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), look = smooth(0.05, 0.3, n), close = easeInOut(clamp((n - 0.45) / 0.45)), sun = smooth(0.2, 0.7, n);
  const pose = onRock(PETER, seatP(0, 1, look)), PY = faceYaw(RP, RC) - 0.35 + 0.25 * look, face = worldJoint(PETER, pose, RP, PY, "face");
  const two = lookFrom([-1.8, 1.0, 2.2], [-1.8, 0.95, -1.05], 520, { cy: 540, cx: 960 }), cu = lookFrom([RP[0] + 0.95, face[1] + 0.02, RP[2] - 1.15], [face[0], face[1] - 0.03, face[2]], 1450, { cy: 480, cx: 960 });
  const mixc = (a: number, b: number) => lerp(a, b, close), cam: WCam = { target: [mixc(two.target[0], cu.target[0]), mixc(two.target[1], cu.target[1]), mixc(two.target[2], cu.target[2])], scale: Math.exp(mixc(Math.log(two.scale), Math.log(cu.scale))), yaw: mixc(two.yaw, cu.yaw), tilt: mixc(two.tilt, cu.tilt), focal: Math.exp(mixc(Math.log(two.focal!), Math.log(cu.focal!))), cy: mixc(540, 480), cx: 960, t, shake: 0.04 };
  begin(ctx, env);
  scene08(ctx, env, cam, t, 0.6 + 0.4 * sun, close);
  // the sunrise's reflection off the water: a warm light from low in front, on his face
  const L = dawnLight(cam), PL: Light = { ...L, key: dirView(cam, [0.7, -0.15, -0.6]), keyColor: [1, 0.82, 0.55], keyAmt: 0.8 + 0.7 * sun, fillAmt: 0.5, rimAmt: 0.5 };
  const peter = fig(ctx, env, cam, PETER, pose, RP, PY, t, { expr: blendFace({ ...FACE.vulnerable, gazeY: -0.1 }, { ...FACE.accepted, gazeX: 0.05 }, look), light: PL, live: 0.08 });
  const christ = fig(ctx, env, cam, CHRIST_FIG, onRock(CHRIST_FIG, seatC(0.6)), RC, faceYaw(RC, RP) + 0.2, t, { expr: { lid: 0.72, smile: 0.12 }, light: { ...L, rimAmt: 1.1 }, live: 0.15 });
  renderParts(ctx, [...rocks(ctx, env, cam, L), christ, peter], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  // the flicker of the water's light across his face
  const fs = wproj(cam, env, face); glow(ctx, fs[0] + 40, fs[1] + 60, 260 + 120 * close, [1, 0.85, 0.6], 0.18 * sun * (0.8 + 0.2 * Math.sin(t * 5.3) * Math.sin(t * 3.1)));
  finish(ctx, env, s.abs, { bloom: 0.4, vignette: 0.3, grain: 0.07, gain: [1, 0.9, 0.78], gainAmt: 0.22 });
};

register({ "08.1": s081, "08.2": s082, "08.3": s083, "08.4": s084, "08.5": s085, "08.6": s086 });
void rng; void lakeWorld; void easeInOut; void norm3; void shadow;
