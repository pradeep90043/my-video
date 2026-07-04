import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import {
  CodeOrCapConfigSchema,
  defaultCodeOrCapConfig,
  type CodeOrCapConfig,
} from "./types";
import { TechBackground } from "./Background";
import {
  ClaimScreen,
  EvidenceScreen,
  HookScreen,
  OutroScreen,
  RatingScreen,
  VerdictScreen,
} from "./screens";

const resolveAudioSource = (src: string) =>
  src.startsWith("http://") || src.startsWith("https://")
    ? src
    : staticFile(src);

const AudioBed: React.FC<{
  config: CodeOrCapConfig;
}> = ({ config }) => (
  <>
    {config.voiceoverTrack ? (
      <Audio
        src={resolveAudioSource(config.voiceoverTrack)}
        volume={1}
        from={-2}
      />
    ) : null}
    {config.musicTrack ? (
      <Audio src={resolveAudioSource(config.musicTrack)} volume={0.28} />
    ) : null}
    {config.glitchSfx ? (
      <>
        {/* glitch at hook→claim transition */}
        <Sequence from={148} durationInFrames={18}>
          <Audio src={resolveAudioSource(config.glitchSfx)} volume={0.7} />
        </Sequence>
        {/* glitch at verdict reveal */}
        <Sequence from={558} durationInFrames={18}>
          <Audio src={resolveAudioSource(config.glitchSfx)} volume={0.7} />
        </Sequence>
      </>
    ) : null}
    {config.impactSfx ? (
      <>
        {/* impact at very start */}
        <Sequence durationInFrames={24}>
          <Audio src={resolveAudioSource(config.impactSfx)} volume={0.72} />
        </Sequence>
        {/* impact at rating reveal */}
        <Sequence from={690} durationInFrames={24}>
          <Audio src={resolveAudioSource(config.impactSfx)} volume={0.72} />
        </Sequence>
      </>
    ) : null}
  </>
);

export const CODE_OR_CAP_FPS = 30;
// Default 32s — overridden by calculateMetadata once audio duration is known
export const CODE_OR_CAP_DURATION_FRAMES = 32 * CODE_OR_CAP_FPS;

// Screen proportions of total video (must sum to 1)
const PROPORTIONS = {
  hook:     0.14, // ~8s in a 56s video
  claim:    0.14,
  evidence: 0.36, // largest chunk — 3 facts
  verdict:  0.16,
  rating:   0.12,
  outro:    0.08,
} as const;

export const codeOrCapSchema = CodeOrCapConfigSchema;

const buildEvidence = (config: CodeOrCapConfig) =>
  config.evidence && config.evidence.length > 0
    ? config.evidence
    : [
        "Real adoption matters more than viral opinions.",
        "Tools change, but useful engineering skills compound.",
        `Best path: ${config.winner}.`,
      ];

export const CodeOrCapVideo: React.FC<CodeOrCapConfig> = (props) => {
  const config = { ...defaultCodeOrCapConfig, ...props };
  const evidence = buildEvidence(config);
  const { durationInFrames } = useVideoConfig();

  const hookText =
    config.hook ||
    `But if that's true… why do so many engineers still disagree? Let's find out.`;

  const f = (ratio: number) => Math.round(durationInFrames * ratio);

  const hookStart    = 0;
  const claimStart   = f(PROPORTIONS.hook);
  const evidStart    = f(PROPORTIONS.hook + PROPORTIONS.claim);
  const verdictStart = f(PROPORTIONS.hook + PROPORTIONS.claim + PROPORTIONS.evidence);
  const ratingStart  = f(PROPORTIONS.hook + PROPORTIONS.claim + PROPORTIONS.evidence + PROPORTIONS.verdict);
  const outroStart   = f(PROPORTIONS.hook + PROPORTIONS.claim + PROPORTIONS.evidence + PROPORTIONS.verdict + PROPORTIONS.rating);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0B0B" }}>
      <TechBackground />
      <AudioBed config={config} />
      <Sequence from={hookStart} durationInFrames={claimStart - hookStart}>
        <HookScreen hook={hookText} claim={config.claim} />
      </Sequence>
      <Sequence from={claimStart} durationInFrames={evidStart - claimStart}>
        <ClaimScreen claim={config.claim} />
      </Sequence>
      <Sequence from={evidStart} durationInFrames={verdictStart - evidStart}>
        <EvidenceScreen claim={config.claim} evidence={evidence} />
      </Sequence>
      <Sequence from={verdictStart} durationInFrames={ratingStart - verdictStart}>
        <VerdictScreen verdict={config.verdict} winner={config.winner} />
      </Sequence>
      <Sequence from={ratingStart} durationInFrames={outroStart - ratingStart}>
        <RatingScreen claim={config.claim} rating={config.rating} />
      </Sequence>
      <Sequence from={outroStart} durationInFrames={durationInFrames - outroStart}>
        <OutroScreen handle={config.handle} />
      </Sequence>
    </AbsoluteFill>
  );
};
