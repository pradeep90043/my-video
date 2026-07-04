import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, baseText, Shell } from "../Primitives";
import { FadeIn, ScalePop } from "../animations";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const TOTAL_FRAMES = 420;

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Subscribe button slide-in (60-80) ---
  const btnProgress = spring({
    frame: frame - 60,
    fps,
    config: { damping: 120, stiffness: 200 },
  });
  const btnY = interpolate(btnProgress, [0, 1], [80, 0], clamp);
  const btnOpacity = frame >= 60 ? Math.min(btnProgress * 2, 1) : 0;

  // --- Subscribe button pulsing glow (120+) ---
  const pulsePhase = frame >= 120 ? (frame - 120) * 0.12 : 0;
  const glowIntensity = frame >= 120
    ? 20 + Math.sin(pulsePhase) * 15
    : 8;
  const glowSpread = frame >= 120
    ? 40 + Math.sin(pulsePhase) * 20
    : 20;

  // --- Fade to black: last 30 frames ---
  const fadeOutStart = TOTAL_FRAMES - 30;
  const fadeToBlack = interpolate(
    frame,
    [fadeOutStart, TOTAL_FRAMES],
    [0, 1],
    clamp
  );

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "transparent",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Shell
        style={{
          padding: "80px 120px 60px",
          alignItems: "center",
          justifyContent: "center",
          gap: 50,
        }}
      >
        {/* CodeOrCap logo — large, centered */}
        <ScalePop delay={0}>
          <div
            style={{
              ...baseText,
              color: brand.white,
              fontWeight: 900,
              fontSize: 96,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            <span style={{ color: brand.yellow }}>Code</span>
            <span>Or</span>
            <span style={{ color: brand.orange }}>Cap</span>
          </div>
        </ScalePop>

        {/* Tagline */}
        <FadeIn delay={30} duration={20}>
          <div
            style={{
              ...baseText,
              fontSize: 48,
              fontWeight: 800,
              color: brand.white,
              textAlign: "center",
              letterSpacing: 3,
              opacity: 0.9,
            }}
          >
            Stop Guessing. Start Knowing.
          </div>
        </FadeIn>

        {/* Subscribe button */}
        <div
          style={{
            opacity: btnOpacity,
            transform: `translateY(${btnY}px)`,
          }}
        >
          <div
            style={{
              ...baseText,
              fontSize: 42,
              fontWeight: 900,
              color: brand.black,
              backgroundColor: "#FF0000",
              padding: "22px 70px",
              borderRadius: 14,
              textTransform: "uppercase",
              letterSpacing: 4,
              textAlign: "center",
              boxShadow: `0 0 ${glowIntensity}px ${glowSpread}px rgba(255, 0, 0, 0.45), 0 0 ${glowIntensity * 2}px ${glowSpread * 1.5}px rgba(255, 0, 0, 0.2)`,
              cursor: "pointer",
            }}
          >
            ▶ SUBSCRIBE
          </div>
        </div>

        {/* Social handles */}
        <FadeIn delay={90} duration={15}>
          <div
            style={{
              ...baseText,
              fontSize: 30,
              fontWeight: 600,
              color: brand.white,
              textAlign: "center",
              opacity: 0.6,
              letterSpacing: 1,
            }}
          >
            YouTube @codeorcap · Instagram @codeorcap
          </div>
        </FadeIn>
      </Shell>

      {/* Fade to black overlay */}
      {fadeToBlack > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "transparent",
            opacity: fadeToBlack,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};
