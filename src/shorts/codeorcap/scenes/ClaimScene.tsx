import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { brand, baseText, Badge, Shell, BrandLockup } from "../Primitives";
import { FadeIn, ScalePop, SlideInLeft } from "../animations";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/* ── pulsing neon border ────────────────────────────────────── */
const useNeonPulse = (delay = 0) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  if (local < 0) return 0;
  // Gentle pulsing between 0.5 and 1.0 spread
  const pulse = 0.7 + 0.3 * Math.sin(local * 0.15);
  return pulse;
};

/* ── counter display ────────────────────────────────────────── */
const Counter: React.FC<{
  label: string;
  value: string;
  numericEnd: number;
  startFrame: number;
  freezeFrame: number;
  icon: string;
}> = ({ label, value, numericEnd, startFrame, freezeFrame, icon }) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  if (local < 0) return null;

  // Count up from 0 to numericEnd between startFrame and freezeFrame
  const countDuration = freezeFrame - startFrame;
  const rawCount = interpolate(local, [0, countDuration], [0, numericEnd], clamp);

  // After freeze, show the formatted value; before that, show the ticking number
  const isFrozen = frame >= freezeFrame;
  const displayValue = isFrozen
    ? value
    : rawCount >= 1000
      ? `${(rawCount / 1000).toFixed(1)}K`
      : Math.floor(rawCount).toString();

  const opacity = interpolate(local, [0, 8], [0, 1], clamp);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity,
      }}
    >
      <span style={{ fontSize: 36 }}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            ...baseText,
            fontSize: 42,
            fontWeight: 900,
            color: brand.white,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayValue}
        </span>
        <span
          style={{
            ...baseText,
            fontSize: 22,
            fontWeight: 600,
            color: `${brand.white}88`,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

/* ── main scene ─────────────────────────────────────────────── */
export const ClaimScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* quote card slam from bottom (frame 20-40) */
  const cardSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 100, stiffness: 200, mass: 0.8 },
  });
  const cardY = interpolate(cardSpring, [0, 1], [600, 0], clamp);
  const cardOpacity = interpolate(cardSpring, [0, 0.3], [0, 1], clamp);

  /* neon pulse on the border */
  const neonPulse = useNeonPulse(20);

  /* "Chalo data nikaalte hain" text (frame 110+) */
  const outroOpacity = interpolate(frame, [110, 112], [0, 1], clamp);

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "transparent",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial glow background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, ${brand.yellow}11 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <Shell style={{ padding: "80px 100px 60px" }}>
        {/* Top row: BrandLockup + CLAIM badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <FadeIn delay={0} duration={10}>
            <BrandLockup />
          </FadeIn>

          <ScalePop delay={0}>
            <Badge color={brand.orange} style={{ fontSize: 36 }}>
              CLAIM
            </Badge>
          </ScalePop>
        </div>

        {/* Center: quote card */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          {/* Quote card */}
          <div
            style={{
              transform: `translateY(${cardY}px)`,
              opacity: cardOpacity,
              maxWidth: 1200,
              width: "100%",
            }}
          >
            <div
              style={{
                position: "relative",
                padding: "60px 72px",
                borderRadius: 20,
                background: `linear-gradient(135deg, ${brand.black} 0%, #1a1a1a 100%)`,
                border: `4px solid ${brand.yellow}`,
                boxShadow: `
                  0 0 ${40 * neonPulse}px ${brand.yellow}44,
                  0 0 ${80 * neonPulse}px ${brand.yellow}22,
                  inset 0 0 ${30 * neonPulse}px ${brand.yellow}11
                `,
              }}
            >
              {/* Quote marks */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: 40,
                  ...baseText,
                  fontSize: 120,
                  fontWeight: 900,
                  color: `${brand.yellow}33`,
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                &ldquo;
              </div>

              {/* Quote text */}
              <div
                style={{
                  ...baseText,
                  fontSize: 72,
                  fontWeight: 900,
                  color: brand.white,
                  textAlign: "center",
                  lineHeight: 1.2,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                AI pays{" "}
                <span
                  style={{
                    color: brand.yellow,
                    textShadow: `0 0 20px ${brand.yellow}88`,
                  }}
                >
                  2x more
                </span>{" "}
                than SWE
              </div>

              {/* Closing quote mark */}
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 40,
                  ...baseText,
                  fontSize: 120,
                  fontWeight: 900,
                  color: `${brand.yellow}33`,
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                &rdquo;
              </div>
            </div>
          </div>

          {/* Counters row */}
          <div
            style={{
              display: "flex",
              gap: 80,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Counter
              label="Likes"
              value="12.4K"
              numericEnd={12400}
              startFrame={50}
              freezeFrame={100}
              icon="❤️"
            />
            <Counter
              label="Shares"
              value="3.2K"
              numericEnd={3200}
              startFrame={55}
              freezeFrame={100}
              icon="🔁"
            />
            <Counter
              label="Comments"
              value="1.8K"
              numericEnd={1800}
              startFrame={60}
              freezeFrame={100}
              icon="💬"
            />
          </div>

          {/* "Chalo data nikaalte hain" outro text */}
          <div style={{ opacity: outroOpacity }}>
            <SlideInLeft delay={110} distance={150}>
              <div
                style={{
                  ...baseText,
                  fontSize: 44,
                  fontWeight: 800,
                  color: brand.white,
                  textAlign: "center",
                  letterSpacing: 2,
                }}
              >
                Chalo{" "}
                <span
                  style={{
                    color: brand.orange,
                    textShadow: `0 0 16px ${brand.orange}66`,
                  }}
                >
                  data nikaalte hain
                </span>{" "}
                📊
              </div>
            </SlideInLeft>
          </div>
        </div>
      </Shell>
    </div>
  );
};
