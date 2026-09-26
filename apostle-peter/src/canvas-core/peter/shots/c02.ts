// CLIP 02 — SIMON THE FISHERMAN. «Πριν γνωρίσει τον Κύριο, ονομαζόταν Σίμων και εργαζόταν ως ψαράς στη λίμνη Γεννησαρέτ. Ήταν άνθρωπος απλός, δυναμικός, αυθόρμητος και γεμάτος ζήλο.»
import type { Env } from "../../core";
import { register } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, finish } from "../scene";
import { renderParts, type Parts } from "../figure/head";
import { joints, grounded, walk, type BodyPose } from "../figure/body";
import { PETER_FIG, ANDREW_FIG, JAMES_FIG, JOHN_FIG } from "../figure/cast";
import { HANDS, LIGHTS, FACE, blendFace } from "../figure/acting";
import { boatGunwale } from "../paint/props";
import { rope, net, castNet, hangingNet } from "../paint/cord";
import { lakeWorld, beachWorld } from "../sets/lake";
import { glow, motes } from "../paint/camera";
import { type V3, lerp, clamp, easeInOut, easeOut, smooth, add3, keys } from "../lib/math";
import { fig, boatAt, onBoat, waterAt, afloat, lensDrops, splash, rockOf, shadow } from "./kit";

const LIGHT = LIGHTS.goldenMorning, DAY = LIGHTS.day;

