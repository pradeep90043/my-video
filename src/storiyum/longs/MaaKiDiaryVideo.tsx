import { DuckedMusic } from "../../shared/components/DuckedMusic";
import React from "react";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  Img,
  interpolate,
  Easing,
  Audio,
} from "remotion";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { z } from "zod";
import diaryData from "../../../public/content/MaaKiDiary/video.json";

// Load premium fonts
const lora = loadLora();
const inter = loadInter();

const theme = {
  bgDark: "#0B0A0A",
  textNarrator: "#FFFFFF",
  textMaa: "#F9E8C9", // Soft golden cream
  shadowNarrator: "rgba(0, 0, 0, 0.8)",
  shadowMaa: "rgba(91, 57, 18, 0.6)",
};

export const maaKiDiarySchema = z.object({
  logoBottom: z.number().min(0).max(1080).step(1),
  logoRight: z.number().min(0).max(1920).step(1),
  logoScale: z.number().min(0.1).max(5).step(0.1),
  logoOpacity: z.number().min(0).max(1).step(0.05),
  bgMusicVolume: z.number().min(0).max(1).step(0.01),
  voVolume: z.number().min(0).max(1).step(0.01),
  previewMode: z.boolean(),
});

export type MaaKiDiaryProps = z.infer<typeof maaKiDiarySchema>;

