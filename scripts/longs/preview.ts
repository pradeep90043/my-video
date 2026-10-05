#!/usr/bin/env tsx
/**
 * Long-form pipeline — preview: one still per scene, tiled into a single
 * contact sheet. Lets you review layout, props and pacing in about a minute
 * instead of waiting for a full render.
 *
 * Needs scene timings, so run the audio step first.
 *
 * Usage: npm run longform:preview -- --project AivsSWE [--cols 3]
 * Output: out/preview/<slug>-contact.jpg (+ the individual frames)
 */

import * as fs from "fs";
import * as path from "path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";
import { loadVideoJson, resolveProject } from "./lib";
import { fail, getArg, run } from "./util";

async function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);
  const cols = Number(getArg("cols") ?? 3);

  if (data.scenes.some((s) => s.startFrame === undefined || !s.durationFrames)) {
    fail(`Scene timings missing — run: npm run longform:audio -- --project ${slug}`);
  }

  const isStickman = data.template === "stickman";
  const compositionId = isStickman ? "StickmanVideo" : (data.composition ?? slug);
  const inputProps = isStickman ? { project: slug } : {};

  const outDir = path.join(process.cwd(), "out", "preview", slug);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`🖼  [${slug}] Bundling…`);
  const serveUrl = await bundle({
    entryPoint: path.join(process.cwd(), "src", "index.ts"),
    webpackOverride: enableTailwind,
  });
  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps });

  console.log(`🖼  Rendering ${data.scenes.length} scene stills…`);
  for (let i = 0; i < data.scenes.length; i++) {
    const s = data.scenes[i];
    // 60% into the scene: entrance animations are finished, captions are mid-sentence.
    const frame = Math.min(composition.durationInFrames - 1, s.startFrame! + Math.round(s.durationFrames! * 0.6));
    await renderStill({
      composition,
      serveUrl,
      inputProps,
      frame,
      scale: 1 / 3,
      imageFormat: "jpeg",
      jpegQuality: 80,
      output: path.join(outDir, `scene_${String(i + 1).padStart(3, "0")}.jpg`),
    });
    const secs = (s.durationFrames! / data.fps).toFixed(1);
    console.log(`   ${String(i + 1).padStart(2)}. ${s.id.padEnd(14)} ${secs}s${Number(secs) > 8 ? "  ⚠ long — split it" : ""}`);
  }

  const rows = Math.ceil(data.scenes.length / cols);
  const sheet = path.join(process.cwd(), "out", "preview", `${slug}-contact.jpg`);
  const r = run("ffmpeg", [
    "-y", "-v", "error", "-framerate", "1", "-i", path.join(outDir, "scene_%03d.jpg"),
    "-vf", `tile=${cols}x${rows}:padding=10:margin=10:color=0x808080`,
    "-frames:v", "1", "-q:v", "3", sheet,
  ]);
  if (r.status !== 0) fail(`ffmpeg contact sheet failed: ${r.stderr}`);

  console.log(`\n✅ Contact sheet → ${path.relative(process.cwd(), sheet)}`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
