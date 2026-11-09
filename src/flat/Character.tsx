import React from "react";
import { type CharacterSpec, type CastInShot, GESTURES, MOODS, shade, skinColor } from "./spec";
import { PropIcon, PROP_GRIP } from "./icons";
import { DrawnArt, type DrawnLibrary } from "./drawn";

/**
 * One flat-vector person: the same body template for everyone, dressed from the parts catalog. Local units: the feet stand
 * at (0, 0), the top of a plain head is about y = -910 (adult). Front view, like an explainer cartoon.
 *
 * Motion is light on purpose (the camera, backgrounds and graphics carry most of the movement): breathing, blinking, a
 * talking mouth, two-bone arms that blend between gestures, a walk when the character moves, and a few looping gestures.
 */

type Gesture = (typeof GESTURES)[number];
type Mood = (typeof MOODS)[number];
type P = { x: number; y: number };

const L1_ = 160, L2_ = 150; // upper arm, forearm (full length, seen side-on)
const ARM_W = 42, HAND_R = 25;
const HEAD_CY = -810, HEAD_RX = 86, HEAD_RY = 98;
const HIP_Y = -440;
const TRADITIONAL_LOWER = new Set(["dhoti", "saree", "lehenga"]);
/** how far the upper body comes down for each posture (body units) */
export const POSTURE_DROP: Record<string, number> = { stand: 0, sit: 300, meditate: 300, kneel: 200, seated: 180, ride: 180 };
/** hands close to the body: the elbow hangs down instead of sticking out */
const ELBOW_DOWN = new Set<string>(["hold", "present", "cover-mouth", "think", "cry"]);

export interface Body {
  sw: number; ww: number; hw: number; female: boolean;
}

export function bodyOf(c: CharacterSpec): Body {
  const female = c.gender === "female";
  const b = c.build === "heavy" ? 26 : c.build === "slim" ? -10 : 0;
  return { female, sw: (female ? 90 : 106) + b * 0.7, ww: (female ? 64 : 84) + b, hw: (female ? 94 : 86) + b * 0.8 };
}

/** Hand target (local) for a gesture; `s` = -1 the screen-left arm, +1 the screen-right arm. */
function handTarget(g: Gesture, s: number, body: Body, t: number): P {
  const { sw, ww } = body;
  const R = s > 0; // the "main" arm is the screen-right one
  const idle = { x: s * (sw + 20), y: -405 };
  const osc = (hz: number, amp: number, ph = 0) => Math.sin(t * Math.PI * 2 * hz + ph) * amp;
  switch (g) {
    case "wave": return R ? { x: sw + 95 + osc(1.6, 38), y: -880 + osc(1.6, 10, 1.2) } : idle;
    case "point": return R ? { x: sw + 295, y: -650 } : idle;
    case "namaste": return { x: s * 6, y: -578 };
    case "raise": return { x: s * (sw + 105), y: -985 + osc(0.8, 12) };
    case "shrug": return { x: s * (sw + 120), y: -625 };
    case "arms-crossed": return R ? { x: -52, y: -556 } : { x: 54, y: -540 };
    case "hands-hips": return { x: s * (ww + 16), y: -468 };
    case "hold": return R ? { x: sw - 6, y: -585 } : idle;
    case "present": return { x: s * 46, y: -545 };
    case "cry": return { x: s * 38, y: -800 + osc(2.4, 5) };
    case "think": return R ? { x: 22, y: -730 } : { x: 34, y: -588 };
    case "attack": return R ? { x: sw + 165, y: -935 } : { x: -(sw + 70), y: -575 };
    case "bless": return R ? { x: sw + 72, y: -762 } : idle;
    case "talk": return R ? { x: sw + 82 + osc(0.7, 18), y: -575 + osc(1.1, 26) } : { x: -(sw + 30), y: -420 + osc(0.5, 8) };
    case "hold-up": return R ? { x: sw + 30, y: -1000 } : idle;
    case "cover-mouth": return R ? { x: 14, y: -752 } : idle;
    case "salute": return R ? { x: 58, y: -852 } : idle;
    // hands resting on the knees of crossed legs (the body is lowered, so the knees are this low in body units)
    case "meditate": return { x: s * 148, y: -390 };
    // one arm straight up, the finger holding something above (a hill on a finger)
    case "lift": return R ? { x: sw + 20, y: -1005 } : { x: -(sw + 40), y: -470 };
    default: return { x: idle.x + osc(0.25, 4 * s), y: idle.y + osc(0.33, 4) };
  }
}

/** Two-bone arm: the elbow bends away from the body. */
export function solveArm(S: P, T: P, s: number, down = false): { E: P; H: P } {
  const dx = T.x - S.x, dy = T.y - S.y;
  // a hand close to the shoulder is an arm reaching toward the camera: seen from the front its bones look shorter, so they
  // are shortened (down to 55%) instead of folding the elbow out sideways
  const reach = Math.hypot(dx, dy), k = Math.max(0.55, Math.min(1, reach / ((L1_ + L2_) * 0.78)));
  const L1 = L1_ * k, L2 = L2_ * k;
  const d = Math.max(Math.abs(L1 - L2) + 1, Math.min(L1 + L2 - 0.5, reach));
  const a = Math.atan2(dy, dx);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const e1 = { x: S.x + L1 * Math.cos(a + alpha), y: S.y + L1 * Math.sin(a + alpha) };
  const e2 = { x: S.x + L1 * Math.cos(a - alpha), y: S.y + L1 * Math.sin(a - alpha) };
  const score = (e: P) => (down ? e.y + 0.25 * s * e.x : s * e.x + 0.3 * e.y);
  const E = score(e1) > score(e2) ? e1 : e2;
  const ha = Math.atan2(dy, dx);
  const H = Math.hypot(dx, dy) > d ? { x: S.x + d * Math.cos(ha), y: S.y + d * Math.sin(ha) } : T;
  return { E, H };
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: P, b: P, k: number): P => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

/** Small deterministic noise from a string (each person blinks and talks on their own rhythm). */
export const seedOf = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };

export interface CharacterState {
  gesture: Gesture; prevGesture: Gesture; blend: number; mood: Mood; talking: boolean; posture?: string;
  look: "center" | "left" | "right" | "up"; prop?: string; walk: number; walking: boolean;
}

/** What the character is doing at time `t` (seconds into the shot): the beats applied in order, gestures blended over 0.35 s. */
export function stateAt(cast: CastInShot, t: number): CharacterState {
  let gesture = cast.gesture as Gesture, prevGesture = gesture, since = -99, mood = cast.mood as Mood, talking = cast.talking;
  for (const b of [...cast.beats].sort((x, y) => x.at - y.at)) {
    if (b.at > t) break;
    if (b.gesture && b.gesture !== gesture) { prevGesture = gesture; gesture = b.gesture; since = b.at; }
    if (b.mood) mood = b.mood;
    if (b.talking != null) talking = b.talking;
  }
  return { gesture, prevGesture, blend: ease((t - since) / 0.35), mood, talking, look: cast.look, prop: cast.prop, walk: 0, walking: false, posture: cast.posture };
}

interface Props {
  c: CharacterSpec;
  st: CharacterState;
  /** seconds since the shot started (drives breathing, blinking, mouth, looping gestures) */
  t: number;
  fps: number;
  /** parts the planner drew (a drawn head or held thing) */
  drawn?: DrawnLibrary;
}

