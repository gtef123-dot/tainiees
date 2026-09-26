// MIX. The narration is the voice of the film: every clip is placed, untouched, at its exact
// start frame; music and soundscape stems (if present) are ducked under it by the narration's own
// envelope, then the whole is set to about -16 LUFS with the true peak under -1 dBTP.
//
//   node pipeline/mix.mjs [--out out/mix.wav] [--music .tmp/music.wav] [--sfx .tmp/sfx.wav] [--duck 12]
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const SR = 48000, T = JSON.parse(readFileSync(join(ROOT, "story/timeline.gen.json"), "utf8")), N = Math.ceil((T.totalFrames / T.fps) * SR);
const decode = (file, ch) => { const b = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", String(ch), "-ar", String(SR), "-"], { maxBuffer: 2 ** 31 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const voice = new Float32Array(N);
for (const c of T.clips) { const pcm = decode(join(ROOT, c.file), 1), at = Math.round((c.start.frame / T.fps) * SR); for (let i = 0; i < pcm.length && at + i < N; i++) voice[at + i] += pcm[i]; }
// the voice envelope (fast attack, slow release), for ducking
const env = new Float32Array(N); { let e = 0; const att = Math.exp(-1 / (0.01 * SR)), rel = Math.exp(-1 / (0.35 * SR)); for (let i = 0; i < N; i++) { const a = Math.abs(voice[i]); e = a > e ? att * e + (1 - att) * a : rel * e + (1 - rel) * a; env[i] = e; } }
const L = new Float32Array(N), R = new Float32Array(N), duckDb = Number(arg("duck", 12));
const bed = (file, gain) => { if (!file || !existsSync(file)) return; const s = decode(file, 2); for (let i = 0; i < N && i * 2 + 1 < s.length; i++) { const speak = Math.min(1, env[i] * 14), g = gain * Math.pow(10, (-duckDb * speak) / 20); L[i] += s[i * 2] * g; R[i] += s[i * 2 + 1] * g; } };
bed(arg("music"), Number(arg("musicGain", 1))); bed(arg("sfx"), Number(arg("sfxGain", 1)));
for (let i = 0; i < N; i++) { L[i] += voice[i]; R[i] += voice[i]; }
// loudness: measure integrated LUFS with ffmpeg on a temporary file, then one static gain, peak-safe
const tmp = resolve(ROOT, ".tmp"); mkdirSync(tmp, { recursive: true });
const wav = (file, l, r) => { const pcm = Buffer.alloc(N * 8); for (let i = 0; i < N; i++) { pcm.writeFloatLE(l[i], i * 8); pcm.writeFloatLE(r[i], i * 8 + 4); } const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40); writeFileSync(file, Buffer.concat([h, pcm])); };
const probe = join(tmp, "mix-probe.wav"); wav(probe, L, R);
const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", probe, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 2 ** 28 }).stderr ?? "";
const I = Number((log.match(/I:\s+(-?[\d.]+) LUFS/g) ?? []).pop()?.match(/-?[\d.]+/)?.[0] ?? -20), TP = Number((log.match(/Peak:\s+(-?[\d.]+) dBFS/g) ?? []).pop()?.match(/-?[\d.]+/)?.[0] ?? -3);
const target = -16, gainDb = Math.min(target - I, -1 - TP), g = Math.pow(10, gainDb / 20);
for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
const out = resolve(ROOT, arg("out", "out/mix.wav")); mkdirSync(dirname(out), { recursive: true }); wav(out, L, R);
console.log(`mix: ${(N / SR).toFixed(2)} s, narration ${T.clips.length} clips; measured ${I} LUFS, TP ${TP} dBFS; gain ${gainDb.toFixed(2)} dB -> ${out}`);
