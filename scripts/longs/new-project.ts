#!/usr/bin/env tsx
/**
 * Long-form pipeline — scaffold a new YouTube video project.
 *
 * Creates public/content/<slug>/video.json with the CodeOrCap long-form
 * scene structure (hook → claim → rules → evidence → headToHead → reality →
 * verdict → cta) ready for script writing.
 *
 * Usage: npm run longform:new -- --project MyNewVideo
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

const template: LongformVideoJSON = {
  format: "longform",
  composition: slug,
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
  scenes: SCENE_IDS.map((id) => ({ id, text: "" })),
};

fs.mkdirSync(path.join(projectDir(slug), "audio"), { recursive: true });
fs.mkdirSync(path.join(projectDir(slug), "video"), { recursive: true });
fs.writeFileSync(videoJsonPath(slug), JSON.stringify(template, null, 2));

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
