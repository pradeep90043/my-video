#!/usr/bin/env tsx
/**
 * CodeOrCap AI Video Factory — CLI entry point
 *
 * Usage:
 *   npm run generate                           # auto topic, full pipeline
 *   npm run generate -- --topic "React 19"    # specific topic
 *   npm run generate -- --category TypeScript  # specific category
 *   npm run generate -- --skip-images          # skip image generation
 *   npm run generate -- --skip-voice           # skip TTS
 *   npm run generate -- --skip-render          # assets only, no Remotion render
 */

import ora from "ora";
import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true } as any);

import { MODELS } from "../shared/config";
import { runPipeline } from "../shared/pipeline";
import type { Category } from "../shared/config";

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("topic", { type: "string" })
    .option("category", { type: "string" })
    .option("skip-images", { type: "boolean", default: false })
    .option("skip-voice", { type: "boolean", default: false })
    .option("skip-render", { type: "boolean", default: false })
    .help()
    .parse();

  console.log(chalk.bgYellow.black.bold("\n ⚡ CodeOrCap AI Video Factory "));
  console.log(chalk.dim(`  LLM: ${MODELS.llm}  |  Voice: ${MODELS.voiceProvider}\n`));

  // Using a box so the closure can reassign across callbacks
  const sp = { current: null as ReturnType<typeof ora> | null };

  const result = await runPipeline({
    topic: argv.topic,
    category: argv.category as Category | undefined,
    skipImages: argv["skip-images"],
    skipVoice: argv["skip-voice"],
    skipRender: argv["skip-render"],

    onStep: (_n, _total, label) => {
      sp.current?.stop();
      sp.current = ora(label + "...").start();
    },
    onStepDone: (detail) => {
      sp.current?.succeed(chalk.dim(detail));
      sp.current = null;
    },
    onWarn: (detail) => {
      sp.current?.warn(chalk.yellow(detail));
      sp.current = null;
    },
    onLog: (msg) => {
      sp.current?.stop();
      console.log(chalk.dim("  " + msg));
    },
  });

  sp.current?.stop();

  console.log(chalk.green.bold("\n✅ Video Factory Complete!\n"));
  console.log(chalk.bold("  Title:    ") + result.title);
  console.log(chalk.bold("  Slug:     ") + result.slug);
  console.log(chalk.bold("  JSON:     ") + result.jsonPath);
  if (result.videoPath) console.log(chalk.bold("  Video:    ") + result.videoPath);
  if (result.thumbnailPath) console.log(chalk.bold("  Thumb:    ") + result.thumbnailPath);

  console.log(chalk.bgBlue.white.bold("\n ═══ YOUTUBE METADATA ═══ "));
  console.log(chalk.bold("\nTITLE:\n") + result.metadata.title);
  console.log(chalk.bold("\nDESCRIPTION:\n") + result.metadata.description);
  console.log(chalk.bold("\nHASHTAGS:\n") + result.metadata.hashtags.join(" "));
  console.log();
}

main().catch((e) => {
  console.error(chalk.red("\n✖ Fatal:"), e.message);
  process.exit(1);
});