// ---------------------------------------------------------------- 02.1 the cast net
// in profile against the dawn: the wind-up, the throw, the net blooming open in the sky, the ring of
// lead weights striking the water together
const s021 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, rel = 0.72, flyT = 1.05, fly = clamp((t - rel) / flyT), open = easeOut(fly);
  const BOAT: V3 = [0, 0, -1], BY = 0.2, dir: V3 = [0.9, 0, -0.45], S = onBoat(BOAT, BY, [2.2, -0.15, 0]), yawS = Math.atan2(dir[0], dir[2]);
  const land: V3 = [S[0] + dir[0] * 5.5, 0, S[2] + dir[2] * 5.5];
  const cam: WCam = { target: [lerp(3.0, 3.6, easeInOut(fly)), 1.3, -2.2], scale: 150, yaw: 0.1, tilt: -0.07, cy: 620, cx: 960, focal: 1800, t, shake: 0.25, pan0: 0.1 };
  begin(ctx, env);
  lakeWorld(ctx, env, cam, "morning", { mist: 0.2, t });
  // wind-up (coil away from the throw, arms low), release (uncoil, arms sweep up and out), follow-through
  const a = clamp(t / rel), b = clamp((t - rel) / 0.35);
  const twist = t < rel ? lerp(0, 0.75, easeInOut(a)) : lerp(0.75, -0.5, easeOut(b));
  const pose: BodyPose = { twist, bend: t < rel ? 0.28 * a : lerp(0.28, -0.08, b), side: 0.05, neck: { yaw: -twist * 0.5 + 0.2 * b, pitch: -0.2 * b },
    armL: t < rel ? { raise: lerp(0.4, 0.2, a), out: 0.3, elbow: 1.1 } : { raise: lerp(0.2, 1.8, easeOut(b)), out: lerp(0.3, 0.9, b), elbow: lerp(1.1, 0.25, b) },
    armR: t < rel ? { raise: lerp(0.5, 0.1, a), out: 0.4, elbow: 0.8 } : { raise: lerp(0.1, 1.6, easeOut(b)), out: lerp(0.4, 1.0, b), elbow: lerp(0.8, 0.3, b) },
    legL: { hip: 0.15, knee: 0.3 }, legR: { hip: -0.1, knee: 0.15 },
    handL: t < rel ? HANDS.grip : HANDS.open, handR: t < rel ? HANDS.grip : HANDS.open };
  const rk = rockOf(t, 3), body = grounded(PETER_FIG.A, pose);
  const boat = boatAt(ctx, env, cam, BOAT, BY, t, { seed: 3 });
  const simon = fig(ctx, env, cam, PETER_FIG.A, body, S, yawS, t, { expr: FACE.determined, rock: rk, live: 0.3 });
  const P = (p: V3) => wproj(cam, env, p);
  // his throwing hand in world space (the figure is turned by yawS)
  const J = joints(PETER_FIG.A, body), hr = J.handR, c = Math.cos(yawS), sn = Math.sin(yawS), hand: V3 = [S[0] + hr[0] * c + hr[2] * sn, S[1] + hr[1], S[2] - hr[0] * sn + hr[2] * c];
  // the net: bunched and hanging from his fists, then flying out and opening into a full circle
  const cen: V3 = [lerp(hand[0], land[0], fly), lerp(hand[1], 0.05, fly * fly) + Math.sin(Math.PI * fly) * 1.4, lerp(hand[2], land[2], fly)];
  const sink = clamp((t - rel - flyT) / 0.8), cw = Math.max(1.4, 0.009 * cam.scale);
  const netOv = t < rel ? net(P, hangingNet(add3(hand, [-0.14, 0, 0.05]), add3(hand, [0.14, 0, -0.05]), 0.7, 7, 6, t, 0.08), { width: cw, wet: 0.8, t, seed: 4, veil: 0.22, weights: true })
    : net(P, castNet(cen, 0.25 + 1.6 * open, (0.5 * (1 - open) + 0.14) * (1 - sink), 8, 30, t).map((row) => row.map((q) => { const k = 0.55 * Math.sin(Math.PI * Math.min(1, fly * 1.1)), dz = q[2] - cen[2]; return [q[0], q[1] - dz * k, cen[2] + dz * Math.cos(k)] as V3; })), { width: cw * lerp(1, 0.85, fly), wet: 0.7, t, seed: 4, veil: 0.16 * (1 - sink * 0.6), weights: true, alpha: 1 - sink * 0.6 });
  renderParts(ctx, [boat, { ...simon, overlays: t < rel ? [...simon.overlays, netOv] : simon.overlays }], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62, fx: { waterY: waterAt(cam, env, onBoat(BOAT, BY, [0, 0, 1.1])), reflect: t } });
  // the thrown net at its own waterline (in the air it is reflected in the still water under it)
  if (t >= rel) renderParts(ctx, [{ tris: [], anchors: [], overlays: [netOv] }], { env, cell: 2, tol: 5, paint: 0, fx: { waterY: waterAt(cam, env, land), reflect: t } });
  // the weights strike the water in a ring
  if (fly >= 1) { for (let i = 0; i < 14; i++) { const an = (i / 14) * Math.PI * 2, p = P([land[0] + Math.cos(an) * 1.85, 0, land[2] + Math.sin(an) * 1.85]); splash(ctx, p[0], p[1], 60, t - rel - flyT - (i % 3) * 0.02, 20 + i); } const p = P(land); splash(ctx, p[0], p[1], 150, t - rel - flyT, 21); }
  glow(ctx, env.W * 0.3, env.H * 0.5, env.W * 0.45, [1, 0.88, 0.62], 0.2);
  finish(ctx, env, s.abs, { bloom: 0.32, vignette: 0.28, grain: 0.07, gain: [1, 0.95, 0.86], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 02.2 Simon
const s022 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  begin(ctx, env);
  const cam: WCam = { target: [0, 1.5, 0.3], scale: lerp(930, 1010, n), yaw: -0.45, tilt: 0.02, cy: 520, cx: 1060, t, shake: 0.2 };
  lakeWorld(ctx, env, cam, "morning", { blur: 1, mist: 0.2, t });
  // he watches the net sink, drags a forearm across his brow, and grins
  const wipe = smooth(0.25, 0.45, n) * (1 - smooth(0.62, 0.8, n)), grin = smooth(0.62, 0.85, n);
  const pose: BodyPose = { bend: 0.08, neck: { pitch: lerp(0.22, 0.05, n), yaw: -0.25 }, armR: wipe > 0.02 ? { target: [0.04 - 0.1 * wipe, 1.6 + 0.04 * wipe, 0.14], pole: [-0.5, -0.6, -0.3] } : { raise: 0.15, elbow: 0.5 }, armL: { raise: 0.2, elbow: 0.6 }, handR: HANDS.relaxed };
  const expr = blendFace({ ...FACE.neutral, gazeX: 0.35, gazeY: -0.35 }, { ...FACE.joyful, gazeX: 0.3, gazeY: -0.2 }, grin);
  const simon = fig(ctx, env, cam, PETER_FIG.A, pose, [0, 0, 0], 0.15, t, { expr, rock: { roll: Math.sin(t) * 0.01 }, live: 0.6 });
  renderParts(ctx, [simon], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.62 });
  // sun-glints drifting up off the water behind him
  motes(ctx, 23, 30, t, [0, 500, env.W, 1080], { color: [1, 0.93, 0.75], size: 5, vx: 4, vy: -3, alpha: 0.35, flicker: 1.5 });
  finish(ctx, env, s.abs, { bloom: 0.28, vignette: 0.32, grain: 0.07, gain: [1, 0.95, 0.86], gainAmt: 0.2 });
};

