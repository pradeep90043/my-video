import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { GROUNDED_PROP_BOTTOM, StickmanVisualSchema, type PoseName, type StickmanVisual } from "./schema";
import { WORLD, type Theme } from "./theme";
import { Figure, blendedPose } from "./Figure";
import { PropDrawing } from "./Props";
import { buildCaptions } from "./captions";
import { CodePanel, ContainerPanel, QuizPanel, StepsPanel } from "./Panels";

// Load only what is used (latin, weights 800/900) — the defaults fetch every subset and weight.
const montserrat = loadMontserrat("normal", { weights: ["900"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["800"], subsets: ["latin"] });

interface SceneProps {
  text: string;
  visual: unknown;
  durationFrames: number;
  theme: Theme;
  prevPose: PoseName;
  muteSfx?: boolean;
}

const PROP_BASE_SCALE = 1.7;
const FIGURE_SCALE = 1.15; // keeps arms-up poses clear of the title

const useSpring = (delay: number, config = { damping: 13, stiffness: 140, mass: 0.7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

const Pop: React.FC<{ delay: number; x: number; y: number; scale: number; children: React.ReactNode }> = ({ delay, x, y, scale, children }) => {
  const s = useSpring(delay);
  const frame = useCurrentFrame();
  const float = Math.sin((frame - delay) * 0.09) * 6;
  return (
    <g transform={`translate(${x},${y + float}) scale(${Math.max(0.001, s * scale)})`} opacity={Math.min(1, s * 2)}>
      {children}
    </g>
  );
};

const Title: React.FC<{ text: string; theme: Theme; color: string }> = ({ text, theme, color }) => {
  const s = useSpring(4, { damping: 15, stiffness: 120, mass: 0.8 });
  const width = Math.min(1500, text.length * 58 + 80);
  return (
    <g opacity={Math.min(1, s * 2)} transform={`translate(960,${150 + (1 - s) * -40})`}>
      <rect x={-width / 2} y={30} width={width * s} height={16} rx={8} fill={color} opacity={0.9} />
      <text textAnchor="middle" fontSize={96} fontWeight={900} fontFamily={`${montserrat.fontFamily}, sans-serif`} fill={theme.ink} letterSpacing={-1}>
        {text}
      </text>
    </g>
  );
};

const Callout: React.FC<{ text: string; width: number; delay: number; color: string }> = ({ text, width, delay, color }) => {
  const s = useSpring(delay);
  return (
    <g transform={`translate(${width / 2},38) scale(${Math.max(0.001, s)}) translate(${-width / 2},-38)`} opacity={Math.min(1, s * 2)}>
      <rect width={width} height={76} rx={38} fill={color} />
      <text x={width / 2} y={51} textAnchor="middle" fontSize={36} fontWeight={800} fontFamily={`${inter.fontFamily}, sans-serif`} fill="#fff">{text}</text>
    </g>
  );
};

/** Centred over `centerX` (the side of the frame the figure is not on). */
const CalloutRow: React.FC<{ items: string[]; color: string; centerX: number }> = ({ items, color, centerX }) => {
  const widths = items.map((t) => Math.max(240, t.length * 26 + 70));
  const gap = 28;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let x = Math.max(40, Math.min(WORLD.width - 40 - total, centerX - total / 2));
  return (
    <g transform="translate(0,262)">
      {items.map((t, i) => {
        const el = (
          <g key={i} transform={`translate(${x},0)`}>
            <Callout text={t} width={widths[i]} delay={18 + i * 10} color={color} />
          </g>
        );
        x += widths[i] + gap;
        return el;
      })}
    </g>
  );
};

export const StickmanScene: React.FC<SceneProps> = ({ text, visual, durationFrames, theme, prevPose, muteSfx }) => {
  const frame = useCurrentFrame();
  const v: StickmanVisual = StickmanVisualSchema.parse(visual ?? {});
  const accent = theme.accents[v.accent];

  const pose = blendedPose(prevPose, v.pose, frame);
  const hop = v.pose === "celebrate" ? Math.abs(Math.sin(frame * 0.2)) * 26 : 0;
  const hasPanel = Boolean(v.code || v.quiz || v.container || v.steps);
  // With a panel on the right the figure shrinks and tucks into the left strip.
  const figureScale = v.figureScale ?? (hasPanel ? 0.8 : FIGURE_SCALE);
  const figureXFrac = hasPanel && v.figureX === 0.3 ? 0.14 : v.figureX;
  const figureX = (v.flip ? 1 - figureXFrac : figureXFrac) * WORLD.width;

  // Camera
  const p = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: "clamp" });
  const cam = {
    none: { s: 1, x: 0 },
    push: { s: 1 + 0.07 * p, x: 0 },
    pull: { s: 1.07 - 0.07 * p, x: 0 },
    "pan-left": { s: 1.05, x: 40 - 80 * p },
    "pan-right": { s: 1.05, x: -40 + 80 * p },
  }[v.camera];

  const seed = Math.floor(frame / 4); // "boiling line" hand-drawn wobble
  const captions = buildCaptions(text, durationFrames);
  const active = captions.find((c) => frame >= c.start && frame < c.end);
  const capOpacity = active
    ? interpolate(
        frame,
        (() => {
          const len = Math.max(4, active.end - active.start);
          const fade = Math.min(4, Math.floor((len - 1) / 3));
          return [active.start, active.start + fade, active.start + len - fade, active.start + len];
        })(),
        [0, 1, 1, 0.85],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  const fadeIn = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  const wipeX = interpolate(frame, [0, 10], [-WORLD.width, WORLD.width], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <svg viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} width="100%" height="100%" style={{ opacity: fadeIn }}>
        <defs>
          <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={2} seed={seed % 50} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={4} />
          </filter>
          <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="2.2" fill={theme.faint} />
          </pattern>
        </defs>

        <rect width={WORLD.width} height={WORLD.height} fill="url(#dots)" opacity={0.7} />

        <g transform={`translate(${WORLD.width / 2 + cam.x},${WORLD.height / 2}) scale(${cam.s}) translate(${-WORLD.width / 2},${-WORLD.height / 2})`}>
          <g filter="url(#rough)">
            <path d={`M0,${WORLD.ground + 4} H${WORLD.width}`} stroke={theme.ink} strokeWidth={6} strokeLinecap="round" />
            {v.props.map((pr, i) => {
              const size = pr.scale * PROP_BASE_SCALE;
              const bottom = GROUNDED_PROP_BOTTOM[pr.type];
              const y = pr.y !== undefined ? pr.y * WORLD.height : bottom !== undefined ? WORLD.ground - bottom * size : 500;
              return (
              <Pop key={i} delay={pr.delay} x={pr.x * WORLD.width} y={y} scale={size}>
                <PropDrawing type={pr.type} t={Math.max(0, frame - pr.delay)} theme={theme} color={theme.accents[pr.accent ?? v.accent]} />
              </Pop>
              );
            })}
            {!v.hideFigure && (
              <Figure x={figureX} ground={WORLD.ground} pose={pose} mood={v.mood} frame={frame} theme={theme} accent={accent} flip={v.flip} hop={hop} scale={figureScale} />
            )}
          </g>
        </g>

        {v.chapter && (
          <g transform="translate(48,48)" opacity={Math.min(1, frame / 8)}>
            <rect width={v.chapter.length * 17 + 56} height={52} rx={26} fill={theme.ink} />
            <text x={28} y={36} fontSize={28} fontWeight={800} fontFamily={`${inter.fontFamily}, sans-serif`} fill={theme.bg}>{v.chapter}</text>
          </g>
        )}
        {v.code && <CodePanel spec={v.code} durationFrames={durationFrames} accent={accent} />}
        {v.quiz && <QuizPanel spec={v.quiz} durationFrames={durationFrames} theme={theme} accent={accent} />}
        {v.container && <ContainerPanel spec={v.container} theme={theme} accent={accent} />}
        {v.steps && <StepsPanel spec={v.steps} theme={theme} accent={accent} />}

        {v.title && <g filter="url(#rough)"><Title text={v.title} theme={theme} color={accent} /></g>}
        {v.callouts.length > 0 && <CalloutRow items={v.callouts} color={accent} centerX={figureX < WORLD.width / 2 ? 1280 : 640} />}

        {active && (
          <g opacity={capOpacity} transform="translate(960,985)">
            <text textAnchor="middle" fontSize={50} fontWeight={800} fontFamily={`${inter.fontFamily}, sans-serif`}
              fill={theme.ink} stroke={theme.bg} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">
              {active.text}
            </text>
          </g>
        )}

        {v.transition === "wipe" && frame < 10 && (
          <rect x={wipeX} y={0} width={WORLD.width} height={WORLD.height} fill={accent} />
        )}
      </svg>

      {!muteSfx && v.title && (
        <Sequence from={4} durationInFrames={30}><Audio src={staticFile("audio/text-pop.mp3")} volume={0.25} /></Sequence>
      )}
      {!muteSfx && v.transition === "wipe" && (
        <Sequence durationInFrames={30}><Audio src={staticFile("audio/text-whoosh.mp3")} volume={0.25} /></Sequence>
      )}
    </AbsoluteFill>
  );
};
