#!/usr/bin/env tsx
/**
 * Unified Publication CLI — Push videos to YouTube and Instagram
 *
 * Usage:
 *   # Auto-detect latest video in out/ and publish to appropriate platforms
 *   npx tsx scripts/shared/publish.ts
 *
 *   # Specify file explicitly
 *   npx tsx scripts/shared/publish.ts --file out/codeorcap-react-is-dead.mp4
 *
 *   # Force type and provide custom metadata
 *   npx tsx scripts/shared/publish.ts --file out/my-video.mp4 --type short --title "React 19 Is Here" --description "Check this out!"
 *
 *   # Skip specific platforms
 *   npx tsx scripts/shared/publish.ts --skip-instagram
 */

import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import * as http from "http";
import { execSync } from "child_process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import ora from "ora";
import express from "express";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

import { uploadVideoToYouTube, type YouTubeCredentials } from "./youtube";
import { publishReel } from "./instagram";

type Channel = "codeorcap" | "storiyum";

interface ChannelCredentials {
  youtubeRefreshToken: string;
  igUserId: string;
  igAccessToken: string;
}

function resolveChannelCredentials(channel: Channel): ChannelCredentials | null {
  const prefix = channel.toUpperCase();
  const youtubeRefreshToken = process.env[`${prefix}_YOUTUBE_REFRESH_TOKEN`];
  const igUserId = process.env[`${prefix}_INSTAGRAM_USER_ID`];
  const igAccessToken = process.env[`${prefix}_INSTAGRAM_ACCESS_TOKEN`];

  if (!youtubeRefreshToken || !igUserId || !igAccessToken) {
    console.error(`❌ Missing credentials for channel "${channel}". Check .env for ${prefix}_YOUTUBE_REFRESH_TOKEN, ${prefix}_INSTAGRAM_USER_ID, ${prefix}_INSTAGRAM_ACCESS_TOKEN.`);
    return null;
  }
  return { youtubeRefreshToken, igUserId, igAccessToken };
}

const DEFAULT_PORT = parseInt(process.env.PORT ?? "3001", 10);

interface VideoInfo {
  title: string;
  description: string;
  tags: string[];
}

/**
 * Checks if a TCP port is in use
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

function getFfprobePath(): string {
  const localWinPath = path.join(process.cwd(), "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe");
  if (fs.existsSync(localWinPath)) {
    return localWinPath;
  }
  return "ffprobe";
}

/**
 * Probes the video file using ffprobe to find dimensions and duration
 */
function getDurationAndOrientation(filePath: string): { type: "long" | "short"; duration: number } {
  try {
    const ffprobe = getFfprobePath();
    const width = parseInt(
      execSync(`"${ffprobe}" -v error -select_streams v:0 -show_entries stream=width -of default=nw=1:nk=1 "${filePath}"`, {
        stdio: "pipe",
      })
        .toString()
        .trim(),
      10
    );
    const height = parseInt(
      execSync(`"${ffprobe}" -v error -select_streams v:0 -show_entries stream=height -of default=nw=1:nk=1 "${filePath}"`, {
        stdio: "pipe",
      })
        .toString()
        .trim(),
      10
    );
    const duration = parseFloat(
      execSync(`"${ffprobe}" -v error -show_entries format=duration -of default=nw=1:nk=1 "${filePath}"`, {
        stdio: "pipe",
      })
        .toString()
        .trim()
    );

    // Portrait (width < height) is short/reel, landscape is long
    const type = width < height ? "short" : "long";
    console.log(chalk.dim(`[Probe] Resolution: ${width}x${height}, Duration: ${duration.toFixed(1)}s -> Inferred type: ${type}`));
    return { type, duration };
  } catch (err) {
    // Guess based on filename/path
    const baseName = path.basename(filePath).toLowerCase();
    const type = baseName.includes("short") || baseName.includes("reel") || baseName.includes("codeorcap") || baseName.includes("teaser") ? "short" : "long";
    console.log(chalk.yellow(`[Probe] ffprobe failed. Inferred type from filename: ${type}`));
    return { type, duration: 30 };
  }
}

/**
 * Sorts and finds the latest modified MP4 file in the out/ directory
 */
