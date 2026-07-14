import React, { useState, useEffect } from "react";
import { useCurrentFrame, staticFile, spring, useVideoConfig, interpolate, Img, delayRender, continueRender } from "remotion";

interface ThreeAvatarProps {
  isSpeaking: boolean;
  bottom?: number;
  left?: number;
  scale?: number;
  opacity?: number;
  avatar3dX?: number;
  avatar3dY?: number;
  avatar3dZ?: number;
  lipSyncOffset?: number;
  style?: React.CSSProperties;
}

const rhubarbToFrameMap: Record<string, number> = {
  X: 0,  // Silence / Idle
  A: 1,  // Closed mouth (p, b, m)
  H: 2,  // Closed mouth with teeth showing
  B: 4,  // Slightly open mouth (h, sh, ch)
  E: 6,  // Slightly rounded mouth (o, u)
  C: 8,  // Medium open mouth (d, t, s)
  F: 10, // Rounded mouth (oo)
  G: 12, // Open mouth with teeth showing (f, v)
  D: 14, // Wide open mouth (a, e, i, o, u)
};

export const ThreeAvatar: React.FC<ThreeAvatarProps> = ({
  isSpeaking,
  bottom = 113,
  left = 80,
  scale = 1.0,
  opacity = 1.0,
  avatar3dX = 0.0,
  avatar3dY = 0.0,
  lipSyncOffset = 4,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [loadedData, setLoadedData] = useState<{
    waveform: number[];
    rhubarbCues: { mouthCues: { start: number; end: number; value: string }[] };
  } | null>(null);

  useEffect(() => {
    const handle = delayRender("Loading mouth cues and waveform");
    Promise.all([
      fetch(staticFile("content/VibeCodingNotProgramming/audio/waveform.json"))
        .then((r) => r.json())
        .catch(() => []),
      fetch(staticFile("content/VibeCodingNotProgramming/audio/voiceover_rhubarb.json"))
        .then((r) => r.json())
        .catch(() => ({ mouthCues: [] })),
    ])
      .then(([wf, cues]) => {
        setLoadedData({ waveform: wf, rhubarbCues: cues });
        continueRender(handle);
      })
      .catch(() => {
        setLoadedData({ waveform: [], rhubarbCues: { mouthCues: [] } });
        continueRender(handle);
      });
  }, []);

  const waveform = loadedData?.waveform || [];
  const rhubarbCues = loadedData?.rhubarbCues || { mouthCues: [] };

  // Smooth entrance transition on mount
  const entryProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const entryScale = interpolate(entryProgress, [0, 1], [0.8, 1]);
  const entryOpacity = interpolate(entryProgress, [0, 1], [0, 1]);

  // 2D Lip-sync interpolation: synchronize with the audio volume envelope from waveform.json
  const lookupFrame = Math.max(0, frame + lipSyncOffset);
  
  // 5-frame moving average low-pass filter to eliminate high-frequency audio volume jitter
  const vPrev2 = waveform[lookupFrame - 2] || 0.0;
  const vPrev = waveform[lookupFrame - 1] || 0.0;
  const vCurr = waveform[lookupFrame] || 0.0;
  const vNext = waveform[lookupFrame + 1] || 0.0;
  const vNext2 = waveform[lookupFrame + 2] || 0.0;
  
  const smoothedVolume = isSpeaking
    ? (vPrev2 * 0.1 + vPrev * 0.2 + vCurr * 0.4 + vNext * 0.2 + vNext2 * 0.1)
    : 0.0;

  // Use Rhubarb Lip Sync for accurate mouth shape switching based on timestamp
  const currentTime = lookupFrame / fps;
  const currentCue = isSpeaking 
    ? rhubarbCues.mouthCues.find((cue: any) => currentTime >= cue.start && currentTime < cue.end)
    : null;
  const mouthShape = currentCue ? currentCue.value : "X";
  const mouthFrameIndex = rhubarbToFrameMap[mouthShape] ?? 0;
  
  const avatarSrc = staticFile(`content/VibeCodingNotProgramming/images/avatar_frame_${mouthFrameIndex}.png`);
  const blinkSrc = staticFile("content/VibeCodingNotProgramming/images/avatar_eyes_closed_crop.png");

  // Eyelid Blinking loop: Blinks for 3 frames (~100ms) every 100 frames (~3.3 seconds)
  const isBlinking = Math.floor(frame / 4) % 25 === 0 && (frame % 4 < 3);

  // Micro-animations: squash and stretch + vertical bounce to make talking look smooth and physical
  const squashX = 1.0 - (smoothedVolume * 0.015); // max 1.5% squash
  const stretchY = 1.0 + (smoothedVolume * 0.015); // max 1.5% stretch
  const bounceY = smoothedVolume * 3.0; // max 3px bob down on loud syllables

  const size = 280 * scale;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "absolute",
        bottom: bottom + avatar3dY,
        left: left + avatar3dX,
        opacity: opacity * entryOpacity,
        zIndex: 10,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${entryScale})`,
        ...style,
      }}
    >
      {/* Static Glowing border ring */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: "4px solid #FFB800",
          boxShadow: "0 0 20px rgba(255, 184, 0, 0.6), inset 0 0 12px rgba(255, 184, 0, 0.4)",
          transform: "scale(1.0)",
          opacity: 0.8,
          zIndex: 5,
        }}
      />

      {/* Outer Glassmorphic Circle Containment */}
      <div
        style={{
          width: "94%",
          height: "94%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(11,11,11,0.95) 0%, rgba(11,11,11,0.85) 80%, rgba(255,184,0,0.06) 100%)",
          border: "2px solid rgba(255, 184, 0, 0.4)",
          boxShadow: "0 15px 35px rgba(0,0,0,0.85), inset 0 2px 10px rgba(255,255,255,0.05)",
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Transform Group for organic head movement */}
        <div
          style={{
            width: "105%",
            height: "105%",
            position: "relative",
            transform: `translateY(${bounceY}px) scale(${squashX}, ${stretchY})`,
            transformOrigin: "bottom center",
          }}
        >
          {/* 3D BACKGROUND LAYER (behind the avatar) */}
          
          {/* Cyberpunk rotating grid background */}
          <div
            style={{
              position: "absolute",
              width: "140%",
              height: "140%",
              top: "-20%",
              left: "-20%",
              background: "radial-gradient(circle, transparent 20%, rgba(0,0,0,0.5) 100%), repeating-linear-gradient(0deg, rgba(255,184,0,0.03) 0px, rgba(255,184,0,0.03) 1px, transparent 1px, transparent 15px), repeating-linear-gradient(90deg, rgba(255,184,0,0.03) 0px, rgba(255,184,0,0.03) 1px, transparent 1px, transparent 15px)",
              transform: `rotate(${frame * 0.1}deg)`,
              opacity: 0.8,
              zIndex: 1,
            }}
          />

          {/* Golden Scanning Laser Line */}
          <div
            style={{
              position: "absolute",
              width: "120%",
              left: "-10%",
              height: "3px",
              background: "linear-gradient(90deg, rgba(255,184,0,0) 0%, rgba(255,184,0,0.6) 50%, rgba(255,184,0,0) 100%)",
              top: `${(frame * 1.5) % 110 - 5}%`,
              boxShadow: "0 0 10px rgba(255, 184, 0, 0.4)",
              opacity: 0.5,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Rotating Digital Target Ring 1 */}
          <svg
            style={{
              position: "absolute",
              width: "90%",
              height: "90%",
              top: "5%",
              left: "5%",
              transform: `rotate(${-frame * 0.25}deg)`,
              opacity: 0.25,
              pointerEvents: "none",
              zIndex: 1,
            }}
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="48" fill="none" stroke="#FFB800" strokeWidth="0.8" strokeDasharray="6 4" />
            <circle cx="50" cy="50" r="43" fill="none" stroke="#FFB800" strokeWidth="0.4" strokeDasharray="1 10" />
          </svg>

          {/* Rotating Digital Target Ring 2 */}
          <svg
            style={{
              position: "absolute",
              width: "80%",
              height: "80%",
              top: "10%",
              left: "10%",
              transform: `rotate(${frame * 0.4}deg)`,
              opacity: 0.3,
              pointerEvents: "none",
              zIndex: 1,
            }}
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="41" fill="none" stroke="#FFB800" strokeWidth="0.6" strokeDasharray="20 40" />
          </svg>

          {/* 3D FOREGROUND LAYER (Avatar in front with dynamic drop shadow) */}
          <Img
            src={avatarSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 2,
              filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.75))",
            }}
            alt="Creator Cartoon Avatar"
          />

          {/* Blink Layer overlayed on top of eyes */}
          {isBlinking && (
            <Img
              src={blinkSrc}
              style={{
                position: "absolute",
                left: "35.15%",
                top: "30.37%",
                width: "27.34%",
                height: "4.88%",
                objectFit: "contain",
                zIndex: 3,
              }}
              alt="Closed Eyes Overlay"
            />
          )}
        </div>
      </div>
    </div>
  );
};
