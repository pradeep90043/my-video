/**
 * Split narration into short on-screen chunks and time them across the scene.
 * With real word timings (edge-tts WordBoundary, stored as scene.words) the chunks and the
 * karaoke highlight follow the voice exactly; otherwise timing is spread over the scene in
 * proportion to character count.
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
  /** per-word timing inside the chunk (for karaoke highlight) */
  words: CaptionWord[];
}

/** One spoken word from TTS, in seconds from the start of the scene's audio. */
export interface SpokenWord {
  text: string;
  start: number;
  end: number;
}

const SPOKEN = /[\p{L}\p{N}]/u;

/**
 * One sentence as balanced chunks of at most `maxWords` words AND (when given) `maxChars` characters, so a chunk of long
 * words still fits the frame width instead of running off the screen.
 */
function chunkWords(words: string[], maxWords: number, maxChars?: number): string[][] {
  if (!maxChars) {
    const parts = Math.ceil(words.length / maxWords);
    const size = Math.ceil(words.length / parts); // balanced chunks, no 1-word orphans
    const out: string[][] = [];
    for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size));
    return out;
  }
  const len = (w: string[]) => w.join(" ").length;
  // fewest chunks that respect both limits (greedy)...
  const greedy: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    if (cur.length && (cur.length >= maxWords || len([...cur, w]) > maxChars)) { greedy.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) greedy.push(cur);
  if (greedy.length <= 1) return greedy;
  // ...then spread the words evenly over that many chunks (no lone orphan at the end), if every chunk still fits
  const size = Math.ceil(words.length / greedy.length);
  const balanced: string[][] = [];
  for (let i = 0; i < words.length; i += size) balanced.push(words.slice(i, i + size));
  const fits = balanced.length === greedy.length && balanced.every((c) => c.length <= maxWords && (len(c) <= maxChars || c.length === 1));
  return fits ? balanced : greedy;
}

function splitPieces(text: string, maxWords: number, maxChars?: number): string[][] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?…—]+[.!?…—]*/g) ?? [text];
  const pieces: string[][] = [];
  for (const sentence of sentences) {
    const words = sentence.trim().split(" ").filter(Boolean);
    if (!words.length) continue;
    pieces.push(...chunkWords(words, maxWords, maxChars));
  }
  return pieces;
}

/** Frame timing per display token from TTS words, or undefined when the word counts don't line up. */
function alignSpoken(tokens: string[], spoken: SpokenWord[], fps: number): CaptionWord[] | undefined {
  const spokenIdx = tokens.map((t, i) => (SPOKEN.test(t) ? i : -1)).filter((i) => i >= 0);
  if (spokenIdx.length !== spoken.length || spoken.length === 0) return undefined;
  const out: CaptionWord[] = [];
  let lastEnd = 0;
  let k = 0;
  tokens.forEach((t, i) => {
    if (spokenIdx[k] === i) {
      const w = spoken[k++];
      out.push({ text: t, start: Math.round(w.start * fps), end: Math.max(Math.round(w.end * fps), Math.round(w.start * fps) + 1) });
      lastEnd = out[out.length - 1].end;
    } else {
      out.push({ text: t, start: lastEnd, end: lastEnd }); // dashes etc. ride along with the previous word
    }
  });
  return out;
}

/** `maxChars`: longest chunk in characters (vertical frames are narrow; long words would otherwise run off the screen). */
export function buildCaptions(text: string, durationFrames: number, maxWords = 7, spoken?: SpokenWord[], fps = 30, maxChars?: number): CaptionChunk[] {
  const pieces = splitPieces(text, maxWords, maxChars);
  const aligned = spoken ? alignSpoken(pieces.flat(), spoken, fps) : undefined;

  if (aligned) {
    let at = 0;
    const chunks = pieces.map((p) => {
      const words = aligned.slice(at, at + p.length);
      at += p.length;
      return { text: p.join(" "), start: words[0].start, end: words[words.length - 1].end, words };
    });
    // a chunk stays up until the next one begins (no flicker in short pauses), the last one a beat longer
    return chunks.map((c, i) => ({
      ...c,
      start: i === 0 ? 0 : c.start,
      end: Math.max(c.end + 1, i < chunks.length - 1 ? chunks[i + 1].start : Math.min(durationFrames, c.end + 8)),
    }));
  }

  const strs = pieces.map((p) => p.join(" "));
  const total = strs.reduce((n, p) => n + p.length, 0) || 1;
  const usable = Math.max(1, durationFrames - 4);
  let cursor = 0;
  return strs.map((p) => {
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
