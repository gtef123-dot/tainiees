// THE HEAD. One 3D head per identity, built once from measured proportions, then posed, lit and
// painted in every shot. Nothing is ever redrawn per shot, so Peter is the same man from the
// fishing boat to Rome; age, expression, pose and light are parameters.
//
// Units: head height = 1 (crown +0.5 .. chin -0.5), eye line at y = 0, x to the viewer's right when
// the face looks at the camera, z toward the camera. The surface is a cranium and a face/jaw volume
// blended by a smooth max, plus a relief map for the features (nose, brow ridge, sockets,
// cheekbones, lips, chin). Hair and beard are soft-edged shells over it (each vertex carries how
// much hair/beard/lip it is, so their edges are soft, never stair-stepped). Eyes, brows, the mouth
// line, nostrils and wrinkles are painted overlays placed on the same surface, so they turn with it.
import { fractal, rng, type Env } from "../../core";
import { type Tri, type Anchor, DepthGrid, fillTris, paintAnchors, drawCtx } from "./mesh";
import { planes, type V3, type RGB, type M3, clamp, lerp, smooth, hex, mix, scalec, addc, css, tone, rotation, apply, norm3, dot3 } from "../lib/math";

export type Identity = {
  name: string; seed: number;
  width: number; jaw: number; chin: number; cheek: number; brow: number;
  noseLen: number; noseWidth: number; noseProj: number; noseBump: number; noseTip: number;
  eyeSize: number; eyeSpacing: number; eyeDepth: number; lidHeavy: number;
  lipFull: number; mouthWidth: number;
  skin: string; hair: string; hairGray: number; hairline: number; recede: number; forelock: number;
  hairVol: number; hairCurl: number; hairLong: number; // hairLong 0 = short, 1 = to the shoulders
  beard: number; beardLen: number; beardColor: string; beardGray: number; mustache: number; beardFork: number;
  browThick: number; browColor: string; browScar: boolean;
  age: number; eyeColor: string; earSize: number; neck: number;
};
export type Pose = { yaw: number; pitch: number; roll: number };
export type Expr = { browIn?: number; browOut?: number; knit?: number; lid?: number; squint?: number; gazeX?: number; gazeY?: number; smile?: number; frown?: number; open?: number; tremble?: number; tears?: number };
export type Light = { key: V3; keyColor: RGB; keyAmt: number; fill: RGB; fillAmt: number; bounce: RGB; bounceAmt: number; rim?: V3; rimColor?: RGB; rimAmt?: number };
export type HeadOpts = { z?: number; x: number; y: number; size: number; pose: Pose; expr?: Expr; light: Light; t?: number; lod?: number; strokes?: boolean; alpha?: number; neck?: boolean };

type Mesh = { lock: Uint8Array; p: Float32Array; n: Float32Array; cav: Float32Array; flow: Float32Array; hw: Float32Array; bw: Float32Array; lw: Float32Array; ew: Float32Array; stub: Float32Array; nose: Uint8Array; neck: Uint8Array; tri: Uint32Array; hairSeeds: Uint32Array };

// ---------------------------------------------------------------- shape
const O: V3 = [0, 0.02, -0.02];
const rayEll = (d: V3, c: V3, r: V3) => {
  const ox = (O[0] - c[0]) / r[0], oy = (O[1] - c[1]) / r[1], oz = (O[2] - c[2]) / r[2], dx = d[0] / r[0], dy = d[1] / r[1], dz = d[2] / r[2];
  const a = dx * dx + dy * dy + dz * dz, b = 2 * (ox * dx + oy * dy + oz * dz), cc = ox * ox + oy * oy + oz * oz - 1, disc = b * b - 4 * a * cc;
  return disc < 0 ? 0 : (-b + Math.sqrt(disc)) / (2 * a);
};
const smax = (a: number, b: number, k: number) => Math.log(Math.exp(k * a) + Math.exp(k * b)) / k;
const g2 = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => Math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2));
const shapeOf = (id: Identity) => ({ cran: [0, 0.12, -0.07] as V3, cranR: [0.36 * id.width, 0.4, 0.47] as V3, face: [0, -0.1, 0.035] as V3, faceR: [0.31 * lerp(id.width, id.jaw, 0.45), 0.42, 0.37] as V3 });
const skull = (id: Identity, d: V3) => { const s = shapeOf(id); return smax(rayEll(d, s.cran, s.cranR), rayEll(d, s.face, s.faceR), 28); };

// relief of the face (z offset) at front-plane coordinates
const relief = (id: Identity, x: number, y: number) => {
  const ax = Math.abs(x);
  let h = 0;
  const nl = id.noseLen, top = 0.03, tip = -0.165 * nl, sub = -0.235 * nl;
  if (y < top + 0.03 && y > sub - 0.03) {
    const t = clamp((top - y) / (top - tip));
    const prof = y >= tip ? lerp(0.02, 0.108, Math.pow(t, 1.3)) : 0.108 * clamp(1 - (tip - y) / (tip - sub)) ** 0.6;
    const w = lerp(0.03, 0.058, t) * id.noseWidth;
    h += id.noseProj * prof * Math.exp(-((x / w) ** 2)) * smooth(top + 0.03, top - 0.01, y);
    h += 0.016 * id.noseBump * g2(x, y, 0, -0.055, 0.03, 0.035);
    h += 0.024 * id.noseTip * g2(x, y, 0, tip + 0.01, 0.045 * id.noseWidth, 0.032);
  }
  h += 0.05 * id.noseProj * (g2(x, y, 0.057 * id.noseWidth, -0.2 * nl, 0.03, 0.028) + g2(x, y, -0.057 * id.noseWidth, -0.2 * nl, 0.03, 0.028));
  h -= 0.05 * id.eyeDepth * (g2(x, y, 0.148 * id.eyeSpacing, -0.004, 0.072, 0.05) + g2(x, y, -0.148 * id.eyeSpacing, -0.004, 0.072, 0.05));
  h += 0.028 * id.brow * (g2(x, y, 0.13, 0.068, 0.09, 0.028) + g2(x, y, -0.13, 0.068, 0.09, 0.028)) + 0.01 * id.brow * g2(x, y, 0, 0.06, 0.05, 0.03);
  h += 0.022 * id.cheek * (g2(x, y, 0.235, -0.1, 0.075, 0.06) + g2(x, y, -0.235, -0.1, 0.075, 0.06));
  h -= 0.016 * (g2(x, y, 0.3, 0.15, 0.06, 0.08) + g2(x, y, -0.3, 0.15, 0.06, 0.08));
  h += 0.02 * g2(x, y, 0, -0.3, 0.13, 0.08);
  h += 0.022 * id.lipFull * g2(x, y, 0, -0.293, 0.095 * id.mouthWidth, 0.018) + 0.026 * id.lipFull * g2(x, y, 0, -0.34, 0.08 * id.mouthWidth, 0.02);
  h -= 0.012 * (g2(x, y, 0.125 * id.mouthWidth, -0.316, 0.02, 0.02) + g2(x, y, -0.125 * id.mouthWidth, -0.316, 0.02, 0.02));
  h -= 0.016 * g2(x, y, 0, -0.385, 0.07, 0.018);
  h += 0.035 * id.chin * g2(x, y, 0, -0.44, 0.075, 0.05);
  h -= 0.008 * g2(x, y, 0, -0.255, 0.018, 0.02);
  h -= 0.01 * g2(ax, y, 0.15, -0.075, 0.06, 0.02);
  return h;
};
// signed masks measured on the bare skull: >0 inside, roughly in head units
const hairMask = (id: Identity, x: number, y: number, z: number) => {
  const ax = Math.abs(x), front = smooth(-0.1, 0.25, z);
  const recede = id.recede * g2(ax, 0, 0.16, 0, 0.09, 1) * 0.12;
  let line = lerp(-0.26, id.hairline + recede, front);
  line = lerp(line, 0.0, smooth(0.25, 0.35, ax) * smooth(-0.08, 0.15, z) * (1 - smooth(0.22, 0.36, z)));
  let m = y - line;
  if (ax > 0.26) m -= 0.3 * g2(z, y, -0.075, -0.06, 0.085, 0.12) * (id.hairLong > 0 ? 0 : 1);
  if (id.hairLong > 0 && y > 0.3 && z > -0.15) m = Math.min(m, (ax - 0.006) * 4);
  if (id.forelock > 0 && z > 0.1) m = Math.max(m, Math.min(0.06 * id.forelock - ax, y - (id.hairline - 0.07 * id.forelock)));
  return m;
};
const beardMask = (id: Identity, x: number, y: number, z: number) => {
  if (id.beard <= 0) return -1;
  const ax = Math.abs(x), back = z + 0.1;                                                   // nothing behind the ear
  const cheekLine = -0.27 + clamp((ax - 0.13) / 0.2) * 0.25;
  let m = Math.min(cheekLine - y, back);
  if (ax < 0.16) m = Math.min(m, Math.max(-0.35 - y, (ax - 0.12) * 2));              // below the lower lip; the corners of the mouth
  const lips = 1 - ((x / (0.13 * id.mouthWidth)) ** 2 + ((y + 0.318) / 0.042) ** 2);
  if (id.mustache > 0) { const must = Math.min(y + 0.297, -0.232 - y, 0.155 - ax); m = Math.max(m, must); }
  if (lips > 0) m = Math.min(m, -lips * 0.02);
  return m;
};

