import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

function getBundledBin(name: "ffprobe" | "ffmpeg"): string {
  const ext = process.platform === "win32" ? ".exe" : "";
  const local = path.join(
    process.cwd(),
    "node_modules",
    "@remotion",
    "compositor-win32-x64-msvc",
    `${name}${ext}`,
  );
  return fs.existsSync(local) ? `"${local}"` : name;
}

/** Returns a full-featured ffmpeg path (supports video filters), or null if unavailable. */
function getFullFfmpeg(): string | null {
  // Prefer system ffmpeg — it typically has video filters enabled
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    return null;
  }
}

/** Returns a full-featured ffprobe path. */
function getFullFfprobe(): string | null {
  try {
    execSync("ffprobe -version", { stdio: "ignore" });
    return "ffprobe";
  } catch {
    return null;
  }
}

/**
 * Adds logo branding to the video at the specified path.
 * If logo.png doesn't exist, it prints a warning and skips.
 * It uses ffprobe to dynamically detect if the video is short (portrait) or long (landscape).
 * @param videoPath The absolute or relative path to the input video.
 */
export function addBranding(videoPath: string): void {
  const logoPath = path.join(process.cwd(), "logo.png");
  if (!fs.existsSync(logoPath)) {
    console.warn(`⚠ logo.png not found in current directory. Skipping logo branding.`);
    return;
  }

  // Video filter ops require a full ffmpeg (Remotion's bundled one is audio-only)
  const ffmpeg = getFullFfmpeg();
  const ffprobeCmd = getFullFfprobe() ?? getBundledBin("ffprobe");

  if (!ffmpeg) {
    console.warn("⚠ No system ffmpeg found — skipping logo overlay. Install ffmpeg to enable branding.");
    return;
  }

  // 1. Detect dimensions using ffprobe
  let width = 0;
  let height = 0;
  try {
    const ffprobeOut = execSync(
      `${ffprobeCmd} -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`,
      { encoding: "utf-8" }
    ).trim();
    const parts = ffprobeOut.split("x").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      width = parts[0];
      height = parts[1];
    }
  } catch (err) {
    console.error(`Error probing video dimensions:`, err);
  }

  if (width === 0 || height === 0) {
    console.warn(`⚠ Could not detect video dimensions. Defaulting to long (landscape) format branding.`);
    width = 1920;
    height = 1080;
  }

  const isShort = height > width;
  console.log(`Applying logo branding (${isShort ? "short" : "long"} video: ${width}x${height})...`);

  const tempPath = videoPath.replace(/\.mp4$/, "-unbranded.mp4");
  fs.renameSync(videoPath, tempPath);

  try {
    if (isShort) {
      // Shorts 9:16 — logo 50×50, 91px from top-right
      const logoW = 50, logoH = 50, margin = 91;
      const x = width - logoW - margin;
      const y = margin;
      execSync(
        `${ffmpeg!} -y -i "${tempPath}" -i "${logoPath}" -filter_complex "[1:v]scale=${logoW}:${logoH}[logo];[0:v][logo]overlay=${x}:${y}" -codec:a copy "${videoPath}"`,
        { stdio: "inherit" }
      );
    } else {
      // Full 16:9 — logo 105×100, 138px from bottom-right
      const logoW = 105, logoH = 100, margin = 138;
      const x = width - logoW - margin;
      const y = height - logoH - margin;
      execSync(
        `${ffmpeg!} -y -i "${tempPath}" -i "${logoPath}" -filter_complex "[1:v]scale=${logoW}:${logoH}[logo];[0:v][logo]overlay=${x}:${y}" -codec:a copy "${videoPath}"`,
        { stdio: "inherit" }
      );
    }
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    console.log(`✅ Branding added successfully to ${videoPath}`);
  } catch (err) {
    console.error(`✗ Failed to apply branding via ffmpeg:`, err);
    // Restore original if failed
    if (fs.existsSync(tempPath) && !fs.existsSync(videoPath)) {
      fs.renameSync(tempPath, videoPath);
    }
  }
}
