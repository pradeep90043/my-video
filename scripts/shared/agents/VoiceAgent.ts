import * as path from "path";
import { VoiceProvider } from "../providers/LLMProvider";
import { VideoScript } from "../types";
import { PATHS } from "../config";
import { normalizeHindiNumbersForTTS } from "../utils/hindiNumberTTS";

export class VoiceAgent {
  constructor(private provider: VoiceProvider) {}

  private cleanText(text: string): string {
    return text
      .replace(/\[[^\]]+\]/g, "") // Strip [Introduction 0:00], [The Problem 0:30], etc.
      .replace(/【[^】]+】/g, "")
      .replace(/\b\d{1,2}:\d{2}\b/g, "") // Strip standalone timestamps like 0:12, 1:45
      .replace(/\s+/g, " ")
      .trim();
  }

  buildNarration(script: VideoScript, scenes?: Array<{ voiceText?: string }>): string {
    // 1. If scenes with voiceText are available, use them directly as the source of truth!
    if (scenes && scenes.length > 0 && scenes.some((s) => s.voiceText && s.voiceText.trim())) {
      const parts = scenes.map((s) => this.cleanText(s.voiceText || "")).filter(Boolean);
      return parts.join(" ").replace(/\s+/g, " ").trim();
    }

    // 2. If long-form structured sections are present:
    if (script.sections && script.sections.length > 0) {
      const parts = script.sections.map((s) => this.cleanText(s.voiceText || "")).filter(Boolean);
      return parts.join(" ").replace(/\s+/g, " ").trim();
    }

    // 3. Fallback for short-form scripts:
    const cleanHook = this.cleanText(script.hook || "");
    const cleanBody = this.cleanText(script.body || "");
    const cleanCta = this.cleanText(script.cta || "");

    const parts: string[] = [];
    if (cleanHook) parts.push(cleanHook);
    if (cleanBody && !cleanBody.startsWith(cleanHook)) parts.push(cleanBody);
    if (cleanCta && !cleanBody.endsWith(cleanCta)) parts.push(cleanCta);

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  async generate(
    script: VideoScript,
    videoId: string,
    outputDir?: string,
    scenes?: Array<{ voiceText?: string }>,
  ): Promise<{ path: string; durationSecs: number; narration: string }> {
    const rawNarration = this.buildNarration(script, scenes);
    const narration = normalizeHindiNumbersForTTS(rawNarration);
    const outputPath = outputDir
      ? path.join(outputDir, "voiceover.mp3")
      : path.join(PATHS.audio, videoId, "voiceover.mp3");
    const result = await this.provider.synthesize(narration, outputPath);
    return { ...result, narration };
  }
}
