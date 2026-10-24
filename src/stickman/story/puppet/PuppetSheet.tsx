import React from "react";
import { AbsoluteFill } from "remotion";
import { Puppet } from "./Puppet";
import type { PuppetSpec } from "./spec";
import type { CharPose } from "../cast";

const POSES: CharPose[] = ["stand", "walk", "run", "talk", "eat", "shout", "sad", "happy", "sleep"];

/** A contact sheet of one puppet in nine poses: the quick visual check after a character is drawn. */
export const PuppetSheet: React.FC<{ spec: PuppetSpec }> = ({ spec }) => {
  const k = Math.min(1, 300 / spec.height);
  return (
    <AbsoluteFill style={{ background: "#BFE3F5" }}>
      <svg width={1500} height={1080} viewBox="0 -40 1500 1080">
        {POSES.map((pose, i) => (
          <g key={pose} transform={`translate(${250 + (i % 3) * 500},${300 + Math.floor(i / 3) * 310}) scale(${k * 0.8})`}>
            <Puppet spec={spec} pose={pose} mood={pose === "sad" ? "sad" : "happy"} frame={34} talking={pose === "talk"} mouthLevel={0.8} />
            <text y={52} textAnchor="middle" fontSize={34} fontFamily="sans-serif" fontWeight={800} fill="#2B2B2B">{pose}</text>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
