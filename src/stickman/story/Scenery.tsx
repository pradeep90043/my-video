import React from "react";
import { paint, sanitizeSvg } from "./puppet/spec";

/** A background the planner invented for this story: a sky and up to 5 layers of plain SVG that drift at their own speed (parallax). */
export interface SceneryLayer { svg: string; /** how far it drifts over the scene, 0 = still .. 1 = far */ speed?: number; /** gentle up-and-down sway in px */ bob?: number }
export interface Scenery { id: string; sky: [string, string]; ground?: string; layers: SceneryLayer[] }

/** Layers are drawn on a 1920x1080 canvas with the ground line at y=880; a taller (vertical) world scales it to its height and keeps the ground line. */
export const SceneryBackground: React.FC<{ scenery: Scenery; frame: number; w: number; h: number; ground: number }> = ({ scenery, frame, w, h, ground }) => {
  const id = `sc-${scenery.id}`;
  const k = h / 1080, fit = `translate(${(w - 1920 * k) / 2},${ground - 880 * k}) scale(${k})`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={scenery.sky[0]} /><stop offset="100%" stopColor={scenery.sky[1]} /></linearGradient>
      </defs>
      <rect x={-w * 0.2} y={-h * 0.2} width={w * 1.4} height={h * 1.4} fill={`url(#${id})`} />
      {scenery.ground && <rect x={-w * 0.2} y={ground} width={w * 1.4} height={h} fill={scenery.ground} />}
      {scenery.layers.map((l, i) => {
        const safe = sanitizeSvg(l.svg);
        if (!safe) return null;
        const dx = -(l.speed ?? 0) * Math.min(frame, 900) * 0.25;
        const dy = (l.bob ?? 0) * Math.sin(frame * 0.05 + i);
        return <g key={i} transform={`${fit} translate(${dx},${dy})`} dangerouslySetInnerHTML={{ __html: paint(safe, {}) }} />;
      })}
    </g>
  );
};
