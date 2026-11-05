import { LLMProvider } from "../providers/LLMProvider";
import { VideoScript, VideoMetadata } from "../types";
import { BRAND } from "../config";

const METADATA_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" }, description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    hashtags: { type: "array", items: { type: "string" } },
    filename: { type: "string" }, slug: { type: "string" },
  },
  required: ["title","description","tags","hashtags","filename","slug"],
};

const LONG_VIDEO_CHAPTER_TIMESTAMPS = `00:00 Introduction
00:30 The Problem
02:30 Why This Happens
05:00 Deep Dive
07:30 What To Do Instead
09:00 Final Thoughts`;

export class MetadataAgent {
  constructor(private llm: LLMProvider) {}

  private toSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /** Extract the first word(s) of the title for keyword validation */
  private titleStartsWithKeyword(title: string, topic: string): boolean {
    const firstThreeWords = title.trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase();
    // Extract meaningful keywords from topic (skip common stop words)
    const stopWords = new Set(["a", "an", "the", "is", "are", "was", "were", "be", "in", "on", "at", "to", "of", "for"]);
    const topicKeywords = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => !stopWords.has(w) && w.length > 2);
    return topicKeywords.some((kw) => firstThreeWords.includes(kw));
  }

  async generate(
    script: VideoScript,
    modeOrOpts?: "short" | "long" | { mode?: "short" | "long"; linkedVideoUrl?: string },
    linkedVideoUrlParam?: string,
  ): Promise<VideoMetadata> {
    const mode = typeof modeOrOpts === "object" ? modeOrOpts.mode ?? "short" : modeOrOpts ?? "short";
    const linkedVideoUrl = typeof modeOrOpts === "object" ? modeOrOpts.linkedVideoUrl : linkedVideoUrlParam;
    const isLong = mode === "long";

    const buildPrompt = (titleConstraintNote: string) => `You are the SEO & metadata expert for CodeOrCap — a viral Indian developer YouTube channel.

Generate complete video metadata for:
Topic: ${script.topic}
Category: ${script.category}
Hook: ${script.hook}
Mode: ${isLong ? "Long-form (10-minute video)" : "Short-form (YouTube Shorts)"}
Channel: ${BRAND.name} | ${BRAND.handle}

${titleConstraintNote}

Generate:
- title: YouTube title. English. SEO-optimised. HARD LIMIT: 55 characters MAX (count carefully!). Curiosity-driving. Primary keyword MUST appear in the first 3 words.
- description: YouTube description ~150 words. Hook first (first line ≤ 125 chars). Keywords natural. Ends with: "Subscribe to ${BRAND.name} → ${BRAND.handle} | ${BRAND.tagline}"
- tags: 15 SEO tags (English) — mix broad and niche developer keywords
- hashtags: 9 hashtags — mix Hindi tech + English dev tags (#CodeOrCap #TechMythBuster #ReactJS)
- filename: kebab-case without extension (e.g. "mern-stack-outdated-2025")
- slug: same as filename`;

    let result = await this.llm.generateJSON<VideoMetadata>(
      buildPrompt("IMPORTANT: Title must be ≤ 55 characters. Count every character including spaces."),
      METADATA_SCHEMA,
      { temperature: 0.7 },
    );

    // --- Validation: title length ≤ 55 chars ---
    if (result.title.length > 55) {
      console.warn(`[MetadataAgent] Title too long (${result.title.length} chars): "${result.title}". Retrying with explicit constraint.`);
      const retryResult = await this.llm.generateJSON<VideoMetadata>(
        buildPrompt(
          `CRITICAL: Your previous title was ${result.title.length} characters — WAY TOO LONG. The title MUST be ≤ 55 characters. Count every single character and space. Truncate or rewrite to fit.`,
        ),
        METADATA_SCHEMA,
        { temperature: 0.5 },
      );
      // If still too long, hard-truncate at word boundary
      if (retryResult.title.length > 55) {
        const words = retryResult.title.split(" ");
        let truncated = "";
        for (const word of words) {
          const candidate = truncated ? `${truncated} ${word}` : word;
          if (candidate.length <= 55) truncated = candidate;
          else break;
        }
        retryResult.title = truncated || retryResult.title.slice(0, 55);
        console.warn(`[MetadataAgent] Title hard-truncated to: "${retryResult.title}"`);
      }
      result = retryResult;
    }

    // --- Validation: primary keyword in first 3 words ---
    if (!this.titleStartsWithKeyword(result.title, script.topic)) {
      console.warn(`[MetadataAgent] Primary keyword not in first 3 words of title: "${result.title}". Retrying once.`);
      const kwRetry = await this.llm.generateJSON<VideoMetadata>(
        buildPrompt(
          `CRITICAL: The primary keyword from the topic ("${script.topic}") MUST appear in the first 3 words of the title. Title must still be ≤ 55 characters.`,
        ),
        METADATA_SCHEMA,
        { temperature: 0.5 },
      );
      if (kwRetry.title.length <= 55) {
        result = kwRetry;
      }
    }

    // --- Validation: description first line ≤ 125 chars ---
    const descLines = result.description.split("\n");
    if (descLines[0] && descLines[0].length > 125) {
      descLines[0] = descLines[0].slice(0, 122) + "...";
      result.description = descLines.join("\n");
      console.warn(`[MetadataAgent] Description first line truncated to 125 chars.`);
    }

    // --- Slug / filename normalisation ---
    result.slug = this.toSlug(result.filename);
    result.filename = result.slug;

    // --- Linked video URL injection (Day 2 short) ---
    if (linkedVideoUrl) {
      result.description = `📌 Full video: ${linkedVideoUrl}\n\n${result.description}`;
    }

    // --- Chapter timestamps for long-form videos ---
    if (isLong) {
      result.description = `${result.description}\n\n⏱️ Chapters:\n${LONG_VIDEO_CHAPTER_TIMESTAMPS}`;
    }

    return result;
  }
}
