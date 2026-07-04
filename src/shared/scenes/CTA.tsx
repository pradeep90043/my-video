// src/scenes/CTA.tsx
// 42–45s · Final call-to-action
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── main text ─────────────────────────────────────────────────────────────
  const mainScale = spring({ frame, fps, config: { damping: 8, stiffness: 100, mass: 0.6 } });
  const mainOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── tagline ───────────────────────────────────────────────────────────────
  const tagOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [30, 55], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── follow button ─────────────────────────────────────────────────────────
  const btnSpring = spring({ frame: frame - 60, fps, config: { damping: 10, stiffness: 120 } });
  const btnOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── background pulse ──────────────────────────────────────────────────────
  const pulseSize = interpolate(frame, [0, 180], [300, 900], { extrapolateRight: "clamp" });
  const pulseOpacity = interpolate(frame, [0, 60, 180], [0, 0.3, 0.15], { extrapolateRight: "clamp" });

  // ── fade out at end ───────────────────────────────────────────────────────
  const fadeOut = interpolate(frame, [140, 180], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
        opacity: fadeOut,
      }}
    >
      {/* background pulse */}
      <div
        style={{
          position: "absolute",
          width: pulseSize,
          height: pulseSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}44 0%, ${COLORS.accent}11 40%, transparent 70%)`,
          opacity: pulseOpacity,
        }}
      />

      {/* grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${COLORS.primary}06 1px, transparent 1px), linear-gradient(90deg, ${COLORS.primary}06 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* content */}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        {/* main message */}
        <div
          style={{
            fontSize: 54,
            fontWeight: 900,
            color: COLORS.text,
            opacity: mainOpacity,
            transform: `scale(${mainScale})`,
            lineHeight: 1.3,
            padding: "0 50px",
          }}
        >
          Master the tools.{"\n"}
          <span style={{ color: COLORS.primary, textShadow: `0 0 40px ${COLORS.primary}88` }}>
            Stay indispensable.
          </span>
        </div>

        {/* tagline */}
        <div
          style={{
            marginTop: 30,
            fontSize: 32,
            fontWeight: 400,
            color: COLORS.secondaryText,
            opacity: tagOpacity,
            transform: `translateY(${tagY}px)`,
          }}
        >
          Developers who learn AI become{" "}
          <span style={{ color: COLORS.success, fontWeight: 700 }}>more valuable</span>
        </div>

        {/* follow button */}
        <div
          style={{
            marginTop: 60,
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 48px",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            borderRadius: 50,
            opacity: btnOpacity,
            transform: `scale(${btnSpring})`,
            boxShadow: `0 0 40px ${COLORS.primary}44, 0 0 80px ${COLORS.accent}22`,
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 800, color: "#000", letterSpacing: 2 }}>
            FOLLOW FOR MORE
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
