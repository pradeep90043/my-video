// src/scenes/Claim.tsx
// 5–12s · Explains the viral claim that AI can build complete apps
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

const STATS = [
  { label: "GitHub Copilot", value: "writes 46% of code", icon: "🤖" },
  { label: "GPT‑4 / Claude", value: "generates full React apps", icon: "⚡" },
  { label: "v0 by Vercel", value: "UI from text prompts", icon: "🎨" },
];

export const Claim: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── title ─────────────────────────────────────────────────────────────────
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 30], [80, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── subtitle ──────────────────────────────────────────────────────────────
  const subOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── terminal typing ───────────────────────────────────────────────────────
  const termText = '$ npx create-next-app --ai "Build me a SaaS dashboard"';
  const charsVisible = Math.min(Math.floor((frame - 100) * 0.8), termText.length);
  const termOpacity = interpolate(frame, [90, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorVisible = frame > 100 && Math.floor(frame / 15) % 2 === 0;

  // ── background scan line ──────────────────────────────────────────────────
  const scanY = interpolate(frame, [0, 420], [0, 1920], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "flex-start",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* scanline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: scanY,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}44, transparent)`,
        }}
      />

      {/* title */}
      <div
        style={{
          marginTop: 260,
          fontSize: 56,
          fontWeight: 800,
          color: COLORS.primary,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textShadow: `0 0 40px ${COLORS.primary}66`,
          padding: "0 50px",
          letterSpacing: 2,
        }}
      >
        THE CLAIM
      </div>

      {/* subtitle */}
      <div
        style={{
          marginTop: 30,
          fontSize: 38,
          fontWeight: 400,
          color: COLORS.secondaryText,
          textAlign: "center",
          opacity: subOpacity,
          padding: "0 60px",
          lineHeight: 1.5,
        }}
      >
        "AI can now build complete web applications without writing a single line of code."
      </div>

      {/* terminal */}
      <div
        style={{
          marginTop: 80,
          width: 920,
          background: "#0D0D0D",
          borderRadius: 16,
          border: `1px solid ${COLORS.primary}33`,
          padding: "24px 32px",
          opacity: termOpacity,
          boxShadow: `0 0 60px ${COLORS.primary}15, inset 0 0 30px ${COLORS.background}`,
        }}
      >
        {/* dots */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
        </div>
        <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 26, color: COLORS.success }}>
          {charsVisible > 0 ? termText.slice(0, charsVisible) : ""}
          {cursorVisible && <span style={{ color: COLORS.primary }}>▌</span>}
        </div>
      </div>

      {/* stat cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 80, width: 920 }}>
        {STATS.map((stat, i) => {
          const cardSpring = spring({ frame: frame - (180 + i * 30), fps, config: { damping: 12, stiffness: 100 } });
          const cardOpacity = interpolate(frame, [180 + i * 30, 200 + i * 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "20px 28px",
                background: `linear-gradient(135deg, ${COLORS.accent}15, ${COLORS.primary}10)`,
                borderRadius: 14,
                border: `1px solid ${COLORS.accent}33`,
                opacity: cardOpacity,
                transform: `translateX(${(1 - cardSpring) * 120}px)`,
              }}
            >
              <span style={{ fontSize: 42 }}>{stat.icon}</span>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>{stat.label}</div>
                <div style={{ fontSize: 22, color: COLORS.secondaryText }}>{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
