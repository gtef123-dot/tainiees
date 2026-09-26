// "The Rock", the score for THE APOSTLE PETER. D, 4/4 at 60 bpm: one beat is one second, so every
// beat number below IS the film time in seconds (docs/audio_timing.md). No rubato and no ritard:
// the music must land where the pictures and the narration are.
//
// THE MOTIF (Peter): D A G F E D, a rising fifth (the rock), then an eager step down home.
//   01 prologue      D dorian, low strings, alone in the mist
//   02 fisherman     dorian, harp ostinato on the water; the motif restated higher
//   03 the call      D major; the motif on the piano, alone, as He looks at him
//   04 beside Him    walking line; the storm (38.2 s) is one gust; lydian stillness after it
//   05 confession    builds over a cello pulse to D major on «Εσύ είσαι ο Χριστός» (50 s)
//   06 Tabor         D lydian (the raised G#): the motif turned to light, bells
//   07 denial        D minor, piano alone, the motif broken; three tolls (71-73 s); silence; weeping
//   08 restoration   the motif whole again in minor at dawn, turning to D major on the third question (92 s)
//   09 Pentecost     the motif in full, strings in octaves, harp ostinato, bells (96 s)
//   10 Rome          aeolian, the motif darkened; footsteps (128.5 s) on the timpani
//   11 martyrdom     a lament; minor plagal cadence into D major on «Peace» (142 s)
//   12 feast         bells
//   13 meaning       falls and rises (σηκωθεί 154.4 s), climbs, and the motif lands whole on
//                    «δυνατοί, πιστοί και γενναίοι» (164 s); the coda empties onto the lake
import { line, type Piece, type Note, type Role, type Section, type Chord } from "../plan";

const B = 4;
const L = (t: number, src: string, role: Role, v = 0.7, o: { pickup?: number; roll?: number; kind?: string } = {}) => line(t, src, { role, v, bpb: B, ...o });

// ---------------------------------------------------------------- harmony (beat = second)
const CH: [number, string][] = [
  [0, "Dsus2"], [4, "Dm"], [8, "Dm"], [10, "C"], [12, "Dm"], [14, "G"], [16, "F"], [18, "C"], [20, "Asus4"], [21, "A"],
  [22, "D"], [24, "D"], [26, "Bm"], [28, "G"], [30, "A"],
  [32, "D"], [34, "A/C#"], [36, "Bm"], [37, "G"], [38, "Bb/D"], [39.5, "E/D"], [42, "D"],
  [44, "Bm"], [46, "Em7"], [48, "A7sus4"], [49, "A7"], [50, "D"], [52, "G"], [54, "Dsus2"],
  [56, "Dadd9"], [58, "E/D"], [60, "D"], [62, "E/D"],
  [64, "Dm"], [68, "Bb"], [70, "Gm"], [71, "A"], [74, "Dm"], [76, "Gm"], [78, "Dm"],
  [80, "Dm"], [82, "Bb"], [84, "F"], [86, "C"], [88, "Gm"], [90, "A7sus4"], [91, "A"],
  [92, "D"], [94, "Bm"], [95, "A"],
  [96, "D"], [98, "Bm"], [100, "G"], [102, "A"], [104, "D"], [106, "A/C#"], [108, "G"], [110, "D/F#"], [112, "Em7"], [114, "A"],
  [116, "Dm"], [118, "C"], [120, "Bb"], [122, "A"], [124, "F"], [126, "Gm"], [127, "A"],
  [128, "Dm"], [130, "Eb/D"], [132, "Dm"], [134, "Gm"], [136, "Bb"], [138, "Asus4"], [139, "A"], [140, "Gm"], [142, "D"],
  [144, "D"], [146, "G"], [148, "Bm"], [150, "A"],
  [152, "Bm"], [154, "G"], [156, "D/F#"], [158, "G"], [160, "Em7"], [162, "A7sus4"], [163, "A"],
  [164, "D"], [166, "G/D"], [167, "D"], [168, "D"],
];
const END = 170.5; // everything is released by here; the film ends at 171.133