export const Character: React.FC<Props> = ({ c: spec, st, t, drawn }) => {
  let c = spec;
  const body = bodyOf(c);
  const seed = seedOf(c.id);
  const skin = c.silhouette ? "#0b0a10" : skinColor(c.skin);
  const ink = (col: string) => (c.silhouette ? "#0b0a10" : col);
  const kid = c.age === "child" ? 0.64 : c.age === "teen" ? 0.86 : 1;
  const headK = c.age === "child" ? 1.3 : c.age === "teen" ? 1.08 : 1;
  const hairColor = c.age === "old" && c.hairColor === "#2b1d16" ? "#d9d6d0" : c.hairColor;

  // breathing and walk bob
  const breath = Math.sin(t * Math.PI * 2 * 0.28 + seed * 6) * 0.012;
  const bob = st.walking ? -Math.abs(Math.sin(st.walk * Math.PI)) * 14 : 0;

  // arms: blend the previous gesture's hand targets into the current one
  const shoulderY = -662;
  const arm = (s: number) => {
    const S = { x: s * (body.sw - 22), y: shoulderY };
    const T = lerp(handTarget(st.prevGesture, s, body, t), handTarget(st.gesture, s, body, t), st.blend);
    return { S, ...solveArm(S, T, s, ELBOW_DOWN.has(st.gesture)) };
  };
  const A = arm(-1), B = arm(1);

  // the renderer's own guard: no bare adult legs unless a robe covers them
  if (c.lower === "none" && c.upper !== "robe" && c.age !== "child") c = { ...c, lower: ["bare", "armor", "kurta", "blouse"].includes(c.upper) ? (c.gender === "female" ? "saree" : "dhoti") : "pants" };
  const longGarment = TRADITIONAL_LOWER.has(c.lower) || c.upper === "robe";
  const posture = st.posture ?? "stand";
  const drop = POSTURE_DROP[posture] ?? 0;
  const shoeColor = longGarment || c.upper === "armor" ? shade(c.accent, -0.25) : "#33261f";

  // ----- legs and feet -----
  const legSwing = st.walking ? Math.sin(st.walk * Math.PI * 2) : 0;
  const legs = (
    <g>
      {[-1, 1].map((s) => {
        const sw = legSwing * s * 26;
        const hip = { x: s * 44, y: HIP_Y }, foot = { x: s * 48 + sw, y: -40 - Math.max(0, legSwing * s) * 24 };
        const pantsTo = c.lower === "shorts" ? -255 : c.lower === "skirt" ? -230 : 0;
        const legCol = c.lower === "pants" || c.lower === "jeans" ? ink(c.lowerColor) : skin;
        return (
          <g key={s}>
            {!longGarment && <line x1={hip.x} y1={hip.y} x2={foot.x} y2={foot.y} stroke={legCol} strokeWidth={56} strokeLinecap="round" />}
            {!longGarment && pantsTo !== 0 && c.lower !== "skirt" && (
              <line x1={hip.x} y1={hip.y} x2={hip.x + (foot.x - hip.x) * 0.45} y2={pantsTo} stroke={ink(c.lowerColor)} strokeWidth={62} strokeLinecap="round" />
            )}
            {c.lower === "jeans" && !c.silhouette && <line x1={hip.x + s * 14} y1={hip.y + 40} x2={foot.x + s * 14} y2={foot.y - 30} stroke={shade(c.lowerColor, 0.25)} strokeWidth={3} />}
            <ellipse cx={foot.x + s * 10} cy={foot.y + 18} rx={40} ry={17} fill={ink(shoeColor)} />
          </g>
        );
      })}
    </g>
  );

  // ----- lower garment -----
  const lc = ink(c.lowerColor), lcD = ink(shade(c.lowerColor, -0.14)), acc = ink(c.accent);
  let lower: React.ReactNode = null;
  if (c.lower === "skirt") lower = <path d={`M ${-body.hw} ${HIP_Y - 10} L ${body.hw} ${HIP_Y - 10} L ${body.hw + 40} -225 Q 0 -210 ${-body.hw - 40} -225 Z`} fill={lc} />;
  if (c.lower === "dhoti") lower = (
    <g>
      <path d={`M ${-body.hw - 6} ${HIP_Y - 12} L ${body.hw + 6} ${HIP_Y - 12} L ${body.hw + 34} -48 Q 0 -30 ${-body.hw - 34} -48 Z`} fill={lc} />
      <path d={`M -8 ${HIP_Y} Q 18 -260 -2 -40 L 26 -44 Q 40 -260 14 ${HIP_Y}`} fill={lcD} />
      {[-0.55, -0.25, 0.4, 0.7].map((k) => <line key={k} x1={k * body.hw} y1={HIP_Y + 20} x2={k * (body.hw + 30)} y2={-55} stroke={lcD} strokeWidth={4} />)}
      <rect x={-body.hw - 34} y={-62} width={(body.hw + 34) * 2} height={14} fill={acc} opacity={0.9} rx={5} />
    </g>
  );
  if (c.lower === "saree" || c.lower === "lehenga") {
    const wide = c.lower === "lehenga" ? 150 : 112;
    lower = (
      <g>
        <path d={`M ${-body.hw} ${HIP_Y - 14} L ${body.hw} ${HIP_Y - 14} Q ${wide - 10} -200 ${wide} -30 Q 0 -14 ${-wide} -30 Q ${-wide + 10} -200 ${-body.hw} ${HIP_Y - 14} Z`} fill={lc} />
        {c.lower === "saree" ? [-18, 0, 18, 36].map((x) => <line key={x} x1={x * 0.6} y1={HIP_Y + 10} x2={x * 1.6} y2={-36} stroke={lcD} strokeWidth={5} />)
          : [-90, -45, 0, 45, 90].map((x) => <circle key={x} cx={x} cy={-160} r={7} fill={acc} />)}
        <path d={`M ${-wide} -30 Q 0 -14 ${wide} -30 L ${wide - 4} -62 Q 0 -46 ${-wide + 4} -62 Z`} fill={acc} />
      </g>
    );
  }

  // ----- torso / upper garment -----
  const { sw, ww, hw } = body;
  // sitting: long tops stop at the hips (the lap covers the rest)
  const torsoBottom = drop > 0 ? HIP_Y + 6 : c.upper === "kurta" ? -290 : c.upper === "coat" ? -250 : c.upper === "robe" ? -40 : HIP_Y + 6;
  const botHalf = c.upper === "robe" ? hw + 40 : c.upper === "kurta" || c.upper === "coat" ? hw + 16 : hw;
  const torsoPath = body.female
    ? `M ${-sw} -632 Q ${-sw} -692 ${-sw + 46} -694 L ${sw - 46} -694 Q ${sw} -692 ${sw} -632 Q ${ww + 14} -580 ${ww} -530 Q ${botHalf} -480 ${botHalf} ${torsoBottom} L ${-botHalf} ${torsoBottom} Q ${-botHalf} -480 ${-ww} -530 Q ${-ww - 14} -580 ${-sw} -632 Z`
    : `M ${-sw} -630 Q ${-sw} -692 ${-sw + 48} -694 L ${sw - 48} -694 Q ${sw} -692 ${sw} -630 L ${ww} -520 L ${botHalf} ${torsoBottom} L ${-botHalf} ${torsoBottom} L ${-ww} -520 Z`;
  const bare = c.upper === "bare";
  const blouse = c.upper === "blouse";
  const uc = ink(bare ? skin : c.upper === "armor" ? c.upperColor : c.upperColor);
  const ucD = ink(shade(bare ? skinColor(c.skin) : c.upperColor, -0.16));
  const torso = (
    <g transform={`translate(0 ${HIP_Y}) scale(1 ${1 + breath}) translate(0 ${-HIP_Y})`}>
      {/* neck */}
      <rect x={-22} y={-722} width={44} height={44} fill={ink(shade(skinColor(c.skin), -0.1))} rx={8} />
      {blouse ? (
        <>
          <path d={torsoPath} fill={skin} />
          <path d={`M ${-sw} -630 Q ${-sw} -692 ${-sw + 46} -694 L ${sw - 46} -694 Q ${sw} -692 ${sw} -630 Q ${ww + 12} -585 ${ww + 2} -548 L ${-ww - 2} -548 Q ${-ww - 12} -585 ${-sw} -630 Z`} fill={uc} />
          <path d="M -26 -694 Q 0 -664 26 -694" fill={skin} />
        </>
      ) : (
        <path d={torsoPath} fill={uc} />
      )}
      {bare && !c.silhouette && (
        <>
          {!body.female && <path d={`M ${-sw + 26} -600 Q ${-sw / 2} -575 -8 -598 M 8 -598 Q ${sw / 2} -575 ${sw - 26} -600`} stroke={ucD} strokeWidth={4} fill="none" />}
          <circle cx={0} cy={-470} r={5} fill={ucD} />
        </>
      )}
      {c.upper === "tshirt" && <path d="M -30 -694 Q 0 -652 30 -694" fill={skin} />}
      {c.upper === "sweater" && !c.silhouette && <><path d="M -30 -694 Q 0 -660 30 -694" fill={ucD} /><rect x={-hw} y={HIP_Y - 18} width={hw * 2} height={20} fill={ucD} /></>}
      {(c.upper === "shirt" || c.upper === "uniform") && !c.silhouette && (
        <>
          <path d="M -34 -696 L 0 -652 L -8 -700 Z M 34 -696 L 0 -652 L 8 -700 Z" fill={shade(c.upperColor, 0.35)} />
          {[-620, -570, -520, -470].map((y) => <circle key={y} cx={0} cy={y} r={4.5} fill={ucD} />)}
          {c.upper === "uniform" && <><path d={`M ${sw - 60} -600 l 10 -22 l 10 22 l -22 -14 h 24 z`} fill={acc} /><rect x={-sw + 6} y={-694} width={52} height={14} rx={5} fill={acc} /><rect x={sw - 58} y={-694} width={52} height={14} rx={5} fill={acc} /></>}
        </>
      )}
      {c.upper === "suit" && !c.silhouette && (
        <>
          <path d="M -46 -694 L 0 -540 L 46 -694 Z" fill="#f4f1ea" />
          <path d="M -8 -680 L 8 -680 L 12 -560 L 0 -540 L -12 -560 Z" fill={c.accessories.includes("tie") ? acc : shade(c.upperColor, -0.35)} />
          <path d="M -46 -694 L -10 -560 L -36 -600 L -62 -640 Z M 46 -694 L 10 -560 L 36 -600 L 62 -640 Z" fill={ucD} />
          {[-500, -460].map((y) => <circle key={y} cx={-6} cy={y} r={5} fill={ucD} />)}
        </>
      )}
      {c.upper === "hoodie" && !c.silhouette && (
        <>
          <path d="M -70 -694 Q 0 -640 70 -694 Q 40 -720 0 -718 Q -40 -720 -70 -694 Z" fill={ucD} />
          <line x1={-14} y1={-676} x2={-16} y2={-610} stroke="#f4f1ea" strokeWidth={4} /><line x1={14} y1={-676} x2={16} y2={-610} stroke="#f4f1ea" strokeWidth={4} />
          <path d={`M ${-ww + 10} -500 L ${ww - 10} -500 L ${ww - 22} -455 L ${-ww + 22} -455 Z`} fill={ucD} />
        </>
      )}
      {c.upper === "kurta" && !c.silhouette && (
        <>
          <path d="M -6 -694 L -6 -600 L 6 -600 L 6 -694" stroke={acc} strokeWidth={5} fill="none" />
          <path d={`M ${-botHalf} ${torsoBottom} L ${botHalf} ${torsoBottom}`} stroke={acc} strokeWidth={10} />
        </>
      )}
      {c.upper === "coat" && !c.silhouette && (
        <>
          <path d={`M -40 -694 L -22 ${torsoBottom} L 22 ${torsoBottom} L 40 -694 Z`} fill="#f4f1ea" />
          <path d={`M -40 -694 L -14 -560 L -50 -610 Z M 40 -694 L 14 -560 L 50 -610 Z`} fill={ucD} />
        </>
      )}
      {c.upper === "robe" && !c.silhouette && (
        <>
          <path d="M -40 -694 L 0 -600 L 40 -694" stroke={acc} strokeWidth={8} fill="none" />
          <rect x={-ww - 6} y={-470} width={(ww + 6) * 2} height={18} fill={acc} rx={6} />
        </>
      )}
      {c.upper === "armor" && !c.silhouette && (
        <>
          <path d={`M ${-sw + 20} -650 Q 0 -560 ${sw - 20} -650`} stroke={ucD} strokeWidth={6} fill="none" />
          <path d={`M ${-ww + 4} -520 L ${ww - 4} -520`} stroke={ucD} strokeWidth={6} />
          <rect x={-ww - 2} y={HIP_Y - 30} width={(ww + 2) * 2} height={26} fill={acc} rx={8} />
        </>
      )}
      {/* sash: an angavastram / dupatta across the chest (and the saree's pallu) */}
      {(c.accessories.includes("sash") || c.lower === "saree") && (
        <path d={`M ${-sw + 22} -694 L ${-sw + 70} -694 L ${ww + 10} ${c.lower === "saree" ? -440 : -470} L ${ww - 34} ${c.lower === "saree" ? -440 : -470} Z`}
          fill={ink(c.lower === "saree" ? c.lowerColor : shade(c.accent, -0.05))} opacity={0.96} />
      )}
      {c.accessories.includes("scarf") && <path d="M -58 -700 Q 0 -660 58 -700 L 64 -680 Q 0 -630 -64 -680 Z M 24 -670 l 22 0 l 6 110 l -26 0 z" fill={ink(c.accent)} />}
      {c.accessories.includes("bag") && <><line x1={-sw + 30} y1={-692} x2={ww + 4} y2={-470} stroke={ink("#5b3b26")} strokeWidth={10} /><rect x={ww - 16} y={-490} width={64} height={52} rx={10} fill={ink("#7a4e30")} /></>}
      {c.accessories.includes("belt") && <rect x={-ww - 4} y={HIP_Y - 22} width={(ww + 4) * 2} height={18} fill={acc} rx={6} />}
      {c.accessories.includes("rudraksha") && (
        <g fill={ink("#6b3a22")}>{Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (0.12 + (i / 12) * 0.76); return <circle key={i} cx={Math.cos(a) * 62} cy={-700 + Math.sin(a) * 70} r={8} />; })}</g>
      )}
      {c.accessories.includes("garland") && (
        <g>{Array.from({ length: 19 }, (_, i) => {
          const k = i / 18, x = (k - 0.5) * 2 * (sw - 34), y = -690 + (1 - Math.pow((k - 0.5) * 2, 2)) * 240;
          return <circle key={i} cx={x} cy={y} r={15} fill={ink(["#f2b53a", "#e8443a", "#f7f3ea", "#3fa66b"][i % 4])} />;
        })}</g>
      )}
      {c.accessories.includes("snake") && (
        <g>
          <path d={`M ${-58} -700 Q -70 -630 -20 -620 Q 30 -612 58 -660 Q 70 -690 52 -705`} stroke={ink("#3f8f5a")} strokeWidth={22} fill="none" strokeLinecap="round" />
          <path d="M 50 -700 Q 90 -760 70 -800 Q 40 -790 46 -740 Z" fill={ink("#3f8f5a")} />
          <ellipse cx={64} cy={-786} rx={26} ry={30} fill={ink("#4ea56b")} />
          <circle cx={56} cy={-792} r={4} fill={ink("#111")} /><circle cx={72} cy={-792} r={4} fill={ink("#111")} />
        </g>
      )}
      {c.accessories.includes("necklace") && (
        <g fill={acc}>
          <path d="M -40 -694 Q 0 -620 40 -694" stroke={acc} strokeWidth={6} fill="none" />
          <circle cx={0} cy={-652} r={9} />
          {[-28, -14, 14, 28].map((x) => <circle key={x} cx={x} cy={-668 + Math.abs(x) * -0.6} r={5} />)}
        </g>
      )}
    </g>
  );

  // ----- arms -----
  const sleeve: "none" | "short" | "long" = bare || c.upper === "armor" ? "none" : c.upper === "tshirt" || blouse ? "short" : "long";
  const sleeveCol = ink(c.upperColor);
  const armEl = (a: { S: P; E: P; H: P }, s: number) => {
    const mid = lerp(a.S, a.E, 0.55);
    return (
      <g key={s}>
        <line x1={a.S.x} y1={a.S.y} x2={a.E.x} y2={a.E.y} stroke={skin} strokeWidth={ARM_W} strokeLinecap="round" />
        <line x1={a.E.x} y1={a.E.y} x2={a.H.x} y2={a.H.y} stroke={skin} strokeWidth={ARM_W - 4} strokeLinecap="round" />
        {sleeve === "short" && <line x1={a.S.x} y1={a.S.y} x2={mid.x} y2={mid.y} stroke={sleeveCol} strokeWidth={ARM_W + 10} strokeLinecap="round" />}
        {sleeve === "long" && (
          <>
            <line x1={a.S.x} y1={a.S.y} x2={a.E.x} y2={a.E.y} stroke={sleeveCol} strokeWidth={ARM_W + 8} strokeLinecap="round" />
            <line x1={a.E.x} y1={a.E.y} x2={lerp(a.E, a.H, 0.82).x} y2={lerp(a.E, a.H, 0.82).y} stroke={sleeveCol} strokeWidth={ARM_W + 4} strokeLinecap="round" />
          </>
        )}
        {c.accessories.includes("armlets") && <circle cx={mid.x} cy={mid.y} r={ARM_W / 2 + 3} fill="none" stroke={acc} strokeWidth={9} />}
        {c.accessories.includes("bangles") && <circle cx={lerp(a.E, a.H, 0.78).x} cy={lerp(a.E, a.H, 0.78).y} r={ARM_W / 2 - 1} fill="none" stroke={acc} strokeWidth={7} />}
        {c.accessories.includes("watch") && s < 0 && <circle cx={lerp(a.E, a.H, 0.8).x} cy={lerp(a.E, a.H, 0.8).y} r={ARM_W / 2} fill="none" stroke={ink("#222")} strokeWidth={9} />}
        <circle cx={a.H.x} cy={a.H.y} r={HAND_R} fill={skin} />
        {c.upper === "armor" && (
          <g>
            <circle cx={a.S.x + s * 4} cy={a.S.y + 4} r={44} fill={acc} />
            <circle cx={a.S.x + s * 4} cy={a.S.y + 4} r={24} fill={ink("#b3261e")} />
          </g>
        )}
      </g>
    );
  };

  // a held thing: in the main hand, or between both hands when presenting
  const propEl = st.prop ? (() => {
    const grip = PROP_GRIP[st.prop] ?? PROP_GRIP.default;
    const at = st.gesture === "present" || st.gesture === "namaste" ? lerp(A.H, B.H, 0.5) : B.H;
    const size = grip.size;
    return (
      <g transform={`translate(${at.x + grip.dx * size} ${at.y + grip.dy * size}) rotate(${grip.rot})`}>
        {st.prop.startsWith("drawn-") ? <DrawnArt part={drawn?.[st.prop]} size={size} /> : <PropIcon name={st.prop} size={size} silhouette={c.silhouette} />}
      </g>
    );
  })() : null;

  // ----- head -----
  const lookDx = st.look === "left" ? -6 : st.look === "right" ? 6 : 0, lookDy = st.look === "up" ? -5 : 0;
  const blinkPeriod = 3.2 + seed * 2.4;
  const bt = (t + seed * 7) % blinkPeriod;
  const blink = c.eyes === "closed" ? 0.1 : bt < 0.12 ? 0.1 : 1;
  const talkOpen = st.talking ? [0.15, 0.85, 0.45, 1, 0.3, 0.7, 0.05, 0.9][Math.floor((t * 11 + seed * 13)) % 8] : 0;

  const head = (
    <g transform={`translate(0 ${-720}) scale(${headK}) translate(0 ${720}) translate(0 ${breath * -120})`}>
      {c.head.startsWith("drawn-") && drawn?.[c.head] ? <DrawnArt part={drawn[c.head]} blink={blink} talkOpen={talkOpen} /> : c.head !== "human" && !c.head.startsWith("drawn-") ? <AnimalHead c={c} skin={skin} ink={ink} mood={st.mood} blink={blink} talkOpen={talkOpen} lookDx={lookDx} /> : <>
      {/* ears + earrings */}
      {[-1, 1].map((s) => <ellipse key={s} cx={s * 84} cy={-806} rx={14} ry={21} fill={ink(shade(skinColor(c.skin), -0.08))} />)}
      <ellipse cx={0} cy={HEAD_CY} rx={HEAD_RX} ry={HEAD_RY} fill={skin} />
      {c.accessories.includes("earrings") && [-1, 1].map((s) => (
        <g key={s} fill={acc}><circle cx={s * 86} cy={-782} r={7} /><circle cx={s * 86} cy={-758} r={11} fill={ink("#c0392b")} /></g>
      ))}
      {!c.silhouette && <Face c={c} mood={st.mood} blink={blink} talkOpen={talkOpen} lookDx={lookDx} lookDy={lookDy} hairColor={hairColor} />}
      {c.silhouette && [-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={s * 32} cy={-812} rx={24} ry={14} fill="#ff2a2a" opacity={0.35} />
          <ellipse cx={s * 32} cy={-812} rx={14} ry={8} fill="#ff4a3a" />
        </g>
      ))}
      <HairFront c={c} color={ink(hairColor)} />
      </>}
      <Headwear c={c} ink={ink} />
    </g>
  );

  if (drop === 0) return (
    <g transform={`translate(0 ${bob}) scale(${kid})`}>
      <HairBack c={c} color={ink(hairColor)} ink={ink} headK={headK} />
      {legs}
      {lower}
      {torso}
      {head}
      {armEl(A, -1)}
      {armEl(B, 1)}
      {propEl}
    </g>
  );
  // sitting, kneeling, on a seat or riding: the upper body comes down, the folded legs are drawn in front of the hips
  return (
    <g transform={`scale(${kid})`}>
      <g transform={`translate(0 ${drop})`}>
        <HairBack c={c} color={ink(hairColor)} ink={ink} headK={headK} />
        {torso}
        {head}
      </g>
      <FoldedLegs c={c} posture={posture} body={body} skin={skin} ink={ink} shoe={ink(shoeColor)} />
      <g transform={`translate(0 ${drop})`}>
        {armEl(A, -1)}
        {armEl(B, 1)}
        {propEl}
      </g>
    </g>
  );
};

