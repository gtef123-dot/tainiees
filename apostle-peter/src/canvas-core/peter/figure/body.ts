// THE BODY. A 3D skeleton posed by joint angles or by reach targets, dressed in cloth built
// around it every frame: a tunic (rings round the spine; a skirt that always encloses both legs,
// so it swings when he walks), sleeves, a mantle that hangs from the shoulders, a belt, bare shins,
// sandalled feet and jointed five-finger hands. It renders with the head through the same painter.
import { fractal } from "../../core";
import { type V3, type RGB, type M3, view, clamp, lerp, smooth, hex, mix, scalec, addc, tone, rotation, apply, norm3, dot3, cross3, sub3, add3, mul3 } from "../lib/math";
import { type Identity, type Light, type Expr, type Parts, type LayerFx, headParts, renderParts, scratch } from "./head";
import type { Env } from "../../core";
import { type Builder, newB, surface, ring, tube, toParts } from "./build";

export type Arm = { pronate?: number; raise?: number; out?: number; twist?: number; elbow?: number; wrist?: number; target?: V3; pole?: V3 };
export type Leg = { hip?: number; out?: number; knee?: number; ankle?: number };
export type Hand = { curl?: number; fingers?: [number, number, number, number]; spread?: number; thumb?: number; thumbCurl?: number };
export type BodyPose = {
  root?: V3; lean?: number; bend?: number; side?: number; twist?: number;
  neck?: { yaw?: number; pitch?: number; roll?: number };
  armL?: Arm; armR?: Arm; legL?: Leg; legR?: Leg; handL?: Hand; handR?: Hand;
};
export type Costume = { tunic: string; tunicLen: number; sleeves: "short" | "long"; mantle?: string; mantleLen?: number; hood?: number; belt?: string; sandal?: string; dirt?: number; wet?: number };
export type Figure = { id: Identity; height: number; bulk: number; costume: Costume };
export type Place = { R?: M3; x: number; y: number; scale: number; yaw: number; tilt?: number; z?: number; light: Light; t?: number; expr?: Expr; paint?: number; detail?: number; alpha?: number };

// ---------------------------------------------------------------- skeleton
type Joints = { pelvis: V3; chest: V3; neck: V3; head: M3; shoulderL: V3; shoulderR: V3; elbowL: V3; elbowR: V3; wristL: V3; wristR: V3; handDirL: V3; handDirR: V3; handUpL: V3; handUpR: V3; hipL: V3; hipR: V3; kneeL: V3; kneeR: V3; ankleL: V3; ankleR: V3; toeL: V3; toeR: V3; chestM: M3 };
const rotAxis = (v: V3, axis: V3, a: number): V3 => { const k = norm3(axis), c = Math.cos(a), s = Math.sin(a), d = dot3(k, v), x = cross3(k, v); return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)]; };
const mulM = (a: M3, b: M3): M3 => { const o = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j]; return o; };
export const toEuler = (m: M3) => ({ yaw: Math.asin(clamp(-m[6], -1, 1)), pitch: Math.atan2(m[7], m[8]), roll: Math.atan2(m[3], m[0]) });

