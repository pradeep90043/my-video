import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, baseText, BrandLockup } from "../Primitives";
import { FadeIn, GlitchReveal } from "../animations";

/* ── helpers ─────────────────────────────────────────────────────────── */

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/** Parse a numeric value from salary strings for count-up display.
 *  Returns the *upper* bound in LPA (or Cr converted to LPA). */
const parseSalaryUpper = (v: string): number => {
  if (v.includes("Cr")) {
    const parts = v.replace(/[₹ Cr]/g, "").split("–");
    return parseFloat(parts[parts.length - 1]) * 100; // 2.5 Cr → 250 LPA
  }
  const parts = v.replace(/[₹ LPA]/g, "").split("–");
  return parseFloat(parts[parts.length - 1]);
};

/** Format a number back to a display string matching the original format. */
const formatValue = (current: number, template: string): string => {
  if (template.includes("Cr")) {
    // interpolate within Cr range
    const parts = template.replace(/[₹ Cr]/g, "").split("–");
    const lo = parseFloat(parts[0]) * 100;
    const hi = parseFloat(parts[1]) * 100;
    const ratio = Math.min(current / (hi || 1), 1);
    const loDisplay = (lo * ratio) / 100;
    const hiDisplay = (hi * ratio) / 100;
    return `₹${loDisplay.toFixed(1)}–${hiDisplay.toFixed(1)} Cr`;
  }
  // LPA range
  const parts = template.replace(/[₹ LPA]/g, "").split("–");
  const lo = parseFloat(parts[0]);
  const hi = parseFloat(parts[1]);
  const ratio = Math.min(current / (hi || 1), 1);
  const loDisplay = Math.round(lo * ratio * 10) / 10;
  const hiDisplay = Math.round(hi * ratio * 10) / 10;
  // Keep integer display if originals were integer
  const loStr = lo % 1 === 0 ? Math.round(loDisplay).toString() : loDisplay.toFixed(1);
  const hiStr = hi % 1 === 0 ? Math.round(hiDisplay).toString() : hiDisplay.toFixed(1);
  return `₹${loStr}–${hiStr} LPA`;
};

/* ── AnimatedBar ─────────────────────────────────────────────────────── */

