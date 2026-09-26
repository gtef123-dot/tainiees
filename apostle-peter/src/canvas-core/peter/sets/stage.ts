// STAGE: painted surfaces placed IN the world, so the camera can look any way and move freely.
//   ground(): a painted texture lying flat (a beach, a courtyard, a floor), drawn as a grid of small
//             cells, each mapped by an affine transform: together they make true perspective
//   card():   a painted texture standing upright (a wall, a cliff, a row of houses)
// Textures are painted top-down (ground) or face-on (cards) and repainted with brush marks, then
// cached as plates like everything else.
import type { Env } from "../../core";
import { rng } from "../../core";
import { type V3, type RGB, hex, mix, css, scalec, lerp, clamp, apply, rotY } from "../lib/math";
import { plate, paintOver, blurInto, type Surface } from "../paint/plates";
import { type WCam, wproj } from "../scene";

type C = CanvasRenderingContext2D;
const behind = (cam: WCam, z: number) => !!cam.focal && z / cam.scale >= (cam.focal / cam.scale) * 0.85;
const mapTo = (ctx: C, env: Env, tex: Surface, u0: number, v0: number, uw: number, vh: number, o: [number, number], a: [number, number], b: [number, number], pad = 0.015) => {
  ctx.setTransform(env.scale * (a[0] - o[0]), env.scale * (a[1] - o[1]), env.scale * (b[0] - o[0]), env.scale * (b[1] - o[1]), env.scale * o[0], env.scale * o[1]);
  ctx.drawImage(tex.canvas as CanvasImageSource, u0, v0, Math.max(0.5, uw), Math.max(0.5, vh), -pad, -pad, 1 + 2 * pad, 1 + 2 * pad);
};
// one quad of texture onto four screen points EXACTLY: two triangles, each clipped and mapped affinely
// (an affine map is exact on a triangle), each clip grown half a pixel so neighbours leave no seam
type Pt = [number, number];
const grow = (a: Pt, b: Pt, c: Pt, k: number): [Pt, Pt, Pt] => { const mx = (a[0] + b[0] + c[0]) / 3, my = (a[1] + b[1] + c[1]) / 3, g = (p: Pt): Pt => { const dx = p[0] - mx, dy = p[1] - my, l = Math.hypot(dx, dy) || 1; return [p[0] + (dx / l) * k, p[1] + (dy / l) * k]; }; return [g(a), g(b), g(c)]; };
const quadTo = (ctx: C, env: Env, tex: Surface, u0: number, v0: number, uw: number, vh: number, p00: Pt, p10: Pt, p01: Pt, p11: Pt) => {
  const tri = (a: Pt, b: Pt, c: Pt, o: Pt, ax: Pt, bx: Pt) => {
    ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const [A, B, Cc] = grow(a, b, c, 0.7); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(Cc[0], Cc[1]); ctx.closePath(); ctx.clip();
    ctx.setTransform(env.scale * ax[0], env.scale * ax[1], env.scale * bx[0], env.scale * bx[1], env.scale * o[0], env.scale * o[1]);
    ctx.drawImage(tex.canvas as CanvasImageSource, u0, v0, Math.max(0.5, uw), Math.max(0.5, vh), -0.02, -0.02, 1.04, 1.04); ctx.restore();
  };
  tri(p00, p10, p01, p00, [p10[0] - p00[0], p10[1] - p00[1]], [p01[0] - p00[0], p01[1] - p00[1]]);
  tri(p10, p11, p01, [p01[0] + p10[0] - p11[0], p01[1] + p10[1] - p11[1]], [p11[0] - p01[0], p11[1] - p01[1]], [p11[0] - p10[0], p11[1] - p10[1]]);
};

