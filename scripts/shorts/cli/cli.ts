#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import prompts from "prompts";
import ora from "ora";
import chalk from "chalk";
import * as dotenv from "dotenv";
import {
  generateAiImage,
  generateCodeOrCapContent,
  generateCodeOrCapContentViaClaude,
  generateEdgeTTSAudio,
  generateGoogleTTSAudio,
  generateMacTTSAudio,
  generateVoice,
  getGenerateImageDescriptionPrompt,
  getGenerateStoryPrompt,
  openaiStructuredCompletion,
  setApiKey,
  type HiInVoice,
} from "./service";
import {
  ContentItemWithDetails,
  StoryMetadataWithDetails,
  StoryScript,
  StoryWithImages,
  Timeline,
} from "../../../src/shared/lib/types";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { createTimeLineFromStoryWithDetails } from "./timeline";

dotenv.config({ quiet: true });

interface GenerateOptions {
  apiKey?: string;
  elevenlabsApiKey?: string;
  title?: string;
  topic?: string;
  paid?: boolean;
}

class ContentFS {
  title: string;
  slug: string;

  constructor(title: string) {
    this.title = title;
    this.slug = this.getSlug();
  }

  saveDescriptor(descriptor: StoryMetadataWithDetails) {
    const dirPath = this.getDir();
    const filePath = path.join(dirPath, "descriptor.json");
    fs.writeFileSync(filePath, JSON.stringify(descriptor, null, 2));
  }

  saveTimeline(timeline: Timeline) {
    const dirPath = this.getDir();
    const filePath = path.join(dirPath, "timeline.json");
    fs.writeFileSync(filePath, JSON.stringify(timeline, null, 2));
  }

  getDir(dir?: string): string {
    const segments = ["public", "content", this.slug];
    if (dir) {
      segments.push(dir);
    }
    const p = path.join(process.cwd(), ...segments);
    fs.mkdirSync(p, { recursive: true });
    return p;
  }

  getImagePath(uid: string): string {
    const dirPath = this.getDir("images");
    return path.join(dirPath, uid.includes(".") ? uid : `${uid}.png`);
  }

  getAudioPath(uid: string): string {
    const dirPath = this.getDir("audio");
    return path.join(dirPath, uid.includes(".") ? uid : `${uid}.mp3`);
  }

