/**
 * Core pipeline — 2-day quality-first publishing cycle.
 *
 * Mode "day1-long"  → 10-min long-form video: TopicAgent → ScriptAgent(long) →
 *                     HookAgent(10 hooks) → ScriptQAAgent → render → publish
 * Mode "day2-short" → 30-60s Short: reuses Day 1 topic from topic-state.json →
 *                     ScriptAgent(short) → HookAgent → render → publish with link
 *
 * Used by both the CLI (generate-video.ts) and the HTTP server (server.ts).
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true } as any);
dotenv.config({ quiet: true } as any);

import { PATHS, MODELS, type Category } from "./config";
import { GeminiProvider } from "./providers/GeminiProvider";
import { ClaudeProvider } from "./providers/ClaudeProvider";
import { ClaudeCLIProvider } from "./providers/ClaudeCLIProvider";
import { OmniVoiceProvider } from "./providers/OmniVoiceProvider";
import { OpenAICompatibleProvider } from "./providers/OpenAICompatibleProvider";
import { FallbackLLMProvider } from "./providers/FallbackLLMProvider";
import { CompositeImageProvider } from "./providers/CompositeImageProvider";
import { TopicAgent } from "./agents/TopicAgent";
import { ScriptAgent } from "./agents/ScriptAgent";
import { HookAgent } from "./agents/HookAgent";
import { ScriptQAAgent } from "./agents/ScriptQAAgent";
import { FactCheckAgent } from "./agents/FactCheckAgent";
import { ScenePlanner } from "./agents/ScenePlanner";
import { ImagePromptAgent } from "./agents/ImagePromptAgent";
import { ImageGenerator } from "./agents/ImageGenerator";
import { VoiceAgent } from "./agents/VoiceAgent";
import { SubtitleAgent } from "./agents/SubtitleAgent";
import { ThumbnailAgent } from "./agents/ThumbnailAgent";
import { MetadataAgent } from "./agents/MetadataAgent";
import { RenderAgent } from "./agents/RenderAgent";
import { loadTopicState, getAdaptiveHookWeights } from "./topic-state";
import type { FactoryVideoJSON, VideoMetadata, WordTiming, PublishMode } from "./types";
import type { LLMProvider, VoiceProvider } from "./providers/LLMProvider";

// ── Options & Result ──────────────────────────────────────────────────────────

export interface PipelineOptions {
  /** Day 1 = long-form 10-min video. Day 2 = short with link. Default: "day1-long" */
  publishMode?: PublishMode;
  /** Channel identifier (codeorcap | storiyum | infoonspot | promptgag) */
  channel?: string;
  /** Override topic (skips TopicAgent) */
  topic?: string;
  category?: Category;
  skipImages?: boolean;
  skipVoice?: boolean;
  skipRender?: boolean;
  /** Skip ScriptQA gate (useful for testing) */
  skipQA?: boolean;
  /** Target duration in seconds (e.g. 120 for 2-min test, 600 for 10-min long video) */
  duration?: number;
  /** Limit render frames for test preview (e.g. 150 = 5s of 1920x1080 video) */
  testFrames?: number;
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
  publishMode: PublishMode;
  channel: string;
  /** Populated on Day 1 — the YouTube video ID after upload */
  longVideoId?: string;
  /** Populated on Day 2 — the Day 1 video URL that was linked */
  linkedVideoUrl?: string;
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

  const providers: LLMProvider[] = [];

  // FreeLLMAPI (running on dev runner with pre-configured keys)
  const freellmKey = process.env.FREELLMAPI_KEY;
  const freellmUrl = process.env.FREELLMAPI_URL || (freellmKey ? "http://freellmapi-dev:3001" : undefined);
  if (freellmKey && freellmUrl) {
    providers.push(
      new OpenAICompatibleProvider({
        baseUrl: `${freellmUrl.replace(/\/+$/, "")}/v1`,
        apiKey: freellmKey,
        model: "auto",
        name: "freellmapi",
      }),
    );
  }

  // Direct Gemini API
  if (process.env.GEMINI_API_KEY) {
    providers.push(new GeminiProvider(process.env.GEMINI_API_KEY));
  }

  // Groq
  if (process.env.GROQ_API_KEY) {
    providers.push(
      new OpenAICompatibleProvider({
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.3-70b-versatile",
        name: "groq",
      }),
    );
  }

  if (providers.length === 1) return providers[0];
  if (providers.length > 1) return new FallbackLLMProvider(providers);

  return new GeminiProvider(process.env.GEMINI_API_KEY ?? "");
}

