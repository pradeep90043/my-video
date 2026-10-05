import { spawnSync } from "child_process";

export const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;

export function ff(args: string[]): void {
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...args], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}
