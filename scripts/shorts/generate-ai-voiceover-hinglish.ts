#!/usr/bin/env tsx
/**
 * Generate Hinglish voiceover for "Can AI Replace Frontend Developers?"
 * Uses Microsoft Edge TTS (free, no API key) with hi-IN-MadhurNeural
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const VOICE = "hi-IN-MadhurNeural";   // Hindi male — handles Hinglish naturally
const RATE = "+5%";                    // slightly faster for reel pacing

// ── Hinglish narration script ─────────────────────────────────────────────────
const SCRIPT = `Sab keh rahe hain ki AI frontend developers ko replace kar dega. Lekin kya yeh sachchi mein possible hai?

Dekho, claim toh bohot viral hai. GitHub Copilot 46 percent code khud likh deta hai. GPT-4 poori React app generate kar deta hai. Vercel ka v0 sirf text se UI bana deta hai. Toh kya developers ki zaroorat khatam ho gayi?

Lekin yaar, reality check toh karo. AI snippets generate karne mein expert hai, agreed. Par architecture design? Debugging? Accessibility? UX decisions? Performance optimization? Security? Business logic samajhna? In sab mein AI abhi bhi struggle karta hai.

Ek example dekho. AI ek React component seconds mein likh deta hai. Lekin ek human developer usse review karta hai, bugs fix karta hai, accessibility add karta hai, CI CD mein integrate karta hai, aur security ensure karta hai. Result? Collaboration se speed badhti hai, replacement nahi hota.

Verdict yeh hai — AI frontend developers ko augment karega, replace nahi. Repetitive code aur boilerplate AI handle karega. Lekin human creativity, strategy, aur nuanced UX decisions — yeh irreplaceable hain. Rating? 7 out of 10 replacement claim ke liye.

Jo developers AI ke saath kaam karna seekh lenge, woh aur valuable ban jayenge — obsolete nahi. Tools master karo. Indispensable bano. Follow karo aur insights ke liye!`;

const outDir = path.join(process.cwd(), "public", "content", "ai-replace-frontend", "audio");
fs.mkdirSync(outDir, { recursive: true });

const outputPath = path.join(outDir, "voiceover-hinglish.mp3");

try {
  console.log(`🎙  Generating Hinglish voiceover with "${VOICE}" (rate: ${RATE})...`);

  // Escape single quotes
  const escaped = SCRIPT.replace(/'/g, "'\\''");

  // Generate with edge-tts
  execSync(
    `edge-tts --voice "${VOICE}" --rate "${RATE}" --pitch "+0Hz" --text '${escaped}' --write-media "${outputPath}"`,
    { stdio: "pipe", timeout: 120_000 },
  );

  // Measure duration
  const probe = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
  const durationSecs = parseFloat(probe);

  console.log(`✅ Voiceover saved: ${outputPath}`);
  console.log(`   Duration: ${durationSecs.toFixed(1)}s`);
  console.log(`   Voice: ${VOICE} (Hinglish)`);

  // Merge with video
  const videoPath = path.join(process.cwd(), "out", "ai-replace-frontend.mp4");
  const finalPath = path.join(process.cwd(), "out", "ai-replace-frontend-hinglish.mp4");

  if (fs.existsSync(videoPath)) {
    console.log(`\n🎬 Merging voiceover with video...`);
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${outputPath}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${finalPath}"`,
      { stdio: "pipe" },
    );

    const stat = fs.statSync(finalPath);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);
    console.log(`\n✅ Final Hinglish video ready!`);
    console.log(`   ${finalPath}  (${sizeMb} MB)`);
    console.log(`\nUpload to: Instagram Reels  •  YouTube Shorts  •  Facebook Reels`);
  } else {
    console.log(`\n⚠  Video not found at ${videoPath} — voiceover saved, merge manually.`);
  }
} catch (err: any) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
