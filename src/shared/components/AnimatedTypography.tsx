// file:///Users/apple/desktop/pradeep/my-video/src/components/AnimatedTypography.tsx
import { AbsoluteFill } from "remotion";
import { useStaggeredWords } from "../hooks/useStaggeredWords";
import { COLORS, FONT_FAMILY } from "../utils/constants";

type Props = {
  /** full sentence */
  text: string;
  /** frame offset where this sentence starts */
  start: number;
  /** optional overall scale for the block */
  blockScale?: number;
};

/**
 * Kinetic typography that animates each word with a type‑writer / bounce / glow effect.
 */
export const AnimatedTypography: React.FC<Props> = ({ text, start, blockScale = 1 }) => {
  const words = useStaggeredWords(text, start, 4);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT_FAMILY,
        color: COLORS.text,
        fontSize: "2.8rem",
        transform: `scale(${blockScale})`,
        perspective: 800,
      }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            opacity: w.opacity,
            transform: `scale(${w.scale})`,
            textShadow: `0 0 ${8 * w.glow}px ${COLORS.glow}`,
            margin: "0 0.12rem",
            display: "inline-block",
          }}
        >
          {w.text}
        </span>
      ))}
    </AbsoluteFill>
  );
};
