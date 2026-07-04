import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { brand, baseText, Shell, BrandLockup } from "../Primitives";
import { FadeIn, GlitchReveal } from "../animations";

/* ── Data ─────────────────────────────────────────────────────────── */

const BARS: {
  label: string;
  value: string;
  width: number;
  note?: string;
}[] = [
  { label: "Average (Glassdoor)", value: "~₹11 LPA", width: 22 },
  {
    label: "Fresher · Generalist",
    value: "₹5–8 LPA",
    width: 16,
    note: "≈ SDE fresher",
  },
  { label: "Fresher · GenAI/MLOps", value: "₹8–12 LPA", width: 24 },
  { label: "Fresher · Top product/GCC", value: "₹15–22 LPA", width: 38 },
  { label: "Mid (4–6 yrs)", value: "₹10–25 LPA", width: 48 },
  { label: "Senior specialist", value: "₹25–50+ LPA", width: 72 },
  { label: "Principal (Google)", value: "₹80 LPA+", width: 100 },
];

const STAGGER = 35; // frames between each bar entrance
const SCENE_DURATION = 1680;

/* ── AnimatedBar ──────────────────────────────────────────────────── */

const AnimatedBar: React.FC<{
  label: string;
  value: string;
  width: number;
  delay: number;
  color?: string;
  note?: string;
}> = ({ label, value, width, delay, color = brand.orange, note }) => {
  const frame = useCurrentFrame();
  const SCENE_DURATION = 1288;

  // Slow animation over the scene duration
  const progress = interpolate(frame - delay, [0, SCENE_DURATION - delay], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const barWidth = interpolate(progress, [0, 1], [0, width], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(progress, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity,
        marginBottom: 6,
      }}
    >
      {/* Label */}
      <div
        style={{
          ...baseText,
          color: brand.white,
          fontSize: 26,
          fontWeight: 600,
          width: 320,
          textAlign: "right",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>

      {/* Bar */}
      <div
        style={{
          position: "relative",
          height: 42,
          width: `${barWidth}%`,
          maxWidth: "60%",
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: 6,
          boxShadow: `0 0 20px ${color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 16,
          overflow: "visible",
        }}
      >
        {/* Value label inside bar */}
        <span
          style={{
            ...baseText,
            color: brand.black,
            fontSize: 22,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
      </div>

      {/* Optional note callout */}
      {note && (
        <div
          style={{
            ...baseText,
            color: brand.yellow,
            fontSize: 20,
            fontWeight: 800,
            border: `2px solid ${brand.yellow}`,
            borderRadius: 6,
            padding: "4px 14px",
            whiteSpace: "nowrap",
            opacity: interpolate(progress, [0.6, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
};

/* ── Pulsing Premium Badge ────────────────────────────────────────── */

const PremiumBadge: React.FC<{ enterFrame: number }> = ({ enterFrame }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - enterFrame;

  if (localFrame < 0) return null;

  const fadeIn = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulsing glow via sin oscillation
  const pulse = Math.sin(localFrame * 0.15) * 0.5 + 0.5; // 0→1
  const glowSize = interpolate(pulse, [0, 1], [20, 50]);
  const scaleVal = interpolate(pulse, [0, 1], [1, 1.04]);

  return (
    <div
      style={{
        opacity: fadeIn,
        transform: `scale(${scaleVal})`,
        display: "flex",
        justifyContent: "center",
        marginTop: 28,
      }}
    >
      <div
        style={{
          ...baseText,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: brand.black,
          backgroundColor: brand.orange,
          border: `4px solid ${brand.orange}`,
          boxShadow: `0 0 ${glowSize}px ${brand.orange}aa, 0 0 ${glowSize * 2}px ${brand.orange}44`,
          padding: "20px 40px",
          fontSize: 38,
          fontWeight: 900,
          textTransform: "uppercase",
          lineHeight: 1,
          borderRadius: 8,
          letterSpacing: 1,
        }}
      >
        +20–40% GenAI/MLOps Skill Premium
      </div>
    </div>
  );
};

/* ── Main Scene ───────────────────────────────────────────────────── */

export const AIDataScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
      }}
    >
      <Shell>
        {/* Top section */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%" }}>
          {/* Headline */}
          <Sequence
            from={0}
            durationInFrames={SCENE_DURATION}
            layout="none"
          >
            <GlitchReveal delay={0}>
              <div
                style={{
                  ...baseText,
                  color: brand.orange,
                  fontSize: 72,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 4,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                AI Engineer
              </div>
            </GlitchReveal>
          </Sequence>

          {/* Subtitle */}
          <Sequence
            from={15}
            durationInFrames={SCENE_DURATION - 15}
            layout="none"
          >
            <FadeIn delay={0} duration={18}>
              <div
                style={{
                  ...baseText,
                  color: `${brand.white}99`,
                  fontSize: 28,
                  fontWeight: 600,
                  marginBottom: 36,
                  textAlign: "center",
                }}
              >
                India Salary Data · 2024–25
              </div>
            </FadeIn>
          </Sequence>

          {/* Bar Chart */}
          <Sequence
            from={40}
            durationInFrames={SCENE_DURATION - 40}
            layout="none"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 1000, marginTop: 20 }}>
              {BARS.map((bar, i) => (
                <AnimatedBar
                  key={bar.label}
                  label={bar.label}
                  value={bar.value}
                  width={bar.width}
                  delay={i * STAGGER}
                  color={brand.orange}
                  note={bar.note}
                />
              ))}
            </div>
          </Sequence>

          {/* Pulsing premium badge at the end */}
          <Sequence
            from={40}
            durationInFrames={SCENE_DURATION - 40}
            layout="none"
          >
            <PremiumBadge enterFrame={1400} />
          </Sequence>
        </div>

        {/* Brand lockup — bottom right */}
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <Sequence
            from={10}
            durationInFrames={SCENE_DURATION - 10}
            layout="none"
          >
            <FadeIn delay={0} duration={20}>
              <BrandLockup compact />
            </FadeIn>
          </Sequence>
        </div>
      </Shell>
    </AbsoluteFill>
  );
};
