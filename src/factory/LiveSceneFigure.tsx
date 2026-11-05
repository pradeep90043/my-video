import React from "react";
import {
  Audio,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SceneFigure } from "../../scripts/shared/types";

interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface LiveSceneFigureProps {
  figure: SceneFigure;
  fps: number;
  isLandscape: boolean;
  sceneWords?: WordTiming[];
  sceneStartMs?: number;
  sceneDurationFrames?: number;
}

const COLOR_MAP: Record<
  string,
  { bg: string; border: string; text: string; glow: string; gradient: string }
> = {
  primary: {
    bg: "rgba(88, 166, 255, 0.16)",
    border: "rgba(88, 166, 255, 0.75)",
    text: "#58A6FF",
    glow: "rgba(88, 166, 255, 0.55)",
    gradient: "linear-gradient(135deg, #58A6FF, #1F6FEB)",
  },
  accent: {
    bg: "rgba(255, 184, 0, 0.16)",
    border: "rgba(255, 184, 0, 0.75)",
    text: "#FFB800",
    glow: "rgba(255, 184, 0, 0.55)",
    gradient: "linear-gradient(135deg, #FFD000, #FF9100)",
  },
  success: {
    bg: "rgba(63, 185, 80, 0.16)",
    border: "rgba(63, 185, 80, 0.75)",
    text: "#3FB950",
    glow: "rgba(63, 185, 80, 0.55)",
    gradient: "linear-gradient(135deg, #56D364, #2EA043)",
  },
  danger: {
    bg: "rgba(248, 81, 73, 0.16)",
    border: "rgba(248, 81, 73, 0.75)",
    text: "#F85149",
    glow: "rgba(248, 81, 73, 0.55)",
    gradient: "linear-gradient(135deg, #FF7B72, #DA3633)",
  },
  warning: {
    bg: "rgba(210, 153, 34, 0.16)",
    border: "rgba(210, 153, 34, 0.75)",
    text: "#D29922",
    glow: "rgba(210, 153, 34, 0.55)",
    gradient: "linear-gradient(135deg, #E3B341, #BB8009)",
  },
  purple: {
    bg: "rgba(188, 140, 255, 0.16)",
    border: "rgba(188, 140, 255, 0.75)",
    text: "#BC8CFF",
    glow: "rgba(188, 140, 255, 0.55)",
    gradient: "linear-gradient(135deg, #D2A8FF, #8957E5)",
  },
};

/**
 * Calculates staggered trigger frames for each coined term/concept across the narration.
 */
function computeItemTriggerFrames(
  items: SceneFigure["items"],
  sceneWords: WordTiming[] | undefined,
  sceneStartMs: number,
  durationFrames: number,
  fps: number,
): number[] {
  if (!items || items.length === 0) return [];
  const words = sceneWords || [];
  const count = items.length;

  const minMs = words.length > 0 ? Math.max(0, words[0].startMs - sceneStartMs) : 0;
  const maxMs =
    words.length > 0
      ? Math.max(minMs + 2000, words[words.length - 1].endMs - sceneStartMs)
      : (durationFrames / fps) * 1000;
  const spanMs = Math.max(2000, maxMs - minMs);

  const rawFrames = items.map((item, idx) => {
    // 1. Keyword search across speech tokens
    const tokens = [
      ...item.label.toLowerCase().split(/[\s,.\-_/]+/),
      ...(item.value ? item.value.toLowerCase().split(/[\s,.\-_/%+]+/) : []),
      ...(item.secondary ? item.secondary.toLowerCase().split(/[\s,.\-_/]+/) : []),
    ].filter((t) => t.length >= 2);

    const match = words.find((w) => {
      const clean = w.word.toLowerCase().replace(/[^\w\u0900-\u097F]/g, "");
      if (clean.length < 3) return false;
      return tokens.some((t) => t === clean || (t.length >= 4 && clean.includes(t)));
    });

    if (match) {
      const relMs = Math.max(0, match.startMs - sceneStartMs);
      return Math.round((relMs / 1000) * fps);
    }

    // 2. Intelligent staggered distribution across narration:
    // Items appear sequentially as terms are coined in speech
    const slot = (idx + 0.25) / (count + 0.5);
    const fallbackMs = minMs + slot * spanMs;
    return Math.round((fallbackMs / 1000) * fps);
  });

  // Guarantee strictly ascending order with at least 25 frames (~0.85s) separation
  const minFirstFrame = Math.max(10, Math.round(fps * 0.4));
  const maxFirstFrame = Math.round(fps * 1.5); // First coined term enters within 1.5s
  const result: number[] = [];
  for (let i = 0; i < rawFrames.length; i++) {
    let f = rawFrames[i];
    if (i === 0) {
      f = Math.min(maxFirstFrame, Math.max(minFirstFrame, f));
    } else {
      f = Math.max(result[i - 1] + Math.round(fps * 0.85), f);
    }
    f = Math.min(f, Math.max(10, durationFrames - (count - i) * Math.round(fps * 0.55)));
    result.push(f);
  }
  return result;
}

