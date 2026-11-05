import * as fs from "fs";
import * as path from "path";
import { ImageProvider } from "./LLMProvider";
import { runKaggleImageGen, KaggleImagePrompt } from "./KaggleImageRunner";

export class KaggleImageProvider implements ImageProvider {
  name = "kaggle-image";

  isAvailable(): boolean {
    return !!(process.env.KAGGLE_USERNAME && process.env.KAGGLE_KEY) ||
      fs.existsSync(path.join(process.env.HOME || "", ".kaggle", "kaggle.json"));
  }

  async generate(prompt: string, outputPath: string): Promise<string> {
    const id = path.basename(outputPath, path.extname(outputPath));
    const map = await this.batchGenerate([{ id, prompt, outputPath }]);
    const res = map.get(id);
    if (!res || !fs.existsSync(res)) {
      throw new Error(`Kaggle image generation did not output file for ${id}`);
    }
    return res;
  }

  async batchGenerate(
    items: Array<{ id: string; prompt: string; outputPath: string }>,
  ): Promise<Map<string, string>> {
    if (!this.isAvailable()) {
      throw new Error("Kaggle credentials not available");
    }

    const outDir = path.dirname(items[0].outputPath);
    fs.mkdirSync(outDir, { recursive: true });

    const kagglePrompts: KaggleImagePrompt[] = items.map((it) => ({
      id: it.id,
      prompt: `${it.prompt}, 16:9 landscape aspect ratio, 8k uhd, cinematic lighting, professional developer tech visual`,
      width: 1024,
      height: 576,
    }));

    return runKaggleImageGen(kagglePrompts, outDir);
  }
}
