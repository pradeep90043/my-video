// src/scenes/Evidence.tsx
// 22–35s · Side-by-side: AI code vs Human review
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY } from "../utils/constants";

const AI_CODE = [
  '<div className="card">',
  '  <img src={img} />',
  "  <h3>{title}</h3>",
  "  <p>{desc}</p>",
  "  <button onClick={buy}>",
  "    Buy Now",
  "  </button>",
  "</div>",
];

const HUMAN_FIXES = [
  { line: 1, note: "Missing alt attribute → a11y fail", color: COLORS.danger },
  { line: 4, note: "No error boundary", color: COLORS.danger },
  { line: 5, note: "No loading/disabled state", color: COLORS.primary },
  { line: 0, note: "No TypeScript types", color: COLORS.primary },
  { line: 7, note: "No responsive styles", color: COLORS.accent },
];

const COLLAB_STATS = [
  { label: "AI generates boilerplate", pct: 70, color: COLORS.success },
  { label: "Human reviews & refines", pct: 95, color: COLORS.primary },
  { label: "Ship‑ready quality", pct: 99, color: COLORS.accent },
];

export const Evidence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── title ─────────────────────────────────────────────────────────────────
  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── code block lines typing in ────────────────────────────────────────────
  const codeOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── human annotations ─────────────────────────────────────────────────────
  // appear after frame 200

  // ── collab stat bars ──────────────────────────────────────────────────────
  // appear after frame 450

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "flex-start",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* background gradient orb */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}18 0%, transparent 70%)`,
          top: "30%",
          right: "-10%",
        }}
      />

      {/* title */}
      <div
        style={{
          marginTop: 160,
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.accent,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textShadow: `0 0 40px ${COLORS.accent}66`,
          letterSpacing: 3,
          zIndex: 1,
        }}
      >
        AI CODE vs HUMAN REVIEW
      </div>

      {/* code block */}
      <div
        style={{
          marginTop: 50,
          width: 920,
          background: "#0A0A0A",
          borderRadius: 16,
          border: `1px solid ${COLORS.accent}22`,
          padding: "20px 0",
          opacity: codeOpacity,
          zIndex: 1,
          boxShadow: `0 0 60px ${COLORS.accent}10`,
          position: "relative",
        }}
      >
        {/* header */}
        <div
          style={{
            padding: "0 28px 14px",
            borderBottom: `1px solid ${COLORS.accent}15`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
          <span style={{ fontSize: 18, color: COLORS.secondaryText, marginLeft: 10 }}>ProductCard.tsx — AI Generated</span>
        </div>

        {AI_CODE.map((line, i) => {
          const lineDelay = 60 + i * 12;
          const lineChars = Math.max(0, Math.floor((frame - lineDelay) * 1.5));
          const shown = line.slice(0, Math.min(lineChars, line.length));
          return (
            <div key={i} style={{ padding: "3px 28px", display: "flex", gap: 16, position: "relative" }}>
              <span style={{ fontSize: 20, color: COLORS.secondaryText + "55", fontFamily: "monospace", minWidth: 28, textAlign: "right" }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 22, color: COLORS.success, fontFamily: "'Fira Code', monospace", whiteSpace: "pre" }}>
                {shown}
              </span>
            </div>
          );
        })}
      </div>

      {/* human review annotations */}
      <div style={{ width: 920, marginTop: 30, zIndex: 1 }}>
        {HUMAN_FIXES.map((fix, i) => {
          const fixDelay = 220 + i * 40;
          const fixSpring = spring({ frame: frame - fixDelay, fps, config: { damping: 12, stiffness: 120 } });
          const fixOpacity = interpolate(frame, [fixDelay, fixDelay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 20px",
                marginBottom: 8,
                background: `${fix.color}10`,
                borderLeft: `3px solid ${fix.color}`,
                borderRadius: "0 10px 10px 0",
                opacity: fixOpacity,
                transform: `translateX(${(1 - fixSpring) * 80}px)`,
              }}
            >
              <span style={{ fontSize: 22, color: fix.color, fontWeight: 700 }}>⚠</span>
              <span style={{ fontSize: 22, color: COLORS.text }}>{fix.note}</span>
            </div>
          );
        })}
      </div>

      {/* collaboration stat bars */}
      <div style={{ width: 920, marginTop: 40, zIndex: 1 }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.primary,
            marginBottom: 16,
            opacity: interpolate(frame, [450, 470], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          Collaboration = Faster, Not Replacement
        </div>
        {COLLAB_STATS.map((stat, i) => {
          const barDelay = 480 + i * 35;
          const barOpacity = interpolate(frame, [barDelay, barDelay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const barWidth = interpolate(frame, [barDelay, barDelay + 60], [0, stat.pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ marginBottom: 14, opacity: barOpacity }}>
              <div style={{ fontSize: 20, color: COLORS.secondaryText, marginBottom: 6 }}>{stat.label}</div>
              <div style={{ width: "100%", height: 10, background: "#1A1A1A", borderRadius: 5, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${stat.color}88, ${stat.color})`,
                    borderRadius: 5,
                    boxShadow: `0 0 12px ${stat.color}44`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