// Background image component with Ken Burns effect
const KenBurnsImage: React.FC<{
  src: string;
  startFrame: number;
  durationFrames: number;
  sceneId: string;
  isFlashback: boolean;
  globalFrame: number;
}> = ({
  src,
  startFrame,
  durationFrames,
  sceneId,
  isFlashback,
  globalFrame,
}) => {
  const localFrame = globalFrame - startFrame;
  const endFrame = startFrame + durationFrames;

  // Render check with generous overlap for cross-fade transitions (15 frames = 0.5s)
  const transitionFrames = 15;
  if (
    globalFrame < startFrame - transitionFrames ||
    globalFrame > endFrame + transitionFrames
  ) {
    return null;
  }

  // Calculate Opacity with Cross-fade
  let opacity = 1;
  if (globalFrame < startFrame + transitionFrames) {
    // Fade in
    opacity = interpolate(
      globalFrame,
      [startFrame - transitionFrames, startFrame + transitionFrames],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.ease),
      },
    );
  } else if (globalFrame > endFrame - transitionFrames) {
    // Fade out
    opacity = interpolate(
      globalFrame,
      [endFrame - transitionFrames, endFrame + transitionFrames],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.ease),
      },
    );
  }

  // Ken Burns zoom scale
  // Alternate zoom directions based on scene index or ID
  const isZoomIn = sceneId.charCodeAt(sceneId.length - 1) % 2 === 0;
  const scale = interpolate(
    localFrame,
    [-transitionFrames, durationFrames + transitionFrames],
    isZoomIn ? [1.0, 1.06] : [1.06, 1.0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
    },
  );

  // Soft translation pan
  const translateX = interpolate(
    localFrame,
    [-transitionFrames, durationFrames + transitionFrames],
    isZoomIn ? [-10, 10] : [10, -10],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Cinematic Color Grade Filter (Sepia Flashbacks vs Warm Neutral Present)
  // Transition sepia filter smoothly
  let sepiaVal = isFlashback ? 0.65 : 0.12;
  let saturateVal = isFlashback ? 0.75 : 1.05;
  let brightnessVal = isFlashback ? 0.85 : 0.95;

  const filterStyle = `sepia(${sepiaVal}) saturate(${saturateVal}) brightness(${brightnessVal}) contrast(0.95)`;

  return (
    <AbsoluteFill style={{ opacity, zIndex: 1 }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${translateX}px)`,
          filter: filterStyle,
        }}
        from={-1520}
      />
    </AbsoluteFill>
  );
};

export const MaaKiDiaryVideo: React.FC<MaaKiDiaryProps> = ({
  logoBottom = 113,
  logoRight = 80,
  logoScale = 1.1,
  logoOpacity = 0.75,
  bgMusicVolume = 0.15,
  voVolume = 0.9,
}) => {
  const frame = useCurrentFrame();

  const scenes = diaryData.scenes || [];

  // Find active scene index
  let activeSceneIndex = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const start = scene.startFrame ?? 0;
    const duration = scene.durationFrames ?? 300;
    if (frame >= start && frame < start + duration) {
      activeSceneIndex = i;
      break;
    }
  }

  const activeScene = scenes[activeSceneIndex] || scenes[0];
  const isMaaVoice = activeScene.voice === "hi-IN-SwaraNeural";

  // Subtitle transition (Fade in/out on scene change)
  const activeStart = activeScene.startFrame ?? 0;
  const activeDuration = activeScene.durationFrames ?? 300;
  const localFrame = frame - activeStart;

  const subtitleOpacity = interpolate(
    localFrame,
    [0, 12, activeDuration - 12, activeDuration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bgDark, overflow: "hidden" }}>
      {/* 1. Ken Burns background image slideshow */}
      <AbsoluteFill style={{ zIndex: 1 }}>
        {scenes.map((scene, idx) => {
          const isFlashback = scene.imagePrompt
            .toLowerCase()
            .includes("flashback");
          const imageName = `${scene.id}.jpg`;
          return (
            <KenBurnsImage
              key={scene.id}
              src={staticFile(`content/MaaKiDiary/images/${imageName}`)}
              startFrame={scene.startFrame ?? 0}
              durationFrames={scene.durationFrames ?? 300}
              sceneId={scene.id}
              isFlashback={isFlashback}
              globalFrame={frame}
            />
          );
        })}
      </AbsoluteFill>
      {/* 2. Soft cinematic vignette overlay */}
      <AbsoluteFill
        style={{
          zIndex: 2,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      {/* 3. Translucent gradient at bottom for subtitle legibility */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 380,
          background:
            "linear-gradient(to top, rgba(11, 10, 10, 0.95) 0%, rgba(11, 10, 10, 0.6) 40%, rgba(11, 10, 10, 0) 100%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      {/* 4. Elegant Subtitles overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: "10%",
          right: "10%",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: subtitleOpacity,
          pointerEvents: "none",
        }}
      >
        {isMaaVoice ? (
          // Swara voice / Maa's diary entry styling (Elegant serif, soft gold cream, italic)
          <div
            style={{
              fontFamily: lora.fontFamily,
              fontSize: 44,
              fontWeight: 500,
              fontStyle: "italic",
              color: theme.textMaa,
              textAlign: "center",
              lineHeight: 1.5,
              textShadow: `0 4px 12px ${theme.shadowMaa}`,
              letterSpacing: "0.02em",
              maxWidth: 1300,
            }}
          >
            {activeScene.text}
          </div>
        ) : (
          // Madhur voice / Narrator styling (Clean modern sans-serif, white)
          <div
            style={{
              fontFamily: inter.fontFamily,
              fontSize: 38,
              fontWeight: 600,
              color: theme.textNarrator,
              textAlign: "center",
              lineHeight: 1.6,
              textShadow: `0 4px 16px ${theme.shadowNarrator}`,
              letterSpacing: "0.03em",
              maxWidth: 1200,
            }}
          >
            {activeScene.text}
          </div>
        )}
      </div>
      {/* 5. Channel/Video Logo watermark */}
      <div
        style={{
          position: "absolute",
          bottom: logoBottom,
          right: logoRight,
          background: "rgba(11, 10, 10, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(12px)",
          height: 80 * logoScale,
          padding: "6px 16px",
          borderRadius: "14px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: inter.fontFamily,
            color: isMaaVoice ? theme.textMaa : "#FFFFFF",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: "uppercase",
            opacity: logoOpacity,
          }}
        >
          Storiyum
        </span>
      </div>
      {/* 6. Audio tracks */}
      {/* Synthesized voiceover */}
      <Audio
        src={staticFile("content/MaaKiDiary/audio/voiceover.mp3")}
        volume={voVolume}
      />
      {/* Background music */}
      <DuckedMusic scenes={scenes} volume={bgMusicVolume} />
    </AbsoluteFill>
  );
};