const PC: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const Q: Record<string, number[]> = { "": [0, 4, 7], m: [0, 3, 7], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 2], "7": [0, 4, 7, 10], m7: [0, 3, 7, 10], "7sus4": [0, 5, 7, 10] };
const chord = (sym: string) => {
  const m = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(sym); if (!m || !Q[m[2]]) throw new Error(`chord ${sym}`);
  const root = PC[m[1]], iv = Q[m[2]];
  return { root, pcs: iv.map((i) => (root + i) % 12), third: iv[1] === 3 || iv[1] === 4 ? (root + iv[1]) % 12 : -1, bass: m[3] ? PC[m[3]] : root };
};
const spans = CH.map(([t, s], i) => ({ a: t, b: i + 1 < CH.length ? CH[i + 1][0] : END, sym: s, c: chord(s) }));

// ---------------------------------------------------------------- dynamics: one curve for the film
// keyframes (beat, level): multiplied into every written velocity
const DYN: [number, number][] = [
  [0, 0.6], [8, 0.8], [19, 1.0], [21.4, 0.62], [32, 0.8], [37.9, 1.0], [39.5, 0.75], [44, 0.8], [49.9, 1.12], [53.5, 0.75],
  [59.6, 0.9], [60, 1.15], [63.9, 1.05], [64, 0.62], [73.6, 0.5], [80, 0.72], [91.6, 0.95], [96, 1.15], [107, 1.05],
  [108, 0.85], [116, 0.8], [128, 0.8], [137, 0.95], [142, 1.0], [144, 0.9], [152, 0.8], [163.9, 1.18], [166, 1.0], [170.5, 0.55],
];
const dyn = (t: number) => { for (let i = 1; i < DYN.length; i++) if (t < DYN[i][0]) { const [a, va] = DYN[i - 1], [b, vb] = DYN[i]; return va + ((vb - va) * (t - a)) / (b - a); } return DYN[DYN.length - 1][1]; };
const shaped = (ns: Note[]) => ns.map((n) => (n.role === "drum" ? n : { ...n, v: n.v * dyn(n.t) }));

