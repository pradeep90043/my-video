import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import type { Mood } from "./schema";
import type { Theme } from "./theme";

/**
 * Emotion rendering for the stickman: face (eyes / brows / mouth), head extras
 * (veins, tears, sweat, sparkles…), whole-body motion and full-screen mood FX.
 * Head-local coordinates: head radius 50, eyes at (±17,-6), mouth centre y≈21.
 */

const BLUSH = "#ff8fa3";
const TEAR = "#5aa9ff";

/** Offset/rotation applied to the whole figure (about its feet) for a mood. */
export function bodyMotion(mood: Mood, frame: number): { dx: number; dy: number; rot: number } {
  switch (mood) {
    case "shocked": {
      const jump = Math.sin((Math.min(frame, 10) / 10) * Math.PI) * 38;
      return { dx: Math.sin(frame * 2.4) * 1.6, dy: -jump, rot: 0 };
    }
    case "angry":
      return { dx: Math.sin(frame * 3.1) * 3.5, dy: 0, rot: Math.sin(frame * 0.5) * 0.8 };
    case "excited":
      return { dx: 0, dy: -Math.abs(Math.sin(frame * 0.35)) * 22, rot: Math.sin(frame * 0.35) * 1.2 };
    case "crying":
      return { dx: 0, dy: Math.sin(frame * 0.8) * 3.5, rot: Math.sin(frame * 0.3) * 1.2 };
    case "confused":
      return { dx: 0, dy: 0, rot: Math.sin(frame * 0.1) * 2.5 };
    case "smug":
      return { dx: 0, dy: 0, rot: Math.sin(frame * 0.06) * 1 };
    case "worried":
      return { dx: Math.sin(frame * 2) * 1.5, dy: 0, rot: 0 };
    case "sad":
      return { dx: 0, dy: 3, rot: -1 };
    default:
      return { dx: 0, dy: 0, rot: 0 };
  }
}

/** Camera zoom "punch" added at the start of high-energy moods. */
export function cameraPunch(mood: Mood, frame: number): number {
  const amount = mood === "shocked" ? 0.1 : mood === "angry" ? 0.06 : mood === "excited" ? 0.04 : 0;
  return amount * Math.max(0, 1 - frame / 9);
}

/** 0..1 mouth-flap amount while the character is speaking. */
function flap(frame: number): number {
  return Math.min(1, Math.abs(Math.sin(frame * 0.9)) * (0.65 + 0.35 * Math.abs(Math.sin(frame * 0.37))) * 1.1);
}

/** Face parameters (head-local px). Every mood is a point in this space; moods blend by interpolation. */
interface FaceParams {
  lid: number;       // upper-lid cover, 0 open .. 1 shut
  lidTilt: number;   // >0 pushes the inner end of the lid down (angry)
  browY: number;     // brow centre height (more negative = higher)
  browTilt: number;  // inner end higher than outer (worried) when >0, lower (angry) when <0
  browL: number;     // extra raise of the left / right brow
  browR: number;
  browArch: number;  // arch of the brows (surprise)
  curve: number;     // mouth: -1 frown .. +1 smile
  skew: number;      // right mouth corner lift (smirk)
  mouthW: number;
  mouthOpen: number; // resting open amount 0..1
  pupil: number;     // pupil size
  eye: number;       // eye-white scale
  tear: number;      // wet lower lid
  blush: number;
}

const P = (o: Partial<FaceParams>): FaceParams => ({
  lid: 0.05, lidTilt: 0, browY: -30, browTilt: 0, browL: 0, browR: 0, browArch: 0,
  curve: 0, skew: 0, mouthW: 10, mouthOpen: 0, pupil: 1, eye: 1, tear: 0, blush: 0, ...o,
});

const FACE: Record<Mood, FaceParams> = {
  neutral:  P({}),
  happy:    P({ lid: 0, browY: -34, curve: 0.85, mouthW: 18, pupil: 1.05, blush: 0.6 }),
  excited:  P({ lid: 0, browY: -38, browArch: 5, curve: 1, mouthW: 21, mouthOpen: 0.5, pupil: 1.25, eye: 1.1, blush: 0.6 }),
  shocked:  P({ lid: 0, browY: -40, browArch: 6, mouthW: 9, mouthOpen: 1, pupil: 0.5, eye: 1.25 }),
  worried:  P({ lid: 0.18, browY: -28, browTilt: 9, curve: -0.5, mouthW: 14, pupil: 0.95 }),
  sad:      P({ lid: 0.25, browY: -26, browTilt: 10, curve: -0.7, mouthW: 14, pupil: 1.05, tear: 0.5 }),
  crying:   P({ lid: 0.3, browY: -25, browTilt: 13, curve: -1, mouthW: 15, mouthOpen: 0.8, pupil: 1.05, tear: 0.8, blush: 0.6 }),
  angry:    P({ lid: 0.3, lidTilt: 1, browY: -22, browTilt: -13, curve: -0.6, mouthW: 15, pupil: 0.7 }),
  confused: P({ lid: 0.1, browY: -28, browL: 6, browR: -6, curve: -0.15, skew: -4, mouthW: 12 }),
  smug:     P({ lid: 0.5, browY: -24, browR: 10, curve: 0.5, skew: 9, mouthW: 14, blush: 0.4 }),
};

