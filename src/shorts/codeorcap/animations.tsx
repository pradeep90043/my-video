import type { CSSProperties, ReactNode } from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const useFadeIn = (delay = 0, duration = 12) => {
  const frame = useCurrentFrame();
  return interpolate(frame - delay, [0, duration], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
};

export const FadeIn: React.FC<{
  children: ReactNode;
  delay?: number;
  duration?: number;
  style?: CSSProperties;
}> = ({ children, delay = 0, duration = 12, style }) => {
  const opacity = useFadeIn(delay, duration);
  return <div style={{ opacity, ...style }}>{children}</div>;
};

export const SlideInLeft: React.FC<{
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: CSSProperties;
}> = ({ children, delay = 0, distance = 120, style }) => {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 130, stiffness: 190 },
  });
  const x = interpolate(progress, [0, 1], [-distance, 0], clamp);

  return (
    <div style={{ opacity: progress, transform: `translateX(${x}px)`, ...style }}>
      {children}
    </div>
  );
};

export const SlideInRight: React.FC<{
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: CSSProperties;
}> = ({ children, delay = 0, distance = 120, style }) => {
  const frame = useCurrentFrame();
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 130, stiffness: 190 },
  });
  const x = interpolate(progress, [0, 1], [distance, 0], clamp);

  return (
    <div style={{ opacity: progress, transform: `translateX(${x}px)`, ...style }}>
      {children}
    </div>
  );
};

export const ScalePop: React.FC<{
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 90, stiffness: 260, mass: 0.65 },
  });
  const scale = interpolate(progress, [0, 0.72, 1], [0.72, 1.08, 1], clamp);

  return (
    <div style={{ opacity: progress, transform: `scale(${scale})`, ...style }}>
      {children}
    </div>
  );
};

export const GlitchReveal: React.FC<{
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - delay;
  const opacity = interpolate(localFrame, [0, 5], [0, 1], clamp);
  const jitter = localFrame >= 0 && localFrame < 14 ? (localFrame % 4) - 1.5 : 0;
  const skew = localFrame >= 0 && localFrame < 14 ? (localFrame % 2 === 0 ? -3 : 3) : 0;

  return (
    <div
      style={{
        opacity,
        filter: localFrame >= 0 && localFrame < 14 ? "contrast(1.35)" : undefined,
        transform: `translateX(${jitter * 9}px) skewX(${skew}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const ZoomBackground: React.FC<{
  children: ReactNode;
  intensity?: number;
}> = ({ children, intensity = 0.08 }) => {
  const frame = useCurrentFrame();
  const scale = 1 + frame * 0.0009 * intensity * 10;

  return (
    <div style={{ transform: `scale(${scale})`, width: "100%", height: "100%" }}>
      {children}
    </div>
  );
};

