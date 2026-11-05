import * as fs from "fs";
import * as path from "path";
import { ImageProvider } from "./LLMProvider";

export class PexelsImageProvider implements ImageProvider {
  name = "pexels-image";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = (apiKey || process.env.PEXELS_API_KEY || "").trim();
  }

  async generate(prompt: string, outputPath: string): Promise<string> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    if (!this.apiKey) {
      throw new Error("PEXELS_API_KEY not configured.");
    }

    const isPortrait =
      prompt.toLowerCase().includes("9:16") || prompt.toLowerCase().includes("portrait");
    const orientation = isPortrait ? "portrait" : "landscape";

    // Clean prompt to extract core visual keywords for Pexels search
    const cleanKeywords = prompt
      .replace(/in a consistent.*aesthetic\.?/gi, "")
      .replace(/cinematic 35mm anamorphic prime lens.*chiaroscuro/gi, "")
      .replace(/shot of/gi, "")
      .replace(/photograph of/gi, "")
      .replace(/hyperrealistic/gi, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "and", "for", "with", "this", "that"].includes(w.toLowerCase()))
      .slice(0, 4)
      .join(" ") || "developer software coding";

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanKeywords)}&per_page=5&orientation=${orientation}`;

    const res = await fetch(url, {
      headers: { Authorization: this.apiKey },
    });

    if (!res.ok) {
      throw new Error(`Pexels API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { photos?: Array<{ src: { large2x?: string; original?: string; large?: string } }> };
    const photos = data.photos ?? [];

    if (photos.length === 0) {
      // Fallback query if specific keywords returned no results
      const fallbackUrl = `https://api.pexels.com/v1/search?query=coding+developer+technology&per_page=5&orientation=${orientation}`;
      const fbRes = await fetch(fallbackUrl, { headers: { Authorization: this.apiKey } });
      const fbData = (await fbRes.json()) as { photos?: Array<{ src: { large2x?: string; original?: string; large?: string } }> };
      if (!fbData.photos?.length) {
        throw new Error(`No Pexels photos found for query: ${cleanKeywords}`);
      }
      photos.push(...fbData.photos);
    }

    // Pick photo (random from top 5 for variety)
    const photo = photos[Math.floor(Math.random() * photos.length)];
    const imageUrl = photo.src.large2x || photo.src.original || photo.src.large;

    if (!imageUrl) {
      throw new Error("No valid image URL in Pexels response");
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download image from Pexels: ${imgRes.statusText}`);
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }
}
