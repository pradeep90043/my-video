import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { z } from "zod";
import { TransitionSeries, linearTiming, springTiming, type TransitionPresentation } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { wipe, type WipeDirection } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { LightLeak } from "@remotion/light-leaks";
import { StickmanScene } from "./StickmanScene";
import { THEMES, WORLD, WORLD_VERTICAL, type ThemeName } from "./theme";
import { KaraokeCaptions } from "./fx/KaraokeCaptions";
import { buildDuckEnvelope, buildTimeline, type SceneInput } from "./fx/timeline";

/** Optional per-project effect switches (video.json "fx"). Everything defaults to on. */
export interface StickmanFx {
  /** "karaoke" word-synced pop captions (default) or "off" */
  captions?: "karaoke" | "off";
  /** scene-to-scene transitions; false = hard cuts */
  transitions?: boolean;
  /** cinematic motion blur while a transition is on screen */
  motionBlur?: boolean;
  /** duck the background music under the voice-over */
  duck?: boolean;
  /** light leaks on "excited" mood changes / scenes with visual.leak */
  leaks?: boolean;
}

/** The slice of a project's video.json the composition needs. */
export interface StickmanProjectData {
  fps: number;
  theme?: ThemeName;
  totalFrames?: number;
  orientation?: "horizontal" | "vertical";
  fx?: StickmanFx;
  /** length of the looping background track in frames (measured by calculateMetadata) */
  musicFrames?: number;
  scenes: SceneInput[];
}

export const stickmanSchema = z.object({
  /** public/content/<project>/ */
  project: z.string(),
  bgMusicVolume: z.number().min(0).max(1).step(0.01),
  voVolume: z.number().min(0).max(1).step(0.01),
});

export type StickmanVideoProps = z.infer<typeof stickmanSchema> & { data?: StickmanProjectData };

const WIPE_DIRS: WipeDirection[] = ["from-left", "from-top-left", "from-bottom-left"];
const SLIDE_DIRS = ["from-right", "from-bottom", "from-right", "from-left"] as const;

export const StickmanVideo: React.FC<StickmanVideoProps> = ({ project, data, bgMusicVolume, voVolume }) => {
  if (!data) throw new Error("StickmanVideo needs project data (loaded by calculateMetadata).");
  const theme = THEMES[data.theme ?? "light"];
  const vertical = data.orientation === "vertical";
  const world = vertical ? WORLD_VERTICAL : WORLD;
  const fx = { captions: "karaoke", transitions: true, motionBlur: true, duck: true, leaks: true, ...data.fx } as Required<StickmanFx>;
  const totalFrames = data.totalFrames ?? 300;

  const tl = useMemo(() => buildTimeline(data.scenes, data.fps, { transitions: fx.transitions, vertical }), [data.scenes, data.fps, fx.transitions, vertical]);
  const duck = useMemo(() => (fx.duck ? buildDuckEnvelope(tl.speech, totalFrames) : null), [tl, fx.duck, totalFrames]);
  // gold pops on dark; on white it washes out, so use a deeper brand orange
  const captionHighlight = data.theme === "dark" ? theme.accents.gold : "#E8590C";

  const presentationFor = (t: NonNullable<(typeof tl.scenes)[number]["out"]>): TransitionPresentation<Record<string, unknown>> => {
    // each presentation has its own props type; TransitionSeries only needs the common shape
    const p: unknown = (() => {
      switch (t.type) {
        case "wipe": return wipe({ direction: WIPE_DIRS[t.index % WIPE_DIRS.length] });
        case "flip": return flip({ direction: "from-right" });
        case "clock": return clockWipe({ width: world.width, height: world.height });
        case "iris": return iris({ width: world.width, height: world.height });
        case "fade": return fade();
        default: return slide({ direction: SLIDE_DIRS[t.index % SLIDE_DIRS.length] });
      }
    })();
    return p as TransitionPresentation<Record<string, unknown>>;
  };

  const series = (
    <TransitionSeries>
      {tl.scenes.flatMap((ts, i) => {
        const el = (
          <TransitionSeries.Sequence key={ts.scene.id} durationInFrames={ts.seqDuration} name={ts.scene.id}>
            <StickmanScene
              sceneId={ts.scene.id}
              text={ts.scene.text}
              visual={ts.visual}
              durationFrames={ts.duration}
              theme={theme}
              prevPose={ts.prevPose}
              prevMood={ts.prevMood}
              vertical={vertical}
              speakFrom={ts.speakFrom}
              speakFrames={ts.speakFrames}
              talkRanges={ts.talkRanges}
            />
          </TransitionSeries.Sequence>
        );
        if (!ts.out) return [el];
        const timing = ts.out.type === "flip" || ts.out.type === "iris"
          ? springTiming({ durationInFrames: ts.out.frames, config: { damping: 200 } })
          : linearTiming({ durationInFrames: ts.out.frames });
        return [el, <TransitionSeries.Transition key={`t${i}`} presentation={presentationFor(ts.out)} timing={timing} />];
      })}
    </TransitionSeries>
  );

  const musicLen = Math.max(30, data.musicFrames ?? totalFrames);
  const musicChunks = bgMusicVolume > 0 ? Math.ceil(totalFrames / musicLen) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <BlurGate windows={fx.motionBlur ? tl.blurWindows : []}>{series}</BlurGate>

      {fx.leaks &&
        tl.scenes.filter((s) => s.leak).map((s, i) => (
          <Sequence key={`leak${s.scene.id}`} from={s.from} durationInFrames={Math.min(s.duration, 45)} name={`leak-${s.scene.id}`}>
            <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none", opacity: 0.65 }}>
              <LightLeak seed={i + 3} hueShift={20 * (i % 6)} />
            </AbsoluteFill>
          </Sequence>
        ))}

      {fx.captions === "karaoke" && <KaraokeCaptions words={tl.words} theme={theme} vertical={vertical} highlight={captionHighlight} />}

      {/* One narration track + SFX at absolute frames (kept outside the motion-blurred tree). */}
      <Audio src={staticFile(`content/${project}/audio/voiceover.mp3`)} volume={voVolume} />
      {tl.sfx.map((e, i) => (
        <Sequence key={i} from={e.frame} durationInFrames={45} layout="none">
          <Audio src={staticFile(e.name === "text-pop" || e.name === "text-whoosh" ? `audio/${e.name}.mp3` : `audio/sfx/${e.name}.mp3`)} volume={e.volume} />
        </Sequence>
      ))}
      {Array.from({ length: musicChunks }, (_, k) => (
        <Sequence key={`m${k}`} from={k * musicLen} durationInFrames={Math.min(musicLen, totalFrames - k * musicLen)} layout="none">
          <Audio src={staticFile("audio/background-music.mp3")} volume={(f) => bgMusicVolume * (duck ? (duck[Math.min(totalFrames - 1, k * musicLen + f)] ?? 1) : 1)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** Wraps children in CameraMotionBlur only while a transition is on screen (it costs `samples`× render time). */
const BlurGate: React.FC<{ windows: [number, number][]; children: React.ReactNode }> = ({ windows, children }) => {
  const frame = useCurrentFrame();
  const inside = windows.some(([a, b]) => frame >= a && frame <= b);
  return inside ? <CameraMotionBlur samples={5} shutterAngle={200}>{children}</CameraMotionBlur> : <>{children}</>;
};
