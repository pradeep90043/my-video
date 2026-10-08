import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { StickmanScene } from "./StickmanScene";
import { THEMES, type ThemeName } from "./theme";
import { StickmanVisualSchema, type Mood, type PoseName } from "./schema";

/** The slice of a project's video.json the composition needs. */
export interface StickmanProjectData {
  fps: number;
  theme?: ThemeName;
  totalFrames?: number;
  orientation?: "horizontal" | "vertical";
  scenes: { id: string; text: string; startFrame?: number; durationFrames?: number; duration?: number; pauseBefore?: number; visual?: unknown }[];
}

export const stickmanSchema = z.object({
  /** public/content/<project>/ */
  project: z.string(),
  bgMusicVolume: z.number().min(0).max(1).step(0.01),
  voVolume: z.number().min(0).max(1).step(0.01),
});

export type StickmanVideoProps = z.infer<typeof stickmanSchema> & { data?: StickmanProjectData };

type SpeechWindow = [number, number];

/**
 * Background music that ducks under the voice. Speech windows come from the scene timing
 * (startFrame + pauseBefore .. + duration), so no audio analysis is needed. `bgMusicVolume` is the level
 * under speech; the bed swells to ~2.2x in pauses, fades in over 1 s and out over 2 s.
 */
const MusicBed: React.FC<{ windows: SpeechWindow[]; volume: number }> = ({ windows, volume }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const attack = Math.round(fps * 0.25);
  const release = Math.round(fps * 0.7);
  let level = 1; // 1 = open (no speech), 0 = fully ducked
  for (const [a, b] of windows) {
    if (frame < a - attack || frame > b + release) continue;
    level = Math.min(level, interpolate(frame, [a - attack, a, b, b + release], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  const gain = volume * (1 + 1.2 * level);
  const fade = interpolate(frame, [0, fps, durationInFrames - 2 * fps, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <Audio src={staticFile("audio/background-music.mp3")} volume={Math.max(0, Math.min(1, gain * fade))} loop />;
};

export const StickmanVideo: React.FC<StickmanVideoProps> = ({ project, data, bgMusicVolume, voVolume }) => {
  if (!data) throw new Error("StickmanVideo needs project data (loaded by calculateMetadata).");
  const theme = THEMES[data.theme ?? "light"];

  const speech: SpeechWindow[] = data.scenes.map((sc) => {
    const a = (sc.startFrame ?? 0) + Math.round((sc.pauseBefore ?? 0) * data.fps);
    const len = sc.duration !== undefined ? Math.round(sc.duration * data.fps) : (sc.durationFrames ?? 150) - Math.round((sc.pauseBefore ?? 0) * data.fps);
    return [a, a + Math.max(1, len)];
  });

  let prevPose: PoseName = "idle";
  let prevMood: Mood | undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {data.scenes.map((scene, index) => {
        const from = scene.startFrame ?? 0;
        const duration = scene.durationFrames ?? 150;
        const visual = StickmanVisualSchema.parse(scene.visual ?? {});
        const el = (
          <Sequence key={scene.id} from={from} durationInFrames={duration} name={scene.id}>
            <StickmanScene index={index} text={scene.text} visual={visual} durationFrames={duration} theme={theme} prevPose={prevPose} prevMood={prevMood} vertical={data.orientation === "vertical"}
              speakFrom={Math.round((scene.pauseBefore ?? 0) * data.fps)}
              speakFrames={scene.duration !== undefined ? Math.round(scene.duration * data.fps) : undefined} />
          </Sequence>
        );
        prevPose = visual.pose;
        prevMood = visual.mood;
        return el;
      })}
      <Audio src={staticFile(`content/${project}/audio/voiceover.mp3`)} volume={voVolume} />
      {bgMusicVolume > 0 && <MusicBed windows={speech} volume={bgMusicVolume} />}
    </AbsoluteFill>
  );
};
