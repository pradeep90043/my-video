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
import { voiceForScene } from "./emotions";
import { fail, getArg, hasFlag, probeDuration, retry, run } from "./util";

const MIN_SEGMENT_SECS = 0.3;

type Cache = Record<string, string>;

function sceneHash(text: string, voice: string, rate: string, pitch: string, volume: string): string {
  const parts = [text, voice, rate, pitch];
  if (volume !== "+0%") parts.push(volume); // keeps pre-emotion cache entries valid
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

interface WordTiming {
  w: string;
  s: number;
  d: number;
}

/** Synthesizes via scripts/longs/tts_words.py so we also get per-word timings (for karaoke captions). */
function synthesize(text: string, voice: string, rate: string, pitch: string, volume: string, outPath: string): void {
  const tmp = `${outPath}.part.mp3`;
  const wordsTmp = `${outPath}.part.words.json`;
  const helper = path.join(__dirname, "tts_words.py");
  const r = run("python3", [helper, voice, rate, pitch, volume, text, tmp, wordsTmp], 180_000);
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
  if (fs.existsSync(wordsTmp)) fs.renameSync(wordsTmp, outPath.replace(/\.mp3$/, ".words.json"));
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

  const settingProblems = data.scenes.flatMap((s: any) => {
    const v = voiceForScene(s.visual?.mood, { rate, pitch }, { rate: s.rate, pitch: s.pitch });
    return validateEdgeTtsSettings(s.voice || voice, v.rate, v.pitch).map((p) => `scene ${s.id}: ${p}`);
  });
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
    // Emotion: the scene's visual.mood shifts rate/pitch/volume (explicit scene.rate/pitch win).
    const { rate: sceneRate, pitch: scenePitch, volume: sceneVolume } = voiceForScene(
      scene.visual?.mood, { rate, pitch }, { rate: scene.rate, pitch: scene.pitch, volume: scene.volume },
    );
    const spoken: string = scene.ttsText || scene.text;
    const hash = sceneHash(spoken, sceneVoice, sceneRate, scenePitch, sceneVolume);

    const wordsPath = segmentPath.replace(/\.mp3$/, ".words.json");
    const cached = !force && cache[segmentName] === hash && fs.existsSync(segmentPath) && fs.existsSync(wordsPath);
    if (cached) {
      console.log(`  -> Scene ${i}: ${scene.id} (cached)`);
    } else {
      console.log(`  -> Scene ${i}: ${scene.id} (voice: ${sceneVoice}, ${scene.visual?.mood ?? "neutral"}: ${sceneRate} ${scenePitch} ${sceneVolume})`);
      await retry(`TTS for ${scene.id}`, 3, () =>
        synthesize(spoken, sceneVoice, sceneRate, scenePitch, sceneVolume, segmentPath),
      );
      cache[segmentName] = hash;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2)); // persist progress per scene
      generated++;
    }

    const actualDurationSec = probeDuration(segmentPath);
    const pause = Math.max(0, Number(scene.pauseBefore) || 0);
    const pauseAfter = Math.max(0, Number(scene.pauseAfter) || 0);
    const durationFrames = Math.ceil((actualDurationSec + pause + pauseAfter) * fps);

    scene.duration = actualDurationSec; // speech only; pauseBefore/pauseAfter are added on top
    scene.startFrame = currentStartFrame;
    scene.durationFrames = durationFrames;
    scene.audioFile = segmentName;
    try {
      scene.words = JSON.parse(fs.readFileSync(wordsPath, "utf-8")) as WordTiming[];
    } catch {
      delete scene.words; // renderer falls back to estimated word timings
    }

    currentStartFrame += durationFrames;
    totalDurationSec += actualDurationSec + pause + pauseAfter;

    console.log(`     ${actualDurationSec.toFixed(2)}s (${durationFrames} frames)`);
  }

  // Drop stale segments from removed/renamed scenes so they can't leak into merges.
  const keep = new Set(data.scenes.map((s: any) => s.audioFile));
  for (const f of fs.readdirSync(outDir)) {
    if (/^segment_.*\.mp3$/.test(f) && !keep.has(f)) {
      fs.rmSync(path.join(outDir, f.replace(/\.mp3$/, ".words.json")), { force: true });
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
