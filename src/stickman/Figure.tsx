import React from "react";
import { interpolate } from "remotion";
import type { Mood, PoseName } from "./schema";
import type { Theme } from "./theme";

/**
 * Skeleton stickman. Angles are degrees measured from "straight down",
 * positive toward screen-right (so 90 = pointing right, 180 = straight up).
 * Arm/leg lower segments use absolute angles for easy authoring.
 */
export interface Pose {
  lean: number;
  head: number;
  lUp: number; lFore: number;
  rUp: number; rFore: number;
  lThigh: number; lShin: number;
  rThigh: number; rShin: number;
}

const base: Pose = {
  lean: 0, head: 0,
  lUp: -18, lFore: -8, rUp: 18, rFore: 8,
  lThigh: -7, lShin: -4, rThigh: 7, rShin: 4,
};

export const POSE_LIBRARY: Record<Exclude<PoseName, "walk">, Pose> = {
  idle: base,
  point: { ...base, lean: 3, rUp: 82, rFore: 88, lUp: -14, lFore: -8 },
  present: { ...base, lUp: -62, lFore: -78, rUp: 62, rFore: 78 },
  shrug: { ...base, head: -6, lUp: -52, lFore: -150, rUp: 52, rFore: 150 },
  think: { ...base, head: 8, rUp: 28, rFore: 158, lUp: -35, lFore: 50 },
  celebrate: { ...base, lUp: -150, lFore: -168, rUp: 150, rFore: 168, lThigh: -14, rThigh: 14 },
  worried: { ...base, lean: -3, lUp: -140, lFore: -172, rUp: 140, rFore: 172 },
  facepalm: { ...base, lean: 4, head: 10, rUp: 32, rFore: 172, lUp: -16, lFore: -8 },
  shocked: { ...base, lean: -7, lUp: -48, lFore: -62, rUp: 48, rFore: 62, lThigh: -12, rThigh: 12 },
};

const KEYS = Object.keys(base) as (keyof Pose)[];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

export function resolvePose(name: PoseName, frame: number): Pose {
  if (name !== "walk") return POSE_LIBRARY[name];
  const s = Math.sin(frame * 0.28);
  return { ...base, lean: 3, lUp: -30 * s, lFore: -30 * s - 14, rUp: 30 * s, rFore: 30 * s + 14,
    lThigh: 28 * s, lShin: 28 * s - 10, rThigh: -28 * s, rShin: -28 * s - 10 };
}

const dir = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
};
const add = (p: { x: number; y: number }, d: { x: number; y: number }, len: number) => ({
  x: p.x + d.x * len,
  y: p.y + d.y * len,
});

const L = { torso: 150, upper: 96, fore: 92, thigh: 108, shin: 108, head: 50 };

export const FIGURE_HEIGHT = L.thigh + L.shin + L.torso + L.head * 2 + 14;

interface FigureProps {
  /** x of the figure's centre, y of the ground line */
  x: number;
  ground: number;
  pose: Pose;
  mood: Mood;
  frame: number;
  theme: Theme;
  accent: string;
  flip?: boolean;
  /** vertical offset, e.g. celebration hop */
  hop?: number;
  scale?: number;
}

