// BUILD: small tools for making anything in 3D out of rows of points (rings, arcs, tubes), then
// lighting it with the film's light model and projecting it to painted triangles and brush anchors.
import { type V3, type RGB, type M3, clamp, scalec, addc, tone, apply, norm3, dot3, cross3, sub3, add3, mul3 } from "../lib/math";
import type { Light } from "./head";
import type { Tri, Anchor } from "./mesh";
// ---------------------------------------------------------------- cloth + limbs as meshes
export type Builder = { V: V3[]; N: V3[]; C: RGB[]; T: number[]; flow: V3[]; anchor: boolean[]; noCull: boolean[] };
export const newB = (): Builder => ({ V: [], N: [], C: [], T: [], flow: [], anchor: [], noCull: [] });
// a surface from rows of points (each row a ring or an arc); normals from the grid, colour per vertex
export const surface = (B: Builder, rows: V3[][], closed: boolean, color: (r: number, k: number, p: V3) => RGB, o: { flowVertical?: boolean; anchor?: boolean; noCull?: boolean; flip?: boolean } = {}) => {
  const R = rows.length, K = rows[0].length, base = B.V.length;
  const centres = rows.map((row) => mul3(row.reduce((a, q) => add3(a, q), [0, 0, 0] as V3), 1 / row.length));
  for (let r = 0; r < R; r++) for (let k = 0; k < K; k++) {
    const p = rows[r][k], pu = rows[r][closed ? (k + 1) % K : Math.min(K - 1, k + 1)], pd = rows[r][closed ? (k - 1 + K) % K : Math.max(0, k - 1)], qu = rows[Math.min(R - 1, r + 1)][k], qd = rows[Math.max(0, r - 1)][k];
    let n = norm3(cross3(sub3(pu, pd), sub3(qu, qd)));
    if (dot3(n, sub3(p, centres[r])) < 0) n = mul3(n, -1);                                  // always outward
    if (o.flip) n = mul3(n, -1);
    B.V.push(p); B.N.push(n); B.C.push(color(r / Math.max(1, R - 1), k / K, p));
    B.flow.push(o.flowVertical === false ? norm3(sub3(pu, pd)) : norm3(sub3(qu, qd))); B.anchor.push(o.anchor !== false); B.noCull.push(!!o.noCull);
  }
  const KK = closed ? K : K - 1;
  for (let r = 0; r < R - 1; r++) for (let k = 0; k < KK; k++) {
    const a = base + r * K + k, b = base + r * K + ((k + 1) % K), c = a + K, d = b + K;
    B.T.push(a, b, c, b, d, c);
  }
};
export const ring = (c: V3, rx: number, rz: number, n: number, rot = 0, a0 = 0, a1 = Math.PI * 2, wobble?: (a: number) => number): V3[] =>
  Array.from({ length: n }, (_, k) => { const a = a0 + ((a1 - a0) * k) / (a1 - a0 >= Math.PI * 2 - 1e-6 ? n : n - 1), w = wobble ? wobble(a) : 0, x = Math.sin(a) * (rx + w), z = Math.cos(a) * (rz + w); return [c[0] + x * Math.cos(rot) + z * Math.sin(rot), c[1], c[2] - x * Math.sin(rot) + z * Math.cos(rot)] as V3; });
export const tube = (B: Builder, pts: V3[], radii: number[], n: number, color: (t: number) => RGB, cap = false) => {
  const rows: V3[][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], d = norm3(sub3(b, a));
    const ref: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = norm3(cross3(d, ref)), v = norm3(cross3(d, u)), r = radii[i];
    rows.push(Array.from({ length: n }, (_, k) => { const t = (k / n) * Math.PI * 2; return add3(pts[i], add3(mul3(u, Math.cos(t) * r), mul3(v, Math.sin(t) * r))); }));
  }
  if (cap) { const e = pts[pts.length - 1], d = norm3(sub3(e, pts[pts.length - 2])); rows.push(Array.from({ length: n }, () => add3(e, mul3(d, radii[radii.length - 1] * 0.8)))); }
  surface(B, rows, true, (t) => color(t), { flowVertical: true });
};


