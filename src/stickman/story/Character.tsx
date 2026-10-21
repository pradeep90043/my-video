import React from "react";
import type { CastMember, CharMood, CharPose } from "./cast";

/**
 * A flat-vector storyboard character. Origin = the point between the feet; the body grows upwards (negative y).
 * An adult is ~580 units tall; children are drawn smaller with a bigger head. Everything that moves is driven by `frame`.
 */
interface Props {
  member: CastMember;
  pose: CharPose;
  mood: CharMood;
  frame: number;
  talking: boolean;
  /** 0..1 loudness of the spoken line (lip-sync); undefined = generic flap */
  mouthLevel?: number;
  flip?: boolean;
}

const OUT = "#2B2B2B";
const shade = (hex: string, k: number): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
};

interface PoseSpec { rt: number; rf: number; lt: number; lf: number; tilt: number; lean: number; headDrop: number }
const POSES: Record<CharPose, PoseSpec> = {
  stand: { rt: 8, rf: 10, lt: 8, lf: 10, tilt: 0, lean: 0, headDrop: 0 },
  talk: { rt: 40, rf: 75, lt: 8, lf: 10, tilt: 0, lean: 0, headDrop: 0 },
  point: { rt: 98, rf: 4, lt: 8, lf: 10, tilt: 0, lean: 3, headDrop: 0 },
  wave: { rt: 150, rf: 20, lt: 8, lf: 10, tilt: 3, lean: 0, headDrop: 0 },
  sad: { rt: 4, rf: 6, lt: 4, lf: 6, tilt: -4, lean: 4, headDrop: 14 },
  happy: { rt: 150, rf: 8, lt: 150, lf: 8, tilt: 0, lean: 0, headDrop: 0 },
  angry: { rt: 30, rf: 115, lt: 30, lf: 115, tilt: 0, lean: 3, headDrop: 0 },
  scared: { rt: 38, rf: 135, lt: 38, lf: 135, tilt: 0, lean: -5, headDrop: 0 },
  walk: { rt: 25, rf: 10, lt: 25, lf: 10, tilt: 0, lean: 2, headDrop: 0 },
  think: { rt: 8, rf: 10, lt: 35, lf: 150, tilt: 5, lean: 0, headDrop: 4 },
  bow: { rt: 6, rf: 8, lt: 6, lf: 8, tilt: 0, lean: 24, headDrop: 10 },
};