export const dims = (f: Figure) => {
  const H = f.height, hh = H / 7.3, b = f.bulk;
  return { H, hh, hipY: H * 0.53, chestUp: H * 0.21, neckUp: H * 0.085, shoulderW: H * 0.1 * (0.93 + 0.07 * b), hipW: H * 0.052, upper: H * 0.172, fore: H * 0.152, hand: H * 0.108, thigh: H * 0.245, shin: H * 0.222, ankleH: H * 0.044, foot: H * 0.14 };
};
const twoBone = (a: V3, target: V3, l1: number, l2: number, pole: V3): V3 => {
  const d = sub3(target, a), dist = clamp(Math.hypot(d[0], d[1], d[2]), 1e-4, (l1 + l2) * 0.999), dn = norm3(d);
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), h = l1 * Math.sqrt(1 - cosA * cosA);
  const pp = sub3(pole, mul3(dn, dot3(pole, dn))), pn = norm3(Math.hypot(pp[0], pp[1], pp[2]) < 1e-6 ? [0, 0, 1] : pp);
  return add3(add3(a, mul3(dn, l1 * cosA)), mul3(pn, h));
};
export const skeleton = (f: Figure, p: BodyPose): Joints => {
  const D = dims(f), root = p.root ?? [0, 0, 0];
  const pelvis: V3 = [root[0], D.hipY + root[1], root[2]];
  const chestM = rotation(p.twist ?? 0, p.bend ?? 0, -(p.side ?? 0));
  const up = apply(chestM, [0, 1, 0]), chest = add3(pelvis, mul3(up, D.chestUp)), neck = add3(chest, mul3(up, D.neckUp));
  const nk = p.neck ?? {}, head = mulM(chestM, rotation(nk.yaw ?? 0, nk.pitch ?? 0, nk.roll ?? 0));
  const shoulder = (side: number) => add3(chest, apply(chestM, [side * D.shoulderW, D.neckUp * 0.2, -0.01]));
  const arm = (side: number, a: Arm = {}) => {
    const s = shoulder(side);
    if (a.target) {
      const pole = a.pole ?? apply(chestM, [side * 0.6, -0.5, -0.6]);
      const e = twoBone(s, a.target, D.upper, D.fore, pole), w = add3(e, mul3(norm3(sub3(a.target, e)), D.fore));
      const hd = norm3(sub3(w, e)), hu = norm3(cross3(hd, apply(chestM, [side, 0, 0])));
      return { s, e, w, hd: rotAxis(hd, cross3(hd, hu), a.wrist ?? 0), hu };
    }
    let dir: V3 = [0, -1, 0], hinge: V3 = [1, 0, 0];
    const rz = side * (a.out ?? 0.08); dir = rotAxis(dir, [0, 0, 1], rz); hinge = rotAxis(hinge, [0, 0, 1], rz);
    dir = rotAxis(dir, [1, 0, 0], -(a.raise ?? 0)); hinge = rotAxis(hinge, [1, 0, 0], -(a.raise ?? 0));
    hinge = rotAxis(hinge, dir, side * (a.twist ?? 0));
    const dirW = apply(chestM, dir), hingeW = apply(chestM, hinge), e = add3(s, mul3(dirW, D.upper));
    const fdir = rotAxis(dirW, hingeW, -(a.elbow ?? 0.15)), w = add3(e, mul3(fdir, D.fore));
    const hd = rotAxis(fdir, hingeW, -(a.wrist ?? 0)), hu0 = mul3(norm3(cross3(hingeW, hd)), -1), hu = rotAxis(hu0, hd, side * (Math.PI / 2 - (a.pronate ?? 0)));
    return { s, e, w, hd, hu };
  };
  const L = arm(1, p.armL), R = arm(-1, p.armR);
  const leg = (side: number, l: Leg = {}) => {
    const hip: V3 = add3(pelvis, [side * D.hipW, -0.03, 0]);
    let dir: V3 = [0, -1, 0]; dir = rotAxis(dir, [0, 0, 1], side * (l.out ?? 0.02)); dir = rotAxis(dir, [1, 0, 0], -(l.hip ?? 0));
    const knee = add3(hip, mul3(dir, D.thigh)), sdir = rotAxis(dir, [1, 0, 0], l.knee ?? 0.02), ankle = add3(knee, mul3(sdir, D.shin));
    const fdir = norm3(rotAxis([0, -0.35, 1], [1, 0, 0], (l.hip ?? 0) - (l.knee ?? 0) + (l.ankle ?? 0))), toe = add3(ankle, mul3(fdir, D.foot));
    return { hip, knee, ankle, toe };
  };
  const lL = leg(1, p.legL), lR = leg(-1, p.legR);
  return { pelvis, chest, neck, head, chestM, shoulderL: L.s, shoulderR: R.s, elbowL: L.e, elbowR: R.e, wristL: L.w, wristR: R.w, handDirL: L.hd, handDirR: R.hd, handUpL: L.hu, handUpR: R.hu, hipL: lL.hip, hipR: lR.hip, kneeL: lL.knee, kneeR: lR.knee, ankleL: lL.ankle, ankleR: lR.ankle, toeL: lL.toe, toeR: lR.toe };
};

