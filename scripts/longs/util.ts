/**
 * Small shared helpers for the long-form pipeline: CLI args, binary
 * resolution, safe process spawning (no shell), ffprobe, retry.
 */

import * as fs from "fs";
import { spawnSync } from "child_process";

export function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

export function hasBinary(name: string): boolean {
  const r = spawnSync(name, ["-version"], { stdio: "ignore" });
  if (r.error) {
    // edge-tts has no -version; fall back to --help
    return spawnSync(name, ["--help"], { stdio: "ignore" }).error === undefined;
  }
  return true;
}

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Run a command without a shell. Never throws; inspect `status`. */
export function run(cmd: string, args: string[], timeoutMs = 600_000): RunResult {
  const r = spawnSync(cmd, args, {
    encoding: "utf-8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    status: r.error ? -1 : r.status,
    stdout: r.stdout ?? "",
    stderr: (r.stderr ?? "") + (r.error ? String(r.error) : ""),
  };
}

export function probeDuration(file: string): number {
  const r = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    file,
  ]);
  const d = parseFloat(r.stdout.trim());
  if (r.status !== 0 || !Number.isFinite(d)) {
    throw new Error(`ffprobe could not read duration of ${file}: ${r.stderr.trim()}`);
  }
  return d;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry an async op with linear backoff. */
export async function retry<T>(
  label: string,
  attempts: number,
  fn: (attempt: number) => Promise<T> | T,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`     ⚠ ${label} failed (attempt ${i}/${attempts}): ${msg}`);
      if (i < attempts) await sleep(2000 * i);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function freeDiskGb(dir: string): number | null {
  try {
    const s = fs.statfsSync(dir);
    return (s.bavail * s.bsize) / 1024 ** 3;
  } catch {
    return null;
  }
}
