import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { GROUNDED_PROP_BOTTOM, MOOD_SFX, PANEL_KEYS, StickmanVisualSchema, type Mood, type PoseName, type StickmanVisual } from "./schema";
import { WORLD, WORLD_VERTICAL, type Theme, type World } from "./theme";
import { Figure, blendedPose } from "./Figure";
import { ScreenFx, cameraPunch } from "./Emotion";
import { PropDrawing } from "./Props";
import { buildCaptions } from "./captions";
import { CodePanel, ContainerPanel, QuizPanel, StepsPanel } from "./Panels";
import {
  AlertPanel, BrowserPanel, ChartPanel, ComparePanel, CounterPanel, FlowPanel,
  ProgressPanel, TablePanel, TerminalPanel,
} from "./PanelsExtra";

// Load only what is used (latin, weights 800/900) — the defaults fetch every subset and weight.
const montserrat = loadMontserrat("normal", { weights: ["900"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["800"], subsets: ["latin"] });

interface SceneProps {
  text: string;
  visual: unknown;
  durationFrames: number;
  theme: Theme;
  prevPose: PoseName;
  prevMood?: Mood;
  /** frames of silence before the line starts (scene.pauseBefore) and how long the line itself lasts */
  speakFrom?: number;
  speakFrames?: number;
  muteSfx?: boolean;
  vertical?: boolean;
  /** first frame of this scene on the video timeline, and the lip-sync track (mouth level per video frame) */
  startFrame?: number;
  mouth?: number[];
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

const Title: React.FC<{ text: string; theme: Theme; color: string; world: World }> = ({ text, theme, color, world }) => {
  const s = useSpring(4, { damping: 15, stiffness: 120, mass: 0.8 });
  const vertical = world.width < world.height;
  const size = vertical ? Math.min(74, (world.width - 140) / (text.length * 0.64)) : 96;
  const width = Math.min(world.width - 80, text.length * size * 0.6 + 80);
  return (
    <g opacity={Math.min(1, s * 2)} transform={`translate(${world.width / 2},${(vertical ? 190 : 150) + (1 - s) * -40})`}>
      <rect x={-width / 2} y={30} width={width * s} height={16} rx={8} fill={color} opacity={0.9} />
      <text textAnchor="middle" fontSize={size} fontWeight={900} fontFamily={`${montserrat.fontFamily}, sans-serif`} fill={theme.ink} letterSpacing={-1}>
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
const CalloutRow: React.FC<{ items: string[]; color: string; centerX: number; world: World }> = ({ items, color, centerX, world }) => {
  if (world.width < world.height) {
    // vertical: stack the pills in a centred column
    return (
      <g transform="translate(0,270)">
        {items.map((t, i) => {
          const w = Math.min(world.width - 80, Math.max(240, t.length * 26 + 70));
          return (
            <g key={i} transform={`translate(${(world.width - w) / 2},${i * 100})`}>
              <Callout text={t} width={w} delay={18 + i * 10} color={color} />
            </g>
          );
        })}
      </g>
    );
  }
  const widths = items.map((t) => Math.max(240, t.length * 26 + 70));
  const gap = 28;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let x = Math.max(40, Math.min(world.width - 40 - total, centerX - total / 2));
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

export const StickmanScene: React.FC<SceneProps> = ({ text, visual, durationFrames, theme, prevPose, prevMood, speakFrom = 0, speakFrames, muteSfx, vertical = false, startFrame = 0, mouth }) => {
  const world: World = vertical ? WORLD_VERTICAL : WORLD;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v: StickmanVisual = StickmanVisualSchema.parse(visual ?? {});
  const accent = theme.accents[v.accent];

  const pose = blendedPose(prevPose, v.pose, frame, fps);
  const hop = v.pose === "celebrate" || v.pose === "laugh" ? Math.abs(Math.sin(frame * 0.2)) * (v.pose === "laugh" ? 12 : 26) : 0;
  const hasPanel = PANEL_KEYS.some((k) => v[k]);
  // With a panel on the right the figure shrinks and tucks into the left strip.
  const figureScale = v.figureScale ?? (hasPanel ? 0.8 : vertical ? 1.9 : FIGURE_SCALE);
  const figureXFrac = hasPanel && v.figureX === 0.3 ? 0.14 : vertical && v.figureX === 0.3 ? 0.5 : v.figureX;
  const figureX = (v.flip ? 1 - figureXFrac : figureXFrac) * world.width;

  // Camera
  const p = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: "clamp" });
  const punch = v.calm ? 0 : cameraPunch(v.mood, frame);
  const cam0 = {
    none: { s: 1, x: 0 },
    push: { s: 1 + 0.07 * p, x: 0 },
    pull: { s: 1.07 - 0.07 * p, x: 0 },
    "pan-left": { s: 1.05, x: 40 - 80 * p },
    "pan-right": { s: 1.05, x: -40 + 80 * p },
  }[v.camera];
  const cam = { ...cam0, s: cam0.s + punch };

  // Emotion SFX: explicit, or the mood's sound when the mood changes between scenes.
  const sfx = v.sfx === "auto" ? (prevMood !== undefined && prevMood !== v.mood ? MOOD_SFX[v.mood] : undefined) : v.sfx === "none" ? undefined : v.sfx;

  const seed = Math.floor(frame / 4); // "boiling line" hand-drawn wobble
  // real speech loudness when the project has a lip-sync track; undefined = generic flap
  const mouthLevel = mouth ? mouth[startFrame + frame] ?? 0 : undefined;
  const talking = frame >= speakFrom && (speakFrames === undefined || frame < speakFrom + speakFrames);
  const captions = buildCaptions(text, speakFrames ?? Math.max(1, durationFrames - speakFrom), vertical ? 4 : 7);
  const active = captions.find((c) => frame - speakFrom >= c.start && frame - speakFrom < c.end);
  const capOpacity = (() => {
    if (!active) return 0;
    const local = frame - speakFrom;
    const dur = active.end - active.start;
    if (dur <= 0) return 0;
    if (dur < 8) return 1;
    return interpolate(local, [active.start, active.start + 4, active.end - 3, active.end], [0, 1, 1, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  })();

  const fadeIn = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  const wipeX = interpolate(frame, [0, 10], [-world.width, world.width], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <svg viewBox={`0 0 ${world.width} ${world.height}`} width="100%" height="100%" style={{ opacity: fadeIn }}>
        <defs>
          <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={2} seed={seed % 50} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={4} />
          </filter>
          <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="2.2" fill={theme.faint} />
          </pattern>
        </defs>

        <rect width={world.width} height={world.height} fill="url(#dots)" opacity={0.7} />

        <g transform={`translate(${world.width / 2 + cam.x},${world.height / 2}) scale(${cam.s}) translate(${-world.width / 2},${-world.height / 2})`}>
          <g filter="url(#rough)">
            <path d={`M0,${world.ground + 4} H${world.width}`} stroke={theme.ink} strokeWidth={6} strokeLinecap="round" />
            {v.props.map((pr, i) => {
              const size = pr.scale * PROP_BASE_SCALE;
              const bottom = GROUNDED_PROP_BOTTOM[pr.type];
              const y = pr.y !== undefined ? pr.y * world.height : bottom !== undefined ? world.ground - bottom * size : 500;
              return (
              <Pop key={i} delay={pr.delay} x={pr.x * world.width} y={y} scale={size}>
                <PropDrawing type={pr.type} t={Math.max(0, frame - pr.delay)} theme={theme} color={theme.accents[pr.accent ?? v.accent]} />
              </Pop>
              );
            })}
            {!v.hideFigure && (
              <Figure x={figureX} ground={world.ground} pose={pose} mood={v.mood} prevMood={prevMood} talking={talking} mouthLevel={mouthLevel} look={v.look} frame={frame} theme={theme} accent={accent} flip={v.flip} hop={hop} scale={figureScale} calm={v.calm} />
            )}
          </g>
        </g>

        {!v.calm && <ScreenFx mood={v.mood} frame={frame} w={world.width} h={world.height} accent={accent} />}

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
        {v.compare && <ComparePanel spec={v.compare} theme={theme} accent={accent} />}
        {v.flow && <FlowPanel spec={v.flow} durationFrames={durationFrames} theme={theme} accent={accent} />}
        {v.terminal && <TerminalPanel spec={v.terminal} durationFrames={durationFrames} theme={theme} accent={accent} />}
        {v.browser && <BrowserPanel spec={v.browser} theme={theme} accent={accent} />}
        {v.counter && <CounterPanel spec={v.counter} durationFrames={durationFrames} theme={theme} accent={accent} />}
        {v.chart && <ChartPanel spec={v.chart} theme={theme} accent={accent} />}
        {v.progress && <ProgressPanel spec={v.progress} durationFrames={durationFrames} theme={theme} accent={accent} />}
        {v.table && <TablePanel spec={v.table} theme={theme} accent={accent} />}
        {v.alert && <AlertPanel spec={v.alert} theme={theme} accent={accent} />}

        {v.title && <g filter="url(#rough)"><Title text={v.title} theme={theme} color={accent} world={world} /></g>}
        {v.callouts.length > 0 && !hasPanel && <CalloutRow items={v.callouts} color={accent} centerX={figureX < world.width / 2 ? 1280 : 640} world={world} />}

        {active && (
          <g opacity={capOpacity} transform={`translate(${world.width / 2},${vertical ? world.height - 420 : 985})`}>
            <text textAnchor="middle" fontSize={vertical ? 70 : 50} fontWeight={800} fontFamily={`${inter.fontFamily}, sans-serif`}
              fill={theme.ink} stroke={theme.bg} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">
              {active.text}
            </text>
          </g>
        )}

        {v.transition === "wipe" && frame < 10 && (
          <rect x={wipeX} y={0} width={world.width} height={world.height} fill={accent} />
        )}
      </svg>

      {!muteSfx && sfx && (
        <Sequence from={v.sfxDelay} durationInFrames={Math.max(1, durationFrames - v.sfxDelay)}>
          <Audio src={staticFile(`audio/sfx/${sfx}.mp3`)} volume={0.5} />
        </Sequence>
      )}
      {!muteSfx && v.title && (
        <Sequence from={4} durationInFrames={30}><Audio src={staticFile("audio/text-pop.mp3")} volume={0.25} /></Sequence>
      )}
      {!muteSfx && v.transition === "wipe" && (
        <Sequence durationInFrames={30}><Audio src={staticFile("audio/text-whoosh.mp3")} volume={0.25} /></Sequence>
      )}
    </AbsoluteFill>
  );
};