/** Legs folded under a sitting body: crossed (sit, meditate), kneeling, or hanging from a seat or a saddle. */
const FoldedLegs: React.FC<{ c: CharacterSpec; posture: string; body: Body; skin: string; ink: (s: string) => string; shoe: string }> = ({ c, posture, body, skin, ink, shoe }) => {
  const robe = c.upper === "robe";
  const cloth = ink(robe ? c.upperColor : c.lower === "none" ? c.upperColor : c.lowerColor);
  const clothD = ink(shade(robe ? c.upperColor : c.lowerColor, -0.15));
  const trousers = c.lower === "pants" || c.lower === "jeans";
  const border = TRADITIONAL_LOWER.has(c.lower) || robe ? ink(c.accent) : undefined;
  if (posture === "sit" || posture === "meditate") return (
    <g>
      <path d="M -178 -36 Q -198 -150 -96 -178 L 96 -178 Q 198 -150 178 -36 Q 0 -6 -178 -36 Z" fill={cloth} />
      {[-1, 1].map((s) => <ellipse key={s} cx={s * 140} cy={-74} rx={62} ry={50} fill={clothD} opacity={0.5} />)}
      <path d="M -60 -96 Q 0 -70 60 -96" stroke={clothD} strokeWidth={6} fill="none" />
      {posture === "meditate" && !trousers && [-1, 1].map((s) => <ellipse key={s} cx={s * 46} cy={-74} rx={30} ry={16} fill={skin} transform={`rotate(${s * -15} ${s * 46} -74)`} />)}
      {border && <path d="M -178 -36 Q 0 -6 178 -36" stroke={border} strokeWidth={12} fill="none" />}
    </g>
  );
  if (posture === "kneel") return (
    <g>
      <path d={`M ${-body.hw - 6} -250 L ${body.hw + 6} -250 L ${body.hw + 26} -20 Q 0 -6 ${-body.hw - 26} -20 Z`} fill={cloth} />
      {border && <path d={`M ${-body.hw - 26} -20 Q 0 -6 ${body.hw + 26} -20`} stroke={border} strokeWidth={12} fill="none" />}
    </g>
  );
  // seated / ride: a lap seen from the front, shins down to the feet (riding: astride, feet apart)
  const spread = posture === "ride" ? 70 : 0;
  const long = TRADITIONAL_LOWER.has(c.lower) || robe;
  return (
    <g>
      {[-1, 1].map((s) => {
        const knee = { x: s * (52 + spread * 0.6), y: -205 }, foot = { x: s * (56 + spread), y: -46 };
        return (
          <g key={s}>
            {!long && <line x1={knee.x} y1={knee.y} x2={foot.x} y2={foot.y} stroke={trousers ? cloth : skin} strokeWidth={54} strokeLinecap="round" />}
            <ellipse cx={foot.x + s * 8} cy={foot.y + 18} rx={38} ry={16} fill={shoe} />
          </g>
        );
      })}
      <rect x={-body.hw - 14 - spread * 0.5} y={-286} width={(body.hw + 14 + spread * 0.5) * 2} height={96} rx={44} fill={cloth} />
      {long && <path d={`M ${-body.hw - 10 - spread * 0.5} -230 L ${body.hw + 10 + spread * 0.5} -230 L ${body.hw + 40 + spread} -58 Q 0 -44 ${-body.hw - 40 - spread} -58 Z`} fill={cloth} />}
      {long && border && <path d={`M ${-body.hw - 40 - spread} -58 Q 0 -44 ${body.hw + 40 + spread} -58`} stroke={border} strokeWidth={12} fill="none" />}
    </g>
  );
};

