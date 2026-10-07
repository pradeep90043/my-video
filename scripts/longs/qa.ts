#!/usr/bin/env tsx
/**
 * Long-form pipeline — final QA gate on the rendered mp4.
 *
 * Fails (exit 1) on: unreadable file, wrong resolution/fps/codec/pixel format,
 * missing or silent audio, duration far from the timeline. Warns on loudness
 * outside the YouTube-friendly range and on black stretches.
 *
 * Usage: npm run longform:qa -- --project AivsSWE [--file out/custom.mp4]
 */

import * as path from "path";
import { loadVideoJson, resolveProject } from "./lib";
import { fail, getArg, run } from "./util";

export interface QaResult {
  errors: string[];
  warnings: string[];
}

export function qaVideo(file: string, opts: { width: number; height: number; fps: number; expectedSecs?: number }): QaResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const probe = run("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]);
  if (probe.status !== 0) return { errors: [`ffprobe cannot read ${file}: ${probe.stderr.trim()}`], warnings };

  const info = JSON.parse(probe.stdout);
  const video = info.streams.find((s: any) => s.codec_type === "video");
  const audio = info.streams.find((s: any) => s.codec_type === "audio");
  const duration = parseFloat(info.format.duration);

  if (!video) errors.push("no video stream");
  else {
    if (video.width !== opts.width || video.height !== opts.height)
      errors.push(`resolution ${video.width}x${video.height}, expected ${opts.width}x${opts.height}`);
    const [n, d] = String(video.avg_frame_rate).split("/").map(Number);
    const fps = d ? n / d : n;
    if (Math.abs(fps - opts.fps) > 0.01) errors.push(`frame rate ${fps.toFixed(3)}, expected ${opts.fps}`);
    if (video.codec_name !== "h264") errors.push(`video codec ${video.codec_name}, expected h264`);
    if (video.pix_fmt !== "yuv420p") errors.push(`pixel format ${video.pix_fmt}, expected yuv420p (not playable everywhere)`);
  }

  if (!audio) errors.push("no audio stream");

  if (opts.expectedSecs !== undefined && Math.abs(duration - opts.expectedSecs) > 1.5) {
    errors.push(`duration ${duration.toFixed(1)}s, timeline expects ${opts.expectedSecs.toFixed(1)}s`);
  }

  if (audio) {
    // Integrated loudness + silence detection in a single audio-only pass.
    const loud = run("ffmpeg", ["-nostats", "-i", file, "-vn", "-af", "loudnorm=print_format=json,silencedetect=n=-50dB:d=3", "-f", "null", "-"]);
    const m = loud.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/);
    if (m) {
      const lufs = parseFloat(JSON.parse(m[0]).input_i);
      if (!Number.isFinite(lufs) || lufs < -40) errors.push(`audio is effectively silent (${lufs} LUFS)`);
      else if (lufs < -20 || lufs > -11) warnings.push(`integrated loudness ${lufs.toFixed(1)} LUFS (target ≈ -16)`);
    }
    const silences = (loud.stderr.match(/silence_start/g) ?? []).length;
    if (silences) warnings.push(`${silences} silent stretch(es) ≥ 3s in the audio`);
  }

  if (video) {
    const black = run("ffmpeg", ["-nostats", "-i", file, "-an", "-vf", "blackdetect=d=1:pix_th=0.05", "-f", "null", "-"]);
    const blacks = (black.stderr.match(/black_start/g) ?? []).length;
    if (blacks) warnings.push(`${blacks} black stretch(es) ≥ 1s in the video`);
  }

  return { errors, warnings };
}

export function reportQa(file: string, r: QaResult): boolean {
  r.warnings.forEach((w) => console.warn(`   ⚠ ${w}`));
  r.errors.forEach((e) => console.error(`   ✗ ${e}`));
  if (r.errors.length) return false;
  console.log(`   ✓ QA passed: ${path.basename(file)}${r.warnings.length ? ` (${r.warnings.length} warning(s))` : ""}`);
  return true;
}

if (require.main === module) {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);
  const file = path.resolve(getArg("file") ?? path.join("out", `${slug}.mp4`));
  console.log(`🔎 [${slug}] QA ${file}`);
  const ok = reportQa(
    file,
    qaVideo(file, { width: 1920, height: 1080, fps: data.fps, expectedSecs: data.totalFrames ? data.totalFrames / data.fps : undefined }),
  );
  if (!ok) fail("QA failed — do not publish this render.");
}