export type Proj = { x: number; y: number; scale: number; R: M3; z?: number; light: Light; alpha?: number; paint?: number; seed: number; matte?: number };
export const toParts = (B: Builder, o: Proj): { tris: Tri[]; anchors: Anchor[] } => {
  const sc = o.scale, Z = o.z ?? 0, L = o.light, alpha = o.alpha ?? 1, Rb = o.R;
  const proj = B.V.map((v) => { const w = apply(Rb, v); return [o.x + w[0] * sc, o.y - w[1] * sc, w[2] * sc + Z] as V3; });
  const nrm = B.N.map((n) => apply(Rb, n));
  const colV = B.C.map((alb, i) => {
    let n = nrm[i]; const back = n[2] < 0; if (B.noCull[i] && back) n = mul3(n, -1);
    const d = dot3(n, L.key), diff = clamp((d + 0.3) / 1.3);
    let cc: RGB = scalec(L.keyColor, diff * L.keyAmt);
    cc = addc(cc, scalec(L.fill, L.fillAmt * (0.5 + 0.5 * n[1]))); cc = addc(cc, scalec(L.bounce, L.bounceAmt * clamp(0.3 - 0.7 * n[1])));
    let out: RGB = [alb[0] * cc[0], alb[1] * cc[1], alb[2] * cc[2]];
    if (L.rim && L.rimAmt) out = addc(out, scalec(L.rimColor ?? [1, 1, 1], Math.pow(1 - clamp(n[2]), 2.5) * clamp(dot3(n, L.rim) + 0.25) * L.rimAmt * 0.8));
    if (B.noCull[i] && back) out = scalec(out, 0.45);
    return tone(out);
  });
  const tris: Tri[] = [];
  for (let k = 0; k < B.T.length; k += 3) {
    const a = B.T[k], b = B.T[k + 1], cI = B.T[k + 2];
    if (!B.noCull[a] && nrm[a][2] + nrm[b][2] + nrm[cI][2] < -0.35) continue;
    const pa = proj[a], pb = proj[b], pc = proj[cI], ca = colV[a], cb = colV[b], cc = colV[cI];
    tris.push({ ax: pa[0], ay: pa[1], bx: pb[0], by: pb[1], cx: pc[0], cy: pc[1], z: (pa[2] + pb[2] + pc[2]) / 3, col: [(ca[0] + cb[0] + cc[0]) / 3, (ca[1] + cb[1] + cc[1]) / 3, (ca[2] + cb[2] + cc[2]) / 3], alpha });
  }
  const anchors: Anchor[] = [];
  if ((o.paint ?? 1) > 0 && sc > 80) {
    const step = sc > 600 ? 1 : sc > 250 ? 2 : 3, bw = 0.014 * sc, bl = 0.07 * sc;
    for (let i = 0; i < B.V.length; i += step) {
      if (!B.anchor[i] || (nrm[i][2] < 0.1 && !B.noCull[i])) continue;
      const h1 = ((i * 2654435761 + o.seed) >>> 0) / 4294967296, h2 = ((i * 40503 + 977 * o.seed) >>> 0) % 1000 / 1000, h3 = ((i * 69069 + 13) >>> 0) % 1000 / 1000;
      const f = apply(Rb, B.flow[i]); let dx = f[0], dy = -f[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const ang = (h1 - 0.5) * 0.6, ca = Math.cos(ang), sa = Math.sin(ang), ndx = dx * ca - dy * sa, ndy = dx * sa + dy * ca;
      anchors.push({ x: proj[i][0] + (h2 - 0.5) * bl * 0.6 * ndx + (h3 - 0.5) * bw * 2 * -ndy, y: proj[i][1] + (h2 - 0.5) * bl * 0.6 * ndy + (h3 - 0.5) * bw * 2 * ndx, z: proj[i][2], dx: ndx, dy: ndy, len: bl * (0.5 + h3 * 0.8), w: bw * (0.7 + h2 * 0.8), seed: o.seed * 31 + i });
    }
  }
  return { tris, anchors };
};