export const Figure: React.FC<FigureProps> = ({ x, ground, pose, mood, frame, theme, accent, flip, hop = 0, scale = 1 }) => {
  const breathe = Math.sin(frame * 0.12) * 2.5;
  const legLen = L.thigh + L.shin;
  const hip = { x: 0, y: -legLen + breathe * 0.4 - hop };

  const shoulder = add(hip, dir(180 - pose.lean), L.torso);
  const neck = shoulder;
  const headC = add(neck, dir(180 - pose.lean + pose.head), L.head + 6);

  const lElbow = add(shoulder, dir(pose.lUp), L.upper);
  const lHand = add(lElbow, dir(pose.lFore), L.fore);
  const rElbow = add(shoulder, dir(pose.rUp), L.upper);
  const rHand = add(rElbow, dir(pose.rFore), L.fore);
  const lKnee = add(hip, dir(pose.lThigh), L.thigh);
  const lFoot = add(lKnee, dir(pose.lShin), L.shin);
  const rKnee = add(hip, dir(pose.rThigh), L.thigh);
  const rFoot = add(rKnee, dir(pose.rShin), L.shin);

  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => `M${a.x},${a.y}L${b.x},${b.y}`;
  type Pt = { x: number; y: number };
  const limb = (a: Pt, b: Pt, c: Pt) => `M${a.x},${a.y}L${b.x},${b.y}L${c.x},${c.y}`;

  const blink = frame % 96 > 91;
  const talking = mood === "neutral" || mood === "happy";
  const mouthOpen = talking ? Math.abs(Math.sin(frame * 0.9)) * 9 : 0;
  const hr = L.head;

  const mouth = () => {
    const cy = hr * 0.42;
    if (mood === "shocked") return <ellipse cx={0} cy={cy + 2} rx={9} ry={13} fill={theme.ink} />;
    if (mood === "worried") return <path d={`M-14,${cy + 6} Q0,${cy - 6} 14,${cy + 6}`} fill="none" />;
    if (mood === "sad") return <path d={`M-14,${cy + 8} Q0,${cy - 4} 14,${cy + 8}`} fill="none" />;
    if (mood === "happy") return <path d={`M-18,${cy - 4} Q0,${cy + 16 + mouthOpen * 0.6} 18,${cy - 4}`} fill="none" />;
    return mouthOpen > 2.5
      ? <ellipse cx={0} cy={cy} rx={9} ry={mouthOpen * 0.7} fill={theme.ink} />
      : <path d={`M-10,${cy} L10,${cy}`} fill="none" />;
  };

  const brow = mood === "worried" || mood === "sad";
  const stroke = { stroke: theme.ink, strokeWidth: 11, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  return (
    <g transform={`translate(${x},${ground}) scale(${flip ? -scale : scale},${scale})`}>
      <ellipse cx={0} cy={4} rx={70 - hop * 0.2} ry={9} fill={theme.faint} />
      <g {...stroke}>
        <path d={limb(hip, lKnee, lFoot)} />
        <path d={limb(hip, rKnee, rFoot)} />
        <path d={line(hip, shoulder)} />
        <path d={limb(shoulder, lElbow, lHand)} />
        <path d={limb(shoulder, rElbow, rHand)} />
      </g>
      <g transform={`translate(${headC.x},${headC.y}) rotate(${pose.head - pose.lean * 0.4})`}>
        <circle r={hr} fill={theme.bg} stroke={theme.ink} strokeWidth={11} />
        <g stroke={theme.ink} strokeWidth={7} strokeLinecap="round" fill="none">
          {blink ? (
            <>
              <path d={`M-23,-6 L-11,-6`} />
              <path d={`M11,-6 L23,-6`} />
            </>
          ) : (
            <>
              <circle cx={-17} cy={-6} r={mood === "shocked" ? 7 : 5} fill={theme.ink} stroke="none" />
              <circle cx={17} cy={-6} r={mood === "shocked" ? 7 : 5} fill={theme.ink} stroke="none" />
            </>
          )}
          {brow && (
            <>
              <path d={`M-28,-24 L-10,-30`} stroke={accent} />
              <path d={`M28,-24 L10,-30`} stroke={accent} />
            </>
          )}
          {mouth()}
        </g>
      </g>
    </g>
  );
};

/** Smoothly ease the figure between the previous scene's pose and this one. */
export function blendedPose(
  prev: PoseName, next: PoseName, frame: number, blendFrames = 12,
): Pose {
  const t = interpolate(frame, [0, blendFrames], [0, 1], { extrapolateRight: "clamp" });
  const eased = t * t * (3 - 2 * t);
  return lerpPose(resolvePose(prev, frame), resolvePose(next, frame), eased);
}
