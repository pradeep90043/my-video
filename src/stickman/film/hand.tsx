/**
 * A silhouette arm entering from the edge of the frame, ending in a hand (open, pointing, pressing, grabbing, pinching, writing,
 * flat). The layer's x,y is the wrist; the arm is drawn from off-screen to it, and the hand is turned along the arm.
 */
import React from "react";
import type { FilmLayer } from "./schema";

type HandLayer = Extract<FilmLayer, { t: "hand" }>;
const SK = "url(#fl-sil)";
const RIM = "rgba(255,255,255,0.10)";

const Cap: React.FC<{ x1: number; y1: number; x2: number; y2: number; w: number }> = ({ x1, y1, x2, y2, w }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={SK} strokeWidth={w} strokeLinecap="round" />
);

/** The hand in local space: the wrist is at the origin and the fingers point along +x. */
const HandShape: React.FC<{ kind: HandLayer["kind"]; frame: number }> = ({ kind, frame }) => {
  const press = Math.max(0, Math.sin(frame * 0.35)) * 6;
  switch (kind) {
    case "point":
    case "press":
      return (
        <g>
          <ellipse cx={46} cy={0} rx={62} ry={52} fill={SK} stroke={RIM} strokeWidth={2} />
          <Cap x1={80} y1={-14} x2={170 + (kind === "press" ? press : 0)} y2={-6 + (kind === "press" ? press : 0)} w={30} />
          <Cap x1={36} y1={30} x2={80} y2={58} w={26} />
          <ellipse cx={74} cy={14} rx={26} ry={20} fill={SK} />
        </g>
      );
    case "grab":
      return (
        <g>
          <ellipse cx={44} cy={0} rx={58} ry={50} fill={SK} stroke={RIM} strokeWidth={2} />
          {[-30, -10, 10, 30].map((y, i) => <Cap key={i} x1={80} y1={y} x2={128 - Math.abs(y) * 0.2} y2={y * 0.8} w={22} />)}
          <Cap x1={30} y1={-40} x2={120} y2={-48} w={24} />
        </g>
      );
    case "pinch":
      return (
        <g>
          <ellipse cx={44} cy={0} rx={56} ry={48} fill={SK} stroke={RIM} strokeWidth={2} />
          <Cap x1={80} y1={-18} x2={150} y2={-4} w={24} />
          <Cap x1={74} y1={26} x2={148} y2={6} w={24} />
        </g>
      );
    case "write":
      return (
        <g>
          <ellipse cx={44} cy={0} rx={58} ry={50} fill={SK} stroke={RIM} strokeWidth={2} />
          <Cap x1={84} y1={-6} x2={150} y2={-2} w={26} />
          <line x1={120} y1={-14} x2={236} y2={10} stroke="#1d1d22" strokeWidth={16} strokeLinecap="round" />
          <line x1={226} y1={8} x2={252} y2={13} stroke="#d9453d" strokeWidth={14} strokeLinecap="round" />
        </g>
      );
    case "flat":
      return (
        <g>
          <ellipse cx={60} cy={0} rx={90} ry={50} fill={SK} stroke={RIM} strokeWidth={2} />
          <Cap x1={112} y1={-4} x2={190} y2={-4} w={64} />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={46} cy={0} rx={60} ry={56} fill={SK} stroke={RIM} strokeWidth={2} />
          {[-36, -12, 12, 36].map((y, i) => <Cap key={i} x1={86} y1={y * 0.9} x2={152 - Math.abs(y) * 0.3} y2={y * 1.3} w={24} />)}
          <Cap x1={30} y1={-44} x2={96} y2={-82} w={26} />
        </g>
      );
  }
};

export const Hand: React.FC<{ layer: HandLayer; x: number; y: number; scale: number; frame: number; opacity: number }> = ({ layer, x, y, scale, frame, opacity }) => {
  const base = layer.from === "left" ? { x: x - 1400, y: y + 130 } : layer.from === "right" ? { x: x + 1400, y: y + 150 } : layer.from === "top" ? { x, y: y - 1300 } : { x: x + 90, y: y + 1300 };
  const ang = Math.atan2(y - base.y, x - base.x);
  const mx = (base.x + x) / 2, my = (base.y + y) / 2;
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const bend = 40;
  const cx = mx + nx * bend, cy = my + ny * bend;
  const swap = layer.to && frame >= layer.gestureAt;
  const k = layer.to ? Math.min(1, Math.max(0, (frame - layer.gestureAt) / 6)) : 0;
  return (
    <g opacity={opacity} transform={`translate(${x},${y}) scale(${scale}) translate(${-x},${-y})`}>
      <path d={`M${base.x},${base.y} Q${cx},${cy} ${x},${y}`} stroke={SK} strokeWidth={118} strokeLinecap="round" fill="none" />
      <path d={`M${base.x},${base.y} Q${cx},${cy} ${x},${y}`} stroke={RIM} strokeWidth={118} strokeLinecap="round" fill="none" strokeDasharray="0 100000" />
      {layer.cuff && <g transform={`translate(${x},${y}) rotate(${(ang * 180) / Math.PI})`}><rect x={-96} y={-62} width={64} height={124} rx={14} fill={layer.cuff} /></g>}
      <g transform={`translate(${x},${y}) rotate(${(ang * 180) / Math.PI})`}>
        <g opacity={swap ? 1 - k : 1}><HandShape kind={layer.kind} frame={frame} /></g>
        {layer.to && <g opacity={k}><HandShape kind={layer.to} frame={frame} /></g>}
      </g>
    </g>
  );
};
