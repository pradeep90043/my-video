#!/usr/bin/env tsx
/**
 * Turns a list of director shots (words, no coordinates — see src/stickman/film/direct.ts) into a renderable project:
 * public/content/<slug>/video.json plus a silent voiceover track. Every shot is compiled once here so mistakes show up
 * before the render: unknown ids, nothing to sit on, a camera pointed at nobody.
 *
 *   tsx scripts/film/build-film.ts --shots shots.json --slug my-film [--title "..."]
 *
 * shots.json: [{ "secs": 4, "place": "study", "cast": [...], "actions": [...], "camera": {...} }, ...]
 */
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { ShotSchema, direct } from "../../src/stickman/film/direct";

const args = process.argv.slice(2);
const opt = (n: string, d?: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const shotsPath = opt("shots"), slug = opt("slug");
if (!shotsPath || !slug) { console.error("usage: --shots shots.json --slug name [--title ...]"); process.exit(1); }
const FPS = 30;

const raw = JSON.parse(fs.readFileSync(shotsPath, "utf8"));
const list: unknown[] = Array.isArray(raw) ? raw : raw.shots;
let t = 0, bad = 0;
const scenes = list.map((s, i) => {
  const parsed = ShotSchema.safeParse(s);
  if (!parsed.success) { bad++; console.error(`✗ shot ${i}: ${parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`); return undefined; }
  const { warnings } = direct(parsed.data, { fps: FPS });
  for (const w of warnings) console.warn(`  ⚠ shot ${i}: ${w}`);
  const d = Math.round(parsed.data.secs * FPS);
  const scene = { id: `s${String(i).padStart(2, "0")}`, text: "", startFrame: t, durationFrames: d, duration: d / FPS, visual: { transition: "cut", shot: s } };
  t += d;
  return scene;
}).filter(Boolean);
if (bad) process.exit(1);

const out = path.join("public/content", slug);
fs.mkdirSync(path.join(out, "audio"), { recursive: true });
const data = {
  format: "shorts", template: "stickman", theme: "dark", composition: "StickmanVideo", fps: FPS, orientation: "horizontal", language: "en",
  title: opt("title", slug), description: "", tags: [], scenes, totalFrames: t,
};
fs.writeFileSync(path.join(out, "video.json"), JSON.stringify(data, null, 1));
fs.writeFileSync(path.join(out, "audio/voiceover.env.json"), JSON.stringify({ fps: FPS, levels: new Array(t).fill(0) }));
const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", String(t / FPS + 0.5), "-b:a", "64k", path.join(out, "audio/voiceover.mp3")]);
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
console.log(`✓ ${scenes.length} shots, ${t} frames (${(t / FPS).toFixed(1)}s) → ${out}/video.json`);
