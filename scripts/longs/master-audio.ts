#!/usr/bin/env tsx
/**
 * Final loudness master for a rendered video: the video stream is copied untouched, the audio is gently compressed (so quiet
 * scenes stay audible on a phone speaker and loud ones do not jump out) and normalised to -16 LUFS with a true peak under
 * -1.5 dBFS and a loudness range of about 7 LU. Two passes, so the gain is linear and nothing pumps.
 *
 * Usage: tsx scripts/longs/master-audio.ts <in.mp4> [out.mp4]      (no out = replace the input)
 */
import * as fs from "fs";
import * as path from "path";
import { fail, run } from "./util";

export const TARGET_LUFS = -16;
export const TARGET_TP = -1.5;
export const TARGET_LRA = 7;

/** Rumble filter + a gentle compressor: evens out the quiet beds and the loud hits before normalising. */
const CHAIN = "highpass=f=30,acompressor=threshold=-26dB:ratio=3:attack=20:release=300:makeup=3";

interface Measured { input_i: string; input_tp: string; input_lra: string; input_thresh: string; target_offset: string }

export function measureLoudness(file: string): Measured | undefined {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `${CHAIN},loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json`, "-f", "null", "-"]);
  const json = /\{[\s\S]*"target_offset"[\s\S]*?\}/.exec(r.stderr)?.[0];
  if (!json) return undefined;
  const m = JSON.parse(json) as Measured;
  return Number.isFinite(parseFloat(m.input_i)) ? m : undefined; // "-inf" = silent file
}

/** Masters `file` into `out` (default: in place). Returns false when the audio could not be measured (silent). */
export function masterAudio(file: string, out = file): boolean {
  const m = measureLoudness(file);
  if (!m) return false;
  const tmp = path.join(path.dirname(out), `.master-${path.basename(out)}`);
  const af = `${CHAIN},loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,alimiter=limit=0.7:level=0,aresample=44100`;
  const r = run("ffmpeg", ["-y", "-v", "error", "-i", file, "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp]);
  if (r.status !== 0 || !fs.existsSync(tmp)) {
    fs.rmSync(tmp, { force: true });
    fail(`Audio mastering failed:\n${r.stderr.split("\n").slice(-6).join("\n")}`);
  }
  fs.renameSync(tmp, out);
  return true;
}

if (process.argv[1]?.endsWith("master-audio.ts")) {
  const [input, output] = process.argv.slice(2);
  if (!input) fail("Usage: tsx scripts/longs/master-audio.ts <in.mp4> [out.mp4]");
  const before = measureLoudness(input);
  console.log(masterAudio(input, output ?? input) ? `✅ mastered ${output ?? input} (was ${before?.input_i} LUFS, range ${before?.input_lra} LU → ${TARGET_LUFS} LUFS)` : "⚠ no measurable audio, left as is");
}
