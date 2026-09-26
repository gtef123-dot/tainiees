// Small vector, colour and easing helpers shared by every part of the film.
export type V2 = [number, number];
export type V3 = [number, number, number];
export type RGB = [number, number, number]; // 0..1, sRGB

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const ease = (t: number) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;
export const easeIn = (t: number) => clamp(t) ** 3;
export const easeInOut = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
// keyframed number: [[t, v], ...] sorted by t, eased between keys
export const keys = (k: [number, number][], t: number, fn = ease) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], fn((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  return k[k.length - 1][1];
};

export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm3 = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// rotation: pitch about x (positive tips the face down), yaw about y (positive turns the face to the viewer's right), roll about z
export type M3 = number[];
export const rotation = (yaw: number, pitch: number, roll: number): M3 => {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  // R = Rz(roll) * Ry(yaw) * Rx(pitch)
  const rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp], ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy], rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1];
  const m = (a: number[], b: number[]) => { const o = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j]; return o; };
  return m(rz, m(ry, rx));
};
export const rotX = (a: number): M3 => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
export const rotY = (a: number): M3 => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
export const rotZ = (a: number): M3 => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
export const mmul = (a: M3, b: M3): M3 => { const o = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j]; return o; };
// the camera's view: it turns (yaw), then looks down (tilt), then rolls; objects are turned first
export const view = (yaw: number, tilt = 0, roll = 0): M3 => mmul(rotZ(roll), mmul(rotX(tilt), rotY(yaw)));
export const apply = (m: M3, v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

// ---- colour
// a painter masses light into a few planes (shadow, core, halftone, light), with soft turns between them
export const planes = (d: number, n = 4, keep = 0.35) => { const q = clamp(d) * n, b = Math.floor(Math.min(q, n - 1e-6)), f = q - b; const st = (b + (f < 0.4 ? 0 : f > 0.6 ? 1 : (f - 0.4) / 0.2 * ((f - 0.4) / 0.2) * (3 - 2 * ((f - 0.4) / 0.2)))) / n; return st * (1 - keep) + clamp(d) * keep; };
export const hex = (h: string): RGB => { if (h.startsWith("rgb")) { const n = h.replace(/[^\d.,]/g, "").split(",").map(Number); return [n[0] / 255, n[1] / 255, n[2] / 255]; } const s = h.replace("#", ""); const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mulc = (a: RGB, b: RGB): RGB => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
export const scalec = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
export const addc = (a: RGB, b: RGB): RGB => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
export const sat = (c: RGB, k: number): RGB => { const l = lum(c); return [l + (c[0] - l) * k, l + (c[1] - l) * k, l + (c[2] - l) * k]; };
const byte = (v: number) => Math.round(clamp(v) * 255);
export const css = (c: RGB, a = 1) => (a >= 1 ? `rgb(${byte(c[0])},${byte(c[1])},${byte(c[2])})` : `rgba(${byte(c[0])},${byte(c[1])},${byte(c[2])},${clamp(a).toFixed(3)})`);
// gentle filmic shoulder so bright light rolls off instead of clipping
export const tone = (c: RGB): RGB => c.map((v) => (v <= 0.8 ? v : 0.8 + 0.2 * (1 - Math.exp(-(v - 0.8) * 4)))) as RGB;
