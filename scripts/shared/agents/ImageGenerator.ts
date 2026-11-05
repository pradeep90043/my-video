import * as path from "path";
import { ImageProvider } from "../providers/LLMProvider";
import { Scene } from "../types";
import { PATHS } from "../config";

export class ImageGenerator {
  constructor(private provider: ImageProvider) {}

  async generateForScene(scene: Scene, videoId: string, outputDir?: string): Promise<string> {
    if (scene.background !== "image" && !scene.imagePrompt) return "";
    const outputPath = outputDir
      ? path.join(outputDir, `${scene.id}.png`)
      : path.join(PATHS.images, videoId, `${scene.id}.png`);
    await this.provider.generate(scene.imagePrompt || scene.text, outputPath);
    return outputPath;
  }

  async generateAll(scenes: Scene[], videoId: string, outputDir?: string): Promise<Scene[]> {
    const candidateScenes = scenes.filter((s) => s.background === "image" || !!s.imagePrompt);
    const candidateItems = candidateScenes.map((s) => ({
      id: s.id,
      prompt: s.imagePrompt || s.text,
      outputPath: outputDir
        ? path.join(outputDir, `${s.id}.png`)
        : path.join(PATHS.images, videoId, `${s.id}.png`),
    }));

    if (typeof (this.provider as any).batchGenerate === "function" && candidateItems.length > 0) {
      try {
        const batchMap: Map<string, string> = await (this.provider as any).batchGenerate(candidateItems);
        return scenes.map((s) => ({
          ...s,
          imagePath: batchMap.get(s.id) || "",
        }));
      } catch (err: any) {
        console.warn(`⚠ Batch image generation failed: ${err.message}. Falling back to sequential...`);
      }
    }

    const results: Scene[] = [];
    for (const scene of scenes) {
      try {
        const imagePath = await this.generateForScene(scene, videoId, outputDir);
        results.push({ ...scene, imagePath });
      } catch (err: any) {
        console.warn(`⚠ Image failed for ${scene.id}: ${err.message}`);
        results.push({ ...scene, imagePath: "" });
      }
    }
    return results;
  }
}
