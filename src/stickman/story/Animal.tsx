import React from "react";
import type { CastMember, CharMood, CharPose } from "./cast";
import { StoryPropArt, type StoryPropName } from "./StoryProps";

/**
 * Animal characters drawn as animals: a side-view four-legged body that walks, runs, grazes, sleeps, howls and shakes its head.
 * Origin = between the feet on the ground, facing right (flip mirrors). The same props as Character.tsx.
 */
const OUT = "#2B2B2B";
const shade = (hex: string, k: number): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
};

interface Spec {
  leg: number; bw: number; bh: number; hr: number; neck: number; size: number;
  snout: [number, number]; ears: "point" | "round" | "floppy" | "long" | "big" | "none"; tail: "bush" | "thin" | "tuft" | "up" | "puff" | "short" | "none";
  extra?: "mane" | "stripes" | "spots" | "horns" | "wide-horns" | "antlers" | "trunk" | "beard" | "whiskers" | "stand-ears";
}
const SPECS: Record<string, Spec> = {
  wolf: { leg: 83, bw: 150, bh: 62, hr: 46, neck: 30, size: 1, snout: [50, 26], ears: "point", tail: "bush" },
  fox: { leg: 70, bw: 128, bh: 52, hr: 42, neck: 26, size: 0.9, snout: [48, 22], ears: "point", tail: "bush" },
  lion: { leg: 86, bw: 156, bh: 70, hr: 48, neck: 30, size: 1.12, snout: [34, 28], ears: "round", tail: "tuft", extra: "mane" },
  tiger: { leg: 83, bw: 156, bh: 66, hr: 48, neck: 30, size: 1.1, snout: [36, 28], ears: "round", tail: "thin", extra: "stripes" },
  dog: { leg: 73, bw: 134, bh: 56, hr: 44, neck: 28, size: 0.95, snout: [42, 25], ears: "floppy", tail: "up" },
  cat: { leg: 62, bw: 108, bh: 46, hr: 40, neck: 22, size: 0.78, snout: [26, 20], ears: "point", tail: "up", extra: "whiskers" },
  rabbit: { leg: 50, bw: 82, bh: 54, hr: 36, neck: 16, size: 0.6, snout: [22, 20], ears: "long", tail: "puff" },
  bear: { leg: 74, bw: 150, bh: 82, hr: 50, neck: 24, size: 1.15, snout: [40, 30], ears: "round", tail: "short" },
  elephant: { leg: 102, bw: 190, bh: 98, hr: 62, neck: 36, size: 1.5, snout: [0, 0], ears: "big", tail: "thin", extra: "trunk" },
  deer: { leg: 111, bw: 118, bh: 48, hr: 34, neck: 70, size: 1.1, snout: [38, 20], ears: "point", tail: "short", extra: "antlers" },
  goat: { leg: 67, bw: 100, bh: 48, hr: 36, neck: 30, size: 0.85, snout: [32, 22], ears: "floppy", tail: "short", extra: "beard" },
  buffalo: { leg: 74, bw: 168, bh: 86, hr: 52, neck: 26, size: 1.25, snout: [44, 34], ears: "floppy", tail: "thin", extra: "wide-horns" },
  crow: { leg: 50, bw: 54, bh: 34, hr: 22, neck: 20, size: 0.8, snout: [30, 14], ears: "none", tail: "short" },
  cow: { leg: 73, bw: 160, bh: 80, hr: 50, neck: 26, size: 1.15, snout: [44, 32], ears: "floppy", tail: "thin", extra: "spots" },
};

/** how tall an animal stands, as a fraction of a person (for scaling on stage and for name tags) */
export const animalHeight = (species: string): number => {
  const s = SPECS[species] ?? SPECS.wolf;
  return (s.leg + s.bh * 2 + s.neck + s.hr) * s.size;
};
export const ANIMAL_SIZE = (species: string): number => (SPECS[species]?.size ?? 1);

