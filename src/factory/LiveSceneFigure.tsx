import React from "react";
import {
  Audio,
  Easing,
  interpolate,
  Sequence,
  spring,
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

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string; gradient: string }> = {
  primary: {
    bg: "rgba(88, 166, 255, 0.16)",
    border: "rgba(88, 166, 255, 0.65)",
    text: "#58A6FF",
    glow: "rgba(88, 166, 255, 0.4)",
    gradient: "linear-gradient(135deg, #58A6FF, #1F6FEB)",
  },
  accent: {
    bg: "rgba(255, 184, 0, 0.16)",
    border: "rgba(255, 184, 0, 0.65)",
    text: "#FFB800",
    glow: "rgba(255, 184, 0, 0.4)",
    gradient: "linear-gradient(135deg, #FFD000, #FF9100)",
  },
  success: {
    bg: "rgba(63, 185, 80, 0.16)",
    border: "rgba(63, 185, 80, 0.65)",
    text: "#3FB950",
    glow: "rgba(63, 185, 80, 0.4)",
    gradient: "linear-gradient(135deg, #56D364, #2EA043)",
  },
  danger: {
    bg: "rgba(248, 81, 73, 0.16)",
    border: "rgba(248, 81, 73, 0.65)",
    text: "#F85149",
    glow: "rgba(248, 81, 73, 0.4)",
    gradient: "linear-gradient(135deg, #FF7B72, #DA3633)",
  },
  warning: {
    bg: "rgba(210, 153, 34, 0.16)",
    border: "rgba(210, 153, 34, 0.65)",
    text: "#D29922",
    glow: "rgba(210, 153, 34, 0.4)",
    gradient: "linear-gradient(135deg, #E3B341, #BB8009)",
  },
  purple: {
    bg: "rgba(188, 140, 255, 0.16)",
    border: "rgba(188, 140, 255, 0.65)",
    text: "#BC8CFF",
    glow: "rgba(188, 140, 255, 0.4)",
    gradient: "linear-gradient(135deg, #D2A8FF, #8957E5)",
  },
};

