#!/usr/bin/env tsx
/**
 * Contact sheet for checking staging: a few stills per shot (start, middle, end by default) tiled into one image, one row per shot.
 *
 *   tsx scripts/film/stills.ts --project my-film [--at 0.15,0.5,0.9] [--shots 0,3] [--scale 0.33]
 * Output: out/preview/<slug>-stills.jpg
 */
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";

const args = process.argv.slice(2);
const opt = (n: string, d?: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const slug = opt("project")!;
const at = opt("at", "0.15,0.5,0.9")!.split(",").map(Number);
const scale = Number(opt("scale", "0.33"));
const data = JSON.parse(fs.readFileSync(path.join("public/content", slug, "video.json"), "utf8"));
const only = opt("shots")?.split(",").map(Number);

(async () => {
  const outDir = path.join("out/preview", `${slug}-stills`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(process.cwd(), "src/index.ts"), webpackOverride: enableTailwind });
  const inputProps = { project: slug };
  const composition = await selectComposition({ serveUrl, id: "StickmanVideo", inputProps });
  let n = 0;
  const scenes = data.scenes.filter((_: unknown, i: number) => !only || only.includes(i));
  for (const s of scenes) {
    for (const p of at) {
      const frame = Math.min(composition.durationInFrames - 1, s.startFrame + Math.round((s.durationFrames - 1) * p));
      await renderStill({ composition, serveUrl, inputProps, frame, scale, imageFormat: "jpeg", jpegQuality: 82, output: path.join(outDir, `f_${String(n++).padStart(4, "0")}.jpg`) });
    }
  }
  const sheet = path.join("out/preview", `${slug}-stills.jpg`);
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-framerate", "1", "-i", path.join(outDir, "f_%04d.jpg"), "-vf", `tile=${at.length}x${scenes.length}:padding=6:margin=6:color=0x808080`, "-frames:v", "1", "-q:v", "3", sheet]);
  if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
  console.log(`✓ ${sheet}`);
})();
