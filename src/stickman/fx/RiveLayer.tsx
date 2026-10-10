import React from "react";
import { staticFile } from "remotion";
import { RemotionRiveCanvas } from "@remotion/rive";
import type { z } from "zod";
import type { RiveSchema } from "../schema";

/** A Rive animation / character (.riv under public/) placed in world coordinates. */
export const RiveLayer: React.FC<{ spec: z.infer<typeof RiveSchema>; width: number; height: number }> = ({ spec, width, height }) => (
  <div style={{ position: "absolute", zIndex: 2, left: spec.x * width - spec.size / 2, top: spec.y * height - spec.size / 2, width: spec.size, height: spec.size, borderRadius: 36, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
    <RemotionRiveCanvas src={staticFile(spec.src)} artboard={spec.artboard} animation={spec.animation} fit="contain" alignment="center" />
  </div>
);