const lerpFace = (a: FaceParams, b: FaceParams, t: number): FaceParams => {
  const out = { ...a };
  (Object.keys(a) as (keyof FaceParams)[]).forEach((k) => { out[k] = a[k] + (b[k] - a[k]) * t; });
  return out;
};

/** Eye-gaze target, -1..1 on each axis (screen space). "auto" = lively saccades. */
export type Look = "auto" | "camera" | "left" | "right" | "up" | "down";

export function gazeAt(look: Look, frame: number, mood: Mood): { x: number; y: number } {
  switch (look) {
    case "camera": return { x: 0, y: 0 };
    case "left": return { x: -1, y: 0.1 };
    case "right": return { x: 1, y: 0.1 };
    case "up": return { x: 0.2, y: -1 };
    case "down": return { x: 0.1, y: 1 };
  }
  // auto: hold a target for ~1.2-2s, then dart to the next one (eases over 4 frames)
  const hold = 40;
  const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const idx = Math.floor(frame / hold);
  const target = (i: number) => ({
    x: (hash(i) - 0.5) * 1.4,
    y: (hash(i + 99) - 0.5) * 0.8 + (mood === "sad" || mood === "crying" ? 0.45 : mood === "smug" ? 0.1 : 0),
  });
  const cur = target(idx);
  const prev = target(idx - 1);
  const k = Math.min(1, (frame - idx * hold) / 4);
  const e = k * k * (3 - 2 * k);
  return { x: prev.x + (cur.x - prev.x) * e, y: prev.y + (cur.y - prev.y) * e };
}

interface FaceProps {
  mood: Mood;
  prevMood?: Mood;
  frame: number;
  theme: Theme;
  accent: string;
  gaze: { x: number; y: number };
  talking: boolean;
  mouthLevel?: number;
}

