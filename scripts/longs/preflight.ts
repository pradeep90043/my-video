#!/usr/bin/env tsx
/**
 * Long-form pipeline — preflight checks. Fails fast, before any slow work,
 * on anything that would break a run midway.
 *
 * Usage: npm run longform:check -- --project AivsSWE
 */

import * as fs from "fs";
import * as path from "path";
import { loadVideoJson, resolveProject, validateVideoJson } from "./lib";
import { validateStickmanScenes } from "../../src/stickman/schema";
import { fail, freeDiskGb, getArg, hasBinary, hasFlag } from "./util";

export interface PreflightOptions {
  needsTts: boolean;
}

export function preflight(slug: string, { needsTts }: PreflightOptions): string[] {
  const problems: string[] = [];

  for (const bin of ["ffmpeg", "ffprobe"]) {
    if (!hasBinary(bin)) problems.push(`${bin} not found on PATH (brew install ffmpeg)`);
  }
  if (needsTts && !hasBinary("edge-tts")) problems.push("edge-tts not found on PATH (pip install edge-tts)");
  if (!fs.existsSync(path.join(process.cwd(), "node_modules", "remotion"))) {
    problems.push("dependencies not installed (npm install)");
  }
  if (!fs.existsSync(path.join(process.cwd(), "logo.png"))) {
    problems.push("logo.png missing in project root (needed for branding; pass --no-branding to skip)");
  }

  const data = loadVideoJson(slug);
  problems.push(...validateVideoJson(data).map((p) => `video.json: ${p}`));

  const isStickman = data.template === "stickman";
  const compositionId = isStickman ? "StickmanVideo" : (data.composition ?? slug);
  if (isStickman) {
    problems.push(...validateStickmanScenes(data.scenes).map((p) => `video.json: ${p}`));
    if (data.theme && data.theme !== "light" && data.theme !== "dark") problems.push('video.json: theme must be "light" or "dark"');
    // Long static scenes feel dead; the audio step records durations, so this only fires after TTS.
    for (const s of data.scenes) {
      if ((s.duration ?? 0) > 8) console.warn(`⚠ scene "${s.id}" is ${s.duration!.toFixed(1)}s — split it into shorter beats (≤ 6s) so visuals keep changing.`);
    }
  }
  const root = fs.readFileSync(path.join(process.cwd(), "src", "Root.tsx"), "utf-8");
  if (!root.includes(`id="${compositionId}"`)) {
    problems.push(`composition "${compositionId}" is not registered in src/Root.tsx`);
  }

  const free = freeDiskGb(process.cwd());
  // ~0.15 GB per rendered minute (frames + intermediate + branded copy) plus 1 GB headroom.
  const needGb = 1 + ((data.totalDuration ?? 600) / 60) * 0.15;
  if (free !== null && free < needGb) {
    problems.push(`only ${free.toFixed(1)} GB free disk — this render needs ≈ ${needGb.toFixed(1)} GB`);
  }

  return problems;
}

if (require.main === module) {
  const slug = resolveProject(getArg("project"));
  const problems = preflight(slug, { needsTts: !hasFlag("skip-audio") });
  if (problems.length) fail(`Preflight failed for "${slug}":\n  - ${problems.join("\n  - ")}`);
  console.log(`✅ [${slug}] Preflight OK`);
}
