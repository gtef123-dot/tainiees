// MIX. The narration is the voice of the film: every clip is placed, untouched, at its exact
// start frame; music and soundscape stems (if present) are ducked under it by the narration's own
// envelope, then the whole is set to about -16 LUFS with the true peak under -1 dBTP.
//
//   node pipeline/mix.mjs [--out out/mix.wav] [--music .tmp/music.wav] [--sfx .tmp/sfx.wav] [--duck 9] [--sfxDuck 5]
//                         [--musicGain 0.6] [--sfxGain 0.4] [--margin 10] [--stems] [--no-level]
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const SR = 48000, T = JSON.parse(readFileSync(join(ROOT, "story/timeline.gen.json"), "utf8")), N = Math.ceil((T.totalFrames / T.fps) * SR);
const decode = (file, ch) => { const b = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", String(ch), "-ar", String(SR), "-"], { maxBuffer: 2 ** 31 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const voice = new Float32Array(N);
// clip levels: ElevenLabs renders each clip at its own loudness (clip 01 is ~4.5 LU quieter). A clip more
// than 1.5 LU from the median gets ONE static gain toward it (clamped to +-6 dB). Volume only: the audio is
// otherwise untouched (no compression, EQ, trims or timing change). --no-level turns it off.
const lufs = (file) => Number(((spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr ?? "").match(/I:\s+(-?[\d.]+) LUFS/g) ?? []).pop()?.match(/-?[\d.]+/)?.[0] ?? NaN);
const clipI = T.clips.map((c) => lufs(join(ROOT, c.file))), med = [...clipI].sort((a, b) => a - b)[Math.floor(clipI.length / 2)];
const clipGain = clipI.map((x) => (process.argv.includes("--no-level") || !Number.isFinite(x) || Math.abs(med - x) <= 1.5 ? 0 : Math.max(-6, Math.min(6, med - x))));
T.clips.forEach((c, k) => { const pcm = decode(join(ROOT, c.file), 1), at = Math.round((c.start.frame / T.fps) * SR), g = Math.pow(10, clipGain[k] / 20); for (let i = 0; i < pcm.length && at + i < N; i++) voice[at + i] += pcm[i] * g; });
const levelled = clipGain.map((g, k) => (g ? `${T.clips[k].clip ?? k + 1}: ${g > 0 ? "+" : ""}${g.toFixed(1)} dB` : "")).filter(Boolean);
// the voice envelope (fast attack, slow release), for ducking
const env = new Float32Array(N); { let e = 0; const att = Math.exp(-1 / (0.01 * SR)), rel = Math.exp(-1 / (0.35 * SR)); for (let i = 0; i < N; i++) { const a = Math.abs(voice[i]); e = a > e ? att * e + (1 - att) * a : rel * e + (1 - rel) * a; env[i] = e; } }
const wavOut = (file, l, r) => { const pcm = Buffer.alloc(N * 8); for (let i = 0; i < N; i++) { pcm.writeFloatLE(l[i], i * 8); pcm.writeFloatLE(r[i], i * 8 + 4); } const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40); writeFileSync(file, Buffer.concat([h, pcm])); };
const L = new Float32Array(N), R = new Float32Array(N), duckDb = Number(arg("duck", 9));
const bed = (file, gain, duck = duckDb) => { if (!file || !existsSync(file)) return; const s = decode(file, 2); for (let i = 0; i < N && i * 2 + 1 < s.length; i++) { const g = gain; void duck; /* no per-word ducking: see the steady duck below */ L[i] += s[i * 2] * g; R[i] += s[i * 2 + 1] * g; } };
bed(arg("music", join(ROOT, ".tmp/music.wav")), Number(arg("musicGain", 0.6))); bed(arg("sfx", join(ROOT, ".tmp/sfx.wav")), Number(arg("sfxGain", 0.4)), Number(arg("sfxDuck", 5)));
// STEADY DUCK. The bed never breathes with the words. Each narration clip gets ONE level for its whole
// length: at least --duck dB, more if the bed's loud moments (95th percentile, 400 ms windows) would
// come within --margin dB of his voice. It is reached by a slow 0.8 s ramp before he speaks; between
// clips closer than 1.5 s the bed glides from one clip's level to the next instead of popping up, and
// it only rises again in the real silences (the head, the long holds, the tail).
{
  const margin = Number(arg("margin", 11)), minDuck = Number(arg("duck", 8)), ramp = Math.round(0.8 * SR), win = Math.round(0.4 * SR);
  const reg = T.clips.map((c) => ({ a: Math.round((c.start.frame / T.fps) * SR), b: Math.min(N, Math.round(((c.end.frame + 1) / T.fps) * SR)) }));
  const rms = (x, y, a, b) => { let e = 0; for (let i = a; i < b; i++) e += x[i] ** 2 + (y ? y[i] ** 2 : x[i] ** 2); return 10 * Math.log10(e / (2 * (b - a)) + 1e-12); };
  const lv = reg.map(({ a, b }) => {
    const vs = [], bs = []; for (let i = a; i + win <= b; i += win >> 1) { const v = rms(voice, null, i, i + win); if (v > -45) { vs.push(v); bs.push(rms(L, R, i, i + win)); } }
    vs.sort((p, q) => p - q); bs.sort((p, q) => p - q);
    return Math.max(minDuck, Math.min(24, (bs[Math.floor(bs.length * 0.95)] ?? -90) - ((vs[vs.length >> 1] ?? -30) - margin)));
  });
  const D = new Float32Array(N), cs = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u)));
  reg.forEach(({ a, b }, k) => {
    const d = lv[k], nx = reg[k + 1], glide = nx && nx.a - b < 1.5 * SR;
    for (let i = Math.max(0, a - ramp); i < a; i++) D[i] = Math.max(D[i], d * cs((i - (a - ramp)) / ramp));
    for (let i = a; i < b; i++) D[i] = Math.max(D[i], d);
    if (glide) for (let i = b; i < nx.a; i++) D[i] = Math.max(D[i], d + (lv[k + 1] - d) * cs((i - b) / (nx.a - b)));
    else for (let i = b; i < Math.min(N, b + 1.2 * SR); i++) D[i] = Math.max(D[i], d * (1 - cs((i - b) / (1.2 * SR))));
  });
  for (let i = 0; i < N; i++) { const x = Math.pow(10, -D[i] / 20); L[i] *= x; R[i] *= x; }
  console.log(`steady duck per clip (dB): ${lv.map((x) => x.toFixed(1)).join(" ")}`);
}
if (process.argv.includes("--stems")) { wavOut(join(ROOT, ".tmp/mix-bed.wav"), L, R); wavOut(join(ROOT, ".tmp/mix-voice.wav"), voice, voice); }
for (let i = 0; i < N; i++) { L[i] += voice[i]; R[i] += voice[i]; }
// loudness: measure integrated LUFS with ffmpeg on a temporary file, then one static gain, peak-safe
const tmp = resolve(ROOT, ".tmp"); mkdirSync(tmp, { recursive: true });
const wav = (file, l, r) => { const pcm = Buffer.alloc(N * 8); for (let i = 0; i < N; i++) { pcm.writeFloatLE(l[i], i * 8); pcm.writeFloatLE(r[i], i * 8 + 4); } const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40); writeFileSync(file, Buffer.concat([h, pcm])); };
const probe = join(tmp, "mix-probe.wav"); wav(probe, L, R);
const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", probe, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 2 ** 28 }).stderr ?? "";
const I = Number((log.match(/I:\s+(-?[\d.]+) LUFS/g) ?? []).pop()?.match(/-?[\d.]+/)?.[0] ?? -20), TP = Number((log.match(/Peak:\s+(-?[\d.]+) dBFS/g) ?? []).pop()?.match(/-?[\d.]+/)?.[0] ?? -3);
// one static gain to -16 LUFS; the few voice transients above the ceiling go through a transparent
// look-ahead limiter on the master bus (5 ms look-ahead, 80 ms release; it touches only those peaks)
const target = -16, gainDb = target - I, g = Math.pow(10, gainDb / 20);
for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
const limit = (ceilDb) => {
  const ceil = Math.pow(10, ceilDb / 20), la = Math.round(0.005 * SR), rel = Math.exp(-1 / (0.08 * SR)), need = new Float32Array(N); let touched = 0;
  for (let i = 0; i < N; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); need[i] = a > ceil ? ceil / a : 1; }
  // running minimum over the look-ahead window (monotone deque)
  const gmin = new Float32Array(N), dq = new Int32Array(N); let h = 0, t = 0;
  for (let i = N - 1; i >= 0; i--) { while (t > h && need[dq[t - 1]] >= need[i]) t--; dq[t++] = i; while (dq[h] > i + la) h++; gmin[i] = need[dq[h]]; }
  let cur = 1; for (let i = 0; i < N; i++) { cur = gmin[i] < cur ? gmin[i] : 1 - (1 - cur) * rel; if (cur > gmin[i]) cur = gmin[i]; if (cur < 0.999) touched++; L[i] *= cur; R[i] *= cur; }
  return touched / SR;
};
const limitedS = limit(-1.6);
const out = resolve(ROOT, arg("out", "out/mix.wav")); mkdirSync(dirname(out), { recursive: true }); wav(out, L, R);
console.log(`mix: ${(N / SR).toFixed(2)} s, narration ${T.clips.length} clips (median ${med} LUFS; levelled ${levelled.join(", ") || "none"}); measured ${I} LUFS, TP ${TP} dBFS; gain ${gainDb.toFixed(2)} dB, limiter active ${limitedS.toFixed(2)} s -> ${out}`);