// a flat painted ground from x0..x1, z0 (far) .. z1 (near) at height y; tile: metres per texture repeat.
// Recursive: each texture tile is split until its pieces are small on screen (so perspective is exact
// enough whatever way the camera looks); pieces behind the lens are dropped; far away, 4 x 4 tiles are
// drawn at once from a baked copy of the texture.
const baked = (env: Env, t: Surface) => plate(env, `bake4:${t.w}x${t.h}:${(t.canvas as unknown as { __id?: number }).__id ?? ""}`, t.w, t.h, (s) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) s.ctx.drawImage(t.canvas as CanvasImageSource, 0, 0, t.w, t.h, (i * t.w) / 4, (j * t.h) / 4, t.w / 4, t.h / 4); });
let texIds = 0;
// slope: the ground rises this many metres per metre toward +z (a hillside)
export const ground = (ctx: C, env: Env, cam: WCam, tx: Surface, o: { x0: number; x1: number; z0: number; z1: number; y?: number; slope?: number; tile?: [number, number]; alpha?: number; maxCell?: number }) => {
  const y = o.y ?? 0, sl = o.slope ?? 0, c0: WCam = { ...cam, shake: 0 }, P = (x: number, z: number) => wproj(c0, env, [x, y + sl * z, z]);
  const sh = cam.shake ? [wproj(cam, env, cam.target)[0] - wproj(c0, env, cam.target)[0], wproj(cam, env, cam.target)[1] - wproj(c0, env, cam.target)[1]] : [0, 0];
  const [tw, th] = o.tile ?? [o.x1 - o.x0, o.z1 - o.z0], maxCell = o.maxCell ?? 170, tiled = !!o.tile;
  const anyTex = tx.canvas as unknown as { __id?: number }; if (anyTex.__id === undefined) anyTex.__id = ++texIds;
  const big = tiled ? baked(env, tx) : tx;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.imageSmoothingEnabled = true;
  const S = (p: V3): Pt => [p[0] + sh[0], p[1] + sh[1]];
  const rect = (t: Surface, xa: number, xb: number, za: number, zb: number, u0: number, v0: number, uw: number, vh: number, depth: number) => {
    const p00 = P(xa, za), p10 = P(xb, za), p01 = P(xa, zb), p11 = P(xb, zb), ps = [p00, p10, p01, p11];
    const nb = ps.filter((p) => behind(c0, p[2])).length; if (nb === 4) return;
    if (!nb && (Math.max(...ps.map((p) => p[0])) < -40 || Math.min(...ps.map((p) => p[0])) > env.W + 40 || Math.max(...ps.map((p) => p[1])) < -40 || Math.min(...ps.map((p) => p[1])) > env.H + 40)) return;
    const size = nb ? 1e9 : Math.max(Math.hypot(p10[0] - p00[0], p10[1] - p00[1]), Math.hypot(p01[0] - p00[0], p01[1] - p00[1]), Math.hypot(p11[0] - p01[0], p11[1] - p01[1]), Math.hypot(p11[0] - p10[0], p11[1] - p10[1]));
    if (size <= maxCell || depth >= 7) { if (!nb) quadTo(ctx, env, t, u0, v0, uw, vh, S(p00), S(p10), S(p01), S(p11)); return; }
    const xm = (xa + xb) / 2, zm = (za + zb) / 2, uh = uw / 2, vhh = vh / 2;
    rect(t, xa, xm, za, zm, u0, v0, uh, vhh, depth + 1); rect(t, xm, xb, za, zm, u0 + uh, v0, uh, vhh, depth + 1);
    rect(t, xa, xm, zm, zb, u0, v0 + vhh, uh, vhh, depth + 1); rect(t, xm, xb, zm, zb, u0 + uh, v0 + vhh, uh, vhh, depth + 1);
  };
  if (!tiled) rect(tx, o.x0, o.x1, o.z0, o.z1, 0, 0, tx.w, tx.h, 0);
  else {
    // coarse tiles of 4 x 4 texture repeats; a coarse tile small on screen is drawn whole from the baked copy
    const TW = tw * 4, TH = th * 4;
    for (let X = Math.floor(o.x0 / TW) * TW; X < o.x1; X += TW) for (let Z = Math.floor(o.z0 / TH) * TH; Z < o.z1; Z += TH) {
      const xa = Math.max(X, o.x0), xb = Math.min(X + TW, o.x1), za = Math.max(Z, o.z0), zb = Math.min(Z + TH, o.z1); if (xb <= xa || zb <= za) continue;
      const ps = [P(xa, za), P(xb, za), P(xa, zb), P(xb, zb)], nb = ps.filter((p) => behind(c0, p[2])).length; if (nb === 4) continue;
      const size = nb ? 1e9 : Math.max(...ps.map((p) => p[0])) - Math.min(...ps.map((p) => p[0])) + Math.max(...ps.map((p) => p[1])) - Math.min(...ps.map((p) => p[1]));
      if (size < 260) { rect(big, xa, xb, za, zb, ((xa - X) / TW) * big.w, ((za - Z) / TH) * big.h, ((xb - xa) / TW) * big.w, ((zb - za) / TH) * big.h, 5); continue; }
      for (let x = xa; x < xb - 1e-6; ) { const xn = Math.min(xb, (Math.floor(x / tw + 1e-7) + 1) * tw); for (let z = za; z < zb - 1e-6; ) { const zn = Math.min(zb, (Math.floor(z / th + 1e-7) + 1) * th); const fu = ((x / tw) % 1 + 1) % 1, fv = ((z / th) % 1 + 1) % 1; rect(tx, x, xn, z, zn, fu * tx.w, fv * tx.h, ((xn - x) / tw) * tx.w, ((zn - z) / th) * tx.h, 0); z = zn; } x = xn; }
    }
  }
  ctx.restore();
};

