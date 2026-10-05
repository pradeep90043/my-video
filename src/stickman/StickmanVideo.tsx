import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { z } from "zod";
import { StickmanScene } from "./StickmanScene";
import { THEMES, type ThemeName } from "./theme";
import { StickmanVisualSchema, type PoseName } from "./schema";

/** The slice of a project's video.json the composition needs. */
export interface StickmanProjectData {
  fps: number;
  theme?: ThemeName;
  totalFrames?: number;
  scenes: { id: string; text: string; startFrame?: number; durationFrames?: number; visual?: unknown }[];
}

export const stickmanSchema = z.object({
  /** public/content/<project>/ */
  project: z.string(),
  bgMusicVolume: z.number().min(0).max(1).step(0.01),
  voVolume: z.number().min(0).max(1).step(0.01),
});

export type StickmanVideoProps = z.infer<typeof stickmanSchema> & { data?: StickmanProjectData };

export const StickmanVideo: React.FC<StickmanVideoProps> = ({ project, data, bgMusicVolume, voVolume }) => {
  if (!data) throw new Error("StickmanVideo needs project data (loaded by calculateMetadata).");
  const theme = THEMES[data.theme ?? "light"];

  let prevPose: PoseName = "idle";
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {data.scenes.map((scene) => {
        const from = scene.startFrame ?? 0;
        const duration = scene.durationFrames ?? 150;
        const visual = StickmanVisualSchema.parse(scene.visual ?? {});
        const el = (
          <Sequence key={scene.id} from={from} durationInFrames={duration} name={scene.id}>
            <StickmanScene text={scene.text} visual={visual} durationFrames={duration} theme={theme} prevPose={prevPose} />
          </Sequence>
        );
        prevPose = visual.pose;
        return el;
      })}
      <Audio src={staticFile(`content/${project}/audio/voiceover.mp3`)} volume={voVolume} />
      {bgMusicVolume > 0 && <Audio src={staticFile("audio/background-music.mp3")} volume={bgMusicVolume} loop />}
    </AbsoluteFill>
  );
};
