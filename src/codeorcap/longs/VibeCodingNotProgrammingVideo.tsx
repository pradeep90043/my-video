import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { Audio } from "@remotion/media";
import { z } from "zod";
import vibeVideoData from "../../../public/content/VibeCodingNotProgramming/video.json";
import { baseText } from "../shorts/Primitives";
import { GlitchReveal, ScalePop, SlideInLeft } from "../shorts/animations";
import { ThreeAvatar } from "../../shared/components/ThreeAvatar";

// Custom theme colors for this video
const theme = {
  black: "#0B0B0B",
  yellow: "#FFB800",
  orange: "#FF8A00",
  white: "#FFFFFF",
  red: "#FF3B30",
};

// Smooth Image component with Ken Burns effect
const SmoothImage: React.FC<{
  src: string;
  startFrame: number;
  endFrame: number;
  zoomDirection?: "in" | "out";
  fadeDuration?: number;
}> = ({
  src,
  startFrame,
  endFrame,
  zoomDirection = "in",
  fadeDuration = 25,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (frame < startFrame || frame > endFrame + fadeDuration) {
    return null;
  }

  const opacity = interpolate(localFrame, [0, fadeDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  const totalDuration = endFrame - startFrame + fadeDuration;

  const scale = interpolate(
    localFrame,
    [0, totalDuration],
    zoomDirection === "in" ? [1.0, 1.05] : [1.05, 1.0],
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
          translate: "-2.8px 15.7px",
          rotate: interpolate(frame, [656], ["0deg"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          opacity: interpolate(frame, [656], [1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
        from={-96}
      />
    </AbsoluteFill>
  );
};

// Dark overlay for readability
const ImageOverlay: React.FC<{ opacity?: number }> = ({ opacity = 0.65 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(11,11,11,${opacity * 0.7}) 0%, rgba(11,11,11,${opacity}) 50%, rgba(11,11,11,${opacity * 1.25}) 100%)`,
      zIndex: 1,
      pointerEvents: "none",
    }}
  />
);

// Cyberpunk Matrix background
const MatrixRain: React.FC = () => {
  const frame = useCurrentFrame();
  const cols = 30;
  const columns = useMemo(() => {
    return Array.from({ length: cols }, (_, i) => {
      const seed = (i * 13 + 7) % 19;
      const speed = 1.0 + (seed % 6) * 0.3;
      const startOffset = (seed * 50) % 400;
      return { i, speed, startOffset, char: seed % 2 === 0 ? "1" : "0" };
    });
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.15,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
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
              fontSize: 20,
              fontWeight: 600,
              color: theme.orange,
              opacity: 0.5,
              textShadow: `0 0 6px ${theme.orange}`,
            }}
          >
            {char}
          </div>
        );
      })}
    </div>
  );
};

// Glassmorphic stats container
const GlassContainer: React.FC<{
  children: React.ReactNode;
  width?: string | number;
  style?: React.CSSProperties;
  borderColor?: string;
}> = ({
  children,
  width = "auto",
  style,
  borderColor = "rgba(255,184,0,0.25)",
}) => (
  <div
    style={{
      width,
      borderRadius: 24,
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
      border: `1px solid ${borderColor}`,
      boxShadow:
        "0 24px 60px rgba(0,0,0,0.5), inset 0 2px 20px rgba(255,255,255,0.05)",
      backdropFilter: "blur(30px)",
      WebkitBackdropFilter: "blur(30px)",
      padding: "40px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

// HUD Overlay for all scenes
const ProfessionalHUD: React.FC<{
  previewMode: boolean;
  currentSceneIndex: number;
  totalScenes: number;
}> = ({ previewMode, currentSceneIndex, totalScenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = (vibeVideoData as any).totalFrames || 9000;
  const progress = frame / totalFrames;
  const timeSeconds = frame / fps;
  const timeString = `${Math.floor(timeSeconds / 60)}:${Math.floor(
    timeSeconds % 60,
  )
    .toString()
    .padStart(2, "0")}:${Math.floor((timeSeconds % 1) * 100)
    .toString()
    .padStart(2, "0")}`;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 10 }}>
      {/* Top Left: Scene Badge */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          background: "rgba(11, 11, 11, 0.7)",
          backdropFilter: "blur(20px)",
          padding: "14px 28px",
          borderRadius: "100px",
          border: "1px solid rgba(255, 184, 0, 0.25)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: theme.yellow,
            boxShadow: `0 0 10px ${theme.yellow}`,
          }}
        />
        <span
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: 600,
            fontFamily: "monospace",
            letterSpacing: "0.1em",
          }}
        >
          SCENE {currentSceneIndex + 1} / {totalScenes}
        </span>
      </div>

      {/* Top Right: Timecode */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 60,
          color: "rgba(255, 255, 255, 0.6)",
          fontSize: 24,
          fontFamily: "monospace",
          fontWeight: 600,
          letterSpacing: 2,
        }}
      >
        {timeString}
      </div>

      {/* Top Center logo */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: "50%",
          transform: "translateX(-50%)",
          color: theme.yellow,
          fontSize: 20,
          fontFamily: "monospace",
          fontWeight: 900,
          letterSpacing: 4,
        }}
      >
        CODE<span style={{ color: theme.white }}>OR</span>CAP
      </div>

      {/* Bottom: Neon Progress Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${theme.yellow}, ${theme.orange}, ${theme.red})`,
            boxShadow: `0 0 16px ${theme.orange}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ── Scene Components ───────────────────────────────────────── */

// 1. Hook Scene
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Bomb timer pulsation
  const timerPulse = interpolate(
    Math.sin((frame / 30) * Math.PI * 2),
    [-1, 1],
    [0.6, 1.0],
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <GlitchReveal delay={10}>
        <div
          style={{
            ...baseText,
            fontSize: 100,
            fontWeight: 900,
            color: theme.white,
            textAlign: "center",
            textTransform: "uppercase",
            textShadow: "0 0 40px rgba(0,0,0,0.8)",
          }}
        >
          VIBE <span style={{ color: theme.yellow }}>CODING</span>
        </div>
      </GlitchReveal>

      <SlideInLeft delay={30} distance={150}>
        <div
          style={{
            ...baseText,
            fontSize: 48,
            fontWeight: 800,
            color: theme.orange,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 6,
            marginTop: 20,
            textShadow: "0 0 30px rgba(0,0,0,0.8)",
          }}
        >
          IS THIS EVEN PROGRAMMING?
        </div>
      </SlideInLeft>

      {/* Pulsing warning bomb indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 220,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(255, 59, 48, 0.15)",
          border: `1px solid ${theme.red}`,
          padding: "12px 24px",
          borderRadius: 12,
          opacity: timerPulse,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: theme.red,
          }}
        />
        <span
          style={{
            ...baseText,
            color: theme.white,
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: 2,
            fontFamily: "monospace",
          }}
        >
          SYS_WARNING: FRAGILE_STACK
        </span>
      </div>
    </AbsoluteFill>
  );
};

// 2. Claim Scene
const ClaimScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <ScalePop delay={10}>
        <GlassContainer width={850}>
          <div
            style={{
              ...baseText,
              color: theme.yellow,
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 4,
              border: `2px solid ${theme.yellow}`,
              padding: "8px 20px",
              borderRadius: 8,
              marginBottom: 30,
            }}
          >
            CLAIM
          </div>
          <div
            style={{
              ...baseText,
              color: theme.white,
              fontSize: 46,
              fontWeight: 900,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            "YOU DON'T NEED TO LEARN CODING ANYMORE. AI WILL DO IT ALL."
          </div>
          <div
            style={{
              ...baseText,
              color: "rgba(255, 255, 255, 0.4)",
              fontSize: 20,
              fontWeight: 600,
              marginTop: 30,
              letterSpacing: 1,
            }}
          >
            coined by Karpathy · 2025 · 92% of devs use AI code
          </div>
        </GlassContainer>
      </ScalePop>
    </AbsoluteFill>
  );
};

// 3. Rules Scene
const RulesScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Spring animation for columns
  const col1 = spring({ frame: frame - 15, fps: 30, config: { damping: 15 } });
  const col2 = spring({ frame: frame - 25, fps: 30, config: { damping: 15 } });
  const col3 = spring({ frame: frame - 35, fps: 30, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          ...baseText,
          fontSize: 32,
          fontWeight: 900,
          color: theme.white,
          marginBottom: 50,
          letterSpacing: 4,
        }}
      >
        VERIFICATION METRICS
      </div>

      <div style={{ display: "flex", gap: 32, width: 1100 }}>
        {/* Col 1 */}
        <div style={{ flex: 1, transform: `scale(${col1})`, opacity: col1 }}>
          <GlassContainer borderColor="rgba(255,184,0,0.4)">
            <div
              style={{
                ...baseText,
                fontSize: 24,
                fontWeight: 900,
                color: theme.yellow,
                marginBottom: 12,
              }}
            >
              01
            </div>
            <div
              style={{
                ...baseText,
                fontSize: 28,
                fontWeight: 800,
                color: theme.white,
              }}
            >
              SECURITY
            </div>
          </GlassContainer>
        </div>

        {/* Col 2 */}
        <div style={{ flex: 1, transform: `scale(${col2})`, opacity: col2 }}>
          <GlassContainer borderColor="rgba(255,184,0,0.4)">
            <div
              style={{
                ...baseText,
                fontSize: 24,
                fontWeight: 900,
                color: theme.yellow,
                marginBottom: 12,
              }}
            >
              02
            </div>
            <div
              style={{
                ...baseText,
                fontSize: 28,
                fontWeight: 800,
                color: theme.white,
              }}
            >
              UNDERSTANDING
            </div>
          </GlassContainer>
        </div>

        {/* Col 3 */}
        <div style={{ flex: 1, transform: `scale(${col3})`, opacity: col3 }}>
          <GlassContainer borderColor="rgba(255,184,0,0.4)">
            <div
              style={{
                ...baseText,
                fontSize: 24,
                fontWeight: 900,
                color: theme.yellow,
                marginBottom: 12,
              }}
            >
              03
            </div>
            <div
              style={{
                ...baseText,
                fontSize: 26,
                fontWeight: 800,
                color: theme.white,
              }}
            >
              PRODUCTION
            </div>
          </GlassContainer>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 4. Evidence 1: The Wins
const Evidence1Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const speedProgress = spring({ frame: frame - 15, fps: 30 });
  const adoptionProgress = spring({ frame: frame - 30, fps: 30 });
  const demoProgress = spring({ frame: frame - 45, fps: 30 });

  // Count animations
  const speedVal = Math.round(interpolate(speedProgress, [0, 1], [0, 21]));
  const adoptionVal = Math.round(
    interpolate(adoptionProgress, [0, 1], [0, 92]),
  );
  const demoVal = Math.round(interpolate(demoProgress, [0, 1], [0, 63]));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          ...baseText,
          fontSize: 32,
          fontWeight: 900,
          color: theme.yellow,
          marginBottom: 50,
          letterSpacing: 4,
        }}
      >
        VIBE CODING: THE WINS
      </div>

      <div style={{ display: "flex", gap: 30, width: 1200 }}>
        <GlassContainer style={{ flex: 1, height: 280 }}>
          <div
            style={{
              ...baseText,
              fontSize: 72,
              fontWeight: 900,
              color: theme.yellow,
            }}
          >
            ~{speedVal}%
          </div>
          <div
            style={{
              ...baseText,
              fontSize: 20,
              fontWeight: 700,
              color: theme.white,
              textAlign: "center",
              marginTop: 15,
            }}
          >
            FASTER TASK COMPLETION
          </div>
        </GlassContainer>

        <GlassContainer style={{ flex: 1, height: 280 }}>
          <div
            style={{
              ...baseText,
              fontSize: 72,
              fontWeight: 900,
              color: theme.white,
            }}
          >
            ~{adoptionVal}%
          </div>
          <div
            style={{
              ...baseText,
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
              marginTop: 15,
            }}
          >
            DEVS USING AI TOOLS
          </div>
        </GlassContainer>

        <GlassContainer style={{ flex: 1, height: 280 }}>
          <div
            style={{
              ...baseText,
              fontSize: 72,
              fontWeight: 900,
              color: theme.yellow,
            }}
          >
            {demoVal}%
          </div>
          <div
            style={{
              ...baseText,
              fontSize: 20,
              fontWeight: 700,
              color: theme.white,
              textAlign: "center",
              marginTop: 15,
            }}
          >
            NON-DEVS BUILDING APPS
          </div>
        </GlassContainer>
      </div>
    </AbsoluteFill>
  );
};

// 5. Evidence 2: The Danger
const Evidence2Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const v1 = spring({ frame: frame - 15, fps: 30 });
  const v2 = spring({ frame: frame - 30, fps: 30 });
  const v3 = spring({ frame: frame - 45, fps: 30 });

  const vulnVal = Math.round(interpolate(v1, [0, 1], [0, 45]));
  const passVal = interpolate(v2, [0, 1], [0, 10.5]).toFixed(1);
  const secretVal = interpolate(v3, [0, 1], [1, 2]).toFixed(1);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          ...baseText,
          fontSize: 32,
          fontWeight: 900,
          color: theme.red,
          marginBottom: 40,
          letterSpacing: 4,
        }}
      >
        VIBE CODING: THE DANGER
      </div>

      <div style={{ display: "flex", gap: 30, width: 1200, marginBottom: 30 }}>
        <GlassContainer
          borderColor="rgba(255,59,48,0.3)"
          style={{ flex: 1, height: 260 }}
        >
          <div
            style={{
              ...baseText,
              fontSize: 64,
              fontWeight: 900,
              color: theme.red,
            }}
          >
            {vulnVal}%
          </div>
          <div
            style={{
              ...baseText,
              fontSize: 18,
              fontWeight: 700,
              color: theme.white,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            CODE VULNERABLE (OWASP TOP-10)
          </div>
        </GlassContainer>

        <GlassContainer
          borderColor="rgba(255,59,48,0.3)"
          style={{ flex: 1, height: 260 }}
        >
          <div
            style={{
              ...baseText,
              fontSize: 64,
              fontWeight: 900,
              color: theme.red,
            }}
          >
            {passVal}%
          </div>
          <div
            style={{
              ...baseText,
              fontSize: 18,
              fontWeight: 700,
              color: theme.white,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            PASS SECURITY REVIEW
          </div>
        </GlassContainer>

        <GlassContainer
          borderColor="rgba(255,59,48,0.3)"
          style={{ flex: 1, height: 260 }}
        >
          <div
            style={{
              ...baseText,
              fontSize: 64,
              fontWeight: 900,
              color: theme.red,
            }}
          >
            {secretVal}x
          </div>
          <div
            style={{
              ...baseText,
              fontSize: 18,
              fontWeight: 700,
              color: theme.white,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            SECRETS & API KEYS LEAKED
          </div>
        </GlassContainer>
      </div>

      {/* Incident log overlay */}
      <ScalePop delay={60}>
        <div
          style={{
            background: "rgba(255,59,48,0.08)",
            border: `1px solid ${theme.red}`,
            borderRadius: 16,
            padding: "16px 36px",
            color: theme.white,
            ...baseText,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 1,
            textAlign: "center",
          }}
        >
          REAL INCIDENTS: <span style={{ color: theme.red }}>Tea App</span> (DMs
          leaked) · <span style={{ color: theme.red }}>1.5 Million</span> API
          Keys exposed in production
        </div>
      </ScalePop>
    </AbsoluteFill>
  );
};

// 6. Head To Head
const HeadToHeadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const leftSlide = spring({
    frame: frame - 10,
    fps: 30,
    config: { damping: 15 },
  });
  const rightSlide = spring({
    frame: frame - 20,
    fps: 30,
    config: { damping: 15 },
  });
  const tagPop = spring({ frame: frame - 40, fps: 30 });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{ display: "flex", gap: 50, width: 1200, alignItems: "stretch" }}
      >
        {/* Left Side: Vibe Coding */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${interpolate(leftSlide, [0, 1], [-100, 0])}px)`,
            opacity: leftSlide,
          }}
        >
          <GlassContainer
            borderColor={theme.yellow}
            style={{
              height: "100%",
              justifyContent: "flex-start",
              minHeight: 400,
            }}
          >
            <div
              style={{
                ...baseText,
                fontSize: 36,
                fontWeight: 900,
                color: theme.yellow,
                marginBottom: 20,
              }}
            >
              VIBE CODING
            </div>
            <ul
              style={{
                ...baseText,
                color: theme.white,
                fontSize: 20,
                lineHeight: 2,
                paddingLeft: 20,
                alignSelf: "flex-start",
              }}
            >
              <li>🚀 Fast Prototype Building</li>
              <li>⚡ AI Writes the Code</li>
              <li>💡 Language-based inputs</li>
              <li
                style={{
                  color: theme.red,
                  fontWeight: 900,
                  transform: `scale(${tagPop})`,
                  opacity: tagPop,
                  marginTop: 20,
                }}
              >
                ⚠️ SSRF Vulnerabilities & No CSRF Protection
              </li>
            </ul>
          </GlassContainer>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            ...baseText,
            fontSize: 44,
            fontWeight: 900,
            color: theme.white,
          }}
        >
          VS
        </div>

        {/* Right Side: Programming */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${interpolate(rightSlide, [0, 1], [100, 0])}px)`,
            opacity: rightSlide,
          }}
        >
          <GlassContainer
            borderColor={theme.orange}
            style={{
              height: "100%",
              justifyContent: "flex-start",
              minHeight: 400,
            }}
          >
            <div
              style={{
                ...baseText,
                fontSize: 36,
                fontWeight: 900,
                color: theme.orange,
                marginBottom: 20,
              }}
            >
              PROGRAMMING
            </div>
            <ul
              style={{
                ...baseText,
                color: theme.white,
                fontSize: 20,
                lineHeight: 2,
                paddingLeft: 20,
                alignSelf: "flex-start",
              }}
            >
              <li>🧠 Edge Cases Handling</li>
              <li>🛡️ Security & Architecture</li>
              <li>🔧 Debugging & Diagnostics</li>
              <li>🎯 Deciding IF code is correct</li>
            </ul>
          </GlassContainer>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 7. Reality Scene
const RealityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const bottomSlab = spring({ frame: frame - 10, fps: 30 });
  const topSlab = spring({ frame: frame - 25, fps: 30 });
  const meter = spring({ frame: frame - 45, fps: 30 });

  const trustVal = Math.round(interpolate(meter, [0, 1], [40, 29]));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 850 }}>
        {/* Top layer (Vibe Coding) */}
        <div
          style={{
            transform: `translateY(${interpolate(topSlab, [0, 1], [-50, 0])}px)`,
            opacity: topSlab,
          }}
        >
          <GlassContainer
            borderColor={theme.yellow}
            style={{ padding: "24px", marginBottom: 16 }}
          >
            <div
              style={{
                ...baseText,
                fontSize: 26,
                fontWeight: 900,
                color: theme.yellow,
              }}
            >
              VIBE CODING (Accelerator Layer)
            </div>
          </GlassContainer>
        </div>

        {/* Connection divider */}
        <div
          style={{
            height: 12,
            background: theme.white,
            opacity: topSlab * bottomSlab,
            width: 4,
            margin: "0 auto 16px",
          }}
        />

        {/* Base layer (Programming) */}
        <div
          style={{
            transform: `translateY(${interpolate(bottomSlab, [0, 1], [50, 0])}px)`,
            opacity: bottomSlab,
          }}
        >
          <GlassContainer
            borderColor={theme.orange}
            style={{ padding: "30px" }}
          >
            <div
              style={{
                ...baseText,
                fontSize: 32,
                fontWeight: 900,
                color: theme.white,
              }}
            >
              PROGRAMMING (Fundamentals & Judgment)
            </div>
          </GlassContainer>
        </div>
      </div>

      {/* Trust Meter Box */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "rgba(11,11,11,0.8)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "16px 32px",
          borderRadius: 16,
          transform: `scale(${meter})`,
          opacity: meter,
        }}
      >
        <div
          style={{
            ...baseText,
            fontSize: 20,
            color: "rgba(255,255,255,0.6)",
            fontWeight: 700,
          }}
        >
          SENIOR ENGINEER TRUST IN AI ACCURACY:
        </div>
        <div
          style={{
            ...baseText,
            fontSize: 32,
            fontWeight: 900,
            color: theme.red,
          }}
        >
          40% → {trustVal}%
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 8. Verdict Scene
const VerdictScene: React.FC = () => {
  const frame = useCurrentFrame();
  const stampSlab = spring({
    frame: frame - 15,
    fps: 30,
    config: { damping: 10, stiffness: 220 },
  });
  const scale = interpolate(stampSlab, [0, 1], [2.0, 1.0]);

  // Count up rating
  const ratingProgress = spring({ frame: frame - 35, fps: 30 });
  const ratingVal = Math.round(interpolate(ratingProgress, [0, 1], [0, 3]));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <GlassContainer
        borderColor={theme.red}
        style={{ width: 750, padding: "50px" }}
      >
        <div
          style={{
            ...baseText,
            fontSize: 28,
            fontWeight: 900,
            color: theme.white,
            letterSpacing: 4,
            marginBottom: 20,
          }}
        >
          HYPOTHESIS VERDICT
        </div>

        <div
          style={{
            transform: `scale(${scale})`,
            opacity: stampSlab,
            filter: stampSlab < 1 ? "blur(4px)" : "none",
          }}
        >
          <div
            style={{
              ...baseText,
              fontSize: 100,
              fontWeight: 900,
              color: theme.red,
              border: `10px solid ${theme.red}`,
              padding: "20px 60px",
              borderRadius: 24,
              transform: "rotate(-10deg)",
              textShadow: `0 0 40px ${theme.red}88`,
              boxShadow: `0 0 50px ${theme.red}33`,
              backgroundColor: "rgba(11,11,11,0.9)",
            }}
          >
            ❌ CAP
          </div>
        </div>

        <div
          style={{
            ...baseText,
            fontSize: 36,
            fontWeight: 900,
            color: theme.white,
            marginTop: 40,
          }}
        >
          TRUTH RATING:{" "}
          <span style={{ color: theme.red }}>{ratingVal} / 10</span>
        </div>

        <div
          style={{
            ...baseText,
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 700,
            marginTop: 15,
            fontStyle: "italic",
          }}
        >
          "...but the danger is REAL."
        </div>
      </GlassContainer>
    </AbsoluteFill>
  );
};

// 9. CTA Scene
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(
    Math.sin((frame / 20) * Math.PI * 2),
    [-1, 1],
    [0.95, 1.02],
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            ...baseText,
            fontSize: 80,
            fontWeight: 900,
            color: theme.white,
            letterSpacing: 4,
          }}
        >
          CODE<span style={{ color: theme.yellow }}>OR</span>CAP
        </div>

        <div
          style={{
            ...baseText,
            fontSize: 28,
            color: theme.orange,
            fontWeight: 800,
            marginTop: 16,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Stop Guessing. Start Knowing.
        </div>

        <div
          style={{
            marginTop: 40,
            transform: `scale(${pulse})`,
          }}
        >
          <button
            style={{
              ...baseText,
              background: theme.yellow,
              color: theme.black,
              border: "none",
              borderRadius: 12,
              padding: "20px 48px",
              fontSize: 28,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: `0 0 30px ${theme.yellow}66`,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            SUBSCRIBE
          </button>
        </div>

        <div
          style={{
            ...baseText,
            color: "rgba(255,255,255,0.4)",
            fontSize: 20,
            fontWeight: 700,
            marginTop: 40,
          }}
        >
          YouTube @codeorcap · Instagram @codeorcap
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Map of scene components
const SceneComponents: Record<string, React.FC> = {
  hook: HookScene,
  claim: ClaimScene,
  rules: RulesScene,
  evidence1: Evidence1Scene,
  evidence2: Evidence2Scene,
  headToHead: HeadToHeadScene,
  reality: RealityScene,
  verdict: VerdictScene,
  cta: CTAScene,
};

// Webpack overlay schema
export const vibeCodingSchema = z.object({
  logoBottom: z.number().min(0).max(1080).step(1),
  logoRight: z.number().min(0).max(1920).step(1),
  logoScale: z.number().min(0.1).max(5).step(0.1),
  logoImageScale: z.number().min(0.1).max(5).step(0.05),
  logoOpacity: z.number().min(0).max(1).step(0.05),
  blurAmount: z.number().min(0).max(50).step(1),
  logoBackgroundTransparency: z.number().min(0).max(1).step(0.05),
  previewMode: z.boolean(),
  avatarBottom: z.number().min(0).max(1080).step(1),
  avatarLeft: z.number().min(0).max(1920).step(1),
  avatarScale: z.number().min(0.1).max(5).step(0.1),
  avatarOpacity: z.number().min(0).max(1).step(0.05),
  avatar3dX: z.number().min(-5).max(5).step(0.01),
  avatar3dY: z.number().min(-5).max(5).step(0.01),
  avatar3dZ: z.number().min(-5).max(5).step(0.01),
  lipSyncOffset: z.number().min(-15).max(15).step(1),
});

export type VibeCodingProps = z.infer<typeof vibeCodingSchema>;

const MainStoryContent: React.FC<VibeCodingProps> = ({
  previewMode = false,
  avatarBottom = 113,
  avatarLeft = 80,
  avatarScale = 1.0,
  avatarOpacity = 1.0,
  avatar3dX = 0.0,
  avatar3dY = 0.1,
  avatar3dZ = 0.0,
  lipSyncOffset = 4,
}) => {
  const frame = useCurrentFrame();

  // Find active scene index
  const scenes = vibeVideoData.scenes || [];
  let currentSceneIndex = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene: any = scenes[i];
    if (
      frame >= (scene.startFrame || 0) &&
      frame < (scene.startFrame || 0) + (scene.durationFrames || 300)
    ) {
      currentSceneIndex = i;
      break;
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#06080D" }}>
      {/* Background Slideshow using generated Ken Burns images */}
      <AbsoluteFill style={{ zIndex: 0 }}>
        {scenes.map((scene: any) => {
          // Map to correct generated image name in public folder
          const imageMap: Record<string, string> = {
            hook: "hook.jpg",
            claim: "claim.jpg",
            rules: "rules.jpg",
            evidence1: "evidence1.jpg",
            evidence2: "evidence2.jpg",
            headToHead: "headToHead.jpg",
            reality: "reality.jpg",
            verdict: "verdict.jpg",
            cta: "cta.jpg",
          };
          const imageName = imageMap[scene.id] || "cta.jpg";

          return (
            <SmoothImage
              key={scene.id}
              src={staticFile(
                `content/VibeCodingNotProgramming/images/${imageName}`,
              )}
              startFrame={scene.startFrame || 0}
              endFrame={(scene.startFrame || 0) + (scene.durationFrames || 300)}
              zoomDirection={
                scene.id === "hook" || scene.id === "reality" ? "in" : "out"
              }
            />
          );
        })}
      </AbsoluteFill>
      {/* Dim overlay for text pop readability */}
      <ImageOverlay opacity={0.7} />
      {/* Cyberpunk matrix code rain overlay */}
      <MatrixRain />
      {/* Main synchronized voiceover audio generated by TTS script */}
      <Audio
        src={staticFile("content/VibeCodingNotProgramming/audio/voiceover.mp3")}
        volume={0.9}
      />
      {/* Render active scene component */}
      {scenes.map((scene: any) => {
        const frame = useCurrentFrame();
        const SceneComponent = SceneComponents[scene.id];
        if (!SceneComponent) return null;

        return (
          <Sequence
            key={scene.id}
            from={scene.startFrame || 0}
            durationInFrames={scene.durationFrames || 300}
            style={{
              transformOrigin: interpolate(frame, [1449], ["50% 50%"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(frame, [1449], ["0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <AbsoluteFill
              style={{
                zIndex: 4,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <SceneComponent />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {/* 3D Animated Speaking Avatar */}
      <ThreeAvatar
        isSpeaking={true}
        bottom={avatarBottom}
        left={avatarLeft}
        scale={avatarScale}
        opacity={avatarOpacity}
        avatar3dX={avatar3dX}
        avatar3dY={avatar3dY}
        avatar3dZ={avatar3dZ}
        lipSyncOffset={lipSyncOffset}
      />
      {/* Cyberpunk HUD */}
      <ProfessionalHUD
        previewMode={previewMode}
        currentSceneIndex={currentSceneIndex}
        totalScenes={scenes.length}
      />
    </AbsoluteFill>
  );
};

export const VibeCodingNotProgrammingVideo: React.FC<VibeCodingProps> = (
  props,
) => {
  const {
    logoBottom = 113,
    logoRight = 80,
    logoScale = 1.1,
    logoOpacity = 0.75,
    blurAmount = 3,
    logoImageScale = 1.0,
  } = props;

  const logoOverlay = (
    <div
      style={{
        position: "absolute",
        bottom: logoBottom,
        right: logoRight,
        background: "#0b0b0b",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)",
        backdropFilter: `blur(${blurAmount}px)`,
        height: 90 * logoScale,
        padding: "4px 8px",
        borderRadius: "16px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
      }}
    >
      <Img
        src={staticFile("logo.png")}
        style={{
          height: "100%",
          objectFit: "contain",
          opacity: logoOpacity,
          borderRadius: 8,
          transform: `scale(${logoImageScale})`,
        }}
      />
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b0b" }}>
      <MainStoryContent {...props} />
      {logoOverlay}
    </AbsoluteFill>
  );
};