// walking: a cycle of placed feet and a counter-swinging torso; phase 0..1 per stride pair
// drop (or lift) the whole body so the lowest foot (or knee, when kneeling) rests on the floor
export const grounded = (f: Figure, p: BodyPose, floor = 0): BodyPose => {
  const J = skeleton(f, { ...p, root: [p.root?.[0] ?? 0, 0, p.root?.[2] ?? 0] }), D = dims(f);
  const low = Math.min(J.ankleL[1] - D.ankleH, J.ankleR[1] - D.ankleH, J.kneeL[1] - 0.05, J.kneeR[1] - 0.05);
  return { ...p, root: [p.root?.[0] ?? 0, floor - low, p.root?.[2] ?? 0] };
};
export const walk = (phase: number, stride = 1, base: BodyPose = {}): BodyPose => {
  const a = phase * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), k = stride;
  const leg = (sgn: number): Leg => { const ss = Math.sin(a + (sgn > 0 ? 0 : Math.PI)); return { hip: 0.38 * k * ss, knee: 0.08 + 0.55 * k * clamp(Math.sin(a + (sgn > 0 ? 0 : Math.PI) - 1.1)) , ankle: 0 }; };
  return { ...base, root: [0, -0.012 * k * Math.abs(c), 0], twist: (base.twist ?? 0) + 0.06 * k * s, side: (base.side ?? 0) + 0.015 * k * c, legL: leg(1), legR: leg(-1),
    armL: base.armL ?? { raise: -0.28 * k * s, elbow: 0.25 + 0.12 * k * (1 - s) * 0.5, out: 0.1 }, armR: base.armR ?? { raise: 0.28 * k * s, elbow: 0.25 + 0.12 * k * (1 + s) * 0.5, out: 0.1 } };
};

