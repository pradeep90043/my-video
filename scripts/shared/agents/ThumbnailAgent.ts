import * as fs from "fs";
import * as path from "path";
import { LLMProvider, ImageProvider } from "../providers/LLMProvider";
import { VideoScript, VideoMetadata } from "../types";
import { BRAND, IMAGE_STYLE, PATHS } from "../config";

interface ThumbnailPlan {
  title: string; subtitle: string; imagePrompt: string;
  textColor: string; accentColor: string;
}

interface ThumbnailCritique {
  winnerIndex: number; // 0, 1, or 2
  reasoning: string;
}

const THUMBNAIL_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" }, subtitle: { type: "string" },
    imagePrompt: { type: "string" }, textColor: { type: "string" }, accentColor: { type: "string" },
  },
  required: ["title","subtitle","imagePrompt","textColor","accentColor"],
};

const CRITIQUE_SCHEMA = {
  type: "object",
  properties: {
    winnerIndex: { type: "number" },
    reasoning: { type: "string" },
  },
  required: ["winnerIndex", "reasoning"],
};

export class ThumbnailAgent {
  constructor(private llm: LLMProvider, private imageProvider: ImageProvider) {}

  async plan(script: VideoScript, metadata: VideoMetadata, mode: "long" | "short" = "short"): Promise<ThumbnailPlan> {
    const dimensions = mode === "long" ? "1280×720 (landscape)" : "1080×1920 (portrait)";
    const prompt = `You are the thumbnail designer for CodeOrCap, a viral Indian tech YouTube channel.

Create a thumbnail plan for:
Topic: ${script.topic}
Title: ${metadata.title}
Format: ${dimensions}

Brand: Primary ${BRAND.primaryColor}, Accent ${BRAND.accentColor}, BG ${BRAND.bgColor}
Style: Bold, high contrast, cyberpunk tech aesthetic

Generate:
- title: Short bold thumbnail text (max 4 words, UPPERCASE)
- subtitle: Secondary text (max 5 words)
- imagePrompt: Cinematic background sized for ${dimensions}. Style: ${IMAGE_STYLE}. No text in image.
- textColor: hex (${BRAND.textColor} or ${BRAND.primaryColor})
- accentColor: hex (${BRAND.primaryColor} or ${BRAND.accentColor})`;

    return this.llm.generateJSON<ThumbnailPlan>(prompt, THUMBNAIL_SCHEMA, { temperature: 0.7 });
  }

  /**
   * Generate 3 thumbnail concept candidates, critique them with a single LLM call,
   * then generate an image only for the winning concept.
   *
   * Selection criteria:
   * - Text contrast and readability
   * - Emotional hook strength
   * - Thumbnail click-worthiness (CTR potential)
   */
  async generate(
    script: VideoScript,
    metadata: VideoMetadata,
    videoId: string,
    outputDir?: string,
    mode: "long" | "short" = "short",
  ): Promise<string> {
    // Step 1: Generate 3 different thumbnail concepts in parallel
    const [concept0, concept1, concept2] = await Promise.all([
      this.plan(script, metadata, mode),
      this.plan(script, metadata, mode),
      this.plan(script, metadata, mode),
    ]);
    const concepts = [concept0, concept1, concept2];

    // Step 2: Critique all 3 concepts and pick the best one
    const critiquePrompt = `You are a YouTube thumbnail expert. Evaluate these 3 thumbnail concepts for the video:
Topic: ${script.topic}
Title: ${metadata.title}

Concept 0:
- Title text: "${concept0.title}"
- Subtitle: "${concept0.subtitle}"
- Image prompt: "${concept0.imagePrompt}"
- Text color: ${concept0.textColor}, Accent: ${concept0.accentColor}

Concept 1:
- Title text: "${concept1.title}"
- Subtitle: "${concept1.subtitle}"
- Image prompt: "${concept1.imagePrompt}"
- Text color: ${concept1.textColor}, Accent: ${concept1.accentColor}

Concept 2:
- Title text: "${concept2.title}"
- Subtitle: "${concept2.subtitle}"
- Image prompt: "${concept2.imagePrompt}"
- Text color: ${concept2.textColor}, Accent: ${concept2.accentColor}

Score each on:
1. Text contrast and readability (can text be read at a glance?)
2. Emotional hook strength (does it trigger curiosity or urgency?)
3. Click-worthiness / CTR potential (would a viewer click on this?)

Pick the single best concept. Return:
- winnerIndex: 0, 1, or 2 (the index of the winning concept)
- reasoning: brief explanation of why it wins`;

    const critique = await this.llm.generateJSON<ThumbnailCritique>(
      critiquePrompt,
      CRITIQUE_SCHEMA,
      { temperature: 0.3 },
    );

    // Clamp index to valid range in case LLM returns something unexpected
    const winnerIndex = Math.min(Math.max(Math.round(critique.winnerIndex), 0), 2);
    const winningPlan = concepts[winnerIndex];

    // Step 3: Generate image only for the winning concept
    const dir = outputDir || path.join(PATHS.thumbnails, videoId);
    fs.mkdirSync(dir, { recursive: true });

    // Save all 3 concepts + critique for auditing
    fs.writeFileSync(
      path.join(dir, "thumbnail-candidates.json"),
      JSON.stringify({ concepts, critique, winnerIndex }, null, 2),
    );
    // Save the winning plan
    fs.writeFileSync(path.join(dir, "thumbnail.json"), JSON.stringify(winningPlan, null, 2));

    const imagePath = path.join(dir, "thumbnail.png");
    await this.imageProvider.generate(winningPlan.imagePrompt, imagePath);
    return imagePath;
  }
}
