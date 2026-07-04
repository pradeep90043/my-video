#!/usr/bin/env tsx
/**
 * Long-form pipeline — step 2: merge scene segments into one voiceover.
 *
 * Concatenates public/content/<slug>/audio/segment_*.mp3 (in scene order)
 * into public/content/<slug>/audio/voiceover.mp3 — the track the Remotion
 * composition plays.
 *
 * Usage: npm run longform:merge -- --project AivsSWE
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { audioDir, loadVideoJson, resolveProject } from "./lib";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);
  const dir = audioDir(slug);

  console.log(`🔗 [${slug}] Merging ${data.scenes.length} audio segments…`);

  const missing = data.scenes.filter(
    (s) => !s.audioFile || !fs.existsSync(path.join(dir, s.audioFile)),
  );
  if (missing.length) {
    console.error(
      `✗ Missing segments for scenes: ${missing.map((s) => s.id).join(", ")}\n` +
        `  Run first: npm run longform:audio -- --project ${slug}`,
    );
    process.exit(1);
  }

  const concatFilePath = path.join(dir, "concat.txt");
  fs.writeFileSync(
    concatFilePath,
    data.scenes.map((s) => `file '${s.audioFile}'`).join("\n") + "\n",
  );

  const outputPath = path.join(dir, "voiceover.mp3");
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

  execSync(`ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}" -y`, {
    stdio: "inherit",
  });
  fs.unlinkSync(concatFilePath);

  console.log(`✅ [${slug}] Voiceover ready → public/content/${slug}/audio/voiceover.mp3`);
}

main();
