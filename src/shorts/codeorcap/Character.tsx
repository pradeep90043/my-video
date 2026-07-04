import React from "react";
import {
  useCurrentFrame,
  staticFile,
  spring,
  useVideoConfig,
  interpolate,
  Img,
} from "remotion";

export type DeveloperEmotion =
  | "neutral"
  | "shocked"
  | "confused"
  | "curious"
  | "frustrated"
  | "determined"
  | "confident"
  | "excited";

export type DeveloperGesture =
  | "none"
  | "typing"
  | "pointing"
  | "thinking"
  | "shrug";

interface CharacterProps {
  emotion?: DeveloperEmotion;
  gesture?: DeveloperGesture;
  style?: React.CSSProperties;
}

export const Character: React.FC<CharacterProps> = ({
  emotion = "neutral",
  gesture = "none",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Smooth entry transition: spring scale from 0.85 to 1.0 on mount
  const entryProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const entryScale = interpolate(entryProgress, [0, 1], [0.85, 1]);
  const entryOpacity = interpolate(entryProgress, [0, 1], [0, 1]);

  // Localized subtle micro-animations for emotions and gestures (no continuous drift jumps)
  let transformEffects = "";

  if (emotion === "shocked") {
    // Decaying impact shake at start of scene
    const shakeProgress = Math.max(0, 1 - frame / 20);
    const shake = Math.sin(frame * 1.2) * 5 * shakeProgress;
    transformEffects += ` translate(${shake}px, ${shake}px)`;
  } else if (emotion === "excited") {
    // Subtle heartbeat scale pulse
    const pulse = 1 + Math.sin(frame * 0.1) * 0.015;
    transformEffects += ` scale(${pulse})`;
  } else if (emotion === "confused") {
    // Slow periodic head tilt
    const tilt = Math.sin(frame * 0.06) * 1.8;
    transformEffects += ` rotate(${tilt}deg)`;
  }

  if (gesture === "typing") {
    // Small active typing vibration (shoulder rock and pulse)
    const typingRock = Math.sin(frame * 0.25) * 0.5;
    const typingPulse = 1 + Math.abs(Math.sin(frame * 0.15)) * 0.006;
    transformEffects += ` rotate(${typingRock}deg) scale(${typingPulse})`;
  } else if (gesture === "shrug") {
    // Simple shrug shoulder lift that eases back down
    const shrugProgress = spring({
      frame,
      fps,
      config: { damping: 12, stiffness: 90 },
    });
    const shrugY = interpolate(shrugProgress, [0, 0.5, 1], [0, -10, 0]);
    transformEffects += ` translateY(${shrugY}px)`;
  }

  const baseTransform = style?.transform || "";

  return (
    <div
      style={{
        width: 380,
        height: 380,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        filter: "drop-shadow(0 15px 35px rgba(0,0,0,0.65))",
        ...style,
        // Combine base container transform with smooth entrance scale and active gesture effects
        transform: `${baseTransform} scale(${entryScale})${transformEffects}`,
        opacity:
          (style?.opacity !== undefined ? Number(style.opacity) : 1) *
          entryOpacity,
      }}
    >
      <Img
        src={staticFile("content/codeorcap/images/avatar.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          borderRadius: "50%",
          translate: "-82.9px 22.9px",
        }}
        alt="Developer Avatar"
        from={1061}
      />
    </div>
  );
};
