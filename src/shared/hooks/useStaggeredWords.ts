// src/hooks/useStaggeredWords.ts
import { useCurrentFrame } from "remotion";


type WordAnim = {
  text: string;
  opacity: number;
  scale: number;
  glow: number;
};

/**
 * Splits a sentence into words and returns animation parameters for each word.
 * Each word fades in and scales up with a subtle glow.
 * @param sentence Full sentence text.
 * @param startFrame Frame where the animation of this sentence starts.
 * @param staggerFrames Number of frames between each word's appearance.
 */
export const useStaggeredWords = (
  sentence: string,
  startFrame: number,
  staggerFrames: number = 4
): WordAnim[] => {
  const frame = useCurrentFrame();
  const words = sentence.split(/\s+/);
  return words.map((w, i) => {
    const wordStart = startFrame + i * staggerFrames;
    const progress = Math.max(0, Math.min(1, (frame - wordStart) / staggerFrames));
    const opacity = progress;
    const scale = 0.8 + 0.2 * progress; // from 0.8 to 1.0
    const glow = progress * 2; // subtle glow intensity
    return { text: w, opacity, scale, glow };
  });
};