// ---------------------------------------------------------------------------------------------------------------------

const Face: React.FC<{ c: CharacterSpec; mood: Mood; blink: number; talkOpen: number; lookDx: number; lookDy: number; hairColor: string }> = ({ c, mood, blink, talkOpen, lookDx, lookDy, hairColor }) => {
  const skin = skinColor(c.skin);
  const dark = shade(skin, -0.3);
  const ey = -812, ex = 32;
  const big = c.eyes === "big" ? 1.25 : 1;
  const browTilt = mood === "angry" || mood === "evil" ? 9 : mood === "sad" || mood === "scared" ? -8 : 0;
  const browLift = mood === "surprised" || mood === "scared" ? -9 : mood === "happy" ? -3 : 0;
  const mouthY = -760;
  let mouth: React.ReactNode;
  if (talkOpen > 0.1) {
    const w = 12 + talkOpen * 5, h = 3 + talkOpen * 11;
    mouth = <g><ellipse cx={0} cy={mouthY} rx={w} ry={h} fill="#5a1e1e" /><ellipse cx={0} cy={mouthY + h * 0.45} rx={w * 0.6} ry={h * 0.4} fill="#d65a5a" /></g>;
  } else if (mood === "happy" || mood === "calm") {
    mouth = <path d={`M -20 ${mouthY - 4} Q 0 ${mouthY + 16} 20 ${mouthY - 4}`} stroke="#5a1e1e" strokeWidth={6} fill={mood === "happy" ? "#5a1e1e" : "none"} strokeLinecap="round" />;
  } else if (mood === "evil") {
    mouth = <g><path d={`M -26 ${mouthY - 8} Q 0 ${mouthY + 18} 26 ${mouthY - 8} Z`} fill="#3a1010" /><path d={`M -22 ${mouthY - 6} L 22 ${mouthY - 6} L 18 ${mouthY + 1} L -18 ${mouthY + 1} Z`} fill="#f4efe6" /></g>;
  } else if (mood === "surprised" || mood === "scared") {
    mouth = <ellipse cx={0} cy={mouthY} rx={9} ry={13} fill="#5a1e1e" />;
  } else if (mood === "sad") {
    mouth = <path d={`M -16 ${mouthY + 4} Q 0 ${mouthY - 8} 16 ${mouthY + 4}`} stroke="#5a1e1e" strokeWidth={6} fill="none" strokeLinecap="round" />;
  } else if (mood === "angry") {
    mouth = <path d={`M -16 ${mouthY} Q 0 ${mouthY - 4} 16 ${mouthY}`} stroke="#5a1e1e" strokeWidth={7} fill="none" strokeLinecap="round" />;
  } else {
    mouth = <path d={`M -15 ${mouthY - 1} Q 0 ${mouthY + 5} 15 ${mouthY - 1}`} stroke="#5a1e1e" strokeWidth={6} fill="none" strokeLinecap="round" />;
  }
  const beard = c.facial === "beard" || c.facial === "beard-long";
  return (
    <g>
      {c.gender === "female" && [-1, 1].map((s) => <circle key={s} cx={s * 52} cy={-776} r={14} fill="#e88a8a" opacity={0.3} />)}
      {/* eyes */}
      {[-1, 1].map((s) => (
        <g key={s}>
          {c.eyes === "glow" ? (
            <>
              <ellipse cx={s * ex} cy={ey} rx={22} ry={14} fill="#ff3b2f" opacity={0.3} />
              <ellipse cx={s * ex} cy={ey} rx={14 * big} ry={10 * big * blink} fill="#ffefe0" />
              <circle cx={s * ex + lookDx} cy={ey + lookDy} r={6 * blink} fill="#e0261b" />
            </>
          ) : blink < 0.5 ? (
            <path d={`M ${s * ex - 14} ${ey} Q ${s * ex} ${ey + 7} ${s * ex + 14} ${ey}`} stroke="#2a1a14" strokeWidth={5} fill="none" strokeLinecap="round" />
          ) : (
            <>
              <ellipse cx={s * ex} cy={ey} rx={15 * big} ry={12 * big} fill="#fbf8f2" />
              <circle cx={s * ex + lookDx} cy={ey + lookDy + 1} r={8 * big} fill="#2a1a14" />
              <circle cx={s * ex + lookDx + 3} cy={ey + lookDy - 2} r={2.5 * big} fill="#fff" />
              {c.gender === "female" && <path d={`M ${s * (ex + 10)} ${ey - 10} l ${s * 9} -6`} stroke="#2a1a14" strokeWidth={4} strokeLinecap="round" />}
            </>
          )}
          {/* brows: the inner end (toward the nose) moves with the mood */}
          <line x1={s * (ex - 17)} y1={-842 + browLift + browTilt} x2={s * (ex + 17)} y2={-844 + browLift - browTilt * 0.3}
            stroke={hairColor === "#d9d6d0" || hairColor.toLowerCase() === "#ffffff" ? "#bdb7ae" : hairColor} strokeWidth={8} strokeLinecap="round" />
          {c.age === "old" && <path d={`M ${s * (ex + 22)} ${ey - 4} l ${s * 10} -4 M ${s * (ex + 22)} ${ey + 4} l ${s * 10} 4`} stroke={dark} strokeWidth={3} />}
        </g>
      ))}
      {/* nose */}
      <path d="M -3 -800 Q 9 -784 0 -776" stroke={dark} strokeWidth={4.5} fill="none" strokeLinecap="round" />
      {/* facial hair under the mouth */}
      {beard && (
        <path d={c.facial === "beard-long"
          ? "M -82 -800 Q -88 -700 -40 -650 Q 0 -560 40 -650 Q 88 -700 82 -800 Q 60 -748 0 -744 Q -60 -748 -82 -800 Z"
          : "M -82 -800 Q -86 -712 0 -694 Q 86 -712 82 -800 Q 60 -748 0 -744 Q -60 -748 -82 -800 Z"} fill={hairColor} />
      )}
      {c.facial === "stubble" && <path d="M -78 -790 Q -80 -712 0 -700 Q 80 -712 78 -790 Q 60 -752 0 -748 Q -60 -752 -78 -790 Z" fill={hairColor} opacity={0.22} />}
      {mouth}
      {(c.facial === "moustache" || beard) && <path d="M -30 -770 Q -16 -784 0 -774 Q 16 -784 30 -770 Q 16 -768 0 -771 Q -16 -768 -30 -770 Z" fill={hairColor} />}
      {c.fangs && [-1, 1].map((s) => <path key={s} d={`M ${s * 12} ${mouthY - 2} l ${s * 8} 0 l ${-s * 4} 16 z`} fill="#f7f2e8" />)}
      {/* forehead marks */}
      {c.mark === "bindi" && <circle cx={0} cy={-850} r={6} fill="#c0392b" />}
      {c.mark === "tilak" && <line x1={0} y1={-868} x2={0} y2={-836} stroke="#d4442a" strokeWidth={7} strokeLinecap="round" />}
      {c.mark === "tripundra" && <g stroke="#efe9dd" strokeWidth={5} strokeLinecap="round">{[-872, -862, -852].map((y) => <line key={y} x1={-30} y1={y} x2={30} y2={y} />)}<circle cx={0} cy={-862} r={5} fill="#c0392b" stroke="none" /></g>}
      {c.mark === "namam" && <g><path d="M -14 -884 L -6 -838 L 6 -838 L 14 -884" stroke="#efe9dd" strokeWidth={6} fill="none" /><line x1={0} y1={-880} x2={0} y2={-842} stroke="#d4442a" strokeWidth={5} /></g>}
      {c.mark === "scar" && <path d="M 18 -840 L 46 -790" stroke={dark} strokeWidth={5} />}
      {c.mark === "freckles" && [-1, 1].map((s) => [0, 1, 2].map((k) => <circle key={`${s}${k}`} cx={s * (44 + k * 8)} cy={-786 + (k % 2) * 6} r={2.5} fill={dark} />))}
      {c.accessories.includes("glasses") && (
        <g stroke="#222" strokeWidth={5} fill="none"><circle cx={-32} cy={-812} r={22} /><circle cx={32} cy={-812} r={22} /><line x1={-10} y1={-814} x2={10} y2={-814} /></g>
      )}
    </g>
  );
};

