// SOUNDSCAPE. Every sound in the film that is not the voice or the score, synthesized here from
// seeded noise and oscillators (no recordings): the lake, wind, fire, crowds, the storm, splashes,
// footsteps, birds, a rooster in the silence after the third denial. Times are film seconds, read
// against story/shots.gen.json; the result is one float WAV at the film's exact length.
//
//   node pipeline/sfx.mjs [--out .tmp/sfx.wav]
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeWavFloat } from "./wav.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const SR = 48000, TL = JSON.parse(readFileSync(join(ROOT, "story/timeline.gen.json"), "utf8")), DUR = TL.totalFrames / TL.fps, N = Math.ceil(DUR * SR);
const SH = Object.fromEntries(JSON.parse(readFileSync(join(ROOT, "story/shots.gen.json"), "utf8")).shots.map((s) => [s.id, { a: s.start / 30, b: (s.start + s.frames) / 30 }]));
const L = new Float32Array(N), R = new Float32Array(N);
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- tools
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r());
class Biq { // RBJ cookbook biquad
  constructor(type, f, q = 0.707) { this.z1 = 0; this.z2 = 0; this.set(type, f, q); }
  set(type, f, q) { const w = (TAU * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q); let b0, b1, b2, a0, a1, a2;
    if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0; }
  tick(x) { const y = this.b0 * x + this.z1; this.z1 = this.b1 * x - this.a1 * y + this.z2; this.z2 = this.b2 * x - this.a2 * y; return y; }
}
const pink = (r) => { let b0 = 0, b1 = 0, b2 = 0; return () => { const w = r() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; return (b0 + b1 + b2 + w * 0.1848) * 0.2; }; };
const brown = (r) => { let y = 0; return () => { y = 0.985 * y + (r() * 2 - 1) * 0.12; return y; }; };
/** a level curve from regions [a, b, level, fadeIn, fadeOut], summed */
const regions = (list) => (t) => { let g = 0; for (const [a, b, lv, fi = 0.4, fo = 0.4] of list) if (t > a - 1e-9 && t < b) g += lv * Math.min(1, (t - a) / Math.max(1e-3, fi), (b - t) / Math.max(1e-3, fo)); return g; };
const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
const panG = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
/** a continuous bed: gen(t) -> [l, r], only computed where the level is above zero */
const bed = (level, gen) => { for (let i = 0; i < N; i++) { const t = i / SR, g = level(t); if (g <= 0) continue; const [l, r] = gen(t); add(i, l * g, r * g); } };

// a small Schroeder room for distant things (rooster, corridor steps, the crowd's far edge)
const reverb = (x, rt = 1.6, mix = 0.5) => {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ d: Math.round(d * SR / 44100), buf: new Float32Array(Math.round(d * SR / 44100)), i: 0, g: Math.pow(10, (-3 * d / 44100) / rt), lp: 0 }));
  const aps = [225, 556, 441, 341].map((d) => ({ buf: new Float32Array(Math.round(d * SR / 44100)), i: 0 }));
  const out = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) { let s = 0; for (const c of combs) { const y = c.buf[c.i]; c.lp = y * 0.7 + c.lp * 0.3; c.buf[c.i] = x[n] + c.lp * c.g; c.i = (c.i + 1) % c.buf.length; s += y; } s /= combs.length;
    for (const a of aps) { const b = a.buf[a.i]; const y = -s + b; a.buf[a.i] = s + b * 0.5; a.i = (a.i + 1) % a.buf.length; s = y; } out[n] = x[n] * (1 - mix) + s * mix; }
  return out;
};
/** render a short event (mono gen, len seconds) at time t, with pan and optional room */
const event = (t0, len, gen, gain = 1, pan = 0, room = 0) => {
  const n = Math.ceil(len * SR); let buf = new Float32Array(n + (room ? Math.round(1.8 * SR) : 0));
  for (let i = 0; i < n; i++) buf[i] = gen(i / SR);
  if (room) buf = reverb(buf, 1.4 + room, room);
  const [gl, gr] = panG(pan), i0 = Math.round(t0 * SR); for (let i = 0; i < buf.length; i++) add(i0 + i, buf[i] * gain * gl, buf[i] * gain * gr);
};

