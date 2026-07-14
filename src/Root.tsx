import "./index.css";
import React from "react";
import { Composition } from "remotion";
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
    </>
  );
};
