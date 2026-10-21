import React from "react";
import { Easing, interpolate } from "remotion";
import { StoryBackground } from "./Backgrounds";
import { Character, CHARACTER_HEIGHT } from "./Character";
import { DEFAULT_CAST, type CastMember, type StagedChar, type StoryBgName, type StoryTime } from "./cast";

interface Props {
  bg: StoryBgName;
  time: StoryTime;
  chars: StagedChar[];
  cast: CastMember[];
  frame: number;
  durationFrames: number;
  talking: boolean;
  mouthLevel?: number;
  w: number;
  h: number;
  ground: number;
  camera: string;
}

/** A storyboard frame: the story's background and the people in it, placed left to right, entering with a short walk. */
export const StoryStage: React.FC<Props> = ({ bg, time, chars, cast, frame, durationFrames, talking, mouthLevel, w, h, ground, camera }) => {
  const p = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const cam = camera === "pull" ? 1.06 - 0.06 * p : camera === "none" ? 1 : 1 + 0.06 * p;
  const camX = camera === "pan-left" ? 30 - 60 * p : camera === "pan-right" ? -30 + 60 * p : 0;
  const crowd = chars.length >= 4 ? 0.8 : chars.length === 3 ? 0.9 : 1;
  const base = (h * (w < h ? 0.4 : 0.5)) / CHARACTER_HEIGHT;
  const anySpeaker = chars.some((c) => c.speaking);
  // painter's order: the ones lower in z (further right in a pair) are drawn last; a bigger scale stands in front
  const order = [...chars].sort((a, b) => a.scale - b.scale);
  const lookup = (id: string): CastMember => cast.find((m) => m.id === id) ?? DEFAULT_CAST[0];

  return (
    <g transform={`translate(${w / 2 + camX},${ground}) scale(${cam}) translate(${-w / 2},${-ground})`}>
      <StoryBackground bg={bg} time={time} frame={frame} w={w} h={h} ground={ground} />
      {order.map((c, i) => {
        const member = lookup(c.id);
        const tx = (c.x / 100) * w;
        const local = frame - c.delay;
        const enter = interpolate(local, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const fromX = c.x < 50 ? -w * 0.2 : w * 1.2;
        const x = fromX + (tx - fromX) * enter;
        const walking = enter < 1 && local >= 0;
        const speaks = talking && (c.speaking || (!anySpeaker && i === 0));
        const s = base * crowd * c.scale;
        const nameOn = member.name && local >= 0 && local < 70;
        return (
          <g key={c.id + i} transform={`translate(${x},${ground + 6 + (c.scale > 1 ? 14 : 0)}) scale(${s})`} opacity={local < 0 ? 0 : 1}>
            <Character member={member} pose={walking ? "walk" : c.pose} mood={c.mood} frame={Math.max(0, local)} talking={speaks} mouthLevel={speaks ? mouthLevel : undefined} flip={c.flip} />
            {nameOn && (
              <g transform={`translate(0,${-(510 + 64 * (member.age === "child" ? 1.22 : member.age === "teen" ? 1.08 : 1)) * (member.age === "child" ? 0.62 : member.age === "teen" ? 0.86 : 1) - 62})`} opacity={interpolate(local, [0, 8, 56, 70], [0, 1, 1, 0], { extrapolateRight: "clamp" })}>
                <rect x={-(member.name!.length * 17 + 30)} y={-34} width={member.name!.length * 34 + 60} height={60} rx={30} fill="#fff" stroke="#2B2B2B" strokeWidth={4} />
                <text textAnchor="middle" y={9} fontSize={36} fontWeight={800} fill="#2B2B2B" fontFamily="Inter, sans-serif">{member.name}</text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