// ---------------------------------------------------------------- the lake: a low wash and lapping
{
  const level = regions([[0, SH["04.1"].a, 1, 0.1, 1.2], [SH["04.4"].a, SH["04.4"].b, 1.8, 0.05, 0.25], [SH["04.4"].b, SH["04.5"].b, 0.35, 0.3, 0.8],
    [SH["08.1"].a - 0.6, SH["08.3"].a, 0.8, 1.2, 0.8], [SH["08.3"].a, SH["09.1"].a, 0.45, 0.8, 0.6], [SH["09.9"].a, SH["09.9"].b, 0.9, 0.4, 0.5],
    [SH["13.1"].a, SH["13.1"].b, 0.3, 0.5, 0.5], [SH["13.7"].a, DUR, 0.75, 1.2, 1.2]]);
  const r = rng(11), nl = brown(r), nr = brown(r), lpL = new Biq("lp", 420), lpR = new Biq("lp", 420);
  bed(level, () => [lpL.tick(nl()) * 0.55, lpR.tick(nr()) * 0.55]);
  // laps: short swells of band-passed noise at irregular intervals, each side on its own
  const r2 = rng(12), storm = (t) => t >= SH["04.4"].a && t < SH["04.4"].b;
  for (let t = 0.2; t < DUR; ) {
    const g = level(t); if (g > 0) { const len = storm(t) ? 0.5 + r2() * 0.5 : 0.25 + r2() * 0.45, f = storm(t) ? 380 + r2() * 300 : 600 + r2() * 900, pan = r2() * 1.6 - 0.8, rr = rng(1000 + Math.round(t * 100)), bp = new Biq("bp", f, 0.8), bp2 = new Biq("bp", f * 2.2, 1.2);
      event(t, len + 0.1, (x) => { const e = Math.min(1, x / 0.06) * Math.exp(-Math.max(0, x - 0.06) / (len * 0.35)); const w = rr() * 2 - 1; return (bp.tick(w) + 0.4 * bp2.tick(w)) * e * 0.5; }, g, pan); }
    t += storm(t) ? 0.12 + r2() * 0.2 : 0.35 + r2() * 0.9;
  }
}

// ---------------------------------------------------------------- wind (and the wheat)
{
  const level = regions([[0, SH["01.2"].b, 0.22, 0.5, 1], [SH["04.1"].a, SH["04.2"].a, 0.5, 0.4, 0.5], [SH["04.4"].a, SH["04.4"].b, 1.5, 0.05, 0.15],
    [SH["06.1"].a, SH["06.3"].a + 0.5, 0.6, 0.6, 1.2], [SH["06.3"].a, SH["06.3"].b, 0.12, 1, 0.5], [SH["07.1"].a, SH["08.1"].a, 0.14, 0.5, 1],
    [SH["09.2"].a - 0.15, SH["09.3"].a + 0.4, 1.5, 0.3, 1.4], [SH["10.1"].a, SH["10.2"].a, 0.35, 0.6, 0.8], [SH["05.1"].a, SH["06.1"].a, 0.26, 0.6, 0.6], [SH["09.8"].a, SH["09.9"].a, 0.3, 0.5, 0.5], [SH["11.4"].a, SH["11.6"].b, 0.22, 1, 1], [SH["13.7"].a, DUR, 0.18, 1.5, 1.5]]);
  const r = rng(21), pl = pink(r), pr = pink(r), bl = new Biq("bp", 600, 0.9), br = new Biq("bp", 600, 0.9), hl = new Biq("hp", 2500), hr = new Biq("hp", 2500);
  const wheat = (t) => (t >= SH["04.1"].a && t < SH["04.2"].a ? 1 : 0), pent = (t) => (t >= SH["09.2"].a - 0.2 && t < SH["09.3"].a + 0.5 ? 1 : 0);
  let k = 0;
  bed(level, (t) => {
    const gust = 0.55 + 0.25 * Math.sin(TAU * 0.13 * t) + 0.2 * Math.sin(TAU * 0.31 * t + 1.3) + 0.12 * Math.sin(TAU * 0.7 * t + 0.4);
    if ((k++ & 63) === 0) { const f = 380 + 700 * gust + 900 * pent(t); bl.set("bp", f, 0.9); br.set("bp", f * 1.07, 0.9); }
    const a = pl(), b = pr(); let l = bl.tick(a) * gust * 1.6, rr = br.tick(b) * gust * 1.6;
    const rus = wheat(t) * (0.5 + 0.5 * Math.sin(TAU * 0.9 * t) ** 2); l += hl.tick(a) * rus * 0.5; rr += hr.tick(b) * rus * 0.5; // dry stalks rustling
    return [l, rr];
  });
}

