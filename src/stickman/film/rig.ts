/**
 * The silhouette's skeleton as numbers: where a pose puts the hands (forward kinematics, mirroring person.tsx exactly) and which
 * shoulder / elbow angles put the front hand on a point (two-bone inverse kinematics). This is what makes a hand land ON the phone
 * instead of near it, and a held thing ride in the hand frame by frame. Also resolves a person layer's timelines (poses, facing,
 * mood, reaches) for one frame, so FilmStage, held props and tests all see the same body.
 */
import { val } from "./anim";
import { POSES, SPREAD, blendPose, type PoseParams } from "./person";
import type { FilmLayer } from "./schema";

type PersonLayer = Extract<FilmLayer, { t: "person" }>;
export type Mood = PersonLayer["mood"];

/** Body measurements shared with person.tsx (local units, the feet at the origin, +x = the way the figure faces). */
export const BODY = {
  hip: 250, // the hip line above the feet
  shoulderF: [50, -148] as const, // front shoulder in the torso's frame (origin = hip)
  // a resting hand hangs at the upper thigh (shoulder 398 above the feet, hand centre ~156): proportions, not a gorilla reach
  upper: 122, lower: 108, mitt: 12, // the hand's centre sits 12 past the end of the forearm
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
/** the walk cycle's phase: from the distance covered when the rig knows it (feet stay planted), else from time */
export const phaseOf = (pose: PoseParams, frame: number) => pose.phase ?? frame * 0.26;
/** the body is highest as the legs pass each other and lowest with them spread */
export const bobOf = (pose: PoseParams, frame: number) => (pose.stride ? -7 * Math.min(1.2, pose.stride / 26) * Math.cos(phaseOf(pose, frame)) ** 2 : 0);
export const strideOf = (pose: PoseParams, frame: number) => pose.stride * Math.sin(phaseOf(pose, frame));

/** The front hand's centre in the figure's local space. */
export function frontHandLocal(pose: PoseParams, frame: number, seed: number): [number, number] {
  const phi = pose.lean + sway(frame, seed) * 0.4;
  const a0 = pose.armF[0] + (pose.carry ? 0 : strideOf(pose, frame) * 0.6), a1 = pose.armF[1];
  const [ux, uy] = dir(a0), [lx, ly] = dir(a0 + a1);
  const tx = BODY.shoulderF[0] + (pose.spread ?? 0) * SPREAD + ux * BODY.upper + lx * (BODY.lower + BODY.mitt);
  const ty = BODY.shoulderF[1] + uy * BODY.upper + ly * (BODY.lower + BODY.mitt);
  const [rx, ry] = rot(tx, ty, phi);
  return [rx, ry - BODY.hip + bobOf(pose, frame)];
}

/** Shoulder + elbow angles that put the front hand's centre on a local point (clamped to the arm's reach). */
export function solveFrontArm(pose: PoseParams, frame: number, seed: number, target: [number, number]): [number, number] {
  const phi = pose.lean + sway(frame, seed) * 0.4;
  const [px, py] = rot(target[0], target[1] - bobOf(pose, frame) + BODY.hip, -phi);
  const qx = px - BODY.shoulderF[0] - (pose.spread ?? 0) * SPREAD, qy = py - BODY.shoulderF[1];
  const U = BODY.upper, L = BODY.lower + BODY.mitt;
  const d = Math.max(Math.abs(U - L) + 1, Math.min(U + L - 0.5, Math.hypot(qx, qy)));
  const theta = Math.atan2(qx, qy);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (U * U + d * d - L * L) / (2 * U * d))));
  const elbow = Math.PI - Math.acos(Math.max(-1, Math.min(1, (U * U + L * L - d * d) / (2 * U * L))));
  return [deg(theta - alpha) - (pose.carry ? 0 : strideOf(pose, frame) * 0.6), deg(elbow)];
}

/** How far the front hand can reach from the hip line (local units), for "walk closer first" decisions. */
export const REACH = BODY.upper + BODY.lower + BODY.mitt - 10;

/** `sx` squeezes the width for a few frames while the figure turns round */
export interface Placement { x: number; y: number; s: number; r: number; flip: boolean; sx?: number }

