import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF{}[]<>/\\|#@$%&";
const COLS = 32; // More columns for landscape
const COL_WIDTH = Math.floor(1920 / COLS);

const getChar = (frame: number, col: number, row: number) =>
  MATRIX_CHARS[(frame * 7 + col * 31 + row * 13) % MATRIX_CHARS.length];

const MatrixRainLandscape: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: COLS }).map((_, col) => {
        const speed = 0.45 + (col * 0.063) % 0.6;
        const offset = col * 97;
        const headY = ((frame * speed + offset) % 1400) - 200;
        const trailLen = 10 + (col % 5) * 2;

        return Array.from({ length: trailLen }).map((_, row) => {
          const y = headY - row * 72;
          if (y < -80 || y > 1120) return null;

          const isHead = row === 0;
          const opacity = isHead
            ? 0.85
            : Math.max(0, (1 - row / trailLen) * 0.6);
          const char = getChar(frame, col, row);

          return (
            <div
              key={`${col}-${row}`}
              style={{
                position: "absolute",
                left: col * COL_WIDTH + 4,
                top: y,
                color: isHead ? "#FFFFFF" : col % 3 === 0 ? "#FFB800" : col % 3 === 1 ? "#FF8A00" : "#FFD966",
                fontFamily: "monospace",
                fontSize: 22,
                fontWeight: isHead ? 900 : 400,
                opacity: opacity * 0.15, // Keep very subtle
                textShadow: isHead
                  ? "0 0 12px #FFB800, 0 0 24px rgba(255,184,0,0.5)"
                  : "0 0 6px rgba(255,184,0,0.3)",
                lineHeight: 1,
              }}
            >
              {char}
            </div>
          );
        });
      })}
    </>
  );
};

const HorizontalLinesLandscape: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {[260, 540, 820].map((baseY, i) => {
        const drift = Math.sin(frame * 0.016 + i * 2.1) * 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: baseY + drift,
              left: 0,
              right: 0,
              height: 1.5,
              background:
                i === 1
                  ? "linear-gradient(90deg, transparent 0%, rgba(255,120,0,0.7) 25%, rgba(255,184,0,0.9) 50%, rgba(255,120,0,0.7) 75%, transparent 100%)"
                  : "linear-gradient(90deg, transparent 0%, rgba(255,184,0,0.4) 40%, rgba(255,184,0,0.65) 50%, rgba(255,184,0,0.4) 60%, transparent 100%)",
              boxShadow: "0 0 12px rgba(255,184,0,0.45)",
            }}
          />
        );
      })}
    </>
  );
};

const ScanlineFlashLandscape: React.FC = () => {
  const frame = useCurrentFrame();
  const scanY = (frame * 2.5) % 1200;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: scanY,
        height: 2,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,184,0,0.45) 30%, rgba(255,255,255,0.6) 50%, rgba(255,184,0,0.45) 70%, transparent 100%)",
        boxShadow: "0 0 18px rgba(255,184,0,0.4)",
        pointerEvents: "none",
      }}
    />
  );
};

const GlowParticlesLandscape: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: 28 }).map((_, i) => {
        const left = (i * 197 + 20) % 1920;
        const top = (i * 241 + frame * (0.25 + (i % 4) * 0.14)) % 1100;
        const size = 4 + (i % 5) * 2;
        const pulse = 0.5 + Math.sin(frame * 0.06 + i * 0.8) * 0.3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: i % 3 === 0 ? "#FFB800" : i % 3 === 1 ? "#FF8A00" : "#FFFFFF",
              boxShadow: `0 0 ${size * 3}px ${i % 2 === 0 ? "rgba(255,184,0,0.85)" : "rgba(255,120,0,0.85)"}`,
              opacity: pulse * 0.5,
            }}
          />
        );
      })}
    </>
  );
};

export const LandscapeBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const bgPulse = interpolate(
    Math.sin(frame * 0.02),
    [-1, 1],
    [0.25, 0.4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#0A0A0A", overflow: "hidden" }}>
      {/* Deep gradient base */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,184,0,${bgPulse}) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 0% 60%, rgba(255,100,0,0.25) 0%, transparent 55%),
            radial-gradient(ellipse 45% 35% at 100% 80%, rgba(255,184,0,0.18) 0%, transparent 50%),
            linear-gradient(180deg, #0D0D10 0%, #080808 50%, #050505 100%)
          `,
        }}
      />

      {/* Matrix code rain - very subtle */}
      <MatrixRainLandscape />

      {/* Horizontal neon lines */}
      <HorizontalLinesLandscape />

      {/* Scanline sweep */}
      <ScanlineFlashLandscape />

      {/* Glow particles */}
      <GlowParticlesLandscape />

      {/* Grid overlay */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          opacity: 0.5,
        }}
      />

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
