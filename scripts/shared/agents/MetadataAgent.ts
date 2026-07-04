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

export class MetadataAgent {
  constructor(private llm: LLMProvider) {}

  private toSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  async generate(script: VideoScript): Promise<VideoMetadata> {
    const prompt = `You are the SEO & metadata expert for CodeOrCap — a viral Indian developer YouTube channel.

Generate complete video metadata for:
Topic: ${script.topic}
Category: ${script.category}
Hook: ${script.hook}
Channel: ${BRAND.name} | ${BRAND.handle}

Generate:
- title: YouTube title. English. SEO-optimised. Max 60 chars. Curiosity-driving.
- description: YouTube description ~150 words. Hook first. Keywords natural. Ends with: "Subscribe to ${BRAND.name} → ${BRAND.handle} | ${BRAND.tagline}"
- tags: 15 SEO tags (English) — mix broad and niche developer keywords
- hashtags: 9 hashtags — mix Hindi tech + English dev tags (#CodeOrCap #TechMythBuster #ReactJS)
- filename: kebab-case without extension (e.g. "mern-stack-outdated-2025")
- slug: same as filename`;

    const result = await this.llm.generateJSON<VideoMetadata>(prompt, METADATA_SCHEMA, { temperature: 0.7 });
    result.slug = this.toSlug(result.filename);
    result.filename = result.slug;
    return result;
  }
}
