/**
 * Split narration into short on-screen chunks and time them across the scene
 * in proportion to character count (no word-level TTS timings needed).
 */
export interface CaptionChunk {
  text: string;
  start: number;
  end: number;
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
    return { text: p, start, end: Math.round(cursor) };
  });
}