// an upright painted card: bottom-centre at `at`, w x h metres, turned by yaw (0 faces +z)
export const card = (ctx: C, env: Env, cam: WCam, tex: Surface, o: { at: V3; w: number; h: number; yaw?: number; alpha?: number; cols?: number; u0?: number; u1?: number }) => {
  const R = rotY(o.yaw ?? 0), cols = o.cols ?? 6, P = (u: number, v: number) => { const w = apply(R, [(u - 0.5) * o.w, v * o.h, 0]); return wproj(cam, env, [o.at[0] + w[0], o.at[1] + w[1], o.at[2] + w[2]]); };
  const U0 = o.u0 ?? 0, U1 = o.u1 ?? 1;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
  for (let i = 0; i < cols; i++) {
    const ua = i / cols, ub = (i + 1) / cols, tl = P(ua, 1), tr = P(ub, 1), bl = P(ua, 0), br = P(ub, 0);
    if (behind(cam, tl[2]) || behind(cam, tr[2]) || behind(cam, bl[2]) || behind(cam, br[2])) continue;
    quadTo(ctx, env, tex, lerp(U0, U1, ua) * tex.w, 0, (ub - ua) * (U1 - U0) * tex.w, tex.h, [tl[0], tl[1]], [tr[0], tr[1]], [bl[0], bl[1]], [br[0], br[1]]);
  }
  ctx.restore();
};

// a line lying on the ground in the world (a wet edge, a furrow, the foam at the waterline)
export const groundLine = (ctx: C, env: Env, cam: WCam, pts: V3[], style: { color: string; width: number; alpha?: number }) => {
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.strokeStyle = style.color; ctx.globalAlpha = style.alpha ?? 1; ctx.lineWidth = style.width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); pts.forEach((p, i) => { const s = wproj(cam, env, p); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }); ctx.stroke(); ctx.restore();
};

// ---------------------------------------------------------------- textures (top-down, tiling)
const tex = (env: Env, key: string, w: number, h: number, draw: (c: C, w: number, h: number) => void, paint?: Parameters<typeof paintOver>[2]) =>
  plate(env, `tex:${key}`, w, h, (s) => { draw(s.ctx, w, h); if (paint) paintOver(env, s, paint); });
// draw something at x,y and again across the tile's edges, so the texture repeats without a seam
const wrap = (w: number, h: number, x: number, y: number, r: number, f: (x: number, y: number) => void) => { for (const dx of [0, -w, w]) for (const dy of [0, -h, h]) { const X = x + dx, Y = y + dy; if (X + r < 0 || X - r > w || Y + r < 0 || Y - r > h) continue; f(X, Y); } };

// Capernaum's shore: rounded basalt pebbles and a few pale limestone ones, on grit (tile = 2 m)
export const pebbleTex = (env: Env, px = 1024, wet = 0) => tex(env, `pebbles:${px}:${wet}`, px, px, (c, w, h) => {
  const r = rng(301), k = w / 2; // px per metre
  c.fillStyle = css(mix(hex("#6f655a"), hex("#4a4540"), wet)); c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, s = 0.6 + r() * 1.6; c.fillStyle = css(scalec(hex("#7d7166"), 0.7 + r() * 0.6), 0.6); c.fillRect(x, y, s, s); }
  const cols = ["#3d3a38", "#4a4643", "#56504a", "#5e5249", "#8a8175", "#a59a8a", "#3a3532"].map(hex);
  for (let i = 0; i < 2600; i++) {
    const x = r() * w, y = r() * h, s = (0.008 + Math.pow(r(), 2.2) * 0.05) * k, e = 0.6 + r() * 0.35, a = r() * Math.PI, col = cols[Math.floor(r() * cols.length)], dark = scalec(col, 0.45 - wet * 0.1);
    wrap(w, h, x, y, s * 1.4, (X, Y) => {
      c.fillStyle = css(dark, 0.8); c.beginPath(); c.ellipse(X + s * 0.18, Y + s * 0.2, s * 1.05, s * e * 1.05, a, 0, Math.PI * 2); c.fill();
      c.fillStyle = css(scalec(col, 1 - wet * 0.25)); c.beginPath(); c.ellipse(X, Y, s, s * e, a, 0, Math.PI * 2); c.fill();
      c.fillStyle = css(mix(col, [0.96, 0.93, 0.86], 0.3 + wet * 0.45), 0.55 + wet * 0.3); c.beginPath(); c.ellipse(X - s * 0.25, Y - s * 0.28, s * 0.45, s * e * 0.3, a, 0, Math.PI * 2); c.fill();
    });
  }
}, { seed: 302, sizes: [10, 5, 2.5], keepBase: 0.6, alpha: 0.7 });

