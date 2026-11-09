import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FlatShotLayer, FLAT_FONT } from "./FlatShot";
import { CharacterSchema, type FlatVideoSpec } from "./spec";
import { wrap } from "./Graphics";

/** FLAT-VECTOR on its own: shots one after another with short crossfades, optional narration and subtitles. */
const FADE = 8;

export const flatFrames = (spec: Pick<FlatVideoSpec, "shots">, fps: number) => Math.max(1, Math.round(spec.shots.reduce((n, s) => n + s.sec, 0) * fps));

const Fade: React.FC<{ len: number; on: boolean; children: React.ReactNode }> = ({ len, on, children }) => {
  const frame = useCurrentFrame();
  const o = on ? interpolate(frame, [0, len], [0, 1], { extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Subtitle: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const o = interpolate(frame, [0, 6, dur - 4, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lines = wrap(text, width > height ? 52 : 30).slice(0, 3);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: height * 0.035, opacity: o }}>
      <div style={{ background: "rgba(10,10,18,0.72)", borderRadius: 18 * u, padding: `${12 * u}px ${26 * u}px`, maxWidth: width * 0.86 }}>
        {lines.map((l, i) => <div key={i} style={{ color: "#fff", fontFamily: FLAT_FONT, fontWeight: 700, fontSize: 36 * u, textAlign: "center", lineHeight: 1.3 }}>{l}</div>)}
      </div>
    </AbsoluteFill>
  );
};

export const FlatVideo: React.FC<FlatVideoSpec> = (spec) => {
  const { fps } = useVideoConfig();
  const characters = spec.characters.map((c) => CharacterSchema.parse(c));
  let start = 0;
  return (
    <AbsoluteFill style={{ background: "#0b0b12" }}>
      {spec.shots.map((s, i) => {
        const len = Math.round(s.sec * fps);
        const fadeIn = i > 0 && !s.cont;
        const from = Math.max(0, start - (fadeIn ? FADE : 0));
        const el = (
          <Sequence key={i} from={from} durationInFrames={len + (start - from)}>
            <Fade len={FADE} on={fadeIn}>
              <FlatShotLayer shot={s} characters={characters} durationFrames={len + (start - from)} uid={`s${i}`} drawn={spec.drawn} />
            </Fade>
            {spec.captions && s.caption && <Sequence from={start - from}><Subtitle text={s.caption} dur={len} /></Sequence>}
          </Sequence>
        );
        start += len;
        return el;
      })}
      {spec.audio && <Audio src={/^https?:/.test(spec.audio) ? spec.audio : staticFile(spec.audio)} />}
    </AbsoluteFill>
  );
};
