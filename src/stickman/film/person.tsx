/**
 * Silhouette people for the film shots: black figures with a soft rim light, joint-based poses that blend into each other,
 * breathing, blinking and (optionally) small white eyes whose brows follow the mood. Origin = the middle of the feet.
 */
import React from "react";

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
  /** the front arm keeps still while walking (it carries something) */
  carry?: boolean;
  /** how far the face turns from the camera towards the way the body faces: 0 = front, 1 = full profile */
  turn?: number;
}

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
  walk: { ...STAND, lean: 3, stride: 26, armF: [0, 8], armB: [0, 8], turn: 1 },
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
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function blendPose(a: PoseParams, b: PoseParams, t: number): PoseParams {
  return {
    lean: lerp(a.lean, b.lean, t), head: lerp(a.head, b.head, t),
    armF: [lerp(a.armF[0], b.armF[0], t), lerp(a.armF[1], b.armF[1], t)],
    armB: [lerp(a.armB[0], b.armB[0], t), lerp(a.armB[1], b.armB[1], t)],
    stride: lerp(a.stride, b.stride, t), shoulders: lerp(a.shoulders, b.shoulders, t), point: t < 0.5 ? a.point : b.point, noLegs: t < 0.5 ? a.noLegs : b.noLegs, seat: t < 0.5 ? a.seat : b.seat, carry: t < 0.5 ? a.carry : b.carry,
    turn: lerp(a.turn ?? 0.75, b.turn ?? 0.75, t),
  };
}

const SKIN = "url(#fl-sil)";
const RIM = "rgba(255,255,255,0.10)";
const UPPER = 150, LOWER = 140, ARM_W = 42, LEG_W = 56;

/** A two-segment limb from (0,0) hanging down, rotated by the shoulder and elbow angles. */
const Limb: React.FC<{ a: [number, number]; upper: number; lower: number; w: number; hand?: "mitt" | "point" | "none" }> = ({ a, upper, lower, w, hand = "none" }) => (
  <g transform={`rotate(${-a[0]})`}>
    <rect x={-w / 2} y={-w / 2} width={w} height={upper + w / 2} rx={w / 2} fill={SKIN} stroke={RIM} strokeWidth={2} />
    <g transform={`translate(0,${upper}) rotate(${-a[1]})`}>
      <rect x={-w / 2 + 3} y={-w / 2} width={w - 6} height={lower + w / 2} rx={(w - 6) / 2} fill={SKIN} stroke={RIM} strokeWidth={2} />
      {hand !== "none" && (
        <g transform={`translate(0,${lower})`}>
          <ellipse cx={0} cy={14} rx={w * 0.62} ry={w * 0.72} fill={SKIN} stroke={RIM} strokeWidth={2} />
          {hand === "point" && <rect x={-5} y={-4 - 44} width={12} height={62} rx={6} fill={SKIN} transform="translate(0,6)" />}
        </g>
      )}
    </g>
  </g>
);

export interface PersonProps {
  who: "customer" | "seller" | "student";
  pose: PoseParams;
  frame: number;
  eyes: boolean;
  mood: "neutral" | "sad" | "worried" | "happy" | "tired" | "sleep" | "angry" | "surprised";
  look: number;
  holds: "box" | "none";
  seed: number;
  shadow?: boolean;
  shirt?: string;
  /** speaking now: the mouth moves */
  talking?: boolean;
}

/** 0 below a, 1 above b, smooth between */
const band = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

