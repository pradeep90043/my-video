import * as fs from "fs";
import * as path from "path";
import * as puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { VoiceProvider } from "./LLMProvider";

(puppeteer as any).default.use(StealthPlugin());

const VOICE_PROMPT = `Tone: Warm, engaging, conversational tech narration.
Pacing: Natural, confident delivery with slight emphasis on key points.
Emotion: Energetic and expressive — like a knowledgeable friend explaining something cool.`;

export class OpenAIFMProvider implements VoiceProvider {
  name = "openai-fm";
  private voice = process.env.OPENAI_FM_VOICE ?? "onyx";
  private prompt = process.env.OPENAI_FM_PROMPT ?? VOICE_PROMPT;

  async synthesize(text: string, outputPath: string): Promise<{ path: string; durationSecs: number }> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const browser = await (puppeteer as any).default.launch({ headless: true });
    try {
      const page = await browser.newPage();
      console.log("  [openai-fm] Clearing Vercel checkpoint...");
      await page.goto("https://www.openai.fm/", { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 4000));

      console.log(`  [openai-fm] Generating audio (voice: ${this.voice})...`);
      const base64Audio: string = await page.evaluate(
        async (voice: string, input: string, prompt: string) => {
          const fd = new FormData();
          fd.append("input", input);
          fd.append("prompt", prompt);
          fd.append("voice", voice);
          fd.append("vibe", "");

          const res = await fetch("https://www.openai.fm/api/generate", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error("HTTP " + res.status);

          const blob = await res.blob();
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        },
        this.voice,
        text,
        this.prompt,
      );

      const buf = Buffer.from(base64Audio.split(",")[1], "base64");
      fs.writeFileSync(outputPath, buf);
    } finally {
      await browser.close();
    }

    // Measure duration via ffprobe (prefer bundled Remotion binary on Windows)
    let durationSecs = 30;
    try {
      const { execSync } = await import("child_process");
      const localWin = path.join(process.cwd(), "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe");
      const ffprobeBin = fs.existsSync(localWin) ? localWin : "ffprobe";
      const probe = execSync(
        `"${ffprobeBin}" -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      ).trim();
      durationSecs = parseFloat(probe) || durationSecs;
    } catch {}

    return { path: outputPath, durationSecs };
  }
}
