import React, { useEffect, useState } from "react";
import { continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import type { StickerSpec } from "../schema";

const cache = new Map<string, LottieAnimationData | null>();

export const lottiePath = (emoji: string) => `lottie/${emoji.toLowerCase()}.json`;

const useLottieData = (src: string): LottieAnimationData | null => {
  const [data, setData] = useState<LottieAnimationData | null | undefined>(cache.get(src));
  const [handle] = useState(() => (cache.has(src) ? null : delayRender(`lottie ${src}`)));
  useEffect(() => {
    if (handle === null) return;
    fetch(staticFile(src))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${src}: HTTP ${r.status} — run npm run longform:assets`))))
      .then((d) => {
        cache.set(src, d);
        setData(d);
      })
      .catch((e) => {
        console.warn(`[stickers] ${e.message} — sticker skipped`);
        cache.set(src, null);
        setData(null);
      })
      .finally(() => continueRender(handle));
  }, [src, handle]);
  return data ?? null;
};

const Sticker: React.FC<{ spec: StickerSpec; width: number; height: number }> = ({ spec, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = useLottieData(lottiePath(spec.emoji));
  const s = spring({ frame: frame - spec.delay, fps, config: { damping: 11, stiffness: 150, mass: 0.7 } });
  const bob = Math.sin((frame - spec.delay) * 0.08) * 8;
  if (!data) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: spec.x * width - spec.size / 2,
        top: spec.y * height - spec.size / 2 + bob,
        width: spec.size,
        height: spec.size,
        transform: `scale(${Math.max(0.001, s)}) rotate(${interpolate(s, [0, 1], [-18, 0])}deg)`,
        opacity: Math.min(1, s * 2),
      }}
    >
      <Lottie animationData={data} loop />
    </div>
  );
};

/** Animated Noto-emoji stickers (Lottie) placed in world coordinates. */
export const Stickers: React.FC<{ items: StickerSpec[]; width: number; height: number }> = ({ items, width, height }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
    {items.map((it, i) => (
      <Sticker key={i} spec={it} width={width} height={height} />
    ))}
  </div>
);