interface Props {
  member: CastMember;
  pose: CharPose;
  mood: CharMood;
  frame: number;
  talking: boolean;
  mouthLevel?: number;
  energy?: number;
  /** a short head movement answering someone: "no" shakes the head, "yes" nods */
  react?: string;
  holds?: StoryPropName;
  envelope?: number;
}


/** A crow drawn as a bird: oval body, flapping wing, thin legs that hop and walk, a beak that opens, a head that pecks, droops or cocks. Origin between the feet, facing right. */
const CrowBird: React.FC<Props> = ({ member: m, pose, mood, frame, talking, mouthLevel, react, holds }) => {
  const fur = m.skin, furD = shade(fur, 0.7), furL = shade(fur, 1.5);
  const sinf = (k: number) => Math.sin(frame * k);
  const flying = pose === "jump" || pose === "dance" || pose === "run";
  const gait = pose === "walk" ? 0.32 : pose === "run" ? 0.6 : 0;
  const swing = gait ? Math.sin(frame * gait) : 0;
  const hopY = (pose === "jump" || pose === "dance" ? Math.abs(sinf(0.3)) * 70 : pose === "happy" ? Math.abs(sinf(0.3)) * 16 : pose === "walk" ? Math.abs(sinf(0.32)) * 5 : 0) + (react === "surprise" ? Math.max(0, 1 - (frame % 90) / 14) * 26 : 0);
  const lying = pose === "sleep";
  const shake = pose === "struggle" ? sinf(1.2) * 8 : pose === "scared" ? sinf(1.6) * 3 : 0;
  let headA = 0; // + = head down (peck, sad)
  if (pose === "eat") headA = 55 + Math.max(0, sinf(0.45)) * 20;
  else if (pose === "sad" || pose === "cry" || pose === "tired") headA = 28;
  else if (pose === "shout" || pose === "wave") headA = -26 + (talking || pose === "shout" ? sinf(0.4) * 5 : 0);
  else if (pose === "think") headA = -12 + sinf(0.05) * 4;
  else if (pose === "struggle") headA = sinf(1.0) * 24;
  else if (pose === "bow" || pose === "pray") headA = 38;
  else if (pose === "push" || pose === "carry" || pose === "give") headA = 22;
  if (lying) headA = 62;
  const rf = react ? frame % 90 : 999, rAmt = react ? Math.max(0, 1 - rf / 70) : 0;
  const tilt = (react === "no" ? Math.sin(frame * 0.6) * 18 * rAmt : 0) + (react === "yes" ? Math.sin(frame * 0.5) * 14 * rAmt : 0) + (pose === "think" ? -14 : 0);
  const open = pose === "shout" ? 1 : talking ? Math.min(1, (mouthLevel ?? 0.5) * 1.5) : pose === "struggle" ? 0.5 : pose === "eat" ? Math.max(0, sinf(0.45)) * 0.7 : mood === "laugh" ? 0.8 : 0;
  const blink = lying || frame % 120 > 113 ? 0.12 : 1;
  const flapOn = flying || pose === "struggle" || pose === "shout" || pose === "scared" || (pose === "happy" && mood === "happy");
  const flap = flapOn ? sinf(pose === "scared" ? 1.3 : 0.7) * 40 : sinf(0.09) * 2;
  const bodyY = -62 + (lying ? 30 : 0) - hopY + sinf(0.1) * 1.2;
  const legA = flying ? 25 : swing * 28;
  const legs = [-1, 1].map((d) => (
    <g key={d} transform={`translate(${d * 10 - 2},${bodyY + 28}) rotate(${legA * d})`}>
      <line x1={0} y1={0} x2={0} y2={Math.max(10, -bodyY - 26)} stroke={OUT} strokeWidth={9} strokeLinecap="round" />
      <line x1={0} y1={0} x2={0} y2={Math.max(10, -bodyY - 26)} stroke="#555" strokeWidth={4.5} strokeLinecap="round" />
      <path d={`M-10,${Math.max(10, -bodyY - 26)} L9,${Math.max(10, -bodyY - 26)} M9,${Math.max(10, -bodyY - 26)} l7,2`} stroke="#555" strokeWidth={5} strokeLinecap="round" fill="none" />
    </g>
  ));
  const nx = 30, ny = bodyY - 24; // neck base (head pivot)
  const hx = nx + 20, hy = ny - 34, HR = 23;
  const jaw = open * 16;
  const head = (
    <g transform={`rotate(${headA + tilt * 0.4} ${nx} ${ny})`}>
      <path d={`M${nx - 22},${ny + 24} Q${nx - 4},${ny - 24} ${hx - 14},${hy + 4} L${hx + 10},${hy + 18} Q${nx + 22},${ny + 10} ${nx + 14},${ny + 34} Z`} fill={fur} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
      <circle cx={hx} cy={hy} r={HR} fill={fur} stroke={OUT} strokeWidth={3.5} />
      <path d={`M${hx - 18},${hy - 10} Q${hx - 6},${hy - 26} ${hx + 8},${hy - 20}`} fill="none" stroke={furL} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
      {/* beak: upper, lower (opens) */}
      <path d={`M${hx + 16},${hy - 12} Q${hx + 52},${hy - 10} ${hx + 58},${hy + 4} Q${hx + 40},${hy + 2} ${hx + 16},${hy + 4} Z`} fill="#3A3A3E" stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
      {jaw > 1.5 && <path d={`M${hx + 16},${hy + 4} L${hx + 46},${hy + 5 + jaw * 0.6} L${hx + 18},${hy + 14 + jaw}Z`} fill="#7A1F2B" stroke={OUT} strokeWidth={3} strokeLinejoin="round" />}
      <path d={`M${hx + 16},${hy + 5} Q${hx + 40},${hy + 8 + jaw} ${hx + 50},${hy + 5 + jaw * 0.6}`} fill="none" stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />
      <ellipse cx={hx + 6} cy={hy - 6} rx={8} ry={9 * blink} fill="#fff" stroke={OUT} strokeWidth={2.2} />
      <circle cx={hx + 8} cy={hy - 5} r={4} fill="#111" opacity={blink > 0.5 ? 1 : 0} />
      <line x1={hx - 4} y1={hy - 18 + (mood === "sad" || mood === "worried" ? 3 : 0)} x2={hx + 16} y2={hy - 17 + (mood === "angry" ? 7 : mood === "sad" || mood === "worried" ? -3 : 0)} stroke={furL} strokeWidth={4} strokeLinecap="round" />
      {mood === "sad" && <path d={`M${hx + 8},${hy + 2} q-3,13 0,20 q4,-5 4,-13 z`} fill="#7EC8E3" opacity={0.85} />}
      {(pose === "struggle" || pose === "tired") && <path d={`M${hx - 8},${hy - HR - 4} q-5,11 0,18 q5,-7 0,-18 z`} fill="#7EC8E3" opacity={0.85} />}
      {holds && <g transform={`translate(${hx + 54},${hy + 22}) scale(0.22)`}><StoryPropArt type={holds} frame={frame} /></g>}
    </g>
  );
  return (
    <g transform={`translate(${shake},0)`}>
      <ellipse cx={0} cy={6} rx={46} ry={8} fill="#000" opacity={0.18} transform={`scale(${1 - hopY / 260},1)`} />
      {legs}
      {/* tail feathers */}
      <path d={`M-44,${bodyY - 4} L-96,${bodyY + 8 + sinf(0.12) * 3} L-92,${bodyY + 24} L-40,${bodyY + 20} Z`} fill={furD} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
      <ellipse cx={0} cy={bodyY} rx={56} ry={36} fill={fur} stroke={OUT} strokeWidth={3.5} transform={`rotate(-14 0 ${bodyY})`} />
      <ellipse cx={8} cy={bodyY + 14} rx={36} ry={16} fill={furL} opacity={0.35} />
      {head}
      {/* wing */}
      <g transform={`translate(-6,${bodyY - 8}) rotate(${flapOn ? -30 - flap : 4 + flap * 0.5})`}>
        <path d="M24,0 Q-6,-30 -56,-12 Q-72,0 -78,22 Q-40,18 -20,26 Q4,24 24,0 Z" fill={furD} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
        <path d="M-20,2 L-58,6 M-14,12 L-52,18" stroke={furL} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
      </g>
      {lying && <text x={40} y={bodyY - 60} fontSize={56} fontWeight={900} fill="#5DADE2" fontFamily="sans-serif" opacity={0.5 + 0.5 * sinf(0.1)}>Zz</text>}
    </g>
  );
};