// ---------------------------------------------------------------- 02.3 Lake Gennesaret
// the wide: the village shore in the foreground, the working boats out on the morning water
const s023 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const cam: WCam = { target: [lerp(-1.2, 1.2, n), 1.6, -8], scale: 48, yaw: 0.05, tilt: 0.05, cy: 470, t, pan0: 0.05, focal: 2000 };
  begin(ctx, env);
  beachWorld(ctx, env, cam, "morning", 14, { village: true, mist: 0.28, t });
  const work = (fg: typeof PETER_FIG.A, pos: V3, yaw: number, ph: number) => fig(ctx, env, cam, fg, { bend: 0.35 + 0.15 * Math.sin(t * 2.4 + ph), armL: { raise: 0.9 + 0.2 * Math.sin(t * 2.4 + ph), elbow: 0.5 }, armR: { raise: 0.8 + 0.2 * Math.sin(t * 2.4 + ph), elbow: 0.6 }, handL: HANDS.grip, handR: HANDS.grip }, pos, yaw, t, { rock: rockOf(t, 3), paint: 0.3 });
  const B1: V3 = [-10, 0, -34], B2: V3 = [8, 0, -26], B3: V3 = [0, 0, -12], B4: V3 = [-5.5, 0, 9];
  afloat(ctx, env, cam, [
    { at: B1, parts: [boatAt(ctx, env, cam, B1, 0.5, t, { seed: 11, sail: "furled", paint: 0.3 }), work(JAMES_FIG, onBoat(B1, 0.5, [0.5, -0.3, 0.4]), 2.0, 1)] },
    { at: B2, parts: [boatAt(ctx, env, cam, B2, -0.4, t, { seed: 12, sail: "furled", paint: 0.3 }), work(JOHN_FIG, onBoat(B2, -0.4, [-0.6, -0.3, -0.3]), -1.2, 2)] },
    { at: B3, parts: [boatAt(ctx, env, cam, B3, 0.35, t, { seed: 3 }), work(PETER_FIG.A, onBoat(B3, 0.35, [-0.8, -0.3, 0.4]), 0.2, 0), work(ANDREW_FIG, onBoat(B3, 0.35, [0.8, -0.3, 0.4]), 0.4, 0.8)] },
    // a moored boat rides in the shallows right in front of us, nose to the beach
    { at: B4, parts: [boatAt(ctx, env, cam, B4, -1.2, t, { seed: 14, rock: 0.5 })] },
  ], t, 0.5);
  // gulls wheeling far off
  motes(ctx, 44, 7, t, [200, 150, 1700, 330], { color: [0.22, 0.2, 0.2], size: 2.2, vx: 26, vy: 3, alpha: 0.6, blend: "source-over" });
  finish(ctx, env, s.abs, { bloom: 0.25, vignette: 0.25, grain: 0.07, gain: [1, 0.96, 0.88], gainAmt: 0.18 });
};

