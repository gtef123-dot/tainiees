// The registry: shot id -> draw function. A shot not yet built draws a labelled placeholder.
import type { ShotFn } from "../scene";
export const SHOTS: Record<string, ShotFn> = {};
export const register = (fns: Record<string, ShotFn>) => Object.assign(SHOTS, fns);
