// PROPS. The Galilee boat in 3D (after the 1st-century boat found at Ginosar: ~8.2 m, cedar
// planks on oak frames, one mast), nets as a grid of cord and knots, fire, torches and lamps.
import { fractal, rng } from "../../core";
import { type V3, type RGB, type M3, clamp, lerp, smooth, hex, mix, scalec, css, rotation, apply, add3, mul3 } from "../lib/math";
import { newB, surface, tube, toParts } from "../figure/build";
import type { Parts, Light } from "../figure/head";

export type Place3 = { R?: M3; x: number; y: number; scale: number; yaw: number; pitch?: number; roll?: number; z?: number; light: Light; paint?: number; alpha?: number };

// ---------------------------------------------------------------- the boat
export const boatParts = (o: Place3 & { sail?: "furled" | "none" | "set"; seed?: number; wet?: number; fill?: number }): Parts => {
  const B = newB(), Lh = 4.1, cedar = hex("#7a4e32"), pitch = hex("#2a211c"), inner = hex("#8b6446"), rail = hex("#4e3424");
  const beam = (x: number) => 1.12 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / Lh, x > 0 ? 2.0 : 2.6)), 0.55);
  const sheer = (x: number) => 0.55 + 0.32 * Math.pow(Math.abs(x) / Lh, 3), keel = (x: number) => -0.58 + 0.25 * Math.pow(Math.abs(x) / Lh, 2);
  const NX = 26, NP = 18, rowsOut: V3[][] = [];
  for (let i = 0; i <= NX; i++) {
    const x = lerp(-Lh, Lh, i / NX), b = Math.max(0.02, beam(x)), s = sheer(x), k = keel(x);
    rowsOut.push(Array.from({ length: NP + 1 }, (_, j) => { const f = j / NP, ph = f * Math.PI, depth = Math.pow(Math.sin(ph), 0.55); return [x, lerp(s, k, depth), b * Math.cos(ph) * (0.35 + 0.65 * Math.pow(Math.sin(ph) * 0.5 + 0.5, 0.2))] as V3; }));
  }
  const r = rng(o.seed ?? 3);
  const plankCol = (base: RGB, below: boolean) => (_r: number, k: number, p: V3): RGB => {
    const band = Math.floor((1 - Math.abs(k * 2 - 1)) * 7), seam = Math.abs(((1 - Math.abs(k * 2 - 1)) * 7) % 1 - 0.5) > 0.46 ? 0.72 : 1;
    let c = scalec(base, (0.9 + (band % 2) * 0.08) * seam * (0.92 + fractal(71, p[0] * 3, p[1] * 3 + p[2] * 3, 1, 1, 2) * 0.16));
    if (below && p[1] < 0.05) c = mix(c, pitch, smooth(0.05, -0.1, p[1]));
    if (o.wet && p[1] < 0.2) c = scalec(c, 0.85);
    return c;
  };
  surface(B, rowsOut, false, plankCol(cedar, true), { noCull: true, flowVertical: false });
  // the inside: a slightly smaller shell in the lighter, worn wood (the insides of the planks)
  const rowsIn = rowsOut.map((row) => row.map((p) => [p[0], p[1] + 0.02, p[2] * 0.93] as V3));
  const baseIn = B.V.length; surface(B, rowsIn, false, plankCol(inner, false), { noCull: true, flowVertical: false });
  for (let i = baseIn; i < B.V.length; i++) B.N[i] = mul3(B.N[i], -1);
  // gunwale rails, thwarts, stem and stern posts, mast and furled sail
  for (const side of [-1, 1]) tube(B, Array.from({ length: NX + 1 }, (_, i) => { const x = lerp(-Lh * 0.99, Lh * 0.99, i / NX); return [x, sheer(x) + 0.02, side * beam(x) * 1.01] as V3; }), Array.from({ length: NX + 1 }, () => 0.045), 6, () => rail);
  for (const tx of [-1.6, 0.35, 2.1]) { const b = beam(tx) * 0.9, y = sheer(tx) - 0.28; surface(B, [[[tx - 0.13, y, -b], [tx - 0.13, y, b]], [[tx + 0.13, y, -b], [tx + 0.13, y, b]]], false, () => scalec(inner, 0.95), { noCull: true, flowVertical: false }); }
  tube(B, [[Lh - 0.05, sheer(Lh) - 0.2, 0], [Lh + 0.12, sheer(Lh) + 0.28, 0]], [0.07, 0.06], 6, () => rail);
  tube(B, [[-Lh + 0.05, sheer(-Lh) - 0.2, 0], [-Lh - 0.1, sheer(-Lh) + 0.2, 0]], [0.07, 0.06], 6, () => rail);
  if (o.sail !== "none") {
    tube(B, [[0.6, -0.4, 0], [0.6, 5.2, 0]], [0.075, 0.05], 8, () => hex("#5e4a36"));
    const yard: V3[] = Array.from({ length: 9 }, (_, i) => [0.6 + 0.1, 4.95 - Math.abs(i - 4) * 0.02, lerp(-2.6, 2.6, i / 8)] as V3);
    if (o.sail === "set") {
      // the square sail let fall from the yard and filling: bellied forward (+x) by `fill`
      const fl = o.fill ?? 1, rows: V3[][] = [];
      for (let i = 0; i <= 8; i++) { const v = i / 8; rows.push(Array.from({ length: 9 }, (_, j) => { const u = j / 8; return [0.72 + fl * 0.9 * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.1)) + 0.05 * Math.sin(u * 9), 4.9 - v * 3.8, lerp(-2.5, 2.5, u) * (1 - 0.06 * v)] as V3; })); }
      const sc = (_r: number, k: number) => mix(hex("#f0e6cc"), hex("#cbbc9a"), 0.3 + 0.3 * Math.sin(k * 20)); surface(B, rows, false, sc, { flowVertical: true, noCull: true }); /* one two-sided sheet: a front and a flipped copy on the same vertices z-fought into jagged holes */
      tube(B, yard, yard.map(() => 0.07), 7, () => hex("#6a5438"));
    } else tube(B, yard, yard.map((_, i) => 0.09 + 0.07 * Math.sin((i / 8) * Math.PI) + 0.02 * r()), 9, (t) => mix(hex("#b9a27c"), hex("#8f7a58"), Math.abs(t - 0.5)));
  }
  const R = o.R ?? rotation(o.yaw, o.pitch ?? 0, o.roll ?? 0);
  return { ...toParts(B, { x: o.x, y: o.y, scale: o.scale, R, z: o.z, light: o.light, alpha: o.alpha, paint: o.paint ?? 1, seed: o.seed ?? 3 }), overlays: [] };
};
// the height of the boat's gunwale at a point along its length (for placing hands, nets, people)
export const boatGunwale = (x: number) => 0.55 + 0.32 * Math.pow(Math.abs(x) / 4.1, 3) + 0.04;
export const boatBeam = (x: number) => 1.12 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / 4.1, x > 0 ? 2.0 : 2.6)), 0.55);

