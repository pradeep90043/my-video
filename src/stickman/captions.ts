/**
 * Split narration into short on-screen chunks and time them across the scene
 * in proportion to character count (no word-level TTS timings needed).
 */
export interface CaptionWord {
  text: string;
  start: number;
  end: number;
}

export interface CaptionChunk {
  text: string;
  start: number;
  end: number;
  /** per-word timing inside the chunk, proportional to word length (for karaoke highlight) */
  words: CaptionWord[];
}

export function buildCaptions(text: string, durationFrames: number, maxWords = 7): CaptionChunk[] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?…—]+[.!?…—]*/g) ?? [text];
  const pieces: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.trim().split(" ").filter(Boolean);
    if (!words.length) continue;
    const parts = Math.ceil(words.length / maxWords);
    const size = Math.ceil(words.length / parts); // balanced chunks, no 1-word orphans
    for (let i = 0; i < words.length; i += size) pieces.push(words.slice(i, i + size).join(" "));
  }
  const total = pieces.reduce((n, p) => n + p.length, 0) || 1;
  const usable = Math.max(1, durationFrames - 4);
  let cursor = 0;
  return pieces.map((p) => {
    const start = Math.round(cursor);
    cursor += (p.length / total) * usable;
    const end = Math.round(cursor);
    const words = p.split(" ");
    const letters = words.reduce((n, w) => n + w.length, 0) || 1;
    let wc = start;
    return {
      text: p, start, end,
      words: words.map((w) => {
        const ws = Math.round(wc);
        wc += ((end - start) * w.length) / letters;
        return { text: w, start: ws, end: Math.round(wc) };
      }),
    };
  });
}
