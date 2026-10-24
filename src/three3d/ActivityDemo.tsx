import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Person3D, Activity } from "./Person3D";

const ACTS: { act: Activity; sound: string; sky: string; prop: "log" | "desk" | "pot" | "none" }[] = [
  { act: "walk", sound: "walk", sky: "#7EC8F2", prop: "none" },
  { act: "chop", sound: "chop", sky: "#F2C77E", prop: "log" },
  { act: "type", sound: "type", sky: "#9AB1F2", prop: "desk" },
  { act: "cook", sound: "cook", sky: "#F29A7E", prop: "pot" },
];

const Cam: React.FC<{ angle: number; y: number; r: number }> = ({ angle, y, r }) => {
  const three = useThree();
  React.useLayoutEffect(() => {
    three.camera.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    three.camera.lookAt(0, 1.0, 0);
    three.camera.updateProjectionMatrix();
  }, [angle, y, r]);
  return null;
};

const Prop: React.FC<{ kind: string; t: number }> = ({ kind, t }) => {
  if (kind === "log") return (<group>
    <mesh position={[0.75, 0.15, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.3, 14]} /><meshToonMaterial color="#8A5A2B" /></mesh></group>);
  if (kind === "desk") return (<group>
    <mesh position={[0.55, 0.72, 0]} castShadow><boxGeometry args={[0.7, 0.05, 1.1]} /><meshToonMaterial color="#9C6B3F" /></mesh>
    <mesh position={[0.55, 0.83, 0]} rotation={[0, 0, -0.2]}><boxGeometry args={[0.04, 0.3, 0.5]} /><meshToonMaterial color="#444" /></mesh>
    <mesh position={[-0.2, 0.3, 0]} castShadow><boxGeometry args={[0.35, 0.05, 0.4]} /><meshToonMaterial color="#555" /></mesh></group>);
  if (kind === "pot") return (<group>
    <mesh position={[0.6, 0.6, 0]} castShadow><boxGeometry args={[0.7, 0.9, 1]} /><meshToonMaterial color="#C9C9C9" /></mesh>
    <mesh position={[0.6, 1.12, 0]} castShadow><cylinderGeometry args={[0.2, 0.17, 0.2, 16]} /><meshToonMaterial color="#333" /></mesh>
    <mesh position={[0.6, 1.3 + Math.sin(t * 6) * 0.03, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshToonMaterial color="#fff" transparent opacity={0.5} /></mesh></group>);
  return null;
};

/** Four activities, 3 s each. The camera makes one smooth full turn per activity (eased in/out at the cuts), and each activity has its own looping ambient sound that fades across the cut. */
export const ActivityDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const seg = 3 * fps;
  const i = Math.min(ACTS.length - 1, Math.floor(frame / seg));
  const local = frame - i * seg;
  const a = ACTS[i];
  const angle = interpolate(local, [0, seg], [0, Math.PI * 2], { easing: Easing.inOut(Easing.sin) });
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: a.sky }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 40, near: 0.1, far: 60 }} shadows>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 4]} intensity={1.5} castShadow />
        <Cam angle={angle} y={1.6} r={4.2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[30, 40]} /><meshToonMaterial color="#8BC46B" /></mesh>
        <group position={[a.act === "walk" ? Math.sin(t * 1.6 * Math.PI * 2) * 0 : 0, 0, 0]}><Person3D t={t} activity={a.act} /></group>
        <Prop kind={a.prop} t={t} />
      </ThreeCanvas>
      {ACTS.map((x, k) => (
        <Sequence key={x.sound} from={k * seg} durationInFrames={seg}>
          <Audio src={staticFile(`audio/ambient/${x.sound}.mp3`)} volume={(f) => interpolate(f, [0, 6, seg - 6, seg], [0, 0.6, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} loop />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
