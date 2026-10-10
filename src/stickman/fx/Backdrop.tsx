import React from "react";
import { random, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import type { Theme, World } from "../theme";
import type { BACKDROPS } from "../schema";

type Style = (typeof BACKDROPS)[number];

/** Animated background drawn inside the scene SVG (replaces the static dot grid). */
export const Backdrop: React.FC<{ style: Style; theme: Theme; world: World; accent: string; seed: string }> = ({ style, theme, world, accent, seed }) => {
  const frame = useCurrentFrame();
  const dark = theme.bg !== "#FFFFFF";
  const { width: w, height: h } = world;

  if (style === "aurora") {
    const blobs = [0, 1, 2].map((i) => ({
      x: (0.5 + 0.45 * noise2D(`${seed}x`, frame * 0.004, i * 7.3)) * w,
      y: (0.5 + 0.45 * noise2D(`${seed}y`, frame * 0.004, i * 3.1)) * h,
      r: Math.max(w, h) * (0.36 + 0.06 * i),
      color: i === 0 ? accent : i === 1 ? theme.accents.gold : theme.accents.blue,
    }));
    return (
      <g>
        <defs>
          {blobs.map((b, i) => (
            <radialGradient id={`aur${i}`} key={i}>
              <stop offset="0%" stopColor={b.color} stopOpacity={dark ? 0.38 : 0.2} />
              <stop offset="100%" stopColor={b.color} stopOpacity={0} />
            </radialGradient>
          ))}
          <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="2.2" fill={theme.faint} />
          </pattern>
        </defs>
        {blobs.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#aur${i})`} />
        ))}
        <rect width={w} height={h} fill="url(#dots)" opacity={0.35} />
      </g>
    );
  }

  if (style === "grid") {
    const gap = 90;
    const off = (frame * 0.9) % gap;
    const lines: React.ReactNode[] = [];
    for (let x = -gap; x <= w + gap; x += gap) lines.push(<line key={`v${x}`} x1={x - off * 0.3} y1={0} x2={x - off * 0.3} y2={h} />);
    for (let y = -gap; y <= h + gap; y += gap) lines.push(<line key={`h${y}`} x1={0} y1={y + off} x2={w} y2={y + off} />);
    return (
      <g stroke={theme.faint} strokeWidth={2} opacity={0.8}>
        {lines}
        <rect width={w} height={h} fill={accent} opacity={dark ? 0.05 : 0.04} stroke="none" />
      </g>
    );
  }

  if (style === "particles") {
    const n = 46;
    return (
      <g>
        {Array.from({ length: n }, (_, i) => {
          const r = (k: string) => random(`${seed}-${i}-${k}`);
          const speed = 0.4 + r("s") * 1.1;
          const y = (((r("y") * h - frame * speed) % h) + h) % h;
          const x = r("x") * w + Math.sin(frame * 0.02 + i) * 18;
          const size = 3 + r("z") * 7;
          return <circle key={i} cx={x} cy={y} r={size} fill={i % 3 === 0 ? accent : theme.faint} opacity={i % 3 === 0 ? 0.35 : 0.9} />;
        })}
      </g>
    );
  }

  // "dots": the classic grid, now with a slow drift
  const d = (frame * 0.25) % 60;
  return (
    <g>
      <defs>
        <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform={`translate(${d},${d})`}>
          <circle cx="30" cy="30" r="2.2" fill={theme.faint} />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#dots)" opacity={0.7} />
    </g>
  );
};
