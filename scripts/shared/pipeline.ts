/**
 * Core pipeline — all 13 generation steps as a single callable function.
 * Used by both the CLI (generate-video.ts) and the HTTP server (server.ts).
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ quiet: true } as any);

import { PATHS, MODELS, type Category } from "./config";
import { GeminiProvider } from "./providers/GeminiProvider";
import { ClaudeProvider } from "./providers/ClaudeProvider";
import { ClaudeCLIProvider } from "./providers/ClaudeCLIProvider";
import { ElevenLabsProvider } from "./providers/ElevenLabsProvider";
import { GoogleTTSProvider } from "./providers/GoogleTTSProvider";
import { MacTTSProvider } from "./providers/MacTTSProvider";
import { EdgeTTSProvider } from "./providers/EdgeTTSProvider";
import { GeminiImageProvider } from "./providers/GeminiImageProvider";
import { TopicAgent } from "./agents/TopicAgent";
import { ScriptAgent } from "./agents/ScriptAgent";
import { ScenePlanner } from "./agents/ScenePlanner";
import { ImagePromptAgent } from "./agents/ImagePromptAgent";
import { ImageGenerator } from "./agents/ImageGenerator";
import { VoiceAgent } from "./agents/VoiceAgent";
import { SubtitleAgent } from "./agents/SubtitleAgent";
import { ThumbnailAgent } from "./agents/ThumbnailAgent";
import { MetadataAgent } from "./agents/MetadataAgent";
import { RenderAgent } from "./agents/RenderAgent";
import type { FactoryVideoJSON, VideoMetadata, WordTiming } from "./types";
import type { LLMProvider, VoiceProvider } from "./providers/LLMProvider";

// ── Options & Result ──────────────────────────────────────────────────────────

export interface PipelineOptions {
  topic?: string;
  category?: Category;
  skipImages?: boolean;
  skipVoice?: boolean;
  skipRender?: boolean;
  onStep?: (step: number, total: number, label: string) => void;
  onStepDone?: (detail: string) => void;
  onWarn?: (detail: string) => void;
  onLog?: (message: string) => void;
}

export interface PipelineResult {
  videoId: string;
  slug: string;
  title: string;
  duration: number;
  jsonPath: string;
  videoPath: string;
  thumbnailPath: string;
  metadata: VideoMetadata;
  wordTimings: WordTiming[];
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDirs(): void {
  Object.values(PATHS).forEach((p) => {
    if (typeof p === "string") fs.mkdirSync(p, { recursive: true });
  });
}

function buildLLM(): LLMProvider {
  if (MODELS.llm === "claude-cli") return new ClaudeCLIProvider();
  if (MODELS.llm === "claude") return new ClaudeProvider(process.env.ANTHROPIC_API_KEY ?? "");
  return new GeminiProvider(process.env.GEMINI_API_KEY ?? "");
}

function buildVoiceProvider(): VoiceProvider {
  if (MODELS.voiceProvider === "edge-tts") return new EdgeTTSProvider();
  if (MODELS.voiceProvider === "mac-tts") return new MacTTSProvider();
  if (MODELS.voiceProvider === "google-tts") return new GoogleTTSProvider(process.env.GOOGLE_TTS_API_KEY ?? "");
  return new ElevenLabsProvider(process.env.ELEVENLABS_API_KEY ?? "");
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runPipeline(opts: PipelineOptions = {}): Promise<PipelineResult> {
  const {
    topic: inputTopic,
    category: inputCategory,
    skipImages = false,
    skipVoice = false,
    skipRender = false,
    onStep = () => {},
    onStepDone = () => {},
    onWarn = () => {},
    onLog = () => {},
  } = opts;

  ensureDirs();

  const TOTAL = 13;
  const videoId = uuidv4().split("-")[0];

  onLog(`Video ID: ${videoId} | LLM: ${MODELS.llm} | Voice: ${MODELS.voiceProvider}`);

  // ── Providers ───────────────────────────────────────────────────────────────
  const llm = buildLLM();
  const voiceProvider = buildVoiceProvider();
  // Image provider only instantiated when images are needed (requires GEMINI_API_KEY)
  const imageProvider = skipImages ? null : new GeminiImageProvider(process.env.GEMINI_API_KEY ?? "");

  // ── Agents ──────────────────────────────────────────────────────────────────
  const topicAgent = new TopicAgent(llm);
  const scriptAgent = new ScriptAgent(llm);
  const scenePlanner = new ScenePlanner(llm);
  const promptAgent = new ImagePromptAgent(llm);
  const imageGen = imageProvider ? new ImageGenerator(imageProvider) : null;
  const voiceAgent = new VoiceAgent(voiceProvider);
  const subtitleAgent = new SubtitleAgent();
  const thumbAgent = imageProvider ? new ThumbnailAgent(llm, imageProvider) : null;
  const metaAgent = new MetadataAgent(llm);
  const renderAgent = new RenderAgent();

  // ── 1. Topic ────────────────────────────────────────────────────────────────
  onStep(1, TOTAL, "Generating topic");
  const topicResult = inputTopic
    ? { topic: inputTopic, category: inputCategory ?? ("Programming" as Category), hook: "", viralScore: 8 }
    : await topicAgent.generate(inputCategory);
  onStepDone(`${topicResult.topic} [${topicResult.category}]`);

  // ── 2. Script ───────────────────────────────────────────────────────────────
  onStep(2, TOTAL, "Writing script");
  const script = await scriptAgent.generate(topicResult.topic, topicResult.category);
  onStepDone(`${script.durationSecs}s script ready`);

  // ── 3. Scene plan ───────────────────────────────────────────────────────────
  onStep(3, TOTAL, "Planning scenes");
  const rawScenes = await scenePlanner.plan(script);
  onStepDone(`${rawScenes.length} scenes`);

  // ── 4. Image prompts ────────────────────────────────────────────────────────
  onStep(4, TOTAL, "Enhancing image prompts");
  const scenesWithPrompts = await promptAgent.enhanceAll(rawScenes, topicResult.topic);
  onStepDone("prompts enhanced");

  // ── 5. Images ───────────────────────────────────────────────────────────────
  onStep(5, TOTAL, "Generating images");
  let scenes = scenesWithPrompts;
  if (!skipImages && imageGen) {
    const count = scenes.filter((s) => s.background === "image").length;
    scenes = await imageGen.generateAll(scenesWithPrompts, videoId);
    onStepDone(`${count} images generated`);
  } else {
    onLog("Images skipped");
  }

  // ── 6. Voice ────────────────────────────────────────────────────────────────
  onStep(6, TOTAL, "Generating narration");
  let voicePath = "";
  let voiceDuration = script.durationSecs;
  let narration = "";
  if (!skipVoice) {
    const voice = await voiceAgent.generate(script, videoId);
    voicePath = voice.path;
    voiceDuration = voice.durationSecs;
    narration = voice.narration;
    onStepDone(`${voiceDuration.toFixed(1)}s voiceover`);
  } else {
    narration = [script.hook, script.body, script.cta].join(" ").trim();
    onLog("Voice skipped");
  }

  // ── 7. Subtitles ────────────────────────────────────────────────────────────
  onStep(7, TOTAL, "Generating subtitles");
  const { srtPath: subtitlePath } = subtitleAgent.generate(scenes, videoId);
  let wordTimings: WordTiming[] = [];
  if (narration) {
    const wl = subtitleAgent.generateWordLevel(narration, voiceDuration, videoId);
    wordTimings = wl.timings;
  }
  onStepDone(`${wordTimings.length} word timings`);

  // ── 8. Metadata ─────────────────────────────────────────────────────────────
  onStep(8, TOTAL, "Generating metadata");
  const metadata = await metaAgent.generate(script);
  onStepDone(metadata.title);

  // ── 9. Thumbnail ────────────────────────────────────────────────────────────
  onStep(9, TOTAL, "Generating thumbnail");
  let thumbnailPath = "";
  if (!skipImages && thumbAgent) {
    try {
      thumbnailPath = await thumbAgent.generate(script, metadata, videoId);
      onStepDone(thumbnailPath);
    } catch (e: any) {
      onWarn(`Thumbnail skipped: ${e.message}`);
    }
  } else {
    onLog("Thumbnail skipped");
  }

  // ── 10. Video JSON ──────────────────────────────────────────────────────────
  onStep(10, TOTAL, "Assembling video JSON");
  const videoJSON: FactoryVideoJSON = {
    id: videoId,
    title: metadata.title,
    script,
    voice: voicePath,
    thumbnail: thumbnailPath,
    duration: voiceDuration,
    scenes,
    subtitlePath,
    wordTimings,
    musicTrack: "",
    metadata,
    createdAt: new Date().toISOString(),
  };
  const jsonPath = path.join(PATHS.json, `${metadata.slug}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(videoJSON, null, 2));
  onStepDone(jsonPath);

  // ── 11. Script file ─────────────────────────────────────────────────────────
  onStep(11, TOTAL, "Saving script");
  const scriptMd = [`# ${topicResult.topic}`, "", "## Hook", script.hook, "", "## Body", script.body, "", "## CTA", script.cta].join("\n");
  const scriptPath = path.join(PATHS.scripts, `${metadata.slug}.md`);
  fs.writeFileSync(scriptPath, scriptMd);
  onStepDone(scriptPath);

  // ── 12. Metadata file ───────────────────────────────────────────────────────
  onStep(12, TOTAL, "Saving metadata");
  const metaPath = path.join(PATHS.metadata, `${metadata.slug}.json`);
  fs.writeFileSync(metaPath, JSON.stringify({ ...metadata, videoId, createdAt: videoJSON.createdAt }, null, 2));
  onStepDone(metaPath);

  // ── 13. Render ──────────────────────────────────────────────────────────────
  onStep(13, TOTAL, "Rendering video");
  let finalVideoPath = "";
  if (!skipRender) {
    finalVideoPath = await renderAgent.render(videoJSON);
    onStepDone(finalVideoPath);
  } else {
    onLog("Render skipped");
  }

  return {
    videoId,
    slug: metadata.slug,
    title: metadata.title,
    duration: voiceDuration,
    jsonPath,
    videoPath: finalVideoPath,
    thumbnailPath,
    metadata,
    wordTimings,
    createdAt: videoJSON.createdAt,
  };
}
