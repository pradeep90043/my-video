#!/usr/bin/env tsx
/**
 * Long-form pipeline — fetch visual assets a project references:
 *   • visual.stickers[].emoji → animated Noto emoji (Lottie) into public/lottie/<codepoint>.json
 *   • visual.broll.query      → stock clip from Pexels (needs PEXELS_API_KEY) into public/content/<slug>/broll/,
 *                               and visual.broll.src is written back to video.json
 * Existing files are never re-downloaded.
 *
 * Usage: npm run longform:assets -- --project <slug>
 */
import * as fs from "fs";
import * as path from "path";
import { loadVideoJson, resolveProject, saveVideoJson } from "./lib";
import { fail, getArg } from "./util";

const NOTO = (code: string) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/lottie.json`;

async function download(url: string, out: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const tmp = `${out}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, out);
}

async function pexelsClip(query: string, vertical: boolean, key: string): Promise<string> {
  const orientation = vertical ? "portrait" : "landscape";
  const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=${orientation}&size=medium`, {
    headers: { Authorization: key },
  });
  if (!res.ok) throw new Error(`Pexels search "${query}" → HTTP ${res.status}`);
  const json: any = await res.json();
  for (const v of json.videos ?? []) {
    const files = (v.video_files ?? []).filter((f: any) => f.file_type === "video/mp4").sort((a: any, b: any) => Math.abs(a.width - 1280) - Math.abs(b.width - 1280));
    if (files[0]) return files[0].link as string;
  }
  throw new Error(`Pexels has no clip for "${query}"`);
}

async function main() {
  const slug = resolveProject(getArg("project"));
  const data: any = loadVideoJson(slug);
  const vertical = data.orientation === "vertical";
  const lottieDir = path.join(process.cwd(), "public", "lottie");
  const brollDir = path.join(process.cwd(), "public", "content", slug, "broll");
  let changed = false;
  let failures = 0;

  const emojis = new Set<string>();
  for (const s of data.scenes) for (const st of s.visual?.stickers ?? []) emojis.add(String(st.emoji).toLowerCase());
  fs.mkdirSync(lottieDir, { recursive: true });
  for (const code of emojis) {
    const out = path.join(lottieDir, `${code}.json`);
    if (fs.existsSync(out)) continue;
    try {
      await download(NOTO(code), out);
      console.log(`  ✓ lottie ${code}`);
    } catch (e: any) {
      failures++;
      console.warn(`  ✗ lottie ${code}: ${e.message}`);
    }
  }

  const key = process.env.PEXELS_API_KEY;
  for (const s of data.scenes) {
    const b = s.visual?.broll;
    if (!b || b.src || !b.query) continue;
    if (!key) {
      console.warn(`  ! scene ${s.id}: broll.query "${b.query}" needs PEXELS_API_KEY (or set broll.src to a local clip) — scene renders without footage`);
      continue;
    }
    try {
      fs.mkdirSync(brollDir, { recursive: true });
      const rel = `content/${slug}/broll/${s.id}.mp4`;
      const out = path.join(process.cwd(), "public", rel);
      if (!fs.existsSync(out)) await download(await pexelsClip(b.query, vertical, key), out);
      b.src = rel;
      changed = true;
      console.log(`  ✓ broll ${s.id}: "${b.query}"`);
    } catch (e: any) {
      failures++;
      console.warn(`  ✗ broll ${s.id}: ${e.message}`);
    }
  }

  if (changed) saveVideoJson(slug, data);
  console.log(`🎞  [${slug}] assets: ${emojis.size} sticker(s)${failures ? `, ${failures} failed` : ", all present"}`);
  if (failures) process.exitCode = 1;
}

main().catch((e) => fail(String(e?.message ?? e)));
