import { DuckedMusic } from "../../shared/components/DuckedMusic";
import React from "react";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  Img,
  interpolate,
  Audio,
  useVideoConfig,
  spring,
} from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { z } from "zod";
import collageData from "../../../public/content/collage-animation/video.json";

// Load premium fonts
const montserrat = loadMontserrat();
const inter = loadInter();

const theme = {
  bgDark: "#1a1816", // Warm vintage dark charcoal
  textLight: "#FFFFFF",
  accentColor: "#F4D068", // Vintage warm yellow
  shadow: "rgba(0, 0, 0, 0.4)",
};

export const collageAnimationSchema = z.object({
  logoBottom: z.number().min(0).max(1080).step(1),
  logoRight: z.number().min(0).max(1920).step(1),
  logoScale: z.number().min(0.1).max(5).step(0.1),
  logoOpacity: z.number().min(0).max(1).step(0.05),
  bgMusicVolume: z.number().min(0).max(1).step(0.01),
  voVolume: z.number().min(0).max(1).step(0.01),
  previewMode: z.boolean(),
});

export type CollageAnimationProps = z.infer<typeof collageAnimationSchema>;

export const CollageAnimationVideo: React.FC<CollageAnimationProps> = ({
  logoBottom = 113,
  logoRight = 80,
  logoScale = 1.1,
  logoOpacity = 0.75,
  bgMusicVolume = 0.12,
  voVolume = 0.95,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scenes = collageData.scenes || [];

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

  // Subtitle transition (Fade in/out on scene change)
  const activeStart = activeScene.startFrame ?? 0;
  const activeDuration = activeScene.durationFrames ?? 300;
  const localFrame = frame - activeStart;

  const subtitleOpacity = interpolate(
    localFrame,
    [0, 10, activeDuration - 10, activeDuration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Stop-motion frame rate calculation (e.g. 10 fps step effect for paper animation look)
  const stopMotionFrame = Math.floor(frame / 3) * 3;

  // -- SCENE ANIMATIONS & POSITIONS --

  // Scene 1: Scroll reveal zoom/rotate
  const scrollSpring = spring({
    frame: stopMotionFrame,
    fps,
    config: { damping: 12, mass: 0.8 },
  });
  const scrollScale = interpolate(scrollSpring, [0, 1], [0.3, 1.0]);
  const scrollRotate = interpolate(
    Math.sin(stopMotionFrame * 0.1),
    [-1, 1],
    [-2, 2],
  );

  // Scene 2: Sky slide-in
  const skyFrame = stopMotionFrame - 404; // starts at frame 404
  const skySpring = spring({
    frame: skyFrame,
    fps,
    config: { damping: 15, mass: 1.0 },
  });
  const skyTranslateY = interpolate(skySpring, [0, 1], [-1080, 0]);

  // Scene 3: Ocean slide-up and parallax rock
  const oceanFrame = stopMotionFrame - 682; // starts at frame 682
  const oceanSpring = spring({
    frame: oceanFrame,
    fps,
    config: { damping: 14, mass: 1.1 },
  });
  const oceanTranslateY = interpolate(oceanSpring, [0, 1], [1080, 0]);
  const oceanWiggle = interpolate(
    Math.sin(stopMotionFrame * 0.08),
    [-1, 1],
    [-10, 10],
  );

  // Scene 4: Boat slide-in and float rock
  const boatFrame = stopMotionFrame - 906; // starts at frame 906
  const boatSpring = spring({
    frame: boatFrame,
    fps,
    config: { damping: 12, mass: 0.9 },
  });
  const boatTranslateX = interpolate(boatSpring, [0, 1], [-1920, 0]);
  const boatFloatY = interpolate(
    Math.sin(stopMotionFrame * 0.12),
    [-1, 1],
    [-15, 15],
  );
  const boatFloatRotate = interpolate(
    Math.cos(stopMotionFrame * 0.12),
    [-1, 1],
    [-3, 3],
  );

  // Scene 5: Details pop in
  const detailsFrame = stopMotionFrame - 1113; // starts at frame 1113
  const detailsSpring = spring({
    frame: detailsFrame,
    fps,
    config: { damping: 10, mass: 0.7 },
  });
  const detailsScale = interpolate(detailsSpring, [0, 1], [0, 1]);
  const detailsWiggle = interpolate(
    Math.sin(stopMotionFrame * 0.2),
    [-1, 1],
    [-1, 1],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bgDark, overflow: "hidden" }}>
      {/* Background Kraft Cardboard Paper Texture */}
      <AbsoluteFill style={{ zIndex: 0, opacity: 0.45 }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "radial-gradient(circle, #f0e6d2 0%, #d8c8a8 100%)",
            filter: "contrast(1.1) brightness(0.9)",
          }}
        />
      </AbsoluteFill>
      {/* LAYER 1: Scroll (Scene 1) - Shown through all scenes, acting as the backing board */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "10%",
          width: "80%",
          height: "84%",
          zIndex: 1,
          transform: `scale(${scrollScale}) rotate(${scrollRotate}deg)`,
          filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.35))",
          overflow: "hidden", // Clips nested elements inside the scroll bounds!
          borderRadius: "6px",
          clipPath: `inset(0% ${100 - interpolate(scrollSpring, [0, 1], [0, 100])}% 0% 0%)`, // Stop-motion horizontal unfurling from left to right!
        }}
      >
        {/* Scroll Background Image - Rotated 90 degrees to lay horizontally */}
        <Img
          src={staticFile(
            "content/collage-animation/images/scene_1_reveal.png",
          )}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 0,
            transform: "rotate(90deg) scale(1.4)", // Rotates scroll to horizontal and scales to cover landscape area
          }}
        />

        {/* LAYER 2: Sky backdrop (Scene 2) - Enters at frame 404 */}
        {frame >= 404 && (
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "8%",
              width: "84%",
              height: "45%",
              zIndex: 1,
              transform: `translateY(${skyTranslateY}px)`,
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))",
            }}
          >
            <Img
              src={staticFile(
                "content/collage-animation/images/scene_2_horizon.png",
              )}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}

        {/* LAYER 3: Ocean Waves (Scene 3) - Enters at frame 682 */}
        {frame >= 682 && (
          <div
            style={{
              position: "absolute",
              bottom: "10%",
              left: "8%",
              width: "84%",
              height: "48%",
              zIndex: 2,
              transform: `translateY(${oceanTranslateY}px) translateY(${oceanWiggle}px)`,
              filter: "drop-shadow(0 -4px 10px rgba(0,0,0,0.25))",
            }}
          >
            <Img
              src={staticFile(
                "content/collage-animation/images/scene_3_ocean.png",
              )}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                translate: "-48.6px 75.6px",
              }}
            />
          </div>
        )}

        {/* LAYER 4: Dollar Bill Boat (Scene 4) - Enters at frame 906 */}
        {frame >= 906 && (
          <div
            style={{
              position: "absolute",
              bottom: "18%",
              left: "25%",
              width: "50%",
              height: "35%",
              zIndex: 3,
              transform: `translateX(${boatTranslateX}px) translateY(${boatFloatY}px) rotate(${boatFloatRotate}deg)`,
              filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.3))",
            }}
          >
            <Img
              src={staticFile(
                "content/collage-animation/images/scene_4_action.png",
              )}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        )}

        {/* LAYER 5: Details (Scene 5) - Enters at frame 1113 */}
        {frame >= 1113 && (
          <div
            style={{
              position: "absolute",
              top: "12%",
              right: "12%",
              width: "30%",
              height: "30%",
              zIndex: 4,
              transform: `scale(${detailsScale}) rotate(${detailsWiggle}deg)`,
              filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.2))",
            }}
          >
            <Img
              src={staticFile(
                "content/collage-animation/images/scene_5_details.png",
              )}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        )}
      </div>
      {/* Vignette Overlay */}
      <AbsoluteFill
        style={{
          zIndex: 6,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(0,0,0,0) 50%, rgba(0,0,0,0.5) 100%)",
        }}
      />
      {/* Translucent bottom bar for subtitles */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 260,
          background:
            "linear-gradient(to top, rgba(26, 24, 22, 0.95) 0%, rgba(26, 24, 22, 0.6) 50%, rgba(26, 24, 22, 0) 100%)",
          zIndex: 7,
          pointerEvents: "none",
        }}
      />
      {/* Subtitles Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: "12%",
          right: "12%",
          zIndex: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: subtitleOpacity,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 34,
            fontWeight: 700,
            color: theme.textLight,
            textAlign: "center",
            lineHeight: 1.5,
            textShadow: "0 2px 8px rgba(0, 0, 0, 0.9)",
            maxWidth: 1400,
          }}
        >
          {activeScene.text}
        </div>
      </div>
      {/* Logo Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: logoBottom,
          right: logoRight,
          background: "rgba(26, 24, 22, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 6px 24px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(8px)",
          height: 64 * logoScale,
          padding: "4px 14px",
          borderRadius: "10px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: montserrat.fontFamily,
            color: theme.accentColor,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: logoOpacity,
          }}
        >
          CodeOrCap
        </span>
      </div>
      {/* Audio Playbacks */}
      <Audio
        src={staticFile("content/collage-animation/audio/voiceover.mp3")}
        volume={voVolume}
      />
      <DuckedMusic scenes={scenes} volume={bgMusicVolume} />
    </AbsoluteFill>
  );
};
