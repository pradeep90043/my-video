import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPatrickHand } from "@remotion/google-fonts/PatrickHand";
import type { SceneSpec } from "../schema";
import type { Theme } from "../theme";
import { PANEL } from "../PanelGeometry";
import { ASSET_DRAW, INK, resolveTint } from "./assets";
import type { SceneBackground } from "./catalog";

const hand = loadPatrickHand("normal", { weights: ["400"], subsets: ["latin"] });
const HAND = `${hand.fontFamily}, "Comic Sans MS", cursive`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const pop = (frame: number, fps: number, delay: number) =>
  spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 120, mass: 0.7 } });

/** Card background: a flat coloured "page" per topic, with a little slow motion so it never sits dead still. */
const Background: React.FC<{ kind: SceneBackground; frame: number }> = ({ kind, frame }) => {
  const W = PANEL.w, H = PANEL.h;
  switch (kind) {
    case "sky":
      return (
        <g>
          <rect width={W} height={H} fill="#D6EEFA" />
          <rect y={H * 0.78} width={W} height={H * 0.22} fill="#F1DC96" />
          <path d={`M0,${H * 0.78} H${W}`} stroke={INK} strokeWidth={5} opacity={0.6} />
          {[0, 1, 2].map((i) => {
            const x = ((frame * (0.5 + i * 0.25) + i * 470) % (W + 360)) - 180;
            return (
              <g key={i} transform={`translate(${x},${70 + i * 56}) scale(${0.8 + i * 0.12})`} opacity={0.95}>
                <path d="M0,40 C-26,40 -28,6 -2,4 C-4,-24 40,-34 54,-8 C74,-28 112,-12 104,18 C130,20 128,48 100,48 H8 Z" fill="#FFFFFF" stroke={INK} strokeWidth={4} />
              </g>
            );
          })}
        </g>
      );
    case "night":
      return (
        <g>
          <rect width={W} height={H} fill="#16223F" />
          {Array.from({ length: 26 }, (_, i) => {
            const x = (i * 197 + 61) % W, y = (i * 113 + 37) % (H * 0.7);
            return <circle key={i} cx={x} cy={y} r={2.5 + (i % 3)} fill="#FFF6D6" opacity={0.55 + 0.45 * Math.sin(frame * 0.08 + i)} />;
          })}
          <circle cx={W - 150} cy={110} r={46} fill="#FFF1B8" stroke={INK} strokeWidth={4} />
          <circle cx={W - 132} cy={98} r={46} fill="#16223F" />
          <rect y={H * 0.84} width={W} height={H * 0.16} fill="#0E1730" />
        </g>
      );
    case "room":
      return (
        <g>
          <rect width={W} height={H} fill="#F4E4C6" />
          <rect y={H * 0.8} width={W} height={H * 0.2} fill="#D8B98C" />
          <path d={`M0,${H * 0.8} H${W}`} stroke={INK} strokeWidth={5} opacity={0.6} />
          <rect x={W * 0.06} y={60} width={190} height={170} rx={6} fill="#CFEAF8" stroke={INK} strokeWidth={5} />
          <path d={`M${W * 0.06 + 95},60 V230 M${W * 0.06},145 H${W * 0.06 + 190}`} stroke={INK} strokeWidth={4} />
        </g>
      );
    case "lab":
      return (
        <g>
          <rect width={W} height={H} fill="#E7EEF5" />
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v${i}`} x1={i * 130} y1={0} x2={i * 130} y2={H} stroke="#C9D6E3" strokeWidth={2} />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 130} x2={W} y2={i * 130} stroke="#C9D6E3" strokeWidth={2} />
          ))}
          <rect y={H * 0.84} width={W} height={H * 0.16} fill="#C9D3DF" />
          <path d={`M0,${H * 0.84} H${W}`} stroke={INK} strokeWidth={5} opacity={0.6} />
        </g>
      );
    default:
      return <rect width={W} height={H} fill="#FBF6E9" />;
  }
};

/** A hand-drawn, slightly bent arrow that draws itself on. */
const Arrow: React.FC<{ from: [number, number]; to: [number, number]; label?: string; start: number; light: boolean }> = ({ from, to, label, start, light }) => {
  const frame = useCurrentFrame();
  const x1 = (from[0] / 100) * PANEL.w, y1 = (from[1] / 100) * PANEL.h;
  const x2 = (to[0] / 100) * PANEL.w, y2 = (to[1] / 100) * PANEL.h;
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bend = Math.min(70, len * 0.14);
  const cx = (x1 + x2) / 2 + nx * bend, cy = (y1 + y2) / 2 + ny * bend;
  const t = clamp01((frame - start) / 16);
  // arrow head follows the end tangent of the curve
  const tx = x2 - cx, ty = y2 - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
  const head = 30;
  const col = light ? "#FFFFFF" : INK;
  return (
    <g opacity={clamp01(t * 3)}>
      <path d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none" stroke={col} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
      <path d={`M${x2 - ux * head - uy * head * 0.55},${y2 - uy * head + ux * head * 0.55} L${x2},${y2} L${x2 - ux * head + uy * head * 0.55},${y2 - uy * head - ux * head * 0.55}`}
        fill="none" stroke={col} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01((t - 0.75) * 4)} />
      {label && (
        <text x={cx} y={cy - 18} textAnchor="middle" fontSize={44} fontFamily={HAND} fill={col} opacity={clamp01((t - 0.5) * 3)}>{label}</text>
      )}
    </g>
  );
};

export const ScenePanel: React.FC<{ spec: SceneSpec; theme: Theme; accent: string; durationFrames: number }> = ({ spec, theme, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = pop(frame, fps, 2);
  const stagger = Math.min(14, Math.max(5, Math.floor((durationFrames * 0.5) / Math.max(1, spec.items.length))));
  const darkBg = spec.background === "night";
  const clipId = "scene-card-clip";
  return (
    <g transform={`translate(${PANEL.x},${PANEL.y + (1 - enter) * 40})`} opacity={Math.min(1, enter * 2)}>
      <defs>
        <clipPath id={clipId}><rect width={PANEL.w} height={PANEL.h} rx={40} /></clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <Background kind={spec.background} frame={frame} />
        <g filter="url(#rough)">
          {spec.arrows.map((a, i) => (
            <Arrow key={`a${i}`} from={a.from} to={a.to} label={a.label} start={10 + (spec.items.length + i) * stagger * 0.6} light={darkBg} />
          ))}
          {spec.items.map((it, i) => {
            const start = 8 + i * stagger;
            const p = pop(frame, fps, start);
            const size = (it.size / 100) * PANEL.h;
            const s = size / 200;
            const cx = (it.x / 100) * PANEL.w, cy = (it.y / 100) * PANEL.h;
            const bob = Math.sin((frame - start) * 0.07 + i) * 5;
            const t = resolveTint(it.tint, it.asset);
            const labelOn = clamp01((frame - start - 8) / 10);
            return (
              <g key={`i${i}`} opacity={clamp01(p * 2)}>
                <g transform={`translate(${cx},${cy + bob}) scale(${Math.max(0.001, p * s) * (it.flip ? -1 : 1)},${Math.max(0.001, p * s)}) translate(-100,-100)`}>
                  {ASSET_DRAW[it.asset](t)}
                </g>
                {it.label && (
                  <text x={cx} y={cy + size / 2 + 46} textAnchor="middle" fontSize={50} fontFamily={HAND} fill={darkBg ? "#FFFFFF" : INK} opacity={labelOn}
                    stroke={darkBg ? "#16223F" : "#FBF6E9"} strokeWidth={9} paintOrder="stroke" strokeLinejoin="round">
                    {it.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </g>
      <rect width={PANEL.w} height={PANEL.h} rx={40} fill="none" stroke={theme.ink} strokeWidth={8} />
    </g>
  );
};
