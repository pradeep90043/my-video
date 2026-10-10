import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { z } from "zod";
import type { BrollSchema } from "../schema";
import type { Theme } from "../theme";

type BrollSpec = z.infer<typeof BrollSchema>;

/** Footage layer. "full" = dimmed backdrop, "card" = rounded picture-in-picture on the right. */
export const Broll: React.FC<{ spec: BrollSpec; durationFrames: number; width: number; height: number; theme: Theme }> = ({ spec, durationFrames, width, height, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!spec.src) return null;
  const fade = interpolate(frame, [0, 10, durationFrames - 8, durationFrames], [0, 1, 1, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // slow Ken-Burns so stock footage never looks static
  const zoom = 1 + 0.06 * (frame / Math.max(1, durationFrames));
  const video = (
    <OffthreadVideo src={staticFile(spec.src)} muted startFrom={Math.round(spec.startFrom * fps)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
  );
  if (spec.mode === "card") {
    const w = width * 0.4;
    const h = w * 0.5625;
    return (
      <div
        style={{
          position: "absolute", left: width * 0.56, top: height * 0.34, width: w, height: h, borderRadius: 28, overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)", border: "6px solid rgba(255,255,255,0.9)", opacity: fade,
          transform: `translateY(${(1 - fade) * 40}px)`,
        }}
      >
        {video}
      </div>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", zIndex: 0 }}>
      <AbsoluteFill style={{ opacity: spec.opacity * fade }}>{video}</AbsoluteFill>
      {/* scrim keeps the figure, callouts and captions readable on busy footage */}
      <AbsoluteFill style={{ background: `linear-gradient(${theme.bg}99, ${theme.bg}55 45%, ${theme.bg}cc)` }} />
    </AbsoluteFill>
  );
};
