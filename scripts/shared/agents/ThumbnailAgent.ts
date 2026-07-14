import * as fs from "fs";
import * as path from "path";
import { LLMProvider, ImageProvider } from "../providers/LLMProvider";
import { VideoScript, VideoMetadata } from "../types";
import { BRAND, IMAGE_STYLE, PATHS } from "../config";

interface ThumbnailPlan {
  title: string; subtitle: string; imagePrompt: string;
  textColor: string; accentColor: string;
}

const THUMBNAIL_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" }, subtitle: { type: "string" },
    imagePrompt: { type: "string" }, textColor: { type: "string" }, accentColor: { type: "string" },
  },
  required: ["title","subtitle","imagePrompt","textColor","accentColor"],
};

export class ThumbnailAgent {
  constructor(private llm: LLMProvider, private imageProvider: ImageProvider) {}

  async plan(script: VideoScript, metadata: VideoMetadata): Promise<ThumbnailPlan> {
    const prompt = `You are the thumbnail designer for CodeOrCap, a viral Indian tech YouTube channel.

Create a thumbnail plan for:
Topic: ${script.topic}
Title: ${metadata.title}

Brand: Primary ${BRAND.primaryColor}, Accent ${BRAND.accentColor}, BG ${BRAND.bgColor}
Style: Bold, high contrast, cyberpunk tech aesthetic

Generate:
- title: Short bold thumbnail text (max 4 words, UPPERCASE)
- subtitle: Secondary text (max 5 words)
- imagePrompt: Cinematic background. Style: ${IMAGE_STYLE}. No text in image.
- textColor: hex (${BRAND.textColor} or ${BRAND.primaryColor})
- accentColor: hex (${BRAND.primaryColor} or ${BRAND.accentColor})`;

    return this.llm.generateJSON<ThumbnailPlan>(prompt, THUMBNAIL_SCHEMA, { temperature: 0.7 });
  }

  async generate(script: VideoScript, metadata: VideoMetadata, videoId: string, outputDir?: string): Promise<string> {
    const plan = await this.plan(script, metadata);
    const dir = outputDir || path.join(PATHS.thumbnails, videoId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "thumbnail.json"), JSON.stringify(plan, null, 2));
    const imagePath = path.join(dir, "thumbnail.png");
    await this.imageProvider.generate(plan.imagePrompt, imagePath);
    return imagePath;
  }
}
