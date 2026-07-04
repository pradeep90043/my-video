import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { brand, baseText, Shell, BrandLockup } from "../Primitives";
import {
  FadeIn,
  GlitchReveal,
  ScalePop,
  SlideInLeft,
  ZoomBackground,
} from "../animations";

/* ── matrix rain background (subtle) ────────────────────────── */
const MatrixRain: React.FC = () => {
  const frame = useCurrentFrame();
  const cols = 28;
  const chars = "01アイウエオカキクケコ";

  const columns = useMemo(() => {
    return Array.from({ length: cols }, (_, i) => {
      const seed = (i * 7 + 3) % 17;
      const speed = 1.2 + (seed % 5) * 0.4;
      const startOffset = (seed * 40) % 300;
      return { i, speed, startOffset, char: chars[seed % chars.length] };
    });
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.2,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {columns.map(({ i, speed, startOffset, char }) => {
        const x = (i / cols) * 1920;
        const y = ((frame * speed + startOffset) % 1200) - 100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              ...baseText,
              fontSize: 22,
              fontWeight: 600,
              color: brand.yellow,
              opacity: 0.6,
              textShadow: `0 0 8px ${brand.yellow}`,
              whiteSpace: "nowrap",
            }}
          >
            {char}
          </div>
        );
      })}
    </div>
  );
};

/* ── split panel ────────────────────────────────────────────── */
const SplitPanel: React.FC<{
  label: string;
  color: string;
  side: "left" | "right";
  progress: number;
}> = ({ label, color, side, progress }) => {
  const scaleY = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelOpacity = interpolate(progress, [0.6, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        marginLeft: side === "right" ? 24 : 0,
        marginRight: side === "left" ? 24 : 0,
      }}
    >
      {/* Glass Morphism Panel */}
      <div
        style={{
          width: "100%",
          height: 320,
          borderRadius: 24,
          background: `linear-gradient(135deg, ${color}33 0%, rgba(255,255,255,0.05) 100%)`,
          border: `1px solid ${color}66`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.4), inset 0 2px 20px rgba(255,255,255,0.1), 0 0 40px ${color}22`,
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          transform: `scale(${interpolate(scaleY, [0, 1], [0.8, 1])}) translateY(${interpolate(scaleY, [0, 1], [60, 0])}px)`,
          opacity: scaleY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Subtle diagonal shine effect */}
        <div style={{
          position: "absolute",
          top: 0, left: "-100%", width: "50%", height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
          transform: "skewX(-20deg)",
          animation: "shine 3s infinite",
        }} />
        
        {/* Silhouette placeholder with Glow */}
        <div
          style={{
            width: 140,
            height: 200,
            borderRadius: 70,
            background: `linear-gradient(180deg, ${color}88 0%, ${color}33 100%)`,
            boxShadow: `0 0 40px ${color}66`,
            opacity: scaleY,
          }}
        />
      </div>

      {/* Label */}
      <div
        style={{
          ...baseText,
          marginTop: 24,
          fontSize: 56,
          fontWeight: 900,
          color,
          textShadow: `0 0 30px ${color}, 0 0 60px ${color}88`,
          letterSpacing: 6,
          opacity: labelOpacity,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/* ── main scene ─────────────────────────────────────────────── */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* split panel spring (starts at frame 60) */
  const splitProgress = spring({
    frame: frame - 60,
    fps,
    config: { damping: 120, stiffness: 160 },
  });

  /* "Code ya Cap?" pop visibility (frame 100+) */
  const codeYaCapOpacity = interpolate(frame, [100, 102], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
      {/* Zoom background + matrix rain */}
      <ZoomBackground intensity={0.06}>
        <div style={{ width: 1920, height: 1080, position: "relative" }}>
          <MatrixRain />
        </div>
      </ZoomBackground>

      {/* Main content shell */}
      <Shell style={{ padding: "80px 100px 60px" }}>
        {/* Top row: BrandLockup */}
        <FadeIn delay={0} duration={15}>
          <BrandLockup />
        </FadeIn>

        {/* Center content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {/* Main headline */}
          <GlitchReveal delay={10}>
            {frame >= 10 && <Audio src={staticFile("audio/text-whoosh.mp3")} volume={0.6} />}
            <div
              style={{
                ...baseText,
                fontSize: 88,
                fontWeight: 900,
                color: brand.white,
                textAlign: "center",
                lineHeight: 1.1,
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: brand.yellow }}>AI Engineer</span>
              <span style={{ color: brand.white, margin: "0 20px" }}>vs</span>
              <span style={{ color: brand.orange }}>Software Engineer</span>
            </div>
          </GlitchReveal>

          {/* Sub-headline */}
          <SlideInLeft delay={30} distance={200}>
            <div
              style={{
                ...baseText,
                fontSize: 44,
                fontWeight: 800,
                color: brand.white,
                textAlign: "center",
                letterSpacing: 12,
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              <span style={{ color: brand.yellow }}>Salary</span>
              <span style={{ margin: "0 16px", opacity: 0.5 }}>·</span>
              <span>India</span>
              <span style={{ margin: "0 16px", opacity: 0.5 }}>·</span>
              <span style={{ color: brand.orange }}>2026</span>
            </div>
          </SlideInLeft>

          {/* Split panels: SWE vs AI */}
          <div
            style={{
              display: "flex",
              width: "100%",
              maxWidth: 1400,
              marginTop: 36,
            }}
          >
            <SplitPanel
              label="SWE"
              color={brand.yellow}
              side="left"
              progress={splitProgress}
            />
            {/* Divider */}
            <div
              style={{
                width: 4,
                background: `linear-gradient(180deg, transparent, ${brand.white}44, transparent)`,
                opacity: splitProgress,
              }}
            />
            <SplitPanel
              label="AI"
              color={brand.orange}
              side="right"
              progress={splitProgress}
            />
          </div>

          {/* "Code ya Cap?" pop */}
          <div style={{ opacity: codeYaCapOpacity, marginTop: 24 }}>
            <ScalePop delay={100}>
              <div
                style={{
                  ...baseText,
                  fontSize: 52,
                  fontWeight: 900,
                  textAlign: "center",
                  background: `linear-gradient(90deg, ${brand.yellow}, ${brand.orange})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textTransform: "uppercase",
                  letterSpacing: 4,
                }}
              >
                Code ya Cap?
              </div>
            </ScalePop>
          </div>
        </div>
      </Shell>
    </div>
  );
};
