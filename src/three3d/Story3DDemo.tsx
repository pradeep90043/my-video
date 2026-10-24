import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Wolf3D } from "./Wolf3D";

/** A 3D proof: a trotting wolf in a low-poly forest while the camera orbits a full 360 degrees around it. */
export const Story3DDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const orbit = interpolate(frame, [0, durationInFrames], [0, Math.PI * 2]);
  const R = 5.2;
  const cam: [number, number, number] = [Math.cos(orbit) * R, 1.8 + Math.sin(frame * 0.02) * 0.2, Math.sin(orbit) * R];
  const trees = Array.from({ length: 22 }, (_, i) => {
    const a = i * 2.399; const d = 6 + (i % 5) * 1.6;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.8 + (i % 4) * 0.25 };
  });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#7EC8F2,#E9F7FF)" }}>
      <ThreeCanvas width={width} height={height} camera={{ position: cam, fov: 40, near: 0.1, far: 80 }} shadows>
        <fog attach="fog" args={["#CFE8F7", 12, 34]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 9, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        <CamLook cam={cam} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[40, 48]} /><meshToonMaterial color="#8BC46B" /></mesh>
        {trees.map((tr, i) => (
          <group key={i} position={[tr.x, 0, tr.z]} scale={tr.s}>
            <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.12, 0.16, 1, 8]} /><meshToonMaterial color="#7B5230" /></mesh>
            <mesh position={[0, 1.7, 0]} castShadow><coneGeometry args={[0.8, 1.8, 8]} /><meshToonMaterial color={i % 2 ? "#2F7D4A" : "#3A8F57"} /></mesh>
            <mesh position={[0, 2.6, 0]} castShadow><coneGeometry args={[0.55, 1.3, 8]} /><meshToonMaterial color="#3A8F57" /></mesh>
          </group>
        ))}
        <Wolf3D t={t} gait={frame < durationInFrames / 2 ? "walk" : "run"} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const CamLook: React.FC<{ cam: [number, number, number] }> = ({ cam }) => {
  // the camera is placed by ThreeCanvas props; this makes it look at the wolf each frame
  const { useThree } = require("@react-three/fiber");
  const three = useThree();
  React.useLayoutEffect(() => { three.camera.position.set(...cam); three.camera.lookAt(0, 1.0, 0); three.camera.updateProjectionMatrix(); }, [cam[0], cam[1], cam[2]]);
  return null;
};
