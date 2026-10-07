import { execFileSync, execSync } from "child_process";
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
 * @returns true if the logo was applied; false if skipped or failed (the original file is left intact).
 */
export function addBranding(videoPath: string, opts: { skipLogo?: boolean } = {}): boolean {
  const logoPath = path.join(process.cwd(), "logo.png");
  if (!opts.skipLogo && !fs.existsSync(logoPath)) {
    console.warn(`⚠ logo.png not found in current directory. Skipping logo branding.`);
    return false;
  }

  // Video filter ops require a full ffmpeg (Remotion's bundled one is audio-only)
  const ffmpeg = getFullFfmpeg();
  const ffprobeCmd = getFullFfprobe() ?? getBundledBin("ffprobe");

  if (!ffmpeg) {
    console.warn("⚠ No system ffmpeg found — skipping logo overlay. Install ffmpeg to enable branding.");
    return false;
  }

  // 1. Detect dimensions using ffprobe
  let width = 0;
  let height = 0;
  try {
    const ffprobeOut = execSync(
      `${ffprobeCmd} -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`,
      { encoding: "utf-8" }
    ).trim();
    const m = ffprobeOut.match(/^(\d+)x(\d+)/);
    if (m) {
      width = Number(m[1]);
      height = Number(m[2]);
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

  // Shorts 9:16 — logo 50×50, 91px from top-right
  // Full 16:9  — logo 105×100, 138px from bottom-right
  // Sizes are defined for 1080-wide (shorts) / 1920-wide (long) frames; scale for other resolutions.
  const k = width / (isShort ? 1080 : 1920);
  const [baseW, baseH, baseMargin] = isShort ? [50, 50, 91] : [105, 100, 138];
  const logoW = Math.round(baseW * k / 2) * 2;
  const logoH = Math.round(baseH * k / 2) * 2;
  const margin = Math.round(baseMargin * k);
  const x = width - logoW - margin;
  const y = isShort ? margin : height - logoH - margin;

  try {
    // Remotion emits full-range "yuvj420p" (BT.601), which many players and
    // YouTube render with crushed/washed colors. Convert to standard
    // limited-range BT.709 yuv420p in the same pass as the overlay.
    const toBt709 =
      "scale=in_range=full:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709,format=yuv420p";
    const graph = opts.skipLogo
      ? `[0:v]${toBt709}[v]`
      : `[0:v]${toBt709}[base];[1:v]scale=${logoW}:${logoH}[logo];[base][logo]overlay=${x}:${y}:format=auto,format=yuv420p[v]`;
    // The filter forces a video re-encode, so use near-lossless settings to
    // avoid a visible second-generation quality drop. Audio is copied as-is.
    execFileSync(
      ffmpeg,
      [
        "-y", "-i", tempPath, ...(opts.skipLogo ? [] : ["-i", logoPath]),
        "-filter_complex", graph, "-map", "[v]", "-map", "0:a?",
        "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
        "-movflags", "+faststart", "-c:a", "copy",
        videoPath,
      ],
      { stdio: "inherit" },
    );
    fs.unlinkSync(tempPath);
    console.log(`✅ Branding added successfully to ${videoPath}`);
    return true;
  } catch (err) {
    console.error(`✗ Failed to apply branding via ffmpeg:`, err);
    // Restore the unbranded original so the caller still has a valid file.
    fs.rmSync(videoPath, { force: true });
    fs.renameSync(tempPath, videoPath);
    return false;
  }
}
