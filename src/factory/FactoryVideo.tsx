/**
 * FactoryVideo — Universal pipeline-driven Remotion composition.
 *
 * Supports BOTH formats driven by video.json:
 *   • mode: "long"  → landscape 1920×1080  (10-min long-form)
 *   • mode: "short" → portrait  1080×1920  (30-60s Short/Reel)
 *
 * Quality Enhancements Included:
 *   1. Dynamic word-level karaoke subtitles (synchronized to speech timestamps).
 *   2. Visual pattern interrupts every 3.5s (subtle micro-punch for >85% AVD retention).
 *   3. Sound design: Hook impact bass drop (boom.mp3) + transition pop SFX (pop.mp3).
 *   4. Auto-ducking background music (ducks -16dB under voice, swells during pauses).
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import {
  useCameraPan,
  useCameraShake,
  useCameraZoomIn,
  useCameraZoomOut,
  useFadeEntrance,
  useScalePopEntrance,
  useSceneTransition,
  useSlideUpEntrance,
  useTypingText,
} from "../shared/lib/factory-animations";
import { DuckedMusic } from "../shared/components/DuckedMusic";
import { LiveSceneFigure } from "./LiveSceneFigure";

// ── Schema ─────────────────────────────────────────────────────────────────────

export const factoryVideoSchema = z.object({
  /** slug of the generated content (folder under public/content/factory/) */
  slug: z.string(),
  /** path to the video.json relative to public/ e.g. "content/factory/my-slug/video.json" */
  videoPath: z.string(),
  /** resolved at render time by calculateMetadata */
  data: z
    .object({
      mode: z.enum(["long", "short"]).default("short"),
      fps: z.number().default(30),
      totalFrames: z.number().default(900),
      voice: z.string().default(""),
      musicTrack: z.string().default(""),
      wordTimings: z
        .array(
          z.object({
            word: z.string(),
            startMs: z.number(),
            endMs: z.number(),
          }),
        )
        .default([]),
      scenes: z.array(
        z.object({
          id: z.string(),
          duration: z.number(),
          text: z.string(),
          voiceText: z.string().optional(),
          subtitle: z.string().optional(),
          imagePrompt: z.string().optional(),
          imagePath: z.string().default(""),
          audioPart: z.string().default(""),
          animation: z.string().default("fade"),
          background: z.string().default("#0B0B0B"),
          cameraMove: z.string().default("static"),
          figure: z
            .object({
              type: z.enum(["comparison", "stats", "roadmap", "metric", "alert", "poll", "code"]),
              title: z.string(),
              subtitle: z.string().optional(),
              badge: z.string().optional(),
              items: z
                .array(
                  z.object({
                    label: z.string(),
                    value: z.string().optional(),
                    secondary: z.string().optional(),
                    color: z.enum(["primary", "accent", "danger", "success", "warning", "purple"]).default("primary"),
                    icon: z.string().optional(),
                  }),
                )
                .default([]),
              highlight: z.string().optional(),
            })
            .optional(),
        }),
      ),
    })
    .optional(),
  bgMusicVolume: z.number().min(0).max(1).default(0.12),
  voVolume: z.number().min(0).max(1).default(1),
});

export type FactoryVideoProps = z.infer<typeof factoryVideoSchema>;

// ── Design Tokens ──────────────────────────────────────────────────────────────

const FONT_DEVANAGARI =
  '"Noto Sans Devanagari", "Devanagari Sangam MN", "Kohinoor Devanagari", "Inter", -apple-system, system-ui, sans-serif';

const COLORS = {
  bg: "#0B0B0B",
  primary: "#FFB800", // Viral gold/yellow highlight
  accent: "#7C3AED",
  text: "#FFFFFF",
  muted: "#B0B0B0",
  activeGlow: "0 0 24px rgba(255, 184, 0, 0.85)",
};

// ── Karaoke Subtitle Component ─────────────────────────────────────────────────

interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