/** Hair on the head (front). */
const HairFront: React.FC<{ c: CharacterSpec; color: string }> = ({ c, color }) => {
  if (c.hair === "bald" || c.headwear === "hijab" || c.headwear === "helmet") return null;
  const cap = "M -90 -792 Q -98 -936 0 -930 Q 98 -936 90 -792 Q 82 -858 44 -872 Q 0 -884 -44 -872 Q -82 -858 -90 -792 Z";
  switch (c.hair) {
    case "side-part": return <path d="M -90 -790 Q -100 -936 4 -930 Q 98 -932 90 -792 Q 84 -870 20 -878 Q -10 -874 -30 -890 Q -50 -858 -90 -790 Z" fill={color} />;
    case "spiky": return <path d="M -90 -800 L -96 -880 L -70 -870 L -62 -940 L -30 -900 L -10 -958 L 14 -904 L 46 -946 L 56 -888 L 92 -900 L 90 -800 Q 70 -862 0 -872 Q -70 -862 -90 -800 Z" fill={color} />;
    case "curly": return <g fill={color}>{Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (1.05 + (i / 10) * 0.9); return <circle key={i} cx={Math.cos(a) * 88} cy={-830 + Math.sin(a) * 84} r={30} />; })}</g>;
    case "long": case "wavy": return <path d="M -92 -760 Q -100 -940 0 -932 Q 100 -940 92 -760 Q 86 -850 52 -870 Q 18 -880 0 -862 Q -18 -880 -52 -870 Q -86 -850 -92 -760 Z" fill={color} />;
    case "afro": return <path d={cap} fill={color} />;
    default: return <path d={cap} fill={color} />;
  }
};