export const Person: React.FC<PersonProps> = ({ who, pose, frame, eyes, mood, look, holds, seed, shadow, shirt, talking }) => {
  const breathe = Math.sin((frame + seed * 13) / 22) * 3;
  const sway = Math.sin((frame + seed * 7) / 47) * 1.2;
  const walkPhase = Math.sin(frame * 0.26);
  const strideA = pose.stride * walkPhase;
  const bob = pose.stride ? Math.abs(Math.sin(frame * 0.26)) * -7 : 0;
  // blink: a quick close every ~3.7 s, offset per person
  const bp = (frame + seed * 41) % 112;
  const blink = bp < 4 ? 1 - Math.sin((bp / 4) * Math.PI) * 0.92 : 1;
  const seller = who === "seller";
  const browTilt = mood === "sad" || mood === "worried" ? 14 : mood === "happy" ? -6 : mood === "tired" ? 4 : mood === "angry" ? -16 : 0;
  const browLift = mood === "surprised" ? -8 : 0;
  const lidDrop = mood === "tired" ? 0.5 : 0;
  const closed = mood === "sleep";
  const eyeR = mood === "surprised" ? 1.25 : 1;
  const T = Math.max(0, Math.min(1, pose.turn ?? 0.75));
  // eyes drop a little when the head bows over something
  const gazeY = Math.max(-1, Math.min(1, pose.head / 25));
  // talking: the mouth opens and closes at a speech-like rate
  const talk = talking ? Math.abs(Math.sin(frame * 0.55 + seed)) * (0.6 + 0.4 * Math.abs(Math.sin(frame * 0.19))) : 0;

  return (
    <g>
    {shadow && !pose.noLegs && <ellipse cx={0} cy={2} rx={110 - Math.abs(bob) * 2} ry={16} fill="#000" opacity={0.28} filter="url(#fl-soft2)" />}
    <g transform={`translate(0,${bob})`}>
      {/* legs (not drawn for a seated figure or one behind a counter) */}
      {!pose.noLegs && <g transform="translate(0,-250)">
        <g transform={`translate(-26,0) rotate(${strideA})`}><rect x={-LEG_W / 2} y={-6} width={LEG_W} height={256} rx={LEG_W / 2} fill={SKIN} stroke={RIM} strokeWidth={2} /></g>
        <g transform={`translate(26,0) rotate(${-strideA})`}><rect x={-LEG_W / 2} y={-6} width={LEG_W} height={256} rx={LEG_W / 2} fill={SKIN} stroke={RIM} strokeWidth={2} /></g>
      </g>}
      {pose.seat && (
        <g transform="translate(0,-250)">
          <rect x={-20} y={-28} width={190} height={56} rx={28} fill={SKIN} stroke={RIM} strokeWidth={2} />
          <rect x={132} y={-24} width={52} height={238} rx={26} fill={SKIN} stroke={RIM} strokeWidth={2} />
          <ellipse cx={172} cy={214} rx={44} ry={16} fill={SKIN} />
        </g>
      )}
      {/* back arm */}
      <g transform={`translate(-46,${-400 + pose.shoulders * -0.4}) rotate(${-pose.lean})`}>
        <Limb a={[pose.armB[0] + strideA * -0.6, pose.armB[1]]} upper={UPPER} lower={LOWER} w={ARM_W} hand="mitt" />
      </g>
      {/* torso + head (leans from the hip) */}
      <g transform={`translate(0,-250) rotate(${pose.lean + sway * 0.4})`}>
        <path d={`M-62,0 C-70,-60 -84,-120 -78,${-150 - pose.shoulders * 0.4} C-72,-168 -40,-178 0,-178 C40,-178 72,-168 78,${-150 - pose.shoulders * 0.4} C84,-120 70,-60 62,0 Z`}
          transform={`scale(1,${1 + breathe * 0.004})`} fill={shirt ?? SKIN} stroke={RIM} strokeWidth={2} />
        {shirt && <path d="M-62,0 C-70,-60 -84,-120 -78,-150 C-72,-168 -40,-178 0,-178 C40,-178 72,-168 78,-150 C84,-120 70,-60 62,0 Z" fill="url(#fl-sil)" opacity={0.45} />}
        {seller && <path d="M-26,-176 L-10,-110 M26,-176 L10,-110" stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" fill="none" />}
        <g transform={`translate(0,-190) rotate(${pose.head + sway})`}>
          <rect x={-18} y={-4} width={36} height={36} rx={14} fill={SKIN} transform="translate(0,-14)" />
          {/* nose: only shows as the face turns side-on (drawn first so the head covers its root) */}
          <ellipse cx={54 + 10 * T} cy={-48} rx={6 + 9 * T} ry={11} fill={SKIN} stroke={RIM} strokeWidth={2} opacity={band(0.25, 0.7, T)} />
          <circle cx={0} cy={-62} r={62} fill={SKIN} stroke={RIM} strokeWidth={2} />
          {seller ? (
            <circle cx={-30 - T * 12} cy={-122 + T * 8} r={28} fill={SKIN} stroke={RIM} strokeWidth={2} />
          ) : (
            <path d="M-50,-92 Q-6,-134 52,-96 Q22,-118 -50,-92 Z" fill={SKIN} transform={`translate(${-T * 14},0)`} />
          )}
          {eyes && (
            <g>
              {/* the near eye moves towards the front of the face; the far eye narrows and disappears behind the nose */}
              {[{ x: -22 + T * 48, k: (1 - T * 0.6) * (1 - band(0.55, 0.82, T)), far: true }, { x: 24 + T * 18, k: 1 - T * 0.35, far: false }].map((e, i) => e.k > 0.04 && (
                <g key={i} transform={`translate(${e.x},-60) scale(${e.k},1)`}>
                  {closed ? <path d="M-10,2 Q0,8 10,2" stroke="#f4f4f0" strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.85} /> : <>
                    <ellipse cx={0} cy={0} rx={10 * eyeR} ry={12 * blink * eyeR} fill="#f4f4f0" />
                    <circle cx={Math.max(-5, Math.min(5, look * 4 + T * 3))} cy={1 + gazeY * 3} r={4.4} fill="#0b0b0d" />
                    {lidDrop > 0 && <rect x={-12} y={-13} width={24} height={13 * lidDrop * 2} fill="#0b0b0d" />}
                  </>}
                  {!closed && <path d={`M-14,${-22 + browLift + (e.far ? 1 : -1) * browTilt * 0.3} L14,${-22 + browLift - (e.far ? 1 : -1) * browTilt * 0.3}`} stroke="#f4f4f0" strokeWidth={4} strokeLinecap="round" opacity={0.85} />}
                </g>
              ))}
              {/* the mouth follows the face round and foreshortens */}
              <g transform={`translate(${T * 26},0) scale(${1 - T * 0.45},1)`}>
                {talk > 0.05 ? <ellipse cx={2} cy={-24} rx={9} ry={2 + talk * 8} fill="#f4f4f0" opacity={0.9} />
                  : <>
                    {mood === "happy" && <path d="M-16,-26 Q2,-12 20,-26" stroke="#f4f4f0" strokeWidth={4} fill="none" strokeLinecap="round" />}
                    {(mood === "sad" || mood === "worried" || mood === "angry") && <path d="M-14,-22 Q2,-32 18,-22" stroke="#f4f4f0" strokeWidth={4} fill="none" strokeLinecap="round" />}
                    {mood === "surprised" && <ellipse cx={2} cy={-24} rx={7} ry={9} fill="#f4f4f0" />}
                  </>}
              </g>
              {seller && (
                <g stroke="rgba(255,255,255,0.55)" strokeWidth={3} fill="none">
                  {T < 0.85 && <ellipse cx={-22 + T * 48} cy={-60} rx={19 * (1 - T * 0.6)} ry={19} />}
                  <ellipse cx={24 + T * 18} cy={-60} rx={19 * (1 - T * 0.35)} ry={19} />
                  {T < 0.85 ? <path d={`M${-22 + T * 48 + 19 * (1 - T * 0.6)},-60 L${24 + T * 18 - 19 * (1 - T * 0.35)},-60`} /> : <path d="M26,-62 L-6,-64" />}
                </g>
              )}
            </g>
          )}
        </g>
        {/* front arm hangs from the torso's shoulder */}
        <g transform="translate(50,-148)">
          <Limb a={[pose.armF[0] + (pose.carry ? 0 : strideA * 0.6), pose.armF[1]]} upper={UPPER} lower={LOWER} w={ARM_W} hand={pose.point ? "point" : "mitt"} />
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
