// AUDIO. The whole soundtrack in one command: the score, the soundscape, then the mix with the
// narration placed at its frames. Everything is synthesized; the same inputs give the same file.
//
//   node pipeline/audio.mjs [--out .tmp/mix.wav]
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const run = (script, ...a) => execFileSync("node", [join(ROOT, "pipeline", script), ...a], { stdio: "inherit", cwd: ROOT });
run("score.mjs", "--out", ".tmp/music.wav");
run("sfx.mjs", "--out", ".tmp/sfx.wav");
run("mix.mjs", "--out", arg("out", ".tmp/mix.wav"), "--music", ".tmp/music.wav", "--sfx", ".tmp/sfx.wav");
