import React from "react";
import { STORY_FONT } from "./font";
import { StoryFxLayer, StoryPropArt, type StoryFx, type StoryPropName } from "./StoryProps";import { Easing, interpolate } from "remotion";
import { StoryBackground } from "./Backgrounds";
import { Character, CHARACTER_HEIGHT } from "./Character";
import { DEFAULT_CAST, type CastMember, type StagedChar, type StoryBgName, type StoryLook, type StoryTime } from "./cast";

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
  /** same shot as the previous beat: people stay (walking to their new spot), nothing re-enters */
  cont?: boolean;
  /** spoken words (seconds from the start of the line), the line's first frame and the video frame the scene starts at: gestures and lips follow the voice */
  words?: { text: string; start: number; end: number }[];
  speakFrom?: number;
  startFrame?: number;
  fps?: number;
  look?: StoryLook;
  props?: { type: string; x: number; air: number; scale: number; anim: string; delay: number }[];
  fx?: StoryFx;
  headline?: string;
  stat?: { label: string; value: string };
  place?: string;
}

const wrap = (text: string, per: number): string[] => {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if ((cur + " " + word).trim().length > per && cur) { lines.push(cur); cur = word; } else cur = (cur + " " + word).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
};

/** The niche frame drawn over the scene: news = breaking badge + place + headline bar; finance = heading strip + one big figure. */
const LookOverlay: React.FC<{ look: StoryLook; headline?: string; stat?: { label: string; value: string }; place?: string; frame: number; w: number }> = ({ look, headline, stat, place, frame, w }) => {
  const slide = interpolate(frame, [0, 14], [-260, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const vertical = w < 1400;
  const per = vertical ? 17 : 34;
  const size = vertical ? 54 : 50;
  const lines = headline ? wrap(headline, per) : [];
  if (look === "news") {
    return (
      <g transform={`translate(0,${slide})`}>
        <g transform="translate(40,60)">
          <rect width={210} height={58} rx={10} fill="#C0392B" /><circle cx={30} cy={29} r={9} fill="#fff" opacity={0.6 + 0.4 * Math.sin(frame * 0.3)} />
          <text x={50} y={40} fontSize={30} fontWeight={900} fill="#fff" fontFamily={STORY_FONT}>BREAKING</text>
          {place && <g transform="translate(224,0)"><rect width={place.length * 24 + 44} height={58} rx={10} fill="#0A1B3F" stroke="#3B6FD4" strokeWidth={3} /><text x={22} y={40} fontSize={30} fontWeight={800} fill="#fff" fontFamily={STORY_FONT}>📍 {place}</text></g>}
        </g>
        {lines.length > 0 && (
          <g transform="translate(40,140)">
            <rect width={w - 80} height={lines.length * (size + 14) + 36} rx={14} fill="#0A1B3F" stroke="#3B6FD4" strokeWidth={4} opacity={0.96} />
            <rect width={14} height={lines.length * (size + 14) + 36} rx={7} fill="#F1C40F" />
            {lines.map((l, i) => <text key={i} x={40} y={26 + size + i * (size + 14)} fontSize={size} fontWeight={900} fill="#fff" fontFamily={STORY_FONT}>{l}</text>)}
          </g>
        )}
      </g>
    );
  }
  if (look === "finance") {
    const pop = interpolate(frame, [6, 22], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.8)) });
    return (
      <g transform={`translate(0,${slide})`}>
        {lines.length > 0 && (
          <g transform="translate(40,70)">
            <rect width={w - 80} height={lines.length * (size + 12) + 30} rx={16} fill="#0B6E4F" />
            {lines.map((l, i) => <text key={i} x={36} y={20 + size + i * (size + 12)} fontSize={size} fontWeight={900} fill="#fff" fontFamily={STORY_FONT}>{l}</text>)}
          </g>
        )}
        {stat && (
          <g transform={`translate(${w - (vertical ? 350 : 460)},${vertical ? 120 + lines.length * (size + 12) + 60 : 200}) scale(${pop})`} opacity={Math.min(1, pop * 1.4)}>
            <rect width={vertical ? 310 : 420} height={170} rx={22} fill="#fff" stroke="#0B6E4F" strokeWidth={6} />
            <text x={(vertical ? 310 : 420) / 2} y={92} textAnchor="middle" fontSize={stat.value.length > 7 ? 54 : 74} fontWeight={900} fill="#0B6E4F" fontFamily={STORY_FONT}>{stat.value}</text>
            <text x={(vertical ? 310 : 420) / 2} y={142} textAnchor="middle" fontSize={30} fontWeight={800} fill="#2B2B2B" fontFamily={STORY_FONT}>{stat.label}</text>
          </g>
        )}
      </g>
    );
  }
  return null;
};