/** Hair behind the head and body (long hair, buns, braids), plus the back of a veil or hijab and a halo. */
const HairBack: React.FC<{ c: CharacterSpec; color: string; ink: (s: string) => string; headK: number }> = ({ c, color, ink, headK }) => {
  const hw = ink(c.headwearColor);
  const inner: React.ReactNode[] = [];
  if (c.headwear === "halo") inner.push(<circle key="halo" cx={0} cy={-830} r={132} fill="none" stroke={ink("#f6c453")} strokeWidth={10} opacity={0.9} />);
  if (c.headwear === "veil") inner.push(<path key="veil" d="M -100 -900 Q 0 -990 100 -900 L 150 -560 Q 0 -520 -150 -560 Z" fill={hw} />);
  if (c.headwear === "hijab") inner.push(<path key="hij" d="M -110 -840 Q -112 -960 0 -960 Q 112 -960 110 -840 L 130 -660 Q 0 -610 -130 -660 Z" fill={hw} />);
  // an animal head has no hair (a halo or a veil still goes behind it)
  if (c.head === "human" && c.headwear !== "hijab" && c.headwear !== "helmet") {
    if (c.hair === "long") inner.push(<path key="long" d="M -96 -860 Q -112 -700 -120 -560 Q 0 -540 120 -560 Q 112 -700 96 -860 Z" fill={color} />);
    if (c.hair === "wavy") inner.push(<path key="wavy" d="M -96 -860 Q -126 -760 -104 -700 Q -134 -640 -112 -570 Q 0 -548 112 -570 Q 134 -640 104 -700 Q 126 -760 96 -860 Z" fill={color} />);
    if (c.hair === "bun") inner.push(<circle key="bun" cx={0} cy={-938} r={40} fill={color} />);
    if (c.hair === "jata") inner.push(<g key="jata" fill={color}><rect x={-34} y={-1010} width={68} height={100} rx={30} /><ellipse cx={0} cy={-1010} rx={42} ry={22} /></g>);
    if (c.hair === "ponytail") inner.push(<path key="pony" d="M 70 -880 Q 150 -840 130 -680 Q 110 -720 96 -830 Z" fill={color} />);
    if (c.hair === "braid") inner.push(<g key="braid" fill={color}>{[0, 1, 2, 3, 4, 5].map((k) => <ellipse key={k} cx={92 - k * 2} cy={-760 + k * 44} rx={20 - k} ry={26} />)}</g>);
    if (c.hair === "afro") inner.push(<circle key="afro" cx={0} cy={-850} r={128} fill={color} />);
  }
  if (!inner.length) return null;
  return <g transform={`translate(0 ${-720}) scale(${headK}) translate(0 ${720})`}>{inner}</g>;
};

