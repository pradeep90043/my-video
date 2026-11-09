import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { withDevanagari } from "../stickman/fonts";
import { Background, groundOf } from "./Backgrounds";
import { Character, stateAt } from "./Character";
import { Fx, FxFront, Graphic, popIn, wrap, type Box } from "./Graphics";
import { Animal, SADDLE } from "./Animals";
import { SetPiece } from "./SetPieces";
import { DrawnArt, type DrawnLibrary } from "./drawn";
import { PropIcon } from "./icons";
import { CharacterSchema, ShotSchema, type CharacterSpec, type ShotSpec } from "./spec";

const poppins = loadPoppins("normal", { weights: ["600", "700", "800", "900"], subsets: ["latin"] });
export const FLAT_FONT = withDevanagari(poppins.fontFamily);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };

/** Default x positions for 1-5 people. */
const SPREAD: Record<number, number[]> = { 1: [0.5], 2: [0.3, 0.7], 3: [0.2, 0.5, 0.8], 4: [0.14, 0.38, 0.62, 0.86], 5: [0.1, 0.3, 0.5, 0.7, 0.9] };
const WALK_SEC = 1.2;
/** how tall the catalog animals stand (body units), for their speech bubbles and name tags */
const ANIMAL_LEN: Record<string, number> = { cow: 760, elephant: 1050, horse: 800, peacock: 760, snake: 420, mouse: 260, bird: 240, lion: 700, deer: 520, dog: 480 };
const ANIMAL_HEIGHT: Record<string, number> = { cow: 700, elephant: 1050, horse: 800, peacock: 620, snake: 300, mouse: 120, bird: 160, lion: 650, deer: 850, dog: 450 };
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
  drawn?: DrawnLibrary;
}

