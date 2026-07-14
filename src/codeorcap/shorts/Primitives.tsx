import type { CSSProperties, ReactNode } from "react";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "800", "900"],
});

export const brand = {
  black: "#0B0B0B",
  yellow: "#FFB800",
  orange: "#FF8A00",
  white: "#FFFFFF",
};

export const baseText: CSSProperties = {
  fontFamily,
  letterSpacing: 0,
};

export const Badge: React.FC<{
  children: ReactNode;
  color?: string;
  dark?: boolean;
  style?: CSSProperties;
}> = ({ children, color = brand.yellow, dark = false, style }) => (
  <div
    style={{
      ...baseText,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: dark ? brand.black : color,
      backgroundColor: dark ? color : "rgba(11,11,11,0.78)",
      border: `4px solid ${color}`,
      boxShadow: `0 0 34px ${color}66`,
      padding: "18px 28px",
      fontSize: 44,
      fontWeight: 900,
      textTransform: "uppercase",
      lineHeight: 1,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Shell: React.FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      padding: "120px 72px 92px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      ...style,
    }}
  >
    {children}
  </div>
);

export const BrandLockup: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  null
);

export const SmallCapsText: React.FC<{
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}> = ({ children, color = brand.white, style }) => (
  <div
    style={{
      ...baseText,
      color,
      fontSize: 32,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 0,
      lineHeight: 1.2,
      ...style,
    }}
  >
    {children}
  </div>
);
