// ROME. The Via Appia (tombs, umbrella pines, the great polygonal paving), the city seen from the road
// (the aqueduct striding in, roofs and temples in haze), the dense streets, the Circus by the obelisk.
import type { Env } from "../../core";
import { rng } from "../../core";
import { hex, mix, css, scalec, lerp, clamp } from "../lib/math";
import { plate, paintOver, blurInto, type Surface } from "../paint/plates";
import { sky, clouds, vgrad, ridge, ridgeProfile, paintTree } from "../paint/nature";
import { insula, colonnade, obelisk, arcade } from "../paint/architecture";
import { type WCam, panOf } from "../scene";
import { horizonOf } from "./lake";

const P = (env: Env, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, paint?: Parameters<typeof paintOver>[2]) =>
  plate(env, `${key}@${env.scale}`, w * env.scale, h * env.scale, (s) => { s.ctx.save(); s.ctx.scale(env.scale, env.scale); draw(s.ctx); s.ctx.restore(); if (paint) paintOver(env, s, { ...paint, sizes: (paint.sizes ?? [22, 11, 5]).map((v) => Math.max(1.5, v * env.scale)) }); });
export const ROME_HORIZON = 560;
// the Campagna and the city from the Via Appia: haze, the Alban hills, the aqueduct arches, Rome's
// roofs and temples, all dust-gold. `city`: how much of the city is raised (0: open country only)
export const romeBackdrop = (env: Env, hot = false) => P(env, `rome:back:${hot}`, 2800, 1100, (c) => {
  const w = 2800, h = 1100, r = rng(1001), H = ROME_HORIZON;
  sky(c, w, h, [[0, hot ? "#8aa0b2" : "#7d98b4"], [0.42, "#c8c4b0"], [0.5, "#e2d4b0"], [1, "#d8c8a4"]]);
  clouds(c, 1002, 10, [0, 60, w, 380], { lit: "#fbf0d8", shade: "#b8b0a4", alpha: 0.4, flat: 0.3, size: 140 });
  const haze = hex("#dccfb0");
  ridge(c, w, h, ridgeProfile(1003, w, H - 40, 40, 0.0012), { top: css(mix(hex("#9a9aa0"), haze, 0.6)), bottom: css(mix(hex("#9a9aa0"), haze, 0.5)), texture: 0.4, seed: 1004 });
  // the city: a low mass of roofs, then temples and the tall insulae picked out in the haze
  for (let i = 0; i < 70; i++) { const x = 1400 + (r() - 0.3) * 1500, bw = 30 + r() * 70, bh = 18 + r() * 60, col = mix(hex(r() < 0.5 ? "#c8a078" : "#d4c0a0"), haze, 0.45 + r() * 0.2); c.fillStyle = css(col); c.fillRect(x, H - bh, bw, bh + 4); c.fillStyle = css(mix(hex("#9c5a3c"), haze, 0.5)); c.fillRect(x - 2, H - bh - 4, bw + 4, 5); }
  for (let i = 0; i < 6; i++) { const x = 1500 + i * 190 + r() * 60, tw = 70 + r() * 50, th = 50 + r() * 30; colonnade(c, x, x + tw, H - 20, th, 6, 3, { color: css(mix(hex("#e8dcc0"), haze, 0.35)) }); c.fillStyle = css(mix(hex("#b09070"), haze, 0.35)); c.beginPath(); c.moveTo(x - 6, H - 20 - th); c.lineTo(x + tw / 2, H - 20 - th - 22); c.lineTo(x + tw + 6, H - 20 - th); c.closePath(); c.fill(); }
  vgrad(c, 0, H - 120, w, H + 10, [[0, css(haze, 0)], [1, css(haze, 0.55)]]);
  // the aqueduct: a long line of arches striding in across the plain toward the city, diminishing
  for (let i = 0; i < 60; i++) { const f = i / 60, x = lerp(200, 1500, f), s = lerp(1.6, 0.35, f), y = H + lerp(70, 6, f), ah = 90 * s, aw = 44 * s; c.fillStyle = css(mix(hex("#b88a64"), haze, f * 0.6)); c.fillRect(x, y - ah, aw * 0.28, ah); c.fillRect(x, y - ah - 14 * s, aw * 1.02, 14 * s); c.fillStyle = css(mix(hex("#7a5a40"), haze, f * 0.6), 0.5); c.fillRect(x + aw * 0.28, y - ah + 4 * s, aw * 0.72, ah * 0.1); }
  // the flat Campagna in front
  const g = c.createLinearGradient(0, H, 0, h); g.addColorStop(0, css(mix(hex("#a89468"), haze, 0.5))); g.addColorStop(1, "#8e7c56"); c.fillStyle = g; c.fillRect(0, H + 4, w, h - H);
}, { seed: 1005, sizes: [20, 10, 5], flow: (_x, y) => (y < 450 ? 0.02 : null), keepBase: 0.6, alpha: 0.72 });
export const romeWorld = (ctx: CanvasRenderingContext2D, env: Env, cam: WCam, rise = 0, blur = 0) => {
  const hy = horizonOf(cam, env.H), px = panOf(cam), back = romeBackdrop(env);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#7d98b4"; ctx.fillRect(0, 0, env.W, env.H);
  const src: Surface = blur > 0.05 ? plate(env, `rome:back:soft@${env.scale}`, back.w, back.h, (s) => { const b = blurInto(env, back, 20 * env.scale); s.ctx.drawImage(b.canvas as CanvasImageSource, 0, 0); }) : back;
  ctx.drawImage(src.canvas as CanvasImageSource, (env.W - 2800) / 2 + px, hy - ROME_HORIZON - rise * 60, 2800, 1100); ctx.restore();
};

