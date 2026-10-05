#!/usr/bin/env tsx
/**
 * Long-form pipeline — step 3: render the final YouTube video.
 *
 * Renders the project's Remotion composition (audio is played inside the
 * composition, so no ffmpeg merge is needed), applies the logo overlay, then
 * runs the QA gate. Output is written atomically: a failed render never
 * replaces a previous good file.
 *
 * Usage:
 *   npm run longform:render -- --project AivsSWE
 *   npm run longform:render -- --project AivsSWE --concurrency 4 --out out/custom.mp4 [--no-branding]
 *   npm run longform:render -- --project AivsSWE --resolution 1080     (default is 720 → 1280x720)
 *   npm run longform:render -- --project AivsSWE --draft                (fast 640x360 review render, no logo)
 */

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { loadVideoJson, resolveProject } from "./lib";
import { addBranding } from "../shared/branding";
import { fail, getArg, hasFlag } from "./util";
import { qaVideo, reportQa } from "./qa";
import { writeStamp } from "../shared/qa-stamp";

function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);

  const compositionId = data.composition ?? slug;
  // Template projects share one generic composition that loads the project by slug.
  const templateProps = (data as any).template === "stickman" ? JSON.stringify({ project: slug }) : undefined;
  const concurrency = getArg("concurrency") ?? "2";

  // Compositions are authored at 1920x1080; Remotion's --scale renders them smaller.
  const draft = hasFlag("draft");
  const resolution = draft ? "360" : (getArg("resolution") ?? "720");
  if (!["360", "720", "1080"].includes(resolution)) fail("--resolution must be 720 or 1080");
  const outHeight = Number(resolution);
  const outWidth = (outHeight * 16) / 9;
  const scale = outHeight / 1080;

  const outDir = path.join(process.cwd(), "out");
  fs.mkdirSync(outDir, { recursive: true });
  const finalPath = getArg("out")
    ? path.resolve(process.cwd(), getArg("out")!)
    : path.join(outDir, `${slug}${draft ? "-draft" : ""}.mp4`);
  const workPath = finalPath.replace(/\.mp4$/, ".rendering.mp4");

  const voiceoverPath = path.join(process.cwd(), "public", "content", slug, "audio", "voiceover.mp3");
  if (!fs.existsSync(voiceoverPath)) {
    fail(
      `No voiceover at public/content/${slug}/audio/voiceover.mp3 — run: ` +
        `npm run longform:audio -- --project ${slug} && npm run longform:merge -- --project ${slug}`,
    );
  }

  const mins = ((data.totalDuration ?? 0) / 60).toFixed(1);
  console.log(`🎬 [${slug}] Rendering composition "${compositionId}" at ${outWidth}x${outHeight} (~${mins} min)…`);

  const args = [
    "remotion", "render", compositionId, workPath,
    `--concurrency=${concurrency}`,
    `--scale=${scale}`, "--codec=h264", `--crf=${draft ? 28 : 16}`, "--pixel-format=yuv420p",
  ];
  const propsArg = getArg("props") ?? templateProps;
  if (propsArg) args.push(`--props=${propsArg}`);

  fs.rmSync(workPath, { force: true });
  const r = spawnSync("npx", args, { stdio: "inherit", cwd: process.cwd() });
  if (r.status !== 0 || !fs.existsSync(workPath)) {
    fs.rmSync(workPath, { force: true });
    fail(`Remotion render failed (exit ${r.status}).`);
  }

  // Always runs: besides the logo it converts Remotion's full-range yuvj420p to broadcast yuv420p.
  if (!addBranding(workPath, { skipLogo: draft || hasFlag("no-branding") })) {
    fs.rmSync(workPath, { force: true });
    fail("Final encode/branding failed — refusing to output an unfinished video. Re-run, or pass --no-branding to skip the logo.");
  }

  console.log("🔎 Running QA…");
  const qa = qaVideo(workPath, {
    width: outWidth,
    height: outHeight,
    fps: data.fps,
    expectedSecs: data.totalFrames ? data.totalFrames / data.fps : undefined,
  });
  if (!reportQa(workPath, qa)) {
    const rejected = finalPath.replace(/\.mp4$/, ".FAILED-QA.mp4");
    fs.renameSync(workPath, rejected);
    fail(`QA failed. Render kept for inspection at ${rejected}`);
  }

  fs.renameSync(workPath, finalPath);
  writeStamp(finalPath, { draft, width: outWidth, height: outHeight, warnings: qa.warnings });
  const sizeMb = (fs.statSync(finalPath).size / (1024 * 1024)).toFixed(1);
  if (draft) {
    console.log(`\n✅ Draft ready → ${finalPath} (${sizeMb} MB) — review only, cannot be published.\n`);
  } else {
    console.log(`\n✅ YouTube video ready → ${finalPath} (${sizeMb} MB)`);
    console.log(`   Preview the upload (nothing is sent):`);
    console.log(`   \x1b[36mnpm run publish -- --channel codeorcap --file "${path.relative(process.cwd(), finalPath)}" --dry-run\x1b[0m\n`);
  }
}

main();