const Headwear: React.FC<{ c: CharacterSpec; ink: (s: string) => string }> = ({ c, ink }) => {
  const col = ink(c.headwearColor), dark = ink(shade(c.headwearColor, -0.22)), jewel = ink("#c0392b");
  switch (c.headwear) {
    case "crown": return (
      <g>
        <path d="M -78 -880 L -78 -940 L -48 -908 L -24 -956 L 0 -910 L 24 -956 L 48 -908 L 78 -940 L 78 -880 Z" fill={col} />
        <rect x={-80} y={-892} width={160} height={18} fill={dark} rx={4} />
        {[-40, 0, 40].map((x) => <circle key={x} cx={x} cy={-883} r={6} fill={jewel} />)}
      </g>
    );
    case "mukut": return (
      <g>
        <path d="M -82 -878 Q -92 -960 -46 -990 Q -20 -1060 0 -1080 Q 20 -1060 46 -990 Q 92 -960 82 -878 Z" fill={col} />
        <path d="M -60 -900 Q 0 -930 60 -900" stroke={dark} strokeWidth={6} fill="none" />
        <path d="M -30 -960 Q 0 -1000 30 -960" stroke={dark} strokeWidth={5} fill="none" />
        <circle cx={0} cy={-930} r={13} fill={jewel} />
        <circle cx={0} cy={-1040} r={8} fill={jewel} />
        <rect x={-86} y={-892} width={172} height={20} fill={dark} rx={6} />
      </g>
    );
    case "horns": {
      const h = c.headwearColor === "#e2a93b" ? ink("#ece2cf") : col;
      return (
        <g>
          <path d="M -62 -900 Q -132 -950 -118 -1100 Q -96 -990 -38 -924 Z" fill={h} />
          <path d="M 62 -900 Q 132 -950 118 -1100 Q 96 -990 38 -924 Z" fill={h} />
        </g>
      );
    }
    case "turban": return (
      <g>
        <path d="M -96 -850 Q -110 -980 0 -985 Q 110 -980 96 -850 Q 0 -880 -96 -850 Z" fill={col} />
        <path d="M -90 -890 Q 0 -940 90 -900 M -96 -862 Q 0 -910 96 -870" stroke={dark} strokeWidth={6} fill="none" />
        <circle cx={0} cy={-912} r={12} fill={jewel} />
      </g>
    );
    case "cap": return <g><path d="M -92 -846 Q -96 -960 0 -956 Q 96 -960 92 -846 Z" fill={col} /><path d="M -10 -852 Q 80 -868 150 -846 L 140 -830 Q 60 -844 -10 -836 Z" fill={dark} /></g>;
    case "hijab": return <path d="M -92 -770 Q -104 -942 0 -944 Q 104 -942 92 -770 Q 86 -880 0 -888 Q -86 -880 -92 -770 Z" fill={col} />;
    case "veil": return <g><path d="M -96 -800 Q -104 -950 0 -950 Q 104 -950 96 -800 Q 90 -890 0 -898 Q -90 -890 -96 -800 Z" fill={col} /><path d="M -92 -880 Q 0 -914 92 -880" stroke={ink(c.accent)} strokeWidth={7} fill="none" /></g>;
    case "helmet": return <g><path d="M -98 -800 Q -104 -970 0 -972 Q 104 -970 98 -800 L 70 -800 Q 66 -880 0 -884 Q -66 -880 -70 -800 Z" fill={col} /><rect x={-8} y={-890} width={16} height={84} fill={dark} /><path d="M -10 -972 Q 0 -1050 60 -1040 Q 20 -1010 10 -972 Z" fill={jewel} /></g>;
    case "hat": return <g><ellipse cx={0} cy={-880} rx={150} ry={22} fill={dark} /><path d="M -80 -884 Q -84 -990 0 -990 Q 84 -990 80 -884 Z" fill={col} /><rect x={-80} y={-910} width={160} height={16} fill={ink(c.accent)} /></g>;
    case "tiara": return <g><path d="M -70 -906 Q 0 -940 70 -906 L 60 -896 Q 0 -924 -60 -896 Z" fill={col} /><path d="M -14 -926 L 0 -960 L 14 -926 Z" fill={col} /><circle cx={0} cy={-930} r={7} fill={jewel} /></g>;
    case "peacock-feather": return (
      <g>
        <rect x={-84} y={-900} width={168} height={16} rx={6} fill={col} />
        <path d="M 30 -900 Q 70 -990 46 -1060 Q 20 -990 30 -900 Z" fill={ink("#2f8f5b")} />
        <ellipse cx={46} cy={-1030} rx={18} ry={24} fill={ink("#1f5fa8")} /><ellipse cx={46} cy={-1028} rx={9} ry={12} fill={ink("#f2c14e")} />
      </g>
    );
    case "headband": return <rect x={-90} y={-880} width={180} height={18} rx={8} fill={col} />;
    case "krishna-mukut": return (
      <g>
        <path d="M 30 -930 Q 80 -1040 52 -1110 Q 18 -1040 30 -930 Z" fill={ink("#2f8f5b")} />
        <ellipse cx={54} cy={-1080} rx={20} ry={26} fill={ink("#1f5fa8")} /><ellipse cx={54} cy={-1078} rx={10} ry={13} fill={ink("#f2c14e")} /><circle cx={54} cy={-1078} r={5} fill={ink("#1b3f7a")} />
        <path d="M -80 -878 Q -86 -950 -40 -972 Q 0 -1010 40 -972 Q 86 -950 80 -878 Z" fill={col} />
        <path d="M -56 -904 Q 0 -930 56 -904" stroke={dark} strokeWidth={6} fill="none" />
        <circle cx={0} cy={-940} r={12} fill={jewel} />
        <rect x={-84} y={-892} width={168} height={18} fill={dark} rx={6} />
        {[-50, -25, 0, 25, 50].map((x) => <circle key={x} cx={x} cy={-883} r={5} fill={ink("#f7f3ea")} />)}
      </g>
    );
    case "moon-jata": return (
      <g>
        <path d="M -44 -900 Q -60 -1000 -20 -1050 Q 0 -1080 20 -1050 Q 60 -1000 44 -900 Z" fill={ink(c.hairColor)} />
        {[-990, -950].map((y) => <path key={y} d={`M -40 ${y} Q 0 ${y - 16} 40 ${y}`} stroke={ink(shade(c.hairColor, 0.2))} strokeWidth={6} fill="none" />)}
        <path d="M 44 -1030 Q 92 -1010 84 -960 Q 70 -1000 40 -1006 Z" fill={ink("#f4f1dc")} />
        <rect x={-80} y={-896} width={160} height={14} rx={6} fill={ink("#6b3a22")} />
      </g>
    );
    default: return null;
  }
};

