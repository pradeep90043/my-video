import * as fs from "fs";
import * as path from "path";
import { ImageProvider } from "./LLMProvider";

export class CloudflareImageProvider implements ImageProvider {
  name = "cloudflare-image";
  private apiUrl: string;
  private apiKey: string;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = (apiKey || process.env.COVER_IMAGE_API_KEY || "").trim();
    this.apiUrl = (apiUrl || process.env.COVER_IMAGE_API_URL || "https://image-api.spamhu93.workers.dev").trim();
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(prompt: string, outputPath: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("COVER_IMAGE_API_KEY not configured for Cloudflare image worker");
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Clean and optimize prompt for 16:9 landscape video
    const cleanPrompt = `${prompt.trim()}, 16:9 landscape aspect ratio, 8k resolution, cinematic lighting, sharp detail, professional developer aesthetic`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90_000);
      try {
        const res = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ prompt: cleanPrompt }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Cloudflare Image API HTTP ${res.status}: ${res.statusText}`);
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length < 100) {
          throw new Error("Cloudflare Image API returned empty buffer");
        }

        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      } catch (err: any) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error("Cloudflare image generation failed after retries");
  }
}
