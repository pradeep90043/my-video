import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";
import { Audio } from "@remotion/media";
import { brand, baseText, Shell } from "../Primitives";
import { GlitchReveal, SlideInLeft, SlideInRight } from "../animations";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/* ── Comparison Bar ─────────────────────────────────────────── */
const ComparisonBar: React.FC<{
  label: string;
  value: string;
  color: string;
  delay: number;
  direction: "left" | "right";
}> = ({ label, value, color, delay, direction }) => {
  const frame = useCurrentFrame();
  const SCENE_DURATION = 880;

  const prog = interpolate(frame - delay, [0, SCENE_DURATION - delay], [0, 1], clamp);

  const barWidth = interpolate(prog, [0, 1], [0, 100], clamp);
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], clamp);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: direction === "left" ? "flex-end" : "flex-start",
        gap: 8,
        opacity,
      }}
    >
      {frame === delay && <Audio src={staticFile("audio/text-pop.mp3")} volume={0.5} />}
      <div
        style={{
          ...baseText,
          fontSize: 22,
          fontWeight: 600,
          color: brand.white,
          textTransform: "uppercase",
          letterSpacing: 2,
          opacity: 0.7,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: "100%",
          height: 52,
          borderRadius: 6,
          overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: direction === "left" ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            background: `linear-gradient(${direction === "left" ? "270deg" : "90deg"}, ${color}, ${color}88)`,
            borderRadius: 6,
            boxShadow: `0 0 20px ${color}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              ...baseText,
              fontSize: 22,
              fontWeight: 900,
              color: brand.black,
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── VS Divider ─────────────────────────────────────────────── */
const VsDivider: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], clamp);
  const glowPulse =
    0.4 + 0.6 * Math.abs(Math.sin(((frame - delay) / 30) * Math.PI));

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        bottom: 0,
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 100,
        opacity,
        zIndex: 10,
      }}
    >
      {/* Vertical glow line */}
      <div
        style={{
          position: "absolute",
          width: 3,
          top: 0,
          bottom: 0,
          background: `linear-gradient(180deg, transparent, ${brand.yellow}, ${brand.orange}, transparent)`,
          boxShadow: `0 0 ${20 * glowPulse}px ${brand.yellow}88`,
        }}
      />
      {/* VS badge */}
      <div
        style={{
          ...baseText,
          fontSize: 38,
          fontWeight: 900,
          color: brand.white,
          background: "transparent",
          border: `3px solid ${brand.orange}`,
          borderRadius: "50%",
          width: 72,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 ${30 * glowPulse}px ${brand.orange}66`,
          zIndex: 11,
        }}
      >
        ⚡
      </div>
    </div>
  );
};

