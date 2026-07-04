import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ── Entrance ──────────────────────────────────────────────────────────────────

export function useFadeEntrance(delay = 0, durationFrames = 12) {
  const frame = useCurrentFrame();
  return interpolate(frame - delay, [0, durationFrames], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
}

export function useSlideUpEntrance(delay = 0, distance = 80) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 140 } });
  return {
    opacity: Math.min(p * 2, 1),
    translateY: interpolate(p, [0, 1], [distance, 0], clamp),
  };
}

export function useScalePopEntrance(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 90, stiffness: 260, mass: 0.65 } });
  return {
    opacity: Math.min(p * 2, 1),
    scale: interpolate(p, [0, 0.72, 1], [0.72, 1.08, 1], clamp),
  };
}

export function useZoomEntrance(delay = 0, fromScale = 1.15) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 30, stiffness: 120 } });
  return {
    opacity: p,
    scale: interpolate(p, [0, 1], [fromScale, 1], clamp),
  };
}

// ── Exit ──────────────────────────────────────────────────────────────────────

export function useFadeExit(durationFrames: number, exitDuration = 10) {
  const frame = useCurrentFrame();
  return interpolate(frame, [durationFrames - exitDuration, durationFrames], [1, 0], clamp);
}

// ── Scene-level transition (fade in + fade out) ────────────────────────────

export function useSceneTransition(durationFrames: number, transitionFrames = 8) {
  const frame = useCurrentFrame();
  return interpolate(
    frame,
    [0, transitionFrames, durationFrames - transitionFrames, durationFrames],
    [0, 1, 1, 0],
    clamp,
  );
}

// ── Camera moves ──────────────────────────────────────────────────────────────

export function useCameraZoomIn(intensity = 0.08) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames;
  return 1 + p * intensity;
}

export function useCameraZoomOut(intensity = 0.08) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames;
  return 1 + intensity - p * intensity;
}

export function useCameraPan(direction: "left" | "right", distance = 50) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames;
  const sign = direction === "left" ? -1 : 1;
  return sign * p * distance;
}

export function useCameraShake(intensity = 8, decayFrames = 10) {
  const frame = useCurrentFrame();
  const decay = interpolate(frame, [0, decayFrames], [1, 0], clamp);
  return Math.sin(frame * 1.8) * intensity * decay;
}

// ── Typing effect ─────────────────────────────────────────────────────────────

export function useTypingText(text: string, startFrame = 0, charsPerFrame = 1.5) {
  const frame = useCurrentFrame();
  const chars = Math.floor(interpolate(frame - startFrame, [0, text.length / charsPerFrame], [0, text.length], clamp));
  return text.slice(0, chars);
}

// ── Glow pulse ────────────────────────────────────────────────────────────────

export function useGlowPulse(color = "#FFB800", speed = 0.05) {
  const frame = useCurrentFrame();
  const intensity = 0.5 + 0.5 * Math.sin(frame * speed * Math.PI * 2);
  return `0 0 ${20 + intensity * 20}px ${color}88`;
}

// ── Counter animation ─────────────────────────────────────────────────────────

export function useAnimatedCounter(from: number, to: number, durationFrames: number) {
  const frame = useCurrentFrame();
  return Math.round(interpolate(frame, [0, durationFrames], [from, to], clamp));
}

// ── Progress ──────────────────────────────────────────────────────────────────

export function useVideoProgress(totalFrames: number) {
  const frame = useCurrentFrame();
  return Math.min(frame / totalFrames, 1);
}
