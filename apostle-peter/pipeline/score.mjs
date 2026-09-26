// SCORE. Renders "The Rock" (src/canvas-core/music/pieces/peter.ts) to a float WAV at the film's
// exact length, after checking the plan and that every sync beat lands on its film second.
//
//   node pipeline/score.mjs [--out .tmp/music.wav] [--stems]
import { build } from "esbuild";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeWavFloat } from "./wav.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const SR = 48000, T = JSON.parse(readFileSync(join(ROOT, "story/timeline.gen.json"), "utf8")), seconds = T.totalFrames / T.fps;
const r = await build({ entryPoints: [join(ROOT, "src/canvas-core/music/index.ts")], bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", logLevel: "error" });
const M = await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"));
const piece = M.peterScore();
const probs = M.planProblems(piece);
console.log(probs.length ? `plan: ${probs.length} note(s)\n  ${probs.join("\n  ")}` : "plan: clean");
// sync: beat b must sound at b seconds (60 bpm, no rubato); the performer's own clock is checked
const perf = M.perform(piece, piece.plan.tempo, { expressive: true });
const SYNC = { "the call (look)": 24, "storm": 38, "Εσύ είσαι ο Χριστός": 50, "the light (Tabor)": 60, "courtyard": 64, "three tolls": 71, "dawn lake": 80, "third question": 92, "Pentecost": 96, "footsteps": 128.55, "peace": 142, "feast": 144, "σηκωθεί lift": 154, "δυνατοί climax": 164 };
let worst = 0; for (const [k, b] of Object.entries(SYNC)) { const e = perf.sec(b) - b; worst = Math.max(worst, Math.abs(e)); if (Math.abs(e) > 0.02) console.log(`  sync drift at ${k}: ${(e * 1000).toFixed(0)} ms`); }
console.log(`sync: worst ${(worst * 1000).toFixed(1)} ms over ${Object.keys(SYNC).length} points`);
const t0 = Date.now(), out = M.renderPiece(piece, SR, { seconds, stems: process.argv.includes("--stems") });
const lu = M.loudness([out.L, out.R], SR), tp = M.truePeak([out.L, out.R]);
console.log(`render: ${seconds.toFixed(3)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s; ${lu.integrated.toFixed(1)} LUFS, LRA ${lu.lra?.toFixed?.(1) ?? "?"}, TP ${tp.dbtp.toFixed(1)} dBTP, master gain ${out.gainDb.toFixed(1)} dB`);
const file = resolve(ROOT, arg("out", ".tmp/music.wav")); mkdirSync(dirname(file), { recursive: true }); writeWavFloat(file, out.L, out.R, SR);
if (process.argv.includes("--stems")) for (const [id, [l, rr]] of Object.entries(out.stems)) writeWavFloat(file.replace(/\.wav$/, `.${id}.wav`), l, rr, SR);
// loudness per 4 s bar (the dynamic arc, measured)
const bars = []; for (let b = 0; b < Math.ceil(seconds / 4); b++) { const a = b * 4 * SR, e = Math.min(out.L.length, (b + 1) * 4 * SR); let s = 0; for (let i = a; i < e; i++) s += out.L[i] ** 2 + out.R[i] ** 2; bars.push((10 * Math.log10(s / (2 * (e - a)) + 1e-12)).toFixed(0)); }
console.log(`bar RMS dBFS: ${bars.join(" ")}`);
console.log(`-> ${file}`);
