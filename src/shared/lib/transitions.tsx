import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ── FadeTransition ─────────────────────────────────────────────────────────────
// Fades in at the start and out at the end of its parent Sequence.
export const FadeTransition: React.FC<{
  children: ReactNode;
  durationFrames: number;
  enterFrames?: number;
  exitFrames?: number;
  style?: CSSProperties;
}> = ({ children, durationFrames, enterFrames = 8, exitFrames = 8, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, enterFrames, durationFrames - exitFrames, durationFrames],
    [0, 1, 1, 0],
    clamp,
  );
  return <div style={{ opacity, width: "100%", height: "100%", ...style }}>{children}</div>;
};

// ── SlideTransition ────────────────────────────────────────────────────────────
// Slides in from the specified edge.
export const SlideTransition: React.FC<{
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  enterFrames?: number;
  distance?: number;
  style?: CSSProperties;
}> = ({ children, direction = "up", enterFrames = 15, distance = 120, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 22, stiffness: 140 } });
  const offset = interpolate(p, [0, 1], [distance, 0], clamp);

  const transforms: Record<string, string> = {
    up: `translateY(${offset}px)`,
    down: `translateY(-${offset}px)`,
    left: `translateX(${offset}px)`,
    right: `translateX(-${offset}px)`,
  };

  return (
    <div
      style={{
        opacity: Math.min(p * 2, 1),
        transform: transforms[direction],
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ── ScaleTransition ────────────────────────────────────────────────────────────
// Scales up from center with spring bounce.
export const ScaleTransition: React.FC<{
  children: ReactNode;
  fromScale?: number;
  style?: CSSProperties;
}> = ({ children, fromScale = 0.8, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 90, stiffness: 260, mass: 0.65 } });
  const scale = interpolate(p, [0, 0.72, 1], [fromScale, 1.06, 1], clamp);

  return (
    <div
      style={{
        opacity: Math.min(p * 2, 1),
        transform: `scale(${scale})`,
        width: "100%",
        height: "100%",
        transformOrigin: "center center",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ── GlitchTransition ───────────────────────────────────────────────────────────
// Cyberpunk glitch-style reveal.
export const GlitchTransition: React.FC<{
  children: ReactNode;
  glitchFrames?: number;
  style?: CSSProperties;
}> = ({ children, glitchFrames = 14, style }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 5], [0, 1], clamp);
  const isGlitching = frame < glitchFrames;
  const jitterX = isGlitching ? ((frame % 4) - 1.5) * 9 : 0;
  const skewX = isGlitching ? (frame % 2 === 0 ? -3 : 3) : 0;
  const contrast = isGlitching ? 1.35 : 1;

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${jitterX}px) skewX(${skewX}deg)`,
        filter: `contrast(${contrast})`,
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
