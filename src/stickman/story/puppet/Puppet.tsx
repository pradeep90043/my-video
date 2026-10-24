import React from "react";
import type { CharMood, CharPose } from "../cast";
import { StoryPropArt, type StoryPropName } from "../StoryProps";
import { boneAngle, bodyOffset, channelsFor, mixChannels } from "./animate";
import { paint, sanitizeSvg, type PuppetBone, type PuppetSpec } from "./spec";

interface Props {
  spec: PuppetSpec;
  pose: CharPose;
  mood: CharMood;
  frame: number;
  talking?: boolean;
  mouthLevel?: number;
  react?: string;
  holds?: StoryPropName;
  /** the pose it comes from and how far into the new one it is (spring, may overshoot) */
  prevPose?: CharPose;
  blend?: number;
}

/** Draws any PuppetSpec: nested joints, art per bone, animated eyes, held prop, soft ground shadow. Origin between the feet, facing +x. */
export const Puppet: React.FC<Props> = ({ spec, pose, mood, frame, talking, mouthLevel, react, holds, prevPose, blend = 1 }) => {
  const input = { frame, talking, mouthLevel, react, mood };
  const to = channelsFor(pose, input);
  const c = prevPose && prevPose !== pose ? mixChannels(channelsFor(prevPose, input), to, Math.max(0, Math.min(1.25, blend))) : to;
  const kids = (id: string | null) => spec.bones.filter((b) => b.parent === id);
  const art = (b: PuppetBone) => {
    const safe = sanitizeSvg(b.svg);
    return safe ? <g dangerouslySetInnerHTML={{ __html: paint(safe, spec.palette) }} /> : null;
  };
  const eyesOn = (b: PuppetBone) => (spec.eyes ?? []).filter((e) => e.bone === b.id).map((e, i) => {
    const sad = mood === "sad" || mood === "worried", angry = mood === "angry";
    return (
      <g key={i} transform={`translate(${e.at[0]},${e.at[1]})`}>
        <ellipse rx={e.r} ry={e.r * 1.15 * c.blink} fill="#fff" stroke={spec.palette.out ?? "#2B2B2B"} strokeWidth={2.2} />
        <circle cx={e.r * 0.25} cy={e.r * 0.1} r={e.r * 0.5} fill="#1d1d1d" opacity={c.blink > 0.5 ? 1 : 0} />
        <line x1={-e.r} y1={-e.r * 1.5 + (sad ? e.r * 0.5 : 0)} x2={e.r} y2={-e.r * 1.5 + (angry ? e.r * 0.7 : sad ? -e.r * 0.4 : 0)} stroke={spec.palette.out ?? "#2B2B2B"} strokeWidth={3} strokeLinecap="round" />
      </g>
    );
  });
  const render = (b: PuppetBone): React.ReactNode => {
    const ch = kids(b.id).sort((x, y) => (x.z ?? 0) - (y.z ?? 0));
    const back = ch.filter((x) => (x.z ?? 0) < 0), front = ch.filter((x) => (x.z ?? 0) >= 0);
    return (
      <g key={b.id} transform={`translate(${b.at[0]},${b.at[1]}) rotate(${boneAngle(b, c)})`}>
        {back.map(render)}
        {art(b)}
        {eyesOn(b)}
        {front.map(render)}
      </g>
    );
  };
  const root = spec.bones.find((b) => b.parent === null);
  if (!root) return null;
  const lift = bodyOffset(spec, c);
  return (
    <g transform={`translate(${c.shake},0)`}>
      <ellipse cx={0} cy={6} rx={spec.height * 0.5} ry={12} fill="#000" opacity={0.18} transform={`scale(${Math.max(0.6, 1 + lift / 260)},1)`} />
      <g transform={`translate(0,${lift})`}>{render(root)}</g>
      {holds && <g transform={`translate(${spec.height * 0.5},${-spec.height * 0.15 + lift}) scale(0.4)`}><StoryPropArt type={holds} frame={frame} /></g>}
    </g>
  );
};