export const Face: React.FC<FaceProps> = ({ mood, prevMood, frame, theme, accent, gaze, talking, mouthLevel }) => {
  const { fps } = useVideoConfig();
  const ink = theme.ink;
  // expression change: quick spring with a touch of overshoot (the "snap + settle" of hand animation)
  const t = prevMood && prevMood !== mood
    ? spring({ frame, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } })
    : 1;
  const f = lerpFace(FACE[prevMood ?? mood], FACE[mood], t);

  // smooth 5-frame blink every ~3.2s
  const bf = frame % 96;
  const blink = Math.max(0, 1 - Math.abs(bf - 92) / 2.5);
  const lid = Math.min(1, Math.max(f.lid, blink));

  const rx = 11 * f.eye;
  const ry = 13.5 * f.eye;
  const ey = -6;
  const pr = Math.min(rx - 2, 6.6 * f.pupil);
  const maxX = Math.max(0, rx - pr - 1);
  const maxY = Math.max(0, ry - pr - 1);

  const eye = (side: -1 | 1) => {
    const ex = 17 * side;
    const px = ex + gaze.x * maxX;
    const py = ey + gaze.y * maxY;
    const top = ey - ry - 4;
    const chord = ey - ry + lid * 2 * ry;
    // inner end of this eye is the one toward the nose (x -> 0)
    const yInner = chord + f.lidTilt * 5;
    const yOuter = chord - f.lidTilt * 3;
    const xl = ex - rx - 2, xr = ex + rx + 2;
    const yl = side === -1 ? yOuter : yInner;
    const yr = side === -1 ? yInner : yOuter;
    return (
      <g key={side}>
        <ellipse cx={ex} cy={ey} rx={rx} ry={ry} fill="#fff" stroke={ink} strokeWidth={4} />
        <circle cx={px} cy={py} r={pr} fill={ink} stroke="none" />
        <circle cx={px - pr * 0.32} cy={py - pr * 0.34} r={Math.max(1.4, pr * 0.3)} fill="#fff" stroke="none" />
        {f.tear > 0.02 && (
          <path
            d={`M${ex - rx * 0.8},${ey + ry * 0.55} Q${ex},${ey + ry * 1.25} ${ex + rx * 0.8},${ey + ry * 0.55}`}
            stroke="#56d4e8" strokeWidth={3} opacity={Math.min(1, f.tear)} fill="none"
          />
        )}
        {lid > 0.02 && (
          <>
            <path d={`M${xl},${yl} L${xr},${yr} L${xr},${top} L${xl},${top} Z`} fill={theme.bg} stroke="none" />
            <path d={`M${ex - rx},${yl + 1} L${ex + rx},${yr + 1}`} stroke={ink} strokeWidth={4.5} fill="none" />
          </>
        )}
      </g>
    );
  };

  // brows: outer end -> inner end, tilt raises/lowers the inner end
  const browColor = mood === "angry" ? "#e5383b" : accent;
  const browW = mood === "angry" ? 9 : 7;
  const brow = (side: -1 | 1) => {
    const raise = side === -1 ? f.browL : f.browR;
    const oy = f.browY + f.browTilt * 0.5 - raise;
    const iy = f.browY - f.browTilt * 0.5 - raise;
    const ox = 28 * side, ix = 9 * side;
    const cy = (oy + iy) / 2 - f.browArch;
    return <path key={side} d={`M${ox},${oy} Q${(ox + ix) / 2},${cy * 2 - (oy + iy) / 2} ${ix},${iy}`} stroke={browColor} strokeWidth={browW} fill="none" />;
  };

  // mouth: curved lip line; opens by `mouthOpen` plus speech flap
  const my = 21;
  // lip sync: follow the voiceover loudness when available, otherwise the generic flap
  const speech = mouthLevel !== undefined ? mouthLevel : talking ? flap(frame) : 0;
  const open = f.mouthOpen * 13 + speech * (mouthLevel !== undefined ? 13 : 9);
  // a wide-open vowel also narrows the mouth a little ("o"), a closed one stays wide
  const w = f.mouthW * (1 - (mouthLevel !== undefined ? 0.28 * mouthLevel : 0));
  const yl = my - f.curve * 5;
  const yr = yl - f.skew;
  const ctrl = my + f.curve * 16 - f.skew * 0.3;
  const mouthD = open > 2.5
    ? `M${-w},${yl} Q0,${ctrl} ${w},${yr} Q0,${ctrl + open * 1.6} ${-w},${yl} Z`
    : `M${-w},${yl} Q0,${ctrl} ${w},${yr}`;

  return (
    <>
      {f.blush > 0.02 && (
        <>
          <ellipse cx={-33} cy={14} rx={9} ry={5.5} fill={BLUSH} opacity={0.55 * f.blush} />
          <ellipse cx={33} cy={14} rx={9} ry={5.5} fill={BLUSH} opacity={0.55 * f.blush} />
        </>
      )}
      {eye(-1)}
      {eye(1)}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        {brow(-1)}
        {brow(1)}
        <path d={mouthD} stroke={ink} strokeWidth={6} fill={open > 2.5 ? ink : "none"} />
      </g>
    </>
  );
};

const Sparkle: React.FC<{ x: number; y: number; s: number; color: string }> = ({ x, y, s, color }) => (
  <path
    transform={`translate(${x},${y}) scale(${s})`}
    d="M0,-14 Q2,-2 14,0 Q2,2 0,14 Q-2,2 -14,0 Q-2,-2 0,-14 Z"
    fill={color}
  />
);