const buildMesh = (id: Identity, NU: number, NV: number): Mesh => {
  const LOCK: number[] = [], P: number[] = [], CAV: number[] = [], FLOW: number[] = [], HW: number[] = [], BW: number[] = [], LW: number[] = [], EW: number[] = [], ST: number[] = [], NOSE: number[] = [], NECK: number[] = [], T: number[] = [];
  const push = (p: V3, o: { cav?: number; flow?: V3; hw?: number; bw?: number; lw?: number; ew?: number; st?: number; nose?: number; neck?: number; lock?: number }) => {
    LOCK.push(o.lock ?? 0);
    P.push(p[0], p[1], p[2]); CAV.push(o.cav ?? 0); const f = o.flow ?? [0, -1, 0]; FLOW.push(f[0], f[1], f[2]);
    HW.push(o.hw ?? 0); BW.push(o.bw ?? 0); LW.push(o.lw ?? 0); EW.push(o.ew ?? 0); ST.push(o.st ?? 0); NOSE.push(o.nose ?? 0); NECK.push(o.neck ?? 0); return HW.length - 1;
  };
  const grid = (rows: number, cols: number, start: number, wrap: boolean, flip = false) => {
    const C = wrap ? cols : cols + 1;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const a = start + i * C + j, b = start + i * C + (wrap ? (j + 1) % cols : j + 1), c = a + C, d = b + C;
      if (flip) T.push(a, b, c, b, d, c); else T.push(a, c, b, b, c, d);
    }
  };
  // --- head surface
  for (let i = 0; i <= NV; i++) {
    const v = (i / NV) * Math.PI;
    for (let j = 0; j < NU; j++) {
      const s = -1 + (2 * j) / NU, u = Math.PI * (0.42 * s + 0.58 * s * Math.abs(s));
      const d: V3 = [Math.sin(v) * Math.sin(u), Math.cos(v), Math.sin(v) * Math.cos(u)];
      const t = skull(id, d);
      const p: V3 = [O[0] + d[0] * t, O[1] + d[1] * t, O[2] + d[2] * t];
      const jawG = g2(Math.abs(p[0]), p[1], 0.29, -0.33, 0.09, 0.08) * smooth(-0.25, 0.1, p[2]);
      p[0] += Math.sign(p[0]) * 0.075 * (id.jaw - 0.8) * jawG;
      const w = smooth(0.12, 0.55, d[2]), rel = relief(id, p[0], p[1]) * w;
      p[2] += rel;
      const cav = clamp(-rel * 14);
      const nose = Math.abs(p[0]) < 0.075 * id.noseWidth && p[1] < 0.05 && p[1] > -0.25 * id.noseLen && d[2] > 0.5 ? 1 : 0;
      const lipU = 1 - ((p[0] / (0.118 * id.mouthWidth)) ** 2 + ((p[1] + 0.3) / 0.021) ** 2), lipL = 1 - ((p[0] / (0.1 * id.mouthWidth)) ** 2 + ((p[1] + 0.338) / 0.024) ** 2);
      const lw = d[2] > 0.6 ? smooth(-0.1, 0.35, Math.max(lipU, lipL)) : 0;
      const hm = hairMask(id, p[0], p[1], p[2]), bm = beardMask(id, p[0], p[1], p[2]);
      const hw = id.hairVol > 0 ? smooth(-0.006, 0.022, hm) : 0, bw = (1 - hw) * smooth(-0.004, 0.018, bm) * (1 - lw);
      const st = (1 - hw) * (1 - bw) * smooth(-0.045, -0.002, bm) * (id.beard > 0 ? 1 : 0);
      let flow: V3 = [0, -1, 0], q = p;
      if (hw > 0) {
        const curl = fractal(id.seed + 3, p[0] * 9, p[1] * 9 + p[2] * 5, 1, 1, 3);
        const th = hw * id.hairVol * (0.024 + 0.034 * curl * id.hairCurl) * (0.3 + 0.7 * smooth(0, 0.06, hm));
        q = [p[0] + d[0] * th, p[1] + d[1] * th, p[2] + d[2] * th];
        flow = norm3([d[0] * 0.6 + 0.25 * Math.sign(p[0]), -0.55, d[2] * 0.5 + 0.2]);
      } else if (bw > 0) {
        const curl = fractal(id.seed + 9, p[0] * 11, p[1] * 11, 1, 1, 3);
        const must = Math.abs(p[0]) < 0.16 && p[1] > -0.31;
        const th = bw * (must ? 0.016 * id.mustache : id.beardLen * (0.022 + 0.026 * curl * id.hairCurl)) * smooth(0, 0.05, bm) + 0.003 * bw;
        const chin = smooth(-0.34, -0.5, p[1]) * id.beardLen * 0.035 * bw * (0.6 + 0.4 * curl);
        q = [p[0] + d[0] * th, p[1] + d[1] * th - chin, p[2] + d[2] * th];
        flow = must ? norm3([Math.sign(p[0]) * 0.8, -0.6, 0.2]) : [Math.sign(p[0]) * 0.1 * (1 - Math.abs(d[0])), -1, 0.1];
      }
      push(q, { cav, flow, hw, bw, lw, st, nose });
    }
  }
  grid(NV, NU, 0, true);
  // --- neck: a column that meets the collar; its front under the jaw is bearded
  if (true) {
    const NS = 36, NR = 8, n0 = HW.length;
    for (let r = 0; r <= NR; r++) {
      const t = r / NR, y = lerp(-0.2, -0.7, t), rx = 0.165 * id.neck + 0.06 * smooth(0.55, 1, t), rz = 0.155 * id.neck + 0.02 * smooth(0.6, 1, t), cz = -0.075 + 0.025 * t;
      for (let k = 0; k < NS; k++) {
        const a = (k / NS) * Math.PI * 2, x = Math.sin(a) * rx, z = cz + Math.cos(a) * rz;
        const bm = id.beard > 0 ? Math.min(z + 0.03, y + 0.5 + 0.05 * id.beardLen) : -1, bw = smooth(-0.01, 0.03, bm);
        push([x, y, z + bw * 0.018 * id.beardLen], { bw, st: (1 - bw) * smooth(-0.07, 0, bm) * (id.beard > 0 ? 1 : 0), neck: 1, cav: 0.05 + 0.2 * smooth(-0.25, -0.35, y) * (z > 0 ? 1 : 0) });
      }
    }
    grid(NR, NS, n0, true, true);
  }
  // --- ears: a shallow bowl with a raised rim, on the side of the skull
  for (const side of [-1, 1]) {
    const e0 = HW.length, ER = 8, ES = 20, h = 0.135 * id.earSize, w = 0.07 * id.earSize;
    const d = norm3([side, -0.05, -0.12]), surf = skull(id, d), cx = O[0] + d[0] * surf, cy = -0.055, cz = O[2] + d[2] * surf;
    for (let r = 0; r <= ER; r++) for (let k = 0; k < ES; k++) {
      const f = r / ER, a = (k / ES) * Math.PI * 2, lobe = Math.sin(a) < 0 ? 0.82 : 1;
      const u = Math.cos(a) * w * f, v = Math.sin(a) * h * f * lobe;
      const out = 0.012 + 0.03 * f * f - 0.014 * Math.sin(f * Math.PI) * (1 - f) + 0.012 * smooth(0.75, 1, f);
      push([cx + side * out, cy + v, cz - u - v * 0.28], { ew: 1, cav: f < 0.55 ? 0.4 : 0.05 });
    }
    grid(ER, ES, e0, true, side < 0);
  }
  // --- long hair: one sheet falling from the scalp, over the ears, to the shoulders, parted at the face
  if (id.hairLong > 0) {
    const L = id.hairLong, h0 = HW.length, HR = 20, HS = 44, v0 = 1.05, uMax = 1.2;
    for (let r = 0; r <= HR; r++) for (let k = 0; k <= HS; k++) {
      const t = r / HR, u = lerp(uMax, Math.PI * 2 - uMax, k / HS);
      const d: V3 = [Math.sin(v0) * Math.sin(u), Math.cos(v0), Math.sin(v0) * Math.cos(u)], top = skull(id, d) + 0.045 * id.hairVol;
      const tx = O[0] + d[0] * top, ty = O[1] + d[1] * top, tz = O[2] + d[2] * top;
      const yb = -0.3 - 0.55 * L, y = lerp(ty, yb, t), hr = Math.hypot(tx, tz + 0.07);
      const front = Math.cos(u) > -0.2 ? 1 : 0, rad = lerp(hr, 0.3 + 0.03 * front, smooth(0.15, 0.6, t)) + 0.12 * smooth(0.55, 1, t) + 0.02 * Math.sin(t * 7 + k * 1.9) * t;
      const ang = Math.atan2(tx, tz + 0.07);
      push([Math.sin(ang) * rad, y, -0.07 + Math.cos(ang) * rad - 0.04 * t], { hw: 1, cav: 0.12 * t, lock: 1, flow: [0, -1, 0] });
    }
    grid(HR, HS, h0, false, true);
  }
  // --- normals (outward)
  const N = HW.length, p = new Float32Array(P), n = new Float32Array(N * 3), tri = new Uint32Array(T);
  for (let k = 0; k < tri.length; k += 3) {
    const a = tri[k] * 3, b = tri[k + 1] * 3, c = tri[k + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const q of [a, b, c]) { n[q] += nx; n[q + 1] += ny; n[q + 2] += nz; }
  }
  for (let i = 0; i < N; i++) {
    const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1; n[i * 3] /= l; n[i * 3 + 1] /= l; n[i * 3 + 2] /= l;
    if (EW[i] > 0) continue;
    const cy = NECK[i] ? p[i * 3 + 1] : O[1], dx = p[i * 3] - O[0], dy = p[i * 3 + 1] - cy, dz = p[i * 3 + 2] - (NECK[i] ? -0.07 : O[2]);
    if (dx * n[i * 3] + dy * n[i * 3 + 1] + dz * n[i * 3 + 2] < 0) { n[i * 3] *= -1; n[i * 3 + 1] *= -1; n[i * 3 + 2] *= -1; }
  }
  const r = rng(id.seed + 77), seeds: number[] = [];
  for (let i = 0; i < N; i++) if ((HW[i] > 0.6 || BW[i] > 0.6) && r() < (BW[i] > 0.6 ? 0.6 : 0.42)) seeds.push(i);
  return { lock: new Uint8Array(LOCK), p, n, cav: new Float32Array(CAV), flow: new Float32Array(FLOW), hw: new Float32Array(HW), bw: new Float32Array(BW), lw: new Float32Array(LW), ew: new Float32Array(EW), stub: new Float32Array(ST), nose: new Uint8Array(NOSE), neck: new Uint8Array(NECK), tri, hairSeeds: new Uint32Array(seeds) };
};

