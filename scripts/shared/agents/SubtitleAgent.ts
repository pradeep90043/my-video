import * as fs from "fs";
import * as path from "path";
import { Scene, WordTiming } from "../types";
import { PATHS } from "../config";

interface SRTEntry { index: number; startMs: number; endMs: number; text: string; }

export class SubtitleAgent {
  generate(scenes: Scene[], videoId: string, outputDir?: string): { srtPath: string } {
    const outputPath = outputDir
      ? path.join(outputDir, "subtitles.srt")
      : path.join(PATHS.subtitles, videoId, "subtitles.srt");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    let currentMs = 0;
    const entries: SRTEntry[] = scenes
      .map((scene, i) => {
        const durationMs = scene.duration * 1000;
        const entry: SRTEntry = {
          index: i + 1,
          startMs: currentMs,
          endMs: currentMs + durationMs,
          text: scene.subtitle || scene.text,
        };
        currentMs += durationMs;
        return entry;
      })
      .filter((e) => e.text.trim());

    const srt = entries
      .map((e) => [e.index, `${this.msToSRT(e.startMs)} --> ${this.msToSRT(e.endMs)}`, e.text, ""].join("\n"))
      .join("\n");

    fs.writeFileSync(outputPath, srt, "utf-8");
    return { srtPath: outputPath };
  }

  private msToSRT(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const mill = ms % 1000;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(mill).padStart(3,"0")}`;
  }

  generateWordLevel(narration: string, durationSecs: number, videoId: string, outputDir?: string): { jsonPath: string; timings: WordTiming[] } {
    const outputPath = outputDir
      ? path.join(outputDir, "word-level.json")
      : path.join(PATHS.subtitles, videoId, "word-level.json");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const words = narration.split(/\s+/).filter(Boolean);
    const totalMs = durationSecs * 1000;
    const msPerWord = totalMs / words.length;
    const timings: WordTiming[] = words.map((word, i) => ({
      word,
      startMs: Math.round(i * msPerWord),
      endMs: Math.round((i + 1) * msPerWord),
    }));

    fs.writeFileSync(outputPath, JSON.stringify(timings, null, 2));
    return { jsonPath: outputPath, timings };
  }

  /**
   * Generates word-level timings from scene subtitles (in English),
   * distributing words proportionally across each scene's time window.
   * Ensures that on-screen karaoke subtitles are 100% in English while
   * syncing with speech during each scene.
   */
  generateSceneWordLevel(
    scenes: Scene[],
    videoId: string,
    outputDir?: string,
  ): { jsonPath: string; timings: WordTiming[] } {
    const outputPath = outputDir
      ? path.join(outputDir, "word-level.json")
      : path.join(PATHS.subtitles, videoId, "word-level.json");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const timings: WordTiming[] = [];
    let currentMs = 0;

    for (const scene of scenes) {
      const sceneDurationMs = Math.max(1, Math.round((scene.duration || 5) * 1000));
      const text = (scene.subtitle || scene.text || "").trim();
      const words = text.split(/\s+/).filter(Boolean);

      if (words.length > 0) {
        const msPerWord = sceneDurationMs / words.length;
        for (let i = 0; i < words.length; i++) {
          timings.push({
            word: words[i],
            startMs: Math.round(currentMs + i * msPerWord),
            endMs: Math.round(currentMs + (i + 1) * msPerWord),
          });
        }
      }
      currentMs += sceneDurationMs;
    }

    fs.writeFileSync(outputPath, JSON.stringify(timings, null, 2));
    return { jsonPath: outputPath, timings };
  }
}
