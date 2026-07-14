/**
 * Shared helpers for the long-form (YouTube 1920x1080) pipeline.
 *
 * A long-form project lives at public/content/<slug>/ and contains:
 *   video.json          — script, TTS settings, scene timings (source of truth)
 *   audio/segment_*.mp3 — per-scene TTS audio
 *   audio/voiceover.mp3 — merged voiceover track played by the composition
 */

import * as fs from "fs";
import * as path from "path";

export interface LongformScene {
  id: string;
  text: string;
  duration?: number;
  startFrame?: number;
  durationFrames?: number;
  audioFile?: string;
}

export interface LongformVideoJSON {
  format: "longform";
  /** Remotion composition id — defaults to the project slug */
  composition?: string;
  fps: number;
  voice: string;
  rate?: string;
  pitch?: string;
  language?: string;
  totalDuration?: number;
  totalFrames?: number;
  title?: string;
  description?: string;
  tags?: string[];
  logoBottom?: number;
  logoRight?: number;
  logoScale?: number;
  logoImageScale?: number;
  logoOpacity?: number;
  blurAmount?: number;
  scenes: LongformScene[];
}

export const CONTENT_DIR = path.join(process.cwd(), "public", "content");

export function projectDir(slug: string): string {
  return path.join(CONTENT_DIR, slug);
}

export function videoJsonPath(slug: string): string {
  return path.join(projectDir(slug), "video.json");
}

export function audioDir(slug: string): string {
  return path.join(projectDir(slug), "audio");
}

export function isLongformProject(slug: string): boolean {
  const p = videoJsonPath(slug);
  if (!fs.existsSync(p)) return false;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")).format === "longform";
  } catch {
    return false;
  }
}

export function listLongformProjects(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((d) => fs.statSync(path.join(CONTENT_DIR, d)).isDirectory())
    .filter(isLongformProject);
}

/** Resolve the --project argument, or auto-pick when only one project exists. */
export function resolveProject(requested?: string): string {
  const projects = listLongformProjects();

  if (requested) {
    if (!isLongformProject(requested)) {
      console.error(
        `✗ "${requested}" is not a long-form project (no public/content/${requested}/video.json with "format": "longform").`,
      );
      if (projects.length) console.error(`  Available: ${projects.join(", ")}`);
      process.exit(1);
    }
    return requested;
  }

  if (projects.length === 1) return projects[0];

  console.error(
    projects.length === 0
      ? '✗ No long-form projects found. Create one with: npm run longform:new -- --project <slug>'
      : `✗ Multiple long-form projects found — pass one with --project.\n  Available: ${projects.join(", ")}`,
  );
  process.exit(1);
}

export function loadVideoJson(slug: string): LongformVideoJSON {
  return JSON.parse(fs.readFileSync(videoJsonPath(slug), "utf-8"));
}

export function saveVideoJson(slug: string, data: LongformVideoJSON): void {
  fs.writeFileSync(videoJsonPath(slug), JSON.stringify(data, null, 2));
}