  getSlug(): string {
    return this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

const estimateTimings = (text: string, durationMs: number) => {
  const characters = Array.from(text);
  const characterStartTimesSeconds: number[] = [];
  const characterEndTimesSeconds: number[] = [];
  const perCharSeconds = durationMs / 1000 / Math.max(characters.length, 1);

  for (let i = 0; i < characters.length; i++) {
    characterStartTimesSeconds.push(i * perCharSeconds);
    characterEndTimesSeconds.push((i + 1) * perCharSeconds);
  }

  return {
    characters,
    characterStartTimesSeconds,
    characterEndTimesSeconds,
  };
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildTechReelSegments = (title: string, topic: string) => {
  const cleanTopic = topic.trim() || "AI tools";
  return [
    `${cleanTopic} is moving from demos into daily work.`,
    "Small teams now automate research, drafts, support, and analysis.",
    "The real shift is not the model. It is the workflow around it.",
    "Better prompts, cleaner data, and faster review loops compound quickly.",
    "Winners will ship useful systems before the hype cycle cools.",
    `Watch ${title.trim()} become a practical advantage, not just a headline.`,
  ];
};

const buildSvgBackground = ({
  title,
  topic,
  index,
}: {
  title: string;
  topic: string;
  index: number;
}) => {
  const palettes = [
    ["#07111f", "#0f766e", "#f8fafc", "#22d3ee"],
    ["#111827", "#7c3aed", "#f9fafb", "#f59e0b"],
    ["#06131a", "#2563eb", "#ecfeff", "#34d399"],
    ["#18181b", "#be123c", "#fafafa", "#facc15"],
    ["#0f172a", "#4f46e5", "#f8fafc", "#fb7185"],
    ["#101828", "#16a34a", "#ffffff", "#38bdf8"],
  ];
  const [bg, accent, text, signal] = palettes[index % palettes.length];
  const escapedTitle = escapeXml(title.toUpperCase());
  const escapedTopic = escapeXml(topic.toUpperCase());
  const yOffset = 180 + index * 28;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1792" viewBox="0 0 1024 1792">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0H0V64" fill="none" stroke="${text}" stroke-opacity="0.07" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="1024" height="1792" fill="url(#bg)"/>
  <rect width="1024" height="1792" fill="url(#grid)"/>
  <circle cx="${180 + index * 92}" cy="${280 + index * 74}" r="210" fill="${accent}" opacity="0.28"/>
  <circle cx="${820 - index * 88}" cy="${1120 - index * 50}" r="260" fill="${signal}" opacity="0.2"/>
  <path d="M120 ${yOffset} C 320 ${yOffset + 140}, 520 ${yOffset - 80}, 904 ${yOffset + 70}" fill="none" stroke="${signal}" stroke-width="10" stroke-linecap="round" opacity="0.85"/>
  <path d="M132 1280 H892" stroke="${text}" stroke-opacity="0.2" stroke-width="4"/>
  <g fill="none" stroke="${text}" stroke-opacity="0.22" stroke-width="3">
    <rect x="160" y="610" width="704" height="420" rx="28"/>
    <path d="M208 710H816M208 810H680M208 910H760"/>
  </g>
  <g fill="${signal}" opacity="0.9">
    <circle cx="224" cy="716" r="10"/>
    <circle cx="224" cy="816" r="10"/>
    <circle cx="224" cy="916" r="10"/>
  </g>
  <text x="96" y="1180" fill="${text}" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="800" letter-spacing="0">${escapedTopic}</text>
  <text x="96" y="1270" fill="${text}" fill-opacity="0.7" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" letter-spacing="0">${escapedTitle}</text>
  <text x="96" y="1518" fill="${signal}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="0">FRAME ${String(index + 1).padStart(2, "0")}</text>
</svg>`;
};

const createFreeTimeline = (storyWithDetails: StoryMetadataWithDetails) => {
  const timeline: Timeline = {
    elements: [],
    text: [],
    audio: [],
    shortTitle: storyWithDetails.shortTitle,
  };

  const segmentMs = 5000;
  let durationMs = 0;

  for (let i = 0; i < storyWithDetails.content.length; i++) {
    const content = storyWithDetails.content[i];

    timeline.elements.push({
      startMs: durationMs,
      endMs: durationMs + segmentMs,
      imageUrl: content.uid,
      enterTransition: "blur",
      exitTransition: "blur",
      animations: [
        {
          type: "scale",
          from: i % 2 === 0 ? 1.2 : 1,
          to: i % 2 === 0 ? 1 : 1.2,
          startMs: 0,
          endMs: segmentMs,
        },
      ],
    });

    const phrases = content.text.match(/.{1,26}(?:\s|$)/g) || [content.text];
    const phraseMs = segmentMs / phrases.length;

    for (let j = 0; j < phrases.length; j++) {
      timeline.text.push({
        startMs: durationMs + Math.round(j * phraseMs),
        endMs: durationMs + Math.round((j + 1) * phraseMs),
        text: phrases[j].trim(),
        position: "center",
        animations: [
          {
            type: "scale",
            from: 0.82,
            to: 1,
            startMs: 0,
            endMs: 300,
          },
        ],
      });
    }

    durationMs += segmentMs;
  }

  return timeline;
};

async function generateFreeStory(options: GenerateOptions) {
  let { title, topic } = options;

  if (!title || !topic) {
    const response = await prompts([
      {
        type: "text",
        name: "title",
        message: "Title of the reel:",
        initial: title || "AI Tech Reel",
        validate: (value) => value.length > 0 || "Title is required",
      },
      {
        type: "text",
        name: "topic",
        message: "Topic of the reel:",
        initial: topic || "AI technology",
        validate: (value) => value.length > 0 || "Topic is required",
      },
    ]);

    if (!response.title || !response.topic) {
      console.log(chalk.red("Title and topic are required. Exiting..."));
      process.exit(1);
    }

    title = response.title;
    topic = response.topic;
  }

  const contentFs = new ContentFS(title!);
  const segments = buildTechReelSegments(title!, topic!);
  const storyWithDetails: StoryMetadataWithDetails = {
    shortTitle: title!,
    content: [],
  };

  const spinner = ora("Generating free local reel assets...").start();

  for (let i = 0; i < segments.length; i++) {
    const uid = `free-${String(i + 1).padStart(2, "0")}.svg`;
    const text = segments[i];
    fs.writeFileSync(
      contentFs.getImagePath(uid),
      buildSvgBackground({ title: title!, topic: topic!, index: i }),
    );

    storyWithDetails.content.push({
      text,
      imageDescription: `Procedural tech visual for: ${text}`,
      uid,
      audioTimestamps: estimateTimings(text, 5000),
    });
  }

  contentFs.saveDescriptor(storyWithDetails);
  contentFs.saveTimeline(createFreeTimeline(storyWithDetails));
  spinner.succeed(chalk.green("Free local reel generated!"));

  console.log(chalk.green.bold("\nFree reel generation complete.\n"));
  console.log("No OpenAI or ElevenLabs API calls were made.");
  console.log("Run " + chalk.blue("npm run dev") + " to preview the reel");
}

async function generatePaidStory(options: GenerateOptions) {
  try {
    let apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    let elevenlabsApiKey =
      options.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      const response = await prompts({
        type: "password",
        name: "apiKey",
        message: "Enter your OpenAI API key:",
        validate: (value) => value.length > 0 || "API key is required",
      });

      if (!response.apiKey) {
        console.log(chalk.red("API key is required. Exiting..."));
        process.exit(1);
      }

      apiKey = response.apiKey;
    }

    if (!elevenlabsApiKey) {
      const response = await prompts({
        type: "password",
        name: "elevenlabsApiKey",
        message: "Enter your ElevenLabs API key:",
        validate: (value) =>
          value.length > 0 || "ElevenLabs API key is required",
      });

      if (!response.elevenlabsApiKey) {
        console.log(chalk.red("API key is required. Exiting..."));
        process.exit(1);
      }

      elevenlabsApiKey = response.elevenlabsApiKey;
    }

    let { title, topic } = options;

    if (!title || !topic) {
      const response = await prompts([
        {
          type: "text",
          name: "title",
          message: "Title of the story:",
          initial: title,
          validate: (value) => value.length > 0 || "Title is required",
        },
        {
          type: "text",
          name: "topic",
          message: "Topic of the story:",
          initial: topic,
          validate: (value) => value.length > 0 || "Topic is required",
        },
      ]);

      if (!response.title || !response.topic) {
        console.log(chalk.red("Title and topic are required. Exiting..."));
        process.exit(1);
      }

      title = response.title;
      topic = response.topic;
    }

    console.log(chalk.blue(`\n📖 Creating story: "${title}"`));
    console.log(chalk.blue(`📝 Topic: ${topic}\n`));

    const storyWithDetails: StoryMetadataWithDetails = {
      shortTitle: title!,
      content: [],
    };

    const storySpinner = ora("Generating story...").start();
    setApiKey(apiKey!);
    const storyRes = await openaiStructuredCompletion(
      getGenerateStoryPrompt(title!, topic!),
      StoryScript,
    );
    storySpinner.succeed(chalk.green("Story generated!"));

    const descriptionsSpinner = ora("Generating image descriptions...").start();
    const storyWithImagesRes = await openaiStructuredCompletion(
      getGenerateImageDescriptionPrompt(storyRes.text),
      StoryWithImages,
    );
    descriptionsSpinner.succeed(chalk.green("Image descriptions generated!"));

    for (const item of storyWithImagesRes.result) {
      const contentWithDetails: ContentItemWithDetails = {
        text: item.text,
        imageDescription: item.imageDescription,
        uid: uuidv4(),
        audioTimestamps: {
          characters: [],
          characterStartTimesSeconds: [],
          characterEndTimesSeconds: [],
        },
      };

      storyWithDetails.content.push(contentWithDetails);
    }

    const contentFs = new ContentFS(title!);
    contentFs.saveDescriptor(storyWithDetails);

    const imagesSpinner = ora("Generating images and voice...").start();
    for (let i = 0; i < storyWithDetails.content.length; i++) {
      const storyItem = storyWithDetails.content[i];
      imagesSpinner.text = `[${i * 2 + 1}/${storyWithDetails.content.length * 2}] Generating image for ${storyItem.text}`;
      await generateAiImage({
        prompt: storyItem.imageDescription,
        path: contentFs.getImagePath(storyItem.uid),
        onRetry: (attempt) => {
          imagesSpinner.text = `[${i * 2 + 1}/${storyWithDetails.content.length * 2}] Generating image for ${storyItem.text} (retry ${attempt + 1})`;
        },
      });
      imagesSpinner.text = `[${i * 2 + 2}/${storyWithDetails.content.length * 2}] Generating voice for ${storyItem.text}`;
      const timings = await generateVoice(
        storyItem.text,
        elevenlabsApiKey!,
        contentFs.getAudioPath(storyItem.uid),
      );
      storyItem.audioTimestamps = timings;
    }
    contentFs.saveDescriptor(storyWithDetails);
    imagesSpinner.succeed(chalk.green("Images generated!"));

    const finalSpinner = ora("Generating final result...").start();
    const timeline = createTimeLineFromStoryWithDetails(storyWithDetails);
    contentFs.saveTimeline(timeline);
    finalSpinner.succeed(chalk.green("Final result generated!"));

    console.log(chalk.green.bold("\n✨ Story generation complete!\n"));
    console.log("Run " + chalk.blue("npm run dev") + " to preview the story");

    return {};
  } catch (error) {
    console.error(chalk.red("\n❌ Error:"), error);
    process.exit(1);
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const VERDICT_DISPLAY_MAP: Record<string, string> = {
  CODE: "CODE",
  CAP: "CAP",
  MIXED: "PARTIALLY TRUE",
};

const CODEORCAP_DIR = () =>
  path.join(process.cwd(), "public", "content", "codeorcap");

const CODEORCAP_AUDIO_PATH = () =>
  path.join(CODEORCAP_DIR(), "audio", "voiceover.mp3");

const CODEORCAP_VOICEOVER_STATIC = "content/codeorcap/audio/voiceover.mp3";

async function runTTS(voiceover: string, ttsKey: string, voice: HiInVoice) {
  const audioPath = CODEORCAP_AUDIO_PATH();
  const spinner = ora(
    chalk.cyan(`Generating hi-IN voiceover via Google TTS (${voice})…`),
  ).start();
  try {
    await generateGoogleTTSAudio(voiceover, ttsKey, audioPath, voice);
    spinner.succeed(chalk.green("Voiceover generated!"));
  } catch (err) {
    spinner.warn(chalk.yellow("Google TTS failed — trying edge-tts (Microsoft Neural)…"));
    try {
      await generateEdgeTTSAudio(voiceover, audioPath);
      spinner.succeed(chalk.green("Voiceover generated via edge-tts (hi-IN-SwaraNeural)!"));
    } catch (edgeErr) {
      spinner.warn(chalk.yellow("edge-tts failed — falling back to macOS say…"));
      try {
        await generateMacTTSAudio(voiceover, audioPath);
        spinner.succeed(chalk.green("Voiceover generated via macOS say!"));
      } catch (sayErr) {
        spinner.fail(chalk.red("All TTS options failed"));
        throw sayErr;
      }
    }
  }

  // Patch input.json to include the voiceoverTrack so Remotion picks it up
  const inputPath = path.join(CODEORCAP_DIR(), "input.json");
  if (fs.existsSync(inputPath)) {
    const current = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    current.voiceoverTrack = CODEORCAP_VOICEOVER_STATIC;
    fs.writeFileSync(inputPath, JSON.stringify(current, null, 2));
  }

  console.log(
    "  " + chalk.blue("public/content/codeorcap/audio/voiceover.mp3") + " ← ready",
  );
  console.log(
    "  " + chalk.blue("input.json") + " patched with voiceoverTrack",
  );
}

async function generateCodeOrCap(
  geminiApiKey: string,
  topic?: string,
  ttsKey?: string,
  voice: HiInVoice = "hi-IN-Neural2-A",
) {
  let resolvedTopic = topic;

  if (!resolvedTopic) {
    const response = await prompts({
      type: "text",
      name: "topic",
      message: "Tech myth topic (e.g. MERN Stack Is Outdated):",
      validate: (v) => v.length > 0 || "Topic is required",
    });
    if (!response.topic) {
      console.log(chalk.red("Topic is required. Exiting..."));
      process.exit(1);
    }
    resolvedTopic = response.topic;
  }

  const spinner = ora(
    chalk.cyan(`Generating CodeOrCap content for: "${resolvedTopic}"…`),
  ).start();

  let content;
  try {
    content = await generateCodeOrCapContent(resolvedTopic!, geminiApiKey);
    spinner.succeed(chalk.green("Content generated by Gemini!"));
  } catch (geminiErr) {
    spinner.warn(chalk.yellow("Gemini failed — falling back to Claude…"));
    const claudeKey =
      process.env.ANTHROPIC_API_KEY;
    if (!claudeKey) {
      spinner.fail(chalk.red("No ANTHROPIC_API_KEY found for Claude fallback"));
      throw geminiErr;
    }
    try {
      content = await generateCodeOrCapContentViaClaude(resolvedTopic!, claudeKey);
      spinner.succeed(chalk.green("Content generated by Claude!"));
    } catch (claudeErr) {
      spinner.fail(chalk.red("Claude generation also failed"));
      throw claudeErr;
    }
  }

  // ── Print full output ────────────────────────────────────────────────────
  console.log("\n" + chalk.yellow.bold("═══ CODEORCAP CONTENT ═══"));
  console.log(chalk.bold("Claim:      ") + content.claim);
  console.log(chalk.bold("Verdict:    ") + content.verdict + "  Rating: " + content.rating);
  console.log(chalk.bold("Winner:     ") + content.winner);
  console.log(chalk.bold("\nHook:\n") + chalk.cyan(content.hook));
  console.log(chalk.bold("\nEvidence:"));
  content.evidence.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  console.log(chalk.bold("\nVoiceover:\n") + chalk.cyan(content.voiceover));
  console.log(chalk.bold("\nCaption:\n") + content.caption);
  console.log(chalk.bold("\nHashtags:\n") + content.hashtags.join("  "));
  console.log(chalk.bold("\nYouTube Title:\n") + content.youtube_title);
  console.log(chalk.bold("\nYouTube Description:\n") + content.youtube_description);
  console.log(chalk.bold("\nPinned Comment:\n") + chalk.cyan(content.pinned_comment));
  console.log(chalk.yellow.bold("═════════════════════════") + "\n");

  // ── Build Remotion-ready input.json ──────────────────────────────────────
  const outDir = CODEORCAP_DIR();
  fs.mkdirSync(outDir, { recursive: true });

  const inputJson: Record<string, unknown> = {
    claim: content.claim,
    verdict: VERDICT_DISPLAY_MAP[content.verdict] ?? content.verdict,
    rating: content.rating,
    winner: content.winner,
    hook: content.hook,
    evidence: content.evidence,
    handle: "@codeorcap",
  };

  fs.writeFileSync(
    path.join(outDir, "input.json"),
    JSON.stringify(inputJson, null, 2),
  );

  // ── Save full metadata ───────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(outDir, "metadata.json"),
    JSON.stringify(
      { topic: resolvedTopic, generatedAt: new Date().toISOString(), ...content },
      null,
      2,
    ),
  );

  console.log(chalk.green.bold("✅ Files saved:"));
  console.log("  " + chalk.blue("public/content/codeorcap/input.json") + "  ← Remotion props");
  console.log("  " + chalk.blue("public/content/codeorcap/metadata.json") + " ← Full content");

  // ── Optional inline TTS ──────────────────────────────────────────────────
  if (ttsKey) {
    await runTTS(content.voiceover, ttsKey, voice);
  } else {
    console.log(
      "\nTip: add " +
        chalk.yellow("--tts") +
        " with your Google TTS key to generate the voiceover now.",
    );
  }

  console.log(
    "\nNext: " + chalk.yellow("npm run dev") + " → select CodeOrCap composition",
  );
}

// ─── Commands ─────────────────────────────────────────────────────────────────

yargs(hideBin(process.argv))
  .command(
    "codeorcap",
    "Generate a CodeOrCap reel using Gemini 1.5 Flash",
    (yargs) =>
      yargs
        .option("topic", {
          alias: "t",
          type: "string",
          description: "Tech myth topic (e.g. 'MERN Stack Is Outdated')",
        })
        .option("gemini-api-key", {
          alias: "g",
          type: "string",
          description: "Gemini API key (or set GEMINI_API_KEY env var)",
        })
        .option("tts", {
          type: "boolean",
          default: false,
          description: "Generate hi-IN voiceover via Google Cloud TTS after content",
        })
        .option("google-tts-key", {
          alias: "k",
          type: "string",
          description: "Google Cloud TTS API key (or set GOOGLE_TTS_API_KEY env var)",
        })
        .option("voice", {
          type: "string",
          default: "hi-IN-Neural2-A",
          description:
            "TTS voice: hi-IN-Neural2-A (female) | hi-IN-Neural2-B (male) | hi-IN-Neural2-C | hi-IN-Neural2-D | hi-IN-Wavenet-A | hi-IN-Wavenet-B",
        }),
    async (argv) => {
      const ttsOnly = argv.tts && !argv.topic;
      const voice = (argv.voice ?? "hi-IN-Neural2-A") as HiInVoice;

      // ── TTS-only mode: read voiceover from existing metadata.json ──────
      if (ttsOnly) {
        const metaPath = path.join(CODEORCAP_DIR(), "metadata.json");
        if (!fs.existsSync(metaPath)) {
          console.log(
            chalk.red(
              "No metadata.json found. Run `codeorcap --topic ...` first.",
            ),
          );
          process.exit(1);
        }
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        const voiceover: string = meta.voiceover;
        if (!voiceover) {
          console.log(chalk.red("metadata.json has no voiceover field."));
          process.exit(1);
        }

        let ttsKey =
          (argv["google-tts-key"] as string | undefined) ||
          process.env.GOOGLE_TTS_API_KEY;
        if (!ttsKey) {
          const r = await prompts({
            type: "password",
            name: "key",
            message: "Enter your Google Cloud TTS API key:",
            validate: (v) => v.length > 0 || "API key is required",
          });
          if (!r.key) { console.log(chalk.red("API key required.")); process.exit(1); }
          ttsKey = r.key;
        }

        console.log(chalk.bold("\nVoiceover script:\n") + chalk.cyan(voiceover) + "\n");
        await runTTS(voiceover, ttsKey!, voice);
        return;
      }

      // ── Full generate (+ optional TTS) ───────────────────────────────
      let geminiApiKey =
        (argv["gemini-api-key"] as string | undefined) ||
        process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        const r = await prompts({
          type: "password",
          name: "key",
          message: "Enter your Gemini API key:",
          validate: (v) => v.length > 0 || "API key is required",
        });
        if (!r.key) { console.log(chalk.red("API key required.")); process.exit(1); }
        geminiApiKey = r.key;
      }

      let ttsKey: string | undefined;
      if (argv.tts) {
        ttsKey =
          (argv["google-tts-key"] as string | undefined) ||
          process.env.GOOGLE_TTS_API_KEY;
        if (!ttsKey) {
          const r = await prompts({
            type: "password",
            name: "key",
            message: "Enter your Google Cloud TTS API key:",
            validate: (v) => v.length > 0 || "API key is required",
          });
          if (!r.key) { console.log(chalk.red("API key required.")); process.exit(1); }
          ttsKey = r.key;
        }
      }

      await generateCodeOrCap(geminiApiKey!, argv.topic, ttsKey, voice);
    },
  )
  .command(
    "generate",
    "Generate a free local reel for given title and topic",
    (yargs) => {
      return yargs
        .option("paid", {
          type: "boolean",
          default: false,
          description: "Use paid OpenAI and ElevenLabs generation",
        })
        .option("api-key", {
          alias: "k",
          type: "string",
          description: "OpenAI API key",
        })
        .option("title", {
          alias: "t",
          type: "string",
          description: "Title of the story",
        })
        .option("topic", {
          alias: "p",
          type: "string",
          description:
            "Topic of the story (e.g. Interesting Facts, History, etc.)",
        });
    },
    async (argv) => {
      const options = {
        apiKey: argv["api-key"],
        title: argv.title,
        topic: argv.topic,
        paid: argv.paid,
      };

      if (argv.paid) {
        await generatePaidStory(options);
      } else {
        await generateFreeStory(options);
      }
    },
  )
  .command(
    "paid",
    "Generate a paid AI story with OpenAI images and ElevenLabs voice",
    (yargs) => {
      return yargs
        .option("api-key", {
          alias: "k",
          type: "string",
          description: "OpenAI API key",
        })
        .option("title", {
          alias: "t",
          type: "string",
          description: "Title of the story",
        })
        .option("topic", {
          alias: "p",
          type: "string",
          description:
            "Topic of the story (e.g. Interesting Facts, History, etc.)",
        });
    },
    async (argv) => {
      await generatePaidStory({
        apiKey: argv["api-key"],
        title: argv.title,
        topic: argv.topic,
      });
    },
  )
  .command(
    "$0",
    "Generate a free local reel (default command)",
    (yargs) => {
      return yargs
        .option("paid", {
          type: "boolean",
          default: false,
          description: "Use paid OpenAI and ElevenLabs generation",
        })
        .option("api-key", {
          alias: "k",
          type: "string",
          description: "OpenAI API key",
        })
        .option("title", {
          alias: "t",
          type: "string",
          description: "Title of the story",
        })
        .option("topic", {
          alias: "p",
          type: "string",
          description:
            "Topic of the story (e.g. Interesting Facts, History, etc.)",
        });
    },
    async (argv) => {
      const options = {
        apiKey: argv["api-key"],
        title: argv.title,
        topic: argv.topic,
        paid: argv.paid,
      };

      if (argv.paid) {
        await generatePaidStory(options);
      } else {
        await generateFreeStory(options);
      }
    },
  )
  .demandCommand(0, 1)
  .help()
  .alias("help", "h")
  .version()
  .alias("version", "v")
  .strict()
  .parse();
