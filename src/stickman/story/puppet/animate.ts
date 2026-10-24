import type { CharMood, CharPose } from "../cast";
import type { PuppetBone, PuppetSpec } from "./spec";

/**
 * Pure animation for a puppet: every pose becomes a set of channels (degrees / pixels) that already include its own oscillators
 * (gait, wing beats, breathing). Two poses are mixed channel by channel with a blend weight, so a spring that overshoots gives a
 * natural settle and no pose ever snaps. Bones then read the channel of their role.
 */
export interface Channels {
  legSwing: number; kneeA: number; kneeB: number;
  head: number; tilt: number; lean: number; bounce: number;
  wing: number; trunk: number; tail: number; ear: number;
  arm: number; armSwing: number; lie: number; shake: number; jaw: number; blink: number;
  /** frame (for travelling waves) and how strongly legless bodies undulate */
  time: number; slither: number;
}
const KEYS: (keyof Channels)[] = ["legSwing", "kneeA", "kneeB", "head", "tilt", "lean", "bounce", "wing", "trunk", "tail", "ear", "arm", "armSwing", "lie", "shake", "jaw", "blink", "time", "slither"];

interface Target { gait?: "walk" | "run" | "hop"; head?: number; tilt?: number; lean?: number; bounce?: number; wing?: number; trunk?: number; tail?: number; arm?: number; lie?: number; shake?: number; jaw?: number; peck?: number }
const T: Record<CharPose, Target> = {
  stand: {}, talk: { head: -4, arm: 18 }, point: { head: 8, arm: 80 }, wave: { head: -18, arm: 140, trunk: 55 },
  sad: { head: 30, lean: 3, tail: -1 }, happy: { bounce: 14, tail: 2.2, wing: 0.35, trunk: 50, arm: 140 },
  angry: { head: 14, lean: 4, shake: 0.3 }, scared: { head: 18, shake: 1, lean: -4, wing: 0.7 },
  walk: { gait: "walk" }, run: { gait: "run", lean: 6, wing: 0.8 }, think: { head: -12, tilt: -12 },
  bow: { head: 40, lean: 14 }, cry: { head: 28, shake: 0.4 }, pray: { head: 36, arm: 150 }, hug: { arm: 70 },
  give: { head: 10, arm: 85, trunk: 20 }, eat: { head: 52, trunk: 12, peck: 18 }, sleep: { lie: 1, head: 58 },
  dance: { gait: "hop", bounce: 30, wing: 0.6, trunk: 40, arm: 140 }, fight: { head: 14, arm: 90, lean: 6 },
  carry: { arm: 70, head: 20 }, struggle: { shake: 1, wing: 0.7, arm: 70, head: 0 }, push: { lean: 14, arm: 85 },
  shout: { head: -28, trunk: 75, jaw: 1, wing: 0.5 }, tired: { head: 28, lean: 10 }, jump: { gait: "hop", bounce: 60, wing: 1, arm: 150 },
};

export interface MotionInput { frame: number; talking?: boolean; mouthLevel?: number; react?: string; mood?: CharMood }