const meshes = new Map<string, Mesh>();
const meshFor = (id: Identity, lod: number) => {
  const key = `${id.name}:${lod}`; let m = meshes.get(key);
  if (!m) { m = lod >= 2 ? buildMesh(id, 140, 108) : lod === 1 ? buildMesh(id, 84, 64) : buildMesh(id, 44, 34); meshes.set(key, m); }
  return m;
};

// ---------------------------------------------------------------- the surface under a front point (for placing overlays)
const surfCache = new Map<string, number>();
export const surfaceZ = (id: Identity, x: number, y: number) => {
  const key = `${id.name}:${x.toFixed(4)}:${y.toFixed(4)}`; const c = surfCache.get(key); if (c !== undefined) return c;
  let dx = x - O[0], dy = y - O[1], z = 0.4;
  for (let it = 0; it < 4; it++) {
    const d = norm3([dx, dy, z - O[2]]), t = skull(id, d);
    const px = O[0] + d[0] * t, py = O[1] + d[1] * t; z = O[2] + d[2] * t;
    dx += x - px; dy += y - py;
  }
  const w = smooth(0.12, 0.55, norm3([x - O[0], y - O[1], z - O[2]])[2]);
  const out = z + relief(id, x, y) * w; surfCache.set(key, out); return out;
};

