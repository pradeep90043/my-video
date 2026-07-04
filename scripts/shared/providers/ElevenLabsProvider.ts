import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import * as fs from "fs";
import * as path from "path";
import { VoiceProvider } from "./LLMProvider";
import { MODELS } from "../config";

export class ElevenLabsProvider implements VoiceProvider {
  name = "elevenlabs";
  private client: ElevenLabsClient;

  constructor(apiKey: string = process.env.ELEVENLABS_API_KEY ?? "") {
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");
    this.client = new ElevenLabsClient({ apiKey });
  }

  async synthesize(text: string, outputPath: string): Promise<{ path: string; durationSecs: number }> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const audioStream = await this.client.textToSpeech.convert(MODELS.voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(outputPath, buf);

    // estimate duration from file size (~128kbps mp3)
    const durationSecs = (buf.length * 8) / (128 * 1000);
    return { path: outputPath, durationSecs };
  }
}
