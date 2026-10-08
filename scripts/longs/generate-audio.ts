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
import { spawn } from "child_process";
import {
  audioDir,
  loadVideoJson,
  resolveProject,
  saveVideoJson,
  validateEdgeTtsSettings,
  validateVideoJson,
} from "./lib";
import { voiceForScene } from "./emotions";
import { fail, getArg, hasFlag, probeDuration, retry } from "./util";

const MIN_SEGMENT_SECS = 0.3;

type Cache = Record<string, string>;

function sceneHash(text: string, voice: string, rate: string, pitch: string, volume: string): string {
  const parts = [text, voice, rate, pitch];
  if (volume !== "+0%") parts.push(volume); // keeps pre-emotion cache entries valid
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

/** One edge-tts call, non-blocking so several scenes can be generated at once. `--opt=value` form: values such as "-5%" or text starting with "-" would otherwise be parsed as flags. */
function synthesizeAsync(text: string, voice: string, rate: string, pitch: string, volume: string, outPath: string): Promise<void> {
  const tmp = `${outPath}.part.mp3`;
  return new Promise<void>((resolve, reject) => {
    const p = spawn(
      "edge-tts",
      [`--voice=${voice}`, `--rate=${rate}`, `--pitch=${pitch}`, `--volume=${volume}`, `--text=${text}`, `--write-media=${tmp}`],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    p.stderr.on("data", (d) => { err += String(d); });
    const timer = setTimeout(() => p.kill("SIGKILL"), 180_000);
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        fs.rmSync(tmp, { force: true });
        return reject(new Error(`edge-tts exit ${code}: ${err.trim().split("\n").pop()}`));
      }
      const dur = probeDuration(tmp);
      if (dur < MIN_SEGMENT_SECS) {
        fs.rmSync(tmp, { force: true });
        return reject(new Error(`generated audio is only ${dur.toFixed(2)}s — TTS likely returned nothing`));
      }
      fs.renameSync(tmp, outPath);
      resolve();
    });
  });
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

  let generated = 0;
  // Pass 1: work out what each scene needs, then synthesise the missing ones in parallel
  // (edge-tts is network bound: 6 at a time cut ~260 s to ~50 s for a 116-scene video).
  const plan = (data.scenes as any[]).map((scene: any, i: number) => {
    const segmentName = `segment_${i}_${scene.id}.mp3`;
    const segmentPath = path.join(outDir, segmentName);
    const sceneVoice = scene.voice || voice;
    // Emotion: the scene's visual.mood shifts rate/pitch/volume (explicit scene.rate/pitch win).
    const { rate: sceneRate, pitch: scenePitch, volume: sceneVolume } = voiceForScene(
      scene.visual?.mood, { rate, pitch }, { rate: scene.rate, pitch: scene.pitch, volume: scene.volume },
    );
    const spoken: string = scene.ttsText || scene.text;
    const hash = sceneHash(spoken, sceneVoice, sceneRate, scenePitch, sceneVolume);
    const cached = !force && cache[segmentName] === hash && fs.existsSync(segmentPath);
    return { scene, i, segmentName, segmentPath, sceneVoice, sceneRate, scenePitch, sceneVolume, spoken, hash, cached };
  });
  const todo = plan.filter((x) => !x.cached);
  const limit = Math.max(1, Number(process.env.TTS_CONCURRENCY) || 6);
  let nextTask = 0;
  await Promise.all(Array.from({ length: Math.min(limit, todo.length) }, async () => {
    for (;;) {
      const t = todo[nextTask++];
      if (!t) return;
      console.log(`  -> Scene ${t.i}: ${t.scene.id} (voice: ${t.sceneVoice}, ${t.scene.visual?.mood ?? "neutral"}: ${t.sceneRate} ${t.scenePitch} ${t.sceneVolume})`);
      // edge-tts sometimes answers "NoAudioReceived" for a particular rate/pitch combo or just under load:
      // two tries with the scene's emotion, then fall back to the neutral prosody so one scene can never kill a 100+ scene render
      await retry(`TTS for ${t.scene.id}`, 6, (attempt) =>
        attempt <= 2
          ? synthesizeAsync(t.spoken, t.sceneVoice, t.sceneRate, t.scenePitch, t.sceneVolume, t.segmentPath)
          : synthesizeAsync(t.spoken, t.sceneVoice, rate, pitch, "+0%", t.segmentPath),
      );
      cache[t.segmentName] = t.hash;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2)); // persist progress per scene
      generated++;
    }
  }));

  // Pass 2: timeline, in scene order
  let currentStartFrame = 0;
  let totalDurationSec = 0;
  for (const t of plan) {
    const { scene, segmentName, segmentPath } = t;
    if (t.cached) console.log(`  -> Scene ${t.i}: ${scene.id} (cached)`);
    const actualDurationSec = probeDuration(segmentPath);
    const pause = Math.max(0, Number(scene.pauseBefore) || 0);
    const durationFrames = Math.ceil((actualDurationSec + pause) * fps);

    scene.duration = actualDurationSec; // speech only; pauseBefore is added on top
    scene.startFrame = currentStartFrame;
    scene.durationFrames = durationFrames;
    scene.audioFile = segmentName;

    currentStartFrame += durationFrames;
    totalDurationSec += actualDurationSec + pause;

    console.log(`     ${scene.id}: ${actualDurationSec.toFixed(2)}s (${durationFrames} frames)`);
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