// ---------------------------------------------------------------- lighting
const lightTerm = (n: V3, L: Light, hair: boolean): { c: RGB; term: number; spec: number } => {
  const d = dot3(n, L.key), wrap = hair ? 0.4 : 0.2, diff = planes(clamp((d + wrap) / (1 + wrap)), 4, hair ? 0.5 : 0.38);
  const up = n[1];
  let c: RGB = scalec(L.keyColor, diff * L.keyAmt);
  c = addc(c, scalec(L.fill, L.fillAmt * (0.5 + 0.5 * up)));
  c = addc(c, scalec(L.bounce, L.bounceAmt * clamp(0.3 - 0.7 * up)));
  const h = norm3([L.key[0], L.key[1], L.key[2] + 1]), spec = Math.pow(clamp(dot3(n, h)), hair ? 10 : 30) * (hair ? 0.06 : 0.11) * L.keyAmt;
  return { c, term: hair ? 0 : Math.exp(-(((d - 0.04) / 0.15) ** 2)) * 0.2 * L.keyAmt, spec };
};
export type HeadCols = { skin: RGB; hair: RGB; beard: RGB; lip: RGB; ear: RGB };
const colsOf = (id: Identity): HeadCols => {
  const skin = hex(id.skin);
  return { skin, hair: mix(hex(id.hair), [0.66, 0.64, 0.61], id.hairGray), beard: mix(hex(id.beardColor), [0.7, 0.68, 0.65], id.beardGray), lip: mix(skin, [0.55, 0.24, 0.22], 0.3), ear: mix(skin, [0.72, 0.32, 0.26], 0.14) };
};
const vertexColor = (m: Mesh, i: number, n: V3, L: Light, C: HeadCols): RGB => {
  const hw = m.hw[i], bw = m.bw[i], hairy = Math.max(hw, bw);
  const x = m.p[i * 3], y = m.p[i * 3 + 1], ax = Math.abs(x);
  let alb = mix(C.skin, C.lip, m.lw[i]); alb = mix(alb, C.ear, m.ew[i]);
  const red = clamp(g2(ax, y, 0.2, -0.13, 0.09, 0.08) * 0.8 + g2(x, y, 0, -0.17, 0.05, 0.05) * 0.9 + m.ew[i] * 0.5), cool = smooth(-0.22, -0.42, y) * (1 - m.lw[i]), gold = smooth(0.05, 0.3, y);
  alb = mix(alb, [alb[0] * 1.08, alb[1] * 0.86, alb[2] * 0.82], red * 0.55);
  alb = mix(alb, [alb[0] * 0.9, alb[1] * 0.96, alb[2] * 1.06], cool * 0.5);
  alb = mix(alb, [alb[0] * 1.04, alb[1] * 1.02, alb[2] * 0.9], gold * 0.4);
  alb = mix(alb, C.beard, m.stub[i] * 0.28);
  const s = lightTerm(n, L, false), h = hairy > 0 ? lightTerm(n, L, true) : s, cav = m.cav[i];
  const skinC: RGB = addc(addc([alb[0] * s.c[0], alb[1] * s.c[1], alb[2] * s.c[2]], scalec([0.55, 0.14, 0.06], s.term * (1 - cav))), scalec(L.keyColor, s.spec));
  const hc = mix(C.beard, C.hair, hw / Math.max(1e-6, hw + bw));
  const hairC: RGB = addc([hc[0] * h.c[0], hc[1] * h.c[1], hc[2] * h.c[2]], scalec(L.keyColor, h.spec));
  let out = mix(skinC, hairC, hairy);
  out = scalec(out, 1 - 0.5 * cav);
  if (L.rim && L.rimAmt) { const f = Math.pow(1 - clamp(n[2]), 2.5) * clamp(dot3(n, L.rim) + 0.25); out = addc(out, scalec(L.rimColor ?? [1, 1, 1], f * L.rimAmt)); }
  return tone(out);
};

