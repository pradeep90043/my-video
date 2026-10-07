#!/usr/bin/env tsx
/**
 * Long-form pipeline — step 2: merge scene segments into one voiceover.
 *
 * Builds public/content/<slug>/audio/voiceover.mp3 — the track the Remotion
 * composition plays. Each segment is padded with silence to exactly its
 * scene's durationFrames/fps so the audio timeline matches the visual
 * timeline frame-for-frame (plain concat drifts by up to 1 frame per scene).
 * The result is loudness-normalized to -16 LUFS (YouTube-friendly).
 *
 * Usage: npm run longform:merge -- --project AivsSWE
 */

import * as fs from "fs";
import * as path from "path";
import { audioDir, loadVideoJson, resolveProject } from "./lib";
import { fail, getArg, probeDuration, run } from "./util";

const TARGET_LUFS = -16;

function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);
  const dir = audioDir(slug);

  console.log(`🔗 [${slug}] Merging ${data.scenes.length} audio segments…`);

  const missing = data.scenes.filter(
    (s) => !s.audioFile || !fs.existsSync(path.join(dir, s.audioFile)),
  );
  if (missing.length) {
    fail(
      `Missing segments for scenes: ${missing.map((s) => s.id).join(", ")}\n` +
        `  Run first: npm run longform:audio -- --project ${slug}`,
    );
  }
  if (data.scenes.some((s) => !s.durationFrames)) {
    fail(`Scene timings missing in video.json — run: npm run longform:audio -- --project ${slug}`);
  }

  const inputs: string[] = [];
  const filters: string[] = [];
  data.scenes.forEach((s, i) => {
    inputs.push("-i", path.join(dir, s.audioFile!));
    const target = (s.durationFrames! / data.fps).toFixed(6);
    const lead = Math.round(((s as any).pauseBefore ?? 0) * 1000);
    const delay = lead > 0 ? `adelay=${lead}|${lead},` : "";
    filters.push(`[${i}:a]aresample=44100,aformat=channel_layouts=stereo,${delay}apad=whole_dur=${target}[a${i}]`);
  });
  const labels = data.scenes.map((_, i) => `[a${i}]`).join("");
  const graph =
    `${filters.join(";")};${labels}concat=n=${data.scenes.length}:v=0:a=1,` +
    `loudnorm=I=${TARGET_LUFS}:TP=-1.5:LRA=11[out]`;

  const outputPath = path.join(dir, "voiceover.mp3");
  const tmpPath = path.join(dir, "voiceover.part.mp3");
  const r = run("ffmpeg", [
    "-y", ...inputs,
    "-filter_complex", graph,
    "-map", "[out]",
    "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100",
    tmpPath,
  ]);
  if (r.status !== 0) {
    fs.rmSync(tmpPath, { force: true });
    fail(`ffmpeg merge failed:\n${r.stderr.split("\n").slice(-8).join("\n")}`);
  }

  const expected = data.totalFrames! / data.fps;
  const actual = probeDuration(tmpPath);
  // loudnorm + mp3 framing add a little padding; more than 0.25s means something is wrong.
  if (Math.abs(actual - expected) > 0.25) {
    fs.rmSync(tmpPath, { force: true });
    fail(`Merged voiceover is ${actual.toFixed(2)}s but timeline expects ${expected.toFixed(2)}s.`);
  }

  fs.renameSync(tmpPath, outputPath);
  console.log(
    `✅ [${slug}] Voiceover ready → public/content/${slug}/audio/voiceover.mp3 ` +
      `(${actual.toFixed(1)}s, ${TARGET_LUFS} LUFS)`,
  );
}

main();
