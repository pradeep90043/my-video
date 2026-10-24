import React from "react";

/**
 * A procedural low-poly wolf built from primitives with a real skeleton of nested groups (hips, spine, neck, head, tail, four legs with
 * upper and lower segments). `t` is time in seconds; the gait is a trot: diagonal legs move together. Facing +x, feet on y = 0.
 */
interface Props { t: number; gait?: "stand" | "walk" | "run"; fur?: string; belly?: string; scale?: number }

const Capsule: React.FC<{ r: number; len: number; color: string; pos?: [number, number, number]; rot?: [number, number, number] }> = ({ r, len, color, pos = [0, 0, 0], rot = [0, 0, 0] }) => (
  <mesh position={pos} rotation={rot} castShadow>
    <capsuleGeometry args={[r, len, 6, 12]} />
    <meshToonMaterial color={color} />
  </mesh>
);

export const Wolf3D: React.FC<Props> = ({ t, gait = "walk", fur = "#8E9AA6", belly = "#C9D1D8", scale = 1 }) => {
  const f = gait === "run" ? 2.4 : gait === "walk" ? 1.3 : 0.4;
  const amp = gait === "run" ? 0.9 : gait === "walk" ? 0.55 : 0.05;
  const ph = t * f * Math.PI * 2;
  const bob = Math.abs(Math.sin(ph)) * (gait === "run" ? 0.07 : 0.025);
  const leg = (phase: number, x: number, z: number) => {
    const a = Math.sin(ph + phase) * amp;
    const knee = Math.max(0, Math.sin(ph + phase + 1.2)) * amp * 1.1;
    return (
      <group position={[x, 0.78, z]} rotation={[0, 0, a]}>
        <Capsule r={0.075} len={0.3} color={fur} pos={[0, -0.2, 0]} />
        <group position={[0, -0.4, 0]} rotation={[0, 0, -knee]}>
          <Capsule r={0.06} len={0.3} color={fur} pos={[0, -0.18, 0]} />
          <mesh position={[0.05, -0.36, 0]} castShadow><boxGeometry args={[0.18, 0.07, 0.12]} /><meshToonMaterial color="#3B4048" /></mesh>
        </group>
      </group>
    );
  };
  const tail = Math.sin(ph * 0.5) * 0.35;
  const headNod = Math.sin(ph) * 0.08;
  return (
    <group scale={scale} position={[0, bob, 0]}>
      {/* hips / body */}
      <group position={[0, 0.98, 0]} rotation={[0, 0, Math.sin(ph) * 0.03]}>
        <Capsule r={0.3} len={0.75} color={fur} rot={[0, 0, Math.PI / 2]} />
        <Capsule r={0.24} len={0.7} color={belly} pos={[0, -0.1, 0]} rot={[0, 0, Math.PI / 2]} />
        {/* neck + head */}
        <group position={[0.62, 0.1, 0]} rotation={[0, 0, 0.5 + headNod]}>
          <Capsule r={0.17} len={0.28} color={fur} pos={[0.1, 0.1, 0]} rot={[0, 0, -0.4]} />
          <group position={[0.28, 0.28, 0]} rotation={[0, 0, -0.45]}>
            <mesh castShadow><sphereGeometry args={[0.25, 14, 12]} /><meshToonMaterial color={fur} /></mesh>
            <mesh position={[0.28, -0.06, 0]} rotation={[0, 0, -Math.PI / 2 + 0.1]} castShadow><coneGeometry args={[0.15, 0.4, 10]} /><meshToonMaterial color={belly} /></mesh>
            <mesh position={[0.5, -0.02, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshToonMaterial color="#111" /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[-0.02, 0.28, s * 0.14]} rotation={[s * 0.25, 0, 0.1]} castShadow><coneGeometry args={[0.09, 0.26, 4]} /><meshToonMaterial color={fur} /></mesh>)}
            {[-1, 1].map((s) => <mesh key={s} position={[0.17, 0.07, s * 0.11]}><sphereGeometry args={[0.035, 8, 8]} /><meshToonMaterial color="#111" /></mesh>)}
          </group>
        </group>
        {/* tail */}
        <group position={[-0.7, 0.05, 0]} rotation={[tail, 0, -0.9 + Math.sin(ph * 0.5) * 0.1]}>
          <Capsule r={0.1} len={0.5} color={fur} pos={[-0.18, -0.12, 0]} rot={[0, 0, 0.8]} />
        </group>
      </group>
      {leg(0, 0.5, 0.17)}
      {leg(Math.PI, 0.5, -0.17)}
      {leg(Math.PI, -0.5, 0.17)}
      {leg(0, -0.5, -0.17)}
    </group>
  );
};
