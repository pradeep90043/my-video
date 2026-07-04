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
import { execSync } from "child_process";
import { audioDir, loadVideoJson, resolveProject, saveVideoJson } from "./lib";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
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

  data.scenes.forEach((scene, i) => {
    const segmentName = `segment_${i}_${scene.id}.mp3`;
    const segmentPath = path.join(outDir, segmentName);

    console.log(`  -> Scene ${i}: ${scene.id}`);

    const escapedText = scene.text.replace(/'/g, "'\\''");
    execSync(
      `edge-tts --voice "${voice}" --rate "${rate}" --pitch "${pitch}" --text '${escapedText}' --write-media "${segmentPath}"`,
      { stdio: "pipe", timeout: 180_000 },
    );

    const probe = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${segmentPath}"`,
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
