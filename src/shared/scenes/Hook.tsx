// src/scenes/Hook.tsx
// 0–5s · "Everyone says AI will replace frontend developers... but is that actually true?"
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── background pulse ──────────────────────────────────────────────────────
  const pulseRadius = interpolate(frame, [0, 150, 300], [200, 600, 400], { extrapolateRight: "clamp" });
  const pulseOpacity = interpolate(frame, [0, 80, 300], [0, 0.25, 0.15], { extrapolateRight: "clamp" });

  // ── words ─────────────────────────────────────────────────────────────────
  const line1 = "Everyone says AI will";
  const line2 = "replace";
  const line3 = "frontend developers...";
  const line4 = "but is that actually true?";

  const line1Opacity = interpolate(frame, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line1Y = interpolate(frame, [10, 40], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const replaceScale = spring({ frame: frame - 50, fps, config: { damping: 8, stiffness: 120, mass: 0.6 } });
  const replaceOpacity = interpolate(frame, [50, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // glitch offset for "replace"
  const glitchX = frame > 55 && frame < 70 ? Math.sin(frame * 12) * 4 : 0;
  const glitchColor = frame > 55 && frame < 65 ? COLORS.danger : COLORS.primary;

  const line3Opacity = interpolate(frame, [80, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line3Y = interpolate(frame, [80, 110], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const line4Opacity = interpolate(frame, [160, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line4Scale = spring({ frame: frame - 160, fps, config: { damping: 10, stiffness: 100, mass: 0.8 } });

  // ── scene zoom ────────────────────────────────────────────────────────────
  const zoom = interpolate(frame, [0, 300], [1.05, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${zoom})`,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* radial glow pulse */}
      <div
        style={{
          position: "absolute",
          width: pulseRadius * 2,
          height: pulseRadius * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}55 0%, transparent 70%)`,
          opacity: pulseOpacity,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${COLORS.primary}08 1px, transparent 1px), linear-gradient(90deg, ${COLORS.primary}08 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          opacity: 0.5,
        }}
      />

      {/* text block */}
      <div style={{ textAlign: "center", padding: "0 60px", zIndex: 1 }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 500,
            color: COLORS.secondaryText,
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
            lineHeight: 1.4,
          }}
        >
          {line1}
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: glitchColor,
            opacity: replaceOpacity,
            transform: `scale(${replaceScale}) translateX(${glitchX}px)`,
            textShadow: `0 0 40px ${COLORS.primary}88, 0 0 80px ${COLORS.primary}44`,
            letterSpacing: 6,
            textTransform: "uppercase",
            lineHeight: 1.3,
          }}
        >
          {line2}
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 500,
            color: COLORS.secondaryText,
            opacity: line3Opacity,
            transform: `translateY(${line3Y}px)`,
            lineHeight: 1.4,
          }}
        >
          {line3}
        </div>

        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            color: COLORS.text,
            opacity: line4Opacity,
            transform: `scale(${line4Scale})`,
            marginTop: 60,
            textShadow: `0 0 30px ${COLORS.accent}66`,
            lineHeight: 1.3,
          }}
        >
          {line4}
        </div>
      </div>
    </AbsoluteFill>
  );
};
