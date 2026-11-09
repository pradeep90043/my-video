import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { withDevanagari } from "../stickman/fonts";
import { Background, groundOf } from "./Backgrounds";
import { Character, stateAt } from "./Character";
import { Fx, Graphic, popIn, wrap, type Box } from "./Graphics";
import { PropIcon } from "./icons";
import { CharacterSchema, ShotSchema, type CharacterSpec, type ShotSpec } from "./spec";

const poppins = loadPoppins("normal", { weights: ["600", "700", "800", "900"], subsets: ["latin"] });
export const FLAT_FONT = withDevanagari(poppins.fontFamily);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };

/** Default x positions for 1-5 people. */
const SPREAD: Record<number, number[]> = { 1: [0.5], 2: [0.3, 0.7], 3: [0.2, 0.5, 0.8], 4: [0.14, 0.38, 0.62, 0.86], 5: [0.1, 0.3, 0.5, 0.7, 0.9] };
const WALK_SEC = 1.2;
/** backgrounds bright enough that white text needs a dark plate behind it */
const LIGHT_BGS = new Set(["palace", "sky", "village", "temple", "room", "office", "classroom", "mountains", "sea", "sunburst"]);

interface ShotProps {
  shot: ShotSpec;
  characters: CharacterSpec[];
  W: number; H: number;
  /** seconds into the shot, and its length */
  t: number; dur: number;
  uid: string;
  accent?: string;
}

