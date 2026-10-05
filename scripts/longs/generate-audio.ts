#!/usr/bin/env tsx
/**
 * Long-form pipeline — step 1: per-scene TTS (free edge-tts).
 *
 * Reads public/content/<slug>/video.json, generates one edge-tts mp3 per
 * scene into public/content/<slug>/audio/, measures each with ffprobe and
 * writes exact startFrame / durationFrames / totalFrames back to video.json.
 *
 * Scenes whose text/voice/rate/pitch are unchanged since the last run are
 * reused (hash cache in audio/.cache.json). Failed TTS calls are retried.
 *
 * Usage: npm run longform:audio -- --project AivsSWE [--force]
 */

import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import {
  audioDir,
  loadVideoJson,
  resolveProject,
  saveVideoJson,
  validateEdgeTtsSettings,
  validateVideoJson,
} from "./lib";
import { fail, getArg, hasFlag, probeDuration, retry, run } from "./util";

const MIN_SEGMENT_SECS = 0.3;

type Cache = Record<string, string>;

function sceneHash(text: string, voice: string, rate: string, pitch: string): string {
  return createHash("sha256").update([text, voice, rate, pitch].join("\u0000")).digest("hex");
}

function synthesize(text: string, voice: string, rate: string, pitch: string, outPath: string): void {
  // `--opt=value` form: values such as "-5%" or text starting with "-" would
  // otherwise be parsed by edge-tts's argparse as flags.
  const tmp = `${outPath}.part.mp3`;
  const r = run(
    "edge-tts",
    [`--voice=${voice}`, `--rate=${rate}`, `--pitch=${pitch}`, `--text=${text}`, `--write-media=${tmp}`],
    180_000,
  );
  if (r.status !== 0) {
    fs.rmSync(tmp, { force: true });
    throw new Error(`edge-tts exit ${r.status}: ${r.stderr.trim().split("\n").pop()}`);
  }
  const dur = probeDuration(tmp);
  if (dur < MIN_SEGMENT_SECS) {
    fs.rmSync(tmp, { force: true });
    throw new Error(`generated audio is only ${dur.toFixed(2)}s — TTS likely returned nothing`);
  }
  fs.renameSync(tmp, outPath); // atomic: never leave a half-written segment
}

async function main() {
  const slug = resolveProject(getArg("project"));
  const force = hasFlag("force");
  const data = loadVideoJson(slug);

  const problems = validateVideoJson(data);
  if (problems.length) fail(`video.json is invalid:\n  - ${problems.join("\n  - ")}`);

  const outDir = audioDir(slug);
  fs.mkdirSync(outDir, { recursive: true });

  const voice = data.voice;
  const rate = data.rate || "+0%";
  const pitch = data.pitch || "+0Hz";
  const fps = data.fps;

  const settingProblems = data.scenes.flatMap((s: any) =>
    validateEdgeTtsSettings(s.voice || voice, s.rate || rate, s.pitch || pitch).map((p) => `scene ${s.id}: ${p}`),
  );
  if (settingProblems.length) fail(`TTS settings invalid:\n  - ${settingProblems.join("\n  - ")}`);

  const cachePath = path.join(outDir, ".cache.json");
  let cache: Cache = {};
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  } catch {
    /* no cache yet */
  }

  console.log(`🎙  [${slug}] Generating audio — voice: ${voice}, rate: ${rate}`);

  let currentStartFrame = 0;
  let totalDurationSec = 0;
  let generated = 0;

  for (let i = 0; i < data.scenes.length; i++) {
    const scene: any = data.scenes[i];
    const segmentName = `segment_${i}_${scene.id}.mp3`;
    const segmentPath = path.join(outDir, segmentName);

    const sceneVoice = scene.voice || voice;
    const sceneRate = scene.rate || rate;
    const scenePitch = scene.pitch || pitch;
    const hash = sceneHash(scene.text, sceneVoice, sceneRate, scenePitch);

    const cached = !force && cache[segmentName] === hash && fs.existsSync(segmentPath);
    if (cached) {
      console.log(`  -> Scene ${i}: ${scene.id} (cached)`);
    } else {
      console.log(`  -> Scene ${i}: ${scene.id} (voice: ${sceneVoice})`);
      await retry(`TTS for ${scene.id}`, 3, () =>
        synthesize(scene.text, sceneVoice, sceneRate, scenePitch, segmentPath),
      );
      cache[segmentName] = hash;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2)); // persist progress per scene
      generated++;
    }

    const actualDurationSec = probeDuration(segmentPath);
    const durationFrames = Math.ceil(actualDurationSec * fps);

    scene.duration = actualDurationSec;
    scene.startFrame = currentStartFrame;
    scene.durationFrames = durationFrames;
    scene.audioFile = segmentName;

    currentStartFrame += durationFrames;
    totalDurationSec += actualDurationSec;

    console.log(`     ${actualDurationSec.toFixed(2)}s (${durationFrames} frames)`);
  }

  // Drop stale segments from removed/renamed scenes so they can't leak into merges.
  const keep = new Set(data.scenes.map((s: any) => s.audioFile));
  for (const f of fs.readdirSync(outDir)) {
    if (/^segment_.*\.mp3$/.test(f) && !keep.has(f)) {
      fs.rmSync(path.join(outDir, f));
      delete cache[f];
    }
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  data.totalDuration = totalDurationSec;
  data.totalFrames = currentStartFrame;
  saveVideoJson(slug, data);

  console.log(
    `✅ [${slug}] ${data.scenes.length} segments (${generated} generated, ${data.scenes.length - generated} cached), ` +
      `${totalDurationSec.toFixed(1)}s total. Timings written to video.json.`,
  );
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
