// GALILEE: the hill country above the lake. Layered ridges receding into haze (each one cooler and
// paler), the lake glinting far below, olive terraces, the ridge-top path, wheat. Plates only.
import type { Env } from "../../core";
import { hex, mix, css, scalec, lerp } from "../lib/math";
import { plate, paintOver, blurInto, type Surface } from "../paint/plates";
import { sky, clouds, streaks, ridge, ridgeProfile, olive, tree, vgrad, grassTufts, field, rock, lake, road } from "../paint/nature";
import { type WCam, panOf } from "../scene";

export type HillTime = "golden" | "day" | "late" | "backlit" | "predawn";
const T: Record<HillTime, { sky: [number, string][]; sun: { x: number; y: number; r: number; color: string; glow: number }; haze: string; ridges: string[]; lake: [string, string]; cloud: [string, string] }> = {
  backlit: { sky: [[0, "#8aa2b8"], [0.55, "#e2cf9e"], [0.85, "#f7d898"], [1, "#fbe3b0"]], sun: { x: 900, y: 430, r: 34, color: "#fff4d2", glow: 1.0 }, haze: "#f2d8a6", ridges: ["#b8b0a8", "#9a9796", "#7f8076", "#686b52"], lake: ["#f4dfb0", "#9fb0b0"], cloud: ["#fde6b8", "#b0a8a4"] },
  golden: { sky: [[0, "#7e9ab4"], [0.6, "#d6c7a2"], [1, "#f0d7a2"]], sun: { x: 260, y: 360, r: 26, color: "#fff0c6", glow: 0.8 }, haze: "#e6d2a8", ridges: ["#aeaaa6", "#8f9190", "#76806c", "#5f6a48"], lake: ["#e8d6ac", "#7f9ea8"], cloud: ["#fbe6bd", "#a9a7aa"] },
  day: { sky: [[0, "#6c93b8"], [0.6, "#a8c1d1"], [1, "#dcdcc8"]], sun: { x: 1500, y: 60, r: 22, color: "#fffaf0", glow: 0.45 }, haze: "#cfd6d0", ridges: ["#a9b3b8", "#8d9a9c", "#72806a", "#5d6c44"], lake: ["#a9c3c8", "#4d7a88"], cloud: ["#ffffff", "#b8c3cc"] },
  predawn: { sky: [[0, "#141c34"], [0.5, "#2c3654"], [0.82, "#5a5f78"], [1, "#8a8494"]], sun: { x: 1500, y: 700, r: 1, color: "#a8a4b0", glow: 0.2 }, haze: "#5a5e72", ridges: ["#4a4e62", "#3a3e50", "#2c3040", "#20242e"], lake: ["#6a6a7c", "#2a3040"], cloud: ["#6a6a80", "#2a2e40"] },
  late: { sky: [[0, "#7d93b0"], [0.55, "#d9b98e"], [1, "#efc98e"]], sun: { x: 1650, y: 330, r: 28, color: "#ffe6b0", glow: 0.9 }, haze: "#e6c898", ridges: ["#b0a2a0", "#948c8e", "#7a7a6a", "#62653f"], lake: ["#e8c898", "#7a8f9a"], cloud: ["#fcdcaa", "#a39aa0"] },
};
const P = (env: Env, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, paint?: Parameters<typeof paintOver>[2]) =>
  plate(env, `${key}@${env.scale}`, w * env.scale, h * env.scale, (s) => { s.ctx.save(); s.ctx.scale(env.scale, env.scale); draw(s.ctx); s.ctx.restore(); if (paint) paintOver(env, s, { ...paint, sizes: (paint.sizes ?? [22, 11, 5]).map((v) => Math.max(1.5, v * env.scale)) }); });

