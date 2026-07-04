// src/scenes/Verdict.tsx
// 35–42s · Balanced conclusion with animated rating meter
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

export const Verdict: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── badge scale-in ────────────────────────────────────────────────────────
  const badgeScale = spring({ frame, fps, config: { damping: 8, stiffness: 100, mass: 0.7 } });
  const badgeOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── verdict text ──────────────────────────────────────────────────────────
  const verdictOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const verdictY = interpolate(frame, [40, 70], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── rating circle ─────────────────────────────────────────────────────────
  const ratingProgress = interpolate(frame, [80, 220], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ratingOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ratingValue = Math.round(ratingProgress * 7); // 7/10

  // circle math
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (ratingProgress * 0.7); // 7/10 = 70%

  // ── conclusion lines ──────────────────────────────────────────────────────
  const line1Opacity = interpolate(frame, [200, 230], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line1Spring = spring({ frame: frame - 200, fps, config: { damping: 14, stiffness: 100 } });

  const line2Opacity = interpolate(frame, [260, 290], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2Spring = spring({ frame: frame - 260, fps, config: { damping: 14, stiffness: 100 } });

  // ── background glow ───────────────────────────────────────────────────────
  const glowSize = interpolate(frame, [0, 420], [300, 700], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "flex-start",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* ambient glow */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.success}18 0%, transparent 70%)`,
          top: "25%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* VERDICT badge */}
      <div
        style={{
          marginTop: 220,
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.success,
          letterSpacing: 8,
          textTransform: "uppercase",
          background: `${COLORS.success}15`,
          padding: "12px 36px",
          borderRadius: 40,
          border: `1px solid ${COLORS.success}44`,
          opacity: badgeOpacity,
          transform: `scale(${badgeScale})`,
          zIndex: 1,
        }}
      >
        VERDICT
      </div>

      {/* main verdict text */}
      <div
        style={{
          marginTop: 40,
          fontSize: 58,
          fontWeight: 900,
          color: COLORS.text,
          textAlign: "center",
          padding: "0 50px",
          opacity: verdictOpacity,
          transform: `translateY(${verdictY}px)`,
          lineHeight: 1.3,
          zIndex: 1,
        }}
      >
        AI{" "}
        <span style={{ color: COLORS.primary, textShadow: `0 0 30px ${COLORS.primary}66` }}>AUGMENTS</span>
        ,{"\n"}not replaces
      </div>

      {/* rating circle */}
      <div
        style={{
          marginTop: 60,
          width: 240,
          height: 240,
          position: "relative",
          opacity: ratingOpacity,
          zIndex: 1,
        }}
      >
        <svg width={240} height={240} viewBox="0 0 240 240">
          {/* background ring */}
          <circle cx={120} cy={120} r={radius} fill="none" stroke={`${COLORS.secondaryText}22`} strokeWidth={8} />
          {/* progress ring */}
          <circle
            cx={120}
            cy={120}
            r={radius}
            fill="none"
            stroke={COLORS.success}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            transform="rotate(-90 120 120)"
            style={{ filter: `drop-shadow(0 0 10px ${COLORS.success}88)` }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 64, fontWeight: 900, color: COLORS.text }}>{ratingValue}</span>
          <span style={{ fontSize: 22, color: COLORS.secondaryText }}>/10</span>
        </div>
      </div>

      {/* conclusion statements */}
      <div style={{ marginTop: 60, width: 920, zIndex: 1 }}>
        <div
          style={{
            fontSize: 30,
            color: COLORS.text,
            padding: "18px 28px",
            background: `linear-gradient(135deg, ${COLORS.success}12, #111)`,
            borderRadius: 14,
            borderLeft: `4px solid ${COLORS.success}`,
            opacity: line1Opacity,
            transform: `translateX(${(1 - line1Spring) * 60}px)`,
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          ✅ AI handles repetitive code, boilerplate, and prototyping at incredible speed.
        </div>
        <div
          style={{
            fontSize: 30,
            color: COLORS.text,
            padding: "18px 28px",
            background: `linear-gradient(135deg, ${COLORS.primary}12, #111)`,
            borderRadius: 14,
            borderLeft: `4px solid ${COLORS.primary}`,
            opacity: line2Opacity,
            transform: `translateX(${(1 - line2Spring) * 60}px)`,
            lineHeight: 1.4,
          }}
        >
          🧠 Human creativity, strategy, and nuanced UX remain irreplaceable.
        </div>
      </div>
    </AbsoluteFill>
  );
};
