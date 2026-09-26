// ARCHITECTURE, drawn clean for the plates: Capernaum's basalt fieldstone houses with flat beam-
// and-reed roofs, Jerusalem's Herodian ashlar (pale limestone, drafted margins), Roman brick
// insulae with timber balconies and tile roofs, columns, the aqueduct's arches, the obelisk.
import { rng } from "../../core";
import { type RGB, clamp, lerp, hex, mix, scalec, css } from "../lib/math";

type C = CanvasRenderingContext2D;
export type Mat = "basalt" | "ashlar" | "plaster" | "brick" | "rubble";
const MAT: Record<Mat, string> = { basalt: "#3d3a37", ashlar: "#d8c49a", plaster: "#d9cdb4", brick: "#a2583a", rubble: "#b9a888" };

// a wall face filled with its stones, lit by `lit` (0 shade .. 1 full sun)
export const wall = (ctx: C, pts: [number, number][], mat: Mat, lit: number, seed: number, o: { color?: string; scale?: number; warm?: RGB } = {}) => {
  const base = hex(o.color ?? MAT[mat]), k = o.scale ?? 1, r = rng(seed), warm = o.warm ?? [1, 0.93, 0.8];
  const face = mix(scalec(base, 0.45), mix(base, warm, 0.15), lit);
  ctx.save(); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = css(face); ctx.fill(); ctx.clip();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (mat === "basalt" || mat === "rubble") {
    const s = 16 * k;
    for (let y = y0; y < y1 + s; y += s * 0.8) for (let x = x0 - s; x < x1 + s; x += s * (0.9 + r() * 0.6)) {
      const w = s * (0.7 + r() * 0.9), h = s * (0.55 + r() * 0.4), q = 0.75 + r() * 0.45;
      ctx.fillStyle = css(scalec(face, q)); ctx.beginPath(); ctx.ellipse(x, y, w * 0.55, h * 0.5, (r() - 0.5) * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = css(mix(face, [1, 0.96, 0.88], 0.18 * lit), 0.7); ctx.beginPath(); ctx.ellipse(x - w * 0.1, y - h * 0.18, w * 0.35, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = css(mix(face, hex("#8a7a64"), 0.5), 0.35); ctx.lineWidth = 1.2 * k;
    for (let y = y0; y < y1; y += s * 0.8) { ctx.beginPath(); ctx.moveTo(x0, y + s * 0.4); for (let x = x0; x < x1; x += 12) ctx.lineTo(x, y + s * 0.4 + Math.sin(x * 0.07 + y) * 2); ctx.stroke(); }
  } else if (mat === "ashlar" || mat === "brick") {
    const bh = (mat === "brick" ? 6 : 26) * k, bw = (mat === "brick" ? 18 : 64) * k;
    let row = 0;
    for (let y = y0; y < y1; y += bh, row++) for (let x = x0 - (row % 2) * bw * 0.5; x < x1; x += bw * (mat === "brick" ? 1 : 0.8 + r() * 0.5)) {
      const q = 0.86 + r() * 0.24, w = mat === "brick" ? bw : bw * (0.8 + r() * 0.5);
      ctx.fillStyle = css(scalec(face, q)); ctx.fillRect(x + 1, y + 1, w - 2, bh - 2);
      if (mat === "ashlar") { ctx.strokeStyle = css(mix(face, [1, 0.97, 0.9], 0.3 * lit), 0.55); ctx.lineWidth = 2 * k; ctx.strokeRect(x + 3 * k, y + 3 * k, w - 6 * k, bh - 6 * k); }
      ctx.fillStyle = css(scalec(face, 0.62), 0.6); ctx.fillRect(x, y + bh - 1.5, w, 1.5);
    }
  } else {
    for (let i = 0; i < 160; i++) { ctx.fillStyle = css(scalec(face, 0.88 + r() * 0.2), 0.35); ctx.beginPath(); ctx.ellipse(lerp(x0, x1, r()), lerp(y0, y1, r()), 10 + r() * 30, 4 + r() * 10, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // grime at the foot of the wall
  const g = ctx.createLinearGradient(0, y1 - (y1 - y0) * 0.35, 0, y1); g.addColorStop(0, "rgba(40,30,20,0)"); g.addColorStop(1, "rgba(40,30,20,0.3)"); ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
};
// a simple house in oblique view: front face, one side face, roof; openings dark
export const house = (ctx: C, x: number, y: number, w: number, h: number, d: number, o: { mat: Mat; roof: "flat" | "tile"; sunSide: -1 | 1; lit?: number; door?: number; windows?: number; seed: number; color?: string; stair?: boolean }) => {
  const r = rng(o.seed), dx = -o.sunSide * d * 0.6, dy = -d * 0.35, lit = o.lit ?? 1;
  const front: [number, number][] = [[x, y], [x + w, y], [x + w, y - h], [x, y - h]];
  const sideX = o.sunSide < 0 ? x + w : x, side: [number, number][] = [[sideX, y], [sideX + dx, y + dy], [sideX + dx, y - h + dy], [sideX, y - h]];
  wall(ctx, side, o.mat, 0.25 * lit, o.seed + 1, { color: o.color });
  wall(ctx, front, o.mat, 0.95 * lit, o.seed + 2, { color: o.color });
  if (o.roof === "flat") {
    const top: [number, number][] = [[x, y - h], [x + w, y - h], [x + w + (o.sunSide < 0 ? dx : 0), y - h + dy], [x + (o.sunSide > 0 ? dx : 0), y - h + dy]];
    ctx.fillStyle = css(hex("#8f7c5e")); ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(hex("#6d5a42")); ctx.fillRect(x - 2, y - h - 4, w + 4, 6);
    for (let i = 0; i < Math.floor(w / 22); i++) { ctx.fillStyle = "#4a3a2a"; ctx.fillRect(x + 8 + i * 22, y - h + 1, 5, 5); }
  } else {
    ctx.fillStyle = css(hex("#a4553a")); ctx.beginPath(); ctx.moveTo(x - 8, y - h); ctx.lineTo(x + w + 8, y - h); ctx.lineTo(x + w * 0.5 + (o.sunSide > 0 ? dx : dx) * 0.5, y - h - h * 0.28); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(90,40,25,0.5)"; ctx.lineWidth = 1.5; for (let i = 0; i < 14; i++) { const t = i / 13; ctx.beginPath(); ctx.moveTo(lerp(x - 8, x + w + 8, t), y - h); ctx.lineTo(x + w * 0.5 + dx * 0.5 + (t - 0.5) * 10, y - h - h * 0.26); ctx.stroke(); }
  }
  if (o.door) { const dw = w * 0.2, dh = h * 0.58 * o.door, dxx = x + w * (0.3 + r() * 0.3); ctx.fillStyle = "#17120e"; ctx.fillRect(dxx, y - dh, dw, dh); ctx.fillStyle = "rgba(255,240,210,0.15)"; ctx.fillRect(dxx - 3, y - dh - 5, dw + 6, 5); }
  for (let i = 0; i < (o.windows ?? 0); i++) { const ww = w * 0.08, wh = h * 0.12, wx = x + w * (0.15 + 0.7 * r()), wy = y - h * (0.6 + r() * 0.25); ctx.fillStyle = "#1a140f"; ctx.fillRect(wx, wy, ww, wh); }
  if (o.stair) { ctx.fillStyle = css(scalec(hex(o.color ?? MAT[o.mat]), 0.6)); for (let i = 0; i < 7; i++) ctx.fillRect(x + w + (o.sunSide < 0 ? dx : 0) - 4 - i * 6, y - (i + 1) * (h / 7), 30, h / 7); }
};
// a column: shaft with a little swell, a capital, lit down one side
export const column = (ctx: C, x: number, yBase: number, h: number, rad: number, o: { color?: string; lightFrom?: -1 | 1; order?: "corinthian" | "doric"; lit?: number } = {}) => {
  const c = hex(o.color ?? "#d9ccad"), L = o.lightFrom ?? -1, lit = o.lit ?? 1;
  const g = ctx.createLinearGradient(x - rad, 0, x + rad, 0); const hi = mix(c, [1, 0.97, 0.9], 0.2 * lit), lo = scalec(c, 0.45 + 0.1 * lit);
  if (L < 0) { g.addColorStop(0, css(scalec(hi, 0.9))); g.addColorStop(0.35, css(hi)); g.addColorStop(1, css(lo)); } else { g.addColorStop(0, css(lo)); g.addColorStop(0.65, css(hi)); g.addColorStop(1, css(scalec(hi, 0.9))); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - rad, yBase); ctx.lineTo(x - rad * 0.86, yBase - h); ctx.lineTo(x + rad * 0.86, yBase - h); ctx.lineTo(x + rad, yBase); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = css(scalec(c, 0.55), 0.35); ctx.lineWidth = Math.max(0.6, rad * 0.06); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * rad * 0.35, yBase); ctx.lineTo(x + k * rad * 0.3, yBase - h); ctx.stroke(); }
  ctx.fillStyle = css(mix(c, hi, 0.5)); ctx.fillRect(x - rad * 1.35, yBase - h - rad * (o.order === "corinthian" ? 1.3 : 0.5), rad * 2.7, rad * (o.order === "corinthian" ? 1.3 : 0.5)); ctx.fillRect(x - rad * 1.3, yBase - rad * 0.4, rad * 2.6, rad * 0.4);
  if (o.order === "corinthian") { ctx.fillStyle = css(scalec(c, 0.7), 0.6); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(x + k * rad * 0.7, yBase - h - rad * 0.55, rad * 0.35, rad * 0.5, 0, 0, Math.PI * 2); ctx.fill(); } }
};
export const colonnade = (ctx: C, x0: number, x1: number, yBase: number, h: number, n: number, rad: number, o: { color?: string; lightFrom?: -1 | 1; roof?: string; order?: "corinthian" | "doric"; lit?: number } = {}) => {
  const c = hex(o.color ?? "#d9ccad");
  ctx.fillStyle = css(scalec(c, 0.3)); ctx.fillRect(x0, yBase - h, x1 - x0, h);                                            // the dark hall behind
  for (let i = 0; i < n; i++) column(ctx, lerp(x0 + rad * 2, x1 - rad * 2, n === 1 ? 0.5 : i / (n - 1)), yBase, h, rad, o);
  ctx.fillStyle = css(mix(c, [1, 0.96, 0.88], 0.15)); ctx.fillRect(x0 - rad, yBase - h - rad * 3.2, x1 - x0 + rad * 2, rad * 1.9);
  ctx.fillStyle = css(scalec(c, 0.6)); ctx.fillRect(x0 - rad, yBase - h - rad * 1.35, x1 - x0 + rad * 2, rad * 0.2);
  if (o.roof) { ctx.fillStyle = o.roof; ctx.beginPath(); ctx.moveTo(x0 - rad * 2, yBase - h - rad * 3.2); ctx.lineTo(x1 + rad * 2, yBase - h - rad * 3.2); ctx.lineTo(x1 - rad * 4, yBase - h - rad * 5.5); ctx.lineTo(x0 + rad * 4, yBase - h - rad * 5.5); ctx.closePath(); ctx.fill(); }
};
// arches on piers (the aqueduct), with the water channel on top
export const arcade = (ctx: C, x0: number, x1: number, yBase: number, h: number, n: number, o: { color?: string; lit?: number; pier?: number; seed?: number } = {}) => {
  const c = hex(o.color ?? "#b89a74"), lit = o.lit ?? 0.9, face = mix(scalec(c, 0.5), c, lit), span = (x1 - x0) / n, pw = span * (o.pier ?? 0.28);
  ctx.fillStyle = css(face); ctx.beginPath(); ctx.moveTo(x0, yBase);
  for (let i = 0; i < n; i++) { const a = x0 + i * span + pw / 2, b = a + span - pw, top = yBase - h * 0.72; ctx.lineTo(a, yBase); ctx.lineTo(a, top); ctx.arc((a + b) / 2, top, (b - a) / 2, Math.PI, 0); ctx.lineTo(b, yBase); }
  ctx.lineTo(x1, yBase); ctx.lineTo(x1, yBase - h); ctx.lineTo(x0, yBase - h); ctx.closePath(); ctx.fill();
  const r = rng(o.seed ?? 3); for (let i = 0; i < 300; i++) { const x = lerp(x0, x1, r()), y = lerp(yBase - h, yBase, r()); ctx.fillStyle = css(scalec(face, 0.8 + r() * 0.35), 0.35); ctx.fillRect(x, y, 6 + r() * 12, 3 + r() * 3); }
  ctx.fillStyle = css(scalec(face, 0.7)); ctx.fillRect(x0, yBase - h - h * 0.08, x1 - x0, h * 0.08);
};
// a Roman insula: brick storeys, dark windows, a timber balcony, a tile roof edge
export const insula = (ctx: C, x: number, y: number, w: number, h: number, floors: number, o: { lit: number; seed: number; color?: string; shops?: boolean }) => {
  wall(ctx, [[x, y], [x + w, y], [x + w, y - h], [x, y - h]], "plaster", o.lit, o.seed, { color: o.color ?? "#c69a74" });
  const r = rng(o.seed), fh = h / floors;
  for (let f = 0; f < floors; f++) { const fy = y - f * fh; for (let i = 0; i < Math.max(2, Math.floor(w / 46)); i++) { const wx = x + 12 + i * 46 + r() * 6, wy = fy - fh * 0.72; if (f === 0 && o.shops) { ctx.fillStyle = "#1c1510"; ctx.fillRect(wx, fy - fh * 0.8, 34, fh * 0.8); } else { ctx.fillStyle = "#1f1712"; ctx.fillRect(wx, wy, 16, fh * 0.4); } } }
  if (floors > 2) { ctx.fillStyle = "#4a3526"; ctx.fillRect(x + w * 0.1, y - fh * 1.95, w * 0.8, 5); for (let i = 0; i < 12; i++) ctx.fillRect(x + w * 0.1 + i * w * 0.8 / 11, y - fh * 1.95, 2, fh * 0.35); }
  ctx.fillStyle = "#9c4f35"; ctx.fillRect(x - 6, y - h - 8, w + 12, 10); ctx.fillStyle = "rgba(60,25,15,0.4)"; ctx.fillRect(x - 6, y - h + 2, w + 12, 4);
};
export const obelisk = (ctx: C, x: number, yBase: number, h: number, w: number, o: { color?: string; lightFrom?: -1 | 1; lit?: number } = {}) => {
  const c = hex(o.color ?? "#b7967a"), L = o.lightFrom ?? 1, lit = o.lit ?? 1;
  const litC = mix(c, [1, 0.9, 0.75], 0.2 * lit), shade = scalec(c, 0.5);
  ctx.fillStyle = css(L > 0 ? shade : litC); ctx.beginPath(); ctx.moveTo(x - w / 2, yBase); ctx.lineTo(x - w * 0.32, yBase - h); ctx.lineTo(x, yBase - h); ctx.lineTo(x, yBase); ctx.fill();
  ctx.fillStyle = css(L > 0 ? litC : shade); ctx.beginPath(); ctx.moveTo(x, yBase); ctx.lineTo(x, yBase - h); ctx.lineTo(x + w * 0.32, yBase - h); ctx.lineTo(x + w / 2, yBase); ctx.fill();
  ctx.fillStyle = css(mix(litC, [1, 0.95, 0.8], 0.2)); ctx.beginPath(); ctx.moveTo(x - w * 0.32, yBase - h); ctx.lineTo(x, yBase - h - w * 0.55); ctx.lineTo(x + w * 0.32, yBase - h); ctx.fill();
  ctx.fillStyle = css(scalec(c, 0.55)); ctx.fillRect(x - w * 0.8, yBase, w * 1.6, w * 0.5);
};
// a flight of steps seen from the front: each tread lit, each riser in shade
export const steps = (ctx: C, x0: number, x1: number, yTop: number, yBot: number, n: number, o: { color?: string; lit?: number } = {}) => {
  const c = hex(o.color ?? "#d4c29c"), lit = o.lit ?? 1, hh = (yBot - yTop) / n;
  for (let i = 0; i < n; i++) { const y = yTop + i * hh, spread = i * 2; ctx.fillStyle = css(mix(scalec(c, 0.8), mix(c, [1, 0.97, 0.9], 0.2), lit)); ctx.fillRect(x0 - spread, y, x1 - x0 + spread * 2, hh * 0.35); ctx.fillStyle = css(scalec(c, 0.55 + 0.15 * lit)); ctx.fillRect(x0 - spread, y + hh * 0.35, x1 - x0 + spread * 2, hh * 0.65); }
};
export { clamp };
