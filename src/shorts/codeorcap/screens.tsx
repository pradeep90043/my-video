import { interpolate, useCurrentFrame } from "remotion";
import {
  FadeIn,
  GlitchReveal,
  ScalePop,
  SlideInLeft,
  SlideInRight,
} from "./animations";
import { Badge, BrandLockup, Shell, baseText, brand } from "./Primitives";

const normalizeClaim = (claim: string) => claim.trim().toUpperCase();

export const HookScreen: React.FC<{ hook: string; claim: string }> = ({
  hook,
  claim,
}) => {
  const frame = useCurrentFrame();

  const scanlineOpacity = interpolate(frame, [0, 18], [0, 0.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Shell>
      {/* scanline overlay for CRT cyberpunk feel */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px)",
          opacity: scanlineOpacity,
          pointerEvents: "none",
        }}
      />

      <FadeIn delay={0} duration={10}>
        <BrandLockup compact />
      </FadeIn>

      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        <SlideInLeft delay={8}>
          <Badge
            dark
            style={{
              fontSize: 36,
              padding: "14px 22px",
              boxShadow: `0 0 54px ${brand.yellow}55`,
            }}
          >
            EVERYONE SAYS…
          </Badge>
        </SlideInLeft>

        <GlitchReveal delay={20}>
          <div
            style={{
              ...baseText,
              color: brand.white,
              fontSize: normalizeClaim(claim).length > 18 ? 86 : 106,
              fontWeight: 950,
              lineHeight: 0.9,
              textTransform: "uppercase",
              textShadow: `0 0 60px ${brand.yellow}55`,
            }}
          >
            {normalizeClaim(claim)}
          </div>
        </GlitchReveal>

        <SlideInLeft delay={52}>
          <div
            style={{
              ...baseText,
              color: brand.white,
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.3,
              opacity: 0.88,
            }}
          >
            {hook}
          </div>
        </SlideInLeft>
      </div>

      <ScalePop delay={80}>
        <div
          style={{
            ...baseText,
            color: brand.orange,
            fontSize: 58,
            fontWeight: 950,
            textTransform: "uppercase",
            textShadow: `0 0 40px ${brand.orange}88`,
          }}
        >
          Code Or Cap? ▸
        </div>
      </ScalePop>
    </Shell>
  );
};

