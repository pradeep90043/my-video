#!/usr/bin/env tsx
/**
 * Generate voiceover for the "Can AI Replace Frontend Developers?" video
 * Uses macOS built-in `say` command → AIFF → ffmpeg → MP3
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const VOICE = process.env.MACOS_TTS_VOICE ?? "Alex";
const RATE = process.env.MACOS_TTS_RATE ?? "155";

const SCRIPT = `Everyone says AI will replace frontend developers. But is that actually true?

The claim is everywhere. GitHub Copilot writes 46 percent of code. GPT-4 generates full React apps. Vercel's v0 builds UI from text prompts. Some say developers are done.

But here's the reality check. AI excels at generating snippets, but it still struggles with architecture. Debugging. Accessibility. UX decisions. Performance optimization. Security. And understanding business requirements.

Here's an example. AI can write a React component in seconds. But a human developer reviews it, fixes bugs, adds accessibility, integrates it with CI CD, and ensures security. The result? Collaboration equals faster, not replacement.

AI will augment frontend developers, handling repetitive code and boilerplate. But human creativity, strategy, and nuanced UX remain irreplaceable. The rating? 7 out of 10 for the replacement claim.

Developers who learn to work with AI will become more valuable, not obsolete. Master the tools. Stay indispensable. Follow for more insights.`;

const outDir = path.join(process.cwd(), "public", "content", "ai-replace-frontend", "audio");
fs.mkdirSync(outDir, { recursive: true });

const outputPath = path.join(outDir, "voiceover.mp3");
const tmpAiff = path.join(os.tmpdir(), `ai-voiceover-${Date.now()}.aiff`);

try {
  console.log(`🎙  Generating voiceover with macOS "${VOICE}" voice at ${RATE} WPM...`);

  // 1. Generate AIFF
  const escaped = SCRIPT.replace(/'/g, "'\\''");
  execSync(`say -v ${VOICE} -r ${RATE} -o "${tmpAiff}" '${escaped}'`, { stdio: "pipe" });

  // 2. Convert to MP3
  execSync(`ffmpeg -y -i "${tmpAiff}" -codec:a libmp3lame -qscale:a 2 -ar 44100 "${outputPath}"`, { stdio: "pipe" });

  // 3. Measure duration
  const probe = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
  const durationSecs = parseFloat(probe);

  console.log(`✅ Voiceover saved: ${outputPath}`);
  console.log(`   Duration: ${durationSecs.toFixed(1)}s`);

  // 4. Merge with video
  const videoPath = path.join(process.cwd(), "out", "ai-replace-frontend.mp4");
  const finalPath = path.join(process.cwd(), "out", "ai-replace-frontend-final.mp4");

  if (fs.existsSync(videoPath)) {
    console.log(`\n🎬 Merging voiceover with video...`);
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${outputPath}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${finalPath}"`,
      { stdio: "pipe" }
    );

    const stat = fs.statSync(finalPath);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);
    console.log(`\n✅ Final video ready!`);
    console.log(`   ${finalPath}  (${sizeMb} MB)`);
    console.log(`\nUpload to: Instagram Reels  •  YouTube Shorts  •  Facebook Reels`);
  } else {
    console.log(`\n⚠  Video not found at ${videoPath} — voiceover saved, merge manually.`);
  }
} finally {
  try { fs.unlinkSync(tmpAiff); } catch {}
}