// packed earth with grit and a few stones (roads, a threshing floor, the hill path) (tile = 3 m)
export const earthTex = (env: Env, color = "#a88d64", px = 900) => tex(env, `earth:${color}:${px}`, px, px, (c, w, h) => {
  const r = rng(311), base = hex(color), k = w / 3;
  c.fillStyle = css(base); c.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, s = (0.15 + r() * 0.6) * k; wrap(w, h, x, y, s, (X, Y) => { const g = c.createRadialGradient(X, Y, 0, X, Y, s); g.addColorStop(0, css(scalec(base, 0.86 + r() * 0.28), 0.35)); g.addColorStop(1, css(base, 0)); c.fillStyle = g; c.fillRect(X - s, Y - s, 2 * s, 2 * s); }); }
  for (let i = 0; i < 7000; i++) { const x = r() * w, y = r() * h; c.fillStyle = css(scalec(base, 0.6 + r() * 0.7), 0.5); c.fillRect(x, y, 1 + r() * 1.5, 1 + r() * 1.5); }
  for (let i = 0; i < 90; i++) { const x = r() * w, y = r() * h, s = (0.01 + r() * 0.035) * k, col = mix(base, hex("#8a8276"), 0.6); wrap(w, h, x, y, s * 1.4, (X, Y) => { c.fillStyle = css(scalec(col, 0.5)); c.beginPath(); c.ellipse(X + s * 0.2, Y + s * 0.2, s, s * 0.7, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = css(scalec(col, 1.05)); c.beginPath(); c.ellipse(X, Y, s, s * 0.7, r(), 0, Math.PI * 2); c.fill(); }); }
}, { seed: 312, sizes: [12, 6, 3], keepBase: 0.6, alpha: 0.7 });

// flagstones (the high priest's courtyard, a Roman floor): irregular slabs, worn joints (tile = 4 m)
export const flagTex = (env: Env, color = "#8f8578", px = 1024, joint = "#4a433c") => tex(env, `flags:${color}:${px}`, px, px, (c, w, h) => {
  const r = rng(321), base = hex(color), k = w / 4;
  c.fillStyle = joint; c.fillRect(0, 0, w, h);
  const rows = 6; let y = 0;
  for (let row = 0; row < rows; row++) {
    const rh = h / rows; let x = -r() * k * 0.5;
    while (x < w) { const sw = (0.45 + r() * 0.5) * k, col = scalec(base, 0.82 + r() * 0.3); c.fillStyle = css(col); const j = 0.02 * k; c.beginPath(); c.moveTo(x + j + r() * j, y + j + r() * j); c.lineTo(x + sw - j - r() * j, y + j + r() * j); c.lineTo(x + sw - j - r() * j, y + rh - j - r() * j); c.lineTo(x + j + r() * j, y + rh - j - r() * j); c.closePath(); c.fill();
      // wear: a paler polished middle, dark grime at the edges
      const g = c.createRadialGradient(x + sw / 2, y + rh / 2, 0, x + sw / 2, y + rh / 2, Math.max(sw, rh) * 0.7); g.addColorStop(0, css(mix(col, [0.95, 0.92, 0.86], 0.12), 0.8)); g.addColorStop(1, css(scalec(col, 0.8), 0.6)); c.fillStyle = g; c.fillRect(x + j, y + j, sw - 2 * j, rh - 2 * j);
      x += sw; }
    y += rh;
  }
  for (let i = 0; i < 5000; i++) { c.fillStyle = css(scalec(base, 0.5 + r() * 0.8), 0.25); c.fillRect(r() * w, r() * h, 1.5, 1.5); }
}, { seed: 322, sizes: [12, 6, 3], keepBase: 0.62, alpha: 0.7 });

