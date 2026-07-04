import { LLMProvider } from "../providers/LLMProvider";
import { Scene } from "../types";
import { IMAGE_STYLE, BRAND } from "../config";

export class ImagePromptAgent {
  constructor(private llm: LLMProvider) {}

  async enhance(scene: Scene, topic: string): Promise<string> {
    const prompt = `You are a cinematic AI art director for CodeOrCap tech YouTube Shorts.

Enhance this image prompt to be more vivid, cinematic, and on-brand.

Original: ${scene.imagePrompt}
Scene text: ${scene.text}
Topic: ${topic}

Brand style: ${IMAGE_STYLE}
Brand colors: Primary ${BRAND.primaryColor} (golden yellow), Accent ${BRAND.accentColor} (orange), BG ${BRAND.bgColor}

Rules:
- No humans unless scene clearly requires a developer at computer
- Use neon lighting, dark backgrounds, tech elements (circuits, code, glowing screens)
- Include brand color hints (golden yellow highlights, orange accents)
- 9:16 portrait composition optimized for mobile vertical viewing
- Return ONLY the enhanced prompt. Max 80 words.`;

    return this.llm.generate(prompt, { temperature: 0.8, maxTokens: 200 });
  }

  async enhanceAll(scenes: Scene[], topic: string): Promise<Scene[]> {
    return Promise.all(
      scenes.map(async (scene) => {
        if (scene.background === "image") {
          const imagePrompt = await this.enhance(scene, topic);
          return { ...scene, imagePrompt };
        }
        return scene;
      }),
    );
  }
}
