import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import type { WordAt } from "./timeline";

export interface Page {
  startFrame: number;
  endFrame: number;
  tokens: { text: string; from: number; to: number }[];
}

/** Word-synced pages: `words` is one array per scene so pages never straddle a scene boundary. */
export function buildPages(words: WordAt[][], fps: number, maxWords: number): Page[] {
  const toMs = (f: number) => (f / fps) * 1000;
  const pages: Page[] = [];
  for (const sceneWords of words) {
    if (!sceneWords.length) continue;
    const captions: Caption[] = sceneWords.map((w, i) => ({
      text: i === 0 ? w.text : ` ${w.text}`,
      startMs: toMs(w.startFrame),
      endMs: toMs(w.endFrame),
      timestampMs: toMs((w.startFrame + w.endFrame) / 2),
      confidence: 1,
    }));
    const { pages: tk } = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 900 });
    for (const p of tk) {
      // split long pages so only ~3-4 words are on screen at once; break after sentence-ending punctuation
      let chunk: typeof p.tokens = [];
      const flush = () => {
        if (!chunk.length) return;
        pages.push({
          startFrame: Math.round((chunk[0].fromMs / 1000) * fps),
          endFrame: Math.round((chunk[chunk.length - 1].toMs / 1000) * fps),
          tokens: chunk.map((t) => ({ text: t.text.trim(), from: Math.round((t.fromMs / 1000) * fps), to: Math.round((t.toMs / 1000) * fps) })),
        });
        chunk = [];
      };
      for (const t of p.tokens) {
        chunk.push(t);
        if (chunk.length >= maxWords || /[.!?…,:;]$/.test(t.text.trim())) flush();
      }
      flush();
    }
  }
  // each page stays up until the next one starts (no flicker between chunks), but never lingers past ~0.5s of silence
  pages.forEach((p, i) => {
    const next = pages[i + 1];
    const hold = p.endFrame + Math.round(fps * 0.5);
    p.endFrame = next ? Math.min(Math.max(p.endFrame, next.startFrame), hold) : hold;
  });
  return pages;
}
