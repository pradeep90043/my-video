import React from "react";
import type { Theme } from "./theme";
import type { World } from "./theme";
import type { SettingName } from "./schema";

/**
 * Low-contrast animated scene backdrops drawn behind the figure and panels.
 * Everything is faint line-art in the theme's tones so on-screen text stays readable.
 */
interface Props { setting: SettingName; t: number; theme: Theme; world: World; accent: string }

const sw = { strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

export const Backdrop: React.FC<Props> = ({ setting, t, theme, world, accent }) => {
  const { width: W, ground } = world;
  const line = `${theme.ink}45`; // ~27% ink: visible but never competes with text/panels
  const ink = theme.ink;
  const tint = accent;
  const twinkle = (i: number, speed = 0.12) => 0.35 + 0.65 * Math.abs(Math.sin(t * speed + i * 1.7));
  const drift = (speed: number, span: number, off = 0) => ((t * speed + off) % span);

  const cloud = (x: number, y: number, s = 1) => (
    <g transform={`translate(${x},${y}) scale(${s})`} stroke={line} {...sw} fill={theme.bg}>
      <path d="M0,40 q0,-34 38,-34 q10,-30 50,-22 q40,-8 56,24 q36,4 30,32 z" />
    </g>
  );

  const skyline = (baseY: number, seed: number) => {
    const blocks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => ({
      x: i * (W / 12) + ((i * 37 + seed) % 20),
      w: 110 + ((i * 53 + seed) % 50),
      h: 170 + ((i * 97 + seed * 7) % 230),
    }));
    return blocks.map((b, i) => (
      <g key={i}>
        <rect x={b.x} y={baseY - b.h} width={b.w} height={b.h} stroke={line} {...sw} fill={theme.bg} />
        {[0, 1, 2, 3].flatMap((r) => [0, 1].map((c) => (
          <rect key={`${r}${c}`} x={b.x + 22 + c * 46} y={baseY - b.h + 26 + r * 44} width={20} height={24}
            fill={tint} opacity={((i + r * 3 + c) % 4 === 0 ? twinkle(i + r + c, 0.05) : 0.12)} />
        )))}
      </g>
    ));
  };

  let body: React.ReactNode = null;

  if (setting === "office") {
    body = (
      <g>
        <rect x={110} y={120} width={560} height={380} rx={10} stroke={line} {...sw} fill={theme.bg} />
        <g transform="translate(110,120)"><clipPath id="win"><rect width={560} height={380} rx={10} /></clipPath>
          <g clipPath="url(#win)">
            <g transform="translate(0,170)">{skyline(210, 3)}</g>
            {cloud(drift(0.6, 760, 0) - 160, 40, 0.9)}
          </g></g>
        <line x1={390} y1={120} x2={390} y2={500} stroke={line} {...sw} />
        <line x1={110} y1={310} x2={670} y2={310} stroke={line} {...sw} />
        <circle cx={W - 300} cy={190} r={74} stroke={line} {...sw} fill={theme.bg} />
        <line x1={W - 300} y1={190} x2={W - 300 + 44 * Math.sin(t * 0.05)} y2={190 - 44 * Math.cos(t * 0.05)} stroke={ink} opacity={0.35} {...sw} />
        <line x1={W - 300} y1={190} x2={W - 300 + 26 * Math.sin(t * 0.004)} y2={190 - 26 * Math.cos(t * 0.004)} stroke={ink} opacity={0.35} {...sw} />
        <path d={`M${W - 520},${ground - 110} h70 l-10 110 h-50 z`} stroke={line} {...sw} fill={theme.bg} />
        <path d={`M${W - 485},${ground - 110} q-40,-70 -10,-120 M${W - 485},${ground - 110} q10,-90 50,-100 M${W - 485},${ground - 110} q40,-30 60,-70`} stroke={tint} opacity={0.5} {...sw} />
      </g>
    );
  } else if (setting === "classroom") {
    body = (
      <g>
        <rect x={150} y={110} width={900} height={400} rx={8} stroke={line} {...sw} fill={theme.bg} />
        <path d="M200,200 q60,-30 120,0 t120,0 M200,270 h300 M200,330 q80,-30 160,0" stroke={tint} opacity={0.4} {...sw} />
        <rect x={150} y={510} width={900} height={14} stroke={line} {...sw} fill={theme.bg} />
        <rect x={W - 460} y={140} width={260} height={180} stroke={line} {...sw} fill={theme.bg} />
        <path d={`M${W - 430},${290} l60,-70 l50,40 l60,-60 l60,90`} stroke={tint} opacity={0.5} {...sw} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={260 + i * 130 + 14 * Math.sin(t * 0.03 + i)} cy={420 - drift(0.5, 160, i * 27)} r={3} fill={line} opacity={0.8} />
        ))}
      </g>
    );
  } else if (setting === "server") {
    body = (
      <g>
        {[0, 1, 2, 3, 4].map((r) => {
          const x = 130 + r * 260;
          return (
            <g key={r}>
              <rect x={x} y={150} width={200} height={ground - 150} rx={8} stroke={line} {...sw} fill={theme.bg} />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((u) => (
                <g key={u}>
                  <rect x={x + 16} y={176 + u * 78} width={168} height={52} rx={4} stroke={line} {...sw} />
                  <circle cx={x + 40} cy={202 + u * 78} r={7} fill={(r + u) % 3 === 0 ? "#1FB36B" : tint} opacity={twinkle(r * 8 + u, 0.07 + (u % 3) * 0.03)} />
                  <circle cx={x + 66} cy={202 + u * 78} r={7} fill={tint} opacity={twinkle(r * 8 + u + 5, 0.05)} />
                </g>
              ))}
            </g>
          );
        })}
        <path d={`M${W - 130},120 q-60,200 -200,260`} stroke={tint} opacity={0.35} {...sw} />
      </g>
    );
  } else if (setting === "city") {
    body = (
      <g>
        <circle cx={W - 360} cy={190} r={64} stroke={line} {...sw} fill={theme.bg} opacity={0.9} />
        {cloud(drift(0.8, W + 400, 100) - 300, 120, 1)}
        {cloud(drift(0.5, W + 400, 900) - 300, 250, 0.7)}
        {skyline(ground, 11)}
      </g>
    );
  } else if (setting === "home") {
    body = (
      <g>
        <rect x={W - 640} y={110} width={420} height={340} rx={10} stroke={line} {...sw} fill={theme.bg} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <circle key={i} cx={W - 600 + (i * 97) % 340} cy={150 + (i * 61) % 240} r={3.5} fill={tint} opacity={twinkle(i, 0.09)} />)}
        <path d={`M${W - 330},170 a46,46 0 1,0 40,70 a36,36 0 1,1 -40,-70 z`} stroke={line} {...sw} fill={theme.bg} />
        <rect x={120} y={130} width={420} height={330} rx={6} stroke={line} {...sw} fill={theme.bg} />
        {[0, 1, 2].map((r) => <line key={r} x1={120} y1={240 + r * 110} x2={540} y2={240 + r * 110} stroke={line} {...sw} />)}
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={140 + i * 64} y={160 + (i % 3) * 8} width={32} height={74 - (i % 3) * 8} stroke={line} {...sw} fill={theme.bg} />)}
        <path d={`M${W - 700},${ground} v-250 h-60 l30,-70 h60 l30,70 h-60`} stroke={line} {...sw} fill={theme.bg} />
        <ellipse cx={W - 745} cy={ground - 100} rx={150} ry={110} fill={tint} opacity={0.06 + 0.03 * Math.sin(t * 0.08)} />
      </g>
    );
  } else if (setting === "stage") {
    const sweep = 60 * Math.sin(t * 0.03);
    body = (
      <g>
        <path d={`M0,0 q120,${ground / 2} 0,${ground} h200 q-120,-${ground / 2} 0,-${ground} z`} stroke={line} {...sw} fill={theme.bg} />
        <path d={`M${W},0 q-120,${ground / 2} 0,${ground} h-200 q120,-${ground / 2} 0,-${ground} z`} stroke={line} {...sw} fill={theme.bg} />
        <path d={`M${W / 2 - 80 + sweep},0 L${W / 2 - 520 + sweep * 2},${ground} L${W / 2 + 520 + sweep * 2},${ground} L${W / 2 + 80 + sweep},0 z`} fill={tint} opacity={0.07} />
        {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={300 + i * 260} cy={70} r={20} stroke={line} {...sw} fill={theme.bg} />)}
      </g>
    );
  } else if (setting === "space") {
    body = (
      <g>
        {Array.from({ length: 26 }, (_, i) => <circle key={i} cx={(i * 197) % W} cy={(i * 131) % (ground - 40) + 20} r={1.5 + (i % 3)} fill={ink} opacity={twinkle(i, 0.06) * 0.35} />)}
        <circle cx={W - 360} cy={250} r={110} stroke={line} {...sw} fill={theme.bg} />
        <ellipse cx={W - 360} cy={250} rx={190} ry={36} stroke={tint} opacity={0.5} {...sw} transform={`rotate(-18 ${W - 360} 250)`} />
        <circle cx={220} cy={ground - 280} r={52} stroke={line} {...sw} fill={theme.bg} />
        <path d={`M${drift(14, W + 600, 300) - 300},${140 + drift(4, 300, 0)} l140,50`} stroke={tint} opacity={0.5} {...sw} />
      </g>
    );
  } else if (setting === "cloud") {
    body = (
      <g>
        {cloud(drift(0.7, W + 500, 0) - 300, 110, 1.4)}
        {cloud(drift(0.45, W + 500, 700) - 300, 270, 1)}
        {cloud(drift(0.9, W + 500, 1300) - 300, 60, 0.8)}
        {[0, 1, 2, 3, 4].map((i) => {
          const x = 250 + i * 340;
          return (
            <g key={i}>
              <line x1={x} y1={ground - 60} x2={W / 2} y2={300} stroke={tint} opacity={0.25} strokeDasharray="10 12" strokeDashoffset={-t * 2} {...sw} />
              <rect x={x - 46} y={ground - 130} width={92} height={70} rx={8} stroke={line} {...sw} fill={theme.bg} />
              <circle cx={x - 22} cy={ground - 95} r={6} fill={tint} opacity={twinkle(i, 0.08)} />
            </g>
          );
        })}
      </g>
    );
  }

  return <g opacity={0.9}>{body}</g>;
};
