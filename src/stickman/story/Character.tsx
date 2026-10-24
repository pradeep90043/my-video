import React from "react";
import { ACTION_POSES, type CastMember, type CharMood, type CharPose } from "./cast";
import { StoryPropArt, type StoryPropName } from "./StoryProps";
import { AnimalCharacter } from "./Animal";

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
  flip?: boolean | number;
  /** 0..1 pulse that peaks at each spoken word: drives the gesture and the nod of whoever is speaking */
  energy?: number;
  /** changes every few words: picks the next gesture of the speaker */
  gesture?: number;
  /** someone else is speaking: nods, looks, breathes */
  listening?: boolean;
  /** 0..1: how much of the beat's acting is on (eases in and out of the sentence, so arms never snap) */
  envelope?: number;
  /** 0..1: how much of the staged pose (arms up, hands on hips...) is still held; it fades after about a second into gestures / rest */
  poseWeight?: number;
  /** an object in the hand */
  holds?: StoryPropName;
  /** no / yes / shrug / surprise / laugh: a head movement answering someone */
  react?: string;
  /** the pose the character comes FROM and how far into the new one it is (0..1, springy): poses glide into each other instead of snapping */
  prevPose?: CharPose;
  blend?: number;
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
  run: { rt: 35, rf: 70, lt: 35, lf: 70, tilt: 0, lean: 14, headDrop: 0 },
  cry: { rt: 36, rf: 145, lt: 36, lf: 145, tilt: -3, lean: 3, headDrop: 12 },
  pray: { rt: 14, rf: 150, lt: 14, lf: 150, tilt: 0, lean: 2, headDrop: 8 },
  hug: { rt: 72, rf: 35, lt: 72, lf: 35, tilt: 0, lean: 8, headDrop: 0 },
  give: { rt: 88, rf: 6, lt: 8, lf: 10, tilt: 0, lean: 5, headDrop: 0 },
  eat: { rt: 22, rf: 148, lt: 8, lf: 10, tilt: 0, lean: 2, headDrop: 3 },
  sleep: { rt: 6, rf: 8, lt: 6, lf: 8, tilt: 0, lean: 0, headDrop: 0 },
  dance: { rt: 140, rf: 20, lt: 140, lf: 20, tilt: 0, lean: 0, headDrop: 0 },
  fight: { rt: 80, rf: 30, lt: 30, lf: 100, tilt: 0, lean: 6, headDrop: 0 },
  carry: { rt: 62, rf: 82, lt: 62, lf: 82, tilt: 0, lean: 4, headDrop: 0 },
  struggle: { rt: 70, rf: 40, lt: 70, lf: 40, tilt: 0, lean: 6, headDrop: 0 },
  push: { rt: 82, rf: 8, lt: 82, lf: 8, tilt: 0, lean: 18, headDrop: 0 },
  shout: { rt: 40, rf: 125, lt: 40, lf: 125, tilt: -6, lean: -3, headDrop: -4 },
  tired: { rt: 14, rf: 18, lt: 14, lf: 18, tilt: 3, lean: 14, headDrop: 18 },
  jump: { rt: 150, rf: 12, lt: 150, lf: 12, tilt: 0, lean: 0, headDrop: 0 },
};