// ---------------------------------------------------------------- nets
// a net is a grid of knots; it is drawn as cord, lit, with water beading on it if wet
export type NetGrid = V3[][];
export const drawNet = (ctx: CanvasRenderingContext2D, grid: NetGrid, o: { x: number; y: number; scale: number; R: M3; color?: string; lw?: number; alpha?: number; wet?: number; light?: Light }) => {
  const c = hex(o.color ?? "#7a6a52"), P = (p: V3) => { const w = apply(o.R, p); return [o.x + w[0] * o.scale, o.y - w[1] * o.scale] as [number, number]; };
  const S = grid.map((row) => row.map(P)), lw = o.lw ?? Math.max(0.5, o.scale * 0.0035), lit = o.light ? clamp(0.55 + 0.45 * o.light.keyAmt * 0.6) : 1;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = css(scalec(c, 0.55 * lit)); ctx.lineWidth = lw * 1.5;
  const lines = () => { ctx.beginPath(); for (const row of S) { row.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); } for (let j = 0; j < S[0].length; j++) S.forEach((row, i) => (i ? ctx.lineTo(row[j][0], row[j][1]) : ctx.moveTo(row[j][0], row[j][1]))); ctx.stroke(); };
  lines(); ctx.strokeStyle = css(scalec(c, 1.05 * lit)); ctx.lineWidth = lw * 0.7; ctx.translate(-lw * 0.3, -lw * 0.3); lines(); ctx.translate(lw * 0.3, lw * 0.3);
  if (o.scale > 150) { ctx.fillStyle = css(scalec(c, 0.7 * lit)); for (const row of S) for (const p of row) { ctx.beginPath(); ctx.arc(p[0], p[1], lw * 1.1, 0, Math.PI * 2); ctx.fill(); } }
  if (o.wet) { const r = rng(5); ctx.fillStyle = `rgba(235,242,250,${0.7 * o.wet})`; for (const row of S) for (const p of row) if (r() < 0.25) { ctx.beginPath(); ctx.arc(p[0] + lw, p[1] + lw * 1.5, lw * 0.9, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
};
// a heap of net: a lumpy mound with the mesh drawn over it
export const netPileParts = (o: Place3 & { w: number; d: number; h: number; seed: number; color?: string }): Parts => {
  const B = newB(), c = hex(o.color ?? "#6f5f48"), rows: V3[][] = [];
  for (let i = 0; i <= 10; i++) { const f = i / 10; rows.push(Array.from({ length: 20 }, (_, k) => { const a = (k / 20) * Math.PI * 2, n = fractal(o.seed, Math.cos(a) * 2 + 3, f * 3, 1, 1, 3), rr = Math.sin(f * Math.PI * 0.5) * (0.75 + 0.5 * n); return [Math.cos(a) * o.w * 0.5 * rr, o.h * Math.cos(f * Math.PI * 0.5) * (0.7 + 0.5 * n), Math.sin(a) * o.d * 0.5 * rr] as V3; })); }
  surface(B, rows.reverse(), true, (_r, _k, p) => scalec(c, 0.75 + fractal(o.seed + 4, p[0] * 9, p[2] * 9, 1, 1, 2) * 0.5));
  return { ...toParts(B, { x: o.x, y: o.y, scale: o.scale, R: o.R ?? rotation(o.yaw, o.pitch ?? 0, o.roll ?? 0), z: o.z, light: o.light, paint: o.paint ?? 1, seed: o.seed }), overlays: [] };
};

// a boulder (basalt by the lake, limestone on the hills): a lumpy dome with a flat base, w x d
// wide and h high, its facets from fractal noise so no two are alike
export const boulderParts = (o: Place3 & { w: number; d: number; h: number; seed: number; color?: string; moss?: number }): Parts => {
  const B = newB(), c = hex(o.color ?? "#4f4a45"), rows: V3[][] = [], K = 22;
  for (let i = 0; i <= 9; i++) { const f = i / 9, ph = f * Math.PI * 0.5; rows.push(Array.from({ length: K }, (_, k) => { const a = (k / K) * Math.PI * 2, n = fractal(o.seed, Math.cos(a) * 1.6 + 5, f * 2.2 + Math.sin(a), 1, 1, 3), rr = Math.cos(ph) * (0.8 + 0.4 * n) + 0.02; return [Math.cos(a) * rr * o.w / 2, Math.sin(ph) * o.h * (0.85 + 0.3 * n) - 0.02, Math.sin(a) * rr * o.d / 2] as V3; })); }
  rows.push(Array.from({ length: K }, () => [0, o.h * 1.0, 0] as V3));
  surface(B, rows.reverse(), true, (_r, _k, p) => { const v = 0.78 + fractal(o.seed + 9, p[0] * 7, p[1] * 7 + p[2] * 7, 1, 1, 3) * 0.45, top = clamp(p[1] / o.h); return mix(scalec(c, v), [0.42, 0.44, 0.3], (o.moss ?? 0) * smooth(0.6, 1, top) * 0.5); });
  return { ...toParts(B, { x: o.x, y: o.y, scale: o.scale, R: o.R ?? rotation(o.yaw, o.pitch ?? 0, o.roll ?? 0), z: o.z, light: o.light, paint: o.paint ?? 1, seed: o.seed }), overlays: [] };
};

// ---------------------------------------------------------------- fire and light
// a flame: tongues that lick upward, pure in t; `size` is the flame height in px
export const flame = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number, seed: number, o: { core?: string; edge?: string; n?: number; alpha?: number } = {}) => {
  // soft tongues: each a teardrop filled from a hot core low in the flame out to a transparent red edge,
  // with a smaller white-yellow core inside; they waver and lick up out of step
  const n = o.n ?? 5, core = hex(o.core ?? "#fff0b8"), edge = hex(o.edge ?? "#e0661f"), a = o.alpha ?? 1;
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const tongue = (bx: number, h: number, w: number, sway: number, k: number, fill: (cx: number, cy: number) => CanvasGradient | string) => {
    ctx.fillStyle = fill(bx, y - h * 0.25); ctx.beginPath(); ctx.moveTo(bx, y + w * 0.25 * k); ctx.bezierCurveTo(bx - w * 1.1 * k, y + w * 0.1, bx - w * 0.9 * k, y - h * 0.45 * k, bx + sway * k, y - h * k);
    ctx.bezierCurveTo(bx + w * 0.8 * k + sway * 0.3, y - h * 0.5 * k, bx + w * 1.1 * k, y + w * 0.1, bx, y + w * 0.25 * k); ctx.closePath(); ctx.fill();
  };
  for (let i = 0; i < n; i++) {
    const sway = (fractal(seed + i, t * 2.2 + i, 0.5, 1, 1, 2) - 0.5) * size * 0.45, h = size * (0.5 + 0.5 * fractal(seed + 30 + i, t * 3.4, i, 1, 1, 2)) * (i === 0 ? 1 : 0.7), w = size * (0.2 - i * 0.015), bx = x + (i - (n - 1) / 2) * w * 0.55 + Math.sin(t * 5 + i) * w * 0.1;
    tongue(bx, h, w, sway, 1, (cx, cy) => { const g = ctx.createRadialGradient(cx, cy + h * 0.15, 0, cx, cy, h * 0.85); g.addColorStop(0, css(mix(core, edge, 0.2), 0.85 * a)); g.addColorStop(0.45, css(mix(core, edge, 0.6), 0.55 * a)); g.addColorStop(0.8, css(edge, 0.2 * a)); g.addColorStop(1, css(edge, 0)); return g; });
    tongue(bx, h * 0.8, w * 0.8, sway * 0.7, 0.55, (cx, cy) => { const g = ctx.createRadialGradient(cx, cy + h * 0.1, 0, cx, cy, h * 0.45); g.addColorStop(0, css(core, 0.9 * a)); g.addColorStop(1, css(core, 0)); return g; });
  }
  ctx.restore();
};
// a brazier of charcoal: an iron bowl on legs, the coals glowing, low flames, sparks
export const brazier = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, seed: number, o: { flames?: number; glowColor?: RGB } = {}) => {
  ctx.save();
  ctx.strokeStyle = "#1c1612"; ctx.lineWidth = s * 0.05; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + k * s * 0.35, y); ctx.lineTo(x + k * s * 0.25, y - s * 0.55); ctx.stroke(); }
  ctx.fillStyle = "#2a211b"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.6, s * 0.55, s * 0.16, 0, 0, Math.PI); ctx.lineTo(x - s * 0.55, y - s * 0.6); ctx.fill();
  const r = rng(seed);
  for (let i = 0; i < 40; i++) { const cx = x + (r() - 0.5) * s * 0.95, cy = y - s * 0.62 - r() * s * 0.08, cr = s * (0.035 + r() * 0.045), heat = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + r() * 6); ctx.fillStyle = css(mix([0.35, 0.08, 0.03], [1, 0.62, 0.2], heat * (0.4 + r() * 0.6))); ctx.beginPath(); ctx.ellipse(cx, cy, cr * 1.2, cr * 0.8, r() * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  flame(ctx, x, y - s * 0.65, s * 0.7 * (o.flames ?? 1), t, seed, { n: 5 });
};
export const torch = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, seed: number, angle = 0) => {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.strokeStyle = "#3b2a1c"; ctx.lineWidth = s * 0.07; ctx.beginPath(); ctx.moveTo(0, s * 0.9); ctx.lineTo(0, 0); ctx.stroke(); ctx.fillStyle = "#2a1c14"; ctx.fillRect(-s * 0.06, -s * 0.12, s * 0.12, s * 0.16); ctx.restore();
  flame(ctx, x + Math.sin(angle) * s * 0.1, y - s * 0.1, s * 0.9, t, seed, { n: 6 });
};
// a terracotta oil lamp (the Herodian and Roman kind): a closed body, a nozzle, a small flame
export const oilLamp = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, seed: number, flick = 1) => {
  ctx.save(); ctx.fillStyle = "#8a5a3a"; ctx.beginPath(); ctx.ellipse(x, y, s * 0.5, s * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#a36c46"; ctx.beginPath(); ctx.ellipse(x - s * 0.05, y - s * 0.06, s * 0.36, s * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7a4e32"; ctx.beginPath(); ctx.moveTo(x + s * 0.3, y - s * 0.08); ctx.lineTo(x + s * 0.72, y - s * 0.05); ctx.lineTo(x + s * 0.72, y + s * 0.06); ctx.lineTo(x + s * 0.3, y + s * 0.1); ctx.fill(); ctx.restore();
  flame(ctx, x + s * 0.7, y - s * 0.05, s * 0.55 * flick, t, seed, { n: 2 });
};
export { lerp, add3 };
// a fire of coals on the beach (John 21:9): a ring of stones, a bed of glowing charcoal, low flames,
// two fish and a flat loaf on a grill of green sticks. w: the width of the ring in px.
export const coalBed = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number, seed: number, o: { fish?: boolean; flames?: number } = {}) => {
  const r = rng(seed);
  ctx.save();
  // stones round the fire (the far ones first)
  for (let i = 0; i < 11; i++) { const a = Math.PI + (i / 10) * Math.PI, sx = x + Math.cos(a) * w * 0.5, sy = y + Math.sin(a) * w * 0.14, sr = w * (0.07 + r() * 0.04); ctx.fillStyle = css(scalec([0.32, 0.3, 0.28], 0.8 + r() * 0.4)); ctx.beginPath(); ctx.ellipse(sx, sy, sr, sr * 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
  // the coals: black, then red, then orange-white where the air reaches them, breathing
  ctx.fillStyle = "#1a1210"; ctx.beginPath(); ctx.ellipse(x, y, w * 0.44, w * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 70; i++) { const cx = x + (r() - 0.5) * w * 0.8, cy = y + (r() - 0.5) * w * 0.18, cr = w * (0.018 + r() * 0.03), heat = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2.5) + r() * 6); ctx.fillStyle = css(mix([0.3, 0.06, 0.03], [1, 0.6, 0.22], heat * (0.3 + r() * 0.7))); ctx.beginPath(); ctx.ellipse(cx, cy, cr * 1.3, cr * 0.7, r() * 3, 0, Math.PI * 2); ctx.fill(); }
  for (let i = 0; i < 11; i++) { const a = (i / 10) * Math.PI, sx = x + Math.cos(a) * w * 0.5, sy = y + Math.sin(a) * w * 0.14, sr = w * (0.075 + r() * 0.04); ctx.fillStyle = css(scalec([0.36, 0.33, 0.3], 0.8 + r() * 0.4)); ctx.beginPath(); ctx.ellipse(sx, sy, sr, sr * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(255,140,60,0.25)"; ctx.beginPath(); ctx.ellipse(sx, sy - sr * 0.4, sr * 0.8, sr * 0.3, 0, Math.PI, 0); ctx.fill(); }
  ctx.restore();
  flame(ctx, x, y - w * 0.02, w * 0.3 * (o.flames ?? 1), t, seed + 3, { n: 4, alpha: 0.85 });
  if (o.fish) {
    ctx.save(); ctx.strokeStyle = "#5a4a30"; ctx.lineWidth = Math.max(1, w * 0.012); for (const k of [-0.12, 0.12]) { ctx.beginPath(); ctx.moveTo(x - w * 0.36, y - w * 0.12 + k * w * 0.2); ctx.lineTo(x + w * 0.36, y - w * 0.1 + k * w * 0.2); ctx.stroke(); }
    for (const [fx, fy] of [[-0.16, -0.14], [0.08, -0.12]]) { const cx = x + fx * w, cy = y + fy * w; ctx.fillStyle = "#8a6a48"; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.11, w * 0.028, 0.05, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + w * 0.1, cy); ctx.lineTo(cx + w * 0.15, cy - w * 0.025); ctx.lineTo(cx + w * 0.15, cy + w * 0.025); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,210,150,0.4)"; ctx.beginPath(); ctx.ellipse(cx - w * 0.01, cy - w * 0.012, w * 0.07, w * 0.008, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#b08a56"; ctx.beginPath(); ctx.ellipse(x + w * 0.3, y - w * 0.13, w * 0.08, w * 0.035, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
};