const KaraokeSubtitles: React.FC<{
  words: WordTiming[];
  globalMs: number;
  fallbackText: string;
  isLandscape: boolean;
}> = ({ words, globalMs, fallbackText, isLandscape }) => {
  // If no word timings provided, render fallback text
  if (!words || words.length === 0) {
    return (
      <div
        style={{
          fontFamily: FONT_DEVANAGARI,
          fontSize: isLandscape ? 40 : 34,
          fontWeight: 800,
          color: COLORS.text,
          textAlign: "center",
          textShadow: "0 2px 18px rgba(0,0,0,0.9)",
          lineHeight: 1.3,
        }}
      >
        {fallbackText}
      </div>
    );
  }

  // Active word index
  const activeIndex = words.findIndex(
    (w) => globalMs >= w.startMs - 50 && globalMs <= w.endMs + 50,
  );

  // Group into readable chunk of words around the active one (5-8 words visible)
  const windowSize = isLandscape ? 9 : 6;
  const pivot = activeIndex >= 0 ? activeIndex : 0;
  const startIdx = Math.max(0, Math.min(pivot - 2, Math.max(0, words.length - windowSize)));
  const visibleWords = words.slice(startIdx, startIdx + windowSize);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: isLandscape ? "14px 18px" : "10px 14px",
        padding: "0 20px",
      }}
    >
      {visibleWords.map((item, idx) => {
        const absoluteIdx = startIdx + idx;
        const isCurrent = absoluteIdx === activeIndex;
        const isPast = absoluteIdx < activeIndex;

        return (
          <span
            key={`${item.word}-${item.startMs}`}
            style={{
              fontFamily: FONT_DEVANAGARI,
              fontSize: isLandscape ? (isCurrent ? 44 : 38) : (isCurrent ? 38 : 32),
              fontWeight: 900,
              letterSpacing: "0.02em",
              color: isCurrent ? COLORS.primary : isPast ? COLORS.text : "rgba(255, 255, 255, 0.45)",
              transform: isCurrent ? "scale(1.15)" : "scale(1)",
              textShadow: isCurrent ? COLORS.activeGlow : "0 2px 12px rgba(0,0,0,0.85)",
              transition: "transform 0.1s ease, color 0.1s ease",
              display: "inline-block",
            }}
          >
            {item.word}
          </span>
        );
      })}
    </div>
  );
};

// ── Single Scene Component ─────────────────────────────────────────────────────

interface SceneData {
  id: string;
  duration: number;
  text: string;
  subtitle?: string;
  imagePath?: string;
  animation: string;
  background: string;
  cameraMove: string;
  figure?: any;
}