// a hand: a rounded palm with the thumb's pad, four fingers and a thumb, each ONE smooth tube through
// its joints (knuckles slightly thicker), nails and knuckle creases in the skin colour
const catmull = (pts: V3[], n: number): V3[] => {
  const out: V3[] = [], at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) {
    const t = k / n, t2 = t * t, t3 = t2 * t, p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as V3);
  }
  out.push(pts[pts.length - 1]); return out;
};
const digit = (B: Builder, joints: V3[], radius: (t: number) => number, flat: V3, skin: RGB, nailFrom: number) => {
  const cl = catmull(joints, 5), n = 10, rows: V3[][] = [], L = cl.length;
  const nail = mix(skin, [0.86, 0.66, 0.6], 0.45), crease = scalec(skin, 0.72);
  const colors: RGB[][] = [];
  for (let i = 0; i < L; i++) {
    const t = i / (L - 1), a = cl[Math.max(0, i - 1)], b = cl[Math.min(L - 1, i + 1)], d = norm3(sub3(b, a));
    const u = norm3(sub3(flat, mul3(d, dot3(flat, d)))), v = norm3(cross3(d, u)), r = radius(t) * (i === L - 1 ? 0.35 : i === L - 2 ? 0.8 : 1);
    rows.push(Array.from({ length: n }, (_, k) => { const q = (k / n) * Math.PI * 2; return add3(cl[i], add3(mul3(u, Math.cos(q) * r * 0.88), mul3(v, Math.sin(q) * r * 1.08))); }));
    colors.push(Array.from({ length: n }, (_, k) => { const q = (k / n) * Math.PI * 2, dorsal = -Math.cos(q); const knuckle = (Math.abs(t - 0.36) < 0.03 || Math.abs(t - 0.68) < 0.025) && dorsal > 0.2; if (t > nailFrom && dorsal > 0.45) return nail; return knuckle ? crease : skin; }));
  }
  const base = B.V.length; surface(B, rows, true, () => skin, { flowVertical: true });
  for (let i = 0; i < L; i++) for (let k = 0; k < n; k++) B.C[base + i * n + k] = colors[i][k];
};
const handMesh = (B: Builder, wrist: V3, dir: V3, upv: V3, side: number, h: Hand, len: number, skin: RGB) => {
  B.curBrush = 0.32;
  const fwd = norm3(dir), nrm = norm3(sub3(upv, mul3(fwd, dot3(upv, fwd)))), lat = mul3(norm3(cross3(nrm, fwd)), side);
  const L = len, palmL = L * 0.47, palmW = L * 0.47, cup = (h.curl ?? 0.38) * 0.5;
  const P = (a: number, b: number, c: number): V3 => add3(wrist, add3(mul3(fwd, a), add3(mul3(lat, b), mul3(nrm, c))));
  // palm: superellipse sections from the wrist to the knuckles; the thumb's pad swells the heel
  const rows: V3[][] = [], pk = 16;
  for (let i = 0; i <= 7; i++) {
    const t = i / 7, w = palmW * lerp(0.7, 0.98, Math.sin(Math.min(1, t * 1.3) * Math.PI / 2)) / 2, th = L * lerp(0.075, 0.058, t);
    rows.push(Array.from({ length: pk }, (_, k) => {
      const a = (k / pk) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), e = 0.6, sx = Math.sign(sa) * Math.abs(sa) ** e, sz = Math.sign(ca) * Math.abs(ca) ** e;
      const thenar = sx > 0 && sz > 0 ? L * 0.025 * Math.sin(Math.PI * Math.min(1, t * 1.6)) * sx : 0;
      return P(palmL * t, sx * w, sz * th * 0.5 + thenar - cup * L * 0.03 * (1 - sx * sx) * (sz > 0 ? 1 : 0));
    }));
  }
  surface(B, rows, true, () => mix(skin, [0.78, 0.5, 0.45], 0.06), { flowVertical: true });
  const cu = h.curl ?? 0.38, curls = h.fingers ?? [cu * 0.85, cu, cu * 1.05, cu * 1.15], spread = h.spread ?? 0.05;
  const segs = [[0.25, 0.155, 0.12], [0.28, 0.17, 0.125], [0.26, 0.165, 0.12], [0.21, 0.13, 0.11]], rad = [0.054, 0.057, 0.053, 0.046];
  for (let f = 0; f < 4; f++) {
    const off = lerp(0.37, -0.37, f / 3) * palmW, ang = lerp(-spread, spread * 1.4, f / 3) * side, drop = [0.02, 0, 0.012, 0.05][f] * L;
    let p = P(palmL - drop, off, 0), d = norm3(rotAxis(fwd, nrm, ang));
    const pts: V3[] = [P(palmL * 0.72, off * 0.92, 0), p];
    const c = curls[f];
    for (let sI = 0; sI < 3; sI++) { d = norm3(rotAxis(d, lat, -side * c * [1.25, 1.45, 1.0][sI])); p = add3(p, mul3(d, L * segs[f][sI] * 1.05)); pts.push(p); }
    digit(B, pts, (t) => L * rad[f] * lerp(1.0, 0.72, t) * (1 + 0.06 * Math.exp(-(((t - 0.36) / 0.05) ** 2))), mul3(nrm, -1), skin, 0.84);
  }
  // thumb: from the heel of the palm, swinging across toward the index as it curls
  const op = h.thumb ?? 0.3, tc = h.thumbCurl ?? 0.25;
  let p = P(palmL * 0.1, palmW * 0.3, L * 0.012), d = norm3(add3(add3(mul3(fwd, 0.62), mul3(lat, 0.72)), mul3(nrm, 0.18 + 0.35 * op)));
  const tp: V3[] = [P(0.02 * L, palmW * 0.12, 0), p];
  for (let sI = 0; sI < 3; sI++) { d = norm3(rotAxis(d, fwd, side * (0.25 + 0.5 * op) * (sI === 0 ? 1 : 0.4))); d = norm3(rotAxis(d, lat, -side * tc * (sI === 0 ? 0.3 : 0.75))); d = norm3(add3(d, mul3(lat, -0.12 * op))); p = add3(p, mul3(d, L * [0.24, 0.18, 0.15][sI])); tp.push(p); }
  digit(B, tp, (t) => L * lerp(0.085, 0.052, t), mul3(nrm, -1), skin, 0.8);
  B.curBrush = 1;
};