// ---------------------------------------------------------------- the storm: rain, thunder
{
  const a = SH["04.4"].a, b = SH["04.4"].b, r = rng(31), hl = new Biq("hp", 3000), hr = new Biq("hp", 3000);
  bed(regions([[a, b, 0.5, 0.05, 0.12]]), () => [hl.tick(r() * 2 - 1) * 0.5, hr.tick(r() * 2 - 1) * 0.5]);
  const rb = rng(32), bn = brown(rb), lp = new Biq("lp", 160), crack = new Biq("hp", 1200);
  event(a + 0.05, 3.2, (x) => { const e = Math.min(1, x / 0.04) * Math.exp(-x / 0.9) * (1 + 0.5 * Math.sin(TAU * 3.1 * x) * Math.exp(-x)); return lp.tick(bn()) * e * 3.2 + crack.tick(rb() * 2 - 1) * Math.exp(-x / 0.08) * 0.5; }, 1, -0.2);
}

// ---------------------------------------------------------------- fire: a low roar and crackles
{
  const level = regions([[SH["07.1"].a, SH["07.2"].a, 0.35, 0.3, 0.3], [SH["07.2"].a, SH["07.3"].a, 0.8, 0.3, 0.3], [SH["07.3"].a, SH["07.4"].a, 0.55, 0.3, 0.15],
    [SH["08.3"].a, SH["09.1"].a, 0.6, 0.5, 0.4], [SH["10.4"].a, SH["10.5"].b, 0.08, 0.5, 0.5]]);
  const r = rng(41), bn = brown(r), lp = new Biq("lp", 300);
  bed(level, (t) => { const fl = 0.7 + 0.3 * Math.sin(TAU * 1.7 * t) * Math.sin(TAU * 0.43 * t); const y = lp.tick(bn()) * fl * 0.8; return [y, y * 0.9]; });
  const rc = rng(42);
  for (let t = SH["07.1"].a; t < DUR; t += 0.03 + rc() * 0.16) { const g = level(t); if (g <= 0) continue; const amp = Math.pow(rc(), 3) * 1.2, len = 0.004 + rc() * 0.02, rr = rng(4200 + Math.round(t * 1000)), hp = new Biq("hp", 1500 + rc() * 3000);
    event(t, len * 4, (x) => hp.tick(rr() * 2 - 1) * Math.exp(-x / len), g * amp, rc() * 0.8 - 0.4); }
}

