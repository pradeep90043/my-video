#!/usr/bin/env tsx
/**
 * Bake the branded intro and outro once using FFmpeg.
 *
 * Takes the raw intro.mp4 / outro.mp4 from the Remotion assets folder,
 * overlays logo.png at the same position / size that the Remotion Studio
 * preview shows (logoBottom:145 logoRight:134 logoScale:0.8 logoImageScale:4.35),
 * and writes the result to out/intro.mp4 and out/outro.mp4.
 *
 * These files are then stitched onto every finished video via `npm run stitch`.
 * You only need to re-run this if the logo or its position changes.
 *
 * Usage:
 *   npm run bake:intro-outro
 */

import * as fs from "fs";
import * as path from "path";
import { execSync, spawnSync } from "child_process";

// ── Logo position — must match Root.tsx defaultProps ─────────────────────────
// Container sizing:  height = 90 * logoScale = 90 * 0.8 = 72px
//                   padding 4px top/bottom, 8px left/right → image area 64px
//                   logo is 1024×1024 so objectFit:contain fills 72px × 72px
// Visual size:       72 * logoImageScale = 72 * 4.35 ≈ 313px  (CSS transform:scale)
// Container center:  right = logoRight + containerWidth/2 = 134 + 44 = 178px from right
//                    bottom = logoBottom + containerHeight/2 = 145 + 36 = 181px from bottom
// → overlay top-left (logo 313×313):  x = W-w-21   y = H-h-24
const LOGO_W = 313;
const LOGO_H = 313;
const LOGO_X = "W-w-21"; // pixels from left edge  (W = video width, w = logo width)
const LOGO_Y = "H-h-24"; // pixels from top edge   (H = video height, h = logo height)

function findFfmpeg(): string {
  // 1. system PATH
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (probe.status === 0) return "ffmpeg";

  // 2. common Windows locations
  const candidates = [
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe",
  ];
  const scoop = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, "scoop", "apps", "ffmpeg", "current", "bin", "ffmpeg.exe")
    : null;
  if (scoop) candidates.push(scoop);

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  console.error(
    "\n❌ ffmpeg not found.\n" +
    "   Install it and make sure it is on your PATH, then re-run:\n\n" +
    "   Windows (Scoop):        scoop install ffmpeg\n" +
    "   Windows (Chocolatey):   choco install ffmpeg\n" +
    "   Windows (winget):       winget install Gyan.FFmpeg\n",
  );
  process.exit(1);
}

function bake(label: string, inputPath: string, outputPath: string, ffmpeg: string, logoPath: string) {
  console.log(`\n🎬 Baking logo onto ${label}…`);
  console.log(`   ${inputPath} → ${outputPath}`);

  const filter =
    `[1:v]scale=${LOGO_W}:${LOGO_H}[logo];` +
    `[0:v][logo]overlay=${LOGO_X}:${LOGO_Y}`;

  // Input has no audio — use -an to avoid "no audio stream" warnings
  execSync(
    `"${ffmpeg}" -y -i "${inputPath}" -i "${logoPath}" -filter_complex "${filter}" -an "${outputPath}"`,
    { stdio: "inherit" },
  );

  const sizeMb = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(1);
  console.log(`✅ ${label} ready (${sizeMb} MB)`);
}

function main() {
  const cwd = process.cwd();
  const assetsDir = path.join(cwd, "src", "codeorcap", "longs", "assets");
  const outDir = path.join(cwd, "out");
  fs.mkdirSync(outDir, { recursive: true });

  const ffmpeg = findFfmpeg();
  const logoPath = path.join(cwd, "logo.png");

  if (!fs.existsSync(logoPath)) {
    console.error("❌ logo.png not found in project root.");
    process.exit(1);
  }

  bake(
    "intro",
    path.join(assetsDir, "intro.mp4"),
    path.join(outDir, "intro.mp4"),
    ffmpeg,
    logoPath,
  );

  bake(
    "outro",
    path.join(assetsDir, "outro.mp4"),
    path.join(outDir, "outro.mp4"),
    ffmpeg,
    logoPath,
  );

  console.log(
    "\n✨ Done! Stitch onto any finished video with:\n" +
    "   \x1b[36mnpm run stitch -- --video out/your-video.mp4\x1b[0m\n",
  );
}

main();