// ---------------------------------------------------------------- 02.4 hauling with Andrew
const s024 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const cam: WCam = { target: [0.1, 1.0, 0], scale: 320, yaw: 1.35, tilt: -0.03, cy: 570, t, shake: 0.45, pan0: 1.35, focal: 1700 };
  begin(ctx, env);
  lakeWorld(ctx, env, cam, "day", { mist: 0.1, t, blur: 0.4 });
  // both men lean back on the dragnet line; it slips; a laugh; they heave again
  const slip = smooth(0.35, 0.45, n) * (1 - smooth(0.5, 0.62, n)), laugh = smooth(0.42, 0.55, n) * (1 - smooth(0.8, 0.95, n));
  const heave = (ph: number) => 0.5 + 0.5 * Math.sin(t * 3.2 + ph);
  const pull = (k: number, ph: number): BodyPose => ({ bend: -0.15 * heave(ph) + slip * 0.35, twist: 0.1, root: [0, 0, -0.08 * heave(ph)], neck: { pitch: 0.05 - 0.15 * laugh * k, yaw: 0.5 * laugh * k },
    legL: { hip: 0.25, knee: 0.35 }, legR: { hip: -0.15, knee: 0.1 },
    armL: { target: [0.12, 1.02 + 0.05 * heave(ph), 0.55 - 0.12 * heave(ph) + slip * 0.25], pole: [0.5, -0.5, -0.5] }, armR: { target: [-0.05, 0.98 + 0.05 * heave(ph), 0.35 - 0.1 * heave(ph) + slip * 0.25], pole: [-0.5, -0.5, -0.5] }, handL: HANDS.grip, handR: HANDS.grip });
  const rk = rockOf(t, 3), boat = boatAt(ctx, env, cam, [0, 0, 0], Math.PI / 2, t, { light: DAY });
  const simon = fig(ctx, env, cam, PETER_FIG.A, grounded(PETER_FIG.A, pull(1, 0)), [0.1, -0.3, 0.5], 0, t, { expr: blendFace(FACE.determined, FACE.joyful, laugh), rock: rk, light: DAY, live: 0.4 });
  const andrew = fig(ctx, env, cam, ANDREW_FIG, grounded(ANDREW_FIG, pull(0.6, 0.6)), [0.2, -0.3, -0.7], 0, t, { expr: blendFace(FACE.determined, FACE.joyful, laugh * 0.8), rock: rk, light: DAY, live: 0.4 });
  const P = (p: V3) => wproj(cam, env, p);
  const line = rope(P, [[0.3, -0.05, 4.5], [0.2, boatGunwale(0) + 0.05, 1.15], [0.2, 0.98, 0.95], [0.25, 0.95, -0.25], [0.1, -0.2, -1.4]], { width: Math.max(1.5, 0.02 * cam.scale), sag: 0.02, wet: 0.7, t: t * 2, drip: 0.3 });
  renderParts(ctx, [boat, simon, { ...andrew, overlays: [...andrew.overlays, line] }], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6, fx: { waterY: waterAt(cam, env, [0, 0, 1.15]), reflect: t } });
  // spray thrown off the line as it snaps taut again
  motes(ctx, 61, 30, t, [P([0.25, 0, 3])[0] - 200, P([0.25, 0.9, 1.2])[1] - 60, P([0.25, 0, 3])[0] + 200, P([0.25, 0, 1.2])[1]], { color: [0.95, 0.96, 0.97], size: 2, vx: 0, vy: 160, alpha: 0.5 * (0.4 + slip) });
  finish(ctx, env, s.abs, { bloom: 0.2, vignette: 0.28, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 02.5 into the shallows
// he doesn't wait for the boat to ground: crouch on the rail, spring, and down into the water
const s025 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s);
  const cam: WCam = { target: [0.5, 0.75, -0.1], scale: 280, yaw: 0.12, tilt: -0.04, cy: 560, cx: 900, t, shake: 0.45, focal: 1500 };
  begin(ctx, env);
  lakeWorld(ctx, env, cam, "day", { mist: 0.08, t, blur: 0.3 });
  const BOAT: V3 = [0, 0, -1.6], rail = onBoat(BOAT, 0, [0.4, boatGunwale(0.4) + 0.02, 1.02]), LAND: V3 = [1.1, -0.72, 1.1];
  const j = clamp((n - 0.08) / 0.5), land = smooth(0.55, 0.64, n), air = j > 0.2 && j < 1;
  // the jump's path (root position): a push, the arc, the drop into the water
  const pos: V3 = [lerp(rail[0], LAND[0], j), keys([[0, rail[1]], [0.2, rail[1]], [0.55, rail[1] + 0.55], [1, LAND[1]]], j), lerp(rail[2], LAND[2], easeOut(j))];
  const pose: BodyPose = { bend: keys([[0, 0.5], [0.2, 0.62], [0.5, -0.05], [0.8, 0.1], [1, 0.25 * (1 - land) + 0.12]], j), neck: { pitch: keys([[0, 0.3], [0.5, 0], [1, 0.15]], j) },
    armL: { raise: keys([[0, 0.3], [0.2, -0.4], [0.5, 1.5], [1, 0.7]], j), out: keys([[0, 0.3], [0.6, 0.5], [1, 0.4]], j), elbow: 0.35 }, armR: { raise: keys([[0, 0.3], [0.2, -0.4], [0.5, 1.4], [1, 0.6]], j), out: keys([[0, 0.3], [0.6, 0.5], [1, 0.4]], j), elbow: 0.4 },
    legL: { hip: keys([[0, 1.3], [0.2, 1.5], [0.5, 0.2], [0.8, 0.6], [1, 0.25]], j), knee: keys([[0, 2.0], [0.2, 2.2], [0.5, 0.3], [0.8, 1.0], [1, 0.3]], j) },
    legR: { hip: keys([[0, 1.2], [0.2, 1.5], [0.5, -0.1], [0.8, 0.3], [1, 0.1]], j), knee: keys([[0, 1.9], [0.2, 2.2], [0.5, 0.2], [0.8, 0.6], [1, 0.2]], j) },
    handL: HANDS.open, handR: HANDS.open };
  const body = j < 0.2 ? grounded(PETER_FIG.A, pose) : pose;
  const boat = boatAt(ctx, env, cam, BOAT, 0, t, { light: DAY, roll: -0.06 * smooth(0.1, 0.3, n) * (1 - smooth(0.3, 0.8, n)) });
  const simon = fig(ctx, env, cam, PETER_FIG.A, body, pos, 0.35, t, { expr: blendFace(FACE.determined, FACE.joyful, smooth(0.6, 0.8, n)), light: DAY, live: 0.2 });
  renderParts(ctx, [boat], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6, fx: { waterY: waterAt(cam, env, [0, 0, -0.5]), reflect: t } });
  renderParts(ctx, [simon], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6, fx: { waterY: waterAt(cam, env, [pos[0], 0, pos[2]]), reflect: t } }); void air; // clipped at the waterline in every phase of the jump
  const P = (p: V3) => wproj(cam, env, p), sp = P([LAND[0], 0, LAND[2]]), hitT = t - (0.08 + 0.5) * (s.frames - 1) / 30;
  splash(ctx, sp[0], sp[1], 520, hitT, 51);
  // the water he displaces keeps rippling round his thighs
  if (hitT > 0) { ctx.save(); ctx.strokeStyle = `rgba(245,248,250,${0.5 * Math.max(0.3, 1 - hitT)})`; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const r = ((hitT * 0.8 + i / 3) % 1); ctx.beginPath(); ctx.ellipse(sp[0], sp[1], 60 + r * 260, (60 + r * 260) * 0.14, 0, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); }
  lensDrops(ctx, env, smooth(0.6, 0.72, n) * (1 - smooth(0.9, 1, n) * 0.4), 55);
  finish(ctx, env, s.abs, { bloom: 0.22, vignette: 0.25, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

// ---------------------------------------------------------------- 02.6 the boat ashore
// from the side, close on the bow: Simon leans back on the stem post and walks the boat up the
// pebbles, the keel grinding, the stern still afloat off the right of frame
const s026 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), drag = easeOut(clamp(n / 0.85)), bowZ = lerp(0.3, 1.2, drag);
  const BY = -Math.PI / 2 - 0.6, BOAT = onBoat([-0.4, 0.1, bowZ], BY, [-4.1, 0, 0]);
  const cam: WCam = { target: [0.4, 0.85, bowZ - 1.2], scale: 230, yaw: -0.5, tilt: 0.1, cy: 560, cx: 1060, t, shake: 0.2, pan0: -0.5, focal: 1500 };
  begin(ctx, env);
  beachWorld(ctx, env, cam, "day", -2.2, { t, blur: 0.2 });
  // bow up on the pebbles, stern settling into the water behind (out of frame right)
  const boat = boatAt(ctx, env, cam, BOAT, BY, t, { light: DAY, rock: 0.15 * (1 - drag), roll: 0.075 });
  const bow = onBoat(BOAT, BY, [4.15, boatGunwale(4.1), 0]);
  // hands on the stem post, leaning back, stepping backward
  const step = walk(-t * 1.3, 0.6, {}), heave = 0.5 + 0.5 * Math.sin(t * 2.6);
  const pose: BodyPose = { ...step, bend: -0.1 - 0.12 * heave, twist: 0.05, neck: { pitch: 0.12, yaw: 0.4 },
    armL: { target: [0.08, bow[1] + 0.1, 0.36], pole: [0.6, -0.5, -0.4] }, armR: { target: [-0.08, bow[1] + 0.16, 0.36], pole: [-0.6, -0.5, -0.4] }, handL: HANDS.grip, handR: HANDS.grip };
  const fwd = onBoat([0, 0, 0], BY, [1, 0, 0]), SP: V3 = [bow[0] + fwd[0] * 0.36, 0, bow[2] + fwd[2] * 0.36];
  const simon = fig(ctx, env, cam, PETER_FIG.A, grounded(PETER_FIG.A, pose), SP, Math.atan2(-fwd[0], -fwd[2]), t, { expr: blendFace(FACE.determined, FACE.joyful, 0.45), light: DAY, live: 0.3 });
  // the keel's furrow and the shadows that sit the boat and the man on the pebbles
  shadow(ctx, env, cam, onBoat(BOAT, BY, [3.0, 0, 0]), 1.0, 0.5, 1.2, 1.2);
  shadow(ctx, env, cam, SP, 0.35, 0.45);
  renderParts(ctx, [boat, simon], { env, cell: 2, tol: 0.03 * cam.scale, paint: 0.6 });
  // pebbles kicked up by the keel
  const kp = wproj(cam, env, [bow[0], 0, bow[2] - 0.3]);
  motes(ctx, 71, 20, t, [kp[0] - 80, kp[1] - 30, kp[0] + 80, kp[1] + 10], { color: [0.45, 0.42, 0.38], size: 2.5, vx: 0, vy: 40, alpha: 0.7 * (1 - drag), blend: "source-over" });
  finish(ctx, env, s.abs, { bloom: 0.2, vignette: 0.25, grain: 0.07, gain: [1, 0.97, 0.9], gainAmt: 0.12 });
};

register({ "02.1": s021, "02.2": s022, "02.3": s023, "02.4": s024, "02.5": s025, "02.6": s026 });
void lerp;