export function toLocal(p: Placement, wx: number, wy: number): [number, number] {
  const [rx, ry] = rot(wx - p.x, wy - p.y, -p.r);
  return [rx / (p.s * (p.flip ? -1 : 1) * (p.sx ?? 1)), ry / p.s];
}
export function toWorld(p: Placement, lx: number, ly: number): [number, number] {
  const [rx, ry] = rot(lx * p.s * (p.flip ? -1 : 1) * (p.sx ?? 1), ly * p.s, p.r);
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
/** ease in, then settle with a slight overshoot (limbs carry a little momentum into a new pose) */
const settle = (t: number) => { const k = smooth(t) - 1; return 1 + 2.2 * k * k * k + 1.2 * k * k; };

/** distance a person has walked by each frame (world px; a row change counts its depth), cached per layer */
const travelledCache = new WeakMap<object, number[]>();
function travelled(l: PersonLayer, frame: number): number {
  let arr = travelledCache.get(l);
  if (!arr) { arr = [0]; travelledCache.set(l, arr); }
  const f = Math.max(0, Math.round(frame));
  for (let i = arr.length; i <= f; i++) arr.push(arr[i - 1] + Math.hypot(val(l.x, i, 960) - val(l.x, i - 1, 960), (val(l.y, i, 540) - val(l.y, i - 1, 540)) * 1.6));
  return arr[f];
}
/** a straight leg swinging ±A° moves the foot 2·250·sin A per half cycle: the distance per radian of walk phase */
const strideLen = (A: number) => (2 * BODY.hip * Math.sin((A * Math.PI) / 180)) / Math.PI;

/** Everything a person layer is at one frame: blended pose (+ reaching arm), where it stands, which way it faces, its mood. */
export function personState(l: PersonLayer, index: number, frame: number): PersonState {
  const seed = index + 1;
  const timeline: [number, string][] = [[0, l.pose], ...(l.to ? [[l.poseAt, l.to] as [number, string]] : []), ...(l.poses ?? [])];
  timeline.sort((a, b) => a[0] - b[0]);
  // each new pose blends in from where the body ACTUALLY is when it starts (mid-way through the previous blend, if that had not
  // finished), never from the previous pose's name: a quick walk-stop-walk or sit-after-arriving must not snap
  const dur = Math.max(1, l.poseDur);
  let a = POSES[timeline[0][1]] ?? POSES.stand, b = a, since = 0;
  for (const [fk, name] of timeline.slice(1)) {
    if (fk > frame) break;
    a = blendPose(a, b, settle((fk - since) / dur));
    b = POSES[name] ?? POSES.stand;
    since = fk;
  }
  let pose = blendPose(a, b, settle((frame - since) / dur));

  const place: Placement = {
    x: val(l.x, frame, 960), y: val(l.y, frame, 540), s: val(l.s, frame, 1), r: val(l.r, frame, 0),
    flip: stepAt(l.faces, frame, l.flip).v,
  };

  // walking: the leg phase follows the ground actually covered, so the planted foot stays put; the stride follows the speed,
  // so a walk eases in and out instead of skating
  const A = Math.max(a.stride, b.stride);
  if (A > 0 && typeof l.x === "object") {
    const len = strideLen(A) * place.s;
    const v = (travelled(l, frame + 1) - travelled(l, Math.max(0, frame - 1))) / 2;
    pose = { ...pose, phase: travelled(l, frame) / len, stride: pose.stride * Math.min(1.25, v / (len * 0.26)) };
  }

  // turning round: around each change of facing the head and body pass through the front (spin 0) over ~0.8 s, instead of a
  // mirror flip; the mirror happens at the middle, when the figure faces the camera and looks the same both ways
  const TURN = 12;
  let turnDip = 1;
  for (const [f] of l.faces ?? []) {
    const d = Math.abs(frame - f);
    if (d < TURN) turnDip = Math.min(turnDip, smooth(d / TURN));
  }

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
    const goal = toLocal(place, rc.x + wig, rc.y + (rc.wiggle ? Math.abs(Math.cos(frame * 0.9)) * rc.wiggle * 0.4 : 0));
    // the hand's TARGET travels from where the hand is now to the goal, lifting a little on the way (a hand moves in an arc
    // over things, not through them); the arm is solved for that point every frame, so the path is the hand's, not the joints'
    const rest = frontHandLocal(pose, frame, seed);
    const dist = Math.hypot(goal[0] - rest[0], goal[1] - rest[1]);
    const lift = w < 1 ? Math.sin(Math.PI * w) * Math.min(60, dist * 0.25) : 0;
    const point: [number, number] = [rest[0] + (goal[0] - rest[0]) * w, rest[1] + (goal[1] - rest[1]) * w - lift];
    const ik = solveFrontArm(pose, frame, seed, point);
    // the solved arm takes over fully almost at once (solving the resting hand gives the resting arm, so there is no pop)
    const k = smooth(Math.min(1, w * 4));
    pose = { ...pose, armF: [pose.armF[0] + (ik[0] - pose.armF[0]) * k, pose.armF[1] + (ik[1] - pose.armF[1]) * k] };
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
    pose = { ...pose, turn: from + (to - from) * smooth((frame - since) / 18) };
  }

  // head gestures
  for (const [a, b, kind] of l.nods ?? []) {
    if (frame < a || frame >= b) continue;
    const env = Math.min(1, (frame - a) / 4, (b - frame) / 4);
    if (kind === "nod") pose = { ...pose, head: pose.head + Math.sin((frame - a) * 0.5) * 12 * env };
    else pose = { ...pose, turn: Math.max(0, Math.min(1, (pose.turn ?? 0.75) - 0.25 + Math.sin((frame - a) * 0.45) * 0.3 * env)) };
  }
  if (turnDip < 1) {
    // facing the camera mid-turn: the arms hang at both sides, lean, head tilt and stride ease to neutral, so the mirror at the
    // middle of the turn shows nothing (otherwise the arm in front would jump to the other side of the body)
    const k = turnDip, hang = (a: [number, number]): [number, number] => [a[0] * k + 3 * (1 - k), a[1] * k + 5 * (1 - k)];
    pose = { ...pose, turn: (pose.turn ?? 0.75) * k, spin: k, spread: 1 - k, armF: hang(pose.armF), armB: hang(pose.armB), lean: pose.lean * k, head: pose.head * k, stride: pose.stride * k };
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

/** Where a carried thing is: in the front hand, coming to the middle of the body (held in both hands) as the person turns
 * through the front, so the mirror in the middle of a turn does not swap it to the other side. */
export function carryPoint(st: PersonState, frame: number): [number, number] {
  const [hx, hy] = frontHandWorld(st, frame), k = st.pose.spread ?? 0;
  return [hx + (st.place.x - hx) * k, hy];
}