/** An animal head on a person's body: elephant (Ganesha), monkey (Hanuman), eagle (Garuda). */
const AnimalHead: React.FC<{ c: CharacterSpec; skin: string; ink: (s: string) => string; mood: Mood; blink: number; talkOpen: number; lookDx: number }> = ({ c, skin, ink, mood, blink, talkOpen, lookDx }) => {
  const dark = ink(shade(skinColor(c.skin), -0.18)), light = ink(shade(skinColor(c.skin), 0.35));
  const eye = (x: number, y: number, r = 9) => blink < 0.5
    ? <path key={x} d={`M ${x - 11} ${y} Q ${x} ${y + 6} ${x + 11} ${y}`} stroke="#2a1a14" strokeWidth={5} fill="none" strokeLinecap="round" />
    : <g key={x}><ellipse cx={x} cy={y} rx={r + 5} ry={r + 3} fill="#fbf8f2" /><circle cx={x + lookDx * 0.6} cy={y + 1} r={r * 0.75} fill="#2a1a14" /><circle cx={x + lookDx * 0.6 + 2.5} cy={y - 2} r={2.2} fill="#fff" /></g>;
  const browTilt = mood === "angry" ? 7 : mood === "sad" ? -7 : 0;
  if (c.head === "elephant") return (
    <g>
      {[-1, 1].map((s) => <g key={s}><ellipse cx={s * 118} cy={-800} rx={78} ry={100} fill={dark} /><ellipse cx={s * 122} cy={-796} rx={52} ry={72} fill={ink("#e9a3a3")} opacity={c.silhouette ? 0 : 0.55} /></g>)}
      <ellipse cx={0} cy={-812} rx={98} ry={104} fill={skin} />
      {eye(-40, -820, 8)}{eye(40, -820, 8)}
      {[-1, 1].map((s) => <line key={s} x1={s * 24} y1={-846 - browTilt * (s < 0 ? -1 : 1) * 0} x2={s * 58} y2={-850 + browTilt} stroke={dark} strokeWidth={7} strokeLinecap="round" />)}
      {/* trunk: from between the eyes down, curling to one side */}
      <path d={`M -26 -800 Q -30 -700 -16 -650 Q 0 -600 40 -602 Q 66 -606 64 -630 Q 46 -620 32 -628 Q 18 -640 22 -700 Q 26 -760 26 -800 Z`} fill={skin} />
      {[-740, -700, -664].map((y) => <path key={y} d={`M -22 ${y} Q 0 ${y + 6} 22 ${y}`} stroke={dark} strokeWidth={3} fill="none" />)}
      {/* tusks: one whole, one broken */}
      <path d="M -40 -720 Q -66 -690 -72 -656 Q -52 -684 -30 -706 Z" fill={ink("#f7f2e4")} />
      <path d="M 40 -720 Q 52 -708 56 -696 L 44 -700 Z" fill={ink("#f7f2e4")} />
      {talkOpen > 0.1 && <ellipse cx={-48} cy={-708} rx={10} ry={4 + talkOpen * 6} fill="#5a1e1e" />}
      {c.mark !== "none" && <g><line x1={-24} y1={-880} x2={24} y2={-880} stroke="#efe9dd" strokeWidth={5} /><circle cx={0} cy={-868} r={6} fill="#c0392b" /></g>}
    </g>
  );
  if (c.head === "monkey") return (
    <g>
      {[-1, 1].map((s) => <g key={s}><circle cx={s * 92} cy={-812} r={30} fill={dark} /><circle cx={s * 92} cy={-812} r={17} fill={light} /></g>)}
      <ellipse cx={0} cy={-815} rx={90} ry={98} fill={skin} />
      {/* the lighter face: brow ridge over the eyes, a big muzzle below */}
      <path d="M -70 -830 Q -70 -868 -30 -862 Q 0 -850 30 -862 Q 70 -868 70 -830 Q 70 -800 50 -790 Q 70 -760 56 -730 Q 30 -700 0 -702 Q -30 -700 -56 -730 Q -70 -760 -50 -790 Q -70 -800 -70 -830 Z" fill={light} />
      {eye(-32, -828, 8)}{eye(32, -828, 8)}
      <path d="M -50 -852 Q -30 -862 -12 -852 M 12 -852 Q 30 -862 50 -852" stroke={dark} strokeWidth={7} fill="none" strokeLinecap="round" />
      <circle cx={-8} cy={-786} r={4.5} fill={dark} /><circle cx={8} cy={-786} r={4.5} fill={dark} />
      {talkOpen > 0.1 ? <ellipse cx={0} cy={-748} rx={20} ry={5 + talkOpen * 10} fill="#5a1e1e" />
        : <path d={mood === "sad" ? "M -22 -742 Q 0 -756 22 -742" : "M -24 -754 Q 0 -734 24 -754"} stroke="#5a1e1e" strokeWidth={6} fill="none" strokeLinecap="round" />}
      {c.mark !== "none" && <path d="M -10 -900 L 0 -872 L 10 -900" stroke="#d4442a" strokeWidth={8} fill="none" />}
    </g>
  );
  // eagle
  return (
    <g>
      <path d="M -40 -910 Q -20 -980 0 -930 Q 20 -990 40 -912 Z" fill={ink(c.hairColor)} />
      <ellipse cx={0} cy={-815} rx={86} ry={96} fill={skin} />
      {eye(-40, -830, 9)}{eye(40, -830, 9)}
      <path d={`M -60 -856 L -16 ${-846 + browTilt} M 60 -856 L 16 ${-846 + browTilt}`} stroke={dark} strokeWidth={8} strokeLinecap="round" />
      <path d={`M -26 -800 Q 0 -820 26 -800 Q 30 ${-760 + talkOpen * 6} 0 -720 Q -8 -740 -6 -760 Q -20 -770 -26 -800 Z`} fill={ink("#f2a530")} />
      {talkOpen > 0.1 && <path d={`M -18 -770 Q 0 ${-760 + talkOpen * 14} 16 -770`} stroke="#5a1e1e" strokeWidth={5} fill="none" />}
    </g>
  );
};
