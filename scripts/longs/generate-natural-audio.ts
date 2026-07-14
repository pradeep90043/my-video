#!/usr/bin/env tsx
/**
 * Long-form pipeline — natural TTS generation using Puppeteer and openai.fm.
 *
 * Reads public/content/<slug>/video.json, generates one high-quality, expressive
 * OpenAI-based mp3 per scene using headless Puppeteer, measures each with ffprobe,
 * and writes timings back to video.json.
 *
 * Usage: tsx scripts/longs/generate-natural-audio.ts --project galat-number [--force]
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { audioDir, loadVideoJson, resolveProject, saveVideoJson } from "./lib";

puppeteer.use(StealthPlugin());

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const force = process.argv.includes("--force");

function getFfprobePath(): string {
  const localWinPath = path.join(process.cwd(), "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe");
  if (fs.existsSync(localWinPath)) {
    return localWinPath;
  }
  return "ffprobe";
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);

  const outDir = audioDir(slug);
  fs.mkdirSync(outDir, { recursive: true });

  const voice = data.voice || "onyx";
  const fps = data.fps || 30;

  // Determine voice prompt / instructions
  const projectFolder = path.join(process.cwd(), "public", "content", slug);
  const customPromptPath = path.join(projectFolder, "voice-prompt.txt");
  let voicePrompt = "";

  if (fs.existsSync(customPromptPath)) {
    voicePrompt = fs.readFileSync(customPromptPath, "utf8").trim();
    console.log(`🎙  Using voice prompt from: ${customPromptPath}`);
  } else {
    // Default to general/suspense prompt based on content
    const fullText = data.scenes.map((s) => s.text).join(" ").toLowerCase();
    const horrorKeywords = ['aaina', 'dar', 'darr', 'bhoot', 'chudail', 'horror', 'suspense', 'khamoshi', 'khoon', 'murder', 'killer', 'accident', 'dead'];
    const isHorror = horrorKeywords.some((keyword) => fullText.includes(keyword));

    if (isHorror) {
      voicePrompt = `Voice Affect: Low, hushed, and suspenseful; convey tension and intrigue.
Tone: Deeply serious and mysterious, maintaining an undercurrent of unease.
Pacing: Slow, deliberate, pausing slightly after key moments.
Emotion: Restrained yet intense.`;
      console.log("🎙  Auto-detected suspense/horror theme for fallback voice prompt.");
    } else {
      voicePrompt = `Tone: Warm, engaging, and expressive storytelling tone.
Pacing: Natural storytelling pacing.
Emotion: Expressive and emotionally resonant.`;
      console.log("🎙  Using default storytelling fallback voice prompt.");
    }
  }

  console.log(`🎙  [${slug}] Generating natural audio — voice: ${voice}`);

  // Launch Puppeteer browser
  const browser = await puppeteer.launch({ headless: true });

  try {
    const page = await browser.newPage();
    console.log("  -> Navigating to site to clear Vercel Security Checkpoint...");
    await page.goto("https://www.openai.fm/", { waitUntil: "networkidle2" });
    
    // Wait for Vercel challenge to complete
    await new Promise((resolve) => setTimeout(resolve, 4000));

    let currentStartFrame = 0;
    let totalDurationSec = 0;

    for (let i = 0; i < data.scenes.length; i++) {
      const scene = data.scenes[i];
      const segmentName = `segment_${i}_${scene.id}.mp3`;
      const segmentPath = path.join(outDir, segmentName);

      const exists = fs.existsSync(segmentPath) && fs.statSync(segmentPath).size > 0;

      if (exists && !force) {
        console.log(`  -> Scene ${i + 1}/${data.scenes.length}: ${scene.id} already exists. Skipping API generation.`);
      } else {
        console.log(`  -> Generating Scene ${i + 1}/${data.scenes.length}: ${scene.id} ("${scene.text.substring(0, 30)}...")`);
        
        let success = false;
        let retries = 4;
        let lastError: any = null;

        while (retries > 0 && !success) {
          try {
            // Long delay to prevent rate limits: 15 seconds between requests
            await sleep(15000);

            // Call API inside Puppeteer context
            const base64Audio = await page.evaluate(async (selectedVoice, inputText, selectedPrompt) => {
              const formData = new FormData();
              formData.append("input", inputText);
              formData.append("prompt", selectedPrompt);
              formData.append("voice", selectedVoice);
              formData.append("vibe", "");

              const response = await fetch("https://www.openai.fm/api/generate", {
                method: "POST",
                body: formData,
              });

              if (response.status === 429) {
                throw new Error("HTTP error 429 (Rate Limited)");
              }

              if (!response.ok) {
                throw new Error("HTTP error " + response.status);
              }

              const blob = await response.blob();

              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }, voice, scene.text, voicePrompt);

            const base64Data = base64Audio.split(",")[1];
            const buffer = Buffer.from(base64Data, "base64");
            fs.writeFileSync(segmentPath, buffer);
            success = true;
          } catch (error: any) {
            lastError = error;
            retries--;
            if (retries > 0) {
              const waitTime = (5 - retries) * 30000; // progressive wait: 30s, 60s, 90s
              console.warn(`     ⚠️ API call failed: ${error.message || error}. Waiting ${waitTime / 1000}s to cool down before retry... (Retries left: ${retries})`);
              await sleep(waitTime);
            }
          }
        }

        if (!success) {
          throw lastError || new Error("Failed to generate voice after retries.");
        }
      }

      // Measure duration with ffprobe
      const ffprobePath = getFfprobePath();
      const probe = execSync(
        `"${ffprobePath}" -v quiet -show_entries format=duration -of csv=p=0 "${segmentPath}"`,
        { encoding: "utf-8" },
      ).trim();

      const actualDurationSec = parseFloat(probe);
      const durationFrames = Math.ceil(actualDurationSec * fps);

      scene.duration = actualDurationSec;
      scene.startFrame = currentStartFrame;
      scene.durationFrames = durationFrames;
      scene.audioFile = segmentName;

      currentStartFrame += durationFrames;
      totalDurationSec += actualDurationSec;

      console.log(`     Saved segment: ${segmentName} | ${actualDurationSec.toFixed(2)}s (${durationFrames} frames)`);
    }

    data.totalDuration = totalDurationSec;
    data.totalFrames = currentStartFrame;
    saveVideoJson(slug, data);

    console.log(
      `\n✅ [${slug}] ${data.scenes.length} natural segments generated successfully.`,
    );
    console.log(`   Total Duration: ${totalDurationSec.toFixed(1)}s (${currentStartFrame} frames)`);
  } catch (error) {
    console.error("✗ Natural voice generation failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
