// TIMING. The voice decides the film's clock. Measures every narration clip to the sample, finds
// the pauses inside it, aligns each word of the locked text to the audio, then lays the clips on
// one frame grid with the authored breathing room between them.
//
//   node pipeline/timing.mjs            -> story/timeline.gen.json + docs/audio_timing.md
//
// Replace any clip in audio/narration/ and re-run: every frame range, word anchor and shot after
// it moves with it. Deterministic: same audio in, same numbers out.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, "story/timeline.config.json"), "utf8"));
const { clips } = JSON.parse(readFileSync(join(ROOT, "story/narration.json"), "utf8"));
const FPS = cfg.fps;

// ---------- audio measurement ----------
const probeRate = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", file]).toString().trim());
const decode = (file) => { const b = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-"], { maxBuffer: 1 << 30 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };

const findPauses = (pcm, sr) => {
  const win = Math.round(sr * cfg.pause.windowMs / 1000), n = Math.floor(pcm.length / win), thr = Math.pow(10, cfg.pause.thresholdDb / 20);
  const quiet = [];
  for (let i = 0; i < n; i++) { let e = 0; for (let k = i * win; k < (i + 1) * win; k++) e += pcm[k] * pcm[k]; quiet.push(Math.sqrt(e / win) < thr); }
  const runs = [];
  for (let i = 0; i < n;) { if (!quiet[i]) { i++; continue; } let j = i; while (j < n && quiet[j]) j++; runs.push([i * win / sr, (j === n ? pcm.length : j * win) / sr]); i = j; }
  const merged = [];
  for (const r of runs) { const last = merged[merged.length - 1]; if (last && r[0] - last[1] < cfg.pause.mergeMs / 1000) last[1] = r[1]; else merged.push([...r]); }
  return merged.filter((r) => r[1] - r[0] >= cfg.pause.minMs / 1000 || r[0] === 0 || r[1] >= pcm.length / sr - 1e-9);
};

// ---------- the text ----------
const NUMBERS = { "29": 6 }; // "είκοσι εννέα"
const VOWELS = new Set("αεηιουω"), DIGRAPHS = new Set(["αι", "ει", "οι", "υι", "ου", "αυ", "ευ", "ηυ"]);
const syllables = (word) => {
  if (/^\d+$/.test(word)) return NUMBERS[word] ?? word.length * 2;
  const chars = [];
  for (const ch of word.toLowerCase().normalize("NFD")) { if (/\p{M}/u.test(ch)) { if (ch === "̈" && chars.length) chars[chars.length - 1].dia = true; continue; } chars.push({ c: ch, dia: false }); }
  let n = 0;
  for (let i = 0; i < chars.length; i++) { if (!VOWELS.has(chars[i].c)) continue; n++; const nx = chars[i + 1]; if (nx && VOWELS.has(nx.c) && !nx.dia && DIGRAPHS.has(chars[i].c + nx.c)) i++; }
  return Math.max(1, n);
};
const tokenize = (text) => text.split(/\s+/).filter(Boolean).map((raw) => {
  const w = raw.replace(/^[«"(]+/, "").replace(/[,.;:·!»")]+$/, "");
  const tail = raw.slice(raw.indexOf(w) + w.length);
  return { raw, w, syl: syllables(w), punct: /[,.;:·!]/.test(tail) };
});

