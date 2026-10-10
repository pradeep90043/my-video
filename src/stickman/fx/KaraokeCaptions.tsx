import React, { useMemo } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { buildPages } from "./pages";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import type { WordAt } from "./timeline";
import type { Theme } from "../theme";

const font = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

export const KaraokeCaptions: React.FC<{ words: WordAt[][]; theme: Theme; vertical: boolean; highlight: string }> = ({ words, theme, vertical, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(() => buildPages(words, fps, vertical ? 3 : 4), [words, fps, vertical]);
  const page = pages.find((p) => frame >= p.startFrame && frame < p.endFrame);
  if (!page) return null;

  const pop = spring({ frame: frame - page.startFrame, fps, config: { damping: 12, stiffness: 220, mass: 0.5 } });
  const fontSize = vertical ? 92 : 76;
  const dark = theme.bg !== "#FFFFFF";
  const base = dark ? "#FFFFFF" : "#141414";
  const stroke = dark ? "#000000" : "#FFFFFF";

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 330 : 52, pointerEvents: "none" }}>
      <div
        style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${fontSize * 0.46}px`, maxWidth: vertical ? 960 : 1560,
          transform: `scale(${0.85 + 0.15 * pop})`, opacity: Math.min(1, pop * 2),
        }}
      >
        {page.tokens.map((t, i) => {
          const active = frame >= t.from && (i === page.tokens.length - 1 || frame < page.tokens[i + 1].from);
          const said = frame >= t.from;
          const wordPop = active ? spring({ frame: frame - t.from, fps, config: { damping: 9, stiffness: 260, mass: 0.4 } }) : 1;
          return (
            <span
              key={i}
              style={{
                fontFamily: `${font.fontFamily}, sans-serif`, fontWeight: 900, fontSize, lineHeight: 1.15, textTransform: "uppercase", letterSpacing: -1,
                color: active ? highlight : said ? base : base,
                opacity: said ? 1 : 0.55,
                transform: `scale(${active ? 1 + 0.09 * wordPop : 1}) translateY(${active ? -6 * wordPop : 0}px)`,
                WebkitTextStroke: `${fontSize * 0.1}px ${stroke}`,
                paintOrder: "stroke fill",
                textShadow: active ? `0 0 ${fontSize * 0.5}px ${highlight}88` : undefined,
                display: "inline-block",
              }}
            >
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