/** One shot drawn as SVG children (no wrapper), so it can sit inside another scene's <svg>. */
export const FlatShotSvg: React.FC<ShotProps> = ({ shot: raw, characters: rawChars, W, H, t, dur, uid, accent = "#f2b53a", drawn = {} }) => {
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

  // framing: medium = cut at the waist, close = head and shoulders; the feet go below the frame (one or two people, no graphic)
  const crop = shot.framing !== "wide" && !g && hasCast && cast.length <= 2;
  const cut = shot.framing === "close" ? 560 : 440;
  // two people in one cropped frame: each a bit smaller, so they stand side by side instead of on top of each other
  const pair = crop && cast.length === 2 ? (vertical ? 0.62 : 0.8) : 1;
  const kBase = crop ? ((H * (1 - (shot.framing === "close" ? 0.3 : 0.27))) / (910 - cut)) * pair : charPx / 1000;
  // cropped: the top of the head sits at a fixed height in the frame, the body runs out of the bottom
  const groundY = crop ? H * (shot.framing === "close" ? 0.3 : 0.27) + 910 * kBase : ground;
  const wide = !crop;

  // animals first: riders sit on them
  // every animal fits its share of the frame: a brachiosaurus in a vertical Short is scaled down, never cut off
  const sizeOf = (kind: string) => {
    const cr = kind.startsWith("drawn-") ? (drawn[kind]?.creature as { height?: number; length?: number } | undefined) : undefined;
    return { len: cr?.length ?? drawn[kind]?.w ?? ANIMAL_LEN[kind] ?? 700, tall: cr?.height ?? drawn[kind]?.h ?? ANIMAL_HEIGHT[kind] ?? 600 };
  };
  const flies = (kind: string) => kind === "bird" || (kind.startsWith("drawn-") && !!(drawn[kind]?.creature as { wings?: boolean } | undefined)?.wings);
  // one scale for the whole shot (the largest at which everyone stands side by side under the title), so a giant stays a giant
  const onGround = shot.animals.filter((a) => !flies(a.kind));
  const rowLen = onGround.reduce((n, a) => n + sizeOf(a.kind).len * a.scale, 0) || 1;
  const maxTall = Math.max(1, ...shot.animals.map((a) => sizeOf(a.kind).tall * a.scale));
  const kShot = Math.min(kBase, (W * 0.94) / rowLen, (groundY - H * 0.2) / maxTall);
  const animals = wide ? shot.animals.map((a, i) => {
    const k = kShot * a.scale, x0 = (a.x ?? (i + 0.5) / shot.animals.length) * W;
    let x = x0, walking = false;
    if (a.moveTo != null) {
      const span = Math.max(1.5, (Math.abs(a.moveTo * W - x0) / (W * 0.22)));
      const q = clamp01(t / span); x = x0 + (a.moveTo * W - x0) * ease(q); walking = q < 1;
    }
    const flip = a.moveTo != null ? a.moveTo * W < x0 : a.flip;
    return { a, k, x, walking, flip };
  }) : [];

  const people = cast.slice(0, crop ? 2 : 8).map((c, i) => {
    const spec = chars.get(c.id)!;
    const k = kBase * (crop ? 1 : c.scale);
    const spread = crop && cast.length === 2 ? [0.27, 0.73][i] : undefined;
    const baseX = (spread ?? c.x ?? SPREAD[cast.length]?.[i] ?? (i + 0.5) / cast.length) * W;
    // entrance
    const e = ease(t / (c.enter.startsWith("slide") ? WALK_SEC : 0.45));
    let x = baseX, y = groundY, opacity = 1, sc = 1, walking = false;
    if (c.enter === "fade") opacity = e;
    if (c.enter === "pop") sc = popIn(t, 0);
    if (c.enter === "rise") { y = groundY + (1 - e) * H * 0.25; opacity = e; }
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
    // a rider sits in the saddle of their animal and moves with it
    const mount = c.posture === "ride" && c.rides != null ? animals[c.rides] : undefined;
    const seat = mount ? SADDLE[mount.a.kind] : undefined;
    if (mount && seat) { x = mount.x + seat.x * mount.k * (mount.flip ? -1 : 1); y = groundY + seat.y * mount.k + 260 * k; walking = false; }
    const st = { ...stateAt(c, t), walking, walk: t * 1.8, posture: mount && seat ? "ride" : c.posture === "ride" ? "seated" : c.posture };
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
            <g transform={`scale(${popIn(t, 0)})`}>{shot.object.startsWith("drawn-") ? <DrawnArt part={drawn[shot.object]} size={Math.min(W, H) * 0.34} /> : <PropIcon name={shot.object} size={Math.min(W, H) * 0.3} />}</g>
          </g>
        )}
        {wide && shot.set.filter((sp) => !sp.front).map((sp, i) => (
          <g key={`set${i}`} transform={`translate(${sp.x * W} ${groundY - sp.lift * H}) scale(${kBase * sp.scale})`}>{sp.kind.startsWith("drawn-") ? <DrawnArt part={drawn[sp.kind]} t={t} /> : <SetPiece kind={sp.kind} t={t} />}</g>
        ))}
        {wide && shot.crowd > 0 && <Crowd n={shot.crowd} W={W} y={groundY} k={kBase} t={t} />}
        {animals.map((m, i) => (
          <g key={`an${i}`}>
            <ellipse cx={m.x} cy={groundY - 4 * u} rx={300 * m.k} ry={26 * m.k} fill="#000" opacity={0.2} />
            <g transform={`translate(${m.x} ${groundY - (flies(m.a.kind) ? H * 0.4 + Math.sin(t * 1.4 + i) * 20 * u : 0)}) scale(${m.k * (m.flip ? -1 : 1)} ${m.k})`}>{m.a.kind.startsWith("drawn-") ? <DrawnArt part={drawn[m.a.kind]} t={t + i} walking={m.walking} /> : <Animal kind={m.a.kind} color={m.a.color} t={t + i} walking={m.walking} />}</g>
          </g>
        ))}
        {people.map((q) => (
          <g key={q.c.id} opacity={q.opacity}>
            <ellipse cx={q.x} cy={q.y - 4 * u} rx={130 * q.k * (q.spec.age === "child" ? 0.7 : 1)} ry={22 * q.k} fill="#000" opacity={0.22} />
            <g transform={`translate(${q.x} ${q.y}) scale(${q.k * q.sc})`}><Character c={q.spec} st={q.st} t={t + q.x * 0.001} fps={30} drawn={drawn} /></g>
          </g>
        ))}
        {wide && shot.set.filter((sp) => sp.front).map((sp, i) => (
          <g key={`setf${i}`} transform={`translate(${sp.x * W} ${groundY - sp.lift * H}) scale(${kBase * sp.scale})`}>{sp.kind.startsWith("drawn-") ? <DrawnArt part={drawn[sp.kind]} t={t} /> : <SetPiece kind={sp.kind} t={t} />}</g>
        ))}
        <FxFront kind={shot.fx} W={W} H={H} t={t} />
        {animals.map((m, i) => {
          // speech bubble and name tag of an animal hero, over its back
          const tall = (m.a.kind.startsWith("drawn-") ? ((drawn[m.a.kind]?.creature as { height?: number } | undefined)?.height ?? drawn[m.a.kind]?.h ?? 600) : ANIMAL_HEIGHT[m.a.kind] ?? 600) * m.k;
          return (
            <g key={`anui${i}`}>
              {m.a.say && <Bubble text={m.a.say} x={m.x} y={Math.max(H * (shot.title ? 0.2 : 0.12), groundY - tall - 30 * u)} W={W} u={u} t={t} />}
              {m.a.tag && <NameTag tag={m.a.tag} x={m.x} chestY={groundY - tall * 0.6} halfW={tall * 0.45} W={W} u={u} t={t} accent={accent} />}
            </g>
          );
        })}
        {people.map((q) => {
          const headTop = q.y - 1060 * q.k * (q.spec.age === "child" ? 0.72 : 1);
          return (
            <g key={`ui-${q.c.id}`} opacity={q.opacity}>
              {q.say && <Bubble text={q.say} x={q.x} y={Math.max(H * (shot.title ? 0.2 : 0.12), headTop - 20 * u)} W={W} u={u} t={t} />}
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

/** A crowd of simple figures in two rows (villagers, an army, an audience), each swaying on its own. */
const CROWD_COLORS = ["#e0703a", "#3e8f6a", "#c0392b", "#4f6fb8", "#d9a046", "#8e4fa8", "#2f7f8f", "#b84f6f"];
const Crowd: React.FC<{ n: number; W: number; y: number; k: number; t: number }> = ({ n, W, y, k, t }) => (
  <g>
    {[1, 0].map((row) => Array.from({ length: Math.ceil(n / 2) }, (_, i) => {
      const cnt = Math.ceil(n / 2), x = ((i + 0.5 + (row ? 0.5 : 0)) / (cnt + (row ? 0.5 : 0))) * W, s = k * (row ? 0.58 : 0.7);
      const yy = y - (row ? 70 : 0) * k + Math.sin(t * 2 + i * 1.7 + row) * 6 * k;
      const col = CROWD_COLORS[(i * 3 + row) % CROWD_COLORS.length];
      return (
        <g key={`${row}-${i}`} transform={`translate(${x} ${yy}) scale(${s})`} opacity={row ? 0.8 : 0.95}>
          <path d="M -110 0 L -110 -420 Q -110 -520 0 -520 Q 110 -520 110 -420 L 110 0 Z" fill={col} />
          <circle cx={0} cy={-610} r={80} fill={row ? "#6b4a36" : "#8a5c40"} />
        </g>
      );
    }))}
  </g>
);

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
export const FlatShotLayer: React.FC<{ shot: ShotSpec; characters: CharacterSpec[]; durationFrames: number; uid: string; accent?: string; drawn?: DrawnLibrary }> = ({ shot, characters, durationFrames, uid, accent, drawn }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <FlatShotSvg shot={shot} characters={characters} W={width} H={height} t={frame / fps} dur={durationFrames / fps} uid={uid} accent={accent} drawn={drawn} />
      </svg>
    </AbsoluteFill>
  );
};
