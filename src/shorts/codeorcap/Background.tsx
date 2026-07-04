import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF{}[]<>/\\|#@$%&";
const COLS = 18;
const COL_WIDTH = Math.floor(1080 / COLS); // 60px per column

const getChar = (frame: number, col: number, row: number) =>
  MATRIX_CHARS[(frame * 7 + col * 31 + row * 13) % MATRIX_CHARS.length];

const MatrixRain: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: COLS }).map((_, col) => {
        const speed = 0.55 + (col * 0.083) % 0.7;
        const offset = col * 113;
        const headY = ((frame * speed + offset) % 2400) - 300;
        const trailLen = 14 + (col % 6) * 3;

        return Array.from({ length: trailLen }).map((_, row) => {
          const y = headY - row * 88;
          if (y < -100 || y > 1980) return null;

          const isHead = row === 0;
          const opacity = isHead
            ? 0.95
            : Math.max(0, (1 - row / trailLen) * 0.72);
          const char = getChar(frame, col, row);

          return (
            <div
              key={`${col}-${row}`}
              style={{
                position: "absolute",
                left: col * COL_WIDTH + 6,
                top: y,
                color: isHead ? "#FFFFFF" : col % 3 === 0 ? "#FFB800" : col % 3 === 1 ? "#FF8A00" : "#FFD966",
                fontFamily: "monospace",
                fontSize: 30,
                fontWeight: isHead ? 900 : 400,
                opacity,
                textShadow: isHead
                  ? "0 0 16px #FFB800, 0 0 32px rgba(255,184,0,0.6)"
                  : "0 0 8px rgba(255,184,0,0.4)",
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

const DataPulse: React.FC = () => {
  const frame = useCurrentFrame();
  const stats = [
    { label: "npm downloads", value: "25M/wk", x: 60, y: 420 },
    { label: "MERN jobs 2024", value: "40K+", x: 680, y: 820 },
    { label: "React market share", value: "68%", x: 80, y: 1320 },
    { label: "Node.js rank", value: "#1 backend", x: 540, y: 1680 },
  ];

  return (
    <>
      {stats.map((s, i) => {
        const pulse = Math.sin((frame * 0.06) + i * 1.4);
        const opacity = interpolate(
          (frame + i * 48) % 180,
          [0, 20, 140, 180],
          [0, 0.55, 0.55, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x,
              top: s.y + pulse * 8,
              opacity,
              background: "rgba(0,0,0,0.72)",
              border: `1.5px solid ${i % 2 === 0 ? "rgba(255,184,0,0.7)" : "rgba(255,120,0,0.7)"}`,
              borderRadius: 8,
              padding: "8px 16px",
              backdropFilter: "blur(4px)",
            }}
          >
            <div style={{ color: "#FFB800", fontFamily: "monospace", fontSize: 26, fontWeight: 900 }}>
              {s.value}
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace", fontSize: 18 }}>
              {s.label}
            </div>
          </div>
        );
      })}
    </>
  );
};

const ScanlineFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const scanY = (frame * 3.2) % 2100;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: scanY,
        height: 3,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,184,0,0.55) 30%, rgba(255,255,255,0.7) 50%, rgba(255,184,0,0.55) 70%, transparent 100%)",
        boxShadow: "0 0 24px rgba(255,184,0,0.5)",
        pointerEvents: "none",
      }}
    />
  );
};

const HorizontalLines: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {[380, 960, 1560].map((baseY, i) => {
        const drift = Math.sin(frame * 0.018 + i * 2.1) * 18;
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
                  ? "linear-gradient(90deg, transparent 0%, rgba(255,120,0,0.8) 25%, rgba(255,184,0,1) 50%, rgba(255,120,0,0.8) 75%, transparent 100%)"
                  : "linear-gradient(90deg, transparent 0%, rgba(255,184,0,0.5) 40%, rgba(255,184,0,0.75) 50%, rgba(255,184,0,0.5) 60%, transparent 100%)",
              boxShadow: "0 0 14px rgba(255,184,0,0.55)",
            }}
          />
        );
      })}
    </>
  );
};

const GlowParticles: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: 20 }).map((_, i) => {
        const left = (i * 163 + 30) % 1080;
        const top = (i * 317 + frame * (0.3 + (i % 4) * 0.18)) % 1980;
        const size = 5 + (i % 5) * 3;
        const pulse = 0.5 + Math.sin(frame * 0.07 + i * 0.9) * 0.3;
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
              boxShadow: `0 0 ${size * 4}px ${i % 2 === 0 ? "rgba(255,184,0,0.95)" : "rgba(255,120,0,0.95)"}`,
              opacity: pulse * 0.7,
            }}
          />
        );
      })}
    </>
  );
};

export const TechBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const bgPulse = interpolate(
    Math.sin(frame * 0.025),
    [-1, 1],
    [0.32, 0.48],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: "#0A0A0A", overflow: "hidden" }}>
      {/* Deep gradient base */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 80% 42% at 50% 0%, rgba(255,184,0,${bgPulse}) 0%, transparent 68%),
            radial-gradient(ellipse 60% 35% at 0% 60%, rgba(255,100,0,0.32) 0%, transparent 60%),
            radial-gradient(ellipse 50% 30% at 100% 85%, rgba(255,184,0,0.24) 0%, transparent 55%),
            linear-gradient(180deg, #0D0D10 0%, #080808 50%, #050505 100%)
          `,
        }}
      />

      {/* Matrix code rain */}
      <MatrixRain />

      {/* Horizontal neon lines */}
      <HorizontalLines />

      {/* Scanline sweep */}
      <ScanlineFlash />

      {/* Floating data stats */}
      <DataPulse />

      {/* Glow particles */}
      <GlowParticles />

      {/* Vignette to keep edges dark and focus on center */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 45%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
