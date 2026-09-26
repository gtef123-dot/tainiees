// PLATES. A plate is one depth layer of a set, painted once and cached: first drawn clean (shapes,
// gradients, light), then REPAINTED with brush marks in three passes, big to small, each mark laid
// along the forms (perpendicular to the tonal gradient, or along a given flow) and the small
// brushes only where the painting still differs from the picture. It is the painter's order: lay
// in the masses, then the halftones, then the accents where the eye goes.
import { rng, type Env } from "../../core";
import { clamp } from "../lib/math";

export type Surface = { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number };
export const surface = (env: Env, w: number, h: number): Surface => { const L = env.canvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); return { canvas: L.canvas as OffscreenCanvas, ctx: L.ctx, w: Math.round(w), h: Math.round(h) }; };

// plates are pure functions of their key, kept in a small LRU so a long film does not hold every set
const LRU_MAX = 24;
export const plate = (env: Env, key: string, w: number, h: number, build: (s: Surface) => void): Surface => {
  const store = (env.cache.get("plates") as Map<string, Surface> | undefined) ?? new Map<string, Surface>();
  env.cache.set("plates", store);
  const hit = store.get(key);
  if (hit) { store.delete(key); store.set(key, hit); return hit; }
  const s = surface(env, w, h); build(s);
  store.set(key, s);
  while (store.size > LRU_MAX) { const k = store.keys().next().value as string; store.delete(k); }
  return s;
};

// blur without ctx.filter: halve N times, scale back up (a cheap Gaussian)
export const blurInto = (env: Env, src: Surface, radius: number): Surface => {
  const out = surface(env, src.w, src.h), steps = Math.max(1, Math.round(Math.log2(Math.max(2, radius))));
  let cur: Surface = src, w = src.w, h = src.h; const chain: Surface[] = [];
  for (let i = 0; i < steps; i++) { const nw = Math.max(1, Math.ceil(w / 2)), nh = Math.max(1, Math.ceil(h / 2)), t = surface(env, nw, nh); t.ctx.imageSmoothingEnabled = true; t.ctx.imageSmoothingQuality = "high"; t.ctx.drawImage(cur.canvas as CanvasImageSource, 0, 0, w, h, 0, 0, nw, nh); chain.push(t); cur = t; w = nw; h = nh; }
  for (let i = chain.length - 2; i >= 0; i--) { const t = chain[i]; t.ctx.clearRect(0, 0, t.w, t.h); t.ctx.drawImage(cur.canvas as CanvasImageSource, 0, 0, cur.w, cur.h, 0, 0, t.w, t.h); cur = t; }
  out.ctx.imageSmoothingEnabled = true; out.ctx.drawImage(cur.canvas as CanvasImageSource, 0, 0, cur.w, cur.h, 0, 0, out.w, out.h);
  return out;
};

