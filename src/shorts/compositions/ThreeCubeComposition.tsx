// src/compositions/ThreeCubeComposition.tsx
import React from "react";

// Simple static composition that renders a dark background
export const ThreeCube: React.FC = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#111",
      }}
    />
  );
};
