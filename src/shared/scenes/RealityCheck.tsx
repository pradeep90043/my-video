// src/scenes/RealityCheck.tsx
// 12–22s · Grid of things AI *still* struggles with
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

const ITEMS = [
  { label: "Architecture", icon: "🏗️" },
  { label: "Debugging", icon: "🐛" },
  { label: "Accessibility", icon: "♿" },
  { label: "UX Decisions", icon: "🎯" },
  { label: "Performance", icon: "⚡" },
  { label: "Security", icon: "🔒" },
  { label: "Business Logic", icon: "💼" },
  { label: "Edge Cases", icon: "🧩" },
];

export const RealityCheck: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── title ─────────────────────────────────────────────────────────────────
  const titleScale = spring({ frame, fps, config: { damping: 10, stiffness: 120, mass: 0.5 } });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── subtitle ──────────────────────────────────────────────────────────────
  const subOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── red warning bar ───────────────────────────────────────────────────────
  const barWidth = interpolate(frame, [20, 80], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── background slow rotation ──────────────────────────────────────────────
  const bgRotate = interpolate(frame, [0, 600], [0, 5], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "flex-start",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* rotating grid background */}
      <div
        style={{
          position: "absolute",
          inset: -200,
          backgroundImage: `linear-gradient(${COLORS.danger}06 1px, transparent 1px), linear-gradient(90deg, ${COLORS.danger}06 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          transform: `rotate(${bgRotate}deg)`,
        }}
      />

      {/* danger glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.danger}20 0%, transparent 70%)`,
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* title */}
      <div
        style={{
          marginTop: 200,
          fontSize: 56,
          fontWeight: 900,
          color: COLORS.danger,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          textShadow: `0 0 40px ${COLORS.danger}88`,
          letterSpacing: 4,
          zIndex: 1,
        }}
      >
        REALITY CHECK
      </div>

      {/* warning bar */}
      <div
        style={{
          marginTop: 16,
          width: 920,
          height: 3,
          background: COLORS.background,
          borderRadius: 2,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${COLORS.danger}, ${COLORS.primary})`,
            borderRadius: 2,
          }}
        />
      </div>

      {/* subtitle */}
      <div
        style={{
          marginTop: 20,
          fontSize: 32,
          fontWeight: 400,
          color: COLORS.secondaryText,
          textAlign: "center",
          opacity: subOpacity,
          padding: "0 70px",
          lineHeight: 1.5,
          zIndex: 1,
        }}
      >
        AI excels at generating snippets, but struggles with…
      </div>

      {/* grid of limitation cards */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 20,
          marginTop: 70,
          padding: "0 40px",
          zIndex: 1,
          maxWidth: 1000,
        }}
      >
        {ITEMS.map((item, i) => {
          const delay = 80 + i * 25;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 140 } });
          const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          // x mark appears after card
          const xOpacity = interpolate(frame, [delay + 30, delay + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const xScale = spring({ frame: frame - (delay + 30), fps, config: { damping: 6, stiffness: 200 } });

          return (
            <div
              key={i}
              style={{
                width: 430,
                padding: "22px 24px",
                background: `linear-gradient(135deg, ${COLORS.danger}12, #111)`,
                borderRadius: 14,
                border: `1px solid ${COLORS.danger}28`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: cardOpacity,
                transform: `scale(${cardSpring}) translateY(${(1 - cardSpring) * 30}px)`,
                position: "relative",
              }}
            >
              <span style={{ fontSize: 36 }}>{item.icon}</span>
              <span style={{ fontSize: 26, fontWeight: 600, color: COLORS.text }}>{item.label}</span>
              {/* red X */}
              <span
                style={{
                  position: "absolute",
                  right: 20,
                  fontSize: 32,
                  fontWeight: 900,
                  color: COLORS.danger,
                  opacity: xOpacity,
                  transform: `scale(${xScale})`,
                  textShadow: `0 0 15px ${COLORS.danger}88`,
                }}
              >
                ✗
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