// ---------- word alignment: pauses sit between words ----------
const align = (words, pauses, speech) => {
  const S = words.reduce((a, x) => a + x.syl, 0), C = [0];
  for (const x of words) C.push(C[C.length - 1] + x.syl);
  // syllable position -> time over voiced time only, inside [tA, tB], skipping the given pauses
  const mapVoiced = (c, a, b, gaps) => {
    const inside = gaps.filter((p) => p[0] > a.t && p[1] < b.t), voiced = [];
    let t = a.t; for (const p of inside) { voiced.push([t, p[0]]); t = p[1]; } voiced.push([t, b.t]);
    const V = voiced.reduce((s, v) => s + v[1] - v[0], 0);
    let need = (b.c === a.c ? 0 : (c - a.c) / (b.c - a.c)) * V;
    for (const v of voiced) { const len = v[1] - v[0]; if (need <= len + 1e-12) return v[0] + need; need -= len; }
    return b.t;
  };
  const start = { t: speech[0], c: 0 }, end = { t: speech[1], c: S };
  const est = C.map((c) => mapVoiced(c, start, end, pauses));
  // monotonic DP: each internal pause either matches one word boundary (1..N-1) or is skipped
  const J = words.length - 1, K = pauses.length, SKIP_PUNCT = 0.25;
  // a short dip may be a stop consonant; a long silence is always a gap between words
  const SKIP_PAUSE = (p) => 0.3 + Math.max(0, p[1] - p[0] - 0.3) * 1.5;
  const dist = (j, p) => { const e = est[j]; return e < p[0] ? p[0] - e : e > p[1] ? e - p[1] : 0; };
  const cost = Array.from({ length: K + 1 }, () => new Array(J + 1).fill(Infinity)), back = Array.from({ length: K + 1 }, () => new Array(J + 1).fill(null));
  cost[0][0] = 0;
  for (let j = 1; j <= J; j++) cost[0][j] = cost[0][j - 1] + (words[j - 1].punct ? SKIP_PUNCT : 0), back[0][j] = "b";
  for (let k = 1; k <= K; k++) {
    cost[k][0] = cost[k - 1][0] + SKIP_PAUSE(pauses[k - 1]); back[k][0] = "p";
    for (let j = 1; j <= J; j++) {
      // a long pause (a sentence end, a colon before a quote) belongs at punctuation
      const len = pauses[k - 1][1] - pauses[k - 1][0], longAtBareWord = words[j - 1].punct ? 0 : Math.max(0, len - 0.45) * 1.2;
      const m = cost[k - 1][j - 1] + dist(j, pauses[k - 1]) - (words[j - 1].punct ? SKIP_PUNCT : 0) + longAtBareWord;
      const sp = cost[k - 1][j] + SKIP_PAUSE(pauses[k - 1]), sb = cost[k][j - 1] + (words[j - 1].punct ? SKIP_PUNCT : 0);
      const best = Math.min(m, sp, sb); cost[k][j] = best; back[k][j] = best === m ? "m" : best === sp ? "p" : "b";
    }
  }
  const matched = new Map(); // boundary j -> pause
  for (let k = K, j = J; k > 0 || j > 0;) { const s = back[k][j]; if (s === "m") { matched.set(j, pauses[k - 1]); k--; j--; } else if (s === "p") k--; else j--; }
  // hard anchors, then voiced interpolation between them
  const anchors = [start];
  for (let j = 1; j <= J; j++) if (matched.has(j)) { const p = matched.get(j); anchors.push({ t: p[0], c: C[j], edge: "end" }, { t: p[1], c: C[j], edge: "start" }); }
  anchors.push(end);
  const unmatched = pauses.filter((p) => ![...matched.values()].includes(p));
  const at = (c, side) => {
    for (const a of anchors) if (a.c === c && a.edge === side) return a.t;
    let i = 0; while (i < anchors.length - 2 && anchors[i + 1].c <= c && !(anchors[i + 1].c === c && side === "end")) i++;
    return mapVoiced(c, anchors[i], anchors[i + 1], unmatched);
  };
  return { words: words.map((x, i) => ({ w: x.w, raw: x.raw, syl: x.syl, t0: at(C[i], "start"), t1: at(C[i + 1], "end"), pauseAfter: matched.has(i + 1) ? matched.get(i + 1)[1] - matched.get(i + 1)[0] : 0 })), matchedPauses: matched.size, unmatchedPauses: unmatched.length };
};