/** One shot drawn as SVG children (no wrapper), so it can sit inside another scene's <svg>. */
export const FlatShotSvg: React.FC<ShotProps> = ({ shot: raw, characters: rawChars, W, H, t, dur, uid, accent = "#f2b53a" }) => {
  const shot = ShotSchema.parse(raw);
  const chars = new Map(rawChars.map((c) => { const p = CharacterSchema.parse(c); return [p.id, p]; }));
  const vertical = H > W;
  const u = Math.min(W, H) / 1080;
  const cast = shot.cast.filter((c) => chars.has(c.id));
  const hasCast = cast.length > 0;
  const g = shot.graphic;
  const ground = groundOf(shot.bg, H);

  // camera: a slow move over the whole shot (the title stays put)
  const p = ease(t / Math.max(0.1, dur));
  const cam = shot.camera;
  const s = cam === "push" ? 1 + 0.06 * p : cam === "pull" ? 1.06 - 0.06 * p : cam === "static" ? 1 : 1.06;
  const tx = cam === "pan-left" ? (0.5 - p) * W * 0.05 : cam === "pan-right" ? (p - 0.5) * W * 0.05 : 0;
  const camT = `translate(${W / 2 + tx} ${H / 2}) scale(${s}) translate(${-W / 2} ${-H / 2})`;
  const bgT = `translate(${W / 2 + tx * 0.5} ${H / 2}) scale(${1 + (s - 1) * 0.5}) translate(${-W / 2} ${-H / 2})`;

  // where the graphic goes: the upper part when people stand below it, otherwise most of the frame
  const gBox: Box = hasCast
    ? vertical ? { x: W * 0.08, y: H * 0.2, w: W * 0.84, h: H * 0.34 } : { x: W * 0.12, y: H * 0.12, w: W * 0.76, h: H * 0.4 }
    : vertical ? { x: W * 0.06, y: H * 0.22, w: W * 0.88, h: H * 0.58 } : { x: W * 0.1, y: H * 0.14, w: W * 0.8, h: H * 0.7 };
  const charPx = (vertical ? (g ? 0.3 : 0.44) : (g ? 0.4 : 0.62)) * H;

  const people = cast.map((c, i) => {
    const spec = chars.get(c.id)!;
    const k = (charPx / 1000) * c.scale;
    const baseX = (c.x ?? SPREAD[cast.length]?.[i] ?? (i + 0.5) / cast.length) * W;
    // entrance
    const e = ease(t / (c.enter.startsWith("slide") ? WALK_SEC : 0.45));
    let x = baseX, y = ground, opacity = 1, sc = 1, walking = false;
    if (c.enter === "fade") opacity = e;
    if (c.enter === "pop") sc = popIn(t, 0);
    if (c.enter === "rise") { y = ground + (1 - e) * H * 0.25; opacity = e; }
    if (c.enter === "slide-left" || c.enter === "slide-right") {
      const from = c.enter === "slide-left" ? -0.15 * W : 1.15 * W;
      x = from + (baseX - from) * e; walking = e < 1;
    }
    // walking to a new spot
    let cur = baseX;
    for (const b of [...c.beats].sort((a, b2) => a.at - b2.at)) {
      if (b.moveTo == null || b.at > t) continue;
      const q = clamp01((t - b.at) / WALK_SEC), to = b.moveTo * W;
      x = cur + (to - cur) * ease(q);
      if (q < 1) walking = true;
      cur = to;
    }
    const st = { ...stateAt(c, t), walking, walk: t * 1.8 };
    const say = [...c.beats].filter((b) => b.say && b.at <= t).pop()?.say ?? (t > 0.35 ? c.say : undefined);
    return { c, spec, k, x, y, opacity, sc, st, say };
  });

  const titleK = clamp01((t - 0.05) / 0.4);
  const titleLines = shot.title ? wrap(shot.title, vertical ? 26 : 44).slice(0, 2) : [];
  const titleY = H * (vertical ? 0.065 : 0.085);
  const titleSize = (vertical ? 50 : 46) * u;

  return (
    <g>
      <g transform={bgT}><Background kind={shot.bg} W={W} H={H} t={t} palette={shot.palette} uid={uid} /></g>
      <g transform={camT}>
        <Fx kind={shot.fx} W={W} H={H} t={t} />
        {g && <Graphic g={g} box={gBox} t={t} font={FLAT_FONT} accent={accent} />}
        {!hasCast && !g && shot.object && (
          <g transform={`translate(${W / 2} ${H * 0.5 + Math.sin(t * 1.5) * 8 * u})`}>
            <circle r={Math.min(W, H) * 0.24} fill="#ffcf6b" opacity={0.12 + 0.05 * Math.sin(t * 2.5)} />
            <circle r={Math.min(W, H) * 0.14} fill="#ffcf6b" opacity={0.12} />
            <g transform={`scale(${popIn(t, 0)})`}><PropIcon name={shot.object} size={Math.min(W, H) * 0.3} /></g>
          </g>
        )}
        {people.map((q) => (
          <g key={q.c.id} opacity={q.opacity}>
            <ellipse cx={q.x} cy={q.y - 4 * u} rx={130 * q.k * (q.spec.age === "child" ? 0.7 : 1)} ry={22 * q.k} fill="#000" opacity={0.22} />
            <g transform={`translate(${q.x} ${q.y}) scale(${q.k * q.sc})`}><Character c={q.spec} st={q.st} t={t + q.x * 0.001} fps={30} /></g>
          </g>
        ))}
        {people.map((q) => {
          const headTop = q.y - 1060 * q.k * (q.spec.age === "child" ? 0.72 : 1);
          return (
            <g key={`ui-${q.c.id}`} opacity={q.opacity}>
              {q.say && <Bubble text={q.say} x={q.x} y={headTop - 20 * u} W={W} u={u} t={t} />}
              {q.c.tag && <NameTag tag={q.c.tag} x={q.x} chestY={q.y - 560 * q.k} halfW={150 * q.k} W={W} u={u} t={t} accent={accent} />}
            </g>
          );
        })}
      </g>
      {shot.title && (
        <g opacity={titleK} transform={`translate(0 ${(1 - titleK) * -12 * u})`}>
          {LIGHT_BGS.has(shot.bg) && (() => {
            const tw = Math.max(...titleLines.map((l) => l.length)) * titleSize * 0.58 + 60 * u;
            return <rect x={W / 2 - tw / 2} y={titleY - titleSize * 1.05} width={tw} height={titleLines.length * titleSize * 1.2 + titleSize * 0.95} rx={18 * u} fill="#12121c" opacity={0.78} />;
          })()}
          {titleLines.map((l, i) => (
            <text key={i} x={W / 2} y={titleY + i * titleSize * 1.2} fontSize={titleSize} fontWeight={800} fill="#fff" textAnchor="middle" fontFamily={FLAT_FONT}
              stroke="#000" strokeOpacity={0.35} strokeWidth={4 * u} paintOrder="stroke">{l}</text>
          ))}
          <rect x={W / 2 - 70 * u * ease((t - 0.2) / 0.5)} y={titleY + (titleLines.length - 1) * titleSize * 1.2 + 22 * u}
            width={140 * u * ease((t - 0.2) / 0.5)} height={5 * u} rx={2.5 * u} fill={accent} />
        </g>
      )}
    </g>
  );
};

