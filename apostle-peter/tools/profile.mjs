// PROFILE. Where does a frame's time go? Builds the film page unminified, seeks each frame once to
// warm its plates, then records a CPU profile over repeated seeks and prints self time by function.
//
//   node tools/profile.mjs --frames 3560,3650 [--scale 0.5] [--reps 2] [--top 30]
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT); process.env.NOMIN = "1";
const { buildPage } = await import(pathToFileURL(join(ROOT, "tools/build-page.mjs")).href);
const { detect } = await import(pathToFileURL(join(ROOT, "tools/detect.mjs")).href);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const film = arg("film", "apostlePeter"), scale = Number(arg("scale", 0.5)), reps = Number(arg("reps", 2)), top = Number(arg("top", 30));
const frames = arg("frames", "0").split(",").map(Number);
const env = detect(), page = await buildPage({ entry: `src/hosts/page-${film}.ts`, out: resolve(`dist/prof-${film}.html`), title: film });
const browser = await env.pw.lib.chromium.launch({ executablePath: env.browser.executablePath, args: ["--js-flags=--max-old-space-size=6144"] });
const p = await (await browser.newContext({ viewport: { width: 640, height: 400 } })).newPage();
await p.goto(pathToFileURL(page.out).href + "?adapter=pipeline");
await p.evaluate(async (s) => { await window.FILM.ready; return window.FILM.mount(s); }, scale);
const cdp = await p.context().newCDPSession(p);
await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
for (const f of frames) {
  const warm = await p.evaluate((n) => window.FILM.seek(n).ms, f);
  await cdp.send("Profiler.start");
  const ms = []; for (let k = 0; k < reps; k++) ms.push(await p.evaluate((n) => window.FILM.seek(n + 1 + (window.__k = (window.__k ?? 0) + 1) % 2).ms, f));
  const { profile } = await cdp.send("Profiler.stop");
  const self = new Map(), total = profile.samples.length, byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const counts = new Map(); for (const s of profile.samples) counts.set(s, (counts.get(s) ?? 0) + 1);
  for (const [id, c] of counts) { const n = byId.get(id), cf = n.callFrame, key = `${cf.functionName || "(anon)"}:${cf.lineNumber + 1}`; self.set(key, (self.get(key) ?? 0) + c); }
  // inclusive time per function name: walk each sample's stack
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const incl = new Map(); for (const [id, c] of counts) { const seen = new Set(); for (let x = id; x !== undefined; x = parent.get(x)) { const cf = byId.get(x).callFrame, key = cf.functionName || "(anon)"; if (seen.has(key)) continue; seen.add(key); incl.set(key, (incl.get(key) ?? 0) + c); } }
  console.log(`\nframe ${f}: warm ${warm.toFixed(0)} ms, then ${ms.map((x) => x.toFixed(0)).join(", ")} ms`);
  console.log("  self:", [...self].sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, c]) => `${k} ${((100 * c) / total).toFixed(1)}%`).join(" | "));
  console.log("  inclusive:", [...incl].sort((a, b) => b[1] - a[1]).filter(([k]) => !/^\(|^$/.test(k)).slice(0, top).map(([k, c]) => `${k} ${((100 * c) / total).toFixed(0)}%`).join(" | "));
}
await browser.close();
