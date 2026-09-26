// THE CHARACTER SHEET: identity, ages, views, expressions, figures and hands, from the same modules the film poses.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { drawHead } from "./peter/figure/head";
import { drawFigure, aim } from "./peter/figure/body";
import { PETER, CHRIST, PETER_FIG, CHRIST_FIG, type Stage } from "./peter/figure/cast";
import { FACE, HANDS, LIGHTS } from "./peter/figure/acting";

const W = 2560, H = 1600;
const label = (ctx: Ctx, s: string, x: number, y: number, size = 22, color = "#3a2e24", align: CanvasTextAlign = "center") => { ctx.fillStyle = color; ctx.font = `${size}px "DejaVu Serif", serif`; ctx.textAlign = align; ctx.fillText(s, x, y); };
const draw = (ctx: Ctx, _f: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#d9cbb1"); g.addColorStop(1, "#c8b595"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  label(ctx, "ΠΕΤΡΟΣ — Peter · character sheet", 60, 64, 40, "#3a2e24", "left");
  label(ctx, "One head, one body, posed in every shot. The bones never change; age, hair, beard and weather do. The scar through the left eyebrow is his at every age.", 60, 100, 20, "#5a4a3a", "left");
  const stages: Stage[] = ["A", "B", "C", "D", "E"], names = ["A · Simon, ~30", "B · the disciple", "C · Passion", "D · the missionary", "E · Rome, ~65", "Christ"];
  const views = [{ n: "front", yaw: 0 }, { n: "3/4", yaw: -0.62 }, { n: "profile", yaw: -1.5 }];
  const colX = (i: number) => 250 + i * 405, rowY = (r: number) => 262 + r * 205, S = 150, light = LIGHTS.studio;
  for (let c = 0; c < 6; c++) {
    label(ctx, names[c], colX(c), 150, 24);
    const fig = c < 5 ? PETER_FIG[stages[c]] : CHRIST_FIG, sc = S / (fig.height / 7.3);
    for (let r = 0; r < 3; r++) {
      const pose = {}, at = aim(fig, pose, "head", views[r].yaw, sc, colX(c), rowY(r) - 10);
      ctx.save(); ctx.beginPath(); ctx.rect(colX(c) - 190, rowY(r) - 115, 380, 200); ctx.clip();
      drawFigure(ctx, fig, pose, { x: at.x, y: at.y, scale: sc, yaw: views[r].yaw, light, expr: c === 5 ? { lid: 0.72 } : FACE.neutral }, env);
      ctx.restore();
    }
  }
  for (let r = 0; r < 3; r++) label(ctx, views[r].n, 60, rowY(r) + 8, 20, "#5a4a3a", "left");
  // expressions (stage B)
  const ex = ["neutral", "joyful", "amazed", "confident", "frightened", "ashamed", "crying", "peaceful", "determined"];
  label(ctx, "Expressions (stage B)", 60, 850, 24, "#3a2e24", "left");
  ex.forEach((e, i) => { const x = 180 + i * 270, y = 985, fig = PETER_FIG.B, sc = 160 / (fig.height / 7.3), yaw = -0.35 + (i % 2) * 0.1, pose = { neck: { pitch: e === "ashamed" || e === "crying" ? 0.3 : 0.02 } }, at = aim(fig, pose, "head", yaw, sc, x, y - 10);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 130, y - 125, 260, 205); ctx.clip(); drawFigure(ctx, fig, pose, { x: at.x, y: at.y, scale: sc, yaw, light, expr: FACE[e], t: 1.3 }, env); ctx.restore(); label(ctx, e, x, 1112, 20); });
  // full figures: the one outfit, fading and wearing over 35 years; Christ in undyed linen and madder red
  label(ctx, "Figures and costume", 60, 1165, 24, "#3a2e24", "left");
  const figs = [PETER_FIG.A, PETER_FIG.B, { ...PETER_FIG.C, costume: { ...PETER_FIG.C.costume, hood: 1 } }, PETER_FIG.D, PETER_FIG.E, CHRIST_FIG];
  const notes = ["knee tunic, bare arms", "the grey-blue mantle", "hooded, the night of the denial", "the mantle fading", "worn, pale, 65", "linen and madder red"];
  figs.forEach((f, i) => { const x = 250 + i * 405; drawFigure(ctx, f, { armL: { out: 0.1, elbow: 0.2 }, armR: { out: 0.1, elbow: 0.2 } }, { x, y: 1560, scale: 215, yaw: -0.35, light, expr: i === 2 ? FACE.frightened : FACE.neutral }, env); label(ctx, notes[i], x, 1592, 18, "#5a4a3a"); });
  void HANDS;
};
export const peterSheet: Film = { meta: { title: "peterSheet", W, H, fps: 30, bpm: 1800, durationFrames: 1, raster: "cpu" }, assets: { images: {} }, shots: [{ id: "sheet", start: 0, end: 1, draw }] };
