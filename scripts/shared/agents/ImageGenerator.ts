import * as path from "path";
import { ImageProvider } from "../providers/LLMProvider";
import { Scene } from "../types";
import { PATHS } from "../config";

export class ImageGenerator {
  constructor(private provider: ImageProvider) {}

  async generateForScene(scene: Scene, videoId: string): Promise<string> {
    if (scene.background !== "image") return "";
    const outputPath = path.join(PATHS.images, videoId, `${scene.id}.png`);
    await this.provider.generate(scene.imagePrompt, outputPath);
    return outputPath;
  }

  async generateAll(scenes: Scene[], videoId: string): Promise<Scene[]> {
    const results: Scene[] = [];
    for (const scene of scenes) {
      try {
        const imagePath = await this.generateForScene(scene, videoId);
        results.push({ ...scene, imagePath });
      } catch (err: any) {
        console.warn(`⚠ Image failed for ${scene.id}: ${err.message}`);
        results.push({ ...scene, imagePath: "" });
      }
    }
    return results;
  }
}