// ---------------------------------------------------------------- build + render a figure
export const figureParts = (ctx: CanvasRenderingContext2D, fig: Figure, pose: BodyPose, place: Place): Parts => {
  const J = skeleton(fig, pose), D = dims(fig), c = fig.costume, detail = place.detail ?? (place.scale > 380 ? 2 : place.scale > 120 ? 1 : 0);
  const B = newB(), segs = detail >= 2 ? 30 : detail === 1 ? 22 : 12, dirt = c.dirt ?? 0.3;
  const tunicC = hex(c.tunic), mantC = c.mantle ? hex(c.mantle) : tunicC, beltC = hex(c.belt ?? "#4a3322"), skin = hex(fig.id.skin), sandal = hex(c.sandal ?? "#5a3d27");
  const clothCol = (base: RGB, seed: number) => (_r: number, _k: number, p: V3): RGB => {
    const n = fractal(seed, p[0] * 6, p[1] * 6 + p[2] * 6, 1, 1, 3), fade = smooth(1.1, 1.5, p[1]) * 0.12, grime = smooth(0.7, 0.1, p[1]) * dirt * 0.35;
    return mix(scalec(base, 0.86 + n * 0.28), [0.72, 0.68, 0.6], fade).map((v) => v * (1 - grime)) as RGB;
  };
  const up = apply(J.chestM, [0, 1, 0]), fwd = apply(J.chestM, [0, 0, 1]);
  // torso rings: belt -> chest -> shoulders -> collar
  const beltY = J.pelvis[1] + 0.06, torsoRows: V3[][] = [];
  // the shoulder line: widest across the deltoids at the joints, round over the acromion, then the
  // long trapezius slope up to a neck that stands clear of the collar
  const torsoProfile: [number, number, number][] = [[0, 0.152, 0.116], [0.07, 0.168, 0.126], [0.2, 0.16, 0.118], [0.42, 0.166, 0.124], [0.6, 0.174, 0.126], [0.7, D.shoulderW + 0.025, 0.122], [0.78, D.shoulderW + 0.02, 0.116], [0.84, D.shoulderW - 0.008, 0.106], [0.9, D.shoulderW * 0.78, 0.096], [0.95, D.shoulderW * 0.56, 0.084], [0.985, 0.085, 0.072], [1.0, 0.074, 0.066]];
  const torsoLen = D.chestUp + D.neckUp - 0.05;
  for (const [t, rx, rz] of torsoProfile) { const cpt = add3([J.pelvis[0], beltY, J.pelvis[2]], mul3(up, t * torsoLen)); torsoRows.push(ring(cpt, rx * (0.92 + 0.08 * fig.bulk), rz * (0.92 + 0.08 * fig.bulk), segs, pose.twist ?? 0, 0, Math.PI * 2, (a) => 0.004 * Math.sin(a * 7 + t * 5))); }
  surface(B, torsoRows, true, clothCol(tunicC, 11));
  // skirt: from the belt to the hem, always around both legs
  const legAt = (hip: V3, knee: V3, ankle: V3, y: number): V3 => { if (y >= knee[1]) { const t = clamp((hip[1] - y) / Math.max(1e-3, hip[1] - knee[1])); return add3(hip, mul3(sub3(knee, hip), t)); } const t = clamp((knee[1] - y) / Math.max(1e-3, knee[1] - ankle[1])); return add3(knee, mul3(sub3(ankle, knee), t)); };
  const hemY = c.tunicLen, skirtRows: V3[][] = [];
  for (let i = 0; i <= 9; i++) {
    const t = i / 9, y = lerp(beltY, hemY, t), a = legAt(J.hipL, J.kneeL, J.ankleL, y), b = legAt(J.hipR, J.kneeR, J.ankleR, y), m = mul3(add3(a, b), 0.5);
    const rx = Math.abs(a[0] - b[0]) / 2 + 0.085 + 0.045 * t, rz = Math.max(Math.abs(a[2] - b[2]) / 2 + 0.08, 0.12) + 0.03 * t;
    const drape = ((place.t ?? 0) * 0.7 + t * 3) , folds = (ang: number) => (0.006 + 0.016 * t) * Math.sin(ang * 11 + 1.3 + Math.sin(drape) * 0.3) + 0.005 * t * Math.sin(ang * 5);
    skirtRows.push(ring([m[0], y, m[2]], rx, rz, segs, pose.twist ?? 0, 0, Math.PI * 2, folds));
  }
  surface(B, skirtRows, true, clothCol(tunicC, 12));
  // belt
  surface(B, [ring([J.pelvis[0], beltY + 0.035, J.pelvis[2]], 0.165 * (0.92 + 0.08 * fig.bulk), 0.126, segs), ring([J.pelvis[0], beltY - 0.005, J.pelvis[2]], 0.165 * (0.92 + 0.08 * fig.bulk), 0.126, segs)], true, () => beltC, { anchor: false });
  // arms: sleeve tube, bare forearm, hand
  const Rb0 = place.R ?? view(place.yaw, place.tilt ?? 0, 0);
  for (const side of [1, -1]) {
    const s = side > 0 ? J.shoulderL : J.shoulderR, e = side > 0 ? J.elbowL : J.elbowR, w = side > 0 ? J.wristL : J.wristR;
    // the arm nearer the viewer than the chest is drawn over the torso wall, the farther one under it
    B.curBias = apply(Rb0, sub3(add3(s, e), mul3(J.chest, 2)))[2] > 0 ? 0.05 : -0.05;
    const long = c.sleeves === "long", sEnd = long ? add3(e, mul3(sub3(w, e), 0.88)) : add3(s, mul3(sub3(e, s), 0.72));
    // the sleeve grows out of the shoulder: a narrow cap tucked inside the torso, so its top runs on
    // from the shoulder line instead of standing up off it like a stovepipe; the hem flares a little
    const inward = mul3(norm3(sub3([J.neck[0], s[1], J.neck[2]], s)), 0.045), cap = add3(add3(s, inward), [0, -0.012, 0]);
    const sp = long ? [cap, add3(s, mul3(sub3(e, s), 0.12)), add3(s, mul3(sub3(e, s), 0.5)), e, add3(e, mul3(sub3(sEnd, e), 0.5)), sEnd] : [cap, add3(s, mul3(sub3(e, s), 0.12)), add3(s, mul3(sub3(sEnd, s), 0.55)), add3(s, mul3(sub3(sEnd, s), 0.92)), sEnd];
    const sr = long ? [0.04, 0.056, 0.053, 0.05, 0.05, 0.056] : [0.04, 0.057, 0.059, 0.062, 0.064];
    const sb = B.V.length; tube(B, sp, sr.map((r) => r * (0.9 + 0.1 * fig.bulk)), segs >= 22 ? 14 : 9, () => tunicC);
    const sc = clothCol(tunicC, 13); for (let i = sb; i < B.V.length; i++) B.C[i] = sc(0, 0, B.V[i]);
    const skinStart = long ? sEnd : add3(s, mul3(sub3(e, s), 0.6));
    const ap = long ? [skinStart, w] : [skinStart, e, add3(e, mul3(sub3(w, e), 0.5)), w];
    const ar = long ? [0.03, 0.026] : [0.045, 0.042, 0.037, 0.028];
    tube(B, ap, ar, segs >= 22 ? 12 : 8, () => skin);
    if (detail >= 1) handMesh(B, w, side > 0 ? J.handDirL : J.handDirR, side > 0 ? J.handUpL : J.handUpR, side, (side > 0 ? pose.handL : pose.handR) ?? {}, D.hand, skin);
    else tube(B, [w, add3(w, mul3(side > 0 ? J.handDirL : J.handDirR, D.hand * 0.8))], [0.03, 0.02], 6, () => skin, true);
    B.curBias = 0;
  }
  // legs below the hem, and sandalled feet
  for (const side of [1, -1]) {
    const hp = side > 0 ? J.hipL : J.hipR, k = side > 0 ? J.kneeL : J.kneeR, a = side > 0 ? J.ankleL : J.ankleR, toe = side > 0 ? J.toeL : J.toeR;
    if (hemY > k[1] - 0.02) tube(B, [add3(hp, [0, -0.08, 0]), add3(hp, mul3(sub3(k, hp), 0.55)), k], [0.075, 0.068, 0.052], segs >= 22 ? 12 : 8, () => skin);
    tube(B, [k, add3(k, mul3(sub3(a, k), 0.4)), a], [0.05, 0.047, 0.034], segs >= 22 ? 12 : 8, () => skin);
    const fd0 = sub3(toe, a), fd = norm3([fd0[0], 0, fd0[2]]), fl = norm3(cross3([0, 1, 0], fd)), lift = Math.max(0, a[1] - D.ankleH);
    const heel = add3(a, [fd[0] * -0.05, -a[1] + lift, fd[2] * -0.05]), len = D.foot + 0.05, footRows: V3[][] = [];
    const W = [0.028, 0.03, 0.036, 0.044, 0.047, 0.045, 0.038, 0.02], Hh = [0.05, 0.07, 0.075, 0.06, 0.04, 0.03, 0.022, 0.012];
    for (let i = 0; i < W.length; i++) { const t = i / (W.length - 1), cpt = add3(heel, mul3(fd, len * t)); footRows.push(Array.from({ length: 12 }, (_, q) => { const an = (q / 12) * Math.PI * 2, y = (Math.cos(an) * 0.5 + 0.5) * Hh[i]; return add3(cpt, add3(mul3(fl, Math.sin(an) * W[i]), [0, y + 0.012, 0])); })); }
    surface(B, footRows, true, (r, kk) => ((r > 0.12 && r < 0.3) || (r > 0.52 && r < 0.62 && (kk < 0.35 || kk > 0.65)) ? sandal : skin));
    const soleRows: V3[][] = [0, 1].map((u) => Array.from({ length: 9 }, (_, i) => { const t = i / 8, w = lerp(0.036, 0.052, Math.sin(Math.PI * Math.min(1, t * 1.15))); return add3(add3(heel, mul3(fd, len * lerp(-0.03, 1.02, t))), add3(mul3(fl, (u ? 1 : -1) * w), [0, 0.006, 0])); }));
    surface(B, soleRows, false, () => sandal, { anchor: false, noCull: true, flowVertical: false });
  }
  // mantle: hangs from the shoulders round the back and sides, open at the front, over the head if hooded
  if (c.mantle) {
    const mRows: V3[][] = [], mLen = c.mantleLen ?? 0.35, open = 0.95, hood = c.hood ?? 0;
    const arcN = segs, a0 = open, a1 = Math.PI * 2 - open;
    const levels: [number, number, number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, y = lerp(J.neck[1] - 0.02, mLen, t);
      let rx: number, rz: number, cx = J.pelvis[0], cz = J.pelvis[2];
      if (y > beltY) { const f = clamp((y - beltY) / torsoLen); const sh = smooth(0.65, 0.88, f); rx = lerp(0.2, D.shoulderW + 0.05, sh) - smooth(0.9, 1.0, f) * 0.12; rz = lerp(0.15, 0.135, sh) - smooth(0.92, 1.0, f) * 0.05; const cp = add3([J.pelvis[0], beltY, J.pelvis[2]], mul3(up, f * torsoLen)); cx = cp[0]; cz = cp[2]; }
      else { const a = legAt(J.hipL, J.kneeL, J.ankleL, y), b = legAt(J.hipR, J.kneeR, J.ankleR, y); rx = Math.abs(a[0] - b[0]) / 2 + 0.12 + 0.05 * clamp((beltY - y) / 0.6); rz = Math.max(Math.abs(a[2] - b[2]) / 2 + 0.1, 0.155); cx = (a[0] + b[0]) / 2; cz = (a[2] + b[2]) / 2; }
      // arms push the mantle out where they are
      for (const e of [J.elbowL, J.elbowR]) if (Math.abs(e[1] - y) < 0.12) rx = Math.max(rx, Math.abs(e[0] - cx) + 0.07 * (1 - Math.abs(e[1] - y) / 0.12));
      levels.push([y, rx, rz, 0]); const op = lerp(0.62, open, smooth(0, 0.35, t)); mRows.push(ring([cx, y, cz - 0.012], rx, rz, arcN, pose.twist ?? 0, op, Math.PI * 2 - op, (ang) => (0.006 + 0.022 * t) * Math.sin(ang * 7 + 0.7 + t * 0.8) + 0.01 * t * Math.sin(ang * 3.3) + 0.004 * Math.sin(ang * 17)));
    }
    if (hood > 0) {
      const hc = add3(J.neck, apply(J.head, [0, D.hh * 0.45, -D.hh * 0.05]));
      const hoodRows: V3[][] = [];
      for (let i = 0; i <= 6; i++) { const t = i / 6, y = lerp(J.neck[1] - 0.02, hc[1] + D.hh * 0.62 * hood, t); const r = lerp(0.17, 0.02 + 0.13 * (1 - t), smooth(0.4, 1, t)) + 0.06 * Math.sin(Math.PI * t * 0.9); hoodRows.push(ring([lerp(J.neck[0], hc[0], t), y, lerp(J.neck[2] - 0.02, hc[2] - 0.03, t)], r * 1.05, r, arcN, 0, 1.25, Math.PI * 2 - 1.25)); }
      surface(B, hoodRows.reverse(), false, clothCol(mantC, 21), { noCull: true });
    }
    surface(B, mRows, false, clothCol(mantC, 22), { noCull: true });
    void levels;
  }
  const Rb = place.R ?? view(place.yaw, place.tilt ?? 0, 0), sc = place.scale, Z = place.z ?? 0, L = place.light, alpha = place.alpha ?? 1;
  const { tris, anchors } = toParts(B, { x: place.x, y: place.y, scale: sc, R: Rb, z: Z, light: L, alpha, paint: place.paint ?? 1, seed: fig.id.seed });
  // ---- the head, on the neck, in the same light
  const headM = mulM(Rb, J.head), eul = toEuler(headM), hh = D.hh;
  const hOrigin = apply(Rb, add3(J.neck, apply(J.head, [0, hh * 0.76, hh * 0.05])));
  const head = headParts(ctx, fig.id, { x: place.x + hOrigin[0] * sc, y: place.y - hOrigin[1] * sc, z: hOrigin[2] * sc + Z, size: hh * sc, pose: eul, light: L, expr: place.expr, t: place.t, alpha, strokes: (place.paint ?? 1) > 0 });
  return { tris: [...tris, ...head.tris], anchors: [...anchors, ...head.anchors], overlays: head.overlays };
};