// a Roman tomb on the Appia seen side-on on a transparent card: a drum on a square base (like Caecilia
// Metella) or a small temple-tomb, travertine, weathered, with an inscription band. 900 x 700 px.
export const tombTex = (env: Env, kind: "drum" | "temple" | "stele", seed: number) => plate(env, `tex:tomb:${kind}:${seed}`, 900, 700, (s) => {
  const c = s.ctx, r = rng(seed), stone = hex("#d6c8a8"), shade = scalec(stone, 0.62);
  if (kind === "drum") {
    c.fillStyle = css(scalec(stone, 0.85)); c.fillRect(150, 470, 600, 230); c.fillStyle = css(shade); c.fillRect(150, 470, 600, 16);
    const g = c.createLinearGradient(200, 0, 700, 0); g.addColorStop(0, css(scalec(stone, 1.05))); g.addColorStop(0.7, css(stone)); g.addColorStop(1, css(shade)); c.fillStyle = g; c.fillRect(200, 180, 500, 300);
    c.fillStyle = css(scalec(stone, 0.9)); c.fillRect(190, 170, 520, 26); for (let x = 205; x < 700; x += 38) { c.fillStyle = css(shade); c.fillRect(x, 200, 3, 24); }
    c.fillStyle = css(hex("#5a6a3a")); c.beginPath(); c.moveTo(210, 175); for (let x = 210; x <= 690; x += 20) c.lineTo(x, 170 - r() * 30); c.lineTo(690, 175); c.fill();
    c.fillStyle = css(scalec(stone, 0.5), 0.6); c.fillRect(380, 300, 140, 20);
  } else if (kind === "temple") {
    c.fillStyle = css(scalec(stone, 0.85)); c.fillRect(250, 520, 400, 180);
    for (let i = 0; i < 4; i++) { const x = 270 + i * 110; const g = c.createLinearGradient(x, 0, x + 40, 0); g.addColorStop(0, css(scalec(stone, 1.05))); g.addColorStop(1, css(shade)); c.fillStyle = g; c.fillRect(x, 300, 40, 220); }
    c.fillStyle = css(scalec(stone, 0.95)); c.fillRect(250, 280, 400, 24); c.beginPath(); c.moveTo(240, 282); c.lineTo(450, 190); c.lineTo(660, 282); c.closePath(); c.fill(); c.fillStyle = css(shade); c.fillRect(310, 330, 280, 190);
  } else {
    c.fillStyle = css(scalec(stone, 0.9)); c.fillRect(380, 360, 140, 340); c.beginPath(); c.moveTo(370, 362); c.lineTo(450, 320); c.lineTo(530, 362); c.closePath(); c.fill();
    c.fillStyle = css(shade, 0.7); for (let i = 0; i < 5; i++) c.fillRect(400, 420 + i * 22, 100, 6);
  }
  // weather: stains, cracks, grass at the foot
  for (let i = 0; i < 40; i++) { const x = 150 + r() * 600, y = 180 + r() * 500; c.fillStyle = `rgba(80,70,55,${0.08 + r() * 0.1})`; c.fillRect(x, y, 3 + r() * 20, 10 + r() * 60); }
  c.fillStyle = "#6a6a3a"; for (let i = 0; i < 80; i++) { const x = 140 + r() * 620; c.fillRect(x, 690 - r() * 30, 2, 30); }
  paintOver(env, s, { seed: seed + 1, sizes: [8, 4], keepBase: 0.65, alpha: 0.65 });
});
// a Roman street front: insulae of four and five storeys over shops, balconies, a colonnade. 30 x 16 m.
export const insulaTex = (env: Env, seed: number, lit = 1) => plate(env, `tex:insula:${seed}:${lit}`, 1500, 800, (s) => {
  const c = s.ctx, r = rng(seed); let x = 0;
  while (x < 1500) { const w = 180 + r() * 220, h = 520 + r() * 260, fl = 4 + Math.floor(r() * 2); insula(c, x, 800, w, h, fl, { lit, seed: seed * 10 + Math.floor(x), color: r() < 0.5 ? "#c69a74" : "#d0a882", shops: true }); x += w + (r() < 0.2 ? 20 : 0); }
  paintOver(env, s, { seed: seed + 1, sizes: [10, 5, 2.5], keepBase: 0.6, alpha: 0.7 });
});
// the Circus of Nero at the end of the day, seen from very far across the sand: the obelisk, the long
// low line of the stands, and the pale sky; silhouettes are drawn over it in the shot. 2400 x 1100.
export const circusPlate = (env: Env) => P(env, `rome:circus`, 2400, 1100, (c) => {
  const w = 2400, h = 1100, H = 700;
  sky(c, w, h, [[0, "#6a7896"], [0.4, "#c8a88c"], [0.62, "#f0c890"], [0.64, "#f6d8a4"], [1, "#d0a878"]], { x: 1650, y: H - 60, r: 34, color: "#fff2d0", glow: 1.2 });
  c.fillStyle = "#4a3830"; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= w; x += 40) c.lineTo(x, H - 70 - 10 * Math.sin(x * 0.01)); c.lineTo(w, H); c.closePath(); c.fill();
  for (let x = 0; x < w; x += 60) { c.fillStyle = "#3a2c26"; c.fillRect(x, H - 110, 26, 45); }
  const g = c.createLinearGradient(0, H, 0, h); g.addColorStop(0, "#d8b888"); g.addColorStop(1, "#b89468"); c.fillStyle = g; c.fillRect(0, H, w, h - H);
  obelisk(c, 820, H + 30, 330, 38, { color: "#3a2c26", lightFrom: 1, lit: 0.3 });
  void clamp; void paintTree; void arcade;
}, { seed: 1011, sizes: [18, 9, 4], keepBase: 0.6, alpha: 0.7 });
