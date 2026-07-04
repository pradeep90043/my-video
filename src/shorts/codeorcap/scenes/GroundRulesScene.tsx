import type { CSSProperties } from "react";
import {
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { brand, baseText, Shell, BrandLockup } from "../Primitives";
import { FadeIn, GlitchReveal, ScalePop } from "../animations";

/* ── helpers ─────────────────────────────────────────────────────── */

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/* ── tier chip ───────────────────────────────────────────────────── */

const TierChip: React.FC<{
  label: string;
  glowColor: string;
  gradient?: string;
  delay: number;
}> = ({ label, glowColor, gradient, delay }) => {
  const borderImage = gradient
    ? `linear-gradient(135deg, ${gradient}) 1`
    : undefined;

  const chipStyle: CSSProperties = {
    ...baseText,
    width: 400,
    padding: "36px 20px",
    borderRadius: gradient ? 0 : 18,
    border: gradient ? "4px solid" : `4px solid ${glowColor}`,
    ...(borderImage ? { borderImage } : {}),
    /* borderImage doesn't support border-radius, so we use box-shadow for
       gradient chips and both for solid-color chips */
    boxShadow: `0 0 42px ${glowColor}55, inset 0 0 28px ${glowColor}22`,
    backgroundColor: "rgba(11,11,11,0.82)",
    color: brand.white,
    fontSize: 40,
    fontWeight: 900,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    letterSpacing: 2,
    lineHeight: 1.2,
  };

  return (
    <ScalePop delay={delay}>
      <div style={chipStyle}>{label}</div>
    </ScalePop>
  );
};

/* ── strike-through average ──────────────────────────────────────── */

const StrikeThroughAverage: React.FC = () => {
  const frame = useCurrentFrame();

  /* text fades in at frame 100 */
  const textOpacity = interpolate(frame, [100, 112], [0, 1], clamp);

  /* strike line sweeps from left to right between frame 120–138 */
  const strikeProgress = interpolate(frame, [120, 138], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  /* glitch jitter on the text while strike is animating */
  const inGlitchWindow = frame >= 118 && frame < 145;
  const jitterX = inGlitchWindow ? ((frame % 3) - 1) * 8 : 0;
  const skewDeg = inGlitchWindow ? (frame % 2 === 0 ? -2 : 2) : 0;

  /* after strike, text turns dimmer */
  const postStrikeOpacity =
    frame >= 140
      ? interpolate(frame, [140, 155], [1, 0.35], clamp)
      : 1;

  /* red glow pulse on the strike line */
  const glowPulse =
    frame >= 125
      ? interpolate(frame, [125, 145, 180], [0.4, 1, 0.6], clamp)
      : 0;

  return (
    <div
      style={{
        opacity: textOpacity,
        transform: `translateX(${jitterX}px) skewX(${skewDeg}deg)`,
        position: "relative",
        display: "inline-block",
      }}
    >
      {/* text */}
      <div
        style={{
          ...baseText,
          fontSize: 64,
          fontWeight: 900,
          color: brand.white,
          opacity: postStrikeOpacity,
          letterSpacing: 2,
        }}
      >
        ₹12 LPA{" "}
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 44 }}>
          AVERAGE
        </span>
      </div>

      {/* strike-through line */}
      <div
        style={{
          position: "absolute",
          top: "52%",
          left: 0,
          width: `${strikeProgress * 100}%`,
          height: 6,
          backgroundColor: "#FF2D2D",
          boxShadow: `0 0 ${20 * glowPulse}px #FF2D2D, 0 0 ${40 * glowPulse}px #FF2D2Daa`,
          transformOrigin: "left",
        }}
      />

      {/* ✕ symbol that appears after strike */}
      {frame >= 135 && (
        <div
          style={{
            ...baseText,
            position: "absolute",
            top: -18,
            right: -36,
            fontSize: 48,
            fontWeight: 900,
            color: "#FF2D2D",
            opacity: interpolate(frame, [135, 142], [0, 1], clamp),
            textShadow: "0 0 18px #FF2D2D",
          }}
        >
          ✕
        </div>
      )}
    </div>
  );
};

/* ── source logos strip ──────────────────────────────────────────── */

const SourcesStrip: React.FC = () => {
  const sources = ["Glassdoor", "Levels.fyi", "NASSCOM", "Scaler"];

  return (
    <FadeIn delay={150} duration={20}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          justifyContent: "center",
        }}
      >
        {sources.map((src, i) => (
          <span key={src} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                ...baseText,
                fontSize: 24,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase" as const,
                letterSpacing: 3,
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              {src}
            </span>
            {i < sources.length - 1 && (
              <span
                style={{
                  color: brand.yellow,
                  fontSize: 20,
                  opacity: 0.9,
                  textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                }}
              >
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </FadeIn>
  );
};

/* ── main scene ──────────────────────────────────────────────────── */

export const GroundRulesScene: React.FC = () => {

  return (
    <Shell style={{ padding: "80px 100px 120px" }}>
      {/* ── top row: headline + brand ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <GlitchReveal delay={0}>
          <div
            style={{
              ...baseText,
              fontSize: 96,
              fontWeight: 900,
              color: brand.yellow,
              textTransform: "uppercase",
              letterSpacing: 6,
              textShadow: `0 0 40px ${brand.yellow}66`,
            }}
          >
            The Rules
          </div>
        </GlitchReveal>

        <FadeIn delay={0} duration={10}>
          <BrandLockup compact />
        </FadeIn>
      </div>

      {/* ── middle: tier chips row ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 60,
          flex: 1,
        }}
      >
        <TierChip
          label="Fresher"
          glowColor={brand.yellow}
          delay={30}
        />
        <TierChip
          label={"Mid\n(3–6 yrs)"}
          glowColor={brand.orange}
          gradient={`${brand.yellow}, ${brand.orange}`}
          delay={50}
        />
        <TierChip
          label={"Senior\n(7+ yrs)"}
          glowColor={brand.orange}
          delay={70}
        />
      </div>

      {/* ── strike-through average ── */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <StrikeThroughAverage />
      </div>

      {/* ── bottom: sources strip ── */}
      <div style={{ textAlign: "center" }}>
        <SourcesStrip />
      </div>
    </Shell>
  );
};
