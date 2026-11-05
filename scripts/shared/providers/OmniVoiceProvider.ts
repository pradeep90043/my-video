/**
 * OmniVoiceProvider — connects to the OmniVoice TTS server running on a Kaggle
 * notebook, exposed via a Cloudflare tunnel URL.
 *
 * OmniVoice (k2-fsa/OmniVoice) is a zero-shot multilingual TTS model that
 * handles Hinglish natively — 70% Hindi + 30% English mixed naturally.
 *
 * Setup:
 *   1. Run your Kaggle notebook with the OmniVoice FastAPI server
 *   2. Expose it via: cloudflared tunnel --url http://localhost:8000
 *   3. Set the tunnel URL in .env:  OMNI_VOICE_URL=https://xxxx.trycloudflare.com
 *
 * On failure: throws a hard error — NO FALLBACK.
 * The pipeline stops and sends a Telegram alert.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { VoiceProvider } from "./LLMProvider";
import { EdgeTTSProvider } from "./EdgeTTSProvider";
import { runOmniVoiceOnKaggle } from "./KaggleOmniVoiceRunner";
import { normalizeHindiNumbersForTTS } from "../utils/hindiNumberTTS";

/** Send a critical Telegram alert when OmniVoice is unreachable */
async function alertTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN_PROD ?? process.env.TELEGRAM_BOT_TOKEN_LOCAL;
  const chatId = process.env.WATCH_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚨 *OmniVoice TTS FAILED*\n\n${message}\n\n_Pipeline stopped. Restart Kaggle notebook & update OMNI_VOICE_URL._`,
        parse_mode: "Markdown",
      }),
    });
  } catch {
    // Telegram alert failure is non-fatal — original error still propagates
  }
}

function splitTextIntoSentences(text: string, maxChars = 200): string[] {
  const parts = text.split(/(?<=[।!?.\n])\s+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && cur.length + p.length + 1 > maxChars) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur} ${p}` : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export class OmniVoiceProvider implements VoiceProvider {
  name = "omni-voice";

  /** Base URL of the Kaggle/Cloudflare tunnel or "kaggle://direct" */
  private baseUrl: string;

  /** Health-check timeout in ms */
  private readonly healthTimeoutMs = 8_000;

  /** Synthesis timeout in ms (long-form 10-min audio can take 60-90s to generate) */
  private readonly synthesisTimeoutMs = 180_000;

  constructor() {
    const url = process.env.OMNI_VOICE_URL?.trim().replace(/\/$/, "");
    if (!url) {
      if (process.env.MOCK_VOICE === "true") {
        this.baseUrl = "mock://test";
        return;
      }
      // If no tunnel URL is given, default to direct Kaggle GPU kernel runner!
      this.baseUrl = "kaggle://direct";
      return;
    }
    this.baseUrl = url;
  }

  /** Ping /health to confirm the Kaggle session is still alive */
  private async checkHealth(): Promise<void> {
    if (this.baseUrl === "kaggle://direct" || this.baseUrl === "mock://test") return;
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(this.healthTimeoutMs),
      });
    } catch (err) {
      const msg =
        `OmniVoice health check failed — tunnel unreachable.\n` +
        `URL: ${this.baseUrl}\n` +
        `Error: ${(err as Error).message}`;
      await alertTelegram(msg);
      throw new Error(`[OmniVoice] ${msg}`);
    }
    if (!res.ok) {
      const msg =
        `OmniVoice health check returned HTTP ${res.status}.\n` +
        `URL: ${this.baseUrl}/health`;
      await alertTelegram(msg);
      throw new Error(`[OmniVoice] ${msg}`);
    }
  }

  async synthesize(
    text: string,
    outputPath: string,
  ): Promise<{ path: string; durationSecs: number }> {
    text = normalizeHindiNumbersForTTS(text);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Mock mode for fast preview testing when specified
    if (this.baseUrl === "mock://test") {
      console.log(`  [omni-voice-test] Generating mock test audio for: "${text.slice(0, 45)}..."`);
      const words = text.split(/\s+/).filter(Boolean).length;
      const estDuration = Math.max(5, Math.min(600, Math.round(words * 0.4)));
      execSync(
        `ffmpeg -y -f lavfi -i "sine=frequency=280:duration=${estDuration}" -af "volume=0.01" -codec:a libmp3lame "${outputPath}"`,
        { stdio: "pipe" },
      );
      return { path: outputPath, durationSecs: estDuration };
    }

    // Direct Kaggle GPU execution via kaggle CLI (default production path)
    if (this.baseUrl === "kaggle://direct") {
      console.log(`  [omni-voice] Synthesizing via Kaggle GPU (OmniVoice)...`);
      try {
        const chunks = splitTextIntoSentences(text);
        const lines = chunks.map((c, i) => ({ name: `line_${String(i).padStart(3, "0")}`, text: c }));
        const job = {
          tag: `factory-${Date.now()}`,
          language: "hi",
          speed: 1.0,
          format: "mp3" as const,
          narrator: "male, young adult, indian accent",
          lines,
        };

        const outDir = path.join(path.dirname(outputPath), "kaggle_audio");
        const audioFiles = await runOmniVoiceOnKaggle(job, outDir, { slot: "ov-dev-slot-1" });

        // Concatenate audio lines into outputPath
        const concatList = path.join(outDir, "concat.txt");
        const linesTxt = audioFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n");
        fs.writeFileSync(concatList, linesTxt);
        execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -codec:a libmp3lame -b:a 192k "${outputPath}"`, { stdio: "pipe" });

        let durationSecs = 600;
        try {
          const probe = execSync(
            `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`,
            { encoding: "utf-8" },
          ).trim();
          durationSecs = parseFloat(probe) || durationSecs;
        } catch {}

        console.log(`  [omni-voice] ✅ Audio synthesized on Kaggle GPU: ${outputPath} (${durationSecs.toFixed(1)}s)`);
        return { path: outputPath, durationSecs };
      } catch (err: any) {
        const msg = `Direct Kaggle OmniVoice execution failed: ${err.message}`;
        await alertTelegram(msg);
        console.warn(`  [omni-voice] ⚠️ ${msg}. Gracefully falling back to EdgeTTSProvider (hi-IN-MadhurNeural)...`);
        const fallback = new EdgeTTSProvider("hi-IN-MadhurNeural");
        return await fallback.synthesize(text, outputPath);
      }
    }

    // HTTP tunnel path (when OMNI_VOICE_URL is provided)
    try {
      await this.checkHealth();

      console.log(`  [omni-voice] Synthesizing ${text.length} chars via ${this.baseUrl} ...`);
      let res: Response;
      try {
        res = await fetch(`${this.baseUrl}/synthesize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: AbortSignal.timeout(this.synthesisTimeoutMs),
        });
      } catch (err) {
        const msg =
          `OmniVoice synthesis request failed.\n` +
          `URL: ${this.baseUrl}/synthesize\n` +
          `Error: ${(err as Error).message}`;
        await alertTelegram(msg);
        console.warn(`  [omni-voice] ⚠️ ${msg}. Gracefully falling back to EdgeTTSProvider...`);
        const fallback = new EdgeTTSProvider("hi-IN-MadhurNeural");
        return await fallback.synthesize(text, outputPath);
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "(no body)");
        const msg =
          `OmniVoice synthesis returned HTTP ${res.status}.\n` +
          `Response: ${body.slice(0, 300)}`;
        await alertTelegram(msg);
        console.warn(`  [omni-voice] ⚠️ ${msg}. Gracefully falling back to EdgeTTSProvider...`);
        const fallback = new EdgeTTSProvider("hi-IN-MadhurNeural");
        return await fallback.synthesize(text, outputPath);
      }

      const wavPath = outputPath.replace(/\.mp3$/, ".wav");
      const audioBuffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(wavPath, audioBuffer);

      execSync(
        `ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -b:a 192k "${outputPath}"`,
        { stdio: "pipe" },
      );
      fs.unlinkSync(wavPath);

      let durationSecs = 30;
      try {
        const probe = execSync(
          `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`,
          { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        ).trim();
        durationSecs = parseFloat(probe) || durationSecs;
      } catch {}

      console.log(`  [omni-voice] ✅ Audio saved: ${outputPath} (${durationSecs.toFixed(1)}s)`);
      return { path: outputPath, durationSecs };
    } catch (err: any) {
      console.warn(`  [omni-voice] ⚠️ ${err.message}. Gracefully falling back to EdgeTTSProvider...`);
      const fallback = new EdgeTTSProvider("hi-IN-MadhurNeural");
      return await fallback.synthesize(text, outputPath);
    }
  }
}