function getLatestOutVideo(): string | null {
  const outDir = path.join(process.cwd(), "out");
  if (!fs.existsSync(outDir)) return null;
  const files = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".mp4") && !f.endsWith("-silent.mp4"))
    .map((f) => ({ name: f, time: fs.statSync(path.join(outDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? path.join(outDir, files[0].name) : null;
}

/**
 * Attempts to automatically locate metadata for a video file
 */
function resolveMetadata(videoPath: string): VideoInfo | null {
  const baseName = path.basename(videoPath, ".mp4");
  const cleanName = baseName
    .replace(/^codeorcap-/, "")
    .replace(/-silent$/, "")
    .replace(/-final$/, "");

  // Search paths
  const searchPaths = [
    path.join(process.cwd(), "generated", "metadata", `${cleanName}.json`),
    path.join(process.cwd(), "generated", "metadata", `${baseName}.json`),
    path.join(process.cwd(), "public", "content", cleanName, "video.json"),
    path.join(process.cwd(), "public", "content", baseName, "video.json"),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (data.title) {
          console.log(chalk.green(`[Metadata] Found matching config file: ${path.relative(process.cwd(), p)}`));
          let title = data.title;
          let description = data.description || "";
          const tags = data.tags || [];
          const hashtags = data.hashtags || [];

          if (!description && data.scenes) {
            description = data.scenes.map((s: any) => s.text).join(" ");
          }

          if (hashtags.length > 0 && !description.includes(hashtags[0])) {
            description += "\n\n" + hashtags.join(" ");
          }

          return { title, description, tags };
        }
      } catch (err: any) {
        console.warn(chalk.yellow(`[Metadata] Failed to read metadata at ${p}: ${err.message}`));
      }
    }
  }

  // Fuzzy-match files inside generated/metadata
  const metadataDir = path.join(process.cwd(), "generated", "metadata");
  if (fs.existsSync(metadataDir)) {
    const files = fs.readdirSync(metadataDir).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      if (f.toLowerCase().includes(cleanName.toLowerCase())) {
        const p = path.join(metadataDir, f);
        try {
          const data = JSON.parse(fs.readFileSync(p, "utf-8"));
          if (data.title) {
            console.log(chalk.green(`[Metadata] Fuzzy-matched config file: ${f}`));
            let description = data.description || "";
            if (data.hashtags && data.hashtags.length > 0) {
              description += "\n\n" + data.hashtags.join(" ");
            }
            return {
              title: data.title,
              description,
              tags: data.tags || [],
            };
          }
        } catch {}
      }
    }
  }

  return null;
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("file", {
      alias: "f",
      type: "string",
      description: "Path to video file (defaults to latest modified file in out/)",
    })
    .option("type", {
      alias: "t",
      type: "string",
      choices: ["long", "short"],
      description: "Force video type (long or short). If omitted, auto-detects.",
    })
    .option("title", {
      type: "string",
      description: "Override video title",
    })
    .option("description", {
      alias: "desc",
      type: "string",
      description: "Override video description / Instagram caption",
    })
    .option("privacy", {
      type: "string",
      choices: ["public", "private", "unlisted"],
      default: "public",
      description: "YouTube privacy status (default: public)",
    })
    .option("channel", {
      alias: "c",
      type: "string",
      choices: ["codeorcap", "storiyum"],
      description: "Which channel to publish to (codeorcap or storiyum). Required.",
      demandOption: true,
    })
    .option("skip-youtube", {
      type: "boolean",
      default: false,
      description: "Skip uploading to YouTube",
    })
    .option("skip-instagram", {
      type: "boolean",
      default: false,
      description: "Skip posting to Instagram (only applies to shorts)",
    })
    .option("tunnel-url", {
      type: "string",
      description: "Override PUBLIC_TUNNEL_URL from .env",
    })
    .help()
    .parse();

  const channel = argv.channel as Channel;
  console.log(chalk.bgCyan.black.bold(`\n 🚀 Publishing to: ${channel.toUpperCase()} \n`));

  const creds = resolveChannelCredentials(channel);
  if (!creds) process.exit(1);

  const ytCreds: YouTubeCredentials = {
    clientId: process.env.YOUTUBE_CLIENT_ID!,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
    refreshToken: creds.youtubeRefreshToken,
  };

  // ── 1. Resolve video file ──────────────────────────────────────────────────
  let videoPath = argv.file;
  if (!videoPath) {
    const latest = getLatestOutVideo();
    if (!latest) {
      console.error(chalk.red("❌ Error: No video file specified, and no MP4 files found in out/"));
      console.error(chalk.yellow("Please run a render script first, or pass the video path using --file <path>"));
      process.exit(1);
    }
    videoPath = latest;
  }

  const absoluteVideoPath = path.resolve(process.cwd(), videoPath);
  if (!fs.existsSync(absoluteVideoPath)) {
    console.error(chalk.red(`❌ Error: Video file not found at path: ${videoPath}`));
    process.exit(1);
  }

  const baseName = path.basename(videoPath, ".mp4");
  const cleanName = baseName
    .replace(/^codeorcap-/, "")
    .replace(/-silent$/, "")
    .replace(/-final$/, "");

  console.log(chalk.bold("  Video File:   ") + chalk.cyan(videoPath));

  // ── 2. Determine type (long vs short) ──────────────────────────────────────
  let type: "long" | "short" = "long";
  let duration = 30;

  if (argv.type) {
    type = argv.type as "long" | "short";
    console.log(chalk.bold("  Video Type:   ") + chalk.magenta(`${type} (forced)`));
  } else {
    const probe = getDurationAndOrientation(absoluteVideoPath);
    type = probe.type;
    duration = probe.duration;
    console.log(chalk.bold("  Video Type:   ") + chalk.magenta(`${type} (auto-detected)`));
  }

  // ── 3. Resolve metadata ────────────────────────────────────────────────────
  const meta = resolveMetadata(absoluteVideoPath);
  let title = argv.title || meta?.title || path.basename(videoPath, ".mp4");
  let description = argv.description || meta?.description || `A cool video from ${path.basename(videoPath, ".mp4")}`;

  // Make sure Shorts have #shorts hashtag
  if (type === "short") {
    if (!title.toLowerCase().includes("#shorts") && title.length < 90) {
      title += " #shorts";
    }
    if (!description.toLowerCase().includes("#shorts")) {
      description += "\n\n#shorts";
    }
  }

  console.log(chalk.bold("  Title:        ") + title);
  console.log(chalk.bold("  Duration:     ") + duration.toFixed(1) + "s");
  console.log(chalk.bold("  Description:  ") + chalk.dim(description.replace(/\n/g, " ").substring(0, 80) + "..."));

  // ── 4. YouTube Upload ──────────────────────────────────────────────────────
  if (argv["skip-youtube"]) {
    console.log(chalk.yellow("  YouTube:      Skipped"));
  } else {
    const spinner = ora("Uploading video to YouTube...").start();
    try {
      const ytResult = await uploadVideoToYouTube(absoluteVideoPath, title, description, argv.privacy as any, ytCreds);
      if (ytResult.success) {
        spinner.succeed(chalk.green(`YouTube upload succeeded! Video ID: ${ytResult.videoId}`));
        console.log(`                Watch Link: https://www.youtube.com/watch?v=${ytResult.videoId}`);
      } else {
        spinner.fail(chalk.red(`YouTube upload failed: ${ytResult.error}`));
      }
    } catch (err: any) {
      spinner.fail(chalk.red(`YouTube upload failed: ${err.message}`));
    }
  }

  // ── 5. Instagram Upload (only for shorts) ──────────────────────────────────
  if (type === "long") {
    console.log(chalk.yellow("  Instagram:    Skipped (Instagram does not support long landscape videos via the Reel API)"));
  } else if (argv["skip-instagram"]) {
    console.log(chalk.yellow("  Instagram:    Skipped"));
  } else {
    // Credentials check
    const igUserId = creds.igUserId;
    const accessToken = creds.igAccessToken;
    const tunnelUrl = (argv["tunnel-url"] as string) || process.env.PUBLIC_TUNNEL_URL;

    if (!igUserId || !accessToken) {
      console.log(chalk.red(`  Instagram:    Failed (Missing Instagram credentials for channel "${channel}" in .env)`));
    } else if (!tunnelUrl) {
      console.log(chalk.red("  Instagram:    Failed (Missing PUBLIC_TUNNEL_URL in .env. Meta requires a public URL to fetch the video)"));
    } else {
      let tempServer: http.Server | null = null;
      const portInUse = await isPortInUse(DEFAULT_PORT);

      // Make sure the file is inside the directory served by express
      const relativeToCwd = path.relative(process.cwd(), absoluteVideoPath);
      const isInOut = relativeToCwd.startsWith("out" + path.sep) || relativeToCwd === "out";

      let servedFileName = path.basename(absoluteVideoPath);
      if (!isInOut) {
        // If the video is not in out/ folder, copy it temporarily to out/ so it is servable
        const outDir = path.join(process.cwd(), "out");
        fs.mkdirSync(outDir, { recursive: true });
        const dest = path.join(outDir, servedFileName);
        console.log(chalk.dim(`[Instagram] Copying video to out/ folder so it can be served: ${dest}`));
        fs.copyFileSync(absoluteVideoPath, dest);
      }

      const publicVideoUrl = `${tunnelUrl.replace(/\/$/, "")}/out/${servedFileName}`;
      console.log(chalk.dim(`[Instagram] Video URL for Meta: ${publicVideoUrl}`));

      if (!portInUse) {
        console.log(chalk.dim(`[Instagram] Port ${DEFAULT_PORT} is free. Starting temporary Express server...`));
        const app = express();
        app.use("/out", express.static(path.join(process.cwd(), "out")));
        tempServer = app.listen(DEFAULT_PORT);
      } else {
        console.log(chalk.dim(`[Instagram] Port ${DEFAULT_PORT} is already in use (assuming server is already running).`));
      }

      const spinner = ora("Uploading video to Instagram Reels...").start();
      try {
        const igResult = await publishReel(igUserId, accessToken, publicVideoUrl, description);
        if (igResult.success) {
          spinner.succeed(chalk.green(`Instagram Reel published successfully! Media ID: ${igResult.mediaId}`));
        } else {
          spinner.fail(chalk.red(`Instagram upload failed: ${igResult.error}`));
        }
      } catch (err: any) {
        spinner.fail(chalk.red(`Instagram upload failed: ${err.message}`));
      } finally {
        if (tempServer) {
          tempServer.close();
          console.log(chalk.dim(`[Instagram] Temporary Express server stopped.`));
        }
      }
    }
  }

  // ── 6. Cleanup assets after publish ────────────────────────────────────────
  console.log(chalk.yellow(`\n🧹 Cleaning up assets for video: ${cleanName}...`));

  // Determine videoId if possible
  let videoId = "";
  const searchPathsForId = [
    path.join(process.cwd(), "public", "content", "factory", cleanName, "video.json"),
    path.join(process.cwd(), "generated", "metadata", `${cleanName}.json`),
  ];
  for (const p of searchPathsForId) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (data.videoId) videoId = data.videoId;
        else if (data.id) videoId = data.id;
      } catch {}
    }
  }

  // Delete generated folders/files (backward compatibility)
  if (videoId) {
    const generatedPaths = [
      path.join(process.cwd(), "generated", "audio", videoId),
      path.join(process.cwd(), "generated", "images", videoId),
      path.join(process.cwd(), "generated", "subtitles", videoId),
      path.join(process.cwd(), "generated", "thumbnails", videoId),
      path.join(process.cwd(), "generated", "json", `${cleanName}.json`),
      path.join(process.cwd(), "generated", "scripts", `${cleanName}.md`),
      path.join(process.cwd(), "generated", "metadata", `${cleanName}.json`),
    ];
    generatedPaths.forEach((p) => {
      if (fs.existsSync(p)) {
        try {
          fs.rmSync(p, { recursive: true, force: true });
          console.log(chalk.dim(`Deleted generated asset: ${path.relative(process.cwd(), p)}`));
        } catch (err: any) {
          console.error(chalk.red(`Failed to delete ${p}: ${err.message}`));
        }
      }
    });
  }

  // Delete factory video folder entirely if it exists
  const factoryVideoFolder = path.join(process.cwd(), "public", "content", "factory", cleanName);
  if (fs.existsSync(factoryVideoFolder)) {
    try {
      fs.rmSync(factoryVideoFolder, { recursive: true, force: true });
      console.log(chalk.green(`Deleted factory folder: ${path.relative(process.cwd(), factoryVideoFolder)}`));
    } catch (err: any) {
      console.error(chalk.red(`Failed to delete factory folder: ${err.message}`));
    }
  } else {
    // If it's a manual project in public/content/${cleanName}, only clean generated images/audio
    const projectFolder = path.join(process.cwd(), "public", "content", cleanName);
    if (fs.existsSync(projectFolder)) {
      const subDirs = ["images", "audio"];
      subDirs.forEach((subDir) => {
        const subDirPath = path.join(projectFolder, subDir);
        if (fs.existsSync(subDirPath)) {
          try {
            fs.rmSync(subDirPath, { recursive: true, force: true });
            console.log(chalk.green(`Deleted project assets: ${path.relative(process.cwd(), subDirPath)}`));
          } catch (err: any) {
            console.error(chalk.red(`Failed to delete project assets in ${subDir}: ${err.message}`));
          }
        }
      });
    }
  }

  console.log(chalk.bold("\n✨ Publishing run complete!\n"));
}

main().catch((err) => {
  console.error(chalk.red("\n✖ Fatal Error:"), err.message);
  process.exit(1);
});