// ---------------------------------------------------------------- crowds: many murmuring voices
const murmur = (list, seed, voices = 20, far = 0.3) => {
  const level = regions(list), r = rng(seed); let span = [Infinity, -Infinity]; for (const [a, b] of list) { span = [Math.min(span[0], a), Math.max(span[1], b)]; }
  const a0 = Math.max(0, span[0] - 0.1), n = Math.ceil((span[1] - a0 + 0.2) * SR), mono = new Float32Array(n), outL = new Float32Array(n), outR = new Float32Array(n);
  for (let v = 0; v < voices; v++) {
    const rv = rng(seed * 100 + v), f1 = 350 + rv() * 450, f2 = 1100 + rv() * 1300, b1 = new Biq("bp", f1, 3), b2 = new Biq("bp", f2, 4), pitch = 95 + rv() * 140, [gl, gr] = panG(rv() * 1.8 - 0.9), amp = 0.5 + rv();
    let ph = 0, syl = 0, sylLen = 0.18, on = 0, tNext = rv() * 2;
    for (let i = 0; i < n; i++) {
      const t = a0 + i / SR; if (level(t) <= 0) continue;
      if (t >= tNext) { on = rv() < 0.75 ? 1 : 0; sylLen = 0.12 + rv() * 0.22; tNext = t + sylLen; syl = 0; }
      syl += 1 / SR; const e = on * Math.sin(Math.PI * Math.min(1, syl / sylLen)) ** 2;
      ph += (pitch * (1 + 0.08 * Math.sin(TAU * 2.3 * t + v))) / SR; if (ph > 1) ph -= 1;
      const src = (2 * ph - 1) * 0.6 + (rv() * 2 - 1) * 0.4, y = (b1.tick(src) + 0.5 * b2.tick(src)) * e * amp;
      outL[i] += y * gl; outR[i] += y * gr;
    }
  }
  for (let i = 0; i < n; i++) mono[i] = (outL[i] + outR[i]) * 0.5;
  const wet = reverb(mono, 1.8, 1);
  const s = 3.2 / Math.sqrt(voices), i0 = Math.round(a0 * SR);
  for (let i = 0; i < n; i++) { const g = level(a0 + i / SR) * s; add(i0 + i, (outL[i] * (1 - far) + wet[i] * far) * g, (outR[i] * (1 - far) + wet[i] * far) * g); }
};
murmur([[SH["04.2"].a, SH["04.3"].a, 0.35, 0.4, 0.2], [SH["04.3"].a, SH["04.4"].a, 0.85, 0.2, 0.1]], 51, 22, 0.25);
murmur([[SH["07.1"].a, SH["07.4"].a, 0.2, 0.6, 0.1]], 52, 8, 0.45); // servants and guards in the courtyard
murmur([[SH["09.3"].a, SH["09.5"].a, 0.45, 1, 0.4], [SH["09.5"].a, SH["09.6"].a, 0.75, 0.4, 1.2], [SH["09.6"].a, SH["09.7"].a, 0.22, 0.6, 0.4], [SH["09.7"].a, SH["09.8"].a, 0.18, 0.4, 0.8]], 53, 28, 0.35);
murmur([[SH["10.2"].a, SH["10.4"].a, 0.3, 1.2, 1]], 54, 18, 0.6); // the city