/**
 * Voice provider — LOCKED to OmniVoice (Kaggle/Cloudflare tunnel).
 *
 * No fallback. If OMNI_VOICE_URL is not set or the tunnel is down,
 * the pipeline throws immediately and sends a Telegram alert.
 *
 * To use:  OMNI_VOICE_URL=https://xxxx.trycloudflare.com in .env
 *
 * Other providers (EdgeTTS, OpenAIFM, etc.) are intentionally NOT used —
 * quality is non-negotiable for all videos.
 */
function buildVoiceProvider(): VoiceProvider {
  return new OmniVoiceProvider();
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runPipeline(opts: PipelineOptions = {}): Promise<PipelineResult> {
  const {
    publishMode = "day1-long",
    channel = "codeorcap",
    topic: inputTopic,
    category: inputCategory,
    skipImages = false,
    skipVoice = false,
    skipRender = false,
    skipQA = false,
    duration: targetDuration,
    onStep = () => {},
    onStepDone = () => {},
    onWarn = () => {},
    onLog = () => {},
  } = opts;

  const isLongForm = publishMode === "day1-long";
  const scriptMode = isLongForm ? "long" : "short";

  ensureDirs();

  // For Day 2 short — load Day 1 state to get linked video URL
  let linkedVideoUrl: string | undefined;
  if (!isLongForm) {
    const state = loadTopicState(channel);
    if (!state) {
      throw new Error(`No Day 1 state found for channel "${channel}". Run Day 1 first.`);
    }
    if (!state.longVideoUrl) {
      throw new Error(`Day 1 video URL not found in state for channel "${channel}". Was Day 1 published successfully?`);
    }
    linkedVideoUrl = state.longVideoUrl;
    onLog(`Day 2 mode — linking to Day 1 video: ${linkedVideoUrl}`);
  }

  // Total steps: 15 for long, 13 for short
  const TOTAL = isLongForm ? 15 : 13;
  const videoId = uuidv4().split("-")[0];

  onLog(`Video ID: ${videoId} | Mode: ${publishMode} | Channel: ${channel} | LLM: ${MODELS.llm} | Voice: ${MODELS.voiceProvider}`);

  // ── Providers ───────────────────────────────────────────────────────────────
  const llm = buildLLM();
  const voiceProvider = skipVoice ? null : buildVoiceProvider();
  const imageProvider = skipImages ? null : new CompositeImageProvider();

  // ── Agents ──────────────────────────────────────────────────────────────────
  const topicAgent = new TopicAgent(llm);
  const scriptAgent = new ScriptAgent(llm);
  const hookAgent = new HookAgent(llm);
  const qaAgent = new ScriptQAAgent(llm);
  const factCheckAgent = new FactCheckAgent(llm);
  const scenePlanner = new ScenePlanner(llm);
  const promptAgent = new ImagePromptAgent(llm);
  const imageGen = imageProvider ? new ImageGenerator(imageProvider) : null;
  const voiceAgent = voiceProvider ? new VoiceAgent(voiceProvider) : null;
  const subtitleAgent = new SubtitleAgent();
  const thumbAgent = imageProvider ? new ThumbnailAgent(llm, imageProvider) : null;
  const metaAgent = new MetadataAgent(llm);
  const renderAgent = new RenderAgent();

  // ── 1. Topic ────────────────────────────────────────────────────────────────
  onStep(1, TOTAL, "Generating topic");
  let topicResult: { topic: string; category: Category; hook: string; viralScore: number };

  if (!isLongForm) {
    // Day 2 — reuse Day 1 topic from state
    const state = loadTopicState(channel)!;
    topicResult = {
      topic: state.currentTopic,
      category: state.currentCategory as Category,
      hook: "",
      viralScore: 10,
    };
    onStepDone(`Reusing Day 1 topic: ${topicResult.topic}`);
  } else if (inputTopic) {
    topicResult = { topic: inputTopic, category: inputCategory ?? ("Programming" as Category), hook: "", viralScore: 8 };
    onStepDone(`Manual topic: ${topicResult.topic} [${topicResult.category}]`);
  } else {
    topicResult = await topicAgent.generate(inputCategory);
    onStepDone(`${topicResult.topic} [${topicResult.category}] viralScore=${topicResult.viralScore}`);
  }

  // ── 2. Script (body first, hook blank — HookAgent fills it) ─────────────────
  onStep(2, TOTAL, `Writing ${scriptMode} script`);
  let script = await scriptAgent.generate(topicResult.topic, topicResult.category, scriptMode, linkedVideoUrl, targetDuration);
  onStepDone(`${script.durationSecs}s ${scriptMode} script ready`);

  // ── 3. Hook — 10 variants, best wins with adaptive analytics weights ───────
  onStep(3, TOTAL, "Generating 10 hook variants (picking best)");
  const hookWeights = getAdaptiveHookWeights(channel);
  const hookResult = await hookAgent.generate(script, hookWeights);
  const selectedHook = hookResult?.hook || script.hook || "क्या आप भी 2025 में यही गलती कर रहे हैं?";
  script = { ...script, hook: selectedHook };
  onStepDone(`Hook selected [score=${(hookResult?.score ?? 8).toFixed(1)}/10, style=${hookResult?.style ?? "curiosity"}]: "${selectedHook.slice(0, 60)}..."`);

  // ── 4. Script QA & Fact-Check Gates ─────────────────────────────────────────
  onStep(4, TOTAL, "Running script QA & fact check");
  if (!skipQA) {
    // 4a. Fact-checking layer
    const factResult = await factCheckAgent.verify(script);
    onLog(`Fact-check score: ${factResult.accuracyScore}/100 | Passed: ${factResult.passed}`);
    if (factResult.corrections && factResult.corrections.length > 0) {
      let updatedBody = script.body;
      for (const corr of factResult.corrections) {
        if (corr.original && corr.replacement && updatedBody.includes(corr.original)) {
          updatedBody = updatedBody.replace(corr.original, corr.replacement);
          onLog(`Fact correction applied: ${corr.reason}`);
        }
      }
      script = { ...script, body: updatedBody };
    }

    // 4b. QA Rubric evaluation
    let qaResult = await qaAgent.evaluate(script, scriptMode);
    onLog(`QA score: ${qaResult.score}/100 | Passed: ${qaResult.passed}`);

    if (!qaResult.passed) {
      const safeIssues = Array.isArray(qaResult.issues) ? qaResult.issues : [];
      let safeSections = Array.isArray(qaResult.rewriteSections) && qaResult.rewriteSections.length > 0
        ? qaResult.rewriteSections
        : (["hook", "body"] as ("hook" | "body" | "cta")[]);

      onWarn(`QA failed (score=${qaResult.score}). Issues: ${safeIssues.join("; ")}. Rewriting sections: ${safeSections.join(", ")}`);

      // Attempt up to 2 rewrites of failing sections
      for (let attempt = 1; attempt <= 2 && !qaResult.passed; attempt++) {
        safeSections = Array.isArray(qaResult.rewriteSections) && qaResult.rewriteSections.length > 0
          ? qaResult.rewriteSections
          : (["hook", "body"] as ("hook" | "body" | "cta")[]);
        onLog(`QA rewrite attempt ${attempt}/2 for sections: ${safeSections.join(", ")}`);

        if (safeSections.includes("hook")) {
          const newHook = await hookAgent.generate(script, hookWeights);
          script = { ...script, hook: newHook.hook };
          onLog(`Hook rewritten [score=${newHook.score.toFixed(1)}]`);
        }
        if (safeSections.includes("body") || safeSections.includes("cta")) {
          const rewritten = await scriptAgent.generate(topicResult.topic, topicResult.category, scriptMode, linkedVideoUrl);
          script = {
            ...script,
            body: safeSections.includes("body") ? rewritten.body : script.body,
            cta: safeSections.includes("cta") ? rewritten.cta : script.cta,
          };
        }

        qaResult = await qaAgent.evaluate(script, scriptMode);
        onLog(`QA score after rewrite ${attempt}: ${qaResult.score}/100`);
      }

      if (!qaResult.passed) {
        onWarn(`QA still failing after 2 rewrites (score=${qaResult.score}). Proceeding with best available.`);
      } else {
        onStepDone(`QA passed after rewrite (score=${qaResult.score}/100)`);
      }
    } else {
      onStepDone(`QA passed (score=${qaResult.score}/100)`);
    }
  } else {
    onLog("QA skipped (skipQA=true)");
  }

  // Generate metadata early to get slug for folder naming
  const metadata = await metaAgent.generate(script, {
    mode: scriptMode,
    linkedVideoUrl,
  });
  const slug = metadata.slug;
  const videoFolder = path.join(PATHS.public, "content", "factory", slug);
  const imagesFolder = path.join(videoFolder, "images");
  fs.mkdirSync(imagesFolder, { recursive: true });

  // ── 5. Scene plan ───────────────────────────────────────────────────────────
  onStep(5, TOTAL, "Planning scenes");
  const rawScenes = await scenePlanner.plan(script, scriptMode);
  onStepDone(`${rawScenes.length} scenes planned`);

  // ── 6. Image prompts (Cinematic lens optics) ────────────────────────────────
  onStep(6, TOTAL, "Enhancing image prompts");
  const scenesWithPrompts = await promptAgent.enhanceAll(rawScenes, topicResult.topic, scriptMode);
  onStepDone("prompts enhanced");

  // ── 7. Images ───────────────────────────────────────────────────────────────
  onStep(7, TOTAL, "Generating images");
  let scenes = scenesWithPrompts;
  if (!skipImages && imageGen) {
    const count = scenes.filter((s) => s.background === "image").length;
    scenes = await imageGen.generateAll(scenesWithPrompts, videoId, imagesFolder);
    onStepDone(`${count} images generated`);
  } else {
    onLog("Images skipped");
  }

  // ── 8. Voice ────────────────────────────────────────────────────────────────
  onStep(8, TOTAL, "Generating narration");
  let voicePath = "";
  let voiceDuration = script.durationSecs;
  let narration = "";
  if (!skipVoice && voiceAgent) {
    const voice = await voiceAgent.generate(script, videoId, videoFolder, scenes);
    voicePath = voice.path;
    voiceDuration = voice.durationSecs;
    narration = voice.narration;
    onStepDone(`${voiceDuration.toFixed(1)}s voiceover`);
  } else {
    narration = voiceAgent
      ? voiceAgent.buildNarration(script, scenes)
      : [script.hook, script.body, script.cta].join(" ").trim();
    onLog("Voice skipped");
  }
  onLog(`Voiceover text (${narration.length} chars): ${narration.slice(0, 50)}...`);

  // ── Synchronize Scene Durations to Match Spoken Audio ───────────────────────
  // When narration is generated, each scene's duration MUST match its spoken words
  // so scene transitions land precisely when the speaker moves to the next topic.
  if (voiceDuration > 0 && scenes.length > 0) {
    const sceneWordCounts = scenes.map((s) => {
      const text = (s.voiceText || s.subtitle || s.text || "").replace(/\[[^\]]+\]/g, "").trim();
      return Math.max(1, text.split(/\s+/).filter(Boolean).length);
    });
    const totalWords = sceneWordCounts.reduce((a, b) => a + b, 0);

    let runningSec = 0;
    scenes.forEach((s, idx) => {
      if (idx === scenes.length - 1) {
        // Last scene takes the remaining duration so the sum equals voiceDuration exactly
        s.duration = Math.max(2, Math.round((voiceDuration - runningSec) * 10) / 10);
      } else {
        const share = sceneWordCounts[idx] / totalWords;
        s.duration = Math.max(2, Math.round(share * voiceDuration * 10) / 10);
        runningSec += s.duration;
      }
    });

    const syncedTotal = scenes.reduce((sum, s) => sum + s.duration, 0);
    onLog(`  ✓ Synchronized ${scenes.length} scene durations to match ${voiceDuration.toFixed(1)}s voiceover (sum: ${syncedTotal.toFixed(1)}s)`);
  }

  // ── 9. Subtitles ────────────────────────────────────────────────────────────
  onStep(9, TOTAL, "Generating subtitles");
  const { srtPath: subtitlePath } = subtitleAgent.generate(scenes, videoId, videoFolder);
  // Generate English word timings from English scene subtitles so on-screen karaoke is 100% English
  const wl = subtitleAgent.generateSceneWordLevel(scenes, videoId, videoFolder);
  const wordTimings: WordTiming[] = wl.timings;
  onStepDone(`${wordTimings.length} English word timings`);

  // ── 10. Metadata ────────────────────────────────────────────────────────────
  onStep(10, TOTAL, "Finalising metadata");
  onStepDone(metadata.title);

  // ── 11. Thumbnail (best-of-3) ────────────────────────────────────────────────
  onStep(11, TOTAL, "Generating thumbnail (best of 3)");
  let thumbnailPath = "";
  if (!skipImages && thumbAgent) {
    try {
      thumbnailPath = await thumbAgent.generate(script, metadata, videoId, videoFolder, scriptMode);
      onStepDone(thumbnailPath);
    } catch (e: any) {
      onWarn(`Thumbnail skipped: ${e.message}`);
    }
  } else {
    onLog("Thumbnail skipped");
  }

  // ── 12. Video JSON ──────────────────────────────────────────────────────────
  onStep(12, TOTAL, "Assembling video JSON");
  const isLong = publishMode === "day1-long";
  const sceneDurationTotal = scenes.reduce((acc, s) => acc + (s.duration || 0), 0);
  // Video duration MUST equal voiceover duration to eliminate trailing dead silence
  const effectiveDuration = voiceDuration > 0 ? voiceDuration : sceneDurationTotal;

  // ── Audio-Video Sync Verification ───────────────────────────────────────────
  const durationDrift = Math.abs(sceneDurationTotal - effectiveDuration);
  if (durationDrift > 0.5) {
    onWarn(`  ⚠️ Audio-Video sync drift: scenes=${sceneDurationTotal.toFixed(1)}s, voice=${effectiveDuration.toFixed(1)}s`);
  } else {
    onLog(`  ✓ Audio-Video sync verified: ${scenes.length} scenes perfectly aligned with ${effectiveDuration.toFixed(1)}s audio`);
  }

  const videoJSON: FactoryVideoJSON = {
    id: videoId,
    title: metadata.title,
    mode: isLong ? "long" : "short",
    script,
    voice: voicePath,
    thumbnail: thumbnailPath,
    duration: effectiveDuration,
    scenes,
    subtitlePath,
    wordTimings,
    musicTrack: fs.existsSync(path.join(PATHS.public, "audio", "bg-music.mp3"))
      ? "audio/bg-music.mp3"
      : "",
    metadata,
    createdAt: new Date().toISOString(),
    channel,
    publishMode,
  };
  const jsonPath = path.join(videoFolder, "video.json");
  fs.writeFileSync(jsonPath, JSON.stringify(videoJSON, null, 2));
  onStepDone(jsonPath);

  // ── 13. Script file ─────────────────────────────────────────────────────────
  onStep(13, TOTAL, "Saving script");
  const scriptMd = [
    `# ${topicResult.topic}`,
    `\n**Mode:** ${publishMode} | **Channel:** ${channel}`,
    "",
    "## Hook",
    script.hook,
    "",
    "## Body",
    script.body,
    "",
    "## CTA",
    script.cta,
    ...(linkedVideoUrl ? ["", "## Linked Video", linkedVideoUrl] : []),
  ].join("\n");
  const scriptPath = path.join(videoFolder, "script.md");
  fs.writeFileSync(scriptPath, scriptMd);
  onStepDone(scriptPath);

  // ── 14. Metadata file ───────────────────────────────────────────────────────
  onStep(14, TOTAL, "Saving metadata");
  const metaPath = path.join(videoFolder, "metadata.json");
  fs.writeFileSync(metaPath, JSON.stringify({ ...metadata, videoId, channel, publishMode, createdAt: videoJSON.createdAt }, null, 2));
  onStepDone(metaPath);

  // ── 15. Render ──────────────────────────────────────────────────────────────
  onStep(15, TOTAL, "Rendering video");
  let finalVideoPath = "";
  if (!skipRender) {
    finalVideoPath = await renderAgent.render(videoJSON, opts.testFrames);
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
    publishMode,
    channel,
    linkedVideoUrl,
  };
}