// ---------- lay the clips on one frame grid ----------
const r3 = (x) => Math.round(x * 1000) / 1000;
const ts = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${String(m).padStart(2, "0")}:${r.toFixed(3).padStart(6, "0")}`; };
let cursor = cfg.headFrames;
const out = [];
for (const c of clips) {
  const file = join(ROOT, c.file), sr = probeRate(file), pcm = decode(file), duration = pcm.length / sr;
  const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
  const all = findPauses(pcm, sr);
  const lead = all.length && all[0][0] === 0 ? all[0] : [0, 0], trail = all.length && all[all.length - 1][1] >= duration - 1e-9 ? all[all.length - 1] : [duration, duration];
  const internal = all.filter((p) => p !== lead && p !== trail);
  const speech = [lead[1], trail[0]];
  const { words, matchedPauses, unmatchedPauses } = align(tokenize(c.text), internal, speech);
  const length = Math.ceil(duration * FPS - 1e-9), start = cursor, gap = cfg.gapAfter[String(c.clip)]?.frames ?? 0;
  const F = (t) => start + Math.round(t * FPS);
  const phrases = []; let cur = [];
  words.forEach((w, i) => { cur.push(w); if (/[,.;:·!]/.test(w.raw.slice(w.raw.indexOf(w.w) + w.w.length)) || i === words.length - 1) { phrases.push(cur); cur = []; } });
  out.push({
    clip: c.clip, title: c.title, file: c.file, sha256, sampleRate: sr, samples: pcm.length, duration: r3(duration),
    start: { frame: start, seconds: r3(start / FPS) }, end: { frame: start + length, seconds: r3(start / FPS + duration) },
    lengthFrames: length, gapAfterFrames: gap, speech: { start: r3(speech[0]), end: r3(speech[1]) },
    pauses: internal.map((p) => [r3(p[0]), r3(p[1])]), alignment: { matchedPauses, unmatchedPauses },
    words: words.map((w) => ({ w: w.w, raw: w.raw, t0: r3(w.t0), t1: r3(w.t1), f0: F(w.t0), f1: F(w.t1) })),
    phrases: phrases.map((p) => ({ text: p.map((w) => w.raw).join(" "), t0: r3(p[0].t0), t1: r3(p[p.length - 1].t1), f0: F(p[0].t0), f1: F(p[p.length - 1].t1) })),
  });
  cursor = start + length + gap;
}
const totalFrames = cursor - (cfg.gapAfter[String(clips[clips.length - 1].clip)]?.frames ?? 0) + cfg.tailFrames;
const timeline = { _generated: "by pipeline/timing.mjs; do not edit, re-run it", fps: FPS, width: cfg.width, height: cfg.height, mixSampleRate: cfg.mixSampleRate, headFrames: cfg.headFrames, tailFrames: cfg.tailFrames, totalFrames, totalSeconds: r3(totalFrames / FPS), narrationSeconds: r3(out.reduce((a, c) => a + c.duration, 0)), clips: out };
mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(join(ROOT, "story/timeline.gen.json"), JSON.stringify(timeline, null, 1) + "\n");

// ---------- docs/audio_timing.md ----------
const L = [];
L.push("# Audio timing", "", "Generated by `node pipeline/timing.mjs` from the 13 ElevenLabs clips in `audio/narration/`. Do not edit by hand: replace a clip and re-run (see `README.md`).", "");
L.push(`- Frame rate: **${FPS} fps**, frame 0 = 00:00.000. Frame ranges are inclusive.`);
L.push(`- Narration: **${timeline.narrationSeconds.toFixed(3)} s** across ${out.length} clips, used untouched (no speed change, no trims, no edits).`);
L.push(`- Film: **${totalFrames} frames = ${ts(totalFrames / FPS)}** (head ${cfg.headFrames} f, breathing room between clips, tail ${cfg.tailFrames} f).`);
L.push(`- Each clip is placed at an exact frame boundary; its audio starts at exactly start-frame / ${FPS} s.`, "");
L.push("| Clip | File | Duration (s) | Starts | Ends | Frame range | Frames | Breathing room after |", "|---|---|---:|---|---|---|---:|---|");
for (const c of out) L.push(`| ${String(c.clip).padStart(2, "0")} ${c.title} | \`${c.file.split("/").pop()}\` | ${c.duration.toFixed(3)} | ${ts(c.start.seconds)} | ${ts(c.end.seconds)} | ${c.start.frame}–${c.end.frame - 1} | ${c.lengthFrames} | ${c.gapAfterFrames ? `${c.gapAfterFrames} f — ${cfg.gapAfter[String(c.clip)].why}` : `tail ${cfg.tailFrames} f — ${cfg.tailReason}`} |`);
L.push("", `Head (frames 0–${cfg.headFrames - 1}): ${cfg.headReason}`, "");
L.push("## Inside each clip", "", "Speech start/end and pauses are measured (RMS under " + cfg.pause.thresholdDb + " dBFS for at least " + cfg.pause.minMs + " ms). Phrase times come from aligning the locked text's syllables to the voiced audio, snapped to the measured pauses. Frames are absolute film frames. Shots anchor to these, so they move when a clip is replaced.", "");
for (const c of out) {
  L.push(`### Clip ${String(c.clip).padStart(2, "0")} — ${c.title}`, "", `\`${c.file}\` · sha256 \`${c.sha256.slice(0, 16)}…\` · ${c.sampleRate} Hz · ${c.samples} samples · speech ${c.speech.start.toFixed(2)}–${c.speech.end.toFixed(2)} s · pauses: ${c.pauses.map((p) => `${p[0].toFixed(2)}–${p[1].toFixed(2)}`).join(", ") || "none"} (${c.alignment.matchedPauses} at word boundaries${c.alignment.unmatchedPauses ? `, ${c.alignment.unmatchedPauses} unassigned` : ""})`, "");
  L.push("| Phrase | Clip time (s) | Film frames |", "|---|---|---|");
  for (const p of c.phrases) L.push(`| ${p.text} | ${p.t0.toFixed(2)}–${p.t1.toFixed(2)} | ${p.f0}–${p.f1} |`);
  L.push("");
}
writeFileSync(join(ROOT, "docs/audio_timing.md"), L.join("\n"));
console.log(`timing: ${out.length} clips, narration ${timeline.narrationSeconds} s, film ${totalFrames} frames (${ts(totalFrames / FPS)})`);
for (const c of out) console.log(`  ${String(c.clip).padStart(2, "0")} ${c.duration.toFixed(3).padStart(7)} s  frames ${String(c.start.frame).padStart(5)}–${String(c.end.frame - 1).padEnd(5)} pauses ${c.pauses.length} matched ${c.alignment.matchedPauses}`);
