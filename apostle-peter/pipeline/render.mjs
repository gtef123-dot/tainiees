// RENDER. Drives the film page in headless Chromium: N workers, each a CONTIGUOUS run of frames
// (so the painted plates of a shot are built once per worker, not once per frame), each streaming
// into its own ffmpeg; the chunks are joined without re-encoding and the audio mix is muxed on.
//
//   node pipeline/render.mjs --out out/x.mp4 [--scale 0.5] [--workers 4] [--from 0] [--to N] [--audio out/mix.wav] [--crf 16]
//   node pipeline/render.mjs --frames 0,120,2400 --outdir out/frames [--scale 1]      (stills, PNG)
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const { buildPage } = await import(pathToFileURL(join(ROOT, "tools/build-page.mjs")).href);
const { detect } = await import(pathToFileURL(join(ROOT, "tools/detect.mjs")).href);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const film = arg("film", "apostlePeter"), scale = Number(arg("scale", 1)), workers = Number(arg("workers", 4)), crf = arg("crf", "16");
const env = detect(); if (!env.pw.ok || !env.browser.ok) { console.error("no browser:", env.report); process.exit(2); }
const page = await buildPage({ entry: `src/hosts/page-${film}.ts`, out: resolve(`dist/${film}.html`), title: film });
const browser = await env.pw.lib.chromium.launch({ executablePath: env.browser.executablePath, args: ["--disable-background-timer-throttling", "--js-flags=--max-old-space-size=6144"] });
const openPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 }), p = await ctx.newPage(), errors = [];
  p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await p.goto(pathToFileURL(page.out).href + "?adapter=pipeline");
  const meta = await p.evaluate(async (s) => { await window.FILM.ready; return window.FILM.mount(s); }, scale);
  if (errors.length) throw new Error(errors.join("; "));
  return { p, meta, errors };
};
const grab = (p, n, type) => p.evaluate(({ n, type }) => { const r = window.FILM.seek(n); const c = document.getElementById("film"); return { url: type === "png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.96), shot: r.shot, ms: r.ms }; }, { n, type });

const framesArg = arg("frames");
if (framesArg) {
  const list = framesArg.split(",").map(Number), outdir = resolve(arg("outdir", "out/frames")); mkdirSync(outdir, { recursive: true });
  const pages = await Promise.all(Array.from({ length: Math.min(workers, list.length) }, openPage));
  let next = 0;
  await Promise.all(pages.map(async ({ p }) => { while (next < list.length) { const n = list[next++]; const r = await grab(p, n, "png"); writeFileSync(join(outdir, `f${String(n).padStart(5, "0")}.png`), Buffer.from(r.url.split(",")[1], "base64")); console.log(`  frame ${n} (${r.shot}) ${r.ms.toFixed(0)} ms`); } }));
  await browser.close(); process.exit(0);
}

const out = resolve(arg("out", `out/${film}.mp4`)), tmp = resolve(`.tmp/render-${film}-${Date.now()}`); mkdirSync(tmp, { recursive: true }); mkdirSync(dirname(out), { recursive: true });
const first = await openPage(), N = first.meta.durationFrames, from = Number(arg("from", 0)), to = Math.min(N, Number(arg("to", N))), fps = first.meta.fps;
const pages = [first, ...(await Promise.all(Array.from({ length: Math.max(0, workers - 1) }, openPage)))];
const span = to - from, chunk = Math.ceil(span / pages.length), t0 = Date.now();
console.log(`render ${film}: frames ${from}-${to - 1} (${span}), scale ${scale}, ${pages.length} workers, ~${chunk} frames each`);
let done = 0; const cost = [];
const parts = await Promise.all(pages.map(async ({ p }, w) => {
  const a = from + w * chunk, b = Math.min(to, a + chunk); if (a >= b) return null;
  const file = join(tmp, `part${w}.mp4`), ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", crf, "-preset", "medium", file], { stdio: ["pipe", "inherit", "inherit"] });
  const closed = new Promise((res, rej) => ff.on("close", (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())));
  for (let n = a; n < b; n++) {
    const r = await grab(p, n, "jpeg"); cost.push(r.ms);
    if (!ff.stdin.write(Buffer.from(r.url.split(",")[1], "base64"))) await new Promise((res) => ff.stdin.once("drain", res));
    if (++done % 100 === 0) { const el = (Date.now() - t0) / 1000; console.log(`  ${done}/${span} frames, ${(done / el).toFixed(1)} fps, eta ${((span - done) / (done / el) / 60).toFixed(1)} min`); }
  }
  ff.stdin.end(); await closed; return file;
}));
await browser.close();
const list = join(tmp, "list.txt"); writeFileSync(list, parts.filter(Boolean).map((f) => `file '${f}'`).join("\n"));
const video = join(tmp, "video.mp4"); execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", video]);
const audio = arg("audio");
if (audio && existsSync(audio)) execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-ss", String(from / fps), "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", out]);
else execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-c", "copy", "-movflags", "+faststart", out]);
rmSync(tmp, { recursive: true, force: true });
const s = [...cost].sort((x, y) => x - y);
console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${out}\n  draw ms: median ${s[s.length >> 1]?.toFixed(0)}, p95 ${s[Math.floor(s.length * 0.95)]?.toFixed(0)}, max ${s[s.length - 1]?.toFixed(0)}`);
void createRequire;
