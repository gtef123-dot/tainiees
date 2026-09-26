// CLIP 13 — THE MEANING. «Ο Άγιος Πέτρος μάς θυμίζει ότι ακόμη και ο άνθρωπος που πέφτει μπορεί να σηκωθεί, όταν μετανοεί αληθινά. Η αγάπη του Χριστού δεν σταματά στην αδυναμία μας, αλλά μας καλεί να γίνουμε ξανά δυνατοί, πιστοί και γενναίοι.»
// Echoes: the film remembers itself, each memory re-graded warmer and softer than it was; then the
// lake in the morning again, an empty boat, a net like the one he left, and two far figures on the shore.
import type { Env } from "../../core";
import cues from "../../../../story/shots.gen.json";
import { register, SHOTS } from "./index";
import { type ShotInfo, type Ctx2, type WCam, begin, prog, wproj, finish } from "../scene";
import { renderParts } from "../figure/head";
import { walk } from "../figure/body";
import { CHRIST_FIG, JOHN_FIG } from "../figure/cast";
import { LIGHTS } from "../figure/acting";
import { netPileParts, boatGunwale } from "../paint/props";
import { net, drapedNet } from "../paint/cord";
import { shoreWorld } from "../sets/lake";
import { glow, motes } from "../paint/camera";
import { type V3, lerp, clamp, smooth, easeInOut } from "../lib/math";
import { fig, boatAt, onBoat, afloat, lookFrom, dirView, type Light } from "./kit";
import { wplace } from "../scene";

const FRAMES: Record<string, number> = Object.fromEntries((cues.shots as { id: string; frames: number; start: number }[]).map((c) => [c.id, c.frames]));
const STARTS: Record<string, number> = Object.fromEntries((cues.shots as { id: string; frames: number; start: number }[]).map((c) => [c.id, c.start]));
// play an earlier shot as a memory: its frames `from..to` stretched over this shot, then re-graded
const echo = (ctx: Ctx2, env: Env, id: string, f: number, s: ShotInfo, from: number, to: number) => {
  const n = prog(f, s), of = Math.round(lerp(from, to, n) * (FRAMES[id] - 1));
  SHOTS[id](ctx, of, env, { id, start: STARTS[id], frames: FRAMES[id], clip: s.clip, abs: STARTS[id] + of });
};
const regrade = (ctx: Ctx2, env: Env, warm: number, soft = 0.15) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = `rgba(255,190,120,${0.55 * warm})`; ctx.fillRect(0, 0, env.W, env.H);
  ctx.globalCompositeOperation = "screen"; ctx.fillStyle = `rgba(255,236,205,${soft})`; ctx.fillRect(0, 0, env.W, env.H);
  ctx.restore();
};
const layerOf = (env: Env, ctx: Ctx2) => { const k = `c13layer:${ctx.canvas.width}`; let l = env.cache.get(k) as ReturnType<typeof env.canvas> | undefined; if (!l) { l = env.canvas(ctx.canvas.width, ctx.canvas.height); env.cache.set(k, l); } return l; };

// 13.1 echo of 03.4: the abandoned net stirring in the boat
const s131 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => { echo(ctx, env, "03.4", f, s, 0.0, 0.35); regrade(ctx, env, 0.6, 0.12); };
// 13.2 echo of 07.6 (against the wall, face in his hands); on «σηκωθεί» it dissolves slowly into 08.6
// (his eyes lifting to Christ in the sunrise)
const SIKOTHEI = 4631;
const s132 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const d0 = SIKOTHEI - s.start, dis = smooth(d0, d0 + 26, f);
  if (dis < 1) { echo(ctx, env, "07.6", f, s, 0.55, 0.95); regrade(ctx, env, 0.2 + 0.2 * dis, 0.06); }
  if (dis > 0) { const l = layerOf(env, ctx), lc = l.ctx as CanvasRenderingContext2D; echo(lc, env, "08.6", f, s, 0.0, 0.75); regrade(lc, env, 0.5, 0.1); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = dis; ctx.drawImage(l.canvas as CanvasImageSource, 0, 0); ctx.restore(); }
};
// 13.3 echo of 04.1: close behind Him in the wheat
const s133 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => { echo(ctx, env, "04.1", f, s, 0.1, 0.95); regrade(ctx, env, 0.5, 0.1); };
// 13.4 echo of 07.4: His look across the courtyard, re-graded from cold to warm: it was never condemnation
const s134 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => { const n = prog(f, s); echo(ctx, env, "07.4", f, s, 0.0, 1.0); regrade(ctx, env, smooth(0.15, 0.85, n) * 1.1, 0.05 + 0.12 * n); glow(ctx, 960, 420, 900, [1, 0.8, 0.5], 0.25 * smooth(0.3, 1, n)); };
// 13.5 echo of 09.5: before the crowd; 13.6 echo of 10.2: the old man walking to Rome
const s135 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => { echo(ctx, env, "09.5", f, s, 0.35, 0.95); regrade(ctx, env, 0.45, 0.1); };
const s136 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => { echo(ctx, env, "10.2", f, s, 0.2, 0.8); regrade(ctx, env, 0.45, 0.1); };