// ---------------------------------------------------------------- render
export type Overlay = { z: number; draw: (g: DepthGrid) => void };
export type Parts = { tris: Tri[]; anchors: Anchor[]; overlays: Overlay[] };
// Everything the head contributes to a character: its triangles, its paint anchors, and one overlay
// (eyes, brows, mouth, wrinkles, hair) drawn at the depth of the face.
export const headParts = (ctx0: CanvasRenderingContext2D, id: Identity, o: HeadOpts): Parts => {
  const e = o.expr ?? {}, lod = o.lod ?? (o.size > 260 ? 2 : o.size > 110 ? 1 : 0), m = meshFor(id, lod), N = m.hw.length, C = colsOf(id);
  const R = rotation(o.pose.yaw, o.pose.pitch, o.pose.roll), S = o.size, F = 7;
  const t = o.t ?? 0, open = clamp(e.open ?? 0), smile = e.smile ?? 0, trem = e.tremble ?? 0, withNeck = o.neck !== false;
  const sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N), col: RGB[] = new Array(N), nzv = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x = m.p[i * 3], y = m.p[i * 3 + 1], z = m.p[i * 3 + 2];
    if (open > 0 && y < -0.31 && z > -0.12 && !m.neck[i]) { const wgt = smooth(-0.31, -0.42, y) * smooth(-0.12, 0.05, z); y -= open * 0.05 * wgt; z -= open * 0.012 * wgt; }
    if (smile !== 0 && z > 0) { const wgt = g2(Math.abs(x), y, 0.2, -0.2, 0.08, 0.08); y += smile * 0.012 * wgt; }
    const v = apply(R, [x, y, z]), k = F / (F - v[2]);
    sx[i] = o.x + v[0] * S * k; sy[i] = o.y - v[1] * S * k; sz[i] = v[2] * S + (o.z ?? 0);
    let nn = apply(R, [m.n[i * 3], m.n[i * 3 + 1], m.n[i * 3 + 2]]);
    if (m.lock[i] && nn[2] < 0) nn = [-nn[0] * 0.5, -nn[1] * 0.5, -nn[2]];
    nzv[i] = nn[2];
    col[i] = vertexColor(m, i, nn, o.light, C);
    if (m.lock[i] && apply(R, [m.n[i * 3], m.n[i * 3 + 1], m.n[i * 3 + 2]])[2] < 0) col[i] = scalec(col[i], 0.55);
  }
  const T = m.tri, nt = T.length / 3, tris: Tri[] = [], noseTris: Tri[] = [], alpha = o.alpha ?? 1;
  for (let k = 0; k < nt; k++) {
    const a = T[k * 3], b = T[k * 3 + 1], c = T[k * 3 + 2];
    if (!withNeck && m.neck[a]) continue;
    if (nzv[a] + nzv[b] + nzv[c] < -0.3 && !(m.ew[a] > 0) && !m.lock[a]) continue;
    const ca = col[a], cb = col[b], cc = col[c];
    const tri: Tri = { ax: sx[a], ay: sy[a], bx: sx[b], by: sy[b], cx: sx[c], cy: sy[c], z: (sz[a] + sz[b] + sz[c]) / 3, col: [(ca[0] + cb[0] + cc[0]) / 3, (ca[1] + cb[1] + cc[1]) / 3, (ca[2] + cb[2] + cc[2]) / 3], alpha, c3: [ca, cb, cc] };
    tris.push(tri); if (m.nose[a]) noseTris.push(tri);
  }
  // paint anchors on the bare skin (hair and beard get their own strokes)
  const anchors: Anchor[] = [];
  if (o.strokes !== false && S > 70) {
    const step = S > 500 ? 2 : S > 250 ? 3 : 5, bw = Math.min(S * 0.013, 11), bl = Math.min(S * 0.034, 32);
    for (let i = 0; i < N; i += step) {
      if (nzv[i] < 0.15 || m.hw[i] > 0.5 || m.bw[i] > 0.5 || m.lock[i] || (!withNeck && m.neck[i])) continue;
      const nx = m.n[i * 3], nz = m.n[i * 3 + 2], j = ((i * 2654435761) >>> 0) / 4294967296;
      let tx = nz, ty = 0.35 * Math.sin(m.p[i * 3] * 9 + m.p[i * 3 + 1] * 6) + (j - 0.5) * 0.5, tz = -nx;
      if (m.nose[i] || m.neck[i]) { tx = 0.2 * nz; ty = 1; tz = -0.2 * nx; }
      const tv = apply(R, [tx, ty, tz]); let dx = tv[0], dy = -tv[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      anchors.push({ x: sx[i], y: sy[i], z: sz[i], dx, dy, len: bl, w: bw, seed: id.seed * 7919 + i });
    }
  }
  let faceZ = -1e9; for (const tr of tris) if (tr.z > faceZ) faceZ = tr.z;
  const overlay: Overlay = { z: faceZ + 0.5, draw: (grid: DepthGrid) => {
  const ctx = drawCtx.ctx ?? ctx0;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
  const seen = (i: number, tol = 0.035) => grid.seen(sx[i], sy[i], sz[i], tol * S);
  const fillTri = (tr: Tri) => fillTris(ctx, [tr], Math.max(0.7, S / 520));
  // ---- overlays in head space
  const P3 = (x: number, y: number, z: number) => { const v = apply(R, [x, y, z]), k = F / (F - v[2]); return [o.x + v[0] * S * k, o.y - v[1] * S * k, v[2]] as V3; };
  const facing = (nrm: V3) => apply(R, norm3(nrm))[2];
  const skinTone = C.skin, alpha = o.alpha ?? 1;
  const litFace = clamp(0.3 + 0.7 * clamp(dot3(apply(R, [0, 0, 1]), o.light.key)) * o.light.keyAmt);
  const eyes = [-1, 1].map((side) => ({ side, z: P3(side * 0.148 * id.eyeSpacing, 0, 0.3)[2] })).sort((a, b) => a.z - b.z);
  const path = (pts: V3[] | [number, number][], close = false) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); };
  const drawEye = (side: number) => {
    const es = 0.148 * id.eyeSpacing, rb = 0.06 * id.eyeSize, ez = surfaceZ(id, side * es, 0.0) - rb * 0.72;
    const vis = smooth(0.08, 0.4, facing([side * 0.45, 0.05, 1]));
    if (vis <= 0.01) return;
    const lid = clamp(e.lid ?? 0.85), sq = clamp(e.squint ?? 0), H_up = 0.034 * id.eyeSize * (1 - id.lidHeavy * 0.25) * lid, H_lo = 0.017 * id.eyeSize * (1 - sq * 0.6);
    const n = 22, up: V3[] = [], lo: V3[] = [], ui = -0.064 * id.eyeSize, uo = 0.066 * id.eyeSize, vi = -0.004, vo = 0.006 + 0.004 * id.lidHeavy;
    const onBall = (u: number, v: number) => { const x = side * es + side * u, y = v, dz = Math.sqrt(Math.max(0, rb * rb - u * u * 0.55 - v * v)); return P3(x, y, ez + dz + 0.004); };
    for (let i = 0; i <= n; i++) { const f = i / n, u = lerp(ui, uo, f), base = lerp(vi, vo, f); up.push(onBall(u, base + H_up * Math.sin(Math.PI * Math.pow(f, 0.82)) - 0.004 * (1 - lid))); }
    for (let i = n; i >= 0; i--) { const f = i / n, u = lerp(ui, uo, f), base = lerp(vi, vo, f); lo.push(onBall(u, base - H_lo * Math.sin(Math.PI * Math.pow(f, 1.12)) + sq * 0.006)); }
    ctx.save(); ctx.globalAlpha = alpha * vis;
    const cen = P3(side * es, 0.004, ez + rb);
    path([...up, ...lo], true); ctx.save(); ctx.clip();
    const scl = mix([0.34, 0.31, 0.29], [0.86, 0.83, 0.78], litFace);
    const g = ctx.createRadialGradient(cen[0], cen[1], 0, cen[0], cen[1], S * 0.07);
    g.addColorStop(0, css(scl)); g.addColorStop(1, css(scalec(scl, 0.6)));
    ctx.fillStyle = g; ctx.fillRect(cen[0] - S * 0.1, cen[1] - S * 0.1, S * 0.2, S * 0.2);
    const gx = e.gazeX ?? 0, gy = e.gazeY ?? 0, gd = norm3([gx, gy, 1]), ri = 0.027 * id.eyeSize;
    const c0: V3 = [side * es + gd[0] * rb, gd[1] * rb, ez + gd[2] * rb];
    const t1 = norm3([gd[2], 0, -gd[0]]), t2 = norm3([-gd[0] * gd[1], gd[0] * gd[0] + gd[2] * gd[2], -gd[2] * gd[1]]);
    const circ = (r: number) => Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return P3(c0[0] + (Math.cos(a) * t1[0] + Math.sin(a) * t2[0]) * r, c0[1] + (Math.cos(a) * t1[1] + Math.sin(a) * t2[1]) * r, c0[2] + (Math.cos(a) * t1[2] + Math.sin(a) * t2[2]) * r - 0.002); });
    const ic = P3(c0[0], c0[1], c0[2]), eyeC = hex(id.eyeColor);
    const gi = ctx.createRadialGradient(ic[0], ic[1] + S * ri * 0.3, 0, ic[0], ic[1], S * ri * 1.05);
    gi.addColorStop(0, css(scalec(eyeC, 1.3 * litFace + 0.25))); gi.addColorStop(0.72, css(scalec(eyeC, 0.85 * litFace + 0.15))); gi.addColorStop(1, css(scalec(eyeC, 0.35)));
    ctx.fillStyle = gi; path(circ(ri), true); ctx.fill();
    ctx.fillStyle = "rgba(12,8,6,0.95)"; path(circ(ri * 0.38), true); ctx.fill();
    ctx.fillStyle = "rgba(30,15,10,0.5)"; ctx.beginPath(); up.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = up.length - 1; i >= 0; i--) ctx.lineTo(up[i][0], up[i][1] + S * 0.014); ctx.closePath(); ctx.fill();
    const hl = norm3([o.light.key[0], o.light.key[1], o.light.key[2] + 1.2]);
    const hp = P3(side * es + hl[0] * rb * 0.85, hl[1] * rb * 0.85, ez + Math.abs(hl[2]) * rb);
    ctx.fillStyle = `rgba(255,250,240,${0.5 + 0.4 * litFace})`; ctx.beginPath(); ctx.arc(hp[0], hp[1], Math.max(0.7, S * 0.0045), 0, Math.PI * 2); ctx.fill();
    if ((e.tears ?? 0) > 0) { ctx.fillStyle = `rgba(235,242,255,${0.4 * (e.tears ?? 0)})`; ctx.beginPath(); lo.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = lo.length - 1; i >= 0; i--) ctx.lineTo(lo[i][0], lo[i][1] - S * 0.007); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    const lash = css(mix(hex(id.browColor), [0.05, 0.03, 0.02], 0.6));
    ctx.lineCap = "round";
    for (let i = 0; i < up.length - 1; i++) { const f = i / (up.length - 1); ctx.strokeStyle = lash; ctx.lineWidth = Math.max(0.8, S * 0.0085 * Math.sin(Math.PI * clamp(f * 1.05 + 0.02)) ** 0.6); ctx.beginPath(); ctx.moveTo(up[i][0], up[i][1]); ctx.lineTo(up[i + 1][0], up[i + 1][1]); ctx.stroke(); }
    const crease: V3[] = []; for (let i = 3; i <= n - 2; i++) { const f = i / n, u = lerp(ui, uo, f), base = lerp(vi, vo, f); crease.push(onBall(u * 1.02, base + H_up / Math.max(0.3, lid) * 0.9 + 0.017 * id.eyeSize * (1 - id.lidHeavy * 0.5) + 0.004)); }
    ctx.strokeStyle = css(scalec(skinTone, 0.38), 0.5); ctx.lineWidth = Math.max(0.6, S * 0.0035); path(crease); ctx.stroke();
    ctx.strokeStyle = css(scalec(skinTone, 0.45), 0.55); ctx.lineWidth = Math.max(0.5, S * 0.0025); path(lo.slice(2, -2)); ctx.stroke();
    const ci = up[0]; ctx.fillStyle = "rgba(170,80,70,0.5)"; ctx.beginPath(); ctx.arc(ci[0], ci[1], Math.max(0.6, S * 0.004), 0, Math.PI * 2); ctx.fill();
    if (id.age > 0.25) { const bag: V3[] = []; for (let i = 4; i <= n - 3; i++) { const f = i / n; bag.push(onBall(lerp(ui, uo, f), lerp(vi, vo, f) - H_lo - 0.022 - 0.008 * Math.sin(Math.PI * f))); } ctx.strokeStyle = css(scalec(skinTone, 0.45), 0.35 * id.age); ctx.lineWidth = Math.max(0.5, S * 0.003); path(bag); ctx.stroke(); }
    ctx.restore();
  };
  drawEye(eyes[0].side);
  if (Math.abs(o.pose.yaw) > 0.18) for (const tr of noseTris) if (tr.z > eyes[0].z * S + (o.z ?? 0)) fillTri(tr);
  drawEye(eyes[1].side);

  // ---- brows: hair strokes along the ridge
  const brC = mix(hex(id.browColor), [0.62, 0.6, 0.57], id.hairGray * 0.75);
  for (const side of [-1, 1]) {
    const vis = smooth(0.05, 0.35, facing([side * 0.5, 0.2, 1])); if (vis <= 0.01) continue;
    const rr = rng(id.seed + (side > 0 ? 11 : 13)), NB = Math.round(38 * id.browThick);
    const bi = e.browIn ?? 0, bo = e.browOut ?? 0, kn = e.knit ?? 0;
    const at = (f: number): V3 => {
      const x = side * (lerp(0.052, 0.238, f) - kn * 0.012 * (1 - f)), y = 0.055 + 0.018 * Math.sin(Math.PI * Math.min(1, f * 1.25)) + bi * 0.03 * (1 - f) ** 1.5 + bo * 0.022 * f - kn * 0.014 * (1 - f);
      return [x, y, surfaceZ(id, x, y) + 0.012];
    };
    ctx.save(); ctx.globalAlpha = alpha * vis; ctx.lineCap = "round";
    const sp = Array.from({ length: 16 }, (_, i) => { const p = at(i / 15); return P3(p[0], p[1], p[2]); });
    ctx.strokeStyle = css(brC, 0.3); ctx.lineWidth = S * 0.013 * id.browThick; path(sp.slice(1, -2)); ctx.stroke();
    for (let i = 0; i < NB; i++) {
      const f = rr(); if (id.browScar && side > 0 && f > 0.54 && f < 0.63) continue;
      const p = at(f), ang = lerp(1.25, 0.25, f) + (rr() - 0.5) * 0.4, len = 0.022 * (0.7 + rr() * 0.6) * (1.2 - f * 0.5);
      const a = P3(p[0] - side * Math.cos(ang) * len * 0.3, p[1] - Math.sin(ang) * len * 0.5 + (rr() - 0.5) * 0.012, p[2]), b = P3(p[0] + side * Math.cos(ang) * len * 0.7, p[1] + Math.sin(ang) * len * 0.5, p[2]);
      ctx.strokeStyle = css(scalec(brC, (0.7 + rr() * 0.6) * (0.55 + 0.45 * litFace)), 0.8); ctx.lineWidth = Math.max(0.5, S * 0.0038 * id.browThick); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    if (id.browScar && side > 0) { const p = at(0.585), a = P3(p[0] - 0.006, p[1] + 0.022, p[2]), b = P3(p[0] + 0.004, p[1] - 0.02, p[2]); ctx.strokeStyle = css(mix(skinTone, [1, 0.9, 0.85], 0.3), 0.75); ctx.lineWidth = Math.max(0.6, S * 0.004); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.restore();
  }
  // ---- nostrils
  const under = facing([0, -0.75, 0.66]);
  if (under > -0.1) for (const side of [-1, 1]) {
    const x = side * 0.034 * id.noseWidth, y = -0.222 * id.noseLen, p = P3(x, y, surfaceZ(id, x, y) + 0.005);
    const vis = smooth(-0.1, 0.35, under) * smooth(0.0, 0.3, facing([side * 0.3, -0.5, 0.8]));
    ctx.save(); ctx.globalAlpha = alpha * vis; ctx.fillStyle = "rgba(40,16,10,0.8)"; ctx.beginPath(); ctx.ellipse(p[0], p[1], S * 0.014 * id.noseWidth * Math.max(0.3, Math.cos(o.pose.yaw)), S * 0.0075 * clamp(under + 0.3), side * 0.35 + o.pose.roll, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // ---- wrinkles: a shadow line with light beside it
  const crease = (pts: [number, number][], a: number, w = 0.003) => {
    if (a <= 0.02) return;
    const s3 = pts.map(([x, y]) => P3(x, y, surfaceZ(id, x, y) + 0.003)), vis = smooth(0, 0.3, facing([pts[0][0] * 1.5, 0, 1]));
    ctx.save(); ctx.globalAlpha = alpha * clamp(a) * vis; ctx.lineCap = "round";
    ctx.strokeStyle = css(scalec(skinTone, 0.42 * (0.6 + 0.4 * litFace))); ctx.lineWidth = Math.max(0.5, S * w); path(s3); ctx.stroke();
    ctx.globalAlpha *= 0.45; ctx.strokeStyle = css(mix(skinTone, [1, 0.95, 0.88], 0.3)); ctx.lineWidth = Math.max(0.5, S * w * 0.7); path(s3.map((p) => [p[0], p[1] - S * w * 1.1] as [number, number])); ctx.stroke();
    ctx.restore();
  };
  const age = id.age, bi = Math.max(0, (e.browIn ?? 0) + (e.browOut ?? 0) * 0.6), kn = Math.max(0, e.knit ?? 0);
  if (id.hairline > 0.2) for (let k = 0; k < 3; k++) { const y = 0.15 + k * 0.045; if (y < id.hairline - 0.03) crease([[-0.16, y + 0.004], [-0.06, y - 0.003], [0.06, y - 0.002], [0.16, y + 0.005]], age * 0.55 + bi * 0.45, 0.0028); }
  for (const s of [-1, 1]) crease([[s * 0.012, 0.035], [s * 0.016, 0.075]], kn * 0.6 + age * 0.15, 0.003);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) crease([[s * 0.232, -0.014 + k * 0.012], [s * 0.27, -0.024 + k * 0.024]], age * 0.55 + Math.max(0, smile) * 0.35, 0.0024);
  if (id.beard <= 0 || id.beardLen < 0.3) for (const s of [-1, 1]) crease([[s * 0.07, -0.19], [s * 0.1, -0.24], [s * 0.125, -0.29], [s * 0.13, -0.32]], 0.2 + age * 0.45 + Math.max(0, smile) * 0.3, 0.0035);
  else for (const s of [-1, 1]) crease([[s * 0.07, -0.19], [s * 0.095, -0.225]], 0.25 + age * 0.4 + Math.max(0, smile) * 0.3, 0.0035);
  // ---- mouth
  {
    const mw = 0.122 * id.mouthWidth, yM = -0.318, tr = trem * 0.004 * Math.sin(t * 2.3) * Math.sin(t * 5.1 + 1);
    const cy = smile * 0.018 - (e.frown ?? 0) * 0.016;
    const lineAt = (f: number, dy: number): V3 => { const x = lerp(-mw, mw, f), bow = -0.004 * Math.cos(Math.PI * (f * 2 - 1)) ** 2 * (Math.abs(f - 0.5) < 0.12 ? 0.3 : 1), yy = yM + bow + cy * Math.abs(f * 2 - 1) ** 1.6 + dy + tr * Math.sin(f * 9); return P3(x, yy, surfaceZ(id, x, yy) + 0.004); };
    const vis = smooth(0.05, 0.3, facing([0, -0.2, 1]) + 0.3);
    ctx.save(); ctx.globalAlpha = alpha * vis; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (open > 0.04) {
      const topL = Array.from({ length: 13 }, (_, i) => lineAt(i / 12, open * 0.004 * Math.sin(Math.PI * i / 12)));
      const botL = Array.from({ length: 13 }, (_, i) => lineAt(1 - i / 12, -open * 0.045 * Math.sin(Math.PI * (1 - i / 12))));
      ctx.fillStyle = "rgba(38,14,12,0.92)"; path([...topL, ...botL], true); ctx.fill();
      if (open > 0.25) { ctx.strokeStyle = "rgba(210,196,178,0.5)"; ctx.lineWidth = S * 0.008 * open; path(topL.slice(3, 10).map((p) => [p[0], p[1] + S * 0.006] as [number, number])); ctx.stroke(); }
    }
    const ln = Array.from({ length: 15 }, (_, i) => lineAt(i / 14, 0));
    for (let i = 0; i < ln.length - 1; i++) { const f = i / (ln.length - 1); ctx.strokeStyle = css(mix(scalec(skinTone, 0.28), [0.22, 0.06, 0.05], 0.4), 0.85); ctx.lineWidth = Math.max(0.6, S * 0.0065 * (0.45 + 0.55 * Math.sin(Math.PI * f))); ctx.beginPath(); ctx.moveTo(ln[i][0], ln[i][1]); ctx.lineTo(ln[i + 1][0], ln[i + 1][1]); ctx.stroke(); }
    const ll = Array.from({ length: 9 }, (_, i) => lineAt(0.25 + (i / 8) * 0.5, -0.02 - open * 0.045));
    ctx.strokeStyle = css(mix(skinTone, [1, 0.85, 0.8], 0.4), 0.3 * litFace); ctx.lineWidth = Math.max(0.5, S * 0.005); path(ll); ctx.stroke();
    ctx.restore();
  }
  // ---- hair and beard: short curled strokes over the shells, following the growth
  if (o.strokes !== false && S > 50) {
    const rr = rng(id.seed + 505), hs = m.hairSeeds, len = S * (0.017 + 0.012 * id.hairCurl), step = S > 300 ? 1 : S > 150 ? 2 : 4;
    ctx.save(); ctx.lineCap = "round";
    for (let q = 0; q < hs.length; q += step) {
      const i = hs[q], a1 = rr(), a2 = rr(), a3 = rr();
      if (nzv[i] < 0.02 || (!withNeck && m.neck[i]) || !seen(i, 0.06)) continue;
      const c = scalec(col[i], 0.62 + a1 * 0.75);
      const fl = apply(R, [m.flow[i * 3], m.flow[i * 3 + 1], m.flow[i * 3 + 2]]);
      let dx = fl[0], dy = -fl[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const L = len * (m.bw[i] > 0.5 ? 1.05 : 0.9) * (0.6 + a2 * 0.8) * (id.hairLong > 0 && m.hw[i] > 0.5 ? 1.9 : 1), curl = id.hairCurl * (a3 - 0.5) * 1.6;
      const x0 = sx[i], y0 = sy[i], mx = x0 + dx * L * 0.5 - dy * curl * L * 0.35, my = y0 + dy * L * 0.5 + dx * curl * L * 0.35;
      ctx.strokeStyle = css(c, 0.72); ctx.lineWidth = Math.max(0.6, S * 0.0048 * (0.7 + a1 * 0.6));
      ctx.beginPath(); ctx.moveTo(x0 - dx * L * 0.5, y0 - dy * L * 0.5); ctx.quadraticCurveTo(mx, my, x0 + dx * L * 0.55, y0 + dy * L * 0.55); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  } };
  return { tris, anchors, overlays: [overlay] };
};

// Render parts from several sources together: far to near, painted, overlays at their depth.
// With an env, a character is built in its own layer so the brush marks stay inside its silhouette
// (edges stay found), then optional layer effects (atmospheric haze, a dissolve) and one composite.
export type LayerFx = { blur?: number; haze?: [number, number, number]; hazeAmt?: number; alpha?: number; tint?: [number, number, number]; tintAmt?: number; waterY?: number; reflect?: number; reflectTint?: [number, number, number] };
export const scratch = (env: Env, ctx: CanvasRenderingContext2D) => {
  const W = ctx.canvas.width, H = ctx.canvas.height, key = `figLayer:${W}x${H}`; let L = env.cache.get(key) as { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined;
  if (!L) { const l = env.canvas(W, H); L = { canvas: l.canvas as OffscreenCanvas, ctx: l.ctx }; env.cache.set(key, L); }
  L.ctx.setTransform(ctx.getTransform()); return L;
};
// two reusable scratch buffers per canvas size for blurs (half and third resolution)
const blurBufs = (env: Env, W: number, H: number) => {
  const key = `blurbufs:${W}x${H}`; let b = env.cache.get(key) as { a: { canvas: OffscreenCanvas; ctx: CanvasRenderingContext2D }; b: { canvas: OffscreenCanvas; ctx: CanvasRenderingContext2D } } | undefined;
  if (!b) { const la = env.canvas(Math.ceil(W / 2) + 2, Math.ceil(H / 2) + 2), lb = env.canvas(Math.ceil(W / 1.5) + 2, Math.ceil(H / 1.5) + 2); b = { a: { canvas: la.canvas as OffscreenCanvas, ctx: la.ctx }, b: { canvas: lb.canvas as OffscreenCanvas, ctx: lb.ctx } }; env.cache.set(key, b); }
  return b;
};
// soften a region of a layer in place: down by k (in two steps when k is big), back up with smoothing
const softenRegion = (env: Env, src: CanvasImageSource, g: CanvasRenderingContext2D, W: number, H: number, X0: number, Y0: number, w: number, h: number, k: number) => {
  const { a, b } = blurBufs(env, W, H), put = (c: CanvasRenderingContext2D) => { c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; };
  put(a.ctx); put(b.ctx);
  if (k <= 3) { const sw = Math.max(1, Math.ceil(w / k)), sh = Math.max(1, Math.ceil(h / k)); b.ctx.clearRect(0, 0, sw + 2, sh + 2); b.ctx.drawImage(src, X0, Y0, w, h, 0, 0, sw, sh); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(X0, Y0, w, h); g.imageSmoothingEnabled = true; g.drawImage(b.canvas as CanvasImageSource, 0, 0, sw, sh, X0, Y0, w, h); g.restore(); return; }
  const w2 = Math.max(1, Math.ceil(w / 2)), h2 = Math.max(1, Math.ceil(h / 2)), wk = Math.max(1, Math.ceil(w / k)), hk = Math.max(1, Math.ceil(h / k));
  a.ctx.clearRect(0, 0, w2 + 2, h2 + 2); a.ctx.drawImage(src, X0, Y0, w, h, 0, 0, w2, h2);
  b.ctx.clearRect(0, 0, wk + 2, hk + 2); b.ctx.drawImage(a.canvas as CanvasImageSource, 0, 0, w2, h2, 0, 0, wk, hk);
  a.ctx.clearRect(0, 0, w2 + 2, h2 + 2); a.ctx.drawImage(b.canvas as CanvasImageSource, 0, 0, wk, hk, 0, 0, w2, h2);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(X0, Y0, w, h); g.imageSmoothingEnabled = true; g.drawImage(a.canvas as CanvasImageSource, 0, 0, w2, h2, X0, Y0, w, h); g.restore();
};
export const renderParts = (ctx: CanvasRenderingContext2D, parts: Parts[], o: { seam?: number; cell?: number; tol?: number; paint?: number; env?: Env; fx?: LayerFx; soften?: number } = {}) => {
  const tris = parts.flatMap((p) => p.tris).sort((a, b) => a.z - b.z), anchors = parts.flatMap((p) => p.anchors).sort((a, b) => a.z - b.z), ovs = parts.flatMap((p) => p.overlays).sort((a, b) => a.z - b.z);
  if (!tris.length && !ovs.length) return;
  const grid = new DepthGrid(tris, o.cell ?? 3), seam = o.seam ?? 0.8, tol = o.tol ?? 8, paint = o.paint ?? 0.62;
  const L = o.env ? scratch(o.env, ctx) : null, g = L ? L.ctx : ctx, tr = ctx.getTransform();
  let X0 = 0, Y0 = 0, X1 = 0, Y1 = 0;
  if (L) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    if (!tris.length) { const iv = tr.inverse(); x0 = iv.e; y0 = iv.f; x1 = iv.a * ctx.canvas.width + iv.e; y1 = iv.d * ctx.canvas.height + iv.f; }   // overlays only: the whole frame
    for (const t of tris) { x0 = Math.min(x0, t.ax, t.bx, t.cx); y0 = Math.min(y0, t.ay, t.by, t.cy); x1 = Math.max(x1, t.ax, t.bx, t.cx); y1 = Math.max(y1, t.ay, t.by, t.cy); }
    const pad = 40; X0 = Math.max(0, Math.floor(tr.a * x0 + tr.e - pad)); Y0 = Math.max(0, Math.floor(tr.d * y0 + tr.f - pad)); X1 = Math.min(ctx.canvas.width, Math.ceil(tr.a * x1 + tr.e + pad)); Y1 = Math.min(ctx.canvas.height, Math.ceil(tr.d * y1 + tr.f + pad));
    if (X1 <= X0 || Y1 <= Y0) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(X0, Y0, X1 - X0, Y1 - Y0); g.restore(); g.setTransform(tr);
  }
  let ti = 0, ai = 0, softened = false;
  const upTo = (z: number) => {
    const from = ti; while (ti < tris.length && tris[ti].z < z) ti++;
    fillTris(g, tris.slice(from, ti), seam);
    // close up, soften the facets before the brush marks go on (once, before any overlay is drawn)
    if (L && o.soften && !softened && o.env) { softened = true; softenRegion(o.env, L.canvas as CanvasImageSource, g, ctx.canvas.width, ctx.canvas.height, X0, Y0, X1 - X0, Y1 - Y0, Math.max(2, Math.round(o.soften))); g.setTransform(tr); }
    const a0 = ai; while (ai < anchors.length && anchors[ai].z < z) ai++;
    if (paint > 0) { if (L) g.globalCompositeOperation = "source-atop"; paintAnchors(g, anchors.slice(a0, ai), grid, tol, paint); g.globalCompositeOperation = "source-over"; }
  };
  const prevCtx = drawCtx.ctx; drawCtx.ctx = g;
  for (const ov of ovs) { upTo(ov.z); ov.draw(grid); }
  drawCtx.ctx = prevCtx;
  upTo(Infinity);
  if (L) {
    const fx = o.fx ?? {};
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop";
    if (fx.tint && fx.tintAmt) { g.globalAlpha = fx.tintAmt; g.fillStyle = `rgb(${fx.tint.map((v) => Math.round(v * 255)).join(",")})`; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0); }
    if (fx.haze && fx.hazeAmt) { g.globalAlpha = fx.hazeAmt; g.fillStyle = `rgb(${fx.haze.map((v) => Math.round(v * 255)).join(",")})`; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0); }
    g.restore();
    // depth of field / rack focus: the whole layer softened by scaling down and up
    if (fx.blur && fx.blur > 0.4 && o.env) softenRegion(o.env, L.canvas as CanvasImageSource, g, ctx.canvas.width, ctx.canvas.height, X0, Y0, X1 - X0, Y1 - Y0, Math.max(1.5, fx.blur));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = fx.alpha ?? 1;
    if (fx.waterY === undefined) ctx.drawImage(L.canvas as CanvasImageSource, X0, Y0, X1 - X0, Y1 - Y0, X0, Y0, X1 - X0, Y1 - Y0);
    else {
      // the hull sits IN the water: only what is above the waterline, then its broken reflection below
      const Yw = Math.round(tr.d * fx.waterY + tr.f), top = Math.min(Y1, Yw);
      if (top > Y0) ctx.drawImage(L.canvas as CanvasImageSource, X0, Y0, X1 - X0, top - Y0, X0, Y0, X1 - X0, top - Y0);
      const depth = Math.min(Yw - Y0, Math.round((Y1 - Y0) * 0.8)), strip = Math.max(2, Math.round(3 * tr.a));
      for (let y = 0; y < depth; y += strip) {
        const off = Math.sin(y * 0.21 + (fx.reflect ?? 0) * 3) * (2 + y * 0.06) * tr.a, a = (fx.alpha ?? 1) * 0.4 * (1 - y / depth) ** 0.8;
        ctx.globalAlpha = a; ctx.drawImage(L.canvas as CanvasImageSource, X0, Yw - y - strip, X1 - X0, strip, X0 + off, Yw + y, X1 - X0, strip);
      }
      if (fx.reflectTint) { ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = "source-atop"; }
    }
    ctx.restore();
  }
};
export const drawHead = (ctx: CanvasRenderingContext2D, id: Identity, o: HeadOpts, env?: Env, fx?: LayerFx) => renderParts(ctx, [headParts(env ? scratch(env, ctx).ctx : ctx, id, o)], { seam: Math.max(0.7, o.size / 520), cell: Math.max(2, o.size / 70), tol: 0.035 * o.size, env, fx });

// the screen position of a head-space point, for attaching things (hands near the face, tears)