// ---------------------------------------------------------------- textures, by film time
type Harp = "none" | "q" | "e8" | "s16" | "ost" | "hi16";
type Bass = "none" | "hold" | "row" | "pulse8" | "trem";
type Tex = { to: number; pad: number; padLo?: number; padHi?: number; harp: Harp; hv?: number; bass: Bass; bv?: number };
const TEX: Tex[] = [
  { to: 8, pad: 0.42, harp: "q", hv: 0.42, bass: "hold", bv: 0.55 }, // the mist
  { to: 21.5, pad: 0.45, harp: "ost", hv: 0.5, bass: "row", bv: 0.6 }, // the lake at work
  { to: 24, pad: 0.4, padLo: 57, padHi: 86, harp: "none", bass: "hold", bv: 0.4 }, // a shadow falls on the net
  { to: 32, pad: 0.42, harp: "e8", hv: 0.4, bass: "hold", bv: 0.5 }, // the call
  { to: 38, pad: 0.48, harp: "e8", hv: 0.46, bass: "pulse8", bv: 0.45 }, // walking with Him
  { to: 39.5, pad: 0.62, padLo: 38, padHi: 64, harp: "none", bass: "trem", bv: 0.72 }, // the storm
  { to: 44, pad: 0.4, padLo: 60, padHi: 88, harp: "hi16", hv: 0.34, bass: "hold", bv: 0.4 }, // "who is this man?"
  { to: 50, pad: 0.5, harp: "e8", hv: 0.48, bass: "pulse8", bv: 0.55 }, // the confession builds
  { to: 54, pad: 0.62, harp: "q", hv: 0.55, bass: "hold", bv: 0.7 }, // «Εσύ είσαι ο Χριστός»
  { to: 56, pad: 0.4, padLo: 57, padHi: 86, harp: "q", hv: 0.34, bass: "hold", bv: 0.4 }, // Tabor before dawn
  { to: 64, pad: 0.55, padLo: 57, padHi: 90, harp: "hi16", hv: 0.42, bass: "hold", bv: 0.55 }, // the light
  { to: 73.7, pad: 0.3, padLo: 38, padHi: 62, harp: "none", bass: "hold", bv: 0.4 }, // the courtyard at night
  { to: 75.2, pad: 0, harp: "none", bass: "none" }, // the silence
  { to: 80, pad: 0.26, padLo: 45, padHi: 66, harp: "none", bass: "hold", bv: 0.36 }, // weeping
  { to: 84, pad: 0.34, harp: "q", hv: 0.3, bass: "hold", bv: 0.42 }, // dawn on the lake
  { to: 85.3, pad: 0.4, harp: "s16", hv: 0.42, bass: "hold", bv: 0.45 }, // he jumps in
  { to: 91.7, pad: 0.4, harp: "e8", hv: 0.4, bass: "hold", bv: 0.45 }, // the questions
  { to: 95, pad: 0.5, harp: "e8", hv: 0.46, bass: "hold", bv: 0.55 }, // restored
  { to: 96, pad: 0.55, harp: "s16", hv: 0.5, bass: "pulse8", bv: 0.6 }, // the wind rises
  { to: 108, pad: 0.58, harp: "ost", hv: 0.52, bass: "pulse8", bv: 0.6 }, // Pentecost
  { to: 116, pad: 0.46, harp: "e8", hv: 0.44, bass: "hold", bv: 0.52 }, // the first Christians; the road
  { to: 124, pad: 0.42, harp: "e8", hv: 0.4, bass: "pulse8", bv: 0.42 }, // the road to Rome
  { to: 128, pad: 0.34, harp: "q", hv: 0.32, bass: "hold", bv: 0.4 }, // the hidden gathering
  { to: 132, pad: 0.4, padLo: 45, padHi: 70, harp: "none", bass: "trem", bv: 0.5 }, // footsteps
  { to: 142, pad: 0.42, harp: "none", bass: "hold", bv: 0.5 }, // martyrdom
  { to: 144, pad: 0.52, padLo: 62, padHi: 93, harp: "hi16", hv: 0.4, bass: "hold", bv: 0.45 }, // peace; bright sky
  { to: 152, pad: 0.45, harp: "e8", hv: 0.44, bass: "hold", bv: 0.5 }, // the feast
  { to: 160, pad: 0.46, harp: "e8", hv: 0.44, bass: "hold", bv: 0.52 }, // the meaning
  { to: 164, pad: 0.54, harp: "s16", hv: 0.46, bass: "pulse8", bv: 0.6 }, // called to be strong again
  { to: 168, pad: 0.62, harp: "hi16", hv: 0.46, bass: "hold", bv: 0.66 }, // faithful and brave
  { to: END, pad: 0.4, harp: "q", hv: 0.36, bass: "hold", bv: 0.42 }, // the lake, morning
];
const texAt = (t: number) => TEX.find((x) => t < x.to - 1e-9) ?? TEX[TEX.length - 1];
/** texture boundaries cut chord spans, so each piece of a chord takes the texture it sounds in */
const pieces = () => {
  const cuts = [...new Set([...spans.flatMap((s) => [s.a, s.b]), ...TEX.map((x) => x.to)])].sort((a, b) => a - b).filter((x) => x <= END);
  const out: { a: number; b: number; c: ReturnType<typeof chord>; tex: Tex; first: boolean }[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) { const a = cuts[i], b = cuts[i + 1], s = spans.find((x) => a >= x.a - 1e-9 && a < x.b - 1e-9); if (!s) continue; out.push({ a, b, c: s.c, tex: texAt(a), first: Math.abs(a - s.a) < 1e-9 }); }
  return out;
};

