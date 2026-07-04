#!/usr/bin/env tsx

/**
 * CodeOrCap render pipeline
 *
 * Step 1 — Remotion renders a SILENT MP4 (fast, no audio fetch during headless render)
 * Step 2 — FFmpeg merges voiceover.mp3 (+ optional bg music) into the final reel.mp4
 *
 * Usage:
 *   npm run render                          # uses public/content/codeorcap/input.json
 *   npm run render -- -i my-input.json      # custom input
 *   npm run render -- --no-ffmpeg           # keep silent output (skip merge)
 *   npm run render -- --music bg.mp3        # mix background music from public/
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import ora from "ora";
import chalk from "chalk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  CodeOrCapConfigSchema,
  type CodeOrCapConfig,
  defaultCodeOrCapConfig,
} from "../../../src/shorts/codeorcap/types";

dotenv.config({ quiet: true });

const CODEORCAP_DIR = path.join(process.cwd(), "public", "content", "codeorcap");
const DEFAULT_VOICEOVER = path.join(CODEORCAP_DIR, "audio", "voiceover.mp3");
const DEFAULT_INPUT = path.join(CODEORCAP_DIR, "input.json");

function getSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function run() {
  const argv = await yargs(hideBin(process.argv))
    .option("input", {
      alias: "i",
      type: "string",
      default: DEFAULT_INPUT,
      description: "Path to input JSON (default: public/content/codeorcap/input.json)",
    })
    .option("out", {
      alias: "o",
      type: "string",
      description: "Output MP4 path (default: out/codeorcap-SLUG.mp4)",
    })
    .option("concurrency", {
      alias: "c",
      type: "number",
      default: 2,
      description: "Remotion render concurrency (puppeteer tabs)",
    })
    .option("ffmpeg", {
      type: "boolean",
      default: true,
      description: "Merge voiceover with FFmpeg after render (--no-ffmpeg to skip)",
    })
    .option("music", {
      type: "string",
      description: "Background music file relative to public/ (e.g. music/bg.mp3)",
    })
    .option("music-volume", {
      type: "number",
      default: 0.18,
      description: "Background music volume 0.0–1.0 (default: 0.18)",
    })
    .help()
    .parse();

  // ── Read + validate input.json ────────────────────────────────────────────
  const inputPath = path.resolve(process.cwd(), argv.input);
  if (!fs.existsSync(inputPath)) {
    console.error(chalk.red(`\nInput file not found: ${inputPath}`));
    console.error(
      chalk.yellow(
        'Run first:  npm run gen -- codeorcap --topic "Your Topic"',
      ),
    );
    process.exit(1);
  }

  let inputConfig: Partial<CodeOrCapConfig> = {};
  try {
    inputConfig = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  } catch (e: any) {
    console.error(chalk.red(`Failed to parse input JSON: ${e.message}`));
    process.exit(1);
  }

  const mergedConfig = { ...defaultCodeOrCapConfig, ...inputConfig };
  try {
    CodeOrCapConfigSchema.parse(mergedConfig);
  } catch (e: any) {
    console.error(chalk.red("Config validation failed:"), e.message);
    process.exit(1);
  }

  const config = mergedConfig as CodeOrCapConfig;
  const claimSlug = getSlug(config.claim);

  // ── Setup paths ───────────────────────────────────────────────────────────
  const outDir = path.join(process.cwd(), "out");
  fs.mkdirSync(outDir, { recursive: true });

  const silentPath = path.join(outDir, `codeorcap-${claimSlug}-silent.mp4`);
  const finalPath = argv.out
    ? path.resolve(process.cwd(), argv.out)
    : path.join(outDir, `codeorcap-${claimSlug}.mp4`);

  const hasVoiceover = fs.existsSync(DEFAULT_VOICEOVER);

  const musicAbsPath = argv.music
    ? path.join(process.cwd(), "public", argv.music)
    : null;
  const hasMusic = !!musicAbsPath && fs.existsSync(musicAbsPath);

  // ── Print render plan ─────────────────────────────────────────────────────
  console.log(chalk.yellow.bold("\n═══ RENDER PLAN ═══════════════"));
  console.log(chalk.bold("  Claim:     ") + config.claim);
  console.log(chalk.bold("  Verdict:   ") + config.verdict + "  " + config.rating);
  console.log(
    chalk.bold("  Voiceover: ") +
      (hasVoiceover ? chalk.green("✓ found") : chalk.red("✗ missing")),
  );
  if (argv.music) {
    console.log(
      chalk.bold("  Music:     ") +
        (hasMusic
          ? chalk.green(`✓ ${argv.music} (vol ${argv["music-volume"]})`)
          : chalk.red(`✗ not found at public/${argv.music}`)),
    );
  }
  console.log(chalk.bold("  Output:    ") + finalPath);
  console.log(chalk.yellow.bold("════════════════════════════════\n"));

  if (!hasVoiceover && argv.ffmpeg) {
    console.log(
      chalk.yellow(
        "⚠  No voiceover found — will produce a silent reel.\n" +
          "   Run first:  npm run gen -- codeorcap --tts\n",
      ),
    );
  }

  // ── Step 1: Remotion render (silent) ─────────────────────────────────────
  // Get audio duration so video matches audio length exactly.
  const FPS = 30;
  let audioDurationSecs = 32;
  if (hasVoiceover) {
    try {
      const result = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${DEFAULT_VOICEOVER}"`,
        { stdio: "pipe" },
      ).toString().trim();
      audioDurationSecs = parseFloat(result);
    } catch {}
  }
  const totalFrames = Math.ceil((audioDurationSecs + 1.5) * FPS);
  console.log(chalk.bold("  Duration:  ") + `${audioDurationSecs.toFixed(1)}s audio → ${totalFrames} frames (${(totalFrames / FPS).toFixed(1)}s video)\n`);

  // Strip audio tracks from props — FFmpeg handles audio externally.
  const renderProps: Partial<CodeOrCapConfig> = { ...config };
  delete renderProps.voiceoverTrack;
  delete renderProps.musicTrack;

  const propsJson = JSON.stringify(renderProps);
  const escapedProps = propsJson.replace(/'/g, "'\\''");

  const renderCmd = [
    "npx remotion render CodeOrCap",
    `"${silentPath}"`,
    `--concurrency=${argv.concurrency}`,
    `--duration-in-frames=${totalFrames}`,
    `--props='${escapedProps}'`,
  ].join(" ");

  const renderSpinner = ora(chalk.cyan("Step 1/2 — Remotion rendering frames…")).start();
  try {
    execSync(renderCmd, { stdio: "pipe", cwd: process.cwd() });
    renderSpinner.succeed(
      chalk.green("Silent MP4 rendered → " + path.basename(silentPath)),
    );
  } catch (err: any) {
    renderSpinner.fail(chalk.red("Remotion render failed — re-running with output:"));
    try {
      execSync(renderCmd, { stdio: "inherit", cwd: process.cwd() });
    } catch (_) {}
    process.exit(1);
  }

  // ── Step 2: FFmpeg merge ──────────────────────────────────────────────────
  if (!argv.ffmpeg || !hasVoiceover) {
    fs.renameSync(silentPath, finalPath);
    printDone(finalPath);
    return;
  }

  const ffmpegSpinner = ora(
    chalk.cyan(
      `Step 2/2 — FFmpeg merging${hasMusic ? " (voiceover + music)" : " (voiceover)"}…`,
    ),
  ).start();

  try {
    const musicVol = argv["music-volume"] ?? 0.18;

    const ffmpegCmd = hasMusic
      ? buildFFmpegWithMusic(silentPath, DEFAULT_VOICEOVER, musicAbsPath!, musicVol, finalPath)
      : buildFFmpegVoiceoverOnly(silentPath, DEFAULT_VOICEOVER, finalPath);

    execSync(ffmpegCmd, { stdio: "pipe" });
    ffmpegSpinner.succeed(
      chalk.green(
        `FFmpeg merge done${hasMusic ? " (voiceover + bg music)" : ""}`,
      ),
    );

    fs.unlinkSync(silentPath);
  } catch (err: any) {
    ffmpegSpinner.fail(chalk.red("FFmpeg merge failed"));
    console.error(chalk.red(err.stderr?.toString() ?? err.message));
    process.exit(1);
  }

  printDone(finalPath);
}

// ── FFmpeg command builders ──────────────────────────────────────────────────

function buildFFmpegVoiceoverOnly(
  videoPath: string,
  audioPath: string,
  outPath: string,
): string {
  return [
    "ffmpeg -y",
    `-i "${videoPath}"`,
    `-i "${audioPath}"`,
    `-map 0:v -map 1:a`,
    `-c:v copy -c:a aac -b:a 192k`,
    `-shortest`,
    `"${outPath}"`,
  ].join(" ");
}

function buildFFmpegWithMusic(
  videoPath: string,
  voicePath: string,
  musicPath: string,
  musicVol: number,
  outPath: string,
): string {
  return [
    "ffmpeg -y",
    `-i "${videoPath}"`,
    `-i "${voicePath}"`,
    `-i "${musicPath}"`,
    // voiceover at full volume; music ducked; mix to single audio stream
    `-filter_complex "[1:a]volume=1.0[vo];[2:a]volume=${musicVol}[bg];[vo][bg]amix=inputs=2:duration=first[aout]"`,
    `-map 0:v -map "[aout]"`,
    `-c:v copy -c:a aac -b:a 192k`,
    `-shortest`,
    `"${outPath}"`,
  ].join(" ");
}

// ── Helper ───────────────────────────────────────────────────────────────────

function printDone(finalPath: string) {
  const stat = fs.statSync(finalPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);
  console.log(chalk.green.bold(`\n✅ Reel ready!`));
  console.log("  " + chalk.blue(finalPath) + `  (${sizeMb} MB)`);
  console.log(
    "\nUpload to: Instagram Reels  •  YouTube Shorts  •  Facebook Reels\n",
  );
}

run();