// the far country: sky, four ridges receding, the lake far below. Horizon (the lake's far shore) at y=560.
export const hillsBackdrop = (env: Env, time: HillTime, w = 2800, h = 1300) => P(env, `gal:back2:${time}:${w}`, w, h, (c) => {
  const S = T[time], cx = (w - 1920) / 2;
  c.translate(0, 400);   // 400 px of extra sky above the old layout (the horizon is now at 960)
  sky(c, w, h, [[0, S.sky[0][1]], [1, S.sky[0][1]]]); c.save(); c.translate(0, -400); sky(c, w, 400, [[0, S.sky[0][1]], [1, S.sky[0][1]]]); c.restore();
  sky(c, w, h, S.sky.map(([t, col]) => [t * 0.7, col] as [number, string]).concat([[1, S.sky[S.sky.length - 1][1]]]), { ...S.sun, x: S.sun.x + cx });
  clouds(c, 61, 14, [0, 30, w, 330], { lit: S.cloud[0], shade: S.cloud[1], alpha: 0.45, flat: 0.34, size: 120, sunX: S.sun.x + cx });
  streaks(c, 62, 22, [0, 330, w, 520], S.cloud[0], 0.3);
  const haze = hex(S.haze);
  // the lake far below, between the hills
  lake(c, w, 560, 640, { far: S.lake[0], near: S.lake[1], sky: S.lake[0], seed: 63, wavelets: 300, glitter: { x: S.sun.x + cx, w: 300, color: "#fff4d0", a: time === "day" ? 0.3 : 0.7 } });
  const bases = [548, 600, 690, 790], amps = [30, 70, 90, 120], freqs = [0.0016, 0.0022, 0.0028, 0.0035];
  S.ridges.forEach((rc, i) => {
    const prof = ridgeProfile(64 + i, w, bases[i], amps[i], freqs[i], (x) => (i === 0 ? 0 : Math.max(0, 1 - Math.abs(x - cx - 900) / 700) * (i === 1 ? -40 : 0)));
    const col = mix(hex(rc), haze, [0.55, 0.38, 0.22, 0.08][i]);
    ridge(c, w, h, prof, { top: css(mix(col, haze, 0.25)), bottom: css(scalec(col, 0.85)), texture: 0.5 + i * 0.3, seed: 70 + i, terraces: i >= 2 ? 6 + i * 2 : 0, shrubs: i >= 2 ? 300 * (i - 1) : 0, shrubColor: i === 3 ? "#56603a" : "#6c7258", lightFrom: time === "late" ? 1 : -1 });
    if (i === 3) for (let k = 0; k < 26; k++) { const x = (k / 26) * w + ((k * 37) % 50), y = prof(x) + 30 + ((k * 53) % 90); olive(c, x, y, 42 + ((k * 13) % 20), 900 + k, { light: time === "late" ? 1 : -1 }); }
  });
  vgrad(c, 0, 500, w, 700, [[0, css(haze, 0.0)], [0.5, css(haze, 0.28)], [1, css(haze, 0.0)]]);
}, { seed: 65, sizes: [26, 12, 5], flow: (_x, y) => (y < 480 ? 0.03 : null), keepBase: 0.55, alpha: 0.8 });

// the ridge top the figures walk on: dry grass, stones, a dusty path; crest at y=40 of the plate
export const ridgeTop = (env: Env, time: HillTime, w = 2800, h = 500) => P(env, `gal:ridge:${time}:${w}`, w, h, (c) => {
  const S = T[time], base = hex(time === "day" ? "#a39a6a" : "#b09a66"), crest = (x: number) => 40 + Math.sin(x * 0.0022) * 18 + Math.sin(x * 0.009) * 6;
  c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 6) c.lineTo(x, crest(x)); c.lineTo(w, h); c.closePath();
  const g = c.createLinearGradient(0, 30, 0, h); g.addColorStop(0, css(mix(base, hex(S.haze), 0.35))); g.addColorStop(0.35, css(base)); g.addColorStop(1, css(scalec(base, 0.7))); c.fillStyle = g; c.fill();
  c.save(); c.clip();
  road(c, [[-100, 150, 160], [900, 180, 220], [1900, 200, 260], [2900, 170, 200]], "#c7ae84", 81);
  for (let i = 0; i < 40; i++) rock(c, (i / 40) * w + ((i * 71) % 60), crest((i / 40) * w) + 30 + ((i * 37) % 300), 20 + ((i * 17) % 50), 12 + ((i * 11) % 26), 300 + i, { color: "#9a8f7c", light: time === "late" ? 1 : -1 });
  grassTufts(c, 82, 900, [0, 30, w, h], time === "day" ? "#9c9760" : "#b39c62", 26);
  c.restore();
  // rim of light along the crest when the sun is behind
  if (time === "backlit" || time === "late") { c.strokeStyle = css(hex("#fff0c8"), 0.55); c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= w; x += 6) (x ? c.lineTo(x, crest(x) + 1) : c.moveTo(x, crest(x) + 1)); c.stroke(); }
}, { seed: 83, sizes: [18, 9, 4], keepBase: 0.55, alpha: 0.8 });
export const RIDGE_CREST = (x: number) => 40 + Math.sin(x * 0.0022) * 18 + Math.sin(x * 0.009) * 6;

