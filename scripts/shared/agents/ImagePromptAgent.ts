import { LLMProvider } from "../providers/LLMProvider";
import { Scene } from "../types";
import { IMAGE_STYLE, BRAND } from "../config";

interface BatchPromptResult {
  prompts: {
    id: string;
    enhancedPrompt: string;
  }[];
}

const BATCH_SCHEMA = {
  type: "object",
  properties: {
    prompts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          enhancedPrompt: { type: "string" },
        },
        required: ["id", "enhancedPrompt"],
      },
    },
  },
  required: ["prompts"],
};

/**
 * ImagePromptAgent — transforms basic scene prompts into ultra-cinematic,
 * hyper-realistic image generation prompts.
 *
 * Uses single-batch prompt processing to turn N separate API calls into 1,
 * eliminating rate-limit spikes while enforcing 35mm anamorphic optics.
 */
export class ImagePromptAgent {
  constructor(private llm: LLMProvider) {}

  async enhanceAll(
    scenes: Scene[],
    topic: string,
    mode: "short" | "long" = "short",
  ): Promise<Scene[]> {
    const isLandscape = mode === "long";
    const aspectPrompt = isLandscape
      ? "16:9 landscape cinematic wide-angle frame, horizontal composition"
      : "9:16 portrait vertical framing optimized for mobile shorts";

    const imageScenes = scenes.filter((s) => s.background === "image");
    if (imageScenes.length === 0) return scenes;

    const scenesSummary = imageScenes.map((s) => ({
      id: s.id,
      text: s.text,
      originalPrompt: s.imagePrompt,
    }));

    const batchPrompt = `You are a world-class cinematic AI art director for CodeOrCap tech YouTube channel.

Enhance each of the following image prompts to be extraordinarily vivid, tactile, and visually arresting:

Video Topic: ${topic}
Format: ${isLandscape ? "10-Minute Landscape Video" : "YouTube Shorts Portrait"}
Brand Aesthetic: ${IMAGE_STYLE}
Color Palette: Dark charcoal backgrounds (${BRAND.bgColor}), golden yellow highlights (${BRAND.primaryColor}), neon orange accents (${BRAND.accentColor})

Cinematic Rules for ALL prompts:
1. Framing: ${aspectPrompt}.
2. Optics: Shot on 35mm anamorphic prime lens, f/1.8 shallow depth of field, subtle film grain, volumetric haze, cinematic color grading.
3. Lighting: Moody chiaroscuro, glowing monitors reflecting on tactile mechanical keys, subtle rim lighting.
4. Subject: Gritty realistic tech environments (glowing code terminals, hardware silicon, server racks, holographic architecture).
5. Anti-Cliché: NO generic smiling business stock photos, NO flat cartoon clip art, NO distorted plastic AI faces.
6. Length: Each enhancedPrompt must be concise and vivid (under 60 words).

Scenes to enhance:
${JSON.stringify(scenesSummary, null, 2)}

Return a JSON object containing "prompts" with an enhancedPrompt for each scene id.`;

    try {
      const res = await this.llm.generateJSON<BatchPromptResult>(batchPrompt, BATCH_SCHEMA, {
        temperature: 0.8,
      });

      const promptMap = new Map(res.prompts.map((p) => [p.id, p.enhancedPrompt]));

      return scenes.map((scene) => {
        const enhanced = promptMap.get(scene.id);
        if (enhanced) {
          return { ...scene, imagePrompt: enhanced };
        }
        return scene;
      });
    } catch (err: any) {
      console.warn("  [ImagePromptAgent] Batch prompt enhancement failed, using original prompts:", err.message);
      return scenes;
    }
  }
}
