// MOUNT TABOR from the Jezreel plain before dawn: the lone dome rising from flat fields, oaks dark on
// its flanks, the pale thread of a switchback path, a deep blue sky with one bright star (Venus) and
// the first cold light along the eastern hills. One plate; the climbers are drawn over it in the shot.
import type { Env } from "../../core";
import { rng } from "../../core";
import { hex, mix, css, scalec, clamp } from "../lib/math";
import { plate, paintOver } from "../paint/plates";
import { vgrad } from "../paint/nature";

export const TABOR = { w: 2400, h: 1350, peakX: 1150, peakY: 470, baseY: 1010, halfW: 820 };
// the dome's profile: y of the mountain's outline at x (plate px)
export const taborEdge = (x: number) => { const d = (x - TABOR.peakX) / TABOR.halfW; return Math.abs(d) >= 1 ? TABOR.baseY : TABOR.baseY - (TABOR.baseY - TABOR.peakY) * Math.pow(Math.cos((d * Math.PI) / 2), 0.85) + 6 * Math.sin(x * 0.05); };
// the switchback path as a polyline up the near face (plate px), bottom to top
export const TABOR_PATH: [number, number][] = (() => { const pts: [number, number][] = []; let x = 980, y = 1000; for (let k = 0; k < 9; k++) { const dir = k % 2 ? -1 : 1, run = 230 - k * 18 + ((k * 37) % 40); for (let i = 0; i <= 8; i++) { const xx = x + (dir * run * i) / 8 + Math.sin(i * 1.7 + k) * 6, yy = y - (30 + k * 2) * (i / 8); pts.push([xx, Math.max(yy, taborEdge(xx) + 18)]); } x += dir * run; y -= 30 + k * 2 + 26; } return pts; })();

export const taborPlate = (env: Env) => plate(env, `tabor:predawn@${env.scale}`, TABOR.w * env.scale, TABOR.h * env.scale, (s) => {
  const c = s.ctx, W = TABOR.w, H = TABOR.h, r = rng(701);
  c.save(); c.scale(env.scale, env.scale);
  vgrad(c, 0, 0, W, H, [[0, "#0b1226"], [0.35, "#1c2646"], [0.62, "#3e4466"], [0.74, "#7a7690"], [0.8, "#a89aa0"], [1, "#2a2c34"]]);
  // stars fading toward the horizon, and the morning star
  for (let i = 0; i < 180; i++) { const x = r() * W, y = r() * H * 0.55, a = (1 - y / (H * 0.55)) * (0.3 + r() * 0.6); c.fillStyle = `rgba(230,236,255,${a})`; c.fillRect(x, y, 1.4, 1.4); }
  const vx = 1720, vy = 330; const g = c.createRadialGradient(vx, vy, 0, vx, vy, 40); g.addColorStop(0, "rgba(255,252,240,1)"); g.addColorStop(0.15, "rgba(250,240,220,0.7)"); g.addColorStop(1, "rgba(200,210,255,0)"); c.fillStyle = g; c.fillRect(vx - 40, vy - 40, 80, 80);
  // the far hills of Galilee, barely there, and the cold first light behind them
  vgrad(c, 0, 900, W, 1030, [[0, "rgba(190,170,170,0)"], [0.7, "rgba(190,170,170,0.35)"], [1, "rgba(190,170,170,0)"]]);
  c.fillStyle = "#3c3e52"; c.beginPath(); c.moveTo(0, 1030); for (let x = 0; x <= W; x += 20) c.lineTo(x, 995 - 18 * Math.sin(x * 0.004) - 10 * Math.sin(x * 0.013 + 1)); c.lineTo(W, 1030); c.closePath(); c.fill();
  // the dome
  const body = hex("#1e2a2c"), lit = hex("#3a4a50");
  c.beginPath(); c.moveTo(TABOR.peakX - TABOR.halfW - 40, TABOR.baseY + 20); for (let x = TABOR.peakX - TABOR.halfW; x <= TABOR.peakX + TABOR.halfW; x += 6) c.lineTo(x, taborEdge(x)); c.lineTo(TABOR.peakX + TABOR.halfW + 40, TABOR.baseY + 20); c.closePath();
  const dg = c.createLinearGradient(TABOR.peakX - TABOR.halfW, 0, TABOR.peakX + TABOR.halfW, 0); dg.addColorStop(0, css(scalec(body, 0.8))); dg.addColorStop(0.55, css(body)); dg.addColorStop(1, css(lit)); c.fillStyle = dg; c.fill();
  c.save(); c.clip();
  // oak woods: clusters of dark dabs over the flanks, thinning to the bare summit
  for (let i = 0; i < 2600; i++) { const x = TABOR.peakX + (r() - 0.5) * TABOR.halfW * 2, top = taborEdge(x), y = top + r() * (TABOR.baseY - top), dens = clamp((y - TABOR.peakY) / 300); if (r() > dens) continue; c.fillStyle = css(mix(scalec(body, 0.6), lit, r() * 0.5 * (x > TABOR.peakX ? 1 : 0.5)), 0.8); c.beginPath(); c.ellipse(x, y, 3 + r() * 5, 2 + r() * 3, 0, 0, Math.PI * 2); c.fill(); }
  // the rim of cold light along the right flank
  c.strokeStyle = "rgba(170,175,200,0.35)"; c.lineWidth = 3; c.beginPath(); for (let x = TABOR.peakX; x <= TABOR.peakX + TABOR.halfW; x += 6) (x === TABOR.peakX ? c.moveTo(x, taborEdge(x) + 2) : c.lineTo(x, taborEdge(x) + 2)); c.stroke();
  // the path
  c.strokeStyle = "rgba(140,140,150,0.28)"; c.lineWidth = 1.6; c.beginPath(); TABOR_PATH.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  c.restore();
  // the plain: dark fields in strips, a village's few lamps
  c.fillStyle = "#1a1c22"; c.fillRect(0, TABOR.baseY + 5, W, H - TABOR.baseY);
  for (let i = 0; i < 40; i++) { const y = TABOR.baseY + 10 + Math.pow(r(), 1.6) * (H - TABOR.baseY), x0 = r() * W, w = 200 + r() * 700; c.fillStyle = css(mix(hex("#1c2026"), hex("#2c3026"), r()), 0.8); c.fillRect(x0, y, w, 4 + (y - TABOR.baseY) * 0.08); }
  for (let i = 0; i < 7; i++) { const x = 300 + r() * 500, y = TABOR.baseY + 30 + r() * 30; const lg = c.createRadialGradient(x, y, 0, x, y, 10); lg.addColorStop(0, "rgba(255,190,110,0.9)"); lg.addColorStop(1, "rgba(255,190,110,0)"); c.fillStyle = lg; c.fillRect(x - 10, y - 10, 20, 20); }
  c.restore();
  paintOver(env, s, { seed: 702, sizes: [18, 9, 4].map((v) => v * env.scale), keepBase: 0.6, alpha: 0.7, flow: (_x, y) => (y < 600 * env.scale ? 0.02 : null) });
});
