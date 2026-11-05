import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";
import { SceneFigure } from "../../scripts/shared/types";

interface LiveSceneFigureProps {
  figure: SceneFigure;
  fps: number;
  isLandscape: boolean;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  primary: {
    bg: "rgba(88, 166, 255, 0.15)",
    border: "rgba(88, 166, 255, 0.5)",
    text: "#58A6FF",
    glow: "rgba(88, 166, 255, 0.3)",
  },
  accent: {
    bg: "rgba(255, 184, 0, 0.15)",
    border: "rgba(255, 184, 0, 0.5)",
    text: "#FFB800",
    glow: "rgba(255, 184, 0, 0.3)",
  },
  success: {
    bg: "rgba(63, 185, 80, 0.15)",
    border: "rgba(63, 185, 80, 0.5)",
    text: "#3FB950",
    glow: "rgba(63, 185, 80, 0.3)",
  },
  danger: {
    bg: "rgba(248, 81, 73, 0.15)",
    border: "rgba(248, 81, 73, 0.5)",
    text: "#F85149",
    glow: "rgba(248, 81, 73, 0.3)",
  },
  warning: {
    bg: "rgba(210, 153, 34, 0.15)",
    border: "rgba(210, 153, 34, 0.5)",
    text: "#D29922",
    glow: "rgba(210, 153, 34, 0.3)",
  },
  purple: {
    bg: "rgba(188, 140, 255, 0.15)",
    border: "rgba(188, 140, 255, 0.5)",
    text: "#BC8CFF",
    glow: "rgba(188, 140, 255, 0.3)",
  },
};

export const LiveSceneFigure: React.FC<LiveSceneFigureProps> = ({
  figure,
  fps,
  isLandscape,
}) => {
  const frame = useCurrentFrame();

  // Entrance spring animation at frame 10 (~0.33s)
  const enterSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 14, mass: 0.65, stiffness: 120 },
  });

  const opacity = interpolate(frame - 10, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(enterSpring, [0, 1], [35, 0]);
  const scale = interpolate(enterSpring, [0, 1], [0.92, 1]);

  if (!figure) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: isLandscape ? 80 : 120,
        left: "50%",
        transform: `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
        opacity,
        width: isLandscape ? 820 : "92%",
        maxWidth: 860,
        background: "rgba(13, 17, 23, 0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(88, 166, 255, 0.35)",
        borderRadius: 20,
        boxShadow:
          "0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(88, 166, 255, 0.12)",
        padding: isLandscape ? "24px 32px" : "18px 22px",
        zIndex: 15,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Top Header Row ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {figure.badge && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 12px",
                borderRadius: 20,
                background: "rgba(255, 184, 0, 0.15)",
                border: "1px solid rgba(255, 184, 0, 0.5)",
                color: "#FFB800",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#FFB800",
                  boxShadow: "0 0 8px #FFB800",
                }}
              />
              {figure.badge}
            </span>
          )}
          <h3
            style={{
              margin: 0,
              fontSize: isLandscape ? 24 : 20,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
            }}
          >
            {figure.title}
          </h3>
        </div>

        {figure.subtitle && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.6)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {figure.subtitle}
          </span>
        )}
      </div>

      {/* ── Figure Items: Dynamic Animated Content ────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {figure.items.map((item, idx) => {
          // Staggered entrance for each item (starts after card lands)
          const itemDelay = 14 + idx * 8;
          const itemProgress = spring({
            frame: Math.max(0, frame - itemDelay),
            fps,
            config: { damping: 16, stiffness: 140 },
          });
          const itemOpacity = interpolate(frame - itemDelay, [0, 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const itemTranslateX = interpolate(itemProgress, [0, 1], [24, 0]);

          const colorTheme = COLOR_MAP[item.color || "primary"] || COLOR_MAP.primary;

          // Numeric bar animation for comparisons / stats
          const barWidth = interpolate(frame - itemDelay, [0, 20], [0, 100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={idx}
              style={{
                opacity: itemOpacity,
                transform: `translateX(${itemTranslateX}px)`,
                background: "rgba(22, 27, 34, 0.75)",
                border: `1px solid ${colorTheme.border}`,
                borderRadius: 12,
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Subtle animated background fill bar for stats & comparison */}
              {(figure.type === "comparison" || figure.type === "stats" || figure.type === "poll") && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${barWidth}%`,
                    maxWidth:
                      item.value && item.value.includes("%")
                        ? parseFloat(item.value) + "%"
                        : "100%",
                    background: colorTheme.bg,
                    zIndex: 0,
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Label + Icon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  zIndex: 1,
                  flex: 1,
                }}
              >
                {item.icon && (
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                )}
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.label}
                  </div>
                  {item.secondary && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255, 255, 255, 0.55)",
                        marginTop: 3,
                      }}
                    >
                      {item.secondary}
                    </div>
                  )}
                </div>
              </div>

              {/* Value Badge */}
              {item.value && (
                <div
                  style={{
                    zIndex: 1,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 18,
                      fontWeight: 800,
                      color: colorTheme.text,
                      background: colorTheme.bg,
                      border: `1px solid ${colorTheme.border}`,
                      padding: "4px 12px",
                      borderRadius: 8,
                      boxShadow: `0 0 12px ${colorTheme.glow}`,
                      display: "inline-block",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom Highlight Banner ────────────────────────────────────────── */}
      {figure.highlight && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#58A6FF",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          <span style={{ fontSize: 18 }}>💡</span>
          <span>{figure.highlight}</span>
        </div>
      )}
    </div>
  );
};
