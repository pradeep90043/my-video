import { LLMProvider } from "../providers/LLMProvider";
import { Scene, VideoScript } from "../types";
import { IMAGE_STYLE } from "../config";

const SCENE_SCHEMA = {
  type: "object",
  properties: {
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          duration: { type: "number" },
          text: { type: "string" },
          voiceText: { type: "string" },
          subtitle: { type: "string" },
          imagePrompt: { type: "string" },
          animation: { type: "string", enum: ["fade","slide","scale","pop","typing","zoom"] },
          background: { type: "string" },
          cameraMove: { type: "string", enum: ["static","zoom-in","zoom-out","pan-left","pan-right","shake"] },
        },
        required: ["id","duration","text","voiceText","subtitle","imagePrompt","animation","background","cameraMove"],
      },
    },
  },
  required: ["scenes"],
};

export class ScenePlanner {
  constructor(private llm: LLMProvider) {}

  async plan(script: VideoScript): Promise<Scene[]> {
    const prompt = `You are a video director for CodeOrCap — a tech YouTube Shorts channel.

Convert this script into a scene-by-scene plan for a ${script.durationSecs}s vertical video (1080x1920).

HOOK: ${script.hook}
BODY: ${script.body}
CTA: ${script.cta}
Topic: ${script.topic}

Create 4-7 scenes. Each scene:
- id: "scene-1", "scene-2", etc. (sequential)
- duration: seconds for this scene (must sum to ~${script.durationSecs}s)
- text: short bold English text displayed on screen
- voiceText: exact Hinglish narration for this scene
- subtitle: English subtitle shown during voiceover
- imagePrompt: detailed cinematic AI image prompt. Style: ${IMAGE_STYLE}
- animation: one of fade, slide, scale, pop, typing, zoom
- background: hex color (use #0B0B0B for pure black) or "image" to use generated image
- cameraMove: one of static, zoom-in, zoom-out, pan-left, pan-right, shake

Scene types:
- Scene 1 (HOOK): shake or zoom-in. Pop/scale animation. #0B0B0B background.
- Scene 2-N (BODY): varied animations. Use "image" background with cinematic prompts.
- Last scene (CTA): fade. #0B0B0B background. Show subscribe/follow call.`;

    const result = await this.llm.generateJSON<{ scenes: Omit<Scene,"imagePath"|"audioPart">[] }>(
      prompt, SCENE_SCHEMA, { temperature: 0.7 },
    );
    return result.scenes.map((s) => ({ ...s, imagePath: "", audioPart: "" }));
  }
}
