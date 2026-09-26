// SHEETS. The review images, laid out as HTML and photographed by the same headless Chromium:
//
//   node pipeline/sheets.mjs storyboard <video.mp4>   -> out/storyboard_full.png   (every clip, 3-9 panels)
//   node pipeline/sheets.mjs contact <video.mp4>      -> out/contact_sheet.png     (one frame per second)
//   node pipeline/sheets.mjs env <dir-of-pngs>        -> out/environment_contact_sheet.png (8 locations)
//
// Frames come from the rendered film itself, so the sheets show what the viewer sees.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { detect } = await import(pathToFileURL(join(ROOT, "tools/detect.mjs")).href);
const [, , mode, src] = process.argv;
const SH = JSON.parse(readFileSync(join(ROOT, "story/shots.gen.json"), "utf8")).shots, NAR = JSON.parse(readFileSync(join(ROOT, "story/narration.json"), "utf8")).clips;
const TL = JSON.parse(readFileSync(join(ROOT, "story/timeline.gen.json"), "utf8"));
const tc = (f) => { const s = f / 30; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`; };
const tmp = join(ROOT, ".tmp/sheets"); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
/** pull exact frame numbers out of a video (one ffmpeg pass), as JPEGs named by frame */
const grab = (video, frames, width) => {
  const expr = frames.map((f) => `eq(n\\,${f})`).join("+");
  execFileSync("ffmpeg", ["-v", "error", "-i", video, "-vf", `select='${expr}',scale=${width}:-2`, "-vsync", "0", "-q:v", "3", join(tmp, "g%04d.jpg")]);
  return frames.map((f, i) => ({ f, file: join(tmp, `g${String(i + 1).padStart(4, "0")}.jpg`) }));
};
const img = (file) => `data:image/${file.endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(file).toString("base64")}`;
const CSS = `body{margin:0;background:#1e1a16;color:#e8dcc6;font-family:"DejaVu Serif",serif;padding:40px}h1{font-weight:normal;font-size:40px;margin:0 0 6px}h1 small{font-size:20px;color:#b09c80}.sub{color:#a89478;font-size:18px;margin-bottom:28px}
.clip{margin:0 0 26px;border-top:1px solid #4a3e32;padding-top:14px}.clip h2{font-weight:normal;font-size:24px;margin:0 0 4px}.clip h2 b{color:#d9a860;font-weight:normal}.gr{font-size:17px;color:#cbb898;margin:0 0 10px;font-style:italic;max-width:2200px}
.row{display:flex;flex-wrap:wrap;gap:12px}.p{width:var(--w);}.p img{width:100%;display:block;border-radius:3px}.p .c{font-size:14px;color:#cbb898;margin-top:4px;line-height:1.3}.p .c b{color:#e8dcc6;font-weight:normal}.p .e{color:#9a8870;font-family:"DejaVu Sans",sans-serif;font-size:12px}`;
const shoot = async (html, out, width) => {
  const env = detect(), browser = await env.pw.lib.chromium.launch({ executablePath: env.browser.executablePath });
  const p = await (await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1 })).newPage();
  const file = join(tmp, "sheet.html"); writeFileSync(file, html); await p.goto(pathToFileURL(file).href); await p.waitForTimeout(300);
  await p.screenshot({ path: out, fullPage: true }); await browser.close(); console.log(`-> ${out}`);
};

if (mode === "storyboard") {
  // one panel per shot at its emotional point; clips with fewer than three shots get extra panels
  const picks = [];
  for (const c of NAR) {
    const shots = SH.filter((s) => s.clip === c.clip), at = shots.length >= 3 ? shots.map((s) => [s, [0.55]]) : shots.map((s, i) => [s, i === 0 ? [0.2, 0.65] : [0.3, 0.8]]);
    for (const [s, us] of at) for (const u of us) picks.push({ s, f: Math.min(s.end, Math.round(s.start + u * (s.frames - 1))) });
  }
  const got = grab(src, picks.map((p) => p.f), 480);
  const body = NAR.map((c) => {
    const tl = TL.clips.find((x) => x.clip === c.clip), ps = picks.map((p, i) => ({ ...p, file: got[i].file })).filter((p) => p.s.clip === c.clip);
    return `<div class="clip"><h2><b>${String(c.clip).padStart(2, "0")}</b> · ${c.title} <span style="color:#8a7a64;font-size:16px">${tc(tl.start.frame)}–${tc(tl.end.frame)}</span></h2><p class="gr">«${c.text}»</p><div class="row" style="--w:${ps.length > 7 ? 300 : 360}px">${ps.map((p) => `<div class="p"><img src="${img(p.file)}"><div class="c"><b>${p.s.id}</b> ${p.s.title} · ${tc(p.f)}<br><span class="e">${p.s.emotion ?? ""}</span></div></div>`).join("")}</div></div>`;
  }).join("");
  await shoot(`<!doctype html><meta charset="utf-8"><style>${CSS}</style><h1>The Apostle Peter <small>storyboard · ${picks.length} panels from the rendered film</small></h1><div class="sub">Read it without sound: fisherman → called → follower → confessor → witness of the light → the fall → the tears → restored → preacher → old man in Rome → martyr → remembered.</div>${body}`, join(ROOT, "out/storyboard_full.png"), 2600);
}

if (mode === "contact") {
  const secs = Math.floor(TL.totalFrames / 30), frames = Array.from({ length: secs }, (_, k) => k * 30 + 15);
  const got = grab(src, frames, 300), clipOf = (f) => SH.find((s) => f >= s.start && f <= s.end);
  const hue = (c) => ["#c9a05a", "#5a8aa8", "#d4b46a", "#a8a060", "#c98a4a", "#e8e0c0", "#3a4a6a", "#d49060", "#e0a040", "#a09080", "#707080", "#d8b070", "#e0c080"][(c - 1) % 13];
  const cells = got.map(({ f, file }) => { const s = clipOf(f); return `<div class="p" style="border-top:5px solid ${hue(s?.clip ?? 1)}"><img src="${img(file)}"><div class="c"><b>${tc(f)}</b> ${s?.id ?? ""}</div></div>`; }).join("");
  await shoot(`<!doctype html><meta charset="utf-8"><style>${CSS}.row{gap:8px}.p .c{font-size:12px}</style><h1>The Apostle Peter <small>contact sheet · one frame per second · ${secs} s</small></h1><div class="sub">Colour bars mark the 13 clips. Check the arc gold → darkness → dawn → fire → stone → gold, Peter's ageing, repeated compositions and pacing.</div><div class="row" style="--w:300px">${cells}</div>`, join(ROOT, "out/contact_sheet.png"), 3900);
}

if (mode === "env") {
  const LOC = [
    ["Lake Gennesaret", "02.3", "morning; the working boats with furled sails, the far shore's hills in the mist"],
    ["A Galilean road", "04.1", "late afternoon wheat, terraced hills, the village above"],
    ["The Mount of Transfiguration", "06.3", "Tabor's dome above the Jezreel plain; the light"],
    ["Jerusalem: the courtyard at night", "07.1", "the high priest's courtyard: ashlar, gallery, braziers, guards"],
    ["The Resurrection shoreline", "08.1", "dawn on the lake; the coal fire on the pebbles"],
    ["Pentecost, Jerusalem", "09.5", "the Temple's southern steps, Herodian ashlar, the crowd"],
    ["Rome", "10.2", "the Via Appia: tombs, umbrella pines, the aqueduct and the city in the haze"],
    ["The place of martyrdom", "11.5", "the Circus of Nero on the Vatican plain, by the obelisk; low sun, very far"],
  ];
  const cells = LOC.map(([name, id, note], i) => { const file = join(src, `env${i + 1}.png`); return existsSync(file) ? `<div class="p"><img src="${img(file)}"><div class="c" style="font-size:18px"><b>${i + 1} · ${name}</b> <span style="color:#8a7a64">(shot ${id})</span><br><span class="e" style="font-size:14px">${note}</span></div></div>` : ""; }).join("");
  await shoot(`<!doctype html><meta charset="utf-8"><style>${CSS}.row{gap:22px}</style><h1>The Apostle Peter <small>environments · 8 locations, finished frames from the film at 1920×1080</small></h1><div class="sub">Each set: foreground, midground, background and air; people, props, architecture and vegetation; one light.</div><div class="row" style="--w:1160px">${cells}</div>`, join(ROOT, "out/environment_contact_sheet.png"), 2440);
}

if (mode === "character") {
  // the engine's sheet (heads, ages, expressions, costume) + Peter as he appears in the film, A to E
  const dir = src, sheet = join(dir, "sheet.png"), CAP = [["A · Simon", "02.2"], ["B · the confession", "05.4"], ["C · the denial", "07.5"], ["C · restored", "08.6"], ["D · the preacher", "09.4"], ["E · Rome, the end", "11.4"]];
  const strip = CAP.map(([name, id], i) => { const f = join(dir, `film${i + 1}.png`); return existsSync(f) ? `<div class="p"><img src="${img(f)}"><div class="c" style="font-size:17px"><b>${name}</b> <span style="color:#8a7a64">shot ${id}</span></div></div>` : ""; }).join("");
  await shoot(`<!doctype html><meta charset="utf-8"><style>${CSS}body{background:#d4c4a6;color:#3a2e24;padding:0}.p .c{color:#3a2e24}.p .c b{color:#3a2e24}.strip{padding:10px 60px 40px}.strip h2{font-weight:normal;font-size:24px;margin:0 0 12px}</style><img src="${img(sheet)}" style="display:block;width:2560px"><div class="strip"><h2>In the film: the same head and body, posed, at every age <span style="font-size:17px;color:#6a5a4a">(frames from the render)</span></h2><div class="row" style="--w:393px">${strip}</div></div>`, join(ROOT, "out/peter_character_sheet.png"), 2560);
}
