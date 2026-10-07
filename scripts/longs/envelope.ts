#!/usr/bin/env tsx
/**
 * Long-form pipeline — (re)build the lip-sync envelope for a project's voiceover.
 * Normally written automatically by `longform:merge`; run this for projects whose
 * voiceover already exists.
 *
 * Usage: npm run longform:envelope -- --project AivsSWE
 */

import * as path from "path";
import { audioDir, loadVideoJson, resolveProject } from "./lib";
import { fail, getArg } from "./util";
import { writeMouthEnvelope } from "./mouth-envelope";

function main() {
  const slug = resolveProject(getArg("project"));
  const data = loadVideoJson(slug);
  const dir = audioDir(slug);
  try {
    const n = writeMouthEnvelope(path.join(dir, "voiceover.mp3"), path.join(dir, "voiceover.env.json"), data.fps);
    console.log(`✅ [${slug}] Lip-sync envelope → public/content/${slug}/audio/voiceover.env.json (${n} frames)`);
  } catch (e: any) {
    fail(e.message);
  }
}

main();