export const drawFigure = (ctx: CanvasRenderingContext2D, fig: Figure, pose: BodyPose, place: Place, env?: Env, fx?: LayerFx) =>
  renderParts(ctx, [figureParts(env ? scratch(env, ctx).ctx : ctx, fig, pose, place)], { seam: Math.max(0.7, place.scale / 700), cell: Math.max(2, place.scale / 120), tol: 0.03 * place.scale, paint: place.paint ?? 0.55, env, fx });
export { mulM };

// where a joint lands in world space (for framing: aim a close-up at a hand, a face)
export const jointWorld = (fig: Figure, pose: BodyPose, which: "head" | "wristL" | "wristR" | "chest" | "pelvis" | "handL" | "handR", yaw: number, tilt = 0): V3 => {
  const J = skeleton(fig, pose), D = dims(fig), Rb = view(yaw, tilt, 0);
  const p = which === "head" ? add3(J.neck, apply(J.head, [0, D.hh * 0.76, D.hh * 0.05])) : which === "handL" ? add3(J.wristL, mul3(J.handDirL, D.hand * 0.45)) : which === "handR" ? add3(J.wristR, mul3(J.handDirR, D.hand * 0.45)) : (J as unknown as Record<string, V3>)[which];
  return apply(Rb, p);
};
// place a figure so that a joint lands on (cx, cy) at a given scale
export const aim = (fig: Figure, pose: BodyPose, which: Parameters<typeof jointWorld>[2], yaw: number, scale: number, cx: number, cy: number, tilt = 0) => { const w = jointWorld(fig, pose, which, yaw, tilt); return { x: cx - w[0] * scale, y: cy + w[1] * scale }; };

// all joints of a posed figure in its own space (metres), for attaching ropes, nets, other hands
export const joints = (fig: Figure, pose: BodyPose) => { const J = skeleton(fig, pose), D = dims(fig); return { ...J, handL: add3(J.wristL, mul3(J.handDirL, D.hand * 0.5)), handR: add3(J.wristR, mul3(J.handDirR, D.hand * 0.5)), headTop: add3(J.neck, apply(J.head, [0, D.hh * 1.25, 0])), face: add3(J.neck, apply(J.head, [0, D.hh * 0.7, D.hh * 0.45])) }; };
