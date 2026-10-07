/**
 * Lip-sync data: per-video-frame mouth level (0 closed .. 1 wide open) derived
 * from the loudness of the final voiceover, so the stickman's mouth follows the
 * real speech (syllables, pauses) instead of a fixed flap.
 *
 * Written next to the voiceover as voiceover.env.json: { fps, levels: number[] }
 * where levels[i] belongs to video frame i (the voiceover starts at frame 0).
 */

import * as fs from "fs";
import { spawnSync } from "child_process";

const SAMPLE_RATE = 16000;
/** Anything quieter than this many dB below typical speech loudness counts as silence. */
const RANGE_DB = 28;

/** Pure: mono samples -> one mouth level per video frame. */
export function computeMouthLevels(samples: Float32Array, sampleRate: number, fps: number): number[] {
  const perFrame = sampleRate / fps;
  // integer maths first: 32000 / (16000 / 30) is 59.999… in floating point
  const frames = Math.floor((samples.length * fps) / sampleRate + 1e-6);
  const db: number[] = new Array(frames);
  for (let f = 0; f < frames; f++) {
    const start = Math.floor(f * perFrame);
    const end = Math.min(samples.length, Math.floor((f + 1) * perFrame));
    let sum = 0;
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    db[f] = 20 * Math.log10(Math.sqrt(sum / Math.max(1, end - start)) + 1e-6);
  }
  // reference = loud end of the *speech* (ignore digital silence), so levels are comparable between videos
  const voiced = db.filter((d) => d > -60).sort((a, b) => a - b);
  if (!voiced.length) return new Array(frames).fill(0);
  const ref = voiced[Math.floor(voiced.length * 0.92)];
  const raw = db.map((d) => Math.min(1, Math.max(0, (d - (ref - RANGE_DB)) / RANGE_DB)) ** 0.9);
  // fast attack, slower release: the mouth snaps open on a syllable and relaxes between them
  const out: number[] = new Array(frames);
  let prev = 0;
  for (let f = 0; f < frames; f++) {
    prev = Math.max(raw[f], prev * 0.55);
    out[f] = Math.round(prev * 100) / 100;
  }
  return out;
}

/** Decodes `audioPath` with ffmpeg and writes the envelope JSON. Returns the number of frames. */
export function writeMouthEnvelope(audioPath: string, outPath: string, fps: number): number {
  const r = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", audioPath, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "f32le", "-"],
    { maxBuffer: 1024 * 1024 * 1024 },
  );
  if (r.status !== 0 || !r.stdout?.length) throw new Error(`ffmpeg could not decode ${audioPath}: ${r.stderr?.toString().trim().split("\n").pop()}`);
  const buf = r.stdout as Buffer;
  const samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  const levels = computeMouthLevels(samples, SAMPLE_RATE, fps);
  const tmp = `${outPath}.part`;
  fs.writeFileSync(tmp, JSON.stringify({ fps, levels }));
  fs.renameSync(tmp, outPath);
  return levels.length;
}