// ---------------------------------------------------------------- the pad: nearest voice leading
const combos = (xs: number[], k: number): number[][] => (k === 0 ? [[]] : xs.flatMap((x, i) => combos(xs.slice(i + 1), k - 1).map((r) => [x, ...r])));
const voice = (c: ReturnType<typeof chord>, prev: number[] | null, lo: number, hi: number) => {
  const cand: number[] = []; for (let m = lo; m <= hi; m++) if (c.pcs.includes(m % 12)) cand.push(m);
  let best: number[] = [], bestCost = Infinity;
  for (const v of combos(cand, 4)) {
    const pcs = new Set(v.map((m) => m % 12)); if (!pcs.has(c.root) || (c.third >= 0 && !pcs.has(c.third))) continue;
    let bad = false; for (let i = 1; i < 4; i++) { const d = v[i] - v[i - 1]; if (d < 2 || d > 12 || (v[i] < 52 && d < 5)) bad = true; } if (bad) continue; // no mud: nothing closer than a fourth low down
    const centre = (lo + hi) / 2 + 2, cost = prev ? v.reduce((s, m, i) => s + Math.abs(m - prev[i]), 0) : Math.abs(v[1] + v[2] - 2 * centre);
    if (cost < bestCost) { bestCost = cost; best = v; }
  }
  return best;
};
const pad = (): Note[] => {
  const out: Note[] = []; let prev: number[] | null = null;
  for (const p of pieces()) {
    if (p.tex.pad <= 0) { prev = null; continue; }
    const v = voice(p.c, prev, p.tex.padLo ?? 50, p.tex.padHi ?? 81); prev = v;
    for (const m of v) out.push({ t: p.a, d: p.b - p.a, p: m, v: p.tex.pad, role: "accomp" });
  }
  // tied notes: a pitch held across a cut is one bow stroke, not two
  out.sort((a, b) => a.p - b.p || a.t - b.t);
  const merged: Note[] = []; for (const n of out) { const q = merged[merged.length - 1]; if (q && q.p === n.p && Math.abs(q.t + q.d - n.t) < 1e-9 && Math.abs(q.v - n.v) < 0.05) q.d += n.d; else merged.push({ ...n }); }
  return merged;
};

// ---------------------------------------------------------------- the cellos
const bassNotes = (): Note[] => {
  const out: Note[] = [];
  for (const p of pieces()) {
    const tx = p.tex, bv = tx.bv ?? 0.5, root = p.c.bass, lo = 38 + ((root - 38) % 12 + 12) % 12, b1 = lo >= 47 ? lo - 12 : lo, len = p.b - p.a;
    const fifth = b1 + (p.c.pcs.includes((root + 7) % 12) ? 7 : 5);
    if (tx.bass === "hold") { out.push({ t: p.a, d: len, p: b1, v: bv, role: "bass" }, { t: p.a, d: len, p: b1 + 12, v: bv * 0.55, role: "bass" }); }
    else if (tx.bass === "row") { const pat: [number, number, number][] = [[0, 1.5, b1], [1.5, 0.5, fifth], [2, 1.5, b1 + 12], [3.5, 0.5, fifth]]; for (let t = p.a; t < p.b - 1e-9; t += 4) for (const [o, d, m] of pat) if (t + o < p.b - 1e-9) out.push({ t: t + o, d: Math.min(d, p.b - t - o), p: m, v: bv * (o === 0 ? 1.1 : 0.85), role: "bass" }); }
    else if (tx.bass === "pulse8") { for (let t = p.a; t < p.b - 1e-9; t += 0.5) out.push({ t, d: 0.45, p: b1, v: bv * (Math.abs(t - Math.round(t)) < 1e-9 ? 1 : 0.72), role: "bass" }); out.push({ t: p.a, d: len, p: b1 + 12, v: bv * 0.5, role: "bass" }); }
    else if (tx.bass === "trem") { for (let t = p.a; t < p.b - 1e-9; t += 0.125) out.push({ t, d: 0.12, p: b1, v: bv * (0.75 + 0.25 * ((t - p.a) / len)), role: "bass" }); }
  }
  return out;
};

