#!/usr/bin/env tsx
/**
 * Long-form pipeline — one command: preflight → TTS → [images] → merge → render+QA.
 *
 * Usage:
 *   npm run longform -- --project AivsSWE
 *   npm run longform -- --project AivsSWE --skip-audio    (script unchanged, just re-render)
 *   npm run longform -- --project AivsSWE --images        (also generate scene images, free Pollinations)
 *   npm run longform -- --project AivsSWE --from merge    (resume: audio | images | merge | render)
 *
 * Each run writes a JSON summary (step timings, status) to out/logs/.
 */

import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { resolveProject } from "./lib";
import { fail, getArg, hasFlag } from "./util";
import { preflight } from "./preflight";

const slug = resolveProject(getArg("project"));
const forwarded = ["--project", slug];
if (hasFlag("force")) forwarded.push("--force");

type Step = { name: string; script: string; extra?: string[] };
const ALL: Step[] = [
  { name: "audio", script: "generate-audio.ts" },
  ...(hasFlag("images")
    ? [{ name: "images", script: "generate-images.ts", extra: ["--provider", getArg("image-provider") ?? "pollinations"] }]
    : []),
  { name: "merge", script: "merge-audio.ts" },
  { name: "assets", script: "fetch-assets.ts" },
  { name: "render", script: "render.ts", extra: hasFlag("no-branding") ? ["--no-branding"] : [] },
];

const from = getArg("from");
if (from && !ALL.some((s) => s.name === from)) {
  fail(`--from must be one of: ${ALL.map((s) => s.name).join(", ")}`);
}
let steps = from ? ALL.slice(ALL.findIndex((s) => s.name === from)) : ALL;
if (hasFlag("skip-audio")) steps = steps.filter((s) => s.name !== "audio" && s.name !== "merge");

const needsTts = steps.some((s) => s.name === "audio");
const problems = preflight(slug, { needsTts });
if (problems.length) fail(`Preflight failed for "${slug}":\n  - ${problems.join("\n  - ")}`);

const summary: { step: string; status: string; seconds: number }[] = [];
const started = new Date();

function writeSummary(status: "ok" | "failed") {
  const dir = path.join(process.cwd(), "out", "logs");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}-${started.toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify({ slug, status, started, steps: summary }, null, 2));
}

steps.forEach((step, i) => {
  console.log(`\n━━━ Step ${i + 1}/${steps.length}: ${step.name} ━━━`);
  const t0 = Date.now();
  const r = spawnSync("tsx", [path.join("scripts", "longs", step.script), ...forwarded, ...(step.extra ?? [])], {
    stdio: "inherit",
  });
  const seconds = Math.round((Date.now() - t0) / 1000);
  summary.push({ step: step.name, status: r.status === 0 ? "ok" : "failed", seconds });
  if (r.status !== 0) {
    writeSummary("failed");
    fail(`Step "${step.name}" failed. Fix the error above, then resume with: npm run longform -- --project ${slug} --from ${step.name}`);
  }
});

writeSummary("ok");
console.log(`\n🏁 Done in ${summary.reduce((a, s) => a + s.seconds, 0)}s: ${summary.map((s) => `${s.step} ${s.seconds}s`).join(", ")}`);
