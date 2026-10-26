/**
 * The film's people: joint-based poses that blend into each other, breathing and blinking, a face that turns with what the person
 * is doing (pose.turn: 0 = to the camera, 1 = side-on), and an avatar the story chooses (avatar.ts): age, build, hair, beard,
 * glasses, outfit, colours, skin. The skeleton never changes (rig.ts mirrors it for IK); the avatar is drawing only.
 * Origin = the middle of the feet; +x = the way the figure faces.
 */
import React from "react";
import { SIZE, SKIN_FILL, type Avatar } from "./avatar";

export interface PoseParams {
  /** forward lean of the torso, degrees */
  lean: number;
  /** head tilt (positive = looks down), degrees */
  head: number;
  /** [shoulder, elbow] angles in degrees, 0 = hanging straight down, positive = swinging forward, 180 = straight up */
  armF: [number, number];
  armB: [number, number];
  /** leg swing amplitude, degrees (0 = standing) */
  stride: number;
  shoulders: number;
  /** the front hand has an extended index finger */
  point: boolean;
  /** seated or behind something: no legs drawn (the origin is then the hip line, 250 px above the feet) */
  noLegs?: boolean;
  /** sitting on a bench: thighs forward, shins down (the origin is the hip line, as with noLegs) */
  seat?: boolean;
  /** kneeling: thighs down to the knees, shins flat behind (the director lowers the figure so the shins rest on the floor) */
  kneel?: boolean;
  /** the front arm keeps still while walking (it carries something) */
  carry?: boolean;
  /** how far the face turns from the camera towards the way the body faces: 0 = front, 1 = full profile */
  turn?: number;
  /** the body's own turn while turning round (rig.ts): 1 = side-on as drawn, 0 = facing the camera */
  spin?: number;
  /** walk-cycle phase in radians (rig.ts: from the distance walked); time-based when missing */
  phase?: number;
}

/** a kneeling figure's shins rest 148 below the hip, so the director lowers it by 250 − 148 to put them on the floor */
export const KNEEL_DROP = 250 - 148;

