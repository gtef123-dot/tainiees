// CORD: rope and nets as 3D lines that draw at their own depth among bodies and boats (so a rope
// passes in front of the chest and behind the near gunwale), lit, and dripping when wet.
import { rng } from "../../core";
import { type V3, type M3, hex, mix, scalec, css, apply, add3, sub3, mul3, lerp, clamp } from "../lib/math";
import type { Overlay } from "../figure/head";
import { drawCtx } from "../figure/mesh";

export type ProjFn = (p: V3) => [number, number, number]; // world -> screen x, y, depth(px)
// a sagging rope between points (catenary-ish), with twist marks
export const rope = (proj: ProjFn, pts: V3[], o: { width: number; color?: string; sag?: number; wet?: number; t?: number; seed?: number; drip?: number }): Overlay => {
  const P: V3[] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 12; k++) { const f = k / 12, a = pts[i], b = pts[i + 1]; P.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f) - (o.sag ?? 0) * Math.sin(Math.PI * f) * Math.hypot(b[0] - a[0], b[2] - a[2]), lerp(a[2], b[2], f)]); }
  P.push(pts[pts.length - 1]);
  const S = P.map(proj), z = S.reduce((s, p) => s + p[2], 0) / S.length, c = hex(o.color ?? "#7d6446");
  return { z, draw: () => {
    const ctx = drawCtx.ctx!; if (!ctx) return;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    const w = o.width;
    ctx.strokeStyle = css(scalec(c, 0.45)); ctx.lineWidth = w; ctx.beginPath(); S.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = css(scalec(c, 1.05 - (o.wet ?? 0) * 0.3)); ctx.lineWidth = w * 0.5; ctx.beginPath(); S.forEach((p, i) => (i ? ctx.lineTo(p[0] - w * 0.12, p[1] - w * 0.18) : ctx.moveTo(p[0] - w * 0.12, p[1] - w * 0.18))); ctx.stroke();
    // the lay of the strands, moving along the rope as it is hauled
    if (w > 4) { ctx.strokeStyle = css(scalec(c, 0.5), 0.6); ctx.lineWidth = Math.max(0.7, w * 0.12); const shift = ((o.t ?? 0) * 1.4) % 1; for (let i = 1; i < S.length; i++) { const a = S[i - 1], b = S[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, n = Math.max(1, Math.floor(l / (w * 0.9))); for (let k = 0; k < n; k++) { const f = (k + shift) / n, x = a[0] + dx * f, y = a[1] + dy * f, nx = -dy / l, ny = dx / l; ctx.beginPath(); ctx.moveTo(x + nx * w * 0.45 - dx / l * w * 0.25, y + ny * w * 0.45 - dy / l * w * 0.25); ctx.lineTo(x - nx * w * 0.45 + dx / l * w * 0.25, y - ny * w * 0.45 + dy / l * w * 0.25); ctx.stroke(); } } }
    if (o.wet) { ctx.strokeStyle = `rgba(250,240,220,${0.28 * o.wet})`; ctx.lineWidth = Math.max(0.6, w * 0.08); ctx.beginPath(); S.forEach((p, i) => (i ? ctx.lineTo(p[0] - w * 0.2, p[1] - w * 0.3) : ctx.moveTo(p[0] - w * 0.2, p[1] - w * 0.3))); ctx.stroke(); }
    if (o.drip) { const r = rng(o.seed ?? 3), t = o.t ?? 0; for (let i = 0; i < S.length; i += 3) if (r() < o.drip) { const ph = (t * (1.2 + r()) + r()) % 1, p = S[i]; ctx.fillStyle = `rgba(230,240,250,${0.8 * (1 - ph)})`; ctx.beginPath(); ctx.ellipse(p[0], p[1] + ph * w * 14, Math.max(0.7, w * 0.16), Math.max(1, w * 0.3), 0, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
  } };
};
// a net: a grid of knots joined by cord; drips fall from its lowest knots when wet
// veil: a thin fill over each cell, for the fine mesh too small to draw cord by cord; weights: lead
// sinkers along the last row (a cast net's rim)
export const net = (proj: ProjFn, grid: V3[][], o: { width: number; color?: string; wet?: number; t?: number; seed?: number; alpha?: number; knots?: boolean; veil?: number; weights?: boolean }): Overlay => {
  // fishing nets are diamond mesh with hand-tied, irregular cord: shift alternate rows half a cell and wobble every knot
  const jr = rng((o.seed ?? 5) * 13), dia = grid.map((row, r) => row.map((p, j) => { const q = row[Math.min(row.length - 1, j + 1)], k = r % 2 ? 0.5 : 0; return [p[0] + (q[0] - p[0]) * k + (jr() - 0.5) * 0.012, p[1] + (q[1] - p[1]) * k + (jr() - 0.5) * 0.012, p[2] + (q[2] - p[2]) * k] as V3; }));
  const S = dia.map((row) => row.map(proj)), z = S.flat().reduce((s, p) => s + p[2], 0) / Math.max(1, S.flat().length), c = hex(o.color ?? "#6e5a40");
  return { z, draw: () => {
    const ctx = drawCtx.ctx!; if (!ctx) return;
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (o.veil) { ctx.fillStyle = css(scalec(c, 0.8), o.veil); ctx.beginPath(); for (let r = 0; r < S.length - 1; r++) for (let j = 0; j < S[r].length - 1; j++) { const a = S[r][j], b = S[r][j + 1], d = S[r + 1][j + 1], e = S[r + 1][j]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(d[0], d[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); } ctx.fill(); }
    // diamonds: each knot ties to the two knots below it (left and right), never to its neighbour in the row
    const lines = (dx: number, dy: number) => { ctx.beginPath(); for (let r = 0; r < S.length - 1; r++) for (let j = 0; j < S[r].length; j++) { const p = S[r][j], sh = r % 2 ? 0 : -1; for (const jj of [j + sh, j + sh + 1]) { const q = S[r + 1][jj]; if (!q) continue; const mx = (p[0] + q[0]) / 2 + (jr() - 0.5) * o.width * 1.2, my = (p[1] + q[1]) / 2 + o.width * 0.8; ctx.moveTo(p[0] + dx, p[1] + dy); ctx.quadraticCurveTo(mx + dx, my + dy, q[0] + dx, q[1] + dy); } } ctx.stroke(); };
    ctx.strokeStyle = css(scalec(c, 0.5)); ctx.lineWidth = o.width * 1.4; lines(0, 0);
    ctx.strokeStyle = css(mix(c, [0.9, 0.82, 0.66], 0.2)); ctx.lineWidth = o.width * 0.55; lines(-o.width * 0.25, -o.width * 0.3);
    if (o.knots !== false && o.width > 1.2) { ctx.fillStyle = css(scalec(c, 0.62)); for (const row of S) for (const p of row) { ctx.beginPath(); ctx.arc(p[0], p[1], o.width * 1.05, 0, Math.PI * 2); ctx.fill(); } }
    if (o.weights) { ctx.fillStyle = "#3a3632"; for (const p of S[S.length - 1]) { ctx.beginPath(); ctx.ellipse(p[0], p[1], o.width * 1.9, o.width * 1.3, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = "rgba(230,225,210,0.5)"; for (const p of S[S.length - 1]) { ctx.beginPath(); ctx.arc(p[0] - o.width * 0.6, p[1] - o.width * 0.5, o.width * 0.6, 0, Math.PI * 2); ctx.fill(); } }
    if (o.wet) { const r = rng(o.seed ?? 5), t = o.t ?? 0; for (const row of S) for (const p of row) { if (r() < 0.3) { ctx.fillStyle = `rgba(236,244,252,${0.65 * o.wet})`; ctx.beginPath(); ctx.arc(p[0] - o.width * 0.4, p[1] + o.width * 0.6, o.width * 0.7, 0, Math.PI * 2); ctx.fill(); } } const last = S[S.length - 1]; for (const p of last) if (r() < 0.6) { const ph = (t * (1.1 + r() * 0.8) + r()) % 1; ctx.fillStyle = `rgba(230,240,250,${0.85 * (1 - ph) * o.wet})`; ctx.beginPath(); ctx.ellipse(p[0], p[1] + ph * o.width * 40, o.width * 0.5, o.width * 0.9, 0, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
  } };
};

// ---- net shapes
// hanging from a hauled line between a and b, falling `drop` metres, swaying
export const hangingNet = (a: V3, b: V3, drop: number, cols: number, rows: number, t: number, sway = 0.04): V3[][] =>
  Array.from({ length: rows + 1 }, (_, r) => Array.from({ length: cols + 1 }, (_, c) => { const f = c / cols, d = r / rows, base = add3(a, mul3(sub3(b, a), f)), belly = Math.sin(Math.PI * f) * 0.08 * d; return [base[0] + Math.sin(t * 1.3 + f * 3 + d * 2) * sway * d, base[1] - drop * d * (1 - 0.15 * Math.sin(Math.PI * f)), base[2] + belly + Math.cos(t * 1.1 + f * 2) * sway * d * 0.6] as V3; }));
// the circular cast net in flight: opening (0..1), height of the rim and the crown
export const castNet = (centre: V3, radius: number, crownUp: number, rings: number, spokes: number, t: number): V3[][] =>
  Array.from({ length: rings + 1 }, (_, r) => Array.from({ length: spokes + 1 }, (_, s) => { const f = r / rings, a = (s / spokes) * Math.PI * 2, rr = radius * f * (1 + 0.04 * Math.sin(a * 5 + t * 3)); return [centre[0] + Math.cos(a) * rr, centre[1] + crownUp * (1 - f * f) - 0.05 * Math.sin(a * 3 + t * 4) * f, centre[2] + Math.sin(a) * rr] as V3; }));
// a sheet of net draped over something (a lap, a gunwale, a pile), from a height function
export const drapedNet = (origin: V3, u: V3, v: V3, cols: number, rows: number, height: (fu: number, fv: number) => number): V3[][] =>
  Array.from({ length: rows + 1 }, (_, r) => Array.from({ length: cols + 1 }, (_, c) => { const fu = c / cols, fv = r / rows, p = add3(origin, add3(mul3(u, fu), mul3(v, fv))); return [p[0], p[1] + height(fu, fv), p[2]] as V3; }));
export { apply, clamp, type M3 };
