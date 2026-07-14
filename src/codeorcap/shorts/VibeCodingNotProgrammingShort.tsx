import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Inter";
import shortData from "../../../public/content/VibeCodingNotProgrammingShort/video.json";
import {
  FadeIn,
  GlitchReveal,
  ScalePop,
  SlideInLeft,
  SlideInRight,
} from "./animations";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "900"] });

const theme = {
  black: "#0B0B0B",
  yellow: "#FFB800",
  orange: "#FF8A00",
  white: "#FFFFFF",
  red: "#FF3B30",
  green: "#00C864",
};

const t: React.CSSProperties = { fontFamily };

// Long-form project image base path — reused for the short
const IMG = (name: string) =>
  staticFile(`content/VibeCodingNotProgramming/images/${name}`);

/* ── Ken Burns image background ────────────────────────────────── */

const SceneImage: React.FC<{
  src: string;
  duration: number;
  zoomDirection?: "in" | "out";
}> = ({ src, duration, zoomDirection = "in" }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  const scale = interpolate(
    frame,
    [0, duration],
    zoomDirection === "in" ? [1.0, 1.07] : [1.07, 1.0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
    },
  );

  return (
    <AbsoluteFill style={{ opacity, zIndex: 0 }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ── Dark gradient overlay ──────────────────────────────────────── */

const ImageOverlay: React.FC<{ strength?: number }> = ({ strength = 0.72 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg,
        rgba(11,11,11,${strength * 0.55}) 0%,
        rgba(11,11,11,${strength}) 40%,
        rgba(11,11,11,${strength * 1.2}) 100%)`,
      zIndex: 1,
      pointerEvents: "none",
    }}
  />
);

/* ── Accent glow at scene top ───────────────────────────────────── */

const AccentGlow: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 18), [-1, 1], [0.92, 1.0]);
  return (
    <div
      style={{
        position: "absolute",
        top: -200,
        left: "50%",
        transform: `translateX(-50%) scale(${pulse})`,
        width: 900,
        height: 600,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}18, transparent 70%)`,
        zIndex: 2,
        pointerEvents: "none",
      }}
    />
  );
};

/* ── Brand mark ─────────────────────────────────────────────────── */

const BrandMark: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 90,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      zIndex: 10,
    }}
  >
    <div
      style={{
        ...t,
        fontSize: 38,
        fontWeight: 900,
        letterSpacing: 6,
        color: theme.yellow,
        textShadow: `0 0 24px ${theme.yellow}55`,
        background: "rgba(11,11,11,0.45)",
        padding: "8px 24px",
        borderRadius: 12,
      }}
    >
      CODE<span style={{ color: "rgba(255,255,255,0.55)" }}>OR</span>CAP
    </div>
  </div>
);

/* ── Progress bar ───────────────────────────────────────────────── */

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 8,
        background: "rgba(255,255,255,0.1)",
        zIndex: 20,
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${theme.yellow}, ${theme.orange})`,
          boxShadow: `0 0 16px ${theme.orange}`,
        }}
      />
    </div>
  );
};

/* ── Stat card ──────────────────────────────────────────────────── */

const StatCard: React.FC<{
  number: string;
  label: string;
  color?: string;
  delay?: number;
}> = ({ number, label, color = theme.red, delay = 0 }) => {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 120, stiffness: 180 },
  });
  const x = interpolate(progress, [0, 1], [-240, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateX(${x}px)`,
        display: "flex",
        alignItems: "center",
        gap: 28,
        background: "rgba(0,0,0,0.55)",
        border: `2px solid ${color}55`,
        borderRadius: 22,
        padding: "26px 40px",
        marginBottom: 22,
        width: "100%",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          ...t,
          fontSize: 88,
          fontWeight: 900,
          color,
          textShadow: `0 0 28px ${color}88`,
          lineHeight: 1,
          minWidth: 220,
          textAlign: "center",
        }}
      >
        {number}
      </div>
      <div
        style={{
          ...t,
          fontSize: 36,
          fontWeight: 700,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.35,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/* ── Scene 1: Hook ────────────────────────────────────────────── */

const HookScene: React.FC<{ durationFrames: number }> = ({
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 7), [-1, 1], [0.88, 1.0]);

  return (
    <AbsoluteFill>
      <SceneImage
        src={IMG("hook.jpg")}
        duration={durationFrames}
        zoomDirection="in"
      />
      <ImageOverlay strength={0.68} />
      <AccentGlow color={theme.red} />
      <BrandMark />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 64px",
          zIndex: 5,
        }}
      >
        <GlitchReveal delay={8}>
          <div
            style={{
              ...t,
              fontSize: 148,
              fontWeight: 900,
              color: theme.white,
              textTransform: "uppercase",
              textAlign: "center",
              lineHeight: 0.92,
              textShadow: "0 6px 40px rgba(0,0,0,0.9)",
            }}
          >
            VIBE
          </div>
          <div
            style={{
              ...t,
              fontSize: 148,
              fontWeight: 900,
              color: theme.yellow,
              textTransform: "uppercase",
              textAlign: "center",
              lineHeight: 0.92,
              textShadow: `0 0 70px ${theme.yellow}55`,
            }}
          >
            CODING
          </div>
        </GlitchReveal>

        <SlideInLeft delay={22} distance={200}>
          <div style={{ marginTop: 56, textAlign: "center" }}>
            <div
              style={{
                ...t,
                fontSize: 56,
                fontWeight: 900,
                color: theme.orange,
                textTransform: "uppercase",
                letterSpacing: 4,
              }}
            >
              PROGRAMMING HAI
            </div>
            <div
              style={{
                ...t,
                fontSize: 56,
                fontWeight: 900,
                color: theme.orange,
                textTransform: "uppercase",
                letterSpacing: 4,
              }}
            >
              YA...
            </div>
            <div
              style={{
                ...t,
                fontSize: 96,
                fontWeight: 900,
                color: theme.red,
                textAlign: "center",
                textTransform: "uppercase",
                transform: `scale(${pulse})`,
                textShadow: `0 0 50px ${theme.red}88`,
                marginTop: 16,
              }}
            >
              TIME BOMB? 💣
            </div>
          </div>
        </SlideInLeft>
      </div>

      <ProgressBar />
    </AbsoluteFill>
  );
};

