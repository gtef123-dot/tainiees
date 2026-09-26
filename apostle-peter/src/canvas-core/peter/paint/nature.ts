// NATURE, drawn clean for the plates to repaint: skies, clouds, hills, the lake, trees, fields,
// rocks, shores and roads. Every function is pure in its arguments and a seed.
import { fractal, rng } from "../../core";
import { type RGB, clamp, lerp, smooth, hex, mix, scalec, css } from "../lib/math";

type C = CanvasRenderingContext2D;
export const vgrad = (ctx: C, x: number, y0: number, w: number, y1: number, stops: [number, string | RGB][]) => { const g = ctx.createLinearGradient(0, y0, 0, y1); for (const [t, c] of stops) g.addColorStop(t, typeof c === "string" ? c : css(c)); ctx.fillStyle = g; ctx.fillRect(x, y0, w, y1 - y0); };
const col = (c: string | RGB): RGB => (typeof c === "string" ? hex(c) : c);

// ---------------------------------------------------------------- sky
export const sky = (ctx: C, w: number, h: number, stops: [number, string][], sun?: { x: number; y: number; r: number; color: string; glow: number }) => {
  vgrad(ctx, 0, 0, w, h, stops);
  if (sun) {
    const g = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.r * 9); const c = hex(sun.color);
    g.addColorStop(0, css(c, sun.glow)); g.addColorStop(0.08, css(c, sun.glow * 0.8)); g.addColorStop(0.3, css(c, sun.glow * 0.3)); g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = css(mix(c, [1, 1, 1], 0.6), Math.min(1, sun.glow * 1.2)); ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2); ctx.fill();
  }
};
// clouds: clusters of soft lobes, lit on the sun side, shaded beneath
export const clouds = (ctx: C, seed: number, n: number, box: [number, number, number, number], o: { lit: string; shade: string; alpha: number; flat?: number; size?: number; sunX?: number }) => {
  const r = rng(seed), [x0, y0, x1, y1] = box, lit = hex(o.lit), sh = hex(o.shade);
  for (let i = 0; i < n; i++) {
    const cx = lerp(x0, x1, r()), cy = lerp(y0, y1, r()), size = (o.size ?? 90) * (0.5 + r()), lobes = 5 + Math.floor(r() * 7), flat = o.flat ?? 0.45;
    for (let k = 0; k < lobes; k++) {
      const lx = cx + (r() - 0.5) * size * 2.4, ly = cy + (r() - 0.5) * size * 0.5 * flat, lr = size * (0.35 + r() * 0.5);
      const toSun = o.sunX === undefined ? -0.4 : clamp((o.sunX - lx) / 800, -1, 1);
      const g = ctx.createRadialGradient(lx + toSun * lr * 0.3, ly - lr * 0.3, lr * 0.1, lx, ly, lr);
      g.addColorStop(0, css(lit, o.alpha)); g.addColorStop(0.6, css(mix(lit, sh, 0.5), o.alpha * 0.8)); g.addColorStop(1, css(sh, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(lx, ly, lr, lr * flat, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
};
// long streaks of cirrus / haze bands
export const streaks = (ctx: C, seed: number, n: number, box: [number, number, number, number], color: string, alpha: number) => {
  const r = rng(seed), [x0, y0, x1, y1] = box, c = hex(color);
  for (let i = 0; i < n; i++) { const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), l = 150 + r() * 500, t = 3 + r() * 12; const g = ctx.createLinearGradient(x - l / 2, y, x + l / 2, y); g.addColorStop(0, css(c, 0)); g.addColorStop(0.5, css(c, alpha * (0.5 + r() * 0.5))); g.addColorStop(1, css(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, l / 2, t, (r() - 0.5) * 0.05, 0, Math.PI * 2); ctx.fill(); }
};

// ---------------------------------------------------------------- land
// a ridge line from noise; returns its profile so things can stand on it
export const ridgeProfile = (seed: number, w: number, base: number, amp: number, freq: number, shape: (x: number) => number = () => 0) =>
  (x: number) => base - amp * (fractal(seed, x * freq, 0.5, 1, 1, 4) - 0.35) * 1.6 - shape(x);
export const ridge = (ctx: C, w: number, h: number, prof: (x: number) => number, o: { top: string; bottom: string; rim?: string; rimW?: number; texture?: number; seed?: number; terraces?: number; shrubs?: number; shrubColor?: string; lightFrom?: number }) => {
  ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 4) ctx.lineTo(x, prof(x)); ctx.lineTo(w, h); ctx.closePath();
  let top = h; for (let x = 0; x <= w; x += 16) top = Math.min(top, prof(x));
  const g = ctx.createLinearGradient(0, top, 0, h); g.addColorStop(0, o.top); g.addColorStop(1, o.bottom); ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  const r = rng(o.seed ?? 5);
  // light and shade across the slopes: a ridge lit from one side shows its gullies
  if (o.texture) { const tc = hex(o.bottom); for (let i = 0; i < 260 * o.texture; i++) { const x = r() * w, y0 = prof(x), y = y0 + r() * (h - y0) * 0.7; const slope = prof(x + 12) - prof(x - 12), lit = (o.lightFrom ?? -1) * slope > 0 ? 1.12 : 0.85; ctx.fillStyle = css(scalec(tc, lit * (0.8 + r() * 0.35)), 0.25); ctx.beginPath(); ctx.ellipse(x, y, 20 + r() * 60, 6 + r() * 16, (r() - 0.5) * 0.4, 0, Math.PI * 2); ctx.fill(); } }
  if (o.terraces) { ctx.strokeStyle = css(scalec(hex(o.bottom), 0.75), 0.35); ctx.lineWidth = 1.5; for (let i = 0; i < o.terraces; i++) { const off = 20 + i * 18 + r() * 8; ctx.beginPath(); for (let x = 0; x <= w; x += 10) { const y = prof(x) + off + Math.sin(x * 0.01 + i) * 4; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); } }
  if (o.shrubs) { const sc = hex(o.shrubColor ?? "#5a6040"); for (let i = 0; i < o.shrubs; i++) { const x = r() * w, y = prof(x) + 6 + r() * (h - prof(x)) * 0.6, s = 2 + r() * 5; ctx.fillStyle = css(scalec(sc, 0.8 + r() * 0.4), 0.8); ctx.beginPath(); ctx.ellipse(x, y, s * 1.4, s, 0, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
  if (o.rim) { ctx.strokeStyle = o.rim; ctx.lineWidth = o.rimW ?? 2; ctx.beginPath(); for (let x = 0; x <= w; x += 4) (x ? ctx.lineTo(x, prof(x)) : ctx.moveTo(x, prof(x))); ctx.stroke(); }
};

// ---------------------------------------------------------------- water
export const lake = (ctx: C, w: number, y0: number, y1: number, o: { far: string; near: string; sky: string; seed: number; wavelets?: number; glitter?: { x: number; w: number; color: string; a: number } }) => {
  vgrad(ctx, 0, y0, w, y1, [[0, o.far], [0.25, mix(hex(o.far), hex(o.near), 0.35)], [1, o.near]]);
  const r = rng(o.seed), sk = hex(o.sky), nr = hex(o.near);
  const n = o.wavelets ?? 900;
  for (let i = 0; i < n; i++) {
    const t = r() ** 1.6, y = lerp(y0 + 2, y1, t), x = r() * w, l = lerp(6, 90, t) * (0.5 + r()), th = lerp(0.6, 5, t);
    const c = r() < 0.5 ? mix(sk, [1, 1, 1], 0.15) : scalec(nr, 0.72);
    ctx.fillStyle = css(c, lerp(0.25, 0.45, t)); ctx.beginPath(); ctx.ellipse(x, y, l, th, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (o.glitter) { const g = o.glitter, gc = hex(g.color); for (let i = 0; i < 500; i++) { const t = r() ** 1.3, y = lerp(y0 + 1, y1, t), x = g.x + (r() - 0.5) * g.w * lerp(0.4, 1.6, t), l = lerp(3, 26, t) * (0.4 + r()); ctx.fillStyle = css(gc, g.a * (0.4 + r() * 0.6) * (1 - t * 0.5)); ctx.fillRect(x - l / 2, y, l, lerp(0.8, 2.5, t)); } }
};
// a reflection: the band above mirrored into the water, darkened and broken
export const reflect = (ctx: C, src: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, waterY: number, o: { alpha: number; tint: string; seed: number }) => {
  const r = rng(o.seed);
  for (let y = 0; y < sh; y += 3) { const off = (r() - 0.5) * lerp(2, 18, y / sh); ctx.globalAlpha = o.alpha * (1 - y / sh) ** 0.7; ctx.drawImage(src, sx, sy + sh - y - 3, sw, 3, sx + off, waterY + y, sw, 3); }
  ctx.globalAlpha = 1; ctx.fillStyle = css(hex(o.tint), 0.35); ctx.globalCompositeOperation = "multiply"; ctx.fillRect(sx, waterY, sw, sh); ctx.globalCompositeOperation = "source-over";
};

// ---------------------------------------------------------------- vegetation
// olive: a twisted, split trunk and silver-green clumps lit from one side
export const olive = (ctx: C, x: number, y: number, s: number, seed: number, o: { leaf?: string; trunk?: string; light?: number } = {}) => {
  const r = rng(seed), leaf = hex(o.leaf ?? "#7d8a5e"), trunk = hex(o.trunk ?? "#5d554a"), L = o.light ?? -1;
  const lean = (r() - 0.5) * 0.5;
  for (let k = 0; k < 2; k++) { const dx = (k ? 1 : -1) * s * 0.05; ctx.fillStyle = css(scalec(trunk, k ? 0.8 : 1)); ctx.beginPath(); ctx.moveTo(x + dx - s * 0.07, y); ctx.bezierCurveTo(x + dx - s * 0.1, y - s * 0.25, x + dx + lean * s * 0.4 - s * 0.05, y - s * 0.35, x + dx + lean * s * 0.6, y - s * 0.55); ctx.lineTo(x + dx + lean * s * 0.6 + s * 0.05, y - s * 0.53); ctx.bezierCurveTo(x + dx + lean * s * 0.3 + s * 0.05, y - s * 0.3, x + dx + s * 0.08, y - s * 0.2, x + dx + s * 0.09, y); ctx.closePath(); ctx.fill(); }
  const cx = x + lean * s * 0.55, cy = y - s * 0.7;
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = r() ** 0.7, lx = cx + Math.cos(a) * d * s * 0.55, ly = cy + Math.sin(a) * d * s * 0.28, lr = s * (0.1 + r() * 0.12);
    const lit = clamp(0.5 + (L < 0 ? -1 : 1) * (lx - cx) / (s * 0.6) * 0.5 + (cy - ly) / (s * 0.4) * 0.3);
    ctx.fillStyle = css(mix(scalec(leaf, 0.55), mix(leaf, [0.85, 0.88, 0.78], 0.3), lit), 0.92); ctx.beginPath(); ctx.ellipse(lx, ly, lr * 1.3, lr * 0.85, (r() - 0.5) * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = r() ** 0.6, lx = cx + Math.cos(a) * d * s * 0.62, ly = cy + Math.sin(a) * d * s * 0.32; ctx.fillStyle = css(mix(leaf, [0.9, 0.92, 0.85], r() * 0.45), 0.7); ctx.beginPath(); ctx.ellipse(lx, ly, s * 0.022, s * 0.009, r() * 3, 0, Math.PI * 2); ctx.fill(); }
};
// rounded crown on a short trunk (Tabor oak, plane, carob) or a tall flat umbrella pine
export const tree = (ctx: C, x: number, y: number, s: number, seed: number, o: { kind: "oak" | "pine" | "cypress" | "palm"; leaf?: string; trunk?: string; light?: number }) => {
  const r = rng(seed), L = o.light ?? -1, trunk = hex(o.trunk ?? "#4a3f35");
  if (o.kind === "cypress") { const leaf = hex(o.leaf ?? "#2f3a2a"); ctx.fillStyle = css(leaf); ctx.beginPath(); ctx.moveTo(x, y - s); ctx.bezierCurveTo(x + s * 0.13, y - s * 0.7, x + s * 0.12, y - s * 0.15, x + s * 0.03, y); ctx.lineTo(x - s * 0.03, y); ctx.bezierCurveTo(x - s * 0.12, y - s * 0.15, x - s * 0.13, y - s * 0.7, x, y - s); ctx.fill(); for (let i = 0; i < 40; i++) { const t = r(), yy = y - s * t, ww = s * 0.1 * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.1)); ctx.fillStyle = css(scalec(leaf, 0.8 + r() * 0.5), 0.6); ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * ww * 1.6, yy, s * 0.03, s * 0.015, 0, 0, Math.PI * 2); ctx.fill(); } return; }
  if (o.kind === "palm") { const leaf = hex(o.leaf ?? "#5e6d3e"); ctx.strokeStyle = css(trunk); ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.5, x + s * 0.05, y - s); ctx.stroke(); for (let i = 0; i < 11; i++) { const a = -Math.PI / 2 + (i / 10 - 0.5) * 3.4, l = s * (0.35 + r() * 0.12), ex = x + s * 0.05 + Math.cos(a) * l, ey = y - s + Math.sin(a) * l * 0.6 + l * 0.25; ctx.strokeStyle = css(scalec(leaf, 0.8 + r() * 0.4)); ctx.lineWidth = s * 0.018; ctx.beginPath(); ctx.moveTo(x + s * 0.05, y - s); ctx.quadraticCurveTo((x + ex) / 2, y - s - l * 0.25, ex, ey); ctx.stroke(); } return; }
  const leaf = hex(o.leaf ?? (o.kind === "pine" ? "#3f4a32" : "#46553a")), pine = o.kind === "pine";
  const top = pine ? y - s : y - s * 0.55, cw = pine ? s * 0.55 : s * 0.42, ch = pine ? s * 0.16 : s * 0.38;
  ctx.fillStyle = css(trunk); ctx.beginPath(); ctx.moveTo(x - s * 0.03, y); ctx.quadraticCurveTo(x - s * 0.02 + (pine ? s * 0.08 : 0), (y + top) / 2, x - s * 0.015 + (pine ? s * 0.1 : 0), top + ch * 0.3); ctx.lineTo(x + s * 0.025 + (pine ? s * 0.1 : 0), top + ch * 0.3); ctx.quadraticCurveTo(x + s * 0.03 + (pine ? s * 0.08 : 0), (y + top) / 2, x + s * 0.04, y); ctx.fill();
  const cx = x + (pine ? s * 0.1 : 0), cy = top;
  for (let i = 0; i < (pine ? 22 : 18); i++) {
    const a = r() * Math.PI * 2, d = r() ** 0.6, lx = cx + Math.cos(a) * d * cw, ly = cy + Math.sin(a) * d * ch * (pine ? 0.6 : 1) - (pine ? 0 : ch * 0.1), lr = s * (pine ? 0.1 : 0.11) * (0.6 + r() * 0.7);
    const lit = clamp(0.45 + (L < 0 ? -1 : 1) * (lx - cx) / cw * 0.45 + (cy - ly) / ch * 0.35);
    ctx.fillStyle = css(mix(scalec(leaf, 0.5), mix(leaf, [0.75, 0.78, 0.55], 0.25), lit)); ctx.beginPath(); ctx.ellipse(lx, ly, lr * 1.2, lr * (pine ? 0.55 : 0.9), 0, 0, Math.PI * 2); ctx.fill();
  }
};
// a field of grain or grass: a base, then stalks and heads that get bigger toward the viewer
export const field = (ctx: C, w: number, y0: number, y1: number, seed: number, o: { base: string; stalk: string; head: string; density?: number; wind?: number; t?: number }) => {
  vgrad(ctx, 0, y0, w, y1, [[0, mix(hex(o.base), [0.9, 0.85, 0.7], 0.25)], [1, o.base]]);
  const r = rng(seed), sc = hex(o.stalk), hc = hex(o.head), n = Math.round((o.density ?? 1) * w * (y1 - y0) / 90);
  const items: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) { const t = r() ** 0.8; items.push([r() * w, lerp(y0, y1, t), t, r()]); }
  items.sort((a, b) => a[1] - b[1]);
  for (const [x, y, t, q] of items) {
    const hgt = lerp(4, 70, t * t) * (0.7 + q * 0.6), bend = (o.wind ?? 0.2) * (Math.sin((o.t ?? 0) * 1.3 + x * 0.01) * 0.6 + 0.4) * hgt;
    ctx.strokeStyle = css(scalec(sc, 0.75 + q * 0.5), 0.8); ctx.lineWidth = lerp(0.6, 2.2, t); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + bend * 0.3, y - hgt * 0.6, x + bend, y - hgt); ctx.stroke();
    if (t > 0.15) { ctx.fillStyle = css(mix(hc, [1, 0.95, 0.75], q * 0.3), 0.9); ctx.beginPath(); ctx.ellipse(x + bend, y - hgt - lerp(2, 8, t), lerp(1, 3.2, t), lerp(3, 9, t), bend * 0.02, 0, Math.PI * 2); ctx.fill(); }
  }
};
export const grassTufts = (ctx: C, seed: number, n: number, box: [number, number, number, number], color: string, size: number) => {
  const r = rng(seed), c = hex(color), [x0, y0, x1, y1] = box;
  for (let i = 0; i < n; i++) { const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), s = size * (0.5 + r()) * lerp(0.5, 1.4, (y - y0) / Math.max(1, y1 - y0)); for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (r() - 0.5) * 1.3; ctx.strokeStyle = css(scalec(c, 0.7 + r() * 0.6), 0.85); ctx.lineWidth = 1 + s * 0.04; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * s * 0.3, y + Math.sin(a) * s * 0.6, x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s); ctx.stroke(); } }
};

