import React from "react";
import { AbsoluteFill } from "remotion";
import { Puppet } from "./Puppet";
import type { PuppetSpec } from "./spec";
import type { CharPose } from "../cast";

const CELLS: { pose: CharPose; frame: number }[] = [
  { pose: "stand", frame: 20 }, { pose: "walk", frame: 14 }, { pose: "run", frame: 6 },
  { pose: "run", frame: 14 }, { pose: "run", frame: 22 }, { pose: "talk", frame: 30 },
];

/** A contact sheet of a rider on a mount: the quick visual check for gallop and seat. */
export const RideSheet: React.FC<{ mount: PuppetSpec; rider: PuppetSpec }> = ({ mount, rider }) => (
  <AbsoluteFill style={{ background: "#BFE3F5" }}>
    <svg width={1500} height={1080} viewBox="0 -40 1500 1080">
      {CELLS.map((c, i) => (
        <g key={i} transform={`translate(${260 + (i % 3) * 480},${420 + Math.floor(i / 3) * 440}) scale(0.78)`}>
          <Puppet spec={mount} pose={c.pose} mood="happy" frame={c.frame} rider={{ spec: rider }} talking={c.pose === "talk"} mouthLevel={0.8} />
          <text y={60} textAnchor="middle" fontSize={34} fontFamily="sans-serif" fontWeight={800} fill="#2B2B2B">{c.pose} f{c.frame}</text>
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);
