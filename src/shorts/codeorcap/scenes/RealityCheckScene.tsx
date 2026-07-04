import type { CSSProperties } from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, baseText, Shell, BrandLockup } from "../Primitives";
import { GlitchReveal, FadeIn } from "../animations";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/* ── Slab Block ─────────────────────────────────────────────── */
const Slab: React.FC<{
  label: string;
  borderColor: string;
  glowing?: boolean;
  delay: number;
  style?: CSSProperties;
}> = ({ label, borderColor, glowing = false, delay, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideUp = spring({
    frame: frame - delay,
    fps,
    config: { damping: 100, stiffness: 200 },
  });

  const y = interpolate(slideUp, [0, 1], [200, 0], clamp);
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], clamp);

  const glowPulse = glowing
    ? 0.5 + 0.5 * Math.abs(Math.sin(((frame - delay) / 30) * Math.PI))
    : 0;

  return (
    <div
      style={{
        transform: `translateY(${y}px)`,
        opacity,
        ...style,
      }}
    >
      <div
        style={{
          ...baseText,
          fontSize: 42,
          fontWeight: 900,
          color: brand.white,
          textTransform: "uppercase",
          padding: "36px 64px",
          border: `4px solid ${borderColor}`,
          background: glowing
            ? `linear-gradient(135deg, rgba(11,11,11,0.9), rgba(11,11,11,0.7))`
            : `rgba(11,11,11,0.95)`,
          boxShadow: glowing
            ? `0 0 ${40 * glowPulse + 15}px ${borderColor}55, inset 0 0 ${20 * glowPulse + 8}px ${borderColor}22`
            : `0 0 15px ${borderColor}33`,
          textAlign: "center",
          letterSpacing: 4,
          width: 800,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/* ── Premium Result Arrow ───────────────────────────────────── */
const PremiumResult: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - delay;

  const opacity = interpolate(localFrame, [0, 20], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const glowPulse =
    localFrame > 10
      ? 0.5 + 0.5 * Math.abs(Math.sin(((localFrame - 10) / 25) * Math.PI))
      : 0;

  // Arrow grow
  const arrowHeight = interpolate(localFrame, [0, 15], [0, 50], clamp);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        gap: 0,
      }}
    >
      {/* Arrow line */}
      <div
        style={{
          width: 4,
          height: arrowHeight,
          background: `linear-gradient(180deg, ${brand.orange}, ${brand.yellow})`,
          boxShadow: `0 0 12px ${brand.yellow}66`,
        }}
      />
      {/* Arrow head */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "14px solid transparent",
          borderRight: "14px solid transparent",
          borderTop: `18px solid ${brand.yellow}`,
          filter: `drop-shadow(0 0 8px ${brand.yellow}66)`,
        }}
      />
      {/* Result text */}
      <div
        style={{
          ...baseText,
          fontSize: 52,
          fontWeight: 900,
          color: brand.yellow,
          textTransform: "uppercase",
          marginTop: 12,
          textShadow: `0 0 ${30 * glowPulse + 10}px ${brand.yellow}66`,
          letterSpacing: 3,
        }}
      >
        = PREMIUM{" "}
        <span style={{ color: brand.orange }}>(+20-40%)</span>
      </div>
    </div>
  );
};

/* ── DSA Strikethrough ──────────────────────────────────────── */
const DsaStrikethrough: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - delay;

  // Text appears
  const textOpacity = interpolate(localFrame, [0, 12], [0, 1], clamp);

  // Strikethrough line animates across (starts at frame delay+15)
  const strikeProgress = interpolate(localFrame, [15, 35], [0, 100], clamp);

  // Slight red tint once struck
  const redTint = interpolate(localFrame, [15, 35], [0, 1], clamp);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <div
          style={{
            ...baseText,
            fontSize: 40,
            fontWeight: 800,
            color: interpolate(redTint, [0, 1], [1, 0.5])
              ? `rgba(255,${Math.round(interpolate(redTint, [0, 1], [255, 100], clamp))},${Math.round(interpolate(redTint, [0, 1], [255, 100], clamp))},${textOpacity})`
              : brand.white,
            textTransform: "uppercase",
            letterSpacing: 3,
            opacity: textOpacity,
          }}
        >
          "DSA IS DEAD"
        </div>
        {/* Red strikethrough line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: `${strikeProgress}%`,
            height: 5,
            background: "#FF3333",
            boxShadow: "0 0 15px #FF333388, 0 0 30px #FF333344",
            transform: "translateY(-50%)",
          }}
        />
      </div>
      {/* Correction text */}
      <FadeIn delay={delay + 38} duration={15}>
        <div
          style={{
            ...baseText,
            fontSize: 24,
            fontWeight: 600,
            color: brand.white,
            opacity: 0.7,
            textAlign: "center",
          }}
        >
          DSA fundamentals still matter for top roles
        </div>
      </FadeIn>
    </div>
  );
};

/* ── Main Scene ─────────────────────────────────────────────── */
export const RealityCheckScene: React.FC = () => {

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 80%, ${brand.orange}08 0%, transparent 60%)`,
        }}
      />

      <Shell style={{ alignItems: "center" }}>
        {/* ── Headline ──────────────────────────────────── */}
        <GlitchReveal delay={0}>
          <div
            style={{
              ...baseText,
              fontSize: 80,
              fontWeight: 900,
              color: brand.white,
              textTransform: "uppercase",
              textAlign: "center",
              letterSpacing: 8,
            }}
          >
            THE{" "}
            <span style={{ color: brand.orange }}>REALITY</span>
          </div>
        </GlitchReveal>

        {/* ── Stack Diagram ─────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            flex: 1,
            justifyContent: "center",
          }}
        >
          {/* Top layer: AI / GenAI Skills */}
          <Slab
            label="+ AI / GenAI Skills"
            borderColor={brand.orange}
            glowing
            delay={100}
          />

          {/* Base layer: Software Engineering */}
          <Slab
            label="Software Engineering"
            borderColor={brand.yellow}
            delay={40}
          />

          {/* Arrow + Premium result */}
          <PremiumResult delay={160} />
        </div>

        {/* ── DSA Strikethrough ─────────────────────────── */}
        <div style={{ marginTop: -20, marginBottom: 16 }}>
          <DsaStrikethrough delay={240} />
        </div>

        {/* ── Brand Lockup ──────────────────────────────── */}
        <FadeIn delay={40} style={{ alignSelf: "flex-end" }}>
          <BrandLockup compact />
        </FadeIn>
      </Shell>
    </div>
  );
};