// bare wooden floorboards (an upper room) (tile = 3 m)
export const boardTex = (env: Env, color = "#6e5038", px = 900) => tex(env, `boards:${color}:${px}`, px, px, (c, w, h) => {
  const r = rng(331), base = hex(color), n = 12, bw = w / n;
  for (let i = 0; i < n; i++) { const col = scalec(base, 0.8 + r() * 0.35); c.fillStyle = css(col); c.fillRect(i * bw, 0, bw, h); c.strokeStyle = css(scalec(col, 0.55)); c.lineWidth = 2.5; c.beginPath(); c.moveTo(i * bw, 0); c.lineTo(i * bw, h); c.stroke();
    for (let g = 0; g < 18; g++) { c.strokeStyle = css(scalec(col, 0.8 + r() * 0.3), 0.5); c.lineWidth = 1; const gx = i * bw + r() * bw; c.beginPath(); c.moveTo(gx, 0); c.bezierCurveTo(gx + (r() - 0.5) * 8, h * 0.3, gx + (r() - 0.5) * 8, h * 0.6, gx + (r() - 0.5) * 6, h); c.stroke(); }
    const e = r() * h; c.strokeStyle = css(scalec(col, 0.5)); c.beginPath(); c.moveTo(i * bw, e); c.lineTo(i * bw + bw, e); c.stroke(); }
}, { seed: 332, sizes: [10, 5], flow: () => Math.PI / 2, keepBase: 0.6, alpha: 0.65 });

// a wet band / soft shadow texture: dark in the middle rows, clear at the ends (for the shoreline)
export const bandTex = (env: Env, color: RGB, key: string) => plate(env, `tex:band:${key}`, 64, 256, (s) => {
  const g = s.ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, css(color, 0)); g.addColorStop(0.3, css(color, 0.7)); g.addColorStop(0.55, css(color, 0.45)); g.addColorStop(1, css(color, 0)); s.ctx.fillStyle = g; s.ctx.fillRect(0, 0, 64, 256);
});
// blurred copy of a texture (for the soft background of a close-up)
export const softTex = (env: Env, t: Surface, key: string, r: number) => plate(env, `${key}:soft${r}`, t.w, t.h, (s) => { const b = blurInto(env, t, r); s.ctx.drawImage(b.canvas as CanvasImageSource, 0, 0); });

