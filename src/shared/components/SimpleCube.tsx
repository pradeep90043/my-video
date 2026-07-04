// src/components/SimpleCube.tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Box } from "@react-three/drei";
import { COLORS } from "../utils/constants";

export const SimpleCube = () => {
  const mesh = useRef<any>(null);
  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.x += 0.01;
      mesh.current.rotation.y += 0.015;
    }
  });

  return (
    <Box ref={mesh} args={[3, 3, 3]}>
      <meshStandardMaterial
        color={COLORS.accent}
        emissive={COLORS.glow}
        emissiveIntensity={0.5}
        metalness={0.2}
        roughness={0.6}
      />
    </Box>
  );
};
