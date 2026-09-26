// Float WAV I/O shared by the audio scripts (48 kHz stereo, 32-bit float; no PCM16 clipping on the way).
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
export const writeWavFloat = (path, L, R, sr = 48000) => {
  const n = L.length, data = Buffer.alloc(n * 8), h = Buffer.alloc(44);
  for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
};
/** decode any audio file through ffmpeg to [L, R] float at 48 kHz */
export const readStereo = (path, sr = 48000) => {
  const b = execFileSync("ffmpeg", ["-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", String(sr), "-"], { maxBuffer: 2 ** 31 });
  const f = new Float32Array(b.buffer, b.byteOffset, b.length / 4), n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return [L, R];
};
