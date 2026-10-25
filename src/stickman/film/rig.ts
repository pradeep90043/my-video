/**
 * The silhouette's skeleton as numbers: where a pose puts the hands (forward kinematics, mirroring person.tsx exactly) and which
 * shoulder / elbow angles put the front hand on a point (two-bone inverse kinematics). This is what makes a hand land ON the phone
 * instead of near it, and a held thing ride in the hand frame by frame. Also resolves a person layer's timelines (poses, facing,
 * mood, reaches) for one frame, so FilmStage, held props and tests all see the same body.
 */
import { val } from "./anim";
import { POSES, blendPose, type PoseParams } from "./person";
import type { FilmLayer } from "./schema";

type PersonLayer = Extract<FilmLayer, { t: "person" }>;
export type Mood = PersonLayer["mood"];

/** Body measurements shared with person.tsx (local units, the feet at the origin, +x = the way the figure faces). */
export const BODY = {
  hip: 250, // the hip line above the feet
  shoulderF: [50, -148] as const, // front shoulder in the torso's frame (origin = hip)
  upper: 150, lower: 140, mitt: 14, // the hand's centre sits 14 past the end of the forearm
  height: 560, // feet to the top of the head, standing
  head: 440, // feet to the middle of the head, standing
};

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
/** SVG rotate(a) of a point. */
const rot = (x: number, y: number, a: number): [number, number] => {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  return [x * c - y * s, x * s + y * c];
};
/** A limb hanging straight down, swung forward by `a` degrees (person.tsx Limb: rotate(-a) of (0, len)). */
const dir = (a: number): [number, number] => [Math.sin(rad(a)), Math.cos(rad(a))];

export const sway = (frame: number, seed: number) => Math.sin((frame + seed * 7) / 47) * 1.2;
export const bobOf = (pose: PoseParams, frame: number) => (pose.stride ? Math.abs(Math.sin(frame * 0.26)) * -7 : 0);
export const strideOf = (pose: PoseParams, frame: number) => pose.stride * Math.sin(frame * 0.26);

/** The front hand's centre in the figure's local space. */
export function frontHandLocal(pose: PoseParams, frame: number, seed: number): [number, number] {
  const phi = pose.lean + sway(frame, seed) * 0.4;
  const a0 = pose.armF[0] + (pose.carry ? 0 : strideOf(pose, frame) * 0.6), a1 = pose.armF[1];
  const [ux, uy] = dir(a0), [lx, ly] = dir(a0 + a1);
  const tx = BODY.shoulderF[0] + ux * BODY.upper + lx * (BODY.lower + BODY.mitt);
  const ty = BODY.shoulderF[1] + uy * BODY.upper + ly * (BODY.lower + BODY.mitt);
  const [rx, ry] = rot(tx, ty, phi);
  return [rx, ry - BODY.hip + bobOf(pose, frame)];
}

/** Shoulder + elbow angles that put the front hand's centre on a local point (clamped to the arm's reach). */
export function solveFrontArm(pose: PoseParams, frame: number, seed: number, target: [number, number]): [number, number] {
  const phi = pose.lean + sway(frame, seed) * 0.4;
  const [px, py] = rot(target[0], target[1] - bobOf(pose, frame) + BODY.hip, -phi);
  const qx = px - BODY.shoulderF[0], qy = py - BODY.shoulderF[1];
  const U = BODY.upper, L = BODY.lower + BODY.mitt;
  const d = Math.max(Math.abs(U - L) + 1, Math.min(U + L - 0.5, Math.hypot(qx, qy)));
  const theta = Math.atan2(qx, qy);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (U * U + d * d - L * L) / (2 * U * d))));
  const elbow = Math.PI - Math.acos(Math.max(-1, Math.min(1, (U * U + L * L - d * d) / (2 * U * L))));
  return [deg(theta - alpha) - (pose.carry ? 0 : strideOf(pose, frame) * 0.6), deg(elbow)];
}

/** How far the front hand can reach from the hip line (local units), for "walk closer first" decisions. */
export const REACH = BODY.upper + BODY.lower + BODY.mitt - 10;

export interface Placement { x: number; y: number; s: number; r: number; flip: boolean }

export function toLocal(p: Placement, wx: number, wy: number): [number, number] {
  const [rx, ry] = rot(wx - p.x, wy - p.y, -p.r);
  return [rx / (p.s * (p.flip ? -1 : 1)), ry / p.s];
}
export function toWorld(p: Placement, lx: number, ly: number): [number, number] {
  const [rx, ry] = rot(lx * p.s * (p.flip ? -1 : 1), ly * p.s, p.r);
  return [p.x + rx, p.y + ry];
}

