#!/usr/bin/env tsx
/**
 * Long-form pipeline — full run: TTS → merge → render.
 *
 * Usage:
 *   npm run longform -- --project AivsSWE
 *   npm run longform -- --project AivsSWE --skip-audio   (script unchanged, just re-render)
 */

import { execSync } from "child_process";
import { resolveProject } from "./lib";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const slug = resolveProject(getArg("project"));
const skipAudio = process.argv.includes("--skip-audio");

const steps: [string, string][] = [
  ...(skipAudio
    ? []
    : ([
        ["Generating per-scene TTS", `tsx scripts/longform/generate-audio.ts --project ${slug}`],
        ["Merging voiceover", `tsx scripts/longform/merge-audio.ts --project ${slug}`],
      ] as [string, string][])),
  ["Rendering video", `tsx scripts/longform/render.ts --project ${slug}`],
];

steps.forEach(([label, cmd], i) => {
  console.log(`\n━━━ Step ${i + 1}/${steps.length}: ${label} ━━━`);
  execSync(cmd, { stdio: "inherit" });
});
