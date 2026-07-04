import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { VoiceProvider } from "./LLMProvider";

/**
 * Microsoft Edge TTS — Azure Neural voices for free, no API key.
 * Uses the `edge-tts` Python CLI (pip3 install edge-tts).
 *
 * Default voice: en-IN-NeerjaNeural (Indian English female, handles Hinglish well)
 * Male alternative: en-IN-PrabhatNeural
 * List all voices: edge-tts --list-voices
 */
export class EdgeTTSProvider implements VoiceProvider {
  name = "edge-tts";

  private voice = process.env.EDGE_TTS_VOICE ?? "en-IN-NeerjaNeural";
  private rate = process.env.EDGE_TTS_RATE ?? "+0%";   // e.g. "+10%" to speed up
  private pitch = process.env.EDGE_TTS_PITCH ?? "+0Hz";

  async synthesize(text: string, outputPath: string): Promise<{ path: string; durationSecs: number }> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Escape single quotes in text
    const escaped = text.replace(/'/g, "'\\''");

    execSync(
      `edge-tts --voice "${this.voice}" --rate "${this.rate}" --pitch "${this.pitch}" --text '${escaped}' --write-media "${outputPath}"`,
      { stdio: "pipe", timeout: 60_000 },
    );

    // Measure actual duration via ffprobe
    let durationSecs = 30;
    try {
      const probe = execSync(
        `ffprobe -v quiet -print_format json -show_streams "${outputPath}"`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      const dur = JSON.parse(probe)?.streams?.[0]?.duration;
      if (dur) durationSecs = parseFloat(dur);
    } catch {}

    return { path: outputPath, durationSecs };
  }
}
