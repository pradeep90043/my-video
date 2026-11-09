/**
 * Creatures in a film shot: anything the planner drew as a puppet (story/puppet/spec.ts) - a horse, a dragon, a dog, a robot. The
 * director moves them like people (walk, run, enter, face, jump...) using the people's pose names; here those become the puppet's
 * own poses, blended with the same spring feel, and a rider's seat is found on the moving body.
 */
import { val } from "./anim";
import { stepAt } from "./rig";
import type { FilmLayer } from "./schema";
import type { CharMood, CharPose } from "../story/cast";
import { bodyOffset, boneAngle, channelsFor, mixChannels } from "../story/puppet/animate";
import { groundShift, type PuppetSpec } from "../story/puppet/spec";

type CreatureLayer = Extract<FilmLayer, { t: "creature" }>;

/** a person's pose name as the closest thing a puppet does */
const POSE_MAP: Record<string, CharPose> = {
  stand: "stand", walk: "walk", run: "run", lie: "sleep", sit: "stand", "sit-chair": "stand", "sit-bench": "stand", crouch: "bow", kneel: "bow",
  jump: "jump", wave: "wave", cheer: "happy", laugh: "happy", cry: "cry", slump: "sad", facepalm: "sad", think: "think", shrug: "think",
  point: "point", bow: "bow", pray: "pray", "dance-a": "dance", "dance-b": "dance", hug: "hug", push: "push", hold: "carry", reach: "give",
  "hand-over": "give", "arms-crossed": "angry", "look-up": "stand", lean: "tired",
};
export const creaturePose = (p: string): CharPose => POSE_MAP[p] ?? "stand";
const MOOD_MAP: Record<string, CharMood> = { neutral: "neutral", sad: "sad", worried: "worried", happy: "happy", tired: "sad", sleep: "neutral", angry: "angry", surprised: "surprised" };
export const creatureMood = (m: string): CharMood => MOOD_MAP[m] ?? "neutral";

export interface CreatureState { x: number; y: number; s: number; flip: boolean; pose: CharPose; prev?: CharPose; blend: number; mood: CharMood; talking: boolean }

const settle = (t: number) => { const k = Math.max(0, Math.min(1, t)); const e = k * k * (3 - 2 * k) - 1; return 1 + 2.2 * e * e * e + 1.2 * e * e; };

export function creatureState(l: CreatureLayer, frame: number): CreatureState {
  const timeline = ([[0, l.pose] as [number, string], ...(l.poses ?? [])] as [number, string][]).sort((a, b) => a[0] - b[0]);
  const { v, since, prev } = stepAt(timeline, frame, l.pose);
  return {
    x: val(l.x, frame, 960), y: val(l.y, frame, 540), s: val(l.s, frame, 1), flip: stepAt(l.faces, frame, l.flip).v,
    pose: creaturePose(v), prev: since > 0 ? creaturePose(prev) : undefined, blend: settle((frame - since) / 14),
    mood: creatureMood(stepAt(l.moods, frame, l.mood).v), talking: (l.talks ?? []).some(([a, b]) => frame >= a && frame < b),
  };
}

/** Where a rider sits on the creature at this frame, in world space (it rises and falls with the gallop). */
export function seatWorld(spec: PuppetSpec, st: CreatureState, frame: number): [number, number] | undefined {
  if (!spec.seat) return undefined;
  const input = { frame, gallop: spec.gallop };
  const to = channelsFor(st.pose, input);
  const c = st.prev && st.prev !== st.pose ? mixChannels(channelsFor(st.prev, input), to, Math.max(0, Math.min(1.25, st.blend))) : to;
  const byId = new Map(spec.bones.map((b) => [b.id, b]));
  // the seat point carried up the bone chain to the root (each bone: rotate by its angle, then move to its joint)
  let [x, y] = spec.seat.at;
  for (let b = byId.get(spec.seat.bone), hops = 0; b && hops < 40; b = b.parent ? byId.get(b.parent) : undefined, hops++) {
    const a = (boneAngle(b, c) * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    [x, y] = [x * cs - y * sn + b.at[0], x * sn + y * cs + b.at[1]];
  }
  const k = spec.scale ?? 1, lift = bodyOffset(spec, c) + groundShift(spec);
  const lx = c.shake + x * k, ly = (lift + y) * k;
  return [st.x + (st.flip ? -1 : 1) * st.s * lx, st.y + st.s * ly];
}
