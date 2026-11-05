import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runPipeline } from "./pipeline";
import { PublishMode } from "./types";
import { Category } from "./config";

const argv = yargs(hideBin(process.argv))
  .option("channel", {
    type: "string",
    default: "codeorcap",
    description: "Channel ID (codeorcap, storiyum, infoonspot, promptgag)",
  })
  .option("mode", {
    type: "string",
    choices: ["day1-long", "day2-short"],
    default: "day1-long",
    description: "Publish Mode: Day 1 (10-min long) or Day 2 (short)",
  })
  .option("topic", { type: "string", description: "Manual topic override" })
  .option("category", { type: "string", description: "Category override" })
  .option("duration", { type: "number", description: "Target video duration in seconds (e.g. 120 for 2-min test)" })
  .option("skipImages", { type: "boolean", default: false, alias: "skip-images" })
  .option("skipVoice", { type: "boolean", default: false, alias: "skip-voice" })
  .option("skipRender", { type: "boolean", default: false, alias: "skip-render" })
  .option("skipQA", { type: "boolean", default: false, alias: "skip-qa" })
  .option("testFrames", {
    type: "number",
    alias: "test-frames",
    description: "Render preview frames only (e.g. 150 = 5s test of 1920x1080 video)",
  })
  .parseSync();

console.log("\n⚡ Starting Video Generation Pipeline...");
console.log(`   Channel: ${argv.channel} | Mode: ${argv.mode}\n`);

runPipeline({
  channel: argv.channel,
  publishMode: argv.mode as PublishMode,
  topic: argv.topic,
  category: argv.category as Category,
  duration: argv.duration,
  skipImages: argv.skipImages,
  skipVoice: argv.skipVoice,
  skipRender: argv.skipRender,
  skipQA: argv.skipQA,
  testFrames: argv.testFrames,
  onStep: (step, total, label) => console.log(`[${step}/${total}] ${label}...`),
  onStepDone: (detail) => console.log(`  ✓ ${detail}`),
  onLog: (msg) => console.log(`  ℹ ${msg}`),
  onWarn: (msg) => console.warn(`  ⚠ ${msg}`),
})
  .then((res) => {
    console.log("\n🚀 Pipeline finished successfully!");
    console.log(`   Video ID:   ${res.videoId}`);
    console.log(`   Title:      ${res.title}`);
    console.log(`   Duration:   ${res.duration.toFixed(1)}s`);
    console.log(`   Video Path: ${res.videoPath}`);
  })
  .catch((err) => {
    console.error("\n❌ Pipeline failed:", err.message || err);
    process.exit(1);
  });