/* ── Scene 2: Reveal ──────────────────────────────────────────── */

const RevealScene: React.FC<{ durationFrames: number }> = ({
  durationFrames,
}) => (
  <AbsoluteFill>
    <SceneImage
      src={IMG("claim.jpg")}
      duration={durationFrames}
      zoomDirection="out"
    />
    <ImageOverlay strength={0.72} />
    <AccentGlow color={theme.yellow} />
    <BrandMark />

    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 64px",
        gap: 44,
        zIndex: 5,
      }}
    >
      <FadeIn delay={5}>
        <div
          style={{
            ...t,
            fontSize: 42,
            fontWeight: 700,
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            letterSpacing: 6,
            textAlign: "center",
          }}
        >
          Karpathy · 2025
        </div>
      </FadeIn>

      <GlitchReveal delay={12}>
        <div
          style={{
            ...t,
            fontSize: 62,
            fontWeight: 900,
            color: theme.white,
            textAlign: "center",
            lineHeight: 1.35,
            textShadow: "0 4px 20px rgba(0,0,0,0.8)",
          }}
        >
          AI ko bolo —{"\n"}
          <span style={{ color: theme.yellow }}>code khud likhega</span>
        </div>
      </GlitchReveal>

      <ScalePop delay={32}>
        <div
          style={{
            background: "rgba(0,0,0,0.6)",
            border: `3px solid ${theme.yellow}`,
            borderRadius: 26,
            padding: "32px 64px",
            textAlign: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              ...t,
              fontSize: 140,
              fontWeight: 900,
              color: theme.yellow,
              lineHeight: 1,
              textShadow: `0 0 50px ${theme.yellow}66`,
            }}
          >
            92%
          </div>
          <div
            style={{
              ...t,
              fontSize: 38,
              fontWeight: 700,
              color: "rgba(255,255,255,0.75)",
              marginTop: 8,
            }}
          >
            developers AI se code likhte hain
          </div>
        </div>
      </ScalePop>

      <FadeIn delay={55}>
        <div
          style={{
            ...t,
            fontSize: 54,
            fontWeight: 900,
            color: theme.orange,
            textAlign: "center",
          }}
        >
          +21% FASTER ⚡
        </div>
      </FadeIn>
    </div>

    <ProgressBar />
  </AbsoluteFill>
);

/* ── Scene 3: Danger ──────────────────────────────────────────── */