export const ClaimScreen: React.FC<{ claim: string }> = ({ claim }) => {
  const frame = useCurrentFrame();
  const questionOpacity = interpolate(frame, [92, 116], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Shell>
      <BrandLockup compact />
      <div>
        <ScalePop>
          <Badge dark>CLAIM</Badge>
        </ScalePop>
        <SlideInLeft delay={22}>
          <div
            style={{
              ...baseText,
              marginTop: 70,
              color: brand.white,
              fontSize: 118,
              fontWeight: 950,
              lineHeight: 0.92,
              textTransform: "uppercase",
              textShadow: "0 0 34px rgba(255,184,0,0.35)",
            }}
          >
            {normalizeClaim(claim)}
          </div>
        </SlideInLeft>
        <GlitchReveal delay={62}>
          <div
            style={{
              ...baseText,
              marginTop: 42,
              color: brand.orange,
              fontSize: 74,
              fontWeight: 950,
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            CODE OR CAP?
          </div>
        </GlitchReveal>
      </div>
      <div
        style={{
          ...baseText,
          opacity: questionOpacity,
          color: brand.white,
          fontSize: 34,
          fontWeight: 800,
        }}
      >
        Stop Guessing. Start Knowing.
      </div>
    </Shell>
  );
};

export const EvidenceScreen: React.FC<{
  claim: string;
  evidence: string[];
}> = ({ claim, evidence }) => {
  const frame = useCurrentFrame();

  return (
    <Shell>
      <ScalePop>
        <Badge>EVIDENCE</Badge>
      </ScalePop>
      <div>
        <SlideInRight delay={12}>
          <div
            style={{
              ...baseText,
              color: brand.white,
              fontSize: 58,
              fontWeight: 900,
              lineHeight: 1.05,
              textTransform: "uppercase",
            }}
          >
            {normalizeClaim(claim)}
          </div>
        </SlideInRight>
        <div style={{ marginTop: 64, display: "flex", flexDirection: "column", gap: 34 }}>
          {evidence.map((item, index) => {
            const visibleChars = Math.floor(
              interpolate(frame, [index * 32 + 18, index * 32 + 48], [0, item.length], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            );
            return (
              <div
                key={item}
                style={{
                  ...baseText,
                  color: brand.white,
                  fontSize: 38,
                  lineHeight: 1.18,
                  fontWeight: 800,
                  borderLeft: `8px solid ${index % 2 === 0 ? brand.yellow : brand.orange}`,
                  paddingLeft: 24,
                  minHeight: 90,
                }}
              >
                {item.slice(0, visibleChars)}
                <span style={{ color: brand.yellow }}>
                  {visibleChars < item.length ? "_" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <BrandLockup compact />
    </Shell>
  );
};

export const VerdictScreen: React.FC<{ verdict: string; winner: string }> = ({
  verdict,
  winner,
}) => {
  const verdictColor = verdict.toUpperCase().includes("CAP")
    ? brand.orange
    : verdict.toUpperCase().includes("PART")
      ? brand.yellow
      : "#20E070";

  return (
    <Shell>
      <FadeIn>
        <BrandLockup compact />
      </FadeIn>
      <div style={{ textAlign: "center" }}>
        <ScalePop delay={4}>
          <Badge color={verdictColor} dark style={{ fontSize: 52 }}>
            VERDICT
          </Badge>
        </ScalePop>
        <GlitchReveal delay={24}>
          <div
            style={{
              ...baseText,
              marginTop: 68,
              color: verdictColor,
              fontSize: verdict.length > 12 ? 104 : 154,
              lineHeight: 0.9,
              fontWeight: 950,
              textTransform: "uppercase",
              textShadow: `0 0 46px ${verdictColor}88`,
            }}
          >
            {verdict}
          </div>
        </GlitchReveal>
        <SlideInLeft delay={58}>
          <div
            style={{
              ...baseText,
              marginTop: 64,
              color: brand.white,
              fontSize: 48,
              lineHeight: 1.08,
              fontWeight: 850,
            }}
          >
            Winner: <span style={{ color: brand.yellow }}>{winner}</span>
          </div>
        </SlideInLeft>
      </div>
      <div />
    </Shell>
  );
};

export const RatingScreen: React.FC<{
  claim: string;
  rating: string;
}> = ({ claim, rating }) => (
  <Shell>
    <ScalePop>
      <Badge color={brand.orange}>RATING</Badge>
    </ScalePop>
    <div>
      <SlideInLeft delay={16}>
        <div
          style={{
            ...baseText,
            color: brand.white,
            fontSize: 76,
            fontWeight: 950,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {normalizeClaim(claim)}
        </div>
      </SlideInLeft>
      <ScalePop delay={36}>
        <div
          style={{
            ...baseText,
            marginTop: 74,
            color: brand.yellow,
            fontSize: 142,
            fontWeight: 950,
            lineHeight: 1,
            textShadow: "0 0 44px rgba(255,184,0,0.6)",
          }}
        >
          Rating: {rating}
        </div>
      </ScalePop>
    </div>
    <BrandLockup compact />
  </Shell>
);

export const OutroScreen: React.FC<{ handle?: string }> = ({ handle }) => (
  <Shell>
    <div />
    <div style={{ textAlign: "center" }}>
      <ScalePop>
        <div
          style={{
            ...baseText,
            color: brand.white,
            fontSize: 118,
            fontWeight: 950,
            textTransform: "uppercase",
            lineHeight: 0.92,
          }}
        >
          <span style={{ color: brand.yellow }}>Code</span>Or
          <span style={{ color: brand.orange }}>Cap</span>
        </div>
      </ScalePop>

      <FadeIn delay={10}>
        <div
          style={{
            ...baseText,
            marginTop: 48,
            color: brand.white,
            fontSize: 38,
            fontWeight: 800,
            lineHeight: 1.35,
            opacity: 0.9,
          }}
        >
          Aisi aur tech myths ke liye
        </div>
      </FadeIn>

      <FadeIn delay={18}>
        <div
          style={{
            ...baseText,
            marginTop: 18,
            color: brand.yellow,
            fontSize: 48,
            fontWeight: 950,
            lineHeight: 1.1,
            textShadow: `0 0 32px rgba(255,184,0,0.6)`,
          }}
        >
          Subscribe karo YouTube pe
        </div>
      </FadeIn>

      <ScalePop delay={28}>
        <div
          style={{
            display: "inline-block",
            marginTop: 32,
            background: brand.orange,
            borderRadius: 16,
            padding: "14px 36px",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.white,
              fontSize: 52,
              fontWeight: 950,
              letterSpacing: 1,
            }}
          >
            {handle || "@codeorcap"}
          </div>
        </div>
      </ScalePop>

      <FadeIn delay={42}>
        <div
          style={{
            ...baseText,
            marginTop: 36,
            color: brand.white,
            fontSize: 34,
            fontWeight: 800,
            opacity: 0.7,
          }}
        >
          Stop Guessing. Start Knowing.
        </div>
      </FadeIn>
    </div>
    <div />
  </Shell>
);