/* ── Row Label ──────────────────────────────────────────────── */
const RowLabel: React.FC<{
  children: React.ReactNode;
  delay: number;
}> = ({ children, delay }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], clamp);

  return (
    <div
      style={{
        ...baseText,
        fontSize: 26,
        fontWeight: 900,
        color: brand.white,
        textTransform: "uppercase",
        letterSpacing: 4,
        textAlign: "center",
        opacity,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
};

/* ── Approx Note ────────────────────────────────────────────── */
const ApproxNote: React.FC<{ delay: number; text: string }> = ({
  delay,
  text,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - delay;
  const opacity = interpolate(localFrame, [0, 10], [0, 1], clamp);
  const flash =
    localFrame >= 0 && localFrame < 20
      ? 0.5 + 0.5 * Math.abs(Math.sin(localFrame * 0.8))
      : 1;

  return (
    <div
      style={{
        ...baseText,
        fontSize: 24,
        fontWeight: 800,
        color: brand.yellow,
        textAlign: "center",
        opacity: opacity * flash,
        marginTop: 4,
      }}
    >
      {text}
    </div>
  );
};

/* ── Slam Banner ────────────────────────────────────────────── */
const SlamBanner: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - delay;

  const slamProg = spring({
    frame: localFrame,
    fps,
    config: { damping: 80, stiffness: 350, mass: 0.8 },
  });

  const scale = interpolate(slamProg, [0, 0.5, 1], [3, 1.05, 1], clamp);
  const opacity = interpolate(localFrame, [0, 3], [0, 1], clamp);

  // Screen shake
  const shakeX =
    localFrame >= 0 && localFrame < 12
      ? Math.sin(localFrame * 4) * (12 - localFrame) * 1.2
      : 0;
  const shakeY =
    localFrame >= 0 && localFrame < 12
      ? Math.cos(localFrame * 5) * (12 - localFrame) * 0.8
      : 0;

  const glowPulse =
    localFrame > 10
      ? 0.6 + 0.4 * Math.abs(Math.sin(((localFrame - 10) / 25) * Math.PI))
      : 1;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 100,
        left: "50%",
        transform: `translate(calc(-50% + ${shakeX}px), ${shakeY}px) scale(${scale})`,
        opacity,
        zIndex: 20,
      }}
    >
      <div
        style={{
          ...baseText,
          fontSize: 52,
          fontWeight: 900,
          color: brand.white,
          textTransform: "uppercase",
          padding: "28px 56px",
          border: `5px solid ${brand.orange}`,
          background: `rgba(11,11,11,0.92)`,
          boxShadow: `0 0 ${50 * glowPulse}px ${brand.orange}55, inset 0 0 ${30 * glowPulse}px ${brand.orange}22`,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        COMPANY TYPE {">"} JOB TITLE
      </div>
    </div>
  );
};

/* ── Main Scene ─────────────────────────────────────────────── */
export const HeadToHeadScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Darken before banner slam (frame 220-240)
  const darken = interpolate(frame, [220, 235, 240, 260], [0, 0.5, 0.5, 0], {
    ...clamp,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <Shell>
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
            HEAD TO{" "}
            <span style={{ color: brand.yellow }}>HEAD</span>
          </div>
        </GlitchReveal>

        {/* ── Split Layout ──────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            position: "relative",
            marginTop: 30,
          }}
        >
          {/* LEFT: SWE Column */}
          <SlideInLeft delay={40} distance={300} style={{ flex: 1, paddingRight: 60 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                height: "100%",
              }}
            >
              {/* Column header */}
              <div
                style={{
                  ...baseText,
                  fontSize: 36,
                  fontWeight: 900,
                  color: brand.yellow,
                  textTransform: "uppercase",
                  textAlign: "center",
                  padding: "16px 0",
                  borderBottom: `3px solid ${brand.yellow}44`,
                  letterSpacing: 4,
                }}
              >
                🖥️ SWE
              </div>

              {/* Fresher row */}
              <div style={{ marginTop: 24 }}>
                <RowLabel delay={100}>Fresher</RowLabel>
                <ComparisonBar
                  label="Salary Range"
                  value="₹3.5–22 LPA"
                  color={brand.yellow}
                  delay={105}
                  direction="left"
                />
              </div>

              {/* Senior row */}
              <div style={{ marginTop: 24 }}>
                <RowLabel delay={160}>Senior</RowLabel>
                <ComparisonBar
                  label="Salary Range"
                  value="₹45 LPA–2.5 Cr"
                  color={brand.yellow}
                  delay={165}
                  direction="left"
                />
              </div>
            </div>
          </SlideInLeft>

          {/* VS Divider */}
          <VsDivider delay={40} />

          {/* RIGHT: AI Column */}
          <SlideInRight delay={40} distance={300} style={{ flex: 1, paddingLeft: 60 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                height: "100%",
              }}
            >
              {/* Column header */}
              <div
                style={{
                  ...baseText,
                  fontSize: 36,
                  fontWeight: 900,
                  color: brand.orange,
                  textTransform: "uppercase",
                  textAlign: "center",
                  padding: "16px 0",
                  borderBottom: `3px solid ${brand.orange}44`,
                  letterSpacing: 4,
                }}
              >
                🤖 AI
              </div>

              {/* Fresher row */}
              <div style={{ marginTop: 24 }}>
                <RowLabel delay={100}>Fresher</RowLabel>
                <ComparisonBar
                  label="Salary Range"
                  value="₹5–22 LPA"
                  color={brand.orange}
                  delay={105}
                  direction="right"
                />
              </div>

              {/* Senior row */}
              <div style={{ marginTop: 24 }}>
                <RowLabel delay={160}>Senior</RowLabel>
                <ComparisonBar
                  label="Salary Range"
                  value="₹25–80 LPA+"
                  color={brand.orange}
                  delay={165}
                  direction="right"
                />
              </div>
            </div>
          </SlideInRight>
        </div>

        {/* Fresher approx note */}
        <div style={{ position: "absolute", left: "50%", top: 430, transform: "translateX(-50%)", zIndex: 12 }}>
          <ApproxNote delay={130} text="≈ at generalist level" />
        </div>
      </Shell>

      {/* Darken overlay before banner */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(0,0,0,${darken})`,
          pointerEvents: "none",
        }}
      />

      {/* Slam Banner */}
      <SlamBanner delay={240} />
    </div>
  );
};
