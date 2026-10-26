/**
 * Keyframe maths for film layers. Every animatable property is a plain number, a from→to tween that starts `at` frames
 * into the shot, or a list of [frame, value] keys eased between. Pure, so tests and the sound planner share it.
 */
export const EASES = ["linear", "in", "out", "inout", "cruise", "fall", "rise"] as const;
export type Ease = (typeof EASES)[number];
/** A key: [frame, value], optionally with the ease of the stretch that ARRIVES at it (else the anim's own ease). */
export type Key = [number, number, ...Ease[]];
export type Anim =
  | number
  | { from: number; to: number; at?: number; dur?: number; ease?: Ease }
  | { keys: Key[]; ease?: Ease };

/** cruise: speed up over the first 18%, keep an even pace, slow down over the last 18% (a walk, not a surge) */
const CRUISE = 0.18, VMAX = 1 / (1 - CRUISE);
export const easeFn = (e: Ease, t: number): number =>
  e === "linear" ? t
    : e === "in" ? t * t * t
      : e === "out" ? 1 - Math.pow(1 - t, 3)
        // gravity: falling accelerates, rising decelerates (the two halves of a jump or a fall)
        : e === "fall" ? t * t
          : e === "rise" ? 1 - (1 - t) * (1 - t)
            : e === "cruise" ? (t < CRUISE ? (VMAX * t * t) / (2 * CRUISE) : t > 1 - CRUISE ? 1 - (VMAX * (1 - t) * (1 - t)) / (2 * CRUISE) : VMAX * (t - CRUISE / 2))
              : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function val(a: Anim | undefined, frame: number, fallback = 0): number {
  if (a === undefined) return fallback;
  if (typeof a === "number") return a;
  if ("keys" in a) {
    const k = a.keys;
    if (frame <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (frame <= k[i][0]) {
        const t = (frame - k[i - 1][0]) / Math.max(1, k[i][0] - k[i - 1][0]);
        return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * easeFn(k[i][2] ?? a.ease ?? "inout", t);
      }
    }
    return k[k.length - 1][1];
  }
  const at = a.at ?? 0;
  const t = Math.max(0, Math.min(1, (frame - at) / Math.max(1, a.dur ?? 30)));
  return a.from + (a.to - a.from) * easeFn(a.ease ?? "inout", t);
}

/** The frame a tween or key list finishes on (0 for a constant): used to time sounds with the motion. */
export function endFrame(a: Anim | undefined): number {
  if (a === undefined || typeof a === "number") return 0;
  if ("keys" in a) return a.keys[a.keys.length - 1][0];
  return (a.at ?? 0) + (a.dur ?? 30);
}
