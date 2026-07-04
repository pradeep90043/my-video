import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, baseText, Badge, Shell, BrandLockup } from "../../shorts/codeorcap/Primitives";
import { ScalePop, FadeIn } from "../../shorts/codeorcap/animations";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const AMBER = "#FFAB00";
const AMBER_DARK = "#3A2800";
const SEGMENT_COUNT = 10;
const FILLED_COUNT = 4;

export const VerdictScene5Min: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Dark intro (0-10) ---
  const introOpacity = interpolate(frame, [0, 10], [0, 1], clamp);

  // --- Stamp slam (40-60): scale 3→1 with spring ---
  const stampProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 80, stiffness: 300, mass: 0.8 },
  });
  const stampScale = interpolate(stampProgress, [0, 1], [3, 1], clamp);
  const stampOpacity = frame >= 40 ? Math.min(stampProgress * 2, 1) : 0;

  // --- Camera shake (40-55): translateX/Y jitter ---
  const isShaking = frame >= 40 && frame < 55;
  let shakeX = 0;
  let shakeY = 0;
  if (isShaking) {
    const shakeFrame = frame - 40;
    const intensity = interpolate(shakeFrame, [0, 15], [1, 0], clamp);
    shakeX = Math.sin(shakeFrame * 7.3) * 12 * intensity;
    shakeY = Math.cos(shakeFrame * 5.1) * 8 * intensity;
  }

  // --- Rating meter fill (80-160): 4 segments, each ~20 frames ---
  const meterProgress = interpolate(frame, [80, 160], [0, FILLED_COUNT], clamp);
  const countUp = Math.floor(meterProgress);
  const displayCount = frame < 80 ? 0 : countUp;

  // --- Freeze flash (180): brief white flash then hold ---
  const flashOpacity = interpolate(frame, [180, 185, 195], [0, 0.7, 0], clamp);

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "transparent",
        overflow: "hidden",
        position: "relative",
        opacity: introOpacity,
      }}
    >
      {/* Camera shake wrapper */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        <Shell style={{ padding: "80px 120px 60px" }}>
          {/* Top section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 50,
            }}
          >
            {/* VERDICT badge */}
            <ScalePop delay={10}>
              <Badge
                color={AMBER}
                style={{
                  boxShadow: `0 0 50px ${AMBER}88, 0 0 100px ${AMBER}44`,
                  fontSize: 38,
                  letterSpacing: 6,
                }}
              >
                ⚡ VERDICT
              </Badge>
            </ScalePop>

            {/* Stamp: PARTIALLY TRUE (leaning CAP) */}
            <div
              style={{
                ...baseText,
                opacity: stampOpacity,
                transform: `scale(${stampScale})`,
                textAlign: "center",
                marginTop: 20,
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: AMBER,
                  textTransform: "uppercase",
                  textShadow: `0 0 30px ${AMBER}88, 0 4px 12px rgba(0,0,0,0.6)`,
                  border: `5px solid ${AMBER}`,
                  borderRadius: 12,
                  padding: "24px 50px",
                  display: "inline-block",
                  backgroundColor: "rgba(255, 171, 0, 0.08)",
                  transform: "rotate(-2deg)",
                }}
              >
                ⚠️ PARTIALLY TRUE
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    color: brand.white,
                    marginTop: 8,
                    opacity: 0.85,
                  }}
                >
                  (leaning CAP)
                </div>
              </div>
            </div>
          </div>

          {/* Middle section: Rating meter */}
          <FadeIn delay={75} duration={10}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 30,
              }}
            >
              {/* Rating meter bar */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                {Array.from({ length: SEGMENT_COUNT }).map((_, i) => {
                  const segmentIndex = i + 1;
                  const isFilled = meterProgress >= segmentIndex;
                  const isPartial =
                    !isFilled && meterProgress > i && meterProgress < segmentIndex;
                  const fillAmount = isPartial ? meterProgress - i : isFilled ? 1 : 0;

                  return (
                    <div
                      key={i}
                      style={{
                        width: 120,
                        height: 50,
                        borderRadius: 6,
                        border: `2px solid ${segmentIndex <= FILLED_COUNT ? AMBER + "66" : "#333"}`,
                        backgroundColor: AMBER_DARK + "33",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Fill */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${fillAmount * 100}%`,
                          backgroundColor:
                            segmentIndex <= FILLED_COUNT ? AMBER : "#333",
                          boxShadow:
                            isFilled && segmentIndex <= FILLED_COUNT
                              ? `0 0 14px ${AMBER}88`
                              : "none",
                        }}
                      />
                      {/* Segment number */}
                      <div
                        style={{
                          ...baseText,
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          fontWeight: 800,
                          color: isFilled ? brand.black : "#555",
                          zIndex: 1,
                        }}
                      >
                        {segmentIndex}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Count-up number */}
              <div
                style={{
                  ...baseText,
                  fontSize: 80,
                  fontWeight: 900,
                  color: AMBER,
                  textShadow: `0 0 40px ${AMBER}66`,
                }}
              >
                {displayCount}
                <span style={{ fontSize: 48, color: brand.white, opacity: 0.5 }}>
                  /10
                </span>
              </div>

              {/* TRUTH RATING label */}
              <div
                style={{
                  ...baseText,
                  fontSize: 36,
                  fontWeight: 800,
                  color: brand.white,
                  textTransform: "uppercase",
                  letterSpacing: 8,
                  opacity: 0.8,
                }}
              >
                TRUTH RATING: {displayCount}/10
              </div>
            </div>
          </FadeIn>

          {/* Bottom: BrandLockup */}
          <FadeIn delay={30} duration={15}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <BrandLockup compact />
            </div>
          </FadeIn>
        </Shell>
      </div>

      {/* Freeze flash overlay */}
      {flashOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: brand.white,
            opacity: flashOpacity,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};