// ---------------------------------------------------------------- the harp
const harpNotes = (): Note[] => {
  const out: Note[] = [];
  for (const p of pieces()) {
    const tx = p.tex; if (tx.harp === "none") continue;
    const hv = tx.hv ?? 0.4, hi = tx.harp === "hi16", base = hi ? 74 : 50;
    const tones: number[] = []; for (let m = base; m <= base + 26; m++) if (p.c.pcs.includes(m % 12)) tones.push(m);
    const r0 = tones.findIndex((m) => m % 12 === p.c.bass) >= 0 && !hi ? tones.findIndex((m) => m % 12 === p.c.bass) : 0;
    const t3 = (p.c.third >= 0 ? p.c.third : p.c.pcs[1]);
    const ost = (() => { const R = 50 + ((p.c.bass - 50) % 12 + 12) % 12; const f = R + (p.c.pcs.includes((p.c.bass + 7) % 12) ? 7 : 5), third = R + 12 + ((t3 - p.c.bass + 12) % 12); return [R, f, R + 14 - (p.c.pcs.includes((p.c.bass + 2) % 12) ? 0 : 2), f, third, f, R + 12, f]; })();
    const step = tx.harp === "q" ? 1 : tx.harp === "e8" ? 0.5 : 0.25;
    for (let t = p.a, k = 0; t < p.b - 1e-9; t += step, k++) {
      let m: number;
      if (tx.harp === "ost") m = ost[k % 8];
      else if (tx.harp === "q") m = tones[r0 + [0, 2, 3, 2][k % 4]] ?? tones[k % tones.length];
      else if (tx.harp === "e8") m = tones[r0 + [0, 2, 4, 5, 6, 5, 4, 2][k % 8]] ?? tones[(r0 + k) % tones.length];
      else { const up = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]; m = tones[Math.min(tones.length - 1, (hi ? 0 : r0) + up[k % 16])]; }
      const onBeat = Math.abs(t - Math.round(t)) < 1e-9;
      out.push({ t, d: step * 1.5, p: m, v: hv * (onBeat ? 1.12 : 0.9), role: "color" });
    }
  }
  return out;
};

// ---------------------------------------------------------------- the lines (written by hand)
// strings: the motif and its transformations
const melody: Note[] = [
  ...L(4, "D4:1 A4:1.5 G4:.5 F4:1 | E4:1 D4:3", "melody", 0.62), // prologue, 4-12
  ...L(12, "A4:1 D5:1.5 C5:.5 B4:1 | A4:1 G4:.5 A4:.5 F4:1 E4:1 | D4:1.5", "melody", 0.66), // the lake, 12-21.5
  ...L(32, "F#4:1 A4:1 D5:1.5 C#5:.5 | B4:1 D5:1 r:1.5 E5:.5 | G#5:2 F#5:1 E5:1", "melody", 0.64), // beside Him; lydian after the storm
  ...L(44, "F#4:1 B4:1.5 A4:.5 G4:1 | D5:1 C#5:1 D5:2 | D5:1 B4:1 A4:2", "melody", 0.7), // the confession
  ...L(56, "A5:2 B5:1 G#5:1 | A5:1.5 G#5:.5 F#5:1 E5:1", "melody", 0.6), // Tabor: the motif turned to light
  ...L(75.25, "D6:2.5", "melody", 0.28), // His eyes: one thin line
  ...L(92, "D5:1 A5:1.5 G5:.5 F#5:1", "melody", 0.6), // restored (with the piano)
  ...L(96, "D5:1 A5:1.5 G5:.5 F#5:1 | G5:1 F#5:.5 E5:.5 D5:1 E5:1 | F#5:1 A5:1 D6:1.5 C#6:.5 | B5:2 A5:2 | G5:1 F#5:1 E5:2", "melody", 0.72), // Pentecost
  ...L(116, "D4:1 A4:1.5 G4:.5 F4:1 | F4:1 D4:1 E4:2 | A4:2 G4:1 E4:1", "melody", 0.6), // Rome
  ...L(132, "A4:2 G4:1 F4:1 | D4:1 F4:1 E4:2 | D4:1 Bb4:1 A4:2", "melody", 0.58), // lament
  ...L(152, "D5:1 B4:1 G4:1 B4:1 | D5:1 F#5:1 A5:1.5 G5:.5 | G5:1 F#5:1 E5:1 C#5:1 | D5:1 A5:1.5 G5:.5 F#5:1 | E5:1 D5:1.5", "melody", 0.68), // the meaning
];
// Pentecost and the climax: the motif doubled an octave down (violas), the voice of many
const octaves: Note[] = [...melody.filter((n) => (n.t >= 96 && n.t < 108) || (n.t >= 160 && n.t < 170)).map((n) => ({ ...n, p: n.p - 12, v: n.v * 0.7, role: "inner" as Role }))];