// ---------------------------------------------------------------- rock and ground
// a rock: faceted, lit on one side, darker in its cracks
export const rock = (ctx: C, x: number, y: number, w: number, h: number, seed: number, o: { color: string; light?: number; crack?: number }) => {
  const r = rng(seed), c = hex(o.color), L = o.light ?? -1, n = 9, pts: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = Math.PI + (i / (n - 1)) * Math.PI, rr = 0.75 + r() * 0.35; pts.push([x + Math.cos(a) * w * 0.5 * rr, y + Math.sin(a) * h * rr]); }
  ctx.fillStyle = css(scalec(c, 0.7)); ctx.beginPath(); ctx.moveTo(x - w / 2, y); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
  // facets: triangles from a high point, lit by their tilt toward the light
  const apex: [number, number] = [x + (r() - 0.5) * w * 0.3, y - h * (0.55 + r() * 0.2)];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], mx = (a[0] + b[0]) / 2 - apex[0], lit = clamp(0.5 + (L < 0 ? -1 : 1) * mx / (w * 0.5) * 0.6 + (r() - 0.5) * 0.2); ctx.fillStyle = css(mix(scalec(c, 0.55), mix(c, [1, 0.97, 0.9], 0.25), lit)); ctx.beginPath(); ctx.moveTo(apex[0], apex[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill(); }
  if (o.crack) { ctx.strokeStyle = css(scalec(c, 0.35), 0.7); ctx.lineWidth = 1.2; for (let i = 0; i < 3 * o.crack; i++) { const sx = x + (r() - 0.5) * w * 0.6, sy = y - r() * h * 0.8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (r() - 0.5) * w * 0.2, sy + r() * h * 0.3); ctx.stroke(); } }
};
// pebbles on a shore (Capernaum's basalt), smaller with distance
export const pebbles = (ctx: C, seed: number, n: number, box: [number, number, number, number], colors: string[], o: { light?: number; wet?: number } = {}) => {
  const r = rng(seed), [x0, y0, x1, y1] = box, cs = colors.map(hex), items: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) { const t = r() ** 0.9; items.push([lerp(x0, x1, r()), lerp(y0, y1, t), t, r()]); }
  items.sort((a, b) => a[1] - b[1]);
  for (const [x, y, t, q] of items) {
    const s = lerp(1.5, 16, t) * (0.5 + q), c = cs[Math.floor(q * cs.length) % cs.length], wet = (o.wet ?? 0) * (1 - t);
    ctx.fillStyle = css(scalec(c, 0.55 - wet * 0.1)); ctx.beginPath(); ctx.ellipse(x + s * 0.12, y + s * 0.1, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = css(scalec(c, 0.9 + q * 0.25)); ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.55, (q - 0.5) * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = css(mix(c, [1, 0.97, 0.9], 0.35 + wet * 0.3), 0.7); ctx.beginPath(); ctx.ellipse(x - s * 0.25 * (o.light ?? -1) * -1, y - s * 0.2, s * 0.45, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  }
};
// a dusty road running into the distance
export const road = (ctx: C, pts: [number, number, number][], color: string, seed: number) => {
  const c = hex(color), r = rng(seed);
  ctx.fillStyle = css(c); ctx.beginPath(); pts.forEach(([x, y, w], i) => (i ? ctx.lineTo(x - w / 2, y) : ctx.moveTo(x - w / 2, y))); for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0] + pts[i][2] / 2, pts[i][1]); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 400; i++) { const k = Math.floor(r() * (pts.length - 1)), f = r(), p = pts[k], q = pts[k + 1], x = lerp(p[0], q[0], f), y = lerp(p[1], q[1], f), w = lerp(p[2], q[2], f); ctx.fillStyle = css(scalec(c, 0.85 + r() * 0.3), 0.35); ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * w * 0.9, y, w * 0.04 + 1, 1 + w * 0.006, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const s of [-0.22, 0.22]) { ctx.strokeStyle = css(scalec(c, 0.8), 0.45); ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y, w], i) => (i ? ctx.lineTo(x + s * w, y) : ctx.moveTo(x + s * w, y))); ctx.stroke(); }
};
export { col, smooth };

