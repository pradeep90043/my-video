import React from "react";
import { AbsoluteFill } from "remotion";
import { ASSET_DRAW, INK, resolveTint } from "./assets";
import { SCENE_ASSETS } from "./catalog";

/** Contact sheet of every doodle asset (dev preview): `npx remotion still DoodleCatalog out/doodle-catalog.png` */
export const DOODLE_CATALOG_SIZE = { cols: 8, cell: 220, header: 20 } as const;

export const DoodleCatalog: React.FC = () => {
  const { cols, cell } = DOODLE_CATALOG_SIZE;
  return (
    <AbsoluteFill style={{ backgroundColor: "#FBF6E9" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${cols * cell} ${Math.ceil(SCENE_ASSETS.length / cols) * (cell + 34) + 20}`}>
        {SCENE_ASSETS.map((name, i) => {
          const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 34) + 10;
          return (
            <g key={name} transform={`translate(${x},${y})`}>
              <g transform="translate(10,0) scale(1)">{ASSET_DRAW[name](resolveTint(undefined, name))}</g>
              <text x={cell / 2} y={cell + 14} textAnchor="middle" fontSize={22} fontFamily="Arial, sans-serif" fill={INK}>{name}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
