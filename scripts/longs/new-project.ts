#!/usr/bin/env tsx
/**
 * Long-form pipeline — scaffold a new YouTube video project.
 *
 * Creates public/content/<slug>/video.json with the CodeOrCap long-form
 * scene structure (hook → claim → rules → evidence → headToHead → reality →
 * verdict → cta) ready for script writing.
 *
 * Usage: npm run longform:new -- --project MyNewVideo [--template stickman] [--theme light|dark]
 */

import * as fs from "fs";
import * as path from "path";
import { projectDir, videoJsonPath, type LongformVideoJSON } from "./lib";

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const slug = getArg("project");
if (!slug || !/^[A-Za-z0-9-]+$/.test(slug)) {
  console.error("Usage: npm run longform:new -- --project <slug>   (letters/digits/dashes)");
  process.exit(1);
}

if (fs.existsSync(videoJsonPath(slug))) {
  console.error(`✗ Project already exists: public/content/${slug}/video.json`);
  process.exit(1);
}

const SCENE_IDS = [
  "hook", "claim", "rules", "evidence1", "evidence2",
  "headToHead", "reality", "verdict", "cta",
];

const useStickman = getArg("template") === "stickman";
if (getArg("template") && !useStickman) {
  console.error('✗ Unknown --template. Available: stickman');
  process.exit(1);
}
const theme = getArg("theme") ?? "light";
if (theme !== "light" && theme !== "dark") {
  console.error('✗ --theme must be "light" or "dark"');
  process.exit(1);
}

// Starter beats for the stickman template — edit the text, poses and props freely.
// Keep each scene's narration short (≈ 2 sentences, ≤ 6 s) so the visuals keep changing.
const STICKMAN_SCENES = [
  { id: "hook", text: "", visual: { pose: "shocked", mood: "shocked", accent: "red", title: "Your Title", transition: "wipe", camera: "push", props: [{ type: "robot", x: 0.72, delay: 14 }] } },
  { id: "claim", text: "", visual: { pose: "worried", mood: "worried", accent: "red", callouts: ["The claim"], props: [{ type: "warning", x: 0.72, y: 0.55, delay: 10 }] } },
  { id: "point1", text: "", visual: { pose: "point", mood: "happy", accent: "blue", figureX: 0.28, transition: "wipe", props: [{ type: "laptop", x: 0.7, delay: 6 }] } },
  { id: "point2", text: "", visual: { pose: "think", mood: "neutral", accent: "gold", title: "Key idea", props: [{ type: "bulb", x: 0.72, y: 0.5, delay: 8 }] } },
  { id: "verdict", text: "", visual: { pose: "celebrate", mood: "happy", accent: "green", transition: "wipe", title: "Verdict", props: [{ type: "check", x: 0.72, y: 0.55, delay: 12 }] } },
  { id: "cta", text: "", visual: { pose: "walk", mood: "happy", accent: "gold", title: "Subscribe", props: [{ type: "rocket", x: 0.72, delay: 10 }] } },
];

const template: LongformVideoJSON = {
  format: "longform",
  ...(useStickman ? { template: "stickman", theme } : {}),
  composition: useStickman ? "StickmanVideo" : slug,
  fps: 30,
  voice: "hi-IN-MadhurNeural",
  rate: "+5%",
  pitch: "+0Hz",
  language: "hi",
  title: `${slug} - AI Video`,
  description: "A professional video about " + slug,
  tags: [slug, "codeorcap", "tech"],
  logoBottom: 113,
  logoRight: 80,
  logoScale: 1.1,
  logoImageScale: 1.0,
  logoOpacity: 0.75,
  blurAmount: 3,
  scenes: useStickman ? STICKMAN_SCENES : SCENE_IDS.map((id) => ({ id, text: "" })),
};

fs.mkdirSync(path.join(projectDir(slug), "audio"), { recursive: true });
fs.mkdirSync(path.join(projectDir(slug), "video"), { recursive: true });
fs.writeFileSync(videoJsonPath(slug), JSON.stringify(template, null, 2));

if (useStickman) {
  console.log(`✅ Created public/content/${slug}/video.json (stickman template, ${theme} theme)

Next steps:
  1. Write each scene's "text" (narration) and tune its "visual" block
     (pose, mood, props, title, callouts, camera) — see src/stickman/schema.ts.
  2. Run the pipeline:  npm run longform -- --project ${slug}
     (no scene code or Root.tsx edits needed — StickmanVideo renders it.)
  3. Preview in Studio:  npm run dev  → StickmanVideo → set props {"project":"${slug}"}
`);
} else {
console.log(`✅ Created public/content/${slug}/video.json

Next steps:
  1. Write the Hinglish script into each scene's "text" field
     (delete/add scenes freely — ids are yours to choose).
  2. Build the scene components, e.g. src/codeorcap/shorts/scenes/ has the
     AIvsSWE references (HookScene, ClaimScene, …).
  3. Register a 1920×1080 composition with id "${slug}" in src/Root.tsx
     (copy the AIvsSWE composition block and point it at your video.json).
  4. Run the pipeline:  npm run longform -- --project ${slug}
`);
}