const DangerScene: React.FC<{ durationFrames: number }> = ({
  durationFrames,
}) => (
  <AbsoluteFill>
    <SceneImage
      src={IMG("evidence2.jpg")}
      duration={durationFrames}
      zoomDirection="in"
    />
    <ImageOverlay strength={0.78} />
    <AccentGlow color={theme.red} />
    <BrandMark />

    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 56px",
        zIndex: 5,
      }}
    >
      <FadeIn delay={0}>
        <div
          style={{
            ...t,
            fontSize: 42,
            fontWeight: 900,
            color: theme.red,
            textTransform: "uppercase",
            letterSpacing: 8,
            textAlign: "center",
            marginBottom: 54,
            border: `2px solid ${theme.red}`,
            padding: "12px 36px",
            borderRadius: 10,
            textShadow: `0 0 20px ${theme.red}66`,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          ⚠ DATA BOLTA HAI
        </div>
      </FadeIn>

      <StatCard
        number="45%"
        label="AI code mein security holes hain"
        color={theme.red}
        delay={12}
      />
      <StatCard
        number="10.5%"
        label="code jo security review paas karta hai"
        color={theme.orange}
        delay={35}
      />
      <StatCard
        number="1.5M"
        label="API keys ek app se leak hue — zero reviews"
        color="#FF8A00"
        delay={60}
      />
    </div>

    <ProgressBar />
  </AbsoluteFill>
);

/* ── Scene 4: Truth ───────────────────────────────────────────── */

const TruthScene: React.FC<{ durationFrames: number }> = ({
  durationFrames,
}) => (
  <AbsoluteFill>
    <SceneImage
      src={IMG("headToHead.jpg")}
      duration={durationFrames}
      zoomDirection="out"
    />
    <ImageOverlay strength={0.74} />
    <BrandMark />

    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 56px",
        gap: 44,
        zIndex: 5,
      }}
    >
      <FadeIn delay={5}>
        <div
          style={{
            ...t,
            fontSize: 52,
            fontWeight: 900,
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            letterSpacing: 6,
            textAlign: "center",
          }}
        >
          FARK SAMJHO
        </div>
      </FadeIn>

      <SlideInLeft delay={15} distance={280}>
        <div
          style={{
            background: "rgba(0,0,0,0.6)",
            border: `2px solid ${theme.yellow}66`,
            borderRadius: 22,
            padding: "40px 48px",
            textAlign: "center",
            width: "100%",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              ...t,
              fontSize: 50,
              fontWeight: 900,
              color: theme.yellow,
              marginBottom: 14,
            }}
          >
            VIBE CODING
          </div>
          <div
            style={{ ...t, fontSize: 42, fontWeight: 700, color: theme.white }}
          >
            Code <span style={{ color: theme.orange }}>generate</span> karta hai
          </div>
        </div>
      </SlideInLeft>

      <FadeIn delay={22}>
        <div
          style={{
            ...t,
            fontSize: 80,
            fontWeight: 900,
            color: "rgba(255,255,255,0.3)",
            textAlign: "center",
          }}
        >
          ≠
        </div>
      </FadeIn>

      <SlideInRight delay={30} distance={280}>
        <div
          style={{
            background: "rgba(0,0,0,0.6)",
            border: "2px solid rgba(0,200,100,0.45)",
            borderRadius: 22,
            padding: "40px 48px",
            textAlign: "center",
            width: "100%",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              ...t,
              fontSize: 50,
              fontWeight: 900,
              color: theme.green,
              marginBottom: 14,
            }}
          >
            PROGRAMMING
          </div>
          <div
            style={{ ...t, fontSize: 42, fontWeight: 700, color: theme.white }}
          >
            Code <span style={{ color: theme.green }}>samajhta</span> hai
          </div>
        </div>
      </SlideInRight>
    </div>

    <ProgressBar />
  </AbsoluteFill>
);

/* ── Scene 5: Verdict ─────────────────────────────────────────── */

const VerdictScene: React.FC<{ durationFrames: number }> = ({
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const scoreSpring = spring({
    frame: frame - 18,
    fps: 30,
    config: { damping: 80, stiffness: 200 },
  });

  return (
    <AbsoluteFill>
      <SceneImage
        src={IMG("verdict.jpg")}
        duration={durationFrames}
        zoomDirection="in"
      />
      <ImageOverlay strength={0.75} />
      <AccentGlow color={theme.yellow} />
      <BrandMark />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 64px",
          gap: 36,
          zIndex: 5,
        }}
      >
        <GlitchReveal delay={5}>
          <div
            style={{
              ...t,
              fontSize: 46,
              fontWeight: 900,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 10,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            VERDICT
          </div>
        </GlitchReveal>

        <div
          style={{
            transform: `scale(${scoreSpring})`,
            opacity: scoreSpring,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...t,
              fontSize: 210,
              fontWeight: 900,
              color: theme.yellow,
              lineHeight: 1,
              textShadow: `0 0 70px ${theme.yellow}55`,
            }}
          >
            3
          </div>
          <div
            style={{
              ...t,
              fontSize: 56,
              fontWeight: 700,
              color: "rgba(255,255,255,0.35)",
              marginTop: -16,
            }}
          >
            / 10
          </div>
        </div>

        <ScalePop delay={38}>
          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              border: `3px solid ${theme.red}`,
              borderRadius: 18,
              padding: "20px 56px",
              textAlign: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                ...t,
                fontSize: 70,
                fontWeight: 900,
                color: theme.red,
                textTransform: "uppercase",
                letterSpacing: 4,
                textShadow: `0 0 30px ${theme.red}66`,
              }}
            >
              MOSTLY CAP
            </div>
          </div>
        </ScalePop>

        <FadeIn delay={52}>
          <div
            style={{
              ...t,
              fontSize: 44,
              fontWeight: 700,
              color: "rgba(255,255,255,0.65)",
              textAlign: "center",
              lineHeight: 1.45,
            }}
          >
            Accelerator hai — autopilot nahi
          </div>
        </FadeIn>
      </div>

      <ProgressBar />
    </AbsoluteFill>
  );
};