// ---------------------------------------------------------------- 13.7 Lake Gennesaret, morning
// wide at water level: an empty boat rocking gently, a net like the one he left lying in it; gold
// spreading across the water; far off, two figures walking the shore. Hold, and fade.
const s137 = (ctx: Ctx2, f: number, env: Env, s: ShotInfo) => {
  const t = f / 30, n = prog(f, s), gold = smooth(0, 0.7, n), out = smooth(0.84, 1, n);
  const BOAT: V3 = [0.6, 0, -6], BY = 0.35;
  const cam: WCam = lookFrom([lerp(-1.4, -1.0, n), 0.55, 3.8], [0.2, 0.8, -7], 190, { cy: 560, cx: 960, t, shake: 0.03, pan0: 0 });
  begin(ctx, env);
  shoreWorld(ctx, env, cam, "morning", 4.6, { t, mist: 0.3 });
  const L: Light = { ...LIGHTS.goldenMorning, key: dirView(cam, [-0.8, 0.3, -0.3]), keyAmt: 0.8 + 0.4 * gold };
  const pile = wplace(cam, env, onBoat(BOAT, BY, [-1.4, -0.28, 0.1]), BY);
  const P = (p: V3) => wproj(cam, env, p), gw = boatGunwale(-0.8);
  const drape = net(P, drapedNet(onBoat(BOAT, BY, [-0.4, gw + 0.02, 0.95]), onBoat([0, 0, 0], BY, [-0.9, 0, 0]), onBoat([0, 0, 0], BY, [0, 0, -0.8]), 14, 10, (fu, fv) => -0.2 * Math.sin(Math.PI * fv) - 0.06 * Math.sin(fu * 7.3) * fv - 0.04 * Math.sin(t * 1.1 + fu * 4) * fv), { width: Math.max(1, 0.004 * pile.scale), t, seed: 1371, veil: 0.18, knots: false });
  afloat(ctx, env, cam, [{ at: BOAT, parts: [boatAt(ctx, env, cam, BOAT, BY, t, { light: L, seed: 3, rock: 0.6 }), { ...netPileParts({ x: pile.x, y: pile.y, z: pile.z, scale: pile.scale, yaw: 0, R: pile.R, light: L, w: 0.9, d: 0.7, h: 0.3, seed: 1372 }), overlays: [drape] }] }], t, 0.5);
  // far off on the shore, two figures walking together (no faces)
  const far = (fx: number): V3 => [lerp(-26, -14, n) + fx, 0, 14];
  renderParts(ctx, [fig(ctx, env, cam, CHRIST_FIG, walk(t * 0.8, 0.9, {}), far(0), Math.PI / 2 - 0.2, t, { light: L, paint: 0.2, detail: 0 }), fig(ctx, env, cam, JOHN_FIG, walk(t * 0.8 + 0.4, 0.9, {}), far(-1.1), Math.PI / 2 - 0.2, t, { light: L, paint: 0.2, detail: 0 })], { env, cell: 2, tol: 5, paint: 0.2, fx: { haze: [0.98, 0.9, 0.75], hazeAmt: 0.35 } });
  glow(ctx, env.W * 0.25, 470, 900 + 500 * gold, [1, 0.84, 0.55], 0.25 + 0.3 * gold);
  motes(ctx, 1373, 40, t, [0, 380, env.W, 700], { color: [1, 0.92, 0.7], size: 1.8, vx: 3, vy: -1, alpha: 0.4 * gold, flicker: 2 });
  finish(ctx, env, s.abs, { bloom: 0.4, vignette: 0.3, grain: 0.07, gain: [1, 0.93, 0.8], gainAmt: 0.22, fade: [0, 0, 0], fadeAmt: out });
};

register({ "13.1": s131, "13.2": s132, "13.3": s133, "13.4": s134, "13.5": s135, "13.6": s136, "13.7": s137 });
void clamp; void easeInOut;