// piano: the call, the denial, the restoration
const piano: Note[] = [
  // the call: He looks at him; the motif in major, alone
  ...L(24, "D5:1 A5:1.5 G5:.5 F#5:1 | E5:1.5 D5:.5 E5:1 C#5:1 | D5:2", "melody", 0.55),
  ...L(24, "[D3 A3]:2 [B2 F#3]:2 | [G2 D3]:2 [A2 E3]:2 | [D2 A2 F#3]:2", "accomp", 0.42, { roll: 0.03 }),
  // the denial: the motif broken
  ...L(64, "r:1 A4:1.5 G4:.5 F4:1 | E4:2 r:1 [C#4 E4]:1@0.8 | r:2", "melody", 0.5),
  ...L(64, "[D2 A2]:4 | [Bb1 F2]:2 [G1 D2]:1 [A1 A2]:1@1.1 | [A1 A2]:1@1.15 [A1 A2]:1@1.2 r:2", "bass", 0.5),
  // weeping
  ...L(76, "Bb4:1.5 A4:.5 G4:1 F4:.5 E4:.5", "melody", 0.4),
  ...L(76, "[G2 D3]:2 [D2 A2]:2", "bass", 0.34, { roll: 0.05 }),
  // the tear becomes the lake: the motif whole again, in minor
  ...L(80, "D4:1 A4:1.5 G4:.5 F4:1 | E4:1 F4:1 G4:1 A4:1 | Bb4:1.5 A4:.5 G4:1 A4:1 | D5:1 A5:1.5 G5:.5 F#5:1 | [D4 F#4 A4 D5]:2", "melody", 0.5),
  ...L(80, "[D2 A2 F3]:2 [Bb1 F2 D3]:2 | [F2 C3 A3]:2 [C2 G2 E3]:2 | [G2 D3 Bb3]:2 [A2 E3 G3]:1 [A2 E3 C#4]:1 | [D2 A2 F#3]:2 [B1 F#2 D3]:1 [A1 E2 C#3]:1", "accomp", 0.4, { roll: 0.03 }),
  // the arrival chords
  ...L(50, "[D2 A2 D3 F#3]:2", "bass", 0.62, { roll: 0.04 }),
  ...L(142, "[D2 A2 F#3]:2", "bass", 0.46, { roll: 0.06 }),
  ...L(164, "[D2 A2 D3 F#3]:2", "bass", 0.6, { roll: 0.04 }),
  // the lake, morning: the motif's first cell, very quietly, once more
  ...L(166.5, "D5:1 A5:2", "melody", 0.34),
];

// bells: the confession, Tabor, Pentecost, the feast, the climax, the last light
const bells: Note[] = [
  ...L(50, "[D6 A6]:2", "color", 0.5),
  ...L(56, "A6:2 B6:1 G#6:1 | A6:1.5 G#6:.5 F#6:1 E6:1", "color", 0.42),
  ...L(96, "[D6 A6]:4", "color", 0.5),
  ...L(104, "[F#6 A6]:2", "color", 0.42),
  ...L(144, "A5:1 F#5:1 D5:1 A5:1 | B5:1 F#5:1 E5:1 C#5:1", "color", 0.45), // the feast's peal
  ...L(164, "[D6 A6]:2", "color", 0.48),
  ...L(169, "D6:1", "color", 0.3),
];
// the church bell: 29 June
const churchBell: Note[] = [...L(144, "D4:2 A3:2 | D4:2", "color", 0.5)];

// timpani (the soft kick): the storm, the arrivals, footsteps, the cross
const timp: Note[] = [
  ...Array.from({ length: 11 }, (_, i) => ({ t: 38 + i * 0.125, d: 0.1, p: 38, v: 0.35 + 0.05 * i, role: "drum" as Role, kind: "k" })),
  { t: 39.4, d: 0.5, p: 38, v: 0.95, role: "drum", kind: "k" },
  { t: 50, d: 1, p: 38, v: 0.8, role: "drum", kind: "k" },
  { t: 60, d: 1, p: 38, v: 0.6, role: "drum", kind: "k" },
  { t: 96, d: 1, p: 38, v: 0.85, role: "drum", kind: "k" },
  { t: 104, d: 1, p: 38, v: 0.7, role: "drum", kind: "k" },
  ...[128.55, 129.55, 130.55, 131.3].map((t, i) => ({ t, d: 0.3, p: 38, v: 0.45 + 0.1 * i, role: "drum" as Role, kind: "k" })),
  { t: 137, d: 1, p: 38, v: 0.55, role: "drum", kind: "k" },
  { t: 164, d: 1, p: 38, v: 0.8, role: "drum", kind: "k" },
];

