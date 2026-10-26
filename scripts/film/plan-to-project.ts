#!/usr/bin/env tsx
/**
 * A shorts-automation stickman plan (scenes with `text` and `visual.shot`) -> a renderable my-video project, each beat lasting as
 * long as its narration would (words / 2.4 per second; no voice), with every shot checked by the director and the smoothness
 * checker. For trying director shots without a full pipeline run.
 *
 *   tsx scripts/film/plan-to-project.ts --plan plan.json --slug my-story
 */
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { direct, fitShot, ShotSchema } from "../../src/stickman/film/direct";
import { smoothness } from "../../src/stickman/film/lint";

const args = process.argv.slice(2);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const planPath = opt("plan"), slug = opt("slug");
if (!planPath || !slug) { console.error("usage: --plan plan.json --slug name"); process.exit(1); }
const FPS = 30, WPS = 2.4;
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
let t = 0, shots = 0, warned = 0;
const scenes = plan.scenes.map((sc: any, i: number) => {
  const words = String(sc.text).trim().split(/\s+/).length;
  const d = Math.round(Math.max(1.5, words / WPS + 0.4) * FPS);
  const shot = sc.visual?.shot;
  if (shot) {
    const p = ShotSchema.safeParse(shot);
    if (!p.success) console.warn(`  ✗ beat ${i}: shot does not parse (${p.error.issues[0]?.path.join(".")}: ${p.error.issues[0]?.message}) → normal visual`);
    else {
      shots++;
      const { film, warnings } = direct(fitShot(shot, d / FPS), { fps: FPS });
      const pops = smoothness(film, d);
      for (const w of warnings) console.warn(`  ⚠ beat ${i}: ${w}`);
      for (const pp of pops) console.warn(`  ⚠ beat ${i} frame ${pp.frame}: ${pp.detail}`);
      if (warnings.length || pops.length) warned++;
    }
  }
  const scene = { id: sc.id ?? `s${i}`, text: sc.text, startFrame: t, durationFrames: d, duration: d / FPS, visual: { transition: "cut", ...(sc.visual ?? {}) } };
  t += d;
  return scene;
});
const out = path.join("public/content", slug);
fs.mkdirSync(path.join(out, "audio"), { recursive: true });
fs.writeFileSync(path.join(out, "video.json"), JSON.stringify({ format: "shorts", template: "stickman", theme: "dark", composition: "StickmanVideo", fps: FPS, orientation: "horizontal", language: "hi", title: plan.title ?? slug, description: "", tags: [], scenes, totalFrames: t }, null, 1));
fs.writeFileSync(path.join(out, "audio/voiceover.env.json"), JSON.stringify({ fps: FPS, levels: new Array(t).fill(0) }));
spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", String(t / FPS + 0.5), "-b:a", "64k", path.join(out, "audio/voiceover.mp3")]);
console.log(`✓ ${scenes.length} beats (${shots} director shots, ${warned} with warnings), ${(t / FPS).toFixed(1)} s → ${out}/video.json`);