const Bubble: React.FC<{ text: string; x: number; y: number; W: number; u: number; t: number }> = ({ text, x, y, W, u, t }) => {
  const lines = wrap(text, 22).slice(0, 3), fs = 38 * u, bw = Math.max(...lines.map((l) => l.length)) * fs * 0.56 + 40 * u, bh = lines.length * fs * 1.25 + 30 * u;
  const bx = Math.max(16 * u, Math.min(W - bw - 16 * u, x - bw / 2)), by = y - bh;
  const k = popIn(t, 0.35);
  return (
    <g transform={`translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`}>
      <rect x={bx} y={by} width={bw} height={bh} rx={16 * u} fill="#fff" />
      <path d={`M ${x - 14 * u} ${y - 2} L ${x} ${y + 22 * u} L ${x + 14 * u} ${y - 2} Z`} fill="#fff" />
      {lines.map((l, i) => <text key={i} x={bx + bw / 2} y={by + 22 * u + (i + 0.75) * fs * 1.2} fontSize={fs} fontWeight={700} fill="#1b1b24" textAnchor="middle" fontFamily={FLAT_FONT}>{l}</text>)}
    </g>
  );
};

const NameTag: React.FC<{ tag: { name: string; sub?: string }; x: number; chestY: number; halfW: number; W: number; u: number; t: number; accent: string }> = ({ tag, x, chestY, halfW, W, u, t, accent }) => {
  const fs = 36 * u, nw = tag.name.length * fs * 0.6 + 34 * u, sw = (tag.sub?.length ?? 0) * fs * 0.4 + 24 * u, w = Math.max(nw, sw);
  const left = x - halfW - w - 10 * u > 10 * u;
  const bx = left ? x - halfW - w - 10 * u : Math.min(W - w - 10 * u, x + halfW + 10 * u);
  const k = ease((t - 0.5) / 0.4);
  return (
    <g opacity={k} transform={`translate(${(1 - k) * (left ? -30 : 30) * u} 0)`}>
      <rect x={bx} y={chestY} width={nw} height={fs * 1.55} fill="#141218" />
      <rect x={bx} y={chestY} width={6 * u} height={fs * 1.55} fill="#e04a3f" />
      <text x={bx + 18 * u} y={chestY + fs * 1.1} fontSize={fs} fontWeight={800} fill="#fff" fontFamily={FLAT_FONT}>{tag.name}</text>
      {tag.sub && <>
        <rect x={bx} y={chestY + fs * 1.55} width={sw} height={fs * 0.95} fill={accent} />
        <text x={bx + 12 * u} y={chestY + fs * 2.25} fontSize={fs * 0.62} fontWeight={700} fill="#1b1b24" fontFamily={FLAT_FONT}>{tag.sub}</text>
      </>}
    </g>
  );
};

/** A shot as a full-frame layer driven by the current frame (used inside the stickman video for `visual.flat`). */
export const FlatShotLayer: React.FC<{ shot: ShotSpec; characters: CharacterSpec[]; durationFrames: number; uid: string; accent?: string }> = ({ shot, characters, durationFrames, uid, accent }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <FlatShotSvg shot={shot} characters={characters} W={width} H={height} t={frame / fps} dur={durationFrames / fps} uid={uid} accent={accent} />
      </svg>
    </AbsoluteFill>
  );
};
