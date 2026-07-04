import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import React from "react";

const FloatingOrbs: React.FC = () => {
  const frame = useCurrentFrame();
  
  return (
    <>
      {[...Array(12)].map((_, i) => {
        const size = 150 + (i % 3) * 100;
        const xDrift = Math.sin(frame * 0.005 + i * 2) * 200;
        const yDrift = Math.cos(frame * 0.006 + i * 1.5) * 150;
        
        const baseX = (i * 15 % 100);
        const baseY = (i * 27 % 100);
        
        const hue = 220 + (i * 15) % 60; // Blues and Purples
        
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: size,
              height: size,
              left: `${baseX}%`,
              top: `${baseY}%`,
              transform: `translate(calc(-50% + ${xDrift}px), calc(-50% + ${yDrift}px))`,
              background: `radial-gradient(circle, hsla(${hue}, 80%, 60%, 0.15) 0%, transparent 70%)`,
              borderRadius: "50%",
              filter: "blur(40px)",
              mixBlendMode: "screen",
            }}
          />
        );
      })}
    </>
  );
};

const MeshGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    Math.sin(frame * 0.02),
    [-1, 1],
    [0.02, 0.05]
  );
  
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, ${opacity}) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, ${opacity}) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        backgroundPosition: `center ${frame * 0.5}px`,
        pointerEvents: "none",
      }}
    />
  );
};

export const WowBackground: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#06080D", overflow: "hidden" }}>
      {/* Deep gradient base */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 120%, #1a2a4a 0%, #06080D 60%)",
        }}
      />
      
      <FloatingOrbs />
      <MeshGrid />
      
      {/* Corner Glows */}
      <div style={{ position: "absolute", top: -200, left: -200, width: 600, height: 600, background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: -200, right: -200, width: 800, height: 800, background: "radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)", filter: "blur(80px)" }} />
    </AbsoluteFill>
  );
};