/**
 * Calculates accurate trigger frames for each stat item based on voiceover speech timestamps.
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
      return tokens.some((t) => clean.includes(t) || t.includes(clean));
    });

    if (match) {
      const relMs = Math.max(0, match.startMs - sceneStartMs);
      return Math.round((relMs / 1000) * fps);
    }

    // 2. Proportional spacing across spoken window
    const slot = (idx + 0.4) / (items.length + 0.2);
    const fallbackMs = minMs + slot * spanMs;
    return Math.round((fallbackMs / 1000) * fps);
  });

  // Guarantee strictly ascending order with at least 20 frames separation
  const minFirstFrame = Math.max(10, Math.round((minMs / 1000) * fps) + 4);
  const result: number[] = [];
  for (let i = 0; i < rawFrames.length; i++) {
    let f = rawFrames[i];
    if (i === 0) {
      f = Math.max(minFirstFrame, f);
    } else {
      f = Math.max(result[i - 1] + 20, f);
    }
    f = Math.min(f, Math.max(10, durationFrames - (items.length - i) * 12));
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

  // Compute trigger frames for each stat item synced to voiceover
  const triggerFrames = computeItemTriggerFrames(
    figure.items,
    sceneWords,
    sceneStartMs,
    sceneDurationFrames,
    fps,
  );

  // Header entrance at frame 6 (~0.2s)
  const headerOpacity = interpolate(frame, [4, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerTranslateY = interpolate(frame, [4, 14], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Highlight banner entrance at ~72% of the scene duration
  const highlightFrame = Math.max(
    (triggerFrames[triggerFrames.length - 1] || 60) + 30,
    Math.round(sceneDurationFrames * 0.7),
  );
  const showHighlight = figure.highlight && frame >= highlightFrame;
  const highlightProgress = spring({
    frame: Math.max(0, frame - highlightFrame),
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <>
      {/* ── Sound Effects Triggered Exactly on Stat Appearance ──────────────── */}
      {triggerFrames.map((tFrame, idx) => (
        <Sequence
          key={`stat-sfx-${idx}`}
          from={tFrame}
          durationInFrames={Math.round(fps * 0.8)}
          layout="none"
        >
          <Audio
            src={staticFile(idx === 0 ? "audio/sfx/ding.mp3" : "audio/text-pop.mp3")}
            volume={0.35}
          />
        </Sequence>
      ))}

      {/* ── Highlight Whoosh Sound Effect ──────────────────────────────────── */}
      {figure.highlight && (
        <Sequence
          from={highlightFrame}
          durationInFrames={Math.round(fps * 1.0)}
          layout="none"
        >
          <Audio src={staticFile("audio/text-whoosh.mp3")} volume={0.3} />
        </Sequence>
      )}

      {/* ── Floating Header Banner (No giant enclosing card!) ───────────────── */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? 36 : 75,
          left: "50%",
          transform: `translateX(-50%) translateY(${headerTranslateY}px)`,
          opacity: headerOpacity,
          display: "flex",
          alignItems: "center",
          gap: 14,
          zIndex: 15,
          pointerEvents: "none",
        }}
      >
        {figure.badge && (
          <span
            style={{
              padding: "5px 16px",
              borderRadius: 20,
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1.5px solid rgba(255, 184, 0, 0.6)",
              color: "#FFB800",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 184, 0, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#FFB800",
                boxShadow: "0 0 8px #FFB800",
              }}
            />
            {figure.badge}
          </span>
        )}
        <h2
          style={{
            margin: 0,
            fontSize: isLandscape ? 28 : 22,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            textShadow: "0 2px 20px rgba(0, 0, 0, 0.95), 0 0 30px rgba(0,0,0,0.8)",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {figure.title}
        </h2>
      </div>

      {/* ── Direct Animated Stats (Kinetic Infographics) ────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? 95 : 140,
          left: "50%",
          transform: "translateX(-50%)",
          width: isLandscape ? "92%" : "94%",
          maxWidth: isLandscape ? 1320 : 800,
          zIndex: 15,
          pointerEvents: "none",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Render Layout: Side-by-side Pods for 'stats' & 'metric' */}
        {(figure.type === "stats" || figure.type === "metric") && (
          <div
            style={{
              display: "flex",
              flexDirection: isLandscape ? "row" : "column",
              justifyContent: "center",
              alignItems: "stretch",
              gap: isLandscape ? 24 : 14,
            }}
          >
            {figure.items.map((item, idx) => {
              const tFrame = triggerFrames[idx] ?? 10;
              const hasTriggered = frame >= tFrame;
              const itemFrame = Math.max(0, frame - tFrame);

              // Spring pop & overshoot on entrance
              const itemScale = hasTriggered
                ? interpolate(itemFrame, [0, 8, 16], [0.35, 1.1, 1.0], {
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
                ? interpolate(itemFrame, [0, 12], [35, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 35;

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
                    minWidth: isLandscape ? 320 : "100%",
                    opacity: itemOpacity,
                    transform: `translateY(${itemTranslateY}px) scale(${itemScale})`,
                    background: "rgba(10, 16, 26, 0.72)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: `1.5px solid ${colorTheme.border}`,
                    borderRadius: 22,
                    padding: isLandscape ? "24px 28px" : "18px 20px",
                    boxShadow: `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px ${colorTheme.glow}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Top Row: Icon + Glow Pill */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 28 }}>{item.icon || "⚡"}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: colorTheme.text,
                        background: colorTheme.bg,
                        border: `1px solid ${colorTheme.border}`,
                        padding: "3px 10px",
                        borderRadius: 12,
                      }}
                    >
                      LIVE METRIC
                    </span>
                  </div>

                  {/* Big Kinetic Counter */}
                  <div
                    style={{
                      margin: "12px 0 6px 0",
                      fontSize: isLandscape ? 64 : 48,
                      fontWeight: 900,
                      color: colorTheme.text,
                      lineHeight: 1.05,
                      letterSpacing: "-0.02em",
                      textShadow: `0 0 30px ${colorTheme.glow}`,
                      fontFamily: "'JetBrains Mono', 'Inter', monospace",
                    }}
                  >
                    {animatedValue || item.value}
                  </div>

                  {/* Label & Context */}
                  <div>
                    <div
                      style={{
                        fontSize: isLandscape ? 18 : 16,
                        fontWeight: 800,
                        color: "#FFFFFF",
                        lineHeight: 1.25,
                      }}
                    >
                      {item.label}
                    </div>
                    {item.secondary && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "rgba(255, 255, 255, 0.7)",
                          marginTop: 4,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.secondary}
                      </div>
                    )}
                  </div>

                  {/* Bottom Animated Neon Accent Bar */}
                  <div
                    style={{
                      marginTop: 14,
                      height: 4,
                      borderRadius: 2,
                      background: "rgba(255, 255, 255, 0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${countProgress * 100}%`,
                        background: colorTheme.gradient,
                        boxShadow: `0 0 12px ${colorTheme.glow}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Render Layout: High-Impact Comparison Bars for 'comparison' */}
        {figure.type === "comparison" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxWidth: 1040,
              margin: "0 auto",
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
                ? interpolate(itemFrame, [0, 12], [idx % 2 === 0 ? -40 : 40, 0], {
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })
                : -40;

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
                    transform: `translateX(${itemTranslateX}px)`,
                    background: "rgba(10, 16, 26, 0.75)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: `1.5px solid ${colorTheme.border}`,
                    borderRadius: 18,
                    padding: "16px 24px",
                    boxShadow: `0 15px 40px rgba(0, 0, 0, 0.7), 0 0 25px ${colorTheme.glow}`,
                  }}
                >
                  {/* Row Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{item.icon || "📊"}</span>
                      <div>
                        <span style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>
                          {item.label}
                        </span>
                        {item.secondary && (
                          <span
                            style={{
                              marginLeft: 12,
                              fontSize: 13,
                              color: "rgba(255, 255, 255, 0.65)",
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
                          fontSize: 22,
                          fontWeight: 900,
                          color: colorTheme.text,
                          background: colorTheme.bg,
                          border: `1px solid ${colorTheme.border}`,
                          padding: "4px 14px",
                          borderRadius: 12,
                          boxShadow: `0 0 15px ${colorTheme.glow}`,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {item.value}
                      </span>
                    )}
                  </div>

                  {/* Kinetic Gauge Bar */}
                  <div
                    style={{
                      height: 18,
                      borderRadius: 9,
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barFill}%`,
                        background: colorTheme.gradient,
                        borderRadius: 9,
                        boxShadow: `0 0 16px ${colorTheme.glow}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Render Layout: Action Roadmap, Alerts & Polls for other types */}
        {figure.type !== "stats" && figure.type !== "metric" && figure.type !== "comparison" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxWidth: 980,
              margin: "0 auto",
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
                ? interpolate(itemFrame, [0, 10], [25, 0], {
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })
                : 25;

              // Highlight currently speaking step
              const isCurrentSpeech = frame >= tFrame && frame < tFrame + 90;
              const colorTheme = COLOR_MAP[item.color || "primary"] || COLOR_MAP.primary;

              return (
                <div
                  key={idx}
                  style={{
                    opacity: itemOpacity,
                    transform: `translateY(${itemTranslateY}px)`,
                    background: isCurrentSpeech ? "rgba(18, 28, 45, 0.85)" : "rgba(10, 16, 26, 0.72)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: `1.5px solid ${isCurrentSpeech ? colorTheme.border : "rgba(255,255,255,0.14)"}`,
                    borderRadius: 16,
                    padding: "14px 22px",
                    boxShadow: isCurrentSpeech
                      ? `0 15px 45px rgba(0,0,0,0.7), 0 0 30px ${colorTheme.glow}`
                      : "0 10px 30px rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 18,
                    transition: "border 0.2s, box-shadow 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: colorTheme.bg,
                        border: `1.5px solid ${colorTheme.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        fontWeight: 900,
                        color: colorTheme.text,
                        boxShadow: `0 0 14px ${colorTheme.glow}`,
                      }}
                    >
                      {item.icon || String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>
                        {item.label}
                      </div>
                      {item.secondary && (
                        <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.65)", marginTop: 2 }}>
                          {item.secondary}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.value && (
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: colorTheme.text,
                        background: colorTheme.bg,
                        border: `1px solid ${colorTheme.border}`,
                        padding: "4px 14px",
                        borderRadius: 10,
                        boxShadow: `0 0 12px ${colorTheme.glow}`,
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
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

        {/* ── Floating Highlight Punchline (Appears at climax of explanation) ── */}
        {showHighlight && (
          <div
            style={{
              marginTop: 18,
              opacity: highlightProgress,
              transform: `scale(${interpolate(highlightProgress, [0, 1], [0.92, 1])})`,
              background: "rgba(255, 184, 0, 0.12)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1.5px solid rgba(255, 184, 0, 0.65)",
              borderRadius: 16,
              padding: "14px 24px",
              boxShadow: "0 15px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 184, 0, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "#FFB800",
              fontSize: isLandscape ? 17 : 14,
              fontWeight: 800,
              textAlign: "center",
              maxWidth: 960,
              margin: "18px auto 0 auto",
            }}
          >
            <span style={{ fontSize: 22 }}>💡</span>
            <span>{figure.highlight}</span>
          </div>
        )}
      </div>
    </>
  );
};
