/**
 * Camera feel: small motions added on top of the framed shot, all seeded and pure (a frame always renders the same).
 *   handheld: a slow, smooth drift and roll, as if someone holds the camera
 *   impact:   a kick that shakes and dies away, returning exactly to rest (a fall, a slam, a landing)
 *   pulse:    a quick zoom in and back (a realisation, a shock)
 * Plus `damp`, the critically damped spring the director's follow camera glides with.
 */
export type ShakeKind = "handheld" | "impact" | "pulse";
export interface Shake { kind: ShakeKind; at: number; dur: number; strength?: number; dir?: number; seed?: number }

const smooth = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };
/** -1..1, deterministic per (integer, seed) */
function hash(n: number, seed: number) {
  let h = Math.imul((n | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2f);
  return ((h ^ (h >>> 13)) >>> 0) / 0x7fffffff - 1;
}
/** smooth value noise: random values on whole numbers, eased between */
const noise = (t: number, seed: number) => { const i = Math.floor(t); return hash(i, seed) + (hash(i + 1, seed) - hash(i, seed)) * smooth(t - i); };

/** The camera's extra offset at a frame: x / y in output pixels, roll in degrees, zoom as a multiplier. */
export function shakeAt(shakes: readonly Shake[] | undefined, frame: number, fps = 30): { x: number; y: number; r: number; z: number } {
  let x = 0, y = 0, r = 0, z = 1;
  for (const s of shakes ?? []) {
    const age = frame - s.at;
    if (age < 0 || age >= s.dur) continue;
    const S = s.strength ?? 1, seed = s.seed ?? 1, t = age / fps, u = age / s.dur;
    if (s.kind === "handheld") {
      const env = S * Math.min(smooth(age / 12), smooth((s.dur - age) / 12));
      x += 7 * noise(t * 0.6, seed) * env;
      y += 4.5 * noise(t * 0.6, seed + 7) * env;
      r += 0.35 * noise(t * 0.45, seed + 13) * env;
    } else if (s.kind === "impact") {
      // a decaying oscillation with a final taper, so it ends exactly at rest
      const kick = Math.cos(t * 2 * Math.PI * 7) * Math.exp(-5 * u) * (1 - smooth(u)) * S;
      const a = ((s.dir ?? 90) * Math.PI) / 180;
      x += 16 * kick * Math.cos(a); y += 16 * kick * Math.sin(a); r += 1.1 * kick; z *= 1 + 0.025 * Math.abs(kick);
    } else {
      z *= 1 + 0.06 * S * Math.sin(Math.PI * u) ** 2;
    }
  }
  return { x, y, r, z };
}

/** How much to enlarge the frame so a shaken camera never shows past the edge of the set. */
export const overscan = (o: { x: number; y: number; r: number }, W = 1920, H = 1080) =>
  1 + 2 * Math.max(Math.abs(o.x) / W, Math.abs(o.y) / H) + Math.abs((o.r * Math.PI) / 180) * 1.25;

/**
 * One frame of a critically damped spring towards `target` (smoothTime in frames): it glides there and settles without
 * overshooting or wobbling. Returns the new value and velocity.
 */
export function damp(value: number, velocity: number, target: number, smoothTime: number): [number, number] {
  if (smoothTime <= 0) return [target, 0];
  const w = 2 / smoothTime, decay = 1 / (1 + w + 0.48 * w * w + 0.235 * w * w * w);
  const change = value - target, temp = velocity + w * change;
  return [target + (change + temp) * decay, (velocity - w * temp) * decay];
}
