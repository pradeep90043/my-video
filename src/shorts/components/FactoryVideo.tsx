import React, { useState, useEffect } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import {
  useSceneTransition,
  useTypingText,
  useVideoProgress,
  useSlideUpEntrance,
  useScalePopEntrance,
  useZoomEntrance,
} from "../../shared/lib/factory-animations";

const { fontFamily: headingFont } = loadFont();
const { fontFamily: bodyFont } = loadInter();

// ── Schema ────────────────────────────────────────────────────────────────────
export const factoryVideoSchema = z.object({
  slug: z.string(),
  videoPath: z.string(),
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface WordTiming { word: string; startMs: number; endMs: number; }

interface SceneData {
  id: string;
  duration: number;
  text: string;
  subtitle: string;
  imagePath: string;
  animation: "fade" | "slide" | "scale" | "pop" | "typing" | "zoom";
  background: string;
  cameraMove: "static" | "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "shake";
}

interface FactoryVideoData {
  title: string;
  voice: string;
  duration: number;
  scenes: SceneData[];
  wordTimings?: WordTiming[];
  musicTrack?: string;
}

// ── Brand ─────────────────────────────────────────────────────────────────────
const B = {
  primary: "#FFB800",
  accent: "#FF8A00",
  bg: "#0B0B0B",
  text: "#FFFFFF",
  handle: "@codeorcap",
  tagline: "Stop Guessing. Start Knowing.",
};

// Per-scene accent gradients — vivid CodeOrCap color palette, cycles across scenes
const SCENE_GRADIENTS = [
  `radial-gradient(ellipse 90% 55% at 50% 0%, rgba(255,184,0,0.42) 0%, rgba(255,80,0,0.12) 60%, transparent 100%), #0B0B0B`,
  `radial-gradient(ellipse 65% 80% at 0% 50%, rgba(255,100,0,0.38) 0%, transparent 65%), radial-gradient(ellipse at 100% 50%, rgba(255,184,0,0.22) 0%, transparent 60%), #0B0B0B`,
  `linear-gradient(135deg, rgba(255,80,0,0.32) 0%, rgba(0,0,0,0) 50%, rgba(255,184,0,0.28) 100%), #0B0B0B`,
  `radial-gradient(ellipse 80% 50% at 50% 100%, rgba(255,184,0,0.42) 0%, rgba(255,100,0,0.18) 55%, transparent 100%), #0B0B0B`,
  `radial-gradient(ellipse 70% 60% at 100% 0%, rgba(255,184,0,0.38) 0%, transparent 68%), radial-gradient(ellipse at 0% 100%, rgba(255,80,0,0.22) 0%, transparent 60%), #0B0B0B`,
  `linear-gradient(180deg, rgba(255,80,0,0.22) 0%, rgba(0,0,0,0) 40%, rgba(255,184,0,0.35) 100%), #0B0B0B`,
  `radial-gradient(ellipse 100% 50% at 50% 50%, rgba(255,130,0,0.38) 0%, rgba(255,184,0,0.12) 50%, transparent 100%), #0B0B0B`,
];

// ── SceneBackground ───────────────────────────────────────────────────────────
const SceneBackground: React.FC<{ scene: SceneData; durationFrames: number; sceneIndex: number }> = ({ scene, durationFrames, sceneIndex }) => {
  const frame = useCurrentFrame();

  // Compute all camera transforms unconditionally using scene-local frame
  const progress = durationFrames > 1 ? frame / durationFrames : 0;
  const shakeDecay = interpolate(frame, [0, 10], [1, 0], { extrapolateRight: "clamp" });

  const scaleZoomIn = 1 + progress * 0.07;
  const scaleZoomOut = 1 + 0.07 - progress * 0.07;
  const panLeftX = -progress * 50;
  const panRightX = progress * 50;
  const shakeX = Math.sin(frame * 1.8) * 8 * shakeDecay;

  let transform = "scale(1)";
  if (scene.cameraMove === "zoom-in") transform = `scale(${scaleZoomIn})`;
  else if (scene.cameraMove === "zoom-out") transform = `scale(${scaleZoomOut})`;
  else if (scene.cameraMove === "pan-left") transform = `translateX(${panLeftX}px)`;
  else if (scene.cameraMove === "pan-right") transform = `translateX(${panRightX}px)`;
  else if (scene.cameraMove === "shake") transform = `translateX(${shakeX}px)`;

  if (scene.imagePath) {
    return (
      <AbsoluteFill style={{ transform, transformOrigin: "center center", overflow: "hidden" }}>
        <Img
          src={staticFile(scene.imagePath)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <AbsoluteFill
          style={{
            background: "linear-gradient(to bottom, rgba(11,11,11,0.1) 0%, rgba(11,11,11,0.45) 50%, rgba(11,11,11,0.92) 100%)",
          }}
        />
        <AbsoluteFill
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px)",
            mixBlendMode: "multiply",
          }}
        />
      </AbsoluteFill>
    );
  }

  // No image — use per-scene vivid gradient + animated glow pulse
  const gradBg = SCENE_GRADIENTS[sceneIndex % SCENE_GRADIENTS.length];
  const glowPulse = 0.12 + Math.sin(frame * 0.06) * 0.06;

  return (
    <AbsoluteFill style={{ background: gradBg, transform }}>
      {/* Animated center glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 35% at 50% 48%, rgba(255,184,0,${glowPulse}) 0%, transparent 100%)`,
        }}
      />
      {/* Visible grid overlay */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(rgba(255,184,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,184,0,0.07) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />
      {/* Side accent lines */}
      <div style={{
        position: "absolute",
        left: 36,
        top: 180,
        bottom: 180,
        width: 3,
        background: `linear-gradient(180deg, transparent 0%, ${B.primary} 30%, ${B.accent} 70%, transparent 100%)`,
        opacity: 0.5,
        borderRadius: 2,
      }} />
      <div style={{
        position: "absolute",
        right: 36,
        top: 180,
        bottom: 180,
        width: 3,
        background: `linear-gradient(180deg, transparent 0%, ${B.accent} 30%, ${B.primary} 70%, transparent 100%)`,
        opacity: 0.5,
        borderRadius: 2,
      }} />
    </AbsoluteFill>
  );
};

// ── SceneCaption ──────────────────────────────────────────────────────────────
const SceneCaption: React.FC<{ scene: SceneData }> = ({ scene }) => {
  // All hooks called unconditionally — only transform is animated (opacity always 1)
  const slideEntrance = useSlideUpEntrance(0, 60);
  const scaleEntrance = useScalePopEntrance(0);
  const zoomEntrance = useZoomEntrance(0, 1.12);
  const typingText = useTypingText(scene.text, 0, 2.5);

  const { text, animation } = scene;

  // Opacity always 1 — text must be visible from frame 0
  let transform = "none";
  if (animation === "slide") {
    transform = `translateY(${slideEntrance.translateY}px)`;
  } else if (animation === "scale" || animation === "pop") {
    transform = `scale(${scaleEntrance.scale})`;
  } else if (animation === "zoom") {
    transform = `scale(${zoomEntrance.scale})`;
  }

  // For typing, show full text after halfway (so it's never blank for too long)
  const typingDisplay = typingText.length > 0 ? typingText : text.slice(0, 1);
  const displayText = animation === "typing" ? typingDisplay : text;

  return (
    <div
      style={{
        position: "absolute",
        top: 380,
        left: 48,
        right: 48,
        transform,
        transformOrigin: "center center",
      }}
    >
      {/* Contrast card behind text */}
      <div
        style={{
          background: "rgba(0,0,0,0.62)",
          borderRadius: 20,
          borderLeft: `5px solid ${B.primary}`,
          borderRight: `5px solid ${B.accent}`,
          padding: "32px 40px",
          boxShadow: `0 0 60px rgba(255,184,0,0.15), inset 0 0 40px rgba(0,0,0,0.3)`,
          backdropFilter: "blur(2px)",
        }}
      >
        <p
          style={{
            fontFamily: headingFont,
            fontSize: 58,
            fontWeight: 900,
            color: B.text,
            textAlign: "center",
            lineHeight: 1.2,
            margin: 0,
            textShadow: `0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(255,184,0,0.2)`,
            letterSpacing: -0.5,
          }}
        >
          {displayText}
        </p>
      </div>
    </div>
  );
};

// ── SubtitleBar ───────────────────────────────────────────────────────────────
const SubtitleBar: React.FC<{ subtitle: string }> = ({ subtitle }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  if (!subtitle.trim()) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 148,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        paddingLeft: 52,
        paddingRight: 52,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(255,184,0,0.92)",
          paddingLeft: 28,
          paddingRight: 28,
          paddingTop: 10,
          paddingBottom: 10,
          borderRadius: 12,
          maxWidth: "86%",
        }}
      >
        <p
          style={{
            fontFamily: bodyFont,
            fontSize: 30,
            fontWeight: 700,
            color: B.bg,
            margin: 0,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
};

// ── WordCaptionOverlay ────────────────────────────────────────────────────────
// Karaoke-style word captions — active word highlighted in gold.
const WordCaptionOverlay: React.FC<{ wordTimings: WordTiming[] }> = ({ wordTimings }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  if (!wordTimings.length) return null;

  const activeIdx = wordTimings.findIndex(
    (w) => currentMs >= w.startMs && currentMs < w.endMs,
  );
  if (activeIdx === -1) return null;

  const windowStart = Math.max(0, activeIdx - 2);
  const windowEnd = Math.min(wordTimings.length, windowStart + 6);
  const group = wordTimings.slice(windowStart, windowEnd);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 108,
        left: 48,
        right: 48,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "6px 10px",
      }}
    >
      {group.map((w, i) => {
        const isActive = windowStart + i === activeIdx;
        return (
          <span
            key={windowStart + i}
            style={{
              fontFamily: headingFont,
              fontSize: isActive ? 40 : 34,
              fontWeight: isActive ? 900 : 600,
              color: isActive ? B.primary : "rgba(255,255,255,0.78)",
              textShadow: isActive
                ? `0 0 24px ${B.primary}99, 0 2px 12px rgba(0,0,0,0.9)`
                : "0 2px 8px rgba(0,0,0,0.8)",
              backgroundColor: isActive ? "rgba(255,184,0,0.14)" : "transparent",
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 4,
              paddingBottom: 4,
              borderRadius: 8,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};

// ── ProgressBar ───────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ totalFrames: number }> = ({ totalFrames }) => {
  const progress = useVideoProgress(totalFrames);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${B.primary}, ${B.accent})`,
          boxShadow: `0 0 12px ${B.primary}88`,
        }}
      />
    </div>
  );
};

// ── NeonAccent ────────────────────────────────────────────────────────────────
const NeonAccent: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 4,
      left: 0,
      right: 0,
      height: 2,
      background: `linear-gradient(90deg, transparent 0%, ${B.primary} 30%, ${B.accent} 70%, transparent 100%)`,
      opacity: 0.6,
    }}
  />
);

// ── BrandHandle ───────────────────────────────────────────────────────────────
const BrandHandle: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 56,
      left: 56,
      fontFamily: bodyFont,
      fontSize: 28,
      fontWeight: 700,
      color: "rgba(255,255,255,0.5)",
      letterSpacing: 1,
    }}
  >
    {B.handle}
  </div>
);

// ── PREVIEW DATA (Remotion Studio placeholder) ────────────────────────────────
const PREVIEW_DATA: FactoryVideoData = {
  title: "CodeOrCap Video Factory",
  voice: "",
  duration: 10,
  scenes: [
    {
      id: "scene-1", duration: 5, text: "CodeOrCap",
      subtitle: "Stop Guessing. Start Knowing.",
      imagePath: "", animation: "scale", background: "#0B0B0B", cameraMove: "zoom-in",
    },
    {
      id: "scene-2", duration: 5, text: "Video Factory — Ready",
      subtitle: "Run: npm run generate",
      imagePath: "", animation: "fade", background: "#0B0B0B", cameraMove: "static",
    },
  ],
};

// ── FactoryVideoInner ─────────────────────────────────────────────────────────
export const FactoryVideoInner: React.FC<{ data: FactoryVideoData }> = ({ data }) => {
  const { fps } = useVideoConfig();
  const totalFrames = Math.ceil(data.duration * fps);
  const hasWordTimings = (data.wordTimings?.length ?? 0) > 0;

  let currentFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: B.bg, fontFamily: bodyFont }}>
      {/* Voiceover */}
      {data.voice && <Audio src={staticFile(data.voice)} />}

      {/* Background music (ducked under voice) */}
      {data.musicTrack && (
        <Audio src={staticFile(data.musicTrack)} volume={0.1} />
      )}

      {/* Scenes */}
      {data.scenes.map((scene, sceneIndex) => {
        const durationFrames = Math.max(1, Math.round(scene.duration * fps));
        const startFrame = currentFrame;
        currentFrame += durationFrames;

        return (
          <Sequence key={scene.id} from={startFrame} durationInFrames={durationFrames}>
            <SceneView scene={scene} durationFrames={durationFrames} hasWordTimings={hasWordTimings} sceneIndex={sceneIndex} />
          </Sequence>
        );
      })}

      {/* Always-on overlays */}
      <BrandHandle />
      <NeonAccent />
      <ProgressBar totalFrames={totalFrames} />

      {/* Word-level karaoke captions (full-video scope — reads absolute frame) */}
      {hasWordTimings && (
        <WordCaptionOverlay wordTimings={data.wordTimings!} />
      )}
    </AbsoluteFill>
  );
};

// ── SceneView ─────────────────────────────────────────────────────────────────
const SceneView: React.FC<{
  scene: SceneData;
  durationFrames: number;
  hasWordTimings: boolean;
  sceneIndex: number;
}> = ({ scene, durationFrames, hasWordTimings, sceneIndex }) => {
  const opacity = useSceneTransition(durationFrames, 6);

  return (
    <AbsoluteFill style={{ opacity }}>
      <SceneBackground scene={scene} durationFrames={durationFrames} sceneIndex={sceneIndex} />
      <SceneCaption scene={scene} />
      {!hasWordTimings && <SubtitleBar subtitle={scene.subtitle} />}
    </AbsoluteFill>
  );
};

// ── FactoryVideo (Remotion entry point) ───────────────────────────────────────
export const FactoryVideo: React.FC<z.infer<typeof factoryVideoSchema>> = ({ videoPath }) => {
  const [data, setData] = useState<FactoryVideoData | null>(null);
  const [handle] = useState(() => delayRender("Loading video JSON"));

  useEffect(() => {
    fetch(staticFile(videoPath))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: FactoryVideoData) => {
        setData(json);
        continueRender(handle);
      })
      .catch((err) => {
        console.error("FactoryVideo: failed to load video JSON", err);
        setData(PREVIEW_DATA);
        continueRender(handle);
      });
  }, [videoPath, handle]);

  if (!data) return <AbsoluteFill style={{ backgroundColor: B.bg }} />;

  return <FactoryVideoInner data={data} />;
};