export const Character: React.FC<Props> = ({ member: m, pose, mood, frame, talking, mouthLevel, flip }) => {
  const child = m.age === "child", teen = m.age === "teen", elder = m.age === "elder";
  const bodyK = child ? 0.62 : teen ? 0.86 : 1;
  const headK = child ? 1.22 : teen ? 1.08 : 1;
  const P = POSES[pose];
  const breathe = Math.sin(frame * 0.09) * 3;
  const swing = pose === "walk" ? Math.sin(frame * 0.32) : 0;
  const talkSwing = pose === "talk" || (talking && pose === "stand") ? Math.sin(frame * 0.27) : 0;
  const waveSwing = pose === "wave" ? Math.sin(frame * 0.45) : 0;
  const hop = pose === "happy" ? -Math.abs(Math.sin(frame * 0.2)) * 22 : 0;
  const lean = P.lean + (elder ? 5 : 0);

  const rArm = { t: P.rt + talkSwing * 14 + waveSwing * 18 - swing * 28, f: P.rf + talkSwing * 12 };
  const lArm = { t: P.lt + (pose === "angry" || pose === "scared" ? 0 : swing * 28), f: P.lf };

  // face
  const blink = frame % 120 > 114 ? 0.1 : 1;
  const skin = m.skin, skinD = shade(skin, 0.86);
  const cx = 0, cy = -510, R = 64 * headK;
  const eyeY = cy - 6 * headK, eyeX = 23 * headK;
  const wide = mood === "scared" || mood === "surprised";
  const open = talking ? Math.min(1, (mouthLevel ?? 0.45 + 0.45 * Math.abs(Math.sin(frame * 0.5))) * 1.6) : mood === "laugh" ? 0.8 : mood === "surprised" ? 0.9 : mood === "scared" ? 0.5 : 0;
  const mY = cy + 26 * headK;
  const mouth = (() => {
    if (open > 0.15) return <ellipse cx={cx} cy={mY + 2} rx={11 * headK + open * 3} ry={3 + open * 11} fill="#7A1F2B" stroke={OUT} strokeWidth={2.5} />;
    switch (mood) {
      case "happy": return <path d={`M${cx - 15},${mY - 2} Q${cx},${mY + 14} ${cx + 15},${mY - 2}`} fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />;
      case "sad": case "worried": return <path d={`M${cx - 13},${mY + 8} Q${cx},${mY - 6} ${cx + 13},${mY + 8}`} fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />;
      case "angry": return <path d={`M${cx - 13},${mY + 6} L${cx + 13},${mY + 6}`} stroke={OUT} strokeWidth={4} strokeLinecap="round" />;
      default: return <path d={`M${cx - 11},${mY + 2} Q${cx},${mY + 7} ${cx + 11},${mY + 2}`} fill="none" stroke={OUT} strokeWidth={3.2} strokeLinecap="round" />;
    }
  })();
  const browDy = mood === "surprised" || mood === "scared" ? -9 : mood === "sad" || mood === "worried" ? -2 : 0;
  const browTilt = mood === "angry" ? 10 : mood === "sad" || mood === "worried" ? -9 : 0; // + = inner end down
  const brow = (s: number) => (
    <line x1={cx + s * (eyeX - 13)} y1={eyeY - 18 * headK + browDy + s * 0 + browTilt * (s < 0 ? 0.0 : 0) - (s * -browTilt * 0.5) * 0}
      x2={cx + s * (eyeX + 13)} y2={eyeY - 18 * headK + browDy + (s > 0 ? 1 : 1) * 0} stroke={shade(m.hairColor, 0.9)} strokeWidth={5} strokeLinecap="round"
      transform={`rotate(${s * browTilt} ${cx + s * eyeX} ${eyeY - 18 * headK + browDy})`} />
  );
  const eye = (s: number) => (
    <g key={s}>
      <ellipse cx={cx + s * eyeX} cy={eyeY} rx={wide ? 12 : 10.5} ry={(wide ? 14 : 11.5) * blink} fill="#fff" stroke={OUT} strokeWidth={2.2} />
      <circle cx={cx + s * eyeX + 1} cy={eyeY + 1} r={wide ? 4.2 : 5.2} fill="#1d1d1d" opacity={blink > 0.5 ? 1 : 0} />
    </g>
  );

  // hair (back layer + front layer)
  const hc = m.hairColor, hcD = shade(hc, 0.8);
  const hairBack = (() => {
    if (m.hair === "long") return <path d={`M${cx - R - 6},${cy} Q${cx - R - 14},${cy + 120} ${cx - R + 6},${cy + 170} L${cx + R - 6},${cy + 170} Q${cx + R + 14},${cy + 120} ${cx + R + 6},${cy} Z`} fill={hc} stroke={OUT} strokeWidth={3} />;
    if (m.hair === "ponytail") return <path d={`M${cx + R - 12},${cy - 30} Q${cx + R + 70},${cy - 10} ${cx + R + 38},${cy + 90} Q${cx + R + 14},${cy + 30} ${cx + R - 14},${cy + 10} Z`} fill={hc} stroke={OUT} strokeWidth={3} />;
    return null;
  })();
  const hairFront = (() => {
    const cap = (h: number) => `M${cx - R - 3},${cy - 6} Q${cx - R - 6},${cy - R - h} ${cx},${cy - R - h + 4} Q${cx + R + 6},${cy - R - h} ${cx + R + 3},${cy - 6} Q${cx + R - 18},${cy - 38} ${cx},${cy - 34} Q${cx - R + 18},${cy - 38} ${cx - R - 3},${cy - 6} Z`;
    switch (m.hair) {
      case "bald": return elder ? (<g><path d={`M${cx - R - 2},${cy - 4} Q${cx - R - 12},${cy + 20} ${cx - R + 6},${cy + 30} L${cx - R + 12},${cy - 6} Z`} fill={hc} /><path d={`M${cx + R + 2},${cy - 4} Q${cx + R + 12},${cy + 20} ${cx + R - 6},${cy + 30} L${cx + R - 12},${cy - 6} Z`} fill={hc} /></g>) : null;
      case "turban": return (<g><path d={`M${cx - R - 8},${cy - 16} Q${cx - R - 6},${cy - R - 40} ${cx},${cy - R - 46} Q${cx + R + 6},${cy - R - 40} ${cx + R + 8},${cy - 16} Q${cx},${cy - 40} ${cx - R - 8},${cy - 16} Z`} fill={m.color2 ?? "#E67E22"} stroke={OUT} strokeWidth={3} />
        <path d={`M${cx - R},${cy - 30} Q${cx},${cy - 70} ${cx + R},${cy - 30}`} fill="none" stroke={shade(m.color2 ?? "#E67E22", 0.75)} strokeWidth={4} /></g>);
      case "cap": return (<g><path d={cap(26)} fill={m.color2 ?? "#2D3436"} stroke={OUT} strokeWidth={3} /><path d={`M${cx - 6},${cy - 42} Q${cx + R + 30},${cy - 36} ${cx + R + 36},${cy - 22} L${cx + 8},${cy - 26} Z`} fill={shade(m.color2 ?? "#2D3436", 0.8)} stroke={OUT} strokeWidth={3} /></g>);
      case "curly": return (<g fill={hc} stroke={OUT} strokeWidth={3}>{[-50, -26, 0, 26, 50].map((x, i) => <circle key={i} cx={cx + x} cy={cy - 40 - (i % 2) * 8 - (i === 2 ? 14 : 0)} r={24} />)}</g>);
      case "bun": return (<g><circle cx={cx} cy={cy - R - 22} r={24} fill={hc} stroke={OUT} strokeWidth={3} /><path d={cap(6)} fill={hc} stroke={OUT} strokeWidth={3} /></g>);
      case "side": return (<g><path d={cap(10)} fill={hc} stroke={OUT} strokeWidth={3} /><path d={`M${cx - R},${cy - 24} Q${cx - 10},${cy - 62} ${cx + R - 4},${cy - 30} Q${cx},${cy - 34} ${cx - R},${cy - 24} Z`} fill={hcD} /></g>);
      case "long": case "ponytail": case "short": default: return <path d={cap(m.hair === "short" ? 8 : 12)} fill={hc} stroke={OUT} strokeWidth={3} />;
    }
  })();

  // clothes
  const c1 = m.color, c2 = m.color2 ?? "#2D3436";
  const hip = -250, sh = -418;
  const shoulderW = m.outfit === "dress" || m.outfit === "saree" ? 48 : 54;
  const legs = (() => {
    const longBottom = m.outfit === "saree" || m.outfit === "dress";
    const lx = -26, rx = 26;
    const L = (x: number, k: number) => (
      <g transform={`translate(${x},${hip}) rotate(${k * swing * 18})`}>
        <rect x={-15} y={0} width={30} height={236} rx={12} fill={longBottom ? skin : m.outfit === "kurta" || m.outfit === "dhoti" ? (m.outfit === "dhoti" ? "#F5F1E6" : c2) : c2} stroke={OUT} strokeWidth={3} />
        <ellipse cx={0} cy={246} rx={28} ry={13} fill={shade(c2, 0.55)} stroke={OUT} strokeWidth={3} />
      </g>
    );
    return <g>{L(lx, 1)}{L(rx, -1)}</g>;
  })();
  const torso = (() => {
    const top = sh, w = shoulderW;
    switch (m.outfit) {
      case "saree": return (<g>
        <path d={`M${-w},${top} L${w},${top} L${w + 16},${-30} L${-w - 16},${-30} Z`} fill={c1} stroke={OUT} strokeWidth={3} />
        <path d={`M${-w + 6},${top} L${w - 4},${top + 6} L${-4},${-90} L${-w - 10},${-120} Z`} fill={c2} stroke={OUT} strokeWidth={3} opacity={0.95} />
        {[0, 1, 2, 3].map((i) => <line key={i} x1={-w - 10 + i * 24} y1={-80} x2={-w - 6 + i * 25} y2={-34} stroke={shade(c1, 0.8)} strokeWidth={3} />)}
      </g>);
      case "dress": return (<g><path d={`M${-w},${top} L${w},${top} L${w + 52},${-130} L${-w - 52},${-130} Z`} fill={c1} stroke={OUT} strokeWidth={3} /><rect x={-w + 8} y={top + 78} width={(w - 8) * 2} height={12} fill={c2} /></g>);
      case "kurta": return (<g><path d={`M${-w},${top} L${w},${top} L${w + 14},${-150} L${-w - 14},${-150} Z`} fill={c1} stroke={OUT} strokeWidth={3} /><line x1={0} y1={top} x2={0} y2={top + 70} stroke={shade(c1, 0.7)} strokeWidth={4} /><circle cx={0} cy={top + 20} r={4} fill={shade(c1, 0.6)} /></g>);
      case "dhoti": return (<g><path d={`M${-w},${top} L${w},${top} L${w + 8},${-200} L${-w - 8},${-200} Z`} fill={c1} stroke={OUT} strokeWidth={3} /><path d={`M${-w - 6},${-210} L${w + 6},${-210} L${w + 14},${-60} L${-w - 14},${-60} Z`} fill="#F5F1E6" stroke={OUT} strokeWidth={3} /></g>);
      case "uniform": return (<g><path d={`M${-w},${top} L${w},${top} L${w + 8},${hip + 6} L${-w - 8},${hip + 6} Z`} fill="#F4F6F7" stroke={OUT} strokeWidth={3} /><path d={`M-12,${top} L0,${top + 36} L12,${top} Z`} fill={c1} /><line x1={0} y1={top + 36} x2={0} y2={top + 120} stroke={c1} strokeWidth={9} /></g>);
      case "suit": return (<g><path d={`M${-w - 2},${top} L${w + 2},${top} L${w + 10},${hip + 10} L${-w - 10},${hip + 10} Z`} fill={c1} stroke={OUT} strokeWidth={3} /><path d={`M-14,${top} L0,${top + 70} L14,${top} Z`} fill="#fff" /><path d={`M0,${top + 8} L-6,${top + 24} L0,${top + 98} L6,${top + 24} Z`} fill="#C0392B" /></g>);
      case "hoodie": return (<g><path d={`M${-w - 2},${top} L${w + 2},${top} L${w + 12},${hip + 16} L${-w - 12},${hip + 16} Z`} fill={c1} stroke={OUT} strokeWidth={3} /><path d={`M-34,${top} Q0,${top - 26} 34,${top} Q0,${top + 18} -34,${top} Z`} fill={shade(c1, 0.8)} stroke={OUT} strokeWidth={3} /><rect x={-26} y={top + 92} width={52} height={42} rx={8} fill={shade(c1, 0.85)} /></g>);
      case "shirt": default: return (<g><path d={`M${-w},${top} L${w},${top} L${w + 8},${hip + 6} L${-w - 8},${hip + 6} Z`} fill={c1} stroke={OUT} strokeWidth={3} /><path d={`M-14,${top} L0,${top + 22} L14,${top} Z`} fill={shade(c1, 0.75)} /></g>);
    }
  })();
  const sleeve = m.outfit === "hoodie" || m.outfit === "suit" || m.outfit === "uniform" || m.outfit === "kurta" || m.outfit === "shirt" || m.outfit === "dhoti";
  const sleeveColor = m.outfit === "uniform" ? "#F4F6F7" : m.outfit === "saree" ? c1 : c1;
  const arm = (side: 1 | -1, a: { t: number; f: number }) => (
    <g transform={`translate(${side * shoulderW},${sh + 10}) rotate(${-side * a.t})`}>
      <rect x={-12} y={-6} width={24} height={86} rx={12} fill={sleeve ? sleeveColor : skin} stroke={OUT} strokeWidth={3} />
      <g transform={`translate(0,78) rotate(${side * a.f})`}>
        <rect x={-10.5} y={-6} width={21} height={80} rx={10.5} fill={sleeve && m.outfit !== "shirt" ? sleeveColor : skin} stroke={OUT} strokeWidth={3} />
        <circle cx={0} cy={78} r={14} fill={skin} stroke={OUT} strokeWidth={3} />
      </g>
    </g>
  );

  return (
    <g transform={`scale(${(flip ? -1 : 1) * bodyK},${bodyK}) translate(0,${hop})`}>
      <ellipse cx={0} cy={6} rx={78} ry={12} fill="#000" opacity={0.18} />
      <g transform={`translate(0,${breathe * 0.4})`}>
        {legs}
        <g transform={`rotate(${P.lean + (elder ? 4 : 0)} 0 ${hip}) rotate(${lean - P.lean} 0 ${hip})`}>
          {hairBack && <g transform={`rotate(${P.tilt} 0 -450)`}>{hairBack}</g>}
          {arm(-1, lArm)}
          {torso}
          <rect x={-14} y={-452} width={28} height={40} rx={10} fill={skinD} stroke={OUT} strokeWidth={3} />
          <g transform={`translate(0,${P.headDrop + breathe * 0.3}) rotate(${P.tilt} 0 -450)`}>
            <circle cx={cx} cy={cy} r={R} fill={skin} stroke={OUT} strokeWidth={3.5} />
            <ellipse cx={cx - R + 2} cy={cy + 8} rx={9} ry={14} fill={skinD} stroke={OUT} strokeWidth={3} />
            <ellipse cx={cx + R - 2} cy={cy + 8} rx={9} ry={14} fill={skinD} stroke={OUT} strokeWidth={3} />
            {m.beard && <path d={`M${cx - R + 6},${cy + 10} Q${cx},${cy + R + 40} ${cx + R - 6},${cy + 10} Q${cx},${cy + 28} ${cx - R + 6},${cy + 10} Z`} fill={elder ? "#D5D8DC" : hc} stroke={OUT} strokeWidth={3} />}
            {eye(-1)}{eye(1)}
            {brow(-1)}{brow(1)}
            {m.glasses && (<g fill="none" stroke={OUT} strokeWidth={3.5}><circle cx={cx - eyeX} cy={eyeY} r={17} /><circle cx={cx + eyeX} cy={eyeY} r={17} /><line x1={cx - eyeX + 17} y1={eyeY} x2={cx + eyeX - 17} y2={eyeY} /></g>)}
            <path d={`M${cx},${cy + 2} q-4,12 4,14`} fill="none" stroke={skinD} strokeWidth={3} strokeLinecap="round" />
            {mouth}
            {m.bindi && <circle cx={cx} cy={cy - 24 * headK} r={4.5} fill="#C0392B" />}
            {mood === "sad" && <path d={`M${cx - eyeX - 4},${eyeY + 14} q-3,16 0,24 q4,-6 4,-16 z`} fill="#7EC8E3" opacity={0.8 + 0.2 * Math.sin(frame * 0.2)} />}
            {mood === "angry" && <circle cx={cx + R - 6} cy={cy - R + 10} r={5} fill="#E74C3C" opacity={0.7} />}
            {hairFront}
          </g>
          {arm(1, rArm)}
        </g>
      </g>
    </g>
  );
};

export const CHARACTER_HEIGHT = 590;
