import React from "react";

export type Activity = "walk" | "chop" | "type" | "cook";

/**
 * A procedural low-poly person with a nested-group skeleton (hips, torso, head, two arms with elbows, two legs with knees).
 * `t` is time in seconds; facing +x, feet on y = 0. The activity drives the pose: walking cycle, axe chopping, typing, stirring a pot.
 */
interface Props { t: number; activity: Activity; skin?: string; shirt?: string; pants?: string }

const Cap: React.FC<{ r: number; len: number; color: string; pos?: [number, number, number] }> = ({ r, len, color, pos = [0, 0, 0] }) => (
  <mesh position={pos} castShadow><capsuleGeometry args={[r, len, 6, 12]} /><meshToonMaterial color={color} /></mesh>
);

export const Person3D: React.FC<Props> = ({ t, activity, skin = "#E0AC82", shirt = "#E4572E", pants = "#2E4A7D" }) => {
  const w = t * 1.6 * Math.PI * 2;
  const s = Math.sin(w);
  // chop: swing 0.9 s period, raise then strike
  const cp = (t % 0.9) / 0.9;
  const swing = cp < 0.6 ? 2.5 * (cp / 0.6) : 2.5 - 3.3 * ((cp - 0.6) / 0.4);
  const type = Math.sin(t * 22) * 0.06;
  const stir = t * 5;

  let armL = 0, armR = 0, elbL = 0.1, elbR = 0.1, lean = 0, legL = 0, legR = 0, kneeL = 0, kneeR = 0, bob = 0;
  if (activity === "walk") {
    armL = s * 0.7; armR = -s * 0.7; legL = -s * 0.6; legR = s * 0.6;
    kneeL = Math.max(0, Math.sin(w + 1.2)) * 0.8; kneeR = Math.max(0, Math.sin(w + Math.PI + 1.2)) * 0.8;
    bob = Math.abs(s) * 0.03;
  } else if (activity === "chop") {
    armL = armR = swing; elbL = elbR = swing > 1 ? 0.6 : 0.1; lean = cp > 0.6 ? 0.25 : -0.05;
  } else if (activity === "type") {
    armL = armR = 1.0 + type; elbL = elbR = 0.4 - type * 2; lean = 0.08;
  } else {
    armR = 1.0 + Math.sin(stir) * 0.15; elbR = 0.5; armL = 0.5; elbL = 0.3; lean = 0.05;
  }
  const sitting = activity === "type";
  const hipY = sitting ? 0.62 : 0.95;
  const arm = (side: 1 | -1, a: number, e: number) => (
    <group position={[0, 0.5, side * 0.27]} rotation={[0, 0, a]}>
      <Cap r={0.06} len={0.25} color={shirt} pos={[0, -0.18, 0]} />
      <group position={[0, -0.36, 0]} rotation={[0, 0, e]}>
        <Cap r={0.05} len={0.22} color={skin} pos={[0, -0.16, 0]} />
        {activity === "chop" && side === -1 ? (<group position={[0, -0.3, 0.1]} rotation={[0, 0, 0]}>
          <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.9, 8]} /><meshToonMaterial color="#6B4423" /></mesh>
          <mesh position={[0.5, 0.02, 0]}><boxGeometry args={[0.04, 0.2, 0.25]} /><meshToonMaterial color="#B8BEC4" /></mesh></group>) : null}
      </group>
    </group>
  );
  const leg = (z: number, a: number, k: number) => (
    <group position={[0, 0, z]} rotation={[0, 0, sitting ? 1.5 : a]}>
      <Cap r={0.08} len={0.3} color={pants} pos={[0, -0.22, 0]} />
      <group position={[0, -0.42, 0]} rotation={[0, 0, sitting ? -1.5 : -k]}>
        <Cap r={0.065} len={0.3} color={pants} pos={[0, -0.2, 0]} />
        <mesh position={[0.06, -0.4, 0]} castShadow><boxGeometry args={[0.22, 0.08, 0.12]} /><meshToonMaterial color="#222" /></mesh>
      </group>
    </group>
  );
  return (
    <group position={[0, bob, 0]}>
      <group position={[0, hipY, 0]}>
        {leg(0.11, legL, kneeL)}
        {leg(-0.11, legR, kneeR)}
        <group rotation={[0, 0, -lean]}>
          <Cap r={0.2} len={0.4} color={shirt} pos={[0, 0.3, 0]} />
          {arm(1, armL, elbL)}
          {arm(-1, armR, elbR)}
          <Cap r={0.07} len={0.05} color={skin} pos={[0, 0.7, 0]} />
          <group position={[0.02, 0.92, 0]}>
            <mesh castShadow><sphereGeometry args={[0.2, 16, 14]} /><meshToonMaterial color={skin} /></mesh>
            <mesh position={[-0.02, 0.07, 0]}><sphereGeometry args={[0.205, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1]} /><meshToonMaterial color="#2B1B12" /></mesh>
            {[-1, 1].map((z) => <mesh key={z} position={[0.17, 0.03, z * 0.07]}><sphereGeometry args={[0.025, 8, 8]} /><meshToonMaterial color="#111" /></mesh>)}
          </group>
        </group>
      </group>
    </group>
  );
};
