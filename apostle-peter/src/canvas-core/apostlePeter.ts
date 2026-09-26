// THE APOSTLE PETER. The film: the resolved shot list (story/shots.gen.json, anchored to the
// narration) mapped to one draw function per shot. Audio is mixed outside the page: the narration
// clips are the person's own recordings, the score and soundscape are synthesized in pipeline/.
import type { Ctx, Env } from "./core";
import type { Film, Shot } from "./film";
import cues from "../../story/shots.gen.json";
import { SHOTS } from "./peter/shots/index";
import "./peter/shots/all";

type Cue = { id: string; title: string; start: number; end: number; frames: number; clip: number; kind?: string; loc: string; age: string };
const placeholder = (c: Cue) => (ctx: Ctx, f: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = "#1c1916"; ctx.fillRect(0, 0, env.W, env.H);
  ctx.fillStyle = "#c9b28a"; ctx.font = '64px "DejaVu Serif", serif'; ctx.textAlign = "center"; ctx.fillText(`${c.id} · ${c.title}`, env.W / 2, env.H / 2 - 20);
  ctx.font = '30px "DejaVu Sans", sans-serif'; ctx.fillStyle = "#8a7a62"; ctx.fillText(`${c.loc} · Peter ${c.age} · frame ${f + 1}/${c.frames}`, env.W / 2, env.H / 2 + 40);
  ctx.fillStyle = "#c9b28a"; ctx.fillRect(env.W * 0.2, env.H * 0.62, env.W * 0.6 * (f / Math.max(1, c.frames - 1)), 6);
};
const shots: Shot[] = (cues.shots as Cue[]).map((c) => {
  const fn = SHOTS[c.id];
  return { id: c.id, start: c.start, end: c.end, draw: fn ? (ctx: Ctx, f: number, env: Env) => fn(ctx, f, env, { id: c.id, start: c.start, frames: c.frames, clip: c.clip, abs: c.start + f }) : placeholder(c) };
});
export const apostlePeter: Film = {
  // bpm 1800 = a 1-frame grid: the cuts follow the narration's words, not a musical beat
  meta: { title: "apostlePeter", W: 1920, H: 1080, fps: 30, bpm: 1800, durationFrames: cues.totalFrames, raster: "cpu", kind: "story" },
  assets: { images: {} }, shots,
};
