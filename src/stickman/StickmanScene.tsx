import React, { useMemo } from "react";
import { Backdrop } from "./Backdrop";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { layoutScene } from "./layout";
import { GROUNDED_PROP_BOTTOM, MOOD_SFX, PANEL_KEYS, StickmanVisualSchema, type Mood, type PoseName, type StickmanVisual } from "./schema";
import { WORLD, WORLD_VERTICAL, type Theme, type World } from "./theme";
import { Figure, blendedPose } from "./Figure";
import { ScreenFx, cameraPunch } from "./Emotion";
import { PropDrawing } from "./Props";
import { buildCaptions, type SpokenWord } from "./captions";
import { CodePanel, ContainerPanel, QuizPanel, StepsPanel } from "./Panels";
import { ScenePanel } from "./doodle/ScenePanel";
import {
  AlertPanel, NewsPanel, BrowserPanel, ChartPanel, ComparePanel, CounterPanel, FlowPanel,
  ProgressPanel, SvgPanel, TablePanel, TerminalPanel,
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
  /** position in the video; drives the "auto" transition rotation */
  index?: number;
  /** TTS word timings (seconds from the start of the line) for exact karaoke captions */
  words?: SpokenWord[];
  /** first frame of this scene on the video timeline, and the lip-sync track (mouth level per video frame) */
  startFrame?: number;
  mouth?: number[];
}


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
      <text x={width / 2} y={51} textAnchor="middle" fontSize={Math.max(20, Math.min(36, Math.floor((width - 36) / (0.6 * Math.max(1, text.length)))))} fontWeight={800} fontFamily={`${inter.fontFamily}, sans-serif`} fill="#fff">{text}</text>
    </g>
  );
};

