// CAMERA + FINISH. A multiplane camera over painted plates (parallax from real depth: a dolly
// scales near layers more than far ones, a track slides them further), deterministic handheld
// drift, and the finish every frame gets: grade, bloom, vignette, grain, the canvas weave.
import { fractal, rng, type Env } from "../../core";
import { clamp, type RGB, css } from "../lib/math";
import { type Surface, surface } from "./plates";

export type Cam = { tx: number; ty: number; push: number; panX: number; panY: number; roll: number; shake: number; t: number };
export const cam0 = (): Cam => ({ tx: 0, ty: 0, push: 0, panX: 0, panY: 0, roll: 0, shake: 0, t: 0 });
// handheld: smooth seeded noise, a few px, never a jitter
export const shakeOf = (c: Cam, seed = 7): [number, number, number] => {
  if (!c.shake) return [0, 0, 0];
  const t = c.t * 0.9, a = c.shake;
  return [(fractal(seed, t, 0.3, 1, 1, 3) - 0.5) * 14 * a, (fractal(seed + 5, 0.7, t, 1, 1, 3) - 0.5) * 10 * a, (fractal(seed + 9, t * 0.7, 1.9, 1, 1, 2) - 0.5) * 0.012 * a];
};
// the transform of a layer at parallax p (1 = the subject's plane, <1 farther, >1 nearer)
export const layerXf = (c: Cam, p: number, W: number, H: number) => {
  const s = 1 / Math.max(0.2, 1 - c.push * p), [hx, hy, hr] = shakeOf(c);
  return { s, ox: -c.tx * p * s + c.panX + hx * (0.6 + 0.4 * p), oy: -c.ty * p * s + c.panY + hy * (0.6 + 0.4 * p), cx: W / 2, cy: H / 2, roll: c.roll + hr };
};
// map a point on a layer (in layer coords where the frame centre is (W/2,H/2) at rest) to the screen
export const toScreen = (c: Cam, p: number, W: number, H: number, x: number, y: number) => { const f = layerXf(c, p, W, H), dx = (x - f.cx) * f.s, dy = (y - f.cy) * f.s, cs = Math.cos(f.roll), sn = Math.sin(f.roll); return [f.cx + dx * cs - dy * sn + f.ox, f.cy + dx * sn + dy * cs + f.oy, f.s] as [number, number, number]; };
// set the ctx so drawing in layer coords lands on the screen
export const applyLayer = (ctx: CanvasRenderingContext2D, env: Env, c: Cam, p: number) => {
  const f = layerXf(c, p, env.W, env.H), k = env.scale;
  ctx.setTransform(k, 0, 0, k, 0, 0); ctx.translate(f.cx + f.ox, f.cy + f.oy); ctx.rotate(f.roll); ctx.scale(f.s, f.s); ctx.translate(-f.cx, -f.cy);
};
// draw a painted plate (its own pixel size = logical size * env.scale) positioned at (x, y) in layer coords
export const drawPlate = (ctx: CanvasRenderingContext2D, env: Env, c: Cam, p: number, pl: Surface, x: number, y: number, alpha = 1, blend: GlobalCompositeOperation = "source-over") => {
  ctx.save(); applyLayer(ctx, env, c, p); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = blend; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(pl.canvas as CanvasImageSource, x, y, pl.w / env.scale, pl.h / env.scale); ctx.restore();
};

