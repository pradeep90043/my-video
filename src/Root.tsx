import { Story3DDemo } from "./three3d/Story3DDemo";
import { ActivityDemo } from "./three3d/ActivityDemo";
import { PuppetSheet } from "./stickman/story/puppet/PuppetSheet";
import { StageDemo } from "./stickman/story/StageDemo";
import { RideSheet } from "./stickman/story/puppet/RideSheet";
import horsePuppet from "./stickman/story/puppet/examples/horse.json";
import kingPuppet from "./stickman/story/puppet/examples/king.json";
import elephantPuppet from "./stickman/story/puppet/examples/elephant.json";
import "./index.css";
import React from "react";
import { Composition, staticFile } from "remotion";
import { FactoryVideo, factoryVideoSchema } from "./factory/FactoryVideo";
import {
  VibeCodingNotProgrammingVideo,
  vibeCodingSchema,
} from "./codeorcap/longs/VibeCodingNotProgrammingVideo";
import { VibeCodingNotProgrammingShort } from "./codeorcap/shorts/VibeCodingNotProgrammingShort";
import {
  MaaKiDiaryVideo,
  maaKiDiarySchema,
} from "./storiyum/longs/MaaKiDiaryVideo";
import vibeCodingData from "../public/content/VibeCodingNotProgramming/video.json";
import vibeShortData from "../public/content/VibeCodingNotProgrammingShort/video.json";
import maaKiDiaryData from "../public/content/MaaKiDiary/video.json";
import collageData from "../public/content/collage-animation/video.json";
import { StickmanVideo, stickmanSchema, type StickmanProjectData } from "./stickman/StickmanVideo";
import { DoodleCatalog } from "./stickman/doodle/DoodleCatalog";
import {
  CollageAnimationVideo,
  collageAnimationSchema,
} from "./codeorcap/longs/CollageAnimationVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Short (9:16 vertical) — VibeCoding NotProgramming */}
      <Composition
        id="VibeCodingNotProgrammingShort"
        component={VibeCodingNotProgrammingShort}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={vibeShortData.totalFrames || 1440}
      />

      {/* Main content only — no intro/outro; stitch separately via npm run stitch */}
      <Composition
        id="VibeCodingNotProgramming"
        component={VibeCodingNotProgrammingVideo}
        fps={vibeCodingData.fps}
        width={1920}
        height={1080}
        durationInFrames={vibeCodingData.totalFrames || 8340}
        schema={vibeCodingSchema}
        defaultProps={{
          logoBottom: 145,
          logoRight: 134,
          logoScale: 0.8,
          logoImageScale: 4.35,
          logoOpacity: 0.75,
          blurAmount: 3,
          logoBackgroundTransparency: 1,
          previewMode: false,
          avatarBottom: 113,
          avatarLeft: 80,
          avatarScale: 1,
          avatarOpacity: 1,
          avatar3dX: 0,
          avatar3dY: 0.1,
          avatar3dZ: 0,
          lipSyncOffset: 4,
        }}
      />

      {/* Maa Ki Diary */}
      <Composition
        id="MaaKiDiary"
        component={MaaKiDiaryVideo}
        fps={maaKiDiaryData.fps}
        width={1920}
        height={1080}
        durationInFrames={maaKiDiaryData.totalFrames || 18000}
        schema={maaKiDiarySchema}
        defaultProps={{
          logoBottom: 145,
          logoRight: 134,
          logoScale: 0.8,
          logoOpacity: 0.75,
          bgMusicVolume: 0.15,
          voVolume: 0.9,
          previewMode: false,
        }}
      />
      {/* Collage Animation */}
      <Composition
        id="collage-animation"
        component={CollageAnimationVideo}
        fps={collageData.fps}
        width={1920}
        height={1080}
        durationInFrames={collageData.totalFrames || 1493}
        schema={collageAnimationSchema}
        defaultProps={{
          logoBottom: 145,
          logoRight: 134,
          logoScale: 0.8,
          logoOpacity: 0.75,
          bgMusicVolume: 0.12,
          voVolume: 0.95,
          previewMode: false,
        }}
      />
      {/* Stickman explainer — any project with "template": "stickman" in its video.json.
          Render with: --props='{"project":"<slug>"}' (scripts/longs/render.ts does this). */}
      <Composition
        id="StickmanVideo"
        component={StickmanVideo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={300}
        schema={stickmanSchema}
        defaultProps={{ project: "stickman-demo", bgMusicVolume: 0.06, voVolume: 1 }}
        calculateMetadata={async ({ props }) => {
          const res = await fetch(staticFile(`content/${props.project}/video.json`));
          if (!res.ok) throw new Error(`Cannot load content/${props.project}/video.json (${res.status})`);
          const data = (await res.json()) as StickmanProjectData;
          try {
            // optional lip-sync track written by `longform:merge`
            const env = await fetch(staticFile(`content/${props.project}/audio/voiceover.env.json`));
            if (env.ok) {
              const j = (await env.json()) as { fps: number; levels: number[] };
              if (j.fps === data.fps && Array.isArray(j.levels)) data.mouth = j.levels;
            }
          } catch {
            /* no envelope: the mouth falls back to the generic flap */
          }
          return {
            fps: data.fps,
            ...(data.orientation === "vertical" ? { width: 1080, height: 1920 } : {}),
            durationInFrames: Math.max(1, data.totalFrames ?? 300),
            props: { ...props, data },
          };
        }}
      />

      {/* Dev preview: contact sheet of every doodle asset (npx remotion still DoodleCatalog out/doodle-catalog.png) */}
      <Composition id="DoodleCatalog" component={DoodleCatalog} fps={30} width={1760} height={2900} durationInFrames={1} />
      {/* 3D proof (branch feat/3d-characters): a procedural rigged wolf, orbiting camera */}
      <Composition id="Story3DDemo" component={Story3DDemo} width={720} height={1280} fps={30} durationInFrames={120} />
      <Composition id="PuppetSheet" component={PuppetSheet as React.FC<any>} width={1500} height={1080} fps={30} durationInFrames={1} defaultProps={{ spec: elephantPuppet }} />
      <Composition id="RideSheet" component={RideSheet as React.FC<any>} width={1500} height={1080} fps={30} durationInFrames={1} defaultProps={{ mount: horsePuppet, rider: kingPuppet }} />
      <Composition id="StageDemo" component={StageDemo as React.FC<any>} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{ scenery: { id: "x", sky: ["#7EC8F2", "#E9F7FF"], layers: [] }, cast: [], chars: [] }} />
      <Composition id="ActivityDemo" component={ActivityDemo} width={720} height={1280} fps={30} durationInFrames={360} />

      {/**
       * FactoryVideo — universal pipeline-driven composition.
       *
       * Dimensions and duration are resolved at render time via calculateMetadata()
       * from the video.json written by the pipeline:
       *   mode: "long"  → landscape 1920×1080  (10-min long-form)
       *   mode: "short" → portrait  1080×1920  (30-60s Short/Reel)
       *
       * Render with:
       *   npx remotion render FactoryVideo --props='{"slug":"my-slug","videoPath":"content/factory/my-slug/video.json"}'
       */}
      <Composition
        id="FactoryVideo"
        component={FactoryVideo}
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={18000}
        schema={factoryVideoSchema}
        defaultProps={{
          slug: "factory-preview",
          videoPath: "content/factory/factory-preview/video.json",
          bgMusicVolume: 0.1,
          voVolume: 1,
        }}
        calculateMetadata={async ({ props }) => {
          const res = await fetch(staticFile(props.videoPath));
          if (!res.ok) {
            // Fallback: landscape defaults if no video.json yet
            return { width: 1920, height: 1080, durationInFrames: 18000, fps: 30, props };
          }
          const data = await res.json();
          const isLong =
            data.mode === "long" ||
            data.script?.mode === "long" ||
            data.publishMode === "day1-long" ||
            data.metadata?.mode === "long";
          const videoFps: number = data.fps ?? 30;
          const totalFrames: number = data.totalFrames ?? (isLong ? 18000 : 1800);
          return {
            fps: videoFps,
            width: isLong ? 1920 : 1080,
            height: isLong ? 1080 : 1920,
            durationInFrames: Math.max(1, totalFrames),
            props: { ...props, data: { ...data, mode: isLong ? "long" : "short" } },
          };
        }}
      />
    </>
  );
};