/** Laid out inside `range` (the screen side the figure is not on); stacked when one row does not fit. */
const CalloutRow: React.FC<{ items: string[]; color: string; range: [number, number]; world: World }> = ({ items, color, range, world }) => {
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
  const [lo, hi] = range;
  const avail = hi - lo;
  const widths = items.map((t) => Math.min(avail, Math.max(240, t.length * 26 + 70)));
  const gap = 28;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  if (total > avail) {
    // too wide for one row: stack them
    const left = lo + (avail - Math.max(...widths)) / 2;
    return (
      <g transform="translate(0,262)">
        {items.map((t, i) => (
          <g key={i} transform={`translate(${left},${i * 96})`}>
            <Callout text={t} width={widths[i]} delay={18 + i * 10} color={color} />
          </g>
        ))}
      </g>
    );
  }
  let x = lo + (avail - total) / 2;
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

export const StickmanScene: React.FC<SceneProps> = ({ text, visual, durationFrames, theme, prevPose, prevMood, speakFrom = 0, speakFrames, muteSfx, vertical = false, startFrame = 0, mouth, index = 0, words }) => {
  const world: World = vertical ? WORLD_VERTICAL : WORLD;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v: StickmanVisual = useMemo(() => StickmanVisualSchema.parse(visual ?? {}), [visual]);
  const accent = theme.accents[v.accent];

  const pose = blendedPose(prevPose, v.pose, frame, fps);
  const hop = v.pose === "celebrate" || v.pose === "laugh" ? Math.abs(Math.sin(frame * 0.2)) * (v.pose === "laugh" ? 12 : 26) : 0;
  const hasPanel = PANEL_KEYS.some((k) => v[k]);
  // The panel owns one side of the frame, the figure stands on the other; props and callouts keep clear of it.
  const layout = layoutScene({
    world, vertical, hasPanel, side: v.side, figureX: v.figureX, flip: v.flip, figureScale: v.figureScale,
    hasCallouts: v.callouts.length > 0, calloutCount: v.callouts.length,
    props: v.props.map((pr) => ({ type: pr.type, x: pr.x, y: pr.y, scale: pr.scale })),
  });
  const { figureX, figureScale } = layout;
  const panelT = layout.panel ? `translate(${layout.panel.tx},${layout.panel.ty}) scale(${layout.panel.scale})` : undefined;

  // Camera
  const p = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
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
  const groundPath = (() => {
    const pts: string[] = [];
    for (let x = 0; x <= world.width; x += 160) pts.push(`${x},${world.ground + 4 + Math.sin(x * 0.013 + seed * 1.7) * 2.2}`);
    return `M${pts.join(" L")}`;
  })();
  // real speech loudness when the project has a lip-sync track; undefined = generic flap
  const mouthLevel = mouth ? mouth[startFrame + frame] ?? 0 : undefined;
  const talking = frame >= speakFrom && (speakFrames === undefined || frame < speakFrom + speakFrames);
  const captions = useMemo(() => buildCaptions(text, speakFrames ?? Math.max(1, durationFrames - speakFrom), vertical ? 4 : 7, words, fps), [text, speakFrames, durationFrames, speakFrom, vertical, words, fps]);
  const active = captions.find((c) => frame - speakFrom >= c.start && frame - speakFrom < c.end);
  const capOpacity = (() => {
    if (!active) return 0;
    const local = frame - speakFrom;
    const dur = active.end - active.start;
    if (dur <= 0) return 0;
    if (dur < 8) return 1;
    return interpolate(local, [active.start, active.start + 4, active.end - 3, active.end], [0, 1, 1, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  })();

  const AUTO_ROTATION = ["slide", "zoom", "iris", "wipe"] as const;
  const transition = v.transition === "auto" ? (index === 0 ? "cut" : AUTO_ROTATION[(index - 1) % AUTO_ROTATION.length]) : v.transition;
  const TR_FRAMES = 12;
  const tr = interpolate(frame, [0, TR_FRAMES], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const fadeIn = transition === "cut" ? interpolate(frame, [0, 5], [0, 1], { extrapolateRight: "clamp" }) : transition === "wipe" || transition === "iris" ? 1 : Math.min(1, tr * 1.6);
  const wipeX = interpolate(frame, [0, 10], [-world.width, world.width], { extrapolateRight: "clamp" });
  const sceneTransform =
    transition === "slide" ? `translate(${(1 - tr) * world.width * 0.07},0)` :
    transition === "zoom" ? `translate(${world.width / 2},${world.height / 2}) scale(${1.14 - 0.14 * tr}) translate(${-world.width / 2},${-world.height / 2})` : undefined;
  const irisR = Math.hypot(world.width, world.height) / 2 * tr;
  // slow parallax drift of the dot grid so the background is never static
  const drift = (frame * 0.35) % 60;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <svg viewBox={`0 0 ${world.width} ${world.height}`} width="100%" height="100%" style={{ opacity: fadeIn }}>
        <defs>
          <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={1} seed={seed % 50} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={4} />
          </filter>
          <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="2.2" fill={theme.faint} />
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <stop offset="60%" stopColor={theme.bg} stopOpacity={0} />
            <stop offset="100%" stopColor={theme.ink} stopOpacity={0.09} />
          </radialGradient>
          <clipPath id="irisClip">
            <circle cx={world.width / 2} cy={world.height / 2} r={Math.max(1, irisR)} />
          </clipPath>
        </defs>

        <rect width={world.width} height={world.height} fill="url(#vignette)" />
        <g clipPath={transition === "iris" && tr < 1 ? "url(#irisClip)" : undefined} transform={sceneTransform}>
        <rect x={-60} y={-60} width={world.width + 120} height={world.height + 120} fill="url(#dots)" opacity={0.7} transform={`translate(${-drift},${-drift})`} />

        {v.setting !== "none" && <g opacity={hasPanel ? 0.5 : 1}><Backdrop setting={v.setting} t={frame} theme={theme} world={world} accent={theme.accents[v.accent]} /></g>}

        <g transform={`translate(${world.width / 2 + cam.x},${world.height / 2}) scale(${cam.s}) translate(${-world.width / 2},${-world.height / 2})`}>
          {/* ground line drawn outside the filter (a full-width filter region is the costliest part of a frame); jittered by hand instead */}
          <path d={groundPath} stroke={theme.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <g filter="url(#rough)">
            {v.props.map((pr, i) => {
              const pl = layout.props[i];
              if (pl.hidden) return null;
              const size = pl.scale;
              const bottom = GROUNDED_PROP_BOTTOM[pr.type];
              const y = pr.y !== undefined ? pr.y * world.height : bottom !== undefined ? world.ground - bottom * size : 500;
              return (
              <Pop key={i} delay={pr.delay} x={pl.x} y={y} scale={size}>
                <PropDrawing type={pr.type} t={Math.max(0, frame - pr.delay)} theme={theme} color={theme.accents[pr.accent ?? v.accent]} />
              </Pop>
              );
            })}
            {!v.hideFigure && (
              <Figure x={figureX} ground={world.ground} pose={pose} mood={v.mood} prevMood={prevMood} talking={talking} mouthLevel={mouthLevel} look={v.look} frame={frame} theme={theme} accent={accent} flip={layout.flip} hop={hop} scale={figureScale} calm={v.calm} />
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
        <g transform={panelT}>
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
        {v.svg && <SvgPanel spec={v.svg} durationFrames={durationFrames} theme={theme} accent={accent} />}
        {v.news && <NewsPanel spec={v.news} theme={theme} accent={accent} />}
        {v.scene && <ScenePanel spec={v.scene} durationFrames={durationFrames} theme={theme} accent={accent} />}
        </g>

        {v.title && <g filter="url(#rough)"><Title text={v.title} theme={theme} color={accent} world={world} /></g>}
        {v.callouts.length > 0 && !hasPanel && <CalloutRow items={v.callouts} color={accent} range={layout.calloutRange} world={world} />}

        {active && (() => {
          const local = frame - speakFrom;
          const pop = spring({ frame: local - active.start, fps, config: { damping: 14, stiffness: 220, mass: 0.5 } });
          const capSize = vertical ? 70 : 50;
          return (
            <g opacity={capOpacity} transform={`translate(${world.width / 2},${(vertical ? world.height - 420 : 985) + (1 - pop) * 14}) scale(${0.94 + 0.06 * pop})`}>
              <text textAnchor="middle" fontSize={capSize} fontWeight={800} fontFamily={`${inter.fontFamily}, sans-serif`}
                stroke={theme.bg} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">
                {active.words.map((w, i) => {
                  const spoken = local >= w.start;
                  const current = spoken && local < w.end;
                  return (
                    <tspan key={i} fill={current ? accent : theme.ink} fillOpacity={spoken ? 1 : 0.5}>
                      {w.text}{i < active.words.length - 1 ? " " : ""}
                    </tspan>
                  );
                })}
              </text>
            </g>
          );
        })()}
        </g>

        {transition === "wipe" && frame < 10 && (
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
      {!muteSfx && transition !== "cut" && (
        <Sequence durationInFrames={30}><Audio src={staticFile("audio/text-whoosh.mp3")} volume={0.25} /></Sequence>
      )}
    </AbsoluteFill>
  );
};