/** Value of a [frame, value] step timeline at a frame (the last key at or before it), with the frame that key started. */
export function stepAt<T>(keys: readonly (readonly [number, T])[] | undefined, frame: number, first: T): { v: T; since: number; prev: T } {
  let v = first, since = 0, prev = first;
  for (const [f, k] of keys ?? []) if (f <= frame) { prev = v; v = k; since = f; }
  return { v, since, prev };
}

export interface PersonState { pose: PoseParams; place: Placement; mood: Mood; look: number; seed: number }

const smooth = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };

/** Everything a person layer is at one frame: blended pose (+ reaching arm), where it stands, which way it faces, its mood. */
export function personState(l: PersonLayer, index: number, frame: number): PersonState {
  const seed = index + 1;
  const timeline: [number, string][] = [[0, l.pose], ...(l.to ? [[l.poseAt, l.to] as [number, string]] : []), ...(l.poses ?? [])];
  timeline.sort((a, b) => a[0] - b[0]);
  const { v, since, prev } = stepAt(timeline.slice(1), frame, timeline[0][1]);
  const a = POSES[prev] ?? POSES.stand, b = POSES[v] ?? POSES.stand;
  let pose = since === 0 && v === timeline[0][1] ? b : blendPose(a, b, smooth((frame - since) / Math.max(1, l.poseDur)));

  const place: Placement = {
    x: val(l.x, frame, 960), y: val(l.y, frame, 540), s: val(l.s, frame, 1), r: val(l.r, frame, 0),
    flip: stepAt(l.faces, frame, l.flip).v,
  };

  // what the head attends to: a gaze target, else whatever the hand is working on (the strongest wins)
  let attend: { x: number; y: number; w: number } | undefined;
  const attendTo = (x: number, y: number, w: number) => { if (w > 0 && (!attend || w > attend.w)) attend = { x, y, w }; };

  // reaching: the front arm bends onto a world point, easing in and out
  for (const rc of l.reach ?? []) {
    const ramp = rc.ease ?? 10;
    // a held reach stays until it is released (then eases out like any other)
    const end = rc.hold ? rc.release ?? Infinity : rc.at + rc.dur;
    if (frame < rc.at || frame > end + ramp) continue;
    const w = Math.min(smooth((frame - rc.at) / ramp), smooth((end + ramp - frame) / ramp));
    const wig = rc.wiggle ? Math.sin(frame * 1.3) * rc.wiggle : 0; // typing / writing
    const target = toLocal(place, rc.x + wig, rc.y + (rc.wiggle ? Math.abs(Math.cos(frame * 0.9)) * rc.wiggle * 0.4 : 0));
    const ik = solveFrontArm(pose, frame, seed, target);
    pose = { ...pose, armF: [pose.armF[0] + (ik[0] - pose.armF[0]) * w, pose.armF[1] + (ik[1] - pose.armF[1]) * w] };
    // a resting hand on the desk is not something to stare at
    if (!rc.hold) attendTo(rc.x, rc.y, w * 0.85);
  }
  for (const g of l.gazes ?? []) {
    const end = g.until ?? Infinity;
    if (frame < g.at || frame > end + 10) continue;
    attendTo(g.x, g.y, Math.min(smooth((frame - g.at) / 10), smooth((end + 10 - frame) / 10)));
  }
  if (attend) {
    // tilt the head (relative to the leaning torso) so the face points at the target
    const [tx, ty] = toLocal(place, attend.x, attend.y);
    const [hx, hy] = rot(0, -252, pose.lean);
    const want = deg(Math.atan2(ty - (hy - BODY.hip), Math.max(60, tx - hx))) - pose.lean;
    const head = Math.max(-35, Math.min(40, want));
    pose = { ...pose, head: pose.head + (head - pose.head) * attend.w, turn: (pose.turn ?? 0.75) + (1 - (pose.turn ?? 0.75)) * attend.w * 0.8 };
  }

  // explicit face turns (to the camera and back), blended over 10 frames
  if (l.turns?.length) {
    const own = pose.turn ?? 0.75;
    const { v, since, prev } = stepAt(l.turns, frame, -1);
    const to = v < 0 ? own : v, from = prev < 0 ? own : prev;
    pose = { ...pose, turn: from + (to - from) * smooth((frame - since) / 10) };
  }

  return { pose, place, mood: stepAt(l.moods, frame, l.mood).v, look: stepAt(l.looks, frame, l.look).v, seed };
}

/** Is the person speaking at this frame? */
export const talkingAt = (l: PersonLayer, frame: number) => (l.talks ?? []).some(([a, b]) => frame >= a && frame < b);

/** The front hand's centre in world space at a frame. */
export function frontHandWorld(st: PersonState, frame: number): [number, number] {
  const [lx, ly] = frontHandLocal(st.pose, frame, st.seed);
  return toWorld(st.place, lx, ly);
}
