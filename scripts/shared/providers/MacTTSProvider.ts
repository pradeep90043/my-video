import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { VoiceProvider } from "./LLMProvider";

/**
 * macOS built-in TTS via the `say` command — completely free, no API key.
 * Converts AIFF → MP3 via ffmpeg.
 *
 * Override voice with MACOS_TTS_VOICE env var.
 * List available voices: say -v ?
 */
export class MacTTSProvider implements VoiceProvider {
  name = "mac-tts";

  private voice = process.env.MACOS_TTS_VOICE ?? "Alex";
  private rate = process.env.MACOS_TTS_RATE ?? "155"; // words per minute — Alex at 155 WPM sounds natural

  async synthesize(text: string, outputPath: string): Promise<{ path: string; durationSecs: number }> {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const tmpAiff = path.join(os.tmpdir(), `codeorcap-tts-${Date.now()}.aiff`);

    try {
      // 1. Generate AIFF via say (AIFF is the default output format)
      const escaped = text.replace(/'/g, "'\\''");
      execSync(
        `say -v ${this.voice} -r ${this.rate} -o "${tmpAiff}" '${escaped}'`,
        { stdio: "pipe" },
      );

      // 2. Convert to MP3 via ffmpeg
      execSync(
        `ffmpeg -y -i "${tmpAiff}" -codec:a libmp3lame -qscale:a 2 -ar 44100 "${outputPath}"`,
        { stdio: "pipe" },
      );

      // 3. Measure actual duration
      let durationSecs = 30;
      try {
        const probe = execSync(
          `ffprobe -v quiet -print_format json -show_streams "${outputPath}"`,
          { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        );
        const info = JSON.parse(probe);
        const dur = info.streams?.[0]?.duration;
        if (dur) durationSecs = parseFloat(dur);
      } catch {}

      return { path: outputPath, durationSecs };
    } finally {
      try { fs.unlinkSync(tmpAiff); } catch {}
    }
  }
}
