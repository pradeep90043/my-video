import { ImageProvider } from "./LLMProvider";
import { CloudflareImageProvider } from "./CloudflareImageProvider";
import { KaggleImageProvider } from "./KaggleImageProvider";
import { PollinationsImageProvider } from "./PollinationsImageProvider";
import { PexelsImageProvider } from "./PexelsImageProvider";

export class CompositeImageProvider implements ImageProvider {
  name = "composite-ai-image";
  private cfProvider = new CloudflareImageProvider();
  private kaggleProvider = new KaggleImageProvider();
  private pollinationsProvider = new PollinationsImageProvider();
  private pexelsProvider = new PexelsImageProvider();

  async generate(prompt: string, outputPath: string): Promise<string> {
    // 1. Try Cloudflare Worker (preferred if key configured)
    if (this.cfProvider.isAvailable()) {
      try {
        console.log(`    [ImageProvider] Generating via Cloudflare AI Image Worker...`);
        return await this.cfProvider.generate(prompt, outputPath);
      } catch (err: any) {
        console.warn(`    [ImageProvider] Cloudflare failed: ${err.message}. Trying next provider...`);
      }
    }

    // 2. Try Kaggle GPU
    if (this.kaggleProvider.isAvailable()) {
      try {
        console.log(`    [ImageProvider] Generating via Kaggle GPU (SDXL-Turbo)...`);
        return await this.kaggleProvider.generate(prompt, outputPath);
      } catch (err: any) {
        console.warn(`    [ImageProvider] Kaggle failed: ${err.message}. Trying next provider...`);
      }
    }

    // 3. Try Pollinations (Free AI image generator)
    try {
      console.log(`    [ImageProvider] Generating via Pollinations AI...`);
      return await this.pollinationsProvider.generate(prompt, outputPath);
    } catch (err: any) {
      console.warn(`    [ImageProvider] Pollinations failed: ${err.message}. Falling back to Pexels...`);
    }

    // 4. Fallback to Pexels
    return await this.pexelsProvider.generate(prompt, outputPath);
  }

  async batchGenerate(
    items: Array<{ id: string; prompt: string; outputPath: string }>,
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // 1. If Cloudflare is available, run with concurrency
    if (this.cfProvider.isAvailable()) {
      try {
        console.log(`  [CompositeImageProvider] Generating ${items.length} images via Cloudflare Worker...`);
        for (const item of items) {
          try {
            const p = await this.cfProvider.generate(item.prompt, item.outputPath);
            results.set(item.id, p);
          } catch (e: any) {
            console.warn(`    Cloudflare image failed for ${item.id}: ${e.message}`);
          }
        }
        if (results.size === items.length) return results;
      } catch (err: any) {
        console.warn(`  [CompositeImageProvider] Cloudflare batch error: ${err.message}`);
      }
    }

    // 2. If Kaggle is available and we have missing items, batch on Kaggle GPU
    const missing = items.filter((it) => !results.has(it.id));
    if (missing.length > 0 && this.kaggleProvider.isAvailable()) {
      try {
        console.log(`  [CompositeImageProvider] Batch generating ${missing.length} images on Kaggle GPU...`);
        const kaggleMap = await this.kaggleProvider.batchGenerate(missing);
        for (const [id, filePath] of kaggleMap.entries()) {
          results.set(id, filePath);
        }
      } catch (err: any) {
        console.warn(`  [CompositeImageProvider] Kaggle batch failed: ${err.message}`);
      }
    }

    // 3. Any remaining missing images: individual fallback
    const stillMissing = items.filter((it) => !results.has(it.id));
    for (const item of stillMissing) {
      try {
        const filePath = await this.generate(item.prompt, item.outputPath);
        results.set(item.id, filePath);
      } catch (err: any) {
        console.warn(`    Image failed for ${item.id}: ${err.message}`);
      }
    }

    return results;
  }
}