// ---------------------------------------------------------------- finish
export type Grade = { lift?: RGB; liftAmt?: number; gain?: RGB; gainAmt?: number; sat?: number; contrast?: number; vignette?: number; bloom?: number; grain?: number; warmth?: number; fade?: RGB; fadeAmt?: number };
const tileCache = (env: Env, key: string, n: number, fn: (d: Uint8ClampedArray, n: number) => void) => {
  let t = env.cache.get(key) as Surface | undefined; if (t) return t;
  t = surface(env, n, n); const img = t.ctx.createImageData(n, n); fn(img.data, n); t.ctx.putImageData(img, 0, 0); env.cache.set(key, t); return t;
};
export const finish = (ctx: CanvasRenderingContext2D, env: Env, frame: number, g: Grade) => {
  const W = Math.round(env.W * env.scale), H = Math.round(env.H * env.scale);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // bloom: the brightest light spills a little (half-res copy, blurred by the scaler, screened back)
  if (g.bloom) {
    const key = `bloom:${W}`; let b = env.cache.get(key) as Surface | undefined; if (!b) { b = surface(env, Math.ceil(W / 8), Math.ceil(H / 8)); env.cache.set(key, b); }
    b.ctx.globalCompositeOperation = "source-over"; b.ctx.clearRect(0, 0, b.w, b.h); b.ctx.imageSmoothingEnabled = true; b.ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0, W, H, 0, 0, b.w, b.h);
    b.ctx.globalCompositeOperation = "multiply"; b.ctx.drawImage(b.canvas as CanvasImageSource, 0, 0); b.ctx.drawImage(b.canvas as CanvasImageSource, 0, 0);
    ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = g.bloom; ctx.imageSmoothingEnabled = true; ctx.drawImage(b.canvas as CanvasImageSource, 0, 0, b.w, b.h, 0, 0, W, H);
  }
  if (g.contrast) { ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = clamp(Math.abs(g.contrast)); ctx.fillStyle = g.contrast > 0 ? "#808080" : "#808080"; ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0); }
  if (g.sat !== undefined && g.sat < 1) { ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha = clamp(1 - g.sat); ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H); }
  if (g.gain && g.gainAmt) { ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = g.gainAmt; ctx.fillStyle = css(g.gain); ctx.fillRect(0, 0, W, H); }
  if (g.lift && g.liftAmt) { ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = g.liftAmt; ctx.fillStyle = css(g.lift); ctx.fillRect(0, 0, W, H); }
  if (g.fade && g.fadeAmt) { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = clamp(g.fadeAmt); ctx.fillStyle = css(g.fade); ctx.fillRect(0, 0, W, H); }
  // vignette
  if (g.vignette) { ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = 1; const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.35, W / 2, H * 0.5, H * 1.05); v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(1, `rgba(${Math.round(255 * (1 - g.vignette))},${Math.round(250 * (1 - g.vignette))},${Math.round(245 * (1 - g.vignette))},1)`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
  // canvas weave + grain (the grain moves on twos)
  const weave = tileCache(env, `weave:${env.scale}`, 256, (d, n) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = (y * n + x) * 4, wx = Math.sin((x / n) * Math.PI * 2 * 22) * 0.5 + 0.5, wy = Math.sin((y / n) * Math.PI * 2 * 22) * 0.5 + 0.5, v = 128 + ((x + y) % 2 ? 1 : -1) * 0 + (wx * wy - 0.25) * 60 + (fractal(41, x / n, y / n, 9, 9, 2, 1) - 0.5) * 40; d[i] = d[i + 1] = d[i + 2] = clamp(v, 0, 255); d[i + 3] = 255; } });
  ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.16; ctx.fillStyle = ctx.createPattern(weave.canvas as CanvasImageSource, "repeat")!; ctx.fillRect(0, 0, W, H);
  if (g.grain) {
    const grain = tileCache(env, `grain:${env.scale}`, 512, (d, n) => { const r = rng(99); for (let i = 0; i < n * n; i++) { const v = 128 + (r() + r() + r() - 1.5) * 90; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = clamp(v, 0, 255); d[i * 4 + 3] = 255; } });
    const r = rng(Math.floor(frame / 2) * 7 + 3), ox = Math.floor(r() * 512), oy = Math.floor(r() * 512);
    ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = g.grain; ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(grain.canvas as CanvasImageSource, "repeat")!; ctx.fillRect(ox, oy, W, H);
  }
  ctx.restore();
};

// ---------------------------------------------------------------- light and air
// a shaft of light: a soft wedge from a source, additive
export const shaft = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, color: RGB, a: number) => {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, css(color, a)); g.addColorStop(0.6, css(color, a * 0.45)); g.addColorStop(1, css(color, 0));
  ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1); ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.closePath(); ctx.fill(); ctx.restore();
};
export const glow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: RGB, a: number, blend: GlobalCompositeOperation = "screen") => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, css(color, a)); g.addColorStop(0.35, css(color, a * 0.5)); g.addColorStop(1, css(color, 0));
  ctx.save(); ctx.globalCompositeOperation = blend; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
};
// drifting motes (dust in light, spray, embers): positions are pure functions of time
export const motes = (ctx: CanvasRenderingContext2D, seed: number, n: number, t: number, box: [number, number, number, number], o: { color: RGB; size: number; vx: number; vy: number; alpha: number; flicker?: number; blend?: GlobalCompositeOperation }) => {
  const r = rng(seed), [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
  ctx.save(); ctx.globalCompositeOperation = o.blend ?? "screen";
  for (let i = 0; i < n; i++) {
    const px = r(), py = r(), sp = 0.6 + r() * 0.8, ph = r() * 6.28, sz = o.size * (0.5 + r());
    const x = x0 + ((((px * w + o.vx * sp * t + Math.sin(t * 0.7 + ph) * 12) % w) + w) % w), y = y0 + ((((py * h + o.vy * sp * t + Math.cos(t * 0.5 + ph) * 8) % h) + h) % h);
    const a = o.alpha * (o.flicker ? 0.5 + 0.5 * Math.sin(t * o.flicker * sp + ph) : 1);
    ctx.fillStyle = css(o.color, clamp(a)); ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
};