const SECTIONS: Section[] = [
  { id: "prologue", bars: 2, mood: "wistful", key: "D", mode: "dorian", melody: ["stepwise", "drone"], dyn: [0.35, 0.45] },
  { id: "fisherman", bars: 3, mood: "joy", key: "D", mode: "dorian", melody: ["ostinato", "themeTransformation"], dyn: [0.5, 0.62] },
  { id: "call", bars: 3, mood: "tender", key: "D", mode: "major", melody: ["stepwise"], dyn: [0.42, 0.5] },
  { id: "beside", bars: 3, mood: "hopeful", key: "D", mode: "major", melody: ["sequence", "arpeggio"], dyn: [0.48, 0.58] },
  { id: "confession", bars: 3, mood: "hopeful", key: "D", mode: "major", melody: ["themeTransformation"], dyn: [0.52, 0.8] },
  { id: "tabor", bars: 2, mood: "awe", key: "D", mode: "lydian", melody: ["themeTransformation", "arpeggio"], dyn: [0.55, 0.85] },
  { id: "denial", bars: 4, mood: "melancholy", key: "Dm", mode: "aeolian", melody: ["stepwise", "drone"], dyn: [0.52, 0.34] },
  { id: "restoration", bars: 4, mood: ["melancholy", "hopeful", 0.5], key: "Dm", mode: "aeolian", melody: ["themeTransformation"], dyn: [0.34, 0.62] },
  { id: "pentecost", bars: 5, mood: "triumph", key: "D", mode: "major", melody: ["themeTransformation", "ostinato"], dyn: [0.62, 0.75] },
  { id: "rome", bars: 3, mood: "wistful", key: "Dm", mode: "aeolian", melody: ["stepwise"], dyn: [0.5, 0.42] },
  { id: "martyrdom", bars: 4, mood: ["tension", "melancholy", 0.6], key: "Dm", mode: "aeolian", melody: ["stepwise", "drone"], dyn: [0.42, 0.55] },
  { id: "feast", bars: 2, mood: "awe", key: "D", mode: "major", melody: ["arpeggio"], dyn: [0.5, 0.55] },
  { id: "meaning", bars: 4, mood: ["hopeful", "triumph", 0.5], key: "D", mode: "major", melody: ["themeTransformation"], dyn: [0.5, 0.85] },
  { id: "coda", bars: 1, mood: "tender", key: "D", mode: "major", melody: ["stepwise"], dyn: [0.55, 0.35], ending: "tail" },
];

export const peterScore = (): Piece => {
  const harmony: Chord[] = CH.map(([t, name]) => ({ t, name }));
  return {
    title: "The Rock (The Apostle Peter)", seed: 1629, tail: 0.6, harmony,
    plan: { style: "cinematic", tempo: 60, meter: "4/4", rubato: 0, ritard: 1, sections: SECTIONS },
    parts: [
      { id: "violins", inst: "strings", role: "accomp", notes: shaped(pad()), opts: { attack: 1.0, release: 1.5, bright: 0.72, width: 0.9 }, gainDb: -5 },
      { id: "cellos", inst: "strings", role: "bass", notes: shaped(bassNotes()), opts: { attack: 0.35, release: 1.1, bass: true, bright: 0.55 }, gainDb: -3 },
      { id: "melody", inst: "strings", role: "melody", notes: shaped(melody), opts: { attack: 0.28, release: 0.9, bright: 0.95, width: 0.5 }, gainDb: 0 },
      { id: "violas", inst: "strings", role: "inner", notes: shaped(octaves), opts: { attack: 0.3, release: 0.9, bright: 0.8, width: 0.7 }, gainDb: -4 },
      { id: "harp", inst: "harp", role: "color", notes: shaped(harpNotes()), gainDb: -1, pan: -0.15 },
      { id: "piano", inst: "piano", role: "melody", notes: shaped(piano), gainDb: 0 },
      { id: "bells", inst: "fmBell", role: "color", notes: shaped(bells), gainDb: -9, pan: 0.2 },
      { id: "churchBell", inst: "bell", role: "color", notes: shaped(churchBell), gainDb: -10 },
      { id: "timpani", inst: "kick", role: "drum", notes: timp, opts: { soft: 1 }, gainDb: -3 },
    ],
  };
};
