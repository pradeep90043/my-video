import { LLMProvider } from "../providers/LLMProvider";
import { Scene, VideoScript } from "../types";
import { IMAGE_STYLE } from "../config";
import { normalizeHindiNumbersForTTS } from "../utils/hindiNumberTTS";

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
          figure: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["comparison","stats","roadmap","metric","alert","poll","code"] },
              title: { type: "string" },
              subtitle: { type: "string" },
              badge: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                    secondary: { type: "string" },
                    color: { type: "string", enum: ["primary","accent","danger","success","warning","purple"] },
                    icon: { type: "string" },
                  },
                  required: ["label"],
                },
              },
              highlight: { type: "string" },
            },
            required: ["type","title","items"],
          },
        },
        required: ["id","duration","text","voiceText","subtitle","imagePrompt","animation","background","cameraMove"],
      },
    },
  },
  required: ["scenes"],
};

export class ScenePlanner {
  constructor(private llm: LLMProvider) {}

  /**
   * Plan scenes for a video.
   * @param script - The video script
   * @param mode - "short" (default): 4-7 scenes for a 30-60s portrait Short.
   *               "long": 20-30 scenes for a ~10-min landscape video.
   *
   * NOTE: Long-mode scenes have duration up to 30s. The SceneSchema in types.ts
   * enforces .max(15) for safety in short mode. For long mode, skip zod scene
   * validation downstream or parse with `.passthrough()` to avoid rejection.
   */
  async plan(script: VideoScript, mode: "short" | "long" = "short"): Promise<Scene[]> {
    if (mode === "long") {
      return this._planLong(script);
    }
    return this._planShort(script);
  }

  private async _planShort(script: VideoScript): Promise<Scene[]> {
    const prompt = `You are a video director for CodeOrCap — a tech YouTube Shorts channel.

Convert this script into a scene-by-scene plan for a ${script.durationSecs}s vertical video (1080x1920).

HOOK: ${script.hook}
BODY: ${script.body}
CTA: ${script.cta}
Topic: ${script.topic}

Create 4-7 scenes. Each scene:
- id: "scene-1", "scene-2", etc. (sequential)
- duration: seconds for this scene (must sum to ~${script.durationSecs}s)
- text: short bold ENGLISH ONLY headline displayed on screen (no Hindi on screen)
- voiceText: exact Devanagari Hindi (देवनागरी लिपि) narration for this scene. All digits/numbers/percentages/years/metrics MUST be spelled out phonetically in Devanagari Hindi words (e.g. "दो हज़ार पच्चीस", "सत्तर परसेंट", "दो गुना") for flawless TTS pronunciation.
- subtitle: concise ENGLISH ONLY caption displayed on screen during voiceover
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
    return result.scenes.map((s) => ({
      ...s,
      voiceText: normalizeHindiNumbersForTTS(s.voiceText || ""),
      imagePath: "",
      audioPart: "",
    }));
  }

  private async _planLong(script: VideoScript): Promise<Scene[]> {
    const sceneCount = Math.max(4, Math.min(30, Math.round(script.durationSecs / 20)));
    const avgDuration = Math.round(script.durationSecs / sceneCount);
    const prompt = `You are a video director for a long-form YouTube channel (${script.durationSecs} second video).

Convert this script into a scene-by-scene plan for a ${script.durationSecs}s landscape video (1920x1080).

HOOK: ${script.hook}
BODY: ${script.body}
CTA: ${script.cta}
Topic: ${script.topic}

Create EXACTLY ${sceneCount} scenes. Each scene:
- id: "scene-1", "scene-2", etc. (sequential)
- duration: around ${avgDuration} seconds per scene (all scene durations MUST sum exactly to ~${script.durationSecs}s)
- text: short bold ENGLISH ONLY headline displayed on screen (no Hindi on screen, e.g. "The 2025 Developer Shift", "Cursor AI vs GitHub Copilot")
- voiceText: detailed Devanagari Hindi (देवनागरी लिपि) narration for this scene. All digits/numbers/percentages/years/metrics MUST be spelled out phonetically in Devanagari Hindi words (e.g. "दो हज़ार पच्चीस", "सत्तर परसेंट", "दस हज़ार") for flawless TTS pronunciation.
- subtitle: concise ENGLISH ONLY caption displayed on screen during voiceover (1-2 punchy English sentences)
- imagePrompt: detailed cinematic AI image prompt for 1920x1080 landscape. Style: ${IMAGE_STYLE}
- animation: one of fade, slide, scale, pop, typing, zoom (vary for retention)
- background: hex color or "image" to use generated image
- cameraMove: one of static, zoom-in, zoom-out, pan-left, pan-right, shake (vary for engagement)
- figure: Live dynamic Remotion figure/diagram to illustrate the script concept. ALL TEXT IN FIGURE MUST BE 100% IN ENGLISH:
  - type: one of "comparison", "stats", "roadmap", "metric", "alert", "poll", "code"
  - title: short bold ENGLISH title of the figure (e.g. "Productivity Benchmark", "AI Adoption Rate")
  - subtitle: context or units in ENGLISH (e.g. "Lines of Code per Hour", "Survey of 5,000 Devs")
  - badge: ENGLISH badge, e.g. "TREND", "BENCHMARK", "CASE STUDY", "ACTION PLAN", "VOTE"
  - items: array of 2-3 items with { label, value, secondary, color, icon } — ALL LABELS AND VALUES IN ENGLISH (e.g. label: "Cursor AI", value: "2.5x", secondary: "Faster Ship Rate")
  - highlight: key punchline takeaway in ENGLISH (e.g. "70% increase in sprint velocity")

Scene types to use (mix and vary throughout):
- intro: Opening hook with shake/zoom-in camera. Pop animation. Dark background.
- problem-setup: Establish the problem. zoom-out or pan. Use image backgrounds.
- data-point: Key statistic or fact. typing or scale animation. High contrast.
- story-beat: Narrative progression. slide or fade. Cinematic image backgrounds.
- solution-step: Step-by-step solution. slide animation. Clear visuals.
- cta: Final call-to-action. fade. Dark background. Subscribe/like/comment.

Guidelines for long-form retention:
- Vary animation and cameraMove every 2-3 scenes to maintain viewer attention
- Use "image" backgrounds for most scenes with vivid, specific image prompts
- Keep text concise and punchy even though voiceText is long
- Build narrative tension across the first half, resolve in second half
- End with a strong CTA scene`;

    const result = await this.llm.generateJSON<{ scenes: Omit<Scene,"imagePath"|"audioPart">[] }>(
      prompt, SCENE_SCHEMA, { temperature: 0.8 },
    );
    return result.scenes.map((s) => ({
      ...s,
      voiceText: normalizeHindiNumbersForTTS(s.voiceText || ""),
      imagePath: "",
      audioPart: "",
    }));
  }
}