export const Character: React.FC<Props> = ({ member: m, pose: poseIn, prevPose, blend = 1, mood, frame, talking, mouthLevel, flip, energy = 0, gesture = 0, listening = false, envelope = 1, poseWeight = 1, holds, react }) => {
  const pose: CharPose = prevPose && blend < 0.5 ? prevPose : poseIn; // the pose that dominates right now (face, mouth, props follow it)
  const poseA: CharPose = prevPose ?? poseIn, poseB: CharPose = poseIn;
  const bt = prevPose ? Math.max(0, Math.min(1.25, blend)) : 1;
  // a real animal is drawn as one: four legs, a tail, a snout (a monkey stays upright)
  if (m.species && m.species !== "monkey") {
    return <g transform={`scale(${(typeof flip === "number" ? flip : flip ? -1 : 1) * 1.05},1.05)`}><AnimalCharacter member={m} pose={pose} mood={mood} frame={frame} talking={talking} mouthLevel={mouthLevel} energy={energy} react={react} holds={holds} envelope={envelope} /></g>;
  }
  const child = m.age === "child", teen = m.age === "teen", elder = m.age === "elder";
  const bodyK = child ? 0.62 : teen ? 0.86 : 1;
  const headK = child ? 1.22 : teen ? 1.08 : 1;
  const mix = (a: number, b: number, k: number) => a + (b - a) * k;
  const smooth = (k: number) => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };
  const solve = (pose: CharPose) => {
    const sticky = ACTION_POSES.includes(pose); // the action is the acting: held for the whole beat
    const walking = pose === "walk" || pose === "run";
    const held = sticky ? Math.max(envelope, 0.85) : poseWeight * envelope; // how much of the staged pose is shown right now
    const EXP = POSES[pose], REST = POSES.stand;
    const P: PoseSpec = { rt: mix(REST.rt, EXP.rt, held), rf: mix(REST.rf, EXP.rf, held), lt: mix(REST.lt, EXP.lt, held), lf: mix(REST.lf, EXP.lf, held), tilt: EXP.tilt * held, lean: EXP.lean * held, headDrop: EXP.headDrop * held };
    const breathe = Math.sin(frame * 0.09) * 3;
    const swing = pose === "walk" ? Math.sin(frame * 0.32) : pose === "run" ? Math.sin(frame * 0.55) : 0;
    const dance = pose === "dance" ? Math.sin(frame * 0.3) : 0;
    const punch = pose === "fight" ? Math.sin(frame * 0.55) : 0;
    const eatBite = pose === "eat" ? Math.sin(frame * 0.4) : 0;
    const asleep = pose === "sleep";
    const thrash = pose === "struggle" ? Math.sin(frame * 0.95) : 0; // flailing arms, shaking body
    const shove = pose === "push" ? Math.sin(frame * 0.5) : 0;
    const talkSwing = pose === "talk" || (talking && pose === "stand") ? Math.sin(frame * 0.27) : 0;
    const waveSwing = pose === "wave" ? Math.sin(frame * 0.45) : 0;
    const hop = (pose === "happy" ? -Math.abs(Math.sin(frame * 0.2)) * 22 : 0) - (pose === "dance" ? Math.abs(dance) * 22 : 0) - (pose === "jump" ? Math.abs(Math.sin(frame * 0.26)) * 70 : 0) + (pose === "struggle" ? Math.abs(thrash) * 6 : 0) - (talking ? energy * 5 : 0);
    const lean = P.lean + (elder ? 5 : 0);

    // A speaker does a different gesture every few words (gliding from one to the next) and each word gives it a push; between
    // sentences the arms settle back to rest.
    const speaking = talking && !sticky;
    const SPEAK: [number, number, number, number][] = [[45, 80, 8, 10], [55, 70, 55, 70], [8, 10, 45, 80], [112, 22, 8, 10], [35, 100, 35, 100]];
    const gi = Math.floor(gesture), gf = gesture - gi;
    const A = SPEAK[((gi % 5) + 5) % 5], B = SPEAK[(((gi + 1) % 5) + 5) % 5], bl = smooth((gf - 0.7) / 0.3);
    const gv = A.map((v, k) => mix(v, B[k], bl));
    const push = energy * 16;
    const gestureR = { t: gv[0] + (gv[0] > 20 ? push : 0), f: gv[1] + energy * 10 };
    const gestureL = { t: gv[2] + (gv[2] > 20 ? push : 0), f: gv[3] + energy * 10 };
    // the speaker: staged pose first, then gestures; always eased in and out of the sentence by the envelope
    const rArm = speaking && !walking
      ? { t: mix(REST.rt, mix(gestureR.t, EXP.rt, poseWeight), envelope), f: mix(REST.rf, mix(gestureR.f, EXP.rf, poseWeight), envelope) }
      : { t: P.rt + talkSwing * 14 + waveSwing * 18 - swing * (pose === "run" ? 45 : 28) + dance * 26 + thrash * 42 + shove * 6 + (pose === "fight" ? 20 + punch * 18 : 0), f: P.rf + talkSwing * 12 + eatBite * 8 + thrash * 26 + (pose === "shout" ? Math.sin(frame * 0.4) * 8 : 0) - (pose === "fight" ? 18 + punch * 18 : 0) };
    const lArm = speaking && !walking
      ? { t: mix(REST.lt, mix(gestureL.t, EXP.lt, poseWeight), envelope), f: mix(REST.lf, mix(gestureL.f, EXP.lf, poseWeight), envelope) }
      : { t: P.lt + (pose === "angry" || pose === "scared" ? 0 : swing * (pose === "run" ? 45 : 28)) - dance * 26 - thrash * 42 + shove * 6 - (pose === "fight" ? punch * 18 : 0), f: P.lf - thrash * 20 };
    const rf0 = frame % 90, rAmt = react ? Math.max(0, 1 - rf0 / 70) : 0;
    const headNo = react === "no" ? Math.sin(frame * 0.6) * 14 * rAmt : 0;
    const headYes = react === "yes" ? Math.sin(frame * 0.5) * 9 * rAmt : 0;
    const shrugUp = react === "shrug" ? rAmt * 14 : 0;
    const nod = headYes + shrugUp * 0 + (speaking ? energy * 6 : listening ? Math.max(0, Math.sin(frame * 0.045)) ** 3 * 7 : 0);

    return { sticky, walking, P, breathe, swing, dance, punch, eatBite, asleep, thrash, shove, hop, lean, rArm, lArm, nod, headNo, speaking };
  };
  // two poses blended: the one we come from and the one we go to (k overshoots a little: a springy settle, not a robotic stop)
  const SB = solve(poseB);
  const SA = bt < 1 && poseA !== poseB ? solve(poseA) : SB;
  const kk = Math.min(1.12, bt);
  const m2 = (a: number, b: number) => a + (b - a) * kk;
  const P: PoseSpec = { rt: m2(SA.P.rt, SB.P.rt), rf: m2(SA.P.rf, SB.P.rf), lt: m2(SA.P.lt, SB.P.lt), lf: m2(SA.P.lf, SB.P.lf), tilt: m2(SA.P.tilt, SB.P.tilt), lean: m2(SA.P.lean, SB.P.lean), headDrop: m2(SA.P.headDrop, SB.P.headDrop) };
  const swing = m2(SA.swing, SB.swing), dance = m2(SA.dance, SB.dance), punch = m2(SA.punch, SB.punch), eatBite = m2(SA.eatBite, SB.eatBite);
  const thrash = m2(SA.thrash, SB.thrash), shove = m2(SA.shove, SB.shove), hop = m2(SA.hop, SB.hop), lean = m2(SA.lean, SB.lean);
  const nod = m2(SA.nod, SB.nod), headNo = m2(SA.headNo, SB.headNo), breathe = SB.breathe;
  const rArm = { t: m2(SA.rArm.t, SB.rArm.t), f: m2(SA.rArm.f, SB.rArm.f) };
  const lArm = { t: m2(SA.lArm.t, SB.lArm.t), f: m2(SA.lArm.f, SB.lArm.f) };
  const dom = bt > 0.5 ? SB : SA;
  const asleep = dom.asleep, speaking = dom.speaking, walking = dom.walking, sticky = dom.sticky;
  void punch; void dance; void shove; void eatBite; void walking; void sticky; void speaking;

  // face
  const blink = asleep || frame % 120 > 114 ? 0.1 : 1;
  const skin = m.skin, skinD = shade(skin, 0.86);
  const cx = 0, cy = -510, R = 64 * headK;
  const eyeY = cy - 6 * headK, eyeX = 23 * headK;
  const wide = mood === "scared" || mood === "surprised";
  const open = pose === "shout" ? 1 : pose === "struggle" ? 0.5 + 0.4 * Math.abs(thrash) : pose === "tired" ? 0.3 + 0.3 * Math.abs(Math.sin(frame * 0.3)) : pose === "eat" ? Math.abs(eatBite) * 0.7 : pose === "cry" ? 0.55 + 0.3 * Math.sin(frame * 0.8) : talking ? Math.min(1, (mouthLevel ?? 0.45 + 0.45 * Math.abs(Math.sin(frame * 0.5))) * 1.6) : mood === "laugh" ? 0.8 : mood === "surprised" ? 0.9 : mood === "scared" ? 0.5 : 0;
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

  // ---- animal characters: the same body, a furry head with ears and a snout, and a tail
  const sp = m.species as string | undefined;
  const fur = skin, furD = shade(skin, 0.62), furL = shade(skin, 1.28);
  const animalBack = sp ? (() => {
    const earTri = (side: number, h: number, w2: number) => `M${cx + side * R * 0.8},${cy - R * 0.4} L${cx + side * R * (0.55 + w2)},${cy - R - h} L${cx + side * R * 0.05},${cy - R * 0.85} Z`;
    switch (sp) {
      case "wolf": return <g>{[-1, 1].map((sd) => <g key={sd}><path d={earTri(sd, 52, 0.0)} fill={fur} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" /><path d={earTri(sd, 30, 0.0)} fill={furD} transform={`translate(${sd * 4},4) scale(0.7) translate(${-sd * 4 * 0.3},${cy * 0.3})`} opacity={0.0} /></g>)}</g>;
      case "fox": return <g>{[-1, 1].map((sd) => <g key={sd}><path d={earTri(sd, 58, 0.05)} fill={fur} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" /><path d={`M${cx + sd * R * 0.6},${cy - R - 28} L${cx + sd * R * 0.62},${cy - R - 58} L${cx + sd * R * 0.4},${cy - R - 34} Z`} fill="#1B1B1B" /></g>)}</g>;
      case "lion": return <g><circle cx={cx} cy={cy + 6} r={R * 1.48} fill="#B9770E" stroke={OUT} strokeWidth={3.5} />{[-1, 1].map((sd) => <circle key={sd} cx={cx + sd * R * 0.72} cy={cy - R * 0.86} r={20} fill={fur} stroke={OUT} strokeWidth={3.5} />)}</g>;
      case "tiger": case "bear": case "monkey": return <g>{[-1, 1].map((sd) => <g key={sd}><circle cx={cx + sd * R * (sp === "monkey" ? 1.02 : 0.74)} cy={cy - R * (sp === "monkey" ? 0.1 : 0.78)} r={sp === "monkey" ? 24 : 22} fill={fur} stroke={OUT} strokeWidth={3.5} /><circle cx={cx + sd * R * (sp === "monkey" ? 1.02 : 0.74)} cy={cy - R * (sp === "monkey" ? 0.1 : 0.78)} r={11} fill={sp === "monkey" ? "#F5B7B1" : furD} /></g>)}</g>;
      case "dog": return <g>{[-1, 1].map((sd) => <ellipse key={sd} cx={cx + sd * R * 0.98} cy={cy + 8} rx={21} ry={44} fill={furD} stroke={OUT} strokeWidth={3.5} transform={`rotate(${sd * 8} ${cx + sd * R * 0.98} ${cy - 20})`} />)}</g>;
      case "cat": return <g>{[-1, 1].map((sd) => <path key={sd} d={earTri(sd, 36, 0.12)} fill={fur} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />)}</g>;
      case "rabbit": return <g>{[-1, 1].map((sd) => <g key={sd}><ellipse cx={cx + sd * 24} cy={cy - R - 46} rx={19} ry={64} fill={fur} stroke={OUT} strokeWidth={3.5} transform={`rotate(${sd * 8} ${cx + sd * 24} ${cy - R})`} /><ellipse cx={cx + sd * 24} cy={cy - R - 44} rx={9} ry={46} fill="#F5B7B1" transform={`rotate(${sd * 8} ${cx + sd * 24} ${cy - R})`} /></g>)}</g>;
      case "elephant": return <g>{[-1, 1].map((sd) => <ellipse key={sd} cx={cx + sd * R * 1.02} cy={cy + 2} rx={42} ry={58} fill={furL} stroke={OUT} strokeWidth={3.5} transform={`rotate(${sd * -10} ${cx + sd * R * 0.9} ${cy})`} />)}</g>;
      case "deer": return <g>{[-1, 1].map((sd) => <g key={sd}><path d={`M${cx + sd * 26},${cy - R + 6} L${cx + sd * 40},${cy - R - 66} M${cx + sd * 36},${cy - R - 34} L${cx + sd * 66},${cy - R - 56} M${cx + sd * 40},${cy - R - 66} L${cx + sd * 30},${cy - R - 96}`} fill="none" stroke="#6B4A2B" strokeWidth={8} strokeLinecap="round" /><ellipse cx={cx + sd * R * 0.92} cy={cy - R * 0.36} rx={26} ry={13} fill={fur} stroke={OUT} strokeWidth={3.5} transform={`rotate(${sd * 28} ${cx + sd * R * 0.92} ${cy - R * 0.36})`} /></g>)}</g>;
      case "buffalo": case "cow": return <g>{[-1, 1].map((sd) => <g key={sd}><path d={`M${cx + sd * 34},${cy - R + 10} Q${cx + sd * (R + 46)},${cy - R - 14} ${cx + sd * (R + 30)},${cy - R - 66}`} fill="none" stroke={sp === "buffalo" ? "#CFC8B8" : "#F5F1E6"} strokeWidth={sp === "buffalo" ? 14 : 11} strokeLinecap="round" /><ellipse cx={cx + sd * R * 1.05} cy={cy - R * 0.1} rx={30} ry={13} fill={fur} stroke={OUT} strokeWidth={3.5} transform={`rotate(${sd * 18} ${cx + sd * R * 1.05} ${cy - R * 0.1})`} /></g>)}</g>;
      case "goat": return <g>{[-1, 1].map((sd) => <g key={sd}><path d={`M${cx + sd * 24},${cy - R + 6} Q${cx + sd * 56},${cy - R - 48} ${cx + sd * 26},${cy - R - 70}`} fill="none" stroke="#7F8C8D" strokeWidth={12} strokeLinecap="round" /><ellipse cx={cx + sd * R * 0.98} cy={cy - R * 0.2} rx={30} ry={11} fill={fur} stroke={OUT} strokeWidth={3.5} transform={`rotate(${sd * 14} ${cx + sd * R * 0.98} ${cy - R * 0.2})`} /></g>)}</g>;
      default: return null;
    }
  })() : null;
  const animalFront = sp ? (() => {
    const snout = (rx: number, ry: number, col: string, dy = 24) => <ellipse cx={cx} cy={cy + dy * headK} rx={rx} ry={ry} fill={col} stroke={OUT} strokeWidth={3} />;
    const nose = (col = "#1B1B1B", dy = 8, w2 = 12) => <ellipse cx={cx} cy={cy + dy * headK} rx={w2} ry={w2 * 0.66} fill={col} stroke={OUT} strokeWidth={2.5} />;
    const teeth = open > 0.25 ? <g fill="#fff" stroke={OUT} strokeWidth={1.5}><path d={`M${cx - 10},${mY - 2} l5,10 l5,-10 Z`} /><path d={`M${cx + 0},${mY - 2} l5,10 l5,-10 Z`} /></g> : null;
    switch (sp) {
      case "wolf": return <g>{snout(38, 28, furL, 26)}{nose()}{teeth}<path d={`M${cx - R + 4},${cy + 6} Q${cx - R * 0.6},${cy + 40} ${cx - 26},${cy + 16} M${cx + R - 4},${cy + 6} Q${cx + R * 0.6},${cy + 40} ${cx + 26},${cy + 16}`} fill="none" stroke={furD} strokeWidth={5} strokeLinecap="round" /></g>;
      case "fox": return <g>{[-1, 1].map((sd) => <ellipse key={sd} cx={cx + sd * 36} cy={cy + 24} rx={28} ry={22} fill="#fff" stroke={OUT} strokeWidth={2.5} />)}{snout(30, 24, "#fff", 28)}{nose()}{teeth}</g>;
      case "lion": return <g>{snout(36, 26, "#F5CBA7", 26)}{nose("#6B3A1E", 8, 13)}{teeth}</g>;
      case "tiger": return <g>{[-1, 1].map((sd) => <path key={sd} d={`M${cx + sd * 22},${cy - R + 6} l${sd * 4},22 M${cx + sd * 40},${cy - R + 14} l${sd * 6},20 M${cx + sd * (R - 8)},${cy - 6} l${sd * -22},6 M${cx + sd * (R - 8)},${cy + 14} l${sd * -22},-2`} stroke="#1B1B1B" strokeWidth={6} strokeLinecap="round" />)}{snout(34, 25, "#fff", 26)}{nose("#C0392B", 8, 12)}{teeth}</g>;
      case "dog": return <g>{snout(36, 27, furL, 26)}{nose("#1B1B1B", 8, 14)}{teeth}</g>;
      case "cat": return <g>{snout(26, 20, furL, 26)}{nose("#E88FA3", 10, 8)}<path d={`M${cx - 30},${cy + 22} l-38,-8 M${cx - 30},${cy + 30} l-40,4 M${cx + 30},${cy + 22} l38,-8 M${cx + 30},${cy + 30} l40,4`} stroke="#fff" strokeWidth={3} />{teeth}</g>;
      case "monkey": return <g><ellipse cx={cx} cy={cy + 16} rx={46} ry={40} fill="#F5CBA7" stroke={OUT} strokeWidth={3} />{nose("#6B3A1E", 12, 8)}{teeth}</g>;
      case "rabbit": return <g>{snout(28, 22, "#fff", 26)}{nose("#E88FA3", 12, 9)}<g fill="#fff" stroke={OUT} strokeWidth={2}><rect x={cx - 11} y={mY + 2} width={10} height={16} rx={3} /><rect x={cx + 1} y={mY + 2} width={10} height={16} rx={3} /></g></g>;
      case "bear": return <g>{snout(34, 26, "#E5C9A3", 26)}{nose("#1B1B1B", 8, 13)}{teeth}</g>;
      case "elephant": return <g><path d={`M${cx},${cy + 10} Q${cx + 4},${cy + 70} ${cx + 30},${cy + 96} Q${cx + 40},${cy + 100} ${cx + 38},${cy + 88}`} fill="none" stroke={OUT} strokeWidth={34} strokeLinecap="round" /><path d={`M${cx},${cy + 10} Q${cx + 4},${cy + 70} ${cx + 30},${cy + 96} Q${cx + 40},${cy + 100} ${cx + 38},${cy + 88}`} fill="none" stroke={fur} strokeWidth={27} strokeLinecap="round" /></g>;
      case "deer": return <g>{snout(30, 24, furL, 26)}{nose("#1B1B1B", 10, 10)}{teeth}<circle cx={cx - 26} cy={cy - 30} r={3} fill="#fff" /><circle cx={cx + 20} cy={cy - 40} r={3} fill="#fff" /></g>;
      case "buffalo": case "cow": return <g>{snout(40, 30, sp === "buffalo" ? "#6B6B73" : "#F5CBA7", 26)}{[-1, 1].map((sd) => <ellipse key={sd} cx={cx + sd * 15} cy={cy + 24} rx={7} ry={5} fill="#1B1B1B" />)}{sp === "cow" && <ellipse cx={cx - 34} cy={cy - 34} rx={20} ry={14} fill="#3B3B3B" opacity={0.85} />}</g>;
      case "goat": return <g>{snout(28, 24, furL, 26)}{nose("#6B3A1E", 10, 9)}<path d={`M${cx - 8},${cy + 44} Q${cx},${cy + 80} ${cx + 8},${cy + 44}`} fill="#fff" stroke={OUT} strokeWidth={3} />{teeth}</g>;
      default: return null;
    }
  })() : null;
  const tail = sp ? (() => {
    switch (sp) {
      case "wolf": case "fox": case "dog": case "cat": case "lion": case "tiger": case "monkey":
        return <path d={`M-20,-262 Q${-120 - Math.sin(frame * 0.1) * 12},-250 ${-128},-170 Q${-104 - Math.sin(frame * 0.1) * 6},-214 -34,-236 Z`} fill={sp === "lion" ? fur : fur} stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />;
      case "rabbit": return <circle cx={-34} cy={-250} r={20} fill="#fff" stroke={OUT} strokeWidth={3.5} />;
      default: return <path d={`M-20,-258 Q-60,-250 -54,-226`} fill="none" stroke={OUT} strokeWidth={14} strokeLinecap="round" />;
    }
  })() : null;

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
      <g transform={`translate(${x},${hip}) rotate(${k * swing * (pose === "run" ? 30 : 18)})`}>
        <rect x={-15} y={0} width={30} height={236} rx={12} fill={sp ? furD : longBottom ? skin : m.outfit === "kurta" || m.outfit === "dhoti" ? (m.outfit === "dhoti" ? "#F5F1E6" : c2) : c2} stroke={OUT} strokeWidth={3} />
        <ellipse cx={0} cy={246} rx={28} ry={13} fill={sp ? furD : shade(c2, 0.55)} stroke={OUT} strokeWidth={3} />
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
      case "fur": return (<g><path d={`M${-w},${top} L${w},${top} L${w + 8},${hip + 6} L${-w - 8},${hip + 6} Z`} fill={fur} stroke={OUT} strokeWidth={3} /><ellipse cx={0} cy={top + 80} rx={36} ry={62} fill={furL} /></g>);
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
    <g transform={`scale(${(typeof flip === "number" ? flip : flip ? -1 : 1) * bodyK},${bodyK}) translate(${pose === "struggle" ? Math.sin(frame * 1.3) * 7 : 0},${hop}) ${asleep ? "translate(0,-105) rotate(-88)" : ""}`}>
      <ellipse cx={0} cy={6} rx={78} ry={12} fill="#000" opacity={0.18} />
      <g transform={`translate(0,${breathe * 0.4})`}>
        {legs}
        <g transform={`rotate(${P.lean + (elder ? 4 : 0)} 0 ${hip}) rotate(${lean - P.lean} 0 ${hip})`}>
          {tail}
          {hairBack && <g transform={`rotate(${P.tilt} 0 -450)`}>{hairBack}</g>}
          {arm(-1, lArm)}
          {torso}
          <rect x={-14} y={-452} width={28} height={40} rx={10} fill={skinD} stroke={OUT} strokeWidth={3} />
          <g transform={`translate(0,${P.headDrop + nod + breathe * 0.3}) rotate(${P.tilt + headNo + (listening ? Math.sin(frame * 0.03) * 2 : 0)} 0 -450)`}>
            {animalBack}
            <circle cx={cx} cy={cy} r={R} fill={skin} stroke={OUT} strokeWidth={3.5} />
            {!sp && <ellipse cx={cx - R + 2} cy={cy + 8} rx={9} ry={14} fill={skinD} stroke={OUT} strokeWidth={3} />}
            {!sp && <ellipse cx={cx + R - 2} cy={cy + 8} rx={9} ry={14} fill={skinD} stroke={OUT} strokeWidth={3} />}
            {m.beard && <path d={`M${cx - R + 6},${cy + 10} Q${cx},${cy + R + 40} ${cx + R - 6},${cy + 10} Q${cx},${cy + 28} ${cx - R + 6},${cy + 10} Z`} fill={elder ? "#D5D8DC" : hc} stroke={OUT} strokeWidth={3} />}
            {eye(-1)}{eye(1)}
            {brow(-1)}{brow(1)}
            {m.glasses && (<g fill="none" stroke={OUT} strokeWidth={3.5}><circle cx={cx - eyeX} cy={eyeY} r={17} /><circle cx={cx + eyeX} cy={eyeY} r={17} /><line x1={cx - eyeX + 17} y1={eyeY} x2={cx + eyeX - 17} y2={eyeY} /></g>)}
            <path d={`M${cx},${cy + 2} q-4,12 4,14`} fill="none" stroke={skinD} strokeWidth={3} strokeLinecap="round" />
            {animalFront}
            {!sp || sp === "elephant" || true ? mouth : null}
            {m.bindi && <circle cx={cx} cy={cy - 24 * headK} r={4.5} fill="#C0392B" />}
            {mood === "sad" && <path d={`M${cx - eyeX - 4},${eyeY + 14} q-3,16 0,24 q4,-6 4,-16 z`} fill="#7EC8E3" opacity={0.8 + 0.2 * Math.sin(frame * 0.2)} />}
            {(pose === "struggle" || pose === "tired") && <g fill="#7EC8E3" opacity={0.8}><path d={`M${cx + R - 4},${cy - 40} q-6,14 0,22 q6,-8 0,-22 z`} /><path d={`M${cx - R + 6},${cy - 20 + Math.sin(frame * 0.2) * 4} q-6,14 0,22 q6,-8 0,-22 z`} /></g>}
            {mood === "angry" && <circle cx={cx + R - 6} cy={cy - R + 10} r={5} fill="#E74C3C" opacity={0.7} />}
            {hairFront}
          </g>
          {arm(1, rArm)}
          {holds && (<g transform={`translate(${sleeveRight(pose)},${pose === "eat" ? -440 : pose === "carry" ? -300 : pose === "give" ? -330 : -270}) scale(0.55)`}><StoryPropArt type={holds} frame={frame} /></g>)}
          {asleep && <text x={70} y={-560} fontSize={64} fontWeight={900} fill="#5DADE2" fontFamily="sans-serif" opacity={0.5 + 0.5 * Math.sin(frame * 0.1)}>Zz</text>}
        </g>
      </g>
    </g>
  );
};

const sleeveRight = (pose: CharPose): number => (pose === "give" ? 190 : pose === "carry" ? 90 : pose === "eat" ? 40 : 100);

export const CHARACTER_HEIGHT = 590;