export const AnimalCharacter: React.FC<Props> = (props) => {
  if (props.member.species === "crow") return <CrowBird {...props} />;
  return <FourLegged {...props} />;
};

const FourLegged: React.FC<Props> = ({ member: m, pose, mood, frame, talking, mouthLevel, energy = 0, react, holds, envelope = 1 }) => {
  const sp = SPECS[m.species ?? "wolf"] ?? SPECS.wolf;
  const fur = m.skin, furD = shade(fur, 0.68), furL = shade(fur, 1.22);
  const { leg: L, bw: BW, bh: BH, hr: HR } = sp;
  const sinf = (k: number) => Math.sin(frame * k);

  // ---- motion per pose
  const gait = pose === "walk" ? 0.3 : pose === "run" ? 0.55 : pose === "jump" || pose === "dance" ? 0.4 : 0;
  const swing = gait ? Math.sin(frame * gait) : 0;
  const amp = pose === "run" ? 38 : pose === "walk" ? 22 : 0;
  const bounce = (pose === "run" ? Math.abs(sinf(0.55)) * 10 : pose === "walk" ? Math.abs(sinf(0.3)) * 4 : 0) + (pose === "jump" || pose === "dance" ? Math.abs(sinf(0.3)) * 60 : 0) + (pose === "happy" ? Math.abs(sinf(0.25)) * 18 : 0);
  const shake = pose === "struggle" ? sinf(1.2) * 9 : pose === "scared" ? sinf(1.6) * 3 : 0;
  const lying = pose === "sleep";
  let headA = 0; // + = head down
  if (pose === "eat") headA = 38 + sinf(0.4) * 6;
  else if (pose === "sad" || pose === "cry" || pose === "tired") headA = 26 + (pose === "cry" ? sinf(0.8) * 3 : 0);
  else if (pose === "shout" || pose === "wave") headA = -34 + (talking || pose === "shout" ? sinf(0.4) * 4 : 0);
  else if (pose === "struggle") headA = sinf(1.0) * 30;
  else if (pose === "angry" || pose === "fight" || pose === "point") headA = 14 + (pose === "fight" ? sinf(0.6) * 10 : 0);
  else if (pose === "think" || pose === "pray") headA = 10;
  else if (pose === "bow") headA = 30;
  else if (pose === "scared") headA = 18;
  if (lying) headA = 22;
  // reactions: "no" = head shaken, "yes" = nodded, "shrug"/"surprise"/"laugh" = small body movements
  const rf = react ? frame % 90 : 999;
  const rAmt = react ? Math.max(0, 1 - rf / 70) : 0;
  const noShake = react === "no" ? Math.sin(frame * 0.6) * 18 * rAmt : 0;
  const yesNod = react === "yes" ? Math.sin(frame * 0.5) * 16 * rAmt : 0;
  const hop = react === "surprise" ? -Math.max(0, 1 - rf / 14) * 26 : react === "laugh" ? -Math.abs(sinf(0.5)) * 10 * rAmt : 0;
  const open = pose === "shout" ? 1 : pose === "struggle" ? 0.45 + 0.35 * Math.abs(sinf(1.0)) : pose === "fight" ? 0.7 : talking ? Math.min(1, (mouthLevel ?? 0.5) * 1.5) : pose === "eat" ? Math.abs(sinf(0.4)) * 0.6 : mood === "laugh" ? 0.8 : mood === "surprised" ? 0.7 : 0;
  const blink = lying || frame % 110 > 104 ? 0.12 : 1;
  const breathe = sinf(0.09) * 3;
  const bodyY = -L - BH + 12 + (lying ? L * 0.78 : 0) - bounce + hop + breathe * 0.5;
  const lean = pose === "scared" ? -4 : pose === "angry" || pose === "fight" ? 4 : pose === "tired" ? 3 : 0;

  // ---- parts
  const leg = (x: number, dir: 1 | -1, far: boolean) => {
    const a = lying ? 0 : swing * amp * dir + (pose === "struggle" ? sinf(1.3 + x) * 20 : 0);
    const len = lying ? L * 0.28 : L;
    return (
      <g key={`${x}${far}`} transform={`translate(${x},${bodyY + BH - 18}) rotate(${a})`}>
        <rect x={-sp.size * 13} y={0} width={sp.size * 26} height={len + 18 - (bodyY + L + BH - 12 < 0 ? 0 : 0)} rx={11} fill={far ? shade(fur, 0.55) : furD} stroke={OUT} strokeWidth={3.5} />
        <ellipse cx={sp.size * 4} cy={len + 18} rx={sp.size * 22} ry={10} fill={far ? shade(fur, 0.4) : shade(fur, 0.5)} stroke={OUT} strokeWidth={3} />
      </g>
    );
  };
  const tailSway = sinf(pose === "happy" || pose === "jump" ? 0.7 : 0.15) * (pose === "scared" ? 4 : 14);
  const tail = (() => {
    const base = `translate(${-BW + 14},${bodyY - BH * 0.35})`;
    switch (sp.tail) {
      case "bush": return <g transform={`${base} rotate(${tailSway + (pose === "scared" ? -30 : 12)})`}><path d={`M0,0 Q-80,10 -96,${L * 0.7} Q-50,${L * 0.3} 6,22 Z`} fill={fur} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" /><path d={`M-96,${L * 0.7} Q-82,${L * 0.55} -66,${L * 0.5}`} fill="none" stroke={m.species === "fox" ? "#fff" : furL} strokeWidth={14} strokeLinecap="round" /></g>;
      case "thin": return <g transform={`${base} rotate(${tailSway})`}><path d={`M0,0 Q-54,30 -50,${L * 0.9}`} fill="none" stroke={OUT} strokeWidth={13} strokeLinecap="round" /><path d={`M0,0 Q-54,30 -50,${L * 0.9}`} fill="none" stroke={fur} strokeWidth={7} strokeLinecap="round" /><circle cx={-50} cy={L * 0.92} r={13} fill={m.species === "lion" ? "#6B3A1E" : furD} stroke={OUT} strokeWidth={3} /></g>;
      case "tuft": return <g transform={`${base} rotate(${tailSway})`}><path d={`M0,0 Q-54,30 -50,${L * 0.9}`} fill="none" stroke={fur} strokeWidth={9} strokeLinecap="round" /><ellipse cx={-50} cy={L * 0.95} rx={14} ry={22} fill="#6B3A1E" stroke={OUT} strokeWidth={3} /></g>;
      case "up": return <g transform={`${base} rotate(${tailSway * 1.4 - 30})`}><path d={`M0,0 Q-60,-30 -64,-${L * 0.7}`} fill="none" stroke={OUT} strokeWidth={14} strokeLinecap="round" /><path d={`M0,0 Q-60,-30 -64,-${L * 0.7}`} fill="none" stroke={fur} strokeWidth={8} strokeLinecap="round" /></g>;
      case "puff": return <circle cx={-BW + 8} cy={bodyY - BH * 0.1} r={20} fill="#fff" stroke={OUT} strokeWidth={3.5} />;
      case "short": return <path d={`M${-BW + 10},${bodyY - BH * 0.3} q-28,6 -24,26`} fill="none" stroke={fur} strokeWidth={14} strokeLinecap="round" />;
      default: return null;
    }
  })();

  // neck + head, rotated about the shoulders by headA (+ the reaction)
  const sx = BW * 0.72, sy = bodyY - BH * 0.45; // shoulder pivot
  const hx = sx + sp.neck * 0.9 + HR * 0.55, hy = sy - sp.neck * 1.25 - HR * 0.35;
  const HA = headA + noShake * 0 + yesNod;
  const head = (
    <g transform={`translate(${sx},${sy}) rotate(${HA}) translate(${-sx},${-sy})`}>
      <g transform={`rotate(${noShake} ${hx} ${hy})`}>
        {/* neck */}
        <path d={`M${sx - 38},${sy + 26} Q${sx - 6},${sy - sp.neck * 1.1} ${hx - HR * 0.6},${hy - HR * 0.4} L${hx + HR * 0.2},${hy + HR * 0.9} Q${sx + 40},${sy + 10} ${sx + 24},${sy + 40} Z`} fill={fur} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
        {/* ears (behind the head) */}
        {sp.ears === "point" && <path d={`M${hx - HR * 0.7},${hy - HR * 0.5} L${hx - HR * 0.75},${hy - HR - 36} L${hx - HR * 0.1},${hy - HR * 0.85} Z M${hx - HR * 0.15},${hy - HR * 0.85} L${hx + HR * 0.3},${hy - HR - 40} L${hx + HR * 0.5},${hy - HR * 0.6} Z`} fill={fur} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />}
        {sp.ears === "round" && <circle cx={hx - HR * 0.4} cy={hy - HR * 0.85} r={16} fill={fur} stroke={OUT} strokeWidth={3.5} />}
        {sp.ears === "long" && <g><ellipse cx={hx - HR * 0.3} cy={hy - HR - 40} rx={14} ry={46} fill={fur} stroke={OUT} strokeWidth={3.5} transform={`rotate(${-6 + sinf(0.1) * 3} ${hx - HR * 0.3} ${hy - HR})`} /><ellipse cx={hx + HR * 0.15} cy={hy - HR - 40} rx={13} ry={44} fill={fur} stroke={OUT} strokeWidth={3.5} transform={`rotate(${10} ${hx + HR * 0.15} ${hy - HR})`} /></g>}
        {sp.ears === "big" && <ellipse cx={hx - HR * 0.55} cy={hy + 4} rx={44} ry={58} fill={furL} stroke={OUT} strokeWidth={3.5} />}
        {/* antlers / horns */}
        {sp.extra === "antlers" && <path d={`M${hx - 6},${hy - HR + 4} L${hx - 18},${hy - HR - 64} M${hx - 14},${hy - HR - 30} L${hx + 14},${hy - HR - 50} M${hx - 18},${hy - HR - 64} L${hx - 4},${hy - HR - 84}`} fill="none" stroke="#6B4A2B" strokeWidth={9} strokeLinecap="round" />}
        {sp.extra === "horns" && <path d={`M${hx - 10},${hy - HR + 8} Q${hx - 30},${hy - HR - 40} ${hx - 6},${hy - HR - 60}`} fill="none" stroke="#7F8C8D" strokeWidth={12} strokeLinecap="round" />}
        {sp.extra === "wide-horns" && <path d={`M${hx - 6},${hy - HR + 14} Q${hx - 70},${hy - HR + 4} ${hx - 64},${hy - HR - 50} M${hx + 6},${hy - HR + 12} Q${hx + 44},${hy - HR - 14} ${hx + 34},${hy - HR - 60}`} fill="none" stroke="#CFC8B8" strokeWidth={15} strokeLinecap="round" />}
        {m.species === "cow" && <path d={`M${hx - 6},${hy - HR + 12} q-18,-18 -8,-40 M${hx + 8},${hy - HR + 12} q20,-14 14,-38`} fill="none" stroke="#F5F1E6" strokeWidth={10} strokeLinecap="round" />}
        {m.species === "goat" && <path d={`M${hx - 8},${hy - HR + 8} Q${hx - 40},${hy - HR - 30} ${hx - 52},${hy - HR - 6}`} fill="none" stroke="#7F8C8D" strokeWidth={12} strokeLinecap="round" />}
        {sp.extra === "mane" && <circle cx={hx - HR * 0.15} cy={hy + 4} r={HR * 1.42} fill="#B9770E" stroke={OUT} strokeWidth={3.5} />}
        {/* head */}
        <circle cx={hx} cy={hy} r={HR} fill={fur} stroke={OUT} strokeWidth={3.5} />
        {sp.extra === "stripes" && <path d={`M${hx - 10},${hy - HR + 4} l-4,20 M${hx + 10},${hy - HR + 4} l4,20 M${hx - HR + 4},${hy - 4} l18,4 M${hx - HR + 6},${hy + 14} l16,-2`} stroke="#1B1B1B" strokeWidth={6} strokeLinecap="round" />}
        {sp.ears === "floppy" && <ellipse cx={hx - HR * 0.35} cy={hy + 14} rx={17} ry={36} fill={furD} stroke={OUT} strokeWidth={3.5} transform={`rotate(${12 + sinf(0.12) * 2} ${hx - HR * 0.35} ${hy - 10})`} />}
        {/* snout */}
        {sp.snout[0] > 0 && (() => {
          const [sl, sh] = sp.snout;
          const jaw = open * 18;
          return (
            <g>
              <path d={`M${hx + HR * 0.55},${hy - sh * 0.7} L${hx + HR * 0.55 + sl},${hy - sh * 0.35} Q${hx + HR * 0.55 + sl + 8},${hy + 2} ${hx + HR * 0.55 + sl - 6},${hy + sh * 0.35} L${hx + HR * 0.45},${hy + sh * 0.5} Z`} fill={m.species === "fox" ? "#fff" : furL} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
              {jaw > 2 && <path d={`M${hx + HR * 0.45},${hy + sh * 0.4} L${hx + HR * 0.5 + sl - 4},${hy + sh * 0.3 + jaw} L${hx + HR * 0.4},${hy + sh * 0.5 + jaw} Z`} fill="#7A1F2B" stroke={OUT} strokeWidth={3} strokeLinejoin="round" />}
              {open > 0.5 && ["wolf", "fox", "lion", "tiger", "dog", "bear"].includes(m.species ?? "") && <path d={`M${hx + HR * 0.6 + sl * 0.35},${hy + sh * 0.35} l5,10 l5,-10 M${hx + HR * 0.6 + sl * 0.7},${hy + sh * 0.3} l5,10 l5,-10`} fill="#fff" stroke={OUT} strokeWidth={1.5} />}
              <ellipse cx={hx + HR * 0.55 + sl - 2} cy={hy - sh * 0.3} rx={9} ry={7} fill="#1B1B1B" />
              {mood === "happy" && open < 0.2 && <path d={`M${hx + HR * 0.55 + sl - 22},${hy + sh * 0.3} q10,10 20,-2`} fill="none" stroke={OUT} strokeWidth={3} strokeLinecap="round" />}
            </g>
          );
        })()}
        {sp.extra === "trunk" && <path d={`M${hx + HR * 0.5},${hy + 4} Q${hx + HR * 1.1},${hy + 80} ${hx + HR * 0.6},${hy + 130} Q${hx + HR * 0.5},${hy + 140} ${hx + HR * 0.35},${hy + 126}`} fill="none" stroke={OUT} strokeWidth={36} strokeLinecap="round" />}
        {sp.extra === "trunk" && <path d={`M${hx + HR * 0.5},${hy + 4} Q${hx + HR * 1.1},${hy + 80} ${hx + HR * 0.6},${hy + 130} Q${hx + HR * 0.5},${hy + 140} ${hx + HR * 0.35},${hy + 126}`} fill="none" stroke={fur} strokeWidth={29} strokeLinecap="round" />}
        {sp.extra === "beard" && <path d={`M${hx + HR * 0.5},${hy + 26} q-4,30 6,36`} fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" />}
        {sp.extra === "whiskers" && <path d={`M${hx + HR * 0.9},${hy + 4} l40,-8 M${hx + HR * 0.9},${hy + 10} l42,6`} stroke="#fff" strokeWidth={3} />}
        {/* eye + brow */}
        <g>
          <ellipse cx={hx + HR * 0.32} cy={hy - HR * 0.2} rx={11} ry={13 * blink} fill="#fff" stroke={OUT} strokeWidth={2.5} />
          <circle cx={hx + HR * 0.32 + 3} cy={hy - HR * 0.2 + 1} r={5.5} fill="#1d1d1d" opacity={blink > 0.5 ? 1 : 0} />
          <line x1={hx + HR * 0.1} y1={hy - HR * 0.52 + (mood === "sad" || mood === "worried" ? 4 : 0)} x2={hx + HR * 0.58} y2={hy - HR * 0.5 + (mood === "angry" ? 9 : mood === "sad" || mood === "worried" ? -3 : 0)} stroke={shade(fur, 0.4)} strokeWidth={6} strokeLinecap="round" />
          {mood === "sad" && <path d={`M${hx + HR * 0.36},${hy + 2} q-3,16 0,24 q4,-6 4,-16 z`} fill="#7EC8E3" opacity={0.85} />}
        </g>
        {(pose === "struggle" || pose === "tired") && <path d={`M${hx - HR * 0.1},${hy - HR - 6} q-6,14 0,22 q6,-8 0,-22 z`} fill="#7EC8E3" opacity={0.85} />}
        {holds && <g transform={`translate(${hx + HR * 0.55 + (sp.snout[0] || 30)},${hy + 18}) scale(0.4)`}><StoryPropArt type={holds} frame={frame} /></g>}
      </g>
    </g>
  );

  // belly / pattern on the body
  const pattern = sp.extra === "spots"
    ? <g fill="#2B2B2B" opacity={0.9}><ellipse cx={-30} cy={bodyY - 10} rx={30} ry={22} /><ellipse cx={56} cy={bodyY + 12} rx={22} ry={18} /><ellipse cx={-90} cy={bodyY + 20} rx={20} ry={14} /></g>
    : sp.extra === "stripes" ? <g stroke="#1B1B1B" strokeWidth={9} strokeLinecap="round">{[-90, -50, -10, 30, 70].map((x) => <path key={x} d={`M${x},${bodyY - BH + 8} q10,${BH * 0.8} -4,${BH * 1.4}`} fill="none" />)}</g> : null;

  return (
    <g transform={`translate(${shake},0) ${lying ? "" : `rotate(${lean} 0 ${-L})`}`}>
      <ellipse cx={0} cy={6} rx={BW * 0.95} ry={12} fill="#000" opacity={0.18} />
      {leg(-BW * 0.62, -1, true)}{leg(BW * 0.5, 1, true)}
      {tail}
      <ellipse cx={0} cy={bodyY} rx={BW} ry={BH} fill={fur} stroke={OUT} strokeWidth={3.5} />
      <ellipse cx={-4} cy={bodyY + BH * 0.42} rx={BW * 0.78} ry={BH * 0.5} fill={furL} opacity={0.75} />
      {pattern}
      {leg(-BW * 0.46, 1, false)}{leg(BW * 0.64, -1, false)}
      {head}
      {lying && <text x={BW * 0.8} y={bodyY - BH - 80} fontSize={64} fontWeight={900} fill="#5DADE2" fontFamily="sans-serif" opacity={0.5 + 0.5 * sinf(0.1)}>Zz</text>}
    </g>
  );
};
