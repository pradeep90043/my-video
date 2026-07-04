import "./index.css";
import React from "react";
import videoData from "../public/content/AivsSWE/video.json";
import { Composition, getStaticFiles, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import {
  CODE_OR_CAP_DURATION_FRAMES,
  CODE_OR_CAP_FPS,
  CodeOrCapVideo,
  codeOrCapSchema,
} from "./shorts/codeorcap/CodeOrCapVideo";
import { defaultCodeOrCapConfig } from "./shorts/codeorcap/types";
import { CSDegree5MinVideo } from "./longs/CSDegree5MinVideo";
import { AIvsSWEVideo, aiVsSWESchema } from "./longs/AIvsSWEVideo";
import { AIVideo, aiVideoSchema } from "./shorts/components/AIVideo";
import { FactoryVideo, factoryVideoSchema } from "./shorts/components/FactoryVideo";
import { ThreeCube } from "./shorts/compositions/ThreeCubeComposition";
import { AIVideoRoot } from "./shorts/compositions/Video";
import { FPS, INTRO_DURATION } from "./shared/lib/constants";
import { DURATION, FPS as AI_FPS } from "./shared/utils/constants";
import { getTimelinePath, loadTimelineFromFile } from "./shared/lib/utils";

export const RemotionRoot: React.FC = () => {
  const staticFiles = getStaticFiles();
  const timelines = staticFiles
    .filter((file) => file.name.endsWith("timeline.json"))
    .map((file) => file.name.split("/")[1]);

  return (
    <>
      <Composition
        id="CodeOrCap"
        component={CodeOrCapVideo}
        fps={CODE_OR_CAP_FPS}
        width={1080}
        height={1920}
        durationInFrames={CODE_OR_CAP_DURATION_FRAMES}
        schema={codeOrCapSchema}
        defaultProps={defaultCodeOrCapConfig}
        calculateMetadata={async ({ props }) => {
          let merged = { ...defaultCodeOrCapConfig, ...props };
          try {
            const res = await fetch(staticFile("content/codeorcap/input.json"));
            if (res.ok) merged = { ...defaultCodeOrCapConfig, ...(await res.json()) };
          } catch {}

          let durationInFrames = CODE_OR_CAP_DURATION_FRAMES;
          if (merged.voiceoverTrack) {
            try {
              const secs = await getAudioDurationInSeconds(staticFile(merged.voiceoverTrack));
              // video = audio + 1.5s buffer for outro to breathe
              durationInFrames = Math.ceil((secs + 1.5) * CODE_OR_CAP_FPS);
            } catch {}
          }

          return { props: merged, durationInFrames };
        }}
      />
      <Composition
        id="CSDegree5Min"
        component={CSDegree5MinVideo}
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={8800}
      />
      <Composition
        id="AIvsSWE"
        component={AIvsSWEVideo}
        fps={videoData.fps}
        width={1920}
        height={1080}
        durationInFrames={videoData.totalFrames + 600}
        schema={aiVsSWESchema}
        defaultProps={{
          logoBottom: 113,
          logoRight: 80,
          logoScale: 1.5,
          logoOpacity: 0.75,
          blurAmount: 3,
          logoBackgroundTransparency: 1,
          previewMode: false,
        }}
      />
      <Composition
        id="FactoryVideo"
        component={FactoryVideo}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={30 * 60}
        schema={factoryVideoSchema}
        defaultProps={{ slug: "preview", videoPath: "content/factory/preview/video.json" }}
        calculateMetadata={async ({ props }) => {
          try {
            const res = await fetch(staticFile(props.videoPath));
            if (res.ok) {
              const data = await res.json();
              const durationSecs = data.duration ?? 45;
              return { durationInFrames: Math.ceil((durationSecs + 2) * 30), props };
            }
          } catch {}
          return { durationInFrames: 30 * 60, props };
        }}
      />
      {timelines.map((storyName) => (
        <Composition
          key={storyName}
          id={storyName}
          component={AIVideo}
          fps={FPS}
          width={1080}
          height={1920}
          schema={aiVideoSchema}
          defaultProps={{
            timeline: null,
          }}
          calculateMetadata={async ({ props }) => {
            const { lengthFrames, timeline } = await loadTimelineFromFile(
              getTimelinePath(storyName),
            );

            return {
              durationInFrames: lengthFrames + INTRO_DURATION,
              props: {
                ...props,
                timeline,
              },
            };
          }}
        />
      ))}
      <Composition
        id="ThreeCube"
        component={ThreeCube}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={30 * 10}
      />
      <Composition
        id="AiReplaceFrontend"
        component={AIVideoRoot}
        fps={AI_FPS}
        width={1080}
        height={1920}
        durationInFrames={DURATION.composition * AI_FPS}
      />
    </>
  );
};