const STAND: PoseParams = { lean: 0, head: 0, armF: [6, 6], armB: [-4, 6], stride: 0, shoulders: 0, point: false, turn: 0.75 };
export const POSES: Record<string, PoseParams> = {
  stand: STAND,
  lean: { ...STAND, lean: 14, head: 6, armF: [35, 55], armB: [30, 60], turn: 0.9 },
  point: { ...STAND, lean: 2, head: -4, armF: [95, 75], armB: [-6, 10], point: true, turn: 0.85 },
  "hand-over": { ...STAND, lean: 8, armF: [84, 12], armB: [40, 60], turn: 1 },
  shrug: { ...STAND, shoulders: 16, head: 8, armF: [22, 78], armB: [-22, 78], turn: 0.15 },
  slump: { ...STAND, lean: 12, head: 20, armF: [-2, 4], armB: [4, 4], shoulders: -8, turn: 0.7 },
  hold: { ...STAND, lean: 3, head: 6, armF: [38, 52], armB: [34, 52], carry: true, turn: 0.85 },
  reach: { ...STAND, lean: 6, armF: [104, 6], armB: [4, 8], turn: 1 },
  walk: { ...STAND, lean: 3, stride: 22, armF: [0, 10], armB: [0, 10], turn: 1 },
  run: { ...STAND, lean: 14, head: -2, stride: 40, armF: [10, 85], armB: [10, 85], turn: 1 },
  sit: { ...STAND, lean: 6, head: 8, armF: [32, 58], armB: [28, 58], noLegs: true, turn: 0.7 },
  "sit-read": { ...STAND, lean: 12, head: 24, armF: [30, 60], armB: [26, 62], noLegs: true, turn: 0.95 },
  "sit-bench": { ...STAND, lean: 10, head: 22, armF: [30, 60], armB: [26, 62], noLegs: true, seat: true, turn: 0.8 },
  "sit-chair": { ...STAND, lean: 4, head: 4, armF: [24, 50], armB: [20, 52], noLegs: true, seat: true, turn: 0.75 },
  "sit-hold": { ...STAND, lean: 6, head: 18, armF: [52, 82], armB: [46, 82], noLegs: true, seat: true, carry: true, turn: 0.9 },
  "sit-slump": { ...STAND, lean: 20, head: 28, armF: [12, 30], armB: [8, 30], shoulders: -8, noLegs: true, seat: true, turn: 0.65 },
  lie: { ...STAND, armF: [3, 2], armB: [-3, 2], turn: 1 },
  think: { ...STAND, head: -6, armF: [70, 118], armB: [30, 70], turn: 0.45 },
  cry: { ...STAND, lean: 8, head: 22, armF: [122, 112], armB: [112, 112], shoulders: -6, turn: 0.3 },
  cheer: { ...STAND, head: -10, armF: [168, 8], armB: [160, 8], shoulders: 8, turn: 0.15 },
  "arms-crossed": { ...STAND, armF: [48, 104], armB: [40, 104], turn: 0.35 },
  facepalm: { ...STAND, lean: 6, head: 16, armF: [126, 104], armB: [-4, 8], turn: 0.55 },
  "look-up": { ...STAND, head: -16, armF: [8, 8], armB: [-6, 8], turn: 0.8 },
  wave: { ...STAND, armF: [110, 60], armB: [-4, 6], turn: 0.3 },
  laugh: { ...STAND, head: -12, shoulders: 6, armF: [14, 40], armB: [-14, 40], turn: 0.35 },
  jump: { ...STAND, head: -8, armF: [150, 20], armB: [140, 20], turn: 0.5 },
  crouch: { ...STAND, lean: 22, head: 6, armF: [40, 40], armB: [30, 40], turn: 0.8 },
  kneel: { ...STAND, lean: 4, head: 6, armF: [20, 30], armB: [16, 30], kneel: true, noLegs: true, turn: 0.8 },
  pray: { ...STAND, lean: 2, head: 14, armF: [62, 112], armB: [58, 112], kneel: true, noLegs: true, turn: 0.9 },
  "clap-a": { ...STAND, head: -4, armF: [78, 44], armB: [74, 44], turn: 0.5 },
  "clap-b": { ...STAND, head: -4, armF: [62, 14], armB: [58, 14], turn: 0.5 },
  hug: { ...STAND, lean: 8, head: 4, armF: [86, 64], armB: [84, 70], turn: 1 },
  "dance-a": { ...STAND, lean: -6, head: -8, armF: [150, 30], armB: [40, 80], shoulders: 6, turn: 0.4 },
  "dance-b": { ...STAND, lean: 6, head: 6, armF: [40, 80], armB: [150, 30], shoulders: -4, turn: 0.4 },
  push: { ...STAND, lean: 18, head: 0, armF: [88, 8], armB: [84, 8], stride: 10, turn: 1 },
  bow: { ...STAND, lean: 34, head: 14, armF: [4, 4], armB: [-2, 4], turn: 0.9 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function blendPose(a: PoseParams, b: PoseParams, t: number): PoseParams {
  return {
    lean: lerp(a.lean, b.lean, t), head: lerp(a.head, b.head, t),
    armF: [lerp(a.armF[0], b.armF[0], t), lerp(a.armF[1], b.armF[1], t)],
    armB: [lerp(a.armB[0], b.armB[0], t), lerp(a.armB[1], b.armB[1], t)],
    stride: lerp(a.stride, b.stride, t), shoulders: lerp(a.shoulders, b.shoulders, t), point: t < 0.5 ? a.point : b.point, noLegs: t < 0.5 ? a.noLegs : b.noLegs, seat: t < 0.5 ? a.seat : b.seat, carry: t < 0.5 ? a.carry : b.carry,
    kneel: t < 0.5 ? a.kneel : b.kneel,
    turn: lerp(a.turn ?? 0.75, b.turn ?? 0.75, t),
  };
}

const UPPER = 150, LOWER = 140, ARM_W = 42, LEG_W = 56;
/** 0 below a, 1 above b, smooth between */
const band = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

/** The paint for one figure: skin, clothes, outline, and the colour of facial features drawn on the skin. */
interface Paint { skin: string; line: string; lineW: number; top: string; bottom: string; shade: number; ink: string; white: string; pupil: string; hair: string; silhouette: boolean }
function paintOf(av: Avatar): Paint {
  const sil = av.skin === "silhouette";
  return {
    skin: SKIN_FILL[av.skin], silhouette: sil,
    // silhouettes get the soft rim light; drawn skin a thin dark outline
    line: sil ? "rgba(255,255,255,0.10)" : "rgba(20,14,10,0.55)", lineW: sil ? 2 : 3,
    top: av.top, bottom: av.bottom ?? SKIN_FILL[av.skin], shade: sil ? 0.45 : 0.16,
    ink: sil ? "#f4f4f0" : "#2a1d17", white: "#f6f4ee", pupil: sil ? "#0b0b0d" : "#1d1410", hair: av.hairColor,
  };
}

/** A two-segment limb from (0,0) hanging down, rotated by the shoulder and elbow angles; sleeves in the top colour. */
const Limb: React.FC<{ a: [number, number]; w: number; hand?: "mitt" | "point" | "none"; p: Paint; sleeve: "full" | "short" | "none" }> = ({ a, w, hand = "none", p, sleeve }) => {
  const up = sleeve === "none" ? p.skin : p.top, low = sleeve === "full" ? p.top : p.skin;
  return (
    <g transform={`rotate(${-a[0]})`}>
      <rect x={-w / 2} y={-w / 2} width={w} height={UPPER + w / 2} rx={w / 2} fill={up} stroke={p.line} strokeWidth={p.lineW} />
      {sleeve !== "none" && <rect x={-w / 2} y={-w / 2} width={w} height={UPPER + w / 2} rx={w / 2} fill="url(#fl-sil)" opacity={p.shade * 0.6} />}
      <g transform={`translate(0,${UPPER}) rotate(${-a[1]})`}>
        <rect x={-w / 2 + 3} y={-w / 2} width={w - 6} height={LOWER + w / 2} rx={(w - 6) / 2} fill={low} stroke={p.line} strokeWidth={p.lineW} />
        {sleeve === "short" && <rect x={-w / 2 + 3} y={-w / 2} width={w - 6} height={4} fill={p.top} />}
        {hand !== "none" && (
          <g transform={`translate(0,${LOWER})`}>
            <ellipse cx={0} cy={14} rx={w * 0.6} ry={w * 0.7} fill={p.skin} stroke={p.line} strokeWidth={p.lineW} />
            {hand === "point" && <rect x={-5} y={-42} width={12} height={62} rx={6} fill={p.skin} />}
          </g>
        )}
      </g>
    </g>
  );
};

/** A leg from the hip: thigh, a knee that bends backwards (positive = the foot swings back and up), shin and a forward shoe. */
const Leg: React.FC<{ p: Paint; dx: number; a: number; knee: number; spin: number }> = ({ p, dx, a, knee, spin }) => (
  <g transform={`translate(${dx},0) rotate(${a})`}>
    <rect x={-LEG_W / 2} y={-6} width={LEG_W} height={138} rx={LEG_W / 2} fill={p.bottom} stroke={p.line} strokeWidth={p.lineW} />
    {!p.silhouette && <rect x={-LEG_W / 2} y={-6} width={LEG_W} height={138} rx={LEG_W / 2} fill="url(#fl-sil)" opacity={p.shade} />}
    <g transform={`translate(0,125) rotate(${knee}) translate(0,-125)`}>
    <rect x={-LEG_W / 2 + 2} y={100} width={LEG_W - 4} height={150} rx={(LEG_W - 4) / 2} fill={p.bottom} stroke={p.line} strokeWidth={p.lineW} />
    {!p.silhouette && <rect x={-LEG_W / 2 + 2} y={100} width={LEG_W - 4} height={150} rx={(LEG_W - 4) / 2} fill="url(#fl-sil)" opacity={p.shade} />}
    {/* the shoe points the way the body faces; facing the camera it is seen toe-on, short and centred */}
    <path d="M-26,236 Q-26,222 -8,222 L22,224 Q46,228 46,242 Q46,252 30,252 L-20,252 Q-26,252 -26,244 Z" transform={`translate(${(1 - spin) * -8},0) scale(${0.5 + 0.5 * spin},1)`} fill={p.silhouette ? p.skin : "#1b1b1f"} stroke={p.line} strokeWidth={p.lineW} />
    </g>
  </g>
);

export interface PersonProps {
  avatar: Avatar;
  pose: PoseParams;
  frame: number;
  eyes: boolean;
  mood: "neutral" | "sad" | "worried" | "happy" | "tired" | "sleep" | "angry" | "surprised";
  look: number;
  holds: "box" | "none";
  seed: number;
  shadow?: boolean;
  /** speaking now: the mouth moves */
  talking?: boolean;
  /** seated: how far below the hip line the soles are (fits the seat height; a child's feet dangle) */
  seatSole?: number;
}

export const Person: React.FC<PersonProps> = ({ avatar: av, pose, frame, eyes, mood, look, holds, seed, shadow, talking, seatSole }) => {
  const p = paintOf(av);
  const sole = seatSole ?? 228;
  const breathe = Math.sin((frame + seed * 13) / 22) * 3;
  const sway = Math.sin((frame + seed * 7) / 47) * 1.2;
  // walk cycle (rig.ts mirrors this for the hands): thighs swing with the phase, the swinging leg's knee bends to lift the foot
  const ph = pose.phase ?? frame * 0.26;
  const strideA = pose.stride * Math.sin(ph);
  const bob = pose.stride ? -7 * Math.min(1.2, pose.stride / 26) * Math.cos(ph) ** 2 : 0;
  const kneeK = Math.min(1.4, pose.stride / 26);
  // the rig (rig.ts) computes hands from pose.lean, so the drawing must use exactly that
  const lean = pose.lean;
  // turning round: 0 = facing the camera (front details move to the middle of the chest)
  const spin = pose.spin ?? 1;
  // torso width: build and gender
  const wF = (av.build === "slim" ? 0.88 : av.build === "heavy" ? 1.2 : 1) * (av.gender === "female" ? 0.93 : 1);
  const sleeve = av.outfit === "tshirt" || av.outfit === "dress" ? "short" : "full";
  const skirt = av.outfit === "kurta" ? 120 : av.outfit === "dress" ? 140 : av.outfit === "saree" ? 236 : 0;
  const torsoPath = (sh: number) => `M${-62 * wF},0 C${-70 * wF},-60 ${-84 * wF},-120 ${-78 * wF},${-150 - sh} C${-72 * wF},-168 ${-40 * wF},-178 0,-178 C${40 * wF},-178 ${72 * wF},-168 ${78 * wF},${-150 - sh} C${84 * wF},-120 ${70 * wF},-60 ${62 * wF},0 Z`;

  return (
    <g>
      {shadow && !pose.noLegs && <ellipse cx={0} cy={2} rx={110 - Math.abs(bob) * 2} ry={16} fill="#000" opacity={0.28} filter="url(#fl-soft2)" />}
      <g transform={`translate(0,${bob})`}>
        {/* back arm (behind everything) */}
        <g transform={`translate(${-46 * wF},${-400 + pose.shoulders * -0.4}) rotate(${-lean})`}>
          <Limb a={[pose.armB[0] + strideA * -0.6, pose.armB[1]]} w={ARM_W} hand="mitt" p={p} sleeve={sleeve} />
        </g>
        {/* legs */}
        {!pose.noLegs && (
          <g transform="translate(0,-250)">
            <Leg p={p} dx={-26} a={strideA} knee={kneeK * (4 + 30 * Math.max(0, -Math.cos(ph)))} spin={spin} />
            <Leg p={p} dx={26} a={-strideA} knee={kneeK * (4 + 30 * Math.max(0, Math.cos(ph)))} spin={spin} />
          </g>
        )}
        {pose.seat && (
          <g transform="translate(0,-250)">
            <rect x={-20} y={-28} width={190} height={56} rx={28} fill={p.bottom} stroke={p.line} strokeWidth={p.lineW} />
            <rect x={132} y={-24} width={52} height={sole - 4} rx={26} fill={p.bottom} stroke={p.line} strokeWidth={p.lineW} />
            <path d="M136,206 Q136,192 154,192 L184,194 Q208,198 208,212 Q208,222 192,222 L142,222 Q136,222 136,214 Z" transform={`translate(0,${sole - 222})`} fill={p.silhouette ? p.skin : "#1b1b1f"} />
          </g>
        )}
        {pose.kneel && (
          <g transform="translate(0,-250)">
            <rect x={-6} y={-24} width={56} height={150} rx={28} fill={p.bottom} stroke={p.line} strokeWidth={p.lineW} transform="rotate(-8)" />
            <rect x={-130} y={96} width={170} height={52} rx={26} fill={p.bottom} stroke={p.line} strokeWidth={p.lineW} />
            <path d="M-150,100 Q-162,100 -162,116 L-162,146 Q-162,152 -150,152 L-128,152 L-128,100 Z" fill={p.silhouette ? p.skin : "#1b1b1f"} />
          </g>
        )}
        {/* long clothes over the legs: kurta, dress, saree (over the thighs when seated) */}
        {skirt > 0 && !pose.noLegs && (
          <g transform="translate(0,-250)">
            <path d={`M${-64 * wF},-10 L${64 * wF},-10 L${(66 + skirt * 0.12) * wF + Math.abs(strideA) * 1.6},${skirt} L${-(66 + skirt * 0.12) * wF - Math.abs(strideA) * 1.6},${skirt} Z`} fill={p.top} stroke={p.line} strokeWidth={p.lineW} />
            <path d={`M${-64 * wF},-10 L${64 * wF},-10 L${(66 + skirt * 0.12) * wF},${skirt} L${-(66 + skirt * 0.12) * wF},${skirt} Z`} fill="url(#fl-sil)" opacity={p.shade} />
            {av.outfit === "saree" && av.bottom && <rect x={-(66 + skirt * 0.12) * wF - Math.abs(strideA) * 1.6} y={skirt - 16} width={2 * ((66 + skirt * 0.12) * wF + Math.abs(strideA) * 1.6)} height={16} fill={av.bottom} />}
          </g>
        )}
        {skirt > 0 && pose.seat && (
          <g transform="translate(0,-250)">
            <rect x={-30 * wF} y={-34} width={skirt > 130 ? 214 : 160 + skirt * 0.2} height={66} rx={30} fill={p.top} stroke={p.line} strokeWidth={p.lineW} />
            {skirt > 200 && <rect x={128} y={-20} width={62} height={sole - 12} rx={24} fill={p.top} stroke={p.line} strokeWidth={p.lineW} />}
          </g>
        )}
        {/* torso + head (lean from the hip) */}
        <g transform={`translate(0,-250) rotate(${lean + sway * 0.4})`}>
          <path d={torsoPath(pose.shoulders * 0.4)} transform={`scale(1,${1 + breathe * 0.004})`} fill={p.top} stroke={p.line} strokeWidth={p.lineW} />
          {av.build === "heavy" && <ellipse cx={50 * wF * spin} cy={-66} rx={40 + (1 - spin) * 16} ry={58} fill={p.top} />}
          <path d={torsoPath(pose.shoulders * 0.4)} fill="url(#fl-sil)" opacity={p.shade} />
          {/* outfit details (on the front of the chest: they come to the middle as the body turns to the camera) */}
          <g transform={`translate(${-(1 - spin) * 52 * wF},0)`}>
          {av.outfit === "jacket" && <path d={`M${52 * wF},-172 L${30 * wF},-60 L${54 * wF},-2 L${66 * wF},-2 L${74 * wF},-150 Z`} fill="#e9e6df" opacity={0.85} />}
          {av.outfit === "uniform" && <><path d={`M${56 * wF},-170 L${40 * wF},-150 L${66 * wF},-150 Z`} fill="#f2f0ea" /><path d={`M${52 * wF},-150 L${44 * wF},-80 L${56 * wF},-66 L${64 * wF},-80 L${58 * wF},-150 Z`} fill="#8e2a2a" /></>}
          {av.outfit === "kurta" && <path d={`M${58 * wF},-172 L${58 * wF},-110`} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" />}
          </g>
          {av.outfit === "saree" && <path d={`M${-70 * wF},-160 L${-40 * wF},-178 L${76 * wF},-30 L${62 * wF},0 Z`} fill={av.bottom ?? "#e0b84a"} opacity={0.9} />}
          <Head av={av} p={p} pose={pose} frame={frame} seed={seed} sway={sway} eyes={eyes} mood={mood} look={look} talking={!!talking} />
          {/* front arm hangs from the torso's shoulder */}
          <g transform="translate(50,-148)">
            <Limb a={[pose.armF[0] + (pose.carry ? 0 : strideA * 0.6), pose.armF[1]]} w={ARM_W} hand={pose.point ? "point" : "mitt"} p={p} sleeve={sleeve} />
          </g>
          {holds === "box" && (
            <g transform="translate(96,-70)">
              <rect x={-70} y={-34} width={140} height={68} rx={4} fill="#5f7184" stroke="#2f3946" strokeWidth={3} />
              <rect x={-70} y={-34} width={140} height={14} fill="#7c8ea1" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

/**
 * The head, in the neck's frame (neck at 0,0). A round cranium over a narrower jaw makes an egg from the front. Turning side-on
 * (T: 0 → 1 = the head turns 0 → 90°) every feature sits at an angle on a ball and SLIDES, nothing fades (a half-transparent eye or
 * nose reads as a ghost): x = r·sin(angle + turn), narrowed by cos(angle + turn). The eye on the side the head turns towards goes
 * round the front edge and disappears behind the nose; the other eye becomes the side-on eye; the near ear comes round to the
 * middle of the head and the far ear goes behind it.
 */
const Head: React.FC<{ av: Avatar; p: Paint; pose: PoseParams; frame: number; seed: number; sway: number; eyes: boolean; mood: PersonProps["mood"]; look: number; talking: boolean }> = ({ av, p, pose, frame, seed, sway, eyes, mood, look, talking }) => {
  const T = Math.max(0, Math.min(1, pose.turn ?? 0.75));
  const st = Math.sin((T * Math.PI) / 2); // how far round a point on the face has travelled
  const size = SIZE[av.age];
  const female = av.gender === "female";
  // blink: a quick close every ~3.7 s, offset per person
  const bp = (frame + seed * 41) % 112;
  const blink = bp < 4 ? 1 - Math.sin((bp / 4) * Math.PI) * 0.92 : 1;
  const browTilt = mood === "sad" || mood === "worried" ? 14 : mood === "happy" ? -6 : mood === "tired" ? 4 : mood === "angry" ? -16 : 0;
  const browLift = mood === "surprised" ? -8 : 0;
  const lidDrop = mood === "tired" ? 0.5 : 0;
  const closed = mood === "sleep";
  const eyeR = (mood === "surprised" ? 1.2 : 1) * size.eyes;
  const gazeY = Math.max(-1, Math.min(1, pose.head / 25));
  // alive when still: the head drifts a little, and eyes that are not looking at anything glance about now and then
  const still = pose.stride < 1 ? 1 : 0;
  const drift = still * (Math.sin(frame / 71 + seed * 3) * 2 + Math.sin(frame / 29 + seed) * 0.7);
  const glanceN = Math.floor((frame + seed * 37) / 64), glanceT = (frame + seed * 37) % 64;
  const glance = Math.abs(look) < 0.15 && still ? (((glanceN * 7919 + seed * 31) % 5) - 2) * 0.22 * Math.min(1, glanceT / 3) : 0;
  const talk = talking ? Math.abs(Math.sin(frame * 0.55 + seed)) * (0.6 + 0.4 * Math.abs(Math.sin(frame * 0.19))) : 0;

  // geometry
  const R = 58, cx = -5 * T, cy = -68; // cranium
  const jx = 6 * T, jy = -44, jrx = (female ? 44 : 47) - T * 2, jry = female ? 38 : 40; // jaw
  const eyeY = -62;
  const phi = (T * Math.PI) / 2, EYE = (32 * Math.PI) / 180, RE = 40;
  // "near": the eye that ends up side-on (starts on the far side of the turn); "far": the one that goes round behind the nose
  const near = { x: RE * Math.sin(phi - EYE), k: Math.max(0.55, Math.cos(phi - EYE)) };
  const far = { x: RE * Math.sin(phi + EYE), k: Math.max(0.08, Math.cos(phi + EYE)), on: phi + EYE < Math.PI / 2 };
  const mouthX = st * 33, mouthY = -25;
  const nose = { x: st * 56 + T * 4, rx: 6 + 6 * T, ry: 6 + 2.5 * T, y: -45 };
  const earN = -56 + 50 * st, earF = 56 - 72 * st;
  const id = `hd${seed}`;

  // hair cap: an arc band over the top that slides to the back of the head as it turns
  const a0 = ((200 - 78 * T) * Math.PI) / 180, a1 = ((340 - 18 * T) * Math.PI) / 180;
  const Rh = R + 4;
  const px = (a: number, r = Rh) => cx + Math.cos(a) * r, py = (a: number, r = Rh) => cy + Math.sin(a) * r;
  const pt = (a: number, r = Rh) => `${px(a, r).toFixed(1)},${py(a, r).toFixed(1)}`;
  const capPath = (dip: number) => `M${pt(a0)} A${Rh},${Rh} 0 0 1 ${pt(a1)} Q${(cx + 6 - 26 * T).toFixed(1)},${(cy - R * dip).toFixed(1)} ${pt(a0)} Z`;
  const hairFill = { fill: p.hair, stroke: p.line, strokeWidth: p.lineW };
  // a side parting is lopsided: it grows in from nothing as the head turns, so the mirror at the front shows no jump
  const part = band(0.08, 0.45, T);

  const skull = (
    <>
      <circle cx={cx} cy={cy} r={R} />
      <ellipse cx={jx} cy={jy} rx={jrx} ry={jry} />
    </>
  );
  const ear = (x: number) => (
    <g>
      <ellipse cx={x} cy={-56} rx={9} ry={14} fill={p.skin} stroke={p.line} strokeWidth={p.lineW} />
      {!p.silhouette && <path d={`M${x + 3},-64 Q${x - 4},-56 ${x + 2},-48`} fill="none" stroke={p.line} strokeWidth={2.5} />}
    </g>
  );
  const eye = (e: { x: number; k: number }, isFar: boolean) => (
    <g transform={`translate(${e.x},${eyeY}) scale(${e.k * eyeR},${eyeR})`}>
      {closed ? <path d="M-10,2 Q0,8 10,2" stroke={p.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.85} /> : <>
        <ellipse cx={0} cy={0} rx={10.5} ry={12.5 * blink} fill={p.white} stroke={p.silhouette ? "none" : p.pupil} strokeWidth={1.5} />
        <circle cx={Math.max(-5, Math.min(5, (look + glance) * 4 + T * 3))} cy={1 + gazeY * 3} r={4.8 * blink} fill={p.pupil} />
        {lidDrop > 0 && <rect x={-12} y={-14} width={24} height={14 * lidDrop * 2} fill={p.skin} />}
      </>}
      {!closed && <path d={`M-14,${-21 + browLift + (isFar ? 1 : -1) * browTilt * 0.3} L14,${-21 + browLift - (isFar ? 1 : -1) * browTilt * 0.3}`} stroke={old(av) ? "#d8d8d4" : av.skin === "silhouette" ? p.ink : p.hair} strokeWidth={female ? 3.5 : 4.5} strokeLinecap="round" opacity={0.9} />}
      {female && !closed && <path d="M8,-10 L14,-15" stroke={p.silhouette ? p.ink : p.pupil} strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />}
    </g>
  );
  const glass = p.silhouette ? "rgba(255,255,255,0.55)" : "#1d1d22";

  return (
    <g transform={`translate(0,-190) rotate(${pose.head + sway + drift}) scale(${size.head})`}>
      <defs><clipPath id={id}><ellipse cx={jx} cy={jy} rx={jrx + 2} ry={jry + 2} /></clipPath></defs>
      {/* behind the head: long hair, ponytail, hijab drape, the far ear (and, on a silhouette, the near ear: inside the head it would read as an eye) */}
      {av.hair === "long" && <path d={`M${-R - 6},${-70} Q${-R - 10},${30} ${-R + 4},${46} L${R + 4 - (R + 10) * T},${46} Q${R + 10 - (R + 10) * T},${30} ${R + 6 - (R + 6) * T},-70 Z`} {...hairFill} />}
      {av.hair === "ponytail" && <path d={`M${cx - R * 0.6 * st},${cy + 6} Q${cx - (R + 30) * st + Math.sin(frame / 9) * 4},${cy + 40} ${cx - (R + 14) * st + Math.sin(frame / 9) * 8},${cy + 110} Q${cx - (R - 6) * st},${cy + 60} ${cx - R * 0.3 * st},${cy + 14} Z`} {...hairFill} />}
      {av.hair === "hijab" && <path d={`M${cx - R - 12},${cy} Q${cx - R - 20},${cy + 110} ${cx - R - 4},${cy + 150} L${cx + R + 6 - 30 * T},${cy + 150} Q${cx + R + 16 - 30 * T},${cy + 100} ${cx + R + 12},${cy}`} {...hairFill} />}
      {ear(earF)}
      {p.silhouette && ear(earN)}
      {/* neck */}
      <rect x={-18} y={-18} width={36} height={36} rx={14} fill={p.skin} />
      {/* the head: outline pass, then fill pass (so the overlapping shapes read as one outline) */}
      <g fill={p.skin} stroke={p.line} strokeWidth={p.lineW * 2}>{skull}</g>
      <g fill={p.skin}>{skull}</g>
      {!p.silhouette && av.hair !== "hijab" && ear(earN)}
      {/* beard / stubble on the jaw */}
      {(av.beard === "beard" || av.beard === "stubble") && (
        <g clipPath={`url(#${id})`} opacity={av.beard === "stubble" ? 0.35 : 1}>
          <path d={`M${-70},${-44} Q${jx},${-24} ${70},${-44} L70,10 L-70,10 Z`} fill={p.hair} transform={`translate(${-14 + 18 * st},0)`} />
        </g>
      )}
      {/* hair on top */}
      {av.hair !== "bald" && av.hair !== "hijab" && av.hair !== "cap" && <path d={capPath(av.hair === "side-part" ? 0.55 + 0.07 * part : 0.55)} {...hairFill} />}
      {av.hair === "bald" && old(av) && <path d={`M${pt((160 - 40 * T) * Math.PI / 180, R + 2)} Q${cx - R + 2},${cy + 4} ${pt((215 - 50 * T) * Math.PI / 180, R + 2)}`} fill="none" stroke={p.hair} strokeWidth={10} strokeLinecap="round" />}
      {av.hair === "spiky" && [0.3, 0.5, 0.7].map((u) => { const a = a0 + (a1 - a0) * u; return <path key={u} d={`M${pt(a - 0.12)} L${pt(a, Rh + 22)} L${pt(a + 0.12)} Z`} {...hairFill} />; })}
      {av.hair === "side-part" && part > 0.01 && (
        <path transform={`translate(${px(a1)},${py(a1)}) scale(${part}) translate(${-px(a1)},${-py(a1)})`}
          d={`M${pt(a1 - 0.5)} Q${cx + 40 + 10 * T},${cy - R - 8} ${pt(a1 + 0.08, Rh)} Q${cx + 30 + 14 * T},${cy - R * 0.5} ${pt(a1 - 0.5)} Z`} {...hairFill} />
      )}
      {av.hair === "curly" && Array.from({ length: 7 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 6; return <circle key={i} cx={px(a, R + 2)} cy={py(a, R + 2)} r={17} {...hairFill} />; })}
      {av.hair === "bun" && <circle cx={cx + 4 - (R * 0.75) * st} cy={cy - R - 6 + 22 * st} r={24} {...hairFill} />}
      {av.hair === "long" && <path d={capPath(0.42)} {...hairFill} />}
      {av.hair === "cap" && (
        <g>
          <path d={`M${pt(Math.PI * 1.02)} A${R + 4},${R + 4} 0 0 1 ${pt(Math.PI * 1.98)} Z`} fill={p.hair} stroke={p.line} strokeWidth={p.lineW} />
          <path d={`M${cx + R * 0.2 + 30 * st},${cy - 8} L${cx + R + 2 + 44 * st},${cy - 6} Q${cx + R + 10 + 44 * st},${cy} ${cx + R + 44 * st},${cy + 4} L${cx - R * (1 - st) * 0.9},${cy + 4} Z`} fill={p.hair} stroke={p.line} strokeWidth={p.lineW} opacity={0.95} />
        </g>
      )}
      {av.hair === "hijab" && (
        <path fillRule="evenodd" d={`M${cx - R - 12},${cy} a${R + 12},${R + 12} 0 1 1 ${2 * (R + 12)},0 L${cx + R + 12},${cy + 40} L${cx - R - 12},${cy + 40} Z M${jx + 14 * st - 38 + 6 * T},${-56} a${38 - 6 * T},46 0 1 0 ${2 * (38 - 6 * T)},0 a${38 - 6 * T},46 0 1 0 ${-2 * (38 - 6 * T)},0 Z`} {...hairFill} />
      )}
      {/* face: nose first (it travels from the middle of the face out to the edge), then the far eye, then the near eye over it */}
      {eyes && (
        <g>
          {far.on && eye(far, true)}
          {av.glasses && far.on && (
            <g stroke={glass} strokeWidth={3} fill="none">
              <ellipse cx={far.x} cy={eyeY} rx={19 * far.k} ry={18} />
              <path d={`M${near.x + 19 * near.k},${eyeY} L${far.x - 19 * far.k},${eyeY}`} />
            </g>
          )}
          {/* the nose is in front of the eye going round the edge, and hides it as it goes */}
          {/* the bridge of the nose: skin on skin (invisible on the face), it covers the far eye and brow as they go round; it
              reaches up to the brow only once the head has turned, so from the front it never touches the brows */}
          <path d={`M${50 * st},${eyeY - 8 - 18 * band(0.15, 0.45, T)} L${nose.x - 3 * T},${nose.y - 2}`} stroke={p.skin} strokeWidth={17} strokeLinecap="round" />
          <ellipse cx={nose.x} cy={nose.y} rx={nose.rx} ry={nose.ry} fill={p.skin} stroke={p.silhouette ? "none" : p.line} strokeWidth={p.lineW} />
          {eye(near, false)}
          {av.glasses && (
            <g stroke={glass} strokeWidth={3} fill="none">
              <ellipse cx={near.x} cy={eyeY} rx={19 * near.k} ry={18} />
              {/* the arm of the glasses grows back towards the ear as the head turns */}
              <path d={`M${near.x - 19 * near.k},${eyeY - 2} L${near.x - 19 * near.k + (earN + 6 - near.x + 19 * near.k) * band(0.35, 0.85, T)},${eyeY - 4}`} />
            </g>
          )}
          {old(av) && <path d={`M${near.x + 13},${eyeY + 4} l6,3 M${near.x + 13},${eyeY + 9} l5,1`} stroke={p.ink} strokeWidth={2} opacity={0.5} />}
          {av.beard === "mustache" && <rect x={mouthX - 15 * (1 - T * 0.45)} y={mouthY - 12} width={30 * (1 - T * 0.45)} height={8} rx={4} fill={p.hair} />}
          <g transform={`translate(${mouthX},0) scale(${1 - T * 0.45},1)`}>
            {talk > 0.05 ? <ellipse cx={0} cy={mouthY} rx={9} ry={2 + talk * 8} fill={p.silhouette ? p.ink : "#5a2420"} opacity={0.9} />
              : <>
                {mood === "happy" && <path d={`M-16,${mouthY - 2} Q0,${mouthY + 12} 16,${mouthY - 2}`} stroke={p.ink} strokeWidth={4} fill="none" strokeLinecap="round" />}
                {(mood === "sad" || mood === "worried" || mood === "angry") && <path d={`M-14,${mouthY + 2} Q0,${mouthY - 8} 14,${mouthY + 2}`} stroke={p.ink} strokeWidth={4} fill="none" strokeLinecap="round" />}
                {mood === "surprised" && <ellipse cx={0} cy={mouthY} rx={7} ry={9} fill={p.silhouette ? p.ink : "#5a2420"} />}
                {(mood === "neutral" || mood === "tired") && !p.silhouette && <path d={`M-8,${mouthY} L8,${mouthY}`} stroke={p.ink} strokeWidth={3} strokeLinecap="round" opacity={0.7} />}
              </>}
          </g>
        </g>
      )}
    </g>
  );
};
const old = (av: Avatar) => av.age === "old";