export function channelsFor(pose: CharPose, o: MotionInput): Channels {
  const f = o.frame, t = T[pose] ?? T.stand, sin = (k: number, ph = 0) => Math.sin(f * k + ph);
  const freq = t.gait === "run" ? 0.55 : t.gait === "walk" ? 0.3 : t.gait === "hop" ? 0.3 : 0;
  const amp = t.gait === "run" ? 38 : t.gait === "walk" ? 22 : t.gait === "hop" ? 20 : 0;
  const ph = f * freq;
  const rf = o.react ? f % 90 : 999, rAmt = o.react ? Math.max(0, 1 - rf / 70) : 0;
  const wing = t.wing ?? 0;
  const talk = o.talking ? Math.min(1, (o.mouthLevel ?? 0.5) * 1.5) : 0;
  const eating = pose === "eat" ? Math.max(0, sin(0.45)) : 0;
  return {
    legSwing: freq ? Math.sin(ph) * amp : 0,
    kneeA: freq ? Math.max(0, Math.cos(ph)) * amp * 0.9 : 0,
    kneeB: freq ? Math.max(0, -Math.cos(ph)) * amp * 0.9 : 0,
    head: (t.head ?? 0) + (t.peck ?? 0) * eating + (pose === "struggle" ? sin(1.0) * 24 : 0) + (o.react === "yes" ? sin(0.5) * 14 * rAmt : 0) + (pose === "shout" || pose === "talk" ? sin(0.4) * 3 * (o.talking ? 1 : 0) : 0),
    tilt: (o.react === "no" ? sin(0.6) * 16 * rAmt : 0) + (t.tilt ?? 0),
    lean: t.lean ?? 0,
    bounce: (t.gait === "hop" ? Math.abs(sin(0.3)) * (t.bounce ?? 0) : (t.bounce ?? 0) * Math.abs(sin(0.25))) + (t.gait === "walk" ? Math.abs(Math.sin(ph)) * 4 : t.gait === "run" ? Math.abs(Math.sin(ph)) * 10 : 0) + (o.react === "surprise" ? Math.max(0, 1 - rf / 14) * 26 : 0) + sin(0.1) * 1.5,
    wing: wing * (-30 - 40 * Math.sin(f * (pose === "scared" ? 1.3 : 0.7))) + (1 - wing) * sin(0.09) * 2,
    trunk: (t.trunk ?? 0) + sin(0.07) * 4 + (pose === "shout" ? sin(0.5) * 6 : 0),
    tail: (sin(pose === "happy" || pose === "jump" ? 0.7 : 0.15)) * (pose === "scared" ? 4 : 14) + (t.tail ?? 0) * 8,
    ear: sin(0.12) * 4 + (pose === "scared" ? sin(1.6) * 6 : 0) + (pose === "happy" ? sin(0.5) * 8 : 0),
    arm: t.arm ?? 0,
    armSwing: freq ? Math.sin(ph) * amp * 1.2 : pose === "wave" ? sin(0.45) * 25 : pose === "fight" ? sin(0.55) * 30 : pose === "talk" ? sin(0.27) * 10 : 0,
    lie: t.lie ?? 0,
    shake: (t.shake ?? 0) * (pose === "struggle" ? sin(1.2) * 8 : pose === "scared" ? sin(1.6) * 3 : sin(1.1) * 2),
    jaw: Math.max(t.jaw ?? 0, talk, pose === "eat" ? eating * 0.7 : 0, o.mood === "laugh" ? 0.8 : 0, pose === "struggle" ? 0.45 + 0.35 * Math.abs(sin(1.0)) : 0),
    time: f,
    slither: t.gait === "run" ? 1.7 : t.gait === "walk" ? 1 : t.gait === "hop" ? 1.3 : pose === "struggle" || pose === "fight" ? 1.4 : pose === "shout" || pose === "angry" ? 0.7 : 0,
    blink: pose === "sleep" || f % 120 > 113 ? 0.12 : 1,
  };
}

/** Pose A to pose B by weight k (a springy k > 1 overshoots a little, then settles). */
export function mixChannels(a: Channels, b: Channels, k: number): Channels {
  const out = {} as Channels;
  for (const key of KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

/** The angle (degrees, clockwise) a bone should have, given the mixed channels. */
export function boneAngle(b: PuppetBone, c: Channels): number {
  const rest = b.rot ?? 0, amp = b.amp ?? 1, side = b.group === "B" ? -1 : 1;
  if (b.phase !== undefined && (b.role === "tail" || b.role === "extra" || b.role === "body" || b.role === "head")) return rest + Math.sin(c.time * 0.2 - b.phase) * (1.5 + c.slither * 3.2) * amp + (b.role === "head" ? c.head * amp : 0);
  switch (b.role) {
    case "body": return rest + c.lean + c.shake * 0.3;
    case "head": return rest + (c.head + c.tilt) * amp;
    case "jaw": return rest + c.jaw * 26 * amp;
    case "tail": return rest + c.tail * amp;
    case "ear": return rest + c.ear * amp;
    case "wing": return rest + c.wing * amp;
    case "trunk": return rest - c.trunk * amp + Math.sin(c.tail * 0.2) * 2;
    case "leg": return rest + (c.legSwing * side + c.lie * 80) * amp;
    case "lower": return rest - (side > 0 ? c.kneeA : c.kneeB) * amp;
    case "arm": return rest - (c.arm * amp) + c.armSwing * side * amp;
    case "forearm": return rest - c.arm * 0.3 * amp - Math.max(0, c.armSwing * side) * 0.5 * amp;
    default: return rest + c.tail * 0.5 * amp;
  }
}

/** Vertical offset of the whole puppet: hops, breathing and lying down. */
export function bodyOffset(spec: PuppetSpec, c: Channels): number {
  return -c.bounce + c.lie * spec.height * 0.16;
}