/**
 * Animate numeric counter value (e.g. 0 -> 92% or 0 -> 10,000+ or 0.0s -> 1.1s)
 */
function getAnimatedValue(rawVal: string | undefined, progress: number): string {
  if (!rawVal) return "";
  const match = rawVal.match(/([+-]?\d+(?:[.,]\d+)?)/);
  if (!match) return rawVal;

  const numStr = match[1].replace(/,/g, "");
  const numVal = parseFloat(numStr);
  if (isNaN(numVal)) return rawVal;

  const currentNum = numVal * progress;
  const isFloat = numStr.includes(".");
  const formattedNum = isFloat
    ? currentNum.toFixed(1)
    : Math.round(currentNum).toLocaleString("en-US");

  return rawVal.replace(match[1], formattedNum);
}

export const LiveSceneFigure: React.FC<LiveSceneFigureProps> = ({
  figure,
  fps,
  isLandscape,
  sceneWords = [],
  sceneStartMs = 0,
  sceneDurationFrames = 600,
}) => {
  const frame = useCurrentFrame();

  if (!figure || !figure.items || figure.items.length === 0) return null;

  // Compute trigger frames for each coined term/concept synced to narration
  const triggerFrames = computeItemTriggerFrames(
    figure.items,
    sceneWords,
    sceneStartMs,
    sceneDurationFrames,
    fps,
  );

  // Header entrance at frame 4 (~0.13s)
  const headerOpacity = interpolate(frame, [3, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerTranslateY = interpolate(frame, [3, 12], [-22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Highlight banner entrance at climax (~80% into scene duration)
  const highlightFrame = Math.max(
    (triggerFrames[triggerFrames.length - 1] || 60) + Math.round(fps * 0.9),
    Math.round(sceneDurationFrames * 0.8),
  );
  const showHighlight = figure.highlight && frame >= highlightFrame;
  const highlightFrameOffset = Math.max(0, frame - highlightFrame);
  const highlightProgress = interpolate(highlightFrameOffset, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const highlightScale = interpolate(highlightFrameOffset, [0, 8, 14], [0.6, 1.08, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  // List of sound effects to play as each term is coined
  const SFX_LIST = [
    "audio/sfx/pop.mp3",
    "audio/text-pop.mp3",
    "audio/sfx/ding.mp3",
    "audio/sfx/tada.mp3",
  ];

  return (
    <>
      {/* ── Sound Effects Triggered Exactly as Each Term is Coined ─────────── */}
      {triggerFrames.map((tFrame, idx) => {
        const sfxSrc = SFX_LIST[idx % SFX_LIST.length];
        return (
          <Sequence
            key={`term-sfx-${idx}`}
            from={tFrame}
            durationInFrames={Math.round(fps * 0.8)}
            layout="none"
          >
            <Audio src={staticFile(sfxSrc)} volume={0.65} />
          </Sequence>
        );
      })}

      {/* ── Highlight Whoosh Sound Effect ──────────────────────────────────── */}
      {figure.highlight && (
        <Sequence
          from={highlightFrame}
          durationInFrames={Math.round(fps * 1.0)}
          layout="none"
        >
          <Audio src={staticFile("audio/text-whoosh.mp3")} volume={0.55} />
        </Sequence>
      )}

      {/* ── Floating Header Banner (Pure typography, no dark enclosing card!) ─ */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? 60 : 120,
          left: "50%",
          transform: `translateX(-50%) translateY(${headerTranslateY}px)`,
          opacity: headerOpacity,
          display: "flex",
          alignItems: "center",
          gap: 16,
          zIndex: 15,
          pointerEvents: "none",
        }}
      >
        {figure.badge && (
          <span
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              background: "rgba(0, 0, 0, 0.7)",
              border: "1.5px solid rgba(255, 184, 0, 0.75)",
              color: "#FFB800",
              fontSize: isLandscape ? 14 : 12,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              boxShadow: "0 0 20px rgba(255, 184, 0, 0.35), 0 4px 16px rgba(0, 0, 0, 0.8)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#FFB800",
                boxShadow: "0 0 10px #FFB800",
              }}
            />
            {figure.badge}
          </span>
        )}
        <h2
          style={{
            margin: 0,
            fontSize: isLandscape ? 32 : 24,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            textShadow: "0 2px 20px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 0, 0, 0.9)",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {figure.title}
        </h2>
      </div>

      {/* ── Direct Kinetic Terms & Infographics (Open Canvas — No Background Cards!) ─ */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? 175 : 250,
          left: "50%",
          transform: "translateX(-50%)",
          width: isLandscape ? "92%" : "90%",
          maxWidth: isLandscape ? 1380 : 850,
          zIndex: 15,
          pointerEvents: "none",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* ── Layout A: Direct Animated Stats & Metrics (Open Floating Typography) ── */}
        {(figure.type === "stats" || figure.type === "metric") && (
          <div
            style={{
              display: "flex",
              flexDirection: isLandscape ? "row" : "column",
              justifyContent: "center",
              alignItems: "center",
              gap: isLandscape ? 56 : 28,
              width: "100%",
            }}
          >
            {figure.items.map((item, idx) => {
              const tFrame = triggerFrames[idx] ?? 10;
              const hasTriggered = frame >= tFrame;
              const itemFrame = Math.max(0, frame - tFrame);

              // Spring pop & overshoot on entrance (0.35 -> 1.15 -> 1.0)
              const itemScale = hasTriggered
                ? interpolate(itemFrame, [0, 8, 16], [0.35, 1.15, 1.0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                  })
                : 0;
              const itemOpacity = hasTriggered
                ? interpolate(itemFrame, [0, 6], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 0;
              const itemTranslateY = hasTriggered
                ? interpolate(itemFrame, [0, 12], [45, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })
                : 45;

              // Subtle ambient breathing/floating once coined (3px subtle sine wave)
              const ambientFloat = hasTriggered
                ? Math.sin((frame + idx * 25) / 18) * 3
                : 0;

              // Count-up progress over 22 frames
              const countProgress = hasTriggered
                ? interpolate(itemFrame, [0, 22], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })
                : 0;
              const animatedValue = getAnimatedValue(item.value, countProgress);

              const colorTheme = COLOR_MAP[item.color || "primary"] || COLOR_MAP.primary;

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    opacity: itemOpacity,
                    transform: `translateY(${itemTranslateY + ambientFloat}px) scale(${itemScale})`,
                    // NO BACKGROUND CARD! Pure open canvas kinetic presentation
                  }}
                >
                  {/* Top Floating Coined Icon / Indicator */}
                  <div
                    style={{
                      fontSize: isLandscape ? 38 : 30,
                      filter: `drop-shadow(0 0 16px ${colorTheme.glow}) drop-shadow(0 4px 10px rgba(0,0,0,0.9))`,
                      marginBottom: 8,
                    }}
                  >
                    {item.icon || "⚡"}
                  </div>

                  {/* Massive Glowing Kinetic Metric Number */}
                  <div
                    style={{
                      fontSize: isLandscape ? 84 : 60,
                      fontWeight: 900,
                      color: colorTheme.text,
                      lineHeight: 1.0,
                      letterSpacing: "-0.03em",
                      fontFamily: "'JetBrains Mono', 'Inter', monospace",
                      textShadow: `0 0 35px ${colorTheme.glow}, 0 4px 20px rgba(0, 0, 0, 0.95), 0 0 55px rgba(0, 0, 0, 0.9)`,
                      marginBottom: 10,
                    }}
                  >
                    {animatedValue || item.value}
                  </div>

                  {/* High-Impact Floating Term Label */}
                  <div
                    style={{
                      fontSize: isLandscape ? 24 : 19,
                      fontWeight: 900,
                      color: "#FFFFFF",
                      lineHeight: 1.2,
                      letterSpacing: "-0.01em",
                      textTransform: "uppercase",
                      textShadow: "0 2px 18px rgba(0, 0, 0, 0.95), 0 0 30px rgba(0, 0, 0, 0.85)",
                      marginBottom: item.secondary ? 6 : 0,
                    }}
                  >
                    {item.label}
                  </div>

                  {/* Secondary Context Callout */}
                  {item.secondary && (
                    <div
                      style={{
                        fontSize: isLandscape ? 16 : 14,
                        fontWeight: 600,
                        color: "rgba(255, 255, 255, 0.88)",
                        lineHeight: 1.3,
                        textShadow: "0 2px 10px rgba(0, 0, 0, 0.95)",
                        maxWidth: isLandscape ? 340 : 280,
                      }}
                    >
                      {item.secondary}
                    </div>
                  )}

                  {/* Kinetic Neon Underline Accent (Fills as counter completes) */}
                  <div
                    style={{
                      marginTop: 14,
                      width: isLandscape ? 180 : 130,
                      height: 4,
                      borderRadius: 2,
                      background: "rgba(255, 255, 255, 0.15)",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${countProgress * 100}%`,
                        background: colorTheme.gradient,
                        boxShadow: `0 0 16px ${colorTheme.glow}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Layout B: Direct High-Impact Comparison Meters (No Card Boxes!) ──── */}
        {figure.type === "comparison" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: isLandscape ? 1100 : "95%",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {figure.items.map((item, idx) => {
              const tFrame = triggerFrames[idx] ?? 10;
              const hasTriggered = frame >= tFrame;
              const itemFrame = Math.max(0, frame - tFrame);

              const itemOpacity = hasTriggered
                ? interpolate(itemFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" })
                : 0;
              const itemTranslateX = hasTriggered
                ? interpolate(itemFrame, [0, 12], [idx % 2 === 0 ? -50 : 50, 0], {
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })
                : idx % 2 === 0 ? -50 : 50;
              const itemScale = hasTriggered
                ? interpolate(itemFrame, [0, 8, 14], [0.85, 1.05, 1.0], {
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                  })
                : 0.85;

              // Parse percentage or calculate bar scale
              const rawPct =
                item.value && String(item.value).includes("%")
                  ? parseFloat(String(item.value))
                  : idx === 0
                  ? 85
                  : 45;
              const targetPct = Math.min(100, Math.max(15, Math.abs(rawPct)));

              const barFill = hasTriggered
                ? interpolate(itemFrame, [0, 24], [0, targetPct], {
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })
                : 0;

              const colorTheme = COLOR_MAP[item.color || "primary"] || COLOR_MAP.primary;

              return (
                <div
                  key={idx}
                  style={{
                    opacity: itemOpacity,
                    transform: `translateX(${itemTranslateX}px) scale(${itemScale})`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    // NO BACKGROUND CARD! Pure floating comparison meters
                  }}
                >
                  {/* Row Header: Floating Label & Floating Huge Metric */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span
                        style={{
                          fontSize: 30,
                          filter: `drop-shadow(0 0 12px ${colorTheme.glow})`,
                        }}
                      >
                        {item.icon || "📊"}
                      </span>
                      <div>
                        <span
                          style={{
                            fontSize: isLandscape ? 26 : 20,
                            fontWeight: 900,
                            color: "#FFFFFF",
                            textShadow: "0 2px 16px rgba(0,0,0,0.95), 0 0 25px rgba(0,0,0,0.85)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {item.label}
                        </span>
                        {item.secondary && (
                          <span
                            style={{
                              marginLeft: 14,
                              fontSize: isLandscape ? 16 : 13,
                              fontWeight: 600,
                              color: "rgba(255, 255, 255, 0.8)",
                              textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                            }}
                          >
                            • {item.secondary}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.value && (
                      <span
                        style={{
                          fontSize: isLandscape ? 32 : 24,
                          fontWeight: 900,
                          color: colorTheme.text,
                          fontFamily: "'JetBrains Mono', monospace",
                          textShadow: `0 0 25px ${colorTheme.glow}, 0 2px 12px rgba(0,0,0,0.95)`,
                        }}
                      >
                        {item.value}
                      </span>
                    )}
                  </div>

                  {/* Floating Kinetic Gauge Bar */}
                  <div
                    style={{
                      height: isLandscape ? 20 : 16,
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.12)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.8)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barFill}%`,
                        background: colorTheme.gradient,
                        borderRadius: 10,
                        boxShadow: `0 0 20px ${colorTheme.glow}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Layout C: Direct Action Roadmap, Steps, Alerts & Polls ─────────── */}
        {figure.type !== "stats" && figure.type !== "metric" && figure.type !== "comparison" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: isLandscape ? 820 : "92%",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {figure.items.map((item, idx) => {
              const tFrame = triggerFrames[idx] ?? 10;
              const hasTriggered = frame >= tFrame;
              const itemFrame = Math.max(0, frame - tFrame);

              const itemOpacity = hasTriggered
                ? interpolate(itemFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" })
                : 0;
              const itemTranslateY = hasTriggered
                ? interpolate(itemFrame, [0, 10], [35, 0], {
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })
                : 35;
              const itemScale = hasTriggered
                ? interpolate(itemFrame, [0, 8, 14], [0.85, 1.06, 1.0], {
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                  })
                : 0.85;

              const colorTheme = COLOR_MAP[item.color || "primary"] || COLOR_MAP.primary;

              return (
                <div
                  key={idx}
                  style={{
                    opacity: itemOpacity,
                    transform: `translateY(${itemTranslateY}px) scale(${itemScale})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 24,
                    width: "100%",
                    // NO BACKGROUND CARD! Pure floating kinetic list items
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 18, flex: 1, minWidth: 0 }}>
                    {/* Glowing Circular Step Ring */}
                    <span
                      style={{
                        width: isLandscape ? 52 : 42,
                        height: isLandscape ? 52 : 42,
                        borderRadius: "50%",
                        background: "rgba(0, 0, 0, 0.65)",
                        border: `2px solid ${colorTheme.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isLandscape ? 22 : 18,
                        fontWeight: 900,
                        color: colorTheme.text,
                        boxShadow: `0 0 20px ${colorTheme.glow}, 0 4px 12px rgba(0,0,0,0.8)`,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon || String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Floating Step Title & Subtext */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: isLandscape ? 24 : 19,
                          fontWeight: 900,
                          color: "#FFFFFF",
                          textShadow: "0 2px 16px rgba(0,0,0,0.95), 0 0 25px rgba(0,0,0,0.8)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {item.label}
                      </div>
                      {item.secondary && (
                        <div
                          style={{
                            fontSize: isLandscape ? 16 : 14,
                            fontWeight: 600,
                            color: "rgba(255, 255, 255, 0.85)",
                            marginTop: 4,
                            textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                          }}
                        >
                          {item.secondary}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Floating Metric Badge */}
                  {item.value && (
                    <span
                      style={{
                        fontSize: isLandscape ? 26 : 20,
                        fontWeight: 900,
                        color: colorTheme.text,
                        fontFamily: "'JetBrains Mono', monospace",
                        textShadow: `0 0 20px ${colorTheme.glow}, 0 2px 10px rgba(0,0,0,0.9)`,
                        background: "rgba(0, 0, 0, 0.6)",
                        padding: "6px 18px",
                        borderRadius: 14,
                        border: `1.5px solid ${colorTheme.border}`,
                        boxShadow: `0 0 15px ${colorTheme.glow}`,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.value}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Floating Highlight Takeaway (Appears at climax with whoosh) ────── */}
        {showHighlight && (
          <div
            style={{
              opacity: highlightProgress,
              transform: `scale(${highlightScale})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              color: "#FFB800",
              fontSize: isLandscape ? 22 : 17,
              fontWeight: 900,
              textAlign: "center",
              maxWidth: 1000,
              margin: isLandscape ? "42px auto 0 auto" : "28px auto 0 auto",
              padding: "10px 30px",
              borderRadius: 30,
              background: "rgba(0, 0, 0, 0.7)",
              border: "1.5px solid rgba(255, 184, 0, 0.8)",
              boxShadow: "0 0 35px rgba(255, 184, 0, 0.35), 0 8px 24px rgba(0,0,0,0.8)",
              textShadow: "0 0 20px rgba(255, 184, 0, 0.5), 0 2px 10px rgba(0,0,0,0.9)",
            }}
          >
            <span style={{ fontSize: 26 }}>💡</span>
            <span>{figure.highlight}</span>
          </div>
        )}
      </div>
    </>
  );
};
