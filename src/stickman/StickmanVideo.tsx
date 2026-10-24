import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { MusicBed, speechWindows } from "../shared/components/DuckedMusic";
import { z } from "zod";
import { StickmanScene } from "./StickmanScene";
import { THEMES, type ThemeName } from "./theme";
import type { SpokenWord } from "./captions";
import { StickmanVisualSchema, type Mood, type PoseName } from "./schema";
import { AMBIENT_FADE, ambientEnvelope, planSounds } from "./soundPlan";

/** The slice of a project's video.json the composition needs. */
export interface StickmanProjectData {
  fps: number;
  theme?: ThemeName;
  totalFrames?: number;
  orientation?: "horizontal" | "vertical";
  /** realism sounds (all default on): looping ambience, one-shot foley, and picking them from the narration text */
  fx?: { ambience?: boolean; foley?: boolean; autoSound?: boolean };
  /** optional music files under public/ (e.g. "audio/music-2.mp3"); a new one starts at every chapter scene, crossfaded. No default: the old bundled track matched a commercial song (Content ID risk), so music is opt-in and must be copyright-cleared. */
  music?: string[];
  /** Lip-sync: mouth level 0..1 per video frame (voiceover.env.json); absent = generic flap */
  mouth?: number[];
  /** storyboard template: who is in the story */
  cast?: import("./story/cast").CastMember[];
  scenes: { id: string; text: string; startFrame?: number; durationFrames?: number; duration?: number; pauseBefore?: number; visual?: unknown; words?: SpokenWord[] }[];
}

export const stickmanSchema = z.object({
  /** public/content/<project>/ */
  project: z.string(),
  bgMusicVolume: z.number().min(0).max(1).step(0.01),
  voVolume: z.number().min(0).max(1).step(0.01),
});

export type StickmanVideoProps = z.infer<typeof stickmanSchema> & { data?: StickmanProjectData };

const RISER_FRAMES = 36; // public/audio/sfx/riser.mp3 is 1.2 s at 30 fps

export const StickmanVideo: React.FC<StickmanVideoProps> = ({ project, data, bgMusicVolume, voVolume }) => {
  if (!data) throw new Error("StickmanVideo needs project data (loaded by calculateMetadata).");
  const theme = THEMES[data.theme ?? "light"];

  const speech = speechWindows(data.scenes, data.fps);
  const total = data.totalFrames ?? Math.max(...data.scenes.map((sc) => (sc.startFrame ?? 0) + (sc.durationFrames ?? 150)));
  // a chapter "starts" where the chapter tag changes (consecutive scenes often repeat the same tag)
  const chapterStarts: number[] = [];
  let prevChapter = "";
  data.scenes.forEach((sc, i) => {
    const ch = StickmanVisualSchema.safeParse(sc.visual ?? {}).data?.chapter ?? "";
    if (ch !== "" && ch !== prevChapter && i > 0) chapterStarts.push(sc.startFrame ?? 0);
    if (ch !== "") prevChapter = ch;
  });
  const tracks = data.music?.length ? data.music : [];
  const bounds = [0, ...(tracks.length > 1 ? chapterStarts : []), total];
  const musicSections = tracks.length === 0 ? [] : bounds.slice(0, -1).map((from, i) => ({ from, to: bounds[i + 1], src: tracks[i % tracks.length] }));
  const risers = chapterStarts.map((f) => Math.max(0, f - RISER_FRAMES + 6));

  const fx = { ambience: true, foley: true, autoSound: true, ...data.fx };
  const sounds = React.useMemo(() => planSounds(data.scenes, data.fps, { autoSound: fx.autoSound }), [data.scenes, data.fps, fx.autoSound]);

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
            <StickmanScene cast={data.cast} index={index} words={scene.words} text={scene.text} visual={visual} durationFrames={duration} startFrame={from} mouth={data.mouth} theme={theme} prevPose={prevPose} prevMood={prevMood} vertical={data.orientation === "vertical"}
              speakFrom={Math.round((scene.pauseBefore ?? 0) * data.fps)}
              speakFrames={scene.duration !== undefined ? Math.round(scene.duration * data.fps) : undefined} />
          </Sequence>
        );
        prevPose = visual.pose;
        prevMood = visual.mood;
        return el;
      })}
      <Audio src={staticFile(`content/${project}/audio/voiceover.mp3`)} volume={voVolume} />
      {fx.ambience &&
        sounds.ambient.map((amb, i) => {
          const dur = amb.to - amb.from + AMBIENT_FADE; // the tail overlaps the next bed's fade-in
          return (
            <Sequence key={`amb${i}`} from={amb.from} durationInFrames={dur} layout="none" name={`ambient-${amb.name}`}>
              <Audio src={staticFile(`audio/ambient/${amb.name}.mp3`)} loop volume={(f) => amb.gain * ambientEnvelope(f, dur)} />
            </Sequence>
          );
        })}
      {fx.foley &&
        sounds.foley.map((e, i) => (
          <Sequence key={`fol${i}`} from={e.frame} durationInFrames={e.durationFrames} layout="none" name={`foley-${e.name}`}>
            <Audio src={staticFile(`audio/foley/${e.name}.mp3`)} volume={(f) => e.volume * Math.min(1, (e.durationFrames - f) / 6)} />
          </Sequence>
        ))}
      {bgMusicVolume > 0 && musicSections.map((m, i) => (
        <Sequence key={`music-${i}`} from={m.from} durationInFrames={m.to - m.from} name={`music ${i + 1}`}>
          <MusicBed windows={speech} volume={bgMusicVolume} src={m.src} from={m.from} to={m.to} first={i === 0} last={i === musicSections.length - 1} />
        </Sequence>
      ))}
      {/* a riser into every new chapter: a small pattern interrupt at section changes */}
      {risers.map((f) => (
        <Sequence key={`riser-${f}`} from={f} durationInFrames={RISER_FRAMES}>
          <Audio src={staticFile("audio/sfx/riser.mp3")} volume={0.3} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