// ---------------------------------------------------------------- water events: the net, the jump, wading, drips
const splash = (t, size, gain, pan = 0, seed = 1) => {
  const r = rng(seed), bp = new Biq("bp", 1400 / Math.sqrt(size), 0.7), hp = new Biq("hp", 2500), len = 0.15 + 0.45 * size;
  event(t, len + 0.3, (x) => { const e = Math.min(1, x / 0.004) * Math.exp(-x / (len * 0.4)), w = r() * 2 - 1; const plop = Math.sin(TAU * (260 - 120 * Math.min(1, x / 0.08)) * x) * Math.exp(-x / 0.05) * 0.6; return bp.tick(w) * e * 1.4 + hp.tick(w) * e * 0.5 * Math.exp(-x / 0.06) + plop * (size < 0.5 ? 1 : 0.3); }, gain, pan);
};
{
  // 02.1: the net swishes out, then its weights strike the water in a ring
  const a = SH["02.1"].a, rel = a + 0.72, hit = rel + 1.05, r = rng(61), bp = new Biq("bp", 500, 1.2); let k = 0;
  event(rel, 0.9, (x) => { if ((k++ & 31) === 0) bp.set("bp", 500 + 1500 * Math.min(1, x / 0.6), 1.2); return bp.tick(r() * 2 - 1) * Math.sin(Math.PI * Math.min(1, x / 0.9)) * 1.1; }, 0.8, 0.3);
  for (let i = 0; i < 14; i++) splash(hit + (i % 3) * 0.02 + r() * 0.03, 0.18, 0.35, 0.2 + r() * 0.5, 610 + i);
  // 01.1 and 02.4: the rope and the net drip
  for (const [s, e, g] of [[0.1, SH["01.1"].b, 0.18], [SH["02.4"].a, SH["02.5"].a, 0.2]]) for (let t = s; t < e; t += 0.06 + r() * 0.2) splash(t, 0.05, g * (0.4 + r()), r() * 0.8 - 0.4, 620 + Math.round(t * 100));
  // 02.5: he jumps into the shallows; then wading
  const jump = SH["02.5"].a + 0.58 * (47 - 1) / 30; splash(jump, 1.2, 1.0, 0.1, 630);
  for (let t = jump + 0.45; t < SH["02.6"].a + 0.8; t += 0.42 + r() * 0.1) splash(t, 0.5, 0.35, 0, 631 + Math.round(t * 10));
  // 08.2: he comes wading hard out of the sun
  for (let t = SH["08.2"].a + 0.1; t < SH["08.2"].b; t += 0.36 + r() * 0.06) splash(t, 0.6, 0.5 + 0.3 * ((t - SH["08.2"].a) / 1.8), r() * 0.3 - 0.15, 640 + Math.round(t * 10));
  // 04.4: spray bursts over the gunwale
  for (let t = SH["04.4"].a + 0.2; t < SH["04.4"].b - 0.1; t += 0.35 + r() * 0.2) splash(t, 0.9, 0.55, r() - 0.5, 650 + Math.round(t * 10));
}

// ---------------------------------------------------------------- footsteps
const step = (t, gain, hob = 0, pan = 0, room = 0, seed = 1) => {
  const r = rng(seed), hp = new Biq("hp", 1800), bp = new Biq("bp", 3200, 6);
  event(t, 0.25, (x) => { const thud = Math.sin(TAU * (70 + 50 * Math.exp(-x / 0.02)) * x) * Math.exp(-x / 0.05) * 0.9, grit = hp.tick(r() * 2 - 1) * Math.exp(-x / 0.025) * 0.5, nail = bp.tick(r() * 2 - 1) * Math.exp(-x / 0.03) * hob * 2.5; return thud + grit + nail; }, gain, pan, room);
};
{
  const r = rng(71);
  for (let t = SH["05.1"].a + 0.2; t < SH["05.1"].b; t += 0.44 + r() * 0.04) step(t, 0.18, 0, 0, 0, 710 + Math.round(t * 10)); // eager on the path
  for (let t = SH["10.1"].a + 0.3; t < SH["10.1"].b; t += 0.62 + r() * 0.05) step(t, 0.12, 0, 0, 0, 720 + Math.round(t * 10)); // the old man on the road
  // 10.5: hobnailed boots in the street, two men, coming closer; they stop at the door
  for (let t = SH["10.5"].a + 0.02, k = 0; t < SH["10.5"].a + 2.45; t += 0.5, k++) { const g = 0.12 + 0.3 * (k / 5); step(t, g, 1, -0.3, 0.35, 730 + k); step(t + 0.23, g * 0.85, 1, 0.1, 0.35, 750 + k); }
  // 11.3: led down the corridor
  for (let t = SH["11.3"].a + 0.1, k = 0; t < SH["11.3"].b; t += 0.55, k++) { step(t, 0.16, 0.6, -0.2, 0.6, 760 + k); step(t + 0.27, 0.12, 0.3, 0.2, 0.6, 780 + k); }
}