/** A storyboard frame: the story's background and the people in it, placed left to right, entering with a short walk. */
export const StoryStage: React.FC<Props> = ({ bg, time, chars, cast, frame, durationFrames, talking, mouthLevel, w, h, ground, camera, cont = false, words, speakFrom = 0, startFrame = 0, fps = 30, look = "story", props = [], fx = "none", headline, stat, place }) => {
  const p = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  // a storyboard shot does not zoom: every beat restarting the push looked like the frame jumping
  void p; void camera;
  const cam = 1;
  const camX = 0;
  const crowd = chars.length >= 4 ? 0.8 : chars.length === 3 ? 0.9 : 1;
  const base = (h * (w < h ? 0.4 : 0.62)) / CHARACTER_HEIGHT;
  const anySpeaker = chars.some((c) => c.speaking);
  // the voice: each word gives the speaker a push; the lips open while a word is being said
  const wf = (words ?? []).map((wd) => ({ s: speakFrom + wd.start * fps, e: speakFrom + wd.end * fps }));
  const spoken = wf.filter((x) => x.s <= frame);
  const energy = Math.min(1, spoken.reduce((a, x) => a + Math.exp(-(frame - x.s) / 6), 0));
  const gestureFloat = spoken.length / 4;
  const inWord = wf.find((x) => frame >= x.s && frame < x.e);
  const voiceMouth = wf.length ? (inWord ? 0.35 + 0.55 * Math.abs(Math.sin((frame - inWord.s) * 0.9)) : 0.04) : mouthLevel;
  const clock = frame + startFrame; // the world's own clock: clouds, stars and breathing carry on across beats
  // painter's order: the ones lower in z (further right in a pair) are drawn last; a bigger scale stands in front
  const order = [...chars].sort((a, b) => a.scale - b.scale);
  const lookup = (id: string): CastMember => cast.find((m) => m.id === id) ?? DEFAULT_CAST[0];

  return (
    <g>
    <g transform={`translate(${w / 2 + camX},${ground}) scale(${cam}) translate(${-w / 2},${-ground})`}>
      <StoryBackground bg={bg} time={time} frame={clock} w={w} h={h} ground={ground} />
      {props.map((pr, k) => {
        const px = (pr.x / 100) * w;
        const py = ground + 6 - pr.air * 260;
        const sc = (h * (w < h ? 0.4 : 0.62) / 590) * pr.scale * 1.15;
        return (
          <g key={`p${k}`} transform={`translate(${px},${py}) scale(${sc})`}>
            <StoryPropArt type={pr.type as StoryPropName} anim={pr.anim as never} frame={clock} delay={pr.delay} />
          </g>
        );
      })}
      {order.map((c, i) => {
        const member = lookup(c.id);
        const tx = (c.x / 100) * w;
        const local = frame - c.delay;
        // a new shot: everybody walks in; the same shot: they stay and walk from where they stood to where they stand now
        const stays = cont && c.fromX !== undefined;
        const fx = stays ? (c.fromX! / 100) * w : c.x < 50 ? -w * 0.2 : w * 1.2;
        const dur = stays ? 16 : 20;
        const enter = interpolate(local, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
        const popIn = cont && c.fromX === undefined ? interpolate(local, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
        const x = cont && c.fromX === undefined ? tx : fx + (tx - fx) * enter;
        const walking = enter < 1 && local >= 0 && Math.abs(tx - fx) > 30;
        const isSpeaker = c.speaking || (!anySpeaker && i === 0);
        // acting: eases in over the first frames of the sentence and relaxes towards its end; the staged pose lasts about a second
        const envelope = interpolate(local, [0, 8, Math.max(9, durationFrames - 10), durationFrames], [0, 1, 1, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const poseWeight = interpolate(local, [0, 6, 28, 46], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const speaks = talking && isSpeaker;
        const s = base * crowd * c.scale;
        const nameOn = member.name && !cont && local >= 0 && local < 70;
        return (
          <g key={c.id + i} transform={`translate(${x},${ground + 6 + (c.scale > 1 ? 14 : 0)}) scale(${s})`} opacity={local < 0 ? 0 : popIn}>
            <Character member={member} pose={walking ? "walk" : c.pose} mood={c.mood} frame={clock} talking={speaks} mouthLevel={speaks ? voiceMouth : undefined} flip={c.flip} energy={speaks ? energy : 0} gesture={gestureFloat + i} listening={talking && !isSpeaker} envelope={envelope} poseWeight={poseWeight} holds={c.holds as StoryPropName | undefined} />
            {nameOn && (
              <g transform={`translate(0,${-(510 + 64 * (member.age === "child" ? 1.22 : member.age === "teen" ? 1.08 : 1)) * (member.age === "child" ? 0.62 : member.age === "teen" ? 0.86 : 1) - 62})`} opacity={interpolate(local, [0, 8, 56, 70], [0, 1, 1, 0], { extrapolateRight: "clamp" })}>
                <rect x={-(member.name!.length * 17 + 30)} y={-34} width={member.name!.length * 34 + 60} height={60} rx={30} fill="#fff" stroke="#2B2B2B" strokeWidth={4} />
                <text textAnchor="middle" y={9} fontSize={36} fontWeight={800} fill="#2B2B2B" fontFamily={STORY_FONT}>{member.name}</text>
              </g>
            )}
          </g>
        );
      })}
      <StoryFxLayer fx={fx} frame={clock} w={w} h={h} />
    </g>
    {look !== "story" && <LookOverlay look={look} headline={headline} stat={stat} place={place} frame={frame} w={w} />}
    </g>
  );
};