// tall dry grass and wild oats for the foreground (near the lens: big, dark against the light, soft)
export const thistles = (env: Env, time: HillTime, w = 3200, h = 600) => P(env, `gal:grass:${time}:${w}`, w, h, (c) => {
  const col = hex(time === "backlit" || time === "late" ? "#3e3526" : "#6e6644"), rim = hex(T[time].haze);
  let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 70; i++) {
    const x = r() * w, hgt = 120 + r() * 380, bend = (r() - 0.4) * 140, wdt = 3 + r() * 5;
    c.strokeStyle = css(scalec(col, 0.8 + r() * 0.4)); c.lineWidth = wdt; c.lineCap = "round"; c.beginPath(); c.moveTo(x, h + 10); c.quadraticCurveTo(x + bend * 0.2, h - hgt * 0.6, x + bend, h - hgt); c.stroke();
    if (r() < 0.55) for (let k = 0; k < 7; k++) { const tt = 0.72 + k * 0.045, px = x + bend * tt * tt, py = h - hgt * tt, a = -1.2 + (k % 2 ? 0.9 : -0.9) + (r() - 0.5) * 0.3; c.fillStyle = css(col); c.beginPath(); c.ellipse(px + Math.cos(a) * 12, py + Math.sin(a) * 12, 11, 4, a, 0, Math.PI * 2); c.fill(); c.strokeStyle = css(rim, 0.55); c.lineWidth = 1.3; c.beginPath(); c.ellipse(px + Math.cos(a) * 12, py + Math.sin(a) * 12, 11, 4, a, -1.2, 0.8); c.stroke(); }
    c.strokeStyle = css(rim, 0.4); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + wdt * 0.4, h); c.quadraticCurveTo(x + bend * 0.2 + wdt * 0.4, h - hgt * 0.6, x + bend + 1, h - hgt); c.stroke();
  }
}, { seed: 92, sizes: [12, 6], keepBase: 0.7, alpha: 0.6 });

// a field of ripe wheat for the walk behind Him (04.1): heads catch the light
export const wheat = (env: Env, time: HillTime, w = 2800, h = 700, t = 0) => P(env, `gal:wheat:${time}:${w}`, w, h, (c) => {
  field(c, w, 0, h, 95, { base: time === "late" ? "#b88f52" : "#c9a45e", stalk: "#b8954f", head: "#e0c07a", density: 1.3, wind: 0.25, t });
}, { seed: 96, sizes: [14, 7, 3], flow: () => -Math.PI / 2 + 0.15, keepBase: 0.55, alpha: 0.75 });

// the far country behind a world camera (the horizon follows tilt; the pan follows yaw)
export const hillsWorld = (ctx: CanvasRenderingContext2D, env: Env, cam: WCam, time: HillTime, focal = 2000, blur = 0) => {
  const hy = (cam.cy ?? env.H / 2) - Math.tan(cam.tilt) * (cam.focal ?? focal), px = panOf(cam), back = hillsBackdrop(env, time);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = T[time].sky[0][1]; ctx.fillRect(0, 0, env.W, env.H); ctx.restore();
  const src: Surface = blur > 0.05 ? plate(env, `gal:back2:${time}:soft@${env.scale}`, back.w, back.h, (s) => { const b = blurInto(env, back, 24 * env.scale); s.ctx.drawImage(b.canvas as CanvasImageSource, 0, 0); }) : back;
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.drawImage(src.canvas as CanvasImageSource, (env.W - 2800) / 2 + px, hy - 960, 2800, 1300); ctx.restore();
  return hy;
};
export { lerp, tree };