// ---------------------------------------------------------------- the rooster (07.4, Luke 22:60), far off
{
  const t0 = SH["07.4"].a + 0.35, r = rng(81);
  // cock-a-doodle-doo: three short rising syllables, then the long falling call
  const SYL = [[0, 0.13, 620, 780], [0.17, 0.3, 780, 900], [0.34, 0.5, 900, 1020], [0.56, 1.35, 1060, 760]];
  const f1 = new Biq("bp", 1300, 2), f2 = new Biq("bp", 2600, 3), f3 = new Biq("bp", 700, 2); let ph = 0;
  event(t0, 1.5, (x) => {
    const s = SYL.find(([a, b]) => x >= a && x < b); if (!s) return 0;
    const u = (x - s[0]) / (s[1] - s[0]), f = s[2] + (s[3] - s[2]) * (s === SYL[3] ? Math.sin(u * Math.PI / 2) ** 0.6 : u), e = Math.sin(Math.PI * u) ** 0.5 * (s === SYL[3] ? 1 - 0.4 * u : 0.8);
    ph += (f * (1 + 0.012 * Math.sin(TAU * 38 * x))) / SR; if (ph > 1) ph -= 1;
    const saw = 2 * ph - 1, rough = 1 + 0.35 * Math.sin(TAU * 72 * x), src = saw * rough + (r() * 2 - 1) * 0.15;
    return (f1.tick(src) + 0.7 * f2.tick(src) + 0.5 * f3.tick(src)) * e;
  }, 0.32, 0.55, 0.8);
}

// ---------------------------------------------------------------- birds at dawn and in the morning
{
  const r = rng(91);
  for (const [a, b, rate] of [[SH["08.1"].a, SH["08.3"].a, 0.7], [SH["01.1"].a + 0.5, SH["02.1"].a, 0.35], [SH["13.7"].a, DUR - 1, 0.6]]) {
    for (let t = a; t < b; t += (1 + r() * 2.5) / rate) {
      const n = 2 + Math.floor(r() * 3), f0 = 2800 + r() * 1800, dir = r() < 0.5 ? 1 : -1, pan = r() * 1.6 - 0.8, gain = 0.05 + r() * 0.05;
      for (let k = 0; k < n; k++) { let ph = 0; const len = 0.05 + r() * 0.06; event(t + k * (len + 0.04), len, (x) => { const u = x / len, f = f0 * (1 + dir * 0.25 * u) * (1 + 0.04 * Math.sin(TAU * 60 * x)); ph += f / SR; return Math.sin(TAU * ph) * Math.sin(Math.PI * u); }, gain, pan, 0.4); }
    }
  }
}

// ---------------------------------------------------------------- room tone for the interiors
{
  const r = rng(101), bn = brown(r), lp = new Biq("lp", 200);
  bed(regions([[SH["09.1"].a, SH["09.3"].a, 0.12, 0.3, 0.4], [SH["10.4"].a, SH["11.1"].b, 0.15, 0.5, 0.5], [SH["11.3"].a, SH["11.4"].a, 0.15, 0.3, 0.3], [SH["12.1"].a, SH["12.2"].b, 0.08, 1, 1]]), () => { const y = lp.tick(bn()); return [y, y]; });
}

// ---------------------------------------------------------------- level, and write
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.7 / peak; for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
const out = resolve(ROOT, arg("out", ".tmp/sfx.wav")); mkdirSync(dirname(out), { recursive: true }); writeWavFloat(out, L, R, SR);
console.log(`sfx: ${DUR.toFixed(3)} s, peak normalised by ${(20 * Math.log10(g)).toFixed(1)} dB -> ${out}`);
