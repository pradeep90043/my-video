#!/usr/bin/env tsx
/**
 * Long-form pipeline — step 1: per-scene TTS.
 *
 * Reads public/content/<slug>/video.json, generates one edge-tts mp3 per
 * scene into public/content/<slug>/audio/, measures each with ffprobe and
 * writes exact startFrame / durationFrames / totalFrames back to video.json.
 *
 * Usage: npm run longform:audio -- --project AivsSWE
 */

import * as fs from "fs";
import * as path from "path";
import { execSync, spawnSync } from "child_process";
import { audioDir, loadVideoJson, resolveProject, saveVideoJson } from "./lib";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function getFfprobePath(): string {
  const localWinPath = path.join(process.cwd(), "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe");
  if (fs.existsSync(localWinPath)) {
    return localWinPath;
  }
  return "ffprobe";
}

function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);

  const outDir = audioDir(slug);
  fs.mkdirSync(outDir, { recursive: true });

  const voice = data.voice || "hi-IN-MadhurNeural";
  const rate = data.rate || "+0%";
  const pitch = data.pitch || "+0Hz";
  const fps = data.fps || 30;

  console.log(`🎙  [${slug}] Generating audio — voice: ${voice}, rate: ${rate}`);

  let currentStartFrame = 0;
  let totalDurationSec = 0;

  data.scenes.forEach((scene: any, i) => {
    const segmentName = `segment_${i}_${scene.id}.mp3`;
    const segmentPath = path.join(outDir, segmentName);

    const sceneVoice = scene.voice || voice;
    const sceneRate = scene.rate || rate;
    const scenePitch = scene.pitch || pitch;

    console.log(`  -> Scene ${i}: ${scene.id} (voice: ${sceneVoice})`);

    const ttsResult = spawnSync(
      "edge-tts",
      [
        "--voice", sceneVoice,
        "--rate", sceneRate,
        "--pitch", scenePitch,
        "--text", scene.text,
        "--write-media", segmentPath,
      ],
      { stdio: "pipe", timeout: 180_000 }
    );
    if (ttsResult.status !== 0) {
      console.error(`✗ edge-tts failed with exit code ${ttsResult.status}`);
      console.error(ttsResult.stderr.toString());
      process.exit(1);
    }

    const ffprobePath = getFfprobePath();
    const probe = execSync(
      `"${ffprobePath}" -v quiet -show_entries format=duration -of csv=p=0 "${segmentPath}"`,
      { encoding: "utf-8" },
    ).trim();

    const actualDurationSec = parseFloat(probe);
    const durationFrames = Math.ceil(actualDurationSec * fps);

    scene.duration = actualDurationSec;
    scene.startFrame = currentStartFrame;
    scene.durationFrames = durationFrames;
    scene.audioFile = segmentName;

    currentStartFrame += durationFrames;
    totalDurationSec += actualDurationSec;

    console.log(`     ${actualDurationSec.toFixed(2)}s (${durationFrames} frames)`);
  });

  data.totalDuration = totalDurationSec;
  data.totalFrames = currentStartFrame;
  saveVideoJson(slug, data);

  console.log(
    `✅ [${slug}] ${data.scenes.length} segments, ${totalDurationSec.toFixed(1)}s total. Timings written to video.json.`,
  );
}

main();
