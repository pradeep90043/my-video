// src/compositions/Video.tsx
// Exports ONLY the renderable component. The <Composition> is registered in Root.tsx.
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Hook } from "../../shared/scenes/Hook";
import { Claim } from "../../shared/scenes/Claim";
import { RealityCheck } from "../../shared/scenes/RealityCheck";
import { Evidence } from "../../shared/scenes/Evidence";
import { Verdict } from "../../shared/scenes/Verdict";
import { CTA } from "../../shared/scenes/CTA";
import { DURATION, FPS, COLORS } from "../../shared/utils/constants";

/** Root component for the 45-second "Can AI Replace Frontend Developers?" video */
export const AIVideoRoot: React.FC = () => {
  const { hook, claim, reality, evidence, verdict, cta } = DURATION;
  const fps = FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Sequence from={0} durationInFrames={hook * fps} name="Hook">
        <Hook />
      </Sequence>
      <Sequence from={hook * fps} durationInFrames={claim * fps} name="Claim">
        <Claim />
      </Sequence>
      <Sequence from={(hook + claim) * fps} durationInFrames={reality * fps} name="RealityCheck">
        <RealityCheck />
      </Sequence>
      <Sequence from={(hook + claim + reality) * fps} durationInFrames={evidence * fps} name="Evidence">
        <Evidence />
      </Sequence>
      <Sequence from={(hook + claim + reality + evidence) * fps} durationInFrames={verdict * fps} name="Verdict">
        <Verdict />
      </Sequence>
      <Sequence from={(hook + claim + reality + evidence + verdict) * fps} durationInFrames={cta * fps} name="CTA">
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
