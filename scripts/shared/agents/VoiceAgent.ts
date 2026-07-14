import * as path from "path";
import { VoiceProvider } from "../providers/LLMProvider";
import { VideoScript } from "../types";
import { PATHS } from "../config";

export class VoiceAgent {
  constructor(private provider: VoiceProvider) {}

  private buildNarration(script: VideoScript): string {
    return [script.hook, script.body, script.cta]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async generate(
    script: VideoScript,
    videoId: string,
    outputDir?: string,
  ): Promise<{ path: string; durationSecs: number; narration: string }> {
    const narration = this.buildNarration(script);
    const outputPath = outputDir
      ? path.join(outputDir, "voiceover.mp3")
      : path.join(PATHS.audio, videoId, "voiceover.mp3");
    const result = await this.provider.synthesize(narration, outputPath);
    return { ...result, narration };
  }
}