// ---------------------------------------------------------------- face-on card textures
// ripe wheat seen from the side, transparent above: stems, blades, bearded heads catching the light.
// One card is 4 m wide x 1.3 m tall; it repeats edge to edge.
export const wheatTex = (env: Env, lit: string, shade: string, key: string) => plate(env, `tex:wheat:${key}`, 1200, 390, (s) => {
  const c = s.ctx, w = 1200, h = 390, r = rng(341), L = hex(lit), D = hex(shade), k = h / 1.3;
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < 520; i++) {
    const x = r() * w, ht = (0.8 + r() * 0.35) * k * (0.85 + pass * 0.08), lean = (r() - 0.5) * 22, tone = 0.55 + pass * 0.2 + r() * 0.15, top = h - ht;
    wrap(w, h, x, h / 2, 40, (X) => {
      c.strokeStyle = css(mix(D, L, tone * 0.7)); c.lineWidth = 1.6; c.beginPath(); c.moveTo(X, h + 2); c.quadraticCurveTo(X + lean * 0.3, h - ht * 0.5, X + lean, top); c.stroke();
      if (r() < 0.5) { c.strokeStyle = css(mix(D, L, tone * 0.5), 0.8); c.lineWidth = 2.2; c.beginPath(); c.moveTo(X + lean * 0.2, h - ht * 0.35); c.quadraticCurveTo(X + lean * 0.2 + 14 * (r() - 0.5) * 2, h - ht * 0.55, X + lean * 0.4 + 26 * (r() - 0.5), h - ht * 0.45); c.stroke(); }
      // the head: a slim ear, lit on one side, with awns
      const hx = X + lean, hy = top, hl = 26 + r() * 10, a = -Math.PI / 2 + lean * 0.012;
      c.fillStyle = css(mix(D, L, tone)); c.beginPath(); c.ellipse(hx + Math.cos(a) * hl * 0.5, hy + Math.sin(a) * hl * 0.5, 4.2, hl * 0.55, a + Math.PI / 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = css(mix(L, [1, 0.97, 0.85], 0.35), 0.7); c.beginPath(); c.ellipse(hx + Math.cos(a) * hl * 0.5 - 1.5, hy + Math.sin(a) * hl * 0.5, 1.6, hl * 0.45, a + Math.PI / 2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = css(mix(D, L, tone), 0.55); c.lineWidth = 0.8; for (let q = 0; q < 5; q++) { c.beginPath(); c.moveTo(hx + Math.cos(a) * hl * (0.3 + q * 0.15), hy + Math.sin(a) * hl * (0.3 + q * 0.15)); c.lineTo(hx + Math.cos(a) * hl * (0.6 + q * 0.2) + (q % 2 ? 7 : -7), hy + Math.sin(a) * hl * (0.6 + q * 0.2) - 6); c.stroke(); }
    });
  }
  paintOver(env, s, { seed: 342, sizes: [8, 4], flow: () => -Math.PI / 2, keepBase: 0.7, alpha: 0.55 });
});
// dry summer grass on a hillside, seen from above (tile = 3 m)
export const grassTex = (env: Env, base = "#a39a62", px = 900) => tex(env, `grass:${base}:${px}`, px, px, (c, w, h) => {
  const r = rng(351), b = hex(base), k = w / 3;
  c.fillStyle = css(scalec(b, 0.85)); c.fillRect(0, 0, w, h);
  for (let i = 0; i < 200; i++) { const x = r() * w, y = r() * h, s = (0.2 + r() * 0.5) * k; wrap(w, h, x, y, s, (X, Y) => { const g = c.createRadialGradient(X, Y, 0, X, Y, s); g.addColorStop(0, css(scalec(b, 0.8 + r() * 0.35), 0.4)); g.addColorStop(1, css(b, 0)); c.fillStyle = g; c.fillRect(X - s, Y - s, 2 * s, 2 * s); }); }
  for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, l = 4 + r() * 12, a = r() * Math.PI; c.strokeStyle = css(mix(scalec(b, 0.6 + r() * 0.7), [0.45, 0.5, 0.3], r() * 0.3), 0.6); c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  for (let i = 0; i < 60; i++) { const x = r() * w, y = r() * h, s = (0.02 + r() * 0.06) * k; wrap(w, h, x, y, s * 1.3, (X, Y) => { c.fillStyle = css(hex("#8a8274"), 0.9); c.beginPath(); c.ellipse(X, Y, s, s * 0.7, r(), 0, Math.PI * 2); c.fill(); }); }
}, { seed: 352, sizes: [10, 5, 2.5], keepBase: 0.6, alpha: 0.7 });
// a street front of basalt courtyard houses (Capernaum): dark stone in rough courses, lime mortar,
// doorways with wooden lintels, an outside stair, a roof of beams and packed mud. 12 m x 4 m.
export const streetTex = (env: Env, key: string, o: { sun: -1 | 1; lit?: number } = { sun: -1 }) => plate(env, `tex:street:${key}`, 1800, 600, (s) => {
  const c = s.ctx, w = 1800, h = 600, r = rng(361 + key.length), k = w / 12, lit = o.lit ?? 1, stone = [hex("#3a3734"), hex("#46423c"), hex("#302e2c"), hex("#4e4840")];
  let x = 0;
  while (x < w) {
    const hw = (3 + r() * 3) * k, hh = (2.6 + r() * 1.0) * k, top = h - hh;
    // rough basalt fieldstones laid in mud: a dark bed, then irregular stones of every size in loose courses
    c.fillStyle = css(scalec(hex("#2a2622"), lit)); c.fillRect(x, top, hw, hh);
    for (let y = h; y > top + 4; ) { const ch = (0.14 + r() * 0.16) * k; for (let bx = x + r() * 6; bx < x + hw - 4; ) { const bw = Math.min((0.16 + r() * 0.4) * k, x + hw - bx), col = scalec(stone[Math.floor(r() * 4)], (0.75 + r() * 0.5) * lit), j = () => (r() - 0.5) * 0.05 * k, yy = Math.max(top, y - ch);
      c.fillStyle = css(col); c.beginPath(); c.moveTo(bx + 3 + j(), y - 3 + j()); c.lineTo(bx + bw * 0.5 + j(), y - 2 + j()); c.lineTo(bx + bw - 3 + j(), y - 4 + j()); c.lineTo(bx + bw - 2 + j(), yy + ch * 0.5 + j()); c.lineTo(bx + bw - 4 + j(), yy + 3 + j()); c.lineTo(bx + bw * 0.4 + j(), yy + 2 + j()); c.lineTo(bx + 3 + j(), yy + 4 + j()); c.closePath(); c.fill();
      c.fillStyle = css(mix(col, [0.85, 0.82, 0.76], 0.18), 0.6); c.fillRect(bx + 5, yy + 4, bw - 10, Math.max(1.5, ch * 0.12));
      bx += bw + 1; } y -= ch; }
    // the roof edge: beam ends and a lip of mud
    c.fillStyle = css(scalec(hex("#6a5440"), lit)); c.fillRect(x - 4, top - 0.18 * k, hw + 8, 0.2 * k); for (let bx = x + 10; bx < x + hw; bx += 0.5 * k) { c.fillStyle = css(scalec(hex("#4a3a2c"), lit)); c.beginPath(); c.arc(bx, top - 0.08 * k, 0.07 * k, 0, Math.PI * 2); c.fill(); }
    // a doorway with a lintel, dark inside
    if (r() < 0.8) { const dx = x + hw * (0.2 + r() * 0.5), dw = 0.9 * k, dh = 1.9 * k; c.fillStyle = "#15120f"; c.fillRect(dx, h - dh, dw, dh); c.fillStyle = css(scalec(hex("#6e5638"), lit)); c.fillRect(dx - 0.12 * k, h - dh - 0.18 * k, dw + 0.24 * k, 0.18 * k); c.fillStyle = css(hex("#2a2420"), 0.8); c.fillRect(dx + dw * 0.1, h - dh, dw * 0.3, dh); }
    // an outside stair to the roof
    if (r() < 0.35) { const sx = x + hw - 1.6 * k; for (let i = 0; i < 8; i++) { c.fillStyle = css(scalec(stone[i % 4], 1.1 * lit)); c.fillRect(sx + i * 0.18 * k, h - (i + 1) * 0.3 * k, 1.6 * k - i * 0.18 * k, 0.3 * k); } }
    // light: the sunlit face and a cast shadow line at the corner
    const g = c.createLinearGradient(x, 0, x + hw, 0); g.addColorStop(0, css([0, 0, 0], o.sun > 0 ? 0.25 : 0)); g.addColorStop(1, css([0, 0, 0], o.sun > 0 ? 0 : 0.25)); c.fillStyle = g; c.fillRect(x, top, hw, hh);
    x += hw + (r() < 0.3 ? (0.8 + r() * 1.2) * k : 0);
  }
  // dust at the foot of the walls
  const g = c.createLinearGradient(0, h - 0.5 * k, 0, h); g.addColorStop(0, "rgba(150,130,100,0)"); g.addColorStop(1, "rgba(150,130,100,0.45)"); c.fillStyle = g; c.fillRect(0, h - 0.5 * k, w, 0.5 * k);
  paintOver(env, s, { seed: 362, sizes: [10, 5, 2.5], keepBase: 0.6, alpha: 0.7 });
});
// the cliff at Caesarea Philippi (Banias): a wall of pale limestone streaked red-brown, fissured
// in tall blocks, the dark mouth of the grotto low down, carved niches, figs and ivy in the cracks.
// One card: 36 m wide x 28 m tall. glow: how much the late sun grazes it.
export const cliffTex = (env: Env, glowAmt = 1) => plate(env, `tex:cliff:${glowAmt}`, 1800, 1400, (s) => {
  const c = s.ctx, w = 1800, h = 1400, r = rng(371), k = w / 36, base = hex("#b8a488"), warm = hex("#e8b27a"), dark = hex("#5a4a3e");
  // the silhouette against the sky: a ragged top edge
  c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 12) c.lineTo(x, 120 + 60 * Math.sin(x * 0.004 + 1) + 35 * Math.sin(x * 0.017) + 14 * Math.sin(x * 0.07)); c.lineTo(w, h); c.closePath();
  const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, css(mix(base, warm, 0.45 * glowAmt))); g.addColorStop(0.6, css(mix(base, warm, 0.25 * glowAmt))); g.addColorStop(1, css(scalec(base, 0.82))); c.fillStyle = g; c.fill();
  c.save(); c.clip();
  // tall blocks: vertical fissures with shaded faces, and horizontal bedding
  for (let x = 0; x < w; ) { const bw = (1.2 + r() * 3.5) * k; c.fillStyle = css(scalec(dark, 0.7), 0.55); c.fillRect(x, 0, 2 + r() * 4, h); const sg = c.createLinearGradient(x, 0, x + bw, 0); sg.addColorStop(0, css(scalec(base, 0.6), 0.35)); sg.addColorStop(0.3, css(base, 0)); sg.addColorStop(0.85, css(warm, 0.18 * glowAmt)); sg.addColorStop(1, css(scalec(base, 0.7), 0.3)); c.fillStyle = sg; c.fillRect(x, 0, bw, h); x += bw; }
  for (let y = 200; y < h; y += (0.6 + r() * 1.4) * k) { c.strokeStyle = css(scalec(dark, 0.9), 0.3 + r() * 0.25); c.lineWidth = 1.5 + r() * 2; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 40) c.lineTo(x, y + Math.sin(x * 0.01 + y) * 6 + (r() - 0.5) * 4); c.stroke(); }
  // iron-red streaks running down from the ledges, pale weathering
  for (let i = 0; i < 70; i++) { const x = r() * w, y0 = 150 + r() * h * 0.6, l = (2 + r() * 8) * k; const sg = c.createLinearGradient(0, y0, 0, y0 + l); sg.addColorStop(0, css(hex("#8a5a3a"), 0.35)); sg.addColorStop(1, css(hex("#8a5a3a"), 0)); c.fillStyle = sg; c.fillRect(x, y0, 4 + r() * 16, l); }
  // the grotto: a great dark arched mouth low on the left, deep shadow inside
  const gx = w * 0.3, gy = h - 1.5 * k, gw = 9 * k, gh = 8 * k; c.fillStyle = "#15100c"; c.beginPath(); c.moveTo(gx - gw / 2, gy); c.bezierCurveTo(gx - gw * 0.55, gy - gh * 0.8, gx - gw * 0.2, gy - gh * 1.05, gx + gw * 0.05, gy - gh); c.bezierCurveTo(gx + gw * 0.4, gy - gh * 0.95, gx + gw * 0.55, gy - gh * 0.6, gx + gw / 2, gy); c.closePath(); c.fill();
  const ig = c.createRadialGradient(gx, gy - gh * 0.3, 0, gx, gy - gh * 0.3, gw * 0.6); ig.addColorStop(0, "rgba(60,40,28,0.5)"); ig.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = ig; c.fillRect(gx - gw, gy - gh * 1.2, gw * 2, gh * 1.3);
  // carved niches to the right of it, each a small shadowed arch with a ledge
  for (let i = 0; i < 5; i++) { const nx = w * (0.5 + i * 0.07), ny = h - (4 + (i % 2) * 3) * k, nw = 1.4 * k, nh = 2.2 * k; c.fillStyle = css(scalec(dark, 0.6)); c.beginPath(); c.moveTo(nx, ny); c.lineTo(nx, ny - nh + nw / 2); c.arc(nx + nw / 2, ny - nh + nw / 2, nw / 2, Math.PI, 0); c.lineTo(nx + nw, ny); c.closePath(); c.fill(); c.fillStyle = css(mix(base, warm, 0.4 * glowAmt)); c.fillRect(nx - 0.15 * k, ny, nw + 0.3 * k, 0.18 * k); }
  // green in the cracks: figs, ivy, tufts
  for (let i = 0; i < 120; i++) { const x = r() * w, y = 250 + r() * (h - 300), sz = (0.2 + r() * 0.9) * k; c.fillStyle = css(mix(hex("#4c5a30"), hex("#7a8448"), r())); c.beginPath(); for (let q = 0; q < 6; q++) { const a = r() * Math.PI * 2; c.ellipse(x + Math.cos(a) * sz * 0.4, y + Math.sin(a) * sz * 0.3, sz * 0.35, sz * 0.22, a, 0, Math.PI * 2); } c.fill(); }
  // scree and fallen blocks at the foot
  for (let i = 0; i < 60; i++) { const x = r() * w, y = h - r() * 1.2 * k, sz = (0.3 + r() * 1.2) * k; c.fillStyle = css(scalec(mix(base, warm, 0.2 * glowAmt), 0.7 + r() * 0.4)); c.beginPath(); c.ellipse(x, y, sz, sz * 0.55, 0, Math.PI, 0); c.fill(); }
  c.restore();
  paintOver(env, s, { seed: 372, sizes: [16, 8, 4], keepBase: 0.55, alpha: 0.75 });
});

// a tree seen side-on, on a transparent card (oak, fig, poplar, olive, cypress, pine), 600 x 700 px
import { paintTree, type TreeKind } from "../paint/nature";
export const treeTex = (env: Env, kind: TreeKind, seed: number, light: -1 | 1 = -1) => plate(env, `tex:tree2:${kind}:${seed}:${light}`, 600, 700, (s) => {
  paintTree(s.ctx, 300, 690, 670, seed, kind, light);
  paintOver(env, s, { seed: seed + 1, sizes: [6, 3], keepBase: 0.75, alpha: 0.55 });
});
// stand a scatter of tree cards around the scene (each faces the camera), far to near
export const trees = (ctx: C, env: Env, cam: WCam, items: { at: V3; kind: TreeKind; h: number; seed: number }[], light: -1 | 1 = -1, alpha = 1) => {
  const order = items.map((it) => ({ it, d: wproj(cam, env, it.at)[2] })).sort((a, b) => a.d - b.d);
  for (const { it } of order) { const tx = treeTex(env, it.kind, it.seed, light); card(ctx, env, cam, tx, { at: it.at, w: it.h * (600 / 700), h: it.h, yaw: cam.yaw, cols: 2, alpha }); }
};
