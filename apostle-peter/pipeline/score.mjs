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
// sync: beat b must sound at b seconds (60 bpm, no rubato), and each hit must still sit on the picture
// it was written for. The score is written in film seconds; if a replaced narration clip moves a cut
// by more than 0.5 s, this says which hit to re-time in music/pieces/peter.ts.
const perf = M.perform(piece, piece.plan.tempo, { expressive: true });
const SH = Object.fromEntries(JSON.parse(readFileSync(join(ROOT, "story/shots.gen.json"), "utf8")).shots.map((x) => [x.id, x.start / 30]));
const SYNC = { "the look (03.2)": [24, "03.2"], "storm (04.4)": [38, "04.4"], "Εσύ είσαι ο Χριστός (05.4)": [50, "05.4"], "the light (06.3)": [60, "06.3"], "courtyard (07.1)": [64, "07.1"], "three tolls (07.3)": [71, "07.3"], "dawn lake (08.1)": [80, "08.1"], "third question (08.6)": [92, "08.6"], "Pentecost (09.2)": [96, "09.2"], "footsteps (10.5)": [128.55, "10.5"], "peace (11.6)": [142, "11.6"], "feast (12.1)": [144, "12.1"], "σηκωθεί (13.2)": [154, "13.2"], "δυνατοί (13.6)": [164, "13.6"] };
let worst = 0, moved = 0;
for (const [k, [b, id]] of Object.entries(SYNC)) {
  const e = perf.sec(b) - b; worst = Math.max(worst, Math.abs(e)); if (Math.abs(e) > 0.02) console.log(`  sync drift at ${k}: ${(e * 1000).toFixed(0)} ms`);
  const shot = SH[id]; if (shot === undefined) { console.log(`  WARNING: shot ${id} no longer exists`); moved++; continue; }
  const off = id === "13.2" ? 0 : shot - b; if (Math.abs(off) > 0.5) { console.log(`  WARNING: ${k}: the cut is now at ${shot.toFixed(2)} s, the music hits at ${b} s: re-time this hit`); moved++; }
}
console.log(`sync: performer drift ${(worst * 1000).toFixed(1)} ms; ${moved ? `${moved} hit(s) off the picture` : "every hit on its picture"} (${Object.keys(SYNC).length} points)`);
const t0 = Date.now(), out = M.renderPiece(piece, SR, { seconds, stems: process.argv.includes("--stems") });
const lu = M.loudness([out.L, out.R], SR), tp = M.truePeak([out.L, out.R]);
console.log(`render: ${seconds.toFixed(3)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s; ${lu.integrated.toFixed(1)} LUFS, LRA ${lu.lra?.toFixed?.(1) ?? "?"}, TP ${tp.dbtp.toFixed(1)} dBTP, master gain ${out.gainDb.toFixed(1)} dB`);
const file = resolve(ROOT, arg("out", ".tmp/music.wav")); mkdirSync(dirname(file), { recursive: true }); writeWavFloat(file, out.L, out.R, SR);
if (process.argv.includes("--stems")) for (const [id, [l, rr]] of Object.entries(out.stems)) writeWavFloat(file.replace(/\.wav$/, `.${id}.wav`), l, rr, SR);
// loudness per 4 s bar (the dynamic arc, measured)
const bars = []; for (let b = 0; b < Math.ceil(seconds / 4); b++) { const a = b * 4 * SR, e = Math.min(out.L.length, (b + 1) * 4 * SR); let s = 0; for (let i = a; i < e; i++) s += out.L[i] ** 2 + out.R[i] ** 2; bars.push((10 * Math.log10(s / (2 * (e - a)) + 1e-12)).toFixed(0)); }
console.log(`bar RMS dBFS: ${bars.join(" ")}`);
console.log(`-> ${file}`);
