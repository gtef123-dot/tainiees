// THE SHARED RENDERER for everything built in 3D (heads, bodies, hands, cloth): projected
// triangles sorted far to near, a coarse depth grid for "is this point visible", and the PAINT pass
// that repaints the smooth render with brush marks anchored on the surface (so marks turn with
// the form instead of swimming) and coloured from the paint beneath them.
import { rng } from "../../core";
import { type RGB, css, scalec, clamp } from "../lib/math";

export type Tri = { ax: number; ay: number; bx: number; by: number; cx: number; cy: number; z: number; col: RGB; alpha?: number; tag?: number };
export type Anchor = { x: number; y: number; z: number; dx: number; dy: number; len: number; w: number; seed: number; alpha?: number };

export class DepthGrid {
  x0 = 0; y0 = 0; cell = 4; W = 1; H = 1; z = new Float32Array(1);
  constructor(tris: Tri[], cell: number) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const t of tris) { x0 = Math.min(x0, t.ax, t.bx, t.cx); y0 = Math.min(y0, t.ay, t.by, t.cy); x1 = Math.max(x1, t.ax, t.bx, t.cx); y1 = Math.max(y1, t.ay, t.by, t.cy); }
    if (!tris.length) return;
    this.x0 = x0; this.y0 = y0; this.cell = cell; this.W = Math.max(1, Math.ceil((x1 - x0) / cell) + 1); this.H = Math.max(1, Math.ceil((y1 - y0) / cell) + 1);
    this.z = new Float32Array(this.W * this.H).fill(-1e9);
    for (const t of tris) {
      const den = (t.by - t.cy) * (t.ax - t.cx) + (t.cx - t.bx) * (t.ay - t.cy); if (Math.abs(den) < 1e-9) continue;
      const i0 = Math.max(0, Math.floor((Math.min(t.ax, t.bx, t.cx) - x0) / cell)), i1 = Math.min(this.W - 1, Math.ceil((Math.max(t.ax, t.bx, t.cx) - x0) / cell));
      const j0 = Math.max(0, Math.floor((Math.min(t.ay, t.by, t.cy) - y0) / cell)), j1 = Math.min(this.H - 1, Math.ceil((Math.max(t.ay, t.by, t.cy) - y0) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = x0 + i * cell, py = y0 + j * cell, w1 = ((t.by - t.cy) * (px - t.cx) + (t.cx - t.bx) * (py - t.cy)) / den, w2 = ((t.cy - t.ay) * (px - t.cx) + (t.ax - t.cx) * (py - t.cy)) / den, w3 = 1 - w1 - w2;
        if (w1 < -0.02 || w2 < -0.02 || w3 < -0.02) continue;
        const k = j * this.W + i; if (t.z > this.z[k]) this.z[k] = t.z;
      }
    }
  }
  seen(x: number, y: number, z: number, tol: number) { const i = Math.round((x - this.x0) / this.cell), j = Math.round((y - this.y0) / this.cell); if (i < 0 || j < 0 || i >= this.W || j >= this.H) return false; return z >= this.z[j * this.W + i] - tol; }
}

const lw = new Map<number, number>();
export const fillTris = (ctx: CanvasRenderingContext2D, tris: Tri[], seam: number) => {
  ctx.lineJoin = "round"; ctx.lineWidth = seam;
  for (const t of tris) {
    const s = css(t.col); ctx.fillStyle = s; ctx.strokeStyle = s; ctx.globalAlpha = t.alpha ?? 1;
    ctx.beginPath(); ctx.moveTo(t.ax, t.ay); ctx.lineTo(t.bx, t.by); ctx.lineTo(t.cx, t.cy); ctx.closePath(); ctx.fill(); if (seam > 0) ctx.stroke();
  }
  ctx.globalAlpha = 1; void lw;
};

// Repaint: each anchor becomes one bristle mark coloured by the pixel under it.
export const paintAnchors = (ctx: CanvasRenderingContext2D, anchors: Anchor[], depth: DepthGrid, tol: number, opacity = 0.62) => {
  if (!anchors.length) return;
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (const a of anchors) { bx0 = Math.min(bx0, a.x); by0 = Math.min(by0, a.y); bx1 = Math.max(bx1, a.x); by1 = Math.max(by1, a.y); }
  const tr = ctx.getTransform(), X0 = Math.max(0, Math.floor(tr.a * bx0 + tr.e)), Y0 = Math.max(0, Math.floor(tr.d * by0 + tr.f)), X1 = Math.min(ctx.canvas.width, Math.ceil(tr.a * bx1 + tr.e) + 1), Y1 = Math.min(ctx.canvas.height, Math.ceil(tr.d * by1 + tr.f) + 1);
  if (X1 <= X0 || Y1 <= Y0) return;
  const img = ctx.getImageData(X0, Y0, X1 - X0, Y1 - Y0).data, IW = X1 - X0, IH = Y1 - Y0;
  ctx.save(); ctx.lineCap = "round";
  for (const a of anchors) {
    if (!depth.seen(a.x, a.y, a.z, tol)) continue;
    const X = Math.round(tr.a * a.x + tr.e) - X0, Y = Math.round(tr.d * a.y + tr.f) - Y0; if (X < 0 || Y < 0 || X >= IW || Y >= IH) continue;
    const q = (Y * IW + X) * 4; if (img[q + 3] < 200) continue;
    const r = rng(a.seed), j1 = r(), j2 = r(), j3 = r();
    const c: RGB = scalec([img[q] / 255, img[q + 1] / 255, img[q + 2] / 255], 0.93 + j2 * 0.14);
    const L = a.len * (0.6 + j1 * 0.8), bend = (j3 - 0.5) * L * 0.25;
    ctx.strokeStyle = css(c, clamp(opacity * (a.alpha ?? 1))); ctx.lineWidth = a.w * (0.75 + j2 * 0.7);
    ctx.beginPath(); ctx.moveTo(a.x - a.dx * L * 0.5, a.y - a.dy * L * 0.5); ctx.quadraticCurveTo(a.x - a.dy * bend, a.y + a.dx * bend, a.x + a.dx * L * 0.5, a.y + a.dy * L * 0.5); ctx.stroke();
  }
  ctx.restore();
};
