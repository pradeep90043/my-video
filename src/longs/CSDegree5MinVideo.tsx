import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  Img,
  Easing,
} from "remotion";
import { Badge, Shell, baseText, brand } from "../shorts/codeorcap/Primitives";
import { FadeIn, GlitchReveal, ScalePop } from "../shorts/codeorcap/animations";
import { Character } from "../shorts/codeorcap/Character";

// Smooth Image component with cross-fade, alternating zoom, and horizontal pan
const SmoothImage: React.FC<{
  src: string;
  startFrame: number;
  endFrame: number;
  zoomDirection?: "in" | "out";
  panDirection?: "left" | "right" | "none";
  fadeDuration?: number;
}> = ({
  src,
  startFrame,
  endFrame,
  zoomDirection = "in",
  fadeDuration = 25,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (frame < startFrame || frame > endFrame + fadeDuration) {
    return null;
  }

  const opacity = interpolate(localFrame, [0, fadeDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  const totalDuration = endFrame - startFrame + fadeDuration;

  const scale = interpolate(
    localFrame,
    [0, totalDuration],
    zoomDirection === "in" ? [1.0, 1.03] : [1.03, 1.0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
    },
  );

  return (
    <AbsoluteFill style={{ opacity, zIndex: 0 }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          translate: "6.8px -8.9px",
        }}
      />
    </AbsoluteFill>
  );
};

// Dark overlay to ensure readability of text on top of images
const ImageOverlay: React.FC<{ zIndex?: number; opacity?: number }> = ({
  zIndex = 1,
  opacity = 0.75,
}) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(11,11,11,${opacity * 0.7}) 0%, rgba(11,11,11,${opacity}) 50%, rgba(11,11,11,${opacity * 1.25}) 100%)`,
      zIndex,
      pointerEvents: "none",
    }}
  />
);

// Cyberpunk overlays (Grid lines, floating particles, and scrolling code lines)
const AnimatedOverlays: React.FC<{ zIndex?: number }> = ({ zIndex = 2 }) => {
  const frame = useCurrentFrame();

  const codeLines = [
    "const truth = claim => verify(claim)",
    "if (hype > evidence) return 'CAP'",
    "type Verdict = 'CODE' | 'CAP'",
    "await facts.check(source)",
    "ship(value).then(measure)",
    "cache.invalidate('myths')",
  ];

  return (
    <AbsoluteFill style={{ zIndex, pointerEvents: "none", overflow: "hidden" }}>
      {/* Grid overlay */}
      <AbsoluteFill
        style={{
          opacity: 0.12,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
        }}
      />
      {/* Code lines */}
      {codeLines.map((line, index) => {
        const top = 110 + index * 145;
        const x = ((frame * (0.65 + index * 0.06) + index * 83) % 2520) - 600;
        return (
          <div
            key={line}
            style={{
              position: "absolute",
              top,
              left: x,
              color: index % 2 === 0 ? "#FFB800" : "#FFFFFF",
              fontFamily: "monospace",
              fontSize: 28,
              opacity: 0.06,
              whiteSpace: "nowrap",
              textShadow: "0 0 18px rgba(255,184,0,0.35)",
            }}
          >
            {line}
          </div>
        );
      })}
      {/* Floating particles */}
      {Array.from({ length: 22 }).map((_, index) => {
        const left = (index * 257) % 1920;
        const top = (index * 139 + frame * ((index % 5) + 1)) % 1080;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left,
              top,
              width: 5 + (index % 4) * 3,
              height: 5 + (index % 4) * 3,
              borderRadius: 999,
              backgroundColor: index % 2 === 0 ? "#FFB800" : "#FF8A00",
              boxShadow: "0 0 22px rgba(255,184,0,0.85)",
              opacity: 0.25,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Global Background Slideshow containing ambient landscape environment backdrops
const BackgroundSlideshow: React.FC = () => {
  return (
    <AbsoluteFill style={{ zIndex: 0 }}>
      {/* Scene 1 (0 to 1300) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene1_1.png")}
        startFrame={0}
        endFrame={650}
        zoomDirection="in"
        panDirection="right"
      />
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene1_2.png")}
        startFrame={650}
        endFrame={1300}
        zoomDirection="out"
        panDirection="left"
      />

      {/* Scene 2 (1300 to 2100) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene2_1.png")}
        startFrame={1300}
        endFrame={2100}
        zoomDirection="in"
        panDirection="right"
      />

      {/* Scene 3 (2100 to 2850) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene2_2.png")}
        startFrame={2100}
        endFrame={2850}
        zoomDirection="out"
        panDirection="left"
      />

      {/* Scene 4 (2850 to 3600) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene2_3.png")}
        startFrame={2850}
        endFrame={3600}
        zoomDirection="in"
        panDirection="right"
      />

      {/* Scene 5 (3600 to 5100) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene3_1.png")}
        startFrame={3600}
        endFrame={4350}
        zoomDirection="out"
        panDirection="left"
      />
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene3_2.png")}
        startFrame={4350}
        endFrame={5100}
        zoomDirection="in"
        panDirection="right"
      />

      {/* Scene 6 (5100 to 5850) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene3_3.png")}
        startFrame={5100}
        endFrame={5850}
        zoomDirection="out"
        panDirection="left"
      />

      {/* Scene 7 (5850 to 6750) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene4_1.png")}
        startFrame={5850}
        endFrame={6750}
        zoomDirection="in"
        panDirection="right"
      />

      {/* Scene 8 (6750 to 7650) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene4_2.png")}
        startFrame={6750}
        endFrame={7650}
        zoomDirection="out"
        panDirection="left"
      />

      {/* Scene 9 (7650 to 8800) */}
      <SmoothImage
        src={staticFile("content/codeorcap/images/scene5_1.png")}
        startFrame={7650}
        endFrame={8800}
        zoomDirection="in"
        panDirection="right"
      />
    </AbsoluteFill>
  );
};

// Scene 1: Hook (0 - 1300 frames)
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();

  // Rapid zoom scale when notification drops
  const cameraScale = interpolate(frame, [300, 350], [1, 1.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // White flash trigger around frame 300
  const flashOpacity = interpolate(frame, [300, 303, 330], [0, 0.8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Camera shake offset after shock
  const shakeX = frame > 300 && frame < 380 ? Math.sin(frame * 0.85) * 5 : 0;
  const shakeY = frame > 300 && frame < 380 ? Math.cos(frame * 0.85) * 5 : 0;

  // Layoff notification entrance slide
  const notificationProgress = spring({
    frame: frame - 280,
    fps: 30,
    config: { damping: 10 },
  });
  const notificationY = interpolate(notificationProgress, [0, 1], [-200, 40]);

  // Determine current emotion
  const emotion = frame > 300 ? "shocked" : "neutral";

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${cameraScale}) translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            MYTH BUSTER
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            0:00 - 0:43
          </div>
        </div>

        {/* Shock flash */}
        <AbsoluteFill
          style={{
            backgroundColor: "#FFFFFF",
            opacity: flashOpacity,
            zIndex: 9,
            pointerEvents: "none",
          }}
        />

        {/* Center: Character coding */}
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <Character
            emotion={emotion}
            gesture={frame > 300 ? "none" : "typing"}
            style={{ transform: "scale(1.5)" }}
          />

          {/* Floating Neon Notification box */}
          {frame >= 280 && (
            <div
              style={{
                position: "absolute",
                top: notificationY,
                backgroundColor: "rgba(11,11,11,0.92)",
                border: `4px solid ${brand.orange}`,
                boxShadow: `0 0 35px ${brand.orange}66`,
                padding: "20px 30px",
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                zIndex: 10,
              }}
            >
              <div
                style={{
                  ...baseText,
                  color: brand.orange,
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                ⚠️ CRITICAL LAYOFF UPDATE
              </div>
              <div
                style={{
                  ...baseText,
                  color: brand.white,
                  fontWeight: 800,
                  fontSize: 34,
                }}
              >
                🚨 +10,000 TECH LAYOFFS REPORTED
              </div>
            </div>
          )}
        </div>

        {/* Bottom title block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 15,
            alignItems: "center",
          }}
        >
          {frame > 330 ? (
            <GlitchReveal>
              <div
                style={{
                  ...baseText,
                  color: brand.yellow,
                  fontSize: 68,
                  fontWeight: 950,
                  lineHeight: 1.0,
                  textTransform: "uppercase",
                  textShadow: "0 0 24px rgba(255,184,0,0.45)",
                  textAlign: "center",
                }}
              >
                CS DEGREE IS DEAD?
              </div>
            </GlitchReveal>
          ) : (
            <div
              style={{
                ...baseText,
                color: brand.white,
                opacity: 0.8,
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              Coding in the shadows...
            </div>
          )}
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 2: Industry Panic (1300 - 2100 frames)
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();

  // Matrix Rain Overlay lines
  const rainDrops = Array.from({ length: 18 }).map((_, i) => {
    const left = (i * 117) % 1920;
    const speed = 12 + (i % 6) * 4;
    const y = ((frame * speed + i * 299) % 1200) - 100;
    return { left, y };
  });

  // Floating news headline slide progress
  const headline1Progress = spring({
    frame: frame - 60,
    fps: 30,
    config: { damping: 12 },
  });
  const headline2Progress = spring({
    frame: frame - 150,
    fps: 30,
    config: { damping: 12 },
  });

  const headline1X = interpolate(headline1Progress, [0, 1], [-500, 80]);
  const headline2X = interpolate(headline2Progress, [0, 1], [2400, 1200]);

  return (
    <AbsoluteFill>
      {/* Matrix rain drops */}
      <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none" }}>
        {rainDrops.map((drop, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: drop.left,
              top: drop.y,
              width: 3.5,
              height: 100,
              background:
                "linear-gradient(180deg, transparent 0%, #FFB800 100%)",
              opacity: 0.22,
            }}
          />
        ))}
      </AbsoluteFill>

      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            INDUSTRY PANIC
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            0:43 - 1:10
          </div>
        </div>

        {/* News Headline Billboard overlays */}
        <div
          style={{
            position: "absolute",
            top: 180,
            left: 0,
            right: 0,
            bottom: 200,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: headline1X,
              top: 20,
              backgroundColor: "rgba(11,11,11,0.92)",
              borderLeft: `8px solid ${brand.orange}`,
              padding: "20px 30px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                ...baseText,
                color: brand.white,
                opacity: 0.6,
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              NEWS ALERT
            </div>
            <div
              style={{
                ...baseText,
                color: brand.white,
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              AI HEADLINES GROW: JUNIORS REPLACED?
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: headline2X,
              top: 140,
              backgroundColor: "rgba(11,11,11,0.92)",
              borderRight: `8px solid ${brand.yellow}`,
              padding: "20px 30px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                ...baseText,
                color: brand.yellow,
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              MARKET ANALYSIS
            </div>
            <div
              style={{
                ...baseText,
                color: brand.white,
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              ENTRY LEVEL APPLICATIONS FLOODED
            </div>
          </div>
        </div>

        {/* Center: Protagonist walking worried */}
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Character
            emotion="frustrated"
            gesture="shrug"
            style={{ transform: "scale(1.4)" }}
          />
        </div>

        <div
          style={{
            ...baseText,
            color: brand.white,
            opacity: 0.8,
            fontSize: 28,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          Post-2023 tech market change has created massive panic.
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 3: Traditional Pathway (2100 - 2850 frames)
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();

  // Animation progress for 4 pathway nodes
  const node1 = spring({ frame: frame - 50, fps: 30, config: { damping: 12 } });
  const node2 = spring({
    frame: frame - 150,
    fps: 30,
    config: { damping: 12 },
  });
  const node3 = spring({
    frame: frame - 250,
    fps: 30,
    config: { damping: 12 },
  });
  const node4 = spring({
    frame: frame - 350,
    fps: 30,
    config: { damping: 12 },
  });

  return (
    <AbsoluteFill>
      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            TRADITIONAL PATH
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            1:10 - 1:35
          </div>
        </div>

        {/* Center: Developer curious/looking at path */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 40,
          }}
        >
          <div
            style={{
              flex: 1.1,
              display: "flex",
              flexDirection: "column",
              gap: 30,
            }}
          >
            <div
              style={{
                ...baseText,
                color: brand.yellow,
                fontSize: 44,
                fontWeight: 950,
              }}
            >
              THE HOLOGRAPHIC PATHWAY
            </div>

            {/* Step-by-step pipeline row */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 15,
                width: "100%",
              }}
            >
              {[
                { title: "School", p: node1, color: brand.yellow },
                { title: "CS College", p: node2, color: brand.white },
                { title: "Career Fairs", p: node3, color: brand.white },
                { title: "Big Tech", p: node4, color: brand.orange },
              ].map((node, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: node.p,
                    transform: `translateY(${interpolate(node.p, [0, 1], [30, 0])}px)`,
                    backgroundColor: "rgba(11,11,11,0.85)",
                    borderTop: `6px solid ${node.color}`,
                    padding: "24px 10px",
                    borderRadius: 4,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                    minHeight: 120,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      ...baseText,
                      color: brand.white,
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {node.title}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              flex: 0.9,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Character
              emotion="curious"
              gesture="pointing"
              style={{ transform: "scale(1.4)" }}
            />
          </div>
        </div>

        <div
          style={{
            ...baseText,
            color: brand.white,
            opacity: 0.8,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          The institutional pipeline: College is a direct cheat code to return
          offers.
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 4: ATS Filter (2850 - 3600 frames)
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();

  // Scanning laser sweep line
  const scannerY = interpolate(Math.sin(frame * 0.08), [-1, 1], [380, 780]);

  // Reject stamp trigger at frame 320
  const stampProgress = spring({
    frame: frame - 320,
    fps: 30,
    config: { damping: 10 },
  });
  const stampScale = interpolate(stampProgress, [0, 1], [4, 1]);
  const stampOpacity = interpolate(stampProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            RECRUITER ATS FILTER
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            1:35 - 2:00
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 50,
          }}
        >
          {/* Resume scan console */}
          <div
            style={{
              flex: 1.2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(3,3,3,0.92)",
                border: `4px solid ${brand.yellow}`,
                boxShadow: `0 0 35px ${brand.yellow}33`,
                borderRadius: 8,
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                height: 480,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Scan laser line */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: scannerY,
                  height: 6,
                  backgroundColor: "#20E070",
                  boxShadow: "0 0 20px #20E070, 0 0 40px #20E070",
                  zIndex: 5,
                }}
              />

              <div
                style={{
                  ...baseText,
                  color: brand.white,
                  fontSize: 36,
                  fontWeight: 900,
                }}
              >
                RESUME CO-509
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span
                  style={{
                    ...baseText,
                    color: brand.white,
                    opacity: 0.7,
                    fontSize: 26,
                  }}
                >
                  Degree verified:
                </span>
                <span
                  style={{
                    ...baseText,
                    color: brand.orange,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  NOT FOUND
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span
                  style={{
                    ...baseText,
                    color: brand.white,
                    opacity: 0.7,
                    fontSize: 26,
                  }}
                >
                  Skills matches:
                </span>
                <span
                  style={{
                    ...baseText,
                    color: brand.yellow,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  React, JS, CSS
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                }}
              >
                <span
                  style={{
                    ...baseText,
                    color: brand.white,
                    opacity: 0.7,
                    fontSize: 26,
                  }}
                >
                  ATS Pre-Screen:
                </span>
                <span
                  style={{
                    ...baseText,
                    color: brand.orange,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  ARCHIVE FILE
                </span>
              </div>

              {/* REJECTED stamp overlay */}
              {frame >= 320 && (
                <div
                  style={{
                    position: "absolute",
                    top: "35%",
                    left: "25%",
                    transform: `scale(${stampScale})`,
                    opacity: stampOpacity,
                    border: "8px solid #FF003C",
                    color: "#FF003C",
                    fontSize: 54,
                    fontWeight: 950,
                    padding: "16px 36px",
                    borderRadius: 8,
                    textTransform: "uppercase",
                    transformOrigin: "center",
                    textShadow: "0 0 10px rgba(255,0,60,0.5)",
                    boxShadow: "0 0 20px rgba(255,0,60,0.2) inset",
                    rotate: "-12deg",
                    zIndex: 8,
                  }}
                >
                  REJECTED
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              flex: 0.8,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Character
              emotion="frustrated"
              gesture={frame > 320 ? "shrug" : "thinking"}
              style={{ transform: "scale(1.4)" }}
            />
          </div>
        </div>

        <div
          style={{
            ...baseText,
            color: brand.white,
            opacity: 0.8,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          recruitment software filters out 82% of applicants automatically.
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 5: Cost of Degree (3600 - 5100 frames)
const Scene5: React.FC = () => {
  const frame = useCurrentFrame();

  // Rapidly growing student debt counter
  const localFrame = frame;
  const debtAmount = Math.floor(
    interpolate(localFrame, [120, 1100], [0, 124500], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // Floating orbiting books simulation
  // We simulate 3D orbit around the dollar sign
  const bookOrbitAngle = frame * 0.04;
  const renderOrbitingBook = (
    title: string,
    offsetAngle: number,
    color: string,
  ) => {
    const angle = bookOrbitAngle + offsetAngle;
    const x = Math.cos(angle) * 380;
    const y = Math.sin(angle) * 75;

    // Scale down when in back, scale up when in front
    const scale = interpolate(Math.sin(angle), [-1, 1], [0.65, 1.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const zIndex = Math.sin(angle) > 0 ? 10 : 1;

    return (
      <div
        style={{
          position: "absolute",
          left: 960 + x - 100,
          top: 450 + y - 40,
          width: 180,
          height: 100,
          backgroundColor: "rgba(11,11,11,0.92)",
          border: `3px solid ${color}`,
          boxShadow: `0 4px 20px ${color}33`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 6,
          transform: `scale(${scale})`,
          zIndex,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            ...baseText,
            color: brand.white,
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          {title}
        </span>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 3D Orbiting Books behind/in front of dollar sign */}
      {renderOrbitingBook("Turing Machine", 0, brand.yellow)}
      {renderOrbitingBook("Java 8 Theory", (2 * Math.PI) / 3, brand.orange)}
      {renderOrbitingBook("Discrete Math", (4 * Math.PI) / 3, brand.white)}

      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            THE COST & REALITY
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            1:56 - 2:50
          </div>
        </div>

        {/* Center element: Dollar sign & Debt counter */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 30,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 24,
            }}
          >
            {/* Pulsing Dollar Icon */}
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 110,
                border: `8px solid ${brand.orange}`,
                backgroundColor: "rgba(11,11,11,0.85)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: `0 0 50px ${brand.orange}55`,
                transform: `scale(${1 + Math.sin(frame * 0.08) * 0.04})`,
              }}
            >
              <span
                style={{
                  ...baseText,
                  color: brand.orange,
                  fontSize: 110,
                  fontWeight: 950,
                }}
              >
                $
              </span>
            </div>

            {/* Glowing Debt counter */}
            <div
              style={{
                ...baseText,
                color: brand.white,
                fontSize: 54,
                fontWeight: 900,
                backgroundColor: "rgba(11,11,11,0.8)",
                padding: "16px 36px",
                borderRadius: 6,
                border: "2px solid rgba(255,255,255,0.08)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              STUDENT DEBT:{" "}
              <span style={{ color: brand.orange }}>
                ${debtAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div
            style={{
              flex: 0.8,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Character
              emotion="confused"
              gesture="thinking"
              style={{ transform: "scale(1.4)" }}
            />
          </div>
        </div>

        <div
          style={{
            ...baseText,
            color: brand.white,
            opacity: 0.8,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          Paying $100k to learn Java 8 from a professor who hasn't coded in 20
          years.
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 6: Modern Skills (5100 - 5850 frames)
const Scene6: React.FC = () => {
  const frame = useCurrentFrame();

  // Skills float pop-in spring triggers
  const s1 = spring({ frame: frame - 60, fps: 30, config: { damping: 12 } });
  const s2 = spring({ frame: frame - 120, fps: 30, config: { damping: 12 } });
  const s3 = spring({ frame: frame - 180, fps: 30, config: { damping: 12 } });
  const s4 = spring({ frame: frame - 240, fps: 30, config: { damping: 12 } });
  const s5 = spring({ frame: frame - 300, fps: 30, config: { damping: 12 } });

  // Skill icons list
  const skills = [
    { name: "React", p: s1, left: 160, top: 220, color: "#20E070" },
    { name: "TypeScript", p: s2, left: 320, top: 400, color: brand.yellow },
    { name: "Next.js", p: s3, left: 240, top: 580, color: brand.white },
    { name: "Docker", p: s4, left: 1260, top: 220, color: brand.orange },
    { name: "AWS Cloud", p: s5, left: 1340, top: 440, color: brand.yellow },
  ];

  // Learning Progress Bar
  const progressPercent = Math.min(
    100,
    Math.floor(
      interpolate(frame, [80, 520], [0, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );

  return (
    <AbsoluteFill>
      {/* Floating neon skills badges */}
      {skills.map((skill, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: skill.left,
            top: skill.top,
            backgroundColor: "rgba(11,11,11,0.92)",
            border: `3px solid ${skill.color}`,
            boxShadow: `0 0 25px ${skill.color}44`,
            padding: "18px 28px",
            borderRadius: 6,
            transform: `scale(${skill.p}) translateY(${Math.sin(frame * 0.08 + index) * 10}px)`,
            opacity: skill.p,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              ...baseText,
              color: brand.white,
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            {skill.name}
          </span>
        </div>
      ))}

      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            MODERN SKILLS
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            2:50 - 3:15
          </div>
        </div>

        {/* Center character learning and looking confident */}
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <Character
            emotion="confident"
            gesture="pointing"
            style={{ transform: "scale(1.4)" }}
          />

          {/* Progress bar HUD */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: 700,
              backgroundColor: "rgba(11,11,11,0.8)",
              padding: 24,
              borderRadius: 6,
              border: "2px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span
                style={{
                  ...baseText,
                  color: brand.white,
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                PORTFOLIO SYLLABUS BUILD
              </span>
              <span
                style={{
                  ...baseText,
                  color: brand.yellow,
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {progressPercent}% COMPLETE
              </span>
            </div>
            {/* Progress bar container */}
            <div
              style={{
                width: "100%",
                height: 16,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  backgroundColor: brand.yellow,
                  boxShadow: "0 0 15px #FFB800",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            ...baseText,
            color: brand.white,
            opacity: 0.8,
            fontSize: 28,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          Startups care about Proof-of-Work: active coding builds real skills.
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 7: AI Revolution (5850 - 6750 frames)
const Scene7: React.FC = () => {
  const frame = useCurrentFrame();

  // Pulsing holographic brain scale
  const brainPulse = 1 + Math.sin(frame * 0.1) * 0.05;

  // Vertical Code streams waterfall
  const codeLines = [
    "import { model } from '@google/gemini';",
    "const app = new Application({",
    "  server: 'AWS-ECS',",
    "  port: 8080,",
    "});",
    "app.compile(); // completed in 0.8s",
    "const truth = claim => verify(claim)",
  ];

  return (
    <AbsoluteFill>
      {/* Code Stream Columns */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 100,
          width: 600,
          height: 700,
          pointerEvents: "none",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        {codeLines.map((line, i) => {
          const charOffset = Math.floor(
            interpolate(frame, [100 + i * 80, 260 + i * 80], [0, line.length], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          );
          return (
            <div
              key={i}
              style={{
                ...baseText,
                fontFamily: "monospace",
                color: i % 2 === 0 ? "#20E070" : "rgba(255,255,255,0.45)",
                fontSize: 22,
                lineHeight: 1.6,
                opacity: charOffset > 0 ? 0.8 : 0,
                whiteSpace: "nowrap",
              }}
            >
              {line.slice(0, charOffset)}
              {charOffset < line.length ? "_" : ""}
            </div>
          );
        })}
      </div>

      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            THE AI SHIFT
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            3:10 - 3:45
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 30,
          }}
        >
          {/* Left panel is code stream, Right panel is Brain & character */}
          <div style={{ flex: 1 }} />

          {/* Brain model */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* Holographic brain icon placeholder */}
            <div
              style={{
                width: 220,
                height: 220,
                border: `4px dashed ${brand.yellow}`,
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: `0 0 35px ${brand.yellow}33`,
                transform: `scale(${brainPulse})`,
              }}
            >
              <span
                style={{
                  ...baseText,
                  color: brand.yellow,
                  fontSize: 88,
                  fontWeight: 900,
                }}
              >
                AI
              </span>
            </div>
            <Character
              emotion="excited"
              gesture="typing"
              style={{ transform: "scale(1.4)" }}
            />
          </div>
        </div>

        <div
          style={{
            ...baseText,
            color: brand.white,
            opacity: 0.8,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          AI makes syntax cheap. Core value shifts to system design and logic.
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 8: System Design (6750 - 7650 frames)
const Scene8: React.FC = () => {
  const frame = useCurrentFrame();

  // Nodes connection line offsets
  const packet1X = interpolate(frame % 90, [0, 45, 90], [220, 520, 520], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const packet1Y = interpolate(frame % 90, [0, 45, 90], [270, 270, 270], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const packet2X = interpolate(frame % 90, [0, 45, 90], [520, 820, 820], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const packet2Y = interpolate(frame % 90, [0, 45, 90], [270, 200, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            SYSTEM DESIGN
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            3:45 - 4:15
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 30,
          }}
        >
          {/* Blueprint schematic board */}
          <div
            style={{
              flex: 1.3,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
            }}
          >
            <svg
              viewBox="0 0 1000 500"
              style={{ width: "100%", height: "100%", overflow: "visible" }}
            >
              {/* Path connections */}
              <line
                x1="220"
                y1="270"
                x2="520"
                y2="270"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />
              <line
                x1="520"
                y1="270"
                x2="820"
                y2="200"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />
              <line
                x1="520"
                y1="270"
                x2="820"
                y2="340"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />

              {/* Node 1: Client */}
              <rect
                x="60"
                y="220"
                width="160"
                height="100"
                rx="6"
                fill="rgba(11,11,11,0.92)"
                stroke={brand.yellow}
                strokeWidth="3"
              />
              <text
                x="140"
                y="278"
                fill="#FFF"
                fontSize="22"
                fontWeight="800"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                CLIENT App
              </text>

              {/* Node 2: Load Balancer */}
              <rect
                x="440"
                y="220"
                width="160"
                height="100"
                rx="6"
                fill="rgba(11,11,11,0.92)"
                stroke={brand.white}
                strokeWidth="3"
              />
              <text
                x="520"
                y="278"
                fill="#FFF"
                fontSize="22"
                fontWeight="800"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                LOAD BALANCER
              </text>

              {/* Node 3: Microservice A */}
              <rect
                x="740"
                y="150"
                width="180"
                height="90"
                rx="6"
                fill="rgba(11,11,11,0.92)"
                stroke={brand.orange}
                strokeWidth="3"
              />
              <text
                x="830"
                y="202"
                fill="#FFF"
                fontSize="20"
                fontWeight="800"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                AUTH SERVICE
              </text>

              {/* Node 4: Microservice B */}
              <rect
                x="740"
                y="290"
                width="180"
                height="90"
                rx="6"
                fill="rgba(11,11,11,0.92)"
                stroke={brand.orange}
                strokeWidth="3"
              />
              <text
                x="830"
                y="342"
                fill="#FFF"
                fontSize="20"
                fontWeight="800"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                PAY SERVICE
              </text>

              {/* Animated signals */}
              <circle
                cx={packet1X}
                cy={packet1Y}
                r="8"
                fill={brand.yellow}
                filter="drop-shadow(0 0 10px #FFB800)"
              />
              <circle
                cx={packet2X}
                cy={packet2Y}
                r="8"
                fill={brand.orange}
                filter="drop-shadow(0 0 10px #FF8A00)"
              />
            </svg>
          </div>

          <div
            style={{
              flex: 0.7,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Character
              emotion="determined"
              gesture="pointing"
              style={{ transform: "scale(1.4)" }}
            />
          </div>
        </div>

        <div
          style={{
            ...baseText,
            color: brand.white,
            opacity: 0.8,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          Interviews have shifted from simple syntax to complex architectures.
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 9: Verdict (7650 - 8400 frames)
const Scene9: React.FC = () => {
  const frame = useCurrentFrame();

  // Cinematic Verdict text popup spring
  const revealProgress = spring({
    frame: frame - 60,
    fps: 30,
    config: { damping: 12 },
  });
  const revealScale = interpolate(revealProgress, [0, 1], [0.5, 1.05]);

  return (
    <AbsoluteFill>
      <Shell style={{ zIndex: 3 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            THE VERDICT
          </div>
          <div
            style={{
              ...baseText,
              color: brand.white,
              opacity: 0.6,
              fontSize: 24,
            }}
          >
            4:10 - 4:40
          </div>
        </div>

        {/* Center Courtroom / Terminal verdict display */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 30,
          }}
        >
          <div
            style={{
              flex: 1.2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 24,
            }}
          >
            {frame >= 60 && (
              <div
                style={{
                  transform: `scale(${revealScale})`,
                  opacity: revealProgress,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <ScalePop>
                  <Badge color={brand.yellow} dark style={{ fontSize: 50 }}>
                    VERDICT
                  </Badge>
                </ScalePop>
                <GlitchReveal delay={30}>
                  <div
                    style={{
                      ...baseText,
                      color: brand.yellow,
                      fontSize: 90,
                      lineHeight: 1.0,
                      fontWeight: 950,
                      textTransform: "uppercase",
                      textAlign: "center",
                      textShadow: `0 0 35px ${brand.yellow}66`,
                    }}
                  >
                    PARTIALLY TRUE
                  </div>
                </GlitchReveal>
                <ScalePop delay={100}>
                  <div
                    style={{
                      ...baseText,
                      color: brand.white,
                      fontSize: 110,
                      fontWeight: 950,
                      textShadow: "0 0 44px rgba(255,184,0,0.6)",
                    }}
                  >
                    7 / 10
                  </div>
                </ScalePop>
              </div>
            )}
          </div>

          <div
            style={{
              flex: 0.8,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Character
              emotion={frame > 120 ? "excited" : "neutral"}
              gesture={frame > 120 ? "shrug" : "thinking"}
              style={{ transform: "scale(1.4)" }}
            />
          </div>
        </div>

        <div
          style={{
            ...baseText,
            color: brand.white,
            opacity: 0.8,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          CS degrees act as a direct pre-screen cheat code, but proof of work is
          undeniable.
        </div>
      </Shell>
    </AbsoluteFill>
  );
};

// Scene 10: Outro (8400 - 8800 frames)
const Scene10: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Cyber Grid background line effect */}
      <AbsoluteFill
        style={{
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(255,184,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,184,0,0.15) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          transform: `translateY(${(frame * 2) % 64}px)`,
          zIndex: 1,
        }}
      />

      <Shell
        style={{
          zIndex: 3,
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
        }}
      >
        {/* Animated Character turning to look confident */}
        <Character
          emotion="confident"
          gesture="none"
          style={{ transform: "scale(1.6)", marginBottom: 10 }}
        />

        {/* Brand Lockup */}
        <ScalePop delay={20}>
          <div
            style={{
              ...baseText,
              color: brand.white,
              fontSize: 94,
              fontWeight: 950,
              textTransform: "uppercase",
              textShadow: "0 0 35px rgba(255,255,255,0.15)",
            }}
          >
            <span style={{ color: brand.yellow }}>Code</span>Or
            <span style={{ color: brand.orange }}>Cap</span>
          </div>
        </ScalePop>

        {/* Tagline */}
        <FadeIn delay={60}>
          <div
            style={{
              ...baseText,
              color: brand.white,
              fontSize: 40,
              fontWeight: 850,
              opacity: 0.9,
              textAlign: "center",
            }}
          >
            Stop Guessing. Start Knowing.
          </div>
        </FadeIn>

        {/* Neon Handle */}
        <GlitchReveal delay={120}>
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            @codeorcap
          </div>
        </GlitchReveal>
      </Shell>
    </AbsoluteFill>
  );
};

export const CSDegree5MinVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0B0B" }}>
      {/* Voiceover audio track */}
      <Audio
        src={staticFile("content/codeorcap/audio/voiceover-5min.mp3")}
        volume={1}
        from={-40}
      />
      {/* Global Background backdrops (Fades and pans dynamically) */}
      <BackgroundSlideshow />
      <ImageOverlay opacity={0.82} />
      <AnimatedOverlays />
      {/* TIMELINE OF 10 CARTOON EXPLAINER SCENES */}
      {/* Scene 1 (Hook): 0 - 1300 frames */}
      <Sequence
        durationInFrames={1300}
        style={{
          translate: "-90px 25.1px",
        }}
      >
        <Scene1 />
      </Sequence>
      {/* Scene 2 (Panic / Billboards): 1300 - 2100 frames */}
      <Sequence from={1300} durationInFrames={800}>
        <Scene2 />
      </Sequence>
      {/* Scene 3 (Traditional Pathway): 2100 - 2850 frames */}
      <Sequence from={2100} durationInFrames={750}>
        <Scene3 />
      </Sequence>
      {/* Scene 4 (ATS Scan Filter): 2850 - 3600 frames */}
      <Sequence from={2850} durationInFrames={750}>
        <Scene4 />
      </Sequence>
      {/* Scene 5 (Cost & Debt Clock): 3600 - 5100 frames */}
      <Sequence from={3600} durationInFrames={1500}>
        <Scene5 />
      </Sequence>
      {/* Scene 6 (Skills Badge Fills): 5100 - 5850 frames */}
      <Sequence from={5100} durationInFrames={750}>
        <Scene6 />
      </Sequence>
      {/* Scene 7 (AI Brain Waterfall): 5850 - 6750 frames */}
      <Sequence from={5850} durationInFrames={900}>
        <Scene7 />
      </Sequence>
      {/* Scene 8 (Architecture Blueprint): 6750 - 7650 frames */}
      <Sequence from={6750} durationInFrames={900}>
        <Scene8 />
      </Sequence>
      {/* Scene 9 (Verdict Reveal): 7650 - 8400 frames */}
      <Sequence from={7650} durationInFrames={750}>
        <Scene9 />
      </Sequence>
      {/* Scene 10 (Outro Logo Grid): 8400 - 8800 frames */}
      <Sequence from={8400} durationInFrames={400}>
        <Scene10 />
      </Sequence>
    </AbsoluteFill>
  );
};