const AnimatedBar: React.FC<{
  label: string;
  value: string;
  width: number; // percentage 0–100
  delay: number; // frame delay before this bar starts
  color?: string;
  note?: string;
}> = ({ label, value, width, delay, color = brand.yellow, note }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const SCENE_DURATION = 1162;
  const localFrame = frame - delay;

  // Bar width grows very slowly over the entire remaining scene duration
  const barProgress = interpolate(localFrame, [0, SCENE_DURATION - delay], [0, 1], clamp);

  const currentWidth = barProgress * width;

  // Count-up: track the upper salary value
  const upperTarget = parseSalaryUpper(value);
  const currentUpper = upperTarget * barProgress;
  const displayValue = barProgress <= 0 ? "" : formatValue(currentUpper, value);

  // Fade in the whole row
  const rowOpacity = interpolate(localFrame, [0, 8], [0, 1], clamp);

  // Slide in label from left
  const labelX = interpolate(localFrame, [0, 18], [-60, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Note badge pop
  const noteScale = spring({
    frame: localFrame - 25,
    fps,
    config: { damping: 100, stiffness: 220, mass: 0.5 },
  });

  if (localFrame < 0) return null;

  return (
    <div
      style={{
        opacity: rowOpacity,
        display: "flex",
        alignItems: "center",
        gap: 24,
        height: 60,
      }}
    >
      {/* Label */}
      <div
        style={{
          ...baseText,
          color: brand.white,
          fontSize: 26,
          fontWeight: 600,
          width: 340,
          minWidth: 340,
          textAlign: "right",
          transform: `translateX(${labelX}px)`,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>

      {/* Bar */}
      <div
        style={{
          flex: 1,
          position: "relative",
          height: 42,
          borderRadius: 6,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${currentWidth}%`,
            height: "100%",
            borderRadius: 6,
            background: `linear-gradient(90deg, ${color}CC, ${color})`,
            boxShadow: `0 0 24px ${color}55`,
          }}
        />
      </div>

      {/* Value */}
      <div
        style={{
          ...baseText,
          color: brand.white,
          fontSize: 26,
          fontWeight: 800,
          width: 220,
          minWidth: 220,
          textAlign: "left",
        }}
      >
        {displayValue}
      </div>

      {/* Optional note badge */}
      {note && (
        <div
          style={{
            ...baseText,
            position: "absolute",
            right: 240,
            top: -8,
            fontSize: 18,
            fontWeight: 800,
            color: "#FF3B3B",
            background: "rgba(255,59,59,0.15)",
            border: "2px solid #FF3B3B",
            borderRadius: 6,
            padding: "4px 12px",
            transform: `scale(${noteScale})`,
            whiteSpace: "nowrap",
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
};

/* ── salary data ─────────────────────────────────────────────────────── */

interface BarData {
  label: string;
  value: string;
  /** normalised width 0-100 (FAANG senior = 100) */
  width: number;
  note?: string;
  cluster: "service" | "product";
  color?: string;
}

// Max upper value = 2.5 Cr = 250 LPA → 100%
const maxLPA = 250;
const toWidth = (upperLPA: number) => (upperLPA / maxLPA) * 100;

const bars: BarData[] = [
  // ── Cluster 1: Service / Entry ──
  {
    label: "Fresher · Service (TCS/Infosys)",
    value: "₹3.5–7 LPA",
    width: toWidth(7),
    cluster: "service",
  },
  {
    label: "Fresher · Product/GCC",
    value: "₹8–22 LPA",
    width: toWidth(22),
    cluster: "service",
  },
  {
    label: "Median (all levels)",
    value: "₹8–12 LPA",
    width: toWidth(12),
    cluster: "service",
    color: "#888888",
  },
  // ── Cluster 2: Product / Premium ──
  {
    label: "Fresher · Top FAANG campus",
    value: "₹25–45 LPA",
    width: toWidth(45),
    note: "<1% of hires",
    cluster: "product",
  },
  {
    label: "5 yrs · Product",
    value: "₹22–38 LPA",
    width: toWidth(38),
    cluster: "product",
  },
  {
    label: "Senior · FAANG total comp",
    value: "₹1–2.5 Cr",
    width: toWidth(250),
    cluster: "product",
    color: brand.orange,
  },
];

/* ── SWEDataScene ────────────────────────────────────────────────────── */


const LoopedContent: React.FC = () => {
  // Cluster labels
  const cluster1Delay = 20;
  const cluster2Delay = 180;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* ── Header row ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <GlitchReveal delay={0}>
          <div
            style={{
              ...baseText,
              color: brand.yellow,
              fontSize: 68,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 2,
              lineHeight: 1,
            }}
          >
            Software Engineer
          </div>
        </GlitchReveal>

        <FadeIn delay={10}>
          <BrandLockup compact />
        </FadeIn>
      </div>

      {/* Subtitle */}
      <FadeIn delay={15}>
        <div
          style={{
            ...baseText,
            color: "rgba(255,255,255,0.45)",
            fontSize: 26,
            fontWeight: 600,
            marginBottom: 40,
            textTransform: "uppercase",
            letterSpacing: 4,
          }}
        >
          India Salary Landscape 2025
        </div>
      </FadeIn>

      {/* ── Bar chart area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px" }}>
        {/* Cluster 1 label */}
        <FadeIn delay={cluster1Delay} style={{ marginBottom: 24 }}>
          <div
            style={{
              ...baseText,
              color: "rgba(255,255,255,0.3)",
              fontSize: 24,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 6,
              paddingLeft: 380,
            }}
          >
            Service & Entry-Level
          </div>
        </FadeIn>

        {/* Cluster 1 bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            position: "relative",
          }}
        >
          {bars
            .filter((b) => b.cluster === "service")
            .map((bar, i) => (
              <AnimatedBar
                key={bar.label}
                label={bar.label}
                value={bar.value}
                width={bar.width}
                delay={cluster1Delay + 30 + i * 40}
                color={bar.color || brand.yellow}
                note={bar.note}
              />
            ))}
        </div>

        {/* Gap / divider between clusters */}
        <FadeIn delay={cluster2Delay - 20}>
          <div
            style={{
              margin: "48px 0",
              marginLeft: 380,
              height: 2,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)",
            }}
          />
        </FadeIn>

        {/* Cluster 2 label */}
        <FadeIn delay={cluster2Delay} style={{ marginBottom: 24 }}>
          <div
            style={{
              ...baseText,
              color: "rgba(255,255,255,0.3)",
              fontSize: 24,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 6,
              paddingLeft: 380,
            }}
          >
            Product & Premium
          </div>
        </FadeIn>

        {/* Cluster 2 bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            position: "relative",
          }}
        >
          {bars
            .filter((b) => b.cluster === "product")
            .map((bar, i) => (
              <AnimatedBar
                key={bar.label}
                label={bar.label}
                value={bar.value}
                width={bar.width}
                delay={cluster2Delay + 30 + i * 40}
                color={bar.color || brand.yellow}
                note={bar.note}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export const SWEDataScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pin-highlight box appears near end of the 1560-frame scene
  const takeawayDelay = 1300;
  const takeawayProgress = spring({
    frame: frame - takeawayDelay,
    fps,
    config: { damping: 100, stiffness: 200, mass: 0.6 },
  });
  const takeawayOpacity = interpolate(
    frame - takeawayDelay,
    [0, 12],
    [0, 1],
    clamp
  );

  // Glow pulse on the takeaway box
  const glowPulse =
    frame > takeawayDelay
      ? 0.4 + 0.6 * Math.sin((frame - takeawayDelay) * 0.08)
      : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "80px 100px 60px",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
      }}
    >
      {/* ── Content (bars and headers) ── */}
      <LoopedContent />

      {/* ── Takeaway pin-highlight box ── */}
      <div
        style={{
          opacity: takeawayOpacity,
          transform: `scale(${takeawayProgress}) translateY(${interpolate(
            takeawayProgress,
            [0, 1],
            [30, 0],
            clamp
          )}px)`,
          alignSelf: "center",
          marginTop: 32,
        }}
      >
        <div
          style={{
            ...baseText,
            border: `3px solid ${brand.orange}`,
            borderRadius: 14,
            padding: "22px 48px",
            fontSize: 34,
            fontWeight: 800,
            color: brand.white,
            textAlign: "center",
            background: "rgba(255,138,0,0.08)",
            boxShadow: `0 0 ${40 + glowPulse * 30}px ${brand.orange}${Math.round(
              40 + glowPulse * 30
            )
              .toString(16)
              .padStart(2, "0")}`,
            lineHeight: 1.4,
          }}
        >
          Biggest lever ={" "}
          <span style={{ color: brand.orange }}>COMPANY TYPE</span>, not the
          role
        </div>
      </div>
    </div>
  );
};
