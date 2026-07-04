import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { VoiceProvider } from "./LLMProvider";
import { GOOGLE_TTS } from "../config";

export class GoogleTTSProvider implements VoiceProvider {
  name = "google-tts";

  constructor(private apiKey: string = GOOGLE_TTS.key) {
    if (!this.apiKey) throw new Error("GOOGLE_TTS_KEY not set");
  }

  async synthesize(text: string, outputPath: string): Promise<{ path: string; durationSecs: number }> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;
    const body = {
      input: { text },
      voice: {
        languageCode: GOOGLE_TTS.language,
        name: GOOGLE_TTS.voice,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: GOOGLE_TTS.speakingRate,
        pitch: GOOGLE_TTS.pitch,
        effectsProfileId: ["headphone-class-device"],
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google TTS error: ${res.status} ${err}`);
    }

    const data = (await res.json()) as { audioContent: string };
    const audioBytes = Buffer.from(data.audioContent, "base64");
    fs.writeFileSync(outputPath, audioBytes);

    // Measure actual duration via ffprobe
    let durationSecs = (audioBytes.length * 8) / (128 * 1000); // fallback estimate
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
