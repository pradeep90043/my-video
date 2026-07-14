#!/usr/bin/env tsx
/**
 * Stitch intro + main video + outro into a final YouTube-ready MP4.
 *
 * Requires:
 *   out/intro.mp4  — rendered via `npm run render:intro-outro`
 *   out/outro.mp4  — rendered via `npm run render:intro-outro`
 *
 * Usage:
 *   npm run stitch -- --video out/my-video.mp4
 *   npm run stitch -- --video out/my-video.mp4 --out out/my-video-final.mp4
 *   npm run stitch -- --video out/my-video.mp4 --no-intro
 *   npm run stitch -- --video out/my-video.mp4 --no-outro
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function requireFile(p: string): void {
  if (!fs.existsSync(p)) {
    console.error(`❌ Missing file: ${p}`);
    process.exit(1);
  }
}

function main() {
  const videoArg = getArg("video");
  if (!videoArg) {
    console.error("❌ Usage: npm run stitch -- --video out/your-video.mp4");
    process.exit(1);
  }

  const videoPath = path.resolve(process.cwd(), videoArg);
  requireFile(videoPath);

  const outDir = path.join(process.cwd(), "out");
  const introPath = path.join(outDir, "intro.mp4");
  const outroPath = path.join(outDir, "outro.mp4");

  const useIntro = !hasFlag("no-intro");
  const useOutro = !hasFlag("no-outro");

  if (useIntro) requireFile(introPath);
  if (useOutro) requireFile(outroPath);

  // Default output: <basename>-final.mp4 next to the input
  const basename = path.basename(videoPath, ".mp4");
  const defaultOut = path.join(path.dirname(videoPath), `${basename}-final.mp4`);
  const outPath = getArg("out")
    ? path.resolve(process.cwd(), getArg("out")!)
    : defaultOut;

  // Build the concat list in a temp file
  const parts: string[] = [];
  if (useIntro) parts.push(introPath);
  parts.push(videoPath);
  if (useOutro) parts.push(outroPath);

  const concatList = parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  const tmpList = path.join(os.tmpdir(), `stitch-${Date.now()}.txt`);
  fs.writeFileSync(tmpList, concatList + "\n");

  const label = [
    useIntro ? "intro" : null,
    "main video",
    useOutro ? "outro" : null,
  ]
    .filter(Boolean)
    .join(" + ");

  console.log(`\n🎬 Stitching ${label}…`);
  console.log(`   → ${outPath}\n`);

  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${tmpList}" -c copy "${outPath}"`,
    { stdio: "inherit" },
  );

  fs.unlinkSync(tmpList);

  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(1);
  console.log(`\n✅ Final video ready → ${outPath} (${sizeMb} MB)`);
  console.log(`   To publish: \x1b[36mnpm run publish -- --file "${path.relative(process.cwd(), outPath)}"\x1b[0m\n`);
}

main();