export type PaintOpts = {
  seed: number; sizes?: number[]; flow?: (x: number, y: number) => number | null; // flow: stroke angle (rad) or null to follow the forms
  lenK?: number; alpha?: number; threshold?: number; jitter?: number; keepBase?: number; bristle?: number;
  mask?: (x: number, y: number) => number; // 0..1: how much to repaint here (1 everywhere by default)
};
// Repaint a reference surface in place. Brush sizes are in surface pixels.
export const paintOver = (env: Env, ref: Surface, o: PaintOpts) => {
  const sizes = o.sizes ?? [22, 11, 5], W = ref.w, H = ref.h, r = rng(o.seed);
  const refData = ref.ctx.getImageData(0, 0, W, H).data;
  const out = surface(env, W, H);
  // keepBase: how much of the clean picture stays under the marks (0 = pure paint on a toned ground)
  out.ctx.globalAlpha = o.keepBase ?? 0.55; out.ctx.drawImage(ref.canvas as CanvasImageSource, 0, 0); out.ctx.globalAlpha = 1;
  const lenK = o.lenK ?? 2.6, alpha = o.alpha ?? 0.85, jit = o.jitter ?? 0.06, bristle = o.bristle ?? 0.35;
  for (let si = 0; si < sizes.length; si++) {
    const R = sizes[si], blur = blurInto(env, ref, Math.max(1, R * 0.6)), bd = blur.ctx.getImageData(0, 0, W, H).data;
    const cur = si > 0 ? out.ctx.getImageData(0, 0, W, H).data : null, thr = (o.threshold ?? 22) * (si === sizes.length - 1 ? 0.8 : 1);
    const lum = (d: Uint8ClampedArray, x: number, y: number) => { const i = (clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)) * 4; return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; };
    const cells: [number, number][] = [];
    for (let y = R * 0.5; y < H; y += R * 0.85) for (let x = R * 0.5; x < W; x += R * 0.85) cells.push([x + (r() - 0.5) * R * 0.8, y + (r() - 0.5) * R * 0.8]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = cells[i]; cells[i] = cells[j]; cells[j] = t; }   // no visible scan order
    const ctx = out.ctx; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const [x, y] of cells) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const m = o.mask ? o.mask(x, y) : 1; if (m <= 0.02) continue;
      const i = (Math.floor(y) * W + Math.floor(x)) * 4; if (refData[i + 3] < 8) continue;
      if (cur) { const d = Math.abs(cur[i] - refData[i]) + Math.abs(cur[i + 1] - refData[i + 1]) + Math.abs(cur[i + 2] - refData[i + 2]); if (d < thr) continue; }
      let ang = o.flow ? o.flow(x, y) : null;
      if (ang === null) { const gx = lum(bd, x + R * 0.5, y) - lum(bd, x - R * 0.5, y), gy = lum(bd, x, y + R * 0.5) - lum(bd, x, y - R * 0.5); ang = Math.hypot(gx, gy) < 2 ? (r() - 0.5) * 0.8 : Math.atan2(gy, gx) + Math.PI / 2; }
      ang += (r() - 0.5) * 0.35;
      const len = R * lenK * (0.6 + r() * 0.8), w = R * (0.75 + r() * 0.5), dx = Math.cos(ang), dy = Math.sin(ang);
      const k = 1 + (r() - 0.5) * jit * 2, a = refData[i + 3] / 255;
      const col = (dd: Uint8ClampedArray, px: number, py: number) => { const q = (clamp(Math.round(py), 0, H - 1) * W + clamp(Math.round(px), 0, W - 1)) * 4; return [dd[q], dd[q + 1], dd[q + 2]]; };
      // the mark carries two colours: what it was loaded with, and what it picks up at its end
      const c0 = col(bd, x, y), c1 = col(bd, x + dx * len * 0.45, y + dy * len * 0.45);
      const s = (c: number[], kk: number) => `rgba(${Math.round(clamp(c[0] * kk, 0, 255))},${Math.round(clamp(c[1] * kk, 0, 255))},${Math.round(clamp(c[2] * kk, 0, 255))},${(alpha * m * a).toFixed(3)})`;
      const g = ctx.createLinearGradient(x - dx * len * 0.5, y - dy * len * 0.5, x + dx * len * 0.5, y + dy * len * 0.5);
      g.addColorStop(0, s(c0, k)); g.addColorStop(1, s(c1, k));
      const bend = (r() - 0.5) * len * 0.18;
      ctx.strokeStyle = g; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x - dx * len * 0.5, y - dy * len * 0.5); ctx.quadraticCurveTo(x - dy * bend, y + dx * bend, x + dx * len * 0.5, y + dy * len * 0.5); ctx.stroke();
      // bristle streaks inside the mark: a lighter and a darker line
      if (bristle > 0 && R >= 6) {
        ctx.lineWidth = Math.max(0.6, w * 0.16);
        for (const [off, kk] of [[-0.28, 1.08], [0.22, 0.9]] as [number, number][]) {
          ctx.strokeStyle = s(c0, k * kk).replace(/[\d.]+\)$/, `${(alpha * m * a * bristle).toFixed(3)})`);
          ctx.beginPath(); ctx.moveTo(x - dx * len * 0.45 - dy * w * off, y - dy * len * 0.45 + dx * w * off); ctx.quadraticCurveTo(x - dy * (bend + w * off), y + dx * (bend + w * off), x + dx * len * 0.4 - dy * w * off, y + dy * len * 0.4 + dx * w * off); ctx.stroke();
        }
      }
    }
  }
  // keep the alpha of the reference (plates with holes stay holed)
  out.ctx.globalCompositeOperation = "destination-in"; out.ctx.drawImage(ref.canvas as CanvasImageSource, 0, 0); out.ctx.globalCompositeOperation = "source-over";
  ref.ctx.clearRect(0, 0, W, H); ref.ctx.drawImage(out.canvas as CanvasImageSource, 0, 0);
};
