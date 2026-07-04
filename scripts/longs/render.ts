#!/usr/bin/env tsx
/**
 * Long-form pipeline — step 3: render the final YouTube video.
 *
 * Renders the project's Remotion composition (audio is played inside the
 * composition, so no ffmpeg merge is needed). Composition id defaults to the
 * project slug — e.g. project "AivsSWE" renders composition "AIvsSWE" via the
 * "composition" field in its video.json.
 *
 * Usage:
 *   npm run longform:render -- --project AivsSWE
 *   npm run longform:render -- --project AivsSWE --concurrency 4 --out out/custom.mp4
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { loadVideoJson, resolveProject } from "./lib";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);

  const compositionId = data.composition ?? slug;
  const concurrency = getArg("concurrency") ?? "2";

  const outDir = path.join(process.cwd(), "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = getArg("out")
    ? path.resolve(process.cwd(), getArg("out")!)
    : path.join(outDir, `${slug}.mp4`);

  const voiceoverPath = path.join(
    process.cwd(), "public", "content", slug, "audio", "voiceover.mp3",
  );
  if (!fs.existsSync(voiceoverPath)) {
    console.warn(
      `⚠  No voiceover found at public/content/${slug}/audio/voiceover.mp3 — ` +
        `run: npm run longform:audio -- --project ${slug} && npm run longform:merge -- --project ${slug}`,
    );
  }

  const mins = ((data.totalDuration ?? 0) / 60).toFixed(1);
  console.log(`🎬 [${slug}] Rendering composition "${compositionId}" (~${mins} min)…`);

  execSync(
    `npx remotion render ${compositionId} "${outPath}" --concurrency=${concurrency}`,
    { stdio: "inherit", cwd: process.cwd() },
  );

  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(1);
  console.log(`\n✅ YouTube video ready → ${outPath} (${sizeMb} MB)`);
  console.log("   Upload to: YouTube (1920×1080 landscape)\n");
}

main();
