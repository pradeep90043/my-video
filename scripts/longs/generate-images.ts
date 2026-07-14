#!/usr/bin/env tsx
/**
 * Long-form pipeline — step 2b: Generate scene images using Gemini Imagen 3.
 *
 * Reads public/content/<slug>/video.json, processes the image prompts using
 * character and style locks, generates one high-quality image per scene, and
 * saves it to public/content/<slug>/images/scene_<index>.jpg.
 *
 * Usage: tsx scripts/longs/generate-images.ts --project galat-number [--force]
 */

import * as fs from "fs";
import * as path from "path";
import { GeminiImageProvider } from "../shared/providers/GeminiImageProvider";
import { PollinationsImageProvider } from "../shared/providers/PollinationsImageProvider";
import { loadVideoJson, resolveProject } from "./lib";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const force = process.argv.includes("--force");

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug) as any;

  const imagesDir = path.join(process.cwd(), "public", "content", slug, "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  const providerArg = getArg("provider") ?? "gemini";
  let imageProvider;
  if (providerArg === "pollinations") {
    console.log("Using Pollinations provider (free, no key required).");
    imageProvider = new PollinationsImageProvider();
  } else {
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    if (!apiKey) {
      console.log("GEMINI_API_KEY not set — falling back to Pollinations.");
      imageProvider = new PollinationsImageProvider();
    } else {
      console.log("Using Gemini Imagen provider.");
      imageProvider = new GeminiImageProvider(apiKey);
    }
  }
  const lockedProps = data.characterStyleLock || {};

  console.log(`🖼  [${slug}] Starting image generation for ${data.scenes.length} scenes...`);

  for (let i = 0; i < data.scenes.length; i++) {
    const scene = data.scenes[i];
    const imageFilename = scene.id ? `${scene.id}.jpg` : `scene_${i + 1}.jpg`;
    const imagePath = path.join(imagesDir, imageFilename);

    const exists = fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0;
    if (exists && !force) {
      console.log(`  -> Scene ${i + 1}/${data.scenes.length}: ${imageFilename} already exists. Skipping.`);
      continue;
    }

    console.log(`  -> Generating Scene ${i + 1}/${data.scenes.length} image...`);

    // Build the final prompt by expanding references and applying style/location locks
    let scenePrompt = scene.imagePrompt || "";
    
    // Replace placeholders dynamically based on characterStyleLock keys
    Object.keys(lockedProps).forEach((key) => {
      const placeholder = `[${key.toUpperCase()} REF]`;
      // Check case-insensitive placeholders too
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      scenePrompt = scenePrompt.replace(regex, lockedProps[key]);
    });

    // Append style and location parameters
    const style = lockedProps.style || "Photoreal cinematic thriller photography style, 16:9 aspect ratio";
    const locations = lockedProps.locationLock || "";
    
    let technicalDetails = "16:9 landscape aspect ratio, photorealistic, cinematic lighting, 8k resolution, highly detailed, dramatic composition.";
    if (style.toLowerCase().includes("collage") || style.toLowerCase().includes("flat design")) {
      technicalDetails = "16:9 landscape aspect ratio, flat design, 2d vector look, clean edges, solid colors, high resolution.";
    }

    const finalPrompt = `Cinematic still: ${scenePrompt}. 
Style Lock: ${style}. 
Location/Context: ${locations}. 
Technical details: ${technicalDetails}`;

    let success = false;
    let retries = 3;

    while (retries > 0 && !success) {
      try {
        await imageProvider.generate(finalPrompt, imagePath);
        success = true;
        console.log(`     Saved image: ${imageFilename}`);
        // Small delay to prevent rate limits
        await sleep(1500);
      } catch (err: any) {
        retries--;
        console.warn(`     ⚠️ Generation failed: ${err.message || err}. Retries left: ${retries}`);
        if (retries > 0) {
          await sleep(5000);
        }
      }
    }

    if (!success) {
      console.error(`✗ Failed to generate image for Scene ${i + 1}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ [${slug}] All ${data.scenes.length} scene images generated successfully!`);
}

main();