/* ── Scene 6: CTA ─────────────────────────────────────────────── */

const CTAScene: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 9), [-1, 1], [0.96, 1.04]);

  return (
    <AbsoluteFill>
      <SceneImage
        src={IMG("cta.jpg")}
        duration={durationFrames}
        zoomDirection="in"
      />
      <ImageOverlay strength={0.7} />
      <AccentGlow color={theme.yellow} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 64px",
          gap: 52,
          zIndex: 5,
        }}
      >
        <ScalePop delay={6}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                ...t,
                fontSize: 100,
                fontWeight: 900,
                color: theme.yellow,
                letterSpacing: 5,
                lineHeight: 1,
                textShadow: `0 0 40px ${theme.yellow}66`,
              }}
            >
              CODE
            </div>
            <div
              style={{
                ...t,
                fontSize: 54,
                fontWeight: 700,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: 10,
              }}
            >
              OR
            </div>
            <div
              style={{
                ...t,
                fontSize: 100,
                fontWeight: 900,
                color: theme.white,
                letterSpacing: 5,
                lineHeight: 1,
              }}
            >
              CAP
            </div>
          </div>
        </ScalePop>

        <FadeIn delay={22}>
          <div
            style={{
              ...t,
              fontSize: 44,
              fontWeight: 700,
              color: "rgba(255,255,255,0.65)",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Programming mat chhodo.{"\n"}
            Hum evidence se chalte hain.
          </div>
        </FadeIn>

        <div style={{ transform: `scale(${pulse})` }}>
          <div
            style={{
              background: theme.yellow,
              borderRadius: 100,
              padding: "32px 88px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                ...t,
                fontSize: 56,
                fontWeight: 900,
                color: theme.black,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              SUBSCRIBE ↗
            </div>
          </div>
        </div>
      </div>

      <ProgressBar />
    </AbsoluteFill>
  );
};

/* ── Root composition ─────────────────────────────────────────── */

const scenes = shortData.scenes;

export const VibeCodingNotProgrammingShort: React.FC = () => (
  <AbsoluteFill style={{ background: theme.black }}>
    <Audio
      src={staticFile(
        "content/VibeCodingNotProgrammingShort/audio/voiceover.mp3",
      )}
      from={-29}
    />

    <Sequence
      from={scenes[0]?.startFrame ?? 0}
      durationInFrames={scenes[0]?.durationFrames ?? 313}
    >
      <HookScene durationFrames={scenes[0]?.durationFrames ?? 313} />
    </Sequence>

    <Sequence
      from={scenes[1]?.startFrame ?? 313}
      durationInFrames={scenes[1]?.durationFrames ?? 561}
    >
      <RevealScene durationFrames={scenes[1]?.durationFrames ?? 561} />
    </Sequence>

    <Sequence
      from={scenes[2]?.startFrame ?? 874}
      durationInFrames={scenes[2]?.durationFrames ?? 668}
    >
      <DangerScene durationFrames={scenes[2]?.durationFrames ?? 668} />
    </Sequence>

    <Sequence
      from={scenes[3]?.startFrame ?? 1542}
      durationInFrames={scenes[3]?.durationFrames ?? 386}
    >
      <TruthScene durationFrames={scenes[3]?.durationFrames ?? 386} />
    </Sequence>

    <Sequence
      from={scenes[4]?.startFrame ?? 1928}
      durationInFrames={scenes[4]?.durationFrames ?? 276}
    >
      <VerdictScene durationFrames={scenes[4]?.durationFrames ?? 276} />
    </Sequence>

    <Sequence
      from={scenes[5]?.startFrame ?? 2204}
      durationInFrames={scenes[5]?.durationFrames ?? 224}
    >
      <CTAScene durationFrames={scenes[5]?.durationFrames ?? 224} />
    </Sequence>
  </AbsoluteFill>
);