const FactoryScene: React.FC<{
  scene: SceneData;
  fps: number;
  isLandscape: boolean;
  sceneWords: WordTiming[];
  sceneStartMs: number;
}> = ({ scene, fps, isLandscape, sceneWords, sceneStartMs }) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();

  const sceneOpacity = useSceneTransition(durationInFrames, 6);
  const localMs = (frame / fps) * 1000;
  const currentGlobalMs = sceneStartMs + localMs;

  // ── Visual Pattern Interrupt (Micro-punch every 3.5s for >85% retention) ─────
  const patternPeriod = Math.round(fps * 3.5);
  const cycleFrame = frame % patternPeriod;
  const isPunch = cycleFrame < Math.round(fps * 0.35); // 350ms micro punch
  const punchProgress = isPunch ? cycleFrame / (fps * 0.35) : 0;
  const patternPunchScale = isPunch ? 1 + 0.045 * Math.sin(punchProgress * Math.PI) : 1;

  // ── Dynamic Cinematic Camera moves (18% zoom & pan so images never feel static) ─────
  const zoomInScale = useCameraZoomIn(0.18);
  const zoomOutScale = useCameraZoomOut(0.18);
  const panX = useCameraPan("left", 80);
  const panRightX = useCameraPan("right", 80);
  const shakeX = useCameraShake(8, 10);

  let cameraTransform = "";
  switch (scene.cameraMove) {
    case "zoom-in":
      cameraTransform = `scale(${zoomInScale * patternPunchScale})`;
      break;
    case "zoom-out":
      cameraTransform = `scale(${zoomOutScale * patternPunchScale})`;
      break;
    case "pan-left":
      cameraTransform = `translateX(${panX}px) scale(${zoomInScale * 0.5 + 0.5}) scale(${patternPunchScale})`;
      break;
    case "pan-right":
      cameraTransform = `translateX(${panRightX}px) scale(${zoomInScale * 0.5 + 0.5}) scale(${patternPunchScale})`;
      break;
    case "shake":
      cameraTransform = `translateX(${shakeX}px) scale(${zoomInScale * patternPunchScale})`;
      break;
    default:
      // Even default scenes get a smooth 12% push-in so the image has active motion
      cameraTransform = `scale(${useCameraZoomIn(0.12) * patternPunchScale})`;
  }

  // ── Text Entrance Animations ─────────────────────────────────────────────────
  const fadeIn = useFadeEntrance(4, 10);
  const { opacity: slideOpacity, translateY } = useSlideUpEntrance(4, 60);
  const { opacity: popOpacity, scale: popScale } = useScalePopEntrance(4);
  const typedText = useTypingText(scene.text, 4, 1.8);

  let textStyle: React.CSSProperties = { opacity: 1 };
  let headerText = scene.text;

  switch (scene.animation) {
    case "fade":
      textStyle = { opacity: fadeIn };
      break;
    case "slide":
      textStyle = { opacity: slideOpacity, transform: `translateY(${translateY}px)` };
      break;
    case "scale":
    case "pop":
      textStyle = { opacity: popOpacity, transform: `scale(${popScale})` };
      break;
    case "typing":
      textStyle = { opacity: 1 };
      headerText = typedText;
      break;
    case "zoom":
      textStyle = { opacity: popOpacity, transform: `scale(${popScale})` };
      break;
    default:
      textStyle = { opacity: fadeIn };
  }

  const titleSize = isLandscape ? 64 : 52;
  const textPaddingH = isLandscape ? 140 : 40;
  const textBottom = isLandscape ? 70 : 180;

  const progress = frame / durationInFrames;
  const progressWidth = width * progress;

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {/* Background Media with Camera Motion + Pattern Punch */}
      {scene.imagePath ? (
        <AbsoluteFill style={{ transform: cameraTransform }}>
          <Img
            src={staticFile(scene.imagePath)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.55) contrast(1.1)",
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background:
              scene.background && scene.background !== "#0B0B0B"
                ? scene.background
                : `radial-gradient(ellipse at 30% 40%, ${COLORS.accent}25 0%, ${COLORS.bg} 75%)`,
            transform: cameraTransform,
          }}
        />
      )}

      {/* Cyberpunk Grid Overlay */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${COLORS.primary}08 1px, transparent 1px), linear-gradient(90deg, ${COLORS.primary}08 1px, transparent 1px)`,
          backgroundSize: "75px 75px",
          pointerEvents: "none",
        }}
      />

      {/* Cinematic Vignette + Bottom Scrim */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0) 75%)",
          pointerEvents: "none",
        }}
      />

      {/* Live Animated Remotion Figures */}
      {scene.figure && (
        <LiveSceneFigure
          figure={scene.figure}
          fps={fps}
          isLandscape={isLandscape}
        />
      )}

      {/* Subtitles & Dynamic Word-Level Karaoke Block */}
      <div
        style={{
          position: "absolute",
          bottom: textBottom,
          left: textPaddingH,
          right: textPaddingH,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          ...textStyle,
        }}
      >
        {/* Scene Title / Hook Punchline */}
        <div
          style={{
            fontFamily: FONT_DEVANAGARI,
            fontSize: titleSize,
            fontWeight: 800,
            color: COLORS.text,
            textAlign: "center",
            lineHeight: 1.25,
            textShadow: "0 2px 24px rgba(0,0,0,0.95), 0 0 45px rgba(0,0,0,0.7)",
            letterSpacing: "-0.02em",
            marginBottom: 20,
          }}
        >
          {headerText}
        </div>

        {/* Word-by-Word Karaoke Subtitles */}
        <KaraokeSubtitles
          words={sceneWords}
          globalMs={currentGlobalMs}
          fallbackText={scene.subtitle || ""}
          isLandscape={isLandscape}
        />
      </div>

      {/* Progress Bar (Landscape 10-min Long Form) */}
      {isLandscape && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 5,
            width: progressWidth,
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
            zIndex: 20,
          }}
        />
      )}

      {/* Top Channel Badge */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? 32 : 55,
          right: isLandscape ? 48 : 36,
          background: "rgba(0,0,0,0.7)",
          border: `1px solid ${COLORS.primary}55`,
          borderRadius: 8,
          padding: "6px 18px",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: isLandscape ? 20 : 18,
          fontWeight: 800,
          color: COLORS.primary,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          backdropFilter: "blur(10px)",
          zIndex: 20,
        }}
      >
        CodeOrCap
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ───────────────────────────────────────────────────────────

export const FactoryVideo: React.FC<FactoryVideoProps> = ({
  data,
  bgMusicVolume = 0.12,
  voVolume = 1,
}) => {
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  if (!data) {
    return (
      <AbsoluteFill
        style={{ backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}
      >
        <span style={{ color: COLORS.muted, fontSize: 32 }}>Loading video data...</span>
      </AbsoluteFill>
    );
  }

  const { scenes, voice, musicTrack, wordTimings = [] } = data;

  // Build sequential timing
  let cursor = 0;
  const sequencedScenes = scenes.map((scene) => {
    const startFrame = Math.round(cursor * fps);
    const durationFrames = Math.max(1, Math.round(scene.duration * fps));
    const sceneStartMs = cursor * 1000;
    const sceneEndMs = (cursor + scene.duration) * 1000;

    // Filter word timings relevant to this scene window
    const sceneWords = wordTimings.filter(
      (w) => w.startMs >= sceneStartMs - 200 && w.endMs <= sceneEndMs + 300,
    );

    cursor += scene.duration;
    return { scene, startFrame, durationFrames, sceneStartMs, sceneWords };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      {/* ── Visual Scenes ───────────────────────────────────────────────────── */}
      {sequencedScenes.map(({ scene, startFrame, durationFrames, sceneStartMs, sceneWords }) => (
        <Sequence
          key={scene.id}
          from={startFrame}
          durationInFrames={durationFrames}
          name={scene.id}
        >
          <FactoryScene
            scene={scene}
            fps={fps}
            isLandscape={isLandscape}
            sceneWords={sceneWords}
            sceneStartMs={sceneStartMs}
          />
        </Sequence>
      ))}

      {/* ── Sound Design: Hook Bass Impact (Scene 1) ────────────────────────── */}
      <Sequence from={0} durationInFrames={Math.min(fps * 3, sequencedScenes[0]?.durationFrames ?? 90)} name="sfx-hook-impact">
        <Audio src={staticFile("audio/sfx/boom.mp3")} volume={0.7} />
      </Sequence>

      {/* ── Sound Design: Transition Pops (Scene 2..N) ──────────────────────── */}
      {sequencedScenes.slice(1).map(({ startFrame }, idx) => (
        <Sequence
          key={`sfx-pop-${idx}`}
          from={startFrame}
          durationInFrames={Math.round(fps * 0.9)}
          name={`sfx-pop-${idx + 1}`}
        >
          <Audio src={staticFile("audio/sfx/pop.mp3")} volume={0.32} />
        </Sequence>
      ))}

      {/* ── Primary Voiceover ────────────────────────────────────────────────── */}
      {voice && <Audio src={staticFile(voice)} volume={voVolume} />}

      {/* ── Auto-Ducking Background Music ────────────────────────────────────── */}
      {musicTrack && (
        <DuckedMusic
          scenes={sequencedScenes.map((s) => ({
            startFrame: s.startFrame,
            durationFrames: s.durationFrames,
            duration: s.scene.duration,
          }))}
          volume={bgMusicVolume}
          src={musicTrack}
        />
      )}
    </AbsoluteFill>
  );
};
