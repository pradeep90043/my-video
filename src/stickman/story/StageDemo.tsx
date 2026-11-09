import React from "react";
import { AbsoluteFill } from "remotion";
import { StoryStage } from "./StoryStage";
import type { CastMember, StagedChar } from "./cast";
import type { Scenery } from "./Scenery";

/** One storyboard shot with a designed background, for checking a freestyle design by eye (remotion still StageDemo --props=...). */
export const StageDemo: React.FC<{ scenery: Scenery; cast: CastMember[]; chars: StagedChar[]; frame?: number }> = ({ scenery, cast, chars, frame = 40 }) => (
  <AbsoluteFill>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <StoryStage bg="village" time="day" scenery={scenery} chars={chars} cast={cast} frame={frame} durationFrames={120} w={1920} h={1080} ground={880} talking={false} camera="none" />
    </svg>
  </AbsoluteFill>
);