/** Symbols floating around the head (drawn in head-local coordinates). */
export const HeadExtras: React.FC<{ mood: Mood; frame: number; accent: string; theme: Theme }> = ({ mood, frame, accent, theme }) => {
  const stroke = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (mood) {
    case "angry": {
      const pulse = 1 + Math.sin(frame * 0.6) * 0.14;
      return (
        <g transform={`translate(34,-44) scale(${pulse})`} stroke="#e5383b" strokeWidth={5} {...stroke}>
          <path d="M-9,-3 Q-3,-3 -3,-11 M-9,-3 Q-9,-9 -17,-9 M9,3 Q3,3 3,11 M9,3 Q9,9 17,9" />
        </g>
      );
    }
    case "worried": {
      const drop = ((frame % 40) / 40) * 16;
      return (
        <path
          transform={`translate(46,${-26 + drop})`}
          d="M0,-14 Q11,2 0,10 Q-11,2 0,-14 Z"
          fill={TEAR}
          opacity={1 - ((frame % 40) / 40) * 0.5}
        />
      );
    }
    case "sad":
    case "crying": {
      const streams = mood === "crying" ? [0, 13] : [0];
      return (
        <>
          {[-17, 17].flatMap((x) =>
            streams.map((off) => {
              const t = ((frame + off) % 26) / 26;
              return (
                <path
                  key={`${x}-${off}`}
                  transform={`translate(${x},${4 + t * 52})`}
                  d="M0,-9 Q7,1 0,6 Q-7,1 0,-9 Z"
                  fill={TEAR}
                  opacity={mood === "crying" ? 1 - t * 0.4 : (1 - t) * 0.9}
                />
              );
            }),
          )}
        </>
      );
    }
    case "excited": {
      const a = 1 + Math.sin(frame * 0.4) * 0.25;
      const b = 1 + Math.sin(frame * 0.4 + 2) * 0.25;
      return (
        <>
          <Sparkle x={-56} y={-46} s={a} color={accent} />
          <Sparkle x={58} y={-38} s={b * 0.8} color="#ffc300" />
          <Sparkle x={0} y={-82} s={a * 0.6} color="#ffc300" />
        </>
      );
    }
    case "confused": {
      const bob = Math.sin(frame * 0.15) * 4;
      return (
        <text
          x={36}
          y={-62 + bob}
          fontSize={64}
          fontWeight={900}
          fontFamily="Montserrat, sans-serif"
          fill={accent}
          stroke={theme.bg}
          strokeWidth={8}
          paintOrder="stroke"
          transform="rotate(14 36 -62)"
        >
          ?
        </text>
      );
    }
    case "shocked": {
      const flash = Math.min(1, 0.55 + Math.sin(frame * 0.7) * 0.45);
      return (
        <g stroke={accent} strokeWidth={6} opacity={flash} {...stroke}>
          <path d="M0,-66 L0,-90" />
          <path d="M-30,-58 L-42,-80" />
          <path d="M30,-58 L42,-80" />
        </g>
      );
    }
    case "smug": {
      const glint = Math.max(0, Math.sin(frame * 0.12));
      return <Sparkle x={26} y={-30} s={glint * 0.7} color="#ffc300" />;
    }
    default:
      return null;
  }
};

/** Full-frame mood overlay (tint, vignette, flash, confetti). `w`/`h` are world units. */
export const ScreenFx: React.FC<{ mood: Mood; frame: number; w: number; h: number; accent: string }> = ({ mood, frame, w, h, accent }) => {
  switch (mood) {
    case "angry": {
      const o = 0.16 + Math.sin(frame * 0.5) * 0.06;
      return (
        <>
          <defs>
            <radialGradient id="fx-angry" cx="50%" cy="50%" r="75%">
              <stop offset="55%" stopColor="#e5383b" stopOpacity={0} />
              <stop offset="100%" stopColor="#e5383b" stopOpacity={1} />
            </radialGradient>
          </defs>
          <rect width={w} height={h} fill="url(#fx-angry)" opacity={o * 2.2} pointerEvents="none" />
        </>
      );
    }
    case "sad":
    case "crying":
      return <rect width={w} height={h} fill="#35508f" opacity={mood === "crying" ? 0.16 : 0.1} />;
    case "worried":
      return <rect width={w} height={h} fill="#222" opacity={0.05} />;
    case "shocked": {
      const o = interpolate(frame, [0, 6], [0.7, 0], { extrapolateRight: "clamp" });
      return o > 0 ? <rect width={w} height={h} fill="#fff" opacity={o} /> : null;
    }
    case "excited": {
      const colors = [accent, "#ffc300", "#ff4d8d", "#2ec4b6"];
      return (
        <>
          {Array.from({ length: 26 }, (_, i) => {
            const seed = (i * 9301 + 49297) % 233280;
            const r1 = seed / 233280;
            const r2 = ((i * 7919) % 1000) / 1000;
            const speed = 5 + r2 * 5;
            const y = ((frame * speed + r1 * h * 1.3) % (h + 80)) - 40;
            const x = r2 * w + Math.sin(frame * 0.06 + i) * 26;
            return (
              <rect
                key={i}
                x={-7}
                y={-4}
                width={14}
                height={8}
                fill={colors[i % colors.length]}
                transform={`translate(${x},${y}) rotate(${frame * (4 + (i % 5)) + i * 40})`}
              />
            );
          })}
        </>
      );
    }
    default:
      return null;
  }
};