// ---------------------------------------------------------------- painted trees
// A tree the way a painter builds it: a skeleton of tapering limbs, then foliage as masses of small
// leaf-dabs clustered at the limb ends, each mass dark underneath and away from the light, light on
// top and on the lit side, with sky holes through the thinner species. Back masses first, then the
// limbs, then the front masses.
export type TreeKind = "oak" | "fig" | "poplar" | "olive" | "cypress" | "pine";
const SPECIES: Record<TreeKind, { leaf: string; lit: string; trunk: string; crown: [number, number]; top: number; limbs: number; spread: number; dab: number; holes: number; clusters: number }> = {
  oak: { leaf: "#38432a", lit: "#7e8a52", trunk: "#463c32", crown: [0.62, 0.5], top: 0.42, limbs: 4, spread: 0.9, dab: 7, holes: 0.08, clusters: 11 },
  fig: { leaf: "#3e5028", lit: "#849652", trunk: "#6a6258", crown: [0.66, 0.46], top: 0.36, limbs: 5, spread: 1.0, dab: 9, holes: 0.12, clusters: 10 },
  poplar: { leaf: "#46552e", lit: "#9aa46a", trunk: "#7a7466", crown: [0.2, 0.86], top: 0.12, limbs: 3, spread: 0.25, dab: 5, holes: 0.1, clusters: 9 },
  olive: { leaf: "#5a6448", lit: "#b8bea0", trunk: "#5d554a", crown: [0.64, 0.42], top: 0.4, limbs: 4, spread: 1.0, dab: 5, holes: 0.3, clusters: 12 },
  cypress: { leaf: "#26301f", lit: "#5e6a42", trunk: "#4a3f35", crown: [0.14, 0.92], top: 0.06, limbs: 1, spread: 0.1, dab: 5, holes: 0.02, clusters: 8 },
  pine: { leaf: "#34402a", lit: "#7c8a52", trunk: "#5a4636", crown: [0.8, 0.2], top: 0.72, limbs: 5, spread: 1.1, dab: 6, holes: 0.1, clusters: 12 },
};
export const paintTree = (c: C, x: number, y: number, h: number, seed: number, kind: TreeKind, light: -1 | 1 = -1) => {
  const S = SPECIES[kind], r = rng(seed), leaf = hex(S.leaf), lit = hex(S.lit), bark = hex(S.trunk), L = light;
  const crownY = y - h * (1 - S.crown[1] / 2), cw = h * S.crown[0] / 2, chh = h * S.crown[1] / 2;
  // clusters: points inside the crown ellipse, bigger in the middle
  const cl: { x: number; y: number; r: number; front: boolean }[] = [];
  for (let i = 0; i < S.clusters; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.78; cl.push({ x: x + Math.cos(a) * d * cw + (kind === "pine" ? (r() - 0.5) * cw * 0.3 : 0), y: crownY + Math.sin(a) * d * chh, r: (0.28 + r() * 0.22) * Math.min(cw, chh * 1.6) * (kind === "poplar" || kind === "cypress" ? 1.6 : 1), front: r() < 0.7 }); }
  if (kind === "poplar" || kind === "cypress") for (const q of cl) q.x = x + (q.x - x) * 0.6;
  const mass = (q: { x: number; y: number; r: number }, dark: number) => {
    const n = Math.round(q.r * q.r * 0.035 + 30);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()), px = q.x + Math.cos(a) * d * q.r, py = q.y + Math.sin(a) * d * q.r * 0.85;
      if (r() < S.holes * d) continue;
      const side = clamp(0.5 + L * -1 * (px - q.x) / q.r * 0.45 + (q.y - py) / q.r * 0.4 + (r() - 0.5) * 0.25), col = mix(scalec(leaf, 0.7 - dark * 0.25), lit, side * side * (1 - dark * 0.5));
      c.fillStyle = css(col, 0.9); c.beginPath(); c.ellipse(px, py, S.dab * (0.6 + r() * 0.8), S.dab * (0.35 + r() * 0.4), r() * Math.PI, 0, Math.PI * 2); c.fill();
    }
  };
  // back masses (darker)
  for (const q of cl) if (!q.front) mass(q, 0.6);
  // limbs: the trunk splits toward the clusters
  const trunkTop = y - h * S.top, tw = h * (kind === "poplar" || kind === "cypress" ? 0.02 : 0.034);
  const stroke = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, bend: number) => { const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2; c.fillStyle = css(bark); c.beginPath(); const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1; c.moveTo(x0 + (nx / nl) * w0, y0 + (ny / nl) * w0); c.quadraticCurveTo(mx + (nx / nl) * (w0 + w1) / 2, my + (ny / nl) * (w0 + w1) / 2, x1 + (nx / nl) * w1, y1 + (ny / nl) * w1); c.lineTo(x1 - (nx / nl) * w1, y1 - (ny / nl) * w1); c.quadraticCurveTo(mx - (nx / nl) * (w0 + w1) / 2, my - (ny / nl) * (w0 + w1) / 2, x0 - (nx / nl) * w0, y0 - (ny / nl) * w0); c.closePath(); c.fill();
    c.fillStyle = css(mix(bark, [0.9, 0.86, 0.78], 0.3), 0.6); c.beginPath(); c.moveTo(x0 + L * -w0 * 0.5, y0); c.quadraticCurveTo(mx + L * -w0 * 0.4, my, x1 + L * -w1 * 0.5, y1); c.lineTo(x1, y1); c.quadraticCurveTo(mx, my, x0, y0); c.closePath(); c.fill(); };
  const lean = (r() - 0.5) * h * (kind === "olive" ? 0.18 : kind === "pine" ? 0.14 : 0.06);
  stroke(x, y, x + lean, trunkTop, tw, tw * 0.7, (r() - 0.5) * tw * 3);
  if (kind === "olive") { stroke(x - tw * 0.6, y, x + lean * 0.6 - tw, trunkTop + h * 0.05, tw * 0.6, tw * 0.35, tw * 2); }
  const tips = [...cl].sort((a, b) => a.y - b.y).slice(0, S.limbs + 2);
  for (const q of tips) stroke(x + lean, trunkTop, lerp(x + lean, q.x, 0.7), lerp(trunkTop, q.y, 0.7), tw * 0.5, tw * 0.14, (r() - 0.5) * tw * 4);
  // front masses
  for (const q of cl) if (q.front) mass(q, 0.1);
};
